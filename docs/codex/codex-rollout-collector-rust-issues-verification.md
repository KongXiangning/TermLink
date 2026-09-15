---
title: 当前 Rust 业务测试执行证据与问题核查工作底稿
status: draft
task_id: "001"
step_id: S2
owner: "@maintainer"
last_updated: 2026-09-14
source_of_truth: audit-evidence
related_code:
  - native/codex-rollout-collector/tests/business_history_audit.rs
  - native/codex-rollout-collector/tests/support/run_business_history_audit.cjs
related_docs:
  - docs/codex/codex-rollout-collector-business-test-matrix.md
  - docs/workflow/CURRENT_TASK.md
---

# 当前 Rust 业务测试执行证据（S2）

2026-09-15 S3-R1 恢复说明：S1/S2/S3 的已提交成果和失败记录保留；当前证据以本次重验及核实文档 §9 为准。以下旧轮次中“当前”“S3/S4未推进”等措辞只描述当时状态。原 S3 结论被后续证据重新打开；本轮只更正审计，不实施修复。六条 deferred finding、未到达断言、未执行 Node/DB/App 验证均未被本次消除。

## 1. 本次结果与证据边界

**R5执行：完整采集成功，产品未通过。** 当前冻结runner完成构建、32例枚举、逐例执行及既有回归：19例通过，13例为业务差异（R01、R02、R04、R05、R06、R07、R08、R09、R11、R13、R14、R15、R29）；conformance 31/31与stage4_target_protocol 70/70均通过。`collectionPass=true`、`productPass=false`：前者只证明审计采集完整，后者保留业务差异，不能推导产品通过、完整矩阵覆盖或九项问题成立。当前报告的测试哈希为`cda39c250ebe65c21381e3a279d57aac98a2dbbc2160113f507f0c98d88ae3f6`，runner哈希为`2a2136953480112dea53bd44cf19c7caf0c58059b47f97e8c9f19cf6557426a1`；报告和旧attempt在OS TEMP/termlink-rust-issues-audit/current及其`attempts`归档。六项质量意见仍待独立核查，S3/S4未推进。证据为caller-reported。

### 1.1 R5结构化执行摘要（2026-09-14 历史记录）

2026-09-14T12:40:34.941Z 至 2026-09-14T12:41:04.525Z，冻结 runner 重新生成的 OS-TEMP `current/report.json` 是本步骤唯一的当前结构化来源；其 SHA-256 为 `b81003e0facf971e7dce1f73cf5d4d439354a8f47b4e0e98bdf0c4606edc3939`。以下是该 schema 4 报告的可审计摘要；完整逐例 expected/actual、命令和归档仍以该报告及 `attempts/` 为准。

```json
{
  "schema": 4,
  "kind": "current-rust-business-audit",
  "startedAt": "2026-09-14T12:40:34.941Z",
  "finishedAt": "2026-09-14T12:41:04.525Z",
  "collectionPass": true,
  "productPass": false,
  "caseCounts": {
    "total": 32,
    "passed": 19,
    "businessDifferences": 13
  },
  "businessDifferenceIds": ["R01", "R02", "R04", "R05", "R06", "R07", "R08", "R09", "R11", "R13", "R14", "R15", "R29"],
  "existingRegression": {
    "conformance": "31/31",
    "stage4_target_protocol": "70/70",
    "exit": 0
  },
  "hashes": {
    "native/codex-rollout-collector/tests/business_history_audit.rs": "cda39c250ebe65c21381e3a279d57aac98a2dbbc2160113f507f0c98d88ae3f6",
    "native/codex-rollout-collector/tests/support/run_business_history_audit.cjs": "2a2136953480112dea53bd44cf19c7caf0c58059b47f97e8c9f19cf6557426a1"
  },
  "reportSha256": "b81003e0facf971e7dce1f73cf5d4d439354a8f47b4e0e98bdf0c4606edc3939",
  "assurance": "caller-reported"
}
```

**R5上一轮历史尝试：构建失败，未开始测试。** 本轮保留原始ordinal 0，将已定位的descriptor拒绝改为精确类型化边界记录，分离assembly/promotion依赖与真实Adapter/Reducer、有序参考、公共读取；runner增加边界分类与独立阶段到达检查。上述修改均未完成验证。构建在business_history_audit.rs:409出现E0283：`ordered_records.into_values().collect()`缺少集合类型；这是本轮测试代码编译错误，不是Rust产品缺陷，也不是ordinal业务差异。入口退出1、collectionPass=false，32例及101旧回归均未运行。原始build.stderr.txt/report.json保留于OS TEMP/termlink-rust-issues-audit/current，旧attempt保留；六项质量意见仍待验证，S3/S4未推进。证据为caller-reported。

R4解释补正：DATA契约允许非负rollout ordinal，旧formal descriptor要求正数，故ordinal 0不能笼统称作非法fixture。原始R4失败是测试unwrap未处理这一层间差异；未改原始失败事实，尚未据此判定产品缺陷。以下R4及更早记录均为历史。

**R4执行更新（历史）：仍未完成采集。** 本轮已移除非法preview checkpoint拼接，并新增真实内部分窗/状态恢复/重放/promotion观测、多差异采集和依赖断言保护。构建与32例枚举通过；R01记录complete差异，R02在内部SegmentDescriptor创建时返回`InvalidRolloutOrdinalRange`（business_history_audit.rs:347）。合成fixture自ordinal 0开始，formal descriptor要求有效ordinal范围，前置兼容性未处理。该未分类panic令runner退出1，collectionPass=false；不能作为产品缺陷或成功业务差异。R02本轮公共preview/backfill尚未到达，R03–R32及101旧回归未执行，六项修复未验证完成。

当前报告为OS TEMP/termlink-rust-issues-audit/current/report.json；此前attempt由runner原样归档。下方repair第1轮和21/11完整采集均为旧版本历史记录，不证明当前资产通过；当前结果以本节R5的19/13和`collectionPass=true`/`productPass=false`为准，不推进S3/S4。

**repair第1轮历史状态：S2采集失败，未完成验证。** 下方32例/101回归及原JSON是修复前历史证据，绑定旧测试hash，不适用于当前已修改资产。六项review finding均待验证，不认领已解决。

该历史轮次保持32个case，编译与枚举通过；R01到达原complete业务差异，R02已验证preview精确正文[U4,A4]，随后在发送Backfill前触发测试请求校验错误：`InvalidField { field: "cursor", message: "must match persisted_anchor.cursor" }`。原因是本轮helper保留preview checkpoint却令request.cursor=None；不能将tail cursor强转为backfill。该错误属于测试请求，不是Rust产品缺陷，runner退出1、collectionPass=false。R03–R32以及旧101回归本轮未执行。该历史轮次未取得完整32例报告，不沿用旧21通过作为当前结果。

该历史轮次原始日志在OS TEMP的`termlink-rust-issues-audit/current/r02_recent_then_backward.stdout.txt`、`.stderr.txt`及`report.json`；修复前证据由runner归档至同目录attempts。已修改但未完成验证的内容包括多batch消费、跨窗padding/无turn_id输入、ACK前增长时序、富字段及lineage/recovery断言和类型化错误分类。需先解决合法preview→backfill衔接方式，再完成核查；公共接口没有物理W2单独重放命令，不能把整个request重试计为W2重放。

