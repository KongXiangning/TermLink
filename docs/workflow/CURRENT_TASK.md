# CURRENT_TASK.md

## 任务信息

- 任务 ID：20260820-003
- 任务标题：Codex Rollout Collector 阶段 4：分析器协议、Node 隔离运行时与 conformance 完整性
- 任务 slug：codex-rollout-collector-stage-4-runtime-and-conformance
- 任务来源：`docs/codex/codex-rollout-collector-architecture.md` 阶段 4、`TASKS/inbox/INBOX-20260818-001-codex-rollout-collector.md`，以及用户对阶段 3 conformance 缺口的明确修复要求
- 当前状态：completed-ready-for-closeout
- 生命周期状态：active
- 恢复需审查：false
- 恢复审查原因：[]
- 任务基线：`1b37d812a879046bca8f89c3b180149199056e39`

## 背景与上下文

formal native collector 已有阶段 2 source/cursor 能力和阶段 3 `CodexEventAdapter → AnalysisEvent → AnalysisReducer` 基础，但当前阶段 3 证据仍存在三项实质缺口：golden 只消费静态 Demo oracle，没有在测试中实际启动 Demo reducer 与 Spike parser；所谓 segment overlap 只是重复应用完整 batch，没有证明跨 tail/backfill 的 Adapter 状态、Plan question/answer 关联和 projection 一致性；`AnalysisReducer` 不能在 partial tail 后被完整 backfill 提升为 canonical。

本任务完成架构文档阶段 4，并把上述缺口作为硬门禁纳入同一轮实现。用户已明确授权以独立任务方式把能力扩展到“隔离的 Rust analyzer 进程 + Node 进程/协议/导入层”；该扩展保持 P0-RC.1 的边界，不接入 Codex IPC、Android、`terminalGateway`、既有服务端 DB schema 或产品 UI。

阶段 4 的运行链路固定为：

`Node request/run → Rust stdio JSONL analyzer → AnalysisBatch/ACK → Node batch importer → projection/details/usage/outcome → checkpoint`

Rust vendor Codex 仍只能使用仓库内相对路径；Demo 和 Spike 只作为被测试的只读 oracle，不改其源码或把其 DTO 作为正式接口。

## 验收标准

### 功能验收

1. Rust analyzer 提供阶段 4 最小可运行 stdio JSONL 协议：`hello`、`analyze`、`cancel`、`batch`、`ack`、`complete`、`error`，所有消息带 `protocol_version`、`message_type` 和 `request_id`；协议未知字段安全忽略，缺失/不确定的 identity、cursor、source mutation fail-closed。
2. Rust analyzer 能从 `AnalyzeRequest` 读取正式 collector source，输出带 `batch_id`、conversation/source epoch、source range、completeness、mutations、`next_cursor` 和 TermLink-owned projection 数据的 `AnalysisBatch`；取消、预算、超时/失败能产生可判定错误或 incomplete 结果，不伪造成功。
3. Node 隔离服务能按需启动/复用 Rust analyzer，跟踪 request、超时、取消、进程异常与重启；只在完成 batch 持久化后发送 ACK，checkpoint 写入顺序晚于 derived data 写入。
4. Node importer 对重复 batch、重叠 item、重复重启恢复保持幂等；完整 projection 不会被后续 incomplete batch 降级；`complete_range`/完整 backfill 会清除 provisional/partial 状态并提升为 canonical；source epoch 替换只在首个 batch 执行受控的 `replace_previous`。
5. Node 隔离 store 至少覆盖 projection、details、usage、outcome、checkpoint、run/error 记录，并提供文件存储或可注入 store 以完成可重复测试；不新增既有服务端数据库表或修改产品服务 wiring。

### Conformance 验收

