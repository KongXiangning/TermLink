---
title: Codex native retention/notification/navigation doc init
status: draft
record_id: CR-20260411-1100-codex-native-retention-notification-nav-doc-init
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-11
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md, docs/changes/records/INDEX.md]
---

# CR-20260411-1100-codex-native-retention-notification-nav-doc-init

## 1. 变更意图（Compact Summary）

- 背景：原生 Codex 主链虽已切为默认入口，但文档仍沿用“已完成收口”的口径，未显式记录后台保活扩展、系统通知补齐与顶部全局入口缺失这三类 follow-up。
- 目标：先以文档批次锁定新增需求、开放差异与后续实施边界，避免继续把未完成项误记为已完成。
- 本次边界：仅更新 `REQ + PLAN + ALIGNMENT + CR index`；不修改 Android 代码，不声明实现已完成。

## 2. 实施内容（What changed）

1. 在 `REQ-20260408-codex-native-android-migration` 中补充原生执行期后台保活、关键交互系统通知、顶部全局入口三类新增范围与验收口径。
2. 在 `PLAN-20260408-codex-native-android-migration` 中新增 2026-04-11 文档初始化 follow-up 小节，明确这些事项当前仍为 `pending`。
3. 在 `ALIGNMENT-20260410-codex-web-android-ui-equivalence` 中新增开放差异，记录会话列表 / 设置 / 文档按钮缺失，以及后台关键事件缺少系统通知。
4. 在 `docs/changes/records/INDEX.md` 中登记本条 draft CR。

本批覆盖计划项：

1. `4.3 Follow-up 文档初始化批次（2026-04-11）`
2. `5.3 Follow-up 文档初始化批验收口径（2026-04-11）`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/requirements/REQ-20260408-codex-native-android-migration.md`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md`
  - `docs/changes/records/INDEX.md`
- 模块：
  - 文档主线
  - UI 对齐矩阵
  - Codex native follow-up 范围定义
- 运行时行为：
  - 无代码变更；仅修正文档口径并锁定后续实现范围

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文档
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260411-1100-codex-native-retention-notification-nav-doc-init.md -Strict`
- 结果：
  - 待本批文档写入后执行并回填

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 若继续保留“原生收口已完成”的文档口径，会误导后续实施与验证，导致缺口被当成回归而非未完成项。
2. 若后续代码实施不沿用本文档批次锁定的范围，容易把后台保活、系统通知和全局导航入口混入不相关功能批次，破坏追踪性。
