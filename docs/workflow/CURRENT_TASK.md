# CURRENT_TASK.md

## 任务信息

- 任务 ID：20260825-003
- 任务标题：收敛 Node↔Rust 接口文档，移除 discovery/fingerprint 业务接口语义
- 任务 slug：codex-node-rust-interface-contract-convergence
- 当前状态：active
- 创建时间：2026-08-25
- 创建来源：用户确认“Rust 那边 discovery、fingerprint 废止，接口文档需要更改”及其附带收敛依据
- 任务类型：架构/进程协议文档修订
- 任务目标：依据 Codex app-server append-only/parent-immutable 现实，将 Node↔Rust analyzer 接口从“Node 构造 discovery + fingerprint source guard”收敛为“Node 提供 conversation/request read intent，Rust 内部维护 source index 并按需检查 child；fingerprint 不再是 4.5 业务接口参数或正常 append 前置条件”。

## 背景与上下文

已确认的真实业务边界：

- rollout.jsonl 由 Codex app-server 控制写入；TermLink 只读分析；
- 同一 rollout append-only；turn resend 生成 child rollout，parent 不再变更；
- Branch in new chat 是新的 conversation，不能建立原 conversation 的 parent/child 依赖；
- 同一个 conversation 只有一条 Node→Rust 分析链；其他 worker 只能读取 Node 持久化 projection 或 IPC cache；
- Rust 应负责按 conversation 查找/维护内部 source index，Node 不判断是否 discovery，也不发送 discovery 业务字段；
- `history_base` 仍是 child→parent 关系的事实依据；source index/目录刷新是 Rust 内部实现，不是 Node↔Rust 公共请求参数；
- 旧 rollout 被等长度原地修改不是当前 Collector correctness contract；不为该非业务场景设计完整 fingerprint 防线。

本任务只修订接口文档和任务记录，不修改 Rust formal crate、Node runtime、测试、数据库或长期治理契约。formal native crate 为兼容现有 schema 暂留的 fingerprint/anchor 字段，不在本任务中删除；文档必须明确它们不再是 4.5 业务接口要求。

## 本轮追加修订：问题 2（2026-08-25）

用户进一步确认：Node 每个 conversation 只持久化一份 canonical 记录，不维护同一会话的多版本历史投影。因此 `serverRevision` 不是现行产品状态、Node↔Rust 字段、提交 fence 或恢复身份。

本轮只修订被视为现行来源的 4.5 Node↔Rust split contract 与 active collector architecture：删除其 `serverRevision` 的正向产品语义和字段性引用，统一改为“该 conversation 的唯一 canonical 记录”语义；历史 design-only / 已加 AD-020 标注的草案不在本轮重写。

## 验收标准

1. 接口文档不再把 `discovery` 列为 Node→Rust `analyze` 的业务字段或 4.5 必填接入步骤。
2. 文档明确 Rust 内部可按需执行 source index lookup/index refresh，但这不是新增 Node 接口。
3. 接口文档不再把 `fingerprint`、`prefix_anchor`、`source_fingerprint`、`source_prefix_anchor` 列为正常 append、active head 选择或 parent-child 验证的业务前置条件。
4. 文档保留 `history_base`、source_id/rollout identity、稳定完整行 byte offset、snapshot length、partial/pending 和 cursor 的必要语义。
5. `analyze` 接口收敛为 conversation/read intent、mode、cursor/恢复状态和资源预算；Node 不负责构造 discovery catalog。
6. 文档区分“4.5 业务接口废止”与“formal native crate 兼容字段暂留”，不把本次文档修订误写成 Rust schema 已完成删除。
7. 文档保留单 conversation single-flight、普通 append 增量读取、child transition/replacement、完整 lineage read 作为内部读取能力，以及首次/重启/无 checkpoint 时按普通 mode 重试恢复的规则。
8. `git diff --check`、接口字段检索和既有 `tests/codexRolloutCollector.test.js` 回归通过；不修改任务外 dirty/untracked 文件。

## 允许修改范围

- Safety mode：`frozen-scope`
- Dangerous surfaces：Node↔Rust 进程协议/架构文档；不执行生产变更、数据库 migration、部署、删除或历史重写。

### Allowed Files

