# ADR-001: 纯域算法层环境解耦与测试同构规范

- **状态**: 已采纳并实施 (Accepted)
- **决策日期**: 2026-09-30 (修订于 2026-10-01)
- **相关模块**: `src/core/`, `tests/`

---

## 1. 背景与问题 (Context)

在早期版本中，图像分析、排线计算与铜版模拟深度耦合了浏览器的 `HTMLCanvasElement`、`document.createElement` 与 `window` 全局对象。导致：
1. 底层几何算法无法在 Node.js 环境下直接运行单测，必须在测试脚本中注入复杂的 DOM/Canvas Mock；
2. 算法无法直接在 Web Worker 或服务端离线批处理任务中安全复用。

---

## 2. 决策内容 (Decision)

1. **核心算法层 (`src/core/`) 彻底剥离 DOM 依赖**：
   - 输入数据统一为普通的二维数组、结构化纯 JS 对象或平铺的 `TypedArray`（如 `Float32Array`, `Uint8Array`）；
   - 严禁在算法内部调用 DOM API；
   - 算法模块采用 UMD / Isomorphic 规范封装，在 Node.js 环境直接 `module.exports`，在浏览器挂载到 `globalThis`。
2. **渐进式测试过渡**：
   - 针对算法核心（Tier 1/Tier 2），全部采用纯 Node.js 测试，零 DOM Mock；
   - 针对尚需访问 DOM 的老旧界面逻辑测试（如 `tests/plate.test.cjs`），暂时通过隔离的 `vm.createContext` 运行，待全量迁移至原生控制器后逐步替换。
