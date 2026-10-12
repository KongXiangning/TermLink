# TASK-20260832 S1–S6 独立累计审查

2026-10-08。总体结论：**有 1 项 P2 兼容缺陷**。原 H1、H2、H3 的具体机制已分别处理，指定 N/C/D 的产品保存、手机持久正文、切换/重开和各自选定工具详情证据成立；但新 consumer 对存量 target-v1 canonical checkpoint 的正常终态采集选错读取路径，造成新增历史停更。不能据六步 finished 或旧自审 clean 将累计交付判成无问题。

## 审查对象与独立性

审查覆盖从基线 `1d762bb3f8ed3f0f972a47b7edb78f0615220e7f` 到当前 HEAD `488dc6c9e597ef096f617d17499fa8e048306c06` 的累计业务改动，包含 833 的实际共享兼容前置交付，以及未提交的 S6 Android 两文件改动。三位审查者均未参与 832/833 实施，分别负责主审/Android/手机档案、Rust 来源/委派/协议、Node 导入/消费者/产品入口；报告由独立主审整合判断。旧自审、完成记录仅用于追溯，不作为正确性证明。

已读当前 AGENTS、review-change Skill、WORKFLOW_PROTOCOL，完整 rollout collector 架构、相关 CONTRACTS 与 DECISIONS 的 AD-004/018–022、精确共享兼容契约及所需接口规范。审查以真实采纳计划、S1/S2 授权范围、S5 UTF8 补充决定和 S6 Android 补充决定为准。没有新增架构、预算或验证门禁。

fresh task-status（JSON stdin）确认：832 为 active，plan=`key-883610b55d72c5bf14820162de6216e4bf8c367d310b5ee5c262ed9f6ae323f0`，S1–S6 均 finished；833 为已关闭前置任务。精确 execution/review/disposition refs 见 `state-summary.json` 和 `result.json`。本审查没有改任何原 disposition、业务源码、REQ/PLAN/CR、任务焦点或 journal，没有 Git 写操作、启动真实服务、操作手机或发送模型回合。

当前 Rust exe SHA256 为 `f0cd1b37ff02d0a023ff77d96b9e4be103507965afde20c4e3207b6dfcd3ec2e`。S6 安装/build APK 的留存证据 hash 为 `f148028b15fa3a8dffe63ca483bcda5a1ce9764bbde817e68a357598d25dfd6a`；本次没有重新安装。当前 ViewModel/test SHA256 与该 S6 源码档案一致，分别为 `aac5ced2b1b6c689c1fbfa57b80a19679d6f9d8fa6bb7b7bf5793c6962c00f78`、`91a9e0f622f96fa2bb8c556fce9568708e848dd82e695d496b9bd03a10cf566e`。

## 新发现

### IR832-01 / P2：存量 v1 canonical 的后续终态采集不会切到新 profile 的 backfill

定位：`src/services/codexRolloutCollector/index.js:626–634` 只在请求已经是 backfill 时处理 v1→v2 的新意图。实际生产入口 `src/services/codexHistoryReconciliationScheduler.js:166–181` 对任何 canonical checkpoint 都固定选择 append 并带旧 cursor/anchor；新默认 manager 协商 target-v2。两处组合留下了正常生产升级路径。

触发：已有 target-v1 完整产品历史和非空 cursor 的对话，在新 consumer 下完成一个新回合或重启后重播其终态保存 intent。scheduler 新建 job，却发送 target-v1 anchor 的 append；Rust `target_runtime.rs:522–536` 正确返回 `checkpoint_incompatible`，`retryable=false`。scheduler 失败分支 `:154–161` 保留 intent 供重播/重启，下次仍选择同一 append，未形成符合规范的新 profile backfill。

业务影响：旧已发布正文/checkpoint 被保护，但新增完成事件不进入产品历史。不会清空既有历史，也不会把旧历史错误升级成 canonical；保存功能对这类存量会话持续失败。原持久库中 F=`01a0ee04-a775-72b3-bd07-04aac804a3b4` 实际留有 canonical target-v1 checkpoint 和非空 cursor，触发条件并非虚构的旧 schema。

独立复现通过真实 Rust→Node→隔离 SQLite 先发布 v1 prefix，再向**测试来源**追加实际 TurnCompleted 记录，通过真实 scheduler `_reconcile` 发起新读取；观测为 v2 hello + append/v1 anchor → `checkpoint_incompatible`，产品项数 2→2，新增完成未保存，原 canonical/checkpoint digest 保持。复现报告与安全脚本见 `node-review.md`、`node-audit.json` 及其索引文件。直接 backfill 的 13 项 history-v2 测试和 5 项产品测试通过，却绕过该生产模式选择，因此不反证此缺陷。

