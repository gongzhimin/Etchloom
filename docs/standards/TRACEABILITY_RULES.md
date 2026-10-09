# 需求、设计、代码与测试全链路追踪规范 (TRACEABILITY_RULES)

> **规范编号**：STD-TRC-003  
> **适用范围**：全项目需求基线、系统架构、算法设计、源码与测试用例  
> **权威来源**：系统工程 V 模型与持续验证一致性标准  

---

## 1. 追踪标识符 (ID) 命名体系

为实现双向追踪（需求 $\leftrightarrow$ 设计 $\leftrightarrow$ 代码 $\leftrightarrow$ 测试），系统统一采用前缀结构化 ID：

| 实体类型 | ID 命名规则 | 范例 | 所在权威文档 |
| :--- | :--- | :--- | :--- |
| **系统需求** | `REQ-SYS-[分类]-[序号]` | `REQ-SYS-QUAL-001` (全精度离线) | `docs/requirements/REQUIREMENTS.md` |
| **模块需求** | `REQ-MOD-[模块]-[序号]` | `REQ-MOD-PLATE-002` (酸液潜蚀) | `src/[module]/docs/REQUIREMENTS.md` (或本模块设计中明确) |
| **架构设计** | `DES-ARCH-[层级]-[序号]` | `DES-ARCH-TOP-001` (两阶段管线) | `docs/design/ARCHITECTURE.md` |
| **接口契约** | `IF-[模块]-[接口名]-[序号]` | `IF-PIPE-RUN-001` (管线调度执行) | `docs/design/INTERFACES.md` |
| **算法方案** | `ALG-[领域]-[算法名]-[序号]` | `ALG-PLATE-PDE-001` (2D PDE 数值解) | `docs/design/ALGORITHM.md` / `src/[mod]/docs/ALGORITHM.md` |
| **数据字典** | `DATA-[实体]-[序号]` | `DATA-RECIPE-001` (全局刻印配置) | `docs/design/DATA_DICTIONARY.md` |
| **测试用例** | `TEST-[类型]-[模块]-[序号]` | `TEST-E2E-ACID-001` (酸液闭环验证) | `docs/verification/TESTING.md` / 测试源码 |

---

## 2. 定义与引用的严格区别

1. **定义（Declaration）**：
   * 只能在一个权威文档中声明一次；
   * 格式必须使用标准锚点加粗标注：
     ```markdown
     ### [REQ-SYS-QUAL-001] 全离线与高精度保真
     **定义**：系统所有线条生成与物理仿真必须 100% 运行于本地，严禁依赖云端 API 计算。
     ```
2. **引用（Reference）**：
   * 在下游设计、代码注释或测试用例中关联该 ID：
     * **文档中**：`> **承接需求**：[REQ-SYS-QUAL-001](../requirements/REQUIREMENTS.md#req-sys-qual-001)`
     * **代码中**：`// Implements: REQ-SYS-QUAL-001, DES-ARCH-TOP-001`
     * **测试中**：`test('Plate Studio acid etching: groove depth genuinely increases [TEST-UNIT-PLATE-002 -> REQ-MOD-PLATE-002]', ...)`

---

## 3. 全链路追踪矩阵 (Traceability Matrix) 结构

每个系统级与模块级功能必须具备完整的追踪闭环：

```text
[REQ-SYS-xxx] 业务需求
      │
      ▼
[DES-ARCH-xxx / ALG-xxx] 架构与数学建模
      │
      ▼
[IF-xxx / DATA-xxx] 接口协议与数据结构
      │
      ▼
[src/xxx.js] 代码实现 (JSDoc 显式反向引用)
      │
      ▼
[TEST-xxx] 自动化测试验证 (断言验收条件覆盖)
```

---

## 4. 文件移动、重构与废弃处理

1. **重构移动文件**：
   若某模块或文件迁移路径，必须执行全局文本检索（Grep），更新所有引用该文件的相对路径链接，严禁留下失效的 404 死链。
2. **需求或接口废弃 (Deprecation)**：
   * 不得直接从历史文档中抹除 ID；
   * 必须在对应条目标注 `[DEPRECATED]` 并注明替代方案及对应 ADR 决策编号：
     ```markdown
     ### [REQ-SYS-OLD-003] [DEPRECATED -> REQ-SYS-NEW-008] 旧版单阶段工作流
     > 废弃原因参见 [ADR-004](../decisions/DECISIONS.md#adr-004-two-stage-workflow)
     ```
