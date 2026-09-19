---
schema_version: 1
kind: vnext-current-task
document_id: doc-05c82c8a6e6c9181adfc2be2
runtime_state:
  schema_version: 1
  kind: vnext-current-task-runtime-state
  evidence_plan_revision: 6d88bddf460386620d751e6428795fbec1fb69f7fad4f04b67e8c935cc679c14
  business_evidence_version: 1
  task_evolution_version: 2
  task_id: "002"
  task_slug: rollout
  workflow_status: active
  lifecycle_state: active
  resume_requires_review: false
  resume_review_reasons: []
  active_step_id: S1
  active_step_status: in-progress
  finding_queue_revision: 0
  review_cycle:
    id: review-cycle-0
    cycle_phase: discovery
    repair_round: 0
    counted_repair_wave_ids: []
    active_repair_wave_id: null
    verification_new_finding_wave_used: false
    verification_new_finding_wave_id: null
  findings: []
  claim_evidence_required: true
  claim_evidence:
    - claim_id: C1
      claim_kind: acceptance
      slots:
        - slot_id: C1-rule
          minimum_type: targeted-execution/v1
          disposition: missing
          evidence_refs: []
          check:
            check_id: C1-rule-final
            method: execution
            entry: cargo test --locked --manifest-path
              native/codex-rollout-collector/Cargo.toml --lib --test conformance
              --test stage2_input --test stage4_target_protocol --test
              rollout_blockers
            expected_observation: 最终源码公共 target：一个 backfill 请求执行多个受限物理窗口并完整正序归约；preview 后合法新
              intent、合法 backfill continuation、known_complete_range
              三条入口实际推进。精确正文、跨段 tool 归属和 stable key；formal promotion 后公共
              ForwardAppend 原样用于 append；兼容错误
              kind、pending/gap/partial/诊断/mutation 不产生不安全
              cursor。记录窗口/总预算证据及规划/边界 I/O 的取消超时检查。
            required_boundaries:
              - 真实 plain JSONL，单行小于段/行上限，总量大于段上限且小于请求预算
              - 公共 TargetAnalyzeRequest/read/map/runtime
              - SegmentAssembly 唯一 promotion
              - 独立正序字段级 oracle；无 opaque cursor 改写
            allowed_substitutes: []
            subject_paths:
              - native/codex-rollout-collector/src/analysis.rs
              - native/codex-rollout-collector/src/lib.rs
              - native/codex-rollout-collector/src/main.rs
              - native/codex-rollout-collector/src/protocol/mod.rs
              - native/codex-rollout-collector/src/protocol/target_mapping.rs
              - native/codex-rollout-collector/src/protocol/target_runtime.rs
              - native/codex-rollout-collector/src/protocol/target_source.rs
              - native/codex-rollout-collector/src/source/cursor.rs
              - native/codex-rollout-collector/src/source/jsonl.rs
              - native/codex-rollout-collector/src/source/mod.rs
              - native/codex-rollout-collector/src/source/read_plan.rs
              - native/codex-rollout-collector/src/source/record.rs
              - native/codex-rollout-collector/src/source/segment.rs
              - native/codex-rollout-collector/src/codex_adapter/mod.rs
              - native/codex-rollout-collector/src/codex_adapter/field_mapping.rs
              - native/codex-rollout-collector/src/model/analysis_event.rs
              - native/codex-rollout-collector/tests/rollout_blockers.rs
              - native/codex-rollout-collector/tests/stage4_target_protocol.rs
            expected_result: passed
          due_step_id: S3
          applicability: current
        - slot_id: C1-flow
          minimum_type: targeted-execution/v1
          disposition: missing
          evidence_refs: []
          check:
            check_id: C1-flow-final
            method: execution
            entry: node --test tests/codexRolloutCollector.test.js
              tests/codexRolloutCollector.recovery.test.js
              tests/codexRolloutCollector.realRust.test.js
              tests/codexRolloutCollector.defaultHome.test.js
              tests/codexRolloutCollector.checkpointJobs.test.js
              tests/codexRolloutCollector.isolatedLifecycle.test.js
            expected_observation: 真实 Node 经 stdio 发送 preview、合法 backfill 后，文件 store
              内容从预览收敛为完整 snapshot；原样保存/回传公共 ForwardAppend 和 checkpoint，后续 append
              成功。公共消息只能读 intent，不发送物理窗口或 source path。
            required_boundaries:
              - 真实 Node collector
              - 当前源码 Rust binary/stdio
              - 三种真实 File stores
              - TEMP 合成源与独立预期
            allowed_substitutes: []
            subject_paths:
              - native/codex-rollout-collector/src/analysis.rs
              - native/codex-rollout-collector/src/lib.rs
              - native/codex-rollout-collector/src/main.rs
              - native/codex-rollout-collector/src/protocol/mod.rs
              - native/codex-rollout-collector/src/protocol/target_mapping.rs
              - native/codex-rollout-collector/src/protocol/target_runtime.rs
              - native/codex-rollout-collector/src/protocol/target_source.rs
              - native/codex-rollout-collector/src/source/cursor.rs
              - native/codex-rollout-collector/src/source/jsonl.rs
              - native/codex-rollout-collector/src/source/mod.rs
              - native/codex-rollout-collector/src/source/read_plan.rs
              - native/codex-rollout-collector/src/source/record.rs
              - native/codex-rollout-collector/src/source/segment.rs
              - native/codex-rollout-collector/src/codex_adapter/mod.rs
              - native/codex-rollout-collector/src/codex_adapter/field_mapping.rs
              - native/codex-rollout-collector/src/model/analysis_event.rs
              - src/services/codexRolloutCollector/index.js
              - src/services/codexRolloutCollector/analyzerProtocol.js
              - src/services/codexRolloutCollector/analyzerProcessManager.js
              - src/services/codexRolloutCollector/analysisBatchImporter.js
              - src/services/codexRolloutCollector/analysisCheckpointStore.js
              - src/services/codexRolloutCollector/analysisRunStore.js
              - native/codex-rollout-collector/tests/rollout_blockers.rs
              - native/codex-rollout-collector/tests/stage4_target_protocol.rs
              - tests/codexRolloutCollector.isolatedLifecycle.test.js
              - tests/fixtures/codex-rollout-collector/rust-target.js
            expected_result: passed
          due_step_id: S3
          applicability: current
      requirement: C1：公共 backfill 有界补齐并安全衔接 append。plain JSONL
        总量大于单段上限、单行低于行/段限制且总量在现有请求预算内；合法新 backfill 意图（包括 preview 后）或合法 backfill
        continuation/known_complete_range 实际补读缺失历史，范围推进直至连续覆盖完整
        snapshot。跨段按历史正序归约，正文/tool 归属及稳定逻辑 key
        正确。不得重复读取原范围冒充推进、提高默认预算、整源超段直接拒绝或整份 raw records 常驻内存。保留
        snapshot/预算/取消/deadline，规划循环和边界 I/O 及时响应。只有
        SegmentAssembly::promote_to_forward_append 安全证明后输出可直接消费的公共 ForwardAppend
        cursor/checkpoint；调用方原样回传即可 append，测试不读取 opaque reducer payload、不重建内部
        cursor、不手改 kind。cursor 不混用，pending tail/gap/partial/解析诊断/source mutation
        等不安全情况 fail-closed。
      source_ref: conversation:01a0a8a7-853d-7471-8180-3b6c3c5cc6cd/user@2026-09-17T17:07:57.191Z;
        rollout-2026-09-16T13-19-06-01a0a8a7-853d-7471-8180-3b6c3c5cc6cd.jsonl:3399#C1
    - claim_id: C2
      claim_kind: acceptance
      slots:
        - slot_id: C2-rule
          minimum_type: targeted-execution/v1
          disposition: missing
          evidence_refs: []
          check:
            check_id: C2-rule-final
            method: execution
            entry: cargo test --locked --manifest-path
              native/codex-rollout-collector/Cargo.toml --lib --test conformance
              --test stage2_input --test stage4_target_protocol --test
              rollout_blockers
            expected_observation: FileChange/CommandExecution 已知 item_completed
              的精确文件/diff/命令/输出/允许状态、conversation/turn/item/source 及 stable key
              与独立预期一致；与旧 carrier/重读/overlap 幂等；未知/缺字段负向对照保留诊断，不伪造；现有脱敏截断语义保持。
            required_boundaries:
              - 真实 vendored decode→现有 CodexEventAdapter→owned
                event/projection/detail
              - 独立完整字段预期
              - 已知/未知/缺字段及旧 carrier 对照
            allowed_substitutes: []
            subject_paths:
              - native/codex-rollout-collector/src/analysis.rs
              - native/codex-rollout-collector/src/lib.rs
              - native/codex-rollout-collector/src/main.rs
              - native/codex-rollout-collector/src/protocol/mod.rs
              - native/codex-rollout-collector/src/protocol/target_mapping.rs
              - native/codex-rollout-collector/src/protocol/target_runtime.rs
              - native/codex-rollout-collector/src/protocol/target_source.rs
              - native/codex-rollout-collector/src/source/cursor.rs
              - native/codex-rollout-collector/src/source/jsonl.rs
              - native/codex-rollout-collector/src/source/mod.rs
              - native/codex-rollout-collector/src/source/read_plan.rs
              - native/codex-rollout-collector/src/source/record.rs
              - native/codex-rollout-collector/src/source/segment.rs
              - native/codex-rollout-collector/src/codex_adapter/mod.rs
              - native/codex-rollout-collector/src/codex_adapter/field_mapping.rs
              - native/codex-rollout-collector/src/model/analysis_event.rs
              - native/codex-rollout-collector/tests/rollout_blockers.rs
              - native/codex-rollout-collector/tests/stage4_target_protocol.rs
            expected_result: passed
          due_step_id: S3
          applicability: current
        - slot_id: C2-flow
          minimum_type: targeted-execution/v1
          disposition: missing
          evidence_refs: []
          check:
            check_id: C2-flow-final
            method: execution
            entry: node --test tests/codexRolloutCollector.test.js
              tests/codexRolloutCollector.recovery.test.js
              tests/codexRolloutCollector.realRust.test.js
              tests/codexRolloutCollector.defaultHome.test.js
              tests/codexRolloutCollector.checkpointJobs.test.js
              tests/codexRolloutCollector.isolatedLifecycle.test.js
            expected_observation: 经真实 Rust 解析生成的文件和命令事实写入 FileAnalysisStore，关闭 Node 后重新打开相同
              stores，逐字段比较事实、详情、来源、关联与逻辑去重；不使用测试手造 batch 代替主链路。
            required_boundaries:
              - 真实 Node/Rust 进程协议
              - FileAnalysisStore 持久化与重开
              - 独立 fixture 富字段预期
            allowed_substitutes: []
            subject_paths:
              - native/codex-rollout-collector/src/analysis.rs
              - native/codex-rollout-collector/src/lib.rs
              - native/codex-rollout-collector/src/main.rs
              - native/codex-rollout-collector/src/protocol/mod.rs
              - native/codex-rollout-collector/src/protocol/target_mapping.rs
              - native/codex-rollout-collector/src/protocol/target_runtime.rs
              - native/codex-rollout-collector/src/protocol/target_source.rs
              - native/codex-rollout-collector/src/source/cursor.rs
              - native/codex-rollout-collector/src/source/jsonl.rs
              - native/codex-rollout-collector/src/source/mod.rs
              - native/codex-rollout-collector/src/source/read_plan.rs
              - native/codex-rollout-collector/src/source/record.rs
              - native/codex-rollout-collector/src/source/segment.rs
              - native/codex-rollout-collector/src/codex_adapter/mod.rs
              - native/codex-rollout-collector/src/codex_adapter/field_mapping.rs
              - native/codex-rollout-collector/src/model/analysis_event.rs
              - src/services/codexRolloutCollector/index.js
              - src/services/codexRolloutCollector/analyzerProtocol.js
              - src/services/codexRolloutCollector/analyzerProcessManager.js
              - src/services/codexRolloutCollector/analysisBatchImporter.js
              - src/services/codexRolloutCollector/analysisCheckpointStore.js
              - src/services/codexRolloutCollector/analysisRunStore.js
              - tests/codexRolloutCollector.isolatedLifecycle.test.js
              - tests/fixtures/codex-rollout-collector/rust-target.js
            expected_result: passed
          due_step_id: S3
          applicability: current
      requirement: C2：已知 item_completed.FileChange/CommandExecution 通过现有 Adapter 映射为
        TermLink
        自有事件、projection/detail，保留现行保留/截断/脱敏策略允许的文件、diff、命令、输出和可恢复状态。conversation/turn/item/source
        关联正确；重复交付、overlap、重读和旧 carrier 重合保持幂等。Node 隔离文件 stores
        关闭重开仍保留精确内容和关联。未知类型、缺字段、不完整来源保持 unknown/partial/诊断，不伪造字段或状态。内部模型仅向后兼容
        additive 扩展，不扩展整体 retention、失败状态枚举或 task outcome 产品设计。
      source_ref: conversation:01a0a8a7-853d-7471-8180-3b6c3c5cc6cd/user@2026-09-17T17:07:57.191Z;
        rollout-2026-09-16T13-19-06-01a0a8a7-853d-7471-8180-3b6c3c5cc6cd.jsonl:3399#C2
    - claim_id: C3
      claim_kind: acceptance
      slots:
        - slot_id: C3-flow
          minimum_type: targeted-execution/v1
          disposition: missing
          evidence_refs: []
          check:
            check_id: C3-flow-final
            method: execution
            entry: cargo build --locked --manifest-path
              native/codex-rollout-collector/Cargo.toml --bin
              codex-rollout-collector ; node --test
              tests/codexRolloutCollector.test.js
              tests/codexRolloutCollector.recovery.test.js
              tests/codexRolloutCollector.realRust.test.js
              tests/codexRolloutCollector.defaultHome.test.js
              tests/codexRolloutCollector.checkpointJobs.test.js
              tests/codexRolloutCollector.isolatedLifecycle.test.js
            expected_observation: 当前源码 binary 在 TEMP 真实链路完成 append、独立 Node/Rust 重启及 stores
              重开、重叠重试/重复 delivery、无增长和 pending tail 后补齐；旧完整历史/checkpoint 在
              pending 或至少一次 timeout/source/cursor 拒绝后不变。同一 job/source scope 的
              delivery 身份跨 attempt 持续，request_id 可变；逐字段核验顺序/key/关联/详情，不将 partial
              当完整。记录精确命令、实际计数、source/binary/fixture SHA256。
            required_boundaries:
              - 真实 Node process 重启，不能只重新实例化对象
              - 真实 Rust process 重启及当前源码 binary
              - 三个 File stores 重用；不以 Memory/fake analyzer 替代
              - 独立字段级 fixture oracle
            allowed_substitutes: []
            subject_paths:
              - native/codex-rollout-collector/src/analysis.rs
              - native/codex-rollout-collector/src/lib.rs
              - native/codex-rollout-collector/src/main.rs
              - native/codex-rollout-collector/src/protocol/mod.rs
              - native/codex-rollout-collector/src/protocol/target_mapping.rs
              - native/codex-rollout-collector/src/protocol/target_runtime.rs
              - native/codex-rollout-collector/src/protocol/target_source.rs
              - native/codex-rollout-collector/src/source/cursor.rs
              - native/codex-rollout-collector/src/source/jsonl.rs
              - native/codex-rollout-collector/src/source/mod.rs
              - native/codex-rollout-collector/src/source/read_plan.rs
              - native/codex-rollout-collector/src/source/record.rs
              - native/codex-rollout-collector/src/source/segment.rs
              - native/codex-rollout-collector/src/codex_adapter/mod.rs
              - native/codex-rollout-collector/src/codex_adapter/field_mapping.rs
              - native/codex-rollout-collector/src/model/analysis_event.rs
              - src/services/codexRolloutCollector/index.js
              - src/services/codexRolloutCollector/analyzerProtocol.js
              - src/services/codexRolloutCollector/analyzerProcessManager.js
              - src/services/codexRolloutCollector/analysisBatchImporter.js
              - src/services/codexRolloutCollector/analysisCheckpointStore.js
              - src/services/codexRolloutCollector/analysisRunStore.js
              - tests/codexRolloutCollector.isolatedLifecycle.test.js
              - tests/fixtures/codex-rollout-collector/rust-target.js
            expected_result: passed
          due_step_id: S3
          applicability: current
        - slot_id: C3-scope
          minimum_type: scope-inspection/v1
          disposition: missing
          evidence_refs: []
          check:
            check_id: C3-scope-final
            method: static
            entry: git diff --check; git diff --name-only; inspect cumulative task diff
              against preparation HEAD 036c514458d689de660f7cc0d40199dc6f184f09
            expected_observation: 累计业务改动仅为授权 Rust/隔离 Node/测试/报告；无产品 DB、入口/路由、history
              publication、App/Android/IPC、vendor、Demo/Spike、discovery/lineage/default
              capacity 或新 mode/envelope 变化。所有临时 stores/fixtures/logs/build 在 OS
              TEMP；Node consumer 修改逐项绑定真实联调复现的 C1–C3 缺陷。Runtime 管理文件只由 Runtime
              自有事务变更，不作为业务范围扩展。
            required_boundaries:
              - 累计任务 diff 与精确白名单
              - AD-004/018/019/020/021/022
              - TEMP 路径与 helper freshness
              - 报告与最终源码版本绑定
            allowed_substitutes: []
            subject_paths:
              - native/codex-rollout-collector/src/analysis.rs
              - native/codex-rollout-collector/src/lib.rs
              - native/codex-rollout-collector/src/main.rs
              - native/codex-rollout-collector/src/protocol/mod.rs
              - native/codex-rollout-collector/src/protocol/target_mapping.rs
              - native/codex-rollout-collector/src/protocol/target_runtime.rs
              - native/codex-rollout-collector/src/protocol/target_source.rs
              - native/codex-rollout-collector/src/source/cursor.rs
              - native/codex-rollout-collector/src/source/jsonl.rs
              - native/codex-rollout-collector/src/source/mod.rs
              - native/codex-rollout-collector/src/source/read_plan.rs
              - native/codex-rollout-collector/src/source/record.rs
              - native/codex-rollout-collector/src/source/segment.rs
              - native/codex-rollout-collector/src/codex_adapter/mod.rs
              - native/codex-rollout-collector/src/codex_adapter/field_mapping.rs
              - native/codex-rollout-collector/src/model/analysis_event.rs
              - src/services/codexRolloutCollector/index.js
              - src/services/codexRolloutCollector/analyzerProtocol.js
              - src/services/codexRolloutCollector/analyzerProcessManager.js
              - src/services/codexRolloutCollector/analysisBatchImporter.js
              - src/services/codexRolloutCollector/analysisCheckpointStore.js
              - src/services/codexRolloutCollector/analysisRunStore.js
              - native/codex-rollout-collector/tests/rollout_blockers.rs
              - native/codex-rollout-collector/tests/stage4_target_protocol.rs
              - tests/codexRolloutCollector.isolatedLifecycle.test.js
              - tests/fixtures/codex-rollout-collector/rust-target.js
              - docs/codex/codex-rollout-isolated-closure-verification.md
              - docs/changes/records/CR-20260916-rollout-blockers-s1.md
              - docs/changes/records/CR-20260916-rollout-blockers-s2.md
              - docs/changes/records/CR-20260916-rollout-blockers-s3.md
            expected_result: accepted
          due_step_id: S3
          applicability: current
      requirement: C3：真实 Node collector→当前源码构建的 Rust stdio target→真实
        FileAnalysisStore/FileCheckpointStore/FileAnalysisRunStore 隔离闭环。验证
        preview→backfill→同源 append、Node/Rust 进程重启、overlap 重试和重复 delivery；复用持久化
        stores 后历史不丢不重、顺序/key/详情/关联/cursor 安全正确。验证无增长重试、未换行尾部及后续补齐，至少一次 timeout
        或 source/cursor 拒绝；pending tail/失败不覆盖旧完整 checkpoint 或已持久化历史。以独立 fixture
        预期逐字段比较，不以非空或请求 completed 代替内容正确，不以 partial
        终态冒充完整历史。仅证明采集模块在真实隔离链路可用，不接入产品 DB/业务入口/历史发布/App。
      source_ref: conversation:01a0a8a7-853d-7471-8180-3b6c3c5cc6cd/user@2026-09-17T17:07:57.191Z;
        rollout-2026-09-16T13-19-06-01a0a8a7-853d-7471-8180-3b6c3c5cc6cd.jsonl:3399#C3
  artifact_checkpoint_ids:
    - 0b862f6635b123471bb8e02d125584e7c2018d191b70c1bda51f931a541a84ad
    - a35aca7e343ac2c57eba17ee81231bb4b54ca739639abbb18902a440183d7ec1
  dynamic_review_required: false
  dynamic_expansions: []
  pending_review_result:
    test_assessment:
      applicable: true
      reason: S1 adds a newly admitted persistent test and changes an existing
        protocol test; acceptance C1 depends on execution evidence.
      evidence_refs:
        - docs/workflow/CURRENT_TASK.md
        - native/codex-rollout-collector/tests/rollout_blockers.rs
        - native/codex-rollout-collector/tests/stage4_target_protocol.rs
        - docs/codex/codex-rollout-isolated-closure-verification.md
        - docs/codex/codex-rollout-collector-architecture.md
      necessity: The new rollout_blockers test is justified because the existing Stage
        4 suite does not exercise the public target across a large multi-window
        backfill; this matches the recorded P-12 admission.
      oracle: "The required oracle is independently defined by C1 and the
        architecture: missing-range progression, exact cross-window
        associations, stable keys, and fail-closed promotion. The current test
        is insufficient because it uses weak non-empty checks and self-confirms
        the repeated-range behavior."
      boundary: The tests reach the formal public target over temporary JSONL and
        exercise cursor and promotion behavior, but they do not establish
        per-window streaming residency, mid-scan cancellation, exact
        cross-window association, or the reported full negative matrix.
      reuse: Reusing stage4_target_protocol for cursor-kind and promotion-shape
        regression is appropriate, but it cannot substitute for the new C1
        behavioral oracle; rollout_blockers must be strengthened rather than
        relying on broad report claims.
      applicability: All dimensions apply because the reviewed change set modifies
        both persistent test files, adds a new admitted test, and cites their
        execution as S1 acceptance evidence.
    kind: review-result/v1
    review_id: review-e7bce2c093f44ccca3c0ee4a53eb912ef246fd46
    execution_id: execute-step-result-28b83f1ed43de37e901a79ea9eba98fe3e3f46e73566eec5
    step_id: S1
    cycle_id: review-cycle-0
    cycle_phase: discovery
    change_set_id: change-set-6d88bddf460386620d751e6428795fbe
    review_target_revision: 39aec04709998f1c78ab051e037bb95591b07c7261b4f89157b04c347a4a4999
    verdict: findings
    findings:
      - fingerprint: finding-63fad9ec0fd6323304a2f9481d895779
        category: backfill-range-progression
        file: native/codex-rollout-collector/src/protocol/target_source.rs
        failure_condition: When known_complete_range describes an incomplete prefix or
          interior range, plan_target_source_read selects that already-known
          range again (for example 0..known.end) instead of the missing physical
          range, so repeated requests can replay old bytes and never progress
          coverage to the full snapshot.
        required_behavior: Derive the next bounded read from the missing part of the
          snapshot, advance the accumulated complete range monotonically, and
          prove that a valid known_complete_range request reaches full-snapshot
          coverage without replaying the old range.
        root_cause_status: confirmed
        evidence_refs:
          - native/codex-rollout-collector/src/protocol/target_source.rs
          - native/codex-rollout-collector/tests/rollout_blockers.rs
          - docs/codex/codex-rollout-collector-rust-issues-verification.md
          - docs/workflow/CURRENT_TASK.md
      - fingerprint: finding-56ba22bcb8d74c533ab43a5d5e845535
        category: resource-boundedness
        file: native/codex-rollout-collector/src/protocol/target_source.rs
        failure_condition: The multi-window loop appends every decoded SourceRecord into
          one records Vec, and target mapping then clones and sorts that
          cumulative set; a large but budget-valid backfill therefore retains
          the full raw history in memory despite bounded I/O windows.
        required_behavior: Keep raw-record residency bounded to the current window and
          carry only the formal adapter/reducer/checkpoint state needed across
          windows, while preserving deterministic chronological output and
          stable logical keys.
        root_cause_status: confirmed
        evidence_refs:
          - native/codex-rollout-collector/src/protocol/target_source.rs
          - native/codex-rollout-collector/src/protocol/target_mapping.rs
          - docs/codex/codex-rollout-collector-architecture.md
          - docs/workflow/CURRENT_TASK.md
      - fingerprint: finding-0d9e741858db75be08e2b837ca598acc
        category: cancellation-deadline
        file: native/codex-rollout-collector/src/protocol/target_source.rs
        failure_condition: find_previous_line_start performs a potentially long backward
          seek/read loop without receiving or checking cancellation/deadline
          control; cancellation is checked only before entering it, so an
          oversized line or long boundary scan can remain unresponsive during
          boundary I/O.
        required_behavior: Thread request control through boundary discovery and check
          cancellation/deadline within the backward scan so planning and
          boundary I/O terminate promptly, with a test that changes control
          state during the scan rather than only before the request.
        root_cause_status: confirmed
        evidence_refs:
          - native/codex-rollout-collector/src/protocol/target_source.rs
          - native/codex-rollout-collector/tests/rollout_blockers.rs
          - docs/codex/codex-rollout-collector-architecture.md
          - docs/workflow/CURRENT_TASK.md
      - fingerprint: finding-f055a9eb19e6da4e496a31f4bea6b66a
        category: persistent-test-oracle
        file: native/codex-rollout-collector/tests/rollout_blockers.rs
        failure_condition: The newly admitted P-12 test only checks non-empty tool
          details, turn IDs, and keys, does not prove a tool begin/end straddles
          windows or that logical keys remain equal across overlap/retry, and
          explicitly asserts that known_complete_range rereads 0..known.end,
          locking in the range-progression defect.
        required_behavior: Use independently specified assertions for exact cross-window
          tool association, key equality across reread/overlap, correct
          missing-range progression to terminal coverage, and the required
          pending/gap/mutation/checkpoint fail-closed cases.
        root_cause_status: confirmed
        evidence_refs:
          - native/codex-rollout-collector/tests/rollout_blockers.rs
          - native/codex-rollout-collector/tests/stage4_target_protocol.rs
          - docs/codex/codex-rollout-collector-architecture.md
          - docs/workflow/CURRENT_TASK.md
      - fingerprint: finding-76229f550e746d6e8e0aeedc7c79a1dc
        category: validation-evidence-accuracy
        file: docs/codex/codex-rollout-isolated-closure-verification.md
        failure_condition: The verification report claims a 200-byte segment limit,
          cross-window begin/end attribution, reproducible stable keys, and
          incompatible-checkpoint/gap coverage, while the recorded test uses a
          1000-byte limit and its assertions do not establish those claimed
          behaviors or all listed negative cases.
        required_behavior: Make the report and CR state only behavior directly
          established by the persisted tests and recorded commands, using the
          actual fixture and segment parameters; add the missing assertions
          before claiming the broader C1 evidence.
        root_cause_status: confirmed
        evidence_refs:
          - docs/codex/codex-rollout-isolated-closure-verification.md
          - docs/changes/records/CR-20260916-rollout-blockers-s1.md
          - native/codex-rollout-collector/tests/rollout_blockers.rs
          - docs/workflow/CURRENT_TASK.md
    unresolved_fingerprints: []
    evidence_refs:
      - docs/workflow/CURRENT_TASK.md
      - docs/workflow/CONTRACTS.md
      - docs/workflow/DECISIONS.md
      - docs/codex/codex-rollout-collector-architecture.md
      - docs/codex/codex-rollout-collector-rust-issues-verification.md
      - docs/codex/codex-rollout-isolated-closure-verification.md
      - docs/changes/records/CR-20260916-rollout-blockers-s1.md
      - native/codex-rollout-collector/src/protocol/target_source.rs
      - native/codex-rollout-collector/src/protocol/target_mapping.rs
      - native/codex-rollout-collector/tests/rollout_blockers.rs
      - native/codex-rollout-collector/tests/stage4_target_protocol.rs
    blocker: null
    recorded_at: 2026-09-18T05:25:10.928Z
  step_attempts:
    S1:
      evidence_plan_revision: 6d88bddf460386620d751e6428795fbec1fb69f7fad4f04b67e8c935cc679c14
      max_attempts: 3
      attempts:
        - attempt_id: attempt-7dbd7e3ab797be81a91b562e4f59378f04307a56
          idempotency_key: preflight-5fb0d2bfe1b0b668c503c5baa85ec00744b2b3ac82539fd8fc419015be9c367f
          request_digest: null
          status: implemented
          blocker: null
          evidence_refs:
            - docs/workflow/CURRENT_TASK.md
            - docs/codex/codex-rollout-isolated-closure-verification.md
            - docs/changes/records/CR-20260916-rollout-blockers-s1.md
  review_coverage:
    change_set_id: change-set-6d88bddf460386620d751e6428795fbe
    base:
      kind: runtime-file-manifest/v1
      revision: a17985882ee812d68f76766c8690c9a8e9204799931c9a0b260613a26ff3389a
      entries:
        - path: docs/changes/records/CR-20260916-rollout-blockers-s1.md
          state: absent
          sha256: null
        - path: docs/codex/codex-rollout-isolated-closure-verification.md
          state: absent
          sha256: null
        - path: native/codex-rollout-collector/src/protocol/target_mapping.rs
          state: file
          sha256: 22f4ba5078c39b4cfa822c55726b8a356703af73bba0e38a856656ca7e98e7fb
        - path: native/codex-rollout-collector/src/protocol/target_source.rs
          state: file
          sha256: 485877fc216d9a99e075f874428e183cf8d4823b4cd0d041389a47869d32e899
        - path: native/codex-rollout-collector/tests/rollout_blockers.rs
          state: absent
          sha256: null
        - path: native/codex-rollout-collector/tests/stage4_target_protocol.rs
          state: file
          sha256: 7aebbcd6d4dd9184dd9fd921ef014d725dfae5c201325f173a63cae5d35e7e73
    target:
      kind: runtime-file-manifest/v1
      revision: 39aec04709998f1c78ab051e037bb95591b07c7261b4f89157b04c347a4a4999
      entries:
        - path: docs/changes/records/CR-20260916-rollout-blockers-s1.md
          state: file
          sha256: ab348a245917656e47f045c5a3525927263fe8ad8ec8b6da0ef6534cfb10e03f
        - path: docs/codex/codex-rollout-isolated-closure-verification.md
          state: file
          sha256: 383b33fb0562155fa53f9b58ad0f00e1418f573ffd8e74ca5951a46b2ac6c35d
        - path: native/codex-rollout-collector/src/protocol/target_mapping.rs
          state: file
          sha256: 679ed308f49db6ab5f7472b384400822a6d6a214d1a697cc7ab09e59b2b57f27
        - path: native/codex-rollout-collector/src/protocol/target_source.rs
          state: file
          sha256: 1a43863d52f5baa91a7b370518f7e57e732ac7a023ad12530c35a37c11e0d265
        - path: native/codex-rollout-collector/tests/rollout_blockers.rs
          state: file
          sha256: a68dac09ed578c1e385ea807374b48945d9854ad11657be4860c9516c192222e
        - path: native/codex-rollout-collector/tests/stage4_target_protocol.rs
          state: file
          sha256: 7530d0559ffacd956b5430116910670a378f836b50ef0d6a8b87908b7b4ca23d
    preimages:
      - path: docs/changes/records/CR-20260916-rollout-blockers-s1.md
        state: absent
        sha256: null
      - path: docs/codex/codex-rollout-isolated-closure-verification.md
        state: absent
        sha256: null
      - path: native/codex-rollout-collector/src/protocol/target_mapping.rs
        state: file
        sha256: 22f4ba5078c39b4cfa822c55726b8a356703af73bba0e38a856656ca7e98e7fb
      - path: native/codex-rollout-collector/src/protocol/target_source.rs
        state: file
        sha256: 485877fc216d9a99e075f874428e183cf8d4823b4cd0d041389a47869d32e899
      - path: native/codex-rollout-collector/tests/rollout_blockers.rs
        state: absent
        sha256: null
      - path: native/codex-rollout-collector/tests/stage4_target_protocol.rs
        state: file
        sha256: 7aebbcd6d4dd9184dd9fd921ef014d725dfae5c201325f173a63cae5d35e7e73
    pending_paths:
      - docs/changes/records/CR-20260916-rollout-blockers-s1.md
      - docs/codex/codex-rollout-isolated-closure-verification.md
      - native/codex-rollout-collector/src/protocol/target_mapping.rs
      - native/codex-rollout-collector/src/protocol/target_source.rs
      - native/codex-rollout-collector/tests/rollout_blockers.rs
      - native/codex-rollout-collector/tests/stage4_target_protocol.rs
    last_clean_revision: null
