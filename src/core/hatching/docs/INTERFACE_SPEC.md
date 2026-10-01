# 曲面流场与排线子系统接口设计与契约规范 (INTERFACE_SPEC.md)

> **位置**：`src/core/hatching/docs/INTERFACE_SPEC.md`  
> **所属层次**：Layer 1 领域计算排线算法引擎 (Hatching & Flow Engine)  
> **实现目标**：指导流场层 (`fields/`)、规则约束层 (`rules/`) 与流线积分层 (`curves/`) 的接口契约、物理守恒与纯函数规范。

---

## 1. 接口设计哲学与职责边界 (Design Philosophy & Boundary)

1. **三层正交解耦架构 (Three-Tier Orthogonal Decoupling)**：
   - **`fields/` (流场几何层)**：只负责从标量图像和三维法线中提取切线导向场、结构张量场与曼哈顿主轴投影，输出确定性连续向量/张量场；
   - **`rules/` (规则约束层)**：只负责对调性空间与几何曲面进行语义过滤、空间自抑制与墨量配额约束，输出归一化衰减因子掩膜 $[0.0, 1.0]$；
   - **`curves/` (流线积分层)**：只负责根据流场与衰减掩膜，采用离散质点数值积分生成拓扑安全、间距均匀的单通道/多通道折线集。
2. **零领域越权 (Zero Overreach)**：
   排线模块内部严禁访问外围任务调度队列、网络接口或任何 DOM 结构。所有输入必须通过纯数学矩阵或几何数据包传入。

---

## 2. 强类型接口定义与数据结构契约 (Type Definitions & Data Contract)

```typescript
/**
 * 二维流场张量结构契约 (fields/)
 */
export interface TensorFieldContract {
  readonly width: number;
  readonly height: number;
  readonly theta: Float32Array;          // 主方向切线角度场 [-PI/2, PI/2] (长度 = W * H)
  readonly coherence: Float32Array;      // 方向一致性/各向异性强度 [0.0 (各向同性), 1.0 (极强定向)]
  readonly energy: Float32Array;         // 结构张量迹 (梯度能量) [0.0, +Infinity)
}

/**
 * 曼哈顿正交流场投影算子入参与出参契约
 */
export interface ManhattanFlowParams {
  readonly normalMap: Float32Array;      // 连续归一化法向量 [Nx, Ny, Nz] (长度 = W * H * 3)
  readonly width: number;
  readonly height: number;
  readonly snapThresholdAngle?: number;  // 曼哈顿主轴吸附阈值角 (弧度，默认 PI / 12)
}

export interface ManhattanFlowResult {
  readonly snappedTheta: Float32Array;   // 吸附至正交坐标系后的切线场 (长度 = W * H)
  readonly isPlanarMask: Uint8Array;     // 是否满足平直立面判定 (0: 否, 1: 是)
}

/**
 * 排线墨量守恒与门控规则契约 (rules/)
 */
export interface IHatchRuleFilter {
  /**
   * 评估并生成排线抑制权重掩膜
   * @param toneField 归一化输入调性场 [0.0, 1.0]
   * @param tensorField 结构张量场
   * @param width 画布宽度
   * @param height 画布高度
   * @param options 专用调节参数字典
   * @returns 衰减因子矩阵 (长度 = W * H, 元素值严格处于 [0.0, 1.0])
   */
  evaluateMask(
    toneField: Float32Array,
    tensorField: TensorFieldContract,
    width: number,
    height: number,
    options?: Readonly<Record<string, unknown>>
  ): Float32Array;
}

/**
 * Jobard-Lefer 流线积分生成器契约 (curves/)
 */
export interface StreamlineIntegratorOptions {
  readonly dSep: number;                 // 流线间分离距离 (Separation Distance, 像素单位 > 0)
  readonly dTest: number;                // 碰撞测试安全距离 (标称 dSep * 0.5)
  readonly stepSize: number;             // Runge-Kutta 步进积分步长 (像素单位，标称 0.5 ~ 1.0)
  readonly maxSteps: number;             // 单条流线最大积分迭代上限
  readonly minPoints: number;            // 判定为有效折线的最小采样点数 (>= 2)
  readonly seedDensity?: number;         // 泊松候选种子点采样密度
}

export interface IStreamlineIntegrator {
  /**
   * 基于切线导向场生成确定性等距顺形排线
   * @param tensorField 切线与各向异性场
   * @param mask 规则层综合衰减掩膜 [0.0 (禁止排线), 1.0 (允许最大密度)]
   * @param options 积分器配置参数
   * @returns 矢量笔划序列 (每条笔划 points.length >= minPoints)
   */
  integrate(
    tensorField: TensorFieldContract,
    mask: Float32Array,
    options: StreamlineIntegratorOptions
  ): ReadonlyArray<VectorStroke>;
}
```

