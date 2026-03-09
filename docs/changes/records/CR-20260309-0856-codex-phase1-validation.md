---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）- Phase 1 验证与同步记录
status: draft
record_id: CR-20260309-0856-codex-phase1-validation
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: code
related_code: [docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, tests/codexBootstrap.plan.test.js, tests/codexHistoryView.test.js, tests/codexClient.shell.test.js, tests/terminalGateway.codex.test.js, tests/routes.sessions.metadata.test.js, tests/sessionStore.metadata.test.js, android/app/src/main/java/com/termlink/app/data/SessionApiModels.kt, android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/changes/records/CR-20260309-0132-codex-capability-phase1-impl.md, docs/changes/records/CR-20260309-0154-codex-history-resume.md, docs/changes/records/CR-20260309-0839-codex-history-ui.md, docs/changes/records/INDEX.md]
---

# CR-20260309-0856-codex-phase1-validation

## 1. 变更意图（Compact Summary）

- 背景：Task 1 到 Task 4 已经完成 Phase 1 的主要实现，但实施计划和验证记录仍未收敛到当前代码状态。
- 目标：补充 Phase 1 收口验证、同步实施计划中的 `repo_status/gap`，并确认 Android 侧是否还需要额外的 native 模型改动。
- 本次边界：不新增产品功能，只做验证、状态同步、风险补记和静态页面回归测试。

## 2. 实施内容（What changed）

1. 更新 `docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md`，把 `thread/list`、`thread/resume` 的 `repo_status` 同步为当前已实现状态，并收敛 MVP 缺口清单为剩余未完成项。
2. 明确 Android 同步结论：Phase 1 所需的 `sessionMode/cwd/lastCodexThreadId` 原生 Session 模型已经到位；历史线程恢复逻辑由共享 Web 客户端承载，本批次无需新增 Android native 字段或桥接协议。
3. 新增 `tests/codexClient.shell.test.js`，校验：
   - `codex_client.html` 包含历史线程面板与必要脚本
   - `terminal_client.html` 共享脚本但不暴露历史线程面板 DOM
4. 汇总并复跑 Phase 1 相关 Node 测试与 CR 校验，作为本阶段的验证基线。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md`、`tests/codexClient.shell.test.js`、相关已有 Phase 1 测试文件
- 模块：实施计划状态同步、静态页面壳层回归验证、Phase 1 文档追踪
- 运行时行为：无新增运行时能力；本次主要提升验证覆盖和文档一致性

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md tests/codexClient.shell.test.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `node --check public/terminal_client.js`
  - `node --test .\\tests\\sessionStore.metadata.test.js`
  - `node --test .\\tests\\routes.sessions.metadata.test.js`
  - `node --test .\\tests\\terminalGateway.codex.test.js`
  - `node --test .\\tests\\codexBootstrap.plan.test.js`
  - `node --test .\\tests\\codexHistoryView.test.js`
  - `node --test .\\tests\\codexClient.shell.test.js`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260309-0856-codex-phase1-validation.md -Strict`
- 结果：通过；补齐了静态页面壳层、bootstrap 纯逻辑、历史列表视图模型、会话元数据和网关协议回归。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md`、`public/terminal_client.js`、`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
- Phase 2 可以在当前验证基线上继续实现 `codexConfig`、`model/list`、`account/rateLimits/read`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前仍缺浏览器端真实 DOM/WebSocket 集成测试；静态页面壳层测试只能保证结构和脚本挂载，不保证端到端交互时序。
2. Android 侧本批次只确认模型和共享 Web 资产同步，不代表已完成 Android 原生历史线程入口产品化。
3. 实施计划中的 Phase 1 已基本收口，但 REQ 中“Android 优先线程导航体验”仍需后续专门批次补齐。
