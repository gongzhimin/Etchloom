# 虚拟铜版物理仿真测试与 QA 规范 (TESTING.md)

> **被测模块**：`src/core/plate/virtual-plate-engine.js`, `src/core/plate/acid-simulator.js`, `src/core/plate/press-renderer.js`  
> **执行命令**：`node --test tests/virtual-plate-engine.test.cjs tests/plate.test.cjs`  
> **测试框架**：Node.js 原生 Test Runner (`node:test` + `node:assert/strict`)

---

## 1. 测试设计策略与方法学 (Test Strategy & Methodology)

虚拟铜版物理引擎作为涉及连续介质、化学腐蚀 PDE 及机械力学的仿真核心，测试设计严格遵循三大方法学：
1. **物理守恒不变量断言 (Physical Invariants Assertion)**：
   - 防蚀漆掩膜阻断守恒：凡覆盖防蚀漆的区域 ($M[i] == 1$)，无论腐蚀时间 $\Delta t$ 多长，刻痕深度与暴露度增量必须严格为 0；
   - 刻深物理区间守恒：任何工具划线或酸液腐蚀，深度场 $D[i]$ 必须严格单调收敛于 $[0.0, 1.0]$；
   - 毛刺单调衰减守恒：刮磨器或酸液腐蚀作用下，金属毛刺高度 $B[i]$ 必须单调非递增。
2. **离散连续内存与序列化无损往返 (Roundtrip Bit-level Parity)**：
   - 通过 `PlateCodec` 将百万像素连续 TypedArray 编码为 Base64，反序列化后内存必须 0 bit 误差还原。
3. **极限规格与压力测试 (Stress & Boundary Testing)**：
   - 在 3000x2200（660 万像素物理网格）超高分辨率下验证内存分配与撤销栈稳定性。

---

## 2. 测试样本夹具与前置条件 (Fixtures & Preconditions)

- **纯无 DOM 环境要求**：被测引擎在无任何浏览器 DOM（无 `window`, 无 `document`, 无 `HTMLCanvasElement`）的纯 Node.js 进程中直接实例化执行；
- **测试夹具尺寸**：
  - 标准仿真网格：宽 $W = 100$, 高 $H = 80$（用于快速 PDE 迭代验证）；
  - 生产推荐网格：$1500 \times 1100$（2K 分辨率）；
  - 展品极清网格：$3000 \times 2200$（用于内存与长线条压测）。

---

## 3. 测试用例逐项深度解析 (`tests/virtual-plate-engine.test.cjs`)

### 用例 1: `VirtualPlateEngine: Initialization and Allocation`
- **覆盖逻辑**：验证构造函数与 `allocatePlate(w, h)` 的连续内存分配；
- **输入参数**：$W = 200, H = 150, N = 30000$；
- **预期不变量**：
  - `depthField.length === 30000` 且元素初始全为 0；
  - `exposedField.length === 30000` 且元素初始全为 0；
  - `burrField.length === 30000` 且元素初始全为 0；
  - `blockedField.length === 30000` 且元素初始全为 0；
- **核心断言**：`assert.equal(engine.depthField.length, 30000)`，`assert.equal(engine.depthField[0], 0)`。

### 用例 2: `VirtualPlateEngine: 4 plate-making tools have orthogonal physical behaviors`
- **覆盖逻辑**：验证 4 大工具（`needle`, `dry`, `stop`, `polish`）物理更新方程的正交性与互不干扰；
- **测试步骤与断言**：
  1. 刻针 `needle` 在 $(50, 50)$ 划线：断言 `exposedField` 显著大于 0，但 `burrField` 严格为 0（刻针不起毛刺）；
  2. 干刻针 `dry` 在 $(50, 50)$ 划线：断言 `burrField` 显著大于 0 且 `depthField` 大幅增加；
  3. 防蚀漆 `stop` 在 $(50, 50)$ 涂抹：断言 `blockedField` 变为 1，且原有 `exposedField` 与 `burrField` 被重置为 0；
  4. 刮磨器 `polish` 作用于毛刺区：断言 `burrField` 数值单调下降（毛刺被压平）。

### 用例 3: `VirtualPlateEngine: Chemical acid bite PDE simulation and stop-out protection`
- **覆盖逻辑**：验证 `stepAcid(dt, strength, grain)` 的 2D PDE 扩散解算与防蚀漆绝对阻断；
- **测试步骤**：
  - 左半区划出暴露线，右半区覆盖防蚀漆；
  - 连续执行 10 步酸液侵蚀迭代（$\Delta t = 1.0, S = 0.5$）；
- **核心断言**：
  - 暴露区：`depthField` 随时间步单调深化；
  - 阻断区：`depthField` 增量严格等于 0 (`assert.equal(depthField[blockedIdx], 0)`)。

### 用例 4: `VirtualPlateEngine: Pure headless rendering and horizontal mirroring`
- **覆盖逻辑**：验证无 DOM 纯数学离散位图压印与物理铜版到纸张印样的水平镜像翻转；
- **断言**：印样位图数组尺寸等于 $4 \times W \times H$，且左侧刻线在印样中严格映射到右侧。

### 用例 5: `VirtualPlateEngine: Snapshot and Undo Stack`
- **覆盖逻辑**：验证内存快照保存与撤销栈恢复机制；
- **断言**：涂覆工具后 `undo()`，TypedArray 物理场逐字节恢复至初始快照状态。

### 用例 6: `VirtualPlateEngine: Serialization and Roundtrip with PlateCodec`
- **覆盖逻辑**：验证 `exportState()` 与 `importState()` 结合 Base64 编解码；
- **断言**：导出状态包含版本号 2 与 Base64 字符串，重新导入后刻深误差 $\Delta = 0$。

---

## 4. 性能与基准测试阈值 (Performance Thresholds)

| 规格 | 分辨率 | 单步酸蚀 PDE 允许耗时 | 工具划线单笔允许耗时 | 内存占用上限 |
| :--- | :--- | :--- | :--- | :--- |
| **标准轻量** | $900 \times 660$ | $\le 8 \text{ ms}$ | $\le 2 \text{ ms}$ | $\le 16 \text{ MB}$ |
| **2K 高清** | $1500 \times 1100$ | $\le 25 \text{ ms}$ | $\le 5 \text{ ms}$ | $\le 45 \text{ MB}$ |
| **3K 极清** | $3000 \times 2200$ | $\le 90 \text{ ms}$ | $\le 15 \text{ ms}$ | $\le 180 \text{ MB}$ |

---

## 5. 故障排查与断言失效诊断指南 (Troubleshooting)

1. **若酸蚀深度在未划线区域增加**：
   - 检查 `acid-simulator.js` 的 `exposed[i]` 初始值是否非零，确认双缓冲 `nextExposedField` 在循环前是否完整 `set(exposed)`；
2. **若撤销后毛刺依然存在**：
   - 检查 `virtual-plate-engine.js` 的快照深拷贝逻辑是否遗漏了 `burrField.slice()`；
3. **若 `PlateCodec` 报 Base64 解码长度不匹配**：
   - 检查当前网格 $W \times H$ 与传入状态的 `width * height` 是否一致，确认 `Float32Array` 是否按 4 字节字节对齐。
