---
title: 系统跨模块契约归属登记
status: Active
doc-id: IF-SYS
owner-module: root
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-11T01:21:00+08:00
---

# 系统跨模块契约归属登记 (IF-SYS)

## 1. 契约登记原则

依据 `standards/DOCUMENT_RULES.md` §7.3 规定，全系统推行**登记与定义分离**原则：
- **根级职责**：本文件作为系统级契约总目录，登记跨模块契约的归属模块、消费方与权威定义路径，不复制契约正文内容；
- **模块级职责**：各契约的具体函数签名、输入输出、正确性条件与异常行为，由各实现模块的 `design/INTERFACES.md` 权威定义。

## 2. 跨模块契约登记总表

| 契约标识 | 契约名称 | 属主模块 | 权威定义位置 | 消费模块 | 一句话职责 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`IF-CORE-RUN`** | 5 阶段母版增量管线门面 | `core` | [`src/core/docs/design/INTERFACES.md`](../../src/core/docs/design/INTERFACES.md) | `orchestration`, `ui` | 接收图像与配方，执行 5 阶段离散解算并返回 PipelineOutputs 与 masterResult。 |
| **`IF-CORE-PLATE`** | 虚拟铜版与物理仿真引擎 | `core` | [`src/core/docs/design/INTERFACES.md`](../../src/core/docs/design/INTERFACES.md) | `ui`, `orchestration` | 维护连续物理场，解算 4 种刻绘工具划刻与 2D PDE 酸液侧蚀。 |
| **`IF-CORE-CODEC`** | 铜版编解码与物理分辨率注入 | `core` | [`src/core/docs/design/INTERFACES.md`](../../src/core/docs/design/INTERFACES.md) | `orchestration`, `ui` | 紧凑二进制序列化与 PNG pHYs 物理 DPI 元数据注入。 |
| **`IF-CORE-RENDER`**| 压印光影着色与 WebGL2 硬件加速 | `core` | [`src/core/docs/design/INTERFACES.md`](../../src/core/docs/design/INTERFACES.md) | `ui` | 物理压印多物理场着色解算与 WebGL2 片元着色器硬件管线。 |
| **`IF-ORCH-HUB`** | 调度编排中枢与生命周期管理 | `orchestration` | [`src/orchestration/docs/design/INTERFACES.md`](../../src/orchestration/docs/design/INTERFACES.md) | `ui` | 聚合缓存、调度器与仿真引擎，分发生命周期与遥测事件。 |
| **`IF-ORCH-SCHED`** | 抢占式防抖任务调度器 | `orchestration` | [`src/orchestration/docs/design/INTERFACES.md`](../../src/orchestration/docs/design/INTERFACES.md) | `ui` | 高频滑块拖拽防抖与异步任务 AbortSignal 抢占。 |
| **`IF-ORCH-CACHE`** | DAG 增量拓扑哈希缓存 | `orchestration` | [`src/orchestration/docs/design/INTERFACES.md`](../../src/orchestration/docs/design/INTERFACES.md) | `ui` | 基于 DJB2 敏感哈希计算首个失效阶段并复用中间结果。 |
| **`IF-ORCH-EXPORT`**| 统一多格式工坊导出器 | `orchestration` | [`src/orchestration/docs/design/INTERFACES.md`](../../src/orchestration/docs/design/INTERFACES.md) | `ui` | 矢量路径与配方序列化为标准 SVG (含分组)、G-Code 与 JSON。 |
| **`IF-SERV-GW`** | AI 智能服务与通信网关 | `services` | [`src/services/docs/design/INTERFACES.md`](../../src/services/docs/design/INTERFACES.md) | `core`, `ui` | 三态健康探活，提供线描抽取与 3D 几何深度离线平滑降级。 |
| **`IF-UI-MOUNT`** | 视图总装与响应式状态中心 | `ui` | [`src/ui/docs/design/INTERFACES.md`](../../src/ui/docs/design/INTERFACES.md) | `root` (`main.js`) | 装配全站 HTML 结构骨架，维护单向响应式全局状态树。 |
| **`IF-UI-LOUPE`** | 空间散列网格与局部放大镜 | `ui` | [`src/ui/docs/design/INTERFACES.md`](../../src/ui/docs/design/INTERFACES.md) | `ui` (组件级协作) | 粗粒度视锥空间网格裁剪与亚像素级特写呈现。 |

## 3. 契约协作关系与单入口门面要求

各模块对外必须严格遵循 `standards/API_RULES.md` 的**单一入口门面原则**：
1. 模块对外只暴露设计好的主要交互函数或面向对象门面类；
2. 跨模块调用方严禁绕过上述已登记的门面直接引入模块内部未导出的底层文件；
3. 任何破坏性变更必须先在 `docs/decisions/DECISIONS.md` 立项仲裁后方可调整。
