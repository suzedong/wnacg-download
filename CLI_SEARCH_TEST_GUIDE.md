# CLI 搜索模块测试指南

## 📋 已实现功能清单

### ✅ 核心功能（100% 完成）

| 功能 | 参数 | 说明 | 状态 |
|------|------|------|------|
| **基本搜索** | `search <关键字>` | 搜索漫画 | ✅ |
| **页数限制** | `-p, --pages <number>` | 限制爬取页数 | ✅ |
| **代理设置** | `-P, --proxy <url>` | 指定代理地址 | ✅ |
| **包含所有** | `-a, --all` | 包含非汉化版 | ✅ |
| **JSON 输出** | `-j, --json` | JSON 格式输出 | ✅ |
| **强制刷新** | `-f, --force` | 不使用缓存 | ✅ |
| **请求间隔** | `-d, --delay <ms>` | 设置请求间隔 | ✅ |
| **结果列表** | `-l, --list` | 显示所有搜索结果 | ✅ |

### 🎯 优化功能

| 优化项 | 说明 | 状态 |
|--------|------|------|
| **耗时显示** | 显示搜索耗时（秒） | ✅ |
| **错误处理** | 友好的错误提示 | ✅ |
| **JSON 格式** | 标准化输出（含元数据） | ✅ |
| **视觉优化** | 清晰的输出格式 | ✅ |
| **文件路径** | 自动清理非法字符 | ✅ |

---

## 🧪 测试用例

### 前置准备

```bash
# 1. 确保项目已编译
npm run build

# 2. 确保 CLI 可用
node dist/cli/index.js --help

# 3. 查看搜索命令帮助
node dist/cli/index.js search --help
```

---

### 测试用例 1: 基本搜索

**命令**:
```bash
node dist/cli/index.js search TYPE90
```

**预期输出**:
```
⠋ 初始化中...
✔ 找到 50 部漫画（耗时 3.2 秒）

✓ 漫画信息已保存到：/path/to/wnacg-download/cache/search_TYPE90.json

搜索结果:
─────────────────────────────────────────────────────────────────────────────────
 1. 漫画标题 1
    單行本／漢化 | 作者：TYPE90
─────────────────────────────────────────────────────────────────────────────────
 2. 漫画标题 2
    雜誌&短篇／漢化 | 作者：TYPE90
─────────────────────────────────────────────────────────────────────────────────

✓ 总计：50 部漫画
```

**验证点**:
- [ ] 显示搜索进度
- [ ] 显示耗时（秒）
- [ ] 显示漫画列表
- [ ] 显示分类和作者
- [ ] 保存缓存文件
- [ ] 显示缓存路径

---

### 测试用例 2: 限制页数

**命令**:
```bash
node dist/cli/index.js search TYPE90 --pages 2
```

**预期输出**:
```
✔ 找到 20 部漫画（耗时 1.5 秒）
```

**验证点**:
- [ ] 只爬取指定页数
- [ ] 漫画数量正确
- [ ] 耗时合理

---

### 测试用例 3: JSON 输出

**命令**:
```bash
node dist/cli/index.js search TYPE90 --json
```

**预期输出**:
```json
{
  "success": true,
  "keyword": "TYPE90",
  "searchTime": "2026-04-16T10:30:00.000Z",
  "totalComics": 50,
  "comics": [
    {
      "aid": "123456",
      "title": "漫画标题",
      "coverUrl": "https://...",
      "category": "單行本／漢化",
      "author": "TYPE90",
      "pages": 20
    }
  ]
}
```

**验证点**:
- [ ] JSON 格式正确
- [ ] 包含 success 字段
- [ ] 包含 keyword 字段
- [ ] 包含 searchTime 字段
- [ ] 包含 totalComics 字段
- [ ] comics 数组完整

**脚本化使用示例**:
```bash
# 提取漫画数量
node dist/cli/index.js search TYPE90 --json | jq '.totalComics'

# 提取第一部漫画标题
node dist/cli/index.js search TYPE90 --json | jq '.comics[0].title'

# 保存为文件
node dist/cli/index.js search TYPE90 --json > search_result.json
```

---

### 测试用例 4: 显示搜索结果列表

**命令**:
```bash
node dist/cli/index.js search --list
```

