// 搜索命令 - 使用 Playwright 浏览器进行搜索

use crate::types::comic::Comic;
use crate::types::search::{SearchOptions, SearchResult};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::thread;
use tauri::Emitter;
use tauri::command;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PlaywrightResult {
    success: bool,
    comics: Vec<Comic>,
    total_pages: u32,
    page: u32,
    error: Option<String>,
}

/// TauriCommand：搜索漫画
#[command]
pub async fn search_comics(
    app: tauri::AppHandle,
    keyword: String,
    options: SearchOptions,
) -> Result<SearchResult, String> {
    println!("🔍 收到搜索请求：{}", keyword);

    // 获取脚本路径
    let script_path = std::env::current_dir()
        .map_err(|e| format!("获取当前目录失败：{}", e))?
        .parent()
        .ok_or("无法获取项目目录")?
        .join("scripts")
        .join("search_with_playwright.js");

    println!("🌐 使用 Playwright 搜索...");

    // 步骤 1：打开第一页，获取总页数
    println!("📄 步骤 1：打开第一页...");
    let first_result = run_playwright_script(&script_path, &keyword, 1)?;
    let total_pages = first_result.total_pages;
    let mut all_comics = first_result.comics;

    println!("📄 总页数：{}", total_pages);
    println!("📊 第 1 页找到 {} 部漫画", all_comics.len());

    // 计算实际爬取页数
    let max_pages = if options.max_pages == 0 {
        total_pages
    } else {
        std::cmp::min(options.max_pages, total_pages)
    };

    // 步骤 2：并行打开所有剩余页面
    if max_pages > 1 {
        println!("📄 步骤 2：并行爬取剩余 {} 页...", max_pages - 1);

        let pages: Vec<u32> = (2..=max_pages).collect();
        let mut handles = vec![];

        // 并行发起所有页面请求
        for &page in &pages {
            let script = script_path.clone();
            let kw = keyword.clone();

            let handle = thread::spawn(move || {
                run_playwright_script(&script, &kw, page)
            });

            handles.push((page, handle));
        }

        // 收集所有结果
        for (page, handle) in handles {
            match handle.join() {
                Ok(result) => match result {
                    Ok(data) => {
                        all_comics.extend(data.comics);
                    }
                    Err(e) => {
                        eprintln!("⚠️ 第 {} 页爬取失败：{}", page, e);
                    }
                },
                Err(_) => {
                    eprintln!("⚠️ 第 {} 页线程执行失败", page);
                }
            }
        }
    }

    // 步骤 3：去重
    println!("📊 共找到 {} 部漫画（去重前）", all_comics.len());
    println!("📄 步骤 3：去重...");
    let mut seen_aids = HashSet::new();
    let mut unique_comics: Vec<Comic> = Vec::new();

    for comic in all_comics.drain(..) {
        if seen_aids.insert(comic.aid.clone()) {
            unique_comics.push(comic);
        }
    }

    println!("📊 去重后共 {} 部漫画", unique_comics.len());

    // 步骤 4：过滤中文版（如果启用）
    if options.search_chinese_only {
        unique_comics.retain(|c| {
            !c.category.contains("中文") && !c.category.contains("chinese")
        });
        println!("🇨🇳 过滤后剩余 {} 部汉化漫画", unique_comics.len());
    }

    // 步骤 5：保存结果到文件
    println!("📄 步骤 4：保存结果...");
    let file_path = save_results(&keyword, &unique_comics)?;

    // 发送完成事件
    let _ = app.emit("search_complete", &unique_comics);

    // 构建搜索结果
    let result = SearchResult {
        keyword: keyword.clone(),
        search_time: chrono::Local::now().format("%Y-%m-%d %H:%M").to_string(),
        comics: unique_comics,
        file_path,
    };

    println!("✅ 搜索完成，找到 {} 部漫画，已保存到 {}", result.comics.len(), result.file_path);

    Ok(result)
}

/// 运行 Playwright 脚本
fn run_playwright_script(
    script_path: &Path,
    keyword: &str,
    page: u32,
) -> Result<PlaywrightResult, String> {
    let output = Command::new("node")
        .arg(script_path)
        .arg(keyword)
        .arg(page.to_string())
        .output()
        .map_err(|e| format!("执行脚本失败：{}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if !stderr.is_empty() {
        print!("{}", stderr);
    }

    let result: PlaywrightResult = serde_json::from_str(&stdout)
        .map_err(|e| format!("解析结果失败：{}\n输出：{}", e, stdout))?;

    if !result.success {
        return Err(result.error.unwrap_or_else(|| "搜索失败".to_string()));
    }

    Ok(result)
}

/// 保存搜索结果到文件
fn save_results(keyword: &str, comics: &[Comic]) -> Result<String, String> {
    // 使用程序目录下的 cache 目录
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
    
    let cache_dir = exe_dir.join("cache");
    if !cache_dir.exists() {
        fs::create_dir_all(&cache_dir).map_err(|e| format!("创建缓存目录失败：{}", e))?;
    }

    // 构建文件名
    let file_name = format!("search_{}.json", keyword.replace(' ', "_"));
    let file_path = cache_dir.join(&file_name);

    // 序列化并保存
    let json = serde_json::to_string_pretty(comics).map_err(|e| format!("序列化失败：{}", e))?;
    fs::write(&file_path, json).map_err(|e| format!("保存文件失败：{}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}
