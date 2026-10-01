---
title: Rust rollout S3 repair - canonical informational diagnostics and validation provenance
status: draft
record_id: CR-20260930-1948-codex-rollout-compat-s3-repair
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-09-30
source_of_truth: code
related_code: [native/codex-rollout-collector/src/analysis.rs, native/codex-rollout-collector/src/protocol/target_mapping.rs, native/codex-rollout-collector/tests/stage4_target_protocol.rs]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/codex-rollout-collector-codex-compatibility.md, docs/codex/codex-rollout-collector-architecture.md, docs/changes/records/CR-20260930-1752-codex-rollout-compat-s3.md, docs/changes/records/INDEX.md]
---

# CR-20260930-1948-codex-rollout-compat-s3-repair

## 1. 变更意图（Compact Summary）

- 背景：S3 补充审查 S3-R1 发现 target 将已知 Present diagnostic 误当作不完整，真实 source 因此返回 partial；S3-R2 指出原报告未保存精确 dirty subject、实际 oracle 选择及完整原始日志。
- 目标：修复 target 和 Reducer 中同一兼容判定，保留诊断、不放宽真实缺口的失败语义；独立保存当前源码的构建、回归、固定离线 source 和 ACK 证据。
- 本次边界：用户本轮 `execute-step repair` 授权后进行最小 Rust 修复及本地验收。没有 Node、App、IPC、DB、宿主部署、真机、Git、步骤 finish、正式 review 或 Task 005 恢复。

REQ 及其 linked PLAN 是产品主线与 Android/WebView 后台保活计划，没有本次隔离 Rust 的 checklist。本批同步 adopted Assistance plan 的 S3 execution/test 与 CR/兼容说明，保留 REQ/产品 PLAN 的既有状态，不修改无关计划。原审查和原 execution 是独立历史事实，新修复不将旧报告标为 fresh。

## 2. 实施内容（What changed）

1. `projection_is_canonical` 在 complete、Complete coverage、Present 均成立后，允许所有 diagnostic 的 availability 为 Present；其他 diagnostic 继续拒绝。保留 source/lineage/cursor 的全部安全判断。
2. Reducer 的 `canonical_committed` 使用同样的诊断判断，避免后续不完整 overlap 降级已提交的完整投影。扩展既有 library 回归，检查含 developer hidden diagnostic 的完整投影保持原样。
3. 扩展既有 target process/ACK 回归为 baseline、token、developer、两者组合、未知 role、畸形 token 六个子例；正例必须 canonical/forward_append/完整 checkpoint，负例必须 partial、无 canonical range/append checkpoint。所有子例检查隐藏内容不进入 batch。
4. 构建和测试使用原任务专用 Cargo target 目录作增量编译；本轮成功命令和源码 hash 单独记录，不声称清空缓存或重新证明旧 S3。stage3 显式设置并核对 Demo/Spike 路径、文件 hash、debug profile、成功构建记录及实际选择输出。
5. 对原真实 rollout 只读取并复制固定 bytes 到任务临时 sessions root，使用普通 backfill 和隔离测试端正 ACK；仅记录聚合结果。纠正原 S3 CR 的错误归因，保留其原 partial 结果与 provenance 缺口。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：上述 3 个 Rust 文件、本 CR、兼容说明和原 S3 CR 的追补说明；Assistance journal 保存真实决策和执行/测试事实。
- 模块：formal target projection gate、Reducer canonical commit 与既有进程测试。没有 vendored wire/Adapter 或共享接口变动。
- 运行时行为：已知说明性诊断保留且不再单独降级完整投影；未知或畸形输入仍 partial。真实固定离线 source 从旧执行的 partial 变为本轮 canonical，能提供安全 forward_append checkpoint。

## 4. 回滚方案（命令级）

本批未提交，`commit_ref=TBD`。若以后形成独立提交，使用 `git revert <commit_ref>`；未提交时按本轮 before-subject 和 diff 仅撤回上述判定/回归及文档追补，不使用 broad reset/checkout，不回滚 S1/S2 或其他会话改动。真实外部 rollout 未写入，无需回滚；任务私有副本和日志保留用于复核，不进入产品或 fixture。

## 5. 验证记录（Tests/Checks）

