# 几何排线子系统数学原理与离散算法规范 (ALGORITHM.md)

> **模块定位**：`src/core/hatching/`（15 个曲面流场与排线子模块）  
> **核心任务**：彻底解决版画生成中的斑马纹乱排、轮廓处线条堆积及高光面脏乱问题。

---

## 1. 线稿空间自注意力抑制机制 (`HatchAttention`)

### 1.1 物理动机
当版画轮廓或头发丝处已经存在密集线描时，排线算法严禁横穿这些精细结构，否则会造成墨水重叠产生黑斑。

### 1.2 数学方程
1. 墨量响应反转：$\text{ink}(x, y) = \max(0.0, 1.0 - \text{LineMap}(x, y))$；
2. 局部空间注意力积分卷积：
   $$\bar{\text{ink}}(x, y) = \text{boxBlurFloat}(\text{ink}, \sigma), \quad \sigma = \max(7, \lfloor W / 80 \rfloor)$$
3. 非线性自抑制门控场：
   $$I(x, y) = \min\left(1.0, \max\left(0.0, \left(\frac{\bar{\text{ink}}(x, y)}{\text{satThresh}}\right)^{1.2}\right)\right), \quad \text{satThresh} = 0.08$$
当局部线稿密度达到 8% 时，抑制率迅速饱和至 1.0，完全阻断排线种子点的生成。

---

## 2. 空间墨量守恒与曲率门控 (`HatchInkBudget`)

### 2.1 表面曲率张量估算
通过对表面法线场 $\vec{N} = (N_x, N_y, N_z)$ 计算空间偏导，估算局部微分几何曲率：
$$\kappa(x, y) = \sqrt{\left(\frac{\partial N_x}{\partial x}\right)^2 + \left(\frac{\partial N_x}{\partial y}\right)^2} + \sqrt{\left(\frac{\partial N_y}{\partial x}\right)^2 + \left(\frac{\partial N_y}{\partial y}\right)^2}$$

### 2.2 曲率自适应配额释放方程
1. **平整平面判定 (Planar Exemption)**：
   若 $\kappa(x, y) < 0.035$（如白墙、平整桌面、天空），排线配额强制归零：
   $$\text{budget}(x, y) = 0.0$$
2. **3D 曲面顺形排线放宽**：
   当 $\kappa \ge 0.035$ 时，说明该区域是器皿、脸庞或立体曲面，动态放宽饱和度容忍上限：
   $$\text{satThreshold} = 0.40 + \min\left(0.45, (\kappa - 0.035) \cdot 6.0\right)$$
   只有在既有轮廓墨量未超出该上限时，才允许根据局部色调 $T$ 发放排线配额。

---

## 3. Jobard-Lefer 确定性曲率流线生成 (`HatchStreamline`)

### 3.1 空间散列网格碰撞加速 (`SpatialHashGrid`)
将画布划分为大小为 $d_{\text{cell}} = d_{\text{sep}}$ 的正方形网格桶。任意测试点 $(x, y)$ 只需在周围 $3 \times 3$ 邻域桶内进行两点间距平方运算 $dx^2 + dy^2 < d_{\text{sep}}^2$，使碰撞检测在 $O(1)$ 时间内完成。

### 3.2 动态非线性色调排线间距
根据局部色调 $T \in [0.0, 1.0]$，流线发射间距遵循幂次衰减曲线：
$$d_{\text{sep}}(T) = d_{\min} + (1.0 - T)^{1.25} \cdot (d_{\max} - d_{\min})$$
中间调排线疏朗，重阴影排线紧密。

### 3.3 Runge-Kutta 2 阶 (RK2) 双向流线数值积分
从种子点 $(x_0, y_0)$ 开始，沿切线向量场 $\vec{v}(x, y)$ 双向（正向与反向）步进积分：
1. 预测步：$\vec{v}_1 = \vec{v}(x_k, y_k), \quad (x', y') = (x_k, y_k) + \frac{ds}{2} \cdot \vec{v}_1$；
2. 校正步：$\vec{v}_2 = \vec{v}(x', y'), \quad (x_{k+1}, y_{k+1}) = (x_k, y_k) + ds \cdot \vec{v}_2$；
3. 终止判据：
   - 步进越过画布边界；
   - 局部色调 $T < 0.05$（进入高光纸面）；
   - 遭遇空间网格距离碰撞（避免与其他流线打架）。

---

## 4. 建筑立面刚性曼哈顿吸附 (`HatchManhattanFlow`)
对古建筑平整立面，将任意连续切线角 $\theta$ 刚性投影至 4 个主要几何轴向：
$$\theta_{\text{snap}} = \arg\min_{\phi \in \{0, \frac{\pi}{2}, \pi, \frac{3\pi}{2}\}} |\theta - \phi|$$
保证古建柱梁、屋檐下阴影排线保持严整的横平竖直。
