<p align="center">
  <img src="docs/images/etchloom-logo.svg" width="132" alt="Etchloom Logo">
</p>

<h1 align="center">Etchloom (数字古典版画工坊系统)</h1>

<p align="center"><strong>基于三维几何驱动的纯算法矢量生成与虚拟铜版物理仿真系统</strong></p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img alt="Node 20+" src="https://img.shields.io/badge/Node.js-20%2B-596f50?style=flat-square">
  <img alt="零运行依赖" src="https://img.shields.io/badge/runtime_dependencies-0-c8b67e?style=flat-square">
  <img alt="测试通过率" src="https://img.shields.io/badge/tests-123%2F123%20PASS-16a34a?style=flat-square">
  <img alt="测试文件" src="https://img.shields.io/badge/test_files-28-2f3932?style=flat-square">
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-2f3932?style=flat-square"></a>
</p>

![Etchloom 工作台：左侧参数抽屉与右侧 7 阶段步骤流网格](docs/images/etchloom-workbench-zh.png)

---

## 1. 系统概览与工程定位 (Executive Summary)

Etchloom 是一套面向计算机图形学、计算摄影与数字版画制作的本地优先开源系统。工程核心目标在于将自然光摄影图像，通过几何管线与二维版面网格仿真，转换为具有顺形排线与凹版压印特征的数字版画与矢量母版。

系统彻底解耦了图像算法核心与前端展现宿主：
- **纯计算算法核心 (`src/core/`)**：基于二维导向滤波、结构张量场与 Jobard-Lefer 流线积分的 5 阶段离散数学管线，保持 Node.js/Browser 同构；
- **虚拟铜版物理仿真 (`src/core/plate/`)**：基于一维行优先平铺连续 TypedArray 内存网格，数值求解 2D 偏微分方程各向同性侧蚀扩散与干刻金属毛刺外翻；
- **现代解耦前端 (`src/ui/`, `index.html`)**：轻量骨架入口（60 行），通过 ES 模块动态装配模板，零内联脚本。

---

## 2. 核心架构亮点 (Core Architectural Highlights)

1. **5 阶段离散计算数学管线**：
   从图像灰度线描感知抽取（Stage 1）、多尺度色调场与等高切线场分解（Stage 2）、Lotus 3D 深度空气透视骨干轮廓（Stage 3）、15 模块曲面空间几何顺形排线（Stage 4），到最终母版矢量合成（Stage 5）。
2. **偏微分方程化学酸蚀仿真**：
   在 1500x1100 或 3000x2200 物理网格上数值解算 4-邻域侧向咬蚀与纵向深化偏微分方程，支持防蚀漆阻断掩膜与干刻金属毛刺酸溶衰减。
3. **算法核心与自动化测试**：
   主要算子与物理仿真可在 Node.js 环境测试；图像画布与推理请求仍包含浏览器或网络适配代码。当前 28 个测试文件的 123 项用例通过，测试通过率不代表代码覆盖率。
4. **DAG 状态增量缓存与阶段边界取消**：
   采用 32-bit DJB2 确定性哈希监听参数变化，修改排线参数时仅需重新计算 Stage 4~5，前置阶段毫秒级复用；基于 `AbortController` 瞬时抢占中止陈旧任务。

---

## 3. 严谨物理目录拓扑 (Directory Layout & Submodule Index)

```text
.
├─ index.html                               # 轻量骨架入口 (60 行，动态装配模板)
├─ package.json                             # 项目配置 (npm test / npm start)
├─ src/
│  ├─ main.js                               # 前端主入口 (Native ES Modules)
│  ├─ core/                                 # Layer 1: 5阶段算法核心 [查看文档](src/core/README.md)
│  │  ├─ pipeline/                          # 5 阶段管线算子与调度器
│  │  ├─ codecs/                            # 纯连续物理版面编解码
│  │  ├─ image/                             # 摄影图像分析与种子变奏
│  │  ├─ hatching/                          # 15 个排线与流场算法模块 (fields, rules, curves) [查看文档](src/core/hatching/README.md)
│  │  └─ plate/                             # 铜版物理仿真引擎 [查看文档](src/core/plate/README.md)
│  │     ├─ engine/                         # 虚拟铜版画核心装配引擎
│  │     ├─ physics/                        # 2D偏微分酸蚀扩散物理仿真
│  │     └─ renderer/                       # 凹版压印与光影着色器
│  ├─ orchestration/                        # Layer 2: 任务调度与增量缓存 [查看文档](src/orchestration/README.md)
│  │  ├─ engine/                            # DAG 管线调度编排核心
│  │  ├─ scheduler/                         # 任务队列与微任务抢占器
│  │  ├─ cache/                             # DJB2 确定性哈希阶段缓存
│  │  ├─ export/                            # 矢量与位图序列化导出器
│  │  └─ telemetry/                         # 性能时延与阶段日志探针
│  ├─ services/                             # Layer 2: 微服务网关 [查看文档](src/services/README.md)
│  │  └─ client/                            # 前端微服务通信与容灾降级网关 (WebAI & Remote)
│  └─ ui/                                   # Layer 3 & 4: 前端界面总装 [查看文档](src/ui/README.md)
│     ├─ i18n/                              # 中英双语国际化词条字典
│     ├─ templates/                         # HTML UI 装配微模板
│     ├─ controllers/                       # 业务控制器 [查看文档](src/ui/controllers/README.md)
│     ├─ components/                        # 原子组件与放大镜交互 [查看文档](src/ui/components/README.md)
│     └─ store/                             # 应用状态中心 [查看文档](src/ui/store/README.md)
├─ services/                                # Layer 0: Python 神经网络微服务
│  ├─ informative_drawings/                 # 灰度线描推理服务 [查看文档](services/informative_drawings/README.md)
│  └─ lotus_geometry/                       # Lotus 深度与法线模型 [查看文档](services/lotus_geometry/README.md)
├─ styles/                                  # 莫兰迪古典浅色工作室设计系统 CSS (Fresh Atelier Light app.css)
├─ tests/                                   # 28 个自动化测试文件 (当前 123 项测试通过)
├─ docs/                                    # 规范工程技术规范与数据字典 [查看索引](docs/DOCUMENTATION_INDEX.md)
└─ archive/                                 # 历史归档资产与探索性实验
```

