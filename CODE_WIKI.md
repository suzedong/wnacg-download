# WNACG Downloader · Code Wiki

> 版本：v4.0.0 · 文档生成日期：2026-06-24
>
> 本文档由对仓库源码的静态分析整理而成，覆盖**整体架构、模块职责、关键类与函数、依赖关系、运行方式**，可作为新成员上手与维护者查阅的入口。

---

## 1. 项目概览

**WNACG Downloader** 是一款基于 [Tauri 2](https://tauri.app) 构建的桌面应用，用于在 [wnacg.com](https://www.wnacg.com) 搜索汉化漫画、与本地已有资源进行 AI 智能对比，并通过浏览器自动化绕过 Cloudflare 完成并发下载、断点续传。

- **前端**：Vue 3.5（`<script setup>`）+ TypeScript 5.3（严格模式）+ Vite 8
- **后端**：Rust 2021 + Tauri 2 + Tokio + reqwest + scraper
- **浏览器自动化**：Playwright（Node.js 子进程，由 Rust 派生）
- **测试**：Vitest（前端 composables / 工具函数单元测试）+ `#[cfg(test)]`（Rust 单元测试）
- **代码规范**：ESLint + Prettier；中文注释、中文日志、中文提示

### 核心能力

1. **搜索**：通过 Playwright 真实浏览器访问 wnacg.com 搜索结果页，绕过 Cloudflare 检测，结果落盘到 `cache/search_{keyword}.json`。
2. **对比**：扫描本地漫画文件夹与压缩包，先使用 Levenshtein + 前缀清洗做本地匹配；剩余未匹配项再以 SSE 流式调用 OpenAI 兼容 AI 接口进行兜底。
3. **下载**：基于 Tokio Semaphore 的并发下载，支持暂停 / 恢复 / 取消单个任务、断点续传、失败重试，可在 reqwest 直连（Server 2）与 Playwright 浏览器内下载（绕过 Cloudflare TLS 指纹）两种策略间切换。
4. **配置**：JSON 配置文件持久化到 `{exe_dir}/config/config.json`，支持代理、并发数、AI Prompt、主题、下载源策略等。

---

## 2. 整体架构

### 2.1 进程拓扑

```
┌──────────────────────────────────────────┐
│              Vue 前端 (WebView)           │
│  views/* + composables/* + components/*  │
└────────────────┬─────────────────────────┘
                 │ invoke() / listen()
┌────────────────▼─────────────────────────┐
│              Rust 后端 (Tauri)            │
│   commands/* → core/* (downloader,       │
│   comparer, scanner, ai, scraper[dead])  │
└────────────────┬─────────────────────────┘
                 │ tokio::process::Command (spawn)
┌────────────────▼─────────────────────────┐
│           Node.js + Playwright            │
│   scripts/search_with_playwright.js       │
│   scripts/get_download_info.js            │
│   scripts/download_via_playwright.js      │
└──────────────────────────────────────────┘
                 │
                 ▼
       wnacg.com / d1.wcdn.date / dl1.wn01.download
```

### 2.2 通信模式

- **前端 → 后端**：`@tauri-apps/api/core` 的 `invoke(name, payload)` 调用 `#[tauri::command]` 标注的函数。
- **后端 → 前端**：通过 `tauri::Emitter::emit` 推送事件，前端 `@tauri-apps/api/event` 的 `listen` 订阅。
- **后端 → 浏览器**：Rust 通过 `std::process::Command` / `tokio::process::Command` 派生 Node.js 进程；脚本以 **stdout 单行 JSON + stderr 调试日志** 的契约返回数据。

### 2.3 事件清单

| 事件 | 发射源 | 载荷 |
|------|--------|------|
| `search_progress` | [search.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/commands/search.rs) | `{ current, total, found_count }` |
| `search_complete` | [events.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/events.rs#L88-L91) | `{ keyword, count }` |
| `compare_progress` | [comparer/mod.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/comparer/mod.rs) | `{ current, total }` |
| `ai_progress` | [ai/mod.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/ai/mod.rs) | `{ message, received_bytes, streaming_content }` |
| `download_progress` | [downloader/mod.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/downloader/mod.rs) | `{ task_id, progress, speed, eta }` |
| `download_complete` | [session.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/downloader/session.rs) | `{ success, failed, success_list, failed_list }` |
| `download_error` | [download.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/commands/download.rs) | `string` |
| `playwright_install_progress` | [playwright.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/commands/playwright.rs) | `{ message, status, is_network_error? }` |

### 2.4 数据流

**搜索流**

```
SearchView ──invoke(search_comics)──▶ commands/search.rs
  ├─▶ 派生 node search_with_playwright.js（第 1 页拿总页数）
  ├─▶ thread::spawn 并发派生剩余页脚本
  ├─▶ 去重 + 按 category 过滤 "漢化"
  └─▶ save_results → cache/search_{keyword}.json
        │
        ▼
     emit search_complete  →  useSearch 收尾
```

**对比流**

```
CompareView ──invoke(compare_comics)──▶ commands/compare.rs
  ├─▶ read_search_results(cache/search_*.json)
  ├─▶ Comparer.compare
  │     ├─▶ Scanner::scan_local（递归扫描 zip/rar/cbz/cbr/7z + 含 3+ 图片的文件夹）
  │     └─▶ AiMatcher::match_comics
  │           ├─ Phase 1: local_match（Levenshtein + 前缀清洗）
  │           └─ Phase 2: 仅对未匹配项调用 AI API（SSE 流式，每批 20 条）
  └─▶ save_compare_result_sync → cache/compare_*.json
```

**下载流**

```
DownloadView ──invoke(start_download)──▶ commands/download.rs
  ├─▶ create_session(session_id)
  └─▶ tokio::spawn DownloadSession::run
        ├─▶ tokio::sync::Semaphore 控并发
        ├─▶ 对每个任务循环：
        │     ├─ fetch_download_info（派生 get_download_info.js）
        │     ├─ download_file
        │     │   ├─ "server2" → reqwest 直连 dl1.wn01.download
        │     │   └─ "worker_api" → 派生 download_via_playwright.js
        │     └─ 重命名 .temp → 最终文件
        └─▶ emit download_complete + 系统通知
```

---

## 3. 目录结构

```
wnacg-download/
├── AGENTS.md                # AI 助手工作指南（最高优先级规则）
├── CODE_WIKI.md             # 本文档（代码实现现状）
├── README.md
├── package.json             # 前端依赖、脚本
├── vite.config.ts / vitest.config.ts / tsconfig.json
├── eslint.config.js / .prettierrc.json
├── index.html
├── docs/                    # 设计文档（需求 / 架构 / 界面 / 用户手册 / 项目进度）
├── scripts/                 # Playwright Node.js 脚本（由 Rust 派生）
│   ├── search_with_playwright.js
│   ├── get_download_info.js
│   └── download_via_playwright.js
├── src/                     # Vue 前端
│   ├── main.ts / App.vue / env.d.ts
│   ├── components/          # Sidebar, Skeleton, ToastNotification
│   ├── views/               # SearchView, CompareView, DownloadView, ConfigView
│   ├── composables/         # useSearch, useCompare, useDownload,
│   │                        # useConfig, useDownloadQueue, useToast
│   ├── types/index.ts       # 前端类型定义
│   └── utils/format.ts      # 通用工具（含 vitest 测试）
└── src-tauri/               # Rust + Tauri 桌面壳
    ├── Cargo.toml / Cargo.lock / build.rs
    ├── tauri.conf.json      # 主窗口、打包、插件配置
    ├── capabilities/default.json  # Tauri 2 权限声明
    ├── icons/               # 多平台应用图标
    └── src/
        ├── main.rs          # Tauri 入口、托盘、命令注册
        ├── config.rs        # 配置文件读写
        ├── error.rs         # AppError 枚举
        ├── events.rs        # 事件结构与发射函数
        ├── notification.rs  # 系统通知封装
        ├── types.rs         # 公共类型
        ├── commands/        # search/compare/download/config/playwright
        └── core/            # 业务核心：downloader/comparer/scanner/ai/scraper
```

---

## 4. 后端模块详解

### 4.1 入口：[main.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/main.rs)

- 启用四个插件：`shell` / `fs` / `dialog` / `notification`。
- `setup` 阶段调用 [load_config](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/config.rs#L27-L41) 预加载配置（不存在则写入默认配置）。
- 通过 [TrayIconBuilder](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/main.rs#L62-L85) 创建系统托盘，菜单项为「显示窗口 / 退出」，托盘点击恢复主窗口。
- 注册 22 个 Tauri 命令（配置、搜索、对比、下载、Playwright、窗口控制）。
- 提供三个窗口控制命令 [window_minimize / window_maximize / window_close](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/main.rs#L19-L37)。注意 `window_close` 实际是 `hide()`，关闭按钮变为最小化到托盘。

### 4.2 配置：[config.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/config.rs) + [AppConfig](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/types.rs#L218-L288)

| 函数 | 作用 |
|------|------|
| `get_config_path()` | 解析 `{exe_dir}/config/config.json`，目录不存在时自动创建 |
| `load_config()` | 文件不存在则写入 `AppConfig::default()` 并返回 |
| `save_config(&AppConfig)` | 以 `serde_json::to_string_pretty` 序列化保存 |
| `reset_config()` | 覆写为默认配置 |

`AppConfig` 关键字段（共 20+ 项）：`storage_path`、`proxy` / `proxy_enabled`、`max_pages`（0 = 不限）、`request_interval`（默认 1000ms）、`search_chinese_only`、`concurrent_downloads`（默认 3）、`retry_times` / `retry_interval`、`ai_api_url` / `ai_api_key` / `ai_model` / `ai_prompt` / `ai_temperature`、`match_threshold`（默认 0.8）、`theme`（light/dark/auto）、`download_source_preference`（server2 / worker_api / auto，默认 server2）、`use_system_chrome`。所有字段都通过 `#[serde(default = "...")]` 提供向后兼容默认值。

### 4.3 类型：[types.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/types.rs)

按子模块组织：

- `comic`：`Comic`（网站漫画）、`LocalComic`（本地漫画）。
- `search`：`SearchOptions`、`SearchResult`。
- `download`：`DownloadTask`、`DownloadOptions`、`DownloadProgress`、`DownloadResult`、`FailedComic`。
- `compare`：`CompareResult`、`MatchDetail`、`AiMatchResult`（内部，不导出到前端）。
- `config`：`AppConfig`、`CompareHistoryEntry`。

### 4.4 错误：[error.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/error.rs)

使用 `thiserror` 定义 [AppError](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/error.rs#L7-L32)，含 8 个变体：`NetworkError`（封装 `reqwest::Error`）、`IoError`、`JsonError`、`ParseError`、`AiError`、`ConfigError`、`DownloadError`、`Unknown`。同时提供 `From<String>` / `From<&str>` 便捷转换。

### 4.5 事件：[events.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/events.rs)

定义 7 个事件结构体并对应封装 emit 函数。`emit_download_progress` 与 `emit_download_complete` 优先通过主窗口（`get_webview_window("main")`）发射，保证前端能稳定收到；找不到窗口时回退 `AppHandle::emit` 广播。

### 4.6 通知：[notification.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/notification.rs)

封装 `tauri-plugin-notification`：通用 `send_notification`、`send_download_complete`（根据成败统计生成中文文案）、`send_error_notification`（暂未调用）。

### 4.7 命令层 `src-tauri/src/commands/`

| 文件 | 命令 | 说明 |
|------|------|------|
| [config.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/commands/config.rs) | `get_config` / `save_config` / `reset_config` / `get_default_save_path` / `open_folder` | 配置读写；`open_folder` 在 Win/macOS/Linux 上分别调用 `explorer/open/xdg-open` |
| [search.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/commands/search.rs) | `search_comics` | 派生 Playwright 脚本爬取所有页面，去重 + 汉化过滤 + 保存 |
| [compare.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/commands/compare.rs) | `compare_comics` / `save_compare_result` / `load_compare_result` / `get_download_info` | 读 cache JSON、本地扫描 + AI 兜底匹配、对比结果持久化 |
| [download.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/commands/download.rs) | `start_download` / `pause_download` / `resume_download` / `cancel_task` / `get_download_status` | 创建会话→`tokio::spawn` 后台执行→回调时发送通知 |
| [playwright.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/commands/playwright.rs) | `check_playwright_installed` / `install_playwright` / `check_system_chrome` | 检查 `~/Library/Caches/ms-playwright/chromium-*`；通过 `npx playwright install chromium` 流式安装并推送进度事件 |

#### `search_comics` 关键流程（[search.rs:28-182](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/commands/search.rs#L28-L182)）

1. 向上探查 `package.json` 找到项目根目录（最多 10 层），拼出 `scripts/search_with_playwright.js`。
2. 首先抓第 1 页拿 `total_pages`。
3. `thread::spawn` 并发抓剩余页（注意是 OS 线程而非 tokio task）。
4. `AtomicU32::fetch_add` 维护已完成页数并通过 `app.emit("search_progress", ...)` 推送进度。
5. 用 `HashSet<aid>` 去重；若 `search_chinese_only` 则按 `category.contains("漢化")` 过滤。
6. 通过 `WNACG_CONFIG_PATH` 环境变量把配置路径透传给 Node 脚本，供脚本读取 `use_system_chrome`。

#### `compare_comics` 关键流程（[compare.rs:68-114](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/commands/compare.rs#L68-L114)）

读取 `cache/search_*.json` → 构造 [AiMatcher](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/ai/mod.rs) → 包装为 [Comparer](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/comparer/mod.rs) → `.compare()` → 自动持久化结果到 `cache/compare_{keyword}_{YYYYMMDD_HHMMSS}.json`。

### 4.8 核心层 `src-tauri/src/core/`

#### (a) [scanner/mod.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/scanner/mod.rs) · `Scanner::scan_local`

- 处理 SMB（macOS 必须先挂载，否则报错指引用户）/ UNC / 普通路径。
- 递归扫描：扩展名 ∈ `{zip, rar, cbz, cbr, 7z}` → `extract_comic_from_archive`；含 ≥3 张图片（`jpg/jpeg/png/gif/webp`）的文件夹 → `extract_comic_info`；否则继续递归。
- [clean_title](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/scanner/mod.rs#L120-L133) 清除 HTML 实体并压缩空白，**保留前缀**（如 `[TYPE.90]`），由 AI 匹配阶段的 `clean_title_prefix` 单独处理。
- 自带 10+ 个 `#[cfg(test)]` 单元测试，覆盖各类 HTML 实体与边界条件。

#### (b) [ai/mod.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/ai/mod.rs) · `AiMatcher`

两阶段匹配核心：

- **Phase 1 · [local_match](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/ai/mod.rs#L680-L762)**：对每个网站漫画，遍历未占用的本地漫画，调用 [calculate_similarity](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/ai/mod.rs#L765-L791)。算法：
  - 完全相等 → 1.0；包含关系 → `min/max * 0.9`；否则 → `1 - levenshtein / max_len`。
  - 比较前用 [clean_title_prefix](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/ai/mod.rs#L822-L825) 移除 `[…]` `(…)` `【…】` 等任意层数前缀。
  - 置信度 ≥ `match_threshold`（默认 0.8）即标记 `already_have`。
- **Phase 2 · [match_comics_for_subset](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/ai/mod.rs#L193-L228)**：仅对未匹配项以 `BATCH_SIZE = 20` 分批调用 OpenAI 兼容 API。
  - [call_ai_api](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/ai/mod.rs#L241-L354)：拼接 `chat/completions` 路径，POST `stream: true` 请求，SSE 解析失败自动降级为非流式。
  - [read_stream_response](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/ai/mod.rs#L357-L432)：按 `data:` 分行解析，把 `choices[0].delta.content` 通过 `ai_progress` 事件的 `streaming_content` 增量推给前端。
  - [parse_ai_response](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/ai/mod.rs#L435-L463)：三级降级——`serde_json` 直解 → [fix_incomplete_json](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/ai/mod.rs#L545-L580)（自动补全 `}` / `]`、截到最后一个完整对象）→ 正则 [extract_matches_from_text](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/ai/mod.rs#L583-L628)。
- **AI API 未配置或全部本地匹配命中时自动跳过 AI 调用**，未匹配项默认为 `need_download`，不会丢漫画。

#### (c) [comparer/mod.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/comparer/mod.rs) · `Comparer`

仅做编排：`Scanner::scan_local` → `AiMatcher::match_comics` → 按 `match_type` 统计 → 返回 `CompareResult`。所有进度通过 `emit_compare_progress` / `emit_ai_progress` 上报。

#### (d) [downloader/mod.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/downloader/mod.rs) · `Downloader` + [session.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/downloader/session.rs) · `DownloadSession`

| 关键函数 | 作用 |
|----------|------|
| `Downloader::new(DownloaderConfig)` | 构建 reqwest `Client`（300s 超时、伪装 Chrome UA、可选代理） |
| `Downloader::download_single` | 单漫画下载主循环，遇错按 `retry_times`/`retry_interval` 重试，每次重试都重新调 Playwright 拿新链接 |
| `Downloader::fetch_download_info` | 派生 [get_download_info.js](file:///Users/szd/Documents/Code/wnacg-download/scripts/get_download_info.js) 取 `(file_key, file_name, server2_url)` |
| `Downloader::download_file` | 按 `download_source_preference` 分支：`worker_api` → `download_file_via_playwright`；其他 → `download_file_inner` |
| `Downloader::download_file_inner` | reqwest 流式下载，支持 `Range` 断点续传、`Referer` 伪造、`Content-Length` 校验、`bytes_stream` + `emit_download_progress` 节流推进度 |
| `Downloader::download_file_via_playwright` | 派生 [download_via_playwright.js](file:///Users/szd/Documents/Code/wnacg-download/scripts/download_via_playwright.js)，单浏览器一步完成「调 Worker API → 浏览器内下载」 |
| `DownloadSession` | 持有 `paused: AtomicBool` + `handles: HashMap<aid, JoinHandle>`；`run()` 启动批量任务（Semaphore 控并发），暂停时通过 100ms 轮询让位 |
| 全局 `SESSIONS` | `LazyLock<Mutex<HashMap<String, Arc<DownloadSession>>>>` 单例，供 `start/pause/resume/cancel_task` 命令查询 |

下载完整性校验：[download_file_inner](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/downloader/mod.rs#L428-L571) 会比较 `actual_downloaded == expected_downloaded`，不等则返回 `DownloadError`，触发上层重试。

#### (e) [scraper/mod.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/scraper/mod.rs)（**遗留，已废弃**）

基于 reqwest + scraper 的 HTTP 爬虫，整文件 `#[allow(dead_code)]`。包含完整的 `cate_class_to_category` 映射表、`parse_total_pages`、`parse_comic_card` 等实现。生产搜索流程已迁移到 Playwright 脚本，此模块未被 `commands/search` 引用，但保留作为参考与潜在回退方案。

---

## 5. 前端模块详解

### 5.1 入口：[App.vue](file:///Users/szd/Documents/Code/wnacg-download/src/App.vue) + [main.ts](file:///Users/szd/Documents/Code/wnacg-download/src/main.ts)

- 单 `currentView` ref 在 `Sidebar` 与四个 View 之间切换（无 vue-router）。
- 通过 `provide` 暴露：
  - `switchView(viewId)` —— 让任意子视图跳转。
  - `notify` —— `{ success, error, info }`，全局通知方法，配合 `ToastNotification` 渲染。
- 注册全局快捷键：`Ctrl+1/2/3/4` 切视图、`Ctrl+D` 切暗色、`Ctrl+S` 搜索框聚焦、`Esc` 关闭模态。
- 通过 CSS 变量 + `[data-theme="dark"]` 选择器支持亮/暗双主题；紫色渐变主色 `#667eea → #764ba2`。

### 5.2 组件 `src/components/`

| 文件 | 职责 | Props / Emits |
|------|------|---------------|
| [Sidebar.vue](file:///Users/szd/Documents/Code/wnacg-download/src/components/Sidebar.vue) | 左侧导航 + 主题切换按钮（auto→dark→light 循环），监听 `prefers-color-scheme` | Props: `currentView`；Emits: `view-change` |
| [Skeleton.vue](file:///Users/szd/Documents/Code/wnacg-download/src/components/Skeleton.vue) | 通用骨架占位条 | Props: `width`、`height` |
| [ToastNotification.vue](file:///Users/szd/Documents/Code/wnacg-download/src/components/ToastNotification.vue) | 右上角 Toast 容器，渲染 `useToast.toasts` | — |

### 5.3 Composables（`src/composables/`）

| Composable | 关键状态 | 关键方法 | Tauri 调用 |
|------------|----------|----------|------------|
| [useSearch.ts](file:///Users/szd/Documents/Code/wnacg-download/src/composables/useSearch.ts) | `results`, `isSearching`, `progress`, `total`, `error` | `search(keyword, options)` | invoke `search_comics`；listen `search_progress` |
| [useCompare.ts](file:///Users/szd/Documents/Code/wnacg-download/src/composables/useCompare.ts) | `isComparing`, `result`, `aiLog`, `aiStreamingContent`, `error` | `compare(searchFile, localPath)`、`cleanup()` | invoke `compare_comics`；listen `ai_progress` |
| [useDownload.ts](file:///Users/szd/Documents/Code/wnacg-download/src/composables/useDownload.ts) | `isDownloading`, `isPaused`, `progress`, `speed`, `result`, `sessionId`, `taskProgress` | `startDownload`, `pauseDownload`, `resumeDownload`, `cancelTask`, `resetDownload` | invoke `start_download/pause_download/resume_download/cancel_task`；listen `download_progress/complete/error` |
| [useConfig.ts](file:///Users/szd/Documents/Code/wnacg-download/src/composables/useConfig.ts) | `config`, `isDirty`, `isSaving`, `lastSavedAt`, `validationErrors` | `loadConfig`, `saveConfig`, `resetConfig`, `updateField`（防抖 800ms / AI Prompt 1500ms）, `flushPendingSave` | invoke `get_config/save_config/reset_config` |
| [useDownloadQueue.ts](file:///Users/szd/Documents/Code/wnacg-download/src/composables/useDownloadQueue.ts) | 模块级单例 `downloadQueue: Ref<DownloadTask[]>` | `addToQueue`, `removeFromQueue`, `clearQueue`（按 aid 去重） | 无 |
| [useToast.ts](file:///Users/szd/Documents/Code/wnacg-download/src/composables/useToast.ts) | 模块级单例 `toasts` | `add`, `remove`, `success`, `error`, `info` | 无 |

> ⚠️ **重要**：`useDownload.startDownload` 会**先注册 listener 再发起 invoke**，避免下载极快完成时事件丢失。

### 5.4 Views（`src/views/`）

#### (a) [SearchView.vue](file:///Users/szd/Documents/Code/wnacg-download/src/views/SearchView.vue)

- 搜索 + 浏览历史 + 选中加入队列。
- onMounted 调用 `check_playwright_installed` + `check_system_chrome` + `get_config` 做浏览器预检；若未安装且未启用系统 Chrome，则通过 `switchView('config')` 引导到配置页。
- 用 `@tauri-apps/plugin-fs` 直接读取 `cache/search_*.json` 渲染历史列表，用 `@tauri-apps/plugin-shell` 的 `open` 在外部浏览器查看漫画详情。
- defineExpose `{ searchInput }` 配合 App 的 `Ctrl+S` 快捷键。

#### (b) [CompareView.vue](file:///Users/szd/Documents/Code/wnacg-download/src/views/CompareView.vue)

- 选择 `cache/search_*.json` + 本地目录（`plugin-dialog` 的 `open`）→ 触发对比。
- 实时显示 AI 流式输出（`aiStreamingContent`）+ 日志（`aiLog`）。
- 支持加载 `cache/compare_*.json` 历史；`isViewingHistory` 模式下禁用部分操作。
- `needDownload` 按 confidence 升序、`alreadyHave` 按 confidence 降序展示。
- 内置一组高亮辅助：`cleanTitle`、`highlightMatch`、`getLongestCommonSubsequence`、`escapeHtml`，用于标题差异高亮。
- 本地路径用 `localStorage` 持久化（key: `compare-local-path`）。

#### (c) [DownloadView.vue](file:///Users/szd/Documents/Code/wnacg-download/src/views/DownloadView.vue)

- 渲染下载队列、保存路径来源（`config.storage_path` > 任务 `save_path` > 默认 cwd）、整体与单任务进度。
- 暂停/恢复/取消单任务/重试失败/打开文件夹（invoke `open_folder`）。
- onMounted 通过 `get_default_save_path` 拉取默认路径。

#### (d) [ConfigView.vue](file:///Users/szd/Documents/Code/wnacg-download/src/views/ConfigView.vue)

- 分区表单：存储 / 搜索 / 浏览器 / 网络 / 下载 / 外观 / AI。
- 字段级实时校验 + 防抖自动保存（无需「保存」按钮）。
- Playwright 状态检测、安装按钮，listen `playwright_install_progress` 渲染流式安装日志。

### 5.5 类型 [src/types/index.ts](file:///Users/szd/Documents/Code/wnacg-download/src/types/index.ts)

完整镜像后端 `serde` 序列化字段（`snake_case`），共 12 个接口：`Comic`、`LocalComic`、`SearchOptions`、`SearchResult`、`DownloadTask`、`DownloadProgress`、`DownloadResult`、`FailedComic`、`CompareResult`、`MatchDetail`、`CompareHistoryEntry`、`AppConfig`。

---

## 6. Playwright 脚本 `scripts/`

三个脚本均遵循统一契约：

- 入参：命令行参数。
- 出参：**stdout 单行 JSON** 由 Rust 解析；stderr 仅用于人类可读的进度日志。
- 浏览器：`chromium.launch({ headless: false, args: ['--no-first-run', '--no-default-browser-check'] })`。

| 脚本 | 入参 | 关键流程 | stdout 字段 |
|------|------|----------|-------------|
| [search_with_playwright.js](file:///Users/szd/Documents/Code/wnacg-download/scripts/search_with_playwright.js) | `<keyword> [page]` | 读 `WNACG_CONFIG_PATH` → 按 `use_system_chrome` 探测系统 Chrome 或回退内置 Chromium → 打开 `wnacg.com/search/index.php?...` → 提取 `div.pic_box` 卡片 + 总页数 | `{ success, comics[], total_pages, page }` |
| [get_download_info.js](file:///Users/szd/Documents/Code/wnacg-download/scripts/get_download_info.js) | `<aid>` | 打开 `wnacg.com/download-index-aid-{aid}.html` → 扫描 `<script>` 提取 `FILE_KEY`/`FILE_NAME` + 解析 Server 2 直链 | `{ success, file_key, file_name, server2_url }` |
| [download_via_playwright.js](file:///Users/szd/Documents/Code/wnacg-download/scripts/download_via_playwright.js) | `<file_key> <file_name> <output_path>` | 浏览器内 `fetch POST https://d1.wcdn.date/api/generate-link` 获取临时链接 → `page.goto(downloadUrl)` 触发 `download` 事件 → `download.saveAs(outputPath)` | `{ success, size, path }` |

**为什么需要 Playwright**：绕过 Cloudflare TLS 指纹。`dl1.wn01.download`（Server 2）相对宽松可被 reqwest 直连；`d1.wcdn.date`（Worker API）必须使用浏览器 TLS 指纹与 Cookie 才能通过，因此用 Playwright 在浏览器上下文里发起请求和下载。

### 分类映射表

| CSS 类 | 分类 | CSS 类 | 分类 |
|--------|------|--------|------|
| cate-1 | 同人誌／漢化 | cate-14 | 雜誌&短篇／日語 |
| cate-2 | 同人誌／CG畫集 | cate-16 | 同人誌／English |
| cate-3 | 寫真 & Cosplay | cate-17 | 單行本／English |
| cate-5 | 同人誌 | cate-18 | 雜誌&短篇／English |
| cate-6 | 單行本 | cate-19 | 韓漫 |
| cate-7 | 雜誌&短篇 | cate-20 | 韓漫／漢化 |
| cate-9 | 單行本／漢化 | cate-21 | 韓漫／生肉 |
| cate-10 | 雜誌&短篇／漢化 | cate-22 | 3D&漫畫 |
| cate-12 | 同人誌／日語 | cate-23 | 3D&漫畫／漢化 |
| cate-13 | 單行本／日語 | cate-24 | 3D&漫畫／其他 |
|  |  | cate-37 | AI&圖集 |

---

## 7. Tauri 配置与权限

### 7.1 [tauri.conf.json](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/tauri.conf.json)

- `productName = "WNACG Downloader"`, `identifier = com.wnacg.downloader`, `version = 4.0.0`。
- `frontendDist = ../dist`, `devUrl = http://localhost:5173`, `beforeDevCommand = npm run dev:frontend`, `beforeBuildCommand = npm run build:frontend`。
- 主窗口：1200×800、最小 900×600、可拉伸、居中、使用系统标题栏（未设置 `decorations`）；隐式 label = `main`。
- `app.withGlobalTauri = true`，前端可使用 `window.__TAURI__`。
- 插件：`plugins.shell.open = true`。
- 打包：Windows 使用 NSIS（currentUser，简中/英双语选择器）；macOS 使用 DMG 并预置 Applications 拖拽位。

### 7.2 [capabilities/default.json](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/capabilities/default.json)

`local: true`，仅作用于 `windows: ["main"]`。授予的权限：

- `core:default`
- `shell:allow-open`
- `fs:default` + 作用域限定到 `$RESOURCE/**` 和 `$APPDATA/**` 的 `read-dir / read-text-file / remove / stat`
- `dialog:default`
- 通知插件全套：`notification:default / allow-is-permission-granted / allow-request-permission / allow-notify / allow-check-permissions / allow-show`

> ⚠️ **设计意图**：前端写操作均通过 Rust 后端命令完成，所有 fs 权限均为只读型且受 scope 限制，遵循最小权限原则。`cache/` 与 `config/` 在 `{exe_dir}` 下，不在 capability 的 fs scope 内，因此前端只能通过命令读取这两个目录的内容。

---

## 8. 依赖关系

### 8.1 前端运行时依赖

```
@tauri-apps/api ^2          # invoke / event / window
@tauri-apps/plugin-dialog   # 文件夹选择
@tauri-apps/plugin-fs       # 读取 cache/*.json
@tauri-apps/plugin-shell    # 打开外部 URL
playwright ^1.59            # 脚本运行时（由 Node 子进程使用）
vue ^3.5
```

### 8.2 前端构建/工具

`vite 8` · `@vitejs/plugin-vue 6` · `vue-tsc 2` · `typescript 5.3` · `eslint 10` + `vue-eslint-parser 10` + `@typescript-eslint 8` · `prettier 3.8` · `vitest 1` · `jsdom 26`

### 8.3 Rust 后端依赖（[Cargo.toml](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/Cargo.toml)）

```
tauri 2 (features=["tray-icon"]) + tauri-plugin-{shell, fs, dialog, notification} 2
serde 1 / serde_json 1
tokio 1 (full)
reqwest 0.11 (json, socks, cookies, stream) + reqwest_cookie_store 0.6 + cookie_store 0.20
futures-util 0.3
scraper 0.18              # 仅遗留模块使用
thiserror 1 / anyhow 1
chrono 0.4
uuid 1
regex 1
```

### 8.4 release 构建优化

`panic = "abort"` + `lto = true` + `codegen-units = 1` + `opt-level = "s"` + `strip = true`，最小化二进制体积。

### 8.5 内部依赖图

```
commands::search ─┬─▶ scripts/search_with_playwright.js
                  └─▶ events::emit_search_*

commands::compare ─▶ core::comparer
                       ├─▶ core::scanner
                       └─▶ core::ai
                            └─▶ reqwest (AI HTTP) / events::emit_ai_progress

commands::download ─▶ core::downloader::session
                       └─▶ core::downloader::Downloader
                              ├─▶ scripts/get_download_info.js
                              ├─▶ scripts/download_via_playwright.js
                              ├─▶ reqwest 直连 dl1.wn01.download
                              └─▶ events::emit_download_*

commands::playwright ─▶ npx playwright install chromium

commands::config ─▶ config::{load,save,reset}_config ─▶ {exe_dir}/config/config.json
```

---

## 9. 运行与开发

### 9.1 前置条件

- Node.js ≥ 18（package.json `engines`）
- Rust ≥ 1.75.1
- Windows 需 Visual Studio Build Tools
- macOS / Linux 需具备 Xcode CLI / 对应系统依赖
- 首次使用前在「配置页 → 浏览器」点击「安装 Playwright Chromium」，或勾选「使用系统 Chrome」（macOS 自动探测 `/Applications/Google Chrome.app`）

### 9.2 常用命令

```bash
# 开发
npm run dev                  # 完整 Tauri 开发模式（同启 Vite + 桌面应用）
npm run dev:frontend         # 仅 Vite dev server（端口 5173）

# 构建
npm run build                # 生产构建（前端 + Rust，打包桌面安装包）
npm run build:frontend       # 仅类型检查 + 前端 bundle

# 测试与规范
npm test                     # vitest 一次性运行
npm run test:watch           # vitest 监听模式
npm run lint                 # ESLint 检查 src/**/*.{ts,vue}
npm run format               # Prettier 写入 src

# Rust（src-tauri/ 目录下）
cargo build                  # 调试构建
cargo build --release        # 发布构建
cargo test                   # 跑 Rust 单元测试（downloader / scanner / ai）
```

### 9.3 配置与缓存位置

- 配置：`{exe_dir}/config/config.json`
- 缓存：`{exe_dir}/cache/`
  - `search_{keyword}.json` —— 单次搜索结果（每次覆盖）
  - `compare_{keyword}_{timestamp}.json` —— 一次性快照，作为「对比历史」展示

### 9.4 关键运行注意事项

1. **Playwright 浏览器必须先安装**：未安装时搜索/下载会失败。Cache 路径：`~/Library/Caches/ms-playwright/`（macOS）。
2. **代理**：reqwest 与 AI HTTP 都会读取 `proxy` + `proxy_enabled`；Playwright 脚本目前不读取代理设置，如需翻墙下载请配置系统代理。
3. **Cloudflare**：必走 Playwright 的接口为 `d1.wcdn.date` Worker API；`dl1.wn01.download` 可被 reqwest 直连，因此默认 `download_source_preference = "server2"`，最快也最稳。
4. **关闭按钮 = 隐藏到托盘**：`window_close` 命令调用 `window.hide()`，需通过托盘菜单的「退出」彻底结束进程。
5. **首次启动**：若配置文件不存在，会写入内置默认配置（含默认 AI API 地址与示例 key，请按需替换）。

### 9.5 调试技巧

- 后端日志通过 `println!` 输出，开发模式下可在终端看到带 emoji 前缀的中文日志（如「⬇️ 开始下载」「✅ 对比完成」）。
- 前端通过 `useToast.error/info/success` 推送 Toast；并配合 ChromeDevTools（Tauri 开发模式下右键检查）查看 console。
- 若搜索/下载失败，优先检查 Playwright 脚本是否能独立运行：`node scripts/search_with_playwright.js 关键词 1`，可直接看到 stderr 调试日志与 stdout JSON。
- AI 匹配若反复失败，可临时清空 `ai_api_key`，让系统自动降级为「纯本地匹配」模式。

---

## 10. 测试

- **前端**（Vitest）：
  - [src/composables/__tests__/useDownloadQueue.test.ts](file:///Users/szd/Documents/Code/wnacg-download/src/composables/__tests__/useDownloadQueue.test.ts) —— 队列增/去重/删/清空/引用语义
  - [src/utils/__tests__/format.test.ts](file:///Users/szd/Documents/Code/wnacg-download/src/utils/__tests__/format.test.ts) —— 通用格式化工具
- **Rust**（`cargo test`，`#[cfg(test)]` 嵌入源文件）：
  - `core::scanner::tests` —— `clean_title` 11+ 用例覆盖 HTML 实体、空白、混合场景
  - `core::downloader::tests` —— `decode_html_entities` 与 `get_server2_url` 协议补全
  - `core::ai::tests` —— `levenshtein_distance` 等基础算法验证

运行：`npm test`（前端）/ `cargo test`（src-tauri/）。

---

## 11. 开发规范摘要（详见 [AGENTS.md](file:///Users/szd/Documents/Code/wnacg-download/AGENTS.md)）

- **语言**：所有注释、日志、用户提示一律使用中文。
- **TypeScript**：严格模式 + `noUnusedLocals/Parameters`；类型集中放 `types/index.ts`；禁用 `any`。
- **Vue**：`<script setup>` + `<style scoped>`；组件 PascalCase；状态用 `ref/reactive`。
- **Rust**：错误用 `thiserror`；异步用 `async/await`；中文错误消息；release 配置力求二进制最小化。
- **Git**：Conventional Commits（`feat: / fix: / docs: / refactor: ...`），主题用中文，简洁明确。
- **完成准则**：开发完成后必须运行 `npm run lint`、`npm run build:frontend`、`cargo build`，确保无类型/编译错误。

---

## 12. 拓展路线

仓库中部分模块/字段已为未来拓展预留：

- [scraper/mod.rs](file:///Users/szd/Documents/Code/wnacg-download/src-tauri/src/core/scraper/mod.rs) 完整保留 reqwest 爬虫，可作为「无浏览器后备」方案重新启用。
- `download_source_preference` 已预留 `auto` 选项（当前默认 fallback 到 server2），未来可加入「优先 server2，失败自动切 worker_api」的智能切换。
- `AiMatcher` 的 SSE 解析层把流式增量经 `streaming_content` 暴露给前端，可在 Compare 视图加入「打字机风格」AI 思维链展示。
- `commands/mod.rs` 与 `core/mod.rs` 都是 `pub mod` 聚合点，新增功能时只需在此挂载新子模块。

---

**文档维护**：当 `commands/*.rs` 注册新命令、`events.rs` 新增事件或 `AppConfig` 新增字段时，请同步更新本文 §2.3、§4.7、§4.2。
