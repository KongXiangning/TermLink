# TASK-001 一次性审计任务恢复记录

> 更正：下文第一次恢复使用 fd673e6d，仅恢复了后期部分定义，不能作为完整恢复成功的结论。以文末“第二次完整基线恢复”及其验证结果为准；第一次操作记录保留。

## 授权与备份

- 授权来源：conversation:current-task-runtime-state-restoration/user-message:2026-09-15:允许本次有备份、有差异审查的一次性直接修复
- 原审计 Git 基线：fd673e6deab766c3f042a45032ee0fd7c3515f86；S2 5285ec205b91ac56838679651819c6b7aef87e81；S1 c1b512da。
- 修复前 CURRENT_TASK SHA-256：726f9a9615556133cbc0bea56ca8f6b0a89a4dc0729d7bf79cbffef9b87a0177
- 修复前 Task Basis SHA-256：1df2f2d2501bd54bcc6497eeb8b6b39cd1570d9b5a53b388c9d00c7eaed6d8e9
- 精确字节备份：C:/Users/kongx/AppData/Local/Temp/termlink-audit-restore-46d045e3df2748e4a41ecd8e8e2949ee/CURRENT_TASK.before.md 和 TASK_BASIS-001.before.md。备份含撤出的完整实施定义及全部证据槽。
- 原审计 plan revision：b63cf2cb7e47b9f873da11f95bed29790b1b2eac8cda7f971e35d0764a67e5c2
- 被撤出实施 plan revision：9adcc7e080dabd03469d3f077a87ab55ee9ce4a0e913871bfded5a318598aa67
- 恢复审计 plan revision：e3b4ac90e3d1521b90b8e684c0ceb5cffc382449f0b2c6fb6e72925aaa57acc2
- 恢复 Task Basis revision：9c15298c439e2bc14575a0503ac57914685c8fb41695624af3004c6a57da03ab

## 语义差异与状态

保留 TASK-001 身份。从 Git 选择恢复审计定义，保留当前完整 execution_log、findings、applied_proposals、step_attempts、review_cycle、review_coverage 和正文执行记录，不整份回退。S1 矩阵及 S2/S3 完成事实保留；S3 后续五项证据争议需重新核实。步骤顺序为历史 S2、历史 S3、当前 S3-R1、待执行 S4。S3-R1 和 S4 均需要独立审核。

正常写入范围恢复为原六份审计文档，Persistent Tests=none，Rust/Node/IPC/Android/DB/测试源码及契约不获修改权限。本记录和 Task Basis/CURRENT_TASK 仅由本次用户明确的一次性修复授权写入。

## 未完成义务映射

| 原义务 | 恢复后的处理 |
| --- | --- |
| AUD-S2-CURRENT-RUN / S2-RUNNER-COLLECTION | S2 完成历史保留；S3-R1 使用原 check 重跑取得新报告，禁止给旧报告换版本冒充新证据。 |
| AUD-S2-EVIDENCE-RECONCILIATION / S2-CROSS-DOCUMENT-STATE | S3-R1 重新核对三个文档，保留失败和旧报告。 |
| AUD-S3-NINE-ISSUES / S3-ISSUE-CLASSIFICATION | S3-R1 新 check S3-CLASSIFICATION-RESTORED-001 复核九项及五项后续争议；旧 S3-CLASSIFICATION-001 及报告保留在执行日志。 |
| AUD-S4-GEMINI-REUSE / S4-STATIC-REUSE-ASSESSMENT | 原 S4 原样保持未完成；只静态评估，不能执行 Gemini。 |
| C-R004 / r004-rule、r004-public-test | Backfill 修复及公共协议测试未完成；S3-R1 核实问题，S4 评估候选；实际实施留待后续独立授权。 |
| C-R008 / r008-target-test | 目标事件证据映射、脱敏 fixture 和测试未完成；本次仅复核证据和复用，不声称修复。 |
| C-R009 / r009-rule、r009-target-test | 子代理关系证据映射、最小字段和测试未完成；本次仅复核，调度/级联仍后置。 |
| C-AUDIT / audit-docs | 保留 RUST-004/005/007/008/009 复核义务；本次更正审计文档，契约/registry/修复 CR 更新依赖未来实施。 |
| 六条 deferred findings | 原 fingerprint、状态、次数和证据完整保留；测试缺口未被本次恢复解决，不作为产品通过证据。 |

