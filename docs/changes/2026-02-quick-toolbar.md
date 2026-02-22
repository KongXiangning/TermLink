---
title: 2026-02 快捷键盘按钮变更记录
status: active
owner: @maintainer
last_updated: 2026-02-22
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, public/terminal_client.js, public/terminal_client.css]
related_docs: [docs/changes/CHANGELOG_PROJECT.md]
---

# 快捷键盘按钮：完成归档（Phase 12）

Last updated: 2026-02-22

## 已完成需求

1. 顶部新增快捷键盘开关按钮（位于 Settings 按钮左侧）。
- 证据：`android/app/src/main/res/layout/activity_main_shell.xml` 中新增 `@+id/btn_toggle_quick_toolbar`。

2. 快捷键盘默认展开。
- 证据：`android/app/src/main/java/com/termlink/app/MainShellActivity.kt` 中 `quickToolbarVisible = true`。
- 证据：`public/terminal_client.js` 中 `let quickToolbarVisible = true;` 且初始化调用 `setQuickToolbarVisible(true);`。

3. 开关状态不跨重启持久化。
- 证据：当前实现未写入 `SharedPreferences` 或 `localStorage`；状态仅保存在 Activity 生命周期内变量 `quickToolbarVisible`。

4. 仅影响客户端路径，不改网页端 `terminal.*`。
- 证据：改动集中在 `MainShellActivity`、`public/terminal_client.*`、Android 顶栏资源；未改 `public/terminal.html` / `public/terminal.js`。

5. Settings 页面隐藏快捷键盘开关按钮。
- 证据：`android/app/src/main/java/com/termlink/app/MainShellActivity.kt` 的 `updateTopBarForScreen()` 在 SETTINGS 分支将 `quickToolbarButton` 设为 `GONE`。

6. 切换后立即触发终端尺寸重算。
- 证据：`public/terminal_client.js` 的 `setQuickToolbarVisible()` 在显示状态变更后调用 `sendResize()`。

## 已完成计划（按原 A-D 归类）

### A. Android 顶栏按钮接入（已完成）

1. 布局新增 `btn_toggle_quick_toolbar`（38dp，样式与顶栏图标按钮一致）。
2. 新增文案资源 `quick_toolbar_toggle_button`。
3. 新增图标资源 `ic_keyboard_24.xml`。

对应文件：
- `android/app/src/main/res/layout/activity_main_shell.xml`
- `android/app/src/main/res/values/strings.xml`
- `android/app/src/main/res/drawable/ic_keyboard_24.xml`

### B. MainShellActivity 逻辑（已完成）

1. 新增字段与点击绑定：
- `quickToolbarButton`
- `quickToolbarVisible`
- `quickToolbarButton?.setOnClickListener { toggleQuickToolbar() }`

2. 新增控制方法：
- `toggleQuickToolbar()`
- `applyQuickToolbarToWebView()`

3. 页面加载完成后强制重放状态：
- `onPageFinished()` 中调用 `applyQuickToolbarToWebView()`，避免页面刷新后状态丢失。

4. 顶栏可见性控制：
- TERMINAL: 显示 Settings + 快捷键盘按钮。
- SETTINGS: 隐藏上述两个按钮，仅显示返回。

对应文件：
- `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`

### C. 客户端页 JS/CSS 接口（已完成）

1. 新增页面状态：
- `let quickToolbarVisible = true;`

2. 新增接口函数：
- `setQuickToolbarVisible(visible)`
- `window.__setQuickToolbarVisible = function(visible) { ... }`

3. 样式控制：
- `#toolbar.hidden { display: none; }`

4. 初始化默认展开并触发重算：
- `setQuickToolbarVisible(true);`
- `sendResize();`

对应文件：
- `public/terminal_client.js`
- `public/terminal_client.css`

### D. 版本与资源同步（已完成）

1. 前端资源版本升级至 `v20`。
2. Android 加载地址升级到 `terminal_client.html?v=20`。
3. Android assets 内对应资源已反映 `v20`。

对应文件：
- `public/terminal_client.html`
- `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
- `android/app/src/main/assets/public/terminal_client.html`

## 已完成提交（追溯）

1. `296eb88` `feat(android): add quick toolbar toggle button to top bar`
2. `fb41f37` `fix: keep quick toolbar visible after terminal page load`

## 待补充（文档层）

1. 原 Rollout Plan 的“Commit 4：android:sync 后构建/安装验收记录”尚未单独形成文档记录。

