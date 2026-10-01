# 自动化测试矩阵与基准样本规范 (TEST_MATRIX_AND_FIXTURES.md)

> **当前测试运行器**：Node.js 内置测试框架 (`node:test` + `node:assert/strict`)  
> **执行命令**：`npm test` (等效于 `node --test tests/*.test.cjs`)  
> **真实统计**：共 20 个测试套件，104 项测试用例，100% 通过。

---

## 1. 生产环境自动化测试套件矩阵 (Active Test Suites)

| 序号 | 测试文件路径 | 核心验证目标与被测模块 | 用例数 | 关键断言点 |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `tests/depth-contour-curvature.test.cjs` | Lotus 3D 深度与法线流场、空气透视衰减 | 6 | 圆柱体法线切线垂直/水平一致性；深度衰减率 |
| 2 | `tests/exporter.test.cjs` | 矢量母版导出器 (SVG / G-Code / PNG pHYs) | 4 | SVG 分层结构；role === 'contour' 样式分离；G-Code 坐标 |
| 3 | `tests/five-stage-pipeline.test.cjs` | 5阶段管线全流程计算、门面与分层目录等价性 | 3 | PhotoPro.computeStages 产物存在性；Subdirectory/Facade 等价性 |
| 4 | `tests/generator.test.cjs` | 经典木刻/铜版生成器核心、参数确定性 | 9 | PRNG 种子复现；边界包络；极值参数鲁棒性 |
| 5 | `tests/geometry-flow.test.cjs` | 3D 几何曲率场与表面顺形流线 | 6 | 表面法线等高切线计算；几何流场平滑度 |
| 6 | `tests/hatch-attention.test.cjs` | 线稿自注意力机制与排线抑制 | 3 | 轮廓周围自抑制核；食材豁免与瓷器单向约束 |
| 7 | `tests/hatch-facade.test.cjs` | 古建筑立面与曼哈顿正交流场 | 3 | 平整立面检测与排线清空；轴向对齐曼哈顿网格 |
| 8 | `tests/hatching-modular.test.cjs` | 排线子系统 15 个细分算法模块 | 6 | 调子截断；SDF 距离场；拓扑交叉场；Jobard-Lefer 流线 |
| 9 | `tests/high-precision-tone-flow.test.cjs` | 高精度色调场与各向异性扩散流 | 3 | 微纹理细节场保留；各向异性扩散方向相干性 |
| 10 | `tests/orchestrator.test.cjs` | 调度中心与生命周期事件总线 | 2 | 阶段监听器触发顺序；遥测数据流转 |
| 11 | `tests/photo.test.cjs` | 图像处理核心、对比度调整、多尺度结构 | 7 | 白场留白；暗部雕刻密度；1800x1320 分辨率稳定性 |
| 12 | `tests/pipeline-runner.test.cjs` | 阶段管线执行器、缓存复用、任务中断 | 3 | 全量 1~5 阶段执行；增量缓存复用；AbortSignal 响应 |
| 13 | `tests/plate.test.cjs` | 虚拟铜版工坊界面逻辑与 4 工具交互 | 5 | 刻针/干刻针/防蚀漆/刮磨器工具行为；撤销与重做 |
| 14 | `tests/refinement.test.cjs` | 色调校正、自适应迷宫生成、高分编码 | 14 | 灰度阶跃单调性；PlateCodec 无损编解码；极端压印对比 |
| 15 | `tests/stage-cache.test.cjs` | 阶段增量缓存与 DAG 状态哈希 | 3 | DJB2 确定性哈希；下游依赖精确失效 |
| 16 | `tests/task-scheduler.test.cjs` | 防抖调度器与抢占式微任务管理 | 3 | 快速连续调度防抖；新任务抢占中断旧任务 |
| 17 | `tests/ui-button-clicks.test.cjs` | UI 按钮点击事件链路与组件状态迁移 | 12 | 顶栏模式切换；语言切换；步进器；酸液控制台 |
| 18 | `tests/ui.test.cjs` | 国际化 I18n 管理器与 AppStore 响应 | 3 | 语言字典更新；DOM 绑定；Store 订阅发布 |
| 19 | `tests/universal-hatching.test.cjs` | 通用无类别自适应排线与墨量守恒 | 3 | 墨量空间守恒门控；各向同性平面排线抑制 |
| 20 | `tests/virtual-plate-engine.test.cjs` | 铜版无 DOM 物理引擎、化学腐蚀 PDE | 6 | 物理内存分配；偏微分酸蚀扩散；无头纯位图压印 |

---

## 2. 真实基准测试输入样本 (Active Test Fixtures)

项目实际依赖的回归测试样本位于 `examples/` 目录下：

| 样本文件路径 | 尺寸/格式 | 适用测试套件 | 验证侧重点 |
| :--- | :--- | :--- | :--- |
| `examples/photo-fixture.jpg` | JPG 摄影图像 | `tests/photo.test.cjs`, `tests/refinement.test.cjs` | 基础灰度与高反差轮廓生成 |
| `examples/photo-fixture.png` | PNG 摄影图像 | `tests/pipeline-runner.test.cjs` | 5阶段管线回归与全分辨率特征保留 |
| `examples/complex-photo-fixture.png` | PNG 高频细节图 | `tests/refinement.test.cjs` | 1800x1320 超高清分析配方与微细节层 |
