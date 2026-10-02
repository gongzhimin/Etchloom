# AI 辅助微服务通信接口协议 (SERVICE_API_CONTRACT.md)

> **微服务实现**：[services/informative_drawings/server.py](../../services/informative_drawings/server.py)  
> **客户端网关**：[src/services/client/ai-service-gateway.js](../../src/services/client/ai-service-gateway.js) 与 [src/services/client/web-ai-client.js](../../src/services/client/web-ai-client.js)  
> **服务基础地址**：`http://127.0.0.1:7861`

---

## 1. 三模态执行体系 (Tri-Mode Execution Architecture)

网关遵循严格的分级自适应探测与降级策略：
1. **模式 1：`remote-python`（本机 Python 服务）**：通过 HTTP 访问本地 CUDA/PyTorch 服务，并行调用 `/infer` 与 `/depth`；
2. **模式 2：`browser-webai`（浏览器内置模型）**：基于 `WebAIClient`，使用 ONNX Runtime Web（优先 WebGPU，次选 WASM CPU 多线程）在端侧内存中运行 `models/informative-drawings.onnx` 与 `models/midas-small.onnx`（MiDaS v2.1 Small）；
3. **模式 3：`offline-analytical`（纯离线几何分析）**：100% 离线纯 JavaScript 几何分析退避算法，基于高斯差分 (DoG) 边缘与启发式几何流场。

---

## 2. 本地微服务接口列表 (Port 7861)

### 2.1 服务健康与能力探活 (`GET /health`)
- **功能**：检测 Python 神经网络服务当前是否就绪、运行设备（CPU/CUDA）及 Lotus 几何模型状态。
- **超时约束**：网关设置探活超时为 `1500ms`。
- **响应体格式 (JSON)**:
  ```json
  {
    "ready": true,
    "device": "cuda",
    "maxSide": 2048,
    "lotusReady": true,
    "services": ["informative_drawings", "lotus_depth"]
  }
  ```

### 2.2 灰度线描推理 (`POST /infer`)
- **功能**：基于 Informative Drawings 模型从摄影图像中提取连续线描灰度场。
- **请求头**：`Content-Type: image/jpeg` 或 `image/png`
- **请求体**：原始图片二进制 Buffer
- **响应头**：`Content-Type: image/png`
- **响应体**：8-bit 单通道灰度线描 PNG 图像
- **熔断与降级机制**：超时上限 `8000ms`。若服务端无响应或连接失败，网关自动降级为浏览器端 WebAI 或阶段 1 纯几何退避算法。

### 2.3 空间几何深度估计 (`POST /depth`)
- **功能**：基于 LotusGPipeline 扩散模型估计物体的度量空间几何深度与表面法线。
- **请求头**：`Content-Type: image/jpeg` 或 `image/png`
- **请求体**：原始图片二进制 Buffer
- **响应头**：`Content-Type: image/png`
- **响应体**：8-bit 单通道灰度深度 PNG 图像（`0` 表示近平面，`255` 表示远平面）
- **退避策略**：若 Lotus 显存不足或未加载，服务内部自动退避为基于亮度和局部对比度的高斯启发式几何估计。

---

## 3. 前端客户端网关 API 契约 (`AIServiceGateway`)

- **源码文件**：[`src/services/client/ai-service-gateway.js`](../../src/services/client/ai-service-gateway.js)
- **方法列表**：
  1. `checkHealth(timeoutMs?: number): Promise<ProbeResult>`：返回当前生效的后端模式（`remote-python` | `browser-webai` | `offline-analytical`）、设备名与标签；
  2. `requestLineDrawing(imageBlob: Blob, timeoutMs?: number): Promise<Blob | null>`：向 `/infer` 请求线描；
  3. `requestDepthMap(imageBlob: Blob, timeoutMs?: number): Promise<Blob | null>`：向 `/depth` 请求深度图；
  4. `requestParallelPipeline(imageSource: Blob | Canvas, curW: number, curH: number): Promise<{ lineMap, depthMap, backend }>`：根据当前环境自适应并发执行线描与深度图推理，自动完成位图重采样与归一化浮点数组转换。
