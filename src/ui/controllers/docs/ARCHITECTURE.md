# 前端业务控制器架构与事件状态机规范 (ARCHITECTURE.md)

> **模块路径**：`src/ui/controllers/`  
> **上级体系规范**：[docs/00_architecture/ARCHITECTURE_OVERVIEW.md](../../../../docs/00_architecture/ARCHITECTURE_OVERVIEW.md)

---

## 1. 架构拓扑与装配关系 (Topology & Component Diagrams)

```mermaid
graph TD
    Main[src/main.js 顶层装配] --> PC[PipelineController 算法母版控制器]
    Main --> PSC[PlateStudioController 虚拟铜版控制器]
    Main --> TWC[TransferWizardController 图稿上版向导]
    Main --> LBC[LightboxController 高清灯箱特写]

    PC --> Grid[StepFlowGrid 7阶段卡片网格]
    PC --> Loupe[LoupeMagnifier 悬停放大镜]
    PC --> Orch[Orchestrator 调度中枢]

    PSC --> Engine[VirtualPlateEngine 铜版物理仿真]
    PSC --> Store[AppStore 全局状态]

    TWC --> Engine
    TWC --> PC
```

---

## 2. 控制器交互时序与调用流程 (Sequence & Interaction Flows)

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户交互
    participant PC as PipelineController
    participant Orch as Orchestrator
    participant Grid as StepFlowGrid
    participant TW as TransferWizardController
    participant PS as PlateStudioController

    User->>PC: 点击 "导入图稿" / 调整参数滑块
    PC->>Orch: runPipeline(recipe)
    Orch-->>Grid: 实时推送 5 阶段 ImageData
    Grid-->>User: 渲染步骤流卡片

    User->>TW: 点击 "转入虚拟铜版 (Transfer to Plate)"
    TW->>TW: 弹出上版向导模态框，配置刻痕深度与毛刺比率
    User->>TW: 点击 "确认上版 (Confirm Transfer)"
    TW->>PS: 物理刻痕注入 (transferVectorToPlate)
    PS->>User: 铜版工坊画布即时呈现金属微刻表面
```

---

## 3. 控制器核心职责与状态契约 (Controller Contracts)

### 3.1 `PipelineController`
- **生命周期**：管理照片输入、阶段进度指示条、各阶段真实耗时计时器（采用 `performance.now()` 精确记录实际毫秒数，杜绝模拟假耗时）；
- **联动**：与 `LoupeMagnifier`、`StepFlowGrid` 及 `Orchestrator` 单向数据流绑定。

### 3.2 `PlateStudioController`
- **生命周期**：管理铜版分辨率切换（900、1500 2K、3000 3K）、4 种物理制版工具划线交互、化学酸蚀控制台与无头纯位图压印；
- **撤销栈**：维护完整的历史快照数组 `history[]`，支持多步撤销与重做。

### 3.3 `TransferWizardController`
- **生命周期**：图稿上版模态框控制，提供轮廓线条与排线线条分层过滤勾选，按选定物理深度写入 `VirtualPlateEngine`。

### 3.4 `LightboxController`
- **生命周期**：全屏高清特写观察，支持原生手势缩放、滚轮 100%~500% 无级缩放与双缓冲平移。