task_store:
  schema_version: 1
  kind: vnext-current-task-store-binding
  format: compact-v2
  manifest_path: docs/workflow/task-data/doc-05c82c8a6e6c9181adfc2be2/manifest.json
  history:
    execution_log: task-store
    applied_proposals: task-store
---
# vNext CURRENT_TASK

## 任务信息

- 任务 ID：002
- 任务标题：修复 rollout 采集阻断并验证隔离闭环。
- 任务 slug：rollout
- 当前状态：active
- 生命周期状态：active
- 恢复需审查：false
- 恢复审查原因：

## 任务输入依据

- path: `docs/workflow/task-basis/TASK_BASIS-002.md`
- revision: `e34835cfad07b3d8a1b8f6300d5d4ab0b4b9bb4038e93469a39be1945a02ab8a`

## 背景与上下文

### Goal

修复 rollout 采集阻断并验证隔离闭环。

### Out of scope

- 产品数据库、正式服务/路由/触发入口、产品历史发布、App、Android、IPC 接入。
- Goal、子代理、完整 outcome 聚合、discovery/lineage/resend 修复、路径披露策略及容量默认值调整。
- 新 analyze mode/message/envelope、公开物理 path/discovery、产品 source epoch/fence、多 analyzer worker。
- vendored Codex 升级、Demo/Spike 修改、其他 worktree 修复直接复制。
- 写入生产 rollout、使用真实用户 source 目录测试；全部旧审计/历史业务矩阵全绿要求。
- 不重复泛审查、不自动修复/清理 TASK-001 deferred findings；不修改 Runtime/skills/managed 文件、共享契约或升级版本；不自动提交/推送 Git。

