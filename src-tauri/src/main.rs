mod commands;

use tauri::Manager;
use std::sync::Arc;
use tokio::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Arc::new(Mutex::new(commands::AppState::default())))
        .invoke_handler(tauri::generate_handler![
            commands::search_comics,
            commands::get_cache_list,
            commands::delete_cache,
            commands::compare_comics,
            commands::download_comics,
            commands::cancel_download,
            commands::get_config,
            commands::set_config,
            commands::select_directory
        ])
        .setup(|app| {
            // 初始化核心模块
            println!("WNACG Downloader 启动中...");
            
            // 获取主窗口
            if let Some(window) = app.get_webview_window("main") {
                // 可以在这里设置窗口属性
                println!("主窗口已创建");
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
