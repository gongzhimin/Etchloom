# Lotus 3D 几何推理测试与精度验证规范 (TESTING.md)

> **被测模块**：`services/lotus_geometry/` (`pipeline_lotus.py`, `utils_geometry.py`)  
> **前端联动测试**：`tests/depth-contour-curvature.test.cjs`  
> **执行命令**：`node --test tests/depth-contour-curvature.test.cjs`

---

## 1. 几何精度与正交性测试矩阵

| 测试用例名 | 验证目标 | 关键断言点 |
| :--- | :--- | :--- |
| `computes exact vertical cross-contour flow for vertical cylinder normal map` | 垂直圆柱体法线切线 | 传入水平法线 $(n_x, 0, n_z)$，计算所得切线垂直分量绝对值必须 $> 0.999$，水平分量 $< 0.001$ |
| `computes exact horizontal cross-contour flow for horizontal cylinder normal map` | 水平圆柱体法线切线 | 传入垂直法线 $(0, n_y, n_z)$，计算所得切线水平分量绝对值必须 $> 0.999$，垂直分量 $< 0.001$ |
| `attenuates distant strokes and preserves near strokes with depthMap` | 空气透视深度衰减 | 远景线条线宽严格衰减至初始线宽的 $55\%$，近景主体保持 $100\%$ 线宽 |

---

## 2. 物理与数学不变量断言

1. **单位切线长度守恒**：对任意非零法线，投影计算出的二维切线向量模长必须严格满足 $\|\mathbf{t}\| = 1.0 \pm 10^{-6}$；
2. **深度单调性衰减**：深度 $z$ 增大时，衰减函数 $w(z)$ 导数恒满足 $w'(z) \le 0$。
