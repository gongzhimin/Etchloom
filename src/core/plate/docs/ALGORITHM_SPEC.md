# 虚拟铜版工坊物理与化学仿真算法原理与离散实现步骤 (ALGORITHM_SPEC.md)

> **模块定位**：`src/core/plate/`（铜版物理网格管理、4 工具物理交互、偏微分酸蚀解算与纯位图凹版压印）  
> **实现目标**：本文档包含完整的物理模型、数学方程与离散实现步骤，开发者依据本文档可独立完整复现源码。

---

## 1. 物理网格连续内存模型

仿真空间定义在离散正交二维网格上，点阵坐标为 $(x, y)$，其中 $0 \le x < W, 0 \le y < H$。采用一维行优先平铺连续内存（`TypedArray`）：
$$\text{index}(x, y) = y \cdot W + x, \quad N = W \cdot H$$

网格维护 4 组正交物理场：
1. `depthField`: `Float32Array[N]`，槽深场 $D(x, y) \in [0.0, 1.0]$，初始化为全 0；
2. `exposedField`: `Float32Array[N]`，裸露金属场 $E(x, y) \in [0.0, 1.0]$，初始化为全 0；
3. `burrField`: `Float32Array[N]`，干刻金属毛刺高度场 $B(x, y) \in [0.0, 1.0]$，初始化为全 0；
4. `blockedField`: `Uint8Array[N]`，防蚀漆阻断掩膜 $M(x, y) \in \{0, 1\}$，初始化为全 0（1 表示覆盖防蚀漆）。

---

## 2. 4 种正交刻版工具物理交互算法 (`applyToolDab`)

当用户使用物理工具在坐标 $(x, y)$ 处以压力 $F \in [0.0, 1.0]$ 和尺寸基准 $S$ 点击或划线时：

### 2.1 作用半径与边界窗口计算
1. 基准物理半径：$r = \frac{S \cdot W}{1800}$；
2. 实际工具最大作用半径 $R_{\max}$：
   $$R_{\max} = \begin{cases} 1.85 \cdot r & (\text{tool} = \text{'dry'}) \\ 1.6 \cdot r & (\text{tool} = \text{'polish'}) \\ r & (\text{tool} \in \{\text{'needle'}, \text{'stop'}\}) \end{cases}$$
3. 紧凑包围盒裁剪：
   $$x_{\min} = \max(0, \lfloor x - R_{\max} - 1 \rfloor), \quad x_{\max} = \min(W - 1, \lfloor x + R_{\max} + 1 \rfloor)$$
   $$y_{\min} = \max(0, \lfloor y - R_{\max} - 1 \rfloor), \quad y_{\max} = \min(H - 1, \lfloor y + R_{\max} + 1 \rfloor)$$

### 2.2 工具离散物理更新方程
遍历包围盒内每个像素点 $(xx, yy)$，计算欧氏距离 $\text{dist} = \sqrt{(xx - x)^2 + (yy - y)^2}$，核压力衰减函数：
$$f = \max(0, \min(1, r + 0.5 - \text{dist})) \cdot F$$

#### 工具 A：防蚀漆 (`tool = 'stop'`)
当 $\text{dist} \le r + 0.5$ 时，钝化铜面：
$$M(xx, yy) \leftarrow 1, \quad E(xx, yy) \leftarrow 0, \quad B(xx, yy) \leftarrow 0$$

#### 工具 B：刮磨器 (`tool = 'polish'`)
计算衰减压力 $f_{pol} = \max(0, \min(1, R_{\max} + 0.5 - \text{dist})) \cdot F$。当 $f_{pol} > 0$ 时：
$$B(xx, yy) \leftarrow B(xx, yy) \cdot \max(0, 1 - f_{pol} \cdot 0.88)$$
$$D(xx, yy) \leftarrow D(xx, yy) \cdot \max(0, 1 - f_{pol} \cdot 0.32)$$

#### 工具 C：干刻针 (`tool = 'dry'`)
1. 槽沟切入：当 $f > 0$ 时，划破漆膜并犁开金属：
   $$M(xx, yy) \leftarrow 0$$
   $$E(xx, yy) \leftarrow \max(E(xx, yy), f \cdot 0.7)$$
   $$D(xx, yy) \leftarrow \min(1.0, D(xx, yy) + f \cdot 0.36)$$
2. 外翻毛刺伴随区 (Halo Effect)：
   计算 $f_{burr} = \max(0, \min(1, R_{\max} + 0.5 - \text{dist})) \cdot F$。若 $f_{burr} > 0$：
   $$\text{halo} = \sin\left(\min\left(\pi, \frac{\text{dist}}{R_{\max} + 0.5} \cdot \pi\right)\right)$$
   $$B(xx, yy) \leftarrow \min(1.0, B(xx, yy) + f_{burr} \cdot (0.5 + 0.5 \cdot \text{halo}))$$

#### 工具 D：蚀刻划针 (`tool = 'needle'`)
当 $f > 0$ 时，刮开防蚀底漆暴露金属铜面，仅留极微量导引划痕：
$$M(xx, yy) \leftarrow 0$$
$$E(xx, yy) \leftarrow \max(E(xx, yy), f)$$
$$D(xx, yy) \leftarrow \min(1.0, D(xx, yy) + f \cdot 0.0008)$$
$$B(xx, yy) \leftarrow 0$$

---

## 3. 2D 偏微分方程酸液化学咬蚀解算 (`simulateAcidBite`)

酸液腐蚀采用时间步进离散化解算，单步时间步长为 $\Delta t$。

### 3.1 离散方程推导
对于非防蚀漆阻断的像素点 $(i = y \cdot W + x)$（即 $M[i] == 0$）：

1. **4-邻域侧向侧蚀扩散 (Lateral Under-cutting)**：
   $$E_{\text{edge}} = \max\left(E(x-1, y), E(x+1, y), E(x, y-1), E(x, y+1)\right)$$
   $$E^{t+\Delta t}(x, y) = \min\left(1.0, E^t(x, y) + \max(0, E_{\text{edge}} - E^t(x, y)) \cdot \Delta t \cdot S \cdot (0.14 + G \cdot \eta(x, y) \cdot 0.55)\right)$$
   其中 $S$ 为酸液浓度 `strength`，$G$ 为金相粗糙度 `grain`，$\eta(x, y) \in [0.0, 1.0]$ 为金相高频噪声。
   为保证因果一致性，计算时写入预分配的双缓冲切片 `nextExposedField`。

2. **纵向咬蚀深化 (Vertical Bite Deepening)**：
   $$D^{t+\Delta t}(x, y) = \min\left(1.0, D^t(x, y) + E^{t+\Delta t}(x, y) \cdot \Delta t \cdot S \cdot 0.058 \cdot (1.0 + G \cdot (\eta(x, y) - 0.5))\right)$$

3. **微金属毛刺钝化溶解 (Burr Acid Dissolution)**：
   $$B^{t+\Delta t}(x, y) = \max\left(0, B^t(x, y) - \Delta t \cdot S \cdot 0.14\right)$$
