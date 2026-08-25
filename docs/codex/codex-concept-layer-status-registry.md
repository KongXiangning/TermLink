# TermLink Codex 概念分层状态清单（concept × layer × status registry）

- 状态：current（治理登记表，随决策演进追加，不回写历史）
- 建立依据：AD-020（`docs/workflow/DECISIONS.md`）
- 建立日期：2026-08-25
- 用途：唯一登记"哪些概念在哪一层保留、哪一层禁止、哪一层未采纳"的清单；审查接口对齐时先查本表，再比对字段。
- 维护规则：
  - 新概念进入任何契约文档前，先在本表归类；无法归类的按"待确认"记录，不默认视为 current。
  - 修改某概念的状态必须同步更新 `docs/workflow/DECISIONS.md` 的对应决策，并在文末变更记录追加一行。
  - 本表与具体文档标注冲突时，以更严格的层边界为准并修复漂移文档。

## 1. 层级定义

| 层级 | 名称 | 范围 |
|---|---|---|
| L0 | Codex app-server 现实 | 外部写入者行为：rollout*.jsonl 由 app-server 创建和管理，TermLink 只读分析，不可控其写入、重命名、分支或 turn 重发 |
| L1 | Rust formal native crate 内部 | `codex_wire`、Adapter、`session_lineage_v1` artifact、checkpoint、source discovery/index |
| L2 | Node↔Rust 4.5 公共协议 | startup / wire / data 三份 split contract 定义的 JSONL 接口 |
| L3 | Node 产品内部 | coordinator、staging、canonical DB、read model |
| L4 | App-facing | WebSocket manifest/page/delta、Android DTO、IPC |

## 2. 状态图例

| 状态 | 含义 |
|---|---|
| ✅ current | 现行保留：当前生效，可指导实现 |
| 🟡 scoped-retained | 限定保留：仅在指定层级保留，跨层使用即违规 |
| ➖ unadopted | 未采纳：有文档设计但无当前需求、无实现；不得作为现行依据 |
| ⛔ forbidden | 禁止：负向约束，任何层级不得引入 |
| ❌ absent | 该层不存在此概念 |
| superseded | 已废止/被替代：曾经有效，已被新契约替代；仅作历史记录 |

## 2a. 问题 2 的现行来源集合

本轮审查所称“现行来源”仅指 4.5 Node↔Rust split contract 与 active collector architecture：

- `codex-history-sync-node-server-rust-analyzer-interface-index-draft.md`
- `codex-rollout-collector-rust-analyzer-startup-contract-draft.md`
- `codex-rollout-collector-rust-analyzer-wire-contract-draft.md`
- `codex-rollout-collector-rust-analyzer-data-contract-draft.md`
- `codex-history-sync-node-server-coordinator-contract-draft.md`
- `codex-rollout-collector-architecture.md`

判定依据是文档头部的 `source_of_truth`、active architecture 定位和本节登记，不是文档被其他草案
引用的次数；`draft-design-only`、顶部 AD-020 未采纳标注或本节未登记的历史草案，不得反向升级为现行来源。

`codex-last-turn-replacement-rust-collector-change-plan.md` 有明确的 L1 formal-only implementation
background 价值，但不属于上述 L2 现行来源集合。其三态 `lineageTransitions[].validationState`
正文仅能作为 Rust formal/旧 payload 兼容历史阅读；4.5 公共 Data Contract 的两态定义优先，
不得用该方案的 `discovered` 描述当前公共输出。

其中，`serverRevision` 不得作为字段、产品状态、提交 fence 或多版本 projection 出现在上述来源；
历史 design-only / 已加 AD-020 标注的草案（包括旧 history-sync wire/DTO/App-facing 设计）仍只按本表的
`unadopted` 规则解释，不因检索命中而恢复为现行依据。

## 3. 主清单

