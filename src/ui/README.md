# Modern Decoupled UI Layer (`src/ui/`)

> **模块路径**：`src/ui/`  
> **技术定位**：Layer 3 & 4 现代解耦前端展示层，由 原生 ES Modules 控制器、原子 UI 组件、响应式状态中心与动态模板引擎构成，实现完全零构建依赖（No Webpack/Vite）。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

1. **结构彻底解耦**：将庞大界面模板从 `index.html` 剥离至 `templates/layout-templates.js`，`index.html` 保持在 60 行极简骨架；
2. **纯原生 ESM 架构**：以 `src/main.js` 为唯一顶层装配入口，所有业务控制器严格采用 `import/export` 模块化通信；
3. **单向响应式数据流**：通过 `store/app-store.js` 驱动视图更新，杜绝跨控制器直接操作 DOM；
4. **国际化与无障碍**：`i18n/` 模块自动扫描 DOM `[data-i18n]` 标签并即时切换中英文，支持语义化快捷操作。

图片导入在 1200 万像素以内运行；同一会话连续选择图片时，旧来源的异步计算结果不会提交到新来源。侧栏范围控件及下拉框使用关联的可见标签。

---

## 2. 内部架构与组件拓扑 (Internal Architecture & Component Map)

```
src/ui/
├── controllers/              # 业务控制器层 (Layer 3)
│   ├── lightbox-controller.js
│   ├── pipeline-controller.js
│   ├── plate-studio-controller.js
│   └── transfer-wizard-controller.js
├── components/               # 原子级独立 UI 组件 (Layer 4)
│   ├── loupe.js              # 160px 4x 双线性插值放大镜
│   └── step-flow-grid.js     # 7 阶段卡片网格
├── store/                    # 响应式状态中心 (Layer 3)
│   └── app-store.js          # AppStore 订阅发布总线
├── templates/                # 动态 DOM 模板 (Layer 4)
│   └── layout-templates.js   # mountAppLayout 挂载器
├── i18n/                     # 国际化语言管理 (Layer 3)
│   └── i18n.js               # I18nManager 双语字典与属性绑定
└── docs/                     # UI 全局设计与单测规范
```

---

## 3. 自动化测试与验证 (Testing & Verification)

- [`tests/ui.test.cjs`](../../tests/ui.test.cjs)（I18n 语言字典与 AppStore 单向数据流）
- [`tests/ui-button-clicks.test.cjs`](../../tests/ui-button-clicks.test.cjs)（12 项：全量 UI 按钮点击与组件生命周期）

---

## 4. 子文档导航 (Sub-documentation Index)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：解耦前端界面总装架构与数据流转
- [docs/INTERFACE_SPEC.md](docs/INTERFACE_SPEC.md)：前端界面总装与状态契约接口设计规范
- [docs/TESTING.md](docs/TESTING.md)：无头 Mock DOM 测试规范与点击事件断言解析
