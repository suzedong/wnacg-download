// 下载命令

use crate::core::downloader::{self, Downloader, DownloaderConfig};
use crate::notification;
use crate::types::download::{DownloadOptions, DownloadResult, DownloadTask};
use tauri::{Emitter, Manager};
use tauri::command;

#[command]
pub async fn start_download(
    app: tauri::AppHandle,
    tasks: Vec<DownloadTask>,
    options: DownloadOptions,
) -> Result<String, String> {
    println!("⬇️ 收到下载请求：{} 部漫画", tasks.len());

    // 创建会话
    let session_id = format!("dl_{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis());

    let session = downloader::create_session(session_id.clone());

    // 在后台启动下载
    let app_clone = app.clone();
    let session_id_clone = session_id.clone();
    let tasks_clone = tasks.clone();
    let options_clone = options.clone();

    tokio::spawn(async move {
        println!("🔄 后台下载任务已启动");
        let result = session.run(&app_clone, tasks_clone, &options_clone).await;

        match result {
            Ok(download_result) => {
                // 注意：download_complete 事件已在 session.run() 内部发射，此处不再重复发射
                notification::send_download_complete(&app_clone, download_result.success, download_result.failed);
                println!("✅ 下载完成（后台回调）：成功 {} 部，失败 {} 部", download_result.success, download_result.failed);
            }
            Err(e) => {
                eprintln!("⚠️ 下载失败（后台回调）：{}", e);
                if let Some(window) = app_clone.get_webview_window("main") {
                    let _ = window.emit("download_error", format!("下载失败：{}", e));
                } else {
                    let _ = app_clone.emit("download_error", format!("下载失败：{}", e));
                }
            }
        }

        // 清理会话
        downloader::remove_session(&session_id_clone);
        println!("🧹 下载会话已清理：{}", session_id_clone);
    });

    Ok(session_id)
}

/// 暂停下载（等待当前运行中的任务完成，不启动新任务）
#[command]
pub fn pause_download(session_id: String) -> Result<String, String> {
    if let Some(session) = downloader::get_session(&session_id) {
        session.pause();
        Ok("已发送暂停指令".to_string())
    } else {
        Err("下载会话不存在".to_string())
    }
}

/// 恢复下载
#[command]
pub fn resume_download(session_id: String) -> Result<String, String> {
    if let Some(session) = downloader::get_session(&session_id) {
        session.resume();
        Ok("已发送恢复指令".to_string())
    } else {
        Err("下载会话不存在".to_string())
    }
}

/// 取消单个任务
#[command]
pub fn cancel_task(session_id: String, aid: String) -> Result<String, String> {
    if let Some(session) = downloader::get_session(&session_id) {
        session.cancel_task(&aid);
        Ok(format!("已取消任务：{}", aid))
    } else {
        Err("下载会话不存在".to_string())
    }
}

/// 获取下载会话状态
#[command]
pub fn get_download_status(session_id: String) -> Result<serde_json::Value, String> {
    if let Some(session) = downloader::get_session(&session_id) {
        Ok(serde_json::json!({
            "paused": session.is_paused(),
            "running_count": session.running_count(),
        }))
    } else {
        Err("下载会话不存在".to_string())
    }
}

/// 旧版 start_download（直接执行，不支持暂停/取消）
#[allow(dead_code)]
async fn start_download_legacy(
    app: tauri::AppHandle,
    tasks: Vec<DownloadTask>,
    options: DownloadOptions,
) -> Result<DownloadResult, String> {
    println!("⬇️ 收到下载请求（旧版）：{} 部漫画", tasks.len());

    let config = DownloaderConfig {
        concurrent: options.concurrent,
        retry_times: options.retry_times,
        retry_interval: options.retry_interval,
        proxy: options.proxy,
        proxy_enabled: options.proxy_enabled,
        storage_path: options.storage_path,
        download_source_preference: options.download_source_preference.unwrap_or_default(),
    };

    let downloader = Downloader::new(config).map_err(|e| e.to_string())?;
    let result = downloader
        .download_batch(&app, tasks)
        .await
        .map_err(|e| e.to_string())?;

    if result.failed > 0 && result.success == 0 {
        let reasons: Vec<String> = result
            .failed_list
            .iter()
            .map(|f| format!("{}: {}", f.title, f.reason))
            .collect();
        return Err(format!("全部下载失败：\n{}", reasons.join("\n")));
    }

    Ok(result)
}
