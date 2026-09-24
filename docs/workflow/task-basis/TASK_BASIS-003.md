---
schema_version: 1
kind: vnext-task-basis
task_id: "003"
document_id: doc-03166aa61e365e5f8af1f680
original_request:
  source: current-user-message:2026-09-23-product-history
  verbatim: "[$prepare-task](E:\\coding\\TermLink-rust-source-resolution-codex\\\
    \\.agents\\skills\\prepare-task\\SKILL.md) 去除Rust 采集层的破坏性脱敏、成 Node
    产品数据库持久化和历史接口。  "
user_decisions:
  - source: prior-user-message:2026-09-23-no-redaction
    verbatim: 明确历史 DTO 与路径脱敏策略，不需要脱敏
  - source: current-user-message
    verbatim: 确认加入
  - source: current-user-message:2026-09-23-execute-step
    verbatim: "[$execute-step](E:\\coding\\TermLink-rust-source-resolution-codex\\.\
      agents\\skills\\execute-step\\SKILL.md)"
  - source: current-user-message:execute-step-task003-s3-cancel-replan-block-20260924
    verbatim: "[$execute-step](E:\\coding\\TermLink-rust-source-resolution-codex\\.\
      agents\\skills\\execute-step\\SKILL.md) repair 先按我本次决定，通过 Runtime 单独记录
      `cancel-replan-block`（目标 `gate:blocked-by-replan`），然后恢复 S3 的 repair 执行。只处理
      `kotlinx-coroutines-core-jvm:1.7.3` 下载失败后的原定 Android JVM 验证；核对现有
      preflight，重跑冻结命令并如实登记结果。不要提交恢复候选、不要 replan、不要修改 `.workflow-system` Runtime
      或 vNext 文件。"
  - source: user:compatible-upgrade-2026-09-24
    verbatim: 好，按这个建议进行实施
---
# vNext TASK_BASIS

This file preserves request evidence for independent draft review.
It is not a review result and does not replace source-authority or decision-authority policy.
