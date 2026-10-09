# 统一接口设计与通信契约规范 (API_RULES)

> **规范编号**：STD-OPT-API-001  
> **适用范围**：跨模块调用、Service Gateway、Web Worker 通信与 Native Tauri IPC  
> **设计哲学**：单一入口门面 (Single-Entry Facade)、复杂度对外终极隐藏、最小暴露面  
> **与设计文档区别**：本规范规定接口设计范式、错误处理与版本约定；具体接口签名由各级 `INTERFACES.md` 权威定义。  

---

## 1. 单一入口门面与复杂度隐藏原则 (Single-Entry Facade & Complexity Encapsulation)

为降低模块间耦合度并杜绝内部实现细节泄露，系统所有一级子系统与独立功能模块必须严格遵守**门面模式（Facade Pattern）**：

1. **单一主入口原则 (Single Primary Entrypoint)**：
   每个模块对外原则上**只提供 1 个主交互入口**。
   * **反模式 (Anti-pattern)**：外部调用方必须知道模块内部有 A、B、C 三个阶段，并手动实例化 A、把 A 的输出塞给 B、再把 B 的中间矩阵传给 C；
   * **标准模式 (Standard Pattern)**：模块通过单一门面函数或门面类（如 `PipelineRunner.run(context, options)`、`Orchestrator.scheduleRecipe(recipe)`）接收高层配置，内部子管道、滤波张量和内存编解码在内部完成黑盒闭环。
2. **复杂度终极隐藏原则 (Information Hiding Principle)**：
   * 模块内部的密集数组连续寻址（如 TypedArray 步长、行优先偏移）、状态机中间态、DAG 哈希比对拓扑与多级缓存，严格封装在模块边界内；
   * 对外接口仅接受自解释的参数配置对象（Parameter Object / Options Bag），严禁向外部泄漏底层裸指针、私有标记或需要调用方手动释放的临时句柄。
3. **最小暴露面原则 (Minimal Surface Area)**：
   非公共门面所必需的内部辅助函数、调试钩子或中间步进方法，严禁通过 `export` 导出给跨模块使用。

---

## 2. 命名与调用范式

1. **动宾短语命名**：公共方法统一采用小驼峰动宾结构，语义明确：
   * 门面调度与执行：`run(...)`, `scheduleRecipe(...)`, `infer(...)`
   * 状态变更：`allocatePlate(...)`, `toggleEtch(...)`, `resetEtch(...)`
   * 序列化与导出：`exportPayload(...)`
2. **纯函数优先与无状态服务**：
   计算类接口严禁依赖隐式全局变量，所有输入均通过配置对象显式注入，保证在 Node.js、Web Worker 和浏览器主线程环境具备完全同构的计算确定性。

---

## 3. 异常与错误处理规范

1. **统一错误语义**：
   禁止静默 swallow 异常或仅打印 `console.log`。错误应抛出标准 `Error` 实例，并携带清晰的模块标识前缀：
   ```javascript
   throw new Error('[VirtualPlateEngine] 版面尺寸无效: 仅支持 900, 1500, 3000');
   ```
2. **异步抢占与取消契约**：
   所有支持高频调用的异步任务（如神经网络推断、多层排线计算）必须支持 `AbortSignal` 标准协议。当信号触发中止时，必须及时释放耗时运算资源并抛出带有 `AbortError` 标识的异常。
3. **无断点平滑降级承诺 (Graceful Degradation)**：
   服务代理类接口（如 `AIServiceGateway`）在面对网络抖动、端口未监听或超时等异常时，绝对禁止向外抛出致命阻断异常，必须在门面内部静默捕获并自动降级为离线纯几何模式。

---

## 4. 跨端与 IPC 契约格式

与 Tauri 后端或 Web Worker 交互时，通信载荷必须遵循统一信封规范：
```json
{
  "code": 0,
  "data": { ... },
  "message": "success",
  "timestamp": 1728400000000
}
```
* `code === 0`：操作成功；
* `code !== 0`：操作失败，`message` 包含可读失败原因。
