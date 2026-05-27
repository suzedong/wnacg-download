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

### 搜索漫画

1. 打开应用，点击左侧栏 **搜索** 图标
2. 在搜索框中输入关键字，点击 **搜索**
3. 等待搜索完成，结果列表会显示所有找到的漫画
4. 点击卡片上的 **添加到队列**，加入下载队列

### 对比漫画

1. 点击 **对比** 图标
2. 选择搜索缓存文件 + 本地漫画文件夹
3. 点击 **开始对比**
4. 查看"需下载"和"已拥有"结果，批量添加到下载队列

### 下载漫画

1. 点击 **下载** 图标
2. 确认下载队列中的漫画
3. 点击 **开始下载**
4. 支持暂停、恢复、取消、重试操作

### 修改配置

1. 点击 **设置** 图标
2. 修改配置项（自动保存）
3. 首次使用请务必设置 **默认存储路径**

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+1` | 切换到搜索页面 |
| `Ctrl+2` | 切换到对比页面 |
| `Ctrl+3` | 切换到下载页面 |
| `Ctrl+4` | 切换到设置页面 |
| `Ctrl+D` | 切换暗色模式 |
| `Ctrl+S` | 聚焦搜索框 |
| `Escape` | 关闭模态框 |

---

## ⚙️ 配置项速查

| 分组 | 配置项 | 说明 | 默认值 |
|------|--------|------|--------|
| **存储** | 默认存储路径 | 漫画保存位置 | 程序目录 |
| **搜索** | 最大爬取页数 | 每次搜索最大页数，0=不限制 | 0 |
| | 请求间隔 | 请求间隔（毫秒） | 1000ms |
| | 只搜索汉化版 | 仅搜索"漢化"漫画 | 开启 |
| **网络** | 启用代理 | 是否使用代理 | 关闭 |
| | 代理地址 | 代理服务器 URL | 空 |
| | 下载源策略 | server2（最快） / worker_api | server2 |
| **下载** | 并发下载数 | 同时下载数（1-10） | 3 |
| | 下载重试次数 | 失败自动重试次数 | 3 |
| | 重试间隔 | 重试等待时间（秒） | 30 |
| **AI** | AI API 地址 | OpenAI 兼容接口 URL | 空 |
| | AI API Key | 接口认证密钥 | 空 |
| | AI 模型名称 | 模型标识符 | 空 |
| | AI Prompt | AI 匹配提示词 | 内置模板 |
| | AI 温度 | 创造性程度（0-2） | 0.0 |
| | 匹配阈值 | 本地匹配相似度（0-1） | 0.8 |
| **浏览器** | 使用系统 Chrome | 使用已安装 Chrome 而非 Playwright | 关闭 |
| | Playwright 状态 | Chromium 安装状态（显示/安装） | 可安装 |
| **外观** | 主题 | 亮色 / 暗色 / 跟随系统 | 跟随系统 |

---

## 🏗️ 架构概览

### 技术栈

- **前端**：Vue 3.5（Composition API）、TypeScript 5.3、Vite 8
- **后端**：Rust 2021、Tauri 2、Tokio、reqwest、scraper
- **浏览器自动化**：Playwright（Node.js 脚本，由 Rust 派生用于绕过 Cloudflare）
- **测试**：Vitest

### 通信模式

```
前端（Vue） ← Tauri Commands（invoke） → 后端（Rust）
前端（Vue） ← Tauri Events（listen） ← 后端（Rust）
```

事件类型：`search_progress`、`search_complete`、`download_progress`、`download_complete`、`compare_progress`、`ai_progress`、`playwright_install_progress`、`error`

### 项目结构

```
wnacg-download/
├── src/                         # 前端（Vue 3）
│   ├── components/              # UI 组件
│   ├── views/                   # 页面（Search/Compare/Download/Config）
│   ├── composables/             # 组合式函数
│   ├── types/                   # TypeScript 类型定义
│   └── App.vue                  # 根组件
├── src-tauri/                   # Tauri 后端（Rust）
│   ├── src/
│   │   ├── main.rs              # Tauri Commands 注册
│   │   ├── commands/            # 命令处理器
│   │   └── core/                # 核心业务逻辑
│   │       ├── downloader/      # 并发下载
│   │       ├── comparer/        # 对比协调
│   │       ├── scanner/         # 本地文件扫描
│   │       └── ai/              # AI 匹配
│   └── Cargo.toml
├── scripts/                     # Playwright 脚本
├── docs/                        # 项目文档
├── cache/                       # 缓存目录（运行时生成）
├── package.json
└── vite.config.ts
```

---

## ❓ 常见问题

### Q1: Rust 下载速度慢怎么办？

使用国内镜像加速，见 [安装步骤](#国内镜像加速) 部分。

### Q2: Tauri 编译失败怎么办？

**Windows**：确保安装了 Visual Studio Build Tools + "C++ build tools"

**macOS**：运行 `xcode-select --install` 安装 Xcode 命令行工具

### Q3: 如何验证环境配置成功？

```bash
node --version          # >= 18.0.0
rustc --version         # >= 1.75.1
npm list                # 应显示所有依赖
```

### Q4: 开发环境需要多少磁盘空间？

大约 2-3GB：
- Node.js: ~200MB
- Rust: ~500MB
- 项目依赖: ~500MB
- 构建产物: ~500MB
- 缓存: ~500MB

### Q5: 下载被 Cloudflare 拦截怎么办？

- 默认使用 `server2` 策略（`dl1.wn01.download`），reqwest 直连，不会被拦截
- 如果遇到拦截，可在设置中切换下载源策略到 `worker_api`（通过 Playwright 浏览器绕过 Cloudflare）

### Q6: AI 未配置，对比功能还能用吗？

可以。对比采用"本地优先 + AI 兜底"策略。未配置 AI 时，本地匹配的漫画正常显示，未匹配的自动标记为需下载，不会丢失任何漫画。

### Q7: 搜索需要安装浏览器吗？

**推荐方案**：在设置中启用"使用系统 Chrome"，不需要额外下载浏览器。

**可选方案**：下载 Playwright Chromium（约 150MB），需要配置代理才能正常下载。

**注意**：搜索前会自动检查浏览器状态并提示安装或配置。

### Q8: 下载浏览器失败怎么办？

- 如果提示"锁文件"：系统会自动清理并重试
- 如果是网络问题：提示会告知检查代理设置，可先在设置中配置代理再安装
- 或者直接启用"使用系统 Chrome"跳过浏览器下载

---

## 🤝 参与贡献

### 开发工作流

```
main                    # 主分支，随时可发布
├── feature/xxx         # 新功能分支
├── fix/xxx             # Bug 修复分支
└── refactor/xxx        # 重构分支
```

1. Fork 仓库并创建分支：`git checkout -b feature/your-feature`
2. 开发功能，运行检查：`npm run lint && npm run format && npm run build`
3. 提交代码：`git commit -m "feat: 描述变更"`
4. 发起 Pull Request，描述功能和测试方法

### 编码规范

- 所有注释、日志、用户提示使用**中文**
- TypeScript 严格模式，避免 `any`，类型定义统一在 `src/types/index.ts`
- Vue 使用 `<script setup>` 语法，组件 PascalCase 命名
- Rust 使用 `thiserror` 错误处理，中文错误信息
- Git 提交格式：`<type>: <subject>`（feat/fix/docs/refactor/test/chore）

### 测试

```bash
npm test              # 前端测试
cd src-tauri && cargo test  # Rust 测试
```

欢迎提交 Issue 和 Pull Request！

---

## 📚 更多文档

- [用户使用手册](docs/USER_MANUAL.md) — 详细操作指南和故障排查
- [需求规格](docs/REQUIREMENTS.md) — 产品功能需求
- [架构设计](docs/ARCHITECTURE.md) — 技术架构文档
- [界面设计](docs/UI-DESIGN.md) — UI 设计稿

---

## ⚠️ 注意事项

1. **代理配置**：由于网络原因，部分地区可能需要配置代理
2. **请求频率**：默认有 1 秒请求间隔，请尊重网站服务器
3. **Tauri 开发**：需要 Rust 环境，约 500MB 磁盘空间

---

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！详细开发规范请参考 [贡献指南](docs/CONTRIBUTING.md)。

---

## 📄 许可证

MIT
