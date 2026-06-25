# AGENTS.md - WNACG Downloader 开发规则

> 本文档是 WNACG Downloader 项目的**唯一开发规范源**，所有开发者和 AI 助手在编写代码前必须先阅读本文档。

---

## 🤖 AI 助手指引（阅读顺序：必读 → 按需）

### Step 1 - 入口约定

不同 AI 工具默认读取的入口文件：

| AI 工具 | 默认入口 | 本项目处理 |
|--------|---------|-----------|
| Trae | `AGENTS.md` + `.trae/rules/` | ✅ 直接读本文件 |
| Claude Code | `CLAUDE.md` | 未配置时请读 `AGENTS.md` |
| Cursor | `.cursorrules` / `.cursor/rules/` | 未配置时请读 `AGENTS.md` |
| GitHub Copilot | `.github/copilot-instructions.md` | 未配置时请读 `AGENTS.md` |
| 其他 AI | - | **统一以 `AGENTS.md` 为准** |

### Step 2 - 文档读取优先级

| 优先级 | 文档 | 何时必读 |
|--------|------|---------|
| 🔴 P0 必读 | `AGENTS.md`（本文档） | 任何任务开始前 |
| 🟠 P1 强烈推荐 | `docs/CODE_WIKI.md` | 涉及代码改动、模块交互、命令调用前 |
| 🟡 P2 按需 | `docs/需求规格.md` | 实现新业务功能、修改业务规则前 |
| 🟡 P2 按需 | `docs/架构设计.md` | 涉及模块边界、通信机制变更前 |
| 🟡 P2 按需 | `docs/界面设计.md` | 实现/修改 UI 前 |
| 🟡 P2 按需 | `docs/用户手册.md` | 修改用户可见行为前 |
| 🟢 P3 参考 | `docs/项目进度.md` | 了解当前阶段、待办、已知问题 |

### Step 3 - 任务类型 → 文档映射

| 任务类型 | 必读文档 | 参考文档 |
|---------|---------|---------|
| 🐛 修复 Bug | `AGENTS.md` + `docs/CODE_WIKI.md` | `docs/项目进度.md`（已知问题） |
| ✨ 新增业务功能 | `AGENTS.md` + `docs/CODE_WIKI.md` | `docs/需求规格.md` + `docs/界面设计.md` |
| 🎨 修改 UI | `AGENTS.md` + `docs/CODE_WIKI.md`（前端章节） | `docs/界面设计.md` |
| 🌐 修改搜索/爬取 | `AGENTS.md` + `docs/CODE_WIKI.md`（搜索流程） | `docs/需求规格.md`（搜索规则） |
| ⬇️ 修改下载逻辑 | `AGENTS.md` + `docs/CODE_WIKI.md`（下载器） | `docs/需求规格.md`（下载规则） |
| 🤖 修改 AI 匹配 | `AGENTS.md` + `docs/CODE_WIKI.md`（AI 模块） | `docs/需求规格.md`（AI 匹配规则） |
| 🔧 重构 | `AGENTS.md` + `docs/CODE_WIKI.md` + `docs/架构设计.md` | - |
| 📝 文档更新 | `AGENTS.md`（§开发流程） | - |

### Step 4 - 关键规则（最重要 ⚠️）

#### 规则 1：现状 vs 蓝图，以现状为准

- `docs/CODE_WIKI.md` 描述**代码现状**（实际已实现的模块、命令、事件、配置字段）
- `docs/需求规格.md` / `架构设计.md` / `界面设计.md` 描述**设计蓝图**（理想形态，可能未完全实现）
- **当两者冲突时，以 `CODE_WIKI.md` 为准**
- 如需实现蓝图中的新设计，需先确认范围，再同步更新 `CODE_WIKI.md`

#### 规则 2：代码变更必须同步文档

