# TermLink：业务依赖、任务实际先后与Git祖先链

基线 `a78fe55e033bbcb6db816acd2c801de5aa28a081`。事件为UTC登记时间，不冒称运行秒级起止。

- 业务依赖：Rust读取/投影→Node交付/持久事务→产品provider→Android缓存/详情→自然E2E；已交付层不重新开工。
- 真实执行顺序为831发现问题→832诊断拆范围→833先交付共享H1/H3→832继续H2/UTF8/Android三样本；不是按831/832/833数字直排全部。
- 868后来的局部修复取代同提示/registration旧失败，但不会取代无关终端/工作区/Plan/Skills/文件/大详情缺口。

## 实际交付顺序

### 1. Rust正式采集基础→输入兼容→归约→隔离运行时

- Task：20260819-001, 20260820-001, 20260820-002, 20260820-003
- 时间：原任务阶段8/19–8/22；不是任务编号排序推测
- 交付：Formal package、输入/adapter-reducer、isolated runtime/checkpoint依次落地
- 边界：这些是采集基础层，不证明Node产品数据库和Android已集成
- Git：
  - `cecee23d8e36d0c3914b53eaed9f85ada6e49157` · 2026-08-19T23:54:49+08:00 · feat(codex): add formal rollout collector foundation
  - `19ef94c54f75ce6283d5d8cf417e685f24fc5330` · 2026-08-20T10:37:48+08:00 · feat(codex): complete collector input compatibility
  - `1b37d812a879046bca8f89c3b180149199056e39` · 2026-08-20T10:38:21+08:00 · feat(codex): complete rollout collector stage 3
  - `21b6d423d5e47a95bf64e5f4cd3df5970bc5f2b4` · 2026-08-20T11:51:29+08:00 · feat(codex): add isolated rollout collector runtime
  - `4646e3e9c4d2cfb2dfceb64b8c2c838a61682b76` · 2026-08-20T14:24:34+08:00 · feat(codex): integrate rollout collector stage 2
  - `0874ecf6fe12783858257ae0b9a39a5d48754c5b` · 2026-08-20T15:43:09+08:00 · feat(codex): complete collector checkpoint integration
  - `a89a3e433cc31168fa064a26f2302a019ec9b388` · 2026-08-22T02:07:28+08:00 · docs(codex): archive rollout collector stage 4
- 来源：
  - TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md
  - TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md
  - TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md
  - TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md

### 2. Lineage与公共接口契约先收敛

- Task：20260823-001, 20260825-003
- 时间：8/23–8/26原归档与提交
- 交付：lineage分支合并后退役Node公开discovery/fingerprint语义
- 边界：eaa3019是双亲merge，不应按作者时间把另一分支当线性直系父节点
- Git：
  - `a7093245066edd8ab13f1a8a4c28aea58b045882` · 2026-08-23T02:18:25+08:00 · feat: add session lineage rollout discovery
  - `e5e0cc29d9f3ea3eeaf58b2fd690d699e762941c` · 2026-08-23T20:32:43+08:00 · fix(rust): harden rollout lineage discovery
  - `be30c7f0a91562d3a63702693c5f86a95a46e585` · 2026-08-24T01:35:15+08:00 · fix(rust): remove parent lineage full-file mutation guard
  - `a94dcbcae9a115f1fb201d9acf861c92919f1f77` · 2026-08-24T02:23:12+08:00 · fix(collector): canonicalize rollout siblings
  - `eaa30190d43593416ec82c66303677ebf3591c01` · 2026-08-24T15:28:13+08:00 · Merge Codex session lineage collector work
  - `5cf848879b57b5b1b3ccb9ca3439eef89547f97d` · 2026-08-25T02:55:00+08:00 · docs(codex): converge node rust collector contracts
  - `bef0274a08f5f60ff3bb6a39ee0c60f779dad92d` · 2026-08-26T02:00:30+08:00 · docs(codex): retire discovery/fingerprint public semantics, close task 20260825-003
- 来源：
  - TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md
  - TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md

### 3. Rust4.5 target先交付，身份修复随后

