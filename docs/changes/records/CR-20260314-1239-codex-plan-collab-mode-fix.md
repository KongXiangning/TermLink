---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段） - 变更记录
status: archived
record_id: CR-20260314-1239-codex-plan-collab-mode-fix
req_id: REQ-20260309-codex-capability-mvp
commit_ref: a24c5f3
owner: @maintainer
last_updated: 2026-03-14
source_of_truth: product
related_code: [public/terminal_client.js, android/app/src/main/assets/public/terminal_client.js, src/ws/terminalGateway.js, tests/terminalGateway.codex.test.js, tests/codexClient.shell.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/codex-capability-implementation-plan.md, docs/changes/records/INDEX.md]
---

# CR-20260314-1239-codex-plan-collab-mode-fix

## 1. 变更意图

- 背景：TermLink 的 `/plan` 与计划模式发送链路仍把 `collaborationMode` 作为字符串 `'plan'` 发送；本机 `codex-cli 0.111.0` / VS Code 扩展已升级为 `CollaborationMode` 结构体协议，导致上游返回 `invalid type: string "plan", expected struct CollaborationMode`。
- 目标：把计划模式发送链路升级为结构化对象协议，并在 gateway 保留对旧字符串载荷的兼容。
- 本次边界：只修协议层与测试契约，不改 `interactionState.planMode` 的一次性语义，不扩展新的 slash 功能。

## 2. 实施内容

1. 在共享前端与 Android 内置资源中新增 `CollaborationMode` 归一化/构造函数，把 `/plan <text>`、普通发送且 `planMode=true`、空文本但带附件且 `planMode=true` 三条路径统一改为发送 `{ mode, settings }`。
2. 在 gateway 中新增 `collaborationMode` 兼容归一化：接受 legacy `'plan'` 字符串或结构化对象，并在转发 `turn/start` 前补齐 `settings.model` 与 `settings.reasoning_effort`。
3. 当 `collaborationMode` 存在时，gateway 不再并行发送顶层 `model` / `reasoningEffort`，与上游当前协议保持一致。
4. 更新单测与静态脚本断言，明确 `/plan` 必须发送对象协议且 gateway 仍兼容旧载荷。
5. 补充 REQ、实施计划和变更索引，记录本次协议失配根因与兼容策略。

## 3. 影响范围

- 文件：
  - `public/terminal_client.js`
  - `android/app/src/main/assets/public/terminal_client.js`
  - `src/ws/terminalGateway.js`
  - `tests/terminalGateway.codex.test.js`
  - `tests/codexClient.shell.test.js`
- 模块：
  - Codex composer 发送链路
  - WebSocket gateway `codex_turn -> turn/start` 适配层
  - REQ / CR 文档追踪
- 运行时行为：
  - `/plan` 不再触发 `expected struct CollaborationMode`
  - 旧前端若仍发送 `'plan'`，gateway 会在服务端自动升级后再转发

## 4. 回滚方案

```bash
# 回滚本次提交
git revert <commit_ref>

# 或仅恢复协议相关文件
git checkout <commit_ref>^ -- public/terminal_client.js
git checkout <commit_ref>^ -- android/app/src/main/assets/public/terminal_client.js
git checkout <commit_ref>^ -- src/ws/terminalGateway.js
git checkout <commit_ref>^ -- tests/terminalGateway.codex.test.js
git checkout <commit_ref>^ -- tests/codexClient.shell.test.js
```

## 5. 验证记录

- 代码测试：
  - `node --test tests/terminalGateway.codex.test.js tests/codexClient.shell.test.js`
- 文档校验：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260314-1239-codex-plan-collab-mode-fix.md -Strict`
- 预期结论：
  - gateway 测试断言 `turn/start` 收到结构化 `collaborationMode`
  - legacy `'plan'` 兼容路径仍可成功转发

## 6. 后续入口

- 如需继续真机验证，优先沿着 `public/terminal_client.js` 与 `android/app/src/main/assets/public/terminal_client.js` 的共享发送逻辑排查。
- 如上游再次调整 `CollaborationMode.settings` 字段，以 `src/ws/terminalGateway.js` 为统一兼容入口继续收口。
- 若本记录后续被替代，请补充：替代记录 `CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. 本次实现沿用计划模式 `mode: "plan"` 的既有语义；若上游后续确认枚举字面值发生变化，需要同步替换客户端与 gateway 归一化逻辑。
2. Android 资源内置了一份 `public/terminal_client.js` 镜像，后续任何发送协议调整都必须同步刷新两份文件，避免 Web 端与 APK 行为再次分叉。
