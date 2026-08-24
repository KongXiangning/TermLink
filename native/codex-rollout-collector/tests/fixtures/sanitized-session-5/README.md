# sanitized-session-5

这是 TermLink-owned 的 synthetic/sanitized fixture，仅用于 Rust collector 的阶段 4
discovery、lineage、Replay/Preview/Backfill 与 latest-path restart 回归；全部内容均由人工
构造的最小事件组成，不包含真实正文、本机路径或真实 ID。

fixture 保留最小协议形状：两个日期分区、5 个候选文件、一个更早的 stale root-like
候选、一个 root 与三个 paginated child 的 root→head 链、3 条 `history_base` 边，以及
active head 中一个 synthetic `developer` role 事件，用于维持 `partial` /
`validation_unavailable` 断言。

所有 JSONL 使用 UTF-8 + LF。测试中的 manifest、文件长度及 SHA-256 均按当前文件 bytes
计算；`history_base.end_ordinal_exclusive` 与 `end_byte_offset` 是对应父文件的真实
切点，不是从原始会话推导或遮盖得到的值。
