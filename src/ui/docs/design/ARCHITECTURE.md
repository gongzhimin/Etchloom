---
title: UI 交互与视图总装架构设计
status: Active
doc-id: ARCH-UI
owner-module: ui
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:43:00+08:00
---

# UI 交互与视图总装架构设计 (ARCH-UI)

## 1. 模块定位与边界

`ui` 模块是系统 Layer 3 & 4 交互呈现与视图总装层，负责渲染 HTML 界面、接收用户交互、调度状态并在 Canvas/SVG 视口中呈现版画成果。模块对内解耦控制器、组件、微模板与状态中心；对外消费 `orchestration` 和 `core`，严禁向底层泄露 DOM 引用。

## 2. 内部结构与子模块职责

```text
src/ui/
├── components/          # 原子交互组件
│   ├── step-flow-grid.js   # 默认折叠的横向七卡胶片栏组件
│   └── loupe.js            # 灯箱放大镜视口
├── controllers/         # 业务场景控制器
│   ├── pipeline-controller.js     # 算法母版调参与异步生成控制器
│   ├── plate-studio-controller.js # 铜版物理交互与试印控制器
│   ├── transfer-wizard-controller.js # 工艺上版向导控制器
│   └── lightbox-controller.js     # 全屏特写灯箱控制器
├── i18n/                # 国际化语言包与管理器 (i18n.js)
├── store/               # 响应式状态中心 (app-store.js)
└── templates/           # 无逻辑纯 HTML 微模板 (layout-templates.js)
```

### 2.1 子系统职责
- **`components/`**：封装可复用的纯前端交互组件，如七阶段横向胶片卡片视口，处理宽高比与语言同步；
- **`controllers/`**：场景化控制器，绑定 DOM 节点、挂载监听并调用编排层调度管线；
- **`store/app-store.js`**：单一状态树，统一管理 `locale`、`activeWorkflow`、`recipe`、`stepFlow`、`artifacts`；
- **`templates/layout-templates.js`**：以函数形式返回纯净语义化 HTML 字符串微模板；
- **`i18n/i18n.js`**：中、英、越三语动态字典绑定与 DOM 自动文本替换。

## 3. 内部依赖拓扑与约束

```text
+-----------------------------------------------------------+
|                       index.html                          |
+-----------------------------------------------------------+
                             │
                             ▼
+-----------------------------------------------------------+
|                        src/main.js                        |
|              (mountAppLayout -> #app 挂载)                |
+-----------------------------------------------------------+
        │                   │                   │
        ▼                   ▼                   ▼
+---------------+   +-------------------+   +---------------+
|  Controllers  |──►|     AppStore      |◄──|  Components   |
+---------------+   +-------------------+   +---------------+
        │                                           │
        ▼                                           ▼
+-----------------------------------------------------------+
|              Orchestrator / VirtualPlateEngine            |
+-----------------------------------------------------------+
```

### 依赖约束：
1. 视图层单向依赖 `orchestration` 与 `core`，底层严禁反向引用 UI；
2. 模板文件 `layout-templates.js` 严禁引入控制器或底层业务逻辑；
3. 控制器之间通过 `AppStore` 或显式接口协作，严禁直接跨控制器篡改私有 DOM。

## 4. 实现级技术栈与约束

- **技术栈**：原生 Vanilla JavaScript (ESM)、原生 Canvas API、CSS3 Flexbox/Grid 与 CSS 自定义属性；
- **无重型框架依赖**：不依赖 React/Vue/Angular 等前端重型框架，保持 100% 极简纯净；
- **性能约束**：主预览画布在 CSS 中等比适配视口，高频调参通过防抖调度保证 60 FPS 流畅渲染。
