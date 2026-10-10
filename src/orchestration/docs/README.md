---
title: 编排调度模块文档导航
status: Active
doc-id: README-ORCH
owner-module: orchestration
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:41:00+08:00
---

# 编排调度模块文档导航 (orchestration)

## 1. 模块定位与职责

`orchestration` 模块是系统 Layer 2 编排与协同中枢，负责连接纯计算核心（`core`）、外部服务（`services`）与用户交互层（`ui`）。本模块承担生命周期编排、微任务防抖与抢占调度（`TaskScheduler`）、DAG 增量缓存失效判定（`StageCache`）、矢量/工业格式导出（`Exporter`）与性能遥测汇聚（`TelemetrySink`），严禁包含具体图像像素处理或数学滤波算法。

## 2. 文档导航

| 文档类型 | 链接 | 状态 | 一句话用途 |
| :--- | :--- | :--- | :--- |
| **模块架构** | [design/ARCHITECTURE.md](design/ARCHITECTURE.md) | Active | 内部结构、调度中枢拓扑、文件树与模块实现约束。 |
| **对外接口** | [design/INTERFACES.md](design/INTERFACES.md) | Active | 对外单一入口门面契约（Orchestrator、TaskScheduler、Exporter）。 |
| **工作流设计** | [design/WORKFLOW.md](design/WORKFLOW.md) | Active | 抢占式调度、防抖合并、DAG 增量失效与异常恢复协作流程。 |
| **算法规范** | [design/ALGORITHM.md](design/ALGORITHM.md) | Active | 32-bit DJB2 确定性状态哈希与 DAG 拓扑失效剪枝判据数学模型。 |
| **模块测试** | [verification/TESTING.md](verification/TESTING.md) | Active | 单元测试矩阵、微任务抢占与 pHYs 标定断言设计。 |
| **局部决策** | [decisions/DECISIONS.md](decisions/DECISIONS.md) | Active | 中枢协调者模式、AbortController 信号源等局部决策记录。 |

## 3. 上级依据与对外契约

| 关联类别 | 目标文档与锚点 | 约束关系 |
| :--- | :--- | :--- |
| **系统需求** | [`docs/requirements/REQUIREMENTS.md#52-编排调度模块-orchestration`](../../../docs/requirements/REQUIREMENTS.md#52-编排调度模块-orchestration) | 承接能力需求 `REQ-ORCH-001`、`REQ-ORCH-002` 与验收标准 `AC-ORCH-001`、`AC-ORCH-002` |
| **系统架构** | [`docs/design/ARCHITECTURE.md#2-模块职责与依赖拓扑`](../../../docs/design/ARCHITECTURE.md#2-模块职责与依赖拓扑) | 遵循 Layer 2 单向依赖原则：向下依赖 `core` 与 `services`，向上被 `ui` 消费 |
| **工程规范** | [`docs/standards/CODING_RULES.md`](../../../docs/standards/CODING_RULES.md) | 遵循 C2 模块边界隔离、C5 异步与防抖生命周期管理 |
| **接口规范** | [`docs/standards/API_RULES.md`](../../../docs/standards/API_RULES.md) | 遵循单一入口门面导出与无全局单例模式 |

## 4. 条件文档豁免声明

| 文档路径 | 触发状态 | 豁免理由 |
| :--- | :--- | :--- |
| `design/DATA_DICTIONARY.md` | 未触发 | 本模块定义的公共实体（如 `Recipe`、`ExportFormat`）归属系统级 [`docs/design/DATA_DICTIONARY.md`](../../../docs/design/DATA_DICTIONARY.md) 统一登记，模块内部无专属持久化实体。 |
| `design/UI_DESIGN.md` | 未触发 | 本模块为非 UI 编排中枢，无页面或交互视图。 |
