---
title: 快捷键盘控制键修复、换行按钮与触摸滚动优化 - 实施记录
status: archived
record_id: CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1
req_id: REQ-20260223-shortcut-keyboard-modifier-newline
commit_ref: e975244
owner: @maintainer
last_updated: 2026-02-24
source_of_truth: product
related_code: [public/terminal_shortcut_input.js, public/terminal_client.js, public/terminal_client.css, public/terminal_client.html, public/terminal.js, public/terminal.html, public/style.css, tests/terminal_shortcut_input.test.js]
related_docs: [docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md, docs/changes/records/INDEX.md]
---

# CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1

## 1. 变更意图（Compact Summary）

- 背景：快捷键盘 `Ctrl/Alt` 未提供组合语义；`Enter` 与“换行”语义未分离；终端文字区触摸滚动体验不稳定。
- 目标：实现三态修饰键（一次性/锁定）、新增独立 `Shift+Enter` 换行键（`\n`），并统一文字区与空白区的拖动滚动行为。
- 本次边界：仅客户端实现与关键自动化回归，不涉及服务端协议和 API。

## 2. 实施内容（What changed）

1. 新增共享模块 `public/terminal_shortcut_input.js`，统一处理修饰键状态机与虚拟按键映射（Enter=`\r`，Newline=`\n`，Ctrl/Alt 组合语义）。
2. 双端接入（`terminal_client.*` + `terminal.*`）：增加 `Shift+Enter` 按钮，Ctrl/Alt 支持单击一次性、双击锁定、再次点击解锁，并同步按钮状态样式。
3. 优化终端触摸滚动：在文字密集区拖动时直接驱动 `.xterm-viewport` 纵向滚动，减少误触聚焦；补充 `node:test` 用例 `tests/terminal_shortcut_input.test.js`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `public/terminal_shortcut_input.js`
  - `public/terminal_client.js`
  - `public/terminal_client.css`
  - `public/terminal_client.html`
  - `public/terminal.js`
  - `public/terminal.html`
  - `public/style.css`
  - `tests/terminal_shortcut_input.test.js`
  - `docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md`
- 模块：Android WebView 终端页、浏览器终端页、快捷键输入状态机、触摸滚动手势处理。
- 运行时行为：Ctrl/Alt 由“输出普通字符”改为“组合键修饰态”；新增独立换行按键发送 `\n`。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- public/terminal_shortcut_input.js
git checkout <commit_ref>^ -- public/terminal_client.js
git checkout <commit_ref>^ -- public/terminal.js
git checkout <commit_ref>^ -- public/terminal_client.html
git checkout <commit_ref>^ -- public/terminal.html
git checkout <commit_ref>^ -- public/terminal_client.css
git checkout <commit_ref>^ -- public/style.css
```

## 5. 验证记录（Tests/Checks）

1. `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md -Strict`
2. `node --check public/terminal_client.js`
3. `node --check public/terminal.js`
4. `node --check public/terminal_shortcut_input.js`
5. `npm test`
6. `npx cap sync android`
7. `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md -Strict`
8. `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260223-shortcut-keyboard-modifier-newline`

## 6. 后续修改入口（How to continue）

- 后续增强（如更多 Ctrl 组合映射）优先修改：`public/terminal_shortcut_input.js`。
- 如需继续优化触摸与焦点策略：`public/terminal_client.js`、`public/terminal.js`。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. 滚动优先策略会弱化终端文字区文本选择体验。
2. 修饰键锁定态依赖点击节奏（双击判定窗口），需持续做真机回归确认。
