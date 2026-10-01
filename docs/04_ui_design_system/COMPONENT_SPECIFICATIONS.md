# UI 原子组件与视口控件规范 (COMPONENT_SPECIFICATIONS.md)

> **基准实现**：[src/ui/components/](../../src/ui/components), [src/ui/templates/layout-templates.js](../../src/ui/templates/layout-templates.js), [styles/app.css](../../styles/app.css)

---

## 1. 核心前端组件库与解耦规范

### 1.1 步骤流 3+4 自然并置网格 (StepFlowGrid 3+4 Rhythmic Grid)
- **源码文件**：[src/ui/components/step-flow-grid.js](../../src/ui/components/step-flow-grid.js)
- **网格机制**：采用 12 列等分弹性网格体系 (`repeat(12, minmax(0, 1fr))`)，通过 CSS `grid-column` 跨度实现 3+4 两行自然并置展开，严格满足“7 张卡片同时展开呈现”的艺术工坊全景观察需求：
  - **上行（上游感知与几何场 3 卡片）**：
    - `[00] 原始输入` (Raw Image, `grid-column: span 4` = 33.33%)
    - `[01] 线稿提取` (Line Map, `grid-column: span 4` = 33.33%)
    - `[02] 3D流场` (3D Flow Field, `grid-column: span 4` = 33.33%)
  - **下行（下游矢量与印样 4 卡片）**：
    - `[03] 空间轮廓` (Contours, `grid-column: span 3` = 25%)
    - `[04] 曲面排线` (Hatching, `grid-column: span 3` = 25%)
    - `[05] 母版图稿` (Master Vector, `grid-column: span 3` = 25%)
    - `[06] 纸张印样` (Paper Print, `grid-column: span 3` = 25%)
- **响应式降级**：屏幕宽度 `< 1280px` 时自动重排为 2 列网格；`< 768px` 时降级为单列垂直流。
- **DOM 挂载点**：`#stepFlowGridContainer`

### 1.2 悬浮微交互工具条 (Ghost Action Toolbar)
- **实现位置**：`.card-viewport .card-actions`
- **交互规范**：
  - 默认状态：`opacity: 0; transform: translateY(-2px);` 完全透明，最大化留出 200px+ 纯净画布视口；
  - 悬停/聚焦状态：鼠标移入卡片视口时，`opacity: 1; transform: translateY(0);` 平滑浮现半透明微质感胶囊（`[⛶ 特写]`, `[⬇ 导出]`）；
  - 视觉样式：采用浅色微毛玻璃轻阴影胶囊 (`background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(4px); box-shadow: 0 2px 4px rgba(0,0,0,0.06);`)，杜绝暗色重边框遮挡画作细节。

### 1.3 上下文解耦侧边栏 (Contextual Sidebar Drawer System)
- **模板位置**：[src/ui/templates/layout-templates.js](../../src/ui/templates/layout-templates.js) 中的 `sidebarTemplate`
- **模式隔离机制**：
  - `body.mode-master`（算法母版设计阶段）：自动隐藏工序 03（铜版物理工坊抽屉 `#drawer3`），聚焦图像感知与几何排线参数；
  - `body.mode-plate`（虚拟铜版工坊阶段）：自动隐藏抽屉 00/01/02，聚焦铜版工具选择、酸液浓度、留墨调子与压印材质。
- **解耦优势**：消除不同工艺阶段的无关控件干扰，降低用户认知负荷达 50% 以上。

### 1.4 抽屉式运行日志托盘 (Slide-up Activity Log Drawer)
- **DOM 结构**：`#activityLogWrap.activity-log-wrap.collapsed`
- **交互规范**：
  - 默认呈极轻量折叠条（高度 32px），右侧带 `▲` 展开指示；
  - 底部遥测栏集成 `[📋 运行日志]` 快捷触发键 (`#activityLogToggle`)，点击可一键平滑滑出 96px 高度日志视口；
  - 彻底解决旧版固定 150px 高度占用导致卡片视口纵向受挤压的弊端。

### 1.5 局部高清放大镜 (LoupeMagnifier)
- **源码文件**：[src/ui/components/loupe.js](../../src/ui/components/loupe.js)
- **功能描述**：按住 `Alt` 键在铜版或步骤流画布上悬停时触发，以 4 倍放大率实时呈现 160px 直径圆形视口，支持物理像素级微刻痕与排线质量微观质检。

### 1.6 铜版工坊 5 步步进器 (PlateProcessStepper)
- **模板位置**：`#plateStepper`
- **步骤节点**：1. 图稿上版 → 2. 版面刻绘 → 3. 酸液腐蚀 → 4. 填墨擦版 → 5. 压印试印
- **状态流转**：通过 `.stepper-step.active`（暖铜金色高亮）与 `.stepper-step.done`（松石绿色完成态）驱动全流程引导。

### 1.7 模态视口系统 (LightboxModal & TransferWizardModal)
- **特写灯箱模态框 (`#modalOverlay`)**：提供 100%~500% 鼠标滚轮平滑无级缩放、双击还原与鼠标左键按住拖拽漫游；
- **上版工艺向导模态框 (`#transferModalOverlay`)**：支持蚀刻针/干刻直刻技法分流、900/1500/3000 三档网格规格单选、图层选择（全部/仅轮廓/仅排线）与针尖压力模拟。

