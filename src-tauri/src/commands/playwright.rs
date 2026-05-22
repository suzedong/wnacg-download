// Playwright 管理命令
// 用于检查和安装 Playwright 浏览器

use std::process::Command;
use tauri::command;
use tauri::Emitter;

/// 检查 Playwright Chromium 是否已安装
#[command]
pub fn check_playwright_installed() -> Result<bool, String> {
    println!("[Playwright] 检查 Chromium 安装状态...");
    
    // 方法 1：直接检查常见的 Chromium 安装路径
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/szd".to_string());
    let cache_dir = format!("{}/Library/Caches/ms-playwright", home);
    
    // 检查是否有任何 chromium-* 文件夹
    use std::path::Path;
    let cache_path = Path::new(&cache_dir);
    if cache_path.exists() {
        if let Ok(entries) = std::fs::read_dir(cache_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let dir_name = entry.file_name().to_string_lossy().to_string();
                    if dir_name.starts_with("chromium-") {
                        // 检查可执行文件是否存在
                        let exe_path = path.join("chrome-mac-arm64")
                            .join("Google Chrome for Testing.app")
                            .join("Contents")
                            .join("MacOS")
                            .join("Google Chrome for Testing");
                        if exe_path.exists() {
                            println!("[Playwright] 找到 Chromium: {}", exe_path.display());
                            println!("[Playwright] Chromium 状态: 已安装");
                            return Ok(true);
                        }
                    }
                }
            }
        }
    }
    
    println!("[Playwright] Chromium 状态: 未安装");
    Ok(false)
}

/// 安装 Playwright Chromium
#[command]
pub async fn install_playwright(app: tauri::AppHandle) -> Result<bool, String> {
    println!("[Playwright] 开始安装 Chromium...");
    
    // 先清理可能的锁文件
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/szd".to_string());
    let lockfile = format!("{}/Library/Caches/ms-playwright/__dirlock", home);
    if std::path::Path::new(&lockfile).exists() {
        println!("[Playwright] 发现锁文件，正在清理...");
        let _ = std::fs::remove_file(&lockfile);
        let _ = std::fs::remove_dir_all(format!("{}/Library/Caches/ms-playwright", home));
        println!("[Playwright] 锁文件已清理");
    }
    
    let app_clone = app.clone();
    
    tokio::task::spawn_blocking(move || {
        let mut child = Command::new("npx")
            .args(["playwright", "install", "chromium"])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("启动安装失败：{}", e))?;
        
        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();
        
        let error_lines = Vec::new();
        
        // 在后台线程读取输出并发送事件
        let app_for_stdout = app_clone.clone();
        tokio::spawn(async move {
            use std::io::BufRead;
            let reader = std::io::BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(line) = line {
                    println!("[安装] {}", line);
                    let _ = app_for_stdout.emit("playwright_install_progress", serde_json::json!({
                        "message": line,
                        "status": "downloading"
                    }));
                }
            }
        });
        
        let app_for_stderr = app_clone.clone();
        let mut error_lines_for_closure = error_lines.clone();
        tokio::spawn(async move {
            use std::io::BufRead;
            let reader = std::io::BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line) = line {
                    println!("[安装] {}", line);
                    error_lines_for_closure.push(line.clone());
                    let _ = app_for_stderr.emit("playwright_install_progress", serde_json::json!({
                        "message": line,
                        "status": "installing"
                    }));
                }
            }
        });
        
        let status = child.wait().map_err(|e| format!("等待安装失败：{}", e))?;
        
        if status.success() {
            println!("[Playwright] 安装成功！");
            let _ = app_clone.emit("playwright_install_progress", serde_json::json!({
                "message": "安装成功！",
                "status": "success"
            }));
            Ok(true)
        } else {
            println!("[Playwright] 安装失败");
            
            // 检查是否是网络问题
            let all_output = error_lines.join("\n");
            let is_network_error = all_output.contains("ECONNREFUSED") 
                || all_output.contains("ETIMEDOUT") 
                || all_output.contains("timeout")
                || all_output.contains("ENOTFOUND")
                || all_output.contains("网络")
                || all_output.contains("connection");
            
            let error_msg = if is_network_error {
                format!("安装失败，可能是网络问题。请检查代理设置后重试。\n\n退出码：{:?}", status.code())
            } else {
                format!("安装失败，退出码：{:?}", status.code())
            };
            
            let _ = app_clone.emit("playwright_install_progress", serde_json::json!({
                "message": error_msg.clone(),
                "status": "error",
                "is_network_error": is_network_error
            }));
            
            Err(error_msg)
        }
    })
    .await
    .map_err(|e| format!("安装任务失败：{}", e))?
}

/// 检查系统 Chrome 是否已安装（macOS）
#[command]
pub fn check_system_chrome() -> Result<bool, String> {
    println!("[Playwright] 检查系统 Chrome 安装状态...");
    
    let chrome_paths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
    
    for path in chrome_paths {
        use std::path::Path;
        if Path::new(path).exists() {
            println!("[Playwright] 找到系统 Chrome: {}", path);
            return Ok(true);
        }
    }
    
    println!("[Playwright] 未找到系统 Chrome");
    Ok(false)
}
