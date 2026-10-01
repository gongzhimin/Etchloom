# Etchloom 版画质量评价体系

更新：2026-09-14。

## 评价目标

版画不是原照片的压缩副本。像素误差、PSNR 或普通 SSIM 会把排线替换灰色、纸面留白和轮廓概括都视为错误，因此不能单独代表质量。Etchloom 应保留一组彼此独立的指标，并将它们分为三层：内容忠实度、版画语言质量和人工偏好。

初期不发布一个带小数点的“总分”。总分会掩盖失败原因，也容易让算法通过增加线条骗取细节分。界面应显示指标卡；只有收集人工成对偏好后，才能拟合用于候选排序的综合分数。

## 第一层：内容忠实度

### 1. 轮廓保真度

从原图的跨尺度稳定边界得到参考集合 `E`，从版画的主轮廓、遮挡线和形体线得到集合 `P`。允许约 1–2 个分析像素的艺术偏移，以距离变换匹配：

```text
precision = P 中落在 E 容差带内的比例
recall    = E 中被 P 容差带覆盖的比例
F1        = 2PR / (P + R)
```

Precision 低表示出现虚假轮廓；Recall 低表示主体边缘丢失。APDrawingGAN同样使用距离变换处理照片特征与艺术线条并非逐像素对齐的问题。Boundary IoU可作为有主体分割标注时的补充。

### 2. 明暗关系

先把最终路径按实际线宽栅格化并轻度低通，得到局部墨量图 `I`；把原图去噪并低通，得到明暗图 `T`。同时报告：

- **调子相关性**：`corr(I, 1-T)`，衡量空间上的明暗一致。
- **五档次序**：原图五个明暗档中，平均墨量是否随暗度增加。
- **区域误差**：逐个稳定明暗区比较平均墨量，避免大背景支配全局数值。
- **高光保护**：原图高光区未被墨线覆盖的比例。
- **暗部堵塞**：深暗区中完全连成黑块的面积比例。

相关性比灰度均方误差更适合，因为版画只需保持明暗顺序和空间结构，不必复制连续灰度。

### 3. 细节保留

“线条多”不等于细节丰富。应把原图中跨尺度稳定的小结构作为目标，分开统计：

- **细节召回率**：眼睛、胡须、花蕊、器皿反光等稳定细节被刻线覆盖的比例。
- **虚假细节率**：版画细线附近没有任何稳定图像证据的比例。
- **细节预算利用率**：主体关键区使用的细线数量除以全部细线数量。
- **尺度覆盖**：大轮廓、中等结构、小细节三个尺度是否同时存在。

只有“高召回 + 低虚假率”才能称为丰富。可在固定样例中手工标 20–50 个关键点，作为可靠的小型测试集。

### 4. 形体与语义

对于神经辅助路线，可增加深度或语义可恢复性：由版画预测单目深度，再与原图深度排序比较；或比较原图和版画的图像语义特征。Informative Drawings正是用几何解码损失和语义损失训练照片到线稿模型。这类指标能发现“边缘位置大致正确，但猫脸已经不像猫”的失败。

## 第二层：版画语言质量

这些指标不需要原图，用于识别技术上忠实但视觉上不像版画的结果。

| 指标 | 衡量问题 | 建议方向 |
|---|---|---|
| 短碎线率 | 路径长度低于物理阈值的比例 | 越低越连贯，细节线单独统计 |
| 主轮廓断点密度 | 每 100 mm 主轮廓的非端点断裂数 | 越低越好 |
| 切线连贯度 | 相邻刻线方向的局部一致性 | 曲面内高，纹理交界可下降 |
| 排线碰撞率 | 非交叉层中的意外相交 | 越低越好 |
| 层级可分性 | 主轮廓、形体、材质、细丝的线宽分布间隔 | 应稳定有序 |
| 调子嵌套率 | 暗档是否继承亮档刻线 | 越高越稳定 |
| 空间节奏 | 局部线密度的过度突变 | 区域内部平稳，边界处允许变化 |
| 可印刷性 | 最小线距、最短路径、墨覆盖率是否适合目标尺寸 | 必须满足输出介质约束 |

## 第三层：人的判断

