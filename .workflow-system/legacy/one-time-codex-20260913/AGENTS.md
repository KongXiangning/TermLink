# Project Agents Instructions (TermLink)

用中文回答问题
本文件定义 **仅在本项目生效** 的本地 skills。

## workflow-system baseline

- 本项目已完成 workflow-system install 与 adoption baseline。
- 在修改 workflow 管理文档前，先读：
  - `.workflow-system/PROJECT_PROFILE.yaml`
  - `.workflow-system/WORKFLOW_PROTOCOL.md`
  - `.workflow-system/FILE_SCHEMAS.md`
  - `docs/workflow/CONTRACTS.md`
  - `docs/workflow/STATUS.md`
  - `docs/workflow/DECISIONS.md`
  - `docs/workflow/BASELINES.md`
- 当前项目按**老项目接入**处理，不要把 adoption 阶段当成重写架构的机会。
- 分阶段任务的回归判定以 `CURRENT_TASK.md` 当前步骤的 required-now 门禁为准：后续步骤的预期缺口记录为 `future-step-expected-gap`，不得阻塞当前步骤；全量结果、失败分类和实际缺口必须保留，并继续作为整体任务与最终交付门禁。不得用该规则掩盖当前步骤自身的契约违规、未知失败、真实回归、挂起/泄漏或范围越界。
- 变更项目级 AI 协作规则、宿主说明或共享 workflow 命令后，执行 `/sync-host-guidance`。
- 变更 workflow 模板或治理文档骨架后，执行：
  - `bun install`
  - `bun run gen:all`
  - `bun run workflow:sync --host claude --write`
  - `bun run workflow:sync --host codex --write`
  - `bun run workflow:health`

## Codex IPC 实时同步冻结区

- 任何可能触及 Codex IPC、实时会话同步、conversation 绑定/恢复、owner surface、Android Codex 状态仲裁或下列核心文件的任务，在分析、规划或修改前必须先读：
  - `docs/workflow/CONTRACTS.md` 的“🔒 Codex 原生会话实时同步核心”
  - `docs/workflow/DECISIONS.md` 的 `AD-004`
- App 端固定数据流为：`active conversation → gateway follower acquire → CodexIpcFeed desired subscription/reconnect replay → Codex host 定向 snapshot/patch → Android IPC authority`。healthy IPC surface 是正文、operation、当前 turn 与运行态的唯一实时来源。
- canonical `thread/read` 只允许作为明确 offline、desynced 或当前订阅周期缺少目标 surface 时的有界恢复通道；禁止把定时轮询、snapshot 静默超时、cwd/task 猜测、`codex_state=idle` 或其他第二数据源改造成实时权威。
- 默认不得重构、替换、删除或绕过 follower acquire/release、desired subscription、reconnect replay、normalized surface、canonical id/binding、owner fallback、Android IPC authority 与 A/B 隔离。宿主协议演进时只允许保持上述数据流和权威语义的最小兼容适配。
- 若需求确实需要改变上述架构，必须停止实现并取得用户明确确认，然后先执行 `/lock-scope`，同步 `DECISIONS.md` 与 `CONTRACTS.md`，并把 follower lifecycle、authority arbitration、A/B 隔离、长任务和重连真机回归列为强制门禁；不得在普通 bugfix、UI 修改或“简化代码”中顺手改变。
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

- 适用范围：`E:\coding\TermLink`
- 原则：本项目技能使用仓库内 Codex / Claude 镜像目录，不依赖全局 skills。
- 当前目录：`.codex/skills/`（Claude 镜像为 `.claude/skills/`）

## Android build and device debug

- Android 编译、Android JVM unit test、APK 构建和相关 Gradle 命令必须使用 JDK 21：`D:\ProgramCode\openjdk\jdk-21`。
- 在 PowerShell 中执行 Android 编译 / 测试前，先设置：`$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"`。
- 进行本地开发环境的 Android 真机验证测试前，先确认 TermLink 本地开发服务是否已启动；如果未启动，使用 `[$local-dev-server-control](E:\\coding\\TermLink\\.codex\\skills\\local-dev-server-control\\SKILL.md)` 的 `start` 命令 / 流程启动服务。
- Android 真机安装、启动、logcat、mTLS/HTTPS/WSS 连接排查等真机调试场景，使用 `[$adb-real-device-debug](E:\\coding\\TermLink\\.codex\\skills\\adb-real-device-debug\\SKILL.md)`；仅在用户请求或任务明确需要真机调试时触发，不因本文声明自动执行。

## Available local skills

1. `android-local-build-debug`
- 用途：Android 真机调试（build/install/launch/logcat）。
- 文件：`.codex/skills/android-local-build-debug/SKILL.md`

