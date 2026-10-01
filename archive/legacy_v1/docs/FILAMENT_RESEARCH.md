# 细丝轮廓算法调研与路线

更新：2026-09-13。

## 问题

照片中的一根深色胡须通常会形成两条强梯度边缘。旧算法把两边都当作普通轮廓，同时还可能在中间加入排线和微细节，因此胡须比脸部剪影更黑、更粗。单纯降低轮廓参数会连带削弱器皿、建筑和主体外缘，不能解决结构层级。

## 当前实现

Etchloom 先沿候选轮廓的法线检查截面：近处进入深色线芯、远处又回到较亮背景，并且大尺度边缘响应明显弱于细尺度响应时，将它判作窄线结构。连续细丝区段随后会：

1. 向截面最暗处移动，近似合并同一根线的双边缘；
2. 使用普通剪影不足 60% 的线宽，并在端点渐隐；
3. 从邻近的排线与微细节层中挖出保护带，避免重复加黑；
4. 保留固定种子的确定性，也不增加运行依赖。

第二轮已经加入三个尺度的 Hessian 响应。算法在每个尺度上比较两个主曲率，只接受两侧都比线芯更亮的暗脊，因此不会把普通主体剪影误判为细丝；非极大值抑制取得中心像素，邻接图再按切线连续性追踪路径。多尺度结果会合并平行重复线，并记录估计源宽度。端点周围的暗部支撑决定根部方向，渲染时保持根部力度并只向自由端渐细。

这仍是适合浏览器的轻量实现，没有引入 OpenCV 或机器学习依赖。它现在可以保留低反差孤立细丝，并排除单侧明暗边界；在断口较宽、交叉毛发、复杂遮挡和纹理背景中仍可能断段或误连。

## 可借鉴的算法与项目

### 亚像素线中心与宽度

Carsten Steger 的曲线结构检测把线及其两侧背景作为截面模型，利用 Hessian 的特征方向寻找亚像素中心，并估计线宽；论文也专门处理不对称背景导致的中心偏移。这比二值化后骨架化更适合“从两条边缘恢复一根胡须”。OpenCV 的 `RidgeDetectionFilter` 提供 Hessian 脊线检测入口，可用来快速验证尺度与阈值，不过 Etchloom 更适合独立实现一个小型、多尺度版本，继续保持零运行依赖。

- Steger, *An Unbiased Detector of Curvilinear Structures*: <https://mv.in.tum.de/_media/members/steger/publications/1996/fgbv-96-03-steger.pdf>
- OpenCV RidgeDetectionFilter: <https://docs.opencv.org/4.9.0/d4/d36/classcv_1_1ximgproc_1_1RidgeDetectionFilter.html>

### 连贯方向场

Coherent Line Drawing 用 Edge Tangent Flow 平滑相邻边缘方向，再沿流场执行各向异性的差分高斯滤波。它适合解决毛发和轮廓的碎裂，也能让周围排线顺着形体组织。MIT 许可的 `colidr` 实现暴露了 ETF 迭代次数、核半径和 FDoG 参数，可作为参数行为参考。

- Kang et al., *Coherent Line Drawing*: <https://doi.org/10.1145/1275808.1276401>
- `esimov/colidr`: <https://github.com/esimov/colidr>

### 骨架化与路径整理

Zhang–Suen、Guo–Hall thinning 能把二值窄区压成单像素骨架，适合作为遮罩清理或原型对照。它依赖阈值、容易产生毛刺，也丢失亚像素中心和原始宽度，因此不应成为主检测器。

- OpenCV ximgproc thinning: <https://docs.opencv.org/5.0/extra_modules/ximgproc.html>

`DrawingBotV3` 与 `ScribbleTrace` 展示了图像转矢量绘图中很实用的后半程：路径排序、抬笔距离、强度驱动的排线以及设备标定。这些能力适合 Etchloom 未来的 SVG 与实体绘图机流程。两者均为 GPL-3.0 项目；当前仓库采用 MIT，因此只研究公开算法与交互思路，不直接复制其代码。

- `SonarSonic/DrawingBotV3`: <https://github.com/SonarSonic/DrawingBotV3>
- `kylberg/ScribbleTrace`: <https://github.com/kylberg/ScribbleTrace>

向量流与灰度引导的草图生成研究还展示了另一条路线：用量化方向、灰度层级和绘制顺序共同安排笔画。其官方实现包含猫与狗的配置，可帮助评估动物毛发场景；但完整机器学习流程明显重于 Etchloom 当前的本地零依赖架构，近期只吸收方向和笔画层级的设计。

- *Sketch Generation with Drawing Process Guided by Vector Flow and Grayscale*: <https://github.com/peternara/Sketch-Generation-with-Drawing-Process-Guided-by-Vector-Flow-and-Grayscale-edge_tangent_flow>

## 后续精进顺序

1. **多尺度脊线响应 — 初版完成**：三个尺度的 Hessian 特征值已经用于求中心、方向、极性和近似宽度，后续用连续尺度插值提高亚像素精度。
2. **连接图与单向渐隐 — 初版完成**：相邻脊点已经按切线连续性连接，根部由端点暗部支撑判断；后续增加跨越短断口的图连接和分叉裁决。
3. **遮挡与交叉关系**：在胡须交叉、穿过毛发或复杂背景时维护前后顺序，只让可见段贡献墨色。
4. **ETF 局部方向场**：让脸部、毛发和背景排线在细丝两侧形成连贯方向，同时保留细丝自己的独立中心线。
5. **物理输出标定**：以目标针宽、腐蚀扩张和纸张吸墨为约束，设置最小可印线宽与线间距，并优化 SVG 路径顺序。

每一步都使用固定的胡须、头发、天线、树枝和电线样片，在缩略图、100% 屏幕和实际印样三个尺度比较。首先检查结构是否被识别，其次检查强弱层级，最后才增加纹理数量。
