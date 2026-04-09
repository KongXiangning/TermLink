---
title: TermLink 产品需求主线
status: active
owner: @maintainer
last_updated: 2026-04-09
source_of_truth: product
related_code: [src/server.js, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, public/terminal_client.js]
related_docs: [docs/architecture/CURRENT_STATE.md, docs/product/REQUIREMENTS_BACKLOG.md, docs/archive/product/prd-v1.md, docs/archive/product/prdv2.md]
---

# TermLink 产品需求主线（当前有效）

## 1. 产品定位

TermLink 是移动优先的远程终端系统，核心目标是通过浏览器与 Android 客户端稳定访问远端终端会话，并在触控设备上保持可用的输入体验与连接稳定性。

## 2. 当前有效范围

1. 终端链路：WebSocket 双向交互，支持输入、输出、窗口 resize。
2. 会话管理：支持会话列表、创建、删除、重命名（服务端 API + Android 原生会话页）。
3. Android 半原生：`MainShellActivity` + 原生 Sessions/Settings + WebView Terminal。
4. 客户端专用终端页：Android 使用 `public/terminal_client.*`，浏览器使用 `public/terminal.*`。
5. 安全能力：BasicAuth、mTLS（按配置启用）、发布配置安全检查。

## 3. 需求分层

### 3.1 P0（必须保持）

1. 低延迟终端交互与稳定输出渲染。
2. 断线重连与状态可见性。
3. 会话持久化与服务重启后元数据可恢复。
4. 触控输入可用性（软键盘、快捷键栏、常用控制键）。
5. Android 客户端与浏览器端均可独立使用。
6. 会话连续性（断联续接，`REQ-20260222-session-retention-reconnect`）：客户端临时断联不应导致会话提前销毁，在保留窗口内需可通过同一 `sessionId` 继续会话。
7. 快捷键盘输入可用性（`REQ-20260223-shortcut-keyboard-modifier-newline`）：`Ctrl/Alt` 必须按终端语义生效，提供触控可达的“换行”按钮，并修复文字区拖动滚动困难问题。

8. 系统语言自动适配（`REQ-20260329-language-normalization`）：应用根据手机/电脑系统默认语言自动选择界面语言，中文系列（简体/繁体）显示简体中文，非中文显示英文；预留未来新增语言的扩展能力。

### 3.2 P1（近期演进）

1. 文档治理与需求流程标准化（`REQ-20260222-doc-governance`）：统一文档入口、需求流程和 skill 文档追踪规则，并要求实现批次可回写 plan 覆盖范围。
2. Codex Android / WebView 主线需求（`REQ-20260309-codex-capability-mvp`）：以移动端对话体验优先为准绳，当前期优先交付对话首页、`/model`、`/plan`、输入区附近的轻量模型 / 推理强度控制，并保留顶部轻量状态栏；新增后台保活与断线续接批次，要求活跃 Codex 任务在 Android 后台切换时不中断、可通过 foreground service 保活，并在回连后恢复原任务状态；下一阶段继续补齐 composer `@` 文件提示、筛选列表与已选文件态。
3. Codex 二级能力收口：`Threads / Live Runtime / 非阻塞 warning / Limits` 保留能力，但改为二级入口，不再作为首页主体；当前期不恢复 `Session Defaults`、顶部权限设置或顶部线程查看入口。
4. Codex slash 与交互状态模型：`/model` 与快捷入口共用同一个 next-turn override 状态源；`/plan` 与 `/skill <name>` 采用并行 interaction state，当前期 `/skill <name>` 仅冻结契约、默认不开放；用户点击“执行此计划”后必须自动退出 `planMode`。
5. Codex slash 扩展接口：后续新增 `/` 能力时，必须复用统一的客户端 slash registry / command-dispatch 接口，不再为单个命令新增分散特判入口。
6. Codex 配置契约前置条件：`PATCH /api/sessions/:id` 更新 stored `codexConfig` 是正式交付项；当前期不恢复 `Session Defaults` UI，仅统一 stored config、`nextTurnEffectiveCodexConfig` 与 `interactionState` 的边界。
7. Codex 平台与语言规范：Android 与 WebView 共享同一交互契约；默认 UI 文案中文化，未知 slash 不发送且需给出中文兜底提示；`activeSkill` 当前只冻结契约，不预绑定底层字段。
8. Codex App 侧修复计划（`REQ-20260306-codex-app-repair-plan`）作为已归档前置基线，用于追溯独立聊天窗、Create Session 模式入口、会话级 `cwd`、审批透传与 IME 首轮收口。
9. Codex Workspace 文件浏览与 Diff 查看（`REQ-20260318-ws-0001-docs-exp`，原产品编号 `REQ-WS-0001`）：为 Codex 会话提供固定 `workspaceRoot`、目录浏览、文件查看、Git 状态与统一文本 Diff，并通过独立 Web Workspace 页面和 Android `WorkspaceActivity` 交付移动端主链路。
10. Android 会话列表本地缓存与离线回显（`REQ-20260324-session-list-local-cache`）：在弱网或会话列表请求失败时，App 仍应优先展示最近一次可得的 sessions 列表，其中远端 profile 来自新缓存快照，`EXTERNAL_WEB` 继续复用既有本地持久化，并明确区分缓存态与实时刷新态。
11. 多设备与多 profile 管理体验增强。
12. Android Profile 级 mTLS 运行时证书选择（`REQ-20260326-android-profile-mtls-runtime-certificate`）：将 Android mTLS 从构建时内置证书切换为按 profile 运行时选择与本地私有保存，供 WebView 与原生 Session API 共用。
13. 受控管理员权限模式（`REQ-20260222-server-admin-privilege-mode`）：默认标准权限运行，仅在满足安全门禁时允许启用高权限。
14. Android External Web 终端 POC（`REQ-20260224-android-external-web-terminal-profile-sessions`）：支持将外部网页作为终端类型接入并纳入 Profile/Sessions 管理。
15. Codex Android 全原生并行迁移与多 CLI 提供方扩展基线（`REQ-20260408-codex-native-android-migration`，`done`）：已完成独立原生 `CodexActivity`、slash / @mention / 审批 / 计划模式 / 线程历史 / 工具与运行态面板 / token/rate-limit / 图片输入、原生默认入口切换、WebView 受控回退，以及真机恢复 / 弱网 / 通知返回收口；旧 WebView Codex 保留为后续可选清理项，不再阻塞本需求关闭。

### 3.3 P2（增强项）

1. 更细粒度审批与审计日志。
2. 快捷命令面板与高频工作流预设。
3. 主题与无障碍可用性提升。
4. Android 前台息屏治理（`REQ-20260224-screen-keep-awake`）：前台用户无操作 2 分钟后恢复系统息屏，避免长期无效亮屏。

## 4. 与历史文档的关系

1. 原 `PRD.md` 与 `PRDV2.md` 的内容已合并到本文件。
2. 历史差异与原始版本保留在：
- `docs/archive/product/prd-v1.md`
- `docs/archive/product/prdv2.md`
3. 若与旧文档冲突，以本文件和代码现状为准。

## 5. 验收基线

1. 关键文档可在 `docs/README.md` 一站式导航。
2. 新需求必须先进入需求池并有独立需求卡。
3. 同主题只有一个 `active` 文档作为执行依据。
