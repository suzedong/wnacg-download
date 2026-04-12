# WNACG Downloader - 完整开发计划

> **版本**: v2.0  
> **创建时间**: 2026-04-12  
> **状态**: 待开发  
> **目标读者**: 开发团队成员

---

## 📋 目录

1. [项目概述](#项目概述)
2. [架构设计](#架构设计)
3. [开发策略](#开发策略)
4. [Phase 1: 核心代码重构与基础功能](#phase-1-核心代码重构与基础功能)
5. [Phase 2: 搜索功能完善](#phase-2-搜索功能完善)
6. [Phase 3: 对比功能完善](#phase-3-对比功能完善)
7. [Phase 4: 下载功能完善](#phase-4-下载功能完善)
8. [Phase 5: 配置管理与体验优化](#phase-5-配置管理与体验优化)
9. [集成与测试](#集成与测试)
10. [风险管理](#风险管理)

---

## 项目概述

### 项目目标
将 WNACG Downloader 开发为一个功能完整、架构稳定、用户体验良好的漫画下载工具。

### 核心价值
- ✅ 批量搜索和下载汉化漫画
- ✅ 智能对比本地已有漫画避免重复
- ✅ AI 智能匹配漫画名称（准确率 > 90%）
- ✅ 支持断点续传和并发下载
- ✅ CLI、TUI、GUI 三种交互方式
- ✅ 核心业务逻辑完全复用

### 开发原则

**核心理念**: CLI 和 UI 复用同一套业务逻辑，只是交互方式不同。

```
┌─────────────────────────────────────────┐
│         表现层 (三种交互方式)            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │   CLI   │  │   TUI   │  │   UI    │ │
│  └─────────  └─────────┘  └─────────┘ │
└─────────────────────────────────────────┘
              ↓ 复用 ↓
┌─────────────────────────────────────────┐
│         业务逻辑层 (核心模块)            │
│  ┌─────────────────────────────────┐   │
│  │  src/core/ (scraper, downloader)│   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 架构设计

### 当前架构

```
┌─────────────────────────────────────────────────────────┐
│                   表现层                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  CLI 命令行  │  │  TUI 文本 UI │  │ Electron UI │    │
│  │  (src/cli)  │  │  (src/tui)  │  │  (src/ui)   │    │
│  └──────┬──────┘  └────────────┘  └────────────┘    │
└─────────┼────────────────┼────────────────────────────┘
          │                │                │
          └────────────────────────────────┘
                           ↓
          ┌────────────────────────────────┐
          │     业务逻辑层 (核心复用)       │
          │  ┌──────────────────────────┐ │
          │  │  src/core/               │ │
          │  │  ├── scraper.ts   (爬虫) │ │ ← Phase 1
          │  │  ├── downloader.ts(下载) │ │ ← Phase 4
          │  │  ├── scanner.ts   (扫描) │ │ ← Phase 3
          │  │  ├── comparer.ts  (对比) │ │ ← Phase 3
          │  │  └── ai/          (AI)   │ │ ← Phase 3
          │  └──────────────────────────┘ │
          └────────────────────────────────┘
                           ↓
          ┌────────────────────────────────┐
          │       配置管理层               │
          │  ┌──────────────────────────┐ │
          │  │  src/config.ts           │ │ ← Phase 2,5
          │  │  src/config/             │ │
          │  └──────────────────────────┘ │
          └────────────────────────────────┘
```

### 组件层级结构

```
src/ui/
├── App.vue                    # 布局容器（目标：< 300 行）
├── types.ts                   # TypeScript 类型定义
├── index.ts                   # 统一导出文件
│
├── components/                # 可复用组件
│   ├── Header.vue            ✅ 顶部导航
│   ├── Footer.vue            ✅ 底部信息
│   ├── ComicCard.vue         ✅ 漫画卡片
│   ├── StatCard.vue          ⏳ 统计卡片
│   ├── QueueItem.vue         ⏳ 队列项
│   └── DownloadProgress.vue  ⏳ 下载进度
│
└── views/                     # 页面级组件
    ├── SearchView.vue        ✅ 搜索页面
    ├── CompareView.vue       ⏳ 对比页面
    ├── DownloadView.vue      ⏳ 下载页面
    └── ConfigView.vue        ⏳ 配置页面
```

---

## 开发策略

### 分阶段推进

**核心理念**: 每个阶段聚焦一个功能模块，完成后才进入下一阶段。

```
Phase 1: 核心代码重构与基础功能
    ↓ 建立稳定的核心层
Phase 2: 搜索功能完善
    ↓ 统一搜索体验
Phase 3: 对比功能完善
    ↓ AI 匹配 > 90%
Phase 4: 下载功能完善
    ↓ 快速稳定下载
Phase 5: 配置管理与体验优化
    ↓ 统一配置管理
    ↓
集成与测试
```

### 每个阶段的工作流程

```
1. 分析现状 → 2. 设计重构方案 → 3. 实施重构 → 4. 功能优化 → 5. 验证
         ↖_________________________________________↙
                        迭代改进
```

### 重构优先级

| 优先级 | 重构对象 | 目标 |
|--------|---------|------|
| **P0** | 核心业务逻辑 | 提高可测试性、可维护性 |
| **P1** | 接口设计 | 统一 CLI 和 UI 的调用方式 |
| **P2** | 错误处理 | 友好的错误提示 |
| **P3** | 性能优化 | 提升执行效率 |

---

## Phase 1: 核心代码重构与基础功能

**时间**: Week 1-2  
**优先级**: P0 (最高)  
**目标**: 建立稳定、可测试、易维护的核心业务层

### 1.1 核心模块重构

#### Task 1.1.1: 类型系统完善
**工作量**: 4 小时 | **优先级**: P0

**任务描述**:
- 创建统一的类型定义文件 `src/types/index.ts`
- 定义所有核心模块的输入输出类型
- 定义配置类型和错误类型

**关键类型**:
```typescript
// 漫画基础信息
export interface Comic {
  aid: string;
  title: string;
  coverUrl: string;
  category: string;
  author?: string;
}

// 搜索选项
export interface SearchOptions {
  author: string;
  maxPages: number;
  onlyChinese: boolean;
  requestDelay?: number;
}

// 下载结果
export interface DownloadResult {
  success: boolean;
  comic: Comic;
  savedPath?: string;
  error?: Error;
  pages: number;
  downloadedPages: number;
}

// 统一错误类
export class WnacgError extends Error {
  code: string;
  retryable: boolean;
  
  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}
```

**验收标准**:
- [ ] 所有核心模块使用统一类型
- [ ] TypeScript 编译无错误
- [ ] 类型导出完整

---

#### Task 1.1.2: 配置管理重构
**工作量**: 3 小时 | **优先级**: P0

**任务描述**:
- 创建配置管理器类
- 支持配置的依赖注入
- 支持配置的动态更新

**重构方案**:
```typescript
// src/config/ConfigManager.ts
export class ConfigManager {
  private config: WnacgConfig;
  private listeners: Map<string, Set<(value: any) => void>>;

  get<T>(key: keyof WnacgConfig): T {
    return this.config[key] as T;
  }

  set<T>(key: keyof WnacgConfig, value: T): void {
    this.config[key] = value;
    this.notifyListeners(key, value);
  }

  onUpdate(key: keyof WnacgConfig, callback: (value: any) => void): void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
  }
}

// 使用方式
const configManager = new ConfigManager(defaultConfig);
const scraper = new WNACGScraper(configManager);
const downloader = new Downloader(configManager);
```

**验收标准**:
- [ ] 配置管理器工作正常
- [ ] 支持动态更新
- [ ] 所有模块使用配置管理器

---

#### Task 1.1.3: 错误处理统一
**工作量**: 3 小时 | **优先级**: P0

**任务描述**:
- 创建统一的错误类
- 定义错误码常量
- 提供友好的错误提示

**重构方案**:
```typescript
// src/core/errors.ts
export class WnacgError extends Error {
  code: string;
  retryable: boolean;

  static networkError(originalError: Error): WnacgError {
    return new WnacgError(
      `网络错误：${originalError.message}`,
      ErrorCodes.NETWORK_ERROR,
      true
    );
  }

  static verificationRequired(): WnacgError {
    return new WnacgError(
      '需要完成验证码验证',
      ErrorCodes.VERIFICATION_REQUIRED,
      false
    );
  }
}

// 错误码常量
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  PAGE_NOT_FOUND: 'PAGE_NOT_FOUND',
  VERIFICATION_REQUIRED: 'VERIFICATION_REQUIRED',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
} as const;
```

**验收标准**:
- [ ] 所有错误都使用 WnacgError
- [ ] 错误码定义完整
- [ ] 错误提示友好

---

#### Task 1.1.4: Scraper 模块重构
**工作量**: 6 小时 | **优先级**: P0

**任务描述**:
- 重构爬虫类结构
- 实现依赖注入
- 优化错误处理
- 提高可测试性

**关键功能**:
- ✅ 搜索漫画（支持分页）
- ✅ 获取漫画详情
- ✅ 分类判断（通过 cate-* 类名）
- ✅ 验证码检测
- ✅ 请求间隔控制

**验收标准**:
- [ ] 支持依赖注入
- [ ] 错误处理完善
- [ ] 日志记录完整
- [ ] 可独立测试

---

#### Task 1.1.5: Downloader 模块重构
**工作量**: 6 小时 | **优先级**: P0

**任务描述**:
- 重构下载类结构
- 实现并发控制（信号量）
- 支持进度追踪
- 实现智能重试

**关键功能**:
- ✅ 并发下载（可配置）
- ✅ 进度事件通知
- ✅ 智能重试（指数退避）
- ✅ 取消下载

**验收标准**:
- [ ] 支持并发控制
- [ ] 支持取消下载
- [ ] 错误处理完善
- [ ] 进度可追踪

---

#### Task 1.1.6: Scanner & Comparer 重构
**工作量**: 5 小时 | **优先级**: P0

**Scanner 功能**:
- ✅ 扫描本地漫画目录
- ✅ 递归扫描（可配置）
- ✅ 文件过滤

**Comparer 功能**:
- ✅ 对比网站和本地漫画
- ✅ AI 智能匹配
- ✅ 并行对比优化

**验收标准**:
- [ ] Scanner 正确扫描本地漫画
- [ ] Comparer 正确对比
- [ ] AI 匹配准确率 > 85%

---

### 1.2 UI 组件化基础

#### Task 1.2.1: 创建 StatCard 组件
**工作量**: 2 小时 | **优先级**: P1

**描述**:
- 创建 `src/ui/components/StatCard.vue`
- 支持三种变体：default、to-download、already-have

**验收标准**:
- [ ] 组件正确接收 Props 并渲染
- [ ] 三种 variant 样式正确显示

---

#### Task 1.2.2: 创建 QueueItem 组件
**工作量**: 2 小时 | **优先级**: P1

**描述**:
- 创建 `src/ui/components/QueueItem.vue`
- 支持显示漫画信息和删除操作

**验收标准**:
- [ ] 队列项渲染正确
- [ ] 删除按钮工作正常

---

#### Task 1.2.3: 创建 DownloadProgress 组件
**工作量**: 2 小时 | **优先级**: P1

**描述**:
- 创建 `src/ui/components/DownloadProgress.vue`
- 显示进度条、速度、剩余时间
- 支持多种状态

**验收标准**:
- [ ] 进度条显示正确
- [ ] 状态切换正常

---

#### Task 1.2.4: 拆分页面组件
**工作量**: 8 小时 | **优先级**: P0

**任务清单**:
- [ ] 拆分 CompareView 组件
- [ ] 拆分 DownloadView 组件
- [ ] 拆分 ConfigView 组件
- [ ] 简化 App.vue（目标：< 300 行）

**验收标准**:
- [ ] 所有页面组件独立
- [ ] 可复用组件正常工作
- [ ] App.vue 代码行数 < 300 行
- [ ] 无功能回归

---

### Phase 1 验收标准

#### 代码质量
- [ ] 所有核心模块使用统一类型系统
- [ ] 配置管理统一
- [ ] 错误处理统一
- [ ] 日志记录完整

#### 架构改进
- [ ] 支持依赖注入
- [ ] 模块间解耦
- [ ] 可独立测试

#### UI 组件
- [ ] 所有页面组件独立
- [ ] 可复用组件正常工作
- [ ] App.vue < 300 行

---

## Phase 2: 搜索功能完善

**时间**: Week 3  
**优先级**: P0  
**目标**: 优化搜索功能，统一 CLI 和 UI 的搜索体验

### 2.1 搜索优化任务

#### Task 2.1: 搜索功能优化
**工作量**: 1 小时 ⬇️（原 2h，删除搜索历史）

**功能**:
- ✅ 优化搜索流程
- ✅ 改进错误处理

**验收标准**:
- [ ] 搜索流程优化完成
- [ ] 错误处理改进完成

---

#### Task 2.2: CLI 搜索优化
**工作量**: 1.5 小时 ⬇️（原 2h，删除 --history）

**新增参数**:
```bash
wnacg-dl search TYPE90
  --json        # JSON 输出
```

**验收标准**:
- [ ] 所有参数正常工作
- [ ] 输出格式正确

---

#### Task 2.3: UI 搜索优化
**工作量**: 2 小时 ⬇️（原 3h，删除搜索历史）

**功能**:
- ✅ 快捷键支持（Enter 搜索）
- ✅ 搜索框优化

**验收标准**:
- [ ] UI 交互流畅
- [ ] 错误提示友好

---

#### Task 2.4: 请求间隔配置
**工作量**: 1 小时

**功能**:
- ✅ 配置项：requestDelay（默认 1000ms）
- ✅ CLI 参数：--delay <ms>
- ✅ UI 配置页面：请求间隔设置
- ✅ 爬虫模块使用配置的间隔

**验收标准**:
- [ ] 配置可保存和读取
- [ ] 爬虫模块使用配置的间隔
- [ ] 默认值 1000ms

---

#### Task 2.5: 搜索结果管理模块
**工作量**: 3 小时 | **优先级**: P0

**功能**:
- ✅ 创建 SearchManager 类（放在 core/）
- ✅ 扫描 cache/ 目录（扁平存储）
- ✅ 解析文件元数据（时间、大小、漫画数量）
- ✅ 提供列表接口（支持过滤、排序）
- ✅ 保存/删除搜索结果
- ✅ 最小依赖设计（只依赖目录路径）

**验收标准**:
- [ ] 正确扫描所有搜索结果文件
- [ ] 支持按时间排序（最新在上）
- [ ] 支持关键字过滤
- [ ] 文件管理规则正确（同关键字只保留一个）

---

#### Task 2.6: 搜索结果列表组件
**工作量**: 4 小时 | **优先级**: P0

**功能**:
- ✅ 创建 SearchResultList 组件（页面级，不拆分）
- ✅ 显示搜索结果列表（网格/列表）
- ✅ 显示元数据（时间、大小、数量）
- ✅ 支持关键字过滤
- ✅ 单选框选择
- ✅ 点击开始对比

**验收标准**:
- [ ] 列表显示正确
- [ ] 过滤功能正常
- [ ] 选择功能正常
- [ ] 对比按钮工作正常

---

#### Task 2.7: 搜索结果预览组件
**工作量**: 4 小时 | **优先级**: P0

**功能**:
- ✅ 创建 SearchPreview 组件（页面级，不拆分）
- ✅ 网格布局显示漫画（封面、标题、作者、分类、页数）
- ✅ 显示统计信息（总页数、总漫画数、去重后数量、耗时）
- ✅ 操作按钮（重新搜索、开始对比、下载选中）
- ✅ 覆盖确认弹窗（相同关键字，显示 Loading，失败可重试）

**验收标准**:
- [ ] 预览显示正确
- [ ] 操作按钮正常
- [ ] 覆盖确认正常
- [ ] 滚动列表流畅

---

#### Task 2.8: CLI 搜索优化
**工作量**: 2 小时 | **优先级**: P1

**功能**:
- ✅ 新增 --list 参数（显示所有搜索结果）
- ✅ 交互选择搜索结果
- ✅ 覆盖确认提示
- ✅ 错误提示优化

**验收标准**:
- [ ] --list 参数正常
- [ ] 交互选择正常
- [ ] 错误提示友好
- [ ] 输出格式清晰

---

### Phase 2 验收标准

#### 功能完整性
- [ ] CLI 和 UI 搜索结果一致
- [ ] 搜索结果列表功能正常
- [ ] 搜索结果预览功能正常
- [ ] 覆盖确认机制正常
- [ ] CLI --list 参数正常

#### 性能
- [ ] 搜索结果列表加载 < 100ms
- [ ] 预览页面渲染 < 200ms

#### 用户体验
- [ ] 列表滚动流畅
- [ ] 过滤响应及时
- [ ] 错误提示友好
- [ ] 快捷键支持（Ctrl+1~4）

---

## Phase 3: 对比功能完善

**时间**: Week 4-5  
**优先级**: P0  
**目标**: 优化对比功能，提高 AI 匹配准确率

### 3.1 AI 匹配优化

#### Task 3.1: AI 匹配器优化
**工作量**: 6 小时

**优化方案**:
```typescript
export class AIMatcher {
  async match(title1: string, title2: string): Promise<number> {
    // 多种匹配算法
    const scores = [
      this.exactMatch(title1, title2),           // 精确匹配
      this.levenshteinMatch(title1, title2),     // 编辑距离
      this.tokenMatch(title1, title2),           // 词元匹配
      await this.semanticMatch(title1, title2), // 语义匹配（AI）
    ];
    
    return Math.max(...scores);
  }

  private normalize(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .pipe(convertToSimplified)  // 繁简转换
      .replace(/[^\w\s\u4e00-\u9fa5]/g, '')  // 移除特殊符号
      .replace(/\s+/g, ' ');  // 标准化空格
  }
}
```

**验收标准**:
- [ ] 标准命名匹配率 > 95%
- [ ] 特殊命名匹配率 > 85%
- [ ] 总体准确率 > 90%

---

#### Task 3.2: 对比流程优化
**工作量**: 4 小时

**优化**:
- ✅ 并行对比（Promise.all）
- ✅ 缓存匹配结果
- ✅ 增量对比

**验收标准**:
- [ ] 对比 100 部漫画 < 10 秒
- [ ] 缓存命中率 > 80%

---

#### Task 3.3: CLI 对比优化
**工作量**: 3 小时

**新增参数**:
```bash
wnacg-dl compare TYPE90 -s /comics
  -t, --threshold <number>  # 匹配阈值（默认 0.8）
  --ai                      # 使用 AI 匹配
  -j, --json                # JSON 输出
```

**验收标准**:
- [ ] 所有参数正常工作
- [ ] 输出格式清晰

---

### Phase 3 验收标准

#### 匹配准确率
- [ ] 标准命名：> 95%
- [ ] 特殊命名：> 85%
- [ ] 总体准确率：> 90%

#### 性能
- [ ] 对比 100 部漫画 < 10 秒
- [ ] 缓存命中率 > 80%

---

## Phase 4: 下载功能完善

**时间**: Week 6-7  
**优先级**: P0  
**目标**: 优化下载功能，提高下载速度和稳定性

### 4.1 下载优化任务

#### Task 4.1: 下载进度追踪
**工作量**: 4 小时

**功能**:
```typescript
export interface DownloadProgress {
  aid: string;
  total: number;
  downloaded: number;
  speed: number; // 页/秒
  status: 'pending' | 'fetching' | 'downloading' | 'completed' | 'failed';
}

// 事件监听
downloader.onProgress(aid, (progress) => {
  // 实时更新 UI
  updateUI(progress);
});
```

**验收标准**:
- [ ] 进度实时更新
- [ ] 速度计算准确
- [ ] 状态显示正确

---

#### Task 4.2: 智能重试机制
**工作量**: 3 小时

**策略**:
- ✅ 指数退避（1s, 2s, 4s, 8s...）
- ✅ 最大重试 3 次
- ✅ 只重试可恢复错误

**验收标准**:
- [ ] 失败重试成功率 > 80%
- [ ] 重试间隔合理

---

#### Task 4.3: CLI 下载优化
**工作量**: 3 小时

**进度条显示**:
```
[████████████░░░░░░░░] 60% | 12/20 | 2.5 页/秒
```

**验收标准**:
- [ ] 进度条显示正常
- [ ] 错误提示友好

---

### Phase 4 验收标准

#### 下载性能
- [ ] 单部漫画下载速度提升 30%
- [ ] 并发下载稳定运行
- [ ] 失败重试成功率 > 80%

#### 用户体验
- [ ] 进度显示详细
- [ ] 错误提示友好
- [ ] 支持取消下载

---

## Phase 5: 配置管理与体验优化

**时间**: Week 8  
**优先级**: P1  
**目标**: 统一配置管理，完善日志系统

### 5.1 配置管理优化

#### Task 5.1: 配置导入导出
**工作量**: 3 小时

**功能**:
```typescript
// 导出配置
configManager.exportToFile('./config.json');

// 导入配置
configManager.importFromFile('./config.json');
```

**验收标准**:
- [ ] 支持导入导出
- [ ] 配置验证正常

---

#### Task 5.2: 日志持久化
**工作量**: 3 小时

**功能**:
- ✅ 集成 winston 日志库
- ✅ 日志级别（info, warn, error）
- ✅ 日志轮转（每天一个文件）
- ✅ 日志文件存储（logs/ 目录）

**验收标准**:
- [ ] 日志持久化到文件
- [ ] 支持日志级别
- [ ] 日志轮转正常

---

#### Task 5.3: 配置项完善
**工作量**: 2 小时

**功能**:
- ✅ 新增配置项：downloadRetryTimes（默认 3）
- ✅ 新增配置项：downloadRetryDelay（默认 30 秒）
- ✅ 新增配置项：aiModelType（local/remote）
- ✅ 新增配置项：aiModelApiUrl
- ✅ 新增配置项：matchThreshold（默认 0.8）
- ✅ 配置验证和默认值设置

**验收标准**:
- [ ] 所有 11 个配置项完整
- [ ] 配置验证正常
- [ ] 默认值正确

---

### Phase 5 验收标准

#### 配置管理
- [ ] 支持导入导出
- [ ] 配置验证正常
- [ ] 配置变更通知

#### 日志系统
- [ ] 日志持久化正常
- [ ] 日志级别工作正常
- [ ] 日志轮转正常

---

## 集成与测试

**时间**: Week 9  
**优先级**: P0  

### 集成测试

#### CLI 工作流测试
```bash
# 搜索
wnacg-dl search TYPE90

# 对比
wnacg-dl compare TYPE90 -s /comics

# 下载
wnacg-dl download TYPE90 -o /downloads
```

#### UI 工作流测试
```
1. 打开应用
2. 搜索漫画
3. 添加到下载队列
4. 开始下载
5. 验证下载结果
```

### 功能回归测试

**测试清单**:
- [ ] 搜索功能完整测试
- [ ] 对比功能完整测试
- [ ] 下载功能完整测试
- [ ] 配置功能完整测试

### 代码质量检查

- [ ] `npm run lint` 无错误
- [ ] `npm run build` 成功
- [ ] 无 TypeScript 类型错误

---

## 风险管理

### 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| Cloudflare 验证码 | 高 | 高 | 使用非无头模式，支持手动完成 |
| AI 匹配准确率 | 中 | 中 | 使用多种匹配算法，支持人工确认 |
| 下载失败 | 中 | 中 | 重试机制，断点续传 |
| 并发控制失效 | 高 | 低 | 信号量严格控制，单元测试验证 |

### 进度风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 需求变更 | 中 | 中 | 保持文档更新，及时沟通 |
| 技术难点 | 中 | 中 | 预留缓冲时间（Week 9） |
| 功能回归 | 低 | 中 | 完整测试，验收清单 |

---

## 开发路线图

```
Week 1-2: Phase 1 - 核心代码重构与基础功能
    ↓ 建立稳定的核心层
Week 3:   Phase 2 - 搜索功能完善
    ↓ 统一搜索体验
Week 4-5: Phase 3 - 对比功能完善
    ↓ AI 匹配 > 90%
Week 6-7: Phase 4 - 下载功能完善
    ↓ 快速稳定下载
Week 8:   Phase 5 - 配置管理与体验优化
    ↓ 统一配置管理
Week 9:   集成与测试
    ↓ 完整验证
```

---

## 预计工作量

| 阶段 | 任务数 | 预计工时 | 难度 |
|------|--------|----------|------|
| Phase 1: 核心重构 | 10 | 40 小时 | 中等 |
| Phase 2: 搜索优化 | 8 | 18.5 小时 ⬇️ | 中等 |
| Phase 3: 对比优化 | 3 | 13 小时 | 中等 |
| Phase 4: 下载优化 | 3 | 10 小时 | 中等 |
| Phase 5: 配置优化 | 3 | 8 小时 | 简单 |
| 集成测试 | - | 8 小时 | 中等 |
| **总计** | **27** | **97.5 小时** ⬇️ | **中等** |

**Phase 2 任务明细**：
```
Task 2.1: 搜索功能优化        (1h)   ⬇️ 删除搜索历史
Task 2.2: CLI 搜索优化         (1.5h) ⬇️ 删除 --history
Task 2.3: UI 搜索优化          (2h)   ⬇️ 删除搜索历史
Task 2.4: 请求间隔配置        (1h)
Task 2.5: 搜索结果管理模块    (3h)   ⭐ 新增
Task 2.6: 搜索结果列表组件    (4h)   ⭐ 新增
Task 2.7: 搜索结果预览组件    (4h)   ⭐ 新增
Task 2.8: CLI 搜索优化        (2h)   ⭐ 新增

总计：18.5 小时（原 21 小时 → 现 18.5 小时）
```

---

## 验收标准总结

### 功能性验收

**AC-1**: 搜索功能
- ✅ 搜索功能正常工作
- ✅ CLI 和 UI 结果一致
- ✅ 搜索结果管理正常

**AC-2**: 对比功能
- ✅ AI 匹配准确率 > 90%
- ✅ 对比速度 < 10 秒（100 部）
- ✅ 支持并行对比

**AC-3**: 下载功能
- ✅ 支持并发下载（可配置）
- ✅ 支持断点续传
- ✅ 失败重试成功率 > 80%
- ✅ 实时进度显示

**AC-4**: 配置功能
- ✅ 所有配置项正确
- ✅ 支持导入导出
- ✅ 配置变更通知

### 代码质量验收

- ✅ `npm run lint` 无错误
- ✅ `npm run build` 成功
- ✅ 无 TypeScript 类型错误
- ✅ 核心模块可独立测试
- ✅ 单元测试覆盖率 > 80%

---

## 待确认事项

### 配置文件路径
- **状态**: 待确认
- **说明**: 配置文件在项目文件夹下的具体存储位置

### 第三方网站数据源
- **状态**: 待设计
- **说明**: 第三方网站的数据获取方式、格式、存储等

### AI 模型实现细节
- **状态**: 待设计
- **说明**: 本地模型文件格式、远程 API 接口规范等

---

**文档结束**

**附录**:
- [架构设计文档](./architecture/spec.md)
- [需求规格说明书](./requirements/spec.md)
- [界面设计文档](./ui-design/spec.md)
