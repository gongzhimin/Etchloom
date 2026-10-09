# 神经网络高保真线描感知提取算法规范 (ALGORITHM.md)

> **模块定位**：`services/informative_drawings/`（基于 PyTorch 的艺术家线描感知推理服务）  
> **核心验收标准**：**“完全映射出原理，完全能够做到依据文档也能独立复现出生产代码”**。

---

## 1. 物理背景与算法动机 (Physical & Algorithmic Motivation)

在传统版画翻制中，如果直接使用 Canny、Sobel 或普通的 DoG 边缘检测，容易生成机械、粗细均匀且伴随大量噪声毛刺的二值化线条。真正的古典铜版画线描需要根据人眼视觉显著性（Visual Saliency）与物体形体结构，提取出具备虚实节奏、顿挫转折的高保真线条。

本模块采用基于对抗训练的单通道线描提取网络架构，将输入的自然摄影图像转换为保留高频关键结构与微细节的艺术家线稿。

---

## 2. 数学符号与输入前置条件 (Preconditions & Mathematical Symbols)

| 符号 | 维度 / 类型 | 物理含义 | 取值范围 |
| :--- | :--- | :--- | :--- |
| $\mathbf{X}$ | $\mathbb{R}^{B \times 3 \times H \times W}$ | 输入 RGB 摄影图像张量 | $[0.0, 1.0]$ |
| $\mathbf{Y}$ | $\mathbb{R}^{B \times 1 \times H \times W}$ | 输出线描强度张量 | $[0.0, 1.0]$ (0 为黑线，1 为白纸) |
| $\mu, \sigma$ | 标量 | 图像标准化均值与方差 | $\mu = 0.5, \sigma = 0.5$ |

---

## 3. 连续空间网络数学原理 (Mathematical Formulation)

网络采用基于带跳跃连接的残差 U-Net 结构与 Instance Normalization（实例归一化）：

$$\text{IN}(x) = \frac{x - \mu(x)}{\sqrt{\sigma^2(x) + \epsilon}} \cdot \gamma + \beta$$

实例归一化能够完全滤除图像中的宏观全局光照与明暗渐变，仅保留局部几何边缘与拓扑轮廓。

---

## 4. 离散化推理与前处理步骤 (Inference Steps)

1. **输入几何预处理**：将图像长边等比例缩放至最大 1500 像素，短边补齐为 16 的整数倍；
2. **张量归一化**：$X_{\text{norm}} = (X / 255.0 - 0.5) / 0.5$；
3. **前向推理**：$Y = \text{Model}(X_{\text{norm}})$，使用无梯度评估模式 (`torch.no_grad()`)；
4. **反归一化输出**：$Y_{\text{uint8}} = \text{clip}(Y \cdot 255.0, 0, 255)$。

---

## 5. 依据本规范的代码映射

- 推理服务实现：`services/informative_drawings/server.py`
- 命令行离线推理：`services/informative_drawings/infer_cli.py`
