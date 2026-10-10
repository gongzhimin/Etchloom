---
title: 领域核心模块内部架构与实现约束
status: Active
doc-id: ARCH-CORE
owner-module: core
created: 2026-10-08T19:31:17+08:00
modified: 2026-10-10T20:25:00+08:00
---

# 领域核心模块内部架构与实现约束

## 1. 模块定位

- **承接需求**：[`docs/requirements/REQUIREMENTS.md#51-领域核心模块-core`](../../../../docs/requirements/REQUIREMENTS.md#51-领域核心模块-core)（`REQ-CORE-001`、`REQ-CORE-002`、`REQ-CORE-003`；验收标准：`AC-CORE-001`、`AC-CORE-002`）；
- **系统角色**：Layer 1 纯计算领域核心，负责图像感知、微结构分析、几何排线及铜版连续物理场仿真；对外不持有任何界面状态。

## 2. 模块架构图

```text
┌─────────────────────────────────────────────────────────────┐
│                 PipelineRunner (管线门面调度器)             │
└──────────────┬──────────────────────────────┬───────────────┘
               │ 阶段调度数据流               │ 状态转换
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│     5 阶段生成流水线        ││      虚拟铜版物理引擎        │
│  Stage 1: DoG 线描感知      ││  VirtualPlateEngine          │
│  Stage 2: 导向滤波色调场    ││  - 四物理场连续数组          │
│  Stage 3: 空气透视轮廓      ││  - 4 种刻绘工具离散算子      │
│  Stage 4: 曲率顺形排线      ││  - 2D PDE 酸液潜蚀模拟       │
│  Stage 5: 母版矢量合成      ││  - 预入酸基准快照回滚        │
└──────────────┬──────────────┘└──────────────┬───────────────┘
               │ 内部引用                     │ 编解码
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│  hatching/ 微分流线子系统   ││  codecs/ 纯连续内存编解码    │
│  - Jobard-Lefer 流线积分    ││  - PlateCodec (Base64 互转)  │
│  - 自注意力与留墨预算门控   ││                              │
└─────────────────────────────┘└──────────────────────────────┘
```

## 3. 内部结构

- **`pipeline/`**：包含 Stage 1 至 Stage 5 的具体实现，由 `PipelineRunner` 统一提供入口；各阶段产物只读隔离，不原地修改前序缓冲区。
- **`plate/`**：包含 `VirtualPlateEngine`，管理高分辨率 TypedArray 铜版物理场与酸槽偏微分方程时间步进解算。
- **`hatching/`**：包含流线微分积分（`hatch-streamline.js`）、空间注意力（`hatch-attention.js`）、墨量守恒门控等排线子算子。
- **`codecs/`**：包含 `plate-codec.js`，提供 TypedArray 状态与 Base64 紧凑格式的双向编解码。
- **`image/`**：包含图像辅助分析、多尺度对比度与 PRNG 种子变奏生成。

## 4. 文件结构树

```text
src/core/
├── pipeline/
│   ├── pipeline-runner.js      # 核心门面：5 阶段管线总调度
│   ├── stage1-informative.js   # 阶段 1：线描感知抽取
│   ├── stage2-tone-flow.js     # 阶段 2：色调分解与切线流
│   ├── stage3-contours.js      # 阶段 3：骨干轮廓与空气透视
│   ├── stage4-hatching.js      # 阶段 4：空间曲面排线总装
│   └── stage5-master-print.js  # 阶段 5：矢量合成与刻深初估
├── plate/
│   ├── engine/virtual-plate-engine.js  # 虚拟铜版引擎门面
│   └── physics/acid-simulator.js       # 2D PDE 酸蚀仿真器
├── hatching/                   # 微分流线积分与曲率门控算法
├── codecs/plate-codec.js       # 连续数组编解码器
└── image/                      # 图像色调分析与变奏
```

## 5. 内部依赖

- `pipeline/` 协调调用 `hatching/` 与 `image/`；
- `plate/` 依赖 `codecs/` 完成状态快照序列化；
- ❌ **禁止反向依赖**：`hatching/` 与 `codecs/` 严禁反向依赖 `pipeline/`。

## 6. 实现约束

1. **绝对零 DOM 原则**：源码严禁出现任何 `window`、`document`、`HTMLElement`，确保纯 Node.js 测试与 Worker 零异常。
2. **零 GC 内存压力**：密集像素与物理场计算必须使用一维扁平 `Float32Array` / `Uint8Array`，严禁在像素循环内新建小对象。
3. **零 NaN 扩散容忍**：所有连续数学除法、采样与开根号必须通过 `Number.isFinite` 屏障保护。

## 7. 对外边界

本模块对外通过单一入口门面暴露能力，具体签名与契约参见 [`INTERFACES.md`](INTERFACES.md)：
- **`PipelineRunner.run(context, options)`**：母版管线计算总入口；
- **`VirtualPlateEngine`**：虚拟铜版物理交互与仿真引擎入口。