建立固定的 A/B 盲测，每次只问一个问题：主体与空间是否清楚、明暗是否可信、是否像人工蚀刻、细节是否有选择、是否愿意打印。每对方案至少获得 5 次判断，用 Bradley–Terry 或 Elo 得到相对排序，再校准综合分权重。

神经感知距离可作为辅助：LPIPS用深层特征拟合人类相似判断；DISTS进一步区分结构与纹理，并容忍纹理的合理重排。它们仍需用 Etchloom 自己的版画样本验证，不能直接充当审美分。

## 已实现的初版

`src/core/quality-metrics.js` 已实现容差轮廓 Precision/Recall/F1、低频调子相关性、五档明暗次序、高光留白和短碎线率。运行 `npm run quality` 会生成 `QUALITY_REPORT.json`。报告用于同一固定样例跨版本比较，不应把不同照片的数值直接相互排名。

## 神经网络路线调研

没有发现一个成熟、开源、同时输出可编辑矢量刻线、可控交叉排线和虚拟版深度的端到端项目。现有工作可以分成三组。

### 最值得接入：照片到信息线稿

- **Informative Drawings**：适用于一般照片，使用未配对训练，显式要求线稿保留几何与语义；官方代码和预训练模型公开。最适合作为可选的 `edgeConfidence` 来源。
- **APDrawingGAN**：用全局与人脸局部网络生成艺术肖像线稿，并用距离变换损失处理艺术线条偏移。适用域主要是人像。
- **Quality Metric Guided Portrait Line Drawing**：处理未配对照片与稀疏线稿的信息不平衡，避免 CycleGAN 把不可见重建噪声藏进线稿。这与抑制素描杂点高度相关。
- **Im2Pencil**：把轮廓和调子分开并提供风格控制，适合作为完整素描路线的参考中间层。

### 可作基线：通用风格迁移

Gatys 式神经风格迁移、AdaIN、ArtFlow等能迁移局部纹理统计，但没有刻线拓扑、线宽层级、交叉排线嵌套和可印刷性约束。它们能生成“像蚀刻的位图”，却容易改变轮廓或用伪纹理填满高光，适合做视觉基线，不适合直接成为核心生成器。

### 推荐架构

```text
照片
 ├─ 经典跨尺度边界 ─────────────┐
 ├─ 神经线稿 / 几何置信度 ──────┼→ 融合置信图
 └─ 去噪低频明暗 + 区域图 ──────┘
                                  ↓
              Etchloom 矢量轮廓 + TAM 排线 + 制版模型
```

第一阶段可把 Informative Drawings 的 ONNX 模型作为可选本地模块，只输出线条置信图。第二阶段再训练一个小型融合网络，输入经典边缘、神经线稿、低频明暗和区域图，输出 `boundary / form / texture / filament` 四类置信度。训练损失直接对应上述评价向量。

## 资料

- Boundary IoU: <https://openaccess.thecvf.com/content/CVPR2021/html/Cheng_Boundary_IoU_Improving_Object-Centric_Image_Segmentation_Evaluation_CVPR_2021_paper.html>
- APDrawingGAN论文: <https://openaccess.thecvf.com/content_CVPR_2019/html/Yi_APDrawingGAN_Generating_Artistic_Portrait_Drawings_From_Face_Photos_With_Hierarchical_CVPR_2019_paper.html>
- APDrawingGAN代码: <https://github.com/yiranran/APDrawingGAN>
- Informative Drawings论文: <https://openaccess.thecvf.com/content/CVPR2022/html/Chan_Learning_To_Generate_Line_Drawings_That_Convey_Geometry_and_Semantics_CVPR_2022_paper.html>
- Informative Drawings代码: <https://github.com/carolineec/informative-drawings>
- 浏览器 ONNX 移植示例: <https://github.com/josephrocca/image-to-line-art-js>
- Quality Metric Guided Portrait Line Drawing: <https://arxiv.org/abs/2202.03678>
- Im2Pencil: <https://arxiv.org/abs/1903.08682>
- LPIPS: <https://openaccess.thecvf.com/content_cvpr_2018/html/Zhang_The_Unreasonable_Effectiveness_CVPR_2018_paper.html>
- DISTS: <https://arxiv.org/abs/2004.07728>