2. `adb-real-device-debug`
- 用途：将原全局 Codex `adb-real-device-debug` 收编为项目内 skill，供 Codex/Claude 共用真机 adb 调试流程。
- 文件：`.codex/skills/adb-real-device-debug/SKILL.md`

3. `android-build-apk-copy`
- 用途：仅编译 APK，并复制到 `E:\project\TermLink`。
- 文件：`.codex/skills/android-build-apk-copy/SKILL.md`

4. `session-retention-debug`
- 用途：验证会话保留与断联续接（`/api/sessions` 观测）。
- 文件：`.codex/skills/session-retention-debug/SKILL.md`

5. `win-server-deploy`
- 用途：Windows 服务端打包与 pm2 服务部署。
- 文件：`.codex/skills/win-server-deploy/SKILL.md`

6. `docs-requirement-sync`
- 用途：按 REQ 驱动开发并强制 CR 记录（`req_id + commit_ref`）。
- 文件：`.codex/skills/docs-requirement-sync/SKILL.md`

7. `git-sensitive-scan`
- 用途：提交前敏感信息审查（扫描 staged 文件中的密钥、口令、私钥、真实本地配置地址）。
- 文件：`.codex/skills/git-sensitive-scan/SKILL.md`

8. `git-worktree`
- 用途：创建、复用、移除 Git worktree，用于并行功能开发和隔离分支目录。
- 文件：`.codex/skills/git-worktree/SKILL.md`

9. `local-dev-server-control`
- 用途：启动/停止/重启/检查当前仓库本地开发环境服务（`npm run dev`）。
- 文件：`.codex/skills/local-dev-server-control/SKILL.md`

10. `design-baseline-init`
- 用途：新项目首版设计基线初始化。
- 文件：`.codex/skills/workflow-system-design-baseline-init/SKILL.md`

11. `legacy-inventory`
- 用途：老项目接入 workflow 前的事实盘点。
- 文件：`.codex/skills/workflow-system-legacy-inventory/SKILL.md`

12. `realign-workflow-assets`
- 用途：在不清空目标仓库的前提下，对齐现有 workflow 文档、runtime skills、host guidance 与项目画像到当前 layout contract。
- 文件：`.codex/skills/workflow-system-realign-workflow-assets/SKILL.md`

13. `greenfield-init`
- 用途：新项目 workflow 治理基线初始化。
- 文件：`.codex/skills/workflow-system-greenfield-init/SKILL.md`

14. `adopt-existing-project`
- 用途：基于盘点结果为老项目建立首版 workflow 治理基线。
- 文件：`.codex/skills/workflow-system-adopt-existing-project/SKILL.md`

15. `create-current-task`
- 用途：根据用户需求生成首版 `docs/workflow/CURRENT_TASK.md`。
- 文件：`.codex/skills/workflow-system-create-current-task/SKILL.md`

16. `review-current-task`
- 用途：审查并收敛 `docs/workflow/CURRENT_TASK.md`，使其可执行、可审计。
- 文件：`.codex/skills/workflow-system-review-current-task/SKILL.md`

17. `lock-scope`
- 用途：锁定本轮允许修改、禁止修改与条件放行边界。
- 文件：`.codex/skills/workflow-system-lock-scope/SKILL.md`

18. `classify-decisions`
- 用途：把任务中的决策分成 mechanical / taste / user_challenge。
- 文件：`.codex/skills/workflow-system-classify-decisions/SKILL.md`

19. `decompose-task`
- 用途：把任务拆成可独立验证的小步骤。
- 文件：`.codex/skills/workflow-system-decompose-task/SKILL.md`

20. `execute-current-task`
- 用途：从已有 `docs/workflow/CURRENT_TASK.md` 自动推进完整任务链。
- 文件：`.codex/skills/workflow-system-execute-current-task/SKILL.md`

21. `continue-current-step`
- 用途：在当前任务已锁定范围并拆好步骤后，继续执行当前步骤及后续复核链。
- 文件：`.codex/skills/workflow-system-continue-current-step/SKILL.md`

22. `debug-and-fix-current-task`
- 用途：围绕当前任务先定位根因，再执行最小修复和复核。
- 文件：`.codex/skills/workflow-system-debug-and-fix-current-task/SKILL.md`

23. `implement-current-step`
- 用途：只实现 `CURRENT_TASK.md` 的当前步骤，禁止顺手扩散。
- 文件：`.codex/skills/workflow-system-implement-current-step/SKILL.md`

24. `investigate-root-cause`
- 用途：先做根因定位，再提出最小修复路径。
- 文件：`.codex/skills/workflow-system-investigate-root-cause/SKILL.md`

