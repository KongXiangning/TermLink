# CURRENT_TASK.md

## 任务信息

- 任务 ID：20260823-001
- 任务标题：重订 Codex Rollout Collector 会话 lineage 发现与读取设计
- 任务 slug：codex-rollout-collector-session-lineage-replan
- 当前状态：in_progress
- 生命周期状态：active
- 当前 handoff：review-diff
- 创建时间：2026-08-23
- 创建来源：真实 rollout 验证发现原 Rust Collector 任务只覆盖 replacement 子能力，未覆盖会话级文件发现、完整 lineage 重建和 lineage 读取模式
- 任务类型：Rust collector implementation
- Supersedes：`20260822-001` / `codex-last-turn-replacement-rust-collector`
- 恢复需审查：false
- 恢复审查原因：
- Task start base：`7e9f552`
- Last reviewed checkpoint：`7e9f552`
- Current diff review target：`7e9f552..working-tree`
- 任务目标：实现 Rust Collector 的完整会话级业务链路：按有界日期目录发现同一 conversation 的 rollout 文件，读取并验证文件名/SessionMeta/history_base 关系，重建 root→active head 的完整历史（保留被替换 turn），支持 full、tail/backward、backfill、same-file append 和 child transition，并输出 coverage、provenance、checkpoint 与 replacement evidence；不进入产品数据库、App ADTO、IPC 或 Android。

## 本轮范围修订

用户已明确将本任务从“只形成设计”推进为“按方案实施”。因此原先“禁止修改 Rust source/tests”
的设计阶段限制由本节覆盖；Node 产品持久化、服务端数据库、IPC、Android 和 vendor 仍保持禁止。
Rust protocol 的新增字段只属于隔离 Collector↔Node artifact，不是最终产品 DTO/ADTO 契约。

## 本轮范围锁定（2026-08-24）

用户确认调整 Codex rollout source model：active rollout 只追加、既有 byte range 不变；
superseding/resend turn 创建带 `history_base` 的新 child，不回写 parent；被验证为
lineage parent 的 rollout 视为不可变；外部原地修改 Codex rollout 文件不属于 Collector
correctness contract。由此删除 parent auxiliary full-history read 的整文件
before/after fingerprint mutation guard；保留 `history_base`/cut、source identity、cursor/
prefix anchor、读取完整性和 replacement validation。

- Safety mode：`frozen-scope`
- Scope widening：允许新增修改 `docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`，
  原因是本次用户确认改变了长期 source-model 契约；风险限定为 parent full-read 的外部
  mutation 不再由整文件 fingerprint fail-closed，验证方式为 Rust stage4 定向/全量回归、
  格式检查和变更范围审查。
- Allowed change set：`native/codex-rollout-collector/src/protocol/stage4.rs`、相关
  `native/codex-rollout-collector/tests/stage4_protocol.rs` 测试命名/证据、现有
  `docs/codex/**` rollout source 文档、`docs/workflow/CONTRACTS.md`、
  `docs/workflow/DECISIONS.md`、本文件。
- Forbidden：Node 产品持久化、数据库、IPC、Android、vendor、`docs/workflow/STATUS.md`、
  `BASELINES.md`、`LESSONS.md`、任务外未跟踪文件及任何 destructive cleanup。
- Dangerous surfaces：无生产、数据库、部署、权限、迁移或 destructive 操作；本轮不执行
  删除文件、重置历史或整树清理。
- Unlock condition：若实现需要删除 active-source guard、修改 cursor/source identity 语义、
  修改公共 protocol/Node consumer，必须停止并重新取得用户确认。

## Supersede 记录

- 旧任务状态：`superseded`
- 旧任务标题：实施 Codex 最后一个 turn 编辑重发的 Rust Collector 兼容改造。
- 失效原因：旧任务把“显式 active rollout → 父 rollout 校验 → `ReplaceLastTurn`”当作 Rust Collector 的完整目标；真实业务还要求 Collector 自己在有界日期目录内发现同一会话的新 rollout，关联所有有效 lineage 文件，重建包含被抛弃 turn 的完整历史，并在会话级支持 full/tail/backward/append 读取。
- 范围失效：旧任务允许的 `RolloutCatalog` 只覆盖单目录/已知 active source，无法安全覆盖跨日期发现、session-level lineage cursor 和 active head 选择；继续按旧范围实现会把“替换识别器”误当成“历史采集器”。
- 验收失效：旧验收标准只验证已知 active source 下的父链和 replacement evidence，没有要求发现最新文件、跨日期恢复、全历史输出或 lineage 级读取模式。
- Partial diff ownership：提交 `7e9f552` 及其之前的 Rust/Node 隔离实现继续保留，作为新设计的 replacement evidence、stage4 capability、coverage、重启 replay 和 fixture 基础；本任务不回滚、不扩散其代码变更，也不把它宣称为完整 session lineage collector。
- 旧任务 findings：REV-001 至 REV-010 的修复结果、真实 parent/child/stopped fixtures、A→B→C、partial coverage 和隔离协议证据均保留在本文件下方的旧任务执行记录中，后续设计必须继续兼容这些结果。
- 旧任务未完成项：真实会话最新 rollout 的跨日期发现、所有关联文件的完整重建、文件名候选发现与 `history_base` 权威关系的边界、lineage 级 full/tail/backward/incremental 读取尚未形成设计和验收闭环。

## 新任务背景与目标

Codex 普通 rollout 文件仍是 append-only；用户编辑最后一个已终止问题后，Codex 新建 child rollout，并在 `history_base` 中记录父 rollout ID 和 cut。真实会话表明 child 文件可能落在父文件日期目录之后，不能只扫描当前目录。

本任务把 Collector 的职责明确为：

```text
sessionsRoot + conversationId + 可选已知 rollout hint
    ↓
有界日期目录发现同会话候选文件
    ↓
文件名提取 conversation/rollout/time 候选信息
    ↓
读取 SessionMeta/history_base 建立权威父子关系
    ↓
确定 active head，root → head 重建完整历史
    ↓
支持 full / tail-backward / backfill / same-file append / child transition
    ↓
输出历史记录、coverage、source provenance 和 replacement evidence
```

文件名只能用于候选发现和顺序提示；精确父子关系、cut 和会话绑定必须由 rollout 内容和 `history_base` 验证。现有 replacement evidence 是该链路的派生输出，不是 Collector 的全部目标。

## 验收标准

1. 设计明确 Collector 的输入：sessions root、稳定 conversation ID、日期扫描边界、可选已知 source/head hint；不要求全局递归扫描，也不使用 mtime 单独决定 active head。
2. 设计明确同一会话跨日期目录的有界发现算法，能够发现父文件日期之后产生的 child rollout，并对候选文件提取 rollout ID、稳定 conversation ID、文件时间和路径证据。
3. 设计明确文件名候选关系与 `history_base` 权威关系的分工；文件名不能单独证明父子关系，缺失 parent、候选歧义、会话不一致或父链循环必须 fail-closed。
4. 设计明确从 root 到 active head 的完整 lineage 重建：所有有效关联文件的历史记录都进入逻辑历史，被替换的旧 turn 保留，并向 Node/服务端输出可验证的 source lineage 和 replacement facts。
5. 设计明确四类读取语义：单文件 full/tail/backward/append 的既有能力保持不变；新增 session-lineage full replay、tail/backward lineage recovery、同文件 append 和 child rollout transition 的组合规则。
6. 设计明确 cursor/checkpoint 不得跨 child rollout 复用；lineage cursor 至少绑定 active rollout、物理 source fingerprint/anchor、父链身份和各文件安全边界。
7. 设计保留当前最后一个已终止用户 turn 的一对一 replacement invariant、completed/stopped/interrupted、A→B→C、旧 turn 保留和 `ReplaceLastTurn` 隔离协议语义。
8. 设计明确未知事件、未完成尾行、partial lineage 和未知 schema 的 coverage/diagnostic/
   fail-closed 表达，不得静默宣称完整 canonical 历史；外部原地修改 Codex rollout 文件
   不受 Collector correctness contract 支持，Collector 不要求通过 parent full-file
   fingerprint 检测该行为。
