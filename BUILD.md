# WNACG Downloader - 构建指南

## 环境要求

### 必需工具
- **Node.js** >= 18.0.0
- **Rust** >= 1.75.0
- **npm** 或 **pnpm**

### 可选工具
- **Visual Studio Build Tools**（Windows）
- **Xcode Command Line Tools**（macOS）

## 安装依赖

```bash
# 在项目根目录安装依赖
npm install
```

## 开发模式

```bash
# 启动 Tauri 开发模式
npm run dev
```

这将同时启动：
- Vite 开发服务器（端口 5173）
- Tauri 桌面应用

## 构建应用

### 开发构建

```bash
# 构建前端
npm run build:frontend

# 构建 Tauri 应用（调试模式）
cd src-tauri
cargo build
```

### 生产构建

```bash
# 使用 Tauri CLI 构建
npm run build
```

这将：
1. 构建前端（dist/）
2. 编译 Rust 后端
3. 打包为桌面应用

## 打包分发

### Windows

```bash
# 构建安装包（NSIS）
npm run build
```

输出位置：`src-tauri/target/release/bundle/nsis/`

### macOS

```bash
# 构建 DMG
npm run build
```

输出位置：`src-tauri/target/release/bundle/dmg/`

## 常见问题

### Q: Rust 编译失败

确保 Rust 版本 >= 1.75.0：

```bash
rustc --version
```

如需更新：

```bash
rustup update stable
```

### Q: 前端构建失败

清除缓存并重新安装依赖：

```bash
# 清除缓存并重新安装依赖
Remove-Item -Recurse -Force node_modules
npm install
```

### Q: Tauri 找不到前端文件

确保已构建前端：

```bash
# 构建前端
npm run build:frontend
```

## 项目结构

```
wnacg-download/
├── src/                    # 前端（Vue 3）
│   ├── components/         # UI 组件
│   ├── views/              # 页面组件
│   ├── composables/        # 组合式函数
│   ├── types/              # 类型定义
│   ├── App.vue
│   └── main.ts
├── dist/                   # 构建产物
├── src-tauri/              # 后端（Rust）
│   ├── src/
│   │   ├── commands/       # Tauri Commands
│   │   ├── core/           # 核心业务逻辑
│   │   ├── main.rs
│   │   └── ...
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/                   # 文档
├── cache/                  # 缓存目录
├── package.json
└── README.md
```

## 技术栈

### 前端
- Vue 3 + TypeScript
- Vite
- @tauri-apps/api 2.x

### 后端
- Rust + Tokio
- Tauri 2
- reqwest（HTTP 客户端）
- scraper（HTML 解析）

## 许可证

MIT
