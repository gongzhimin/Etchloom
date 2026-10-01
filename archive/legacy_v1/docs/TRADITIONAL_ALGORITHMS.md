# 非神经版画算法调研

更新：2026-09-14。

## 结论

传统算法仍然是 Etchloom 的主干。它们确定、可解释、能输出矢量路径，也更容易满足真实线宽与最小线距。传统机器学习最适合改善“哪些边是物体边界”；几何与 NPR 算法最适合解决“怎样把明暗变成漂亮刻线”。

## 值得实验的算法

| 算法 | 类型 | 能解决的问题 | 网页实施成本 | 优先级 |
|---|---|---|---|---|
| Structured Forests | 随机森林、结构化预测 | 区分物体边界与局部纹理，识别直线和 T/Y 结点 | 中；需移植模型推理 | A |
| ETF + FDoG/FBL | 方向场与非线性滤波 | 连接弱轮廓、抑制噪声、沿形体生成连续线 | 中；CPU Worker 或 WebGL | A |
| gPb + UCM | 多尺度梯度、谱聚类 | 从边缘建立封闭层级区域 | 高；谱步骤较重 | B |
| SLIC/图分割 + 区域邻接图 | 聚类与图算法 | 稳定明暗区域、遮挡关系、区域细节预算 | 低至中 | A |
| Tonal Art Maps | NPR 纹理层级 | 五档排线继承、跨调子一致性 | 低 | A |
| Weighted Voronoi Stippling | 优化与计算几何 | 暗部颗粒、水彩铜版与点刻调子 | 中；可在 Worker 迭代 | B |
| Poisson-disk / blue-noise | 随机采样 | 避免规则网纹和颗粒团聚 | 低 | A |
| LIC / streamline tracing | 向量场积分 | 曲面顺形排线和毛发方向 | 中 | A |
| Error diffusion / DBS | 半色调优化 | 受限输出分辨率下保持平均调子 | 低至中 | C |
| Active contours / level sets | 能量最小化 | 用户给少量提示后贴合主体边界 | 中 | B |

## 传统机器学习：Structured Forests

Structured Forests不是神经网络。它让随机决策森林从局部图像块预测一小块结构化边缘掩模，能学习直线、平行线、T 结点和 Y 结点等局部模式。论文报告其边缘检测速度和跨数据集泛化都很好。对 Etchloom 来说，它可以生成一个额外的边界置信图，与跨尺度经典梯度取加权最大值。

优势是模型较小、CPU 可运行、结果确定；限制是训练数据中的“边界”未必等于蚀刻艺术家会保留的线。应只用作置信证据，不能直接输出刻线。

论文：<https://openaccess.thecvf.com/content_iccv_2013/html/Dollar_Structured_Forests_for_2013_ICCV_paper.html>

## 方向场：ETF、FDoG 与 FBL

ETF把图像梯度旋转成边缘切线，并在邻域内对方向做保特征平滑。FDoG沿梯度方向检测边缘，再沿弯曲切线积分响应，因此比逐像素 Canny/DoG 更容易形成长而干净的线；FBL则沿方向场做双边平滑，使区域更清晰。它正对应目前照片路线的断线和碎线问题。

论文：<https://www.umsl.edu/~kangh/Papers/kang_tvcg09.pdf>

## 区域与层级：SLIC、区域邻接图和 gPb/UCM

先分割再刻线，可以把“哪里需要线”和“线朝哪里走”分开。SLIC或图分割得到局部区域，区域邻接图记录面积、平均明度、纹理和是否接触背景；相邻区域差异决定轮廓类型。gPb/UCM进一步提供从弱边缘到强封闭轮廓的层级，但网页实时实现成本较高。当前 `toneRegions` 是这条路线的简化原型，下一步应增加小区域合并和层级阈值。

## 调子：Tonal Art Maps

TAM不是简单准备五张互不相关的排线图片。更暗的调子必须继承较亮调子已有的线，再增加新线；不同分辨率也保持笔触一致。它可以直接解决“变暗时只是线条变粗”和调子闪烁的问题。

论文与项目页：<https://gfx.cs.princeton.edu/gfx/pubs/Praun_2001_RH/index.php>

## 点刻：Weighted Voronoi Stippling

加权质心 Voronoi迭代会根据原图暗度移动点，使暗区点密、亮区点疏，同时避免完全随机采样产生团块和规则伪影。这适合 aquatint、点刻和深暗区颗粒，不应取代主体轮廓。

论文：<https://lhf.impa.br/cursos/rr/p37-secord.pdf>；WebGL实现：<https://github.com/repwolfe/stippling>

## 推荐实施顺序

1. 完成 ETF/FDoG 和小区域合并，直接改善当前照片路线。
2. 用五档 TAM 替换独立随机排线，并把调子次序加入持续回归。
3. 加入 blue-noise 点刻作为暗部可选词汇。
4. 用 Structured Forests 做一次离线 A/B；只有它显著提高轮廓召回且不增加虚假边缘时，才考虑网页模型。
5. 最后评估 gPb/UCM。它效果可能强，但计算和实现成本最高。

