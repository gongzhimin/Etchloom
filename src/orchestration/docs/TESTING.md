# 调度基础设施自动化测试规范 (TESTING.md)

> **被测模块**：`src/orchestration/` (`engine/`, `scheduler/`, `cache/`, `export/`, `telemetry/`)  
> **执行命令**：`npm test` 或 `node --test tests/orchestrator.test.cjs tests/stage-cache.test.cjs tests/task-scheduler.test.cjs tests/exporter.test.cjs`  
> **核心目标**：验证防抖与微任务抢占确定性、DAG 失效剪枝完备性、工业级导出尺寸与 pHYs 标定。

---

## 1. 对应测试用例矩阵 (Unit Test Matrix)

| 测试文件 | 用例描述 | 被测组件 / 符号 | 关键断言指标 |
| :--- | :--- | :--- | :--- |
| `tests/stage-cache.test.cjs` | `computeStageHash produces deterministic and sensitive hashes` | `StageCache.computeStageHash` | 相同输入哈希恒等；微小参数浮点变动必定产生不同哈希 |
| `tests/stage-cache.test.cjs` | `resolveInvalidation correctly pinpoints first invalidated stage` | `StageCache.resolveInvalidation` | 修改 Stage 4 参数时，仅返回 `'stage4'` 且清空 4~5，保留 1~3 |
| `tests/stage-cache.test.cjs` | `put, get, clear operate correctly` | `StageCache.put / get / clear` | 产物引用存取一致性；clear 后全量清空 |
| `tests/task-scheduler.test.cjs` | `debounces multiple rapid calls and only executes final task` | `TaskScheduler.schedule` | 10 次高频并发调用仅最终任务执行 1 次 |
| `tests/task-scheduler.test.cjs` | `preempts and aborts running task when new task is scheduled` | `TaskScheduler.schedule` + `AbortSignal` | 运行中任务收到 `signal.aborted === true` 并被安全抢占 |
| `tests/task-scheduler.test.cjs` | `cancelActive immediately halts timer and active execution` | `TaskScheduler.cancelActive` | 立即取消未到期的计时器 |
| `tests/exporter.test.cjs` | `SVG export separates role groups` | `Exporter.exportToSVG` | 输出包含 `<g id="contours">` 与 `<g id="hatchings">` |
| `tests/exporter.test.cjs` | `G-Code emits valid motion commands` | `Exporter.exportToGCode` | 输出合法 `G0`, `G1`, `M3`, `M5` 指令且数值有限 |
| `tests/exporter.test.cjs` | `PNG export embeds physical pixel density` | `Exporter.exportToPNG` | PNG 数据流包含 9 字节 `pHYs` 数据块，DPI 转换精确 |
| `tests/orchestrator.test.cjs` | `initialization and component integration` | `Orchestrator` 构造与挂载 | 默认实例正确关联 Cache、Scheduler 与 Sink |
| `tests/orchestrator.test.cjs` | `lifecycle events dispatching` | `Orchestrator.runPipeline` | 阶段监听器按 1~5 严格时序触发并返回有效结果 |

---

## 2. 测试夹具与输入规范 (Test Fixtures & Inputs)

- **合成矢量母版夹具**：
  构建包含 10 条 `role: 'contour'` 与 50 条 `role: 'hatching'` 的合法母版对象：
  ```javascript
  const mockMasterResult = {
    width: 900, height: 660,
    paths: [
      { points: [[10, 10], [100, 100]], width: 1.2, role: 'contour' },
      { points: [[50, 50], [80, 80]], width: 0.6, role: 'hatching' }
    ]
  };
  ```

---

## 3. 数学与物理不变量 (Mathematical & Physical Invariants)

1. **哈希纯函数不变量**：对于任意相同的 `(stageId, params)`，执行 $N$ 次 `computeStageHash` 输出完全一致；
2. **下游依赖单调失效不变量**：若阶段 $k$ 失效，对于所有 $m > k$，阶段 $m$ 绝不可能保留在有效缓存池中；
3. **SVG 尺寸守恒**：导出的 `<svg viewBox="0 0 W H" width="W" height="H">` 中的宽高必须严格等于输入画幅尺寸。

---

## 4. 断言容差与数值精度要求 (Assertions & Tolerances)

- **防抖时延断言**：设置防抖 50ms，10 次并发触发耗时误差范围控制在 $\pm 20\text{ms}$ 内；
- **G-Code 浮点精度**：坐标格式化为小数点后 3 位（如 `X120.450 Y88.125`），误差 $< 0.001\text{mm}$；
- **PNG pHYs 单位换算**：1 英寸 = 0.0254 米，300 DPI 对应 $300 / 0.0254 \approx 11811$ 像素/米，整数断言必须精确等于 11811。