9. 相关文档之间职责一致：Collector 设计、Codex 兼容说明、recorder 技术参考和阶段 4.5 server-sync 草案不再互相假设不同的 active rollout 所有者；本轮不冻结产品 DB、WebSocket、App ADTO 或 IPC 契约。
10. 本轮实施必须用 fixture、发现矩阵、读取矩阵、重启恢复矩阵和真实会话 smoke 验证；下游
    阶段 4.5 只消费 Rust lineage batch，不在 Node 侧重新扫描 raw rollout 或猜测关系。

## 允许修改范围

### Allowed Files

- `docs/codex/codex-last-turn-replacement-rust-collector-change-plan.md`
- `docs/codex/codex-rollout-collector-architecture.md`
- `docs/codex/codex-rollout-collector-codex-compatibility.md`
- `docs/codex/codex-rollout-recorder-source-technical-reference.md`
- `docs/codex/codex-last-turn-replacement-server-sync-design.md`（仅修正其对 Rust lineage 输入和 active source discovery 的依赖说明）
- `docs/workflow/CURRENT_TASK.md`
- `native/codex-rollout-collector/src/source/**`
- `native/codex-rollout-collector/src/protocol/**`
- `native/codex-rollout-collector/src/lib.rs`
- `native/codex-rollout-collector/src/protocol/checkpoint.rs`
- `native/codex-rollout-collector/tests/stage4_protocol.rs`

### Conditional Files

- `docs/codex/codex-history-sync-design-principles.md`：只有新的 Collector 输出边界改变阶段 4.5 的上游输入假设时，才补充依赖说明；不得在本任务冻结 DTO/ADTO 字段。
- `docs/codex/codex-history-sync-wire-contract-draft.md`、`docs/codex/codex-history-sync-identity-revision-contract-draft.md`、`docs/codex/codex-history-sync-dto-contract-draft.md`：本轮默认不修改；若发现与新的 lineage source/provenance 语义直接冲突，先记录冲突并停止，不直接改成最终契约。

## 禁止修改范围

- `src/**`、`android/**`、产品侧 `tests/**`、`scripts/**`：不在本轮实施范围。
- `native/codex-rollout-collector/vendor/**`：不得修改 vendor Codex 源码。
- 产品 history provider、正式数据库 schema/migration、服务端路由、WebSocket/IPC runtime、Android SQLite/UI、Demo/Spike。
- `docs/workflow/STATUS.md`、`docs/workflow/BASELINES.md`、`docs/workflow/LESSONS.md`：本轮不修改。
- 任何删除、覆盖或重置任务外未跟踪文件的操作。

## 已确认决策

- Rust Collector 的一级目标是会话 lineage 发现、关联、完整重建和多读取模式；replacement evidence 是派生输出。
- 稳定 conversation ID 必须由调用方显式提供或由已验证的会话绑定提供，不能由文件名单独推断 canonical identity。
- 文件名用于有界候选发现、rollout ID 提取和时间/顺序提示；`history_base` 和 rollout 内容负责权威父子关系与 cut 校验。
- 既有单文件 SourceBackend/full/tail/backward/append 语义保持 backward-compatible；lineage 读取只能 additive 扩展。
- 正常 append、child rollout transition 和物理 source replacement 继续是三种不同语义，不能混用 `ForwardAppendCursor` 或 `replace_previous`。
- 当前业务仍只支持最后一个已终止用户 turn 的一对一编辑替换，不扩展为通用 suffix、multi-turn 或 branch graph。
- 本任务已实施 Rust Collector；服务端数据库、App ADTO、WebSocket 和 IPC 仍待后续独立任务。
- Codex rollout source model：active rollout append-only 且既有 byte range immutable；superseding/
  resend 的 terminal user turn 创建新 child 并通过 `history_base` 引用 parent；验证为 parent
  后 TermLink 按 immutable source 使用；外部原地修改属于 unsupported input，不是 Collector
  correctness contract。
- parent auxiliary full-history read 不再依赖整文件 before/after fingerprint mutation guard；
  该删除不改变 `history_base`、cut、source identity、cursor、读取完整性或 replacement validation。

## 已解决的实施问题

- 最小 discovery 输入固定为 `sessions_root + conversation_id`；可选 active rollout/path hint 只用于
  缩小或验证候选，不能替代 header/history_base 校验。
- active head 优先沿 hint 的唯一 descendant 解析；无 hint 时选择唯一有效 connected leaf；root-like
  stale candidate 只有在文件名时间戳严格早于当前连接链根节点时才只保留 provenance，时间相同、更新或
  无法排序的候选与多 head/缺 parent/循环一起 fail-closed。
- 每个 `lineage_transition` 都携带逐跳 `validation_state`：完整稳定 parent/child 证据通过一对一
  replacement 校验时为 `validated`；Preview、部分 Backfill 或 coverage 不足时为
  `validation_unavailable`；只有发现/关联完成而尚未进入验证时为 `discovered`。明确校验失败仍
  fail-closed，不伪造 `rejected` 成功 batch。
- 同物理文件继续使用原 cursor；child transition 通过 lineage checkpoint 绑定 active head、
  chain、日期边界和 source evidence，绝不把旧 append cursor 当作新 child cursor。
- child 尚未形成 canonical projection 时返回 provisional/partial lineage window，不输出
  replacement mutation；验证通过的 replacement evidence 仍可随 canonical source batch 输出。
- 普通无 seek/index `.zst` 只提供 forward stream：作为 active/root source 可做 forward full
  Replay，但作为 parent 参与 suffix/backfill、replacement validation 或 parent full-history
  replay 时类型化 fail-closed，不伪造 seek/backward/append byte cursor。

## 文档修订方案

- 先修订 Rust Collector change plan，补齐发现、关联、完整重建和 lineage read modes。
- 再修订 architecture、Codex compatibility 和 recorder reference，统一 SourceLocator、vendor 语义和普通 append/child transition 边界。
- 最后修订 server-sync 草案的上游依赖说明，使其消费 Rust 交付的 lineage batch，而不是假定 Node 先自行找到唯一 active path。
- 本轮用户确认了 Codex rollout source model 契约变化；先锁定 scope，再同步 CONTRACTS/DECISIONS，
  不修改 STATUS/BASELINES/LESSONS，也不扩展到产品 DTO、数据库、IPC 或 Android。

## 传播治理记录

- Design mode: architecture/design replan → implementation
- Release mode: none
- 当前 handoff：`review-diff`
- 仅冻结隔离 Rust Collector protocol 的 additive 字段；未冻结产品 DTO、数据库、WebSocket、IPC 或 Android 契约。

## 实施步骤

1. **supersede narrow replacement task** — completed：保留 `20260822-001` 的 findings、执行记录和 `7e9f552` partial diff ownership，建立新的文档重订任务包。
2. **revise collector plan** — completed：补齐会话文件发现、lineage 关联、完整历史重建和 session-level read modes。
3. **implement collector** — completed：新增跨日期 discovery、active-head 选择、root→head replay、tail/backfill lineage window、child transition 和 lineage protocol/checkpoint evidence。
4. **review and handoff** — completed：Rust 全量回归、真实目录四模式 smoke、旧 source 身份重启恢复和目标审查均完成；交付边界仍停留在 Rust Collector，不进入 Node 产品持久化或 App/IPC。
5. **补充审查回归与五文件 synthetic/sanitized fixture** — completed：加入可复用的五文件合成跨日期 fixture，覆盖 full Replay、Preview、Backfill、最新路径重启恢复和 stale root-like provenance；复核同文件 Append/full lineage、父文件 mutation guard、active-head 歧义、transition validation state 与 `.zst` parent fail-closed 回归均在 Rust 测试中有证据。
6. **调整 parent full-read mutation guard 契约** — completed：删除 parent auxiliary full-history read 的整文件 before/after fingerprint 校验，同步 Codex rollout source model 契约并完成 Rust 回归。

