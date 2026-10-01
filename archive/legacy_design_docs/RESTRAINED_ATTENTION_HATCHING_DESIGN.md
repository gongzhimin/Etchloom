# 极度克制阴影排线与线稿自注意力机制重构设计规范

本文档针对用户关于 **“Case 05（陶罐）和 Case 08（餐盘）排线不合理且偏多”** 的深度诊断，以及 **“对 Informative Drawings 线稿引入注意力机制”、“对阴影排线的使用要极为克制，可以不加就不加”** 的核心艺术指导原则，提出极简、解耦、低复杂度的模块化重构设计方案。

---

## 1. 核心设计哲学：宁缺毋滥，惜墨如金（Less is More）

1. **“可以不加就不加”（Omission by Default）**：
   - Informative Drawings 已经输出了高质量的骨相结构线与微观肌理（陶罐的拉胚陶土颗粒、盘中食物的边缘）。
   - **轮廓线本身就是最精炼的明暗表达**。任何有轮廓线描述细节的区域，**默认一律不加排线**！
2. **自注意力负反馈抑制（Attention-Driven Self-Inhibition）**：
   - 借由线稿自注意力机制（Self-Attention），计算全画幅的“线条显著性密度场”；
   - 在线条已有密集分布的区域，排线生成概率强制衰减归零（负反馈抑制），彻底根除“轮廓线 + 排线”的双重叠加灾难。
3. **材质语义免排线豁免（Material Exemption Rules）**：
   - **餐盘美食（Food/Cuisine）**：$100\%$ 豁免排线（Zero Hatching），仅保留纯粹生动的 Informative 轮廓与纸白，杜绝焦黑铁丝网感；
   - **陶器/石器（Ceramics/Stoneware）**：$100\%$ 禁用交叉排线，仅保留其古拙颗粒感与底部微量单向投影；
   - **牌匾题字（Calligraphy Plaque）**：绝对纯净留白。
4. **极简低复杂度架构（KISS & Decoupled Pure Functions）**：
   - 杜绝臃肿黑盒大模型开销，所有核心注意力与抑制算法均实现为轻量级、确定性的 TypedArray 纯数学计算，单帧计算开销控制在 50ms 以内。

---

## 2. 模块解耦结构与数据流

