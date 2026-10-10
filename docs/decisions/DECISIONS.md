---
title: 系统重大架构决策记录
status: Active
doc-id: DEC-SYS
owner-module: root
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T23:15:00+08:00
---

# 系统重大架构决策记录

## 决策索引

| 编号 | 日期 | 主题 | 结论 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **`D-0001`** | 2026-09-15 | 纯本地全精度神经模型与零云端依赖 | 拒绝云端 API，全精度 ONNX 本地离线执行 | 生效 |
| **`D-0002`** | 2026-09-20 | 双轨硬件加速：WebGPU 优先与 WASM 降级 | 运行时动态探测，不可用时无缝降级 SIMD | 生效 |
| **`D-0003`** | 2026-09-25 | 计算核心与表现层严格零 DOM 隔离 | `src/core` 严禁出现 DOM 依赖，保持纯函数式 | 生效 |
| **`D-0004`** | 2026-10-01 | 两阶段古典工坊进阶模式 (Two-Stage UI) | 划分为制作母版与蚀刻铜版两个专注工作区 | 生效 |
| **`D-0005`** | 2026-10-05 | 版画体验数字化反悔权：预入酸快照与重置 | 首次入酸前锁存快照，提供【重新腐蚀】重置 | 生效 |
| **`D-0006`** | 2026-10-09 | 状态机防穿透守卫与防腐清漆不可剥夺性 | 守卫检查覆盖全部四场（含清漆），重分版面归零时钟 | 生效 |
| **`D-0007`** | 2026-10-09 | 几何排线与物理计算的对抗免疫与零 NaN 容忍 | 双态坐标解构与 `Number.isFinite` 屏障防毒化 | 生效 |
| **`D-0008`** | 2026-10-10 | 核心物理速率统一校准、环境沙箱化与导出鲁棒屏障 | 统一 0.4x 物理反应速率定标，消除本地环境硬编码，SVG 坐标严格过滤 | 生效 |
| **`D-0009`** | 2026-10-10 | 交互渲染高频瓶颈攻坚：矢量批处理与 PDE 脏包围盒加速 | 消除 7000+ 次 Canvas 状态切换，局部 AABB 稀疏化酸液解算 | 生效 |

---

## 决策记录

### D-0001 纯本地全精度神经模型与零云端依赖 (ADR-001)
- **背景**：市面许多 AI 线描工具依赖服务端 API，带来隐私担忧、网络延迟与长耗时等待。
- **选项**：1. 服务端托管大模型；2. 本地纯几何滤波；3. 本地全精度 ONNX 运行时。
- **结论**：采用方案 3，内嵌 FP32 深度与结构线模型，通过 ONNX Runtime Web 本地推断。
- **理由**：彻底免除云端服务器成本与网络故障，确保 100% 离线隐私。
- **影响范围**：`src/services/`、安装包打包体积优化。
- **状态**：生效

### D-0002 硬件加速路线：WebGPU 优先 + WASM SIMD 自动降级 (ADR-002)
- **背景**：高分辨率（1800px ~ 3000px）卷积滤波与流线积分需要强大浮点算力。
- **选项**：1. 仅 CPU 软件执行；2. 强制绑定 WebGPU；3. 双轨自适应探测。
- **结论**：推行双轨加速，优先 WebGPU，不可用时静默降级为多线程 WASM SIMD。
- **理由**：现代显卡百毫秒级生成，老旧虚拟机也能稳定无崩溃运行。
- **影响范围**：`src/services/client/`、构建脚本。
- **状态**：生效

### D-0003 领域计算核心与 UI 表现层严格零 DOM 隔离 (ADR-003)
- **背景**：早期算法容易为了便利直接读取 DOM，导致无法无头测试与多线程并发。
- **选项**：1. 允许适度访问 DOM；2. 严格零 DOM 隔离。
- **结论**：`src/core` 严禁出现 `window`、`document` 或 DOM 选择器。
- **理由**：核心算法可通过原生 `node:test` 毫秒级单测，并支持多线程 Worker。
- **影响范围**：`src/core/` 架构边界。
- **状态**：生效

### D-0004 两阶段古典工坊进阶模式 (Two-Stage Atelier UI) (ADR-004)
- **背景**：古典版画包含“画稿设计”与“铜板蚀刻印刷”两个心智完全不同的创作阶段。
- **选项**：1. 单屏全控制台平铺；2. 两阶段专注进阶模式。
- **结论**：划分为【阶段 1 · 制作母版】与【阶段 2 · 蚀刻铜版】两套专注工作区。
- **理由**：降低用户认知过载，工坊意境更纯正。
- **影响范围**：`src/ui/` 视图层。
- **状态**：生效

