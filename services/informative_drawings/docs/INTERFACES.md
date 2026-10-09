# 灰度线描神经网络推理微服务接口设计规范 (INTERFACES.md)

> **位置**：`services/informative_drawings/docs/INTERFACES.md`  
> **所属层次**：Layer 0 Python 神经网络推理微服务 (AI Microservice Endpoint)  
> **服务协议**：HTTP/1.1 RESTful API  
> **基准端口**：`http://127.0.0.1:7861`

---

## 1. 接口设计哲学与职责边界 (Design Philosophy & Boundary)

1. **无状态高性能计算服务 (Stateless Computation Engine)**：
   微服务作为纯推理后端，不维护任何持久化用户会话。每次请求以二进制流形式传入原始图像，后端直接流式返回处理后的 PNG 图像字节。
2. **只读模型与并发隔离**：
   预训练神经网络模型权重常驻显存/内存为只读状态，多线程请求通过 `torch.inference_mode()` 与线程锁保证线程安全。

---

## 2. 强类型接口定义与数据结构契约 (Type Definitions & Data Contract)

### 2.1 健康探活端点：`GET /health`

- **请求格式**：无请求体
- **响应体格式 (JSON Schema)**：
  ```json
  {
    "type": "object",
    "required": ["ready", "device", "maxSide", "lotusReady", "services"],
    "properties": {
      "ready": { "type": "boolean" },
      "device": { "type": "string" },
      "maxSide": { "type": "integer" },
      "lotusReady": { "type": "boolean" },
      "services": {
        "type": "array",
        "items": { "type": "string" }
      }
    }
  }
  ```

### 2.2 灰度线描推理端点：`POST /infer`

- **请求头**：`Content-Type: image/jpeg` 或 `image/png`
- **请求体**：图像二进制数据 (1 字节 ~ 25 MiB)
- **成功响应体 (HTTP 200 OK)**：
  - `Content-Type: image/png`
  - Body: 生成的灰度线描 PNG 图像二进制数据

### 2.3 空间几何深度端点：`POST /depth`

- **请求头**：`Content-Type: image/jpeg` 或 `image/png`
- **请求体**：图像二进制数据 (1 字节 ~ 25 MiB)
- **成功响应体 (HTTP 200 OK)**：
  - `Content-Type: image/png`
  - Body: 生成的 8-bit 灰度深度图 PNG 图像二进制数据

---

## 3. CLI 离线批处理命令行接口 (`infer_cli.py`)

```bash
python infer_cli.py --input <input_image_path> --output <output_png_path> [--max-side 1024]
```
