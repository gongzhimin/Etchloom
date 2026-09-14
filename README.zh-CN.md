<p align="center">
  <img src="docs/images/etchloom-logo.svg" width="132" alt="Etchloom Logo">
</p>

<h1 align="center">Etchloom</h1>

<p align="center"><strong>让图像在刻线中重新生长。</strong></p>

<p align="center">
  一套本地运行的生成式数字版画工作台：从图片刻线、虚拟制版到腐蚀与压印。
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img alt="Node 20+" src="https://img.shields.io/badge/Node.js-20%2B-596f50?style=flat-square">
  <img alt="零运行依赖" src="https://img.shields.io/badge/runtime_dependencies-0-c8b67e?style=flat-square">
  <img alt="本地优先" src="https://img.shields.io/badge/local--first-yes-766d4e?style=flat-square">
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-2f3932?style=flat-square"></a>
</p>

![Etchloom 工作台：左侧原图与右侧生成刻线](docs/images/etchloom-workbench.png)

Etchloom 将照片重新组织成可编辑的版画刻线。区域排线跟随形体，交叉排线进入阴影，微细节针痕保留小尺度结构，随机种子则让每次变奏都可以复现。完成的刻线可以转入虚拟铜版，继续腐蚀、上墨、加压并得到印样。

## 核心能力

- **图片驱动的刻线**：轮廓、明暗、局部纹理与结构方向共同决定线条。
- **结构感知净化**：先用自适应保边扩散清理照片颗粒，再以跨尺度可信度挑选可刻细节。
- **素描刻线骨架**：用 XDoG 思路提炼结构，再细化为受保护的主轮廓、结构线和细节线；净化灰度图独立控制版画明暗。
- **多尺度细节**：大明暗块、中尺度线束和微细针痕共同刻画图像。
- **细丝轮廓识别**：胡须、触角等窄结构会收束为渐隐中心线，避免双边缘叠成粗黑线。
- **可编辑线场**：引导局部方向、恢复留白或保护已经完成的区域。
- **虚拟制版**：分别控制刻深、防蚀层、酸液、擦版留墨、压力和纸张。
- **独立版画外框**：AI 线稿与素描底图共享细刻线、双层和粗糙版边，可调边距与手工起伏。
- **可复现变奏**：相同图片、参数和种子会得到相同的版画设计。
- **面向印刷的导出**：支持物理尺寸 PNG、SVG、设计方案和完整虚拟版。
- **图片留在本机**：所有分析与生成均在浏览器内完成。

## 从图像到印样

```mermaid
flowchart LR
    A[照片] --> B[图像分析]
    B --> C[刻线语法]
    C --> D[可编辑线场]
    D --> E[虚拟铜版]
    E --> F[腐蚀与上墨]
    F --> G[压印成像]
```

虚拟版会分别保存刻深、暴露材料和防蚀保护。同一块版可以通过不同的墨量、擦版、压力与纸张得到不同印样。

## 快速开始

Etchloom 的网页端没有构建步骤。使用本机 Informative Drawings 推理时，需要 Python、PyTorch、Pillow 和约 17 MB 的官方模型权重。

### 直接打开

双击根目录的 `index.html` 可以使用导入线稿和浏览器内置算法。本机模型模式需要通过下面的本地服务器打开工作台。

### 启动本地工作台

推荐使用 Node.js 20 或更高版本：

```bash
npm start
```

打开 <http://127.0.0.1:4173/>。本地服务器会启用 Web Worker，让精细生成在后台运行。下面的地址会自动载入复杂压力样片，其中包含花叶、玻璃、陶器、猫、胡须、布褶和背景结构：

```text
http://127.0.0.1:4173/?demo=1
```

## 刻线语言

| 层次 | 作用 |
|---|---|
| 区域排线 | 建立稳定的局部方向和成束针痕节奏 |
| 交叉排线 | 随中间调与暗部逐渐增加密度 |
| 微细刻线 | 保留发丝、叶缘、砖缝和表面变化 |
| 细丝中心线 | 用渐隐单线表现胡须、触角和孤立窄线 |
| 失落轮廓 | 省略弱边缘，同时保留关键剪影 |
| 暗部墨团 | 加深最暗区域，并留下少量纸面亮孔 |
| 背景线场 | 塑造环境调子，在主体强边缘前停止 |

## 局部编辑与制版工具

| 工具 | 用途 |
|---|---|
| 引导方向 | 将选区内刻线弯向指定方向 |
| 留白 | 移除刻线并恢复纸面 |
| 保护 | 固定满意区域，使后续变奏不再改变它 |
| 刻针 / 干刻针 | 直接在虚拟版上增加刻痕 |
| 防蚀层 / 刮磨器 | 阻止继续腐蚀或减浅已有刻痕 |

## 导出与复现

Etchloom 可以导出带物理 DPI 的 PNG、可缩放 SVG 刻线路径、可复现设计方案，以及包含刻深和防蚀数据的完整虚拟版。目标针宽与增墨补偿会真正作用于制版、PNG 和 SVG 输出。

方案文件保存灰度分析、参数和随机种子，不保存原始彩色照片。旧版 `kejian-design` 方案和浏览器收藏仍然可以读取。

## 项目结构

```text
.
├─ index.html                 浏览器入口与虚拟铜版工作台
├─ src/
│  ├─ core/                  生成、刻线与制版编码
│  ├─ ui/                    图片工作流与局部编辑
│  └─ workers/               后台生成 Worker
├─ styles/                   工作台样式
├─ tests/                    可复现的 Node 测试
├─ examples/                 程序生成的公开示例图片
├─ docs/                     算法说明与精进计划
├─ scripts/                  本地服务器与性能基准
└─ .github/workflows/        持续集成
```

## 开发

```bash
npm run model:download
npm run model:start # 启动 7861 端口的本机 Informative Drawings 模型
npm start           # 启动 4173 端口的 Etchloom 工作台
npm test          # 运行全部 70 项测试
npm run benchmark # 更新 BENCHMARK.json
```

首次运行还需为某个 Python 环境安装 `services/informative_drawings/requirements.txt`。启动脚本会自动寻找满足依赖的项目虚拟环境、Conda 环境或系统 Python；也可以用 `ETCHLOOM_MODEL_PYTHON` 指定解释器。模型权重位于 `services/informative_drawings/weights/model.pth`，不会提交到 Git，下载后会核对官方文件的 SHA-256。完整说明见[本机模型集成指南](docs/INFORMATIVE_DRAWINGS_INTEGRATION.md)。

核心代码同时兼容浏览器和 Node 测试。自动测试覆盖生成复现、细节保留、区域刻线语法、虚拟版保存、物理线宽换算、Worker 取消和直接文件运行。

进一步阅读：[纯素描底图路线调研](docs/SKETCH_ONLY_RESEARCH.md)、[下一阶段算法调研](docs/ALGORITHM_RESEARCH.md)、[刻线纹理计划](docs/LINE_TEXTURE_PLAN.md)、[图像净化管线](docs/IMAGE_CLEANUP.md)、[素描结构管线](docs/SKETCH_PIPELINE.md)、[细丝算法调研](docs/FILAMENT_RESEARCH.md)、[精进记录](docs/REFINEMENT_PLAN.md)和[贡献指南](CONTRIBUTING.md)。

## 实物标定

针宽已经按物理尺寸换算。纸张吸墨、腐蚀扩张和压力预设目前仍是视觉模型，需要通过真实印样继续标定。

## 许可证

[MIT](LICENSE) © 2026 Contributors