```
                    输入: Informative Drawings 浮点骨架 LineMap [0.0 ~ 1.0]
                                            │
                                            ▼
       ┌────────────────────────────────────────────────────────────────────────┐
       │  Sub-Module 3.1: 线稿空间自注意力与负反馈抑制场                         │
       │      `src/core/hatching/hatch-attention.js`                            │
       │  - 计算线条特征的非局部自注意力 (Spatial Self-Attention)                │
       │  - 产出抑制场 Attn_Inhibit(x, y) ∈ [0, 1]:                             │
       │    【凡已有轮廓/肌理处，Inhibit ≈ 1.0，排线需求强制归零】               │
       └────────────────────────────────────┬───────────────────────────────────┘
                                            │ (Inhibition Map, Saliency Weights)
                                            ▼
       ┌────────────────────────────────────────────────────────────────────────┐
       │  Sub-Module 2.1: 材质分类与免排线豁免器                                │
       │      `src/core/hatching/hatch-material-rules.js`                       │
       │  - 食物区域/微观花瓣/有机碎屑: 100% 免排线豁免 (Zero Hatching)          │
       │  - 陶土/瓦坡: 100% 封禁交叉网 (No Cross-Hatch)                         │
       └────────────────────────────────────┬───────────────────────────────────┘
                                            │ (Exemption Mask)
                                            ▼
       ┌────────────────────────────────────────────────────────────────────────┐
       │  Sub-Module 2.0-Restrained: 极端克制排线调子预算引擎                   │
       │      `src/core/hatching/hatch-budget.js`                               │
       │  - EffectiveTone = RawTone × (1 - Attn_Inhibit) × (1 - ExemptionMask)  │
       │  - 提高排线触发阈值: 单向排线 T >= 0.55，交叉暗核 T >= 0.88            │
       │  - 全画幅排线条数硬上限 (Budget Cap: <= 500条，削减 80% 冗余线)        │
       └────────────────────────────────────┬───────────────────────────────────┘
                                            │ (Ultra-Restrained ToneField)
                                            ▼
       ┌────────────────────────────────────────────────────────────────────────┐
       │  Sub-Module 2.4: 极简顺直等距流线引擎                                  │
       │      `src/core/hatching/hatch-streamline.js`                           │
       │  - 仅在纯空白深阴影处极克制落刀，排线整洁通透，绝不喧宾夺主             │
       └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 各子模块详细设计与 API 规范

### 3.1 Sub-Module 3.1: 线稿空间自注意力与负反馈抑制场 (`hatch-attention.js`)

**核心职责**：通过非局部自注意力机制（Spatial Non-Local Attention），分析 Informative Drawings 线条的相互影响，计算排线抑制场。凡是有线条表达细节的地方，排线引擎立即停机。

#### 数学公式
对于画布上的任意采样点 $(x, y)$，其线条注意力响应定义为高斯核空间非局部注意力：
$$\mathcal{A}_{\text{line}}(x, y) = \sum_{(u, v) \in \mathcal{N}(x, y)} (1.0 - \text{LineMap}(u, v)) \cdot \exp\left(-\frac{(x - u)^2 + (y - v)^2}{2\sigma_{\text{attn}}^2}\right)$$
$$\text{Inhibition}(x, y) = \text{clamp}\left(\frac{\mathcal{A}_{\text{line}}(x, y)}{T_{\text{line\_sat}}}, 0.0, 1.0\right)$$
- 当 $(x, y)$ 附近已有结构线或肌理时，$\text{Inhibition}(x, y) \to 1.0$；
- 传导给排线引擎的暗度直接调制为：
  $$T_{\text{effective}}(x, y) = T_{\text{tone}}(x, y) \times (1.0 - \text{Inhibition}(x, y))$$
- **物理效果**：陶罐表面密布的 14,721 条微观颗粒线将使陶身整体 $\text{Inhibition} \approx 1.0$，$T_{\text{effective}} \to 0.0$，**陶身排线直接从 4,391 条暴降至接近 0 条**，只剩下最纯净的陶土质感！

#### API 定义
```typescript
interface AttentionOptions {
  sigma?: number;            // 注意力感受野半径 (默认 8.0px)
  saturationThreshold?: number; // 线条饱和度阈值 (默认 0.18)
}

/**
 * 计算线稿空间自注意力抑制场
 * @param lineMap 线稿对象 { width, height, data: Float32Array }
 * @param options 配置参数
 * @returns {Float32Array} inhibitionField - 抑制系数数组 [0.0 ~ 1.0]，1 为彻底禁止排线
 */
function computeLineAttentionInhibition(
  lineMap: { width: number; height: number; data: Float32Array },
  options?: AttentionOptions
): Float32Array;
```

---

### 3.2 Sub-Module 2.1: 材质分类与免排线豁免器 (`hatch-material-rules.js`)

**核心职责**：根据画面语义特征自动识别“禁止排线材质”（美食食材、有机碎屑、精细书法），执行“免死金牌”豁免。

#### 核心规则
1. **美食与高频碎散有机物（Food Exemption）**：
   - 盘中食物的线条曲率变化极大且密集交错（曲率方差 $> 0.45$ 且线密度 $> 0.2$）。
   - **规则**：此区域 `isExempt = true`，**排线生成器 100% 熄火**，画面仅凭线条塑造形体，还食物以剔透、干净、有食欲的本色。
2. **多孔陶器与粗糙无机物（Ceramic / Stoneware Rule）**：
   - 表面凹凸点极多。
   - **规则**：**100% 封禁交叉排线（No Cross-Hatch）**。仅允许在最底部的平整台面阴影处出现极少量单向线条。
3. **视觉焦点牌匾与五官（Focus Halo）**：
   - 保持 3.5px 纸白呼吸槽。

#### API 定义
```typescript
/**
 * 计算材质免排线豁免掩模
 * @param lineMap 线稿
 * @param vectorContours 矢量轮廓
 * @param width 宽度
 * @param height 高度
 * @returns {Uint8Array} exemptionMask - 1: 完全豁免排线 (绝对纯白), 0: 允许常规排线
 */
