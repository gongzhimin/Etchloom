---
title: 代码与工程编码规范
status: Active
doc-id: RULE-CODING
owner-module: root
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:25:00+08:00
---

# 代码与工程编码规范

## 1. 目的与范围

本规范定义 Etchloom 工程全栈（JavaScript / Node.js / Rust）代码的编写规范、格式要求、命名约定及模块边界。
- **管辖范围**：`src/`、`services/`、`tests/`、`scripts/` 及 `src-tauri/` 的全部源码文件。
- **相邻排他**：代码注释要求归 `standards/COMMENT_RULES.md`；接口对外门面归 `standards/API_RULES.md`；追溯标记归 `standards/TRACEABILITY_RULES.md`。

## 2. 规则正文

### §2.1 文本编码与格式（C1–C3）
- **C1 (编码与换行)**：全库源文件必须严格使用 UTF-8 无 BOM 编码，换行符统一使用 LF（`\n`）。
- **C2 (缩进与排版)**：JavaScript/TypeScript 文件采用 2 空格缩进，禁止使用 Tab；每行长度建议不超过 120 字符。
- **C3 (语言版本与模块系统)**：前端与核心算法采用原生 ECMAScript 2022+ 标准，严禁引入未转译的实验性语法。模块化采用标准 ESM（`import` / `export`），测试与构建脚本采用 Node.js CJS（`.cjs`）或 ESM。

### §2.2 命名风格与语言约束（C4–C6）
- **C4 (标识符命名)**：
  - 类名与构造函数使用大驼峰（`PascalCase`），如 `VirtualPlateEngine`、`PipelineRunner`；
  - 函数、方法与普通变量使用小驼峰（`camelCase`），如 `simulateAcidBite`、`currentPlateStage`；
  - 常量使用大写下划线（`UPPER_SNAKE_CASE`），如 `MAX_DIM`、`DEFAULT_ENDPOINT`；
  - 文件名与目录名全小写中划线（`kebab-case`），如 `virtual-plate-engine.js`。
- **C5 (多语言与零 Emoji 铁律)**：源码变量、函数名及错误标识严禁包含 Emoji；用户可见文案必须经由 `i18nManager.t(...)` 解析，禁止在逻辑代码中硬编码用户语言字符串。
- **C6 (连续内存与数值安全)**：高性能物理场与图像网格必须优先采用 `Float32Array` / `Uint8Array` 连续平铺内存；数值计算中除法与根号操作必须通过 `Number.isFinite(...)` 保护，严禁 `NaN` / `Infinity` 外溢。

### §2.3 架构隔离与提交门禁（C7–C9）
- **C7 (纯领域计算零 DOM 隔离)**：`src/core/` 严禁出现任何 `window`、`document`、`HTMLElement` 或 DOM 选择器。核心算法必须保持为无状态/纯数据结构运算，确保无头（Headless）测试与多线程环境零异常。
- **C8 (单入口与依赖方向)**：模块间交互只能依赖目标模块公开的单一入口函数或对象，禁止跨层私自 `import` 另一模块内部未导出的私有实现文件。
- **C9 (提交前静态自检)**：代码提交前必须执行 `npm test`，全量测试必须 100% 通过（Pass Rate = 100%）。

## 3. 与其他规范的关系

- 代码注释的书写格式与禁止项以 `standards/COMMENT_RULES.md` 为准；
- 接口签名、错误表达与命名范式以 `standards/API_RULES.md` 为准；
- 变更提交前的门禁检查流程以 `standards/CHANGE_VALIDATION.md` 为准；
- 冲突时以 `standards/DOCUMENT_RULES.md` 为准。
