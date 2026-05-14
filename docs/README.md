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
- **内容**: 项目现状、Phase 1-4 任务清单、验收标准
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
- ✅ **特性**：系统原生标题栏、暗色模式、侧边栏导航

---

## 🚀 快速开始

### 开发者
1. 阅读 [`REQUIREMENTS.md`](./REQUIREMENTS.md) 了解需求
2. 阅读 [`ARCHITECTURE.md`](./ARCHITECTURE.md) 理解架构
3. 阅读 [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md) 查看任务
4. 开始编码！

---

## 📖 开发规范

开发规范位于项目根目录的 `CLAUDE.md` 文件中，包含：

- **编码规范**：TypeScript / Vue / Rust 规范
- **工作原则**：开发前阅读文档、遵循架构设计、完整错误处理
- **语言规则**：所有注释、日志、提示使用中文

**重要原则**:
- ✅ 先阅读文档再开发
- ✅ 对照验收标准验证
- ✅ 完整的错误处理
- ✅ 中文注释和日志

---

## 📊 重构进度

| 阶段 | 状态 | 说明 |
|------|------|------|
| Phase 1 | 🟡 进行中 | 完善现有页面功能 |
| Phase 2 | 🟢 待优化 | 用户体验细节 |
| Phase 3 | 🔵 待开发 | 测试与优化 |
| Phase 4 | ⚪ 待开发 | 打包与发布 |

---

## 🔗 相关链接

- **项目根目录**: `../`
- **前端代码**: `../src/`
- **Tauri 后端**: `../src-tauri/`
- **缓存目录**: `../cache/`

---

**最后更新**: 2026-05-13
**文档版本**: v4.0（纯桌面端重构版）
