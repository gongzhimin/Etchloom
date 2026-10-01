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
- **物理倒角压痕与多型古典外边框 (Plate Bevel & Multi-Style Engraved Outer Frames)**：
  - 继承历史版画经典边框架构（源自 `PhotoPro.framePaths` 与 `output-ui.js`），第 06 步印样卡片与独立导出均真实模拟纯棉纸四周留白（Paper Margin）与 45° 倒角压印凹痕（Plate Bevel）；
  - **外框严格位于版画外侧，绝不小于画面 (Strict Outer Enclosure)**：外框主线坐标严格基于纸面留白外圈（`geom.outer.w > geom.art.w`, `geom.outer.h > geom.art.h`），内部版画面积严格嵌套于内框的安全呼吸边距（Clearance = 10px）内并执行物理裁切，**数学上绝对保证外边框位于画面外侧，杜绝画面溢出外框或外框切入画面的缺陷**；
  - **4 种专业外框类型支持 (Multi-Style Frame Engine)**：
    1. `double`（双层古典边框）：外框主线（1.8px）+ 平行内细线（0.9px）+ 均匀间距，重现经典工坊双层印痕；
    2. `fine`（单线精细刻框）：单线精雅轮廓（1.4px），留白清透典雅；
    3. `rough`（手工古拙边框）：四边由 14 段手工古拙刻痕拼接，微颤不规则刻痕真实还原手工雕刻铜版时的刀感；
    4. `none`（无外框）：仅保留纯棉纸底色与金属倒角凹印，纯净自然；
  - 导出纯净画作本身（含纯棉纸留白、倒角压痕与所选外边框），彻底剥离网页工作台边框与 DOM 界面元素。
- **响应式降级**：屏幕宽度 `< 860px` 时自动重排为单列垂直流。
- **DOM 挂载点**：`#stepFlowGridContainer`

### 1.2 悬浮微交互工具条 (Ghost Action Toolbar)
- **实现位置**：`.card-viewport .card-actions` 与铜版画板 `.plate-canvas-frame .plate-canvas-actions`
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

### 1.5 虚拟铜版全屏特写与古典样印导出 (Plate Studio Fullscreen & Engraved Print Export)
- **彻底移除放大镜**：彻底剔除虚拟铜版上的物理放大镜（Loupe）和全局 Alt 键劫持，杜绝视野遮挡。
- **画板直观全屏特写**：
  - 画板右上角浮动操作条增设 `[⛶ 全屏特写]` 按钮 (`#plateCanvasInspectBtn`)；
  - 顶部操作栏提供 `[⛶ 全屏特写]` 显式按钮 (`#plateFullscreenBtn`)；
  - 在 `view === 'print'`（印样压印审阅）模式下，光标切换为 `zoom-in`，**单机画布任意区域直接弹出 Lightbox 超高清全屏特写**；
  - 在任意模式下（`plate` / `depth` / `print`），**双击铜版画布直接弹出全屏特写**，支持滚轮平滑缩放与拖拽漫游。
- **古典双线边框样印导出**：虚拟铜版在“压印预览”与“取一张印样”导出时，同步绘制古典双线外框（Primary Outer Frame + Parallel Inner Hairline Frame）并保留纯棉纸倒角压痕，导出符合版画工坊传统的高品质独立样印，不含任何 DOM 或工作台辅助边框。

### 1.6 铜版工坊 5 步步进器 (PlateProcessStepper)
- **模板位置**：`#plateStepper`
- **步骤节点**：1. 上版 → 2. 刻绘 → 3. 腐蚀 → 4. 填墨 → 5. 试印
- **状态流转**：通过 `.stepper-step.active`（淡鼠尾草绿高亮）与 `.stepper-step.done` 驱动全流程引导。

### 1.7 模态视口系统 (True Fullscreen Viewport & TransferWizardModal)
- **真全屏沉浸式特写画廊 (`#modalOverlay.fullscreen-viewport-overlay`)**：
  - **彻底移除卡片框与视口限制**：彻底废弃限制在 64vh 与固定弹窗内的伪全屏。视口铺满 100vw × 100vh 整个屏幕，深色半透明微质感磨砂背景 (`rgba(12, 13, 14, 0.94)`)；
  - **最大化屏幕利用率**：进入特写时画布直接按当前浏览器可用视口极限比例（仅留微小边距）全屏展现，**尺寸远大于主工作区卡片，真实还原本体细节**；
  - **悬浮胶囊控制条 (Floating Capsule)**：顶部居中悬浮极简半透明操作胶囊，提供缩小、放大、全屏自适应、1:1 像素复位、原生真全屏切换（F11 API 支持）及关闭按钮；
  - **微观交互**：支持 80%~800% 鼠标滚轮无级缩放、双击在全屏与微观特写间无缝切换、鼠标左键拖拽漫游、点击画作外背景或按 ESC 快速退出。
- **上版工艺向导模态框 (`#transferModalOverlay`)**：支持蚀刻针/干刻直刻技法分流、900/1500/3000 三档网格规格单选、图层选择（全部/仅轮廓/仅排线）与针尖压力模拟。

