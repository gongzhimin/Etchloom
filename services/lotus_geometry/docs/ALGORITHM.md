# Lotus 3D 空间几何与法线切线场推导规范 (ALGORITHM.md)

> **模块定位**：`services/lotus_geometry/`（单目深度估计与表面法线投影推理服务）  
> **核心验收标准**：**“完全映射出原理，完全能够做到依据文档也能独立复现出生产代码”**。

---

## 1. 物理背景与算法动机 (Physical & Algorithmic Motivation)

传统平面排线无法体现三维物体的宏观体积感与空间深度（如圆柱体、球体或复杂人像面部转折）。通过 Lotus 几何推理网络，可以获取单目图像的精确空间绝对深度图 ($z \in [0, 1]$) 与表面法线单位向量场 ($\mathbf{n} = (n_x, n_y, n_z)$)。

基于三维表面法线，算法能够直接计算空间等高横截面切线（Cross-Contour Tangent），使排线如同真实雕刻刀在三维立体铜版曲面上顺形滑过。

---

## 2. 数学符号与输入前置条件 (Preconditions & Mathematical Symbols)

| 符号 | 维度 / 类型 | 物理含义 | 约束 |
| :--- | :--- | :--- | :--- |
| $\mathbf{n}(x, y)$ | $\mathbb{R}^3$ 单位向量 | 像素 $(x, y)$ 处的表面外法线向量 | $\|\mathbf{n}\| = 1$ |
| $z(x, y)$ | 标量 $\in [0.0, 1.0]$ | 归一化相机坐标系深度 (0 近，1 远) | 单调递增 |
| $\mathbf{t}_{\text{cross}}(x, y)$ | $\mathbb{R}^2$ 单位向量 | 二维投影平面上的表面顺形切线方向 | $\|\mathbf{t}\| = 1$ |

---

## 3. 连续空间数学几何推导 (Continuous Geometry Formulation)

### 3.1 表面法线二维顺形切线投影

设视线方向为相机光轴负方向 $\mathbf{v} = (0, 0, -1)^T$。三维物体表面的等高截面切线向量 $\mathbf{T}_{3D}$ 满足既与法线垂直、又与曲面横截面平行的几何约束：

$$\mathbf{T}_{3D} = \mathbf{n} \times (0, 0, 1)^T = \begin{pmatrix} n_x \\ n_y \\ n_z \end{pmatrix} \times \begin{pmatrix} 0 \\ 0 \\ 1 \end{pmatrix} = \begin{pmatrix} n_y \\ -n_x \\ 0 \end{pmatrix}$$

投影至二维图像屏幕坐标系：

$$\mathbf{t}_{\text{cross}} = \frac{(n_y, -n_x)^T}{\sqrt{n_x^2 + n_y^2 + \epsilon}}$$

**物理性质验证**：
- 对于垂直圆柱体，水平截面法线为 $(n_x, 0, n_z)$，其计算得到的切线为 $(0, -n_x)$，严格指向垂直方向（沿母线顺形）；
- 对于水平圆柱体，切线严格指向水平方向。

---

### 3.2 空气透视线宽衰减方程 (Atmospheric Depth Modulation)

在古典版画技法中，远景线条应更加细浅虚化以形成空间纵深感。设初始线宽为 $w_0$，最大衰减系数为 $\alpha = 0.45$：

$$w(z) = w_0 \cdot \max\left(1 - \alpha, 1 - \alpha \cdot \frac{z - 0.35}{0.65}\right), \quad z \in [0.35, 1.0]$$

当 $z < 0.35$（近景主体）时，保持 $100\%$ 原始线宽。

---

## 4. 依据本规范的代码映射

- Lotus 推理管线：`services/lotus_geometry/pipeline_lotus.py`
- 几何向量计算工具：`services/lotus_geometry/utils_geometry.py`
- 阶段 3 与阶段 4 前端对接：`src/core/pipeline/stage3-contours.js`, `stage4-hatching.js`
