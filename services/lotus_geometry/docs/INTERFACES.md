# Lotus 3D 几何特征微服务接口设计规范 (INTERFACES.md)

> **位置**：`services/lotus_geometry/docs/INTERFACES.md`  
> **所属层次**：Layer 0 Lotus 深度与表面法线几何微服务 (Lotus 3D Geometry Service)  
> **服务协议**：Python CLI 批处理与 HTTP/1.1 API (共用网关端口 `http://127.0.0.1:7861`)  

---

## 1. 接口设计哲学与职责边界 (Design Philosophy & Boundary)

1. **几何特征抽取专职性 (Geometry Extraction Dedication)**：
   本服务只负责从单目摄影图像中估计稠密深度图（Metric/Relative Depth）与表面法向量图（Surface Normal Map），严禁向响应中耦合任何排线逻辑或风格化着色。
2. **多模态交付协议**：
   - **CLI 模式**：直接导出 Float32 二进制格式 (`.bin`) 及可视化预览图 (`.png`)，供零拷贝高速离线分析；
   - **HTTP 模式**：通过网关端点 `POST /depth` 接收原始图片并返回 8-bit PNG 深度图。

---

## 2. CLI 命令行参数接口 (`geometry_cli.py`)

```bash
python geometry_cli.py \
  --input <image_path> \
  --output-dir <output_dir> \
  [--task depth|normal|both] \
  [--processing-res 768] \
  [--device cuda|cpu] \
  [--fp16] \
  [--fallback]
```

### 产物规范：
* `depth.bin`: 连续行优先 `Float32Array`，归一化深度 $[0.0, 1.0]$；
* `depth_vis.png`: 8-bit 伪彩色/灰度深度可视化图；
* `normal.bin`: 3通道连续行优先 `Float32Array` ($W \times H \times 3$)，法向量归一化 $[Nx, Ny, Nz]$；
* `normal_vis.png`: RGB 法线空间可视化图。

---

## 3. HTTP 服务契约 (由统一服务提供)

- **端点**：`POST /depth` (`http://127.0.0.1:7861/depth`)
- **请求体**：图像二进制数据 (JPEG/PNG)
- **响应体**：PNG 深度图二进制流 (`Content-Type: image/png`)