对应资格：833 共享契约 §5.2 已明确新 profile 普通读取要独立 backfill job，cursor/persisted_anchor/known_complete_range/recovery 四空，旧状态留存；Rust 的跨 profile append 拒绝应保持。本缺陷属于既已授权的最小 Node profile/checkpoint 选择遗漏，影响 832 S4/S5 所承接的共享消费者及累计产品保存能力；不是要求全 4.5 迁移，也不否定指定 N/C/D 当前样本已成功。

最小后续：在实际终态采集路径依据协商 profile 与产品 checkpoint 选择新的普通 backfill 意图并置空四个恢复字段，保留旧 canonical/checkpoint；原 job 未结算重交付仍维持原 profile、job/delivery identity，不可混入该转换。增加从实际 scheduler 入口验证 v1 已发布→新增完成→v2 正常重读/发布的既有回归。无需放宽 Rust gate、删 receipt、换持久根或提高预算。

## 三项原因、交付和业务证据

| 项目 | 独立判断与实际闭环 |
| --- | --- |
| H1 新历史增长拒绝 | 原 8 次 batch_scope_conflict/batch_rejected 保留；原 staging 的同 turn Started→Completed 逻辑 mutation 变化机制与不可变物理事件相符。833 G1 只在旧开始、当前完成、相同 scope/当前 attempt 和 full 或连续 delta 覆盖可证明时允许更新，真实冲突/倒退/降级仍拒绝。新普通 N 的正式保存及手机证据成立；存量 v1 入口另有 IR832-01。 |
| H2 原生 Branch parent missing | 原 C→A 的 history_base、83 records/491301 byte cut 与 parent 可读性分开验证；Rust 只沿明确 parent edge 补辅助来源，独立目标身份、真实物理来源和切点分开。初始 S3 小 segment 拒绝继承前缀的实际 finding 保留，当前完整行窗口修复与 aggregate budget 拒绝保持。真实新 Branch C 有 N 的全部 11 项继承及自身回合，22 项/4 refs；N 未混入 C 的自身正文。 |
| H3 特定委派载体 | 原三组两类无 call_id carrier 的 6 ParseGap 被安全 fixture、vendor/Adapter/owned event 回归覆盖。实际 native id/turn/body/binding 保留，等价双载体是同一逻辑项、不同物理事件；未知/冲突保持 partial，普通 call_id 工具仍是工具。旧 A/D 经原持久根发布 40 项/9 refs，system 委派正文和真实工具分开。S5 后续 UTF8 缺陷以原代码失败→局部 decoder 修复→原 A 发布证明，未清旧诊断或失败。 |

原 H1 八次失败没有被逐次重发；本审查核原 retained staging/物理事件、准确错误机制及新正负向回归，不能把八个历史失败改写成八次成功。旧 C 的失败原件仍在；自然 Branch 验收使用明确授权的新 C，有自己的真实回合，不把继承工具算作自身执行。

## 手机与 Android 独立核对

主审的新只读审计使用 force-stop 后稳定手机库、baseline 手机库与真实 product SQLite 的内存 query_only 副本，通过当前纯 product provider 重算 DTO。N/C/D 的 11/22/40 项逐行核 item/turn/type、payload JSON/UTF8 长度/hash/ref/provisional，全部匹配；product_db 完整范围、committed segment、oldest/newest/range/coverage root 相符，2/4/9 refs 的实际详情分页内容/字节/hash 均成立。2353 条无关旧手机行精确保留，原 A legacy 8 行的正常产品重整不被描述为整库不变。

每类 3 条服务端正 ACK 通过 sync UUID hash 对应手机 synced，再以同 phone run/generation 和 delta→synced 顺序连接 pageHashMatches=true 的实际 delta；ACK 日志本身没有 pageHash 字段，未伪造。A 的 STAGED 是 chunk 等待状态，完成证据来自后续 synced/ACK 与稳定完整 payload/committed range；没有把 STAGED 当直接 COMMITTED。

重新解析原 UI XML，并目视核对三类重开详情截图：正常及重开时选定详情的文本与对应 provider 内容完全一致；N/C/D 各为 469/469/552 字节，包含真实 command/cwd/output/status/exit/duration。返回/重开的正文标记与产品详情入口存在。主审没有再次操作真机，故这是对原真实设备档案的独立核对，不是新的真机运行。

