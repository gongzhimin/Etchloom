# 变更一致性维护与验证规范 (CHANGE_VALIDATION)

> **规范编号**：STD-CHG-004  
> **适用范围**：所有功能迭代、算法优化、UI 重构及版本发布  
> **权威来源**：持续交付 (CI) 质量门禁与工程维护规范  

---

## 1. 变更影响范围判定矩阵

每次提交代码或文档修改前，开发者与 AI 协同工具必须依照下表自查触发的文档更新责任：

| 变更类型 | 触发必须更新的文档 | 自动化验证命令 |
| :--- | :--- | :--- |
| **新增用户可见功能 / UI 交互** | `docs/requirements/REQUIREMENTS.md`<br>`src/ui/docs/UI_DESIGN.md`<br>`docs/verification/TESTING.md` | `npm test`<br>界面三语词典校验 |
| **修改物理算法 / 偏微分方程** | `src/core/plate/docs/ALGORITHM.md`<br>`src/core/plate/docs/TESTING.md` | `node tests/virtual-plate-engine.test.cjs`<br>`node tests/plate.test.cjs` |
| **修改跨模块接口 / 数据结构** | `docs/design/INTERFACES.md`<br>`docs/design/DATA_DICTIONARY.md`<br>调用方模块文档 | `npm test` 全量通过 |
| **新增或调整系统级技术选型** | `docs/decisions/DECISIONS.md` (新增 ADR 条目) | 构建验证与打包脚本验证 |
| **多语言 / 国际化文案变更** | `src/ui/i18n/i18n.js` (三语同步)<br>`tests/two-stage-ui.test.cjs` (三语覆盖校验) | `node tests/two-stage-ui.test.cjs` |

---

## 2. 变更合入与发布的硬性门禁 (Merge Gates)

任何变更被判定为“合入就绪 (Merge-Ready)”前，必须同时满足以下条件：

1. **测试套件 100% 通过**：
   运行 `npm test`，所有测试必须全部通过（Pass rate = 100%），零 Failure、零 Cancelled。
2. **文档断言自洽**：
   若代码修改了输入参数默认值、量纲单位或返回类型，对应的 JSDoc 与 `INTERFACES.md` 必须已完成同步。
3. **零死链原则**：
   文档内部的所有相对超链接必须真实存在，不得产生损坏的路径。
4. **多语言一致性**：
   `zh-CN`、`en-US`、`vi-VN` 三语字典词条必须严格 1:1 对齐，零 Emoji 污染。

---

## 3. 例外与遗留问题处理

1. **临时紧急修复 (Hotfix)**：
   若遇到紧急生产环境阻断 bug，修复代码合入后，必须在 24 小时内补齐对应的 `TESTING.md` 案例与关联规范更新。
2. **未竟项与技术债追踪**：
   严禁将未完成的设计方案写入正式需求文档；如有技术债，必须记录在 `docs/decisions/DECISIONS.md` 的“遗留考虑”小节中。