1. conformance 测试实际启动仓库内 Demo 可执行程序和 Spike parser（必要时从其 manifest 构建），在测试临时目录中生成 Demo report/projection 和 Spike 输出；比较旧路径实际输出的稳定语义面与 `Adapter + AnalysisReducer` 结果。静态 `demo-oracle-stage3.json` 只能作为辅助回归 fixture，不能继续作为唯一 golden 证据。
2. 使用同一份 Plan question/answer fixture 做完整读取、tail、backfill 和重叠 segment：tail 与 backfill 的相同事件必须得到相同 `item_key`；Plan question/answer 跨 segment 仍能关联；分段 projection 与完整 replay projection 相等。
3. 公共分段 helper 必须显式复用同一个有状态 `CodexEventAdapter`，不能因每条 record 新建 adapter 丢失 pending Plan state；保留已有单 record 兼容 API 时，新增的批量/有状态入口必须成为 analyzer 与测试的实际路径。
4. 先应用 partial tail、再应用完整 backfill 后，projection 的 completeness/availability/provisional 状态正确提升；反向或 incomplete overlap 不得把 canonical projection 降级。
5. 阶段 4 Rust 单元/集成测试和 Node 定向测试通过，并复跑既有 native collector 全量测试；失败时记录确定的原因、边界和未覆盖项。

### 边界与治理验收

1. 不修改 `src/services/codexIpcClient.js`、`codexIpcFeed.js`、`codexIpcThreadStream.js`、`codexOwnerSurfaceTracker.js`、`src/ws/terminalGateway.js`、Android Codex wire/selection/ViewModel/Activity/Sessions 链路，不改变 IPC authority、follower lifecycle、owner fallback 或 A/B 隔离。
2. 不修改 Demo/Spike 源码，不引入开发者本机 Codex path、外部 Codex vendor path、未登记 workspace member 或默认 Codex 网络下载。
3. 架构文档只在实现和测试证据形成后回写阶段 4 状态与证据；若形成新的稳定协议/边界，追加同步 `CONTRACTS.md`、`DECISIONS.md` 和 `STATUS.md`，不把生成文档当 source of truth。

## 允许修改范围

- `native/codex-rollout-collector/src/**`、其 `Cargo.toml`/`Cargo.lock`（仅为阶段 4 正式 analyzer/protocol/runtime 所需）。
- `native/codex-rollout-collector/tests/**` 及其测试 fixtures（只增加/修正 formal collector、实际 Demo/Spike conformance 和阶段 4 协议证据）。
- `src/services/codexRolloutCollector/**`（隔离的 Node process manager、protocol、request tracker、batch importer、checkpoint/run store 和入口）。
- `tests/codexRolloutCollector*.test.js`、`tests/fixtures/codex-rollout-collector/**`。
- `docs/codex/codex-rollout-collector-architecture.md`（实现后更新阶段 4 证据/状态）。
- `docs/workflow/CURRENT_TASK.md` 及在锁定范围后按治理技能要求更新的 workflow live docs。

## 禁止修改范围

- `src/services/codexIpcClient.js`、`src/services/codexIpcFeed.js`、`src/services/codexIpcThreadStream.js`、`src/services/codexOwnerSurfaceTracker.js`、`src/ws/terminalGateway.js`。
- Android Codex wire、selection、ViewModel、Activity、Sessions 入口以及任何 IPC authority/follower/reconnect/replay 代码。
- 现有产品 server/routes、数据库 schema/migrations、会话历史公共 DTO、UI、raw rollout 持久化和产品 push/wiring。
- `native/codex-rollout-demo/**`、`native/codex-rollout-compat-spike/**` 源码；测试只能以只读子进程方式启动其已存在/按 manifest 构建的可执行程序。
- `native/codex-rollout-collector/vendor/codex/**`、外部 Codex path/Git/workspace、未登记 workspace member；不得为了测试引入默认网络下载。
- 与本任务无关的 dirty/untracked 文件、提交、分支整理、整树 reset/checkout/clean/delete/move。

## 条件放行范围

- `docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`、`docs/workflow/STATUS.md`：先完成 scope lock 和实现审查，再仅追加阶段 4 的协议、Node 隔离边界、checkpoint/import 语义及证据。
- `package.json`/锁文件：只有确实需要一个最小、无副作用的定向测试命令或 analyzer 路径配置时才修改；优先不改。
- 新增 Rust protocol/runtime 公共类型：必须保持既有 `AnalysisBatch`、`analyze_source`、source/cursor 与 TermLink-owned event/reducer 的 backward compatibility，新增字段/消息采用 additive 兼容。

## 范围锁定