- Task：20260826-001, 20260827-001
- 时间：原826归档明确开始8/26、结束8/27；当前10/11导入记录不是实施时间
- 交付：Rust startup/hello、三mode、ACK/complete、source/lineage与确定性delivery identity
- 边界：9409b35为9/9后续target清理提交；其与原826具体步骤归属不可仅按title自动绑定；隔离范围排除Node产品DB/App
- Git：
  - `b03f673e052ed89914e5dc525ff95d03b30f17a0` · 2026-08-27T16:22:59+08:00 · feat(codex): migrate Rust collector target protocol
  - `5a3214a1e63a0e2c94c846ded3f1abb1127c727e` · 2026-08-27T16:52:38+08:00 · fix(codex): derive deterministic target delivery identities
  - `7a167711950710b05f3e84c8d3ad975df1c6ab0c` · 2026-08-27T21:19:49+08:00 · docs(workflow): archive target identity repair
  - `9409b35a5b31afa37dc39a4159ef7181bdec81fb` · 2026-09-09T17:55:22+08:00 · fix(collector): complete target protocol migration and regression cleanup
- 来源：
  - TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md
  - TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md

### 4. Node4.5 consumer/coordinator在Rust之后

- Task：20260828-001
- 时间：原归档完成9/13；final20b79197+当时工作树verification repair，repair后于9/14提交
- 交付：Node-first hello、单例/单飞、batch持久ACK、checkpoint、有限重试；同步spawn失败补修
- 边界：原边界排除产品DB、gateway、Android、IPC、release，不能据归档判整个历史链完成
- Git：
  - `20b79197ce8889294c7a12585ebe3ae008fac11d` · 2026-09-13T01:46:01+08:00 · feat(codex-collector): complete Node 4.5 recovery flow
  - `7282a1f1e520cfd9ec6c5e9b4e70b7bd3b364b32` · 2026-09-14T01:05:43+08:00 · fix(codex-collector): retry after synchronous spawn failure
  - `f8125dd54fadb61e30f2139ba7b0791b62d8e33f` · 2026-09-14T01:08:28+08:00 · chore(workflow): migrate to vNext and archive Node task
- 来源：
  - TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md

### 5. 001审计→002采集阻断修复

- Task：legacy-doc-87ea7576bc76f5782bea891f, legacy-doc-05c82c8a6e6c9181adfc2be2
- 时间：9/14–9/23文档/实现提交与原任务事实
- 交付：先核RUST001–009/Gemini复用，随后bounded backfill、安全append、source resolution/partial cursor等隔离修复
- 边界：001是审计，不把审计提交当产品修复；002隔离闭环仍非完整产品历史E2E
- Git：
  - `c1b512da39580b7efd1755b720933ccd6add4286` · 2026-09-14T10:55:54+08:00 · docs: add reviewed rollout history business test matrix
  - `5285ec205b91ac56838679651819c6b7aef87e81` · 2026-09-14T22:07:01+08:00 · test(codex): record Rust audit evidence
  - `eae82f5cceb0dccb6c6c3526c882c4e548529069` · 2026-09-16T02:25:56+08:00 · docs(codex): complete S4 Gemini fix reuse assessment and finalize audit task
  - `42d7831a6ab4325dd0a26f1d2bd0813944f05d60` · 2026-09-20T01:09:18+08:00 · fix(rollout): complete bounded backfill and safe append promotion
  - `da77150a4be6d85c6e4bc7cc40f28df8550ff7f9` · 2026-09-21T01:10:38+08:00 · fix(rollout): sync source resolution and workflow runtime
  - `00afa798a39674e7e74be5de20afed6acc9f05fb` · 2026-09-22T01:21:19+08:00 · fix(rollout): close S1 continuation and conflict remediation, sync workflow runtime
  - `d596bf629baa4a82a75cc1cc319664fa647c1c37` · 2026-09-23T08:32:15+08:00 · fix(rollout): map completed items and guard partial cursors
  - `f8a6635c1e8d00f236631e7e278bd60893ac74bc` · 2026-09-23T10:47:29+08:00 · fix(rollout): complete isolated collector lifecycle verification
