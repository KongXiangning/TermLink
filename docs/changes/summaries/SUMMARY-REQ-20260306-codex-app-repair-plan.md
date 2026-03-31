---
title: "Codex App 侧修复计划（独立聊天窗与会话路径治理）"
req_id: REQ-20260306-codex-app-repair-plan
status: archived
cr_count: 1
date_range: "2026-03-06 — 2026-03-06"
last_updated: 2026-03-31
---

# REQ-20260306-codex-app-repair-plan 实施总结

## 概述

针对 Codex VSCode 插件首轮移植后 App 侧存在的独立聊天窗缺失、Create Session 无 Codex 模式、`cwd` 感知错误等问题，形成正式修复计划并完成 Phase 1-4 代码实现。本 REQ 已归档，后续工作由 `REQ-20260309-codex-capability-mvp` 接管。

## 实施阶段

### Phase 1 — 修复计划立项与 Phase 1-4 实现

- **日期**：2026-03-06
- **变更**：新增修复计划 REQ；完成 Phase 1 服务端会话持久化（`sessionMode + cwd`）；Phase 2 Android/WebView 模式分流与 Codex 独立页面加载；Phase 3 `cwd` 透传与审批请求桥接；Phase 4 WebView 体验收口（状态展示、IME 紧凑布局）；补充回归测试
- **关联 CR**：CR-20260306-1805-codex-app-repair-plan

## 影响范围

- **影响模块**：server（会话元数据、REST API、WS 网关）/ client（Codex 独立页面）/ android（Create Session、WebView 分流、IME 布局）/ docs
- **核心文件**：`src/services/sessionManager.js`、`src/routes/sessions.js`、`src/ws/terminalGateway.js`、`public/codex_client.html`、`MainShellActivity.kt`、`SessionsFragment.kt`

## 验收结果

本 REQ 已归档。Phase 1-4 代码已实现并通过本地验证，后续作为 `REQ-20260309-codex-capability-mvp` 的基线保留。
