---
title: 编排调度模块对外接口契约
status: Active
doc-id: IF-ORCH
owner-module: orchestration
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:55:00+08:00
---

# 编排调度模块对外接口契约 (IF-ORCH)

## 1. 接口设计原则与权威关系

1. **唯一权威定义**：本文件是 `orchestration` 模块对外提供的接口契约权威定义。跨模块登记以 `docs/design/INTERFACES.md` 为准，具体签名、状态结构与导出行为以此处为准。
2. **中枢协调者原则**：UI 控制器通过 `Orchestrator` 协调任务调度、增量缓存比对、铜版转录与资产导出，严禁 UI 层绕过编排中枢直接维护底层中间态缓存。
3. **取消感知与确定性防抖**：面向高频滑块交互，调度器内置 `AbortController` 抢占机制，确保任何时刻仅最新有效任务进入执行，陈旧任务毫秒级中断。

## 2. 函数式接口签名与类定义

### 2.1 Orchestrator 编排中枢

源码位置：`src/orchestration/engine/orchestrator.js`

```javascript
class Orchestrator {
  /**
   * 初始化编排引擎，关联 StageCache、TaskScheduler、TelemetrySink 与 VirtualPlateEngine
   * @param {Object} [config={}]
   * @param {number} [config.debounceMs=60] - TaskScheduler 防抖延迟 (毫秒)
   * @param {number} [config.plateWidth=900] - 铜版初始像素宽度 (900 | 1500 | 3000)
   */
  constructor(config = {})

  /**
   * 注册生命周期与遥测事件监听器
   * 事件类型包含：PIPELINE_STARTED、STAGE_PROGRESS、STAGE_COMPLETED、PIPELINE_COMPLETED、PLATE_UPDATED、TELEMETRY_SAMPLE
   * @param {Function} listener - (event: { type: string, timestamp: number, ...payload }) => void
   * @returns {Function} 取消订阅闭包函数 () => void
   */
  subscribe(listener)

  /**
   * 计算指定配方在 1..5 各阶段的 DJB2 哈希指纹
   * @param {Object} recipeState - 包含 params、sourceImage、sourceVersion 等
   * @returns {{ 1: string, 2: string, 3: string, 4: string, 5: string }}
   */
  computeStageHashes(recipeState)

  /**
   * 提交配方执行任务，自动防抖、抢占旧任务并通过 StageCache 裁剪失效阶段
   * @param {Object} recipeState - 配方状态
   * @param {Object} [options={}]
   * @returns {Promise<Object>} 执行产物 { masterPaths, completedStages, fromCache?, ... }
   */
  scheduleRecipe(recipeState, options = {})

  /**
   * 将当前管线母版矢量路径转录至虚拟铜版
   * @param {Array|null} [paths=null] - 显式路径数组；为空时默认使用 lastResult.masterPaths
   * @param {'needle'|'dry'} [tool='needle'] - 转刻工具类型
   * @param {number} [size=2] - 转刻线条粗细
   */
  transferToPlate(paths = null, tool = 'needle', size = 2)

  /**
   * 导出母版或配方资产
   * @param {'SVG'|'GCODE'|'RECIPE_JSON'} format
   * @param {Object} [options={}]
   * @returns {{ filename: string, mimeType: string, data: string, byteSize: number }}
   */
  exportAsset(format, options = {})
}
```

### 2.2 TaskScheduler 任务调度器

源码位置：`src/orchestration/scheduler/task-scheduler.js`

```javascript
class TaskScheduler {
  /**
   * @param {number} [debounceMs=60] - 默认防抖时长 (毫秒)
   */
  constructor(debounceMs = 60)

  /**
   * 提交待执行任务，自动处理排队防抖与正在执行任务的抢占中止
   * @param {Function} taskFn - (signal: AbortSignal) => Promise<T>
   * @param {number|null} [customDebounceMs=null] - 覆盖防抖时延
   * @returns {Promise<{ aborted: boolean, result?: T, reason?: string }>}
   */
  schedule(taskFn, customDebounceMs = null)

  /**
   * 立即强行中止当前正在运行的任务并清空防抖定时器
   * @param {string} [reason='CANCELLED']
   */
  cancelActive(reason = 'CANCELLED')
}
```

