---
title: 领域核心模块文档导航
status: Active
doc-id: README-CORE
owner-module: core
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:25:00+08:00
---

# 领域核心模块文档导航 (core)

## 文档导航

| 文档类型 | 链接 | 状态 | 一句话用途 |
| :--- | :--- | :--- | :--- |
| **模块架构** | [design/ARCHITECTURE.md](design/ARCHITECTURE.md) | Active | 内部结构、5 阶段离散管线组件图、文件结构树与纯无头实现约束。 |
| **对外接口** | [design/INTERFACES.md](design/INTERFACES.md) | Active | 对外单一入口函数（PipelineRunner.run、VirtualPlateEngine）强契约。 |
| **核心算法** | [design/ALGORITHM.md](design/ALGORITHM.md) | Active | 5 阶段管线、Jobard-Lefer 流线积分、2D PDE 酸液侧蚀模拟物理方程。 |
| **模块测试** | [verification/TESTING.md](verification/TESTING.md) | Active | 单元测试设计、物理守恒断言、数值稳定性与单测矩阵。 |
| **局部决策** | [decisions/DECISIONS.md](decisions/DECISIONS.md) | Active | 纯领域计算零 DOM 隔离、TypedArray 连续内存布局等模块局部决策。 |

### 条件必填文档豁免声明
- **`design/WORKFLOW.md`**：未触发（本模块内部由纯函数与无状态算子驱动，端到端异步协作与 4 态酸蚀状态机归属根级 `docs/design/WORKFLOW.md` 与 UI 控制器）。
- **`design/DATA_DICTIONARY.md`**：未触发（本模块产出的公共实体如 `PlateBufferLayout`、`VectorStrokeSet` 归属根级 `docs/design/DATA_DICTIONARY.md` 统一登记）。
- **`design/UI_DESIGN.md`**：未触发（本模块为纯领域计算核心，无任何界面组件）。

## 上级依据

- **承接系统需求**：[`docs/requirements/REQUIREMENTS.md#51-领域核心模块-core`](../../../docs/requirements/REQUIREMENTS.md#51-领域核心模块-core)（能力需求：`REQ-CORE-001`、`REQ-CORE-002`、`REQ-CORE-003`；验收标准：`AC-CORE-001`、`AC-CORE-002`）；
- **适用工程规范**：
  - [`docs/standards/CODING_RULES.md`](../../../docs/standards/CODING_RULES.md)（特别适用 C7：纯领域计算零 DOM 隔离）；
  - [`docs/standards/API_RULES.md`](../../../docs/standards/API_RULES.md)（单一入口门面原则）；
  - [`docs/standards/TEST_RULES.md`](../../../docs/standards/TEST_RULES.md)（攻击视角与物理不变量守恒断言）。

## 权威关系

1. **本模块拥有的权威事实**：
   - 5 阶段离散管线数学解算、Jobard-Lefer 流线微分排线、2D PDE 酸液咬蚀偏微分方程的权威定义在 `design/ALGORITHM.md`；
   - `PipelineRunner` 与 `VirtualPlateEngine` 导出的方法签名与入参契约权威在 `design/INTERFACES.md`；
   - 物理与算法单元测试用例权威在 `verification/TESTING.md`。
2. **引用的外部事实**：
   - 系统端到端场景与验收标准引用根级 `requirements/REQUIREMENTS.md`；
   - 跨模块调度依赖由 `orchestration` 模块提供；
   - 本 README 本身不承载任何权威定义。
