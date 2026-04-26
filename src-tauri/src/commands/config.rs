// 配置命令

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
