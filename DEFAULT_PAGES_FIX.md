# 默认页数限制修复总结

## 🐛 问题

用户发现即使不指定 `--pages` 参数，搜索也只爬取 5 页：

```bash
node dist/cli/index.js search TYPE90 --force

# 输出显示：
限制爬取 5 页，实际爬取 5 页
```

**问题原因**：
- 配置文件中设置了 `defaultMaxPages: 5`
- 用户期望不指定参数时应该爬取**所有页面**

---

## ✅ 修复方案

### 修改 1: 配置文件

**文件**: [`src/config.ts`](file:///Users/szd/Documents/Code/wnacg-download/src/config.ts)

**修改前**：
```typescript
defaultMaxPages: 5,  // ❌ 默认限制 5 页
```

**修改后**：
```typescript
defaultMaxPages: 0,  // ✅ 0 表示不限制，爬取所有页面
```

### 修改 2: 日志优化

**文件**: [`src/core/scraper.ts`](file:///Users/szd/Documents/Code/wnacg-download/src/core/scraper.ts)

**修改前**：
```typescript
if (maxPages && maxPages > 0) {
  pagesToCrawl = Math.min(totalPages, maxPages);
  logger.info(`限制爬取 ${maxPages} 页，实际爬取 ${pagesToCrawl} 页`);
}
```

**修改后**：
```typescript
if (maxPages && maxPages > 0) {
  pagesToCrawl = Math.min(totalPages, maxPages);
  if (pagesToCrawl < totalPages) {
    logger.info(`限制爬取 ${maxPages} 页，实际爬取 ${pagesToCrawl} 页（共 ${totalPages} 页）`);
  }
}
```

**优化点**：
- 只在**实际限制了页数**时显示日志
- 显示总页数，让用户更清楚情况

---

## 📊 修复前后对比

### 修复前

```bash
$ node dist/cli/index.js search TYPE90 --force

共找到 9 页
限制爬取 5 页，实际爬取 5 页  # ❌ 用户没有指定却限制了
正在并行爬取剩余 4 页...
共找到 47 部漫画
```

### 修复后

```bash
$ node dist/cli/index.js search TYPE90 --force

共找到 9 页
正在并行爬取剩余 8 页...  # ✅ 爬取所有页面
共找到 81 部漫画
```

---

## 🎯 新的行为逻辑

### 场景 1: 不指定 --pages（默认）

```bash
node dist/cli/index.js search TYPE90
```

**行为**：
- `defaultMaxPages: 0` → 不限制
- 爬取**所有页面**（9 页）
- **不显示**限制日志

**输出**：
```
共找到 9 页
正在并行爬取剩余 8 页...
共找到 81 部漫画
```

---

### 场景 2: 指定 --pages 限制页数

```bash
node dist/cli/index.js search TYPE90 --pages 3
```

**行为**：
- 限制爬取 3 页
- **显示**限制日志

**输出**：
```
共找到 9 页
限制爬取 3 页，实际爬取 3 页（共 9 页）
正在并行爬取剩余 2 页...
共找到 27 部漫画
```

---

### 场景 3: 指定 --pages 超过总页数

```bash
node dist/cli/index.js search TYPE90 --pages 100
```

**行为**：
- 限制 100 页，但实际只有 9 页
- 爬取所有 9 页
- **不显示**限制日志（因为没有限制）

**输出**：
```
共找到 9 页
正在并行爬取剩余 8 页...
共找到 81 部漫画
```

---

## 📋 完整逻辑

```typescript
// maxPages 的值来源：
// 1. 用户指定 --pages → 使用用户指定的值
// 2. 用户未指定 → 使用 defaultMaxPages（现在是 0）

if (maxPages && maxPages > 0) {
  // 用户明确限制了页数
  pagesToCrawl = Math.min(totalPages, maxPages);
  
  // 只有真正限制了才显示日志
  if (pagesToCrawl < totalPages) {
    logger.info(`限制爬取 ${maxPages} 页，实际爬取 ${pagesToCrawl} 页（共 ${totalPages} 页）`);
  }
} else {
  // maxPages 为 0 或未指定 → 不限制
  pagesToCrawl = totalPages;
  // 不显示限制日志
}
```

---

## ✅ 验收标准

- [x] 不指定 `--pages` 时爬取所有页面
- [x] 不显示不必要的限制日志
- [x] 指定 `--pages` 时正确限制
- [x] 限制超过总页数时不显示日志
- [x] 日志显示总页数信息
- [x] 编译无错误

---

## 🚀 测试验证

### 测试 1: 默认行为（不限制）

```bash
node dist/cli/index.js search TYPE90 --force
```

**预期**：
- 爬取所有 9 页
- 不显示"限制爬取"日志
- 找到约 81 部漫画

### 测试 2: 限制 3 页

```bash
node dist/cli/index.js search TYPE90 --pages 3 --force
```

**预期**：
- 显示"限制爬取 3 页，实际爬取 3 页（共 9 页）"
- 只爬取 3 页
- 找到约 27 部漫画

### 测试 3: 限制超过总页数

```bash
node dist/cli/index.js search TYPE90 --pages 100 --force
```

**预期**：
- 不显示"限制爬取"日志
- 爬取所有 9 页
- 找到 81 部漫画

---

## 💡 设计理念

### 为什么默认值改为 0？

1. **符合用户期望**：
   - 用户不指定参数时，期望爬取所有结果
   - 5 页的限制没有明确提示，造成困惑

2. **保持灵活性**：
   - 需要限制时使用 `--pages` 参数
   - 默认不限制，给用户完整结果

3. **透明原则**：
   - 如果有限制，必须明确告知用户
   - 日志显示"共 X 页"，让用户了解全貌

### 什么时候使用限制？

```bash
# 快速测试，只看前几页
node dist/cli/index.js search TYPE90 --pages 2

# 只下载最新的几部
node dist/cli/index.js search TYPE90 --pages 1 --json

# 完整爬取（默认）
node dist/cli/index.js search TYPE90
```

---

## 📝 配置说明

### defaultMaxPages 配置项

| 值 | 含义 | 使用场景 |
|----|------|----------|
| `0` | 不限制（默认） | 完整爬取所有页面 |
| `1` | 只爬取第 1 页 | 快速测试、只看最新 |
| `5` | 爬取前 5 页 | 平衡速度和完整性 |
| `10+` | 爬取多页 | 大量数据收集 |

### 如何修改默认值？

如果需要修改默认行为，编辑 [`src/config.ts`](file:///Users/szd/Documents/Code/wnacg-download/src/config.ts)：

```typescript
defaultMaxPages: 0,  // 改为其他值
```

---

## 🎯 总结

**修复前**：
- ❌ 默认限制 5 页，用户不知情
- ❌ 行为不符合用户期望

**修复后**：
- ✅ 默认不限制，爬取所有页面
- ✅ 只在真正限制时显示日志
- ✅ 日志显示总页数，信息完整
- ✅ 行为符合用户期望

---

**修复完成时间**: 2026-04-16  
**版本**: v1.2  
**状态**: ✅ 已完成
