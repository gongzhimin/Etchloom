# 全局状态中心测试规范 (TESTING.md)

> **被测模块**：`src/ui/store/app-store.js`  
> **执行命令**：`node --test tests/ui.test.cjs`

---

## 1. 测试用例与断言矩阵

| 测试用例名 | 验证目标 | 关键断言点 |
| :--- | :--- | :--- |
| `AppStore: State mutations and listener notifications` | 状态变更与监听触发 | 触发 `set('currentMode', 'plate')` 后，注册的监听回调必须立即收到新值且旧值正确保留 |
| `AppStore: Listener unsubscription` | 监听注销 | 调用返回的 `unsubscribe()` 函数后，后续状态变更不再触发该回调 |
