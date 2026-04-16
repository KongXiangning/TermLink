---
title: Codex Android 运行态一致性、通知与关键交互修复 - 变更记录
status: draft
record_id: CR-20260416-0207-codex-android-lifecycle-notification-fix
req_id: REQ-20260415-codex-android-runtime-interaction-fixes
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-16
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md, docs/changes/records/INDEX.md]
---

# CR-20260416-0207-codex-android-lifecycle-notification-fix

## 1. 变更意图（Compact Summary）

- 背景：原生 Codex 在真机上存在三类紧耦合问题：idle 态仍可触发中断报错、任务已结束后“Codex 任务进行中”通知残留、后台任务完成没有提醒。
- 目标：先收口第一批生命周期与通知一致性问题，让可中断 turn、运行中通知和完成提醒统一围绕真实 active turn / 执行态变化驱动。
- 本次边界：本批仅覆盖计划项 `2.1 终止按钮与活跃 turn 校验`、`2.2 任务进行中通知一致性`、`2.3 任务完成提醒`；不包含 header、slash、历史线程与弱网回补批次。

## 2. 实施内容（What changed）

1. Android 端补齐 `currentTurnId` 解析与 UI 状态透传；`CodexViewModel` 在 `codex_state`、`codex_turn_ack`、`turn/started`、`turn/completed` 和 `CODEX_NO_ACTIVE_TURN` 场景下统一维护 active turn，并把 stale interrupt race 收口成安全 no-op。
2. `CodexScreen` 的 header 中断按钮、composer 停止按钮、上下文面板活跃态显示统一改为依赖真实 `currentTurnId`，idle 态不再暴露可点击的 stop 入口。
3. `CodexActivity` 的前台服务状态改为基于真实 active turn / approval / planning 状态判定；`CodexTaskForegroundService` 在 stop 路径显式移除 9201 通知，避免服务退出后系统通知残留。
4. 新增后台任务完成提醒文案和触发逻辑：当后台任务从真实运行态过渡到 idle 且无错误时，发布独立的 `Codex 任务已完成` 提醒。
5. 审查回补：完成提醒增加同线程上下文约束，避免切换历史线程或载入 thread snapshot 时把 `currentTurnId` 清空误判成“任务完成”。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`CodexViewModel.kt`、`CodexActivity.kt`、`CodexTaskForegroundService.kt`、`CodexScreen.kt`、`CodexWireModels.kt`、`CodexModels.kt`、`strings.xml`、`strings-zh.xml`
- 模块：Android 原生 Codex 生命周期状态机、前台服务通知、后台提醒、输入区中断交互
- 运行时行为：idle 态不再显示 stop；后台完成后会出现完成提醒；运行中通知在真实 idle 后被清理

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md -Strict`
  - `set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && android\gradlew.bat :app:testDebugUnitTest --console=plain`
  - 真机 `MQS7N19402011743`：重装 debug APK 后验证 idle 态无 stop / 无“任务进行中”通知；后台执行任务后通知栏出现“Codex 任务已完成”，`dumpsys activity services com.termlink.app` 为空
- 结果：REQ 校验通过；Android 单元测试通过；第一批 2.1/2.2/2.3 真机回归通过

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`、`android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`、`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
- 如本记录后续被替代，请填写：替代记录: CR-YYYYMMDD-HHMM-<slug>

## 7. 风险与注意事项

1. `CodexTaskForegroundService` 仍由 Activity 驱动；后续若把任务执行保活下沉到更长期的后台组件，需要同步审视当前的通知清理假设。
2. 第一批已把“真实 active turn”作为 stop / 运行中通知的统一判定源；后续第二、三批不要再引入新的本地残留标志绕开这条链路。
