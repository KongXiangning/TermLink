---
title: 委派输入与正常历史增长的最小共享兼容契约
status: active
owner: "@maintainer"
last_updated: 2026-10-05
source_of_truth: task-scoped-design
related_docs: [docs/product/requirements/REQ-20261005-codex-history-shared-compat.md, docs/product/plans/PLAN-20261005-codex-history-shared-compat.md, docs/codex/codex-rollout-collector-architecture.md, docs/codex/codex-rollout-collector-rust-analyzer-data-contract-draft.md, docs/codex/codex-rollout-collector-rust-analyzer-wire-contract-draft.md, docs/workflow/CONTRACTS.md, docs/workflow/DECISIONS.md]
---

# TASK-20260833 / S1：共享兼容设计

本文固定本任务的共享规范，S1-R1/R2 修正经自审 clean（ref=`key-9da7726c3ed64ab37608400182198197e38acbe7deca619892a62916484d5def.json`）。2026-10-05 按用户确认的本次在途直接同步方法发布到 CONTRACTS/DECISIONS 及关联规范，决定 ref=`key-e870e977a57361772ba5c894b4336ab2b374ae62cd00bb313de6570ae34d2fc3.json`。这是规范发布，不宣称现行二进制或产品已支持；S2–S5 的实现资格由实际记录决定。已采纳计划 ref=`key-81e218c75e20e038114c3745822b65db24660581f4d7f6b2751a5bbba3ca7d4e.json`，采纳 ref=`key-c9ee87ca72baea443b6cb1d53f14387af5407d633ad8cdf5988b80c0be34ff1d.json`。

## 1. 业务与来源

本任务负责：保存真实委派输入；允许来源明确的同轮开始→完成；验证二者通过正式 Rust/Node 入口和隔离产品存储保存。分支定位和三类真实宿主、手机切换/重开验收仍归 TASK-20260832。H1 不是已证实的 request 错绑：同 scope 的 turn mutation 从开始到完成变化，现行 importer 拒绝。H3 是三组双载体无普通工具 call_id，两类原生解码失败。依据为原任务 S1 修复补齐的脱敏 fixture、失败复现及 S2 范围。

继续遵守 CONTRACTS rollout/IPC 边界和 AD-004/018/019/020/021/022：外部源只读，单会话一条采集链/一个 in-flight request，仅 preview/backfill/append，源绑定与完整性分层，Rust 先交付、Node 后适配。无产品 epoch/revision/fence，无数据库结构或 App/IPC 改动，无预算放宽。

## 2. Wire 与自有委派事件

### 2.1 可识别输入

仅支持已有事实所覆盖的两种载体：`response_item.type=function_call_output`，及 `event_msg.type=item_completed` 内 `item.type=FunctionCallOutput`。委派形状须同时满足：没有非空普通工具 call_id；有效非空 native id；name 精确为 `create_thread` 或 `send_message_to_thread`；namespace 精确为 `codex_app`；output 为非空字符串。未知 name/namespace、错误类型、缺 id/output、同时具有不相容普通工具身份，仍诊断/partial。空 call_id 不等于合法委派；只有真正缺失且完整委派形状成立才可识别。

普通带 call_id 的 FunctionCallOutput 保留旧 ToolCompleted 语义和旧 required-call-id 校验，不按 name 或 output 内容猜委派。Wire 只在仓库内 vendor protocol 维护：ResponseItem 保留单一原生 variant，additive 表达可缺 call_id 的真实形状和 typed id/name/namespace/关联 metadata；TurnItem additive 加 FunctionCallOutput。若原生类型放宽了字段，Adapter 仍必须完整分类校验，不能使任意坏输出成为正常事件。真实 passthrough turn metadata 由 vendor 类型承载，facade 不另建重复 wire struct。

两个 vendor closure 使用同一最小 patch；先 Spike 解码/conformance，再 promotion 到 formal，记录实际 local_patches、闭包、许可证和 upstream `5ee6baee2fcc0b6ffd413d9611f5538dad40d0f2`，不伪造新上游版本。新增编译调用者只修直接受类型变化影响之处。

### 2.2 AnalysisEvent 结构（S2/S3 待实施）

