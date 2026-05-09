# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 概述

WNACG Downloader 是一款 Tauri 2 桌面应用，用于搜索、对比和下载来自 wnacg.com 的漫画。采用 Vue 3 + TypeScript 前端和 Rust 后端，支持并发下载、断点续传、AI 智能标题匹配和代理配置。

## 技术栈

- **前端**: Vue 3.5（Composition API，无路由）、TypeScript 5.3（严格模式）、Vite 8
- **后端**: Rust 2021 版本、Tauri 2、Tokio、reqwest、scraper
- **浏览器自动化**: Playwright（Node.js 脚本，由 Rust 派生用于绕过 Cloudflare）
- **测试**: vitest 1.0 | **代码规范**: ESLint + Prettier

## 常用命令

```bash
# 开发
npm run dev              # 完整 Tauri 开发模式（同时启动 Vite 和桌面应用）
npm run dev:frontend     # 仅启动 Vite 开发服务器（端口 5173）

# 构建
npm run build            # 生产构建（前端 + Rust，打包为桌面应用）
npm run build:frontend   # 仅类型检查 + 构建前端
npm run preview          # 预览已构建的前端

# 代码质量
npm run lint             # ESLint 检查
npm run format           # Prettier 格式化

# Rust（在 src-tauri/ 目录下执行）
cargo build              # 调试构建
cargo build --release    # 发布构建
```

前置要求：Node.js >= 18，Rust >= 1.75.1。Windows 需要 Visual Studio Build Tools。

## 架构

### 通信模式

- **前端 → 后端**: Tauri 命令，通过 `@tauri-apps/api/core` 的 `invoke()` 调用
- **后端 → 前端**: Tauri 事件，通过 `@tauri-apps/api/event` 的 `listen()` 监听
- 事件类型：`search_progress`、`search_complete`、`download_progress`、`download_complete`、`compare_progress`、`error`

### Tauri 命令（注册于 [src-tauri/src/main.rs](src-tauri/src/main.rs)）

| 命令 | 说明 |
|---|---|
| `get_config`、`save_config`、`reset_config` | 配置管理 |
| `search_comics` | 为每页派生 Node.js Playwright 脚本，并行执行 |
| `compare_comics` | 读取缓存的搜索结果，扫描本地文件夹，AI 匹配标题 |
| `start_download` | 并发批量下载，支持重试和断点续传 |
| `window_minimize`、`window_maximize`、`window_close` | 窗口控制 |

### 前端结构（`src/`）

- [App.vue](src/App.vue) — 根组件，包含侧边栏和视图切换（基于组件，无 vue-router）
- [views/](src/views/) — SearchView（搜索页）、CompareView（对比页）、DownloadView（下载页）、ConfigView（设置页）
- [composables/](src/composables/) — useSearch、useCompare、useDownload、useConfig、useDownloadQueue
- [types/index.ts](src/types/index.ts) — 所有 TypeScript 接口定义（Comic、AppConfig 等）

### Rust 后端结构（`src-tauri/src/`）

- [commands/](src-tauri/src/commands/) — Tauri 命令处理器（搜索、对比、下载、配置）
- [core/](src-tauri/src/core/) — 核心业务逻辑模块：
  - **downloader/** — 并发下载器，使用 `tokio::sync::Semaphore` 控制并发数，支持重试和断点续传
  - **comparer/** — 协调本地扫描和 AI 匹配
  - **scanner/** — 扫描本地文件夹中的漫画（ZIP/RAR/CBZ/CBR/7z 压缩包，或包含 3 张以上图片的文件夹）
  - **ai/** — AiMatcher 双模式：OpenAI 兼容 API（每批 20 条）或本地 Levenshtein 距离回退方案
  - **scraper/** — 遗留的 HTTP 爬虫（reqwest + scraper），标记为 `#[allow(dead_code)]`；**当前未使用**，实际搜索使用 Playwright
- [config.rs](src-tauri/src/config.rs) — 配置文件位于 `{exe_dir}/config/config.json`
- [events.rs](src-tauri/src/events.rs) — 事件结构体定义
- [error.rs](src-tauri/src/error.rs) — AppError 枚举
- [types.rs](src-tauri/src/types.rs) — Rust 类型模块

### 搜索流程（Playwright，非 Rust HTTP）

`search_comics` → 派生 `node scripts/search_with_playwright.js <keyword> <page>` → 有头 Chromium 浏览器访问 wnacg.com → 从 `div.pic_box` 元素提取数据 → 输出 JSON 到标准输出。这样可以避免纯 HTTP 请求被 Cloudflare 拦截的问题。

### 配置

存储路径：`{exe_dir}/config/config.json`。主要字段：`storage_path`（存储路径）、`proxy`/`proxy_enabled`（代理）、`max_pages`（最大页数）、`request_interval`（请求间隔）、`search_chinese_only`（仅中文搜索）、`concurrent_downloads`（并发下载数，默认 3）、`retry_times`（重试次数，默认 3）、`retry_interval`（重试间隔，默认 30 秒）、`ai_api_url`、`ai_api_key`、`match_threshold`（匹配阈值，默认 0.8）、`theme`（主题：light/dark）。

### 缓存

存储路径：`{exe_dir}/cache/`，以 JSON 文件形式存储（如 `search_{keyword}.json`）。

## 重要注意事项

- `src-tauri/src/core/scraper/mod.rs` 是**遗留代码**（已标记为死代码），实际搜索使用 Playwright
- TypeScript 启用了严格模式，包括 `noUnusedLocals` 和 `noUnusedParameters`
- 发布版配置：`panic = "abort"`、`lto = true`、`codegen-units = 1`、`opt-level = "s"`、`strip = true`（最小化二进制体积）
- 详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 获取完整的架构文档
