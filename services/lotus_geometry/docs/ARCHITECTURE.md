# Lotus 3D 空间几何推理架构设计规范 (ARCHITECTURE.md)

> **模块路径**：`services/lotus_geometry/`  
> **上级体系规范**：[docs/00_architecture/ARCHITECTURE_OVERVIEW.md](../../../docs/00_architecture/ARCHITECTURE_OVERVIEW.md)

---

## 1. 空间深度与法线推理拓扑 (Geometry Pipeline Topology)

```mermaid
graph TD
    Input[自然光摄影图像] --> LotusPipe[Lotus 扩散几何估计管线]
    LotusPipe --> DepthHead[深度估计分支 (Depth Estimation)]
    LotusPipe --> NormalHead[表面法线估计分支 (Normal Estimation)]

    DepthHead --> DepthMap[归一化绝对深度图 z in 0..1]
    NormalHead --> NormalMap[3D 单位法线场 nx, ny, nz]

    NormalMap --> TangentMath[二维等高切线投影算子]
    TangentMath --> CrossField[表面顺形排线向量场]

    DepthMap --> Modulate[空气透视线宽衰减算子]
```

---

## 2. 数据交换与格式契约 (Data Contracts)

- **输出深度图**：单通道 16-bit PNG 或 32-bit Float 数组，0 代表最近物距，1 代表最远景深；
- **输出法线图**：三通道 RGB PNG（R 代表 $n_x$，G 代表 $n_y$，B 代表 $n_z$，取值范围映射自 $[-1.0, 1.0]$ 至 $[0, 255]$）。
