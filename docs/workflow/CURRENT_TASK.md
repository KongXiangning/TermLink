# CURRENT_TASK.md

## 任务信息

- 任务 ID：20260822-001
- 任务标题：实施 Codex 最后一个 turn 编辑重发的 Rust Collector 兼容改造
- 任务 slug：codex-last-turn-replacement-rust-collector
- 当前状态：active
- 创建时间：2026-08-22
- 创建来源：用户明确要求实施 `docs/codex/codex-last-turn-replacement-rust-collector-change-plan.md`
- 任务类型：Rust collector additive compatibility change
- 任务目标：在不扩大到产品数据库、Node 产品持久化、IPC 或 Android 的前提下，让正式 Rust collector 能识别并验证 Codex 当前“最后一个已终止用户 turn 编辑重发”产生的父子 rollout 关系，输出可供阶段 4 隔离协议消费的一对一替换证据，并保持既有读取、解析、归约和阶段 4 兼容性。

## 背景与上下文

Codex 在编辑当前会话最后一个已终止用户问题后，不修改父 rollout 文件，而是创建带 `history_base` 的新 rollout 文件。TermLink 当前业务冻结为：仅允许最后一个用户发起且已终止的 turn 被一对一替换；不把该行为泛化为任意逻辑后缀、多 turn 替换或通用分支图。

实施依据：

- `docs/codex/codex-last-turn-replacement-rust-collector-change-plan.md`
- `docs/codex/codex-rollout-collector-architecture.md`
- `docs/workflow/CONTRACTS.md` 的 P0-RC.1 与阶段 4 隔离边界
- `docs/workflow/DECISIONS.md` 的 AD-006 至 AD-012
- `native/codex-rollout-collector/vendor/codex` 中的 `HistoryPosition` 语义及仓库内 rollout fixture

已有 `native/parse-probe/`、`native/rustup-init.exe`、`native/winlibs.zip` 等未跟踪产物属于任务外工作树内容，必须保留且不得修改。

## 验收标准

1. 既有 `SourceSpec`、full-read、tail/backfill/append、`AnalysisBatch` 和阶段 4 普通 replay 行为保持兼容。
2. collector 能在显式 active source binding 下发现并解析 `history_base`，按父 rollout id 关联父来源，并校验 ordinal/byte cut。
3. 合法场景只接受：父 rollout 最后一个用户发起 turn 已终止，child 在切点后产生一个新的用户 turn；输出稳定的一对一 `replacedTurnId → replacementTurnId` 证据。
4. 父来源缺失、来源/会话不匹配、cut 不等于父最后 turn 起点、父 turn 未终止、child 无用户 turn、child 多个用户 turn、父链循环或来源发生不一致时 fail-closed。
5. 连续 A→B→C 编辑重发可线性解析，且不会把普通 replay 错判为 source epoch replacement。
6. TermLink-owned model/protocol 增加替换证据和 `ReplaceLastTurn` 隔离 mutation；不修改 vendor Codex 类型。
7. 阶段 4 隔离 capability、编码/解码、Node validator/importer（若现有接口需要）能以 additive 方式接受该 mutation；未知能力仍按既有 fail-closed 规则处理。
8. replacement mutation、重复批次、重放、重启和 ACK 场景保持幂等；普通旧 fixture 全部通过。
9. 不修改产品 history provider、正式数据库/迁移、WebSocket/IPC runtime、Android、Demo/Spike 或 vendor。
10. 完成 `cargo fmt --check`、Rust 单元/集成/conformance 测试、相关 Node 隔离测试和变更范围检查；验证结果写入本任务记录。

## 允许修改范围

### Allowed Files

- `native/codex-rollout-collector/src/source/**`
- `native/codex-rollout-collector/src/codex_wire/**`
- `native/codex-rollout-collector/src/codex_adapter/**`
- `native/codex-rollout-collector/src/model/**`
- `native/codex-rollout-collector/src/protocol/**`
- `native/codex-rollout-collector/src/analysis.rs`
- `native/codex-rollout-collector/src/lib.rs`
- `native/codex-rollout-collector/src/main.rs`
- `native/codex-rollout-collector/tests/**`
- `src/services/codexRolloutCollector/analyzerProtocol.js`（仅阶段 4 隔离协议兼容验证）
- `src/services/codexRolloutCollector/analysisBatchImporter.js`（仅阶段 4 隔离 importer 兼容验证）
- `tests/codexRolloutCollector.test.js`
- `tests/fixtures/codex-rollout-collector/**`
- `docs/workflow/CURRENT_TASK.md`

