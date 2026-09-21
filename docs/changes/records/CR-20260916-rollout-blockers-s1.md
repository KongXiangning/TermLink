---
title: 修复 rollout 采集阻断并验证隔离闭环 - S1 变更记录（公共 backfill 有界补齐与安全衔接）
status: draft
record_id: CR-20260916-rollout-blockers-s1
req_id: C1
commit_ref: TBD
owner: @maintainer
last_updated: 2026-09-20
source_of_truth: code
related_code:
  - native/codex-rollout-collector/src/protocol/target_source.rs
  - native/codex-rollout-collector/src/protocol/target_mapping.rs
  - native/codex-rollout-collector/src/source/segment.rs
  - native/codex-rollout-collector/src/source/mod.rs
  - native/codex-rollout-collector/tests/stage4_target_protocol.rs
  - native/codex-rollout-collector/tests/rollout_blockers.rs
related_docs:
  - docs/workflow/CURRENT_TASK.md
  - docs/workflow/task-basis/TASK_BASIS-002.md
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/codex/codex-rollout-isolated-closure-verification.md
---

# CR-20260916-rollout-blockers-s1

## 1. 变更意图（Compact Summary）

- **背景**：针对 Plain JSONL 历史文件，当文件总大小超出单段上限（`max_segment_bytes`）时，原 Backfill 模式因缺乏多窗口规划能力而直接报错拒绝；此外在 checkpoint 恢复逻辑中未区分 Backfill 与增量恢复，导致旧 reducer 状态被错误累积，且未按契约要求将完整覆盖的快照通过 `SegmentAssembly::promote_to_forward_append` 进行 formal safe promotion。
- **目标**：实现 C1 验收标准与现行契约规范：
  1. 实现公共 Backfill 的多物理窗口有界切分与正序推进，对大于 `max_segment_bytes` 的范围按换行边界切分为连续正序段读取，不整源超段拒绝。
  2. 在分段规划循环与边界 I/O 中严格执行 `check_control(cancelled, deadline)` 与 `max_decoded_bytes` 约束，保障取消与超时能及时响应。
  3. 修复 Backfill 恢复逻辑：先校验 Reducer ID 与 Version 兼容性，再确保 Backfill 全量历史正序从零归约，消除旧 checkpoint 状态污染。
  4. 当 plain JSONL 快照被完整连续覆盖时，通过 formal promotion 安全证明输出公共 `ForwardAppend` cursor 与 checkpoint，供调用方原样回传直接消费用于 Append。
  5. 负向场景（如未换行尾部 pending tail、gap、partial、解析诊断、不兼容 cursor 等）保持严格 fail-closed，不伪造 `ForwardAppend`。
- **本次边界**：仅限 Runtime repair preflight 登记的 candidate paths，不修改 Node、Android、IPC、产品数据库或未授权治理文件；本轮完成后仍须独立 review。

## 2. 实施内容（What changed）

1. `native/codex-rollout-collector/src/protocol/target_source.rs`:
   - 在 `plan_active_source` 中让 prefix/suffix `known_complete_range` 只读取缺失物理范围，interior range fail-closed；缺失范围按行边界划分为连续正序分段。
   - source bridge 只保留最后一个物理窗口，较早窗口写入 OS TEMP 下的短生命周期 spool；规划循环、backward boundary seek/read 与分段 I/O 均检查 `check_control(cancelled, deadline)`，并保持 aggregate `max_decoded_bytes`。
   - **本波次（`finding-63fad9ec`）**：移除生产源码内新增的单元测试 `boundary_scan_honors_cancellation_after_io_has_started`，恢复已确认的持久化测试资产边界；等价 in-flight 控制证据改由已准入测试文件的公共边界用例承载（见第 4 项）。
   - **终态 promotion rebuild（有界）**：当调用方已证明过部分覆盖、且缺失范围不再到达 snapshot 末端（已知 suffix）或已无缺失范围（覆盖完整）时，`plan_active_source` 把读取范围扩为整个 snapshot，但仍走**同一套有界物理窗口切分**（不再 `plan_full`，避免绕过 `max_segment_bytes` 并把整段历史留在单个 plan）；已知 prefix 的续读仍只补读缺失 suffix。`lineage_read_complete` 改以 `plans_cover_full_source` 判定，使完整覆盖的续读与单窗口基线得到一致的完整性归类。
