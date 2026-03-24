---
title: REQ-20260318-ws-0001-docs-exp - Web Workspace 与 Android 集成实现
status: active
record_id: CR-20260324-0032-workspace-phase3-android
req_id: REQ-20260318-ws-0001-docs-exp
commit_ref: 22893d5
owner: @maintainer
last_updated: 2026-03-24
source_of_truth: product
related_code: [public/workspace.html, public/workspace.js, public/workspace.css, android/app/src/main/AndroidManifest.xml, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt, android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt, android/app/src/main/java/com/termlink/app/data/SessionApiModels.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/main/res/layout/activity_main_shell.xml, android/app/src/main/res/layout/activity_workspace.xml, android/app/src/main/res/layout/dialog_session_create.xml, android/app/src/main/res/layout/dialog_workspace_picker.xml, android/app/src/main/res/values/strings.xml, src/services/workspaceFileService.js, tests/workspace.routes.test.js, tests/workspace.web.test.js]
related_docs: [docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md, docs/product/plans/PLAN-20260318-WS-0001-phase2-web-workspace-impl.md, docs/product/plans/PLAN-20260318-WS-0001-phase3-android-workspace-impl.md, docs/architecture/ARCH-WS-0001-workspace-browser.md, docs/changes/records/INDEX.md]
---

# CR-20260324-0032-workspace-phase3-android

## 1. 变更意图（Compact Summary）

- 背景：REQ-WS-0001 的 Phase 1 服务端能力已完成，但独立 Web Workspace 页面和 Android 入口仍未落地，用户无法在真实会话中使用完整工作区流。
- 目标：交付可由 Android WebView 承载的独立 Workspace 页面，并把 Android Create Session 目录选择器、Workspace 入口和 `WorkspaceActivity` 接到现有 Codex 会话主链路。
- 本次边界：覆盖 Phase 2 Web 页面与 Phase 3 Android 集成；不重新定义 Workspace 服务端边界，但补充少量配套服务端测试和查看能力修正。

## 2. 实施内容（What changed）

1. 新增 `public/workspace.html/js/css`，实现独立 Workspace 页面、目录浏览、文件内容查看、Diff 切换、大文件模式展示和错误/空状态处理。
2. Android 新增 `WorkspaceActivity`、MainShell Workspace 入口、创建会话目录选择器对话框及相关布局/字符串资源，并通过现有 WebView 注入 `sessionId + serverUrl + authHeader` 承载 Workspace 页面。
3. `SessionApiClient`、`SessionApiModels`、`SessionsFragment` 接入服务端 picker 浏览与路径回填，创建 Codex 会话时保留手输路径并支持 Browse 辅助。
4. `workspaceFileService.js` 与 `tests/workspace.routes.test.js`、`tests/workspace.web.test.js` 补充页面接入所需的查看模式和验收覆盖，确保 Web/Android 集成不绕开既有 Workspace 边界。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：见 `related_code`
- 模块：Web Workspace 页面、Android Codex 会话入口与目录选择器、Workspace 文件查看兼容层
- 运行时行为：Codex 会话可打开独立 Workspace 页面；Android 创建会话可浏览服务端目录并回填路径；移动端可直接浏览文件、查看内容和 Diff

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 Web + Android Workspace 集成
git checkout <commit_ref>^ -- public/workspace.html public/workspace.js public/workspace.css
git checkout <commit_ref>^ -- android/app/src/main/AndroidManifest.xml
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/data/SessionApiModels.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
git checkout <commit_ref>^ -- android/app/src/main/res/layout/activity_main_shell.xml
git checkout <commit_ref>^ -- android/app/src/main/res/layout/activity_workspace.xml
git checkout <commit_ref>^ -- android/app/src/main/res/layout/dialog_session_create.xml
git checkout <commit_ref>^ -- android/app/src/main/res/layout/dialog_workspace_picker.xml
git checkout <commit_ref>^ -- android/app/src/main/res/values/strings.xml
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`node --test tests/workspace.routes.test.js`
- 校验命令：`node --test tests/workspace.web.test.js`
- 结果：服务端 Workspace 路由和 Web 页面集成测试通过；Android 侧变更依赖真机或本地构建链进一步复验

## 6. 后续修改入口（How to continue）

- 下次若继续改 Workspace 页面，优先从 `public/workspace.js`、`public/workspace.css`、`tests/workspace.web.test.js` 继续
- 下次若继续改 Android 集成，优先从 `android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt`、`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`、`docs/product/plans/PLAN-20260318-WS-0001-phase3-android-workspace-impl.md` 继续

## 7. 风险与注意事项

1. 本提交同时承载了 Phase 2 Web 页面与 Phase 3 Android 集成，后续若继续拆分优化，建议新增独立 CR，避免继续把多个阶段混在同一条实现记录里。
2. Android 侧最终可用性仍依赖 WebView 注入和真机行为；若后续出现会话切换、认证头或生命周期问题，应优先补真机验证记录。
