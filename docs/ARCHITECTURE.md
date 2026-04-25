# WNACG Downloader - 架构设计文档

## 1. 系统概述

WNACG Downloader 是一个支持 CLI、Web 应用和桌面客户端三模式的应用程序，用于从 wnacg.com 网站搜索、对比和下载汉化漫画。

### 1.1 三架构设计

**产品形态**：
1. **CLI 工具**：命令行界面，支持脚本化、自动化操作
2. **Web 应用**：浏览器访问，跨平台，无需安装
3. **桌面客户端**：Tauri 2 打包，提供原生体验（Rust 后端）

**设计原则**：
- **核心共享**：爬虫、下载、对比、AI 匹配等核心模块完全共享
- **UI 复用**：Web 和 Tauri 共享同一套 Vue 组件
- **接口分离**：CLI、Web、Tauri 使用各自的交互接口
- **配置统一**：使用统一的配置管理系统（conf 库）
- **未来扩展**：CLI 将包装成 Skill，支持更广泛的集成

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     WNACG Downloader                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  CLI 工具    │  │  Web 应用    │  │ 桌面客户端   │            │
│  │             │  │             │  │             │            │
│  │ Commander   │  │ Express     │  │ Tauri 2     │            │
│  │ Inquirer    │  │ Vue 3       │  │ Vue 3       │            │
│  │ TUI         │  │ API Server  │  │ Components  │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                    │
│         └────────────────┼────────────────┘                    │
│                          │                                     │
│         ┌────────────────▼────────────────┐                   │
│         │     共享核心模块 (Core)          │                   │
│         │                                 │                   │
│         │  • Scraper (爬虫)              │                   │
│         │  • Downloader (下载)           │                   │
│         │  • Scanner (扫描)              │                   │
│         │  • Comparer (对比)             │                   │
│         │  • AI Matcher (匹配)           │                   │
│         │  • Config (配置)               │                   │
│         │  • Logger (日志)               │                   │
│         └─────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**架构说明**：
1. **CLI 工具**：独立运行，通过命令行和 TUI 与用户交互
2. **Web 应用**：Express 服务器（端口 3000）+ Vue 前端（`/app` 路径），通过 HTTP API 通信
3. **桌面客户端**：Tauri 2 封装，通过 Tauri Commands 与 Rust 后端通信（Rust 调用 Node.js 子进程执行核心业务）
4. **共享核心**：三种架构共享同一套核心业务模块

**Web 应用路由设计**：
- `http://localhost:3000/` - API 欢迎页面（包含 API 测试功能）
- `http://localhost:3000/app/` - Vue 前端应用
- `http://localhost:3000/api/*` - RESTful API 端点
- `http://localhost:5173/` - Vue 开发模式（Vite）

### 2.2 技术栈

#### 共享核心模块

| 模块 | 技术 | 说明 |
|------|------|------|
| **爬虫模块** | Playwright | 浏览器自动化，处理 Cloudflare 验证 |
| **下载模块** | Axios | HTTP 下载，支持断点续传 |
| **AI 匹配** | 本地模型/远程 API | 智能漫画名匹配 |
| **配置管理** | conf | 本地配置存储 |
| **日志系统** | winston | 日志持久化 |

#### CLI 专用

| 模块 | 技术 | 说明 |
|------|------|------|
| **命令行框架** | Commander.js | 命令解析和参数处理 |
| **交互式 TUI** | Inquirer.js | 交互式问答界面 |
| **终端美化** | Chalk + Figures | 彩色输出和图标 |

#### Web 专用

| 模块 | 技术 | 说明 |
|------|------|------|
| **后端框架** | Express.js | HTTP 服务器，提供 RESTful API（端口 3000） |
| **前端框架** | Vue 3 + TypeScript | 组件化 UI（与 Tauri 共享，`/app` 路径） |
| **构建工具** | Vite | 快速开发和构建 |
| **API 通信** | Fetch API / Axios | HTTP 请求 |
| **欢迎页面** | 内嵌 HTML | API 测试和文档页面（根路径 `/`） |

#### 客户端专用

| 模块 | 技术 | 说明 |
|------|------|------|
| **前端框架** | Vue 3 + TypeScript | 组件化 UI（与 Web 共享） |
| **构建工具** | Vite | 快速开发和构建 |
| **桌面框架** | Tauri 2 | 跨平台桌面应用（Rust 后端） |
| **IPC 通信** | Tauri Commands | 前端与 Rust 后端通信 |
| **后端语言** | Rust + Node.js 子进程 | Rust 负责系统调用，Node.js 负责核心业务逻辑 |

---

## 3. 目录结构

```
wnacg-download/
├── src/
│   ├── core/                      # 核心业务模块（三端共享）
│   │   ├── scraper.ts             # 爬虫模块（Playwright）
│   │   ├── downloader.ts          # 下载模块（Axios + 断点续传）
│   │   ├── scanner.ts             # 本地扫描模块（单层扫描）
│   │   ├── comparer.ts            # 对比模块（AI 匹配）
│   │   └── ai/
│   │       ├── matcher.ts         # AI 匹配器（支持本地/远程）
│   │       └── model.ts           # AI 模型管理
│   │
│   ├── cli/                       # CLI 工具专用
│   │   ├── index.ts               # CLI 入口
│   │   ├── commands/              # 命令行
│   │   │   ├── search.ts          # 搜索命令
│   │   │   ├── compare.ts         # 对比命令
│   │   │   ├── download.ts        # 下载命令
│   │   │   └── config.ts          # 配置命令
│   │   └── tui.ts                 # 交互式 TUI
│   │
│   ├── web/                       # Web 应用专用 ⭐ 新增
│   │   ├── api-server.ts          # Express 服务器入口
│   │   ├── routes/                # API 路由
│   │   │   ├── search.ts          # 搜索 API
│   │   │   ├── compare.ts         # 对比 API
│   │   │   ├── download.ts        # 下载 API
│   │   │   └── cache.ts           # 缓存管理 API
│   │   └── middleware/            # 中间件
│   │       ├── cors.ts            # CORS 处理
│   │       └── error.ts           # 错误处理
│   │
│   ├── ui/                        # 前端 UI（Web 和 Tauri 共享）⭐ 修改
│   │   ├── components/            # 可复用组件
│   │   │   ├── Header.vue         # 顶部导航
│   │   │   ├── Footer.vue         # 底部信息
│   │   │   ├── ComicCard.vue      # 漫画卡片
│   │   │   ├── StatCard.vue       # 统计卡片
│   │   │   ├── QueueItem.vue      # 队列项
│   │   │   └── DownloadProgress.vue # 下载进度
│   │   │
│   │   ├── views/                 # 页面组件
│   │   │   ├── SearchView.vue     # 搜索页面
│   │   │   ├── CompareView.vue    # 对比页面
│   │   │   ├── DownloadView.vue   # 下载页面
│   │   │   └── ConfigView.vue     # 配置页面
│   │   │
│   │   ├── composables/           # 组合式函数（共享逻辑）⭐ 新增
│   │   │   ├── useSearch.ts       # 搜索逻辑
│   │   │   ├── useDownload.ts     # 下载逻辑
│   │   │   └── useConfig.ts       # 配置逻辑
│   │   │
│   │   ├── adapters/              # 适配器层（统一接口）⭐ 新增
│   │   │   ├── api-client.ts      # Web API 客户端
│   │   │   └── tauri-client.ts    # Tauri IPC 客户端
│   │   │
│   │   ├── main.ts                # Web 入口
│   │   └── App.vue                # 应用根组件
│   │
│   ├── src-tauri/                 # Tauri 2 专用（Rust 后端）⭐ 新增
│   │   ├── src/
│   │   │   ├── main.rs            # Tauri 主入口
│   │   │   └── commands/          # Tauri Commands（IPC 处理器）
│   │   │       ├── search.rs      # 搜索命令
│   │   │       ├── compare.rs     # 对比命令
│   │   │       ├── download.rs    # 下载命令
│   │   │       └── config.rs      # 配置命令
│   │   ├── Cargo.toml             # Rust 依赖管理
│   │   └── tauri.conf.json        # Tauri 配置
│   │
│   ├── config.ts                  # 配置管理（共享）
│   ├── types.ts                   # TypeScript 类型定义（共享）
│   │
│   └── utils/                     # 工具模块（共享）
│       ├── logger.ts              # 日志工具（持久化）
│       └── validator.ts           # 文件校验工具
│
├── cache/                         # 缓存数据（共享）
│   ├── search_*.json              # 搜索结果缓存
│   ├── compare_*.json             # 对比结果缓存
│   └── download_list_*.json       # 下载清单缓存
│
├── .trae/                         # 项目文档
│   ├── rules/                     # 规则文档
│   │   ├── bss-rules.md           # 功能规则
│   │   └── dev-rules.md           # 开发规范
│   └── specs/                     # 规格文档
│       ├── requirements/          # 需求规格
│       ├── ui-design/             # 界面设计
│       ├── architecture/          # 架构设计
│       └── development-plan/      # 开发计划
│
├── package.json                   # 项目配置
├── tsconfig.json                  # TypeScript 配置
├── vite.config.ts                 # Vite 配置（Web 和 Tauri 共享）
├── tauri.conf.json                # Tauri 打包配置 ⭐ 新增
└── Cargo.toml                     # Rust 依赖管理 ⭐ 新增
```

