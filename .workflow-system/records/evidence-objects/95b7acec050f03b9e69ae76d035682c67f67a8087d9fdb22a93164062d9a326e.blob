# TASK-20260819-001-codex-rollout-collector-formal-bootstrap

## 任务元数据

- 项目：termlink
- 任务 ID：20260819-001
- 任务标题：Codex Rollout Collector 正式模块初始化与兼容层落地
- 任务 slug：codex-rollout-collector-formal-bootstrap
- 最终状态：completed_verified_archived
- 任务创建日期：2026-08-19
- 归档日期：2026-08-19
- 归档性质：P0-RC.1 正式 Rust collector 隔离基础层完成并通过验证；不宣称完成 P0-C、P0-B.4R 或完整 Rust History Analyzer
- Task start base：d149b2a6db9f5842218a9cd6d313c2b79aafb6c1
- Review checkpoint：无任务提交；以工作树审查记录和临时 clean checkout 证据为准
- 发布状态：本任务不是生产发布任务，未执行部署、canary 或生产迁移

## 原始任务包快照

### 目标

建立独立、可审查、可构建的正式 `native/codex-rollout-collector/` Rust package，完成最小数据流：

`SourceBackend → codex_wire → codex_adapter → AnalysisEvent → AnalysisBatch`。

正式模块必须使用仓库内固定版本的 Codex history/protocol vendor 闭包，通过 facade/re-export 隔离上游类型，将上游类型转换为 TermLink 自有模型，并在 `AnalysisBatch` 中携带 `ParserProvenance`。

### 本轮范围

- 正式 Cargo package、Cargo.lock、README、源码模块、fixture 和 conformance 测试。
- Spike 已验证的 Codex vendor 闭包 promotion、vendor manifest、许可证和 NOTICE。
- 有界 JSONL/必要 zstd source reader、source ordinal/offset provenance、wire decode/profile/unknown 诊断。
- Codex adapter、TermLink 自有 `AnalysisEvent`、`AnalysisBatch` 和 `ParserProvenance`。
- legacy/current alias 映射、UnknownEvent/ParseGap fail-closed、determinism、golden 和双 oracle 对照。
- 技术细节文档及本任务 workflow/host guidance 的收口记录。

### 明确不在范围内

- P0-C terminal durable reconciliation。
- P0-B.4R Android/IPC 修复。
- Node、数据库、持久化、产品 analyzer/runtime、完整 rollout reader 或 transport。
- 修改既有 Demo/Spike、Codex IPC 实时同步冻结区、Android、Node 或数据库业务链路。
- 开发者本机 Codex checkout、外部 Codex Git/path/workspace 或默认 Codex 网络下载。

### 关键验收约束

- 正式目录固定为 `native/codex-rollout-collector/`，Codex history/protocol 依赖来自仓库内相对路径 vendor。
- 普通 Rust registry/Git 依赖保持 Cargo 的正常允许范围；门禁只阻断开发者本机路径以及外部 Codex path/Git/workspace/隐式网络闭包。
- `codex_wire` 不重定义第二套 typed-lite wire 模型；`codex_adapter` 是唯一 Codex 语义适配入口。
- 未知 variant、字段缺失、不可恢复记录只能产生 `UnknownEvent`、`ParseGap` 或诊断，不能伪造成功或完整历史。
- 每个 `AnalysisBatch` 都序列化 `parser_backend`、`wire_source_revision` 和 `compatibility_profile`。
- fixture 必须随正式 crate 提供，并覆盖 legacy/current alias 输入及 Unknown/ParseGap 对照。

## 实际改动摘要

### 正式 Rust package