## 回滚点

- Task start base：`7e9f552`
- Last reviewed checkpoint：`7e9f552`
- Current diff review target：`7e9f552..working-tree`
- 回滚策略：保留既有阶段 1–4 实现；若本轮新增 discovery 语义被否决，只回退本轮 Rust source/protocol/test 与对应设计文档变更，不触碰 vendor、产品 Node/DB、IPC、Android 和任务外未跟踪文件。

## 新任务执行记录

### 2026-08-23 — scope invalidation and replan

- 真实会话验证确认：同一 conversation 的 rollout 文件可能跨 `2026/08/22` 与 `2026/08/23` 日期目录继续产生；当前代码默认只扫描 active source 所在目录，无法自动发现跨日期 parent/child。
- 当前 `7e9f552` 已完成显式 source 下的 replacement evidence、A→B→C、stopped/interrupted 和阶段 4 隔离协议；这些变更继续作为新任务的可复用基础，不宣称完整 session lineage collector 已完成。
- vendor `HistoryPosition`/`RolloutId` 语义确认 rollout ID 与稳定 conversation/thread ID 分离；vendor snapshot 未提供 TermLink 所需的跨日期 session 文件发现器。

### 2026-08-23 — session lineage collector implementation

- 新增 `source::discover_session` 与 filename/header evidence：按有界 `YYYY/MM/DD` 目录发现
  同会话候选，校验 `SessionMeta.id`，用 `history_base.thread_id` 建立父链；root-like stale
  候选保留在 provenance，不强行成为 active head；歧义、缺 parent、冲突和无完整 header
  均 fail-closed。
- stage4 接入 conversation-only discovery：缺省 source path/source id/source epoch 可由
  active head 安全补全；full replay、preview/tail parent-suffix recovery、backfill、same-file
  append 和 child transition 分别保持既有 cursor 语义，child 不复用旧 rollout append cursor。
- `BatchMessage` 与 `AnalyzerCheckpoint` additive 输出 `discovered_sources`、
  `lineage_transitions`、`lineage_coverage` 和 `lineage_checkpoint`；replacement evidence 仍
  与 projection coverage 分离，partial/unknown 不生成 canonical replacement mutation。
- 新增跨日期、conversation-only、重启后跳过中间 rollout、preview parent suffix、child
  transition append 和 checkpoint evidence 测试；未修改 Node 产品持久化、数据库、IPC、Android、
  vendor 或任务外未跟踪产物。
- 验证：`cargo fmt --all -- --check` 通过；`cargo test --all-targets --no-default-features`
  通过（73 unit、31 conformance、3 stage2、5 stage3、15 stage4）；另以真实目录协议 smoke
  验证 Replay/Preview/Backfill/Append，当前 active head 为
  `01a02a58-18b4-73b3-919b-c11773eb5dcd`，发现 6 个候选、4 条 transition，Replay 输出
  109 个历史事件和 4 条 replacement evidence；Preview 返回 provisional/tail cursor，
  Backfill/Append 返回相应 cursor。真实样本因 unknown/partial 保持
  `coverage_complete=false`，未错误发布 canonical mutation。
- 追加验证重启时携带旧 `source_id/source_epoch/path/cursor/anchor` 的恢复路径：旧身份被当作
  hint，Collector 切换到 child head 并生成新的 lineage epoch；对应 stage4 回归通过。
- `cargo clippy --all-targets --no-default-features` 可完成但保留既有 warning；`-D warnings`
  不能作为本轮门禁，因为当前 crate 已存在重复 `forbid(unsafe_code)`、手工 Default、enum
  大小和参数数量等历史 warning，本轮未扩大到全 crate 清理。
- 当前剩余风险：真实 Codex 文件名/`history_base` compatibility invariant 仍需随着 vendor/UI
  演进维护 fixture；Node/服务端正式持久化和 App ADTO 尚未实施，属于后续阶段 4.5 范围。
- 本轮修改了 Rust Collector source/protocol/test 与对应设计文档；未修改
  `CONTRACTS.md`、`DECISIONS.md`、`STATUS.md`、Node 产品持久化、数据库、IPC、Android、vendor
  或任务外未跟踪产物。

### 2026-08-23 — `.zst` parent lineage strategy freeze

- 确认并冻结普通无 seek/index `.zst` 的 parent lineage 策略：它只能正序 forward stream；
  作为 parent 需要 cut/suffix/full-history 定位时，Collector 返回
  `LineageError::UnsupportedParentSourceCompression`，不发布 lineage batch、replacement
  evidence、cursor、checkpoint 或 mutation。
- active/root `.zst` 的 forward full Replay 保持可用；Preview、Backfill、Append 仍服从
  source capability，不把解压后的逻辑 offset 当作可恢复物理 byte cursor。
- 已同步 change plan、architecture、Codex compatibility 与旧任务 REV-015 记录；seekable/
  indexed/materialized plain JSONL 支持保留为后续独立能力任务。
- 验证：stage4 protocol 17 项通过；Rust 全量目标测试通过（82 unit、31 conformance、3 stage2、5 stage3、17 stage4）；`cargo fmt --check` 与 `git diff --check` 通过。
- External Documentation Gate：not applicable；本步依据仓库内 SourceBackend/read-plan/cursor/
  stage4 lineage 实现与已有 Codex compatibility 文档，不新增第三方 API/SDK/CLI 用法。

### 2026-08-23 — reusable five-file synthetic fixture and regression coverage

- 新增 `native/codex-rollout-collector/tests/fixtures/sanitized-session-5/`：TermLink-owned synthetic/sanitized 五文件 JSONL，覆盖 `2026/08/22` 与 `2026/08/23` 两个日期分区；fixture 内包含一个 stale root-like candidate，以及 `6a1b2c30 → 1a2b3c40 → 2b3c4d50 → 3c4d5e60` 的四级有效 lineage。
- `stage4_protocol` 新增 sanitized fixture 回归：conversation-only 跨日期发现、完整 Replay、Preview、Backfill、仅提供最新 active path 的重启恢复；断言五个候选均进入 provenance、有效四文件链正确重建、synthetic unknown developer-role 事件保持 partial/`validation_unavailable`，不生成 `replace_last_turn` mutation。
- fixture README 固定五个文件的相对路径、字节长度、SHA-256 和三条 cut，并明确其事件由人工构造；小型 complete replacement fixture 仍独立覆盖 active replacement mutation。
- 已有 Rust 回归继续覆盖本轮审查修复：同文件 Append 与完整 lineage 等价、重启后跳过中间 rollout、父 rollout 等长 mutation guard、root-like active-head fail-closed、transition validation state additive/backward-compatible 以及普通 `.zst` parent 类型化拒绝。
- 本步没有把审查中另列的 discovery 读取预算/目录枚举取消与 deadline 问题伪装成已解决；该项未进入前述五个修复步骤，仍需独立实现任务和回归门禁。
- 验证：`cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --test stage4_protocol --no-default-features sanitized_five_file_fixture -- --nocapture` 通过（4 项）；随后执行全量 Rust 目标测试、格式检查和 `git diff --check`。
- External Documentation Gate：not applicable；本步只使用仓库内 Rust Collector、fixture 和真实本地 rollout 样本，不涉及第三方 API/SDK/CLI。

### 2026-08-24 — parent full-read guard contract adjustment

- 用户确认 Codex rollout source model：active rollout append-only、既有 byte range immutable；
  terminal user turn 的 superseding/resend 创建带 `history_base` 的新 child；已验证为 parent
  的 rollout 按 immutable source 使用；外部 in-place modification 不属于 Collector correctness
  contract。
