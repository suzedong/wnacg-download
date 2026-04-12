# WNACG Downloader - 项目文档索引

**快速导航**：找到你需要的文档

---

## 📁 文档结构

```
.trae/
├── rules/                          # 规则文档（必须遵守 ⚠️）
│   ├── bss-rules.md                # 项目规则
│   └── dev-rules.md                # 开发规范
│
└── specs/                          # 规格文档（AI 开发参考 🤖）
    ├── README.md                   # 📋 本文档（文档索引）
    ├── requirements/
    │   └── spec.md                 # 📝 需求规格说明书
    ├── architecture/
    │   └── spec.md                 # 🏗️ 架构设计文档
    ├── ui-design/
    │   └── spec.md                 # 🎨 界面设计文档
    └── DEVELOPMENT_PLAN.md         # 📅 开发计划
```

---

## 📋 文档分类

| 文档 | 用途 | 核心问题 | 路径 |
|------|------|----------|------|
| **项目规则** | 项目概述 + 功能规则 | 项目是什么 | [`bss-rules.md`](../rules/bss-rules.md) |
| **开发规范** | 技术规范 + 工作流程 | 如何开发 | [`dev-rules.md`](../rules/dev-rules.md) |
| **需求规格** | 功能详细描述 | WHAT | [`requirements/spec.md`](requirements/spec.md) |
| **架构设计** | 技术实现方案 | HOW | [`architecture/spec.md`](architecture/spec.md) |
| **界面设计** | UI 设计稿 | LOOK | [`ui-design/spec.md`](ui-design/spec.md) |
| **开发计划** | 任务清单 + 验收标准 | PLAN | [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) |

---

## 🔗 快速链接

### 核心文档
- [📝 需求规格说明书](requirements/spec.md)
- [🏗️ 架构设计文档](architecture/spec.md)
- [🎨 界面设计文档](ui-design/spec.md)
- [📅 开发计划](DEVELOPMENT_PLAN.md)

### 规则文档
- [⚠️ 项目规则](../rules/bss-rules.md)
- [📖 开发规范](../rules/dev-rules.md)

---

## ❓ 常见问题索引

| 问题 | 答案 |
|------|------|
| 我想了解项目要做什么 | [需求规格说明书](requirements/spec.md) |
| 我想知道技术架构 | [架构设计文档](architecture/spec.md) |
| 我想知道界面设计 | [界面设计文档](ui-design/spec.md) |
| 我想知道具体任务 | [开发计划](DEVELOPMENT_PLAN.md) |
| 我想了解编码规范 | [开发规范](../rules/dev-rules.md) |
| 我想了解功能规则 | [项目规则](../rules/bss-rules.md) |
| 哪些内容是待设计的 | [需求规格 - 第 6 节](requirements/spec.md#6-待设计内容) |
| 双架构设计是什么 | [需求规格 - 第 1.1 节](requirements/spec.md#11-产品形态) |

---

## 📝 文档编写规范

### 文档命名
- **规则文档**：使用 `-rules.md` 后缀
- **规格文档**：使用 `spec.md` 文件名
- **索引文档**：使用 `README.md`

### 文档目录
- **rules/**：强制性规范
- **specs/requirements/**：需求规格
- **specs/architecture/**：架构设计
- **specs/ui-design/**：界面设计
- **specs/** 根目录：开发计划

### 文档格式
- 使用 Markdown 格式
- 使用中文编写
- 包含清晰的标题层级
- 使用表格、图形增强可读性

---

**文档维护**：项目团队  
**最后更新**：2026-04-12  
**文档版本**：v2.0（双架构版本）
