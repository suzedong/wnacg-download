// 下载器模块
mod session;

pub use session::*;

use crate::error::AppError;
use crate::events::{self, DownloadProgressEvent};
use crate::notification;
use crate::types::download::{DownloadResult, DownloadTask, FailedComic};
use futures_util::StreamExt;
use reqwest::Client;
use std::fs::{self, File};
use std::io::{Seek, SeekFrom, Write};
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// 下载器配置
#[derive(Clone)]
pub struct DownloaderConfig {
    /// 并发下载数
    pub concurrent: u32,
    /// 重试次数
    pub retry_times: u32,
    /// 重试间隔（秒）
    pub retry_interval: u64,
    /// 代理设置
    pub proxy: Option<String>,
    pub proxy_enabled: bool,
    /// 默认存储路径
    pub storage_path: String,
    /// 下载源优先策略：server2 | worker_api | auto
    pub download_source_preference: String,
}

/// 下载器
#[derive(Clone)]
pub struct Downloader {
    client: Client,
    config: DownloaderConfig,
}

impl Downloader {
    /// 创建新的下载器
    pub fn new(config: DownloaderConfig) -> Result<Self, AppError> {
        let mut client_builder = Client::builder()
            .timeout(Duration::from_secs(300))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");

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
        println!("⬇️ 开始批量下载：{} 部漫画", tasks.len());

        let success = Arc::new(AtomicUsize::new(0));
        let failed = Arc::new(Mutex::new(Vec::new()));
        let success_list = Arc::new(Mutex::new(Vec::new()));

        // 限制并发数
        let semaphore = Arc::new(tokio::sync::Semaphore::new(self.config.concurrent as usize));

        let mut handles = vec![];
        let downloader = Arc::new(self.clone());

        for (_index, task) in tasks.into_iter().enumerate() {
            let app = app.clone();
            let success = success.clone();
            let failed = failed.clone();
            let success_list = success_list.clone();
            let dl = downloader.clone();
            let permit = semaphore.clone().acquire_owned().await.unwrap();
            let task_clone = task.clone();

            let handle = tokio::spawn(async move {
                let _permit = permit;
                let result = dl.download_single(&app, task_clone).await;

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

        // 等待所有任务完成
        for handle in handles {
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

        // 发送下载完成事件
        events::emit_download_complete(
            app,
            events::DownloadCompleteEvent {
                success: result.success,
                failed: result.failed,
                success_list: result.success_list.clone(),
                failed_list: result.failed_list.clone(),
            },
        );

        // 发送原生通知
        notification::send_download_complete(app, result.success, result.failed);

        println!(
            "✅ 批量下载完成：成功 {} 部，失败 {} 部",
            result.success, result.failed
        );

        Ok(result)
    }

    /// 下载单个漫画（公开，供会话模块调用）
    pub async fn download_single(
        &self,
        app: &tauri::AppHandle,
        task: DownloadTask,
    ) -> Result<(), AppError> {
        println!("⬇️ 开始下载：{}", task.title);

        // 确定保存路径：优先使用配置路径，任务路径为空时使用配置的
        let save_dir = if self.config.storage_path.is_empty() {
            if task.save_path.is_empty() {
                Path::new("./downloads")
            } else {
                Path::new(&task.save_path)
            }
        } else {
            Path::new(&self.config.storage_path)
        };
        if !save_dir.exists() {
            fs::create_dir_all(&save_dir)?;
        }

        let file_path = save_dir.join(&format!("{}_temp", task.aid));
        let mut retries = 0;

        loop {
            // 每次重试都重新获取下载信息（临时链接可能过期）
            if retries > 0 {
                println!("🔄 第 {} 次重试，重新获取下载链接...", retries);
            }
            println!("📄 获取下载页信息：aid={}", task.aid);
            let (file_key, file_name, server2_url) = Self::fetch_download_info(app, &task.aid).await?;
            println!("📦 文件：{} ({})", file_name, file_key);

            // 下载文件
            match Self::download_file(
                &self.client,
                &self.config,
                app,
                &file_key,
                &file_name,
                &server2_url,
                &file_path,
                &task.aid,
            ).await {
                Ok(()) => {
                    // 下载成功，重命名为最终文件名
                    let final_path = save_dir.join(&file_name);
                    if final_path.exists() {
                        fs::remove_file(&final_path)?;
                    }
                    fs::rename(&file_path, &final_path)?;
                    println!("✅ {} 下载完成", task.title);
                    return Ok(());
                }
                Err(e) => {
                    retries += 1;
                    if retries >= self.config.retry_times {
                        // 清理临时文件
                        if file_path.exists() {
                            let _ = fs::remove_file(&file_path);
                        }
                        return Err(AppError::DownloadError(format!(
                            "下载失败：{}", e
                        )));
                    }
                    // 重试前删除临时文件，避免 Range 续传与不同 URL 冲突
                    if file_path.exists() {
                        let _ = fs::remove_file(&file_path);
                    }
                    println!(
                        "⚠️ 下载失败（第 {} 次），{} 秒后重试...",
                        retries, self.config.retry_interval
                    );
                    tokio::time::sleep(Duration::from_secs(self.config.retry_interval)).await;
                }
            }
        }
    }

    /// 通过 Playwright 脚本获取下载信息（绕过 Cloudflare）
    async fn fetch_download_info(
        _app: &tauri::AppHandle,
        aid: &str,
    ) -> Result<(String, String, String), AppError> {
        Self::run_playwright_download_script(aid).await
    }

    /// 运行 Playwright 脚本获取下载信息
    async fn run_playwright_download_script(aid: &str) -> Result<(String, String, String), AppError> {
        use tokio::process::Command as TokioCommand;

        // 查找项目根目录
        let current = std::env::current_dir()
            .map_err(|e| AppError::DownloadError(format!("获取当前目录失败：{}", e)))?;
        let mut project_root = current.clone();
        for _ in 0..10 {
            if project_root.join("package.json").exists() {
                break;
            }
            if let Some(parent) = project_root.parent() {
                project_root = parent.to_path_buf();
            } else {
                break;
            }
        }

        let script_path = project_root.join("scripts").join("get_download_info.js");
        if !script_path.exists() {
            return Err(AppError::DownloadError(format!("脚本不存在：{}", script_path.display())));
        }

        let output = TokioCommand::new("node")
            .arg(&script_path)
            .arg(aid)
            .output()
            .await
            .map_err(|e| AppError::DownloadError(format!("执行脚本失败：{}", e)))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        if !stderr.is_empty() {
            eprintln!("📄 脚本输出：{}", stderr);
        }

        let info: serde_json::Value = serde_json::from_str(&stdout)
            .map_err(|e| AppError::DownloadError(format!("解析结果失败：{}\n输出：{}", e, stdout)))?;

        if info.get("success").and_then(|v| v.as_bool()) != Some(true) {
            let err = info.get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("获取下载信息失败");
            return Err(AppError::DownloadError(err.to_string()));
        }

        let file_key = info.get("file_key")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::DownloadError("未找到 FILE_KEY".to_string()))?
            .to_string();

        let file_name_raw = info.get("file_name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::DownloadError("未找到 FILE_NAME".to_string()))?;
        let file_name = Self::decode_html_entities(file_name_raw);

        let server2_url_raw = info.get("server2_url")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let server2_url = if server2_url_raw.starts_with("//") {
            format!("https:{}", server2_url_raw)
        } else {
            server2_url_raw.to_string()
        };

        Ok((file_key, file_name, server2_url))
    }

    /// 解码常见 HTML 实体
    fn decode_html_entities(s: &str) -> String {
        s.replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&#x27;", "'")
            .replace("&#124;", "|")
    }

    /// 获取 Server 2 直链（server2 策略下使用）
    async fn get_server2_url(server2_url: &str, file_key: &str) -> String {
        if !server2_url.is_empty() {
            if server2_url.starts_with("//") {
                format!("https:{}", server2_url)
            } else {
                server2_url.to_string()
            }
        } else {
            // 兜底：拼接直链
            format!("https://dl1.wn01.download/{}", file_key)
        }
    }

    /// 下载单个文件（根据配置策略选择下载源）
    async fn download_file(
        client: &Client,
        config: &DownloaderConfig,
        app: &tauri::AppHandle,
        file_key: &str,
        file_name: &str,
        server2_url: &str,
        file_path: &Path,
        task_id: &str,
    ) -> Result<(), AppError> {
        let strategy = &config.download_source_preference;

        match strategy.as_str() {
            "worker_api" => {
                // Worker API 策略：单浏览器一步完成（获取链接 + 下载）
                Self::download_file_via_playwright(app, file_key, file_name, file_path, task_id).await
            }
            _ => {
                // Server 2 策略（及默认/兜底）：reqwest 直连
                let download_url = Self::get_server2_url(server2_url, file_key).await;
                Self::download_file_inner(client, app, &download_url, file_path, task_id).await
            }
        }
    }

    /// 通过 Playwright 浏览器下载文件（绕过 Cloudflare TLS 指纹验证）
    /// 单浏览器一步完成：获取链接 + 下载
    async fn download_file_via_playwright(
        _app: &tauri::AppHandle,
        file_key: &str,
        file_name: &str,
        file_path: &Path,
        task_id: &str,
    ) -> Result<(), AppError> {
        use tokio::process::Command as TokioCommand;

        // 查找项目根目录
        let current = std::env::current_dir()
            .map_err(|e| AppError::DownloadError(format!("获取当前目录失败：{}", e)))?;
        let mut project_root = current.clone();
        for _ in 0..10 {
            if project_root.join("package.json").exists() {
                break;
            }
            if let Some(parent) = project_root.parent() {
                project_root = parent.to_path_buf();
            } else {
                break;
            }
        }

        let script_path = project_root.join("scripts").join("download_via_playwright.js");
        if !script_path.exists() {
            return Err(AppError::DownloadError(format!("脚本不存在：{}", script_path.display())));
        }

        let output_path = file_path
            .to_str()
            .ok_or_else(|| AppError::DownloadError("文件路径包含非 Unicode 字符".to_string()))?;

        println!("🌐 使用 Playwright 浏览器下载（绕过 Cloudflare）...");
        let output = TokioCommand::new("node")
            .arg(&script_path)
            .arg(file_key)
            .arg(file_name)
            .arg(output_path)
            .output()
            .await
            .map_err(|e| AppError::DownloadError(format!("执行下载脚本失败：{}", e)))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        if !stderr.is_empty() {
            eprintln!("🌐 脚本输出：{}", stderr);
        }

        let result: serde_json::Value = serde_json::from_str(&stdout)
            .map_err(|e| AppError::DownloadError(format!("解析结果失败：{}\n输出：{}", e, stdout)))?;

        if result.get("success").and_then(|v| v.as_bool()) != Some(true) {
            let err = result.get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Playwright 下载失败");
            return Err(AppError::DownloadError(err.to_string()));
        }

        let size = result.get("size").and_then(|v| v.as_u64()).unwrap_or(0);
        println!("✅ Playwright 下载完成：{} 字节（{:.2} MB）", size, size as f64 / (1024.0 * 1024.0));

        let _ = task_id;
        Ok(())
    }

    /// 下载文件内部实现（带断点续传 + Cookie 支持）
    async fn download_file_inner(
        client: &Client,
        app: &tauri::AppHandle,
        url: &str,
        file_path: &Path,
        task_id: &str,
    ) -> Result<(), AppError> {
        // 断点续传：检查已有文件大小
        let mut existing_size = 0u64;
        if file_path.exists() {
            let meta = fs::metadata(file_path)?;
            existing_size = meta.len();
            if existing_size > 0 {
                println!("⏭️ 断点续传：已有 {} 字节", existing_size);
            }
        }

        // 构建请求，支持 Range 头和 Referer
        let mut request = client.get(url);
        if existing_size > 0 {
            request = request.header("Range", format!("bytes={}-", existing_size));
        }
        // 设置 Referer，模拟从 wnacg.com 下载
        request = request.header("Referer", "https://www.wnacg.com/");

        println!("📤 发送 GET 请求：{}", url.chars().take(80).collect::<String>());

        let response = request
            .send()
            .await
            .map_err(|e| AppError::DownloadError(format!("请求失败：{}", e)))?;

        // 记录最终 URL（可能有重定向）
        let final_url = response.url().to_string();
        if final_url != url {
            println!("🔄 URL 重定向：{} → {}", url, final_url);
        }

        // 记录协议版本
        let version = response.version();
        println!("📥 响应：HTTP/{:?}, 状态码: {}", version, response.status());

        // 记录响应状态
        let status = response.status();
        let content_length = response.content_length().unwrap_or(0);
        let content_type = response
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .map(|v| v.to_str().unwrap_or("unknown"))
            .unwrap_or("unknown");
        let connection_header = response
            .headers()
            .get(reqwest::header::CONNECTION)
            .map(|v| v.to_str().unwrap_or(""))
            .unwrap_or("");

        if !status.is_success() {
            // 提取 server 头（转换为 owned String，避免 text() 移动时借用冲突）
            let server_hdr: String = response
                .headers()
                .get("server")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("unknown")
                .to_string();
            // 读取错误响应体
            let error_body = response.text().await.unwrap_or_default();
            return Err(AppError::DownloadError(format!(
                "服务器返回错误：{} (server: {}, body: {})", status, server_hdr, &error_body[..error_body.len().min(200)]
            )));
        }

        // 判断是否为真正的文件内容
        if !content_type.starts_with("application/") && !content_type.starts_with("video/") && !content_type.starts_with("application/octet-stream") {
            println!("⚠️ 响应类型：{}，可能不是文件流", content_type);
        }

        let expected_mb = content_length as f64 / (1024.0 * 1024.0);
        println!("📦 文件大小：{:.2} MB，类型：{}，连接：{}", expected_mb, content_type, connection_header);

        let total_size = if existing_size > 0 && content_length > 0 {
            existing_size + content_length
        } else {
            content_length
        };

        // 打开文件（追加模式或新建）
        let mut file = if existing_size > 0 {
            let mut f = fs::OpenOptions::new().write(true).open(file_path)?;
            f.seek(SeekFrom::End(0))?;
            f
        } else {
            File::create(file_path)?
        };

        // 流式下载
        let mut downloaded = existing_size;
        let mut stream = response.bytes_stream();

        while let Some(chunk) = stream.next().await {
            let bytes = chunk.map_err(|e| AppError::NetworkError(e))?;
            file.write_all(&bytes)?;
            downloaded += bytes.len() as u64;

            // 发送进度事件
            if total_size > 0 {
                let progress = (downloaded as f64 / total_size as f64) * 100.0;
                events::emit_download_progress(
                    app,
                    DownloadProgressEvent {
                        task_id: task_id.to_string(),
                        progress,
                        speed: 0.0,
                        eta: 0,
                    },
                );
            }
        }

        // 确保写入磁盘
        file.flush()?;

        // 校验下载是否完整
        if content_length > 0 {
            let expected_downloaded = total_size - existing_size;
            let actual_downloaded = downloaded - existing_size;
            if actual_downloaded != expected_downloaded {
                let expected_mb = expected_downloaded as f64 / (1024.0 * 1024.0);
                let actual_mb = actual_downloaded as f64 / (1024.0 * 1024.0);
                return Err(AppError::DownloadError(format!(
                    "下载不完整：期望 {:.1} MB，实际 {:.1} MB",
                    expected_mb, actual_mb
                )));
            }
            println!("✅ 文件大小校验通过：{} 字节", actual_downloaded);
        } else {
            // 没有 Content-Length 时，至少检查是否下载到了数据
            if downloaded == existing_size {
                return Err(AppError::DownloadError("下载失败：未获取到任何数据".to_string()));
            }
            println!("✅ 下载完成：{} 字节（无 Content-Length，跳过大小校验）", downloaded - existing_size);
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- decode_html_entities ---

    #[test]
    fn test_decode_no_entities() {
        assert_eq!(Downloader::decode_html_entities("火影忍者"), "火影忍者");
    }

    #[test]
    fn test_decode_nbsp() {
        assert_eq!(Downloader::decode_html_entities("火影&nbsp;忍者"), "火影 忍者");
    }

    #[test]
    fn test_decode_ampersand() {
        assert_eq!(Downloader::decode_html_entities("Naruto &amp; Boruto"), "Naruto & Boruto");
    }

    #[test]
    fn test_decode_mixed() {
        let input = "Naruto&nbsp;&amp;&nbsp;Boruto&#124;&#39;";
        assert_eq!(Downloader::decode_html_entities(input), "Naruto & Boruto|'");
    }

    #[test]
    fn test_decode_all_known() {
        let input = "&nbsp;&amp;&lt;&gt;&quot;&#39;&#x27;&#124;";
        assert_eq!(Downloader::decode_html_entities(input), " &<>\"''|");
    }

    // --- get_server2_url ---

    #[tokio::test]
    async fn test_server2_url_empty() {
        let result = Downloader::get_server2_url("", "abc123").await;
        assert_eq!(result, "https://dl1.wn01.download/abc123");
    }

    #[tokio::test]
    async fn test_server2_url_double_slash() {
        let result = Downloader::get_server2_url("//example.com/path", "key").await;
        assert_eq!(result, "https://example.com/path");
    }

    #[tokio::test]
    async fn test_server2_url_full() {
        let result = Downloader::get_server2_url("https://dl1.wn01.download/file.zip", "key").await;
        assert_eq!(result, "https://dl1.wn01.download/file.zip");
    }
}