**目录设计说明**：

1. **核心业务层** (`src/core/`)
   - 完全独立，不依赖任何表现层
   - 可独立测试
   - 三种架构共享

2. **Web 层** (`src/web/`)
   - Express 服务器提供 RESTful API
   - 路由模块化设计
   - 中间件处理 CORS、错误等

3. **UI 层** (`src/ui/`)
   - Web 和 Tauri 共享
   - **适配器层**：统一通信接口
   - **组合式函数**：共享业务逻辑
   - **组件**：纯 UI 展示

4. **Tauri 层** (`src-tauri/`)
   - Rust 后端管理窗口和系统功能
   - Tauri Commands 调用核心业务（通过 Node.js 子进程）
   - 前端与 Web 共享 UI 组件

---

## 3.1 Tauri 架构细节 ⭐ 新增

### 3.1.1 实现方式

**核心方案**：Rust 启动 Node.js HTTP 服务，Tauri Commands 通过 HTTP 调用

```
┌─────────────────────────────────────┐
│  Tauri 桌面应用                      │
│  ┌─────────────┐  ┌───────────────┐ │
│  │  Rust 后端   │  │ Node.js 服务   │ │
│  │  (窗口管理)  │◄─┤ (HTTP 服务器)  │ │
│  │  - 系统调用  │  │ - Scraper     │ │
│  │  - 文件系统  │◄─┤ - Downloader  │ │
│  │  - 事件推送  │  │ - Comparer    │ │
│  │  - 生命周期  │  │ - AI Matcher  │ │
│  └──────┬──────┘  └───────┬───────┘ │
│         │ HTTP 调用        │         │
│         └──────────────────┘         │
└─────────────────────────────────────┘
```

### 3.1.2 技术细节

**Rust 后端职责**：
- 启动时启动 Node.js HTTP 服务（端口 3000）
- 通过 `reqwest` 库调用 Node.js API
- 管理 Node.js 进程生命周期（启动、停止、重启）
- 处理系统级功能（窗口、文件、通知等）

**Node.js 服务职责**：
- 提供 HTTP API（复用 Web 架构的 Express 服务器）
- 执行核心业务逻辑（爬虫、下载、对比等）
- 推送事件到 Rust 后端（下载进度、完成等）

**通信流程**：
```
1. Rust 启动 Node.js 进程
   └─> Command::new("node").arg("scripts/api-server.js")

2. Node.js 启动 HTTP 服务器
   └─> app.listen(3000)

3. Tauri Command 调用
   └─> reqwest::post("http://localhost:3000/api/search")

4. Node.js 返回结果
   └─> JSON response

5. Rust 转发到前端
   └─> Ok(result)
```

### 3.1.3 进程管理

**启动流程**：
```rust
// src-tauri/src/main.rs
use std::process::{Command, Child};

fn main() {
    // 启动 Node.js 服务
    let node_child = Command::new("node")
        .arg("scripts/api-server.js")
        .spawn()
        .expect("启动 Node.js 服务失败");
    
    // 等待服务启动（轮询检测端口）
    wait_for_service(3000);
    
    // 运行 Tauri
    tauri::Builder::default()
        .manage(node_child)  // 管理进程生命周期
        .invoke_handler(tauri::generate_handler![
            search_comics,
            download_comics
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 失败");
}
```

**生命周期管理**：
- 应用启动时：启动 Node.js 服务
- 应用运行时：Node.js 常驻内存
- 应用退出时：优雅关闭 Node.js 进程

### 3.1.4 目录结构

```
src-tauri/
├── bin/
│   ├── node.exe      # Windows Node.js 二进制（60MB）
│   └── node          # macOS/Linux Node.js 二进制（60MB）
├── scripts/
│   └── api-server.js # Node.js HTTP 服务（复用 Web 服务器代码）
├── src/
│   ├── main.rs       # Tauri 主入口
│   └── commands/     # Tauri Commands
├── Cargo.toml        # Rust 依赖管理
└── tauri.conf.json   # Tauri 配置
```

**打包说明**：
- **打包方式**：捆绑完整 Node.js 二进制（官方版本，兼容性最好）
- **打包体积**：
  - Tauri 框架：~15MB
  - Node.js 二进制：~60MB（Windows + macOS + Linux）
  - 前端资源：~5MB
  - **总计**：~80MB（比 Electron ~150MB 小约 45%）
- **跨平台策略**：
  - Windows：捆绑 `node.exe`（官方 Windows 二进制）
  - macOS：捆绑 `node`（官方 macOS 二进制）
  - Linux：捆绑 `node`（官方 Linux 二进制）
- **优势**：
  - ✅ 兼容性最好（官方 Node.js 二进制）
  - ✅ 调试方便（可直接运行脚本）
  - ✅ 实现简单（无需额外工具）
- **劣势**：
  - ⚠️ 打包体积增加约 60MB（但仍小于 Electron）
  - ⚠️ 需要为不同平台准备不同二进制

### 3.1.5 优势

- ✅ **核心代码完全复用**（> 95%）：Node.js 服务复用 Web 架构
- ✅ **开发成本低**：无需重写 Rust 核心业务逻辑
- ✅ **性能优**：Node.js 常驻内存，无启动延迟
- ✅ **模块可复用**：缓存、连接池等模块可共享
- ✅ **兼容性好**：官方 Node.js 二进制
- ✅ **调试方便**：可直接运行 Node.js 脚本

### 3.1.6 劣势

- ⚠️ **打包体积增加**：约 60MB Node.js 二进制
- ⚠️ **实现复杂度略高**：需要管理进程生命周期
- ⚠️ **需要端口检测**：避免端口冲突

### 3.1.7 实际实现细节 ⭐ 更新

**脚本执行方式**：

