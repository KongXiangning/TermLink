---
title: Android External Web 终端（Profile/Sessions 同级）POC
status: done
owner: @maintainer
last_updated: 2026-03-31
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt, android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/main/java/com/termlink/app/data/ServerProfile.kt, android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt, android/app/src/main/res/layout/dialog_server_profile.xml, android/app/src/main/res/values/strings.xml]
related_docs: [docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/changes/CHANGELOG_PROJECT.md]
---

# REQ-20260224-android-external-web-terminal-profile-sessions

## Meta

- id: REQ-20260224-android-external-web-terminal-profile-sessions
- title: Android External Web 终端（Profile/Sessions 同级）POC
- priority: P1
- status: done
- owner: @maintainer
- target_release: 2026-Q1
- links: `docs/product/REQUIREMENTS_BACKLOG.md`

## 1. 背景与目标

当前 Android 终端仅支持 TermLink WS 协议页面（`terminal_client.html`），无法把独立网页终端作为 app 内可配置终端类型接入。  
本需求目标是以最小改动实现 POC：在 Android 中新增 `EXTERNAL_WEB` 终端类型，并与现有 `Profile + Sessions` 管理同级接入。

## 2. In Scope

1. `ServerProfile` 增加 `terminalType`：`TERMLINK_WS`、`EXTERNAL_WEB`。
2. Settings 的 Add/Edit Profile 弹窗增加 Terminal Type 下拉。
3. 新增 External 本地 session 存储，支持 create/list/rename/delete/touch，重启后保留。
4. Sessions 页按 profile 类型分流：TermLink 走 `/api/sessions`，External 走本地存储。
5. Terminal 页面按 profile 类型分流加载：
   - `TERMLINK_WS`：保持当前 `terminal_client.html + 配置注入`
   - `EXTERNAL_WEB`：直接加载 `profile.baseUrl`
6. External 模式隐藏快捷键盘按钮，状态栏显示 External 打开态。
7. External profile BASIC 凭据更新后，重新打开同 session 应立即生效（不要求重启 App）。
8. 删除 profile 时同步清理该 profile 下本地 external sessions。
9. External 深色策略采用通用注入（`color-scheme`/DOM 提示），不写站点特定 localStorage key。

## 3. Out of Scope

1. 不改服务端 API/WS 协议。
2. 不改浏览器端 `public/terminal.*` 路径。
3. External session 不与服务端同步，不引入跨端共享。
4. 不实现 `localhost` 到开发机的自动代理引导（如 adb reverse 向导）。

## 4. 方案概要

1. 数据模型层增加 `TerminalType`，兼容旧配置默认回落为 `TERMLINK_WS`。
2. 新增 `ExternalSessionStore`（SharedPreferences + JSON）承载 External 本地 session。
3. Sessions 页内部按 `profile.terminalType` 选择数据源与 CRUD 实现。
4. `MainShellActivity` 中统一维护终端渲染目标，依据类型切换 `WebView.loadUrl(...)`。
5. External URL 为空时不加载业务页，显示可读错误并停留 `about:blank`。

## 5. 接口/数据结构变更

1. `ServerProfile` 新增字段：
   - `terminalType: TerminalType`
2. 新增枚举：
   - `TerminalType.TERMLINK_WS`
   - `TerminalType.EXTERNAL_WEB`
3. 新增本地会话结构 `ExternalSession`：
   - `id`
   - `profileId`
   - `name`
   - `createdAt`
   - `lastActiveAt`
4. Sessions 运行时映射规则（External）：
   - `status = LOCAL`
   - `activeConnections = 0`
5. `ExternalSessionStore` 新增清理接口：
   - `deleteByProfile(profileId: String): Int`

## 6. 验收标准

1. 可在 Settings 新建 `EXTERNAL_WEB` profile 并持久化。
2. External profile 下 Create Session 创建本地 session（仅 name），重启后仍存在。
3. 打开 External session 时 Terminal WebView 直接加载 profile baseUrl。
4. 打开 TermLink session 时维持现有 WS 终端行为不回退。
5. External profile 下 Sessions 不再调用 `/api/sessions`。
6. External 模式下快捷键盘按钮隐藏，状态栏可见 External 打开态。
7. 修改 External BASIC 用户名/密码后，无需重启 App 即可在同 URL 下重新加载并生效。
8. 删除 External profile 后，本地 external sessions 不残留。
9. 深色提示仅使用通用策略，不写 OpenCode 专用 localStorage key。

## 7. 测试场景

1. 旧 profile 升级兼容：无 `terminalType` 配置时默认 `TERMLINK_WS`。
2. 新建/编辑 profile：Terminal Type 切换并重进 app 校验持久化。
3. External session create/rename/delete 全流程验证。
4. External 与 TermLink profile 混合切换，连续打开 session 验证不崩溃。
5. baseUrl 为空的 External profile 打开终端，显示错误态并不加载业务页。
6. External BASIC 错密打开失败后，改正凭据并重开同 session，验证可直接通过认证。
7. 删除 profile 后重建同名 profile，验证旧 external sessions 不复现。

## 8. 风险与回滚

1. 风险：External 页与 TermLink 页切换可能引入 WebView 状态抖动。
2. 风险：本地 session 存储异常可能导致 External 列表丢失。
3. 缓解：保持单 WebView、最小渲染切换条件，存储解析失败时安全回退空列表。
4. 回滚：移除 `EXTERNAL_WEB` 分支并恢复到固定 `terminal_client.html` 路径。

## 9. 发布计划

1. 完成 Android POC 代码改造与本地编译验证。
2. 补齐 REQ/CR 与主线文档同步。
3. 执行真机验证（至少 1 台）确认 External 页面可打开与 session 本地持久化。

## 10. 本轮修复补充（2026-02-24）

1. 终端重载判定从 `type + target` 升级为 `loadedTerminalSignature`，`EXTERNAL_WEB` 分支将 `authType/basicUsername/basicPassword 指纹`纳入比较，解决 BASIC 凭据热更新不生效问题。
2. 在 profile 删除链路增加 `ExternalSessionStore.deleteByProfile(profileId)`，保证本地 external sessions 与 profile 生命周期一致。
3. External 深色注入改为通用策略（`color-scheme + DOM class/meta`），移除 OpenCode 特化键写入。