- Safety mode：guarded；原因是本任务涉及跨进程运行时、取消/重启、checkpoint 持久化、幂等导入和公共协议兼容，但不涉及生产部署或既有产品 DB。
- Dangerous surfaces：Rust 子进程生命周期、stdio framing、超时/取消、原子文件写入、source epoch/cursor 恢复、partial→canonical 状态提升、协议/API 兼容。
- 明确不涉及的 dangerous surfaces：production、既有 database schema/migration、permissions/authentication/payments、deployment/CI/CD/monitoring、bulk delete、force push、history rewrite。
- Scope lock 状态：`locked`；未明确列入 Allowed/Conditional 的路径默认禁止修改。
- Unlock / widening conditions：本轮不允许静默扩大范围。若确需增加路径，必须先写明原因、影响文件、风险和验证方式，重新生成 Allowed/Forbidden/Conditional 清单并重新执行 `/lock-scope`；触及 IPC、Android、产品 server/DB 或 vendor 时必须停止并取得用户明确确认。
- Change propagation：本任务触碰 Rust protocol、AnalysisBatch/reducer lifecycle、Node importer/checkpoint 公共边界，完成实现审查后必须复核 `CONTRACTS.md`/`DECISIONS.md`/`STATUS.md` 是否需要 additive 同步。

## 受影响的契约

- SourceBackend、SourceSpec、三类 cursor、SegmentAssembly 的 fail-closed 与能力边界保持不变。
- `CodexEventAdapter` 是唯一建立 conversation/turn/tool/Plan/usage 关联的入口；`AnalysisReducer` 只消费 TermLink-owned `AnalysisEvent`。
- physical `event_id` 与跨 segment/replay/restart 稳定的 logical `item_key` 必须分离；overlap 必须幂等。
- `AnalysisBatch` 的 `complete=false`、diagnostic、availability 与 source mutation 语义必须保真；完整 backfill 只能通过明确 complete range/完整来源证据提升 canonical。
- 新增 Rust↔Node stdio protocol、ACK ordering、checkpoint 恢复与 importer upsert 语义将成为阶段 4 新契约，完成后再同步到 `docs/workflow/CONTRACTS.md`。
- Codex IPC/Android authority 契约不受影响，仍以现有 `CONTRACTS.md` 的冻结区为准。

## 已确认决策

- 延续 AD-005：Codex vendor 只允许仓库内相对 path closure；普通 Rust registry/Git 依赖不被一概禁止。
- 延续 AD-006：正式 collector 先保持 native 隔离；本任务由用户明确授权阶段 4 的独立 Node process/import 层，但不进入 IPC、Android、DB 或完整产品 runtime。
- 延续 AD-007：Demo/Spike 是只读 correctness oracle；本任务补足实际进程双路径证据，但不把它们变成正式实现依赖或产品 DTO 来源。
- 接受“批次数据先落地、checkpoint 后落地、ACK 表示 Node 已接收并完成协议校验”的阶段 4 语义。
- 选择可注入 store + 默认原子文件 store 的 Node 方案，以便在没有产品 DB 接入的情况下验证持久化、重启、幂等和恢复。

## 待确认问题

- 无阻塞性待确认问题。具体消息字段、错误码和文件 store 布局按架构文档及现有 source/model 类型做最小 additive 实现；若实现中需要改变 frozen IPC/Android 或产品 DB 边界，必须暂停并重新取得用户明确确认。

## 实现方案

### Goal

把架构阶段 4 落成可运行、可取消、可恢复的 Rust analyzer + Node 隔离编排/导入链路，同时把阶段 3 的三项 Major 缺口变成真实可重复的 conformance 证据。

### Architecture impact

新增 `native/codex-rollout-collector` 的 protocol/runtime/CLI，以及 `src/services/codexRolloutCollector` 隔离服务；不改变既有产品入口。Rust 继续负责 source 读取、Adapter、Reducer 和 TermLink-owned batch；Node 负责进程生命周期、批次导入、持久化顺序和 checkpoint/run 记录。

### Technical approach

