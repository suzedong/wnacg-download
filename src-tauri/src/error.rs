// 错误处理模块

use thiserror::Error;

/// 应用错误类型
#[derive(Debug, Error)]
pub enum AppError {
    #[error("网络错误：{0}")]
    NetworkError(#[from] reqwest::Error),

    #[error("IO 错误：{0}")]
    IoError(#[from] std::io::Error),

    #[error("JSON 解析错误：{0}")]
    JsonError(#[from] serde_json::Error),

    #[error("HTML 解析错误：{0}")]
    #[allow(dead_code)]
    ParseError(String),

    #[error("AI 匹配错误：{0}")]
    AiError(String),

    #[error("配置错误：{0}")]
    ConfigError(String),

    #[error("下载错误：{0}")]
    DownloadError(String),

    #[error("Cloudflare 验证：{0}")]
    CloudflareError(String),

    #[error("未知错误：{0}")]
    Unknown(String),
}

/// 将字符串错误转换为 AppError
impl From<String> for AppError {
    fn from(err: String) -> Self {
        AppError::Unknown(err)
    }
}

/// 将 &str 错误转换为 AppError
impl From<&str> for AppError {
    fn from(err: &str) -> Self {
        AppError::Unknown(err.to_string())
    }
}