- 删除 `read_lineage_batch()` 中 parent auxiliary full-history read 的整文件 before/after
  fingerprint mutation guard；保留 bounded parent header/suffix guard、`history_base`/cut、
  source identity、cursor/prefix anchor、完整行/pending tail 和 replacement validation。
- 将 source model 同步到 `CONTRACTS.md`、`DECISIONS.md`、Collector change plan、architecture、
  Codex compatibility 和 recorder technical reference；未修改 Node 产品持久化、数据库、IPC、
  Android、vendor 或任务外未跟踪文件。
- 验证：`cargo fmt --manifest-path native/codex-rollout-collector/Cargo.toml -- --check` 通过；
  stage4 定向测试 22/22 通过；Rust `--all-targets --no-default-features` 通过（89 unit、
  31 conformance、3 stage2、5 stage3、22 stage4）；`git diff --check` 通过。
- External Documentation Gate：not applicable；本轮只调整项目内 Rust source contract 和既有
  Collector 读取逻辑，不新增或改变第三方 API/SDK/CLI 用法。
- 当前 handoff：`review-diff`；保留任务外未跟踪 `native/parse-probe/`、`native/rustup-init.exe`、
  `native/winlibs.zip`，未执行清理或提交。

## 旧任务原始包（保留历史，不再作为当前范围）

### 原任务背景与上下文

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
5. **review finding remediation** — completed：REV-001 至 REV-010 已完成；REV-006 增加 replacement evidence 一致性和 `history_mode` 兼容性门禁，REV-010 分离 replacement evidence 与 projection coverage。
6. **真实 rollout 兼容修复 1** — completed：以真实 Codex 事件形状建立 parent/child fixture，并使真实样本输出 canonical replacement 与 `replace_last_turn` mutation。
7. **stopped/interrupted 终止语义修复** — completed：保留 `turn_aborted` 的 partial 内容语义，同时增加明确终止证据，使已停止的最后 turn 可以进入一对一 replacement；其他 partial/unknown 证据继续 fail-closed。
8. **服务重启跳过中间 rollout 恢复** — completed：replay 冷启动自动请求 lineage；Rust 在未给出 candidates/catalog_root 时从 active rollout 同目录恢复缺失的父链，并保持 A→B→C 有序重放。
9. **replacement validation 与 projection coverage 语义分离** — completed：Rust 输出独立的 `ProjectionCoverage`；replacement evidence 由 source batch completeness 验证，只有 complete logical coverage 才生成 active `replace_last_turn` mutation；partial coverage 只允许阶段 4 隔离层暂存证据，不切换 active head。
10. **修复 append delta 与完整 lineage 混用** — completed：普通 append 继续只读取 cursor 之后的增量；session lineage append 另用隔离 adapter 对当前 active rollout 做完整快照，完整快照才参与 lineage 拼接和 replacement validation，并覆盖连续追加、重启恢复与重复请求幂等。
11. **修复父 rollout 完整快照 mutation guard** — completed：父 replacement validation 继续使用 header/suffix 局部证据，同时父历史辅助 full read 增加整文件读取前后 fingerprint 校验，等长 cut 前 mutation fail-closed。
12. **修复 active head/root-like 歧义处理** — completed：连接链旁的 root-like 候选只有在可排序且严格早于连接链根节点时才允许忽略；更新、同时间或不可排序候选返回 `AmbiguousActiveHead`，显式 active hint 也执行同一安全校验；新增旧、新、同时间、不可排序、多 root-like 和 hint 绕过回归。
13. **补齐 transition validation state** — completed：为每个 `LineageTransitionMessage` 增加 additive 的 `validation_state`，完整 Replay/完整 Append lineage 输出 `validated`，Preview/部分 Backfill/coverage 不足输出 `validation_unavailable`，旧 payload 缺失字段默认 `discovered`；明确验证失败仍按请求错误处理。
14. **确认并冻结 `.zst` 父 lineage 策略** — completed：普通无索引 `.zst` 只支持 forward stream；作为 parent 参与 tail/backfill、replacement validation 或 parent full-history replay 时返回类型化 `UnsupportedParentSourceCompression` 并 fail-closed，不发布 lineage/replacement/cursor/checkpoint；ordinary `.zst` active/root 的完整 Replay 仍保持正序读取能力。

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

### REV-007

- Severity：critical
- Source：再次 `review-implementation` 的真实 rollout smoke
- Status：resolved
- File / symbol：`codex_wire::is_known_event_msg_type`、`CodexEventAdapter::adapt_response_item`、`adapt_message`、`adapt_event_msg`、`adapt_item_completed`
- Failure scenario：真实 Codex parent/child rollout 包含 `thread_settings_applied`、`response_item/message(role=user)`、`response_item/reasoning` 以及 `item_completed` 的 Reasoning/Extension/AgentMessage；这些已知当前事件被当作 UnknownEvent，导致 child batch 为 partial，无法产生 `ReplaceLastTurn`。
- Minimal fix direction：仅将已确认的当前 vendor 事件形状标记为已知；用户回显、Reasoning 和非用户 item completion 只生成 Present diagnostic，不生成额外用户 turn；未知角色/未知 variant 继续 fail-closed。
- Resolution：新增真实结构 parent/child fixture；完成上述已知事件适配；阶段 3 golden 更新已知诊断码；stage4 增加真实 fixture 的 replacement mutation 断言。
- Required test result：Rust conformance 30 项、stage3 5 项、stage4 11 项、全量单元 73 项通过；真实目录 smoke 输出 `canonical=true`、1 条 replacement、1 条 `replace_last_turn`、`complete=ok`；Node 隔离测试 28 项通过。
- Handoff：review-current-diff

### REV-008

- Severity：major
- Source：本轮 stopped/interrupted 语义复核与真实 `turn_aborted` 样本验证
- Status：resolved
- File / symbol：`CodexEventAdapter::adapt_turn_aborted`、`AnalysisBatch` 的 source completeness 判定、`EventMetadata::terminal_evidence`
- Failure scenario：Codex 已明确写出 `turn_aborted(reason=interrupted)`，但 adapter 将该事件作为 `PartialRollout` 后，父 batch 在 lineage validator 之前被判为 incomplete，导致“最后一个主动停止 turn 编辑重发”无法产生 replacement。
- Minimal fix direction：把“已知终止事实”和“turn 内容是否完整”分开；显式 abort 保留 `PartialRollout`，新增 TermLink-owned `ExplicitAbort` evidence；只有该 evidence 不阻断 batch completeness，普通 partial/unknown 仍阻断。
- Resolution：`turn_aborted` 输出 `TurnStatus::Interrupted` + `TerminalEvidence::ExplicitAbort`；batch completeness 只豁免该明确终止证据；新增 stopped parent/child 真实事件形状 fixture 和阶段 4 replacement mutation 测试。
- Required test result：Rust 全量 73 unit、31 conformance、3 stage2、5 stage3、12 stage4 通过；Node isolated 28 项通过；真实用户 rollout 第 2054 行 `turn_aborted` 输出 `interrupted / partial_rollout / explicit_abort`，整体 partial 仍被保留。
- Handoff：review-current-diff

### REV-009

