---
title: UI 模块验证与测试设计
status: Active
doc-id: TEST-UI
owner-module: ui
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:57:00+08:00
---

# UI 模块验证与测试设计 (TEST-UI)

## 1. 测试策略与分层

本模块负责用户界面、两阶段沉浸式工作流、交互控制器、三语国际化与设计变量（`src/ui/`）。测试策略核心采用纯无头 Mock DOM 测试架构：
- **纯 Node.js 无头 Mock DOM 测试**：基于轻量 `createMockElement` 模拟真实浏览器事件循环（`click`、`input`、`change`）、`classList` 与属性读写，无需启动 Puppeteer 或真实浏览器即可在 CI 中毫秒级跑通；
- **两阶段工作流与状态机闭环**：验证制作母版（Mode 1）与虚拟铜版（Mode 2）模式切换、四步工艺步进器面板联动、4 态酸液控制台状态流转；
- **三语国际化与零 Emoji 约束**：覆盖 zh-CN、en-US、vi-VN 三语字典完整性，断言界面无未翻译 Raw Key，无任何 Emoji 字符；
- **视觉分层与无障碍 (A11y)**：验证亚麻纸纹与橡木画框视觉分层隔离，验证模态框包含 `role="dialog"` 与外部链接安全属性。

## 2. 真实测试套件与关键用例矩阵

UI 模块共包含 9 个测试文件、共计 51 项自动化测试用例：

| 测试文件 | 用例数 | 被测组件 / 符号 | 核心断言与验证目标 |
| :--- | :---: | :--- | :--- |
| `tests/ui.test.cjs` | 5 | `I18nManager`, `AppStore` | 1. 三语字典切换；2. DOM 数据属性（`data-i18n`）自动绑定；3. 越南语词汇完整性；4. URL 查询参数解析；5. AppStore 状态发布订阅 |
| `tests/ui-button-clicks.test.cjs` | 16 | 控制器按钮交互矩阵 | 1. 顶栏模式切换；2. 语言 Tab 切换；3. 关于弹窗；4. 七阶段卡片动作；5. 上版确认与向导；6. 工具选择；7. 撤销清空；8. 步进器导航；9. 酸蚀仪表盘与重置腐蚀 |
| `tests/two-stage-ui.test.cjs` | 9 | 两阶段工坊与安全守卫 | 1. 首次进入入口选择；2. 三语零 Emoji 强制约束；3. 工作流切换状态保留；4. 铜版四步渐进面板；5. 4 态酸液状态机；6. 铜版已修改时二次上版拦截弹窗 |
| `tests/ui-surfaces.test.cjs` | 4 | 工作区视觉分层 | 1. 母版与铜版浅色基底；2. 橡木纹理仅限铜版画框；3. 状态与描述间距；4. 计算未就绪时严格隐藏主视口 |
| `tests/theme-bridge.test.cjs` | 7 | Design Tokens 与模板规范 | 1. 无头环境 Design Tokens 解析；2. PipelineController 参数解耦；3. 间距与圆角 Tokens；4. 微模板零内联样式；5. 刻针初态零刻深；6. 酸液深度计时递增；7. 导出文件名带时间戳 |
| `tests/lightbox-vector.test.cjs` | 3 | `LightboxController` | 1. 视口平移缩放与双击特写；2. 七阶段独立导出分发；3. 导出器脱离 Node Buffer 浏览器原生兼容 |
| `tests/mobile-layout-lightbox.test.cjs` | 3 | 移动端响应式布局 | 视口断点缩放、移动端灯箱视口适配与最小触控面积符合 WCAG 标准 |
| `tests/mobile-touch-sheet.test.cjs` | 3 | 移动端抽屉手势交互 | 触摸滑动、底部抽屉展开折叠与滚动阻尼 |
| `tests/app-entry-mount.test.cjs` | 1 | `mountAppLayout` | 验证宿主 `#app` 节点装配 HTML 骨架完整性 |

## 3. 契约与集成测试

- **Mock DOM 事件完整性**：验证通过 `createMockElement` 派发的事件与原生 DOM 规范一致；
- **防抖时序安全**：连续高频点击按钮或拖动滑块时，内部 `TaskScheduler` 140ms 防抖保证仅最终状态进入执行。

## 4. 测试命令与环境

```powershell
# 执行 UI 交互层全部 9 个自动化测试套件
node --test tests/ui.test.cjs tests/ui-button-clicks.test.cjs tests/two-stage-ui.test.cjs tests/ui-surfaces.test.cjs tests/theme-bridge.test.cjs tests/lightbox-vector.test.cjs tests/mobile-layout-lightbox.test.cjs tests/mobile-touch-sheet.test.cjs tests/app-entry-mount.test.cjs
```

## 5. 覆盖率与质量门禁

- **用例通过率要求**：51 项 UI 交互与测试用例必须 100% 通过（Pass Rate = 100%）；
- **门禁阻断标准**：测试中若有未捕获的 DOM 空指针异常、三语翻译键缺失或违反零 Emoji 规范，判定门禁失败。
