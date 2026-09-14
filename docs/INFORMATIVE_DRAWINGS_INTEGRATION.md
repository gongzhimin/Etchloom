# Informative Drawings → Etchloom

Etchloom 接收 Informative Drawings 推理产生的 `*_out.png`，把其中的黑色与抗锯齿灰色直接映射为防蚀层开口。此路径不再执行素描增强、轮廓补全、排线生成或随机风格化；模型负责图像理解，Etchloom 负责制版、腐蚀、上墨、压力、纸张和印样。

当前默认工作流：运行 `npm run model:start` 启动 `127.0.0.1:7861` 的本机服务；在 Etchloom 选择“本机模型生成并制版”；上传照片；网页调用 `/infer` 获得 PNG；检查模型输出与像素制版映射；进入制版。服务仅监听本机地址，使用可用的 CUDA GPU，并限制输入为 20 MiB。

服务复用兼容的本机 PyTorch 环境，不把 PyTorch、CUDA 和模型权重打进前端。权重保存于忽略版本控制的 `services/informative_drawings/weights/model.pth`。集成保留 Caroline Chan 项目的 MIT 版权声明。

## 首次配置

```powershell
python -m pip install -r services/informative_drawings/requirements.txt
npm run model:download
```

下载脚本从官方 Hugging Face Space 获取 `model.pth`，并校验 SHA-256 `C686CED2A666B4850B4BB6CCF0748031C3EDA9F822DE73A34B8979970D90F0C6`。若当前系统代理不可用，可以运行 `powershell -File scripts/download-model.ps1 -NoProxy`。

## 启动与检查

分别打开两个终端：

```powershell
npm run model:start
npm start
```

模型服务提供 `GET /health` 和 `POST /infer`。网页仅向 `127.0.0.1:7861` 发送原始照片，服务返回灰度 PNG；图片不会上传到第三方。CUDA 可用时自动使用 GPU，否则回退到 CPU。推理前会将长边限制为 1024 像素，并补齐到网络下采样所需的 4 像素倍数，输出再恢复到输入尺寸。

若启动脚本没有选中所需环境，可先设置 `$env:ETCHLOOM_MODEL_PYTHON='C:\path\to\python.exe'`。模型结构与权重来自 Informative Drawings，上游许可证见 `services/informative_drawings/UPSTREAM_LICENSE`。
