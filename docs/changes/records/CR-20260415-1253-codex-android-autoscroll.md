---
title: Codex Android 主消息区自动跟随收口
status: active
record_id: CR-20260415-1253-codex-android-autoscroll
req_id: REQ-20260408-codex-native-android-migration
commit_ref: 183e9f3d4709a8cd45c8dd299cbc57958f44fc84
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md, docs/changes/records/INDEX.md]
---

# CR-20260415-1253-codex-android-autoscroll

## 1. 变更意图（Compact Summary）

- 背景：`PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 已冻结“默认自动跟随、手动回看后停止、右下提供返回最新按钮、点击后恢复到底和自动跟随”的规则，但原生 `CodexScreen` 仍只有“接近底部才滚动”的近似逻辑，没有独立状态机和恢复入口。
- 目标：让原生消息区拥有明确的自动跟随开关：默认跟随最新消息，用户手动回看历史后停止跟随，并通过右下“返回最新”按钮恢复。
- 本次边界：本批只覆盖 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.4 主消息区自动跟随`，不改 slash/menu、背景信息窗口和会话抽屉状态栏逻辑。

## 2. 实施内容（What changed）

1. `CodexScreen` 新增 `autoFollowEnabled` 状态机：默认开启，消息列表首条消息切换时重置为开启；新消息和流式增量仅在该状态开启时自动滚到底部。
2. 新增“用户手动回看历史”检测：当消息列表离开底部且滚动来自用户手势时，自动跟随会被关闭；程序自身触发的 `scrollToItem/animateScrollToItem` 会通过抑制标记避免误关。
3. 在消息区右下新增 `ReturnToLatestButton`，并补充 `codex_native_return_latest` 中英文文案；点击后会滚到底部并重新启用自动跟随。

本批覆盖计划项：`PLAN-20260415-codex-android-menu-context-autoscroll-freeze` §`2.4 主消息区自动跟随`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/res/values/strings.xml`
  - `android/app/src/main/res/values-zh/strings.xml`
- 模块：Android 原生 Codex Compose 消息列表滚动状态机、恢复入口文案与按钮展示。
- 运行时行为：消息区默认跟随最新消息；手动回看历史后停止自动跟随并出现“返回最新”按钮；点击按钮后列表回到底部，按钮消失，后续新消息继续自动跟随。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批自动跟随实现与文档
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- android/app/src/main/res/values/strings.xml
git checkout <commit_ref>^ -- android/app/src/main/res/values-zh/strings.xml
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`cd android && set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:testDebugUnitTest --console=plain`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/build-debug-apk.ps1 -JdkHome D:\ProgramCode\openjdk\jdk-21`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/install-debug-apk.ps1 -Serial MQS7N19402011743`
- 真机观测：在 `MQS7N19402011743` 上通过 debug injector 连续注入 auto-handled 样例制造可滚动历史；手动回看历史后的截图 `tmp/codex_autoscroll_button_retry.png` 显示右下“返回最新”按钮出现；提取按钮 bounds `[833,1884][978,1944]` 后点击中心点，再次截图 `tmp/codex_autoscroll_returned_exact.png` 与 XML 确认“返回最新”已消失。
- 结果：REQ 校验通过；Android 单测在本机 JDK 21 下通过；真机已验证 `§2.4` 的“停止自动跟随 -> 出现返回最新 -> 点击恢复”完整链路。

## 6. 后续修改入口（How to continue）

- 本计划四个实现批次已全部落地；后续若再调整消息区滚动策略，应从 `CodexScreen` 中 `autoFollowEnabled`、手动滚动判定和 `ReturnToLatestButton` 这三处统一修改，避免重新退回“多个零散条件拼凑滚动行为”的状态。
- 若未来要把“返回最新”改成图标按钮或悬浮 chip，必须保留现有语义：只在手动回看历史后出现，点击后同时恢复到底与自动跟随。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前“手动回看历史”的判定依赖列表离底且滚动来自用户，而程序自身滚动通过抑制标记排除；后续若更换为动画或其他滚动 API，必须继续保证程序滚动不会误关自动跟随。
2. 真机验证使用 debug injector 快速制造消息历史；如果后续有人移除该调试入口，需准备等价的测试脚本或假消息源，否则回归验证自动跟随会变得低效。
