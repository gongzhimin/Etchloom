# 独立 UI 组件物理与几何交互设计规范 (ARCHITECTURE.md)

> **模块路径**：`src/ui/components/` (`loupe.js`, `step-flow-grid.js`)  
> **上级体系规范**：[docs/00_architecture/ARCHITECTURE_OVERVIEW.md](../../../../docs/00_architecture/ARCHITECTURE_OVERVIEW.md)

---

## 1. 放大镜物理与视口坐标映射几何 (Loupe Magnifier Geometry)

放大镜采用符合现代 Web 交互标准的 Alt+悬停激活（或卡片快捷操作），具有以下物理约束：
- **放大镜直径**：恒定 160 像素圆形视口（`border-radius: 50%`）；
- **放大倍率**：4 倍光学级双线性插值采样放大（$M = 4$）；
- **防遮挡动态偏移**：放大镜悬浮在鼠标右上方 $(+20\text{px}, -100\text{px})$，贴近屏幕右边缘时自动翻转至左侧。

### 坐标映射数学公式
设鼠标在源卡片 Canvas 上的客户区坐标为 $(x_{\text{client}}, y_{\text{client}})$，卡片客户区矩形为 $\text{Rect} = (x_0, y_0, W_{\text{css}}, H_{\text{css}})$，画布内部物理分辨率为 $W_{\text{canvas}} \times H_{\text{canvas}}$：

$$u = \frac{x_{\text{client}} - x_0}{W_{\text{css}}}, \quad v = \frac{y_{\text{client}} - y_0}{H_{\text{css}}}$$

$$x_{\text{src}} = u \cdot W_{\text{canvas}}, \quad y_{\text{src}} = v \cdot H_{\text{canvas}}$$

放大镜画布视口绘制切片矩形：
$$\text{源切片宽} = \frac{160}{M} = 40\text{px}, \quad \text{源切片高} = \frac{160}{M} = 40\text{px}$$

$$\text{ctx.drawImage}(\text{sourceCanvas}, x_{\text{src}} - 20, y_{\text{src}} - 20, 40, 40, 0, 0, 160, 160)$$

---

## 2. 7 阶段横向胶片栏架构 (`StepFlowGrid`)

默认折叠的制作过程容器展开后横向展示 7 张生成卡片：
1. **原图 (Source Image)**
2. **阶段 1：线描感知 (Informative Line Map)**
3. **阶段 2：色调场 (Tone Field)**
4. **阶段 2：等高切线流场 (Flow Field Vectors)**
5. **阶段 3：空间骨干轮廓 (Vector Contours)**
6. **阶段 4：曲面顺形排线 (Adaptive Hatching)**
7. **阶段 5：矢量母版合成 (Master Print Synthesis)**

每张卡片均内建独立的操作浮层：
- **底部说明**：`setStepStatus` 接收 `{ key, args }` 并保存到 `stepStates[i].metaSpec`；`updateLocale` 用当前字典和实际尺寸、线条数量重新生成说明，已完成的卡片也随语言切换更新；
- **完成徽章**：`DONE` 的可见内容固定为 `✓`，`aria-label` 使用当前语言的 `card.done`；切换语言时仅更新可访问名称，避免卡片宽度因翻译而变化。
- **键盘特写**：聚焦画布后按 Enter 或空格打开灯箱；关闭时焦点返回原控件；
- **点击图片**：直接触发大图特写；
- **放大镜按钮**：唤起 160px 4x 悬停放大镜；
- **导出按钮**：导出当前卡片的单步独立 SVG / PNG 图像。
