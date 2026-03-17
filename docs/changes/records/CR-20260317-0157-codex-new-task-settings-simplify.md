---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段） - 变更记录
status: draft
record_id: CR-20260317-0157-codex-new-task-settings-simplify
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-17
source_of_truth: code
related_code: [public/codex_client.html, public/terminal_client.js, public/lib/codex_settings_view.js, public/terminal_client.css, android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/changes/records/INDEX.md]
---

# CR-20260317-0157-codex-new-task-settings-simplify

## 1. 变更意图（Compact Summary）

- 背景：Android Codex 页面里“新建任务”缺少即时清屏反馈，设置面板同时保留了重复线程入口和“使用服务端默认值”开关，交互不直观。
- 目标：让“新建任务”点击后立即进入空白任务态，并把设置面板收敛为只保留默认配置选项。
- 本次边界：不新增协议；继续复用现有 `codex_new_thread`、`thread/list`、`thread/compact/start` 和会话级 `codexConfig` 存储位。

## 2. 实施内容（What changed）

1. 调整新建任务流程：点击后立即清空当前消息区、运行态、错误态和计划态，进入“正在创建新任务”占位状态；在 `thread/started`、`codex_thread`、`codex_thread_ready`、`codex_turn_ack` 到达后再落真实线程。
2. 为新建任务补充失败回滚：若 websocket 未连接、服务端报错或新建超时，恢复旧线程视图并显示明确错误提示。
3. 简化设置面板：移除“线程操作”区和“使用服务端默认值”复选框，改为 3 个下拉框空值直接表达默认配置，并把状态摘要改成“默认配置 / 已保存配置”可读文案。
4. 提升 WebView 资源版本：同步更新 `codex_client.html`、`terminal_client.html`、`terminal_client.css`、`codex_settings_view.js`、`terminal_client.js` 和 Android `CODEX_URL` 版本号，降低真机缓存命中旧资源的概率。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`public/codex_client.html`、`public/terminal_client.js`、`public/lib/codex_settings_view.js`、`public/terminal_client.css`、`public/terminal_client.html`、`android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
- 模块：Codex 对话页壳子、Codex 新建任务状态机、会话默认配置视图、Android WebView 静态资源加载
- 运行时行为：新建任务会立即清屏；设置面板不再展示线程入口和默认值复选框；空选项直接保存为服务端默认配置

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- public/codex_client.html public/terminal_client.js public/lib/codex_settings_view.js public/terminal_client.css android/app/src/main/java/com/termlink/app/MainShellActivity.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`node --test tests/codexSettingsView.test.js tests/codexClient.shell.test.js tests/codexSecondaryPanel.integration.test.js`
- 结果：通过，覆盖设置 payload、页面壳子结构、历史列表数据形状、以及新建任务即时清屏行为
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/build-debug-apk.ps1`
- 结果：通过，生成 `android/app/build/outputs/apk/debug/app-debug.apk`

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`public/terminal_client.js`、`public/lib/codex_settings_view.js`、`public/codex_client.html`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前只验证了前端集成测试和 APK 构建，尚未做本轮真机点按复测。
2. 本记录仍为 `draft`，待实际提交后需要回填真实 `commit_ref`。
