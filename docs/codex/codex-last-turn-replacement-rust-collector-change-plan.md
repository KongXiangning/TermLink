---
title: Codex Rollout 会话 lineage 发现、完整重建与最后 turn 编辑重发：Rust Collector 改造方案
status: implementation-backed
phase: P0-RC.1 additive compatibility and lineage extension
last_updated: 2026-08-23
source_of_truth: implementation-backed-design
related_docs:
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/codex/codex-rollout-collector-codex-compatibility.md
  - docs/codex/codex-rollout-recorder-source-technical-reference.md
  - docs/codex/codex-last-turn-replacement-server-sync-design.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
related_code:
  - native/codex-rollout-collector/src/source
  - native/codex-rollout-collector/src/codex_wire
  - native/codex-rollout-collector/src/codex_adapter
  - native/codex-rollout-collector/src/model
  - native/codex-rollout-collector/src/protocol
  - src/services/codexRolloutCollector
---

# Codex Rollout 会话 lineage 发现、完整重建与最后 turn 编辑重发：Rust Collector 改造方案

## 0. 文档目的和状态

本文修订原“最后一个 turn replacement”方案。Rust Collector 的一级目标不是只识别一条
`oldTurnId → newTurnId` 关系，而是：在有界来源范围内发现同一会话的 rollout 文件，建立
权威 lineage，重建当前 active head 的完整逻辑历史，并支持全量、尾部/向前补全和增量读取。
最后一个 turn replacement 是完整 lineage 读取后产生的一个派生事实。

本方案已经按 additive 兼容边界落地到 Rust Collector。新增的是会话级 source discovery、
跨日期 lineage、读取模式组合和协议证据；既有单文件 SourceBackend、cursor、adapter、
reducer 与 replacement validator 保持兼容。这里冻结的是 Rust Collector 的实现边界和
隔离 protocol 语义，不把它扩展成产品数据库、App ADTO 或 IPC 契约。

本文不设计产品服务端数据库、history provider、WebSocket ADTO、App SQLite 或 Android UI；
这些内容仍由阶段 4.5 的下游设计承接，但下游必须消费 Rust 交付的完整 lineage batch，不能
自行读取 raw rollout 或猜测父子关系。

## 1. 真实业务目标与不变量

### 1.1 Collector 的完整业务链路

```text
sessionsRoot + conversationId + 可选已知 rollout/head hint
    ↓
按日期分区做有界候选发现，不做全局递归扫描
    ↓
从文件名提取 conversation/rollout/time 候选信息
    ↓
读取 SessionMeta/history_base，建立并验证父子 lineage
    ↓
确定当前 active head，得到 root → head 有序链
    ↓
完整重建逻辑历史，保留已被替换的旧 turn
    ↓
按读取模式输出历史、coverage、provenance、cursor 和派生 replacement facts
```

### 1.2 已确认业务不变量

1. 稳定 `conversationId` 是会话身份；每一个 JSONL 文件有独立 `rolloutId`。`SessionMeta.id`
   不能被误当成 child rollout ID。
2. 普通 rollout 文件的正常写入是 append-only；编辑最后一个已终止用户问题时，Codex 新建
   child rollout，不回写父文件前缀，并在 child 首行 `history_base` 中记录父 rollout ID 和 cut。
3. child 文件可能位于父文件日期目录之后；发现算法必须能够从父/最早文件所在日期开始，
   在明确的日期上界内继续发现，而不是只扫描当前文件夹或全局递归扫描。
4. 文件名可用于候选发现、rollout ID 提取、会话过滤和时间/顺序提示，但不能单独证明父子关系。
   精确父子关系、cut 和会话绑定必须由 rollout 内容与 `history_base` 验证。
5. 当前 TermLink 只适配最后一个用户发起且已经终止的 turn 的一对一编辑替换；不扩展为任意
   逻辑后缀、多 turn 替换或通用分支图。
6. root 到 active head 的 lineage 历史必须包含被替换的旧 turn；旧 turn 的 active/inactive
   投影语义由下游持久化层处理，Rust 不删除旧 turn。
