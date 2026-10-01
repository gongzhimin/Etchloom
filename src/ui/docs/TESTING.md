# UI 交互层自动化测试规范 (TESTING.md)

> **被测模块**：`src/ui/` (`controllers/`, `components/`, `store/`, `i18n/`, `templates/`)  
> **执行命令**：`node --test tests/ui.test.cjs tests/ui-button-clicks.test.cjs`

---

## 1. 测试用例矩阵与验证目标

| 测试套件 | 用例总数 | 验证核心 |
| :--- | :---: | :--- |
| `tests/ui.test.cjs` | 3 项 | I18nManager 双语字典更新、DOM 数据属性自动匹配、AppStore 发布订阅与状态保护 |
| `tests/ui-button-clicks.test.cjs` | 12 项 | 顶栏模式切换、语言切换、About 弹窗、7阶段卡片动作（放大镜/全屏/导出）、上版按钮、4工具选择、撤销清空、步进器导航、2K/3K 分辨率切换、酸蚀控制台展开与表盘显示 |
| `tests/pipeline-source-cache.test.cjs` | 1 项 | 新来源清空阶段缓存并递增版本 |
| `tests/pipeline-source-race.test.cjs` | 2 项 | 连续载图时旧回调失效、超限图片在画布分配前被拒绝 |

---

## 2. 模拟 DOM 纯无头断言设计

所有 UI 测试均运行于纯 Node.js 无头环境下，通过轻量 `createMockElement` 实现真实的事件派发（`click`, `input`, `change`）与类名断言，确保 CI 环境 100% 可重复执行。
