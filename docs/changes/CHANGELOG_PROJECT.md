---
title: TermLink 项目变更日志
status: active
owner: @maintainer
last_updated: 2026-03-31
source_of_truth: product
related_code: []
related_docs: [docs/README.md]
---

# CHANGELOG_PROJECT

## 2026-03-30

### client

1. 完成 `REQ-20260329-language-normalization` 收口：补齐 Android 前台 locale 切换 reload、Web 漏网 i18n 文案与测试辅助初始化，确保中文系系统语言统一显示简体中文、非中文显示英文，且原生界面与 WebView 保持一致。

### docs

1. 将 `REQ-20260329-language-normalization` 状态同步为 `done`，并回写 `PLAN`、`REQUIREMENTS_BACKLOG`、`ROADMAP`、`CHANGELOG_PROJECT` 与 CR 索引，补齐最终收口追踪链路。

## 2026-03-29

### client

1. 修复 Android Terminal 键盘/滚动回归：顶部键盘按钮改为“软键盘打开时优先关闭 IME，否则切换快捷键盘”，并统一 `terminal_client.*` / `terminal.*` 的双击隐藏键盘与触摸滚动逻辑，恢复文字区和空白区一致的纵向滚动体验（见 `CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix`）。

### docs

1. 将本次 Android Terminal 回归修复回填到 `REQ-20260223-shortcut-keyboard-modifier-newline` 的实现进度，并新增对应 CR 索引记录。

## 2026-03-28

### client

1. 完成 `REQ-20260326-android-profile-mtls-runtime-certificate` 主链路：Android Profile Settings 支持运行时导入/选择客户端证书（PKCS#12），WebView 与原生 OkHttp 层统一信任链读取 Profile 绑定证书，移除编译期硬编码 BuildConfig 证书依赖；涵盖证书删除/替换回滚、密码缓存、Settings 保存顺序修复等 23 项变更记录。

### server

1. 新增 TLS/mTLS 监听与统一集成（`REQ-20260326-android-profile-mtls-runtime-certificate` 步骤 8.7-8.9）：服务端可选启用独立 mTLS listener，relay 层透传客户端证书身份语义。

## 2026-03-26

### docs

1. 重写 README 入口：将仓库根 `README.md` 调整为英文版，并新增 `README.zh-CN.md` 中文版，两个文档可通过超链接互相跳转；内容按已实现能力收口 Android 原生壳、Codex 工作区、Workspace 独立页、Sessions 缓存与安全发布说明，并补齐 4 张 Android 真机截图资源。

## 2026-03-25

### client

1. 完成 `REQ-20260324-session-list-local-cache`：Android Sessions 页面支持首屏本地缓存回显、远端成功覆盖缓存、失败态 stale/refreshing 提示、创建/删除/重命名后的缓存同步，以及防止旧乐观写回覆盖后续 refresh 结果的 generation 门禁；CODEX 创建在服务端未返回 `cwd` 时也会保留用户选择的工作目录。

### docs

1. 将 `REQ-20260324-session-list-local-cache` 状态由 `planned` 更新为 `done`，同步收口 `PLAN`、`REQUIREMENTS_BACKLOG`、`ROADMAP`、历史 CR 索引和真机验收记录。

## 2026-03-24

### docs

1. 将 Workspace 主需求收口为规范 REQ：`REQ-20260318-ws-0001-docs-exp`（原产品编号 `REQ-WS-0001`），补齐模板化 Meta、主线索引引用、状态流转与变更记录追踪。
2. 新增 `REQ-20260324-session-list-local-cache`，定义 Android 会话列表本地缓存、离线回显与弱网刷新覆盖边界，并同步需求主线文档。
3. 扩展 `REQ-20260222-doc-governance` 下的 `docs-requirement-sync` skill：实现批次现在必须同步 `PLAN + CR`，并在收尾答复中明确当前已实现的计划部分。

## 2026-03-09

### docs

