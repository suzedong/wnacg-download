# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 概述

WNACG Downloader 是一款 Tauri 2 桌面应用，用于搜索、对比和下载来自 wnacg.com 的汉化漫画。采用 Vue 3 + TypeScript 前端和 Rust 后端，支持并发下载、断点续传、AI 智能标题匹配和代理配置。

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
- 事件类型：`search_progress`、`search_complete`、`download_progress`、`download_complete`、`compare_progress`、`ai_progress`、`error`

### Tauri 命令（注册于 [src-tauri/src/main.rs](src-tauri/src/main.rs)）

| 命令 | 说明 |
|---|---|
| `get_config`、`save_config`、`reset_config` | 配置管理 |
| `open_folder` | 打开本地文件夹（系统原生方式：explorer/open/xdg-open） |
| `search_comics` | 为每页派生 Node.js Playwright 脚本，并行执行 |
| `compare_comics` | 读取缓存的搜索结果，扫描本地文件夹，本地优先匹配 + AI 兜底标题匹配 |
| `save_compare_result`、`load_compare_result` | 对比结果持久化（保存/加载历史对比记录） |
| `get_download_info` | 通过 Playwright 获取下载页信息（file_key、file_name、server2_url） |
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
  - **ai/** — AiMatcher 两阶段匹配：先本地精确/模糊匹配（Levenshtein + 前缀清洗），AI 仅兜底未匹配的漫画（每批 20 条，SSE 流式输出）
  - **scraper/** — 遗留的 HTTP 爬虫（reqwest + scraper），标记为 `#[allow(dead_code)]`；**当前未使用**，实际搜索使用 Playwright
- [config.rs](src-tauri/src/config.rs) — 配置文件位于 `{exe_dir}/config/config.json`
- [events.rs](src-tauri/src/events.rs) — 事件结构体定义
- [error.rs](src-tauri/src/error.rs) — AppError 枚举
- [types.rs](src-tauri/src/types.rs) — Rust 类型模块

### Playwright 脚本（`scripts/`）

- [search_with_playwright.js](scripts/search_with_playwright.js) — 搜索漫画，打开真实浏览器访问 wnacg.com 搜索结果页，提取漫画列表
- [get_download_info.js](scripts/get_download_info.js) — 获取下载页信息，打开下载页提取 file_key、file_name 和 server2_url
- [get_download_link.js](scripts/get_download_link.js) — 调用 Worker API 获取临时下载链接（已删除）
- [download_via_playwright.js](scripts/download_via_playwright.js) — 单浏览器一步完成：获取链接 + 浏览器内下载下载（绕过 Cloudflare TLS 指纹）

### 搜索流程（Playwright，非 Rust HTTP）

`search_comics` → 派生 `node scripts/search_with_playwright.js <keyword> <page>` → 有头 Chromium 浏览器访问 wnacg.com → 从 `div.pic_box` 元素提取数据 → 输出 JSON 到标准输出。这样可以避免纯 HTTP 请求被 Cloudflare 拦截的问题。

### 配置

存储路径：`{exe_dir}/config/config.json`。主要字段：`storage_path`（存储路径）、`proxy`/`proxy_enabled`（代理）、`max_pages`（最大页数）、`request_interval`（请求间隔）、`search_chinese_only`（仅中文搜索）、`concurrent_downloads`（并发下载数，默认 3）、`retry_times`（重试次数，默认 3）、`retry_interval`（重试间隔，默认 30 秒）、`download_source_preference`（下载源策略，默认 server2）、`ai_api_url`、`ai_api_key`、`ai_model`（AI 模型名称）、`ai_prompt`（AI Prompt 模板）、`ai_temperature`（AI 温度，默认 0.0）、`match_threshold`（匹配阈值，默认 0.8）、`theme`（主题：light/dark）。

### 缓存

存储路径：`{exe_dir}/cache/`，以 JSON 文件形式存储（如 `search_{keyword}.json`、`compare_{keyword}_{timestamp}.json`）。

---

## 功能规则

### 代理配置
- 默认使用配置文件中的代理设置
- 支持通过配置界面修改代理设置

### 搜索规则
- 爬取所有页面，无页数限制
- **搜索结果持久化存储**：每次都从网站获取最新数据，搜索结果保存到本地文件供对比使用
- 只搜索汉化版漫画：过滤条件为 `category` 字段包含"漢化"字样（可通过配置包含所有漫画）
- 爬取地址：`https://www.wnacg.com/search/index.php?q={keyword}&m=&syn=yes&f=_all&s=create_time_DESC&p={page}`
- **使用 Playwright 浏览器自动化**：通过 `scripts/search_with_playwright.js` 脚本打开真实浏览器进行搜索
- 爬取流程：
  1. 打开第一页，提取总页数信息
  2. 解析第一页的漫画信息
  3. 并行打开所有剩余页面，提高爬取效率
  4. 解析所有页面的漫画信息
  5. 去重、过滤、保存到文件
- **请求间隔**：默认 **1000ms**（平衡速度和礼貌爬取）
- 数据存储：搜索结果保存到 `cache/search_{keyword}.json`
- 漫画卡片选择器：`li.gallary_item`
- 分类容器：`div.pic_box`（`cate-*` 类名在此元素上）
- 链接格式：`a[href*="photos-index"]`，aid 格式：`aid-{数字}`
- 标题处理：需要去除 `<em>` 标签和 HTML 实体（`&nbsp;`、`&amp;`、`&#124;` 等）
- 图片数量：从 `div.info_col` 提取（匹配 `(\d+)張圖片`）
- 创建时间：从 `div.info_col` 提取（匹配 `創建於(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})`）
- 分类映射表：

| 类名 | 分类名称 |
|------|----------|
| cate-1 | 同人誌／漢化 |
| cate-2 | 同人誌／CG畫集 |
| cate-3 | 寫真 & Cosplay |
| cate-5 | 同人誌 |
| cate-6 | 單行本 |
| cate-7 | 雜誌&短篇 |
| cate-9 | 單行本／漢化 |
| cate-10 | 雜誌&短篇／漢化 |
| cate-12 | 同人誌／日語 |
| cate-13 | 單行本／日語 |
| cate-14 | 雜誌&短篇／日語 |
| cate-16 | 同人誌／English |
| cate-17 | 單行本／English |
| cate-18 | 雜誌&短篇／English |
| cate-19 | 韓漫 |
| cate-20 | 韓漫／漢化 |
| cate-21 | 韓漫／生肉 |
| cate-22 | 3D&漫畫 |
| cate-23 | 3D&漫畫／漢化 |
| cate-24 | 3D&漫畫／其他 |
| cate-37 | AI&圖集 |

### 下载规则
- 自动对比本地已有漫画，避免重复下载
- 支持并发下载，默认并发数为 3
- 下载失败时会尝试重试
- 支持断点续传
- 下载完成后校验文件完整性
- **获取下载地址的策略**（通过 `download_source_preference` 配置）：
  - **server2**（默认推荐）：从下载页提取的 `server2_url`（`dl1.wn01.download`），reqwest 直连下载，最快
  - **worker_api**：`download_via_playwright.js` 单浏览器一步完成（获取链接 + 下载），绕过 Cloudflare TLS 指纹
- Worker API 链接（`d1.wcdn.date`）必须通过 Playwright 浏览器下载，reqwest/curl 被 Cloudflare TLS 指纹拦截

### AI 匹配规则
- **两阶段匹配流程**：
  1. **本地优先**：Levenshtein 距离 + 标题前缀清洗（去除 `[TYPE.90]` 等），置信度 >= match_threshold 即标记为已拥有
  2. **AI 兜底**：仅对本地未匹配的漫画调用 AI API（OpenAI 兼容接口，SSE 流式输出），减少 API 调用
- **AI API 未配置时**：所有未匹配的漫画自动标记为 `need_download`，不会丢失
- 前端实时显示 AI 流式输出内容（`ai_progress` 事件的 `streaming_content` 字段）
- 匹配阈值可通过配置调整，默认为 0.8
- 全部本地匹配时跳过 AI，零 API 调用

---

## 开发规范

### 工作原则

**开发前**：
1. 阅读 `docs/REQUIREMENTS.md` - 理解功能需求
2. 阅读 `docs/ARCHITECTURE.md` - 理解架构设计
3. 对照验收标准 - 明确完成标准

**开发中**：
1. 遵循架构设计 - 不要随意更改
2. 遵守开发规范 - TypeScript/Rust/Vue 规范
3. 完整的错误处理 - 所有错误都要捕获
4. 中文注释和日志 - 所有提示用中文

**开发后**：
1. 对照验收标准 - 自我验证
2. 运行 lint 检查 - 确保代码规范
3. 运行 build 验证 - 确保编译通过
4. 更新文档 - 如有必要

### 禁止行为 ❌

-  不阅读文档就编码
- ❌ 跳过验收标准
- ❌ 随意更改架构设计
- ❌ 忽略错误处理
- ❌ 使用英文注释和日志
- ❌ 跳过测试验证

### 必须遵守 ✅

- ✅ 先理解需求再开发
- ✅ 遵循 TypeScript/Rust/Vue 规范
- ✅ 完整的错误处理
- ✅ 中文注释和日志

---

### TypeScript 编码规范

#### 基本规则
- 使用 ES Module (`import/export`)，不使用 CommonJS
- 类型定义统一放在 `types/index.ts` 中
- 优先使用接口定义对象类型，类型别名用于联合类型等
- 类的私有成员使用 `private` 关键字
- 异步函数返回 `Promise<T>` 类型
- 避免使用 `any`，必要时用 `unknown` 代替
- 启用严格模式，包括 `noUnusedLocals` 和 `noUnusedParameters`

#### 类型安全
```typescript
// ✅ 好的做法
interface Comic {
  aid: string;
  title: string;
  coverUrl: string;
}

function getComic(aid: string): Promise<Comic> {
  // ...
}

// ❌ 不好的做法
function getComic(aid: any): Promise<any> {
  // ...
}
```

---

### Vue 编码规范

#### 基本规则
- 使用 `<script setup>` 语法
- 组件命名使用 PascalCase
- Props 定义使用 `defineProps`
- 事件使用 `defineEmits`
- 状态管理使用 `ref` 和 `reactive`
- 样式使用 `<style scoped>` 避免污染

#### 组件结构
```vue
<template>
  <div class="comic-card">
    <h3>{{ comic.title }}</h3>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  comic: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['select', 'download']);
</script>

<style scoped>
.comic-card {
  /* ... */
}
</style>
```

---

### Rust 编码规范

- 使用 `thiserror` 进行错误处理
- 异步函数使用 `async/await`
- 错误信息使用中文
- 配置和类型使用 `serde` 序列化
- 发布版配置：`panic = "abort"`、`lto = true`、`codegen-units = 1`、`opt-level = "s"`、`strip = true`（最小化二进制体积）

---

### UI 设计规范

- 遵循 `docs/UI-DESIGN.md` 中的设计稿
- 保持界面一致性
- 桌面端优化（系统标题栏、侧边栏导航）
- 支持暗色模式
- 跨平台适配（macOS/Windows 统一使用系统标题栏）
- 使用 scoped 样式
- 遵循配色方案（紫色渐变 #667eea → #764ba2）
- 可复用组件放在 `src/components/`
- 页面组件放在 `src/views/`

---

### 代码格式化

- 使用 Prettier 格式化（配置见 `.prettierrc.json`）
- 使用 ESLint 检查（配置见 `.eslintrc.json`）
- 缩进：2 个空格
- 单引号
- 行尾分号
- 每行最大 80 字符

```typescript
// ✅ 好的做法
const config = {
  proxy: 'http://127.0.0.1:7890',
  maxPages: 5,
};

