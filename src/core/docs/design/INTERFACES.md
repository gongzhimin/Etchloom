---
title: 核心模块对外接口契约
status: Active
doc-id: IF-CORE
owner-module: core
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T23:15:00+08:00
---

# 核心模块对外接口契约 (IF-CORE)

## 1. 接口设计原则与权威关系

1. **唯一权威定义**：本文件是 `core` 模块向外暴露的接口契约的唯一权威定义。系统级契约登记以 `docs/design/INTERFACES.md` 为准，具体签名、入参及数据结构以此处为准。
2. **纯领域计算零 DOM 隔离**：核心计算管线与物理仿真引擎均为无状态或连续内存数据结构，完全剥离 DOM 与浏览器特定全局变量，支持在 Node.js 测试环境、Web Worker 及主线程无差别运行。
3. **单入口门面约束**：外部模块严禁绕过门面引用底层具体算子（如 `stage1-informative.js` 至 `stage5-master-print.js`）。跨模块调用统一通过：
   - 图像生成管线：`PipelineRunner`（`src/core/pipeline/pipeline-runner.js`）
   - 虚拟铜版物理仿真：`VirtualPlateEngine`（`src/core/plate/engine/virtual-plate-engine.js`）
   - 物理铜版编解码：`PlateCodec`（`src/core/codecs/plate-codec.js`）

## 2. 函数式接口签名与类定义

### 2.1 PipelineRunner 增量管线执行门面

源码位置：`src/core/pipeline/pipeline-runner.js`

```javascript
class PipelineRunner {
  /**
   * 增量执行第 1 至第 5 阶段版画生成管线。
   * 对于小于 startStage 的阶段，直接复用 previousOutputs 中的缓存结果。
   * 
   * @param {Object} context - 执行上下文
   * @param {Object} context.sourceImage - 图像源 { width: number, height: number, data: Uint8ClampedArray|Array, lineMap?: Float32Array }
   * @param {Object|null} [context.geometry=null] - 空间几何特征 { depthMap?: Float32Array, normalMap?: Float32Array }
   * @param {Object} [previousOutputs={}] - 前序阶段缓存 { stage1?, stage2?, stage3?, stage4?, stage5? }
   * @param {Object} [params={}] - 配方调参字典切片
   * @param {number} [startStage=1] - 起始解算阶段 (1..5)
   * @param {AbortSignal|null} [signal=null] - 抢占式取消信号
   * @param {Function|null} [onProgress=null] - 进度回调 (stageIndex: number, percent: number, stageOutput: Object) => void
   * @returns {Promise<PipelineOutputs>} 全量解算输出对象
   */
  static async runIncremental(context, previousOutputs = {}, params = {}, startStage = 1, signal = null, onProgress = null)

  /**
   * 统一管线执行入口（包装 runIncremental）
   * @param {Object} context - 包含 sourceImage 及可选 geometry、params
   * @param {Object} [options={}] - { cachedInputs?, params?, startStage?, signal?, onProgress? }
   * @returns {Promise<PipelineOutputs>}
   */
  static async run(context, options = {})
}
```

### 2.2 VirtualPlateEngine 物理铜版仿真引擎

源码位置：`src/core/plate/engine/virtual-plate-engine.js`

