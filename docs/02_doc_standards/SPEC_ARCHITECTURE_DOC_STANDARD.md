# 架构设计文档书写工程规范 (SPEC_ARCHITECTURE_DOC_STANDARD.md)

> **适用范围**：存放在各模块下的 `docs/ARCHITECTURE.md` 以及全局 `docs/00_architecture/`。  
> **核心验收标准**：**“严密呈现内部组件调用拓扑、数据流向时序与状态生命周期，消灭泛泛空谈”**。

---

## 1. 架构文档必须包含的 4 大核心维度

```markdown
# [模块名称] 内部架构与系统设计 (ARCHITECTURE.md)

## 1. 模块定位与依赖倒置原则 (Module Boundary & Dependency Rules)
- 说明本模块在全局分层模型中的层级；
- 说明本模块的依赖上下游，严禁出现向上逆向依赖（如算法底层严禁依赖 UI 控制器）。

## 2. 内部组件调用拓扑图 (Internal Component Topology)
- 必须包含标准 Mermaid 拓扑图，清晰标出模块内部各个类与函数之间的数据依赖与调用路径。

## 3. 数据流向与执行时序图 (Data Flow & Sequence Diagram)
- 必须包含 Mermaid 序列图 (Sequence Diagram)，呈现一次典型计算任务从请求发起、参数解析、中间状态缓冲到最终产物输出的完整时间轴时序。

## 4. 状态生命周期与内存管理 (State Lifecycle & Memory Management)
- 详细说明内部状态的生命周期（初始化、分配、迭代、快照撤销、销毁重置）；
- 说明内存管理机制（如 TypedArray 预分配与双缓冲交换，杜绝 GC 停顿）。
```
