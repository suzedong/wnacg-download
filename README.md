# WNACG Downloader

一个桌面客户端应用，支持从 wnacg.com 搜索、对比和下载汉化漫画。

## ✨ 特性

- 🔍 **搜索漫画** - 从 wnacg.com 搜索汉化漫画
- 📊 **智能对比** - 自动对比本地已有漫画，避免重复下载
- ⬇️ **批量下载** - 支持并发下载、断点续传、自动重试
- 🖥️ **桌面客户端** - Tauri 2 打包，原生体验
- 🎨 **暗色模式** - 支持亮色/暗色主题切换
- 📦 **系统托盘** - 最小化到后台，下载不中断
- ⚙️ **可配置** - 支持代理、存储路径、AI 配置等

## 📦 安装

### 前置要求

**前端开发**：
- **Node.js** >= 18.0.0
  - 下载地址：https://nodejs.org/
  - 验证：`node --version`
- **npm** / **pnpm**（推荐 pnpm）

**Tauri 桌面客户端开发**：
- **Rust** >= 1.75.0
  - 安装：https://rustup.rs/
  - 验证：`rustc --version`
  - 国内镜像：https://mirrors.tuna.tsinghua.edu.cn/help/rustup/
- **Visual Studio Build Tools**（Windows）
- **Xcode Command Line Tools**（macOS）

### 安装步骤

#### 1. 安装 Node.js

```bash
# 访问 https://nodejs.org/ 下载 LTS 版本
# 运行安装程序，选择默认选项

# 验证安装
node --version
npm --version
```

**配置 npm 镜像（推荐）**：
```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com
```

#### 2. 安装 Rust

**Windows**：
```bash
# 下载安装程序（清华镜像）
# https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe

# 运行安装程序，选择默认选项

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

#### 3. 安装项目依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

## 🚀 快速开始

### 开发模式

```bash
# 启动 Tauri 开发模式
npm run dev
```

### 构建

```bash
# 构建桌面应用
npm run build
```

### 代码质量

```bash
# Lint 检查
npm run lint

# 格式化代码
npm run format
```

## 📋 功能说明

### 搜索漫画
- 通过关键字搜索 wnacg.com 的漫画
- 支持并发爬取多页
- 自动去重
- 保存搜索结果到本地

### 对比本地漫画
- 对比搜索结果与本地漫画文件夹
- 使用 AI 智能匹配漫画名称
- 显示需要下载和已拥有的漫画

### 下载漫画
- 并发下载（可配置数量）
- 断点续传
- 自动重试
- 下载进度实时显示

### 配置管理
- 存储路径配置
- 网络代理配置
- 下载参数配置
- AI 服务配置
- 外观主题配置

## 📁 项目结构

```
wnacg-download/
├── src/                         # 前端（Vue 3）
│   ├── components/              # UI 组件
│   ├── views/                   # 页面
│   ├── composables/             # 组合式函数
│   ├── App.vue
│   ├── main.ts
│   └── index.html
├── src-tauri/                   # Tauri 后端（Rust）
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/            # Tauri Commands
│   │   └── core/                # 核心业务逻辑
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/                        # 项目文档
├── cache/                       # 缓存目录
├── package.json
├── vite.config.ts
├── tsconfig.json
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

### Q2: Tauri 编译失败怎么办？

**A**: 检查 Rust 版本和系统依赖。

**Windows**：
- 确保安装了 Visual Studio Build Tools
- 确保安装了 "C++ build tools" 工作负载

**macOS**：
- 确保安装了 Xcode Command Line Tools
- 运行 `xcode-select --install`

---

### Q3: 如何验证环境配置成功？

**A**: 运行以下命令验证：

```bash
# Node.js
node --version          # 应 >= 18.0.0
npm --version           # 应 >= 9.0.0

# Rust
rustc --version         # 应 >= 1.70.0
cargo --version         # 应 >= 1.70.0

# 项目依赖
pnpm list             # 应显示所有依赖
```

---

### Q4: 开发环境需要多少磁盘空间？

**A**: 大约需要 2-3GB。

**详细分布**：
- Node.js: ~200MB
- Rust: ~500MB
- 项目依赖：~500MB
- 构建产物：~500MB
- 缓存：~500MB

## ⚠️ 注意事项

1. **代理配置**: 由于网络原因，建议配置代理使用
2. **请求频率**: 默认有 1 秒请求间隔，请勿修改过小
3. **Tauri 开发**: 需要 Rust 环境，约 500MB 磁盘空间

---

## 📚 参考链接

- [Node.js 官方文档](https://nodejs.org/)
- [Rust 官方文档](https://www.rust-lang.org/)
- [Tauri 官方文档](https://tauri.app/)
- [Vue 3 官方文档](https://vuejs.org/)
- [清华镜像站 Rust 镜像](https://mirrors.tuna.tsinghua.edu.cn/help/rustup/)
- [淘宝 NPM 镜像](https://npmmirror.com/)

---

## 📄 许可证

MIT
