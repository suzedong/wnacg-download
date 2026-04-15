# WNACG Downloader - 架构设计文档

## 1. 系统概述

WNACG Downloader 是一个支持 CLI、Web 应用和桌面客户端三模式的应用程序，用于从 wnacg.com 网站搜索、对比和下载汉化漫画。

### 1.1 三架构设计

**产品形态**：
1. **CLI 工具**：命令行界面，支持脚本化、自动化操作
2. **Web 应用**：浏览器访问，跨平台，无需安装
3. **桌面客户端**：Electron 打包，提供原生体验

**设计原则**：
- **核心共享**：爬虫、下载、对比、AI 匹配等核心模块完全共享
- **UI 复用**：Web 和 Electron 共享同一套 Vue 组件
- **接口分离**：CLI、Web、Electron 使用各自的交互接口
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
│  │ Commander   │  │ Express     │  │ Electron    │            │
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
2. **Web 应用**：Express 服务器 + Vue 前端，通过 HTTP API 通信
3. **桌面客户端**：Electron 封装，通过 IPC 与主进程通信
4. **共享核心**：三种架构共享同一套核心业务模块

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
| **后端框架** | Express.js | HTTP 服务器，提供 RESTful API |
| **前端框架** | Vue 3 + TypeScript | 组件化 UI（与 Electron 共享） |
| **构建工具** | Vite | 快速开发和构建 |
| **API 通信** | Fetch API / Axios | HTTP 请求 |

#### 客户端专用

| 模块 | 技术 | 说明 |
|------|------|------|
| **前端框架** | Vue 3 + TypeScript | 组件化 UI（与 Web 共享） |
| **构建工具** | Vite | 快速开发和构建 |
| **桌面框架** | Electron | 跨平台桌面应用 |
| **IPC 通信** | Electron IPC | 主进程与渲染进程通信 |

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
│   ├── ui/                        # 前端 UI（Web 和 Electron 共享）⭐ 修改
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
│   │   │   └── electron-client.ts # Electron IPC 客户端
│   │   │
│   │   ├── main.ts                # Web 入口
│   │   └── App.vue                # 应用根组件
│   │
│   ├── electron/                  # Electron 专用 ⭐ 新增
│   │   ├── main.ts                # Electron 主进程
│   │   ├── preload.ts             # 预加载脚本
│   │   └── ipc-handlers.ts        # IPC 处理器
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
├── vite.config.ts                 # Vite 配置（Web 和 Electron 共享）
└── electron-builder.json          # Electron 打包配置 ⭐ 新增
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
   - Web 和 Electron 共享
   - **适配器层**：统一通信接口
   - **组合式函数**：共享业务逻辑
   - **组件**：纯 UI 展示

4. **Electron 层** (`src/electron/`)
   - 主进程管理窗口和系统功能
   - IPC 处理器调用核心业务
   - 预加载脚本暴露 API 给渲染进程

---

## 4. 架构模式设计

### 4.1 适配器模式（Adapter Pattern）⭐ 新增

**设计目标**：让 Web 和 Electron 共享同一套 UI 组件，无需关心通信方式的差异。

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
│  │  ApiClient      │         │ ElectronClient  │       │
│  │  (Web 专用)      │         │ (Electron 专用)  │       │
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
│   Web API       │             │  Electron IPC   │
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

**Electron 实现**：

```typescript
// src/ui/adapters/electron-client.ts
export class ElectronClient implements ISearchClient, IDownloadClient, ICompareClient {
  async search(keyword: string, options: SearchOptions): Promise<Comic[]> {
    return window.electronAPI.searchComics(keyword, options);
  }
  
  async download(comics: Comic[], options: DownloadOptions): Promise<DownloadResult> {
    return window.electronAPI.downloadComics(comics, options);
  }
  
  // ... 其他方法
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

### 6.1 Electron IPC 通信

```
┌─────────────────┐              ┌─────────────────┐
│  渲染进程        │              │  主进程          │
│                 │              │                 │
│  window.        │──request──►  │  ipcMain.       │
│  electronAPI    │              │  handle()       │
│                 │              │                 │
│  window.        │◄─response─── │  ipcMain.       │
│  electronAPI    │              │  handle()       │
└─────────────────┘              └─────────────────┘
```

**IPC 接口清单**：
- `search-comics`：搜索漫画
- `compare-comics`：对比漫画
- `download-comics`：下载漫画
- `select-directory`：选择目录
- `get-config`：获取配置
- `set-config`：保存配置

---

### 6.2 Vue 组件通信

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

4. **Electron 规范**：
   - 通过 `window.electronAPI` 进行 IPC 通信

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