7. 同一物理 JSONL 的 append、child rollout transition、原路径截断/替换是三种不同语义，
   不能混用 `ForwardAppendCursor`、lineage transition cursor 和 `replace_previous`。
8. 关系、来源或读取证据不完整时必须保留可诊断的 partial/unknown 结果，禁止宣称完整
   canonical 历史或发布 active projection mutation。

### 1.3 合成 fixture 固定的发现约束

TermLink-owned 的 `sanitized-session-5` 合成 fixture 将发现契约固定为：同一稳定会话 ID 的
rollout 分布在 `2026/08/22` 和 `2026/08/23` 两个日期目录。文件名包含稳定会话 ID，并在
后续文件中带有 rollout ID 后缀；可由文件名形成候选顺序，但首行内容仍是关系验证依据。
fixture 中的可验证 parent chain 为：

```text
6a1b2c30-4d5e-4f6a-8b7c-9d0e1f2a3b40
  → 1a2b3c40-5d6e-4f7a-8b9c-0d1e2f3a4b50  cut=1/331
  → 2b3c4d50-6e7f-4a8b-9c0d-1e2f3a4b5c60  cut=1/474
  → 3c4d5e60-7f8a-4b9c-0d1e-2f3a4b5c6d70  cut=1/474
```

同一日期范围中还存在一个更早、没有 `history_base` 的 stale root-like 文件。它必须进入候选
目录和 provenance，不能
仅凭文件名被强行拼入上述链；但 Collector 也不能因为 active child 已经位于下一日期目录，
就停止在父文件日期目录。该样本因此同时锁定三条要求：跨日期发现、候选与权威 edge 分离、
服务重启后能够从最新 head 沿已保存 parent chain 恢复。

## 2. 与既有 source replacement 和读取能力的边界

| 情况 | 业务语义 | 读取/提交机制 |
|---|---|---|
| 同一活动 JSONL 继续增长 | 同一物理 source append | `ForwardAppendCursor` |
| 编辑最后一个终止 turn 生成 child rollout | 合法 history transition | lineage discovery + `history_base` cut + child read |
| 原文件截断、同路径内容替换、前缀变化 | 异常物理来源替换 | `replace_previous` / `sourceEpoch` |
| 同一会话跨日期目录出现新 rollout | 来源发现范围扩展 | bounded date discovery + lineage catalog |

父子切换不能复用父文件的 `ForwardAppendCursor` 读取 child。旧单文件
`SourceSpec`、full-read、tail、backward/range、backfill、append 和 cursor API 必须保持
backward-compatible；lineage 读取只能作为 additive orchestration 层提供。

这里的“全量、从尾往前、增量”是 JSONL 读取和 lineage 编排的读取模式，不是 HTTP/API 分页。
物理层使用 bounded segment/cursor，逻辑层负责把多个 rollout 文件恢复为同一会话的有序历史。

## 3. 职责切点

### 3.1 输入和发现职责

调用方必须至少提供：

- 受允许的 `sessionsRoot`；
- 稳定 `conversationId`；
- 日期扫描起点/上界或等价的可恢复 discovery checkpoint；
- 可选的已知 source/head path 作为 hint。

Rust 不依赖 Codex 私有 SQLite schema，也不要求调用方事先找到唯一最新文件。调用方提供的
active hint 可以缩小读取范围，但 Rust 必须验证该 hint 是否属于目标会话、是否位于有效 lineage
上，并检查有界范围内是否存在更新的有效 descendant。

### 3.2 职责表

| 职责 | Rust Collector 设计 | Node/同步设计 |
|---|---|---|
| 提供允许的 sessions root 和 conversation ID | 消费并验证 | 负责配置/授权来源范围 |
| 跨日期发现同会话 rollout 候选 | 负责 | 不重复扫描 raw rollout |
| 解析文件名候选信息 | 负责 | 不把文件名当 canonical identity |
| 解析 `history_base` 和建立父子边 | 负责 | 不解析 Codex wire |
| 确定 active head / 处理歧义 | 负责验证并 fail-closed；可消费显式 hint | 可提供 hint，但不得自行猜 old turn |
| root → head 完整历史重建 | 负责 | 消费 `AnalysisBatch` |
| full/tail/backward/backfill/append 的 lineage 编排 | 负责 | 选择任务用途和恢复时机 |
| 输出旧 turn、new turn、source lineage 和 replacement facts | 负责 | 事务级 preflight 和持久化 |
| 数据库、serverRevision、change log、WebSocket ADTO、App SQLite | 不负责 | 后续阶段负责 |

