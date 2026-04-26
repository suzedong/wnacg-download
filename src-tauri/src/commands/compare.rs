// 对比命令

use crate::config;
use crate::core::ai::AiMatcher;
use crate::core::comparer::Comparer;
use crate::types::compare::CompareResult;
use crate::types::comic::Comic;
use std::fs;
use tauri::command;

#[command]
pub async fn compare_comics(
    app: tauri::AppHandle,
    search_file: String,
    local_path: String,
) -> Result<CompareResult, String> {
    println!("📊 收到对比请求");

    // 读取搜索结果
    let comics: Vec<Comic> = read_search_results(&search_file)?;

    // 加载配置
    let config = config::load_config().map_err(|e| e.to_string())?;

    // 创建 AI 匹配器
    let ai_matcher = AiMatcher::new(
        config.ai_api_url,
        config.ai_api_key,
        config.match_threshold,
        config.proxy,
        config.proxy_enabled,
    )
    .map_err(|e| e.to_string())?;

    // 创建对比器
    let comparer = Comparer::new(ai_matcher);

    // 执行对比
    let result = comparer
        .compare(&app, comics, local_path)
        .await
        .map_err(|e| e.to_string())?;

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
