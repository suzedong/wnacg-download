# WNACG Downloader - 架构设计文档

## 概述

本文档描述 WNACG Downloader 的技术架构，包括：
- **整体架构**：Tauri 2 桌面应用
- **前端架构**：Vue 3 + TypeScript
- **后端架构**：Rust + Tokio
- **通信机制**：Tauri Commands + Events
- **桌面集成**：系统窗口、系统托盘、暗色模式

---

## 1. 整体架构

### 1.1 技术栈

```
┌─────────────────────────────────────────────────────────┐
│                    桌面应用                              │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  前端（Vue 3 + TypeScript）                        │ │
│  │  ├── components/     # UI 组件                    │ │
│  │  ├── views/          # 页面组件                   │ │
│  │  ├── composables/    # 组合式函数                 │ │
│  │  └── styles/         # 样式                       │ │
│  └─────────────────────┬─────────────────────────────┘ │
│                        │ Tauri IPC                     │
│  ┌─────────────────────┴─────────────────────────────┐ │
│  │  后端（Rust）                                      │ │
│  │  ├── commands/         # Tauri Commands            │ │
│  │  ├── core/             # 核心业务逻辑              │ │
│  │  │   ├── downloader/     # 下载模块                  │ │
│  │  │   ├── comparer/       # 对比模块                  │ │
│  │  │   ├── scanner/        # 扫描模块                  │ │
│  │  │   └── ai/             # AI 匹配模块               │ │
│  │   ├── config/           # 配置管理                  │ │
│  │   └── events/           # 事件定义                  │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
项目根目录/
├── src/                          # 前端（Vue 3）
│   ├── components/               # UI 组件
│   ├── views/                    # 页面组件
│   ├── composables/              # 组合式函数
│   ├── types/                    # 类型定义
│   ├── App.vue                   # 主组件
│   └── main.ts                   # 入口
├── dist/                         # 构建产物
│
├── scripts/                      # 脚本目录
│   ├── search_with_playwright.js # Playwright 搜索脚本
│   ├── get_download_info.js      # Playwright 获取下载页信息
│   └── download_via_playwright.js # Playwright 浏览器直接下载（绕过 Cloudflare）
│
├── src-tauri/                    # Tauri 应用（主目录）
│   ├── src/
│   │   ├── main.rs               # 入口
│   │   ├── commands/             # Tauri Commands
│   │   │   ├── mod.rs
│   │   │   ├── search.rs         # 搜索命令（Playwright）
│   │   │   ├── compare.rs        # 对比命令
│   │   │   ├── download.rs       # 下载命令
│   │   │   └── config.rs         # 配置命令（含 open_folder）
│   │   ├── core/                 # 核心业务逻辑
│   │   │   ├── mod.rs
│   │   │   ├── downloader/       # 下载
│   │   │   ├── comparer/         # 对比
│   │   │   ├── scanner/          # 扫描
│   │   │   └── ai/               # AI 匹配
│   │   ├── config.rs             # 配置管理
│   │   ├── events.rs             # 事件定义
│   │   ├── types.rs              # 类型定义
│   │   └── error.rs              # 错误类型
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── ...
│
├── docs/                         # 文档
└── ...
```

---

## 2. 前端架构

### 2.1 技术栈
- **框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **状态管理**：Vue Composition API（ref/reactive）
- **路由**：无需路由（单页应用，通过组件切换）

### 2.2 组件结构

```
src/
├── components/                  # 可复用组件
│   └── Sidebar.vue             # 侧边栏导航
│
├── views/                       # 页面组件
│   ├── SearchView.vue          # 搜索页面
│   ├── CompareView.vue         # 对比页面
│   ├── DownloadView.vue        # 下载页面
│   └── ConfigView.vue          # 配置页面
│
├── composables/                 # 组合式函数
│   ├── useSearch.ts            # 搜索逻辑
│   ├── useDownload.ts          # 下载逻辑
│   ├── useCompare.ts           # 对比逻辑
│   ├── useConfig.ts            # 配置逻辑
│   └── useDownloadQueue.ts     # 下载队列逻辑
│
├── types/                       # 类型定义
│   └── index.ts
│
├── App.vue                     # 主组件
└── main.ts                     # 入口
```

### 2.3 状态管理

使用 Vue 3 Composition API 管理状态：

```typescript
// composables/useSearch.ts
import { ref } from 'vue';
import { invoke, listen } from '@tauri-apps/api/core';

export function useSearch() {
  const results = ref<Comic[]>([]);
  const isSearching = ref(false);
  const progress = ref(0);

  async function search(keyword: string, options: SearchOptions) {
    isSearching.value = true;
    try {
      // 监听搜索进度
      const unlisten = await listen('search_progress', (event) => {
        progress.value = event.payload.progress;
      });

      // 调用 Tauri Command
      results.value = await invoke('search_comics', { keyword, options });
      
      unlisten();
    } finally {
      isSearching.value = false;
    }
  }

  return { results, isSearching, progress, search };
}
```

