# TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history

## 任务元数据

- 项目：termlink
- 项目类型：application
- 任务 ID：20260508-001
- 任务标题：Codex 输入区支持多 skill 内联插入并持久展示附件上下文
- 任务 slug：codex-inline-multiple-skills-and-attachment-visible-history
- 最终状态：completed_verified_archived
- 创建时间：2026-05-08
- 归档时间：2026-05-09
- 归档性质：完成归档；验收、回归与关联风险 smoke 已补齐

## 原始任务包快照

- 用户原始需求：围绕 `RF-20260508-001` 与 `RF-20260508-002`，让 Codex 输入区支持像 VS Code Codex 一样的多 skill 内联 token 输入，并让本地图片 / 本地文件附件上下文在 Web / Android 的发送后历史中持续可见。
- 任务目标：
  - Web / Android composer 支持多 skill 内联 token。
  - 发送后 user message 在流式中、完成后和历史回看时都保留 skill / image / file 上下文。
  - 本地图片 metadata 不得把 `data:image/...` 泄漏进 DOM `title`、聊天 UI 或 Android display `path`。
  - Android 窄屏 skill / attachment chips 需要稳定换行，不能再依赖横向滚动。
- 非目标：
  - 不重做现有本地图片 / 本地文件上传入口。
  - 不扩大到 gateway / wire DTO / persistence breaking 变更。
  - 不重构 Codex 主架构或 Sessions / Workspace / Settings 主链路。

## 实际改动摘要

- Web：
  - `public/lib/codex_slash_commands.js` / `public/terminal_client.js` 把 skill 发送事实源收敛为 composer 内联 token，发送后 user message 与 snapshot 回放按正文 token / metadata 重建 skill 上下文。
  - `public/terminal_client.js` 的 localImage 历史摘要改为只保留安全 label / kind，并用 opaque dedupe key 防止同名本地图片在历史中被误合并。
  - `public/terminal_client.css` / Web message 渲染侧保持 skill、file、image 摘要在消息上下文中稳定显示，不再把 `data:image` 写进可见 DOM/title。
- Android：
  - `CodexSlashRegistry.kt`、`CodexModels.kt`、`CodexViewModel.kt`、`CodexScreen.kt` 对齐多 skill composer-token 语义、localImage metadata 脱敏与 dedupe、post-send user bubble 的 skill / file / image 承载面。
  - `CodexScreen.kt` 的 user message context chips 改为换行布局；post-send user bubble 重新渲染 `message.skills`，并继续隐藏 `SKILL.md` 路径。
  - `CodexViewModelThreadReadyTest.kt` 等 Android 单测补足 `thread_ready` / `thread_started` 下的 optimistic tail 保留行为。
- 测试与文档：
  - `tests/codexClient.shell.test.js`、`tests/codexSlashCommands.test.js`、`tests/codexShellView.test.js` 对齐当前稳定行为，去掉陈旧静态基线假设。
  - `docs/workflow/CURRENT_TASK.md`、`STATUS.md`、`LESSONS.md` 已同步真实执行、验证与 lessons。

## 契约与决策记录

- 保持不变的关键边界：
  - 不改 `CONTRACTS.md` 中锁定的 sessions/workspace API、`codex_state` 语义、`cwd` skill discovery scope。
  - 不改 gateway / service / wire DTO；本轮未触发 `Conditional Files`。
  - 不改现有本地图片 / 本地文件上传能力范围，仍只支持本地图片和本地文件。
- 已验证的兼容策略：
  - 单 skill 发送仍能被 runtime 正常识别。
  - Web / Android 继续以当前 Codex session `cwd` 作为 skill 解析与 thread/history 作用域。
  - 附件展示只显示 label / 类型摘要，不把图片 data URL 或文件正文写回聊天 UI。

## 验证与交付证据

- 已通过的自动 / 静态验证：
  - `node --test tests/codexSlashCommands.test.js tests/codexClient.shell.test.js tests/codexShellView.test.js` -> 31/31 通过
  - `Set-Location android; $env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; .\gradlew.bat :app:testDebugUnitTest --no-daemon` -> 通过
- 已通过的手动 / browser-backed / 真机 smoke：
  - Web pre-send / streaming / completed：
    - `tmp/web-smoke-pre-send-final.png`
    - `tmp/web-smoke-streaming.png`
    - `tmp/web-smoke-short-final.png`
    - `tmp/web-smoke-short-latest.png`
  - Android deterministic / post-send clean：
    - `tmp/step6f-rerun/08_nonplan_sent_1s.xml`
    - `tmp/step6f-rerun/09_nonplan_sent_4s.xml`
    - `tmp/step6f-postsend-clean/48g_before_send_clean2.xml`
    - `tmp/step6f-postsend-clean/49_sent_1s_clean2.xml`
    - `tmp/step6f-postsend-clean/50_sent_4s_clean2.xml`
    - `tmp/step6f-postsend-clean/52_final_userbubble_clean2.xml`
  - 关联风险 smoke（双 cwd / A-B 切换 / same-session re-entry）：
    - Session A：`9fdff741-c636-43a5-b579-94684a0dc41e`
    - Session B：`dac2c014-8bc8-4bfc-8b51-b72d65628d40`
    - Thread A：`019e0dc0-d40d-7b61-a704-bfe134ca7888`
    - Thread B：`019e0dc1-62f7-7a32-85be-169e33933082`
    - 结果：A/B 各自恢复独立历史，切换时不串旧 thread/log，`/api/sessions` 摘要中的 `lastCodexThreadId` 也保持隔离

## 发布后验证证据

- Release mode: none
- Deploy source: none
- Target environment: local / Android debug / browser-backed local smoke
- Health checks:
  - Node tests
  - Android JVM unit tests
  - Web browser-backed smoke
  - Android real-device smoke
  - Session/thread risk smoke via `/api/sessions` + Web client re-entry
- Canary window: none
- Performance baseline: none
- Rollback / recovery:
  - 回滚本任务涉及的 Web Codex composer / message rendering 改动
  - 回滚 Android Codex UI / ViewModel / metadata 改动
  - 回滚本任务相关测试与 workflow 文档同步
- Release evidence: not applicable
- canary result: not applicable
- performance baseline result: not applicable
- rollback status: not exercised
- remaining observation:
  - standalone `codex_client.html` 做 browser smoke 前，必须确认 runtime config 已注入 `serverUrl/sessionId`，否则页面会出现“看似 ready、实际无 WS”的假在线状态
  - 华为真机 adb smoke 必须按当前 `EditText.bounds` 点击，不能复用键盘区固定低位坐标

## Lessons 回写

- 已写入 `docs/workflow/LESSONS.md`：
  - standalone Web Codex client 缺 `serverUrl/sessionId` 注入时，需优先用 `__applyTerminalConfig(...)` 建立真实连接再做 smoke
  - 华为真机 adb / UIAutomator 在键盘弹起后必须按 `EditText.bounds` 点击，避免误把脏字符注入 skill token

## 后续关联

- 推荐下一轮候选任务：
  - 补任务 `20260504-001` 的完整 Android smoke 收尾与归档判断
  - 隔离 `node --test` full suite 挂起的具体测试点
  - 明确 Android release config 应通过环境覆写还是仓库默认值满足 release check
- 相关归档入口：
  - `TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md`
  - `TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md`
