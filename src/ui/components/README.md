# Reusable UI Components (`src/ui/components/`)

> **模块路径**：`src/ui/components/`  
> **技术定位**：Layer 4 展现层独立原子组件库，承载步骤流卡片网格与局部物理像素微距放大镜。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

1. **步骤流自适应网格 (`StepFlowGrid`)**：呈现 7 阶段步骤卡片（Step 0 原图到 Step 6 凹版印样），提供真实毫秒耗时 Badge、局部预览画布挂载与全屏特写回调；
   计算完成态在卡片上仅显示 `✓`；对应语言的状态文字保留在徽章的 `aria-label` 中。
2. **局部物理像素放大镜 (`LoupeMagnifier`)**：按住 `Alt` 键在铜版或步骤流画布上悬停时触发，以 4 倍放大率实时呈现 160px 圆形物理像素微刻痕。

---

## 2. 内部架构与组件拓扑 (Component Map)

| 源码文件名 | 核心类 / 导出对象 | 功能定位 |
| :--- | :--- | :--- |
| `step-flow-grid.js` | `StepFlowGrid` | 7 步骤流程网格控制器，管理阶段状态、耗时与预览挂载 |
| `loupe.js` | `LoupeMagnifier` | 基于 Alt 键悬停的 160px 圆形 4 倍物理像素微距放大镜 |

---

## 3. 自动化测试与验证 (Testing & Verification)

针对原子组件的交互与点击测试：
- [`tests/ui-button-clicks.test.cjs`](../../../tests/ui-button-clicks.test.cjs)（涵盖网格卡片点击、全屏按钮、放大镜绑定）

运行命令：
```bash
node --test tests/ui-button-clicks.test.cjs
```

---

## 4. 子文档导航 (Sub-documentation Index)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：组件生命周期与挂载协议
- [docs/TESTING.md](docs/TESTING.md)：组件测试断言点
