# 微服务网关测试与容灾验证规范 (TESTING.md)

> **被测模块**：`src/services/client/ai-service-gateway.js`  
> **验证重点**：探活协议合规性、超时熔断与离线平滑降级断言。

---

## 1. 对应测试用例矩阵

| 测试文件 | 验证场景 | 关键断言点 |
| :--- | :--- | :--- |
| `tests/pipeline-runner.test.cjs` | 本地无 Python 服务运行时的 Stage 1 执行 | 不抛出未捕获异常，`stage1.lineMap` 由自适应 DoG 算子成功产生 |
| `tests/depth-contour-curvature.test.cjs` | 无 3D 深度图输入时的 Stage 3 & 4 执行 | 当 `depthMap` 与 `normalMap` 为 null 时，管线平滑降级，测试 100% 通过 |

---

## 2. 断言与不变量

1. **失败安全不变量**：无论服务端抛出 HTTP 500、404、网络中断或乱码响应，`AIServiceGateway` 永远返回 `null`，严禁让异常穿透中断前端主流程。
