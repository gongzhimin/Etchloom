# 核心离散计算管线接口设计与契约规范 (INTERFACE_SPEC.md)

> **位置**：`src/core/docs/INTERFACE_SPEC.md`  
> **所属层次**：Layer 1 领域计算核心层 (Pure Computational Core)  
> **实现目标**：指导 5 阶段离散数学管线（Stage 1 ~ Stage 5）与管线调度器（PipelineRunner）的类型安全与状态流转契约。

---

## 1. 接口设计哲学与职责边界 (Design Philosophy & Boundary)

1. **计算核心与宿主适配边界**：
   主要数值算子与版面仿真可在 Node.js 和浏览器运行。当前 `image/photo-pro.js` 含浏览器画布辅助函数，`pipeline/stage1-informative.js` 含本机推理服务请求；这两处不属于纯数值算子，不能声称整个 `src/core/` 无 DOM、无网络依赖。后续拆分适配层时应保持现有调用接口兼容。
2. **状态单向流转与不可变分期 (Unidirectional Stage Isolation)**：
   管线划分为 Stage 1 至 Stage 5。下游阶段必须将上游阶段的产物视为**只读上下文 (Readonly Context)**，严禁任何阶段在原地（in-place）篡改前序阶段的输出缓冲区。
3. **确定性算子设计 (Deterministic Functional Operators)**：
   除由 PRNG 种子显式初始化的变奏算子外，所有阶段函数在给定相同输入时，输出必须达到比特级（bit-level）一致。

---

## 2. 强类型接口定义与数据结构契约 (Type Definitions & Data Contract)

```typescript
/**
 * 图像离散像素网格 (输入基元)
 */
export interface PixelBuffer {
  readonly width: number;                // 画布宽度 (正整数像素)
  readonly height: number;               // 画布高度 (正整数像素)
  readonly data: Uint8ClampedArray;      // RGBA 连续行优先平铺一维数组 (长度 = width * height * 4)
}

/**
 * 阶段 1：灰度线描抽取输出契约
 */
export interface Stage1Output {
  readonly sketchGray: Float32Array;     // 归一化感知亮度场 [0.0 (黑), 1.0 (白)] (长度 = W * H)
  readonly edgeConfidence: Float32Array; // 边缘响应强度 [0.0, 1.0] (长度 = W * H)
}

/**
 * 阶段 2：色调分解与几何切线场契约
 */
export interface Stage2Output {
  readonly baseTone: Float32Array;       // 低频基础调性场 [0.0, 1.0]
  readonly detailTone: Float32Array;     // 高频微纹理细节场 [-1.0, 1.0]
  readonly flowField: Float32Array;      // 切线导向角度场 [-PI, PI] (长度 = W * H)
}

/**
 * 阶段 3：Lotus 3D 几何特征与主轮廓契约
 */
export interface Stage3Output {
  readonly normalMap: Float32Array | null; // 归一化曲面法向量 [Nx, Ny, Nz] (长度 = W * H * 3)
  readonly depthMap: Float32Array | null;  // 归一化深度场 [0.0 (近), 1.0 (远)] (长度 = W * H)
  readonly contours: ReadonlyArray<VectorStroke>; // 结构骨干轮廓折线集 (role: 'contour')
}

/**
 * 阶段 4：顺形曲面排线输出契约
 */
export interface Stage4Output {
  readonly hatchStrokes: ReadonlyArray<VectorStroke>; // 顺形排线 (role: 'hatch' | 'cross')
}

/**
 * 阶段 5：母版合成与切片元数据契约
 */
export interface Stage5Output {
  readonly allStrokes: ReadonlyArray<VectorStroke>;   // 合并排序后的全量矢量笔划集
  readonly stats: {
    readonly totalLengthMm: number;                   // 物理总刻痕线长 (毫米)
    readonly strokeCount: number;                     // 笔划总数
    readonly layerDistribution: Record<string, number>; // 各 role 图层的笔划数量分布
  };
}

/**
 * 单条矢量折线几何定义
 */
export interface VectorStroke {
  readonly points: ReadonlyArray<[number, number]>;   // 空间采样点 [[x0, y0], [x1, y1], ...]
  readonly width: number;                             // 物理线宽 (像素单位，标称 0.8)
  readonly role: 'contour' | 'hatch' | 'cross' | 'contour-coarse' | 'maze';
  readonly depth?: number;                            // 铜版刻痕深度估计 [0.0, 1.0]
}

/**
 * 5 阶段管线执行调度器契约
 */
export interface IPipelineRunner {
  /**
   * 顺序执行管线，支持从指定起始阶段增量恢复
   * @param input 源图像像素缓冲区
   * @param recipe 全局配方参数字典
   * @param startStage 起始阶段 (1..5)
   * @param preCachedStages 已缓存的前置阶段输出
   * @param signal 可选的中止信号，用于实时抢占取消
   * @returns 各阶段计算结果聚合字典
   */
  run(
    input: PixelBuffer,
    recipe: Readonly<Record<string, unknown>>,
    startStage?: number,
    preCachedStages?: Partial<Record<number, unknown>>,
    signal?: AbortSignal
  ): Promise<Record<number, unknown>>;
}
```