### Conditional Files

- `src/services/codexRolloutCollector/*.js`：只有现有阶段 4 隔离 validator/importer 无法在上述文件内完成 mutation 兼容时，才允许以最小 additive 方式修改；必须先在执行记录中说明调用链和验证证据。
- `docs/codex/**`：只有需要补充 Rust 实施证据、fixture 说明或已实现接口索引时允许修改；不得借此改写尚未冻结的 Node/APP 契约。

## 禁止修改范围

### Forbidden Files

- `native/codex-rollout-collector/vendor/**`
- 产品 history provider、正式数据库 schema/migration、服务端历史 DTO 或产品路由
- `src/ws/terminalGateway.js`
- `src/services/codexIpc*`
- Codex owner/follower、selection generation、Android IPC authority 或 A/B 隔离链路
- `android/**`、公共 UI 与产品历史页面
- `Demo/**`、`Spike/**` 及其他演示/探针实现
- `native/parse-probe/**`、`native/rustup-init.exe`、`native/winlibs.zip`
- `docs/workflow/CONTRACTS.md`、`DECISIONS.md`、`STATUS.md`、`BASELINES.md`、`LESSONS.md`
- 任何会删除、覆盖或重置任务外用户内容的命令

## 受影响的契约

- P0-RC.1 collector 内部链路：`SourceBackend → codex_wire → CodexEventAdapter → AnalysisEvent → AnalysisBatch`。
- source identity、source epoch、snapshot boundary、read cursor 与 fail-closed 语义保持现有兼容规则。
- 阶段 4 是 Rust↔Node analyzer 的隔离协议，不是产品数据库、WebSocket、IPC 或 Android 公共接口。
- `replace_previous` 仍只表达显式 source epoch replacement；最后一个 turn 编辑重发通过独立 replacement evidence/mutation 表达。

## 已确认决策

- 当前业务只支持最后一个已终止用户 turn 的一对一编辑替换。
- `history_base.thread_id` 按父 rollout id 使用，不当作稳定的 `SessionMeta.id`。
- Rust 负责从父子 rollout 与解析结果中给出替换证据；后续服务端仍可复核，但本任务不接入服务端。
- 旧 turn 保留，不在本任务删除；replacement 是独立投影关系，不覆盖旧 turn 的执行终止状态。
- 方案采用 additive extension；vendor Codex 源码只读。
- 不合法或证据不足时 fail-closed，不猜测、不把普通 replay 推导为替换。

## 待确认问题

- 本任务不新增产品层未冻结的字段命名或数据库语义；阶段 4 隔离协议中沿用现有 capability/mutation 编码约定，若现有代码无法承载则记录阻塞并不越界扩展。
- `history_base` 在 vendor 多版本 alias 下的具体字段适配，以本仓库 fixture 和 adapter 代码事实为准；未知变体保持诊断/失败关闭。

## 实现方案

- Goal: 为正式 Rust collector 增加父子 rollout 的最后 turn replacement 识别、验证和阶段 4 隔离 mutation。
- Architecture impact: 只扩展 native collector 及其隔离 analyzer protocol；不改变产品同步权威、数据库或 IPC。
- Technical approach: 先增加 TermLink-owned history-base/lineage 模型和显式 source catalog/resolver，再在 adapter/reducer 层基于真实 turn 起止位置验证一对一替换，最后以 capability-gated `ReplaceLastTurn` 接入阶段 4。
- Alternatives considered: 不采用通用 suffix/branch graph；不把 replacement 错塞进 `sourceEpoch/replace_previous`；不让服务端或文件名猜测父子关系。
- Data / state flow: active rollout discovery → child `history_base` → parent rollout tail → cut/turn validation → new child user turn → `AnalysisBatch` replacement evidence → isolated stage 4 mutation。
- Compatibility: 旧 SourceBackend/AnalysisBatch/普通 replay API 保持；新增字段、capability 和 mutation additive；无能力或证据不足时拒绝新路径但不影响旧路径。
- Risks and rollback: 主要风险是 source catalog 误关联、边界偏移和 partial child 误提交；通过 fixture、fail-closed、旧测试回归控制。回滚点为任务起始基线 `cb1ce2a` 或最近已审查 checkpoint。
- Validation strategy: Rust fmt、unit/integration/conformance、阶段 4 protocol tests、Node isolated validator/importer tests、A→B→C 与非法 fixture、git diff 范围审查。
- Open decisions: 无产品层开放决策；实现细节必须服从上述兼容与隔离边界。