1. 为协议消息定义 serde 类型、JSONL framing、request validation、ACK/complete/error 状态机，并让 Rust `main` 以单请求可取消的 bounded worker 输出 batch。
2. 为 checkpoint 记录 source epoch、fingerprint/anchor、cursor、segment、reducer/projection watermark 和 completeness；恢复只重发 checkpoint 之后的有界请求，来源不一致 fail-closed。
3. 给 reducer 增加显式 provisional/canonical 生命周期和可验证的 complete-range promotion；incomplete batch 只能保持或降低当前证据，不能覆盖 canonical 数据。
4. 给 Adapter 增加有状态批量入口，复用同一实例穿过 segment；使用计划 fixture 验证 Q/A 关联、稳定 key、overlap 去重与完整 replay 等价。
5. 通过 subprocess 启动真实 Demo/Spike，解析测试期间新生成的输出，比较双方稳定语义面；静态 golden 保留为辅助回归。
6. Node 新服务使用注入的 spawn/store/clock 依赖实现可测的 timeout/cancel/restart；默认原子文件 store 在导入 derived data 后写 checkpoint，ACK 只在成功后发送。

### Alternatives considered

- 继续只比较静态 golden：不能满足原阶段 3 的双路径要求，拒绝。
- 让每个 `adapt_record` 自建 Adapter：会丢失跨 record Plan state，拒绝；保留兼容单 record helper，但正式批量路径必须显式传入 stateful adapter。
- 先把 collector 接进 terminalGateway/Android/DB：超出本任务和 AD-006 隔离边界，延期。
- 通过“重复应用完整 batch”模拟 segment overlap：不能证明 cursor/分段生命周期，拒绝。

### Data/state flow

`AnalyzeRequest(source/cursor/limits/checkpoint anchor) → Rust SourceBackend/Adapter/Reducer → AnalysisBatch(items/projection/mutations/next_cursor/completeness) → Node validation/import/upsert → projection/details/usage/outcome → checkpoint → ACK → next request/restart replay`。

### Compatibility

既有 `analyze_source`、`AnalysisBatch` 旧字段、source/cursor 类型和 stage 1–3 测试继续可用；阶段 4 字段以新增/可选方式引入。未知 protocol 字段忽略，未知 event 保持 UnknownEvent/诊断；旧单 record helper 不被静默改成跨调用共享全局状态。

### Risks and rollback

主要风险是协议状态机与 source mutation 的边界错误、canonical 被 incomplete 覆盖、跨进程重复导入产生重复 item，以及真实 Demo/Spike 在干净环境不可执行。回滚以 path-scoped revert 本任务新增文件/新增行和恢复阶段 4 文档证据为准，不触碰任务外 dirty/untracked 文件；若真实 oracle 依赖无法构建，则保留明确失败证据，不以静态 fixture 冒充通过。

### Validation strategy

运行 `cargo fmt --check`、`cargo test --manifest-path native/codex-rollout-collector/Cargo.toml`、阶段 4 定向 Rust protocol/conformance 测试、Node `node --test` 定向测试，并复跑 native collector 全量测试。必要时用 `cargo build --manifest-path` 构建 Demo/Spike 后由测试临时目录启动；检查 git diff 确认 IPC/Android/DB 禁区未变更。

### Open decisions

协议错误码、Node 文件 store 的具体 JSON 布局和测试 fake analyzer 的最小脚本可在实现阶段按现有架构字段机械确定；不得因此扩大产品集成范围。

## 审查问题队列

