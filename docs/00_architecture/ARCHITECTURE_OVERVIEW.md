# Etchloom 系统全局架构设计规范 (ARCHITECTURE_OVERVIEW.md)

> **适用版本**：Etchloom Atelier Engine  
> **核心原则**：纯域算法与宿主环境解耦、单向事件驱动、渐进物理仿真、双模态工作流（算法母版设计 vs 虚拟铜版工坊）。

---

## 1. 架构全景与分层模型 (System Layering Architecture)

系统遵循清晰的自底向上 5 层分层设计：

```
+───────────────────────────────────────────────────────────────────────────+
| Layer 4: 展现与模板层 (Presentation & View Templates)                     |
| - index.html (轻量骨架)                                                    |
| - src/ui/templates/layout-templates.js (动态解耦模板挂载)                  |
| - src/ui/components/ (StepFlowGrid, LoupeMagnifier)                       |
+───────────────────────────────────────────────────────────────────────────+
                                     │ 驱动 / 事件绑定
+───────────────────────────────────────────────────────────────────────────+
| Layer 3: 业务控制器层 (Application & UI Controllers - Native ESM)          |
| - src/main.js (应用入口、多语言、工作流切换)                                |
| - src/ui/controllers/pipeline-controller.js (5阶段母版生成编排)           |
| - src/ui/controllers/plate-studio-controller.js (铜版工坊仿真交互)          |
| - src/ui/controllers/transfer-wizard-controller.js (图稿上版工艺向导)      |
| - src/ui/controllers/lightbox-controller.js (超高清视口与平移缩放)        |
+───────────────────────────────────────────────────────────────────────────+
                                     │ 调用编排
+───────────────────────────────────────────────────────────────────────────+
| Layer 2: 任务编排与基础设施层 (Orchestration & Infrastructure)             |
| - src/orchestration/task-scheduler.js (防抖、微任务与 AbortController 抢占)|
| - src/orchestration/stage-cache.js (32-bit DJB2 哈希与 DAG 增量失效)       |
| - src/orchestration/exporter.js (SVG 分层、CNC G-Code、PNG pHYs 导出)      |
| - src/orchestration/telemetry-sink.js (阶段耗时与性能指标统计)             |
| - src/services/ai-service-gateway.js (HTTP /health, /infer, /depth 探活降级)|
+───────────────────────────────────────────────────────────────────────────+
                                     │ 纯数据驱动
+───────────────────────────────────────────────────────────────────────────+
| Layer 1: 核心纯算法与物理仿真层 (Pure Domain & Physics Simulation)         |
| 1.1 离散管线核心 (src/core/):                                             |
|     Stage 1 Informative -> Stage 2 Tone Flow -> Stage 3 Contours          |
|     -> Stage 4 Hatching (15个几何排线子模块) -> Stage 5 Master Print       |
| 1.2 铜版物理仿真 (src/core/plate/):                                       |
|     VirtualPlateEngine, AcidSimulator (PDE 偏微分腐蚀), PressRenderer    |
|     PlateCodec (连续 TypedArray Base64 无损无 DOM 编解码)                  |
+───────────────────────────────────────────────────────────────────────────+
                                     │ 外部进程通信
+───────────────────────────────────────────────────────────────────────────+
| Layer 0: AI 辅助微服务容器 (Python Neural Services, Port 7861)             |
| - services/informative_drawings/server.py (ThreadingHTTPServer)          |
| - services/lotus_geometry/pipeline_lotus.py (LotusGPipeline 深度/法线模型) |
+───────────────────────────────────────────────────────────────────────────+
```

---

## 2. 关键设计原则与模式

### 2.1 零 DOM 纯计算核心 (Zero-DOM Domain)
- `src/core/` 内部的所有算法函数、排线计算、物理刻痕与偏微分腐蚀，均被设计为环境无关的同构纯函数。
- 严禁在底层算法模块中直接访问 `window`、`document` 等浏览器宿主对象，确保能在 Node.js 原生环境下高速执行单元测试。

### 2.2 渐进式 DAG 增量缓存 (Stage Caching)
- 5 阶段管线通过 `StageCache` 对每阶段输入参数和依赖计算 32-bit DJB2 确定性哈希。
- 当用户仅调整“排线密度”（阶段 4 参数）时，系统自动复用阶段 1~3 的线描与几何流场缓存，实现秒级快速重绘。

### 2.3 铜版网格物理内存模型 (TypedArray Grid)
- 物理铜版采用 `Float32Array`（刻深 `depth`、暴露 `exposed`、毛刺 `burr`）和 `Uint8Array`（防蚀漆 `blocked`）作为一维连续内存布局。
- 保证数百万像素级的物理化学仿真在 60fps 交互下零 GC 垃圾回收停顿。
