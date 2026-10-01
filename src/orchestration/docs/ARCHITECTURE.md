# 调度中枢与生命周期拓扑设计规范 (ARCHITECTURE.md)

> **模块定位**：`src/orchestration/`  
> **上级体系规范**：[docs/00_architecture/ARCHITECTURE_OVERVIEW.md](../../../docs/00_architecture/ARCHITECTURE_OVERVIEW.md)

---

## 1. 系统拓扑与组件关系图 (Topology & Component Diagrams)

```mermaid
graph TD
    UI[UI 控制器层] -->|发起计算请求| Orchestrator[Orchestrator 调度中枢]
    Orchestrator --> Scheduler[TaskScheduler 防抖与抢占调度]
    Scheduler --> Cache[StageCache DAG 增量失效判定]
    Scheduler --> Runner[PipelineRunner 5阶段算子执行]
    Runner --> Telemetry[TelemetrySink 性能遥测汇聚]
    Runner --> Exporter[Exporter 矢量母版导出器]
    Exporter --> Output[SVG / G-Code / PNG pHYs 文件]
```

---

## 2. 交互时序与调用流程图 (Sequence & Interaction Flows)

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户 (滑块调整)
    participant Ctrl as PipelineController
    participant Orch as Orchestrator
    participant Sched as TaskScheduler
    participant Cache as StageCache
    participant Pipe as PipelineRunner

    User->>Ctrl: onInput(params)
    Ctrl->>Orch: requestCompute(recipe)
    Orch->>Sched: scheduleTask(runPipeline, 300ms)
    Note over Sched: 防抖窗口计时 (300ms)
    User->>Ctrl: onInput(新参数变化)
    Ctrl->>Orch: requestCompute(newRecipe)
    Orch->>Sched: scheduleTask(runPipeline, 300ms)
    Note over Sched: 清除旧计时器，更新执行载荷
    Sched->>Cache: resolveInvalidation(params)
    Cache-->>Sched: 返回 { firstInvalidated: 'stage4' }
    Sched->>Pipe: runFromStage4(cachedOutputs, signal)
    Pipe-->>Orch: 阶段完成事件 (stage4, stage5)
    Orch-->>Ctrl: UI 进度与视图更新通知
```

---

## 3. 内部数据流动与状态不变量 (Data Flow & Invariants)

1. **单向数据流原则**：`Orchestrator` 永远不直接持有 DOM 元素句柄，所有数据变更均以不可变 Plain Object 形式通过回调派发；
2. **缓存指针不可变性**：`StageCache` 存入的中间产物（如 `LineMap`、`ToneFlow`）为只读引用，后续阶段必须作为纯入参传入，严禁就地（in-place）修改前置阶段属性；
3. **信号源唯一性**：任何正在执行的任务必须且仅能绑定唯一一个 `AbortSignal`，当新的调度请求生效时，旧信号立即触发 `abort` 广播。

---

## 4. 生命周期状态机模型 (Lifecycle State Machine)

```mermaid
stateDiagram-v2
    [*] --> Idle: 初始化完成
    Idle --> Debouncing: 收到计算请求 (schedule)
    Debouncing --> Debouncing: 窗口期内收到新请求 (重置计时)
    Debouncing --> Preempting: 计时器到期，检测到前序未完成任务
    Preempting --> Computing: 触发旧任务 abort()，分配新 AbortController
    Debouncing --> Computing: 计时器到期，无前序运行任务
    Computing --> Idle: 计算成功，派发 completion 事件
    Computing --> Idle: 捕获 AbortError，静默退出
    Computing --> Error: 捕获业务异常，派发 error 事件
    Error --> Idle: 错误日志已记录
```
