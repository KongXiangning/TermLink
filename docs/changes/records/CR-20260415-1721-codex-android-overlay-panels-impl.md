---
title: Codex Android 任务历史、运行态与工具窗口 overlay 化实现
status: draft
record_id: CR-20260415-1721-codex-android-overlay-panels-impl
req_id: REQ-20260408-codex-native-android-migration
commit_ref: 545b2f7c95888f2809e82bf69b5655393faa8ac4
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md, docs/changes/records/INDEX.md]
---

# CR-20260415-1721-codex-android-overlay-panels-impl

## 1. 变更意图（Compact Summary）

- 背景：任务历史、运行态、Notices 与扩展工具面板原先直接插在主 `Column` 中，会挤压主消息区与输入区高度；但这些面板的视觉样式、宽度和位置本身已经可接受。
- 目标：把 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.7` 落到代码，只改成“压在主窗口上的 overlay 层”，不改面板自身布局和样式。
- 本次边界：本批只调整 `CodexScreen` 的渲染层级与容器位置，不修改各面板内部 UI token、按钮文案或交互入口。

## 2. 实施内容（What changed）

1. 把 `ThreadHistorySheet`、`RuntimePanelSheet`、`NoticesPanelSheet` 与 `ToolsPanelSheet` 从主 `Column` 中移出，不再占用 header 下方的正常流式布局高度。
2. 在消息区 `Box` 上层新增 overlay 渲染列，沿用原有 `widthIn(max = 960.dp)`、各 panel 自身 `fillMaxWidth + padding(horizontal = 12.dp, vertical = 8.dp)` 的尺寸和位置口径。
3. 继续保留现有全屏点击遮罩关闭行为，因此主窗口被遮挡时仍可点空白处关闭面板，但主消息区不会再因为面板打开而被压缩。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 模块：原生 Codex 次级面板容器层级。
- 运行时行为：历史/运行态/Notices/工具面板现在覆盖在主窗口之上，不再挤压主消息区与输入区高度。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 Codex panel 层级改动
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; $env:Path="$env:JAVA_HOME\bin;$env:Path"; Push-Location ./android; try { ./gradlew.bat :app:testDebugUnitTest --console=plain } finally { Pop-Location }`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260415-1721-codex-android-overlay-panels-impl.md -Strict`
- 真机验证：`tmp/device-validate/thread-history.png`、`tmp/device-validate/runtime-overlay-retry.png`、`tmp/device-validate/tools-overlay-retry.png` 显示历史/运行态/扩展工具均叠加在主窗口上方，底部导航、输入框与模型栏位置保持不变。
- 结果：Android 单测任务通过；本批覆盖计划项：`PLAN-20260415-codex-android-menu-context-autoscroll-freeze` 的 `2.7`。

## 6. 后续修改入口（How to continue）

- 若后续还要调这些 panel 的宽度、贴边距离或进入/退出动画，应继续从 `CodexScreen.kt` 的 overlay 容器入手，而不是把它们再塞回主 `Column`。
- 如果未来要给 overlay 增加 dimming/backdrop 视觉层，也应保持当前“只改层级、不改面板内部布局”的边界分离。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前 overlay 保持原有定位与样式，因此不会自动获得 modal 动画或额外阴影；若后续想增加更强的层级感，应单独开批处理。
2. 这些 panel 仍允许同时处于可见状态的组合路径；当前实现是把它们整体搬进 overlay 容器，而不是重新定义互斥状态机。
