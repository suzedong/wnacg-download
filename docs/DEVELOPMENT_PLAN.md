# WNACG Downloader - 开发计划

## 项目状态

**当前版本**: v3.x（三架构版本）  
**目标版本**: v4.0（纯桌面端重构版）  
**重构类型**：架构重构（CLI + Web → 纯 Tauri 桌面）

---

## 重构概述

### 背景
当前项目采用 CLI + Web + Tauri 三架构设计，存在以下问题：
1. 架构复杂，维护成本高
2. 适配器模式增加代码量
3. Express 服务器冗余（Tauri 自带 IPC）
4. CLI 和 Web 用户群体小

### 目标
重构为纯 Tauri 2 桌面应用：
- ✅ 后端用 Rust 重写核心逻辑
- ✅ 前端保持 Vue 3
- ✅ 移除 CLI 和 Web 相关代码
- ✅ 添加桌面专属功能（无边框窗口、托盘、暗色模式）

### 技术决策
| 方面 | 决策 |
|------|------|
| 核心逻辑 | Rust 重写 |
| 功能范围 | 全部保留（搜索、对比、下载、配置） |
| 前端框架 | Vue 3 + Vite |
| UI 组件 | 继续自研 |
| 窗口风格 | 无边框窗口 + 自定义标题栏 |
| 系统托盘 | 需要（后台下载） |
| 暗色模式 | 需要（跟随系统/手动切换） |
| 导航方式 | 左侧边栏 |
| AI 方案 | 远程 API 优先，后续实现本地模型 |
| 目录结构 | `src-tauri/` 为主，`src/` 为前端 |
| 进度推送 | Tauri Events |
| 数据存储 | JSON 文件 |

---

## Phase 0：准备阶段

**目标**：更新项目文档，清理无用代码

### 任务清单

- [ ] **0.1 更新文档**
  - [ ] 更新 `.trae/rules/bss-rules.md`
  - [ ] 更新 `.trae/rules/dev-rules.md`
  - [ ] 更新 `docs/ARCHITECTURE.md`
  - [ ] 更新 `docs/REQUIREMENTS.md`
  - [ ] 更新 `docs/UI-DESIGN.md`
  - [ ] 更新 `docs/DEVELOPMENT_PLAN.md`（本文档）

- [ ] **0.2 删除无用目录**
  - [ ] 删除 `src/cli/`
  - [ ] 删除 `src/web/`
  - [ ] 删除 `src/ui/adapters/`

- [ ] **0.3 删除无用文件**
  - [ ] 删除 `src/api-server.ts`
  - [ ] 删除 `src/tui.ts`
  - [ ] 删除 `src/index.ts`（旧入口）
  - [ ] 删除 `src/setup.ts`
  - [ ] 删除 `scripts/api-server.js`
  - [ ] 删除 `test-api.js`
  - [ ] 删除 `test-compare.js`
  - [ ] 删除 `start-tauri.bat`
  - [ ] 删除 `start-tauri.ps1`

- [ ] **0.4 更新配置文件**
  - [ ] 更新 `package.json`（移除无用依赖和脚本）
  - [ ] 更新 `tsconfig.json`（简化配置）
  - [ ] 更新 `vite.config.ts`（Tauri 配置）
  - [ ] 更新 `.eslintrc.json`
  - [ ] 更新 `.prettierrc.json`

- [ ] **0.5 移动前端代码**
  - [ ] 创建 `web/` 目录
  - [ ] 移动 `src/ui/` → `web/src/`
  - [ ] 移动 `public/` → `web/public/`
  - [ ] 移动 `index.html` → `web/index.html`

### 验收标准

- [ ] 所有文档已更新，描述纯 Tauri 架构
- [ ] 无用代码已删除
- [ ] 前端代码在 `src/` 目录
- [ ] 项目可以正常编译（前端部分）
- [ ] `package.json` 只保留必要依赖

---

## Phase 1：Rust 核心模块（基础）

**目标**：搭建 Rust 项目结构，实现基础模块

### 任务清单

- [ ] **1.1 更新 Cargo.toml**
  ```toml
  [dependencies]
  tauri = { version = "2", features = ["shell-open"] }
  serde = { version = "1.0", features = ["derive"] }
  serde_json = "1.0"
  reqwest = { version = "0.11", features = ["json", "socks"] }
  scraper = "0.17"
  tokio = { version = "1", features = ["full"] }
  thiserror = "1.0"
  dirs = "5.0"
  ```