### 修复前完整采集（历史，以下各节同此适用范围）

仅当前 worktree，32个独立命名测试函数/执行数据例：20个业务场景、12个预算变体。**21通过、11差异待核查**，实际到达59个业务断言（48符合、11不符）。失败用例停在首次不符；其后断言没有执行，不能认领完整流程覆盖。运行器退出0代表完整采集成功，绝不代表产品全绿。

既有回归：conformance 31/31、stage4_target_protocol 70/70，共101/101通过；与32例分开，不计为新增业务例。既有测试中source读取/ACK/lineage可作局部回归，但rich fields非空、any和注入batch不代替真实文件与精确集合。新suite复用了正式API、wire类型和测试方式，未改旧测试文件，未把包含旧suite的执行再次统计成业务场景。

本报告是S2执行底稿，不是S3九项问题最终定论。11例可能共享原因；不能推导为11个缺陷，也不能按九项台账逐一认定成立。实际修复与Gemini复用判断尚未开始，Gemini没有构建/测试/写入。Node staging、DB事务、Node→App消息、IPC仲裁均未执行。

## 2. 可复跑入口

在仓库根目录 PowerShell：
```powershell
node native/codex-rollout-collector/tests/support/run_business_history_audit.cjs --output "$env:TEMP/termlink-rust-issues-audit/current"
```

运行器用当前Cargo.lock执行--locked，target-dir=$env:TEMP/termlink-rust-issues-audit/current-target。先--no-run、--list验证32例，再按--exact逐例执行，最后运行两个旧suite。普通cargo执行失败case仍退出101；没有ignore、should_panic或将产品断言改为当前错误值。

运行器仅将稳定case ID、结构化expected/actual和唯一对应业务panic归档为差异。编译、fixture decode、stdout超时/断开、未分类panic或旧回归失败仍令入口退出1。每次重跑先归档已有report/stdout/stderr到output/attempts/<timestamp>，不抹去失败记录。fixture输出精确UTF-8 JSONL和LF，正常已知输入先通过vendored facade decode；未知F7三事件为明确兼容测试输入。stdout保留AUDIT_INPUT/AUDIT_SEND/AUDIT_RECV/AUDIT_SEGMENTS/AUDIT_RESULT以及断言。生成文件只在OS TEMP，读取后清理自身受检目录；输入原文仍在日志中，并可由持久化生成器重建。

## 3. 用例清单及实际到达的断言

下表“通过”只针对列出的已实现并到达断言，不扩大为关联矩阵整行跨层通过。R02/R06/R09在多窗读取前置处失败，后续关联/去重/收敛未到达；R13/R15在replacement数量处失败，后续有效内容断言未到达。R14无replacement检查通过，但complete预期不符。R21–32是输入阈值下/等于/超过，不是12个不同用户流程。

| 执行ID | Rust test函数 | 矩阵关联 | 结果 | 到达的断言 |
|---|---|---|---|---|
| R01 | r01_small_history | A03 | 差异待核查 | body_order, complete；首次失败=complete |
| R02 | r02_recent_then_backward | A02,A04,H08,H13 | 差异待核查 | tail_contains_latest, batch；首次失败=batch |
| R03 | r03_append_after_snapshot | A05,F01 | 通过 | body_order, logical_body_count, merged_content |
| R04 | r04_empty_source | A06 | 差异待核查 | body_order, outcomes, complete；首次失败=complete |
| R05 | r05_source_not_yet_created | A07 | 通过 | missing_not_empty_success |
| R06 | r06_tool_details | H01,H07 | 差异待核查 | source_result；首次失败=source_result |
| R07 | r07_file_changes | H02,H07 | 差异待核查 | exact_file_paths；首次失败=exact_file_paths |
| R08 | r08_completed_command | H03 | 差异待核查 | one_completed_command；首次失败=one_completed_command |
| R09 | r09_multiple_plan_answers | H04,H14 | 差异待核查 | source_result；首次失败=source_result |
| R10 | r10_per_turn_usage | H05 | 通过 | per_turn, last_rate |
| R11 | r11_failure_not_success | H06 | 通过 | not_completed, body_order |
| R12 | r12_unknown_events | H09,H10 | 通过 | unknown_count, partial, known_text, only_target |
| R13 | r13_resend_completed | F02 | 差异待核查 | parent_unchanged, replacement_count；首次失败=replacement_count |
| R14 | r14_resend_unfinished | F03 | 差异待核查 | parent_unchanged, no_replacement, partial；首次失败=partial |
| R15 | r15_restart_skips_middle_head | F04 | 差异待核查 | parent_unchanged, replacement_count；首次失败=replacement_count |
| R16 | r16_branch_isolation | F05 | 通过 | body_order, branch_scope, A_unchanged |
| R17 | r17_ack_loss_restart | E03,E14 | 通过 | batch_id, segment_id, items, complete |
| R18 | r18_negative_ack_retry | E08 | 通过 | negative_terminal, batch_id, segment_id, items, complete |
| R19 | r19_cancel_then_read | E11 | 通过 | cancel_terminal, body_order |
| R20 | r20_unfinished_line_resume | G01 | 通过 | half_not_complete, whole_complete, new_turn |
| R21 | r21_line_below_prefix | G09 | 通过 | long_item_retained |
| R22 | r22_line_equal_prefix | G09 | 通过 | long_item_retained |
| R23 | r23_line_over_prefix | G09 | 通过 | over_limit_not_canonical |
| R24 | r24_line_below_no_prefix | G09 | 通过 | long_item_retained |
| R25 | r25_line_equal_no_prefix | G09 | 通过 | long_item_retained |
| R26 | r26_line_over_no_prefix | G09 | 通过 | over_limit_not_canonical |
| R27 | r27_segment_below | G10 | 通过 | long_item_retained |
| R28 | r28_segment_equal | G10 | 通过 | long_item_retained |
| R29 | r29_segment_over | G10 | 差异待核查 | source_result；首次失败=source_result |
| R30 | r30_decoded_below | G10 | 通过 | long_item_retained |
| R31 | r31_decoded_equal | G10 | 通过 | long_item_retained |
| R32 | r32_decoded_over | G10 | 通过 | over_limit_not_canonical |

## 4. 未执行及不能替代的部分

