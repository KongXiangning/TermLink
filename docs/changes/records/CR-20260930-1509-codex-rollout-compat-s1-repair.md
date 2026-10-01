---
title: Rust rollout compatibility S1 repair: payload envelope
status: draft
record_id: CR-20260930-1509-codex-rollout-compat-s1-repair
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-09-30
source_of_truth: code
related_code: [native/codex-rollout-compat-spike/src/lib.rs, native/codex-rollout-compat-spike/vendor/codex/history/src/rollout_payload.rs, native/codex-rollout-compat-spike/vendor/codex/history/src/tests.rs, native/codex-rollout-compat-spike/fixtures/token-usage-record.jsonl, native/codex-rollout-compat-spike/fixtures/token-usage-record-malformed.jsonl]
related_docs: [docs/codex/codex-rollout-collector-architecture.md, docs/changes/records/CR-20260930-1441-codex-rollout-compat-s1.md, docs/workflow/CURRENT_TASK.md]
---

# CR-20260930-1509-codex-rollout-compat-s1-repair

## 1. 变更意图（Compact Summary）

- 背景：S1-R1（P1）复审确认，原始 wire 和正向夹具错误地使用外层字段，实际 host 的 21 条 token_usage_record 均将五个字符串绑定和三个 native usage carrier 放在 payload 内。原始补丁会产生 missing field thread_id，原始测试通过不证明真实兼容成立。
- 目标：在已采纳计划 S1 的 Rust Spike 范围内修正 envelope、夹具、往返序列化及 fail-closed 验证；不以类型名跳过 payload 校验。
- 本次边界：不提升到正式 collector，不修改 Adapter、Node、Android、IPC、运行服务或部署，不提交 Git。Task 005 仍 paused、S2 验收未通过。

本批覆盖计划项：S1.1–S1.4 中与 S1-R1 相关的真实结构冻结、wire 转换、正负向测试和同输入 A/B 修复。当前实施结果待新 subject 的变更审查；不标记 S1 finished，不执行 S2/S3。采用已采纳的 Assistance journal 计划，未修改历史产品 PLAN 或主线 REQ 状态。

## 2. 实施内容（What changed）

1. RolloutItemWire 的 TokenUsageRecord 改为 payload: Cow<TokenUsageRecord>；借用序列化和 owned 反序列化均保留该 envelope，复用原有 Codex TokenUsage 类型及必填字段。
2. 正向 fixture 使用真实 payload 结构；原有 parser 测试增加原生 RolloutLine 的完整 JSON 往返检查和三个 usage carrier 读值检查。负向 fixture 使用其他 carrier 有效的缺失 usage、usage 错误类型、旧扁平结构；现有负向测试逐条要求失败并验证错误原因。
3. 修正 vendored history 的两项测试源代码，保留 payload round-trip 与缺 usage 语义。Spike root 的 7 项测试实际运行，其中直接覆盖 native serde 路径；vendored history 独立测试包未单独执行，不把 dependency tests 计入 7 项结果。
4. 更新两个 README，明确实际 envelope 和正式 Adapter 尚未实施；原始 CR 增加真实补充结论并纠正原始结构／运行时声明，保留旧命令结果。旧 journal 执行和 needs-revision 审查不改写为通过。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：related_code 中的 Spike wire、现有测试和两份 fixture；两个 Spike README；原始 CR 的补充说明及本 CR。
- 模块：Spike 原生 history persistence boundary；不改变 reader 的 range/append、source binding 或 lineage，不改变 vendor upstream revision、closure、manifest patch 清单和 Cargo.lock。
- 运行时行为：合法 payload-wrapped token_usage_record 可被 Spike 解析并以相同 native envelope 输出。缺必填字段、错误类型、无 payload 的扁平结构仍不输出记录；既有 event_msg/token_count 可解析。尚无正式 AnalysisEvent、canonical backfill、产品发布或 App 验收结论。

## 4. 回滚方案（命令级）

本批尚未提交，commit_ref=TBD。定点撤销时按本批文件和前一审查记录的 subject hashes 对照恢复，仅撤销 repair 的变更；禁止 broad reset/checkout 或回滚其他会话改动。首次失败测试的输入摘要及两份旧 fixture 副本保存在本轮任务私有报告目录，可辅助对照。提交后仅针对实际 commit 使用 git revert。

## 5. 验证记录（Tests/Checks）

