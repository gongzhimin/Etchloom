# ADR-002: 虚拟铜版采用连续 TypedArray 物理内存与 Base64 序列化

- **状态**: 已采纳并实施 (Accepted)
- **决策日期**: 2026-09-30 (修订于 2026-10-01)
- **相关模块**: `src/core/plate/virtual-plate-engine.js`, `src/core/plate-codec.js`

---

## 1. 背景与问题 (Context)

在铜版蚀刻仿真中，需要在 $1500 \times 1100$ 甚至 $3000 \times 2200$ 的离散物理网格上进行高频的划线涂抹、防蚀漆覆盖及偏微分酸蚀扩散。如果采用多维普通 JavaScript 数组或对象表示网格点，将导致严重的内存膨胀（数百兆字节）并在动画过程中触发频繁的 GC 垃圾回收卡顿。

---

## 2. 决策内容 (Decision)

1. **采用连续 TypedArray 内存网格**：
   - 刻痕深度：`depth: Float32Array`（单位：标准化深度 0.0~1.0）
   - 暴露比率：`exposed: Float32Array`（未涂漆暴露面积 0.0~1.0）
   - 干刻毛刺：`burr: Float32Array`（翻起金属毛刺高度）
   - 防蚀掩膜：`blocked: Uint8Array`（防蚀漆状态 0 或 1）
2. **编解码序列化规范**：
   - 在内存中以平铺连续内存操作；
   - 存盘时通过 `PlateCodec` 将 TypedArray 的底层 Buffer 编码为紧凑的 Base64 字符串；
   - 解析时通过 `PlateCodec.read` 校验网格尺寸与版本合法性，并恢复为 TypedArray。