| 概念 | L1 Rust formal | L2 Node↔Rust 4.5 | L3 Node 产品 | L4 App-facing | 判定与证据 |
|---|---|---|---|---|---|
| `source_epoch` | ✅ source identity/checkpoint 兼容 + fail-closed 标记 | 🟡 仅隔离协议兼容字段，非业务 gate | ⛔ 不得成 `productSource` | ⛔ 不得成 `publishedSourceEpoch`/产品历史命名空间 | AD-018；AGENTS.md「采集协调单例边界」；CONTRACTS.md P0-RC.1 条目 |
| `source_fingerprint` / `source_prefix_anchor` | ✅ formal SourceFingerprint/checkpoint 元数据；候选阶段禁全文 hash | 🟡 legacy opaque compatibility/diagnostic evidence，非 Node canonical gate | ⛔ 非 gate、非产品字段 | ⛔ 非 App DTO | data contract legacy 字段表；discovery/fingerprint decoupling target §3.3/§3.4 |
| `validation_state = discovered` | 🟡 枚举保留，仅为旧 payload 反序列化默认值（serde default）；现行生产代码只构造 `Validated` 与 `ValidationUnavailable`，从不主动产出 | ⛔ 已收敛排除：公共仅 `validated \| validation_unavailable` | ❌ | ❌ | `native/codex-rollout-collector/src/protocol/stage4.rs` 枚举定义与 additive 兼容测试；data contract §8；AD-017 后续标注 |
| `validation_state = validated / validation_unavailable` | ✅ | ✅ 两态即公共契约 | ✅（Node 按 evidence 分层消费） | ❌（不直接透出） | data contract §8 |
| `discovered_sources` / `lineage_transitions` / `lineage_coverage` / `lineage_checkpoint` | ✅ additive 隔离 protocol evidence | ✅ additive 字段，旧消费者缺失时保持可反序列化 | ⛔ 非产品表/history DTO | ⛔ 非 App ADTO | AGENTS.md「session_lineage_v1 evidence」；CONTRACTS.md SESSION_LINEAGE_CAPABILITY |
| discovery/path/catalog 作为 Node→Rust 请求 | ✅ Rust 内部 SessionLineageLocator / source index lookup+refresh 保留 | ⛔ Node 不发送；`sessions_root` 由启动契约固定 | ⛔ Node 不维护候选目录 | ❌ | AD-019；架构文档 locator 职责分层 |
| `analyze` 增加 full/recovery/discovery mode | ❌ | ⛔ 公共 mode 仅 `preview` / `backfill` / `append`；恢复=同请求新 `request_id` 重试交付 | ➖ 未来全量扫描须另立版本化接口 | ❌ | AD-019 |
| `retention_profile` 作为 `analyze` 公共请求字段 | 🟡 formal `Option<String>` 声明暂留，默认 `None`，当前无运行时 consumer | ⛔ 不属于 4.5 公共请求；Node 不发送、不校验、不解释 | ❌ | ❌ | wire §4.2 与 architecture §7 已删除公共字段；formal native artifact 仅按 legacy compatibility metadata 读取 |
| `rejected` transition 状态 | ⛔ 验证失败走 fail-closed 错误，不伪造成功 batch | ⛔ | ❌ | ❌ | AD-017 约束 |
| `commitFence` / 多写者提交线 / worker lease | ❌ | ❌ | ⛔ 单例边界下禁止引入 | ❌ | AD-018 |
| `productSourceReplacement` / `publishedSourceEpoch` | ❌ | ❌ | ⛔ 当前只需 `activeHeadTransition` | ⛔ 无 App source fence | head-transition contract §结论 |
| `activeHeadTransition` | 🟡 以 replacement mutation 形式输出 evidence | ✅ `replace_last_turn` + coverage gate | ✅ canonical writer 职责 | 🟡 经由后续 DTO 映射（另行任务） | data contract §7；AD-017 |
| `serverRevision` | ❌ 非 Rust 字段 | 🟡 现行接口不定义；仅在治理登记/历史标注中说明其未采纳 | ➖ 未采纳：Node 每个 conversation 只持久化一份 canonical 记录，无多版本投影，无实现无需求 | ➖ 同上 | 用户确认事实（2026-08-25）；问题 2 已清理现行来源的字段性与正向语义引用 |
| 泛化 item/source `revision`（source coverage watermark / 对象版本） | 🟡 仅作为旧 formal payload 和阶段 4 旧运行态的迁移残留；不再作为当前 L1 设计继续扩展 | ⛔ 4.5 公共数据契约不定义、不要求、不返回、不持久化，也不按高低值覆盖 | ⛔ 当前阶段只维护一份 canonical record，不做任何持久化版本管理 | ❌ | 用户确认事实（2026-08-26）；当前 architecture/data contract 已删除其公共语义；旧 Node/Rust 实现仍待独立协议迁移，禁止仅改名为 `item_revision`/`source_coverage_revision` |
| `revisionScope` | ❌ | ⛔ 不得进入公共协议 | ➖ 未采纳的概念命名：实现零引用；若未来确需认证分区隔离，应改名 `authenticatedPartition` 并定义 `key=(partition, conversation_id)` 另立任务确认 | ❌ | 全仓检索零实现命中；coordinator contract 已改为裸 conversation 表述 |
| 文件名/mtime/内容相似度/读取顺序推断 parent 关系 | ⛔ filename 仅候选提示；绑定只认 `SessionMeta.id` + `history_base.thread_id` + ordinal/byte cut | ⛔ | ❌ | ❌ | AGENTS.md rollout 现实约束；AD-018 |
| `max_lineage_depth` | ⛔ 已移除：改用 cycle detection + 目录/header/byte/deadline/cancel 预算 | ⛔ | ❌ | ❌ | AGENTS.md lineage 资源边界 |