- 新增 `native/codex-rollout-collector/Cargo.toml`、`Cargo.lock`、`README.md` 和 crate-local `.gitignore`。
- 新增 source、wire、adapter、model、protocol、version 和 error 模块，实现最小 vertical slice。
- 新增 bounded JSONL/zstd source reader、`SourceRecord`、`SourceRef`、ordinal/offset 记录和 payload-limit fail-closed 行为。
- 新增 vendored Codex 闭包、`vendor-manifest.toml`、`LICENSE` 和 `NOTICE`；正式目录作为构建 source of truth，Spike 仅作为 staging/provenance。
- 新增 legacy/current、future-compatible、malformed、partial、tool/file/search、plan、usage、golden 和错误边界 fixture 及 conformance/unit 测试。
- 新增本机绝对路径/嵌套 tool payload 脱敏、bounded UTF-8 诊断、batch-level deterministic sequence 和 batch golden comparison。

### 兼容与 fail-closed 覆盖

- legacy/current alias fixture 与测试名明确映射：
  - `legacy_alias_fields_map_to_analysis_events`
  - `current_alias_fields_map_to_analysis_events`
  - `unknown_alias_is_diagnostic`
- 未知 alias、未知 plan carrier、缺失 required payload、error-bearing turn、partial/abort/compaction 均有 UnknownEvent/ParseGap 或不完整 batch 对照。
- `task_started`/`turn_started`、`task_complete`/`turn_complete` 和 `ModeKind` alias 的兼容映射有 identity 断言；不支持 alias 不被猜测为已知事件。

### 文档与治理

- 新增 `docs/workflow/TECHNICAL_DETAILS-codex-rollout-collector.md`，记录模块映射、双 oracle、vendor promotion、fixture→测试映射、Cargo/clean checkout 门禁和停止条件。
- 已同步 `docs/workflow/STATUS.md`、`docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`、`docs/workflow/LESSONS.md`、`AGENTS.md` 及被 gitignore 的 `CLAUDE.md`。
- `CONTRACTS.md` 新增 P0-RC.1 内部 batch 接口和隔离边界；既有 Codex IPC 实时同步核心契约未改变。
- `DECISIONS.md` 固化普通 Rust registry/Git 可用、Codex history/protocol vendor 闭包受限，以及 P0-RC.1 仅为隔离基础层的边界。
- `target/**` 已在正式 crate 边界由 `.gitignore` 忽略，避免构建产物进入交付。

### 明确保留的既有变更

以下任务开始前已存在的 dirty/untracked 内容不属于本任务，归档时未修改、未移动、未回滚：

- `TASKS/inbox/INBOX-20260818-001-codex-rollout-collector.md`
- `TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md`
- `native/parse-probe/**`
- `native/rustup-init.exe`
- `native/winlibs.zip`

## 契约与决策记录

- `docs/workflow/CONTRACTS.md`：新增正式 collector 内部 `SourceBackend → codex_wire → CodexEventAdapter → AnalysisEvent → AnalysisBatch` 边界、ParserProvenance 传播和 Codex vendor 隔离规则。
- `AD-005`：普通 Rust registry/Git 依赖允许；仅开发者本机路径、外部 Codex path/Git/workspace、默认 Codex 网络下载和未登记 Codex workspace 闭包受阻断。
- `AD-006`：P0-RC.1 作为隔离正式基础层稳定；完整 analyzer、P0-C、P0-B.4R、Node/Android/IPC/DB 扩展必须另行授权。
- Codex IPC、owner/follower、desired subscription、reconnect replay、Android authority 等冻结契约未被本任务修改或绕过。

## 验证与交付证据

### 代码与语义验证

- `cargo fmt --manifest-path native/codex-rollout-collector/Cargo.toml -- --check`：通过。
- `cargo metadata --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline --format-version 1`：通过；539 packages、0 Git sources、0 runfiles。
- `cargo check --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline`：通过。
- `cargo build --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline`：通过。
- `cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline`：9 项 unit、27 项 conformance、0 doc tests、0 失败。
- `cargo tree --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline`：通过；Codex package 均指向正式仓库内 vendor 闭包。
- Demo 26 项测试、Spike 5 项测试：通过。
- 同一 3743-byte fixture（SHA-256：`F8F9AE9C4528BC7C81E02FE99264BA07F148C597974BDE8E164B52B49A8BA55F`）完成 Demo full-oracle/determinism、Spike wire parser 和 formal targeted conformance 对照；future variant 的诊断/partial 差异已解释并符合 fail-closed 预期。
- alias、UnknownEvent、ParseGap、source-boundary、target-ignore、determinism、golden、payload limit 和绝对路径脱敏检查：通过。
- `git diff --check`：exit code 0；仅保留既有工作树的 LF/CRLF warning 事实。

