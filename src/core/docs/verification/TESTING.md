---
title: 核心模块验证与测试设计
status: Active
doc-id: TEST-CORE
owner-module: core
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:57:00+08:00
---

# 核心模块验证与测试设计 (TEST-CORE)

## 1. 测试策略与分层

本模块覆盖离散管线数学解算（`src/core/pipeline/`）、几何排线算法（`src/core/hatching/`）、虚拟铜版物理仿真（`src/core/plate/`）以及图像与编解码算子（`src/core/image/`, `src/core/codecs/`）。测试层级设计如下：
- **纯数学函数单元测试**：导向滤波协方差矩阵、积分图常数时间平滑、Sobel 梯度子像素微调、RK2 流线数值积分；
- **物理守恒与不变量断言**：酸液腐蚀时间单调加深性、防蚀漆绝对隔离性（阻断区刻槽深度增量恒等于 0）、毛刺场有界性；
- **边界鲁棒性与异常输入防护**：零尺寸、纯白纯黑单色图像、大图（>1200 万像素）下采样、极端坐标裁剪。

## 2. 真实测试套件与关键用例矩阵

核心模块共包含 16 个测试文件、共计 82 项自动化测试用例：

| 测试文件 | 用例数 | 被测组件 / 符号 | 核心断言与验证目标 |
| :--- | :---: | :--- | :--- |
| `tests/five-stage-pipeline.test.cjs` | 3 | 5 阶段离散算子集成 | 验证 Stage 1 至 Stage 5 端到端产物结构完整性与各阶段数据依赖合法性 |
| `tests/pipeline-runner.test.cjs` | 4 | `PipelineRunner` | 验证全量执行、从 Stage 4 增量执行、AbortSignal 抢占中止与同步阶段间歇退出 |
| `tests/virtual-plate-engine.test.cjs` | 8 | `VirtualPlateEngine` | 验证铜版 900/1500/3000px 分配、4 工具正交物理行为、酸蚀 PDE 积分、纸张纹理预设与快照撤销 |
| `tests/plate.test.cjs` | 7 | 刻版工具与物理网格 | 验证防蚀漆阻断、刮磨器压平毛刺、干刻起毛刺与刻针零刻深物理特性 |
| `tests/depth-contour-curvature.test.cjs` | 6 | Lotus 3D 与曲率流场 | 验证深度图空气透视衰减、曲面切线横截面投影与曲率门控配额释放 |
| `tests/geometry-flow.test.cjs` | 6 | 切线场与导向滤波 | 验证主曲率方向、导向滤波体积分解与结构张量平滑 |
| `tests/hatch-attention.test.cjs` | 3 | `HatchAttention` | 验证轮廓自注意力抑制门控，密集线稿区域排线配额自动归零 |
| `tests/hatch-facade.test.cjs` | 3 | `HatchFacade` | 验证多风格排线调度门面与参数映射稳定性 |
| `tests/hatching-modular.test.cjs` | 6 | 排线微结构子模块 | 验证曼哈顿刚性流、墨量守恒配额释放与各向异性排线生成 |
| `tests/high-precision-tone-flow.test.cjs` | 3 | 高精色调场 | 验证 1800x1320 超清画幅色调积分图加速与微细节分离 |
| `tests/universal-hatching.test.cjs` | 3 | 通用排线集成 | 验证排线生成彻底解耦材料类型（无 materialType 依赖） |
| `tests/generator.test.cjs` | 9 | 图像生成与预处理 | 验证木刻与铜版双范式、自适应迷宫纹理生成与种子确定性 |
| `tests/photo.test.cjs` | 7 | 图像调整与色调映射 | 验证曝光度、对比度、Gamma 亮度单调性与阴影压缩 |
| `tests/refinement.test.cjs` | 14 | 细节优化与编解码 | 验证弱轮廓断续表现、短笔画剪枝、`PlateCodec.pngDpi` 注入 9 字节 pHYs 物理分辨率块 |
| `tests/pipeline-source-cache.test.cjs` | 2 | 图像源缓存版本 | 验证载入新图时阶段缓存失效与版本递增（sourceVersion） |
| `tests/pipeline-source-race.test.cjs` | 2 | 竞态条件与超大图 | 验证旧图像异步回调作废、>1200 万像素大图安全等比下采样 |

## 3. 契约与集成测试

- **消费方契约兼容**：验证 `PipelineRunner.runIncremental` 与 `VirtualPlateEngine` 导出的签名完全满足 `design/INTERFACES.md`（`IF-CORE`）规范；
- **内存安全与泄漏断言**：快照历史栈在达到 12 步或 128MB 时自动执行 FIFO 裁剪，防止 TypedArray 无界累积导致 OOM。

## 4. 测试命令与环境

```powershell
# 执行核心模块全部 16 个测试套件
node --test tests/five-stage-pipeline.test.cjs tests/pipeline-runner.test.cjs tests/virtual-plate-engine.test.cjs tests/plate.test.cjs tests/depth-contour-curvature.test.cjs tests/geometry-flow.test.cjs tests/hatch-attention.test.cjs tests/hatch-facade.test.cjs tests/hatching-modular.test.cjs tests/high-precision-tone-flow.test.cjs tests/universal-hatching.test.cjs tests/generator.test.cjs tests/photo.test.cjs tests/refinement.test.cjs tests/pipeline-source-cache.test.cjs tests/pipeline-source-race.test.cjs
```

## 5. 覆盖率与质量门禁

- **用例通过率要求**：82 项核心单元与集成测试用例必须 100% 通过（Pass Rate = 100%）；
- **门禁阻断标准**：测试执行过程中任何未捕获的 NaN 浮点污染、物理单调性违背或内存未裁剪，立即判定门禁失败。
