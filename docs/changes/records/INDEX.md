---
title: 变更记录索引
status: active
owner: @maintainer
last_updated: 2026-03-09
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
| CR-20260224-0220-shortcut-keyboard-cache-bust-fix | REQ-20260223-shortcut-keyboard-modifier-newline | active | 2e4627b | @maintainer | 2026-02-24 | 统一提升 Android/Web 终端静态资源版本号，修复缓存命中旧资源风险 | `docs/changes/records/CR-20260224-0220-shortcut-keyboard-cache-bust-fix.md` |
| CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix | REQ-20260223-shortcut-keyboard-modifier-newline | active | 11767d3 | @maintainer | 2026-02-24 | 将 PgUp/PgDn/Home/End 改为本地滚动终端历史，并优化换行键布局占位 | `docs/changes/records/CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix.md` |
| CR-20260224-0023-session-retention-reconnect-ws-param-fix | REQ-20260222-session-retention-reconnect | active | f4ce64f | @maintainer | 2026-02-24 | 修复 WS `sessionId` 参数语义回归并补齐关键自动化验收 | `docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md` |
| CR-20260224-0115-session-retention-status-done-sync | REQ-20260222-session-retention-reconnect | draft | TBD | @maintainer | 2026-02-24 | 将会话保留需求状态流转到 done，并回填历史实现 CR 状态 | `docs/changes/records/CR-20260224-0115-session-retention-status-done-sync.md` |
| CR-20260224-0300-server-admin-privilege-mode-phase1 | REQ-20260222-server-admin-privilege-mode | active | a6ceeec | @maintainer | 2026-02-24 | 管理员权限模式 Phase 1+2 实现：配置门禁、IP 白名单、审计日志 | `docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md` |
| CR-20260224-1602-server-admin-mode-enable-fix | REQ-20260222-server-admin-privilege-mode | draft | TBD | @maintainer | 2026-02-24 | 修复 elevated 启用链路：TERMLINK 配置对齐、门禁实现、审计服务补齐与回归测试 | `docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md` |
| CR-20260224-1636-android-external-web-terminal-poc | REQ-20260224-android-external-web-terminal-profile-sessions | draft | TBD | @maintainer | 2026-02-24 | Android External Web 终端 POC + 修复：凭据热更新重载、profile 删除清理 sessions、深色通用化注入 | `docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md` |
| CR-20260224-2145-screen-idle-timeout-restore | REQ-20260224-screen-keep-awake | draft | TBD | @maintainer | 2026-02-24 | MainShellActivity 前台无操作 2 分钟后恢复系统息屏，切后台立即取消常亮 | `docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md` |
| CR-20260306-1805-codex-app-repair-plan | REQ-20260306-codex-app-repair-plan | draft | TBD | @maintainer | 2026-03-06 | Codex App 侧修复计划立项，并同步主线需求与路线图 | `docs/changes/records/CR-20260306-1805-codex-app-repair-plan.md` |
| CR-20260309-0123-codex-capability-doc-restructure | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-09 | 基于能力矩阵重构 Codex 主 REQ、实施计划与主线文档索引 | `docs/changes/records/CR-20260309-0123-codex-capability-doc-restructure.md` |