2. `native/codex-rollout-collector/src/protocol/target_mapping.rs`:
   - 在 `formal_next_append_cursor` 中支持当 active source 完整覆盖快照（`active_source_covers_full_snapshot`）时，识别 `BackwardRange` 的连续完整性。
   - 在 `build_next_cursor` 中，当 Backfill 模式且 active source 完整覆盖快照、无 gap、无 pending tail 时，利用 formal promotion 产出 `ForwardAppend` cursor。
   - 同步更新 `delivery_scope` 的 cursor kind 为 `ForwardAppend`。
   - 在 `restore_checkpoint_state` 中，严格先校验 `reducer_id` 与 `reducer_version` 的兼容性（若不兼容则立即 fail-closed 报错）；对 `TargetAnalyzeMode::Backfill` 在完成兼容性校验后跳过旧 checkpoint 的 reducer 状态恢复，确保 turn 与 tool 事实的归属、顺序及 stable key 正确。
   - mapping 在同一次遍历中逐条消费 spool，并以每个 source 的有界 byte frontier 去重，只保留 adapter/reducer 与摘要化 cursor/checkpoint 元数据；formal promotion 使用有界 record summary，不再构造全量 raw-record 或 record-key/digest `Vec/Map`，仍唯一通过 `SegmentAssembly::promote_to_forward_append`。公共 batch 保留必要的 TermLink-owned events，不把 raw records 作为累计中间集保留。
   - **本波次（`finding-63fad9ec`）**：新增 `caller_known_complete_range` 与 `accumulated_complete_range`，`build_next_cursor` 的 Backfill 分支改为返回**累计覆盖**（调用方已证明范围 ∪ 本轮实测范围，仅在可证明连续时合并，歧义返回 `None`），并用传入 cursor 的 line/ordinal 边界补齐累计端点；读取阶段因此不再重放已知字节，覆盖单调推进到 `[0, snapshot_len]` 终态。
   - **本波次（`finding-910c2159`）**：去重改为维护**本次 replay 已接受记录**的有界身份摘要（source + 字节区间 → 128 位内容摘要，上限 4096 条，超出按最旧淘汰）：只有此前已接受的同位置内容完全相同才 `Duplicate`，内容不同或原始证据已淘汰/从未接受则 `ConflictingOverlap`（未接受的篡改副本不能互相证明）；`map_target_source_read_inner` 在 `overlap_conflict` 时**完全不调用** formal promotion，使包括 append `ForwardRange` 在内的所有 cursor 路径都不发布 `ForwardAppend`。证据为固定上限摘要，不保留全历史 raw record。
3. `native/codex-rollout-collector/tests/stage4_target_protocol.rs`:
   - 校准现行契约断言：完整 backfill 产出 `ForwardAppend` cursor；Backfill 模式传入不兼容的 `ForwardAppend` cursor 会被类型化拒绝（`InvalidRequest`）；后续 Append 模式原样消费该 `ForwardAppend` cursor 并成功推进。
4. `native/codex-rollout-collector/tests/rollout_blockers.rs`:
   - **本波次**：既有 5 个用例强化断言，并新增 1 个公共边界用例（`test_backfill_deadline_stops_io_in_flight`），共 6 个 test 实例；仍全部位于已准入的 `rollout_blockers.rs`，未新增测试文件，也未在生产源码内保留测试资产。
   - `test_backfill_multi_window_plain_jsonl_without_rejection`：由最后一个物理窗口范围独立推导行数，断言 resident raw records 不超过该窗口行数且严格少于全文件行数（不再只断言“少于全文件”）；并以同一未变 fixture 的单窗口读取（50000 字节上限、1 个 segment）为独立 oracle，断言单窗口驻留记录数严格更多，而 history/tool/mutations/completeness 与多窗口结果完全相等（有界驻留 handoff 不改变确定性正序输出与稳定逻辑 key）。
   - `test_backfill_multi_window_tool_attribution_and_stable_keys`：把 tool detail input 的 `is_some()` 强化为与 fixture arguments 在 `REDACTED_LOCAL_PATH` 脱敏策略下的精确值比较，并断言不包含本机工作区路径。
   - `test_backfill_formal_promotion_to_forward_append_and_subsequent_append`：追加一个 ordinals 17..19 的完整增量 turn（`turn-3`），断言 append 读取范围严格为追加区间，且 append batch 实际归约出 `turn-3` 的 TurnStarted 与该追加 agent_message（文本与 turn 归属），而非只推进公共 cursor。

## 3. 影响范围（Files/Modules/Runtime）

- **文件**：
  - `native/codex-rollout-collector/src/protocol/target_source.rs`
  - `native/codex-rollout-collector/src/protocol/target_mapping.rs`
  - `native/codex-rollout-collector/src/source/segment.rs`
  - `native/codex-rollout-collector/src/source/mod.rs`
  - `native/codex-rollout-collector/tests/stage4_target_protocol.rs`
  - `native/codex-rollout-collector/tests/rollout_blockers.rs`
  - `docs/codex/codex-rollout-isolated-closure-verification.md`
  - `docs/changes/records/CR-20260916-rollout-blockers-s1.md`
- **模块**：Codex Rollout Collector Rust 隔离基础层。
- **运行时行为**：
  - 公共 Backfill 模式支持处理超过单段大小的 plain JSONL 文件，自动切分为多个连续正序窗口读取。
  - 完整覆盖的 Backfill 产出经 formal promotion 的公共 `ForwardAppend` cursor，可直接用于 subsequent `Append`。
  - Backfill 模式拒绝不兼容的 cursor（如直接传入 `ForwardAppend` cursor 报错 `InvalidRequest`）。
  - 取消和超时约束在多窗口切分与读取中立即生效。

## 4. 回滚方案（命令级）

