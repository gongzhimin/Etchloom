# AI 微服务通信网关接口设计与契约规范 (INTERFACES.md)

> **位置**：`src/services/docs/INTERFACES.md`  
> **所属层次**：Layer 2 外部服务代理与微服务通信网关 (Microservice Gateway)  
> **实现目标**：指导前端客户端网关 (`client/ai-service-gateway.js`) 的接口设计、健康探活、远程/本地/离线三态探测与纯几何算法平滑降级契约。

---

## 1. 接口设计哲学与职责边界 (Design Philosophy & Boundary)

1. **三态智能探活代理 (Three-Tier Adaptive Gateway)**：
   网关支持三大执行模式自适应切换：
   - `remote-python`: 本地 Python HTTP 服务 (127.0.0.1:7861, 支持 CUDA / PyTorch)；
   - `browser-webai`: 浏览器端本地模型 (WebGPU / WASM SIMD, ONNX Runtime Web)；
   - `offline-analytical`: 纯几何纯 JS 确定性解析 (零依赖、零网络、100% 离线)。
2. **零阻断平滑降级原则 (Fail-Safe Graceful Fallback)**：
   若本地 Python AI 服务未启动、崩溃或响应超时，**网关绝对禁止向业务抛出阻断性致命错误**，必须自动无缝降级为纯前端数学几何算子，确保离线用户体验不受损。

---

## 2. 强类型接口定义与数据结构契约 (Type Definitions & Data Contract)

```typescript
/**
 * 网关健康与能力探活契约
 */
export interface ServiceHealthStatus {
  readonly ready: boolean;               // 服务整体是否就绪
  readonly mode: 'remote-python' | 'browser-webai' | 'offline-analytical';
  readonly modeLabel: string;            // 本地化友好状态文本
  readonly device: string;               // 计算设备 (CUDA / WebGPU / WASM / CPU)
  readonly requiresNetwork: boolean;     // 是否需要外部网络 (全阶段为 false)
  readonly lotusReady?: boolean;         // 3D 深度/法线服务是否就绪
}

/**
 * AI 服务网关核心契约 (src/services/client/ai-service-gateway.js)
 */
export interface IAIServiceGateway {
  readonly baseUrl: string;
  readonly activeBackend: string;

  /**
   * 发起快速健康探活与能力探测
   * @param timeoutMs 探活超时时间 (默认 1500ms)
   */
  checkHealth(timeoutMs?: number): Promise<ServiceHealthStatus>;

  /**
   * 请求线描抽取 (POST /infer)
   */
  requestLineDrawing(imageBlob: Blob, timeoutMs?: number): Promise<Blob | null>;

  /**
   * 请求空间几何深度图 (POST /depth)
   */
  requestDepthMap(imageBlob: Blob, timeoutMs?: number): Promise<Blob | null>;

  /**
   * 并行请求线描与深度图
   */
  requestInferenceParallel(imageBlob: Blob, options?: { timeoutMs?: number; signal?: AbortSignal }): Promise<{ lineBlob: Blob | null; depthBlob: Blob | null }>;

  /**
   * 高级统一推理入口 (自动兼容 HTMLImageElement 与 Blob)
   */
  inferLineDrawing(imageElementOrBlob: any, options?: Object): Promise<Blob | null>;
  inferDepthMap(imageElementOrBlob: any, options?: Object): Promise<Blob | null>;
  inferGeometry(imageElementOrBlob: any, options?: Object): Promise<{ depthBlob: Blob | null; normalBlob: Blob | null }>;
}
```

---

## 3. 前置条件与参数合法性约束 (Pre-conditions)

1. **服务基地址有效性**：
   - `baseUrl` 必须为合法的 HTTP URL 字符串（默认 `http://127.0.0.1:7861`）。
2. **超时时间正定性**：
   - `timeoutMs` 必须为大于 0 的有效数值。传入非正数时，网关必须自动回退至默认超时配置。

---

## 4. 后置条件与状态变更承诺 (Post-conditions)

1. **绝对可用性承诺 (Zero-Exception Fallback Promise)**：
   - 无论网络或微服务发生何种异常（`ECONNREFUSED`、HTTP 500、超时），调用方法均返回 `null` 或降级产物，绝对不得向外抛出未捕获致命异常中断管线执行。
