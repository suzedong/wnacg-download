// 类型定义模块

pub mod comic {
    use serde::{Deserialize, Serialize};

    /// 漫画信息（网站）
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct Comic {
        /// 漫画 ID
        pub aid: String,
        /// 标题
        pub title: String,
        /// 作者
        pub author: String,
        /// 分类
        pub category: String,
        /// 封面图 URL
        pub cover_url: String,
        /// 详细页 URL
        pub url: String,
        /// 图片数量
        pub pages: u32,
        /// 标签
        pub tags: Vec<String>,
        /// 上传日期
        pub upload_date: String,
    }

    /// 本地漫画信息
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct LocalComic {
        /// 文件夹路径
        pub path: String,
        /// 标题
        pub title: String,
        /// 文件大小（字节）
        pub file_size: u64,
        /// 图片数量
        pub page_count: u32,
        /// 下载日期
        pub download_date: String,
    }
}

pub mod search {
    use serde::{Deserialize, Serialize};

    /// 搜索选项
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct SearchOptions {
        /// 最大爬取页数（0 表示不限制）
        pub max_pages: u32,
        /// 请求间隔（毫秒）
        pub request_interval: u64,
        /// 只搜索汉化版
        pub search_chinese_only: bool,
        /// 代理地址
        pub proxy: Option<String>,
        /// 是否启用代理
        pub proxy_enabled: bool,
    }

    /// 搜索结果
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct SearchResult {
        /// 搜索关键字
        pub keyword: String,
        /// 搜索时间
        pub search_time: String,
        /// 漫画列表
        pub comics: Vec<super::comic::Comic>,
        /// 文件路径
        pub file_path: String,
    }
}

pub mod download {
    use serde::{Deserialize, Serialize};

    /// 下载任务
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct DownloadTask {
        /// 漫画 ID
        pub aid: String,
        /// 标题
        pub title: String,
        /// 下载 URL
        pub url: String,
        /// 封面图 URL
        pub cover_url: String,
        /// 存储路径
        pub save_path: String,
        /// 图片数量
        pub pages: u32,
    }

    /// 下载配置（包含全局默认路径）
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct DownloadOptions {
        /// 并发下载数
        pub concurrent: u32,
        /// 重试次数
        pub retry_times: u32,
        /// 重试间隔（秒）
        pub retry_interval: u64,
        /// 代理地址
        pub proxy: Option<String>,
        /// 是否启用代理
        pub proxy_enabled: bool,
        /// 默认保存路径
        pub storage_path: String,
        /// 下载源优先策略
        pub download_source_preference: Option<String>,
    }

    /// 下载进度
    #[derive(Debug, Clone, Serialize, Deserialize)]
    #[allow(dead_code)]
    pub struct DownloadProgress {
        /// 任务 ID
        pub task_id: String,
        /// 进度（0-100）
        pub progress: f64,
        /// 下载速度（字节/秒）
        pub speed: u64,
        /// 状态
        pub status: String,
    }

    /// 下载结果
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct DownloadResult {
        /// 成功数量
        pub success: u32,
        /// 失败数量
        pub failed: u32,
        /// 成功列表
        pub success_list: Vec<String>,
        /// 失败列表
        pub failed_list: Vec<FailedComic>,
    }

    /// 失败的漫画
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct FailedComic {
        /// 标题
        pub title: String,
        /// 失败原因
        pub reason: String,
    }
}

pub mod compare {
    use serde::{Deserialize, Serialize};

    /// 对比结果
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct CompareResult {
        /// 网站漫画数量
        pub website_comics: u32,
        /// 本地漫画数量
        pub local_comics: u32,
        /// 需要下载的数量
        pub to_download: u32,
        /// 已拥有的数量
        pub already_have: u32,
        /// 匹配详情
        pub match_details: Vec<MatchDetail>,
        /// AI 响应原始内容（可选择查看）
        #[serde(skip_serializing_if = "Option::is_none")]
        pub ai_response: Option<String>,
    }

    /// AI 匹配结果（包含匹配详情和原始响应）
    #[derive(Debug, Clone)]
    pub struct AiMatchResult {
        pub details: Vec<super::compare::MatchDetail>,
        pub ai_response: Option<String>,
    }

    /// 匹配详情
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct MatchDetail {
        /// 网站漫画
        pub website: super::comic::Comic,
        /// 本地漫画（如果有）
        pub local: Option<super::comic::LocalComic>,
        /// 匹配类型
        pub match_type: String, // "need_download" 或 "already_have"
        /// 置信度（0-1）
        pub confidence: f64,
        /// 匹配理由
        pub reason: String,
        /// 匹配算法
        pub algorithm: String, // "本地" 或 "AI"
    }
}

