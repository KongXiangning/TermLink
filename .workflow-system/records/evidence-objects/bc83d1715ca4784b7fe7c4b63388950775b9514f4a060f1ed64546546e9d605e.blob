# TASK-20260820-002：Codex Rollout Collector 阶段 3：Adapter、事件归约与生命周期 conformance

## 任务元数据

- 项目：termlink
- 任务 ID：20260820-002
- 任务标题：Codex Rollout Collector 阶段 3：Adapter、事件归约与生命周期 conformance
- 任务 slug：codex-rollout-collector-stage-3-adapter-reducer-conformance
- 开始日期：2026-08-20
- 归档日期：2026-08-20
- 最终状态：archived
- 任务开始基线：cecee23d8e36d0c3914b53eaed9f85ada6e49157
- 归档结论：formal native collector 的阶段 3 代码、conformance 与 R-009/R-003 证据已完成并归档；R-010 仍是任务外工作树的 needs-user/deferred 观察项，不被本任务伪装为已解决。

## 任务定义与目标

本任务依据：

- docs/codex/codex-rollout-collector-architecture.md
- TASKS/inbox/INBOX-20260818-001-codex-rollout-collector.md
- TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md 的归档后复核补充
- 用户明确要求

目标是在 native/codex-rollout-collector formal package 内完成架构阶段 3：

1. 完整 Adapter 映射与稳定事件 identity。
2. Tool、Plan、Turn、Usage 的逻辑关联。
3. AnalysisEvent 到 TermLink-owned reducer/projection 的 conformance。
4. 与 Demo oracle 的只读 golden 对照。
5. partial、unknown、alias 的最终 fail-closed 语义。
6. R-009 的 tail → backfill/segment assembly → 连续完整前缀证明 → ForwardAppendCursor promotion → append 生命周期证据。
7. R-003 的默认 PowerShell 环境复测。

## 验收范围与明确不属于本任务的内容

已满足的 formal 验收范围：

- Adapter 覆盖 session、turn、user/assistant message、tool、plan question/answer/action/update、file/search/attachment/artifact、usage/rate limit、compaction、diagnostic、turn outcome、unknown/partial 等类别。
- identity 优先使用 native stable ID，其次使用稳定 source position；显式 target conversation ID 优先；不使用 batch/read 顺序、segment 边界、文件名、随机值或内容哈希。
- reducer/projection 只消费 TermLink 自有 AnalysisEvent，按稳定逻辑 key 幂等归约并保持确定性。
- Tool、Plan、Turn、Usage 可按 conversation、turn、call、question、answer、action 关联。
- Demo/Spike 只读作为 oracle；未修改其实现，也未将其 DTO/reducer 复制为 formal runtime。
- unknown、缺失 alias、partial、截断、错误和中断均保留 UnknownEvent、ParseGap、诊断或 partial，不冒充成功业务事实。
- 同一 plain JSONL fixture 覆盖 tail、backfill、segment assembly、promotion、append、重启反序列化、重复 append 以及 pending/gap/partial/mutation fail-closed。

本任务不声明：

- 完整 analyzer、P0-C、P0-B.4R 或产品级 runtime 已完成。
- Node、Android、IPC、数据库、服务端持久化或 Codex IPC authority 集成已完成。
- Demo/Spike 已被改造成正式实现。
- clean checkout、跨机器工具链可用性或发布环境已验收。

## 实际执行与改动摘要

### Formal Adapter 与事件模型

- 扩展 EventMetadata，分离物理 event_id 与逻辑 item_key。
- 增加 related_item_key 与 IdentityOrigin，明确 native stable ID、stable source position、explicit target 等来源。
- 收紧 conversation identity：显式 target conversation ID 优先；未显式绑定时不把 SessionMeta ID 推断为 canonical conversation ID。
- 完成 legacy/current alias 的统一 TermLink semantic kind 映射。
- 对未知变体、缺失字段、截断和无法安全识别的输入维持 UnknownEvent、ParseGap、诊断或 partial。
- Plan answer/action 保留相关 question 的逻辑关联键；Tool begin/end 使用相同逻辑 key 归并。

涉及 formal 代码的主要路径：

- native/codex-rollout-collector/src/codex_adapter/mod.rs
- native/codex-rollout-collector/src/model/analysis_event.rs
- native/codex-rollout-collector/src/model/mod.rs
- native/codex-rollout-collector/src/protocol/batch.rs
- native/codex-rollout-collector/src/lib.rs

### TermLink-owned reducer/projection