- [ ] **1.2 创建目录结构**
  ```
  src-tauri/src/
  ├── main.rs
  ├── commands/
  │   ├── mod.rs
  │   ├── search.rs
  │   ├── compare.rs
  │   ├── download.rs
  │   └── config.rs
  ├── core/
  │   ├── mod.rs
  │   ├── scraper/
  │   ├── downloader/
  │   ├── comparer/
  │   ├── scanner/
  │   └── ai/
  ├── config.rs
  ├── events.rs
  ├── types.rs
  └── error.rs
  ```

- [ ] **1.3 实现 types.rs**
  - `Comic` - 漫画信息
  - `SearchOptions` - 搜索选项
  - `DownloadTask` - 下载任务
  - `CompareResult` - 对比结果
  - `Config` - 配置结构

- [ ] **1.4 实现 error.rs**
  - `AppError` - 自定义错误类型
  - 错误转换

- [ ] **1.5 实现 config.rs**
  - 读取/写入配置
  - 默认配置
  - 配置验证

- [ ] **1.6 实现 events.rs**
  - 定义事件类型
  - 事件发射函数

- [ ] **1.7 更新 main.rs**
  - 注册 Commands
  - 初始化配置

### 验收标准

- [ ] Rust 项目可以编译
- [ ] 配置可以正确读写
- [ ] 类型定义完整
- [ ] 错误处理完善

---

## Phase 2：Rust 核心模块（爬虫 + 扫描器）

**目标**：实现爬虫模块和本地扫描器

### 任务清单

- [ ] **2.1 实现 core/scraper/mod.rs**
  - 搜索漫画
  - 解析搜索结果
  - 并发爬取
  - 请求间隔控制
  - 代理支持
  - 去重逻辑
  - **Cloudflare 处理**：
    - 检测验证页面
    - 弹出 WebView 窗口
    - 等待用户完成验证
    - Cookies 共享

- [ ] **2.2 实现 core/scanner/mod.rs**
  - 扫描本地文件夹
  - 提取漫画信息
  - 支持多种文件夹结构

- [ ] **2.3 实现 commands/search.rs**
  - `search_comics` Command
  - 进度事件推送

- [ ] **2.4 测试爬虫功能**
  - 测试搜索功能
  - 测试代理
  - 测试并发爬取

### 验收标准

- [ ] 可以搜索漫画并返回结果
- [ ] 支持代理和请求间隔
- [ ] 可以扫描本地文件夹
- [ ] 前端可以接收搜索进度

---

## Phase 3：Rust 核心模块（下载 + 对比 + AI）

**目标**：实现下载器、对比器和 AI 匹配

### 任务清单

- [ ] **3.1 实现 core/downloader/mod.rs**
  - 并发下载
  - 断点续传
  - 重试机制
  - 进度追踪
  - 文件完整性校验

- [ ] **3.2 实现 core/ai/mod.rs**
  - 远程 API 调用
  - 相似度计算
  - 缓存机制
  - 预留本地模型接口

- [ ] **3.3 实现 core/comparer/mod.rs**
  - 网站漫画与本地漫画对比
  - AI 匹配集成
  - 统计信息生成

- [ ] **3.4 实现 commands/download.rs**
  - `start_download` Command
  - `pause_download` Command
  - `cancel_download` Command
  - 进度事件推送

- [ ] **3.5 实现 commands/compare.rs**
  - `compare_comics` Command
  - 进度事件推送

- [ ] **3.6 测试下载和对比功能**
  - 测试并发下载
  - 测试断点续传
  - 测试 AI 匹配
  - 测试对比流程

### 验收标准

- [ ] 可以下载漫画（并发、断点续传）
- [ ] AI 匹配可以正常工作
- [ ] 对比功能完整
- [ ] 所有进度通过 Events 推送

---

## Phase 4：前端改造

**目标**：适配 Tauri 2，优化 UI 组件

### 任务清单

- [ ] **4.1 更新 package.json**
  - 添加 `@tauri-apps/api` 2.x
  - 移除 Web 相关依赖

- [ ] **4.2 更新 vite.config.ts**
  - 添加 Tauri 插件
  - 配置构建路径