## 传播治理记录

- Design mode: none
- Release mode: none
- 本任务不修改长期治理契约；若实现发现既有冻结契约不足，先停止越界修改并记录证据，另开契约变更任务。

## 实施步骤

1. **source lineage foundation** — completed：增加 history-base、rollout catalog/resolver、来源边界验证及兼容测试。
2. **turn replacement reduction** — completed：增加父最后终止用户 turn 与 child 新用户 turn 的一对一验证、replacement evidence 和 A→B→C 测试。
3. **stage4 isolated protocol** — completed：增加 capability-gated mutation 的 Rust/Node 隔离协议支持和幂等验证。
4. **regression and handoff** — completed：完成相关回归、范围审查并记录交付证据。
5. **review finding remediation** — completed：REV-001 至 REV-006 已完成；REV-006 增加 replacement evidence 一致性和 `history_mode` 兼容性门禁。

## 审查问题队列

### REV-001

- Severity：critical
- Source：`review-current-diff` / `review-implementation`，当前未提交 diff 审查
- Status：resolved
- File / symbol：`src/services/codexRolloutCollector/analysisBatchImporter.js` 的 `MemoryAnalysisStore.applyBatch`、`assertScopeWritable`
- Failure scenario：父 rollout A 已经存在，Rust 输出 child rollout B 的合法 `replace_last_turn` replacement，且按契约 `replace_previous=false`；导入 B 时被现有 source-epoch 门禁拒绝。
- Why current implementation fails：importer 在 replacement 识别前强制要求不同 active source 使用 `replace_previous`，并在 complete 阶段要求其他 source scope 已 retired；这与“保留旧 turn、独立提交 child replacement”的语义冲突。
- Minimal fix direction：增加由已验证 replacement evidence 触发的独立 transition 判断；允许 child scope 成为新的可提交 active scope，同时保留 parent scope 的历史数据，不调用 `replaceConversation` 或 `replace_previous` 清理路径。
- Required test：Memory/File store 均覆盖 A canonical → B replacement (`replace_previous=false`) → complete；断言旧 items、child items、replacement evidence 均保留，并验证重复导入/重启幂等。
- Handoff：implement-current-step

### REV-002

- Severity：critical
- Source：同上
- Status：resolved
- File / symbol：`native/codex-rollout-collector/src/protocol/stage4.rs` 的 lineage replay
- Failure scenario：空 Node store 冷启动 active rollout C，只收到 C batch 和 A→B、B→C replacement facts，A/B 历史 items 不在投影中。
- Minimal fix direction：补充有序父链 replay 或等价的完整历史投影。
- Required test：空 store 从 C 重建后与先导入 A/B 再导入 C 的结果一致。
- Resolution：Rust stage4 lineage replay 输出按 parent → child 排序的完整 `history_items` 与 replacement chain；Node validator 要求 replacement chain 连续收敛到当前 child，importer 从 chain 选择直接 parent 进行 active-head transition。
- Handoff：review-current-diff

### REV-003

- Severity：major
- Source：同上
- Status：resolved
- File / symbol：`analysisBatchImporter.js` 的 replacement conflict 提交顺序
- Failure scenario：同一 replacement key 携带不同证据时，items/mutations 已修改后才抛出 conflict。
- Minimal fix direction：replacement 全量预检或事务/clone 提交。
- Required test：冲突后完整 Memory/File state 保持提交前一致。
- Resolution：importer 在任何 item、derived field、diagnostic、mutation、replacement 或 active-head 写入前预检批次内及持久化 state 中的 replacement evidence；冲突直接 fail-closed。
- Handoff：review-current-diff

### REV-004

