---
schema_version: 1
kind: vnext-task-basis
task_id: "001"
document_id: doc-87ea7576bc76f5782bea891f
original_request:
  source: codex://threads/01a09d68-7704-77c2-8aa8-699a8860871a — 用户首次调用
    prepare-task、附 rust-issues-ledger 的消息（2026-09-14）
  verbatim: "[$prepare-task](E:\\coding\\TermLink-rust-source-resolution-codex\\\
    \\.agents\\skills\\prepare-task\\SKILL.md)
    E:\\coding\\TermLink-rust-source-resolution-gemini\\docs\\codex\\codex-roll\
    out-collector-rust-issues-ledger.md 这是当前worktree同阶段的另一个ai实现的worktree所发现的
    rust端的问题。当前worktree和gemini worktree的rust实现是同一个基线，实现是一样的。
    现在要判断这个问题清单上的问题是否真的存在（判断在当前worktree，gemini
    worktree已经进行修正），然后对确定存在问题的判断gemini worktree上的修复是否可直接复用。 第一步，是否应该先依据
    [codex-rollout-collector-architecture.md](docs/codex/codex-rollout-collecto\
    r-architecture.md) 构建好完整的采集-存储的业务测试用例。"
user_decisions:
  - source: codex://threads/01a09d68-7704-77c2-8aa8-699a8860871a —
      用户明确第一阶段范围的后续消息（2026-09-14）
    verbatim: 第一阶段按“业务用例矩阵＋当前 Rust 问题核实＋Gemini 修复复用评估”准备草案，将实际修复及完整 Node/DB
      测试实施留到核查结论之后  。明确如此
  - source: codex://threads/01a09d68-7704-77c2-8aa8-699a8860871a — 用户 review-draft
      请求中的审核重点（2026-09-14）
    verbatim: "[$review-draft](E:\\coding\\TermLink-rust-source-resolution-codex\\\
      \\.agents\\skills\\review-draft\\SKILL.md) 用例矩阵的数量和质量要聚焦审核"
  - source: codex://threads/01a09d68-7704-77c2-8aa8-699a8860871a —
      用户明确以完整真实业务流程作为矩阵出发点的消息（2026-09-14）
    verbatim: 我先明确一点：用例矩阵的出发点不应该是这列出来的9个问题，而是以
      rust-node采集器到存储及node提供接口供app进行调用的真实业务角度进行的用例设计，比如app
      对会话进行首次加载，那么加载就是先最新然后往前读取，比如app在
      ipc实时更新时进入进行会话的历史信息加载等等，这些用例只要覆盖了完整的业务流程，那这9个问题也自然都被覆盖了。
  - source: codex://threads/01a09d68-7704-77c2-8aa8-699a8860871a —
      用户明确CURRENT_TASK末尾空行不应阻塞并要求继续的消息（S1阻塞后）
    verbatim: "`CURRENT_TASK.md` 末尾多余空行   不应该成为阻塞点。继续"
---
# vNext TASK_BASIS

This file preserves request evidence for independent draft review.
It is not a review result and does not replace source-authority or decision-authority policy.
