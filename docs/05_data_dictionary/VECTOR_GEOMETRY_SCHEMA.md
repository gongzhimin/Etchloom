# 矢量刻线几何数据字典规范 (VECTOR_GEOMETRY_SCHEMA.md)

> **基准实现**：[src/core/pipeline/stage5-master-print.js](../../src/core/pipeline/stage5-master-print.js), [src/orchestration/export/exporter.js](../../src/orchestration/export/exporter.js)

---

## 1. 矢量笔划对象定义 (Vector Stroke Schema)

```typescript
interface VectorStroke {
  points: Array<[number, number]>; // 连续二维坐标点序列 [[x0, y0], [x1, y1], ...]
  width: number;                   // 物理线宽，单位：像素或毫米 (默认 0.8)
  role: StrokeRole;                // 笔划语义分类角色
  depth?: number;                  // 对应铜版刻痕深度估计值 [0.0, 1.0]
  style?: {
    color?: string;                // 渲染颜色 (如 '#111111')
    opacity?: number;              // 不透明度 [0.0, 1.0]
  };
}

/**
 * 代码中真实产生的笔划语义分类
 */
type StrokeRole = 
  | 'contour'        // 骨干轮廓线 (阶段 3 产物)
  | 'hatch'          // 主顺形排线 (阶段 4 产物)
  | 'cross'          // 交叉第二层排线 (阶段 4 产物)
  | 'contour-coarse' // 粗阶大结构轮廓 (PhotoPro 产物)
  | 'maze';          // 自适应迷宫流纹理 (PhotoPro 纹理层)
```

---

## 2. 导出器分层规则 (Exporter Layer Mapping)

在 [src/orchestration/export/exporter.js](../../src/orchestration/export/exporter.js) 中，根据 `role` 进行图层分配：

| 语义角色 (`role`) | 导出的 SVG 图层 ID | G-Code 切片建议 | 说明 |
| :--- | :--- | :--- | :--- |
| 'contour' | `<g id="contours">` | 先行雕刻，切入深度较深 (0.8~1.0) | 物体边界与主结构轮廓 |
| 'hatch' | `<g id="hatchings">` | 顺形细刻，切入深度中等 (0.4~0.6) | 表面几何曲率流向排线 |
| 'cross' | `<g id="hatchings">` | 浅刻，切入深度较浅 (0.2~0.4) | 仅在重阴影区出现 |
| 'maze' | `<g id="texture">` | 均匀刻深 | 特殊艺术风格迷宫连续线 |
