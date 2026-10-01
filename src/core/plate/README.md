# Virtual Copperplate Simulation Engine (`src/core/plate/`)

> **模块路径**：`src/core/plate/`  
> **技术定位**：Layer 1 纯物理仿真层，数值解算一维连续行优先内存上的二维偏微分化学酸蚀扩散方程、金属毛刺干刻与纯位图凹版压印拓印。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

1. **连续物理版面内存建模 (`engine/virtual-plate-engine.js`)**：分配 4 块一维行优先平铺连续 TypedArray（`depth`, `exposed`, `burr`, `blocked`），实现 100% 解耦的无 DOM 纯数据运算；
2. **偏微分方程化学酸蚀仿真 (`physics/acid-simulator.js`)**：数值离散化求解侧向咬蚀各向同性扩散与纵向加深非线性方程，严格受防蚀漆掩膜守恒阻断；
3. **纯位图凹版压印渲染 (`renderer/press-renderer.js`)**：仿真油墨填入凹槽、刮墨刀擦版与滚筒极压物理转印，支持水平镜像与纯位图 RGBA 像素合成；
4. **无损版面序列化 (`codecs/plate-codec.js`)**：与上级编解码器联动，实现 Float32Array 物理版面与 Base64 紧凑格式互转。

---

## 2. 内部架构与组件拓扑 (Internal Architecture & Component Map)

```
src/core/plate/
├── engine/                   # 虚拟铜版引擎核心生命周期
│   └── virtual-plate-engine.js # VirtualPlateEngine (内存分配/工具笔触/快照撤销)
├── physics/                  # 偏微分物理仿真算子
│   └── acid-simulator.js     # simulateAcidBite (2D PDE 各向同性扩散与毛刺衰减)
├── renderer/                 # 凹版压印物理转印渲染器
│   └── press-renderer.js     # renderPlate (凹槽填墨/表面擦净/物理转印)
├── docs/                     # 物理数学推导与数值仿真规范
│   ├── ALGORITHM_SPEC.md     # 2D PDE 扩散方程与 4 工具物理模型推导
│   ├── ARCHITECTURE.md       # TypedArray 物理生命周期与数据拓扑
│   └── TESTING.md            # 物理不变量、酸液守恒与单测断言解析
└── README.md                 # 铜版物理仿真总览
```

| 子目录 / 文件 | 核心类 / 导出对象 | 物理与算法角色 |
| :--- | :--- | :--- |
| `engine/virtual-plate-engine.js` | `VirtualPlateEngine` | 铜版无 DOM 物理引擎，管理 4 块连续 TypedArray 与 4 种物理制版工具 |
| `physics/acid-simulator.js` | `simulateAcidBite` | 偏微分方程化学酸蚀仿真，数值解算侧蚀扩散与干刻金属毛刺酸溶衰减 |
| `renderer/press-renderer.js` | `renderPlate` | 纯位图凹版压印渲染器，实现凹槽填墨、版面擦试与极压转印物理仿真 |

---

## 3. 核心算法原理与数学建模摘要 (Mathematical Principles)

详见 [docs/ALGORITHM_SPEC.md](docs/ALGORITHM_SPEC.md)：
- **2D 偏微分方程各向同性侧蚀扩散**：
  $$E^{t+\Delta t} = \min\left(1.0, E^t + \max(0, E_{\text{edge}} - E^t) \cdot \Delta t \cdot S \cdot (0.14 + 0.55 G \eta)\right)$$
- **纵向咬蚀加深非线性方程**：
  $$D^{t+\Delta t} = \min\left(1.0, D^t + E^{t+\Delta t} \cdot \Delta t \cdot S \cdot (0.010 + 0.035 G \eta)\right)$$
- **干刻金属毛刺酸液溶解衰减**：
  $$B^{t+\Delta t} = B^t \cdot (1.0 - 0.28 \cdot \Delta t \cdot S)$$

---

## 4. 自动化测试与验证 (Testing & Verification)

针对本模块的自动化测试包括：
- [`tests/virtual-plate-engine.test.cjs`](../../../tests/virtual-plate-engine.test.cjs)（6 项：内存分配、4 工具物理正交性、偏微分酸蚀扩散、纯位图压印、快照撤销栈、PlateCodec 存盘）
- [`tests/plate.test.cjs`](../../../tests/plate.test.cjs)（5 项：工具交互、撤销重做）

运行命令：
```bash
node --test tests/virtual-plate-engine.test.cjs tests/plate.test.cjs
```

---

## 5. 子文档导航 (Sub-documentation Index)

- [docs/ALGORITHM_SPEC.md](docs/ALGORITHM_SPEC.md)：2D PDE 侧蚀偏微分方程数值解算推导
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：一维连续 TypedArray 物理生命周期设计
- [docs/INTERFACE_SPEC.md](docs/INTERFACE_SPEC.md)：虚拟铜版引擎与偏微分物理仿真接口设计规范
- [docs/TESTING.md](docs/TESTING.md)：物理守恒定律与单测断言解析
