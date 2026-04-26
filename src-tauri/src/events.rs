// 事件定义模块

use serde::Serialize;
use tauri::Emitter;

/// 搜索进度事件
#[derive(Clone, Serialize)]
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

/// 下载完成事件
#[derive(Clone, Serialize)]
pub struct DownloadCompleteEvent {
    /// 成功数量
    pub success: u32,
    /// 失败数量
    pub failed: u32,
}

/// 错误事件
#[derive(Clone, Serialize)]
#[allow(dead_code)]
pub struct ErrorEvent {
    /// 错误消息
    pub message: String,
}

/// 发送搜索进度事件
pub fn emit_search_progress(app: &tauri::AppHandle, event: SearchProgressEvent) {
    let _ = app.emit("search_progress", event);
}

/// 发送下载进度事件
pub fn emit_download_progress(app: &tauri::AppHandle, event: DownloadProgressEvent) {
    let _ = app.emit("download_progress", event);
}

/// 发送对比进度事件
pub fn emit_compare_progress(app: &tauri::AppHandle, event: CompareProgressEvent) {
    let _ = app.emit("compare_progress", event);
}

/// 发送下载完成事件
pub fn emit_download_complete(app: &tauri::AppHandle, event: DownloadCompleteEvent) {
    let _ = app.emit("download_complete", event);
}

/// 发送错误事件
#[allow(dead_code)]
pub fn emit_error(app: &tauri::AppHandle, event: ErrorEvent) {
    let _ = app.emit("error", event);
}
