// 下载器模块
use crate::error::AppError;
use crate::events::{self, DownloadCompleteEvent, DownloadProgressEvent};
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
}

/// 下载器
pub struct Downloader {
    client: Client,
    config: DownloaderConfig,
}

impl Downloader {
    /// 创建新的下载器
    pub fn new(config: DownloaderConfig) -> Result<Self, AppError> {
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
        println!("⬇️ 开始批量下载：{} 部漫画", tasks.len());

        let success = Arc::new(AtomicUsize::new(0));
        let failed = Arc::new(Mutex::new(Vec::new()));
        let success_list = Arc::new(Mutex::new(Vec::new()));

        // 限制并发数
        let semaphore = Arc::new(tokio::sync::Semaphore::new(self.config.concurrent as usize));

        let mut handles = vec![];

        for (_index, task) in tasks.into_iter().enumerate() {
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
            DownloadCompleteEvent {
                success: result.success,
                failed: result.failed,
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

    /// 下载单个漫画
    async fn download_single(
        client: &Client,
        config: &DownloaderConfig,
        app: &tauri::AppHandle,
        task: DownloadTask,
    ) -> Result<(), AppError> {
        println!("⬇️ 开始下载：{}", task.title);

        // 确定保存路径（空时使用默认路径）
        let save_dir = if task.save_path.is_empty() {
            Path::new(&config.storage_path)
        } else {
            Path::new(&task.save_path)
        };
        if !save_dir.exists() {
            fs::create_dir_all(&save_dir)?;
        }

        // 通过 Tauri 命令获取下载信息（Playwright 绕过 Cloudflare）
        println!("📄 获取下载页信息：aid={}", task.aid);
        let (file_key, file_name, server2_url) = Self::fetch_download_info(app, &task.aid).await?;
        println!("📦 文件：{} ({})", file_name, file_key);

        // 获取下载地址（双源：Server 1 → Server 2）
        let download_link = Self::get_download_url(client, &file_key, &file_name, &server2_url).await?;
        println!("🔗 下载地址：{}", download_link);

        // 下载文件
        let file_path = save_dir.join(&file_name);
        Self::download_file(client, config, app, &download_link, &file_path, &task.aid).await?;

        println!("✅ {} 下载完成", task.title);

        Ok(())
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

    /// 获取下载地址（双源：Server 1 → Server 2）
    async fn get_download_url(
        client: &Client,
        file_key: &str,
        file_name: &str,
        server2_url: &str,
    ) -> Result<String, AppError> {
        // 尝试 Server 1：Worker API 获取临时链接
        match Self::get_url_from_worker(client, file_key, file_name).await {
            Ok(url) => {
                println!("🔗 使用 Server 1 链接");
                return Ok(url);
            }
            Err(e) => println!("⚠️ Server 1 获取失败：{}，尝试备用线路...", e),
        }

        // 回退 Server 2：优先使用 Playwright 提取的直接链接
        if !server2_url.is_empty() {
            let url = if server2_url.starts_with("//") {
                format!("https:{}", server2_url)
            } else {
                server2_url.to_string()
            };
            println!("🔗 使用 Server 2 备用线路（Playwright 提取）");
            return Ok(url);
        }

        // 最后回退：拼接直链
        let direct_url = format!("https://dl1.wn01.download/{}", file_key);
        println!("🔗 使用 Server 2 备用线路（拼接）");
        Ok(direct_url)
    }

    /// Server 1：通过 Worker API 获取临时下载链接
    async fn get_url_from_worker(
        client: &Client,
        file_key: &str,
        file_name: &str,
    ) -> Result<String, AppError> {
        let worker_url = "https://d1.wcdn.date/api/generate-link";

        let body = serde_json::json!({
            "file_key": file_key,
            "file_name": file_name
        });

        let response = client
            .post(worker_url)
            .timeout(Duration::from_secs(30))
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::DownloadError(format!("Worker API 请求失败：{}", e)))?;

        let json_val: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AppError::DownloadError(format!("Worker API 响应解析失败：{}", e)))?;

        if json_val.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
            json_val
                .get("url")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| AppError::DownloadError("Worker API 未返回有效链接".to_string()))
        } else {
            let msg = json_val
                .get("msg")
                .and_then(|v| v.as_str())
                .unwrap_or("未知错误");
            Err(AppError::DownloadError(format!("Worker API 返回失败：{}", msg)))
        }
    }

    /// 下载单个文件（支持断点续传）
    async fn download_file(
        client: &Client,
        config: &DownloaderConfig,
        app: &tauri::AppHandle,
        url: &str,
        file_path: &Path,
        task_id: &str,
    ) -> Result<(), AppError> {
        let mut retries = 0;
        loop {
            match Self::download_file_inner(client, app, url, file_path, task_id).await {
                Ok(_) => return Ok(()),
                Err(e) => {
                    retries += 1;
                    if retries >= config.retry_times {
                        return Err(AppError::DownloadError(format!(
                            "下载失败 {}，原因：{}",
                            file_path.display(),
                            e
                        )));
                    }
                    println!(
                        "⚠️ 下载失败（第 {} 次），{} 秒后重试...",
                        retries, config.retry_interval
                    );
                    tokio::time::sleep(Duration::from_secs(config.retry_interval)).await;
                }
            }
        }
    }

    /// 下载文件内部实现（带断点续传）
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

        // 构建请求，支持 Range 头
        let mut request = client.get(url);
        if existing_size > 0 {
            request = request.header("Range", format!("bytes={}-", existing_size));
        }

        let response = request
            .send()
            .await
            .map_err(|e| AppError::DownloadError(format!("请求失败：{}", e)))?;

        // 获取总大小
        let content_length = response.content_length().unwrap_or(0);
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

        Ok(())
    }
}
