# JSDoc 类型契约与注释工程规约 (JSDOC_TYPED_CONTRACT_SPEC.md)

> **原则**：注释即文档、真实反映代码入参和返回值，严禁脱离实际代码凭空编写。

---

## 1. 核心导出接口 JSDoc 标准

系统中所有导出的公共构造函数、类方法及关键算子，必须具备基础 JSDoc 注释块：

```javascript
/**
 * 执行 2D 铜版物理仿真化学腐蚀单步迭代 (偏微分方程扩散解算)
 * @param {Float32Array} depth - 连续刻痕深度网格
 * @param {Float32Array} exposed - 未涂覆防蚀漆的裸露铜面比率
 * @param {Uint8Array} blocked - 防蚀漆掩膜阻断网格
 * @param {number} width - 网格横向物理分辨率
 * @param {number} height - 网格纵向物理分辨率
 * @param {number} acidRate - 酸液咬蚀速率因子 [0.0, 1.0]
 * @param {number} dt - 离散时间步长
 * @returns {number} 本步迭代产生的平均腐蚀微米增量
 */
function stepAcidBitePDE(depth, exposed, blocked, width, height, acidRate, dt) {
  // ...
}
```

---

## 2. 演进指南 (Evolution Roadmap)

当前项目正处于从原生 JavaScript 逐步向带类型推断过渡的阶段：
1. **优先保障导出方法注释**：优先为 `VirtualPlateEngine`、`PipelineRunner`、`StageCache` 等核心 API 补充完整的 `@param` 与 `@returns`；
2. **禁止虚构全局类型声明**：严禁在未真正建立 `.d.ts` 或 TS 检查体系前，在文档中虚假宣称具备全局 `@typedef` 静态推导。
