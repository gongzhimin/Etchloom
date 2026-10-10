---
title: 编排调度模块架构设计
status: Active
doc-id: ARCH-ORCH
owner-module: orchestration
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:58:00+08:00
---

# 编排调度模块架构设计 (ARCH-ORCH)

## 1. 模块定位与边界

`orchestration` 模块是系统 Layer 2 编排与协同中枢。它对下封装 `core` 纯计算管线与 `services` 外部微服务，对上向 `ui` 控制器提供统一的任务调度、增量缓存与导出能力。模块严禁直接访问 DOM、样式或 UI 渲染视图，保持无头（Headless）运行能力。

## 2. 内部结构与子模块职责

```text
src/orchestration/
├── engine/              # 管线编排中枢 (Orchestrator: 串联缓存、调度、遥测与铜版转录)
│   └── orchestrator.js
├── scheduler/           # 任务调度器 (TaskScheduler: 60ms/140ms 防抖、排队、AbortSignal 抢占)
│   └── task-scheduler.js
├── cache/               # DAG 增量缓存 (StageCache: 32-bit DJB2 哈希比对与失效剪枝)
│   └── stage-cache.js
├── export/              # 多格式导出器 (Exporter: 分层 SVG、数控 G-Code、配方 JSON)
│   └── exporter.js
└── telemetry/           # 遥测探针 (TelemetrySink: 阶段耗时统计与执行指标汇总)
    └── telemetry-sink.js
```

### 2.1 子模块职责
- **`engine/orchestrator.js`**：负责调度流程整体串接，挂载事件监听，组织 `scheduleRecipe` 增量执行、`transferToPlate` 转刻并分发生命周期与遥测事件；
- **`scheduler/task-scheduler.js`**：管理并发任务与微任务防抖队列，持有一个前置任务的 `AbortController`，并在新任务到达时执行抢占中止；
- **`cache/stage-cache.js`**：管理 Stage 1 至 Stage 5 的中间产物，根据参数指纹快速裁剪无需重复计算的上游阶段；
- **`export/exporter.js`**：将 `masterPaths` 矢量路径与配方转换为标准矢量分层 SVG、数控雕刻 G-Code 指令集与格式化 JSON；
- **`telemetry/telemetry-sink.js`**：轻量级内存指标汇聚器，收集阶段耗时并提供性能诊断日志。

## 3. 内部依赖拓扑与约束

```text
+-----------------------------------------------------------+
|                    UI Controllers (Layer 3)               |
+-----------------------------------------------------------+
                             │
                             ▼
+-----------------------------------------------------------+
|                   Orchestrator (Engine)                   |
|  +--------------------+  +-----------------------------+  |
|  |   TaskScheduler    |  |          StageCache         |  |
|  +--------------------+  +-----------------------------+  |
|  +--------------------+  +-----------------------------+  |
|  |   TelemetrySink    |  |           Exporter          |  |
|  +--------------------+  +-----------------------------+  |
+-----------------------------------------------------------+
        │                                  │
        ▼                                  ▼
+-----------------------+      +----------------------------+
|   core (Pipeline)     |      |  services (Client Gateway) |
+-----------------------+      +----------------------------+
```

### 依赖约束：
1. `scheduler`、`cache`、`export`、`telemetry` 各自独立，不得产生循环依赖；
2. `engine` 作为上层聚合者，协调上述 4 个子系统与底层 `core` 算子；
3. 子模块间数据传递使用纯 JavaScript 简单对象（POJO），严禁通过全局变量通信。

## 4. 实现级技术栈与约束

- **运行环境**：Node.js LTS 与标准现代浏览器（ES2022+）；
- **无第三方重型依赖**：哈希解算、防抖定时与文本拼接自主实现，无外部第三方库强依赖；
- **取消信号流转**：任务在防抖窗口后调度，传入 `AbortSignal`；若在新任务到来前仍在执行，前序任务立即被 abort。
