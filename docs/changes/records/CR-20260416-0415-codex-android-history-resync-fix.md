---
title: Codex Android 历史线程连续性与结果回补修复 - 变更记录
status: active
record_id: CR-20260416-0415-codex-android-history-resync-fix
req_id: REQ-20260415-codex-android-runtime-interaction-fixes
commit_ref: 2e661a0d9eb3565dbe0e9e1627691a1856b9b848
owner: @maintainer
last_updated: 2026-04-16
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, src/ws/terminalGateway.js, tests/terminalGateway.codex.test.js]
related_docs: [docs/product/requirements/REQ-20260415-codex-android-runtime-interaction-fixes.md, docs/product/plans/PLAN-20260415-codex-android-runtime-interaction-fixes.md, docs/changes/records/INDEX.md]
---

# CR-20260416-0415-codex-android-history-resync-fix

## 1. 变更意图（Compact Summary）

- 背景：第三批问题集中在“历史线程继续执行”和“弱网丢流后的结果回补”两条链路；当前 UI 看起来已打开历史线程，但发送时 gateway 仍可能按旧 session 状态新建线程，断线期间完成的结果也不会在当前页自动补回。
- 目标：收口 `2.7 历史线程继续执行` 与 `2.8 弱网后结果回补`，让“当前选中的线程”真正成为发送目标，并让断线期间丢失的 transcript 在重连 idle 后自动恢复。
- 本次边界：只覆盖 Android ViewModel 的断线回补状态机、gateway 的显式 `threadId` 发送目标、以及对应的定点回归测试；不包含新的 UI 入口设计。

## 2. 实施内容（What changed）

0. 本批覆盖计划项：`2.7 历史任务 / 历史线程继续执行` + `2.8 弱网后结果回补与历史完成态对齐`（对应 `PLAN-20260415-codex-android-runtime-interaction-fixes` 第三批与 `3.1` 的第 5-7 条回写）。
1. `CodexViewModel` 新增断线期间的待回补线程标记：若活跃 turn 在 `WsEvent.Closed / Failure` 期间丢流，则保留当前 `threadId` 作为待重同步目标。
2. Android 端在重连成功且线程回到 idle 后，会自动补发 `thread/read(includeTurns=true)`；一旦收到 `thread/read` 结果或 `codex_thread_snapshot`，即清空待回补标记，避免重复拉取。
3. 手动 `newThread()` 或历史线程 `resume` 会清理旧的回补标记，避免把上一个线程的断线状态误带到新上下文。
4. gateway `ensureCodexThreadForSession()` 现支持 `options.threadId`：当 `codex_turn` 带有显式历史 `threadId` 时，即使 session 上保存的 execution-context signature 不匹配，也会先 `thread/resume` 到目标线程，而不是偷偷 `thread/start` 新任务。
5. 新增 `terminalGateway.codex.test.js` 定点回归：验证在 execution-context 不匹配的情况下，显式历史 `threadId` 仍会被继续执行，并沿用 resume 后的 canonical thread id。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`、`src/ws/terminalGateway.js`、`tests/terminalGateway.codex.test.js`
- 模块：Android 原生 Codex 断线重连状态机、gateway 线程绑定/重用判定、Node gateway 回归测试
- 运行时行为：历史线程重新发送命令时优先继续所选线程；活跃 turn 在弱网期间丢失后，客户端在恢复 idle 时自动重读 thread transcript

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复第三批相关文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt src/ws/terminalGateway.js tests/terminalGateway.codex.test.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `node --test --test-name-pattern "codex_turn honors an explicit history threadId even when the stored execution context no longer matches" tests\\terminalGateway.codex.test.js`
  - `set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && android\gradlew.bat :app:testDebugUnitTest :app:assembleDebug --no-daemon`
  - 真机 `MQS7N19402011743`：历史线程恢复与继续发送取证（`tmp\\device-validate-batch3\\history-restored.png/.xml`、`after-send2.png/.xml`、`history-after-turn.png/.xml`）
  - 真机 `MQS7N19402011743`：弱网回补取证（`tmp\\device-validate-batch3\\weaknet2-sent.png/.xml`、`weaknet2-recovered.png/.xml`）
- 结果：
  - 定点 gateway 回归通过：显式历史 `threadId` 会先 `thread/resume`，不再意外 `thread/start`
  - Android 单元测试与 debug APK 构建通过
  - `2.7` 真机闭环完成：通过 restore-state 注入把 `019d923a-8f82-7da2-a5a4-a093d05fda31` 恢复为当前历史线程后继续发送命令，发送前后 `last_thread_id` 均保持为同一线程，证明不会误建新线程
  - `2.8` 真机闭环完成：长回复流式仅到第 5 行时人为断开 Wi-Fi，恢复网络后当前页自动补齐至第 60 行；实时 logcat 观察到 `WebSocket failure: Software caused connection abort`，恢复阶段又出现 `Connecting to ws://192.168.50.12:3010...` 与 `WebSocket opened (protocol=http/1.1)`，与 transcript 回补结果一致

## 6. 后续修改入口（How to continue）

- 若后续继续收口，可优先处理当前页顶部残留的断网错误卡片清理策略；相关入口仍在 `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`、`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 如本记录后续被替代，请填写：替代记录: CR-YYYYMMDD-HHMM-<slug>

## 7. 风险与注意事项

1. 当前自动回补只在“断线时确实存在活跃 turn”这一路径上触发；若后续要覆盖更隐蔽的消息丢失场景，需要先明确是否仍属于同一类 reconnect 问题。
2. gateway 现在会优先尊重客户端显式传入的 `threadId`；后续若再调整 thread reuse 规则，不能重新让 execution-context mismatch 抢走显式历史线程的发送目标。
