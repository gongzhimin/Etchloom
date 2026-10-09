# Core Algorithmic Pipeline (`src/core/`)

> **模块路径**：`src/core/`  
> **技术定位**：Layer 1 纯域算法层，承载 5 阶段离散数字古典版画生成管线与纯计算算子。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

本模块是 Etchloom 算法母版生成的核心大脑，完全独立于任何 UI 界面或宿主 DOM 环境。核心职责包括：
1. **阶段 1 (Informative Line)**：摄影图像到高保真连续线描感知的抽取与降级退避；
2. **阶段 2 (Tone & Flow)**：何恺明导向滤波多尺度色调分解与基于积分图的各向异性扩散场计算；
3. **阶段 3 (Contours & Depth)**：8-邻域中心线追踪、梯度子像素修正与 Lotus 3D 空气透视线宽衰减；
4. **阶段 4 (Hatching)**：曲面流场顺形排线调度，集成 15 组细分排线模块；
5. **阶段 5 (Master Print)**：母版矢量线条分层整合与物理微刻深度估算；
6. **无损编解码 (PlateCodec)**：连续 TypedArray 内存与紧凑 Base64 格式双向映射。

---

## 2. 内部架构与组件拓扑 (Internal Architecture & Component Map)

本模块经过严格的结构化分层重构，将核心算子、编解码器与图像分析拆分为高内聚的专属子目录，彻底消灭根目录散落平铺的文件：

```
src/core/
├── pipeline/                 # 5 阶段生成管线核心与调度中枢
│   ├── pipeline-runner.js    # 阶段流水线总调度器 (PipelineRunner)
│   ├── pipeline-types.js     # 阶段输入输出规范与内存工件结构
│   ├── stage1-informative.js # 阶段 1：神经/DoG 双模线描感知抽取
│   ├── stage2-tone-flow.js   # 阶段 2：导向滤波色调分解与等高场生成
│   ├── stage3-contours.js    # 阶段 3：空间骨干轮廓提取与深度调制
│   ├── stage4-hatching.js    # 阶段 4：空间曲面排线总调度器
│   └── stage5-master-print.js# 阶段 5：母版矢量合成与微刻深度
├── codecs/                   # 纯二进制与紧凑格式编解码协议
│   └── plate-codec.js        # TypedArray 物理版面与 Base64 无损互转
├── image/                    # 摄影图像几何分析与参数变奏
│   ├── photo-pro.js          # 多尺度对比度分析与自适应迷宫流纹理
│   └── generator.js          # 确定性 PRNG 种子变奏生成器
├── hatching/                 # 15 模块细分曲面排线算法系统 (详见 hatching/README.md)
├── plate/                    # 连续物理铜版与酸蚀仿真引擎 (详见 plate/README.md)
└── docs/                     # 架构设计、算法原理与测试文档
```

| 子目录 / 文件 | 核心类 / 导出对象 | 阶段角色 |
| :--- | :--- | :--- |
| `pipeline/pipeline-runner.js` | `PipelineRunner` | 5 阶段执行总调度中枢，支持全量、增量缓存复用与 AbortSignal 中断 |
| `pipeline/stage1-informative.js` | `Stage1Informative` | 阶段 1：线描感知抽取，支持神经微服务优先与自适应 DoG 边缘退避 |
| `pipeline/stage2-tone-flow.js` | `Stage2ToneFlow` | 阶段 2：高精度色调场分解、微纹理细节增强与等高切线计算 |
| `pipeline/stage3-contours.js` | `Stage3Contours` | 阶段 3：空间骨干轮廓提取与 Lotus 3D 空气透视深度调制 |
| `pipeline/stage4-hatching.js` | `Stage4Hatching` | 阶段 4：空间曲面排线总调度，协调 15 模块排线子系统 |
| `pipeline/stage5-master-print.js`| `Stage5MasterPrint` | 阶段 5：母版矢量合成、深度映射与分层图层输出 |
| `codecs/plate-codec.js` | `PlateCodec` | 纯连续 TypedArray 与 Base64 紧凑格式编解码协议 |
| `image/photo-pro.js` | `PhotoPro` | 多尺度对比度分析、灰度阶跃单调性映射与自适应迷宫流纹理 |
| `image/generator.js` | `PrintGenerator` | 确定性 PRNG 种子变奏生成器 |

```mermaid
graph LR
    P0[输入照片 / Recipe] --> S1[Stage 1: 线描感知]
    S1 --> S2[Stage 2: 色调与等高流场]
    S2 --> S3[Stage 3: 空气透视轮廓]
    S3 --> S4[Stage 4: 空间曲面排线]
    S4 --> S5[Stage 5: 矢量母版合成]
    S5 --> Out[MasterResult 矢量母版]
```

---

## 3. 核心算法原理与数学建模 (Mathematical Principles)

5 阶段算法数学原理完整推导详见 [docs/ALGORITHM.md](docs/ALGORITHM.md)：
- **导向滤波色调分解**：$a = \frac{\text{cov}(I, p)}{\text{var}(I) + \epsilon}, \quad b = \bar{p} - a \cdot \bar{I}$
- **高频微细节保持**：$D_{\text{detail}} = T_{\text{raw}} - T_{\text{base}}$
- **空气透视线宽衰减**：$w(z) = w_0 \cdot \max(1 - \alpha, 1 - \alpha \cdot \frac{z - 0.35}{0.65})$
- **DoG 几何边缘退避**：$DoG = G_{0.8} * I - 0.98 \cdot G_{1.6} * I$

---

## 4. 对外公共接口契约 (Public API Contract)

```typescript
interface PipelineRunner {
  run(recipe: MasterRecipe, options?: PipelineOptions): Promise<PipelineOutputs>;
}

interface PipelineOutputs {
  stage1LineMap: LineMapArtifact;
  stage2ToneFlow: ToneFlowArtifact;
  stage3Contours: ContoursArtifact;
  stage4Hatching: HatchingArtifact;
  masterResult: MasterResult;
}
```

---

## 5. 自动化测试与验证 (Testing & Verification)

针对本模块的测试文件包括：
- [`tests/pipeline-runner.test.cjs`](../../tests/pipeline-runner.test.cjs)（全量执行、增量执行、任务抢占中断）
- [`tests/five-stage-pipeline.test.cjs`](../../tests/five-stage-pipeline.test.cjs)（3 项：5阶段产物完整性、PhotoPro 产物、分层目录与门面等价性验证）
- [`tests/photo.test.cjs`](../../tests/photo.test.cjs)（7 项：对比度、留白、超高清 1800x1320）
- [`tests/refinement.test.cjs`](../../tests/refinement.test.cjs)（14 项：色调阶跃单调性、PlateCodec 无损编解码）
- [`tests/generator.test.cjs`](../../tests/generator.test.cjs)（9 项：确定性 PRNG 种子、边界包络）

运行验证命令：
```bash
node --test tests/pipeline-runner.test.cjs tests/five-stage-pipeline.test.cjs tests/photo.test.cjs tests/refinement.test.cjs tests/generator.test.cjs
```

---

## 6. 子文档导航 (Sub-documentation Index)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)：内部调用拓扑与数据流转设计
- [docs/ALGORITHM.md](docs/ALGORITHM.md)：5 阶段算子详尽数学模型与实现步骤
- [docs/INTERFACES.md](docs/INTERFACES.md)：管线算子强类型接口设计与契约规范
- [docs/TESTING.md](docs/TESTING.md)：测试套件矩阵与断言点