### Project documents

```json
{"version":1,"sources":[{"path":"docs/README.md","section":"whole document","revision":"sha256:efac8c9825b2689eca44cef0a9b0c7ef8460696c4acdfedb998d2bec24a0b4c4","purpose":"文档中心、CR 追踪与报告规则"},{"path":"docs/codex/codex-rollout-collector-architecture.md","section":"whole document","revision":"sha256:a56772305e08dc77969cb45b0ee055132ce060f181f3e233fac7b7f35355967d","purpose":"外部只读 source、单进程采集、正序有界读取、promotion、隔离持久化和安全恢复"},{"path":"docs/codex/codex-history-sync-node-server-rust-analyzer-interface-index-draft.md","section":"whole document","revision":"sha256:410b302996549d863a60f63156ee2dcfb3739d1b7d391715a63f8f1b79af2c0a","purpose":"四份契约导航与不增加协议/产品接口"},{"path":"docs/codex/codex-rollout-collector-rust-analyzer-startup-contract-draft.md","section":"whole document","revision":"sha256:fd9a6d9af4e3e2662f8db63b64f42bf78c9378ad8f61dd665a7cdd2e73db189d","purpose":"启动 sessions root 和路径隔离"},{"path":"docs/codex/codex-rollout-collector-rust-analyzer-wire-contract-draft.md","section":"whole document","revision":"sha256:af436a4d80e6712e9718c0fd5aa696d34e6b26ce35752023da73d91b6fdf8739","purpose":"三种 mode、单请求多 batch、资源、ACK、complete/error"},{"path":"docs/codex/codex-rollout-collector-rust-analyzer-data-contract-draft.md","section":"whole document","revision":"sha256:b133f74a5f83601e233c8d1fc5dda05c00cb7e34856628dc8653937a54748d39","purpose":"公共 cursor、checkpoint、identity、opaque reducer state、completeness"},{"path":"docs/codex/codex-history-sync-node-server-coordinator-contract-draft.md","section":"whole document","revision":"sha256:095dd67c9aea9035604c764e988cac3bc7d017813c23056b3bbc16905635c7fb","purpose":"单例调度、普通请求重试和 Node 持久化恢复；产品事务后置"},{"path":"docs/codex/codex-rollout-collector-codex-compatibility.md","section":"§4.2、§8","revision":"sha256:762343c476008402d1b75feec01f95e87281a2f5c95decaff9a49ff8d400c790","purpose":"已知事件映射、未知诊断与 fixture oracle"},{"path":"docs/workflow/CONTRACTS.md","section":"Codex Rollout Collector P0-RC.1 隔离边界；Codex 原生会话实时同步核心","revision":"sha256:5a102082b3a6d3c2548df68c2fc0f1496fc6ef45bbc581e140a9923880465d9a","purpose":"formal promotion、additive 内部模型及 IPC 冻结边界"},{"path":"docs/workflow/DECISIONS.md","section":"AD-004、AD-018 至 AD-022","revision":"sha256:d8721637ddb924b5a5c9863fe56c33bbeac8dc80abe390765dacae713812dbcf","purpose":"模块顺序、mode/recovery/source ownership 和旧协议概念分层"},{"path":"docs/codex/codex-rollout-collector-rust-issues-verification.md","section":"§9.2、§9.3、§9.4","revision":"sha256:6e13916957abaf706ea6a3f4caaad48b1092dbf942676ef0c846af674c084115","purpose":"复用 RUST-004/002 已核实定位；不继承旧成功计数或扩展为全部审计修复"}]}
```

