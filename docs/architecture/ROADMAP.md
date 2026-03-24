---
title: TermLink 路线图
status: active
owner: @maintainer
last_updated: 2026-03-24
source_of_truth: product
related_code: []
related_docs: [docs/architecture/CURRENT_STATE.md, docs/product/REQUIREMENTS_BACKLOG.md]
---

# ROADMAP

## 2026-Q1

1. 完成文档治理与需求流程标准化。
2. 固化 Android 客户端终端交互稳定性（IME、快捷键栏、连接态可视化）。
3. 整理会话管理与配置管理的验收基线。
4. 已完成会话生命周期与保留策略升级（`REQ-20260222-session-retention-reconnect`，6 小时 idle 保留 + 断联续接 + 容量治理）。
5. 修复快捷键盘 `Ctrl/Alt` 语义、新增“换行”按钮，并优化终端文字区拖动滚动体验（`REQ-20260223-shortcut-keyboard-modifier-newline`）。
6. 落地 Android External Web 终端最小 POC（`REQ-20260224-android-external-web-terminal-profile-sessions`），将外部网页接入 Profile/Sessions 体系并本地持久化 External sessions。
7. 落地 Android 前台无操作 2 分钟恢复系统息屏（`REQ-20260224-screen-keep-awake`），在保证可用性的同时降低无效亮屏。

## 2026-Q2

1. 按 `REQ-20260309-codex-capability-mvp` 先完成“对话页优先”首页收口与二级入口化，并稳定顶部轻量状态栏（仅保留状态、工作区、额度与刷新时间），停止把 Codex 首页继续推进成状态控制台。
2. 落地 slash registry、`/model`、`/plan` 与输入区附近的 next-turn quick controls；`/plan <文本>` 为一次性发送后清除，不保留持续模式。
3. 冻结 `/skill <name>` 契约但当前期默认不开放；其替换 / 清除不影响 `planMode`，且当前不预绑定底层字段。
4. 为后续 `/` 能力扩展预留统一的 slash registry / command-dispatch 接口，使新命令优先通过注册描述与分发适配接入，而不是新增输入分支特判。
5. 统一 stored `codexConfig`、`nextTurnEffectiveCodexConfig` 与 `interactionState` 的边界，并将 `PATCH /api/sessions/:id` 作为底层配置契约交付项；当前期不恢复 `Session Defaults` UI。
6. 在上述主线稳定后，再逐项开放 runtime 次级视图、`/compact`、`/skills`、image 等增强能力。
7. 明确 Android 与 WebView 共享同一交互契约与中文化规范，避免端侧协议或行为分叉。
8. 定义并落地服务端受控管理员权限模式（`REQ-20260222-server-admin-privilege-mode`），补齐启用门禁、审计、回滚链路。
9. 推进 Codex Workspace 文件浏览主链路（`REQ-20260318-ws-0001-docs-exp`，原产品编号 `REQ-WS-0001`），收口工作区路径选择、独立 Web Workspace 页面与 Android `WorkspaceActivity` 集成。

## 2026-H2

1. 推进多主机与多会话治理能力。
2. 增强审计、安全策略和可观测性。
