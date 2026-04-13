---
title: Codex Android stability / plan UX / runtime readability repairs batch 1
status: draft
record_id: CR-20260413-0832-codex-android-followup-doc-init
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/res/values/strings.xml, android/app/src/main/res/values-zh/strings.xml, src/ws/terminalGateway.js, tests/terminalGateway.codex.test.js]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260413-0832-codex-android-followup-doc-init

## 1. 变更意图（Compact Summary）

- 背景：原生 Codex 已切到默认入口，但 Phase 4 follow-up 仍残留 transient reconnect 错误噪音、计划模式正文重复展示、运行态 Diff/Reasoning 可读性不足，以及长线程 ID 挤压 header 的体验缺口。
- 目标：完成这组 follow-up 的第一批代码修复，优先收口 reconnect UX、计划正文信息架构、运行态摘要可读性与顶部 header 稳定性，并补齐 Android 本地图片 data URL 到 app-server `localImage.path` 的桥接缺口；同时修正端上沙盒 quick setting 对 session default / ask-mode 的歧义展示，并继续保留端上提权验证开放项。
- 本次边界：修改 Android 原生 Codex 客户端、gateway 临时文件桥接与对应 `PLAN + CR + CR index`；本轮只新增权限档位 UI 语义与真机证据，不宣称真实 client-handled 提权链路或 choice-based user-input 链路已经完成。

## 2. 实施内容（What changed）

1. 在 `CodexViewModel` 中补上发送成功判定：turn / 计划执行 / approval / user-input 仅在底层 `connectionManager.send(...)` 成功后才清理待发送状态或写入成功态 UI，同时移除 `sendTurnWithOverrides()` 中遗留的“发送前就先写入用户消息并清空附件”的旧逻辑，避免图片附件出现假提交。
2. 在 `CodexViewModel` 与 `CodexConnectionManager` 中收敛 reconnect UX：典型 transient socket 错误不再直接转成持久错误卡片，建连阶段异常优先进入重连调度，连接恢复后会清理这类短暂错误状态。
3. 在 `CodexViewModel` 与 `CodexScreen` 中重排计划模式信息架构：运行态 `Plan` 成为计划正文唯一主落点，composer workflow 区仅保留紧凑动作入口，执行确认计划后聊天流只留下简短执行语义。
4. 在 `CodexViewModel` 与 `CodexScreen` 中增强运行态可读性：`Diff` 增加文件级摘要预览，`Reasoning` 优先提取稳定文本摘要并过滤低价值结构化噪音，同时清理 ANSI 干扰。
5. 在 `CodexScreen` 与字符串资源中为长 `thread id` 增加本地化短标签，避免 header 直接展示完整线程标识造成挤压。
6. 在 gateway `terminalGateway.js` 中把 `localImage.url=data:...` 物化为服务端临时图片文件，并在 `turn/completed` / idle / fatal 清理这些临时文件，再把真正交给 app-server 的输入统一改成 `localImage.path`，补齐 Android 真机本地图片选择与桌面 app-server 之间的协议鸿沟。
7. 在 `tests/terminalGateway.codex.test.js` 中补充 data URL -> temp path -> turn 完成后清理的测试，并在 `PLAN` 与 `INDEX` 中更新本批覆盖边界。
8. 在 `CodexScreen` 与中英文字符串资源中把沙盒 quick setting 拆成“会话默认 / 工作区可写（需确认） / 只读（需确认） / 完全访问（不询问）”四档，并以 `nextTurnOverrides.sandbox` 驱动当前选择态；真机验证确认显式 `workspace-write` 会触发 gateway runtime restart，执行上下文切到 `approvalPolicy=on-request + sandboxMode=workspace-write`。后续 trace 进一步确认在手工关闭 Plan Mode 后，Android 会把 `interactionState.planMode=false` 正确同步到 gateway，随后的写文件 probe 也确实以 `collaborationMode=null` 发出。

本批阻塞项：

1. 端上提权 / 批准请求在本轮真机验证中仍未拿到真实 `handledBy=client` 请求样本；进一步的非 Plan Mode 真机 trace 已确认 `interactionState.planMode=false`、`collaborationMode=null`、`approvalPolicy=on-request` 与 `sandboxMode=workspace-write` 同时成立，但 provider 仍把文件写入审批退化为普通文本确认，因此不能宣称该链路已经完成实机闭环。本批已按 upstream/provider 阻塞口径收口该调查子项。
2. 计划模式下已不再复现 `request_user_input is unavailable in Default mode`，但最新真机探针中助手仅以文本声称会发出内置 `yes/no` 输入 UI，原生页实际只出现通用 `awaiting_user_input` 工作流卡片（`等待补充信息 / 继续规划前需要你的补充信息 / 取消`），仍未拿到带 `Yes / No` 选项的真实 client-handled 输入请求样本；本批同样按 upstream/provider 阻塞口径收口该调查子项。

本批覆盖计划项：

1. `13. blocked：Phase 4 follow-up stability / plan UX / runtime readability repairs`
2. `5.9 in_progress：稳定性与信息架构修复 follow-up 第一批实现 / 验证`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/res/values/strings.xml`
  - `android/app/src/main/res/values-zh/strings.xml`
  - `src/ws/terminalGateway.js`
  - `tests/terminalGateway.codex.test.js`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/changes/records/INDEX.md`
  - `docs/changes/records/CR-20260413-0832-codex-android-followup-doc-init.md`
