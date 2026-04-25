# WNACG Downloader - 开发规范

## 项目信息
- **名称**: WNACG Downloader
- **产品形态**: CLI + Web 应用 + 桌面客户端三架构
- **核心功能**: 搜索、对比、下载汉化漫画
- **架构特点**: 
  - 核心业务逻辑完全复用
  - Web 和 Tauri 共享 UI 组件（复用率 > 95%）
  - 适配器模式统一通信接口

---

## 工作原则 ⭐

### 1. 文档驱动开发

**开发前**：
1. 阅读 `docs/DEVELOPMENT_PLAN.md` - 了解当前要开发的任务
2. 阅读 `docs/REQUIREMENTS.md` - 理解功能需求
3. 阅读 `docs/ARCHITECTURE.md` - 理解架构设计
4. 对照验收标准 - 明确完成标准

**开发中**：
1. 遵循架构设计 - 不要随意更改
2. 遵守开发规范 - TypeScript/Vue 规范
3. 完整的错误处理 - 所有错误都要捕获
4. 中文注释和日志 - 所有提示用中文

**开发后**：
1. 对照验收标准 - 自我验证
2. 运行 lint 检查 - 确保代码规范
3. 运行 build 验证 - 确保编译通过
4. 更新文档 - 如有必要

### 2. 禁止行为 ❌

- ❌ 不阅读文档就编码
- ❌ 跳过验收标准
- ❌ 随意更改架构设计
- ❌ 忽略错误处理
- ❌ 使用英文注释和日志
- ❌ 跳过测试验证

### 3. 必须遵守 ✅

- ✅ 先理解需求再开发
- ✅ 遵循 TypeScript/Vue 规范
- ✅ 完整的错误处理
- ✅ 中文注释和日志
- ✅ 按照 Phase 顺序执行
- ✅ 对照验收标准验证

---

## TypeScript 编码规范

### 基本规则
- 使用 ES Module (`import/export`)，不使用 CommonJS
- 类型定义统一放在 `types.ts` 中
- 优先使用接口定义对象类型，类型别名用于联合类型等
- 类的私有成员使用 `private` 关键字
- 异步函数返回 `Promise<T>` 类型
- 避免使用 `any`，必要时用 `unknown` 代替

### 类型安全
```typescript
// ✅ 好的做法
interface Comic {
  aid: string;
  title: string;
  coverUrl: string;
}

function getComic(aid: string): Promise<Comic> {
  // ...
}

// ❌ 不好的做法
function getComic(aid: any): Promise<any> {
  // ...
}
```

---

## Vue 编码规范

### 基本规则
- 使用 `<script setup>` 语法
- 组件命名使用 PascalCase
- Props 定义使用 `defineProps`
- 事件使用 `defineEmits`
- 状态管理使用 `ref` 和 `reactive`
- 样式使用 `<style scoped>` 避免污染

### 组件结构
```vue
<template>
  <div class="comic-card">
    <h3>{{ comic.title }}</h3>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  comic: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['select', 'download']);
</script>

<style scoped>
.comic-card {
  /* ... */
}
</style>
```

---

## UI 设计规范

### 设计原则
- 遵循 [`docs/UI-DESIGN.md`](../docs/UI-DESIGN.md) 中的设计稿
- 保持界面一致性
- 响应式布局
- **Web 和 Tauri 共享 UI 组件**

### 样式规范
- 使用 scoped 样式
- 遵循配色方案（紫色渐变 #667eea → #764ba2）
- 响应式设计（支持移动端）
- 卡片样式：白色半透明背景 + 圆角 + 阴影

### 组件规范
- 可复用组件放在 `src/ui/components/`
- 页面组件放在 `src/ui/views/`
- 组件命名使用 PascalCase
- **Web 和 Tauri 完全复用**

### 适配器模式
- **适配器层**：`src/ui/adapters/`
- **Web API 客户端**：`api-client.ts`
- **Tauri IPC 客户端**：`tauri-client.ts`
- **UI 组件无感知通信方式**

