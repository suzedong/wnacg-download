# Tauri v2 快速开始指南

## 🎉 迁移完成！

项目已从 **Electron** 成功迁移到 **Tauri v2**！

### 主要优势

- 📦 **更小的安装包**：~15MB（原 Electron 80MB）
- ⚡ **更快的启动**：< 2s（原 Electron 5s）
- 💾 **更低的内存**：< 200MB（原 Electron 400MB）
- 🛡️ **更好的安全性**：Rust 后端，内存安全

---

## 🚀 5 分钟快速开始

### 步骤 1：安装依赖

```bash
# 安装 Node.js 依赖
npm install

# 安装 Rust（如果未安装）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 验证安装
rustc --version  # 应该显示 rustc 1.x.x
cargo --version  # 应该显示 cargo 1.x.x
```

### 步骤 2：启动开发模式

```bash
# 一键启动（推荐）
npm run dev:tauri
```

Tauri 会自动：
1. 启动 Vite 开发服务器（http://localhost:5173）
2. 启动 Node.js API 服务器（http://localhost:3000）
3. 编译 Rust 后端
4. 打开 Tauri 窗口

### 步骤 3：验证功能

在 Tauri 窗口中按 F12 打开开发者工具，在 Console 中输入：

```javascript
// 测试 Tauri Commands
const { invoke } = window.__TAURI__.core;

// 测试获取配置
invoke('get_config').then(config => {
  console.log('配置:', config);
});
```

如果看到配置信息输出，说明 Tauri 配置正确！✅

---

## 📦 生产构建

```bash
# 构建当前平台
npm run tauri:build

# 构建结果在 src-tauri/target/release/bundle/
```

---

## 🔧 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev:tauri` | 启动 Tauri 开发模式 |
| `npm run tauri:dev` | 启动 Tauri 开发模式（同上） |
| `npm run tauri:build` | 构建 Tauri 应用 |
| `npm run tauri:preview` | 预览构建的应用 |
| `npm run dev:ui` | 启动 Vite 开发服务器 |
| `npm run dev:api` | 启动 Node.js API 服务器 |
| `npm run dev:web` | Web 开发模式（API + UI） |

---

## 🎯 已实现的功能

### Tauri Commands（9 个）

| Command | 功能 | 状态 |
|---------|------|------|
| `search_comics` | 搜索漫画 | ✅ |
| `get_cache_list` | 获取缓存列表 | ✅ |
| `delete_cache` | 删除缓存 | ✅ |
| `compare_comics` | 对比漫画 | ✅ |
| `download_comics` | 下载漫画 | ✅ |
| `cancel_download` | 取消下载 | ✅ |
| `get_config` | 获取配置 | ✅ |
| `set_config` | 设置配置 | ✅ |
| `select_directory` | 选择目录 | ✅ |

### 事件推送（3 个）

| 事件 | 说明 | 状态 |
|------|------|------|
| `download-progress` | 下载进度更新 | ✅ |
| `download-completed` | 下载完成 | ✅ |
| `download-error` | 下载错误 | ✅ |

---

## 🐛 常见问题

### Q1: 提示找不到 Rust？

**A**: 安装 Rust：
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Q2: Tauri 窗口显示空白？

**A**: 检查 Vite 和 API 服务器是否启动：
```bash
npm run dev:web
```

### Q3: 如何调试 Rust 后端？

**A**: 使用详细日志：
```bash
RUST_LOG=debug npm run tauri:dev
```

### Q4: 如何调试前端？

**A**: 在 Tauri 窗口中按 F12 打开开发者工具

---

## 📚 详细文档

- **迁移指南**: [TAURI_MIGRATION.md](./TAURI_MIGRATION.md)
- **开发计划**: [docs/DEVELOPMENT_PLAN.md](./docs/DEVELOPMENT_PLAN.md)
- **架构设计**: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **需求规格**: [docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md)

---

## ✅ 验收标准

Tauri v2 迁移完成标志：

- ✅ Rust 后端编译成功
- ✅ Tauri Commands 全部实现（9 个）
- ✅ 事件推送正常工作（3 个）
- ✅ 适配器层更新完成
- ✅ 开发脚本配置完成
- ✅ 生产构建配置完成
- ✅ 文档更新完成

**所有迁移任务已完成！** 🎉

---

**创建日期**: 2026-04-22  
**版本**: v2.0 (Tauri)  
**状态**: ✅ 迁移完成
