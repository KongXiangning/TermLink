---
title: 共享历史兼容 S3 Rust 委派语义与协商保护
status: draft
record_id: CR-20261006-0010-shared-history-rust-semantics
req_id: REQ-20261005-codex-history-shared-compat
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-06
source_of_truth: product
related_code: [native/codex-rollout-collector/src/model/analysis_event.rs, native/codex-rollout-collector/src/codex_adapter/mod.rs, native/codex-rollout-collector/src/analysis.rs, native/codex-rollout-collector/src/protocol/target_mapping.rs]
related_docs: [docs/product/requirements/REQ-20261005-codex-history-shared-compat.md, docs/product/plans/PLAN-20261005-codex-history-shared-compat.md, docs/codex/codex-history-shared-compat-contract.md]
---

# CR-20261006-0010-shared-history-rust-semantics

## 1. 变更意图

本批覆盖计划项 TASK-20260833/S3：Rust 自有委派事件、正确身份/turn/物理绑定、双载体归约与 target 能力/profile/旧状态保护。已执行，待 change review/未 finish；结果以 logs/shared-history-compat-20261005/s3/report.md 实际记录为准。

## 2. 实施内容

formal Rust 模型/Adapter/reducer 实现真实 DelegatedInput、逻辑项去重/稳定代表、不可变物理事实和冲突 partial。target mapper/runtime/data 实现能力交集、新旧 reducer/profile、旧状态拒绝/原 profile 重交付保护；main.rs 仅传递实际 worker profile 与错误出口。脱敏完整上下文 fixture 原样复制；既有 conformance/stage3/target 回归扩展，没有修改 Node。

## 3. 影响范围

保留原生 vendor wire、IPC/Android、source discovery、DB、外部源、旧 receipt/intent 和预算。共享规范已发布，本批不新增规范授权或完成产品验收。

## 4. 回滚方案

尚无真实提交，commit_ref=TBD。本批前态保存在 s3/before；将来若提交后需回滚，依据真实 SHA 执行 git revert，本次不执行回滚或清理历史。

## 5. 验证记录

最终 `cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --test conformance --test stage4_target_protocol --test stage3_conformance --locked --offline -- --nocapture`，显式 Demo/Spike oracle：39/5/73 PASS。此前 target 整组 67/72，4 项占位版本名、1 项错误文本断言不一致，定点修正后通过；失败日志保留。REQ 初次默认根定位错误、后显式 ProjectRoot 验证结果分别保留。实际 binary/hash、保护边界与 doc 校验见 s3 证据，不宣称实际 Node durable staging/产品 SQLite 或手机通过。

## 6. 后续修改入口

S3 change review，S4 Node 局部消费和证明合并，S5 隔离产品保存；832 保留分支及三类真实宿主/手机验收。

## 7. 风险与注意事项

解码可用不等于正文可发布；无法证明的关联/冲突必须 partial，能力缺失不能向旧 consumer 发新事件，跨 profile 的旧交付不能重解释为新批次。
