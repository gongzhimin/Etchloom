# UI 设计系统 Design Tokens 规范 (DESIGN_TOKENS.md)

> **基准文件**：[styles/app.css](../../styles/app.css)  
> **文档原则**：100% 对应源码 `:root` 声明，杜绝臆造。

---

## 1. 颜色体系 (Fresh Atelier Light Palette)

系统采用清新工坊 (Fresh Atelier) 浅色美学体系，以通透纯净的工作室白色与中性灰为基底，辅以温润的暖铜金 (Terracotta Copper, `#c07a38`) 与工匠松石绿 (Sage/Teal, `#1f7a63`)，搭配高可读性的深炭墨黑排印 (`#1e293b`)，彻底摒弃沉重压抑的暗色风格。

### 1.1 表面与基底层级 (Surfaces & Backgrounds)

| CSS 变量名 | 真实色值 (Hex) | 语义说明 | 实际应用场景 |
| :--- | :--- | :--- | :--- |
| `--bg-app` | `#f4f6f8` | 轻盈工坊基底底色 | 页面主工作区底色、侧边栏次级分组底色 |
| `--bg-surface` | `#ffffff` | 纯净白表面背景 | 页面主体背景、顶栏背景、侧边栏主体背景 |
| `--bg-card` | `#ffffff` | 卡片主体背景 | 7阶段步骤卡片表面、对话框背景 |
| `--bg-card-header` | `#f8fafc` | 卡片与抽屉标题栏背景 | 步骤卡片头部、抽屉头部、模态框头部 |
| `--bg-input` | `#f1f5f9` | 表单控件与胶囊背景 | 滑块轨道、下拉选择框、未激活胶囊标签底色 |
| `--bg-hover` | `#e2e8f0` | 交互轻微悬停底色 | 按钮悬停、侧边栏选项悬停、列表项悬停高亮 |

### 1.2 边框体系 (Borders)

| CSS 变量名 | 真实色值 (Hex) | 语义说明 | 实际应用场景 |
| :--- | :--- | :--- | :--- |
| `--border-subtle` | `#e2e8f0` | 次级极细分割线 | 侧边栏与主区分割线、抽屉下边框、卡片微边框 |
| `--border-strong` | `#cbd5e1` | 强化聚焦分割线 | 卡片悬停边框、模态框外轮廓、聚焦输入框外边框 |

### 1.3 强调色与材质色彩 (Accents & Material Cues)

| CSS 变量名 | 真实色值 (Hex) | 语义说明 | 实际应用场景 |
| :--- | :--- | :--- | :--- |
| `--accent-gold` | `#c07a38` | 暖铜金属核心主色 | 主操作按键、激活 Tab、选中高亮、铜版工艺指示 |
| `--accent-gold-hover` | `#a86426` | 暖铜深色悬停态 | 鼠标悬停主按键与铜版工具按键底色 |
| `--accent-teal` | `#1f7a63` | 工匠松石绿辅助色 | 算法管线阶段完成态徽章、高保真几何验证指示 |
| `--accent-teal-hover` | `#16604e` | 松石绿悬停态 | 辅助操作悬停色 |
| `--copper-glow` | `#c07a38` | 铜版光泽暖色 | 虚拟铜版边缘与高亮刻线标识 |
| `--paper-ivory` | `#faf7f0` | 典藏版画纸象牙白底 | 视口画布底色、压印印样仿真预览基底、Lightbox 展台 |
| `--ink-dark` | `#0f172a` | 古典版画深炭墨黑 | 矢量排线、高浓度印样油墨仿真色 |
| `--accent-green` | `#10b981` | 状态就绪绿 | 运行日志 IDLE 状态徽标 (`.badge-green`) |
| `--accent-amber` | `#d97706` | 状态警告琥珀色 | 模型检测中状态徽标、腐蚀深度监控徽标 (`.badge-amber`) |

### 1.4 文字排印色彩 (Typography Colors)

| CSS 变量名 | 真实色值 (Hex) | 语义说明 | 实际应用场景 | 对比度等级 (WCAG) |
| :--- | :--- | :--- | :--- | :--- |
| `--text-primary` | `#1e293b` | 一级高对比深炭墨黑 | 页面标题、卡片名称、主按钮文案、参数读数 | AAA (14.2:1 在纯白表面) |
| `--text-secondary` | `#475569` | 二级说明与标签灰 | 表单标签、卡片副标题、说明辅助文案 | AA (7.5:1 在纯白表面) |
| `--text-muted` | `#94a3b8` | 三级弱化元数据文本 | 时间戳、快捷键提示、禁用状态提示 | AA (3.8:1 在纯白表面) |

### 1.5 投影与层级深度 (Elevation & Shadows)

| CSS 变量名 | 阴影声明 | 应用场景 |
| :--- | :--- | :--- |
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` | 细微控件投影 |
| `--shadow-card` | `0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)` | 7 阶段卡片静止态微投影 |
| `--shadow-card-hover` | `0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 10px 20px -2px rgba(0, 0, 0, 0.06)` | 步骤卡片悬停上浮投影 |
| `--shadow-modal` | `0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 10px 20px -5px rgba(0, 0, 0, 0.08)` | Lightbox 大图检查器与上版向导浮层 |

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
| 主工作区 3+4 网格 | 12 等分弹性列网格 (`repeat(12, 1fr)`) | **上行 3 卡片** (00/01/02 各跨 4 列 = 33.3%)；<br>**下行 4 卡片** (03/04/05/06 各跨 3 列 = 25%) |
| 卡片悬浮工具条 (`.card-actions`) | 绝对定位 (`top: 10px; right: 10px`) | 悬停淡入半透明毛玻璃胶囊 (`[⛶ 特写]`, `[⬇ 导出]`)，不侵占卡身视觉净空 |
| 抽屉式运行日志 (`.activity-log-wrap`) | 折叠高度 `32px` / 展开 `96px` | 底部微型抽屉，常态折叠释放垂直空间，点击随时滑出检视 |
| 底部遥测栏 (`footer.telemetry-footer`) | 高度固定 `32px` | 包含一键唤起日志抽屉按键、状态、任务名、耗时、矢量线段与拓扑缓存命中率 |
