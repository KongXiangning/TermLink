---
title: Codex thread-centric 同步基础首批服务端实现记录
status: draft
record_id: CR-20260518-1848-codex-thread-centric-sync-foundation-impl
req_id: REQ-20260516-codex-mobile-realtime-sync
commit_ref: TBD
owner: @maintainer
last_updated: 2026-05-18
source_of_truth: product
related_code: [src/services/codexThreadHub.js, src/ws/terminalGateway.js, tests/codexThreadHub.test.js, tests/terminalGateway.threadHub.test.js]
related_docs: [docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md, docs/workflow/CURRENT_TASK.md, docs/changes/records/INDEX.md]
---

# CR-20260518-1848-codex-thread-centric-sync-foundation-impl

## 1. 变更意图（Compact Summary）

- 背景：`REQ-20260516-codex-mobile-realtime-sync` 要求后续手机端能围绕同一 Codex thread 与 CLI / 桌面端同步状态与消息流，但当前服务端仍以 `threadId -> sessionId` 的 session-centric 单映射为主。
- 目标：先在服务端建立首批 thread-centric foundation，把 thread 绑定、解绑和通知路由收敛到独立 hub 抽象后面，同时保持现有 Web / Android Codex 会话行为兼容。
- 本次边界：只做服务端内部抽象与自动化测试补强；不开放多 subscriber fanout、不改 Android UI、不改 WebSocket envelope、不引入新的 public contract。

## 2. 实施内容（What changed）

1. 新增 `src/services/codexThreadHub.js`，提供 `bindThreadToSession`、`unbindSessionThreads`、`getSessionIdForThread`、`unbindThread` 四个最小 API，把现有单 subscriber actor 语义收敛到独立 hub。
2. `src/ws/terminalGateway.js` 改为实例化 `CodexThreadHub`，保留原 wrapper 名称，把 thread binding、resume 后重绑、session 清理和 notification / server_request 路由统一改到 hub API 后面。
3. 新增 `tests/codexThreadHub.test.js`，覆盖单 session 单 actor 绑定、保留当前 thread 的解绑、指定 thread 解绑和空 ID 容错。
4. 新增 `tests/terminalGateway.threadHub.test.js`，覆盖既有 thread notification 路由、`thread/resume` 后新旧 thread 切换、`codex_thread_read` 只读快照、连接断开后 thread runtime state 不被提前清空。
5. `docs/workflow/CURRENT_TASK.md` 回写 Step 6 审查结论，把任务状态推进到 `completed_ready_for_closeout`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `src/services/codexThreadHub.js`
  - `src/ws/terminalGateway.js`
  - `tests/codexThreadHub.test.js`
  - `tests/terminalGateway.threadHub.test.js`
  - `docs/workflow/CURRENT_TASK.md`
- 模块：Codex thread 绑定关系、gateway notification 路由、resume/read 兼容路径、针对 terminalGateway 高风险路径的窄回归门。
- 运行时行为：
  - 现有单 subscriber thread -> session 路由保持兼容。
  - 旧 session 的 `lastCodexThreadId`、`thread/read(includeTurns=true)` 与 notification 广播语义保持不变。
  - 本批未引入生产可见的多端 fanout 或新的订阅入口。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅回滚本批核心实现与测试
git checkout <commit_ref>^ -- src/services/codexThreadHub.js
git checkout <commit_ref>^ -- src/ws/terminalGateway.js
git checkout <commit_ref>^ -- tests/codexThreadHub.test.js
git checkout <commit_ref>^ -- tests/terminalGateway.threadHub.test.js
git checkout <commit_ref>^ -- docs/workflow/CURRENT_TASK.md
```

## 5. 验证记录（Tests/Checks）

1. 任务定向回归：
   - `node --test tests\codexThreadHub.test.js tests\terminalGateway.threadHub.test.js`
2. TD-004 confirmed narrow gate：
   - `node --test tests\tlsConfig.test.js tests\workspace.routes.test.js tests\workspace.web.test.js tests\sessionStore.metadata.test.js tests\terminal_shortcut_input.test.js tests\codexSecondaryPanel.integration.test.js`
3. diff 基础检查：
   - `git diff --check`
4. 审查结论：
   - `CURRENT_TASK.md` Step 6 已记录 scope / implementation / contract review 为 clean
   - 本轮未触发 `/sync-contracts`、`/sync-decisions`

## 6. 后续修改入口（How to continue）

- 后续如要继续推进多端实时同步，可优先从以下路径继续：
  - `src/services/codexThreadHub.js`
  - `src/ws/terminalGateway.js`
  - Android Codex wire / hydrate / subscribe 相关路径（需单独开任务并重新锁 scope）
- 如果后续需要真正开放多 subscriber / observer 模型，应先补稳定 public contract 判断，再决定是否执行 `/sync-contracts`。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. `terminalGateway.js` 仍是高风险文件；本次只是把 thread 路由抽到 hub，不代表多端实时同步已经完成。
2. 目前只证明单 subscriber actor 兼容；跨 session fanout、Android hydrate / subscribe 流程仍需后续任务独立验证。
3. full `node --test` 仍受 TD-004 已知 hanging surface 限制，本批继续依赖 confirmed narrow gate 作为 blocks-merge 自动化门禁。
