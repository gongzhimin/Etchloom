# UI 设计系统 Design Tokens 规范 (DESIGN_TOKENS.md)

> **基准文件**：[styles/app.css](../../styles/app.css)  
> **文档原则**：100% 对应源码 `:root` 声明，杜绝臆造。

---

# UI 设计系统 Design Tokens 规范 (DESIGN_TOKENS.md)

> **基准文件**：[styles/app.css](../../styles/app.css)  
> **文档原则**：100% 对应源码 `:root` 声明，杜绝臆造。

---

## 1. 颜色体系 (Airy Linen & Pale Sage Atelier Palette)

系统采用极简淡雅的工坊浅色美学体系（Airy Linen & Pale Muted Sage），以通透纯净的亚麻暖白 (`#faf8f5`) 与工作室白色为基底，辅以温和内敛的淡鼠尾草绿 (Pale Muted Sage, `#7a8c7e`) 与柔和陶土色 (`#9c755f`)，搭配轻量羽感分割线 (`#eae5dc`) 与高可读性暖炭灰排印 (`#2a2b2a`)，彻底摒弃沉重黄铜与暗色风格。

### 1.1 表面与基底层级 (Surfaces & Backgrounds)

| CSS 变量名 | 真实色值 (Hex) | 语义说明 | 实际应用场景 |
| :--- | :--- | :--- | :--- |
| `--bg-app` | `#faf8f5` | 淡雅亚麻纸白基底 | 页面主工作区底色、侧边栏次级分组底色 |
| `--bg-surface` | `#ffffff` | 纯净白表面背景 | 页面主体背景、顶栏背景、侧边栏主体背景 |
| `--bg-card` | `#ffffff` | 卡片主体背景 | 7阶段步骤卡片表面、对话框背景 |
| `--bg-card-header` | `#fbfaf8` | 卡片与抽屉标题栏背景 | 步骤卡片头部、抽屉头部、模态框头部 |
| `--bg-input` | `#f4f1ec` | 表单控件与胶囊背景 | 滑块轨道、下拉选择框、未激活胶囊标签底色 |
| `--bg-hover` | `#ece8e1` | 交互轻微悬停底色 | 按钮悬停、侧边栏选项悬停、列表项悬停高亮 |

### 1.2 边框体系 (Borders)

| CSS 变量名 | 真实色值 (Hex) | 语义说明 | 实际应用场景 |
| :--- | :--- | :--- | :--- |
| `--border-subtle` | `#eae5dc` | 次级极细羽量分割线 | 侧边栏与主区分割线、抽屉下边框、卡片微边框 |
| `--border-strong` | `#d5cfc4` | 强化聚焦分割线 | 卡片悬停边框、模态框外轮廓、聚焦输入框外边框 |

### 1.3 强调色与材质色彩 (Accents & Material Cues)

| CSS 变量名 | 真实色值 (Hex) | 语义说明 | 实际应用场景 |
| :--- | :--- | :--- | :--- |
| `--accent-gold` | `#7a8c7e` | 淡鼠尾草绿核心主色 | 主操作按键、激活 Tab、选中高亮、铜版工艺指示 |
| `--accent-gold-hover` | `#67786b` | 鼠尾草绿深色悬停态 | 鼠标悬停主按键与铜版工具按键底色 |
| `--accent-teal` | `#7a8c7e` | 鼠尾草绿算法协同色 | 算法管线阶段完成态徽章、高保真几何验证指示 |
| `--accent-teal-hover` | `#67786b` | 辅助操作悬停色 | 辅助按键悬停 |
| `--copper-glow` | `#9c755f` | 柔和陶土温润色 | 虚拟铜版边缘与高亮刻线标识 |
| `--paper-ivory` | `#faf7f0` | 典藏版画纸象牙白底 | 视口画布底色、压印印样仿真预览基底、Lightbox 展台 |
| `--ink-dark` | `#1b1c1b` | 古典版画深炭墨黑 | 矢量排线、高浓度印样油墨仿真色 |
| `--accent-green` | `#678c74` | 状态就绪绿 | 运行日志 IDLE 状态徽标 (`.badge-green`) |
| `--accent-amber` | `#b07d4b` | 状态警告柔和琥珀色 | 模型检测中状态徽标、腐蚀深度监控徽标 (`.badge-amber`) |

