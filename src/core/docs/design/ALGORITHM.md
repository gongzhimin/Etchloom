---
title: 核心模块离散算法与物理仿真规范
status: Active
doc-id: ALG-CORE
owner-module: core
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-11T01:08:00+08:00
---

# 核心模块离散算法与物理仿真规范 (ALG-CORE)

## 1. 算法背景与数学模型

本模块承载莫兰迪版画系统的底层物理与几何数学计算，包含 5 阶段离散图像管线以及 2D 偏微分方程虚拟铜版物理仿真：

### 1.1 5 阶段离散解算数学模型
1. **阶段 1：灰度线描感知抽取**：基于双尺度高斯差分算子 (DoG) 与自适应几何边缘退避算子：
   $$DoG(x, y) = G_{\sigma_1} * I(x, y) - \gamma \cdot G_{\sigma_2} * I(x, y), \quad \sigma_1 = 0.8, \sigma_2 = 1.6, \gamma = 0.98$$
2. **阶段 2：色调分解与几何切线场**：基于何恺明导向滤波（Guided Filter）的低频体积分解：
   $$a(x, y) = \frac{\text{cov}(I, p)}{\text{var}(I) + \epsilon}, \quad b(x, y) = \bar{p} - a \cdot \bar{I}, \quad T_{\text{base}} = \bar{a} \cdot I + \bar{b}$$
3. **阶段 3：空间骨干轮廓追踪与空气透视**：Sobel 梯度子像素微调与深度线宽衰减方程：
   $$\text{depthScale}(z) = \begin{cases} 1.0 & z \le 0.35 \\ \max(1.0 - \alpha_{\max}, 1.0 - \alpha_{\max} \cdot \frac{z - 0.35}{0.65}) & z > 0.35 \end{cases}$$
4. **阶段 4：顺形曲面排线与 Jobard-Lefer 流线积分**：曲率自适应配额释放与 Runge-Kutta 2 阶 (RK2) 双向流线积分：
   $$(x', y') = (x_k, y_k) + \frac{ds}{2} \cdot \vec{v}(x_k, y_k), \quad (x_{k+1}, y_{k+1}) = (x_k, y_k) + ds \cdot \vec{v}(x', y')$$
5. **阶段 5：母版矢量合成**：基于笔划角色（`contour` / `hatch` / `cross`）的微刻深度归一化赋值。

### 1.2 2D 偏微分酸液咬蚀物理模型
仿真空间建立在连续一维数组模拟的二维网格上。反应动力学时间步长经过真实物理秒定标，引入有效反应速率因子 $\Delta t_{\text{eff}} = \Delta t \times 0.4$。未被防蚀漆阻断的像素满足：
- **侧向侧蚀扩散 (Lateral Under-cutting)**：
  $$E^{t+\Delta t}(x, y) = \min\left(1.0, E^t(x, y) + \max(0, E_{\text{edge}} - E^t(x, y)) \cdot \Delta t_{\text{eff}} \cdot S \cdot (0.14 + G \cdot \eta(x, y) \cdot 0.55)\right)$$
- **纵向咬蚀深化 (Vertical Bite Deepening)**：
  $$D^{t+\Delta t}(x, y) = \min\left(1.0, D^t(x, y) + E^{t+\Delta t}(x, y) \cdot \Delta t_{\text{eff}} \cdot S \cdot 0.058 \cdot (1.0 + G \cdot (\eta(x, y) - 0.5))\right)$$
- **金属毛刺钝化溶解 (Burr Dissolution)**：
  $$B^{t+\Delta t}(x, y) = \max\left(0, B^t(x, y) - \Delta t_{\text{eff}} \cdot S \cdot 0.14\right)$$

## 2. 算法流程与伪代码

```text
算法 1: 5 阶段管线主解算流程
输入: 图像像素矩阵 I, 参数选项 Opt
输出: 矢量母版 MasterResult

1: // 阶段 1: 边缘提取与降级回退
2: Sketch <- CallAIService(I) 超时降级至 DoGFilter(I)
3: // 阶段 2: 积分图加速导向滤波
4: (BaseTone, DetailTone, FlowField) <- GuidedFilterDecomposition(I, Opt)
5: // 阶段 3: 8-邻域中心线追踪与子像素修正
6: Contours <- TraceCenterlinesWithSobel(Sketch, DepthMap, Opt)
7: // 阶段 4: Jobard-Lefer 流线积分
8: Hatches <- JobardLeferRK2Streamlines(FlowField, BaseTone, SpatialHashGrid)
9: // 阶段 5: 母版封装与深度赋予
10: return PackageMasterResult(Contours, Hatches)
```

