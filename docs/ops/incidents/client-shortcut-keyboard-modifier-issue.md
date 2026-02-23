---
title: Client 快捷键盘控制键与触摸滑动异常追踪
status: active
owner: @maintainer
last_updated: 2026-02-23
source_of_truth: code
related_code: [public/terminal_client.js, public/terminal_client.css, public/terminal_client.html, android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/changes/2026-02-quick-toolbar.md, docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md]
---

# Client Shortcut Keyboard Modifier Issue Tracking

Last updated: 2026-02-23

## 问题摘要

当前确认存在两类输入问题：

1. 快捷键盘中的 `Ctrl` 和 `Alt` 按钮未按控制键语义生效，点击后只是输出普通英文字母。
2. 终端上下滑动时，手指按在空白区域较容易拖动；按在已有文字或输出内容上时明显更难滑动。

## 复现步骤

1. 打开 Android 客户端 Terminal 页并展开快捷键盘。
2. 点击 `Ctrl`，再点击任意字母（例如 `C`）。
3. 点击 `Alt`，再点击任意字母（例如 `F`）。
4. 在终端页上下滑动：
   - 按住空白区域拖动，滚动相对顺畅。
   - 按住已有文字/输出区域拖动，滚动明显不顺畅或难以触发。

## 期望与实际

1. 期望：`Ctrl + C` 触发中断（控制字符语义），`Alt + F` 按 Meta/ESC 前缀语义发送。
2. 实际：仅发送普通字母字符，未产生控制键组合行为。
3. 期望：无论手指按在空白还是文字区域，纵向拖动都应可稳定滚动页面。
4. 实际：按在文字/输出区域时，滚动触发率显著下降。

## 影响范围

1. 影响平台：Android 客户端 terminal_client 路径（WebView）。
2. 用户影响：无法使用终端高频组合键，触控输入效率下降。
3. 用户影响：在文本密集区域难以稳定滑动，阅读历史输出体验差。
4. 服务端影响：无直接接口故障，但客户端输入与交互语义错误。

## 关联需求

该问题与新增需求 `REQ-20260223-shortcut-keyboard-modifier-newline` 绑定，后续将一并实现：

1. 修复 `Ctrl/Alt` 控制键语义。
2. 增加“换行”按钮，便于触控快速发送换行。
3. 修复终端内容区域拖动滚动困难问题，统一空白区与文字区的滑动体验。