| 代码变更 | 必须同步更新 |
|---------|------------|
| 新增/修改 Tauri 命令 | `docs/CODE_WIKI.md`（命令章节） |
| 新增/修改事件类型 | `docs/CODE_WIKI.md`（事件章节）+ `docs/架构设计.md` |
| 新增/修改配置字段 | `docs/CODE_WIKI.md`（配置章节）+ `docs/需求规格.md`（如对用户可见） |
| 新增/修改业务规则 | `docs/需求规格.md` |
| 修改开发规范 | 仅修改 `AGENTS.md`（唯一规范源） |
| 阶段性进展、Bug、风险 | `docs/项目进度.md` |

#### 规则 3：禁止重复定义规范

- 所有开发规范**仅在 `AGENTS.md` 中定义**
- 其他文档若需引用规范，必须使用链接而非复制内容
- 发现规范在其他文档中被重复时，应清理并改为链接

#### 规则 4：文档先行

任何需求、架构、界面、代码修改，必须遵循以下流程：

1. **先讨论** — 有新想法或分歧时，先沟通确认方向
2. **改文档** — 需求变更更新 `docs/需求规格.md`，架构变更更新 `docs/架构设计.md`，界面变更更新 `docs/界面设计.md`
3. **后编码** — 文档确认后再写代码
4. **同步更新** — 代码修改完成后，同步更新 `docs/CODE_WIKI.md`，保持文档与代码一致

> 文档不是代码的附属品，文档是开发的指南针。

#### 规则 5：跨平台兼容

- 本项目同时支持 Windows 与 macOS
- 命令行示例需考虑两个平台（必要时分别提供 PowerShell / Zsh 版本）
- 路径处理使用 Rust `PathBuf` / Node.js `path.join()`，避免硬编码分隔符

### Step 5 - 快速命令参考

```bash
# 开发
npm run dev              # 完整 Tauri 开发模式（Vite + 桌面应用）
npm run dev:frontend     # 仅 Vite 开发服务器（端口 5173）

# 构建
npm run build            # 生产构建（前端 + Rust，打包桌面应用）
npm run build:frontend   # 仅类型检查 + 构建前端

# 代码质量
npm run lint             # ESLint
npm run format           # Prettier
npm test                 # Vitest 单元测试

# Rust（在 src-tauri/ 目录下）
cargo build              # 调试构建
cargo build --release    # 发布构建
cargo test               # Rust 单元测试
```

前置要求：Node.js >= 18，Rust >= 1.75.1。Windows 需 Visual Studio Build Tools。

---

## 1. 项目基本信息

- **项目名称**：WNACG Downloader
- **形态**：Tauri 2 桌面应用（Windows / macOS）
- **技术栈**：Vue 3.5 + TypeScript 5.3 + Vite 8 | Rust 2021 + Tauri 2 + Tokio | Playwright（Node.js）
- **详细技术文档**：[docs/CODE_WIKI.md](docs/CODE_WIKI.md)
- **设计文档目录**：[docs/](docs/)

---

## 2. 代码风格

### 2.1 命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| Vue 组件 | PascalCase | `SearchView.vue`、`ToastNotification.vue` |
| Vue Composable | camelCase，`use` 前缀 | `useDownload.ts`、`useSearch.ts` |
| TypeScript 类型 | PascalCase | `Comic`、`AppConfig`、`DownloadTask` |
| TS 变量/函数 | camelCase | `comicList`、`startDownload()` |
| TS 常量 | 大写下划线 | `DEFAULT_CONCURRENCY`、`MAX_RETRY` |
| Rust 模块/函数 | snake_case | `mod downloader`、`fn start_download()` |
| Rust 类型 | PascalCase | `struct DownloadTask`、`enum AppError` |
| Tauri 命令 | snake_case | `search_comics`、`get_download_info` |
| 事件名 | snake_case | `search_progress`、`download_complete` |

### 2.2 格式规范

- 缩进：2 空格（Rust 仍为 4 空格，遵循 `rustfmt` 默认）
- 字符串：单引号（TS）/ 双引号（Rust）
- 行尾：分号（TS）
- 每行最大 80 字符
- 文件末尾保留一个空行
- 使用 Prettier + ESLint（配置见 `.prettierrc.json`、`eslint.config.js`）

