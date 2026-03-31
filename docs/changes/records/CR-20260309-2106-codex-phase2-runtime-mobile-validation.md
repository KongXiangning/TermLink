---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）- Android Live Runtime 专项验证
status: active
record_id: CR-20260309-2106-codex-phase2-runtime-mobile-validation
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 6be3bec
owner: @maintainer
last_updated: 2026-03-09
source_of_truth: runtime
related_code: [public/terminal_client.js, public/lib/codex_runtime_view.js, public/codex_client.html, public/terminal_client.css, android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/changes/records/INDEX.md]
---

# CR-20260309-2106-codex-phase2-runtime-mobile-validation

## 1. 变更意图（Compact Summary）

- 背景：前一轮 Android Phase 2 验证只证明了 `Live Runtime` 面板存在，但没有证明其能显示真实 runtime 内容。
- 目标：在 Android 真机上专项验证 `Diff / Plan / Reasoning / Terminal Output` 四个区块是否会从占位文案切换为真实内容。
- 本次边界：只记录专项验证过程与结论，不修改业务代码。

## 2. 实施内容（What changed）

1. 创建临时 Codex 会话 `3620c3b2-06e6-4d4d-96cb-75917f8a76a1`，配置：
   - `approvalPolicy = never`
   - `sandboxMode = workspace-write`
   - `defaultReasoningEffort = medium`
   - `defaultPersonality = pragmatic`
2. 在真机 `MQS7N19402011743` 上冷启动 App 并显式进入该会话。
3. 通过 Android WebView DevTools 在手机页面上下文里发送一条会同时触发 shell 和文件改动的任务：
   - 读取当前目录
   - 列出仓库根目录前 5 个名称
   - 创建 `logs/codex-runtime-validation.txt`
   - 最后给出总结
4. 结合 DOM 快照、真机截图和服务端状态对 `Live Runtime` 四块逐项判定。
5. 验证完成后删除临时文件、强停 App、删除临时 session。

## 3. 验证结果（Runtime Findings）

1. `Diff`：通过。
   - 区块展示了 `logs/codex-runtime-validation.txt` 的新增 diff。
2. `Terminal Output`：部分通过。
   - 区块拿到了非占位内容，但当前展示的是执行命令字符串，而不是命令 stdout。
3. `Plan`：未验证到真实内容。
   - 区块仍为 `Waiting for plan updates...`。
4. `Reasoning`：当前验证样本中未验证到真实内容，后续已收敛为“上游未产出原生事件”。
   - 本轮区块仍为 `Waiting for reasoning updates...`。
   - 后续结合 `thread/read includeTurns=true` 的真实 snapshot 复核，当前 thread 内未出现 `reasoning` item，应归类为“上游未产出原生 reasoning 事件”，不是前端已确认漏消费。
5. 发送链路正常。
   - 页面状态经历 `Codex idle: thread ready -> Codex running: in progress -> Codex idle`
   - `codex-log` 出现新的 `you / commentary / final_answer`
6. 真机 fresh 截图中，顶部 `CONFIG WARNING / DEPRECATION NOTICE` 再次出现空壳显示，说明 Android 端可能仍有告警卡片隐藏残留问题。

## 4. 影响范围（Files/Modules/Runtime）

- 文件：文档记录，无代码改动。
- 模块：Android WebView `Live Runtime` 展示、runtime 事件消费、顶部告警卡片可见性。
- 运行时行为：
  - Android 上 `Diff` 已证明可以展示真实 runtime 内容。
  - `Terminal Output` 当前更接近“执行元信息”而非完整 stdout。
  - `Plan / Reasoning` 在这次专项验证中尚未证明可用。

## 5. 回滚方案（命令级）

```bash
git checkout -- docs/changes/records/CR-20260309-2106-codex-phase2-runtime-mobile-validation.md
git checkout -- docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md
git checkout -- docs/changes/records/INDEX.md
```

## 6. 验证记录（Tests/Checks）

- Android 真机验证：
  - `adb -s MQS7N19402011743 shell am start ... MainShellActivity --es profileId ... --es sessionId ... --es sessionMode codex`
  - `adb -s MQS7N19402011743 exec-out screencap -p`
  - `adb -s MQS7N19402011743 shell am force-stop com.termlink.app`
- WebView DevTools：
  - `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`
  - `http://127.0.0.1:9222/json`
  - `Runtime.evaluate` 触发任务、轮询 `codex-runtime-*` DOM 状态
- 服务端状态观测：
  - `POST /api/sessions`
  - `GET /api/sessions`
  - `DELETE /api/sessions/:id`

## 7. 后续修改入口（How to continue）

1. 若继续收敛 Phase 2，应单独排查为什么 `Terminal Output` 当前只显示命令字符串而不是 stdout。
2. 需要再补一轮更聚焦 `Plan / Reasoning` 的专项验证，确认是 app-server 未产出事件，还是前端未正确消费。
3. 顶部 `CONFIG WARNING / DEPRECATION NOTICE` 的 Android 空壳显示应单独建修复批次处理。
4. `Reasoning` 的后续推进应以“如何稳定触发上游原生 reasoning 事件”为主，而不是继续把问题默认归因到前端展示层。

## 8. 风险与注意事项

1. 本次专项验证刻意把 `approvalPolicy` 设为 `never`，目的是排除审批状态机对 runtime 事件的干扰；结果不能直接外推到 `on-request`。
2. 本次 `Terminal Output` 的“部分通过”不应被当作完全验收通过，直到它能稳定展示 stdout/交互输出。
3. `Reasoning` 在本记录对应的验证批次中不应标记为“前端未通过”；更准确的状态是“当时未见原生事件，后续复核确认为上游未产出”。
