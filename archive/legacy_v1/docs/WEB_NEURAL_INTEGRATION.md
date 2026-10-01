# 网页端神经轮廓实验方案

更新：2026-09-14。本文件只定义实验架构，当前版本不加载模型。

## 接入边界

神经网络只负责把照片变成一个或多个置信图，不直接输出最终版画：

```text
照片 → 神经推理 → boundary / geometry / semantic confidence
                         ↓
照片 → 经典分析 → tone / region / ridge ─→ 置信融合
                                           ↓
                 现有矢量化、排线、虚拟版与印刷流程
```

这样既能利用模型识别物体与连接弱轮廓的能力，又保留 Etchloom 的随机种子、可编辑路径、物理线宽和离线制版模型。

## 三种网页部署方式

| 方式 | 优点 | 限制 | 推荐用途 |
|---|---|---|---|
| ONNX Runtime Web + WASM | 浏览器覆盖面广，可完全本地处理 | 首次下载模型，CPU 推理较慢 | 第一版默认实验 |
| ONNX Runtime Web + WebGPU | GPU 推理快，模型仍留在本机 | 浏览器与显卡兼容性需检测 | 支持设备上的加速 |
| 本地 Python 服务 | PyTorch 原模型最容易复现 | 需要安装环境和启动服务 | 研究与模型比较 |

第一版建议转换 Informative Drawings 的生成器为 ONNX，量化为 FP16 或 INT8，并以 512–768 像素长边推理。模型应按需加载，界面明确显示下载大小、后端和推理时间。加载失败时继续使用经典照片分析。

## 程序接口

模型适配器只需要实现统一接口：

```js
await provider.load({ backend: 'webgpu' });
const maps = await provider.infer(image, {
  width: 512,
  outputs: ['boundary', 'geometry']
});
```

输出必须包含尺寸、浮点置信度、模型名称、版本和预处理描述。主线程把图片送入 Worker；Worker完成缩放、归一化、推理与回传。缓存键由图片哈希、模型版本和推理参数组成。

## 融合策略

不要用神经图完全覆盖经典边缘。初版采用可解释的置信融合：

```text
stableBoundary = max(multiscaleClassic,
                     neuralBoundary × geometryConfidence)
texture        = classicTexture × (1 - neuralBoundary)
filament       = classicRidge，除非神经模型明确否定前景
```

结构轮廓要求跨尺度或神经几何至少一项稳定；纹理线必须受到区域细节预算限制；胡须等细丝继续由专门的脊线检测器负责。

## 实验设计

固定相同的照片、种子和下游参数，比较三列：经典算法、神经线稿直接矢量化、融合路线。记录质量面板全部指标、推理时间、模型下载大小和峰值内存，并进行盲选。只有当融合路线在轮廓召回上提高，同时没有显著增加虚假细节和短碎线，才进入默认流程。

## 可复用项目

- Informative Drawings官方实现：<https://github.com/carolineec/informative-drawings>
- Informative Drawings浏览器 ONNX 示例：<https://github.com/josephrocca/image-to-line-art-js>
- ONNX Runtime Web文档：<https://onnxruntime.ai/docs/tutorials/web/>

