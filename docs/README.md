# WNACG Downloader - 文档中心

欢迎来到 WNACG Downloader 的文档中心！

---

## 📚 文档列表

### 1. 需求规格说明书
- **文件**: [`REQUIREMENTS.md`](./REQUIREMENTS.md)
- **内容**: 产品形态、核心价值、功能需求、技术栈
- **适合人群**: 产品经理、开发者

### 2. 架构设计文档
- **文件**: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **内容**: 整体架构、技术栈、目录结构、架构模式
- **适合人群**: 架构师、开发者

### 3. 界面设计文档
- **文件**: [`UI-DESIGN.md`](./UI-DESIGN.md)
- **内容**: UI 组件层级、适配器模式、共享策略、实现细节
- **适合人群**: 前端开发者、UI 设计师

### 4. 开发计划
- **文件**: [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md)
- **内容**: 开发阶段、任务清单、验收标准、风险管理
- **适合人群**: 开发者、项目经理

---

## 🏗️ 项目概述

**产品名称**: WNACG Downloader

**产品形态**: CLI + Web 应用 + 桌面客户端三架构

**核心功能**: 搜索、对比、下载汉化漫画

**架构特点**:
- ✅ CLI：命令行工具，支持脚本化
- ✅ Web：浏览器访问，跨平台
- ✅ Tauri 2：桌面应用，原生体验（Rust 后端）
- ✅ 核心业务逻辑完全复用
- ✅ Web 和 Tauri 共享 UI 组件（复用率 > 95%）

---

## 🚀 快速开始

### 开发者
1. 阅读 [`REQUIREMENTS.md`](./REQUIREMENTS.md) 了解需求
2. 阅读 [`ARCHITECTURE.md`](./ARCHITECTURE.md) 理解架构
3. 阅读 [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md) 查看任务
4. 开始编码！

### UI 设计师
1. 阅读 [`REQUIREMENTS.md`](./REQUIREMENTS.md) 了解需求
2. 阅读 [`UI-DESIGN.md`](./UI-DESIGN.md) 查看设计稿

### 产品经理
1. 阅读 [`REQUIREMENTS.md`](./REQUIREMENTS.md) 查看需求
2. 阅读 [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md) 了解进度

---

## 📖 开发规范

开发规范位于 `.trae/rules/` 目录：

- **项目规则**: `.trae/rules/bss-rules.md`
- **开发规范**: `.trae/rules/dev-rules.md`

**重要原则**:
- ✅ 先阅读文档再开发
- ✅ 遵循开发计划
- ✅ 对照验收标准验证
- ✅ 完整的错误处理
- ✅ 中文注释和日志

---

## 📊 开发进度

| 阶段 | 任务数 | 工时 | 状态 |
|------|--------|------|------|
| Phase 1: 核心重构 | 13 | 49h | 📋 待开始 |
| Phase 2: 搜索优化 | 12 | 30.5h | 📋 待开始 |
| Phase 3: 对比优化 | 3 | 13h | 📋 待开始 |
| Phase 4: 下载优化 | 3 | 10h | 📋 待开始 |
| Phase 5: 配置优化 | 3 | 8h | 📋 待开始 |
| Web 架构实现 | 4 | 12h | 📋 待开始 |
| 集成测试 | - | 8h | 📋 待开始 |
| **总计** | **38** | **118.5h** | 📋 待开始 |

---

## 🔗 相关链接

- **项目根目录**: `../`
- **源代码**: `../src/`
- **核心模块**: `../src/core/`
- **CLI 工具**: `../src/cli/`
- **Web 应用**: `../src/web/`
- **UI 组件**: `../src/ui/`
- **Tauri**: `../src-tauri/`

---

**最后更新**: 2026-04-14  
**文档版本**: v3.0（三架构版）
