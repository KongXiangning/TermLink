# 2026-10-12 已有Git历史补证

以下为只读git show输出；不是本次执行报告或新测试。日期以原文为准，CR日期与Git提交日期不同不自动覆盖。

## 01文档迁移提交

```text
16967402decedd2b1b484c0b2996245ffe2af5e4
docs: unify documentation structure and governance workflow
- Reorganize project docs into docs/{product,architecture,guides,ops,changes,archive}.
- Merge PRD/PRDV2 into a single active requirements doc and add backlog + REQ/ADR templates.
- Migrate guides, ops, incidents, and quick-toolbar change record to normalized paths.
- Archive historical plans/docs with status metadata and replacement links.
- Keep root/docs legacy entry files as compatibility redirects to new locations.
- Add central docs index and project changelog for ongoing documentation management.


 HALF_NATIVE_ARCH_AND_EXEC_PLAN.md                  | 501 +-------------------
 PRD.md                                             | 313 +------------
 PRDV2.md                                           | 386 +---------------
 README_ANDROID.md                                  | 247 +---------
 README_DEPLOY.md                                   | 115 +----
 docs/CLIENT_IME_ISSUE_TRACKING.md                  |  90 +---
 docs/CLIENT_PAGE_IME_REMINDER.md                   |  27 +-
 docs/README.md                                     |  62 +++
 docs/architecture/CURRENT_STATE.md                 |  36 ++
 docs/architecture/ROADMAP.md                       |  28 ++
 docs/architecture/decisions/ADR-TEMPLATE.md        |  27 ++
 docs/archive/README.md                             |  17 +
 .../architecture/half-native-arch-and-exec-plan.md | 510 +++++++++++++++++++++
 .../archive/plans/shortcut-keyboard-toggle-plan.md | 128 ++++++
 docs/archive/product/prd-v1.md                     | 322 +++++++++++++
 docs/archive/product/prdv2.md                      | 395 ++++++++++++++++
 docs/baseline.md                                   |  18 +
 docs/changes/2026-02-quick-toolbar.md              | 109 +++++
 docs/changes/CHANGELOG_PROJECT.md                  |  22 +
 docs/guides/android-development.md                 | 256 +++++++++++
 docs/guides/deployment.md                          | 124 +++++
 docs/ops.md                                        |  70 +--
 docs/ops/incidents/client-ime-issue-tracking.md    |  85 ++++
 docs/ops/incidents/client-ime-reminder.md          |  28 ++
 docs/ops/ops-checklist.md                          |  65 +++
 docs/product/PRODUCT_REQUIREMENTS.md               |  59 +++
 docs/product/REQUIREMENTS_BACKLOG.md               |  28 ++
 .../REQ-20260222-document-governance.md            |  64 +++
 docs/product/requirements/REQ-TEMPLATE.md          |  39 ++
 docs/shortcut-keyboard-toggle-plan.md              | 129 +-----
 docs/快捷键盘按钮.md                               | 139 +-----
 31 files changed, 2522 insertions(+), 1917 deletions(-)

```

## 03示例TTL配置原提交差异

```text
1899f6de311827140cfb6ba6fe4b15d5b918ec91
feat: sync session retention changes and codex app repair

diff --git a/.env.example b/.env.example
index 482f3435..427f48c6 100644
--- a/.env.example
+++ b/.env.example
@@ -33,7 +33,7 @@ SESSION_PERSIST_PATH=./data/sessions.json
 
 # ── Session Lifecycle / Retention ──────────────────────
 # Keep idle sessions for 6 hours by default.
-SESSION_IDLE_TTL_MS=21600000
+SESSION_IDLE_TTL_MS=86400000
 # Hard limit for in-memory sessions; when full, evict oldest IDLE first.
 SESSION_MAX_COUNT=50
 # Background cleanup interval.

```

## 22实现提交说明

