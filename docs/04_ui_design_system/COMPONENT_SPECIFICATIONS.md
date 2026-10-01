# UI 原子组件与视口控件规范 (COMPONENT_SPECIFICATIONS.md)

> **基准实现**：[src/ui/components/](../../src/ui/components), [src/ui/templates/layout-templates.js](../../src/ui/templates/layout-templates.js), [styles/app.css](../../styles/app.css)

---

# UI 原子组件与视口控件规范 (COMPONENT_SPECIFICATIONS.md)

> **基准实现**：[src/ui/components/](../../src/ui/components), [src/ui/templates/layout-templates.js](../../src/ui/templates/layout-templates.js), [styles/app.css](../../styles/app.css)

---

## 1. 核心前端组件库与解耦规范

### 1.1 步骤流 2列4行 自然舒展网格 (StepFlowGrid 2x4 Studio Grid)
- **源码文件**：[src/ui/components/step-flow-grid.js](../../src/ui/components/step-flow-grid.js)
- **网格机制**：采用 2 列 4 行弹性网格体系 (`grid-template-columns: repeat(2, minmax(0, 1fr))`)，水平宽度充满工作区，单卡片视口充裕（视口高度 380px+），主工作区通过 `overflow-y: auto` 垂直自然滚动：
  - **第 1 行**：
    - `[00] 原图输入` (Raw Image, `grid-column: span 1` = 50%)
    - `[01] 线描感知` (Line Map, `grid-column: span 1` = 50%)
  - **第 2 行**：
    - `[02] 等高流场` (3D Flow Field, `grid-column: span 1` = 50%)
    - `[03] 透视轮廓` (Contours, `grid-column: span 1` = 50%)
  - **第 3 行**：
    - `[04] 曲面排线` (Hatching, `grid-column: span 1` = 50%)
    - `[05] 母版合成` (Master Vector, `grid-column: span 1` = 50%)
  - **第 4 行**：
    - `[06] 纯棉印样` (Paper Print Sample, `grid-column: 1 / -1` = 100% 独占底部通栏跨行展示)
- **卡片比例自适应与横向全宽填充 (Dynamic Aspect Ratio & Full-Width Fill)**：
  - 7 张卡片与 Canvas 的宽高比根据导入图片的物理比例（`origW / origH`）动态自适应；
  - Canvas 声明 `width: 100%; height: auto; display: block;`，横向 100% 饱满铺满卡片视口，高度根据原图比例自洽伸展，杜绝留白边与黑条；
  - 通过 `stepGrid.setAspectRatio(width, height)` 统一驱动 7 个卡片的分辨率与 CSS `aspect-ratio`。
- **主工作区视口约束与平滑垂直滚动 (Scrollable Workspace Viewport)**：
  - 顶层容器 `#app` 严格继承 `height: 100%; overflow: hidden;`，`main.app-main` 占满剩余视口净高；
  - `.workspace-area` 设置 `overflow-y: auto; overflow-x: hidden;`，用户通过鼠标滚轮或滚动条可无阻碍向下纵览全部 2 列 4 行大卡片及底部日志控制台。
- **计算中清空画布机制**：当卡片处于 `COMPUTING` 状态时，执行 `ctx.clearRect` 并注入淡雅占位底，彻底清空上一张图或静物范式的生成残留。
- **物理倒角压痕 (Plate Bevel)**：第 06 步印样卡片与独立导出均真实模拟四周纸边留白（Paper Margin）与 45° 倒角压印凹痕（背光阴影/受光高光），无任何工作台辅助框杂质。
- **响应式降级**：屏幕宽度 `< 860px` 时自动重排为单列垂直流。
- **DOM 挂载点**：`#stepFlowGridContainer`

### 1.2 悬浮微交互工具条 (Ghost Action Toolbar)
- **实现位置**：`.card-viewport .card-actions`
- **交互规范**：
  - 默认状态：`opacity: 0; transform: translateY(-2px);` 完全透明，最大化留出纯净画布视口；
  - 悬停/聚焦状态：鼠标移入卡片视口时，`opacity: 1; transform: translateY(0);` 平滑浮现半透明微质感胶囊（`[⛶ 特写]`, `[⬇ 导出]`）；
  - 视觉样式：采用淡鼠尾草绿协调的浅色微毛玻璃轻阴影胶囊 (`background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(4px); box-shadow: 0 2px 4px rgba(0,0,0,0.06);`)，杜绝暗色重边框遮挡画作细节。

### 1.3 上下文解耦侧边栏 (Contextual Sidebar Drawer System)
- **模板位置**：[src/ui/templates/layout-templates.js](../../src/ui/templates/layout-templates.js) 中的 `sidebarTemplate`
- **极简化文案**：摒弃长篇大论的说教说明，提炼核心极简工艺标签（“00 / 图像感知”、“01 / 空间轮廓”、“02 / 曲面排线”、“03 / 铜版工坊”）。
- **模式隔离机制**：
  - `body.mode-master`（母版设计阶段）：自动隐藏工序 03（铜版工坊抽屉 `#drawer3`），聚焦图像感知与几何排线参数；
  - `body.mode-plate`（虚拟铜版阶段）：自动隐藏抽屉 00/01/02，聚焦铜版工具选择、酸液浓度、留墨调子与压印材质。
- **全管线增量依赖合成**：用户选图后调整左侧滑块，管线拓扑缓存保证空间轮廓（Stage 3）与曲面排线（Stage 4）加和复合至母版图稿（Stage 5）与印样（Stage 6），始终呈现全景完整效果。

### 1.4 抽屉式运行日志托盘 (Slide-up Activity Log Drawer)
- **DOM 结构**：`#activityLogWrap.activity-log-wrap.collapsed`
- **交互规范**：
  - 默认呈极轻量折叠条（高度 32px），右侧带 `▲` 展开指示；
  - 底部遥测栏集成 `[📋 运行日志]` 快捷触发键 (`#activityLogToggle`)，点击可一键平滑滑出 96px 高度日志视口；
  - 彻底释放主工作区垂直净空，确保大卡片自由向下滚动。

### 1.5 虚拟铜版全屏特写与独立导出 (Plate Studio Fullscreen & Clean Export)
- **全屏特写**：移除铜版上的圆形放大镜遮罩，顶栏提供 `[⛶ 全屏特写]` 显式按钮 (`#plateFullscreenBtn`) 与画布双击交互，一键唤出支持无级缩放与拖拽平移的 Lightbox 全屏特写。
- **纯净画作导出**：在虚拟铜版点击“取一张印样”或在步骤流导出第 06 步时，系统仅导出纯净画作本身，完美还原棉纸四周留白与 45° 金属倒角凹印压痕，彻底剥离工作台边框与 DOM 界面元素。

### 1.6 铜版工坊 5 步步进器 (PlateProcessStepper)
- **模板位置**：`#plateStepper`
- **步骤节点**：1. 上版 → 2. 刻绘 → 3. 腐蚀 → 4. 填墨 → 5. 试印
- **状态流转**：通过 `.stepper-step.active`（淡鼠尾草绿高亮）与 `.stepper-step.done` 驱动全流程引导。

### 1.7 模态视口系统 (LightboxModal & TransferWizardModal)
- **特写灯箱模态框 (`#modalOverlay`)**：提供 100%~500% 鼠标滚轮平滑无级缩放、双击还原与鼠标左键按住拖拽漫游；
- **上版工艺向导模态框 (`#transferModalOverlay`)**：支持蚀刻针/干刻直刻技法分流、900/1500/3000 三档网格规格单选、图层选择（全部/仅轮廓/仅排线）与针尖压力模拟。

