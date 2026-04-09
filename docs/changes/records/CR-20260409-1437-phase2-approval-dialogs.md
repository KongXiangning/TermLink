---
title: Codex 原生 Android Phase 2 审批对话框与用户输入请求
status: draft
record_id: CR-20260409-1437-phase2-approval-dialogs
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-09
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260409-1437-phase2-approval-dialogs

## 1. 变更意图（Compact Summary）

- 背景：`REQ-20260408-codex-native-android-migration` 继续推进 Phase 2 功能对齐，原生 Codex 需要补齐 Web 版已有的命令审批与用户输入请求交互。
- 目标：在不触碰旧 `MainShellActivity + WebView Codex` 路径的前提下，为原生 `CodexActivity` 打通 `codex_server_request` 的解析、阻塞式审批弹框、用户输入请求弹框与响应回传。
- 本次边界：仅覆盖原生 Codex 路径下的审批 / 用户输入请求协议、状态与 Compose UI；线程历史、运行态面板、图片输入等其他 Phase 2 项仍未实现。

本批覆盖计划项：`3.3-3`（命令审批对话框、用户输入请求对话框）。

## 2. 实施内容（What changed）

1. 原生 wire/state 层补齐审批协议：`CodexState` 现在解析 `approvalPending`、`pendingServerRequestCount`、`pendingServerRequests`，并新增 `CodexServerRequest*` 数据模型；`codex_server_request_response` 已改为按网关约定发送 `result / error / useDefault`，不再使用旧的 `approved / response` 结构。
2. `CodexViewModel` 与 `CodexUiState` 新增待处理服务端请求状态：既处理实时 `codex_server_request`，也处理 `codex_state` 快照中带回的挂起请求；同时按请求方法映射命令 / 文件 / 补丁审批结果，以及用户输入请求的 `answers` / `error` 负载。
3. `CodexScreen` 与 `CodexActivity` 已接入阻塞式审批对话框和用户输入请求对话框，支持命令内容展示、选项回答、自由输入回答、取消回传，以及双语文案；同时新增 debug-only 手工注入入口，可在原生页直接注入命令 / 文件 / 补丁 / 用户输入样例请求。
4. 最新真机联调进一步补齐链路定位：Android 原生页在选择 `workspace-write` 后，实际发送的 `codex_turn` 已携带沙盒 override；gateway 日志也确认本次线程使用的是 `approvalPolicy=on-request + sandboxMode=workspace-write`。在此前提下，provider 仍直接执行了 `apply_patch` 文件创建流程，未向客户端下发真实 `codex_server_request`。
5. 基于本次对 Web / gateway / Android 的协议比对，当前已确认审批链路本身的 turn / response 契约已对齐；但 `nextTurnEffectiveCodexConfig` 的本地合成状态、非 `client-handled` 请求的用户可见反馈、图片输入 `images -> attachments` 协议以及更多计划 / 运行态通知消费仍未在原生端完全补齐。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`CodexActivity.kt`、`CodexViewModel.kt`、`CodexWireModels.kt`、`CodexModels.kt`、`CodexScreen.kt`、`values/strings.xml`、`values-zh/strings.xml`
- 模块：原生 Codex WebSocket 协议解析、原生会话状态机、Compose 阻塞式弹框交互
- 运行时行为：当服务端下发 `handledBy=client` 的审批 / 输入请求时，移动端会阻塞展示审批对话框或输入对话框，并向网关回传与 Web 版一致的 `result` 或 `error` 结构；在 debug build 中，也可手工注入样例请求验证 UI 和回传映射

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复原生 Codex 审批 / 输入请求相关文件
git checkout <commit_ref>^ -- \
  android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt \
  android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt \
  android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt \
  android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt \
  android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `cd android && .\gradlew.bat :app:assembleDebug`
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\launch-termlink.ps1 -Serial MQS7N19402011743`
- 结果：
  - Android debug APK 编译通过，原生 Codex 页面可正常启动。
  - 真机 `MQS7N19402011743` 上再次验证时，Android 日志确认原生端发送了 `sandbox=workspace-write` 的 `codex_turn`；server `logs/dev-server.log` 也确认 gateway 为该会话建立了 `approvalPolicy=on-request + sandboxMode=workspace-write` 的线程。
  - 在上述前提下，真实 `apply_patch` 文件创建请求仍被 provider 直接执行，当前环境依然未观测到 `handledBy=client` 的 `codex_server_request`；另一次“先问我问题”尝试则被模型直接回复为普通文本。
  - debug build 中已通过“审批调试”入口手工注入命令审批样例与纯自由输入样例；真机 `MQS7N19402011743` 上可见阻塞式弹框，并能在提交后生成模拟 `result` 负载，确认本地 UI 与回传映射有效。
  - 当前可确认的是：审批协议已与网关契约对齐，Android -> gateway 的 `workspace-write -> on-request` 联动也已成立，原生 UI 已接线且不影响现有会话主链路；真实服务端联调仍需在可实际下发 client-handled request 的 provider / 后端环境下补齐。
  - 更广义的协议盘点已同步到 `PLAN`：当前审批 turn / response 契约已对齐，但 `nextTurnEffectiveCodexConfig`、非 `client-handled` 请求反馈、图片输入附件字段以及更多计划 / 运行态通知消费仍属于原生侧后续差异项。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`、`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`、`android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 真机最终验证仍依赖服务端 / provider 实际下发 `handledBy=client` 的 `codex_server_request`；目前已确认 Android 与 gateway 侧配置都能进入 `workspace-write + on-request`，但当前 provider 仍偏向自动执行或直接文本回复，因此新增的 debug 注入入口只解决本地 UI 验证，不替代真实服务端联调。
2. 当前移动端用户输入请求支持“选项题”“自由输入题”以及两者混合；如果服务端后续引入既无选项也不允许自由输入的新题型，客户端会显式展示不支持提示，而不是静默吞掉请求。
