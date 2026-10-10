---
title: Etchloom 系统文档全景索引
status: Active
doc-id: RULE-DOC-NAV
owner-module: root
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:25:00+08:00
---

# Etchloom 系统文档全景索引

## 文档导航

### 系统级核心规范 (System Specifications)

| 文档类型 | 链接 | 状态 | 一句话用途 |
| :--- | :--- | :--- | :--- |
| **系统需求** | [requirements/REQUIREMENTS.md](requirements/REQUIREMENTS.md) | Active | 系统愿景、业务场景（SCEN-001~003）、质量要求、系统与分模块验收标准。 |
| **系统架构** | [design/ARCHITECTURE.md](design/ARCHITECTURE.md) | Active | 系统边界、一级模块职责、终端风格 ASCII 依赖拓扑与协作时序。 |
| **对外契约** | [design/INTERFACES.md](design/INTERFACES.md) | Active | 跨模块契约归属总登记（登记与定义分离，权威定义在各模块）。 |
| **通用算法** | [design/ALGORITHM.md](design/ALGORITHM.md) | Active | 五阶段母版数学框架、图像自适应下采样与 DJB2 内容敏感哈希。 |
| **业务流转** | [design/WORKFLOW.md](design/WORKFLOW.md) | Active | 两阶段工坊工作流转、酸槽物理腐蚀 4 态状态机与抢占容错机制。 |
| **数据字典** | [design/DATA_DICTIONARY.md](design/DATA_DICTIONARY.md) | Active | 公共数据语义归属登记（RecipeSchema、PlateBufferLayout、VectorStrokeSet 等）。 |
| **验证策略** | [verification/TESTING.md](verification/TESTING.md) | Active | 系统测试策略金字塔、双轨验证矩阵、对抗攻防矩阵与缺陷台账。 |
| **架构决策** | [decisions/DECISIONS.md](decisions/DECISIONS.md) | Active | 系统级重大技术选型与冲突仲裁记录（D-0001 ~ D-0007 / ADR-001 ~ ADR-007）。 |

### 工程规范体系 (Standards)

| 规范类型 | 链接 | 状态 | 一句话用途 |
| :--- | :--- | :--- | :--- |
| **元规范** | [standards/DOCUMENT_RULES.md](standards/DOCUMENT_RULES.md) | Active | 统一文档系统的组织、章节骨架、机器可读元数据与门禁职责。 |
| **代码规范** | [standards/CODING_RULES.md](standards/CODING_RULES.md) | Active | 编码、排版、命名风格、纯领域计算零 DOM 隔离及预检要求。 |
| **注释规范** | [standards/COMMENT_RULES.md](standards/COMMENT_RULES.md) | Active | 统一代码注释意图、JSDoc 强契约要求与禁止无效复读废话注释。 |
| **追溯规范** | [standards/TRACEABILITY_RULES.md](standards/TRACEABILITY_RULES.md) | Active | 建立需求、设计、代码、测试之间机器可读的追溯 ID 关联网络。 |
| **变更规范** | [standards/CHANGE_VALIDATION.md](standards/CHANGE_VALIDATION.md) | Active | 规定代码与功能变更如何触发文档同步与发布合并门禁。 |
| **接口规范** | [standards/API_RULES.md](standards/API_RULES.md) | Active | 统一跨模块接口单一入口门面原则 (Single-Entry Facade) 与错误语义。 |
| **数据规范** | [standards/DATA_RULES.md](standards/DATA_RULES.md) | Active | 统一物理量度量（微米、毫米、秒）、时间戳与 TypedArray 内存布局。 |
| **界面规范** | [standards/UI_RULES.md](standards/UI_RULES.md) | Active | Atelier 莫兰迪工坊视觉语言、Design Tokens 与零 Emoji 规则。 |
| **测试规范** | [standards/TEST_RULES.md](standards/TEST_RULES.md) | Active | 统一攻击视角测试哲学 (Attacker's Mindset) 与六大对抗攻防向量。 |

### 一级模块实现文档导航 (Module Documentation)

- **[core（领域计算核心）](../src/core/docs/README.md)**：包含五阶段母版生成、微分几何排线、虚拟铜版物理引擎与 2D PDE 酸蚀解算。
- **[orchestration（调度编排层）](../src/orchestration/docs/README.md)**：包含管线调度防抖抢占、DJB2 增量拓扑哈希缓存与多格式统一导出。
- **[services（服务与网关层）](../src/services/docs/README.md)**：包含 WebGPU / WASM 硬件感知加速、本地 Python 服务探活与离线几何降级。
- **[ui（工坊交互表现层）](../src/ui/docs/README.md)**：包含两阶段古典工坊进阶模式、4 态酸液控制台、高分辨率 Canvas 压印与三语国际化。

## 权威关系

1. **根级文档承载的权威事实**：
   - 系统级业务目标、端到端业务场景与全局质量属性（权威在 `requirements/REQUIREMENTS.md`）；
   - 一级模块边界、单向依赖拓扑与禁止反向依赖（权威在 `design/ARCHITECTURE.md`）；
   - 跨模块契约与公共数据语义的归属登记（权威在 `design/INTERFACES.md` 与 `design/DATA_DICTIONARY.md`）；
   - 全系统工程规范体系（权威在 `standards/*.md`）。
2. **模块级引用的外部事实**：
   - 模块对外接口的具体签名由模块自身 `INTERFACES.md` 权威定义，根级仅登记归属；
   - 模块算法细节与内部状态机权威留存于模块自身 `design/` 目录；
   - 本 `README.md` 仅提供全景索引与导航，本身不承载任何权威定义。