- 执行元数据与原始 stdout/stderr：`C:/Users/kongx/AppData/Local/Temp/termlink-task-20260830-s3-repair-20260930-1946`，随后固定保存到 Assistance evidence。每个 Cargo 命令记录准确 executable/args/cwd、时间/退出码、455 个本地编译/fixture 输入的 hash、环境实际值；运行前后输入未漂移。每次 formal Cargo 前 vendor parity guard 通过。
- 当前源码 `cargo build --locked --manifest-path <各 crate>/Cargo.toml --bin <对应 binary>`：Demo、Spike、formal 全部 exit 0；debug profile。Demo SHA-256=`3713341b2f67f5847d136af7b9af31cadc67657eeb2029b5708cb218e32ec009`，Spike=`f4f21a53f20ed8012c370e9ce10be88d30a9a6846089932c3eac26477990e6c9`，formal=`7250fc4d71518be87a1e32744ea4e63860ba53875b4b3c960c90cb3f70b1fcbb`。目录为旧任务专用 `.../termlink-task-20260830-s3-20260930/cargo/{demo,spike,collector}/debug`；允许增量缓存，与旧报告 freshness 无关。
- `cargo test --locked --manifest-path native/codex-rollout-collector/Cargo.toml --lib analysis::tests::late_incomplete_overlap_cannot_downgrade_canonical_projection -- --exact --nocapture`：1/1 通过。
- 相同 manifest 下 `--test stage4_target_protocol -- --nocapture`：70/70，通过扩展的六子例和既有 ACK/source/restart/fail-closed 回归；`--test conformance -- --nocapture`：33/33，含完整序列化泄漏反例、同 source positions 的正文/tool/item-key/legacy usage 对照；`--test stage3_conformance -- --nocapture`：5/5，stdout/stderr 中实际 Demo/Spike 路径与显式环境一致，hash 与本轮成功构建记录一致。
- 固定真实 source：conversation=`01a0ee04-a775-72b3-bd07-04aac804a3b4`，227 records、1,303,231 bytes，外部文件与隔离副本 before/after SHA-256 均为 `0deda040fde81d23c5a662cd6296080701a43e76ccb049a8490930f084bd9a6e`。
- formal stdio `--startup-config-version 1 --sessions-root <隔离副本根目录>` 普通 backfill：hello、1 batch、1 正 ACK、0 wire error、exit 0。batch complete=true/canonical、projection Complete/Present、129 条 Present diagnostic（token 21、developer 3）、无 UnknownEvent/ParseGap；checkpoint canonical_committed=true、forward_append、complete_source_end=1,303,231。7 个 developer 文本块在完整 batch/complete checkpoint 等 wire 序列化中均未泄漏；保留 21 个 legacy UsageUpdated/RateLimitUpdated。
- 初次离线验证脚本误将 3 条 developer 消息的 7 个文本块断言为 3 个文本块，exit 1，target 尚未启动。修正脚本的 carrier/text-block 分层后独立验证通过；该失败保留，不归因于产品源。
- REQ/CR 严格校验、`git -c core.whitespace=cr-at-eol diff --check`、扩展的 target test 文件 rustfmt check 均通过。`check-doc-sync.ps1` exit 1：其他产品索引关联检查均通过，但没有 active CR；本批未提交，CR 为 draft/TBD，不能为通过该检查伪造 active commit association。检查输出独立保存在本轮 journal。

## 6. 后续修改入口（How to continue）

- 下一步对本轮精确 subject 和证据做 `review-change`；实施者自检不代替正式 review，不 finish S3。
- Task 005 仍 paused/S2 未通过，后续 Node consumer/产品历史发布/App 首屏和 ACK 要独立恢复、实施与验收。

## 7. 风险与注意事项

1. 本轮仅证明隔离 Rust target；正 ACK 的 persisted=true 是测试端协议声明，没有实际 Node 产品库事务或 App ACK。
2. 原 S3、旧 S2 oracle provenance 缺口及 Task 004 四份旧报告 stale 状态保留。新执行不能倒填旧报告 freshness。
3. 未重跑完整 Rust library suite：已有 Windows nested absolute path 断言问题、既有全库格式问题不在本修复范围，继续保留。未运行 Node/Android/IPC/设备/部署验收。
4. CR 维持 draft/TBD，无 Git 提交。既有 deferred unassociated management issue 不猜测归属、不重放业务。
