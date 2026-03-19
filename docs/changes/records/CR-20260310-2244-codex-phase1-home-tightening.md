---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段） - 变更记录
status: active
record_id: CR-20260310-2244-codex-phase1-home-tightening
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 3552d38
owner: @maintainer
last_updated: 2026-03-11
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt, package.json, package-lock.json, public/codex_client.html, public/terminal_client.html, public/terminal_client.css, public/terminal_client.js, public/lib/codex_shell_view.js, tests/codexClient.shell.test.js, tests/codexShellView.test.js, tests/codexSecondaryPanel.behavior.test.js, tests/codexSecondaryPanel.integration.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260310-2244-codex-phase1-home-tightening

## 1. 变更意图（Compact Summary）

- 背景：当前 Codex 首页仍延续 `Threads / Session Defaults / Live Runtime` 常驻堆叠布局，与“对话页优先”的新主线不一致。
- 目标：实施 Phase 1 首页收口，把首页改为状态摘要、当前线程摘要、消息流和输入区优先，次级能力通过二级入口访问。
- 本次边界：仅修改共享 WebView 资源与前端测试，不改 REST / WebSocket 协议，不引入 slash registry 或 interaction state。

## 2. 实施内容（What changed）

1. 重构 `public/codex_client.html` 头部结构，新增线程摘要入口、二级导航与线程面板内 `New Thread` 入口，并将静态文案切换为中文。
2. 新增 `public/lib/codex_shell_view.js`，统一封装二级入口可用性、`Interrupt` 显隐和线程摘要文案；`public/terminal_client.js` 接入 `secondaryPanel` 状态并改为单面板展开。
3. 调整 `public/terminal_client.css` 与测试，确保 Codex 首页默认不展示常驻大面板，同时保持 sticky composer 和手机紧凑布局可用。
4. 提升 Android 壳层静态资源版本号，确保真机 WebView 拿到最新首页收口资源而不是命中旧缓存。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `public/codex_client.html`
  - `public/terminal_client.html`
  - `public/terminal_client.css`
  - `public/terminal_client.js`
  - `public/lib/codex_shell_view.js`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `tests/codexClient.shell.test.js`
  - `tests/codexShellView.test.js`
  - `tests/codexSecondaryPanel.behavior.test.js`
  - `tests/codexSecondaryPanel.integration.test.js`
- 模块：
  - Codex WebView 对话页壳层
  - Codex 前端显示状态与二级面板控制
  - Codex 前端 shared helper 与默认态自动化测试
- 运行时行为：
  - Codex 首页默认收口为对话主线
  - `Threads / Session Defaults / Live Runtime / 非阻塞 warning` 默认关闭，改为二级入口
  - `Interrupt` 仅在运行相关状态或兼容字段提示下显示
  - Android WebView 通过资源版本号提升强制刷新到最新壳层资源

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本轮首页收口相关文件
git checkout <commit_ref>^ -- public/codex_client.html
git checkout <commit_ref>^ -- public/terminal_client.html
git checkout <commit_ref>^ -- public/terminal_client.css
git checkout <commit_ref>^ -- public/terminal_client.js
git checkout <commit_ref>^ -- public/lib/codex_shell_view.js
git checkout <commit_ref>^ -- tests/codexClient.shell.test.js
git checkout <commit_ref>^ -- tests/codexShellView.test.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `node --check public/terminal_client.js`
  - `node --check public/lib/codex_shell_view.js`
  - `node --test tests/codexClient.shell.test.js tests/codexShellView.test.js tests/codexSecondaryPanel.behavior.test.js tests/codexSecondaryPanel.integration.test.js`
- 结果：
  - 全部通过；本轮执行共 31 项通过，0 失败。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `public/terminal_client.js`
  - `public/codex_client.html`
  - `public/terminal_client.css`
  - `public/lib/codex_shell_view.js`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前仅完成 Phase 1 收口，slash registry、`/model`、`/plan`、`interactionState` 仍未实现，后续 Phase 2 需要继续沿用新 header 和 `secondaryPanel` 语义扩展。
2. 本轮保留了现有后端 `codex_state.status` 语义，`Interrupt` 的最终精细显示规则仍需在后续服务端提供更明确状态时继续校准。
