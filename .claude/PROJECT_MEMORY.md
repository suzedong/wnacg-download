# WNACG Downloader — 项目记忆

> 最后更新: 2026-05-19

## 当前状态

- **版本**: v4.0.0
- **分支**: main
- **标签**: v4.0.0
- **整体完成度**: ~90%

## 常用命令

```bash
npm run dev              # Tauri 开发模式
npm run dev:frontend     # 仅 Vite
npm run build            # 完整构建（前端 + Rust + 打包）
npm run build:frontend   # 仅前端（类型检查 + 构建）
npm run lint             # ESLint
npm run format           # Prettier
cargo build              # 调试构建（在 src-tauri/ 下）
cargo build --release    # 发布构建
```

## 关键配置

- 存储路径: `{exe_dir}/config/config.json`
- 缓存路径: `{exe_dir}/cache/`
- 默认并发下载数: 3
- 默认请求间隔: 1000ms
- 匹配阈值: 0.8
- 主题: 跟随系统（light / dark / auto）

## 构建产物路径

- `.app`: `src-tauri/target/release/bundle/macos/WNACG Downloader.app`
- `dmg`: `src-tauri/target/release/bundle/dmg/`（构建失败）
- `nsis`: Windows 构建时生成

---

## 开发进度

### Phase 1-3 ✅ 全部完成

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 核心功能：搜索、对比、下载、队列管理 | ✅ |
| Phase 2 | 用户体验：暗色模式跟随、文件对话框、错误提示、加载状态、快捷键、配置优化 | ✅ |
| Phase 3 | 测试与优化：Rust 单元测试、前端组件测试、代码质量 | ✅ |

### Phase 4 🟡 进行中

| 任务 | 状态 |
|------|------|
| 4.1 系统托盘 | ✅ |
| 4.2 应用图标 | ✅ |
| 4.3 打包配置 | ✅ NSIS 双语 + DMG 配置完成 |
| 4.4 文档完善 | ✅ README 重写、用户手册、贡献指南 |
| 4.5 发布准备 | 🟡 部分完成 |
| ↳ 版本标签 v4.0.0 | ✅ |
| ↳ Release Notes | ✅ |
| ↳ .app 构建 | ✅ macOS aarch64 |
| ↳ macOS DMG | ⚠️ 失败（见已知问题） |
| ↳ Windows NSIS | ⬜ 需 Windows 环境 |
| 4.6 自动更新 | ⬜ 未开始 |

### Phase 4 待完成任务详情

| 优先级 | 任务 | 细节 |
|--------|------|------|
| P3 | macOS DMG 打包 | ⚠️ Tauri 2.10.3 + macOS 26.5 兼容性，`bundle_dmg.sh` 收不到参数，待 Tauri 更新或 CI 构建 |
| P3 | Windows NSIS 安装包 | 需在 Windows 环境构建 |
| P3 | 测试安装包 | 验证不同系统兼容性 |
| P3 | 自动更新 | 可选功能 |

### Phase 3 ✅ 全部完成

---

## 核心功能概览

### 后端（Rust）- 100%

- ✅ 配置管理、事件系统、错误处理
- ✅ downloader、scanner、comparer、ai 核心模块
- ✅ Playwright 搜索脚本（Node.js 派生）
- ✅ Tauri Commands（search、download、compare、config、open_folder）
- ✅ AI 两阶段匹配：本地精确/模糊优先 + AI 兜底
- ✅ 双策略下载：Server 2 直连 / Worker API（绕过 Cloudflare）
- ✅ 系统托盘 + 窗口控制

### 前端（Vue 3）- 100%

- ✅ Vue 3 + TypeScript + Vite，侧边栏导航
- ✅ 主题系统（亮色/暗色/跟随系统）
- ✅ Composables（useSearch、useDownload、useCompare、useConfig、useDownloadQueue）
- ✅ 配置/搜索/对比/下载页面

---

## 已知问题

1. **macOS DMG 打包失败** — Tauri 2.10.3 的 `bundle_dmg.sh`（create-dmg）与 macOS 26.5 不兼容，脚本收不到参数。`.app` 构建正常，DMG 需等待 Tauri 更新或 CI 环境构建
2. **Worker API 下载** — Cloudflare 检测 headless Chromium，浏览器窗口短暂可见。默认 `server2` 策略不受影响
3. **TypeScript 类型** — `window.__TAURI__` 需要手动声明（已在 `src/env.d.ts` 修复）

### 技术风险

1. **WNACG 网站结构变化** — HTML 解析可能失效
2. **AI API 成本控制** — 已优化为「本地优先 + AI 兜底」，大部分情况零 API 调用
3. **并发下载稳定性** — 大量任务时可能遇到资源竞争
4. **跨平台兼容性** — Windows 和 macOS 的托盘、通知差异

---

## 工作原则：文档先行

**核心策略：文档先行，有异先讨论，确认后修改**

任何需求、架构、界面、代码修改，必须遵循以下流程：

1. **先讨论** — 有新想法或分歧时，先沟通确认方向
2. **改文档** — 需求变更更新 `docs/REQUIREMENTS.md`，架构变更更新 `docs/ARCHITECTURE.md`，界面变更更新 `docs/UI-DESIGN.md`
3. **后编码** — 文档确认后再写代码
4. **同步更新** — 代码修改完成后，同步更新相关文档，保持文档与代码一致

> 文档不是代码的附属品，文档是开发的指南针。

## Git 提交规范

格式: `<type>: <subject>`
- `feat` 新功能 | `fix` Bug 修复 | `docs` 文档 | `refactor` 重构 | `test` 测试 | `chore` 构建/工具
