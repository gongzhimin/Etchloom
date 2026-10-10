---
title: 编排调度模块验证与测试设计
status: Active
doc-id: TEST-ORCH
owner-module: orchestration
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:57:00+08:00
---

# 编排调度模块验证与测试设计 (TEST-ORCH)

## 1. 测试策略与分层

本模块负责并发防抖、微任务抢占、DAG 增量缓存失效判定与多格式资产导出（`src/orchestration/`）。测试策略围绕并发时序与确定性展开：
- **微任务调度防抖与抢占测试**：验证高频连续触发下任务合并为最后一次执行，验证长任务被新任务抢占时正确捕获 `signal.aborted`；
- **哈希敏感度与失效单调性测试**：验证 32-bit DJB2 哈希对微小参数扰动敏感，且修改下游参数绝不导致上游缓存误失效；
- **工业导出规范测试**：验证 SVG 分层分组标签、G-Code 标准指令集（G21, G90, G28, G00, G01, M02）无 NaN 污染。

## 2. 真实测试套件与关键用例矩阵

编排模块共包含 4 个测试文件、共计 12 项自动化测试用例：

| 测试文件 | 用例数 | 被测组件 / 符号 | 核心断言与验证目标 |
| :--- | :---: | :--- | :--- |
| `tests/task-scheduler.test.cjs` | 3 | `TaskScheduler` | 1. 20 次并发调用仅最终任务执行 1 次；2. 新任务调度立即触发前序任务 `AbortSignal`；3. `cancelActive` 立即清空定时器并阻断执行 |
| `tests/stage-cache.test.cjs` | 3 | `StageCache` | 1. 相同输入哈希恒等，浮点变动必定产生不同哈希；2. 修改 Stage 4 参数时 `resolveInvalidation` 返回 4 并保留 1~3 缓存；3. put/get/clear 引用存取与清空行为正确 |
| `tests/orchestrator.test.cjs` | 2 | `Orchestrator` | 1. 实例初始化正确挂载 StageCache、TaskScheduler、TelemetrySink 与 VirtualPlateEngine；2. 订阅生命周期事件并验证 `scheduleRecipe` 执行流转 |
| `tests/exporter.test.cjs` | 4 | `Exporter` | 1. `exportSVG` 产物包含 `<g id="contours">` 与 `<g id="hatchings">`；2. `exportGCode` 包含合法 G00/G01 走刀指令且数值有限；3. `exportRecipeJSON` 完整序列化配方；4. `exportPayload` 分发器生成合法文件名与有效 MIME 类型 |

## 3. 契约与集成测试

- **消费方适配契约**：验证 `Orchestrator` 导出的 `subscribe`、`scheduleRecipe`、`transferToPlate` 和 `exportAsset` 完全符合 `design/INTERFACES.md`（`IF-ORCH`）定义；
- **进程悬挂防护**：测试套件执行完毕后，内部所有防抖 `setTimeout` 定时器均被清理，确保 Node.js 测试进程正常退出，无无用事件循环挂起。

## 4. 测试命令与环境

```powershell
# 执行编排模块全部 4 个测试套件
node --test tests/task-scheduler.test.cjs tests/stage-cache.test.cjs tests/orchestrator.test.cjs tests/exporter.test.cjs
```

## 5. 覆盖率与质量门禁

- **用例通过率要求**：12 项编排调度测试用例必须 100% 通过（Pass Rate = 100%）；
- **门禁阻断标准**：测试中若出现未被抢占的并发任务、哈希冲突引发的非预期重算或未清理的挂起定时器，判定门禁失败。
