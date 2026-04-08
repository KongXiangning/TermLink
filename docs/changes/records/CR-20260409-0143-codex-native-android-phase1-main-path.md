---
title: Phase 1 — Codex 原生 Android 聊天主链路收口
status: active
record_id: CR-20260409-0143-codex-native-android-phase1-main-path
req_id: REQ-20260408-codex-native-android-migration
commit_ref: a1e2069
owner: @maintainer
last_updated: 2026-04-09
source_of_truth: product
related_code: [android/app/src/main/AndroidManifest.xml, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml, android/app/src/main/res/xml/shortcuts.xml]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/architecture/ARCH-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260409-0143-codex-native-android-phase1-main-path

## 1. 变更意图（Compact Summary）

- 背景：Phase 0 已完成新入口基础设施，但 `CodexActivity` 还未达到可独立完成单轮对话的产品验收标准。
- 目标：按 `PLAN-20260408-codex-native-android-migration` 的 Phase 1，补齐原生聊天主链路、线程绑定、恢复闭环、错误态与真机验证。
- 本次边界：只覆盖原生 `CodexActivity` 主链路，不修改现有 `MainShellActivity + WebView Codex` 稳定路径。

## 2. 实施内容（What changed）

本批覆盖计划项：`PLAN-20260408-codex-native-android-migration` §3.2 Phase 1 第 1-5 项。

1. **入口与会话**：新增 Android 静态 shortcut，`CodexActivity` 支持从 Intent / SharedPreferences / active profile 恢复上下文；在无 `sessionId` 时自动创建 `sessionMode=codex` 会话，并为 `cwd` 增加恢复与兜底链路。
2. **原生主界面**：重写 `CodexScreen`，补齐顶部状态区、消息列表、底部输入区与基础信息区；新增角色标签、状态点、错误 banner、线程 badge、新任务按钮、Enter/Shift+Enter 行为与流式状态展示。
3. **协议与状态修正**：对齐 gateway 契约，把 `codex_turn.prompt` 更正为 `codex_turn.text`；修正 `codex_notification` 解析为 `{ method, params }`，并消费 `thread/*`、`turn/*`、`item/*` 主链路通知。
4. **线程与恢复**：补齐 `threadId` / `cwd` 持久化、`"null"` 字符串归一化、新线程重置、后台恢复与错误清理逻辑，确保冷启动和重连后状态一致。
5. **真机验证收口**：完成本机 `codex exec`、原始 `codex app-server`、TermLink 本地 WebSocket smoke 与 Android 真机验证；最终在设备 `MQS7N19402011743` 上确认 `hi -> Hi.` 单轮对话闭环成立。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：原生 Codex 入口的 Activity / ViewModel / Compose UI / wire models / strings / manifest / shortcuts。
- 模块：`com.termlink.app.codex` 原生聊天入口、会话创建与恢复链路、Android Codex WebSocket 消息消费。
- 运行时：新增原生 Codex 实验入口可独立完成单轮对话；旧 `MainShellActivity + WebView Codex` 路径保持不变。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 Phase 1 关键文件
git checkout <commit_ref>^ -- \
  android/app/src/main/AndroidManifest.xml \
  android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt \
  android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt \
  android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt \
  android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt \
  android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt \
  android/app/src/main/res/values/strings.xml \
  android/app/src/main/res/values-zh/strings.xml \
  android/app/src/main/res/xml/shortcuts.xml \
  docs/product/plans/PLAN-20260408-codex-native-android-migration.md \
  docs/product/requirements/REQ-20260408-codex-native-android-migration.md \
  docs/changes/records/CR-20260409-0143-codex-native-android-phase1-main-path.md \
  docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- Android 构建：`powershell -ExecutionPolicy Bypass -File .\\skills\\android-local-build-debug\\scripts\\build-debug-apk.ps1`
- 真机安装/启动：`install-debug-apk.ps1 -Serial MQS7N19402011743`、`launch-termlink.ps1 -Serial MQS7N19402011743`、`adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity`
- 运行时对照：`codex exec -C E:\\coding\\TermLink -c approval_policy=\"never\" -s workspace-write --json \"Reply with exactly: hi\"`
- app-server 原始通知抓取：直接请求 `thread/start` / `turn/start`，确认存在 `item/started -> item/agentMessage/delta -> item/completed`
- TermLink WebSocket smoke：本地 `ws://127.0.0.1:3010/?sessionId=...` 实测收到完整 `codex_notification item/*`
- 真机结果：adb 注入 `hi` 后，设备 UI dump 与截图均确认助手消息 `Hi.` 已渲染；logcat 同时确认 Android 端已处理 `item/started -> delta -> completed`

## 6. 后续修改入口（How to continue）

- Phase 2 从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`
  - `public/terminal_client.js`
  - `src/ws/terminalGateway.js`
- 若后续替代本记录，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前只完成原生聊天主链路；slash、`@mention`、审批、计划模式、线程历史、运行态面板等仍在 Phase 2 范围内。
2. 旧 `MainShellActivity + WebView Codex` 入口仍是稳定路径；在 Phase 3/4 前不得把默认入口切到原生实现。
