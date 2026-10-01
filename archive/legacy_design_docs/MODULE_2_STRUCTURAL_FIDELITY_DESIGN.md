# Module ② 结构保真度与排线几何顺形重构设计规范

本文档针对 10 组真实测试用例（特别是 `case10_temple`、`case05_pot`、`case08_plate`、`case09_cabinet` 等）中暴露的 **“Informative Drawings 细节大量丢失（丢失率 30%~60%）”、“排线阴影物理流向违和（屋顶斜切、拱圈横断）”、“交叉排线严重滥用（屋顶与食物变成铁丝网）”** 与 **“关键焦点牌匾字迹被乱线穿透”** 核心缺陷，提出高保真、模块化、低复杂度的彻底重构方案。

---

## 1. 核心设计原则（Simplicity & Structural Fidelity）

1. **细节全量保全（Zero Detail Sacrificed）**：
   - Informative Drawings 神经网络输出的线条无论深浅均具备极高的造型价值。Stage 3 提取率必须提升至 **$\ge 90\%$**（平均遗漏率从目前的 $43.5\%$ 压减至 $10\%$ 以内）。
2. **刚性几何顺形锚定（Rigid Plane Alignment）**：
   - 彻底废止大尺度一刀切高斯模糊。在建筑瓦陇、门窗立柱、水面波光、机械轮廓区域，排线矢量场**强制锁定在结构轮廓切向（Structure Tangent Clamping）**，严禁横向斜切。
3. **屋面与开阔平面严禁交叉网（Strict Single-Direction Rule）**：
   - 交叉排线（Cross-Hatching）是版画中刻画深渊暗核的极限手段，激活阈值提高至 **$T \ge 0.82$**。
   - 屋顶瓦坡、陶罐亮面、餐盘食物、木制板面**严格禁止双向交叉网**，一律采用高质量单向平行等距线。
4. **文化与视觉焦点绝对纯净保护（Focal Zone SDF Protection）**：
   - 对牌匾文字、动物眼部、关键雕刻建立 3~4px 的 **禁排线呼吸光晕（SDF Exclusion Halo）**，保证焦点文字绝对挺拔、不被任何排线切穿。
5. **模块解耦与极简主义（KISS）**：
   - 维持所有子模块为无状态纯函数（TypedArray in $\to$ TypedArray out），杜绝模块间隐式状态依赖。

---

## 2. 模块解耦结构与 API 契约

```
                     输入: Informative Drawings 浮点骨架 LineMap [0.0 ~ 1.0]
                                            │
                                            ▼
       ┌────────────────────────────────────────────────────────────────────────┐
       │  Sub-Module 3.0: 迟滞双阈值高保真轮廓提取器                            │
       │      `src/core/contours/contour-extractor.js`                          │
       │  - 迟滞阈值 (High: 0.85, Low: 0.92) + 1px 全像素追踪                    │
       │  - 恢复斗拱、瓦陇缝、牌匾笔画、微观短刻点苔 (存活率 >= 90%)             │
       └────────────────────────────────────┬───────────────────────────────────┘
                                            │ (Vector Contours, HighRes ContourMask)
                                            ▼
       ┌────────────────────────────────────────────────────────────────────────┐
       │  Sub-Module 2.2: 刚性结构切向场与各向异性张量引导                      │
       │      `src/core/hatching/hatch-geometry-flow.js`                        │
       │  - 建筑屋面/立柱/水面: 刚性锁定轮廓切向 (沿瓦陇向下顺坡流淌)            │
       │  - 有机曲面 (猫身/陶罐): 保持宏观法线立体包裹                           │
       └────────────────────────────────────┬───────────────────────────────────┘
                                            │ (Structure-Aligned FlowField)
                                            ▼
       ┌────────────────────────────────────────────────────────────────────────┐
       │  Sub-Module 2.3: 语义焦点与牌匾文字 SDF 呼吸保护                       │
       │      `src/core/hatching/hatch-focus-protection.js`                     │
       │  - 自动识别文字牌匾/微观雕刻/眼部焦点                                   │
       │  - 建立 3~4px 绝对禁刀留白保护槽，禁止任何排线穿透侵入                  │
       └────────────────────────────────────┬───────────────────────────────────┘
                                            │ (Protected Distance Field)
                                            ▼
       ┌────────────────────────────────────────────────────────────────────────┐
       │  Sub-Module 2.4: 物理分流阶梯排线引擎 (屋面封禁交叉网)                 │
       │      `src/core/hatching/hatch-streamline.js` (升级版)                  │
       │  - 瓦面/墙面/食物/织物: 100% 单向顺形疏密排线 (严禁菱形网)             │
       │  - 交叉线门槛提升至 T >= 0.82 (仅允许在殿门内腔、深渊暗核生效)          │
       └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 各子模块详细设计与 API 规范

### 3.1 Sub-Module 3.0: 迟滞双阈值高保真轮廓提取器 (`contour-extractor.js`)

**核心职责**：彻底解决原先 `contourThreshold: 0.65` 粗暴丢弃 40% 细节的问题，完整捕获浅灰结构线与点苔短线。

#### API 定义
```typescript
interface ExtractorOptions {
  highThreshold?: number;  // 强线种子阈值 (默认 0.85，原为 0.65)
  lowThreshold?: number;   // 弱线延伸阈值 (默认 0.92，捕获浅灰笔触)
  minPoints?: number;      // 最小笔触长度 (默认 2，保留微观雕饰与点苔)
  subPixel?: boolean;      // 开启沿梯度的亚像素精修 (默认 true)
}

