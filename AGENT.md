# Etchloom Agent Engineering Workflow & Integrity Standards (AGENT.md)

> **文档适用对象**：所有参与 Etchloom（数字古典版画工坊系统）代码重构、功能迭代、文档编写与缺陷修复的 AI Agent 及工程师。  
> **核心原则**：代码即真理（Code as Single Source of Truth）、拒绝虚构规范（Zero Tolerance for Hallucinated Specs）、严禁营销修辞（No Marketing Fluff）、双向一致性（Strict Bi-directional Parity）。

---

## 1. 核心工程纪律 (Engineering Principles)

### 1.1 实事求是与零虚构 (Factual Accuracy & Zero Fabrication)
- **严禁虚构测试文件与测试用例**：文档中提及的每一个 .test.cjs 文件必须在硬盘上物理存在；严禁虚构不存在的目录（如 `tests/fixtures/`）或假夹具文件。
- **严禁伪造代码范例**：规范文档中给出的任何“标杆实现代码”或“防御断言范例”，必须 1:1 摘录自仓库现有生产源码。严禁把“理想规范”伪装成“当前实现”。
- **严禁伪造外部依赖与工具链**：项目中未使用 Chrome DevTools Protocol (CDP)、FastAPI、MurmurHash、pixelmatch 或 SSIM 时，严禁在文档中宣称具备该能力。
- **严禁虚标性能与耗时**：UI 呈现或文档记录的阶段耗时必须由 performance.now() 实时测量，严禁写入伪造的固定常数（如 24.5ms, 38.2ms）。

### 1.2 杜绝空洞营销与诗化语言 (No Marketing Fluff)
- 文档必须使用精准、严肃、客观的计算机图形学与软件工程术语。
- **全面禁止以下修饰词与感性修辞**：
  - ❌ “文艺复兴大师级质感”、“天鹅绒般的调子”、“触觉级虚拟铜版刻蚀”
  - ❌ “黄金微光脉冲呼吸边框”、“细若游丝的金色划痕”
  - ❌ “模拟 300 磅滚筒重压下高粘度油墨挤入棉纸凹痕”（除非代码真正实现了接触力学有限元解算，否则仅称为“2D 灰度加权扩散混合与边缘阴影渲染”）

### 1.3 双向一致性闭环 (Bi-directional Consistency)
- **代码变动，文档必动**：修改接口入参、重命名字段（如 type 改为 role）、调整枚举取值（如 'hatch' | 'cross'）时，必须同步检索并更新对应的架构设计、数据字典及子模块文档。
- **文档不写未落地特性**：若某功能（如快捷键 Ctrl+Z、二进制 .bin 导出）尚未在代码中实现，必须明确标注为 [PLANNED] 或 [NOT IMPLEMENTED]，不得直接写入功能列表。

### 1.4 模块拓扑分界与导入禁令 (Module Topology Laws & Import Guard)
- **严格区分运行模式与上下文**：
  - 核心纯算法与底层组件（`src/core/*`, `src/ui/components/step-flow-grid.js` 等）遵循 **UMD / Isomorphic** 规范，由 `index.html` 的标准 `<script>` 标签预先注入 `globalThis`；
  - 前端应用装配与控制器（`src/main.js`, `src/ui/controllers/*`）遵循 **Native ES Modules** (`<script type="module">`)。
- **严禁虚假命名导入**：
  - 原生 ESM 模块严禁书写 `import { a, b } from '../components/c.js'` 去导入任何仅通过 UMD / IIFE 全局赋值的文件；
  - 跨层访问必须统一使用防御性全局访问点：`(typeof window !== 'undefined' && window.foo) || (typeof globalThis !== 'undefined' && globalThis.foo)`；
  - 严禁在浏览器端制造导致 ESM 静态解析失败的 SyntaxError。

### 1.5 零虚假绿灯与入口真值守卫 (Zero False-Green & App Boot Guard)
- **杜绝单测全绿但页面白屏**：单测不能仅针对孤立算法跑局部绿灯，必须建立对系统真正入口 `src/main.js` 模块依赖图与 DOM 挂载的端到端解析测试（`tests/app-entry-mount.test.cjs`）。
- **必须通过真实模块解析**：任何代码变动后，`npm test` 必须包含对 ES 模块拓扑的静态解析与入口引导，确保没有未捕获的语法错误、重复声明或找不到的命名导出。

---

## 2. Agent 标准工作流 (Standard 6-Step Workflow)

每次响应用户需求或执行系统更新时，必须严格执行以下六步闭环：

`mermaid
graph TD
    S1["Step 1: 范围界定 & 需求拆解"] --> S2["Step 2: 逆向现实核查 (Fact-Checking)"]
    S2 --> S3["Step 3: 最小面积精准实现 (Atomic Edits)"]
    S3 --> S4["Step 4: 本地全量回归测试 (npm test)"]
    S4 --> S5["Step 5: 子模块与主文档双向同步"]
    S5 --> S6["Step 6: 孤儿文件与代码债审查"]
`

### Step 1: 范围界定与需求拆解 (Scope & Intent)
1. 明确本次任务属于：**缺陷修复**、**工程重构**、**文档建设** 还是 **功能演进**。
2. 在规划阶段，必须清点所有涉及的文件列表，明确区分生产代码（src/）、测试用例（tests/）、文档（docs/）与归档资产（archive/）。

