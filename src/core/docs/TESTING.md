# 5 阶段算法管线核心测试规范 (TESTING.md)

> **被测模块**：`src/core/pipeline-runner.js`, `src/core/stage1-informative.js` ~ `stage5-master-print.js`, `src/core/photo-pro.js`  
> **执行命令**：`node --test tests/pipeline-runner.test.cjs tests/five-stage-pipeline.test.cjs tests/photo.test.cjs`  
> **测试框架**：Node.js 原生测试模块 (`node:test`, `node:assert/strict`)

---

## 1. 测试设计策略与方法学 (Test Strategy & Methodology)

1. **增量依赖缓存与局部失效测试**：
   - 验证 Stage 1~5 有向无环图 (DAG) 状态哈希。当修改 Stage 4 参数时，Stage 1~3 缓存必须 100% 命中，重新计算耗时必须低于全量计算的 30%；
2. **确定性随机数 (PRNG) 与配方可复现性**：
   - 验证相同输入图像、参数与种子下，生成的成千上万个矢量点坐标绝对一致；
3. **任务中断与抢占测试 (AbortSignal Preemption)**：
   - 快速派发新任务，验证旧任务能够侦听到 `signal.aborted` 并优雅退出，无内存泄漏与僵尸回调。

---

## 2. 测试用例逐项深度解析 (`tests/pipeline-runner.test.cjs`)

### 用例 1: `PipelineRunner: Full execution from Stage 1 to Stage 5`
- **覆盖逻辑**：从零开始全量执行 5 个离散阶段；
- **前置条件**：提供 `examples/photo-fixture.png` 测试样本；
- **断言指标**：
  - 产物包含 `stage1LineMap`, `stage2ToneFlow`, `stage3Contours`, `stage4Hatching`, `masterResult`；
  - `masterResult.strokes.length > 0` 且每条笔画包含 `points`, `width`, `role`；
- **断言语句**：`assert.ok(result.masterResult.strokes.length > 50)`。

### 用例 2: `PipelineRunner: Incremental execution from Stage 4 with pre-cached Stage 1..3`
- **覆盖逻辑**：预注入 Stage 1~3 缓存，仅变更排线密度 `density`；
- **断言指标**：执行过程跳过 Stage 1~3 计算，总耗时显著缩短，且 Stage 1~3 产物对象指针一致。

### 用例 3: `PipelineRunner: Aborts gracefully when AbortSignal triggers`
- **覆盖逻辑**：任务启动后立即派发 `controller.abort()`；
- **断言指标**：Promise 抛出 `AbortError` 或正常返回中断状态，未完成后续阶段计算。

---

## 3. 性能基准与资源阈值

- **全量执行时间 (1500x1100 2K)**：CPU 环境下 $\le 6000 \text{ ms}$；
- **增量执行时间 (仅 Stage 4~5)**：$\le 2000 \text{ ms}$；
- **内存峰值**：连续内存分配峰值不超过 $120 \text{ MB}$。