```text
32c46599a304d0ff4c77f271cf178b0a72f455ef
feat: SPA shell — terminal + codex dual-view in terminal.html
Convert terminal.html to unified SPA shell with shared drawer:
- Step 1: #terminal-view wrapper + #codex-view DOM (codex- prefixed IDs)
- Step 2: codex_ipc.js embedded mode (EMBEDDED detection, PREFIX mapping,
  __codexInit() entry point, skip drawer creation in embedded mode)
- Step 3: sessions.js switchToView() replaces all location.href navigation
  (terminal/codex view toggle via display:none/block)
- Step 4: codex_ipc.css #terminal-view/#codex-view flex:1 layout fix
- Step 5: Playwright verified — terminal OK, codex hidden, 0 JS errors

Bug fixes:
- Double modal: stopPropagation -> stopImmediatePropagation
- Terminal session click ignored: extend handler to all modes
- Terminal view height: #terminal-view flex:1 fill available space

terminal.js: ZERO changes.

Co-Authored-By: Claude <noreply@anthropic.com>


```

## 22归档时CURRENT_TASK原文

```text
# docs/workflow/CURRENT_TASK.md

## 任务信息

- 任务 ID：无
- 任务标题：无
- 任务 slug：无
- 当前状态：无活动任务
- 创建时间：—
- 创建来源：—
- 任务类型：—
- 任务目标：—

## 背景与上下文

已归档任务：
- `20260615-001`（App Codex IPC 实时同步）— paused_blocked，见 `TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md`
- `20260615-002`（网页版 Codex IPC 会话页）— 已归档，见 `TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md`
- `20260616-001`（网页版 SPA 统一 shell + Codex 会话整合）— 已归档，见 `TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md`

等待新需求执行 `/create-current-task`。

```

## 22归档STATUS/LESSONS原差异

```text
9ff22a8483c55ded835be3ccbcfb0436c4773bcd
docs: archive task 20260616-001 and clean up workspace state

diff --git a/docs/workflow/LESSONS.md b/docs/workflow/LESSONS.md
index f2b14133..0c482218 100644
--- a/docs/workflow/LESSONS.md
+++ b/docs/workflow/LESSONS.md
@@ -29,6 +29,13 @@
 - **应对**: 新增 `codex_ipc_conversations` 消息，在客户端连接时主动推送全部已知 conversation 列表
 - **Source**: `20260615-002` B4/B8
 
+### L-005: addEventListener on existing element creates duplicate handlers
+
+- **触发信号**: 共享 helper 脚本给已有 DOM 元素加 `addEventListener` 后，页面出现双重弹窗、双重跳转
+- **实例**: `sessions.js` 给 `#btn-new-session` 加 click handler，但 `terminal.js` 已有 handler。`stopPropagation` 只阻止冒泡，不阻止同元素其他 handler——两个都执行
+- **应对**: 使用 `e.stopImmediatePropagation()` 阻止同元素上的后续 handler；或在加载顺序可控时，让共享脚本在目标脚本之前加载并使用 `{ once: true }`
+- **Source**: `20260616-001` double modal bug
+
 ### L-004: Env var inheritance through cmd.exe chain
 
 - **触发信号**: PowerShell `$env:VAR='1'` 设置后，子进程 `cmd.exe /c npm run dev` 中 Node 读不到该变量
diff --git a/docs/workflow/STATUS.md b/docs/workflow/STATUS.md
index 362ab5fe..d7a35cbb 100644
--- a/docs/workflow/STATUS.md
+++ b/docs/workflow/STATUS.md
@@ -23,8 +23,9 @@
 
 ## 🔨 正在开发
 
-- [x] `20260615-002` 网页版 Codex IPC 实时同步会话页：已完成实现、review、commit `9603ea7`（11 files, +2129/-627），端到端验证通过（4 conversations, 87 items, 189 pass/0 fail）。等待 closeout。
-- [ ] `20260615-001` Codex IPC Android 实时同步：paused_blocked（服务端全链路已完成 + Android 端已集成，缺 Desktop IPC 环境 manual smoke）。Paused package: `TASKS/paused/TASK-20260615-001-*.md`。
+- [x] `20260615-002` 网页版 Codex IPC 实时同步会话页：已完成并归档。commit `9603ea7`。
+- [x] `20260616-001` 网页版 SPA 统一 shell + Codex 会话整合：已完成实现、review、regression。`terminal.html` 改造为 SPA shell，`terminal.js` 零改动。commit `32c4659`。
+- [ ] `20260615-001` Codex IPC Android 实时同步：paused_blocked（缺 Desktop IPC 环境 manual smoke）。
 
 ## 📋 待开发
 

```