1. 新增 `REQ-20260309-codex-capability-mvp`，将 Codex 主线从“修复计划”升级为“能力矩阵驱动的产品化需求”，并明确 `已交付基线 / MVP / 下一阶段 / Out of Scope` 四类分期。
2. 新增 `docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md`，固化能力映射、接口收敛、分阶段实施顺序、测试与回滚策略。
3. 将 `REQ-20260306-codex-app-repair-plan` 标记为 `archived`，并声明由 `REQ-20260309-codex-capability-mvp` 取代作为主线执行依据。
4. 同步更新 `REQUIREMENTS_BACKLOG`、`PRODUCT_REQUIREMENTS`、`ROADMAP`、`README` 与 CR 索引以对齐新主线需求。

## 2026-03-06

### server

1. 落地 `REQ-20260306-codex-app-repair-plan` Phase 1：`/api/sessions` 与服务端会话存储正式支持 `sessionMode + cwd`，兼容旧会话默认回退 `terminal + null`，并通过 WebSocket 初始 `session_info` 透传给客户端。

### client

1. 落地 `REQ-20260306-codex-app-repair-plan` Phase 2：Android `Create Session` 新增 `terminal/codex` 模式选择与 Codex 工作路径输入，TermLink WS 会话可按模式分流到独立 `codex_client.html` 或终端页面，并持久化最近一次会话的 `sessionMode + cwd`。
2. 落地 `REQ-20260306-codex-app-repair-plan` Phase 3（前端侧）：Codex WebView 发送 `cwd` 到服务端，审批请求改为前端可见的 `Approve/Reject` 卡片并可回传处理结果。
3. 落地 `REQ-20260306-codex-app-repair-plan` Phase 4（前端侧）：Codex WebView 增加 `cwd/token usage/rate limit` 状态展示、错误提示语义化收口，并根据视口高度切换紧凑布局，保证 Android 键盘弹起时输入区仍可见。
4. 修复 Phase 4 审查问题：`codex_state` 不再隐式触发 `thread/read`，避免审批卡片被 snapshot 清空，并降低 telemetry 驱动的 transcript 刷新噪音。

### server

2. 落地 `REQ-20260306-codex-app-repair-plan` Phase 3（服务端侧）：Codex 网关优先使用会话级 `cwd` 启动 thread，支持 `codex_set_cwd` 更新会话工作目录，并将审批请求挂起到前端处理，不再默认立即拒绝。
3. 落地 `REQ-20260306-codex-app-repair-plan` Phase 4（服务端侧）：Codex 网关把 `tokenUsage/rateLimitState` 归档到 `codex_state` 快照，保证 WebView 重连后仍可恢复限额与用量状态。
4. 修复 Phase 4 审查问题：`account/rateLimits/updated` 改为支持无 `threadId` 的账户级广播，只向已连接 Codex 会话分发，并仅在状态真实变化时广播 `codex_state`。

### docs

1. 新增 `REQ-20260306-codex-app-repair-plan`，将 Codex App 侧问题收敛为可执行修复计划，覆盖独立聊天窗、Create Session 模式化创建、会话级 `cwd`、审批链路、限额提示与 Android IME 布局收口。

## 2026-02-24

### client