- 全矩阵仍为99主场景、89命名变体，不与32相加。逐主场景状态见矩阵§10；新suite未覆盖的Rust字段一律保持未执行，而非自动继承旧suite通过。
- F06–F08、G02–G08/G12有旧输入层/target局部回归，但本次不据函数名认领其整行精确业务断言；压缩、异常lineage、多head等待后续选择。
- H06只执行failed；H08/H13只有R02原生ID输入且后续身份断言未到达；H14不执行V75 fallback。H09未穷尽可选字段/unsafe envelope变体。
- I01–I10保留策略未执行，不能用工具存在或输入字节预算替代详情保留/截断策略。
- R17是ACK缺失后真实Rust重启与同job新request重交付，不证明Node durable receipt或E03同request有限重发ACK全部流程；R18只用V25负ACK；R19在真实batch待ACK时取消，不证明Node抢占调度。
- R10证明四turn UsageUpdated最后值和最后primary rate字段，未据此宣称最终Node存储/finalMetrics接口全部字段通过。
- R02使用无cursor的合法普通backfill开启补早，不把tail cursor强转backfill/append。R03/R13–15/R20用普通append的formal promotion获得合法forward cursor；没有新mode。
- PlanUpdate wire拒绝额外id字段：PU31/PU32用explanation作输入标识、不同source ordinal区分版本；answer/action保留native ID。不能把该适配声称为wire拥有PlanUpdate native ID。
- A02/J01最近页在完整backfill前向App发布的GAP-04仍未闭合；本suite不能解决或验证该产品契约。

## 5. 执行中测试自身修正（不作业务缺陷）

首轮未增加已知输入decode校验，出现15通过/17差异候选。这不是有效缺陷统计。随后修正：
1. 合成普通用户消息使用真实user_message carrier，避免仅response_item user副本被适配器忽略干扰其他测试。
2. 不把TailPreview/Backfill cursor传给不同mode，分别使用合法初始backfill与append promotion。
3. CommandExecution.cwd改用wire规定file:///C:/audit；原C:/audit触发fixture decode失败，入口真实退出1。
4. PlanUpdate移除wire禁止的id字段；原输入触发fixture decode失败，入口真实退出1。保留不同版本输入与answer/action IDs。
5. 加入完整mapped结果日志及明确超限错误/安全cursor断言，校正末行安全字节终点。

上述失败及输入保留在TEMP attempts目录。当前最终结果仅绑定§1.1所列 schema 4 报告及其哈希；§6的旧 JSON 只作历史保留，不能混用为当前证据。没有修改产品源码/既有fixture/协议以使测试通过。

## 6. 修复前完整结构化执行证据（仅历史）

以下 JSON 是 2026-09-14T04:32:31.103Z 至 2026-09-14T04:33:11.472Z 的修复前完整报告，原样保留以审计旧 21/11 采集和输入修正过程。它的 `schema: 1`、时间戳、case 结果及测试/runner 哈希均不代表当前 R5 状态；JSON 内的 `kind` 是当时输出的原始字段，不会把它提升为当前证据。当前唯一结构化记录为§1.1的 schema 4 摘要及其 OS-TEMP 报告。历史记录仍为caller-reported，并非独立审核结论。