- 新增 formal native 内部 AnalysisReducer 与 AnalysisProjection。
- reducer 只接受 AnalysisEvent，不泄漏 vendor Codex native 类型。
- conversation、turn、tool、plan、usage、outcome 和 diagnostics 按逻辑 key 幂等 upsert。
- segment overlap 与重复 replay 不产生重复逻辑项。
- usage 对每个 turn 采用最后一个有效值；conversation-level usage_total 仅作为 conformance 对照，不成为产品公共 API。
- 正常 turn 不被初始状态错误标记为 PartialRollout；partial terminal、abort、error 不投影为正常完成。

主要新增路径：

- native/codex-rollout-collector/src/analysis.rs

### Source promotion 与 append 生命周期

- TailPreviewCursor、BackfillCursor 不直接转换为 ForwardAppendCursor。
- SegmentAssembly::promote_to_forward_append 只接受连续完整安全前缀、无 pending tail、无 gap/partial/parse diagnostic、source identity/fingerprint/anchor 一致、snapshot boundary 一致、完整行与 ordinal/record continuity 均成立的证明。
- promotion 后覆盖 append、cursor 序列化重启、重复读取和 duplicate append。
- pending tail、gap、partial、mutation、truncation、replacement 或前缀变化均 fail-closed，不发布新的 ForwardAppendCursor。

主要路径：

- native/codex-rollout-collector/src/source/append.rs
- native/codex-rollout-collector/src/source/cursor.rs
- native/codex-rollout-collector/src/source/digest.rs
- native/codex-rollout-collector/src/source/oracle.rs
- native/codex-rollout-collector/src/source/read_plan.rs
- native/codex-rollout-collector/src/source/segment.rs
- native/codex-rollout-collector/src/source/jsonl.rs
- native/codex-rollout-collector/src/source/mod.rs
- native/codex-rollout-collector/src/source/record.rs

### Golden oracle 与测试证据

- 新增 formal stage 3 conformance 测试与 golden fixture。
- Demo/Spike 仅执行只读 full-oracle/determinism 检查；其文件状态保持不变。
- Golden surface 固定 partial、turn/usage、tool call、plan state 与 item-kind stable surface。

主要测试路径：

- native/codex-rollout-collector/tests/conformance.rs
- native/codex-rollout-collector/tests/stage2_input.rs
- native/codex-rollout-collector/tests/stage3_conformance.rs
- native/codex-rollout-collector/tests/fixtures/golden/demo-oracle-stage3.json

### R-003 环境修复

- 仅使用机器上已存在并验证的 D:\ProgramCode\mingw64\mingw64\bin。
- 当前用户 PATH 保留原有项，仅新增一个无重复的既有 MinGW bin 项。
- 未向 Cargo、Rust source、vendor 或仓库写入开发者本机绝对 linker 路径。
- 未修改系统级环境变量或替换/安装工具链。

### Workflow 记录

- 已完成 status、contracts、decisions、host guidance、lessons 与 delivery summary 同步。
- 已记录 AD-007，以及 L-018、L-019、L-020。
- AGENTS.md 已同步阶段 3 formal collector 边界。
- CLAUDE.md 已同步等价规则，但该文件被仓库忽略，不作为本任务 git status 归属证据。
- 未执行 commit、staging、reset、checkout、整树 clean、批量删除或任务外文件搬移。

## 契约、决策与稳定边界

- Formal pipeline 固定为 SourceBackend → codex_wire → CodexEventAdapter → AnalysisEvent → AnalysisBatch。
- Codex native 类型止于 codex_wire facade 与 Adapter 输入边界；下游只使用 TermLink-owned model。
- Demo/Spike 是只读验证 oracle，golden 对照不改变 oracle 实现。
- identity、partial、unknown、alias、segment overlap、append mutation 与 source promotion 语义均保持 fail-closed。
- Codex IPC 实时同步冻结区、Node/Android/数据库和产品 runtime 集成均未触碰。
- 既有 SourceSpec、full-read、analyze_source、AnalysisBatch、ParserProvenance 与 stage 2 source API 保持 backward-compatible；新增字段和 API 为 additive。

关联治理记录：

- docs/workflow/CONTRACTS.md：阶段 3 formal identity、association/reduction、promotion、oracle/compatibility 条目。
- docs/workflow/DECISIONS.md：AD-007 阶段 3 Adapter/reducer/projection/oracle/promotion 决策。
- docs/workflow/LESSONS.md：L-018、L-019、L-020。

## 验证与交付证据

### Formal Rust 验证

