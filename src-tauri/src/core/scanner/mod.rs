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

        // 处理 SMB 路径格式
        let normalized_path = if path.starts_with("smb://") {
            // macOS SMB 路径转换：smb://server/share -> /Volumes/share
            // 注意：需要先手动挂载 SMB 共享
            println!("⚠️ 检测到 SMB 路径，macOS 需要先挂载 SMB 共享");
            println!("   提示：请在 Finder 中连接服务器，或使用 /Volumes/ 路径");
            return Err(AppError::ConfigError(format!(
                "SMB 路径需要先挂载：{}\n请在 Finder 中点击「前往」→「连接服务器」，挂载后使用 /Volumes/ 路径",
                path
            )));
        } else if path.starts_with("\\\\") || path.starts_with("//") {
            // Windows UNC 路径或 Unix 风格
            path.replace("//", "\\")
        } else {
            path.to_string()
        };

        let path_obj = Path::new(&normalized_path);

        // 检查路径是否存在
        if !path_obj.exists() {
            println!("❌ 文件夹不存在或无法访问：{}", path_obj.display());
            println!("   提示：如果是 SMB 网络路径，请确认网络连接和权限");
            return Err(AppError::ConfigError(format!("文件夹不存在或无法访问：{}", path_obj.display())));
        }

        if !path_obj.is_dir() {
            return Err(AppError::ConfigError(format!("不是有效的文件夹：{}", path_obj.display())));
        }

        println!("✅ 文件夹验证成功，开始扫描...");

        let mut comics = vec![];

        // 遍历文件夹
        Self::scan_directory(path_obj, &mut comics)?;

        println!("✅ 扫描完成，找到 {} 部本地漫画", comics.len());

        Ok(comics)
    }

    /// 递归扫描目录
    fn scan_directory(dir: &Path, comics: &mut Vec<LocalComic>) -> Result<(), AppError> {
        let entries = fs::read_dir(dir)?;

        for entry in entries {
            let entry = entry?;
            let path = entry.path();

            if path.is_file() {
                // 检查是否是漫画压缩包
                if let Some(ext) = path.extension() {
                    let ext = ext.to_string_lossy().to_lowercase();
                    if ["zip", "rar", "cbz", "cbr", "7z"].contains(&ext.as_str()) {
                        if let Some(comic) = Self::extract_comic_from_archive(&path) {
                            comics.push(comic);
                        }
                    }
                }
            } else if path.is_dir() {
                // 检查是否是漫画文件夹（包含图片）
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

    /// 从压缩包提取漫画信息
    fn extract_comic_from_archive(path: &Path) -> Option<LocalComic> {
        let title = path
            .file_stem()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        if title.is_empty() {
            return None;
        }

        // 清理标题中的 HTML 实体
        let clean_title = Self::clean_title(&title);

        let file_size = fs::metadata(path).ok()?.len();

        Some(LocalComic {
            path: path.to_string_lossy().to_string(),
            title: clean_title,
            file_size,
            page_count: 1,
            download_date: Local::now().format("%Y-%m-%d").to_string(),
        })
    }

    /// 清理标题中的 HTML 实体（不删除前缀）
    fn clean_title(title: &str) -> String {
        let cleaned = title
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&#x27;", "'");
        
        // 只去除多余空格，保留前缀
        cleaned.replace('\u{00a0}', " ").split_whitespace().collect::<Vec<_>>().join(" ")
    }

    /// 提取漫画信息（文件夹）
    fn extract_comic_info(path: &Path) -> Option<LocalComic> {
        let title = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        if title.is_empty() {
            return None;
        }

        // 清理标题中的 HTML 实体
        let clean_title = Self::clean_title(&title);

        // 计算文件夹大小和图片数量
        let (file_size, page_count) = Self::calculate_folder_stats(path);

        Some(LocalComic {
            path: path.to_string_lossy().to_string(),
            title: clean_title,
            file_size,
            page_count,
            download_date: Local::now().format("%Y-%m-%d").to_string(),
        })
    }
    /// 检查文件夹是否是漫画文件夹（包含 3 张以上图片）
    fn is_comic_folder(dir: &Path) -> bool {
        if let Ok(entries) = fs::read_dir(dir) {
            let mut image_count = 0;

            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Some(ext) = path.extension() {
                        let ext = ext.to_string_lossy().to_lowercase();
                        if ["jpg", "jpeg", "png", "gif", "webp"].contains(&ext.as_str()) {
                            image_count += 1;
                        }
                    }
                }
            }

            // 包含 3 张以上图片，认为是漫画文件夹
            image_count >= 3
        } else {
            false
        }
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
