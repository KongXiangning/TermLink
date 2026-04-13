---
title: Codex Android stability / plan UX / runtime readability doc finalization
status: draft
record_id: CR-20260413-0832-codex-android-followup-doc-init
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md, docs/changes/records/INDEX.md]
---

# CR-20260413-0832-codex-android-followup-doc-init

## 1. 变更意图（Compact Summary）

- 背景：当前原生 Codex 主路径虽已切为默认入口，但最新真机使用仍发现后台切回报错、计划模式重复展示、运行态可读性不足、图片未形成真实上传闭环、提权选项未出现、长时间无输出但未结束的疑似卡住态，以及 header 被长线程 ID 挤压、用户/助手消息区分不明显等问题。
- 目标：先以需求澄清 / 文档定稿批次锁定这组开放缺口与已确认产品判断，避免继续沿用“已完成收口”的错误口径，并为后续实现批次提供明确修复清单。
- 本次边界：仅更新 `PLAN + ALIGNMENT + CR index` 与本条 CR；不修改 Android 代码，不宣称问题已实现修复。

## 2. 实施内容（What changed）

1. 在 `PLAN-20260408-codex-native-android-migration` 的 `5.12` 中将本批收敛为“文档已定、代码待实现”的 follow-up 口径，明确后台恢复稳定性、计划模式信息架构、runtime diff/reasoning 可读性、图片真实上传、提权入口缺失、疑似卡住态、消息区分与 header 稳定性缺口。
2. 在 `ALIGNMENT-20260410-codex-web-android-ui-equivalence` 中细化 `D-018 ~ D-027` 十条开放差异，逐条记录当前行为、目标口径、阻塞性、建议收敛方向与验证方式。
3. 在 `docs/changes/records/INDEX.md` 中登记本条 draft CR，作为后续实现批次的文档锚点。

本批锁定的产品决策：

1. 计划正文唯一主落点是运行态 `Plan`，聊天主窗口与输入框上方不再持续重复整段计划。
2. 输入框上方仅保留紧凑动作条承载 `执行 / 继续 / 取消`，计划正文与动作入口分离。
3. 执行确认计划后，聊天流只保留简短确认语义或状态摘要，不再回灌整段计划正文。
4. 运行态 `Diff` 采用摘要优先，先展示改动文件摘要，再进入完整 diff。
5. 运行态 `Reasoning` 采用“可用则摘要、不可用则降级”的策略，无高价值内容时空态说明或隐藏优先。
6. 提权 / 批准请求在 Android 原生 Codex 页面中使用阻塞弹窗承载，必须显式提供批准 / 拒绝入口。
7. 长时间无输出、未报错、未结束的运行态应进入“疑似卡住”告警，并在可识别时继续分类展示原因，而不是无限保持模糊“运行中”状态。
8. 主聊天窗口中的用户消息与助手消息采用左右分栏 + 明显样式差异，区分对齐、容器样式和标签层级，方便回看定位。

本批覆盖计划项：

1. `13. pending：Phase 4 follow-up stability / plan UX / runtime readability repairs`
2. `5.12 Follow-up 稳定性、计划模式与运行态信息架构修复批验收口径（2026-04-13 stability / plan UX / runtime readability）`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md`
  - `docs/changes/records/INDEX.md`
  - `docs/changes/records/CR-20260413-0832-codex-android-followup-doc-init.md`
- 模块：
  - Codex Android 迁移主线文档
  - Web / Android UI 等价对齐矩阵
  - Follow-up 缺口追踪
- 运行时行为：
  - 无代码变更；仅修正文档口径并锁定后续修复范围

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文档
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260413-0832-codex-android-followup-doc-init.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260413-0832-codex-android-followup-doc-init.md -Strict`
- 结果：
  - REQ 校验已通过。
  - CR 格式校验已通过。
  - 本批问题来源于真机使用截图与用户反馈，当前记录的报错文本包括 `Broken pipe`、`WebSocket failure`、`Software caused connection abort`，并新增记录“需要提权时原生安卓 Codex 页面未出现提权选项”“长时间无输出但未结束的疑似卡住态”“主聊天窗口中用户/助手消息区分不明显”等 UI / 状态缺口。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `public/lib/codex_runtime_view.js`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 若继续保留“原生收口已完成”的文档口径，会掩盖后台恢复、计划执行、提权批准与图片发送主链上的真实缺口，影响后续优先级判断。
2. 这批问题横跨 lifecycle、socket、plan workflow、runtime rendering、approval/escalation UI 与 attachment transport；若不先在文档中锁定为同一组 follow-up，后续容易被拆散到不相关批次而失去追踪性。
