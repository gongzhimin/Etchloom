# 神经网络线描微服务测试与验证规范 (TESTING.md)

> **被测模块**：`services/informative_drawings/` (`server.py`, `infer_cli.py`)  
> **运行环境**：Python 3.10+ (PyTorch 2.0+)  
> **执行命令**：`python services/informative_drawings/infer_cli.py --input examples/photo-fixture.jpg --output output_test.png`

---

## 1. 测试用例与验证矩阵

| 测试场景 | 测试方法 | 关键断言点 |
| :--- | :--- | :--- |
| **CLI 离线推理验证** | 运行 `infer_cli.py` 传入测试样本图 | 产物图像必须为单通道 8-bit 灰度图，尺寸与原图一致，像素值分布在 $[0, 255]$ |
| **HTTP 探活测试** | `curl http://127.0.0.1:7861/health` | 状态码 200，JSON 载荷返回 `{"ready": true, "device": "cuda"|"cpu", "maxSide": 2048, "lotusReady": bool, "services": [...]}` |
| **异常输入容错** | 传入空图像或损坏数据 | 返回 HTTP 400 错误 JSON，服务进程不崩溃退出 |
