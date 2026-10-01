# 渲染差异容差与基准验证规范 (PERCEPTUAL_DIFF_TOLERANCE.md)

> **状态**：现行数值确定性验证 + 规划中的感知差异基准 (Planned Benchmark)  
> **文档目的**：明确当前代码库在矢量线条、物理刻深与光栅图像上的容差验收标准。

---

## 1. 现行实施标准 (Active Deterministic Tolerances)

当前代码库不依赖昂贵或脆弱的外部图像差异比对库，而是采用精确的数值与几何不变式进行回归判定：

| 被测实体 | 容差标准 | 验证手段 | 源码实现位置 |
| :--- | :--- | :--- | :--- |
| **矢量笔触坐标** | 绝对误差 $\le 10^{-4}$ px | 相同 seed 下逐点浮点数比对 | 	ests/generator.test.cjs |
| **铜版刻深字段** | 零误差 (0 bit diff) | PlateCodec Base64 编解码无损往返 | 	ests/virtual-plate-engine.test.cjs |
| **物理酸蚀深度** | 浮点数精确收敛 | 偏微分侵蚀迭代  \cdot \Delta t$ 上限约束 | src/core/plate/acid-simulator.js |
| **色调阶跃单调性** | 严格单调不递减 | 5 级灰度阈值分段单调断言 | 	ests/refinement.test.cjs |

---

## 2. 规划中的视觉差异自动化比对 (Future Planned Roadmap)

针对前端 Canvas 压印位图渲染与特写视口，未来计划引入标准感知差异比对（如 pixelmatch）：
- **结构相似性指标 (SSIM)**: 允许微观抗锯齿差异，整体结构相似度 $\ge 0.985$；
- **色差公式 ($\Delta E_{00}$)**: 纸张纤维纹理色调偏移容差 $\Delta E \le 5.0$；
- **像素失配率**: 纯白高光与纯黑阴影区域失配像素占比 $\le 0.5\%$。
