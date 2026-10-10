---
title: 外部服务模块对外接口契约
status: Active
doc-id: IF-SERV
owner-module: services
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:55:00+08:00
---

# 外部服务模块对外接口契约 (IF-SERV)

## 1. 接口设计原则与权威关系

1. **唯一权威定义**：本文件是 `services` 模块对外提供的接口契约权威定义。跨模块登记以 `docs/design/INTERFACES.md` 为准，具体签名、参数与降级状态以此处为准。
2. **三态无断点降级原则**：前端通过单一网关 `AIServiceGateway` 访问 AI 能力，依次按 `remote-python`（本地 7861 端口服务）-> `browser-webai`（浏览器内置 WebGPU/WASM ONNX 模型）-> `offline-analytical`（纯 JS 几何解析）自适应路由，服务未启动或超时绝不抛出阻断异常。
3. **单入口网关门面**：业务层严禁直接调用原生 `fetch` 或直接操作 ONNX Session，统一经由 `AIServiceGateway` 发起推理。

## 2. 函数式接口签名与类定义

### 2.1 AIServiceGateway 智能服务网关

源码位置：`src/services/client/ai-service-gateway.js`

```javascript
class AIServiceGateway {
  /**
   * @param {string} [baseUrl='http://127.0.0.1:7861'] - 本机 Python HTTP 服务地址
   * @param {Object} [options={}] - { webAiOptions?: Object }
   */
  constructor(baseUrl = 'http://127.0.0.1:7861', options = {})

  /**
   * 探测当前可用的执行后端与硬件加速环境
   * 探测顺序：
   * 1. GET /health 探活本地 Python 服务 (超时 1500ms)
   * 2. WebAIClient 探测浏览器环境 WebGPU / WASM
   * 3. 降级为离线纯几何模式 (offline-analytical)
   * 
   * @param {number} [timeoutMs=1500]
   * @returns {Promise<ServiceHealthStatus>}
   */
  async checkHealth(timeoutMs = 1500)

  /**
   * 请求神经网络线描抽取 (POST /infer)
   * @param {Blob} imageBlob - JPEG 格式图像 Blob
   * @param {number} [timeoutMs=8000] - 超时时间
   * @returns {Promise<Blob|null>} 成功返回 PNG/JPEG Blob，失败/超时返回 null
   */
  async requestLineDrawing(imageBlob, timeoutMs = 8000)

  /**
   * 请求 3D 几何深度图推理 (POST /depth)
   * @param {Blob} imageBlob
   * @param {number} [timeoutMs=8000]
   * @returns {Promise<Blob|null>} 成功返回深度图 Blob，失败/超时返回 null
   */
  async requestDepthMap(imageBlob, timeoutMs = 8000)

  /**
   * 并行执行线描与深度图解算，并在远端不可达时自动无缝交由 WebAIClient 本地执行
   * @param {Blob|HTMLImageElement|HTMLCanvasElement} imageSource
   * @param {number} curW - 目标输出宽度
   * @param {number} curH - 目标输出高度
   * @returns {Promise<{ lineMap: Float32Array|null, depthMap: { width: number, height: number, data: Float32Array }|null, backend: string }>}
   */
  async requestParallelPipeline(imageSource, curW, curH)

  /**
   * 获取当前活跃后端的本地化显示标签
   * @returns {string}
   */
  getBackendLabel()
}
```

### 2.2 WebAIClient 浏览器端本地推理客户端

源码位置：`src/services/client/web-ai-client.js`

```javascript
class WebAIClient {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.modelsBasePath='models/'] - 本地 ONNX 权重根目录
   * @param {number} [options.maxInferenceSide=768] - 推理最大长边限制
   * @param {Function} [options.onProgress] - 权重加载进度回调
   * @param {Function} [options.log] - 日志回调
   */
  constructor(options = {})

  /**
   * 探测当前浏览器环境是否支持 WebGPU / WASM 加速
   * @returns {Promise<{ ready: boolean, webgpu: boolean, wasm: boolean, ortReady: boolean }>}
   */
  async probeCapabilities()

  /**
   * 执行纯 JavaScript 空间解析深度估计 (兜底回退算子)
   * @param {HTMLImageElement|HTMLCanvasElement} imageSource
   * @param {number} targetWidth
   * @param {number} targetHeight
   * @returns {{ width: number, height: number, data: Float32Array }}
   */
  computeAnalyticalDepth(imageSource, targetWidth, targetHeight)
}
```

## 3. 输入/输出真实类型定义

```typescript
export interface ServiceHealthStatus {
  readonly ready: boolean;
  readonly mode: 'remote-python' | 'browser-webai' | 'offline-analytical';
  readonly modeLabel: string;
  readonly device: string;
  readonly requiresNetwork: boolean;
  readonly lotusReady?: boolean;
  readonly modelReady?: boolean;
  readonly webgpu?: boolean;
}

export interface ParallelPipelineResult {
  readonly lineMap: Float32Array | null;
  readonly depthMap: {
    readonly width: number;
    readonly height: number;
    readonly data: Float32Array;
  } | null;
  readonly backend: string;
}
```

## 4. 错误处理与降级契约

1. **失败安全设计 (Fail-Safe)**：`requestLineDrawing` 与 `requestDepthMap` 捕获所有网络异常（如 `TypeError: Failed to fetch`、`ECONNREFUSED`、HTTP 500、超时等），**严格返回 `null` 而不向业务层抛出未捕获异常**；
2. **超时主动熔断**：通过 `AbortSignal.timeout(timeoutMs)` 精确控制网络超时，避免请求悬挂阻塞前端线程；
3. **CORS 保护**：服务端只对 `127.0.0.1:4173` 与 `localhost:4173` 授权，未授权 Origin 返回拦截。

## 5. 消费方登记与真实契约测试

| 消费方模块 | 依赖门面符号 | 接口调用方式 | 真实契约测试文件 |
| :--- | :--- | :--- | :--- |
| `core` (Stage 1) | `AIServiceGateway.requestLineDrawing` | 异步请求，超时自动降级至 DoG 算子 | `tests/pipeline-runner.test.cjs` |
| `core` (Stage 3) | `AIServiceGateway.requestDepthMap` | 异步请求，无深度图时平滑降级 | `tests/depth-contour-curvature.test.cjs` |
| `ui` | `AIServiceGateway.checkHealth` | 探活状态栏与执行后端展示 | `tests/web-ai-client.test.cjs` |
