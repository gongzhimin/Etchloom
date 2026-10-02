# Application Controllers (`src/ui/controllers/`)

> **模块路径**：`src/ui/controllers/`  
> **技术定位**：Layer 3 业务控制器层（Native ES Modules），桥接用户界面 DOM 事件与算法核心；核心中仍有少量画布和网络适配代码。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

本层采用现代原生 ES Modules (`type="module"`) 架构，杜绝内联脚本与杂乱的全局可变状态污染：
1. `PipelineController`：编排母版生成管线，监听输入图像上传，调度 `PipelineRunner`，用 `performance.now()` 度量阶段真实耗时并驱动卡片刷新；
   连续载图时通过来源版本和 `AbortSignal` 阻止旧计算提交；超出 1200 万像素或单边 4096 像素的原图在创建处理画布前等比缩小。
   母版就绪时通过 `onMasterReady` 通知入口；主动载入的示例不显示固定的伪耗时。
   参数重绘由 `TaskScheduler` 防抖调度，`onRecomputeState` 通知界面显示或隐藏不确定进度条。
   七阶段卡片的动态说明以 `{ key, args }` 传给 `StepFlowGrid`，避免在控制器中写入固定中文；`downloadStepExport(stepIdx)` 统一生成 `Etchloom-step${stepIdx}-${type}-${timestamp}.${ext}` 时间戳命名。
2. `PlateStudioController`：管理虚拟铜版工坊画布渲染、4 工具划线涂抹与酸液控制台联动；
   腐蚀计时保持真实秒数，反应步长为实际秒数的 `0.4` 倍；平均刻槽深度聚焦有效雕刻与腐蚀区域（`exposed >= 0.05 || depth >= 0.005`）动态度量；印样导出与铜版保存集成 `getPlateTimestamp()` 时间戳。
3. `TransferWizardController`：控制图稿上版向导模态框，执行矢量笔画 Bresenham 离散划线并写入物理网格；
4. `LightboxController`：管理超高清全屏视口，支持 100%~500% 鼠标滚轮平滑缩放与拖拽漫游。

---

## 2. 内部架构与组件拓扑 (Internal Architecture & Component Map)

| 源码文件名 | 核心类 / 导出对象 | 职责定位 |
| :--- | :--- | :--- |
| `pipeline-controller.js` | `PipelineController` | 母版生成执行流编排、图片上传处理、进度回调与性能耗时刷新 |
| `plate-studio-controller.js` | `PlateStudioController` | 铜版仿真界面状态机、4 工具物理交互、酸液控制台事件驱动 |
| `transfer-wizard-controller.js`| `TransferWizardController` | 图稿上版向导模态框控制器，负责图层分选与物理刻痕录入 |
| `lightbox-controller.js` | `LightboxController` | 步骤流特写视口缩放与平移漫游控制器 |

---

## 3. 自动化测试与验证 (Testing & Verification)

针对本控制器层的测试文件包括：
- [`tests/plate.test.cjs`](../../../tests/plate.test.cjs)（工具划线、状态保存、大网格分配）
- [`tests/ui-button-clicks.test.cjs`](../../../tests/ui-button-clicks.test.cjs)（按钮点击流、向导交互、模态框开关）
- [`tests/two-stage-ui.test.cjs`](../../../tests/two-stage-ui.test.cjs)（双阶段模板与酸液状态）
- [`tests/theme-bridge.test.cjs`](../../../tests/theme-bridge.test.cjs)（设计 Token、零内联样式、动态刻深与导出命名规范）

运行命令：
```bash
node --test tests/plate.test.cjs tests/ui-button-clicks.test.cjs tests/theme-bridge.test.cjs
```

---

## 4. 子文档导航 (Sub-documentation Index)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：控制器内部结构与事件映射
- [docs/TESTING.md](docs/TESTING.md)：UI 交互测试套件矩阵

## 试印纸张更新

试印提供 `rough`、`smooth`、`linen`、`rosaspina` 四种表面预设。后两者参考真实凹版纸的材质与纹理；实现通过底色、确定性空间纹理和着墨变化进行视觉区分，未对实体纸做物理标定。纸张选择会触发试印重绘，说明文案随 zh-CN、en-US、vi-VN 切换。`tests/virtual-plate-engine.test.cjs` 检查四种纸面的像素差异。

蚀刻工作台顶部的精度为只读值，由上版流程选择精度后更新；手工刻绘的 `size` 滑块直接改变刻针足迹。快捷上版固定使用 100% 线宽；上版细节弹窗中的 `wizardLineWidth` 以 50%–200% 缩放转录笔画，和手工工具直径相互独立。
