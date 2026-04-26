// 下载命令

use crate::core::downloader::{Downloader, DownloaderConfig};
use crate::types::download::{DownloadResult, DownloadTask};
use tauri::command;

#[command]
pub async fn start_download(
    app: tauri::AppHandle,
    tasks: Vec<DownloadTask>,
    concurrent: u32,
    retry_times: u32,
    retry_interval: u64,
    proxy: Option<String>,
    proxy_enabled: bool,
) -> Result<DownloadResult, String> {
    println!("⬇️ 收到下载请求：{} 部漫画", tasks.len());

    // 创建下载器配置
    let config = DownloaderConfig {
        concurrent,
        retry_times,
        retry_interval,
        proxy,
        proxy_enabled,
    };

    // 创建下载器
    let downloader = Downloader::new(config).map_err(|e| e.to_string())?;

    // 执行批量下载
    let result = downloader
        .download_batch(&app, tasks)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}
