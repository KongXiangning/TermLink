---
title: 变更记录索引
status: active
owner: @maintainer
last_updated: 2026-03-17
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
| CR-20260309-1455-codex-mobile-validation | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-09 | Android 真机 Codex 会话主链路验证与阶段性结论记录 | `docs/changes/records/CR-20260309-1455-codex-mobile-validation.md` |
| CR-20260309-1546-codex-phase2-settings-panel | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-09 | Phase 2 会话级配置链路与 Web 设置面板实现 | `docs/changes/records/CR-20260309-1546-codex-phase2-settings-panel.md` |
| CR-20260309-1602-codex-phase2-runtime-panels | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-09 | Phase 2 运行态区块与 config/deprecation 告警展示实现 | `docs/changes/records/CR-20260309-1602-codex-phase2-runtime-panels.md` |
| CR-20260309-1719-codex-phase2-mobile-validation | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-09 | Android Phase 2 完整交互验证：设置回填、Limits、发送链路与运行态区块当前结论 | `docs/changes/records/CR-20260309-1719-codex-phase2-mobile-validation.md` |
| CR-20260309-1747-codex-phase2-mobile-ui-fixes | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-09 | Phase 2 手机端修复：未物化线程读保护、server defaults 回填语义、缓存版本与滚动可达性 | `docs/changes/records/CR-20260309-1747-codex-phase2-mobile-ui-fixes.md` |
| CR-20260309-2106-codex-phase2-runtime-mobile-validation | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-09 | Android Live Runtime 专项验证：Diff 通过、Terminal Output 部分通过、Plan/Reasoning 仍未确认 | `docs/changes/records/CR-20260309-2106-codex-phase2-runtime-mobile-validation.md` |
| CR-20260309-2209-codex-phase2-runtime-fixes | REQ-20260309-codex-capability-mvp | active | 69212bb | @maintainer | 2026-03-09 | Phase 2 Live Runtime 修复：stdout 重建、plan 结构化展示、空壳告警隐藏与 Android 复测 | `docs/changes/records/CR-20260309-2209-codex-phase2-runtime-fixes.md` |
| CR-20260309-2245-codex-phase3-approvals | REQ-20260309-codex-capability-mvp | active | 7784567 | @maintainer | 2026-03-09 | Phase 3 审批与交互状态机：统一 command/file/patch/userInput 卡片模型与恢复快照 | `docs/changes/records/CR-20260309-2245-codex-phase3-approvals.md` |
| CR-20260309-2310-codex-phase3-mobile-validation | REQ-20260309-codex-capability-mvp | active | 7784567 | @maintainer | 2026-03-09 | Phase 3 Android 真机验证：冷启动/重连恢复通过，synthetic request card 小屏交互通过，真实 server request 仍待补证 | `docs/changes/records/CR-20260309-2310-codex-phase3-mobile-validation.md` |
| CR-20260310-0112-codex-conversation-priority-doc-realign | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-10 | Codex 主线文档纠偏：从状态面板驱动调整为移动端对话体验优先 | `docs/changes/records/CR-20260310-0112-codex-conversation-priority-doc-realign.md` |
| CR-20260310-2244-codex-phase1-home-tightening | REQ-20260309-codex-capability-mvp | active | 3552d38 | @maintainer | 2026-03-11 | Phase 1 首页收口：对话页优先、线程摘要前置、二级入口化、测试加固与 Android 资源刷新 | `docs/changes/records/CR-20260310-2244-codex-phase1-home-tightening.md` |
| CR-20260310-2310-codex-workspace-default-path | REQ-20260309-codex-capability-mvp | active | a75d336 | @maintainer | 2026-03-11 | Android 建 Codex 会话时默认预填当前仓库路径，减少真机验证手输成本 | `docs/changes/records/CR-20260310-2310-codex-workspace-default-path.md` |
| CR-20260310-2323-codex-phase1-mobile-validation | REQ-20260309-codex-capability-mvp | active | 3552d38 | @maintainer | 2026-03-11 | Android 冷启动复验通过：首页默认只保留对话主链路，Phase 1 审批通过 | `docs/changes/records/CR-20260310-2323-codex-phase1-mobile-validation.md` |
| CR-20260312-0128-codex-phase4-slash-tools | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-12 | Phase 4 首个实施包：开放 `/compact` 与 `/skills` 的次级工具入口，并收口 capability 门禁与 `/skill` 查找回退 | `docs/changes/records/CR-20260312-0128-codex-phase4-slash-tools.md` |
| CR-20260312-1705-codex-phase4-thread-actions | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-12 | Phase 4 第二个实施包：在线程列表接入 fork/archive/unarchive 扩展动作，并开放 gateway 转发白名单 | `docs/changes/records/CR-20260312-1705-codex-phase4-thread-actions.md` |
| CR-20260312-1815-codex-phase4-image-input | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-12 | Phase 4 第三个实施包：开放 image/localImage 输入，接通 composer 附件状态与 turn/start 输入组装 | `docs/changes/records/CR-20260312-1815-codex-phase4-image-input.md` |
| CR-20260312-1430-codex-phase3-validation | REQ-20260309-codex-capability-mvp | active | 81d3945 | @maintainer | 2026-03-12 | Phase 3 验收通过：PATCH 写路径、状态一致性、interactionState 独立性 | `docs/changes/records/CR-20260312-1430-codex-phase3-validation.md` |
| CR-20260314-1239-codex-plan-collab-mode-fix | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-14 | 修复 `/plan` 仍发送裸字符串 collaborationMode 的协议失配，升级为结构化对象并保留 gateway 兼容 | `docs/changes/records/CR-20260314-1239-codex-plan-collab-mode-fix.md` |
| CR-20260315-0139-codex-plan-validation | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-15 | 独立复核 `/plan`：确认基础 plan 语义可用，但 `turn/plan/updated` / `item/plan/delta` 不能作为稳定硬前提 | `docs/changes/records/CR-20260315-0139-codex-plan-validation.md` |
| CR-20260315-0200-codex-plan-workflow | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-15 | 实现 `/plan` 客户端双阶段工作流：等待补充信息、待确认计划卡片、确认后二次执行与不支持题型提示 | `docs/changes/records/CR-20260315-0200-codex-plan-workflow.md` |
| CR-20260317-0048-codex-mobile-log-anchor | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-17 | 修复 Codex 真机对话页消息流中段空白：为消息流增加内层栈并在 Codex-only 页面改为底部锚定 | `docs/changes/records/CR-20260317-0048-codex-mobile-log-anchor.md` |
| CR-20260317-0110-codex-local-task-history | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-17 | 修复 Codex 本地任务历史入口不可达、列表缺少最近活跃排序与时间元信息的问题 | `docs/changes/records/CR-20260317-0110-codex-local-task-history.md` |
| CR-20260317-0936-codex-app-permission-mode-and-context-window | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-17 | 补充 Codex app 权限预设模式、阻塞式命令确认弹窗与线程绑定背景信息窗口需求 | `docs/changes/records/CR-20260317-0936-codex-app-permission-mode-and-context-window.md` |
