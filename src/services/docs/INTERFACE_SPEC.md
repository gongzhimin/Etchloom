# AI 微服务通信网关接口设计与契约规范 (INTERFACE_SPEC.md)

> **位置**：`src/services/docs/INTERFACE_SPEC.md`  
> **所属层次**：Layer 2 外部服务代理与微服务通信网关 (Microservice Gateway)  
> **实现目标**：指导前端客户端网关 (`client/ai-service-gateway.js`) 的接口设计、健康探活、熔断退避与纯几何算法平滑降级契约。

---

## 1. 接口设计哲学与职责边界 (Design Philosophy & Boundary)

1. **强韧性透明代理 (Resilient Transparent Proxy)**：
   网关作为前端与 Python 神经网络微服务（Informative Drawings & Lotus）通信的唯一出入口。它负责将 HTTP 通信、网络波动、超时控制与三态熔断器内部消化，对上层提供统一的异步计算抽象。
2. **零阻断平滑降级原则 (Fail-Safe Graceful Fallback)**：
   若本地 Python AI 服务未启动、崩溃或响应超时，**网关绝对禁止向业务抛出阻断性致命错误**，必须自动无缝降级为纯前端数学几何算子（如高斯差分与形态学边缘提取），确保离线用户体验不受损。

---

## 2. 强类型接口定义与数据结构契约 (Type Definitions & Data Contract)

```typescript
/**
 * 熔断器状态枚举
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * 微服务健康与能力探活契约
 */
export interface ServiceHealthStatus {
  readonly ready: boolean;               // 服务整体是否就绪
  readonly device: 'cuda' | 'cpu' | 'unknown'; // 后端计算设备
  readonly maxSide: number;              // 推荐最大分辨率长边限制
  readonly services: {
    readonly informativeDrawings: boolean;
    readonly lotusGeometry: boolean;
  };
  readonly circuitState: CircuitState;   // 当前客户端熔断器状态
}

/**
 * 灰度线描推理请求入参契约
 */
export interface SketchInferenceParams {
  readonly imageBase64: string;          // 图像标准 Base64 编码字符串
  readonly detailLevel?: number;         // 细节感知级别 [0.0, 1.0]
  readonly timeoutMs?: number;           // 单次请求超时时间 (默认 8000ms)
  readonly signal?: AbortSignal;         // 外部中止信号
}

/**
 * 灰度线描推理产物契约
 */
export interface SketchInferenceResult {
  readonly sketchBase64: string | null;  // 生成的线描灰度图 Base64 (降级时为 null)
  readonly usedAi: boolean;              // 是否实际使用了 Python 神经网络
  readonly latencyMs: number;            // 真实网络与推理时延 (毫秒)
}

/**
 * AI 服务网关核心契约
 */
export interface IAIServiceGateway {
  readonly baseUrl: string;

  /**
   * 发起快速健康探活检测
   * @param timeoutMs 探活超时时间 (标称 1500ms)
   */
  checkHealth(timeoutMs?: number): Promise<ServiceHealthStatus>;

  /**
   * 请求 Python 端执行灰度线描抽取 (支持熔断自适应与降级)
   */
  requestSketch(params: SketchInferenceParams): Promise<SketchInferenceResult>;

  /**
   * 重置熔断器状态
   */
  resetCircuit(): void;
}
```

---

## 3. 前置条件与参数合法性约束 (Pre-conditions)

1. **服务基地址有效性**：
   - `baseUrl` 必须为合法的 HTTP URL 字符串（默认 `http://127.0.0.1:7861`）。
2. **超时时间正定性**：
   - `timeoutMs` 必须为大于 0 的有效数值。传入非正数时，网关必须自动回退至默认超时配置。
3. **图像载荷格式**：
   - `imageBase64` 必须为非空字符串，且符合 DataURL 或纯 Base64 编码格式。

---

## 4. 后置条件与状态变更承诺 (Post-conditions)

1. **绝对可用性承诺 (Zero-Exception Fallback Promise)**：
   - 无论网络发生何种错误（`ECONNREFUSED`、HTTP 500、超时 `AbortError`），`requestSketch` 必须正常 Resolve，返回 `usedAi: false`，绝对不得抛出未捕获的拒绝异常中断管线执行。
2. **时延审计精确性**：
   - 返回的 `latencyMs` 必须精确反映从发起网络握手到收到完整响应或判定超时的真实物理耗时（基于 `performance.now()` 计算）。

---

## 5. 系统不变量与守恒律 (System Invariants)

1. **三态熔断器转移不变量 (Circuit Transition Invariant)**：
   - 熔断器必须严格按照状态机演变：连续失败达阈值（默认 3 次）必定由 `CLOSED` 跃迁为 `OPEN`；冷却倒计时结束后必定进入 `HALF_OPEN`；在 `HALF_OPEN` 下单次探活成功立即复位至 `CLOSED`。
2. **探活退避单调递增性**：
   在熔断处于 `OPEN` 期间，周期性探活间隔必须遵循带抖动的指数退避，且严格受限于最大退避上限 $T_{\max} = 60\text{s}$。

---

## 6. 纯函数属性、副作用与内存所有权 (Side-effects & Memory Ownership)

1. **网络副作用封装**：
   网关具有网络 I/O 副作用。网关内部必须管理自身的 AbortController 实例，在请求完成或超时后必须立即解除引用，严禁遗留失控的后台轮询计时器。
2. **Base64 字符串内存控制**：
   网关对接收到的大型 Base64 响应字符串，在交给解码器后应建议垃圾回收，避免常驻于网关历史记录中。

---

## 7. 错误契约、并发与生命周期状态协议 (Error Handling & Lifecycle Protocol)

1. **并发竞态保护**：
   当有多个并发推理请求同时到达且服务刚好失效时，熔断器计数器必须原子递增，仅触发一次熔断状态变更事件。
2. **客户端显式取消支持**：
   调用方传入的 `signal` 触发时，底层 `fetch` 请求必须立即终止并释放 socket 资源。