## 3. 边界条件与数值稳定性

1. **导向滤波方差下界**：计算协方差与方差时，分母必须增加正则化系数 $\epsilon = 10^{-4}$，防止纯平坦单色区域除零产生 NaN。
2. **空间网格碰撞桶越界**：网格加速单元按 $d_{\text{cell}} = d_{\text{sep}}$ 划分，坐标映射索引必须执行 `clamp(0, maxBucket - 1)` 边界收敛。
3. **双缓冲因果一致性**：酸液侧向扩散更新采用预分配的 `nextExposedField`，解算完成后一次性通过 `.set()` 回写，防止原地更新造成非对称扩散偏差。
4. **局部脏包围盒 (Dirty AABB) 稀疏裁剪**：工坊仅在有手工划线或补漆扰动的有效包围盒区域 `[minX, minY, maxX, maxY]` 内解算偏微分扩散，未受触碰的平坦基底在最外层以 $O(1)$ 忽略。
5. **矢量笔触分桶批处理 (Batched Vector Rendering)**：针对 7,000+ 笔画的离散排线，按线宽离散化分桶，利用统一 `Path2D` 批量绘制，消除高频 Canvas 状态切换开销。
6. **铜版局部脏矩形提交 (Dirty Rect Partial Blit)**：手工刻绘与局部酸蚀时，仅遍历并重算受扰动脏矩形 `[startX, startY, endX, endY]` 范围内的像素，并通过 Canvas 7 参数形式 `putImageData(im, 0, 0, sx, sy, sw, sh)` 局部位块传输，避免高分辨率全幅重绘。
7. **参数滑块拖拽交互分级 (Slider Drag LOD Draft)**：在高频连续拖拽过程中激活 `isDraft: true`，将轮廓种子扫描步长由 2px 放宽至 4px，将排线种子步长放宽至 3.0 倍间距并截断最大流线步数；在拖拽释放后触发 `isDraft: false` 全精密度重算与缓存固化。
8. **工作线程无阻塞离线解算 (Off-thread Worker Preemption)**：管线五阶段计算完全托管于专用 `Worker` 线程，通过跨线程消息与 `AbortController` 信号传递，主线程帧率保持 60 FPS，任务切换中断延迟 $\le 5\text{ms}$。
9. **胶片栏分块渐进切片流 (Progressive Chunk Streaming)**：胶片栏首次渲染仅绘制切片 0（前 600 条轮廓与主影线），首笔出现耗时 (Time to First Visual Stroke) 从 45ms 骤降至 $< 6\text{ms}$，其余笔划以每帧 1,200 条调度，在重算时立即可逆抢占。
10. **粗粒度空间网格视锥裁剪 (Spatial Frustum Culling)**：放大镜与局部视口采用 $64 \times 64$ 均匀空间网格，仅遍历与当前视锥 AABB 轴对齐相交的有限网格桶，无效路径几何剔除率 $> 85\%$。
11. **WebGL2 多物理场片元并行着色 (WebGL2 Press Hardware Pipeline)**：压印渲染将 `depth`、`exposed`、`burr`、`blocked` 与 `grainNoise` 映射为纹理采样单元，由 GPU 并行片元着色器实时解算纸张纤维、压痕与油墨流变转印，全画幅重绘降至 $< 4\text{ms}$，不支持环境下自动回退为 CPU 软件光栅。
12. **工艺上版直通与 AABB 紧缩传输 (Direct Transfer & Tight AABB Blit)**：工艺向导上版采用线宽分桶批量绘制，且仅对包含有效母版线条的并集 AABB 包围盒范围读取像素，避免全尺寸 6.6M 像素全量遍历。
13. **像素级灰度映射 256 阶 LUT 查表化 (256-Entry LUT Fast Path)**：全画幅明暗校正构建 256 字节紧凑表，规避逐像素多重浮点幂次解算，单幅校正时延从 66ms 骤降至 $< 2\text{ms}$。
14. **种子传播队列常数级出队与 EDT 原地求根 (O(1) Queue & In-Place EDT)**：Jobard-Lefer 种子队列采用游标读指针替代 $O(N)$ 数组移位，消除 $O(N^2)$ 移位惩罚；欧氏距离变换 (EDT) 原地求平方根，杜绝额外 Float32Array 缓冲区分配。
15. **铜版历史快照毛刺场按需稀疏锁存 (Sparse Burr Snapshot)**：铜版撤销栈仅在实际发生干刻 (`hasBurr: true`) 时锁存毛刺层，常规腐蚀版画单步快照立省 26.4MB (3K 分辨率)。

