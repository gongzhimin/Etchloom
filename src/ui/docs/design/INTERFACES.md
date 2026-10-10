---
title: UI 模块对外接口与状态契约
status: Active
doc-id: IF-UI
owner-module: ui
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-11T01:21:00+08:00
---

# UI 模块对外接口与状态契约 (IF-UI)

## 1. 接口设计原则与权威关系

1. **唯一权威定义**：本文件是 `ui` 模块对外暴露的视图总装、响应式状态与控制器契约的唯一权威定义。跨模块登记以 `docs/design/INTERFACES.md` 为准，具体签名、状态快照与控制器行为以此处为准。
2. **轻量骨架与无逻辑微模板**：HTML 结构通过 `mountAppLayout(container)` 挂载至宿主 DOM 容器。模板文件 `layout-templates.js` 仅输出结构字符串，严禁内嵌脚本逻辑。
3. **单向状态流与无头可测性**：全局交互状态由 `AppStore` 统一维护，所有控制器与组件均支持在 Node.js 轻量级 Mock DOM 环境中运行和断言。

## 2. 函数式接口签名与类定义

### 2.1 mountAppLayout 视图总装挂载入口

源码位置：`src/ui/templates/layout-templates.js`

```javascript
/**
 * 将整套两阶段工坊 DOM 骨架挂载至宿主根节点 (#app)
 * @param {HTMLElement} container - 挂载根节点
 */
export function mountAppLayout(container)
```

### 2.2 AppStore 响应式状态中心

源码位置：`src/ui/store/app-store.js`

```javascript
class AppStore {
  /**
   * @param {Object} [initialState={}] - 初始状态覆盖
   */
  constructor(initialState = {})

  /**
   * 获取当前状态快照对象
   * @returns {AppStoreState}
   */
  getState()

  /**
   * 提交状态补丁更新并通知所有订阅者
   * @param {Partial<AppStoreState>} patch - 浅合并补丁对象
   */
  setState(patch)

  /**
   * 注册状态变更监听器
   * @param {Function} listener - (state: AppStoreState, prevState: AppStoreState) => void
   * @returns {Function} 取消订阅闭包函数 () => void
   */
  subscribe(listener)

  /**
   * 重置状态为初始默认值
   */
  reset()
}
```

### 2.3 I18nManager 国际化管理器

源码位置：`src/ui/i18n/i18n.js`

```javascript
class I18nManager {
  /**
   * @param {'zh-CN'|'en-US'|'vi-VN'} [initialLocale='zh-CN']
   */
  constructor(initialLocale = 'zh-CN')

  /**
   * 切换当前界面语言，触发 notify()
   * @param {'zh-CN'|'en-US'|'vi-VN'} locale
   */
  setLocale(locale)

  /**
   * 根据翻译键检索文本，支持占位符插值 {0}, {1}
   * @param {string} key
   * @param {Object|Array} [params]
   * @returns {string}
   */
  t(key, params)

  /**
   * 扫描并批量更新指定根节点下含 data-i18n 属性的所有 DOM 元素
   * @param {HTMLElement|Document} [root=document]
   */
  updateDOM(root = document)

  /**
   * 注册语言变更监听回调
   * @param {Function} listener - (locale: string) => void
   * @returns {Function} 取消订阅闭包
   */
  subscribe(listener)
}
```

### 2.4 PipelineController 算法母版场景控制器

源码位置：`src/ui/controllers/pipeline-controller.js`

```javascript
class PipelineController {
  /**
   * @param {Object} [options={}] - 包含 aiServiceUrl、stepGrid、log、getParams 等回调
   */
  constructor(options = {})

  /**
   * 获取当前配方参数集
   * @returns {RecipeParams}
   */
  getRecipeParams()

  /**
   * 释放底层 AI 网关与图像临时内存
   */
  releaseMemory()
}
```

### 2.5 MasterSpatialGrid 与 LoupeMagnifier 空间网格与放大镜

源码位置：`src/ui/components/loupe.js`

