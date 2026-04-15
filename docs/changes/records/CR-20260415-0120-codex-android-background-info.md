---
title: Codex Android 背景信息窗口 token/context 口径收口
status: active
record_id: CR-20260415-0120-codex-android-background-info
req_id: REQ-20260408-codex-native-android-migration
commit_ref: 183e9f3d4709a8cd45c8dd299cbc57958f44fc84
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md, docs/changes/records/INDEX.md]
---

# CR-20260415-0120-codex-android-background-info

## 1. 变更意图（Compact Summary）

- 背景：原生背景信息窗口此前会沿用上一线程的 `contextUsage/tokenUsageSummary`，而 `normalizeContextUsageState()` 还会拿 `totalTokens/inputTokens` 等累计字段兜底，容易把线程累计量误显示成单次任务值。
- 目标：把背景信息窗口的 context/token 口径收敛到 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 已冻结的规则：新任务初始归零/空值、只展示任务级 telemetry、缺少单次任务值时明确显示空值、不再在 header 重复承载。
- 本次边界：本批只覆盖 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.2 背景信息窗口口径`，不改抽屉系统状态栏和主消息区自动跟随逻辑。

## 2. 实施内容（What changed）

1. `newThread()` 现在会显式清空 `usagePanel.contextUsage` 与 `tokenUsageSummary`，避免新任务/新线程继续显示上一任务残留的 context/token 值。
2. `applyTokenUsagePayload()` 改为先归一化任务级 `contextUsage` 再生成 summary；`normalizeContextUsageState()` 只接受任务级 telemetry（如 `latestTokenUsageInfo.last.totalTokens`、显式 `contextUsage`），不再用 `totalTokens/inputTokens/promptTokens` 这类累计值兜底。
3. `CodexHeader` 不再重复展示 `tokenUsageSummary`，让背景信息窗口中的 context 摘要、Token 统计和 compact 入口保持同一信息架构；同时 `CodexScreen` 仅在存在可见会话内容或任务处于运行/待处理态时展示 context 占用，避免空白 idle 页继续显示旧百分比。

本批覆盖计划项：`PLAN-20260415-codex-android-menu-context-autoscroll-freeze` §`2.2 背景信息窗口口径`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 模块：Android 原生 Codex token/context telemetry 归一化、背景信息窗口显示口径、header 元信息展示。
- 运行时行为：新线程打开背景信息窗口时不会再看到旧任务残留值；如果服务端当前只提供线程累计 token 而没有任务级 telemetry，原生页会显示空值而不是累计值；空白 idle 页右下 context widget 会回落为 `--`；token/context 信息不再在 header 与背景信息窗口双处重复展示。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批背景信息口径实现与文档
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260415-0120-codex-android-background-info.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`cd android && set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:testDebugUnitTest --console=plain`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260415-0120-codex-android-background-info.md -Strict`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260408-codex-native-android-migration`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/build-debug-apk.ps1 -JdkHome D:\ProgramCode\openjdk\jdk-21`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/install-debug-apk.ps1 -Serial MQS7N19402011743`
- 真机观测：`adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity` 后复拍空白首页，底部 `/` 按钮仍存在，header 未重复显示 token 摘要，右下 context widget 已显示 `--` 而非旧的 `13%`。
- 结果：Android 单测在本机 JDK 21 下通过；CR 结构校验通过；REQ 主线 doc-sync 校验通过；真机空白态背景信息口径符合 `§2.2` 预期。

## 6. 后续修改入口（How to continue）

- 下次继续实现时，应直接进入 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.3 会话抽屉与系统状态栏`，不要再回退背景信息窗口的空值/任务级 telemetry 口径。
- 若后续服务端补充了更稳定的单任务 telemetry，可在保持“缺值显示空值”的前提下扩展 `normalizeContextUsageState()` 的可识别字段，但不能重新接受线程累计值兜底。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前实现把“没有任务级 telemetry”统一显示为空值，这符合产品口径，但如果后续有人误以为这是解析回归而重新恢复累计值兜底，会再次破坏 `2.2` 的冻结规则。
2. Header 里移除了重复 token 摘要后，背景信息窗口成为唯一的 compact/context/token 主展示位；后续如需新增其他入口，只能做跳转或摘要，不应重新复制完整统计。
