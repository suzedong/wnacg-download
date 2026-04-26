// Cloudflare 验证模块

use crate::error::AppError;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::Manager;

/// 显示 Cloudflare 验证窗口
/// 返回是否验证成功
pub async fn show_cloudflare_verify(app: &tauri::AppHandle) -> Result<bool, AppError> {
    println!("🔒 打开 Cloudflare 验证窗口");

    // 创建一个共享状态，用于跟踪验证是否完成
    let verified = Arc::new(Mutex::new(false));
    let verified_clone = verified.clone();

    // 创建 WebView 窗口
    let _window = tauri::WebviewWindowBuilder::new(
        app,
        "cloudflare-verify",
        tauri::WebviewUrl::External("https://www.wnacg.com".parse().unwrap()),
    )
    .title("Cloudflare 验证 - 请在完成验证后点击按钮")
    .inner_size(900.0, 700.0)
    .resizable(true)
    .build()
    .map_err(|e| AppError::Unknown(format!("创建验证窗口失败：{}", e)))?;

    // 设置超时（5 分钟）
    let timeout = Duration::from_secs(300);
    let start_time = Instant::now();

    // 轮询等待用户完成验证
    while start_time.elapsed() < timeout {
        // 检查窗口是否被关闭
        if app.get_webview_window("cloudflare-verify").is_none() {
            println!("❌ 验证窗口已关闭");
            return Ok(false);
        }

        // 检查是否已验证
        if *verified_clone.lock().unwrap() {
            println!("✅ Cloudflare 验证完成");
            // 关闭窗口
            if let Some(w) = app.get_webview_window("cloudflare-verify") {
                let _ = w.close();
            }
            return Ok(true);
        }

        // 等待 1 秒
        tokio::time::sleep(Duration::from_secs(1)).await;
    }

    // 超时
    println!("⏰ Cloudflare 验证超时");
    if let Some(w) = app.get_webview_window("cloudflare-verify") {
        let _ = w.close();
    }

    Err(AppError::CloudflareError("验证超时，请重试".to_string()))
}

/// Tauri Command：标记验证完成
#[tauri::command]
pub fn mark_cloudflare_verified(_app: tauri::AppHandle) {
    println!("✅ 用户标记验证完成");
    // 这里可以通过事件或状态管理来通知等待的函数
    // 简化实现：直接关闭窗口
    if let Some(w) = _app.get_webview_window("cloudflare-verify") {
        let _ = w.close();
    }
}
