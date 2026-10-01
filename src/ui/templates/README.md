# UI Modular Layout Templates (`src/ui/templates/`)

侧栏中的范围输入与下拉框通过 `label for` 关联可见名称；动态装配仍由 `mountAppLayout` 完成。

> **模块路径**：`src/ui/templates/`  
> **技术定位**：Layer 4 视图呈现层，提供解耦的 HTML 模板挂载函数，负责将母版工作台、虚拟铜版工坊、参数抽屉与模态弹窗动态注入 `#app` 根容器。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

1. **解耦 index.html 骨架**：将庞大的 HTML DOM 结构（超过 600 行 HTML 标记）从 `index.html` 剥离，使 `index.html` 保持在 60 行以内极简结构；
2. **纯原生 DOM 装配**：利用纯原生 JavaScript 模板字符串与安全 DOM 节点解析（`Range.createContextualFragment`），实现零模板引擎依赖；
3. **国际化属性预埋**：所有静态文案严格预埋 `data-i18n` 属性，挂载后立即可被 `I18nManager` 扫描并双语渲染。

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
