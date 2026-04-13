---
title: Codex Android message split layout follow-up
status: draft
record_id: CR-20260413-1556-codex-message-split-layout
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260413-1556-codex-message-split-layout

## 1. 变更意图（Compact Summary）

- 背景：`PLAN 5.12-11` 要求原生 Codex 聊天主窗口不再让用户/助手消息都占满整行，而要收敛为明显的左右分栏与角色层级差异。
- 目标：将 `MessageBubble` 改成角色感知布局，让用户消息右对齐、助手消息左对齐，并保持 `SYSTEM / TOOL / ERROR` 的整行展示不受影响。
- 本次边界：只覆盖原生 Android 消息气泡布局与对应 `PLAN + CR index` 同步；不重开 `5.12-8` 的 upstream/provider 阻塞项，也不处理当前 live turn 卡住本身。

## 2. 实施内容（What changed）

1. 在 `CodexScreen.kt` 中新增角色布局抽象，把消息样式拆成颜色 spec 与布局 spec 两层，避免继续让所有消息共用整行容器。
2. 用户消息改为右侧窄气泡、尾部圆角朝右；助手消息改为左侧窄气泡、尾部圆角朝左，并同步把流式状态行也按同一侧对齐。
3. `SYSTEM / TOOL / ERROR` 继续保留整行样式，确保 runtime/debug/错误类消息不被误收窄；随后把 `PLAN 5.12-11` 与 CR 索引同步到完成状态。

本批覆盖计划项：

1. `9. in_progress：稳定性与信息架构修复 follow-up 第一批实现 / 验证`
2. `5.12-11 done：主聊天窗口用户/助手消息左右分栏收口`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/changes/records/INDEX.md`
- 模块：
  - Native Codex 聊天消息气泡布局
  - Native Codex 流式消息状态行对齐
- 运行时行为：
  - 用户消息现在以右对齐窄气泡显示，助手消息以左对齐窄气泡显示，主聊天流的角色分层更接近 Web 端阅读习惯。
  - 系统、工具与错误消息仍保持整行展示，不影响运行态说明、debug 注入样例和错误告警的可读性。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批相关文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260413-1556-codex-message-split-layout.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/build-debug-apk.ps1`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/launch-termlink.ps1 -Serial MQS7N19402011743`
  - 真机 `uiautomator dump + screencap`：发送最短 prompt 后抓取消息区域 bounds
  - 代码复核：`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 结果：
  - Debug APK 已重新编译、安装并拉起到 `MQS7N19402011743`。
  - 真机本轮已抓到新的用户消息气泡：标签与容器 bounds 均落在右侧窄列，而非旧的整行占满形态。
  - 当前 live turn 随后被“任务可能卡住了”告警打断，因此未补到同轮助手回复截图；但 `CodexScreen.kt` 中助手分支与用户分支共用同一套镜像 `BubbleLayoutSpec`，仅对齐方向与圆角方向相反，本地实现已完成。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
- 当前 `5.12` 本地 UI 收口已完成，后续若继续推进该 follow-up，主要剩余项为 `5.12-8` 的 upstream/provider 阻塞复核。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前真机证据直接落到用户右侧样式；助手左侧样式虽然与用户共用镜像布局分支，但若后续有人单独改动其中一侧 spec，仍需重新补抓双边样例。
2. 当前 live turn 停滞属于既有运行态问题，不应与本批消息布局实现混淆；后续若要补全“完美双气泡”截图，应先避开当前卡住线程或使用可稳定返回的样例线程。
