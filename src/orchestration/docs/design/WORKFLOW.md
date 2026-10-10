---
title: 编排调度模块工作流与状态机设计
status: Active
doc-id: WF-ORCH
owner-module: orchestration
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:41:00+08:00
---

# 编排调度模块工作流与状态机设计 (WF-ORCH)

## 1. 业务流程与用例映射

本模块支撑交互式调参和异步解算全流程，承接系统用例 `SCEN-001`（参数交互生成）与 `SCEN-002`（版画母版导出）：

```text
用户操作 (UI 滑块变动)
    │
    ▼
TaskScheduler 防抖窗口 (140ms)
    │
    ├─► 若在窗口期内有新输入 ──► 重置计时器，更新 Payload
    │
    ▼ (窗口到期)
Orchestrator 发起计算
    │
    ├─► 检查是否有运行中前置任务 ──► 触发 signal.abort() 抢占
    │
    ▼
StageCache 比对 5 阶段哈希指纹
    │
    ├─► 判定首个失效阶段 (firstInvalidatedStage)
    ├─► 复用未失效阶段的只读缓存
    │
    ▼
PipelineRunner 从失效阶段开始增量执行
    │
    ├─► 每阶段完成触发事件通知 UI 更新进度条
    │
    ▼
写入 StageCache 并返回 MasterResult
```

## 2. 状态机模型

调度中枢内部维护 4 态生命周期状态机：

```text
       [IDLE 空闲]
         │
         │ scheduleTask()
         ▼
       [PENDING 防抖等待]
         │
         ├─► [IDLE] (用户取消)
         │
         │ timer 到期
         ▼
       [RUNNING 计算执行中]
         │
         ├─► [ABORTED 已抢占] (新任务到达触发 signal.abort)
         │       │
         │       └─► [IDLE]
         │
         ├─► [ERROR 失败] (抛出异常)
         │       │
         │       └─► [IDLE]
         │
         ▼ (顺利完成)
       [COMPLETED 完成]
         │
         └─► [IDLE]
```

## 3. 跨模块/子模块状态协作

1. **与 UI 层协作**：UI 控制器提交 `recipe` 变动，监听 `stage:complete` 事件驱动进度条；
2. **与 Core 层协作**：`PipelineRunner` 接收 `cachedOutputs` 与 `AbortSignal`，在每阶段计算间隙检查 `signal.aborted`；
3. **与 Services 层协作**：Stage 1 若调用远程微服务失败，编排器协助调度本地回退方案。

## 4. 并发、重试与降级

- **抢占优先级**：后到达的用户输入具有最高优先级，自动抢占前序未完成的长时间计算；
- **防抖合并**：滑块连续拖动过程中产生的高频事件在防抖窗口内合并为最后一次操作；
- **增量降级**：若某阶段哈希失效判定异常，自动安全降级为全量从 Stage 1 重新计算。

## 5. 异常恢复与补偿

- **Abort 清理**：任务被抢占中止后，立即释放当前阶段临时句柄，不向缓存写入残损产物；
- **缓存污染防护**：计算过程中任何阶段抛出未捕获错误时，对应阶段及后继阶段的缓存条目立即被清除；
- **UI 恢复通知**：抛出带有失效阶段标签的事件，通知 UI 重置为稳定就绪态。
