# WNACG Downloader - 文档中心

欢迎来到 WNACG Downloader 的文档中心！

---

## 📚 文档列表

### 1. 需求规格说明书
- **文件**: [`REQUIREMENTS.md`](./REQUIREMENTS.md)
- **内容**: 产品形态、功能需求、技术栈、系统需求
- **适合人群**: 开发者

### 2. 架构设计文档
- **文件**: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **内容**: 整体架构、前后端设计、通信机制、桌面集成
- **适合人群**: 开发者

### 3. 界面设计文档
- **文件**: [`UI-DESIGN.md`](./UI-DESIGN.md)
- **内容**: 整体布局、主题系统、页面设计、桌面集成
- **适合人群**: 前端开发者

### 4. 开发计划
- **文件**: [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md)
- **内容**: 重构概述、Phase 0-6 任务清单、验收标准
- **适合人群**: 开发者

---

## 🏗️ 项目概述

**产品名称**: WNACG Downloader

**产品形态**: 桌面客户端（Windows & macOS）

**核心功能**: 搜索、对比、下载汉化漫画

**技术架构**:
- ✅ **前端**：Vue 3 + TypeScript + Vite
- ✅ **后端**：Rust + Tokio（Tauri 2 框架）
- ✅ **通信**：Tauri Commands + Events
- ✅ **特性**：无边框窗口、系统托盘、暗色模式、侧边栏导航

---

## 🚀 快速开始

### 开发者
1. 阅读 [`REQUIREMENTS.md`](./REQUIREMENTS.md) 了解需求
2. 阅读 [`ARCHITECTURE.md`](./ARCHITECTURE.md) 理解架构
3. 阅读 [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md) 查看任务
4. 开始编码！

---

## 📖 开发规范

开发规范位于 `.trae/rules/` 目录：

- **项目规则**: `.trae/rules/bss-rules.md`
- **开发规范**: `.trae/rules/dev-rules.md`

**重要原则**:
- ✅ 先阅读文档再开发
- ✅ 遵循开发计划（Phase 0-6）
- ✅ 对照验收标准验证
- ✅ 完整的错误处理
- ✅ 中文注释和日志

---

## 📊 重构进度

| 阶段 | 状态 | 说明 |
|------|------|------|
| Phase 0 | ✅ 已完成 | 文档更新、代码清理 |
| Phase 1 | 📋 待开始 | Rust 核心模块（基础） |
| Phase 2 | 📋 待开始 | Rust 核心模块（爬虫 + 扫描器） |
| Phase 3 | 📋 待开始 | Rust 核心模块（下载 + 对比 + AI） |
| Phase 4 | 📋 待开始 | 前端改造 |
| Phase 5 | 📋 待开始 | 桌面集成 |
| Phase 6 | 📋 待开始 | 测试、优化、打包 |

---

## 🔗 相关链接

- **项目根目录**: `../`
- **前端代码**: `../src/`
- **Tauri 后端**: `../src-tauri/`
- **缓存目录**: `../cache/`

---

**最后更新**: 2026-04-26  
**文档版本**: v4.0（纯桌面端重构版）
