# WNACG Downloader

一个支持 CLI、Web 和 Tauri 三架构的漫画下载工具，支持从 wnacg.com 搜索、对比和下载汉化漫画。

## ✨ 特性

- 🔍 **搜索漫画** - 从 wnacg.com 搜索汉化漫画
- 📊 **智能对比** - 自动对比本地已有漫画，避免重复下载
- ⬇️ **批量下载** - 支持并发下载、断点续传
- 🖥️ **三架构** - CLI、Web、Tauri 桌面客户端
- ⚙️ **可配置** - 支持代理、存储路径等配置
- 🎨 **共享 UI** - Web 和 Tauri 共享 Vue 组件（复用率 > 95%）

## 📦 安装

### 前置要求

#### 基础开发（CLI + Web）

**必需工具**：
- **Node.js** >= 18.0.0
  - 下载地址：https://nodejs.org/
  - 验证：`node --version`
- **npm** / **pnpm** / **yarn**（推荐 pnpm）
- **Playwright** 浏览器
  - 安装：`npx playwright install chromium`

#### Tauri 桌面客户端开发（可选）

- **Rust** >= 1.70
  - 安装：https://rustup.rs/
  - 验证：`rustc --version`
  - 国内镜像：https://mirrors.tuna.tsinghua.edu.cn/help/rustup/
- **Tauri CLI**
  - 安装：`cargo install tauri-cli`
- **Visual Studio Build Tools**（Windows）
- **Xcode Command Line Tools**（macOS）

---

### 详细安装步骤

#### 1. 安装 Node.js

**Windows/macOS**：
```bash
# 访问 https://nodejs.org/ 下载 LTS 版本
# 运行安装程序，选择默认选项

# 验证安装
node --version
npm --version
```

**Linux (Ubuntu/Debian)**：
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**配置 npm 镜像（推荐）**：
```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com
```

---

#### 2. 安装 Rust（开发 Tauri 需要）

**Windows**：
```bash
# 下载安装程序（清华镜像）
# https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe

# 运行安装程序，选择默认选项

# 验证安装
rustc --version
cargo --version
```

**macOS**：
```bash
# 使用 Homebrew 安装
brew install rustup-init
rustup-init -y

# 验证安装
rustc --version
cargo --version
```

**Linux**：
```bash
# 使用清华镜像安装
export RUSTUP_DIST_SERVER=https://mirrors.tuna.tsinghua.edu.cn/rustup
export RUSTUP_UPDATE_ROOT=https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup
curl --proto '=https' --tlsv1.2 -sSf https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup-init.sh | sh

# 配置环境变量
source $HOME/.cargo/env

# 验证安装
rustc --version
cargo --version
```

**配置 Cargo 镜像（推荐）**：
```bash
# 编辑 ~/.cargo/config.toml
mkdir -p ~/.cargo
cat > ~/.cargo/config.toml << EOF
[source.crates-io]
replace-with = 'tuna'

[source.tuna]
registry = "https://mirrors.tuna.tsinghua.edu.cn/git/crates.io/index.git"

[net]
git-fetch-with-cli = true
EOF
```

---

#### 3. 安装 Playwright

```bash
# 进入项目目录
cd wnacg-download

# 安装 Playwright Chromium
npx playwright install chromium

# Linux 需要安装系统依赖
npx playwright install-deps
```

---

#### 4. 安装 Tauri CLI（可选）

```bash
# 使用 cargo 安装
cargo install tauri-cli

# 验证安装
cargo tauri --version
```

---

#### 5. 安装项目依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install

# 或使用 yarn
yarn install
```

## 🚀 快速开始

### 1. 初始化配置

```bash
# 交互式配置向导
npm run dev -- config init

# 或直接设置代理
npm run dev -- config set defaultProxy http://localhost:7890
```

### 2. 运行 CLI

#### 交互式模式 (推荐)

```bash
npm run dev
```

#### 命令行模式

```bash
# 搜索漫画
npm run dev -- search TYPE90

