# 前端业务控制器自动化测试规范 (TESTING.md)

> **被测模块**：`src/ui/controllers/` (`pipeline-controller.js`, `plate-studio-controller.js`, `transfer-wizard-controller.js`, `lightbox-controller.js`)  
> **执行命令**：`node --test tests/ui-button-clicks.test.cjs tests/pipeline-source-race.test.cjs`

---

## 1. 控制器测试用例矩阵

| 测试用例名 | 验证控制器 | 关键验证逻辑与断言 |
| :--- | :--- | :--- |
| `UI Button Click: Transfer to Virtual Plate Button` | `TransferWizardController` | 验证从算法母版到虚拟铜版的状态转换、模态框弹出与配置参数传递 |
| `UI Button Click: Plate Tool Selection & Acid Bite Simulation Controls` | `PlateStudioController` | 验证刻针、干刻针、防蚀漆、刮刀 4 工具切换及酸蚀启动/停止按钮交互 |
| `UI Button Click: Plate Undo and Clear Actions` | `PlateStudioController` | 验证撤销栈深度增减、画布重绘与清空确认机制 |
| `UI Button Click: Transfer Wizard Modal` | `TransferWizardController` | 验证图层勾选状态、深度滑块与上版确认回调触发 |
| `UI Button Click: Unified Acid Console Toggle & Gauge Display` | `PlateStudioController` | 验证酸蚀控制台展开/收起、秒表时钟计时与咬蚀深度表盘联动 |
| `a superseded photo cannot replace the newer source or start its pipeline` | `PipelineController` | 旧图片读取回调晚于新图片时不能覆盖新来源或启动旧管线 |
| `large images are downsampled before allocating processing buffers` | `PipelineController` | 大图进入处理画布前缩至 1200 万像素以内且单边不超过 4096 像素 |
| `Two-Stage UI: first visit starts with a choice and translated visible controls` | `layout-templates.js` / `I18nManager` | 首次入口、默认折叠胶片栏、画布初始尺寸与三语键完整性 |
| `parameter redraw reports pending work until the latest scheduled run settles` | `PipelineController` | 被新任务替代的旧任务结束时不能提前关闭重绘提示 |
| `acid bite depth grows slowly while elapsed time stays in real seconds` | `plate-studio-controller.js` | 默认浓度下 10 秒的刻深增量与真实累计时间 |

---

## 2. 模拟 DOM 夹具与断言不变量

- 采用纯 Node.js `createMockElement` 模拟 DOM 事件监听、`classList` 操作与属性绑定；
- **状态不变量**：工具切换后，当前激活类名 `active` 必须且仅存在于唯一一个工具按钮上。

## 试印纸张更新

试印提供 `rough`、`smooth`、`linen`、`rosaspina` 四种表面预设。后两者参考真实凹版纸的材质与纹理；实现通过底色、确定性空间纹理和着墨变化进行视觉区分，未对实体纸做物理标定。纸张选择会触发试印重绘，说明文案随 zh-CN、en-US、vi-VN 切换。`tests/virtual-plate-engine.test.cjs` 检查四种纸面的像素差异。

蚀刻工作台顶部的精度为只读值，由上版流程选择精度后更新；手工刻绘的 `size` 滑块直接改变刻针足迹。上版面板与上版细节弹窗的线宽控件同步，`lineWidthScale` 以 50%–200% 缩放转录笔画，和手工工具直径相互独立。