```json
{
  "schema": 1,
  "kind": "current-rust-business-audit",
  "collectionPass": true,
  "productPass": false,
  "startedAt": "2026-09-14T04:32:31.103Z",
  "finishedAt": "2026-09-14T04:33:11.472Z",
  "hashes": {
    "native/codex-rollout-collector/Cargo.toml": "dd4d85361ce0128a294b3f37ed9e4c5c2baaf6baf5cf691607c29fd54b69bb6a",
    "native/codex-rollout-collector/Cargo.lock": "dcd8b1008b78e3ce8245df7de4f583ad65ec433f38198f5bdb73251393db3ff5",
    "native/codex-rollout-collector/tests/business_history_audit.rs": "aa799be702e88fc421df8186f4aa0ec8adba842c70dcfa9ab26e0065e03c1ea1",
    "native/codex-rollout-collector/tests/support/run_business_history_audit.cjs": "288f9fb280c9d6907d1d9f172e042035088a7ea2f5dff6c497ebf02a91bd7dd6",
    "native/codex-rollout-collector/src/protocol/target_source.rs": "754c3c1c09d41ea5ef1a0cad6a4c2afb99459442556ff337a46c35a76972723b",
    "native/codex-rollout-collector/src/protocol/target_mapping.rs": "002b62c23a3277350039c1cfe543f33b92e1221042d3c6f5ae68e99a3a5f9d1d",
    "native/codex-rollout-collector/src/protocol/target_runtime.rs": "a416fdd2f9508c9fa90318a072ed79d83fa87d5d0cc762a8505ce32e1580a2df"
  },
  "cases": [
    {
      "id": "R01",
      "name": "r01_small_history",
      "status": "business-difference",
      "exit": 101,
      "observations": [
        {
          "actual": [
            "U1",
            "A1"
          ],
          "case": "R01",
          "expected": [
            "U1",
            "A1"
          ],
          "field": "body_order"
        },
        {
          "actual": false,
          "case": "R01",
          "expected": true,
          "field": "complete"
        }
      ],
      "differences": [
        {
          "actual": false,
          "case": "R01",
          "expected": true,
          "field": "complete"
        }
      ],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-24988-1789360360141934100\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 1059,
          "lines": 5,
          "sha256": "112816e25143ab884324620f973095e29f521008401e89da215a6616a59b4c33"
        }
      ]
    },
    {
      "id": "R02",
      "name": "r02_recent_then_backward",
      "status": "business-difference",
      "exit": 101,
      "observations": [
        {
          "actual": true,
          "case": "R02",
          "expected": true,
          "field": "tail_contains_latest"
        },
        {
          "actual": "Error(TargetErrorMessage { header: TargetProtocolHeader { protocol_version: 1, message_type: Error, request_id: \"backfill\" }, code: \"resource_limit_exceeded\", message: \"range length 3878 exceeds segment limit 1400\", retryable: false, fatal: false, details: None })",
          "case": "R02",
          "expected": "batch",
          "field": "batch"
        }
      ],
      "differences": [
        {
          "actual": "Error(TargetErrorMessage { header: TargetProtocolHeader { protocol_version: 1, message_type: Error, request_id: \"backfill\" }, code: \"resource_limit_exceeded\", message: \"range length 3878 exceeds segment limit 1400\", retryable: false, fatal: false, details: None })",
          "case": "R02",
          "expected": "batch",
          "field": "batch"
        }
      ],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-110088-1789360360954146200\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 3878,
          "lines": 19,
          "sha256": "04d0022c04facad3daea1332618e6fbd459ffdfa1965529a872d218d9966f597"
        }
      ]
    },
    {
      "id": "R03",
      "name": "r03_append_after_snapshot",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": [
            "U1",
            "A1",
            "U2",
            "A2",
            "U3",
            "A3",
            "U4",
            "A4"
          ],
          "case": "R03",
          "expected": [
            "U1",
            "A1",
            "U2",
            "A2",
            "U3",
            "A3",
            "U4",
            "A4"
          ],
          "field": "body_order"
        },
        {
          "actual": 10,
          "case": "R03",
          "expected": 10,
          "field": "logical_body_count"
        },
        {
          "actual": [
            "A1",
            "A2",
            "A3",
            "A4",
            "A5",
            "U1",
            "U2",
            "U3",
            "U4",
            "U5"
          ],
          "case": "R03",
          "expected": [
            "A1",
            "A2",
            "A3",
            "A4",
            "A5",
            "U1",
            "U2",
            "U3",
            "U4",
            "U5"
          ],
          "field": "merged_content"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-47852-1789360361896018400\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 3376,
          "lines": 17,
          "sha256": "1c23a2d34ce2f2ef09f71df83df32b855b70a737c4a2aae5ab3437623a413a1f"
        }
      ]
    },
    {
      "id": "R04",
      "name": "r04_empty_source",
      "status": "business-difference",
      "exit": 101,
      "observations": [
        {
          "actual": [],
          "case": "R04",
          "expected": [],
          "field": "body_order"
        },
        {
          "actual": [],
          "case": "R04",
          "expected": [],
          "field": "outcomes"
        },
        {
          "actual": false,
          "case": "R04",
          "expected": true,
          "field": "complete"
        }
      ],
      "differences": [
        {
          "actual": false,
          "case": "R04",
          "expected": true,
          "field": "complete"
        }
      ],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-50680-1789360362849116200\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 289,
          "lines": 1,
          "sha256": "efc0f650fd34fe2dc637bce3a62fd53d2c75bc5d47ad7b2bacec24c5a73c4a9e"
        }
      ]
    },
    {
      "id": "R05",
      "name": "r05_source_not_yet_created",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R05",
          "expected": true,
          "field": "missing_not_empty_success"
        }
      ],
      "differences": [],
      "fixtureHashes": []
    },
    {
      "id": "R06",
      "name": "r06_tool_details",
      "status": "business-difference",
      "exit": 101,
      "observations": [
        {
          "actual": "range length 3786 exceeds segment limit 1000",
          "case": "R06",
          "expected": "successful read",
          "field": "source_result"
        }
      ],
      "differences": [
        {
          "actual": "range length 3786 exceeds segment limit 1000",
          "case": "R06",
          "expected": "successful read",
          "field": "source_result"
        }
      ],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-50144-1789360364446643500\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 3786,
          "lines": 19,
          "sha256": "2353b40ec9d7a8b030f2730eef94cfee2166328bc2a6efb1cfb31f98f1aa7b0c"
        }
      ]
    },
    {
      "id": "R07",
      "name": "r07_file_changes",
      "status": "business-difference",
      "exit": 101,
      "observations": [
        {
          "actual": [],
          "case": "R07",
          "expected": [
            "C:/audit/a.rs",
            "C:/audit/b.rs"
          ],
          "field": "exact_file_paths"
        }
      ],
      "differences": [
        {
          "actual": [],
          "case": "R07",
          "expected": [
            "C:/audit/a.rs",
            "C:/audit/b.rs"
          ],
          "field": "exact_file_paths"
        }
      ],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-77656-1789360365336767800\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 3832,
          "lines": 18,
          "sha256": "30065e60cbd5c20aaffc56439eb4d9178372dfaf4e1b61c2f56c66d82ded8c18"
        }
      ]
    },
    {
      "id": "R08",
      "name": "r08_completed_command",
      "status": "business-difference",
      "exit": 101,
      "observations": [
        {
          "actual": 0,
          "case": "R08",
          "expected": 1,
          "field": "one_completed_command"
        }
      ],
      "differences": [
        {
          "actual": 0,
          "case": "R08",
          "expected": 1,
          "field": "one_completed_command"
        }
      ],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-54444-1789360366250482300\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 3800,
          "lines": 18,
          "sha256": "6d0d297849028499af8a090ac3d8a1ca072d5c7209e0b885f4a4d8e4e9aeda90"
        }
      ]
    },
    {
      "id": "R09",
      "name": "r09_multiple_plan_answers",
      "status": "business-difference",
      "exit": 101,
      "observations": [
        {
          "actual": "range length 4930 exceeds segment limit 1200",
          "case": "R09",
          "expected": "successful read",
          "field": "source_result"
        }
      ],
      "differences": [
        {
          "actual": "range length 4930 exceeds segment limit 1200",
          "case": "R09",
          "expected": "successful read",
          "field": "source_result"
        }
      ],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-99296-1789360367112149200\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 4930,
          "lines": 24,
          "sha256": "5d02d7601aa5c8057c096ab3b189a54419bc2bcb84151ae8ad659ea0b66077b4"
        }
      ]
    },
    {
      "id": "R10",
      "name": "r10_per_turn_usage",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": {
            "T1": [
              10,
              2
            ],
            "T2": [
              20,
              4
            ],
            "T3": [
              30,
              6
            ],
            "T4": [
              40,
              8
            ]
          },
          "case": "R10",
          "expected": {
            "T1": [
              10,
              2
            ],
            "T2": [
              20,
              4
            ],
            "T3": [
              30,
              6
            ],
            "T4": [
              40,
              8
            ]
          },
          "field": "per_turn"
        },
        {
          "actual": 40,
          "case": "R10",
          "expected": 40,
          "field": "last_rate"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-95428-1789360367968140700\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 6190,
          "lines": 22,
          "sha256": "554413d0c40f24422607c4c1f8d7d29abd4fd4bf2ddbfaed622cb45ee7c664fa"
        }
      ]
    },
    {
      "id": "R11",
      "name": "r11_failure_not_success",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R11",
          "expected": true,
          "field": "not_completed"
        },
        {
          "actual": [
            "U1",
            "A1",
            "U2",
            "A2",
            "U3",
            "A3",
            "U4",
            "A4"
          ],
          "case": "R11",
          "expected": [
            "U1",
            "A1",
            "U2",
            "A2",
            "U3",
            "A3",
            "U4",
            "A4"
          ],
          "field": "body_order"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-34936-1789360368821940700\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 3412,
          "lines": 17,
          "sha256": "0b35559ddb7fa0f72cd48e72355d3b0f3f4367d9fa1028566b84d612902b94b9"
        }
      ]
    },
    {
      "id": "R12",
      "name": "r12_unknown_events",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": 3,
          "case": "R12",
          "expected": 3,
          "field": "unknown_count"
        },
        {
          "actual": false,
          "case": "R12",
          "expected": false,
          "field": "partial"
        },
        {
          "actual": [
            "U1",
            "A1",
            "U2",
            "A2",
            "U3",
            "A3",
            "U4",
            "A4",
            "codex_delegation refers to B"
          ],
          "case": "R12",
          "expected": [
            "U1",
            "A1",
            "U2",
            "A2",
            "U3",
            "A3",
            "U4",
            "A4",
            "codex_delegation refers to B"
          ],
          "field": "known_text"
        },
        {
          "actual": true,
          "case": "R12",
          "expected": true,
          "field": "only_target"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-57280-1789360369677345400\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 4034,
          "lines": 21,
          "sha256": "f1dccf7cc135a5336e8addf92388cb25cc83ca25fc4edddcdf1e1f4a46a6abc0"
        }
      ]
    },
    {
      "id": "R13",
      "name": "r13_resend_completed",
      "status": "business-difference",
      "exit": 101,
      "observations": [
        {
          "case": "R13",
          "field": "parent_unchanged",
          "comparison": "exact equality passed",
          "detail": "完整expected/actual见同名stdout；断言及输入生成器已持久化",
          "actual_json_bytes": 2126
        },
        {
          "actual": 0,
          "case": "R13",
          "expected": 1,
          "field": "replacement_count"
        }
      ],
      "differences": [
        {
          "actual": 0,
          "case": "R13",
          "expected": 1,
          "field": "replacement_count"
        }
      ],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-26972-1789360370484631300\\2026/08/24\\rollout-2026-08-24T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 1829,
          "lines": 9,
          "sha256": "4c087fd52a8a217decd424f8aa7a825626bae768f383de1652abc47e53490c58"
        },
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-26972-1789360370484631300\\2026/08/25\\rollout-2026-08-25T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76818.jsonl",
          "bytes": 1211,
          "lines": 5,
          "sha256": "dd8e7f00a841a30fbf8ee4fd3961721432a0d1d68cb2802a400dec86084aa597"
        }
      ]
    },
    {
      "id": "R14",
      "name": "r14_resend_unfinished",
      "status": "business-difference",
      "exit": 101,
      "observations": [
        {
          "case": "R14",
          "field": "parent_unchanged",
          "comparison": "exact equality passed",
          "detail": "完整expected/actual见同名stdout；断言及输入生成器已持久化",
          "actual_json_bytes": 2126
        },
        {
          "actual": [],
          "case": "R14",
          "expected": [],
          "field": "no_replacement"
        },
        {
          "actual": true,
          "case": "R14",
          "expected": false,
          "field": "partial"
        }
      ],
      "differences": [
        {
          "actual": true,
          "case": "R14",
          "expected": false,
          "field": "partial"
        }
      ],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-83936-1789360371474373300\\2026/08/24\\rollout-2026-08-24T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 1829,
          "lines": 9,
          "sha256": "4c087fd52a8a217decd424f8aa7a825626bae768f383de1652abc47e53490c58"
        },
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-83936-1789360371474373300\\2026/08/25\\rollout-2026-08-25T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76818.jsonl",
          "bytes": 1046,
          "lines": 4,
          "sha256": "8e96d065b23cf55a8574e4f22bc8a448c9ca929983f1db479fd878d027381105"
        }
      ]
    },
    {
      "id": "R15",
      "name": "r15_restart_skips_middle_head",
      "status": "business-difference",
      "exit": 101,
      "observations": [
        {
          "case": "R15",
          "field": "parent_unchanged",
          "comparison": "exact equality passed",
          "detail": "完整expected/actual见同名stdout；断言及输入生成器已持久化",
          "actual_json_bytes": 2126
        },
        {
          "actual": 0,
          "case": "R15",
          "expected": 2,
          "field": "replacement_count"
        }
      ],
      "differences": [
        {
          "actual": 0,
          "case": "R15",
          "expected": 2,
          "field": "replacement_count"
        }
      ],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-68068-1789360372463397000\\2026/08/24\\rollout-2026-08-24T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 1829,
          "lines": 9,
          "sha256": "4c087fd52a8a217decd424f8aa7a825626bae768f383de1652abc47e53490c58"
        },
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-68068-1789360372463397000\\2026/08/25\\rollout-2026-08-25T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76818.jsonl",
          "bytes": 1211,
          "lines": 5,
          "sha256": "dd8e7f00a841a30fbf8ee4fd3961721432a0d1d68cb2802a400dec86084aa597"
        },
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-68068-1789360372463397000\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76819.jsonl",
          "bytes": 1211,
          "lines": 5,
          "sha256": "916dc1c737e4a569bea9945a02a1d59a104688cd4929e832002aac11d6aa16ab"
        }
      ]
    },
    {
      "id": "R16",
      "name": "r16_branch_isolation",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": [
            "U1",
            "A1"
          ],
          "case": "R16",
          "expected": [
            "U1",
            "A1"
          ],
          "field": "body_order"
        },
        {
          "actual": true,
          "case": "R16",
          "expected": true,
          "field": "branch_scope"
        },
        {
          "case": "R16",
          "field": "A_unchanged",
          "comparison": "exact equality passed",
          "detail": "完整expected/actual见同名stdout；断言及输入生成器已持久化",
          "actual_json_bytes": 5985
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-59192-1789360373421494900\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 1829,
          "lines": 9,
          "sha256": "4c087fd52a8a217decd424f8aa7a825626bae768f383de1652abc47e53490c58"
        },
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-59192-1789360373421494900\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76817.jsonl",
          "bytes": 1059,
          "lines": 5,
          "sha256": "17f00870b8b2aeb989c12334dab0475f20cd4756375634c37cccda9376edffc4"
        }
      ]
    },
    {
      "id": "R17",
      "name": "r17_ack_loss_restart",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": "batch-a57f466b13386f5a0cd27c4c00d89144",
          "case": "R17",
          "expected": "batch-a57f466b13386f5a0cd27c4c00d89144",
          "field": "batch_id"
        },
        {
          "actual": "seg-f3a5da96954342aa093bc6324b198990",
          "case": "R17",
          "expected": "seg-f3a5da96954342aa093bc6324b198990",
          "field": "segment_id"
        },
        {
          "case": "R17",
          "field": "items",
          "comparison": "exact equality passed",
          "detail": "完整expected/actual见同名stdout；断言及输入生成器已持久化",
          "actual_json_bytes": 5985
        },
        {
          "actual": true,
          "case": "R17",
          "expected": true,
          "field": "complete"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-102952-1789360374332734000\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 1829,
          "lines": 9,
          "sha256": "4c087fd52a8a217decd424f8aa7a825626bae768f383de1652abc47e53490c58"
        }
      ]
    },
    {
      "id": "R18",
      "name": "r18_negative_ack_retry",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R18",
          "expected": true,
          "field": "negative_terminal"
        },
        {
          "actual": "batch-a57f466b13386f5a0cd27c4c00d89144",
          "case": "R18",
          "expected": "batch-a57f466b13386f5a0cd27c4c00d89144",
          "field": "batch_id"
        },
        {
          "actual": "seg-f3a5da96954342aa093bc6324b198990",
          "case": "R18",
          "expected": "seg-f3a5da96954342aa093bc6324b198990",
          "field": "segment_id"
        },
        {
          "case": "R18",
          "field": "items",
          "comparison": "exact equality passed",
          "detail": "完整expected/actual见同名stdout；断言及输入生成器已持久化",
          "actual_json_bytes": 5985
        },
        {
          "actual": true,
          "case": "R18",
          "expected": true,
          "field": "complete"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-15712-1789360375233353000\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 1829,
          "lines": 9,
          "sha256": "4c087fd52a8a217decd424f8aa7a825626bae768f383de1652abc47e53490c58"
        }
      ]
    },
    {
      "id": "R19",
      "name": "r19_cancel_then_read",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R19",
          "expected": true,
          "field": "cancel_terminal"
        },
        {
          "actual": [
            "U1",
            "A1",
            "U2",
            "A2"
          ],
          "case": "R19",
          "expected": [
            "U1",
            "A1",
            "U2",
            "A2"
          ],
          "field": "body_order"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-65388-1789360376214769100\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 1829,
          "lines": 9,
          "sha256": "4c087fd52a8a217decd424f8aa7a825626bae768f383de1652abc47e53490c58"
        }
      ]
    },
    {
      "id": "R20",
      "name": "r20_unfinished_line_resume",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": false,
          "case": "R20",
          "expected": false,
          "field": "half_not_complete"
        },
        {
          "actual": true,
          "case": "R20",
          "expected": true,
          "field": "whole_complete"
        },
        {
          "actual": true,
          "case": "R20",
          "expected": true,
          "field": "new_turn"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-29548-1789360377174208400\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 3376,
          "lines": 17,
          "sha256": "1c23a2d34ce2f2ef09f71df83df32b855b70a737c4a2aae5ab3437623a413a1f"
        }
      ]
    },
    {
      "id": "R21",
      "name": "r21_line_below_prefix",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R21",
          "expected": true,
          "field": "long_item_retained"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-51484-1789360378071042000\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 2898,
          "lines": 6,
          "sha256": "beed033b9629c14f1ed9af9a00b382d6db4ec6bde3ffc359ff33198cb9d5b596"
        }
      ]
    },
    {
      "id": "R22",
      "name": "r22_line_equal_prefix",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R22",
          "expected": true,
          "field": "long_item_retained"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-109112-1789360378893092800\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 2898,
          "lines": 6,
          "sha256": "beed033b9629c14f1ed9af9a00b382d6db4ec6bde3ffc359ff33198cb9d5b596"
        }
      ]
    },
    {
      "id": "R23",
      "name": "r23_line_over_prefix",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R23",
          "expected": true,
          "field": "over_limit_not_canonical"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-81264-1789360379722260600\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 2898,
          "lines": 6,
          "sha256": "beed033b9629c14f1ed9af9a00b382d6db4ec6bde3ffc359ff33198cb9d5b596"
        }
      ]
    },
    {
      "id": "R24",
      "name": "r24_line_below_no_prefix",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R24",
          "expected": true,
          "field": "long_item_retained"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-55580-1789360380539729400\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 2128,
          "lines": 2,
          "sha256": "edc93f03b55805c23227719a74f15eb6e1672766e68ae3f085ab812d414fdec2"
        }
      ]
    },
    {
      "id": "R25",
      "name": "r25_line_equal_no_prefix",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R25",
          "expected": true,
          "field": "long_item_retained"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-98384-1789360381368685600\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 2128,
          "lines": 2,
          "sha256": "edc93f03b55805c23227719a74f15eb6e1672766e68ae3f085ab812d414fdec2"
        }
      ]
    },
    {
      "id": "R26",
      "name": "r26_line_over_no_prefix",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R26",
          "expected": true,
          "field": "over_limit_not_canonical"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-76100-1789360382208242900\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 2128,
          "lines": 2,
          "sha256": "edc93f03b55805c23227719a74f15eb6e1672766e68ae3f085ab812d414fdec2"
        }
      ]
    },
    {
      "id": "R27",
      "name": "r27_segment_below",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R27",
          "expected": true,
          "field": "long_item_retained"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-68784-1789360383042957000\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 2898,
          "lines": 6,
          "sha256": "beed033b9629c14f1ed9af9a00b382d6db4ec6bde3ffc359ff33198cb9d5b596"
        }
      ]
    },
    {
      "id": "R28",
      "name": "r28_segment_equal",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R28",
          "expected": true,
          "field": "long_item_retained"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-41284-1789360383873486500\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 2898,
          "lines": 6,
          "sha256": "beed033b9629c14f1ed9af9a00b382d6db4ec6bde3ffc359ff33198cb9d5b596"
        }
      ]
    },
    {
      "id": "R29",
      "name": "r29_segment_over",
      "status": "business-difference",
      "exit": 101,
      "observations": [
        {
          "actual": "range length 2898 exceeds segment limit 2897",
          "case": "R29",
          "expected": "successful read",
          "field": "source_result"
        }
      ],
      "differences": [
        {
          "actual": "range length 2898 exceeds segment limit 2897",
          "case": "R29",
          "expected": "successful read",
          "field": "source_result"
        }
      ],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-99576-1789360384715428000\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 2898,
          "lines": 6,
          "sha256": "beed033b9629c14f1ed9af9a00b382d6db4ec6bde3ffc359ff33198cb9d5b596"
        }
      ]
    },
    {
      "id": "R30",
      "name": "r30_decoded_below",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R30",
          "expected": true,
          "field": "long_item_retained"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-76616-1789360385538290200\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 2898,
          "lines": 6,
          "sha256": "beed033b9629c14f1ed9af9a00b382d6db4ec6bde3ffc359ff33198cb9d5b596"
        }
      ]
    },
    {
      "id": "R31",
      "name": "r31_decoded_equal",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R31",
          "expected": true,
          "field": "long_item_retained"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-104560-1789360386398375400\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 2898,
          "lines": 6,
          "sha256": "beed033b9629c14f1ed9af9a00b382d6db4ec6bde3ffc359ff33198cb9d5b596"
        }
      ]
    },
    {
      "id": "R32",
      "name": "r32_decoded_over",
      "status": "passed",
      "exit": 0,
      "observations": [
        {
          "actual": true,
          "case": "R32",
          "expected": true,
          "field": "over_limit_not_canonical"
        }
      ],
      "differences": [],
      "fixtureHashes": [
        {
          "path": "C:\\Users\\kongx\\AppData\\Local\\Temp\\termlink-business-90388-1789360387272983400\\2026/08/26\\rollout-2026-08-26T00-00-00-019b2b40-beb6-7b23-bed0-37d570e76816.jsonl",
          "bytes": 2898,
          "lines": 6,
          "sha256": "beed033b9629c14f1ed9af9a00b382d6db4ec6bde3ffc359ff33198cb9d5b596"
        }
      ]
    }
  ],
  "infrastructureFailure": null
}
```

