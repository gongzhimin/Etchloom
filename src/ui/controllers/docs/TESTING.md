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
| `oversized images are rejected before allocating a canvas` | `PipelineController` | 1200 万像素上限在画布分配前生效 |

---

## 2. 模拟 DOM 夹具与断言不变量

- 采用纯 Node.js `createMockElement` 模拟 DOM 事件监听、`classList` 操作与属性绑定；
- **状态不变量**：工具切换后，当前激活类名 `active` 必须且仅存在于唯一一个工具按钮上。