### 1.4 文字排印色彩 (Typography Colors)

| CSS 变量名 | 真实色值 (Hex) | 语义说明 | 实际应用场景 | 对比度等级 (WCAG) |
| :--- | :--- | :--- | :--- | :--- |
| `--text-primary` | `#2a2b2a` | 一级高对比暖炭灰 | 页面标题、卡片名称、主按钮文案、参数读数 | AAA (13.5:1 在纯白表面) |
| `--text-secondary` | `#5e605d` | 二级说明与标签灰 | 表单标签、卡片副标题、说明辅助文案 | AA (6.8:1 在纯白表面) |
| `--text-muted` | `#959793` | 三级弱化元数据文本 | 时间戳、快捷键提示、禁用状态提示 | AA (3.5:1 在纯白表面) |

### 1.5 投影与层级深度 (Elevation & Shadows)

| CSS 变量名 | 阴影声明 | 应用场景 |
| :--- | :--- | :--- |
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.04)` | 细微控件投影 |
| `--shadow-card` | `0 1px 3px rgba(0, 0, 0, 0.03), 0 3px 8px rgba(0, 0, 0, 0.02)` | 7 阶段卡片静止态微投影 |
| `--shadow-card-hover` | `0 3px 6px -1px rgba(0, 0, 0, 0.05), 0 8px 16px -2px rgba(0, 0, 0, 0.04)` | 步骤卡片悬停上浮投影 |
| `--shadow-modal` | `0 16px 36px -8px rgba(0, 0, 0, 0.12), 0 8px 16px -4px rgba(0, 0, 0, 0.06)` | Lightbox 大图检查器与上版向导浮层 |

---

## 2. 字体排印规范 (Typography Tokens)

| CSS 变量名 | 声明字体栈 | 适用场景 |
| :--- | :--- | :--- |
| `--font-serif` | `Georgia, 'Songti SC', 'Source Han Serif SC', serif` | 品牌标题 (Etchloom)、工坊阶段标题、古典印刷工艺标语 |
| `--font-sans` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif` | 通用 UI 界面、按键、标签、输入控件 |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace` | 坐标读数、日志时间戳、毫秒耗时统计、刻深微米数据 |

---

## 3. 布局与网格约束 (Layout & Grid System)

| 布局区域 | 结构与尺寸参数 | 说明 |
| :--- | :--- | :--- |
| 顶栏 (`header.app-header`) | 高度固定 `60px` | 包含 Logo、母版/铜版双模式 Tab 与功能操作区 |
| 侧边栏 (`aside.app-sidebar`) | 宽度固定 `320px` | 包含 4 个工序抽屉，通过模式隔离类自动展示/隐藏对应阶段 |
| 主工作区 2列4行 网格 | 2 等分弹性列网格 (`repeat(2, minmax(0, 1fr))`) | **第 1~3 行** (步骤 00~05 各跨 1 列 = 50%)；<br>**第 4 行** (步骤 06 纯棉印样跨越全部 2 列 = 100%)；工作区通过 `overflow-y: auto` 垂直自然滚动 |
| 卡片悬浮工具条 (`.card-actions`) | 绝对定位 (`top: 10px; right: 10px`) | 悬停淡入半透明毛玻璃胶囊 (`[⛶ 特写]`, `[⬇ 导出]`)，不侵占卡身视觉净空 |
| 抽屉式运行日志 (`.activity-log-wrap`) | 折叠高度 `32px` / 展开 `96px` | 底部微型抽屉，常态折叠释放垂直空间，点击随时滑出检视 |
| 底部遥测栏 (`footer.telemetry-footer`) | 高度固定 `32px` | 包含一键唤起日志抽屉按键、状态、任务名、耗时、矢量线段与拓扑缓存命中率 |
| 虚拟铜版顶栏 (`.plate-top-bar`) | 弹性行布局 | 包含铜版/刻深/印样视图切换、物理网格分辨率选择、`[⛶ 全屏特写]` 按钮与酸液腐蚀控制台 |