### 2.3 StageCache 阶段拓扑增量缓存

源码位置：`src/orchestration/cache/stage-cache.js`

```javascript
class StageCache {
  /**
   * 计算指定阶段参数在给定上游哈希下的 32-bit DJB2 确定性哈希
   * @param {number} stageIndex - 阶段序号 (1..5)
   * @param {Object} stageParams - 当前阶段相关参数切片
   * @param {string} [upstreamHash=''] - 前序阶段哈希
   * @returns {string} Base-36 哈希字符串
   */
  computeStageHash(stageIndex, stageParams, upstreamHash = '')

  /**
   * 基于新哈希列表比对解析首个失效的起始阶段
   * @param {Object} newHashes - { 1: h1, 2: h2, 3: h3, 4: h4, 5: h5 }
   * @returns {number} 首个失效阶段编号 (1..5)，若全命中返回 6
   */
  resolveInvalidation(newHashes)

  /**
   * 清除指定阶段及其后继所有阶段的缓存
   * @param {number} stageIndex
   */
  invalidateFrom(stageIndex)

  /**
   * 写入阶段产物缓存
   * @param {number} stageIndex
   * @param {string} hash
   * @param {any} artifact
   */
  put(stageIndex, hash, artifact)

  /**
   * 读取阶段产物缓存
   * @param {number} stageIndex
   * @returns {any|null}
   */
  get(stageIndex)

  /**
   * 全量清空缓存池
   */
  clear()
}
```

### 2.4 Exporter 工业级导出器

源码位置：`src/orchestration/export/exporter.js`

```javascript
const Exporter = {
  /**
   * 导出为带 contours / hatchings 分组语义的规范化矢量 SVG
   * @param {Array|Object} masterPaths
   * @param {Object} [options={}] - { width?: 900, height?: 660, strokeColor?: '#111111' }
   * @returns {string} SVG XML 文本
   */
  exportSVG(masterPaths, options = {}),

  /**
   * 导出为数控雕刻 G-Code 指令序列
   * @param {Array|Object} masterPaths
   * @param {Object} [options={}] - { feedRate?: 1200, travelHeight?: 2.0, engraveDepth?: 0.0, scale?: 1.0 }
   * @returns {string} G-Code 纯文本
   */
  exportGCode(masterPaths, options = {}),

  /**
   * 导出规范化配方 JSON
   * @param {Object} recipe
   * @returns {string} 格式化 JSON 字符串
   */
  exportRecipeJSON(recipe),

  /**
   * 统一导出分发器
   * @param {{ format: 'SVG'|'GCODE'|'RECIPE_JSON', masterPaths?: any, recipe?: any, options?: Object }} request
   * @returns {{ filename: string, mimeType: string, data: string, byteSize: number }}
   */
  exportPayload(request)
};
```

## 3. 错误处理与降级契约

1. **抢占式取消不是未捕获异常**：当任务因滑块高频重试被中止时，返回 `{ aborted: true }`，不在控制台抛出 Uncaught Exception；
2. **全命中极速短路**：当 `resolveInvalidation` 返回 6 时，`scheduleRecipe` 直接返回 `{ fromCache: true, masterPaths, completedStages: 5 }`，零额外计算开销；
3. **不支持导出格式阻断**：当 `exportPayload` 传入未支持的格式时，抛出 `Error('Unsupported export format: <format>')`。

## 4. 消费方登记与真实契约测试

| 消费方模块 | 依赖门面符号 | 接口调用方式 | 真实契约测试文件 |
| :--- | :--- | :--- | :--- |
| `ui` | `Orchestrator` | 控制器实例化并监听阶段完成 | `tests/orchestrator.test.cjs` |
| `ui` | `TaskScheduler` | 控制器内部高频防抖与抢占调度 | `tests/task-scheduler.test.cjs` |
| `ui` | `StageCache` | 参数哈希比对与失效阶段分析 | `tests/stage-cache.test.cjs` |
| `ui` | `Exporter` | 导出模态框调用多格式打包 | `tests/exporter.test.cjs` |
