<!-- vNext bootstrap managed guidance; preserve target-owned additions outside this block. -->
# termlink workflow guidance

This project uses the pure vNext workflow surface.

- Use `bootstrap-project` only for project setup or explicit realignment.
- Use `prepare-task` before executing a new task.
- Use `execute-step` only for the admitted current step.
- Use `review-change`, `debug-task`, `task-lifecycle`, `capture-work-item`, and `close-task` according to their contracts.
- The project-local Runtime and canonical `docs/workflow/CURRENT_TASK.md` are authoritative for task state.
- Do not edit governance state directly or treat discovery context as write authority.

## Public entry terminal boundary

`public-entry-terminal/v1` applies to every public Skill invocation.
- Complete only this entry intent, its internal capabilities, and its bound Runtime operations.
- After a terminal result, return to the caller and stop.
- Report at most one `next_route` / `recommended_route`; it is recommendation-only for a later caller invocation, and the current invocation must not invoke another public Skill.
- This is instruction-level host guidance; the current Runtime cannot observe conversation-level public Skill chaining.

Project slug: termlink


## Project-specific authority

<!-- project-content-migration:2026-09-13 -->
The Codex IPC and Rollout boundaries below remain project requirements. Read the relevant sections and record IDs in current docs/workflow/CONTRACTS.md and DECISIONS.md before affected work; the byte-preserved originals under .workflow-system/legacy/one-time-codex-20260913/docs/workflow/ provide historical provenance. Old workflow commands are not vNext entrypoints. Paused and inbox work remains unresolved; the archived Node 4.5 task does not establish product integration or release readiness.

## Codex IPC 实时同步冻结区

- 任何可能触及 Codex IPC、实时会话同步、conversation 绑定/恢复、owner surface、Android Codex 状态仲裁或下列核心文件的任务，在分析、规划或修改前必须先读：
  - `docs/workflow/CONTRACTS.md` 的“🔒 Codex 原生会话实时同步核心”
  - `docs/workflow/DECISIONS.md` 的 `AD-004`
- App 端固定数据流为：`active conversation → gateway follower acquire → CodexIpcFeed desired subscription/reconnect replay → Codex host 定向 snapshot/patch → Android IPC authority`。healthy IPC surface 是正文、operation、当前 turn 与运行态的唯一实时来源。
- canonical `thread/read` 只允许作为明确 offline、desynced 或当前订阅周期缺少目标 surface 时的有界恢复通道；禁止把定时轮询、snapshot 静默超时、cwd/task 猜测、`codex_state=idle` 或其他第二数据源改造成实时权威。
- 默认不得重构、替换、删除或绕过 follower acquire/release、desired subscription、reconnect replay、normalized surface、canonical id/binding、owner fallback、Android IPC authority 与 A/B 隔离。宿主协议演进时只允许保持上述数据流和权威语义的最小兼容适配。
- 若需求确实需要改变上述架构，必须停止实现并取得用户明确确认；新任务通过 `prepare-task` 准备并确认范围，已确认任务先进行授权重规划，再经 vNext Runtime 的契约与决策写入边界更新 `DECISIONS.md`、`CONTRACTS.md`，并把 follower lifecycle、authority arbitration、A/B 隔离、长任务和重连真机回归列为强制门禁；不得在普通 bugfix、UI 修改或“简化代码”中顺手改变。
- 重点受保护文件包括：`src/services/codexIpcClient.js`、`src/services/codexIpcFeed.js`、`src/services/codexIpcThreadStream.js`、`src/services/codexOwnerSurfaceTracker.js`、`src/ws/terminalGateway.js`，以及 Android Codex 的 wire、selection、ViewModel、Activity 和 Sessions 入口链路。

## Codex Rollout Collector 边界

