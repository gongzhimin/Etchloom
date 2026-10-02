# UI Modular Layout Templates (`src/ui/templates/`)

侧栏中的范围输入与下拉框通过 `label for` 关联可见名称；动态装配仍由 `mountAppLayout` 完成。

> **模块路径**：`src/ui/templates/`  
> **技术定位**：Layer 4 视图呈现层，提供解耦的 HTML 模板挂载函数，负责将母版工作台、虚拟铜版工坊、参数抽屉与模态弹窗动态注入 `#app` 根容器。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

1. **解耦 index.html 骨架**：将界面 DOM 模板从 `index.html` 剥离，由入口加载并挂载 `layout-templates.js`；
2. **纯原生 DOM 装配**：使用 JavaScript 模板字符串并赋值给挂载容器的 `innerHTML`，无需外部模板引擎；模板内容由仓库源码维护，不接收用户输入；
3. **国际化属性预埋**：可翻译的静态文案使用 `data-i18n` 属性，挂载后由 `I18nManager` 按中、英、越三语渲染。

---

## 2. 内部架构与组件拓扑 (Internal Architecture & Component Map)

```
src/ui/templates/
├── layout-templates.js       # mountAppLayout 挂载函数与完整工作台模板
├── docs/                     # 模板挂载架构设计
└── README.md                 # 模板模块说明
```

---

## 3. 对外公共接口契约 (Public API Contract)

```typescript
export function mountAppLayout(rootElement: HTMLElement): void;
```
