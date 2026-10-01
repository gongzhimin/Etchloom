# 全局应用状态中心架构规范 (ARCHITECTURE.md)

> **模块路径**：`src/ui/store/` (`app-store.js`)  
> **上级体系规范**：[docs/00_architecture/ARCHITECTURE_OVERVIEW.md](../../../../docs/00_architecture/ARCHITECTURE_OVERVIEW.md)

---

## 1. 响应式发布订阅架构 (Pub/Sub Store Architecture)

`AppStore` 是纯原生 JavaScript 实现的单向数据流全局状态中心，无需引入 Redux 或 Vuex 等重型依赖：

```mermaid
graph LR
    Action[用户交互 / 控制器 Action] -->|dispatch(key, value)| Store[AppStore 单例]
    Store --> State[不可变应用状态集]
    Store -->|notify()| Sub1[StepFlowGrid 渲染器]
    Store -->|notify()| Sub2[PlateStudio 画布]
    Store -->|notify()| Sub3[ActivityLog 终端]
```

---

## 2. 状态树规范契约 (State Tree Schema)

```typescript
interface AppState {
  currentMode: 'master' | 'plate';
  currentLocale: 'zh-CN' | 'en-US';
  activePlateTool: 'needle' | 'drypoint' | 'stopout' | 'scraper';
  acidTimeSeconds: number;
  isAcidActive: boolean;
  plateResolution: 900 | 1500 | 3000;
  masterRecipe: MasterRecipe | null;
  pipelineOutputs: PipelineOutputs | null;
}
```
