# TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd

## 任务元数据

- 项目：termlink
- 项目类型：application
- 任务 ID：20260504-001
- 任务标题：Scope Codex history and active thread state by session cwd
- 任务 slug：scope-codex-history-and-active-thread-state-by-session-cwd
- 最终状态：implemented_committed_limited_android_smoke_conditionally_accepted
- 创建时间：2026-05-04
- 归档时间：2026-05-08
- 归档性质：条件交接；不是 stable / completed 归档

## 原始任务包快照

- 用户原始需求：在 Codex 会话中，根据所选择的项目路径，只显示当前路径下的本地历史任务列表。先确认 App 中的 Codex 会话是否调用 `codex app-server`；如果是，则按 `thread/list(cwd=当前工作区路径)` 实现当前项目历史任务过滤。
- 代码事实结论：App 当前确实通过 `CodexAppServerService` 调用本地 `codex app-server`，并通过 `terminalGateway.js` 转发 `thread/list`、`thread/read`、`thread/resume` 等 JSON-RPC 方法。
- 任务目标：让 Android native 与 WebView / browser 的 Codex 历史任务列表和当前 active thread 状态按当前 Codex session `cwd` / session binding 隔离，避免跨项目显示或复用上一会话的 thread/task，并保留旧客户端兼容策略。
- 收敛缺陷：
  - 跨项目切换 Codex 会话后主窗口残留上一会话历史任务。
  - 回切后继续对话可能沿用旧 thread/task id 并报 `thread not found`。
  - 重新进入同一 Codex session 后，主界面、历史列表 current 标记和 active thread id 可能不一致。
  - 连续普通对话曾出现每次新建任务线程的回归。
- 非目标：
  - 不实现全局 `history.jsonl` 展示。
  - 不重做历史面板 UI。
  - 不修改 Sessions API、session store、`data/sessions.json` schema 或持久化格式。

## 实际改动摘要

- Android native：
  - `CodexViewModel.refreshThreadHistory()` 发起 `thread/list` 时携带当前 session `cwd`。
  - 切换 Codex session 时清空旧消息、流式状态、file mention 状态和当前 turn。
  - `codex_state.threadId = null` 时不再保留旧 active thread id。
  - `codex_turn_ack` 返回 `threadId` 后回写当前 active thread，避免连续普通对话每次新建线程。
- WebView / browser：
  - `thread/list` 参数构造改为携带 `codexState.cwd || getConfiguredCodexCwd()`。
  - runtime config 的 server/session binding 变化时断开旧 bridge、重置 Codex UI 状态并重连。
  - 普通 `codex_turn` payload 携带当前 `codexState.threadId`，减少对 gateway session 内存状态的过度依赖。
- Gateway：
  - 对旧客户端 `thread/list {}` 缺省 `cwd` 做 session cwd 兼容注入，并保持客户端显式 `cwd` 优先。
  - stale `thread/resume` / `turn/start` 遇到明确 `thread not found` 时清理 session thread binding / `lastCodexThreadId` 并 fallback 到新 thread start。
  - stale binding 清理只在 stale id 匹配当前绑定时执行，避免误清理其他线程状态。
- 测试：
  - 增加 / 更新 gateway 定向测试，覆盖 `thread/list` cwd 注入、显式 cwd 保留、stale thread fallback、非 `thread not found` 错误不误清理、连续普通 turn 复用同一 thread。
  - 增加 / 更新 WebView 静态测试，覆盖 runtime session binding 和 active thread id 发送路径。
- 文档 / workflow：
  - 当前任务包同步到条件交接状态。
  - `STATUS.md` 记录该任务不进入稳定区，完整 Android smoke 风险保留为观察项。

## 契约与决策记录

- 确认 App 中 Codex 会话走本地 `codex app-server`，并通过 WebSocket / JSON-RPC bridge 通信。
- 确认 Codex session `cwd` 是 App 中 Codex 运行态、skill discovery 和 thread history 的项目作用域，不只是 UI 显示路径。
- 确认 `thread/list` 携带当前 session `cwd` 是本任务主路径。
- 确认 `thread/read` / `thread/resume` 继续按 thread id 操作；本任务不改变历史记录恢复语义。
- 确认 `lastCodexThreadId` 只能作为恢复线索，不应被客户端或 gateway 无条件视为 active thread。
- 保持不变的关键边界：
  - 不修改 Sessions API DTO 语义。
  - 不修改 session store / `data/sessions.json` schema。
  - 不引入全局 `history.jsonl` 展示。
  - 不重做历史面板 UI。

## 验证与交付证据

- 提交：
  - `0700047 chore: update workflow templates and codex session handling`
- 敏感信息扫描：
  - 提交前 staged scan 通过。
  - pre-commit scan 通过。