由于核心业务逻辑使用 TypeScript 编写，实际实现中使用 `tsx` 运行 TypeScript 文件：

```javascript
// scripts/api-server.js
import { spawn } from 'child_process';

// 使用 tsx 运行 TypeScript API 服务器
const tsxProcess = spawn(fullCommand, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,  // Windows 上需要 shell 模式来找到 npx
  env: { ...process.env, NODE_ENV: 'development' },
});
```

**服务就绪检测**：

```rust
// src-tauri/src/main.rs
fn wait_for_service(port: u16, max_retries: u32) -> bool {
    for i in 0..max_retries {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return true;
        }
        thread::sleep(Duration::from_millis(1000));
    }
    false
}
```

**Tauri Commands 实现**：

```rust
// src-tauri/src/commands.rs
#[tauri::command]
pub async fn search_comics(
    keyword: String,
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<Vec<serde_json::Value>, String> {
    let state = state.lock().await;
    let client = reqwest::Client::new();
    
    let response = client
        .post(format!("{}/api/search", state.node_server_url))
        .json(&serde_json::json!({ "keyword": keyword }))
        .send()
        .await
        .map_err(|e| format!("搜索失败：{}", e))?;
    
    // 解析响应...
}
```

### 3.1.8 端口分配 ⭐ 更新

**开发环境端口分配**：

| 应用 | API 端口 | Vite 端口 | 说明 |
|------|---------|----------|------|
| **Web 应用** | 3000 | 5173 | 独立运行 |
| **Tauri** | 3001 | 5173（共享） | 与 Web 共享 Vite |

**端口设计理由**：
- ✅ Web 和 Tauri 使用不同的 API 端口（3000 vs 3001），可同时运行
- ✅ 共享 Vite 开发服务器（5173），避免重复启动
- ✅ 便于同时调试 Web 和 Tauri

**API 服务器路由**（端口 3000 或 3001）：

| 路径 | 内容 | 说明 |
|------|------|------|
| `/` | API 欢迎页面 | 包含 API 端点列表和快速测试功能 |
| `/app` | Vue 应用 | 构建后的前端资源 |
| `/assets/*` | 静态资源 | CSS/JS 文件 |
| `/api/health` | 健康检查 | 服务器状态 |
| `/api/search` | 搜索 API | 搜索漫画 |
| `/api/cache` | 缓存管理 | 获取/删除搜索结果缓存 |
| `/api/compare` | 对比 API | 对比漫画 |
| `/api/download` | 下载 API | 下载漫画 |
| `/api/config` | 配置 API | 获取/设置配置 |

**开发模式路由**（Vite，端口 5173）：

| 路径 | 内容 |
|------|------|
| `/` | Vue 应用（开发模式） |
| `/api/*` | 代理到 `http://localhost:3000` |

### 3.1.9 开发环境配置 ⭐ 更新

**启动方式**：

**Web 应用**：
```powershell
npm run dev:web
# 启动：API (3000) + Vite (5173)
```

**Tauri 桌面应用**：
```powershell
.\start-tauri.ps1
# 自动检测 Vite 是否运行，未运行则自动启动
# 启动：API (3001) + 连接已有 Vite (5173)
```

**同时运行**：
```powershell
# 终端 1: 启动 Web 应用
npm run dev:web

# 终端 2: 启动 Tauri
.\start-tauri.ps1
```

**环境变量问题**：

Windows 上 Tauri 开发时，新终端会话可能不包含 Rust 工具链的 PATH。

**解决方案**：

启动脚本已自动处理 PATH 刷新，无需手动操作。

**动态端口配置**：

API 服务器支持从命令行参数读取端口：

```bash
# 默认端口 3000
npx tsx src/api-server.ts

# 指定端口 3001
npx tsx src/api-server.ts 3001
```

Tauri 启动时自动传入端口 3001，避免与 Web 应用冲突。

---

## 3.2 Tauri 功能规划 ⭐ 新增

### 3.2.1 分阶段实现策略

为了快速完成核心功能并验证架构，Tauri 特有功能采用分阶段实现策略。

### 3.2.2 Phase 1（MVP - 最小可用版本）

**目标**：快速完成核心功能，验证架构

**必须实现**：
- ✅ 基础窗口（Tauri 默认窗口）
- ✅ Rust 启动 Node.js 服务
- ✅ Tauri Commands 调用 Node.js API
- ✅ 事件推送（下载进度等）
- ✅ 文件系统访问（下载文件）

**暂不实现**：
- ❌ 系统托盘
- ❌ 原生通知
- ❌ 自动更新
- ❌ 全局快捷键
- ❌ 文件拖拽
- ❌ 自定义标题栏

### 3.2.3 Phase 2（增强版）- 后续迭代

**目标**：提升用户体验

**计划功能**：
- ✅ **系统托盘**（优先级 P1）
  - 托盘图标显示
  - 右键菜单（开始下载、暂停、设置、退出）
  - 点击图标打开/最小化窗口
  - 开发时间：2-3 天
- ✅ **原生通知**（优先级 P1）
  - 下载完成通知
  - 下载失败通知
  - 点击通知跳转
  - 开发时间：1 天

### 3.2.4 Phase 3（完整版）- 根据用户反馈决定

**目标**：完善高级功能

**候选功能**：
- ⚠️ **自动更新**（优先级 P2，需要更新服务器）
  - 使用 Tauri Updater
  - 支持静默更新和用户确认
  - 开发时间：3-5 天
- ⚠️ **全局快捷键**（优先级 P2，可能冲突）
  - 全局快捷键打开/关闭窗口
  - 全局快捷键开始新搜索
  - 开发时间：2 天
- ⚠️ **文件拖拽**（优先级 P2，使用频率待验证）
  - 拖拽文本文件解析下载链接
  - 拖拽图片识别漫画
  - 开发时间：1 天

### 3.2.5 功能复杂度评估

| 功能 | 复杂度 | 开发时间 | 优先级 | 阶段 |
|------|--------|----------|--------|------|
| 基础窗口 | 低 | 0 天 | P0 | Phase 1 |
| HTTP 调用 | 中 | 2 天 | P0 | Phase 1 |
| 事件推送 | 中 | 1 天 | P0 | Phase 1 |
| 系统托盘 | 中等 | 2-3 天 | P1 | Phase 2 |
| 原生通知 | 低 | 1 天 | P1 | Phase 2 |
| 自动更新 | 高 | 3-5 天 | P2 | Phase 3 |
| 全局快捷键 | 中等 | 2 天 | P2 | Phase 3 |
| 文件拖拽 | 低 | 1 天 | P2 | Phase 3 |

### 3.2.6 决策理由

**Phase 1 不实现特有功能**：
- ✅ 快速完成 MVP，验证架构
- ✅ 减少初期开发工作量
- ✅ 专注于核心功能（搜索、对比、下载）

**Phase 2 添加托盘和通知**：
- ✅ 系统托盘提升后台运行体验
- ✅ 原生通知提升下载完成提醒体验
- ✅ 开发成本可控（3-4 天）

**Phase 3 根据反馈决定**：
- ✅ 避免过度开发
- ✅ 根据用户实际需求决定
- ✅ 保持灵活性

---

## 4. 架构模式设计

### 4.1 适配器模式（Adapter Pattern）⭐ 新增

**设计目标**：让 Web 和 Tauri 共享同一套 UI 组件，无需关心通信方式的差异。

**架构设计**：

