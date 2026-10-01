---
title: Rust rollout S3-R3 repair - preserve canonical diagnostics across append and restart
status: draft
record_id: CR-20260930-2035-codex-rollout-compat-s3-r3-repair
req_id: REQ-20260309-codex-capability-mvp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-09-30
source_of_truth: code
related_code: [native/codex-rollout-collector/src/analysis.rs, native/codex-rollout-collector/tests/stage4_target_protocol.rs]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/product/plans/PLAN-20260329-codex-background-retention-and-resume.md, docs/codex/codex-rollout-collector-codex-compatibility.md, docs/changes/records/CR-20260930-1948-codex-rollout-compat-s3-repair.md, docs/changes/records/INDEX.md]
---

# CR-20260930-2035-codex-rollout-compat-s3-r3-repair

## 1. 变更意图（Compact Summary）

- 背景：S3-R3 自审发现含已知 Present diagnostic 的 canonical backfill 后，checkpoint 重启执行 append 会清空已提交的诊断；无增长及有增长均能复现。
- 目标：保留 accepted Present diagnostics 的稳定身份和 provenance，验证 canonical 续读、重试和重启的累积投影及 checkpoint；未知/畸形输入和其他安全条件仍 fail-closed。
- 本次边界：用户本轮 `execute-step repair` 授权的隔离 Rust 修复、自检和文档/Assistance 记录；不做正式 review、step finish、Task 005 resume、Git、Node/App/IPC/DB、服务部署或真机操作。

本批覆盖 adopted Assistance plan 的 S3 修复项 S3-R3。REQ 的 linked 产品 PLAN 是 Android/WebView 后台保活与恢复计划，没有本次 Rust checklist；本批同步 S3 execution/test、CR 和兼容说明，保留产品 PLAN 与 REQ 的既有状态，不改写无关计划或主线 done 状态。

## 2. 实施内容（What changed）

1. 完整 canonical batch 不再清空全部 projection diagnostics，而仅清理非 Present 诊断。既有 `seen_event_ids` 和按 item_key 去重逻辑不变，不重置事件去重集合、不改变 source/lineage 或 canonical gate。
2. 扩展既有 Reducer 回归：序列化/恢复 checkpoint 后重放同一 canonical batch、应用空 canonical delta、再应用 late partial overlap，完整投影必须与原提交投影一致。
3. 扩展既有 target process 回归：4 个 canonical 正例各经过无增长 append、增长 token carrier、从旧 anchor 重试增长区间、从最新 checkpoint 再无增长 append；每次使用新进程并正 ACK，验证只交付预期 delta、诊断原值/数量不丢失不重复、checkpoint 诊断一致及安全 forward_append/source end。未知 role、畸形 token 反例继续 partial。
4. 当前 inputs/profile 下增量构建 Demo/Spike/formal；正式 Cargo 前逐次执行 vendor parity guard。保存实际 oracle 环境/选择、原始 stdout/stderr、输入 hash 和成功构建记录；不倒填旧报告 freshness。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`src/analysis.rs`、`tests/stage4_target_protocol.rs`、兼容说明与本 CR；Assistance journal 保存真实决策、execution/test。
- 模块：隔离 formal Reducer 诊断生命周期及既有进程回归；没有 vendor、Adapter、target mapping、共享契约或产品接口修改。
- 运行时行为：已知说明性诊断可以随累积投影和 checkpoint 跨 canonical append/restart/retry 保留；旧的未知/partial 处理、安全 cursor 和 ACK gate 不变。

## 4. 回滚方案（命令级）

本批尚未提交，`commit_ref=TBD`。未来若形成独立提交，可用 `git revert <commit_ref>`；未提交时仅按本轮 before-subject 与 diff 撤回 retain-Present 分支、新增回归及文档，不 broad reset/checkout，不撤回前轮 S3 修复或其他会话改动。外部真实 rollout 未写入，任务私有副本不进入仓库 fixture 或产品。

