# 虚拟铜版物理仿真引擎接口设计与契约规范 (INTERFACE_SPEC.md)

> **位置**：`src/core/plate/docs/INTERFACE_SPEC.md`  
> **所属层次**：Layer 1 虚拟铜版工坊与连续介质物理仿真引擎 (Virtual Plate Physics Engine)  
> **实现目标**：指导虚拟铜版核心引擎 (`engine/`)、2D 偏微分酸液咬蚀求解器 (`physics/`)、凹版压印渲染器 (`renderer/`) 与内存编解码器 (`codecs/`) 的接口契约。

---

## 1. 接口设计哲学与职责边界 (Design Philosophy & Boundary)

1. **物理连续内存网格封装 (Encapsulated Continuous Memory)**：
   虚拟铜版以一维行优先平铺形式在连续 `TypedArray` 内存块中记录微米级版面状态。除专用的序列化编解码接口外，**严禁外部直接修改底层的 ArrayBuffer 引用**，所有状态变更必须通过受控的物理工具或偏微分求解方法发起。
2. **物理工具正交性 (Tool Orthogonality)**：
   刻刀（Burin）、蚀刻针（Etching Needle）、刮刀（Scraper/Burnisher）与防蚀漆（Stop-out Varnish）四大物理工具必须具备正交的物理效应，互不产生隐含的副作用混淆。
3. **光影渲染与物理状态单向解耦**：
   渲染器（PressRenderer）只对铜版物理网格进行**只读光度学投影**，渲染操作严禁对版面刻深与金属毛刺造成任何回写污染。

---

## 2. 强类型接口定义与数据结构契约 (Type Definitions & Data Contract)

```typescript
/**
 * 铜版物理工具枚举
 */
export type PlateToolType = 'burin' | 'needle' | 'stopout' | 'scraper';

/**
 * 物理笔刷交互参数
 */
export interface ToolStrokeParams {
  readonly x0: number;                   // 起点像素坐标
  readonly y0: number;
  readonly x1: number;                   // 终点像素坐标
  readonly y1: number;
  readonly radius: number;               // 工具作用半径 (像素 > 0)
  readonly pressure: number;             // 施加下压力度 [0.0, 1.0]
  readonly hardness?: number;            // 边缘羽化硬度 [0.0, 1.0]
}

/**
 * 化学酸液咬蚀物理求解入参
 */
export interface AcidEtchParams {
  readonly durationSeconds: number;      // 咬蚀持续物理时长 (秒 > 0)
  readonly acidStrength?: number;        // 酸液浓度系数 (标称 0.5 ~ 2.0, 默认 1.0)
  readonly temperatureC?: number;        // 槽液温度 (摄氏度，默认 20.0)
}

/**
 * 凹版压印渲染参数契约
 */
export interface PressRenderOptions {
  readonly inkViscosity?: number;        // 油墨粘度系数 [0.0, 1.0]
  readonly paperAbsorbency?: number;     // 手工版画纸吸墨膨胀系数 [0.0, 1.0]
  readonly plateTone?: number;           // 版面未刻区域残留油墨调性 [0.0, 1.0]
  readonly mirrorHorizontal?: boolean;   // 模拟实物压印的水平镜像翻转 (默认 true)
}

/**
 * 铜版核心引擎公共契约
 */
export interface IVirtualPlateEngine {
  readonly width: number;
  readonly height: number;

  /**
   * 应用物理工具刻线或涂覆
   */
  applyTool(tool: PlateToolType, params: ToolStrokeParams): void;

  /**
   * 执行 2D 偏微分方程各向同性酸液咬蚀数值求解
   */
  simulateAcidEtch(params: AcidEtchParams): void;

  /**
   * 离散凹版压印模拟渲染，生成用于显示的 RGBA 图像缓冲区
   */
  renderPress(options?: PressRenderOptions): Uint8ClampedArray;

  /**
   * 记录当前物理状态至撤销快照栈
   */
  pushSnapshot(): void;

  /**
   * 撤销至上一物理状态
   * @returns 撤销是否成功
   */
  undo(): boolean;

  /**
   * 重置清空整张铜版至全新抛光状态
   */
  clear(): void;
}

/**
 * 版面连续物理内存编解码器契约
 */
export interface IPlateCodec {
  /**
   * 将当前铜版状态压缩序列化为紧凑字符串 (Base64 ArrayBuffer)
   */
  encode(engine: IVirtualPlateEngine): string;

  /**
   * 反序列化恢复铜版状态
   */
  decode(serialized: string, targetEngine: IVirtualPlateEngine): void;
}
```

