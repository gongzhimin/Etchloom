---
title: 编排调度模块算法与增量缓存规范
status: Active
doc-id: ALG-ORCH
owner-module: orchestration
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:41:00+08:00
---

# 编排调度模块算法与增量缓存规范 (ALG-ORCH)

## 1. 算法背景与数学模型

在交互式版画调参场景中，5 阶段管线计算耗时较高。若每次调参全量重新执行，用户界面将频繁顿卡。本模块实现确定性增量缓存与防抖抢占算法：

### 1.1 32-bit DJB2 确定性状态哈希方程
将阶段控制参数字典规范化为规范 JSON 字符串，并包含前序阶段哈希形成哈希链：
$$h_0 = 5381$$
$$h_{i+1} = \left( (h_i \cdot 33) + \text{ord}(str[i]) \right) \pmod{2^{32}}$$
利用位移运算等价实现：
$$h_{i+1} = \left( (h_i \ll 5) + h_i + \text{ord}(str[i]) \right) \mid 0$$
最终哈希转换为 base-36 紧凑字符串。

### 1.2 DAG 拓扑失效剪枝模型
管线阶段满足严格依赖序列 $S_1 \to S_2 \to S_3 \to S_4 \to S_5$。
定义阶段 $k$ 的失效判据：
$$\text{invalidated}(k) = (H_k^{\text{new}} \neq H_k^{\text{old}}) \lor \text{invalidated}(k-1)$$
首个失效阶段 $k^* = \min \{ k \mid \text{invalidated}(k) = \text{true} \}$。
对于所有 $j < k^*$，直接复用缓存条目 $\mathcal{C}[j]$；对于所有 $j \ge k^*$，执行计算并更新缓存。

## 2. 算法流程与伪代码

```text
算法: DAG 增量失效判定与解析 (resolveInvalidation)
输入: 新配方参数集 NewRecipes, 当前缓存条目集合 Cache
输出: 首个失效阶段 firstInvalidatedStage, 可复用产物 ReusedOutputs

1: prevHash <- null
2: firstInvalidated <- null
3: for stageIndex = 1 to 5 do:
4:     currentHash <- computeStageHash(stageIndex, NewRecipes[stageIndex], prevHash)
5:     cachedEntry <- Cache.get(stageIndex)
6:     if firstInvalidated == null then:
7:         if cachedEntry == null or cachedEntry.hash != currentHash then:
8:             firstInvalidated <- stageIndex
9:         end if
10:    end if
11:    prevHash <- currentHash
12: end for
13: return firstInvalidated
```

## 3. 边界条件与数值稳定性

1. **JSON 序列化键序无关性**：对象键序不同不应影响哈希结果，必须在哈希前进行键名字典序排序 (`CanonicalJSON`)；
2. **浮点精度舍入**：针对参数中的浮点数值，统一规整为小数点后 4 位，避免极小浮点微差导致缓存无谓失效；
3. **哈希溢出截断**：`| 0` 保证在 32 位有符号整数范围内严格对齐，防止跨平台 JS 引擎数值差异。

## 4. 复杂度分析与性能基准

- **哈希计算耗时**：单阶段参数哈希耗时 $< 0.05\text{ms}$；
- **失效判定耗时**：全量 5 阶段哈希链比对耗时 $< 0.3\text{ms}$；
- **内存占用**：单次缓存维护 5 个阶段输出引用，空间随画布尺寸成正比，受最大缓存条目容量上限约束。

## 5. 验证与黄金样本

- **哈希敏感度验证**：修改参数中任一浮点数 $0.001$，计算出的哈希字符串必须完全不同；
- **确定性重现验证**：连续 10,000 次计算相同参数字典，返回的哈希值比特级一致；
- **失效单调性**：测试套件 `tests/stage-cache.test.cjs` 确保修改 Stage 3 参数时，Stage 1 和 Stage 2 绝对不被标记为失效。
