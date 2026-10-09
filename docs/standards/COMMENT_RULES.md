# 代码注释职责与编写规范 (COMMENT_RULES)

> **规范编号**：STD-COM-002  
> **适用范围**：全栈 JavaScript, Rust, CJS/MJS 源码与测试代码  
> **权威来源**：项目工程整洁代码与 JSDoc 强契约规范  

---

## 1. 核心注释原则

1. **解释“为什么（Why）”，而非重复“做了什么（What）”**：代码本身表达逻辑流程，注释专注于解释设计动机、业务边界、数学公式推导依据、以及非直观实现的技术原因。
2. **拒绝陈腐注释与复读注释**：代码修改时注释必须同步修改；禁止出现与代码行为相悖的过时注释。
3. **权威文档引用（Ref Citation）**：当涉及复杂物理算法、数据结构或对外接口时，强制在 JSDoc 中提供可追踪的文档引用锚点。

---

## 2. 文件头部与模块级注释

每个源码文件顶部必须包含文件职责简述、核心维护范围及关键技术约束：

```javascript
/**
 * Virtual Plate Studio Controller (M3: 虚拟铜版画与酸液物理工坊控制器)
 * 
 * 核心职责:
 * - 维护铜版连续内存状态数组 (depth, exposed, blocked, burr)
 * - 驱动 4 种正交刻线工具 (needle, drypoint, stop, polish)
 * - 驱动离散 PDE 酸液潜蚀物理模拟与版画压印试印渲染
 * 
 * @ref docs/design/ARCHITECTURE.md#MOD-CORE-PLATE
 * @ref src/core/plate/docs/ALGORITHM.md
 */
```

---

## 3. 函数与类型 JSDoc 强契约要求

导出函数（Exported Functions）及跨模块公共方法必须提供严格的 JSDoc：
1. **参数（@param）**：包含类型、含义、物理量纲（如 `μm`、`mm`、`秒`、`百分比 0..1`）。
2. **返回值（@returns）**：明确说明数据结构、是否可能为空、异常抛出契约（@throws）。
3. **副作用说明**：是否修改入参 TypedArray、是否触发 DOM 脏渲染。

```javascript
/**
 * 执行酸液腐蚀时间步进数值积分
 * 
 * @param {number} dt - 真实时间步长 (秒, > 0)
 * @returns {void}
 * 
 * @constraint 必须在 preEtchSnapshot 锁存后调用；就地更新 exposed 与 depth 连续数组
 * @ref src/core/plate/docs/ALGORITHM.md#ALG-PLATE-PDE
 */
export function etch(dt) { ... }
```

---

## 4. 关键算法与复杂逻辑区块注释

1. **数值仿真与位运算**：
   凡涉及矩阵步进、位运算哈希、微细节滤波时，必须标注数学原理简式：
   ```javascript
   // DJB2 Hash: hash = ((hash << 5) + hash) + char; 保证 DAG 拓扑哈希灵敏度
   let hash = 5381;
   ```
2. **边界条件与守恒防御**：
   必须解释物理防守恒或溢出防御：
   ```javascript
   // 防蚀漆 (blocked) 阻断守恒：被防蚀漆完全覆盖的区域即使在强酸中刻深增量亦恒为 0
   if (blocked[i]) continue;
   ```
3. **平台与兼容性 Hack**：
   必须标注平台标识与解决的问题：
   ```javascript
   // macOS Gatekeeper & Tauri Webview 预热，消除窗口初次呈现时的白闪
   ```

---

## 5. 严格禁止的无效注释清单

* ❌ **复读式废话**：
  ```javascript
  // set running to false
  running = false;
  ```
* ❌ **大段注释掉的死代码（Dead Code）**：
  代码版本控制完全交由 Git 处理，废弃逻辑必须直接删除，禁止大面积留下被注释的代码块。
* ❌ **无依据的 TODO/FIXME 占位**：
  禁止出现孤立无上下文的 `// TODO: fix this`；必须标明原因与跟进 Issue 编号。
