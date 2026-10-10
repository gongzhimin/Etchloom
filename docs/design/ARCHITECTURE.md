---
title: 系统架构总览与模块依赖拓扑
status: Active
doc-id: ARCH-SYS
owner-module: root
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:25:00+08:00
---

# 系统架构总览与模块依赖拓扑

## 1. 系统边界

Etchloom 的系统边界定义在纯本地客户端计算环境与宿主系统的接缝处：
- **外部输入**：用户选择的本地静态图像文件（File / Blob / URL）、用户鼠标/触控板/手写笔绘制事件；
- **外部服务接缝**：本地可选 Python CUDA 辅助服务（`127.0.0.1:7861`，可选探活与推断，不强依赖）；
- **系统产出**：标准 SVG 矢量文件、高分辨率棉纸印痕 PNG、铜版 JSON 状态归档、以及原生桌面窗口。系统不依赖外部云端 API，无网络通信边界。

## 2. 系统架构图

```text
┌─────────────────────────────────────────────────────────────┐
│                    Atelier 表现层 (ui)                      │
│     Two-Stage Controller │ Canvas Renderer │ I18n Manager   │
└──────────────┬──────────────────────────────▲───────────────┘
               │ 调度任务 / 参数更新          │ 渲染产物 / 状态
┌──────────────▼──────────────────────────────┴───────────────┐
│                 编排调度与生命周期 (orchestration)          │
│     TaskScheduler (防抖抢占) │ StageCache │ Exporter        │
└──────────────┬──────────────────────────────┬───────────────┘
               │ 增量管线调用                 │ 硬件感知请求
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│     领域核心 (core)         ││     服务网关 (services)      │
│  PipelineRunner (5 Stages)  ││  AIServiceGateway (熔断降级) │
│  VirtualPlateEngine (PDE)   ││  WebAIClient (ONNX / WebGPU) │
└─────────────────────────────┘└──────────────────────────────┘
```

## 3. 模块职责

- **`core`**：负责图像色调解构、微分曲率排线场计算、虚拟铜版离散化及偏微分物理酸咬仿真；不承担任何 DOM 操作、事件监听与网络请求。
- **`orchestration`**：负责 5 阶段管线 DAG 调度、任务防抖抢占、增量缓存及跨格式数据导出；不承担算法内部矩阵解算与 UI 组件持有。
- **`services`**：负责硬件加速探测（WebGPU / WASM SIMD）、ONNX 模型加载及本地 Python 服务通信与熔断降级；不持有界面状态。
- **`ui`**：负责两阶段古典工坊进阶模式呈现、用户交互手势监听、4 态酸液状态机与 Canvas 压印展示；不直接执行深度数值运算。

## 4. 文件结构树

```text
src/
├── core/                         # 领域核心计算
│   ├── pipeline/                 # 5 阶段离散母版管线
│   ├── plate/                    # 虚拟铜版引擎与 2D PDE 酸液物理仿真
│   ├── hatching/                 # 微分几何流线与注意力排线
│   └── docs/                     # 核心模块文档 (含 design, verification, decisions)
├── orchestration/                # 编排与生命周期
│   ├── scheduler/                # 任务防抖抢占调度器
│   ├── cache/                    # DJB2 内容哈希 DAG 缓存
│   ├── export/                   # SVG / PNG / JSON 统一导出器
│   └── docs/                     # 编排模块文档
├── services/                     # 客户端硬件与模型网关
│   ├── client/                   # AI 服务网关与回退熔断
│   └── docs/                     # 网关模块文档
└── ui/                           # Atelier 工坊交互与表现
    ├── controllers/              # 流程与铜版控制器
    ├── components/               # 进度网格、放大镜、浮层模态
    ├── i18n/                     # 三语零 Emoji 国际化字典
    └── docs/                     # UI 模块文档
```

## 5. 依赖方向

系统的模块依赖遵循严格单向无环拓扑（DAG）：
$$\text{ui} \longrightarrow \text{orchestration} \longrightarrow (\text{core}, \text{services})$$
- `services` 向 `core` 提供离线线描感知结果；
- ❌ **禁止反向依赖**：`core` 严禁反向依赖 `orchestration`、`services` 或 `ui`；`orchestration` 严禁依赖 `ui`。

## 6. 跨模块协作

1. **母版生成流**：`ui` 监听到用户参数输入 $\rightarrow$ 提交给 `orchestration.TaskScheduler` $\rightarrow$ 比对 `StageCache` $\rightarrow$ 驱动 `core.PipelineRunner` 调用 `services.AIServiceGateway` 与排线算法 $\rightarrow$ 输出 `MasterResult` 响应式返回 `ui` 渲染。
2. **铜版上版流**：`ui.TransferWizard` 校验铜版修改安全守卫 $\rightarrow$ 读取 `MasterResult` 矢量 $\rightarrow$ 调用 `core.VirtualPlateEngine` 进行点阵光栅化 $\rightarrow$ 建立物理刻绘基准。

## 7. 权威契约索引

| 契约标识 | 权威定义位置 | 消费方 |
| :--- | :--- | :--- |
| `IF-CORE-RUN` | `src/core/docs/design/INTERFACES.md` | `orchestration`, `ui` |
| `IF-CORE-PLATE` | `src/core/docs/design/INTERFACES.md` | `ui` |
| `IF-ORCH-SCHED` | `src/orchestration/docs/design/INTERFACES.md` | `ui` |
| `IF-ORCH-CACHE` | `src/orchestration/docs/design/INTERFACES.md` | `core`, `ui` |
| `IF-SERV-GW` | `src/services/docs/design/INTERFACES.md` | `core`, `orchestration` |
