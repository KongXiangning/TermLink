# TASK ARCHIVE

## 任务元数据

- Task ID：20260726-002
- Task title：Android / 服务端持久诊断日志与问题取证
- Task slug：persistent-diagnostics-for-known-issues
- Task start base：052c8f3
- Final commit：e9f2a6e
- Final status：completed

## 原始任务目标

- 为 Android、WebView 与 Node 服务端增加跨 APK 更新保留的结构化持久诊断日志。
- 覆盖当时记录的九类问题入口、状态、异常与恢复证据，不改变业务逻辑或 Codex IPC authority。
- 提供 ADB/服务端采集脚本，生成 manifest、原始日志与合并 timeline。

## 实际改动摘要

- Android Debug 默认启用私有 `files/diagnostics` JSONL 滚动日志，Release 由构建开关显式启用，总容量约 10MiB。
- 本地开发服务默认启用服务端 JSONL 滚动日志，生产由环境变量显式启用，总容量约 50MiB。
- 增加未捕获异常、主线程 watchdog、Activity/WS/Service 生命周期、Sessions、Codex IPC/owner 与通知等脱敏诊断事件。
- 增加统一采集脚本与开发调试指南；日志不记录 prompt、命令正文、终端输出、附件、认证材料或证书密码。

## 契约与决策

- HTTP、WebSocket、DTO、session 持久化和 Codex IPC follower/authority 均未改变。
- 新增内部 JSONL 观测格式与三个开关：`TERMLINK_DIAGNOSTICS_ENABLED`、`TERMLINK_DIAGNOSTICS_PATH`、`TERMLINK_ANDROID_DIAGNOSTICS_ENABLED`。
- 日志失败保持 fail-open，不得阻断业务。

## 验证与交付证据

- `node --check`、诊断 logger tests、IPC gateway targeted tests、Sessions capacity tests 通过。
- JDK 21 `:app:testDebugUnitTest` 与 `:app:assembleDebug` 通过。
- 使用 `adb install -r` 连续升级后，App 私有诊断文件和历史尾记录保持。
- 采集脚本 smoke 成功生成 `manifest.json`、原始日志和 `timeline.jsonl`。
- 全量 `npm test` 在 124 秒无输出后超时；已按既有 TD-004 窄门禁保留，不伪装为通过。

## 后续关联

- 临时问题记录继续位于 `tmp/codex-known-issues-20260726.md`。
- 后续业务修复可直接使用既有 Android/服务端持久诊断事件取证。
- 下一任务：`20260727-001` Windows Codex IPC-first / Owner-fallback 第一阶段修复。
