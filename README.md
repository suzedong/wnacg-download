# WNACG Downloader CLI

一个交互式的漫画下载命令行工具，支持从 wnacg.com 搜索、对比和下载汉化漫画。

## ✨ 特性

- 🔍 **搜索漫画** - 从 wnacg.com 搜索汉化漫画
- 📊 **智能对比** - 自动对比本地已有漫画，避免重复下载
- ⬇️  **批量下载** - 支持并发下载
- 🖥️  **双模式** - 支持命令行参数和交互式 TUI 两种模式
- ⚙️  **可配置** - 支持代理、存储路径等配置

## 📦 安装

### 前置要求

- Node.js >= 18.0.0
- Playwright 浏览器

### 安装步骤

```bash
cd C:\Users\SZD\Desktop\wnacg-download

# 安装依赖
npm install

# 安装 Playwright 浏览器
npx playwright install chromium
```

## 🚀 快速开始

### 1. 初始化配置

```bash
# 交互式配置向导
npm run dev -- config init

# 或直接设置代理
npm run dev -- config set defaultProxy http://localhost:7890
```

### 2. 使用方式

#### 交互式模式 (推荐)

```bash
npm run dev
```

#### 命令行模式

```bash
# 搜索漫画
npm run dev -- search TYPE90

# 对比本地
npm run dev -- compare TYPE90 -s C:\comics

# 下载漫画
npm run dev -- download TYPE90 -y
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

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 运行构建后的版本
npm start
```

## 📁 项目结构

```
wnacg-download/
├── src/
│   ├── commands/
│   │   ├── search.ts      # 搜索命令
│   │   ├── compare.ts     # 对比命令
│   │   ├── download.ts    # 下载命令
│   │   └── config.ts      # 配置命令
│   ├── scraper.ts         # WNACG 爬虫
│   ├── scanner.ts         # 本地扫描器
│   ├── comparer.ts        # 对比模块
│   ├── downloader.ts      # 下载模块
│   ├── config.ts          # 配置管理
│   ├── tui.ts             # TUI 界面
│   ├── types.ts           # 类型定义
│   └── index.ts           # 入口文件
├── package.json
├── tsconfig.json
└── README.md
```

## ⚠️ 注意事项

1. **代理配置**: 由于网络原因，建议配置代理使用
2. **Cloudflare**: 使用 Playwright 绕过 Cloudflare 验证
3. **请求频率**: 默认有 2 秒请求间隔，请勿修改过小

## 📄 许可证

MIT
