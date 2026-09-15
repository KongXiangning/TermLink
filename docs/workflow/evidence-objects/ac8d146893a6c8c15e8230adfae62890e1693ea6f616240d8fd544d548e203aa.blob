---
title: Codex 历史采集到 App 读取业务用例矩阵
status: draft
owner: "@maintainer"
last_updated: 2026-09-14
source_of_truth: audit-design
task_id: "001"
step_id: S1
related_docs:
  - docs/workflow/CURRENT_TASK.md
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/codex/codex-sync-app-history-ipc-consistency.md
  - docs/codex/codex-history-sync-node-server-coordinator-contract-draft.md
---

# Codex 历史采集到 App 读取业务用例矩阵

## 1. 目的、证据状态与适用层级

从用户打开、阅读、切换和恢复会话的业务目标出发，覆盖 Rust 读取分析 → Node staging/产品历史存储 → Node history 接口 → App 展示。先定义业务分支与数据预期，最后映射外部九项问题。问题台账不决定场景数量，也不作为正确性 oracle。

本文件的 S1 主体是**设计交付**，S1 当时没有执行业务案例。S2 的当前 Rust 执行状态增补在§10，失败后的未到达断言仍未验证。按重规划，S3 核实九项问题，S4 仅静态评估 Gemini 修复。真实 Node/DB/App 集成测试、实际修复和性能测量后置；本文不证明九项问题成立或 Gemini 修复正确。

层级：R = Rust formal/4.5 target；N = Node Coordinator 与 staging；D = Node 产品事务/历史读模型；Q = Node→App history 消息；A = App 本地历史/展示；I = 健康 IPC。R 可在后续本任务执行真实进程核查；N/D/Q/A/I 在此任务仅设计与只读入口核对。各表使用“链路模板 + 数据集 + 本行差量”构成完整用例；未参与层按模板明确为不参与，不能被统计成已执行。

### 1.1 权威依据和冲突处理

| 来源代号 | 路径/条款 | 本矩阵采用的内容 |
|---|---|---|
| ARCH | codex-rollout-collector-architecture.md §2.1.1–2.1.3、§3.1、§4.6、§5、§7、§8、§10 | 单例调度、外部 source、读取/完整性/保留语义 |
| CO | codex-history-sync-node-server-coordinator-contract-draft.md §1–8 | job、逐 batch staging ACK、complete 后产品事务、异常与恢复 |
| WIRE | codex-rollout-collector-rust-analyzer-wire-contract-draft.md §1–5 | hello/analyze/cancel/ack/batch/complete/error、预算、ACK 和终态 |
| DATA | codex-rollout-collector-rust-analyzer-data-contract-draft.md §1–3、§9.2 | 三种 mode、cursor、结构化输出及派生数据 |
| APP | codex-sync-app-history-ipc-consistency.md §4–6、§7.3、§12 | cache-first、history/IPC 并行、App 生命周期和结果语义 |
| GOV | ../workflow/CONTRACTS.md 两个冻结核心；../workflow/DECISIONS.md AD-004、AD-020/021/022 | 实时 authority、formal/产品分层及 Rust 先行 |
| REG | codex-concept-layer-status-registry.md | 已废止/未采纳概念不作为现行要求 |

以上 codex 路径均相对本文件目录。架构完整文档已读取；来源正文规定目标，代码说明现状。接口文档顶部“当前实现状态”属于历史快照，不能据此认定现有 Rust 未迁移。
APP 旧 serverRevision/revisionScope、泛化 item/source revision、commitFence/product epoch 不进入预期；只保留当前单份 canonical 的业务含义。formal fingerprint/anchor 仅在既有内部安全测试适用，不成为 Node 普通业务 gate。
ARCH 旧阶段说明中的日期 hint、replay/full mode 不覆盖现行启动及三 mode 契约。
APP 的 canonical 发布描述依 CO §3 两事务顺序解读，不将旧文档里的单事务描述用作 Rust ACK 前置。
脱敏与旧 conformance 断言的冲突留给 S2 分类；本文件按 ARCH §4.6 设计真实工具参数保留断言，不授权移除任何策略。
未知 Goal/协作事件的结构化产品展示、子代理级联采集尚无本任务授权；见 H 组兼容预期及 §8 后置映射。

## 2. 接口事实与链路模板

### 2.1 已读入口与目标能力

| ID | 真实消息/入口 | 当前只读事实与适用边界 |
|---|---|---|
| Q1 | conversation_history_sync_request；src/ws/terminalGateway.js:7401 | 现有 WS 分支；会话、syncId、selectionGeneration、App checkpoint。不是 Rust analyze |
| Q2 | conversation_history_older_request；terminalGateway.js:7777 | 校验 active conversation、generation、rangeSegments、nextOlderCursor、rangeId、hasMoreBefore；拒绝路径含 stale_selection/history_older_unavailable |
| Q3 | conversation_history_recovery_request；terminalGateway.js:6616 | 现有显式恢复入口；使用当前会话/选择隔离；不作为健康 IPC 轮询 |
| Q4 | conversation_history_sync_ack / conversation_history_segment_ack；terminalGateway.js:7954/7973 | App→Node 传输 ACK；不能发送给 Rust 或证明 Node 产品事务已提交 |
| Q5 | conversation_history_delta / manifest_required / payload_chunk / segment_start、fragment、commit / snapshot_state / sync_state | src/services/codexHistorySyncService.js:1146、1348、1636、1869–2029 可定位实际输出；不同能力分支不同消息，不要求每次全发 |
| R1 | stdio hello/analyze/cancel/ack → hello/batch/complete/error | 4.5 target 契约；只由 Coordinator 使用。Node/App 入口存在不证明该产品 Rust 接线完成 |
| I1 | active conversation → follower acquire → desired subscription/reconnect replay → host snapshot/patch → App IPC authority | 现行冻结实时链；只读架构事实，不在 S1 启动或改变订阅 |

Q5 当前 service 用 synced/partial/failed 等传输状态。APP 的 up_to_date、cache_only、canonical_pending 等在表中是**业务结果语义**，不伪称当前消息已含同名 enum；S2 不负责把这些状态落地。目标 D 表名/SQL、全部 App DTO 字段及界面文案留给后续 Node/DB 契约。每例判定使用已知集合、覆盖范围、提交边界和可见结果，不发明接口字段。

### 2.2 每例继承的边界断言

| 模板 | 各层动作与独立断言 |
|---|---|
| L1 首次/补齐 | A 经 Q1/Q2 请求；Q 先查 D 已提交范围，缺口只向 N 排队。N 单例发送 R1；R 输出来源、内容、cursor、完整性。每批 N durable staging COMMIT 后正 ACK；合法 canonical complete 后 D 原子提交正文/详情/usage/outcome/coverage/final checkpoint，COMMIT 后才发布；Q 再服务可见历史，A 原子提交自己的页。partial 只保存 staging/recovery，不冒充产品 canonical。I 不参与，除非本行标 L3 |
| L2 已存历史 | A→Q1/Q2/Q4→D 查询/传输→A 页提交；D 不改写历史内容；N/R 没有读取缺口时不参与。缓存命中仍判断服务端最新性。Q/A 分页与 Rust source cursor 独立 |
| L3 运行中并行 | I1 负责当前实时正文/operation/turn/运行态；历史按 L1/L2 处理较旧 canonical。旧/迟到历史不能降级健康 surface；live 不写 canonical 表，不能以 tail/no_live_source 宣称全部历史。新旧范围可同时存在，但不凭 surfaceKey 合并为 canonicalItemKey |
| L4 故障恢复 | 在 L1 指定时点注入失败；N 保留原 job、已知 scope、receipt 和安全 checkpoint，新 attempt 使用新 request_id。D 旧 canonical 保留；Q/A 继续 cache-first 或显式有界失败/等待，不清空或无限转圈。I 若健康仍按 L3，不受 analyzer 阻塞 |
| L5 来源/数据 | 在 L1 的 R 输入施加指定变化，逐对象判定 DATA/ARCH；N 校验 evidence，D/Q/A 只能发布允许的结果。source_epoch/物理 cursor 不外泄到 App。I 不参与；若 source 不足则继承 L4 |
| L6 App 传输/切换 | 基于 L2/L3，App page/chunk 和 selection 作用域隔离；未提交页不进入本地 canonical。N durable job 独立，调度抢占仍遵 CO；R 若已有 job 仅受 Scheduler cancel/retry，不因 App ACK/断线直接终止 |

所有案例禁止：错误会话写入、重复逻辑 item、伪造成功/完整、partial 降级旧 canonical、跨 gap 推进 cursor、以 App ACK 代替 Rust ACK。对无正文变化的幂等重试，最终内容/对象数量/checkpoint 不变，不要求新增产品版本号。

## 3. 可重建输入与独立预期

这些是**合成 fixture 规格**，不是已生成或已跑数据。S2 将有关规格序列化为仓库 vendored wire 支持的最小 JSONL，先检查输入命中对应 Adapter 路径；报告记录精确 UTF-8+LF 字节、长度、SHA256、事件枚举与生成规则。不使用真实会话，不把待测输出复制成 oracle。尚不支持的源类型以 unknown/诊断用例处理。