1. 实现 `REQ-20260223-shortcut-keyboard-modifier-newline`：双端快捷键盘支持 `Ctrl/Alt` 单击一次性 + 双击锁定语义，新增独立 `Shift+Enter` 换行键（`\n`）并保留 `Enter`（`\r`），同时优化终端文字区触摸拖动滚动（见 `CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1`）。
2. 修复同需求的静态资源缓存风险：统一提升 Android WebView 入口与客户端页面 `js/css` 版本参数，避免命中旧资源导致修复不生效（见 `CR-20260224-0220-shortcut-keyboard-cache-bust-fix`）。
3. 调整快捷键交互：`PgUp/PgDn/Home/End` 现在用于本地滚动终端历史输出（不再透传远端），并将换行键移到第二行末尾改为符号按钮（见 `CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix`）。
4. 新增 Android External Web 终端 POC（`REQ-20260224-android-external-web-terminal-profile-sessions`）：Profile 增加 `terminalType`，Sessions 对 External 走本地持久化 CRUD，Terminal 支持按类型切换到外部网页加载（见 `CR-20260224-1636-android-external-web-terminal-poc`）。
5. 修复 External Web POC 关键问题：BASIC 凭据更新后可立即重载生效、删除 profile 时同步清理本地 external sessions、深色策略改为通用注入并移除 OpenCode 专用 key（见 `CR-20260224-1636-android-external-web-terminal-poc`）。
6. 实现前台 idle 息屏治理（`REQ-20260224-screen-keep-awake`）：MainShellActivity 前台默认常亮，用户无操作 2 分钟后恢复系统息屏，切后台立即取消常亮（见 `CR-20260224-2145-screen-idle-timeout-restore`）。

### server

1. 修复 `REQ-20260222-session-retention-reconnect` 的 WS 参数语义回归：`?sessionId=` 现在返回 `4404` 且不再静默新建会话，并新增关键自动化回归测试（见 `CR-20260224-0023-session-retention-reconnect-ws-param-fix`）。

### docs

1. 将 `REQ-20260222-session-retention-reconnect` 状态由 `planned` 更新为 `done`，并将 `CR-20260223-2114-session-retention-impl-phase1` 回填为 `active + commit_ref=67bc2c3`（见 `CR-20260224-0115-session-retention-status-done-sync`）。

## 2026-02-23

### server

1. 落地 `REQ-20260222-session-retention-reconnect` 第一阶段实现：会话默认 idle TTL 提升至 6 小时，新增会话容量上限与 IDLE-LRU 回收，`WS` 无效 `sessionId` 返回明确错误（详情见 `CR-20260223-2114-session-retention-impl-phase1`）。

### docs

1. 新增快捷键盘输入问题追踪：`Ctrl/Alt` 当前未生效为控制键语义，且终端文字区拖动滚动明显困难（见 `docs/ops/incidents/client-shortcut-keyboard-modifier-issue.md`）。
2. 更新需求卡 `REQ-20260223-shortcut-keyboard-modifier-newline`，范围扩展为“修复 `Ctrl/Alt` + 增加换行按钮 + 优化文字区拖动滚动体验”。

## 2026-02-22

### docs

1. 建立 `docs/` 统一文档分层（product/architecture/guides/ops/changes/archive）。
2. 合并 `PRD.md` 与 `PRDV2.md` 到 `docs/product/PRODUCT_REQUIREMENTS.md`。
3. 将 Android/部署/运维/IME 追踪文档迁移到统一路径并补充 front matter。
4. 新增需求池与需求模板：`REQUIREMENTS_BACKLOG.md` + `REQ-TEMPLATE.md`。
5. 历史计划迁移到 `docs/archive/` 并标记不再作为主线规范。
6. 根目录历史入口文件改为跳转说明页，保持兼容链接。
7. 新增需求卡 `REQ-20260222-session-retention-reconnect`，定义服务端会话长时保留与断联续接的实施规范。
8. 建立 `docs/changes/records/` 固化变更记录机制（CR），用于 compact 风格的回放、恢复与后续修改。
9. 新增 `docs-requirement-sync` skill，并引入 REQ + CR 的门禁校验脚本。
10. 新增需求卡 `REQ-20260222-server-admin-privilege-mode`，定义服务端管理员权限模式的安全边界、启用条件、审计与回滚要求。

## 2026-02-22 (records)

### governance

1. 变更记录以 `docs/changes/records/INDEX.md` 为主索引。
2. 每次实施/提交必须新增一条 CR 文件，并强制关联 `req_id + commit_ref`。
3. `CHANGELOG_PROJECT.md` 定位为摘要层，详细恢复信息以 CR 正文为准。