## 7. S3九项台账核实（2026-09-14）

### 7.1 判定口径和边界

本节仅把当前工作树的静态实现同§1.1所述schema 4 S2报告、现行4.5契约进行比对。S2的13项业务差异是定位信号，既不自动等于九项台账缺陷，也不自动证明任何产品路径通过或已修复。下列“已确认”只表示在隔离Rust基础层可复核到相应实现与审计证据；它不包含Node、数据库、Android、IPC、App展示或Gemini补丁的正确性结论。

分类含义如下：

| 结论类别 | 含义 |
| --- | --- |
| 已确认的隔离Rust缺陷 | 当前实现和S2可重复观测共同指向当前Rust行为违反已采用的局部语义。 |
| 已确认的隔离Rust能力/契约缺口 | 当前正式输出未保存契约明确要求的隔离分析信息；不等同于产品接口或产品修复。 |
| 未确认／证据不足 | 台账所述机制未在当前实现或S2中复现，或关键公共流程尚未到达。 |
| 预期fail-closed／容量需求未证实 | 资源限制按契约拒绝输入；没有当前容量目标或基准时，不把拒绝归类为缺陷。 |
| 未采用能力／跨模块需求 | 当前模型没有该能力的已采用需求，或需要后续Node和产品协作；未知输入保持诊断而非被静默当作已支持。 |

