# WNACG Downloader Tauri 启动脚本
# 自动刷新环境变量并启动 Tauri 开发模式

Write-Host "Starting WNACG Downloader (Tauri)..." -ForegroundColor Green
Write-Host ""

# 刷新 PATH 环境变量
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine")

# 检查必要工具
Write-Host "Checking required tools..." -ForegroundColor Yellow

$cargoVersion = & cargo --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cargo not found. Please install Rust toolchain first." -ForegroundColor Red
    Write-Host "   Visit: https://rustup.rs/" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "  OK: $cargoVersion" -ForegroundColor Green

$nodeVersion = & node --version 2>&1
Write-Host "  OK: Node.js $nodeVersion" -ForegroundColor Green

Write-Host ""

# 检查 Vite 是否在运行
Write-Host "Checking Vite dev server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2
    Write-Host "  OK: Vite is running on port 5173" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Vite is not running on port 5173" -ForegroundColor Yellow
    Write-Host "  Starting Vite dev server..." -ForegroundColor Yellow
    Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev:ui"
    Write-Host "  Waiting for Vite to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "Starting Tauri dev mode..." -ForegroundColor Cyan
Write-Host "  API Server: http://127.0.0.1:3001" -ForegroundColor Gray
Write-Host "  Vite Server: http://localhost:5173" -ForegroundColor Gray
Write-Host ""

# 启动 Tauri
npm run dev:tauri
