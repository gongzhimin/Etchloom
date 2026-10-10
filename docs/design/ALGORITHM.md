---
title: 全系统通用算法方案与计算框架
status: Active
doc-id: ALG-SYS
owner-module: root
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:25:00+08:00
---

# 全系统通用算法方案与计算框架

## 1. 算法清单

| 算法标识 | 算法名称 | 核心用途 | 权威实现位置 |
| :--- | :--- | :--- | :--- |
| **`ALG-PIPE-DAG`** | 五阶段母版生成管线 | 将静态图像离散转化为矢量排线母版 | `src/core/pipeline/pipeline-runner.js` |
| **`ALG-IMG-DOWNSAMPLE`** | 尺寸自适应等比下采样 | 控制大图输入尺寸与内存预算，防 OOM | `src/core/image/photo-pro.js` |
| **`ALG-CACHE-DJB2`** | 拓扑内容敏感哈希 | 对阶段入参计算敏感指纹，实现增量重算 | `src/orchestration/cache/stage-cache.js` |

*注：局部专用算法（如 Jobard-Lefer 微分流线排线、2D PDE 酸液潜蚀仿真）严格归属于 [`src/core/docs/design/ALGORITHM.md`](../../src/core/docs/design/ALGORITHM.md)。*

## 2. 算法定义

### 2.1 五阶段母版离散计算管线 (`ALG-PIPE-DAG`)
- **问题陈述**：自然图像具有连续平滑色调与无序噪声，必须转化为符合古典版画物理雕刻规律的离散黑白线条。
- **阶段流转**：
  1. 阶段 1 · 灰度线描感知抽取（DoG 几何滤波与本地神经网络双轨）；
  2. 阶段 2 · 色调场与 3D 等高切线流场分解（何恺明导向滤波与张量流）；
  3. 阶段 3 · 空间骨干轮廓与空气透视衰减（8-邻域中心线追踪与 Sobel 梯度微调）；
  4. 阶段 4 · 曲率门控空间顺形排线（微分几何流线积分与留墨预算守恒，强制采用 `(pt[0] ?? pt.x)` 坐标解构与 `Number.isFinite` 屏障防 `NaN` 毒化）；
  5. 阶段 5 · 母版矢量合成与古典画框集成（图层拓扑融合与刻深初估）。
- **复杂度与边界**：时间复杂度 $O(W \cdot H)$，空间复杂度稳定在 $50\,\text{MB}$ 以内。

### 2.2 尺寸自适应下采样算法 (`ALG-IMG-DOWNSAMPLE`)
- **问题陈述**：超大分辨率输入（如 8K 照片）会导致密集计算内存暴增并引发主线程掉帧。
- **数学方程**：
  $$\text{scale} = \min\left(1.0, \frac{\text{MAX\_DIM}}{\max(W_{\text{src}}, H_{\text{src}})}\right), \quad \text{MAX\_DIM} = 1800\,\text{px}$$
- **正确性条件**：长宽比严格保真，缩放后最大边长严格 $\le 1800\,\text{px}$。

### 2.3 DJB2 变体内容敏感哈希 (`ALG-CACHE-DJB2`)
- **问题陈述**：用户调整单一参数时，避免全流程重算，实现毫秒级交互反馈。
- **递推方程**：
  $$H_k = ((H_{k-1} \ll 5) + H_{k-1}) \oplus C_k, \quad H_0 = 5381$$
- **性能指标**：阶段 4 单独重算时复用阶段 1–3 缓存，延迟从 $350\,\text{ms}$ 降至 $12\,\text{ms}$。

## 3. 验证策略

- **黄金样本比对**：通过测试套件比对确定性输入下的输出一致性（参见 `tests/five-stage-pipeline.test.cjs`）；
- **数值边界与对抗验证**：执行 `NaN` 毒化与负值参数攻击（参见 `tests/adversarial-resilience.test.cjs` 与 [`verification/TESTING.md`](../verification/TESTING.md#3-对抗性攻防测试矩阵-adversarial-attack-matrix)）。
