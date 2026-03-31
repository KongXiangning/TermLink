---
title: "快捷键盘控制键修复、换行按钮与触摸滚动优化"
req_id: REQ-20260223-shortcut-keyboard-modifier-newline
status: done
cr_count: 5
date_range: "2026-02-23 — 2026-03-29"
last_updated: 2026-03-31
---

# REQ-20260223-shortcut-keyboard-modifier-newline 实施总结

## 概述

实现快捷键盘三态修饰键（Ctrl/Alt 单击一次性、双击锁定、再次解锁）、独立 `Shift+Enter` 换行键，以及终端文字区触摸滚动优化（PgUp/PgDn/Home/End 改为本地视口滚动）。后续修复了 Android 真机触摸滚动回归。

## 实施阶段

### Phase 1 — 需求立项

- **日期**：2026-02-23
- **变更**：文档立项，固化控制键 bug 追踪与需求范围（修饰键 + 换行 + 滑动）
- **关联 CR**：CR-20260223-2136-shortcut-keyboard-modifier-newline-doc-init

### Phase 2 — 核心功能实现

- **日期**：2026-02-24
- **变更**：新增共享模块 `terminal_shortcut_input.js` 处理修饰键状态机；双端接入 Shift+Enter 换行键；优化终端触摸滚动（驱动 `.xterm-viewport` 纵向滚动）；补充自动化测试
- **关联 CR**：CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1

### Phase 3 — 缓存修复

- **日期**：2026-02-24
- **变更**：统一提升 Android WebView 与浏览器端静态资源版本号，避免命中旧缓存
- **关联 CR**：CR-20260224-0220-shortcut-keyboard-cache-bust-fix

### Phase 4 — 滚动键行为优化

- **日期**：2026-02-24
- **变更**：PgUp/PgDn/Home/End 改为本地终端视图滚动，不再向远端进程透传；换行键布局优化
- **关联 CR**：CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix

### Phase 5 — Android 触摸滚动回归修复

- **日期**：2026-03-29
- **变更**：统一 `terminal_client.*` 与 `terminal.*` 的移动端手势逻辑；触摸监听改为 capture 路径；修复 debug 网络安全配置；仅可滚动时才判定为拖动
- **关联 CR**：CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix

## 影响范围

- **影响模块**：client（快捷键盘、触摸滚动）/ android（WebView 手势、网络配置）/ docs
- **核心文件**：`public/terminal_shortcut_input.js`、`public/terminal_client.js`、`public/terminal.js`、`public/terminal_client.html`、`public/terminal.html`

## 验收结果

需求已全量交付。修饰键三态行为稳定，换行键可用，终端视口滚动流畅，Android 真机回归已修复。
