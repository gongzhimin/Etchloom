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

## 2. 导出器分层与切片规则 (Exporter Layer Mapping & G-Code Slicing)

在 [src/orchestration/export/exporter.js](../../src/orchestration/export/exporter.js) 中，SVG 导出依据 `role` / `type` 进行图层隔离：

| 语义角色 (`role` / `type`) | 导出的 SVG 图层 ID | 说明 |
| :--- | :--- | :--- |
| `'contour'` | `<g id="contours">` | 主结构轮廓与物体边界骨干线 |
| `'hatch'` / `'cross'` / `'maze'` 等 | `<g id="hatchings">` | 内部所有表面纹理排线、细密交叉线及自适应流纹 |

### G-Code 走刀切片参数
G-Code 导出采用统一雕刻安全配置（参数由 `exportGCode(paths, options)` 传入）：
- **走刀空程高度** (`travelHeight` / `gcodeZTravel`)：默认为 `2.0mm`，快速抬刀 (`G00 Z...`)；
- **下刀雕刻深度** (`engraveDepth` / `gcodeZEngrave`)：全局统一深度 `zCut`（默认 `0.0mm`，由工艺配置指定，`G01 Z...`）；
- **切削进给速度** (`feedRate` / `gcodeSpeed`)：默认 `1200 mm/min`；
- **物理尺度缩放** (`scale`)：将坐标映射到机器目标物理尺寸。
