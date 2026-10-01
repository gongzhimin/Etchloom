# AI 辅助微服务通信接口协议 (SERVICE_API_CONTRACT.md)

> **微服务实现**：[services/informative_drawings/server.py](../../services/informative_drawings/server.py)  
> **客户端网关**：[src/services/client/ai-service-gateway.js](../../src/services/client/ai-service-gateway.js)  
> **服务基础地址**：`http://127.0.0.1:7861`

---

## 1. 接口列表

### 1.1 服务健康与能力探活 (`GET /health`)
- **功能**：检测 Python 神经网络服务当前是否就绪、运行设备（CPU/CUDA）及 Lotus 几何模型状态。
- **超时约束**：网关设置探活超时为 `1500ms`。
- **响应体格式 (JSON)**:
  ```json
  {
    "ready": true,
    "device": "cuda",
    "maxSide": 2048,
    "lotusReady": true,
    "services": {
      "informativeDrawings": true,
      "lotusGeometry": true
    }
  }
  ```

### 1.2 灰度线描推理 (`POST /infer`)
- **功能**：基于 Informative Drawings 模型从摄影图像中提取连续线描灰度场。
- **请求头**：`Content-Type: image/jpeg` 或 `image/png`
- **请求体**：原始图片二进制 Buffer
- **响应头**：`Content-Type: image/png`
- **响应体**：8-bit 单通道灰度线描 PNG 图像
- **熔断与降级机制**：超时上限 `4000ms`。若服务端无响应或连接失败，网关自动降级为阶段 1 纯几何边缘退避算法，保障前端不阻断。

### 1.3 空间几何深度估计 (`POST /depth`)
- **功能**：基于 LotusGPipeline 扩散模型估计物体的度量空间几何深度与表面法线。
- **请求头**：`Content-Type: image/jpeg` 或 `image/png`
- **请求体**：原始图片二进制 Buffer
- **响应头**：`Content-Type: image/png`
- **响应体**：8-bit 单通道灰度深度 PNG 图像（`0` 表示近平面，`255` 表示远平面）
- **退避策略**：若 Lotus 显存不足或未加载，服务内部自动退避为基于亮度和局部对比度的高斯启发式几何估计。