S6 最小 alias 改动仅把同 turn、明确 operation/native id、tool: cache key 与现有 refs 关联；未改变 IPC 正文/运行态权威、follower/selection、恢复或存储协议。新 focused JVM 独立复跑现有三项，3/3 通过。原四个 JVM suite 216/216、Node 冻结区 139/139、APK 安装与环境恢复证据按同源版本复用，未重新扩展全套。

新手机审计最终 60/60 是档案核对谓词，不能加进 JVM/E2E 测试计数。其两次自身取证错误（nullable refs、XML 属性解析）均保留在本目录失败输出，修正审计后重读同档案，无业务重放；不将这些工具错误当作产品缺陷或隐藏成一次全绿。

## 六步判定与验证层级

| 步骤 / 最新 execution key | 独立 verdict | 覆盖与资格 |
| --- | --- | --- |
| S1 / 248acd0c7d34961431c8c987339c07919fbf316b12d5d8bcca70cb2061cf37d2 | clean | 三条原机制、脱敏诊断交付/映射与失败保持；不是产品 PASS，原八次未逐条重放。 |
| S2 / 56e67631043abd0af05fa6ce1c8852e2df1e9564c7e919d6233879194db06cd0 | clean | Rust→Node 最小共享前置分拆和明确授权；设计本身规定了正确旧 profile 新读取路径。 |
| S3 / 84446cf3e9320397d5eb4b52002da9f98e6a9f12733127705641dff1bcf90f29 | clean | 累计 Rust branch/window/cut、委派输入及 fail-closed/profile 边界；独立 targeted Rust 12 项通过。 |
| S4 / 8ddef1358f673636db8e4923d31b087c504694e05340b8cb94dd2e0757671df0 | findings | 正常 G1/G2/H2 staging/ACK/complete/product/provider 支持已核；承接 833 的生产消费者兼容仍有 IR832-01，直接 backfill 用例没有覆盖 scheduler 选择。 |
| S5 / d0b8dc2e154ae495d2861d6b345314a0f56fc0c50b8709819f3208d1620f4517 | findings | N/C/D 自然宿主产品保存、S5 UTF8 局部修复与旧数据保护成立；累计正常存量终态采集仍有 IR832-01，不能由新样本发布推导兼容路径完成。 |
| S6 / 29fa58717d0180fac733d3b4915b441a270f74cdf061ae1599b668532c01903d | clean | 三个明确样本的原手机 durable 正文/refs/ACK、selected details、切换/重开与 alias 代码证据成立。独立静态/档案核对及 focused JVM；没有新设备运行，不认证全部工具点击/其他设备/发布。 |

新增真实测试、命令、exit、selector、报告及适用步骤在 `result.json.new_test_runs` 中逐条列出；原已归档测试不伪装成本轮新增运行。Node/Rust 子审安全报告提供其精确覆盖和原始运行结果索引。

## 保留观察与限制

管理/文档观察 M1：journal S6 已 finished，但 PLAN:23 仍为 executed_pending_review，REQ:65 最后段仍称当前待 review/finish。这是当前进度文档滞后，旧执行报告保留当时 pending 是正确历史。需求 in_progress 和任务 active 本身一致；此滞后不导致本文的历史保存缺陷，也不成为产品验证失败或新开发门禁，后续正常文档同步应区分旧时点与当前状态。

三条原 unassociated management records 保留，未被补造关联。fact persistence、association、view publication 与产品正确性分别判断；本次 journal 保存由 root 统一执行，本文不编造尚未知的 review refs。

用户明确排除且仍未解决：旧连接错误条残留（S6 中再次观察）、B/Q 原预算失败与 retained intents、registration 候选。它们不是本次新 finding，也不能因 N/C/D 通过而写成解决。64 KiB 详情 retention 未变，截断 marker/hash 按既有策略保留，未声称无限输出完整。

未覆盖：重新运行手机或模型、全部 9 个委派详情 Dialog 点击、其他设备、深分页/大详情复制/完整竞态和断网矩阵、完整 resend/replacement、整体 4.5 迁移/发行。已检查外部只读、原资源保护、单进程/单会话采集链、Rust/Node 模块隔离、IPC authority 与既有 A/B 边界；审查未产生它们的新改动。

`next_route: prepare-task` — 后续可依据本 finding 准备最小 Node profile/checkpoint 选择补充范围及实际 scheduler 回归。832 S4 原切片以复用/测试为主，833 已 closed；本次审查不授权新增 scheduler 文件修复，不自动修复、重开步骤或关闭 832。具体采用原任务范围修订还是单独小修复，应按后续实际用户指令处理。
