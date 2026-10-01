# 5 阶段算法管线内部架构与状态时序规范 (ARCHITECTURE.md)

> **模块定位**：`src/core/`  
> **上级体系规范**：[docs/00_architecture/ARCHITECTURE_OVERVIEW.md](../../../docs/00_architecture/ARCHITECTURE_OVERVIEW.md)

---

## 1. 架构拓扑与组件关系

```mermaid
graph TD
    Runner["PipelineRunner 总执行器"]
    S1["Stage1Informative (线描抽取)"]
    S2["Stage2ToneFlow (导向滤波色调场)"]
    S3["Stage3Contours (骨干轮廓与空气透视)"]
    S4["Stage4Hatching (曲面排线总装)"]
    S5["Stage5MasterPrint (母版矢量合成)"]
    HatchingSub["src/core/hatching/ (15个排线模块)"]
    Gateway["src/services/ai-service-gateway.js"]
    Cache["src/orchestration/stage-cache.js"]

    Runner --> Cache
    Runner --> S1 --> Gateway
    Runner --> S2
    Runner --> S3
    Runner --> S4 --> HatchingSub
    Runner --> S5
```

---

## 2. 执行时序与增量复用时序图

```mermaid
sequenceDiagram
    autonumber
    participant UI as PipelineController
    participant PR as PipelineRunner
    participant Cache as StageCache
    participant S1 as Stage 1
    participant S2 as Stage 2
    participant S3 as Stage 3
    participant S4 as Stage 4
    participant S5 as Stage 5

    UI->>PR: run(recipe, { cache, signal })
    PR->>Cache: resolveInvalidation(recipe)
    alt 前置阶段命中缓存
        Cache-->>PR: Stage 1~3 有效，从 Stage 4 失效
        PR->>S4: 执行曲面几何排线 (读取 S2, S3 缓存)
    else 全量失效
        Cache-->>PR: 全部失效
        PR->>S1: 执行线描感知
        PR->>S2: 执行色调场与等高流场
        PR->>S3: 执行空气透视轮廓提取
        PR->>S4: 执行曲面排线
    end
    PR->>S5: 矢量分层整合与深度映射
    S5-->>UI: 返回完整 MasterResult
```