| 数据集 | 生成规则与可核算期望 |
|---|---|
| F0 空 | 明确绑定 conversation A，合法 SessionMeta 后无业务记录；用户新建且未形成 source 的情况另作 A07，不能等同 F0 |
| F1 静态四 turn | A 的 T1..T4 时间区间依次 01:00–01:01、02:00–02:01、03:00–03:01、04:00–04:01 UTC，同日；每轮各一条 user U1..U4、assistant final A1..A4。固定 native stable IDs，8 个正文 item，有序 [U1,A1,U2,A2,U3,A3,U4,A4]；4 个独立 turn。task start/complete 与元数据是 carrier，不计入这 8 个正文；完整 event/diagnostic 数按实际源事件逐条另列，不把8当全部 AnalysisEvent 数 |
| F2 新增 | F1 后追加 T5 的 U5、A5 与完整 carrier，时间05:00–05:01；10个正文，原8个key/内容不变。F2-open只有U5与未终态carrier，不能生成成功outcome |
| F3 跨窗 | F1 中 T2 加 tool call C2 begin/end（真实命令 pwsh -File C:/audit/run.ps1，cwd C:/audit）、T3 加 Plan question P3、answer R3、action X3。begin/end跨相邻窗口；question/answer跨相邻窗口。预期1个逻辑tool、1份完整detail，Plan3项且 R3/X3→P3；8个正文仍独立，不与tool/Plan计数混淆 |
| F4 文件与usage | F1的T2增两个不同文件 C:/audit/a.rs 与 C:/audit/b.rs，diff分别+2/-1、+3/-2；总文件集合精确为2、合计+5/-3，仅在有效且已确认的聚合规则下检查summary。T1 usage最后值(10,2)，T2先(5,1)再(20,4)，T3(30,6)，T4(40,8)，分别指input/output；预期每turn最后值，不求会话总和。rate limit精确值见§3.3 F4-rate |
| F5 lineage | root a含T1,T2；child b以真实history_base cut指向a的T2起点之前，保留T1并产生T2b；child c跨日期替换T2b为T2c；root→b→c关系仅由绑定/cut证明。UI有效正文集合[U1,A1,U2c,A2c]，lineage/provenance须保留旧turn来源证据，不把旧T2物理历史删除；checkpoint分别绑定active c。独立Branch d使用conversation B，复制T1也不加入A父链 |
| F6 文件边界 | JSONL每行含可追踪native ID；记录字节终点b0=0,b1..bn，末尾LF计入行长。指定行通过无语义padding调整字节长度；内容序列与预期ID列表手工固定。截断/改写仅为异常故障注入，不声称TermLink控制Codex正常写入 |
| F7 未知兼容 | 在F1 T2中插入固定未知envelope/type和未知可选字段；再分别插入thread_goal_updated、SubAgentActivity及普通文本含codex_delegation。未知事件保留诊断/不完整原因，不凭文字自动建子会话/成功目标；结构化支持是否为现行要求另核实 |
| F8 App页 | D已提交F1；App页大小按4个正文构造：最近页[U3,A3,U4,A4]，较早页[U1,A1,U2,A2]。显式重叠页[U2,A2,U3,A3]只增加U2/A2，去重后6个；补最早页后8个。页值为测试规格，非新增产品默认页大小。A/B隔离使用B的[UB,AB]，不同endpoint/profile本地cache也不得串用 |

### 3.1 窗口、cursor、partial 与收敛 oracle

F3/F6（关联断言采用§3.3 F3-turn）的精确物理行与 b_i 在生成时登记。安排至少三个不同旧范围 W3、W2、W1：preview覆盖尾部；**一个 backfill request 内**连续向前读取多个物理segment，或在合法partial终态后用新attempt恢复。不得把每个segment当新Node请求。每一步记录(request,segment,batch,source range,cursor kind,covered item keys,unresolved associations,completeness)。

预期必须同时满足：
1. 反向窗口的最早已覆盖位置严格向0进展（重试同一delivery允许一次重叠但不能冒充新进展），最终连续覆盖到root；实际窗口切点由预算/行边界决定，不预设算法固定MB步长。
2. 归并结果与 F1/F3 人工ID/关联表及独立完整正序参考一致；T1..T4时间保持各自区间。尾部checkpoint的active_turn=T4不能污染T1/T2无显式turn ID的旧记录；无法建立旧记录归属就诊断，不猜T4。
3. 只在 formal SegmentAssembly 证明连续完整、无gap/diagnostic/pending tail后promotion；tail/backfill cursor不直接强转。L2使用当前4.5公共checkpoint，不把formal内部辅助字段变成新业务gate。
4. 同源append F2后正文精确10个；tool/Plan集合不增殖；再次append无新行仍10个。不把source locating的delta当完整lineage。
5. partial batch可有安全recovery cursor，但它既非canonical checkpoint，也不能单独成为App可读canonical；后续只有合法canonical complete和D COMMIT才发布新canonical。

### 3.2 预算控制组

V01..V06分别是max_line_bytes阈值下/等于/超过，与“前面有安全完整行/没有安全前缀”的六种组合；每组显式max_segment_bytes≥max_line_bytes，max_decoded_bytes足够，不同时触发其他上限。V07..V09为max_segment_bytes阈值下/等于/超过，单行均合法。V10..V12为max_decoded_bytes阈值下/等于/超过，行/segment预算足够。阈值以对应实现所计UTF-8解码字节和LF语义固定；生成时记录长度，不能拿字符串字符数代替字节数。
V13=双方使用完全相同显式预算、fixture、操作序列；V14=各自省略预算使用默认值，记录两边最终有效配置。这14个是**命名参数变体**，单独计数，不冒充14条新增业务主线。超限应得到契约允许的partial安全前缀或error，不越界、不伪造complete；等于/小于限值在其他条件合法时不能因该限值拒绝。

### 3.3 关联与身份的补充输入（审核修订）

- F3-turn：沿用F3的4个turn及8正文。在T1/T2中明确只去掉A1、A2及C2 end的可选turn_id；T1/T2各自task-start保留显式turn_id，记录顺序为start→user→tool begin（T2才有）→tool end→assistant final→complete。preview Wtail仅T4，checkpoint active_turn=T4；backfill先读W3的T3，再在W2先见C2 end/A2而未见T2 start/C2 begin，W1才补齐T1/T2 carrier。孤立W2允许明确未关联/partial，但最终A1→T1、A2/C2→T2，绝不归T4。T2 carrier与C2 end分窗的确切字节在S2登记；若输入schema不允许省略，先报告输入不适用，不能改成全部显式turn_id后声称覆盖。
- F9同文：独立于F1新增T2内两条assistant commentary M21、M22，正文均精确为“检查完成”，不同source position，先使用不同native IDs；fallback组仅去掉这两条可选ID。最终正文10项，局部顺序U2,M21,M22,A2；M21≠M22的key，两条同文均保留。重复交付M21只仍10项，不因重复输入增加第11项。
- F10多Plan：独立于F3的简例，在F1 T3插入PlanUpdated PU31（步骤“读文件”pending、“修改”pending）、PU32（前者completed、后者in_progress），使用不同明确版本ID；问题P31：“采用方案？”；回答R31：“方案一”、R32：“改为方案二”；动作X31：“确认”、X32：“继续”，四者均引用P31、各有不同native IDs和source positions。逻辑顺序PU31,PU32,P31,R31,X31,R32,X32；预期7个不同Plan item，其中1问、2答、2动作、2版本，四个回答/动作关联均P31，latest Plan为PU32。fallback仅去掉answer/action可选ID，以各source position区分。W3先见R32/X32，W2见R31/X31/P31，W1见PU31/PU32；重复W2不丢旧答、不增项。另插重复渲染与heartbeat，不计入7项；不把七项与F3的三项混算。
- F4-rate：T1..T4固定primary used_percent分别10/20/30/40，window_minutes=300，resets_at=1893456000；secondary used_percent分别11/21/31/41，window_minutes=10080，resets_at=1894060800。T2先见primary=5、secondary=6，再见20/21，预期保留后者；finalMetrics取T4的40/41及usage(40,8)。字段如在vendored wire中命名不同，仅做已验证映射，不改人工值，不凭待测输出生成expected。

### 3.4 保留策略输入与oracle

F11每个case独立在F1的T2加入一个tool K11（begin/end），不同case不相互累计。固定cwd=C:/audit、duration_ms=120、exit_code成功0/失败2；除明确覆盖外，输出为ASCII文本“HEAD\npass=2 fail=0\nTAIL\n”（24 UTF-8字节，文中的\\n表示一个LF字节）。真实命令、类别、保留证据由I组逐行给定；8个原正文保持，1个tool及其元数据存在，是否保存完整detail由case决定，不能以“tool存在”判保留策略通过。

输出选择四变体：V53 aggregated_output="AGG"、result="RES"、stdout="OUT"、stderr="ERR"→唯一全文"AGG"；V54 aggregated为空→"RES"；V55前两者均空→一份带stdout:/stderr:标记且包含OUT/ERR的合并文本，固定顺序stdout后stderr，换行规范化尚需后续retention owner锁定，不能在未锁定时报精确hash通过；V56四候选均为"SAME"→仅一份"SAME"。前三者的未选文本不得同时持久化。hash取选中规范化字节的独立散列，不从被测output_hash复制；S2生成时保存人工文本和参考算法来源。

详情上限输入：选明确高价值成功命令，Rust内部策略测试配置D=64 bytes、S=24 chars（非Node AnalyzeRequest字段），完整输出="HEAD\n"+80个"x"+"\nTAIL\n"，共91字节。预期正文detail≤64字节、保留HEAD/TAIL关键片段、truncated=true、原始大小91、hash对应原始完整91字节；具体截断分配比例未在架构锁定，不凭空定为各32。摘要输入由普通读取返回120个ASCII字符（精确为120个x），选择固定输入及同配置重复两次；摘要≤24字符且相同，摘要hash与实际规范化摘要一致，不能要求LLM摘要。若当前策略没有可设置配置，只读记录有效D/S并按相同结构生成D+27/S+96输入；这仅参数化输入，有限上限、原文大小、排除无限存储和独立hash不随实现输出改写。策略能力未实现则分类为能力缺口，不以输入层max_line_bytes/max_segment_bytes代替。

