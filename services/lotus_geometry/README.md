# Lotus 3D Geometry Pipeline (`services/lotus_geometry/`)

> **服务路径**：`services/lotus_geometry/`  
> **技术定位**：Layer 0 外部几何计算服务层，基于 Diffusers 框架提供度量空间几何深度与表面法线估计管线。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

1. **单目几何深度估计**：解算输入图像的公制相对距离场 $Z(x, y) \in [0.0, 1.0]$；
2. **表面法线与等高切线推导**：通过空间梯度微分计算表面法线场 $\vec{N}$，推导等高顺形切线场 $\vec{T} = \vec{N} \times \vec{V}_{up}$；
3. **空间排线与空气透视驱动**：生成的几何数据直接驱动前端管线阶段 3 的线宽衰减与阶段 4 的曲率流线顺形排线。

---

## 2. 核心算法原理与微分推导 (Algorithm Steps)

表面法线与等高切线数学推导详见 [docs/ALGORITHM_SPEC.md](docs/ALGORITHM_SPEC.md)。

---

## 3. 自动化测试与验证 (Testing & Verification)

覆盖 Lotus 几何集成的前端回归测试：
- [`tests/depth-contour-curvature.test.cjs`](../../tests/depth-contour-curvature.test.cjs)（6 项用例：圆柱体垂直/水平等高切线一致性、深度衰减率、空深度优雅退避）

运行命令：
```bash
node --test tests/depth-contour-curvature.test.cjs
```

---

## 4. 子文档导航 (Sub-documentation Index)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：LotusGPipeline 架构设计
- [docs/ALGORITHM_SPEC.md](docs/ALGORITHM_SPEC.md)：微分几何法线推导数学模型
- [docs/INTERFACE_SPEC.md](docs/INTERFACE_SPEC.md)：Lotus 3D 几何特征微服务接口设计与契约规范
- [docs/TESTING.md](docs/TESTING.md)：几何测试套件矩阵