- 模块：
  - Native Codex turn / plan / runtime 状态机
  - Native Codex 连接管理与 reconnect UX
  - Gateway 本地图片 data URL 桥接与临时文件清理
  - Phase 4 follow-up 文档追踪
- 运行时行为：
  - 原生 Codex 在 transient reconnect 场景下不再优先显示短暂 socket 错误卡片
  - 计划正文从聊天区 / composer workflow 区收敛到运行态 `Plan`
  - 运行态 `Diff` / `Reasoning` 会展示更可消费的摘要
  - 顶部线程元信息改为短标签，减少 header 视觉跳动
  - Android 选中的本地图片会先由 gateway 落到服务端临时文件，再以上游可接受的 `localImage.path` 形状进入 `turn/start`
   - Android 底部沙盒 quick setting 现可明确区分 session default 与 ask-mode 覆盖，并能在真机把下一轮执行上下文切到 `approvalPolicy=on-request`
   - Android 关闭 Plan Mode 后，`interactionState.planMode=false` 会正确同步到 gateway，随后的 non-plan 写文件 probe 也不会再携带 `collaborationMode`

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批相关文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- android/app/src/main/res/values/strings.xml
git checkout <commit_ref>^ -- android/app/src/main/res/values-zh/strings.xml
git checkout <commit_ref>^ -- src/ws/terminalGateway.js
git checkout <commit_ref>^ -- tests/terminalGateway.codex.test.js
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260413-0832-codex-android-followup-doc-init.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `node --test tests/terminalGateway.codex.test.js`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/build-debug-apk.ps1`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260413-0832-codex-android-followup-doc-init.md -Strict`
- 结果：
  - REQ 校验已通过。
  - `terminalGateway` 定向测试已通过，覆盖 `localImage` data URL 物化为临时 `path` 并在 turn 完成后清理的行为。
  - Debug APK 已重新编译成功，并已重新安装到真机 `MQS7N19402011743`。
  - Native `CodexActivity` 冷启动日志再次确认 `CodexWsClient` 发起连接并收到 `WebSocket opened`。
  - `HOME -> foreground -> CodexActivity` 的本轮日志检查中未再看到此前 `Broken pipe` / `WebSocket failure` / `Software caused connection abort` 一类 `CodexWsClient` 噪音；这批日志里可见的残余错误主要是 `MainShellActivity` 路径上的 `AndroidSecurityKeyStore` 暂态异常，不属于本批 native Codex reconnect 修复的目标面。
  - 真机已完成 `图片 -> 输入 https://example.com/image.png -> 添加图片 URL -> 发送` 验证：native Android 会把附件随 turn 送到上游，并收到 `invalid_request_error / invalid_value / Error while downloading ... / param=url / status 400` 的明确错误卡片，说明 URL 图片路径已具备真实上行与失败回显闭环。
  - 真机已完成 `图片 -> 选择本地图片 -> 发送` 正向验证：此前会触发 `missing field 'path'` 的本地截图路径，现在已成功驱动模型直接分析截图内容，UI 与 logcat 均未再出现该错误。
  - 真机已确认新的沙盒 quick setting 文案与选中态生效：底部现在明确展示“会话默认 / 可写+确认 / 只读 / 完全访问”，显式切到 `工作区可写（需确认）` 后，gateway 日志会出现 runtime restart，并把执行上下文更新为 `approvalPolicy=on-request + sandboxMode=workspace-write`。
   - 在上述 `on-request` 上下文中，真机发送 `run git status and ask for my approval before executing` 后，provider 仍返回普通文本 `是否现在运行 git status？请回复 Yes 或 No。`，未出现真实 `handledBy=client` 审批请求。
   - 后续再次以非 Plan Mode 真机发送 `create tmp/provider_approval_probe_trace.txt with content APPROVAL_PROBE and ask for approval before making file changes`，gateway trace 明确记录该 turn 为 `interactionState.planMode=false + collaborationMode=null + approvalPolicy=on-request + sandboxMode=workspace-write`，但最终仍只返回普通文本 `Awaiting your approval ...`，未生成真实 client-handled 审批请求。
  - 真机在启用计划模式后发送 `ask me one multiple choice question using the built in input ui with choices yes and no not plain text`，不再命中 `request_user_input is unavailable in Default mode`；但结果页中助手仅以文本回复“我会用内置输入 UI 发一个单选问题，选项只有 yes 和 no”，原生页实际只出现 `等待补充信息 / 继续规划前需要你的补充信息 / 取消` 工作流卡片，仍未拿到带选项按钮的真实 client-handled 输入请求样本；该输入链路现同样按 upstream/provider 阻塞处理。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `src/ws/terminalGateway.js`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 本批只关闭了 follow-up 13 的本地图片、稳定性 / 信息架构与权限档位可视化子问题，并进一步把提权链路剩余缺口收敛到 provider / upstream 行为；当前该调查子项已按 upstream/provider 阻塞处理。若后续直接把整个 plan 项标为 `done`，会掩盖端上提权验证尚未完成的事实。
2. 真机日志中额外暴露了 `MainShellActivity` 路径上的 `AndroidSecurityKeyStore` 暂态异常；它不影响本批原生 Codex reconnect 结论，但后续如继续出现后台恢复类投诉，需要与 Codex socket 问题分开追踪。