# 对比本地
npm run dev -- compare TYPE90 -s ~/comics

# 下载漫画
npm run dev -- download TYPE90 -y
```

### 3. 运行 Web（可选）

```bash
# 启动 Web 开发服务器（推荐）
npm run dev:web

# 访问 http://localhost:5173/ （Vite 开发服务器）
# 或 http://localhost:3000/ （API 服务器）
```

**开发模式说明**：

`npm run dev:web` 会同时启动两个服务器：

1. **Vite UI 服务器**（端口 5173）
   - 提供 Vue 前端界面
   - 支持热重载
   - 访问：http://localhost:5173/
   - **推荐使用此端口进行开发**

2. **Express API 服务器**（端口 3000）
   - 提供后端 API 接口
   - 提供静态文件服务
   - 访问：http://localhost:3000/

**生产模式**（合并到一个端口）：

```bash
# 构建并启动（前端和 API 都在 3000 端口）
npm run start:web
```

### 4. 运行 Tauri（可选）

```bash
# 启动 Tauri 开发模式
npm run dev:tauri
```

## 📖 命令文档

### search - 搜索漫画

```bash
wnacg-dl search <author> [options]

参数:
  <author>              作者或关键字

选项:
  -p, --pages <number>  最大爬取页数 (默认：5)
  -P, --proxy <url>     代理 URL
  -a, --all            包含所有漫画 (不仅汉化版)
  -j, --json           以 JSON 格式输出
```

### compare - 对比本地

```bash
wnacg-dl compare <author> [options]

参数:
  <author>              作者或关键字

选项:
  -s, --storage <path>  存储路径
  -S, --subdir <name>   子目录名
  -p, --pages <number>  最大爬取页数
  -P, --proxy <url>     代理 URL
  -a, --all            包含所有漫画
  -j, --json           以 JSON 格式输出
```

### download - 下载漫画

```bash
wnacg-dl download <author> [options]

参数:
  <author>              作者或关键字

选项:
  -s, --storage <path>  存储路径
  -S, --subdir <name>   子目录名
  -p, --pages <number>  最大爬取页数
  -P, --proxy <url>     代理 URL
  -a, --all            包含所有漫画
  -y, --yes            跳过确认直接下载
```

### config - 配置管理

```bash
# 查看所有配置
wnacg-dl config list

# 设置配置
wnacg-dl config set <key> <value>

# 获取配置
wnacg-dl config get <key>

# 重置配置
wnacg-dl config reset

# 交互式配置向导
wnacg-dl config init
```

## 📋 示例

### 搜索 TYPE90 的漫画

```bash
npm run dev -- search TYPE90
```

### 对比并下载

```bash
# 先对比
npm run dev -- compare TYPE90 -s C:\Users\SZD\comics

# 确认后下载
npm run dev -- download TYPE90
```

### 使用交互式界面

```bash
npm run dev
```

然后按照提示选择操作即可。

## 🔧 开发

### 构建命令

```bash
# CLI 开发模式
npm run dev

# Web 开发模式
npm run dev:web

# Tauri 开发模式
npm run dev:tauri

# 构建 CLI
npm run build

# 构建 Web
npm run build:web

# 构建 Tauri
npm run build:tauri
```

### 测试

```bash
# 运行测试
npm test

# 运行特定测试
npm test -- search.test.ts
```

### 代码质量

```bash
# Lint 检查
npm run lint

# 格式化代码
npm run format
```

## 📁 项目结构

```
wnacg-download/
├── src/
│   ├── cli/                       # CLI 工具
│   │   ├── index.ts
│   │   └── commands/
│   ├── web/                       # Web 应用
│   │   ├── api-server.ts
│   │   └── routes/
│   ├── ui/                        # 共享 UI（Web + Tauri）
│   │   ├── components/
│   │   ├── views/
│   │   ├── composables/
│   │   ├── adapters/
│   │   └── main.ts
│   ├── core/                      # 核心业务模块
│   │   ├── scraper.ts
│   │   ├── downloader.ts
│   │   ├── scanner.ts
│   │   ├── comparer.ts
│   │   └── ai/
│   ├── config.ts                  # 配置管理
│   └── types.ts                   # 类型定义
├── src-tauri/                     # Tauri 后端（Rust）
│   ├── src/
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/                          # 项目文档
│   ├── README.md
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── UI-DESIGN.md
│   └── DEVELOPMENT_PLAN.md
├── .trae/rules/                   # 编辑器规范
│   ├── bss-rules.md
│   └── dev-rules.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## ❓ 常见问题

