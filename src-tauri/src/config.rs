// 配置管理模块

use crate::error::AppError;
use crate::types::config::AppConfig;
use std::fs;
use std::path::PathBuf;

/// 获取配置文件路径（使用程序目录）
fn get_config_path() -> Result<PathBuf, AppError> {
    // 使用程序目录
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
    
    let config_dir = exe_dir.join("config");
    
    // 创建配置目录（如果不存在）
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)?;
    }
    
    Ok(config_dir.join("config.json"))
}

/// 加载配置
pub fn load_config() -> Result<AppConfig, AppError> {
    let config_path = get_config_path()?;
    
    if !config_path.exists() {
        // 如果配置文件不存在，返回默认配置
        let default_config = AppConfig::default();
        save_config(&default_config)?;
        return Ok(default_config);
    }
    
    let config_content = fs::read_to_string(&config_path)?;
    let config: AppConfig = serde_json::from_str(&config_content)?;
    
    Ok(config)
}

/// 保存配置
pub fn save_config(config: &AppConfig) -> Result<(), AppError> {
    let config_path = get_config_path()?;
    let config_content = serde_json::to_string_pretty(config)?;
    
    fs::write(&config_path, config_content)?;
    
    Ok(())
}

/// 重置为默认配置
pub fn reset_config() -> Result<AppConfig, AppError> {
    let default_config = AppConfig::default();
    save_config(&default_config)?;
    Ok(default_config)
}
