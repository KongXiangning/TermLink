---
title: Codex Android 顶部 cutout 回归修复 - 变更记录
status: draft
record_id: CR-20260416-0440-codex-top-cutout-regression-fix
req_id: REQ-20260415-codex-android-runtime-interaction-fixes
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-16
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/util/SystemBarVisibility.kt]
related_docs: [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md, docs/changes/records/INDEX.md]
---

# CR-20260416-0440-codex-top-cutout-regression-fix

## 1. 变更意图（Compact Summary）

- 背景：虽然第二批已把 Codex header 改成两行，但 Huawei 真机上 Codex 会话页顶部仍保留一整条黑色空带，页面内容并没有真正顶到最上方。
- 根因：`CodexActivity` 主内容仍保留隐藏状态栏后的 top padding，同时窗口本身也没有进入 cutout 区，导致根视图继续从 `y=104` 起步。
- 目标：让 Codex 主内容真正进入顶部区域，同时保留状态栏隐藏时的 cutout 能力，收口这次顶部窗口回归。

## 2. 实施内容（What changed）

1. `CodexActivity.applySystemBarInsets()` 不再把 `statusBarSafeTopInset()` 继续加给 Codex 主 `ComposeView`，避免主内容被隐藏状态栏留下的 top gap 二次压下。
2. `setStatusBarHidden()` 在 Android P+ 上同步切换 `layoutInDisplayCutoutMode`：隐藏状态栏时使用 `SHORT_EDGES`，恢复状态栏时回到 `DEFAULT`。
3. sessions drawer 仍保留 safe-top inset 分发，避免抽屉内容和前摄/刘海区域直接冲突。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`、`android/app/src/main/java/com/termlink/app/util/SystemBarVisibility.kt`
- 模块：Android 原生 Codex 顶部窗口/cutout 策略
- 运行时行为：Codex 会话页顶部不再保留黑色空带；header 状态行与按钮真正贴近顶部区域

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复相关文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt android/app/src/main/java/com/termlink/app/util/SystemBarVisibility.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && android\gradlew.bat :app:testDebugUnitTest :app:assembleDebug --no-daemon`
  - 真机 `MQS7N19402011743`：重装 debug APK 后抓取 `tmp\device-validate-header-top\after-cutout-fix.xml` 与 `after-cutout-fix.png`
- 结果：
  - Android 单元测试与 debug APK 构建通过
  - 真机取证显示 Codex 根视图从 `y=0` 开始，header 交互按钮提升到 `[24,48][144,168]`，状态文案提升到 `[168,63][390,105]`
  - 回归前的 `after-fix.xml/png` 仍保留 `y=104` 黑色空带，可作为对照

## 6. 后续修改入口（How to continue）

- 下次若继续调整 Codex 顶部布局，优先检查 `CodexActivity.applySystemBarInsets()` 与 `setStatusBarHidden()` 的 cutout 配置是否再次分叉。
- 如本记录后续被替代，请填写：替代记录: CR-YYYYMMDD-HHMM-<slug>

## 7. 风险与注意事项

1. 这次修复只让 Codex 主内容进入顶部 cutout 区；sessions drawer 仍保留 safe-top inset，后续若统一改抽屉顶部策略，需要重新做真机验证。
2. `layoutInDisplayCutoutMode` 现在跟随 `setStatusBarHidden()` 一起切换；后续若某个页面想复用该 helper 但不希望进入 cutout 区，不能直接假设旧行为仍然存在。
