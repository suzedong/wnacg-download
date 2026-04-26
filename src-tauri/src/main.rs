// WNACG Downloader - Tauri 2 主入口

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod config;
mod error;
mod events;
mod notification;
mod types;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};

/// 窗口控制命令
#[tauri::command]
fn window_minimize(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn window_maximize(window: tauri::Window) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[tauri::command]
fn window_close(window: tauri::Window) {
    let _ = window.hide();
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // 加载配置
            match config::load_config() {
                Ok(config) => {
                    println!("✅ 配置已加载：{}", config.storage_path);
                }
                Err(e) => {
                    eprintln!("⚠️ 配置加载失败：{}", e);
                }
            }

            // 创建系统托盘菜单
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // 创建系统托盘
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            println!("🎨 WNACG Downloader v4.0 已启动");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 配置命令
            commands::config::get_config,
            commands::config::save_config,
            commands::config::reset_config,
            // 搜索命令（Phase 2 实现）
            commands::search::search_comics,
            // Cloudflare 验证
            commands::cloudflare::mark_cloudflare_verified,
            // 对比命令（Phase 3 实现）
            commands::compare::compare_comics,
            // 下载命令（Phase 3 实现）
            commands::download::start_download,
            // 窗口控制
            window_minimize,
            window_maximize,
            window_close,
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // 阻止关闭，改为隐藏到托盘
                api.prevent_close();
                let _ = window.hide();
                println!("🛑 窗口已隐藏到托盘");
            }
        })
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用失败");
}
