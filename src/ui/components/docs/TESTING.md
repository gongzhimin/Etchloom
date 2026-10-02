# 独立 UI 组件测试与事件断言规范 (TESTING.md)

> **被测模块**：`src/ui/components/` (`loupe.js`, `step-flow-grid.js`)  
> **执行命令**：`node --test tests/ui-button-clicks.test.cjs`

---

## 1. 对应测试用例矩阵

| 测试用例名 | 被测组件 | 关键断言指标 |
| :--- | :--- | :--- |
| `UI Button Click: StepFlowGrid Card Actions` | `StepFlowGrid` | 验证卡片动作栏中放大镜、全屏特写、单步导出的点击事件冒泡与回调拦截 |
| `StepFlowGrid recomposes completed card metadata when locale changes` | `StepFlowGrid` | 已完成卡片切换中文、英文、越南语后，说明文字翻译且数字保持不变；徽章始终显示 `✓`，可访问名称随语言变化 |
| `Loupe Magnifier Activation` | `LoupeMagnifier` | 验证在源画布上的鼠标移动事件坐标计算与放大镜容器显示/隐藏状态切换 |

---

## 2. 浮点精度与几何边界断言

1. **视口边界不溢出**：放大镜在画布边缘（$u = 0$ 或 $u = 1$）处移动时，源切片采样坐标强制使用边界钳位 $	ext{clamp}(x_{	ext{src}} - 20, 0, W_{	ext{canvas}} - 40)$，绝不导致底层 Canvas 抛出 `INDEX_SIZE_ERR`。
