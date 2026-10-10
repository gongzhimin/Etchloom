---
title: 外部服务模块架构设计
status: Active
doc-id: ARCH-SERV
owner-module: services
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:59:00+08:00
---

# 外部服务模块架构设计 (ARCH-SERV)

## 1. 模块定位与边界

`services` 模块负责提供客户端服务抽象与主题桥接。它向下集成 Python 运行时微服务（`services/informative_drawings` 与 `services/lotus_geometry`）及浏览器端本地 WebAI 运行时（`WebAIClient`），向上为前端与核心管线提供统一的 `AIServiceGateway` 抽象与 `ThemeBridge` 渲染主题映射。本模块严格保证系统在没有 Python 环境或断网时，仍然具备 100% 的功能可用性。

## 2. 内部结构与子模块职责

```text
src/services/
├── client/                      # 客户端网关与探活代理
│   ├── ai-service-gateway.js    # AIServiceGateway 单入口网关门面
│   └── web-ai-client.js         # WebAIClient 浏览器端本地 WebGPU/WASM 推理客户端
├── theme/                       # 主题桥接服务
│   └── theme-bridge.js          # ThemeBridge 运行时 CSS 变量向 Canvas/SVG 桥接解析器
└── README.md                    # 模块定位说明

services/                        # 本地独立微服务 (二级独立 Python 进程)
├── informative_drawings/        # GAN 线描感知推理服务 (Port 7861)
│   ├── server.py                # 轻量级 HTTP 推理服务
│   ├── infer_cli.py             # 命令行离线单图推理工具
│   └── model/                   # 权重与网络结构
└── lotus_geometry/              # 3D 几何与表面法线推理服务
    ├── pipeline_lotus.py        # 扩散模型单目深度与法线推理管线
    └── utils_geometry.py        # 几何向量切线投影数学工具
```

### 2.1 子系统职责
- **`src/services/client/ai-service-gateway.js`**：单一入口网关，负责三态模式探测（`remote-python` -> `browser-webai` -> `offline-analytical`）、超时熔断与离线平滑降级；
- **`src/services/client/web-ai-client.js`**：浏览器本地推理客户端，探测 WebGPU/WASM 支持度并提供纯 JS 空间解析深度兜底；
- **`src/services/theme/theme-bridge.js`**：解析 `document.documentElement` 中的 CSS 自定义变量，向 Canvas 渲染器和 SVG 导出器提供确定性的颜色 Tokens，并为无头环境提供默认值；
- **`services/informative_drawings/`**：独立的 Python 3.10 推理进程，提供 `POST /infer` 艺术家线描抽取；
- **`services/lotus_geometry/`**：独立的 Python 3.10 推理进程，提供 `POST /depth` 空间几何深度与法线推理。

## 3. 内部依赖拓扑与约束

```text
+-----------------------------------------------------------+
|               Core Pipeline / UI Layer                    |
+-----------------------------------------------------------+
               │                               │
               ▼                               ▼
+-----------------------------+  +--------------------------+
|      AIServiceGateway       |  |       ThemeBridge        |
|  (src/services/client/)     |  |   (src/services/theme/)  |
+-----------------------------+  +--------------------------+
      │                    │                   │
      ▼                    ▼                   ▼
+---------------+  +---------------+   +--------------------+
| Python Daemon |  |  WebAIClient  |   | CSS Tokens Resolver|
| (127.0.0.1)   |  | (WebGPU/WASM) |   +--------------------+
+---------------+  +---------------+
```

### 依赖约束：
1. 前端任何模块不得直接发起原生 `fetch('http://127.0.0.1:7861/...')`，必须统一通过 `AIServiceGateway` 发起；
2. 微服务必须作为独立可选进程运行，前端不得强依赖微服务进程的存在；
3. 本机 Python 服务仅向合法 Origin 返回跨域许可（CORS），防止恶意外部站点滥用。

## 4. 实现级技术栈与约束

- **客户端运行时**：Node.js ESM 与现代浏览器原生 Fetch API；
- **服务端运行时**：Python 3.10 + PyTorch 2.x + TorchVision；
- **降级约束**：超时限制严格控制在 8000ms（推理）和 1500ms（探活），超时立即截断并返回降级标识。