**预期输出**:
```
搜索结果列表:
────────────────────────────────────────────────────────────────────────────────────────
 1. TYPE90
    搜索时间：2026-04-16 10:30:00
    漫画数量：50 部  |  文件大小：1024.5 KB
────────────────────────────────────────────────────────────────────────────────────────
 2. 关键字 2
    搜索时间：2026-04-16 09:15:30
    漫画数量：30 部  |  文件大小：512.3 KB
────────────────────────────────────────────────────────────────────────────────────────

✓ 总计：2 个搜索结果

提示：
  - 使用 wnacg-dl search <关键字> 查看具体搜索结果
  - 使用 wnacg-dl compare <关键字> 对比本地漫画
  - 使用 wnacg-dl download <关键字> 下载漫画
```

**验证点**:
- [ ] 显示所有搜索结果
- [ ] 显示搜索时间
- [ ] 显示漫画数量
- [ ] 显示文件大小
- [ ] 按时间排序（最新在上）
- [ ] 显示使用提示

---

### 测试用例 5: 强制刷新缓存

**命令**:
```bash
# 第一次搜索
node dist/cli/index.js search TYPE90

# 第二次搜索（不指定 --force）
node dist/cli/index.js search TYPE90

# 第三次搜索（指定 --force）
node dist/cli/index.js search TYPE90 --force
```

**预期输出**:

**第二次搜索**:
```
⚠ 关键字 "TYPE90" 的搜索结果已存在。
使用 --force 选项强制覆盖缓存。
```

**第三次搜索**:
```
✔ 找到 50 部漫画（耗时 3.2 秒）
✓ 漫画信息已保存到：...
```

**验证点**:
- [ ] 第二次提示缓存已存在
- [ ] --force 强制刷新
- [ ] 缓存文件被更新

---

### 测试用例 6: 请求间隔配置

**命令**:
```bash
# 使用默认间隔（1000ms）
node dist/cli/index.js search TYPE90

# 使用自定义间隔（2000ms）
node dist/cli/index.js search TYPE90 --delay 2000

# 使用更快间隔（500ms）
node dist/cli/index.js search TYPE90 --delay 500
```

**验证点**:
- [ ] 默认间隔 1000ms
- [ ] --delay 参数覆盖配置
- [ ] 间隔影响爬取速度
- [ ] 间隔太小可能被反爬

---

### 测试用例 7: 包含所有漫画

**命令**:
```bash
# 只搜索汉化版（默认）
node dist/cli/index.js search TYPE90

# 包含所有漫画
node dist/cli/index.js search TYPE90 --all
```

**预期输出**:

**不使用 --all**:
```
✔ 找到 50 部漫画（汉化版）
```

**使用 --all**:
```
✔ 找到 80 部漫画（包含非汉化版）
```

**验证点**:
- [ ] 默认只搜索汉化版
- [ ] --all 包含所有版本
- [ ] 漫画数量更多

---

### 测试用例 8: 使用代理

**命令**:
```bash
# 使用配置文件中的代理
node dist/cli/index.js search TYPE90

# 使用命令行指定的代理
node dist/cli/index.js search TYPE90 --proxy http://127.0.0.1:7890
```

**验证点**:
- [ ] 默认使用配置代理
- [ ] --proxy 覆盖配置
- [ ] 代理地址正确

---

### 测试用例 9: 错误处理

**命令**:
```bash
# 网络错误（断开网络）
node dist/cli/index.js search TYPE90

# 无效代理
node dist/cli/index.js search TYPE90 --proxy http://invalid:7890
```

**预期输出**:
```
✗ 搜索失败
错误：连接超时
提示：检查网络连接或稍后重试
```

**验证点**:
- [ ] 错误信息友好
- [ ] 提供解决建议
- [ ] 程序正常退出（exit code 1）

---

### 测试用例 10: 空结果

**命令**:
```bash
node dist/cli/index.js search 不存在的作者
```

**预期输出**:
```
✔ 找到 0 部漫画（耗时 1.2 秒）
未找到漫画
```

**验证点**:
- [ ] 显示 0 部漫画
- [ ] 提示未找到
- [ ] 不保存空结果

---

## 📊 性能测试

### 测试不同页数的性能

```bash
# 1 页
time node dist/cli/index.js search TYPE90 --pages 1

# 5 页
time node dist/cli/index.js search TYPE90 --pages 5

# 10 页
time node dist/cli/index.js search TYPE90 --pages 10
```

**预期性能**:
- 1 页：~1-2 秒
- 5 页：~5-8 秒
- 10 页：~10-15 秒

**验证点**:
- [ ] 耗时与页数成正比
- [ ] 并行爬取效率高
- [ ] 内存占用合理

