---
title: 统一测试工程与攻击视角断言规范
status: Active
doc-id: RULE-TEST
owner-module: root
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:25:00+08:00
---

# 统一测试工程与攻击视角断言规范

## 1. 目的与范围

本规范定义 Etchloom 测试工程的编写原则、攻击视角方法论、双轨验证要求（覆盖性测试 + 对抗性测试）与断言准则；全系统测试分层策略与具体用例清单由 `docs/verification/TESTING.md` 规划。

## 2. 规则正文

### §2.1 攻击视角测试方法论 (Attacker's Mindset)
测试的核心不是证明 Happy Path 畅通，而是主动寻找系统的脆弱面：
1. **假设调用方恶意**：假定输入参数包含非法类型、越界数值、`NaN`、超大内存炸弹或截断的二进制。
2. **假设时序最恶劣**：假定并发事件在微秒级频繁冲突、异步任务在临界瞬间被强行取消。
3. **假设物理与外部环境不可靠**：假定网络断开、后端微服务超时或崩溃。

### §2.2 双轨测试验证体系 (Dual-Pillar Verification)
系统测试套件必须同时覆盖两大支柱：
1. **支柱 1: 覆盖性测试 (Coverage Testing)**
   - 逻辑分支与路径覆盖；
   - 状态机全状态转移矩阵覆盖；
   - 业务端到端全生命周期覆盖；
   - 三语字典字符级全覆盖。
2. **支柱 2: 深度对抗性测试 (Adversarial Testing)**
   - 专门设计具有破坏性的攻击用例（见下节六大攻击向量）。

### §2.3 六大对抗性攻击向量手册 (Adversarial Attack Vectors)

#### [ATTACK-001] 畸形载荷与参数投毒 (Malformed Payload & Poisoning)
- **攻击手段**：传入 `0x0` 图像、`null`、`undefined`、非有限实数（`NaN`、`+Infinity`、`-Infinity`）、破坏性负值及非法 Base64。
- **合格标准**：模块必须通过防御性断言安全拒绝或清洗，严禁底层计算被 `NaN` 污染导致渲染黑屏或进程崩溃。

#### [ATTACK-002] 高频时序竞争与抢占风暴 (Race Condition & Cancellation Storm)
- **攻击手段**：在 10ms 内连续提交 50 次异步调度任务；在任务执行到 99% 的临界点触发 `AbortSignal.abort()`。
- **合格标准**：旧任务必须立即中止并释放资源，仅有最新一次任务落盘；无异步死锁、无僵尸任务、无幽灵覆盖。

#### [ATTACK-003] 物理守恒与不变量破缺攻击 (Conservation & Invariant Breach)
- **攻击手段**：
  - **防蚀漆击穿攻击**：在被防蚀漆阻断的区域（`blockedField == 1`）实施极端长时间酸蚀，断言刻深绝对为 0；
  - **刻深上溢攻击**：连续施加酸蚀 10,000 秒，断言刻深严格有界于 $[0.0, 1.0]$，绝不溢出；
  - **时间倒流攻击**：传入负时间步长 `dt = -5.0`，断言引擎拒绝执行且累计时间不被破坏。

#### [ATTACK-004] 坐标越界与内存炸弹攻击 (Boundary Penetration & Memory Bomb)
- **攻击手段**：传入极大坐标 `(999999, 999999)` 或极小负数坐标划线；连续压入 100 次历史快照。
- **合格标准**：紧凑包围盒裁剪生效，一维平铺连续内存寻址零越界，快照栈严格截断丢弃最旧数据，内存不超标。

#### [ATTACK-005] 故障注入与雪崩降级 (Chaos Fault Injection)
- **攻击手段**：拦截 HTTP 请求模拟服务端 `ECONNREFUSED`、HTTP 500、8000ms 超时。
- **合格标准**：网关必须内部消化故障并平滑降级至 `offline-analytical` 离线纯几何模式，界面零白屏。

#### [ATTACK-006] 状态机非法越权跳转 (Unauthorized State Transition)
- **攻击手段**：在腐蚀进行中（Biting）强行调用试印；在已有刻痕或清漆保护时静默覆写版面。
- **合格标准**：控制器必须实施状态守卫拦截，弹出安全确认对话框或置灰不可用控件。

## 3. 与其他规范的关系

- 根级系统测试策略与端到端用例由 `docs/verification/TESTING.md` 权威定义；
- 测试用例与需求关联格式以 `standards/TRACEABILITY_RULES.md` 为准；
- 冲突时以 `standards/DOCUMENT_RULES.md` 为准。