- [ ] **4.3 创建 src/composables/**
  - `useSearch.ts` - 搜索逻辑
  - `useDownload.ts` - 下载逻辑
  - `useCompare.ts` - 对比逻辑
  - `useConfig.ts` - 配置逻辑

- [ ] **4.4 创建 src/components/Sidebar.vue**
  - 侧边栏导航
  - 激活状态
  - 主题切换按钮

- [ ] **4.5 更新 src/components/Header.vue**
  - 自定义标题栏
  - 拖拽支持
  - 窗口控制按钮

- [ ] **4.6 更新页面组件**
  - `SearchView.vue`
  - `CompareView.vue`
  - `DownloadView.vue`
  - `ConfigView.vue`

- [ ] **4.7 更新 src/main.ts**
  - Tauri 初始化
  - 应用挂载

### 验收标准

- [ ] 前端可以正常编译
- [ ] 所有功能可以正常工作
- [ ] 侧边栏导航正常
- [ ] 自定义标题栏正常
- [ ] 进度实时更新

---

## Phase 5：桌面集成

**目标**：添加桌面端专属功能

### 任务清单

- [ ] **5.1 更新 tauri.conf.json**
  - 无边框窗口配置
  - 窗口尺寸
  - 系统托盘配置

- [ ] **5.2 实现系统托盘**
  - 托盘图标
  - 托盘菜单
  - 最小化到托盘

- [ ] **5.3 实现暗色模式**
  - CSS 变量定义
  - 跟随系统检测
  - 手动切换
  - 配置保存

- [ ] **5.4 实现系统通知**
  - Tauri 原生通知
  - 下载完成通知
  - 错误通知

- [ ] **5.5 实现快捷键**
  - 页面切换
  - 主题切换

- [ ] **5.6 实现窗口状态记忆**
  - 保存窗口位置
  - 保存窗口大小
  - 恢复窗口状态

### 验收标准

- [ ] 无边框窗口正常
- [ ] 系统托盘正常
- [ ] 暗色模式正常
- [ ] 系统通知正常
- [ ] 窗口状态记忆正常

---

## Phase 6：测试、优化、打包

**目标**：完善应用，准备发布

### 任务清单

- [ ] **6.1 功能测试**
  - 搜索功能测试
  - 对比功能测试
  - 下载功能测试
  - 配置功能测试

- [ ] **6.2 性能优化**
  - 图片懒加载
  - 虚拟滚动
  - 内存优化

- [ ] **6.3 错误处理**
  - 所有错误友好提示
  - 日志记录
  - 崩溃恢复

- [ ] **6.4 打包配置**
  - Windows 安装包
  - macOS 安装包
  - 应用图标
  - 版本信息

- [ ] **6.5 文档更新**
  - 用户手册
  - 安装指南
  - 常见问题

### 验收标准

- [ ] 所有功能测试通过
- [ ] 性能达标
- [ ] 可以打包 Windows 和 macOS 安装包
- [ ] 文档完整

---

## 重构检查清单

### 文档更新
- [ ] `.trae/rules/bss-rules.md`
- [ ] `.trae/rules/dev-rules.md`
- [ ] `docs/ARCHITECTURE.md`
- [ ] `docs/REQUIREMENTS.md`
- [ ] `docs/UI-DESIGN.md`
- [ ] `docs/DEVELOPMENT_PLAN.md`

### 代码清理
- [x] 删除 `src/cli/` - 已完成
- [x] 删除 `src/web/` - 已完成
- [x] 删除 `src/ui/adapters/` - 已完成
- [x] 删除 `src/api-server.ts` - 已完成
- [x] 删除 `src/tui.ts` - 已完成
- [x] 删除 `src/index.ts` - 已完成
- [x] 删除 `src/setup.ts` - 已完成
- [x] 删除 `scripts/api-server.js` - 已完成
- [x] 删除 `test-api.js` - 已完成
- [x] 删除 `test-compare.js` - 已完成

### 前端迁移
- [x] 前端代码已在 `src/` 目录
- [x] 更新 `package.json` - 已完成
- [x] 更新 `vite.config.ts` - 已完成

### Rust 开发
- [ ] 实现 `types.rs`
- [ ] 实现 `error.rs`
- [ ] 实现 `config.rs`
- [ ] 实现 `events.rs`
- [ ] 实现 `core/scraper/`
- [ ] 实现 `core/scanner/`
- [ ] 实现 `core/downloader/`
- [ ] 实现 `core/comparer/`
- [ ] 实现 `core/ai/`
- [ ] 实现 `commands/`

### 前端改造
- [ ] 实现 `composables/`
- [ ] 实现 `Sidebar.vue`
- [ ] 实现 `Header.vue`
- [ ] 更新页面组件
- [ ] 实现暗色模式
- [ ] 实现系统托盘

### 测试打包
- [ ] 功能测试
- [ ] 性能优化
- [ ] Windows 打包
- [ ] macOS 打包

---

**最后更新**: 2026-04-26  
**版本**: v4.0（纯桌面端重构版）