25. `review-diff`
- 用途：审查当前 diff 是否越界、是否偏离任务意图。
- 文件：`.codex/skills/workflow-system-review-diff/SKILL.md`

26. `review-implementation`
- 用途：审查当前实现是否满足目标、逻辑是否正确、边界与异常路径是否鲁棒、兼容性和测试是否充分。
- 文件：`.codex/skills/workflow-system-review-implementation/SKILL.md`

27. `review-current-diff`
- 用途：只读审查当前 diff，串联 scope、实现质量、契约和 report-only 回归检查。
- 文件：`.codex/skills/workflow-system-review-current-diff/SKILL.md`

28. `verify-contracts`
- 用途：核查本轮变更是否破坏接口契约或架构契约。
- 文件：`.codex/skills/workflow-system-verify-contracts/SKILL.md`

29. `run-regression`
- 用途：按任务上下文选择合适 QA 模式并执行回归验证。
- 文件：`.codex/skills/workflow-system-run-regression/SKILL.md`

30. `sync-current-task`
- 用途：回写 `docs/workflow/CURRENT_TASK.md` 的执行状态、验证结果与剩余问题。
- 文件：`.codex/skills/workflow-system-sync-current-task/SKILL.md`

31. `sync-status`
- 用途：更新 `docs/workflow/STATUS.md`，反映当前项目整体进度与稳定状态。
- 文件：`.codex/skills/workflow-system-sync-status/SKILL.md`

32. `sync-contracts`
- 用途：把新形成的稳定接口或架构边界写回 `docs/workflow/CONTRACTS.md`。
- 文件：`.codex/skills/workflow-system-sync-contracts/SKILL.md`

33. `sync-decisions`
- 用途：把已确认架构、口味、暂缓或否决决策写回 `docs/workflow/DECISIONS.md`。
- 文件：`.codex/skills/workflow-system-sync-decisions/SKILL.md`

34. `sync-host-guidance`
- 用途：同步 `AGENTS.md` 与 `CLAUDE.md`，确保两侧宿主读取同一套已确认项目级约束。
- 文件：`.codex/skills/workflow-system-sync-host-guidance/SKILL.md`

35. `capture-lessons`
- 用途：把可复用经验与踩坑记录沉淀到 `docs/workflow/LESSONS.md`。
- 文件：`.codex/skills/workflow-system-capture-lessons/SKILL.md`

36. `prepare-delivery-summary`
- 用途：整理结构化交付摘要，便于审计与移交。
- 文件：`.codex/skills/workflow-system-prepare-delivery-summary/SKILL.md`

37. `archive-task`
- 用途：归档已完成任务，并为下一轮任务准备干净入口。
- 文件：`.codex/skills/workflow-system-archive-task/SKILL.md`

38. `close-current-task`
- 用途：任务完成后自动收尾，串联状态同步、经验沉淀、交付摘要和归档。
- 文件：`.codex/skills/workflow-system-close-current-task/SKILL.md`

## Trigger rules

满足以下任一条件时应触发对应 skill：

1. 用户显式提到 skill 名（如 `$android-build-apk-copy`）。
2. 请求内容与 skill 描述高度匹配（如“只编译 APK 并复制到 E 盘”）。

多个 skill 同时匹配时，优先使用最小集合并按顺序执行。

## Usage rules

1. 先读取对应 `SKILL.md`，按其中步骤执行。
2. 默认在仓库根目录执行命令：`E:\coding\TermLink`。
3. 新增或修改本地 skill 时，保持 `.codex/skills/` 内容准确，并同步 `.claude/skills/` 镜像。
4. 优先复用宿主目录中的 skill 自带脚本（如 `.codex/skills/<name>/scripts/*`），不要重复造流程。
5. workflow-system bootstrap skills 的目录名前缀 `workflow-system-` 只是命名空间；实际调用名以 `SKILL.md` 里的 `name` 为准（如 `/greenfield-init`、`/adopt-existing-project`）。
6. `docs-requirement-sync` 场景下，遵循 CR 门禁规则：
- 每次实施/提交新增一条 `docs/changes/records/CR-*.md`
- `active` 记录必须有真实 `commit_ref`
7. Git 提交前必须执行敏感信息审查（由 `.githooks/pre-commit` 调用 `scripts/git-sensitive-scan.ps1`）。
8. workflow 管理的 live docs 以 `docs/workflow/*.md` 为准；`docs/workflow/generated/**` 是生成参考输出，不是 live source of truth。

## Non-goals

1. 不在本项目内自动安装/同步全局 skills。
2. 不把本项目私有流程写入全局 skill 目录。
