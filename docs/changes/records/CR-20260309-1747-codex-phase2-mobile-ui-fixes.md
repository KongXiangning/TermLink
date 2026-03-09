---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）- Phase 2 手机端 UI 与恢复时机修复
status: draft
record_id: CR-20260309-1747-codex-phase2-mobile-ui-fixes
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: runtime
related_code: [public/terminal_client.js, public/lib/codex_bootstrap.js, public/codex_client.html, public/terminal_client.html, public/terminal_client.css, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, tests/codexBootstrap.plan.test.js, tests/codexClient.shell.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260309-1747-codex-phase2-mobile-ui-fixes

## 1. 变更意图（Compact Summary）

- 背景：Android Phase 2 验证暴露了 3 类问题：新线程未物化时误读 `thread/read`、`stored=null` 的设置回填语义混淆、手机端 Codex 面板滚动不可达。
- 目标：让手机端首屏不再报未物化线程错误，设置面板准确表达 `server defaults` 语义，并保证 `Session Defaults -> Live Runtime -> 输入区` 连续可达。
- 本次边界：只修手机端 WebView 共享前端和 Android 资源版本，不改 Phase 2 业务协议。

## 2. 实施内容（What changed）

1. 在 `codex_bootstrap` 和 `terminal_client` 中引入 `unmaterializedThreadId/pendingFreshThread` 保护，避免新线程创建后在首条用户消息前触发 `thread/read`。
2. 调整 `stored=null` 时的设置回填语义：
   - `Use server defaults` 勾选
   - `Approval` 和 `Sandbox` 显示 `Server default`
3. 提升 Web 端和 Android WebView 入口的资源版本号，避免手机端继续命中旧缓存。
4. 调整手机端 Codex 页面布局为整页滚动 + 粘底输入区，保证 `Session Defaults`、`Live Runtime` 和输入区在小屏上连续可达。
5. 更新对应壳层测试和 bootstrap 纯逻辑测试。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `public/terminal_client.js`
  - `public/lib/codex_bootstrap.js`
  - `public/codex_client.html`
  - `public/terminal_client.html`
  - `public/terminal_client.css`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `tests/codexBootstrap.plan.test.js`
  - `tests/codexClient.shell.test.js`
- 模块：Codex 线程恢复时机、会话级设置面板回填、Android WebView 资源加载、手机端布局滚动策略。
- 运行时行为：
  - 新线程未物化时不再产生 `thread ... is not materialized yet` 首屏噪音。
  - `stored=null` 不再伪装成已存储的 `never/workspace-write`。
  - 手机端 `Session Defaults -> Live Runtime -> 输入区` 可连续到达。

## 4. 回滚方案（命令级）

```bash
git revert <commit_ref>

# 或仅回滚关键文件
git checkout <commit_ref>^ -- public/terminal_client.js
git checkout <commit_ref>^ -- public/lib/codex_bootstrap.js
git checkout <commit_ref>^ -- public/codex_client.html
git checkout <commit_ref>^ -- public/terminal_client.html
git checkout <commit_ref>^ -- public/terminal_client.css
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- tests/codexBootstrap.plan.test.js
git checkout <commit_ref>^ -- tests/codexClient.shell.test.js
```

## 5. 验证记录（Tests/Checks）

- `node --check public/terminal_client.js`
- `node --test .\tests\codexBootstrap.plan.test.js .\tests\codexClient.shell.test.js`
- Android 真机验证：
  - WebView 资源版本提升后重装 APK
  - 验证首屏不再出现未物化线程错误
  - 验证 `Use server defaults` 语义修复
  - 验证手机端滚动可达性

## 6. 后续修改入口（How to continue）

1. 若继续推进手机端 Phase 2，下一步应围绕 `Live Runtime` 的非占位内容做专项验证。
2. 若后续提交这轮修复文档，请在提交后把本记录改为 `active` 并回填真实 `commit_ref`。
3. 如继续修改 Android 共享 Web 资产，必须同步维护版本号和 WebView 入口 URL。

## 7. 风险与注意事项

1. Android assets 目录当前未纳入这次 git 变更；运行时资源仍依赖 `cap sync android` 与 APK 重装保证一致。
2. 本次只修前端呈现与恢复时机，不代表 `Live Runtime` 四个区块已经在所有 prompt 类型下都能产出内容。
