---
title: Codex Android 重新打开页面误建新会话问题记录
status: draft
record_id: CR-20260417-0424-codex-open-reuse-session-bug
req_id: REQ-20260415-codex-android-runtime-interaction-fixes
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-17
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md, docs/changes/records/INDEX.md]
---

# CR-20260417-0424-codex-open-reuse-session-bug

## 1. 变更意图（Compact Summary）

- 背景：用户反馈当前 Android 原生 Codex 在“每次打开 Codex 页”时都会新建一个新的 Codex session，导致原本应继续复用的最近活跃 session / thread / cwd 被打断。
- 目标：先把该问题明确挂到 `REQ-20260415-codex-android-runtime-interaction-fixes` 主线下，冻结为独立待修项 `2.9`，作为后续实现和验证入口。
- 本次边界：本批只记录缺陷并同步 REQ / PLAN，不改 Android 代码，也不提前宣称已定位根因。

## 2. 实施内容（What changed）

1. 在 `REQ-20260415-codex-android-runtime-interaction-fixes` 中新增“重新打开 Codex 页时误建新 session”问题、范围、验收标准与测试场景。
2. 在 `PLAN-20260415-codex-android-runtime-interaction-fixes` 中新增 `2.9 重新打开 Codex 页时的 session 复用 / 恢复`，并将其列为新的第四批待实施项。
3. 新建本条 draft CR，作为后续调查 reopen session 恢复链路、实现修复和回填 `commit_ref` 的入口记录。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md`
  - `docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md`
  - `docs/changes/records/CR-20260417-0424-codex-open-reuse-session-bug.md`
- 模块：Android 原生 Codex 的 reopen 入口恢复语义、session restore state / launch params 文档边界。
- 运行时行为：本批无运行时变化；当前仅完成缺陷留痕与计划挂载。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档记录
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260417-0424-codex-open-reuse-session-bug.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md -Strict`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260417-0424-codex-open-reuse-session-bug.md -Strict`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./scripts/generate-cr-index.ps1`
- 结果：待执行；本批目标是确认 REQ / PLAN / CR 三处对新 bug 的描述一致。

## 6. 后续修改入口（How to continue）

- 下次修改建议优先排查 `CodexActivity` 的启动参数恢复、`CodexViewModel` 的现有 active session 绑定，以及 `MainShellActivity` 传入 Codex 页的 launch params 是否在 reopen 时误触发 auto-create。
- 本批覆盖计划项：`PLAN-20260415-codex-android-runtime-interaction-fixes` 的 `2.9 重新打开 Codex 页时的 session 复用 / 恢复` 文档冻结。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前只知道用户态症状是“每次打开都会新建新 session”，但尚未区分究竟是 restore state 丢失、launch intent 覆盖，还是连接建立前的 auto-create 过早执行；后续实现前必须先补清根因。
2. 若后续只在 UI 层缓存 sessionId，而不统一 reopen 决策来源，仍可能在后台恢复、冷启动或 profile 切换路径再次回归。
