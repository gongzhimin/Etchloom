# Hatching & Flow Field Subsystem (`src/core/hatching/`)

> **模块路径**：`src/core/hatching/`  
> **技术定位**：Layer 1 纯域算法层，包含 15 个细分排线算法模块，负责二维/三维切线流场解算、墨量守恒约束、刚性立面吸附与 Jobard-Lefer 确定性流线积分生成。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

在版画生成中，传统算法常遭遇“白墙出现杂乱斑马纹”、“轮廓线边缘线条重叠发黑”、“高光区域无法洁净留白”三大痛点。本子系统通过几何流场与物理约束彻底根除这些缺陷：
1. **空间自注意力抑制**：线稿与轮廓周围自动生成自抑制势场，防止排线穿刺；
2. **微分几何曲率门控**：平整平面（$\kappa < 0.035$）强制清空排线，立体曲面顺形放宽；
3. **刚性曼哈顿立面流**：古建筑立面切线正交吸附到水平/垂直主轴；
4. **确定性流线积分**：基于空间散列网格 $O(1)$ 碰撞检测的 Jobard-Lefer 流线追踪，杜绝伪随机断头线；
5. **墨量空间守恒**：严格限制单位面积最大出墨量，保障留白呼吸感。

---

## 2. 内部架构与组件拓扑 (Internal Architecture & Component Map)

本模块经过严格的结构化分层重构，将 15 个细分排线算法模块拆归入 3 个高内聚、职责清晰的专属子目录，彻底消灭根目录平铺文件：

```
src/core/hatching/
├── fields/                 # 流场计算层 (Vector & Geometry Fields)
│   ├── hatch-field.js          # 拓扑交叉场与主次正交切线场
│   ├── hatch-geometry-flow.js  # 3D 表面法线等高切线与曲率场
│   ├── hatch-manhattan-flow.js # 建筑立面切线正交主轴投影吸附
│   └── hatch-volume.js         # 宏观体积明暗流向引导
├── rules/                  # 门控与约束层 (Gating Rules & Budgets)
│   ├── hatch-attention.js      # 线稿空间自抑制高斯积分核
│   ├── hatch-coherence-gate.js # 结构张量相干度解算与平面排空
│   ├── hatch-facade-rules.js   # 平整立面检测与高光留白保护
│   ├── hatch-focus-protection.js # 主体对焦点边缘保护与背景隔离
│   ├── hatch-ink-budget.js     # 空间墨量守恒与法线曲率门控
│   └── hatch-material-rules.js # 食材豁免与瓷器平滑表面单向约束
├── curves/                 # 流线追踪与导出层 (Curve Tracing & Optimization)
│   ├── hatch-distance.js       # 8-point 二维欧氏距离变换 (Exact SDF)
│   ├── hatch-streamline.js     # 空间散列网格加速的 Jobard-Lefer 流线积分器
│   ├── hatch-optimizer.js      # 贪心最近邻路径串联与双向蛇形走刀优化
│   ├── hatch-tone.js           # 拐点高光抑制与 5 级阶跃切片
│   └── hatch-background.js     # 暗角渐变与自然阴影背景呼吸场
└── docs/                   # 架构设计、算法原理与测试文档
```