## 4. 关键事实：`discovered` 在代码里的真实身份

```text
LineageTransitionMessage.validation_state 带 #[serde(default)]
枚举 LineageTransitionValidationState { Discovered(#[default]), Validated, ValidationUnavailable }

旧格式 payload 缺 validation_state 字段
  → 反序列化为 Discovered            ← 兼容读取路径（唯一入口）
现行两条生产路径
  → lineage suffix 重放: 显式构造 ValidationUnavailable
  → 完整 lineage 收集:   显式构造 Validated
  → 没有任何生产代码构造 Discovered
```

因此 `Discovered` 是 L1 层为 additive 向后兼容保留的枚举值：删除会破坏兼容承诺和 conformance 测试；
但任何文档把 `discovered` 写成"当前会主动输出的状态"都是错的。

## 5. 使用规则（防止把旧依据当成现行契约）

审查遇到登记表内的概念时，先回答两个问题再比对：

1. 它在哪一层？——L1 存在不等于 L2 必须接收；L2 否定语境提及不等于 L3 已采纳。
2. 它是生产者输出还是兼容读取？——枚举存在 ≠ 会出现在消息里。

只有同时满足"当前生产者会发出"且"当前消费者契约要求接收"，才构成接口不一致；
否则按本表标注为 legacy / unadopted / superseded，不算接口不一致。

对泛化 `revision` 还要增加一条审查门禁：不能因为旧字段仍存在，就把它改名后继续
升级为当前产品版本机制。先确认它是否属于 parser/wire 上游源码 provenance；若属于
item/source coverage 或持久化覆盖顺序，则按本表的旧协议迁移残留处理，当前公共文档不得
把它写成字段、返回值、持久化列或高低值比较条件。

## 5a. 实现状态维度（独立于契约状态）

契约状态回答"这是不是现行规范"；实现状态是**独立维度**，回答"代码是否已实现、旧代码是否仍在生成、是否只是兼容读取路径"。两者不得混用：AD-017 `discovered` 的误判根源就是把"枚举存在（实现事实）"当成"公共输出要求（契约事实）"。

| 维度 | 取值 | 说明 |
|---|---|---|
| 契约状态 | current / scoped-retained / unadopted / superseded | 见第 2 节图例 |
| 实现状态 | implemented / legacy-generated / target-only / migration-required | implemented=现行代码已按目标契约实现；legacy-generated=现行代码仍生成/要求旧协议形态；target-only=仅存在于目标契约、无实现；migration-required=需另立迁移任务收敛 |
| 证据 | 当前生产者、消费者、测试位置 | 文件 + 符号名，必要时附行号与快照日期 |
| 后续动作 | 迁移任务 ID 或 未建立 | 任务建立后回填 |

术语规则：描述迁移期一律使用「旧协议运行态 / 迁移前状态」；禁止用「兼容窗口」暗示旧协议已满足目标契约或与其双向兼容。

### Node↔Rust 协议实现状态对照（2026-08-25 快照）

| 条款（目标契约正文） | 契约状态 | 实现状态 | 证据 | 后续动作 |
|---|---|---|---|---|
| `analyze` 不含 `source_spec` | current（wire/data 正文） | legacy-generated | Node `analyzerProtocol.js` validateMessage 强制 source_spec 三字段且 epoch 必须 bound；Rust `stage4.rs` SourceSpecRequest 同构接收 | migration-required（任务未建立） |
| mode 仅 `preview / backfill / append` | current（wire 正文、AD-019） | legacy-generated | Rust AnalyzeMode 含 Replay；Node createAnalyzeRequest 默认 replay；Rust hello 广告 replay capability | migration-required（任务未建立） |
| batch 外层 `job_id/segment_id/batch_id` 及一致性校验 | current（wire/data 正文） | legacy-generated | Rust BatchMessage 外层无 job_id/segment_id；Node validateBatchMessage 不校验二者 | migration-required（任务未建立） |
| hello 协商 `analyze_v1` 能力交集 | current（wire 正文） | legacy-generated | Node hello 发 `analyze` 无 analyze_v1；Rust hello 无 analyze_v1 也无 append；两侧未实现协商 fail-closed | migration-required（任务未建立） |
| fingerprint/prefix anchor 为 opaque、非 Node gate | current（data 正文 legacy 表） | legacy-generated | Node canonical batch 强制 digest 校验两字段；Rust BatchMessage 中为 Option 可选 | migration-required（任务未建立） |
| `validation_state` 公共两态 | current（data 正文） | 部分 implemented | Rust 生产路径只构造 Validated / ValidationUnavailable；枚举保留 Discovered 反序列化默认值 | 保持；默认值移除随协议迁移评估 |
| item/source `revision` | superseded：当前公共契约不采用；旧 formal artifact 仅作迁移证据 | legacy-generated | `src/services/codexRolloutCollector/analysisBatchImporter.js` 的旧 revision/last_revision/projection_revision 路径；Rust stage4 旧 `BatchSourceRef` | migration-required（任务未建立；不得在本轮修改代码） |
| 单例采集链 / single-flight | current | implemented | Node coordinator scheduler/request tracker；Rust busy fail-closed | 已实现，保持 |
| ACK→complete→产品事务顺序、重试幂等交付 | current | implemented | Node importer 幂等导入；Rust complete 门禁 | 已实现，保持 |