后续 supersede/replan 关于五项生产证据的文字是历史记录，不能替代原始附件或新验证。原附件不可得时明确记录证据不足；不得虚构生产样本内容。原失败、13 项业务差异、未到达断言和未执行 Node/DB/App 验证均保留。

## 核对方式

修复脚本比较七组运行态对象与修复前对象完全一致，并比较 Task Basis 原始请求及既有用户决定完全一致。审查本次差异并使用现有 Runtime validate / validate-contract / evidence-context 校验；结果以下续记录为准，本文不预先声明通过。

## 核对结果与恢复正常执行

- 已审查本次恢复与审计文档差异；git diff --check 通过。
- Runtime 0.19.3 的 validate、validate-contract、evidence-context 均通过；Task Basis 文件哈希与链接一致，恢复计划哈希重新计算一致。
- initialize-preservation 成功：Runtime 保存恢复后的 CURRENT_TASK/Basis 精确快照，设置 task_evolution_version=2。历史包为 docs/workflow/task-history/doc-87ea7576bc76f5782bea891f/b616e1889f98c959526cecbdd29070d0528ade2006f7cdf54765d8fb6f21f356.json。
- 普通 preflight-step 与 record-step-result 成功。S3-R1 运行现有审计：32 例，19 通过、13 业务差异，101 既有回归通过，collectionPass=true、productPass=false；更正记录见核实文档 §9。
- 最终保留检查通过：原 30 条执行日志、72 个 applied proposals 均是当前数组未改动的前缀；12 条 findings 及 review_cycle 原样保留；原始请求及既有用户决定原样保留。正常执行新增的状态与证据由 Runtime 写入。
- git diff 在 native/src/android/public/tests 范围为空。预先存在的 Runtime/skills 修改未由本次改动。
- 当前 S3-R1 状态 in-progress，已提交实施结果，等待 required 独立 review-change；S4 未开始。本记录的差异核对是作者核对，不替代独立审核。evidence_assurance=caller-reported。

## 第二次完整基线恢复（2026-09-15）

- 用户当前指令：开始实施修复。沿用已明确的一次性备份/差异审查授权。
- 基线：c1b512da39580b7efd1755b720933ccd6add4286，不再用 fd673e6d 剩余计划代替原任务。
- 本轮精确备份：C:/Users/kongx/AppData/Local/Temp/termlink-full-plan-restore-32f9fbf1d97d4d08a0fef99e723eb062；CURRENT_TASK、Task Basis、原恢复记录均已备份。
- 修改前 CURRENT_TASK SHA-256：6237f23303cdefd5f269dd2e91e47b4f3adf25d93a4eb22464517e6c4eb70c04；修改前 Task Basis：9c15298c439e2bc14575a0503ac57914685c8fb41695624af3004c6a57da03ab。
- 新计划 revision：8a0718ba954f1062eeddfdd9155863a57ea5c1ccd9a345f9f0d0480dd3d6045b；新 Task Basis revision：e941ea21d9504ad2a1bf7aac26af9eb46f8fc8656f40af00d1f4a150cb2cf1b1。

