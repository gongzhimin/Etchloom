# 统一视觉设计与交互体验规范 (UI_RULES)

> **规范编号**：STD-OPT-UI-003  
> **适用范围**：前端所有页面布局、组件渲染、Canvas 绘图与 CSS 变量系统  
> **与设计文档区别**：本规范规定通用视觉风格、Design Tokens 与可访问性原则；各页面与组件的具体交互由 `src/ui/docs/UI_DESIGN.md` 详述。  

---

## 1. Atelier 莫兰迪古典工坊美学基调

系统采用 **Fresh Atelier Light（清透工坊浅色质感）** 设计语言：
* **底色哲学**：采用棉麻画纸（Pale Warm Linen, `#faf8f5`）与纯净纸面白（`#ffffff`），摒弃压抑的重色调；
* **点缀色彩**：以鼠尾草灰绿（Sage, `#536957`）作为主强调色，辅以陶土金铜色（Copper / Terracotta, `#9c755f`）体现金属蚀刻质感；
* **边框与阴影**：羽毛般轻盈的暖灰微边框（`#eae5dc`），极度克制的漫反射阴影。

---

## 2. 核心 Design Tokens 字典

所有样式必须使用 `styles/app.css` 中声明的 CSS 变量，严禁在 HTML 模板中内联任意硬编码颜色或尺寸：

```css
:root {
  /* 背景层次 */
  --bg-app: #faf8f5;             /* 浅暖亚麻画布背景 */
  --bg-surface: #ffffff;         /* 纯净卡片与操作面板表面 */
  --bg-input: #f4f1ec;           /* 软暖输入框底色 */

  /* 强调色与铜版触感 */
  --accent-gold: #536957;        /* 鼠尾草强调色 (按钮与主导动作) */
  --copper-glow: #9c755f;        /* 陶土红褐铜感 (用于深度、预警与高亮) */
  --border-subtle: #eae5dc;      /* 细致温暖分割线 */

  /* 字体排印 */
  --text-primary: #2a2b2a;       /* 深炭灰主标题与正文 */
  --text-secondary: #5e605d;     /* 哑光副文本与辅助说明 */

  /* 4px 调和间距系统 */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
}
```

---

## 3. 字体排印与多语言排版原则

1. **衬线体与非衬线体分层**：
   * 标题、工序大纲：采用古典衬线体优先（`Playfair Display`, `Songti SC`, 典雅宋体），烘托版画工坊意境；
   * 读数、状态、代码：采用等宽字体（`JetBrains Mono`, `SF Mono`, `monospace`）。
2. **多语言与无 Emoji 原则**：
   * 界面文案必须通过 `src/ui/i18n/i18n.js` 进行三语（`zh-CN`、`en-US`、`vi-VN`）统一调度；
   * 界面**严格禁止使用 Emoji 表情**（如 🎨、⚡️、🔥），统一使用精细的 SVG 图标或克制文字标签。