- Severity：major
- Source：同上
- Status：resolved
- File / symbol：`analyzerProtocol.js` 的 top-level `replacements` 校验
- Failure scenario：partial/provisional batch 携带 replacement facts 时仍可被 importer 保存。
- Minimal fix direction：只允许 canonical replacement，并在 importer 再次设防。
- Required test：partial/provisional replacement 被拒绝且 state 不变。
- Resolution：validator 拒绝非 canonical batch 的非空 top-level `replacements`；importer 增加 canonical completeness 防线，避免绕过 validator 时持久化 replacement facts。
- Handoff：review-current-diff

### REV-005

- Severity：major
- Source：同上
- Status：resolved
- File / symbol：`stage4.rs` 的 `read_lineage_batch`
- Failure scenario：完整读取父 rollout，前缀未知事件或资源限制导致合法 cut 后 replacement 被误判为 incomplete。
- Minimal fix direction：按 cut 读取必要父后缀并保留有限 metadata/header 校验。
- Required test：大前缀/未知前缀但合法 cut 后缀仍能产生 replacement。
- Resolution：replacement validation 先读取并校验父 session header 与 `history_base.end_byte_offset` 之后的完整 suffix；父 full read 降级为历史 replay 的尽力补充，partial、unknown prefix 和 decoded budget 不再改变 replacement validation 的完整性判断。对 header/suffix 保留 bounded source guard，来源变更仍 fail-closed。
- Required test result：新增大未知前缀 + 2048 字节 decoded budget fixture；合法切点后的父 turn 仍输出 `replacedTurnId → replacementTurnId`，并保持 parent → child 历史顺序。
- Handoff：review-current-diff

### REV-006

- Severity：major
- Source：同上
- Status：resolved
- File / symbol：`analyzerProtocol.js` 的 replacement evidence preflight；`codex_wire/decode.rs` 的 history mode 处理
- Failure scenario：Node 只校验 SourceRef 形状，不校验 source identity 与 cut 的 ordinal/byte 关系；Rust 也未显式约束 `history_mode=paginated`。
- Minimal fix direction：补齐协议层证据一致性校验和 history mode 兼容断言。
- Required test：伪造 source ref/cut/history mode 必须 fail-closed。
- Resolution：Node 现在要求父/子 SourceRef 的 source identity 分别匹配 parent/child rollout，父 turn 起点的 rollout ordinal/byte 必须精确等于 cut，父终止位置不得早于起点，当前 child 的 cut 必须匹配 batch `history_base`。Rust wire facade 拒绝带 `history_base` 但缺失或使用非 `paginated` history mode 的 session meta，并保留 `UnsupportedSchema` 诊断。
- Required test result：新增 Node 伪造 source identity、cut ordinal/byte、父终止顺序、child history base 测试，以及 Rust legacy/missing/paginated history mode conformance 测试。
- Handoff：review-current-diff

## 回归检查项

- `cargo fmt --check`
- Rust workspace 既有单元、integration、formal/conformance 与新增 replacement fixture
- 阶段 4 Rust protocol tests
- `tests/codexRolloutCollector.test.js` 中既有 Node isolated tests
- 新增 duplicate/replay/restart/ACK 和非法输入断言
- `git diff --check`、`git status --short`，确认任务外未跟踪产物未被修改

## 回滚点

- Task start base：`cb1ce2a`
- Last reviewed checkpoint：本任务未提交 diff（Rust/Node 隔离实现与测试已完成）
- Current diff review target：本任务全部未提交 diff；不得触碰任务外未跟踪产物。

## 执行记录

### 2026-08-22 — task package / scope lock

- 已确认实施范围仅覆盖 Rust collector 与阶段 4 隔离协议配套。
- 已核对 P0-RC.1、AD-006 至 AD-012；未发现需要修改长期 CONTRACTS/DECISIONS 的前置缺口。
- 已保留现有 `native/parse-probe/`、`native/rustup-init.exe`、`native/winlibs.zip` 未跟踪产物。
- Context7/current external documentation gate：not applicable；本任务依据仓库内正式 Rust 代码、vendor snapshot、fixture 和冻结文档。
- 下一步：从 source lineage foundation 开始，先读取现有 SourceBackend、wire、adapter、stage4 接口再修改。

### 2026-08-22 — source lineage foundation