以下命令在默认新 PowerShell 进程中完成：

    cargo fmt --manifest-path native/codex-rollout-collector/Cargo.toml -- --check
    cargo check --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline
    cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline

结果：

- cargo fmt：通过。
- cargo check：通过。
- cargo test：退出码 0。
- unit：60 passed。
- Adapter/conformance：28 passed。
- stage2_input integration：2 passed。
- stage3_conformance：5 passed。
- doc tests：0。

其他验证：

- cargo metadata --locked --offline：539 packages，0 Git sources，0 runfiles。
- cargo tree --locked --offline：Codex 包全部来自 native/codex-rollout-collector/vendor/codex formal vendor closure。
- formal path git diff --check：无 whitespace error，仅保留 CRLF conversion warning。
- source-boundary scan：通过。
- Demo CLI full-oracle/determinism：schema 3、14 个有效记录、1 个 future unknown、partial=true、turn-1 usage=70、conversation total=120、tool IDs 为 call-1/call-2、plan state=executing、deterministic hashes=true。
- Demo/Spike git status：无变更。

### Review 与回归

- review-diff：clean with known residual risk；残余仅为 R-010 任务外工作树隔离。
- review-implementation：修正后无 critical/major finding。
- verify-contracts：通过。
- diff-aware regression：通过。
- R-009：同一 plain JSONL fixture 的 tail acquisition、backfill/segment assembly、连续完整前缀证明、promotion、append、restart、duplicate read 与 mutation fail-closed 证据闭合。
- R-003：新的默认 PowerShell 进程中 locked/offline cargo test 全量通过。

## Release evidence

本任务是 formal native 基础层 conformance 任务，不是发布、部署、canary 或 benchmark 任务。

- Release mode：none / not applicable。
- Deploy source：none。
- Target environment：none；仅验证本地 formal Rust package。
- Health checks：not applicable；未启动或变更产品服务。
- Canary window：none。
- Performance baseline：not run；本任务未建立产品性能基线。
- Rollback / recovery：未执行；保留 path-scoped 回滚策略，不执行整树历史重写。
- Release evidence：无发布证据；不得将本任务结果表述为产品发布或生产 ready。
- canary result：not run。
- performance baseline result：not run。
- rollback status：not executed。

## Remaining observations

### R-010：任务外 dirty/untracked 工作树仍需用户确认

- Severity：major / closeout scope。
- Status：needs-user/deferred；不属于本任务 formal 代码修复队列。
- 任务外路径包括 AGENTS.md、TASKS/inbox/**、docs/workflow/** 中其他同步内容、TASKS/paused/**、native/parse-probe/**、native/rustup-init.exe、native/winlibs.zip，以及其他不属于 formal collector 的 dirty/untracked 内容。
- 这些内容的 owner 和是否进入后续提交范围尚未由用户逐项确认。
- 本次归档没有执行 reset、checkout、clean、批量删除、覆盖、移动或整树 staging。
- 后续 closeout 只能先做 path-scoped 归属确认和 staging review；formal collector 可单独审查/提交，任务外内容保持原样，除非用户明确授权。
- 该观察项不改变本任务 formal stage 3 已完成的结论，也不代表任务外路径已经修复。

### 其他边界观察

- 当前用户 PATH 修复已在本机新 PowerShell 进程复测；clean-checkout、跨机器和工具链安装/替换不属于本任务证据。
- ForwardAppendCursor 的 promotion 证据已闭合，但后续生命周期/coordinator 任务仍需保持同样的连续安全前缀、source boundary 和 snapshot boundary 约束。
- 任何 Node、Android、IPC、数据库、持久化或产品 runtime 接入必须创建独立任务并重新 lock-scope。

## Lessons 与可复用经验

- L-018：ForwardAppendCursor 必须由连续安全前缀证明 promotion，不能把 source primitive 存在误写成完整恢复链路已闭合。
- L-019：Demo/Spike 只提供只读 golden/oracle surface，formal projection 必须由 TermLink-owned model 实现。
- L-020：任务外 dirty/untracked 工作树必须在 closeout 时做 owner 与 path-scoped staging review，不得整树清理或回滚。

## 后续关联与下一轮入口

- 后续任务：当前没有已明确的新任务包。
- 下一步：收到新的明确需求后执行 /create-current-task，生成新的 docs/workflow/CURRENT_TASK.md。
- R-010 不是自动创建或自动修复的下一任务；如用户需要处理其归属，应先单独确认 owner、允许路径和 staging/提交授权。
- 归档位置：TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md。
