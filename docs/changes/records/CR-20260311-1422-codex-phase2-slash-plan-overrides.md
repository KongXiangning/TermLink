---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段）- 变更记录
status: archived
record_id: CR-20260311-1422-codex-phase2-slash-plan-overrides
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 4734f08
owner: @maintainer
last_updated: 2026-03-11
source_of_truth: code
related_code: [public/codex_client.html, public/terminal_client.css, public/terminal_client.html, public/terminal_client.js, public/lib/codex_slash_commands.js, src/ws/terminalGateway.js, tests/codexClient.shell.test.js, tests/codexSlashCommands.test.js, tests/terminalGateway.codex.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/codex-capability-implementation-plan.md, docs/changes/records/INDEX.md]
---

# CR-20260311-1422-codex-phase2-slash-plan-overrides

## 1. 变更意图（Compact Summary）

- 背景：Phase 1 已完成首页收口，但 `/plan`、`/model`、slash registry、next-turn override 与 interaction state 仍未落地。
- 目标：把 composer 从“纯文本发送”升级为“slash 命令分发 + next-turn override + plan mode”的统一入口，同时补齐 gateway 回显的能力与状态快照。
- 本次边界：只覆盖 WebView/Browser 共享前端、gateway `codex_turn/codex_state/codex_capabilities` 以及相关测试；不改 Android 原生壳层，`/skill <name>` 仅按一次性输入辅助承接，不开放固定底层字段。

## 2. 实施内容（What changed）

1. 新增共享 `codex_slash_commands` 模块，统一 slash registry、输入解析、discoverability 过滤、interaction state/next-turn overrides 归一化和 effective config 计算。
2. 扩展 Codex composer：增加 slash 浮层、plan chip、模型/推理强度 quick controls，并把发送链路改为 `parse -> dispatch -> codex_turn`；`/plan`、未知 slash 与 `/skill <name>` 都走本地分发，其中 skill 只作为一次性输入辅助，不进入固定协议字段。
3. 扩展 gateway：`codex_capabilities` 增加 slash 能力字段，`codex_turn` 支持 `model/reasoningEffort/collaborationMode`，`codex_state` 增加 `interactionState` 与 `nextTurnEffectiveCodexConfig`，并补充会话内 interaction state 同步。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`public/codex_client.html`、`public/terminal_client.css`、`public/terminal_client.html`、`public/terminal_client.js`、`public/lib/codex_slash_commands.js`、`src/ws/terminalGateway.js`
- 模块：Codex composer、slash registry、next-turn override 状态机、gateway Codex websocket bridge
- 运行时行为：输入 `/` 不再当普通消息发送；`/plan` 可进入一次性计划模式；`/model` 与输入区 quick controls 共用同一状态源；`/skill` 通过 `skills/list` 提供一次性 skill 选择与 prompt 预填；gateway 会回显 interaction state 与下一次发送的有效配置快照

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- public/codex_client.html public/terminal_client.css public/terminal_client.js src/ws/terminalGateway.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`node --test tests/codexSlashCommands.test.js tests/codexClient.shell.test.js tests/terminalGateway.codex.test.js`
- 结果：通过；覆盖 slash 纯逻辑、HTML/CSS/JS 静态约束和 gateway 新字段/override 行为。
- 校验命令：`node --test`
- 结果：通过；全量测试 112 项全部通过。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`public/terminal_client.js`、`public/lib/codex_slash_commands.js`、`src/ws/terminalGateway.js`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前 `interactionState` 为会话内 websocket bridge 状态，不是 app-server 原生状态；`/skill <name>` 当前仅作为一次性输入辅助，后续如需深化承接，也必须继续沿用 registry/dispatch 接口，不得直接分叉成专用输入分支。
2. `nextTurnEffectiveCodexConfig` 当前由 gateway 基于 stored config 生成快照；客户端未把 pending overrides 持久化到服务端，因此断线重连后只保证 interaction state 恢复，不保证未发送 override 恢复。
