# 虚拟铜版仿真引擎内部架构与数据流设计 (ARCHITECTURE.md)

> **模块定位**：`src/core/plate/`  
> **上级体系规范**：[docs/00_architecture/ARCHITECTURE_OVERVIEW.md](../../../../docs/00_architecture/ARCHITECTURE_OVERVIEW.md)

---

## 1. 模块定位与依赖倒置原则

虚拟铜版物理引擎是系统的底层物理模型核心：
- **向上暴露纯数据操作接口**：接收工具坐标、压力、时间步长 $\Delta t$；
- **向下严格杜绝浏览器 DOM 依赖**：全流程操作平铺一维 `Float32Array` 与 `Uint8Array`，可在无头 Node.js 与 Web Worker 中独立运行；
- **零逆向依赖**：严禁引用任何 UI 控制器或展示层对象。

---

## 2. 内部组件调用拓扑图 (Internal Component Topology)

```mermaid
graph TD
    subgraph EngineCore["VirtualPlateEngine 核心"]
        VPE["VirtualPlateEngine 主类"]
        Mem["一维平铺连续内存网格 (depth, exposed, burr, blocked)"]
        Snap["UndoStack 快照栈 (双缓冲切片深拷贝)"]
    end

    subgraph Tools["4 大正交刻线修版工具"]
        Needle["刻针 (needle): 刮开底漆暴露金属"]
        Dry["干刻针 (dry): 犁开金属 + Halo 外翻毛刺"]
        Stop["防蚀漆 (stop): 覆盖掩膜钝化阻断"]
        Polish["刮磨器 (polish): 压平毛刺 + 刮浅刻深"]
    end

    subgraph PhysicsSim["连续介质物理与化学仿真"]
        Acid["AcidSimulator.simulateAcidBite (2D PDE 各向同性侧蚀扩散)"]
        Press["PressRenderer.renderPressPrint (纯位图无 DOM 凹版压印)"]
    end

    subgraph Persistence["数据持久化"]
        Codec["PlateCodec (连续内存与 Base64 无损互转)"]
    end

    VPE --> Mem & Snap
    VPE --> Tools
    Tools --> Needle & Dry & Stop & Polish
    VPE --> Acid --> Mem
    VPE --> Press
    VPE --> Codec
```

---

## 3. 数据流向与执行时序图 (Execution Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户交互 / 算法上版
    participant Ctrl as PlateStudioController
    participant VPE as VirtualPlateEngine
    participant Acid as AcidSimulator
    participant Press as PressRenderer

    User->>Ctrl: 点击工具划线 / 开启酸蚀
    Ctrl->>VPE: applyToolLine(a, b, 'dry', size)
    Note over VPE: 1. 压入 Undo 快照<br/>2. 计算包围盒与欧氏距离核<br/>3. 并行更新 exposed 与 burr 连续内存
    User->>Ctrl: 点击 [开始腐蚀]
    loop 动画定时器每帧 (dt = 0.08s)
        Ctrl->>VPE: stepAcid(dt, strength, grain)
        VPE->>Acid: simulateAcidBite(plate, dt, strength, grain)
        Note over Acid: 数值解算 4-邻域侧向咬蚀与纵向深化 PDE
        Acid-->>VPE: 返回单步平均刻深增量
        VPE-->>Ctrl: 触发刻深读数与仪表盘刷新
    end
    User->>Ctrl: 点击 [取一张印样]
    Ctrl->>VPE: renderPressPrint(options)
    VPE->>Press: 纯数学解算纸张纤维凹痕与毛细渗墨
    Press-->>Ctrl: 返回离散 RGBA 像素矩阵并上屏
```

---

## 4. 连续内存生命周期与垃圾回收优化

1. **零 GC 垃圾回收停顿保证**：
   - 在 `allocatePlate(w, h)` 时一次性分配全部连续数组，严禁在 `applyToolDab` 或 `stepAcid` 循环内创建任何临时对象或数组；
   - `AcidSimulator` 采用预分配的双缓冲 `nextExposedField`，通过指针与 `set()` 批量拷贝，保证在 60fps 高频交互下内存曲线完全水平。
2. **快照内存控制**：
   - 撤销栈深度严格限制为 10 步，采用环形队列丢弃最旧快照，防止内存无节制增长。
