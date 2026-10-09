# 虚拟铜版物理仿真引擎接口设计与契约规范 (INTERFACES.md)

> **位置**：`src/core/plate/docs/INTERFACES.md`  
> **所属层次**：Layer 1 虚拟铜版工坊与连续介质物理仿真引擎 (Virtual Plate Physics Engine)  
> **实现目标**：指导虚拟铜版核心引擎 (`engine/`)、2D 偏微分酸液咬蚀求解器 (`physics/`)、凹版压印渲染器 (`renderer/`) 与内存编解码器 (`codecs/`) 的接口契约。

---

## 1. 接口设计哲学与职责边界 (Design Philosophy & Boundary)

1. **物理连续内存网格封装 (Encapsulated Continuous Memory)**：
   虚拟铜版以一维行优先平铺形式在连续 `TypedArray` 内存块中记录微米级版面状态。除专用的序列化编解码接口外，**严禁外部直接修改底层的 ArrayBuffer 引用**，所有状态变更必须通过受控的物理工具或偏微分求解方法发起。
2. **物理工具正交性 (Tool Orthogonality)**：
   四大正交工具（刻针 `needle`、干刻针 `dry`、防蚀漆 `stop`、刮磨器 `polish`）具备清晰的物理效应划分，互不产生隐含副作用混淆。
3. **光影渲染与物理状态单向解耦**：
   渲染器（PressRenderer）只对铜版物理网格进行**只读光度学投影**，渲染操作严禁对版面刻深与金属毛刺造成任何回写污染。

---

## 2. 强类型接口定义与数据结构契约 (Type Definitions & Data Contract)

```typescript
/**
 * 铜版物理工具模式
 */
export type PlateTool = 'needle' | 'dry' | 'stop' | 'polish';

/**
 * 物理点位定义
 */
export interface PlatePoint {
  readonly x: number;
  readonly y: number;
  readonly p?: number; // 压感力度 [0.0, 1.0]
}

/**
 * 压印渲染配置
 */
export interface PressRenderOptions {
  readonly ink?: number;             // 油墨饱满度 [0.0, 1.0] (默认 0.90)
  readonly pressure?: number;        // 滚筒压力 [0.0, 1.0] (默认 0.65)
  readonly plateTone?: number;       // 空白铜面残留调性 [0.0, 1.0] (默认 0.04)
  readonly paper?: 'rough' | 'smooth' | 'linen' | 'rosaspina'; // 版画纸基
  readonly mirrorHorizontal?: boolean; // 水平镜像翻转
}

/**
 * 铜版核心引擎公共契约
 */
export interface IVirtualPlateEngine {
  readonly width: number;
  readonly height: number;
  readonly pixelCount: number;
  readonly depthField: Float32Array;
  readonly exposedField: Float32Array;
  readonly blockedField: Uint8Array;
  readonly burrField: Float32Array;
  readonly grainNoise: Float32Array;
  elapsedAcidTime: number;

  /**
   * 重新分配连续 TypedArray 铜版内存
   */
  allocatePlate(width: 900 | 1500 | 3000): void;

  /**
   * 重置高频晶粒噪声场
   */
  resetGrain(): void;

  /**
   * 单点工具作用
   */
  applyToolDab(x: number, y: number, force?: number, tool?: PlateTool, size?: number): void;

  /**
   * 两点插值工具刻线
   */
  applyToolLine(a: PlatePoint, b: PlatePoint, tool?: PlateTool, size?: number): void;

  /**
   * 连续折线刻画
   */
  applyToolPath(points: Array<PlatePoint | [number, number]>, tool?: PlateTool, size?: number): void;

  /**
   * 母版矢量上线
   */
  applyMasterPaths(paths: Array<{ points: [number, number][]; width?: number }>, tool?: 'needle' | 'dry', defaultSize?: number): void;

  /**
   * 2D PDE 酸液咬蚀数值迭代
   */
  etch(dt: number, strength?: number, grain?: number): void;

  /**
   * 凹版压印与版面渲染
   */
  render(mode?: 'plate' | 'depth' | 'print', options?: PressRenderOptions, targetBuffer?: Uint8ClampedArray): { width: number; height: number; pixels: Uint8ClampedArray };

  /**
   * 记录撤销快照
   */
  snapshot(irreversible?: boolean): void;

  /**
   * 撤销至上一快照
   */
  undo(): boolean;
}

/**
 * 铜版连续内存编解码器契约 (PlateCodec)
 */
export interface IPlateCodec {
  /**
   * 将 TypedArray 快速序列化为紧凑 Base64
   */
  encode(a: ArrayBufferView): string;

  /**
   * 反序列化恢复连续 TypedArray
   */
  decode(s: string, Type: Float32ArrayConstructor | Uint8ArrayConstructor, n: number): ArrayBufferView;

  /**
   * 反序列化完整版面 JSON 对象
   */
  read(s: Object): { width: number; height: number; depth: Float32Array; exposed: Float32Array; blocked: Uint8Array; burr: Float32Array };
}
```

---

## 3. 前置条件与参数合法性约束 (Pre-conditions)

1. **尺寸分配规格约束**：
   - `width` 必须属于标准物理规格集合 `{900, 1500, 3000}`；
   - 高度根据 $660/900$ 宽高比自动绑定计算：$H = \text{round}(W \times 660 / 900)$。
2. **时间步长正定性**：
   - `dt` 必须为大于 0 的有限正数。
3. **工具类型合法性**：
   - `tool` 必须为 `'needle' | 'dry' | 'stop' | 'polish'` 之一。

---

## 4. 后置条件与状态变更承诺 (Post-conditions)

1. **刻痕深度双向有界性 (Depth Field Boundedness)**：
   - 任意像素点 $(x, y)$ 的数值必须严格满足：
     $$0.0 \le \text{depthField}[i] \le 1.0$$
2. **防蚀漆绝对阻断承诺 (Stop-out Inviolability)**：
   - 凡 $\text{blockedField}[i] == 1$ 的像素点，酸蚀迭代中深度增量恒等于 0：
     $$\Delta D[i] \equiv 0 \quad (\forall \text{blockedField}[i] == 1)$$

---

## 5. 系统不变量与守恒律 (System Invariants)

1. **连续物理字段的一维平铺索引守恒**：
   内部数组长度恒等于 $W \times H$，点 $(x, y)$ 寻址为 $i = y \cdot W + x$。
2. **未划破底漆的酸蚀零响应不变量**：
   凡未被刻刀划破防蚀漆且未被侧蚀波前抵达的区域，其刻深在整个酸蚀生命周期中恒等于 0。