---

## 3. 后端架构

### 3.1 技术栈
- **语言**：Rust
- **异步运行时**：Tokio
- **HTTP 客户端**：reqwest
- **浏览器自动化**：Playwright（通过 Node.js 脚本）
- **HTML 解析**：scraper
- **JSON 处理**：serde + serde_json
- **错误处理**：thiserror
- **目录操作**：程序目录下（config/, cache/）

### 3.2 核心模块

#### 3.2.1 搜索模块（search）

**使用 Playwright 浏览器自动化进行搜索**

```rust
// commands/search.rs
pub async fn search_comics(
    app: tauri::AppHandle,
    keyword: String,
    options: SearchOptions,
) -> Result<SearchResult, String> {
    // 1. 调用 Playwright 脚本打开第一页
    // 2. 获取总页数
    // 3. 并行调用 Playwright 脚本爬取所有剩余页面
    // 4. 去重、过滤、保存
}
```

**Playwright 脚本**（`scripts/search_with_playwright.js`）：
- 使用 Playwright 打开 Chromium 浏览器
- 提取漫画信息（`div.pic_box` 选择器）
- 返回 JSON 格式结果

**关键特性**：
- 真实浏览器，无 Cloudflare 问题
- 并行爬取（多页同时进行）
- 请求间隔控制
- 代理支持（通过 Playwright 配置）
- 标题处理（去除 `<em>` 标签和 HTML 实体）
- 分类提取（`cate-*` 类名）

#### 3.2.2 下载器模块（downloader）

```rust
// core/downloader/mod.rs
pub struct Downloader {
    client: reqwest::Client,
    config: DownloaderConfig,
}

impl Downloader {
    pub async fn download(&self, tasks: Vec<DownloadTask>) -> Result<DownloadResult> {
        // 1. 创建并发下载
        // 2. 监控进度
        // 3. 处理重试
        // 4. 校验文件
    }

    async fn download_single(&self, task: &DownloadTask) -> Result<()> {
        // 1. Playwright 提取下载信息
        // 2. 双策略获取下载链接
        // 3. 断点续传下载
    }
}
```

**获取下载地址的策略选择**（通过配置 `download_source_preference` 控制）：
1. **Server 2 直链**（推荐默认）：从下载页提取的 `server2_url`，服务器为 `dl1.wn01.download`，reqwest 直连即可
2. **Worker API**（绕过 Cloudflare）：`scripts/download_via_playwright.js` 在浏览器中调用 `d1.wcdn.date/api/generate-link` 并直接下载，绕过 TLS 指纹验证

**关键特性**：
- 并发下载（可配置数量）
- 断点续传（Server 2 支持）
- 重试机制
- 进度追踪
- 文件完整性校验

#### 3.2.3 对比器模块（comparer）

```rust
// core/comparer/mod.rs
pub struct Comparer {
    ai_matcher: AiMatcher,
}

impl Comparer {
    pub async fn compare(&self, app: &AppHandle, website_comics: &[Comic], local_path: &str) -> Result<CompareResult> {
        // 1. 扫描本地文件夹
        // 2. 本地精确/模糊匹配全部网站漫画
        // 3. 仅对未匹配的漫画调用 AI API
        // 4. AI API 未配置时，未匹配的漫画自动标记为 need_download
        // 5. 合并结果，生成对比
    }
}
```

#### 3.2.4 AI 匹配模块（ai）

```rust
// core/ai/mod.rs
pub struct AiMatcher {
    client: reqwest::Client,
    api_url: String,
    api_key: Option<String>,
    model: String,
    prompt_template: String,
    temperature: f64,
    match_threshold: f64,
}

impl AiMatcher {
    // 两阶段匹配入口：本地优先 + AI 兜底
    pub async fn match_comics(
        &self, app: &AppHandle,
        website_comics: &[Comic],
        local_comics: &[LocalComic],
    ) -> Result<AiMatchResult> {
        // Phase 1: 本地精确/模糊匹配（同步）
        // Phase 2: 仅对未匹配的漫画调用 AI（分批，每批 20 部）
    }

    fn local_match(...) -> Result<AiMatchResult> {
        // Levenshtein + 前缀清洗
    }

    async fn match_comics_for_subset(...) -> Result<AiMatchResult> {
        // AI 分批匹配 + SSE 流式
    }
}
```