### D-0005 版画体验数字化反悔权：预入酸基准快照与一键重新腐蚀 (ADR-005)
- **背景**：用户在酸槽腐蚀中极易因时间过长导致过咬蚀，需要重新开始的反悔权。
- **选项**：1. 仅提供常规 Undo；2. 专门提供预入酸快照与【重新腐蚀】状态机闭环。
- **结论**：首次入酸前自动锁存 `preEtchSnapshot`，提供一键重新腐蚀清空深度、复原线宽。
- **理由**：极大降低新手试错门槛，保留工序 1 和 2 的划线与补漆成果。
- **影响范围**：`src/core/plate/`、`src/ui/controllers/plate-studio-controller.js`。
- **状态**：生效

### D-0006 铜版画状态机防穿透守卫与防腐清漆不可剥夺性 (ADR-006)
- **背景**：上版覆写检查遗漏防腐清漆 `blockedField`，切换分辨率未复位酸液时钟。
- **选项**：1. 仅依靠用户记忆；2. 状态机全面拦截并强制复位时钟。
- **结论**：非空判定严格覆盖全四场（depth, burr, exposed, blocked）；重分版面强制时钟归零。
- **理由**：保护用户的防腐清漆劳动成果，杜绝假阳性警报。
- **影响范围**：`src/ui/controllers/plate-studio-controller.js`。
- **状态**：生效

### D-0007 矢量几何与物理计算的对抗性免疫与零 NaN 容忍 (ADR-007)
- **背景**：点结构异构表达引发采样函数生成 `NaN` 导致全图线宽损坏；动画帧硬编码字符串。
- **选项**：1. 假定上游输入完全规整；2. 全链路建立防护屏障。
- **结论**：点解构使用 `(pt[0] ?? pt.x)`，连续计算使用 `Number.isFinite` 屏障截断；动画帧接入国际化。
- **理由**：彻底杜绝 `NaN` 毒化外溢，保障极端对抗输入下的系统稳定性。
- **影响范围**：`src/core/pipeline/stage4-hatching.js`、`src/ui/controllers/plate-studio-controller.js`。
- **状态**：生效

### D-0008 核心物理速率统一校准、环境沙箱化与导出鲁棒屏障 (ADR-008)
- **背景**：代码深度审查发现 `acid-simulator.js` 缺失物理定标因子 `0.4` 导致腐蚀速度比基准快 2.5 倍；`stage1-informative.js` 存在个人开发机绝对路径与直接写工作区临时文件风险；`exporter.js` 的 `exportSVG` 未拦截非法坐标。
- **选项**：1. 仅被动根据缺陷改动文档；2. 彻底修复代码缺陷，校准物理常数，清除个人环境硬编码，并在导出器建立非有限数值拦截屏障，同步更新权威设计规范。
- **结论**：采纳选项 2。在 `AcidSimulator` 统一注入 `reactionDt = dt * 0.4`；在 `VirtualPlateEngine` 增强长宽比适配能力；在 `stage1-informative.js` 切换为操作系统临时目录及标准命令解析；在 `exportSVG` 注入点过滤与 `strokeWidth` 有限性校验。
- **理由**：践行“发现即修”与“代码严于规范”的工程守则，杜绝物理仿真割裂与环境耦合。
- **影响范围**：`src/core/plate/physics/acid-simulator.js`、`src/core/plate/engine/virtual-plate-engine.js`、`src/core/pipeline/stage1-informative.js`、`src/orchestration/export/exporter.js`。
- **状态**：生效

### D-0009 交互渲染高频瓶颈攻坚：矢量批处理与 PDE 脏包围盒加速 (ADR-009)
- **背景**：用户拖拽母版参数及在铜版上刻绘时主观感知仍然卡顿。经火焰图分析，根本原因在于 StepFlowGrid 在绘制 7,800+ 笔画时逐笔触发 `ctx.beginPath()` / `ctx.stroke()` 产生数万次状态切换导致 GPU 提交排队；且酸液求解未做受扰区域剪裁。
- **选项**：1. 仅降低分辨率草稿化；2. 在渲染层按线宽批处理合并绘制，同时在物理层引入动态脏包围盒 (Dirty AABB) 局部稀疏求解。
- **结论**：采纳选项 2。在 `StepFlowGrid.updateStepPaths` 引入线宽分桶批量绘制，减少 99% 的 Canvas 状态调用；在 `AcidSimulator` 与 `VirtualPlateEngine` 引入 `dirtyBounds` 裁剪未受扰动区域。
- **理由**：彻底解决 UI 主线程掉帧瓶颈，保持画质无损的前提下大幅提升交互跟手性。
- **影响范围**：`src/ui/components/step-flow-grid.js`、`src/core/plate/physics/acid-simulator.js`、`src/core/plate/engine/virtual-plate-engine.js`。
- **状态**：生效

