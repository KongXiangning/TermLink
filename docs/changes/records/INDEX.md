---
title: 变更记录索引
status: active
owner: @maintainer
last_updated: 2026-02-22
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
| CR-20260223-1959-session-retention-impl-gate | REQ-20260222-session-retention-reconnect | draft | TBD | @maintainer | 2026-02-23 | 修复 sessionId 空值重连判定与环境变量下界校验，并补齐追踪记录 | `docs/changes/records/CR-20260223-1959-session-retention-impl-gate.md` |
| CR-20260222-2310-server-admin-req-init | REQ-20260222-server-admin-privilege-mode | draft | TBD | @maintainer | 2026-02-22 | 管理员权限模式需求立项与主线同步 | `docs/changes/records/CR-20260222-2310-server-admin-req-init.md` |
