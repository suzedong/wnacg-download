// Cloudflare 验证模块

use tauri::Manager;

/// TauriCommand：标记验证完成
#[tauri::command]
pub fn mark_cloudflare_verified(_app: tauri::AppHandle) {
    println!("✅ 用户标记验证完成");
    // 这里可以通过事件或状态管理来通知等待的函数
    // 简化实现：直接关闭窗口
    if let Some(w) = _app.get_webview_window("cloudflare-verify") {
        let _ = w.close();
    }
}
