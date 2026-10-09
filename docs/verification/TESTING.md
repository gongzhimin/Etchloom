# 系统验证策略与端到端测试方案 (TESTING)

> **文档标识**：VER-SYS-STRATEGY  
> **上级依据**：[docs/requirements/REQUIREMENTS.md](../requirements/REQUIREMENTS.md) 与 [docs/standards/TEST_RULES.md](../standards/TEST_RULES.md)  
> **核心哲学**：攻击视角 (Attacker's Mindset)、双轨验证（覆盖性测试 + 对抗性测试）  
> **验收基线**：自动化测试套件必须保持 100% 通过  

---

## 1. 系统测试策略与双轨验证体系

系统验证采用“覆盖性测试（正向防御）”与“对抗性测试（反向攻击破坏）”双轨驱动模型：

```text
       ▲
      / \     [L4: 桌面与跨平台打包验收] (desktop-packaging.test.cjs)
     /   \    - NSIS LZMA 压缩、Tauri v2 headers 安全结构、多架构产物
    /-----\
   /       \   [L3: 界面与端到端交互验证] (two-stage-ui, ui-button-clicks)
  /         \  - 两阶段工作流切换、三语无 Emoji 覆盖、重置腐蚀闭环
 /-----------\
/             \ [L2: 跨模块集成与对抗攻防] (adversarial-resilience, pipeline-runner, orchestrator)
--------------- - 抢占风暴、畸形投毒、物理不变量破缺、故障注入与降级
[L1: 物理与算法基础单元] (virtual-plate-engine, hatching, photo)
- 掩膜阻断守恒、PDE 刻深单调性、微分流线积分
```

---

## 2. 覆盖性测试场景矩阵 (Coverage Testing Matrix)

| 用例编号 | 业务场景与被测目标 | 覆盖维度与前置条件 | 验收断言条件 |
| :--- | :--- | :--- | :--- |
| **`COV-PIPE-001`** | 5 阶段管线全生命周期 | 从 Stage 1 执行至 Stage 5，覆盖所有中间产物。 | 生成完整的 MasterResult，各阶段产物完整且可被独立导出。 |
| **`COV-ACID-002`** | 酸液物理腐蚀刻槽加深与仪表盘联动 | 进入 Stage 3，调用 `toggleEtch()` 运行 $2.5\,\text{s}$。 | 深度读数 $> 0\,\mu\text{m}$，读数匹配时间演化，进度条宽度递增。 |
| **`COV-RESET-003`** | 发生过咬蚀时一键【重新腐蚀】闭环 | 腐蚀运行 $15.2\,\text{s}$ 进入深蚀，点击 `resetEtchBtn`。 | 1. 引擎即刻停止；<br>2. 深度严格归零；<br>3. 累计时间归零；<br>4. 腐蚀程度复位为“待开始”；<br>5. 重新腐蚀按钮置灰。 |
| **`COV-I18N-004`** | 三语字典完整性与零 Emoji 约束 | 遍历 `zh-CN`, `en-US`, `vi-VN` 对应所有核心 CTA 与状态键。 | 所有词条翻译存在且非空，无任何未翻译 Raw Key，零 Emoji 字符。 |
| **`COV-PKG-005`** | 桌面端打包配置与安全响应头合法性 | 解析 `src-tauri/tauri.conf.json` 配置架构。 | 自定义 COOP/COEP 隔离标头严格归属于 `app.security.headers`，符合 Tauri v2 规范。 |

---

## 3. 对抗性攻防测试矩阵 (Adversarial Attack Matrix)

站在红军破坏者视角，专门设计破坏性用例攻击系统，验证系统的韧性与边界：

| 攻击编号 | 攻击目标与向量 | 攻击手段与构造用例 | 预期防御与断言标准 |
| :--- | :--- | :--- | :--- |
| **`ATK-001`** | 畸形载荷与参数投毒 | 传入 `NaN`、`+Infinity`、负数坐标或破损 Base64 刻深数据。 | 底层引擎与编解码器安全拒绝（抛出带有标识的受控错误），内部物理场不产生 NaN 污染。 |
| **`ATK-002`** | 高频时序竞争与抢占风暴 | 10ms 内连续提交 50 次调度；在计算即将完成瞬间触发中止。 | 前序任务立即收到 `aborted: true`，无异步竞态死锁，无内存泄漏，仅最终有效任务落盘。 |
| **`ATK-003`** | 物理守恒与不变量破缺 | 在被防蚀漆阻断的区域（`blockedField == 1`）强行执行酸蚀。 | 深度增量恒等于 0（防蚀漆绝对阻断）；长期腐蚀深度严格收敛于 $[0.0, 1.0]$，绝不上溢。 |
| **`ATK-004`** | 坐标越界与内存炸弹 | 划线坐标传入 $(\pm 999999, \pm 999999)$；连续压栈 100 次快照。 | 自动包围盒裁剪生效，一维连续内存寻址零越界，快照栈受控截断至 12 步以内，绝不 OOM。 |
| **`ATK-005`** | 故障注入与雪崩降级 | 模拟本地 Python AI 服务端口不可达或返回 HTTP 500。 | 前端网关零崩溃，平滑静默降级为 `offline-analytical` 离线纯几何模式，页面渲染不白屏。 |
| **`ATK-006`** | 状态机非法越权跳转与覆写穿透 | 铜版产生划线、干刻痕或涂布防蚀清漆（`blockedField > 0`）后，尝试未经确认重新上版；或切换分辨率后时钟残留。 | 1. 触发安全防覆写模态拦截，提供备份或取消选项；<br>2. 重新分版（`allocatePlate`）强制重置酸液状态机与计时器归零，杜绝假阳性拦截。 |
| **`ATK-007`** | 异构坐标点与数值毒化攻击 | 输入 `{x, y}` 结构体点或传入极端坐标，诱发连续采样除零或未定义取值。 | 几何提取器安全解构 `(mid[0] ?? mid.x)`，通过 `Number.isFinite` 屏障截断，矢量线宽与 SVG 输出绝对杜绝 `NaN` 毒化。 |

---

## 4. 测试执行与持续集成命令

```bash
# 执行全量自动化测试套件
npm test

# 执行特定领域与对抗性验证测试
node tests/adversarial-resilience.test.cjs # 专项对抗性攻防测试 (覆盖 ATK-001 ~ ATK-007)
node tests/virtual-plate-engine.test.cjs     # 虚拟铜版物理引擎
node tests/two-stage-ui.test.cjs              # 两阶段工作流与状态机
node tests/desktop-packaging.test.cjs         # 桌面端打包配置测试
```

---

## 5. 缺陷审计与对抗性防御台账 (Defect & Resilience Ledger)

针对全链路排查中捕获的隐蔽 Bug，建立严格的溯源、根因、修复与回归验证记录：

| 缺陷编号 | 严重度 | 缺陷表现与攻击向量 | 根因分析 | 修复落实与代码定位 | 回归测试断言依据 |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`DEF-BUG-001`** | 中 | **高频渲染循环无条件硬编码覆盖多语言**<br>非中文环境下运行酸液，每 16ms 界面被强刷回中文。 | `frame(t)` 动画循环中硬编码写入了中文文本，未调用国际化系统。 | [plate-studio-controller.js](../../src/ui/controllers/plate-studio-controller.js#L1153)<br>接入 `i18n.t('status.etching')` 动态解析。 | `tests/two-stage-ui.test.cjs`<br>断言三语状态同步，零硬编码中文残留。 |
| **`DEF-BUG-002`** | 高 | **切换铜版精度遗漏酸液时钟状态机重置**<br>在 1500px 与 3000px 切换重新分配铜版时，旧版咬蚀秒数与状态机泄漏至空白新版。 | `allocatePlate()` 仅分配新 TypedArray 内存，未对 `running`, `elapsed`, `etchState`, `etchAcc` 执行归零复位。 | [plate-studio-controller.js](../../src/ui/controllers/plate-studio-controller.js#L140)<br>重置所有时钟与状态变量，并联动 `updateAcidGauge()`。 | `tests/adversarial-resilience.test.cjs`<br>断言 `clear()` / `allocatePlate()` 后 `elapsed` 必为 0。 |
| **`DEF-BUG-003`** | **严重** | **防覆写安全守卫漏判防腐清漆 (Stop-out Varnish)**<br>用户涂布防腐漆保护高光后，重新上版直接静默覆盖，用户成果灭失。 | `hasPlateModifications()` 仅检查了 `depth`, `burr`, `exposed`，遗漏了阻断漆缓冲层 `blocked[i] > 0`。 | [plate-studio-controller.js](../../src/ui/controllers/plate-studio-controller.js#L1175)<br>判定条件加入 `blocked[i] > 0`。 | `tests/adversarial-resilience.test.cjs#ATTACK-006`<br>断言涂布清漆后 `hasPlateModifications` 必返回 `true`。 |
| **`DEF-BUG-004`** | 中 | **撤销栈脱节与数组引用浅拷贝泄漏**<br>Undo 撤销至 0 秒后，状态徽标与试印按钮未同步复位为待开始；数组存在直接赋值风险。 | `snapshot()` 未录入 `etchState`；`undo` 处理器未调用状态机同步函数；恢复时未全量 `.slice()`。 | [plate-studio-controller.js](../../src/ui/controllers/plate-studio-controller.js#L960)<br>快照捕获 `etchState`，还原时深拷贝并触发 `updateAcidGauge` 与按钮同步。 | `tests/plate.test.cjs`<br>`tests/adversarial-resilience.test.cjs`<br>断言撤销后状态完全对称。 |
| **`DEF-BUG-005`** | **严重** | **Stage 4 排线宽度计算因点格式不兼容引发 NaN 毒化**<br>当点为 `{x, y}` 结构时，`mid[0]` 抛出 `undefined`，`Math.round` 演变为 `NaN` 导致全图线宽损坏。 | 排线后处理强行假定点数据结构为元组数组 `[x, y]`，缺少结构兼容与数值有效性校验。 | [stage4-hatching.js](../../src/core/pipeline/stage4-hatching.js#L293)<br>解构 `(mid[0] ?? mid.x)`，追加 `Number.isFinite` 保护。 | `tests/adversarial-resilience.test.cjs#ATTACK-007`<br>断言异常与异构点输入下全场零 `NaN`。 |
| **`DEF-BUG-006`** | 中 | **酸液模拟积分累加器 `acc` 作用域脱节与脉冲泄漏**<br>暂停或重置腐蚀后，下一次启动瞬间触发 0.08s 脉冲过咬。 | `frame` 循环私有局部 `let acc = 0` 未与控制器 `etchAcc` 联动，外部 reset 无法清零动画帧内的剩余积分。 | [plate-studio-controller.js](../../src/ui/controllers/plate-studio-controller.js#L1143)<br>废除局部 `acc`，全模块统一绑定导出的 `etchAcc`。 | `tests/adversarial-resilience.test.cjs#ATTACK-003`<br>断言微时间步长积分平滑连续且无过充。 |

