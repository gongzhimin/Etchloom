# 几何排线与流场子系统测试与 QA 规范 (TESTING.md)

> **被测模块**：`src/core/hatching/` 下全部 15 个细分算法模块  
> **执行命令**：`node --test tests/hatching-modular.test.cjs tests/hatch-attention.test.cjs tests/hatch-facade.test.cjs tests/universal-hatching.test.cjs tests/geometry-flow.test.cjs`  
> **测试框架**：Node.js 原生 Test Runner

---

## 1. 测试设计策略与核心数学不变量

1. **自抑制空间衰减验证 (Self-Inhibition Decay)**：
   - 验证线描图反转后，局部墨量经卷积平滑产生的自抑制场在密集轮廓处严格趋于 1.0；
2. **曼哈顿立面刚性吸附 (Manhattan Flow Invariant)**：
   - 验证任意倾斜角度在古建立面规则下，输出切线严格等于 $0, \frac{\pi}{2}, \pi, \frac{3\pi}{2}$；
3. **欧氏距离场 (Exact SDF) 连续性与保凸性**：
   - 验证边界内点距离严格为正，边界外点严格为负，梯度模长在光滑区满足 eikonal 方程 $\|\nabla d\| = 1$；
4. **Jobard-Lefer 流线确定性与无碰撞不变量**：
   - 相同种子点与流场下流线轨迹点 100% 吻合，任意两流线间距不低于 $d_{\text{sep}}$。

---

## 2. 核心测试用例深度解析

### 用例 1: `Sub-Module 3.1: HatchAttention computes line spatial self-inhibition` (`tests/hatch-attention.test.cjs`)
- **测试目的**：验证轮廓线条周围自注意力抑制场的正确生成；
- **输入**：中心带有纯黑十字线描的测试图；
- **断言**：十字线中心及周围 $\sigma$ 半径内，`inhibitionField` 达到 1.0；远离十字线的空白区 `inhibitionField` 严格为 0。

### 用例 2: `Sub-Module 2.6: HatchManhattanFlow snaps architectural flow to rigid axes` (`tests/hatch-facade.test.cjs`)
- **测试目的**：验证立面流切线吸附；
- **输入**：倾斜 $15^\circ$ 的连续向量场；
- **断言**：吸附后输出切线角误差与水平轴 $0^\circ$ 相比绝对值小于 $10^{-5}$。

### 用例 3: `Sub-Module 2.3: Jobard-Lefer streamline generation guarantees highlight safety` (`tests/hatching-modular.test.cjs`)
- **测试目的**：验证高光留白与无碰撞流线；
- **断言**：高光白场区 ($T < 0.05$) 没有任何流线点穿刺，且所有生成线条之间无交叉重叠。
