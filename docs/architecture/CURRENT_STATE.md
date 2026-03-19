---
title: TermLink 当前架构状态
status: active
owner: @maintainer
last_updated: 2026-03-18
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, src/server.js, public/terminal_client.js, public/codex_client.html, public/terminal.js]
related_docs: [docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/product/requirements/REQ-20260309-codex-capability-mvp.md]
---

# CURRENT_STATE

## 1. 客户端与前端

1. Android 启动入口为 `MainShellActivity`，采用原生壳 + WebView 终端。
2. Android Terminal 页面使用 `public/terminal_client.html`（客户端专用）。
3. 浏览器页面使用 `public/terminal.html`（网页端独立路径）。
4. Terminal 与 Native 间通过 `TerminalEventBridge` 传递连接状态/错误信息。
5. Codex 首页顶部使用轻量状态栏，只展示 `Codex 状态`、工作区路径、额度占用与刷新时间。
6. 顶部状态栏当前不提供“查看线程”、顶部权限设置或 `Session Defaults` 入口。

## 2. 服务端

1. 技术栈：Node.js + Express + ws + node-pty。
2. API 已覆盖会话基础管理与健康检查。
3. 会话元数据持久化到 JSON（`data/sessions.json`）。
4. WebSocket 消息流包含输入、输出、resize、会话信息。

## 3. 安全与发布

1. 支持 BasicAuth。
2. Android 支持 mTLS 客户端证书能力（按配置启用）。
3. 发布前需执行 `npm run android:check-release-config`，避免 HTTP 明文配置进入 release。

## 4. 当前约束

1. 文档规范以 `docs/` 下 active 文件为执行依据。
2. 历史方案文档仅作参考，不再直接指导实现。
