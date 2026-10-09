# 编排中枢、任务调度与缓存接口设计与契约规范 (INTERFACES.md)

> **位置**：`src/orchestration/docs/INTERFACES.md`  
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
 * 抢占式异步任务调度器契约 (src/orchestration/scheduler/task-scheduler.js)
 */
export interface ITaskScheduler {
  readonly debounceMs: number;
  readonly isBusy: boolean;
  readonly isPending: boolean;

  /**
   * 提交待执行任务，自动处理排队防抖与正在执行任务的抢占中止
   * @param taskFn 包含 AbortSignal 的异步执行函数
   * @param customDebounceMs 可选自定义防抖延迟覆盖 (毫秒)
   * @returns Promise<{ aborted: boolean, result?: any, reason?: string }>
   */
  schedule<T>(
    taskFn: (signal: AbortSignal) => Promise<T>,
    customDebounceMs?: number | null
  ): Promise<{ aborted: boolean; result?: T; reason?: string }>;

  /**
   * 立即强行中止当前正在运行的任务并清空防抖定时器
   */
  cancelActive(reason?: string): void;
}

/**
 * 阶段哈希与 DAG 失效树解析契约 (src/orchestration/cache/stage-cache.js)
 */
export interface IStageCache {
  /**
   * 计算指定阶段在给定配方切片和前序哈希下的 32-bit DJB2 确定性哈希
   */
  computeStageHash(stageIndex: number, stageParams: Object, upstreamHash?: string): string;

  /**
   * 基于新哈希列表比对解析首个失效的起始阶段
   * @returns 首个失效阶段编号 (1..maxStage)，若全部命中则返回 maxStage + 1
   */
  resolveInvalidation(newHashes: Record<number, string>, maxStage?: number): number;

  /**
   * 存入阶段计算输出产物
   */
  put(stageIndex: number, hash: string, output: unknown): void;

  /**
   * 获取指定阶段的缓存结果 (若未缓存则返回 null)
   */
  get<T>(stageIndex: number): T | null;

  /**
   * 失效指定阶段及所有后续阶段
   */
  invalidateFrom(startStage: number): void;

  /**
   * 清空全部阶段缓存
   */
  clear(): void;
}

/**
 * 编排中枢公共契约 (src/orchestration/engine/orchestrator.js)
 */
export interface IOrchestrator {
  readonly stageCache: IStageCache;
  readonly scheduler: ITaskScheduler;
  readonly lastResult: unknown;

  /**
   * 订阅编排器生命周期事件
   * @returns 退订函数
   */
  subscribe(listener: (event: { type: string; timestamp: number; [key: string]: any }) => void): () => void;

  /**
   * 计算配方状态的 1..5 阶段哈希
   */
  computeStageHashes(recipeState: Object): Record<number, string>;

  /**
   * 调度配方执行，集成防抖、抢占与增量缓存
   */
  scheduleRecipe(recipeState: Object, options?: Object): Promise<any>;
}

/**
 * 工业导出器契约 (src/orchestration/export/exporter.js)
 */
export interface IExporter {
  exportSVG(masterPaths: any, options?: { width?: number; height?: number; strokeColor?: string }): string;
  exportGCode(masterPaths: any, options?: { feedRate?: number; travelHeight?: number; engraveDepth?: number; scale?: number }): string;
  exportRecipeJSON(recipe: any): string;
  exportPayload(request: { format: 'SVG' | 'GCODE' | 'RECIPE_JSON'; masterPaths?: any; recipe?: any; options?: any }): { filename: string; mimeType: string; data: string; byteSize: number };
}
```

---

## 3. 前置条件与参数合法性约束 (Pre-conditions)

1. **防抖时间正定性**：`debounceMs` 必须为非负整数（默认 60ms）。
2. **任务函数安全性**：传递给 `schedule` 的 `taskFn` 必须为函数，且必须正确处理 `signal.aborted`。

---

## 4. 后置条件与状态变更承诺 (Post-conditions)

1. **防抖保证**：在高频快速提交多个任务时，仅有最后一个任务的 `taskFn` 会被真正触发执行。
2. **抢占响应**：新任务开始执行时，旧任务关联的 `AbortController` 立即收到中断通知。
