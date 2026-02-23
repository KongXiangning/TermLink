---
title: 服务端会话长时保留与断联续接 - 实现阶段记录（Phase 1）
status: draft
record_id: CR-20260223-2114-session-retention-impl-phase1
req_id: REQ-20260222-session-retention-reconnect
commit_ref: TBD
owner: @maintainer
last_updated: 2026-02-23
source_of_truth: product
related_code: [src/services/sessionManager.js, src/ws/terminalGateway.js, src/routes/sessions.js, .env.example]
related_docs: [docs/product/requirements/REQ-20260222-session-retention-reconnect.md, docs/changes/records/INDEX.md, docs/changes/CHANGELOG_PROJECT.md]
---

# CR-20260223-2114-session-retention-impl-phase1

## 1. 变更意图（Compact Summary）

- 背景：REQ 已定义 6 小时会话保留、容量治理、重连语义，但现网代码仍是 30 分钟固定清理且 `sessionId` 失效时静默新建。
- 目标：补齐 REQ 的核心行为契约（TTL 配置化、容量上限与 IDLE-LRU、WS/API 明确错误返回）。
- 本次边界：后端会话管理与配置项改造，不包含客户端 UI 改造。

## 2. 实施内容（What changed）

1. `sessionManager` 默认 idle TTL 提升到 6 小时，并新增环境变量：
   - `SESSION_IDLE_TTL_MS`
   - `SESSION_MAX_COUNT`
   - `SESSION_CLEANUP_INTERVAL_MS`
2. 新增会话容量治理：创建新会话时若达到上限，先淘汰最老 `IDLE` 会话；无可淘汰 `IDLE` 时抛出容量错误。
3. `WS` 重连语义调整：
   - 传入 `sessionId` 但找不到会话时，返回 `4404`，不再静默创建新会话。
   - 未传 `sessionId` 时仍保持兼容创建默认会话。
4. `POST /api/sessions` 增加容量错误处理，返回 `409` 与明确错误码 `SESSION_CAPACITY_EXCEEDED`。
5. `.env.example` 补齐会话生命周期配置样例。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `src/services/sessionManager.js`
  - `src/ws/terminalGateway.js`
  - `src/routes/sessions.js`
  - `.env.example`
- 模块：会话生命周期管理、WebSocket 连接语义、会话创建 API。
- 运行时行为：
  - 默认保留窗口由 30 分钟提升为 6 小时。
  - 会话数量达到上限后启用 IDLE-LRU 回收。
  - 非法/过期 `sessionId` 的 WS 连接会被显式拒绝。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅回滚本次核心实现文件
git checkout <commit_ref>^ -- src/services/sessionManager.js
git checkout <commit_ref>^ -- src/ws/terminalGateway.js
git checkout <commit_ref>^ -- src/routes/sessions.js
git checkout <commit_ref>^ -- .env.example
```

## 5. 验证记录（Tests/Checks）

1. REQ 校验：
   - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260222-session-retention-reconnect.md -Strict`
2. 文档同步校验：
   - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260222-session-retention-reconnect`
3. 代码语法校验（待补充本次提交 hash 后再固化）：
   - `node --check src/services/sessionManager.js`
   - `node --check src/ws/terminalGateway.js`
   - `node --check src/routes/sessions.js`

## 6. 后续修改入口（How to continue）

- 后续可优先从以下文件继续：
  - `src/services/sessionManager.js`（TTL 与容量治理策略）
  - `src/ws/terminalGateway.js`（WS 重连错误语义）
  - `src/routes/sessions.js`（会话创建 API 错误返回）
- 本记录提交后需补齐 `commit_ref` 并切换到 `active`。
- 如本记录后续被替代，填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. 容量上限触发回收时，可能导致较早 idle 会话被淘汰；需与实际运维容量匹配。
2. 客户端若依赖“无效 sessionId 自动新建”旧行为，需同步适配 `4404` 语义。