**关键特性**：
- 两阶段匹配：本地精确/模糊匹配优先，AI 仅兜底未匹配漫画
- Levenshtein 距离 + 标题前缀清洗（去除 `[TYPE.90]`、`[中国翻訳]` 等）
- AI 调用分批处理（每批 20 部），SSE 流式输出
- 前端实时显示 AI 流式内容（`streaming_content` 字段）
- 全部本地匹配时跳过 AI，零 API 调用
- **AI API 未配置时**：所有未匹配的漫画自动标记为 `need_download`，不会丢失

#### 3.2.5 扫描器模块（scanner）

```rust
// core/scanner/mod.rs
pub struct Scanner;

impl Scanner {
    pub async fn scan_local(&self, path: &str) -> Result<Vec<LocalComic>> {
        // 1. 扫描文件夹
        // 2. 提取漫画信息（清理 HTML 实体）
        // 3. 返回列表
    }
}
```

### 3.3 配置管理

**配置文件路径**：程序目录下的 `config/config.json`

```rust
// config.rs
pub struct AppConfig {
    pub storage_path: String,
    pub proxy: Option<String>,
    pub proxy_enabled: bool,
    pub max_pages: u32,
    pub request_interval: u64,
    pub search_chinese_only: bool,
    pub concurrent_downloads: u32,
    pub retry_times: u32,
    pub retry_interval: u64, // 单位：秒
    pub ai_api_url: String,
    pub ai_api_key: Option<String>,
    pub ai_model: String,
    pub ai_prompt: String,
    pub ai_temperature: f64,
    pub match_threshold: f64,
    pub theme: String, // "light" 或 "dark"
    pub download_source_preference: String, // "server2" | "worker_api"
}

impl Config {
    pub fn load() -> Result<Self> {
        // 从程序目录下的 config/config.json 读取
    }

    pub fn save(&self) -> Result<()> {
        // 保存到程序目录下的 config/config.json
    }
}
```

**缓存文件路径**：程序目录下的 `cache/` 目录

### 3.4 事件系统

`events.rs` 使用独立结构体定义事件（不使用枚举）：

```rust
// events.rs — 独立 struct，各有对应的 emit 函数
pub struct SearchProgressEvent {
    current: u32, total: u32, found_count: u32,
}
pub struct DownloadProgressEvent {
    task_id: String, progress: f64, speed: f64, eta: u32,
}
pub struct CompareProgressEvent {
    current: u32, total: u32,
}
pub struct AiProgressEvent {
    message: String, received_bytes: usize,
    streaming_content: Option<String>,
}
pub struct DownloadCompleteEvent {
    success: u32, failed: u32,
    success_list: Vec<String>, failed_list: Vec<FailedComic>,
}
pub struct ErrorEvent {
    message: String,
}

// 通过 app.emit("event_name", event) 推送到前端
```

---

## 4. 通信机制

### 4.1 Tauri Commands（前端调用后端）

```rust
// commands/search.rs
#[tauri::command]
pub async fn search_comics(
    app: tauri::AppHandle,
    keyword: String,
    options: SearchOptions,
) -> Result<Vec<Comic>, String> {
    // 1. 创建爬虫
    // 2. 执行搜索
    // 3. 通过 Events 推送进度
    // 4. 返回结果
}

// commands/download.rs
#[tauri::command]
pub async fn start_download(
    app: tauri::AppHandle,
    tasks: Vec<DownloadTask>,
) -> Result<DownloadResult, String> {
    // 下载逻辑
}

// commands/compare.rs
#[tauri::command]
pub async fn compare_comics(
    app: tauri::AppHandle,
    search_file: String,
    local_path: String,
) -> Result<CompareResult, String> {
    // 对比逻辑
}

// commands/config.rs
#[tauri::command]
pub fn get_config() -> Result<Config, String> {
    // 读取配置
}

#[tauri::command]
pub fn open_folder(path: String) -> Result<(), String> {
    // 系统原生打开文件夹
}
```

### 4.2 Tauri Events（后端推送前端）

```typescript
// 前端监听事件
import { listen } from '@tauri-apps/api/event';

// 监听搜索进度
const unlisten = await listen('search_progress', (event) => {
  console.log(`进度：${event.payload.current}/${event.payload.total}`);
});

// 监听下载进度
await listen('download_progress', (event) => {
  console.log(`下载进度：${event.payload.progress}%`);
});

// 监听下载完成
await listen('download_complete', (event) => {
  console.log(`下载完成：成功 ${event.payload.success} 部`);
});
```

---

## 5. 桌面集成

### 5.1 系统窗口

使用系统原生标题栏和窗口控制按钮，无需额外配置。

### 5.2 系统托盘

Tauri 2 中托盘通过代码手动创建（不使用配置文件）：

