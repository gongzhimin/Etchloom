# AI Microservice Client Gateway (`src/services/`)

> **模块路径**：`src/services/`  
> **技术定位**：Layer 2 基础设施通信层，封装与本地 Python 神经网络推理微服务（端口 7861）的异步 HTTP 通信、健康探活与自动平滑降级逻辑。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

1. **服务探活与模式探测 (`checkHealth`)**：分级自适应探测本地 Python 服务（CUDA/CPU）、浏览器端 WebAI 神经网络（WebGPU/WASM）及离线纯几何模式；
2. **神经线描推理请求 (`requestLineDrawing`)**：将输入图像请求至 `/infer` 或浏览器端 Informative Drawings ONNX 模型；
3. **空间几何深度估计 (`requestDepthMap`)**：向 `/depth` 请求 Lotus 空间绝对深度图或浏览器端 Depth Anything V2；
4. **统一并发管线 (`requestParallelPipeline`)**：并发调度线描与深度图抽取，返回归一化 Float32Array 空间场；
5. **主题色彩桥接 (`ThemeBridge`)**：统一 Canvas 2D/SVG 与 CSS `:root` 变量桥接，提供环境自适应主题色彩映射。

---

## 2. 内部架构与组件拓扑 (Internal Architecture & Component Map)

```
src/services/
├── client/                   # 智能模型客户端通信实现
│   ├── ai-service-gateway.js # AIServiceGateway 类 (HTTP 探活/推理/重试/降级)
│   └── web-ai-client.js      # WebAIClient (WebGPU/WASM 浏览器端 ONNX 推理)
├── theme/                    # 视觉与渲染主题服务
│   └── theme-bridge.js       # ThemeBridge (Canvas/SVG 与 CSS Token 色彩桥接)
├── docs/                     # 通信契约与降级规范
│   ├── ALGORITHM_SPEC.md     # 探活退避状态机与张量序列化规范
│   ├── ARCHITECTURE.md       # 微服务与端侧模型协同架构
│   └── TESTING.md            # 服务降级与网络断言规范
└── README.md                 # 网关模块总览
```

---

## 3. 对外公共接口契约 (Public API Contract)

```typescript
interface ProbeResult {
  ready: boolean;
  mode: 'remote-python' | 'browser-webai' | 'offline-analytical';
  modeLabel: string;
  device: string;
  requiresNetwork: boolean;
  lotusReady?: boolean;
}

class AIServiceGateway {
  constructor(baseUrl?: string, options?: object);
  checkHealth(timeoutMs?: number): Promise<ProbeResult>;
  requestLineDrawing(imageBlob: Blob, timeoutMs?: number): Promise<Blob | null>;
  requestDepthMap(imageBlob: Blob, timeoutMs?: number): Promise<Blob | null>;
  requestParallelPipeline(imageSource: Blob | Canvas, curW: number, curH: number): Promise<{
    lineMap: Float32Array | null;
    depthMap: { width: number; height: number; data: Float32Array } | null;
    backend: string;
  }>;
}
```

---

## 4. 自动化测试与验证 (Testing & Verification)

- [`tests/web-ai-client.test.cjs`](../../tests/web-ai-client.test.cjs)（验证浏览器模型探活与离线降级）
- [`tests/theme-bridge.test.cjs`](../../tests/theme-bridge.test.cjs)（验证无头环境主题与设计 Token 桥接）
- [`tests/pipeline-runner.test.cjs`](../../tests/pipeline-runner.test.cjs)（验证微服务缺失时的优雅退避）

---

## 5. 子文档导航 (Sub-documentation Index)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：三态熔断器时序与拓扑设计
- [docs/ALGORITHM_SPEC.md](docs/ALGORITHM_SPEC.md)：指数退避探活公式与数学建模
- [docs/INTERFACE_SPEC.md](docs/INTERFACE_SPEC.md)：AI 辅助微服务网关接口设计规范
- [docs/TESTING.md](docs/TESTING.md)：熔断降级测试规范与断言解析