- R-001：已解决（本次 conformance 实际启动仓库内 Demo/Spike，临时目录生成 report/projection/output；binary 缺失时按 manifest/offline build fallback）。当前运行复用了已存在 debug binary，clean checkout 的构建 fallback 仍是环境依赖风险。
- R-002：已解决（cursor 当前 source boundary 校验、append 从 cursor snapshot end 读取 growth、promotion/replace/truncate/pending/gap 测试通过）。
- R-003：已解决（Rust `AnalysisReducer` 与 Node importer 均拒绝 late incomplete overlap 降级 canonical，partial/provisional→canonical 测试通过）。
- R-004：已解决（Rust ACK 后 complete、Node derived-before-checkpoint、timeout/cancel、file-store restart/replay、batch/item 幂等测试通过）。
- R-005：已解决（Node additive unknown-field protocol test、Rust malformed protocol、legacy/current/unknown/ParseGap conformance 全部通过）。
- R-006：已解决（preview/backfill/append/replay 都基于当前 snapshot 生成 cursor；append cursor 在完整新行后推进；checkpoint 现在保存 source epoch、fingerprint、prefix anchor、projection watermark 和 reducer state；同长度替换、截断、前缀变化均有 fail-closed 测试）。
- R-007：已解决（正式 Rust analyzer 已从 AnalysisEvent 派生 `tool_details`、`usage`、`task_outcomes`、`mutations`；Node 测试直接启动正式 Rust binary 并断言四类数据已保存，且 checkpoint 带恢复 state）。
- R-008：已解决（`replace_previous` 改为 AnalyzeRequest 显式字段，普通 replay 默认 false；Memory/File analysis store 和 Memory/File checkpoint store 按 conversation 清理旧 source epoch；同 epoch 的新 replacement fail-closed，但同一 `batch_id` 的重放保持幂等 duplicate，并有 Node 测试）。
- R-009：已解决（Rust 不再启动主动发送 startup hello；Node 先发 `hello(role=node)`，Rust 回同 request_id 的 `hello(role=analyzer)`，未握手不接受 analyze；Rust/Node/fake/formal 路径均有回归）。
- R-010：已解决（MemoryAnalysisStore 先按 `batch_id` 去重，再拒绝同 epoch 的新 `replace_previous`；第一次 replacement 后第二个不同 batch 不再被接受，异常重放仍可幂等完成）。
- R-011：已解决（Node 在 importer 前强制校验 canonical batch 的 parser provenance、completeness、mutations、`next_cursor`、usage、source anchors、reducer state、digest anchor 形状和 complete range；缺字段或仅凭 `complete=true` 的 malformed batch fail-closed）。
- R-012：已解决（`resource_limits.timeout_ms` 贯穿 Rust source read、Adapter/Reducer、metadata/cursor 构造和 ACK 等待预算，超时返回 `resource_timeout`；不再只依赖外部 Node timeout）。
- R-013：已解决（replay 不携带 cursor 时仍依据 persisted checkpoint 的 source epoch/fingerprint/prefix anchor 校验当前 source；同长度替换也 fail-closed）。
- R-014：已解决（analyzer 在 batch 前或 batch 后退出时，Node 按一次有限重试预算重启并重发同一请求；batch/importer idempotence 防止已落地 batch 重复写入，并有 file-store 回归）。

### 剩余风险与明确延期

- 阶段 4 只交付隔离 Rust↔Node analyzer artifact；既有服务端 routes/DB schema、Codex IPC、Android、产品 DTO/wiring 和 release/deploy 仍明确延期到独立任务/阶段 5。
- 当前 Windows 环境的 native cargo 回归需要显式 MinGW PATH/RUSTFLAGS 规避既有 `nanosleep64` linker 问题；本轮记录了 workaround，但未宣称跨机器 toolchain 或 clean-host 安装证据。
- 任务外 dirty/untracked 文件仍由原 owner 管理；本任务未执行 reset、checkout、clean、移动、删除、staging 或 commit。

## 传播治理记录

- 阶段 4 运行协议和 Node 隔离边界在实现稳定后追加至 `docs/workflow/CONTRACTS.md`。
- 若确认新的架构/兼容性选择，追加至 `docs/workflow/DECISIONS.md`；同步整体状态至 `docs/workflow/STATUS.md`。
- 因本任务修改项目级协作规则或 host guidance 时才执行 `/sync-host-guidance`；当前不预期修改。

## 实施步骤

1. [x] review-current-task：检查目标、scope、硬门禁和回滚点是否可执行。
2. [x] lock-scope：锁定本轮允许/禁止/条件放行路径；阶段 4 边界变更只按本任务执行。
3. [x] native protocol/runtime：实现 Rust stdio protocol、CLI、取消/预算/错误与 checkpoint 数据结构。
4. [x] reducer/adapter lifecycle：实现 stateful segment helper、partial→canonical promotion 和 Rust 单测。
5. [x] actual conformance：启动真实 Demo/Spike，补双路径、跨 segment、overlap、完整 replay 测试。
6. [x] Node isolated runtime：实现 manager/tracker/importer/checkpoint/run store 和可重复的 Node 测试。
7. [x] review-implementation/review-diff/verify-contracts：修复 R-006～R-014 阶段 4 Major 验收缺口，并完成 path-scoped 契约复核。
8. [x] run-regression：完成 Rust/Node 定向、正式 binary 集成和 native collector 全量回归。
9. [x] sync architecture/workflow：按 R-006～R-014 的实际证据更新架构、`CONTRACTS.md`、`DECISIONS.md`、`STATUS.md`；不自动归档未获用户要求的任务。

