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
        pub chinese_only: bool,
        /// 代理地址
        pub proxy: Option<String>,
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
    }
}

pub mod config {
    use serde::{Deserialize, Serialize};

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
        pub ai_api_url: String,
        /// AI API Key
        pub ai_api_key: Option<String>,
        /// 匹配阈值
        pub match_threshold: f64,
        /// 主题（light/dark）
        pub theme: String,
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
                ai_api_url: String::new(),
                ai_api_key: None,
                match_threshold: 0.8,
                theme: "light".to_string(),
            }
        }
    }
}