- 新增 TermLink-owned `HistoryBaseRef`、`RolloutCatalog`、父来源解析和 rollout 文件名兼容识别；active source 仍必须由调用方显式绑定。
- 在 wire/adapter 中以 additive 方式保留 `history_base`；真实 Codex 样本确认 `history_base.thread_id` 对应父 rollout id，且父切点落在最后用户 turn 起点。
- 增加源文件读取前后长度与 SHA-256 一致性检查；来源变更、截断、增长、父链缺失、循环和非法 cut 均 fail-closed。

### 2026-08-22 — turn replacement reduction

- 新增 `LastTurnReplacement` 与 `validate_last_turn_replacement`，只接受父最后一个已终止用户 turn 到 child 一个新用户 turn 的一对一替换。
- adapter 增加真实 rollout 使用的 `item_completed(UserMessage)` 归约，并保留 completed item 的 turn id。
- 增加非法状态、cut 不匹配、child 多用户 turn、A→B→C 线性链和 source guard 测试；不引入通用 suffix/branch graph。

### 2026-08-22 — stage4 isolated protocol

- 阶段 4 增加 capability-gated `last_turn_replacement_v1` 与 `replace_last_turn` mutation；不复用 `replace_previous`。
- Node validator/importer 以 additive 方式接受并按稳定 `replacement_key` 幂等去重；同 key 证据冲突时拒绝提交。
- 未提供新 capability 时 Rust 返回明确的 unsupported-capability 错误；旧批次和普通 replay 路径保持兼容。

### 2026-08-22 — regression and handoff

- `cargo fmt --all -- --check`：通过。
- `cargo test --all-targets`：通过，73 个单元测试、28 个 conformance、3 个 stage2、5 个 stage3、9 个 stage4 protocol 测试通过。
- `node --test tests/codexRolloutCollector.test.js`：通过，23 项通过。
- `git diff --check`：通过；vendor、产品数据库/历史 provider、IPC、Android 及任务外未跟踪产物未修改。
- 曾执行根目录 `npm ci` 补齐缺失依赖；根目录 `npm test` 已消除依赖缺失，但存在与本任务无关的既有 UI/布局断言失败，且 Windows 服务测试未正常收尾，已停止该进程；本任务相关 Node 隔离测试和 Rust 全量目标测试均独立通过。
- 交付状态：实现范围已完成，等待用户审阅；未执行提交或归档。

### 2026-08-22 — review finding remediation scope

- 本轮只处理 REV-001；允许修改 `src/services/codexRolloutCollector/analysisBatchImporter.js`、`tests/codexRolloutCollector.test.js` 和本任务记录。
- REV-002 至 REV-006 保持 open，不在本轮顺手修复；Rust lineage、产品数据库、IPC、Android、vendor 仍为禁止触碰范围。
- External Documentation Gate：not applicable；本修复只调整 TermLink 自有 importer 的 source transition 状态逻辑，不新增第三方 API 或配置用法。

### 2026-08-22 — REV-001 resolved

- `MemoryAnalysisStore`/`FileAnalysisStore` 新增持久化的 `active_head` 标记；父 scope 在合法 last-turn replacement 后保留 items、mutations 和 replacement evidence，但退出 active-head/source-epoch 竞争。
- replacement child 不再走 `replace_previous` 清理路径；只有 evidence 明确指向当前 active parent rollout 时才允许跨 source scope 转移，错误 parent 或多个 active head 仍 fail-closed。
- `assertScopeWritable` 只允许 active child 完成；File store 先持久化 parent inactive marker，再持久化 child，重启后 duplicate child 仍幂等。
- 新增 Memory/File、complete、旧/新 items、replacement evidence、重启与重复导入回归；`node --test tests/codexRolloutCollector.test.js`：24 项通过。
- REV-002 至 REV-006 未修改，保持 open，等待后续独立修复步骤。

### 2026-08-22 — REV-002 remediation scope

