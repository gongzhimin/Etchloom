# 全系统通用算法方案与计算框架 (ALGORITHM)

> **文档标识**：ALG-SYS-FRAMEWORK  
> **上级依据**：[docs/design/ARCHITECTURE.md](ARCHITECTURE.md)  
> **设计边界**：本文件描述全系统通用算法框架与跨模块计算方案；局部专用算法严格留在对应子模块文档中。  

---

## 1. 五阶段母版生成管线算法总览

系统将自然图像转化为古典版画母版的过程被严格划分为 5 个连续计算阶段（源码对应 `src/core/pipeline/pipeline-runner.js`）：

```text
输入原始照片
    │
    ▼ [阶段 1: 灰度线描感知与骨架抽取 (Stage 1 · Informative Line Extraction)]
神经网络或形态学边缘提取 + 图像白场保留 + 感知亮度映射
    │
    ▼ [阶段 2: 色调场与 3D 等高切线流场 (Stage 2 · Tone & 3D Surface Flow Field)]
自适应导向滤波色调分解 + 双向梯度张量流场 + Lotus 3D 几何法线调制
    │
    ▼ [阶段 3: 轮廓与空气透视景深调制 (Stage 3 · Aerial Perspective Contours)]
多尺度骨干轮廓提取 + 空气透视距离渐变 + 道格拉斯-普克曲线几何简化
    │
    ▼ [阶段 4: 曲率门控空间顺形排线 (Stage 4 · Curvature-Gated Spatial Hatching)]
微分几何流线积分 + 曲率自适应步长 + 暗部交叉排线层叠 + 区域留墨预算守恒
(强制双态坐标解构 `(pt[0] ?? pt.x)` 与 `Number.isFinite` 屏障，免疫异构输入导致的 NaN 毒化)
    │
    ▼ [阶段 5: 母版矢量合成与古典画框 (Stage 5 · Master Print Synthesis)]
多图层拓扑融合 + 双层古典手工外框集成 + 视口外溢裁剪
    │
    ▼
标准矢量图稿 (VectorPath 集合)
```

* **子模块算法详解索引**：
  * 排线流线积分与微分张量：参见 [src/core/hatching/docs/ALGORITHM.md](../../src/core/hatching/docs/ALGORITHM.md)
  * 酸槽 2D PDE 侧向潜蚀物理数值仿真：参见 [src/core/plate/docs/ALGORITHM.md](../../src/core/plate/docs/ALGORITHM.md)
  * 色调分离与张量流场：参见 [src/core/docs/ALGORITHM.md](../../src/core/docs/ALGORITHM.md)
  * 极端边界与容错计算规范：参见 [docs/standards/TEST_RULES.md](../standards/TEST_RULES.md#2-六大对抗性攻击向量攻击手册) 与 [docs/verification/TESTING.md](../verification/TESTING.md#5-缺陷审计与对抗性防御台账-defect--resilience-ledger)


---

## 2. 图像预处理与尺寸自适应下采样算法

为确保实时交互性与内存稳定性，任何超大输入图像在进入计算前执行以下限制：
$$\text{scale} = \min\left(1.0, \frac{\text{MAX\_DIM}}{\max(W_{\text{src}}, H_{\text{src}})}\right)$$
* $\text{MAX\_DIM} = 1800\,\text{px}$：保证在 4K 屏幕上细节分毫毕现的同时，内存占用保持在安全的 $50\,\text{MB}$ 以内。

---

## 3. 拓扑内容敏感哈希算法 (DJB2 变体)

编排层通过计算阶段输入参数及前序输出的哈希值实现瞬时增量重算（DAG 缓存，源码对应 `src/orchestration/cache/stage-cache.js`）：
$$H_{k} = ((H_{k-1} \ll 5) + H_{k-1}) \oplus C_k$$
* 当用户仅调整阶段 4（排线密度、交叉线）滑块时，阶段 1 至 3 的哈希值保持完全不变，计算中枢直接从缓存复用前序中间层，耗时从 $350\,\text{ms}$ 降低至 $12\,\text{ms}$。
