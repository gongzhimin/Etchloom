# JSDoc 类型契约与注释工程规约 (JSDOC_TYPED_CONTRACT_SPEC.md)

> **原则**：注释即文档、真实反映代码入参和返回值，严禁脱离实际代码凭空编写。

---

## 1. 核心导出接口 JSDoc 标准

系统中所有导出的公共构造函数、类方法及关键算子，必须具备基础 JSDoc 注释块：

```javascript
/**
 * Simulates a single time-step of acid bite etching.
 * 
 * @param {Object} plate Virtual plate context containing continuous typed array fields
 * @param {number} plate.width Plate width
 * @param {number} plate.height Plate height
 * @param {Float32Array} plate.depthField Groove depth field [0.0 ~ 1.0]
 * @param {Float32Array} plate.exposedField Metal surface exposure [0.0 ~ 1.0]
 * @param {Uint8Array} plate.blockedField Stop-out varnish mask [0 or 1]
 * @param {Float32Array} plate.burrField Drypoint burr height [0.0 ~ 1.0]
 * @param {Float32Array} plate.grainNoise Metallurgical grain noise [0.0 ~ 1.0]
 * @param {Float32Array} [plate.nextExposedField] Pre-allocated scratch buffer for double buffering
 * @param {number} dt Time step in seconds (e.g. 0.08 or 1.0)
 * @param {number} [strength=0.45] Acid concentration factor [0.0 ~ 1.0]
 * @param {number} [grain=0.45] Metallurgical grain roughness factor [0.0 ~ 1.0]
 */
function simulateAcidBite(plate, dt, strength = 0.45, grain = 0.45) {
  // ...
}
```

---

## 2. 演进指南 (Evolution Roadmap)

当前项目正处于从原生 JavaScript 逐步向带类型推断过渡的阶段：
1. **优先保障导出方法注释**：优先为 `VirtualPlateEngine`、`PipelineRunner`、`StageCache` 等核心 API 补充完整的 `@param` 与 `@returns`；
2. **禁止虚构全局类型声明**：严禁在未真正建立 `.d.ts` 或 TS 检查体系前，在文档中虚假宣称具备全局 `@typedef` 静态推导。