- `native/codex-rollout-collector` 是 P0-RC.1 的隔离 Rust 基础层，稳定声明覆盖 `SourceBackend → codex_wire → CodexEventAdapter → AnalysisEvent → AnalysisBatch`、`ParserProvenance`、formal crate 内的阶段 3 conformance artifacts，以及已验证的 `session_lineage_v1` 会话级 discovery/lineage/read protocol artifacts；不代表完整产品 analyzer、P0-C、P0-B.4R 或产品集成已完成。
- **Codex app-server 与 rollout 现实（项目级硬约束）**：`rollout*.jsonl` 由外部 Codex app-server 创建和管理，TermLink 只能读取和分析，不能控制其写入、重命名、分支或 turn 重发。正常 resend 生成新的 child rollout（例如 `rollout-a-b.jsonl`），parent `rollout-a.jsonl` 不再回写；只有已验证的 `history_base` 和 conversation 绑定才能建立 parent→child lineage。Branch in new chat 生成新的 rollout/conversation（例如 `rollout-c.jsonl`），即使复制旧历史，也不得凭文件名、内容、mtime 或顺序推断 parent 关系。source binding 正常应完整；中断或未形成稳定边界时保持 partial/provisional/pending，不凭空设计 product source replacement。
- **采集协调单例边界**：针对一个 conversation 的 rollout 日志读取分析只允许一条 Node→Rust 采集链和一个 in-flight analyzer request。Rust 只负责读取、解析和分析；其他 Node worker、历史查询或 App-facing 路径不得直接请求 Rust，只能查询 Node 已持久化的历史投影或 IPC 通道的实时缓存。正式协议保留的 `source_epoch` 只能作为隔离 Rust source identity/checkpoint 的内部兼容和 fail-closed 标记，不得升级成产品 `productSource`、`publishedSourceEpoch`、产品历史命名空间或常规 resend/Branch 状态；在该单例边界下不得为假想多 worker 竞争引入产品级 `commitFence` 或多写者提交线。
- **Rust analyzer 恢复语义**：4.5 公共 `analyze` mode 只有 `preview`、`backfill`、`append`，不定义额外的全量分析 mode 或独立恢复 capability。ACK 丢失、Node/Rust 重启或 checkpoint 不可用时，Node 保留 `job_id`、source scope、checkpoint 和待重新交付的 `segment_id/batch_id`，用新的 `request_id` 重新发起同一普通读取请求；Rust 不保存进程内恢复状态。完整 source/lineage read 是 Rust 内部读取能力，不是 Node 可请求的额外 mode；若未来需要维护性全量扫描，必须另立版本化接口。
- **设计读取门禁**：任何涉及 rollout、lineage、Rust Collector、历史同步、Stage 5 DB 或 source/checkpoint 的分析、规划、设计和修改，必须先完整读取 `docs/codex/codex-rollout-collector-architecture.md`，再按任务读取其 related docs、`docs/workflow/CONTRACTS.md` 和 `docs/workflow/DECISIONS.md`。不得只根据任务摘要、代码局部或通用分布式经验推断 Codex app-server 行为；若要改变单例采集链或外部 source 边界，必须先单独锁定范围并取得用户确认。
- Codex history/protocol 只能通过仓库内 `native/codex-rollout-collector/vendor/codex` 的相对 path closure；禁止开发者本机 Codex path、外部 Codex path/Git/workspace、未登记 workspace member 和默认构建时 Codex 网络下载。普通 Rust registry/Git 依赖仍允许，不得把所有外部 Git URL 一概视为禁项。
- Codex 原生类型只能停留在 `codex_wire` facade 与 Adapter 输入边界；下游使用 TermLink 自有模型。legacy/current alias 必须有 fixture 与 Adapter 测试证据，未知或缺失 variant/alias 必须保持 `UnknownEvent` 或 `ParseGap`/诊断。
- 阶段 2 输入层稳定边界：调用方显式提供的 target conversation id 优先于文件名或 metadata；`SourceLocator`/`SourceSpec` 的 source identity、source epoch、snapshot boundary 必须可被安全恢复消费，formal fingerprint/anchor 若存在只作为 opaque compatibility metadata，不是 4.5 业务 gate。旧 `SourceBackend` full-read、`analyze_source`、`AnalysisBatch`/`ParserProvenance` 语义保持 backward-compatible，新 source metadata、read plan、cursor、segment 和 append 能力只能 additive。
- plain JSONL 才承诺完整行 snapshot、tail preview、backward/range segment 和 append；`TailPreviewCursor`、`BackfillCursor`、`ForwardAppendCursor` 不可混用，非法 cursor、截断、替换、前缀变化或不一致来源必须 fail-closed。普通无 seek/index `.zst` 只承诺 forward stream，不得伪造 seek 或 append byte cursor。
- segment overlap 必须幂等去重，无法确认的 gap 或输入诊断保持 partial，append 只提交稳定的完整新行并在 mutation 时不发布新 cursor；这些规则只约束 formal native crate，不构成 Node/Android/IPC/数据库公共接口。
- 会话级 lineage 输入固定为 Rust 启动契约提供的 `sessions_root` 加 Node `conversation_id`；Node 不发送有界日期范围、active hint、discovery、path 或 catalog，Rust 在内部完成 source locating。文件名只作候选索引/rollout ID/顺序提示，`SessionMeta.id` 与 `history_base.thread_id`、ordinal/byte cut 才是会话绑定和父子关系证据。跨日期 child 定位、root→active head 重建、旧 turn 保留、重启跳过中间 rollout 和 lineage source provenance 属于该隔离能力；缺 parent、多 head、循环或关系歧义必须 fail-closed。
- 日期分区、候选数和读取窗口不是 rollout.jsonl 物理分页；lineage 沿 `history_base` 解析到 root，不设置 `max_lineage_depth`，由 cycle detection、目录/候选/header/fingerprint/decoded byte budget、取消和 deadline 控制异常资源。既有 full/tail/backward/append 语义保持不变，同文件 append 与 child transition 的 cursor/lineage epoch 不得混用；Rust 内部 source locating + append 需要完整 lineage 时必须恢复/重读 active snapshot，不得把 delta 冒充完整历史。
- `session_lineage_v1` 的 `discovered_sources`、`lineage_transitions`、`lineage_coverage`、`lineage_checkpoint` 是 additive 隔离 protocol evidence，不是产品 history DTO、数据库表或 App ADTO；transition validation、lineage coverage、projection coverage、`projection.complete`、batch completeness 和 replacement mutation 必须分层。
- 同目录同名 `.jsonl` 与 `.jsonl.zst` 按 Codex plain sibling 优先，只保留 plain；不跨目录按 rollout ID 合并、不按 mtime/内容选择、不在 plain 失败时 fallback。只有 `.zst` 时 active/root 可 forward full read；普通 `.zst` 作为 parent 需要 suffix/backward/replacement/full-history 定位时必须类型化 fail-closed，不得伪造 seek/append cursor。
- 阶段 3 formal identity 必须区分物理 `event_id` 与可跨 tail/backfill/append/重试交付/重启复用的逻辑 `item_key`；优先 native stable ID，其次稳定 source position；显式 target conversation id 优先。不得使用文件名、读取顺序、segment boundary、随机值、content hash 或 SessionMeta 推断 canonical conversation id。
- `CodexEventAdapter` 是唯一建立 conversation/turn/tool/plan/usage 关联的入口；`AnalysisReducer`/`AnalysisProjection` 只消费 TermLink-owned `AnalysisEvent`，tool/Plan/usage 归约必须保持重试交付/overlap 幂等和 partial/unknown/alias 的诊断、不完整语义。Demo/Spike 只能作为只读 golden/reference oracle，不得成为正式实现依赖或产品 DTO 来源。
- `SegmentAssembly::promote_to_forward_append` 是 formal source promotion 的唯一安全路径；`TailPreviewCursor`/`BackfillCursor` 不得直接转换为 `ForwardAppendCursor`。pending tail、gap、partial、parse diagnostic、source mutation/truncation/replacement 或 fingerprint/anchor 不一致时必须 fail-closed。
- 不得在没有独立任务、范围锁定和用户确认的情况下把该基础层扩展到 Node、Android、IPC、数据库、服务端持久化、完整 reducer/runtime 或既有 Demo/Spike 路径。
- **4.5 模块协作顺序（AD-022）**：Rust target 接口契约先行，Node consumer 在后续独立任务中依据已同步的 Rust 契约重新设计和实施；Rust 任务不得因 Node 尚未开始或现状不一致而直接修改 Node。若双方最佳实践最终冲突，必须由 Rust/Node owner 联合分析并取得确认，不能由任一模块单方面静默覆盖共享边界。

