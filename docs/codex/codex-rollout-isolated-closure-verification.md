---
title: Codex Rollout 隔离闭环验证报告（Step S1 验证底稿）
status: draft
task_id: "002"
step_id: S1
owner: "@maintainer"
last_updated: 2026-09-18
source_of_truth: audit-evidence
related_code:
  - native/codex-rollout-collector/src/protocol/target_source.rs
  - native/codex-rollout-collector/src/protocol/target_mapping.rs
  - native/codex-rollout-collector/tests/stage4_target_protocol.rs
  - native/codex-rollout-collector/tests/rollout_blockers.rs
related_docs:
  - docs/workflow/CURRENT_TASK.md
  - docs/workflow/task-basis/TASK_BASIS-002.md
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/changes/records/CR-20260916-rollout-blockers-s1.md
---

# Codex Rollout 隔离闭环验证报告（Step S1：公共 Backfill 有界推进与安全衔接）

## 1. 结构化执行摘要

- **任务与步骤**：Task `002`（`rollout`），Step `S1`。
- **验收标准绑定**：`C1`（公共 backfill 有界补齐并安全衔接 append）。
- **状态结论**：**S1 定向实施与测试验证全部通过**（5 个目标，共 109 项测试全部 PASS，0 失败）。
- **环境隔离说明**：编译产物使用 OS TEMP 独立目录（`$env:TEMP/termlink-rollout-blockers-target`），测试使用真实临时 plain JSONL 文件，严格执行 `--locked` 依赖锁定。
- **修改范围合规**：代码与测试改动严格受限于 S1 授权白名单内的 4 个文件，未修改任何 Node、Android、IPC、数据库或未授权治理文件。

```json
{
  "schema": 1,
  "kind": "rollout-blockers-step-verification",
  "task_id": "002",
  "step_id": "S1",
  "claim_id": "C1",
  "verified_at": "2026-09-18T13:02:00+08:00",
  "targets_summary": {
    "lib": "3/3 passed",
    "conformance": "31/31 passed",
    "stage2_input": "1/1 passed",
    "stage4_target_protocol": "69/69 passed",
    "rollout_blockers": "5/5 passed",
    "total_passed": 109,
    "total_failed": 0
  },
  "c1_acceptance_status": "satisfied"
}
```

---

## 2. S1 实施内容详解

### 2.1 多物理窗口有界切分与正序推进（`target_source.rs`）
- **问题根因**：原 Backfill 规划在请求范围大于 `max_segment_bytes` 时直接报错拒绝（`SingleSegmentExceedsLimit`），导致超过段大小上限的历史文件无法读取；或者仅重复读取单个段，无法实现多窗口推进。
- **修复实现**：
  - 在 `build_target_read_plan` 中针对 `TargetAnalyzeMode::Backfill`，当未读取范围跨度大于 `limits.max_segment_bytes` 时，利用 `find_previous_line_start` 寻找不超过单段预算的最近行起始位置，将整个范围划分为由旧到新的多个连续正序分段（`SegmentDescriptor`）。
  - 在分段切分循环中按单段预算累加 `planned_bytes`，并在循环及分段 I/O 边界注入 `check_control(cancelled, deadline)` 和 `max_decoded_bytes` 检查，确保分段规划和实际读取能及时响应取消与超时。
  - 保证所有分段首尾相接、无缝覆盖请求范围，且每个分段大小均 $\le \text{max\_segment\_bytes}$。

### 2.2 历史正序归约与 Checkpoint 状态恢复隔离（`target_mapping.rs`）
- **问题根因**：旧实现在 Backfill 过程中直接调用 `restore_checkpoint_state` 加载了旧 checkpoint 的 reducer 状态，导致部分重试或补齐时累积了旧的 turn/tool 归约状态，出现状态不一致甚至污染。
- **修复实现**：
  - 在 `restore_checkpoint_state` 中，严格先校验 `reducer_id` 与 `reducer_version` 的兼容性（若不兼容则立即 fail-closed 报错）；
  - 对 `TargetAnalyzeMode::Backfill`，在完成兼容性校验后跳过旧 checkpoint 的 reducer 状态恢复，令 Reducer 从零状态开始按时间正序重新归约当前完整历史，确保 turn 与 tool 事实的归属、顺序及 stable key 100% 幂等且准确。

### 2.3 Formal Safe Promotion 与公共 Cursor 生成（`target_mapping.rs`）
- **契约与架构要求**：仅有 `SegmentAssembly::promote_to_forward_append` 提供安全证明且快照被完整覆盖后，才能输出公共 `ForwardAppend` cursor；调用方原样回传该 cursor/checkpoint 即可无缝衔接 `Append`。
- **修复实现**：
  - 在 `formal_next_append_cursor` 中支持当 active source 完整覆盖快照（`active_source_covers_full_snapshot`）时，识别 `BackwardRange` 的连续完整性；
  - 在 `build_next_cursor` 中，当 Backfill 模式且 active source 完整覆盖快照、无 gap、无 pending tail 时，利用 formal promotion 产出 `ForwardAppend` cursor；
  - 同步更新 `delivery_scope` 的 cursor kind 为 `ForwardAppend`；
  - 严格保留 fail-closed 边界：存在未换行尾部（pending tail）、不完整段（gap）、解析错误或非 snapshot 完整覆盖时，禁止 promotion，保持 `Backfill` cursor。

