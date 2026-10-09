# 排线与流场子系统内部架构设计规范 (ARCHITECTURE.md)

> **模块定位**：`src/core/hatching/`  
> **上级体系规范**：[docs/design/ARCHITECTURE.md](../../../../docs/design/ARCHITECTURE.md)

---

## 1. 15 个细分排线模块三层拓扑分工

```mermaid
graph TD
    subgraph LayerFields["1. 流场与张量计算层 (Fields & Tensors)"]
        F1["hatch-field.js (拓扑交叉场)"]
        F2["hatch-geometry-flow.js (Lotus 3D 表面法线等高切线)"]
        F3["hatch-manhattan-flow.js (刚性立面曼哈顿轴向吸附)"]
        F4["hatch-volume.js (宏观体积引导场)"]
    end

    subgraph LayerRules["2. 门控规则与自适应约束层 (Rules & Gates)"]
        R1["hatch-attention.js (线稿空间自抑制)"]
        R2["hatch-ink-budget.js (墨量守恒与曲率门控)"]
        R3["hatch-coherence-gate.js (相干度门控)"]
        R4["hatch-facade-rules.js (平整立面检测与留白)"]
        R5["hatch-focus-protection.js (主体对焦保护)"]
        R6["hatch-material-rules.js (食材/瓷器材质规则)"]
    end

    subgraph LayerCurves["3. 流线积分与路径优化层 (Curves & Integrators)"]
        C1["hatch-distance.js (精确欧氏距离场 SDF)"]
        C2["hatch-streamline.js (Jobard-Lefer 双向 RK2 流线积分)"]
        C3["hatch-optimizer.js (贪心最近邻蛇形走刀优化)"]
        C4["hatch-tone.js (色调阶跃与拐点抑制)"]
        C5["hatch-background.js (暗角背景呼吸场)"]
    end

    LayerFields --> LayerRules
    LayerRules --> LayerCurves
```

---

## 2. 数据处理管道流动

1. **输入阶段**：接收 `ToneField`（色调场）、`LineMap`（线描图）与 `NormalMap`（Lotus 表面法线）；
2. **第一阶段 (流场生成)**：`HatchGeometryFlow` 或 `HatchField` 输出切线场 $\vec{v}(x, y)$；
3. **第二阶段 (门控过滤)**：`HatchAttention` 注入自抑制势场，`HatchInkBudget` 计算可用墨量配额；
4. **第三阶段 (积分与优化)**：`HatchStreamline` 发射种子点追踪流线，`HatchOptimizer` 串联路径并输出矢量笔画集合。
