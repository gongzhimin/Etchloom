---
title: 代码注释职责与编写规范
status: Active
doc-id: RULE-COMMENT
owner-module: root
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:25:00+08:00
---

# 代码注释职责与编写规范

## 1. 目的与范围

本规范定义 Etchloom 代码注释的核心职责、JSDoc 契约格式、关键区块解释规范及禁止项。
- **管辖范围**：全栈 JavaScript、Node.js 测试代码与脚本注释。
- **相邻排他**：代码排版风格归 `standards/CODING_RULES.md`；追溯 ID 归 `standards/TRACEABILITY_RULES.md`。

## 2. 规则正文

### §2.1 注释原则与文件头要求（K1–K3）
- **K1 (意图优先原则)**：注释必须专注于解释“为什么（Why）”，而非复述代码“做了什么（What）”。
- **K2 (时效同步原则)**：代码修改时注释必须同次提交修改，禁止存在与代码行为相悖的过时注释。
- **K3 (文件头责任区)**：每个源码文件顶部必须包含文件职责简述、核心维护边界与上级架构引用锚点：
  ```javascript
  /**
   * Virtual Plate Studio Controller (虚拟铜版画与酸液物理工坊控制器)
   * 维护铜版连续内存物理场，驱动 4 种正交刻线工具与 PDE 酸液潜蚀解算。
   * @ref docs/design/ARCHITECTURE.md
   */
  ```

### §2.2 JSDoc 强契约与算法解释（K4–K6）
- **K4 (公共接口 JSDoc 契约)**：所有导出函数及公共类必须具备 JSDoc：
  - `@param`：包含类型、含义、物理量纲（如 `秒`、`μm`、`mm`）；
  - `@returns`：说明返回结构、空值语义；
  - `@throws`：抛出错误条件。
- **K5 (数学与离散算法标注)**：涉及矩阵步进、流线积分、位运算哈希时，必须注明数学公式与设计依据：
  ```javascript
  // DJB2 Hash: hash = ((hash << 5) + hash) ^ char; 保证增量拓扑哈希灵敏度
  ```
- **K6 (物理守恒与防御性断言)**：必须在非直观代码处标注不变量守护：
  ```javascript
  // 防蚀漆 (blocked) 阻断守恒：覆盖防蚀漆区域在强酸中刻深增量恒等于 0
  if (blocked[i] > 0) continue;
  ```

### §2.3 无效注释禁止项（K7–K8）
- **K7 (禁止复读废话)**：严禁编写单纯将变量或函数名用自然语言翻译一遍的无效废话注释（如 `// set running to false`）。
- **K8 (禁止大段死代码与裸 TODO)**：废弃逻辑必须直接删除由 Git 维护历史，禁止大段注释遗留；严禁裸 `// TODO`，必须注明动机与关联需求 ID。

## 3. 与其他规范的关系

- 代码文本格式与语言风格以 `standards/CODING_RULES.md` 为准；
- 需求、设计与测试追溯关联格式以 `standards/TRACEABILITY_RULES.md` 为准；
- 冲突时以 `standards/DOCUMENT_RULES.md` 为准。