---

## 4. 核心算法原理与数学建模摘要 (Mathematical Principles)

- **导向滤波色调分解**：$a = \frac{\text{cov}(I, p)}{\text{var}(I) + \epsilon}, \quad b = \bar{p} - a \cdot \bar{I}$
- **空气透视深度线宽衰减**：$w(z) = w_0 \cdot \max(1 - \alpha, 1 - \alpha \cdot \frac{z - 0.35}{0.65})$
- **2D 偏微分方程各向同性侧蚀扩散**：$E^{t+\Delta t} = \min(1.0, E^t + \max(0, E_{\text{edge}} - E^t) \cdot \Delta t \cdot S \cdot (0.14 + 0.55 G \eta))$

---

## 5. 三级运行模式与环境配置 (3-Tier Execution Modes & Environments)

系统原生支持三级渐进增强执行拓扑，UI 顶栏与状态区实时展示当前生效的后端：

| 模式层级 | 运行环境 | 依赖与网络需求 | 核心能力与适用场景 |
| :--- | :--- | :--- | :--- |
| **1. 基础离线模式**<br>`Offline Mode (Geometric)` | 浏览器 + 本地 HTTP 服务（`npm start`） | 基础几何计算无需外网或第三方运行依赖 | 基于几何算子与铜版网格仿真；原生 ESM 入口需要经 HTTP 服务加载，不保证直接打开 `file://` 可运行 |
| **2. 联网浏览器 WebAI 模式**<br>`Online Model (WebGPU/WASM)` | 现代化浏览器 | 首次需要联网；后续离线复用取决于浏览器缓存及模型是否完整缓存 | 基于 CDN 动态按需加载运行库与深度模型，在浏览器中尝试神经网络推理；加载失败时回退至纯几何解析 |
| **3. 本机 Python 服务模式**<br>`Local AI (CUDA / MPS)` | 本地 Python 虚拟环境 | 本地启动 `http://127.0.0.1:7861`，可全离线 | 基于本地 PyTorch + CUDA/DirectML 硬件加速，执行完整的 Lotus 几何模型与高精度线描推理 |

### 5.1 快速启动前端工坊
```bash
npm start
```
浏览器访问 <http://127.0.0.1:4173/>（或通过 `?lang=en` 访问英文界面）。

### 5.2 启动 Python AI 本地辅助服务（可选）
```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-model.ps1
```
服务成功拉起后，前端网关将自动探测并无缝升级至本机 CUDA 服务。

### 5.3 跨平台桌面独立客户端 (Desktop Release)
若需要脱离浏览器直接作为独立软件使用：
- 前往 GitHub 仓库右侧 **Releases** 页面下载最新发布的安装包；
- **Windows**: 下载 `Etchloom-Setup.exe` 或 `.msi`（体积仅 ~15 MB，开箱即用）；
- **macOS**: 下载 `Etchloom.dmg`；
- 桌面客户端原生支持离线纯几何模式与 WebGPU 本地加速，若后台开启了 Python 服务亦可自动连接。

---

## 6. 自动化测试与质量保障体系 (Testing & Quality Assurance)

```bash
npm test
```
**本次运行结果**：28 个测试文件，123 项测试用例通过（约 5.2 秒）；结果随代码与运行环境变化。
详见 [docs/03_testing_qa/TEST_SPECIFICATION.md](docs/03_testing_qa/TEST_SPECIFICATION.md)。

---

## 7. 开源许可证与贡献指南 (License & Contributing)

- **开源协议**：本项目基于 [MIT 许可证](LICENSE) 开源；
- **贡献规范**：请审阅 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [docs/DOCUMENTATION_SPECIFICATION.md](docs/DOCUMENTATION_SPECIFICATION.md)。
