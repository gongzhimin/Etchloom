# Lotus 3D 几何特征微服务接口设计规范 (INTERFACE_SPEC.md)

> **位置**：`services/lotus_geometry/docs/INTERFACE_SPEC.md`  
> **所属层次**：Layer 0 Lotus 深度与表面法线几何微服务 (Lotus 3D Geometry Service)  
> **服务协议**：HTTP/1.1 RESTful JSON API  
> **依赖端点**：与 `informative_drawings` 共用统一服务网关 (`http://127.0.0.1:7861`)

---

## 1. 接口设计哲学与职责边界 (Design Philosophy & Boundary)

1. **几何特征抽取专职性 (Geometry Extraction Dedication)**：
   本服务只负责从单目摄影图像中估计稠密深度图（Metric/Relative Depth）与表面法向量图（Surface Normal Map），严禁向响应中耦合任何排线逻辑或风格化着色。
2. **归一化物理量约定 (Normalized Physical Standards)**：
   服务对外输出的深度场与法线向量必须经过标准化物理量纲校准（深度在近远平面间映射为 $[0.0, 1.0]$，法向量模长严格归一化为 1.0）。

---

## 2. 强类型接口定义与数据结构契约 (Type Definitions & Data Contract)

### 2.1 深度估计端点：`POST /api/lotus/depth`

- **请求体格式 (JSON Schema)**：
  ```json
  {
    "type": "object",
    "required": ["image"],
    "properties": {
      "image": { "type": "string", "description": "输入摄影图像的 Base64 编码" },
      "outputFormat": { "type": "string", "enum": ["png16", "float32"], "default": "float32" }
    }
  }
  ```
- **成功响应体 (HTTP 200 OK)**：
  ```json
  {
    "type": "object",
    "required": ["success", "depthMap", "width", "height", "minDepth", "maxDepth"],
    "properties": {
      "success": { "type": "boolean", "const": true },
      "depthMap": { "type": "string", "description": "Base64 编码的 Float32Array (长度 = W * H * 4 bytes)" },
      "width": { "type": "integer" },
      "height": { "type": "integer" },
      "minDepth": { "type": "number", "minimum": 0.0 },
      "maxDepth": { "type": "number", "maximum": 1.0 }
    }
  }
  ```

### 2.2 表面法线估计端点：`POST /api/lotus/normals`

- **请求体格式 (JSON Schema)**：
  ```json
  {
    "type": "object",
    "required": ["image"],
    "properties": {
      "image": { "type": "string", "description": "输入图像 Base64" }
    }
  }
  ```
- **成功响应体 (HTTP 200 OK)**：
  ```json
  {
    "type": "object",
    "required": ["success", "normalMap", "width", "height"],
    "properties": {
      "success": { "type": "boolean", "const": true },
      "normalMap": { "type": "string", "description": "Base64 编码的 Float32Array (3 通道 Nx, Ny, Nz，长度 = W * H * 3 * 4 bytes)" },
      "width": { "type": "integer" },
      "height": { "type": "integer" }
    }
  }
  ```

---

## 3. 前置条件与参数合法性约束 (Pre-conditions)

1. **输入分辨率正定性**：
   - 图像解码后的像素宽高必须满足 $W \ge 64, H \ge 64$。若小于此下限，接口必须返回 `HTTP 422 Unprocessable Entity`。
2. **模型状态就绪前置**：
   - 调用方必须先通过 `GET /health` 确认 `services.lotusGeometry === true`。若 Lotus 模型尚未装载完成，服务端必须返回 `HTTP 503 Service Unavailable` 并指示重试等待。

---

## 4. 后置条件与状态变更承诺 (Post-conditions)

1. **表面法向量模长单位化承诺**：
   - 解码后的每一个法向量 $(N_x, N_y, N_z)$，其欧氏模长必须满足：
     $$|\|(N_x, N_y, N_z)\| - 1.0| \le 10^{-4}$$
2. **深度场单调性与无负值承诺**：
   - 深度矩阵中任意坐标的像素值必须满足 $0.0 \le d(x, y) \le 1.0$，其中 0.0 代表近裁剪平面，1.0 代表无穷远背景。

---

## 5. 系统不变量与守恒律 (System Invariants)

1. **右手世界坐标系不变量**：
   表面法线 $(N_x, N_y, N_z)$ 必须遵循计算机视觉标准右手坐标系（$+X$ 朝右，$+Y$ 朝下，$+Z$ 指向屏幕外观察者），确保前端计算横切截面向量时几何拓扑恒定。

---

## 6. 纯函数属性、副作用与内存所有权 (Side-effects & Memory Ownership)

1. **零跨请求状态驻留**：
   Lotus 模型的推理完全隔离在独立函数内，每次推理完成后释放中间激活张量，杜绝内存持续攀升。

---

## 7. 错误契约、并发与生命周期状态协议 (Error Handling & Lifecycle Protocol)

1. **优雅超时与降级支持**：
   若模型因 CPU 推理过慢导致单次请求耗时超过 20 秒，服务端应主动断开连接，以便前端网关迅速平滑切换为基于导向滤波的高低频几何降级算子。
