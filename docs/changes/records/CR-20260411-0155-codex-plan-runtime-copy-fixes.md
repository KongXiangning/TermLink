---
title: Codex Android plan/runtime/copy follow-up fixes
status: draft
record_id: CR-20260411-0155-codex-plan-runtime-copy-fixes
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-11
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md]
---

# CR-20260411-0155-codex-plan-runtime-copy-fixes

## 1. 变更意图（Compact Summary）

- 背景：UI 等价收敛后，Android 原生 Codex 仍存在 plan mode 状态机不闭环、runtime panel 数据与 UI 分叉、聊天消息不可复制，以及 quota 文案和 approval 控件未收口的问题。
- 目标：以同一实施批次修正 plan mode enter/continue/exit、runtime plan/diff/reasoning 显示口径、聊天复制能力、quota 本地化与 approval 无效控件，恢复 Android 与 Web 的产品等价。
- 本次边界：仅覆盖 plan mode、runtime panel、message copy、rate-limit 文案和 approval remember-prefix；不扩展新功能，不调整既有 REQ 状态。

## 2. 实施内容（What changed）

1. 修正 Android plan workflow 的 `continue / cancel / execute` 三条路径，并补齐进入与退出 plan mode 的闭环。
2. 收敛 runtime panel 的状态模型与显示口径，处理 confirmed plan 与 runtime `Plan` 的桥接，并消除不可见 terminal 数据分叉。
3. 补齐聊天消息复制能力，清理 quota 英文硬编码与 approval 中无行为闭环的 `Remember this prefix` 控件。
4. 代码已落在 `CodexViewModel.kt`、`CodexScreen.kt`、`CodexModels.kt` 与中英文 strings；本批额外补齐了 quota header / usage panel 的 locale-aware 展示层（`一周/week`、剩余百分比、重试/重置、额外范围），并在真机动态额度回归中修正了 header / usage 将时间里的 `:` 误判成分隔符的问题。
5. 为了稳定补 usage panel 真机证据，现有 debug `RUNTIME_SAMPLE` 已扩展为同时注入 context usage / rate-limit 遥测并自动拉起 usage panel，便于重复验证而不依赖真实会话遥测恰好到达。
6. 二次复审中补上 `thread/read` 恢复 notices panel 快照回放，避免恢复线程时丢失 `configWarning` / `deprecationNotice`。

本批覆盖计划项：

1. `PLAN-20260408-codex-native-android-migration.md` 第 `4.2 Follow-up 修正批次（2026-04-11）` 的 5 项收敛内容。
2. `PLAN-20260408-codex-native-android-migration.md` 第 `5.2 Follow-up 修正批验收口径（2026-04-11）` 的 7 项验收回写。
3. `ALIGNMENT-20260410-codex-web-android-ui-equivalence.md` 第 `9.1` 的 `D-002 ~ D-008` 已收敛差异留痕。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt`
  - `android/app/src/main/res/values/strings.xml`
  - `android/app/src/main/res/values-zh/strings.xml`
- 模块：
  - plan mode 状态机
  - runtime panel
  - chat message rendering
  - approval dialog
  - usage/rate-limit summary
- 运行时行为：
  - plan mode 可继续追问、可退出
  - runtime `Plan / Diff / Reasoning` 与 Web 对齐
  - message body 支持复制
  - quota header 与 usage panel 摘要按 locale 本地化输出

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- android/app/src/main/res/values/strings.xml
git checkout <commit_ref>^ -- android/app/src/main/res/values-zh/strings.xml
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/build-debug-apk.ps1`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/adb-doctor.ps1`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity`
  - `adb -s MQS7N19402011743 shell screencap -p /sdcard/codex-header-quota-v4.png`
  - `adb -s MQS7N19402011743 shell uiautomator dump /sdcard/codex-header-quota-v4.xml`
- 结果：
  - `PASS: REQ validation succeeded.`
  - `PASS: build-debug-apk` 已在本机 JDK 21 环境下重新编译成功。
  - `PASS: tmp\\codex-header-quota-v5.png/xml` 已确认顶部额度在动态数据下展示为 `5h 99% · 16:13` 与 `一周 85% · 04/17 02:11`，不再显示原先的 reset 前缀或 `168h` 标签，也不会把时间里的 `:` 错拆成单独数值。
  - `PASS: tmp\\codex-usage-panel-v2.png/xml` 已通过扩展后的 debug `RUNTIME_SAMPLE` 注入 context usage / rate-limit 遥测，确认 usage panel 落屏为 `5小时 99% 剩余 · 重置 16:13 | 一周 85% 剩余 · 重置 04/17 02:11`。
  - `PASS: build-debug-apk` 在补上 `thread/read` notices snapshot 回放后再次编译通过，复审新增修正未引入构建级回归。
  - 代码级回归已覆盖：plan mode 关闭路径、runtime terminal 状态移除、runtime plan 桥接、message copy、usage/rate-limit 本地化展示与 approval 无效控件移除。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 若只修 UI 不修状态机，plan mode 的 continue/exit 仍可能被后续 `codex_state` 回写覆盖，形成“看起来好了但下一次又失效”的伪修复。
2. 若只桥接 runtime plan 而不统一 terminal 状态模型，Android 会继续保留“有数据无界面”的分叉，难以通过长期回归。
3. 若后续继续使用 debug 样例验证 usage / runtime，请保持 `RUNTIME_SAMPLE` 的 telemetry 样本与当前 Web 口径同步，避免截图验证通过但样本字段已过期。
