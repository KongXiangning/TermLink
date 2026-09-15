---
title: 当前 Rust 业务测试执行 S2
status: draft
record_id: CR-20260914-rust-issues-audit-s2
req_id: TASK-001
task_id: "001"
step_id: S2
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-09-14
source_of_truth: audit-evidence
related_code:
  - native/codex-rollout-collector/tests/business_history_audit.rs
  - native/codex-rollout-collector/tests/support/run_business_history_audit.cjs
related_docs:
  - docs/codex/codex-rollout-collector-business-test-matrix.md
  - docs/codex/codex-rollout-collector-rust-issues-verification.md
---

# 当前 Rust 业务测试执行 S2

## R5执行：完整采集完成（审计通过，产品未通过）

冻结runner已完成构建、32例枚举、逐例执行和既有回归：19例通过，13例为业务差异（R01、R02、R04、R05、R06、R07、R08、R09、R11、R13、R14、R15、R29）；conformance 31/31和stage4_target_protocol 70/70均通过。`collectionPass=true`只表示审计采集完整，`productPass=false`保留业务差异，不据此认领产品通过、完整矩阵覆盖或九项问题成立。当前测试哈希为`cda39c250ebe65c21381e3a279d57aac98a2dbbc2160113f507f0c98d88ae3f6`，runner哈希为`2a2136953480112dea53bd44cf19c7caf0c58059b47f97e8c9f19cf6557426a1`。当前report.json及旧attempt都在OS TEMP/termlink-rust-issues-audit/current及其`attempts`归档；六项意见仍待独立核查，未推进S3/S4。证据caller-reported。

## R5上一轮历史尝试：测试代码编译失败

保持32例及两资产，处理ordinal 0的精确descriptor边界分支、独立阶段继续和未执行限制分类，保留真实记录，不修产品。构建出现E0283（business_history_audit.rs:409，collect集合类型无法推断），runner退出1，collectionPass=false；32例和101旧回归均未开始。该编译错误由本轮测试修改引入，不属于业务差异。遵循execute-step意外失败停止条件，保留修改与OS TEMP原始构建日志，不宣称S2完成或六项意见解决。未运行Gemini，未推进S3/S4。证据caller-reported。

补正R4措辞：target DATA允许ordinal 0，旧formal要求正数，不能笼统认定fixture非法；问题在于测试未处理已定位的层间拒绝并unwrap中断。保留R4原始失败及更早历史。

## R4历史执行：内部fixture前置失败

保留32例和两测试资产，本轮修正公共preview/backfill请求与新意图job，接入真实内部分窗、Adapter状态恢复、window重读和promotion；加入多差异采集、缺失对象保护及半行checkpoint边界修正。以上修改尚未完成验证。

runner构建与枚举通过；R01记录complete业务差异，R02在SegmentDescriptor::from_records处因ordinal范围含0报InvalidRolloutOrdinalRange，未分类panic令入口退出1、collectionPass=false。本轮R02公共阶段、R03–R32和101旧回归均未到达。该输入/formal边界失败不得算产品缺陷；按execute-step停止条件记录blocked，未运行Gemini或修改产品源码。历史attempt保留，当前原始日志仍在OS TEMP/termlink-rust-issues-audit/current。证据caller-reported。

## repair第1轮历史：未完成验证

针对六项已登记finding修改现有两测试资产，没有增加case或修改产品。多batch消费、跨窗输入、snapshot增长时序、精确字段/lineage/恢复断言及错误分类已修改，尚未验证完成，不标记finding已解决。

计划runner构建及32例枚举通过；R01记录complete业务差异，R02在preview精确[U4,A4]之后，测试发送Backfill前因`cursor must match persisted_anchor.cursor`失败。此为本轮helper输入错误，runner退出1并collectionPass=false；R03–R32及101旧回归本轮未运行。依据execute-step意外验证失败停止条件记录blocked，非环境重试，不以错误请求认定产品缺陷。原始输出在OS TEMP/termlink-rust-issues-audit/current；旧结果归档attempts。证据caller-reported。

下文为R4、repair第1轮及修复前历史结果，只适用于各自记录hash；当前资产以本CR开头的19通过/13业务差异为准，不可沿用21通过/11差异作为验证结论。

## 修复前实施记录

依据重规划实施32个命名Rust业务执行数据例（20场景+12预算参数），并创建可重跑审计入口。真实合成JSONL经过vendored wire校验、source/Adapter/target及必要stdio进程。未改Rust产品src/vendor、Node/DB/App或Gemini，未提交/推送。

最终当前32例：21通过、11差异待核查；实际到达59断言，48符合、11不符。旧conformance 31与stage4_target_protocol 70全部通过。运行器最终退出0仅证明完整采集，不证明业务全绿。失败case后续断言未到达，矩阵99主场景逐项标明Rust关联或未执行；I组保留策略和其他未选变体不伪称覆盖。

执行中纠正测试自身carrier/cursor、CommandExecution cwd URI和PlanUpdate字段。两次fixture格式错误真实令入口退出1；保留于临时attempts归档，不算业务缺陷。最终源码哈希、32例expected/actual和输入hash持久化在执行报告。新增fixture decode校验及失败分类，普通cargo业务失败仍退出101，无ignore/should_panic。

验证入口：
```powershell
node native/codex-rollout-collector/tests/support/run_business_history_audit.cjs --output "$env:TEMP/termlink-rust-issues-audit/current"
git diff --check -- . ':(exclude)docs/workflow/CURRENT_TASK.md'
git -c core.whitespace=-blank-at-eof diff --check -- docs/workflow/CURRENT_TASK.md
git status --short
```

构建使用--locked及OS TEMP target-dir；日志、运行输入均在OS TEMP，生成器和关键证据留仓库。两条空白检查通过，CURRENT_TASK末尾空行例外保留，LF/CRLF提示不是失败。所有证据为caller-reported，等待独立review-change。

S3九项问题核实和S4 Gemini静态复用评估未提前实施。11执行差异不等于11缺陷，也不等于九项均已确认；实际修复与完整Node/DB/App测试仍后置。S1完成/clean审核与旧CR保留，不从头重做。