```
┌─────────────────────────────────────────────────────────┐
│                    UI 组件层                              │
│  (SearchView, CompareView, DownloadView, etc.)          │
└────────────────────────┬────────────────────────────────┘
                         │ 调用
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   组合式函数层                            │
│  (useSearch, useDownload, useConfig)                    │
└────────────────────────┬────────────────────────────────┘
                         │ 调用
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   适配器层 ⭐                             │
│  ┌─────────────────┐         ┌─────────────────┐       │
│  │  ApiClient      │         │  TauriClient    │       │
│  │  (Web 专用)      │         │ (Tauri 专用)     │       │
│  │                 │         │                 │       │
│  │ + search()      │         │ + search()      │       │
│  │ + download()    │         │ + download()    │       │
│  │ + compare()     │         │ + compare()     │       │
│  └─────────────────┘         └─────────────────┘       │
└─────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌─────────────────┐             ┌─────────────────┐
│   Web API       │             │  Tauri Commands │
│   (HTTP)        │             │  (IPC)          │
└─────────────────┘             └─────────────────┘
```

**接口定义**：

```typescript
// src/ui/adapters/types.ts
export interface ISearchClient {
  search(keyword: string, options: SearchOptions): Promise<Comic[]>;
}

export interface IDownloadClient {
  download(comics: Comic[], options: DownloadOptions): Promise<DownloadResult>;
}

export interface ICompareClient {
  compare(searchFile: string, options: CompareOptions): Promise<CompareResult>;
}
```

**Web 实现**：

```typescript
// src/ui/adapters/api-client.ts
export class ApiClient implements ISearchClient, IDownloadClient, ICompareClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }
  
  async search(keyword: string, options: SearchOptions): Promise<Comic[]> {
    const response = await fetch(`${this.baseUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, ...options })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error);
    }
    
    return data.comics;
  }
  
  // ... 其他方法
}
```

**Tauri 实现**：

```typescript
// src/ui/adapters/tauri-client.ts
import { invoke } from '@tauri-apps/api/core';

export class TauriClient implements ISearchClient, IDownloadClient, ICompareClient {
  async search(keyword: string, options: SearchOptions): Promise<Comic[]> {
    return invoke('search_comics', { keyword, options });
  }
  
  async download(comics: Comic[], options: DownloadOptions): Promise<DownloadResult> {
    return invoke('download_comics', { comics, options });
  }
  
  async compare(searchFile: string, options: CompareOptions): Promise<CompareResult> {
    return invoke('compare_comics', { searchFile, options });
  }
}
```

**UI 组件使用**：

```typescript
// src/ui/views/SearchView.vue
<script setup lang="ts">
import { ref } from 'vue';
import { createClient } from '../adapters';

const client = createClient(); // 根据环境自动创建合适的客户端
const searchResults = ref<Comic[]>([]);

const performSearch = async () => {
  try {
    const results = await client.search(keyword.value, options.value);
    searchResults.value = results;
  } catch (error) {
    console.error('搜索失败:', error);
  }
};
</script>
```

**优势**：
- ✅ UI 组件完全无感知通信方式
- ✅ 代码复用率 > 95%
- ✅ 易于测试（可以 Mock 客户端）
- ✅ 易于扩展（新增客户端实现即可）
- ✅ Web 和 Tauri 共享同一套 UI 组件

---

### 4.2 依赖注入

**配置管理**：

```typescript
// src/config.ts
export class ConfigManager {
  private static instance: ConfigManager;
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  get<T>(key: string): T { /* ... */ }
  set<T>(key: string, value: T): void { /* ... */ }
}

export const configManager = ConfigManager.getInstance();
```

**核心模块使用**：

```typescript
// src/core/scraper.ts
export class WNACGScraper {
  constructor(private config: ConfigManager) {
    this.config = config;
  }
  
  async search(options: SearchOptions): Promise<Comic[]> {
    const proxy = this.config.get('defaultProxy');
    const delay = this.config.get('requestDelay');
    // ...
  }
}
```

---

### 4.3 事件驱动架构

**下载进度事件**：

```typescript
// src/core/downloader.ts
export class ComicDownloader extends EventEmitter {
  async download(comics: Comic[], options: DownloadOptions): Promise<DownloadResult> {
    // 触发进度事件
    this.emit('progress', {
      aid: comic.aid,
      downloaded: pagesDownloaded,
      total: comic.pages,
      speed: currentSpeed
    });
    
    // 触发完成事件
    this.emit('completed', {
      aid: comic.aid,
      savedPath: filePath
    });
  }
}

// UI 层监听
downloader.on('progress', (progress) => {
  updateUI(progress);
});
```

---

## 5. 核心模块设计

### 4.1 爬虫模块 (scraper.ts)

**职责**：从 wnacg.com 网站爬取漫画信息

**功能**：
- 构建搜索 URL
- 并行爬取多页数据
- 解析 HTML 提取漫画信息
- 去重处理
- 保存为 JSON 文件

**依赖**：
- Playwright（浏览器自动化）
- 配置文件（代理、请求间隔等）

**接口**：
```typescript
interface WNACGScraper {
  initialize(): Promise<void>
  search(options: SearchOptions): Promise<Comic[]>
  close(): Promise<void>
}
```

---

### 4.2 下载模块 (downloader.ts)

**职责**：下载漫画文件到本地

**功能**：
- 并发下载
- 断点续传
- 重试机制
- 文件完整性校验
- 进度回调

**依赖**：
- Axios（HTTP 客户端）
- 文件系统（Node.js fs）

**接口**：
```typescript
interface ComicDownloader {
  download(comics: Comic[], options: DownloadOptions): Promise<DownloadResult>
  cancel(aid: string): Promise<void>
  getProgress(aid: string): DownloadProgress
}
```

---

### 4.3 搜索结果管理模块 (searchManager.ts) ⭐ 新增

**职责**：管理搜索结果的存储、检索和列表展示

**功能**：
- 扫描 `cache/` 目录下的所有搜索结果文件
- 解析文件元数据（时间、大小、漫画数量）
- 提供搜索结果列表（支持过滤、排序）
- 保存新的搜索结果
- 删除指定的搜索结果

**依赖**：
- 文件系统（Node.js fs）
- 路径管理（path）

**接口**：
```typescript
interface SearchManager {
  // 扫描所有搜索结果
  listSearches(): Promise<SearchResult[]>;
  
  // 根据关键字获取搜索结果
  getSearch(keyword: string): Promise<SearchResult | null>;
  
  // 保存搜索结果
  saveSearch(keyword: string, comics: Comic[]): Promise<void>;
  
  // 删除搜索结果
  deleteSearch(keyword: string): Promise<void>;
}

interface SearchResult {
  keyword: string;           // 关键字
  searchTime: Date;          // 搜索时间
  comicCount: number;        // 漫画数量
  fileSize: number;          // 文件大小（字节）
  filePath: string;          // 文件路径
  comics: Comic[];           // 漫画列表
}
```

**文件命名规则**：
```
cache/search_{keyword}.json

