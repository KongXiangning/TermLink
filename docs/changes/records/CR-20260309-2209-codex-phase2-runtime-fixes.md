---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）- Phase 2 Live Runtime 展示修复
status: archived
record_id: CR-20260309-2209-codex-phase2-runtime-fixes
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 69212bb
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: runtime
related_code: [public/lib/codex_runtime_view.js, public/terminal_client.js, public/codex_client.html, public/terminal_client.html, tests/codexRuntimeView.test.js, tests/codexClient.shell.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/codex-capability-implementation-plan.md, docs/changes/records/INDEX.md]
---

# CR-20260309-2209-codex-phase2-runtime-fixes

## 1. 变更意图（Compact Summary）

- 背景：Phase 2 的 Android 专项验证确认了三个问题：
  1. `Terminal Output` 更像命令元信息，不是 stdout
  2. `Plan` 原生事件消费不完整或显示为 JSON 对象
  3. Android fresh 页面会因缓存继续加载旧版 `codex_runtime_view.js`
- 目标：补全 runtime 事件/快照映射，让 `Terminal Output` 与 `Plan` 在 Web/Android 上都能显示真实、可读的原生内容，并收紧空壳 warning/deprecation 告警渲染。
- 本次边界：只改共享前端和测试，不改 app-server 协议，也不引入 commentary/agent text 作为 `Plan/Reasoning` 的降级来源。

## 2. 实施内容（What changed）

1. 扩展 `public/lib/codex_runtime_view.js`：
   - 新增 `item/plan/delta` 映射到 `Plan`
   - 扩展 `item/reasoning/*` 对 `summaryText`、`part.summary`、`item.summary` 的支持
   - `commandExecution` snapshot 优先读取真实输出字段：
     - `output`
     - `aggregatedOutput`
     - `stdout`
     - `stderr`
     - `result.*`
   - 不再把 `command` 当作 `Terminal Output` 的兜底内容
   - 为 plan 数组对象提供可读格式化，如 `[completed] Step`
2. 调整 `public/terminal_client.js` 的告警渲染条件，只在 `configWarningText/deprecationNoticeText.trim()` 非空时显示顶层卡片。
3. 提升 `codex_runtime_view.js` 的引用版本号，强制 Android/WebView 加载新资源：
   - `public/codex_client.html`
   - `public/terminal_client.html`
4. 补强单测：
   - `tests/codexRuntimeView.test.js`
   - `tests/codexClient.shell.test.js`

## 3. 验证结果（Runtime Findings）

1. Node 回归通过：
   - `node --check public/terminal_client.js`
   - `node --test .\tests\codexRuntimeView.test.js .\tests\codexClient.shell.test.js`
2. Android 真机 `MQS7N19402011743` 复测通过以下结论：
   - `Terminal Output` 已可从 thread snapshot 重建真实 stdout，不再退化成命令字符串
   - `Plan` 原生事件已被消费，并从 JSON 块改为可读文本，如：
     - `[completed] ...`
     - `[inProgress] ...`
   - 顶部 `CONFIG WARNING / DEPRECATION NOTICE` fresh 状态保持隐藏，不再出现空壳
3. `Reasoning` 在本轮针对性复测中仍未获得原生 runtime 事件；结合 `thread/read includeTurns=true` 的真实 snapshot，可确认当前 thread 内没有 `reasoning` item，因此现阶段归类为“上游未产出”，不是前端未消费。

## 4. 影响范围（Files/Modules/Runtime）

- 文件：
  - `public/lib/codex_runtime_view.js`
  - `public/terminal_client.js`
  - `public/codex_client.html`
  - `public/terminal_client.html`
  - `tests/codexRuntimeView.test.js`
  - `tests/codexClient.shell.test.js`
- 模块：Codex Live Runtime 面板、Android/WebView 资源缓存、顶层告警卡片渲染。
- 运行时行为：
  - `Terminal Output` 优先展示 stdout/stderr/aggregatedOutput
  - `Plan` 可展示原生 plan 事件的结构化文本
  - `Reasoning` 继续坚持 `原生优先` 语义，没有事件时保持占位

## 5. 回滚方案（命令级）

```bash
git revert <commit_ref>

# 或仅恢复关键文件
git checkout <commit_ref>^ -- public/lib/codex_runtime_view.js
git checkout <commit_ref>^ -- public/terminal_client.js
git checkout <commit_ref>^ -- public/codex_client.html
git checkout <commit_ref>^ -- public/terminal_client.html
git checkout <commit_ref>^ -- tests/codexRuntimeView.test.js
git checkout <commit_ref>^ -- tests/codexClient.shell.test.js
```

## 6. 验证记录（Tests/Checks）

- 本地回归：
  - `node --check public/terminal_client.js`
  - `node --test .\tests\codexRuntimeView.test.js .\tests\codexClient.shell.test.js`
- Android 真机：
  - 通过 `android:sync + assembleDebug + adb install -r` 同步 WebView 资产
  - 使用 WebView DevTools 直接读取 `codex-runtime-*` DOM
  - 用 `thread/read includeTurns=true` 验证真实 snapshot item 结构

## 7. 后续修改入口（How to continue）

1. 若继续推进 `Reasoning`，下一步应围绕“如何稳定产出原生 reasoning 事件”做专项验证，而不是继续改前端降级逻辑。
2. 如需让 `Plan` 在 turn 完成后仍保留最后一次原生内容，需要单独决定是否允许“同 thread 内保留上一次原生 runtime 值”；本批未引入该行为。
3. 提交后请把本记录改为 `active` 并回填真实 `commit_ref`。

## 8. 风险与注意事项

1. Android 对 `file:///android_asset/...` 子资源存在缓存，任何共享 runtime 脚本修改都需要同步提升版本号。
2. `Reasoning` 当前仍未通过，不应误报为“前端已修完并验证通过”；准确状态是“前端已支持，当前验证场景未见上游产出原生 reasoning 事件”。