F11-excluded独立插入以下事件，均带可追踪ID：wait、poll、heartbeat、compaction、streaming delta、hidden reasoning、abort，以及审批组ExecApprovalRequest/ApplyPatchApprovalRequest/RequestPermissions/GuardianAssessment。非abort组不得增加普通正文/tool/approval item；abort将T4 outcome设interrupted，不能另增abort item。审批只允许recognized_for_diagnostics_only，不持久化请求/决定/原因全文；未知或不支持wire路径如实标能力/诊断，不能伪造识别通过。

### 3.5 产品提交与App页的交错输入

F12-append：D=F1，App只有F8最近4项。t0 Q2读取旧页[U1,A1,U2,A2]但暂缓交付；t1 N将F2通过合法complete和产品COMMIT发布；t2 Q1新尾部U5/A5先到App；t3旧Q2页/ACK后到；t4再同步并补齐。可兼容旧页若通过现有scope/anchor校验，提交后应恰10项；若校验拒绝，旧页不改本地checkpoint，以Q1/Q3有界恢复，最终仍10项。两种允许分支都不得清掉U5/A5、重复U2/A2、跳过旧页或把cursor推到未提交范围。后续Node契约须明确选择分支，本设计只锁数据安全与收敛，不新增public版本字段。

F12-replace：D初始root为[U1,A1,U2,A2]，App只有尾部[U2,A2]且可请求older；root T2另有tool K2-old、detail D2-old和outcome O2-old，child T2b没有这些对象。构造有合法range/anchor的重叠Q2页[U1,A1,U2,A2]，t0取页后暂缓。t1验证F5 child b并产品COMMIT；t2 Q1 replacement投影使App为[U1,A1,U2b,A2b]；t3迟到旧页到达。旧页不得使U2/A2重新出现；与被替换范围相关的旧cursor/anchor须失效或拒绝并有界恢复。t4最终恰上述4项，T1不动，T2旧工具/detail/outcome不得挂到T2b。另作反序：旧页先提交、replacement后提交，最终集合完全相同。replacement仅改变有效投影，Rust旧source lineage证据不删除；确切Q消息/范围证明未定义处留Node契约，不通过发明serverRevision解决。

### 3.6 Node-owned终态协调输入

F13正常前置D=F1、Rust已有安全checkpoint、App已离开A；初始无reconciliation job。可触发事实必须是匹配A的healthy completed/complete、desynced=false、currentTurnId=null且有稳定窗口或等价source-ready事实；实际source定位/完整性仍由Rust验证F2。明确这些是既有事实的合成注入，不由Node读取rollout或猜mtime。分别把故障插在事实durable后/job创建前、job pending后、job running后；重启只恢复一个有效job/一个active请求，新attempt保留job身份和已知delivery，不能制造full mode。无durable终态事实且surface也丢失时不得凭空触发，保持pending并记录所缺事实，不以本例宣称未知终态可恢复。

## 4. 业务场景清单

每行均继承§2.2模板全部边界断言；输入引用§3，命名参数见§5。状态统一为设计完成/未执行。

### 4.A 首次打开与初次采集

| 场景ID | 用户目标 | 前置/输入 | 操作与层间时序 | 精确预期与禁止结果（继承§2.2） |
|---|---|---|---|---|
| A01 | 首次打开完整已存会话 | F8；App空，D有F1，IPC不运行 | L2/Q1→Q5；先取最近页，再Q2 | 首屏恰U3,A3,U4,A4；补早后恰8项正序；R请求0，不等全量采集才显示 |
| A02 | 首次打开服务端无历史，先看最新再补早 | F1/F8；App/D均空，source完整；preview只覆盖最近两轮 | Q1触发L1采集；业务时序要求先显示最近页，再由后台backfill补早，Q2读取已发布旧页 | 业务目标：补早完成前先见[U3,A3,U4,A4]，补早后恰8项正序；只在R先取得尾部证据、或直到全量完成才一次显示8项，都不能判此业务目标通过。当前CO禁止partial staging直接公开，最近页从N/D经Q到A的合法发布契约尚未闭合，记GAP-04；不因此放宽canonical gate |
| A03 | 一次读取容纳小会话 | F1缩为T1，预算充足 | L1/preview覆盖完整source并正常ACK/complete | 最终2正文、1turn；若已证全覆盖不强造backfill；App结束等待且无更早页 |
| A04 | 大历史多窗口补齐 | F3+F6；D空，tail只见T4 | L1/preview后一个backfill连续≥3窗口 | §3.1全部成立：覆盖推进至root，8正文/1tool/3Plan及关联精确；不能永远重读尾部 |
| A05 | 首次加载期间source继续增长 | F1捕获snapshot后追加F2 | L1/读旧snapshot→complete→append | 旧snapshot不越界混入T5；后续append恰增加U5/A5，最终10项；两次覆盖可区分 |
| A06 | 合法空会话 | F0；App/D空 | L1/Q1→合法空投影结算 | 正文0且有明确来源/覆盖结论；空成功与source缺失区分，不生成伪助手/成功outcome |
| A07 | 新建运行任务尚未有rollout | F0未创建source，healthy IPC新U1 | L3/I1与Q1并行 | 显示IPC当前内容；历史pending/无可读范围，不请求不存在的旧baseline循环；不把source缺失说成完整空历史 |
| A08 | 来源暂不可用且无缓存 | F1文件不可读；D/App空 | L4/Q1排队→R读取error | 可见失败/待重试且会话仍可切换；旧canonical为空但不是成功空结果；不无限重试 |

### 4.B 缓存重入与向前翻页

| 场景ID | 用户目标 | 前置/输入 | 操作与层间时序 | 精确预期与禁止结果（继承§2.2） |
|---|---|---|---|---|
| B01 | 完整缓存重新进入且无更新 | F1已在D和App提交 | L2/Q1最新性判断→Q5终态 | 8项立即显示；无重复正文写入，不能仅凭本地complete跳过最新性判断 |
| B02 | 完整缓存重新进入有新增 | App=F1，D=F2 | L2/Q1获取增量 | 原8项保留，只加U5/A5，最终10项；不全清空再下载 |
| B03 | 部分缓存继续补早 | F8最近页已提交 | L2/Q2取最早页→Q4 | 4→8项正序；nextOlderCursor按返回页推进；单页传输结束不等于全会话完整 |
| B04 | 重叠older页 | F8最近页+重叠页 | L2/Q2重复交付重叠页两次 | 4→6→6项；同key原位更新不增殖，再补U1/A1得8；无global reorder/delete |
| B05 | 到底再次请求旧页 | F1全范围已证；hasMoreBefore=false | L2/Q2无有效cursor/无更多 | 已有8项保留，明确无可用older；不绕过gateway改调Rust |
| B06 | 本地complete但正文缺失 | App checkpoint声称8项，durable行实际0；D=F1 | L2/Q1一致性检查→manifest/delta | 修复实际8项后才complete；不得空白界面显示已同步 |
| B07 | 缓存anchor/provider不匹配 | F8缓存4项，服务端来源证据不连续 | L4/Q1或Q2校验→Q3有界恢复 | 不拼接两种范围；保留4项缓存并指示恢复，最终仅在验证后更新；不将App anchor当Rust fingerprint |
| B08 | 多个App同时请求同一缺口 | 两个客户端A会话，D缺历史；F1 | L1/两次Q1相容intent排队 | 只一个conversation coordinator/active analyzer；各App syncId独立，各最终8项；没有第二Rust读取链 |

### 4.C 运行中 IPC 与历史读取

| 场景ID | 用户目标 | 前置/输入 | 操作与层间时序 | 精确预期与禁止结果（继承§2.2） |
|---|---|---|---|---|
| C01 | 运行中进入已有完整旧历史 | D=F1；IPC当前T5 U5和运行态 | L3/Q1读取旧8项，同时I1 patch | 旧历史可读，T5正文/operation/运行态取IPC；不把旧A4终态作为T5终态 |
| C02 | 运行中进入历史尚未齐 | D仅既有安全canonical旧范围，N backfill中；IPC T5 | L3/Q1读可用范围并等缺口；I1持续 | 实时更新不被analyzer ACK等待阻塞；不可见staging不冒充历史已同步，最终历史覆盖明确 |
| C03 | 向前翻页时收到新实时内容 | F8 App最近4项；IPC先U5后patch A5 | L3/Q2在两次patch之间返回旧页 | 旧历史4→8；live T5保留最新patch，旧页不能滚回运行态或覆盖同key实时内容 |
| C04 | 迟到历史包含当前turn旧内容 | IPC T5较新surface；延迟Q5带T5旧文本 | L3/先IPC后迟到历史 | healthy当前文本/operation不回退；历史仅可用于允许的旧范围，不将两来源内容拼成新canonical |
| C05 | 终态后canonical完成 | IPC T5终态，source=F2稳定；D=F1 | L3→L1/合法reconciliation→D COMMIT→Q1 | 正式历史最终10正文，T5终态有来源证据；live展示按既有规则收口；不在D提交前标完整 |
| C06 | 终态已到但source仍partial | IPC terminal；F2-open或末行未稳定 | L3→L4/读取partial后等待 | 保留当前展示与旧8项canonical，canonical_pending；不能因IPC终态强制replace/complete |
| C07 | 运行中Node重启丢失IPC片段 | T0缓存、T1断线、T2重连；F2 | L3/I1按reconnect恢复→终态reconciliation | 承认T1 live gap，不拼接T0/T2为连续canonical，不轮询rollout补实时；最终source稳定后历史10项 |
| C08 | IPC明确offline/desynced/缺surface | F1缓存可用，当前订阅缺目标surface | L3/Q3有界恢复，随后I1恢复healthy | 只在明确恢复条件下读取；healthy回来继续唯一实时authority，无静默超时定时轮询 |
| C09 | 历史加载排队不阻塞控制 | A backfill占Rust，IPC A运行；F3 | L3/持续control与I1消息，同时多batch ACK | Node事件循环仍处理IPC/查询；Rust active仅1。性能时延不设虚构毫秒阈值，后续实测记录 |

