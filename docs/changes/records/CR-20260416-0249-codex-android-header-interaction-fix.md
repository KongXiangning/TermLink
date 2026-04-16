---
title: Codex Android 运行态一致性、通知与关键交互修复 - 变更记录
status: draft
record_id: CR-20260416-0249-codex-android-header-interaction-fix
req_id: REQ-20260415-codex-android-runtime-interaction-fixes
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-16
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt]
related_docs: [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md, docs/changes/records/INDEX.md]
---

# CR-20260416-0249-codex-android-header-interaction-fix

## 1. 变更意图（Compact Summary）

- 背景：第二批交互问题集中在同一个原生 Compose 层：header 对前摄安全区利用不足、“返回最新”滚到底不自动消失、底部 `/` 按钮只开菜单不写入 composer。
- 目标：在不改信息架构和面板布局位置的前提下，收口 `2.4 顶部 header 与前摄安全区布局`、`2.5 返回最新按钮自动隐藏`、`2.6 底部工具栏 / 的 composer 语义`。
- 本次边界：只覆盖 header 两行化、安全区利用、消息区 auto-follow 恢复和 slash 按钮输入语义；不包含历史线程继续执行与弱网结果回补。

## 2. 实施内容（What changed）

1. `CodexScreen` 的 header 改为两行状态区：第一行承载 `Codex 状态`，第二行承载 `PATH`，左右会话 / 文档按钮同步扩成匹配两行 header 的高度，避免状态文字被前摄遮挡，同时保留原有元素顺序与布局位置。
2. 底部 `/` 工具栏改为真实写入 composer 文本，并继续由 composer 当前文本驱动 slash 建议列表，不再停留在“按钮只开菜单”的旁路状态。
3. 消息区 auto-follow 判定改为优先使用 `LazyListState.canScrollForward`，并把 `atLatestPosition` 收口为 `derivedStateOf`；在无法继续向前滚动时立即视为回到底部，恢复 auto-follow 并自动隐藏“返回最新”。
4. 底部判定的兜底逻辑不再强依赖 `_bottom_anchor` 必须可见，而是按最后一条真实消息与 viewport 末端关系判断，覆盖“视觉上已到底但 1dp anchor 未进入视口”的真机情况。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 模块：Android 原生 Codex header 布局、消息列表滚动状态、composer slash 交互
- 运行时行为：header 变为“两行状态 + 更高按钮”；点击 `/` 后输入框内真实出现 `/`；用户手动滚回底部后，“返回最新”自动消失

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && android\gradlew.bat :app:testDebugUnitTest :app:assembleDebug --no-daemon`
  - 真机 `MQS7N19402011743`：重装 debug APK 后验证两行 header、`/` 写入 composer，以及“返回最新”在滚离底部时出现、继续上滑回到底部后消失
- 结果：
  - Android 单元测试与 debug APK 构建通过
  - 真机 header 验证通过：header 为两行状态 / PATH，左右按钮高度与两行 header 对齐
  - 真机 slash 验证通过：底部 `/` 按钮会把 `/` 写入输入框
  - 真机 auto-follow 验证通过：`batch2-multi-complete.xml` 无“返回最新”，`batch2-multi-away.xml` 出现“返回最新”，额外上滑后的 `batch2-multi-back-step-1.xml` 按钮消失

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`、`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`、`android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt`
- 如本记录后续被替代，请填写：替代记录: CR-YYYYMMDD-HHMM-<slug>

## 7. 风险与注意事项

1. 第二批已把“是否在最新位置”的恢复逻辑绑定到 `canScrollForward` 与真实最后消息位置；后续若修改 `LazyColumn` 的 content padding、anchor item 或 reverseLayout，需要同步重验 auto-follow。
2. `/` 语义已经收口到 composer 文本；后续若再加快捷 slash 入口，不能绕开 composer 状态直接控制菜单显隐。