- 来源：
  - TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md
  - TASKS/TASK-002-rollout.md

### 6. 旧003开始Node产品历史，用户停止后由004承接

- Task：legacy-doc-03166aa61e365e5f8af1f680, legacy-doc-fdd730cf99bb383419d74988
- 时间：003原记录9/28 stopped-by-user；004 S3登记2026-09-29T07:16:58.075Z，关闭08:16:07.170Z
- 交付：保留真实路径/内容、产品事务库/provider/gateway；004独立验证包内历史staging/recovery/契约
- 边界：003当前显示TASK-20260842只是历史映射；不是004身份。003停止不抹掉其代码，004通过不等于App E2E
- Git：
  - `f33bfb912e790bfe2a77e170ace5a4b30057bd86` · 2026-09-23T21:01:28+08:00 · test(collector): assert exact path preservation
  - `9da94e2d0c7eef250f7aa511d694edf1d32f7332` · 2026-09-24T16:42:59+08:00 · fix(history): preserve __proto__ fields in product history
  - `2322da503f12dc484748f80e9264e9b1f7453926` · 2026-09-24T17:03:50+08:00 · feat(codex-history): add product history provider and gateway
  - `4f75e40f1abbd7f95cc6f579897807daf311442c` · 2026-09-28T13:52:54+08:00 · chore: checkpoint Task 003 work and vNext workflow state
  - `89259dec5566ebe1827424083efd92b080d17fb0` · 2026-09-28T21:19:05+08:00 · docs(task-004): record S1 verification and contract sync
  - `33c6dd7a588a361a86351c510b15fe0e4a0e26fa` · 2026-09-28T23:09:15+08:00 · test(task-004): verify package history staging, recovery, and contract sync (S2)
  - `7e32943de2fe889f6336082bc91e8942b69aa2ea` · 2026-09-29T23:23:08+08:00 · test(task-004): finalize S3 acceptance and evidence
- 来源：
  - TASKS/TASK-003-rust-node-app.md
  - .workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/387；逻辑ref=.workflow-system/records/events/key-e08526b3c8735b7d386e9646487feb657dd66d468f56308ceb54b0aef26d94cf.json

### 7. 005 Android接入途中先修830 Rust兼容，再继续005

- Task：task-7a4566ccf322e08968cd5c7935cf61dd, task-751a3f4ef6d9d4cd1c08b99ec1b0b963
- 时间：005计划9/29 08:39Z；9/30 05:16Z暂停，830 13:25Z关闭，005 13:43Z恢复；005 10/2 15:31Z关闭保留缺口
- 交付：先cache-first、再修token_usage_record/developer carrier兼容与diagnostics隔离，再真实product_db首屏/Android eventFacts/只读详情
- 边界：9/30执行在工作区，若干产品改动到10/2才提交；执行先后不等于commit时间。005关闭保留older/append/详情/竞态未知
- Git：
  - `29a199d2eb3faa8838185d1577c40f0ec4779e00` · 2026-09-30T01:25:55+08:00 · feat(codex): integrate product history first-page cache
  - `eb1de240357282aa346800c9d7553ae2c729eefd` · 2026-10-02T03:08:05+08:00 · fix(collector): support Codex rollout compatibility and canonical diagnostics
  - `ed8dec26ae035cc1614b75c31a21f8c7160e95c8` · 2026-10-02T03:08:09+08:00 · fix(history): keep analyzer diagnostics out of product projection
  - `bc7ff0a715c193bc5063b46c5ce035a8656ec822` · 2026-10-02T17:13:14+08:00 · fix(android): display cached product event facts
  - `241becbc2e72f3a1c90970e47f7e95ccf0021dba` · 2026-10-02T18:13:32+08:00 · feat(android): add read-only Codex history details
  - `2c9ff5e5e5574dc34ab5c6280f30634b15e6394f` · 2026-10-02T23:38:30+08:00 · chore(workflow): checkpoint Task 005 validation and closure evidence