## 验收标准

- [ ] C1：公共 backfill 有界补齐并安全衔接 append。plain JSONL 总量大于单段上限、单行低于行/段限制且总量在现有请求预算内；合法新 backfill 意图（包括 preview 后）或合法 backfill continuation/known_complete_range 实际补读缺失历史，范围推进直至连续覆盖完整 snapshot。跨段按历史正序归约，正文/tool 归属及稳定逻辑 key 正确。不得重复读取原范围冒充推进、提高默认预算、整源超段直接拒绝或整份 raw records 常驻内存。保留 snapshot/预算/取消/deadline，规划循环和边界 I/O 及时响应。只有 SegmentAssembly::promote_to_forward_append 安全证明后输出可直接消费的公共 ForwardAppend cursor/checkpoint；调用方原样回传即可 append，测试不读取 opaque reducer payload、不重建内部 cursor、不手改 kind。cursor 不混用，pending tail/gap/partial/解析诊断/source mutation 等不安全情况 fail-closed。
- [ ] C2：已知 item_completed.FileChange/CommandExecution 通过现有 Adapter 映射为 TermLink 自有事件、projection/detail，保留现行保留/截断/脱敏策略允许的文件、diff、命令、输出和可恢复状态。conversation/turn/item/source 关联正确；重复交付、overlap、重读和旧 carrier 重合保持幂等。Node 隔离文件 stores 关闭重开仍保留精确内容和关联。未知类型、缺字段、不完整来源保持 unknown/partial/诊断，不伪造字段或状态。内部模型仅向后兼容 additive 扩展，不扩展整体 retention、失败状态枚举或 task outcome 产品设计。
- [ ] C3：真实 Node collector→当前源码构建的 Rust stdio target→真实 FileAnalysisStore/FileCheckpointStore/FileAnalysisRunStore 隔离闭环。验证 preview→backfill→同源 append、Node/Rust 进程重启、overlap 重试和重复 delivery；复用持久化 stores 后历史不丢不重、顺序/key/详情/关联/cursor 安全正确。验证无增长重试、未换行尾部及后续补齐，至少一次 timeout 或 source/cursor 拒绝；pending tail/失败不覆盖旧完整 checkpoint 或已持久化历史。以独立 fixture 预期逐字段比较，不以非空或请求 completed 代替内容正确，不以 partial 终态冒充完整历史。仅证明采集模块在真实隔离链路可用，不接入产品 DB/业务入口/历史发布/App。

