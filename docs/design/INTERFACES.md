# 系统接口与跨模块契约规范 (INTERFACES)

> **文档标识**：IF-SYS-CONTRACT  
> **上级依据**：[docs/design/ARCHITECTURE.md](ARCHITECTURE.md)  
> **权威原则**：本文件作为系统级跨模块接口的唯一权威定义，各模块使用方只做链接引用。  

---

## 1. 跨模块核心契约清单

### [IF-PIPE-RUN-001] 母版管线运行器 (PipelineRunner)
* **归属模块**：`src/core/pipeline/pipeline-runner.js`
* **签名**：
  ```typescript
  interface PipelineRunner {
    static runIncremental(
      context: { sourceImage: ImageData | HTMLImageElement | Object; geometry?: { depthMap?: Float32Array; normalMap?: Float32Array } },
      previousOutputs?: Partial<Record<string, unknown>>,
      params?: RecipeSchema,
      startStage?: number, // 增量重算起始阶段 (1..5)
      signal?: AbortSignal | null,
      onProgress?: ((stage: number, percent: number, artifact: unknown) => void) | null
    ): Promise<PipelineResult>;

    static run(
      context: { sourceImage: any; geometry?: any; params?: RecipeSchema },
      options?: {
        startStage?: number;
        cachedInputs?: Record<string, unknown>;
        params?: RecipeSchema;
        signal?: AbortSignal | null;
        onProgress?: ((stage: number, percent: number, artifact: unknown) => void) | null;
      }
    ): Promise<PipelineResult>;
  }
  ```
* **异常契约**：当 `signal.aborted` 为 true 时，抛出 `AbortError`；当图像数据非法时，抛出 `Error("PipelineRunner: context.sourceImage is required")`。

---

### [IF-SCHED-001] 抢占式任务调度器 (TaskScheduler)
* **归属模块**：`src/orchestration/scheduler/task-scheduler.js`
* **签名**：
  ```typescript
  interface TaskScheduler {
    schedule<T>(taskFn: (signal: AbortSignal) => Promise<T>, customDebounceMs?: number | null): Promise<{ aborted: boolean; result?: T; reason?: string }>;
    cancelActive(reason?: string): void;
    readonly isBusy: boolean;
    readonly isPending: boolean;
  }
  ```
* **行为保障**：后续排入的任务自动触发上一个未完成任务的 `AbortSignal` 取消，保障高频滑块拖拽时 UI 响应零卡顿。

---

### [IF-PLATE-001] 虚拟铜版引擎与工坊控制器契约 (PlateStudio API)
* **归属模块**：`src/core/plate/engine/virtual-plate-engine.js` 与 `src/ui/controllers/plate-studio-controller.js`
* **底层引擎核心契约 (`VirtualPlateEngine`)**：
  * `allocatePlate(width: 900 | 1500 | 3000): void` —— 重新分配连续 TypedArray 铜版；
  * `resetGrain(): void` —— 重置高频晶粒随机噪声场；
  * `applyToolDab(x: number, y: number, force?: number, tool?: 'needle' | 'dry' | 'stop' | 'polish', size?: number): void` —— 单点工具作用；
  * `applyToolLine(a: Point, b: Point, tool?: 'needle' | 'dry' | 'stop' | 'polish', size?: number): void` —— 插值工具刻线；
  * `applyToolPath(points: Point[], tool?: 'needle' | 'dry' | 'stop' | 'polish', size?: number): void` —— 连续折线刻绘；
  * `applyMasterPaths(paths: VectorPath[], tool?: 'needle' | 'dry', defaultSize?: number): void` —— 母版矢量上版；
  * `etch(dt: number, strength?: number, grain?: number): void` —— 2D PDE 酸液咬蚀数值迭代；
  * `render(mode?: 'plate' | 'depth' | 'print', options?: Object, targetBuffer?: Uint8ClampedArray): { width: number, height: number, pixels: Uint8ClampedArray }` —— 凹版印样与版面渲染；
  * `snapshot(irreversible?: boolean): void` —— 记录撤销快照；
  * `undo(): boolean` —— 撤销至上一快照。
* **表现层控制器核心契约 (`PlateStudioController`)**：
  * `toggleEtch(): void` —— 切换腐蚀状态（待开始 $\rightarrow$ 腐蚀中 $\leftrightarrow$ 已暂停）；
  * `stop(): void` —— 暂停腐蚀模拟；
  * `resetEtch(): void` —— **终止腐蚀，将版面深度与侧蚀线宽还原至入酸前基准快照，计时归零**；
  * `capturePreEtchSnapshot(): void` —— 锁存当前未腐蚀铜版基准状态；
  * `updateAcidGauge(): void` —— 刷新微米刻槽深度与腐蚀程度分档指示；
  * `hasPlateModifications(): boolean` —— 检查是否包含手工刻绘或酸咬深度（用于防覆写安全拦截）；
  * `savePlateBackup(): void` —— 导出当前版面完整状态为 JSON 备份。

---

### [IF-EXP-001] 通用多格式工业导出器 (UniversalExporter)
* **归属模块**：`src/orchestration/export/exporter.js`
* **签名**：
  ```typescript
  interface UniversalExporter {
    exportSVG(masterPaths: VectorPath[] | { contours: VectorPath[]; hatchings: VectorPath[] }, options?: { width?: number; height?: number; strokeColor?: string }): string;
    exportGCode(masterPaths: VectorPath[] | { contours: VectorPath[]; hatchings: VectorPath[] }, options?: { feedRate?: number; travelHeight?: number; engraveDepth?: number; scale?: number }): string;
    exportRecipeJSON(recipe: Record<string, unknown>): string;
    exportPayload(request: { format: 'SVG' | 'GCODE' | 'RECIPE_JSON'; masterPaths?: any; recipe?: any; options?: any }): { filename: string; mimeType: string; data: string; byteSize: number };
  }
  ```

---

### [IF-GATE-001] AI 模型服务网关 (AIServiceGateway)
* **归属模块**：`src/services/client/ai-service-gateway.js`
* **签名**：
  ```typescript
  interface AIServiceGateway {
    checkHealth(timeoutMs?: number): Promise<{ ready: boolean; mode: 'remote-python' | 'browser-webai' | 'offline-analytical'; modeLabel: string; device: string; requiresNetwork: boolean; lotusReady?: boolean }>;
    requestLineDrawing(imageBlob: Blob, timeoutMs?: number): Promise<Blob | null>;
    requestDepthMap(imageBlob: Blob, timeoutMs?: number): Promise<Blob | null>;
    inferLineDrawing(imageElementOrBlob: any, options?: Object): Promise<Blob | null>;
    inferDepthMap(imageElementOrBlob: any, options?: Object): Promise<Blob | null>;
  }
  ```
