# Etchloom 工程文档与 README 编写规范指南 (DOCUMENTATION_SPECIFICATION.md)

> **位置**：`docs/DOCUMENTATION_SPECIFICATION.md`  
> **适用对象**：所有参与 Etchloom 核心算法、工程架构、微服务与前端交互研发的工程师及架构师。  
> **核心原则**：代码即真理（Single Source of Truth）、严禁虚构（Zero Fabrication）、零营销修辞（No Marketing Buzzwords）、双向一致性（Bi-directional Parity）。

---

## 1. 为什么需要严格的文档工程规范？

在复杂的计算机图形学、物理仿真与多进程 AI 协同系统中，代码与文档的脱节会导致灾难性的沟通成本与技术债务：
1. **虚构规范 (Hallucination)**：文档中写了不存在的测试文件、伪造了 API 参数或夸大了未实现的架构（如 CDP E2E、FastAPI、CommandStack），会严重误导后续开发者；
2. **空洞营销 (Marketing Fluff)**：堆砌“大师级质感”、“天鹅绒般”、“震撼体验”等感性词汇，不仅对技术实现毫无帮助，更破坏了工程文档的客观严肃性；
3. **简陋无用 (Too Brief / Trivial)**：子模块 README 仅写三两行说明或一个空表格，后来的工程师根本无法理解内部算法原理、数学推导与运行边界，更无法独立复现或维护代码。

---

## 2. 顶级项目根目录 README 必须包含的 12 大标准章节

项目根目录的 `README.md` 与 `README.zh-CN.md` 必须遵循国际顶级开源图形与工程系统的结构标准，严格包含以下 12 个核心章节：

| 章节序号 | 必须包含的标准章节名称 | 内容规范与撰写要求 |
| :---: | :--- | :--- |
| **0** | **Header & Badges** | 包含 Logo、项目标题、一句话技术总结、运行时要求徽标 (Node 20+)、零外部运行依赖、测试通过率徽标 (100% PASS)、许可证徽标。 |
| **1** | **系统概览 (Executive Summary)** | 严谨定义工程解决的核心技术问题，说明从摄影图像到微米级物理仿真版画的计算闭环，彻底杜绝营销词。 |
| **2** | **核心架构亮点 (Architectural Highlights)** | 概括 5 阶段纯计算数学管线、2D PDE 酸液侧蚀扩散、连续 TypedArray 内存与零 DOM 同构前端。 |
| **3** | **系统架构与管线流程图 (System Architecture & Pipeline Flow)** | 必须提供标准 Mermaid 架构分层图（Layer 0~4）与 5 阶段离散状态机流程图。 |
| **4** | **项目物理目录拓扑 (Directory Layout & Topology)** | 树状呈现 `src/core/`, `src/orchestration/`, `src/services/`, `src/ui/`, `services/`, `docs/`, `tests/`，并为每个核心目录提供对应 README 的超链接。 |
| **5** | **核心算法原理与数学建模摘要 (Mathematical Principles)** | 列出 5 阶段算子、导向滤波色调分解、空气透视深度衰减、2D PDE 侧蚀扩散方程的核心公式。 |
| **6** | **环境要求与快速启动 (Prerequisites & Quick Start)** | 明确说明零构建、双击直接打开 (`index.html`)、本地服务启动 (`npm start`) 与 Python 神经网络服务启动方法。 |
| **7** | **交互工作流实操指南 (Interactive Workflow Guide)** | 详细说明算法母版设计区（7 卡片）、图稿上版向导（Transfer Wizard）、虚拟铜版工坊（4 工具实操、酸蚀控制台、凹版压印）与辅助交互（Alt+悬停 160px 4倍放大镜、滚轮漫游）。 |
| **8** | **自动化测试与质量保障 (Testing & Quality Assurance)** | 列明 `npm test`、实际测试文件及测试结果；统计数字以最近一次完整运行结果为准。 |
| **9** | **数据格式与通信契约 (Data Contracts & Schemas)** | 说明 Recipe Schema、Vector Geometry (role 枚举)、Plate Buffer 连续内存与 Python HTTP 微服务通信契约。 |
| **10** | **全景工程文档索引 (Master Documentation Matrix)** | 汇总指向 `docs/00_` 至 `docs/05_` 全局规范及 11 个子模块各自文档的索引矩阵。 |
| **11** | **实物与物理标定说明 (Physical & Material Calibration)** | 真实说明当前针宽物理毫米换算、吸墨扩张等视觉模型的标定现状。 |
| **12** | **开源许可证与贡献指南 (License & Contributing)** | 提供 MIT 许可证链接与 CONTRIBUTING.md 入口。 |

