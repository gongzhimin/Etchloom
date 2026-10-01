# AI Microservice Client Gateway (`src/services/`)

> **模块路径**：`src/services/`  
> **技术定位**：Layer 2 基础设施通信层，封装与本地 Python 神经网络推理微服务（端口 7861）的异步 HTTP 通信、健康探活与自动平滑降级逻辑。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

1. **服务探活与硬件探测 (`checkHealth`)**：检测本地 Python 推理服务是否存活、硬件后端（CUDA / CPU）及模型权重加载状态；
2. **神经线描推理请求 (`requestInformativeDrawing`)**：将输入图像位图序列化为 PNG/Base64 并向 `/infer` 发起推理请求；
3. **Lotus 3D 几何特征请求 (`requestLotusGeometry`)**：向 `/depth` 请求获取空间绝对深度图与法线张量图；
4. **平滑降级与失败安全 (`Fail-Safe Fallback`)**：当 Python 服务未启动或遭遇超时报错时，毫秒级平滑降级至本地 JavaScript 纯几何算法（DoG 边缘与经验流场），界面绝不崩溃。

---

## 2. 内部架构与组件拓扑 (Internal Architecture & Component Map)

```
src/services/
├── client/                   # 客户端通信实现
│   └── ai-service-gateway.js # AIServiceGateway 类 (HTTP 探活/推理/重试/降级)
├── docs/                     # 通信契约与降级规范
│   ├── ALGORITHM_SPEC.md     # 探活退避状态机与张量序列化规范
│   ├── ARCHITECTURE.md       # 本地微服务进程间通信架构
│   └── TESTING.md            # 服务降级与网络断言规范
└── README.md                 # 网关模块总览
```

---

## 3. 对外公共接口契约 (Public API Contract)

```typescript
interface ServiceHealth {
  status: 'ok' | 'unavailable';
  device: 'cuda' | 'cpu';
  models: {
    informative_drawings: boolean;
    lotus_geometry: boolean;
  };
}

class AIServiceGateway {
  constructor(baseUrl?: string);
  checkHealth(): Promise<ServiceHealth>;
  requestLineMap(imageData: ImageData): Promise<LineMapArtifact | null>;
  requestDepthAndNormals(imageData: ImageData): Promise<{ depthMap: ImageData; normalMap: ImageData } | null>;
}
```

---

## 4. 自动化测试与验证 (Testing & Verification)

- [`tests/pipeline-runner.test.cjs`](../../tests/pipeline-runner.test.cjs)（验证微服务缺失时的优雅退避）
- [`tests/depth-contour-curvature.test.cjs`](../../tests/depth-contour-curvature.test.cjs)（验证深度图与几何流场解析）

---

## 5. 子文档导航 (Sub-documentation Index)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：三态熔断器时序与拓扑设计
- [docs/ALGORITHM_SPEC.md](docs/ALGORITHM_SPEC.md)：指数退避探活公式与数学建模
- [docs/INTERFACE_SPEC.md](docs/INTERFACE_SPEC.md)：AI 辅助微服务网关接口设计规范
- [docs/TESTING.md](docs/TESTING.md)：熔断降级测试规范与断言解析