```rust
// main.rs
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;

fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit_item])?;
    
    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| {
            if event.id() == "quit" {
                std::process::exit(0);
            }
        })
        .build(app)?;
    
    Ok(())
}
```

**托盘菜单**：
- 显示/隐藏窗口
- 退出应用

### 5.3 暗色模式

```css
/* variables.css */
:root {
  /* 亮色主题 */
  --bg-primary: #f5f7fa;
  --bg-card: rgba(255, 255, 255, 0.95);
  --text-primary: #303133;
  --text-secondary: #606266;
}

[data-theme="dark"] {
  /* 暗色主题 */
  --bg-primary: #1a1a2e;
  --bg-card: rgba(30, 30, 50, 0.95);
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
}
```

### 5.4 原生通知

```rust
// 使用 Tauri 插件发送原生通知
use tauri::Manager;

fn send_notification(app: &AppHandle, title: &str, body: &str) {
    app.notification().title(title).body(body).show().unwrap();
}
```

---

## 6. 数据流

### 6.1 搜索流程

```
前端输入关键字
  ↓
调用 search_comics Command
  ↓
后端调用 Playwright 脚本打开第一页
  ↓
获取总页数，解析第一页漫画
  ↓
并行调用 Playwright 脚本爬取所有剩余页面
  ↓
发送 search_progress Event
  ↓
解析、去重、过滤
  ↓
保存到程序目录 cache/
  ↓
返回结果到前端
  ↓
前端显示搜索结果
```

### 6.2 下载流程

```
前端添加下载任务
  ↓
调用 start_download Command
  ↓
后端创建 Downloader
  ↓
根据配置选择下载策略：
  - Server 2：reqwest 直连下载（dl1.wn01.download）
  - Worker API：单浏览器一步完成（获取链接 + 浏览器内下载，绕过 Cloudflare）
  ↓
发送 download_progress Event
  ↓
处理重试和断点续传
  ↓
校验文件完整性
  ↓
发送 download_complete Event
  ↓
返回下载结果到前端
```

### 6.3 对比流程

```
前端选择搜索结果 + 本地文件夹
  ↓
调用 compare_comics Command
  ↓
后端读取搜索结果
  ↓
扫描本地文件夹
  ↓
Phase 1: 本地精确/模糊匹配（Levenshtein + 前缀清洗）
  ↓
发送 ai_progress Event（本地匹配进度）
  ↓
Phase 2: 仅对未匹配的漫画调用 AI API（SSE 流式输出）
  ↓
发送 ai_progress Event（AI 流式内容 streaming_content）
  ↓
AI API 未配置时，未匹配的漫画自动标记为 need_download
  ↓
合并本地 + AI 匹配结果
  ↓
返回对比结果到前端
  ↓
前端显示对比结果（区分「本地」和「AI」算法标签）
```

---

## 7. 错误处理

### 7.1 Rust 错误类型

```rust
// error.rs
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("网络错误：{0}")]
    NetworkError(#[from] reqwest::Error),

    #[error("解析错误：{0}")]
    ParseError(String),

    #[error("IO 错误：{0}")]
    IoError(#[from] std::io::Error),

    #[error("AI 匹配失败：{0}")]
    AiError(String),

    #[error("配置错误：{0}")]
    ConfigError(String),

    #[error("下载错误：{0}")]
    DownloadError(String),
}
```

### 7.2 前端错误处理

```typescript
// composables/useSearch.ts
try {
  await search(keyword, options);
} catch (error) {
  // 显示错误通知
  showError(`搜索失败：${error}`);
}
```

---

## 8. 性能优化

### 8.1 后端优化
- 异步 I/O（Tokio）
- 并发爬取/下载
- 连接池复用（reqwest）
- 内存优化（流式处理）

### 8.2 前端优化
- 组件内联渲染（无独立组件文件，样式使用 `<style scoped>`）
- Vue `<style scoped>` 避免样式污染
- 图片固定尺寸 `object-fit: cover` 避免布局抖动

### 8.3 缓存策略
- 搜索结果持久化存储（程序目录 cache/ JSON 文件，每次搜索重新爬取）
- AI 匹配结果缓存
- 配置缓存（程序目录 config/ JSON 文件）
- Playwright 浏览器自动化（避免 Cloudflare 问题）

---

## 9. 安全考虑

### 9.1 配置安全
- API Key 加密存储
- 配置文件权限控制

### 9.2 网络安全
- 支持 HTTPS
- 代理支持
- 请求间隔控制（礼貌爬取）

### 9.3 文件安全
- 路径验证
- 文件权限检查
- 临时文件清理

---

**文档结束**

**最后更新**: 2026-05-17  
**版本**: v4.1（下载源策略优化版）
