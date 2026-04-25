mod commands;

use tauri::Manager;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::process::Command;
use std::net::TcpStream;
use std::thread;
use std::time::Duration;

/// 等待 Node.js 服务启动
fn wait_for_service(port: u16, max_retries: u32) -> bool {
    for i in 0..max_retries {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            println!("✅ Node.js 服务已就绪（尝试 {} 次）", i + 1);
            return true;
        }
        println!("⏳ 等待 Node.js 服务启动... ({}/{})", i + 1, max_retries);
        thread::sleep(Duration::from_millis(1000));
    }
    false
}

fn main() {
    // 启动 Node.js API 服务器
    println!("🚀 正在启动 Node.js API 服务器...");
    
    // 获取项目根目录（src-tauri 的父目录）
    let current_dir = std::env::current_dir().expect("获取当前目录失败");
    let project_root = current_dir.parent().expect("获取项目根目录失败");
    
    let node_process = Command::new("node")
        .current_dir(project_root) // 设置工作目录为项目根目录
        .arg(project_root.join("scripts").join("api-server.js"))
        .arg("3001") // 端口 3001，避免与 Web 应用冲突
        .spawn()
        .expect("❌ 启动 Node.js 服务失败，请确保已安装 Node.js");
    
    let node_process = Arc::new(Mutex::new(Some(node_process)));
    
    // 等待服务启动
    if !wait_for_service(3001, 30) {
        panic!("❌ Node.js 服务启动超时（30 秒）");
    }
    
    println!("✅ Node.js API 服务器已启动（端口 3001）");
    
    let app_state = Arc::new(Mutex::new(commands::AppState {
        node_server_url: "http://127.0.0.1:3001".to_string(),
        node_process: node_process.clone(),
    }));
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::search_comics,
            commands::get_cache_list,
            commands::get_cached_comics,
            commands::delete_cache,
            commands::compare_comics,
            commands::download_comics,
            commands::cancel_download,
            commands::get_config,
            commands::set_config,
            commands::select_directory
        ])
        .setup(|app| {
            println!("🎨 WNACG Downloader 前端已加载");
            
            if let Some(_window) = app.get_webview_window("main") {
                println!("✅ 主窗口已创建");
            }
            
            Ok(())
        })
        .on_window_event(|_window, event| {
            // 窗口关闭时清理 Node.js 进程
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                println!("🛑 应用正在关闭...");
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
