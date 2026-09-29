---
schema_version: 1
kind: vnext-task-basis
task_id: "004"
document_id: doc-fdd730cf99bb383419d74988
original_request:
  source: current-user-message:2026-09-28-task003-handoff
  verbatim: "[$prepare-task](E:\\coding\\TermLink-rust-source-resolution-codex\\\
    \\.agents\\skills\\prepare-task\\SKILL.md) 承接 Task 003：完成 Rust 历史内容保留、Node
    产品历史持久化与历史接口的剩余修复和整体验收。  "
user_decisions:
  - source: user-instruction
    verbatim: repair Windows 路径泄漏断言会误通过。 [包测试第 353 行 (line
      353)](E:/coding/TermLink-rust-source-resolution-codex/tests/codexHistoryProductPackage.test.js:353)
      将原始路径直接用于搜索 JSON.stringify(delta)。JSON
      会转义反斜杠，因此即使响应包含完整路径，断言仍然通过。最小反例已确认这一点。[产品流测试 (line
      362)](E:/coding/TermLink-rust-source-resolution-codex/tests/codexHistoryProductFlow.test.js:362)
      的第 362、415、922 行存在同类问题。应检查解码后的字符串，或统一转义方式，并确认故意泄漏 Windows
      路径的样本会失败。这是测试缺陷，尚未证明产品实际泄漏。已在 Runtime 为 C4-package、C3-read-final 登记证据争议。
---
# vNext TASK_BASIS

This file preserves request evidence for independent draft review.
It is not a review result and does not replace source-authority or decision-authority policy.
