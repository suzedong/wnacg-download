# Release Notes — v4.0.0

**发布日期**: 2026-05-19
**版本类型**: 首次正式发布

WNACG Downloader 是一款 Tauri 2 桌面客户端应用，用于从 wnacg.com 搜索、对比和下载汉化漫画。

---

## ✨ 新功能

### 搜索
- 通过关键字搜索网站漫画，支持并发爬取多页
- 使用 Playwright 真实浏览器搜索，绕过 Cloudflare 拦截
- 自动去重，保存搜索结果到本地缓存
- 搜索历史记录管理（查看、加载、删除）

### 智能对比
- 对比网站搜索结果与本地漫画文件夹，避免重复下载
- **两阶段匹配流程**：
  - **本地优先**：Levenshtein 距离 + 标题前缀清洗，即时完成
  - **AI 兜底**：仅对本地未匹配的漫画调用 AI API（OpenAI 兼容接口，SSE 流式输出）
- AI API 未配置时，未匹配漫画自动标记为需下载，不会丢失
- 匹配方式标签（本地 / AI）清晰展示

### 批量下载
- 并发下载（可配置 1-10 个同时任务）
- 断点续传，下载中断后可恢复
- 自动重试（可配置重试次数和间隔）
- 下载进度实时显示（速度、ETA、文件大小）
- 暂停、恢复、取消、重试操作
- 下载完成后系统通知

### 配置管理
- 可视化配置页面，6 个分区（存储/搜索/网络/下载/AI/外观）
- 自动保存（800ms 防抖，修改即生效）
- 恢复默认配置
- 支持代理配置
- 下载源策略选择（server2 直连 / worker_api 绕过 Cloudflare）

### 桌面集成
- 系统托盘（最小化到后台，下载不中断）
- 系统原生标题栏
- 原生系统通知
- 暗色模式支持（亮色 / 暗色 / 跟随系统）
- 快捷键支持（Ctrl+1/2/3/4 切换页面、Ctrl+D 切换暗色模式、Ctrl+S 聚焦搜索、Escape 关闭弹窗）

### 用户体验
- 搜索/对比页面骨架屏加载动画
- AI 流式输出实时显示
- 统一 Toast 错误提示（带重试按钮）
- 文件夹/文件选择对话框
- 侧边栏导航 + 主题切换

---

## 🏗️ 技术栈

| 组件 | 技术 |
|------|------|
| 前端 | Vue 3.5（Composition API）、TypeScript 5.3、Vite 8 |
| 后端 | Rust 2021、Tauri 2、Tokio、reqwest、scraper |
| 浏览器自动化 | Playwright（Node.js 脚本） |
| 测试 | Vitest |
| 代码规范 | ESLint + Prettier |

---

## ⚙️ 默认配置

| 配置项 | 默认值 |
|--------|--------|
| 最大爬取页数 | 0（不限制） |
| 请求间隔 | 1000ms |
| 只搜索汉化版 | 开启 |
| 并发下载数 | 3 |
| 下载重试次数 | 3 |
| 重试间隔 | 30 秒 |
| 下载源策略 | server2 |
| 匹配阈值 | 0.8 |
| AI 温度 | 0.0 |
| 主题 | 跟随系统 |

---

## 📦 安装

### Windows
下载 `.exe` 安装包（NSIS 格式），支持中英文安装向导。

### macOS
下载 `.dmg` 磁盘镜像文件，拖入 Applications 文件夹。

### 从源码构建
```bash
# 前置要求：Node.js >= 18、Rust >= 1.75.1
git clone https://github.com/wnacg-downloader/wnacg-download.git
cd wnacg-download
npm install
npm run build
```

---

## ⚠️ 已知问题

1. **Worker API 下载需要非 headless 浏览器**：Cloudflare 检测 headless Chromium 并拦截，浏览器窗口会短暂可见。默认使用 `server2` 策略不受影响。

---

## 🔮 未来计划

- [ ] 自动更新支持
- [ ] 更多下载源策略
- [ ] 漫画预览功能
- [ ] 批量管理已下载漫画

---

## 👤 作者

WNACG Downloader Team

## 📄 许可证

MIT

---

## 🔗 相关链接

- [项目主页](https://github.com/wnacg-downloader/wnacg-download)
- [用户使用手册](https://github.com/wnacg-downloader/wnacg-download/blob/main/docs/USER_MANUAL.md)
- [贡献指南](https://github.com/wnacg-downloader/wnacg-download/blob/main/docs/CONTRIBUTING.md)
- [架构设计](https://github.com/wnacg-downloader/wnacg-download/blob/main/docs/ARCHITECTURE.md)
