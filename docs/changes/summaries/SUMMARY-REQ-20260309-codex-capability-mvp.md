---
title: "Codex 能力矩阵驱动主线需求（对话体验优先、后台保活与下一阶段）"
req_id: REQ-20260309-codex-capability-mvp
status: done
cr_count: 39
date_range: "2026-03-09 — 2026-03-30"
last_updated: 2026-03-31
---

# REQ-20260309-codex-capability-mvp 实施总结

## 概述

以 Codex 能力矩阵为驱动，分 5 个主阶段完成对话体验优先 MVP：从基础对话与历史线程，到 Settings/Runtime 面板、审批状态机、Slash 命令工具链、权限模式与上下文窗口，最终补齐后台保活与 Android 前台服务。共计 39 条 CR，覆盖服务端、Web 前端与 Android 全栈。

## 实施阶段

### Phase 1 — 文档重构与基础对话实现（2026-03-09）

- **变更**：REQ 文档重构对齐能力矩阵；实现 Codex 基础对话流、历史线程恢复与列表 UI；Phase 1 桌面与移动端验证通过
- **关联 CR**：CR-20260309-0123-codex-capability-doc-restructure、CR-20260309-0132-codex-capability-phase1-impl、CR-20260309-0154-codex-history-resume、CR-20260309-0839-codex-history-ui、CR-20260309-0856-codex-phase1-validation、CR-20260309-1455-codex-mobile-validation

### Phase 2 — Settings/Runtime 面板与移动端适配（2026-03-09）

- **变更**：实现 Settings 面板与 Runtime 运行时面板；完成移动端交互验证与 UI 修复；Live Runtime 专项验证与展示修复
- **关联 CR**：CR-20260309-1546-codex-phase2-settings-panel、CR-20260309-1602-codex-phase2-runtime-panels、CR-20260309-1719-codex-phase2-mobile-validation、CR-20260309-1747-codex-phase2-mobile-ui-fixes、CR-20260309-2106-codex-phase2-runtime-mobile-validation、CR-20260309-2209-codex-phase2-runtime-fixes

### Phase 3 — 审批状态机与对话优先级调整（2026-03-09 — 2026-03-12）

- **变更**：实现审批与交互状态机；移动端小屏真机验证；对话体验优先文档重对齐；Phase 1 首页精简、workspace 默认路径与移动验收；Phase 3 stored config 与状态一致性验收
- **关联 CR**：CR-20260309-2245-codex-phase3-approvals、CR-20260309-2310-codex-phase3-mobile-validation、CR-20260310-0112-codex-conversation-priority-doc-realign、CR-20260310-2244-codex-phase1-home-tightening、CR-20260310-2310-codex-workspace-default-path、CR-20260310-2323-codex-phase1-mobile-validation、CR-20260312-1430-codex-phase3-validation

### Phase 4 — Slash 命令、线程管理与图片输入（2026-03-11 — 2026-03-15）

- **变更**：实现 `/plan` Slash 命令覆盖机制；`/tools` Slash 命令；线程重命名与操作（删除/归档）；图片输入支持；Plan 协作模式修复；Plan 验证与工作流完善
- **关联 CR**：CR-20260311-1422-codex-phase2-slash-plan-overrides、CR-20260312-0128-codex-phase4-slash-tools、CR-20260312-1223-codex-phase4-thread-rename、CR-20260312-1705-codex-phase4-thread-actions、CR-20260312-1815-codex-phase4-image-input、CR-20260314-1239-codex-plan-collab-mode-fix、CR-20260315-0139-codex-plan-validation、CR-20260315-0200-codex-plan-workflow

### Phase 5 — 权限模式、上下文窗口与体验收口（2026-03-17 — 2026-03-19）

- **变更**：移动端日志锚点优化；本地任务历史入口与排序修复；新任务设置面板精简；权限模式与上下文窗口需求补充；排除当前期不需要的会话设置与顶部权限选择；状态栏文档同步；权限与上下文窗口实现落地；快速沙盒运行时修复；文件提及输入功能
- **关联 CR**：CR-20260317-0048-codex-mobile-log-anchor、CR-20260317-0110-codex-local-task-history、CR-20260317-0157-codex-new-task-settings-simplify、CR-20260317-0936-codex-app-permission-mode-and-context-window、CR-20260318-1452-codex-remove-settings-and-top-permission、CR-20260318-1541-codex-status-strip-doc-sync、CR-20260318-1642-codex-phase5-permission-context-impl、CR-20260319-0142-codex-quick-sandbox-runtime-fix、CR-20260319-1532-codex-file-mention-input

### Phase 6 — 后续修复与后台保活（2026-03-23 — 2026-03-30）

- **变更**：历史线程重绑定与 Slash 缓存修复；后台保活与断线续接需求整理；Android Codex 前台保活服务重新实现
- **关联 CR**：CR-20260323-0922-codex-history-thread-rebind-and-slash-cache、CR-20260329-0043-codex-background-retention-plan、CR-20260330-2125-android-codex-foreground-service

## 关键决策

| 决策 | 理由 | 关联 CR |
|------|------|---------|
| 对话体验优先而非功能完备优先 | 用户核心价值在于对话交互质量 | CR-20260310-0112 |
| 排除当前期会话设置与顶部权限选择 | 减少 MVP 复杂度，聚焦核心对话流 | CR-20260318-1452 |
| Android 前台服务保活替代 WakeLock | 符合 Android 后台限制策略 | CR-20260330-2125 |

## 影响范围

- **影响模块**：server（会话管理、Codex 服务、WS 网关）/ client（Codex 独立页面、Slash 命令、审批 UI、Settings/Runtime 面板）/ android（Create Session、WebView 分流、前台服务、IME 适配）/ docs
- **核心文件**：`src/services/codexAppServerService.js`、`src/ws/terminalGateway.js`、`public/codex_client.html`、`public/lib/codex_*.js`、`MainShellActivity.kt`、`SessionsFragment.kt`

## 验收结果

需求已全量交付。Codex 对话体验 MVP 覆盖基础对话、历史线程、Settings/Runtime、审批、Slash 命令、线程管理、图片输入、权限模式、文件提及与后台保活。桌面端与 Android 真机均验证通过。
