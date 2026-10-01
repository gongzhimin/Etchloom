# UI 原子组件与视口控件规范 (COMPONENT_SPECIFICATIONS.md)

> **基准实现**：[src/ui/components/](../../src/ui/components), [src/ui/templates/layout-templates.js](../../src/ui/templates/layout-templates.js)

---

## 1. 核心前端组件库

### 1.1 步骤流网格 (StepFlowGrid)
- **源码文件**：[src/ui/components/step-flow-grid.js](../../src/ui/components/step-flow-grid.js)
- **功能描述**：承载 7 个自适应卡片（原图、线描、流场、轮廓、排线、母版、印样），支持自适应弹性网格布局、局部 Canvas 快速预览、耗时 Badge 展示与全屏特写回调。
- **DOM 挂载点**：`#stepFlowGridContainer`

### 1.2 局部高清放大镜 (LoupeMagnifier)
- **源码文件**：[src/ui/components/loupe.js](../../src/ui/components/loupe.js)
- **功能描述**：按住 `Alt` 键在铜版或步骤流画布上悬停时触发，以 4 倍放大率实时呈现 160px 直径圆形视口，支持物理像素级微刻痕检查。

### 1.3 铜版工坊 5 步步进器 (PlateProcessStepper)
- **模板位置**：`#plateStepper`
- **步骤节点**：1. 图稿上版 → 2. 版面刻绘 → 3. 酸液腐蚀 → 4. 填墨擦版 → 5. 压印试印
- **状态流转**：通过 `.stepper-step.active` 与 `.stepper-step.done` 控制视觉高亮与步骤导航。

### 1.4 模态视口系统 (LightboxModal & TransferWizardModal)
- **灯箱模态框 (`#modalOverlay`)**：提供 100%~500% 鼠标滚轮平滑缩放与按住左键拖拽漫游功能；
- **上版向导模态框 (`#transferModalOverlay`)**：提供图层分选、物理网格分辨率单选（900/1500/3000）与工艺技法选择（蚀刻针/干刻直刻）。
