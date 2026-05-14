// AI 匹配模块

use crate::error::AppError;
use crate::events::AiProgressEvent;
use crate::types::compare::{AiMatchResult, MatchDetail};
use crate::types::comic::{Comic, LocalComic};
use futures_util::stream::StreamExt;
use regex::Regex;
use reqwest::Client;
use serde_json::json;
use std::collections::HashMap;
use std::time::Duration;

/// 每批处理的漫画数量
const BATCH_SIZE: usize = 20;
/// AI 响应最大 token 数
const MAX_TOKENS: u32 = 8000;

/// AI 匹配器
pub struct AiMatcher {
    client: Client,
    api_url: String,
    api_key: Option<String>,
    model: String,
    prompt_template: String,
    temperature: f64,
    #[allow(dead_code)]
    match_threshold: f64,
}

impl AiMatcher {
    /// 创建新的 AI 匹配器
    #[allow(dead_code)]
    pub fn new(
        api_url: String,
        api_key: Option<String>,
        model: String,
        prompt_template: String,
        temperature: f64,
        match_threshold: f64,
        proxy: Option<String>,
        proxy_enabled: bool,
    ) -> Result<Self, AppError> {
        let mut client_builder = Client::builder()
            .timeout(Duration::from_secs(300))
            .user_agent("WNACG-Downloader/4.0");

        // 配置代理
        if proxy_enabled && proxy.is_some() {
            let proxy_url = proxy.as_ref().unwrap();
            let proxy_obj = reqwest::Proxy::all(proxy_url)?;
            client_builder = client_builder.proxy(proxy_obj);
        }

        let client = client_builder.build()?;

        Ok(Self {
            client,
            api_url,
            api_key,
            model,
            prompt_template,
            temperature,
            match_threshold,
        })
    }

