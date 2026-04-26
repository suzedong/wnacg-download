// 爬虫模块

use crate::error::AppError;
use crate::events::{self, SearchProgressEvent};
use crate::types::comic::Comic;
use crate::types::search::{SearchOptions, SearchResult};
use chrono::Local;
use reqwest::Client;
use reqwest_cookie_store::{CookieStoreMutex, CookieStore};
use scraper::{Html, Selector};
use std::fs;
use std::sync::Arc;
use std::time::Duration;

/// 判断分类是否为汉化内容
#[allow(dead_code)]
fn is_chinese_category(category: &str) -> bool {
    // 根据 WNACG 网站的分类标识，汉化内容通常包含特定关键词
    // 这里使用宽松的判断，包含"汉化"、"中文"等关键词
    category.contains("汉化") || 
    category.contains("中文") || 
    category.contains("汉") ||
    category.is_empty() // 空分类默认为汉化
}

/// 爬虫结构体
#[allow(dead_code)]
pub struct Scraper {
    client: Client,
    options: SearchOptions,
}

#[allow(dead_code)]
impl Scraper {
    /// 创建新的爬虫实例
    pub fn new(options: SearchOptions) -> Result<Self, AppError> {
        let cookie_store = CookieStore::default();
        let cookie_store = CookieStoreMutex::new(cookie_store);
        let cookie_store = Arc::new(cookie_store);

        let mut client_builder = Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .cookie_provider(cookie_store);

        // 配置代理
        if options.proxy_enabled {
            if let Some(proxy_url) = &options.proxy {
                let proxy = reqwest::Proxy::all(proxy_url)?;
                client_builder = client_builder.proxy(proxy);
            }
        }

        let client = client_builder.build()?;

        Ok(Self { client, options })
    }

    /// 搜索漫画
    pub async fn search(&self, app: &tauri::AppHandle, keyword: String) -> Result<SearchResult, AppError> {
        println!("🔍 开始搜索：{}", keyword);

        // 构建搜索 URL
        let base_url = "https://www.wnacg.com/search/index.php";

        // 获取第一页
        let first_page_url = format!(
            "{}?q={}&m=&syn=yes&f=_all&s=create_time_DESC&p=1",
            base_url, keyword
        );

        let html = self.fetch_page(&first_page_url).await?;

        // 调试：输出 HTML 长度和前 500 个字符
        println!("📄 获取到 HTML，长度：{}", html.len());
        if html.len() > 500 {
            println!("📄 HTML 前 500 字符：{}", &html[..500]);
        }

        // 解析第一页，获取总页数
        let total_pages = Self::parse_total_pages(&html)?;
        println!("📄 总页数：{}", total_pages);

        // 计算实际爬取页数
        let max_pages = if self.options.max_pages == 0 {
            total_pages
        } else {
            std::cmp::min(self.options.max_pages, total_pages)
        };

        println!("📄 将爬取 {} 页", max_pages);

        // 解析第一页的漫画
        let mut all_comics = Self::parse_comics(&html)?;
        println!("📄 第 1 页找到 {} 部漫画", all_comics.len());

        // 发送进度事件
        events::emit_search_progress(
            app,
            SearchProgressEvent {
                current: 1,
                total: max_pages,
                found_count: all_comics.len() as u32,
            },
        );

        // 并发爬取剩余页面（分批控制，每批 3 个页面）
        if max_pages > 1 {
            let batch_size = 3; // 每批并发数
            let pages: Vec<u32> = (2..=max_pages).collect();

            for chunk in pages.chunks(batch_size) {
                let mut handles = vec![];

                // 发起一批请求
                for &page in chunk {
                    let client = self.client.clone();
                    let url = format!(
                        "{}?q={}&m=&syn=yes&f=_all&s=create_time_DESC&p={}",
                        base_url, keyword, page
                    );

                    let handle = tokio::spawn(async move {
                        match Self::fetch_page_with_client(&client, &url).await {
                            Ok(html) => {
                                let comics = Self::parse_comics(&html).unwrap_or_default();
                                // 注意：过滤逻辑在搜索完成后统一处理
                                comics
                            },
                            Err(e) => {
                                eprintln!("⚠️ 第 {} 页爬取失败：{}", page, e);
                                vec![]
                            }
                        }
                    });

                    handles.push((page, handle));
                }

                // 等待这批任务完成
                for (page, handle) in handles {
                    if let Ok(comics) = handle.await {
                        let count = comics.len();
                        all_comics.extend(comics);

                        println!("📄 第 {} 页找到 {} 部漫画", page, count);

                        // 发送进度事件
                        events::emit_search_progress(
                            app,
                            SearchProgressEvent {
                                current: page,
                                total: max_pages,
                                found_count: all_comics.len() as u32,
                            },
                        );
                    }
                }

                // 批次间请求间隔
                tokio::time::sleep(Duration::from_millis(self.options.request_interval)).await;
            }
        }

        // 去重
        all_comics = Self::deduplicate_comics(all_comics);
        println!("📊 去重后共 {} 部漫画", all_comics.len());

        // 根据配置过滤非汉化内容
        if self.options.search_chinese_only {
            all_comics = all_comics.into_iter()
                .filter(|c| is_chinese_category(&c.category))
                .collect();
            println!("🇨🇳 过滤后剩余 {} 部汉化漫画", all_comics.len());
        }

        // 保存到文件
        let file_path = Self::save_results(&keyword, &all_comics)?;

        // 构建搜索结果
        let result = SearchResult {
            keyword,
            search_time: Local::now().format("%Y-%m-%d %H:%M").to_string(),
            comics: all_comics,
            file_path,
        };

        println!("✅ 搜索完成，结果已保存到 {}", result.file_path);

        Ok(result)
    }

