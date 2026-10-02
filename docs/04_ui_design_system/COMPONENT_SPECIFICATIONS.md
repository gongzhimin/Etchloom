# UI 原子组件与视口控件规范 (COMPONENT_SPECIFICATIONS.md)

> **基准实现**：[src/ui/components/](../../src/ui/components), [src/ui/templates/layout-templates.js](../../src/ui/templates/layout-templates.js), [styles/app.css](../../styles/app.css)

---

## 两阶段工作台表面

`#masterWorkspace` 使用静态低对比纸纤维层；`.master-entry-content` 和 `.master-hero-frame` 使用较浅纸面与接触阴影。铜版主工作区 `.plate-main` 保持浅色纯净背景；宽幅 `.plate-canvas-frame` 使用 `docs/images/oak-workbench.png` 橡木纹与 55% 浅色蒙层。工作台外缘使用木色边框，铜板画布使用深铜色细边和接触阴影；两处均不使用白色描边。纹理不覆盖正文或画布。侧栏上版方式卡片单列排列；窄屏工序条固定四列，底部说明与状态采用有间距的弹性布局。

## 1. 核心前端组件库与解耦规范

### 1.1 七阶段制作过程胶片栏 (`StepFlowGrid`)

- **源码**：[src/ui/components/step-flow-grid.js](../../src/ui/components/step-flow-grid.js)。
- **实际挂载**：母版完成页的 `#filmstripDetails` 默认折叠。展开后，`.filmstrip-scroll` 将 `#stepFlowGridContainer` 设为单行横向滚动；每张卡片宽度为 `clamp(160px, 19vw, 260px)`，视口比例来自原图。
- **卡片顺序**：00 原图、01 线描、02 等高流场、03 空间轮廓、04 曲面排线、05 母版合成、06 上版母稿。第 06 张是可转录的母稿，纸张材质与油墨效果只在铜版试印阶段出现。
- **状态与操作**：计算中清空旧画布；完成徽章只显示 `✓`，状态文本保留在可访问名称中；卡片可检查、全屏查看或单独导出。底部说明按当前语言与实际尺寸、线条数生成。
- **主工作区**：母版页优先显示单张大图预览和主操作按钮，参数抽屉及制作过程按需展开。主工作区不常驻七卡网格。
### 1.2 悬浮微交互工具条 (Ghost Action Toolbar)
- **实现位置**：`.card-viewport .card-actions` 与铜版画板 `.plate-canvas-frame .plate-canvas-actions`
- **交互规范**：
  - 默认状态：`opacity: 0; transform: translateY(-2px);` 完全透明，最大化留出纯净画布视口；
  - 悬停/聚焦状态：鼠标移入卡片视口时，`opacity: 1; transform: translateY(0);` 平滑浮现半透明微质感胶囊（`[⛶ 特写]`, `[⬇ 导出]`）；
  - 视觉样式：采用淡鼠尾草绿协调的浅色微毛玻璃轻阴影胶囊 (`background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(4px); box-shadow: 0 2px 4px rgba(0,0,0,0.06);`)，杜绝暗色重边框遮挡画作细节。

### 1.3 按阶段呈现的控制区

- 母版首次进入只显示选图与示例入口；母版完成后才显示大图预览、制作过程胶片栏和外观参数抽屉。
- 铜版页面使用 `.plate-sidebar` 呈现当前工序的上版、刻绘、蚀刻或试印控件；工序通过 `#plateStepper` 切换。
- 上版页外侧只提供技法选择及快捷上版；精度、图层和转录线宽在“调整上版细节”弹窗中设置。刻绘工具直径在刻绘工序中调整。
- 旧版 `aside.app-sidebar` 模板仍在装配结构中，但两阶段模式下不作为用户主要操作侧栏。两阶段的显隐由 `switchWorkflow`、工序控制器与 CSS 共同管理。
### 1.4 抽屉式运行日志托盘 (Slide-up Activity Log Drawer)
- **DOM 结构**：`#activityLogWrap.activity-log-wrap.collapsed`
- **交互规范**：
  - 默认呈极轻量折叠条（高度 32px），右侧带 `▲` 展开指示；
  - 底部遥测栏集成 `[📋 运行日志]` 快捷触发键 (`#activityLogToggle`)，点击可一键平滑滑出 96px 高度日志视口；
  - 彻底释放主工作区垂直净空，确保大卡片自由向下滚动。