- `docs/workflow/CURRENT_TASK.md`
- `docs/codex/codex-history-sync-node-server-rust-analyzer-interface-index-draft.md`
- `docs/codex/codex-history-sync-node-server-coordinator-contract-draft.md`
- `docs/codex/codex-rollout-collector-rust-analyzer-data-contract-draft.md`
- `docs/codex/codex-rollout-collector-rust-analyzer-wire-contract-draft.md`
- `docs/codex/codex-rollout-collector-architecture.md`
- `docs/codex/codex-concept-layer-status-registry.md`

### Conditional Files

- 无。上述追加文件范围仅覆盖问题 2 的现行来源清理；formal native crate、Node runtime、测试、数据库和历史 design-only 草案仍不在本轮范围内。

## 禁止修改范围

- `src/**`、`android/**`、`public/**`、`native/**`、`tests/**`、`scripts/**`、`db/**`
- `.workflow-system/**`
- `AGENTS.md`、`CLAUDE.md`、`docs/workflow/CONTRACTS.md`、`docs/workflow/DECISIONS.md`、`docs/workflow/LESSONS.md`
- 任何任务外 dirty/untracked 文件
- 不删除 formal native crate 的 schema 字段，不修改 Rust source index/discovery 实现。

## 受影响的契约

- Node `analyzerProtocol.js` 与 Rust stage4 process protocol 的 `analyze` 参数说明。
- 4.5 Node coordinator 与 Rust 内部 source index 的职责边界。
- source cursor/checkpoint 的业务解释：保留恢复位置和稳定行边界，移除完整 fingerprint 作为正常业务安全门槛的解释。
- 产品持久化语义：每个 conversation 一份 canonical 记录；不引入或依赖 `serverRevision` 多版本投影。

## 已确认决策

- `discovery` 从 Node→Rust 业务接口中废止；Rust 内部 source index lookup/refresh 不对 Node 暴露。
- fingerprint 从 4.5 正常业务路径废止：不参与 active head、parent-child、普通 append 或全文读取触发。
- `history_base`、source identity、byte offset、snapshot length、partial/pending 和 cursor 仍保留。
- formal native crate 的兼容 fingerprint/anchor 字段暂不删除；全局 schema 删除必须另开协议迁移任务。
- 不重新引入产品级 source replacement、multi-worker 仲裁或 commit fence。

## 待确认问题

- 无。用户已明确本次收敛方向；formal crate 字段删除属于后续独立范围，不作为本任务未决项。

## 实现方案

### Architecture impact

只修订接口文档中的 Node/Rust 参数边界和状态语义：

```text
Node coordinator
    → conversation_id + mode + cursor/recovery intent + resource limits
Rust analyzer
    → 内部 source index lookup/refresh
    → 按需检查 history_base/child
    → append delta / child transition / internal full lineage read
Node importer/coordinator
    → staging/evidence/产品 canonical transaction
```

`discovery` 不再是 wire 参数；Rust 内部扫描/索引刷新不计入 Node↔Rust 接口数量。fingerprint/anchor 不再出现在 4.5 业务 required/normal path 表中；如果仍出现在 formal compatibility 类型，只标为 legacy/opaque compatibility metadata。

### Technical approach

1. 删除接口文档中 `analyze.discovery` 参数、Node capability discovery 接入要求和 conversation-only discovery validator 缺口描述。
2. 将 source 定位改写为 Rust 内部 source index：Node 只提供 conversation/read intent；普通 append 直接消费同一 active source 的 cursor 后新增完整行。
3. 删除 fingerprint/prefix anchor 作为 active head、parent-child、append、checkpoint 正常 gate 的说明；保留稳定 source identity、byte range、snapshot length、history_base 和 cursor kind。
4. 将 source fingerprint 相关 formal 字段改成“兼容层可能暂存/透传的 opaque 字段，不得成为 4.5 业务判断”。
5. 保留内部完整 lineage read、child transition 的一次校验、partial/pending fail-closed 和 single-flight 约束；不把它定义为 Node 可请求的 analyze mode。

### Alternatives and tradeoffs

- 不把 discovery 改名后继续暴露：这仍会让 Node 错误承担 Rust 内部 source 定位职责。
- 不把 fingerprint 从 formal crate 一并删除：那会扩大到 Rust schema/Node validator/tests 的协议迁移，超出本轮文档修订范围。
- 不删除 history_base/lineage 事实：child 关系仍需由 rollout 内容和 `history_base` 验证；只是验证触发和索引管理留在 Rust 内部。

### Compatibility