示例：
- search_TYPE90.json
- search_作者名 A.json
```

**管理规则**：
- ✅ 同关键字只保留一个文件（新搜索自动覆盖）
- ✅ 不限制文件总数（用户手动管理）
- ✅ 支持按时间排序（最新在上）
- ✅ 支持关键字过滤（仅显示，不删除）

---

### 4.4 扫描模块 (scanner.ts)

**职责**：扫描本地漫画文件夹

**功能**：
- 扫描指定目录
- 仅扫描一层（不递归）
- 提取漫画文件夹信息
- 返回漫画列表

**依赖**：
- 文件系统（Node.js fs）

**接口**：
```typescript
interface LocalScanner {
  scan(directory: string): Promise<LocalComic[]>
}
```

---

### 4.5 对比模块 (comparer.ts)

**职责**：对比网站、本地和第三方漫画数据

**功能**：
- 加载搜索结果 JSON
- 扫描本地漫画
- 加载第三方网站数据（待设计）
- AI 智能匹配
- 名称校准（以第三方为准）
- 生成对比结果

**依赖**：
- 扫描模块
- AI 匹配器
- 配置文件
- 搜索结果管理模块

**接口**：
```typescript
interface ComicComparer {
  compare(options: CompareOptions): Promise<CompareResult>
}
```

---

### 4.6 AI 匹配模块 (ai/matcher.ts)

**职责**：智能匹配漫画名称

**功能**：
- 计算名称相似度
- 处理名称变体
- 支持本地模型和远程 API
- 缓存匹配结果

**依赖**：
- 本地模型文件（可选）
- 远程 API（可选）
- 配置文件

**接口**：
```typescript
interface ComicMatcher {
  match(name1: string, name2: string): Promise<number>
  calibrateName(searchName: string, thirdPartyName: string): string
}
```

---

### 4.7 配置管理模块 (config.ts)

**职责**：管理应用配置

**功能**：
- 读取配置
- 保存配置
- 配置验证
- 配置变更通知

**依赖**：
- conf 库

**接口**：
```typescript
interface ConfigManager {
  get<T>(key: string): T
  set<T>(key: string, value: T): void
  load(): Promise<void>
  save(): Promise<void>
}
```

---

### 4.7 日志模块 (utils/logger.ts)

**职责**：记录应用日志

**功能**：
- 日志级别（info, warn, error）
- 日志持久化到文件
- 日志轮转
- 格式化输出

**依赖**：
- winston 库

**接口**：
```typescript
interface Logger {
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, ...args: any[]): void
}
```

---

### 4.3 事件系统设计 ⭐ 新增

**设计目标**：实现 Rust 后端 → 前端的事件推送机制，支持实时进度更新和状态通知。

#### 4.3.1 事件命名规范

**规范**：使用 **kebab-case** 命名

**示例**：
- ✅ `download-progress`（下载进度）
- ✅ `download-completed`（下载完成）
- ✅ `download-error`（下载错误）
- ✅ `search-started`（搜索开始）
- ✅ `search-completed`（搜索完成）

**理由**：
- 符合 Tauri 官方示例
- 与 HTML 属性命名一致
- 可读性好

#### 4.3.2 事件类型定义

**TypeScript 定义**（`src/ui/types/events.ts`）：
```typescript
// 下载进度事件
export interface DownloadProgressEvent {
  aid: string;           // 漫画 ID
  downloaded: number;    // 已下载页数
  total: number;         // 总页数
  speed: number;         // 下载速度（页/秒）
  percentage: number;    // 进度百分比（0-100）
}

// 下载完成事件
export interface DownloadCompletedEvent {
  aid: string;           // 漫画 ID
  title: string;         // 漫画标题
  path: string;          // 保存路径
  success: boolean;      // 是否成功
  pagesDownloaded: number; // 实际下载页数
}

// 下载错误事件
export interface DownloadErrorEvent {
  aid: string;           // 漫画 ID
  error: string;         // 错误消息
  code: string;          // 错误码
  retryable: boolean;    // 是否可重试
}

// 搜索进度事件
export interface SearchProgressEvent {
  currentPage: number;   // 当前页码
  totalPages: number;    // 总页数
  comicsFound: number;   // 已找到漫画数
}
```

**Rust 定义**（`src-tauri/src/types.rs`）：
```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct DownloadProgressEvent {
    pub aid: String,
    pub downloaded: u64,
    pub total: u64,
    pub speed: u64,
    pub percentage: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DownloadCompletedEvent {
    pub aid: String,
    pub title: String,
    pub path: String,
    pub success: bool,
    pub pages_downloaded: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DownloadErrorEvent {
    pub aid: String,
    pub error: String,
    pub code: String,
    pub retryable: bool,
}
```

**类型同步**：
- ✅ TypeScript 和 Rust 分别定义
- ✅ 使用注释说明对应关系
- ✅ 字段名保持一致（使用 snake_case vs camelCase 转换）

#### 4.3.3 事件推送流程

**完整流程**：
```
Node.js 下载服务
    │
    │ 1. 下载过程中触发事件
    │ (progress: DownloadProgressEvent)
    ▼
Node.js HTTP 推送
    │ 2. POST /internal/event
    │ { event: "download-progress", data: {...} }
    ▼
Rust 内部 HTTP 服务器
    │ 3. 接收事件并转发
    │ app.emit("download-progress", data)
    ▼
Tauri 事件系统
    │ 4. 事件广播
    │ listen("download-progress", callback)
    ▼
前端 Vue 组件
    │ 5. 更新 UI
    │ updateProgress(event.payload)
```

**Node.js 端实现**：
```javascript
// scripts/api-server.js
const express = require('express');
const fetch = require('node-fetch');

app.post('/api/download', async (req, res) => {
  const { comics } = req.body;
  
  // 下载器
  const downloader = new ComicDownloader();
  
  // 监听下载进度
  downloader.on('progress', async (progress) => {
    // 推送到 Rust
    await fetch('http://localhost:3001/internal/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'download-progress',
        data: progress
      })
    });
  });
  
  // 开始下载
  await downloader.download(comics);
});
```

**Rust 端实现**：
```rust
// src-tauri/src/main.rs
use tauri::Emitter;
use warp::Filter;

// 内部 HTTP 服务器（接收 Node.js 事件）
#[tokio::main]
async fn main() {
    // 启动内部 HTTP 服务器（端口 3001）
    let event_route = warp::path("internal")
        .and(warp::path("event"))
        .and(warp::post())
        .and(warp::body::json())
        .and_then(|event: EventPayload| async move {
            // 通过 Tauri 事件系统推送
            app_handle.emit(&event.event, &event.data).ok();
            Ok::<_, warp::Rejection>(())
        });
    
    warp::serve(event_route)
        .run(([127, 0, 0, 1], 3001))
        .await;
}

#[derive(Deserialize)]
struct EventPayload {
    event: String,
    data: serde_json::Value,
}
```

**前端实现**：
```typescript
// src/ui/composables/useDownload.ts
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type { DownloadProgressEvent } from '../types/events';

export function useDownload() {
  let unlistenProgress: UnlistenFn | null = null;
  let unlistenCompleted: UnlistenFn | null = null;
  
  onMounted(async () => {
    // 监听下载进度
    unlistenProgress = await listen<DownloadProgressEvent>(
      'download-progress',
      (event) => {
        updateProgress(event.payload);
      }
    );
    
    // 监听下载完成
    unlistenCompleted = await listen(
      'download-completed',
      (event) => {
        handleCompleted(event.payload);
      }
    );
  });
  
  onUnmounted(() => {
    // 清理监听器
    if (unlistenProgress) unlistenProgress();
    if (unlistenCompleted) unlistenCompleted();
  });
}
```

#### 4.3.4 事件清理机制

**问题**：如何避免内存泄漏？

**解决方案**：

**1. 组件卸载时自动移除**：
```typescript
// Vue 组件
onUnmounted(() => {
  if (unlisten) {
    unlisten(); // 移除监听器
  }
});
```

**2. 使用 once 替代 listen（一次性事件）**：
```typescript
import { once } from '@tauri-apps/api/event';

// 只监听一次，自动清理
await once('download-completed', (event) => {
  handleCompleted(event.payload);
});
```

**3. 限制事件队列长度**：
```rust
// Rust 端实现事件队列限制
const MAX_QUEUE_SIZE: usize = 100;

