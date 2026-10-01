# 微服务网关与通信协议规范 (ALGORITHM_SPEC.md)

> **模块定位**：`src/services/`（Python 神经网络微服务异步通信与优雅降级网关）  
> **核心验收标准**：**“完全映射出原理，完全能够做到依据文档也能独立复现出生产代码”**。

---

## 1. 物理背景与算法动机 (Physical & Algorithmic Motivation)

虽然纯 JavaScript 能够依靠自适应差分高斯 (DoG) 与结构张量场实现高水准版画合成，但引入现代深度学习模型可显著增强艺术表现力：
- **Informative Drawings**：基于生成对抗网络 (GAN) 提取具备艺术家级排线节奏与顿挫的主观轮廓；
- **Lotus 3D Geometry**：基于单目扩散模型估计空间深度图与表面法线切片。

然而，Python 神经网络环境通常依赖 Python 运行时、PyTorch 与可选的 CUDA 显卡驱动，用户本地环境存在未启动服务、缺少显卡或模型下载中断的可能性。网关必须建立严密的**探活探测、自动重试与零阻塞平滑降级算法**，确保“有模型享用神经算力，无模型无缝退避纯几何算法”。

---

## 2. 数学符号与输入前置条件 (Preconditions & Mathematical Symbols)

| 符号 | 类型 | 含义 | 约束 / 取值范围 |
| :--- | :--- | :--- | :--- |
| $T_{\text{timeout}}$ | 整数 (ms) | 单次 HTTP 请求超时熔断阈值 | 默认 5000ms |
| $N_{\text{retry}}$ | 整数 | 失败最大重试次数 | 默认 1 次 |
| $\mathbf{I}_{\text{rgb}}$ | Uint8ClampedArray | 输入图像 RGBA 格式连续位图 | 尺寸 $W \times H$ |
| $S_{\text{gateway}}$ | 枚举 | 网关当前状态机状态 | `ONLINE`, `OFFLINE`, `PROBING`, `FALLBACK` |

---

## 3. 连续与离散通信控制协议推导 (Mathematical Protocol Formulation)

### 3.1 指数退避探活心跳方程

探活探针在探测失败后，重试间隔采用二进制指数退避：

$$\Delta t_k = \min\left(\Delta t_{\max}, \Delta t_{\text{base}} \cdot 2^k + \text{Unif}(0, \delta)\right)$$

其中 $\Delta t_{\text{base}} = 500\text{ms}$，$\Delta t_{\max} = 5000\text{ms}$，$\text{Unif}(0, \delta)$ 为防止探针惊群效应的随机抖动值。

---

## 4. 离散化控制流与伪代码 (Algorithmic Pseudocode)

```javascript
class AIServiceGateway {
  constructor(baseUrl = 'http://127.0.0.1:7861') {
    this.baseUrl = baseUrl;
    this.status = 'PROBING';
  }

  async checkHealth() {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(`${this.baseUrl}/health`, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        this.status = 'ONLINE';
        return await res.json();
      }
    } catch (_) {
      this.status = 'OFFLINE';
    }
    return { status: 'unavailable', device: 'none' };
  }

  async requestInference(imageData, endpoint) {
    if (this.status === 'OFFLINE') return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const body = JSON.stringify({ image: imageDataToBase64(imageData) });
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) return await res.json();
    } catch (err) {
      // 优雅降级，返回 null 触发纯 JavaScript 备用算子
      return null;
    }
    return null;
  }
}
```

---

## 5. 依据本规范的独立复现与代码映射

| 规范章节 | 生产源码文件路径 | 符号 / 方法 |
| :--- | :--- | :--- |
| 第 3.1 节 探活协议 | `src/services/client/ai-service-gateway.js` | `AIServiceGateway.prototype.checkHealth` |
| 第 4 节 降级请求 | `src/services/client/ai-service-gateway.js` | `AIServiceGateway.prototype.requestInference` |
