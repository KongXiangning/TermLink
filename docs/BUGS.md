---
title: TermLink Bug 台账
status: active
owner: @maintainer
last_updated: 2026-05-16
source_of_truth: bug-tracking
related_code: []
related_docs: [docs/workflow/STATUS.md]
---

# TermLink Bug 台账

## 使用规则

1. 本文件用于记录尚未进入具体修复任务的 bug 与复现线索。
2. 本文件不替代 `docs/workflow/CURRENT_TASK.md`；只有当某个 bug 被正式排入修复，才应创建或更新对应任务包。
3. 每条 bug 保留原始现象、影响面、已知背景、待确认项和后续处理建议。
4. 状态流转建议：`new -> triaged -> planned -> in_progress -> fixed -> verified -> closed`。

## Bug 列表

### BUG-20260516-001: 生成计划后执行计划时新建了任务线程

- 状态：new
- 首次记录：2026-05-16
- 类型：workflow / task-thread lifecycle
- 现象：生成计划后进入执行计划阶段时，系统新建了一个任务线程，而不是沿用预期的既有任务上下文。
- 影响面：
  - 任务执行上下文可能被拆散。
  - 计划与执行记录之间的追踪关系可能变弱。
  - 后续回看时可能误判任务是否属于同一轮工作。
- 已知背景：
  - 用户明确报告该问题。
  - 当前未在本文件中记录具体复现步骤、触发入口或日志。
- 待确认：
  - 触发入口是 Web、Android WebView、Codex CLI 还是 workflow skill 链路。
  - 新建的是 Codex thread、TermLink task thread，还是 UI 层展示出来的任务线程。
  - 是否只在“生成计划 -> 执行计划”这一转换发生，还是任意 plan-to-execute 都可能发生。
- 建议后续处理：
  - 保留一次完整操作路径、session id、thread id / task id 变化和服务端日志。
  - 修复任务应重点检查 plan/execution 状态流转时的 thread 复用条件与 stale thread 清理逻辑。

### BUG-20260516-002: 已实现保活后仍偶尔丢失连接

- 状态：new
- 首次记录：2026-05-16
- 类型：session / connection retention
- 现象：之前已经实现过保活，但运行中仍会偶尔丢失连接。
- 影响面：
  - 长时间使用时 session / WebSocket / Codex runtime 可能中断。
  - Android 或 WebView 场景下可能需要手动恢复上下文。
  - 已实现的保活能力可能存在边界条件未覆盖。
- 已知背景：
  - `docs/workflow/STATUS.md` 已将 session / thread / task 状态链路列为观察风险。
  - `docs/workflow/CONTRACTS.md` 锁定了 session idle cleanup 默认 6 小时和 session lifecycle 行为。
  - 用户反馈“偶尔丢失连接”，当前尚缺具体频率、网络环境和日志证据。
- 待确认：
  - 丢失的是 HTTP session、WebSocket 连接、Codex runtime 子进程，还是 Android WebView 到服务端的链路。
  - 是否发生在前后台切换、锁屏、网络切换、长时间 idle、服务端重启或设备休眠后。
  - 是否伴随服务端 session cleanup、WebSocket close code、Android logcat 错误或 Codex runtime 状态变化。
- 建议后续处理：
  - 使用 session retention 调试流程收集 `/api/sessions`、WebSocket close reason、服务端日志和 Android logcat。
  - 修复任务应先定位连接断点归属，再判断是心跳、重连、session metadata 恢复，还是 Android 生命周期处理问题。