| 原义务 | 当前位置与处理 |
| --- | --- |
| 原 S1 完整 App 业务矩阵与详细证据要求 | 完整恢复 S1 实现方案、purpose、required_evidence、review_checkpoint 和原只读命令；已完成历史不重做。新增 AUD-S1-BUSINESS-MATRIX 槽在 S3-R1 复核已有矩阵，缺口如实记录。 |
| 原 S2 当前 Rust 独立核查、数据断言、App 影响 | 当前 S2 执行与 S3 分类共同承接；恢复场景→断言→观测→契约→App 影响要求。已授权持久化测试替代旧临时 harness，32 例及失败保留，不恢复旧脚本命令。 |
| 原 S3 Gemini 复用 | 当前 S4；恢复候选 commits、前置依赖、混合 hunks、配置变化、契约/测试影响、九项对账。用户取消动态对照，明确未验证，不执行 Gemini。 |
| 后续反证 | S3-R1 是同一审计的纠错，不替代整个任务；原完成事实与被挑战结论分开。 |
| 错误转入的业务实施计划 | 仍见上文 C-R004/C-R008/C-R009/C-AUDIT 未完成映射及第一次备份；不获本次执行权限。 |
| 所有历史运行、失败、findings、proposal、attempt、review | 与本轮备份逐对象完全一致，不压缩或清空。正文历史保留并追加本次说明。 |

本轮改变了验收定义，前次报告保留原 result_id 和原 plan revision 于历史执行记录/备份，不把它们重新盖成新计划通过。当前五个证据槽设为 missing；S3-R1 保持 in-progress，待新版本最小必要证据及独立审查，S4 仍未完成。本轮没有消费旧 clean 审查或推进步骤。

恢复范围仅三个治理文档；既有业务/测试源码、审计报告和用户 Runtime/技能改动均不变。Runtime 校验只是结构与版本验证；上述逐义务映射是另外的语义验收，二者不能互相替代。

### 执行关联收尾

- 为兑现原“后续证据可纠正早期报告”的义务，S3-R1 可纠正 S1 CR；S4 保留全部既有矩阵/报告/CR 的文档修正范围，不增加业务权限。
- 最终计划 revision：16a7fb6b409916cb35f8e53fb2129b6a2139437abd2ffc04eb27fe4d0c156dcf。
- 原 S3-R1 ledger revision e3b4ac90e3d1521b90b8e684c0ceb5cffc382449f0b2c6fb6e72925aaa57acc2 与 implemented attempt attempt-479f661f23221629b63cebcf37326c4b0a74a5c7 保存在本轮原始备份和执行日志；旧 attempt 对象不变。ledger 切至当前版本，仅追加新 ready attempt attempt-1cf091c7e3b9a90792ff78d875e0bc92a8b13f60，未伪造重试失败或验证通过，三次预算不重置。
- 当前任务保持 S3-R1 in-progress；新尝试必须经 Runtime preflight 和新版本证据记录。旧报告不能用来完成本版本。

### 本轮核对结果

- 原 S1 实施步骤逐字比对通过；原 S2 → 当前 S2/S3/纠错、原 S3 → S4 的目的和证据义务已逐项映射，取消的 Gemini 动态执行未恢复。
- 本轮备份中的 31 条执行记录、12 条 findings、74 条 applied proposals 完整保留；旧 S3-R1 attempt 对象不变，旧三个报告 result_id 仍在 execution_log。Runtime 新增的 preflight 提案是追加记录。
- 原始 Task Basis 请求及已有用户决定逐对象一致；只追加本次“开始实施修复”，引用 SHA-256 校验通过。
- 当前定义与 evidence_plan_revision、当前 attempt ledger 版本一致；Runtime validate、validate-contract、evidence-context 均通过。
- Runtime preflight-step 已通过并 read_back_verified=true；新 attempt-1cf091c7e3b9a90792ff78d875e0bc92a8b13f60 已为 preflighted，源 revision 为 c000c5361c20c6dd6533040f675553a817f26680983f729dbaa9a2c2e58a839d。
- 修复前后差异已检查；Git 空白检查通过，只有换行格式提示。native/src/android/public/tests 无 Git 差异。本轮没有修改已有审计报告、业务/测试源码或用户 Runtime/技能改动。
- 当前交接：任务定义恢复完成；S3-R1 新版本证据仍待取得和独立审查，S4 尚未执行。没有将整个审计标为完成，也没有自动转为业务修复任务。
