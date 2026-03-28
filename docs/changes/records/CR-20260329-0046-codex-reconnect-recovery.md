---
title: 前端断线重连后恢复 Codex 任务状态
status: active
record_id: CR-20260329-0046-codex-reconnect-recovery
req_id: REQ-20260309-codex-capability-mvp
commit_ref: eb5d145
owner: @maintainer
last_updated: 2026-03-29
source_of_truth: product
related_code: [public/terminal_client.js, public/terminal_client.css]
---

## 背景

PLAN-20260329 §5.3：WebSocket 断线时，前端不应立即将活跃的 Codex 任务判定为失败。
服务端 Codex turn 生命周期已与 WebSocket 解耦（Step 1），客户端应在断线期间显示
"重连中"而非"错误"，重连后自动恢复 UI 到正确状态。

## 变更内容

### `terminal_client.js`

1. **`ws.onclose`**：断线前快照 Codex 活跃状态；若任务活跃则设置 `reconnecting`
   状态（而非 `error`），显示"Codex 任务仍在服务端运行，正在重连…"提示。
2. **`ws.onopen`**：保持 `reconnecting` / `waiting_approval` 状态跨重连存活，
   等待服务端权威 `codex_state` 消息覆盖。
3. **`ws.onerror`**：当 Codex 已处于 `reconnecting` 时不覆盖为 `error`
   （`onerror` 先于 `onclose` 触发）。
4. **`codex_state` 处理器**：检测从 `reconnecting` 恢复的场景，写入系统日志
   "已重新连接，Codex 任务恢复中…"，并强制刷新线程快照以获取离线期间完成的 turn。
5. **§5.3 req 4**：若服务端报告 threadId 但无 currentTurnId（任务已在离线期间
   完成），自动执行 `refreshCodexThreadSnapshot` 获取最新结果。
6. **状态本地化**：`reconnecting` → `重连中`，新增 detail `task active on server`
   → `任务仍在服务端运行，正在重连`。

### `terminal_client.css`

- 新增 `.status-reconnecting` 样式：琥珀色状态点（#d29922）+ 呼吸动画。

## 设计决策

- `reconnecting` 作为纯客户端状态，不影响服务端 `codexState.status`。
- `resetCodexBootstrapState()` 仍在断线时调用以清理瞬态 UI 数据，但在
  `setCodexStatus` 之前完成，不影响状态指示器。
- 达到最大重试次数后仍回退到 `error` 状态。
