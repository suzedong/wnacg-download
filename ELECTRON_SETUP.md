# Electron 桌面客户端设置指南

## 📋 概述

WNACG Downloader 现在支持 Electron 桌面客户端！本文档将指导你如何开发和构建 Electron 应用。

## 🏗️ 架构设计

### 三架构复用
- **核心业务逻辑**：`src/core/` - CLI、Web、Electron 共享
- **UI 组件**：`src/ui/` - Web 和 Electron 共享（复用率 > 95%）
- **通信方式**：
  - Web：HTTP API（Fetch）
  - Electron：IPC（Inter-Process Communication）

### Electron 文件结构
```
src/electron/
├── main.ts              # Electron 主进程（窗口管理、IPC 处理）
└── preload.ts           # 预加载脚本（contextBridge）

src/ui/
├── adapters/
│   └── electron-client.ts  # Electron IPC 客户端
├── components/          # 可复用组件
├── views/               # 页面组件
└── main.ts              # Web/Electron 共享入口
```

## 🚀 开发模式

### 方式 1：推荐开发模式（自动热更新）

```bash
# 安装依赖
npm install

# 启动 Electron 开发模式（自动启动 Vite 和 Electron）
npm run dev:electron
```

这个命令会：
1. 启动 Vite 开发服务器（http://localhost:5173）
2. 等待 Vite 就绪
3. 编译 preload.ts
4. 启动 Electron 应用
5. 支持热更新

### 方式 2：手动开发模式

```bash
# 终端 1：启动 Vite 开发服务器
npm run dev:ui

# 终端 2：构建并启动 Electron
npm run electron:dev
```

## 📦 生产构建

### 构建 Electron 应用

```bash
# 构建所有平台（根据当前系统）
npm run electron:build

# 构建特定平台
npm run electron:build -- --win    # Windows
npm run electron:build -- --mac    # macOS
npm run electron:build -- --linux  # Linux
```

构建输出目录：`dist/build/`

### 预览构建结果

```bash
# 预览已构建的应用
npm run electron:preview
```

## 🔧 配置文件说明

### 1. Vite 配置
- **Web 开发**：`vite.config.ts`
- **Electron 构建**：`vite.electron.config.ts`

### 2. TypeScript 配置
- **主应用**：`tsconfig.json`
- **Preload 脚本**：`tsconfig.preload.json`

### 3. Electron Builder 配置
配置在 `package.json` 中：
```json
{
  "build": {
    "appId": "com.wnacg.downloader",
    "productName": "WNACG Downloader",
    "files": ["dist/**/*", "package.json"],
    "win": { "target": ["nsis", "portable"] },
    "mac": { "target": "dmg" },
    "linux": { "target": ["deb", "rpm", "AppImage"] }
  }
}
```

## 💡 核心功能实现

### IPC 通信流程

```
渲染进程 (Vue UI)
    ↓
contextBridge (preload.ts)
    ↓
ipcRenderer / ipcMain
    ↓
主进程 (main.ts)
    ↓
核心模块 (scraper, downloader, comparer)
```

### 已实现的 IPC 接口

| 接口 | 功能 | 说明 |
|------|------|------|
| `search-comics` | 搜索漫画 | 调用核心 scraper 模块 |
| `get-cache-list` | 获取缓存列表 | 读取 search_*.json 文件 |
| `delete-cache` | 删除缓存 | 删除指定搜索结果 |
| `compare-comics` | 对比漫画 | 调用核心 comparer 模块 |
| `download-comics` | 下载漫画 | 调用核心 downloader 模块 |
| `cancel-download` | 取消下载 | 取消指定漫画下载 |
| `get-config` | 获取配置 | 读取配置文件 |
| `set-config` | 设置配置 | 保存配置 |
| `select-directory` | 选择目录 | 打开系统目录选择对话框 |

### 事件推送

```typescript
// 主进程发送事件
mainWindow.webContents.send('download-progress', progress);
mainWindow.webContents.send('download-completed', result);
mainWindow.webContents.send('download-error', error);

// 渲染进程监听
window.electronAPI.onDownloadProgress((progress) => {
  // 更新 UI
});
```

## 🎯 适配器模式

### Web 和 Electron 共享 UI 的关键

```typescript
// src/ui/adapters/index.ts
export function createClient() {
  if (typeof window !== 'undefined' && 'electronAPI' in window) {
    return new ElectronClient();  // Electron 环境
  } else {
    return new ApiClient();       // Web 环境
  }
}

// UI 组件使用（无感知）
const client = createClient();
const results = await client.search(keyword);
```

## 🐛 调试技巧

### 1. 开发者工具
Electron 开发模式会自动打开开发者工具（F12）

### 2. 主进程调试
在主进程代码中添加断点，使用 VS Code 调试：

```json
// .vscode/launch.json
{
  "name": "Debug Electron Main",
  "type": "node",
  "request": "launch",
  "cwd": "${workspaceFolder}",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
  "windows": {
    "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
  },
  "args": ["."]
}
```

### 3. 渲染进程调试
直接使用浏览器开发者工具（F12）

### 4. 查看日志
```typescript
// 主进程日志
console.log('主进程:', data);

// 渲染进程日志
console.log('渲染进程:', data);
```

## ✅ 验收标准

Phase 1 Electron 桌面客户端完成标志：

- [x] Electron 主进程文件创建 (`src/electron/main.ts`)
- [x] IPC 处理器实现（搜索、对比、下载、配置）
- [x] 预加载脚本配置 (`src/ui/preload.ts`)
- [x] Vite Electron 配置 (`vite.electron.config.ts`)
- [x] 核心模块与 Electron 集成
- [x] 目录选择对话框实现
- [x] 进度事件推送实现
- [x] 开发脚本配置 (`dev:electron`)
- [x] 构建脚本配置 (`electron:build`)

## 📝 下一步

完成 Phase 1 后，继续开发：

1. **Phase 2**：搜索功能完善
   - Web 搜索 API 实现
   - 搜索结果列表组件
   - 搜索结果预览组件

2. **Phase 3**：对比功能完善
   - AI 匹配器优化
   - 对比流程优化

3. **Phase 4**：下载功能完善
   - 下载进度追踪
   - 智能重试机制

## 🔗 相关文档

- [开发计划](.trae/specs/DEVELOPMENT_PLAN.md)
- [架构设计](.trae/specs/architecture/spec.md)
- [需求规格](.trae/specs/requirements/spec.md)
- [界面设计](.trae/specs/ui-design/spec.md)

---

**最后更新**: 2026-04-16  
**版本**: v1.0（Phase 1 完成）
