// 事件定义模块

use serde::Serialize;
use tauri::{Emitter, Manager};

/// 搜索完成事件
#[derive(Clone, Serialize)]
pub struct SearchCompleteEvent {
    /// 搜索关键字
    pub keyword: String,
    /// 漫画数量
    pub count: u32,
}

/// 搜索进度事件
#[derive(Clone, Serialize)]
#[allow(dead_code)]
pub struct SearchProgressEvent {
    /// 当前页码
    pub current: u32,
    /// 总页数
    pub total: u32,
    /// 已找到的漫画数量
    pub found_count: u32,
}

/// 下载进度事件
#[derive(Clone, Serialize)]
pub struct DownloadProgressEvent {
    /// 任务 ID
    pub task_id: String,
    /// 进度（0-100）
    pub progress: f64,
    /// 下载速度（MB/s）
    pub speed: f64,
    /// 剩余时间（秒）
    pub eta: u32,
}

/// 对比进度事件
#[derive(Clone, Serialize)]
pub struct CompareProgressEvent {
    /// 当前处理数量
    pub current: u32,
    /// 总数量
    pub total: u32,
}

/// AI 匹配进度事件（流式输出）
#[derive(Clone, Serialize)]
pub struct AiProgressEvent {
    /// 进度消息
    pub message: String,
    /// 已接收字符数
    pub received_bytes: usize,
    /// 本次新增的流式内容（增量）
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub streaming_content: Option<String>,
}

/// 下载完成事件（包含完整结果信息）
#[derive(Clone, Serialize)]
pub struct DownloadCompleteEvent {
    /// 成功数量
    pub success: u32,
    /// 失败数量
    pub failed: u32,
    /// 成功标题列表
    pub success_list: Vec<String>,
    /// 失败详情列表
    pub failed_list: Vec<crate::types::download::FailedComic>,
}

/// 错误事件
#[derive(Clone, Serialize)]
#[allow(dead_code)]
pub struct ErrorEvent {
    /// 错误消息
    pub message: String,
}

/// 发送搜索进度事件
#[allow(dead_code)]
pub fn emit_search_progress(app: &tauri::AppHandle, event: SearchProgressEvent) {
    let _ = app.emit("search_progress", event);
}

/// 发送搜索完成事件
pub fn emit_search_complete(app: &tauri::AppHandle, event: SearchCompleteEvent) {
    let _ = app.emit("search_complete", event);
}

/// 发送下载进度事件
pub fn emit_download_progress(app: &tauri::AppHandle, event: DownloadProgressEvent) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit("download_progress", event);
    } else {
        let _ = app.emit("download_progress", event);
    }
}

/// 发送对比进度事件
pub fn emit_compare_progress(app: &tauri::AppHandle, event: CompareProgressEvent) {
    let _ = app.emit("compare_progress", event);
}

/// 发送 AI 匹配进度事件
pub fn emit_ai_progress(app: &tauri::AppHandle, event: AiProgressEvent) {
    let _ = app.emit("ai_progress", event);
}

/// 发送下载完成事件
pub fn emit_download_complete(app: &tauri::AppHandle, event: DownloadCompleteEvent) {
    // 通过主窗口明确发射事件，确保前端能收到
    if let Some(window) = app.get_webview_window("main") {
        if let Err(e) = window.emit("download_complete", event) {
            eprintln!("⚠️ 通过窗口发射 download_complete 失败：{}", e);
        }
        println!("✅ 已通过主窗口发射 download_complete 事件");
    } else {
        // 回退：通过 AppHandle 广播
        if let Err(e) = app.emit("download_complete", event) {
            eprintln!("⚠️ 通过 AppHandle 发射 download_complete 失败：{}", e);
        }
        println!("✅ 已通过 AppHandle 广播 download_complete 事件");
    }
}

/// 发送错误事件
#[allow(dead_code)]
pub fn emit_error(app: &tauri::AppHandle, event: ErrorEvent) {
    let _ = app.emit("error", event);
}
