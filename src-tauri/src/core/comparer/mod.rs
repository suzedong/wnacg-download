// 对比器模块

use crate::core::ai::AiMatcher;
use crate::core::scanner::Scanner;
use crate::error::AppError;
use crate::events::{self, CompareProgressEvent};
use crate::types::compare::CompareResult;
use crate::types::comic::Comic;
use tauri::Emitter;

/// 对比器
pub struct Comparer {
    ai_matcher: AiMatcher,
}

impl Comparer {
    /// 创建新的对比器
    pub fn new(ai_matcher: AiMatcher) -> Self {
        Self { ai_matcher }
    }

    /// 执行对比
    pub async fn compare(
        &self,
        app: &tauri::AppHandle,
        website_comics: Vec<Comic>,
        local_path: String,
    ) -> Result<CompareResult, AppError> {
        println!(
            "📊 开始对比：网站 {} 部，本地路径：{}",
            website_comics.len(),
            local_path
        );

        // 扫描本地漫画
        let local_comics = Scanner::scan_local(&local_path).await?;
        println!("✅ 本地扫描完成，找到 {} 部漫画", local_comics.len());

        // 发送对比进度
        events::emit_compare_progress(
            app,
            CompareProgressEvent {
                current: 0,
                total: website_comics.len() as u32,
            },
        );

        // AI 匹配
        let match_details = self
            .ai_matcher
            .match_comics(&website_comics, &local_comics)
            .await?;

        // 统计结果
        let website_count = website_comics.len() as u32;
        let local_count = local_comics.len() as u32;
        let already_have = match_details
            .iter()
            .filter(|d| d.match_type == "already_have")
            .count() as u32;
        let to_download = match_details
            .iter()
            .filter(|d| d.match_type == "need_download")
            .count() as u32;

        let result = CompareResult {
            website_comics: website_count,
            local_comics: local_count,
            to_download,
            already_have,
            match_details,
        };

        println!(
            "✅ 对比完成：需要下载 {} 部，已拥有 {} 部",
            result.to_download, result.already_have
        );

        // 发送完成事件
        events::emit_compare_progress(
            app,
            CompareProgressEvent {
                current: website_count,
                total: website_count,
            },
        );

        Ok(result)
    }
}