注意：双方 `protocol_version = 1` 完全一致，上述差异发生在同一版本号之下，没有版本栅栏拦截——这是把本清单作为审查前置工具的直接原因之一。

### 本轮接口文档收口范围界定

- 四份拆分契约：startup / wire / data / coordinator——各增补非规范「当前实现状态」章节；
- 第五份是接口索引本身（`codex-history-sync-node-server-rust-analyzer-interface-index-draft.md`），同样增补；
- 架构文档仍是现行来源，不整体降级；其引用的 `codex-last-turn-replacement-rust-collector-change-plan.md` 及该方案自身均明确为 L1 formal-only「实现背景方案」，其中 product source replacement 等未采纳目标显式排除。

## 6. 已执行的残留标注（2026-08-25）

| 位置 | 处理 |
|---|---|
| `docs/workflow/CONTRACTS.md` 会话级输出语义 | 补充三状态的 formal artifact 边界说明 |
| `docs/workflow/DECISIONS.md` AD-017 | 追加 2026-08-25 后续标注（AD-020） |
| `docs/workflow/DECISIONS.md` | 新增 AD-020 登记本清单与判定规则 |
| `docs/codex/codex-history-sync-node-server-coordinator-contract-draft.md` | conversation 级 single-flight 改为裸 `conversation_id` 表述，移除 `revisionScope` |
| `docs/codex/codex-rollout-collector-architecture.md` | locator 职责与 lineage checkpoint 两处补 fingerprint/source_epoch 非业务 gate 说明 |
| identity-revision / canonical-reconciliation-state / ack-transaction / dto / delta-pagination / turn-dto-mapping / sequence-test-vectors / capability-compatibility-size / last-turn-replacement-server-sync-design / sync-app-history-ipc-consistency / head-transition-source-replacement / design-principles 共 12 份草案 | 顶部加 `serverRevision`/`revisionScope` 未采纳标注 |
| 问题 2 的 6 份现行来源 | 删除 `serverRevision` 的正向产品语义、版本递增和字段性引用，统一为单一 canonical record；历史草案不在本轮重写 |
| 五份采集器接口文档（startup / wire / data / coordinator / 接口索引） | 各增补非规范「当前实现状态」章节：五项协议差异列为迁移任务边界 |
| 架构文档 related-docs 与 decoupling-target | change plan 由「当前改造方案」改标「实现背景方案」；「兼容窗口」措辞改为「旧协议运行态」，不宣称双向兼容 |

## 变更记录

- 2026-08-25：建立本登记表；依据 AD-020 与用户确认事实完成首轮概念分类与残留标注。
- 2026-08-25：问题 2 修订现行来源集合，确认 `serverRevision` 仅为未采纳历史概念，不属于现行 Node↔Rust 接口或产品持久化语义。
- 2026-08-25（第三轮）：增补「实现状态」独立维度（implemented / legacy-generated / target-only / migration-required）与 Node↔Rust 协议实现状态对照表；五份采集器接口文档加非规范「当前实现状态」章节；架构文档旧方案引用降为实现背景；术语收敛为「旧协议运行态/迁移前状态」，不再用「兼容窗口」暗示双向兼容。代码迁移另立任务，不在文档轮顺带修改。
- 2026-08-26：旧 collector change plan 增加 L1 formal-only / 非 L2 公共契约边界；其 `discovered` 三态与 4.5 公共两态的阅读优先级明确收口。
- 2026-08-26：`retention_profile` 从 4.5 公共 `AnalyzeRequest` 删除；Rust formal 可选字段暂按无行为 legacy compatibility metadata 保留，不定义公共 owner、consumer、默认值或 profile 枚举。
- 2026-08-26：用户确认当前阶段持久化不做任何版本管理；泛化 item/source `revision` 不改名保留为产品机制，现行 architecture/data/coordinator/index 文档删除其公共字段、覆盖顺序和返回语义，旧实现字段登记为待迁移残留；parser/wire 上游 source revision 继续按独立 provenance 语义保留。