```javascript
class VirtualPlateEngine {
  /**
   * 初始化铜版物理网格，预分配连续 Float32Array 与 Uint8Array 内存
   * @param {number} [width=900] - 铜版基准宽度，仅允许 900、1500、3000
   */
  constructor(width = 900)

  /**
   * 重新分配指定宽度的连续内存网格
   * @param {number} width - 900 | 1500 | 3000
   */
  allocatePlate(width)

  /**
   * 重新生成确定性高频金属金相晶粒噪声
   */
  resetGrain()

  /**
   * 施加单次物理工具印压 (Dab)
   * @param {number} x - 铜版横坐标
   * @param {number} y - 铜版纵坐标
   * @param {number} [force=1.0] - 下压力度 [0.0, 1.0]
   * @param {'needle'|'dry'|'stop'|'polish'} [tool='needle'] - 工具类型
   * @param {number} [size=4] - 工具基准像素直径
   */
  applyToolDab(x, y, force = 1.0, tool = 'needle', size = 4)

  /**
   * 施加两点间线性插值笔触
   * @param {{x: number, y: number, p?: number}} a - 起始坐标及压力
   * @param {{x: number, y: number, p?: number}} b - 终止坐标及压力
   * @param {'needle'|'dry'|'stop'|'polish'} [tool='needle']
   * @param {number} [size=4]
   */
  applyToolLine(a, b, tool = 'needle', size = 4)

  /**
   * 施加连续折线笔触序列
   * @param {Array<{x: number, y: number, p?: number}|[number, number]>} points
   * @param {'needle'|'dry'|'stop'|'polish'} [tool='needle']
   * @param {number} [size=4]
   */
  applyToolPath(points, tool = 'needle', size = 4)

  /**
   * 将 Stage 5 矢量母版路径批量转刻至铜版
   * @param {Array<{ points: [number, number][], width?: number }>} paths
   * @param {'needle'|'dry'} [tool='needle']
   * @param {number} [defaultSize=2]
   */
  applyMasterPaths(paths, tool = 'needle', defaultSize = 2)

  /**
   * 记录并扩展版面变动脏包围盒，用于局部稀疏酸蚀加速
   * @param {number} minX
   * @param {number} minY
   * @param {number} maxX
   * @param {number} maxY
   */
  markDirty(minX, minY, maxX, maxY)

  /**
   * 推进 2D 偏微分方程酸液化学腐蚀时间步
   * @param {number} dt - 浸酸秒数 (> 0)
   * @param {number} [strength=0.45] - 酸液浓度系数
   * @param {number} [grain=0.45] - 晶粒粗糙度系数
   */
  etch(dt, strength = 0.45, grain = 0.45)

  /**
   * 渲染铜版视口图像或凹版压印图
   * @param {'plate'|'depth'|'print'} [mode='plate'] - 渲染模式
   * @param {Object} [options={}] - 擦版程度与纸张预设选项
   * @param {Uint8ClampedArray|null} [targetBuffer=null] - 可选复用的像素缓冲区
   * @returns {{ width: number, height: number, pixels: Uint8ClampedArray }}
   */
  render(mode = 'plate', options = {}, targetBuffer = null)

  /**
   * 保存当前状态快照至撤销栈 (最多保留 12 步或 128MB)
   * @param {boolean} [irreversible=false]
   */
  snapshot(irreversible = false)

  /**
   * 撤销上一步操作并恢复物理网格
   * @returns {boolean} 是否成功撤销
   */
  undo()

  /**
   * 清空版面深度与裸露场
   * @param {boolean} [keepSources=false]
   */
  clear(keepSources = false)

  /**
   * 获取当前铜版物理统计读数
   * @returns {{ width: number, height: number, pixelCount: number, maxDepth: number, meanDepth: number, exposedCoverage: number, blockedCoverage: number, burrCoverage: number, elapsedAcidTime: number }}
   */
  getStats()
}

/**
 * 2D 偏微分方程酸液动态化学咬蚀解算器
 * 源码位置：src/core/plate/physics/acid-simulator.js
 */
function simulateAcidBite(plate, dt, strength = 0.45, grain = 0.45, dirtyBounds = null): { dt: number }

/**
 * 凹版光影压印渲染器与 GPU 片元着色器
 * 源码位置：src/core/plate/renderer/press-renderer.js
 */
function renderPlate(plate, mode = 'plate', options = {}, targetBuffer = null): { width: number, height: number, pixels: Uint8ClampedArray }
const PRESS_FRAGMENT_SHADER: string

/**
 * 虚拟铜版工坊视图渲染与局部脏矩形提交
 * 源码位置：src/ui/controllers/plate-studio-controller.js
 */
function render(target = getCtx(), mode = view, dirtyBounds = null): void
```

## 3. 输入/输出真实类型定义

```typescript
export interface PipelineOutputs {
  stage1: {
    readonly width: number;
    readonly height: number;
    readonly data: Float32Array; // 归一化灰度线稿 [0.0 黑, 1.0 白]
  };
  stage2: {
    readonly toneField: Float32Array; // 基础色调场 [0.0, 1.0]
    readonly flowField: Float32Array; // 几何切线角度场 [-PI, PI]
  };
  stage3: {
    readonly vectorContours: ReadonlyArray<{
      readonly points: ReadonlyArray<[number, number]>;
      readonly width: number;
      readonly role: 'contour';
    }>;
    readonly contourMask: Uint8Array;
  };
  stage4: {
    readonly hatchingPaths: ReadonlyArray<{
      readonly points: ReadonlyArray<[number, number]>;
      readonly width: number;
      readonly role: 'hatching' | 'cross';
    }>;
  };
  stage5: {
    readonly width: number;
    readonly height: number;
    readonly paths: ReadonlyArray<{
      readonly points: ReadonlyArray<[number, number]>;
      readonly width: number;
      readonly role: string;
      readonly depth?: number;
    }>;
    readonly stats?: Record<string, any>;
  };
  masterResult: PipelineOutputs['stage5'];
}
```

## 4. 错误处理与降级契约

1. **缺失图像上下文**：当 `context` 或 `context.sourceImage` 为空时，立即抛出 `Error('PipelineRunner: context.sourceImage is required')`；
2. **非法版面尺寸**：`VirtualPlateEngine.allocatePlate(width)` 仅接受 900、1500、3000，其余数值立即抛出 `Error('版面尺寸无效')`；
3. **任务抢占取消**：当传入的 `signal.aborted === true` 时，抛出带 `name: 'AbortError'` 且附加 `err.stageIndex` 的异常，中断执行并不产生脏产物；
4. **非有限数值防御**：坐标、力度或半径包含 `NaN`、`Infinity` 时，`applyToolDab` 与 `etch` 立即短路退出，杜绝数值污染。

## 5. 消费方登记与真实契约测试

| 消费方模块 | 依赖门面符号 | 接口调用方式 | 真实契约测试文件 |
| :--- | :--- | :--- | :--- |
| `orchestration` | `PipelineRunner.run` | 调度器防抖与增量管线驱动 | `tests/pipeline-runner.test.cjs` |
| `orchestration` | `VirtualPlateEngine` | 铜版实例化与上版转录 | `tests/orchestrator.test.cjs` |
| `ui` | `VirtualPlateEngine` | 控制器驱动手工刻画与酸液解算 | `tests/virtual-plate-engine.test.cjs` |
| `ui` | `VirtualPlateEngine` | 4 种刻绘工具物理正交行为验证 | `tests/plate.test.cjs` |
| `core` | `PlateCodec.pngDpi` | PNG 注入物理 pHYs 分辨率块 | `tests/refinement.test.cjs` |
