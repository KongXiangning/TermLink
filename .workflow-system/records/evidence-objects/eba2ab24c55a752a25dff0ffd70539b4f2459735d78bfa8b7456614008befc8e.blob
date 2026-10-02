---
title: TASK-005 S2 App 缓存事件事实展示修复
status: draft
record_id: CR-20261002-1230-task005-s2-app-event-facts
req_id: none
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-02
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt, android/app/src/test/resources/codex_product_db_event_facts.json]
related_docs: [docs/codex/codex-history-product-contract.md, docs/workflow/CONTRACTS.md, docs/workflow/DECISIONS.md]
---

# CR-20261002-1230-task005-s2-app-event-facts

## 1. 变更意图

本批覆盖 TASK-005 既有采用计划的 S2：具体结构化事件字段在 App 可见。没有关联的 REQ/PLAN Markdown；计划来源为 Assistance adopted plan key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650。本批通过 execution 同步计划进展，S2 不自动结束。

用户本轮授权最小 App 历史字段展示修复及必要验证，解除此次修复的无产品代码限制。原有其余排除项保留。

## 2. 实施内容

- 缓存文本投影读取 Node 产品 `eventFacts[].payload` 的已知正文、input/output 与路径、cwd、command 字段。
- 保留顶层正文和事实兼容，不递归展开 event envelope 或 provenance，不修改 payload、页哈希、coverage 或缓存 schema。
- 扩展现有 ViewModel 回归，使用 Node provider 生成的事件事实 fixture；实际工具输入原值保留，输出缩减为确定性 fixture 值。验证空白卡片缺陷与内部字段不展示。

## 3. 影响范围

仅上述 Android 文本投影、现有测试与 fixture，以及本 CR；没有 Node/Rust/IPC 协议、authority、selection 或服务配置变更。
契约：CONTRACTS「Codex 原生会话实时同步核心」、AD-004、AD-022；healthy IPC 继续掌管实时字段。

## 4. 回滚方案

本批未提交。审查后如需放弃，仅撤销本 CR 所列变更，保留其他工作；提交后可 `git revert <本批实际 commit_ref>`。安装前保存原 APK 与本地数据备份，兼容回滚使用 `adb -s MQS7N19402011743 install -r <备份 APK>`；未修改 schema，无需恢复或清空缓存。

## 5. 验证记录

- `node --test tests/codexOwnerSurfaceTracker.test.js tests/terminalGateway.codexIpc.test.js`：139 passed，0 failed。
- JDK 21：`:app:testDebugUnitTest` 选择 `CodexViewModel*`、`CodexIpcWireModelTest`、`CodexHistoryWireTest`、`CodexHistoryRangeStorageTest`、`CodexHistoryPageHashTest`，279 tests，0 failures/errors/skipped；任务实际执行。`:app:assembleDebug` 成功。
- Node fixture 输出缩减后两条新增聚焦回归及全部上述 JVM selectors 再次实际执行通过。最终 XML 保存于 `logs/task005-s2-app-display-repair-20261002/jvm-final-results`。初次保存 XML 的 Copy-Item 使用了错误相对路径并失败，后续正确保存最终输出，不把失败当成功。
- 安装前备份原 APK 与本地 databases/shared_prefs；`install -r` 成功，未清理缓存、未改变 schema。备份仅保存在私有 gitignored logs，未附带上传。
- MQS7N19402011743，目标 `01a0ee04-a775-72b3-bd07-04aac804a3b4`：屏幕可见 `git rev-parse HEAD; git show --stat --oneline --no-renames HEAD; git status --short --branch` 和 `file:///E:/coding/LawAgent`。完整 input+output 文本只匹配 `tool:exec-05292237-6358-4f2e-b60a-b80fdbcde06b`，避免将另两个同 input 的 item 混认。字段为 `eventFacts[0].payload.input`；Node/cache payload 一致。
- 新同步 14 个 ACK 均 `ok=true/state=partial`，syncId/pageIndex/pageHash 与已提交 cache page 对应。98/98 item payload 与 Node 一致，Diagnostic 0；App coverage 仍 partial。
- 可见 item 使用已有持久缓存，updated_at 保持原先 2026-09-30；本轮证明新版 App 展示与正常刷新 ACK，不把该旧行时间或旧 source 发布认作本轮新采集/发布。
- 安装前后其他 385 条 item 完全一致，133 个索引均保留，shared_prefs 哈希与服务配置列一致；service.last_seen_at 正常更新。未手工修改产品 DB、远端数据或服务配置。
- `git diff --check`：修复新增行的混合 CRLF 后通过；保留未改行原始换行。
- CR Strict validator：失败，原因 `req_id format invalid: none`；没有关联 REQ，不伪造 ID。CR 保持 draft/TBD。
- 原始输出、截图/XML 和逐页同步证据：`logs/task005-s2-app-display-repair-20261002/physical-evidence.json`。没有新建 formal review、完成 S2、执行 S3/S4 或 Git 提交。

## 6. 后续修改入口

本批修复后先 review-change；S2 仍 in-progress，S3 完整详情与 S4 扩展场景未执行。不以本批推导全量 coverage 或独立审查通过。

本批完成 S2 缓存结构化事件字段展示修复与必要验证，待当前版本审查和步骤处分；进度由 Assistance execution 保存于当前采用计划。本批不重写以前的 pass-with-limits 或失败记录。

## 7. 风险与注意事项

- 仅显示已知文本业务字段，不承诺任意对象详情 UI；完整按需详情属于 S3。
- 维持已有 bounded partial 语义，不重复清理缓存，不手工改 DB 或远端数据。
- 无关联 REQ，req_id=none 诚实保留；旧 CR validator 只接受 REQ 格式时记录其失败，不伪造需求 ID。commit_ref=TBD，保持 draft。
