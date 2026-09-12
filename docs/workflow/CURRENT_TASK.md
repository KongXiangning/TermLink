# docs/workflow/CURRENT_TASK.md

## 任务信息

- 项目：termlink
- 项目类型：application
- 任务 ID：20260828-001
- 任务标题：4.5 Node analyzer consumer/coordinator 迁移
- 任务 slug：codex-node-analyzer-phase45-migration
- 当前状态：active
- 生命周期状态：active
- 恢复需审查：false
- 恢复审查原因：
- 创建时间：2026-08-28
- 当前 handoff：sync-status（步骤 8 required-now 门禁已通过；步骤 9 最终收口待执行）
- 任务起始提交：`7a167711950710b05f3e84c8d3ad975df1c6ab0c`（`docs(workflow): archive target identity repair`）
- 安全模式：frozen-scope

## 背景与上下文

- 用户原始需求：Rust 4.5 target 契约已经先行完成，接下来开始 Node 模块的 4.5 实施；Node 必须依据已确认的 Rust 接口文档重新调整设计。
- 任务定位：这是 Rust 4.5 target 之后的独立 Node consumer/coordinator 迁移任务，范围限定在隔离的 `codexRolloutCollector` process/import/store 边界，不把 Rust 任务的完成误写成 Node 或产品集成完成。
- 已确认 Rust 基线：Rust target startup、stdio JSONL、Node-first hello、三种 analyze mode、batch/ACK/complete 交付门禁和确定性 `segment_id`/`batch_id` 已在提交 `5a3214a` 交付；当前 HEAD 为其后的 workflow 归档提交 `7a16771`。
- 当前 Node 事实：`src/services/codexRolloutCollector/**` 仍保留阶段 4 旧 consumer 形态；现有测试和 fake analyzer 仍可见 `mode: replay`、`source_spec` 及旧的恢复/替换字段，尚未消费 Rust 4.5 target 的启动级 `sessions_root` 与新 wire 结构。
- caller inventory 结果：仓库内未发现 `codexRolloutCollector` 之外的生产调用方；当前可确认的直接消费者是该目录的模块 exports、`tests/codexRolloutCollector.test.js` 和 `tests/fixtures/codex-rollout-collector/fake-analyzer.js`。仓库外 caller 不作为本仓库契约推断依据，模块 exports 仍需保留可用入口。
- 目标边界：Node 负责启动 Rust target、握手、调度单飞请求、取消/超时/有限重试、批次校验与 ACK、隔离的 staging/receipt/checkpoint/run 状态；Rust 负责内部 source/lineage 定位、读取、解析、归约和 target batch 生成。
- 关键约束：Node 不向 Rust 发送 source path、discovery、catalog、date range、active hint 或 `replay`；`sessions_root` 只通过启动参数传入。Node 将 Rust 生成的 `segment_id`/`batch_id` 作为 opaque identity 保存和重试，不在 Node 重算 Alpha 的 hash，也不重新实现 Rust identity 算法。
- 最小可接受结果：Node 隔离 collector 能以 Rust 4.5 target 契约完成一次可验证的 hello → analyze → batch → ACK → complete 生命周期，并在重启、取消、超时、重复 batch、partial/canonical 和 checkpoint 恢复场景下保持 fail-closed 与幂等。
- 不在本任务内完成：既有产品 DB/Stage 5 canonical publication、`terminalGateway`/IPC/Android/HTTP history 接入、Rust source 层 candidate pre-I/O 修复、formal source hash/append prefix digest 中断性修复、vendor/Demo/Spike 源码改动和 release/deploy/canary。
- 关联来源：`docs/codex/codex-rollout-collector-architecture.md`、`docs/codex/codex-history-sync-node-server-rust-analyzer-interface-index-draft.md`、startup/wire/data/coordinator contract drafts、`docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`、`docs/workflow/STATUS.md`。

## 验收标准

- [ ] 启动参数可验证：Node 从既有 `CODEX_HOME` 规则解析 `sessions_root`，传给 Rust target 的参数严格为 `--startup-config-version 1 --sessions-root <absolute normalized path>`；analyze 请求不包含 source path、discovery、catalog、date range 或 active hint。
- [ ] Analyze 请求形状可验证：每次请求包含 `protocol_version`、`message_type=analyze`、`request_id`、Node 分配的 `job_id`、显式 `conversation_id`、`mode`，并按场景携带 `cursor`、`persisted_anchor`、`recovery`、`known_complete_range` 和 `resource_limits`；`recovery` 为空或同时包含 opaque `segment_id`/`batch_id`，不把启动参数或 Rust 内部 discovery 字段下沉到请求。
- [ ] 握手可验证：Node 先发送 `hello(role=node)`，每个 process generation 使用可关联的 `request_id`；只有收到 Rust 回显同一 `request_id` 的 `hello(role=analyzer)` 且能力满足 `analyze_v1`、`cancel`、`checkpoint`、`ack` 最低集合后才可发送 analyze。
- [ ] Wire 边界可验证：Node parser/serializer 覆盖 `hello`、`analyze`、`cancel`、`batch`、`ack`、`complete`、`error` 七类消息；按消息类型检查其必需的 identity、cursor、source safety、provenance 或 checkpoint 证据，缺失时拒绝；未知字段可按 additive 规则忽略；Node target 请求不主动声明 `replay`。
- [ ] 请求身份可验证：公共 mode 只有 `preview`、`backfill`、`append`；同一重试任务保留 `job_id`、conversation/source scope、checkpoint 和待重交付的 opaque `segment_id`/`batch_id`，每次 wire attempt 生成新的 `request_id`；Node 不从 path、文件名、读取顺序、segment boundary 或 content hash 推导 identity。
- [ ] 单飞和生命周期可验证：一个 Node 服务实例只有一条 Rust collector 进程链和一个 in-flight analyzer request；同一 conversation 只有一个 running intent 和一个 pending intent；取消、deadline、进程 generation 切换和迟到消息不会发布 batch/complete，也不会让旧 generation 改写新请求。
- [ ] 错误语义可验证：`resource_limit_exceeded`、`resource_timeout`、cancel、source/lineage fail-closed、协议错误和进程异常保持可区分的稳定 code/retryable 语义，不把所有 discovery/read/cancel/timeout 错误归为 `analysis_failed`；进程重启只使用固定有限预算。
- [ ] Batch 导入可验证：Node 先校验 batch 外层 `job_id`/`segment_id`/`batch_id`/`request_id`、payload、provenance、completeness、source identity、cursor、lineage evidence 和 mutations，再写隔离 staging/receipt；重复 batch/overlap 幂等，内容冲突 fail-closed。
- [ ] ACK/complete 顺序可验证：只有 batch 已通过校验且 staging/receipt 持久化成功后，Node 才发送 `accepted=true,persisted=true`；Rust 只有匹配 ACK 后才能发 complete；Node 只接受与当前 request、scope、checkpoint 和 completeness 一致的 complete。
- [ ] Checkpoint 可验证：checkpoint 与 request/conversation/source scope、reader/provenance、segment/range、cursor、completeness、projection watermark 和 reducer state 一致；partial/provisional/unknown 不能覆盖已保存 canonical，空 complete、跨 request complete、旧 source evidence 和 cursor 不匹配均 fail-closed。
- [ ] 派生数据可验证：正式 Rust batch 中的 `tool_details`、`usage`、`task_outcomes`、`mutations` 等字段被 Node 保存到隔离 artifact；本任务不将这些字段写入既有产品 DB，也不新增产品 `source_epoch`、版本或 tombstone 语义。
- [ ] Legacy 字段语义可验证：Node 不发送、不要求、不比较或持久化 `retention_profile`、泛化 item/source `revision`、`discovery` 或 `source_spec`；若迁移期仍需读取旧 payload，只能作为 opaque compatibility metadata，不得重新赋予公共业务语义。
- [ ] 旧行为回归可验证：不改变 Sessions/Workspace API、既有 Codex IPC/owner/follower/reconnect replay、Android/WebView、`terminalGateway` 和 legacy no-arg Rust runtime；现有 Node collector 导出入口在不违反 4.5 wire 的前提下保持兼容，无法兼容的旧 analyzer wire 通过明确的迁移边界处理，不静默双写或 fallback。
- [ ] 测试和范围可验证：新增/改造 Node collector 目标测试覆盖正常生命周期、三种 mode、身份重试、hello 能力拒绝、cancel/timeout/generation、有限重启、重复/冲突 batch、checkpoint fail-closed、partial→canonical 与 source scope 隔离；`node --check`、目标 Node tests、Rust target 既有回归和 `git diff --check` 有记录，变更路径无越界。

## 设计约束

- Design mode: none
- Design source: none
- Design acceptance: 本任务为 Node 后端 process/coordinator/store 迁移，无 UI、页面、视觉或交互设计；不改变 WebSocket/Android 展示层。
- Design evidence: not applicable
- Design open decisions: none

## 发布后验证

- Release mode: none
- Deploy source: none
- Target environment: local Node service + Rust analyzer subprocess
- Health checks: 目标 Node collector 测试、Rust target process smoke、`node --check`、scope scan、`git diff --check`；不执行生产部署或 canary。
- Canary window: not applicable；本任务不启用产品入口。
- Performance baseline: none；本任务只验证已有 timeout/resource budget 语义，不建立产品性能基线。
- Rollback / recovery: 以任务起始提交为回滚基线，优先撤销本任务提交或 path-scoped 恢复 Node collector 允许文件；不得 reset/clean 用户或任务外工作树内容。
- Release evidence: not applicable；隔离 artifact 的测试证据不等同于 release readiness。

## 允许修改范围

### Allowed Files

- 本次 scope widening 重新开放的既有任务文件（仅用于当前 repair window；不新增任务边界）：
  - src/services/codexRolloutCollector/analyzerProcessManager.js
  - src/services/codexRolloutCollector/index.js
  - src/services/codexRolloutCollector/analysisRunStore.js
- `src/services/codexRolloutCollector/analyzerProtocol.js`
- `src/services/codexRolloutCollector/analyzerProcessManager.js`
- `src/services/codexRolloutCollector/analyzerRequestTracker.js`
- `src/services/codexRolloutCollector/analysisBatchImporter.js`
- `src/services/codexRolloutCollector/analysisCheckpointStore.js`
- `src/services/codexRolloutCollector/analysisRunStore.js`
- `src/services/codexRolloutCollector/index.js`
- `tests/codexRolloutCollector.test.js`
- `tests/fixtures/codex-rollout-collector/fake-analyzer.js`
- `docs/workflow/CURRENT_TASK.md`（仅由 workflow skill 回写任务事实）

### Conditional Files

- 本次 scope widening 不新增 Conditional Files；上述三个文件原已属于任务总 Allowed Files，只是此前不在步骤 8 当前修复窗口内。其余 Conditional Files 仍需按各自触发条件、证据和重新 lock-scope 流程放行。
- `src/services/codexRolloutCollector/**` 下新增拆分模块：只有现有允许文件无法保持清晰职责，且 `plan-implementation`/`decompose-task` 明确列出文件、`lock-scope` 放行后才允许；仍不得越出隔离 process/import/store 边界。
- `tests/fixtures/codex-rollout-collector/**` 下新增 fixture：只有测试矩阵证明需要持久化 fixture，且由 `decompose-task` 点名文件并经 `lock-scope` 放行后才允许；优先使用现有 fake analyzer 和临时目录。
- `package.json` 或 `package-lock.json`：只有确有必要新增 Node 测试入口或依赖，且先给出原因、影响、离线可复现性和回滚方式，并由 `lock-scope` 明确放行；默认禁止。
- `docs/codex/**` 的 4.5 接口文档：只有实现发现文档与已交付 Rust target 存在事实冲突时才可停工上浮，先由 Rust/Node owner 联合确认并重新锁定范围；本任务默认不改文档。
- `docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`、`docs/workflow/STATUS.md`、`docs/workflow/LESSONS.md`：只允许在对应 sync/closeout skill 依据已稳定事实处理；Node 实施步骤不得顺手修改，且不得用 CURRENT_TASK 覆盖长期契约。
- `TASKS/**`：仅由归档、暂停或中断 workflow skill 按生命周期规则写入；实现步骤不得自行创建或修改任务归档。

## 禁止修改范围

### Forbidden Files

- `native/codex-rollout-collector/**`，包括 Rust target、`src/source/**`、vendor、Demo/Spike 和 Rust fixture 源码
- `src/ws/terminalGateway.js`
- `src/services/codexIpcClient.js`、`src/services/codexIpcFeed.js`、`src/services/codexIpcThreadStream.js`、`src/services/codexOwnerSurfaceTracker.js` 及其他 `src/services/codexIpc*`
- `src/services/codexHistory*`、`src/services/*History*`、`src/routes/**`、`src/repositories/**`、`data/**` 以及任何产品 DB/Stage 5 schema 或 publication 路径
- `android/**`、`public/**`、非本任务列出的 `tests/**` 和 `tests/fixtures/**`
- `docs/codex/**`、`AGENTS.md`、`CLAUDE.md`、`.workflow-system/**`、`templates/**`、`docs/workflow/generated/**`，除 Conditional Files 明确放行的同步路径外
- `.git/**`、`node_modules/**`、外部 Codex path/workspace、默认网络下载依赖和任何用户本机 Codex 数据目录
- 任何未列入 Allowed Files 且不满足 Conditional Files 条件的文件、接口、数据库、IPC、Android 或产品入口

## 范围锁定

- Lock status：locked（2026-08-31 重新锁定当前回补窗口）
- Safety mode：frozen-scope
- Guarded mode：not selected
  - 理由：本任务是隔离的 Node collector consumer/coordinator 迁移，目标环境仅为本地 Node 服务与 Rust analyzer 子进程；不进入 production、数据库迁移、权限/认证、支付、部署、CI/CD、监控配置、产品性能基线、批量删除、force push 或 history rewrite。回滚采用任务路径范围内的可审计撤销，不执行破坏性 reset/clean，因此使用 `frozen-scope` 锁文件边界即可。
- Scope sources：
  - `docs/workflow/CURRENT_TASK.md`
  - `.workflow-system/PROJECT_PROFILE.yaml`
  - `docs/workflow/CONTRACTS.md`
  - `docs/workflow/DECISIONS.md`
- Mutation buckets：
  - 当前回补窗口 Allowed Files（RI-4.5-008-001 / RI-4.5-008-002）：analyzerProcessManager.js、index.js、analysisRunStore.js、tests/codexRolloutCollector.test.js、tests/fixtures/codex-rollout-collector/fake-analyzer.js，以及 workflow skill 允许回写的 CURRENT_TASK.md。
  - Allowed Files：仅限上方 `## 允许修改范围 > Allowed Files`，包括现有 `src/services/codexRolloutCollector/**` 指定文件、对应 Node target 测试/fake analyzer 和本任务 `CURRENT_TASK.md`；不得把同目录通配符理解为全部文件已获授权。
  - 当前回补窗口之外的 task-wide Allowed Files：仍保留给各自原步骤，不因本次 scope widening 自动获得本轮修复授权。
  - Conditional Files：上方 `## 允许修改范围 > Conditional Files` 中的新增拆分模块、额外 fixture、`package.json`/`package-lock.json`、4.5 文档和 workflow 同步文档当前均不是无条件授权；只有满足各自触发条件、记录原因/影响/风险/验证，并重新执行 `lock-scope` 后才可加入 Allowed Files。
  - Forbidden Files：上方 `## 禁止修改范围 > Forbidden Files` 中的 Rust/native、source、vendor、Demo/Spike、IPC、`terminalGateway`、Android、public、产品 history/DB/Stage 5、未列测试、外部 Codex 数据和未列出的所有路径均禁止修改。
- Dangerous surfaces：
  - Node→Rust stdio JSONL：startup 参数、Node-first hello、request/response correlation、七类消息 parser/serializer 和未知字段处理错误会造成进程拒绝、误接收或错误发布。
  - process lifecycle：generation、single-flight、pending intent、cancel、deadline、有限重启和迟到 stdout 消息会影响请求隔离；旧 generation 不得写入 batch、complete、checkpoint 或 run state。
  - import/ACK durability：batch 校验、staging/receipt 原子性、ACK-before-persist 顺序、duplicate/overlap/conflict 幂等和 partial/canonical 门禁会影响隔离 artifact 的一致性；任何证据不足必须 fail-closed。
  - identity/checkpoint：`job_id`、`request_id`、conversation/source scope、opaque `segment_id`/`batch_id`、cursor、lineage/provenance 和 completeness 关联错误会破坏重试幂等或恢复安全；Node 不得重算 Rust identity。
  - sessions_root startup boundary：Node 只能按既有 `CODEX_HOME` 规则解析并传递绝对规范化 `sessions_root`，不得在 Node 侧执行 source discovery、路径猜测、目录 catalog 或 candidate 读取。
  - legacy migration：旧 `replay`/`source_spec` 是隔离私有旧 wire，迁移时不得静默双协议、fallback 或重新赋予公共语义；现有模块 exports/store 调用面仍需保持可用。
  - rollback/operational surface：仅允许 path-scoped diff/revert 和目标测试；禁止 broad reset、clean、删除任务外文件、force push、历史重写、生产部署或启动未登记的外部 Codex 数据路径。
  - 未触及的高风险面：production、database、permissions、authentication、payments、deployment、CI/CD、monitoring config、performance baseline、bulk delete、force push、history rewrite 均不在本任务授权范围内。
- Locked contracts：
  - `CONTRACTS.md > 4.5 Rust analyzer target-side startup/process interface`：startup 参数固定为 `--startup-config-version 1 --sessions-root <absolute normalized path>`，Node-first hello，单 active request，三种公共 mode，batch/ACK/complete 门禁和 typed fail-closed 语义不可改写。
  - `CONTRACTS.md > P0-RC.1 Codex Rollout Collector batch interface`：Rust 生成的 batch/provenance、source/lineage/cursor/completeness/mutation 证据是 Node 的上游事实；Node 只消费隔离 artifact，不扩展成产品 DTO/DB。
  - `CONTRACTS.md > Codex Rollout Collector P0-RC.1 隔离边界`：Node collector 不得传播到 `terminalGateway`、IPC、Android、既有 server routes 或产品持久化。
  - `AD-018`、`AD-019`、`AD-021`、`AD-022`：单例采集链、三 mode + 新 request 重试、legacy 业务字段退出和 Rust-first/Node 后续适配均保持有效。
  - `AD-004`：Codex IPC 实时同步核心冻结；本任务不得触碰 owner/follower/reconnect replay、canonical binding 或 Android authority。
  - 兼容策略：保留现有 Node collector exports/store 调用面；旧私有 wire 按受控 target migration 替换，不做静默双写或 fallback；不改变 legacy no-arg Rust runtime 和产品 API。
- Unlock / widening conditions：
  - Rust target/source 或 pre-I/O 安全边界：原因是 Node 发现文档与实际 binary 冲突，或必须由 Rust 修复 source boundary；影响文件为具体 `native/codex-rollout-collector/**` 文件及必要测试/契约文档；风险是越过 Rust/Node ownership、改变已锁定 source/target 语义；验证方式是停止编码、进行 Rust/Node owner 联合评审，记录兼容/回滚/测试证据，更新 Allowed/Forbidden/Conditional 后重新执行 `lock-scope`。
  - 产品入口、DB、Stage 5、`terminalGateway`、IPC、Android、routes 或 public：原因是需要真正接入产品运行链；影响文件必须逐一列出对应入口和测试；风险是改变现有实时权威、持久化或用户可见 API；验证方式是另立或 supersede 为独立任务，完成 review/current-task、联合契约评审、专项回归和新的 scope lock，本任务不得直接放行。
  - Node 同目录新增模块：原因是现有 Allowed Files 无法保持清晰职责；影响文件写出精确路径；风险是扩大 coordinator/import/store 变更面或引入未审查入口；验证方式是先在 plan/decompose 中点名职责和测试，再由新的 `lock-scope` 重新生成三类范围并执行 `node --check`/目标回归。
  - 新增持久化 fixture：原因是现有 fake analyzer 与临时目录不足以证明某个验收场景；影响文件写出精确 fixture 路径；风险是引入不可审查的固定数据、外部环境或敏感内容；验证方式是说明矩阵缺口、确认 fixture 不含用户数据且离线可复现，再重新 lock 并运行目标测试和敏感信息扫描。
  - `package.json`/`package-lock.json`：原因是确有 Node 测试入口或依赖缺口；影响文件为 package manifest/lockfile 及受影响测试；风险是改变依赖解析、离线可复现性或全局测试行为；验证方式是记录依赖必要性、版本、离线安装/运行证据、回滚方式，并重新执行 `lock-scope`。
  - 4.5 `docs/codex/**` 或 workflow 长期契约：原因是发现实现与已交付 Rust binary/现行契约的事实冲突，或形成新的稳定公共边界；影响文件逐一列出；风险是以 Node workaround 覆盖 Rust-first 决策或污染长期 source of truth；验证方式是停工、联合确认，分别使用 `sync-contracts`/`sync-decisions`，完成新的范围锁定后再实施。
  - 任何未列出的共享 API/schema/DTO/event、仓库外生产 caller 或 release/deploy 需求：原因、影响文件、风险和验证方式必须先记录；在完成 caller/传播影响审查、兼容策略、专项回归和新的 Allowed/Forbidden/Conditional 生成前，一律按禁止处理。
- Diff filter：
  - 后续 `review-diff`、`review-implementation`、`verify-contracts` 和回归只审查当前授权文件与已重新放行的 Conditional Files。
  - 任意 `native/**`、`src/source/**`、`src/ws/terminalGateway.js`、`src/services/codexIpc*`、`android/**`、`public/**`、产品 history/DB/Stage 5 或未授权测试路径出现 diff，按至少 `major` 范围越界处理；若同时破坏锁定契约或已确认决策，按 `critical` 处理。
  - workflow 文档只能由对应 skill 写入；实现步骤不得把 CURRENT_TASK 当作覆盖 CONTRACTS/DECISIONS 的方式。
- Change Propagation Check：triggered and recorded in `## 传播治理记录`。当前直接影响集合仅为 Node collector exports、isolated process/import/store、目标 Node tests/fake analyzer 与 Rust target process boundary；仓库内未发现其他生产 caller，未命中 Sessions/Workspace/IPC/Android/`terminalGateway`/DB critical path。
- Decision drift guard：不得因 Node 旧实现而修改 Rust、source 或共享契约；不得重新引入 `replay`/`source_spec`/discovery/date range/active hint、额外 analyze mode、Node 侧 identity hash、产品 `source_epoch`/revision/tombstone 或第二条采集链。

## Scope widening result（2026-08-31）

- Widening reason：
  - RI-4.5-008-001 的重复 batch 场景已经证明：fake analyzer 在同一 stdout burst 中发送有效 batch、duplicate batch 和 complete 时，生产 process manager 的异步 callback 可能在 duplicate ACK 发出前完成 complete settlement；只调整 fake 的时序会掩盖 Node consumer 的真实收口问题，因此需要重新开放 process manager。
  - RI-4.5-008-002 的 delayed-begin probe 已证明：deadline 只结束调用方等待，不能取消迟到的 runStore.begin()；当前 coordinator/store 组合可能在调用方已收到 timeout 后留下 status=running，因此需要重新开放 coordinator 与 run store 的最小生命周期修复面。
  - 两项修复都仍属于本任务已锁定的隔离 Node collector process/import/store 边界；不是 Rust、source、产品入口或共享长期契约变更。
