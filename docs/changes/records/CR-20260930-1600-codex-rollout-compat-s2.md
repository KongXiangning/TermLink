---
title: Rust rollout compatibility S2: formal wire promotion and adapter boundaries
status: draft
record_id: CR-20260930-1600-codex-rollout-compat-s2
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-09-30
source_of_truth: code
related_code: [native/codex-rollout-collector/src/codex_wire, native/codex-rollout-collector/src/codex_adapter/mod.rs, native/codex-rollout-collector/vendor/codex, native/codex-rollout-collector/scripts/verify-vendor-parity.ps1, native/codex-rollout-collector/tests/fixtures]
related_docs: [docs/codex/codex-rollout-collector-architecture.md, docs/codex/codex-rollout-collector-codex-compatibility.md, docs/changes/records/CR-20260930-1509-codex-rollout-compat-s1-repair.md, docs/workflow/CURRENT_TASK.md]
---

# CR-20260930-1600-codex-rollout-compat-s2

## 1. 变更意图（Compact Summary）

- 背景：S1 已在 Spike 中冻结真实 `token_usage_record.payload` envelope，并验证缺字段／错误类型 fail-closed；formal collector 仍未消费同一 wire patch，Adapter 也尚未明确 developer message 与 token usage record 的输出边界。
- 目标：将 S1 的最小 wire 兼容补丁提升到 formal vendor，建立 formal/Spike 字节级 parity guard，并让 Adapter 对 developer 消息保持不可见、对 `token_usage_record` 仅保留诊断，不泄漏正文、binding 或累计 usage carrier。
- 本次边界：仅修改隔离 Rust formal collector、其本地 vendor、fixtures/tests、compatibility/architecture 文档和本 CR；不修改 Node、Android、IPC、数据库、服务部署、Demo 正式实现或 Git 提交。

本批覆盖 adopted plan 的 S2 wire promotion、Adapter boundary、vendor parity、formal conformance 和 sanitized-session-5 unknown-role 证据；不执行 S3 的完整 canonical/backfill 产品接入。CR 初始保持 `draft`，`commit_ref=TBD`。

REQ 的 linked product plan 是 Android/WebView 对话体验与后台保活计划，没有 Rust
rollout-collector 的阶段或 checklist；本批不把隔离基础层误标为产品计划完成，也不改变
REQ 的既有 `done` 状态。当前进度以 adopted Assistance plan、formal compatibility docs
和本 CR 同步记录。

## 2. 实施内容（What changed）

1. 将 Spike 已验证的 payload-wrapped `token_usage_record` patch 以相同字节提升到 formal vendor，并在 formal decode/Adapter 中识别该 envelope；其 payload 只产生 diagnostics-only 事件，不导出 raw usage、累计计数或 session binding。
2. 将 `developer` response message 映射为隐藏诊断；未知 role 继续保持 `UnknownEvent`/partial，serialized `AnalysisBatch` 不包含 developer 正文或内部 metadata sentinel。
3. 新增 formal 与 Spike manifest 的 revision、dependency closure、local patch 列表和实际 patch bytes 校验；同步 formal/source README、compatibility/architecture notes。
4. 扩展 formal current/malformed conformance fixtures、message-role/usage 断言，并把 sanitized-session-5 的 partial 证据改为显式未知 role，避免把已知 developer hidden 语义误当作 unknown。
5. 为 stage3 oracle helper 增加显式 Demo/Spike binary path 选择，保留未提供路径时的现有构建 fallback；不改变 Demo/Spike 源码或其 Cargo manifest。

## 3. 影响范围（Files/Modules/Runtime）

- 模块：formal `codex_wire` decode、`CodexEventAdapter`、formal vendored `codex/history` wire boundary、conformance/stage3 test harness 和 sanitized lineage fixture。
- 运行时行为：真实 payload envelope 可在 formal path 被解析；developer 内容仅保留静态诊断；`token_usage_record` 不生成第二条 usage projection；未知 variant/role 和 malformed payload 仍 fail-closed 并保持 partial。
- 不改变 source reader 的 full/tail/backward/append 语义、lineage source boundary、canonical identity 规则、Node/Android/IPC 接口或正式产品 DTO。