### 7.2 RUST-001至RUST-009逐项分类

| 台账项 | 当前源码或审计证据 | 适用范围与尚存不确定性 | 结论类别 | 有界结论 |
| --- | --- | --- | --- | --- |
| RUST-001：checkpoint恢复污染backfill归属 | `protocol/target_mapping.rs`的`restore_checkpoint_state`在恢复已验证checkpoint后直接恢复adapter/reducer状态，未按`request.mode`排除backfill；S2的R02、R06、R09均记录恢复后owner分别落到`A1`、`A2`或`C2`而非当前目标turn。 | 适用于从checkpoint启动、且目标归属应由当前backfill重建的隔离target请求。S2公共完成/提升流程仍受ordinal 0边界和预算拒绝阻断，不能由此量化完整公共链路或产品影响。 | 已确认的隔离Rust缺陷 | 当前恢复分支会把旧adapter/reducer归属带入backfill，需在未来独立Rust修复任务中限定恢复语义。 |
| RUST-002：`item_completed`只适配用户消息 | `codex_adapter/mod.rs`的`adapt_item_completed`只接受`TurnItem::UserMessage`，其他item返回`item_completed_non_user`诊断；S2 R07观察到精确文件路径为空，R08观察到completed command数为0。 | 适用于由`item_completed`承载的文件变更、命令等非用户消息。当前审计未覆盖全部真实Codex事件语料，也未评估Gemini补丁。 | 已确认的隔离Rust缺陷 | 当前adapter在该入口丢弃已知非用户item，导致下游分析缺失相应事实。 |
| RUST-003：正式task outcome未聚合编辑文件 | `protocol/target_data.rs`的`TargetTaskOutcome`只包含item key、状态、消息、完整性和source epoch；`target_mapping.rs`仅由`TurnCompleted`构造它，未聚合文件事实。架构§8要求隔离分析的task outcome保留文件等可审计信息，S2 R07也显示文件事实未到达精确输出。 | 适用于formal target协议的task outcome。它不是现有App/数据库DTO，不能据此要求产品展示或持久化。 | 已确认的隔离Rust能力/契约缺口 | 当前正式结果缺少编辑文件聚合；任何数据模型扩展须另行设计并保持隔离边界。 |
| RUST-004：backward range不前进 | `protocol/target_source.rs`在backfill中以`SourceReadMode::BackwardRange`调用`plan_range`；S2 R02、R06、R09的`internal_backward_progress`均为真，记录的精确窗口持续向前推进。 | 反证仅覆盖S2内部窗口。公共请求在assembly/promotion前被ordinal 0类型边界或resource limit终止，因此未获得完整公共端到端正例。 | 未确认／证据不足 | 台账所称“永不前进”未在当前实现复现；公共完整流程仍应在单独测试设计中补足，不能把未到达当作已修复或已失败。 |
| RUST-005：默认资源上限应放宽到400 MB | `source/record.rs`与`protocol/target.rs`的默认decoded/line/segment限制是有界部署限制；S2 R29得到`SegmentLimitExceeded`，现行wire contract §4.2.1要求超过预算时以`resource_limit_exceeded`安全失败。 | 适用于超过调用方/默认预算的读取请求。没有当前已批准的400 MB工作负载、内存基准或SLO，不能从一次预算拒绝推出新的默认值。 | 预期fail-closed／容量需求未证实 | 当前拒绝与契约一致；是否调整容量属于未来有证据的性能/容量任务，不构成当前缺陷或产品通过结论。 |
| RUST-006：绝对路径redaction丢失命令和文件事实 | `codex_adapter/mod.rs`的`safe_path_display`、`sanitize_tool_input`和`sanitize_tool_text`会把绝对本地路径替换为`<local-path-redacted>`；S2 R07/R08分别没有得到精确文件和completed command事实。架构§4.6要求隔离采集保留真实命令、参数、cwd以及文件变更等可审计细节。 | 适用于formal collector的证据保留层。安全披露、跨进程传输和产品展示策略尚未在本任务定义，不能把本结论扩展为允许向任何产品surface暴露路径。 | 已确认的隔离Rust能力/契约缺口 | 当前无条件redaction同已采用的隔离审计保留要求不兼容；未来修复需把保留、脱敏和曝光边界分开设计。 |
| RUST-007：redaction后以路径为键导致文件碰撞 | 当前`TargetTaskOutcome`尚不存在台账所述的`edited_files`路径键`BTreeMap`；adapter的`FileChanged`逻辑身份来自source position而非显示路径，S2也没有观察到两个文件折叠为同一键。 | 只可能适用于未来建立文件聚合且选择redacted路径作key的设计。该设计、其键和碰撞语义均未采用。 | 未确认／证据不足 | 当前没有可复核的碰撞reducer；它可作为RUST-006后续设计的风险提示，但不是当前可确认缺陷。 |
| RUST-008：未映射`thread_goal_updated` | 当前Rust源码没有`thread_goal_updated`或同义variant的wire/adapter映射。兼容性契约要求未知或缺失variant转为`UnknownEvent`/`ParseGap`并保留诊断，而非假装已支持。 | 适用于当前未建模的上游事件。没有当前生产样本、fixture或下游已采用的消费要求，不能断言该事件已成为本阶段必需能力。 | 未采用能力／预期未知兼容行为 | 当前没有该专用语义是能力缺口候选，但unknown诊断是契约规定的安全降级，不能归类为当前已确认缺陷。 |
| RUST-009：未发现/级联subagent活动 | 当前源码没有台账所述subagent discovery/cascade映射；兼容性文档允许inter-agent记录保存关联诊断或显式跳过，同时禁止污染当前conversation identity。AD-022规定Rust接口先行，Node consumer和产品协作另立任务。 | 该能力需要上游事件定义、Node单例采集协调、关联语义和后续产品消费共同确认；S2没有提供该完整范围的实测证据。 | 未采用能力／跨模块需求 | 它不是当前隔离Rust缺陷。若未来立项，必须先锁定Rust输入契约，再在独立Node/产品任务中处理cascade和展示。 |