- Severity：critical
- Source：再次 `review-implementation` 的服务重启/冷启动路径复核
- Status：resolved
- File / symbol：`CodexRolloutCollector.analyze` 的 replay request 恢复、`stage4.rs::build_rollout_catalog` 与 `collect_lineage_replay`
- Failure scenario：服务重启后只重新发现最新 active rollout C；B 没有在内存中处理，Rust 请求也没有 candidates/catalog_root，父链解析直接得到空 catalog 或 `ParentRolloutMissing`，无法恢复 A→B→C。
- Minimal fix direction：把 replay 作为冷启动可恢复入口；空 lineage request 使用 active source 所在目录作为受限 catalog 根，沿每个 `history_base.parent_rollout_id` 递归解析，仍保留显式 `catalog_root` 优先级、最大深度和 fail-closed。
- Resolution：Node collector 对未显式提供 lineage 的 replay 自动补 `{}`；Rust 以 active source parent directory 发现同目录 Codex rollout，空 `history_base` 普通 replay 直接保持兼容；不依赖中间 rollout checkpoint 或内存状态。
- Required test result：新增真实 Codex 文件名规则的 A→B→C latest-only/restarted-runtime 测试；Rust stage4 13 项、全量 Rust targets 73/31/3/5/13 通过；Node isolated 29 项通过。
- Note：真实用户目录 raw Rust smoke 已输出两条 B/C replacement；其中原始样本另含未支持的 developer message，Node canonical projection 门禁按既有 fail-closed 规则拒绝该样本，不作为本修复的成功凭据。
- Handoff：review-current-diff

### REV-010

- Severity：major
- Source：本轮对真实 rollout partial projection 与 replacement evidence 边界的复核
- Status：resolved
- File / symbol：`AnalysisProjection::complete`、`AnalysisBatch::completeness`、阶段 4 `replacements` / `replace_last_turn`
- Failure scenario：父链或当前 rollout 含已知但暂不完整的历史投影事件时，source 文件本身仍可完整读取且 replacement cut 已通过验证；旧逻辑把 projection `complete=false` 直接当成 replacement evidence 无效，或者为了接受 evidence 过早切换 active head。
- Minimal fix direction：分离三层语义：`AnalysisBatch::completeness` 描述本次 source range，`AnalysisProjection::coverage` 描述逻辑历史投影覆盖，top-level `replacements` 描述已验证事实；只有 complete coverage 才允许 `replace_last_turn` 作为 active projection mutation。
- Resolution：Rust `AnalysisProjection` 增加 `ProjectionCoverage::{unknown,partial,complete}`；lineage replay 汇总 parent/child coverage，但不丢弃已验证 replacements。Node 阶段 4 validator/importer 允许 canonical source batch 携带 partial projection 的 replacement evidence，将无 mutation 的 evidence-only child 持久化为 `pending_replacement`，待 complete coverage 的 `replace_last_turn` 到达后再原子切换 active head；显式 interrupted terminal 保持 `coverage=complete`、内容 `complete=false` 的可表达性。
- Required test result：Rust 全量目标测试 73 unit、31 conformance、3 stage2、5 stage3、13 stage4 通过；Node isolated validator/importer 30 项通过；新增 partial coverage evidence staging、complete mutation commit、禁止 partial coverage mutation 断言。
- Handoff：review-current-diff

### REV-011

- Severity：major
- Source：再次 `review-implementation` 的 append/lineage 语义复核
- Status：resolved
- File / symbol：`native/codex-rollout-collector/src/protocol/stage4.rs` 的 `AnalyzeMode::Append` 与 `collect_lineage_replay`
- Failure scenario：同一 active child 在已有 forward append cursor 后继续追加；物理读取只返回新 suffix，却被当作完整 child batch 参与 lineage 拼接和 replacement validation，导致历史前缀丢失或因缺少 child 初始 user turn 误报 replacement 校验失败。
- Minimal fix direction：严格分离物理 append delta 与 lineage full snapshot；保留 delta 的 source range/progress/cursor 语义，完整 lineage 只消费独立的完整 active snapshot。
- Resolution：`AnalyzeMode::Append` 保持原有 delta 读取和 cursor 推进；当同时存在 session discovery 与同源 cursor 时，collector 使用隔离 `CodexEventAdapter` 完整重读当前 active rollout，并仅将该快照交给 lineage replay/replacement validator。完整快照不完整时 fail-closed，不发布错误的完整 lineage。
- Required test result：新增同一 child 文件连续追加 assistant item、再追加 terminal 的真实 rollout fixture；两次 Append 均使用前一批 cursor 和 reducer checkpoint 模拟服务重启，断言旧/新 turn 均保留、replacement 不误报、第二次结果与完整 Replay 等价，并验证重复 Append 请求幂等。Rust `cargo test --all-targets --no-default-features`：73 unit、31 conformance、3 stage2、5 stage3、16 stage4 全部通过；`cargo fmt --check` 与 `git diff --check` 通过。
- Handoff：review-diff

### REV-012

- Severity：major
- Source：再次 `review-implementation` 的父 rollout full-read mutation guard 复核
- Status：resolved
- File / symbol：`native/codex-rollout-collector/src/protocol/stage4.rs::read_lineage_history_batch`
- Failure scenario：父 rollout 的 cut 前内容发生等长修改；header 和 cut 后 suffix 未变时，原有局部 guard 仍通过，辅助 full history read 可能生成混合快照。
- Minimal fix direction：父 rollout 完整读取必须从读取前到读取后校验整个物理文件 fingerprint；局部 header/suffix guard 继续保留给 replacement validation。
- Resolution：`read_lineage_batch` 在父 header/suffix validation 与 full history read 之前捕获整文件长度/SHA-256，并在完整 lineage 读取完成后复核；不通过则 fail-closed，不返回混合 parent history batch。
- Required test result：新增等长 cut 前内容 mutation 测试，验证 full snapshot guard 拒绝 header/suffix 未覆盖的中间修改；stage4 protocol、Rust 全量目标测试和格式检查通过。
- Handoff：review-diff

### REV-013

- Severity：major
- Source：再次 `review-implementation` 的 active head/root-like 歧义复核
- Status：resolved
- File / symbol：`native/codex-rollout-collector/src/source/discovery.rs::choose_active_head`
- Failure scenario：已有 `A → B` 连接链时，另一个没有 `history_base` 的 root-like rollout `C` 被静默忽略；如果 `C` 是更新候选、与连接链根节点同时间或无法可靠排序，Collector 可能选择错误的 active head。
- Minimal fix direction：只有能证明 root-like 候选严格早于当前连接链根节点时才允许保留为 provenance；其余候选必须返回 `AmbiguousActiveHead`，并让显式 active hint 经过同样校验。
- Resolution：`choose_active_head` 在唯一 connected leaf、唯一 root-like leaf 和 hint-descendant 三条路径统一调用 root-like safety guard；guard 沿候选 active head 的 `history_base` 计算连接链根节点，仅对可排序且严格更早的 root-like 文件放行，更新/同时间/不可排序候选返回确定性排序后的歧义候选列表。
- Required test result：新增旧 root-like 选择 B、新 root-like 歧义、同时间歧义、不可排序歧义、多 root-like 完整诊断，以及 active hint 不能隐藏新 root-like 的测试；Rust 全量目标测试 80 unit、31 conformance、3 stage2、5 stage3、16 stage4 通过。
- Handoff：review-diff

### REV-014

- Severity：major
- Source：再次 `review-implementation` 的 transition DTO 逐跳验证状态复核
- Status：resolved
- File / symbol：`native/codex-rollout-collector/src/protocol/stage4.rs::LineageTransitionMessage`、`collect_lineage_replay`、`collect_lineage_window`
- Failure scenario：transition 只有 parent、child 和 `history_base`，下游无法区分“仅由 discovery 发现”“已通过 replacement validation”以及“当前 Preview/部分 Backfill/coverage 不足而暂不可验证”。
- Minimal fix direction：以 additive 字段加入 `discovered`、`validated`、`validation_unavailable`；明确失败仍是请求错误，不引入可成功返回的 `rejected`。
- Resolution：新增 `LineageTransitionValidationState` 与 `validation_state` 字段；完整稳定 lineage replay 按逐跳 validator 成功结果输出 `validated`，lineage window 对未获得完整证据的每一跳输出 `validation_unavailable`；旧 transition 缺失字段默认 `discovered`；状态数量与 discovered transitions 不一致时 fail-closed。
- Required test result：新增旧 payload 反序列化/新字段序列化测试；跨日期完整 Replay 断言全部 `validated`；Preview 和部分 Backfill/coverage 不足断言全部 `validation_unavailable`；stage4 16 项通过。
- Handoff：review-diff