- 来源：
  - .workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/162；逻辑ref=.workflow-system/records/events/key-2f752b12ea801d28e4959cce67a25f828a51e70f133b783416062823298915c8.json
  - .workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/277；逻辑ref=.workflow-system/records/events/key-9315aa5f56fdf91a7d40826f4d804242411c2d30690ca05178394be9475ec93c.json
  - .workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/254；逻辑ref=.workflow-system/records/events/key-842adb4b99da17473bc6a06d4d488f5f4537220720dc4d4a83702bf3e8e13f4f.json
  - .workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/376；逻辑ref=.workflow-system/records/events/key-dbec71588bac0244303f6bc3daeccbcc0c9d7247e490cf74dd19ce73d0d24e60.json

### 8. 831真实E2E调查暴露共享/分支保存问题

- Task：task-25654b249109f357a559899562804c15
- 时间：采纳10/2 18:39Z；S2 20:04Z，S4 10/3 18:44Z，S5 10/4 09:48Z，S6 15:51Z，关闭16:10Z
- 交付：真实host/手机/DB观察及缺口分类已做；S4-R1/S5-R1仅补证据，不是产品修复
- 边界：A delegation carrier、branch publication失败当时真实；不把checkpoint管理commit当业务修复。older/自然详情更新/resend/受控竞态未全闭合
- Git：
  - `ee5d491204f9c684b8c90cb2a5ae60943db9f026` · 2026-10-03T03:30:33+08:00 · chore(workflow): checkpoint E2E evidence records
  - `0bf998452a3f86afa3d68bd0e43d3d9c515499ed` · 2026-10-03T16:04:57+08:00 · chore(workflow): checkpoint S2 execution review
  - `19bf3121203ba17ad21147ffe02877d50a22d4a0` · 2026-10-04T02:17:39+08:00 · chore(workflow): checkpoint S3 disposition
  - `60c507f6a4ac5573e96028429d24684d1f3e0b5e` · 2026-10-04T03:19:57+08:00 · chore(workflow): checkpoint S4 disposition
  - `026892bb02a44c6664dc96e62acb41428422a310` · 2026-10-04T23:32:33+08:00 · chore(workflow): checkpoint S5 disposition
  - `1d762bb3f8ed3f0f972a47b7edb78f0615220e7f` · 2026-10-05T00:14:25+08:00 · chore(workflow): checkpoint task closure evidence
- 来源：
  - .workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/173；逻辑ref=.workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json
  - .workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/256；逻辑ref=.workflow-system/records/events/key-8464c4002ea41b1b57974aaf26a47b116e56a5f8f029fc6e7fc0074df0158a68.json

### 9. 832先诊断，再拆833共享前置

- Task：task-58bc12d9a46b8d84fb6e42888785b402, task-7ff69ba8242c90c52f0b93fa1144a655
- 时间：832计划10/4 18:36Z、S1 19:08Z；S2拆共享10/5 05:52Z；833计划05:54Z/采纳06:29Z
- 交付：将H1/H3公共delegated/input/growth语义与H2 branch、真实三样本分开实施
- 边界：此时832早已开始；S1诊断与S2范围准备并非产品修复，也不是832未开始
- Git：
  - `fe3969f28b1b8934d2368f0b5b4a8b1a12b35f71` · 2026-10-05T13:37:53+08:00 · chore(workflow): checkpoint TASK-20260832 S1 disposition
- 来源：
  - .workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/258；逻辑ref=.workflow-system/records/events/key-857c88fe513282c2114ba4795cbdbc79b11b873e410d8821b987100ae6fe0bba.json
  - .workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/320；逻辑ref=.workflow-system/records/events/key-b16597f8fef0ad14ea72f51db11ed6fd6e8676496e0c2ffe63caf7e9f2e6c32b.json

### 10. 833共享前置先落地并隔离验收