### 3.3 文件名和内容的权威分工

文件名解析器可以得到：

```text
conversationId candidate
rolloutId candidate
filename timestamp/date partition
candidate ordering key
```

但文件名不能单独得到可靠的 parent rollout。实际文件可能存在多个同会话 root-like 文件、
兄弟候选、缺失中间文件或重命名；`history_base.thread_id` 和 child/parent SessionMeta
必须作为关系验证事实。vendor 的 `HistoryPosition` 说明 `thread_id` 在这里应解释为
rollout ID，而不是稳定 `SessionMeta.id`。

## 4. 当前实现状态和明确缺口

现有 `7e9f552` 已完成以下可复用子能力：

- `HistoryBaseRef`、显式 source 下的 parent suffix 验证和 replacement validator；
- completed/stopped/interrupted、A→B→C、source guard 和重启后已知 lineage replay；
- `ReplaceLastTurn`、capability、ACK、coverage/evidence 分离和隔离 Node importer。

本文目标已经由以下实现覆盖：

1. `source::discover_session` 在显式日期边界或默认有界日期目录窗口内扫描候选，不做全局递归；
   可从 `sessionsRoot + conversationId` 自动选 active head，也可验证 rollout/path hint。
2. 文件名解析出稳定 conversation candidate、rollout ID、时间和日期分区；首行
   `SessionMeta` 再验证会话身份，`history_base` 建立权威父子关系；root-like stale candidate
   作为发现证据保留，不强行加入 active chain。
3. `SessionLineage` 交付 root→head chain、所有候选、transition、fingerprint 和 catalog，
   支持服务重启后只带会话 ID、日期根和 active hint 恢复，缺 parent/歧义/冲突 fail-closed。
4. stage4 discovery 接入 Replay、Preview、Backfill、Append：同文件 append 继续使用原
   `ForwardAppendCursor`；child transition 不复用父 cursor，而是重新读 child 并重建 lineage。
   服务重启时残留的旧 `source_id/source_epoch/path/cursor/anchor` 只作为发现提示；一旦发现
   新 active child，Collector 会切换到 child path/id/epoch，丢弃旧物理 cursor/anchor，并以
   child 的完整读取重新建立 lineage recovery 边界。
5. `BatchMessage`/`AnalyzerCheckpoint` additive 交付 `discovered_sources`、
   `lineage_transitions`、`lineage_coverage`、`lineage_checkpoint` 和已验证 replacement；
   未知事件仍只降低 coverage，不伪造 canonical mutation。

## 5. Rust→Node 交接形状

本节中的 Rust protocol 字段已经作为 additive 实现字段落地；它们仍然不是产品数据库或
App ADTO 的最终字段契约。

### 5.1 `LineageReadResult`

Rust 应向隔离 analyzer protocol 交付一个包含以下语义的 batch/result：

```text
LineageReadResult
  conversationId
  rootRolloutId
  activeHeadRolloutId
  discoveredSources[]
    rolloutId
    path/provenance
    filename time/date evidence
    source fingerprint/anchor
  lineageTransitions[]
    parentRolloutId
    childRolloutId
    historyBase cut
    validation status
  historyItems[]
  projection / derived fields
  coverage / completeness / diagnostics
  next lineage cursor or checkpoint
  replacements[]              # 已验证的派生事实
```

`discoveredSources`、物理 path 和 source evidence 只供 Node preflight、诊断和恢复使用，不暴露
给 App。`historyItems` 必须包含有效 active lineage 中的旧 turn；不把 old turn 物理删除交给
Rust。

`lineageTransitions[].validationState` 是逐跳的 TermLink-owned 状态，固定为：