## Scope

- 适用范围：`E:\coding\TermLink-rust-source-resolution-codex`
- 原则：项目私有技能使用仓库内 Codex / Claude 镜像目录，不依赖全局 skills；vNext 公共技能以 `.agents/skills/` 的安装版为准。
- 当前目录：`.agents/skills/`（Claude 镜像为 `.claude/skills/`）

## Android build and device debug

- Android 编译、Android JVM unit test、APK 构建和相关 Gradle 命令必须使用 JDK 21：`D:\ProgramCode\openjdk\jdk-21`。
- 在 PowerShell 中执行 Android 编译 / 测试前，先设置：`$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"`。
- 进行本地开发环境的 Android 真机验证测试前，先确认 TermLink 本地开发服务是否已启动；如果未启动，使用 `[$local-dev-server-control](E:\\coding\\TermLink-rust-source-resolution-codex\\.agents\\skills\\local-dev-server-control\\SKILL.md)` 的 `start` 命令 / 流程启动服务。
- Android 真机安装、启动、logcat、mTLS/HTTPS/WSS 连接排查等真机调试场景，使用 `[$adb-real-device-debug](E:\\coding\\TermLink-rust-source-resolution-codex\\.agents\\skills\\adb-real-device-debug\\SKILL.md)`；仅在用户请求或任务明确需要真机调试时触发，不因本文声明自动执行。