- Task：task-7ff69ba8242c90c52f0b93fa1144a655
- 时间：S2 10/5 11:34Z；S3 18:55Z；S4 10/6 07:09Z/R1 10:48Z；S5 12:21Z；关闭16:10Z
- 交付：Spike→formal wire、Rust delegated类型、Node消费及durable promotion proof；真实Rust/File/临时SQLite/provider隔离43/43
- 边界：可取代H1/H3原缺兼容的判断；不证明832 branch与真实host/phone三样本，也不证明005/831自然全链
- Git：
  - `6e04e4ad07c73897683a95265f15eade042e9076` · 2026-10-06T00:27:51+08:00 · feat(codex): add shared history wire compatibility closure
  - `7ce1d08e6dbb7863d5b95fb992086f1b37637488` · 2026-10-06T14:43:54+08:00 · feat(rust): add delegated event and target compatibility
  - `f2fc146d7a5099f9871f3af8e6a1cd3ee52b59b8` · 2026-10-06T19:52:45+08:00 · fix(history): gate delegated promotion by durable evidence
  - `589a62a78c6214fea13e7c5eecac5466d64d7a5d` · 2026-10-07T00:19:18+08:00 · test(history): record product delivery persistence evidence
- 来源：
  - docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md
  - .workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/309；逻辑ref=.workflow-system/records/events/key-ab2831b4bfe6fc017ff681204a3c80c98b0216a9dd0dfa09f10941a255856861.json

### 11. 833之后继续832 branch→UTF8→Android样本闭环

- Task：task-58bc12d9a46b8d84fb6e42888785b402
- 时间：S2 finish10/6 17:03Z明确复用833；S3 18:07Z/S4 18:50Z；S5 UTF8修复10/7 16:50Z；S6 18:11Z；关闭10/8 07:06Z
- 交付：Rust parent locating/切点/有界窗口、真实持久branch、UTF8 chunk解码、Androiddetail alias，原N/C/D三样本完成
- 边界：833关闭并不自动恢复832焦点；10/7 adopted_by是S6范围补充不能误当首次开始。三样本PASS只取代对应原保存失败，不抹掉大详情/older/E07/races未知
- Git：
  - `714379dafa7eedb3517d5d0550518faca969966c` · 2026-10-07T02:39:59+08:00 · fix(history): repair branch lineage reads
  - `32c6b66179ac314321540fab3b0a82b56050e317` · 2026-10-07T11:37:56+08:00 · test(history): add branch product delivery regression
  - `488dc6c9e597ef096f617d17499fa8e048306c06` · 2026-10-08T01:07:22+08:00 · fix(history): preserve UTF-8 analyzer output across chunks
  - `0618cafcb12f73d33b8699b8d9bfa76b4ee55e1e` · 2026-10-08T15:19:55+08:00 · fix(android): preserve history tool detail refs
- 来源：
  - .workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/136；逻辑ref=.workflow-system/records/events/key-1bf17b543f6a0cd77feda64b334a08e4202b0963e8580459b73c22ab08cb69bf.json
  - docs/product/history/maintenance-20261011/TASK832-close-report.md
  - docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md
  - docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md

### 12. 10/11–13治理/验收材料后接868局部修复

- Task：task-d211a98b3f7889123b22ace1f99dfacb
- 时间：868采纳10/13 03:23Z；S1 finished04:32Z；S2 finished06:17Z；S3 finished07:15Z；closed07:25Z；代码commit07:57:42Z
- 交付：S1网络与IPC失效提示按generation/conversation清理，S2真实registration未知/撤销拒绝，S3真WS/受控IPC/A-B-new局部验证；随后仅vNext升级
- 边界：3d72aac只改4个Codex Kotlin+registrationManager和相关4测试及材料；不修终端Ctrl/首输入、PDF、Plan options、Skills覆盖、文件contentURI、大历史详情。S3 manifest13源码/测试及server.js与当前同hash，可接局部证据，不整REQ PASS
- Git：
  - `786b81ffdb999e956ca205b0cfc8b01a334f0df0` · 2026-10-12T23:47:00+08:00 · docs(product): record current requirement assessment and evidence
  - `4d586e0f2dab1fef9d2c273b770796b63a7d873d` · 2026-10-13T00:21:09+08:00 · chore(vnext): upgrade runtime to 0.24.8
  - `3d72aac95a1f8bfc7fe3089797e868c28a185454` · 2026-10-13T15:57:42+08:00 · fix: clear recovered connection hints and reject invalid registrations
  - `d3b71779ecd4ad2aa52cfd04738995030dabd0a6` · 2026-10-14T15:24:34+08:00 · chore(vnext): upgrade runtime to 0.24.10
  - `a78fe55e033bbcb6db816acd2c801de5aa28a081` · 2026-10-15T00:45:58+08:00 · chore(vnext): upgrade runtime to 0.24.11