### D-0010 交互跟手性极致优化：铜版局部脏矩形渲染与母版参数拖拽 LOD 草稿机制 (ADR-010)
- **背景**：在铜版工坊进行手动画笔/刮刀刻绘时，每次 mousemove/dab 触发全局 900x660（或高分 3000x2200）的全像素 CPU 双循环重算，严重掉帧；同时在母版设计工作区快速滑动参数滑块时，高频全量计算导致主线程拥塞。
- **选项**：1. 降低版面分辨率或降低采样帧率；2. 铜版视图采用脏矩形局部像素循环与 Canvas `putImageData(im, 0, 0, dirtyX, dirtyY, dirtyW, dirtyH)` 局部提交；母版滑块在拖拽过程中触发轻量级 LOD 草稿流线计算，在停顿/松开后自动触发全精度渲染。
- **结论**：采纳选项 2。在 `plate-studio-controller.js` 的 `render()` 引入 `dirtyBounds` 局部像素循环与 7 参数 `putImageData` 脏矩形提交；在 `pipeline-controller.js` 的 `scheduleParameterRun` 区分连续拖拽 (`isDraft: true`，放宽种子步长与求解步数) 与松开结算 (`isDraft: false`，全精密度并固化缓存)。
- **理由**：刻绘笔刷局部刷新范围缩减 99% 以上，滑块拖动延迟降低至 30ms 以内，既保证了实时响应的丝滑跟手感，又确保了最终产出成品的极致雕刻画质。
- **影响范围**：`src/ui/controllers/plate-studio-controller.js`、`src/ui/controllers/pipeline-controller.js`、`src/core/hatching/curves/hatch-streamline.js`、`src/core/pipeline/stage3-contours.js`、`src/main.js`。
- **状态**：生效

### D-0011 独立计算管线 Worker 线程解耦与分级渐进流式渲染 (ADR-011)
- **背景**：5 阶段计算管线此前在 UI 主线程执行，当处理超大图像或高密度排线时占用主线程引发 Long Task (>50ms)，导致浏览器丢帧；且渲染必须等待全量结果就绪才一次性刷屏，首视觉呈现延迟较高。
- **选项**：1. 仅在主线程拆分微任务切片；2. 建设 Dedicated Web Worker 异步计算管线彻底解耦主线程，同时在 StepFlowGrid 引入基于 requestAnimationFrame 的分级渐进流式渲染 (Progressive Chunk Streaming)。
- **结论**：采纳选项 2。在 `src/orchestration/worker/pipeline-worker.js` 设立独立 Worker 异步跑管线，在 Node/不支持环境下自动平滑退避至主线程；在 `StepFlowGrid.updateStepPaths` 实现首批 600 条笔划瞬间上屏，后续笔划通过 requestAnimationFrame 分片流式补全。
- **理由**：彻底解放 UI 主线程保持 60~120 FPS 丝滑响应，并将第一视觉呈现时间 (TTFVS) 缩短至 < 8ms。
- **影响范围**：`src/orchestration/worker/pipeline-worker.js`、`src/ui/controllers/pipeline-controller.js`、`src/ui/components/step-flow-grid.js`。
- **状态**：生效