- 本轮只处理 REV-002；允许修改 `native/codex-rollout-collector/src/protocol/stage4.rs`、`native/codex-rollout-collector/tests/stage4_protocol.rs`、`src/services/codexRolloutCollector/analyzerProtocol.js`、`src/services/codexRolloutCollector/analysisBatchImporter.js`、`tests/codexRolloutCollector.test.js` 和本任务记录。
- Rust lineage replay 将按最老 parent 到当前 child 的顺序输出完整 `history_items`；Node 继续把当前 child 作为提交 scope，并保留 replacement facts。
- REV-003 至 REV-006 保持 open；不修改产品数据库、history provider、IPC、Android、vendor 或普通 source reader 语义。
- External Documentation Gate：not applicable；本修复只扩展仓库自有 Rust↔Node 隔离协议的 lineage replay 业务逻辑，不新增第三方 API 或配置用法。

### 2026-08-22 — REV-002 resolved

- Rust `collect_lineage_replay` 现在保留最老 parent 到当前 child 的完整有序历史；合并结果进入 `history_items`，因此 reducer、projection 和 derived fields 在冷启动时都基于完整历史计算。
- Node protocol 校验连续的 replacement chain；importer 从当前 child 反向解析并使用直接 parent 进行 active-head transition，保留全部 replacement evidence。
- 新增 Rust A→B→C 历史顺序断言，以及 Node 空 store 从 C 重建与先导入 A/B 再导入 C 的投影等价性测试。
- `cargo fmt --all -- --check`：通过。
- `cargo test --all-targets`：通过，73 个单元测试、28 个 conformance、3 个 stage2、5 个 stage3、9 个 stage4 protocol 测试通过。
- `node --test tests/codexRolloutCollector.test.js`：通过，25 项通过。
- `git diff --check`：通过；REV-003 至 REV-006 未修改，保持 open。

### 2026-08-22 — REV-003 remediation scope

- 本轮只处理 REV-003；允许修改 `src/services/codexRolloutCollector/analysisBatchImporter.js`、`tests/codexRolloutCollector.test.js` 和本任务记录。
- replacement evidence 必须在 items、derived fields、diagnostics、mutations、active-head 标记和持久化之前完成冲突预检；冲突时 Memory/File state 均保持提交前快照。
- REV-004 至 REV-006 保持 open；不修改 Rust、协议字段语义、产品数据库、history provider、IPC、Android 或 vendor。
- External Documentation Gate：not applicable；本修复只调整 TermLink 自有 importer 的本地原子性检查，不新增第三方 API 或配置用法。

### 2026-08-22 — REV-003 resolved

- `replacementFactsOf` 现在拒绝同一 `replacement_key` 在同一批次中携带不同证据；`assertReplacementFactsCompatible` 在 importer 写入任何业务状态前检查已持久化 replacement evidence。
- 冲突不会改变 items、tool details、task outcomes、usage、projection、diagnostics、mutations、batches、active-head 或操作记录；File store 也不会产生新的持久化写入。
- 新增 Memory/File 冲突前后完整快照、操作记录和 File 重启快照等价性测试。
- `node --test tests/codexRolloutCollector.test.js`：通过，26 项通过。
- `node --check src/services/codexRolloutCollector/analysisBatchImporter.js`：通过。
- `git diff --check`：通过；REV-004 至 REV-006 未修改，保持 open。

### 2026-08-22 — REV-004 remediation scope

- 本轮只处理 REV-004；允许修改 `src/services/codexRolloutCollector/analyzerProtocol.js`、`src/services/codexRolloutCollector/analysisBatchImporter.js`、`tests/codexRolloutCollector.test.js` 和本任务记录。
- top-level `replacements` 只有在 canonical batch 中允许出现；importer 同时做 canonical completeness 防线，避免绕过 validator 时仍能持久化 replacement facts。
- REV-005、REV-006 保持 open；不修改 Rust lineage/source reader、产品数据库、history provider、IPC、Android 或 vendor。
- External Documentation Gate：not applicable；本修复只调整 TermLink 自有阶段 4 validator/importer 的 completeness 约束，不新增第三方 API 或配置用法。

### 2026-08-22 — REV-004 resolved

- `analyzerProtocol` 现在只允许 canonical batch 携带非空 top-level `replacements`；已有 `replace_last_turn` mutation 的 canonical 门禁保持不变。
- importer 增加 `ANALYSIS_REPLACEMENT_REQUIRES_CANONICAL` 防线；非 canonical replacement 不进入 source transition 或任何持久化写入。
- 新增 partial/provisional 两种批次在 Memory/File store 上的 validator 拒绝、状态不变和操作记录不变测试。
- `node --test tests/codexRolloutCollector.test.js`：通过，27 项通过。
- `node --check src/services/codexRolloutCollector/analyzerProtocol.js`：通过。
- `node --check src/services/codexRolloutCollector/analysisBatchImporter.js`：通过。
- `git diff --check`：通过；REV-005、REV-006 未修改，保持 open。