    /// 获取页面
    async fn fetch_page(&self, url: &str) -> Result<String, AppError> {
        Self::fetch_page_with_client(&self.client, url).await
    }

    /// 使用指定客户端获取页面
    async fn fetch_page_with_client(client: &Client, url: &str) -> Result<String, AppError> {
        let response = client.get(url).send().await?;
        let html = response.text().await?;
        Ok(html)
    }

    /// 检查是否是 Cloudflare 验证页面
    /// 检查是否为 Cloudflare 验证页面
    #[allow(dead_code)]
    fn is_cloudflare_challenge(html: &str) -> bool {
        html.contains("challenge-platform") || html.contains("cf-challenge") || html.contains("Checking your browser")
    }

    /// 解析总页数
    fn parse_total_pages(html: &str) -> Result<u32, AppError> {
        let document = Html::parse_document(html);

        // 查找分页元素 - 使用更宽松的选择器
        let pager_selector = Selector::parse("div.paginator a, .paginator a").unwrap();

        let mut max_page = 1;

        for element in document.select(&pager_selector) {
            if let Some(href) = element.value().attr("href") {
                // 从 URL 中提取页数，格式如：p=2
                if let Some(p_match) = href.split('?').last() {
                    if let Some(p_param) = p_match.split('&').find(|s| s.starts_with("p=")) {
                        if let Ok(page) = p_param[2..].parse::<u32>() {
                            if page > max_page {
                                max_page = page;
                            }
                        }
                    }
                }
            }
        }

        println!("📄 解析到的最大页数：{}", max_page);
        Ok(max_page)
    }

    /// 解析漫画列表
    fn parse_comics(html: &str) -> Result<Vec<Comic>, AppError> {
        let document = Html::parse_document(html);
        let mut comics = vec![];

        // 选择器：漫画卡片
        let card_selector = Selector::parse("div.asTB").unwrap();

        for card in document.select(&card_selector) {
            if let Some(comic) = Self::parse_comic_card(&card) {
                comics.push(comic);
            }
        }

        Ok(comics)
    }

    /// 解析单个漫画卡片
    fn parse_comic_card(card: &scraper::ElementRef) -> Option<Comic> {
        // 提取链接
        let link_selector = Selector::parse("a").unwrap();
        let mut aid = String::new();
        let mut url = String::new();
        let mut title = String::new();
        let mut cover_url = String::new();

        for link in card.select(&link_selector) {
            if let Some(href) = link.value().attr("href") {
                if href.starts_with("/photos-index-aid-") {
                    // 提取 aid
                    if let Some(aid_str) = href.split('-').nth(3) {
                        aid = aid_str.to_string();
                    }
                    url = format!("https://www.wnacg.com{}", href);

                    // 提取标题
                    title = link.text().collect::<Vec<_>>().join("").trim().to_string();
                }
            }

            // 提取封面图
            let img_selector = Selector::parse("img").unwrap();
            if let Some(img) = link.select(&img_selector).next() {
                if let Some(src) = img.value().attr("src") {
                    cover_url = if src.starts_with("//") {
                        format!("https:{}", src)
                    } else if src.starts_with("/") {
                        format!("https://www.wnacg.com{}", src)
                    } else {
                        src.to_string()
                    };
                }
            }
        }

        if aid.is_empty() || title.is_empty() {
            return None;
        }

        // 提取作者和分类
        let author = String::new();
        let mut category = String::new();
        let tags = vec![];
        let upload_date = String::new();

        // 提取分类（通过 cate-* 类名）
        let span_selector = Selector::parse("span").unwrap();
        for span in card.select(&span_selector) {
            if let Some(class) = span.value().attr("class") {
                if class.contains("cate-") {
                    category = span.text().collect::<Vec<_>>().join("").trim().to_string();
                }
            }
        }

        Some(Comic {
            aid,
            title,
            author,
            category,
            cover_url,
            url,
            pages: 0,
            tags,
            upload_date,
        })
    }

    /// 去重漫画列表
    fn deduplicate_comics(comics: Vec<Comic>) -> Vec<Comic> {
        use std::collections::HashSet;

        let mut seen = HashSet::new();
        let mut result = vec![];

        for comic in comics {
            if seen.insert(comic.aid.clone()) {
                result.push(comic);
            }
        }

        result
    }

    /// 保存搜索结果到文件
    fn save_results(keyword: &str, comics: &[Comic]) -> Result<String, AppError> {
        // 使用项目目录下的 cache 目录
        let cache_dir = std::env::current_dir()
            .map_err(|e| AppError::IoError(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("无法获取当前目录：{}", e),
            )))?
            .parent()
            .ok_or(AppError::IoError(std::io::Error::new(
                std::io::ErrorKind::Other,
                "无法获取项目目录",
            )))?
            .join("cache");

        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir)?;
        }

        // 构建文件名
        let file_name = format!("search_{}.json", keyword.replace(' ', "_"));
        let file_path = cache_dir.join(&file_name);

        // 序列化并保存
        let json = serde_json::to_string_pretty(&comics)?;
        fs::write(&file_path, json)?;

        Ok(file_path.to_string_lossy().to_string())
    }
}