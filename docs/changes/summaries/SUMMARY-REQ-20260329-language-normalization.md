---
title: "基于系统语言的应用语言自动适配与 i18n 框架建设"
req_id: REQ-20260329-language-normalization
status: done
cr_count: 4
date_range: "2026-03-29 — 2026-03-30"
last_updated: 2026-03-31
---

# REQ-20260329-language-normalization 实施总结

## 概述

建立统一的 i18n 框架，实现 Web 全量字符串迁移至语言包（中/英），Android 原生 `strings.xml` 多语言支持，以及 WebView 与原生层之间的语言桥接自动同步。

## 实施阶段

### Phase 1 — 需求立项与文档建设

- **日期**：2026-03-29
- **变更**：需求立项；定义 i18n 框架边界、实施阶段与验收标准
- **关联 CR**：CR-20260329-1500-language-normalization-req-init

### Phase 2 — i18n 框架与 Web 全量字符串迁移

- **日期**：2026-03-30
- **变更**：实现 i18n 核心框架（语言检测、语言包加载、翻译函数）；Web 端全量 UI 字符串迁移至中英语言包（terminal、terminal_client、workspace、codex_client 及所有 codex lib 模块）
- **关联 CR**：CR-20260330-0100-language-normalization-phase1-2-impl

### Phase 3 — Android 原生 i18n 与 WebView 语言桥接

- **日期**：2026-03-30
- **变更**：Android 原生层 `strings.xml` 多语言适配；WebView 加载时通过 bridge 同步系统语言到 Web 页面
- **关联 CR**：CR-20260330-0300-language-normalization-phase3-android

### Phase 4 — 收口验收与最终同步

- **日期**：2026-03-30
- **变更**：全量验证通过；REQ 状态更新为 done；主线文档同步
- **关联 CR**：CR-20260330-0500-language-normalization-closeout

## 影响范围

- **影响模块**：client（全量 Web 页面 i18n 迁移）/ android（strings.xml 多语言、WebView 语言桥接）/ docs
- **核心文件**：`public/terminal.html`、`public/terminal_client.html`、`public/workspace.html`、`public/codex_client.html`、`public/lib/codex_*.js`、`android/app/src/main/res/values/strings.xml`、`MainShellActivity.kt`

## 验收结果

需求已全量交付。中英双语全量覆盖，系统语言自动检测与切换正常，Android 原生与 WebView 语言同步一致。
