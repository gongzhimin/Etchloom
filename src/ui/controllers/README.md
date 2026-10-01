# Application Controllers (`src/ui/controllers/`)

> **模块路径**：`src/ui/controllers/`  
> **技术定位**：Layer 3 业务控制器层（Native ES Modules），桥接用户界面 DOM 事件与算法核心；核心中仍有少量画布和网络适配代码。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

本层采用现代原生 ES Modules (`type="module"`) 架构，杜绝内联脚本与杂乱的全局可变状态污染：
1. `PipelineController`：编排母版生成管线，监听输入图像上传，调度 `PipelineRunner`，用 `performance.now()` 度量阶段真实耗时并驱动卡片刷新；
   连续载图时通过来源版本和 `AbortSignal` 阻止旧计算提交；导入上限为 1200 万像素。
2. `PlateStudioController`：管理虚拟铜版工坊画布渲染、4 工具划线涂抹与酸液控制台联动；
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
- [`tests/plate.test.cjs`](../../../tests/plate.test.cjs)（5 项：工具划线、状态保存、大网格分配）
- [`tests/ui-button-clicks.test.cjs`](../../../tests/ui-button-clicks.test.cjs)（12 项：全量按钮点击流、向导交互、模态框开关）

运行命令：
```bash
node --test tests/plate.test.cjs tests/ui-button-clicks.test.cjs
```

---

## 4. 子文档导航 (Sub-documentation Index)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：控制器内部结构与事件映射
- [docs/TESTING.md](docs/TESTING.md)：UI 交互测试套件矩阵