if (event_queue.len() > MAX_QUEUE_SIZE) {
    event_queue.pop_front(); // 移除最早的事件
}
event_queue.push_back(event);
```

**4. 使用 WeakRef 避免循环引用**：
```typescript
// 使用 WeakRef 避免循环引用导致的内存泄漏
const weakRef = new WeakRef(component);

downloader.on('progress', () => {
  const component = weakRef.deref();
  if (component) {
    component.updateProgress();
  }
  // 如果 component 已被回收，自动停止监听
});
```

#### 4.3.5 事件类型对比

| 事件类型 | 触发频率 | 数据量 | 优先级 | 清理策略 |
|---------|---------|--------|--------|---------|
| download-progress | 高（每页） | 小 | 高 | 组件卸载时 |
| download-completed | 低（每漫画） | 中 | 高 | once 监听 |
| download-error | 低（失败时） | 中 | 高 | once 监听 |
| search-progress | 中（每页） | 小 | 中 | 组件卸载时 |

#### 4.3.6 优势

- ✅ **实时性**：前端即时获取后端状态
- ✅ **解耦**：发送者和接收者无需知道对方
- ✅ **扩展性**：易于添加新事件类型
- ✅ **性能**：异步非阻塞

#### 4.3.7 劣势

- ⚠️ **复杂度**：需要管理事件生命周期
- ⚠️ **调试困难**：事件流不易追踪
- ⚠️ **内存泄漏风险**：需要正确清理监听器

---

### 4.4 错误处理设计 ⭐ 新增

**设计目标**：实现统一的错误处理机制，支持跨层错误传递和友好的用户提示。

#### 4.4.1 统一错误结构

**TypeScript 定义**（`src/ui/types/error.ts`）：
```typescript
export interface AppError {
  code: string;           // 错误码（如 SEARCH_FAILED）
  message: string;        // 中文错误消息（用户可见）
  details?: any;          // 详细错误信息（用于日志）
  retryable?: boolean;    // 是否可重试
  stack?: string;         // 错误堆栈（调试用）
}
```

**Rust 定义**（`src-tauri/src/types.rs`）：
```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct AppError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retryable: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stack: Option<String>,
}

// 实现 From trait，方便从 Rust 错误转换
impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError {
            code: "IO_ERROR".to_string(),
            message: format!("IO 错误：{}", err),
            details: None,
            retryable: Some(true),
            stack: None,
        }
    }
}
```

**Node.js 定义**（`scripts/types.js`）：
```javascript
/**
 * @typedef {Object} AppError
 * @property {string} code - 错误码
 * @property {string} message - 中文错误消息
 * @property {any} [details] - 详细错误信息
 * @property {boolean} [retryable] - 是否可重试
 * @property {string} [stack] - 错误堆栈
 */
```

#### 4.4.2 错误码规范

**错误码分类**：

```typescript
// src/ui/types/error.ts
export enum ErrorCode {
  // 搜索相关（1000-1999）
  SEARCH_FAILED = 'SEARCH_1001',
  SEARCH_TIMEOUT = 'SEARCH_1002',
  SEARCH_NO_RESULTS = 'SEARCH_1003',
  
  // 下载相关（2000-2999）
  DOWNLOAD_FAILED = 'DOWNLOAD_2001',
  DOWNLOAD_TIMEOUT = 'DOWNLOAD_2002',
  DOWNLOAD_DISK_FULL = 'DOWNLOAD_2003',
  DOWNLOAD_FILE_CORRUPTED = 'DOWNLOAD_2004',
  
  // 网络相关（3000-3999）
  NETWORK_ERROR = 'NETWORK_3001',
  NETWORK_TIMEOUT = 'NETWORK_3002',
  PROXY_ERROR = 'PROXY_3003',
  
  // 系统相关（4000-4999）
  FILE_SYSTEM_ERROR = 'FILE_4001',
  PERMISSION_ERROR = 'PERMISSION_4002',
  CONFIG_ERROR = 'CONFIG_4003',
  
  // AI 匹配相关（5000-5999）
  AI_MATCH_FAILED = 'AI_5001',
  AI_MODEL_ERROR = 'AI_5002',
  AI_TIMEOUT = 'AI_5003',
}
```

**错误码命名规则**：
- 格式：`{模块}_{序号}`
- 模块：SEARCH, DOWNLOAD, NETWORK, FILE, AI 等
- 序号：按功能分类，便于定位问题

#### 4.4.3 错误传递链

**完整流程**：
```
Rust 后端
    │ Result<T, AppError>
    │ 1. 捕获错误并转换为 AppError
    ▼
Tauri Commands
    │ Result<T, String>
    │ 2. 序列化为 JSON
    ▼
Node.js 服务
    │ Promise.reject(AppError)
    │ 3. 添加详细错误信息
    ▼
TypeScript 客户端
    │ catch (error: AppError)
    │ 4. 解析错误并显示
    ▼
UI 组件
    │ 5. 显示友好错误提示
```

**Rust 端错误处理**：
```rust
// src-tauri/src/commands/search.rs
use crate::types::AppError;

#[command]
async fn search_comics(keyword: String) -> Result<Vec<Comic>, AppError> {
    info!("开始搜索：{}", keyword);
    
    // 调用 Node.js API
    let response = client
        .post("http://localhost:3000/api/search")
        .json(&serde_json::json!({ "keyword": keyword }))
        .send()
        .await
        .map_err(|e| AppError {
            code: "NETWORK_3001".to_string(),
            message: "网络请求失败，请检查网络连接".to_string(),
            details: Some(serde_json::json!({
                "error": e.to_string(),
                "keyword": keyword
            })),
            retryable: Some(true),
            stack: None,
        })?;
    
    if !response.status().is_success() {
        return Err(AppError {
            code: "SEARCH_1001".to_string(),
            message: "搜索失败，请稍后重试".to_string(),
            details: Some(serde_json::json!({
                "status": response.status().to_string()
            })),
            retryable: Some(true),
            stack: None,
        });
    }
    
    let result: ApiResponse<Vec<Comic>> = response
        .json()
        .await
        .map_err(|e| AppError {
            code: "SEARCH_1001".to_string(),
            message: "解析搜索结果失败".to_string(),
            details: Some(serde_json::json!({
                "error": e.to_string()
            })),
            retryable: Some(false),
            stack: None,
        })?;
    
    if !result.success {
        return Err(AppError {
            code: "SEARCH_1001".to_string(),
            message: result.error.unwrap_or_default(),
            details: None,
            retryable: Some(true),
            stack: None,
        });
    }
    
    Ok(result.data)
}
```

**Node.js 端错误处理**：
```javascript
// scripts/api-server.js
app.post('/api/search', async (req, res) => {
  try {
    const { keyword } = req.body;
    logger.info('开始搜索', { keyword });
    
    const comics = await scraper.search(keyword);
    
    logger.info('搜索成功', { count: comics.length });
    res.json({ success: true, data: comics });
  } catch (error) {
    // 统一错误格式
    const appError = {
      code: 'SEARCH_1001',
      message: `搜索失败：${error.message}`,
      details: {
        keyword: req.body.keyword,
        stack: error.stack,
        timestamp: new Date().toISOString()
      },
      retryable: isRetryableError(error)
    };
    
    logger.error('搜索失败', appError);
    
    res.status(500).json({
      success: false,
      error: appError
    });
  }
});

function isRetryableError(error) {
  // 网络错误、超时等可重试
  return ['NETWORK_ERROR', 'TIMEOUT'].includes(error.code);
}
```

**TypeScript 客户端错误处理**：
```typescript
// src/ui/adapters/tauri-client.ts
import { invoke } from '@tauri-apps/api/core';
import type { AppError } from '../types/error';