### Q1: Rust 下载速度慢怎么办？

**A**: 使用国内镜像加速。

**Windows (PowerShell)**：
```powershell
$env:RUSTUP_DIST_SERVER="https://mirrors.tuna.tsinghua.edu.cn/rustup"
$env:RUSTUP_UPDATE_ROOT="https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup"
rustup-init
```

**macOS/Linux (Bash)**：
```bash
export RUSTUP_DIST_SERVER=https://mirrors.tuna.tsinghua.edu.cn/rustup
export RUSTUP_UPDATE_ROOT=https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup
curl --proto '=https' --tlsv1.2 -sSf https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup-init.sh | sh
```

---

### Q2: 端口被占用怎么办？

**A**: 修改配置或使用其他端口。

**Web 服务器端口冲突**：
```bash
# 修改 vite.config.ts 中的端口配置
server: {
  port: 3001  # 改为其他端口
}
```

**Tauri 内部 HTTP 服务器端口冲突**：
```rust
// src-tauri/src/main.rs
// 修改端口号
warp::serve(event_route)
    .run(([127, 0, 0, 1], 3002))  # 改为 3002
    .await;
```

---

### Q3: Playwright 安装失败怎么办？

**A**: 手动下载浏览器或检查网络连接。

```bash
# 设置 Playwright 下载镜像
export PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright

# 重新安装
npx playwright install chromium
```

---

### Q4: Tauri 编译失败怎么办？

**A**: 检查 Rust 版本和系统依赖。

**Windows**：
- 确保安装了 Visual Studio Build Tools
- 确保安装了 "C++ build tools" 工作负载

**macOS**：
- 确保安装了 Xcode Command Line Tools
- 运行 `xcode-select --install`

**Linux**：
- 确保安装了必要的系统依赖
- 运行 `npx playwright install-deps` 安装依赖

---

### Q5: 如何验证环境配置成功？

**A**: 运行以下命令验证：

```bash
# Node.js
node --version          # 应 >= 18.0.0
npm --version           # 应 >= 9.0.0

# Rust
rustc --version         # 应 >= 1.70.0
cargo --version         # 应 >= 1.70.0

# Tauri CLI
cargo tauri --version   # 应显示版本号

# Playwright
npx playwright --version  # 应显示版本号

# 项目依赖
pnpm list             # 应显示所有依赖
```

---

### Q6: 开发环境需要多少磁盘空间？

**A**: 大约需要 2-3GB。

**详细分布**：
- Node.js: ~200MB
- Rust: ~500MB
- Playwright Chromium: ~300MB
- 项目依赖：~500MB
- 构建产物：~500MB
- 缓存：~500MB

## ⚠️ 注意事项

1. **代理配置**: 由于网络原因，建议配置代理使用
2. **Cloudflare**: 使用 Playwright 绕过 Cloudflare 验证
3. **请求频率**: 默认有 1 秒请求间隔，请勿修改过小
4. **Tauri 开发**: 需要 Rust 环境，约 500MB 磁盘空间

---

## 📚 参考链接

- [Node.js 官方文档](https://nodejs.org/)
- [Rust 官方文档](https://www.rust-lang.org/)
- [Tauri 官方文档](https://tauri.app/)
- [Playwright 官方文档](https://playwright.dev/)
- [清华镜像站 Rust 镜像](https://mirrors.tuna.tsinghua.edu.cn/help/rustup/)
- [淘宝 NPM 镜像](https://npmmirror.com/)

---

## 📄 许可证

MIT