### 7.3 与S2差异和后续工作的分离

- 业务差异：S2的R02、R06、R07、R08、R09为本节提供了局部证据，但仍保持其报告中的未到达、预算和类型边界说明；其余13项差异不被重命名为九项台账结论。
- 隔离Rust能力/契约缺口：RUST-003和RUST-006只说明formal collector应如何保存分析事实，不建立产品DTO、DB表、IPC消息或App行为。
- 预期安全行为：RUST-005的资源拒绝、RUST-008对未知variant的诊断，均不能因“缺少业务能力”被改写为产品失败。
- 证据不足：RUST-004与RUST-007没有当前可复核的台账所述实现路径；后续若需要验证，须新建受控测试/修复任务，不能在本步骤补写产品代码。

本S3没有应用、构建、运行或静态复用Gemini补丁，也没有执行Node、数据库、Android、IPC或App验证。上述结论不主张任何产品fix、产品pass或发布就绪。

## 8. 后续边界

后续S4仅可按已确认范围静态检查Gemini补丁和依赖；当前应用后的构建、回归和任何修复仍属于后续独立任务。


## 9. S3-R1 恢复后的证据复核（2026-09-15，待独立审核）

### 9.1 新执行与保留边界

本次 S3-R1 重验：2026-09-15T09:10:10.640Z 至 2026-09-15T09:10:51.500Z，schema 4，32 例中 19 通过、13 业务差异；conformance 31/31、target protocol 70/70，collectionPass=true、productPass=false。报告 C:/Users/kongx/AppData/Local/Temp/termlink-rust-issues-audit/current/report.json，SHA-256：f1d8ed968f425ea46838fac8842b2acce8ea0bea73fd9d4e94ed4a787b606c79。测试和 runner 哈希与原 S2 相同。

