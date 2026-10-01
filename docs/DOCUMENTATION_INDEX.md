# Etchloom 全景工程技术文档索引 (Master Documentation Index)

> **工程版本**：Etchloom Atelier Engine  
> **更新时间**：2026-10-01

---

## 1. 全局工程技术规范索引

```
docs/
├── DOCUMENTATION_SPECIFICATION.md       # 工程文档与 README 编写规范指南 (12大主章节/8大子章节)
├── 00_architecture/                     # 系统全局架构与状态模型
│   ├── ARCHITECTURE_OVERVIEW.md         # 5层架构分层模型、数据流向与边界
│   ├── EVENT_FLOW_STATE_MACHINE.md      # 全局工作流与卡片状态机转移
│   └── DECISION_RECORDS/                # 关键架构决策记录 (ADR)
│       ├── ADR-001-pure-domain-zero-dom.md       # 纯域算法解耦与测试同构规范
│       └── ADR-002-typedarray-plate-buffers.md   # TypedArray 物理内存与序列化
├── 01_code_spec/                        # 代码编写规约与类型契约
│   ├── CODE_STYLE_AND_CONVENTIONS.md    # 命名规约、同构封装与防御检查
│   └── JSDOC_TYPED_CONTRACT_SPEC.md     # JSDoc 类型契约规范与注释基准
├── 02_doc_standards/                    # 文档工程规范与类型模板
│   ├── DOCUMENTATION_STANDARDS.md       # 零虚构、零营销、双向同步标准
│   ├── SPEC_ALGORITHM_DOC_STANDARD.md   # 算法原理文档书写工程规范 (8大必备要素)
│   ├── SPEC_INTERFACE_DOC_STANDARD.md   # 模块接口设计与契约书写规范 (7大规范维度)
│   ├── SPEC_TESTING_DOC_STANDARD.md     # 算法测试与 QA 文档书写规范 (5大必备要素)
│   └── SPEC_ARCHITECTURE_DOC_STANDARD.md # 架构设计文档书写工程规范 (4大核心维度)
├── 03_testing_qa/                       # 自动化测试与质量保证
│   ├── TEST_SPECIFICATION.md            # 4级测试金字塔与执行规范
│   ├── TEST_MATRIX_AND_FIXTURES.md      # 20个测试套件矩阵与基准样本
│   └── PERCEPTUAL_DIFF_TOLERANCE.md     # 数值确定性容差与规划基准
├── 04_ui_design_system/                 # 界面设计系统
│   ├── DESIGN_TOKENS.md                 # 真实 CSS 变量对照字典 (1:1 提取)
│   ├── COMPONENT_SPECIFICATIONS.md      # 步骤网格、放大镜与模态框组件
│   └── INTERACTION_AND_A11Y_SPEC.md     # 鼠标与快捷键交互规范
└── 05_data_dictionary/                  # 数据字典与接口协议
    ├── RECIPE_SCHEMA.md                 # 算法母版配方 JSON 结构字典
    ├── VECTOR_GEOMETRY_SCHEMA.md        # 矢量刻线几何结构与 role 枚举
    ├── PLATE_BUFFER_LAYOUT.md           # 铜版一维物理网格内存平铺规范
    └── SERVICE_API_CONTRACT.md          # Python 神经网络服务通信协议
```

---

## 2. 子模块自包含文档导航

除全局规范外，系统核心子目录均自包含独立文档（`README.md` 与 `docs/`）：

| 子模块路径 | 模块性质 | 内部文档入口 |
| :--- | :--- | :--- |
| `src/core/` | 5阶段离散管线核心（纯计算） | [src/core/README.md](../src/core/README.md) |
| `src/core/hatching/` | 曲面流场与排线子系统（15模块） | [src/core/hatching/README.md](../src/core/hatching/README.md) |
| `src/core/plate/` | 虚拟铜版物理仿真引擎 | [src/core/plate/README.md](../src/core/plate/README.md) |
| `src/orchestration/` | 任务调度、增量缓存与导出 | [src/orchestration/README.md](../src/orchestration/README.md) |
| `src/services/` | AI 辅助服务客户端网关 | [src/services/README.md](../src/services/README.md) |
| `src/ui/` | 前端界面总装与布局挂载 | [src/ui/README.md](../src/ui/README.md) |
| `src/ui/controllers/` | 界面业务 ESM 控制器 | [src/ui/controllers/README.md](../src/ui/controllers/README.md) |
| `src/ui/components/` | 独立 UI 组件（网格与放大镜） | [src/ui/components/README.md](../src/ui/components/README.md) |
| `src/ui/store/` | 前端应用状态中心 | [src/ui/store/README.md](../src/ui/store/README.md) |
| `src/ui/templates/` | 模块化界面布局装配模板 | [src/ui/templates/README.md](../src/ui/templates/README.md) |
| `src/ui/i18n/` | 国际化双语字典管理器 | [src/ui/i18n/README.md](../src/ui/i18n/README.md) |
| `services/informative_drawings/` | Python 线稿抽取推理微服务 | [services/informative_drawings/README.md](../services/informative_drawings/README.md) |
| `services/lotus_geometry/` | Lotus 深度/法线模型推理管线 | [services/lotus_geometry/README.md](../services/lotus_geometry/README.md) |
