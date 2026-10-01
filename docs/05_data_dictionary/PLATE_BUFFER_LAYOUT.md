# 铜版物理仿真内存模型与编解码协议 (PLATE_BUFFER_LAYOUT.md)

> **基准实现**：[src/core/plate/engine/virtual-plate-engine.js](../../src/core/plate/engine/virtual-plate-engine.js), [src/core/codecs/plate-codec.js](../../src/core/codecs/plate-codec.js)

---

## 1. 物理连续内存网格 (TypedArray Buffer Layout)

虚拟铜版物理引擎在初始化时，根据版面尺寸分配 4 块连续内存数组（平铺一维排列，索引为 `y * width + x`）：

```
+─────────────────────────────────────────────────────────────+
| VirtualPlateEngine Memory State                             |
+─────────────────────────────────────────────────────────────+
| depth:    Float32Array[width * height] (物理刻痕深度 0.0~1.0) |
| exposed:  Float32Array[width * height] (铜面暴露比率 0.0~1.0) |
| burr:     Float32Array[width * height] (干刻金属毛刺高度)     |
| blocked:  Uint8Array[width * height]   (防蚀漆掩膜 0 或 1)    |
+─────────────────────────────────────────────────────────────+
```

### 1.1 离散物理网格标准尺寸

| 规格名称 | 宽 x 高 (像素) | 单字段元素数 | 4 字段总内存消耗 (未压缩) |
| :--- | :--- | :--- | :--- |
| **标准轻量** | 900 x 660 | 594,000 | 约 7.72 MB |
| **2K 高清推荐** | 1500 x 1100 | 1,650,000 | 约 21.45 MB |
| **3K 展品极清** | 3000 x 2200 | 6,600,000 | 约 85.80 MB |

---

## 2. 存盘序列化与 PlateCodec 编解码

通过 [PlateCodec](../../src/core/codecs/plate-codec.js) 实现无损序列化存盘：

- **版本 1 (Legacy JSON)**: 直接以数字数组形式存储（仅限 900px 轻量规格）；
- **版本 2 (Compact Base64)**: 将 `Float32Array` 与 `Uint8Array` 的 `ArrayBuffer` 直接转录为 Base64 字符串存储，体积减少约 75%，解析速度提升 10 倍以上。

```json
{
  "version": 2,
  "width": 1500,
  "height": 1100,
  "depth": "<Base64 encoded Float32Array>",
  "exposed": "<Base64 encoded Float32Array>",
  "burr": "<Base64 encoded Float32Array>",
  "blocked": "<Base64 encoded Uint8Array>"
}
```