## 允许修改范围

### Read / discovery context

- none

### Allowed Files

- `native/codex-rollout-collector/src/analysis.rs`
- `native/codex-rollout-collector/src/lib.rs`
- `native/codex-rollout-collector/src/main.rs`
- `native/codex-rollout-collector/src/protocol/mod.rs`
- `native/codex-rollout-collector/src/protocol/target_mapping.rs`
- `native/codex-rollout-collector/src/protocol/target_runtime.rs`
- `native/codex-rollout-collector/src/protocol/target_source.rs`
- `native/codex-rollout-collector/src/source/cursor.rs`
- `native/codex-rollout-collector/src/source/jsonl.rs`
- `native/codex-rollout-collector/src/source/mod.rs`
- `native/codex-rollout-collector/src/source/read_plan.rs`
- `native/codex-rollout-collector/src/source/record.rs`
- `native/codex-rollout-collector/src/source/segment.rs`
- `native/codex-rollout-collector/src/codex_adapter/mod.rs`
- `native/codex-rollout-collector/src/codex_adapter/field_mapping.rs`
- `native/codex-rollout-collector/src/model/analysis_event.rs`
- `native/codex-rollout-collector/tests/rollout_blockers.rs`
- `native/codex-rollout-collector/tests/stage4_target_protocol.rs`
- `tests/codexRolloutCollector.isolatedLifecycle.test.js`
- `tests/fixtures/codex-rollout-collector/rust-target.js`
- `docs/codex/codex-rollout-isolated-closure-verification.md`
- `docs/changes/records/CR-20260916-rollout-blockers-s1.md`
- `docs/changes/records/CR-20260916-rollout-blockers-s2.md`
- `docs/changes/records/CR-20260916-rollout-blockers-s3.md`

### Conditional Files

- `src/services/codexRolloutCollector/index.js` when 仅 S3 在真实隔离 Node→Rust→File stores 联调中复现且定位的 C1–C3 consumer 缺陷；不更改共享契约、产品入口或发布边界。
- `src/services/codexRolloutCollector/analyzerProtocol.js` when 仅 S3 在真实隔离 Node→Rust→File stores 联调中复现且定位的 C1–C3 consumer 缺陷；不更改共享契约、产品入口或发布边界。
- `src/services/codexRolloutCollector/analyzerProcessManager.js` when 仅 S3 在真实隔离 Node→Rust→File stores 联调中复现且定位的 C1–C3 consumer 缺陷；不更改共享契约、产品入口或发布边界。
- `src/services/codexRolloutCollector/analysisBatchImporter.js` when 仅 S3 在真实隔离 Node→Rust→File stores 联调中复现且定位的 C1–C3 consumer 缺陷；不更改共享契约、产品入口或发布边界。
- `src/services/codexRolloutCollector/analysisCheckpointStore.js` when 仅 S3 在真实隔离 Node→Rust→File stores 联调中复现且定位的 C1–C3 consumer 缺陷；不更改共享契约、产品入口或发布边界。
- `src/services/codexRolloutCollector/analysisRunStore.js` when 仅 S3 在真实隔离 Node→Rust→File stores 联调中复现且定位的 C1–C3 consumer 缺陷；不更改共享契约、产品入口或发布边界。

## 禁止修改范围

### Forbidden Files