### 4.D 切换、断线与客户端传输

| 场景ID | 用户目标 | 前置/输入 | 操作与层间时序 | 精确预期与禁止结果（继承§2.2） |
|---|---|---|---|---|
| D01 | A→B→A快速切换 | F8 A=8项，B=[UB,AB] | L6/Q1 A旧sync→切B→返A新generation | B只2项；返A立即8项缓存；迟到A旧delta/终态不能覆盖B或新A |
| D02 | App离线但采集继续 | F1 job已创建，App断WS | L6/断线期间N继续→D提交，重连Q1 | Node不等App ACK；重连可取8项，未被用户观看不取消durable job |
| D03 | App在页提交前崩溃 | F8本地4项，older chunk收一半 | L6/Q5 fragment后崩溃→Q1恢复 | 本地仍4项，无半页canonical；重试同页后8项，checkpoint与durable项一致 |
| D04 | App页提交后ACK丢失 | F8 older已原子提交，丢Q4 | L6/重复page或重连 | 本地8→8项，page幂等；不触发Rust batch ACK，不重复Node产品发布 |
| D05 | chunk重复、缺片或乱序 | F8 older拆2片，重发第1片且第2片迟到 | L6/Q5 segment start/fragment/commit | 缺片时不提交；完整且校验通过只提交一次，最终8项；错误root/sequence走失败或恢复 |
| D06 | 旧sync ACK或错误会话ACK | A页进行中，注入B或旧sync的Q4 | L6/Q4作用域检查 | A checkpoint不推进，B无写入；合法ACK到达后正常收口 |
| D07 | profile/endpoint切换 | 两个连接同字面conversationId，各自F1/F8不同内容 | L6/cache-key与连接上下文隔离 | 不复用另一endpoint/profile本地正文/checkpoint；不引入revisionScope产品字段 |
| D08 | 传输无响应/超大envelope | F8加载中停止Q5或超过既有发送门限 | L6/有限watchdog或分片/可见failure | 保留已提交4项、结束不可见无限等待、仍可切换；不以空成功覆盖。实际阈值取现有配置 |

### 4.E 采集调度、staging 与产品事务恢复

| 场景ID | 用户目标 | 前置/输入 | 操作与层间时序 | 精确预期与禁止结果（继承§2.2） |
|---|---|---|---|---|
| E01 | 多batch正常提交 | F3，backfill一个job多个batch | L1/逐批staging COMMIT→ACK→唯一complete→D事务 | 每批receipt可追踪；ACK前不complete，complete前不公开staging；最终精确F3集合 |
| E02 | batch尚未durable时Node崩溃 | 旧D=F1；F2增量batch未staging COMMIT | L4/崩溃→新attempt恢复 | 不发persisted=true；旧8项/checkpoint保留，重试合法后10项 |
| E03 | staging已提交但正ACK丢失 | 旧D=F1，F2receipt已durable | L4/丢ACK→同request有限重发ACK | receipt不回滚；无成功complete前仍8项；相同delivery幂等，成功后10 |
| E04 | ACK到达但complete丢失 | F2batch已ACK，丢Rust complete | L4/Node保留receipt→新attempt同job/recovery | 不得把已发ACK当已收complete；恢复原segment/batch身份，最终10项仅一次 |
| E05 | Node重启于complete校验后、产品提交前 | 旧D=F1，F2complete recovery evidence已存 | L4/重启→幂等产品事务 | 旧8项直到事务成功才10项；待发布checkpoint不能提前成为final |
| E06 | 产品事务中途失败 | F2 upsert items成功但usage/checkpoint写失败 | L4/D事务回滚→重试同operation | 正文/详情/usage/outcome/coverage/checkpoint整体仍旧值；receipt保留，重试后全部一起前进 |
| E07 | 产品COMMIT后发布通知丢失 | D已F2，App仍F1 | L4/Q1重连查询已存D | App补到10；D不重复插入、无第二canonical记录；无需Rust重新确认App交付 |
| E08 | batch校验失败与scope冲突 | F2batch wrong conversation或同delivery不同内容 | L4/N拒绝，负ACK validation_failed/scope_conflict | Rust batch_rejected且无complete；D仍8项，确定性冲突不原样无限重试 |
| E09 | staging暂不可用 | 合法F2batch，故障发生于staging事务 | L4/负ACK staging_unavailable→error终态→有限重排 | 旧8项；新request同job/intention及已确定delivery；不与旧attempt并行 |
| E10 | 伪造或不一致complete | F2；注入completed+partial、错checkpoint/request | L4/complete gate拒绝 | D保持8项/旧canonical checkpoint；单batch complete布尔不替代request结论 |
| E11 | 切换抢占与取消宽限期 | A F3 backfill；B interactive preview排队 | L4/N cancel A→cancelled；未响应则杀旧进程新hello | B只在旧终态或新generation hello后占slot；A可从durable点恢复，旧generation消息丢弃 |
| E12 | fatal、超时与重试预算耗尽 | F3读取/归约/等待ACK中故障 | L4/R fatal或deadline error→Node有限恢复 | fatal失效旧进程；无新cursor，不依赖进程内offset；预算耗尽明确失败，旧canonical保留 |
| E13 | 握手或能力不匹配 | F1待采集；缺ack/checkpoint/analyze_v1或错hello id | L4/R1握手校验 | Node不发送analyze，Q/A仍缓存/可见失败；mode名单不能代替analyze_v1；合法旧analyze别名按WIRE归一化 |
| E14 | checkpoint不可用或丢失 | 已有F1或初次任务无安全checkpoint | L4/N用普通preview/backfill/append重新请求 | 无full/replay额外mode；同意图job与待交付身份按已知事实恢复；重叠后仍8项，不向Rust取内存恢复状态 |

### 4.F 重发、分支与会话来源

| 场景ID | 用户目标 | 前置/输入 | 操作与层间时序 | 精确预期与禁止结果（继承§2.2） |
|---|---|---|---|---|
| F01 | 同source追加已完成turn | D=F1，active同文件增加F2 | L5/N append→R正确forward cursor | 只增加T5，最终10正文；旧8项key稳定，不重新建conversation |
| F02 | 重发生成terminal child | F5 root已提交，b完整 | L5/N仍append→R验证history_base/cut | 有效T1+T2b，T1保留；旧T2来源证据可追踪；parent字节不要求回写，不复用parent物理cursor |
| F03 | child尚未terminal | F5 b仅新user/未稳定结尾 | L5/append发现child但partial | 保留旧canonical T1/T2；无replace_last_turn，不把partial child当完整替换 |
| F04 | 跨日期并跳过中间head重启 | F5 a/b/c跨日期，Node仅记a后重启 | L5/append内部定位c并沿b恢复root | 3source/2edge证据，最终T1/T2c；无Node日期/path hint，不凭mtime选head |
| F05 | Branch in new chat复制旧内容 | F5 d属于B但复制T1 | L5/B独立Q1与analyze | A结果不变；B独立history，不凭内容相同合并或当A replacement |
| F06 | parent缺失、循环或多个head | F5分别删parent、b→c→b、并列b/c无唯一链 | L5/R定位fail-closed | 三种原因分别记录；无可提交cursor/replacement；D旧canonical不动，确定性关系错误不无限retry |
| F07 | 文件名候选与metadata绑定冲突 | F1目标A，候选文件名像A但SessionMeta=B | L5/目标conversation显式绑定校验 | 不能把B读入A；允许索引候选被排除/报错，不靠文件名造canonical id |
| F08 | 同目录plain与zst sibling | F1两个同名sibling；plain失败另注入 | L5/定位优先plain，失败不fallback | 只一个plain来源；plain失败仍失败，不按mtime/内容选zst；跨目录不按rollout id去重 |

### 4.G 读取边界、资源与安全失败

| 场景ID | 用户目标 | 前置/输入 | 操作与层间时序 | 精确预期与禁止结果（继承§2.2） |
|---|---|---|---|---|
| G01 | 末行未换行且有安全前缀 | F6完整F1后半行U5 | L5/append pending tail | 只旧完整行可为安全recovery；cursor不跨半行，旧canonical不变；补LF后后续请求只消费完整新行 |
| G02 | 只有未完成首行 | F6无安全业务前缀 | L5/preview无法形成安全batch | error或契约允许null安全cursor，不伪造成功完整/空历史；与G01分开 |
| G03 | source gap前有安全范围 | F6指定中间范围不可证明 | L5/分段组装遇gap | 安全前缀partial/mark_partial，cursor止gap前；不可promotion/覆盖旧canonical |
| G04 | source gap且无安全范围 | F6首范围缺失/顺序不可判 | L5/R不能建立prefix | error无可提交checkpoint；不能将后段单独当完整历史 |
| G05 | source被截断、替换或前缀变化 | F1 checkpoint后外部异常修改F6 | L5/续读fail-closed | 各mutation分别诊断，不混新旧记录、不推进cursor；这是异常防护，不是正常resend |
| G06 | source只改名保持有效身份 | F1既有formal source身份不变 | L5/formal续读再映射历史 | 已有item key不变、8项无重复；4.5 Node不提供path或主动管理rename，不另设fingerprint业务gate |
| G07 | 普通zst根/active仅forward能力 | F1转普通zst且无plain | L5/按已声明forward能力读取 | 可用路径正序结果F1；不承诺tail seek/append cursor；调用不支持能力须显式失败 |
| G08 | 普通zst作为需cut定位的parent | F5 a仅zst，b需parent cut | L5/R lineage验证 | UnsupportedParentSourceCompression或公共受限source error；不发布lineage batch/replacement/cursor/checkpoint |
| G09 | 单行超限/临界大diff | F6，V01..V06 | L5/R显式line预算 | 等于/低于合法行不误拒；超过不能完整提交该行；有安全前缀/无前缀分开，partial/error不假完整 |
| G10 | 分段预算和总解码预算 | F6，V07..V12，≥3窗口 | L5/R分段读取到各阈值 | 单段不超预算且可继续推进；总预算耗尽不越界伪complete；记录安全prefix/cursor和实际配置 |
| G11 | 不同默认预算下的大历史 | F3/F6，V13/V14 | L5/相同显式值组与各自默认组分别比较 | 算法收敛与预算绕过分开；扩大tail看不到多窗不能证明backfill修复；无实测不宣称内存/性能改善 |
| G12 | 错误cursor类型或scope | F1；tail直接当append，或B cursor给A | L5/R request校验 | fail-closed，无新cursor/产品写入；安全promotion仅合法连续完整范围；不强转三类cursor |