function computeMaterialExemptionMask(
  lineMap: any,
  vectorContours: Array<any>,
  width: number,
  height: number
): Uint8Array;
```

---

### 3.3 Sub-Module 2.0-Restrained: 极端克制排线调子预算引擎 (`hatch-budget.js`)

**核心职责**：从源头上掐死“排线泛滥”的可能性，践行“可以不加就不加”原则。

#### 核心机制
1. **排线触发阈值大幅提高**：
   - **单向主排线门槛**：从原先的 $0.18$ 提升至 **$0.55$**（只有真正的深色阴影才配拥有排线，中浅调全部留白！）。
   - **交叉线门槛**：提升至 **$0.88$**（仅限绝对暗核，其余全部单向）。
2. **全画幅排线总预算硬上限（Budget Cap）**：
   - 设定画面主排线条数软硬预算：
     - 单向主排线硬上限：**$\le 450$ 条**（原先多达 2,000 ~ 4,000 条！直接压缩 85%）；
     - 交叉线条数硬上限：**$\le 80$ 条**（仅在洞穴核心落刀）。
   - 优先级队列按照 $\text{Tone} \times (1 - \text{Inhibition})$ 严格降序抽取，额度用尽立即停机。

#### API 定义
```typescript
interface BudgetOptions {
  minToneThreshold?: number; // 单向排线最低暗度 (默认 0.55)
  crossToneThreshold?: number; // 交叉线最低暗度 (默认 0.88)
  maxHatchBudget?: number;   // 主排线条数硬上限 (默认 450 条)
  maxCrossBudget?: number;   // 交叉线条数硬上限 (默认 80 条)
}

/**
 * 调子注意力抑制与预算裁减纯函数
 */
function applyRestrainedToneBudget(
  rawTone: Float32Array,
  inhibitionField: Float32Array,
  exemptionMask: Uint8Array,
  width: number,
  height: number,
  options?: BudgetOptions
): { effectiveTone: Float32Array; budgetOptions: any };
```

---

## 4. 预期效果与量化指标对比（针对 Case 05 与 Case 08）

| 指标维度 | Case 05 (陶罐) 现状 | **Case 05 重构预期** | Case 08 (餐盘) 现状 | **Case 08 重构预期** |
| :--- | :--- | :--- | :--- | :--- |
| **轮廓线 (Contours)** | 14,721 条 | **保持 14,721 条**（完整保全粗粝质感） | 7,869 条 | **保持 7,869 条**（生动食材轮廓） |
| **主排线条数 (Hatch)** | 3,756 条 | **$\le 350$ 条（大幅削减 90%）** | 1,980 条 | **$\le 150$ 条（仅在盘底投射阴影）** |
| **交叉线条数 (Cross)** | 635 条 | **0 条（彻底封禁铁丝网）** | 352 条 | **0 条（食物完全免除交叉网）** |
| **画面覆盖率 (Coverage)**| 25.4% | **降至约 15% 黄金区间** | 18.0% | **降至约 11% 清爽剔透** |
| **视觉呈现品质** | 陶罐被铁丝网糊死 | **粗粝陶土质感毕现，形体孤傲挺拔** | 食物发黑如杂草线团 | **食材干净有食欲，瓷盘反光高雅留白** |

---

## 5. 实施路线图（Implementation Roadmap）

1. **Step 1**: 实现 `src/core/hatching/hatch-attention.js`（线条自注意力负反馈抑制场纯函数）。
2. **Step 2**: 实现 `src/core/hatching/hatch-material-rules.js`（食物免排线豁免与陶器交叉网封禁）。
3. **Step 3**: 实现 `src/core/hatching/hatch-budget.js`，将门槛提升至 $T \ge 0.55$，排线硬预算压至 450 条以内。
4. **Step 4**: 串联进 `stage4-hatching.js`，运行单元测试保证 50+ 项测试全绿。
5. **Step 5**: 重新跑测 `case05_pot` 与 `case08_plate`（及全量 10 组用例），输出高清对比画廊并在 `walkthrough.md` 中进行验收。