### REV-015

- Severity：conditional
- Source：再次 `review-implementation` 的 `.zst` 父 lineage 策略复核
- Status：resolved
- File / symbol：`native/codex-rollout-collector/src/protocol/stage4.rs` 的 parent lineage read、`native/codex-rollout-collector/src/source/lineage.rs::LineageError`
- Failure scenario：普通无 seek/index `.zst` 作为 parent rollout 时，若把解压顺序或解压后的逻辑 offset 当作可 seek 的 parent byte cursor，tail/backward/replacement/full-history 可能产生不可恢复或混合的 lineage 结果。
- Minimal fix direction：先冻结普通 `.zst` 的 forward-only 能力边界；parent lineage 所需的 cut/suffix/full-history 读取没有 seekable/indexed 证据时明确 fail-closed，并提供稳定的类型化错误和回归 fixture。
- Resolution：普通 `.zst` 作为 active/root source 仍可做 forward full Replay；作为 parent 进入 `tail_backfill_recovery`、`replacement_validation` 或 parent full-history replay 时统一返回 `UnsupportedParentSourceCompression`，不发布 lineage batch、replacement、cursor、checkpoint 或 mutation；seekable/indexed/materialized 支持另开能力任务。
- Required test result：新增 plain child + compressed `.jsonl.zst` parent 的 stage4 回归，断言类型化错误包含 operation、compression 和 fail-closed 语义；已有 source read-plan/cursor 测试继续锁定 `.zst` 不提供 tail/backward/append；stage4 17 项、全量 Rust 82/31/3/5/17、fmt 和 `git diff --check` 均通过。
- External Documentation Gate：not applicable；本步依据仓库内 SourceBackend、read-plan、cursor、stage4 lineage 实现与既有 Codex compatibility 文档，不新增或改变第三方 API/SDK/CLI 用法。
- Handoff：review-diff

### REV-016

- Severity：major
- Source：再次 `review-implementation` 的 discovery 资源边界复核
- Status：resolved
- File / symbol：`native/codex-rollout-collector/src/protocol/stage4.rs::analyze_request_with_state`、`native/codex-rollout-collector/src/source/discovery.rs::{discover_session,bounded_search_directories,scan_candidates,read_first_line}`
- Failure scenario：Preview、Backfill 或 Append 请求命中 session discovery 时，Collector 在正式 source read 前枚举目录、读取候选 header，并为每个候选计算完整文件 SHA-256；大量目录项、大文件、超长首行、请求取消或 deadline 到期时，这部分 I/O 仍可继续运行并绕过 `resource_limits`。
- Why current implementation fails：`discover_session` 不接收 cancellation/deadline/总读取预算；`max_candidates` 和 `max_date_partitions` 在对应目录项已经枚举后才检查；`read_first_line` 使用可增长 `String`；`scan_candidates` 对全部匹配候选执行无聚合字节上限的 full-file hash。stage4 只在 `discover_session` 返回后再次执行 `check_deadline`。
- Minimal fix direction：保持现有 `discover_session` 入口 backward-compatible，新增受控 discovery 调用或等价内部 control/budget；由 stage4 传入 cancellation、deadline、header/目录项/总 fingerprint 字节上限，并在目录枚举、候选 header 和分块 fingerprint 循环内 fail-closed。完整 fingerprint 只为实际需要的候选计算，或受明确聚合预算约束；失败时不发布 batch、cursor 或 lineage checkpoint。
- Required test：覆盖预取消、discovery 过程中 timeout、超长 header、大量非匹配目录项、候选总 fingerprint 字节超限和正常跨日期 discovery；断言资源失败发生在 source batch 发布前且无 cursor/checkpoint，并运行 Rust 全量 target、fmt 与 `git diff --check`。
- Resolution：保留旧 `discover_session` API；新增 `DiscoveryBudget`/`DiscoveryControl` 与 stage4 受控入口。受控 discovery 在目录项遍历、候选 header 分块读取、候选数量和 fingerprint 分块读取中检查取消/deadline 并消费聚合预算；所有已验证候选继续计算完整 fingerprint，但不再允许无聚合上限的全量 hash。资源失败在分析前返回，不发布 batch、cursor 或 checkpoint。
- Required test result：新增 discovery unit tests 覆盖预取消、已过期 deadline、首个 header chunk 后取消、header 字节预算、包含大量非匹配目录项的扫描预算、fingerprint 总字节预算和跨日期 chain；stage4 增加 fingerprint budget 在 batch/checkpoint 前 fail-closed 回归。`cargo fmt --all -- --check`、`cargo test --all-targets --no-default-features`（89 unit、31 conformance、3 stage2、5 stage3、22 stage4）及 `git diff --check` 均通过。
- External Documentation Gate：not applicable；本步只修改仓库自有 Rust discovery、stage4 resource limits 与测试，不新增第三方 API/SDK/CLI 用法。
- Ownership assessment：`current_task_owned`
- Ownership evidence：当前任务目标与验收明确要求有界跨日期 discovery、资源预算和 fail-closed；定位文件均位于当前 Allowed Files，且不涉及产品 Node、数据库、IPC、Android、vendor 或长期契约变更。
- Recommended route：`queued_fixable_findings`
- Handoff：review-diff

### REV-017

- Severity：major (P1)
- Source：用户要求的 fixture 脱敏复核与范围审查
- Status：resolved
- File / symbol：`native/codex-rollout-collector/tests/fixtures/sanitized-session-5/**`、`tests/stage4_protocol.rs` 及三份 Collector 设计/兼容文档
- Failure scenario：原五文件 fixture 含真实会话正文、真实 ID、真实本机路径及逐字节样本，不能作为仓库内稳定的 TermLink-owned 测试资产；测试和文档也把该 raw 目录当作公共证据。
- Minimal fix direction：将 raw fixture 移出工作树保留可恢复备份，重新合成最小 JSONL；只保留两个日期、5 个候选、stale root-like、root→head 四文件链、3 条 `history_base` 边、synthetic developer-role unknown 事件及 Replay/Preview/Backfill/latest-path restart 语义；按最终 bytes 重算 manifest/cut。
- Resolution：新增 `sanitized-session-5` synthetic/sanitized fixture，README 明确其为 TermLink-owned 且事件由人工构造；所有 IDs、消息、命令、cwd/path、时间均为专用测试数据。stage4 manifest 固定 5 个长度/hash，三条 cut 为 `1/331`、`1/474`、`1/474`；文档改为引用合成 fixture，不再把真实样本当作仓库证据。
- Required test result：四项 sanitized fixture stage4 tests、stage4 全部 22 项、Rust 全量目标测试（89 unit、31 conformance、3 stage2、5 stage3、22 stage4）和 Node isolated collector（30 项）均通过；`cargo fmt --all -- --check`、`git diff --check`、UTF-8/LF、scoped sensitive/old-ID/path scan 均通过。
- External Documentation Gate：not applicable；本步仅修改仓库自有 synthetic fixture、Rust test 与 Collector 文档，不依赖第三方 current behavior。
- Ownership assessment：`current_task_owned`
- Handoff：review-diff

### 2026-08-23 — REV-017 synthetic fixture replacement

