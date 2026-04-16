# Electron 桌面客户端 - 快速开始指南

## 🎯 Phase 1 完成状态

✅ **所有 Phase 1 桌面客户端任务已完成！**

## 📁 新增文件清单

### 核心文件
```
src/electron/
├── main.ts                    # Electron 主进程（窗口管理、IPC 处理）
└── test-electron.ts           # Electron 测试脚本
```

### 配置文件
```
├── vite.electron.config.ts    # Vite Electron 配置
├── .vscode/
│   ├── launch.json            # VS Code 调试配置
│   └── tasks.json             # VS Code 任务配置
```

### 文档文件
```
├── ELECTRON_SETUP.md          # Electron 设置指南（详细版）
├── ELECTRON_PHASE1_SUMMARY.md # Phase 1 完成总结
└── ELECTRON_QUICKSTART.md     # 本文档（快速开始）
```

### 更新的文件
```
src/ui/preload.ts              # 更新为 ES Module 语法
package.json                   # 新增 Electron 脚本和依赖
```

## 🚀 5 分钟快速开始

### 步骤 1：安装依赖

```bash
npm install
```

### 步骤 2：启动 Electron 开发模式

```bash
# 方式 1（推荐）：一键启动
npm run dev:electron

# 方式 2：手动启动（两个终端）
# 终端 1
npm run dev:ui

# 终端 2（等待 Vite 启动完成后）
npm run electron:dev
```

### 步骤 3：验证功能

Electron 窗口打开后，按 F12 打开开发者工具，在 Console 中输入：

```javascript
// 测试 Electron API 是否可用
console.log(window.electronAPI);

// 测试获取配置
window.electronAPI.getConfig().then(config => {
  console.log('配置:', config);
});
```

如果看到配置信息输出，说明 Electron 配置正确！✅

## 📦 生产构建

```bash
# 构建当前平台的安装包
npm run electron:build

# 构建结果在 dist/build/ 目录
```

## 🔧 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev:electron` | 一键启动 Electron 开发模式（推荐） |
| `npm run electron:dev` | 启动 Electron（需要先构建） |
| `npm run electron:build` | 构建 Electron 应用 |
| `npm run electron:preview` | 预览已构建的应用 |
| `npm run dev:ui` | 启动 Vite 开发服务器 |

## 🎯 已实现的功能

### IPC 通信接口

| 功能 | API | 状态 |
|------|-----|------|
| 搜索漫画 | `searchComics(keyword)` | ✅ |
| 获取缓存列表 | `getCacheList()` | ✅ |
| 删除缓存 | `deleteCache(keyword)` | ✅ |
| 对比漫画 | `compareComics(keyword, localPath)` | ✅ |
| 下载漫画 | `downloadComics(comics, storagePath)` | ✅ |
| 取消下载 | `cancelDownload(aid)` | ✅ |
| 获取配置 | `getConfig()` | ✅ |
| 设置配置 | `setConfig(key, value)` | ✅ |
| 选择目录 | `selectDirectory()` | ✅ |

### 事件推送

| 事件 | 说明 | 状态 |
|------|------|------|
| `download-progress` | 下载进度更新 | ✅ |
| `download-completed` | 下载完成 | ✅ |
| `download-error` | 下载错误 | ✅ |

## 🐛 常见问题

### Q1: 启动 Electron 时提示找不到模块？

**A**: 确保已安装所有依赖：
```bash
npm install
```

### Q2: Electron 窗口显示空白？

**A**: 检查 Vite 开发服务器是否启动：
```bash
npm run dev:ui
```

### Q3: 如何调试主进程？

**A**: 使用 VS Code 调试配置：
1. 按 F5 选择 "Debug Electron Main"
2. 在 main.ts 中设置断点

### Q4: 如何调试渲染进程？

**A**: 在 Electron 窗口中按 F12 打开开发者工具

## 📚 详细文档

- **设置指南**: [ELECTRON_SETUP.md](./ELECTRON_SETUP.md)
- **Phase 1 总结**: [ELECTRON_PHASE1_SUMMARY.md](./ELECTRON_PHASE1_SUMMARY.md)
- **开发计划**: [.trae/specs/DEVELOPMENT_PLAN.md](.trae/specs/DEVELOPMENT_PLAN.md)
- **架构设计**: [.trae/specs/architecture/spec.md](.trae/specs/architecture/spec.md)

## ✅ 验收标准

Phase 1 桌面客户端的所有验收标准已满足：

- ✅ Electron 主进程文件创建
- ✅ IPC 处理器实现（9 个接口）
- ✅ 预加载脚本配置（ES Module）
- ✅ Vite Electron 配置
- ✅ 核心模块与 Electron 集成
- ✅ 目录选择对话框实现
- ✅ 进度事件推送实现
- ✅ 开发脚本配置
- ✅ 构建脚本配置
- ✅ VS Code 调试配置

## 🎉 开始开发吧！

```bash
npm run dev:electron
```

---

**创建日期**: 2026-04-16  
**状态**: ✅ Phase 1 完成