## 5. 验证记录（Tests/Checks）

- 元数据/日志根：`C:/Users/kongx/AppData/Local/Temp/termlink-task-20260830-s3-r3-repair-20260930`，实际源码和输出随后固定到 Assistance journal。455 个本地 compiler/fixture 输入的 digest=`a643250e70eae47f12853d5307eb93ed600c3db0310b1fa9fbae5113ffb7f7ad`，各次 Cargo 前后未漂移；每次 formal Cargo 前 vendor parity exit 0。
- Demo/Spike/formal `cargo build --locked --manifest-path <对应 crate>/Cargo.toml --bin <对应 binary>` exit 0，debug profile、各自任务专用 `cargo/{demo,spike,collector}` 增量目录。Demo SHA-256=`3713341b2f67f5847d136af7b9af31cadc67657eeb2029b5708cb218e32ec009`；Spike=`f4f21a53f20ed8012c370e9ce10be88d30a9a6846089932c3eac26477990e6c9`；formal=`c06c4ef666ead758a343f10df9ee0460d80c75f36a7eeac1ef538f705141d402`。
- formal manifest 下 `cargo test --locked --lib analysis::tests:: -- --nocapture`：9/9；`--test stage4_target_protocol -- --nocapture`：70/70；`--test conformance -- --nocapture`：33/33；显式 Demo/Spike 路径 `--test stage3_conformance -- --nocapture`：5/5。原始 selector/命令和实际选择输出均保存。全 library suite 未运行，原 Windows nested absolute path 断言问题保留。
- 原 S3-R3 失败反例的相同合成 source bytes/hash 在当前 EXE 下复验：initial 2 条诊断，无增长 append 后仍 2 条，有增长 append 后仍 2 条，projection/checkpoint 均保留原稳定 keys；3 个新进程各 exit 0、canonical、forward_append、1 正 ACK，保留性断言 exit 0。原失败报告保持原样。
- 固定真实只读副本：227 physical records、1,303,231 bytes，SHA-256=`0deda040fde81d23c5a662cd6296080701a43e76ccb049a8490930f084bd9a6e`。backfill 后新进程用 checkpoint 执行无增长 append，两次均 completed/canonical、forward_append、complete_source_end=1,303,231；诊断均 129 条 Present，稳定 keys 与完整 projection SHA-256 不变，checkpoint 同样保留 129 条。首批 269 个派生 AnalysisEvent，续读 0 个，7 个 developer 文本块无 wire 泄漏；2 个正 ACK 均来自隔离测试端，没有产品库事务。
- 一次性真实验证脚本首次误把 227 physical records 断言为 227 个派生事件，实际为 269，wrapper exit 1；两次 target process 本身均 exit 0 且诊断保留成立。初版脚本和失败报告固定保留；修正为读取 progress 的 records_seen/records_emitted 后，新验证 exit 0。没有因此修改产品源代码。
- REQ/CR、diff、聚焦格式与文档同步检查的实际输出另存 journal。本 CR 保持 draft/TBD，不伪造 active CR 或 commit association。

## 6. 后续修改入口（How to continue）

- 下一步 `review-change` 复审本轮精确 subject 与证据；上述结果只是实现自检，不代表正式 review 或 S3 finish。
- Task 005 仍 paused/S2 未通过；Node consumer、产品历史发布、App 首屏与 ACK 必须后续独立恢复和验收。

## 7. 风险与注意事项

1. 保留诊断不授权将未知、畸形、partial、pending tail、source mutation 或 lineage 缺口晋级 canonical；source epoch 变化的状态隔离和所有公共协议不变。
2. 原 S3/S2 报告的 provenance 缺口及 Task 004 四份旧报告 stale 状态保留；当前成功结果不能追认旧报告 fresh。
3. 无 Git 提交，CR 为 draft/TBD。全库格式/Windows 断言、未关联 management issue 与 Node/App/外部宿主/真机未验证限制继续保留。