| 子目录 / 文件 | 核心类 / 导出对象 | 算法角色 |
| :--- | :--- | :--- |
| `fields/hatch-field.js` | `HatchField` | 拓扑交叉场与主次正交切线场生成 |
| `fields/hatch-geometry-flow.js` | `HatchGeometryFlow` | Lotus 3D 表面法线等高切线与曲率场计算 |
| `fields/hatch-manhattan-flow.js` | `HatchManhattanFlow` | 建筑立面切线曼哈顿正交主轴投影吸附 |
| `fields/hatch-volume.js` | `HatchVolume` | 几何形体宏观体积明暗流向引导 |
| `rules/hatch-attention.js` | `HatchAttention` | 线稿空间自抑制高斯积分核，局部饱和门控 |
| `rules/hatch-coherence-gate.js` | `HatchCoherenceGate` | 结构张量相干度 $C$ 解算，清空各向同性混乱区域 |
| `rules/hatch-facade-rules.js` | `HatchFacadeRules` | 古建筑平整立面检测与高光大面积留白保护 |
| `rules/hatch-focus-protection.js` | `HatchFocusProtection` | 主体对焦点边缘保护与背景隔离 |
| `rules/hatch-ink-budget.js` | `HatchInkBudget` | 墨量守恒积分方程与基于 NormalMap 的表面曲率张量门控 |
| `rules/hatch-material-rules.js` | `HatchMaterialRules` | 食材豁免与瓷器平滑表面单向约束 |
| `curves/hatch-distance.js` | `HatchDistance` | 8-point 二维欧氏距离变换 (Exact Signed Distance Field) |
| `curves/hatch-streamline.js` | `HatchStreamline` | 空间散列网格加速的 Jobard-Lefer 双向 RK2 阶流线积分器 |
| `curves/hatch-optimizer.js` | `HatchOptimizer` | 贪心最近邻路径串联与双向蛇形走刀优化 |
| `curves/hatch-tone.js` | `HatchTone` | 拐点高光抑制与 5 级阶跃切片 |
| `curves/hatch-background.js` | `HatchBackground` | 暗角渐变与自然阴影背景呼吸场 |

---

## 3. 核心算法原理与数学建模 (Mathematical Principles)

详见 [docs/ALGORITHM.md](docs/ALGORITHM.md)：
- **自注意力抑制场**：$I(x, y) = \min(1.0, (\frac{\bar{\text{ink}}}{\text{satThresh}})^{1.2})$
- **表面曲率张量**：$\kappa = \|\nabla N_x\| + \|\nabla N_y\|$
- **曼哈顿正交投影**：$\theta_{\text{snap}} = \arg\min_{\phi \in \{0, \frac{\pi}{2}, \pi, \frac{3\pi}{2}\}} |\theta - \phi|$
- **动态流线间距曲线**：$d_{\text{sep}}(T) = d_{\min} + (1 - T)^{1.25} \cdot (d_{\max} - d_{\min})$

---

## 4. 自动化测试与验证 (Testing & Verification)

覆盖本排线子系统的自动化测试包括：
- [`tests/hatching-modular.test.cjs`](../../../tests/hatching-modular.test.cjs)（6 项：调子截断、SDF 距离场、流线积分）
- [`tests/hatch-attention.test.cjs`](../../../tests/hatch-attention.test.cjs)（3 项：空间自抑制核、材质规则）
- [`tests/hatch-facade.test.cjs`](../../../tests/hatch-facade.test.cjs)（3 项：平整立面检测、曼哈顿轴向吸附）
- [`tests/universal-hatching.test.cjs`](../../../tests/universal-hatching.test.cjs)（3 项：通用墨量守恒、相干门控）
- [`tests/geometry-flow.test.cjs`](../../../tests/geometry-flow.test.cjs)（6 项：法线等高切线、流场连续性）
- [`tests/high-precision-tone-flow.test.cjs`](../../../tests/high-precision-tone-flow.test.cjs)（3 项：微纹理细节场、各向异性扩散）

运行全部排线测试命令：
```bash
node --test tests/hatching-modular.test.cjs tests/hatch-attention.test.cjs tests/hatch-facade.test.cjs tests/universal-hatching.test.cjs tests/geometry-flow.test.cjs tests/high-precision-tone-flow.test.cjs
```

---

## 5. 子文档导航 (Sub-documentation Index)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：15 模块拓扑关系与依赖调用链
- [docs/ALGORITHM.md](docs/ALGORITHM.md)：详细微分几何公式推导与离散实现步骤
- [docs/INTERFACES.md](docs/INTERFACES.md)：流场、规则与曲线算子强类型接口设计与契约规范
- [docs/TESTING.md](docs/TESTING.md)：排线测试矩阵与测试用例说明