---

## 3. 目录结构约定

| 资源 | 位置 |
|------|------|
| 前端页面 | `src/views/` |
| 前端可复用组件 | `src/components/` |
| 前端组合式函数 | `src/composables/` |
| 前端类型定义（统一） | `src/types/index.ts` |
| 前端工具函数 | `src/utils/` |
| Tauri 命令处理器 | `src-tauri/src/commands/` |
| Rust 核心业务模块 | `src-tauri/src/core/` |
| Playwright 脚本 | `scripts/` |
| 设计与代码文档 | `docs/` |

详细模块说明见 [docs/CODE_WIKI.md](docs/CODE_WIKI.md)。

---

## 4. TypeScript 编码规范

- 使用 ES Module（`import/export`），禁用 CommonJS
- 类型定义统一放在 `src/types/index.ts`
- 优先 `interface` 定义对象类型，`type` 用于联合类型 / 工具类型
- 类的私有成员使用 `private`
- 异步函数返回 `Promise<T>`
- 严格模式开启（`noUnusedLocals` / `noUnusedParameters`），禁止使用 `any`，必要时用 `unknown`

```typescript
// ✅ 好的做法
interface Comic {
  aid: string;
  title: string;
  coverUrl: string;
}

async function getComic(aid: string): Promise<Comic> {
  // ...
}

// ❌ 不好的做法
async function getComic(aid: any): Promise<any> {
  // ...
}
```

---

## 5. Vue 编码规范

- 使用 `<script setup>` 语法
- 组件命名 PascalCase
- Props 用 `defineProps`，事件用 `defineEmits`
- 状态用 `ref` / `reactive`
- 样式必须 `<style scoped>`，使用项目主色（紫色渐变 `#667eea → #764ba2`）
- 可复用组件放 `src/components/`，页面组件放 `src/views/`

---

## 6. Rust 编码规范

- 使用 `thiserror` 定义错误（`AppError` 枚举位于 `src-tauri/src/error.rs`）
- 异步函数使用 `async/await` + `tokio`
- 错误信息使用**中文**
- 配置与类型使用 `serde` 序列化
- 发布版配置：`panic = "abort"`、`lto = true`、`codegen-units = 1`、`opt-level = "s"`、`strip = true`（最小化二进制体积）
- `src-tauri/src/core/scraper/` 已标记为死代码，**不要新增对其的引用**（实际搜索使用 Playwright）

---

## 7. 错误处理

- 所有错误必须被捕获，向用户友好提示
- 网络错误：明确说明（连接失败 / 超时 / 限流）
- 下载失败：记录原因到日志
- 异步代码使用 try-catch
- 日志包含上下文（如 aid、标题、错误堆栈）

```typescript
// ✅ 好的做法
try {
  await downloadComic(comic);
} catch (error) {
  logger.error(`下载失败：${comic.title}`, {
    aid: comic.aid,
    error: error.message,
    stack: error.stack,
  });
}

// ❌ 不好的做法
downloadComic(comic).catch(console.log);
```

---

## 8. 语言规则

中文使用场景（不可使用英文）：

- ✅ 代码注释
- ✅ 日志信息
- ✅ 错误提示
- ✅ 用户界面文字
- ✅ Git 提交信息描述

```typescript
// ✅ 好的做法
console.log('搜索中...');
logger.info('开始下载漫画');

// ❌ 不好的做法
console.log('Searching...');
logger.info('Start downloading comics');
```

---

## 9. 测试策略

- 框架：Vitest（前端）+ `#[cfg(test)]`（Rust）
- 测试文件命名：`*.test.ts`，与被测文件就近放置（如 `composables/__tests__/`、`utils/__tests__/`）
- 必须有测试的范围：
  - 核心业务逻辑（downloader、comparer、ai matcher）
  - 错误处理路径
  - 边界条件（空列表、网络中断、限流）
- 运行：`npm test`、`cd src-tauri && cargo test`

---

## 10. Git 提交规范

