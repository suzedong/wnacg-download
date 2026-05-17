// 配置命令

use std::process::Command;
use tauri::command;

#[command]
pub fn get_config() -> Result<crate::types::config::AppConfig, String> {
    crate::config::load_config().map_err(|e| e.to_string())
}

#[command]
pub fn save_config(config: crate::types::config::AppConfig) -> Result<(), String> {
    crate::config::save_config(&config).map_err(|e| e.to_string())
}

#[command]
pub fn reset_config() -> Result<crate::types::config::AppConfig, String> {
    crate::config::reset_config().map_err(|e| e.to_string())
}

/// 获取默认保存路径（当前工作目录）
#[command]
pub fn get_default_save_path() -> Result<String, String> {
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("获取默认路径失败：{}", e))
}

/// 打开本地文件夹（使用系统原生方式）
#[command]
pub fn open_folder(path: String) -> Result<(), String> {
    let path_obj = std::path::Path::new(&path);
    if !path_obj.exists() {
        return Err(format!("文件夹不存在：{}", path));
    }
    if !path_obj.is_dir() {
        return Err(format!("不是文件夹：{}", path));
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| format!("打开文件夹失败：{}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("打开文件夹失败：{}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("打开文件夹失败：{}", e))?;
    }

    Ok(())
}
