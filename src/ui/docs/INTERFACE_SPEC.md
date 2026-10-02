# 前端界面总装与状态契约接口设计规范 (INTERFACE_SPEC.md)

> **位置**：`src/ui/docs/INTERFACE_SPEC.md`  
> **所属层次**：Layer 3 & 4 交互呈现与视图总装层 (Decoupled UI Layer)  
> **实现目标**：指导响应式全局状态机 (`store/`)、业务控制器 (`controllers/`)、原子交互组件 (`components/`) 与中、英、越三语国际化 (`i18n/`) 的接口契约。

> **状态说明**：本文第 1～7 节是早期接口提案 **[PLANNED]**，其中 TypeScript 接口并非仓库当前导出的类型。当前实现采用 JavaScript：`AppStore` 的状态字段为 `locale`、`activeWorkflow`、`recipe`、`stepFlow`、`artifacts`、`runtime` 等；`getState()` 返回内部状态对象，未深冻结；控制器没有统一的 `mount/destroy` 接口；模板由 `mountAppLayout()` 直接赋值给容器 `innerHTML`。现状请以 `src/ui/store/app-store.js`、`src/ui/templates/layout-templates.js` 和控制器源码为准。

---

## 1. 接口设计哲学与职责边界 (Design Philosophy & Boundary)

1. **单向数据流与状态唯一源 (Single Source of Truth)**：
   前端所有卡片展开状态、当前激活模式（Master Print vs Virtual Plate）、配方参数与板画物理网格，必须统一集中于 `AppStore`。视图组件严禁私自持有对其他组件产生波及的隐式状态。
2. **轻量骨架与无逻辑微模板 (Headless Logic & Clean Templates)**：
   HTML 微模板 (`templates/`) 仅定义 DOM 语义骨架与插槽，严禁包含 `<script>` 标签或行内 JavaScript。所有事件绑定与逻辑驱动均由对应的 `Controller` 挂载实现。
3. **无头测试同构兼容 (Headless DOM Testability)**：
   所有 UI 组件与控制器必须支持基于轻量 Mock DOM（包含基本 `addEventListener`, `querySelector`, `classList`）进行无头自动化测试，绝不能对完整浏览器环境形成刚性绑定。

---

## 2. 强类型接口定义与数据结构契约 (Type Definitions & Data Contract)

```typescript
/**
 * 应用全局状态快照契约
 */
export interface AppStateSnapshot {
  readonly mode: 'master' | 'plate';     // 当前顶级交互工作台模式
  readonly lang: 'zh' | 'en';            // 当前界面语言
  readonly currentRecipe: Readonly<Record<string, unknown>>; // 活跃配方
  readonly isRunning: boolean;           // 管线是否正在计算
  readonly activeStage: number;          // 当前聚焦的阶段序号 (1..5)
  readonly plateState: {
    readonly width: number;
    readonly height: number;
    readonly activeTool: string;
    readonly canUndo: boolean;
  };
}

/**
 * 响应式状态中心契约 (store/)
 */
export interface IAppStore {
  /**
   * 获取当前不可变状态快照
   */
  getState(): AppStateSnapshot;

  /**
   * 提交原子状态变更并触发订阅者通知
   */
  dispatch(action: { type: string; payload?: unknown }): void;

  /**
   * 注册状态变更监听器
   * @returns 解除监听的闭包函数
   */
  subscribe(listener: (state: AppStateSnapshot) => void): () => void;
}

/**
 * 业务控制器接口契约 (controllers/)
 */
export interface IUIController {
  /**
   * 将业务控制器挂载至目标 DOM 容器，建立事件监听与 Store 订阅
   */
  mount(rootElement: HTMLElement): void;

  /**
   * 卸载控制器，解绑所有 DOM 事件与全局订阅，防止内存泄漏
   */
  destroy(): void;
}

/**
 * 160px 4x 浮动高倍放大镜交互契约 (components/)
 */
export interface LoupeGeometryParams {
  readonly clientX: number;              // 鼠标视口 X 坐标
  readonly clientY: number;              // 鼠标视口 Y 坐标
  readonly targetRect: DOMRect;          // 目标画布宿主包围盒
  readonly naturalWidth: number;         // 底层物理图像自然宽度
  readonly naturalHeight: number;        // 底层物理图像自然高度
  readonly zoomFactor?: number;          // 放大倍率 (标称 4.0)
}

export interface LoupeSampleCoords {
  readonly sourceX: number;              // 映射到底层物理像素的 X 坐标
  readonly sourceY: number;              // 映射到底层物理像素的 Y 坐标
  readonly loupeX: number;               // 放大镜容器在屏幕上的居中 X 坐标
  readonly loupeY: number;               // 放大镜容器在屏幕上的居中 Y 坐标
}
```

---

## 3. 前置条件与参数合法性约束 (Pre-conditions)

1. **挂载根容器非空保证**：
   - 任何控制器在执行 `mount(rootElement)` 时，`rootElement` 必须为有效的非空 DOM 节点。若传入 `null`，控制器必须抛出 `TypeError("Target mount container element is null")`。
2. **放大镜视口边界安全**：
   - `targetRect` 必须具备合法的非零尺寸（`targetRect.width > 0 && targetRect.height > 0`）。若画布未完成布局渲染，放大镜逻辑必须跳过采样更新。

---

## 4. 后置条件与状态变更承诺 (Post-conditions)

1. **状态快照不可变性保证**：
   - `store.getState()` 返回的对象必须深冻结（或保证不可变引用），调用方对其任何字段的写入尝试不得篡改 Store 内部真实状态。
2. **放大镜采样坐标裁剪承诺**：
   - 计算所得的 `sourceX`, `sourceY` 必须严格通过饱和截断限制在 $[0, \text{naturalWidth} - 1]$ 与 $[0, \text{naturalHeight} - 1]$ 内，绝不允许向着色器传入越界采样 UV。

---

## 5. 系统不变量与守恒律 (System Invariants)

1. **单向通知有序性**：
   当 `store.dispatch` 触发状态变更时，所有已注册的订阅者必须按注册顺序接收到最新的同一份状态快照。
2. **国际化字典完备性不变量**：
   凡是在微模板中声明了 `data-i18n="KEY"` 的字段，目标是在 `i18n.js` 的 `zh-CN`、`en-US` 与 `vi-VN` 字典中均存在对应字符串。当前三语键完整性由 `tests/two-stage-ui.test.cjs` 检查。

---

## 6. 纯函数属性、副作用与内存所有权 (Side-effects & Memory Ownership)

1. **副作用严格限制于视图层**：
   所有 DOM 操作（`innerHTML` 挂载、CSS class 切换、Canvas 绘制）必须严格局限在 `controllers/` 与 `components/` 内部，`store/` 本身必须为无 DOM 纯数据引擎。
2. **销毁解绑自闭环 (Leak-Free Cleanup)**：
   控制器在 `destroy()` 调用时，必须清空内部的 `listeners` 数组，并显式对挂载的 DOM 节点执行 `removeEventListener`。

---

## 7. 错误契约、并发与生命周期状态协议 (Error Handling & Lifecycle Protocol)

1. **微模板异步装配失败降级**：
   若通过 `fetch()` 加载 `templates/*.html` 发生网络故障或本地跨域受限，总装器必须自动使用内联骨架降级备用，并向控制台输出结构化警告。
2. **高频事件防抖契约**：
   放大镜移动事件（`pointermove`）与窗口尺寸调整（`resize`）必须使用 `requestAnimationFrame` 进行时钟对齐节流，避免在单帧内重复重绘。
