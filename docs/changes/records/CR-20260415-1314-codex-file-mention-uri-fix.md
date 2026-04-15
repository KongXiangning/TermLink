---
title: Codex Android 文件选择 mention URI 修复
status: active
record_id: CR-20260415-1314-codex-file-mention-uri-fix
req_id: REQ-20260408-codex-native-android-migration
commit_ref: 183e9f3d4709a8cd45c8dd299cbc57958f44fc84
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md, docs/changes/records/INDEX.md]
---

# CR-20260415-1314-codex-file-mention-uri-fix

## 1. 变更意图（Compact Summary）

- 背景：在对当前 Android Codex worktree 做提交前代码审查时，发现 `CodexActivity` 的文档选择链路会把非图片文件的 `Uri` 丢掉，最终把 `label` 同时写进 `FileMention.label/path`，导致 mention `path` 失真。
- 目标：让本地文档选择生成的非图片 file mention 保留真实 `uri`，避免后续 prompt 构造、去重或服务端文件引用只能拿到显示名。
- 本次边界：本批是 `PLAN-20260415-codex-android-menu-context-autoscroll-freeze` `§2.1 /mention` 的 review follow-up，只修复文档选择后的 mention `path` 保留逻辑，不改其他 slash/menu 或消息区交互。

## 2. 实施内容（What changed）

1. `SelectedDocument.FileReference` 新增 `uri` 字段，保留 `OpenDocument` 返回的原始 `Uri` 字符串。
2. `readSelectedDocument()` 在非图片文件路径下返回 `label + uri`，不再只返回显示名。
3. `handlePickedDocument()` 创建 `FileMention` 时改用 `selection.uri` 作为 `path`，避免把 `label` 误当成可引用路径。

本批覆盖计划项：`PLAN-20260415-codex-android-menu-context-autoscroll-freeze` §`2.1 Slash 菜单与底部 /` 中 `/mention -> 文件提及搜索` 的 review follow-up。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
- 模块：Android 原生 Codex 本地文档选择、file mention 构造、prompt mention 路径传递。
- 运行时行为：通过系统文档选择器加入的非图片文件 mention，现在会保留真实 `uri` 作为 `path`；后续去重、展示外的底层引用不再退化成仅有显示名。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批 mention URI 修复与文档
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260415-codex-android-menu-context-autoscroll-freeze.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260415-1314-codex-file-mention-uri-fix.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`cd android && set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:testDebugUnitTest --console=plain`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
- 审查来源：提交前 code review 明确指出 `FileMention.path` 被误写成显示名而非 `Uri`。
- 结果：REQ 校验通过；Android 单测在本机 JDK 21 下通过；当前 review 阻断项已在代码层修复。

## 6. 后续修改入口（How to continue）

- 如果后续要让本地文档 mention 支持更丰富的显示路径，可继续扩展 `FileMention.fsPath` 或 `relativePathWithoutFileName`，但底层 `path` 必须继续保持真实可引用标识，不能再退回显示名。
- 若未来引入 SAF 文档持久授权，也应继续从 `SelectedDocument.FileReference` 这条链路向下传递 `uri`，不要重新在 UI 层截断。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前修复只保证 mention `path` 保留 `uri`；如果下游某处仍假设 `path` 一定是普通文件系统路径，后续可能需要针对 `content://` 做更完整适配。
2. 这个问题是在 review 阶段才暴露出来的，说明本地文档选择与 mention 拼装仍缺少直接测试；后续若再改动附件/mention 合流逻辑，应优先补回归覆盖。