---

## 3. 子模块 README 必须包含的 8 大标准章节

所有核心功能子目录（`src/core/`, `src/core/hatching/`, `src/core/plate/`, `src/orchestration/`, `src/services/`, `src/ui/`, `src/ui/controllers/`, `src/ui/components/`, `src/ui/store/`, `services/informative_drawings/`, `services/lotus_geometry/`）的自包含 `README.md` 必须严格包含以下 8 大核心章节：

| 章节序号 | 标准章节名称 | 核心要求与内容 |
| :---: | :--- | :--- |
| **1** | **核心职责与工程目标 (Responsibilities & Objectives)** | 阐明本模块承担的单一职责，在全局中解决什么特定的工程问题。 |
| **2** | **内部架构与组件拓扑 (Component Map)** | 罗列该子目录下全部源码文件，并以表格或 Mermaid 呈现模块内部调用拓扑。 |
| **3** | **核心算法原理与数学建模 (Mathematical Principles)** | 给出核心算法原理推导，包含关键微分/积分方程，并直通该目录下的 `docs/ALGORITHM_SPEC.md`。 |
| **4** | **对外公共接口契约 (Public API Contract)** | 采用 TypeScript 接口或精确 JSDoc 格式列出所有导出类与函数：参数类型、默认值、返回值。 |
| **5** | **内部数据结构与内存布局 (Data Structures & Memory Layout)** | 明确说明内部使用的数据结构（如一维行优先平铺公式 `y * width + x`、TypedArray 字段）。 |
| **6** | **自动化测试矩阵与单跑指令 (Testing & Verification)** | 列明覆盖该模块的测试文件路径，并提供在终端直接单跑验证本模块的完整命令行。 |
| **7** | **边界防御与异常处理 (Edge Cases & Defensive Guarantees)** | 记录除零保护、坐标溢出截断、NaN 检查等防御性设计。 |
| **8** | **子文档导航 (Sub-documentation Index)** | 链接至本目录下的 `docs/ARCHITECTURE.md`, `docs/ALGORITHM_SPEC.md`, `docs/INTERFACE_SPEC.md`, `docs/TESTING.md`。 |

---

## 4. 算法原理与实现步骤文档标准 (Algorithm Specification Standard)

凡存放在各模块 `docs/ALGORITHM_SPEC.md` 中的算法文档，其详细度必须达到**“完全映射出原理，完全能够做到依据文档也能实现出代码来”**：
1. **输入数据集合与前置条件 (Preconditions)**：入参的几何定义、值域范围（如 $[0.0, 1.0]$）与归一化基准；
2. **连续空间微分/积分数学方程 (Continuous Formulation)**：严密的数学物理方程推导；
3. **离散化网格数值步进递推式 (Discretization & Numerical Steps)**：将连续方程转化为离散网格 $x, y$ 索引后的逐像素数值迭代式；
4. **循环终止与收敛判据 (Termination & Convergence)**：明确的迭代步数上限、残差容差或碰撞边界；
5. **完整实现伪代码 (Deterministic Pseudocode)**：包含紧凑包围盒计算、双缓冲切片交换与边界截断保护。

---

## 5. 模块接口设计与契约规范标准 (Interface & Contract Specification Standard)

凡存放在各模块 `docs/INTERFACE_SPEC.md` 中的接口设计文档，其核心定位是**“指导代码实现的契约设计，严禁沦为事后代码描述”**。详见 [SPEC_INTERFACE_DOC_STANDARD.md](02_doc_standards/SPEC_INTERFACE_DOC_STANDARD.md)。必须包含以下 7 大核心维度：
1. **接口设计哲学与职责边界 (Design Philosophy & Boundary)**：最小能力暴露、禁止的反向依赖；
2. **强类型接口定义与数据结构契约 (Type Definitions & Data Contract)**：TypeScript 签名、只读约束、量纲单位；
3. **前置条件与参数合法性约束 (Pre-conditions)**：调用方必须满足的合法状态与防御性抛错标准；
4. **后置条件与状态变更承诺 (Post-conditions)**：实现方在成功返回时必须向调用方做出的数学与物理状态承诺；
5. **系统不变量与守恒律 (System Invariants)**：任何公共方法调用前后必须恒真的守恒条件；
6. **纯函数属性、副作用与内存所有权 (Side-effects & Memory Ownership)**：纯函数声明、TypedArray 所有权转移与借用规则；
7. **错误契约、并发与生命周期状态协议 (Error Handling & Lifecycle Protocol)**：异常类型规范、AbortSignal 抢占中止与幂等性保障。
