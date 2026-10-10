---
title: 核心模块离散算法与物理仿真规范
status: Active
doc-id: ALG-CORE
owner-module: core
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:40:00+08:00
---

# 核心模块离散算法与物理仿真规范 (ALG-CORE)

## 1. 算法背景与数学模型

本模块承载莫兰迪版画系统的底层物理与几何数学计算，包含 5 阶段离散图像管线以及 2D 偏微分方程虚拟铜版物理仿真：

### 1.1 5 阶段离散解算数学模型
1. **阶段 1：灰度线描感知抽取**：基于双尺度高斯差分算子 (DoG) 与自适应几何边缘退避算子：
   $$DoG(x, y) = G_{\sigma_1} * I(x, y) - \gamma \cdot G_{\sigma_2} * I(x, y), \quad \sigma_1 = 0.8, \sigma_2 = 1.6, \gamma = 0.98$$
2. **阶段 2：色调分解与几何切线场**：基于何恺明导向滤波（Guided Filter）的低频体积分解：
   $$a(x, y) = \frac{\text{cov}(I, p)}{\text{var}(I) + \epsilon}, \quad b(x, y) = \bar{p} - a \cdot \bar{I}, \quad T_{\text{base}} = \bar{a} \cdot I + \bar{b}$$
3. **阶段 3：空间骨干轮廓追踪与空气透视**：Sobel 梯度子像素微调与深度线宽衰减方程：
   $$\text{depthScale}(z) = \begin{cases} 1.0 & z \le 0.35 \\ \max(1.0 - \alpha_{\max}, 1.0 - \alpha_{\max} \cdot \frac{z - 0.35}{0.65}) & z > 0.35 \end{cases}$$
4. **阶段 4：顺形曲面排线与 Jobard-Lefer 流线积分**：曲率自适应配额释放与 Runge-Kutta 2 阶 (RK2) 双向流线积分：
   $$(x', y') = (x_k, y_k) + \frac{ds}{2} \cdot \vec{v}(x_k, y_k), \quad (x_{k+1}, y_{k+1}) = (x_k, y_k) + ds \cdot \vec{v}(x', y')$$
5. **阶段 5：母版矢量合成**：基于笔划角色（`contour` / `hatch` / `cross`）的微刻深度归一化赋值。

### 1.2 2D 偏微分酸液咬蚀物理模型
仿真空间建立在连续一维数组模拟的二维网格上。反应动力学时间步长经过真实物理秒定标，引入有效反应速率因子 $\Delta t_{\text{eff}} = \Delta t \times 0.4$。未被防蚀漆阻断的像素满足：
- **侧向侧蚀扩散 (Lateral Under-cutting)**：
  $$E^{t+\Delta t}(x, y) = \min\left(1.0, E^t(x, y) + \max(0, E_{\text{edge}} - E^t(x, y)) \cdot \Delta t_{\text{eff}} \cdot S \cdot (0.14 + G \cdot \eta(x, y) \cdot 0.55)\right)$$
- **纵向咬蚀深化 (Vertical Bite Deepening)**：
  $$D^{t+\Delta t}(x, y) = \min\left(1.0, D^t(x, y) + E^{t+\Delta t}(x, y) \cdot \Delta t_{\text{eff}} \cdot S \cdot 0.058 \cdot (1.0 + G \cdot (\eta(x, y) - 0.5))\right)$$
- **金属毛刺钝化溶解 (Burr Dissolution)**：
  $$B^{t+\Delta t}(x, y) = \max\left(0, B^t(x, y) - \Delta t_{\text{eff}} \cdot S \cdot 0.14\right)$$

## 2. 算法流程与伪代码

```text
算法 1: 5 阶段管线主解算流程
输入: 图像像素矩阵 I, 参数选项 Opt
输出: 矢量母版 MasterResult

1: // 阶段 1: 边缘提取与降级回退
2: Sketch <- CallAIService(I) 超时降级至 DoGFilter(I)
3: // 阶段 2: 积分图加速导向滤波
4: (BaseTone, DetailTone, FlowField) <- GuidedFilterDecomposition(I, Opt)
5: // 阶段 3: 8-邻域中心线追踪与子像素修正
6: Contours <- TraceCenterlinesWithSobel(Sketch, DepthMap, Opt)
7: // 阶段 4: Jobard-Lefer 流线积分
8: Hatches <- JobardLeferRK2Streamlines(FlowField, BaseTone, SpatialHashGrid)
9: // 阶段 5: 母版封装与深度赋予
10: return PackageMasterResult(Contours, Hatches)
```

## 3. 边界条件与数值稳定性

1. **导向滤波方差下界**：计算协方差与方差时，分母必须增加正则化系数 $\epsilon = 10^{-4}$，防止纯平坦单色区域除零产生 NaN。
2. **空间网格碰撞桶越界**：网格加速单元按 $d_{\text{cell}} = d_{\text{sep}}$ 划分，坐标映射索引必须执行 `clamp(0, maxBucket - 1)` 边界收敛。
3. **双缓冲因果一致性**：酸液侧向扩散更新采用预分配的 `nextExposedField`，解算完成后一次性通过 `.set()` 回写，防止原地更新造成非对称扩散偏差。

## 4. 复杂度分析与性能基准

| 算法子系统 | 时间复杂度 | 空间复杂度 | 性能指标 (1024x1024 画布) |
| :--- | :--- | :--- | :--- |
| **积分图平滑** | $O(W \times H)$ | $O(W \times H)$ Float64 | $< 18\text{ms}$ |
| **导向滤波** | $O(W \times H)$ | $O(W \times H)$ Float32 | $< 45\text{ms}$ |
| **Jobard-Lefer 排线** | $O(N_{\text{samples}})$ (空间散列桶) | $O(N_{\text{buckets}})$ | $< 120\text{ms}$ |
| **2D 偏微分酸液模拟** | $O(W \times H \times \text{steps})$ | $O(W \times H)$ 双缓冲 | $< 25\text{ms}$ / 单步 |

## 5. 验证与黄金样本

1. **物理单调递增性验证**：在未刮磨且持续浸酸条件下，全局腐蚀深度 $D(x, y)$ 必须单调递增，即 $\forall t_2 > t_1, D^{t_2}(x, y) \ge D^{t_1}(x, y)$；
2. **防蚀漆零腐蚀验证**：覆盖防蚀漆区域（$M[i] == 1$）在酸槽中经历任意时间步后，深度必须保持不变（误差 $\le 10^{-7}$）；
3. **黄金样本回归**：`tests/core-pipeline.test.js` 固化标准莫兰迪静物测试图像，断言生成笔画总数与拓扑闭合度处于公差范围内。
