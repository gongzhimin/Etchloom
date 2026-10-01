# Informative Drawings Neural Service (`services/informative_drawings/`)

> **服务路径**：`services/informative_drawings/`  
> **技术定位**：Layer 0 外部神经计算服务层，基于 Python ThreadingHTTPServer 提供轻量高效的灰度线描推理微服务。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

1. **摄影图像线描提炼**：通过轻量深度前馈卷积神经网络，将输入自然摄影转换为单通道 8-bit 高对比度线描灰度场；
2. **硬件自适应加速**：启动时检测并利用本地 CUDA GPU 显存，若不可用自动降级至多线程 CPU 推理；
3. **标准 HTTP 协议通信**：在本地 `127.0.0.1:7861` 暴露 `/health` 与 `/infer` 接口。

---

## 2. 核心算法原理与步骤 (Algorithm Steps)

详细神经网络架构与张量预处理步骤见 [docs/ALGORITHM_SPEC.md](docs/ALGORITHM_SPEC.md)。

---

## 3. 运行与验证 (Running & Verification)

启动本地服务：
```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-model.ps1
```
验证服务探活：
```bash
curl http://127.0.0.1:7861/health
```

---

## 4. 子文档导航 (Sub-documentation Index)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：服务端架构与线程模型
- [docs/ALGORITHM_SPEC.md](docs/ALGORITHM_SPEC.md)：网络架构与张量归一化规范
- [docs/INTERFACE_SPEC.md](docs/INTERFACE_SPEC.md)：线描微服务 HTTP API 接口设计与数据契约规范
- [docs/TESTING.md](docs/TESTING.md)：服务探活与推理测试说明