- Impact files：
  - src/services/codexRolloutCollector/analyzerProcessManager.js：仅处理同一 request 的 inbound batch callback/ACK drain 与 complete barrier；保留单飞、generation、typed error 和 ACK-before-complete 语义。
  - src/services/codexRolloutCollector/index.js：仅补齐 deadline 后迟到 begin 的 coordinator 生命周期收口和补偿调用；不改变产品入口或外部 API。
  - src/services/codexRolloutCollector/analysisRunStore.js：仅提供 begin 的失效/补偿终态所需的 run identity 和持久化保护；不扩展为产品 DB/Stage 5 schema。
  - tests/codexRolloutCollector.test.js、tests/fixtures/codex-rollout-collector/fake-analyzer.js：这两个文件本来就在步骤 8 Allowed Files 内，继续用于 deterministic duplicate ACK、delayed begin、cancel/timeout 和重启回归。
  - 本次没有新增文件，也没有把 analysisCheckpointStore.js、Rust/native、src/source/**、IPC、Android、DB、契约或决策文档加入当前回补范围。
- Risk：
  - process manager 的收口顺序变化可能影响 ACK、complete、旧 generation 丢弃和 single-flight；任何 valid duplicate 都必须得到正 ACK，complete 只能在已接收 batch callback 收口后结算。
  - coordinator/run store 的迟到 begin 保护可能影响 run status、retry 和重启恢复；必须保证 deadline 后不留下可恢复的孤立 running，且正常 begin、失败 begin、取消竞态和已有 terminal identity 兼容。
  - 所有修复必须保持现有 exports、Rust target wire、opaque delivery identity 和 Node collector 隔离边界，不得借机恢复 replay/source_spec 或引入第二条采集链。
- Verification：
  - 对当前回补 Allowed Files 执行 node --check、git diff --check 和 Allowed/Forbidden path scan。
  - 重复运行 duplicate/stale fault-matrix，断言每个 valid duplicate 的 accepted=true,persisted=true ACK 都先于 complete；覆盖 ACK 乱序、receipt/range index 幂等和旧 generation guard。
  - 对 Memory/File run store 注入 delayed begin，分别覆盖 timeout、取消、begin 成功和 begin 失败；断言调用方按 deadline 返回稳定 timeout，迟到 begin 不留下可恢复 running，补偿结果可在重启后保持一致。
  - 完成 target focused tests、适用 Rust binary smoke、review-diff、review-implementation、verify-contracts 和 diff-aware run-regression；本次不新增 release、canary 或产品集成验证。
- Re-generated scope：
  - 当前回补 Allowed Files：analyzerProcessManager.js、index.js、analysisRunStore.js、目标 Node 测试和 fake analyzer、CURRENT_TASK.md。
  - 当前回补 Conditional Files：新增 Node 模块、额外持久化 fixture、package.json/package-lock.json、4.5 文档、CONTRACTS/DECISIONS/STATUS/LESSONS、产品入口和其他共享路径，均未放行。
  - 当前回补 Forbidden Files：native/codex-rollout-collector/**（含 src/source/**、vendor、Demo/Spike）、terminalGateway、Codex IPC、Android、public、routes、history/DB/Stage 5、未列测试、外部 Codex 数据目录及所有未明确放行路径，保持禁止。
- Handoff：scope 已锁定，分类已完成；按用户指示跳过重复的 plan-implementation，直接进入当前步骤的 implement-current-step 回补，不扩大已锁定范围。

## 受影响的契约

- `docs/workflow/CONTRACTS.md`：`4.5 Rust analyzer target-side startup/process interface（隔离内部）` 是 Node 消费端必须遵守的上游边界；本任务不改变该契约。
- 4.5 startup contract：`--startup-config-version 1 --sessions-root <absolute normalized path>` 是进程启动边界；`sessions_root` 不下沉为 analyze 字段。
- 4.5 wire contract：Node-first hello、公共消息七类型、公共 `protocol_version/message_type/request_id`、三种 mode、batch/ACK/complete 门禁、typed resource/cancel/error 语义。
- 4.5 data contract：`job_id`、`request_id`、`conversation_id`、validated source scope、snapshot/checkpoint、cursor、lineage/provenance、completeness 和 mutations 的一致性校验。
- AD-018：外部 app-server 管理 rollout，单 conversation 只有一条 Node→Rust 采集链和一个 in-flight request；不建立产品级多 writer/replacement fence。
- AD-019：恢复使用同一普通 mode 的新 request；不增加全量/恢复 mode 或 Rust 进程内恢复状态。
- AD-021：`discovery`、fingerprint gate、`retention_profile` 和泛化 revision 不是 4.5 公共 Node↔Rust 业务字段；formal legacy 字段不得被 Node 重新赋予语义。
- AD-022：Rust 契约先行、Node 独立适配；出现跨模块冲突时联合评审，不单方面修改 Rust、source 或共享文档。
- 不受影响的冻结契约：Sessions/Workspace API、Codex IPC 实时同步核心、Android/`public`、既有 product DB 和 legacy no-arg runtime。

## 已确认决策

- Rust 4.5 target 已先行完成，Node 现在依据已同步的 startup/wire/data/coordinator 文档实施；不因旧 Node 现状反向修改 Rust。
- Node 的启动边界传 `sessions_root`，analyze 只传 conversation、读取意图、恢复状态和 resource limits；Node 不传 path、discovery、catalog、日期范围或 active hint。
- 公共 analyze mode 只有 `preview`、`backfill`、`append`；重启/ACK 丢失/checkpoint 不可用时，用新的 `request_id` 重发普通读取请求。
- `segment_id`/`batch_id` 是 Rust 根据完整 validated source scope 生成的 opaque deterministic identity；Node 必须保存、验证关联并复用，不能简易字符串拼接或机械复制 Alpha 的 `identity.rs`。
- Node 侧单例协调、一个 active request、有限重试、ACK 前置持久化和 late generation 隔离优先于“尽量继续处理”；证据不足时 fail-closed。
- 4.5 Node 目录只属于隔离 process/import/store artifact；不自动接入 `terminalGateway`、IPC authority、Android、既有 server routes 或产品 DB。
- `replay` 不再作为 target analyze mode；REJECTED-002 仅说明无行为的嵌套 unknown metadata 不递归解释，不授权重新引入 replay/full/recovery 语义。
- `DEFER-002`/`RD-4.5-006-001` 的 candidate pre-I/O source boundary 与 formal source hash interruptibility 保持 deferred，不由本任务触碰 `native/codex-rollout-collector/src/source/**`。
- 决策分类已由 `classify-decisions` 完成，详见下方 `## 决策分类`；本次 scope widening 的回补决策已补充为 M09～M11/U10～U11；无阻塞性的 Taste 或待用户重新确认的 User challenge。

## 决策分类

### Mechanical

- M01：按已锁定的 4.5 startup/wire contract 构造 target-only request 与 message normalizer；启动参数、Node-first hello、七类消息、三种 analyze mode 和必需字段校验按契约逐项实现。
- M02：`sessions_root` 只从既有 `CODEX_HOME` 规则解析为绝对规范化路径并作为启动参数传递；analyze 请求不携带 source path、discovery、catalog、date range 或 active hint。
- M03：按 process generation 建立 hello capability gate、single-flight、running/pending intent、cancel、deadline、stale-message 丢弃和固定有限重启；每次重试保留 job/scope/checkpoint/opaque delivery identity 并生成新的 `request_id`。
- M04：`segment_id`/`batch_id` 只保存、关联和重用 Rust 返回的 opaque 值；Node 不重算 Alpha hash，不以 path、文件名、读取顺序、segment boundary 或 content hash 推导 identity。
- M05：按“batch evidence 校验 → staging/receipt 持久化 → 正 ACK → complete/checkpoint 校验”的顺序实现 importer/store；duplicate/overlap 幂等，内容冲突、证据不足、partial 降级和 cursor/scope 不一致 fail-closed。
- M06：错误映射使用协议 code/type 及稳定 retryable 语义，区分 resource limit、timeout、cancel、source/lineage、协议和进程错误；禁止 blanket `analysis_failed`。
- M07：保留现有 Node collector exports 和隔离 store 调用面；旧私有 wire 的迁移、fake analyzer 故障注入、target Node tests、Rust binary smoke、`node --check`、scope scan 和 `git diff --check` 按步骤完成。
- M08：是否需要同目录新增拆分模块、持久化 fixture 或测试入口依赖，依据职责清晰度和测试证据在 `plan-implementation`/`decompose-task` 中确定；若超出现有锁定列表，按 Conditional Files 重新 `lock-scope`，不凭偏好扩围。
- M09：RI-4.5-008-001 按既有 ACK/complete contract 处理；同一 request 已接收的每个 valid duplicate batch 都必须完成 importer callback 并发送 `accepted=true,persisted=true` 正 ACK，complete 只能在这些 inbound batch callback 收口后结算。具体采用 callback drain、串行队列或等价 barrier，由当前 `implement-current-step` 选择最小等价实现，不得通过放宽断言或仅延迟 fake 来规避。
- M10：RI-4.5-008-002 按既有 deadline/run lifecycle contract 处理；迟到的 `runStore.begin()` 必须具备 deadline-aware invalidation，若底层操作不可取消则执行补偿性终态写入，不能留下可恢复的孤立 `running`。具体 guard/compensation 组织方式由当前 `implement-current-step` 选择，不得改变产品 API 或引入新的产品状态语义。
- M11：本次回补只使用已重新开放的 `analyzerProcessManager.js`、`index.js`、`analysisRunStore.js` 及步骤 8 原已允许的目标测试/fake；不新增模块、依赖、fixture 或跨边界文件。

### Taste

- 当前无阻塞性的口味决策，也没有 UI、页面、视觉或交互选择。
- 私有 helper 的命名、函数排列和测试组织方式属于实现风格，只要不改变已锁定的 wire/state/store 语义，可在实现中按可读性选择；不得借“风格”改变 scope、兼容策略或错误语义。
- 模块拆分、fixture 形态和依赖引入不能被当作纯口味问题：它们会影响范围、可回滚性和测试证据，必须遵守 M08 的证据与重新 lock 门禁。

### User challenge

- U01（已确认）：Rust 契约先行、Node 后续独立适配；不得因旧 Node 实现直接修改 Rust target、`native/codex-rollout-collector/src/source/**` 或共享契约。
- U02（已确认）：公共 analyze mode 只有 `preview`、`backfill`、`append`；不得重新引入 `replay`、full/recovery mode 或把嵌套 unknown `replay` 解释为业务语义。
- U03（已确认）：Node 只在 startup 传 `sessions_root`；不得把 source locating/discovery/catalog/date range/active hint 或 Rust 内部 source 字段下沉到 analyze 请求。
- U04（已确认）：单 conversation 只有一条 Node→Rust 采集链和一个 in-flight request；ACK 丢失/重启使用同一普通 mode 的新 `request_id`，不引入 Rust 进程内恢复状态、第二采集链或产品级 writer fence。
- U05（已确认）：Rust 生成的 `segment_id`/`batch_id` 是 opaque identity；Node 不机械复制 Alpha `identity.rs`，不简化或自行重算 identity 算法。
- U06（已确认）：batch 只有在校验通过且 staging/receipt 持久化成功后才可发送 `accepted=true,persisted=true`；complete/checkpoint 证据不足时必须拒绝，partial/provisional/unknown 不得覆盖 canonical。
- U07（已确认）：本任务保持 `codexRolloutCollector` 隔离，不接入产品 DB/Stage 5、`terminalGateway`、IPC、Android、routes、public 或 HTTP history，也不改变 Sessions/Workspace 和 legacy no-arg Rust runtime。
- U08（已确认）：不得以静默双协议、legacy fallback 或普通成功响应掩盖旧 wire 与 4.5 target 的迁移失败；现有模块 exports/store 入口保持可用，但旧 `replay`/`source_spec` 不再作为 target 公共语义。
- U09（已确认）：`DEFER-002`/`RD-4.5-006-001` 的 source candidate pre-I/O boundary 和 formal source hash interruptibility 仍由独立 source owner/联合评审承接；Node 不得用 workaround 宣称已修复。
- U10（沿用并在本次回补中再次确认）：不得以 fake analyzer 延迟、降低 duplicate ACK 断言或忽略迟到 callback 的方式掩盖 RI-4.5-008-001；必须保留 valid duplicate 的正 ACK 和 complete 前收口语义。
- U11（沿用并在本次回补中再次确认）：不得因 RI-4.5-008-002 修改 Rust/source、公共契约、产品 DB/Stage 5 或产品入口；只能在隔离 Node coordinator/run-store 生命周期内消除 late-begin orphan。

### 待确认分类项

  - Taste：无；callback drain 与 late-begin compensation 的具体内部组织属于实现方案，不是产品口味选择。
  - User challenge：无新增待确认项。若实现发现 Rust 文档与实际 binary 冲突、需要共享契约/产品入口，或任何范围外变更，必须停止并按 `lock-scope`/联合评审上浮，不在本分类中自动裁决。

## 待确认问题

- 无阻塞性用户问题。当前按“先完成隔离 Node consumer/coordinator，再另立产品 DB/服务入口集成任务”的边界执行；若用户希望本任务直接改 `terminalGateway` 或产品持久化，必须重新建任务并执行 scope widening。
- caller inventory 已完成：仓库内没有发现其他生产调用方；实现需保留现有模块 exports 的可用入口，仓库外 caller 不被隐式推断为兼容目标。
- 如实现发现 4.5 Rust 文档与实际 Rust binary 不一致，先停止编码，记录冲突，走 Rust/Node 联合评审和 `sync-contracts`/`sync-decisions`，不在 Node 侧私自兼容两套公共语义。

## 实现方案

### Implementation Plan

- Goal：将现有 Node `codexRolloutCollector` 从阶段 4 的旧 consumer 迁移为可消费 Rust 4.5 target 的隔离 coordinator/process/import/store 实现；完成一次可审计的 `hello → analyze → batch → ACK → complete` 生命周期，并保持产品实时同步、既有 server API 和 legacy no-arg Rust runtime 不变。
- Architecture impact：变更仅发生在已锁定的 `src/services/codexRolloutCollector/**`、目标 Node 测试和 fake analyzer；Rust source/target、`terminalGateway`、Codex IPC、Android、routes、public、产品 DB/Stage 5 和 vendor 均不变。Node 继续只负责启动与协调、协议消费、批次暂存/回执和隔离 checkpoint/run 状态；Rust 继续负责 `sessions_root` 内部的 source/lineage locating、读取、解析、归约和 target batch 生成。
- 文件职责映射：
  - `analyzerProtocol.js`：定义 target-only 七类 JSONL 消息的解析、必需字段/关联字段校验、编码和协议错误；移除 target request 对 `replay`/`source_spec`/泛化 revision 的业务依赖，未知 additive 字段按契约处理。
  - `analyzerProcessManager.js`：负责 `sessions_root` 启动参数、Rust 子进程 generation、Node-first hello、能力门禁、stdout JSONL 分发、单飞槽位、取消/截止时间后的进程终止和有限重启；不在 analyze payload 重复传 source path 或 discovery 参数。
  - `analyzerRequestTracker.js`：把 `request_id` 绑定到 attempt/generation，管理 hello/analyze/complete 的计时、settlement 和取消竞态；请求尚未真正终止前不得释放单飞槽位。
  - `index.js`：保留现有 collector 外部入口，协调每 conversation 的 running/pending intent、全局单一 active request、重试时的新 `request_id`、旧 generation 丢弃和 run 状态转换；不把 coordinator 扩展到产品入口。
  - `analysisBatchImporter.js`：按 target batch 外层 identity、source scope、cursor、provenance、lineage、completeness 和 mutation evidence 校验后写入隔离 staging/receipt；以显式 source range/progress/next cursor 组装，不以到达顺序或 Node 自算 ID 组装。
  - `analysisCheckpointStore.js`：保存并校验 request/job/conversation/source scope、segment/range、cursor、projection watermark、reducer state 和 completeness 的一致性；区分 partial/provisional 与 canonical，禁止降级和跨 request 污染。
  - `analysisRunStore.js`：记录 job、attempt、request、generation、运行结果、错误 code/retryable、receipt/checkpoint 进度和重试证据；保持现有隔离文件/内存 store 的可用调用面。
  - `tests/codexRolloutCollector.test.js` 与 fake analyzer：提供 target contract fixture、真实 JSONL 子进程行为和可控故障注入；fake 只证明 Node 协调/导入行为，Rust binary smoke 单独记录真实跨进程证据。
- Technical approach：
  - 请求只由 Node 组装 `protocol_version`、`message_type=analyze`、`request_id`、Node 分配的 `job_id`、显式 `conversation_id`、三种公共 `mode` 以及契约允许的 cursor/anchor/recovery/range/resource limits。`sessions_root` 固定从既有 `CODEX_HOME` 规则解析成绝对规范化路径，仅出现在启动参数 `--startup-config-version 1 --sessions-root ...`。
  - 每个 process generation 先发送 `hello(role=node)`；只有匹配 request id、`role=analyzer` 且具备 `analyze_v1`、`cancel`、`checkpoint`、`ack` 最低能力的 hello 才打开 analyze 门。hello 超时、角色/能力不符或协议版本不符均为明确失败，不静默降级到旧 wire。
  - 以“conversation intent → process attempt → protocol message”三层区分调度身份：同一重试保留 `job_id`、conversation/source scope、checkpoint 和已有的 `segment_id`/`batch_id` recovery pair，每次 attempt 生成新的 `request_id`；同一 Node 实例保持一条 Rust 进程链和一个 in-flight 请求，同一 conversation 只保留一个 running intent 与一个 pending intent。
  - `segment_id`/`batch_id` 仅作为 Rust 返回的 opaque identity 保存、关联、校验和重用；Node 不复制 Alpha `identity.rs`，不使用 path、文件名、读取顺序、segment boundary、content hash 或简易字符串拼接推导 ID。首次读取无 recovery pair 时不伪造 ID；ACK 丢失/重启/ checkpoint 不可用时，按同一普通 mode 用新的 request id 重发，并在证据存在时携带成对 recovery identity。
  - 批次处理保持严格门禁：解析并校验 batch → 检查 scope/identity/cursor/coverage/provenance/completeness 和重复冲突 → 原子写隔离 staging/receipt → 发送 `accepted=true,persisted=true` → 仅在匹配 ACK 后允许 Rust complete → 校验 complete/checkpoint 与已收 receipt 的一致性 → 提交 canonical/partial 状态和 run 结果。重复/overlap 只产生幂等正结果，内容或 scope 冲突 fail-closed。
  - 错误按协议 code/type 保留 resource limit、resource timeout、cancel、source/lineage fail-closed、协议错误和进程异常的 retryable 语义；不得用错误字符串或 blanket `analysis_failed` 覆盖可重试边界。取消、超时和进程退出时，必须先确认 worker/进程已终止，再允许新 generation 占用 active 槽位。
  - 默认使用现有允许文件完成职责收敛，不新增同目录生产模块或 package 依赖；只有实现/测试证明现有文件无法保持职责边界时，才以具体路径和证据走 Conditional Files 重新 `lock-scope`。本计划不创建 `TECHNICAL_DETAILS-*.md`，因为当前 Allowed Files 未明确允许具体补充文档路径。
- Data / state flow：Node caller 提交显式 conversation 与读取意图 → coordinator 分配稳定 job/scope 并从 store 恢复 checkpoint/receipt → process manager 启动指定 generation 并传 `sessions_root` → Node-first hello/capability gate → 发送一次 target analyze attempt → 接收并校验一个或多个 batch → durable staging/receipt → 对每个 batch 发送正 ACK → Rust 发送 complete → Node 校验 completeness、scope、checkpoint 和 receipt 集合 → 提交 isolated run/checkpoint。失败、取消、超时或 ACK 丢失时只保留可证明的 receipt/checkpoint，生成新 request id 重试；旧 generation 的 batch/complete/error 永不写入当前 intent。
- Alternatives and tradeoffs：
  - 让 Rust 兼容旧 Node 的 `replay/source_spec`：拒绝；违反 AD-022 的 Rust-first 边界，也会把 source locating 重新下沉到 Node/Rust 公共 wire。
  - 长期双协议、静默 fallback 或按失败自动切回旧 analyzer：拒绝；会掩盖 target 迁移失败并产生两套恢复/ACK 语义。
  - 在 Node 重算 Alpha 的七元组 hash 或简化 delivery ID：拒绝；Rust 是 identity source of truth，Node 只能消费 opaque identity。
  - 把 source discovery、候选筛选、日期范围或 path 作为 analyze 参数：拒绝；破坏 `sessions_root` 启动边界，并与 source owner 的 deferred 风险混淆。
  - 直接接入 `terminalGateway`、IPC、Android、产品 DB 或 Stage 5：拒绝；这些是独立产品集成任务，不属于当前隔离 consumer 迁移。
  - 为“代码更整洁”提前新增拆分模块或第三方依赖：暂不采用；先使用已锁定文件和现有 Node/Rust wrapper，必要时带证据重新锁定范围。
- Compatibility：保留现有 collector、manager、tracker、importer、checkpoint/run store 的命名 exports 和隔离调用入口；但兼容入口必须产出 target 语义或返回明确 migration-required/fail-closed 结果，不能继续发送旧 `replay/source_spec`。旧持久化字段（如 fingerprint/prefix/revision）若必须读取，只能作为 opaque compatibility metadata，不能重新作为公共 gate、排序依据或 replacement 语义；无法证明 target scope/checkpoint 一致时保留原证据并拒绝覆盖。`ensureReplayLineageRecovery` 等旧 helper 如保留符号，也不得重新发起 replay/full/recovery mode。仓库外 caller 不作为隐式兼容目标，产品实时同步和 API 行为不因本任务改变。
- Risks and rollback：主要风险包括 target wire/实际 binary 不一致、旧 helper 隐式依赖、hello 能力门禁遗漏、cancel/timeout 后槽位过早释放、stale generation 写入、ACK 早于 receipt、duplicate/overlap 造成重复派生、partial 覆盖 canonical、checkpoint 跨 job/scope 污染以及 Windows 启动路径不一致。若文档与 Rust binary 冲突，立即停止实现并走 Rust/Node 联合评审，不在 Node 侧维护第二套语义。回滚以 `7a167711950710b05f3e84c8d3ad975df1c6ab0c` 为基线，使用 path-scoped revert/撤销本任务允许路径的变更；不使用 broad reset/clean，不回滚任务外用户工作。
- Validation strategy：
  - 静态门禁：对所有允许修改的 JS/fixture 执行 `node --check`，运行 `git diff --check`、Allowed/Forbidden path scan，并确认没有 Rust/source、IPC、Android、DB、`terminalGateway` 或 public diff。
  - 目标 Node 证据：执行 `node --test tests/codexRolloutCollector.test.js`，覆盖三种 mode、startup `sessions_root`、hello request id/capability、旧字段拒绝/不发送、job/request/segment/batch identity 关系、retry reuse、single-flight/pending、cancel/timeout/stale generation、有限重启和 typed error mapping。
  - 导入/恢复证据：覆盖多 batch range/index、duplicate/overlap/conflict、ACK-before-persist 拒绝、跨 request/job/scope complete、partial→canonical、canonical 不降级、checkpoint 恢复及 receipt 幂等；测试不得只断言 fake 的字符串输出，必须断言状态和拒绝原因。
  - 真实进程证据：使用仓库已有 Rust target binary/build 入口完成至少一条真实 Node→Rust hello/analyze/batch/ACK/complete smoke；其余难以稳定注入的故障路径由 fake analyzer 覆盖，并明确区分 fake-only 与 Rust binary 证据。适用的 Rust target/native regression 作为上游依赖验证，不能把 Rust source deferred 风险标为已解决。
  - 流程门禁：随后执行 `review-diff`、`review-implementation`、`verify-contracts` 和 `run-regression`；按 TD-004 使用 confirmed narrow Node gate 处理既有 full-suite hanging surface，不将无关 hanging 误归因于本任务；无 browser-backed evidence 或 release/canary evidence 需求。
- External Documentation Gate：no-op。方案只使用仓库已锁定的 Rust 4.5 文档/本地 binary contract、项目已有 Node `child_process`/文件 store wrapper 和现有测试命令，不引入或选择第三方 library、framework、SDK、API、cloud service 或新的 CLI current behavior；若实施中需要新增依赖、改变命令入口或依赖外部版本行为，必须停止并重新取证、评估和 lock-scope。
- Open decisions：没有阻塞性的 Taste 或待用户确认的 User challenge。已按现有导出/测试事实将 mechanical 收敛项固定为：默认不新增同目录生产模块或 package 依赖；旧 helper 若保留命名 export，只提供 target-safe 的显式迁移边界，不重新发起 replay/full/recovery；真实 Rust smoke 优先使用 `native/codex-rollout-collector/target/debug/codex-rollout-collector.exe`，缺失时按仓库已有 Cargo manifest/build 入口生成，不修改 Rust 源码。若实施发现这些选择要求新增未锁定文件、改变公共契约或接入产品路径，立即回到 `lock-scope`，不在实现中自行扩大范围。
- Handoff：`implement-current-step`（从步骤 1 开始）。

## 审查问题队列

- 当前来源：新任务创建前的旧 Node collector 代码检索、Rust 4.5 已交付契约、AD-018～AD-022、既有阶段 4 归档证据，以及 2026-08-28 步骤 1 的 `review-diff`、`verify-contracts`。
- Finding ID：ND-4.5-001
  - Severity：P1
  - Source：旧 Node protocol/request tests
  - Status：resolved/current_task_owned
  - File / symbol：`analyzerProtocol.js`、`analyzerProcessManager.js`、`tests/codexRolloutCollector.test.js`
  - Failure scenario：旧 `replay`/`source_spec` request 进入 Rust 4.5 target，或 target-required startup/hello 字段缺失。
  - Minimal fix direction：建立 target-only normalizer 和启动/握手门禁，迁移 fake analyzer/test fixture。
  - Required test：三种 mode、无旧字段、hello request_id echo、unsupported capability 拒绝。
  - Resolution：步骤 1 已在 target protocol 入口拒绝旧 `replay`/`source_spec`/path/discovery/revision` request 字段并覆盖三种 mode；步骤 2 的 process manager 现在按合并后的 `CODEX_HOME` 解析并传入固定 startup 参数，执行 Node-first hello，并对 protocol version、request id、role、必需 capability 和 hello timeout 进行 fail-closed 校验；握手通过前不会发送 analyze。
  - Verification：fake analyzer 记录 startup argv、hello 顺序和 request id echo，并覆盖 request id 不匹配、角色错误、协议版本错误、缺少 capability 与 hello timeout；target focused tests `18/18` 通过，collector 全量当前为 `21/47` 通过、`26` 失败，后者仍属于步骤 3～7 的已知迁移缺口。
  - Handoff：review-diff。
- Finding ID：ND-4.5-002
  - Severity：P1
  - Source：coordinator/process lifecycle contract
  - Status：verification-pending/current_task_owned
  - File / symbol：`analyzerProcessManager.js`、`analyzerRequestTracker.js`、`index.js`
  - Failure scenario：timeout/cancel/进程重启后旧 generation 的 batch/complete 继续写入，或同 conversation 并发请求越过单飞边界。
  - Minimal fix direction：按 process generation、request attempt、conversation intent 建立显式状态和有限重试。
  - Required test：cancel/timeout race、stale stdout、single-flight、pending replacement、有限重启。
  - Step 3 resolution：仅完成当前步骤允许的 tracker portion；`request_id` 现在绑定可选的 generation/attempt，phase timer 覆盖 hello/analyze/complete，settlement 与 cancel/timeout 状态分离，未终止 attempt 保持占用并拒绝 stale scope callback。coordinator/process manager/index 的接线仍留给步骤 4，因此本 finding 保持 open。
  - Step 3 verification：target request tracker focused tests `4/4` 通过；覆盖 phase timeout 切换、重复 settlement、cancel/timeout race、错误 code/retryable、旧 generation/attempt callback、timer cleanup 和 termination wait。未修改步骤 4 文件。
  - Handoff：implement-current-step。
- Finding ID：ND-4.5-003
  - Severity：P1
  - Source：batch/checkpoint contract and existing importer
  - Status：resolved/current_task_owned
  - File / symbol：`analysisBatchImporter.js`、`analysisCheckpointStore.js`、`analysisRunStore.js`
  - Failure scenario：ACK 先于 staging、空 complete 被提交、partial 覆盖 canonical、重复 batch 造成重复派生数据或 checkpoint 回退。
  - Minimal fix direction：按 batch evidence、receipt、checkpoint 和 completeness gate 重排导入顺序，保持 idempotence/conflict rejection。
  - Required test：duplicate/overlap/conflict、partial→canonical、empty/cross-request complete、checkpoint recovery。
  - Step 6 resolution：target batch 的外层 identity、scope、cursor/provenance/lineage/completeness/mutation 校验和 staging/receipt/幂等导入已完成；步骤 7 将 ACK/complete transaction 与 checkpoint/run terminal identity 接通，正 ACK 仅在 receipt 成功后发送，负 ACK 使用稳定 rejection code 并等待 Rust `batch_rejected` 终态。
  - Step 7 resolution：`index.js` 现在按 `analyze → import/stage → run ack_pending → accepted=true,persisted=true ACK → complete/checkpoint commit → run complete` 结算；complete 必须匹配当前 request/job/scope/receipt/checkpoint，partial 不降级 canonical，重复 delivery 保持幂等。负 ACK 在 Rust 终态前保持 active slot，`staging_unavailable` 在预算内复用同一 job 与 recovery delivery 重试。
  - Verification：新增 target transaction focused tests `6/6` PASS，覆盖 ACK 顺序、负 ACK 终态前单飞、staging 重试的同 job/recovery pair、complete checkpoint 结算和 run receipt 进度；允许 Node/fixture 文件 `node --check` 和 `git diff --check` 已通过。该条中的早期 receipt 回退问题已由后续 verification repair 修复并完成复核。
  - Verification update（修复前探针记录）：`analysisBatchImporter.js` 的 `commitComplete`/`assertCompleteCommit` 对 receipt 使用“匹配数量大于零”门禁；只读 Memory probe 先导入 `batch-first`、`batch-second`，再提交指向 `batch-first` 的 schema-valid checkpoint，结果仍为 `accepted=true`。这允许旧 delivery watermark 通过 complete，可能造成 checkpoint 回退或恢复重复导入；该问题已由后续 verification repair 修复。
  - Review mode：verification
  - Review epoch：`20260828-001/step-7`
  - Fingerprint：`rfp-v1|acceptance=target-transaction|owner=node-collector-importer|resource=complete-checkpoint-watermark|transition=accepted-batch-to-complete|failure=stale-delivery-watermark-is-accepted`
  - Fingerprint components：acceptance=`target-transaction`；owner=`node-collector-importer`；resource=`complete-checkpoint-watermark`；transition=`accepted-batch-to-complete`；failure=`stale-delivery-watermark-is-accepted`
  - Caused by：none（修复后的 verification 已收口；不是 direct regression）
  - Blocking：false
  - Scope ownership：resolved/current-step
  - Provenance：unknown；当前没有中间 checkpoint，不能把该缺口归因到某一轮具体 patch。
  - Evidence kind：runtime_reproduction
  - Evidence basis：当前 diff、`analysisBatchImporter.js` 的 complete/receipt 静态路径和只读 Memory probe；未使用外部数据，repair base 不可唯一确定。
  - Repair base：unknown
  - Repair attempts：2（本轮完成第二次 verification repair；达到默认上限，后续若验证失败必须转 investigate-root-cause）
  - Admission：admitted（accepted_finding_resolved，原 `ND-4.5-003` 已收口）
  - Migration source：legacy-finding
  - Recommended route：`current_task_owned`（已收口，转 `sync-status`）
  - Ownership assessment：这是当前 active Node 4.5 任务步骤 7 的 complete/checkpoint transaction mechanical finding；最小修复限定在步骤 7 Allowed Files 的 importer/coordinator 与目标测试，不需要扩大范围、修改 Rust/source、共享契约或产品入口。
  - Ownership evidence：live `CURRENT_TASK.md` 的步骤 7 明确要求 complete 与当前 request/scope/receipt/checkpoint 一致，且 Allowed Files 包含 `analysisBatchImporter.js`、`analysisCheckpointStore.js`、`analysisRunStore.js`、`index.js` 和目标测试；`review-implementation` 给出了 receipt 回退的直接复现；已读取 `TASKS/paused/**`，只有 IPC/Owner 任务且无匹配 Node collector owner，`TASKS/interrupted/**` 不存在。
  - Minimal fix direction：按 request/delivery 记录最后一次 `accepted=true,persisted=true` 正 ACK 的 exact delivery tuple；complete/checkpoint 提交必须与该 tuple 的 `job_id`、`segment_id`、`batch_id` 及当前 source scope 一致，不能仅凭任意同 request receipt 通过；保持重复正 ACK 的幂等语义。
  - Required test：同一 request 交付至少两个 batch，checkpoint 分别指向最后一次正 ACK和较早 delivery；较早 watermark 必须 fail-closed，最后一次 watermark 才能 complete；同时覆盖 Memory/File、重复 ACK、跨 job/scope 和恢复重试。
  - Resolution update：process manager 在每个 batch 正 ACK 成功写出后记录当前 request 的 exact delivery（含 job/segment/batch 与 source scope），complete callback 只接收该最后一次正 ACK 证据；Memory/File importer store 新增并持久化 `last_delivery`，complete watermark 必须与该最新 delivery 及当前 scope 完全一致，旧 delivery 即使属于同一 request 也拒绝。
  - Verification update：新增同一 request 两个 batch 的 Memory/File 回归：指向 `batch-watermark-1` 的旧 checkpoint 返回 `ANALYSIS_COMPLETE_DELIVERY_MISMATCH`，指向最后 delivery 且携带 accepted delivery tuple 的 complete 成功；target/process/collector 相关 selection `58/58` PASS，允许文件 `node --check`、`git diff --check` 通过。后续 `review-diff`、`review-implementation`、`verify-contracts` 与 required-now regression 均通过。
  - Final status：已收口为 `resolved/current_task_owned`；完整 collector 中剩余失败均已按 deferred 或 future-step expected gap 分类，不构成该 finding 的当前步骤阻塞。
  - Handoff：sync-status。
- Finding ID：ND-4.5-004
  - Severity：P2
  - Source：error/resource contract versus existing blanket handling
  - Status：resolved/current_task_owned
  - File / symbol：Node process/coordinator error mapping
  - Failure scenario：resource limit、timeout、cancel、source failure 被统一成 `analysis_failed`，导致 retryability 或用户可诊断性丢失。
  - Minimal fix direction：按 typed/protocol error code 映射，不按字符串猜测；保留有限重试和 terminal failure。
  - Required test：resource limit/timeout/cancel/source fail-closed/unsupported capability matrix。
  - Resolution：Node manager 保留 Rust error 的原始 `code`、`details`、`retryable` 和 `fatal`，不再把非 fatal typed error 统一改写成 `analysis_failed`；本步骤同时将本地 batch/import/staging 失败映射为 `batch_validation_failed`、`batch_scope_conflict` 或 `staging_unavailable`，并对 retryable staging rejection 保留有限重试语义。
  - Verification：新增 typed nonfatal resource-limit、negative ACK stable-code、staging rejection 和 fatal recovery focused tests；步骤 7 required-now target/process/collector selection `58/58` PASS，`review-diff`、`review-implementation`、`verify-contracts` 与 diff-aware regression 均通过。完整 resource/cancel/source 故障矩阵与真实 Rust smoke 仍属于步骤 8 future-gate，不阻塞步骤 7。
  - Handoff：sync-status。
- Finding ID：RI-4.5-002-001
  - Severity：P1
  - Source：`review-implementation`（2026-08-28；diff target `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）
  - Status：resolved/current_task_owned
  - File / symbol：`src/services/codexRolloutCollector/analyzerProcessManager.js:236-244` / `AnalyzerProcessManager.send`
  - Failure scenario：调用方在 `start()` 尚未完成、hello 尚未通过时，直接调用 `manager.send(analyzeMessage)`；或者在 hello 事件处理期间通过公开 `send()` 发送 analyze。
  - Why current implementation fails：`send()` 只检查 child/stdin 是否存在并直接调用 `encodeMessage`/`stdin.write`，没有检查当前 generation 的 handshake-ready 状态；`request()` 的 `await start()` 门禁不能约束公开低层发送入口，因此可能绕过 Node-first hello 边界。
  - Minimal fix direction：在 `AnalyzerProcessManager` 内增加当前 generation 的 handshake-complete/ready 状态；`send()` 对 `message_type=analyze` 仅允许当前 generation 已完成并通过 hello 后发送，未就绪时返回稳定的 typed error；保留 hello 内部发送和后续已授权消息路径，不引入 legacy fallback。
  - Required test：使用延迟 hello 的 fake analyzer，直接调用 `send(analyze)` 必须被拒绝且 fake 只收到 hello；补充 spawn 尚未触发和 hello 回调期间的边界测试，确认 analyze 不会写入 stdin，正常 `request()` 在握手后仍可发送。
  - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
  - Ownership assessment：这是当前 active Node 4.5 任务步骤 2 的 mechanical implementation finding；最小修复仅触及步骤 2 已允许的 process manager 与目标测试，不需要扩大范围、修改共享契约、改变产品行为或恢复暂停任务。
  - Ownership evidence：live `CURRENT_TASK.md` 明确步骤 2 Allowed Files 包含 `analyzerProcessManager.js` 与 `tests/codexRolloutCollector.test.js`；`review-implementation` 已在同一 diff target 给出具体定位和可触发场景；`TASKS/paused/**` 中未发现匹配 Node collector owner，`TASKS/interrupted/**` 不存在匹配包。
  - Resolution：增加当前 generation 的 `readyGeneration` 状态；`send()` 对 `message_type=analyze` 强制要求当前 generation 已通过 hello，否则返回 typed error `ANALYZER_HANDSHAKE_REQUIRED`；process failure、exit、stop 和新 generation 会清除 ready 状态，hello 内部发送与已授权的后续消息路径保持不变。
  - Verification：新增延迟 hello 下 spawn 后未就绪和 hello 消息校验阶段的直接 `send(analyze)` 拒绝用例，fake 收到的 outbound message 只有 hello；允许 JS/fixture `node --check` 全部通过，步骤 2 process/startup focused tests `8/8`、target focused tests `19/19` 通过；collector 全量 `22/48` 通过、`26` 失败，失败仍属于步骤 3～7 的已知迁移缺口；未修改 Rust/native/source、契约、决策或产品入口。
  - Handoff：review-diff。
- Finding ID：RD-4.5-001-001
  - Severity：P1
  - Source：`review-diff`（2026-08-28）
  - Status：resolved/current_task_owned
  - File / symbol：`src/services/codexRolloutCollector/analyzerProtocol.js:716-729` / `validateBatchLineage`
  - Failure scenario：canonical batch 只携带合法的非空 `history_base`，但缺少 `lineage_transitions` 和 `lineage_coverage` 时，lineage evidence 早退，Node 仍接受该 batch；实际复现输出为 `accepted history_base-only canonical batch`。
  - Minimal fix direction：将非空 `history_base` 纳入 `hasLineageEvidence` 触发条件，使其进入现有的 history base、transition、coverage 和 canonical completeness 联合校验；不改变 Rust/source 或公共契约。
  - Required test：增加 `history_base`-only canonical batch 必须拒绝的回归，并增加包含匹配 transition、complete coverage 的 canonical lineage 正向用例。
  - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
  - Ownership assessment：当前 active task 的步骤 1 target-only protocol validator 缺陷；最小修复仅触及已锁定的 `analyzerProtocol.js` 和对应目标测试，无需扩大 scope、修改契约或改变产品行为。
  - Ownership evidence：live `CURRENT_TASK.md` 步骤 1 允许 `analyzerProtocol.js`/`tests/codexRolloutCollector.test.js`；`review-diff` 已给出上述定位和复现；现有 paused 包仅为 IPC realtime sync 与 Owner control plane，无匹配 Node collector owner；`TASKS/interrupted/**` 不存在可匹配包。
  - Resolution：`validateBatchLineage` 现在将非空 `history_base` 纳入 lineage evidence 触发条件；补充 history_base-only canonical 拒绝和完整 lineage 正向测试。
   - Verification：`node --check` 两个允许 JS 文件通过；target protocol focused tests `7/7` 通过；未修改 Rust/source 或其他范围外文件。
   - Handoff：review-diff。
- Finding ID：RD-4.5-001-002
  - Severity：P1
  - Source：`verify-contracts`（2026-08-28）
  - Status：resolved/current_task_owned
  - File / symbol：`src/services/codexRolloutCollector/analyzerProtocol.js:476-532` / target batch field validators
  - Failure scenario：Node 接受 Rust target 不会接受的 batch：`AnalysisEvent` 的未知/不匹配 variant payload、缺少 `source_ref`/`availability` 的 diagnostic、缺少 `completeness`/`source_epoch` 的 tool detail，或任意 parser provenance compatibility profile；这些消息随后可能被导入或继续处理，破坏 target-only fail-closed 边界。
  - Minimal fix direction：按 Rust `TargetAnalysisBatch`/`AnalysisEvent`/`BatchDiagnostic`/`TargetToolDetail`/`ParserProvenance` 的现有模型补齐字段、枚举和 tagged variant 校验；不修改 Rust 契约或新增 Node 公共字段。
  - Required test：分别覆盖未知 event type/非法 variant、diagnostic 必填字段和 availability、tool detail 必填字段、非法 parser profile 的拒绝，以及对应合法 target fixture 的接受。
  - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
  - Ownership assessment：当前 active task 的步骤 1 target-only protocol validator 缺陷；最小修复只触及已锁定的 Node validator 和目标测试，不需要扩大 scope 或修改共享契约。
  - Ownership evidence：live `CURRENT_TASK.md` 步骤 1 允许 `analyzerProtocol.js`/`tests/codexRolloutCollector.test.js`；`verify-contracts` 已完成 Rust target data model 对照并给出上述定位；无匹配 paused/interrupted Node collector owner。
  - Resolution：补齐 Rust `AnalysisEvent` 的 tagged variant/metadata 校验、diagnostic 必填 evidence、tool completeness/source_epoch 和 batch parser compatibility profile 枚举边界；checkpoint 的兼容 profile 校验保持独立。
  - Verification：新增事件未知/缺字段、diagnostic、tool detail 和 parser profile 正反向用例；`node --check` 两个允许 JS 文件通过，target protocol focused tests `11/11` 通过。
  - Handoff：review-diff。
- Finding ID：RD-4.5-001-003
  - Severity：P1
  - Source：`verify-contracts`（2026-08-28）
  - Status：resolved/current_task_owned
  - File / symbol：`src/services/codexRolloutCollector/analyzerProtocol.js:759-779` / `validateBatchLineage`
  - Failure scenario：合法的多段 lineage（batch 的 `history_base` 只需与 active transition 匹配，其他 transition 保留各自历史边界）被 Node 拒绝，因为当前实现要求每个 transition 的 `history_base` 都等于 batch 的 `history_base`；Rust target 已实际产生 2～3 条 transition 的合法形态。
  - Minimal fix direction：将校验改为至少一个 transition 匹配 batch `history_base`，同时按 Rust 规则校验每条 transition 的 parent/history_base 关系；不要把多段 lineage 压成单一 active history base。
  - Required test：增加 2 条和 3 条 transition 的合法 lineage fixture，并覆盖 batch history base 未匹配、transition parent 不一致时的拒绝。
  - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
  - Ownership assessment：当前 active task 的步骤 1 lineage validator 与已交付 Rust target 映射不一致；修复限定在允许的 Node protocol/test 文件，不涉及 source discovery 或 Node 其他模块。
  - Ownership evidence：`verify-contracts` 对照 Rust `target_mapping`/`target_data` 及现有多-transition target tests 得出该复现；live scope 已允许对应 Node validator 和测试文件；无匹配 paused/interrupted owner。
  - Resolution：改为要求至少一个 transition 与 batch `history_base` 匹配，同时保留每条 transition 的 parent/history_base 与 coverage endpoint 校验，不再要求所有 transition 共用 active history base。
  - Verification：新增 2-transition 合法 lineage、batch history base 未匹配和 transition parent mismatch 用例；target protocol focused tests `11/11` 通过。
  - Handoff：review-diff。
- Finding ID：RD-4.5-001-004
  - Severity：P1
  - Source：`verify-contracts`（2026-08-28）
  - Status：resolved/current_task_owned
  - File / symbol：`src/services/codexRolloutCollector/analyzerProtocol.js:349-382,747-809` / lineage transition, coverage, replacement and checkpoint validation
  - Failure scenario：Node 可能接受 `history_base.parent` 与 transition `parent_rollout_id` 不一致、coverage 为空或缺少 root/active、replacement cut 未绑定到对应 transition、replacement/mutation 不是精确一一对应，或 checkpoint/validation state 约束不足的 lineage evidence；不完整证据可能被当作 canonical 结果处理。
  - Minimal fix direction：对齐 Rust lineage evidence 规则，补齐 transition parent 关系、coverage 非空/root-active 覆盖、validated state、checkpoint coverage，以及 replacement 与 replace mutation 的精确匹配/绑定校验。
  - Required test：分别覆盖 parent mismatch、零 covered source、缺 root/active、replacement cut mismatch、缺 mutation/多余 mutation、checkpoint 与 coverage/validation state 不一致的拒绝，并保留合法 canonical/replacement fixture。
  - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
  - Ownership assessment：这是步骤 1 现有 lineage/completeness validator 的机械对齐项；不要求改变数据契约、产品 projection 或 source 层范围。
  - Ownership evidence：`verify-contracts` 已按 Rust `TargetLineageTransition`/`TargetLineageCoverage`/`validate_lineage_evidence` 完成定位和风险复核；所有拟修改文件均在 live Allowed Files 内；无匹配 paused/interrupted owner。
  - Resolution：补齐 transition parent、coverage root/active/非空、canonical/replacement/checkpoint validated state、checkpoint coverage 完全一致，以及 replacement 与 transition/corresponding mutation 的一一绑定。
  - Verification：新增 coverage、checkpoint、replacement cut/transition 和重复 mutation 负向用例；target protocol focused tests `11/11` 通过。
  - Handoff：review-diff。
- Finding ID：RD-4.5-001-005
  - Severity：P1
  - Source：`verify-contracts`（2026-08-28）
  - Status：resolved/current_task_owned
  - File / symbol：`src/services/codexRolloutCollector/analyzerProtocol.js:225-283` / cursor validation
  - Failure scenario：Node 接受 `tail_preview`、`backfill` 或 `forward_append` cursor，即使对应 capability 未声明；请求或 batch 因而越过 Rust target 的 cursor-kind/capability 边界。
  - Minimal fix direction：建立 cursor kind 到 capability 的显式映射：`tail_preview`→`capabilities.tail_preview`、`backfill`→`capabilities.backward_segments`、`forward_append`→`capabilities.append`，缺失或为 false 时 fail-closed。
  - Required test：覆盖三种 cursor kind 各自 capability 开启的正向路径，以及 capability 缺失/关闭和未知 kind 的拒绝。
  - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
  - Ownership assessment：当前步骤 1 的 Node cursor validator 缺少已确认 Rust capability 绑定；最小修复只触及允许的 protocol/test 文件。
  - Ownership evidence：`verify-contracts` 已对照 Rust target data cursor contract；live `CURRENT_TASK.md` 明确允许 Node validator 和目标测试；无 scope widening 或 shared contract 变更。
  - Resolution：增加 `tail_preview`→`tail_preview`、`backfill`→`backward_segments`、`forward_append`→`append` 的显式 capability 绑定，缺失或关闭时拒绝。
  - Verification：新增三种 cursor kind 与 capability 不匹配的负向用例，并保留默认合法 cursor 正向用例；target protocol focused tests `11/11` 通过。
  - Handoff：review-diff。
- Finding ID：RD-4.5-001-006
  - Severity：P1
  - Source：`verify-contracts`（2026-08-28）
  - Status：resolved/current_task_owned
  - File / symbol：`src/services/codexRolloutCollector/analyzerProtocol.js:1089-1119,1394` / complete validation and `encodeMessage`
  - Failure scenario：Node 的通用校验和 outbound `encodeMessage` 接受并发送 `complete.status="ok"`；该状态仅是 Rust inbound compatibility 形态，Rust outbound serializer 会拒绝，导致 Node 发送非法 target wire。
  - Minimal fix direction：在 outbound complete validation/serialization 路径禁止 `status="ok"`；如需保留 inbound compatibility，必须将其与 outbound fail-closed 校验明确分离，不改变其他合法 complete 状态。
  - Required test：断言 `status="ok"` 的 outbound validate/encode 均拒绝，合法非 ok complete 仍可编码；若保留 inbound compatibility，单独覆盖其仅限 inbound 的边界。
  - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
  - Ownership assessment：这是步骤 1 target wire serializer 的输出边界缺陷；修复限定在 Node protocol 和目标测试，不涉及 Rust/source 或公共产品入口。
  - Ownership evidence：`verify-contracts` 已对照 Rust `TargetCompleteMessage.validate_for_output` 与 Node `encodeMessage`；当前 Allowed Files 覆盖实现和测试，无匹配 paused/interrupted owner。
  - Resolution：保留 `validateMessage`/`parseLine` 对 inbound compatibility `status="ok"` 的读取能力，但 `encodeMessage` 通过 outbound 校验拒绝该状态。
  - Verification：新增 inbound `ok` 可解析、outbound `encodeMessage` 必须拒绝以及合法 complete 仍可编码的用例；target protocol focused tests `11/11` 通过。
  - Handoff：review-diff。
- Finding ID：DEFER-002 / RD-4.5-006-001
  - Severity：deferred/out-of-scope
  - Source：Rust source discovery review
  - Status：deferred/needs-independent-source-scope
  - File / symbol：`native/codex-rollout-collector/src/source/**`
  - Failure scenario：candidate symlink 可能在 canonical confinement 前被 discovery 读取。
  - Minimal fix direction：另立 source-owner 任务并重新 lock；本任务禁止以 Node workaround 宣称修复。
  - Required test：独立 source pre-I/O boundary regression。
  - Handoff：source owner / Rust-Node joint review。
 - Finding ID：RD-4.5-003-001
   - Severity：P1
   - Source：`review-diff`（2026-08-28；diff target `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）
  - Status：resolved/current_task_owned
  - File / symbol：`src/services/codexRolloutCollector/analyzerRequestTracker.js:170-181,311-315`；`AnalyzerRequestTracker.resolve/reject/size`
  - Failure scenario：Rust 正常发送 `complete` 或 request-level `error` 后，Node promise 已结算但 tracker 条目仍留在 `pending`；连续请求会积累已结算条目，未来若以 tracker 作为 active-slot 判定则无法在正常终态后释放。
  - Why current implementation fails：`resolve/reject` 只调用 `_settleEntry`，没有移除普通终态；当前 `analyzerProcessManager.js` 的 `complete/error` 路径只调用 `_forgetRequest` 和 `tracker.resolve/reject`，没有调用 `markTerminated`。`size` 还明确把所有已结算但未标记终止的条目继续计入。
  - Minimal fix direction：让正常 `complete/error` settlement 在一次性结算后释放 tracker 条目；仅对 cancel/timeout 或 worker 尚未明确终止的路径保留 termination wait，并保持 stale scope callback 不能重新结算。
  - Required test：覆盖正常 `complete`/`error` settlement 后 `has=false`、`size=0` 且下一 request 可登记；同时保留 cancel/timeout 在 `markTerminated` 前占用槽位、迟到 callback 被拒绝，以及重复 settlement 只生效一次。
  - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
  - Ownership assessment：这是当前 active Node 4.5 任务步骤 3 tracker 的 mechanical implementation finding；最小修复可限定在当前步骤允许的 `analyzerRequestTracker.js` 与目标测试，不需要扩大范围、修改共享契约或改变产品入口。
  - Ownership evidence：live `CURRENT_TASK.md` 明确步骤 3 允许 tracker 与 `tests/codexRolloutCollector.test.js`；`review-diff` 已给出可执行定位和正常终态泄漏场景；当前任务的总体 Allowed Files 也包含 process manager，但本轮不要求提前接通步骤 4；`TASKS/paused/**` 无匹配 Node collector owner，`TASKS/interrupted/**` 不存在。
  - Resolution：`resolve/reject` 通过局部 `_settleAndReleaseEntry` 在普通成功或 request-level error 一次性结算后立即移除 tracker 条目；cancel/timeout 仍直接保留 entry，直到匹配 generation/attempt 的 `markTerminated`，stale callback 仍被 scope guard 拒绝。
  - Verification：新增并通过正常 success/error settlement 后 `has=false`、`size=0`、下一次登记可用的测试；保留重复 settlement、cancel/timeout termination wait、错误 code/retryable、stale scope 和 timer cleanup 覆盖。tracker focused tests `4/4`、target focused suite `23/23`、允许文件 `node --check` 通过；collector 全量 `26/52` 通过、`26` 失败、无挂起，失败仍集中在步骤 4～7 的已知旧调用/导入缺口。
   - Handoff：implement-current-step。

- Finding ID：RD-4.5-004-001
  - Severity：P1
  - Source：`review-diff`（2026-08-28；diff target `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）
  - Status：resolved/current_task_owned
  - File / symbol：`src/services/codexRolloutCollector/index.js:58-72,140-158` / `CodexRolloutCollector.init`、`CodexRolloutCollector.stop`
  - Failure scenario：`stop()` 在 importer 或 run store 初始化尚未完成、Rust child 尚未创建时执行；`processManager.stop()` 先看到无 child 并返回，随后延迟的 `init()` 继续调用 `processManager.start()`。复现结果为 caller 收到 `ANALYZER_REQUEST_CANCELLED`，但 `stop()` 返回后 `processManager.child` 仍存在，collector 为 `initialized=false`/`stopping=false`，形成泄漏并可能复用已停止 collector 的 analyzer 进程。
  - Minimal fix direction：让 stop 生命周期与 in-flight `initPromise` 建立明确的取消/代际门禁；停止期间初始化不得启动 child，或在初始化完成后由同一 stop 流程再次确保 process manager 已停止，并在最终清理前等待该 promise 收口。
  - Required test：注入延迟 importer/run store 初始化，在初始化期间调用 `collector.stop()`；断言 pending analyze 被取消、stop 返回后无 child/active request、后续不会由迟到 init 偷启 analyzer。
  - Ownership assessment：这是当前 active Node 4.5 任务步骤 4 的 coordinator/process lifecycle mechanical implementation finding；最小修复仅需触及当前 Allowed Files 的 `index.js` 与目标测试，不需要扩大范围、修改共享契约、改变产品入口或恢复暂停任务。
  - Ownership evidence：live `CURRENT_TASK.md` 将步骤 4 定义为 coordinator/process 单飞、取消和 generation 生命周期，并将 `index.js`、`analyzerProcessManager.js` 与 `tests/codexRolloutCollector.test.js` 列为 Allowed Files；review-diff 的一次性延迟初始化复现确认上述失败场景；`TASKS/paused/**` 仅有 IPC/Owner 任务，`TASKS/interrupted/**` 不存在，未发现匹配 Node collector owner。
  - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
  - Resolution：`CodexRolloutCollector` 记录 lifecycle generation，并让 `stop()` 与 in-flight `initPromise` 建立停止代际门禁；停止期间延迟初始化不再启动 analyzer，且 stop 在 init 收口后再次关闭跨边界创建的 child。
  - Verification：新增并通过延迟 importer/store 初始化期间执行 `stop()` 的回归测试；断言 pending analyze 被取消、stop 返回后无 child/active request，且 collector 未初始化、未处于 stopping 状态。允许文件 `node --check` 全部通过，步骤 4 focused lifecycle tests `7/7` PASS。
  - Handoff：review-diff。

 - Finding ID：RD-4.5-004-002
  - Severity：P1
  - Source：`review-diff`（2026-08-28；diff target `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）
  - Status：resolved/current_task_owned
  - File / symbol：`src/services/codexRolloutCollector/analyzerProcessManager.js:621-640` / `_beginCancellation`、`_forceTerminate`
  - Failure scenario：analyzer 忽略 cancel 或不返回终止 error 时，tracker 的 cancel/timeout 先将 entry 标记为 settled；grace timer 调用 `_forceTerminate()`，但默认 `_isCurrentRequest(state)` 拒绝 settled request，函数直接返回，不执行 `child.kill()`，导致 active request、request map 和 tracker entry 持续占用，后续 pending intent 无法推进。最小 mock worker 复现为 cancel 返回成功但 50ms 后 child 仍未退出、`active=true`、request/tracker 仍被跟踪。
  - Minimal fix direction：终止 grace 阶段使用允许 settled 的 generation/child/request scope 检查，保留当前 active slot 直到 worker exit 或 stop 明确证明终止；不要因业务 promise 已 rejected 就跳过物理进程终止。
  - Required test：增加不响应 cancel 的 mock analyzer，分别覆盖显式 cancel 和 timeout；断言 grace 到期执行 kill、worker exit 释放 active slot/tracker，并可调度下一个 intent。
  - Ownership assessment：这是当前 active Node 4.5 任务步骤 4 的 process cancellation mechanical implementation finding；最小修复仅需触及当前 Allowed Files 的 `analyzerProcessManager.js` 与目标测试，不需要扩大范围、修改共享契约、改变产品入口或恢复暂停任务。
  - Ownership evidence：live `CURRENT_TASK.md` 将步骤 4 的危险面明确锁定为 cancel/timeout、generation 和 active slot，并允许修改 process manager 与目标测试；review-diff 的 mock worker 复现直接命中 `_forceTerminate` guard；`TASKS/paused/**` 仅有 IPC/Owner 任务，`TASKS/interrupted/**` 不存在，未发现匹配 Node collector owner。
  - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
  - Resolution：终止 grace timer 的 `_forceTerminate()` 现在使用 generation/child/request scope 校验但允许 tracker entry 已 settled，从而在业务 promise 已拒绝后仍执行物理 `child.kill()`；active slot 继续保持到 worker exit 或 stop 收口。
   - Verification：fake analyzer 增加忽略 cancel 的控制；新增显式 cancel 与 timeout 两个场景的回归覆盖，均验证 grace 到期后 worker 被终止、active/request/tracker 状态释放且后续 request 可调度。允许文件 `node --check` 全部通过，步骤 4 focused lifecycle tests `7/7` PASS。
   - Handoff：review-diff。

  - Finding ID：RI-4.5-004-003
    - Severity：major
    - Source：`review-implementation`（2026-08-28；diff target `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）
    - Status：resolved/current_task_owned
   - File / symbol：`src/services/codexRolloutCollector/index.js:340-352` / `CodexRolloutCollector._executeIntent` restart catch；`index.js:152-177` / `CodexRolloutCollector.stop`
   - Failure scenario：当前 request 因 `ANALYZER_PROCESS_EXIT` 进入重启分支，并在 `waitForIdle()` 暂停；此时调用 `stop()`，待暂停释放后仍启动新的 analyzer。确定性复现结果为 `starts=2`、`stops=2`、`child=true`、`stopping=false`，即 stop 返回后仍遗留 child。
   - Why current implementation fails：`canRestart` 在异步等待前计算，`waitForIdle()` 返回后没有重新检查 lifecycle generation、`stopping` 或 intent 是否仍有效，因而 delayed restart 可以越过 stop 的二次关闭。
   - Minimal fix direction：在等待 idle 后以及调用 `processManager.start()` 前重新验证当前 intent/lifecycle；将 restart 与 stop 串行化，确保 stopping 期间或旧 lifecycle 的 restart 不得创建 child。
   - Required test：注入延迟 `waitForIdle()`，触发进程退出后并发调用 `collector.stop()`，释放等待；断言分析请求为取消终态、stop 返回后无 child/active request，且 restart 次数不增加。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 4 的 coordinator/process lifecycle mechanical finding；最小修复限定在当前 Allowed Files 的 `index.js` 与目标测试，不需要扩大范围、修改共享契约或改变产品入口。
    - Ownership evidence：live `CURRENT_TASK.md` 步骤 4 明确要求进程链、generation、取消和 active 槽位收口，并允许 `index.js`、`analyzerProcessManager.js` 与目标测试；`review-implementation` 在同一 diff target 下复现 stop/restart 竞态；`TASKS/paused/**` 仅命中 IPC/Owner 任务，`TASKS/interrupted/**` 无文件，不存在匹配 suspended Node collector owner。
    - Resolution：重启分支在 `waitForIdle()` 返回后重新检查 intent、lifecycle generation、停止状态和 deadline；若 stop 已启动或 intent 已失效，不再调用 `processManager.start()`，并保留旧 generation 的终态收口。
    - Verification：新增延迟 `waitForIdle()` 与并发 `collector.stop()` 回归；断言请求为 `ANALYZER_REQUEST_CANCELLED`、restart 次数不增加、stop 返回后无 child/active request。步骤 4 focused lifecycle tests `12/12` 通过。
    - Handoff：review-diff。

  - Finding ID：RI-4.5-004-004
    - Severity：major
    - Source：`review-implementation`（2026-08-28；diff target `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）
    - Status：resolved/current_task_owned
   - File / symbol：`src/services/codexRolloutCollector/index.js:257-312,340-352` / `CodexRolloutCollector._executeIntent`；`analyzerProcessManager.js:306-312` / `AnalyzerProcessManager.request`
   - Failure scenario：调用 `collector.analyze(..., { timeoutMs: 30 })`，第一次 request 进程退出，随后 restart 的 `start()`/hello 被阻塞；超过 100ms 请求仍未结算。复现期间 `starts=2`、`settled=false`，最终只能在释放 restart 后收到进程错误。
   - Why current implementation fails：总 deadline 在 `init()` 与 `runStore.begin()` 之后才建立，而 `processManager.request()` 会先等待 `start()` 再登记 tracker timer；restart 的 `await processManager.start()` 期间没有任何 timeout/cancellation gate，因而 `timeoutMs` 不能约束初始化或重启等待。
   - Minimal fix direction：在 intent 开始阶段建立 deadline，将剩余预算传入 init/start/hello/restart；预算耗尽时返回稳定 timeout 错误并终止当前 process generation，禁止继续 restart。
   - Required test：注入延迟初始 hello 和延迟 restart start，使用小于延迟的 `timeoutMs`；断言请求按 timeout 结算、child/active 槽位最终收口，且不会在 deadline 后创建新的 generation。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 4 的 deadline/process lifecycle mechanical finding；最小修复限定在当前 Allowed Files 的 process manager、coordinator 与目标测试，不需要扩大范围、修改共享契约或改变产品入口。
    - Ownership evidence：live `CURRENT_TASK.md` 步骤 4 输出明确包含 deadline 和有限重启，验收标准要求 deadline 不越过生命周期边界；`review-implementation` 以可注入 manager 复现 timeout 未结算；`TASKS/paused/**` 与 `TASKS/interrupted/**` 均无匹配 Node collector owner。
    - Resolution：在 intent 进入执行时建立总 deadline；剩余预算传入 startup/hello、request 和 restart，并以有界等待包裹已有的 init/start/waitForIdle。预算耗尽时返回稳定的 `ANALYZER_REQUEST_TIMEOUT`，终止当前 process generation，禁止继续重启；已有 in-flight hello 的 manager request 同样使用 request timeout 边界。
    - Verification：新增延迟初始 hello、已有 hello 启动中的 request 和延迟 restart start 三个回归；均确认 timeout 在预算内结算、无 active request/child 泄漏，且未在 deadline 后创建可用 child。步骤 4 focused lifecycle tests `12/12` 通过。
    - Handoff：review-diff。

  - Finding ID：RI-4.5-004-005
    - Severity：major
    - Source：`review-implementation`（2026-08-28；diff target `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）
    - Status：resolved/current_task_owned
   - File / symbol：`src/services/codexRolloutCollector/analyzerProcessManager.js:295-298,306-360` / `AnalyzerProcessManager.send/request`；`index.js:340-352` / restart catch
   - Failure scenario：ready child 的 stdin 在 `exit` 事件到达前被销毁，发送 analyze 返回 `ANALYZER_PROCESS_NOT_RUNNING`；上层按有限预算重试，但 `start()` 仍返回原 child，generation 不变。真实 fake analyzer 复现结果为 `result=ANALYZER_PROCESS_NOT_RUNNING`、`generation=1`、`sameChild=true`。
   - Why current implementation fails：send failure 只拒绝并释放当前 tracker/request，没有把当前 child 标记为 failed 或等待其退出；随后 `start()` 的已有 child/startPromise 快速返回分支复用不可写的旧 process，重试没有形成新的 generation。
   - Minimal fix direction：`ANALYZER_PROCESS_NOT_RUNNING` 必须使当前 child 进入 failed/termination 流程，在确认旧 child 不再可用后再创建新的 generation；保留旧 stdout/exit 的 generation guard，避免迟到事件污染新请求。
   - Required test：让 fake analyzer 在 exit 事件前关闭 stdin，触发 request retry；断言重试使用新 generation/新 child、请求最终可完成，且旧 child 的迟到消息不会改变新 intent。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 4 的 process restart mechanical finding；最小修复限定在当前 Allowed Files 的 process manager、coordinator 与目标测试，不需要扩大范围、修改共享契约或改变产品入口。
    - Ownership evidence：live `CURRENT_TASK.md` 步骤 4 明确要求进程异常后的 generation 隔离、有限重启和 active 槽位收口；`review-implementation` 使用真实 fake analyzer 验证不可写 child 被旧 generation 复用；`TASKS/paused/**` 仅为 IPC/Owner 任务，`TASKS/interrupted/**` 无匹配包。
    - Resolution：`send()` 将 destroyed/non-writable stdin 及 `ERR_STREAM_DESTROYED`/`EPIPE` 统一为 `ANALYZER_PROCESS_NOT_RUNNING`；request 失败后立即从当前 generation 脱离 child、清除 ready/start 状态、终止旧进程并等待其结束，`start()` 在失效收口后才创建新 generation，旧 stdout/exit 继续由 generation/child guard 丢弃。
    - Verification：真实 fake analyzer 在 exit 前关闭 stdin；回归确认初始 request 不被旧 child 复用，重试使用 generation `2` 与新 request id 并最终 complete，active slot 正常释放。步骤 4 focused lifecycle tests `12/12` 通过。
    - Handoff：review-diff。

  - Finding ID：RI-4.5-004-006
    - Severity：major
    - Source：`review-implementation`（2026-08-28；diff target `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/index.js:62-86` / `CodexRolloutCollector.init`
    - Failure scenario：公开的无界 `collector.init()` 在 `importer.init` 处阻塞时，调用 `collector.analyze(..., { timeoutMs: 30 })`；analyze 复用该既有 init promise 并按 deadline 超时后，释放 init 阻塞，迟到的初始化仍调用 `processManager.start()` 并设置 `initialized=true`。确定性复现为 timeout 时 `child=false`、`initialized=false`、`stopping=false`、`initInFlight=true`，释放后变为 `child=true`、`initialized=true`、`stopping=false`、`generation=1`，导致 analyze deadline 之后遗留未归属 child。
    - Why current implementation fails：`init()` 直接返回既有 `initPromise`，没有把有界 analyze intent 的 deadline 或生命周期绑定到无界公共初始化；初始化闭包在 importer/store await 后仍无条件创建 child。`_stopProcessAfterDeadline()` 在 timeout 时看不到 child，且没有 lifecycle fence 使迟到的无界初始化失效。
    - Minimal fix direction：有界 intent 不得盲目复用无界公共 init；为初始化绑定当前 intent 的 deadline/生命周期 token，或使 in-flight 无界初始化在 bounded intent 超时后失效并取消。确保 deadline 之后迟到的 init 不能创建或标记 initialized，且不会留下无主 child。
    - Required test：延迟公共 `collector.init()` 的 importer/store；启动短 deadline 的 analyze 并断言 timeout；释放 init 后 await 原 init promise，再断言无 child、`initialized=false`、无 active request，且没有迟到的 process 创建；随后可选地验证下一次显式 analyze 能以干净 generation 启动。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 4 的 coordinator/process lifecycle mechanical implementation finding；最小修复限定在当前 Allowed Files 的 `index.js` 与目标测试，不需要扩大范围、修改共享契约、改变产品入口或恢复暂停任务。
    - Ownership evidence：live `CURRENT_TASK.md` 将步骤 4 定义为 coordinator/process 单飞、取消、deadline 和 generation 生命周期，并允许 `index.js`、`analyzerProcessManager.js` 与 `tests/codexRolloutCollector.test.js`；`review-implementation` 在同一 diff target 下复现了迟到 init 创建 child 的失败；已读取的 `TASKS/paused/**` 仅为 IPC/Owner 任务，`TASKS/interrupted/**` 不存在，未发现匹配 Node collector owner。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Resolution：为 in-flight initialization 建立动态 context；bounded analyze 接管无界 public init 时写入当前 intent/deadline，deadline/cancel 会使 context 失效，初始化在 importer/store 收口后不再启动或标记 analyzer。
    - Verification：新增并通过 public `collector.init()` 被延迟、bounded analyze 在 startup deadline 超时、随后释放初始化的回归；确认原 init 收口后无 child、`initialized=false`、无 active request，generation 保持 `0`。步骤 4 focused lifecycle tests `14/14` 通过。
    - Handoff：review-diff。

  - Finding ID：RI-4.5-004-007
    - Severity：major
    - Source：`review-implementation`（2026-08-28；diff target `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/index.js:339-340`、`src/services/codexRolloutCollector/analyzerProcessManager.js:456,673`、`src/services/codexRolloutCollector/analyzerRequestTracker.js:235-240` / analyze 总 deadline 与 complete phase timer
    - Failure scenario：batch 在总 deadline 前 ACK，但 complete 阶段继续使用完整的 phase timeout，导致 total intent timeout 不是硬上限。预初始化 collector，设置 `timeoutMs=100ms`、fake batch delay `40ms`、complete delay `80ms`，request 实测约 `142ms` 才 resolve，而不是在 100ms 内 timeout。
    - Why current implementation fails：collector 计算了绝对 deadline 并向 manager 传入当下剩余预算，但 manager 在每个 phase 通过 `tracker.track` 使用同一个完整 timeout；`advancePhase('complete')` 又通过 `setPhase` 重置 complete timer。`_executeIntent` 没有用总 deadline 包裹整个 `processManager.request()`，也未在最终 complete 前再次检查 intent/deadline，因此 batch→complete 会延长总预算。
    - Minimal fix direction：在 analyze/complete 各阶段持续传递同一个绝对 request deadline，phase transition 只能使用剩余预算；或在 collector 层用总 deadline 有界包裹整个 manager request，并在最终结算前重新检查 live intent/deadline。超时必须按既有规则取消并终止当前 process generation。
    - Required test：初始化 collector 后设置 batch delay 在总 deadline 前、complete delay 超过总 deadline；断言在预算内收到稳定的 `ANALYZER_REQUEST_TIMEOUT`，无 active request/child 泄漏且没有 complete publication；必要时补充 batch callback latency 覆盖。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 4 的 coordinator/process deadline mechanical implementation finding；最小修复限定在当前 Allowed Files 的 `index.js`、`analyzerProcessManager.js`、`analyzerRequestTracker.js` 与目标测试，不需要扩大范围、修改共享契约或改变产品入口。
    - Ownership evidence：live `CURRENT_TASK.md` 步骤 4 明确要求 deadline、有限重试和 active 槽位收口，并允许上述 Node 生命周期文件与目标测试；`review-implementation` 在同一 diff target 下复现了 batch→complete 超出总预算；已读取的 `TASKS/paused/**` 仅为 IPC/Owner 任务，`TASKS/interrupted/**` 不存在，未发现匹配 Node collector owner。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Resolution：用 collector 的绝对 deadline 包裹整个 `processManager.request()`，在 request 返回和最终 run completion 前复核剩余预算；snapshot/complete 也遵守同一 deadline，超时会停止当前 process generation。
    - Verification：新增并通过 batch 在总 deadline 前到达、complete 延迟越过总 deadline 的回归；收到 `ANALYZER_REQUEST_TIMEOUT`，没有 complete publication、active request、tracker entry 或 child 泄漏。步骤 4 focused lifecycle tests `14/14` 通过。
    - Handoff：review-diff。

  - Finding ID：RI-4.5-004-008
    - Severity：major
    - Source：`review-implementation`（2026-08-28；diff target `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analyzerProcessManager.js:676` / batch ACK error catch；`src/services/codexRolloutCollector/index.js:339` / restart loop；`analyzerRequestTracker.js:235-240`
    - Failure scenario：batch 到达后、ACK 写入前 stdin 变为不可用，ACK `send()` 抛出映射后的 `ANALYZER_PROCESS_NOT_RUNNING`；catch 只拒绝 request，没有失效、脱离或终止当前 child。collector 重启时复用同一 child/generation，重试预算被消耗，最终仍收到 `ANALYZER_PROCESS_NOT_RUNNING`。注入 fake analyzer stdin 在首个 batch 后抛 `EPIPE` 的复现观察到 `reusedChild=true`、`generation=1` 多次出现。
    - Why current implementation fails：初始 analyze send failure 路径会调用 `_invalidateCurrentProcess(state)`，但 ACK error catch 只 best-effort 发送 negative ACK、`tracker.reject` 和 `_finishRequest`，没有走相同的 process invalidation。随后 restart 路径调用 `start()`，而已有 child/startPromise 分支直接返回不可写的旧进程，不会生成新的 generation。
    - Minimal fix direction：ACK/negative ACK 写入遇到 process-not-running、`EPIPE` 或 `ERR_STREAM_DESTROYED` 时统一使当前 process generation 失效，脱离并终止旧 child，等待 invalidation 收口后再允许 restart；保留 generation/child stale guard，禁止迟到旧事件污染新 request。其他 write-side process failure 也应进入同一 invalidation 路径。
    - Required test：让 fake/mock analyzer 在 batch 后、ACK 前使 stdin 写入失败；断言旧 child 被失效，retry 使用新 child/generation 和新 `request_id` 并在预算内完成，旧 generation 的迟到事件不能修改下一 intent。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 4 的 process ACK/restart lifecycle mechanical implementation finding；最小修复限定在当前 Allowed Files 的 `analyzerProcessManager.js`、`index.js` 与目标测试，不需要扩大范围、修改共享契约或改变产品入口。
    - Ownership evidence：live `CURRENT_TASK.md` 步骤 4 明确要求 ACK 前置生命周期、有限重试、generation 隔离和 active 槽位收口，并允许上述 process manager/coordinator 文件与目标测试；`review-implementation` 在同一 diff target 下通过注入 `EPIPE` 复现旧 child 被复用；已读取的 `TASKS/paused/**` 仅为 IPC/Owner 任务，`TASKS/interrupted/**` 不存在，未发现匹配 Node collector owner。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Resolution：ACK 处理路径捕获正/负 ACK 的 process-not-running、`EPIPE` 和 `ERR_STREAM_DESTROYED`，统一拒绝当前 request 并触发 `_invalidateCurrentProcess`；collector 等待 invalidation 后再创建新 generation。
    - Verification：新增并通过 batch 后 ACK 前注入 `EPIPE` 的回归；旧 child 被脱离，新 retry 使用 generation `2` 与新 request id 完成，旧 generation 不污染结果，active slot 正常释放。步骤 4 focused lifecycle tests `14/14` 通过。
    - Handoff：review-diff。

  - Finding ID：RI-4.5-004-009
    - Severity：major
    - Source：`review-implementation`（2026-08-28；diff target `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analyzerProcessManager.js:503-542,544-571` / `AnalyzerProcessManager.stop`、`_invalidateCurrentProcess`
    - Failure scenario：worker 的 `kill()` 返回成功但进程没有发出 `exit`（例如 worker 忽略终止信号或测试替身未完成终止）时，`stop()`/process invalidation 等待 1 秒超时后仍清空 child 并允许新的 generation 启动。注入不实际退出的 child 已复现：`killCalls=1`、`childStillLive=true`，但 manager 的 child 已为 null，随后可启动 generation `2`。
    - Why current implementation fails：当前实现用 `Promise.race([exit, 1000ms])` 把终止等待变成时间上限；超时分支没有退出事件或强制终止证据，却继续释放 process invalidation fence。旧 Rust worker 因而可能与新 worker 并存，造成 single-process 约束和资源收口失效；generation/child guard 只能阻止迟到消息改写新请求，不能消除进程重叠。
    - Minimal fix direction：终止 fence 必须持续到收到 `exit` 或取得明确的强制终止证据；在 grace 到期后执行可验证的二次强制终止，若仍不能确认终止则保持 manager unavailable/active fence，不得清空 invalidation 或启动新 generation。修复限定在当前允许的 process manager 与目标测试。
    - Required test：增加 `kill()` 无效且不发出 `exit` 的注入 child，分别覆盖 `stop()` 与 `_invalidateCurrentProcess()`；断言旧进程未确认退出前 `waitForIdle()`/下一次 `start()` 不得放行，进程发出 `exit` 后才允许创建下一 generation，并确认 stale 消息仍被丢弃。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 4 的 process termination/generation mechanical implementation finding；最小修复仅触及当前 Allowed Files 的 `analyzerProcessManager.js` 与 `tests/codexRolloutCollector.test.js`，不需要扩大范围、修改共享契约、改变产品入口或恢复暂停任务。
    - Ownership evidence：live `CURRENT_TASK.md` 步骤 4 明确要求取消、超时和进程退出在确认 worker/进程终止后才能启动新 generation，并将 process manager 与目标测试列为 Allowed Files；本次 `review-implementation` 在同一 diff target 下给出可复现的 no-exit child 结果；已读取 `TASKS/paused/**`，其中仅有 IPC/Owner 任务且无匹配 Node collector owner，`TASKS/interrupted/**` 不存在。
    - Handoff：implement-current-step。
    - Resolution：`stop()` 与 `_invalidateCurrentProcess()` 现在在脱离当前 child 后建立 process invalidation termination fence；grace 到期仅执行二次 `SIGKILL`，必须收到 `exit` 或已有退出状态证据后才清理 fence 并允许下一 generation，`waitForIdle()` 同样等待该 fence。
    - Verification：新增 no-exit synthetic worker 回归，分别覆盖 `stop()` 与 `_invalidateCurrentProcess()`、grace 后二次强制终止、`waitForIdle()` 阻塞和下一 generation gate；无 `exit` 时 `1/1` 通过并确认未创建新 child，补发 `exit` 后 generation `2` 才启动。允许 JS/fixture `node --check`、步骤 4 生命周期 targeted tests 通过；collector 全量 `42/68` PASS、`26` FAIL、无挂起，失败仍集中在步骤 5～7 的已知旧迁移缺口。
    - Handoff：review-diff。

  - Finding ID：RI-4.5-004-010
    - Severity：major
    - Source：`review-implementation`（2026-08-28；diff target `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analyzerProcessManager.js:535-552,569-583,586-606,873-901` / `waitForIdle`、`stop`、`_invalidateCurrentProcess`、`_finishRequest`、`_resolveIdleWaiters`
    - Failure scenario：调用方先注册 `waitForIdle()`，随后执行 `stop()` 或请求失败路径执行 `_finishRequest()` 后再 `_invalidateCurrentProcess()`；在 termination fence 建立前，active request 被清空并解析 idle waiter。无 `exit` 的 synthetic child 已复现：`stop()` 路径 30ms 后 `idleSettled=true`、`stopSettled=false`、`killSignals=[null,"SIGKILL"]`、`invalidation=true`；直接 invalidation 路径为 `idleSettled=true`、`invalidationSettled=false`、`child=null`、`fence=true`。
    - Why current implementation fails：`waitForIdle()` 在 fence 尚不存在时捕获已 resolved 的 invalidation promise；`stop()`/`_finishRequest()` 又在建立 fence 前调用 `_resolveIdleWaiters()`，导致已注册的 `Promise.all` 无法再纳入后续 termination fence。虽然 `start()` 仍单独检查 `processInvalidationPromise`，不会直接绕过 fence，但 idle observer/upstream caller 会在旧 child 未确认退出时误判为空闲，违反步骤 4 的终止后释放要求。
    - Minimal fix direction：在清空 active request 或解析 idle waiter 前同步建立 termination barrier，或让 `_resolveIdleWaiters()` 在存在 termination/invalidation fence 时延迟解析；fence resolve 后重新执行 `_resolveIdleWaiters()`。同时覆盖 `stop()` 与请求触发的 `_invalidateCurrentProcess()`，保留 start gate 和 stale generation guard。修复限定在当前允许的 process manager 与目标测试。
    - Required test：先注册 `waitForIdle()`，再用不发出 `exit` 的 synthetic child 调用 `stop()`；断言 grace/二次 kill 后 waiter 仍 pending，只有 synthetic `exit` 后才 resolve。另覆盖 `_finishRequest()` 后 `_invalidateCurrentProcess()` 的预注册 waiter（或等价真实 send/ACK failure path），确认退出前不提前 idle、也不启动新 generation。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 4 的 process termination/idle lifecycle mechanical implementation finding；最小修复仅触及当前 Allowed Files 的 `analyzerProcessManager.js` 与 `tests/codexRolloutCollector.test.js`，不需要扩大范围、修改共享契约、改变产品入口或恢复暂停任务。
    - Ownership evidence：live `CURRENT_TASK.md` 步骤 4 明确要求取消、超时和进程退出在确认 worker/进程终止后才能释放 active/idle 状态并启动新 generation，且 process manager 与目标测试在 Allowed Files 内；本次 `review-implementation` 在同一 diff target 下给出上述可复现的 pre-fence idle waiter 结果；已读取 `TASKS/paused/**`，其中仅有 IPC/Owner 任务且无匹配 Node collector owner，`TASKS/interrupted/**` 不存在。
    - Handoff：review-diff。
    - Resolution：在清空 active request 或解析 idle waiter 前同步建立 process termination fence；`_resolveIdleWaiters()` 在 fence 存在时延迟解析，request send/ACK failure 路径先执行 invalidation 再 `_finishRequest()`，确保旧 child 未得到退出证据时不释放 idle 或启动新 generation。
    - Verification：新增预注册 `waitForIdle()` 的 synthetic-child ACK failure 回归；无 `exit` 时 idle、invalidation 和下一 generation 均保持 pending，退出证据到达后才允许 generation `2` 启动。步骤 4 lifecycle focused suite `25/25` PASS，允许 Node collector JS、目标测试和 fake fixture `node --check` 全部通过。

  - Finding ID：RI-4.5-004-011
    - Severity：major
    - Source：`review-implementation`（2026-08-28；diff target `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analyzerProcessManager.js:339-358,771-788,852-865` / current-child `error` listener、`_handleProcessFailure`、`_forceTerminate`
    - Failure scenario：取消/超时或进程通信期间，`child.kill()` 返回 `false`，或 child 异步发出 `error`（例如 synthetic `EPERM`），但没有发出 `exit`。当前 child 的 `error` handler 会清空 active request、`child`、`startPromise` 和 `readyGeneration`，且不建立 `processInvalidationPromise`。注入测试已复现：`error=EPERM`、`spawnCount=1`、`childDetached=true`、`active=false`、`fence=false`、`oldStillNoExit=true`、`kills=2`；随后 `start()` 使 `spawnCountAfterStart=2`，旧 child 仍未退出。
    - Why current implementation fails：error event 可能只是 kill/send 失败，并不是进程已终止的证据；当前处理把它当作权威失败并脱离 child，`start()` 又只检查 `processInvalidationPromise`，而该路径没有建立 fence，因而 generation `2` 可在 generation `1` 仍存活时启动，产生 process overlap。若第二次 kill 再发 error，还可能形成未处理的异步 error。
    - Minimal fix direction：将当前 child 的 error 路径导入与 termination-fence 相同的收口机制；除非有明确证据表明 child 从未创建或已有退出状态，否则不能把 error 当作终止证明。只有收到 `exit` 或明确状态证据后才清理/释放 fence 并允许下一 generation；同时保护二次 kill 的 error，不产生 unhandled error。保留 stale generation guard，修复限定在当前允许的 process manager 与目标测试。
    - Required test：构造 ready child，在 cancel/timeout 时让 `kill()` 返回 `false` 并发出 `error`，但不发出 `exit`；断言 active slot、`waitForIdle()` 和 `start()` 仍受 fence 约束，退出前不得启动第二 generation，发出 `exit` 后才允许下一 generation。另验证 send/kill error without exit 不会崩溃或产生 unhandled error。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 4 的 process error/termination lifecycle mechanical implementation finding；最小修复仅触及当前 Allowed Files 的 `analyzerProcessManager.js` 与 `tests/codexRolloutCollector.test.js`，不需要扩大范围、修改共享契约、改变产品入口或恢复暂停任务。
    - Ownership evidence：live `CURRENT_TASK.md` 步骤 4 明确要求 child error、取消/超时和 generation restart 均经过终止确认后才能释放 active 状态或创建新 generation，并将 process manager 与目标测试列为 Allowed Files；本次 `review-implementation` 在同一 diff target 下给出上述 `EPERM`/no-exit 可复现结果；已读取 `TASKS/paused/**`，其中仅有 IPC/Owner 任务且无匹配 Node collector owner，`TASKS/interrupted/**` 不存在。
    - Handoff：review-diff。
    - Resolution：post-spawn child `error` 不再被视为 worker 已退出；error failure cleanup 前先建立 termination fence，等待 `exit` 或明确退出状态证据后才释放，termination wait 期间吸收后续 kill error，避免无退出证据时发生 generation overlap 或 unhandled error。
    - Verification：新增 `kill()=false + EPERM error + no-exit` synthetic-child 回归；退出前 `waitForIdle()` 与 `start()` 均受 fence 约束，退出后才允许下一 generation，且无未处理异步 error。步骤 4 lifecycle focused suite `25/25` PASS，允许 Node collector JS、目标测试和 fake fixture `node --check` 全部通过。

  - Finding ID：RI-4.5-004-012
    - Severity：P1（major）
    - Source：`review-implementation`（2026-08-29；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；已排除该提交中已提交的两个 workflow review skill 文件）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analyzerProcessManager.js:365-381,468-484` / current child error wiring、`AnalyzerProcessManager.send`
    - Failure scenario：`stdin.write()` 已返回后，Rust child 的 `stdin` 流异步发出 `EPIPE` 或 `ERR_STREAM_DESTROYED`，但 child 仍存活；当前实现没有监听 `child.stdin` 的 `error` 事件，错误不会进入统一的 process-unavailable、request settlement 或 generation invalidation 路径，可能形成未处理异步异常。
    - Why current implementation fails：当前只注册了 `child.on('error')`，而 stdio writable stream 的错误由 `child.stdin` 自身发出；`send()` 的 `try/catch` 只能捕获同步 `write()` 异常，不能覆盖异步 stream error。
    - Minimal fix direction：为每个 generation 注册带 child/generation guard 的 `stdin` error handler，将 `EPIPE`/`ERR_STREAM_DESTROYED` 规范化为 `ANALYZER_PROCESS_NOT_RUNNING`，并复用现有 request rejection、termination fence、stale event 和 listener cleanup 路径；不得把 stream error 当作进程已退出证据。
    - Required test：构造 ready child，在一次成功返回的 `stdin.write()` 之后异步发出 stdin `EPIPE`/`ERR_STREAM_DESTROYED`，分别覆盖仍未发出 `exit` 与随后发出 `exit`；断言不会产生 unhandled error，active/fence/retry 状态正确，旧 generation 不得被复用或污染下一 request。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 4 的 process communication/lifecycle mechanical finding；最小修复仅触及当前步骤 Allowed Files 的 `analyzerProcessManager.js` 与目标测试，不需要扩大 scope、修改共享契约、改变产品入口或恢复暂停任务。
    - Ownership evidence：live `CURRENT_TASK.md` 将步骤 4 定义为 coordinator/process 单飞、取消、deadline 和 generation 隔离，并允许 process manager、fake analyzer 与目标测试；`review-implementation` 在同一 Node working tree 对 `send()`/child wiring 给出具体定位和异步 stream error 复现；已读取 `TASKS/paused/**`，仅有 IPC/Owner 任务且无匹配 Node collector owner，`TASKS/interrupted/**` 不存在。
    - Resolution：为每个 process generation 注册 `child.stdin` 的 error handler；`EPIPE`/`ERR_STREAM_DESTROYED` 统一规范化为 `ANALYZER_PROCESS_NOT_RUNNING`，并复用 process failure、termination fence、stale guard 和后续 kill error 吸收路径，不把 stream error 当作退出证明。
    - Verification：新增并通过 `EPIPE` 与 `ERR_STREAM_DESTROYED` 的异步 stdin error 场景；旧 child 未收到 `exit` 前 `waitForIdle()`/`start()` 继续受 fence 约束，退出证据到达后才创建下一 generation；允许 Node JS/fixture `node --check` 全部通过，相关 lifecycle focused selection `23/23` PASS。
    - Handoff：review-diff。

  - Finding ID：RI-4.5-004-013
    - Severity：P1（major）
    - Source：`review-implementation`（2026-08-29；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；已排除该提交中已提交的两个 workflow review skill 文件）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/index.js:248-264,520-540` / `_dispatchIntent`、`_awaitWithDeadline`，以及 process manager 的 `waitForIdle()` termination fence
    - Failure scenario：cancel/timeout 后 child 不发出 `exit`，但先返回 nonfatal `error(code=cancelled/timeout)`；process manager 因该 error 允许 settled tracker 进入 `_finishRequest`，释放 active slot/fence，下一 analyze 可能在旧 child 仍存活时复用同一 generation。
    - Why current implementation fails：`_handleMessage(error)` 对已 settlement 的 request 仍可进入错误收口，并在未获得 child `exit`/退出状态证据时调用 `_finishRequest`；`error` 响应本身不是物理终止证明。因此 cancel/timeout 的公开 promise 虽可及时 reject，但内部 `runningIntent`、active request 与 termination fence 可能提前释放，违反单飞和 fail-closed 生命周期边界。
    - Minimal fix direction：继续拆分 public intent settlement 与内部 process drain；cancel/timeout 的 nonfatal error 只能结算调用方，不能在无退出证据时清除 active slot、running intent 或 termination fence。保留旧 child 的阻塞直到 `exit`/明确退出状态证据，再释放槽位并允许下一 generation/intent。
    - Required test：注入 cancel/timeout 后返回 nonfatal error 但永不自动退出的 child；断言公开 `analyze()` 在有限时间内以稳定错误结算，同时在退出证据前 active request、`runningIntent`、`waitForIdle()` 和下一 analyze 仍受阻，且不复用同一 live child；补发 `exit` 后才允许收口并继续下一请求。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 4 的 coordinator/process lifecycle mechanical finding；最小修复限定在当前 Allowed Files 的 `index.js`、process manager 与目标测试，不需要扩大 scope、修改共享契约或改变产品入口。
    - Ownership evidence：live `CURRENT_TASK.md` 步骤 4 明确要求 cancel/deadline 后的 active 槽位收口及未终止 worker 不得启动并行 generation；coordinator contract draft 要求取消/超时按终态处理且旧 worker 未释放时不得并行，`review-implementation` 通过 no-exit manager stub 复现了 public promise 长期 pending；已读取的 paused/interrupted 包无匹配 Node collector owner。
    - Resolution：failure intent 先向调用方结算稳定 cancel/timeout 错误，再等待 process manager 的 idle/termination fence；成功路径保留原有 idle 后 resolve 顺序。deadline stop 改为立即发起、由内部 fence 异步收口并吸收 stop rejection，避免 no-exit worker 无限延迟调用方结算，同时继续阻止 pending intent 越过未收口 worker。
    - Verification：新增 cancel/timeout 后 worker 不 drain 的 coordinator 场景；公开请求在有限时间内结算，退出证据前 pending 不 dispatch，释放 worker 后下一请求才执行并完成。相关 lifecycle focused selection `23/23` PASS，允许 Node JS/fixture `node --check` 全部通过。
    - Verification update（修复前探针记录）：`review-implementation` 对 error-without-exit transition 做了只读 fake analyzer probe：cancel 后调用方以 `ANALYZER_REQUEST_CANCELLED` reject，但 `activeRequest=false`、`runningIntent=false`、`processInvalidation=false`，child 仍存活，随后 `analyze` 返回 `true` 并复用 generation 1/同一 child；观察时旧 child 尚未 exit。该路径仍允许 live worker 与下一请求重叠；该问题已由后续 verification repair 修复。
    - Review mode：verification
    - Review epoch：`20260828-001/step-7`
    - Fingerprint：`rfp-v1|acceptance=process-lifecycle|owner=node-collector-process-manager|resource=cancel-timeout-error-without-exit|transition=cancelled-request-to-termination-fence|failure=nonfatal-cancel-error-releases-live-worker`
    - Fingerprint components：acceptance=`process-lifecycle`；owner=`node-collector-process-manager`；resource=`cancel-timeout-error-without-exit`；transition=`cancelled-request-to-termination-fence`；failure=`nonfatal-cancel-error-releases-live-worker`
    - Caused by：none（修复后的 transition verification 已收口；`repair_base=unknown`，不声明 direct regression）
    - Blocking：false
    - Scope ownership：resolved/current-step
    - Provenance：unknown；没有中间 checkpoint 或可重放的 repair base，不能确认该路径是本轮修复直接引入。
    - Evidence kind：runtime_reproduction
    - Evidence basis：当前 diff、`analyzerProcessManager.js` 的 `_handleMessage(error)`/`_finishRequest` 路径和 fake analyzer cancel probe；error response 没有被当作退出证据的独立证明。
    - Repair base：unknown
    - Repair attempts：2（本轮完成第二次 verification repair；达到默认上限，后续若验证失败必须转 investigate-root-cause）
    - Admission：admitted（accepted_finding_resolved，原 `RI-4.5-004-013` 已收口）
    - Migration source：legacy-finding
    - Recommended route：`current_task_owned`（已收口，转 `sync-status`）
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 7 仍必须满足的 process lifecycle mechanical finding；最小修复限定在步骤 7 Allowed Files 的 process manager/coordinator 与目标测试，不需要扩大范围、修改 Rust/source、共享契约或产品入口。
    - Ownership evidence：live `CURRENT_TASK.md` 将 cancel/timeout、generation、single-flight 和 typed error settlement 列为步骤 7/既有生命周期边界，Allowed Files 包含 `analyzerProcessManager.js`、`index.js`、fake analyzer 和目标测试；`review-implementation` 提供了 error-without-exit 的直接进程复现；已读取 `TASKS/paused/**`，无匹配 Node collector owner，`TASKS/interrupted/**` 不存在。
    - Resolution update：`_handleMessage(error)` 在检测到 tracker 已进入 cancel/timeout settlement 且错误仍为 nonfatal 时，不再调用 `_finishRequest`；保留 active request、request map 和 cancel grace timer，直到 child `exit`/退出状态证据由现有 termination path 收口，避免 live worker 与下一 request 重叠。
    - Verification update：新增真实 fake analyzer 的 cancel 与 timeout 非致命 error-without-exit 场景；调用方在有限时间内分别收到 `ANALYZER_REQUEST_CANCELLED`/`ANALYZER_REQUEST_TIMEOUT`，退出证据前 active/request/tracker 仍占用且下一 request 返回 `ANALYZER_REQUEST_ACTIVE`，手动补发 exit 后才释放。target/process/collector 相关 selection `58/58` PASS，允许文件 `node --check`、`git diff --check` 通过；后续 review-diff、review-implementation、verify-contracts 与 required-now regression 均通过。
    - Handoff：sync-status。

  - Finding ID：RI-4.5-004-014
    - Severity：P1（major）
    - Source：`review-implementation`（2026-08-29；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；已排除该提交中已提交的两个 workflow review skill 文件）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analyzerProcessManager.js:755-779` / batch callback failure、negative ACK 与 request release
    - Failure scenario：Node 的 batch callback/import/staging 失败时，negative ACK 使用 `error.message` 而不是协议允许的稳定 rejection code；即使 ACK 写入成功，当前实现也会在 Rust 返回匹配的 `error(code=batch_rejected)` 前立即 reject tracker 并释放 active request，下一 analyze 可能越过 Rust 当前 request 的终态。
    - Minimal fix direction：在步骤 6/7 将本地失败映射到稳定 ACK rejection code；负 ACK 后保留 request/active 槽位，等待匹配的 Rust `batch_rejected` error 或进程终止，再完成内部释放；调用方结算与该终止等待应分离。
    - Required test：注入 importer/staging generic error、非法 batch 和 ACK 写入错误；断言负 ACK 字段始终是稳定 code，Rust error terminal 到达前不能发送下一 analyze，fatal/nonfatal 与 process termination 路径分别正确处理。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`，延后至步骤 6/7）。
    - Ownership assessment：该 finding 属于当前 Node 4.5 任务，但不属于当前步骤 4 的已完成 process-only 门禁；其最小修复位于步骤 6/7 已允许的 process manager、coordinator、importer 与目标测试范围，当前已在步骤 7 实施，不倒灌修改步骤 4。
    - Ownership evidence：live `CURRENT_TASK.md` 将 batch staging/receipt 与 ACK/complete transaction 分别列为步骤 6/7，且明确要求负 ACK 后等待 Rust `batch_rejected` 终态；当前步骤 4 的 focused suite 尚未启用完整 importer 失败链，`review-implementation` 已通过静态路径确认顺序和稳定 code 风险；无匹配 paused/interrupted Node collector owner。
    - Resolution：本地 importer/callback 异常先映射到稳定的 `batch_validation_failed`、`batch_scope_conflict` 或 `staging_unavailable`；negative ACK 成功写出后保留 tracker 和 active slot，直到同 request 的 Rust `error(code=batch_rejected, details.rejection_code=...)` 到达或 process termination 证据成立。ACK 写入失败走 process invalidation；`staging_unavailable` 终态带回原 delivery pair，由 coordinator 在预算内用同一 `job_id`、新 `request_id` 重试。
    - Verification：新增 generic staging/importer failure、非法 batch、延迟 `batch_rejected`、ACK 顺序和同进程 staging retry 测试；步骤 7 required-now target/process/collector selection `58/58` PASS，`review-diff`、`review-implementation`、`verify-contracts` 与 diff-aware regression 均通过，稳定 negative ACK code、Rust terminal 前 single-flight、ACK-before-receipt 与 staging retry 语义已验证。
    - Handoff：sync-status。

  - Finding ID：RI-4.5-004-015
    - Severity：P1（major）
    - Source：`review-implementation`（2026-08-29；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；已排除该提交中已提交的两个 workflow review skill 文件）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analyzerProcessManager.js:798-805`、`src/services/codexRolloutCollector/index.js:387-403` / Rust `error.fatal` 处理与 retry mapping
    - Failure scenario：Rust 返回 `error` 且 `fatal=true` 后，manager 仅 reject 当前 request 并释放 tracker；coordinator 的 restart 判定只识别 process exit/not-running，不封存当前 generation、不重建 Rust child、不重新 hello，后续 request 可能继续复用已失效 generation。
    - Minimal fix direction：在步骤 7 将 `fatal=true` 作为 process-level failure：封存 generation、终止/回收 child、等待 termination fence、建立新 generation 并完成 hello；仅在 `retryable=true` 且仍有预算时恢复 job，unsupported capability 等不可重试 fatal 不得盲目循环。
    - Required test：覆盖 `fatal=true`/`fatal=false`、retryable/non-retryable、旧 generation late batch/complete/error 和新 hello gate；断言 fatal 后不发送新的 analyze 到旧 child，且重试次数受预算限制。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`，延后至步骤 7）。
    - Ownership assessment：该 finding 属于当前 Node 4.5 任务的 typed error/generation recovery，由步骤 7 明确承接，不作为步骤 4 当前 focused lifecycle 的失败归因；最小修复已在步骤 7 Allowed Files 内完成，无需扩大 scope、修改共享契约或改变产品入口。
    - Ownership evidence：live `CURRENT_TASK.md` 将 stable error mapping、fatal recovery 和 bounded restart 列为步骤 7 输出；coordinator contract draft 明确要求任意 `fatal=true` 立即封存并重建 generation，当前代码路径未实现该语义；无匹配 paused/interrupted Node collector owner。
    - Resolution：manager 对 `fatal=true` error 先使当前 generation 失效并建立 termination fence；coordinator 等待旧 child 终止、启动新 generation 并通过 hello gate 后，才允许后续 analyze。只有 `retryable=true` 且预算未耗尽时，才用同一 `job_id`、新 `request_id` 重试；不可重试 fatal 只回收 generation，不循环重试。
    - Verification：新增 retryable fatal 的 generation 1→2 重试、nonretryable fatal 的回收后下一 intent 新 generation、typed nonfatal 不重启和 request identity 断言；步骤 7 required-now target/process/collector selection `58/58` PASS，`review-diff`、`review-implementation`、`verify-contracts` 与 diff-aware regression 均通过。旧 generation late-message 的更完整故障矩阵和真实 Rust smoke 留给步骤 8。
    - Handoff：sync-status。

  - Finding ID：RI-4.5-004-016
    - Severity：P3（deferred；runtime low impact，verification impact medium）
    - Source：`run-regression`（2026-08-29；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；已排除该提交中已提交的两个 workflow review skill 文件）
    - Status：deferred/current_task_owned
    - File / symbol：`tests/codexRolloutCollector.test.js:2233-2270` / `collector bounds initial hello startup by the intent deadline`；`src/services/codexRolloutCollector/index.js:248-278` / `_dispatchIntent`
    - Failure scenario：Rust analyzer 尚未完成 hello 时请求达到 deadline；`collector.analyze()` 已按预期以 `ANALYZER_REQUEST_TIMEOUT`（startup phase）对外结算，但旧测试立即断言 `collector.runningIntent === null`。此时旧 child 的 termination fence 仍在等待退出证据，`runningIntent` 按步骤 4 的 fail-closed 语义暂时保留，因此测试收到 intent 对象而不是 `null`。
    - Why current implementation differs：步骤 4 的 `RI-4.5-004-013` 已将 public request settlement 与 worker drain 解耦；失败请求先让调用方得到稳定 timeout，随后才等待 `waitForIdle()`/process termination fence，再释放 `runningIntent`。该测试仍混合了“调用方已失败”和“内部 worker 已收口”两个时刻。
    - Business impact：当前请求的 startup timeout 已正确返回；正常 Rust child 可退出时，后续请求只增加短暂 drain 等待，不会发生旧 generation 与新请求重叠。当前 Node collector 仍是隔离 artifact，尚未接入产品入口。异常 child 长时间不退出时，后续 intent 可能继续排队，这是既定 fail-closed 保护的可用性代价，而不是该测试断言本身造成的新数据一致性风险。
    - Minimal fix direction：暂不修改运行时 fence。重新处理时，将测试拆成“timeout 在 deadline 内对外返回”“退出证据前 `runningIntent` 仍保留”“`waitForIdle()`/exit 后才释放”三段断言；不得通过 timeout 后立即清空 `runningIntent` 来消除测试失败，除非先重新确认步骤 4 单飞/generation 契约。
    - Required test：保留延迟 hello + 短 timeout 场景；验证无 analyze 发送、返回 `ANALYZER_REQUEST_TIMEOUT` 且在预算内、旧 child 未确认退出前不启动下一 generation，退出后 `runningIntent`/active slot 才释放。
    - Diagnostic keywords：`collector bounds initial hello startup by the intent deadline`、`ANALYZER_REQUEST_TIMEOUT`、`phase=startup`、`runningIntent` 非 `null`、`completionPromise` pending。
    - Reopen conditions：出现真实请求在 child 已有 exit/终止状态后仍长期保留 `runningIntent`；timeout 后后续 intent 持续无法调度；termination drain 超过既定容忍窗口；或步骤 4 最终 merge gate 要求全量测试全绿时重新纳入修复。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 4 的测试/生命周期语义对齐问题，定位和最小修复均在当前 Allowed Files 内；用户已明确选择暂缓，不改变现有 fail-closed runtime 行为。
    - Ownership evidence：live `CURRENT_TASK.md` 将步骤 4 的 cancel/timeout settlement 与 termination fence 列为当前边界；`run-regression` 同一 diff target 的实际结果为 targeted lifecycle `23/23` 通过、该测试单独失败，且其余 26 项属于步骤 5～7 已知迁移缺口；`TASKS/paused/**` 仅有 IPC/Owner 任务，`TASKS/interrupted/**` 不存在，无匹配 suspended owner。
    - Recommended route：`current_task_owned`（用户明确 deferred）。
    - Handoff：deferred；不自动进入 `implement-current-step`，满足 reopen conditions 或最终 merge gate 前再由 `investigate-root-cause`/当前步骤修复链处理。

  - Finding ID：RD-4.5-005-001
    - Severity：P1（major）
    - Source：`review-diff`（2026-08-29；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；provenance：unknown）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analysisCheckpointStore.js:48-56,235-239,322-330` / `scopeHash`、File/Memory `save`
    - Failure scenario：调用方提供带 `job_id`/`request_id` 的 scope 后，`save()` 先将 scope 规范化为 `conversation_id + source_id + source_epoch`，再读取既有 checkpoint。相同 conversation/source 下，job B 的低进度保存可能返回 job A 的 checkpoint；job B 的更高进度又可能覆盖 job A。这样既可能把错误 job 的恢复证据返回给调用方，也可能破坏不同业务意图之间的 checkpoint 隔离。
    - Minimal fix direction：明确 target checkpoint 的稳定存储身份：`job_id` 应参与隔离 key，`request_id` 只作为当前 attempt 的一致性校验而不参与跨重试恢复 key；或者在单调性比较前对既有 payload 的 job identity 做 fail-closed 拒绝。File/Memory 必须保持同一语义，后续 importer/coordinator 传入同一稳定 job scope。
    - Required test：Memory/File 均覆盖同一 source scope 下 job A→job B 的低进度和高进度保存；断言均拒绝且不返回/覆盖另一 job 的 checkpoint；同时覆盖同一 job 使用新 `request_id` 的合法重试恢复，以及显式错误 request identity 的拒绝。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 5 的 checkpoint store mechanical implementation finding；最小修复仅位于步骤 5 已允许的 `analysisCheckpointStore.js` 与目标测试，不需要扩大范围、修改 Rust、产品入口或长期契约。
    - Ownership evidence：live `CURRENT_TASK.md` 明确步骤 5 允许 checkpoint/run store 与 `tests/codexRolloutCollector.test.js`，并要求“跨 job/request/source 拒绝”、同一重试保留 job/scope；`review-diff` 已在上述 store 路径复现跨 job 结果污染；已读取 `TASKS/paused/**`，其中仅为 IPC/Owner 任务，无匹配 Node collector owner，`TASKS/interrupted/**` 不存在；当前 live task 持有唯一 active ownership。
    - Resolution：File/Memory checkpoint store 在单调性比较前读取既有 source-scope checkpoint，并拒绝其 `job_id` 与新 checkpoint 不一致；同一 `job_id` 更换 `request_id` 仍可恢复和推进，跨 job 不再返回或覆盖既有证据。
    - Verification：步骤 5 target checkpoint focused test 在 Memory/File 上覆盖 job A→job B 的低/高进度拒绝、同 job 新 request 合法推进和错误 request 拒绝；`node --test --test-name-pattern="target checkpoint stores validate scope" tests/codexRolloutCollector.test.js` 通过。
    - Handoff：review-diff。

  - Finding ID：RD-4.5-005-002
    - Severity：P2（moderate）
    - Source：`review-diff`（2026-08-29；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；provenance：unknown）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analysisCheckpointStore.js:59-97,322-330`、`src/services/codexRolloutCollector/analysisRunStore.js:149-180,341-370` / `normalizeCheckpoint`、`normalizeRunRecord`
    - Failure scenario：checkpoint 通过完整 clone，run record 通过 `...clone(value)` 保留未知字段；因此传入的 `source_spec`/`sourceSpec`、`replay`、`discovery` 或其他禁止 legacy 字段会进入 Memory/File artifact。当前 target wire 没有因此立即发送旧字段，但持久化/恢复边界已经不再满足“禁止 legacy 字段持久化”，后续恢复代码可能重新消费旧 source 语义。该 finding 是存储边界问题，不是此前已否决的 nested `replay` 业务影响问题。
    - Minimal fix direction：对已知禁止 legacy 字段执行显式 scrub 或拒绝；未知 additive 字段若必须保留，只能放入明确的 opaque compatibility metadata 容器；允许保留的 fingerprint/prefix/revision 也不得参与进度、排序或 scope 判定。
    - Required test：Memory/File checkpoint 与 run store 均传入 `source_spec`、`sourceSpec`、`replay`、`discovery`、`retention_profile` 和泛化 `revision`，重启后断言禁止字段不在 artifact 中；同时确认允许的 opaque metadata 不参与 checkpoint 单调性和 identity 校验。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 5 的 legacy persistence mechanical implementation finding；最小修复仅位于当前 Allowed Files 的 checkpoint/run store 与目标测试，不需要扩大范围、修改 Rust、产品入口或长期契约。
    - Ownership evidence：live `CURRENT_TASK.md` 的验收标准明确要求 Node 不持久化 `source_spec`、`discovery` 等 legacy 字段，步骤 5 明确只允许旧 fingerprint/prefix/revision 作为 opaque metadata；`review-diff` 的内存 probe 已确认 legacy 字段可被保存和读回；已读取 `TASKS/paused/**`，无匹配 Node collector owner，`TASKS/interrupted/**` 不存在；当前 live task 持有唯一 active ownership。
    - Resolution：checkpoint/run record normalization 在 Memory/File 写入前显式清理已知 envelope 级 `source_spec`/`sourceSpec`、`replay`、`discovery`、`retention_profile` 和泛化 `revision`；保留的 fingerprint/prefix 仍仅作为 opaque metadata，未递归解释 nested unknown 字段。
     - Verification：步骤 5 target checkpoint/run focused test 在 Memory/File 重启后断言禁止字段不出现在 checkpoint、run、result 或 checkpoint artifact 中，并确认 fingerprint/prefix 仍可保存；`node --test --test-name-pattern="target run stores persist attempts" tests/codexRolloutCollector.test.js` 通过。
     - Handoff：review-diff。

  - Finding ID：RI-4.5-005-003
    - Severity：P1（major）
    - Source：`review-implementation`（2026-08-29；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；provenance：unknown）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analysisCheckpointStore.js:271-296,359-373` / File/Memory `save`
    - Failure scenario：同一 source scope 的高进度与低进度 checkpoint 并发保存时，File store 的两个调用都可能先读取同一旧值，再分别通过 `checkpointAdvances()`，最后由低进度调用覆盖高进度结果；并发写入还可能在 Windows rename 阶段失败。只读并发探针执行 50 轮，出现低进度最终值 `29/50`，另有 `4` 次写入错误。
    - Why current implementation fails：File `save()` 的 `load → monotonicity compare → temporary write → rename` 没有 per-scope serialization 或 compare-and-swap；单次 atomic rename 不能保护整个读改写事务。Memory 当前同步 Map 操作未复现相同回退，但 File/Memory 没有共享的并发语义保护。
    - Minimal fix direction：为 checkpoint scope 增加 promise queue/互斥临界区，覆盖读取、job identity 检查、单调性比较和最终写入；保留临时文件原子替换，并使 Memory/File 对相同并发序列保持一致语义。
    - Required test：Memory/File 并发提交高低 completeness、source progress 和相同 progress 的 checkpoint；断言最终 checkpoint 不回退、不跨 job 污染、无 rename 错误，并验证不同 scope 仍可并行。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 5 的 checkpoint store mechanical implementation finding；修复仅需触及步骤 5 Allowed Files 的 `analysisCheckpointStore.js` 与目标测试，不需要扩大范围、修改 Rust、契约或产品入口。
    - Ownership evidence：live `CURRENT_TASK.md` 步骤 5 明确要求 Memory/File checkpoint 按 completeness/source progress 单调推进；`review-implementation` 在当前 diff target 上通过只读并发探针复现 File store 回退和写入错误；已读取 `TASKS/paused/**`，仅有 IPC/Owner 任务，无匹配 Node collector owner，`TASKS/interrupted/**` 不存在；当前 live task 持有唯一 active ownership。
    - Resolution：File/Memory checkpoint store 通过按 conversation scope 的 promise queue 串行化完整的 load、job identity 校验、单调性比较和最终写入/删除流程；File 仍保留临时文件 + atomic rename，不同 conversation 使用不同 queue key，未改变 store API 或导出。
    - Verification：新增 Memory/File 同一 scope 高低进度并发保存回归；两次保存均 fulfilled，最终恢复 canonical end `20`、logical item count `2`，无 rename error。步骤 5 finding focused tests `2/2`、target focused suite `29/29` 通过，允许 JS `node --check` 和 `git diff --check` 通过。
    - Handoff：review-diff。

  - Finding ID：RI-4.5-005-004
    - Severity：P1（major）
    - Source：`review-implementation`（2026-08-29；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；provenance：unknown）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analysisRunStore.js:355,424-520` / `atomicWriteJson`、`BaseAnalysisRunStore.begin/update/complete/fail`；异步 batch 更新接线：`src/services/codexRolloutCollector/index.js:369-383`
    - Failure scenario：同一 run 的 receipt/batch progress、retry 或 terminal transition 并发更新时，多个调用基于同一旧 run 快照写入，导致较新的 `batches`/receipt/request/generation 丢失；超时或取消后的迟到 batch 回调还可能用旧快照重写失败状态。只读并发探针对同一 run 执行 30 轮：Memory store `30/30` 出现 stale progress，File store 出现 `10/30` 次 stale progress 和 `10` 次写入错误。
    - Why current implementation fails：`update()` 先 `await get()`，再合并 patch 并写入；`begin()`、`complete()`、`fail()` 也采用相同的读改写分段。`atomicWriteJson()` 只保护单次文件替换，不保护读改写事务。当前 process manager 对 batch callback 使用独立异步链，步骤 7 接通持久化后该窗口会真实存在。
    - Minimal fix direction：为 run_id 增加 promise queue/互斥临界区，覆盖 `begin/update/complete/fail` 的完整读改写流程；串行化后重新检查 status/identity，保证 completed 终态不被旧快照降级，保留 File atomic write 作为半写入保护。
    - Required test：Memory/File 并发更新 batches、receipt、retry_count、request/generation，并交错 `complete()`/`fail()`/迟到 update；断言不丢进度、completed 不降级、失败终态不被旧快照重开、重启后文件内容一致，且不同 run_id 仍可并行。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 5 的 run store mechanical implementation finding；最小修复限定在步骤 5 Allowed Files 的 `analysisRunStore.js` 与目标测试，`index.js` 仅作为已存在的失败触发证据，不需要修改 coordinator、契约或产品入口。
    - Ownership evidence：live `CURRENT_TASK.md` 步骤 5 要求 run store 保存 receipt/batch progress、retry 和 terminal result；`review-implementation` 已在当前 diff target 上复现 Memory/File 的读改写丢失；`TASKS/paused/**` 无匹配 Node collector owner，`TASKS/interrupted/**` 不存在；当前 live task 持有唯一 active ownership。
    - Resolution：File/Memory run store 通过按 `run_id` 的 promise queue 串行化 `begin/update/complete/fail` 的完整读改写事务；对 attempt、retry、generation、batch 和 receipt counters 保持单调进度，并在 stale patch 不推进 batch counter 时保留最新 batch/segment id；File 仍保留 atomic write，未改变 store API 或导出。
    - Verification：新增 Memory/File 并发 batch/receipt progress 与迟到 failure update 回归；最终 progress 保留最新 counter/IDs，failure terminal 状态和 retry count 保留，所有并发操作 fulfilled。步骤 5 finding focused tests `2/2`、target focused suite `29/29` 通过，允许 JS `node --check` 和 `git diff --check` 通过。
    - Handoff：review-diff。

  - Finding ID：RI-4.5-005-005
    - Severity：P1（major）
    - Source：`review-implementation`（2026-08-29；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；provenance：unknown）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analysisRunStore.js:274-287,310-327,481-512,518-541` / `assertPatchIdentity`、`assertBeginIdentity`、`BaseAnalysisRunStore.begin/update`
    - Failure scenario：当前 run 为 `request-new / attempt=2 / process_generation=2` 时，迟到的旧回调以 `request-old / attempt=1 / process_generation=1` 调用 `begin()` 或 `update()`；结果仍保留数值字段 `attempt=2/process_generation=2`，但 `request_id` 被覆盖为 `request-old`。Memory 和 File store 均可复现。
    - Why current implementation fails：`assertPatchIdentity()` 未校验 `request_id` 与 attempt/generation 的关系；`begin()` 仅对数值字段取最大值，却无条件写入新的 `request_id`。因此持久化记录可能组合出“新代际 + 旧 request”的非法 identity，破坏 stale generation 的隔离和恢复关联。
    - Minimal fix direction：将 `request_id` 与 attempt/process_generation 作为一致性组校验；只有伴随严格更高 attempt 或 generation 的新 request 才允许切换，低代际或同代际不同 request 的 `begin/update` 必须拒绝或保持当前记录。保留同一 job/scope 的合法重试语义。
    - Required test：Memory/File 均覆盖新 request 高代际后旧 `begin()`、旧 `update()`、同代际换 request 和合法新 attempt；断言旧调用不能改变 request/attempt/generation 组合，合法重试仍可更新 request。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 5 的 run store identity mechanical implementation finding；最小修复仅需触及步骤 5 Allowed Files 的 `analysisRunStore.js` 与 `tests/codexRolloutCollector.test.js`，不需要扩大范围、修改 Rust、契约或产品入口。
    - Ownership evidence：live `CURRENT_TASK.md` 步骤 5 要求 run store 保存并隔离 job/request/attempt/generation，步骤 5 Allowed Files 包含上述 store 与目标测试；`review-implementation` 在同一 diff target 上通过 Memory/File 直接 probe 复现 request identity 与代际不一致；已读取 `TASKS/paused/**`，仅有 IPC/Owner 任务且无匹配 Node collector owner，`TASKS/interrupted/**` 无候选；当前 live task 持有唯一 active ownership。
    - Resolution：`analysisRunStore.js` 现在把 `request_id` 与 `attempt/process_generation` 作为一致性组校验；旧 request 不能以低代际或同代际身份覆盖当前记录，同一 request 不能推进 attempt/generation，只有严格推进代际的新 request 才能切换。省略 request id 的既有更新保留当前 request，避免默认 run id 改写 retry identity。
    - Verification：Memory/File 均覆盖低代际旧 `begin/update`、同代际换 request、同 request 推进代际和合法更高 attempt retry；旧调用均返回 `ANALYSIS_RUN_SCOPE_MISMATCH`，合法 retry 保留并更新 request/attempt。`target run stores` focused tests `4/4`、target focused suite `31/31` 通过；允许文件 `node --check` 和 `git diff --check` 通过。
    - Handoff：review-diff。

  - Finding ID：RI-4.5-005-006
    - Severity：P1（major）
    - Source：`review-implementation`（2026-08-29；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；provenance：unknown）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analysisRunStore.js:329-336,518-600` / `assertStatusTransition`、`BaseAnalysisRunStore.update/complete/fail`
    - Failure scenario：run 已 `completed` 后，迟到 `update()` 携带 `status=completed`、旧 result、旧 request 和旧 batch 仍会成功写入；run 已 `failed` 后，迟到 `complete()` 还能直接将其改成 `completed`。Memory 和 File store 均可复现。
    - Why current implementation fails：`assertStatusTransition()` 只拒绝 `completed → 非 completed`，没有禁止 completed→completed 的 payload 改写，也没有禁止 `failed → completed`。`complete()` 只对 completed 做幂等保护；失败后的重新执行应由更高 attempt/generation 的新 `begin()` 表达，但当前入口没有这一门禁。
    - Minimal fix direction：completed 记录对普通 `update()` 保持不可变；`failed` 只能经带更高 attempt/generation 的新 retry begin 重新进入 running，旧 attempt 的 `complete/fail/update` 必须拒绝或保持已存终态；冲突 terminal result 不得覆盖已持久化结果。
    - Required test：Memory/File 覆盖 completed 后 stale update、冲突 complete、failed 后迟到 complete、failed 后旧 begin，以及合法新 attempt begin 后完成；断言 terminal result/status/retry evidence 不被旧调用改写。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 5 的 run terminal-state mechanical implementation finding；最小修复限定在步骤 5 Allowed Files 的 `analysisRunStore.js` 与目标测试，不需要改变公共协议、产品行为或范围边界。
    - Ownership evidence：live `CURRENT_TASK.md` 步骤 5 明确要求 retry/terminal result 持久化和 canonical/partial 不降级；`review-implementation` 在当前 diff target 上对 Memory/File store 直接复现 completed payload 被 stale update 覆盖及 failed→completed；已读取 `TASKS/paused/**`，无匹配 Node collector owner，`TASKS/interrupted/**` 无候选；当前 live task 持有唯一 active ownership。
    - Resolution：`completed` run 的普通 `update` 现在直接拒绝，`failed` run 的普通 `update` 也拒绝；对 completed/failed 的迟到 `complete/fail` 仅返回已持久化终态。failed run 只有通过更高 attempt 或 process generation 的新 request `begin` 才能重新进入 running，随后允许正常完成。
    - Verification：Memory/File 均覆盖 completed 后 stale update、冲突 complete、failed 后迟到 complete/旧 begin，以及合法新 attempt retry；终态 result/error/status/retry evidence 均保持不变。`target run stores` focused tests `4/4`、target focused suite `31/31` 通过；允许文件 `node --check` 和 `git diff --check` 通过。
    - Handoff：review-diff。

  - Finding ID：RI-4.5-005-007
    - Severity：P2（moderate）
    - Source：`review-implementation`（2026-08-29；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；provenance：unknown）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analysisRunStore.js:419-430` / `preserveMonotonicRunProgress`
    - Failure scenario：run 已保存 `batches=2/receipt_count=2/last_batch_id=batch-new` 后，旧回调只提交 `last_batch_id=batch-old,last_segment_id=segment-old` 而不提交 `batches`；结果计数保持 2，但 batch/segment identity 回退到旧值。
    - Why current implementation fails：batch ID 的保护条件仅在 patch 同时包含 `batches` 且该计数没有推进时触发。单独提交 ID 的 patch 可以绕过保护，造成计数、receipt 和 opaque recovery identity 不一致。
    - Minimal fix direction：将 batch/segment ID 与对应 progress 作为同一原子更新校验；没有合法进度推进时拒绝或保留当前 ID，并保持 Memory/File 语义一致。
    - Required test：Memory/File 均覆盖仅更新 `last_batch_id`、仅更新 `last_segment_id`、低计数携带旧 ID、同计数携带新 ID 和合法新 batch；断言旧 identity 不会覆盖最新记录。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 5 的 run progress mechanical implementation finding；修复仅需触及步骤 5 Allowed Files 的 `analysisRunStore.js` 与目标测试，不需要扩大范围或改变契约。
    - Ownership evidence：live `CURRENT_TASK.md` 步骤 5 要求保存 receipt/batch progress 和恢复 evidence；`review-implementation` 通过 Memory store 直接 probe 复现 counter 与 batch ID 不一致，File 使用同一 `BaseAnalysisRunStore` 逻辑；已读取 `TASKS/paused/**`，无匹配 Node collector owner，`TASKS/interrupted/**` 无候选；当前 live task 持有唯一 active ownership。
    - Resolution：batch/segment ID 现在与 batch counter 一起按原子进度处理；patch 未携带 `batches` 或 batch counter 未严格推进时，旧 callback 提交的 IDs 会保留当前值，避免 counter、receipt 和 opaque identity 不一致。
    - Verification：Memory/File 均覆盖仅提交旧 batch/segment ID 及已推进 batch 后的 stale ID；最新 `batches=2`、`receipt_count=2` 和 current IDs 保持不变。`target run stores` focused tests `4/4`、target focused suite `31/31` 通过；允许文件 `node --check` 和 `git diff --check` 通过。
    - Handoff：review-diff。

  - Finding ID：RD-4.5-005-003
    - Severity：P1（major）
    - Source：`review-diff`（2026-08-29；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；provenance：unknown）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analysisRunStore.js:604-642` / `BaseAnalysisRunStore.complete/fail`；调用侧 `src/services/codexRolloutCollector/index.js:438-457`
    - Failure scenario：旧 request 已将 run 标记为 failed，随后新 request 以更高 attempt/generation 重新 `begin()`；此时旧 attempt 仍以相同 `run_id` 调用 `complete()` 或 `fail()`，store 无法辨别调用来源，旧 complete 可以将当前 retry 错误完成，旧 fail 也可以改写当前 retry 的状态。
    - Why current implementation fails：`complete(runId, result)` 和 `fail(runId, error)` 只按 run key 读取当前记录，没有接收或校验 `request_id`、`attempt`、`process_generation`；failed→retry 后当前记录已经换成新 request，但迟到终态回调仍可直接作用于该记录。
    - Minimal fix direction：为 `complete/fail` 增加向后兼容的可选 request identity context，并在写入前复用当前 request/attempt/generation guard；协调器在步骤 7 传入当前 attempt identity，缺少匹配证据的旧终态回调必须拒绝或保持当前记录，不得完成新 retry。
    - Required test：Memory/File 均覆盖 failed→更高 attempt/generation 新 request begin→旧 complete、旧 fail，以及当前新 request 合法 complete；断言旧回调不能改变新 retry 的 status/result/error/retry evidence，并保持既有无 context 调用的兼容边界。
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）。
    - Scope ownership：current-step blocking；该风险直接破坏步骤 5 run store 的 request/attempt/generation 隔离和终态持久化。
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 5 的 run store mechanical implementation finding；最小修复路径仍在 `analysisRunStore.js` 与目标测试，调用侧只需在后续步骤 7 接线时传递已存在的当前 attempt identity，不需要扩大范围、修改 Rust、契约或产品入口。
    - Ownership evidence：live `CURRENT_TASK.md` 将步骤 5 Allowed Files 限定为 run/checkpoint store 与目标测试，并要求隔离 job/request/attempt/generation、retry 和 terminal result；`review-diff` 在当前 diff 上通过 Memory 只读 probe 复现 failed→新 retry 后旧 `complete()` 产生 `completed`/旧 result；`TASKS/paused/**` 和 `TASKS/interrupted/**` 无匹配 Node collector owner，当前 live task 持有唯一 ownership。
    - Evidence basis：当前 diff、`analysisRunStore.js`/`index.js` 调用路径和只读 Memory probe；无中间 checkpoint，不能把该问题归因到某一轮 patch。
    - Resolution：`BaseAnalysisRunStore.complete/fail` 增加向后兼容的可选 terminal identity context；传入 context 时要求 `request_id`、`attempt`、`process_generation` 完整且与当前 run identity 匹配，failed→retry 后旧 request 的 terminal callback fail-closed，未传 context 的既有调用保持原有终态幂等兼容边界。步骤 7 仍需在 coordinator 接线时传递当前 identity。
    - Verification：Memory/File 均覆盖 failed→更高 attempt/generation 新 request begin 后旧 `complete/fail` 被拒绝，以及当前 request 带完整 identity 合法 complete；新增 finding focused test `1/1`、`target run stores` focused tests `5/5`、步骤 5 focused tests `9/9`、target focused suite `32/32` 通过；允许 store/test `node --check` 与 `git diff --check` 通过；collector 全量 `54/81`，`27` 项失败且无取消/挂起，失败仍是已知 `RI-4.5-004-016` 与步骤 6/7 迁移缺口。
    - Handoff：review-diff。

  - Finding ID：`rfp-v1|acceptance=batch-legacy-field-boundary|owner=node-collector-importer|resource=target-batch-semantic-and-staging-payload|transition=validated-batch-to-staging-receipt|failure=nested-generic-revision-is-persisted-and-affects-redelivery-conflict`
    - Severity：P1（major）
    - Source：`review-diff`（2026-08-30；review mode：`discovery`；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；provenance：unknown）
    - Status：resolved/current_task_owned
    - File / symbol：`src/services/codexRolloutCollector/analysisBatchImporter.js:185-195,308,607,622,849-853,928` / `stagedPayloadOf`、`semanticPayloadOf`、`itemRecordOf`、`keyedRecordOf`、`applyTargetState`、`createStaging`
    - Failure scenario：target batch 中嵌套于 history metadata、mutation item、tool/outcome detail 或 projection 的泛化 `revision` 会通过已选中的 target 字段进入 semantic content hash 和 durable staging/state records。第一次 delivery 使用 `revision=1` 持久化后，同一 `job_id`/`segment_id`/`batch_id` 的重试仅将该值改为 `revision=2`，会被 receipt hash 判定为 content conflict 而不是 duplicate；同时该 legacy 字段仍会留在 staging、mutation 或 event artifact 中，违反 4.5 Node 不将 item/source revision 作为业务字段、持久化版本或覆盖条件的边界。
    - Why current implementation fails：importer 只过滤选定 target 字段的顶层键，并对这些字段执行完整深拷贝；`semanticPayloadOf` 的内容随后直接参与 `contentHash`，`itemRecordOf`、`keyedRecordOf`、`applyTargetState` 和 `createStaging` 又把包含未知嵌套字段的对象继续写入状态。Node protocol validator 允许这些嵌套 additive 字段，因此当前校验不会在进入语义哈希或 staging 前阻断它们。
    - Minimal fix direction：对已知 target 嵌套结构中的泛化 item/source `revision` 做显式业务字段归一化，使其既不参与 semantic hash，也不进入 durable target business records；如果确需保留原始值，只能放入明确的 opaque diagnostic metadata。保留 parser provenance 的 `wire_source_revision`，不要把它与泛化 `revision` 混同；nested `replay` 继续保持既定 no-op/不影响语义的处理，不在本 finding 中扩大范围。
    - Required test：构造包含 nested `revision` 的合法 target batch，覆盖 history metadata、mutation item、tool/outcome detail 和 projection 至少一条路径；断言 staging/state business records 不保存该字段，且同一 delivery 仅改变 nested revision 的重发仍按 duplicate 幂等处理而非 content conflict。另验证 `wire_source_revision` 仍作为 parser provenance 保留，并保持 nested `replay` 不改变语义的既有边界。
    - Review mode：discovery
    - Review epoch：`20260828-001/step-6/d1`
    - Fingerprint：`rfp-v1|acceptance=batch-legacy-field-boundary|owner=node-collector-importer|resource=target-batch-semantic-and-staging-payload|transition=validated-batch-to-staging-receipt|failure=nested-generic-revision-is-persisted-and-affects-redelivery-conflict`
    - Fingerprint components：acceptance=`batch-legacy-field-boundary`；owner=`node-collector-importer`；resource=`target-batch-semantic-and-staging-payload`；transition=`validated-batch-to-staging-receipt`；failure=`nested-generic-revision-is-persisted-and-affects-redelivery-conflict`
    - Repair mode：verification
    - Caused by：none
    - Blocking：false；步骤 6 的 legacy-field boundary 与 duplicate/conflict acceptance 已通过修复后验证
    - Scope ownership：resolved/current-step
    - Provenance：unknown；这是当前步骤实现基线上的 discovery finding，未声明为某次 repair 直接回归
    - Evidence kind：contract_violation
    - Evidence basis：当前 diff、`analysisBatchImporter.js` 的静态数据流、Node target validator 行为，以及 4.5 data contract 与 `AD-021` 对泛化 `revision` 的约束；无中间 checkpoint、无运行时回归归因
    - Repair base：unknown
    - Repair attempts：1
    - Admission：admitted
    - Migration source：none
    - Recommended route：`current_task_owned`（`queued_fixable_findings`）
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 6 的 importer semantic/staging mechanical finding；最小修复限定在步骤 6 Allowed Files 的 `analysisBatchImporter.js` 与 `tests/codexRolloutCollector.test.js`，不需要修改 Rust、source 层、共享契约或产品入口。
    - Ownership evidence：live `CURRENT_TASK.md` 将步骤 6 的 batch validate、semantic import、staging/receipt 和幂等冲突处理限定在上述 Allowed Files，并明确 importer 不依赖旧 revision/fingerprint gate；`review-diff` 提供了 nested revision 进入 hash 与持久化记录的可执行定位和失败场景；已读取 `TASKS/paused/**`，仅有 IPC/Owner 任务且无匹配 Node collector owner，`TASKS/interrupted/**` 无候选，当前 live task 持有唯一 active ownership。
    - Resolution：在 `normalizeTargetBatch` 通过现有 target validator 后，对进入 importer 的 target payload 递归移除泛化 `revision`；semantic hash、history/tool/outcome records、projection、mutation、staging 和 state 均使用归一化数据，parser provenance 的 `wire_source_revision` 保持不变，未改变 nested `replay` no-op 边界。
    - Verification：新增 Memory/File nested revision 回归；仅改变 nested revision 的相同 delivery 在重启后仍按 `duplicate` 处理，状态不含任意 `revision` 键且保留 `parser_provenance.wire_source_revision`；`target batch importer` focused tests `10/10` PASS，累计 target focused suite `42/42` PASS，两个允许文件 `node --check` PASS。
    - Handoff：sync-status

  - Finding ID：RI-4.5-008-001
    - Severity：P1（major）
    - Source：`review-implementation`（2026-08-31；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`）
    - Status：resolved/current_task_owned（第 2 次 verification repair 已完成并通过复核）
    - File / symbol：`src/services/codexRolloutCollector/analyzerProcessManager.js:798-850,895-918` / inbound batch 与 complete settlement；`tests/codexRolloutCollector.test.js:6030-6097` / duplicate delivery test；`tests/fixtures/codex-rollout-collector/fake-analyzer.js:358-381` / duplicate batch emission
    - Failure scenario：fake analyzer 在同一 stdout burst 中发送 stale batch、正常 batch 和重复 batch，并在收到第一个正 ACK 后立即发送 complete。Node 对 batch 回调使用独立异步链；第一个回调完成后 complete 可能释放当前 request，重复 batch 回调随后发现 request 已不是 current，因而不发送第二个正 ACK。重复交付虽可能已由 importer 幂等保存，但 valid duplicate delivery 的 ACK 证据不稳定。
    - Why current implementation fails：batch callback 没有在 complete 前形成 drain/barrier，complete settlement 可以先于已经接收的重复 batch callback；`fake-analyzer.js` 的立即 complete 使该窗口可复现。focused 测试单次通过不能证明该时序稳定：只读重复运行曾出现 `19/20`，把 fake complete 延迟 10ms 后通过，确认存在 observer timing race。
    - Minimal fix direction：保留每个已接受 duplicate batch 都必须得到 `accepted=true,persisted=true` 正 ACK 的语义；优先让 batch 处理/ACK 与 complete 之间形成确定性 drain，或串行化同一 request 的 inbound batch。若仅调整 fake/test 时序，必须仍能断言 duplicate 在 complete 前已被 ACK；若需要修改 `analyzerProcessManager.js`，先重新锁定步骤范围，不得静默放宽断言。
    - Required test：重复运行步骤 8 duplicate/stale 场景，断言 stale 不入 staging、每个 valid duplicate delivery 都收到正 ACK、complete 只在当前已接收 batch callback 收口后结算；覆盖 ACK 乱序、重复 receipt/range index 幂等和旧 generation guard。若修 manager，增加真实 manager 的 deterministic in-flight duplicate regression。
    - Review mode：verification
    - Review epoch：`20260828-001/step-8/d1`
    - Fingerprint：`rfp-v1|acceptance=target-fault-matrix|owner=node-collector-process-manager|resource=duplicate-batch-ack|transition=concurrent-batch-to-complete-settlement|failure=complete-settles-before-duplicate-ack`
    - Fingerprint components：acceptance=`target-fault-matrix`；owner=`node-collector-process-manager`；resource=`duplicate-batch-ack`；transition=`concurrent-batch-to-complete-settlement`；failure=`complete-settles-before-duplicate-ack`
    - Caused by：none（discovery finding；无可唯一确定的 repair base）
    - Blocking：true（直接阻止步骤 8 duplicate fault-matrix acceptance；不是后续 legacy gap）
    - Scope ownership：current_task_owned（当前回补窗口已重新开放既有 process manager）
    - Provenance：unknown；当前没有中间 checkpoint，不能把该竞态归因到某一轮 repair。
    - Evidence kind：runtime_reproduction
    - Evidence basis：当前 Node process manager 的 batch/complete 异步路径、fake analyzer 的 burst emission、目标测试断言，以及只读重复运行 `20` 次出现 `1` 次失败（另一次 `50` 次探针在第 `9` 次失败）；raw `processManager.on('message')` observer 在 complete 到达时只观察到 `1` 次 ACK，但 `analyze()` resolve 后 ACK 为 `2` 且 run status 为 completed，说明生产 `batchDrain` 已等待 callback，而现有测试 observer 早于 drain settlement，当前 required test 证据仍不稳定。未使用外部数据。
    - Repair base：unknown
    - Repair attempts：2
    - Admission：admitted（accepted_finding_still_open；scope 已重新锁定；按用户指示跳过重复 plan-implementation，已直接进入并完成 implement-current-step；verification 未收口后 reopen 原 fingerprint）
    - Migration source：none
    - Recommended route：current_task_owned
    - Ownership assessment：该 finding 属于当前 active Node 4.5 任务的步骤 8 fault matrix；本次 scope widening 已将 `analyzerProcessManager.js` 纳入当前回补窗口，可在任务内完成生产 ACK 收口修复，不需要扩大到其他模块。
    - Ownership evidence：原步骤 8 先仅允许 fake analyzer 与目标测试，目标测试和当前 process manager 给出了同一 request 的重复 batch/complete 时序证据；本次 `lock-scope` 已按该证据重新开放 `analyzerProcessManager.js`，并保持 Rust 仅作为既有 binary 依赖；已读取 `TASKS/paused/**` 与 `TASKS/interrupted/**`，仅有 IPC/Owner 暂停包，无匹配 Node collector owner。
    - Resolution update：为每个 active request 建立串行 `batchDrain`；所有已接收 batch（包括 duplicate）在各自 importer callback 与正 ACK 完成前，complete 不会结算或释放 request。目标测试新增 complete 到达时的 ACK 数量断言。
    - Verification update：duplicate/stale fault-matrix focused test `1/1` PASS；两次 valid delivery 均收到 `accepted=true,persisted=true` 正 ACK，complete 观察到两次 ACK 已收口，staging/receipt/range index 仍保持幂等。允许文件 `node --check` PASS；未触及 Rust/native/source/**、契约、决策或产品路径。
    - Verification re-open update：`review-implementation` 的只读重复运行确认上述测试 observer 存在时序竞态：重复场景 `20` 次中有 `1` 次失败，环境探针还观察到 complete 入站时 ACK=`1`、而最终 `analyze()` 结算后 ACK=`2`。因此不能把当前断言标记为稳定验证，也不能把生产 `batchDrain` 判为失效；下一修复应改为观察 `onComplete`/最终 settlement，或增加带延迟第二 callback 的直接 manager deterministic test，并继续保留每个 valid duplicate 的正 ACK、不得仅延迟 fake、降低断言或移除 drain barrier。
    - Verification repair update：未改变生产 `batchDrain`；目标测试注入有确定延迟的第二个 importer callback，并在 `commitComplete`（manager drain 已收口的最终结算点）检查 ACK 数，同时保留 stale quarantine、两次 valid delivery 正 ACK、单条 receipt/range index 幂等断言。该 fault-matrix 测试独立重复 `20/20` 通过，相关步骤 8 selection 与本次回补测试 `12/12` 通过，两个允许文件 `node --check` 通过。
    - Handoff：review-diff（verification）。
    - Verification closeout（2026-08-31）：`review-diff`、`review-implementation`、`verify-contracts` 和 `run-regression` 均确认生产 `batchDrain`、complete barrier、stale quarantine、valid duplicate 正 ACK 和幂等 receipt/range index 语义满足步骤 8 required-now；未发现 current-step regression、契约违规或未知失败。
    - Handoff：sync-status。

  - Finding ID：RI-4.5-008-002
    - Severity：P1（major）
    - Source：`review-implementation`（2026-08-31；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`）
    - Status：resolved/current_task_owned（第 2 次 verification repair 已完成并通过复核）
    - File / symbol：`src/services/codexRolloutCollector/index.js:335-349,664-698` / `_executeIntent`、`_awaitWithDeadline`；`src/services/codexRolloutCollector/analysisRunStore.js:557-599` / `BaseAnalysisRunStore.begin`
    - Failure scenario：run store 的 `begin()` 因磁盘、队列或存储延迟超过 intent deadline。调用方先收到 `ANALYZER_REQUEST_TIMEOUT`，进程停止；后台 `begin()` 随后仍完成并持久化 `status=running`。由于 `begin()` 位于 `_executeIntent` 外层 `try` 之前，超时路径没有对应的 `runStore.fail()` 补偿。
    - Why current implementation fails：`_awaitWithDeadline()` 只结束调用方等待并在后台保留原 operation；它不会取消或失效迟到的 `begin()`，而当前 lifecycle 没有 late-begin compensation。只读 delayed-begin probe 已观察到 `ANALYZER_REQUEST_TIMEOUT` 后立即无记录，随后出现 `status=running` 的持久化记录。
    - Minimal fix direction：在 run-begin 生命周期中建立 deadline-aware cancellation/invalidating guard；若存储操作不能取消，则对 deadline 后完成的 begin 执行补偿性终态写入，并保证不会留下可恢复的孤立 `running`。修复应回到对应 lifecycle step，不在步骤 8 fake/test 中绕过。
    - Required test：Memory/File store 分别注入延迟 `begin()`，让 intent 在 begin 完成前超时；断言调用方在 deadline 内收到稳定 timeout，旧 analyzer 仍遵守 termination fence，迟到 begin 最终不会留下 active `running`，且补偿终态/无记录策略在重启后保持一致。另覆盖 begin 成功、begin 失败和取消竞态。
    - Review mode：verification
    - Review epoch：`20260828-001/step-8/d1`
    - Fingerprint：`rfp-v1|acceptance=deadline-lifecycle|owner=node-collector-coordinator-run-store|resource=run-begin-persistence|transition=deadline-to-late-begin|failure=timeout-leaves-running-run`
    - Fingerprint components：acceptance=`deadline-lifecycle`；owner=`node-collector-coordinator-run-store`；resource=`run-begin-persistence`；transition=`deadline-to-late-begin`；failure=`timeout-leaves-running-run`
    - Caused by：none（interaction-or-latent；基线中 `begin()` 已位于外层 try 之外，当前 deadline wrapper 暴露了迟到写入窗口）
    - Blocking：false（不阻止步骤 8 的 fake/Rust smoke required-now，但阻止任务最终生命周期闭环）
    - Scope ownership：current_task_owned（当前回补窗口已重新开放 coordinator/run-store 生命周期文件）
    - Provenance：interaction-or-latent；当前没有中间 checkpoint，不能声明为本轮 repair 直接回归。
    - Evidence kind：runtime_reproduction
    - Evidence basis：`index.js` 的 deadline/try 控制流、`analysisRunStore.js` 的异步 `begin()`，基线 `e17162b...` 对照，以及延迟 begin 的只读运行时探针：`ANALYZER_REQUEST_TIMEOUT` 后立即无记录，迟到完成后产生 `status=running`；补偿 `runStore.fail()` 被注入抛错时，caller 仍收到 timeout、补偿调用发生，但持久化记录保持 `status=running` 且无 error。未使用外部数据。
    - Repair base：unknown
    - Repair attempts：2
    - Admission：admitted（accepted_finding_still_open；scope 已重新锁定；按用户指示跳过重复 plan-implementation，已直接进入并完成 implement-current-step；verification 未收口后 reopen 原 fingerprint）
    - Migration source：none
    - Recommended route：current_task_owned
    - Ownership assessment：该 finding 属于当前 active Node 4.5 任务的生命周期/持久化目标；本次 scope widening 已将 `index.js` 与 `analysisRunStore.js` 纳入当前回补窗口，可在任务内完成 delayed-begin 生命周期修复，不需要另立产品或跨模块任务。
    - Ownership evidence：步骤 4/5 已完成的目标包含 deadline、run 状态和终态一致性，原步骤 8 仅允许 fake/test；review-implementation 提供了静态控制流与 delayed-begin runtime reproduction，本次 `lock-scope` 已按该证据重新开放 coordinator/run-store 文件；已读取 `TASKS/paused/**` 与 `TASKS/interrupted/**`，无匹配 Node collector owner。
    - Resolution update：`_executeIntent` 的 run-begin 改为由 deadline-aware helper 观测原始 `runStore.begin()`；cancel/timeout 先标记 begin context 失效，底层操作不可取消时，迟到成功或部分成功通过现有 `runStore.fail()` 写入终态 `failed`，不留下可恢复的 `running`。补偿使用返回记录的 request/attempt/process identity，不改变产品状态模型。
    - Verification update：Memory/File delayed begin timeout `2/2`、cancel race `2/2`、begin failure `2/2` PASS；调用方按稳定 timeout/cancel 结算，迟到 begin 最终为非 `running` 的 terminal failure，begin 失败不产生 run artifact。允许文件 `node --check` PASS；未触及 Rust/native/source/**、契约、决策或产品路径。
    - Verification re-open update：`review-implementation` 的只读 compensation-failure probe 让 `runStore.fail()` 抛错；结果为 caller=`ANALYZER_REQUEST_TIMEOUT`、compensation calls=`1`、persisted status=`running`、persisted error=`null`。因此现有补偿路径的正常分支虽通过，但失败分支仍可留下可恢复孤立 run；下一修复必须建立可持久化/可审计的补偿失败处理（并加入注入失败验证），不能标记 resolved。
    - Verification repair update：`_compensateRunBegin()` 不再吞掉 primary `runStore.fail()` 错误；若 primary terminal writer 失败，则以当前 run identity 通过 `runStore.update()` 写入 `status=failed`，并在 `ANALYZER_RUN_COMPENSATION_FAILED` 中保存原始 timeout/cancel 错误与 primary compensation 错误。新增 Memory/File 注入 fail-writer 失败测试，验证 caller 仍得到稳定 timeout、`fail()` 调用一次、持久化及重启读取均为 terminal `failed`；相关步骤 8 selection 与本次回补测试 `12/12` 通过。
    - Handoff：review-diff（verification）。
    - Verification closeout（2026-08-31）：`review-diff`、`review-implementation`、`verify-contracts` 和 `run-regression` 均确认 deadline/cancel invalidation、迟到 begin 的 terminal compensation、primary writer 失败时的 update fallback 及 Memory/File 重启状态满足步骤 8 required-now；未发现 current-step regression、契约违规或未知失败。
    - Handoff：sync-status。

  - Finding ID：RI-4.5-008-003
    - Severity：P1（major）
    - Source：`investigate-root-cause`（2026-08-31；基于 `review-implementation` 新发现；diff target `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`）
    - Status：resolved/current_task_owned（第 1 次 verification repair 已由 review-implementation 复核收口）
    - File / symbol：`src/services/codexRolloutCollector/analyzerProcessManager.js:424-444,735-785,1001-1016` / `_failStartup` 及 hello/protocol failure callers；对照 `analyzerProcessManager.js:394-417` / `failCurrentProcess`
    - Failure scenario：hello request_id/role/capability/protocol 校验失败、hello timeout 或 stdout malformed protocol 触发 `_failStartup()`；若当前 child 的 `kill()` 返回 false 或抛错且后续没有 `exit`/退出状态证据，Node 对外已经报告 startup failure，但 live analyzer child 仍在运行。
    - Why current implementation fails：`_failStartup()` 先调用 `_handleProcessFailure()`，该函数清空 active request 并调用 `_resolveIdleWaiters()`；随后只做一次 best-effort `child.kill()`，没有调用 `_trackProcessTermination()`/`_beginProcessInvalidation()`。因此 kill 不是终止证明，`processInvalidationPromise` 仍为空，`waitForIdle()` 不再等待该 child。已有 child/stdin error 的 `failCurrentProcess()` 会先建立 termination fence，说明缺口是 startup failure 分支与共同进程失效路径分叉。
    - Root cause report：
      - Symptom：错误握手后 `start()` 返回 `ANALYZER_HELLO_ROLE_INVALID`，但 manager 仍 attached 到 live child；`stopping=true`，`processInvalidationPromise=false`，预注册的 `waitForIdle()` 已 resolved。
      - Reproduction：只读 synthetic public-start probe 让 fake child 发出匹配 request_id 但 `role=node` 的 hello，并令 `child.kill()` 返回 false、永不发出 exit；结果为 `error=ANALYZER_HELLO_ROLE_INVALID`、`childAttached=true`、`childStillLive=true`、`processInvalidationFence=false`、`idleSettled=true`、`killCalls=[null]`。正常 fake analyzer 能自行退出时现有 hello rejection 测试仍通过，说明普通 exit 掩盖了该缺口。
      - Causal chain：startup hello/protocol failure → `_failStartup()` → `_handleProcessFailure()` 提前释放 idle/active bookkeeping → best-effort kill 无退出证明 → child 未被 termination fence 表示；后续显式 `stop()` 才会重新建立 fence，且在此之前不能把 manager 的 idle 状态当作物理 worker 已终止。
      - Control comparison：`failCurrentProcess()`、`stop()`、`_invalidateCurrentProcess()` 均通过 `_trackProcessTermination()` 或 `_beginProcessInvalidation()` 等待 `exit`/退出状态；仅 `_failStartup()` 缺少该步骤。
    - Minimal fix direction：在 startup failure 的当前 child 仍可能存活时，复用现有 termination-fence/invalidation 原语，并保持现有 startup failure 错误及 stopping/重试语义不变；不得把 `kill()` 返回或 `error` 事件当作退出证明，也不得在未取得退出证明前允许新的 generation。
    - Required test：增加真实 `AnalyzerProcessManager.start()` 的 hello/protocol failure 回归，分别覆盖 `kill() => false`、`kill()` 抛错和后续 delayed `exit`；断言 failure 仍按原 code 返回，但 fence 存在、`waitForIdle()`/新 generation 在 exit 前不完成，退出后才释放；同时保留正常 child exit、无 analyze 越过 handshake 和既有 child/stdin error fence 语义。
    - Review mode：investigation
    - Repair mode：verification
    - Review epoch：`20260828-001/step-8/d1`
    - Fingerprint：`rfp-v1|acceptance=target-fault-matrix|owner=node-collector-process-manager|resource=startup-failure-termination|transition=hello-failure-to-process-fence|failure=kill-without-exit-leaves-live-child`
    - Fingerprint components：acceptance=`target-fault-matrix`；owner=`node-collector-process-manager`；resource=`startup-failure-termination`；transition=`hello-failure-to-process-fence`；failure=`kill-without-exit-leaves-live-child`
    - Caused by：interaction-or-latent（当前 startup failure 分支与已有 process invalidation 原语未汇合；不是本轮 RI-4.5-008-001/002 修复直接引入）
    - Blocking：true（阻止步骤 8 的 process fault-matrix/lifecycle acceptance，并阻止任务最终收口；不是后续 legacy gap）
    - Scope ownership：current_task_owned（当前回补窗口已允许 `analyzerProcessManager.js` 与目标测试）
    - Provenance：unknown；当前没有中间 checkpoint，不能把该缺口归因到某次 repair patch。
    - Evidence kind：runtime_reproduction
    - Evidence basis：当前 `_failStartup()` 与 `failCurrentProcess()` 静态调用链、`waitForChildExit()` 的 exit-only 证明规则、现有 startup/error fence 测试，以及公开 `start()` synthetic probe 的稳定输出；未使用外部数据。
    - Repair base：unknown
    - Repair attempts：1
    - Admission：admitted（accepted_finding_resolved；根因已验证；现有 scope 已覆盖最小 process-manager 修复）
    - Migration source：none
    - Recommended route：current_task_owned
    - Ownership assessment：这是当前 active Node 4.5 任务步骤 8 的 process lifecycle/fault-matrix mechanical finding；最小修复限定在 `analyzerProcessManager.js` 与 `tests/codexRolloutCollector.test.js`，不需要扩大到 Rust/source、共享契约、产品入口或暂停任务。
    - Ownership evidence：live `CURRENT_TASK.md` 的步骤 8 Allowed Files 已包含 `analyzerProcessManager.js` 和目标测试；当前回补窗口也已重新开放该文件；`TASKS/paused/**` 与 `TASKS/interrupted/**` 已完整检查，无 Node collector owner 可接管；现有 contract 明确要求 startup failure、cancel/timeout 和 generation 在 worker 明确终止前 fail-closed。
    - External Documentation Gate：no-op；假设只依赖仓库内 Node `EventEmitter`/child-process 状态机和当前 Rust analyzer contract，不涉及第三方库或外部 current behavior。
    - Resolution：`_failStartup()` 现在在清理启动失败状态前，为仍存活的 child 建立既有 `processInvalidationPromise` termination fence；随后保持原有启动失败 code、`stopping` 和重试语义，`kill()` 返回 false 或抛错不被视为退出证明。
    - Verification update：新增真实 `AnalyzerProcessManager.start()` hello failure 回归，分别覆盖 `kill() => false` 和 `kill()` 抛错；两项 focused tests `2/2` PASS，相关 target/process manager selection `17/17` PASS，验证 failure code 保持 `ANALYZER_HELLO_ROLE_INVALID`、child exit 前 idle waiter/新 generation 被阻塞、exit 后 fence 释放；两个允许文件 `node --check` PASS。
    - Regression check：修复后需先运行 startup-failure fence focused tests，再运行步骤 8 target/process/collector required-now selection、`node --check`、`git diff --check` 和路径范围扫描；full collector 的后续 legacy gap 继续按当前步骤门禁分类。
    - Remaining risk：若修复同时改变 startup failure 后的 `stopping`/显式 retry 语义，可能影响既有错误返回和生命周期毒性；实施时必须只补 termination proof，不默默改变重试策略。
    - Verification closeout：`review-implementation` 确认 `_failStartup()` 已复用 termination fence，`kill()` false/throw 及 delayed exit 证据满足 exit-only proof；未发现本条 finding 的 direct regression 或未收口边界。
    - Handoff：sync-status（本条已收口；全局仍因 RI-4.5-008-001/002 进入 implement-current-step）。

## 传播治理记录

### change_start_set

- 对象路径：`src/services/codexRolloutCollector/**` 与其 Node→Rust stdio JSONL process boundary
- 对象类型：隔离内部 process protocol、coordinator、importer、checkpoint/run store、test fixture
- 变更起点语义：Rust 4.5 target contract 已稳定，Node 旧 consumer 尚未迁移；本轮开始在 Node 模块所有权内适配该边界。

### discovery evidence

- `EvidenceRecord`：
  - mechanism：仓库 `rg`/文件读取、Rust 4.5 contract/architecture/decision 对照、Node targeted test/fixture inventory
  - query_or_entrypoint：`src/services/codexRolloutCollector/**`、`tests/codexRolloutCollector.test.js`、`tests/fixtures/codex-rollout-collector/fake-analyzer.js`
  - scope：Node collector process/import/store、Rust target startup/wire/data contract、现有直接测试消费；不扫描为实现授权的 IPC/Android/DB
  - result_summary：现有 Node consumer 仍有 `replay`/`source_spec` 旧语义；Rust target 要求 startup-level `sessions_root`、Node-first hello、三 mode、opaque delivery identity 和 ACK-gated complete；当前没有产品入口接入证据
  - confidence：high（旧代码与 active contract 均有直接证据）
  - gaps：仓库外调用方不作为本仓库契约推断依据；产品 DB/terminalGateway 是否应在后续任务接入已由现行 contract 明确排除

### aggregation / complexity

- `evidence_diff_threshold`：
  - absolute_diff：3
  - relative_diff_ratio：0.5
- `EvidenceAggregation`：
  - aggregation_strategy：union
  - candidate_impact_set：Node collector modules、target protocol tests、fake analyzer fixture、Rust target cross-process smoke
  - significant_divergence：true
  - divergence_reason：旧 Node wire 与已稳定 Rust 4.5 startup/wire/data contract 在 mode、source boundary、identity 和 lifecycle 上均存在结构差异
  - unresolved_gaps：最终是否需要同目录新增拆分模块、Rust target binary 的本地测试入口
  - aggregated_confidence：high for the scoped in-repository artifact；out-of-repository callers explicitly excluded from this contract
- `over_limit_policy`：
  - threshold_trigger：若传播扩展到 `terminalGateway`/IPC/Android/DB 或需要改共享契约
  - selected_branch：stop-and-replan
  - rationale：跨越隔离边界必须新建任务、共同评审并重新 lock，不在 Node 迁移中隐式传播
  - direct_consumers_semantics：保留 Node collector 既有导出/测试入口，在新 wire 下提供兼容或显式失败
  - total_candidate_consumers_semantics：不将潜在产品 consumer 自动纳入本任务

### eligibility / candidate / registry

- `MutationEligibilityAssessment`：
  - common.object_path：`src/services/codexRolloutCollector/**`
  - common.object_kind：隔离 Node analyzer consumer/coordinator
  - common.explicit_contract_state：CONTRACTS locked isolated Rust↔Node boundary；Node consumer migration pending
  - common.discovered_direct_consumers：collector exports、`tests/codexRolloutCollector.test.js`、`tests/fixtures/codex-rollout-collector/fake-analyzer.js`
  - common.cross_boundary：yes（Node process ↔ Rust target），但不进入产品 IPC/DB boundary
  - common.critical_path_hit：no（不触碰 `terminalGateway`/Sessions/Workspace/Android）
  - common.locked_hit_chain：4.5 isolated analyzer process/import/store chain
  - common.registry_freshness：current Rust contract + legacy Node implementation gap
  - common.rationale：按 AD-022 启动独立 Node consumer 任务；scope 可被列出的文件和测试验证
  - when_pending_prerequisites.assessment_status：review-required
  - when_pending_prerequisites.blocking_gaps：Node target binary test entry、最终新增文件清单
  - when_completed.assessment_status：to-be-established
  - when_completed.eligibility：to-be-established by review/contract/regression evidence
- `implicit_shared_object_detection`：
  - object_path：Node collector export and Node↔Rust JSONL boundary
  - object_kind：shared internal protocol boundary
  - direct_consumers：isolated collector callers/tests; product consumers not confirmed
  - cross_boundary：yes
  - critical_path_hit：no
  - locked_hit_chain：isolated analyzer artifact
  - proposed_contract_state：target-only adapter over existing isolated exports; no product propagation
  - writeback_required：yes（CURRENT_TASK；稳定新边界若形成再走 sync-contracts）
- `RegistryFreshnessReport`：
  - object_path：`src/services/codexRolloutCollector/**`
  - registry_consumers：`CONTRACTS.md`、`STATUS.md`、`DECISIONS.md`、Node targeted tests
  - discovered_consumers：同上；仓库内未发现 gateway/DB/Android 直接 consumer
  - effective_consumers：isolated Node collector tests and explicitly scoped module callers
  - freshness：legacy implementation is known; Rust target contract is current
  - reconciliation：review external callers before widening; keep product paths forbidden
  - divergence_summary：旧 Node wire ≠ current Rust 4.5 wire，需迁移而非改变 Rust contract
- `EntityMutationChecklist`：
  - entity_name：Node 4.5 analyzer consumer/coordinator
  - covered_categories：startup、hello/capability、wire normalize、single-flight、cancel/timeout/retry、batch import、ACK/complete、checkpoint/run store、tests
  - unresolved_categories：product DB publication、IPC/Android、source pre-I/O、release/deploy
  - gap_resolution：
    - category：跨模块产品传播
    - handling：deferred to independent task
    - blocker_error_code：not-applicable（scope boundary, not an implementation error）
- same-file wrapper / compat decision：
  - stable_source_object：现有 `src/services/codexRolloutCollector/index.js` exports and isolated store interfaces
  - successor_wrapper_or_compat_object：target-only protocol/coordinator behavior under the same isolated module boundary
  - preserved_direct_entrypoints：现有 `index.js` exports 和 store interfaces；外部 callers 不作为隐式兼容目标
  - decision_rationale：保留隔离模块入口可降低迁移面，但不保留旧 wire 语义或静默 replay fallback

### layout / behavior / migration / regression

- `LayoutContract`：not applicable（无 UI/布局任务）。
- `BehaviorContract`：
  - object_path：`src/services/codexRolloutCollector/**`
  - assertions：startup scope 只通过 `sessions_root`；Node-first hello；只有三种 mode；单进程/单飞；opaque delivery identity；typed error；batch 先持久化后 ACK；complete/checkpoint 严格一致；partial/canonical 不反向降级；旧 IPC/产品入口不受影响
  - verification：Node target tests、fake analyzer fault injection、Rust binary smoke、`node --check`、scope/diff/contract review
- API downstream validation：
  - hook：collector service exports / process request entrypoints
  - store：isolated analysis staging、checkpoint store、run store
  - page：none
  - widget：none
  - form：none
  - table：none
  - detail view：none
- `migration_plan_requirement`：
  - required：true
  - trigger_reason：旧 Node wire 是 legacy 形态，Rust 4.5 target contract 已发生结构性迁移
- `StagedMigrationPlan`：
  - migration_id：ND-MIG-4.5-20260828
  - phases：inventory/caller check → startup+hello+wire → lifecycle/coordinator → importer/store/ACK → cross-process regression → final review/contract sync
  - runtime_state：active
  - dependencies：Rust target commit `5a3214a`/current HEAD `7a16771`、已读 4.5 contract、Node local runtime、offline test fixture
  - verification：每阶段目标测试和 review gate；最终执行 `review-diff`、`review-implementation`、`verify-contracts`、`run-regression`
  - exit_criteria：Node target lifecycle 证据完整、scope clean、无未处理 current-scope finding、产品/IPC/DB 禁区无 diff
- `LinkedRegressionRecord`：
  - regression_chain_id：ND-REG-4.5-20260828
  - current_issue：Node old consumer has replay/source_spec while Rust target requires startup-level sessions_root and new wire
  - prior_fix_refs：Rust target `5a3214a`；Rust workflow archive `7a16771`
  - window_scope：Node isolated collector + Rust target process contract
  - window_size：targeted Node suite + Rust target protocol smoke + diff-aware narrow gate
  - count_basis：test runner reported counts and explicit command output
  - linked_components：analyzerProtocol、processManager、requestTracker、batchImporter、checkpoint/run stores、fake analyzer
  - shared_objects：job/request/scope/delivery identity、checkpoint、batch/ACK/complete
  - relation：follow-up consumer migration after Rust contract-first implementation
  - escalation：任何共享契约/产品入口/Forbidden path 需求都回到 lock-scope 和 Rust/Node joint review

### blockers / gate status

- 2026-08-31 review-implementation update：步骤 8 的 duplicate ACK 时序 finding `RI-4.5-008-001` 直接阻止当前 fault-matrix acceptance；`RI-4.5-008-002` 确认 deadline 后迟到 `runStore.begin()` 可能留下 `status=running`，不阻止步骤 8 required-now 但阻止任务最终生命周期闭环；随后 `RI-4.5-008-003` 确认 startup failure 未建立 child termination fence，同样属于当前步骤生命周期缺口。三项均已按 scope-widening 重新锁定的 Node collector 范围完成第 1 次 verification repair，当前等待 `review-diff`；不得把它们归类为后续 legacy `future-step-expected-gap`。

- 当前执行步骤：步骤 1～8 已完成各自 required-now 的 review/contract/regression 门禁；`ND-4.5-002` 的 tracker portion、步骤 4/5 的生命周期与持久化 findings、步骤 6 的 batch importer、步骤 7 的 target transaction/typed error，以及步骤 8 的 `RI-4.5-008-001`～`RI-4.5-008-003` 均已按对应范围收口。`RI-4.5-004-016` 按用户决定保留为 deferred 的测试/生命周期语义记录。步骤 2～8 的全量 collector 失败已明确归属于已接受 deferred 或后续步骤的迁移/真实 Rust 接线缺口，未阻塞对应步骤的 required-now 判定。步骤 9 最终收口尚未执行，整体任务仍为 `active`/`blocks-merge`。
- 已完成 discovery：治理基线、Rust 4.5 architecture/startup/wire/data/coordinator 文档、AD-018～AD-022、现有 Node collector 文件和测试入口。
- 回归结果：允许的 JS/fixture `node --check` 全部通过（`9/9`）；步骤 2 process/startup focused tests `8/8`、target focused tests `19/19`、步骤 3 tracker focused tests `4/4`、步骤 4 coordinator/process lifecycle focused selection `23/23` 均通过；步骤 5 target checkpoint/run focused tests `9/9`、target focused suite `32/32` 通过；步骤 6 importer focused tests `10/10`、累计 target focused suite `42/42` 通过；步骤 7 transaction/process/collector required-now selection `58/58` 通过；步骤 8 回补 focused selection `12/12`、duplicate fault-matrix 独立重复 `20/20`、Rust `target_identity` `6/6`、完整 `stage4_target_protocol` `70/70` 通过；collector 最新全量为 `89/115` 通过、`26` 失败、`0` cancelled、无挂起。失败分类为：`RI-4.5-004-016` 1 项 `unrelated-preexisting`/用户确认 deferred；其余 `25` 项为旧 `sourceSpec`/`replay`、legacy replacement/importer/checkpoint/coordinator 调用形状及尚未完成的后续接线，属于 `future-step-expected-gap`；无 `current-step-regression` 或 `unknown`。允许文件 `node --check`、`git diff --check`、Allowed/Forbidden path scan 均通过；仅有既有 LF/CRLF 提示。TD-004 窄门禁的历史 `29/32` 结果继续保留，缺少 `express`/`jsdom` 的三个文件不属于本任务步骤 8 required-now。
- 剩余 blocker：`RI-4.5-002-001`、`RD-4.5-004-001`、`RD-4.5-004-002`、`RI-4.5-004-003`～`RI-4.5-004-015`、`RD-4.5-005-001`～`RD-4.5-005-003`、`RI-4.5-005-005`～`RI-4.5-005-007` 以及步骤 8 的 `RI-4.5-008-001`～`RI-4.5-008-003` 均已完成对应 review/contract/regression 收口；`RI-4.5-004-016` 为用户确认暂缓的 P3 测试断言/生命周期语义记录，不改变 fail-closed runtime。当前没有步骤 8 required-now blocker；但步骤 9 最终收口尚未执行，collector 全量的 `25` 项 future-step gap 与 `1` 项 deferred 仍须保留并作为整体任务最终交付门禁的一部分，整体任务继续 `active`/`blocks-merge`。未安装或修改依赖，未修改 Rust/source/**；任何 scope widening、Rust 文档与 binary 冲突或未授权文件需求先停止并回到 `lock-scope`。
- `ContractCompatibilityResult`：
  - error_code：not-yet-assessed
  - object_path：Node collector ↔ Rust target process boundary
  - severity：P1 until migration is implemented
  - default_blocker_level：blocks-merge for this task
  - evidence：old Node request/fixture fields do not match current 4.5 target contract
  - strategy_origin.over_limit_policy_branch：stop-and-replan on cross-module propagation
  - strategy_origin.divergence_state：confirmed legacy/current protocol divergence
  - branch_gate_mapping.merge_gate：target Node tests + scope/contract review must pass
  - branch_gate_mapping.ship_gate：not applicable; no release
  - branch_gate_mapping.rationale：isolated migration must be complete before any product wiring
  - suggested_resolution：按实施步骤建立 target-only Node adapter/coordinator，并保留隔离边界

### conformance / verification cases

- 输入场景：旧 Node 发出 `mode=replay`/`source_spec`；新 Node 发出 preview/backfill/append；同 job 重试；Rust process restart；batch duplicate/overlap/conflict；partial/canonical complete；cancel/timeout/resource error。
- discovery evidence：旧代码/测试与 Rust 4.5 contracts 的直接对照，详见 `discovery evidence`。
- 期望 `ContractCompatibilityResult`：旧 wire 在 target boundary 被识别为 migration-required；新 wire 只有通过 startup/hello/identity/source/checkpoint/ACK 门禁后才允许成功形状。
- 期望 gate / severity / `strategy_origin`：P1 implementation gate；跨模块传播触发 stop-and-replan；不把 Rust source deferred 风险转嫁给 Node workaround。

## 实施步骤

建议执行顺序：步骤 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9。每步只服务一个子目标；每步完成后先执行该步独立验证，再进入下一步。若验证暴露出前一步的实现缺陷，回到对应步骤修复，不把修复混入后续步骤。

- [x] 步骤 1：建立 target-only protocol/message 模型。
  - 输入：已锁定的 4.5 startup/wire/data contract、现有 `analyzerProtocol.js` exports 和旧 Node 测试。
  - 输出：七类 JSONL 消息的 target parser/serializer/校验入口；三种 analyze mode、`job_id`/`request_id`/`conversation_id`/recovery pair 的字段边界；旧 `replay`/`source_spec` 不再作为 target request 语义；稳定协议错误类型。
  - 允许文件：`src/services/codexRolloutCollector/analyzerProtocol.js`、`tests/codexRolloutCollector.test.js`。
  - 独立验证：对上述两个 JS 文件执行 `node --check`；运行只覆盖 protocol/wire/mode/legacy-boundary 的 focused tests；断言必需字段、禁止字段、未知 additive 字段和 recovery 成对规则。
  - 完成门禁：不启动子进程、不写 importer/store；target request 不发送或要求 `replay`、`source_spec`、泛化 revision、discovery/path 字段。

- [x] 步骤 2：建立 startup 参数与 Node-first hello 能力门禁。
  - 输入：步骤 1 的消息入口、既有 `CODEX_HOME` 解析规则和 Rust startup contract。
  - 输出：Rust 子进程参数严格为 `--startup-config-version 1 --sessions-root <absolute normalized path>`；每个 generation 先发送 `hello(role=node)`；只接受匹配 request id、`role=analyzer` 且具备 `analyze_v1`、`cancel`、`checkpoint`、`ack` 的 hello。
  - 允许文件：`src/services/codexRolloutCollector/analyzerProcessManager.js`、`tests/fixtures/codex-rollout-collector/fake-analyzer.js`、`tests/codexRolloutCollector.test.js`。
  - 独立验证：fake analyzer 记录并断言 argv、hello 顺序和 request id echo；覆盖 capability 缺失、角色错误、request id 不匹配、hello 超时；确认握手未通过前不会发送 analyze。
  - 完成门禁：本步只建立 process/startup/hello 边界，不接入批次导入和 complete 提交，不对旧 wire 做静默 fallback。
  - 实际验证（2026-08-28）：`node --check` 允许的 collector JS、目标测试和 fake fixture 全部通过；步骤 2 process/startup focused tests `8/8`、target focused tests `19/19` 通过；`AnalyzerProcessManager` 以 generation 级 `readyGeneration` 阻止公开 `send(analyze)` 在 hello 完成前写入 stdin，并覆盖 spawn 后未就绪及 hello 消息校验阶段；真实 fake analyzer smoke 覆盖 generation `1 → 2` 的 stop/restart 与 hello ready。全量 collector `22/48` 通过、`26` 失败，失败属于后续步骤的已知迁移缺口，不作为步骤 2 回归失败；步骤 2 已通过 `review-diff`、`review-implementation`、`verify-contracts` 和 diff-aware `run-regression`。未修改 importer/store、Rust/native、契约、决策或产品入口。下一 handoff 为 `sync-status`。

- [x] 步骤 3：收敛 attempt/generation request tracker。
  - 输入：步骤 1 的 request identity 和步骤 2 的 generation/hello 生命周期。
  - 输出：`request_id` 与 attempt/generation 的绑定；hello/analyze/complete 计时、settlement、取消状态和终止等待；取消/超时不会让未终止的 worker 释放 active 槽位。
  - 允许文件：`src/services/codexRolloutCollector/analyzerRequestTracker.js`、`tests/codexRolloutCollector.test.js`。
  - 独立验证：focused tests 覆盖成功 settlement、重复 settlement、cancel/timeout race、hello timeout、旧 attempt 回调和计时器清理；断言每个 promise/attempt 只结算一次。
  - 完成门禁：不改变 coordinator 的 pending 策略、不写 batch/checkpoint；失败路径必须保留明确的 error code/retryable 信息。
  - 实际验证（2026-08-28）：`node --check src/services/codexRolloutCollector/analyzerRequestTracker.js`、`node --check tests/codexRolloutCollector.test.js` 通过；`node --test --test-name-pattern "target request tracker" tests/codexRolloutCollector.test.js` 为 `4/4` PASS；target focused suite `23/23` PASS。tracker 保留旧 `track/resolve/reject/cancel/rejectAll` 调用面，同时新增 generation/attempt scope guard、hello/analyze/complete phase timer、一次性 settlement；普通 success/error 在结算后释放 entry，cancel/timeout 继续 termination wait 并由匹配的 `markTerminated` 释放，保留明确 timeout/cancel `code/retryable`。未修改 coordinator pending 策略、batch/checkpoint、Rust/native 或产品入口。collector 全量最新结果 `26/52`、`26` 失败、无挂起，失败仍属于步骤 4～7 的旧调用/导入缺口，不作为本步失败。External Documentation Gate 为 no-op：仅修改项目内 Node 状态逻辑和测试，不新增或依赖第三方 current behavior。

- [x] 步骤 4：实现 coordinator/process 的单飞、pending、取消和 generation 隔离。
  - 输入：步骤 2 的启动/握手门禁和步骤 3 的 tracker。
  - 输出：一个 Node 实例一条 Rust 进程链和一个 in-flight request；同一 conversation 一个 running intent 与一个 pending intent；有限重启、重试新 `request_id`、旧 generation 消息丢弃；cancel/deadline/进程退出后的 active 槽位收口。
  - 允许文件：`src/services/codexRolloutCollector/analyzerProcessManager.js`、`src/services/codexRolloutCollector/index.js`、`tests/fixtures/codex-rollout-collector/fake-analyzer.js`、`tests/codexRolloutCollector.test.js`。
  - 独立验证：fake 注入并发请求、pending replacement、cancel/timeout race、crash/restart、stale batch/complete/error；断言旧 generation 不改写新 intent，重启次数受固定预算限制。
  - 完成门禁：本步只验证调度和生命周期；尚不把 batch 视为已导入，也不提交 checkpoint 或产品数据。
   - 实际验证（2026-08-29）：允许文件 `node --check` 全部通过；包含 target/process/coordinator lifecycle、EPIPE/ERR_STREAM_DESTROYED、no-drain cancel/timeout、single-flight、pending replacement、generation 隔离与有限重启的 focused selection `23/23` PASS，成功路径既有请求顺序保持通过。单独的初始 hello deadline 测试仍有 `1` 项断言失败：请求已在 deadline 内以 `ANALYZER_REQUEST_TIMEOUT` 对外结算，但 termination fence 尚未收到退出证据时 `runningIntent` 按 fail-closed 语义暂时保留；该项登记为 `RI-4.5-004-016` 并按用户决定 deferred，不改变运行时实现。collector 全量 `47/74` 通过、`27` 失败、无取消/挂起；其中 `26` 项属于步骤 5～7 尚未迁移的旧 `sourceSpec/replay`、batch/importer/checkpoint/coordinator 形状，另 `1` 项为上述已接受的测试断言差异。`git diff --check` 通过，仅有既有 LF/CRLF 提示。步骤 4 仅验证调度和生命周期，未修改 importer/checkpoint/store、Rust/native、source/**、契约、决策或产品入口；External Documentation Gate 为 no-op。步骤 4 判定 PASS，整体任务仍保持 `active`/`blocks-merge`。

- [x] 步骤 5：迁移 target run/checkpoint 隔离持久化。
  - 输入：步骤 1～4 的 job/request/attempt/generation identity 和已锁定的 checkpoint contract。
  - 输出：`analysisRunStore.js` 记录 target run/attempt/error/retry/receipt 进度；`analysisCheckpointStore.js` 校验并保存 scope、segment/range、cursor、projection watermark、reducer state 和 completeness；partial/provisional 不覆盖 canonical，旧 fingerprint/prefix/revision 只作为 opaque metadata。
  - 允许文件：`src/services/codexRolloutCollector/analysisRunStore.js`、`src/services/codexRolloutCollector/analysisCheckpointStore.js`、`tests/codexRolloutCollector.test.js`。
  - 独立验证：Memory/File store 重启测试覆盖同 scope 重放、跨 job/request/source 拒绝、canonical 单调性、partial→canonical、canonical 不降级、cursor/complete 不一致和旧字段不再作为业务 gate。
  - 完成门禁：不接入 process stdout、不发送 ACK；store 只保存隔离 artifact，不传播到产品 DB/Stage 5。
  - 实际验证（2026-08-29；run-store identity/terminal finding 修复后）：`node --check` 通过；新增 finding focused test `1/1` PASS，`target run stores` focused tests `5/5` PASS，步骤 5 focused tests `9/9` PASS，包含 Memory/File store 重启恢复、跨 job 低/高进度拒绝、同 job 新 request 合法推进、请求与 attempt/generation 一致性、终态不可变、带 identity 的迟到 terminal callback 拒绝、batch identity 单调保护、禁止 legacy 字段 scrub、partial→canonical、canonical 防降级、cursor 一致性、opaque fingerprint/prefix，以及 checkpoint/run 并发读改写保护；target focused suite `32/32` PASS；collector 全量 `54/81` PASS、`27` FAIL、无取消/挂起，新增 run-store 回归未引入额外失败，剩余 `26` 项失败均为步骤 6/7 尚未迁移的旧请求/batch/importer/coordinator 形状或已记录的 `RI-4.5-004-016`；未接入 stdout/ACK、产品 DB/Stage 5，未修改 Rust/native/source/**、契约、决策或产品入口。External Documentation Gate 为 no-op：只使用既有 analyzer protocol、Node 内建 `fs`/`crypto`/JSON 能力，未新增第三方 library/API/CLI。
  - 步骤 5 判定：PASS。`verify-contracts` 确认接口/架构契约无当前步骤违规；`run-regression` 确认 required-now 检查全部通过，26 项全量失败为后续步骤预期缺口，另 1 项为已接受的步骤 4 deferred 断言差异。步骤 5 完成，后续进入步骤 6 batch validate/staging/receipt。

- [x] 步骤 6：实现 batch validate、staging/receipt 和幂等导入。
  - 输入：target batch contract、步骤 5 的隔离 store、Rust 返回的 opaque `segment_id`/`batch_id` 和 source/cursor/provenance/completeness 证据。
  - 输出：`analysisBatchImporter.js` 按外层 identity、scope、range/index、cursor、provenance、lineage、mutations 和 completeness 校验；校验通过后原子写 staging/receipt；duplicate/overlap 幂等，内容或 scope 冲突 fail-closed；不依赖旧 revision/fingerprint gate。
  - 允许文件：`src/services/codexRolloutCollector/analysisBatchImporter.js`、`tests/codexRolloutCollector.test.js`。
  - 独立验证：直接 importer/store tests 覆盖多 batch range/index、重复、overlap、冲突、空/不完整 batch、跨 request/job/scope batch、派生字段保存和 ACK-before-persist 前置条件。
  - 完成门禁：本步只产出可审计的 import/receipt 结果，不在 importer 内自行发送 ACK 或接受 complete。
  - 实际实施（2026-08-30）：importer 已切换为 target batch envelope 入口，先通过统一 protocol validator 和 scope/identity/checkpoint evidence 校验，再以语义 payload hash 建立 staging/receipt；Rust 返回的 `job_id`/`segment_id`/`batch_id` 只作为 opaque delivery identity 保存，`request_id` 仅记录为可重试 attempt。重复 delivery 保持幂等，内容或 scope 冲突在写入前 fail-closed；range index 按显式 source range 与 delivery key 稳定重排，overlap item/tool/outcome 去重并保留较高 completeness，partial 不降级 canonical；opaque fingerprint/prefix 仅分离保存，不参与业务 gate。File store 使用 atomic write，并对跨 scope receipt 检索和并发导入加串行化保护。importer 不发送 ACK，也不接受 complete；`commitComplete` 仅保留为后续步骤 7 的接线点。新增 target batch importer 与 File 并发持久化测试，实际定向测试 `10/10` PASS，累计 target focused suite `42/42` PASS；允许的 importer/test `node --check` 与 `git diff --check` 通过。未修改步骤 7 coordinator、Rust/native/source/**、IPC、Android、DB、契约、决策或产品入口。External Documentation Gate 为 no-op：仅使用现有 Node 内建 `crypto`/`fs`/JSON、项目内 protocol/store 和已锁定 Rust 4.5 contract。
  - 步骤 6 判定：PASS。`review-diff`、`review-implementation`、`verify-contracts` 和 `run-regression` 均未发现当前步骤契约违规或回归；全量 collector 的 1 项 deferred 断言和 26 项后续步骤预期缺口已保留为 task-wide observations，不阻塞步骤 6。下一步进入步骤 7 的完整 target transaction 与 typed error mapping。

- [x] 步骤 7：接通完整 target transaction 与 typed error mapping。
  - 输入：步骤 1～6 的 protocol、lifecycle、store 和 importer 结果。
  - 输出：`analyze → batch validate/stage → accepted=true,persisted=true ACK → complete/checkpoint validate → run finalize` 的 coordinator 链路；三种 mode、recovery pair、partial/canonical 和 `resource_limit_exceeded`/`resource_timeout`/cancel/source/protocol/process error 的稳定映射；只接受与当前 request/scope/receipt 一致的 complete。
  - 允许文件：`src/services/codexRolloutCollector/index.js`、`src/services/codexRolloutCollector/analyzerProcessManager.js`、`src/services/codexRolloutCollector/analysisBatchImporter.js`、`src/services/codexRolloutCollector/analysisCheckpointStore.js`、`src/services/codexRolloutCollector/analysisRunStore.js`、`tests/fixtures/codex-rollout-collector/fake-analyzer.js`、`tests/codexRolloutCollector.test.js`。
  - 独立验证：fake 端到端测试断言 ACK 绝不早于 receipt、ACK 不匹配时不接受 complete、complete 不能跨 request/job/scope、重复交付幂等、partial 不覆盖 canonical、错误 code/retryable 不被统一成 `analysis_failed`。
  - 完成门禁：保持 Node collector 隔离；不接 terminalGateway、IPC、Android、routes、HTTP history 或产品 DB。
  - 实际验证（2026-08-30）：在步骤 7 Allowed Files 内完成 `analyze → batch validate/stage → accepted=true,persisted=true ACK → complete/checkpoint validate → run finalize` 接线；正 ACK 仅在 receipt 持久化后发送，complete 只接受当前 request 的最后一次 accepted delivery 与一致 checkpoint，negative ACK 保持 Rust terminal 前的 single-flight，fatal typed error 触发 generation recovery，nonfatal typed error 保留稳定 code/details/retryable/fatal 语义。target/process/collector required-now selection `58/58` PASS；允许 Node/fixture `node --check` `9/9`、`git diff --check` 和 Allowed/Forbidden path scan 通过；collector 全量 `72/98` PASS、`26` FAIL、`0 cancelled`、无挂起，失败已分类为 1 项用户确认 deferred 与 25 项步骤 8 future-step expected gap。未触及 Rust/native/source/**、IPC、Android、DB、terminalGateway、产品入口、契约或决策文档。
  - 步骤 7 判定：PASS。`review-diff`、`review-implementation`、`verify-contracts` 和 diff-aware `run-regression` 均未发现当前步骤 regression、契约违规或未知失败；真实 Rust binary smoke、opaque identity retry 和更完整故障矩阵留给步骤 8。

- [x] 步骤 8：补齐故障矩阵、identity retry 和真实 Rust 跨进程 smoke。
  - 输入：步骤 7 的完整 target transaction 和已确定的 Rust binary 入口。
  - 输出：fake analyzer 的可控 resource/cancel/timeout/crash/stale/duplicate 场景；同一 job/scope 重试复用 Rust opaque delivery identity 且仅更新 request id 的证据；真实 Rust binary 至少一条 hello/analyze/batch/ACK/complete 证据。
  - 允许文件：`src/services/codexRolloutCollector/analyzerProcessManager.js`、`src/services/codexRolloutCollector/index.js`、`src/services/codexRolloutCollector/analysisRunStore.js`、`tests/fixtures/codex-rollout-collector/fake-analyzer.js`、`tests/codexRolloutCollector.test.js`；Rust 仅作为既有 binary/build 依赖，不修改 `native/**`。
  - 独立验证：运行 target Node focused suite；优先使用 `native/codex-rollout-collector/target/debug/codex-rollout-collector.exe`，缺失时使用仓库已有 Cargo manifest/build 入口；分别记录 fake-only 与真实 binary 结果，覆盖 source scope 隔离、batch range/index、checkpoint restart 和有限重启。
  - 完成门禁：Rust 文档与 binary 不一致、binary 无法运行或需要修改 Rust/source 时立即停止并记录 blocker，不用 fake 证据替代或扩大 scope。
  - 实际实施与验证（2026-08-30，`review_mode=discovery`）：仅修改步骤 8 允许的 fake analyzer 与目标测试。复用既有 resource/cancel/timeout/crash 注入，新增可控 stale batch、duplicate batch 和 Rust-owned opaque `segment_id`/`batch_id` 注入；新增测试确认 stale output 不进入 staging、duplicate delivery 只保留一条 receipt/range index、同一 job/scope 的 staging retry 保持 opaque delivery pair 只旋转 `request_id`。fake-only fault/lifecycle/identity selection `13/13` PASS。
  - 真实 Rust 验证：直接使用既有 `native/codex-rollout-collector/target/debug/codex-rollout-collector.exe`，未修改或构建替换 Rust 源码；Node 子进程完成 `hello → analyze → batch → ACK → complete`，batch 返回 `seg-<32hex>`/`batch-<32hex>`，source scope、range/index、cursor/完整行边界和 partial/provisional complete 均被断言；File checkpoint 重启后使用新 `request_id`，复用同一 job/scope、cursor 和 delivery identity，receipt 不重复。真实 Rust Node smoke `1/1`，Rust `target_identity` `6/6`，完整 `stage4_target_protocol` `70/70` PASS。
  - 步骤 8 判定（历史状态）：实现与单次 required-now 验证完成，但 `review-implementation` 发现 `RI-4.5-008-001` 的 duplicate batch ACK 时序不稳定；该 finding 直接阻止步骤 8 fault-matrix acceptance，且已通过本次 `lock-scope` 重新开放最小 Node 回补范围。`RI-4.5-008-002` 为不阻塞步骤 8、但必须在任务最终收口前处理的 earlier-step lifecycle follow-up。回补前 collector 全量为 `75/101` PASS；回补后新增测试使当时全量为 `84/110` PASS、`26` 项失败，失败保持为 `1` 项用户确认 deferred 与 `25` 项后续步骤 `future-step-expected-gap`，无取消/挂起。未触及 Rust/native/source/**、契约、决策、产品入口或其他 forbidden path。
  - 步骤 8 回补判定：scope widening 和 classify-decisions 已完成；按用户指示跳过重复的 plan-implementation，已直接完成 `RI-4.5-008-001/002` 第 2 次 verification repair，`RI-4.5-008-003` 已收口。duplicate batch 测试现在在 manager drain 后的 `commitComplete` 结算点观察 ACK，late-begin compensation 增加 primary fail writer 失败时的 terminal-update fallback；相关 focused tests 已通过，等待 `review-diff`/后续 verification 复核，在复核完成前步骤 8 仍不宣告 PASS。
  - 步骤 8 根因修复更新：`RI-4.5-008-003` 已完成第 1 次 verification repair；`_failStartup()` 现在在清理启动失败状态前建立 process termination fence，`kill()` 返回 false/抛错且没有 `exit` 证据时，live child 仍被围栏持有，`waitForIdle()` 和新 generation 不会提前完成。新增公开 `AnalyzerProcessManager.start()` 的错误 hello 回归，覆盖两种 kill 失败形态并全部通过；步骤 8 继续等待 `review-diff` 复核，尚未宣告 PASS。
  - 步骤 8 根因修复更新（历史状态）：`RI-4.5-008-003` 已完成第 1 次 verification repair；`_failStartup()` 现在在清理启动失败状态前建立 process termination fence，`kill()` 返回 false/抛错且没有 `exit` 证据时，live child 仍被围栏持有，`waitForIdle()` 和新 generation 不会提前完成。新增公开 `AnalyzerProcessManager.start()` 的错误 hello 回归，覆盖两种 kill 失败形态并全部通过。
  - 步骤 8 最终判定（2026-08-31）：`RI-4.5-008-001`、`RI-4.5-008-002`、`RI-4.5-008-003` 均已完成当前回补范围内的 review-diff、review-implementation、verify-contracts 和 diff-aware run-regression；步骤 8 required-now 的 fault matrix、identity retry、Memory/File delayed-begin compensation、startup termination fence 和真实 Rust 跨进程 smoke 均有通过证据。collector 全量仍保留 `1` 项用户确认 deferred 与 `25` 项 `future-step-expected-gap`，但没有当前步骤回归或未知失败；因此步骤 8 标记为 PASS，当前推进到步骤 9 最终收口。未触及 Rust/native/source/**、IPC、Android、DB、产品入口、契约或决策文档。

- [ ] 步骤 9：执行最终差分、实现、契约和回归收口。
  - 输入：步骤 1～8 的代码、测试和真实进程证据。
  - 输出：同一 `Current diff review target` 下的 `review-diff`、`review-implementation`、`verify-contracts`、`run-regression` 结果；CURRENT_TASK 的验收、回归项、blocker、执行记录和后续产品集成边界同步准确。
  - 允许文件：`docs/workflow/CURRENT_TASK.md`；如 review 发现实现问题，回到对应步骤，不在本步隐式修代码。
  - 独立验证：所有允许 JS/fixture `node --check`、目标 Node tests、适用 Rust target/native regression、`git diff --check`、Allowed/Forbidden path scan 和 TD-004 narrow gate 均有明确结果；无 release/canary 证据时保持 `Release mode none`。
  - 完成门禁：仅当无未解决的 blocks-merge finding、契约违规或越界变更时，才进入后续 `sync-current-task`/closeout；产品集成仍另立任务。

- 当前步骤：步骤 8 已完成 required-now 验证并通过；`RI-4.5-008-001`（duplicate ACK）、`RI-4.5-008-002`（late begin）和 `RI-4.5-008-003`（startup failure termination fence）均已在任务内回补窗口完成修复与复核收口。步骤 1～8 已完成各自的 focused review/contract/regression 门禁；`RI-4.5-004-016` 继续按用户决定 deferred，collector 全量中的 `25` 项后续步骤 expected gap 与 `1` 项 deferred 保持可见。当前推进至步骤 9，整体任务仍为 `active`/`blocks-merge`。
- 当前步骤 handoff：`sync-status`（步骤 8 已通过，步骤 9 最终差分/实现/契约/回归收口待执行）。

## 回归检查项

- [x] 对所有允许修改的 JS/fixture 执行 `node --check`（PASS；collector protocol/process manager、目标测试和 fake fixture 均可解析）。
- [x] 执行 `node --test tests/codexRolloutCollector.test.js`，记录通过/失败/挂起和真实子进程证据（回补 focused selection `12/12` PASS，包含 manager drain 后 `commitComplete` 的两次 valid duplicate ACK 观察、Memory/File late-begin compensation-failure `2/2`；duplicate fault-matrix 独立重复 `20/20` PASS；最新全量 `89/115` PASS、`26` FAIL、`0` cancelled、无挂起，`1` 项初始 hello deadline 断言按 `RI-4.5-004-016` 暂缓，另 `25` 项失败属于后续步骤的旧 legacy replacement/importer/checkpoint/coordinator 调用形状）。
- [x] 运行 target Rust binary 的至少一条真实 Node→Rust hello/analyze/batch/ACK/complete smoke；其余错误路径可用 fake analyzer 注入，但不得把 fake-only 证据写成 Rust binary 全链路证据（既有 debug binary `native/codex-rollout-collector/target/debug/codex-rollout-collector.exe` 真实 smoke `1/1`；包含 File checkpoint restart 后新 request id 复用同一 opaque delivery identity）。
- [x] 覆盖三种 mode、startup `sessions_root`、hello request_id/capability、禁止旧 request 字段和握手未完成时直接 `send(analyze)` 拒绝（步骤 1～2 focused tests 已通过）；步骤 8 新增 fake opaque delivery retry 与真实 Rust checkpoint restart 证明 deterministic delivery identity 保存/复用。
- [x] 覆盖单飞、pending replacement、cancel/timeout、generation stale message 和有限重启（步骤 4 lifecycle focused selection `23/23` PASS）；步骤 7 已补齐 retryable/non-retryable typed error mapping 与 fatal generation recovery，required-now selection `58/58` PASS。
- [x] 覆盖 batch/schema/provenance/source scope/cursor/completeness/mutation/checkpoint 校验、ACK-before-persist 拒绝、duplicate/overlap/conflict、partial→canonical 和 canonical 不降级（步骤 6 importer focused `10/10`、步骤 7 transaction/process/collector required-now selection `58/58`、步骤 8 fake/real smoke `13/13` + `1/1`；已覆盖 ACK-before-receipt、negative ACK stable code、complete delivery watermark、partial/canonical、typed resource/cancel/fatal mapping、stale/duplicate quarantine、range/index 和 checkpoint restart）。
- [x] 运行适用的 Rust target/native regression 作为依赖验证；`cargo test target_identity --manifest-path native/codex-rollout-collector/Cargo.toml` `6/6`，`cargo test --test stage4_target_protocol --manifest-path native/codex-rollout-collector/Cargo.toml` `70/70`；Rust source 层 deferred 风险不因本轮测试通过而标记 resolved。
- [x] 按 TD-004 执行或引用 confirmed narrow Node gate；既有 terminalGateway/sessionManager hanging surface 单独记录，不在本任务修复（已执行：29/32 PASS；`codexSecondaryPanel.integration.test.js`、`workspace.routes.test.js`、`workspace.web.test.js` 因缺少 `jsdom`/`express` 在加载阶段失败，尚未形成通过证据）。
- [x] 执行 `git diff --check`、Allowed/Forbidden path scan，并确认无 `native/**`、IPC、Android、DB、`terminalGateway` 或 `public/**` diff（PASS；仅允许的 `CURRENT_TASK.md` 与 Node collector process/import/store 文件、目标测试和 fake fixture 有变更；diff-check 仅有既有换行符提示）。
- [ ] 最终 review 必须使用同一个 `Current diff review target`，并在没有产品 release 证据时保持 Release mode none。

## 回滚点

- Task start base：`7a167711950710b05f3e84c8d3ad975df1c6ab0c`
- Last reviewed checkpoint：`not-yet-created`
- Current diff review target：`e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`（path-scoped；排除已提交的 workflow review skill 文件，后续 review 沿用该 target）
- 操作方式：任务内若产生 checkpoint，先把 checkpoint 与审查范围写回本节；需要回滚时只撤销本任务允许路径的提交/变更，保留任务外用户内容，不使用 broad reset/clean。

## 执行记录

- 2026-08-28：按 `create-current-task` 创建 `20260828-001`，读取 workflow profile/schema、CONTRACTS、STATUS、DECISIONS、BASELINES、Rust 4.5 architecture/startup/wire/data/coordinator 文档和现有 Node collector 状态。
- 2026-08-28：确认当前 HEAD 为 `7a167711950710b05f3e84c8d3ad975df1c6ab0c`，任务编号/slug 无冲突，创建前工作树 clean；未修改 Rust、Node 代码、测试、契约或产品路径。
- 2026-08-28：确认本任务只承接 Node isolated consumer/coordinator migration；Rust source candidate pre-I/O 与 formal source interruptibility 风险继续由独立 owner/联合评审承接。
- 2026-08-28：review 期间通过仓库 `rg` 完成 caller inventory，确认无 `codexRolloutCollector` 之外的仓库内生产 consumer；将兼容策略收敛为保留模块 exports/store 调用面、受控替换私有旧 wire，并补充按消息类型的证据要求。
- 2026-08-28：执行 `lock-scope`，锁定为 `frozen-scope`；Allowed 为指定 Node collector process/import/store 文件、目标测试/fake analyzer 与 CURRENT_TASK，Conditional 需逐项证据并重新 lock，Rust/native/source、IPC、Android、DB、产品入口和未列路径 Forbidden。未选择 guarded，理由是本任务无 production/database/deploy/CI/CD 等高风险写入；已记录 JSONL、process generation、ACK 持久化、checkpoint/identity 和 path-scoped rollback 等危险面；未修改代码或测试。
- 2026-08-28：执行 `classify-decisions`，将协议字段/校验、生命周期/重试、opaque identity、导入/ACK/checkpoint 顺序、错误映射、测试与范围门禁归为 Mechanical；无阻塞 Taste；将 Rust-first、三 mode、startup source boundary、单例采集链、opaque identity、fail-closed、隔离产品边界和 source deferred 事项列为已确认 User challenge。未修改代码或测试。
- 2026-08-28：执行 `plan-implementation`，在不修改代码、契约、决策或 lessons 的前提下，补齐 Node target protocol/process/import/store 的文件职责映射、generation/single-flight/ACK/checkpoint 状态不变量、legacy 兼容边界、替代方案、风险回滚、测试矩阵和 External Documentation Gate no-op 记录；未创建 `TECHNICAL_DETAILS-*.md`，因为当前 scope 未授权具体补充文档路径。
- 2026-08-28：执行 `decompose-task`，将迁移拆为 9 个一步一验的子目标：target protocol、startup/hello、attempt tracker、coordinator lifecycle、run/checkpoint store、batch staging/receipt、ACK/complete transaction、故障/真实 Rust smoke、最终审查回归；固定默认不新增文件/依赖，当前步骤为步骤 1，未修改代码或测试。
- 2026-08-28：执行 `implement-current-step` 完成步骤 1：重建 `analyzerProtocol.js` 的 target-only JSONL envelope 校验/构造入口，覆盖 hello/analyze/cancel/batch/ack/complete/error 七类消息、三种 mode、recovery 成对约束、cursor/checkpoint scope、一致性和 typed error/ACK 形态；batch delivery identity 保持在外层，旧 analyze 的 `replay`/`source_spec`/path/discovery/revision 等字段拒绝，batch 侧 legacy evidence 只保留为 additive opaque 字段。同步新增 target protocol focused tests，未触及 process manager、importer、store、Rust/native 或产品入口。
- 2026-08-28：步骤 1 验证通过：`node --check src/services/codexRolloutCollector/analyzerProtocol.js`、`node --check tests/codexRolloutCollector.test.js`、`node --test --test-name-pattern "target" tests/codexRolloutCollector.test.js`（6/6）和 `git diff --check`（仅既有换行符提示）。External Documentation Gate 本步为 no-op：仅使用仓库内已锁定的 Rust 4.5 contract 和 Node 内建 `node:util`，没有新增第三方依赖/API/CLI。ND-4.5-001 的 protocol portion 已覆盖，但 startup/hello gate 仍留给步骤 2，相关 finding 不在本步宣告完全关闭。
- 2026-08-28：执行 `implement-current-step` 修复 `RD-4.5-001-001`：`history_base` 现在会触发完整 lineage evidence 校验；新增 history_base-only canonical 拒绝和完整 lineage 正向测试。`node --check`、target protocol focused tests（7/7）通过；External Documentation Gate 继续 no-op（仅修改项目内 Node 校验逻辑，不涉及第三方 current behavior）。
- 2026-08-28：执行 `verify-contracts`（沿用 `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree` 的 path-scoped target），确认当前变更无 scope/decision drift，但发现 `RD-4.5-001-002`～`RD-4.5-001-006` 五项 Node 与 Rust target data/wire 边界不一致；均归入当前步骤、当前 Allowed Files 的 `current_task_owned` 修复队列，未修改实现、契约或决策文档。
- 2026-08-28：执行 `implement-current-step` 修复 `RD-4.5-001-002`～`RD-4.5-001-006`：对齐 Rust target event/evidence/lineage/cursor/output serializer 边界；新增对应正向与 fail-closed 测试。`node --check` 两个允许 JS 文件通过，target protocol focused tests `11/11` 通过；未修改 Rust/source、契约或决策文档。
- 2026-08-28：External Documentation Gate 本轮为 no-op：实现只复用仓库内已锁定的 Rust 4.5 contract 和 Node 内建 `node:util`，未新增、扩展或质疑第三方 library/API/CLI current behavior。
- 2026-08-28：执行 `review-diff`（沿用 `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree` 的 path-scoped target），通过；未发现 scope drift、decision drift、Forbidden path 变更或新的 `replay` finding。
- 2026-08-28：执行 `review-implementation`，步骤 1 未发现新的 critical/major 实现问题；target focused tests 通过；collector 全量仍因步骤 2～7 尚未迁移旧调用形状而未通过，未把该已知阶段性缺口伪装成步骤 1 完成。
- 2026-08-28：执行 `verify-contracts`，通过；确认 Node target-only protocol 与已交付 Rust target 边界一致，未修改契约/决策文档，`DEFER-002` source candidate pre-I/O 风险保持 deferred。
- 2026-08-28：执行 `run-regression`（diff-aware）：所有允许 JS/fixture `node --check` 通过；target protocol focused tests `11/11` 通过；`node --test tests/codexRolloutCollector.test.js` 为 `14/40` 通过、`26` 失败、无挂起，失败属于后续步骤的已知迁移缺口；TD-004 为 `29/32` 通过，3 个测试文件因缺少 `express`/`jsdom` 在加载阶段失败；`git diff --check` 和 Allowed/Forbidden path scan 通过；Rust target 真实子进程 smoke 按步骤 1 完成门禁延期至步骤 8。
- 2026-08-28：本轮回归未产生新的 review finding；整体任务仍未达到 merge gate，当前所有权为 `current_task_owned`，后续先同步项目状态，再进入步骤 2。
- 2026-08-28：执行步骤 2 的 `implement-current-step`：`analyzerProcessManager.js` 解析并校验 `CODEX_HOME`/sessions root，追加固定 startup 参数，建立 generation 级 Node-first hello 门禁；`fake-analyzer.js` 增加 argv 记录和 hello 正/负向注入；目标测试覆盖 startup path、argv、hello 顺序/request echo、协议版本、角色、capability、request mismatch、timeout，并断言握手前不发送 analyze。未触及 importer/store、Rust/native、契约、决策或产品入口。
- 2026-08-28：步骤 2 验证通过：允许 JS/fixture `node --check` 全部通过；`node --test --test-name-pattern "target process manager|target startup" tests/codexRolloutCollector.test.js` 与 `node --test --test-name-pattern "target" tests/codexRolloutCollector.test.js` 均通过，后者为 `18/18`；collector 全量为 `21/47` 通过、`26` 失败、无挂起，失败保持为后续步骤的已知迁移缺口；Allowed/Forbidden path scan 与 `git diff --check` 通过。External Documentation Gate 本步为 no-op：只使用已锁定 Rust 4.5 contract、项目既有 process wrapper 和 Node 内建 `fs`/`os`/`path`/`child_process`，未新增第三方 library/API/CLI。
- 2026-08-28：`ND-4.5-001` 的 protocol、startup 和 hello portions 已完成并标记 resolved；步骤 2 尚未经过 `review-diff`、`review-implementation`、`verify-contracts`，整体任务继续 blocks-merge。下一步：`review-diff`。
- 2026-08-28：执行 `review-diff`，沿用 `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`；范围、决策、安全边界和传播检查通过，无越界 finding；target focused tests `18/18` 通过，未修改文件。
- 2026-08-28：执行 `review-implementation`，沿用同一 diff target；startup/hello 主路径成立，但发现 `RI-4.5-002-001`：公开 `AnalyzerProcessManager.send()` 未检查 handshake-ready 状态，可能绕过 Node-first hello 发送 analyze；该 finding 位于步骤 2 Allowed Files 内，归属 `current_task_owned`，未修改文件。
- 2026-08-28：执行 `sync-review-findings`，将 `RI-4.5-002-001` 以 `open/current_task_owned` 写入审查队列；已读取 `TASKS/paused/**`，未发现匹配 owner，`TASKS/interrupted/**` 不存在匹配包；下一步 handoff 为 `implement-current-step`，先修复该 finding 后再重新审查步骤 2。
- 2026-08-28：执行 `implement-current-step` 修复 `RI-4.5-002-001`：为 `AnalyzerProcessManager` 增加 generation 级 `readyGeneration`，公开 `send(analyze)` 在 hello 完成前返回 `ANALYZER_HANDSHAKE_REQUIRED`；补充延迟 hello 下 spawn 后未就绪和 hello 消息校验阶段的负向测试，确认 fake outbound 只有 hello。未触及步骤 3 tracker、importer/store、Rust/native、契约、决策或产品入口。
- 2026-08-28：步骤 2 修复后验证：允许 JS/fixture `node --check` 全部通过；process/startup focused tests `8/8`、target focused tests `19/19` 通过；collector 全量 `22/48` 通过、`26` 失败、无挂起，失败仍是步骤 3～7 的已知迁移缺口；`git diff --check` 与 Allowed/Forbidden path scan 通过，仅有既有 LF/CRLF 提示；External Documentation Gate 为 no-op（未新增第三方依赖/API/CLI）。`RI-4.5-002-001` 标记 resolved，下一 handoff 为 `review-diff`。
- 2026-08-28：按步骤 2 范围完成后续 `review-diff`、`review-implementation`、`verify-contracts` 和 `run-regression`。target/process focused tests `19/19`、允许 JS/fixture `node --check`、generation stop/restart smoke、Allowed/Forbidden path scan 与 `git diff --check` 通过；collector 全量 `22/48`、`26` 失败、无挂起，失败明确归属于步骤 3～7 尚未迁移的旧 request/batch/importer/coordinator 形状，不作为步骤 2 的回归失败。步骤 2 判定 PASS，整体任务继续 blocks-merge；未修改 Rust/native、IPC、Android、DB、契约或决策文档。下一 handoff 为 `sync-status`。
- 2026-08-28：执行 `sync-current-task` 与 `sync-status`，按当前步骤范围固化步骤 2 PASS；`STATUS.md` 更新为 Node 4.5 任务进入步骤 3 的开发状态，未新增稳定或 release 声明。没有新的长期接口/架构边界，不修改 `CONTRACTS.md` 或 `DECISIONS.md`。当前 handoff 切换为 `implement-current-step`，开始步骤 3。
- 2026-08-28：执行步骤 3 的 `implement-current-step`：仅修改 `analyzerRequestTracker.js` 与目标测试，保留现有 tracker 调用面并增加 generation/attempt scope guard、hello/analyze/complete phase timer、一次性 settlement、cancel/timeout termination wait、stale callback 丢弃和 timer cleanup；未触及步骤 4 manager/index、batch/checkpoint、Rust/native 或产品入口。
- 2026-08-28：步骤 3 验证通过：tracker focused tests `4/4`、target focused suite `23/23`、允许文件 `node --check` 全部通过，`git diff --check` 通过（仅既有 LF/CRLF 提示）。`ND-4.5-002` 维持 open，仅记录步骤 3 tracker portion 已完成；完整 coordinator/process 生命周期问题留给步骤 4。External Documentation Gate 为 no-op；下一 handoff 为 `review-diff`。
- 2026-08-28：步骤 3 完成后的 collector 全量复跑为 `26/52` PASS、`26` FAIL、无挂起；新增 tracker 测试和步骤 1～2 target 测试全部通过，失败仍逐项落在步骤 4～7 的旧请求/batch/importer/coordinator 迁移缺口，未发现步骤 3 新回归。
- 2026-08-28：执行 `implement-current-step` 修复 `RD-4.5-003-001`：普通 `resolve/reject` 通过 `_settleAndReleaseEntry` 在一次性 settlement 后释放 tracker；cancel/timeout 仍保留到匹配 `markTerminated`，未修改步骤 4 manager/index 接线或其他范围外文件。
- 2026-08-28：`RD-4.5-003-001` 验证通过：tracker focused tests `4/4`、target focused suite `23/23`、允许文件 `node --check` 通过；全量 collector `26/52` PASS、`26` FAIL、无挂起，失败继续归属步骤 4～7 的已知迁移缺口；`git diff --check` 与 Allowed/Forbidden path scan 通过，仅有既有 LF/CRLF 提示。External Documentation Gate 为 no-op，下一 handoff 为 `review-diff`。
- 2026-08-28：执行 `run-regression`（diff-aware，沿用 `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）：target/startup/hello/tracker focused suite `23/23` PASS，允许的 collector JS、目标测试和 fake fixture `node --check` 全部通过；collector 全量 `26/52` PASS、`26` FAIL、无挂起，失败用例均落在步骤 4～7 的旧 `replay/sourceSpec`、replacement/importer/checkpoint、coordinator/restart 迁移缺口，未发现步骤 3 新回归；Allowed/Forbidden path scan 无生产越界依赖，`git diff --check` 通过，仅有既有 LF/CRLF 提示。paused/interrupted owner 无匹配项，归属 `current_task_owned`；本任务无 browser/session、视觉或 release 验证。下一 handoff 为 `sync-current-task`。
- 2026-08-28：执行 `sync-current-task`：步骤 3 保持 `[x]`，当前任务仍为 `active`/`blocks-merge`，全量 collector 的后续步骤失败保持可见且不阻塞当前步骤推进；当前 handoff 更新为 `sync-status`。未修改代码、测试、契约、决策或产品入口。
- 2026-08-28：执行步骤 4 的 `implement-current-step`：在 `AnalyzerProcessManager` 中将 request 绑定到 generation/attempt 并建立单 active slot；为 child stdout/error/exit、hello timeout 和取消终止加入 generation/child guard，旧进程消息只能丢弃；cancel/timeout 先发送 cancel 并保留 active 槽位，收到终止或 worker exit 后才释放。`CodexRolloutCollector` 增加全局串行调度、每 conversation 一个 running 与一个 pending、同会话 pending replacement、有限 process restart 和 retry 新 `request_id`；target lifecycle 没有 source scope 时只走 no-op ACK callback，不导入 batch 或提交 checkpoint。fake analyzer 增加 target batch/complete、延迟和一次性崩溃控制；目标测试覆盖并发、pending replacement、cancel/timeout race、crash/restart 及 stale batch/complete/error。未修改步骤 5～7 importer/checkpoint/store、Rust/native、契约、决策或产品入口。
- 2026-08-28：步骤 4 实现验证完成：允许 JS/fixture `node --check` 全部通过；步骤 4 focused lifecycle tests `5/5` PASS；collector 全量 `31/57` PASS、`26` FAIL、无挂起，失败仍集中于步骤 5～7 的旧 `sourceSpec/replay`、旧 batch/importer/checkpoint 迁移缺口；`git diff --check` PASS（仅既有 LF/CRLF 提示）。`ND-4.5-002` 的 manager/index lifecycle portion 等待 review，当前 handoff 为 `review-diff`；整体任务继续 `blocks-merge`，未作 release 声明。
- 2026-08-28：补正 `sync-current-task` 状态迁移：步骤 1～3 保持已完成，当前步骤正式推进为步骤 4（coordinator/process 生命周期），当前 handoff 更新为 `implement-current-step`；步骤 4～8 的未完成门禁、全量 collector 后续迁移缺口和整体 `blocks-merge` 状态均保持不变。未修改代码、测试、契约或决策文档。
- 2026-08-28：执行步骤 4 finding 修复：`RD-4.5-004-001` 通过 lifecycle generation、`initPromise` 收口和二次 stop fence 修复 delayed initialization 泄漏；`RD-4.5-004-002` 通过 settled-aware termination scope 修复 analyzer 忽略 cancel/timeout 时不执行 kill 的问题；fake analyzer 和目标测试分别增加两个回归场景。未触及步骤 5～7 importer/checkpoint/store、Rust/native、source/**、契约、决策或产品入口。
- 2026-08-28：步骤 4 finding 修复验证：允许文件 `node --check` 全部通过；步骤 4 focused lifecycle tests `7/7` PASS；collector 全量 `33/59` PASS、`26` FAIL、无挂起，剩余失败仍集中在步骤 5～7 的已知旧 `sourceSpec/replay`、batch/importer/checkpoint/coordinator 迁移缺口；`git diff --check` 通过，仅有既有 LF/CRLF 提示。External Documentation Gate 为 no-op；两个 finding 标记 `resolved/current_task_owned`，当前 handoff 为 `review-diff`，步骤 4 尚未宣告 PASS。
- 2026-08-28：执行 `sync-current-task`：根据 `review-diff` 结果统一当前 handoff 和步骤 4 详细状态为 `review-implementation`，将回归清单更新为最新 `33/59`（步骤 4 focused `7/7`，后续步骤 5～7 保留 `26` 项已知失败）；步骤 4 仍未打勾，未修改代码、测试、契约、决策或 STATUS。下一 handoff 为 `review-implementation`。
- 2026-08-28：执行 `review-implementation`（沿用 `7a167711950710b05f3e84c8d3ad975df1c6ab0c..working-tree`）：focused lifecycle tests `7/7` PASS，但复现 3 项步骤 4 内的 major implementation findings（stop/restart 生命周期竞态、deadline 未覆盖 restart/start 等待、`ANALYZER_PROCESS_NOT_RUNNING` 复用旧 child）；未修改代码。按 ownership guard，3 项均为 `current_task_owned`，无匹配 paused/interrupted Node collector owner，下一 handoff 为 `sync-review-findings`。
- 2026-08-28：执行 `sync-review-findings`：将 `RI-4.5-004-003`～`RI-4.5-004-005` 以 `open/current_task_owned` 写入审查问题队列，保留复现、最小修复方向和 required test；未修改代码、契约、决策或范围外文件。下一 handoff 为 `implement-current-step`。
- 2026-08-28：执行步骤 4 的 `implement-current-step` 修复 `RI-4.5-004-003`～`RI-4.5-004-005`：重启前后增加 intent/lifecycle/deadline 复核，startup/hello/restart 等待纳入总 timeout；`ANALYZER_PROCESS_NOT_RUNNING` 会失效并终止旧 child，等待 process invalidation 后再创建新 generation；`send()` 补充 non-writable/EPIPE/ERR_STREAM_DESTROYED 的统一错误。新增 stop/restart 竞态、初始及 in-flight hello deadline、延迟 restart、不可写 child 重试回归；步骤 4 focused lifecycle tests `12/12` PASS，collector 全量 `38/64` PASS、`26` FAIL、无挂起，剩余失败仍为步骤 5～7 已知迁移缺口。允许文件 `node --check` 与 `git diff --check` 通过；未修改 Rust/native/source、IPC、Android、DB、契约、决策或产品入口。External Documentation Gate 为 no-op：仅使用项目内现有 Node process wrapper/内建 API，未新增或依赖第三方 current behavior。3 项 finding 标记 `resolved/current_task_owned`，下一 handoff 为 `review-diff`。
- 2026-08-28：执行步骤 4 的 `implement-current-step` 修复 `RI-4.5-004-006`～`RI-4.5-004-008`：初始化建立可被 bounded intent 接管的 lifecycle context，deadline/cancel 后迟到的 public init 不再创建 child；collector 以绝对 request deadline 包裹完整 batch→ACK→complete request，并在最终 run completion 前复核预算；ACK/negative ACK 的 `ANALYZER_PROCESS_NOT_RUNNING`、`EPIPE` 和 `ERR_STREAM_DESTROYED` 统一触发当前 generation invalidation，重启等待收口后再创建新 generation。新增 bounded analyze 与 in-flight unbounded init、batch→complete 总 deadline、ACK 前 EPIPE 新 generation 重试回归；未修改步骤 5～7 importer/checkpoint/store、Rust/native/source、IPC、Android、DB、契约、决策或产品入口。
- 2026-08-28：步骤 4 本轮验证完成：步骤 4 focused lifecycle tests `14/14` PASS，新增 finding tests `3/3` PASS；允许 Node collector JS、目标测试和 fake fixture `node --check` 全部通过；collector 全量 `41/67` PASS、`26` FAIL、无挂起，失败仍集中在步骤 5～7 尚未迁移的旧 `sourceSpec/replay`、batch/importer/checkpoint 形状；`git diff --check` 通过，仅有既有 LF/CRLF 提示。`RI-4.5-004-006`～`008` 标记 `resolved/current_task_owned`，步骤 4 尚未宣告 PASS，下一 handoff 为 `review-diff`。External Documentation Gate 为 no-op：本轮仅修改项目内 Node 生命周期逻辑和测试，未新增或依赖第三方 current behavior。
- 2026-08-28：执行步骤 4 的 `implement-current-step` 修复 `RI-4.5-004-009`：`stop()` 与 `_invalidateCurrentProcess()` 不再以固定超时释放 termination fence；child 未退出时 grace 到期只发送二次 `SIGKILL`，`waitForIdle()` 和下一 generation 持续等待 `exit`/退出状态证据。新增 no-exit worker 回归覆盖两条终止路径、二次强制终止和 start/idle gate；未触及步骤 5～7、Rust/native/source、IPC、Android、DB、契约、决策或产品入口。
- 2026-08-28：`RI-4.5-004-009` 验证完成：目标 termination-fence test `1/1` PASS；步骤 4 相关 process/lifecycle targeted tests 通过；允许 Node collector JS、目标测试和 fake fixture `node --check` 全部通过；collector 全量 `42/68` PASS、`26` FAIL、无挂起，失败仍集中于步骤 5～7 尚未迁移的旧 `sourceSpec/replay`、batch/importer/checkpoint 形状；`git diff --check` 通过，仅有既有 LF/CRLF 提示。finding 标记 `resolved/current_task_owned`，步骤 4 尚未宣告 PASS，下一 handoff 为 `review-diff`。External Documentation Gate 为 no-op：本轮仅使用项目内 Node 内建 API，未新增或依赖第三方 current behavior。
- 2026-08-28：执行 `sync-review-findings`：将 `RI-4.5-004-010`、`RI-4.5-004-011` 以 `open/current_task_owned` 写入审查问题队列，保留 review-implementation 的 severity、定位、复现、最小修复方向和 required test；两项均限定在步骤 4 的 process manager/目标测试 Allowed Files，无匹配 paused/interrupted Node collector owner，无 scope widening、契约或产品决策。未修改实现代码、契约或决策文档；下一 handoff 为 `implement-current-step`。
- 2026-08-29：执行步骤 4 的 `implement-current-step` 修复 `RI-4.5-004-010`、`RI-4.5-004-011`：process termination fence 在清空 active/idle 状态前建立；request send/ACK failure 路径先 invalidation 再释放 request；post-spawn child error 不作为退出证明，并吸收后续 kill error，只有 exit/退出状态证据才释放 fence。新增预注册 idle waiter、ACK failure 和 `kill=false + EPERM + no-exit` synthetic-child 回归；未触及步骤 5～7、Rust/native/source、IPC、Android、DB、契约或决策文档。External Documentation Gate 为 no-op：仅复用项目内 Node 内建 API 和现有 process wrapper。
- 2026-08-29：步骤 4 本轮验证完成：步骤 4 lifecycle focused suite `25/25` PASS；允许 Node collector JS、目标测试和 fake fixture `node --check` 全部通过；collector 全量 `44/70` PASS、`26` FAIL、无挂起，失败仍集中于步骤 5～7 已知迁移缺口；`git diff --check` 通过，仅有既有 LF/CRLF 提示。`RI-4.5-004-010`、`RI-4.5-004-011` 标记 `resolved/current_task_owned`，当前 handoff 为 `review-diff`，步骤 4 尚未宣告 PASS。
- 2026-08-29：执行步骤 4 的 `implement-current-step` 修复 `RI-4.5-004-012`、`RI-4.5-004-013`：为每个 Rust child generation 接入 `stdin` 异步 error handler，将 `EPIPE`/`ERR_STREAM_DESTROYED` 统一纳入 process-unavailable 与 termination-fence 路径；coordinator 将 failure intent 的 public cancel/timeout settlement 与 worker drain 解耦，同时保留成功路径原有 idle 后 resolve 顺序，并让 deadline stop 立即发起、由内部 fence 异步收口。新增 stdin pipe error 与 cancel/timeout no-drain 回归；未触及步骤 5～7、Rust/native/source、IPC、Android、DB、契约或决策文档。External Documentation Gate 为 no-op：仅使用项目内 Node 内建 `EventEmitter`/process wrapper 与已有本地 contract evidence。
- 2026-08-29：步骤 4 本轮验证完成：允许 Node collector JS、目标测试和 fake fixture `node --check` 全部通过；包含 target/process/coordinator lifecycle、EPIPE/ERR_STREAM_DESTROYED 和 no-drain cancel/timeout 的 focused selection `23/23` PASS；成功路径既有请求顺序保持通过，`git diff --check` 通过，仅有既有 LF/CRLF 提示。`RI-4.5-004-012`、`RI-4.5-004-013` 标记 `resolved/current_task_owned`，`RI-4.5-004-014`、`RI-4.5-004-015` 继续 deferred 至步骤 6/7；步骤 4 尚未宣告 PASS，下一 handoff 为 `review-diff`。
- 2026-08-29：执行 `run-regression`（diff-aware，沿用 `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`，排除已提交的两个 workflow review skill 文件）：步骤 4 lifecycle focused selection `23/23` PASS；允许 Node collector JS、目标测试和 fake fixture `node --check` 全部通过；单独运行初始 hello deadline 场景为 `0/1`，失败仅是 timeout 后立即断言 `runningIntent === null` 与当前 termination-fence 语义不一致，已登记为 `RI-4.5-004-016`；collector 全量 `47/74` PASS、`27` FAIL、无取消/挂起，另外 `26` 项均属于步骤 5～7 尚未迁移的旧调用/导入缺口。`git diff --check` 与 Allowed/Forbidden path scan 通过，未发现新的功能性回归；无匹配 paused/interrupted Node collector owner。本轮不修改代码，用户已确认 `RI-4.5-004-016` 暂缓。
- 2026-08-29：执行 `sync-current-task`：根据 focused lifecycle `23/23`、用户对 `RI-4.5-004-016` 的暂缓决定和步骤边界，将步骤 4 标记为 PASS，并把当前步骤推进至步骤 5（target run/checkpoint 隔离持久化）；全量 collector 的步骤 5～7 已知失败与真实 Rust smoke 未完成状态继续保持可见，整体任务仍为 `active`/`blocks-merge`。更新回归检查项和当前 diff review target 为 `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`；只修改 `CURRENT_TASK.md`，未修改代码、测试、契约、决策、STATUS 或产品入口。下一 handoff 为 `sync-status`。
- 2026-08-29：执行步骤 5 的 `implement-current-step`：`analysisCheckpointStore.js` 改为复用 target `validateCheckpoint`，保存/加载按 conversation/source/source_epoch 隔离，显式 scope 的 job/request 绑定不匹配时拒绝；checkpoint 单调性只比较 completeness、source range、line/ordinal 和 projection watermark 等 target 进度，旧 fingerprint/prefix/revision 仅保留为 opaque metadata。`analysisRunStore.js` 记录 job/request/conversation/source、三种 mode、attempt、process generation、retry budget/count、receipt/batch progress、checkpoint/result/error，并保持 begin/update/complete/fail 的 scope guard、幂等和 completed 终态不降级。测试补充 Memory/File 重启恢复、跨 scope/identity 拒绝、partial→canonical、canonical 防降级、cursor 不一致、opaque legacy metadata 和 run retry/receipt/terminal 结果；未接入 stdout/ACK、importer/coordinator、Rust/native/source/**、契约、决策或产品入口。
- 2026-08-29：步骤 5 实施验证：允许 store/test 文件 `node --check` 通过；步骤 5 focused tests `4/4` PASS，target focused suite `27/27` PASS；collector 全量 `49/76` PASS、`27` FAIL、无取消/挂起，新增步骤 5 测试未引入额外失败，剩余 `26` 项属于步骤 6/7 尚未迁移的旧 `sourceSpec/replay`、旧 batch/importer/checkpoint/coordinator 形状，另 `RI-4.5-004-016` 按用户决定暂缓；`git diff --check` 与 Allowed/Forbidden path scan 通过，仅有既有 LF/CRLF 提示。`ND-4.5-003` 的 store portion 等待 `review-diff`/`review-implementation` 收口，当前 handoff 为 `review-diff`；整体任务仍为 `active`/`blocks-merge`。External Documentation Gate 为 no-op：本轮只复用已锁定 target protocol 和 Node 内建 API，未新增第三方 library/API/CLI。
- 2026-08-29：执行 `sync-review-findings`：将 `RD-4.5-005-001`、`RD-4.5-005-002` 以 `open/current_task_owned` 写入审查问题队列。两项均限定在步骤 5 的 checkpoint/run store 与目标测试 Allowed Files，已保留 review-diff 的定位、复现、最小修复方向和 required test；未命中 paused/interrupted owner，无 scope widening、产品、Rust 或长期契约变更。下一 handoff 为 `implement-current-step`；本轮未修改实现代码。
- 2026-08-29：执行步骤 5 的 `implement-current-step` 修复 `RD-4.5-005-001`、`RD-4.5-005-002`：checkpoint File/Memory store 在单调性比较前校验既有 checkpoint 的 `job_id`，同 job 更换 `request_id` 可恢复推进，跨 job 的低/高进度写入均 fail-closed；checkpoint/run artifact 在写入前清理已知 envelope 级 `source_spec`/`sourceSpec`、`replay`、`discovery`、`retention_profile` 和泛化 `revision`，保留 fingerprint/prefix 作为 opaque metadata，未递归解释 nested unknown 字段。目标测试补充 Memory/File 跨 job、同 job retry 和 legacy scrub 断言；未触及步骤 6/7、Rust/native/source/**、IPC、Android、DB、契约、决策或产品入口。
- 2026-08-29：步骤 5 修复后验证：两个 finding focused tests `2/2` PASS，target focused suite `27/27` PASS，允许 store/test 文件 `node --check` 全部通过；collector 全量 `49/76` PASS、`27` FAIL、无取消/挂起，新增修补未引入额外失败，剩余 `26` 项属于步骤 6/7 尚未迁移的旧 `sourceSpec/replay`、旧 batch/importer/coordinator 形状，另 `RI-4.5-004-016` 按用户决定暂缓；`git diff --check` 与 Allowed/Forbidden path scan 通过，仅有既有 LF/CRLF 提示。`RD-4.5-005-001`、`RD-4.5-005-002` 标记 `resolved/current_task_owned`，步骤 5 尚未宣告 PASS；当前 handoff 为 `review-diff`。External Documentation Gate 为 no-op：本轮未新增第三方 library/API/CLI。
- 2026-08-29：执行 `sync-review-findings`：将 `RI-4.5-005-003`、`RI-4.5-005-004` 以 `open/current_task_owned` 写入步骤 5 审查问题队列，保留 review-implementation 的并发复现、定位、最小修复方向和 required test；两项均限定在当前 checkpoint/run store 与目标测试 Allowed Files，无匹配 paused/interrupted owner，无 scope widening、产品、Rust 或长期契约变更。
- 2026-08-29：执行步骤 5 的 `implement-current-step` 修复 `RI-4.5-005-003`、`RI-4.5-005-004`：checkpoint File/Memory store 按 conversation scope 串行化完整读改写与删除/替换操作；run File/Memory store 按 `run_id` 串行化 `begin/update/complete/fail`，并保护 attempt/retry/generation/batch/receipt 的单调进度及 stale batch identifiers。新增同 scope 高低 checkpoint 并发、run progress 并发和迟到 failure update 回归；未触及步骤 6/7、Rust/native/source/**、IPC、Android、DB、契约、决策或产品入口。External Documentation Gate 为 no-op：本轮未新增第三方 library/API/CLI。
- 2026-08-29：步骤 5 并发 finding 修复验证：`node --check` 允许文件通过；新增 finding focused tests `2/2`、步骤 5 focused tests `6/6`、target focused suite `29/29` PASS；collector 全量 `51/78` PASS、`27` FAIL、无取消/挂起，新增测试未引入额外失败，剩余 `26` 项属于步骤 6/7 尚未迁移的旧 `sourceSpec/replay`、旧 batch/importer/coordinator 形状，另 `RI-4.5-004-016` 按用户决定暂缓；`git diff --check` 与 Allowed/Forbidden path scan 通过，仅有既有 LF/CRLF 提示。两个 finding 标记 `resolved/current_task_owned`，步骤 5 尚未宣告 PASS；下一 handoff 为 `review-diff`。
- 2026-08-29：执行 `sync-review-findings`：根据同一 `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree` diff target 的 `review-implementation` 输出，将 `RI-4.5-005-005`～`RI-4.5-005-007` 以 `open/current_task_owned` 写入步骤 5 审查问题队列。三项均为 run store 的 request/代际一致性、终态保护和 batch identity 单调性问题，最小修复限定在步骤 5 的 `analysisRunStore.js` 与目标测试；已检查 `TASKS/paused/**` 和 `TASKS/interrupted/**`，无匹配 Node collector owner，无 scope widening、契约、产品或 Rust 变更。下一 handoff 为 `implement-current-step`；本轮未修改实现代码。
- 2026-08-29：执行步骤 5 的 `implement-current-step` 修复 `RI-4.5-005-005`～`RI-4.5-005-007`：`analysisRunStore.js` 将 `request_id` 与 `attempt/process_generation` 绑定校验，拒绝低代际/同代际旧 request 和同 request 的代际推进；completed/failed 终态对普通 update 保持不可变，迟到 complete/fail 只返回已持久化终态，failed 仅允许更高 attempt 或 generation 的新 request begin 重试；batch/segment ID 在没有严格 batch 进度推进时保持当前值。新增 Memory/File 双后端 identity、终态和 batch identity 回归；未触及步骤 6/7、Rust/native/source/**、IPC、Android、DB、契约、决策或产品入口。External Documentation Gate 为 no-op：仅使用项目内既有 Node 内建 API 和锁定 contract，无第三方 library/API/CLI 变化。
- 2026-08-29：步骤 5 run-store finding 修复验证：`node --check` 允许 store/test 文件通过；新增 finding focused tests `2/2`、步骤 5 focused tests `8/8`、target focused suite `31/31` PASS；collector 全量 `53/80` PASS、`27` FAIL、无取消/挂起，新增回归未引入额外失败，剩余 `26` 项属于步骤 6/7 尚未迁移的旧 `sourceSpec/replay`、旧 batch/importer/coordinator 形状，另 `RI-4.5-004-016` 按用户决定暂缓；`git diff --check` 通过，仅有既有 LF/CRLF 提示。`RI-4.5-005-005`～`RI-4.5-005-007` 标记 `resolved/current_task_owned`，步骤 5 尚未宣告 PASS；当前 handoff 为 `review-diff`。External Documentation Gate 为 no-op：本轮仅修改步骤 5 允许的 Node run store 和测试，未修改 Rust/native/source/**、契约、决策或产品入口。
- 2026-08-29：执行 `review-diff`：沿用 `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree` 审查累计 Node collector diff，10 个变更文件均在 Allowed/Conditional workflow 范围内，无 staged/untracked、Forbidden Files、scope/decision drift、部署/数据库/CI/监控/benchmark/UI 变化；target focused `31/31`、run-store focused `4/4`、`node --check` 和 `git diff --check` 通过。发现 `RD-4.5-005-003`：failed run 经更高 attempt/generation 新 request reopen 后，旧 request 的 `complete/fail` 仅凭 run_id 无法被区分；只读 Memory probe 已复现旧 complete 将新 retry 标记为 completed。该 finding provenance 为 unknown，归属当前步骤 Allowed Files，下一 handoff 为 `sync-review-findings`；本轮未修改代码。
- 2026-08-29：执行步骤 5 的 `implement-current-step` 修复 `RD-4.5-005-003`：`BaseAnalysisRunStore.complete/fail` 增加向后兼容的可选 terminal identity context；传入 context 时强制校验 `request_id`、`attempt`、`process_generation` 与当前 run 一致，failed→retry 后旧 request 的 complete/fail 被拒绝，未传 context 的既有终态幂等调用保持兼容。步骤 7 仍需把 coordinator 当前 identity 传入 terminal 调用；本轮未触及步骤 6/7、Rust/native/source/**、IPC、Android、DB、契约或决策文档。
- 2026-08-29：步骤 5 terminal identity 修复验证：允许 store/test `node --check` 通过；新增 finding focused test `1/1`、`target run stores` focused tests `5/5`、步骤 5 focused tests `9/9`、target focused suite `32/32` PASS；collector 全量 `54/81` PASS、`27` FAIL、无取消/挂起，新增回归未引入额外失败，剩余失败仍为已知 `RI-4.5-004-016` 与步骤 6/7 尚未迁移的旧调用/batch/importer/coordinator 形状；`git diff --check` 通过，仅有既有 LF/CRLF 提示。`RD-4.5-005-003` 标记 `resolved/current_task_owned`，步骤 5 尚未宣告 PASS，下一 handoff 为 `review-diff`。External Documentation Gate 为 no-op：本轮仅使用项目内既有 Node 内建 API 与锁定 contract，未新增第三方 library/API/CLI。
- 2026-08-29：执行 `run-regression`（diff-aware，沿用 `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree` 的 path-scoped target）：步骤 5 required-now 的 9 个允许 JS/fixture `node --check`、`target run stores` `5/5`、target focused suite `32/32`、`git diff --check` 和实现路径扫描均通过；collector 全量 `54/81` PASS、`27` FAIL、无取消/挂起。失败分类为：步骤 4 已登记并按用户决定暂缓的 `RI-4.5-004-016` 1 项 `unrelated-preexisting`；其余 26 项为步骤 6～8 尚未迁移的旧 `sourceSpec/replay`、缺少外层 `job_id` 的旧 batch/importer/transaction 形状和真实 Rust 接线 `future-step-expected-gap`，无 current-step regression 或未知失败。真实 Rust binary 存在但不在步骤 5 required-now 范围内，留给步骤 8；无 UI/browser/session、发布、部署、canary 或 benchmark 验证要求。本轮未修改代码或治理文档。
- 2026-08-29：执行 `sync-current-task`：根据 `verify-contracts` 的当前步骤 PASS 和 `run-regression` 的 required-now 全部通过，将步骤 5 标记为完成，保留全量 27 项失败及步骤 6～8 future-gate，当前步骤推进至步骤 6，下一 handoff 为 `sync-status`；任务整体继续保持 `active`/`blocks-merge`。本轮仅修改 `docs/workflow/CURRENT_TASK.md`，未修改实现代码、`CONTRACTS.md`、`DECISIONS.md`、STATUS 或产品路径。
- 2026-08-30：执行步骤 6 的 `implement-current-step`：仅修改 `analysisBatchImporter.js` 与目标测试，建立 target batch 外层 delivery identity、source scope、cursor/provenance/lineage/completeness/mutation evidence 的导入前置校验；成功后以 atomic staging/receipt 保存，按 opaque `job_id`/`segment_id`/`batch_id` 幂等识别 delivery，允许 retry 更新 `request_id`，拒绝内容/scope 冲突；按 source range 稳定维护 range index，overlap item/detail/outcome 去重，partial→canonical 单调且 canonical 不降级，fingerprint/prefix 只作 opaque metadata；File store 增加并发导入串行化，保留 ACK/complete 给步骤 7 接线。新增批量、重启、并发、重试、冲突、completeness、checkpoint 和 malformed payload 测试；步骤 6 target importer `9/9`、累计 target focused suite `41/41` PASS，允许文件 `node --check`、`git diff --check` 通过。未触及步骤 7 coordinator、Rust/native/source/**、IPC、Android、DB、契约、决策或产品入口；未将步骤 6 标记 PASS。下一 handoff 为 `review-diff`。
- 2026-08-30：步骤 6 实施后的 collector 全量复跑为 `63/90` PASS、`27` FAIL、无取消/挂起；相较步骤 5 的 `54/81`，新增 9 个 importer 目标测试全部通过，既有 27 项失败数量未增加。失败分类仍为步骤 4 已按用户决定暂缓的 `RI-4.5-004-016` 1 项，以及步骤 6/7 尚未迁移或接通的旧 `sourceSpec/replay`、legacy replacement/importer/checkpoint 和 coordinator/restart 调用形状 26 项；未发现步骤 6 新回归或未知失败。真实 Rust binary smoke、ACK/complete coordinator 接线和最终 typed error mapping 留待后续步骤。
- 2026-08-30：执行步骤 6 的 `implement-current-step`（verification repair）：针对 `rfp-v1|acceptance=batch-legacy-field-boundary|owner=node-collector-importer|resource=target-batch-semantic-and-staging-payload|transition=validated-batch-to-staging-receipt|failure=nested-generic-revision-is-persisted-and-affects-redelivery-conflict`，仅修改 `analysisBatchImporter.js` 与 `tests/codexRolloutCollector.test.js`。在 target validator 之后增加 Node-owned payload normalization，递归移除泛化 `revision`，使 semantic content hash、history/tool/outcome/projection/mutation/staging/state 不再受其影响；`wire_source_revision` 保留，nested `replay` no-op 边界不变。新增 Memory/File 重启与 redelivery 回归；`target batch importer` focused tests `9/9` PASS，两个允许文件 `node --check` PASS。finding 更新为 `verification-pending/current_task_owned`，`repair_attempts=1`，保持 review epoch `20260828-001/step-6/d1`、repair base `unknown`、fingerprint、blocking=true 和 provenance=unknown；未修改步骤 7、Rust/native/source/**、契约、决策或产品路径。External Documentation Gate 为 no-op：仅使用现有 Node 内建 JSON/对象处理和已锁定本地 contract，不涉及第三方 current behavior。下一 handoff 为 `review-diff`（verification）。
- 2026-08-30：执行 `run-regression`（diff-aware，沿用 `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree` 的 path-scoped target）：步骤 6 required-now 的 importer focused tests `10/10`、累计 target focused suite `42/42`、9 个允许 JS/fixture `node --check`、`git diff --check` 和 Allowed/Forbidden path scan 均通过；collector 全量 `64/91` PASS、`27` FAIL、无取消/挂起。失败分类为：`RI-4.5-004-016` 1 项 `unrelated-preexisting`/用户已确认 deferred；其余 26 项为步骤 7～8 尚未迁移的旧 `sourceSpec/replay`、legacy replacement/importer/checkpoint/coordinator 形状和真实 Rust 接线 `future-step-expected-gap`；无 current-step regression 或 unknown。实际 runner 数量较此前记录增加 1 项但失败数量未增加，真实 Rust binary smoke、ACK/complete coordinator 接线和最终 typed error mapping 留待步骤 7～8。无 browser/session、视觉或 release 验证要求。本轮未修改代码。
- 2026-08-30：执行 `sync-current-task`：根据步骤 6 的 `review-diff`、`review-implementation`、`verify-contracts` 和 `run-regression` 结果，将步骤 6 标记为 PASS，保留 1 项用户确认 deferred 与 26 项 future-step expected gap；修正实际回归计数为 importer `10/10`、target `42/42`、collector `64/91`，并将当前步骤推进至步骤 7，下一 handoff 为 `sync-status`。本轮仅修改 `docs/workflow/CURRENT_TASK.md`，未修改实现代码、测试、契约、决策或产品入口。
- 2026-08-30：执行步骤 7 的 `implement-current-step`：在已锁定的 Node collector 范围内接通 target transaction 与 typed error/generation recovery。`index.js` 现在只有在 importer staging/receipt 成功后发送正 ACK，并以当前 request/job/scope/receipt/checkpoint identity 完成 complete/run 结算；negative ACK 使用 `batch_validation_failed`、`batch_scope_conflict`、`staging_unavailable` 稳定码，在 Rust `batch_rejected` 终态前保持 single-flight，`staging_unavailable` 按预算以同一 `job_id`、新 `request_id` 和上一 delivery pair 重试。`analyzerProcessManager.js` 保留 Rust typed error 的 code/details/retryable/fatal，fatal 先封存 generation、等待终止并重新 hello，只有 retryable 且有预算才重试；nonfatal typed error 不重启。fake analyzer 与目标测试新增 ACK 顺序、负 ACK 终态、同进程 staging retry、fatal generation recovery、nonfatal resource error 场景。聚焦 transaction selection `6/6` PASS，全量 collector `70/96` PASS、`26` FAIL、无取消/挂起；其中 1 项为用户确认暂缓的 `RI-4.5-004-016`，其余 25 项为旧 `sourceSpec/replay`、legacy replacement/importer/checkpoint 形状和步骤 8 真实 Rust 接线等 future-step expected gap，未发现新增未知失败。允许 Node/fixture `node --check` 全部通过，`git diff --check` 通过（仅既有 LF/CRLF 提示）；本轮未触及 Rust/native/source/**、IPC、Android、DB、terminalGateway、产品入口、契约或决策文档。`ND-4.5-003`、`ND-4.5-004`、`RI-4.5-004-014`、`RI-4.5-004-015` 更新为 `verification-pending/current_task_owned`，步骤 7 尚未标记 PASS。下一 handoff 为 `review-diff`。
- 2026-08-30：步骤 7 verification repair 的 coordinator 收口：`index.js` 对带 checkpoint 的 complete 额外要求 process manager 提供本 request 最后一次正 ACK 的 accepted delivery 证据；缺失时返回 `ANALYSIS_COMPLETE_WITHOUT_ACK`，不再仅凭 importer 历史 ledger 回退放行。允许 JS/fixture `node --check` 全部通过，target/process/collector 相关 selection 重新执行为 `56/56` PASS，`git diff --check` 通过（仅既有 LF/CRLF 提示）。`ND-4.5-003`、`RI-4.5-004-013` 仍为 `verification-pending/current_task_owned`，步骤 7 尚未标记 PASS，下一 handoff 为 `review-diff`（verification）。
- 2026-08-30：执行 `run-regression`（diff-aware，沿用 `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree` 的 path-scoped target）：步骤 7 required-now 的 target/process/collector focused selection `58/58` PASS；允许 Node/fixture `node --check` `9/9`、`git diff --check` 和 Allowed/Forbidden path scan 均通过；collector 全量为 `72/98` PASS、`26` FAIL、`0 cancelled`、无挂起。失败分类为：`RI-4.5-004-016` 1 项 `unrelated-preexisting`/用户已确认 deferred；其余 25 项为步骤 8 尚未迁移的旧 `sourceSpec/replay`、legacy replacement/importer/checkpoint/coordinator 调用形状和真实 Rust 接线 `future-step-expected-gap`。没有 `current-step-regression` 或未知失败。真实 Rust binary smoke、opaque identity retry 和更完整故障矩阵明确留待步骤 8；本轮未修改代码、测试或其他治理文档。
- 2026-08-30：执行 `sync-current-task`：依据步骤 7 的 `review-diff`、`review-implementation`、`verify-contracts` 和 required-now `run-regression` 均通过，将步骤 7 标记为 PASS；保留 1 项用户确认 deferred 与 25 项 future-step expected gap，整体任务仍为 `active`/`blocks-merge`。当前步骤推进至步骤 8（故障矩阵、identity retry 和真实 Rust 跨进程 smoke），下一 handoff 为 `sync-status`。本轮仅修改 `docs/workflow/CURRENT_TASK.md`，未修改实现代码、测试、契约、决策、STATUS 或产品入口。
- 2026-08-30：执行步骤 8 的 `implement-current-step`（首次实现，`review_mode=discovery`）：仅修改 `tests/fixtures/codex-rollout-collector/fake-analyzer.js` 与 `tests/codexRolloutCollector.test.js`。复用既有 resource/cancel/timeout/crash 控制，新增 stale/duplicate batch 注入和可控 Rust-owned opaque delivery identity；测试覆盖 stale quarantine、duplicate/receipt/range-index 幂等、同 job/scope staging retry 仅轮换 `request_id`，并断言不发送旧 `source_spec`/`replay`。未修改 Rust/native/source/**、契约、决策、产品入口或其他 Forbidden Files。
- 2026-08-30：步骤 8 required-now 验证完成：fake fault/lifecycle/identity selection `13/13` PASS；真实既有 Rust debug binary `native/codex-rollout-collector/target/debug/codex-rollout-collector.exe` 的 Node 跨进程 smoke `1/1` PASS，完成 `hello → analyze → batch → ACK → complete`，并验证 File checkpoint restart 后新 `request_id` 复用同一 job/scope、cursor 和 opaque `segment_id`/`batch_id`，receipt 不重复；Rust `target_identity` `6/6`、完整 `stage4_target_protocol` `70/70` PASS。collector 全量 `75/101` PASS、`26` FAIL、`0 cancelled`、无挂起；相比步骤 7 为新增 3 项全绿、失败数未增加，失败保持为 1 项用户确认 deferred 与 25 项后续步骤 future-step expected gap。允许 JS/fixture `node --check` `9/9`、`git diff --check` 和 path scan 通过。External Documentation Gate 为 no-op：本步只使用项目内既有 Node wrapper/内建 API、已锁定 Rust contract 和既有 binary，不涉及第三方 current behavior。下一 handoff 为 `review-diff`，步骤 9 最终收口仍待执行。
- 2026-08-31：执行 `sync-review-findings`：依据同一 `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree`、`review-implementation`、`discovery`、`20260828-001/step-8/d1` 和 `repair_base=unknown`，将 `RI-4.5-008-001`、`RI-4.5-008-002` 写入审查问题队列。前者为 duplicate batch ACK 时序不稳定的当前步骤阻塞 finding，后者为 deadline 后迟到 `runStore.begin()` 留下 `status=running` 的 earlier-step 生命周期 finding；二者均保留 evidence、canonical fingerprint、repair attempts `0`，因步骤 8 Allowed Files 不足标记为 `deferred/scope-widening candidate`，未伪装成 future-step expected gap。已读取 `TASKS/paused/**` 与 `TASKS/interrupted/**`，无匹配 Node collector owner；下一 handoff 为 `lock-scope`。本轮仅修改 `docs/workflow/CURRENT_TASK.md`，未修改实现代码、测试、契约、决策或其他范围外文件。
- 2026-08-31：执行 `lock-scope`：针对 RI-4.5-008-001/002 重新锁定任务内 Node collector 回补窗口。重新开放的生产文件仅为 analyzerProcessManager.js、index.js、analysisRunStore.js；步骤 8 原已允许的目标测试与 fake analyzer 继续保留。已记录 scope widening 的原因、影响文件、风险和验证方式，并重新生成当前回补窗口的 Allowed/Conditional/Forbidden 列表；未新增文件，未放开 native/source/**、Rust、IPC、Android、DB、产品入口或长期契约/决策文档。当前 handoff 为 classify-decisions，本轮未修改生产代码或测试。
- 2026-08-31：执行 `classify-decisions`：将 RI-4.5-008-001 的 duplicate ACK/complete drain 与 RI-4.5-008-002 的 late-begin invalidation/compensation 归类为 Mechanical；具体内部实现组织留给 plan-implementation。未新增 Taste 或待确认 User challenge，未修改生产代码、测试、契约或决策文档。当前 handoff 为 plan-implementation。
- 2026-08-31：按用户指示跳过重复的 `plan-implementation`，直接执行步骤 8 的 verification repair，沿用 review epoch `20260828-001/step-8/d1`、`repair_base=unknown` 和两个既有 fingerprint，两个 finding 的 `repair_attempts` 均由 `0` 增至 `1`。`analyzerProcessManager.js` 为同一 request 串行化已接收 batch callback/ACK，并让 complete 等待 batch drain；`index.js` 为 run-store begin 建立 deadline/cancel invalidation，迟到写入使用现有 `runStore.fail()` 补偿为 terminal failure；未改变 `analysisRunStore.js` 的公共 store API。目标测试新增 duplicate ACK-before-complete、Memory/File delayed begin timeout/cancel/failure 场景；focused selection `10/10` PASS，允许回补文件 `node --check` PASS。External Documentation Gate 为 no-op：本轮仅复用已锁定 Rust 4.5 contract、项目内 Node wrapper/内建 API 和既有测试入口，未新增第三方 current behavior。未触及 Rust/native/source/**、IPC、Android、DB、产品入口、契约或决策文档；两个 finding 当前为 `verification-pending`，下一 handoff 为 `review-diff`（verification）。
- 2026-08-31：执行 `investigate-root-cause`：针对 review-implementation 新发现的 startup failure termination 漏洞完成根因调查。公开 `AnalyzerProcessManager.start()` synthetic probe 在错误 hello、`child.kill() => false` 且无 `exit` 证据时稳定得到 `ANALYZER_HELLO_ROLE_INVALID`、live child 仍 attached、`processInvalidationPromise=false`、`waitForIdle()` 已完成；静态对照确认 `failCurrentProcess()` 有 termination fence，而 `_failStartup()` 没有。根因归属当前 Node collector process manager，命名 `RI-4.5-008-003`，blocking=true、repair_attempts=0；本轮未修改业务代码/测试，未触及 Rust/native/source/**、IPC、Android、DB、契约、决策或产品路径。External Documentation Gate 为 no-op；按调查 skill 的 current-task-owned 路由，下一 handoff 为 `plan-implementation`。
- 2026-08-31：按用户指示直接执行 `implement-current-step`，跳过重复的 `plan-implementation`，完成 `RI-4.5-008-003` 第 1 次 verification repair。`_failStartup()` 在 `_handleProcessFailure()` 前复用 `_trackProcessTermination()` 建立 child exit/status termination fence，并使用 `childHasExited()` 保持 kill 仅为 best-effort；未改变原有 startup failure code、`stopping` 或显式 retry 语义。新增真实公开 `start()` 的错误 hello 测试，覆盖 `kill() => false` 与 `kill()` 抛错：focused `2/2` PASS，相关 target/process manager selection `17/17` PASS，两个允许文件 `node --check` PASS；确认 fence 存在、exit 前 `waitForIdle()` 与新 generation 不完成，exit 后才释放。未触及 Rust/native/source/**、IPC、Android、DB、契约、决策或产品路径；External Documentation Gate 为 no-op。finding 更新为 `verification-pending/current_task_owned`、`repair_attempts=1`，下一 handoff 为 `review-diff`（verification）。
- 2026-08-31：按 `implement-current-step` 完成 `RI-4.5-008-001/002` 第 2 次 verification repair，沿用 review epoch `20260828-001/step-8/d1`、`repair_base=unknown` 与原 fingerprint；两个 finding 的 `repair_attempts` 由 `1` 增至 `2`。`RI-4.5-008-001` 保留生产 `batchDrain`，将 fault-matrix 测试改为在有确定延迟的第二个 importer callback 收口后、由 `commitComplete` 观察 ACK，避免 raw `message` observer 的 pre-drain race；`RI-4.5-008-002` 让 late-begin compensation 不再吞掉 primary `runStore.fail()`，失败时用当前 identity 通过 `runStore.update()` 写入 `status=failed` 的 `ANALYZER_RUN_COMPENSATION_FAILED` 记录，并保留原始 timeout/cancel 与 primary compensation error。新增 Memory/File fail-writer 注入回归；相关 target/process/collector selection `12/12` PASS，fault-matrix 重复 `20/20` PASS，补偿失败回归 `2/2` PASS，允许 JS `node --check` PASS。未触及 Rust/native/source/**、IPC、Android、DB、产品入口、契约或决策文档；External Documentation Gate 为 no-op。两个 finding 更新为 `verification-pending/current_task_owned`，下一 handoff 为 `review-diff`（verification）。
- 2026-08-31：执行 `run-regression`（diff-aware，沿用 `e17162b66145550e202f277d7b1f892ecadb4ce4..working-tree` 的 path-scoped target）：步骤 8 required-now 的回补 focused selection `12/12` PASS；duplicate fault-matrix 独立重复 `20/20` PASS；Rust `target_identity` `6/6`、完整 `stage4_target_protocol` `70/70` PASS；9 个允许 JS/fixture `node --check`、`git diff --check` 和 Allowed/Forbidden path scan 均通过。collector 最新全量 `89/115` PASS、`26` FAIL、`0` cancelled、无挂起；失败分类为 `RI-4.5-004-016` 1 项 `unrelated-preexisting`/用户确认 deferred，及旧 `sourceSpec`/`replay`、legacy replacement/importer/checkpoint/coordinator 调用形状等 `25` 项 `future-step-expected-gap`；无 `current-step-regression` 或 `unknown`。真实 Rust binary smoke 已由步骤 8 required-now 证据覆盖；无 browser/session、视觉、发布、部署、canary 或 benchmark 验证要求。本轮未修改代码。
- 2026-08-31：执行 `sync-current-task`：依据步骤 8 的 `review-diff`、`review-implementation`、`verify-contracts` 和 required-now `run-regression` 均通过，将 `RI-4.5-008-001`、`RI-4.5-008-002` 标记为 `resolved/current_task_owned`，确认 `RI-4.5-008-003` 已收口，并将步骤 8 标记为 PASS。保留 `RI-4.5-004-016` 的用户确认 deferred 与 `25` 项 future-step expected gap；整体任务仍为 `active`/`blocks-merge`，当前推进至步骤 9 最终差分/实现/契约/回归收口，下一 handoff 为 `sync-status`。本轮仅修改 `docs/workflow/CURRENT_TASK.md`，未修改实现代码、测试、契约、决策或产品入口。
