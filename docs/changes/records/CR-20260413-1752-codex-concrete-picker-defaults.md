---
title: Codex concrete picker defaults
status: draft
record_id: CR-20260413-1752-codex-concrete-picker-defaults
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260413-1752-codex-concrete-picker-defaults

## 1. 变更意图（Compact Summary）

- 背景：当前 footer quick settings 中模型和沙盒仍会出现 `默认 / 会话默认` 这类非具体占位，且模型列表只有点开 picker 时才请求，导致 footer 首屏无法立即回显具体 model。
- 目标：把 model list 改为连接后预加载，并让模型/沙盒 footer 与 picker 都直接指向具体配置项，而不是抽象默认占位；必要时沿用当前已解析出的具体值或已预加载到的首个可用模型。
- 本次边界：只调整 Android 原生 Codex 的 model/sandbox 配置解析与 picker 展示逻辑，不改 provider 能力、协议结构或其他 footer 布局。

## 2. 实施内容（What changed）

1. 在 `CodexViewModel.kt` 中把 `maybeRequestModelList()` 从“只在点开 model picker 时触发”扩展到连接期：收到 `codex_capabilities` 与后续 `codex_state` 时都会尝试预加载 model list，避免首屏 footer 还停在空模型状态。
2. 在 `handleModelListResponse(...)` 中，当服务端没有直接下发 `defaultModel` 时，使用首个可用模型填充本地 `state.model`，这样 footer 能立即回显具体 model，而不是继续显示 `默认`。
3. 在 `CodexScreen.kt` 中新增 concrete selection 解析逻辑，让 footer 和 model/sandbox picker 一律以具体配置项作为当前值；同时移除 model picker / sandbox picker 以及 footer dropdown 中的 `默认 / 会话默认` 选项。

本批覆盖计划项：

1. `13. blocked：Phase 4 follow-up stability / plan UX / runtime readability repairs`
2. `3.3-4 done：底部快捷配置继续收敛为具体 model / reasoning / sandbox 口径`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/changes/records/INDEX.md`
  - `docs/changes/records/CR-20260413-1752-codex-concrete-picker-defaults.md`
- 模块：
  - Native Codex model preload
  - footer quick settings / model picker / sandbox picker 具体配置解析
- 运行时行为：
  - model list 会在连接完成后的稳定阶段主动预加载。
  - footer 首屏会优先显示具体 model 与具体 sandbox 档位，不再显示 `默认 / 会话默认`。
  - model picker / sandbox picker 中不再出现默认占位项。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批相关文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260413-1752-codex-concrete-picker-defaults.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
  - `Set-Location .\\android; $env:JAVA_HOME='D:\\ProgramCode\\openjdk\\jdk-21'; .\\gradlew.bat app:assembleDebug`
  - `adb -s MQS7N19402011743 install -r E:\\coding\\TermLink\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk`
  - `adb -s MQS7N19402011743 shell am force-stop com.termlink.app`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity`
  - `adb -s MQS7N19402011743 logcat -d | Select-String -Pattern 'Capabilities: models=|Loaded model list'`
- 结果：
  - REQ 校验已通过。
  - Android debug APK 已成功编译。
  - 真机日志已确认 `Capabilities: models=[]` 后继续收到 `Loaded model list: [gpt-5.4, gpt-5.4-mini, gpt-5.3-codex, gpt-5.2]`，说明 model preload 已在连接期落成。
  - 最新真机截图 `tmp/codex_concrete_picker_defaults_v2.png` 已显示 footer 中模型为具体 `gpt-5.4`，沙盒为具体 `可写+确认`，不再显示 `默认 / 会话默认`。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 若后续还要继续打磨 quick settings，可考虑把 reasoning 也进一步与 provider 实际有效值更紧地绑定，但保持“只显示具体配置项”这一口径不变。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当 provider 未直接给出 `defaultModel` 时，本地会先采用已预加载列表中的首个模型作为 UI 基线；若未来服务端明确提供了更强的默认值来源，应优先改用服务端口径。
2. 本批只消除 UI/选择器层的默认占位，不改变 upstream/provider 对审批或 choice-based input 的阻塞结论。