```text
discovered
  已通过候选文件、SessionMeta 和 history_base 的发现/关联校验；本次读取尚未完成
  该 parent -> child 边的 replacement validation。

validated
  本次读取获得了 replacement validator 所需的完整且稳定 parent/child 证据，并通过当前
  最后一个已终止 turn 的一对一 replacement validation。它可以与 projection coverage
  为 partial 同时存在；是否允许 `ReplaceLastTurn` mutation 仍由独立 coverage 门禁决定。

validation_unavailable
  parent -> child 关系已经发现，但 Preview、部分 Backfill、或当前读取边界没有提供
  replacement validator 所需的足够证据；不能据此宣称 replacement 已验证。
```

当前阶段不输出 `rejected` 状态：replacement validation 明确失败仍按请求错误
fail-closed；把失败边转换为 partial batch 属于后续独立协议决策。该字段为 additive：旧
消费者忽略未知字段；新消费者读取没有该字段的旧 transition 时按 `discovered` 处理。

### 5.2 `LastTurnReplacement`

在完整 lineage 读取结果中继续保留 TermLink-owned replacement evidence：

```text
LastTurnReplacement
  replacementKey
  conversationId
  parentRolloutId
  childRolloutId
  replacedTurnId
  replacementTurnId
  replacedTurnTerminalStatus
  cut.endOrdinalExclusive
  cut.endByteOffset
  parentTurnStartSourceRef
  parentTurnTerminalSourceRef
  childTurnStartSourceRef
```

它是已验证的事实，不是服务端 `superseded` 字段，也不是物理 source replacement mutation。
服务端后续再把它应用为 read-model 投影关系。

## 6. Additive 改造设计

### 6.1 阶段 0：bounded session rollout discovery

目标：从已知会话和有限日期范围发现所有可能属于该会话的 rollout 候选，并确定可验证的
active lineage head。

方案：

- 从 `sessionsRoot` 下的日期分区起点开始，只枚举到显式日期上界/当前恢复边界；禁止对整个
  sessions 根做无界递归扫描；
- 按文件名筛选稳定 conversation ID 候选，解析 rollout ID、文件时间、日期目录和路径；
- 为每个候选生成文件名关系记录：稳定会话 ID、可选 rollout ID、文件时间、日期分区和相邻
  顺序候选；无 rollout 后缀的文件进入 root-like 候选，有 rollout 后缀的文件进入可验证的
  child/head 候选；该记录用于缩小 parent 搜索和恢复顺序，不直接提交 parent edge；
- 对候选文件读取最小 SessionMeta/header，验证稳定会话 ID、`history_mode`、rollout ID 和
  `history_base`；
- 用 `history_base.parent_rollout_id` 建立权威 parent edge；文件名时间/UUIDv7 只作为候选排序
  和发现游标，不作为唯一关系证明；
- 支持 parent 文件在前一日期目录、child 文件在后一日期目录；跨日期 catalog 必须可恢复，
  不依赖进程内中间 checkpoint；
- 由显式 active hint 优先缩小目标，或在候选中选择唯一有效 descendant；多个互相冲突的
  active head、无法验证的候选和 parent 缺失必须 fail-closed，不选择“mtime 最大文件”；
- discovery 结果保留 source path、file fingerprint、header evidence 和扫描边界，供后续
  lineage cursor/checkpoint 复用。

### 6.2 阶段 1：wire decode 和 TermLink-owned metadata

目标：把 vendor 已解码的 SessionMeta/history metadata 安全带出 Codex wire 边界。

方案：

- 不修改 vendored Codex 类型；
- 在 `codex_wire`/Adapter 边界读取 `history_mode`、`history_base`、SessionMeta identity；
- 转换为 TermLink-owned `HistoryBaseRef`、rollout/source metadata 和诊断；
- 保持无 `history_base` 的 legacy/current fixture 与普通 `SessionContext` 行为兼容；
- 未知 mode、字段缺失、会话不一致或数值非法继续走 Unknown/ParseGap/partial 语义。

### 6.3 阶段 2：lineage graph 和恢复计划

目标：从 discovered candidates 和 `history_base` 建立 root → active head 的线性 lineage，
并支持服务重启后跳过中间 rollout 的恢复。

方案：

