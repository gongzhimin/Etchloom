---
title: 外部服务模块验证与测试设计
status: Active
doc-id: TEST-SERV
owner-module: services
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:57:00+08:00
---

# 外部服务模块验证与测试设计 (TEST-SERV)

## 1. 测试策略与分层

本模块负责与外部/本地 AI 推理服务及 Web 神经网络运行时进行通信（`src/services/`）。测试策略核心聚焦于网络不可达防御、探活协议合规性与无断点平滑降级：
- **网关能力探测与自适应降级测试**：在未启动本地 Python 服务的环境下，验证网关探活自动回退到 `offline-analytical` 基础离线模式；
- **全链路离线可用性测试**：验证在断网及无 GPU 环境下，管线 Stage 1（线描）与 Stage 3（几何）自动无缝切换至纯 JavaScript 几何算子；
- **异常穿透防护**：验证所有网络断开、端口拒绝及 HTTP 异常被网关捕获并转换为 `null`，严禁向外抛出未捕获异常。

## 2. 真实测试套件与关键用例矩阵

服务模块直接及关联测试套件包含 3 个测试文件：

| 测试文件 | 用例数 | 被测组件 / 符号 | 核心断言与验证目标 |
| :--- | :---: | :--- | :--- |
| `tests/web-ai-client.test.cjs` | 1 | `AIServiceGateway`, `WebAIClient` | 1. 验证类导出完整；2. 验证 Node 环境 `probeCapabilities()` 报告 `webgpu: false`；3. 验证未启动端口探活 100ms 内回退至 `ready: true, mode: 'offline-analytical', requiresNetwork: false` |
| `tests/pipeline-runner.test.cjs` | 4 | `PipelineRunner` + `AIServiceGateway` | 离线执行 Stage 1，验证在缺少 Python 推理服务时管线不抛出未捕获异常，平滑生成自适应 DoG 灰度线稿 |
| `tests/depth-contour-curvature.test.cjs` | 6 | `Stage3Contours` + `Stage4Hatching` | 传入 `depthMap: null` 与 `normalMap: null`，验证管线在缺少 3D 几何服务时平滑降级且测试 100% 通过 |

## 3. 契约与集成测试

- **网关签名与返回值契约**：断言 `checkHealth`、`requestLineDrawing` 与 `requestDepthMap` 返回值符合 `design/INTERFACES.md`（`IF-SERV`）定义；
- **零外部网络依赖**：测试套件在完全断网环境下可独立运行，绝不发起外网 HTTP/HTTPS 请求。

## 4. 测试命令与环境

```powershell
# 执行服务网关与离线降级相关自动化测试
node --test tests/web-ai-client.test.cjs tests/pipeline-runner.test.cjs tests/depth-contour-curvature.test.cjs
```

## 5. 覆盖率与质量门禁

- **用例通过率要求**：服务网关与降级分支测试用例必须 100% 通过（Pass Rate = 100%）；
- **门禁阻断标准**：测试中若有未捕获的网络或协议级异常穿透至主线程，判定门禁失败。
