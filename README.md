# WNACG Downloader

一个桌面客户端应用，支持从 wnacg.com **搜索**、**对比**和**下载**汉化漫画。

<p align="center">
  <strong>技术栈</strong>: Tauri 2 · Rust · Vue 3 · TypeScript · Playwright
</p>

---

## ✨ 特性

- **搜索漫画** — 通过关键字搜索网站漫画，支持并发爬取多页，自动去重
- **智能对比** — 自动对比本地漫画，避免重复下载（本地精确匹配 + AI 兜底）
- **批量下载** — 并发下载、断点续传、自动重试、下载进度实时显示
- **桌面客户端** — Tauri 2 打包，Windows / macOS 原生体验
- **暗色模式** — 亮色 / 暗色 / 跟随系统，三种主题切换
- **系统托盘** — 最小化到后台，下载不中断
- **可配置** — 代理、存储路径、下载参数、AI 服务，全部可视化配置

---

## 📦 安装

### 前置要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 18.0.0 | 前端运行时和构建工具 |
| Rust | >= 1.75.1 | Tauri 后端编译 |

**Windows**：需要 Visual Studio Build Tools（安装时勾选 "C++ build tools"）

**macOS**：需要 Xcode Command Line Tools（运行 `xcode-select --install`）

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/YOUR-USERNAME/wnacg-download.git
cd wnacg-download

# 2. 安装依赖
npm install

# 3. 启动开发模式
npm run dev
```

### 国内镜像加速

```bash
# npm 镜像
npm config set registry https://registry.npmmirror.com

# Rust 镜像（编辑 ~/.cargo/config.toml）
[source.crates-io]
replace-with = 'tuna'
[source.tuna]
registry = "https://mirrors.tuna.tsinghua.edu.cn/git/crates.io/index.git"
[net]
git-fetch-with-cli = true
```

---

## 🚀 快速开始

1. **搜索**：左侧栏点击「搜索」→ 输入关键字 → 点击卡片「添加到队列」
2. **对比**：点击「对比」→ 选择搜索缓存 + 本地漫画文件夹 → 查看"需下载/已拥有"结果
3. **下载**：点击「下载」→ 确认队列 → 开始下载（支持暂停 / 恢复 / 取消 / 重试）
4. **设置**：点击「设置」→ 首次使用请设置**默认存储路径**

详细操作流程见 [docs/用户手册.md](docs/用户手册.md)。

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+1` ~ `Ctrl+4` | 切换到搜索 / 对比 / 下载 / 设置页面 |
| `Ctrl+D` | 切换暗色模式 |
| `Ctrl+S` | 聚焦搜索框 |
| `Escape` | 关闭模态框 |

---

## ⚙️ 配置项速查

| 分组 | 配置项 | 说明 | 默认值 |
|------|--------|------|--------|
| **存储** | 默认存储路径 | 漫画保存位置 | 程序目录 |
| **搜索** | 最大爬取页数 | 0=不限制 | 0 |
| | 请求间隔 | 毫秒 | 1000 |
| | 只搜索汉化版 | 仅搜索"漢化"漫画 | 开启 |
| **网络** | 启用代理 / 代理地址 | 是否使用代理 | 关闭 |
| | 下载源策略 | server2（最快）/ worker_api | server2 |
| **下载** | 并发下载数 | 1-10 | 3 |
| | 重试次数 / 间隔 | 次 / 秒 | 3 / 30 |
| **AI** | API 地址 / Key / 模型 / Prompt | OpenAI 兼容接口 | 空 |
| | 匹配阈值 | 本地匹配相似度（0-1） | 0.8 |
| **浏览器** | 使用系统 Chrome | 跳过 Playwright Chromium | 关闭 |
| **外观** | 主题 | 亮色 / 暗色 / 跟随系统 | 跟随系统 |

完整字段说明见 [CODE_WIKI.md](CODE_WIKI.md) 配置章节。

---

## ❓ 常见问题

### Q1: Rust / npm 下载慢怎么办？

使用国内镜像加速，见 [安装步骤](#国内镜像加速) 部分。

### Q2: Tauri 编译失败？

- **Windows**：确保安装了 Visual Studio Build Tools + "C++ build tools"
- **macOS**：运行 `xcode-select --install`

### Q3: 下载被 Cloudflare 拦截？

默认 `server2` 策略（`dl1.wn01.download`）reqwest 直连，不会被拦截。如遇拦截，可在设置中切换到 `worker_api`（Playwright 绕过）。

### Q4: AI 未配置，对比还能用吗？

可以。「本地优先 + AI 兜底」策略下，未配置 AI 时本地匹配正常，未匹配项自动标记为需下载，不会丢失。

### Q5: 搜索需要安装浏览器吗？

**推荐**：在设置中启用「使用系统 Chrome」，无需额外下载。

**可选**：让应用下载 Playwright Chromium（约 150MB），需要先配置代理。

### Q6: 下载浏览器失败？

- 锁文件 → 系统会自动清理重试
- 网络问题 → 先在设置中配置代理
- 或直接启用「使用系统 Chrome」跳过

更多问题见 [docs/用户手册.md](docs/用户手册.md)。

---

## 🤝 参与贡献

开发前请先阅读 [AGENTS.md](AGENTS.md) — **唯一开发规范源**。

### 简要流程

1. Fork 仓库并创建分支：`git checkout -b feature/your-feature`
2. 开发并通过检查：`npm run lint && npm run format && npm run build && npm test`
3. 提交：`git commit -m "feat: 描述变更"`
4. 发起 Pull Request

### 关键约定

- 所有注释、日志、用户提示使用**中文**
- TypeScript 严格模式，禁用 `any`，类型集中在 `src/types/index.ts`
- Vue 用 `<script setup>`，Rust 用 `thiserror` 错误处理
- Git 提交格式：`<type>: <subject>`（feat / fix / docs / refactor / test / chore）

详细规范见 [AGENTS.md](AGENTS.md)。

---

## 📚 文档导航

| 文档 | 用途 |
|------|------|
| [AGENTS.md](AGENTS.md) | 开发规则与规范（开发前必读） |
| [CODE_WIKI.md](CODE_WIKI.md) | 代码实现文档（架构、命令、事件、配置字段） |
| [docs/需求规格.md](docs/需求规格.md) | 功能需求与业务规则 |
| [docs/架构设计.md](docs/架构设计.md) | 技术架构蓝图 |
| [docs/界面设计.md](docs/界面设计.md) | UI 布局与视觉设计 |
| [docs/用户手册.md](docs/用户手册.md) | 终端用户操作指南 |
| [docs/项目进度.md](docs/项目进度.md) | 版本、Phase、待办、已知问题 |

---

## ⚠️ 注意事项

1. **代理配置**：由于网络原因，部分地区可能需要配置代理
2. **请求频率**：默认 1 秒请求间隔，请尊重网站服务器
3. **磁盘空间**：开发环境约需 2-3GB（Rust 工具链 + 依赖 + 构建产物）

---

## 📄 许可证

MIT