- `RolloutCatalog` 扩展为跨日期、可恢复的候选目录；单目录 `from_directory` 只能作为一个
  分区扫描 primitive，不能作为完整 session discovery API；
- 每个 edge 同时保存 parent/child rollout ID、child history_base、cut、header/source guard；
- 从 active child 沿 `history_base` 向前解析 parent，检测缺失、循环、深度/资源上限和多候选；
- 任何合法 replacement 仍只验证最后一个已终止用户 turn 到一个新用户 turn 的一对一关系；
  不把 lineage graph 泛化为任意 branch model；
- parent/child 文件读取期间分别检查 snapshot、fingerprint、完整行边界和目标会话绑定；
- lineage graph 的 source identity、日期扫描边界和 head 选择证据进入 checkpoint，但不成为
  产品 DB schema。

### 6.4 阶段 3：session-lineage 读取模式

目标：把已有物理文件读取能力编排为会话级读取，而不把“分页”误解为 HTTP 分页。

#### 6.4.1 Full lineage replay

```text
发现候选文件
  → 验证 root → active head
  → 按 root → child → ... → head 顺序读取/归约
  → 输出完整 historyItems、coverage、transitions 和 replacement facts
```

必须保留被替换旧 turn；如果某个文件存在未知事件，结果可以是 partial，但不得静默删除
该文件已经确认的记录或宣称 canonical complete。

#### 6.4.2 Tail/backward lineage recovery

```text
从 active head 尾部读取最近完整行
  → 按 history_base cut 找父文件后缀
  → 必要时继续向更早 parent 读取
  → 以逻辑历史顺序交给 reducer
```

物理读取可以是 tail/backward/range segment，逻辑归约仍必须正序。每个父文件的 cut 都要
单独验证完整 JSONL 行边界；不能把 child 的 byte cursor 当成 parent cursor。

#### 6.4.3 Same-file append

同一 rollout 文件继续增长时继续使用现有 `ForwardAppendCursor`。cursor 只推进稳定完整
新行，尾部未完成行、source mutation、prefix mismatch 或 partial gap 不推进安全 cursor。

#### 6.4.4 Child rollout transition

发现新 child 后不得复用 parent 的 forward cursor。应创建 lineage transition cursor，至少
绑定：

```text
conversationId
activeRolloutId
parentRolloutId / childRolloutId
historyBase cut
每个 source 的 fingerprint / prefix anchor / snapshot boundary
日期发现边界和 lineage chain identity
```

child 自有区段读取成功后，再把 replacement evidence 和新的 active head 状态交给阶段 4；
child 未完成时不得发布 canonical `ReplaceLastTurn` mutation。

#### 6.4.5 `.zst` 边界

普通无 seek/index `.zst` 只承诺 forward stream，不伪造 tail/backward/append byte cursor。
跨文件 lineage 恢复必须按每个物理 source 的 capability 分别规划。

本阶段冻结的父 lineage 策略如下：

- 普通 `.zst` 作为 active/root source 时，只允许正序完整读取；它不提供 tail、backward
  或 append cursor。active `.zst` 若有 plain JSONL parent，只有在完整 Replay 能满足其他
  lineage/replacement 证据时才允许继续；Preview/Backfill 仍受 active source capability
  限制。
- 普通 `.zst` 作为 parent rollout 时，`tail_backfill_recovery`、
  `replacement_validation` 以及 parent full-history replay 一律 fail-closed，返回类型化的
  `LineageError::UnsupportedParentSourceCompression`；不返回 lineage batch，不发布
  replacement evidence、lineage cursor、checkpoint 或 `ReplaceLastTurn` mutation。
- 不把解压后的逻辑位置当作可复用的物理 byte cursor，也不在本阶段通过顺序解压偷偷实现
  parent cut 的随机读取。这样 plain child → ordinary `.zst` parent 的 lineage 会明确拒绝，
  而不会产生未经验证的混合历史。
- seekable/indexed `.zst` 或先物化为 plain JSONL 的 parent 支持属于后续独立能力扩展，必须
  新增 backend capability、cursor/快照证据和 fixture 后再改变本策略。

### 6.5 阶段 4：隔离 analyzer protocol