pub mod config {
    use serde::{Deserialize, Serialize};

    fn default_ai_model() -> String {
        "qwen3.5-plus".to_string()
    }

    fn default_ai_api_url() -> String {
        "https://coding.dashscope.aliyuncs.com/v1/chat/completions".to_string()
    }

    fn default_ai_prompt() -> String {
        "你是一个专业的漫画匹配助手。请对比以下网站漫画和本地漫画，判断哪些是相同的漫画（可能标题略有不同）。\n\n网站漫画列表：\n{website_comics}\n\n本地漫画列表：\n{local_comics}\n\n匹配规则：\n1. 根据漫画名称判断是否是同一部作品\n2. 考虑名称的变体、翻译差异、简繁体、前后缀差异等\n3. 给出每对匹配的置信度（0-1）\n4. 如果本地有匹配的，标记为 \"already_have\"\n5. 如果本地没有匹配的，标记为 \"need_download\"\n\n请返回 JSON 格式（只返回 JSON，不要其他内容）：\n{\n  \"matches\": [\n    {\n      \"website_title\": \"网站漫画标题\",\n      \"local_title\": \"本地漫画标题（如果没有则为 null）\",\n      \"match_type\": \"already_have 或 need_download\",\n      \"confidence\": 0.95,\n      \"reason\": \"匹配的简要理由\"\n    }\n  ]\n}".to_string()
    }

    fn default_ai_temperature() -> f64 {
        0.0
    }

    /// 配置结构
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct AppConfig {
        /// 默认存储路径
        pub storage_path: String,
        /// 代理地址
        pub proxy: Option<String>,
        /// 是否启用代理
        pub proxy_enabled: bool,
        /// 最大爬取页数
        pub max_pages: u32,
        /// 请求间隔（毫秒）
        pub request_interval: u64,
        /// 只搜索汉化版
        pub search_chinese_only: bool,
        /// 并发下载数
        pub concurrent_downloads: u32,
        /// 下载重试次数
        pub retry_times: u32,
        /// 重试间隔（秒）
        pub retry_interval: u64,
        /// AI API 地址
        #[serde(default = "default_ai_api_url")]
        pub ai_api_url: String,
        /// AI API Key
        pub ai_api_key: Option<String>,
        /// AI 模型名称
        #[serde(default = "default_ai_model")]
        pub ai_model: String,
        /// AI Prompt 模板
        #[serde(default = "default_ai_prompt")]
        pub ai_prompt: String,
        /// AI 温度参数（0-2，0 表示确定性输出，关闭推理）
        #[serde(default = "default_ai_temperature")]
        pub ai_temperature: f64,
        /// 匹配阈值
        pub match_threshold: f64,
        /// 主题（light/dark/auto）
        pub theme: String,
        /// 下载源优先策略：server2 | worker_api | auto
        #[serde(default)]
        pub download_source_preference: String,
    }

    impl Default for AppConfig {
        fn default() -> Self {
            Self {
                storage_path: String::new(),
                proxy: None,
                proxy_enabled: false,
                max_pages: 0,
                request_interval: 1000,
                search_chinese_only: true,
                concurrent_downloads: 3,
                retry_times: 3,
                retry_interval: 30,
                ai_api_url: "https://coding.dashscope.aliyuncs.com/v1".to_string(),
                ai_api_key: Some("sk-sp-4cf0ff7b598444949af23ee397b4cdf9".to_string()),
                ai_model: "qwen3.5-plus".to_string(),
                ai_prompt: "你是一个专业的漫画匹配助手。请对比以下网站漫画和本地漫画，判断哪些是相同的漫画（可能标题略有不同）。\n\n网站漫画列表：\n{website_comics}\n\n本地漫画列表：\n{local_comics}\n\n请返回 JSON 格式结果，包含：\n- website_title: 网站漫画标题\n- local_title: 匹配的本地漫画标题（如无匹配则为 null）\n- match_type: \"already_have\" 或 \"need_download\"\n- confidence: 匹配置信度 (0-1)\n- reason: 匹配原因".to_string(),
                ai_temperature: 0.0,
                match_threshold: 0.8,
                theme: "auto".to_string(),
                download_source_preference: "server2".to_string(),
            }
        }
    }

    /// 对比历史条目（持久化存储）
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct CompareHistoryEntry {
        /// 搜索关键字
        pub keyword: String,
        /// 本地文件夹路径
        pub local_path: String,
        /// 对比时间（ISO 8601）
        pub compared_at: String,
        /// 对比结果
        pub result: super::compare::CompareResult,
    }
}