    /// 批量匹配漫画（本地优先 + AI 兜底）
    pub async fn match_comics(
        &self,
        app: &tauri::AppHandle,
        website_comics: &[Comic],
        local_comics: &[LocalComic],
    ) -> Result<AiMatchResult, AppError> {
        println!(" 开始对比：网站 {} 部，本地 {} 部", website_comics.len(), local_comics.len());

        let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
            message: " 正在准备对比...".to_string(),
            received_bytes: 0,
            streaming_content: None,
        });

        // 如果本地漫画为空，所有网站漫画都标记为需要下载
        if local_comics.is_empty() {
            println!("️ 本地漫画为空，跳过对比，所有漫画标记为需要下载");
            let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
                message: "️ 本地无漫画，跳过匹配".to_string(),
                received_bytes: 0,
            streaming_content: None,
            });
            let details: Vec<MatchDetail> = website_comics
                .iter()
                .map(|comic| MatchDetail {
                    website: comic.clone(),
                    local: None,
                    match_type: "need_download".to_string(),
                    confidence: 0.0,
                    reason: "本地无漫画".to_string(),
                    algorithm: "本地".to_string(),
                })
                .collect();
            return Ok(AiMatchResult { details, ai_response: None });
        }

        // Phase 1: 本地精确/模糊匹配
        let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
            message: " 本地精确匹配中...".to_string(),
            received_bytes: 0,
            streaming_content: None,
        });

        let local_result = self.local_match(app, website_comics, local_comics)?;

        // 分割结果：已匹配 vs 未匹配
        let local_already_have: Vec<MatchDetail> = local_result.details.iter()
            .filter(|d| d.match_type == "already_have")
            .cloned()
            .collect();

        let unmatched_details: Vec<MatchDetail> = local_result.details.iter()
            .filter(|d| d.match_type == "need_download")
            .cloned()
            .collect();

        let already_have_count = local_already_have.len();
        let total = website_comics.len();
        let unmatched_count = unmatched_details.len();

        let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
            message: format!(" 本地匹配完成：{}/{} 已匹配，{} 部待 AI 确认", already_have_count, total, unmatched_count),
            received_bytes: already_have_count,
            streaming_content: None,
        });

        // Phase 2: AI 兜底未匹配的漫画
        let mut final_details = local_already_have;
        let mut ai_response: Option<String> = None;

        if !self.api_url.is_empty() && !unmatched_details.is_empty() {
            let unmatched_website: Vec<Comic> = unmatched_details.iter()
                .map(|d| d.website.clone())
                .collect();

            println!(" AI 兜底匹配剩余 {} 部漫画", unmatched_count);
            let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
                message: format!(" AI 匹配剩余 {} 部漫画...", unmatched_count),
                received_bytes: 0,
                streaming_content: None,
            });

            let ai_result = self.match_comics_for_subset(app, &unmatched_website, local_comics).await?;
            final_details.extend(ai_result.details);
            ai_response = ai_result.ai_response;
        } else if self.api_url.is_empty() {
            println!(" AI API 未配置，仅使用本地匹配结果");
            final_details.extend(unmatched_details);
        } else {
            println!(" 所有漫画均已本地匹配，无需 AI 兜底");
            let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
                message: " 所有漫画均已匹配，无需 AI 兜底".to_string(),
                received_bytes: 0,
                streaming_content: None,
            });
        }

        println!(" 对比完成，共 {} 条结果", final_details.len());
        let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
            message: format!(" 对比完成，共 {} 条结果", final_details.len()),
            received_bytes: 0,
            streaming_content: None,
        });

        Ok(AiMatchResult {
            details: final_details,
            ai_response,
        })
    }

    /// 匹配一批漫画
    async fn match_batch(
        &self,
        app: &tauri::AppHandle,
        website_batch: &[Comic],
        local_comics: &[LocalComic],
    ) -> Result<AiMatchResult, AppError> {
        let prompt = self.build_prompt(website_batch, local_comics);
        let (response_text, ai_response) = self.call_ai_api(app, &prompt).await?;
        let details = self.parse_ai_response(&response_text, website_batch, local_comics)?;
        Ok(AiMatchResult { details, ai_response: Some(ai_response) })
    }

    /// 仅对未匹配的漫画子集调用 AI 匹配
    async fn match_comics_for_subset(
        &self,
        app: &tauri::AppHandle,
        unmatched_website: &[Comic],
        local_comics: &[LocalComic],
    ) -> Result<AiMatchResult, AppError> {
        let total = unmatched_website.len();
        let batch_count = total.div_ceil(BATCH_SIZE);
        let mut all_details = vec![];
        let mut ai_responses = vec![];

        for (i, batch) in unmatched_website.chunks(BATCH_SIZE).enumerate() {
            let batch_num = i + 1;
            println!(" 处理第 {}/{} 批（{} 部）", batch_num, batch_count, batch.len());
            let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
                message: format!(" 第 {}/{} 批：对比 {} 部漫画", batch_num, batch_count, batch.len()),
                received_bytes: batch_num * 100,
                streaming_content: None,
            });

            let result = self.match_batch(app, batch, local_comics).await?;
            all_details.extend(result.details);
            if let Some(resp) = result.ai_response {
                ai_responses.push(resp);
            }
        }

        Ok(AiMatchResult {
            details: all_details,
            ai_response: if ai_responses.is_empty() {
                None
            } else {
                Some(ai_responses.join("\n---\n"))
            },
        })
    }

    /// 构建 AI Prompt
    fn build_prompt(&self, website_comics: &[Comic], local_comics: &[LocalComic]) -> String {
        let website_list: Vec<String> = website_comics.iter().map(|c| c.title.clone()).collect();
        let local_list: Vec<String> = local_comics.iter().map(|c| c.title.clone()).collect();

        self.prompt_template
            .replace("{website_comics}", &website_list.join("\n"))
            .replace("{local_comics}", &local_list.join("\n"))
    }

    /// 调用 AI API，返回 (解析后的文本, 原始AI响应)
    async fn call_ai_api(&self, app: &tauri::AppHandle, prompt: &str) -> Result<(String, String), AppError> {
        // 自动补全 API 地址
        let api_url = if self.api_url.ends_with("/v1") {
            format!("{}/chat/completions", self.api_url)
        } else if !self.api_url.contains("/chat/completions") {
            format!("{}/chat/completions", self.api_url.trim_end_matches('/'))
        } else {
            self.api_url.clone()
        };

        println!(" 调用 AI API：{}", api_url);
        let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
            message: " 调用 AI API...".to_string(),
            received_bytes: 0,
            streaming_content: None,
        });

        let mut request = self
            .client
            .post(&api_url)
            .header("Content-Type", "application/json");

        if let Some(key) = &self.api_key {
            request = request.bearer_auth(key);
        }

        let body = json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": "你是一个专业的漫画匹配助手。"},
                {"role": "user", "content": prompt}
            ],
            "temperature": self.temperature,
            "max_tokens": MAX_TOKENS,
            "stream": true
        });

        let response = request.json(&body).send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::AiError(format!("AI API 请求失败：{} - {}", status, error_text)));
        }

        let stream_result = self.read_stream_response(response, app).await;

        match stream_result {
            Ok(ai_response) => {
                if ai_response.is_empty() {
                    return Err(AppError::AiError("AI API 返回空响应".to_string()));
                }
                return Ok((ai_response.clone(), ai_response));
            }
            Err(e) => {
                println!(" 流式响应读取失败：{}，将尝试非流式请求", e);
                let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
                    message: format!(" 流式响应异常，尝试非流式请求...").to_string(),
                    received_bytes: 0,
            streaming_content: None,
                });
            }
        }

        // 重新发送非流式请求
        let mut request = self
            .client
            .post(&api_url)
            .header("Content-Type", "application/json");

        if let Some(key) = &self.api_key {
            request = request.bearer_auth(key);
        }

        let body = json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": "你是一个专业的漫画匹配助手。"},
                {"role": "user", "content": prompt}
            ],
            "temperature": self.temperature,
            "max_tokens": MAX_TOKENS
        });

        let response = request.json(&body).send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::AiError(format!("AI API 请求失败：{} - {}", status, error_text)));
        }

        let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
            message: " 正在获取 AI 响应...".to_string(),
            received_bytes: 0,
            streaming_content: None,
        });

        let text = response.text().await.map_err(|e| {
            AppError::AiError(format!("读取响应失败：{}", e))
        })?;

        let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
            message: " 收到 AI 响应".to_string(),
            received_bytes: text.len(),
            streaming_content: None,
        });

        if text.is_empty() {
            return Err(AppError::AiError("AI API 返回空响应".to_string()));
        }

        Ok((text.clone(), text))
    }

    /// 读取流式响应
    async fn read_stream_response(&self, response: reqwest::Response, app: &tauri::AppHandle) -> Result<String, AppError> {
        let mut full_response = String::new();
        let mut received_bytes = 0;

        let stream = response.bytes_stream();

        tokio::pin!(stream);

        while let Some(chunk) = stream.next().await {
            let chunk = match chunk {
                Ok(c) => c,
                Err(e) => {
                    println!(" 读取流式 chunk 失败：{}", e);
                    continue;
                }
            };

            let chunk_str = String::from_utf8_lossy(&chunk);
            let lines: Vec<&str> = chunk_str.split("\n").collect();

            for line in lines {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }

                if trimmed.starts_with("data: ") {
                    let json_str = trimmed.strip_prefix("data: ").unwrap_or(trimmed);

                    if json_str == "[DONE]" {
                        break;
                    }

                    let json: serde_json::Value = match serde_json::from_str(json_str) {
                        Ok(j) => j,
                        Err(e) => {
                            println!(" 解析 SSE 行失败：{} - {}", e, json_str);
                            continue;
                        }
                    };

                    if let Some(choices) = json.get("choices") {
                        if let Some(first) = choices.as_array().and_then(|a| a.first()) {
                            if let Some(delta) = first.get("delta") {
                                if let Some(content) = delta.get("content") {
                                    let content_str = content.as_str().unwrap_or("");
                                    full_response.push_str(content_str);
                                    received_bytes += content_str.len();

                                    if received_bytes % 100 < content_str.len() {
                                        println!(" AI 响应中... ({})", received_bytes);

                                        let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
                                            message: format!(" AI 响应中... {} 字符", received_bytes),
                                            received_bytes,
                                            streaming_content: Some(content_str.to_string()),
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        println!(" AI 响应完成，共 {} 字符", full_response.len());

        let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
            message: format!(" AI 响应完成，共 {} 字符", full_response.len()),
            received_bytes: full_response.len(),
            streaming_content: None,
        });

        Ok(full_response)
    }

    /// 解析 AI 响应
    fn parse_ai_response(
        &self,
        response: &str,
        website_comics: &[Comic],
        local_comics: &[LocalComic],
    ) -> Result<Vec<MatchDetail>, AppError> {
        let json_str = Self::extract_json(response)?;

        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&json_str) {
            return self.parse_json_value(json, website_comics, local_comics);
        }

        println!(" JSON 解析不完整，尝试修复...");
        if let Some(fixed_json) = Self::fix_incomplete_json(&json_str) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&fixed_json) {
                return self.parse_json_value(json, website_comics, local_comics);
            }
        }

        println!(" JSON 解析失败，尝试从文本中提取匹配信息...");
        let details = Self::extract_matches_from_text(response, website_comics, local_comics);

        if !details.is_empty() {
            println!(" 从文本中提取到 {} 条匹配", details.len());
            return Ok(details);
        }

        Err(AppError::AiError("无法解析 AI 响应".to_string()))
    }

    /// 解析 JSON 值
    fn parse_json_value(
        &self,
        json: serde_json::Value,
        website_comics: &[Comic],
        local_comics: &[LocalComic],
    ) -> Result<Vec<MatchDetail>, AppError> {
        let local_map: HashMap<String, &LocalComic> = local_comics
            .iter()
            .map(|c| (c.title.clone(), c))
            .collect();

        let mut details = vec![];

        if let Some(matches) = json.get("matches").and_then(|m| m.as_array()) {
            for match_item in matches {
                let website_title = match_item
                    .get("website_title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");

                let local_title = match_item
                    .get("local_title")
                    .and_then(|v| v.as_str());

                let match_type = match_item
                    .get("match_type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("need_download");

                let confidence = match_item
                    .get("confidence")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0);

                let reason = match_item
                    .get("reason")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                if let Some(website) = website_comics.iter().find(|c| c.title == website_title) {
                    let local = local_title
                        .and_then(|t| local_map.get(t))
                        .map(|c| (*c).clone());

                    details.push(MatchDetail {
                        website: website.clone(),
                        local,
                        match_type: match_type.to_string(),
                        confidence,
                        reason,
                        algorithm: "AI".to_string(),
                    });
                }
            }
        }

        let matched_titles: Vec<String> = details
            .iter()
            .map(|d| d.website.title.clone())
            .collect();

        for comic in website_comics {
            if !matched_titles.contains(&comic.title) {
                details.push(MatchDetail {
                    website: comic.clone(),
                    local: None,
                    match_type: "need_download".to_string(),
                    confidence: 0.0,
                    reason: "AI 未匹配到本地漫画".to_string(),
                    algorithm: "AI".to_string(),
                });
            }
        }

        Ok(details)
    }

    /// 修复不完整的 JSON
    fn fix_incomplete_json(json_str: &str) -> Option<String> {
        let trimmed = json_str.trim();

        let open_braces = trimmed.matches('{').count();
        let close_braces = trimmed.matches('}').count();
        let open_brackets = trimmed.matches('[').count();
        let close_brackets = trimmed.matches(']').count();

        let mut result = trimmed.to_string();

        for _ in 0..open_brackets.saturating_sub(close_brackets) {
            result.push_str("]");
        }

        for _ in 0..open_braces.saturating_sub(close_braces) {
            result.push('}');
        }

        if serde_json::from_str::<serde_json::Value>(&result).is_ok() {
            return Some(result);
        }

        let last_complete_object = result.rfind("},").or(result.rfind('}'));
        if let Some(pos) = last_complete_object {
            let truncated = &result[..=pos];
            if serde_json::from_str::<serde_json::Value>(truncated).is_ok() {
                let mut fixed = truncated.to_string();
                for _ in 0..open_brackets.saturating_sub(close_brackets) {
                    fixed.push_str("]");
                }
                return Some(fixed);
            }
        }

        None
    }

    /// 从文本中提取匹配信息
    fn extract_matches_from_text(
        response: &str,
        website_comics: &[Comic],
        local_comics: &[LocalComic],
    ) -> Vec<MatchDetail> {
        let mut details = vec![];

        let patterns = [
            r#""website_title"\s*:\s*"([^"]+)""#,
            r#"网站[:：]\s*([^\n，,]+)"#,
        ];

        let mut extracted_website_titles = Vec::new();

        for pattern in &patterns {
            if let Ok(re) = regex::Regex::new(pattern) {
                for cap in re.captures_iter(response) {
                    if let Some(title) = cap.get(1) {
                        let title_str = title.as_str().trim();
                        if !title_str.is_empty() {
                            extracted_website_titles.push(title_str.to_string());
                        }
                    }
                }
            }
        }

        for website_title in extracted_website_titles {
            if let Some(website) = website_comics.iter().find(|c|
                c.title.contains(&website_title) || website_title.contains(&c.title)
            ) {
                let local_title = Self::find_local_title_in_response(response, &website.title, local_comics);

                details.push(MatchDetail {
                    website: website.clone(),
                    local: local_title.clone(),
                    match_type: if local_title.is_some() { "already_have".to_string() } else { "need_download".to_string() },
                    confidence: if local_title.is_some() { 0.85 } else { 0.0 },
                    reason: if local_title.is_some() { "AI 文本匹配".to_string() } else { "无法确定本地匹配".to_string() },
                    algorithm: "AI".to_string(),
                });
            }
        }

        details
    }

    /// 从响应文本中找到关联的本地标题
    fn find_local_title_in_response(
        response: &str,
        _website_title: &str,
        local_comics: &[LocalComic],
    ) -> Option<LocalComic> {
        let local_patterns = [
            r#""local_title"\s*:\s*"([^"]+)""#,
            r#"本地[:：]\s*([^\n，,]+)"#,
        ];

        for pattern in &local_patterns {
            if let Ok(re) = regex::Regex::new(pattern) {
                for cap in re.captures_iter(response) {
                    if let Some(title) = cap.get(1) {
                        let title_str = title.as_str().trim();
                        if let Some(local) = local_comics.iter().find(|c| c.title == title_str) {
                            return Some(local.clone());
                        }
                    }
                }
            }
        }

        None
    }

    /// 从响应中提取 JSON
    fn extract_json(response: &str) -> Result<String, AppError> {
        if response.trim().starts_with('{') {
            return Ok(response.trim().to_string());
        }

        if let Some(start) = response.find("```json") {
            let start = start + 7;
            if let Some(end) = response[start..].find("```") {
                return Ok(response[start..start + end].trim().to_string());
            }
        }

        if let Some(start) = response.find('{') {
            if let Some(end) = response.rfind('}') {
                return Ok(response[start..=end].to_string());
            }
        }

        Err(AppError::AiError("无法从 AI 响应中提取 JSON".to_string()))
    }

    /// 本地相似度匹配（不使用 AI API）
    fn local_match(
        &self,
        app: &tauri::AppHandle,
        website_comics: &[Comic],
        local_comics: &[LocalComic],
    ) -> Result<AiMatchResult, AppError> {
        println!(" 使用本地相似度算法进行匹配");
        let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
            message: " 使用本地相似度算法进行匹配...".to_string(),
            received_bytes: 0,
            streaming_content: None,
        });

        let mut details = vec![];
        let mut matched_local: Vec<String> = vec![];

        for (idx, website) in website_comics.iter().enumerate() {
            let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
                message: format!(" 本地匹配进度：{}/{}", idx + 1, website_comics.len()),
                received_bytes: idx + 1,
            streaming_content: None,
            });

            let mut best_match: Option<&LocalComic> = None;
            let mut best_score = 0.0;

            let clean_website_title = Self::clean_title_prefix(&website.title);

            for local in local_comics {
                if matched_local.contains(&local.title) {
                    continue;
                }

                let clean_local_title = Self::clean_title_prefix(&local.title);

                let score = Self::calculate_similarity(&clean_website_title, &clean_local_title);
                if score > best_score {
                    best_score = score;
                    best_match = Some(local);
                }
            }

            if let Some(local) = best_match {
                if best_score >= self.match_threshold {
                    matched_local.push(local.title.clone());
                    details.push(MatchDetail {
                        website: website.clone(),
                        local: Some(local.clone()),
                        match_type: "already_have".to_string(),
                        confidence: best_score,
                        reason: format!("本地相似度匹配 ({:.0}%)", best_score * 100.0),
                        algorithm: "本地".to_string(),
                    });
                } else {
                    details.push(MatchDetail {
                        website: website.clone(),
                        local: Some(local.clone()),
                        match_type: "need_download".to_string(),
                        confidence: best_score,
                        reason: format!("相似度不足 ({:.0}% < {:.0}%)", best_score * 100.0, self.match_threshold * 100.0),
                        algorithm: "本地".to_string(),
                    });
                }
            } else {
                details.push(MatchDetail {
                    website: website.clone(),
                    local: None,
                    match_type: "need_download".to_string(),
                    confidence: 0.0,
                    reason: "本地无匹配".to_string(),
                    algorithm: "本地".to_string(),
                });
            }
        }

        println!(" 本地匹配完成，共 {} 条结果", details.len());
        let _ = crate::events::emit_ai_progress(app, AiProgressEvent {
            message: format!(" 本地匹配完成，共 {} 条结果", details.len()),
            received_bytes: details.len(),
            streaming_content: None,
        });
        Ok(AiMatchResult { details, ai_response: None })
    }

    /// 计算两个字符串的相似度（基于编辑距离）
    fn calculate_similarity(s1: &str, s2: &str) -> f64 {
        if s1.is_empty() && s2.is_empty() {
            return 1.0;
        }
        if s1.is_empty() || s2.is_empty() {
            return 0.0;
        }

        let s1_lower = s1.to_lowercase();
        let s2_lower = s2.to_lowercase();

        if s1_lower == s2_lower {
            return 1.0;
        }

        if s1_lower.contains(&s2_lower) || s2_lower.contains(&s1_lower) {
            let min_len = s1_lower.len().min(s2_lower.len()) as f64;
            let max_len = s1_lower.len().max(s2_lower.len()) as f64;
            return min_len / max_len * 0.9;
        }

        let distance = Self::levenshtein_distance(&s1_lower, &s2_lower);
        let max_len = s1_lower.len().max(s2_lower.len()) as f64;
        let similarity = 1.0 - (distance as f64 / max_len);

        similarity.max(0.0)
    }

    /// 计算莱文斯坦距离（编辑距离）
    fn levenshtein_distance(s1: &str, s2: &str) -> usize {
        let s1_chars: Vec<char> = s1.chars().collect();
        let s2_chars: Vec<char> = s2.chars().collect();
        let len1 = s1_chars.len();
        let len2 = s2_chars.len();

        let mut matrix = vec![vec![0usize; len2 + 1]; len1 + 1];

        for i in 0..=len1 {
            matrix[i][0] = i;
        }
        for j in 0..=len2 {
            matrix[0][j] = j;
        }

        for i in 1..=len1 {
            for j in 1..=len2 {
                let cost = if s1_chars[i - 1] == s2_chars[j - 1] { 0 } else { 1 };
                matrix[i][j] = (matrix[i - 1][j] + 1)
                    .min(matrix[i][j - 1] + 1)
                    .min(matrix[i - 1][j - 1] + cost);
            }
        }

        matrix[len1][len2]
    }

    /// 清理漫画名前缀：去除 [], (), 【】, 以及它们的组合
    fn clean_title_prefix(title: &str) -> String {
        let re = Regex::new(r"^(?:\s*(?:\[.*?\]|\(.*?\)|【.*?】))*\s*").unwrap();
        re.replace(title, "").trim().to_string()
    }
}
