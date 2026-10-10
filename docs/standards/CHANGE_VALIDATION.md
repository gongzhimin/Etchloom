---
title: 变更一致性维护与验证规范
status: Active
doc-id: RULE-CHANGE
owner-module: root
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:25:00+08:00
---

# 变更一致性维护与验证规范

## 1. 目的

保证代码、注释与文档三者在每一次提交中绝对一致；践行“发现即修”与“零宽限期”原则，杜绝“先提交代码后补文档”的不良工程习惯；通过机械化检查实现门禁自动化判定。

## 2. 变更影响判断

开发人员或协同智能体在动手修改前，必须依据下表判定变更类型及影响范围：

| 变更类型 | 影响范围 | 必须同步更新的文档 | 自动化校验命令 |
| :--- | :--- | :--- | :--- |
| **新增用户功能 / 页面交互** | 用户体验、状态流 | `docs/requirements/REQUIREMENTS.md`<br>`src/ui/docs/design/UI_DESIGN.md`<br>`docs/verification/TESTING.md` | `npm test`<br>`powershell -File docs/check-documentation.ps1` |
| **修改算法方程 / 物理模型** | 计算核心、仿真精度 | `src/core/docs/design/ALGORITHM.md`<br>`src/core/docs/verification/TESTING.md` | `node tests/virtual-plate-engine.test.cjs`<br>`node tests/plate.test.cjs` |
| **修改跨模块接口 / 数据结构** | 跨层契约、数据流 | `docs/design/INTERFACES.md`<br>`docs/design/DATA_DICTIONARY.md`<br>相关模块 `INTERFACES.md` | `npm test` 全量通过 |
| **调整系统级技术选型 / ADR** | 架构方向、非功能属性 | `docs/decisions/DECISIONS.md` (新增条目) | 构建打包测试 |
| **多语言 / 国际化文案变更** | 界面三语词典 | `src/ui/i18n/i18n.js` (三语同步)<br>`tests/two-stage-ui.test.cjs` | `node tests/two-stage-ui.test.cjs` |

## 3. 变更触发的文档更新

### 3.1 代码变更触发文档更新映射
- 更改任意导出函数签名 $\rightarrow$ 对应模块 `design/INTERFACES.md`；
- 更改物理场计算方程 $\rightarrow$ `src/core/docs/design/ALGORITHM.md`；
- 更改状态机流转或操作步骤 $\rightarrow$ `docs/design/WORKFLOW.md`；
- 更改多语言键值 $\rightarrow$ `src/ui/docs/design/UI_DESIGN.md`。

### 3.2 文档变更触发反向检查映射
- 更新需求验收标准 $\rightarrow$ 必须同步存在或补齐对应自动化测试；
- 废弃接口文档 $\rightarrow$ 代码中对应符号必须同步标记 `@deprecated` 或安全移除。

## 4. 检查命令与阶段清单

### 阶段 1：变更前
- [ ] 查阅对应模块 `docs/README.md` 与 `INTERFACES.md`，明确边界；
- [ ] 确认是否涉及跨模块事实（若是，须准备同步根级登记）。

### 阶段 2：变更中
- [ ] 代码修改与文档更新在本地同分支、同工作区进行；
- [ ] 保持 JSDoc 引用锚点与测试用例关联 ID 的有效性。

### 阶段 3：变更后
- [ ] 执行全量单元与对抗测试：`npm test`；
- [ ] 执行文档门禁检查：`powershell -ExecutionPolicy Bypass -File docs/check-documentation.ps1`。

## 5. 合并条件 (Merge Checklist)

准入必须同时满足以下条件：
- [ ] `npm test` 保持 100% 通过（0 失败、0 异常）；
- [ ] `check-documentation.ps1` 退出码为 0（零 Error）；
- [ ] 文档死链为 0；
- [ ] 三语字典词条 1:1 对齐，零 Emoji 污染。

❌ **绝对禁止合并的情形**：
1. 模块 docs 下包含 `requirements/` 或 `standards/` 目录；
2. 二级子模块建立了 `docs/` 目录；
3. 文档缺失 YAML front matter 或 `status` 非法；
4. 存在未被测试覆盖的新增核心算法逻辑。

## 6. 评审职责

- **变更者职责**：提交包含代码、注释、文档与测试的原子自闭环 Commit，在 PR 中附带门禁自检截图。
- **评审者职责**：机械核对文档中的公式、接口签名与代码是否完全一致，验证是否引入了多余或失效文档。

## 7. 例外处理

1. **紧急生产热修复 (Hotfix)**：
   - 允许优先解决阻断性缺陷，但修复代码与对应 `verification/TESTING.md` 缺陷台账必须在同一个 Commit 中完成；
   - 严禁出现“只修代码不写缺陷记录”的裸提交。
2. **实验性特性 (Experimental)**：
   - 必须在专属分支演进，相关文档标记 `status: Draft`；合入主干前必须升级为 `Active`。
3. **技术债与遗留项 (Technical Debt)**：
   - 严禁将技术债以口头形式遗留，必须在 `docs/decisions/DECISIONS.md` 登记为待决事项。

## 8. 工具支持

- 文档门禁检查工具：`docs/check-documentation.ps1`
- 宽容模式（仅排查警告）：`docs/check-documentation.ps1 -WarnOnly`
- 测试套件全量命令：`npm test`

## 9. 最佳实践

- 保持文档与代码同提交，杜绝滞后更新；
- 每次修改接口必须先改契约文档，再依契约修改实现。

## 10. 与其他规范的关系

本规范是 `standards/DOCUMENT_RULES.md` §2 “发现即修”原则的唯一执行细则；当具体检查命令冲突时，以本文件为准。
