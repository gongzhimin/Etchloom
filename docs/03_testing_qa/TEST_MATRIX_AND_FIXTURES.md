# 自动化测试矩阵与基准样本规范 (TEST_MATRIX_AND_FIXTURES.md)

> **当前测试运行器**：Node.js 内置测试框架 (`node:test` + `node:assert/strict`)  
> **执行命令**：`npm test` (等效于 `node scripts/test-runner.cjs`)  
> **最近一次本地运行（2026-10-02）**：32 个测试文件，151 项测试用例通过；当前数量以 `npm test` 输出为准。

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
| 12 | `tests/pipeline-runner.test.cjs` | 阶段管线执行器、缓存复用、任务中断 | 4 | 全量 1~5 阶段执行；增量缓存复用；阶段间 AbortSignal 响应 |
| 13 | `tests/plate.test.cjs` | 虚拟铜版工坊界面逻辑与 4 工具交互 | 7 | 刻针/干刻针/防蚀漆/刮磨器工具行为；撤销与重做；纸张纹理 |
| 14 | `tests/refinement.test.cjs` | 色调校正、自适应迷宫生成、高分编码 | 14 | 灰度阶跃单调性；PlateCodec 无损编解码；极端压印对比 |
| 15 | `tests/stage-cache.test.cjs` | 阶段增量缓存与 DAG 状态哈希 | 3 | DJB2 确定性哈希；下游依赖精确失效 |
| 16 | `tests/task-scheduler.test.cjs` | 防抖调度器与抢占式微任务管理 | 3 | 快速连续调度防抖；新任务抢占中断旧任务 |
| 17 | `tests/ui-button-clicks.test.cjs` | UI 按钮点击事件链路与组件状态迁移 | 15 | 顶栏模式切换；语言切换；步进器；酸液控制台；外框风格 |
| 18 | `tests/ui.test.cjs` | 国际化 I18n 管理器与 AppStore 响应 | 5 | 语言字典更新；DOM 绑定；Store 订阅发布；越南语词库 |
| 19 | `tests/universal-hatching.test.cjs` | 通用无类别自适应排线与墨量守恒 | 3 | 墨量空间守恒门控；各向同性平面排线抑制 |
| 20 | `tests/virtual-plate-engine.test.cjs` | 铜版无 DOM 物理引擎、化学腐蚀 PDE | 8 | 物理内存分配；偏微分酸蚀扩散；无头纯位图压印；零刻深守卫 |
| 21 | `tests/app-entry-mount.test.cjs` | 应用入口模块图与 DOM 装配 | 1 | 真实入口可加载并挂载，无语法死锁 |
| 22 | `tests/lightbox-vector.test.cjs` | 七阶段 SVG 与灯箱全屏检查器 | 3 | 矢量双引擎渲染；视口缩放与拖拽；图层导出 |
| 23 | `tests/theme-bridge.test.cjs` | 主题网桥与设计 Token 约束 | 7 | 无头主题解析；样式模板约束；铜版初始空版守卫；酸蚀动态刻深增长；导出文件名时间戳防重名 |
| 24 | `tests/web-ai-client.test.cjs` | 浏览器端神经网络与离线降级 | 1 | Node 环境能力探测与离线纯 JS 退避模式 |
| 25 | `tests/preview-server.test.cjs` | 本机预览服务安全边界 | 1 | 应用资产可访问，归档和文档不可越权访问 |
| 26 | `tests/pipeline-source-cache.test.cjs` | 换图缓存隔离与版本递增 | 2 | 新来源取消待执行任务、清空旧产物并递增来源版本 |
| 27 | `tests/pipeline-source-race.test.cjs` | 图像加载竞态与防滞后覆盖 | 2 | 迟滞原图不可覆盖新原图或抢跑管线计算 |
| 28 | `tests/two-stage-ui.test.cjs` | 双阶段渐进披露与四态酸液状态机 | 9 | 顶栏双阶段切换；4阶段工序；4态酸蚀状态机；上版拦截 |
| 29 | `tests/desktop-packaging.test.cjs` | 桌面端打包与 Tauri 资源完整性 | 2 | 生产打包轻量完整；Tauri 与应用图标资源就绪 |
| 30 | `tests/ui-surfaces.test.cjs` | 双阶段台面与木纹资源一致性 | 3 | 母版与铜版底色；局部木纹、浅色蒙层、台面及铜板边界；说明与状态间距 |
| 31 | `tests/mobile-layout-lightbox.test.cjs` | 移动端紧凑布局、防文本竖折与双指捏合缩放灯箱 | 3 | 胶卷卡片最小宽度防字符竖排；灯箱 dvh 视口与双指缩放手势；主图视口自适应比例 |
| 32 | `tests/mobile-touch-sheet.test.cjs` | 移动端触摸防误触、底部抽屉与多指下针防护 | 3 | touch-action 防误触；BottomSheet 拖拽展开与折叠；双指触摸时禁止下针划线 |

---

## 2. 真实基准测试输入样本 (Active Test Fixtures)

项目实际依赖的回归测试样本位于 `examples/` 目录下：

| 样本文件路径 | 尺寸/格式 | 适用测试套件 | 验证侧重点 |
| :--- | :--- | :--- | :--- |
| `examples/photo-fixture.jpg` | JPG 摄影图像 | `tests/photo.test.cjs`, `tests/refinement.test.cjs` | 基础灰度与高反差轮廓生成 |
| `examples/photo-fixture.png` | PNG 摄影图像 | `tests/pipeline-runner.test.cjs` | 5阶段管线回归与全分辨率特征保留 |
| `examples/complex-photo-fixture.png` | PNG 高频细节图 | `tests/refinement.test.cjs` | 1800x1320 超高清分析配方与微细节层 |
