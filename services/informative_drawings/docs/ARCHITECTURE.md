# 神经网络线描微服务架构与并发设计规范 (ARCHITECTURE.md)

> **模块路径**：`services/informative_drawings/`  
> **上级体系规范**：[docs/00_architecture/ARCHITECTURE_OVERVIEW.md](../../../docs/00_architecture/ARCHITECTURE_OVERVIEW.md)

---

## 1. 微服务拓扑与进程架构 (Service Topology)

```mermaid
graph TD
    Client[前端 AIServiceGateway (HTTP POST)] --> Server[FastAPI / Flask Server (端口 7861)]
    Server --> Auth[请求解析与 Base64 解码]
    Auth --> TorchPipeline[PyTorch 推理管线]
    TorchPipeline --> Device{CUDA 可用?}
    Device -->|是| GPU[CUDA 设备显存分配 (fp16/fp32)]
    Device -->|否| CPU[CPU 多线程并行推理]
    GPU --> Post[反归一化与 PNG 编码]
    CPU --> Post
    Post --> Resp[HTTP 200 JSON 响应 Base64 灰度图]
```

---

## 2. 线程模型与内存生命周期 (Thread Model & Memory Management)

1. **单实例模型驻留**：PyTorch `model.pth` 模型权重在服务启动阶段一次性加载至显存/内存常驻，避免每次请求重复初始化；
2. **显存回收策略**：单次推理完成后，若处于 CUDA 模式，自动触发 `torch.cuda.empty_cache()` 防止并发显存碎片堆积；
3. **尺寸动态对齐**：输入图像长宽强制使用双三次插值补齐至 16 的倍数，推理结束后按原始长宽无损裁剪。