// ❌ 不好的做法
const config = {
    proxy: "http://127.0.0.1:7890",
    maxPages: 5
}
```

---

### 错误处理

#### 基本原则
- 所有错误都应该被捕获并友好地显示给用户
- 网络错误时提供明确的错误信息
- 下载失败时记录失败原因
- 使用 try-catch 捕获异步错误

#### 错误日志
```typescript
// ✅ 好的做法
logger.error(`下载失败：${comic.title}`, {
  aid: comic.aid,
  error: error.message,
  stack: error.stack,
});

// ❌ 不好的做法
console.log(error);
```

---

### 测试策略

- 使用 Vitest 作为测试框架
- 核心模块（scraper, downloader, matcher）需要写单元测试
- 测试文件命名：`*.test.ts`
- 运行测试：`npm test`
- 核心业务逻辑必须有测试
- 错误处理必须有测试
- 边界条件必须有测试

---

### Git 提交规范

#### 提交格式
```
<type>: <subject>
```

#### type 可选值
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

#### 示例
```
feat: 添加搜索缓存功能
fix: 修复下载失败问题
docs: 更新需求规格说明书
refactor: 重构爬虫模块
```

全部使用中文描述，简洁明了，说明做了什么。

---

### 语言规则

#### 中文使用场景
- ✅ 开发中所有的提示都用中文
- ✅ 代码注释使用中文
- ✅ 日志信息使用中文
- ✅ 错误提示使用中文
- ✅ 用户界面文字使用中文

#### 示例
```typescript
// ✅ 好的做法
console.log('搜索中...');
logger.info('开始下载漫画');
alert('下载完成！');

// ❌ 不好的做法
console.log('Searching...');
logger.info('Start downloading comics');
alert('Download complete!');
```

---

## 重要注意事项

- `src-tauri/src/core/scraper/mod.rs` 是**遗留代码**（已标记为死代码），实际搜索使用 Playwright
- TypeScript 启用了严格模式，包括 `noUnusedLocals` 和 `noUnusedParameters`
- 发布版配置：`panic = "abort"`、`lto = true`、`codegen-units = 1`、`opt-level = "s"`、`strip = true`（最小化二进制体积）
- 详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 获取完整的架构文档
- 详见 [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) 获取完整的需求规格
- 详见 [docs/UI-DESIGN.md](docs/UI-DESIGN.md) 获取完整的界面设计规范

---

**最后更新**: 2026-05-17  
**版本**: v4.0（纯桌面端重构版）
