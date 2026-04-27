// AI 匹配模块

use crate::error::AppError;
use crate::types::compare::MatchDetail;
use crate::types::comic::{Comic, LocalComic};
use regex::Regex;
use reqwest::Client;
use serde_json::json;
use std::collections::HashMap;
use std::time::Duration;

/// AI 匹配器
pub struct AiMatcher {
    client: Client,
    api_url: String,
    api_key: Option<String>,
    #[allow(dead_code)]
    match_threshold: f64,
}

impl AiMatcher {
    /// 创建新的 AI 匹配器
    pub fn new(
        api_url: String,
        api_key: Option<String>,
        match_threshold: f64,
        proxy: Option<String>,
        proxy_enabled: bool,
    ) -> Result<Self, AppError> {
        let mut client_builder = Client::builder()
            .timeout(Duration::from_secs(120))
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
            match_threshold,
        })
    }

    /// 批量匹配漫画
    pub async fn match_comics(
        &self,
        website_comics: &[Comic],
        local_comics: &[LocalComic],
    ) -> Result<Vec<MatchDetail>, AppError> {
        println!("🤖 开始 AI 匹配：网站 {} 部，本地 {} 部", website_comics.len(), local_comics.len());

        // 如果本地漫画为空，所有网站漫画都标记为需要下载
        if local_comics.is_empty() {
            println!("⚠️ 本地漫画为空，跳过 AI 对比，所有漫画标记为需要下载");
            return Ok(website_comics
                .iter()
                .map(|comic| MatchDetail {
                    website: comic.clone(),
                    local: None,
                    match_type: "need_download".to_string(),
                    confidence: 0.0,
                    reason: "本地无漫画".to_string(),
                    algorithm: "本地".to_string(),
                })
                .collect());
        }

        // 检查 AI 配置
        if self.api_url.is_empty() {
            println!("⚠️ AI API 地址未配置，使用本地相似度匹配");
            return self.local_match(website_comics, local_comics).await;
        }

        // 分批处理（避免 API 请求过大）
        let batch_size = 20;
        let mut all_details = vec![];

        for (i, chunk) in website_comics.chunks(batch_size).enumerate() {
            println!("🔄 正在对比第 {}/{} 批...", i + 1, (website_comics.len() + batch_size - 1) / batch_size);
            let details = self
                .match_batch(chunk, local_comics)
                .await?;
            all_details.extend(details);
        }

        println!("✅ AI 匹配完成，共 {} 条结果", all_details.len());

        Ok(all_details)
    }

    /// 匹配一批漫画
    async fn match_batch(
        &self,
        website_batch: &[Comic],
        local_comics: &[LocalComic],
    ) -> Result<Vec<MatchDetail>, AppError> {
        // 构建 AI 请求
        let prompt = self.build_prompt(website_batch, local_comics);

        // 调用 AI API
        let response = self.call_ai_api(&prompt).await?;

        // 解析 AI 响应
        let details = self.parse_ai_response(&response, website_batch, local_comics)?;

        Ok(details)
    }

    /// 构建 AI Prompt
    fn build_prompt(&self, website_comics: &[Comic], local_comics: &[LocalComic]) -> String {
        let website_list = website_comics
            .iter()
            .map(|c| format!("- {} (分类：{})", c.title, c.category))
            .collect::<Vec<_>>()
            .join("\n");

        let local_list = local_comics
            .iter()
            .map(|c| format!("- {}", c.title))
            .collect::<Vec<_>>()
            .join("\n");

        format!(
            r#"你是一个漫画匹配专家。请对比以下两组漫画数据，找出它们之间的匹配关系。

网站漫画列表（需要下载的）：
{}

本地漫画列表（已经下载的）：
{}

匹配规则：
1. 根据漫画名称判断是否是同一部作品
2. 考虑名称的变体、翻译差异、简繁体等
3. 给出每对匹配的置信度（0-1）
4. 如果本地有匹配的，标记为 "already_have"
5. 如果本地没有匹配的，标记为 "need_download"

返回 JSON 格式（只返回 JSON，不要其他内容）：
{{
  "matches": [
    {{
      "website_title": "网站漫画标题",
      "local_title": "本地漫画标题（如果没有则为 null）",
      "match_type": "already_have 或 need_download",
      "confidence": 0.95,
      "reason": "匹配的简要理由"
    }}
  ]
}}"#,
            website_list, local_list
        )
    }

    /// 调用 AI API
    async fn call_ai_api(&self, prompt: &str) -> Result<String, AppError> {
        let mut request = self
            .client
            .post(&self.api_url)
            .header("Content-Type", "application/json");

        // 添加 API Key（如果有）
        if let Some(key) = &self.api_key {
            request = request.bearer_auth(key);
        }

        let body = json!({
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": "你是一个专业的漫画匹配助手。"},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 4000
        });

        let response = request.json(&body).send().await?;
        let json: serde_json::Value = response.json().await?;

        // 提取 AI 回复
        if let Some(choices) = json.get("choices") {
            if let Some(first) = choices.as_array().and_then(|a| a.first()) {
                if let Some(message) = first.get("message") {
                    if let Some(content) = message.get("content") {
                        return Ok(content.as_str().unwrap_or("").to_string());
                    }
                }
            }
        }

        Err(AppError::AiError("AI API 响应格式不正确".to_string()))
    }

    /// 解析 AI 响应
    fn parse_ai_response(
        &self,
        response: &str,
        website_comics: &[Comic],
        local_comics: &[LocalComic],
    ) -> Result<Vec<MatchDetail>, AppError> {
        // 提取 JSON（可能包含在 markdown 代码块中）
        let json_str = Self::extract_json(response)?;

        // 解析 JSON
        let json: serde_json::Value = serde_json::from_str(&json_str)?;

        // 构建本地漫画映射
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

                // 找到对应的网站漫画
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

        // 补充未匹配的漫画
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

    /// 从响应中提取 JSON
    fn extract_json(response: &str) -> Result<String, AppError> {
        // 尝试直接解析
        if response.trim().starts_with('{') {
            return Ok(response.trim().to_string());
        }

        // 尝试从 markdown 代码块中提取
        if let Some(start) = response.find("```json") {
            let start = start + 7;
            if let Some(end) = response[start..].find("```") {
                return Ok(response[start..start + end].trim().to_string());
            }
        }

        // 尝试找到第一个 { 和最后一个 }
        if let Some(start) = response.find('{') {
            if let Some(end) = response.rfind('}') {
                return Ok(response[start..=end].to_string());
            }
        }

        Err(AppError::AiError("无法从 AI 响应中提取 JSON".to_string()))
    }

    /// 本地相似度匹配（不使用 AI API）
    async fn local_match(
        &self,
        website_comics: &[Comic],
        local_comics: &[LocalComic],
    ) -> Result<Vec<MatchDetail>, AppError> {
        println!(" 使用本地相似度算法进行匹配");
        
        let mut details = vec![];
        let mut matched_local: Vec<String> = vec![];

        for website in website_comics {
            let mut best_match: Option<&LocalComic> = None;
            let mut best_score = 0.0;

            // 清理网站漫画标题前缀
            let clean_website_title = Self::clean_title_prefix(&website.title);

            for local in local_comics {
                if matched_local.contains(&local.title) {
                    continue;
                }

                // 清理本地漫画标题前缀
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
                        local: None,
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

        println!("✅ 本地匹配完成，共 {} 条结果", details.len());
        Ok(details)
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

        // 完全匹配
        if s1_lower == s2_lower {
            return 1.0;
        }

        // 包含关系
        if s1_lower.contains(&s2_lower) || s2_lower.contains(&s1_lower) {
            let min_len = s1_lower.len().min(s2_lower.len()) as f64;
            let max_len = s1_lower.len().max(s2_lower.len()) as f64;
            return min_len / max_len * 0.9;
        }

        // 编辑距离相似度
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

    /// 清理漫画名前缀：去除 [], (), ()[], []() 等前缀
    fn clean_title_prefix(title: &str) -> String {
        // 正则表达式匹配开头的 [], (), 以及它们的组合
        let re = Regex::new(r"^(?:\[.*?\]|\(.*?\)|\[.*?\]\(.*?\)|\(.*?\)\[.*?\])*\s*").unwrap();
        re.replace(title, "").trim().to_string()
    }
}