以下仅示意事件字段；metadata 必须填入完整既有 EventMetadata，不能按空 object 发送。

```json
{
  "event_type": "DelegatedInput",
  "payload": {
    "metadata": {},
    "item_id": "真实 native id",
    "origin_tool": "create_thread | send_message_to_thread",
    "namespace": "codex_app",
    "carrier": "response_item | item_completed",
    "text": "原 output 字符串，保留正文，不截断为成功"
  }
}
```

metadata 保留 conversation/turn/source_ref/timestamp/availability，`correlation_id=item_id`，`item_key=delegated-input:<item_id>`，identity_origin=native_stable_id；related_item_key=null，不推断 sender 或不存在的 call。每份载体保持自己的 source_ref 和既有 source-position + semantic type 的确定性 event_id，两者不共用物理事件 id；不同读取、重试或重启对相同已识别事件复用同一 id/key。不得全局改旧 event_id/item_key 算法。

### 2.3 归属、去重与冲突

turn 依据 typed response passthrough 或 item_completed 的显式 turn_id；二者若并存必须一致。已验证的 active-turn 上下文只补缺失，显式值冲突不能被覆盖。无法证明归属时保持 partial，不能当普通 user turn。completed.thread_id 校验的是已验证物理 source 的原生会话绑定；canonical 目标仍是显式 target conversation。将来读取 parent A 到独立 C 时，由已验证 lineage/binding 决定，不直接要求物理 A 等于目标 C、不从 SessionMeta 猜 canonical id；H2 locating 实现不在本任务。

同 key 的两个 carrier 只有在目标会话、真实 turn、item_id、origin_tool、namespace、完整 text 全部一致时才等价。允许 timestamp/source position 不同；保留两份物理证据，只归约一个 delegated_input 项。跨段/重启需保留已有归属与去重状态；仅剩一个载体但字段和归属完整，不因缺配对而伪造 gap。同 id 不同 text/turn/tool 或 source binding 不一致必须 partial/拒绝，不取最后一份。工具详情只属于真实工具，不给委派生成 ToolStarted、call_id 或 detail ref。

投影 kind/presentation_kind=`delegated_input`，content=text；Node 产品 row 使用既有 payload/eventFacts，并明确 payload.role=`system`。正文上限沿既有资源策略，超限保持可诊断失败，不截断后宣称完整。Android 现有 system role、正文读取与 contentType 路径可复用；实际效果仍须原任务手机验收。

## 3. 合并允许条件

### 3.1 物理事件与逻辑项分开

物理 history event 按 event_id 保持内容不可变；既有受限 turn attribution promotion 规则继续单独处理。逻辑 mutation 按 item_key 聚合多份真实事件，后来的完成事件可以形成该逻辑项的新观察，但不是改写先前物理事件。FNV content_hash 只是现有一致性标记，不是来源认证、覆盖证明、身份或对象版本。Node 从验证后的 history_items 重算对应 hash，逐字段核对，不信 caller 声明。

所有新允许条件先通过现有 schema、当前 request/process generation、conversation/source identity、单例和 batch preflight；preflight 在任何实际写入之前完成。未匹配以下两类的变化仍走现有严格冲突处理；upsert_detail/usage/outcome/replacement 不随之整体放宽。

### 3.2 G1：同 turn 开始→完成（H1）

允许范围仅 `upsert_item`，同一 `turn:<真实turn_id>`、同一目标会话/物理 source scope；旧 mutation 必须逐字段对应已持久 TurnStarted，incoming 必须对应当前 batch 的 TurnCompleted(status=completed)。两个事件的 source_ref、turn/key、内容标记可核对，旧 TurnStarted 仍完整不变，完成事件确实处于其后且完整落在受验证覆盖内。

snapshot 的 completeness 证明历史覆盖与安全读取；turn 的 InProgress/Completed 说明该轮生命周期，二者独立。当前 Rust canonical gate 不要求 turn 已结束，完整且无 gap 的运行中 snapshot 可以保存 canonical TurnStarted；不得为避免合并冲突把运行中的 turn 强行改为 partial。

