# Internationalization Manager (`src/ui/i18n/`)

> **模块路径**：`src/ui/i18n/`  
> **技术定位**：Layer 3 界面公共服务层，提供中英文双语字典管理、响应式切换与 DOM 属性自动绑定。

---

## 1. 核心职责与工程目标 (Responsibilities & Objectives)

1. **双语字典集中维护**：提供中文 (`zh-CN`) 与英文 (`en-US`) 全量文案字典映射；
2. **DOM 自动属性绑定**：扫描所有带 `[data-i18n]` 与 `[data-i18n-placeholder]` 属性的 DOM 节点并实现即时更新；
3. **响应式持久化**：记录用户语言偏好至 `localStorage`。

---

## 2. 自动化测试与验证 (Testing & Verification)

- [`tests/ui.test.cjs`](../../../tests/ui.test.cjs)（3 项：语言切换、字典更新、DOM 属性绑定）