export class TauriClient {
  async search(keyword: string): Promise<Comic[]> {
    try {
      return await invoke<Comic[]>('search_comics', { keyword });
    } catch (error: any) {
      // 解析错误消息
      const appError: AppError = parseError(error);
      throw appError;
    }
  }
}

function parseError(error: any): AppError {
  if (typeof error === 'string') {
    // Rust 返回的字符串错误
    return {
      code: 'UNKNOWN_ERROR',
      message: error,
      retryable: true
    };
  }
  
  if (error && typeof error === 'object') {
    // 已经是 AppError 格式
    return error as AppError;
  }
  
  // 未知错误
  return {
    code: 'UNKNOWN_ERROR',
    message: '发生未知错误',
    retryable: true
  };
}
```

**UI 组件错误处理**：
```vue
<!-- src/ui/views/SearchView.vue -->
<script setup lang="ts">
import type { AppError } from '../types/error';

const performSearch = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    const results = await client.search(keyword.value);
    searchResults.value = results;
  } catch (err: any) {
    const appError = err as AppError;
    error.value = appError;
    
    // 显示友好错误提示
    showError(appError.message);
    
    // 记录详细错误日志
    logger.error('搜索失败', {
      code: appError.code,
      details: appError.details
    });
    
    // 如果可重试，显示重试按钮
    if (appError.retryable) {
      showRetryButton();
    }
  } finally {
    loading.value = false;
  }
};

const showError = (message: string) => {
  ElMessage.error(message);
};
</script>

<template>
  <div>
    <el-alert
      v-if="error"
      type="error"
      :title="error.message"
      :closable="false"
    >
      <template v-if="error.details">
        <p>详细信息：{{ JSON.stringify(error.details) }}</p>
      </template>
      <el-button v-if="error.retryable" @click="retry">重试</el-button>
    </el-alert>
  </div>
</template>
```

#### 4.4.4 错误码映射表

**技术错误 → 用户友好消息**：

| 错误码 | 用户消息 | 详细日志 | 重试 |
|--------|---------|---------|------|
| `SEARCH_1001` | 搜索失败，请检查网络连接 | 包含完整错误堆栈 | ✅ |
| `SEARCH_1002` | 搜索超时，请稍后重试 | 包含超时时间 | ✅ |
| `SEARCH_1003` | 未找到相关漫画 | 包含搜索关键词 | ❌ |
| `DOWNLOAD_2001` | 下载失败，请重试 | 包含失败原因 | ✅ |
| `DOWNLOAD_2002` | 下载超时，网络可能不稳定 | 包含超时时间 | ✅ |
| `DOWNLOAD_2003` | 磁盘空间不足，请清理空间 | 包含磁盘剩余空间 | ❌ |
| `NETWORK_3001` | 网络连接失败 | 包含网络状态 | ✅ |
| `PROXY_3003` | 代理连接失败，请检查代理设置 | 包含代理地址 | ✅ |
| `FILE_4001` | 文件系统错误 | 包含文件路径 | ❌ |
| `PERMISSION_4002` | 权限不足，请检查文件夹权限 | 包含路径和权限 | ❌ |

#### 4.4.5 三层日志记录

**Rust 端日志**：
```rust
// src-tauri/src/main.rs
use log::{info, error, warn, debug};

#[command]
async fn search_comics(keyword: String) -> Result<Vec<Comic>, AppError> {
    info!("开始搜索：{}", keyword);
    
    match do_search(&keyword).await {
        Ok(comics) => {
            info!("搜索成功：找到 {} 部漫画", comics.len());
            Ok(comics)
        }
        Err(e) => {
            error!("搜索失败：{} - {}", keyword, e.code);
            debug!("详细错误：{:?}", e.details);
            Err(e)
        }
    }
}
```

**Node.js 端日志**：
```javascript
// scripts/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-server' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 5
    })
  ]
});

// 使用
logger.info('搜索开始', { keyword });
logger.error('搜索失败', { code: 'SEARCH_1001', details });
```

**TypeScript 端日志**：
```typescript
// src/ui/utils/logger.ts
import { invoke } from '@tauri-apps/api/core';

export const logger = {
  async error(message: string, context?: any) {
    console.error(message, context);
    // 发送到 Rust 日志系统
    await invoke('log_error', { message, context });
  },
  
  async info(message: string, context?: any) {
    console.info(message, context);
    await invoke('log_info', { message, context });
  },
  
  async warn(message: string, context?: any) {
    console.warn(message, context);
    await invoke('log_warn', { message, context });
  },
  
  async debug(message: string, context?: any) {
    console.debug(message, context);
    await invoke('log_debug', { message, context });
  }
};
```

#### 4.4.6 错误处理最佳实践

**1. 尽早捕获错误**：
```typescript
// ✅ 好的做法
try {
  const result = await riskyOperation();
  handleSuccess(result);
} catch (error) {
  handleError(error);
}

// ❌ 不好的做法
const result = await riskyOperation(); // 可能抛出未捕获的错误
handleSuccess(result);
```

**2. 提供有用的错误信息**：
```typescript
// ✅ 好的做法
throw new AppError({
  code: 'DOWNLOAD_2001',
  message: '下载失败：网络连接中断',
  details: { downloaded: 10, total: 100 },
  retryable: true
});

// ❌ 不好的做法
throw new Error('下载失败');
```

**3. 区分可重试和不可重试错误**：
```typescript
// ✅ 好的做法
if (error.code === 'NETWORK_3001') {
  // 网络错误，可重试
  showRetryButton();
} else if (error.code === 'PERMISSION_4002') {
  // 权限错误，不可重试
  showPermissionDialog();
}
```

**4. 记录完整的错误上下文**：
```typescript
// ✅ 好的做法
logger.error('下载失败', {
  aid: comic.aid,
  title: comic.title,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
});

// ❌ 不好的做法
console.log(error);
```

#### 4.4.7 优势

- ✅ **统一错误处理**：所有错误使用相同结构
- ✅ **友好的用户提示**：中文错误消息，易于理解
- ✅ **完整的日志记录**：便于调试和问题定位
- ✅ **支持重试机制**：区分可重试和不可重试错误

#### 4.4.8 劣势

- ⚠️ **需要三层错误转换**：可能丢失部分错误信息
- ⚠️ **需要维护错误码映射表**：增加维护成本
- ⚠️ **错误处理代码较多**：增加代码量

#### 4.4.9 中间件路由策略 ⭐ 更新

**问题**：全局 `notFoundHandler` 会拦截所有路径，包括欢迎页面和 Vue 应用

**解决方案**：按路径范围处理 404 错误

```typescript
// ✅ 正确：只处理 /api 路径下的 404
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `路由不存在：${req.method} ${req.path}`,
  });
});

