// 下载器模�?
use crate::error::AppError;
use crate::events::{self, DownloadCompleteEvent, DownloadProgressEvent};
use crate::notification;
use crate::types::download::{DownloadResult, DownloadTask, FailedComic};
use reqwest::Client;
use scraper::{Html, Selector};
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// 下载器配�?#[derive(Clone)]
pub struct DownloaderConfig {
    /// 并发下载�?    pub concurrent: u32,
    /// 重试次数
    pub retry_times: u32,
    /// 重试间隔（秒�?    pub retry_interval: u64,
    /// 代理设置
    pub proxy: Option<String>,
    pub proxy_enabled: bool,
}

/// 下载�?pub struct Downloader {
    client: Client,
    config: DownloaderConfig,
}

impl Downloader {
    /// 创建新的下载�?    pub fn new(config: DownloaderConfig) -> Result<Self, AppError> {
        let mut client_builder = Client::builder()
            .timeout(Duration::from_secs(300))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

        // 配置代理
        if config.proxy_enabled && config.proxy.is_some() {
            let proxy_url = config.proxy.as_ref().unwrap();
            let proxy = reqwest::Proxy::all(proxy_url)?;
            client_builder = client_builder.proxy(proxy);
        }

        let client = client_builder.build()?;

        Ok(Self { client, config })
    }

    /// 下载多个漫画（并发）
    pub async fn download_batch(
        &self,
        app: &tauri::AppHandle,
        tasks: Vec<DownloadTask>,
    ) -> Result<DownloadResult, AppError> {
        println!("⬇️ 开始批量下载：{} 部漫�?, tasks.len());

        let success = Arc::new(AtomicUsize::new(0));
        let failed = Arc::new(Mutex::new(Vec::new()));
        let success_list = Arc::new(Mutex::new(Vec::new()));

        // 限制并发�?        let semaphore = Arc::new(tokio::sync::Semaphore::new(self.config.concurrent as usize));
        let total_tasks = tasks.len();

        let mut handles = vec![];

        for (index, task) in tasks.into_iter().enumerate() {
            let client = self.client.clone();
            let config = self.config.clone();
            let app = app.clone();
            let success = success.clone();
            let failed = failed.clone();
            let success_list = success_list.clone();
            let permit = semaphore.clone().acquire_owned().await.unwrap();

            let handle = tokio::spawn(async move {
                let _permit = permit;
                let result = Self::download_single(&client, &config, &app, task.clone()).await;

                match result {
                    Ok(_) => {
                        success.fetch_add(1, Ordering::SeqCst);
                        success_list.lock().unwrap().push(task.title);
                    }
                    Err(e) => {
                        failed.lock().unwrap().push(FailedComic {
                            title: task.title,
                            reason: e.to_string(),
                        });
                    }
                }
            });

            handles.push(handle);
        }

        // 等待所有任务完�?        for handle in handles {
            let _ = handle.await;
        }

        let success_count = success.load(Ordering::SeqCst);
        let failed_list = failed.lock().unwrap().clone();
        let success_titles = success_list.lock().unwrap().clone();

        let result = DownloadResult {
            success: success_count as u32,
            failed: failed_list.len() as u32,
            success_list: success_titles,
            failed_list,
        };

        // 发送下载完成事�?        events::emit_download_complete(
            app,
            DownloadCompleteEvent {
                success: result.success,
                failed: result.failed,
            },
        );

        // 发送原生通知
        notification::send_download_complete(app, result.success, result.failed);

        println!(
            "�?批量下载完成：成�?{} 部，失败 {} �?,
            result.success, result.failed
        );

        Ok(result)
    }

    /// 下载单个漫画
    async fn download_single(
        client: &Client,
        config: &DownloaderConfig,
        app: &tauri::AppHandle,
        task: DownloadTask,
    ) -> Result<(), AppError> {
        println!("⬇️ 开始下载：{}", task.title);

        // 创建保存目录
        let save_dir = Path::new(&task.save_path).join(&task.title);
        if !save_dir.exists() {
            fs::create_dir_all(&save_dir)?;
        }

        // 获取漫画详情�?        let detail_html = Self::fetch_with_retry(client, config, &task.url, 0).await?;

        // 解析图片链接
        let image_urls = Self::parse_image_urls(&detail_html)?;
        let total_images = image_urls.len();

        println!("📄 {} �?{} 张图�?, task.title, total_images);

        // 下载所有图�?        for (index, image_url) in image_urls.iter().enumerate() {
            let file_name = format!("{:03}.jpg", index + 1);
            let file_path = save_dir.join(&file_name);

            // 断点续传：检查文件是否已存在
            if file_path.exists() {
                println!("⏭️ 跳过已下载：{}", file_name);
                continue;
            }

            // 下载图片
            let mut retries = 0;
            loop {
                match Self::download_image(client, image_url, &file_path).await {
                    Ok(_) => {
                        break;
                    }
                    Err(e) => {
                        retries += 1;
                        if retries >= config.retry_times {
                            return Err(AppError::DownloadError(format!(
                                "下载失败 {}，原因：{}",
                                file_name, e
                            )));
                        }
                        println!(
                            "⚠️ 下载失败 {}（第 {} 次），{} 秒后重试...",
                            file_name,
                            retries,
                            config.retry_interval
                        );
                        tokio::time::sleep(Duration::from_secs(config.retry_interval)).await;
                    }
                }
            }

            // 发送进度事�?            let progress = ((index + 1) as f64 / total_images as f64) * 100.0;
            events::emit_download_progress(
                app,
                DownloadProgressEvent {
                    task_id: task.aid.clone(),
                    progress,
                    speed: 0.0,
                    eta: 0,
                },
            );
        }

        println!("�?{} 下载完成", task.title);

        Ok(())
    }

    /// 下载单个图片
    async fn download_image(
        client: &Client,
        url: &str,
        file_path: &Path,
    ) -> Result<(), AppError> {
        let response = client.get(url).send().await?;
        let bytes = response.bytes().await?;

        fs::write(file_path, &bytes)?;

        Ok(())
    }

    /// 带重试的 HTTP 请求
    async fn fetch_with_retry(
        client: &Client,
        config: &DownloaderConfig,
        url: &str,
        _retry_count: u32,
    ) -> Result<String, AppError> {
        let mut retries = 0;
        loop {
            match client.get(url).send().await {
                Ok(response) => match response.text().await {
                    Ok(html) => return Ok(html),
                    Err(e) => {
                        if retries >= config.retry_times {
                            return Err(AppError::DownloadError(format!("请求失败：{}", e)));
                        }
                        retries += 1;
                        tokio::time::sleep(Duration::from_secs(config.retry_interval)).await;
                    }
                },
                Err(e) => {
                    if retries >= config.retry_times {
                        return Err(AppError::DownloadError(format!("请求失败：{}", e)));
                    }
                    retries += 1;
                    tokio::time::sleep(Duration::from_secs(config.retry_interval)).await;
                }
            }
        }
    }

    /// 解析图片 URL
    fn parse_image_urls(html: &str) -> Result<Vec<String>, AppError> {
        let document = Html::parse_document(html);
        let mut urls = vec![];

        // 查找所有图�?        let img_selector = Selector::parse("img").unwrap();

        for img in document.select(&img_selector) {
            if let Some(src) = img.value().attr("src") {
                // 过滤缩略图，只下载大�?                if !src.contains("thumb") {
                    let url = if src.starts_with("//") {
                        format!("https:{}", src)
                    } else if src.starts_with("/") {
                        format!("https://www.wnacg.com{}", src)
                    } else {
                        src.to_string()
                    };
                    urls.push(url);
                }
            }
        }

        if urls.is_empty() {
            return Err(AppError::DownloadError("未找到图片链�?.to_string()));
        }

        Ok(urls)
    }
}
