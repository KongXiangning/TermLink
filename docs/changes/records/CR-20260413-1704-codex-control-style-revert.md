---
title: Codex Android control style revert
status: draft
record_id: CR-20260413-1704-codex-control-style-revert
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260413-1704-codex-control-style-revert

## 1. 变更意图（Compact Summary）

- 背景：当前原生 Codex 输入/选择控制区字号和胶囊样式偏大，用户要求先把输入框、`任务历史 / 运行态 / 扩展工具`、以及底部 footer 排布恢复到上一版紧凑样式：`+ /` 在左、`模型 / 推理 / 沙盒` 紧跟其后、背景信息百分比圆固定在最右。
- 目标：把控制区视觉实现收回旧版的轻量文字风格和更小字号，同时不改变任何交互逻辑、配置状态或 provider 行为。
- 本次边界：只调整 `CodexScreen.kt` 内的输入与 footer/navigation 控件样式；不改消息流、运行态逻辑、审批/输入协议，也不触碰 item 13 的 upstream/provider 阻塞结论。

## 2. 实施内容（What changed）

1. 将 `SecondaryNavRow` / `SecondaryNavButton` 从左侧大号胶囊组改回旧版右对齐轻量文字式次级导航，让 `任务历史 / 运行态 / 扩展工具` 恢复原先的靠右排列与紧凑字号。
2. 将 `FooterControls` 恢复为旧版单行骨架：左侧使用 `+` 与 `/` 作为图片/命令入口，中间紧跟 `模型 / 推理 / 沙盒` quick setting，最右保留背景信息百分比圆；`计划模式` 仅在激活时以内联小 chip 插入，而不是常驻大按钮。
3. 将 `InputComposer` 恢复为旧版扁平窄边框样式，缩小输入区内边距、占位文字和发送/中断按钮尺寸，并在真机 `MQS7N19402011743` 上通过全量重装后的截图确认最终落屏。

本批覆盖计划项：

1. `13. blocked：Phase 4 follow-up stability / plan UX / runtime readability repairs`
2. `9. in_progress：输入/选择控制区旧样式回退（本地 UI 收口，不改变 upstream/provider 阻塞项）`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/changes/records/INDEX.md`
  - `docs/changes/records/CR-20260413-1704-codex-control-style-revert.md`
- 模块：
  - Native Codex footer quick controls / secondary navigation / input composer 视觉样式
  - Phase 4 follow-up 文档状态跟踪
- 运行时行为：
  - 仅 UI 样式回退到上一版紧凑外观，交互语义与状态流不变。
  - `任务历史 / 运行态 / 扩展工具` 重新靠右排列。
  - footer 改回单行旧布局：`+ / | 模型 / 推理 / 沙盒 | 百分比圆`。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批相关文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260413-1704-codex-control-style-revert.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
  - `Set-Location .\\android; $env:JAVA_HOME='D:\\ProgramCode\\openjdk\\jdk-21'; .\\gradlew.bat app:assembleDebug`
  - `adb -s MQS7N19402011743 uninstall com.termlink.app`
  - `adb -s MQS7N19402011743 install E:\\coding\\TermLink\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk`
  - `adb -s MQS7N19402011743 shell am start -n com.termlink.app/.codex.CodexActivity`
  - `adb -s MQS7N19402011743 shell screencap -p /sdcard/Download/codex_control_style_revert_v5.png`
- 结果：
  - REQ 校验已通过。
  - Android debug APK 已成功编译。
  - 真机 `MQS7N19402011743` 已重新安装并启动最新包。
  - 最新截图 `tmp/codex_control_style_revert_v5.png` 与对应 UI dump 已确认输入框、右对齐次级导航，以及单行 `+ / | quick settings | 百分比圆` footer 均已回到旧版布局。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
- 若继续做新设计，建议以当前紧凑基线为起点，只做局部视觉强化，不再把 footer actions/quick settings 恢复成大胶囊，也不要打破 `+ / -> quick settings -> 百分比圆` 这条旧版信息顺序。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 本批只回退控制区视觉尺寸；若后续继续缩小，应注意不要把 footer 按钮的可点击区域压得过小。
2. item 13 的审批与 choice-based input 仍然是 upstream/provider 阻塞，本批截图只能证明端上样式回退完成，不能改变那两个阻塞结论。