## 回归检查项

- [x] Rust 既有 stage 1–3 测试全部通过。
- [x] Rust protocol framing、hello/analyze/batch/ack/complete/error、cancel、预算和 malformed input 测试通过。
- [x] 实际 Demo/Spike 生成输出并参与双路径比较；静态 golden 仅为辅助来源。
- [x] Plan Q/A 跨 tail/backfill 关联、稳定 item_key、overlap 幂等和 segmented/full replay 等价通过。
- [x] partial tail → complete backfill 后 canonical/provisional 状态正确，反向 incomplete 不降级。
- [x] Node 进程启动、ACK 顺序、超时、取消、异常重启/重放、导入幂等和 checkpoint 恢复通过。
- [x] git diff 未触及 IPC、Android、产品 server/DB 和 Demo/Spike 源码禁区。
- [x] cursor/checkpoint 恢复链路覆盖 preview/backfill/append 推进、fingerprint/prefix anchor、截断/替换拒绝和跨请求 reducer state 恢复。
- [x] 正式 Rust analyzer → Node importer 集成测试保存 tool details、usage、task outcomes 和 mutations。
- [x] source epoch replacement 清理同 conversation 的旧 epoch scope，并由测试证明旧数据不可见。
- [x] Node → Rust hello 握手方向与架构文档一致，且 fake/formal analyzer 测试均覆盖。
- [x] malformed canonical batch、协议级 `resource_limits.timeout_ms`、无 cursor replay 的 persisted checkpoint 校验，以及 analyzer batch 前后异常退出重启重放均有回归证据。

## 发布后验证

- 本任务不发布、不部署、不修改生产服务；发布后验证：N/A。
- 如后续任务接入产品服务，必须另建任务并补充真实服务/数据库/IPC/Android 回归门禁。

## 回滚点

- Task start base：`1b37d812a879046bca8f89c3b180149199056e39`
- Last reviewed checkpoint：`not-yet-created`（review-current-task/lock-scope 后首次实现检查点尚未创建）
- Current diff review target：`working-tree`（仅审查本任务 Allowed/Conditional 路径；排除任务开始前已有 dirty/untracked 文件）
- base_drift：false（以任务创建时 HEAD 为基线）
- checkpoint_drift：false（尚无 checkpoint）
- diff_review_target_changed：false
- environment_recovery_pending：false

## 执行记录

