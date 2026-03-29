---
title: 快捷键盘控制键修复、换行按钮与触摸滚动优化 - Android Terminal 回归修复
status: active
record_id: CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix
req_id: REQ-20260223-shortcut-keyboard-modifier-newline
commit_ref: 56739f1
owner: @maintainer
last_updated: 2026-03-29
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/res/values/strings.xml, public/terminal_client.html, public/terminal.html, public/terminal_client.js, public/terminal.js, public/terminal_client.css, public/style.css]
related_docs: [docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md, docs/changes/CHANGELOG_PROJECT.md, docs/changes/records/INDEX.md]
---

# CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix

## 1. 变更意图

- 背景：Android Terminal 页面存在回归问题，终端输出区文字区域无法稳定纵向滑动，且 debug 构建缺少 HTTP 明文通信权限导致真机无法连接开发服务器。
- 目标：统一 `terminal_client.*` 与 `terminal.*` 的触摸滚动路径，修复 debug 网络安全配置的明文权限。顶部键盘按钮保持切换快捷键盘功能不变。
- 本批边界：仅修改 WebView 终端页前端手势逻辑、Android debug 网络配置和相关文档；不改服务端接口或会话协议。

## 2. 实施内容

1. Android 顶栏 `btn_toggle_quick_toolbar` 保持原有行为——仅切换底部快捷键盘显示状态，不干预系统 IME。
2. 统一 `public/terminal_client.js` 与 `public/terminal.js` 的移动端手势逻辑：
   - 隐藏软键盘时都走 blur/readOnly 保护 + `requestHideKeyboard` native bridge。
   - 触摸监听改为 capture 路径，拖动时仅滚动 `.xterm-viewport`，并在拖动结束后抑制焦点回抢。
3. 统一终端容器样式约束：
   - 为 `#terminal-container .xterm` 固定 `height: 100%`。
   - 为 `.xterm-viewport` 明确 `overflow-y: auto`，保持 Web/client 两端一致。
4. 提升终端入口资源版本号：
   - Android WebView 入口 `TERMINAL_URL` 提升到 `v=66`。
   - `terminal_client.html` 与 `terminal.html` 的 JS/CSS 查询参数同步提升，避免命中旧缓存。
5. 修复 review follow-up：
   - 仅在 `.xterm-viewport` 实际可滚动时才把触摸判定为拖动，避免短终端/无 scrollback 时轻微手指位移也吞掉点击聚焦。
   - 放宽 shell 测试中的终端脚本版本断言，避免未来仅变更 cache-bust 参数就导致无意义测试失败。

本批覆盖计划项：`REQ-20260223-shortcut-keyboard-modifier-newline` 第 4 节方案概要中的第 3、4、5 项，以及第 9 节发布计划中的第 4、5 项回归收口。

## 3. 影响范围

- 文件：
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `android/app/src/main/res/values/strings.xml`
  - `public/terminal_client.js`
  - `public/terminal.js`
  - `public/terminal_client.css`
  - `public/style.css`
- 模块：
  - Android MainShellActivity 顶栏交互
  - WebView terminal client 触摸与 IME 交互
  - 浏览器 terminal 页触摸与 IME 交互
- 运行时行为：
  - 顶部键盘图标始终切换快捷键盘面板，不影响系统软键盘。
  - 终端输出区在文字密集区域与空白区域都可纵向拖动查看历史内容。

## 4. 回滚方案

```bash
# 方案 A：回滚本次提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- public/terminal_client.js
git checkout <commit_ref>^ -- public/terminal.js
git checkout <commit_ref>^ -- public/terminal_client.css
git checkout <commit_ref>^ -- public/style.css
```

## 5. 验证记录

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260223-shortcut-keyboard-modifier-newline`
  - `npm test`
- 结果：
  - REQ/CR 文档校验应通过。
  - `check-doc-sync` 应确认本批 `REQ + CR + INDEX + CHANGELOG` 一致。
  - `npm test` 作为仓库级最小回归；Android 真机手势/IME 验证需在后续安装包实测中完成。

## 6. 后续修改入口

- 下次继续从以下文件进入：
  - `public/terminal_client.js`
  - `public/terminal.js`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
- 若后续提交继续修复同需求遗留项，请新增新的 CR，而不是覆写本记录。

## 7. 风险与注意事项

1. capture 阶段触摸接管可能改变部分点击/选择细节，真机回归需重点观察滚动后重新聚焦与文本选择是否异常。
2. 本批未提交 commit，`commit_ref` 仍为 `TBD`；提交后需将本记录状态更新为 `active` 并回填真实 commit SHA。
