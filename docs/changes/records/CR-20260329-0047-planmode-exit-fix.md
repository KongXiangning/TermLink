---
title: 修复"执行此计划"后 planMode 未完整清除
status: active
record_id: CR-20260329-0047-planmode-exit-fix
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 64c8aa3
owner: @maintainer
last_updated: 2026-03-29
source_of_truth: product
related_code: [public/terminal_client.js, src/ws/terminalGateway.js]
---

## 背景

PLAN-20260329 §5.4：点击"执行此计划"后，`planMode` 必须立即清空，后续普通输入
不再自动沿用计划模式。

## 问题

`btnCodexPlanExecute` 点击处理器中：
1. ✅ `setPlanMode(false)` 正确立即清除了客户端 planMode 并同步服务端
2. ❌ `sendCodexTurn(prompt, { clearPlanMode: false })` — `clearPlanMode: false`
   导致 turn 确认后的 `finalizePendingTurnStateOnSuccess()` 不会再次清除
   planMode。若在 turn 确认前有竞态条件重新设置了 planMode，该标志不会被
   二次清除。

## 修复内容

- `clearPlanMode: false` → `clearPlanMode: true`
- 增加代码注释说明三层清除机制：
  1. `setPlanMode(false)` 立即清除 + 同步服务端
  2. `clearPlanMode: true` 在 `codex_turn_ack` 时二次清除
  3. 服务端 `codex_turn` 处理器独立清除 `interactionState`（已有逻辑，无需修改）

## 影响范围

仅修改 `public/terminal_client.js` 中 `btnCodexPlanExecute` 事件处理器，
单行参数变更 + 注释说明。
