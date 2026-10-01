# Orchestration & Task Infrastructure (`src/orchestration/`)

> **模块路径**：`src/orchestration/`  
> **技术定位**：Layer 2 调度编排与基础设施层，实现有向无环图 (DAG) 状态增量缓存、抢占式微任务防抖调度、多格式母版导出与性能指标遥测。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

1. **DAG 增量缓存 (`cache/stage-cache.js`)**：通过 32-bit DJB2 确定性状态哈希检测上游参数变动，精准定位第一失效阶段，最大化复用已有中间产物；
2. **任务调度 (`scheduler/task-scheduler.js`)**：默认 60ms 防抖（母版参数控制器使用 140ms），借助 `AbortController` 在管线阶段边界取消陈旧任务；
3. **工业级母版导出 (`export/exporter.js`)**：生成带精确图层分组的 SVG、工业雕刻机/CNC G-Code 以及包含物理 DPI (`pHYs` 数据块) 的无损 PNG；
4. **运行时遥测聚合 (`telemetry/telemetry-sink.js`)**：精确度量各阶段实际执行微秒数、生成矢量笔画计数与缓存命中率；
5. **生命周期调度中枢 (`engine/orchestrator.js`)**：统筹管线执行、事件监听与铜版物理引擎联动。

---

## 2. 内部架构与组件拓扑 (Internal Architecture & Component Map)

```
src/orchestration/
├── engine/                   # 顶层生命周期调度中枢
│   └── orchestrator.js       # Orchestrator 核心类，派发管线阶段事件与微任务
├── scheduler/                # 抢占式微任务防抖调度
│   └── task-scheduler.js     # TaskScheduler 队列与 AbortController 管理
├── cache/                    # DAG 增量缓存与哈希检测
│   └── stage-cache.js        # StageCache 状态指纹与失效分析
├── export/                   # 工业母版多格式导出器
│   └── exporter.js           # Exporter (SVG / G-Code / PNG pHYs)
├── telemetry/                # 性能统计与事件汇聚
│   └── telemetry-sink.js     # TelemetrySink 耗时监控与指标输出
└── docs/                     # 调度体系工程规范与算法推导
```

| 子目录 / 文件 | 核心类 / 导出对象 | 职责说明 |
| :--- | :--- | :--- |
| `engine/orchestrator.js` | `Orchestrator` | 顶层生命周期调度中枢，派发管线阶段事件与中间产物联动 |
| `scheduler/task-scheduler.js` | `TaskScheduler` | 防抖计时器、微任务执行队列与 AbortSignal 抢占中止 |
| `cache/stage-cache.js` | `StageCache` | 32-bit DJB2 确定性哈希计算与下游阶段失效链分析 |
| `export/exporter.js` | `Exporter` | 分层 SVG、G-Code 切片走刀与 PNG pHYs 物理分辨率导出器 |
| `telemetry/telemetry-sink.js` | `TelemetrySink` | 阶段耗时统计、吞吐量监控与事件分发 |

---

## 3. 核心算法原理与数学建模摘要 (Mathematical Principles)

详见 [docs/ALGORITHM_SPEC.md](docs/ALGORITHM_SPEC.md)：
- **32-bit DJB2 确定性状态哈希方程**：
  $$h_0 = 5381, \quad h_{i+1} = ((h_i \ll 5) + h_i + \text{ord}(str[i])) \mid 0$$
- **DAG 最小失效链剪枝判定**：
  $$k^* = \min \{ j \in [1, 5] \mid H_j^{\text{new}} \ne H_j^{\text{cached}} \}$$
  若 $k^* \in [1, 5]$，阶段 $1 \le j < k^*$ 命中缓存，阶段 $j \ge k^*$ 级联失效重算。

---

## 4. 对外公共接口契约 (Public API Contract)

```typescript
interface OrchestratorOptions {
  debounceMs?: number;
  onStageComplete?: (stageId: string, output: any) => void;
  onError?: (err: Error) => void;
}

class Orchestrator {
  constructor(options?: OrchestratorOptions);
  runPipeline(recipe: MasterRecipe): Promise<PipelineOutputs>;
  cancel(): void;
  exportMaster(format: 'svg' | 'gcode' | 'png', options?: any): Promise<Blob | string>;
}
```

---

## 5. 自动化测试与验证 (Testing & Verification)

覆盖本调度编排模块的测试文件包括：
- [`tests/stage-cache.test.cjs`](../../tests/stage-cache.test.cjs)（3 项：DJB2 哈希确定性、下游失效分析、缓存读写）
- [`tests/task-scheduler.test.cjs`](../../tests/task-scheduler.test.cjs)（3 项：快速调用防抖、前置任务抢占中断、取消调度）
- [`tests/exporter.test.cjs`](../../tests/exporter.test.cjs)（4 项：SVG 分层 role 映射、G-Code 坐标、PNG pHYs）
- [`tests/orchestrator.test.cjs`](../../tests/orchestrator.test.cjs)（2 项：生命周期事件广播与调度器集成）

运行命令：
```bash
node --test tests/stage-cache.test.cjs tests/task-scheduler.test.cjs tests/exporter.test.cjs tests/orchestrator.test.cjs
```

---

## 6. 子文档导航 (Sub-documentation Index)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：内部调度流转、时序图与缓存拓扑
- [docs/ALGORITHM_SPEC.md](docs/ALGORITHM_SPEC.md)：DJB2 哈希方程与 DAG 剪枝数学推导
- [docs/INTERFACE_SPEC.md](docs/INTERFACE_SPEC.md)：编排中枢、抢占调度与导出接口设计规范
- [docs/TESTING.md](docs/TESTING.md)：调度与导出器测试矩阵与断言深度解析
