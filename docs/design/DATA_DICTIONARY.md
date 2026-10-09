# 公共数据语义与数据字典规范 (DATA_DICTIONARY)

> **文档标识**：DATA-SYS-REGISTRY  
> **上级依据**：[docs/standards/DATA_RULES.md](../standards/DATA_RULES.md)  
> **设计边界**：定义全系统共享的公共实体数据结构与序列化协议；子模块专有私有变量不在本文件罗列。  

---

## 1. 核心实体定义清单

### [DATA-RECIPE-001] 母版配方模式 (RecipeSchema)
定义驱动 5 阶段管线计算与铜版仿真的真实参数配置（对应 `src/ui/store/app-store.js` 与 `src/orchestration/engine/orchestrator.js`）：

```typescript
interface RecipeSchema {
  // 阶段 1：灰度线描感知参数
  lineThreshold: number;        // [0, 100], 边缘强度灵敏度 (默认 50)
  lineNoiseSuppression: number; // 噪点平滑半径 (默认 2)
  lotus3D?: boolean;            // 是否启用 Lotus 3D 几何特征注入 (默认 true)

  // 阶段 2：色调场与等高流场参数
  exposure?: number;            // 曝光校准
  blackPoint?: number;          // [0, 100], 暗部剪切点 (默认 0)
  whitePoint?: number;          // [0, 100], 高光保留点 (默认 100)
  toneContrast: number;         // 对比度拉伸倍率 (默认 1.0)
  toneBrightness: number;       // 亮度偏移 (默认 0.0)
  flowSmoothing: number;        // 流线场导向滤波平滑度 (默认 2)

  // 阶段 3：轮廓与空气透视参数
  contourDetail: number;        // 轮廓线细节密度 (默认 1.0 / 75)
  contourSimplify: number;      // 道格拉斯-普克曲线简化阈值 (默认 1.0)
  aerialStrength?: number;      // 景深衰减与空气透视强度 (默认 60)
  needleWidth: number;          // 基础针尖线宽 (默认 1.0)

  // 阶段 4：微分几何顺形排线参数
  density: number;              // [10, 100], 排线密集度 (默认 50)
  angle: number;                // 基准排线偏转角 (默认 45°)
  crossHatch: boolean;          // 是否启用暗部交叉排线 (默认 false)
  cross?: number;               // 交叉排线强度阈值
  curvatureGate?: number;       // 曲率自适应门控阈值
  waviness: number;             // 手工震荡微扰振幅 (默认 0)

  // 阶段 5：古典边框与母版合成
  frameStyle: 'double' | 'fine' | 'rough' | 'none'; // 古典外框样式 (默认 'double')
  inkGain: number;              // 留墨增益与网点扩大补偿 (默认 0)

  // 铜版物理仿真参数
  acidStrength: number;         // 酸液化学浓度 (默认 0.45)
  grain: number;                // 铜版本构金相晶粒粗糙度 (默认 0.45)
  ink: number;                  // 油墨充盈饱满度 (默认 0.90)
  pressure: number;             // 印刷机滚筒压印压力 (默认 0.65)
  plateTone: number;            // 未咬蚀空白铜面残留油墨调性 (默认 0.04)
  paper: 'rough' | 'smooth' | 'linen' | 'rosaspina'; // 手工版画纸基预设
}
```

---

### [DATA-PLATE-002] 虚拟铜版内存布局 (PlateBufferLayout)
铜版物理引擎在连续内存中的核心场数组（对应 `src/core/plate/engine/virtual-plate-engine.js`）：

| 数组名称 | 类型 | 尺寸 | 语义解释与数值范围 |
| :--- | :--- | :--- | :--- |
| `depthField` | `Float32Array` | $W \times H$ | 刻槽深度场。未咬蚀为 $0.0$，最大理论收敛至 $1.0$ ($\approx 45\,\mu\text{m}$)。 |
| `exposedField` | `Float32Array` | $W \times H$ | 裸铜暴露度场。防蚀漆划开程度 $[0.0, 1.0]$，受酸液 4-邻域侧向潜蚀加宽。 |
| `blockedField` | `Uint8Array` | $W \times H$ | 防蚀漆阻断掩膜。$1$ 表示有漆阻断（钝化），$0$ 表示无漆。 |
| `burrField` | `Float32Array` | $W \times H$ | 金属毛刺高度场。干刻起刺 $[0.0, 1.0]$，刮磨或强酸下单调衰减。 |
| `grainNoise` | `Float32Array` | $W \times H$ | 铜版本构金相微观随机晶粒场 $[0.0, 1.0]$。 |
| `nextExposedField` | `Float32Array` | $W \times H$ | 2D PDE 数值迭代用双缓冲切片，保障因果时间步更新一致性。 |

---

### [DATA-PATH-003] 矢量几何线条 (VectorPath)
```typescript
interface VectorPath {
  points: [number, number][]; // 浮点离散坐标点列 [[x0, y0], [x1, y1], ...]
  width: number;              // 基础笔画宽度 (像素)
  opacity?: number;           // 笔触透明度 [0.0, 1.0]
  role: 'contour' | 'hatch' | 'cross' | 'frame'; // 语义图层角色
  depth?: number;             // 估计刻深 [0.0, 1.0]
}
```

---

### [DATA-BACKUP-004] 铜版存档备份数据 (PlateBackupPayload)
用于保存到本地 JSON 备份文件及持久化恢复（对应 `src/ui/controllers/plate-studio-controller.js#savePlateBackup`）：
```typescript
interface PlateBackupPayload {
  version: 1 | 2;             // 编解码器版本号 (v1 平铺数值数组，v2 采用 Base64 紧凑编码)
  width: number;              // 900 / 1500 / 3000
  height: number;
  depth: number[] | string;   // 深度数据或 PlateCodec Base64 编码串
  exposed: number[] | string;
  blocked: number[] | string;
  burr: number[] | string;
  elapsed: number;            // 累计腐蚀时间 (秒)
  paperMM: number;            // 打印物理尺寸 (默认 254mm)
  seed: number;               // 随机种子
  plateSources: any[];        // 上版母版矢量来源追踪记录
  timestamp: string;          // ISO 8601 创建时间戳
}
```
