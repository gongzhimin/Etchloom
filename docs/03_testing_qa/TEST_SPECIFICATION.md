# 自动化测试与质量规范体系 (TEST_SPECIFICATION.md)

> **测试框架**：Node.js 原生测试模块 (`node:test`, `node:assert/strict`)  
> **运行环境**：Node.js v20.0+（当前运行于 Node.js v24）  
> **测试执行命令**：`npm test`  
> **真实统计**：共 29 个测试文件，140 项测试用例，100% 通过。

---

## 1. 测试层级架构 (Testing Pyramid)

针对 Etchloom 同构纯计算核心与原生 ES Modules 控制器的特点，系统划分为 4 个清晰的测试层级：

```text
                ▲
               / \
              /   \
             / Tier \      Tier 4: UI 交互、主题网桥与 DOM 装配测试 (35 项)
            /   4    \     [tests/ui-button-clicks.test.cjs, tests/two-stage-ui.test.cjs, tests/theme-bridge.test.cjs...]
           /───────────\
          /   Tier 3    \    Tier 3: 异步调度、DAG 缓存与管线集成测试 (16 项)
         /───────────────\   [tests/pipeline-runner.test.cjs, tests/orchestrator.test.cjs, tests/stage-cache.test.cjs...]
        /     Tier 2      \  Tier 2: 虚拟铜版物理引擎与偏微分方程测试 (15 项)
       /───────────────────\ [tests/virtual-plate-engine.test.cjs, tests/plate.test.cjs]
      /       Tier 1        \ Tier 1: 纯几何流场、排线算法、导出与离线端侧推理测试 (74 项)
     /───────────────────────\[tests/geometry-flow.test.cjs, tests/hatching-modular.test.cjs, tests/exporter.test.cjs...]
```

---

## 2. 各层级测试职责与准则

### 2.1 Tier 1: 纯数学与几何排线单元测试
- **目标**：验证流场正交切线、曲率门控、欧氏距离场 (SDF)、曼哈顿立面流、墨量守恒等底层算法。
- **环境要求**：纯 Node.js 执行，严禁引入任何 DOM、Canvas 或浏览器宿主对象。
- **断言原则**：数值容差、确定性随机数（PRNG）种子复现、数组边界与非空守恒。

### 2.2 Tier 2: 铜版物理仿真与内存模型测试
- **目标**：验证 Float32Array 与 Uint8Array 连续物理内存分配、酸液 2D 各向同性侵蚀、防蚀漆掩膜阻断、干刻毛刺生成及 PlateCodec Base64 编解码。
- **断言原则**：未暴露区域在腐蚀前后刻深必须严格为 0；撤销重做前后 TypedArray 必须无损复原。

### 2.3 Tier 3: 异步调度与管线集成测试
- **目标**：验证 5 阶段管线（PipelineRunner）全流程驱动、AbortController 中断信号传递、StageCache 32-bit DJB2 哈希校验与下游失效传播。
- **断言原则**：上游参数变更时仅重新计算受影响阶段，未变更阶段必须精准命中缓存。

### 2.4 Tier 4: 前端交互与 Mock DOM 测试
- **目标**：在 Node.js 环境下通过受控的 Mock DOM 验证所有用户交互按钮、抽屉折叠、模式切换（母版 vs 工坊）、模态框开关及多语言切换。
- **实现方式**：在 `tests/ui-button-clicks.test.cjs` 与 `tests/two-stage-ui.test.cjs` 中提供轻量级 Element Mock 实现，捕获 `addEventListener` 并派发模拟点击事件。