### 1.5 虚拟铜版全屏特写、正向样印与比例自适应 (Plate Studio Fullscreen, Upright Print & Dynamic Ratio)
- **彻底移除放大镜**：彻底剔除虚拟铜版上的物理放大镜（Loupe）和全局 Alt 键劫持，杜绝视野遮挡。
- **画板直观全屏特写**：
  - 画板右上角浮动操作条增设 `[⛶ 全屏特写]` 按钮 (`#plateCanvasInspectBtn`)；
  - 顶部操作栏提供 `[⛶ 全屏特写]` 显式按钮 (`#plateFullscreenBtn`)；
  - 在 `view === 'print'`（印样压印审阅）模式下，光标切换为 `zoom-in`，**单机画布任意区域直接弹出 Lightbox 超高清全屏特写**；
  - 在任意模式下（`plate` / `depth` / `print`），**双击铜版画布直接弹出全屏特写**，支持滚轮平滑缩放与拖拽漫游。
- **正向样印压印（Upright Impression, No Inversion）**：
  - 压印模拟默认采用正向印痕映射（`mirrorPrint = false`），彻底解决传统印制仿真中水平反转导致画面左右镜像、人物朝向反向的缺陷；
  - 同步绘制古典外框（双线/单线/手工古拙），保留纯棉纸倒角压痕，导出符合现代版画工作室诉求的端正独立样印，不含任何 DOM 或工作台辅助边框。
- **版画比例根据图片原始比例自适应 (Dynamic Plate Aspect Ratio Adaptation)**：
  - 彻底废除硬编码的 `660 / 900`（或 1500x1100）固定长宽比；
  - 虚拟铜版画板（`W, H`）及压印导出根据导入源图片的原始物理宽高比（`origW / origH`）自适应计算尺寸（如竖图 2:3、横图 16:9 等自洽缩放）；
  - 向铜版转录图稿、分辨率升档（900/1500/3000）及撤销恢复均严格遵循源图宽高比。

### 1.6 铜版工坊 4 步步进器 (PlateProcessStepper)
- **模板位置**：`#plateStepper`
- **步骤节点**：1. 上版 → 2. 刻绘 → 3. 腐蚀 → 4. 试印（试印面板包含着墨设置）
- **状态流转**：通过 `.stepper-step.active`（淡鼠尾草绿高亮）与 `.stepper-step.done` 驱动全流程引导。

