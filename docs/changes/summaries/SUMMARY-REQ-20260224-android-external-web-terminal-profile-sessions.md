---
title: "Android External Web 终端（Profile/Sessions 同级）POC"
req_id: REQ-20260224-android-external-web-terminal-profile-sessions
status: done
cr_count: 1
date_range: "2026-02-24 — 2026-02-24"
last_updated: 2026-03-31
---

# REQ-20260224-android-external-web-terminal-profile-sessions 实施总结

## 概述

在 Android 客户端新增 `EXTERNAL_WEB` 终端类型支持，使外部网页终端可纳入 Profile/Sessions 统一管理。支持本地 session 持久化、凭据热更新与 WebView 分流加载。

## 实施阶段

### Phase 1 — 完整 POC 实现

- **日期**：2026-02-24
- **变更**：数据模型新增 `TerminalType` 与 `ServerProfile.terminalType`；新增 `ExternalSessionStore`（SharedPreferences + JSON）实现本地 session CRUD；`SessionsFragment` 按类型分流（TERMLINK_WS 走 API、EXTERNAL_WEB 走本地存储）；`SettingsFragment` 新增终端类型下拉；`MainShellActivity` 按类型切换 WebView 加载目标；External 模式隐藏快捷键盘；实现凭据热更新签名机制
- **关联 CR**：CR-20260224-1636-android-external-web-terminal-poc

## 影响范围

- **影响模块**：android（数据模型、Settings、Sessions、WebView 分流）/ docs
- **核心文件**：`ServerProfile.kt`、`ExternalSessionStore.kt`、`SessionsFragment.kt`、`SettingsFragment.kt`、`MainShellActivity.kt`

## 验收结果

POC 已交付。EXTERNAL_WEB Profile 可创建、选择、删除；会话本地持久化正常；凭据变更可触发同 URL 重载。
