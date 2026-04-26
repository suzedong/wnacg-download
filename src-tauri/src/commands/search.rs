// 搜索命令

use crate::core::scraper::Scraper;
use crate::types::search::{SearchOptions, SearchResult};
use tauri::command;

#[command]
pub async fn search_comics(
    app: tauri::AppHandle,
    keyword: String,
    options: SearchOptions,
) -> Result<SearchResult, String> {
    println!("🔍 收到搜索请求：{}", keyword);

    // 创建爬虫
    let scraper = Scraper::new(options).map_err(|e| e.to_string())?;

    // 执行搜索
    let result = scraper
        .search(&app, keyword)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result)
}
