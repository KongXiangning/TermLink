---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段）- 变更记录
status: draft
record_id: CR-20260318-1642-codex-phase5-permission-context-impl
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-18
source_of_truth: product
related_code: [public/codex_client.html, public/terminal_client.html, public/terminal_client.css, public/terminal_client.js, tests/codexClient.shell.test.js, tests/codexSecondaryPanel.integration.test.js]
related_docs: [docs/codex/CODEX_PHASE5_PERMISSION_CONTEXT_PLAN.md, docs/product/requirements/REQ-20260309-codex-capability-mvp.md]
---

# CR-20260318-1642-codex-phase5-permission-context-impl

## 1. Compact Summary
- 背景：上一版 Phase 5 实现偏离了需求，把 composer 沙箱入口删掉并引入了背景信息 modal。
- 目标：改回“真实 token usage 圆环 + 从 git 恢复 composer 沙箱选择”的主路径，并补齐线程初始 usage 链路。
- 边界：继续复用现有 `codex_state.tokenUsage` / `thread/tokenUsage/updated` 消费路径；不恢复顶部权限 pill、权限弹层或会话设置入口。

## 2. What Changed
1. 按 git 历史 `ff4676c` 恢复 composer `codex-quick-sandbox` 下拉，并继续接入既有 `nextTurnOverrides.sandbox` / `nextTurnEffectiveCodexConfig`。
2. 将 `codex-context-widget` 收口为仅显示百分比圆环，移除说明文案、线程标题、空态提示和 `codex-context-modal` 交互。
3. 前端上下文用量统一优先消费 `latestTokenUsageInfo.modelContextWindow + latestTokenUsageInfo.last.totalTokens`，并按 `min(used,total)` 与 `floor(percent)` 计算显示。
4. gateway 在线程启动、线程恢复和线程读取时同步提取 `latestTokenUsageInfo` 到 `codex_state.tokenUsage`，让新线程能直接显示 `0%`，已有线程能直接显示当前已用比例。
5. 保留原有命令审批阻塞弹窗链路，不把权限选择重新扩展回顶部入口或额外弹层。

## 3. Impact
- Files:
  - `public/codex_client.html`
  - `public/terminal_client.html`
  - `public/terminal_client.css`
  - `public/terminal_client.js`
  - `tests/codexClient.shell.test.js`
  - `tests/codexSecondaryPanel.integration.test.js`
- Runtime:
  - Codex composer 恢复沙箱选择，下一轮请求可继续显式覆盖 `read-only` / `workspace-write` / `danger-full-access`。
  - 背景信息入口只显示上下文用量圆环；有有效 usage 时显示百分比，无效数据时直接隐藏。
  - 新建线程若上游已知 context window，会直接显示 `0%`；恢复已有线程时无需等待下一次增量事件即可显示当前已用比例。

## 4. Rollback
```bash
git revert <commit_ref>
```

## 5. Tests
- `node --test tests/codexApprovalView.test.js`
- `node --test tests/codexClient.shell.test.js`
- `node --test tests/codexSecondaryPanel.integration.test.js`
- `node --test tests/terminalGateway.codex.test.js`

## 6. Follow-up
- 若后续 app-server 对新线程稳定返回 `modelContextWindow`，圆环可在更多模型/场景下直接显示 `0%`。
- 旧设置/权限相关残余逻辑仍可继续清理，但要避免影响本次从 git 恢复的 composer 沙箱选择。

## 7. Risks
1. 若上游线程读取结果未携带 `latestTokenUsageInfo` 且旧字段也为空，圆环会直接隐藏，不再显示任何说明性 fallback。
2. composer 沙箱 UI 是从历史实现恢复，若历史接线与当前状态模型存在偏差，回归重点在 next-turn override 是否仍被正确消费。