### 4.H 用户阅读内容与语义完整性

| 场景ID | 用户目标 | 前置/输入 | 操作与层间时序 | 精确预期与禁止结果（继承§2.2） |
|---|---|---|---|---|
| H01 | 查看工具执行记录与详情 | F3 C2 begin/end跨窗 | L5/先尾后补早再重试 | 仅1工具逻辑项/1detail；call/turn关联到T2，命令/cwd/输出原文可核算；end先见不伪造成功完整 |
| H02 | 查看文件修改与本轮总结 | F4两路径/diff，T2终态 | L5/读取FileChange与outcome | 文件集合恰a.rs/b.rs、+5/-3；源file事件与summary聚合分开判断。Target edited_files具体字段是否当前要求在S2核实 |
| H03 | 查看命令完成事件 | F1 T2插独立CommandExecution已完成item | L5/命中item_completed的具体variant | 实际命令/状态/详情不默默丢为用户消息；若支持边界不足如实partial诊断，不能用FileChange通过代替此例 |
| H04 | 查看Plan问答和动作 | F3 P3/R3/X3跨窗 | L5/尾部先见answer→backfill找到question | 3个Plan项，R3/X3准确关联P3，重复读取不增项；缺question时保留partial而非伪造用户答案 |
| H05 | 查看每轮usage与rate limit | F4 | L5/多事件、分段、重试后查询 | 4轮usage分别(10,2)/(20,4)/(30,6)/(40,8)，T2不累加两次；无conversation token total，finalMetrics取最后turn |
| H06 | 查看失败/中断任务结果 | F1 T4终态改为failed/interrupted/cancelled，保留助手文字 | L5/归约→outcome查询 | 状态按明确事件，不能因有A4文字推断成功；未终态则pending，风险/未完成信息按来源保留 |
| H07 | 绝对路径与真实参数保留 | F4双路径及F3命令；含普通非敏感输出 | L5/读取→保留projection/detail | 不同文件不能同化为local-path-redacted；命令参数/cwd可还原，保留策略与旧测试冲突单列；不用真实隐私路径 |
| H08 | 稳定ID与无native ID的重叠 | F1分别保留native IDs与去掉可选ID使用稳定source position | L5/preview/backfill/append重读 | 同逻辑8正文key跨读取稳定；event occurrence与item key分开；不能靠内容hash合并两条同文本不同位置记录 |
| H09 | 未知事件与可选字段兼容 | F7未知type与已知type新增字段 | L5/decode→Adapter→projection | 已知内容8项不因额外可选字段丢失；未知有诊断/availability，不伪造tool/turn成功；unsafe envelope拒绝错误范围 |
| H10 | 查看带Goal/多代理内容的历史 | F7三类扩展事件，主A与显式B文本引用 | L5/现有能力归类→Q读历史 | 保留可恢复正文和未知诊断，不静默标完整结构化Goal/agent；不凭XML文字自动级联采集B。新增卡片/模型列扩展待判断 |
| H11 | 正文、工具输出与排除数据 | F1增assistant commentary/final、tool大输出、encrypted reasoning/raw wire | L5/ARCH retention→Q展示 | 保留正文phase、需要的工具详情；不把encrypted reasoning/raw JSON当普通历史正文；来源缺失与真实空字符串分开 |
| H12 | 旧完整结果遇迟到partial冲突 | D完整F3，随后同key旧provisional/缺detail结果 | L5/N evidence preflight→D | 原8正文、1完整tool detail、3Plan不降级；拒绝冲突或仅存diagnostic；不按泛化revision大小覆盖 |

### 4.H 补充：身份与Plan多对象

| 场景ID | 用户目标 | 前置/输入 | 操作与层间时序 | 精确预期与禁止结果（继承§2.2） |
|---|---|---|---|---|
| H13 | 相同文字的两条独立历史 | F9，两组native ID与source position | L5/preview→backfill→重复M21→append无新行 | 最终10正文，M21/M22两key且均存在；重复交付不增第11项，不能用内容hash当身份 |
| H14 | 多轮Plan更新与同问题多次回答 | F10及fallback组 | L5/三个窗口补齐→重复W2 | 恰7 Plan item及4条→P31关联；两回答、两动作不能互相覆盖，latest为PU32；原8正文不变 |

### 4.I 用户查看工具详情与保留边界

每例按L5连接R→N/D→Q/A；若源/策略能力未支持，记录当前能力差异，不把目标设计当已实现。除表中差量，均使用F11的1个tool、8个原正文和明确完整性/发布gate。

| 场景ID | 用户目标 | 前置/输入 | 操作与层间时序 | 精确预期与禁止结果（继承§2.2） |
|---|---|---|---|---|
| I01 | 查看测试执行的完整结果 | F11，node --test audit.test.js，成功0；失败组2含“FAIL audit_case” | L5/高价值成功或失败→查看detail | 完整canonical_output一份；失败组保留失败状态/错误摘要且不宣称测试成功；命令/cwd/120ms/大小/hash齐全 |
| I02 | 查看成功读取的摘要 | F11，Get-Content C:/audit/a.rs，成功0 | L5/普通读取→Q详情查询 | 工具命令/状态/耗时/大小/hash与确定性摘要保留，完整24字节输出不另存detail；不能全量保存所有普通读取 |
| I03 | 查看读取失败与诊断引用 | F11相同读取失败2；V51无引用，V52 outcome显式引用K11 | L5/失败分类→outcome关联后重试 | V51保留错误类型/关键摘要；V52提升为完整detail；引用前后同一tool key且仅一份输出，非所有失败自动无限保存 |
| I04 | 查看未知工具的有限摘要 | F11，工具audit_unknown，参数{path:"C:/audit/a.rs"} | L5/未知类别但合法事件 | 参数/状态/120ms/hash和摘要存在；无无限原文，类别未知不丢掉工具或编造高价值分类 |
| I05 | 用户明确要求保留普通读取 | I02输入并添加可追踪“保留此次完整输出”策略事实 | L5/明确保留优先于普通摘要 | 一份完整24字节输出、同一tool identity；仍受详情上限。该事实在当前模型的承载若未定义，记能力缺口，不新增Node字段 |
| I06 | 多个输出字段只显示一份 | F11 V53–V56输出候选 | L5/规范化→重叠重试→D/Q | §3.4选中内容精确，output_source正确，只有一份canonical_output；未选候选不重复落库/hash不作tool key |
| I07 | 查看被截断的大详情 | §3.4的91字节高价值输出 | L5/内部D=64策略→读取detail | ≤64字节、HEAD/TAIL保留、truncated=true、原大小91、独立全文hash；上限不能被详情模式绕过 |
| I08 | 查看超长普通读取摘要 | §3.4的120字符输入，S=24 | L5/相同输入重复分析两次 | 摘要≤24字符且两次相同，摘要hash可核算；不调用LLM、不在另字段偷偷保存完整原文 |
| I09 | 查看exec包装中的真实命令 | V57 exec明确封装node --test audit.test.js；V58仅动态eval无可提取真实命令 | L5/提取→分类→Q | V57只保留真实命令及工具结果；V58 fail-closed/诊断，不能把JS包装全文当命令或虚构成功；不执行输入里的命令 |
| I10 | 历史中不出现系统噪声与审批原文 | F11-excluded V59–V66 | L5/输入各类排除事件→D/Q | 非abort原8正文及业务集合不增噪声；abort由outcome表达，审批组仅诊断识别，原文不持久化；各事件分别登记结果 |

### 4.J 历史提交交错与无人观看时的完成协调

| 场景ID | 用户目标 | 前置/输入 | 操作与层间时序 | 精确预期与禁止结果（继承§2.2） |
|---|---|---|---|---|
| J01 | 首次打开运行中的长会话且无缓存 | F1旧历史+IPC T5，App/D空；preview最近T3/T4 | L3+L1/IPC持续patch，按A02先最新再补早 | live T5始终由IPC；补早前旧历史首显4项、最终旧8项；无发布路径时明确GAP-04未满足，不能用A07新建空source或C02已有缓存代替 |
| J02 | 补早页在途时新尾部已落库 | F12-append | L2/L1按t0–t4；分别旧页合法或校验拒绝 | 终态恰10正文正序；任何时刻不清U5/A5，不重复旧页，不越过未提交范围推进App cursor；R只由Coordinator调用 |
| J03 | 重发替换期间旧页迟到 | F12-replace两种顺序 | L5产品replacement与L2旧页交错 | 终态恰U1,A1,U2b,A2b；迟到旧页不能复活U2/A2及旧detail/outcome；不引入产品revision，合法范围校验/恢复映射后续锁定 |
| J04 | App离线后任务才完成 | F13，离开时无job，离开后有合法触发事实 | Node scheduler创建job→R→D；App重连Q1 | 无App请求/ACK也能形成D=F2；一个job，重连只取10项，不能一直等待用户打开才采集 |
| J05 | 终态surface投递丢失 | F13已durable终态/source-ready事实，丢快速surface通知 | scheduler读取已有事实创建/恢复job→验证source | 不依赖新terminal patch仍完成F2；若删掉durable事实则只pending，不猜终态，不轮询rollout修实时 |
| J06 | Node重启恢复终态工作 | F13三个故障点：事实durable后job前、pending、running | 重启→调度→新attempt或恢复创建 | 同一意图最多一个job/active请求；已存在job沿用ID，首次创建不重复；D旧8项到合法提交才10项，App可持续离线 |
| J07 | 非允许终态不触发自动协调 | F13逐次替换为V67–V73 | 触发判定→只读统计新reconciliation job | 新自动job数0，旧D=F1；已有历史查询/普通采集与该触发分开；失败或取消outcome仍可被普通历史读取，不扩展终态trigger |
| J08 | 多入口同时唤醒同一终态工作 | F13合法事实；scheduler、terminal surface、App Q1同时到达 | L1/同intent去重→唯一请求→产品提交 | 同一job/一次有效publication，D/App最终10项；App切换只隔离传输，不取消durable job；无第二采集链 |

