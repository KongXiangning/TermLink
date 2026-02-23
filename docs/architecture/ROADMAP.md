---
title: TermLink 路线图
status: active
owner: @maintainer
last_updated: 2026-02-24
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

## 2026-Q2

1. 规划 Codex 控制链路 MVP（session/thread/approval）。
2. 完成审批模型的数据结构与事件协议定稿。
3. 明确移动端控制面板与终端页的边界。
4. 定义并落地服务端受控管理员权限模式（`REQ-20260222-server-admin-privilege-mode`），补齐启用门禁、审计、回滚链路。

## 2026-H2

1. 推进多主机与多会话治理能力。
2. 增强审计、安全策略和可观测性。