---

## 3. 前置条件与参数合法性约束 (Pre-conditions)

实现方在进入计算前，必须对入参实施下列确定性断言；若校验失败，必须抛出标准错误：
1. **像素缓冲区完整性**：
   - 入参 `input.width` 与 `input.height` 必须为大于 0 的安全正整数（$W, H \in \mathbb{Z}^+$ 且 $W \times H \le 16{,}000{,}000$）。
   - `input.data.length` 必须严格等于 $W \times H \times 4$。违反时抛出 `TypeError("Invalid PixelBuffer dimension: buffer byteLength mismatch")`。
2. **配方数值有限性 (Numeric Finiteness)**：
   - `recipe` 中的所有浮点权重（如 `lineDensity`, `contrast`, `depthModulation`）必须为有限实数（`Number.isFinite(v) === true`），严禁包含 `NaN`、`+Infinity` 或 `-Infinity`。
3. **阶段范围约束**：
   - `startStage` 必须处于闭区间 $[1, 5]$。
   - 当 `startStage > 1` 时，`preCachedStages` 必须完整包含阶段 $[1, \text{startStage} - 1]$ 的非空输出，否则必须立即拒绝执行。

---

## 4. 后置条件与状态变更承诺 (Post-conditions)

算子或调度器成功返回时，必须履行以下状态承诺：
1. **边界安全性 (Spatial Bounding Safety)**：
   - 输出中所有 `VectorStroke.points` 内的坐标对 $[x, y]$，必须严格满足 $0.0 \le x < W$ 且 $0.0 \le y < H$。严禁产生越出画布包围盒的未裁剪点。
2. **标量场值域合规性 (Field Normalization)**：
   - `Stage1Output.sketchGray`、`Stage2Output.baseTone` 中每个元素的值必须归一化于 $[0.0, 1.0]$，严禁出现上溢或下溢。
3. **输出图层语义完整性**：
   - `Stage5Output.allStrokes` 中的每一条折线必须具有合法的 `role` 标识，严禁返回 `role === undefined` 的匿名笔划。

---

## 5. 系统不变量与守恒律 (System Invariants)

1. **网格维度守恒律**：
   无论经过多尺度滤波、切线场采样还是轮廓追踪，管线内部所有二维密集场（Float32Array）的元素总数必须严格守恒为 $W \times H$。
2. **拓扑折线最小长度不变量**：
   任何输出至 Stage 3、4、5 的 `VectorStroke`，其 `points.length` 必须大于等于 2。单点离散噪点必须在前置拓扑优化阶段被剔除。

---

## 6. 纯函数属性、副作用与内存所有权 (Side-effects & Memory Ownership)

1. **纯函数属性 (Pure Computation)**：
   每个 `stageX.run()` 算子必须实现为纯函数。严禁在算子执行过程中读写任何模块级全局状态。
2. **内存所有权契约 (Memory Ownership)**：
   - **输入数据**：实现方对 `input` 和 `preCachedStages` 仅拥有**借用权 (Borrow)**，严禁原地写入或释放其底层的 `ArrayBuffer`。
   - **输出数据**：每个阶段分配的 `Float32Array` 由当前阶段拥有并转移（Transfer）给返回值；下游阶段不可共享同一块可变内存。

---

## 7. 错误契约、并发与生命周期状态协议 (Error Handling & Lifecycle Protocol)

1. **强占式中止契约 (Preemption via AbortSignal)**：
   - 算子内部每个耗时步骤（如迭代行扫描、流线积分循环）必须定期轮询检查 `signal?.aborted`；
   - 若 `signal.aborted === true`，必须立即中断当前循环，抛出 `DOMException('Aborted', 'AbortError')`，并安全释放临时分配的巨型矩阵。
2. **渐进超时保护**：
   - 单个阶段的计算耗时若超过系统硬性配额（默认单阶段 30 秒），调度器必须终止任务并汇报超时异常，防止主线程假死。
