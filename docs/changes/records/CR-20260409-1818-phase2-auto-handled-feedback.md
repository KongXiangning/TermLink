---
title: Codex 原生 Android auto-handled 请求用户可见反馈
status: draft
record_id: CR-20260409-1818-phase2-auto-handled-feedback
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-09
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260409-1818-phase2-auto-handled-feedback

## 1. 变更意图（Compact Summary）

- 背景：Web 在收到非 `client-handled` 的 `codex_server_request` 时会追加一条系统提示，而原生 Android 之前只写日志并直接忽略，导致用户看不到请求已由服务端自动处理。
- 目标：在不触碰旧 `MainShellActivity + WebView Codex` 路径的前提下，让原生 `CodexActivity` 对齐 Web 的这条反馈语义：非 `client-handled` 请求不弹原生审批框，但要在会话流中显示系统消息。
- 本次边界：覆盖原生 `codex_server_request` 的 auto-handled 分支提示与 debug-only 验证入口；真实 provider 何时下发 `handledBy=client` 仍不在本批解决范围内。

本批覆盖计划项：Phase 2 协议盘点中的“non-client-handled 请求缺少用户可见反馈”差异收口。

## 2. 实施内容（What changed）

1. `CodexViewModel.handleCodexServerRequest()` 在收到非 `client` 的请求时，不再只记录日志，而是追加一条 `ChatMessage.Role.SYSTEM` 系统消息：`Codex server request auto-handled: <method>`。
2. `DebugServerRequestPreset` 新增 `AUTO_HANDLED` 样例，`ApprovalDebugSheet` 增加“自动处理请求样例”入口，便于在真实 provider 暂未稳定复现时手工验证该分支。
3. 更新中英文 debug sheet 文案，使调试面板说明与入口标题明确覆盖 auto-handled 请求反馈场景。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`CodexViewModel.kt`、`CodexModels.kt`、`CodexScreen.kt`、`values/strings.xml`、`values-zh/strings.xml`
- 模块：原生 `codex_server_request` 分发逻辑、Compose debug injector、调试文案资源
- 运行时行为：当 gateway / provider 下发非 `client-handled` 请求时，Android 不会弹审批框，但会像 Web 一样在消息流中显示系统提示；debug build 可手工注入该分支验证

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 auto-handled 反馈相关文件
git checkout <commit_ref>^ -- \
  android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt \
  android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt \
  android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt \
  android/app/src/main/res/values/strings.xml \
  android/app/src/main/res/values-zh/strings.xml
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\build-debug-apk.ps1`
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/com.termlink.app.codex.CodexActivity`
  - `adb -s MQS7N19402011743 shell uiautomator dump /sdcard/termlink-post-auto.xml`
- 结果：
  - Android debug APK 编译通过。
  - 真机 `MQS7N19402011743` 上 debug 面板已出现“自动处理请求样例”入口。
  - 注入该样例后，原生 Codex 消息流出现系统消息：`Codex server request auto-handled: item/commandExecution/requestApproval`，说明 Android 已不再静默忽略该类请求。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`、`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前系统消息仍为英文固定文案，主要用于补齐行为反馈；若后续需要与 Web 完整 i18n 文案逐字对齐，可再引入 Android 侧可复用的字符串格式化层。
2. 本批只补齐了 non-client-handled 请求的显式提示，不改变 `handledBy=client` 审批 / 用户输入链路；真实 provider 下发 client-handled 请求的联调问题仍待后续环境侧解决。
