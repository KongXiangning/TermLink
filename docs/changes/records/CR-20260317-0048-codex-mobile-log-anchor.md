---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段） - 变更记录
status: active
record_id: CR-20260317-0048-codex-mobile-log-anchor
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 311827b
owner: @maintainer
last_updated: 2026-03-17
source_of_truth: code
related_code: [public/codex_client.html, public/terminal_client.css, public/terminal_client.js, tests/codexClient.shell.test.js, android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260317-0048-codex-mobile-log-anchor

## 1. 变更意图（Compact Summary）

- 背景：Android 真机 Codex-only 页面在消息较少时，消息流顶部对齐导致 header 与 composer 之间出现大段视觉空白，影响对话页可用面积判断。
- 目标：将 Codex 消息流改为“少量消息贴近 composer、长消息继续正常滚动”的底部锚定布局，不调整协议和 Android 壳层契约。
- 本次边界：只修改 Codex-only 页面消息流 DOM/CSS 与对应前端写入点；不改 REST、WebSocket、slash、interaction state、原生桥接接口。

## 2. 实施内容（What changed）

1. 在 `public/codex_client.html` 的 `#codex-log` 内新增 `#codex-log-stack`，让滚动容器与消息栈分层。
2. 在 `public/terminal_client.css` 为 `#codex-log-stack` 增加 `min-height: 100%` 与 `body.codex-only` 下的 `justify-content: flex-end`，让少量消息底部贴齐。
3. 在 `public/terminal_client.js` 新增 `getCodexLogContainer()`，统一把日志追加与线程快照清空改为作用于内层消息栈；同时更新资源版本号和壳层 `CODEX_URL`，避免真机继续命中旧缓存。
4. 在 `tests/codexClient.shell.test.js` 增加内层消息栈断言，并同步当前 Codex 页面结构与资源版本号。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `public/codex_client.html`
  - `public/terminal_client.css`
  - `public/terminal_client.js`
  - `tests/codexClient.shell.test.js`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
- 模块：
  - Codex-only 对话页消息流
  - 线程快照回放与 streaming 消息追加
  - Android WebView 静态资源缓存命中路径
- 运行时行为：
  - 少量消息时，最后一条消息应贴近 composer，不再在中段保留大段空白
  - 多条消息时，日志区仍保持向上滚动和自动滚底行为

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- public/codex_client.html public/terminal_client.css public/terminal_client.js tests/codexClient.shell.test.js android/app/src/main/java/com/termlink/app/MainShellActivity.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `node --test tests/codexClient.shell.test.js`
  - `powershell -ExecutionPolicy Bypass -File .\\.codex\\skills\\android-local-build-debug\\scripts\\build-debug-apk.ps1`
  - `powershell -ExecutionPolicy Bypass -File .\\.codex\\skills\\android-local-build-debug\\scripts\\install-debug-apk.ps1 -Serial MQS7N19402011743`
  - `adb -s MQS7N19402011743 exec-out screencap -p`
- 结果：
  - 结构与样式测试需通过
  - 真机截图需确认少量消息时消息栈贴近输入区

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `public/terminal_client.css`
  - `public/terminal_client.js`
  - `tests/codexClient.shell.test.js`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. `#codex-log` 仍是滚动容器，后续如新增依赖日志子节点的逻辑，必须使用内层 `#codex-log-stack`，不要重新直接操作根容器。
2. Android 真机若仍出现额外留白，再单独排查 IME/inset；本次默认不修改原生壳层布局策略。