## 5. 数量口径、条款映射与缺口

### 5.1 场景和参数数量

主场景按 §4 每行独立业务目标/时序与结果统计，共 **99**：A8、B8、C9、D8、E14、F8、G12、H14、I10、J8。分组是阅读导航，不是Rust函数列表。每行的断言ID固定为“场景ID/字段”：例如 A04/range、A04/items、A04/turn-link、A04/complete；字段集合由本行预期及模板确定，后续执行必须引用具体字段，不能仅报A04通过。

命名参数变体共 **89**，与99主场景分开，不相加为“188个业务流程”。V01..V14见§3.2，其余如下；同一行不同异常结果必须各自记录，不能任选一个代表全部。没有要求所有状态的笛卡尔积。

| 变体ID | 场景 | 精确变化 |
|---|---|---|
| V15、V16、V17 | F06 | 缺parent；父链循环；两个无唯一关系head |
| V18、V19、V20 | G05 | 截断；替换；旧前缀字节变化 |
| V21、V22、V23、V24 | H06 | failed；interrupted；cancelled；无明确终态 |
| V25、V26 | E08 | batch_validation_failed；batch_scope_conflict |
| V27、V28、V29 | E10 | status/completeness不合法；checkpoint不符；request不符 |
| V30、V31、V32 | E12 | source读取deadline；归约deadline；ACK等待deadline（fatal另依实际结果判进程处理） |
| V33a、V33b、V33c、V33d | E13 | 交集分别缺analyze_v1、cancel、checkpoint、ack；均不发送analyze |
| V34、V35 | E13 | hello request_id错误；旧analyze别名与基础能力齐全（正向兼容） |
| V36、V37 | H08 | native stable ID；合法source-position fallback |
| V38、V39、V40 | H09 | 未知type；已知type新增可选字段；不安全envelope |
| V41、V42、V43 | H10 | thread_goal_updated；SubAgentActivity；普通文本codex_delegation |
| V44、V45、V46 | G07 | 普通zst forward；请求tail；请求append |
| V47、V48 | D08 | 无响应watchdog；单条envelope超过既有配置门限 |
| V49、V50 | G12 | cursor kind错；conversation/source scope错 |
| V51、V52 | I03 | 普通读取失败无outcome引用；有显式引用K11并提升详情 |
| V53、V54、V55、V56 | I06 | aggregated优先；空aggregated选result；前两者空合并stdout/stderr；四字段相同仅存一份 |
| V57、V58 | I09 | 可静态提取真实命令；动态eval无法提取 |
| V59、V60、V61、V62、V63、V64、V65、V66 | I10 | wait；poll；heartbeat；compaction；streaming delta；hidden reasoning；abort；四类审批组合输入且四者分别断言 |
| V67、V68、V69、V70、V71、V72、V73 | J07 | running；desynced=true；failed；cancelled；completed但currentTurnId非空；仅普通打开/重选且无合法触发事实；仅tail_validation/liveReplay诊断且无合法触发事实 |
| V74、V75 | H14 | 原生answer/action ID；去掉可选ID用不同source position |
| V76、V77 | I01 | 高价值测试成功0；失败2且含FAIL audit_case |
| V78、V79 | J02 | 旧页范围仍可验证而接纳；旧页校验拒绝后有界恢复 |
| V80、V81 | J03 | replacement先提交而旧页后到；旧页先提交再replacement |
| V82、V83 | J05 | 终态通知丢失但durable事实齐备；durable终态事实也缺失而保持pending |
| V84、V85、V86 | J06 | 事实durable后/job创建前；job pending；job running时重启 |

计数方法：V01–V32=32，V33a–d=4，V34–V86=53，合计89。V66的四类审批为一组输入，四者分别断言；H13复用V36/V37身份条件，不另计命名变体。F1中的4个turn、2条文件事件、多个batch属于输入/时序，不额外计场景。边界参数的实际byte取值由S2fixture登记，不能用默认1MB/4MB等历史数字作为跨版本常量。

### 5.2 覆盖分母逐项对账

本任务以以下 **63个来源检查点** 作后置对账：62个适用检查点均有命名用例，1个未启用backend检查点不适用；适用检查点尚无“无案例”条目。这个数字仅表示所列检查点已有案例定位，绝不表示业务契约闭合或执行通过；A02的首次最近页可见性仍有GAP-04。源全文其他条款通过模板/适用范围约束，不能拿63替代所有实现细节。

| 检查点 | 用例/断言定位 | 设计结论 |
|---|---|---|
| ARCH 5.4.9-1 稳定item key | H08、A04/items | 映射 |
| ARCH 5.4.9-2 provisional→canonical无重复 | H12、A04/items | 映射 |
| ARCH 5.4.9-3 持久化前重启幂等 | E02、E04 | 映射 |
| ARCH 5.4.9-4 rename不重复 | G06；限定formal身份不变 | 映射 |
| ARCH 5.4.9-5 mutation保留旧历史 | G05、E08 | 映射 |
| ARCH 5.4.9-6 迟到不降级 | H12、C04 | 映射 |
| ARCH 5.4.9-7 source position fallback | H08 V37 | 映射 |
| ARCH 5.5-1 未换行尾行 | G01/G02 | 映射 |
| ARCH 5.5-2 读取期间增长 | A05/G01 | 映射 |
| ARCH 5.5-3 tool跨段 | H01/A04 | 映射 |
| ARCH 5.5-4 Plan跨段 | H04/A04 | 映射 |
| ARCH 5.5-5 reverse/forward oracle | A04、§3.1 | 映射 |
| ARCH 5.5-6 cursor隔离 | G12 | 映射 |
| ARCH 5.5-7 mutation续读拒绝 | G05 | 映射 |
| ARCH 5.5-8 普通zst capability | G07/G08 | 映射 |
| ARCH 5.5-9 seekable/indexed/materialized backend等价 | 本任务未启用这些backend；不得为凑覆盖新增 | 不适用；未来启用需独立验收 |
| ARCH 5.5-10 资源上限 | G09/G10/G11、E12 | 映射 |
| CO 6.2-1 parent缺失 | F06 V15 | 映射 |
| CO 6.2-2 cycle | F06 V16 | 映射 |
| CO 6.2-3 多head | F06 V17 | 映射 |
| CO 6.2-4 zst parent | G08 | 映射 |
| CO 6.2-5 pending tail | G01/G02 | 映射 |
| CO 6.2-6 source gap | G03/G04 | 映射 |
| CO 6.2-7 不可读/不可恢复截断 | A08/G05 | 映射 |
| CO 6.2-8 partial child | F03 | 映射 |
| CO 6.2-9 Scheduler cancel | E11 | 映射 |
| CO 6.2-10 cancel grace耗尽 | E11 | 映射 |
| CO 6.2-11 staging/校验失败 | E08/E09 | 映射 |
| CO 6.2-12 fatal重启 | E12 | 映射 |
| APP 5.1 新任务 | A07/C05/C06 | 映射 |
| APP 5.2 已有未运行 | B01/B02 | 映射 |
| APP 5.3 部分历史/重叠 | B03/B04/B07 | 映射 |
| APP 5.4 运行中 | C01–C09 | 映射 |
| APP 5.6 选择/重启 | D01–D08 | 映射 |
| APP 6.1 请求/checkpoint分层 | Q1/Q2及B06/B07 | 映射 |
| APP 6.2 同步结果不等于完整性 | B03/C06/A08 | 映射；不采用serverRevision |
| APP 7.3 已存读模型供App查询 | L2、A01/B01/B08 | 映射 |
| ARCH 4.6 正文/phase | H11、F1 oracle | 映射 |
| ARCH 4.6 工具/detail/cwd | H01/H03/H07 | 映射 |
| ARCH 4.6 文件/结果 | H02/H06 | 映射；字段扩展另分类 |
| ARCH 4.6 Plan关联 | H04 | 映射 |
| ARCH 8 每turn usage | H05 | 映射 |
| ARCH 8 finalMetrics/rate-limit | H05 | 映射 |
| ARCH 4.6 排除raw/encrypted reasoning | H11 | 映射 |
| ARCH 10 unknown/partial/gap | H09/G03/G04 | 映射 |
| ARCH 8 缺失与空值 | H09/H11/A06/A08 | 映射 |
| ARCH 4.6 保留分类与优先级 | I01–I05 | 映射；未知承载能力另记GAP-05 |
| ARCH 4.6 输出候选选择 | I06 V53–V56 | 映射 |
| ARCH 4.6 输出只存一份及hash | I06、§3.4 | 映射；未锁换行规则不报精确hash通过 |
| ARCH 4.6 detail_max_bytes | I07 | 映射；不以读取预算替代 |
| ARCH 4.6 summary_max_chars及确定性 | I08 | 映射 |
| ARCH 4.6 exec真实命令及提取失败 | I09 V57/V58 | 映射 |
| ARCH 4.6 系统噪声排除 | I10 V59–V64 | 映射 |
| ARCH 4.6 abort仅outcome | I10 V65 | 映射 |
| ARCH 4.6 四类审批diagnostics-only | I10 V66 | 映射；四类逐项断言 |
| ARCH 5.4.7 同文不同位置身份 | H13、F9 | 映射 |
| ARCH 5.4.7 Plan版本/多回答多动作 | H14、F10 | 映射 |
| APP 5.3 翻页与产品追加提交 | J02、F12-append | 数据安全目标映射；Q范围决策后续锁定 |
| ARCH 5.4.8 替换后迟到旧页不回流 | J03、F12-replace | 数据安全目标映射；无新revision |
| APP 5.4 无缓存运行中首次加载 | J01、A02 | 目标映射；GAP-04未闭合 |
| APP 5.5.1 无App/丢快速通知的主触发 | J04/J05 | 映射 |
| APP 5.5.1 重启与多入口single-flight | J06/J08 | 映射 |
| APP 5.5 触发排除条件 | J07 V67–V73 | 映射；不扩大自动协调终态范围 |