## 4. 回滚方案（命令级）

本批尚未提交，`commit_ref=TBD`。如需定点撤销，按本 CR 的 related_code 与本次 subject diff 恢复，并保留 S1/S1-repair 历史记录；禁止 broad reset/checkout 或回滚其他会话改动。提交后只针对实际 commit 使用 `git revert`。

## 5. 验证记录（Tests/Checks）

- Parity guard 正向通过：revision=`5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2`，三处 patch
  bytes 与 Spike 相同；`history/src/lib.rs` SHA-256=`850e9349d3d680a1cd82872811b1632f627e309f3de6606d190674d4423f044e`、
  `rollout_payload.rs`=`d7c96f0fdbc4d37c027e99b0bb2b6c984f4b53fc42bba2e3cfaf0b6281bec625`、
  `tests.rs`=`f13ed66764ba2789a05fc991fa30274f452c40b9155e9dc1995c26cb42480f00`；临时 formal
  副本篡改 `lib.rs` 后 guard 返回 exit 1，`build_ran=False`。
- Formal `cargo build --locked --manifest-path native/codex-rollout-collector/Cargo.toml` 通过；
  formal conformance 33/33、stage3 explicit Demo/Spike oracle 5/5、stage4 protocol 22/22、
  stage4 target protocol 70/70 通过。stage4 active fixture manifest 更新为 1501 bytes、
  SHA-256=`9c024665ecd6adffafdcd52001a79f3bb0f695fe8009f297ad05842d720afc39`。
- conformance 明确验证 developer 正文与 `hidden-turn-sentinel` 不出现在 serialized
  `AnalysisBatch`，`token_usage_record` 不输出 `response_id`、`thread_token_usage` 或
  `turn_token_usage`，旧 `event_msg/token_count` usage/rate-limit 仍为 120/70 与 12.5%。
- Full `cargo test --locked` 编译成功但整体为 102 passed / 1 failed：唯一失败是未由本批
  修改的 `codex_adapter::tests::compact_tool_input_preserves_nested_absolute_paths_and_object_keys`
  Windows path assertion；本批新增与受影响 conformance/lineage tests 均通过。vendor
  `codex-history` standalone test 未执行：该隔离 workspace 没有 Cargo.lock，`--locked` 会在
  生成 lockfile 前拒绝；未生成或提交 vendor lockfile。
- Formatting：Spike `cargo fmt --check` 通过；formal 全量 fmt 仍被仓库既有未格式化文件阻断，
  本批触及的 decode、rollout payload/tests、conformance、stage3、stage4 文件通过精确
  `rustfmt --check`；formal adapter 尚有既有格式差异，vendor `lib.rs` 保留与 Spike 的
  byte parity。`git -c core.whitespace=cr-at-eol diff --check` 通过。
- 文档：REQ strict 校验通过；本 CR strict 校验通过。`check-doc-sync.ps1` 按项目根执行时仍
  返回“没有 active CR”，因为本批禁止 Git commit 且 CR 必须保持 draft/TBD；该管理状态未
  伪造为通过，REQ/product/roadmap/changelog 内容未改动。

## 6. 后续修改入口（How to continue）

- 完成 S2 execution 后进行独立 review-change；仅在 review disposition 明确通过后进入 S3。
- S3 再验证 formal canonical/backfill、restart/replacement 和完整 lineage projection；不得由本批的 wire/Adapter conformance 推断产品历史发布或 App 接入完成。

## 7. 风险与注意事项

1. `token_usage_record` 的 diagnostics-only 处理不代表完整 usage history projection；既有 `event_msg/token_count` usage 语义保持原路径。
2. developer hidden 不等于 unknown；sanitized-session-5 使用显式未来 role 保持 partial 证据，未知 role 的 fail-closed 仍是正式边界。
3. formal parity guard 只约束隔离 Rust vendor patch 的同步，不能证明外部 Codex app-server 行为、Node source binding、Android IPC 或部署状态。
4. CR 保持 draft/TBD；既有未关联 management record 不猜测归属。
