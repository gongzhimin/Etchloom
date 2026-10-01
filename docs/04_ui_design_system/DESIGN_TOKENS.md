# UI 设计系统 Design Tokens 规范 (DESIGN_TOKENS.md)

> **基准文件**：[styles/app.css](../../styles/app.css)  
> **文档原则**：100% 对应源码 :root 声明，杜绝臆造。

---

## 1. 颜色体系 (Color Palette)

系统采用暗色调工业古典风格，主色调围绕暗绿墨色调与金属铜金色展开。

### 1.1 表面层级 (Surfaces & Backgrounds)

| CSS 变量名 | 真实色值 (Hex) | 语义说明 | 实际应用场景 |
| :--- | :--- | :--- | :--- |
| --bg-app | #191d1a | 顶层基底底色 | 页面顶栏 (header.app-header)、主背景容器 |
| --bg-surface | #202421 | 工作区表面背景 | 页面主体 (ody)、绘图视口区域背景 |
| --bg-card | #242923 | 卡片与抽屉面板背景 | 侧边栏抽屉卡片 (.drawer-subgroup)、网格卡片背景 |
| --bg-card-header | #1f2520 | 卡片标题栏背景 | 卡片头部、模态框头部 |
| --bg-input | #2a312a | 表单控件背景 | 范围滑块轨道、下拉框、文本输入框背景 |

### 1.2 边框体系 (Borders)

| CSS 变量名 | 真实色值 (Hex) | 语义说明 | 实际应用场景 |
| :--- | :--- | :--- | :--- |
| --border-subtle | #3b4238 | 次级微弱分割线 | 侧边栏与主区分割线、抽屉下边框、卡片边框 |
| --border-strong | #515949 | 强化分割线 | 激活卡片边框、模态框外轮廓、高亮按键外轮廓 |

### 1.3 强调色与材质色彩 (Accents & Material Cues)

| CSS 变量名 | 真实色值 (Hex) | 语义说明 | 实际应用场景 |
| :--- | :--- | :--- | :--- |
| --accent-gold | #c8b67e | 古典铜金主色 | 主按钮激活状态、选中标签高亮、强调标题 |
| --accent-gold-hover| #dbca94 | 铜金悬停态 | 鼠标悬停主按钮时的高亮底色 |
| --copper-glow | #b87333 | 纯铜材质金属色 | 虚拟铜版边缘倒角阴影、铜版仿真画布背景 |
| --paper-ivory | #f8f4e6 | 象牙白版画纸色 | 压印印样仿真预览基底、纯棉纸背景 |
| --accent-green | #16a34a | 状态就绪绿 | 运行日志 IDLE 状态徽标 (.badge-green) |
| --accent-amber | #d97706 | 状态警告琥珀色 | 模型检测中状态徽标、异常提示 (.badge-amber) |

### 1.4 文字色彩 (Typography Colors)

| CSS 变量名 | 真实色值 (Hex) | 语义说明 | 实际应用场景 |
| :--- | :--- | :--- | :--- |
| --text-primary | #ded9cc | 一级高对比文本 | 标题、主要按钮文本、重点参数读数 |
| --text-secondary| #a1a593 | 二级说明文本 | 标签名、说明文案、辅助信息 |
| --text-muted | #6b7364 | 三级弱化文本 | 提示词、快捷键说明、禁用提示 |

---

## 2. 字体排印规范 (Typography Tokens)

| CSS 变量名 | 声明字体栈 | 适用场景 |
| :--- | :--- | :--- |
| --font-serif | Georgia, 'Songti SC', 'Source Han Serif SC', serif | 品牌标题、工坊阶段标题、古典印刷工艺标语 |
| --font-sans | -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif | 通用 UI 界面、按钮、标签、输入控件 |
| --font-mono | 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace | 坐标读数、日志时间戳、微秒耗时统计、刻深数据 |

---

## 3. 布局与尺寸约束 (Layout Constraints)

| 布局区域 | 尺寸参数 | 说明 |
| :--- | :--- | :--- |
| 顶栏 (header.app-header) | 高度固定 64px | 包含 Logo、工作模式 Tab 与功能操作区 |
| 侧边栏 (side.app-sidebar) | 宽度固定 320px | 包含 4 个垂直可滚动的工序抽屉 |
| 底部遥测栏 (ooter.telemetry-footer) | 高度固定 32px | 包含状态、任务名、耗时、矢量线段计数与缓存命中率 |
| 铜版画布物理分辨率 | 900x660, 1500x1100, 3000x2200 | 对应 1x, 2K, 3K 三档离散物理网格 |