### Step 2: 逆向现实核查与规范先行 (Reverse Reality Check & Spec First)
在动任何代码或写任何文档之前，必须先审查已有设计文档与代码现状：
1. **查阅现有规范与架构文档**：修改前必须阅读 `docs/00_architecture/ARCHITECTURE_OVERVIEW.md` 及对应子模块的 `ARCHITECTURE.md`，明确模块是 UMD 还是 ESM，杜绝凭空想象。
2. **核对字段名与类型契约**：通过全局搜索确认参数键名（如到底是 role 还是 type，到底是 crossHatch 还是 cross）。
3. **核对运行时环境约束**：
   - 核心纯算法（`src/core/`）必须保持 UMD / Isomorphic 规范，严禁直接依赖浏览器 DOM（window, document）。
   - 前端应用层（`src/main.js`, `src/ui/controllers/`）采用原生 ES Modules (`type="module"`)。
   - 测试环境使用 Node.js 原生 Test Runner (`node:test` + `node:assert/strict`)。

### Step 3: 最小侵入实现与词法审查 (Atomic Edits & Scope Hygiene)
1. 遵循单一职责，不引入无关改动。
2. **词法作用域零重名审查**：严禁在同一作用域或多块修改中重复声明同名变量（如重复 `const srcW`）；修改代码后必须进行模块静态编译校验。
3. 保持代码格式整洁，禁止在生产代码中制造混淆压缩行（长行应自然展开）。
4. 发现代码逻辑与文档冲突时，以**让代码正确运行且具备真实入口测试覆盖**为首要准则。

### Step 4: 本地全量回归与入口真值冒烟 (Full Regression & Boot Verification)
1. 每次文件改动后，必须在终端执行 `npm test`。
2. **双重通过标准**：
   - 算法与业务用例 100% PASS，无未捕获异常；
   - **应用入口真值测试通过**：`tests/app-entry-mount.test.cjs` 必须通过，验证 `src/main.js` 依赖拓扑能够被原生 ESM 加载器 100% 成功解析，DOM 正确挂载，无任何静态语法死锁。
3. 任何新增或修改的功能，必须包含针对性的自动化测试覆盖（禁止写假断言、空断言）。

### Step 5: 子模块与全局文档同步 (Synchronized Documentation)
1. **主文档更新**：若涉及全局协议、设计 Token 或全局流程变更，同步更新 docs/ 下对应的规范文件。
2. **子模块文档更新**：若涉及子模块内部变动，同步更新该子模块根目录下的 README.md 及 docs/ 目录中的 ARCHITECTURE.md 与 TESTING.md。

### Step 6: 拓扑整洁度审查 (Orphan & Sanitation Audit)
1. 检查是否存在无引用的孤儿文件（未被 import、require、<script> 引入的 .js 文件，或未被索引的散落 .md 文件）。
2. 若属于历史废弃文件，移入 archive/ 并记录归档原因；若属于临时垃圾文件，彻底删除。
3. 确认 .gitignore 包含临时文件与大型实验资产。

---

## 3. 子模块自包含规范 (Sub-module Self-Containment Standards)

仓库中的每个核心功能子模块，均必须遵循自包含文档结构。

### 3.1 覆盖范围
以下 11 个子模块目录必须具备独立文档：
1. src/core/ (5阶段离散管线核心)
2. src/core/hatching/ (曲面流场与排线子系统)
3. src/core/plate/ (虚拟铜版物理仿真引擎)
4. src/orchestration/ (任务调度、缓存、导出与遥测)
5. src/services/ (AI 网关与服务通信)
6. src/ui/ (前端应用总装层)
7. src/ui/controllers/ (UI 交互业务控制器)
8. src/ui/components/ (独立 UI 组件与网格)
9. src/ui/store/ (应用状态中心)
10. services/informative_drawings/ (Python 线稿抽取服务)
11. services/lotus_geometry/ (Lotus 深度/法线模型管线)

### 3.2 子模块文档结构标准
每个子模块内部必须具备：
`
<submodule_dir>/
├── README.md               # 模块职责、导出 API、依赖上下游、快速上手
└── docs/
    ├── ARCHITECTURE.md     # 内部技术架构、类/函数关系、数据流图、状态流转
    └── TESTING.md          # 针对本模块的测试文件列表、运行方式、用例断言点
`

---

## 4. 严谨文档撰写基准 (Technical Documentation Format)

### 4.1 数据字典与契约编写
- 凡列出对象属性，必须以表格形式列明：字段名、数据类型、默认值、取值范围/枚举、实际源码对应位置 (file:line)。
- 严禁省略或凭空捏造枚举值。

### 4.2 UI 与 Design Token 编写
- Token 颜色值、间距、字体必须与 styles/app.css 中的 :root 声明 100% 字符级对应。
- 必须标明每个 Token 在实际 DOM 结构中的使用场景（如卡片背景、活动边框、禁用状态）。

### 4.3 架构决策记录 (ADR)
- ADR 必须记录**真实的架构妥协与技术债务**，而非纸面构想。
- 若系统因向后兼容保留了全局 UMD 注入或 Node.js vm 上下文测试，必须如实记录其原因与演进路线。