- `.git/**`
- `node_modules/**`
- `AGENTS.md`
- `CLAUDE.md`
- `.agents/**`
- `.claude/**`
- `.workflow-system/**`
- `docs/workflow/**`
- `src/server.js`
- `src/routes/**`
- `src/repositories/**`
- `src/ws/**`
- `src/services/codexIpcClient.js`
- `src/services/codexIpcFeed.js`
- `src/services/codexIpcThreadStream.js`
- `src/services/codexOwnerSurfaceTracker.js`
- `android/**`
- `public/**`
- `data/**`
- `native/codex-rollout-collector/vendor/**`
- `native/codex-rollout-collector/Cargo.toml`
- `native/codex-rollout-collector/Cargo.lock`
- `native/codex-rollout-collector/src/source/discovery.rs`
- `native/codex-rollout-collector/src/source/lineage.rs`
- `native/codex-rollout-collector/tests/business_history_audit.rs`
- `native/codex-rollout-collector/tests/support/run_business_history_audit.cjs`
- `native/codex-rollout-demo/**`
- `native/codex-rollout-compat-spike/**`

## 受影响的契约

- none

## 已确认决策

- 任务只交付 C1–C3 的采集模块真实隔离可用证据，流程为准备→确认→三步定向实施验证→收口；当前 prepare 不实施、不执行产品测试。
- 架构 §2.1.1/§3.1 与 AD-018：一个 Node 实例只管理一个 Rust analyzer process，同时最多一个 in-flight request，每 conversation 一条采集链。Node 仅请求调度/持久化，Rust 读取/解析/分析。
- Wire §3/§4.2、AD-019：backfill 多窗口是同一业务请求，允许一个或多个 batch；Rust 内部按历史正序归约，Node 不编排物理窗口。preview 不转换 cursor；没有合法 backfill cursor 时在 backfill mode 内从安全边界有界重建；同 mode合法 continuation/known_complete_range 必须补缺而非重复原范围。
- CONTRACTS source promotion 与架构 §5.3/§5.4：仅 formal SegmentAssembly::promote_to_forward_append 证明完整连续 snapshot 后输出公共 ForwardAppend；原样回传 cursor/checkpoint 可 append。stage4_target_protocol.rs 完整 backfill 与 pending tail 的 cursor 断言分开，不能把部分安全前缀误作完整 promotion。
- AD-019/Data §9.2：恢复使用持久化 job/source/checkpoint/delivery 身份和普通请求，新 attempt 可新 request_id；Rust 不保存跨进程恢复状态；Node 不解释 reducer payload。
- 用户 §3/§4 已限定现行 retention/截断/脱敏策略，解决架构 §4.6 宽泛真实路径保留与现有 sanitize 策略差距在本任务的适用范围：只补允许内容，不改变路径披露，不扩展 outcome/失败状态模型。
- AD-020/021：接口顶部旧实现状态是历史快照，现行正文/决策定义规范，当前源码定义实际；不借旧 fingerprint/revision/replay 残留扩大公共要求。CONTRACTS 历史阶段4导入时序按现行 Wire §4.4 与 Coordinator §3 解释：batch durable staging 后 ACK，完整 checkpoint 在 complete 校验后；产品 DB publication 后置。
- AD-022 与用户 §3：S1/S2 Rust 先行；S3 明确授权隔离 Node 联调，仅修复真实复现的 C1–C3 consumer 缺陷，不接产品入口。共享契约冲突需 owner 联合分析和用户决策，不能静默覆盖。
- 用户 §5/§6：项目无 mutation domain map，使用 v1 精确路径；S2重复 S1、S3重复 S1/S2 修改权限，用于本任务集成依赖修复而非提前实施后续步骤。Persistent Tests 四资产闭合；不另加未准入测试文件或生产源码内新测试资产。
- 用户 §5：flexible/explicit-user，无 tests-only Red 前置；S1核心 source/cursor 必审，S2并入 S3累计必审，修复仍须定向验证；最终六槽位 due S3，不把前期通过冒充最终源码验收。
- 用户 §7：运行 fixture、日志、stores 和编译产物均 OS TEMP；新 fixture 内容定义在准入测试内并临时物化；helper 尊重显式 CARGO_TARGET_DIR，每次 suite 构建/核验当前 binary，不能只检查 exe 存在。Node独立重启可由准入测试文件自承载 child入口，不新增未授权持久化 helper。
- 基线 HEAD=036c514458d689de660f7cc0d40199dc6f184f09，TASK-001 closed/archived；本次保存前 validate --summary 报告 Runtime 0.20.1。工作区已有 Runtime package/package-lock/kernel、DISTRIBUTION_STATE/RUNTIME_CONTRACT 修改及未跟踪 task-data，均作为既存治理改动保留，不纳入业务实施范围。审计 §9.2 的 RUST-004/002 定位证据继续复用；旧成功数不进入本任务 evidence。
- 沿用用户显式给定 CR-20260916 路径作为文件标识，文内执行日期使用实际日期；每步 draft CR 绑定 C1/C2/C3、步骤和真实证据，未提交写 commit_ref:TBD，后续 Git 提交另行授权，不伪造 active/commit hash。
- 所有计划命令 expected_repo_writes=none：Cargo --locked 且 target 在 TEMP，Node stores/source root 在 TEMP，Git只读检查。代码/测试/报告编辑由本步精确 scope 管理；Runtime治理写入仅走其事务。

## 待确认问题

- none

## 实现方案

- S1: 修复公共 backfill 的缺失范围推进、有界窗口读取、历史正序归约和 formal safe promotion，完整 backfill 输出可直接用于 append 的公共 ForwardAppend/checkpoint；保留控制点、预算和失败边界。在 rollout_blockers.rs 新增公共 target 定向回归，同步 stage4_target_protocol.rs 的现行契约断言；写入 S1 报告/CR。
- S2: 补齐已知 item_completed.FileChange/CommandExecution 的 Adapter→owned event→projection/detail 映射、精确字段/关联/stable key 和旧 carrier 去重；以 rollout_blockers.rs 验证重复/overlap/未知/缺字段/既有脱敏策略。仅必要 additive 内部扩展；保留全部 S1 文件定向修复权限，写入 S2 报告/CR。
- S3: 建立真实 Node→当前构建 Rust stdio→三个 File stores 隔离生命周期测试，覆盖补齐/append/Node及Rust重启/overlap/重复delivery/无增长/pending tail补齐/失败保护和富字段重开。修正 rust-target.js 尊重 CARGO_TARGET_DIR 并构建或核验当前 binary。Node 六个 consumer 文件仅修复真实联调复现的 C1–C3 缺陷；保留 S1/S2 全部集成修复权限。最终版本重跑六槽位并完成累计报告和 S3 CR。

## 传播治理记录



## 实施步骤

- S1: 修复公共 backfill 的缺失范围推进、有界窗口读取、历史正序归约和 formal safe promotion，完整 backfill 输出可直接用于 append 的公共 ForwardAppend/checkpoint；保留控制点、预算和失败边界。在 rollout_blockers.rs 新增公共 target 定向回归，同步 stage4_target_protocol.rs 的现行契约断言；写入 S1 报告/CR。
  - purpose: 修复公共 backfill 的缺失范围推进、有界窗口读取、历史正序归约和 formal safe promotion，完整 backfill 输出可直接用于 append 的公共 ForwardAppend/checkpoint；保留控制点、预算和失败边界。在 rollout_blockers.rs 新增公共 target 定向回归，同步 stage4_target_protocol.rs 的现行契约断言；写入 S1 报告/CR。
  - mutation_scope: native/codex-rollout-collector/src/analysis.rs, native/codex-rollout-collector/src/lib.rs, native/codex-rollout-collector/src/main.rs, native/codex-rollout-collector/src/protocol/mod.rs, native/codex-rollout-collector/src/protocol/target_mapping.rs, native/codex-rollout-collector/src/protocol/target_runtime.rs, native/codex-rollout-collector/src/protocol/target_source.rs, native/codex-rollout-collector/src/source/cursor.rs, native/codex-rollout-collector/src/source/jsonl.rs, native/codex-rollout-collector/src/source/mod.rs, native/codex-rollout-collector/src/source/read_plan.rs, native/codex-rollout-collector/src/source/record.rs, native/codex-rollout-collector/src/source/segment.rs, native/codex-rollout-collector/tests/rollout_blockers.rs, native/codex-rollout-collector/tests/stage4_target_protocol.rs, docs/codex/codex-rollout-isolated-closure-verification.md, docs/changes/records/CR-20260916-rollout-blockers-s1.md
  - required_evidence: 运行 Rust lib + conformance + stage2_input + stage4_target_protocol + rollout_blockers，共五个目标；新增资产前执行允许失败且不得伪报通过。; 必须证明实际多窗口推进和正序归约，不只检查数组非空/complete；跨窗 tool begin/end、无显式 turn_id 的已有 carrier 归属按独立 fixture 检查。; stage4 完整 backfill 期待 ForwardAppend；backfill 拒绝不兼容 ForwardAppend；append 原样消费公共输出。pending tail/gap/诊断不可 promotion。; 新增用例兼容同 request 一个或多个 batch、逐 batch ACK 直到终态；规划循环和边界 I/O 的取消/timeout 约束有可核验证据。
  - review_checkpoint: required: 核心 source/cursor/预算/取消与 formal promotion 安全边界必审。
  - planned_command: $env:CARGO_TARGET_DIR = Join-Path $env:TEMP 'termlink-rollout-blockers-target'
    - expected_repo_writes: none
    - transformation_kind: localized
  - planned_command: cargo test --locked --manifest-path native/codex-rollout-collector/Cargo.toml --lib --test conformance --test stage2_input --test stage4_target_protocol --test rollout_blockers
    - expected_repo_writes: none
    - transformation_kind: localized
  - planned_command: git diff --check
    - expected_repo_writes: none
    - transformation_kind: localized
  - planned_command: git diff --name-only
    - expected_repo_writes: none
    - transformation_kind: localized
