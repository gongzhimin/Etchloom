# 代码编写风格与工程规约 (CODE_STYLE_AND_CONVENTIONS.md)

> **适用范围**：`src/` 目录下全部生产级 JavaScript 代码与 `tests/` 测试用例。  
> **语言标准**：现代 ECMAScript (ES2022+)，底层保持 Node.js/Browser 同构。

---

## 1. 命名与文件组织规约

| 实体类别 | 命名规范 | 示例 | 说明 |
| :--- | :--- | :--- | :--- |
| **模块源码文件** | `kebab-case.js` | `stage1-informative.js`, `virtual-plate-engine.js` | 全小写连字符命名 |
| **类 (Class)** | `PascalCase` | `VirtualPlateEngine`, `PipelineRunner`, `StepFlowGrid` | 大驼峰 |
| **函数与方法** | `camelCase` | `applyToolDab`, `computeStageHash`, `generate` | 小驼峰 |
| **私有属性/方法** | `#field` 或 `_prefix` | `this.#activeTask`, `this._canvas` | 严格封装私有字段 |
| **常量与配置字典** | `UPPER_SNAKE_CASE` | `DEFAULT_PARAMS`, `STAGE_NAMES` | 全大写下划线 |
| **连续内存字段** | 全小写单名词 | `depth`, `exposed`, `burr`, `blocked` | 便于在 TypedArray 中快速平铺定位 |

---

## 2. 代码组织与同构原则

### 2.1 核心算法模块的同构封装 (UMD / Isomorphic)
在 `src/core/` 与 `src/orchestration/` 中，必须采用标准的同构包装器导出：
```javascript
(function(root) {
  function MyPureEngine() { ... }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MyPureEngine };
  } else {
    root.MyPureEngine = MyPureEngine;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

### 2.2 前端控制器层的原生 ESM
在 `src/main.js` 与 `src/ui/controllers/` 中，采用标准 ES Module 语法（`import` / `export`），通过 `<script type="module">` 载入。

---

## 3. 防御性检查与数值边界规约

在几何与物理计算中，必须对边界进行安全防护：
1. **除零保护**：向量归一化时必须包含 $\epsilon$（如 `const len = Math.hypot(dx, dy) + 1e-6;`），防止产生 `NaN` 或 `Infinity`；
2. **坐标截断**：向 TypedArray 连续内存写入数据前，必须对坐标进行边界截断（如 `const px = Math.max(0, Math.min(width - 1, Math.round(x)));`）；
3. **参数默认值**：所有公共函数入参必须提供结构化默认配置或短路求值。