| 时间 | 阶段 | 操作 | 结果/证据 |
|---|---|---|---|
| 2026-08-20 | create-current-task | 建立阶段 4 任务包，吸收用户列出的三项 Major | 待 review-current-task |
| 2026-08-20 | review-current-task | 审查验收、范围、契约、回滚与传播门禁 | 通过；无阻塞性待确认问题 |
| 2026-08-20 | lock-scope | 锁定 guarded scope，明确 dangerous surfaces 与 widening 条件 | 通过；进入 native protocol/runtime 实现 |
| 2026-08-20 | implement-current-step | 完成 Rust protocol/runtime、stateful Adapter、reducer promotion、actual Demo/Spike conformance 和阶段 4 Rust protocol tests | Rust 66 unit、28 conformance、3 stage2 integration、5 stage3 conformance、3 stage4 protocol 通过；真实 oracle 临时输出已生成并参与断言 |
| 2026-08-20 | implement-current-step | 完成 Node isolated process manager/tracker/importer、默认原子 file store、checkpoint/run store 和 fake analyzer | Node `node --test tests/codexRolloutCollector.test.js` 7/7 通过，覆盖 ACK、timeout/cancel、overlap、canonical non-downgrade 和 file-store restart |
| 2026-08-20 | review-implementation | path-scoped 实现审查；发现并修复 canonical 后 late incomplete overlap 会下调 Node projection 的问题 | 修复 `analysisBatchImporter` 的 stale overlap 门禁并补回归；无剩余 major/critical finding；第三方 External Documentation Gate 不触发（仅项目内协议/逻辑） |
| 2026-08-20 | verify-contracts | 核对阶段 2/3 source/identity/fail-closed、阶段 4 ACK/checkpoint 与 IPC/Android 冻结区 | 通过；未触及 forbidden IPC/Android/product DB/Demo/Spike/vendor 路径 |
| 2026-08-20 | run-regression | 运行 Rust full `cargo test --locked`（offline + 显式 MinGW linker workaround）、stage4 定向和 Node 定向测试 | 全部通过；plain cargo 的既有 `nanosleep64` linker 环境差异已记录，不阻塞本任务结果 |
| 2026-08-20 | sync architecture/workflow | 更新架构阶段 4、`CONTRACTS.md`、`DECISIONS.md` AD-008、`STATUS.md` | 隔离 runtime/conformance 稳定边界已记录；产品 server/DB、IPC、Android、release 仍延期；任务进入 completed-ready-for-closeout |
| 2026-08-20 | user-review | 用户指出 R-006～R-009 四项阶段 4 Major 缺口，否定当前 closeout 状态 | 任务恢复为 in-progress；按当前隔离 scope 补齐恢复链路、正式 analyzer 派生输出、source epoch replacement 与 Node → Rust hello |
| 2026-08-20 | implement-current-step | 修复 R-006～R-009：runtime stateful Adapter/Reducer、推进式 cursor、source metadata/reducer checkpoint、正式派生字段/mutations、conversation-scoped epoch replacement、Node→Rust hello | 代码与测试完成；普通 replay 不再自动 replace，checkpoint failure 不再伪造成功 complete |
| 2026-08-20 | run-regression | 运行 native collector full suite、stage4 recovery tests、Node collector suite | Rust 66 unit、28 conformance、3 stage2 integration、5 stage3 conformance、5 stage4 protocol、Node 9/9 全部通过；显式 MinGW linker workaround 仅用于当前 Windows 环境，未宣称跨机器 toolchain/release |
| 2026-08-20 | review-implementation | 复核 ACK 失败路径并改为 runtime clone-on-write：只有成功 ACK 后才提交 Adapter/Reducer 状态，超时、拒绝或发送失败丢弃候选状态 | 重新运行 Rust full suite、stage4 protocol、Node 9/9；全部通过，避免未确认 batch 污染后续跨请求恢复 |
| 2026-08-20 | review-implementation | 补强恢复请求的 source epoch 解析：未显式重复提供 epoch 时从 cursor 或 persisted checkpoint 回填，避免跨请求状态被误重置 | 重新 build formal binary；Rust full suite、stage4 protocol、Node 9/9、fmt/check/diff-check 全部通过 |
| 2026-08-20 | sync architecture/workflow | 同步架构 checkpoint/hello/replacement/derived-field 语义，追加 `AD-009`，更新 contracts/status | 四项 Major 有代码和测试证据；产品 server/DB、IPC、Android、release/deploy/canary/benchmark 仍延期 |
| 2026-08-20 | user-review | 用户指出同 epoch replacement 可重复接受、Node malformed canonical fail-open、协议级 timeout 未生效、无 cursor replay 绕过 checkpoint source 校验，以及 analyzer 异常退出无自动恢复 | 5 项复审问题均确认存在；任务在原隔离 scope 内补开修复，不扩大到 IPC、Android、产品 server/DB、Demo/Spike/vendor |
| 2026-08-20 | implement-current-step | 修复 R-010～R-014：replacement batch-id 去重门禁、canonical schema/provenance/mutation fail-closed、Rust timeout budget、无 cursor persisted source 校验、异常重启有限重放 | 新增 Node 13/13 与 Rust stage4 7/7 覆盖；正式 Rust binary、file store 和协议恢复路径全部参与验证 |
| 2026-08-20 | run-regression | 重新构建正式 Rust binary 并运行 Node/Rust 回归、fmt/check/diff-check | Rust 66 unit、28 conformance、3 stage2 integration、5 stage3 conformance、7 stage4 protocol、Node 13/13 全部通过 |
| 2026-08-20 | sync architecture/workflow | 同步阶段 4 架构、`CONTRACTS.md`、`DECISIONS.md` AD-010、`STATUS.md` 与本任务 R-010～R-014 | 5 项复审问题关闭；任务保持 active，仅待 path-scoped 交付摘要/closeout，不自动归档或处理任务外 dirty/untracked |
