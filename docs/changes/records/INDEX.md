---
title: 变更记录索引
status: active
owner: @maintainer
last_updated: 2026-02-24
source_of_truth: product
related_code: [docs/changes/records]
related_docs: [docs/changes/CHANGELOG_PROJECT.md, docs/changes/records/TEMPLATE_CHANGE_RECORD.md]
---

# Change Records Index

本索引用于维护“类似 /compact 的固化记录”，支持回放、还原和后续修改。

## 使用规则

1. 每次实施/提交必须新增一条 CR 记录。
2. CR 必须包含 `req_id + commit_ref`（`draft` 状态允许 `commit_ref: TBD`）。
3. 需求状态流转到 `done` 前，必须至少存在一条 `active` CR。
4. `CHANGELOG_PROJECT.md` 仅保留摘要，详细回滚与恢复信息以 CR 为准。

## Records

| record_id | req_id | status | commit_ref | owner | last_updated | summary | file |
|---|---|---|---|---|---|---|---|
| CR-20260222-2200-session-retention-doc-update | REQ-20260222-session-retention-reconnect | active | 36dd134 | @maintainer | 2026-02-22 | 会话保留需求文档立项与同步 | `docs/changes/records/CR-20260222-2200-session-retention-doc-update.md` |
| CR-20260222-2310-server-admin-req-init | REQ-20260222-server-admin-privilege-mode | draft | TBD | @maintainer | 2026-02-22 | 管理员权限模式需求立项与主线同步 | `docs/changes/records/CR-20260222-2310-server-admin-req-init.md` |
| CR-20260223-2114-session-retention-impl-phase1 | REQ-20260222-session-retention-reconnect | active | 67bc2c3 | @maintainer | 2026-02-24 | 会话保留需求实现阶段（TTL/容量治理/WS语义） | `docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md` |
| CR-20260223-2136-shortcut-keyboard-modifier-newline-doc-init | REQ-20260223-shortcut-keyboard-modifier-newline | draft | TBD | @maintainer | 2026-02-23 | 快捷键盘控制键与滚动问题立项，并同步换行按钮需求 | `docs/changes/records/CR-20260223-2136-shortcut-keyboard-modifier-newline-doc-init.md` |
| CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1 | REQ-20260223-shortcut-keyboard-modifier-newline | active | e975244 | @maintainer | 2026-02-24 | 快捷键盘 Ctrl/Alt 三态修饰、独立 Shift+Enter 换行键与文字区滚动优化实现 | `docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md` |
| CR-20260224-0023-session-retention-reconnect-ws-param-fix | REQ-20260222-session-retention-reconnect | active | f4ce64f | @maintainer | 2026-02-24 | 修复 WS `sessionId` 参数语义回归并补齐关键自动化验收 | `docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md` |
| CR-20260224-0115-session-retention-status-done-sync | REQ-20260222-session-retention-reconnect | draft | TBD | @maintainer | 2026-02-24 | 将会话保留需求状态流转到 done，并回填历史实现 CR 状态 | `docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md` |
