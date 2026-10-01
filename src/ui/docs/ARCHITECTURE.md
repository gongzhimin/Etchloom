# UI 前端总装架构与分层设计规范 (ARCHITECTURE.md)

> **模块路径**：`src/ui/`  
> **上级体系规范**：[docs/00_architecture/ARCHITECTURE_OVERVIEW.md](../../../docs/00_architecture/ARCHITECTURE_OVERVIEW.md)

---

## 1. 前端分层与组件关系图 (UI Layered Architecture)

```mermaid
graph TD
    HTML[index.html 极简骨架 (60行)] --> Mount[templates/layout-templates.js 动态装配]
    Mount --> DOM[#app 容器]
    Main[src/main.js ESM 主入口] --> Controllers[ui/controllers/]
    
    Controllers --> PC[pipeline-controller.js]
    Controllers --> PSC[plate-studio-controller.js]
    Controllers --> TWC[transfer-wizard-controller.js]
    Controllers --> LBC[lightbox-controller.js]

    Controllers --> Store[ui/store/app-store.js 响应式状态]
    Controllers --> Components[ui/components/]
    Components --> Loupe[loupe.js 悬停放大镜]
    Components --> Grid[step-flow-grid.js 7阶段卡片]

    Main --> I18n[ui/i18n/i18n.js 双语绑定]
```

---

## 2. 事件驱动与状态迁移机制 (Event Delegation & Reactivity)

1. **顶层统一挂载**：`index.html` 加载完成后，`main.js` 检查 `#app` 是否存在，若无内容自动调用 `mountAppLayout(root)` 注入完整 DOM；
2. **事件委托防内存泄漏**：在父级容器上统一代理点击事件（如模式切换按钮 `.mode-btn`、工具按钮 `.tool-btn`），动态增删子节点无需重新绑定事件；
3. **真实耗时统计**：`PipelineController` 在各阶段执行时严格调用 `performance.now()` 计算真实渲染微秒，彻底根除模拟耗时。
