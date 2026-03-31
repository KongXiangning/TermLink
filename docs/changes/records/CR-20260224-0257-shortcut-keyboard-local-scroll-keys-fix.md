---
title: 快捷键盘本地滚动键与换行键布局优化 - 修复记录
status: archived
record_id: CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix
req_id: REQ-20260223-shortcut-keyboard-modifier-newline
commit_ref: 11767d3
owner: @maintainer
last_updated: 2026-02-24
source_of_truth: product
related_code: [public/terminal_client.html, public/terminal.html, public/terminal_client.js, public/terminal.js]
related_docs: [docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md, docs/changes/records/INDEX.md]
---

# CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix

## 1. 变更意图（Compact Summary）

- 背景：触摸滑动在真机上仍不顺畅，且用户希望快捷键栏提供更直接的“查看历史输出”能力。
- 目标：将 `PgUp/PgDn/Home/End` 改为本地终端视图滚动，不再向远端进程透传；同时优化换行键布局占位。
- 本次边界：仅客户端快捷键行为与布局调整，不涉及服务端改动。

## 2. 实施内容（What changed）

1. 在 `terminal_client.js` 与 `terminal.js` 增加 `handleLocalViewportScrollKey`，将 `PgUp/PgDn/Home/End` 绑定为本地滚动动作（xterm viewport）。
2. 按键事件处理优先本地滚动，命中后不再发送 WS 输入消息到远端 shell。
3. 将 `Newline` 键移动到第二行末尾并使用符号 `⏎`；第三行保留 `Enter` 且恢复更宽占位。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `public/terminal_client.html`
  - `public/terminal.html`
  - `public/terminal_client.js`
  - `public/terminal.js`
- 模块：Android WebView 终端页与浏览器终端页快捷键栏行为。
- 运行时行为：翻页/跳顶底键现在用于本地浏览输出历史，不再控制远端程序。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- public/terminal_client.js
git checkout <commit_ref>^ -- public/terminal.js
git checkout <commit_ref>^ -- public/terminal_client.html
git checkout <commit_ref>^ -- public/terminal.html
```

## 5. 验证记录（Tests/Checks）

1. `node --check public/terminal_client.js`
2. `node --check public/terminal.js`
3. `npm run android:sync`
4. `android\\gradlew.bat :app:assembleDebug`
5. `install-debug-apk.ps1 -Serial da34332c`
6. 真机验证：`PgUp/PgDn/Home/End` 可直接滚动终端历史输出。
7. `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix.md -Strict`
8. `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260223-shortcut-keyboard-modifier-newline`

## 6. 后续修改入口（How to continue）

- 若后续希望“长按切换本地/远端滚动模式”，建议继续扩展：`public/terminal_client.js`、`public/terminal.js`。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. 该改动改变了 `PgUp/PgDn/Home/End` 的语义，远端程序将不再收到这些按键输入。
2. 若后续有用户依赖远端语义，需要补充可切换机制或增加独立“远端键模式”入口。