在本节全部 G1 证据成立的前提下，允许同 partial、同 provisional 的正向观察、既有完整性顺序中的升级，以及 **canonical→canonical 的 TurnStarted→TurnCompleted**。相同 canonical 等级不免除旧开始不可变、当前真实完成、同 scope、当前 attempt 和范围覆盖校验；此更新只替换逻辑 turn mutation 的观察，旧开始物理事件不改写。旧 canonical 不得被 partial/provisional 降级。完成→开始、同一完成事件正文变更、无真实开始事件、未知终态、不同 turn/source、仅 ordinal/hash 增大均拒绝。explicit abort/interrupted 的原语义不变，不借 G1 放宽。类似工具 start/end 的变化若聚焦回归发现阻塞，另列具体允许条件和受影响文件，不能预先套用 G1。

backfill：当前完整读取范围内须重见同一旧开始事件且内容不变，并包含完成事件及有序完整行；batch coverage 足以证明二者关系。若窗口没有覆盖旧开始，不声称 full proof，转用下一条已有持久证据校验或保持失败。

append：旧开始来自当前同 source 的已 ACK durable staging；当前 delta 包含完成事件。旧 accepted coverage 与当前 delta 的完整行范围必须无缺口连接或合法 overlap，旧/新交付及 checkpoint scope 都校验成立；若旧安全基线、旧开始或连续范围不能证明，拒绝此次更新，后续按普通 backfill 补足。Node 不读取源、不用 fingerprint 作为新公共 gate、不相信位置大小本身。

### 3.3 G2：等价委派双载体的逻辑证据补齐

允许范围仅 `upsert_item`、同 delegated-input key。旧和新 mutation 分别对应真实 DelegatedInput 物理事件，且满足 §2.3 等价条件；各自物理事件一旦保存不可改。两份证据都必须可从当前 batch 与既有 durable staging 验证。完整性不得倒退，canonical 不得降级。response_item 作为两者均存在时的稳定代表；只有 completed 时使用 completed，补齐另一载体时允许按本规则规范化来源。Node 不能仅凭相同 text/hash 合并无关联载体，不能使普通工具 mutation 享用 G2。

### 3.4 提交、重试与产品保护

保持 batch durable staging→正 ACK→Rust complete→Node validated complete→产品事务提交的顺序，各点分别取证。相同 job/segment/batch 的重交付必须 payload 相同；改变 request_id 不能使冲突批次变成新批次。同一拒绝不能通过换 key/source_epoch、提高 completeness 或删旧 receipt 绕过。新 batch、overlap/restart 不增加逻辑正文或重复详情。产品发布只使用已验证本次 projection 和业务 rows；内部旧 diagnostics 不是当前 projection.complete 的替代证据。

## 4. 版本与能力兼容

S3/S4 新增可选能力 `history_semantics_v2`，表示同时理解本契约 DelegatedInput、G1/G2 和存量解析规则。protocol_version、target data/checkpoint/cursor schema_version 均保持 1；不增加 analyze mode。这是新能力名的任务设计，不是已存在的能力事实。

Node 先发 hello，Rust 回同 request_id 的 analyzer hello；必须以能力交集启用，新 Rust 不因自己支持便向旧 Node 输出新事件。新解析 profile 的 reducer_version 固定 `target-v2`；旧 profile 仍为 `target-v1`。Node 校验 reducer envelope 和协商 profile，payload 内部状态仍由 Rust 解释。

| Node / Rust | 处理 |
| --- | --- |
| 新 / 新，交集有 history_semantics_v2 | 启用新事件、G1/G2、target-v2。 |
| 旧 / 新，无该能力 | 普通旧形状保持旧 profile；遇到必须输出委派的读取，在 batch 前返回 unsupported_capability，不发未知事件或伪 canonical。旧逻辑冲突保持旧行为。 |
| 新 / 旧，Rust 未声明该能力 | 可保留原普通历史路径；不得宣称委派/增长修复可用，不发送 target-v2 anchor。需要本能力的重读保留未解决状态。 |
| 新状态 / 旧 reader | 版本不支持必须 fail-closed，不偷偷降为旧 reducer。 |

profile 与 decoder/reducer 必须随 request worker 传递；S3 Rust 先支持选择，S4 Node hello/校验再启用。部分升级不引入第二 Rust 实例或跨会话能力泄露。

## 5. checkpoint、旧 ParseGap 与旧交付

