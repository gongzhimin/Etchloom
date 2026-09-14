# Informative Drawings → Etchloom

Etchloom 接收 Informative Drawings 推理产生的 `*_out.png`，把其中的黑色与抗锯齿灰色直接映射为防蚀层开口。此路径不再执行素描增强、轮廓补全、排线生成或随机风格化；模型负责图像理解，Etchloom 负责制版、腐蚀、上墨、压力、纸张和印样。

当前工作流：在原项目或 Hugging Face Demo 生成线稿；保存 PNG；在 Etchloom 选择“AI 线稿直制版”并上传；检查线稿保留和白底保留；进入制版。

后续可增加一个独立的本机 Python 推理服务。网页只向 `localhost` 上传照片并接收 PNG，不把 PyTorch 1.7.1、CUDA 和模型权重打进前端。集成时保留 Caroline Chan 项目的 MIT 版权声明。
