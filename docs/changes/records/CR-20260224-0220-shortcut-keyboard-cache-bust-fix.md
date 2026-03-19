---
title: 快捷键盘资源版本号统一提升 - 缓存修复记录
status: active
record_id: CR-20260224-0220-shortcut-keyboard-cache-bust-fix
req_id: REQ-20260223-shortcut-keyboard-modifier-newline
commit_ref: 2e4627b
owner: @maintainer
last_updated: 2026-02-24
source_of_truth: product
related_code: [public/terminal_client.html, public/terminal.html, android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md, docs/changes/records/INDEX.md]
---

# CR-20260224-0220-shortcut-keyboard-cache-bust-fix

## 1. 变更意图（Compact Summary）

- 背景：上一轮客户端功能已实现，但静态资源版本号未统一提升，存在缓存命中后加载旧资源的风险。
- 目标：统一提升 Android WebView 与浏览器端入口引用版本，确保修复可被稳定加载。
- 本次边界：仅做资源引用版本号更新，不改业务逻辑。

## 2. 实施内容（What changed）

1. Android WebView 入口版本从 `terminal_client.html?v=20` 提升到 `v=21`。
2. `terminal_client.html` 内 `terminal_client.css`、`terminal_shortcut_input.js`、`terminal_client.js` 的版本参数统一提升到 `v=21`。
3. `terminal.html` 内 `terminal.css`、`terminal_shortcut_input.js`、`terminal.js` 的版本参数统一提升到 `v=2`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `public/terminal_client.html`
  - `public/terminal.html`
- 模块：Android WebView 终端页与浏览器终端页静态资源加载。
- 运行时行为：降低客户端命中旧缓存导致功能不生效的概率。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复资源版本号引用
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- public/terminal_client.html
git checkout <commit_ref>^ -- public/terminal.html
```

## 5. 验证记录（Tests/Checks）

1. `npx cap sync android`
2. `npm test`
3. `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260224-0220-shortcut-keyboard-cache-bust-fix.md -Strict`
4. `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260223-shortcut-keyboard-modifier-newline`

## 6. 后续修改入口（How to continue）

- 若后续继续迭代前端资源，需同步维护版本号与 Android WebView 入口 URL。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. 若后续忘记同步提升版本号，仍可能重复出现“旧资源命中”问题。
2. Android assets 目录被 gitignore 忽略，必须依赖 `npx cap sync android` 保持运行时资源一致。