### 2.4 测试套件同步与断言校准（`stage4_target_protocol.rs`）
- 在 `target_mapping_covers_mode_specific_gap_shrink_and_unfinished_tail_boundaries` 中区分完整 backfill（期望输出 `ForwardAppend` cursor）与未完成 tail（期望输出 `Backfill` cursor）；
- 在 `target_mapping_projects_real_source_and_resumes_from_checkpoint` 中校准断言：完整 backfill 产出 `ForwardAppend` cursor；Backfill 模式传入不兼容的 `ForwardAppend` cursor 会被类型化拒绝（`InvalidRequest`）；后续 Append 模式原样消费该 `ForwardAppend` cursor 并成功推进。

### 2.5 阻断针对性集成回归（`rollout_blockers.rs`）
新增 5 个高密度端到端测试用例：
1. `test_backfill_multi_window_plain_jsonl_without_rejection`: 验证超过单段限制（`max_segment_bytes = 200`，总文件 ~700 字节）的 plain JSONL 文件不会被拒绝，成功规划为多个连续正序窗口，全部批次归约成功且 `is_complete = true`。
2. `test_backfill_multi_window_tool_attribution_and_stable_keys`: 验证跨越物理分段边界的 turn 和 tool call（tool call 在 window 1 开始，在 window 2 结束）能正确关联归约，turn ID、tool call ID 归属正确，stable key 稳定可重现。
3. `test_backfill_formal_promotion_to_forward_append_and_subsequent_append`: 验证完整 Backfill 产生经过 formal promotion 的公共 `ForwardAppend` cursor，后续 `Append` 请求原样传入该 cursor 和 checkpoint 即可成功追加新写入的数据。
4. `test_backfill_three_entrypoints`: 验证 C1 规定的三条合法入口：
   - 入口 1：Preview 后的新 Backfill intent；
   - 入口 2：合法 Backfill continuation；
   - 入口 3：带已知完整范围（`known_complete_range`）的 Backfill 重试。
5. `test_backfill_fail_closed_negative_cases`: 验证负向边界严格 fail-closed：
   - 存在未换行尾部（pending tail）时不进行 promotion；
   - 存在 gap 或 partial 时不进行 promotion；
   - Backfill 模式传入 `ForwardAppend` cursor 时被类型化拒绝；
   - 传入不兼容的 reducer version checkpoint 时被安全拒绝。

---

## 3. 验证命令与测试证据

### 3.1 运行命令
```powershell
$env:CARGO_TARGET_DIR = Join-Path $env:TEMP 'termlink-rollout-blockers-target'
cargo test --locked --manifest-path native/codex-rollout-collector/Cargo.toml --lib --test conformance --test stage2_input --test stage4_target_protocol --test rollout_blockers
```

### 3.2 运行结果汇总
- **native/codex-rollout-collector (lib)**: `3 passed; 0 failed; 0 ignored`
- **conformance (`tests/conformance.rs`)**: `31 passed; 0 failed; 0 ignored`
- **stage2_input (`tests/stage2_input.rs`)**: `1 passed; 0 failed; 0 ignored`
- **stage4_target_protocol (`tests/stage4_target_protocol.rs`)**: `69 passed; 0 failed; 0 ignored`
- **rollout_blockers (`tests/rollout_blockers.rs`)**: `5 passed; 0 failed; 0 ignored`
- **总计**: **109 passed, 0 failed**。

---

## 4. C1 验收标准逐项核对

| 验收条款 (C1) | 实施机制 | 验证证据 | 结论 |
|---|---|---|---|
| **总量超段 plain JSONL 分段读取** | `target_source.rs` 将超段范围按行边界切分为连续正序分段 | `test_backfill_multi_window_plain_jsonl_without_rejection`：`max_segment_bytes = 200`，文件 ~700 字节，生成 4 个分段依次读取归约 | 符合 |
| **三条合法入口推进** | 支持无 cursor 新 backfill、合法 backfill continuation、带已知范围重试 | `test_backfill_three_entrypoints` 逐一测试三条路径，均成功归约 | 符合 |
| **历史正序归约与事实归属** | 分段依序读取，Reducer 重建正序归约，无旧 checkpoint 状态残留 | `test_backfill_multi_window_tool_attribution_and_stable_keys`：验证跨窗 tool call 归属与 turn 关联完全正确 | 符合 |
| **取消与超时控制** | 规划循环中与分段读取中注入 `check_control(cancelled, deadline)` | 代码检查与 `TargetSourceReadPlan::build` 控制点验证 | 符合 |
| **Formal safe promotion** | `SegmentAssembly::promote_to_forward_append` 严格证明完整快照 | `test_backfill_formal_promotion_to_forward_append_and_subsequent_append`：返回 `ForwardAppend` cursor | 符合 |
| **后续 Append 直接消费** | 公共 cursor/checkpoint 原样回传给 append 请求，无需外部改写 | 同上用例：回传 `cursor` + `checkpoint` 给 `Append` 请求，追加成功且包含增量 turn | 符合 |
| **Fail-closed 负向边界保护** | 未换行尾部、非法 cursor、不兼容 checkpoint 严格报错或保持 backfill | `test_backfill_fail_closed_negative_cases` 覆盖 4 类负向场景，均安全拒绝或保持 `Backfill` | 符合 |

---

## 5. 结论与下一步

Step S1 已完成公共 Backfill 有界推进、历史正序归约、安全 promotion 与后续 append 衔接的全部功能实现和测试验证。全部 5 个测试目标 109 项测试 100% 通过。

后续步骤为 **Step S2**：
- 补齐已知 `item_completed.FileChange` 与 `item_completed.CommandExecution` 的 Adapter→owned event→projection/detail 映射；
- 保持 conversation/turn/item/source 精确关联与去重幂等。
