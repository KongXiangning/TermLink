---
title: TermLink 产品需求主线
status: active
owner: @maintainer
last_updated: 2026-03-09
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

### 3.2 P1（近期演进）

1. 文档治理与需求流程标准化（本次已建立入口）。
2. Codex 远程控制链路主线需求（`REQ-20260309-codex-capability-mvp`）：按能力矩阵推进历史线程、会话级默认配置、审批交互、额度可见性与运行态展示。
3. Codex App 侧修复计划（`REQ-20260306-codex-app-repair-plan`）作为已归档前置基线，用于追溯独立聊天窗、Create Session 模式入口、会话级 `cwd`、审批透传与 IME 首轮收口。
4. 多设备与多 profile 管理体验增强。
5. 受控管理员权限模式（`REQ-20260222-server-admin-privilege-mode`）：默认标准权限运行，仅在满足安全门禁时允许启用高权限。
6. Android External Web 终端 POC（`REQ-20260224-android-external-web-terminal-profile-sessions`）：支持将外部网页作为终端类型接入并纳入 Profile/Sessions 管理。

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
