---
title: 公共数据语义与数据字典规范
status: Active
doc-id: DATA-SYS
owner-module: root
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:25:00+08:00
---

# 公共数据语义与数据字典规范

## 1. 数据归属总表

系统内所有跨模块消费的数据实体、语义归属与权威定义登记如下（消费方仅引用，不复制定义）：

| 实体标识 | 实体名称 | 属主模块 | 权威源码实现 | 消费模块 | 一句话语义 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`DATA-RECIPE-001`** | `RecipeSchema` | `orchestration` | `src/orchestration/engine/orchestrator.js` | `core`, `ui` | 驱动 5 阶段管线与物理仿真的完整配置参数。 |
| **`DATA-PLATE-002`** | `PlateBufferLayout` | `core` | `src/core/plate/engine/virtual-plate-engine.js` | `ui` | 连续 TypedArray 四场（depth, exposed, blocked, burr）。 |
| **`DATA-VECTOR-003`** | `VectorStrokeSet` | `core` | `src/core/pipeline/stage5-master.js` | `orchestration`, `ui` | 结构化矢量折线集合（points, width, role, depth）。 |
| **`DATA-SESSION-004`**| `DesignSession` | `ui` | `src/ui/store/app-store.js` | `orchestration` | 用户多稿历史、当前选定配方及视口缩放状态。 |

## 2. 实体定义

### 2.1 配方参数模型 (`DATA-RECIPE-001: RecipeSchema`)
- **字段明细**：
  - `lineThreshold`: `number`, $[0, 100]$, 边缘响应阈值，默认 `50`；
  - `lineNoiseSuppression`: `number`, $[0, 10]$, 降噪半径，默认 `2`；
  - `toneContrast`: `number`, 对比度增益，默认 `1.0`；
  - `density`: `number`, $[10, 100]$, 排线密度，默认 `50`；
  - `needleWidth`: `number`, $[0.1, 5.0]\,\text{mm}$, 划刻针宽，默认 `1.0`；
  - `acidStrength`: `number`, $[0.0, 1.0]$, 归一化酸液浓度，默认 `0.45`；
  - `grain`: `number`, $[0.0, 1.0]$, 铜版本构金相粗糙度，默认 `0.45`；
  - `paper`: `enum`, `'rough' | 'smooth' | 'linen' | 'rosaspina'`, 手工纸基预设。
- **约束与空值**：所有必填数值不可为 `NaN` 或 `Infinity`；缺省字段按 `PrintGenerator.defaults` 自动补全。
- **序列化格式**：JSON Object，UTF-8 编码。

### 2.2 虚拟铜版内存模型 (`DATA-PLATE-002: PlateBufferLayout`)
- **字段明细**：
  - `width`: `number`, 铜版宽度像素（900 / 1500 / 3000）；
  - `height`: `number`, 铜版高度像素（660 / 1100 / 2200）；
  - `depthField`: `Float32Array[N]`, 刻槽深度 $[0.0, 1.0]$（映射 $[0, 45]\,\mu\text{m}$）；
  - `exposedField`: `Float32Array[N]`, 裸铜暴开程度 $[0.0, 1.0]$；
  - `blockedField`: `Uint8Array[N]`, 防蚀漆掩膜 $\{0, 1\}$；
  - `burrField`: `Float32Array[N]`, 干刻金属外翻毛刺 $[0.0, 1.0]$。
- **约束**：连续内存行优先平铺，$N = \text{width} \times \text{height}$。

### 2.3 矢量笔画集合 (`DATA-VECTOR-003: VectorStrokeSet`)
- **字段明细**：
  - `points`: `Array<[x: number, y: number] | {x: number, y: number}>`, 坐标离散点集；
  - `width`: `number`, 基础线宽（像素）；
  - `role`: `enum`, `'contour' | 'hatch' | 'cross' | 'frame'`, 笔画艺术语义角色；
  - `depth`: `number`, 估算铜版刻槽深度 $[0.0, 1.0]$。
- **序列化格式**：标准 SVG `<path>` 元素集合，坐标保留 2 位小数。

## 3. 数据映射

| 内存实体 | 持久化格式 | 传输格式 (IPC/Network) | 权威映射位置 |
| :--- | :--- | :--- | :--- |
| `PlateBufferLayout` | JSON (Base64 TypedArray 编码) | JSON Blob | `src/core/codecs/plate-codec.js` |
| `RecipeSchema` | JSON (UTF-8 纯文本) | JSON IPC Payload | `src/orchestration/engine/orchestrator.js` |
| `VectorStrokeSet` | SVG 1.1 XML 文件 | UTF-8 String | `src/orchestration/export/exporter.js` |
