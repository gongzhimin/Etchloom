---
title: 系统验证策略与端到端测试方案
status: Active
doc-id: TEST-SYS
owner-module: root
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:58:00+08:00
---

# 系统验证策略与端到端测试方案 (TEST-SYS)

## 1. 测试策略

全系统验证采用“正向功能覆盖”与“逆向对抗攻防”双轨驱动模型，测试套件基于 Node.js 原生测试运行器（`node:test` 与 `node:assert/strict`）构建，由 `scripts/test-runner.cjs` 统一调度：

```text
       ▲
      / \     [L4: 桌面与跨平台打包验收] (3 项)
     /   \    - desktop-packaging.test.cjs (Tauri v2、NSIS LZMA、安全标头)
    /-----\
   /       \   [L3: 交互与端到端视图层] (51 项)
  /         \  - ui, ui-button-clicks, two-stage-ui, ui-surfaces, theme-bridge 等 9 个套件
 /-----------\
/             \ [L2: 调度编排与对抗攻防] (20 项)
--------------- - task-scheduler, stage-cache, orchestrator, exporter, adversarial-resilience
[L1: 核心计算、物理网格与算法单元] (87 项)
- five-stage-pipeline, virtual-plate-engine, plate, hatching, photo, refinement, web-ai-client
```

## 2. 真实测试套件清单与分层分布

全系统当前包含 **33 个自动化测试文件，共计 161 项测试用例**，全部通过（100% Pass Rate）：

### 2.1 模块与文件明细分布表

| 分层 / 属主模块 | 测试文件列表 (共 33 个) | 用例数 | 核心验证能力 |
| :--- | :--- | :---: | :--- |
| **系统级对抗与打包** | `adversarial-resilience.test.cjs`<br>`desktop-packaging.test.cjs`<br>`preview-server.test.cjs` | 11 | 对抗攻防向量 (ATK-001~007)、Tauri v2 安全配置、静态资源路由限制 |
| **`core` 领域计算核心** | `five-stage-pipeline.test.cjs`<br>`pipeline-runner.test.cjs`<br>`depth-contour-curvature.test.cjs`<br>`geometry-flow.test.cjs`<br>`hatch-attention.test.cjs`<br>`hatch-facade.test.cjs`<br>`hatching-modular.test.cjs`<br>`high-precision-tone-flow.test.cjs`<br>`universal-hatching.test.cjs`<br>`generator.test.cjs`<br>`photo.test.cjs`<br>`refinement.test.cjs`<br>`plate.test.cjs`<br>`virtual-plate-engine.test.cjs`<br>`pipeline-source-cache.test.cjs`<br>`pipeline-source-race.test.cjs` | 86 | 5 阶段离散解算、Jobard-Lefer 流线排线、曲率配额释放、虚拟铜版 4 工具、2D PDE 酸液咬蚀、pHYs 物理分辨率注入、竞态缓存失效 |
| **`orchestration` 调度中枢** | `task-scheduler.test.cjs`<br>`stage-cache.test.cjs`<br>`orchestrator.test.cjs`<br>`exporter.test.cjs` | 12 | 微任务防抖、`AbortSignal` 抢占中止、DJB2 哈希缓存剪枝、SVG 分层与 CNC G-Code 导出 |
| **`services` 服务网关** | `web-ai-client.test.cjs` | 1 | 硬件能力探测、WebGPU/WASM 兼容性、未启动端口离线纯几何模式自适应降级 |
| **`ui` 交互呈现层** | `ui.test.cjs`<br>`ui-button-clicks.test.cjs`<br>`two-stage-ui.test.cjs`<br>`ui-surfaces.test.cjs`<br>`theme-bridge.test.cjs`<br>`lightbox-vector.test.cjs`<br>`mobile-layout-lightbox.test.cjs`<br>`mobile-touch-sheet.test.cjs`<br>`app-entry-mount.test.cjs` | 51 | 纯无头 Mock DOM 事件派发、两阶段工坊模式流转、4 态酸液状态机、覆写模态拦截、三语零 Emoji、纸面画框视觉分层 |
| **全库汇总** | **33 个测试套件** | **161** | **全部自动化通过，无跳过、无待办、无失败** |

### 2.2 对抗性攻防测试矩阵 (Adversarial Attack Matrix)