### 1.7 模态视口系统 (True Fullscreen Viewport & Dual-Engine Lightbox)
- **真全屏沉浸式特写画廊 (`#modalOverlay.fullscreen-viewport-overlay`)**：
  - **彻底移除卡片框与视口限制**：彻底废弃限制在 64vh 与固定弹窗内的伪全屏。视口铺满 100vw × 100vh 整个屏幕，深色半透明微质感磨砂背景 (`rgba(12, 13, 14, 0.94)`)；
  - **最大化屏幕利用率**：进入特写时画布直接按当前浏览器可用视口极限比例（仅留微小边距）全屏展现，**尺寸远大于主工作区卡片，真实还原本体细节**；
  - **全矢量无失真微观引擎 (True Vector SVG Dual-Engine)**：
    - **中间产物数据类型精准辨析**：
      - `Step 0`（原图输入）：RGB 栅格位图（Raster Bitmap）；
      - `Step 1`（线描感知）：连续亮度/边缘梯度张量（2D Float32 Tensor，栅格连续场）；
      - `Step 2`（等高流场）：2D 结构张量与局部切向向量场（离散网格场）；
      - `Step 3`（透视轮廓）：**真正参数化矢量多折线**（True Vector Polylines）；
      - `Step 4`（曲面排线）：**真正矢量积分流线**（True Vector Streamlines）；
      - `Step 5`（母版合成）：**真正分层统一矢量母版**（Unified Layered Vector Paths）；
      - `Step 6`（上版母稿）：矢量线稿（冷白底 `<rect fill="#f4f7f7">` + 定位标记 `<g id="etchloom-registration">` + 外框 `<g id="etchloom-frame">` + 画作 `<g id="etchloom-artwork">`）；纸张效果在铜版试印阶段渲染；
    - **矢量阶段（Step 3、4、5、6）SVG 原生渲染**：
      - 激活 `#modalSvgWrap`，直接向 DOM 注入带 `viewBox` 与 `shape-rendering: geometricPrecision` 的高精度标准矢量 SVG；
      - 鼠标滚轮缩放（80%~500%）与拖拽漫游直接作用于 SVG 矢量容器，**数学级保真，0% 模糊失真，无限放大绝无位图马赛克或模糊边缘**；
    - **栅格阶段（Step 0、1、2 及铜版物理仿真）高清 Canvas 渲染**：
      - 激活 `#modalCanvas`，以源图物理原分辨率进行高保真重采样与无级变换。
  - **悬浮胶囊控制条 (Floating Capsule)**：顶部居中悬浮极简半透明操作胶囊，提供缩小、放大、全屏自适应、1:1 像素复位、原生真全屏切换（F11 API 支持）及关闭按钮；
  - **微观交互**：支持 80%~500% 鼠标滚轮无级缩放、双击在全屏与微观特写间无缝切换、鼠标左键拖拽漫游、点击画作外背景或按 ESC 快速退出。
- **上版工艺向导模态框 (`#transferModalOverlay`)**：支持蚀刻针/干刻直刻技法分流、900/1500/3000 三档网格规格单选、图层选择（全部/仅轮廓/仅排线）与针尖压力模拟。

### 1.8 UI 彻底解耦与无头适配架构 (UI Decoupling & Headless Adapter Architecture)
- **参数解耦机制 (`PipelineController.getParams`)**：
  - 控制器不再直接通过 `document.getElementById('exposure')` 硬编码绑定 DOM 滑块输入；
  - 构造函数注入 `options.getParams: () => ({ exposure, blackPoint, ... })`，集中式由外部入口适配；
  - 内部方法 `getRecipeParams()` 保证无论未来 UI 如何重构（如预设卡片组、弹窗滑块、移动端抽屉），算法管线控制器源码零改动。
- **遥测状态解耦机制 (`PipelineController.onTelemetry`)**：
  - 剔除对 `telemetryStatus`、`telemetryTask`、`telemetryDuration`、`telemetryStrokes`、`telemetryCache` 5 个 DOM 节点的直接属性赋值；
  - 控制器通过统一的 `updateTelemetry(metrics)` 触发观察者事件，解耦展现层。
- **渲染主题跨层解耦桥 (`ThemeBridge`)**：
  - Canvas 2D `ctx.fillStyle` / `ctx.strokeStyle` 与序列化 SVG XML 无法直接感知 CSS `var(--token)`；
  - 通过 `src/services/theme/theme-bridge.js` 统一解析运行时主题，在浏览器端动态反射 `:root` 变量，在 Node.js / 测试环境中以古典工坊色谱安全退避。
- **模板完全脱敏规范 (Zero Inline Styles)**：
  - `src/ui/templates/layout-templates.js` 彻底剔除所有内联 `style="..."` 声明；
  - 所有间距、边框、尺寸统一由 `styles/app.css` 中的语义类与 Token 梯队定义（如 `.transfer-wizard-modal`、`.wizard-stats-box`、`.u-space-4` 等）。