### 2026-08-22 — REV-005 remediation scope

- 本轮只处理 REV-005；允许修改 `native/codex-rollout-collector/src/protocol/stage4.rs`、`native/codex-rollout-collector/tests/stage4_protocol.rs` 和本任务记录。
- 父 rollout 的 replacement validation 使用 `history_base.end_byte_offset` 对齐的 header + suffix range；父 full read 只用于尽力补充 REV-002 的历史 items，未知前缀或 decoded budget 不得阻断合法 replacement。
- REV-006 保持 open；不修改 Node validator、Rust history-mode/source-ref preflight、产品数据库、history provider、IPC、Android 或 vendor。
- External Documentation Gate：not applicable；本修复只调整 TermLink 自有 Rust source plan 和 lineage validation 逻辑，不新增第三方 API 或配置用法。

### 2026-08-22 — REV-005 resolved

- `read_lineage_batch` 将 replacement 事实验证拆为 bounded header/suffix 路径和 best-effort full-history 路径；只有前者决定父 turn 是否可作为合法替换来源。
- 新增 header/suffix snapshot guard、完整 JSONL line boundary 检查、suffix item 幂等合并；未知前缀、full-history decoded budget 或 partial auxiliary history 不会污染 replacement validation。
- `cargo fmt --all -- --check`：通过。
- `cargo test --test stage4_protocol`：通过，10 项通过。
- `cargo test --all-targets`：通过，73 个单元测试、28 个 conformance、3 个 stage2、5 个 stage3、10 个 stage4 protocol 测试通过。
- `node --test tests/codexRolloutCollector.test.js`：通过，27 项通过。
- `git diff --check`：通过；REV-006 未修改，保持 open；任务外未跟踪产物未修改。

### 2026-08-22 — REV-006 remediation scope

- 本轮只处理 REV-006；允许修改 `src/services/codexRolloutCollector/analyzerProtocol.js`、`tests/codexRolloutCollector.test.js`、`native/codex-rollout-collector/src/codex_wire/decode.rs`、`native/codex-rollout-collector/tests/conformance.rs` 和本任务记录。
- Node 只增加阶段 4 隔离协议的 replacement evidence preflight；Rust 只在 wire facade 约束 `history_base` 必须伴随 `history_mode=paginated`。
- 不修改 `docs/workflow/CONTRACTS.md`、`DECISIONS.md`、产品数据库、history provider、IPC、Android、vendor 或 REV-005/其他已解决问题。
- External Documentation Gate：not applicable；本修复只使用仓库内已锁定的 vendor `ThreadHistoryMode` 与 TermLink 自有协议字段，不新增第三方 API 或配置用法。

### 2026-08-22 — REV-006 resolved

- Node analyzer protocol 增加 replacement evidence preflight：三类 SourceRef 的 source identity 必须匹配 rollout 身份；父 turn 起点的 ordinal/byte 必须与 cut 一致；父终止 SourceRef 不得早于起点；当前 child 的 `history_base` 必须与 replacement cut 完全一致。
- Rust `codex_wire` 在解析 SessionMeta 时显式检查 `history_base` 与 vendor `ThreadHistoryMode::Paginated` 的一致性；legacy 或省略 mode 的伪造组合降为 `UnsupportedSchema`，paginated 合法组合继续保留 lineage evidence。
- 为保持既有“持久化 evidence conflict”测试意图，冲突夹具同步移动 cut 与父 turn 起点，先通过新证据门禁再进入 importer conflict preflight。
- `cargo fmt --all -- --check`：通过。
- `cargo test --all-targets`：通过，73 个单元测试、29 个 conformance、3 个 stage2、5 个 stage3、10 个 stage4 protocol 测试通过。
- `node --test tests/codexRolloutCollector.test.js`：通过，28 项通过。
- `git diff --check`：通过；未修改 vendor、产品数据库/历史 provider、IPC、Android 及任务外未跟踪产物。
