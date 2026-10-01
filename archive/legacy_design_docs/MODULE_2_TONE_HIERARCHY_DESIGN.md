# Module ② 版画空间层次感与留白重构设计文档

本文档针对 6 组真实实拍照片测试中暴露的 **“画面被排线全画幅满铺”、“缺乏黑白节奏与呼吸留白”、“前后景深灰平黏连”** 核心问题，提出精简、模块化、低复杂度的重构方案。

---

## 1. 核心设计原则：极简主义与黑白张力

1. **留白如金（Paper White as Master Tone）**：
   - 数码照片中 $0\% \sim 35\%$ 的亮度区域（对应 RGB $165 \sim 255$ 的天空、白墙、受光面、人脸）必须强制保留为**纯净纸白（零排线）**。
2. **离散阶梯语法（Discrete Tonal Tiers）**：
   - 告别平缓的连续插值，采用古典大师五级离散刻线阶梯（Tier 0 纸白、Tier 1 极疏微光、Tier 2 体积密线、Tier 3 压暗交叉、Tier 4 暗核焦点）。
3. **背景轻量退避（Decoupled Background Breathing）**：
   - 彻底废除“在全画幅四角拉满 45 度排线”的机械逻辑；提供古典版画最成熟的**白地退景（Vignette）**与**局部反差衬托（Contrast Framing）**。
4. **降低代码复杂度（KISS）**：
   - 消除冗余的多层启发式判断，所有模块均为**无状态纯函数（Pure Functions）**，输入 TypedArray，输出 TypedArray。

---

## 2. 模块解耦结构与 API 契约

```
┌─────────────────────────────────────────────────────────────┐
│  Sub-Module 2.0: 调子重映射与离散阶梯 (Tone & Tier Engine)   │
│             `src/core/hatching/hatch-tone.js`               │
│   输入: 原始照片灰度 Tone [0.0 ~ 1.0]                       │
│   输出: 留白压缩的 PrintTone + 五级离散阶梯标签 (Tiers: 0~4) │
└──────────────────────────────┬──────────────────────────────┘
                               │ (PrintTone, Tiers)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Sub-Module 2.1: 背景留白与反差衬托 (Background Engine)      │
│             `src/core/hatching/hatch-background.js`         │
│   输入: PrintTone + isForeground 掩模                        │
│   处理: 白地退景 / 主体边缘渐隐衬托 / 过滤亮天空与白墙      │
│   输出: 空间修剪后的 EffectiveTone                          │
└──────────────────────────────┬──────────────────────────────┘
                               │ (EffectiveTone, Tiers)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Sub-Module 2.3: 阶梯流线生成器 (Stepped Streamline Engine) │
│             `src/core/hatching/hatch-streamline.js`         │
│   - Tier 0: 绝对零排线 (纯纸白)                             │
│   - Tier 1: 大间距极细单线 (仅暗示体积转折)                 │
│   - Tier 2: 顺形密排线 (主要光影层)                         │
│   - Tier 3/4: 激活正交交叉排线 (压沉深暗部)                 │
└─────────────────────────────────────────────────────────────┘
```

---

### Sub-Module 2.0: 调子重映射与离散阶梯 (`src/core/hatching/hatch-tone.js`)

**职责**：将数码相机的平缓线性灰度，转换为古典版画极具反差的离散阶梯调子。

#### API 定义
```typescript
interface SteppedToneResult {
  // 经高光抑制与S曲线映射后的纯净打印调子 [0.0 ~ 1.0]
  printTone: Float32Array;
  // 离散阶梯层级: 0(纸白), 1(极疏), 2(密排), 3(交叉暗部), 4(暗核)
  tiers: Uint8Array;
}

/**
 * 调子非线性重映射与五级阶梯切片
 * @param rawTone 原始调子数组 (0: 纯白, 1: 纯黑)
 * @param width 宽度
 * @param height 高度
 * @param options 配置参数
 */
function remapToneAndTiers(
  rawTone: Float32Array,
  width: number,
  height: number,
  options?: {
    whiteKnee?: number;      // 纸白保全阈值 (默认 0.32，低于此值强制为 0 纸白)
    gamma?: number;          // 中调反差伽马 (默认 1.35)
    shadowBoost?: number;    // 暗部下沉增益 (默认 1.25)
  }
): SteppedToneResult;
```

