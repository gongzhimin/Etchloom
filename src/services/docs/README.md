---
title: 外部服务模块文档导航
status: Active
doc-id: README-SERV
owner-module: services
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:42:00+08:00
---

# 外部服务模块文档导航 (services)

## 1. 模块定位与职责

`services` 模块负责与本地/远程 AI 推理服务及几何算法微服务进行跨进程与网络通信。本模块实现前端智能网关（`AIServiceGateway`）、心跳探活与能力探测（`checkHealth`）、多后端平滑降级（`remote-python` -> `browser-webai` -> `offline-analytical`），以及支撑线描抽取（Informative Drawings）与空间 3D 深度/法线推理（Lotus Geometry）。模块遵循“零阻断平滑降级”原则，在无微服务或服务崩溃时自动回退至纯数学几何算子。

## 2. 文档导航

| 文档类型 | 链接 | 状态 | 一句话用途 |
| :--- | :--- | :--- | :--- |
| **模块架构** | [design/ARCHITECTURE.md](design/ARCHITECTURE.md) | Active | 客户端网关与微服务通信拓扑、三态健康探活与降级架构图。 |
| **对外接口** | [design/INTERFACES.md](design/INTERFACES.md) | Active | AIServiceGateway 门面接口签名、健康探活契约与超时熔断规范。 |
| **算法规范** | [design/ALGORITHM.md](design/ALGORITHM.md) | Active | 二进制指数退避探活心跳方程、残差 U-Net 与 Lotus 法线切线投影数学模型。 |
| **模块测试** | [verification/TESTING.md](verification/TESTING.md) | Active | 探活协议合规、超时熔断与离线平滑降级验证用例设计。 |
| **局部决策** | [decisions/DECISIONS.md](decisions/DECISIONS.md) | Active | 三态智能探活代理、Fail-Safe 零阻断等局部设计决策。 |

## 3. 上级依据与对外契约

| 关联类别 | 目标文档与锚点 | 约束关系 |
| :--- | :--- | :--- |
| **系统需求** | [`docs/requirements/REQUIREMENTS.md#53-外部服务模块-services`](../../../docs/requirements/REQUIREMENTS.md#53-外部服务模块-services) | 承接能力需求 `REQ-SERV-001`、`REQ-SERV-002` 与验收标准 `AC-SERV-001`、`AC-SERV-002` |
| **系统架构** | [`docs/design/ARCHITECTURE.md#2-模块职责与依赖拓扑`](../../../docs/design/ARCHITECTURE.md#2-模块职责与依赖拓扑) | 遵循 Layer 2 单向依赖：被 `core`（Stage 1/3）与 `orchestration` 消费，依赖本地微服务进程 |
| **工程规范** | [`docs/standards/CODING_RULES.md`](../../../docs/standards/CODING_RULES.md) | 遵循 C5 异步与防抖生命周期管理、C8 安全防御 |
| **接口规范** | [`docs/standards/API_RULES.md`](../../../docs/standards/API_RULES.md) | 遵循统一错误码与降级契约 |

## 4. 条件文档豁免声明

| 文档路径 | 触发状态 | 豁免理由 |
| :--- | :--- | :--- |
| `design/WORKFLOW.md` | 未触发 | 本模块内部无复杂并发工作流或长事务状态机，探活状态转换已内嵌在架构与算法文档中。 |
| `design/DATA_DICTIONARY.md` | 未触发 | 本模块定义的通信 DTO（如 `ServiceHealthStatus`）归属系统级 [`docs/design/DATA_DICTIONARY.md`](../../../docs/design/DATA_DICTIONARY.md) 统一登记。 |
| `design/UI_DESIGN.md` | 未触发 | 本模块为底层通信代理与网关，无界面或展示组件。 |
