// 下载会话管理（支持暂停/恢复/取消单个任务）

use crate::core::downloader::{Downloader, DownloaderConfig};
use crate::error::AppError;
use crate::events;
use crate::notification;
use crate::types::download::{DownloadOptions, DownloadResult, DownloadTask, FailedComic};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::Semaphore;

/// 下载会话（运行时控制）
pub struct DownloadSession {
    /// 会话 ID
    #[allow(dead_code)]
    pub session_id: String,
    /// 暂停标志
    paused: Arc<AtomicBool>,
    /// 运行中的任务计数
    #[allow(dead_code)]
    running_count: Arc<AtomicUsize>,
    /// 活跃任务的 JoinHandle（用于取消）
    handles: Arc<Mutex<HashMap<String, tokio::task::JoinHandle<()>>>>,
}

impl DownloadSession {
    pub fn new(session_id: String) -> Self {
        Self {
            session_id,
            paused: Arc::new(AtomicBool::new(false)),
            running_count: Arc::new(AtomicUsize::new(0)),
            handles: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 暂停下载
    pub fn pause(&self) {
        self.paused.store(true, Ordering::SeqCst);
    }

    /// 恢复下载
    pub fn resume(&self) {
        self.paused.store(false, Ordering::SeqCst);
    }

    /// 是否已暂停
    pub fn is_paused(&self) -> bool {
        self.paused.load(Ordering::SeqCst)
    }

    /// 取消单个任务
    pub fn cancel_task(&self, aid: &str) {
        if let Some(handle) = self.handles.lock().unwrap().remove(aid) {
            handle.abort();
        }
    }

    /// 获取运行中的任务数
    #[allow(dead_code)]
    pub fn running_count(&self) -> usize {
        self.running_count.load(Ordering::SeqCst)
    }

    /// 执行下载主循环
    pub async fn run(
        &self,
        app: &tauri::AppHandle,
        tasks: Vec<DownloadTask>,
        options: &DownloadOptions,
    ) -> Result<DownloadResult, AppError> {
        println!("⬇️ 开始批量下载：{} 部漫画", tasks.len());

        let config = DownloaderConfig {
            concurrent: options.concurrent,
            retry_times: options.retry_times,
            retry_interval: options.retry_interval,
            proxy: options.proxy.clone(),
            proxy_enabled: options.proxy_enabled,
            storage_path: options.storage_path.clone(),
            download_source_preference: options.download_source_preference.clone().unwrap_or_default(),
        };

        let downloader = Downloader::new(config)?;
        let semaphore = Arc::new(Semaphore::new(options.concurrent as usize));
        let success = Arc::new(AtomicUsize::new(0));
        let failed = Arc::new(Mutex::new(Vec::new()));
        let success_list = Arc::new(Mutex::new(Vec::new()));

        // 用 FuturesUnordered 收集所有 spawned task，最后统一 await
        let mut handles: Vec<(String, tokio::task::JoinHandle<()>)> = vec![];

        for task in tasks {
            // 等待暂停恢复（在生成新任务前检查）
            while self.paused.load(Ordering::SeqCst) {
                tokio::time::sleep(Duration::from_millis(100)).await;
            }

            let aid = task.aid.clone();
            let aid_for_map = aid.clone();
            let task_title = task.title.clone();

            // 准备任务所需的克隆
            let app_clone = app.clone();
            let sem = semaphore.clone();
            let success_clone = success.clone();
            let failed_clone = failed.clone();
            let success_list_clone = success_list.clone();
            let h_clone = self.handles.clone();
            let paused_clone = self.paused.clone();
            let dl = downloader.clone();

            let handle = tokio::spawn(async move {
                // 如果已暂停，等待恢复
                while paused_clone.load(Ordering::SeqCst) {
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }

                // 获取并发许可
                let _permit = sem.acquire().await.unwrap();

                let result = dl.download_single(&app_clone, task).await;

                match result {
                    Ok(_) => {
                        success_clone.fetch_add(1, Ordering::SeqCst);
                        success_list_clone.lock().unwrap().push(task_title.clone());
                        println!("✅ {} 下载成功", task_title);
                    }
                    Err(e) => {
                        let err_msg = e.to_string();
                        eprintln!("❌ {} 下载失败：{}", task_title, err_msg);
                        failed_clone.lock().unwrap().push(FailedComic {
                            title: task_title,
                            reason: err_msg,
                        });
                    }
                }

                h_clone.lock().unwrap().remove(&aid);
            });

            handles.push((aid_for_map, handle));
        }

        // 等待所有任务完成
        for (aid, handle) in handles {
            if let Err(e) = handle.await {
                // 任务被取消或 panic
                if e.is_cancelled() {
                    eprintln!("⚠️ 任务 {} 被取消", aid);
                } else {
                    eprintln!("⚠️ 任务 {} 异常结束：{}", aid, e);
                }
            }
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

        // 发送下载完成事件（包含完整结果）
        println!("📤 准备发射 download_complete 事件 (session.run 内部)：success={}, failed={}", result.success, result.failed);
        events::emit_download_complete(
            app,
            events::DownloadCompleteEvent {
                success: result.success,
                failed: result.failed,
                success_list: result.success_list.clone(),
                failed_list: result.failed_list.clone(),
            },
        );
        println!("✅ download_complete 事件已发射 (session.run 内部)");

        // 发送原生通知
        notification::send_download_complete(app, result.success, result.failed);

        println!(
            "✅ 批量下载完成：成功 {} 部，失败 {} 部",
            result.success, result.failed
        );

        Ok(result)
    }
}

/// 全局会话管理器
use std::sync::LazyLock;
static SESSIONS: LazyLock<Mutex<HashMap<String, Arc<DownloadSession>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// 创建新会话
pub fn create_session(session_id: String) -> Arc<DownloadSession> {
    let session = Arc::new(DownloadSession::new(session_id.clone()));
    SESSIONS.lock().unwrap().insert(session_id, session.clone());
    session
}

/// 获取会话
pub fn get_session(session_id: &str) -> Option<Arc<DownloadSession>> {
    SESSIONS.lock().unwrap().get(session_id).cloned()
}

/// 移除会话
pub fn remove_session(session_id: &str) {
    SESSIONS.lock().unwrap().remove(session_id);
}