- 来源：
  - docs/product/history/maintenance-20261011/task20260868-close/closure-20261013.md
  - docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md
  - docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json
  - .workflow-system/records/events/key-dd98bdeedf29d71c36dbc48dc774837f36555aea1f882afe36defcb5cc571068.json

## 祖先核对

选定62个commit均为基线祖先。所列相邻选定commit均逐对检查；中间省略管理提交，不等于直接父子。

## 排序建议

1. 沿原历史链先排会阻断后续读取/保存的现行明确缺陷：大工具详情截断；832/833已验收局部不得列成未开始。依据：采集/持久/provider/App详情存在真实依赖，后续端到端证据需要可读真实内容
2. 完成既有005/831明确保留的自然growth/E07、older、resend、在途隔离和媒体清理的证据核对；先定位现存证据，再决定任何新执行。依据：这些未因832三样本或868提示测试关闭；本次不授权运行
3. 并行处理互不依赖的terminal首输入/Ctrl、workspacePDF、Plan/Skills/文件上下文等已知缺口；同一共享能力只排一次。依据：不能以历史Task编号把独立现行故障全部排到历史链之后
4. 保留clean-host/外部host已明确延期验证；不因旧未测状态重开已交付代码。依据：时间顺序用于证据覆盖，业务依赖与当前影响用于执行排序

## 未定与禁止误用

- 旧Rust阶段的十月journal时间是导入，已以原归档8/26–27及Git链区分；无法精确到运行秒时不伪造
- 9409b35及部分早期收尾提交的具体旧step对应未逐一定位，不新造task绑定
- source_revision常是执行开始HEAD+工作区，不能当产物最终commit；关联依原CR/事件范围及后续commit文件语义
- Git祖先只证包含顺序，不证明产品结果；所有运行结论仍是原报告指定对象

## 关键事件定位

下表原journal ref为逻辑身份；已归档成员的实际index/pack位置和record digest见同目录chronology-terminal-history.json的event_milestones.durable_source，不应把逻辑ref误作当前独立文件。

