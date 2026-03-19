# CODEX_PHASE1_REVIEW_FIXES

## 1. 目的

本文件只记录当前 Phase 1 审查中两条明确问题的修复方法：

1. 关键行为测试文件未纳入变更集。
2. 集成测试用 hook 被无条件暴露到生产运行时。

不讨论其他 Phase 2/Phase 3 范围内容。

## 2. 问题一：关键行为测试未纳入变更集

### 2.1 问题定义

当前已经补出了真正有价值的行为测试：

1. `tests/codexSecondaryPanel.behavior.test.js`
2. `tests/codexSecondaryPanel.integration.test.js`

但这两份文件仍是未跟踪状态。若此时提交：

1. `package.json` / `package-lock.json` 会引入 `jsdom`
2. 生产代码会继续保留改动
3. 但真正用于约束 Phase 1 默认态的测试不会进入仓库

这会破坏“修复与验收同时入库”的完整性。

### 2.2 修复方法

1. 将以下文件一并纳入本轮变更：
   - `tests/codexSecondaryPanel.behavior.test.js`
   - `tests/codexSecondaryPanel.integration.test.js`
   - `package.json`
   - `package-lock.json`
2. 明确这两份测试的定位：
   - `behavior.test.js`：轻量行为回归，验证核心显隐规则
   - `integration.test.js`：加载真实 `terminal_client.js` + 真实 DOM 结构，验证冷启动默认态和 `session_info/codex_capabilities` 重置逻辑
3. 将这两份测试加入本轮实际执行命令，而不是只保留源码正则测试。

### 2.3 最低执行要求

本轮至少执行：

```powershell
node --test tests/codexClient.shell.test.js tests/codexShellView.test.js
node --test tests/codexSecondaryPanel.behavior.test.js
node --test tests/codexSecondaryPanel.integration.test.js
```

若要一次性覆盖：

```powershell
node --test
```

### 2.4 验收标准

满足以下全部条件才算修复完成：

1. 两份新测试文件不再是 untracked。
2. `package.json` 和 `package-lock.json` 与测试文件一起进入同一轮变更。
3. 新测试被真实执行并通过。
4. 审查结论不再依赖“真机失败但仓库没有对应自动化”的状态。

## 3. 问题二：测试 hook 无条件暴露到生产运行时

### 3.1 问题定义

当前 `public/terminal_client.js` 把如下能力挂到了：

```js
window.__CODEX_TEST_HOOKS__
```

且暴露条件是：

```js
if (typeof window !== 'undefined' && window.location)
```

这意味着：

1. 浏览器环境会暴露
2. Android WebView 会暴露
3. 生产运行时可以直接拿到 `codexState`
4. 生产运行时可以直接调用渲染函数

这不是测试隔离，而是把内部调试接口开放到了真实页面。

### 3.2 修复方法

推荐只保留一种方案，不要混搭。

#### 方案 A：显式测试开关

只在明确测试模式下暴露 hook，例如：

1. `window.__TERMLINK_TEST_MODE__ === true`
2. 或 query 参数明确包含测试标记
3. 或注入配置里存在 `testMode: true`

推荐形式：

```js
const shouldExposeCodexTestHooks = !!(
    typeof window !== 'undefined'
    && window.__TERMLINK_TEST_MODE__ === true
);

if (shouldExposeCodexTestHooks) {
    window.__CODEX_TEST_HOOKS__ = { ... };
}
```

#### 方案 B：测试专用包装入口

不在生产脚本中暴露 hook，而是在测试里：

1. 通过 `vm`/`JSDOM` 注入测试桥
2. 或在测试专用 bootstrap 脚本中读取内部函数

这个方案更干净，但改造成本略高。

### 3.3 推荐决策

当前阶段推荐先落地方案 A。

原因：

1. 改动最小
2. 不影响现有测试结构
3. 可以立即把 hook 从生产运行时隔离出去
4. 后续若要继续收紧，再演进到方案 B

### 3.4 验收标准

满足以下全部条件才算修复完成：

1. 普通浏览器打开 `codex_client.html` 时，不存在 `window.__CODEX_TEST_HOOKS__`。
2. Android WebView 正常运行时，不存在 `window.__CODEX_TEST_HOOKS__`。
3. 集成测试环境仍然可以显式打开 hook。
4. 集成测试在启用测试开关后继续通过。

## 4. 建议实施顺序

1. 先把测试文件正式纳入变更集。
2. 再为 `__CODEX_TEST_HOOKS__` 增加明确测试开关。
3. 运行行为测试与集成测试。
4. 最后做一次 Android 冷启动真机复验。

## 5. 完成定义

本文件对应的问题关闭，需要同时满足：

1. 测试文件已入库。
2. 测试 hook 已从生产运行时隔离。
3. 自动化通过。
4. 真机冷启动复验通过。
