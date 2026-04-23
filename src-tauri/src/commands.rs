use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Arc;
use tokio::sync::Mutex;

// 应用状态管理
pub struct AppState {
    pub node_server_url: String,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            node_server_url: "http://localhost:3000".to_string(),
        }
    }
}

// ==================== 搜索 ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchRequest {
    pub keyword: String,
}

#[tauri::command]
pub async fn search_comics(
    keyword: String,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<Vec<serde_json::Value>, String> {
    let state = state.lock().await;
    let client = reqwest::Client::new();
    
    let response = client
        .post(format!("{}/api/search", state.node_server_url))
        .json(&serde_json::json!({
            "keyword": keyword,
        }))
        .send()
        .await
        .map_err(|e| format!("搜索失败：{}", e))?;
    
    let result: Vec<serde_json::Value> = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败：{}", e))?;
    
    Ok(result)
}

#[tauri::command]
pub async fn get_cache_list(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<Vec<serde_json::Value>, String> {
    let state = state.lock().await;
    let client = reqwest::Client::new();
    
    let response = client
        .get(format!("{}/api/cache/list", state.node_server_url))
        .send()
        .await
        .map_err(|e| format!("获取缓存列表失败：{}", e))?;
    
    let result: Vec<serde_json::Value> = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败：{}", e))?;
    
    Ok(result)
}

#[tauri::command]
pub async fn delete_cache(
    keyword: String,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<(), String> {
    let state = state.lock().await;
    let client = reqwest::Client::new();
    
    client
        .delete(format!("{}/api/cache/{}", state.node_server_url, keyword))
        .send()
        .await
        .map_err(|e| format!("删除缓存失败：{}", e))?;
    
    Ok(())
}

// ==================== 对比 ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct CompareRequest {
    pub keyword: String,
    pub local_path: Option<String>,
}

#[tauri::command]
pub async fn compare_comics(
    keyword: String,
    local_path: Option<String>,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<serde_json::Value, String> {
    let state = state.lock().await;
    let client = reqwest::Client::new();
    
    let response = client
        .post(format!("{}/api/compare", state.node_server_url))
        .json(&serde_json::json!({
            "keyword": keyword,
            "localPath": local_path,
        }))
        .send()
        .await
        .map_err(|e| format!("对比失败：{}", e))?;
    
    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败：{}", e))?;
    
    Ok(result)
}

// ==================== 下载 ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadRequest {
    pub comics: Vec<serde_json::Value>,
    pub storage_path: String,
}

#[tauri::command]
pub async fn download_comics(
    comics: Vec<serde_json::Value>,
    storage_path: String,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<serde_json::Value, String> {
    let state = state.lock().await;
    let client = reqwest::Client::new();
    
    let response = client
        .post(format!("{}/api/download", state.node_server_url))
        .json(&serde_json::json!({
            "comics": comics,
            "storagePath": storage_path,
        }))
        .send()
        .await
        .map_err(|e| format!("下载失败：{}", e))?;
    
    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败：{}", e))?;
    
    Ok(result)
}

#[tauri::command]
pub async fn cancel_download(
    aid: String,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<(), String> {
    let state = state.lock().await;
    let client = reqwest::Client::new();
    
    client
        .post(format!("{}/api/download/cancel", state.node_server_url))
        .json(&serde_json::json!({
            "aid": aid,
        }))
        .send()
        .await
        .map_err(|e| format!("取消下载失败：{}", e))?;
    
    Ok(())
}

// ==================== 配置 ====================

#[tauri::command]
pub async fn get_config(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<serde_json::Value, String> {
    let state = state.lock().await;
    let client = reqwest::Client::new();
    
    let response = client
        .get(format!("{}/api/config", state.node_server_url))
        .send()
        .await
        .map_err(|e| format!("获取配置失败：{}", e))?;
    
    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败：{}", e))?;
    
    Ok(result)
}

#[tauri::command]
pub async fn set_config(
    key: String,
    value: serde_json::Value,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<(), String> {
    let state = state.lock().await;
    let client = reqwest::Client::new();
    
    client
        .post(format!("{}/api/config", state.node_server_url))
        .json(&serde_json::json!({
            "key": key,
            "value": value,
        }))
        .send()
        .await
        .map_err(|e| format!("设置配置失败：{}", e))?;
    
    Ok(())
}

// ==================== 目录选择 ====================

#[tauri::command]
pub async fn select_directory(
    window: tauri::Window,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let (tx, rx) = std::sync::mpsc::channel();
    
    window.dialog().file().pick_folder(move |folder| {
        let path = folder.and_then(|f| f.as_path().map(|p| p.to_string_lossy().to_string()));
        let _ = tx.send(path);
    });
    
    match rx.recv() {
        Ok(opt) => Ok(opt),
        Err(_) => Ok(None),
    }
}
