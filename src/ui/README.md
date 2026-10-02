# Modern Decoupled UI Layer (`src/ui/`)

> **模块路径**：`src/ui/`  
> **技术定位**：Layer 3 & 4 现代解耦前端展示层，由 原生 ES Modules 控制器、原子 UI 组件、响应式状态中心与动态模板引擎构成，实现完全零构建依赖（No Webpack/Vite）。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

1. **结构解耦**：将界面模板从 `index.html` 剥离至 `templates/layout-templates.js`，入口只负责加载与挂载；
2. **原生 ESM 装配**：以 `src/main.js` 为顶层入口；UI 控制器使用 ESM，部分底层组件通过 UMD 全局对象接入；
3. **状态与 DOM 更新**：`store/app-store.js` 保存部分应用状态；入口与控制器仍直接更新相关 DOM 节点，尚未形成完全由 Store 驱动的单向视图层；
4. **国际化与无障碍**：`i18n/` 模块扫描 DOM 翻译属性；顶栏使用中文、英文和越南语三个语言选项卡，并同步页面 `lang`、选中态与焦点顺序。双阶段入口与工序操作使用原生按钮。

首次进入显示照片选择和示例入口；母版就绪后才显示预览、参数及铜版入口。七阶段胶片栏默认折叠。

图片导入会在创建处理画布前按比例缩至不超过 1200 万像素、单边不超过 4096 像素；同一会话连续选择图片时，旧来源的异步计算结果不会提交到新来源。侧栏范围控件及下拉框使用关联的可见标签。
入口卡片随视口缩放；母版预览、阶段卡片和铜版画布按源图比例适配可用空间。
选中照片后，制作页显示原图缩略预览；参数重绘使用不确定进度条提示任务状态。外框切换同步更新阶段印样与母版主预览，结果页滚动条位于视口右缘。
制作过程的七张卡片将底部说明保存为翻译键与实际数据；切换语言会重新生成已经完成的卡片说明。
第 06 阶段以冷白底和定位标记呈现可上版母稿；纸张、压印与油墨效果仅出现在铜版试印流程。铜板周围使用浅木纹工作台；试印提供四种纸张预设。
母版工作区以静态浅色纤维纹理为台面，纸面通过边框与接触阴影区分；铜版主工作区保持浅色，宽幅画框使用 `docs/images/oak-workbench.png` 木纹和浅色蒙层，工作台与铜板各有独立边框及阴影。材质背景不进入 Canvas、SVG 与导出文件。

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
│   └── step-flow-grid.js     # 7 阶段胶片卡片
├── store/                    # 响应式状态中心 (Layer 3)
│   └── app-store.js          # AppStore 订阅发布总线
├── templates/                # 动态 DOM 模板 (Layer 4)
│   └── layout-templates.js   # mountAppLayout 挂载器
├── i18n/                     # 国际化语言管理 (Layer 3)
│   └── i18n.js               # I18nManager 三语字典与属性绑定
└── docs/                     # UI 全局设计与单测规范
```

---

## 3. 自动化测试与验证 (Testing & Verification)

- [`tests/ui.test.cjs`](../../tests/ui.test.cjs)（I18n 语言字典与 AppStore 单向数据流）
- [`tests/ui-button-clicks.test.cjs`](../../tests/ui-button-clicks.test.cjs)（顶栏、工序、上版、模态框与铜版操作的按钮事件）
- [`tests/two-stage-ui.test.cjs`](../../tests/two-stage-ui.test.cjs)（入口选择、模板翻译键与铜版工序状态）

---

## 4. 子文档导航 (Sub-documentation Index)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：解耦前端界面总装架构与数据流转
- [docs/INTERFACE_SPEC.md](docs/INTERFACE_SPEC.md)：前端界面总装与状态契约接口设计规范
- [docs/TESTING.md](docs/TESTING.md)：无头 Mock DOM 测试规范与点击事件断言解析

## 试印纸张更新

试印提供 `rough`、`smooth`、`linen`、`rosaspina` 四种表面预设。后两者参考真实凹版纸的材质与纹理；实现通过底色、确定性空间纹理和着墨变化进行视觉区分，未对实体纸做物理标定。纸张选择会触发试印重绘，说明文案随 zh-CN、en-US、vi-VN 切换。`tests/virtual-plate-engine.test.cjs` 检查四种纸面的像素差异。

蚀刻工作台顶部的精度为只读值，由上版流程选择精度后更新；手工刻绘的 `size` 滑块直接改变刻针足迹。快捷上版固定使用 100% 线宽；上版细节弹窗中的 `wizardLineWidth` 以 50%–200% 缩放转录笔画，和手工工具直径相互独立。

关于页由 `aboutModalOverlay` 独立对话框承载，不再通过图像灯箱的纯文本说明字段显示 HTML。内容为两步工作流、操作提示及保存导出；使用 `data-i18n` 在 zh-CN、en-US、vi-VN 间同步切换。`tests/two-stage-ui.test.cjs` 核对翻译键和结构，`tests/ui-button-clicks.test.cjs` 核对对话框语义。

关于页两步流程卡片之后提供 GitHub 仓库与 Issues 链接（`https://github.com/gongzhimin/Etchloom`）；链接以新标签打开，并使用 `noopener noreferrer`。三语文案不承诺存在 Release 安装包。