- S2: 补齐已知 item_completed.FileChange/CommandExecution 的 Adapter→owned event→projection/detail 映射、精确字段/关联/stable key 和旧 carrier 去重；以 rollout_blockers.rs 验证重复/overlap/未知/缺字段/既有脱敏策略。仅必要 additive 内部扩展；保留全部 S1 文件定向修复权限，写入 S2 报告/CR。
  - purpose: 补齐已知 item_completed.FileChange/CommandExecution 的 Adapter→owned event→projection/detail 映射、精确字段/关联/stable key 和旧 carrier 去重；以 rollout_blockers.rs 验证重复/overlap/未知/缺字段/既有脱敏策略。仅必要 additive 内部扩展；保留全部 S1 文件定向修复权限，写入 S2 报告/CR。
  - mutation_scope: native/codex-rollout-collector/src/analysis.rs, native/codex-rollout-collector/src/lib.rs, native/codex-rollout-collector/src/main.rs, native/codex-rollout-collector/src/protocol/mod.rs, native/codex-rollout-collector/src/protocol/target_mapping.rs, native/codex-rollout-collector/src/protocol/target_runtime.rs, native/codex-rollout-collector/src/protocol/target_source.rs, native/codex-rollout-collector/src/source/cursor.rs, native/codex-rollout-collector/src/source/jsonl.rs, native/codex-rollout-collector/src/source/mod.rs, native/codex-rollout-collector/src/source/read_plan.rs, native/codex-rollout-collector/src/source/record.rs, native/codex-rollout-collector/src/source/segment.rs, native/codex-rollout-collector/src/codex_adapter/mod.rs, native/codex-rollout-collector/src/codex_adapter/field_mapping.rs, native/codex-rollout-collector/src/model/analysis_event.rs, native/codex-rollout-collector/tests/rollout_blockers.rs, native/codex-rollout-collector/tests/stage4_target_protocol.rs, docs/codex/codex-rollout-isolated-closure-verification.md, docs/changes/records/CR-20260916-rollout-blockers-s1.md, docs/changes/records/CR-20260916-rollout-blockers-s2.md
  - required_evidence: 运行相同五目标 Rust 定向回归；FileChange/CommandExecution 精确字段及关联、重复/overlap/legacy carrier 幂等、unknown/missing 负向对照。; 既有 retention/truncation/redaction 不改变；C2 不引入 broad outcome/failed enum 或 vendor 变更。; 任何 S1 修复重跑相关回归，不借映射修改改变公共 cursor 安全契约。
  - review_checkpoint: not-required: 映射与去重变更执行定向验证后并入 S3 最终累计必审；不是最终豁免。
  - planned_command: $env:CARGO_TARGET_DIR = Join-Path $env:TEMP 'termlink-rollout-blockers-target'
    - expected_repo_writes: none
    - transformation_kind: localized
  - planned_command: cargo test --locked --manifest-path native/codex-rollout-collector/Cargo.toml --lib --test conformance --test stage2_input --test stage4_target_protocol --test rollout_blockers
    - expected_repo_writes: none
    - transformation_kind: localized
  - planned_command: git diff --check
    - expected_repo_writes: none
    - transformation_kind: localized
  - planned_command: git diff --name-only
    - expected_repo_writes: none
    - transformation_kind: localized
- S3: 建立真实 Node→当前构建 Rust stdio→三个 File stores 隔离生命周期测试，覆盖补齐/append/Node及Rust重启/overlap/重复delivery/无增长/pending tail补齐/失败保护和富字段重开。修正 rust-target.js 尊重 CARGO_TARGET_DIR 并构建或核验当前 binary。Node 六个 consumer 文件仅修复真实联调复现的 C1–C3 缺陷；保留 S1/S2 全部集成修复权限。最终版本重跑六槽位并完成累计报告和 S3 CR。
  - purpose: 建立真实 Node→当前构建 Rust stdio→三个 File stores 隔离生命周期测试，覆盖补齐/append/Node及Rust重启/overlap/重复delivery/无增长/pending tail补齐/失败保护和富字段重开。修正 rust-target.js 尊重 CARGO_TARGET_DIR 并构建或核验当前 binary。Node 六个 consumer 文件仅修复真实联调复现的 C1–C3 缺陷；保留 S1/S2 全部集成修复权限。最终版本重跑六槽位并完成累计报告和 S3 CR。
  - mutation_scope: native/codex-rollout-collector/src/analysis.rs, native/codex-rollout-collector/src/lib.rs, native/codex-rollout-collector/src/main.rs, native/codex-rollout-collector/src/protocol/mod.rs, native/codex-rollout-collector/src/protocol/target_mapping.rs, native/codex-rollout-collector/src/protocol/target_runtime.rs, native/codex-rollout-collector/src/protocol/target_source.rs, native/codex-rollout-collector/src/source/cursor.rs, native/codex-rollout-collector/src/source/jsonl.rs, native/codex-rollout-collector/src/source/mod.rs, native/codex-rollout-collector/src/source/read_plan.rs, native/codex-rollout-collector/src/source/record.rs, native/codex-rollout-collector/src/source/segment.rs, native/codex-rollout-collector/src/codex_adapter/mod.rs, native/codex-rollout-collector/src/codex_adapter/field_mapping.rs, native/codex-rollout-collector/src/model/analysis_event.rs, src/services/codexRolloutCollector/index.js, src/services/codexRolloutCollector/analyzerProtocol.js, src/services/codexRolloutCollector/analyzerProcessManager.js, src/services/codexRolloutCollector/analysisBatchImporter.js, src/services/codexRolloutCollector/analysisCheckpointStore.js, src/services/codexRolloutCollector/analysisRunStore.js, native/codex-rollout-collector/tests/rollout_blockers.rs, native/codex-rollout-collector/tests/stage4_target_protocol.rs, tests/codexRolloutCollector.isolatedLifecycle.test.js, tests/fixtures/codex-rollout-collector/rust-target.js, docs/codex/codex-rollout-isolated-closure-verification.md, docs/changes/records/CR-20260916-rollout-blockers-s1.md, docs/changes/records/CR-20260916-rollout-blockers-s2.md, docs/changes/records/CR-20260916-rollout-blockers-s3.md
  - required_evidence: 设置 OS TEMP CARGO_TARGET_DIR 后构建当前 Rust binary，再执行六文件 Node 定向回归；最终重新执行 Rust 五目标回归。; 隔离测试以同一测试文件的 child-process 入口或 TEMP helper 实现真实 Node 重启，Rust 独立进程只走公开 stdio；不能用 fake analyzer/Memory store 冒充 C1–C3 flow。; 对补齐、append、重启、retry/重复、pending 后补齐、timeout/source/cursor 拒绝逐字段核对独立 fixture；pending/失败保留旧完整 checkpoint 和历史。; 六验收槽全部在 S3 绑定最终源文件快照；最后代码修复后相关槽重新取证，旧计数不继承。; 记录 source/binary/fixture 标识、精确命令、实际通过/失败/未执行计数和小型结果证据；执行 diff/check 与累计范围核对，无产品接入。
  - review_checkpoint: required: 真实跨进程持久化与恢复及所有累计 C1–C3 改动必审，包括 S1/S2 后续集成修复。
  - planned_command: $env:CARGO_TARGET_DIR = Join-Path $env:TEMP 'termlink-rollout-blockers-target'
    - expected_repo_writes: none
    - transformation_kind: localized
  - planned_command: cargo test --locked --manifest-path native/codex-rollout-collector/Cargo.toml --lib --test conformance --test stage2_input --test stage4_target_protocol --test rollout_blockers
    - expected_repo_writes: none
    - transformation_kind: localized
  - planned_command: cargo build --locked --manifest-path native/codex-rollout-collector/Cargo.toml --bin codex-rollout-collector
    - expected_repo_writes: none
    - transformation_kind: localized
  - planned_command: node --test tests/codexRolloutCollector.test.js tests/codexRolloutCollector.recovery.test.js tests/codexRolloutCollector.realRust.test.js tests/codexRolloutCollector.defaultHome.test.js tests/codexRolloutCollector.checkpointJobs.test.js tests/codexRolloutCollector.isolatedLifecycle.test.js
    - expected_repo_writes: none
    - transformation_kind: localized
  - planned_command: git diff --check
    - expected_repo_writes: none
    - transformation_kind: localized
  - planned_command: git diff --name-only
    - expected_repo_writes: none
    - transformation_kind: localized

