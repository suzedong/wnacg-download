// 下载命令

use crate::core::downloader::{Downloader, DownloaderConfig};
use crate::types::download::{DownloadOptions, DownloadResult, DownloadTask};
use tauri::command;

#[command]
pub async fn start_download(
    app: tauri::AppHandle,
    tasks: Vec<DownloadTask>,
    options: DownloadOptions,
) -> Result<DownloadResult, String> {
    println!("⬇️ 收到下载请求：{} 部漫画", tasks.len());

    // 创建下载器配置
    let config = DownloaderConfig {
        concurrent: options.concurrent,
        retry_times: options.retry_times,
        retry_interval: options.retry_interval,
        proxy: options.proxy,
        proxy_enabled: options.proxy_enabled,
        storage_path: options.storage_path,
    };

    // 创建下载器
    let downloader = Downloader::new(config).map_err(|e| e.to_string())?;

    // 执行批量下载
    let result = downloader
        .download_batch(&app, tasks)
        .await
        .map_err(|e| e.to_string())?;

    // 如果有全部失败，返回错误信息
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