### 10.1 提交格式

```
<type>: <subject>
```

### 10.2 type 可选值

| type | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构 |
| `test` | 测试相关 |
| `chore` | 构建 / 工具 / 依赖 |

### 10.3 示例

```
feat: 添加搜索缓存功能
fix: 修复下载失败时任务卡住的问题
docs: 更新需求规格中的下载源策略说明
refactor: 提取下载并发控制为独立模块
```

`<subject>` 全部使用中文，简洁说明做了什么。

### 10.4 分支命名

- 主分支：`main`
- 功能分支：`feature/<功能名>`
- 修复分支：`fix/<问题描述>`
- 重构分支：`refactor/<模块名>`

---

## 11. 跨平台约束

支持 Windows 11 + PowerShell 5.1+ 与 macOS + Zsh/Bash。

### 11.1 命令兼容

| 操作 | PowerShell | Unix Shell |
|------|------------|------------|
| 目录切换 | `Set-Location` | `cd` |
| 删除文件 | `Remove-Item` | `rm -rf` |
| 命令分隔 | `;` | `&&` |

### 11.2 路径处理

- Rust：使用 `PathBuf` / `Path::join()`
- Node.js：使用 `path.join()`
- TS：避免硬编码 `\\` 或 `/`

### 11.3 AI 助手约束

- 生成命令前确认在目标平台可用
- 不使用某一平台独有的命令
- 必要时同时给出两种平台的写法

---

## 12. 开发流程

1. **需求确认** → 查阅 [docs/需求规格.md](docs/需求规格.md)
2. **架构对齐** → 参考 [docs/架构设计.md](docs/架构设计.md) 和 [docs/CODE_WIKI.md](docs/CODE_WIKI.md)
3. **界面对齐** → 参考 [docs/界面设计.md](docs/界面设计.md)
4. **代码实现** → 遵循本文档第 2-9 节规范
5. **测试验证** → 运行 `npm run lint && npm run build && npm test`
6. **同步文档** → 代码变更同步更新 [docs/CODE_WIKI.md](docs/CODE_WIKI.md) 及相关设计文档
7. **更新进度** → 阶段性进展记录到 [docs/项目进度.md](docs/项目进度.md)

---

## 13. AI 工具技能

按场景选用可用 Skill：

**UI / 前端**
- `ui-ux-pro-max`: UI/UX 设计 ⭐ **业务页面首选** — Vue 栈、图表、设计系统
- `frontend-design`: 创意视觉设计 — banner、营销页
- `frontend-skill`: 落地页 / 原型展示

**测试 / 调试**
- `webapp-testing`: Playwright 应用测试
- `TRAE-debugger`: 复杂运行时问题调试

**代码质量 / 审查**
- `TRAE-code-review`: 代码审查
- `karpathy-guidelines`: 减少 AI 编码错误

**安全**
- `security-best-practices`: 安全最佳实践
- `TRAE-security-review`: 漏洞风险扫描

**Git / GitHub**
- `git-commit`: 智能 conventional commit
- `gh-cli`: GitHub CLI 操作

---

## 14. 文档导航

| 文档 | 用途 |
|------|------|
| [README.md](README.md) | 项目入口、快速开始 |
| [AGENTS.md](AGENTS.md)（本文档） | 开发规则与规范 |
| [docs/CODE_WIKI.md](docs/CODE_WIKI.md) | 代码实现文档（架构、命令、事件、配置） |
| [docs/需求规格.md](docs/需求规格.md) | 功能需求与业务规则（搜索 / 下载 / AI 匹配） |
| [docs/架构设计.md](docs/架构设计.md) | 技术架构蓝图 |
| [docs/界面设计.md](docs/界面设计.md) | UI 布局与视觉设计 |
| [docs/用户手册.md](docs/用户手册.md) | 终端用户操作指南 |
| [docs/项目进度.md](docs/项目进度.md) | 版本、Phase、待办、已知问题 |

---

**版本**: v5.0  
**最后更新**: 2026-06-24
