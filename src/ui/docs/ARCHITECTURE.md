# UI 前端总装架构与分层设计规范 (ARCHITECTURE.md)

> **模块路径**：`src/ui/`  
> **上级体系规范**：[docs/design/ARCHITECTURE.md](../../../docs/design/ARCHITECTURE.md)

---

## 1. 前端分层与组件关系图 (UI Layered Architecture)

```mermaid
graph TD
    HTML[index.html 极简骨架] --> Mount[templates/layout-templates.js 动态装配]
    Mount --> DOM[#app 容器]
    Main[src/main.js ESM 主入口] --> Controllers[ui/controllers/]
    
    Controllers --> PC[pipeline-controller.js 算法母版调度]
    Controllers --> PSC[plate-studio-controller.js 铜版物理交互]
    Controllers --> TWC[transfer-wizard-controller.js 工艺上版向导]
    Controllers --> LBC[lightbox-controller.js 全屏特写灯箱]

    Controllers --> Store[ui/store/app-store.js 响应式状态]
    Controllers --> Components[ui/components/]
    Components --> Grid[step-flow-grid.js 默认折叠的横向七卡胶片栏]

    Main --> I18n[ui/i18n/i18n.js 三语绑定]
    Main --> LogDrawer[底部抽屉式日志联动]
    PSC --> PBevel[纯净画作导出与物理倒角凹痕]
```

---

## 2. 核心架构解耦与设计机制 (Decoupled Architectural Patterns)

1. **双阶段渐进界面**：
   - 首次进入显示 `masterIntro`，由用户选择照片或主动载入示例；生成中显示 `masterComputing`，母版完成后显示预览和主要转入铜版操作；
   - 七阶段产物由 `StepFlowGrid` 呈现在默认折叠的横向胶片栏中，外观参数位于独立抽屉；
   - 胶片卡片的动态底部说明由翻译键和尺寸/线条数参数组成，语言切换后由 `StepFlowGrid.updateLocale` 重新生成；
   - `switchWorkflow` 在母版与铜版间切换时保证另一工作区实际隐藏，并将视口置顶；
   - 顶栏语言选项卡调用 `I18nManager.setLocale`，随后刷新可见文案、页面 `lang`、`aria-selected` 与动态线条计数；选项卡宽度保持稳定；
   - 母版和铜版画布在 CSS 中等比适配视口；`StepFlowGrid.setAspectRatio` 把源图比例写入胶片视口的 CSS 自定义属性；
   - 选图时入口层使用文件对象 URL 显示原图；参数任务由 `TaskScheduler` 防抖执行，`onRecomputeState` 仅在最新任务结束后关闭重绘提示；外框变化将第 06 阶段画布同步到主预览；
   - 处于 `COMPUTING` 状态时立即清空画布（`ctx.clearRect`），杜绝旧图残影；
2. **多阶段管线依赖增量合成与拓扑缓存**：
   - 载入照片时取消待执行的参数任务与旧照片计算、清空前图阶段缓存并递增来源版本；解码、推理、阶段回调及最终提交均检查来源版本；阶段 1 哈希包含来源版本；
   - 原图超过 1200 万像素或单边 4096 像素时在创建处理画布前等比缩小，保留原始尺寸元数据，避免无界像素缓冲分配；
   - 计算完成后将 1~5 各阶段输出与哈希存入 `StageCache`；
   - 用户微调滑块参数时，增量管线从失效阶段（如 Stage 4）重算，且始终将前序空间轮廓（Stage 3）与曲面排线（Stage 4）加和复合至母版图稿（Stage 5）与印样（Stage 6），呈现完整画面；
3. **铜版工坊全屏特写与纯净导出**：
   - 铜版画板移除遮挡刻线的放大镜，顶栏集成显式 `[⛶ 全屏特写]` 按钮与双击画布交互，直通 Lightbox 全屏平移缩放；
   - 第 06 阶段输出冷白底、定位标记和矢量线的上版母稿；铜版试印才使用纸张纹理、油墨和压印渲染。导出不包含工作台 DOM；
4. **极淡清新美学配色 (Airy Linen & Pale Sage)**：
   - 采用亚麻纸白基底 (`#faf8f5`)、鼠尾草绿主操作色 (`#536957`)、分割线 (`#eae5dc`) 与暖炭灰文本 (`#2a2b2a`)；
   - 母版工作区使用静态 CSS 纸纤维背景；铜版主工作区保持浅色，宽幅画框使用橡木纹理图像和浅色蒙层。工作台外缘与铜板画布分别通过边框及接触阴影分层，渲染画布像素不受这些 CSS 背景影响；
5. **顶层统一挂载与 ESM 模块化**：
   - `index.html` 极简骨架加载后，`main.js` 统一装配 `mountAppLayout(root)`，各子控制器与纯数学/物理核心按需导入，保持高度解耦与零全局污染。


## 试印纸张更新

试印提供 `rough`、`smooth`、`linen`、`rosaspina` 四种表面预设。后两者参考真实凹版纸的材质与纹理；实现通过底色、确定性空间纹理和着墨变化进行视觉区分，未对实体纸做物理标定。纸张选择会触发试印重绘，说明文案随 zh-CN、en-US、vi-VN 切换。`tests/virtual-plate-engine.test.cjs` 检查四种纸面的像素差异。

蚀刻工作台顶部的精度为只读值，由上版流程选择精度后更新；手工刻绘的 `size` 滑块直接改变刻针足迹。快捷上版固定使用 100% 线宽；上版细节弹窗中的 `wizardLineWidth` 以 50%–200% 缩放转录笔画，和手工工具直径相互独立。

关于页由 `aboutModalOverlay` 独立对话框承载，不再通过图像灯箱的纯文本说明字段显示 HTML。内容为两步工作流、操作提示及保存导出；使用 `data-i18n` 在 zh-CN、en-US、vi-VN 间同步切换。`tests/two-stage-ui.test.cjs` 核对翻译键和结构，`tests/ui-button-clicks.test.cjs` 核对对话框语义。

关于页两步流程卡片之后提供 GitHub 仓库与 Issues 链接（`https://github.com/gongzhimin/Etchloom`）；链接以新标签打开，并使用 `noopener noreferrer`。三语文案不承诺存在 Release 安装包。
