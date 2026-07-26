# CURRENT_TASK

## 任务信息

- 任务 ID：20260726-002
- 任务标题：Android / 服务端持久诊断日志与问题取证
- 任务 slug：persistent-diagnostics-for-known-issues
- 状态：completed_ready_for_closeout
- Task start base：052c8f3

## 背景与上下文

- 当前已记录 9 个 Android/Codex/服务端问题，涉及新建任务、模型/权限加载、审批、会话删除、启动性能、通知、终端滚动和锁屏恢复。
- Android 现有日志主要进入 Logcat，服务端主要使用 console/PM2 输出，均不适合跨 APK 升级长期取证。
- 本任务只增加结构化、脱敏、滚动持久日志和采集工具，不修复上述业务问题，不改变 Codex IPC 权威链路。

## 验收标准

1. Debug APK 默认启用 App 持久诊断日志；Release APK 通过 `TERMLINK_ANDROID_DIAGNOSTICS_ENABLED` 显式启用。
2. App 日志写入私有 `files/diagnostics`，滚动总容量约 10MiB；同签名 APK 使用 `adb install -r` 后旧记录仍存在。
3. 本地开发服务默认启用服务端诊断日志；生产环境通过 `TERMLINK_DIAGNOSTICS_ENABLED=true` 启用；滚动总容量约 50MiB。
4. 日志不包含 prompt、命令正文、终端输出、附件、认证头、ticket、密码、证书或原始协议负载。
5. 九个已知问题均有 App 或服务端的入口、请求、状态、响应、异常或恢复埋点；高频 IPC snapshot 采用状态签名去重。
6. App 未捕获异常、主线程长阻塞、Activity/WS/Service 生命周期均可持久记录。
7. 采集脚本可读取 Debug APK 私有日志、服务端日志，并生成原始文件、manifest 和按时间合并的 timeline；不清除源日志。
8. 诊断记录位置和事件名写入开发调试指南及临时问题记录。
9. HTTP、WebSocket、DTO、session 持久化、IPC follower/authority、权限实际行为和通知行为保持不变。

## 允许修改范围

- `android/app/src/main/java/com/termlink/app/TermLinkApplication.kt`
- `android/app/src/main/java/com/termlink/app/util/**`（仅诊断 logger / watchdog）
- `android/app/src/main/java/com/termlink/app/codex/**`（仅诊断埋点）
- `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
- `android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt`
- `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
- `android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt`
- `android/app/src/main/java/com/termlink/app/codex/network/**`（仅诊断埋点）
- `android/app/build.gradle`
- `src/services/diagnosticLog.js`
- `src/server.js`
- `src/routes/sessions.js`
- `src/services/sessionManager.js`
- `src/services/codexIpcFeed.js`
- `src/ws/terminalGateway.js`
- `public/terminal.js`
- `.env.example`
- `scripts/diagnostics/**`
- `docs/guides/development-debugging.md`
- `tmp/codex-known-issues-20260726.md`
- 同目录 Android JVM tests、`tests/diagnosticLog.test.js` 及必要的 Node targeted tests。

## 禁止修改范围

- 不修改 Codex IPC 数据流、authority/follower 语义、canonical id/binding、恢复策略或控制面行为。
- 不修改 HTTP/WebSocket/DTO/session 持久化协议，不新增日志下载 API。
- 不修改权限映射、模型/思考强度选择、审批执行、会话删除、通知显示、终端滚动或锁屏恢复逻辑。
- 不删除或替换现有 Logcat/console；持久日志仅作为额外观测通道。
- 不提交 `logs/**`、App 私有日志、`output/**` 或设备凭据。

## 条件放行文件

- `android/app/build.gradle`：仅增加诊断开关 BuildConfig。
- `src/server.js` 与 `src/ws/terminalGateway.js`：仅增加脱敏诊断事件，不改变分支、返回值或 wire envelope。
- `public/terminal.js`：仅增加一次手势结束事件的安全 console 标记，不记录终端内容。

## 受影响的契约

