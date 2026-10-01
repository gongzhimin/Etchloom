# 5 阶段管线算法原理与离散实现规范 (ALGORITHM_SPEC.md)

> **模块定位**：`src/core/`（离散 5 阶段版画合成管线引擎）  
> **实现目标**：完全数学化解构每一个生成阶段，确保代码实现与理论模型 1:1 映射。

---

## 阶段 1：灰度线描感知抽取 (`Stage1Informative`)

### 1.1 算法流程
1. **输入归一化**：将输入源图片光栅化为离散像素矩阵 $I(x, y) \in [0, 255]$；
2. **多线程/微服务协同**：
   - 优先通过 `AIServiceGateway` 请求本地 `POST /infer`；
   - 若服务无响应（超时 4000ms），无缝触发**自适应几何边缘退避算子 (Geometric Fallback)**：
     - 高斯差分滤波 (Difference of Gaussians, DoG)：
       $$DoG(x, y) = G_{\sigma_1} * I(x, y) - \gamma \cdot G_{\sigma_2} * I(x, y), \quad \sigma_1 = 0.8, \sigma_2 = 1.6, \gamma = 0.98$$
     - 局部对比度自适应阈值二值化：
       $$L(x, y) = \begin{cases} 0.0 & DoG(x, y) > T_{\text{edge}} \\ 1.0 & \text{otherwise} \end{cases}$$
3. **输出**：生成单通道浮点数组 `LineMap.data` ($0.0$ 为纯黑线痕，$1.0$ 为纯白背景)。

---

## 阶段 2：高精度多尺度色调场与各向异性扩散 (`Stage2ToneFlow`)

### 2.1 积分图快速盒状平滑 (`boxBlurFloat`)
通过构建二维双精度浮点积分图 $II(x, y) = \sum_{i \le x, j \le y} A(i, j)$，在 $O(1)$ 常数时间复杂度内解算任意半径 $r$ 的邻域均值：
$$\mu(x, y) = \frac{II(x+r, y+r) - II(x-r-1, y+r) - II(x+r, y-r-1) + II(x-r-1, y-r-1)}{(2r+1)^2}$$

### 2.2 何恺明导向滤波色调分解 (`guidedFilter`)
将曝光度调整后的原始墨量场 $T_{\text{raw}}$ 分解为宏观体积层与高频微结构层：
1. 导向滤波线性系数解算：
   $$a(x, y) = \frac{\text{cov}(I, p)}{\text{var}(I) + \epsilon}, \quad b(x, y) = \bar{p} - a(x, y) \cdot \bar{I}$$
2. 基础色调场：$T_{\text{base}} = \bar{a} \cdot I + \bar{b}$
3. 微结构高频残差场：
   $$D_{\text{detail}}(x, y) = T_{\text{raw}}(x, y) - T_{\text{base}}(x, y)$$
4. 高清色调场重构：
   $$T_{\text{final}}(x, y) = \text{clamp}\left(T_{\text{base}} + D_{\text{detail}} \cdot (0.85 + 0.5 \cdot \text{detailBoost}), 0.0, 1.0\right)$$

---

## 阶段 3：空间骨干轮廓与空气透视衰减 (`Stage3Contours`)

### 3.1 8-邻域中心线追踪与梯度子像素修正 (`traceCenterlines`)
1. 寻找未访问且灰度值低于 `contourThreshold` (默认 0.85) 的候选种子点 $(x, y)$；
2. 沿 8 个离散方向选择未访问且梯度响应最深的邻域点推进；
3. **Sobel 梯度子像素微调**：
   $$g_x = \frac{D(x+1, y) - D(x-1, y)}{2}, \quad g_y = \frac{D(x, y+1) - D(x, y-1)}{2}, \quad |g| = \sqrt{g_x^2 + g_y^2}$$
   $$x_{\text{sub}} = x - 0.25 \cdot \frac{g_x}{|g|}, \quad y_{\text{sub}} = y - 0.25 \cdot \frac{g_y}{|g|}$$

### 3.2 空气透视深度线宽衰减方程 (`modulateContoursByDepth`)
结合 Lotus 估计的空间绝对深度场 $z \in [0.0, 1.0]$（0 近，1 远）：
1. 远景微碎线剪枝：若 $z > 0.88$ 且笔画点数 $\le 4$，直接丢弃；
2. 深度线宽衰减因子：
   $$\alpha_{\max} = 0.65 \cdot \frac{\text{aerialStrength}}{100}$$
   $$\text{depthScale}(z) = \begin{cases} 1.0 & z \le 0.35 \\ \max(1.0 - \alpha_{\max}, 1.0 - \alpha_{\max} \cdot \frac{z - 0.35}{0.65}) & z > 0.35 \end{cases}$$
3. 动态线宽调整：$w_i \leftarrow \max(0.08, w_i \cdot \text{depthScale}(z))$。

---

## 阶段 4：曲面空间几何顺形排线 (`Stage4Hatching`)
集成 15 组细分模块（自注意力机制、曼哈顿刚性立面流、墨量守恒门控与 Jobard-Lefer 流线积分），详见 `src/core/hatching/docs/ALGORITHM_SPEC.md`。

---

## 阶段 5：母版矢量合成与分层整合 (`Stage5MasterPrint`)
1. 笔划语义分类：将轮廓线赋予 `role: 'contour'`，主排线赋予 `role: 'hatch'`，交叉排线赋予 `role: 'cross'`；
2. 估算每个顶点的铜版微刻深度：
   $$d_i = \begin{cases} \min(1.0, 0.45 + w_i \cdot 0.3) & (\text{role} = \text{'contour'}) \\ \min(0.8, 0.15 + w_i \cdot 0.2) & (\text{role} = \text{'hatch'}) \\ \min(0.5, 0.08 + w_i \cdot 0.15) & (\text{role} = \text{'cross'}) \end{cases}$$
3. 打包生成标准化 `MasterResult` 供工坊刻蚀与工业导出。