关键时序检查另外明确绑定：preview→连续backfill→promotion→append=A04/F01；history与IPC并行=C01–C04；Rust snapshot期间增长=A05；旧页与IPC patch=C03；旧页与产品追加/替换提交=J02/J03；无缓存运行中首显=J01；无人观看/丢通知/重启/非法终态触发=J04–J08；durable前后/ACK前后/complete前后/COMMIT前后=E01–E07；用户切换与旧generation=D01/E11；source head变化与Node重启=F04。它们复用已有场景，不重复加数量。

### 5.3 后续实施与证据缺口（不能报通过）

| ID | 缺口/界限 | 后续处理 |
|---|---|---|
| GAP-01 | 99场景与89变体均未实际执行；无真实Node/DB/App事务或真机证据 | S2只核实相关Rust断言；全链路在另行确认的Node/DB任务实施 |
| GAP-02 | 合成fixture尚未序列化，精确b_i/JSONL枚举/SHA和预算取值尚未生成 | S2在OS临时目录生成有关输入，验证触发路径；输入无效不能当产品失败 |
| GAP-03 | 当前Q入口存在，但4.5 R→产品D→Q接线未由本任务验证；目标表/SQL和部分App业务状态映射未定 | 后续Node owner依据契约定义；不编造API/字段或声称现有DTO已满足 |
| GAP-04 | A02“无已存历史时先显示最新，再补早”是已明确的业务目标；ARCH §5.1/5.2支持尾部优先，而CO §3/6.1仅允许partial进入staging/recovery，当前最近页到App的发布映射未闭合 | 后续Node/DB契约核查须明确最近范围安全性、全历史覆盖与公开发布的关系及合法读取路径；本矩阵不预选新增非canonical API，也不修改CO。A01缓存命中不能代替A02；全量完成后才首显不能判A02通过。S2可核查Rust尾部与补早证据，但不能据此宣称该App目标已满足 |
| GAP-05 | 旧脱敏策略、edited_files、Goal/agent以及I组retention具体承载/规范化需分类；V55换行、摘要精确文本和用户保留事实载体尚待相应owner锁定 | S2按现行层级判断缺陷/扩展/证据不足；不直接采纳Gemini“已确认” |
| GAP-06 | 资源收益未量测，普通zst以外backend未启用 | S3控制配置比较；不能承诺峰值内存改善，backend扩展另行验收 |

这些是已识别证据/后续接口实施缺口，并非六个已证明产品缺陷。设计阶段不以缺少运行结果阻塞交付；也不能将它们抹成“全部完成”。

## 6. 现有测试可复用范围与断言质量

- native/codex-rollout-collector/tests/stage4_target_protocol.rs：后续复用正式target进程、hello/analyze/ACK/complete/source/checkpoint fixture构造；具体测试只证明其实际断言。对于tool/usage/outcome仅.any()/非空检查的部分，不足以证明F1/F3/F4精确集合、跨turn关联和多窗口收敛。S1未运行。
- native/codex-rollout-collector/tests/conformance.rs：可复用decode/Adapter/兼容及path fixture。旧local-path-redacted期望是历史策略证据，不自动成为ARCH §4.6正向保留oracle。S1未运行。
- native/codex-rollout-collector/tests/fixtures/sanitized-session-5/README.md：现有5文件synthetic fixture，两个日期分区、stale root-like candidate、root+三个child、3条edge；synthetic developer-role事件预期partial/validation_unavailable。可用于F04/F06补充反例，**不能用它证明terminal canonical replacement通过**。
- tests/codexHistorySyncService.test.js:357–420：已有“one older page emits one upsert-only delta and settles PARTIAL”测试，固定两项older、deletes=[]、fullOrderIncluded=false、ACK后partial；支持B03/B04/Q4的服务语义参考。使用fake ws/send和pageResult，未经过真实Rust、产品DB或Android SQLite，不能代替D03/E06全链路证据。
- 独立oracle顺序：输入事实与现行契约→人工对象集合/关联/范围表→既有独立正序参考。当前输出=Gemini输出只有差异比较价值，二者共同缺项仍失败。禁止把当前/Gemini输出生成expected。
- S2/S3报告每次fixture SHA、源码/binary revision、有效配置、操作顺序、预期/实际对象差异、stdout/stderr与退出码；本任务不新增仓库持久化测试。Rust执行通过也不将N/D/Q/A/I改为已验证。

## 7. 两侧快照与只读边界

采样日期：2026-09-14。current=E:/coding/TermLink-rust-source-resolution-codex；Gemini=E:/coding/TermLink-rust-source-resolution-gemini。

| 项目 | 值 |
|---|---|
| current HEAD | f8125dd54fadb61e30f2139ba7b0791b62d8e33f |
| Gemini HEAD | 56b863d9aa11f67fb743369aa5ff0495cb638521 |
| merge-base | 7a167711950710b05f3e84c8d3ad975df1c6ab0c |
| 外部ledger SHA256 | 674cb0b6f5e31ac7547569d174757a6988c9e0155e1c7c2001aa0b1ddd785f15 |
| current执行前dirty | docs/workflow/CURRENT_TASK.md；untracked docs/workflow/task-basis/（此前Runtime写入） |
| Gemini执行前dirty | .agents/skills/local-dev-server-control/scripts/manage-local-dev-server.ps1；untracked docs/codex/ipc-records/；本任务不触碰 |

两侧有共同祖先；**当前文件不是全部相同**。HEAD差异含Rust修复以及Node历史服务差异；工作文件Cargo.lock哈希也不同，不能假设构建输入相同。S1仅固定快照，不把差异判为缺陷/复用结论。S2/S3开始前重核其实际输入，避免并发修改混入旧观测。

以下SHA256按实际工作文件取得（包括工作文件依赖锁，不能用Git HEAD代替）：

| 路径 | current SHA256 | Gemini SHA256 |
|---|---|---|
| src/ws/terminalGateway.js | 4daa1853227403023a18536455aabce0311174873f588384396a5106e9663fa7 | 4daa1853227403023a18536455aabce0311174873f588384396a5106e9663fa7 |
| src/services/codexHistorySyncService.js | 270994171e670c0a44f90c649d7333ebe3d06b193f8df3f33bd723e3520e0a70 | cce0c716975e409735dc606c043f0ede9edd0176603f2e50c97ee74f12a3336b |
| tests/codexHistorySyncService.test.js | 02fbc282c8533ffb3b8df60b226a1643d07d7c4abc4f3d61b5f8b2ca183b0dd3 | ef14bf0a2cbf1aba8a5228e221aee600e29814c3c4e765f6ed481a12d6b4f7b1 |
| native/codex-rollout-collector/src/protocol/target_mapping.rs | 002b62c23a3277350039c1cfe543f33b92e1221042d3c6f5ae68e99a3a5f9d1d | b9da391317019f284cc0a6ad3c487f37de155a1f77c05b005eb047d26b06e93d |
| native/codex-rollout-collector/src/protocol/target_source.rs | 754c3c1c09d41ea5ef1a0cad6a4c2afb99459442556ff337a46c35a76972723b | 611ea1ef866c529e58006dc4e81bdde1b4bbae975edca02e7a4284aed14c7c3f |
| native/codex-rollout-collector/src/protocol/target.rs | b6e91974883072d1d08c43574ae5d3bf2088e02097abc7680892b9b07182c085 | 1386d3217b5ba6be7830b8d4764e1d571e5f65eef41ea80c7e9d4a2e1d7c8c41 |
| native/codex-rollout-collector/src/codex_adapter/mod.rs | 1064d98ed68810bbf747ae24eccf180bcb29690d30e55d00bd586a7181b28725 | 8183e81c5af14c91f16c16cdf305c79b19a92f2422cd823362d22b2a01c473fc |
| native/codex-rollout-collector/tests/stage4_target_protocol.rs | 7aebbcd6d4dd9184dd9fd921ef014d725dfae5c201325f173a63cae5d35e7e73 | 6612f09119052ca5c9668a57ef2c4f4039d19142e40cd595c34d0e49318c8ae6 |
| native/codex-rollout-collector/tests/conformance.rs | 0e6d2a231a9436bdce94a9a530264d0f470da67773d7de387009ca810a93d84e | f7c37660847aab550eb6d961e7708181f4e30195382aa85ba9547ce3cc14363f |
| native/codex-rollout-collector/Cargo.lock | dcd8b1008b78e3ce8245df7de4f583ad65ec433f38198f5bdb73251393db3ff5 | ee34ff82a0d47ced72dda0932e1b8531c74eb2c544055e36035229be96d0b36d |

