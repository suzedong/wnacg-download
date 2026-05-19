# WNACG Downloader — 贡献指南

欢迎参与 WNACG Downloader 项目！本指南帮助你快速开始开发。

---

## 目录

1. [环境搭建](#1-环境搭建)
2. [项目结构](#2-项目结构)
3. [开发工作流](#3-开发工作流)
4. [编码规范](#4-编码规范)
5. [测试](#5-测试)
6. [报告 Bug](#6-报告-bug)
7. [提出新功能](#7-提出新功能)

---

## 1. 环境搭建

### 前置要求

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 18.0.0 | 前端运行时和构建工具 |
| Rust | >= 1.75.1 | Tauri 后端编译 |
| npm / pnpm | — | 包管理（推荐 pnpm） |

**Windows 额外要求**：
- Visual Studio Build Tools（安装时勾选 "C++ build tools"）

**macOS 额外要求**：
- Xcode Command Line Tools（运行 `xcode-select --install`）

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/YOUR-USERNAME/wnacg-download.git
cd wnacg-download

# 安装前端依赖
pnpm install

# 启动开发模式
npm run dev
```

### 国内镜像加速

**npm**：
```bash
npm config set registry https://registry.npmmirror.com
```

**Rust/Cargo**（编辑 `~/.cargo/config.toml`）：
```toml
[source.crates-io]
replace-with = 'tuna'

[source.tuna]
registry = "https://mirrors.tuna.tsinghua.edu.cn/git/crates.io/index.git"

[net]
git-fetch-with-cli = true
```

### 验证环境

```bash
node --version       # >= 18.0.0
rustc --version      # >= 1.75.1
pnpm list            # 应显示所有依赖
```

---

## 2. 项目结构

```
wnacg-download/
├── src/                         # 前端（Vue 3 + TypeScript）
│   ├── components/              # 可复用 UI 组件
│   ├── views/                   # 页面组件
│   │   ├── SearchView.vue       # 搜索页面
│   │   ├── CompareView.vue      # 对比页面
│   │   ├── DownloadView.vue     # 下载页面
│   │   └── ConfigView.vue       # 设置页面
│   ├── composables/             # 组合式函数（状态管理）
│   ├── types/                   # TypeScript 类型定义
│   ├── App.vue                  # 根组件
│   └── main.ts                  # 入口文件
├── src-tauri/                   # Tauri 后端（Rust）
│   ├── src/
│   │   ├── main.rs              # Tauri Commands 注册
│   │   ├── commands/            # 命令处理器
│   │   ├── core/                # 核心业务逻辑
│   │   │   ├── downloader/      # 并发下载模块
│   │   │   ├── comparer/        # 对比协调模块
│   │   │   ├── scanner/         # 本地文件扫描
│   │   │   └── ai/              # AI 匹配模块
│   │   ├── config.rs            # 配置管理
│   │   ├── types.rs             # Rust 类型
│   │   ├── events.rs            # 事件结构体
│   │   └── error.rs             # 错误处理
│   ├── Cargo.toml               # Rust 依赖
│   └── tauri.conf.json          # Tauri 配置
├── scripts/                     # Playwright 脚本
│   ├── search_with_playwright.js        # 搜索
│   ├── get_download_info.js             # 获取下载信息
│   └── download_via_playwright.js       # 通过 Playwright 下载
├── docs/                        # 项目文档
├── cache/                       # 缓存目录（运行时生成）
├── package.json
└── vite.config.ts
```

### 前后端通信

- **前端 → 后端**：通过 `invoke('command_name', args)` 调用 Tauri Commands
- **后端 → 前端**：通过 `listen('event_name', callback)` 监听 Tauri Events

---

## 3. 开发工作流

### 分支策略

```
main                    # 主分支，随时可发布
├── feature/xxx         # 新功能分支
├── fix/xxx             # Bug 修复分支
└── refactor/xxx        # 重构分支
```

### 开发步骤

1. **Fork 仓库**并克隆到本地
2. **创建分支**：`git checkout -b feature/your-feature-name`
3. **开发功能**：遵循编码规范，及时提交
4. **运行检查**：
   ```bash
   npm run lint         # ESLint 检查
   npm run format       # Prettier 格式化
   npm test             # 运行测试
   npm run build        # 确保编译通过
   ```
5. **提交代码**：遵循 Git 提交规范
6. **发起 Pull Request**：描述功能变更、测试方法

### Git 提交规范

格式：`<type>: <subject>`

| type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加搜索缓存功能` |
| `fix` | Bug 修复 | `fix: 修复下载失败问题` |
| `docs` | 文档更新 | `docs: 更新需求规格说明书` |
| `style` | 代码格式调整 | `style: 格式化 Rust 代码` |
| `refactor` | 重构 | `refactor: 重构下载模块` |
| `test` | 测试相关 | `test: 添加扫描器单元测试` |
| `chore` | 构建/工具链 | `chore: 更新 Cargo 依赖` |

### Pull Request 要求

- 标题简洁明了，描述做了什么
- 附上测试方法（手动测试或自动化测试）
- 如果修改了 UI，附上截图
- 保持 PR 聚焦，避免一个 PR 做太多不相关的改动

---

## 4. 编码规范

### 通用规则

- 所有注释、日志、用户提示使用**中文**
- 代码标识符使用英文
- 优先编辑现有文件，不创建新文件
- 不引入过度抽象，保持简单

### TypeScript / Vue

- 使用 `<script setup>` 语法
- 启用严格模式，避免 `any`
- 类型定义统一在 `src/types/index.ts`
- 组件使用 PascalCase 命名
- 样式使用 `<style scoped>`

```typescript
// ✅ 好的做法
interface Comic {
  aid: string;
  title: string;
  coverURL: string;
}

// ❌ 不好的做法
interface Comic {
  aid: any;
  title: any;
}
```

### Rust

- 使用 `thiserror` 进行错误处理
- 异步函数使用 `async/await`
- 配置和类型使用 `serde` 序列化
- 错误信息使用中文

```rust
// ✅ 好的做法
#[derive(thiserror::Error, Debug)]
pub enum AppError {
    #[error("网络请求失败: {0}")]
    NetworkError(String),
    #[error("配置文件读取失败: {0}")]
    ConfigError(#[from] std::io::Error),
}
```

### 代码格式化

项目使用 Prettier + ESLint：

```bash
npm run lint      # 检查
npm run format    # 格式化
```

---

## 5. 测试

### 运行测试

```bash
npm test
```

### 编写测试

- 测试框架：Vitest
- 测试文件命名：`*.test.ts`
- 测试目录：`src/__tests__/`

**测试优先级**：
1. 纯函数（工具函数、匹配算法）— 必须 100% 覆盖
2. Composables（useDownloadQueue 等）— 核心逻辑覆盖
3. 组件渲染测试 — 按需补充

```typescript
import { describe, it, expect } from 'vitest';

describe('formatBytes', () => {
  it('格式化字节数', () => {
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1048576)).toBe('1.00 MB');
  });
});
```

### Rust 测试

```bash
cd src-tauri
cargo test
```

---

## 6. 报告 Bug

### 提交 Bug 时请包含以下信息

1. **环境信息**：操作系统、应用版本
2. **复现步骤**：详细的操作步骤
3. **预期行为**：你期望发生什么
4. **实际行为**：实际发生了什么
5. **截图/日志**：错误截图或控制台日志

### 提交方式

- 在 GitHub Issues 中创建 Issue，选择 Bug Report 模板
- 标题格式：`[Bug] 简短描述`

---

## 7. 提出新功能

### 提交功能请求时请说明

1. **功能描述**：你想要什么功能
2. **使用场景**：为什么需要这个功能，解决了什么问题
3. **预期行为**：功能应该如何使用
4. **备选方案**：是否有其他替代方案

### 提交方式

- 在 GitHub Issues 中创建 Issue，选择 Feature Request 模板
- 标题格式：`[Feature] 功能描述`

---

## 快速参考

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Tauri 开发模式 |
| `npm run dev:frontend` | 仅启动 Vite 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run lint` | ESLint 检查 |
| `npm run format` | Prettier 格式化 |
| `npm test` | 运行测试 |

### 重要文档

- [需求规格](./REQUIREMENTS.md) — 功能需求
- [架构设计](./ARCHITECTURE.md) — 技术架构
- [界面设计](./UI-DESIGN.md) — UI 设计稿
- [开发计划](./DEVELOPMENT_PLAN.md) — 当前任务列表
- [用户手册](./USER_MANUAL.md) — 面向用户的使用指南

---

感谢你的贡献！
