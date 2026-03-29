---
title: 快捷键盘控制键修复、换行按钮与触摸滚动优化
status: planned
owner: @maintainer
last_updated: 2026-03-29
source_of_truth: product
related_code: [public/terminal_shortcut_input.js, public/terminal_client.js, public/terminal_client.css, public/terminal_client.html, public/terminal.js, public/terminal.html, public/style.css, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/res/layout/activity_main_shell.xml]
related_docs: [docs/ops/incidents/client-shortcut-keyboard-modifier-issue.md, docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/changes/CHANGELOG_PROJECT.md]
---

# REQ-20260223-shortcut-keyboard-modifier-newline

## Meta

- id: REQ-20260223-shortcut-keyboard-modifier-newline
- title: 快捷键盘控制键修复、换行按钮与触摸滚动优化
- priority: P0
- status: planned
- owner: @maintainer
- target_release: 2026-Q1
- links: `docs/ops/incidents/client-shortcut-keyboard-modifier-issue.md`

## Implementation Progress

- 2026-02-24: 已完成快捷键盘 `Ctrl/Alt` 三态修饰、`Shift+Enter` 换行键、本地滚动键映射与首批触摸滚动优化。
- 2026-03-29: 本批修复 Android 终端回归，顶部键盘按钮保持切换快捷键盘功能不变，并统一 `terminal_client.*` / `terminal.*` 的触摸滚动路径；另修复 debug 构建的 HTTP 明文通信权限。

## 1. 背景与目标

当前快捷键盘中的 `Ctrl` 和 `Alt` 仅输出普通字母，未实现控制键组合语义，导致终端常见操作（如中断、跳词、编辑快捷键）不可用。  
同时，触控输入缺少独立“换行”按钮，输入体验不完整。  
另外，终端上下滑动时按在文字/输出内容区域比按在空白区域更难触发滚动，影响可用性。

本需求目标：

1. 修复 `Ctrl/Alt` 在快捷键盘中的控制键行为，使其按终端语义发送。
2. 新增独立“换行(Shift+Enter)”按钮，支持与 `Enter` 分离的输入语义。
3. 优化终端触摸拖动策略，保证文字区与空白区均可稳定纵向滑动。
4. 保持 Android 客户端现有快捷键盘显示与切换机制兼容。

## 2. In Scope

1. 实现 `Ctrl + <key>` 组合键发送逻辑（至少覆盖 A-Z 的控制字符语义）。
2. 实现 `Alt + <key>` 组合键发送逻辑（Meta/ESC 前缀语义）。
3. 新增“换行(Shift+Enter)”按钮并发送 `\n`，保留原 `Enter` 按钮发送 `\r`。
4. 快捷键盘按钮态需可视化区分（普通态/一次性态/持续锁定态）。
5. Android WebView 终端页与浏览器客户端页（如共用 `terminal_client.*`）行为保持一致。
6. 修复终端内容区域触摸拖动的滚动体验，降低“仅空白区可顺畅滚动”的差异。

## 3. Out of Scope

1. 不新增服务端 API。
2. 不改变会话管理与鉴权模型。
3. 不引入完整桌面键盘映射配置系统（例如自定义按键面板）。
4. 不改动服务端会话或 WebSocket 协议。

## 4. 方案概要

1. 在客户端引入快捷键盘控制键状态机，支持 `Ctrl/Alt` 单击一次性、双击锁定、再次点击解锁。
2. 为“换行(Shift+Enter)”新增按钮事件处理并发送 `\n`，同时保留 `Enter` 发送 `\r`。
3. 在 UI 层补齐按钮样式与可访问文案，避免与已有快捷键盘切换逻辑冲突。
4. 调整终端容器触摸事件处理，保证在文本密集区域也可稳定触发页面纵向滚动。
5. 增加最小可回归测试清单，覆盖控制键语义、换行行为与滑动体验。

## 5. 接口/数据结构变更

1. 服务端接口：无变更。
2. 客户端事件：快捷键盘新增“换行”按钮 click 事件。
3. 客户端内部状态：新增/调整控制键状态字段（如 `ctrlArmed`、`altArmed`）与拖动判定状态。
4. 终端输入规则：  
   - `Ctrl + A..Z` 映射控制字符。  
   - `Alt + <key>` 发送 ESC 前缀序列。  
   - `Enter` 按钮发送 `\r`；“换行(Shift+Enter)”按钮发送 `\n`。
5. 客户端触摸规则：文字区域与空白区域的纵向拖动应采用一致滚动策略。

## 6. 验收标准

1. 点击 `Ctrl` 后再点 `C`，终端收到控制语义而非普通字符串 `c`。
2. 点击 `Alt` 后再点 `F`，终端收到 Meta/ESC 前缀语义。
3. 点击 `Enter` 与“换行(Shift+Enter)”时，终端分别收到 `\r` 与 `\n`。
4. 在终端文字密集区域按住拖动，页面滚动成功率与空白区域一致。
5. 快捷键盘展开/收起与输入焦点行为不回退。
6. 不影响已有普通字符按钮输入。

## 7. 测试场景

1. 单键验证：普通字母输入保持不变。
2. 组合键验证：`Ctrl+C`、`Ctrl+L`、`Alt+F`、`Alt+B`，并验证双击锁定可连续生效。
3. Enter/换行验证：`Enter` 发送 `\r`；“换行(Shift+Enter)”发送 `\n`。
4. 滑动验证：按住空白区与文字区分别进行上下拖动，对比滚动触发一致性。
5. 多次切换快捷键盘显示后重复验证，确保状态不串线。
6. Android 真机（至少 1 台）与浏览器页面各执行一轮回归。

## 8. 风险与回滚

1. 风险：控制键状态机可能引入误触发，导致普通输入异常。
2. 风险：触摸事件策略调整可能影响文本选择或点击焦点行为。
3. 缓解：默认单击仅一次性生效，双击才进入锁定并提供明显视觉态；滑动调整需做真机回归。
4. 回滚：若上线后出现输入回归，可临时关闭组合键或滚动优化逻辑并保留原路径。

## 9. 发布计划

1. 文档立项并同步主线（本次）。
2. 客户端实现 `Ctrl/Alt` 组合键语义。
3. 增加“换行”按钮与样式，执行真机回归。
4. 修复文字区拖动滚动困难问题并执行滑动专项回归。
5. 发布后观察输入与滑动相关反馈并补充 CR 记录。