目标：在不接入产品 DB 的前提下，把 lineage batch、coverage 和 replacement facts 纳入现有
hello/analyze/batch/ACK/checkpoint conformance。

方案：

- 增加 additive lineage discovery/read result 和 `last_turn_replacement_v1` capability；
- Node 声明能力后，Rust 才发送新的 lineage fields/replacement mutation；未知能力 fail-closed；
- `historyItems`、source lineage、coverage、replacement evidence 和 checkpoint 必须处于同一
  batch evidence chain；
- 只有 source range、lineage coverage 和 projection coverage 均达到 canonical 条件时，才
  生成改变 active projection 的 `ReplaceLastTurn` mutation；evidence-only partial 仍可诊断/暂存；
- Rust 继续等待匹配 `accepted=true,persisted=true` ACK；相同 lineage/replacement replay 必须
  通过稳定 key、batch/checkpoint fence 幂等；
- 该 Node 目录仍只是隔离 validator/importer/store，不接入产品 history provider、gateway、
  Android 或 App WebSocket。

## 7. Fail-closed 条件

以下任一条件成立时，不得宣称完整 canonical lineage：

- sessions root、conversation ID、日期边界或 source binding 缺失/越权；
- 候选文件跨越允许日期范围，或发现扫描无界；
- 文件名候选无法解析 rollout ID，或文件名与 header/SessionMeta identity 不一致；
- active hint 不属于目标会话/lineage，或有多个无法消解的 active head；
- `history_base` parent 缺失、parent/child conversation 不一致、父链循环或超出资源预算；
- ordinal cut 与 byte cut 不一致、不在完整 JSONL 行边界或读取期间 source mutation；
- parent/child 的 replacement invariant 不成立：父最后用户 turn 未终止、child 无新用户 turn、
  child 多用户 turn、turn ID/terminal evidence 不匹配；
- 读取存在 pending tail、未知 schema、无法确认 gap 或 partial source coverage；
- 试图把 parent cursor 复用于 child，或把 tail/backward cursor 直接升级为 append cursor；
- Node 未协商所需 lineage/replacement capability。

失败时不得推进受影响 source/lineage cursor，不得回显旧安全 cursor，不得把 child 降级为普通
append，不得触发现有 `replace_previous` 清理。可以返回已确认 records、diagnostics 和
partial coverage，但必须明确不可作为 canonical 完整历史提交。

## 8. 实施范围

### 8.1 Rust 任务允许面

- `native/codex-rollout-collector/src/source/**`
- `native/codex-rollout-collector/src/codex_wire/**`
- `native/codex-rollout-collector/src/codex_adapter/**`
- `native/codex-rollout-collector/src/model/**`
- `native/codex-rollout-collector/src/protocol/**`
- collector 自有 fixture、unit、conformance、stage integration tests
- 本文、architecture、compatibility 和 recorder reference 的任务内同步

### 8.2 条件允许面

- `src/services/codexRolloutCollector/**`：仅为阶段 4 隔离 protocol validator、importer、
  Memory/File conformance store 和 subprocess tests 配套接受新的 lineage result；不得接入产品
  provider/DB。

### 8.3 禁止面

- 既有 product server routes、history provider 和正式数据库 migration；
- `terminalGateway`、Codex IPC authority、follower/owner lifecycle；
- Android wire、SQLite、ViewModel、Activity 和 UI；
- vendor Codex 源码语义修改；
- 用 Demo/Spike 作为 runtime dependency；
- 把本方案直接当作最终 App ADTO 或数据库契约。

## 9. 验证矩阵

