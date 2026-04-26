// 本地扫描器模块

use crate::error::AppError;
use crate::types::comic::LocalComic;
use chrono::Local;
use std::fs;
use std::path::Path;

/// 本地扫描器
pub struct Scanner;

impl Scanner {
    /// 扫描本地漫画文件夹
    pub async fn scan_local(path: &str) -> Result<Vec<LocalComic>, AppError> {
        println!("📂 开始扫描本地文件夹：{}", path);

        let path = Path::new(path);

        if !path.exists() {
            return Err(AppError::ConfigError(format!("文件夹不存在：{}", path.display())));
        }

        if !path.is_dir() {
            return Err(AppError::ConfigError(format!("不是有效的文件夹：{}", path.display())));
        }

        let mut comics = vec![];

        // 遍历文件夹
        Self::scan_directory(path, &mut comics)?;

        println!("✅ 扫描完成，找到 {} 部本地漫画", comics.len());

        Ok(comics)
    }

    /// 递归扫描目录
    fn scan_directory(dir: &Path, comics: &mut Vec<LocalComic>) -> Result<(), AppError> {
        let entries = fs::read_dir(dir)?;

        for entry in entries {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                // 检查是否是漫画文件夹（包含图片文件）
                if Self::is_comic_folder(&path) {
                    if let Some(comic) = Self::extract_comic_info(&path) {
                        comics.push(comic);
                    }
                } else {
                    // 递归扫描子目录
                    Self::scan_directory(&path, comics)?;
                }
            }
        }

        Ok(())
    }

    /// 检查文件夹是否是漫画文件夹
    fn is_comic_folder(dir: &Path) -> bool {
        if let Ok(entries) = fs::read_dir(dir) {
            let mut has_images = false;
            let mut image_count = 0;

            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Some(ext) = path.extension() {
                        let ext = ext.to_string_lossy().to_lowercase();
                        if ["jpg", "jpeg", "png", "gif", "webp"].contains(&ext.as_str()) {
                            has_images = true;
                            image_count += 1;
                        }
                    }
                }
            }

            // 如果包含 3 张以上图片，认为是漫画文件夹
            has_images && image_count >= 3
        } else {
            false
        }
    }

    /// 提取漫画信息
    fn extract_comic_info(path: &Path) -> Option<LocalComic> {
        let title = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        if title.is_empty() {
            return None;
        }

        // 计算文件夹大小和图片数量
        let (file_size, page_count) = Self::calculate_folder_stats(path);

        Some(LocalComic {
            path: path.to_string_lossy().to_string(),
            title,
            file_size,
            page_count,
            download_date: Local::now().format("%Y-%m-%d").to_string(),
        })
    }

    /// 计算文件夹统计信息
    fn calculate_folder_stats(dir: &Path) -> (u64, u32) {
        let mut total_size = 0;
        let mut image_count = 0;

        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Ok(metadata) = fs::metadata(&path) {
                        total_size += metadata.len();

                        if let Some(ext) = path.extension() {
                            let ext = ext.to_string_lossy().to_lowercase();
                            if ["jpg", "jpeg", "png", "gif", "webp"].contains(&ext.as_str()) {
                                image_count += 1;
                            }
                        }
                    }
                }
            }
        }

        (total_size, image_count)
    }
}
