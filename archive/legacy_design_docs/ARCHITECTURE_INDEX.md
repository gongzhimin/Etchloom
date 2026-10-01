# Etchloom v2 内部开发与设计文档索引 (Internal Architecture & Design Index)

> **声明**：本索引文档仅供内部架构设计与开发实施查阅。面向 GitHub 用户的产品说明书请参见项目根目录的 [`README.md`](../README.md) 与 [`README.zh-CN.md`](../README.zh-CN.md)。

本项目遵循**顶层架构牵引、模块绝对解耦、契约明确定义、极简无冗余设计 (KISS)**的工程原则。整个系统的架构文档分为顶层总览、四大核心模块详细设计文档、跨模块规范及工程实施路线图：

---

## 架构与设计文档清单 (Architecture & Design Suite)

| 文档类型 | 文档标题 | 核心内容 | 文档链接 |
| :--- | :--- | :--- | :--- |
| **顶层架构** | **顶层架构设计规范**<br/>*(High-Level Architecture)* | 产品定位、古典版画质感表现、四大核心模块划分、无环流水线框架图、全局质量底线 | [📘 TOP_LEVEL_ARCHITECTURE_DESIGN.md](./TOP_LEVEL_ARCHITECTURE_DESIGN.md) |
| **一致性规范** | **跨模块一致性规范与交叉评审报告**<br/>*(Consistency Spec)* | Step 0~6 动线统一映射、RecipeState 22项参数单一事实源、Action/Event 通信矩阵、零 DOM 隔离 | [📋 CROSS_MODULE_CONSISTENCY_SPEC.md](./CROSS_MODULE_CONSISTENCY_SPEC.md) |
| **M1 表现层** | **UI 交互与视口详细设计**<br/>*(UI Engine & i18n)* | 莫兰迪暗调工坊美学、ASCII 布局线框图、步骤流网格与局部放大镜、中英双语国际化 (zh/en)、AppStore 状态机 | [🎨 MODULE_DESIGN_M1_UI.md](./MODULE_DESIGN_M1_UI.md) |
| **M2 算法层** | **核心算法管线详细设计**<br/>*(Algorithmic Pipeline)* | Stage 1~5 空间几何感知与矢量母版生成、纯无状态数据运算、PipelineRunner 增量执行驱动 | [⚙️ MODULE_DESIGN_M2_PIPELINE.md](./MODULE_DESIGN_M2_PIPELINE.md) |
| **M3 仿真层** | **虚拟铜版仿真详细设计**<br/>*(Virtual Plate Studio)* | 刻针/干刻/防蚀漆/刮磨器、偏微分双向动态微扩散酸蚀、凹版留墨流变、纯棉纸 Bevel 倒角凹印 | [🔨 MODULE_DESIGN_M3_PLATE_STUDIO.md](./MODULE_DESIGN_M3_PLATE_STUDIO.md) |
| **M4 中枢层** | **调度编排与可观测详细设计**<br/>*(Orchestrator & Observability)* | 阶段级增量缓存池 (StageCache)、原生 AbortController 抢占中断与防抖、全格式工业导出、度量流 | [🚦 MODULE_DESIGN_M4_ORCHESTRATOR.md](./MODULE_DESIGN_M4_ORCHESTRATOR.md) |
| **工程实施** | **系统工程实施与重构路线图**<br/>*(Implementation Roadmap)* | 分阶段落地计划 (Phase 1~6)、任务清单、测试矩阵、零破坏性回归保障 | [🚀 IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) |

---

## 模块通信与契约关系图 (Contract Architecture)

```mermaid
flowchart TD
    classDef m1Style fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e3a8a;
    classDef m4Style fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d;
    classDef m2Style fill:#fffbeb,stroke:#d97706,stroke-width:2px,color:#78350f;
    classDef m3Style fill:#fdf2f8,stroke:#db2777,stroke-width:2px,color:#831843;
    classDef outStyle fill:#f8fafc,stroke:#475569,stroke-width:2px,color:#0f172a;

    M1["<b>M1: UI 交互与视口模块 (UI Engine)</b><br/>• Step 0~6 自适应折行步骤流网格<br/>• 中英双语 (zh/en) 与 AppStore 状态机"]:::m1Style
    
    M4["<b>M4: 调度编排与可观测模块 (Orchestrator)</b><br/>• 阶段级增量缓存池 (Stage Cache)<br/>• 抢占中断 (AbortController) + 多格式导出"]:::m4Style
    
    M2["<b>M2: 核心算法管线模块 (Algorithmic Pipeline)</b><br/>• Stage 1~5 空间几何感知与矢量母版生成<br/>• 纯无状态数据计算，零 DOM 依赖"]:::m2Style
    
    M3["<b>M3: 虚拟铜版仿真模块 (Virtual Plate Studio)</b><br/>• 雕版刻削、酸蚀咬深、留墨流变、棉纸倒角<br/>• 物理离散标量场演进"]:::m3Style
    
    OUT["<b>呈现与交付 (Delivery & Viewport)</b><br/>• 步骤流视口实时并列投影<br/>• 工业母版 SVG / G-Code / 印样交付"]:::outStyle

    M1 ==>|"1. 派发工艺配方动作 (Action)"| M4
    M4 ==>|"2. 增量拓扑调度 (Partial Execute)"| M2
    M2 ==>|"3. 交付母版矢量路径 (Transfer to Plate)"| M3
    M3 ==>|"4. 交付刻深场与凹印印样位图"| OUT
```
