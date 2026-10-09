# Etchloom 系统文档全景索引 (DOCUMENTATION INDEX)

> **设计边界声明**：本文件为 Etchloom 系统的**文档总索引与架构导航**，不承担项目的安装、运行与使用说明。  
> 若需查看项目简介、开发启动、构建及跨平台打包发布指南，请参见根目录 [../README.md](../README.md)。  

---

## 1. 系统级核心规范 (System Specifications)

| 文档分类 | 权威文档链接 | 核心职责与范围 |
| :--- | :--- | :--- |
| **系统需求** | [requirements/REQUIREMENTS.md](requirements/REQUIREMENTS.md) | 定义系统愿景、业务场景（SCEN-001~003）、非功能质量与全局验收标准。 |
| **系统架构** | [design/ARCHITECTURE.md](design/ARCHITECTURE.md) | 定义一级模块边界、分层单向拓扑、跨模块协作时序与依赖约束。 |
| **对外契约** | [design/INTERFACES.md](design/INTERFACES.md) | 全系统统一权威接口签名列表（PipelineRunner、TaskScheduler、VirtualPlateStudio 等）。 |
| **通用算法** | [design/ALGORITHM.md](design/ALGORITHM.md) | 五阶段母版数学框架、图像尺寸自适应缩放与 DJB2 增量拓扑缓存哈希方程。 |
| **业务流转** | [design/WORKFLOW.md](design/WORKFLOW.md) | 两阶段工坊工作流转、酸槽物理腐蚀 4 态状态机与抢占容错机制。 |
| **数据字典** | [design/DATA_DICTIONARY.md](design/DATA_DICTIONARY.md) | 登记公共实体数据语义（RecipeSchema、PlateBufferLayout、VectorPath 等）。 |
| **验证策略** | [verification/TESTING.md](verification/TESTING.md) | 系统测试策略金字塔、端到端关键验收用例矩阵与持续集成验证。 |
| **架构决策** | [decisions/DECISIONS.md](decisions/DECISIONS.md) | 记录系统级技术选型与设计原则（ADR-001 ~ ADR-007）。 |

---

## 2. 工程规范与标准 (Engineering Standards)

| 规范文件 | 规范编号 | 核心职责 |
| :--- | :--- | :--- |
| [standards/DOCUMENT_RULES.md](standards/DOCUMENT_RULES.md) | `STD-DOC-001` | 统一文档系统的组织、命名、10 类文档分工、SSOT 单一真理源原则。 |
| [standards/COMMENT_RULES.md](standards/COMMENT_RULES.md) | `STD-COM-002` | 统一代码注释职责、JSDoc 强契约要求与禁止无效废话注释。 |
| [standards/TRACEABILITY_RULES.md](standards/TRACEABILITY_RULES.md) | `STD-TRC-003` | 建立需求 (REQ)、设计 (DES)、代码与测试 (TEST) 结构化 ID 追踪链路。 |
| [standards/CHANGE_VALIDATION.md](standards/CHANGE_VALIDATION.md) | `STD-CHG-004` | 规定代码与功能变更如何触发文档同步与发布门禁。 |
| [standards/API_RULES.md](standards/API_RULES.md) | `STD-OPT-API-001` | 统一跨模块接口命名范式、异常抛出语义与 IPC 通信契约。 |
| [standards/DATA_RULES.md](standards/DATA_RULES.md) | `STD-OPT-DAT-002` | 统一物理量度量（微米、毫米、秒）、时间戳与 TypedArray 内存布局。 |
| [standards/UI_RULES.md](standards/UI_RULES.md) | `STD-OPT-UI-003` | Atelier 莫兰迪工坊视觉语言、Design Tokens、衬线字体分层与零 Emoji 规则。 |
| [standards/TEST_RULES.md](standards/TEST_RULES.md) | `STD-OPT-TST-004` | 统一测试套件编写规范、无头 Mock 隔离与物理守恒断言。 |

---

## 3. 一级模块实现文档导航 (Module Documentation)

* **[src/core/docs/README.md](../src/core/README.md)（领域计算核心）**
  * 架构拓扑：[src/core/docs/ARCHITECTURE.md](../src/core/docs/ARCHITECTURE.md)
  * 通用接口：[src/core/docs/INTERFACES.md](../src/core/docs/INTERFACES.md)
  * 测试矩阵：[src/core/docs/TESTING.md](../src/core/docs/TESTING.md)
  * *子模块 · 虚拟铜版引擎*：[src/core/plate/README.md](../src/core/plate/README.md) (含 2D PDE 物理仿真)
  * *子模块 · 神经排线引擎*：[src/core/hatching/README.md](../src/core/hatching/README.md) (含流线微分几何)
* **[src/orchestration/docs/README.md](../src/orchestration/README.md)（编排与调度层）**
  * 调度架构：[src/orchestration/docs/ARCHITECTURE.md](../src/orchestration/docs/ARCHITECTURE.md)
  * 导出器接口：[src/orchestration/docs/INTERFACES.md](../src/orchestration/docs/INTERFACES.md)
* **[src/services/docs/README.md](../src/services/README.md)（服务与硬件网关层）**
  * 降级架构：[src/services/docs/ARCHITECTURE.md](../src/services/docs/ARCHITECTURE.md)
* **[src/ui/docs/README.md](../src/ui/README.md)（前端交互与工坊视图）**
  * 界面总装：[src/ui/docs/ARCHITECTURE.md](../src/ui/docs/ARCHITECTURE.md)
  * 界面交互详述：[src/ui/docs/UI_DESIGN.md](../src/ui/docs/UI_DESIGN.md)
