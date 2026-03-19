---
title: Android External Web terminal POC - change record
status: draft
record_id: CR-20260224-1636-android-external-web-terminal-poc
req_id: REQ-20260224-android-external-web-terminal-profile-sessions
commit_ref: TBD
owner: @maintainer
last_updated: 2026-02-24
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/main/java/com/termlink/app/data/ServerProfile.kt, android/app/src/main/java/com/termlink/app/data/ExternalSession.kt, android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt, android/app/src/main/res/layout/dialog_server_profile.xml, android/app/src/main/res/values/strings.xml]
related_docs: [docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md, docs/changes/records/INDEX.md, docs/changes/CHANGELOG_PROJECT.md]
---

# CR-20260224-1636-android-external-web-terminal-poc

## 1. 变更意图（Compact Summary）

- 背景：Android 终端当前仅支持 TermLink WS 页面，无法把外部网页终端纳入 app 的 profile/session 管理。
- 目标：最小 POC 支持 `EXTERNAL_WEB` 终端类型，并与现有 Profile/Sessions 同级。
- 本次边界：仅 Android 侧；External session 本地持久化；不改服务端协议与浏览器端页面。

## 2. 实施内容（What changed）

1. 数据模型新增 `TerminalType` 与 `ServerProfile.terminalType`，兼容旧数据默认 `TERMLINK_WS`。
2. 新增 `ExternalSessionStore`（SharedPreferences + JSON）与 `ExternalSession`，支持本地 session CRUD + touch。
3. `SessionsFragment` 实现分流：
   - `TERMLINK_WS` 继续走 `SessionApiClient`。
   - `EXTERNAL_WEB` 走本地存储并映射 `status=LOCAL`。
4. `SettingsFragment` 与 profile 弹窗新增 Terminal Type 下拉并持久化。
5. `MainShellActivity` 根据 profile 类型切换 WebView 加载目标：
   - `TERMLINK_WS` -> `terminal_client.html` + 注入配置。
   - `EXTERNAL_WEB` -> 直接加载 `profile.baseUrl`。
6. External 模式隐藏快捷键盘按钮，baseUrl 为空时显示错误态并加载 `about:blank`。
7. 修复 External BASIC 凭据热更新：终端重载判定升级为 `loadedTerminalSignature`，签名包含 `terminalType/baseUrl/authType/basicUsername/basicPassword 指纹`，凭据变更可触发同 URL 重载并应用新 `Authorization`。
8. 新增 `ExternalSessionStore.deleteByProfile(profileId)`，并在 profile 删除链路先清理本地 external sessions，再删除 profile/basic 凭据。
9. External 深色策略改为通用注入（`color-scheme` 与 DOM class/meta 提示），移除 OpenCode 专用 localStorage key 写入。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt`
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
  - `android/app/src/main/java/com/termlink/app/data/ServerProfile.kt`
  - `android/app/src/main/java/com/termlink/app/data/ExternalSession.kt`
  - `android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt`
  - `android/app/src/main/res/layout/dialog_server_profile.xml`
  - `android/app/src/main/res/values/strings.xml`
- 模块：Android profile 配置、session 列表与终端渲染路径。
- 运行时行为：同一 app 内支持 TermLink WS 与 External Web 两类终端入口。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/data/ServerProfile.kt
git checkout <commit_ref>^ -- android/app/src/main/res/layout/dialog_server_profile.xml
git checkout <commit_ref>^ -- android/app/src/main/res/values/strings.xml
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260224-android-external-web-terminal-profile-sessions.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260224-android-external-web-terminal-profile-sessions`
  - `./gradlew.bat :app:compileDebugKotlin`
  - `./gradlew.bat :app:assembleDebug`
- 结果：
  - REQ 校验通过。
  - CR 校验通过。
  - 文档同步校验通过。
  - `:app:compileDebugKotlin` 通过（需 `JAVA_HOME=D:/ProgramCode/openjdk/jdk-21`）。
  - `:app:assembleDebug` 通过（需 `JAVA_HOME=D:/ProgramCode/openjdk/jdk-21`）。
  - `adb-doctor` 检测到当前无在线真机，安装/启动验证待设备上线后执行。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
  - `android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. External 页面运行在通用 WebView 中，站点行为与 TermLink 页面生命周期差异较大，需要做真机回归。
2. External session 为本地持久化模型，不与服务端同步，跨设备数据不一致属预期行为。