- 已通过的自动 / 静态验证：
  - `node --check src/ws/terminalGateway.js`
  - `node --check public/terminal_client.js`
  - `node --check tests/terminalGateway.codex.test.js`
  - `node --test --test-force-exit --test-name-pattern "thread/list" tests/terminalGateway.codex.test.js`
  - `node --test --test-force-exit --test-name-pattern "stale missing thread|non-thread-not-found|thread/list" tests/terminalGateway.codex.test.js`
  - `node --test --test-force-exit --test-name-pattern "consecutive normal turns|stale missing thread|non-thread-not-found|thread/list" tests/terminalGateway.codex.test.js`
  - `node --test --test-force-exit --test-name-pattern "runtime session binding" tests/codexClient.shell.test.js`
  - `node --test --test-force-exit --test-name-pattern "active thread id|runtime session binding" tests/codexClient.shell.test.js`
  - `git diff --check`
  - `bun run workflow:health`
  - Android / WebView 静态检查：确认 thread list cwd 参数、runtime binding reset、active thread id 回写 / 发送路径存在。
- 已知阻塞 / 未覆盖：
  - `android\gradlew.bat :app:testDebugUnitTest` 在本机 Java 17 环境下被 `source 21` 不兼容阻塞，错误为 `无效的源发行版：21`。
  - `tests/codexClient.shell.test.js` 大范围 Phase 2 测试仍有既有 compact 文案断言漂移，不是本轮新增 active thread 修复导致。
- 有限真机 Android smoke：
  - 已执行有限真机 Android smoke，未发现当前可复现阻塞问题。
  - 覆盖不足以支撑完整步骤 12-15 勾选。

## 发布后验证证据

- Release mode: none
- Deploy source: none
- Target environment: local / Android debug
- Health checks:
  - Android native request payload check
  - WebView static / unit payload check
  - Gateway compatibility test
  - 有限真机 Android smoke
- Canary window: none
- Performance baseline: none
- Rollback / recovery:
  - 回滚 Android native `thread/list` 参数改动。
  - 回滚 WebView / browser `thread/list` 参数改动。
  - 回滚 gateway 对旧客户端 `thread/list` 的兼容兜底改动。
  - 回滚 stale thread fallback / binding cleanup 改动。
  - 回滚本任务新增或修改的测试。
- Release evidence:
  - real app-server `thread/list { cwd, limit }` accepts cwd。
  - WebView / gateway focused checks passed。
  - Android Gradle unit 被本机 Java 17 / source 21 mismatch 阻塞。
  - 有限真机 Android smoke 未发现当前可复现阻塞问题。
- canary result: not applicable
- performance baseline result: not applicable
- rollback status: not exercised
- remaining observation:
  - 双 cwd session 历史列表隔离未完整验证。
  - A/B 项目切换后的 stale task / thread 清理未完整验证。
  - 同一 session 重新进入后的 active thread 状态一致性未完整验证。
  - 新建任务脱离 stale threadId 的完整链路未完整验证。

## 未完成 Smoke 保留记录

以下 smoke 项故意保留为未完成，不得在后续引用中写成已通过：

- [ ] 步骤 12：执行真实 Android smoke：创建或切换两个不同 cwd 的 Codex session，验证历史列表只显示当前 session cwd 的 threads。
- [ ] 步骤 13：执行真实 Android smoke：A 项目打开历史任务 -> 切换 B 项目 Codex 会话 -> 主窗口不显示 A 历史任务；回切 A 后继续对话不报旧 task / thread not found。
- [ ] 步骤 14：执行真实 Android smoke：重新进入同一未关闭、未运行任务的 Codex session 后，主界面与 active thread 状态一致，或明确显示无 active thread；不打开历史列表直接发起对话不得报 thread/task not found。
- [ ] 步骤 15：执行真实 Android smoke：重新进入后点击新建任务必须脱离 stale threadId，不报 thread/task not found；打开 / 切换历史列表不再是恢复 stale 状态的必要步骤。

后续规则：

- 完整 Android smoke 转为后续追踪项，不作为当前新需求创建的硬阻塞。
- 若后续新需求继续触碰 session / thread / task 状态逻辑，必须把上述 smoke 风险重新纳入验收。
- 在上述 smoke 补齐前，本任务对应能力不得被写入 `STATUS.md` 的“已完成且稳定”区。

## Lessons 回写

- 本任务未直接写入 `docs/workflow/LESSONS.md`。
- 可复用经验：
  - bugfix 流程必须先更新 / 收敛 `CURRENT_TASK.md`，再进入 root-cause / 最小修复 / 回归；本轮出现了先修后补的流程偏差，已在任务记录中保留。
  - `codex_state.threadId = null` 应被视为当前 runtime 无 active thread 的权威信号，客户端不能继续沿用旧 launch / restore threadId。
  - `lastCodexThreadId` 是恢复线索，不是 active thread 事实源。
  - 修复 stale thread fallback 时，错误识别必须收紧到明确 `thread not found`，避免普通 `-32600` 错误误清理 session binding。

## 后续关联

- 后续任务建议：补齐完整 Android smoke，覆盖双 cwd 历史隔离、A/B 项目切换、same-session re-entry、直接发送和新建任务链路。
- 后续触发条件：任何继续触碰 session / thread / task 状态逻辑的新需求，都必须重新纳入本归档中的未完成 smoke 风险。
- 相关提交：`0700047`
- 归档位置：`TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md`