- raw `real-session-5` 未跟踪目录已移出工作树并保留为本地可恢复临时备份；仓库只保留 `sanitized-session-5` 五文件 synthetic fixture。
- 合成 fixture 固定 5 candidates：stale root-like conversation rollout、root rollout、3 个 paginated child；日期为 `2026/08/22` 与 `2026/08/23`；root→head chain 为 `6a1b2c30 → 1a2b3c40 → 2b3c4d50 → 3c4d5e60`，3 条 cut 为 `1/331`、`1/474`、`1/474`。
- 最终 bytes manifest：`1115 / 6947576cbf145e033ebd7980e9841ece7f822888eab9173b291e6a46b5db2777`、`1115 / 69a592fed3aa103532b74a6c63fe97d564ec253afe64eb8a071995f26d33619e`、`1258 / 81fad02d157560bf6504290a752c2a65639e97a4391869884fc18da017e641b3`、`1258 / 65cedc06cde291249805532e0441e372f055beb837337bda70fe61b8904696bb`、`1492 / f030e72d36a8b079a889be12476583a7a6e8c405e686000787ef81ababbe901e`。
- synthetic active head 的 developer-role message 保持 `unknown_event`，因此 Replay/Preview/Backfill 的 transition 继续为 `validation_unavailable`，不发布 replacement mutation；latest-path restart 仍恢复全部 5 个 provenance candidates。
- External Documentation Gate：not applicable；本步无第三方文档依赖。

## 回归检查项

- `cargo fmt --check`
- Rust workspace 既有单元、integration、formal/conformance 与新增 replacement fixture
- 阶段 4 Rust protocol tests
- `tests/codexRolloutCollector.test.js` 中既有 Node isolated tests
- 新增 duplicate/replay/restart/ACK 和非法输入断言
- 新增 latest-only parent-chain replay、active source 同目录 catalog discovery 和 replay request lineage 默认恢复断言
- 新增同一 active child 的连续 append/restart/full-lineage 等价与重复请求幂等断言
- 新增父 rollout 等长 cut 前 mutation 的完整快照 guard 断言
- 新增 active head/root-like 旧、新、同时间、不可排序、多候选和 hint 安全校验断言
- 新增 transition validation state 的旧 payload 兼容、完整 Replay、Preview 和部分 Backfill 断言
- 新增普通 `.zst` parent lineage 类型化 fail-closed 断言，并保留 `.zst` forward-only read-plan/cursor 约束
- `git diff --check`、`git status --short`，确认任务外未跟踪产物未被修改

## 回滚点

- Task start base：`cb1ce2a`
- Last reviewed checkpoint：`55b583d`（上一轮 Rust/Node 隔离实现提交）
- Current diff review target：相对 `55b583d` 的本轮真实 rollout 兼容修复工作树变更，包含 real parent/child 与 stopped parent/child 四个新增 Rust fixture，以及 TermLink-owned terminal evidence / batch completeness 变更；不得触碰任务外未跟踪产物。

### 2026-08-23 — REV-011 append/lineage 修复

- 本轮只处理 REV-011；修改范围为 Rust stage4 lineage 逻辑、stage4 protocol 回归和本任务记录；未修改 discovery 预算、root-like active head、父文件 mutation guard、transition DTO、`.zst` 策略、Node/数据库/App/IPC/Android/vendor。
- `Append` 的物理 delta 与完整 lineage replay 已分离：原 append batch 继续负责增量 source range、progress 和 forward cursor；同源 session-lineage append 通过隔离 adapter 完整读取 active child，避免以 suffix 重建 child 历史。
- 完整 active snapshot 若不满足 canonical/full-range/稳定边界，直接 fail-closed，不把不完整快照发布为完整 lineage；正常单文件 append 路径保持不变。
- 新增连续两次 append、每次重启恢复、full replay 等价、replacement evidence 与重复请求幂等测试。
- 验证：`cargo fmt --manifest-path native/codex-rollout-collector/Cargo.toml -- --check` 通过；`cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --all-targets --no-default-features` 通过（73 unit、31 conformance、3 stage2、5 stage3、16 stage4）；`git diff --check` 通过。
- 当前 handoff：`review-diff`；未执行提交；任务外未跟踪 `native/parse-probe/`、`native/rustup-init.exe`、`native/winlibs.zip` 未修改。

### 2026-08-23 — REV-012 父 rollout full-read mutation guard 修复

- 本轮只处理 REV-012；修改范围为 Rust stage4 full-history guard、stage4 protocol 单元测试和本任务记录；未处理 discovery 预算、root-like active head、transition DTO、`.zst` 策略、Node/数据库/App/IPC/Android/vendor。
- 父 replacement validation 的 header/suffix guard 保持不变；整个 parent lineage read 现在由整文件 snapshot guard 覆盖，读取前后校验 file length 与 SHA-256，等长 cut 前修改也会 fail-closed。
- 验证：guard 定向测试通过；`cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --test stage4_protocol --no-default-features` 通过（16 项）；全量 `--all-targets --no-default-features` 通过（74 unit、31 conformance、3 stage2、5 stage3、16 stage4）；`cargo fmt --manifest-path native/codex-rollout-collector/Cargo.toml -- --check` 和 `git diff --check` 通过。
- External Documentation Gate：not applicable；本步只调整项目内 Rust source guard 业务逻辑，不新增或改变第三方 API/SDK/CLI 用法。
- 当前 handoff：`review-diff`；未执行提交；任务外未跟踪文件未修改。

### 2026-08-23 — REV-013 active head/root-like 歧义修复

- 本轮只处理 REV-013；修改范围为 Rust discovery active-head 选择、discovery 单元测试和本任务记录；未处理 discovery 资源预算、transition DTO、`.zst` 策略、Node/数据库/App/IPC/Android/vendor。
- 连接链旁的 root-like 候选现在按连接链根节点做保守时间比较：严格更早才可视为旧 provenance；更新、同时间、时间戳不可排序或无法证明顺序时 fail-closed，错误保留涉及 active head 的确定性候选列表。
- 显式 active rollout/path hint 仍可缩小候选并沿唯一 descendant 解析，但不会跳过 root-like 安全校验。
- 验证：`cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --lib --no-default-features` 通过（80 项）；随后 `cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --all-targets --no-default-features` 通过（80 unit、31 conformance、3 stage2、5 stage3、16 stage4），并通过 `cargo fmt --check`、`git diff --check`。
- External Documentation Gate：not applicable；本步只调整项目内 Rust discovery 业务逻辑，不新增或改变第三方 API/SDK/CLI 用法。
- 当前 handoff：`review-diff`；未执行提交；任务外未跟踪文件未修改。

### 2026-08-23 — REV-014 transition validation state 修复

- 本轮只处理 REV-014；修改范围为 Rust stage4 transition DTO/lineage replay-window 状态传播、stage4 protocol 回归、collector change plan 与本任务记录；未处理 discovery 资源预算、`.zst` 策略、Node/数据库/App/IPC/Android/vendor。
- `LineageTransitionMessage.validation_state` 为 additive 字段：`discovered` 表示仅完成发现关联，`validated` 表示完整稳定 parent/child replacement validation 通过，`validation_unavailable` 表示 Preview/部分 Backfill/coverage 不足未具备验证条件；当前明确校验失败仍 fail-closed，不输出 `rejected` batch。
- 完整 Replay 与完整 Append lineage 逐跳输出 `validated`；Preview 和部分 Backfill lineage window 逐跳输出 `validation_unavailable`；旧 transition JSON 缺少字段时默认 `discovered`，状态数量不匹配时拒绝发布 metadata。
- 验证：`cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --test stage4_protocol --no-default-features` 通过（16 项）；随后全量 `cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --all-targets --no-default-features` 通过（81 unit、31 conformance、3 stage2、5 stage3、16 stage4），并通过 `cargo fmt --check`、`git diff --check`。
- External Documentation Gate：not applicable；本步只扩展 TermLink 自有 Rust 协议字段和既有业务逻辑，不新增或改变第三方 API/SDK/CLI 用法。
- 当前 handoff：`review-diff`；未执行提交；任务外未跟踪文件未修改。

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

### 2026-08-22 — 真实 rollout 兼容修复 1

