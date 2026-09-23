---
title: Rollout S2 item_completed 映射与定向验证
status: draft
record_id: CR-20260916-rollout-blockers-s2
req_id: C2
commit_ref: TBD
owner: '@maintainer'
last_updated: 2026-09-23
source_of_truth: code
related_docs:
  - docs/codex/codex-rollout-isolated-closure-verification.md
  - docs/codex/codex-rollout-collector-architecture.md
---

# S2 变更记录

S2 定向实施已完成，尚未提交 Git，也不作为 S3 的最终 C2 验收。

已有改动为 FileChange/CommandExecution completion 经 Adapter 映射到自有事件和 projection/detail；FileChanged additive diff 字段使用现有脱敏和截断策略，命令使用现有 tool 模型。文件逻辑 key 使用 native item/call id 与原 changed path 的稳定区分值，避免 legacy/completion 重合及脱敏路径碰撞造成重复。未修改 vendor、Node、IPC 或产品数据库。

2026-09-23 恢复 S2 后，修复两个测试将公共 JSON projection 直接当 typed projection 使用的 E0609 编译问题。保留旧失败记录；Runtime 0.21.1 根据原有 S2 权限准入 `target_mapping.rs`，新 preflight `preflight-bfacbc8ec44df6aa8635c1e1e82fe5244111794d2087f1be88125fb5be9b50b0` 包含七个候选文件。

前次定向测试发现 partial batch 仍输出 ForwardAppend（rollout_blockers 7 通过、1 失败），负向字段与截断断言尚未运行。修复 `target_mapping.rs`：只有 source 与 Adapter 均完整时才尝试 formal promotion；若归约后的 projection 降为非 canonical，则清除已生成的 ForwardAppend 和 formal checkpoint cursor。保留现有 Backfill/TailPreview 恢复边界。测试增加 batch、complete 和 checkpoint 三处均不得发布不安全 cursor 的断言。

最终本步定向结果：rollout_blockers 8/8、conformance 31/31、stage2_input 3/3。完整命令与报告见关联验证文档。S3 最终槽位和累计审查仍待执行；`commit_ref: TBD` 待实际提交后更新。