#### 关键算法（极简无状态公式）
$$T_{\text{print}}(x, y) = \begin{cases} 0.0 & \text{if } T_{\text{raw}} \le T_{\text{knee}} \\ \left(\frac{T_{\text{raw}} - T_{\text{knee}}}{1.0 - T_{\text{knee}}}\right)^\gamma & \text{if } T_{\text{raw}} > T_{\text{knee}} \end{cases}$$
- **阶梯打标（Tiers）**：
  - Tier 0：$T_{\text{print}} = 0.0$（纸白，严禁排线）
  - Tier 1：$0.0 < T_{\text{print}} \le 0.30$（极疏单线）
  - Tier 2：$0.30 < T_{\text{print}} \le 0.65$（主向密线）
  - Tier 3：$0.65 < T_{\text{print}} \le 0.88$（正交共轭交叉线）
  - Tier 4：$0.88 < T_{\text{print}} \le 1.00$（深沉暗核）

---

### Sub-Module 2.1: 背景留白与反差衬托 (`src/core/hatching/hatch-background.js`)

**职责**：彻底解决“全画幅被 45 度排线打满”的灾难，为画面提供开阔透气的背景空间。

#### API 定义
```typescript
/**
 * 背景退避与选择性对比衬托处理
 * @param printTone 打印调子
 * @param isForeground 前景掩模 (1: 前景主体, 0: 背景)
 * @param width 宽度
 * @param height 高度
 * @param options 模式与渐隐距离
 */
function modulateBackgroundBreathing(
  printTone: Float32Array,
  isForeground: Uint8Array,
  width: number,
  height: number,
  options?: {
    mode?: 'vignette' | 'contrast-halo' | 'natural-shadow';
    haloWidth?: number; // 衬托光晕半径 (默认 45px)
  }
): Float32Array;
```

#### 3 种极简模式
1. **`'vignette'`（白地退景，肖像与静物推荐）**：
   - 非前景区域（背景）直接归零为纸白，突出主体轮廓的雕刻感。
2. **`'contrast-halo'`（局部边缘衬托，古典版画高阶技法）**：
   - 仅在前景主体的**受光外缘 40~60px 范围**内保留背景暗排线，向外平滑渐隐至纯白；既反衬出主体明亮的边缘，又让四周保持开阔纸白。
3. **`'natural-shadow'`（自然阴影，风景/建筑推荐）**：
   - 背景中只有真正的深色阴影（$T > 0.50$）才允许排线，开阔的天空、平整的墙面全部保持纯白，彻底消灭“防盗铁丝网”。

---

### Sub-Module 2.3: 阶梯流线生成重构 (`src/core/hatching/hatch-streamline.js`)

**职责**：大幅简化循环内部的启发式判断，直接由 `tiers` 控制流线行为。

#### 简化后的逻辑
```javascript
// 遍历种子
for (const seed of seedQueue) {
  const tier = tiers[seed.y * w + seed.x];
  if (tier === 0) continue; // 零排线纸白，秒级跳过！

  // 离散间距映射 (完全取代旧版连续复杂插值)
  const spacing = (tier === 1) ? 9.5 : (tier === 2) ? 4.5 : 2.5;

  // 积分步长与最大步数
  // ...
}
```
- **复杂度降低**：原先十几条嵌套的概率拒绝（`rng() > dark * 1.6`）全部废除，改为基于 `tier` 的确定性判别。
- **性能翻倍**：由于 Tier 0（约占画面 $30\% \sim 50\%$ 面积）在种子和步进阶段被 $O(1)$ 瞬间丢弃，生成耗时将直接减少 $40\%$ 以上！

---

## 3. 实施里程碑与验收标准

1. **Step 1: 实现 `hatch-tone.js`**
   - 落地 Knee-point 高光保全与五级阶梯算法，添加单测验证：在输入像素灰度 $> 170$ 时，输出严格为 0（Tier 0）。
2. **Step 2: 实现 `hatch-background.js`**
   - 落地白地退景与光晕渐隐纯函数，消灭天空与白墙上的寄生斜线。
3. **Step 3: 优化 `hatch-streamline.js` 并装配至 `stage4-hatching.js`**
   - 将连续模糊插值替换为离散 Tier 驱动。
4. **Step 4: 刷新 6 组测试样本实测并量化对比**
   - 刻线覆盖率由原先的 $25\% \sim 38\%$ 恢复至古典大师版画的黄金区间：**$10\% \sim 20\%$**。
   - 检查肖像面部、古建天空、手持陶罐背景是否恢复透气纸白与鲜明反差。
