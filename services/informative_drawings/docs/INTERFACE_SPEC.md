# 灰度线描神经网络推理微服务接口设计规范 (INTERFACE_SPEC.md)

> **位置**：`services/informative_drawings/docs/INTERFACE_SPEC.md`  
> **所属层次**：Layer 0 Python 神经网络推理微服务 (AI Microservice Endpoint)  
> **服务协议**：HTTP/1.1 RESTful JSON API  
> **基准端口**：`http://127.0.0.1:7861`

---

## 1. 接口设计哲学与职责边界 (Design Philosophy & Boundary)

1. **无状态计算服务 (Stateless Computation Engine)**：
   微服务作为纯推理后端，不维护任何用户会话、长连接状态或持久化数据库。每次请求必须包含完成线描推理所需的全部图像数据。
2. **只读模型与并发隔离**：
   预训练神经网络模型权重常驻显存/内存为只读状态，多线程请求通过 `torch.no_grad()` 上下文保证线程安全与零梯度污染。

---

## 2. 强类型接口定义与数据结构契约 (Type Definitions & Data Contract)

### 2.1 健康探活端点：`GET /health`

- **请求格式**：无请求体
- **响应体格式 (JSON Schema)**：
  ```json
  {
    "type": "object",
    "required": ["ready", "device", "maxSide", "services"],
    "properties": {
      "ready": { "type": "boolean" },
      "device": { "type": "string", "enum": ["cuda", "cpu"] },
      "maxSide": { "type": "integer", "minimum": 512 },
      "services": {
        "type": "object",
        "required": ["informativeDrawings"],
        "properties": {
          "informativeDrawings": { "type": "boolean" }
        }
      }
    }
  }
  ```

### 2.2 线描推理端点：`POST /api/sketch`

- **请求体格式 (JSON Schema)**：
  ```json
  {
    "type": "object",
    "required": ["image"],
    "properties": {
      "image": { "type": "string", "description": "Base64 编码的图像文件数据 (PNG/JPEG)" },
      "maxSide": { "type": "integer", "minimum": 256, "maximum": 2048, "default": 1024 }
    }
  }
  ```
- **成功响应体 (HTTP 200 OK)**：
  ```json
  {
    "type": "object",
    "required": ["success", "sketch", "latencyMs", "width", "height"],
    "properties": {
      "success": { "type": "boolean", "const": true },
      "sketch": { "type": "string", "description": "Base64 编码的单通道灰度线描 PNG 图像" },
      "latencyMs": { "type": "number", "minimum": 0 },
      "width": { "type": "integer" },
      "height": { "type": "integer" }
    }
  }
  ```

---

## 3. 前置条件与参数合法性约束 (Pre-conditions)

1. **有效 Base64 格式**：
   - 入参 `image` 必须为合法的 Base64 编码字符串。若解析失败或包含非图像字节，服务端必须返回 `HTTP 400 Bad Request`，包含错误描述 `{"error": "Invalid base64 payload"}`。
2. **尺寸上限约束**：
   - 输入图像的最大长边若超过 `maxSide`，服务端必须自动执行双三次插值降采样，将最大长边等比缩放至 `maxSide`，防止 GPU 显存溢出。

---

## 4. 后置条件与状态变更承诺 (Post-conditions)

1. **单通道灰度色域保证**：
   - 输出的 `sketch` 图像必须为单通道 8-bit 灰度图（色彩空间为 Grayscale），像素强度严格落入 $[0, 255]$。
2. **空间宽高比严格一致**：
   - 输出图像的宽高比与输入图像的原始宽高比误差必须在 $\pm 1\text{px}$ 容差内，严禁发生画面拉伸畸变。

---

## 5. 系统不变量与守恒律 (System Invariants)

1. **无梯度计算不变量**：
   推理过程必须恒处于 `torch.inference_mode()` 或 `torch.no_grad()` 上下文中，显存消耗在请求完成后必须完全归位，不发生逐次请求显存泄漏。

---

## 6. 纯函数属性、副作用与内存所有权 (Side-effects & Memory Ownership)

1. **显存临时张量生命周期**：
   输入 Tensor、中间特征图与输出灰度矩阵在转码成 Base64 响应后必须显式解除引用，必要时调用 `torch.cuda.empty_cache()` 回收零碎内存。

---

## 7. 错误契约、并发与生命周期状态协议 (Error Handling & Lifecycle Protocol)

1. **CUDA 显存溢出捕获**：
   若发生 `torch.cuda.OutOfMemoryError`，服务端必须捕获该异常，自动清理显存，并返回 `HTTP 503 Service Unavailable`，通知客户端网关触发纯几何算法降级。