| 场景 | 预期 |
|---|---|
| root 与 child 在同一日期目录 | 发现、关联、完整 replay |
| parent 在旧日期、child 在后续日期 | 有界扫描发现 child，不能只依赖当前目录 |
| 同会话多个 root-like/兄弟候选 | 文件名只作候选；无法唯一确认 active head 时 fail-closed |
| 文件名 rollout ID 与 SessionMeta/history_base 冲突 | fail-closed |
| 只提供 conversation ID + sessions root | 可在日期边界内发现候选并建立有效 lineage |
| 只提供最新 active 文件、服务已重启、缺中间候选 | 从允许目录恢复完整父链 |
| full lineage replay | root→head 历史顺序稳定，旧 turn 保留 |
| tail/backward lineage recovery | 从 head 尾部向 parent cut 回溯，逻辑归约仍正序 |
| 同文件 append | 只推进 `ForwardAppendCursor`，不重复、不提交尾部半行 |
| child transition incremental | 新建 lineage cursor，不复用 parent append cursor |
| 普通 `.zst` | 只提供 forward stream，不伪造 seek/append |
| plain child + ordinary `.zst` parent | parent lineage 类型化 fail-closed；不发布 lineage/replacement/cursor/checkpoint |
| ordinary `.zst` active/root full Replay | 允许正序读取；不提供 tail/backward/append cursor |
| 父最后 turn completed，child 合法重发 | 输出一条稳定 replacement |
| 父最后 turn stopped/interrupted，child 合法重发 | 输出 replacement，保留 terminal status |
| 连续 A→B→C | 输出有序两条 replacement，最终 C active |
| 未知事件、gap、partial parent | 保留 diagnostics/partial coverage，不宣称 canonical |
| cut mismatch、父缺失、父链环、多个 child user turn | fail-closed，不推进 cursor |
| 同一请求/restart/replay/ACK | lineage key、item key、batch/checkpoint 稳定幂等 |
| Node 未声明 capability | 明确 unsupported，不伪造 canonical |
| 无 `history_base` 的旧 fixture | 既有普通 source/replay 行为保持不变 |

回归已覆盖阶段 1–4 suite、full-vs-segmented oracle、append promotion/restart、Demo/Spike
同 fixture reference、Cargo source boundary、fmt/check 和 session-level fixture。新增的跨日期
fixture 验证了 conversation-only discovery、preview parent-suffix recovery、child transition
append、checkpoint lineage evidence；并加入可复用的
`native/codex-rollout-collector/tests/fixtures/sanitized-session-5/` 五文件 synthetic/sanitized
fixture，覆盖
`2026/08/22` → `2026/08/23`、stale root-like provenance、full/preview/backfill 和最新 active
path 重启恢复。该五文件样本中的 synthetic unknown developer-role 事件按当前兼容边界保持 partial、逐跳
`validation_unavailable` 且不生成 `replace_last_turn` mutation；complete replacement 仍由
独立的小型合成 parent/child fixture 覆盖。README 说明该 fixture 完全由人工构造的最小事件组成。

## 10. Rust Collector 方案完成条件

本次 Rust Collector 改造交付满足以下条件，阶段 4.5/Node 可以开始消费其上游结果：

- 能从 `sessionsRoot + conversationId` 的有界输入发现跨日期 rollout 候选，并确定唯一有效
  active lineage head，或对歧义 fail-closed；
- 能通过 header/SessionMeta/history_base 建立并验证 parent/child rollout 关系，文件名只作
  候选信息；
- 能按 root → active head 重建完整逻辑历史，保留被替换旧 turn，并交付 source lineage、
  coverage、diagnostics 和 replacement facts；
- full、tail/backward、backfill、same-file append、child transition 和重启恢复均有明确 cursor/
  checkpoint 语义，且不得跨物理 source 混用；
- 一条合法编辑只产生一个 old/new turn replacement；completed/stopped/interrupted 和 A→B→C
  均有真实结构 fixture；
- 非最后 turn、非终止 turn、cut mismatch、parent 缺失、候选歧义、跨日期缺失和读取 mutation
  全部 fail-closed；
- 阶段 4 capability、mutation、ACK、checkpoint 和重放幂等通过；
- 既有阶段 1–4 API 与普通单文件读取行为没有破坏性变化；
- 未接入产品 DB、WebSocket、IPC 或 Android；
- 文档、fixture 和验证矩阵足以让下一实施任务直接建立可审计的代码范围。

Rust 完成后向 Node 交付的是完整 lineage `AnalysisBatch`/read result 和其中的已验证
`ReplaceLastTurn` facts；Node 不再扫描 raw rollout，也不再自行猜测 active head 或 old turn ID。
