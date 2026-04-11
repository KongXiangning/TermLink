---
title: Codex Web / Android UI 等价原生收敛 - 变更记录
status: draft
record_id: CR-20260410-1357-codex-ui-equivalence-native
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-10
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexTheme.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md, docs/changes/records/CR-20260410-1331-ui-equivalence-docs.md, docs/changes/records/INDEX.md]
---

# CR-20260410-1357-codex-ui-equivalence-native

## 1. 变更意图（Compact Summary）

- 背景：`CR-20260410-1331-ui-equivalence-docs` 已把 Web 定义为唯一 UI source of truth，但原生 Android `CodexScreen` 仍残留 Android 风格独立布局与文案，尚未满足 PLAN `4.1 / 5.1` 的产品等价口径。
- 目标：把原生 Android Codex 页面收敛到与 Web 版一致的结构、视觉层级、交互路径、状态显隐与用户可见文案，并完成构建与真机 smoke 验证。
- 本次边界：仅修改原生 Android Codex UI 相关代码与批次进度文档，不重写服务端协议，也不移除现有 Web fallback 链路。

## 2. 实施内容（What changed）

1. 重构 `CodexScreen.kt`，以 Web 信息架构重排顶部状态条、消息区、底部 composer、secondary nav、inline history/runtime/tools panel、plan workflow、approval/context debug、context widget 与 image input，去掉 Android 独立重设计式 footer / sheet 组织方式。
2. 更新 `CodexTheme.kt`、`strings.xml` 与 `values-zh/strings.xml`，把原生视觉 token、按钮文案、空态/错误态/状态文案对齐到 Web 口径。
3. 更新 `CodexViewModel.kt`，补齐 secondary panel 与 quick picker 的互斥显隐规则，保证 history/runtime/tools 与 model/reasoning/sandbox 入口行为与 Web 一致。

本批覆盖计划项：

1. `PLAN-20260408-codex-native-android-migration` 第 `4.1` 节 Web / Android UI 等价实施基线。
2. `PLAN-20260408-codex-native-android-migration` 第 `5.1` 节 Web / Android UI 等价验收标准中的布局、视觉、交互、状态、文案与批次验证要求。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexTheme.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/res/values/strings.xml`
  - `android/app/src/main/res/values-zh/strings.xml`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/changes/records/CR-20260410-1357-codex-ui-equivalence-native.md`
- 模块：
  - 原生 Codex Compose UI
  - 原生 Codex UI 状态控制
  - Android 本地化资源
  - UI 等价批次文档留痕
- 运行时行为：
  - 原生 Codex 首屏层级、footer 快捷配置、context widget、approval/debug 入口与 tools panel 对齐到 Web 版结构
  - secondary panel 与 quick picker 的显隐互斥不再漂移
  - 真机启动时可显式进入原生 `CodexActivity`，并保持 Codex 连接建立

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批原生 UI 与文档
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexTheme.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
git checkout <commit_ref>^ -- android/app/src/main/res/values/strings.xml
git checkout <commit_ref>^ -- android/app/src/main/res/values-zh/strings.xml
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260410-1357-codex-ui-equivalence-native.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/build-debug-apk.ps1`
  - `npm test`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/adb-doctor.ps1`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/ensure-local-server.ps1`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/validate-server-config.ps1`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity`
  - `adb -s MQS7N19402011743 logcat --pid=<app_pid> -d -t 200`
  - `adb -s MQS7N19402011743 shell uiautomator dump /sdcard/codex-ui.xml`
  - `adb -s MQS7N19402011743 shell screencap -p /sdcard/codex-command-approval.png`
  - `adb -s MQS7N19402011743 shell screencap -p /sdcard/codex-user-input.png`
- 结果：
  - REQ 严格校验通过。
  - debug APK 重新编译通过，修正了资源字符串转义与 Compose API 兼容问题。
  - 真机 `MQS7N19402011743` 安装与原生 `CodexActivity` 显式启动成功。
  - UI dump 与截图已确认首页状态条、secondary nav、footer quick controls、bottom composer、approval debug modal、command approval modal、user-input modal 的位置与结构对齐到 Web 版口径。
  - 定向 logcat 已确认 CodexActivity 创建与 Codex 连接建立，未出现本批 UI 改造引入的启动级崩溃。
  - `npm test` 在当前仓库基线下停在 `normalizeApprovalRequest` 相关用例之后未自行退出，本批未把该既有问题伪装为通过。

## 6. 后续修改入口（How to continue）

- 下次若继续做 Web / Android UI 深度回归，优先从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `docs/product/plans/ALIGNMENT-20260410-codex-web-android-ui-equivalence.md`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. `skills/android-local-build-debug/scripts/logcat-termlink.ps1` 当前使用 `$pid` 变量名，会与 PowerShell 内置只读变量冲突；本批真机日志改用手动 `adb logcat --pid=...` 收集。
2. `npm test` 当前未在仓库基线下自然收口，后续若要把该项纳入 UI 等价批次验收，需要先单独排查测试套件挂起原因。
