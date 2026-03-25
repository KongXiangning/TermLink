---
title: 变更记录索引
status: active
owner: @maintainer
last_updated: 2026-03-26
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
| CR-20260318-1452-codex-remove-settings-and-top-permission | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-18 | 收口 Codex 当前期文档边界：明确不恢复“会话设置”和顶部权限选择 | `docs/changes/records/CR-20260318-1452-codex-remove-settings-and-top-permission.md` |
| CR-20260318-1541-codex-status-strip-doc-sync | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-18 | 同步文档口径：顶部状态栏仅保留状态、工作区与额度信息，不恢复线程查看入口 | `docs/changes/records/CR-20260318-1541-codex-status-strip-doc-sync.md` |
| CR-20260319-0142-codex-quick-sandbox-runtime-fix | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-19 | 固化 quick sandbox 的真实生效边界：权限映射、runtime 对齐、线程上下文签名与真机复测结论 | `docs/changes/records/CR-20260319-0142-codex-quick-sandbox-runtime-fix.md` |
| CR-20260319-1532-codex-file-mention-input | REQ-20260309-codex-capability-mvp | draft | TBD | @maintainer | 2026-03-19 | Composer @ 文件提示需求立项：产品目标、技术边界与实施计划文档固定 | `docs/changes/records/CR-20260319-1532-codex-file-mention-input.md` |
| CR-20260323-0954-workspace-doc-sync | REQ-20260318-ws-0001-docs-exp | active | 3c0f2da | @maintainer | 2026-03-23 | 扩展 Workspace REQ/ARCH，补齐创建路径、大文件分级、旧会话兼容与 Android 独立界面边界 | `docs/changes/records/CR-20260323-0954-workspace-doc-sync.md` |
| CR-20260323-1454-workspace-impl-phase1 | REQ-20260318-ws-0001-docs-exp | draft | TBD | @maintainer | 2026-03-23 | 将 REQ-WS-0001 的冻结实施计划独立为 plan 文档，并同步 REQ、ARCH 与变更记录索引引用 | `docs/changes/records/CR-20260323-1454-workspace-impl-phase1.md` |
| CR-20260323-1703-workspace-phase-impl-checklists | REQ-20260318-ws-0001-docs-exp | draft | TBD | @maintainer | 2026-03-23 | 将 Workspace 冻结计划拆成 3 份 phase 实施清单，并同步 REQ、PLAN、ARCH 互链 | `docs/changes/records/CR-20260323-1703-workspace-phase-impl-checklists.md` |
| CR-20260323-2244-phase1-server-workspace | REQ-20260318-ws-0001-docs-exp | active | 98fa032 | @maintainer | 2026-03-23 | Workspace Phase 1 服务端实现：会话模型、Workspace API、安全边界、Git 状态与 Diff 基础设施 | `docs/changes/records/CR-20260323-2244-phase1-server-workspace.md` |
| CR-20260324-0032-workspace-phase3-android | REQ-20260318-ws-0001-docs-exp | active | 22893d5 | @maintainer | 2026-03-24 | Web Workspace 页面与 Android 集成实现：独立页面、目录选择器、WorkspaceActivity 与移动端接入 | `docs/changes/records/CR-20260324-0032-workspace-phase3-android.md` |
| CR-20260324-1545-req-init | REQ-20260324-session-list-local-cache | active | 0f58424 | @maintainer | 2026-03-25 | Android 会话列表本地缓存与离线回显需求立项，并同步主线文档与变更记录索引 | `docs/changes/records/CR-20260324-1545-req-init.md` |
| CR-20260324-1554-impl-plan | REQ-20260324-session-list-local-cache | active | 0f58424 | @maintainer | 2026-03-25 | 拆分 Android 会话列表本地缓存实施计划，固定缓存模型、状态机、隔离键与测试口径 | `docs/changes/records/CR-20260324-1554-impl-plan.md` |
| CR-20260324-2331-session-list-cache-store-foundation | REQ-20260324-session-list-local-cache | active | 87031bc | @maintainer | 2026-03-24 | Phase 1 缓存基础层实现：新增 session list cache store、缓存容器模型与 Android 自动化测试 | `docs/changes/records/CR-20260324-2331-session-list-cache-store-foundation.md` |
| CR-20260325-0000-docs-requirement-sync-plan-coverage | REQ-20260222-doc-governance | draft | TBD | @maintainer | 2026-03-25 | 升级 docs-requirement-sync：实现批次需同步 PLAN + CR，并在收尾答复中标记已完成的计划部分 | `docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md` |
| CR-20260325-0050-sessions-initial-cache-render | REQ-20260324-session-list-local-cache | active | 87031bc | @maintainer | 2026-03-25 | Phase 2 首屏缓存回显：SessionsFragment 先显示远端缓存分组，再继续异步刷新 | `docs/changes/records/CR-20260325-0050-sessions-initial-cache-render.md` |
| CR-20260325-0857-sessions-remote-cache-writeback | REQ-20260324-session-list-local-cache | active | 3c27fa2 | @maintainer | 2026-03-25 | Phase 3 远端成功写回缓存：刷新成功后按 profile 覆盖 `SessionListCacheStore` 再渲染最新结果 | `docs/changes/records/CR-20260325-0857-sessions-remote-cache-writeback.md` |
| CR-20260325-1411-sessions-cache-failure-state | REQ-20260324-session-list-local-cache | active | 2ca2cb8 | @maintainer | 2026-03-25 | Phase 4 失败态与文案收口：缓存可见时保留列表并显示 refreshing/stale 状态提示 | `docs/changes/records/CR-20260325-1411-sessions-cache-failure-state.md` |
| CR-20260325-1526-sessions-view-recreate-state-reset | REQ-20260324-session-list-local-cache | active | 2ca2cb8 | @maintainer | 2026-03-25 | Phase 4 follow-up：修复 view 重建后 stale/banner 状态泄漏，并补 lifecycle 回归测试 | `docs/changes/records/CR-20260325-1526-sessions-view-recreate-state-reset.md` |
| CR-20260325-1607-sessions-cache-write-actions | REQ-20260324-session-list-local-cache | active | 2aaf6b6 | @maintainer | 2026-03-25 | Phase 5 写操作缓存同步：创建/删除/重命名成功后先更新当前列表与本地缓存，再静默 refresh 覆盖 | `docs/changes/records/CR-20260325-1607-sessions-cache-write-actions.md` |
| CR-20260325-1626-sessions-cache-write-generation-guard | REQ-20260324-session-list-local-cache | active | 2aaf6b6 | @maintainer | 2026-03-25 | Phase 5 follow-up：为本地乐观缓存写回和 refresh 写回增加 generation 门禁，修复旧写回覆盖新缓存的竞态 | `docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md` |
| CR-20260325-1633-sessions-create-cwd-selection-fallback | REQ-20260324-session-list-local-cache | active | 2aaf6b6 | @maintainer | 2026-03-25 | Phase 5 follow-up：修复 CODEX 创建后服务端未返回 `cwd` 时，当前选中会话丢失用户已选工作目录的问题 | `docs/changes/records/CR-20260325-1633-sessions-create-cwd-selection-fallback.md` |
| CR-20260325-2219-sessions-closeout-validation | REQ-20260324-session-list-local-cache | active | 6a0f06e | @maintainer | 2026-03-25 | 收口验收批次：修复 instrumentation host/依赖/主题与多条 lifecycle 设备侧测试脆弱点，并在真机上完成 connected instrumentation 最终通过 | `docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md` |
| CR-20260325-2356-session-list-local-cache-done-sync | REQ-20260324-session-list-local-cache | active | 6a0f06e | @maintainer | 2026-03-25 | 状态流转 / 验收完成：REQ 切换为 done，并同步回写 PLAN、Backlog、Roadmap、Changelog 与历史 CR 收口状态 | `docs/changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md` |
| CR-20260326-0033-root-readme-refresh | REQ-20260222-doc-governance | active | ff36174 | @maintainer | 2026-03-26 | README 拆分为英文根文档与中文文档并互相跳转，同时补齐 Android 真机截图资源 | `docs/changes/records/CR-20260326-0033-root-readme-refresh.md` |
