---
title: TermLink 路线图
status: active
owner: @maintainer
last_updated: 2026-03-09
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

1. 按 `REQ-20260309-codex-capability-mvp` 落地 Codex 能力矩阵主线：优先交付历史线程、会话级配置、审批与额度可见性。
2. 完成 `codex_capabilities` 与 `codex_request` 白名单机制，收敛协议扩展边界。
3. 完成审批模型与交互状态机定稿（command/file/patch/userInput）。
4. 明确 Android 优先、Browser 共享协议的交付边界，避免端侧协议分叉。
5. 定义并落地服务端受控管理员权限模式（`REQ-20260222-server-admin-privilege-mode`），补齐启用门禁、审计、回滚链路。

## 2026-H2

1. 推进多主机与多会话治理能力。
2. 增强审计、安全策略和可观测性。
