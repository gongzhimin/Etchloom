# Etchloom 工程文档与 README 编写规范体系 (DOCUMENTATION_STANDARDS.md)

> **文档适用对象**：Etchloom 系统全部核心研发人员、算法工程师及架构师。  
> **核心原则**：代码即真理（Single Source of Truth）、拒绝虚构规范（Zero Fabrication）、零营销空话（No Marketing Buzzwords）、双向一致性（Bi-directional Parity）。

---

## 1. 文档工程核心哲学与红线 (Engineering Principles)

1. **实事求是与零虚构原则 (Zero Fabrication)**：
   - 文档中记录的每一个类名、函数名、参数名、数据类型、默认值，必须与生产代码 100% 保持字符级匹配；
   - 严禁虚构不存在的测试套件文件（如严禁引用不存在的测试或夹具）；
   - 严禁宣称代码库未引入的外部依赖或虚构能力（例如未引入 Chrome DevTools Protocol E2E 或 FastAPI 时，严禁在架构图中出现）。
2. **客观严谨的技术表达 (Zero Marketing Fluff)**：
   - 严禁出现“大师级质感”、“天鹅绒般”、“震撼体验”、“触觉级”等感性或商业营销修饰词；
   - 必须使用精准、严肃的计算机图形学、数值计算与软件工程术语（如“2D 偏微分方程各向同性侧蚀扩散”、“基于积分图的 O(1) 盒状滤波”、“结构张量相干度门控”）。
3. **可实现性标准 (Implementation-Grade Rigor)**：
   - 算法设计文档必须完整推导数学模型、连续微分/积分方程与离散化数值步进，确保其他工程师**仅依据文档即能无歧义地完整复现出生产代码**。
4. **双向一致性闭环 (Bi-directional Parity)**：
   - 代码变动，文档必动。当修改了算子参数名、新增了接口或调整了数据结构时，必须在同一轮次同步更新全局文档与对应子模块文档。

---

## 2. 根目录主 README 标准章节目录规范 (Master README Spec)

项目根目录的 `README.md` 与 `README.zh-CN.md` 是工程对外的最高技术门面，必须严格包含以下 12 个标准核心章节，不得遗漏：

```markdown
# [Project Name] - [One-line Technical Summary]

[Badges: Runtime / Dependencies / Tests Pass Rate / License]
[Hero Visual: Workbench Full Screenshot or Pipeline Diagram]

## 1. 系统概览与工程定位 (Executive Summary)
- 定义工程要解决的核心技术问题，系统的核心计算输入与输出。

## 2. 核心架构亮点 (Core Architectural Highlights)
- 纯计算数学管线、偏微分方程物理仿真、零 DOM 同构设计与动态解耦前端。

## 3. 系统分层拓扑与流程图 (System Architecture & Pipeline Flow)
- 包含 Layer 0 ~ Layer 4 的 C4 分层架构图 (Mermaid)。
- 包含 5 阶段离散管线状态流转图 (Mermaid)。

## 4. 严谨目录拓扑 (Directory Layout & Submodule Index)
- 展开核心子目录，并提供每个子模块 README 与 docs 的超链接。

## 5. 核心算法原理与数学建模摘要 (Mathematical Principles)
- 提炼 5 阶段管线核心方程、2D PDE 腐蚀扩散方程与流线积分公式。

## 6. 环境依赖与快速开始 (Prerequisites & Quick Start)
- 区分直接离线双击打开 (`index.html`) 与本地服务器 (`npm start`)。
- 区分 Python 神经网络微服务的启动配置。

## 7. 交互工作流实操指南 (Interactive Workflow Guide)
- 算法母版设计工作区（7 卡片网格、特写、导出）。
- 图稿上版向导（Transfer Wizard）参数解析。
- 虚拟铜版工坊实操（4 工具、酸液控制台、压印试印）。
- 全局交互（Alt+悬停 160px 4倍放大镜、滚轮漫游、多语言）。

## 8. 自动化测试与质量保障体系 (Testing & Quality Assurance)
- 测试运行指令 (`npm test`)。
- 26 个测试文件、119 项测试的分层说明与覆盖范围。

## 9. 数据格式与通信契约 (Data Contracts & Schemas)
- Recipe Schema、Vector Geometry (role 枚举)、Plate Buffer Layout 与 Service API。

## 10. 全景工程技术文档索引 (Master Documentation Matrix)
- 汇总全局 docs/ 各规范与 ADR 决策记录。

## 11. 实物与物理标定说明 (Physical & Material Calibration)
- 针宽毫米级映射、纸张吸墨与滚筒压力说明。

## 12. 开源许可证与贡献指南 (License & Contributing)
- 许可证链接与 CONTRIBUTING.md 入口。
```

---

## 3. 子模块 README 标准章节目录规范 (Submodule README Spec)

项目中各个核心功能子目录（如 `src/core/`, `src/core/plate/`, `src/orchestration/` 等）必须自包含独立的 `README.md`，必须严格包含以下 8 大标准章节：

```markdown
# [Submodule Name]

> **模块路径**：`path/to/submodule/`  
> **技术定位**：[一句话精准定义本模块在全局分层模型中的层级与边界]

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)
- 详细说明本模块承担的单一职责，解决了系统中的什么工程问题。

## 2. 内部架构与组件拓扑 (Internal Architecture & Component Map)
- 罗列本目录下所有生产源码文件，并以表格或 Mermaid 图呈现它们之间的调用拓扑。

## 3. 核心算法原理与数学公式推导 (Mathematical Formulation & Algorithm Steps)
- 详尽推导核心数学方程、离散化网格步进、状态转移与循环终止条件。
- 必须达到“完全映射出原理、依据文档也能独立复现出代码”的标准。

## 4. 对外公共接口契约 (Public API Contract)
- 逐个导出类与函数：参数名、类型、默认值、返回值结构、边界防御。

## 5. 内部核心数据结构与内存布局 (Data Structures & Memory Layout)
- 详细列出内部使用的数据结构（如 Float32Array 平铺一维索引公式、对象结构体）。

## 6. 自动化测试矩阵与单跑指令 (Testing & Verification)
- 列出覆盖本模块的全部测试文件，并给出在终端直接单跑验证本模块的完整命令。

## 7. 边界条件与防御性设计 (Edge Cases & Defensive Guarantees)
- 边界溢出、NaN 防范、除零保护、空指针兜底等防御保证。

## 8. 子文档导航 (Sub-documentation Index)
- 提供指向本目录下 `docs/ARCHITECTURE.md`, `docs/ALGORITHM_SPEC.md`, `docs/TESTING.md` 的超链接。
```

---

## 4. 算法原理与实现步骤文档标准 (Algorithm Specification Standard)

凡存放在 `docs/ALGORITHM_SPEC.md` 中的算法原理文档，必须具备以下 5 项要素：
1. **输入数据集合与前置条件 (Preconditions)**：入参的几何定义、值域范围与归一化基准；
2. **连续空间微分/积分方程 (Continuous Formulation)**：严谨的数学物理方程（如偏微分方程、高斯积分、张量分解）；
3. **离散化网格数值步进递推式 (Discretization & Numerical Steps)**：转换为离散网格 $x, y$ 索引后的迭代公式；
4. **循环终止与收敛判据 (Termination & Convergence)**：明确的退出循环条件与自适应步长控制；
5. **完整实现伪代码 (Deterministic Pseudocode)**：无歧义的逻辑流，包含边界截断。
