---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）- Phase 1 实施记录
status: draft
record_id: CR-20260309-0132-codex-capability-phase1-impl
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: code
related_code: [src/repositories/sessionStore.js, src/services/sessionManager.js, src/routes/sessions.js, src/ws/terminalGateway.js, android/app/src/main/java/com/termlink/app/data/SessionApiModels.kt, android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt, tests/sessionStore.metadata.test.js, tests/routes.sessions.metadata.test.js, tests/terminalGateway.codex.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260309-0132-codex-capability-phase1-impl

## 1. 变更意图（Compact Summary）

- 背景：Phase 1 需要先打通 Codex 会话元数据链路，才能在后续任务中安全实现历史线程恢复。
- 目标：新增并持久化 `lastCodexThreadId`，让服务端 API、WebSocket `session_info` 和 Android API 模型都能携带这项基础元数据。
- 本次边界：仅实现 Task 1 的元数据基础能力，不包含线程列表 UI、`codex_capabilities` 或 `codex_request` 白名单。

## 2. 实施内容（What changed）

1. `SessionStore`、`SessionManager` 新增 `lastCodexThreadId` 的归一化、持久化、恢复和摘要输出。
2. `/api/sessions` 返回体新增 `lastCodexThreadId`，Codex 网关在 `session_info` 和新线程创建后同步这项元数据。
3. Android `SessionSummary/SessionRef` 与 `SessionApiClient` 增加 `lastCodexThreadId` 解析支持。
4. Codex 网关新增 `codex_capabilities` 下发，并将 `codex_request` 收敛为 Phase 1 白名单：`thread/list`、`thread/read`、`thread/resume`。
5. 修复评审指出的恢复链路一致性问题：`thread/read` 等只读桥接请求不再覆盖 `lastCodexThreadId`，`thread/resume`/新线程切换时会解绑旧线程映射，并重置旧线程遗留的运行态快照。
6. 更新 Node 回归测试，覆盖存储层、API 层、WebSocket `session_info`、白名单放行/拒绝、恢复指针保护、恢复后旧线程通知隔离和 `thread/resume` 状态重置行为。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`src/repositories/sessionStore.js`、`src/services/sessionManager.js`、`src/routes/sessions.js`、`src/ws/terminalGateway.js`、`android/app/src/main/java/com/termlink/app/data/SessionApiModels.kt`、`android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt`、相关 Node 测试文件。
- 模块：会话持久化、Session API、Codex 连接初始化元数据、Android Session API 模型。
- 运行时行为：Codex 会话现在会保存最近一次绑定的 thread id，并在 REST 和 WebSocket 层提供给客户端。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- <path/to/file>
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `node --test .\\tests\\sessionStore.metadata.test.js`
  - `node --test .\\tests\\routes.sessions.metadata.test.js`
  - `node --test .\\tests\\terminalGateway.codex.test.js`
- 结果：通过；新增覆盖 `codex_capabilities`、白名单拒绝、白名单放行和 `thread/read` 不误写 `lastCodexThreadId`。
- 结果：通过；并新增覆盖 `thread/resume` 后旧线程 notification/server_request 不再串线，以及恢复后的 `codex_state` 清理行为。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`src/ws/terminalGateway.js`、`public/terminal_client.js`、`docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md`。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. 当前已完成元数据链路和 Phase 1 白名单治理，但历史线程列表与恢复 UI 仍未对用户可见。
2. 后续任务必须补 `thread/list/resume` 的真实交互流和前端视图，才能完成 Phase 1 闭环。
3. `codex_capabilities` 当前按保守策略下发，Phase 2/3 能力仍显式关闭，后续开放必须同步测试与文档。
4. 当前仍未实现真正的历史线程 UI 与自动恢复入口；本次仅收敛后端绑定和状态一致性，防止后续任务建立在错误状态机之上。