```javascript
class MasterSpatialGrid {
  /**
   * @param {number} width - 画布横向像素尺寸
   * @param {number} height - 画布纵向像素尺寸
   * @param {number} [cellSize=64] - 网格分桶单元边长
   */
  constructor(width, height, cellSize = 64)

  /**
   * 将母版矢量路径一次性构建索引至空间网格桶 (耗时 < 2ms)
   * @param {Array<{ points: [number, number][], width?: number }>} paths
   */
  indexPaths(paths)

  /**
   * 查询与指定视口轴对齐包围盒 (AABB) 相交的候选笔划集合
   * @param {number} vx0
   * @param {number} vy0
   * @param {number} vx1
   * @param {number} vy1
   * @returns {Array<Object>} 视锥相交路径集合
   */
  queryFrustum(vx0, vy0, vx1, vy1)
}

class LoupeMagnifier {
  /**
   * @param {HTMLCanvasElement} sourceCanvas
   * @param {Object} [options={}] - { diameter?: number, zoom?: number, vectorPaths?: Array, srcWidth?: number, srcHeight?: number }
   */
  constructor(sourceCanvas, options = {})

  /**
   * 动态绑定/更新矢量路径集合并构建空间视锥网格
   * @param {Array<Object>} paths
   * @param {number} [srcWidth]
   * @param {number} [srcHeight]
   */
  setVectorPaths(paths, srcWidth, srcHeight)
}
```

## 3. 输入/输出真实类型定义

```typescript
export interface AppStoreState {
  locale: 'zh-CN' | 'en-US' | 'vi-VN';
  activeWorkflow: 'master' | 'plate';
  recipe: {
    lineThreshold: number;
    lineNoiseSuppression: number;
    toneContrast: number;
    toneBrightness: number;
    flowSmoothing: number;
    contourDetail: number;
    contourSimplify: number;
    density: number;
    angle: number;
    crossHatch: boolean;
    waviness: number;
    needleWidth: number;
    inkGain: number;
    acidStrength: number;
    grain: number;
    ink: number;
    pressure: number;
    plateTone: number;
    paper: 'rough' | 'smooth' | 'linen' | 'rosaspina';
  };
  sourceImage: any | null;
  geometry: any | null;
  stepFlow: {
    activeStepIndex: number;
    zoomLevels: number[];
    fullscreenStep: number | null;
    loupeActive: boolean;
  };
  artifacts: {
    stage0Source: any;
    stage1LineMap: any;
    stage2FlowField: any;
    stage3Contours: any;
    stage4Hatching: any;
    stage5Master: any;
    stage6Plate: any;
  };
  runtime: {
    status: 'IDLE' | 'COMPUTING' | 'DONE' | 'ERROR';
    currentStage: number;
    progress: number;
    metrics: Record<string, any>;
  };
}
```

## 4. 错误处理与降级契约

1. **容器缺失保护**：若 `mountAppLayout` 传入非法或空的 DOM 容器，安全短路退出，不抛出阻断异常；
2. **缺失翻译键回退**：若翻译键在当前语言包中不存在，优先回退到 `zh-CN` 文案；若全局缺失则直接返回原始键名，确保界面文字永不空白；
3. **安全覆写防护**：当铜版已包含刻痕深度时再次执行上版，弹出覆写拦截对话框，必须由用户二次确认后方可覆写。

## 5. 消费方登记与真实契约测试

| 消费方模块 | 依赖门面符号 | 接口调用方式 | 真实契约测试文件 |
| :--- | :--- | :--- | :--- |
| `src/main.js` | `mountAppLayout` | 应用启动时装配全站 HTML 结构 | `tests/app-entry-mount.test.cjs` |
| `src/main.js` | `AppStore` / `I18nManager` | 响应式状态管理与三语字典绑定 | `tests/ui.test.cjs` |
| 全站控制器 | `PipelineController` / `PlateStudioController` | 交互按钮响应、工作流切换与酸蚀状态机 | `tests/ui-button-clicks.test.cjs` |
| 界面总装 | 样式与工坊表面分层 | 亚麻纸白与橡木画框视觉分层验证 | `tests/ui-surfaces.test.cjs` |