---

## 3. 前置条件与参数合法性约束 (Pre-conditions)

1. **角度场定义域约束**：
   - 传入的 `theta` 切线角度场，每个元素必须落入实数区间 $[-\pi, \pi]$。若存在未定义点或 NaN，调用方必须抛出 `RangeError("Tensor field theta contains non-finite values")`。
2. **分离距离正定性**：
   - `options.dSep` 必须满足 $d_{\text{sep}} \ge 1.0$。严禁传入非正数或 0，防止积分网格发生零步长无限死循环。
3. **连续掩膜边界规范**：
   - 规则层返回的 `mask` 元素值域必须严格限制在 $[0.0, 1.0]$。负数或大于 1.0 的值视为严重契约违规。

---

## 4. 后置条件与状态变更承诺 (Post-conditions)

1. **流线最小距离不变量 (Minimum Distance Separation)**：
   - 生成的任意两条不同流线上的任意采样点 $P_1, P_2$，在 Euclidean 度量下必须满足：
     $$\|P_1 - P_2\| \ge d_{\text{test}} = d_{\text{sep}} \cdot 0.5$$
   - 契约保证流线在几何拓扑上绝不相互自交或发生非法重叠堆墨。
2. **包围盒闭包性 (Bounding Box Closure)**：
   - 所有生成的笔划点 $(x, y)$ 必须严格位于画布内：$0 \le x < \text{width}$, $0 \le y < \text{height}$。在抵达边界时流线必须平滑终止。

---

## 5. 系统不变量与守恒律 (System Invariants)

1. **空间墨量预算守恒律 (Spatial Ink Conservation)**：
   在任意局部滑动窗口 $B_r(x, y)$（半径 $r = 10\text{px}$）内，排线总像素覆盖率积分不得超过该区域的调性深暗度 $1.0 - \text{baseTone}(x, y)$。高光区域（调性 $> 0.90$）的排线墨量必须守恒为 0。
2. **切向连续性不变量**：
   在流线向前推进积分时，相邻步进切向量的点积必须满足 $\vec{v}_k \cdot \vec{v}_{k+1} \ge 0$。若出现曲率突变（反向夹角 $> 90^\circ$），积分必须平滑截断，严禁出现折返尖刺。

---

## 6. 纯函数属性、副作用与内存所有权 (Side-effects & Memory Ownership)

1. **无副作用纯计算**：
   所有 `fields/`、`rules/` 与 `curves/` 下的顶层函数必须保证纯函数性，不得在内部保留跨次调用的全局缓存。
2. **空间网格索引加速结构内存管理**：
   `integrate` 内部构建的 2D 离散空间网格（Cell Grid 用于 $O(1)$ 邻域碰撞查询）在方法返回前必须自动释放，严禁向外泄漏内部索引结构。

---

## 7. 错误契约、并发与生命周期状态协议 (Error Handling & Lifecycle Protocol)

1. **不可恢复错误的防御性处理**：
   当尺寸不匹配或内存分配超限（$W \times H > 3000 \times 2200$）时，算子必须同步抛出规范的 `Error`，附带具体的违规尺寸参数。
2. **可控降级协议**：
   当某个局部的结构张量各向同性强度低于阈值（如极度平滑的白墙或完全无纹理区域），算子不得崩溃，必须平滑降级为根据全景主倾角进行平行线性积分。