### 审查链

- `review-diff`：通过，未发现 scope drift、Forbidden/Conditional 文件越界或决策漂移。
- `review-implementation`：通过，正式 package、兼容映射、异常路径、边界和测试证据满足本轮目标。
- `verify-contracts`：通过，未破坏既有 API、依赖方向或 Codex IPC 冻结契约。
- `run-regression`：通过，采用 diff-aware QA；clean checkout、Cargo、双 oracle、fixture、source-boundary 和 diff 门禁均已执行。
- `F-001`～`F-003`、`F-005`～`F-024`：resolved。
- `F-004`：按用户明确指令忽略，不作为本任务阻塞项；不宣称该 finding 已修复。

### 已知环境观察

- Spike/Demo 默认 GNU linker 曾受本机 `aws-lc-sys`/`nanosleep64` 环境差异影响；已用一次性 MinGW `PATH/RUSTFLAGS` 完成必要验证，路径未写入仓库，也不是正式 package 的依赖策略。
- clean checkout 验证使用临时 synthetic commit/clone，因为当前工作树无任务提交；正式 clean checkout 工作树为空且门禁通过，不代表创建了仓库提交。
- 本任务未运行 Node、Android、browser、auth 或 deploy 回归，因为本轮没有触及这些运行时边界。

## 发布后验证证据

- Release mode：非生产发布；本次是 P0-RC.1 隔离基础层交付。
- Deploy source：无；未部署、未推送、未执行生产安装。
- Target environment：本地 Windows formal crate，以及临时 clean checkout 验证环境。
- Health checks：不适用；无服务进程、API、数据库或 Android 包变更。
- Canary window：无；未建立 canary。
- Performance baseline：未运行；本任务没有性能目标或 benchmark 交付承诺。
- Rollback/recovery：如需回退，只撤回本任务新增的正式 crate、技术细节文档和本任务治理记录；保留前置 pause/inbox/toolchain/parse-probe 既有变更。未使用 `git reset --hard`、`git checkout --` 或整树清理。
- Release evidence：无生产 release evidence；本归档只证明隔离 package 的构建、测试、双 oracle 和边界门禁。
- Canary result：not applicable。
- Performance baseline result：not run / not applicable。
- Rollback status：未执行回滚；当前没有生产或持久化副作用。
- Remaining observation：后续若扩展到完整 analyzer、P0-C、P0-B.4R 或产品集成，必须创建新的任务并重新锁定范围、契约和回归门禁。

## Lessons 回写

本任务相关经验已沉淀到 `docs/workflow/LESSONS.md`，重点包括：

- alias 兼容必须有独立 legacy/current fixture、明确测试名和未知 alias 对照。
- vendor 闭包审查应区分“受保护的 Codex source boundary”和“普通 Rust Git URL 是否允许”。
- 空测试集不能作为正式 package 验收证据。
- linker/工具链问题要记录为宿主环境观察，并使用不写入仓库的一次性 workaround。
- crate-local `target/**` 必须在正式包边界忽略。
- Demo、Spike、formal collector 应使用同一原始 fixture/hash 做可解释的对照。
- 模块稳定、门禁通过不等于完整产品阶段或后续任务完成。

## 后续关联

- 当前任务已完成并归档；`docs/workflow/CURRENT_TASK.md` 已清理为无活动任务入口。
- 下一轮入口：先执行 `/create-current-task`，为新的明确需求建立任务包；不自动恢复或扩展 P0-C/P0-B.4R。
- 可能的后续方向（仅候选，不构成授权）：在单独任务中推进完整 analyzer、P0-C durable reconciliation 或 P0-B.4R/产品边界集成。
- 前置任务 `TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md` 保持原状态，不因本归档自动恢复、修改或关闭。