### D-0012 空间网格视锥裁剪、WebGL2 硬件压印加速、Zero-GC 内存池与工艺上版直通流水线 (ADR-012)
- **背景**：针对高分铜版与数千矢量笔划交互，放大镜全量遍历 7,800+ 路径引发局部渲染开销过大；CPU 纯数字全画幅双循环压印光影计算在 3K 高分下耗时高达 800ms~1500ms；工艺上版转场逐笔绘制与全屏 6.6M 像素全量遍历造成转场时 400ms~600ms 的长任务阻塞；同时 Worker 增量调用每次结构化克隆大尺寸源图像素与导向滤波高频分配 Float32/Float64 数组引发 GC 抖动。
- **选项**：1. 仅降低版面分辨率与限制局部特写倍率；2. 建立粗粒度空间网格索引 (MasterSpatialGrid) 实现微秒级视锥裁剪 (Spatial Frustum Culling)；实装 WebGL2 片元着色器 (PRESS_FRAGMENT_SHADER) 实现 GPU 硬件级多物理场并行压印着色；重构工艺上版转场为线宽离散分桶批量绘制与有效包围盒 (AABB) 紧缩位块传输；在 `stage2-tone-flow.js` 真正落地静态环形复用缓冲区 `BufferArena`，并在 Worker 引入 `SET_SOURCE` 版本源图常驻缓存，阻断高频拖拽时的深克隆与垃圾回收。
- **结论**：采纳选项 2。在 `src/ui/components/loupe.js` 引入 `MasterSpatialGrid` 64x64 均匀网格；在 `src/core/plate/renderer/press-renderer.js` 导出 WebGL2 片元着色器与 `createWebGLPressPipeline`，并在 `VirtualPlateEngine.render` 提供 GPU 渲染通道及平滑退避；在 `src/main.js` 重构 `executeTransfer` 为分桶批处理与紧凑 AABB 像素传输；在 `stage2-tone-flow.js` 实装 `BufferArena`；在 `StepFlowGrid._renderBatchedChunk` 注入 `ctx.save()` / `ctx.restore()` 渲染隔离保护屏障；在 `PipelineController` 与 `pipeline-worker.js` 实现源图像版本缓存，消除重复数据拷贝。
- **理由**：局部视口矢量开销降低 85% 以上，放大镜鼠标跟随延迟降至 < 0.5ms；GPU 压印解算耗时降至 < 4ms；上版转场延迟降低至 < 35ms；Worker 消息传递开销趋近于 0，彻底消除运行期堆内存碎片与长任务丢帧。
- **影响范围**：`src/ui/components/loupe.js`、`src/ui/components/step-flow-grid.js`、`src/core/plate/renderer/press-renderer.js`、`src/core/plate/engine/virtual-plate-engine.js`、`src/core/pipeline/stage2-tone-flow.js`、`src/orchestration/worker/pipeline-worker.js`、`src/ui/controllers/pipeline-controller.js`、`src/main.js`。
- **状态**：生效

### D-0013 算法热点查表化、几何种子队列常数级解构与物理场内存零分配深度优化 (ADR-013)
- **背景**：针对全画幅生成与物理仿真过程，深度分析发现多处潜伏的时延与内存瓶颈：全像素 `toneImage` 逐像素执行双幂次浮点数学运算产生 66ms 耗时；`localContrast` 频繁分配 5 元组邻域小数组导致 GC 堆压力；经典生成流程末端冗余同步执行全量 5 阶段管线多消耗 ~300ms；Jobard-Lefer 排线种子队列采用 `Array.shift()` 引发 $O(N^2)$ 数组搬移延迟；`computeSDF` 与 `boxBlurFloat` 存在多次全画幅 TypedArray 重复分配；3K 高分铜版历史栈无差别完整备份全 0 毛刺场单次消耗 26.4MB。
- **选项**：1. 仅被动依赖现有 GC 回收与硬件算力；2. 实施算法热点 256 阶查找表 (LUT)、无动态对象展开模板、移除经典生成路径冗余同步管线、种子队列读指针常数级出队、SDF 原地求根复用、流场积分图静态内存池及历史栈毛刺场稀疏按需锁存。
- **结论**：采纳选项 2。在 `photo-pro.js` 引入 256 阶 `Uint8Array` LUT，将校正耗时由 66ms 降至 1.8ms；内联展开局部对比度 5 点模板；移除经典生成分支对未读 `computeStages` 的冗余同步调用；在 `hatch-streamline.js` 采用读指针实现 $O(1)$ 种子出队；在 `hatch-distance.js` 原地计算 `Math.sqrt` 消除冗余 Float32Array 分配；在 `hatch-field.js` 引入 `CrossFieldArena` 复用积分图；在 `virtual-plate-engine.js` 引入 `hasBurr` 按需状态标记，未产生毛刺时历史快照不分配毛刺层。
- **理由**：基准测试耗时从 811ms 骤降至 426ms (降低 47.5%)，进程峰值 RSS 从 236.8 MiB 降至 206 MiB；大图排线生成与多次刻板 Undo 内存压力大幅缓解，彻底消除不必要的密集计算与长周期堆内存膨胀。
- **影响范围**：`src/core/image/photo-pro.js`、`src/core/hatching/curves/hatch-streamline.js`、`src/core/hatching/curves/hatch-distance.js`、`src/core/hatching/fields/hatch-field.js`、`src/core/plate/engine/virtual-plate-engine.js`、`BENCHMARK.json`。
- **状态**：生效