```json
{
  "schema": 4,
  "kind": "current-rust-business-audit",
  "startedAt": "2026-09-15T09:10:10.640Z",
  "finishedAt": "2026-09-15T09:10:51.500Z",
  "collectionPass": true,
  "productPass": false,
  "caseCounts": {
    "total": 32,
    "passed": 19,
    "businessDifferences": 13
  },
  "businessDifferenceIds": [
    "R01",
    "R02",
    "R04",
    "R05",
    "R06",
    "R07",
    "R08",
    "R09",
    "R11",
    "R13",
    "R14",
    "R15",
    "R29"
  ],
  "existingRegression": {
    "conformance": "31/31",
    "stage4_target_protocol": "70/70",
    "exit": 0
  },
  "hashes": {
    "native/codex-rollout-collector/tests/business_history_audit.rs": "cda39c250ebe65c21381e3a279d57aac98a2dbbc2160113f507f0c98d88ae3f6",
    "native/codex-rollout-collector/tests/support/run_business_history_audit.cjs": "2a2136953480112dea53bd44cf19c7caf0c58059b47f97e8c9f19cf6557426a1"
  },
  "reportSha256": "f1d8ed968f425ea46838fac8842b2acce8ea0bea73fd9d4e94ed4a787b606c79",
  "assurance": "caller-reported"
}
```

旧 §1.1 的 b81003e0 报告及其时点保留为历史；runner 在重跑前将旧 report/stdout/stderr 复制到 attempts 目录。本轮没有新建测试或修改测试资产，13 项业务差异不等于 13 个产品缺陷。复核输入包括原 Git S3 提交 fd673e6d、当前源码、现行契约及 CURRENT_TASK 保留的生产证据 supersede/replan 记录。原 attachment:e6fff2d9-c97a-4cfe-97ed-8ca2e732a219/pasted-text.txt 正文不在本次可读材料中，未重放真实会话；历史计划中“必须修复”的表述不能替代实际验证。

### 9.2 九项复核与更正

| 条目 | 当前可核对证据与结论 | 限制及 S4 输入 |
| --- | --- | --- |
| RUST-001 | target_mapping.rs:830 的 restore_checkpoint_state 对同 source 恢复 Adapter/Reducer，没有 Backfill mode 分支；重验保留 R02/R06/R09 归属差异。原隔离缺陷结论保留。 | 公共完整流程和产品影响仍未证明；S4 只评估限定恢复语义的修复。 |
| RUST-002 | codex_adapter/mod.rs:809 仅接受 UserMessage；其他 item_completed 进入 item_completed_non_user 诊断。R07/R08 对文件、命令事实的差异仍在。原局部适配缺陷结论保留。 | 不推导所有事件或产品路径失败；S4 核对已知非用户 item 的类型映射。 |
| RUST-003 | TargetTaskOutcome 当前字段为 item_key/status/message/completeness/source_epoch，没有 edited_files；架构 §8 的目标 outcome 文件信息与 formal 模型之间仍存在能力/契约差距。 | R07 无文件事实也受 RUST-002 影响，不能独立证明某个不存在的聚合器有实现 bug；S4 按模型扩展候选评估。 |
| RUST-004 | target_source.rs:1024 的 Backfill 将 known_complete_range/cursor.complete_range 原样交给 source_range_or_full（1102）；read_plan.rs:391 的 plan_range 只校验该范围，不生成其之前的新窗口。无范围时以整个 source 作为范围，也可能先触发单段限制。由源码确认公共 Backfill 范围构造缺少正常有界推进。 | 更正 §7 用内部窗口前进反驳公共路径的推论。静态缺陷已确认；没有新增公共成功执行证据，不声称修复或完整复现生产样本。 |
| RUST-005 | target.rs:47–50 的当前默认值：decoded 32 MiB、line 512 KiB、segment 4 MiB、tail 2 MiB。wire §4.2.1 规定预算拒绝，R29 仍为超段上限。 | 保留容量余量风险；原生产样本尺寸和完整请求不可得，不能认定本次默认值已对该样本失败，更不能据此采用 400 MB；与 RUST-004 整源范围造成的预算问题分开。 |
| RUST-006 | safe_path_display/sanitize_tool_input/sanitize_tool_text 的绝对路径脱敏与架构 §4.6 的命令/cwd/文件事实保留存在已记录的设计差距。 | R07/R08 也受未适配 item 影响，不能把全部缺失单独归因于 redaction；S4 需同时检查保留层和披露边界，不授权暴露真实路径。 |
| RUST-007 | TargetTaskOutcome 没有 edited_files 映射；当前文件事件身份使用稳定 source position，而不是显示路径。 | 保留为未来聚合不变量：不要用脱敏后相同的显示路径作唯一键。当前碰撞 bug 未确认；不把未来风险算已修复义务。 |
| RUST-008 | vendor/protocol.rs:1372、3829、3845 已定义 ThreadGoalUpdated/ThreadGoal；decode.rs:299 的 event allowlist 没有 thread_goal_updated，Adapter 也没有对应语义分支。更正“原生类型不存在/只能未知”的笼统说法：已知 vendor 类型与 TermLink 接纳及映射之间有确定的支持缺口。 | unknown 降级仍符合兼容性兜底；具体最小目标元数据需求来自后续记录，需要与现行契约分层。原始样本未复验；S4 可评估关联证据候选，不复制 objective 正文、不宣称已经支持。 |
| RUST-009 | vendor/items.rs:53、314 已有 SubAgentActivityItem(id/kind/agent_thread_id/agent_path)；item_completed 经 Adapter 809 行的非用户分支丢弃专用关系语义。 | 必须拆开“保存父任务中的子代理关系证据”和“发现/调度/级联读取子任务”。前者可独立静态核实缺口并评估候选；后者仍受 AD-022 及单例协调约束，后置。兼容性 §4.2 允许 inter-agent 诊断/跳过，不能把所有缺口自动归为违约。 |

### 9.3 剩余义务与证据强度

当前任务仍为业务矩阵、当前 Rust 问题核实、Gemini 静态复用评估。S3-R1 结论需要独立 review-change；原 S4 未执行，待审核后评估已确认缺陷和明确分层的能力缺口，逐项给出直接复用/需适配/不适用/证据不足。任何 Rust 修复、fixture 新增、契约变更、容量策略或 Node/DB/App 集成均后置。

原六条 deferred finding 保留原 fingerprint/次数/证据，其多 batch、跨窗输入、snapshot 时序、富字段 oracle、lineage/recovery oracle、失败分类义务不因重跑成功自动解决。C-R004/C-R008/C-R009/C-AUDIT 撤出的实施义务见 docs/workflow/AUDIT_RESTORATION-001-20260915.md；它们尚未实施，不能被审计更正当作完成。