- 新增本地/服务端诊断日志文件格式，属于内部观测接口；JSONL 字段向后兼容，可追加字段。
- 新增环境/构建开关：`TERMLINK_DIAGNOSTICS_ENABLED`、`TERMLINK_DIAGNOSTICS_PATH`、`TERMLINK_ANDROID_DIAGNOSTICS_ENABLED`。
- 不新增 HTTP、WebSocket、DTO、session 或 Codex IPC 字段。
- 兼容策略：backward-compatible；日志写入失败不得阻断业务。

## 已确认决策

- Debug/local dev 默认开启；Release/production 显式开启。
- App 约 10MiB、服务端约 50MiB 滚动保留。
- 只记录安全元数据、ID、状态、耗时、计数和脱敏错误；不记录用户内容和认证材料。
- 通过 ADB 采集 Debug APK 私有文件；本轮不增加应用内导出界面。

## 待确认问题

- 无。

## 实现方案

1. 建立 Kotlin/Node 双端滚动 JSONL logger、脱敏器、运行实例标识、异常捕获和主线程 watchdog。
2. 按 9 个问题在 Android、WebView、服务端入口补充低频结构化事件，保留现有 Logcat/console。
3. 增加 ADB/服务器日志采集脚本，生成 manifest 和 timeline。
4. 更新调试指南和临时问题记录，运行 JVM/Node/Android/build/syntax/diff 回归。

## 审查问题队列

- [x] 持久 logger 的普通事件采用单线程异步写入；仅错误级崩溃证据同步 flush。
- [x] 敏感字段、ticket、认证头和用户内容经过字段/文本脱敏，不写入 JSONL。
- [x] IPC snapshot 埋点按状态签名去重，未改变 authority 或 follower 生命周期。
- [x] `adb install -r` 升级后日志仍可读取（真机 MQS7N19402011743 smoke）。

## 传播治理记录

- Change Propagation Check：已完成初步检查；新增 logger、env/build 开关、采集脚本和文档。
- `CONTRACTS.md`：不更新，不形成新的实时同步或业务协议边界。
- `DECISIONS.md`：不更新，启用范围与容量为本任务已确认实现决策。
- 需要回归：gateway/owner surface、Android Codex ViewModel/wire、Sessions、Node narrow gate。

## 实施步骤

- [completed] 1. 创建双端持久诊断基础设施和配置开关。
- [completed] 2. 增加 9 个问题的 App/WebView/服务端埋点。
- [completed] 3. 增加采集脚本、日志位置文档和临时问题映射。
- [completed] 4. 执行自动化、构建、升级保留和真机取证 smoke。

## 回归检查项

- `node --test tests/diagnosticLog.test.js tests/auditService.test.js`
- `node --check public/terminal.js src/services/diagnosticLog.js src/ws/terminalGateway.js`
- `$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; android\gradlew.bat :app:testDebugUnitTest`
- `$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; android\gradlew.bat :app:assembleDebug`
- `git diff --check`
- 现有 IPC/gateway/owner targeted tests。

> 剩余观察项：全量 `npm test` 在本机 124 秒无输出后超时；本轮已拆分并通过新增 logger、Sessions capacity、IPC gateway targeted tests，未发现本轮日志代码失败。

## 回滚点

- Task start base：052c8f3
- Last reviewed checkpoint：not-yet-created
- Current diff review target：working-tree + untracked files
- 回滚策略：移除诊断 logger、埋点、采集脚本和文档；不删除已有设备/服务器日志，保留取证证据。

## 执行记录

- 2026-07-26：归档已完成的 `20260726-001`，创建本任务。
- 2026-07-26：确认 Debug APK 与本地开发服务默认启用，Release/production 显式启用，标准滚动容量和脱敏边界。
- 2026-07-26：完成双端 JSONL logger、九类问题埋点、ADB/服务端采集脚本和事件映射文档。
- 2026-07-26：`node --check`、`tests/diagnosticLog.test.js`、IPC gateway targeted test、Sessions capacity test、`:app:testDebugUnitTest`、`:app:assembleDebug`、`git diff --check` 通过；Node 全量 `npm test` 在 124 秒无输出超时，需后续单独处理测试运行环境/长测试分组。
- 2026-07-26：使用 `adb install -r` 连续更新 Debug APK，App 私有诊断文件和历史尾记录保持；采集脚本 smoke 生成 `manifest.json`、原始日志与 `timeline.jsonl`。