- 7 个 message type 和 JSONL framing 不变。
- 既有 formal native artifact 的 fingerprint/anchor 字段暂保持可读；Node 不能将它们解释为 4.5 的正常必填业务参数。
- cursor 仍按 `tail_preview`/`backfill`/`forward_append` 分离；cursor identity 依赖 source id、conversation、读模式、稳定完整行位置和 snapshot length，不依赖全文 hash。
- App page/delta/chunk/ACK、clientSelectionGeneration 和 DB schema 不属于本次修改；`serverRevision` 只在
  registry/历史标注中保留为未采纳概念，不属于现行来源。

### Risks and rollback

- 风险：把“discovery 不再是接口字段”误写成“Rust 不得内部扫描”；用 source index lookup/refresh 文字明确区分。
- 风险：把“业务 fingerprint 废止”误写成“formal schema 已删除”；保留兼容字段说明。
- 风险：过度删除 lineage；保留 `history_base`、child transition 和内部完整读取恢复路径。
- 回滚：仅回滚本轮新增/修改的 Allowed Files，不使用整树 reset/checkout/clean。

### Validation strategy

- 检查接口文档中 `discovery` 不再出现在 Node→Rust 参数/4.5 implementation checklist；只允许作为“已废止/内部实现边界”的说明。
- 检查 fingerprint/prefix anchor 不再被描述为普通 append、active head、parent-child 或 canonical gate 的业务前置条件。
- 检查文档仍保留 `history_base`、cursor、byte offset、snapshot length、partial/pending、single-flight 和内部完整读取恢复语义。
- 运行 Node collector 回归测试和 `git diff --check`。
- External Documentation Gate：no-op；本任务只依据用户确认、项目架构和仓库内现有实现，不涉及第三方 current behavior。

## 实施步骤

1. [completed] 读取用户附带收敛依据、项目治理基线、整体架构和当前 Node↔Rust 接口文档。
2. [completed] 修订 Node↔Rust 接口文档的 discovery/fingerprint 参数和职责边界。
3. [completed] 执行字段检索、回归测试、diff 检查并同步任务记录。
4. [completed] 清理现行来源中的 `serverRevision` 正向产品语义，保留历史草案的 AD-020 边界标注。

## 回归检查项

- [x] `analyze` 不再把 `discovery` 作为 Node→Rust 业务参数。
- [x] Rust 内部 source index lookup/refresh 与 Node wire interface 已分开。
- [x] fingerprint/prefix anchor 不再是 4.5 正常 append、head 或 lineage gate。
- [x] `history_base`、cursor、byte offset、snapshot length 和 partial/pending 仍保留。
- [x] single-flight、普通 append 增量、child transition、内部完整读取恢复语义仍保留。
- [x] formal compatibility 字段暂留与业务废止边界明确。
- [x] Node 回归测试和 `git diff --check` 通过。
- [x] 问题 2：现行来源不再把 `serverRevision` 作为字段、版本水位、提交 fence 或多版本 projection；只保留单一 canonical record 语义。
- [x] 问题 2：旧 design-only / 已标注草案未被重写，registry 明确其不属于现行来源。

## 回滚点

- Task start base：`eaa3019`
- Last reviewed checkpoint：2026-08-25，前一接口文档任务已完成；本任务尚未创建 commit。
- Current diff review target：`working-tree vs HEAD`，仅限本任务 Allowed Files；保留任务开始前已有 dirty/untracked 文件。
- 恢复需审查：是；当前工作树已有阶段 4、治理文档和工具类 dirty/untracked 内容，不能整树回滚。

## 执行记录

- 2026-08-25：读取用户附带的收敛依据，确认 discovery 应从 Node→Rust 业务请求消失，Rust 内部保留 source index lookup/refresh；确认 fingerprint 业务语义废止但 formal native 字段暂不迁移删除。
- 2026-08-25：完成接口文档收敛；`analyze` 仅保留 conversation/read intent、mode、cursor/恢复状态和资源预算，Rust source index/有限刷新改为内部职责；formal v1 的旧 discovery/fingerprint 字段明确为 legacy/opaque compatibility metadata。
- 2026-08-25：验证通过：`node --test tests/codexRolloutCollector.test.js`（30/30），`git diff --check`（通过），并完成 discovery/fingerprint 正向必填与 gate 残留检索。
- 2026-08-25：完成问题 2 修订；6 份现行来源不再出现 `serverRevision` 字段性/正向语义，产品落点统一为每个 conversation 一份 canonical record；registry 同步登记现行来源集合。