---

## 🔍 缓存文件验证

### 检查缓存文件

```bash
# 查看缓存目录
ls -lh cache/

# 查看缓存文件内容
cat cache/search_TYPE90.json | jq

# 查看文件大小
du -sh cache/search_TYPE90.json
```

**缓存文件结构**:
```json
{
  "keyword": "TYPE90",
  "searchTime": "2026-04-16T10:30:00.000Z",
  "comics": [...],
  "totalPages": 1,
  "totalComics": 50
}
```

**验证点**:
- [ ] 文件存在
- [ ] JSON 格式正确
- [ ] 包含所有字段
- [ ] 文件大小合理

---

## ✅ 完整测试流程

### 快速测试（5 分钟）

```bash
# 1. 基本搜索
node dist/cli/index.js search TYPE90

# 2. 查看列表
node dist/cli/index.js search --list

# 3. JSON 输出
node dist/cli/index.js search TYPE90 --json | head -20

# 4. 强制刷新
node dist/cli/index.js search TYPE90 --force
```

### 完整测试（20 分钟）

```bash
# 1. 基本功能测试
node dist/cli/index.js search TYPE90
node dist/cli/index.js search TYPE90 --pages 2
node dist/cli/index.js search TYPE90 --json > test.json
node dist/cli/index.js search --list

# 2. 缓存测试
node dist/cli/index.js search TYPE90           # 第一次
node dist/cli/index.js search TYPE90           # 第二次（提示缓存）
node dist/cli/index.js search TYPE90 --force   # 强制刷新

# 3. 参数测试
node dist/cli/index.js search TYPE90 --delay 2000
node dist/cli/index.js search TYPE90 --all
node dist/cli/index.js search TYPE90 --proxy http://127.0.0.1:7890

# 4. 错误处理
node dist/cli/index.js search 不存在的作者

# 5. 性能测试
time node dist/cli/index.js search TYPE90 --pages 5

# 6. 缓存文件验证
ls -lh cache/
cat cache/search_TYPE90.json | jq '.totalComics'
```

---

## 🐛 已知问题和注意事项

### 注意事项

1. **网络要求**: 需要访问 wnacg.com
2. **Cloudflare 验证码**: 可能需要手动完成
3. **代理配置**: 建议配置代理以提高稳定性
4. **请求间隔**: 不建议设置太小（<500ms）

### 常见问题

**Q: 搜索失败，提示连接超时**
```bash
# 解决方案 1: 使用代理
node dist/cli/index.js search TYPE90 --proxy http://127.0.0.1:7890

# 解决方案 2: 检查网络
ping www.wnacg.com
```

**Q: 提示缓存已存在**
```bash
# 解决方案 1: 使用 --force
node dist/cli/index.js search TYPE90 --force

# 解决方案 2: 删除缓存文件
rm cache/search_TYPE90.json
```

**Q: JSON 输出格式不正确**
```bash
# 确保使用 --json 参数
node dist/cli/index.js search TYPE90 --json

# 使用 jq 格式化
node dist/cli/index.js search TYPE90 --json | jq
```

---

## 📝 测试报告模板

### 测试执行记录

| 测试用例 | 执行时间 | 结果 | 备注 |
|---------|---------|------|------|
| 基本搜索 | | ✅/❌ | |
| 限制页数 | | ✅/❌ | |
| JSON 输出 | | ✅/❌ | |
| 结果列表 | | ✅/❌ | |
| 强制刷新 | | ✅/❌ | |
| 请求间隔 | | ✅/❌ | |
| 包含所有 | | ✅/❌ | |
| 使用代理 | | ✅/❌ | |
| 错误处理 | | ✅/❌ | |
| 空结果 | | ✅/❌ | |

### 性能测试结果

| 页数 | 耗时 | 漫画数量 | 内存占用 |
|------|------|----------|----------|
| 1 页 | | | |
| 5 页 | | | |
| 10 页 | | | |

### 问题汇总

| 问题描述 | 严重程度 | 解决方案 | 状态 |
|---------|---------|---------|------|
| | 高/中/低 | | 已解决/待解决 |

---

## 🎯 测试完成标准

- [ ] 所有测试用例通过
- [ ] 性能符合预期
- [ ] 错误处理正常
- [ ] 缓存功能正常
- [ ] JSON 输出正确
- [ ] 文档完整

---

**最后更新**: 2026-04-16  
**版本**: v1.0