| 攻击编号 | 攻击目标与向量 | 对应测试文件 | 预期防御与断言标准 |
| :--- | :--- | :--- | :--- |
| **`ATK-001`** | 畸形载荷与参数投毒 | `tests/adversarial-resilience.test.cjs` | 传入 `NaN`、`+Infinity`、负数坐标或破损 Base64 刻深数据，底层引擎安全拒绝。 |
| **`ATK-002`** | 高频时序竞争与抢占风暴 | `tests/task-scheduler.test.cjs` | 10ms 内连续提交 20 次调度；前序任务立即收到 `aborted: true`，仅最终有效任务落盘。 |
| **`ATK-003`** | 物理守恒与不变量破缺 | `tests/plate.test.cjs` | 在被防蚀漆阻断的区域（`blockedField == 1`）强行执行酸蚀，深度增量恒等于 0。 |
| **`ATK-004`** | 坐标越界与内存炸弹 | `tests/virtual-plate-engine.test.cjs` | 划线坐标传入 $(\pm 999999, \pm 999999)$，自动包围盒裁剪生效，快照栈受控截断至 12 步以内。 |
| **`ATK-005`** | 故障注入与雪崩降级 | `tests/web-ai-client.test.cjs` | 模拟本地 Python AI 服务端口不可达或返回 HTTP 500，平滑降级为离线纯几何模式。 |
| **`ATK-006`** | 状态机非法越权跳转与覆写穿透 | `tests/two-stage-ui.test.cjs` | 铜版产生划痕或涂布防蚀清漆（`blockedField > 0`）后再次上版，触发安全防覆写模态拦截。 |
| **`ATK-007`** | 异构坐标点与数值毒化攻击 | `tests/adversarial-resilience.test.cjs` | 输入 `{x, y}` 结构体点或传入极端坐标，几何提取器解构防护截断，输出绝对杜绝 `NaN` 毒化。 |

## 3. 测试命令与环境

```powershell
# 运行全系统全部 33 个自动化测试套件 (161 项)
npm test

# 直接调用原生测试运行器
node scripts/test-runner.cjs
```

## 4. 缺陷审计与对抗性防御台账 (Defect Ledger)

| 缺陷编号 | 严重度 | 缺陷表现与攻击向量 | 根因分析 | 修复落实与代码定位 | 回归测试断言依据 |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`DEF-BUG-001`** | 中 | 高频渲染循环无条件硬编码覆盖多语言 | 动画循环中硬编码写入了中文文本。 | `src/ui/controllers/plate-studio-controller.js` 接入 `i18n.t('status.etching')`。 | `tests/two-stage-ui.test.cjs` |
| **`DEF-BUG-002`** | 高 | 切换铜版精度遗漏酸液时钟状态机重置 | `allocatePlate()` 仅分配新内存，未对时钟状态复位。 | 重置所有时钟与状态变量，联动 `updateAcidGauge()`。 | `tests/adversarial-resilience.test.cjs` |
| **`DEF-BUG-003`** | 严重 | 防覆写安全守卫漏判防腐清漆 (Stop-out) | 仅检查了 `depth`, `burr`, `exposed`，漏判 `blocked`。 | 判定条件加入 `blocked[i] > 0`。 | `tests/adversarial-resilience.test.cjs` |
| **`DEF-BUG-004`** | 中 | 撤销栈脱节与数组引用浅拷贝泄漏 | `snapshot()` 未录入 `etchState`；未深拷贝恢复。 | 快照捕获 `etchState`，还原时深拷贝并联动仪表盘。 | `tests/plate.test.cjs` |
| **`DEF-BUG-005`** | 严重 | Stage 4 排线宽度计算因点格式不兼容引发 NaN 毒化 | 强行假定点结构为数组 `[x, y]`，遇到 `{x, y}` 产生 NaN。 | 统一提取 `(mid[0] ?? mid.x)`，加 `Number.isFinite`。 | `tests/adversarial-resilience.test.cjs` |
| **`DEF-BUG-006`** | 中 | 酸液模拟积分累加器 `acc` 作用域脱节与脉冲泄漏 | 循环私有局部 `acc` 未与控制器 `etchAcc` 联动。 | 废除局部 `acc`，全模块统一绑定导出的 `etchAcc`。 | `tests/adversarial-resilience.test.cjs` |
| **`DEF-BUG-007`** | 严重 | 物理仿真器与工坊控制器酸液反应速率存在 2.5 倍标定偏差 | `acid-simulator.js` 缺失物理定标因子 `0.4`，导致酸液咬蚀深度为真实物理标定的 2.5 倍。 | `src/core/plate/physics/acid-simulator.js` 注入 `reactionDt = dt * 0.4`，统一物理规律。 | `tests/virtual-plate-engine.test.cjs` |
| **`DEF-BUG-008`** | 高 | Stage 1 直调推断硬编码特定开发机绝对路径与工作区写入 | 硬编码个人开发环境路径，在无环境机器上同步报错并污染项目树。 | 采用 `os.tmpdir()` 隔离沙箱，动态兼容系统 Python 解释器与环境变量。 | `tests/core-pipeline.test.cjs` |
| **`DEF-BUG-009`** | 中 | 工业 SVG 导出器缺失非有限数值过滤与空点防护 | 异构或非法输入导致 `exportSVG` 生成非法 XML `NaN` 坐标或抛出异常。 | `src/orchestration/export/exporter.js` 增加 `Number.isFinite` 坐标屏障与有效点过滤。 | `tests/exporter.test.cjs` |
