// 对比命令

use crate::config;
use crate::core::ai::AiMatcher;
use crate::core::comparer::Comparer;
use crate::types::compare::CompareResult;
use crate::types::config::CompareHistoryEntry;
use crate::types::comic::Comic;
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::process::Command;
use tauri::command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadInfo {
    pub success: bool,
    pub file_key: String,
    pub file_name: String,
    pub server2_url: String,
    pub error: Option<String>,
}

/// 通过 Playwright 获取下载信息
#[command]
pub async fn get_download_info(aid: String) -> Result<DownloadInfo, String> {
    println!("📄 获取下载页信息：aid={}", aid);

    // 获取脚本路径
    let current = std::env::current_dir()
        .map_err(|e| format!("获取当前目录失败：{}", e))?;
    let mut project_root = current.clone();
    for _ in 0..10 {
        if project_root.join("package.json").exists() {
            break;
        }
        if let Some(parent) = project_root.parent() {
            project_root = parent.to_path_buf();
        } else {
            break;
        }
    }
    let script_path = project_root.join("scripts").join("get_download_info.js");

    let output = Command::new("node")
        .arg(&script_path)
        .arg(&aid)
        .output()
        .map_err(|e| format!("执行脚本失败：{}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if !stderr.is_empty() {
        eprintln!("{}", stderr);
    }

    let info: DownloadInfo = serde_json::from_str(&stdout)
        .map_err(|e| format!("解析结果失败：{}\n输出：{}", e, stdout))?;

    if !info.success {
        return Err(info.error.unwrap_or_else(|| "获取下载信息失败".to_string()));
    }

    Ok(info)
}

#[command]
pub async fn compare_comics(
    app: tauri::AppHandle,
    search_file: String,
    local_path: String,
) -> Result<CompareResult, String> {
    println!("📊 收到对比请求");

    // 读取搜索结果
    let comics: Vec<Comic> = read_search_results(&search_file)?;

    // 提取关键字
    let keyword = extract_keyword_from_search_file(&search_file).unwrap_or_else(|_| "未知".to_string());

    // 加载配置
    let config = config::load_config().map_err(|e| e.to_string())?;

    // 创建 AI 匹配器
    let ai_matcher = AiMatcher::new(
        config.ai_api_url,
        config.ai_api_key,
        config.ai_model,
        config.ai_prompt,
        config.ai_temperature,
        config.match_threshold,
        config.proxy,
        config.proxy_enabled,
    )
    .map_err(|e| e.to_string())?;

    // 创建对比器
    let comparer = Comparer::new(ai_matcher);

    // 执行对比
    let result = comparer
        .compare(&app, comics, local_path.clone())
        .await
        .map_err(|e| e.to_string())?;

    // 自动保存对比结果
    match save_compare_result_sync(&keyword, &local_path, &result) {
        Ok(path) => println!("📁 对比结果已保存：{}", path),
        Err(e) => eprintln!("⚠️ 保存对比结果失败：{}", e),
    }

    Ok(result)
}

/// 读取搜索结果文件
fn read_search_results(file_path: &str) -> Result<Vec<Comic>, String> {
    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("读取搜索文件失败：{}", e))?;

    let comics: Vec<Comic> =
        serde_json::from_str(&content).map_err(|e| format!("解析搜索文件失败：{}", e))?;

    Ok(comics)
}

/// 从搜索文件路径中提取关键字
fn extract_keyword_from_search_file(path: &str) -> Result<String, String> {
    let file_name = std::path::Path::new(path)
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("无法从搜索文件路径中提取文件名")?;

    file_name
        .strip_prefix("search_")
        .and_then(|s| s.strip_suffix(".json"))
        .map(|s| s.replace('_', " "))
        .ok_or("搜索文件格式不正确".to_string())
}

/// 获取缓存目录
fn get_cache_dir() -> Result<std::path::PathBuf, String> {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
    let cache_dir = exe_dir.join("cache");
    if !cache_dir.exists() {
        fs::create_dir_all(&cache_dir)
            .map_err(|e| format!("创建缓存目录失败：{}", e))?;
    }
    Ok(cache_dir)
}

/// 内部同步保存对比结果（非 Tauri 命令）
fn save_compare_result_sync(
    keyword: &str,
    local_path: &str,
    result: &CompareResult,
) -> Result<String, String> {
    let cache_dir = get_cache_dir()?;

    let timestamp = Local::now().format("%Y%m%d_%H%M%S");
    let file_name = format!(
        "compare_{}_{}.json",
        keyword.replace(' ', "_"),
        timestamp
    );
    let file_path = cache_dir.join(&file_name);

    let entry = CompareHistoryEntry {
        keyword: keyword.to_string(),
        local_path: local_path.to_string(),
        compared_at: Local::now().to_rfc3339(),
        result: result.clone(),
    };

    let json =
        serde_json::to_string_pretty(&entry).map_err(|e| format!("序列化失败：{}", e))?;
    fs::write(&file_path, json).map_err(|e| format!("保存文件失败：{}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

/// 保存对比结果（Tauri 命令）
#[command]
pub fn save_compare_result(
    keyword: String,
    local_path: String,
    result: CompareResult,
) -> Result<String, String> {
    save_compare_result_sync(&keyword, &local_path, &result)
}

/// 加载对比结果（Tauri 命令）
#[command]
pub fn load_compare_result(file_path: String) -> Result<CompareHistoryEntry, String> {
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("读取对比结果文件失败：{}", e))?;

    let entry: CompareHistoryEntry = serde_json::from_str(&content)
        .map_err(|e| format!("解析对比结果文件失败：{}", e))?;

    Ok(entry)
}
