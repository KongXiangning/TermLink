---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）- Android Phase 2 完整交互验证
status: archived
record_id: CR-20260309-1719-codex-phase2-mobile-validation
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 04896a4
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: runtime
related_code: [public/terminal_client.js, public/codex_client.html, public/terminal_client.css, android/app/src/main/assets/public/terminal_client.js, android/app/src/main/assets/public/codex_client.html, android/app/src/main/assets/public/terminal_client.css, android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/codex-capability-implementation-plan.md, docs/changes/records/INDEX.md]
---

# CR-20260309-1719-codex-phase2-mobile-validation

## 1. 变更意图（Compact Summary）

- 背景：Phase 2 已完成会话级设置面板、运行态区块和 Android WebView 资源同步，需要用真机验证“页面可达性 + 设置交互 + 基本运行态链路”。
- 目标：验证 Android 端 `Session Defaults`、`Limits`、`Send -> running -> final_answer -> idle` 主链路，并记录 `Live Runtime` 区块的当前可见性结论。
- 本次边界：仅记录验证过程与结论，不新增业务代码。

## 2. 实施内容（What changed）

1. 基于当前仓库服务端（`PORT=3010`）和真机 `MQS7N19402011743` 进行 Android Phase 2 回归。
2. 通过显式 `sessionId/profileId/sessionMode` 参数将 App 拉回目标 Codex 会话 `af577dbb-af3f-42ed-a669-f82c75bef3cd`。
3. 先验证手机端页面可达性和 `Session Defaults` 回填，再验证 `Limits` 状态刷新。
4. 使用 Android WebView DevTools 直接在手机页面上下文里触发 `Send`，规避坐标点击在 WebView 中的不稳定性。
5. 结合截图、WebView DevTools DOM 快照和 `/api/sessions` 状态确认运行结果。

## 3. 验证结果（Runtime Findings）

1. 手机端可稳定进入目标 Codex 会话，且 `Session Defaults` 回填正确：
   - `Reasoning = Medium`
   - `Personality = Pragmatic`
   - `Approval = On Request`
   - `Sandbox = Workspace Write`
2. 手机端 `Session Defaults -> Live Runtime -> 输入区` 连续可达性已成立，输入区在滚动后仍保持可操作。
3. `Limits` 按钮有效，页面状态会更新为 `Rate limit snapshot refreshed.`。
4. 通过 WebView DevTools 触发 `Send` 后，页面状态经历：
   - `Codex idle`
   - `Codex running: in progress`
   - `Codex idle`
5. `codex-log` 记录了新一轮 `you / final_answer`，本次验证 prompt 为 `give a 3 step plan then final answer ok`，结果返回：
   - `1. Identify the required response structure.`
   - `2. Provide a concise 3-step plan.`
   - `3. Return the final answer exactly.`
   - `Final answer: ok`
6. 当前这类纯文本 prompt 下，`Live Runtime` 四个区块仍保持占位文案：
   - `Diff`
   - `Plan`
   - `Reasoning`
   - `Terminal Output`
7. `CONFIG WARNING / DEPRECATION NOTICE` 顶部告警卡片在 fresh 页面状态下保持隐藏，没有出现空壳残留。

## 4. 影响范围（Files/Modules/Runtime）

- 文件：文档记录，无代码改动。
- 模块：Android WebView 资产加载、Codex 设置面板、额度快照入口、Codex 发送链路、运行态区块可见性。
- 运行时行为：Android Phase 2 页面已具备完整基础交互，但 `Live Runtime` 是否展示非占位内容仍取决于 app-server 是否产生相应 runtime 事件。

## 5. 回滚方案（命令级）

```bash
# 文档回滚
git checkout -- docs/changes/records/CR-20260309-1719-codex-phase2-mobile-validation.md
git checkout -- docs/codex/codex-capability-implementation-plan.md
git checkout -- docs/changes/records/INDEX.md
```

## 6. 验证记录（Tests/Checks）

- Android 真机验证：
  - `adb -s MQS7N19402011743 shell am start ... MainShellActivity --es profileId ... --es sessionId ... --es sessionMode codex`
  - `adb -s MQS7N19402011743 exec-out screencap -p`
  - `adb -s MQS7N19402011743 shell input swipe ...`
- WebView DevTools：
  - `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`
  - `http://127.0.0.1:9222/json`
  - `Runtime.evaluate` 读取 DOM 状态、点击 `Limits`、触发 `Send`
- 服务端状态观测：
  - `GET /api/sessions`

## 7. 后续修改入口（How to continue）

- 若继续收敛 Phase 2：
  1. 补一轮“能稳定产生 runtime 事件”的专项验证，例如命令型 prompt，用于确认 `Diff / Plan / Reasoning / Terminal Output` 不只是占位文案。
  2. 增加浏览器/WebView 级集成测试，覆盖 `Limits`、`Send` 和运行态区块状态切换。
  3. 若后续提交这轮验证文档，请在提交后把本记录改为 `active` 并回填真实 `commit_ref`。

## 8. 风险与注意事项

1. 坐标点击在 Android WebView 中不稳定，本次 `Send` 和 `Limits` 的最终确认依赖 WebView DevTools 页面上下文触发。
2. 当前 `Live Runtime` 区块未出现非占位内容，不应误判为手机端 UI 缺失；它更可能是“这类 prompt 没产出对应 runtime 事件”。
3. 本次验证会话 `af577dbb-af3f-42ed-a669-f82c75bef3cd` 仍保留，便于后续继续做 runtime 专项验证。
