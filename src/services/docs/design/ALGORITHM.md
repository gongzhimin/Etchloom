---
title: 外部服务模块算法与通信协议规范
status: Active
doc-id: ALG-SERV
owner-module: services
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:42:00+08:00
---

# 外部服务模块算法与通信协议规范 (ALG-SERV)

## 1. 算法背景与数学模型

本模块涵盖客户端网关通信控制算法及后置 AI 微服务的核心数学模型：

### 1.1 指数退避探活心跳算法
探活探针在探测失败后，重试间隔采用二进制指数退避加抖动：
$$\Delta t_k = \min\left(\Delta t_{\max}, \Delta t_{\text{base}} \cdot 2^k + \text{Unif}(0, \delta)\right)$$
其中 $\Delta t_{\text{base}} = 500\text{ms}$，$\Delta t_{\max} = 5000\text{ms}$，$\text{Unif}(0, \delta)$ 为消除探针群聚效应的均匀随机抖动。

### 1.2 神经网络高保真线描感知抽取 (Informative Drawings)
基于残差 U-Net 与实例归一化（Instance Normalization）：
$$\text{IN}(x) = \frac{x - \mu(x)}{\sqrt{\sigma^2(x) + \epsilon}} \cdot \gamma + \beta$$
过滤掉输入摄影图像的宏观光照渐变，仅提取具备艺术家顿挫感的结构轮廓。

### 1.3 Lotus 3D 表面法线切线投影 (Cross-Contour Tangent)
设相机视线方向为 $\mathbf{v} = (0, 0, -1)^T$，空间表面外法线为 $\mathbf{n} = (n_x, n_y, n_z)^T$。三维物体表面的等高截面切线向量定义为：
$$\mathbf{T}_{3D} = \mathbf{n} \times (0, 0, 1)^T = (n_y, -n_x, 0)^T$$
投影至二维屏幕坐标系归一化切线：
$$\mathbf{t}_{\text{cross}} = \frac{(n_y, -n_x)^T}{\sqrt{n_x^2 + n_y^2 + \epsilon}}$$

## 2. 算法流程与伪代码

```text
算法: 网关请求与平滑降级流程
输入: 图像数据 Image, 目标接口 Endpoint, 超时阈值 TimeoutMs
输出: 推理结果 Result 或降级标识 null

1: Controller <- new AbortController()
2: TimerId <- setTimeout(() => Controller.abort(), TimeoutMs)
3: try:
4:     Response <- fetch(BaseUrl + Endpoint, { body: Image, signal: Controller.signal })
5:     clearTimeout(TimerId)
6:     if Response.ok then:
7:         return await Response.blob()
8:     end if
9: catch Error:
10:    clearTimeout(TimerId)
11:    // 记录非致命警告，不抛出异常
12:    LogWarning("Service unreachable or timed out, fallback to local analytical algorithm")
13:    return null
```

## 3. 边界条件与数值稳定性

1. **法线截面切线除零防护**：当表面外法线完全正对相机（$n_x \approx 0, n_y \approx 0$）时，分母增加 $\epsilon = 10^{-6}$，此时切线退化，由各向异性扩散场补充方向；
2. **多并发网络竞争**：若用户连续发起多次推理，老请求对应的 AbortController 自动被触发中止，防止带宽被废弃请求占用；
3. **内存 Blob 释放**：处理完的中间 Blob 在转为 TypedArray 后主动调用 `URL.revokeObjectURL` 释放浏览器内存。

## 4. 复杂度分析与性能基准

- **网关探活开销**：单次健康检查网络耗时 $< 5\text{ms}$（本地回路）；
- **线描推理耗时**：Informative Drawings 在 GPU (RTX 3060) 上推理耗时约 $80\text{ms}$，在 CPU 上约 $450\text{ms}$；
- **几何推理耗时**：Lotus 单目深度在 GPU 上约 $200\text{ms}$。

## 5. 验证与黄金样本

- **探活协议合规性**：`tests/orchestrator.test.cjs` 验证服务离线时探活正确报告 `offline-analytical` 状态；
- **零异常穿透性**：无论服务端抛出 HTTP 404、500 还是连接中断，前端调用均返回 `null` 并顺利走通离线 DoG 算子。