| Task | 事件 | UTC recorded_at | 原journal ref |
|---|---|---|---|
| TASK-20260831 | S1 executions | 2026-10-02T19:12:30.902Z | .workflow-system/records/events/key-8dbc66430516b40fcb46fb6dbc50b56f728e81b33b86ae4b9c6ee9a358907955.json |
| TASK-20260831 | S2 executions | 2026-10-02T20:04:55.559Z | .workflow-system/records/events/key-5f905bc784d5c8156da8bd91a6a9029ea02f7a52389aa6e88dab9d67b85aebf9.json |
| TASK-20260831 | S3 executions | 2026-10-03T09:16:00.510Z | .workflow-system/records/events/key-2ca151f99db0ae2a1a48fe59ab4e8df4faf81bf2e36b8bba846d07f813d691af.json |
| TASK-20260831 | S4 executions | 2026-10-03T18:44:04.581Z | .workflow-system/records/events/key-80adab6cdb9d564d9c2d729f2e0415a0b66e64d0871efb83c8bc599215602030.json |
| TASK-20260831 | S4 executions | 2026-10-03T19:07:11.090Z | .workflow-system/records/events/key-8c69801a7b6a494d76648900f9090141231eb2f63462fc5966ab2f67eab2e8e4.json |
| TASK-20260831 | S5 executions | 2026-10-04T09:48:55.768Z | .workflow-system/records/events/key-26ddca1b4078a7ec73313b6c7dc8a8cc45d37592dbadb757bf18a01a0e7b3332.json |
| TASK-20260831 | S5 executions | 2026-10-04T10:13:48.927Z | .workflow-system/records/events/key-e6906d8b7bdeaf575fab4a136ea2f140c1c238f18a6f24c4c6b46f48fea716ac.json |
| TASK-20260831 | S6 executions | 2026-10-04T15:51:24.037Z | .workflow-system/records/events/key-239872f59e75b6579bac30729f9c7afe739a9ead35939b93fd367d560e03a234.json |
| TASK-20260831 |  dispositions | 2026-10-04T16:10:14.785Z | .workflow-system/records/events/key-8464c4002ea41b1b57974aaf26a47b116e56a5f8f029fc6e7fc0074df0158a68.json |
| TASK-20260832 | S1 executions | 2026-10-04T19:08:12.381Z | .workflow-system/records/events/key-857c88fe513282c2114ba4795cbdbc79b11b873e410d8821b987100ae6fe0bba.json |
| TASK-20260832 | S1 executions | 2026-10-05T04:57:26.893Z | .workflow-system/records/events/key-248acd0c7d34961431c8c987339c07919fbf316b12d5d8bcca70cb2061cf37d2.json |
| TASK-20260832 | S2 executions | 2026-10-05T05:52:07.395Z | .workflow-system/records/events/key-b16597f8fef0ad14ea72f51db11ed6fd6e8676496e0c2ffe63caf7e9f2e6c32b.json |
| TASK-20260832 | S2 executions | 2026-10-05T05:59:14.160Z | .workflow-system/records/events/key-56e67631043abd0af05fa6ce1c8852e2df1e9564c7e919d6233879194db06cd0.json |
| TASK-20260833 | S1 executions | 2026-10-05T07:29:40.495Z | .workflow-system/records/events/key-1a020f3fadcb0c89b7dfff30169fd074ba05d1124e5665544e7d3ff8d5c5e580.json |
| TASK-20260833 | S1 executions | 2026-10-05T09:32:26.519Z | .workflow-system/records/events/key-e09204c58ed58bd6aecafaedfad8ca34ea6a9e40b7921851c9a0cb10026f5933.json |
| TASK-20260833 | S2 executions | 2026-10-05T11:34:10.947Z | .workflow-system/records/events/key-debf41cd5061f6e5a4a33043db5815bca9513c7396550d5dcfde38bfc5437308.json |
| TASK-20260833 | S3 executions | 2026-10-05T18:55:32.494Z | .workflow-system/records/events/key-133d6c3b6cac6f1b6a502ab2dc2c76c61e198c19ee1324bda700d90326895382.json |
| TASK-20260833 | S4 executions | 2026-10-06T07:09:13.635Z | .workflow-system/records/events/key-704dc7f71fb9b413ceb4f206154c8a7ff9b109823a12239d2b51e883368c263c.json |
| TASK-20260833 | S4 executions | 2026-10-06T10:48:21.333Z | .workflow-system/records/events/key-fe2ea2e3cfa3398d95d7b34abe90be165036f95737eec18f5a0a04e473e120ca.json |
| TASK-20260833 | S5 executions | 2026-10-06T12:21:47.221Z | .workflow-system/records/events/key-9066ef26e085cf17840f5df83f588e75059cfb580f6f650d8dc9ef8c6c41fd18.json |
| TASK-20260833 |  dispositions | 2026-10-06T16:10:36.692Z | .workflow-system/records/events/key-ab2831b4bfe6fc017ff681204a3c80c98b0216a9dd0dfa09f10941a255856861.json |
| TASK-20260832 | S2 S2-finish-resumption | 2026-10-06T17:03:19.242Z | .workflow-system/records/events/key-1bf17b543f6a0cd77feda64b334a08e4202b0963e8580459b73c22ab08cb69bf.json |
| TASK-20260832 | S3 executions | 2026-10-06T18:07:00.822Z | .workflow-system/records/events/key-caa4ad2a4c543fcbac91cd3b4183dce7bc2022a20a522b3016dd59dce2b6ed35.json |
| TASK-20260832 | S3 executions | 2026-10-06T18:21:46.932Z | .workflow-system/records/events/key-84446cf3e9320397d5eb4b52002da9f98e6a9f12733127705641dff1bcf90f29.json |
| TASK-20260832 | S4 executions | 2026-10-06T18:50:46.365Z | .workflow-system/records/events/key-8ddef1358f673636db8e4923d31b087c504694e05340b8cb94dd2e0757671df0.json |
| TASK-20260832 | S5 executions | 2026-10-07T04:43:16.742Z | .workflow-system/records/events/key-abe07ca136dfe6172d3e6ab2c443d5b54c5d7ef66e0c571b228a5cebb25ad16b.json |
| TASK-20260832 | S5 executions | 2026-10-07T16:22:57.385Z | .workflow-system/records/events/key-19dd68e045a40e76c03d34046984656965a34d4f21ce22b7c7b5a41a3693f51c.json |
| TASK-20260832 | S5 executions | 2026-10-07T16:50:56.041Z | .workflow-system/records/events/key-d0b8dc2e154ae495d2861d6b345314a0f56fc0c50b8709819f3208d1620f4517.json |
| TASK-20260832 | S6 executions | 2026-10-07T18:11:26.943Z | .workflow-system/records/events/key-29fa58717d0180fac733d3b4915b441a270f74cdf061ae1599b668532c01903d.json |
| TASK-20260832 |  dispositions | 2026-10-08T07:06:14.461Z | .workflow-system/records/events/key-10d87e3cd143d897104386e51c4d8dc8cf171e4e5d4c73f26bfc589438fa3e62.json |
| TASK-20260868 |  adopt | 2026-10-13T03:23:30.705Z | .workflow-system/records/events/key-d1ee8fb9ad2e21aa91b9cf8924de34f5248b473137cd1012139ca74339ac5de3.json |
| TASK-20260868 | S1 execution | 2026-10-13T03:39:31.787Z | .workflow-system/records/events/key-d682e8cde9d718b9237711ef5257adf8634567baafb5abdf743b5188616d05ac.json |
| TASK-20260868 | S1 execution | 2026-10-13T04:00:13.956Z | .workflow-system/records/events/key-4982538c28e0d517c1d5ab134ef9194f6641446af34f4e3f2dcd33ab63a0a78a.json |
| TASK-20260868 | S1 execution | 2026-10-13T04:24:29.770Z | .workflow-system/records/events/key-d2e0e494ca0692c884e4ee2f343b54e455c2ff19f9814357dcc42853faaabaf5.json |
| TASK-20260868 | S1 step | 2026-10-13T04:32:09.374Z | .workflow-system/records/events/key-1cd6ae910b69747e671b0169ba6c32add3d123e4bbc262c5033d40754ecf12e1.json |
| TASK-20260868 | S2 execution | 2026-10-13T04:45:40.680Z | .workflow-system/records/events/key-600cc7c9dece1f1555e240abc5943c12341f12f9ca1e3af573b4a282383d500c.json |
| TASK-20260868 | S2 step | 2026-10-13T06:17:58.784Z | .workflow-system/records/events/key-df630f31fe0492b9861c72f857d496640df9d4237d307aabf62834cc6c2fdaab.json |
| TASK-20260868 | S3 execution | 2026-10-13T06:50:18.671Z | .workflow-system/records/events/key-556f7c4d54a22b94d2657fd6f7a04d0165adb42ea3586e128bdf67960717f371.json |
| TASK-20260868 | S3 step | 2026-10-13T07:15:08.295Z | .workflow-system/records/events/key-b31468df5c6f964ca7e184af4655638cc03e81334e4bb91c543fcce6eba4c5bd.json |
| TASK-20260868 |  close | 2026-10-13T07:25:17.601Z | .workflow-system/records/events/key-dd98bdeedf29d71c36dbc48dc774837f36555aea1f882afe36defcb5cc571068.json |