1. **同 scope 未结算交付**：ACK 丢失/进程重启仍保留 job_id、segment_id、batch_id、原 parser/profile 和待交付 payload；新的 request_id 只是新 attempt。升级不得对同批次重新解释再返回不同 payload。旧 profile 无法重现原 payload 时明确失败并保留 intent/receipt，不能将它冒充新 profile 的重试。可使用先前已验证版本按原流程结算；本任务不自动部署/切换版本。
2. **普通新读取意图**：已完成/失败原 job、checkpoint、历史 receipt 和旧 canonical 原样保留在本地；在 hello 交集支持新能力后，新 profile 的重新分析创建独立普通 backfill job，不复用旧 job_id，不是 ACK 重试。请求固定 `cursor=null`、`persisted_anchor=null`、`known_complete_range=null`、`recovery=null`（可省略这些 optional 字段，含义相同），以实际 target conversation_id 交由 Rust 正常定位和重新读取，不发送旧 source path/catalog。合法 target-v1 checkpoint 的非空 cursor 不复制到该请求；不得修改原 checkpoint.cursor 或删旧记录。Node 的局部请求构造/selection 必须避免自动附加旧 anchor、范围或 recovery。Rust 入口原有 `persisted_anchor.conversation_id == conversation_id` 和 `persisted_anchor.cursor == cursor` 校验保留，**不新增 backfill 例外**。没有旧 anchor 就没有旧恢复状态或已覆盖范围可继承；新的 source/scope、完整行、coverage 与 canonical gate 必须由当前读取重新验证，读取失败继续保留旧 canonical。
3. **旧诊断保留**：新重读真实载体生成新的已识别 semantic event，旧 ParseGap/UnknownEvent 及原失败/receipt 原样保留为历史诊断。当前 event_id 算法含 semantic type，因此 ParseGap→DelegatedInput 的两个解释 id 不同；不能把旧 gap 的 id 借给新事件或把旧内容改写。二者通过相同物理 source_ref 可追溯，不据此将未验证 gap 标为已解决。
4. **当前投影资格**：完整 backfill 重建当前 projection，仅当所有当前 unknown/gap、carrier 冲突、coverage、source read、完整行与 canonical gate 都实际解决才能发布。历史诊断行可留在内部状态，不能把历史诊断数量当当前 projection.complete；也不能仅凭新能力或新版解析器自动清诊断。当前仍未解决的 gap 必须继续 partial。
5. **存储兼容**：使用现有 FileAnalysisStore、checkpoint/run record 和临时产品 SQLite，不创建产品版本命名空间或新 DB schema。Node 仅在实际旧 checkpoint/存量恢复回归证明需要时局部调整 checkpoint selection/profile；旧 canonical 保留，失败不得覆盖已发布正文。

§5.2 的新读取不是同 job 恢复。请求路径明确如下：

| 路径 | cursor / persisted_anchor / recovery / 已知范围 | 处理 |
| --- | --- | --- |
| target-v1 checkpoint 留存后，新能力 profile 普通重读 | 四字段为空；新 job_id | 旧 checkpoint 仅本地保留，正常 backfill 重建；不得继承旧范围来跳过读取。 |
| 原 job 未结算交付重试 | 原 profile、scope、checkpoint/cursor、segment/batch 身份按原请求恢复 | 新 request_id 仅新 attempt；原 payload 不重解释。不能自动改成新 profile backfill 来结算旧交付。 |
| target-v2 同源 append/真实恢复 | 合法同 profile anchor 与相等 cursor，recovery 仅用于对应实际待交付 | 现有绑定、请求校验及连续覆盖证明仍成立。 |
| target-v1 anchor 用于新 profile append | 不跨版本恢复 | 明确 checkpoint incompatible 并保留旧状态；若需重读，另选第一行的新意图。 |
| 任意请求带错 conversation 或 anchor/cursor 不相等 | 保留原严格校验 | backfill/append 均拒绝，不在 mapper 中绕过更早的入口拒绝。 |

上述第一行只固定可通过既有请求结构校验的形状；不保证实际源能读完或发布成功。S3 无须为它放宽 Rust cursor/anchor equality；S4 只调整必要的普通新读取参数选择，不重设整个 coordinator。