## 8. 九项问题的后置交叉映射（尚未核实）

| 外部条目 | 业务用例与断言 | S2/S3要区分的事实；此处无成立/复用结论 |
|---|---|---|
| RUST-001 active_turn污染 | A04/turn-link、H08/identity、H01/turn-link | 尾部T4 context不能分配给旧T1/T2；时间/对象/关联逐条核对，不能只看排序表面 |
| RUST-002 文件与命令丢失 | H02/files、H03/command、H01/detail | FileChange与CommandExecution是不同variant；Gemini只修文件不等于命令已修 |
| RUST-003 outcome edited_files | H02/outcome、H06/status | 源file事件保留与Target outcome聚合分别核对；具体字段新增是否现行需求先查DATA/ARCH |
| RUST-004 backward不推进 | A04/range、G10/range、§3.1 | 必须真实经历多窗口且到root；扩大窗口一次覆盖不能证明步进算法 |
| RUST-005 默认预算放宽 | G09–G11、V01–V14 | 原限值拒绝不当然是bug；同显式预算算法组与各默认配置组分离；超限fail-closed是正向预期 |
| RUST-006 路径/命令脱敏 | H07/content、H01/detail、H03/command | 真实参数保留与旧formal测试策略适用层级分开；不能直接删除策略 |
| RUST-007 文件聚合key碰撞 | H02/files、H07/identity | 两路径集合精确2；先查当前是否已有聚合。若只存在Gemini新增edited_files路径中，不声称原基线必有该碰撞 |
| RUST-008 Goal未知 | H10 V41、H09/availability | 当前unknown/诊断是否符合支持边界；结构化Goal模型/卡片是否扩展，禁止仅凭台账把扩展算缺陷 |
| RUST-009 subagent/协作 | H10 V42/V43、F05/isolation | 事件保留与Node级联调度/产品下钻分开；不能凭文本来源id自动建立lineage/第二采集链 |

台账概览与正文存在状态漂移：RUST-006概览已修复而正文待修复，RUST-009概览“Commit待提交”但正文已修复。其治理“已确认”属于另worktree上下文，不是本任务Task Basis。后续复用以实际commit/hunk/依赖证据为准。

## 9. S1 静态交付检查

| 任务证据槽 | 本文件证据 | S1结果的含义 |
|---|---|---|
| AUD-01-R2 / matrix-business-flows-r2 | §2链路及接口、§4的99场景 | 业务主轴/跨层设计已形成；不证明产品行为通过 |
| matrix-coverage-accounting-r2 | §5：99主场景、89变体、63来源检查点（62映射、1不适用）及6项后续缺口 | 可逐行重算，不以9个问题当覆盖分母 |
| matrix-oracles-r2 | §3人工集合、行边界/多窗口收敛及§6测试限度 | 存在独立预期；fixture生成与执行仍后置 |
| matrix-storage-flow-r2 | §2.2、C/D/E组、GAP-03/04 | ACK/complete/COMMIT与App/IPC分层明确；不以mock存储冒充真实DB |

S1门禁：本矩阵需经独立review-change审核，特别审查未细分的交错/参数、oracle是否真正触发路径、是否把目标接口当现状，以及GAP-04是否被错误隐藏；本文件的静态自查不能替代该审核。未进入S2，无问题成立结论，无Gemini修复应用。

## 10. S2 当前项目执行映射（2026-09-14）

2026-09-15 S3-R1 恢复说明：S1/S2/S3 的已提交成果和失败记录保留；当前证据以本次重验及核实文档 §9 为准。以下旧轮次中“当前”“S3/S4未推进”等措辞只描述当时状态。原 S3 结论被后续证据重新打开；本轮只更正审计，不实施修复。六条 deferred finding、未到达断言、未执行 Node/DB/App 验证均未被本次消除。

本次 S3-R1 重验：2026-09-15T09:10:10.640Z 至 2026-09-15T09:10:51.500Z，schema 4，32 例中 19 通过、13 业务差异；conformance 31/31、target protocol 70/70，collectionPass=true、productPass=false。报告 C:/Users/kongx/AppData/Local/Temp/termlink-rust-issues-audit/current/report.json，SHA-256：f1d8ed968f425ea46838fac8842b2acce8ea0bea73fd9d4e94ed4a787b606c79。测试和 runner 哈希与原 S2 相同。

**R5历史状态：完整采集完成（审计通过，产品未通过）。** 冻结runner已完成构建、枚举和逐例执行：32例中19例通过、13例记录为业务差异（R01、R02、R04、R05、R06、R07、R08、R09、R11、R13、R14、R15、R29）；既有conformance 31/31与stage4_target_protocol 70/70均通过。`collectionPass=true`仅表示审计采集完整，`productPass=false`保留当前业务差异；不据此认领完整矩阵、九项问题成立或产品通过。当前`report.json`及此前attempt均在OS TEMP/termlink-rust-issues-audit/current及其`attempts`归档。

**R5上一轮历史状态：构建失败，未完成验证。** 本轮保留32例及ordinal 0，分离已定位descriptor边界与独立阶段，增加runner分类核对；但business_history_audit.rs:409的collect类型推断错误E0283使构建退出101、入口退出1。32例及101旧回归均未开始，本轮修改不构成通过证据；六项意见仍待验证。原始日志在OS TEMP/termlink-rust-issues-audit/current。

**R4历史状态：未完成验证。** 已修正公共请求衔接并接入内部窗口观测；构建/32例枚举通过，但R02内部descriptor对ordinal 0返回InvalidRolloutOrdinalRange，测试unwrap使采集退出1。target DATA允许非负ordinal，旧formal要求正数，不能笼统称fixture非法或提前判产品缺陷。R02公共阶段、R03–R32及101旧回归该轮均未到达。下文历次状态均仅适用于各自版本，不认领当前覆盖。内部/公共证据区分仍须完整验证。

**repair第1轮历史状态：该轮资产验证未完成。** 编译/32例枚举通过，R02在preview之后因测试请求cursor与persisted_anchor.cursor不匹配而中止，runner退出1。R03–R32及旧回归本轮未运行。下表及21/11计数均为修复前版本的历史映射，不代表当前测试通过；六项审核意见仍待验证。特别是A05的新时序、跨窗归属、富字段和恢复断言尚不能认领执行证据。详见执行报告§1。

S1原设计及99/89计数保留。本次S2/S3-R1完整采集的当前结果为32个Rust执行数据例中19通过、13个业务差异，旧回归另101通过。当前schema-4 runner持续收集各项断言与业务差异，具体已执行字段、观测差异与前置未满足(prerequisite-not-met)限制逐例映射见执行报告§9.4；历史schema-1的21通过/11差异仅作为前次记录保留于§3。以上不是完整矩阵或9项问题的通过/成立声明。

两资产：`native/codex-rollout-collector/tests/business_history_audit.rs`、`native/codex-rollout-collector/tests/support/run_business_history_audit.cjs`；精确函数、字段、预期/实际、命令和源哈希见[当前执行证据](codex-rollout-collector-rust-issues-verification.md)。新suite仅在当前worktree运行；Gemini在S4仅静态评估。

下表逐主场景登记选择状态。同一R可关联多行，但只能按报告实际字段认领；所有未列字段及N/D/Q/A/I层仍未执行，不能由Rust通过推导产品通过。当前逐例断言、通过/差异（19/13）及路径限制映射见执行报告 §9.4（历史 schema-1 记录保留在 §3 作为前次尝试参考）。参数变体仅R21–32明确覆盖V01–V12；其余选择限定及剩余Rust缺口见执行报告§4。

| 矩阵场景 | 本轮Rust执行关联 | 覆盖边界 |
|---|---|---|
| A01 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| A02 | R02 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| A03 | R01 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| A04 | R02 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| A05 | R03 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| A06 | R04 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| A07 | R05 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| A08 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| B01 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| B02 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| B03 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| B04 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| B05 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| B06 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| B07 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| B08 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| C01 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| C02 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| C03 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| C04 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| C05 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| C06 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| C07 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| C08 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| C09 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| D01 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| D02 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| D03 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| D04 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| D05 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| D06 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| D07 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| D08 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| E01 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| E02 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| E03 | R17 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| E04 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| E05 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| E06 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| E07 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| E08 | R18 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| E09 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| E10 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| E11 | R19 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| E12 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| E13 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| E14 | R17 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| F01 | R03 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| F02 | R13 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| F03 | R14 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| F04 | R15 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| F05 | R16 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| F06 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| F07 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| F08 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| G01 | R20 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| G02 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| G03 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| G04 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| G05 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| G06 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| G07 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| G08 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| G09 | R21, R22, R23, R24, R25, R26 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| G10 | R27, R28, R29, R30, R31, R32 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| G11 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| G12 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| H01 | R06 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| H02 | R07 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| H03 | R08 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| H04 | R09 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| H05 | R10 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| H06 | R11 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| H07 | R06, R07 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| H08 | R02 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| H09 | R12 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| H10 | R12 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| H11 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| H12 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| H13 | R02 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| H14 | R09 | 仅对应Rust字段已尝试；当前通过/差异/未到达见执行报告§9.4（历史原貌见§3） |
| I01 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| I02 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| I03 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| I04 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| I05 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| I06 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| I07 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| I08 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| I09 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| I10 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| J01 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| J02 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| J03 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| J04 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| J05 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| J06 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| J07 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |
| J08 | — | 本轮业务断言未执行；保留S1设计，不认领旧回归为整行通过 |

S1的既有测试引用是局部参考，S2运行旧suite不自动认领额外业务场景。I01–I10、未选异常/压缩/身份fallback等保持未执行。A02/J01的GAP-04和Node/DB/App后置范围不变。S3才核实九项，S4纯静态复用；不沿用旧计划的Gemini动态对照要求。