- 本轮只处理真实 rollout 事件形状导致的 canonical replacement 不可达问题；允许修改 `native/codex-rollout-collector/src/codex_wire/decode.rs`、`native/codex-rollout-collector/src/codex_adapter/mod.rs`、Rust conformance/stage3/stage4 tests、Rust fixture/golden 和本任务记录。
- `thread_settings_applied` 现在按 vendor 已知 event 解码并作为 Present diagnostic；`response_item/message(role=user)` 保留为非 canonical 回显；Reasoning、Extension、AgentMessage 的 `item_completed` 保留为非用户 completion metadata；真正未知角色/variant 继续 UnknownEvent/fail-closed。
- 新增 `last-turn-replacement-real-parent.jsonl` 与 `last-turn-replacement-real-child.jsonl`，child cut `end_byte_offset=1027` 与 parent 最后一个 turn 起点一致，并覆盖真实样本中的事件组合。
- `cargo fmt --all -- --check`：通过。
- `cargo test --all-targets --offline`：通过，73 个单元测试、30 个 conformance、3 个 stage2、5 个 stage3、11 个 stage4 protocol 测试通过。
- `node --check src/services/codexRolloutCollector/analyzerProtocol.js`、`node --check tests/codexRolloutCollector.test.js`：通过；`node --test tests/codexRolloutCollector.test.js`：28 项通过。
- 本地 smoke（不记录本机路径或真实会话标识）：batch `canonical`、`complete=true`、1 条 replacement、1 条 `replace_last_turn` mutation、complete `status=ok`；输出的 parent/child rollout、旧/新 turn ID 和 cut 与 fixture 证据一致。
- `git diff --check`：通过；未修改 vendor、产品数据库/历史 provider、IPC、Android 及任务外未跟踪产物。
- Context7/current external documentation gate：not applicable；本轮未新增第三方 API/SDK/CLI 用法，仅基于仓库 vendored Codex snapshot、TermLink-owned adapter 和真实 fixture。

### 2026-08-22 — stopped/interrupted 终止语义修复

- 本轮只处理显式 `turn_aborted` 的最后 turn 终止语义；未扩展到 Node 产品持久化、数据库、IPC、Android 或通用分支模型。
- `TurnStatus::Interrupted` 保留；事件 metadata 保留 `PartialRollout`，并新增 `TerminalEvidence::ExplicitAbort`，避免把停止时可能不完整的内容冒充完整成功结果。
- `AnalysisBatch` 在完整性判定时只忽略该明确终止证据；仍有 compaction、parse gap、unknown 或其他 partial 记录时，batch/projection 继续 partial，原有 `abort-compaction` 语义不变。
- 新增真实 Codex event shape 的 stopped parent/child fixture；阶段 4 验证 old turn → replacement turn，并断言保留 `TurnStatus::Interrupted`。
- `cargo fmt --all -- --check`：通过。
- `cargo test --all-targets --offline`：通过，73 个单元测试、31 个 conformance、3 个 stage2、5 个 stage3、12 个 stage4 protocol 测试通过。
- `node --check src/services/codexRolloutCollector/analyzerProtocol.js`、`node --check src/services/codexRolloutCollector/analysisBatchImporter.js`：通过；`node --test tests/codexRolloutCollector.test.js`：28 项通过。
- 本地 smoke（不记录本机路径或真实 rollout ID）：中途事件输出 `status=interrupted`、`availability=partial_rollout`、`terminal_evidence=explicit_abort`；整体因其他未知历史事件保持 partial，未错误升级为 canonical。
- `git diff --check`：通过；任务外的 `native/parse-probe/`、`native/rustup-init.exe`、`native/winlibs.zip` 未修改。
- Context7/current external documentation gate：not applicable；本轮只使用仓库内 vendored Codex snapshot、TermLink-owned model/adapter 和本地真实 rollout，不新增第三方 API/SDK/CLI 用法。

### 2026-08-22 — 服务重启跳过中间 rollout 恢复

- 本轮只处理最新 active rollout 冷启动时缺失中间 rollout candidates 的恢复路径；未扩展到产品数据库、history provider、IPC、Android、vendor 或通用分支模型。
- Rust `collect_lineage_replay` 在 active batch 没有 `history_base` 时保持普通 replay；存在父指针且未指定 `catalog_root` 时，以 active source 的 parent directory 建立受限 `RolloutCatalog`，显式 `catalog_root` 仍优先，候选冲突继续 fail-closed。
- Node `CodexRolloutCollector` 对未显式提供 lineage 的 `replay` 请求自动补空 lineage 对象，使服务重启/冷启动不依赖中间 rollout 的内存 checkpoint；显式 lineage（包括 `null`）保持调用方语义。
- 新增 stage4 latest-only/restarted-runtime 测试，使用真实 Codex rollout 文件名后缀验证目录 catalog 能找到 A/B；Node 增加 replay lineage 恢复测试。
- `cargo fmt --all -- --check`：通过；`cargo test --test stage4_protocol --offline`：13 项通过；`cargo test --all-targets --offline`：73 unit、31 conformance、3 stage2、5 stage3、13 stage4 通过。
- `node --check src/services/codexRolloutCollector/index.js`、`node --check tests/codexRolloutCollector.test.js`：通过；`node --test tests/codexRolloutCollector.test.js`：29 项通过；`git diff --check`：通过（仅保留既有 CRLF warning）。
- 本地 raw analyzer smoke（仅提供最新 child 路径）输出 2 条 replacement；该样本同时含未支持的 developer message，Node canonical projection 门禁拒绝持久化，属于既有 fail-closed 兼容问题，不在本轮扩大修复。
- 任务外未跟踪的 `native/parse-probe/`、`native/rustup-init.exe`、`native/winlibs.zip` 未修改。
- Context7/current external documentation gate：not applicable；本轮只调整 TermLink 自有 Rust↔Node 隔离 collector 恢复逻辑，不新增第三方 API/SDK/CLI 用法。

### 2026-08-22 — replacement validation 与 projection coverage 语义分离

- 本轮只处理当前 Rust Collector 任务的第 4 项；未扩展到服务端正式 history provider、产品数据库、WebSocket/IPC、Android 或 App ADTO。
- Rust `AnalysisProjection` 新增 `projection.coverage`：`unknown` 表示尚未证明逻辑历史覆盖，`partial` 表示存在缺口/未知事件/不完整 lineage，`complete` 表示当前 collector 负责的逻辑历史范围已完整覆盖。该字段不等同于旧 `projection.complete`，也不等同于 `AnalysisBatch.completeness` 或产品层 history coverage DTO。
- top-level `replacements` 现在明确作为已经通过 parent/child/cut 校验的 replacement evidence；只要 source batch `completeness=canonical` 就可被阶段 4 隔离层接收，即使 projection coverage 为 `partial`。`replace_last_turn` 是改变 active projection 的独立 mutation，仅在 `coverage=complete` 时生成/接受。
- 对 partial coverage 的 evidence-only child，Node 阶段 4 importer 只保存 items、projection 和 evidence，并标记 `pending_replacement=true`、`active_head=false`；收到 complete coverage 的同一 child mutation 后才标记旧 parent inactive、child active，并保持重复导入/重启幂等。partial coverage + mutation 会 fail-closed。
- 明确保留 stopped/interrupted turn 的双重语义：显式 abort 可使逻辑 coverage complete，但因内容可用性仍为 partial 而保持 `projection.complete=false`；因此 replacement validation 不会错误丢失，同时不会把不完整内容伪装成完整内容。
- `cargo fmt --all` 与 `cargo fmt --all -- --check`：通过；`cargo test --all-targets --offline`：73 unit、31 conformance、3 stage2、5 stage3、13 stage4 全部通过；`node --check`（协议/importer/测试文件）：通过；`node --test tests/codexRolloutCollector.test.js`：30 项通过；`git diff --check`：通过（仅既有 CRLF warning）。
- 任务外未跟踪的 `native/parse-probe/`、`native/rustup-init.exe`、`native/winlibs.zip` 未修改；本轮仍未进行提交。