## Available local skills

1. `android-local-build-debug`
- 用途：Android 真机调试（build/install/launch/logcat）。
- 文件：`.agents/skills/android-local-build-debug/SKILL.md`

2. `adb-real-device-debug`
- 用途：将原全局 Codex `adb-real-device-debug` 收编为项目内 skill，供 Codex/Claude 共用真机 adb 调试流程。
- 文件：`.agents/skills/adb-real-device-debug/SKILL.md`

3. `android-build-apk-copy`
- 用途：仅编译 APK，并复制到 `E:\project\TermLink`。
- 文件：`.agents/skills/android-build-apk-copy/SKILL.md`

4. `session-retention-debug`
- 用途：验证会话保留与断联续接（`/api/sessions` 观测）。
- 文件：`.agents/skills/session-retention-debug/SKILL.md`

5. `win-server-deploy`
- 用途：Windows 服务端打包与 pm2 服务部署。
- 文件：`.agents/skills/win-server-deploy/SKILL.md`

6. `docs-requirement-sync`
- 用途：按 REQ 驱动开发并强制 CR 记录（`req_id + commit_ref`）。
- 文件：`.agents/skills/docs-requirement-sync/SKILL.md`

7. `git-sensitive-scan`
- 用途：提交前敏感信息审查（扫描 staged 文件中的密钥、口令、私钥、真实本地配置地址）。
- 文件：`.agents/skills/git-sensitive-scan/SKILL.md`

8. `git-worktree`
- 用途：创建、复用、移除 Git worktree，用于并行功能开发和隔离分支目录。
- 文件：`.agents/skills/git-worktree/SKILL.md`

9. `local-dev-server-control`
- 用途：启动/停止/重启/检查当前仓库本地开发环境服务（`npm run dev`）。
- 文件：`.agents/skills/local-dev-server-control/SKILL.md`

## Trigger rules

满足以下任一条件时应触发对应 skill：

1. 用户显式提到 skill 名（如 `$android-build-apk-copy`）。
2. 请求内容与 skill 描述高度匹配（如“只编译 APK 并复制到 E 盘”）。

多个 skill 同时匹配时，优先使用最小集合并按顺序执行。

## Usage rules

1. 先读取对应 `SKILL.md`，按其中步骤执行。
2. 默认在仓库根目录执行命令：`E:\coding\TermLink-rust-source-resolution-codex`。
3. 项目私有技能按项目规则维护；vNext 公共技能以 `.agents/skills/` 的安装版为准。
4. 优先复用宿主目录中的 skill 自带脚本（如 `.agents/skills/<name>/scripts/*`），不要重复造流程。
5. `docs-requirement-sync` 场景下，遵循 CR 门禁规则：
- 每次实施/提交新增一条 `docs/changes/records/CR-*.md`
- `active` 记录必须有真实 `commit_ref`
6. Git 提交前必须执行敏感信息审查（由 `.githooks/pre-commit` 调用 `scripts/git-sensitive-scan.ps1`）。

## Non-goals

1. 不在本项目内自动安装/同步全局 skills。
2. 不把本项目私有流程写入全局 skill 目录。