---

## 代码格式化

### 工具配置
- 使用 Prettier 格式化（配置见 `.prettierrc.json`）
- 使用 ESLint 检查（配置见 `.eslintrc.json`）

### 格式化规则
- 缩进：2 个空格
- 单引号
- 行尾分号
- 每行最大 80 字符

### 示例
```typescript
// ✅ 好的做法
const config = {
  proxy: 'http://127.0.0.1:7890',
  maxPages: 5,
};

// ❌ 不好的做法
const config = {
    proxy: "http://127.0.0.1:7890",
    maxPages: 5
}
```

---

## 错误处理

### 基本原则
- 所有错误都应该被捕获并友好地显示给用户
- 网络错误时提供明确的错误信息
- 下载失败时记录失败原因
- 使用 try-catch 捕获异步错误

### 错误处理示例
```typescript
try {
  const comics = await scraper.search(keyword);
  console.log(`找到 ${comics.length} 部漫画`);
} catch (error) {
  console.error(`搜索失败：${error.message}`);
  // 友好的错误提示
  alert(`搜索失败：${error.message}`);
}
```

### 错误日志
```typescript
// ✅ 好的做法
logger.error(`下载失败：${comic.title}`, {
  aid: comic.aid,
  error: error.message,
  stack: error.stack,
});

// ❌ 不好的做法
console.log(error);
```

---

## 测试策略

### 测试框架
- 使用 Vitest 作为测试框架
- 核心模块（scraper, downloader, matcher）需要写单元测试
- 测试文件命名：`*.test.ts`
- 运行测试：`npm test`

### 测试覆盖
- 核心业务逻辑必须有测试
- 错误处理必须有测试
- 边界条件必须有测试

---

## Git 提交规范

### 提交格式
```
<type>: <subject>
```

### type 可选值
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

### 示例
```
feat: 添加搜索缓存功能
fix: 修复下载失败问题
docs: 更新需求规格说明书
refactor: 重构爬虫模块
```

### 语言规则
- 全部使用中文描述
- 简洁明了
- 说明做了什么

---

## 语言规则

### 中文使用场景
- ✅ 开发中所有的提示都用中文
- ✅ 代码注释使用中文
- ✅ 日志信息使用中文
- ✅ 错误提示使用中文
- ✅ 用户界面文字使用中文

### 示例
```typescript
// ✅ 好的做法
console.log('搜索中...');
logger.info('开始下载漫画');
alert('下载完成！');

// ❌ 不好的做法
console.log('Searching...');
logger.info('Start downloading comics');
alert('Download complete!');
```

---

## 开发流程

### 标准流程
```
1. 阅读 DEVELOPMENT_PLAN.md
   ↓ 找到当前要开发的任务
   
2. 阅读任务的验收标准
   ↓ 明确完成标准
   
3. 阅读 requirements/spec.md 相关章节
   ↓ 理解功能需求
   
4. 阅读 architecture/spec.md 相关章节
   ↓ 理解架构设计
   
5. 开始编码
   ↓ 遵守本规范
   
6. 自我验证
   ↓ 对照验收标准检查
   
7. 运行测试
   ↓ npm test
   
8. 提交代码
   ↓ git commit -m "feat: xxx"
```

---

## 文档参考

| 文档 | 用途 | 路径 |
|------|------|------|
| **项目规则** | 项目概述、功能规则、AI 要求 | `bss-rules.md` |
| **开发规范** | 本文档 | `dev-rules.md` |
| **需求规格** | 功能需求详细描述 | `docs/REQUIREMENTS.md` |
| **架构设计** | 技术实现方案 | `docs/ARCHITECTURE.md` |
| **界面设计** | UI 设计、共享策略、适配器模式 | `docs/UI-DESIGN.md` |
| **开发计划** | 任务清单和验收标准 | `docs/DEVELOPMENT_PLAN.md` |

---

**最后更新**: 2026-04-14  
**版本**: v3.0（三架构 AI 开发版）
