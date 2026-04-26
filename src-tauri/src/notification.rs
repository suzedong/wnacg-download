// 原生通知模块

/// 发送原生通知
pub fn send_notification(app: &tauri::AppHandle, title: &str, body: &str) {
    use tauri_plugin_notification::NotificationExt;

    let notification = app.notification().builder()
        .title(title)
        .body(body);

    notification.show()
        .unwrap_or_else(|e| {
            eprintln!("发送通知失败：{}", e);
        });
}

/// 发送下载完成通知
pub fn send_download_complete(app: &tauri::AppHandle, success: u32, failed: u32) {
    let title = "下载完成";
    let body = if failed > 0 {
        format!("成功 {} 部，失败 {} 部", success, failed)
    } else {
        format!("成功下载 {} 部漫画", success)
    };

    send_notification(app, title, &body);
}

/// 发送错误通知
pub fn send_error_notification(app: &tauri::AppHandle, error: &str) {
    send_notification(app, "错误", error);
}