- 构建环境：既有任务私有根 C:/Users/kongx/AppData/Local/Temp/termlink-task-20260830-s1-20260930；Spike、Demo 分别使用 cargo/spike、cargo/demo 的 CARGO_TARGET_DIR，profile=debug。本轮新报告目录 s1-repair-TEPQpK，不覆盖旧报告。Spike 增量重编译当前输入；Demo 源码不变，重新执行 locked build 复用有效缓存，没有重跑其旧 26 项测试。
- cargo test --locked --manifest-path native/codex-rollout-compat-spike/Cargo.toml：最终 7 passed / 0 failed；首次编译因测试 expect_err 要求 RolloutLine: Debug 而失败，已改为显式 match，原失败日志和后续成功日志均保留。
- cargo build --locked --manifest-path native/codex-rollout-compat-spike/Cargo.toml：通过；新 Spike EXE SHA256=2ca5cb66eda8f176ee00752eaf5abd23d100ae915571e58c9d7c0c7fdf38f3ff，613855756 bytes。
- cargo build --locked --manifest-path native/codex-rollout-demo/Cargo.toml --bin codex-rollout-demo：通过；Demo EXE SHA256=fc6995f5de2f5271c9f35a2da5a78629965cb3b85f265ba4ff9c2513602946f2，44842953 bytes。
- 正向 CLI：2 valid / 2 emitted / 0 parse errors，输出 native envelope 与输入 JSON 相同；负向 CLI：0 valid / 0 emitted / 3 parse errors。
- 同一历史审查反例（SHA256=674c840013ba294b5f0a75b1528a86f047d162244c55933b9805bb7168bb06d1）在新 EXE 中为 1 valid / 1 emitted / 0 parse errors。旧扁平控制输入现为 0 valid / 1 parse error：missing field payload。
- 同输入真实 Demo/Spike A/B：共同 fixture 3714 bytes，SHA256=0933c505c2331b525e7d52cfee574acee3c88761455121ced60b93ffe63afa29。Demo 14 valid / 0 parse errors，Spike 13 valid / 1 显式 future_rollout_variant 错误。stable projection 比较通过：2 turns、8 items、相同 item keys、可见内容、tool IDs/输出 hash、plan 和 usage（70/120）。原生 provenance、rate-limit 可选字段和 task_outcome provisional 差异保持明确，不被抹平；这不是 canonical complete 证明。
- 固定 source 只读键／类型核对：SHA256=0deda040fde81d23c5a662cd6296080701a43e76ccb049a8490930f084bd9a6e，1303231 bytes / 227 records；21 条 token records 均为 payload envelope、五个 binding 均为 string、三个 usage carrier 均含六个 number 字段。不保存真实正文或 binding 值，不执行正式 source backfill。
- 格式／差异检查：Spike cargo fmt --check、两份修改的 vendor 文件 rustfmt --edition 2024 --check、限定本批路径的 git diff --check 均为 exit 0；仅有仓库既有 LF/CRLF 提示。两份 CR 的 strict 格式校验通过，完整命令与日志在执行记录中关联。
- REQ 格式检查：Windows PowerShell 5 默认编码首次误报缺字段；使用 PowerShell 7 / UTF-8 读取后通过，未修改 REQ 内容。新 CR 以 UTF-8 保存。
- 完整命令、stdout/stderr、输入／产物 hash 和 CLI 比较摘要位于本轮任务私有报告目录的 build-ledger.json、build-inputs.json、build-artifacts.json、cli-ledger.json、cli-summary.json 和 source-shape.json。

## 6. 后续修改入口（How to continue）

- 对新 S1 execution 做 review-change，明确 S1-R1 是否已修复；本批实施自检不是正式或独立审查。
- 在完成适用审查和 S1 disposition 后，按已采纳计划进入 S2 的相同 wire patch 提升、Adapter developer 隐藏内容及 vendor parity guard；S3 再验证正式 target canonical/backfill。
- 原始实现及审查结论的历史记录保留，不刷新 Task 004 的旧报告，不恢复 Task 005。

## 7. 风险与注意事项

1. 本批只证明 Spike 的 native envelope 兼容，不能据此认定整个 Rust 修复、Node 历史发布或 Android 首屏／ACK 已通过。
2. 未做 formal collector、Node、Android、IPC、真实宿主联调或部署；developer 语义仍属于未开始的 S2。
3. CR 保持 draft / TBD；既有未关联管理记录保留，不猜测其归属。
