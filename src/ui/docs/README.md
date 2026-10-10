---
title: UI 交互与视图总装模块文档导航
status: Active
doc-id: README-UI
owner-module: ui
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:43:00+08:00
---

# UI 交互与视图总装模块文档导航 (ui)

## 1. 模块定位与职责

`ui` 模块是系统 Layer 3 & 4 交互呈现与视图总装层，负责用户界面骨架渲染、事件交互处理、两阶段沉浸式工坊模式切换（制作母版 vs 虚拟铜版）、响应式状态管理（`AppStore`）、业务控制器（`PipelineController`、`PlateStudioController`、`TransferWizardController`、`LightboxController`）、七阶段横向胶片卡片组件（`StepFlowGrid`）以及中、英、越三语国际化绑定（`I18nManager`）。模块遵循纯无头可测试性原则，所有组件与控制器均可在轻量 Mock DOM 环境下完成自动化测试。

## 2. 文档导航

| 文档类型 | 链接 | 状态 | 一句话用途 |
| :--- | :--- | :--- | :--- |
| **模块架构** | [design/ARCHITECTURE.md](design/ARCHITECTURE.md) | Active | 前端分层总装图、双阶段渐进界面机制与控制器解耦设计。 |
| **界面设计** | [design/UI_DESIGN.md](design/UI_DESIGN.md) | Active | 两阶段顶层信息架构、铜版工坊四步工序面板与无障碍 (A11y) 交互方案。 |
| **对外接口** | [design/INTERFACES.md](design/INTERFACES.md) | Active | mountAppLayout、AppStore、控制器与组件公共契约规范。 |
| **模块测试** | [verification/TESTING.md](verification/TESTING.md) | Active | 纯 Node.js 无头 Mock DOM 测试设计与按钮矩阵断言。 |
| **局部决策** | [decisions/DECISIONS.md](decisions/DECISIONS.md) | Active | 亚麻鼠尾草美学配色、无逻辑微模板装配等局部决策记录。 |

## 3. 上级依据与对外契约

| 关联类别 | 目标文档与锚点 | 约束关系 |
| :--- | :--- | :--- |
| **系统需求** | [`docs/requirements/REQUIREMENTS.md#54-用户界面总装模块-ui`](../../../docs/requirements/REQUIREMENTS.md#54-用户界面总装模块-ui) | 承接能力需求 `REQ-UI-001`、`REQ-UI-002` 与验收标准 `AC-UI-001`、`AC-UI-002` |
| **系统架构** | [`docs/design/ARCHITECTURE.md#2-模块职责与依赖拓扑`](../../../docs/design/ARCHITECTURE.md#2-模块职责与依赖拓扑) | 遵循 Layer 3 & 4 单向依赖：消费 `orchestration` 与 `core`，不得被底层逆向依赖 |
| **界面规范** | [`docs/standards/UI_RULES.md`](../../../docs/standards/UI_RULES.md) | 严格遵循视觉设计、无障碍标准与响应式断点 |
| **编码规范** | [`docs/standards/CODING_RULES.md`](../../../docs/standards/CODING_RULES.md) | 遵循 C6 DOM 操作与 XSS 防御、C9 无状态无副作用纯函数 |

## 4. 条件文档豁免声明

| 文档路径 | 触发状态 | 豁免理由 |
| :--- | :--- | :--- |
| `design/ALGORITHM.md` | 未触发 | 本模块为纯视图呈现与事件控制器，无非平凡数值或物理算法（算法集中于 `core` 模块）。 |
| `design/WORKFLOW.md` | 未触发 | 端到端两阶段工作流与酸蚀状态协作已在系统级 [`docs/design/WORKFLOW.md`](../../../docs/design/WORKFLOW.md) 权威定义；本模块视图流转由 `UI_DESIGN.md` 与 `ARCHITECTURE.md` 覆盖。 |
| `design/DATA_DICTIONARY.md` | 未触发 | 本模块展示的业务实体统一归属系统级 [`docs/design/DATA_DICTIONARY.md`](../../../docs/design/DATA_DICTIONARY.md) 登记。 |