---

## 3. 前置条件与参数合法性约束 (Pre-conditions)

1. **尺寸分配正定性**：
   - 铜版尺寸初始化时，`width` 与 `height` 必须为正整数，且必须为支持的物理规格（如 900x660、1500x1100、3000x2200）。若超出 3000x2200 或内存不足，必须同步抛出 `RangeError`。
2. **酸蚀物理时长有效性**：
   - `durationSeconds` 必须为大于 0 的有限正数。若传入负数、0 或 NaN，引擎必须拒绝执行并维持版面状态不变。
3. **序列化数据完整性校验**：
   - `decode` 接收的字符串必须包含合法的魔数头校验。若数据发生截断或字段校验和不匹配，接口必须抛出 `Error("Invalid or corrupted PlateCodec payload")`，并保证 `targetEngine` 不被脏数据污染。

---

## 4. 后置条件与状态变更承诺 (Post-conditions)

1. **物理刻痕深度双向有界性 (Depth Field Boundedness)**：
   - 在经历任何工具刻划或酸液腐蚀后，`depth` 矩阵中任意像素点 $(x, y)$ 的数值必须严格满足：
     $$0.0 \le \text{depth}(x, y) \le 1.0$$
   - 绝不允许出现负深度或超过最大理论刻深（1.0）的上溢。
2. **防蚀漆绝对阻断承诺 (Stop-out Inviolability)**：
   - 在酸液咬蚀模拟中，凡满足 $\text{blocked}(x, y) == 1$ 的像素点，其物理刻深增量必须恒等于 0：
     $$\Delta \text{depth}(x, y) \equiv 0 \quad (\forall \text{blocked}(x, y) == 1)$$

---

## 5. 系统不变量与守恒律 (System Invariants)

1. **连续物理字段的一维平铺索引守恒**：
   四块内部连续数组（`depth: Float32Array`, `exposed: Float32Array`, `burr: Float32Array`, `blocked: Uint8Array`）的长度必须恒等于 $W \times H$，且任意点 $(x, y)$ 必须且仅能通过一维平铺寻址 `idx = y * W + x` 访问。
2. **未曝光区域的酸蚀零响应不变量**：
   凡未被刻刀划破防蚀地线且未被酸液侧蚀波前抵达的区域，其刻深在整个酸蚀生命周期中必须恒等于初始抛光深度。

---

## 6. 纯函数属性、副作用与内存所有权 (Side-effects & Memory Ownership)

1. **原地高效变动 (In-place Mutation)**：
   为了规避 3K 级极清网格（约 85.8MB）频繁 GC 引发的掉帧，`applyTool` 与 `simulateAcidEtch` 被明确设计为对内部平铺数组的原地修改（有受控副作用）。
2. **快照深拷贝隔离 (Snapshot Deep Copy)**：
   调用 `pushSnapshot()` 时，必须对当前的四个物理矩阵执行底层 `slice()` 拷贝，确保后续修改不会篡改快照历史。
3. **渲染输出解耦所有权**：
   `renderPress()` 返回的 `Uint8ClampedArray` 为独立分配的全新图像像素缓冲区，调用方拥有其完整所有权。

---

## 7. 错误契约、并发与生命周期状态协议 (Error Handling & Lifecycle Protocol)

1. **快照栈深度配额保护**：
   - 撤销栈必须设置固定容量上限（默认 5 步）；
   - 当压栈超过上限时，必须自动丢弃最旧的底部快照，严禁无限制消耗宿主内存引发 OOM。
2. **无头环境自适应降级**：
   - 当在纯 Node.js 或缺少 Canvas API 的环境下调用 `renderPress()` 时，渲染器必须使用纯数据矩阵合成 RGBA 像素，严禁尝试创建 DOM 元素。