## 6. 文件与最低充分验证

| 阶段 / owner | 确切主要文件与条件边界 | 保护行为 |
| --- | --- | --- |
| S2 Rust wire | 两份 vendor `protocol/src/models.rs`、`items.rs`、vendor-manifest.toml；Spike `src/codex_decode.rs`；编译直接受影响的 vendored match 仅必要修正 | 两类实际形状解码、普通 call_id、畸形/未知拒绝，闭包与来源一致。 |
| S3 Rust | formal `src/model/analysis_event.rs`、`src/codex_adapter/mod.rs`、`src/analysis.rs`、`src/codex_wire/decode.rs`、`src/protocol/target.rs`、`target_runtime.rs`、`target_mapping.rs`；`target_data.rs` 仅新事件/恢复 envelope 校验实际必需处 | 正确身份/turn、双载体同 key 不同 event id、text 冲突 partial、状态重启、旧 profile 与新能力 fail-closed。 |
| S4 Node | `analyzerProtocol.js`、`analysisBatchImporter.js`；`analyzerProcessManager.js` 仅保存/传递 hello 交集及 request profile；`index.js`/`analysisCheckpointStore.js` 仅当存量恢复需要时做局部 profile/anchor 选择 | 新事件校验与产品 system role、G1/G2 正向和拒绝、旧 receipt/当前 generation、旧 anchor 普通读取。无调度、并发或全量 coordinator 重设计。 |
| S5 交付 | 既有 `tests/codexRolloutCollector.realRust.test.js`、`codexHistoryProductFlow.test.js`，临时 File/SQLite；既有 canonicalizer、provider 与 Android decode 只读核对，不预定修改 | 分别证明 H1/H3 持久 ACK、complete、产品事务、正文/真实工具详情、重开读取和旧 canonical 保护。 |

优先扩展既有 stage3 conformance、stage4 target tests、Node collector/recovery/realRust/productflow；fixture 从原任务 S1 脱敏包移植，补普通 call_id 和关键负向。新断言只针对原失败和共享不变量：G1 保留原 partial 开始→完成样本，并增加无 gap 的运行中 canonical 保存→完成后 canonical 保存，分别通过 full/backfill 重见旧开始与 append durable prefix+连续 delta 证明；有 gap、篡改、完成倒退、canonical 降级、错 scope/迟到仍拒绝。G2 验证任一载体先到/overlap/重启和相同 id 冲突。能力四组合及旧状态回归须包含非空 target-v1 cursor 原样本地保留、新 job 四字段为空可通过入口并实际重读、错 conversation/anchor mismatch 拒绝、新 profile append 不恢复旧 profile，以及原交付身份/payload 不变。不是逐 helper 测试，不要求全套或新 E2E 框架；本 S1 仅设计和静态核对，实际 Rust/Node/storage 回归留给 S3–S5。

任何测试应先能检出对应旧缺陷；真实 Rust 与临时产品存储验证不冒充真机验收。工具生命周期等未纳入允许条件若确实导致无法满足验收，保留具体失败和调整设计证据，不直接放宽所有 upsert。

## 7. 发布与后续交接

本文是规范，不是共享规则已启用。已同步的必要来源为 data contract §3/§6/§9、wire hello 能力/错误、architecture §4.3/§4.5/§5.4.8、compatibility、coordinator 和接口索引的定点补充；同项冲突按本规范精确限定解释。未清理历史漂移或声明整个 4.5 已迁移。

CONTRACTS/DECISIONS 保留原文并登记本次最小规范；初稿差异、原审查、S1 finish 时的 pending 均保留为真实历史。S2 根据明确用户选择直接同步同一已审查范围并保存前后证据，未改 Runtime/伪造 archive/旧 tuple/提前 close。方法例外只限本次；发布差异和结果由 `logs/shared-history-compat-20261005/s2` 与关联 execution 留存，不能以文档发布替代实际 wire/Adapter/Node/产品验证。

833 关闭仅是生命周期处置，不证明修复通过。交付实际版本、测试层级与未解决项后，明确 focus 回 832/S2，再整理其 S3/S4 重复范围、审查/finish S2；随后完成分支修复、三类真实保存与手机正文/工具详情验收。不得自动回到 832 或自动推进它。
