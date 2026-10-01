# UI State Store (`src/ui/store/`)

> **模块路径**：`src/ui/store/`  
> **技术定位**：Layer 3 状态管理层，实现轻量级单向数据流与界面状态响应。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

1. **状态快照维护**：维护当前激活的工作区模式（`master` 算法母版 vs `plate` 铜版工坊）、版画工艺调优参数字典；
2. **发布-订阅机制**：为界面各控制器提供统一的状态变更监听接口；
3. **环境无关**：状态中心自身不直接读写 DOM，确保能在 Node.js 测试环境下独立运行。

---

## 2. 自动化测试与验证 (Testing & Verification)

针对状态中心的单元测试：
- [`tests/ui.test.cjs`](../../../tests/ui.test.cjs)（状态突变与侦听器通知断言）

运行命令：
```bash
node --test tests/ui.test.cjs
```

---

## 3. 子文档导航 (Sub-documentation Index)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：状态机模型与订阅设计
- [docs/TESTING.md](docs/TESTING.md)：状态测试矩阵