## 回归检查项

### Test Strategy

- mode: flexible
- source: explicit-user
- source_ref: conversation:01a0a8a7-853d-7471-8180-3b6c3c5cc6cd/user@2026-09-17T17:07:57.191Z; rollout-2026-09-16T13-19-06-01a0a8a7-853d-7471-8180-3b6c3c5cc6cd.jsonl:3399
- task_classification: contract-clear-behavior
- rationale: 用户 §5 显式要求 flexible，不要求 tests-only Red；C1–C3 行为契约明确，分步实施与定向验证，真实边界由最终六槽独立取证。

### Validation Plan

- [ ] C1：公共 backfill 有界补齐并安全衔接 append。plain JSONL 总量大于单段上限、单行低于行/段限制且总量在现有请求预算内；合法新 backfill 意图（包括 preview 后）或合法 backfill continuation/known_complete_range 实际补读缺失历史，范围推进直至连续覆盖完整 snapshot。跨段按历史正序归约，正文/tool 归属及稳定逻辑 key 正确。不得重复读取原范围冒充推进、提高默认预算、整源超段直接拒绝或整份 raw records 常驻内存。保留 snapshot/预算/取消/deadline，规划循环和边界 I/O 及时响应。只有 SegmentAssembly::promote_to_forward_append 安全证明后输出可直接消费的公共 ForwardAppend cursor/checkpoint；调用方原样回传即可 append，测试不读取 opaque reducer payload、不重建内部 cursor、不手改 kind。cursor 不混用，pending tail/gap/partial/解析诊断/source mutation 等不安全情况 fail-closed。
- [ ] C2：已知 item_completed.FileChange/CommandExecution 通过现有 Adapter 映射为 TermLink 自有事件、projection/detail，保留现行保留/截断/脱敏策略允许的文件、diff、命令、输出和可恢复状态。conversation/turn/item/source 关联正确；重复交付、overlap、重读和旧 carrier 重合保持幂等。Node 隔离文件 stores 关闭重开仍保留精确内容和关联。未知类型、缺字段、不完整来源保持 unknown/partial/诊断，不伪造字段或状态。内部模型仅向后兼容 additive 扩展，不扩展整体 retention、失败状态枚举或 task outcome 产品设计。
- [ ] C3：真实 Node collector→当前源码构建的 Rust stdio target→真实 FileAnalysisStore/FileCheckpointStore/FileAnalysisRunStore 隔离闭环。验证 preview→backfill→同源 append、Node/Rust 进程重启、overlap 重试和重复 delivery；复用持久化 stores 后历史不丢不重、顺序/key/详情/关联/cursor 安全正确。验证无增长重试、未换行尾部及后续补齐，至少一次 timeout 或 source/cursor 拒绝；pending tail/失败不覆盖旧完整 checkpoint 或已持久化历史。以独立 fixture 预期逐字段比较，不以非空或请求 completed 代替内容正确，不以 partial 终态冒充完整历史。仅证明采集模块在真实隔离链路可用，不接入产品 DB/业务入口/历史发布/App。
- [ ] S1/S2定向取证，S3最终源码重新执行六个验收槽；全部初始 missing，不导入历史通过证据。
- [ ] Rust 为 lib + 四个 integration target，共五目标；Node 六个 test 文件。未知历史审计差异不作为通过要求。
- [ ] 精确记录环境/命令/退出码/实际计数/独立fixture与源码binary SHA256；pending/失败测试需比较原历史/checkpoint，不能仅断言抛错。
- [ ] 每步 git diff --check 与 name-only；最终累计 diff 从准备 HEAD 核对，Runtime管理文件事务单列。

### Persistent Tests

- `native/codex-rollout-collector/tests/rollout_blockers.rs`
  - proves: C1
  - proves: C2
  - owner: user
  - owner_source: explicit-user
  - source_ref: conversation:01a0a8a7-853d-7471-8180-3b6c3c5cc6cd/user@2026-09-17T17:07:57.191Z; rollout-2026-09-16T13-19-06-01a0a8a7-853d-7471-8180-3b6c3c5cc6cd.jsonl:3399#6-7
  - basis: acceptance
  - existing_evidence_insufficiency: 用户明确点名新增公共 target 定向回归及映射验收。 已有审计 runner 混合内部窗口/历史差异，不可作为公共 bounded backfill/安全 promotion 和富字段完整 oracle；新文件当前不存在。
  - assertion_boundary: 真实 TEMP JSONL 经 formal/public target 与 Adapter；精确窗口/顺序/key/字段/关联，未知/缺字段对照；不得改 opaque payload/cursor 绕过契约。
  - failure_disposition: 失败记录为未满足对应 claim；在本步精确范围内定向修复并重验，不弱化 oracle、不清理历史 finding；超范围或共享契约变更停止并请求明确决策。
- `native/codex-rollout-collector/tests/stage4_target_protocol.rs`
  - proves: C1
  - owner: user
  - owner_source: explicit-user
  - source_ref: conversation:01a0a8a7-853d-7471-8180-3b6c3c5cc6cd/user@2026-09-17T17:07:57.191Z; rollout-2026-09-16T13-19-06-01a0a8a7-853d-7471-8180-3b6c3c5cc6cd.jsonl:3399#6-7
  - basis: acceptance
  - existing_evidence_insufficiency: 用户明确要求从 S1 纳入旧协议测试同步。 现有 boundary matrix 将 canonical backfill cursor 仍断言为 Backfill；与已授权 formal promotion 后 ForwardAppend 不符，必须同步。
  - assertion_boundary: 仅同步 C1 受影响公共 source/cursor/promotion 断言；保留错误 kind、pending/gap/mutation 拒绝，不扩大历史矩阵。
  - failure_disposition: 失败记录为未满足对应 claim；在本步精确范围内定向修复并重验，不弱化 oracle、不清理历史 finding；超范围或共享契约变更停止并请求明确决策。
- `tests/codexRolloutCollector.isolatedLifecycle.test.js`
  - proves: C1
  - proves: C2
  - proves: C3
  - owner: user
  - owner_source: explicit-user
  - source_ref: conversation:01a0a8a7-853d-7471-8180-3b6c3c5cc6cd/user@2026-09-17T17:07:57.191Z; rollout-2026-09-16T13-19-06-01a0a8a7-853d-7471-8180-3b6c3c5cc6cd.jsonl:3399#6-7
  - basis: acceptance
  - existing_evidence_insufficiency: 用户要求真实 Node/Rust/三个 File stores 可恢复闭环。 realRust 目前使用含 unknown 的 partial fixture；recovery 测试使用 ControlledManager/fake analyzer，不能证明真实完整补齐和跨进程富字段恢复；新文件不存在。
  - assertion_boundary: 真实进程/stdin stdout/文件重开与独立合成 oracle；主流程不手造 Rust batch，不能以内存重实例化代替 Node 重启或以 partial 当完整。
  - failure_disposition: 失败记录为未满足对应 claim；在本步精确范围内定向修复并重验，不弱化 oracle、不清理历史 finding；超范围或共享契约变更停止并请求明确决策。
- `tests/fixtures/codex-rollout-collector/rust-target.js`
  - proves: C3
  - owner: user
  - owner_source: explicit-user
  - source_ref: conversation:01a0a8a7-853d-7471-8180-3b6c3c5cc6cd/user@2026-09-17T17:07:57.191Z; rollout-2026-09-16T13-19-06-01a0a8a7-853d-7471-8180-3b6c3c5cc6cd.jsonl:3399#6-7
  - basis: acceptance
  - existing_evidence_insufficiency: 用户要求 helper 尊重显式 CARGO_TARGET_DIR 并核验 binary 新鲜度。 当前 helper 硬编码 native/target/debug，exe 存在就不构建；可能运行旧源码，证据失效。
  - assertion_boundary: 解析显式 TEMP target dir，构建或验证当前源码 binary；保留平台 exe 选择与已有 helper consumer API。
  - failure_disposition: 失败记录为未满足对应 claim；在本步精确范围内定向修复并重验，不弱化 oracle、不清理历史 finding；超范围或共享契约变更停止并请求明确决策。

## 回滚点

- Revert only the current step changes if its required validation cannot pass.

## 设计约束



## 发布后验证



## 执行记录

- Store-backed history is retained under task-data; use task-read for exact event, proposal, result, and report reads.
- This section is a bounded navigation preview only; it is not the Runtime fact source.

- create-draft | key=prepare-draft-commit-b95570f4fd68580b86a43c4bba7fa055317e197674c245dc | at=2026-09-18T04:19:30.902Z
- confirm-draft | key=confirm-draft-0a1a0e3dc8704a6e4625f8015bf0f8a6589b2da2a5d84fad | at=2026-09-18T04:27:03.194Z
- step-execution | key=execute-step-result-28b83f1ed43de37e901a79ea9eba98fe3e3f46e73566eec5 | step=S1 | status=in-progress | at=2026-09-18T05:07:30.997Z

