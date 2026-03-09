---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）- 历史线程恢复流实施记录
status: active
record_id: CR-20260309-0154-codex-history-resume
req_id: REQ-20260309-codex-capability-mvp
commit_ref: f383fbf
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: code
related_code: [public/terminal_client.js, public/terminal_client.html, public/codex_client.html, public/lib/codex_bootstrap.js, tests/codexBootstrap.plan.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260309-0154-codex-history-resume

## 1. 变更意图（Compact Summary）

- 背景：Phase 1 需要把 `thread/list + thread/resume` 的真实恢复流接起来，避免客户端只拿到 `lastCodexThreadId` 却没有恢复动作。
- 目标：在不引入列表 UI 的前提下，实现 Codex 客户端连接后的历史线程预取、自动恢复和失败回退新线程的闭环。
- 本次边界：只实现恢复流与基础缓存，不实现线程列表展示 UI、线程详情导航或 Android 专属交互。

## 2. 实施内容（What changed）

1. `public/terminal_client.js` 新增 `codex_request/codex_response` 请求跟踪，支持客户端发起受控 bridge 请求并处理结构化响应。
2. Web 客户端在收到 `session_info + codex_capabilities + codex_state` 初始握手后，按能力和会话状态执行 bootstrap：
   - 优先静默预取 `thread/list`
   - 若已有活动线程，则不打断当前会话
   - 若无活动线程但存在 `lastCodexThreadId`，自动执行 `thread/resume`
   - 若无可恢复线程或恢复失败，自动回退为 `codex_new_thread`
3. 修复评审指出的重连副作用问题：bootstrap 重置时保留 `lastCodexThreadId` 但清空本地活动线程态，避免重连后先对旧 `threadId` 发快照请求；同时将断线/重连导致的 bridge request reject 识别为瞬态错误，不再误触发 fallback 新线程。
4. 新增 `public/lib/codex_bootstrap.js` 纯逻辑模块，抽出 bootstrap 决策与瞬态错误判断，供浏览器运行时和 Node 回归测试共用。
5. 更新 `public/terminal_client.html` 与 `public/codex_client.html`，加载新的 bootstrap 脚本并提升客户端脚本版本号，避免缓存命中旧逻辑。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`public/terminal_client.js`、`public/terminal_client.html`、`public/codex_client.html`、`public/lib/codex_bootstrap.js`、`tests/codexBootstrap.plan.test.js`
- 模块：Codex Web 客户端连接初始化、Codex bridge 请求跟踪、历史线程恢复决策
- 运行时行为：Codex 会话连接后会自动判断是否恢复上一线程；若恢复不可用或失败，则自动建立新线程，且会后台预取线程列表供下一阶段 UI 使用

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- public/terminal_client.js public/terminal_client.html public/codex_client.html public/lib/codex_bootstrap.js tests/codexBootstrap.plan.test.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `node --check public/terminal_client.js`
  - `node --test .\\tests\\codexBootstrap.plan.test.js`
  - `node --test .\\tests\\terminalGateway.codex.test.js`
  - `node --test .\\tests\\routes.sessions.metadata.test.js`
  - `node --test .\\tests\\sessionStore.metadata.test.js`
- 结果：通过；新增覆盖 bootstrap 决策中的“保持当前线程 / 恢复保存线程 / 回退新线程 / terminal 会话不触发”，以及“断线/重连类 bridge 错误为瞬态错误，不应触发 fallback”。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`public/terminal_client.js`、`public/lib/codex_bootstrap.js`、`src/ws/terminalGateway.js`
- Task 4 可以直接复用本次缓存的 `historyThreads` 和 bridge 请求跟踪，不必重新设计恢复状态机
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前只完成后台恢复流和列表预取，线程列表尚未在 UI 中可见，用户仍无法手动浏览历史线程。
2. 客户端侧恢复流已具备 Node 级纯逻辑测试，但尚未建立浏览器端集成测试，真实渲染和 WebSocket 时序仍需后续端到端验证。
3. 自动恢复依赖初始握手顺序：`session_info -> codex_capabilities -> codex_state`。若未来服务端修改握手顺序，需要同步更新 bootstrap 门控条件。
4. 当前仍缺少浏览器端集成测试；本次仅通过纯逻辑测试和脚本语法检查收敛评审问题。