```bash
# 方案 A：恢复修改的代码与测试文件
git checkout HEAD -- \
  native/codex-rollout-collector/src/protocol/target_source.rs \
  native/codex-rollout-collector/src/protocol/target_mapping.rs \
  native/codex-rollout-collector/tests/stage4_target_protocol.rs

# 方案 B：移除新增的测试与文档
rm native/codex-rollout-collector/tests/rollout_blockers.rs
rm docs/codex/codex-rollout-isolated-closure-verification.md
rm docs/changes/records/CR-20260916-rollout-blockers-s1.md
```

## 5. 验证记录（Tests/Checks）

- **验证命令**：
  ```powershell
  $env:CARGO_TARGET_DIR = Join-Path $env:TEMP 'termlink-rollout-blockers-target'
  cargo test --locked --manifest-path native/codex-rollout-collector/Cargo.toml --test rollout_blockers
  cargo test --locked --manifest-path native/codex-rollout-collector/Cargo.toml --test conformance --test stage2_input
  ```
- **结果**：
   - conformance: 31 passed（兼容性/阶段 regression）
   - stage2_input: 3 passed（兼容性/阶段 regression）
   - rollout_blockers: 6 passed（C1 acceptance target）
   - **本 repair wave 定向 targets 总计：40 passed, 0 failed, 0 ignored**；其中 6 项属于 C1 acceptance evidence（`rollout_blockers`），34 项为兼容性/阶段 regression（`conformance` 31 + `stage2_input` 3）。
   - `stage4_target_protocol` 未在本 repair wave 运行；历史通过结果只作为普通 regression，不计入本波次 acceptance evidence；gap/解析诊断/不兼容 reducer checkpoint 也不在本波次 acceptance 结论中。
 - **静态检查**：
   - `git diff --check`：**非零退出**。唯一发现是受保护的 `docs/workflow/task-basis/TASK_BASIS-002.md:210` 行尾空白（Runtime 按上一轮授权原文逐字写入的 `/prepare-task ` 行）。该文件不在本步候选路径内、改写会破坏受控恢复 grant 的 `decision_sha256`，且无 slot 拥有该命令因此无法 waiver；remediation review 已将其登记为 `FORMAT_CHECK_SCOPE_BLOCKED` 的**非业务范围阻断**并保留，不计入业务结论，也不作为通过。
   - `git diff --name-only`：累计工作区 diff 同时包含本波次 preflight 登记的 5 个 candidate paths、此前波次的源码/测试路径以及 Runtime 治理与 task-data 路径；本波次实际修改路径仅为 preflight 登记的 `target_mapping.rs`、`target_source.rs`、`rollout_blockers.rs`、验证报告与 CR 这 5 个文件。

## 6. 后续修改入口（How to continue）

- 下一入口为 **`review-change`**：先按 Runtime repair receipt 独立复核本波次；review clean 后再由任务状态决定是否进入 Step S2。

## 7. 风险与注意事项

1. **行边界与未换行尾部**：分段切分依赖 `find_previous_line_start` 定位换行符；若历史文件末尾存在未换行的残缺行（pending tail），必须严格识别为未完成尾部，禁止 promotion 为 `ForwardAppend`。
2. **内存预算**：多窗口切分虽然解除了单段大小限制，但必须遵守整体 `max_decoded_bytes` 预算；旧窗口 raw records 仅进入 OS TEMP spool，映射阶段按记录流式消费并只跨窗携带每个 source 的有界 byte frontier、Adapter/Reducer 状态和公共输出所需的 owned events，spool 由 source result 生命周期回收。现有 persistent assertion 只证明固定 fixture 下 `TargetSourceRead` 驻留记录数不超过最后一个物理窗口的完整行数，未测量峰值 RSS/allocator residency，不能单独作为完整资源上界证明。
3. **脱敏策略**：tool detail 的 input/output 会经 `codex_adapter` 的 sanitize 策略处理（绝对本机路径替换为 `<local-path-redacted>`）；断言与实现必须同时保持“保留允许内容”和“不泄漏本机路径”，不得为让断言通过而放宽脱敏。
4. **去重语义（本波次收紧）**：只有与**本次 replay 已接受**的同位置内容相同的重叠才判重复；内容不同、原始证据已被上限淘汰或从未被接受的记录一律按冲突处理（batch 降为 Partial 且不 promotion）。这是有意的 fail-closed：宁可不发布完整/promotion，也不静默丢弃未证明内容，更不允许未接受的副本互相证明。
5. **promotion 边界（本波次明确）**：公共 `ForwardAppend` 仍只由 `SegmentAssembly::promote_to_forward_append` 的 formal 证明产生，且该证明要求**本次读取**的完整记录证据。续读的终态因此以**有界多窗口**方式重建该证据（已知 prefix 首轮仍只补缺失 suffix）；代价是一次完整 snapshot 读取，换来可消费的终态 cursor，未改变 `SegmentAssembly` 入口，也未把累计覆盖本身当作证明；重建期间窗口与驻留上界由既有 `max_segment_bytes` / spool 交接保证。
