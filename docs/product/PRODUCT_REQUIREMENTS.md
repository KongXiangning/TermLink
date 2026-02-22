---
title: TermLink 产品需求主线
status: active
owner: @maintainer
last_updated: 2026-02-22
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
6. 会话连续性（断联续接）：客户端临时断联不应导致会话提前销毁，在保留窗口内需可通过同一 `sessionId` 继续会话。

### 3.2 P1（近期演进）

1. 文档治理与需求流程标准化（本次已建立入口）。
2. Codex 远程控制链路需求收敛（session/thread/审批模型）并分阶段落地。
3. 多设备与多 profile 管理体验增强。

### 3.3 P2（增强项）

1. 更细粒度审批与审计日志。
2. 快捷命令面板与高频工作流预设。
3. 主题与无障碍可用性提升。

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
