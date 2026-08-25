# docs/workflow/TASK_SUMMARY.md

## 任务信息

- 项目：termlink
- 任务 ID：20260825-003
- 任务标题：收敛 Node↔Rust 接口文档，移除 discovery/fingerprint 业务接口语义
- 任务 slug：codex-node-rust-interface-contract-convergence
- 任务类型：架构/进程协议文档修订（docs-only）
- 交付时间：2026-08-26
- Safety mode：frozen-scope；Release mode：none

## 目标与结果

依据 Codex app-server append-only / parent-immutable 现实与“每 conversation 一份 canonical 记录、无持久化版本管理”的产品事实，把 4.5 Node↔Rust analyzer 公共接口从“Node 构造 discovery + fingerprint source guard”收敛为“Node 提供 conversation/read intent，Rust 内部维护 source index；fingerprint 不再是业务 gate”。

**达成**：全部 7 个实施步骤完成，11 条验收标准逐项有证据；含 4 轮用户追加确认的修订（`serverRevision` 收口、L1 formal-only 标注、`retention_profile` 删除、泛化 `revision` 非产品机制）。

## 改动范围

实现阶段（均在任务 Allowed Files 内，无越界）：

| 文件 | 改动 |
|---|---|
| `docs/workflow/CURRENT_TASK.md` | 任务包记录：背景、验收、决策、步骤与执行记录同步 |
| `docs/codex/codex-history-sync-node-server-rust-analyzer-interface-index-draft.md` | 删除 discovery 接入要求；`analyze` 收敛为 conversation/read intent + mode + cursor/恢复状态 + 资源预算 |
| `docs/codex/codex-history-sync-node-server-coordinator-contract-draft.md` | coordinator 职责边界收敛；移除 `serverRevision`/revision 正向语义 |
| `docs/codex/codex-rollout-collector-rust-analyzer-data-contract-draft.md` | 公共 Data Contract 移除 fingerprint gate、`retention_profile`、item/source `revision` 字段语义 |
| `docs/codex/codex-rollout-collector-rust-analyzer-wire-contract-draft.md` | Wire Contract 同步移除上述公共字段 |
| `docs/codex/codex-rollout-collector-architecture.md` | Rust 内部 source index 职责表述；fingerprint 表述收口 |
| `docs/codex/codex-concept-layer-status-registry.md` | 登记 retention_profile / revision 等概念的层级 × 状态（legacy / migration-required） |
| `docs/codex/codex-last-turn-replacement-rust-collector-change-plan.md` | 增加 L1 formal-only / 非 L2 公共契约标注；`discovered` 三态限定为历史 formal artifact |

closeout 阶段（phase-7/8 治理回写，属 `/close-current-task` 编排授权）：

- `docs/workflow/STATUS.md`：最近更新记录、遗留风险、下一检查点
- `docs/workflow/DECISIONS.md`：新增 AD-021（追加式）
- `docs/workflow/LESSONS.md`：新增 L-028
- 本文件（TASK_SUMMARY.md）

未修改：Rust formal crate、Node runtime、schema、测试、数据库、Android、IPC 及其他历史 design-only 草案。

## 契约与决策变化

- 新增或更新的契约：无 `CONTRACTS.md` 变更——本任务明确禁止修改治理契约文档，且已声明“AD-011/AD-012 旧 formal revision 术语完全去除需另立范围锁定任务”。接口边界变化落在 `docs/codex/**` 现行来源与概念登记表。
- 新增或更新的决策：DECISIONS.md 新增 **AD-021**：discovery/fingerprint 废止出 4.5 业务接口；`retention_profile` 公共字段删除（formal 字段保留为无行为 legacy metadata）；泛化 item/source `revision` 不作为公共字段/返回值/持久化版本/覆盖条件；旧 collector change plan 定格为 L1 formal-only。
- 是否存在越界风险：无。工作树中另有大量 R-010 任务外 dirty/untracked 内容，保持原样未触碰。

## 验证结果

- 执行的测试 / 检查：
  - `node --test tests/codexRolloutCollector.test.js`：宿主侧 30/30（2026-08-25 执行记录）；2026-08-26 WSL 复跑 28/30
  - `git diff --check`（scoped 至 Allowed Files）：CRLF 归一口径 PASS；未归一口径告警均为仓库既有 CRLF 工作树编码（`\r`），非本轮新增空白问题
  - 字段检索：discovery/fingerprint/`serverRevision`/`retention_profile`/泛化 `revision` 的正向必填/gate 语义在现行来源中不再出现；`history_base`、cursor、byte offset、snapshot length、partial/pending、single-flight 与内部完整读取恢复语义保留
- 结果：验收标准 1–11 全部满足；14 项回归检查项全部勾选
- 未覆盖项：WSL 会话无法运行 Windows 构建的正式 Rust `.exe`，2 个失败用例为 environment-blocked（非代码回归；本任务未修改任何代码）；宿主侧 30/30 为权威记录

## 风险与后续

- 剩余风险：
  - formal native crate 中 fingerprint/prefix anchor、`retention_profile`、item/source `revision` 兼容字段仍物理存在，仅为登记在案的 legacy / migration-required；误读为“已删除”的风险由文档标注与 AD-021 约束防呆
  - `CONTRACTS.md`/`DECISIONS.md` 中 AD-011/AD-012 的阶段 4 formal revision 表述保留原文，可能被再次误引为 4.5 公共接口依据（AD-021 已显式排除）
  - 本任务全部文档改动尚未提交，混于 R-010 任务外 dirty 工作树；整树操作被禁止
- 建议后续动作：
  - 另立协议迁移任务完成 formal crate 兼容字段物理删除
  - 如需治理文档术语彻底对齐，另立范围锁定任务并取得用户确认
  - 对本任务 8 个文件执行 path-scoped staging/commit（待用户授权归属口径后）

## 交付清单

- [x] discovery 从 Node→Rust 业务接口废止；Rust 内部 source index lookup/refresh 保持内部职责
- [x] fingerprint/prefix anchor 退出 4.5 正常 append/head/lineage gate；formal 字段标注为 opaque compatibility metadata
- [x] `serverRevision` 正向产品语义从现行来源清除（单一 canonical record 语义）
- [x] 旧 collector change plan 标注 L1 formal-only；`discovered` 三态与 4.5 公共两态分离
- [x] `retention_profile` 从公共 `AnalyzeRequest` 删除并登记无行为边界
- [x] 泛化 item/source `revision` 公共语义移除；旧实现登记 migration-required；`wire_source_revision` provenance 分层保留
- [x] `history_base`/cursor/byte offset/snapshot length/partial-pending/single-flight/内部完整读取恢复语义完整保留
- [x] 回归与 diff 检查通过（宿主 30/30；scoped diff-check CRLF 归一 PASS）
- [x] STATUS / DECISIONS(AD-021) / LESSONS(L-028) / TASK_SUMMARY 治理回写完成