/**
 * 迟滞阈值全像素轮廓矢量化
 * @param lineMap Informative Drawings 线稿 { width, height, data: Float32Array }
 * @param toneField 调子场
 * @param options 配置项
 * @returns { vectorContours: Array<ContourPath>, contourMask: Uint8Array }
 */
function extractHighFidelityContours(
  lineMap: { width: number; height: number; data: Float32Array },
  toneField: { width: number; height: number; tone: Float32Array },
  options?: ExtractorOptions
): { vectorContours: Array<any>; contourMask: Uint8Array };
```

#### 关键实现细节
1. **全像素 1px 扫描**：扫描循环步进由 `y+=2, x+=2` 还原为标准 `y++, x++`，绝不跳过任何孤立 1px 细线。
2. **Canny 式双阈值追踪**：
   - 凡是 `data[idx] <= highThreshold (0.85)` 的像素作为强线种子；
   - 在 8 邻域递归追踪时，允许沿着 `data[idx] <= lowThreshold (0.92)` 连续延展；
   - 彻底挽救牌匾书法飞白、斗拱缝隙与瓦当反差弱线。
3. **微观短刻点苔保留**：
   - `minPoints` 由 4 下调至 2，长度为 2~3 的微观短线转化为版画风格的“挑刀微刻（Flick Stipples）”。

---

### 3.2 Sub-Module 2.2: 刚性结构切向场引导 (`hatch-geometry-flow.js`)

**核心职责**：消除古建大殿屋顶被 45° 斜切排线的荒谬现象，让线条严格沿屋顶瓦陇纵向倾泻、沿罗马拱圈向心回转、沿水面水平铺展。

#### API 定义
```typescript
interface GeometryFlowOptions {
  edgeSnapStrength?: number; // 结构边缘切向吸附强度 [0.0 ~ 1.0], 默认 0.85
  roofSlopeMode?: boolean;   // 开启古建屋面顺直瓦陇吸附, 默认 true
  planarR?: number;          // 几何滤波半径 (默认 6px，取代原先过大的 25px)
}

/**
 * 融合结构轮廓切向的各向异性流向场
 * @param toneField 调子场
 * @param lineMap 线稿
 * @param vectorContours Stage 3 提取的矢量轮廓线
 * @param options 配置参数
 * @returns { ux: Float32Array, uy: Float32Array, vx: Float32Array, vy: Float32Array }
 */
function computeStructureAlignedFlow(
  toneField: any,
  lineMap: any,
  vectorContours: Array<any>,
  options?: GeometryFlowOptions
): { ux: Float32Array; uy: Float32Array; vx: Float32Array; vy: Float32Array };
```

#### 关键算法逻辑
1. **小尺度几何保真（Small-Scale Blur）**：
   - 宏观平滑半径从原先的 $25\text{px}$ 缩减至 **$6\text{px}$**，确保屋脊、檐角、柱梁的刚性折角法线不被抹平。
2. **结构切向张量吸附（Structural Tensor Snapping）**：
   - 在距主要结构轮廓线 $\le 8\text{px}$ 的区域，排线主向矢量 $\mathbf{u}(x, y)$ 强制投影并插值到**轮廓线的切向矢量** $\mathbf{t}_{\text{contour}}$：
     $$\mathbf{u}_{\text{final}} = (1 - w_{\text{edge}})\mathbf{u}_{\text{volume}} + w_{\text{edge}}\mathbf{t}_{\text{contour}}$$
   - **效果**：屋顶斜坡上的排线 $100\%$ 沿着瓦陇方向倾泻而下；门窗柱梁排线 $100\%$ 垂直平行；水面排线 $100\%$ 保持水平。

---

### 3.3 Sub-Module 2.3: 语义焦点与牌匾文字 SDF 呼吸保护 (`hatch-focus-protection.js`)

**核心职责**：为“大雄宝殿”等题字牌匾、人物五官、精密铭文开辟独立防护区，绝不允许排线穿刺字迹。

#### API 定义
```typescript
/**
 * 语义焦点防护掩模与安全距离场计算
 * @param lineMap 骨架线图
 * @param width 图像宽度
 * @param height 高度
 * @param options 配置参数
 * @returns { safeDistanceField: Float32Array, focusMask: Uint8Array }
 */
