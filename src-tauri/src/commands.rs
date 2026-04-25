use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::process::Child;

// 应用状态管理
pub struct AppState {
    pub node_server_url: String,
    #[allow(dead_code)]
    pub node_process: Arc<Mutex<Option<Child>>>,
}

// ==================== 搜索 ====================

#[allow(dead_code)]
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
    // 禁用代理，直接连接本地服务
    let client = reqwest::Client::builder()
        .no_proxy()
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败：{}", e))?;
    
    let response = client
        .post(format!("{}/api/search", state.node_server_url))
        .json(&serde_json::json!({
            "keyword": keyword,
            "force": true,
        }))
        .send()
        .await
        .map_err(|e| format!("搜索失败：{}", e))?;
    
    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败：{}", e))?;
    
    if result["success"].as_bool().unwrap_or(false) {
        Ok(result["comics"].as_array().unwrap_or(&vec![]).clone())
    } else {
        Err(result["error"].as_str().unwrap_or("搜索失败").to_string())
    }
}

#[tauri::command]
pub async fn get_cache_list(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<Vec<serde_json::Value>, String> {
    let state = state.lock().await;
    // 禁用代理，直接连接本地服务
    let client = reqwest::Client::builder()
        .no_proxy()
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败：{}", e))?;
    
    let url = format!("{}/api/cache", state.node_server_url);
    println!("📡 请求缓存列表：{}", url);
    
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("获取缓存列表失败：{}", e))?;
    
    let status = response.status();
    let content_type = response.headers().get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();
    
    println!("📦 响应状态：{}, Content-Type: {}", status, content_type);
    
    // 检查是否是 JSON
    if !content_type.contains("application/json") {
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API 返回非 JSON 响应 ({}): {}", content_type, &text[..text.len().min(200)]));
    }
    
    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败：{}", e))?;
    
    println!("✅ 解析成功：{}", result);
    
    // API 返回格式：{ success: true, files: [...] }
    if result["success"].as_bool().unwrap_or(false) {
        // 转换为前端期望的格式
        let empty_vec = vec![];
        let files = result["files"].as_array().unwrap_or(&empty_vec);
        let mut formatted = vec![];
        for file in files {
            formatted.push(serde_json::json!({
                "keyword": file["keyword"],
                "searchTime": file["searchTime"],
                "fileSize": file["fileSize"],
                "totalComics": file["comicCount"],
            }));
        }
        Ok(formatted)
    } else {
        Err(result["error"].as_str().unwrap_or("获取列表失败").to_string())
    }
}

#[tauri::command]
pub async fn get_cached_comics(
    keyword: String,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<Vec<serde_json::Value>, String> {
    let state = state.lock().await;
    // 禁用代理，直接连接本地服务
    let client = reqwest::Client::builder()
        .no_proxy()
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败：{}", e))?;
    
    // 读取缓存的漫画数据
    let url = format!("{}/api/cache/comics/{}", state.node_server_url, keyword);
    println!("📡 请求缓存漫画：{}", url);
    
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("获取缓存漫画失败：{}", e))?;
    
    let content_type = response.headers().get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();
    
    if !content_type.contains("application/json") {
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API 返回非 JSON 响应 ({}): {}", content_type, &text[..text.len().min(200)]));
    }
    
    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败：{}", e))?;
    
    if result["success"].as_bool().unwrap_or(false) {
        Ok(result["comics"].as_array().unwrap_or(&vec![]).clone())
    } else {
        Err(result["error"].as_str().unwrap_or("获取缓存漫画失败").to_string())
    }
}

#[tauri::command]
pub async fn delete_cache(
    keyword: String,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<(), String> {
    let state = state.lock().await;
    // 禁用代理，直接连接本地服务
    let client = reqwest::Client::builder()
        .no_proxy()
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败：{}", e))?;
    
    let response = client
        .delete(format!("{}/api/cache/{}", state.node_server_url, keyword))
        .send()
        .await
        .map_err(|e| format!("删除缓存失败：{}", e))?;
    
    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败：{}", e))?;
    
    if result["success"].as_bool().unwrap_or(false) {
        Ok(())
    } else {
        Err(result["error"].as_str().unwrap_or("删除失败").to_string())
    }
}

// ==================== 对比 ====================

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
pub struct CompareRequest {
    pub keyword: String,
    #[serde(rename = "localPath")]
    pub local_path: String,
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

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadRequest {
    pub comics: Vec<serde_json::Value>,
    #[serde(rename = "storagePath")]
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