## 4. 复杂度分析与性能基准

| 算法子系统 | 时间复杂度 | 空间复杂度 | 性能指标 (1024x1024 画布) |
| :--- | :--- | :--- | :--- |
| **积分图平滑** | $O(W \times H)$ | $O(W \times H)$ Float64 | $< 18\text{ms}$ |
| **导向滤波** | $O(W \times H)$ | $O(W \times H)$ Float32 | $< 45\text{ms}$ |
| **全画幅明暗校正 (256 阶 LUT)** | $O(W \times H)$ 查表直接寻址 | $O(1)$ (256 字节表) | $< 2\text{ms}$ (原 66ms) |
| **Jobard-Lefer 排线 (全精度)** | $O(N_{\text{samples}})$ (空间散列桶) | $O(N_{\text{buckets}})$ | $< 120\text{ms}$ |
| **Jobard-Lefer 排线 (拖拽草稿 LOD)** | $O(N_{\text{samples}} / 4)$ | $O(N_{\text{buckets}})$ | $< 25\text{ms}$ |
| **2D 偏微分酸液模拟 (全画幅)** | $O(W \times H \times \text{steps})$ | $O(W \times H)$ 双缓冲 | $< 25\text{ms}$ / 单步 |
| **2D 偏微分酸液模拟 (局部脏 AABB)** | $O(W_{\text{box}} \times H_{\text{box}} \times \text{steps})$ | $O(1)$ 局部包围盒 | $< 3\text{ms}$ / 单步 |
| **铜版手工刻绘局部渲染 (脏矩形 Blit)** | $O(W_{\text{box}} \times H_{\text{box}})$ | $O(1)$ 复用缓冲区 | $< 0.3\text{ms}$ / 单笔印压 |
| **矢量排线批量光栅化** | $O(N_{\text{strokes}})$ 分桶批处理 | $O(K_{\text{buckets}})$ | $< 8\text{ms}$ (7,800+ 笔画) |
| **分块渐进切片首笔流 (TTFS)** | $O(M_{\text{initial}})$ (M=600) | $O(M)$ | $< 6\text{ms}$ (即时响应) |
| **Worker 离线计算与抢占响应** | $O(1)$ 线程消息传递 | $O(W \times H)$ 传输通道 | $< 5\text{ms}$ 抢占延时 |
| **空间网格视锥裁剪局部查询** | $O(K_{\text{cells}} + N_{\text{frustum}})$ | $O(W \times H / 4096)$ 网格桶 | $< 0.5\text{ms}$ 视锥查询 |
| **WebGL2 硬件压印并行渲染** | $O(1)$ GPU 片元管线 | $O(W \times H)$ 纹理显存 | $< 4\text{ms}$ (3K 全画幅) |
| **工艺上版 AABB 紧缩位块传输** | $O(W_{\text{art}} \times H_{\text{art}})$ | $O(1)$ 动态有界位图 | $< 35\text{ms}$ 上版转场 |
| **全版静物合成基准生成** | $O(N_{\text{total}})$ 复合管线 | 动态工作集 | $< 430\text{ms}$ (原 811ms, 峰值 RSS 206MB) |

## 5. 验证与黄金样本

1. **物理单调递增性验证**：在未刮磨且持续浸酸条件下，全局腐蚀深度 $D(x, y)$ 必须单调递增，即 $\forall t_2 > t_1, D^{t_2}(x, y) \ge D^{t_1}(x, y)$；
2. **防蚀漆零腐蚀验证**：覆盖防蚀漆区域（$M[i] == 1$）在酸槽中经历任意时间步后，深度必须保持不变（误差 $\le 10^{-7}$）；
3. **黄金样本回归**：`tests/core-pipeline.test.js` 固化标准莫兰迪静物测试图像，断言生成笔画总数与拓扑闭合度处于公差范围内。