// ❌ 错误：全局 404 处理会拦截所有路径
app.use(notFoundHandler);  // 会拦截 /app/*, / 等路径
```

**中间件注册顺序**：

```
1. CORS 中间件
2. JSON 解析中间件
3. 欢迎页面路由（GET /）
4. 测试路由（GET /app/test）
5. 静态文件服务（/app, /assets）
6. API 路由（/api/*）
7. API 404 处理（/api 路径）
```

**路由优先级**：

| 优先级 | 路径 | 处理 |
|--------|------|------|
| 1 | `GET /` | 欢迎页面（内嵌 HTML） |
| 2 | `/app/*` | Vue 应用静态文件 |
| 3 | `/assets/*` | CSS/JS 静态资源 |
| 4 | `/api/*` | API 路由 |
| 5 | `/api/*` (404) | API 404 错误 |

**注意事项**：
- ⚠️ Express 中间件按顺序执行，先注册的路由优先匹配
- ⚠️ `app.use()` 会匹配所有路径，`app.get()` 只匹配 GET 请求
- ⚠️ 静态文件中间件 `express.static()` 会处理匹配路径下的所有文件
- ✅ 欢迎页面路由必须在静态文件中间件之前注册

---

### 4.5 打包和分发策略 ⭐ 新增

**设计目标**：零成本快速发布 MVP，验证需求，后续根据用户反馈决定是否签名。

#### 4.5.1 安装包格式

**Windows**：
- **格式**：`.exe` (NSIS)
- **大小**：约 80MB
- **特点**：安装快速，支持卸载

**macOS**：
- **格式**：`.dmg`
- **大小**：约 80MB
- **特点**：拖拽安装，用户熟悉

**Linux**（后续考虑）：
- **格式**：`.AppImage` + `.deb`
- **特点**：通用格式，无需安装

#### 4.5.2 代码签名策略

**Phase 1（MVP）**：❌ 不签名（$0/年）

**Windows**：
- 用户看到 SmartScreen 警告
- 解决方案：点击"更多信息" → "仍要运行"

**macOS**：
- 用户需手动允许运行
- 解决方案：系统偏好设置 → 安全性 → "仍要打开"

**Phase 2（正式版，后续考虑）**：
- **Windows**：EV 证书（$200-400/年）
- **macOS**：Apple Developer 证书（$99/年）+ 公证

#### 4.5.3 打包体积

**组成**：
- Tauri 框架：~15MB
- Node.js 二进制：~60MB
- 前端资源：~5MB
- **总计**：~80MB（比 Electron ~150MB 小 45%）

#### 4.5.4 自动化构建

**工具**：GitHub Actions（免费，开源项目）

**流程**：
1. 推送版本标签（`v1.0.0`）
2. GitHub Actions 自动触发
3. 构建 Windows 和 macOS 版本
4. 上传到 GitHub Releases

#### 4.5.5 成本估算

| 项目 | Phase 1 | Phase 2 | 说明 |
|------|---------|---------|------|
| Windows 证书 | $0 | $200-400/年 | 初期不签名 |
| macOS 证书 | $0 | $99/年 | 初期不签名 |
| GitHub Actions | $0 | $0 | 开源项目免费 |
| **总计** | **$0/年** | **$299-499/年** | |

---

## 5. 数据流设计

### 5.1 搜索流程

```
用户输入关键字
    │
    ▼
构建搜索 URL
    │
    ▼
访问第一页 → 提取总页数
    │
    ▼
并行爬取所有页面
    │
    ▼
解析漫画信息（去重）
    │
    ▼
保存到 cache/search_{keyword}.json
    │
    ▼
显示搜索结果
```

---

### 5.2 对比流程

```
选择搜索结果 JSON
    │
    ▼
加载网站漫画数据
    │
    ▼
选择对比基准（本地 + 第三方）
    │
    ├──────────────┬────────────┐
    ▼              ▼            ▼
扫描本地文件夹   加载第三方数据  （待设计）
    │              │
    └──────────────┘
           │
           ▼
    AI 智能匹配（三方）
           │
           ▼
    名称校准（以第三方为准）
           │
           ▼
    生成对比结果
           │
           ▼
    保存到 cache/compare_*.json
           │
           ▼
    显示匹配详情
           │
           ▼
    人工确认下载清单
           │
           ▼
    生成下载清单 JSON
           │
           ▼
    跳转到下载页面
```

---

### 5.3 下载流程

```
加载下载清单 JSON
    │
    ▼
显示下载队列
    │
    ▼
用户点击"开始下载"
    │
    ▼
并发下载（支持断点续传）
    │
    ├──────────────┬──────────────┐
    ▼              ▼              ▼
成功下载        下载失败        实时进度
    │              │              │
    └──────────────┴──────────────┘
           │
           ▼
    文件完整性校验
           │
           ▼
    显示下载结果
```

---

## 6. 组件通信设计

### 6.1 Web 应用组件通信

**前端路由**：
```
Vue Router (history 模式)
├─ /app/              → 应用根路径
├─ /app/search        → 搜索页面
├─ /app/compare       → 对比页面
├─ /app/download      → 下载页面
└─ /app/config        → 配置页面
```

**API 通信**：
```
Vue 组件 → ApiClient → fetch('/api/...') → Express 路由 → 核心模块
```

**适配器模式**：
```typescript
// 环境检测
const client = isTauriEnvironment() 
  ? new TauriClient() 
  : new ApiClient();

// Web 模式
class ApiClient {
  async search(keyword: string) {
    const response = await fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify({ keyword })
    });
    return response.json();
  }
}
```

### 6.2 Tauri Commands 通信

**IPC 通信**：
```
Vue 组件 → TauriClient → invoke('command') → Rust Command → HTTP → Node.js API
```

**Tauri Commands 清单**：
- `search_comics`：搜索漫画
- `compare_comics`：对比漫画
- `download_comics`：下载漫画
- `cancel_download`：取消下载
- `get_cache_list`：获取缓存列表
- `delete_cache`：删除缓存
- `get_config`：获取配置
- `set_config`：保存配置
- `select_directory`：选择目录

### 6.3 Vue 组件通信

**Props 向下传递**：
```vue
<ComicCard 
  :comic="comicData"
  :selected="isSelected"
  @select="handleSelect"
/>
```

**Events 向上传递**：
```typescript
emit('add-to-queue', selectedComics)
emit('switch-tab', 'download')
```

**provide/inject 共享状态**：
```typescript
// App.vue
provide('downloadQueue', downloadQueue)

// View 组件
const downloadQueue = inject('downloadQueue')
```

---

## 7. 数据结构设计

### 7.1 核心数据类型

详见 [`spec.md`](file://c:\Users\SZD\Desktop\wnacg-download\.trae\specs\requirements\spec.md) 中的数据结构定义：
- 搜索结果 JSON 结构
- 对比结果 JSON 结构
- 下载清单 JSON 结构

---

## 8. 技术约束

### 8.1 必须遵守的规范

1. **Vue 3 规范**：
   - 使用 `<script setup>` 语法
   - 使用 `defineProps` 和 `defineEmits`
   - 使用 `ref` 和 `reactive` 管理状态
   - 使用 `<style scoped>` 避免样式污染

2. **TypeScript 规范**：
   - 所有组件 Props 和 Events 必须有类型定义
   - 避免使用 `any`，必要时用 `unknown`
   - 类型定义统一放在 `types.ts` 中

3. **代码规范**：
   - 遵循 ESLint 配置（`.eslintrc.json`）
   - 遵循 Prettier 配置（`.prettierrc.json`）
   - 使用 2 个空格缩进
   - 使用单引号
   - 语句末尾加分号

4. **Tauri 规范**：
   - 通过 `window.__TAURI__` 进行 Commands 调用
   - Rust 后端实现业务逻辑
   - 前端通过 invoke() 调用命令

---

## 9. 待设计内容

### 9.1 第三方网站数据源
- **状态**：待设计
- **说明**：第三方网站的数据获取方式、格式、存储等

### 9.2 AI 模型实现
- **状态**：待设计
- **说明**：本地模型文件格式、远程 API 接口规范等

### 9.3 配置文件具体路径
- **状态**：待确认
- **说明**：配置文件在项目文件夹下的具体存储位置
