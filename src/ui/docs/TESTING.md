# UI 交互层自动化测试规范 (TESTING.md)

> **被测模块**：`src/ui/` (`controllers/`, `components/`, `store/`, `i18n/`, `templates/`)  
> **执行命令**：`node --test tests/ui.test.cjs tests/ui-button-clicks.test.cjs`

---

## 1. 测试用例矩阵与验证目标

| 测试套件 | 用例总数 | 验证核心 |
| :--- | :---: | :--- |
| `tests/ui.test.cjs` | 5 项 | I18nManager 三语字典更新、DOM 数据属性自动匹配、AppStore 发布订阅 |
| `tests/ui-button-clicks.test.cjs` | 15 项 | 顶栏模式切换、语言选项卡、About 弹窗、卡片动作、上版按钮、工具选择、撤销清空、步进器导航、当前精度只读展示与上版线宽控制、酸蚀控制台 |
| `tests/pipeline-source-cache.test.cjs` | 2 项 | 新来源清空阶段缓存并递增版本；参数重绘状态 |
| `tests/pipeline-source-race.test.cjs` | 2 项 | 连续载图时旧回调失效、大图在处理画布分配前等比缩小 |
| `tests/two-stage-ui.test.cjs` | 9 项 | 首次进入选择入口、三语模板键、铜版四步与酸液状态 |
| `tests/ui-surfaces.test.cjs` | 3 项 | 母版纸面与铜版台面分层、木纹资源引用及底部说明状态间距 |

---

## 2. 模拟 DOM 纯无头断言设计

所有 UI 测试均运行于纯 Node.js 无头环境下，通过轻量 `createMockElement` 实现真实的事件派发（`click`, `input`, `change`）与类名断言，确保 CI 环境 100% 可重复执行。
工作区是否实际隐藏、画布是否完整填充及视口是否回到顶部，需要另在运行浏览器中检查计算样式与可见结果。
窄屏工序栏换行、三语切换后顶栏位置以及横竖图片的等比显示，也通过运行浏览器的视口测量检查。
七阶段卡片底部说明在示例生成后切换三语时，需检查实际尺寸与路径数未变化且说明语言一致。
`tests/ui-surfaces.test.cjs` 检查铜版主工作区保持浅色、木纹资源仅由宽幅画框引用、55% 浅色蒙层以及工作台和铜板的独立边框、底部说明和状态之间有间距；浏览器需分别查看三语桌面与窄屏布局，确认边缘、文字对比与工序条排列。
另外在浏览器验证选图后原图预览与制作中状态、外框切换后主预览变化、参数重绘提示及结果页滚动条位置。

## 试印纸张更新

试印提供 `rough`、`smooth`、`linen`、`rosaspina` 四种表面预设。后两者参考真实凹版纸的材质与纹理；实现通过底色、确定性空间纹理和着墨变化进行视觉区分，未对实体纸做物理标定。纸张选择会触发试印重绘，说明文案随 zh-CN、en-US、vi-VN 切换。`tests/virtual-plate-engine.test.cjs` 检查四种纸面的像素差异。


蚀刻工作台顶部的精度为只读值，由上版流程选择精度后更新；手工刻绘的 `size` 滑块直接改变刻针足迹。快捷上版固定使用 100% 线宽；上版细节弹窗中的 `wizardLineWidth` 以 50%–200% 缩放转录笔画，和手工工具直径相互独立。

关于页由 `aboutModalOverlay` 独立对话框承载，不再通过图像灯箱的纯文本说明字段显示 HTML。内容为两步工作流、操作提示及保存导出；使用 `data-i18n` 在 zh-CN、en-US、vi-VN 间同步切换。`tests/two-stage-ui.test.cjs` 核对翻译键和结构，`tests/ui-button-clicks.test.cjs` 核对对话框语义。

关于页两步流程卡片之后提供 GitHub 仓库与 Issues 链接（`https://github.com/gongzhimin/Etchloom`）；链接以新标签打开，并使用 `noopener noreferrer`。三语文案不承诺存在 Release 安装包。
