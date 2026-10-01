# 编排中枢、任务调度与缓存接口设计与契约规范 (INTERFACE_SPEC.md)

> **位置**：`src/orchestration/docs/INTERFACE_SPEC.md`  
> **所属层次**：Layer 2 编排与协同中枢 (Orchestration & Coordination Hub)  
> **实现目标**：指导管线调度中枢 (`engine/`)、微任务抢占调度器 (`scheduler/`)、确定性增量缓存 (`cache/`)、矢量导出器 (`export/`) 与监控探针 (`telemetry/`) 的接口契约。

---

## 1. 接口设计哲学与职责边界 (Design Philosophy & Boundary)

1. **中枢协调者模式 (Centralized Coordinator Pattern)**：
   编排模块作为 Layer 1 计算引擎与 Layer 3 UI 控制器之间的唯一桥梁。它负责协调任务排队、状态机转换、DAG 增量缓存命中与错误分发，**严禁内部包含任何具体的图像像素处理或数学滤波算法**。
2. **防抖与抢占式调度原则 (Preemptive & Debounced Execution)**：
   面向高频滑块交互，调度器必须优先保证 UI 主线程的绝对流畅。对于连续提交的任务，调度器必须自动防抖合并，并在新任务到达时立即向陈旧执行线程发出抢占式中止信号。
3. **确定性缓存安全**：
   缓存命中仅取决于输入哈希与配方哈希的确定性匹配，严禁通过不可控的外部隐式状态做决策。

---

## 2. 强类型接口定义与数据结构契约 (Type Definitions & Data Contract)

```typescript
/**
 * 任务调度配置
 */
export interface ScheduleOptions {
  readonly debounceMs?: number;          // 防抖延迟窗口 (毫秒，默认 50ms)
  readonly priority?: 'high' | 'normal'; // 任务优先级
}

/**
 * 抢占式异步任务调度器契约 (scheduler/)
 */
export interface ITaskScheduler {
  /**
   * 提交待执行任务，自动处理排队防抖与正在执行任务的抢占中止
   * @param taskFn 包含 AbortSignal 的异步执行函数
   * @param options 调度配置
   * @returns 任务执行结果 Promise (若被后续任务抢占，则 Promise 自动被 reject 并携带 AbortError)
   */
  schedule<T>(
    taskFn: (signal: AbortSignal) => Promise<T>,
    options?: ScheduleOptions
  ): Promise<T>;

  /**
   * 立即强行中止当前正在运行的任务并清空防抖定时器
   */
  cancelActive(): void;
}

/**
 * 阶段哈希与 DAG 失效树解析契约 (cache/)
 */
export interface IStageCache {
  /**
   * 计算指定阶段在给定配方下的 32-bit DJB2 确定性哈希
   */
  computeStageHash(stageIndex: number, recipe: Readonly<Record<string, unknown>>): string;

  /**
   * 存入阶段计算输出产物
   */
  put(stageIndex: number, hash: string, data: unknown): void;

  /**
   * 获取指定阶段的缓存结果 (若哈希不匹配或未缓存则返回 null)
   */
  get<T>(stageIndex: number, hash: string): T | null;

  /**
   * 基于配方前后变化解析首个失效的起始阶段
   * @returns 首个失效阶段编号 (1..5)，若完全未变则返回 null
   */
  resolveInvalidation(
    prevRecipe: Readonly<Record<string, unknown>>,
    nextRecipe: Readonly<Record<string, unknown>>
  ): number | null;

  /**
   * 清空全部阶段缓存
   */
  clear(): void;
}

/**
 * 编排中枢公共契约 (engine/)
 */
export interface IOrchestrator {
  /**
   * 注册生命周期与阶段完成事件监听器
   */
  on(event: 'stageStart' | 'stageComplete' | 'error' | 'abort', handler: (payload: any) => void): () => void;

  /**
   * 请求执行全流程或增量管线
   * @param sourcePixelBuffer 源图像缓冲区
   * @param recipe 全局配方
   */
  execute(sourcePixelBuffer: any, recipe: Readonly<Record<string, unknown>>): Promise<any>;

  /**
   * 终止当前正在运行的任何计算任务
   */
  abort(): void;
}

/**
 * 矢量与物理版面格式化导出契约 (export/)
 */
export interface IExporter {
  exportSVG(strokes: ReadonlyArray<any>, width: number, height: number): string;
  exportGCode(strokes: ReadonlyArray<any>, options?: Record<string, unknown>): string;
  exportPNG(canvas: any, dpi?: number): Blob | Promise<Blob>;
}
```

---

## 3. 前置条件与参数合法性约束 (Pre-conditions)

1. **防抖时间正定性**：
   - `schedule` 中的 `debounceMs` 若传入，必须为非负安全整数（$0 \le \text{debounceMs} \le 5000$）。
2. **阶段范围合规**：
   - `StageCache` 操作的 `stageIndex` 必须处于闭区间 $[1, 5]$ 内。传入其他值必须抛出 `RangeError("Invalid pipeline stage index")`。
3. **配方不可变性保证**：
   - 提交至 `computeStageHash` 与 `resolveInvalidation` 的配方对象必须为合法的非空 Object，若传入 `null` 或 `undefined`，必须抛出 `TypeError`。

---

## 4. 后置条件与状态变更承诺 (Post-conditions)

1. **前向失效单调传递承诺 (Forward Invalidation Monotonicity)**：
   - 若 `resolveInvalidation` 判定阶段 $K$ 失效，则系统必须同时承诺所有依赖阶段 $M > K$（$M \in [K+1, 5]$）的缓存状态全部作废，绝不向上层返回带有陈旧前置状态的污染产物。
2. **陈旧结果完全屏蔽 (Stale Result Suppression)**：
   - 一旦前一个任务被抢占中止，其任何迟到的异步回调（Resolved / Rejected）必须被静默拦截，绝对不能触发全局事件总线的 `stageComplete` 事件。

---

## 5. 系统不变量与守恒律 (System Invariants)

1. **单任务并发执行排他性 (Task Mutex Invariant)**：
   在任意物理时刻 $t$，系统内部最多只能存在**一个**活跃执行的底层管线微任务。新任务提交时，旧任务必须已进入 Aborted 终态。
2. **哈希计算幂等性与确定性**：
   对于相同的 `(stageIndex, recipe)` 键，`computeStageHash` 在不同线程与运行周期中计算所得的 32-bit 哈希字符串必须恒等。

---

## 6. 纯函数属性、副作用与内存所有权 (Side-effects & Memory Ownership)

1. **副作用封装与事件总线隔离**：
   `Orchestrator` 内部维护事件订阅池与 `AbortController` 状态。事件派发必须保证异常隔离（一个 Listener 抛错不得阻断后续 Listener 的触发）。
2. **缓存引用安全**：
   `StageCache` 缓存的密集矩阵若被下游消费，调度器必须在派发前向消费者提示只读语义，或由消费者按需克隆，防止下游破坏缓存内容。

---

## 7. 错误契约、并发与生命周期状态协议 (Error Handling & Lifecycle Protocol)

1. **抢占取消判定标准**：
   - 被新任务抢占导致的中止抛出 `AbortError`，此为正常业务调度流转，编排器**严禁将其作为未捕获异常向用户报错**；
   - 只有真正的计算故障（内存溢出、算子内部断言失败）才派发 `error` 事件。
2. **事件监听清理闭包**：
   - `on()` 方法必须返回无参的解除监听函数 `() => void`，避免组件销毁时的内存泄漏。