function computeSemanticFocusMask(
  lineMap: any,
  width: number,
  height: number,
  options?: {
    focusMargin?: number;       // 焦点文字呼吸留白半径 (默认 3.5px)
    characterDensity?: number;  // 高频文字笔画聚集判据
  }
): { safeDistanceField: Float32Array; focusMask: Uint8Array };
```

#### 保护机制
- 扫描局部高频线密度区域（如牌匾字迹、印章、眼睛），自动判定为 `SemanticFocus` 区域；
- 在该区域周围膨胀产生 **$3.5\text{px}$ 的绝对禁刀区**，流线步进引擎在此区域一律执行硬截断，形成纯白衬托。

---

### 3.4 Sub-Module 2.4: 物理分流阶梯排线引擎 (`hatch-streamline.js` 规则升级)

**核心职责**：严厉封禁在屋顶、食物表面乱铺菱形交叉网；提升交叉线门槛，仅限深暗凹腔。

#### 核心规则变更
1. **交叉排线门槛上调（Cross-Hatch Elevation）**：
   - 激活门槛从当前的 $T > 0.65$ 大幅提升至 **$T \ge 0.82$**。
2. **表面物理属性分类排线（Surface Classification）**：
   - **类别 A（刚性多面体/瓦面/木构/食物）**：**严禁任何交叉排线（Zero Cross-Hatch）**！即使暗调达 0.9，也仅通过加大单向主线的线宽与加密间距来压暗，杜绝“防盗铁丝网”。
   - **类别 B（深空洞穴/门洞内腔/檐下最深夹角）**：允许施加谨慎的细密交叉排线。

---

## 4. 实施里程碑与落地计划

### 阶段 1：核心算法与子模块实现
- [ ] **Task 1.1**: 实现 `src/core/contours/contour-extractor.js`（迟滞双阈值与全像素扫描），并在 `tests/contour-extractor.test.cjs` 中验证 Informative Drawings 弱线保全率 $\ge 90\%$。
- [ ] **Task 1.2**: 实现 `src/core/hatching/hatch-geometry-flow.js`（结构切向吸附），确保屋脊/瓦面排线方向严格对齐切线。
- [ ] **Task 1.3**: 实现 `src/core/hatching/hatch-focus-protection.js`（牌匾与焦点 3.5px 留白）。
- [ ] **Task 1.4**: 升级 `src/core/hatching/hatch-streamline.js`，加入瓦面单向规则并提升交叉线门槛至 $0.82$。

### 阶段 2：全量 10 组测试用例重跑与数据验收
- [ ] **Task 2.1**: 更新 `experiments/test_10_cases_benchmark.cjs` 并对 10 组实拍样本全部重跑。
- [ ] **Task 2.2**: 输出全用例量化前后对比表：
  - Informative 线条丢失率由 $43.5\%$ 降至 $\le 10\%$；
  - `case10_temple` 交叉线条数由 1,836 条压降至 $\le 200$ 条（仅在殿门内部）；
  - 牌匾“大雄宝殿”书法笔锋完全显露且周围纯净纸白。
- [ ] **Task 2.3**: 更新 `walkthrough.md`，追加重构后的全景对比画廊。

---

## 5. 待用户确认事项（Open Questions）

> [!IMPORTANT]
> 1. **关于牌匾文字的纯净度优先权**：
>    在牌匾区域，是否同意将牌匾底板完全处理为**纯纸白留白（仅保留 Informative 提取的书法黑色字迹与边框）**？这符合传统木版水印对于题字与印章的最地道处理手法。
> 2. **关于瓦陇排线的密度偏好**：
>    古建屋顶如果完全采用顺直瓦陇排线，您偏好**线条完全对齐真实瓦缝**（更偏向高精建筑制图感），还是**以一定间距梯队铺展的传统木刻顺坡排线**（更具艺术写意感）？
