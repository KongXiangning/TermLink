# TASK-20260825-003：收敛 Node↔Rust 接口文档，移除 discovery/fingerprint 业务接口语义

## 任务元数据

- 项目：termlink
- 任务 ID：20260825-003
- 任务标题：收敛 Node↔Rust 接口文档，移除 discovery/fingerprint 业务接口语义
- 任务 slug：codex-node-rust-interface-contract-convergence
- 开始日期：2026-08-25
- 归档日期：2026-08-26
- 最终状态：archived
- 任务开始基线：`eaa3019`
- 主要实现提交：无（本任务全部改动保留在工作树，HEAD 为 `f3400a8`；提交需按 path-scoped 方式单独执行，不得整树提交）
- Safety mode：frozen-scope；Release mode：none
- 归档结论：4.5 Node↔Rust 公共接口的 discovery/fingerprint 业务语义、`serverRevision`、泛化 item/source `revision` 与公共 `retention_profile` 已从现行来源文档收口；formal native crate 兼容字段物理删除与治理文档旧 formal 术语清理分别留待独立任务。纯文档修订，不宣称任何代码、schema 或产品行为变化。

## 原始任务包快照

### 背景

用户确认“Rust 那边 discovery、fingerprint 废止，接口文档需要更改”及其附带收敛依据。已确认的真实业务边界：

- rollout.jsonl 由 Codex app-server 控制写入；TermLink 只读分析；
- 同一 rollout append-only；turn resend 生成 child rollout，parent 不再变更；
- Branch in new chat 是新的 conversation，不建立原 conversation 的 parent/child 依赖；
- 同一 conversation 只有一条 Node→Rust 分析链；
- Rust 负责按 conversation 查找/维护内部 source index，Node 不发送 discovery 业务字段；
- `history_base` 仍是 child→parent 关系的事实依据；
- 旧 rollout 被等长度原地修改不属于 Collector correctness contract。

执行期间用户追加四轮确认（2026-08-25～08-26）：问题 2（`serverRevision` 非现行产品状态）、L1 formal-only 旧方案边界、`retention_profile` 公共字段边界、禁止持久化版本管理与泛化 `revision`。

### 目标

1. `analyze` 收敛为 conversation/read intent、mode、cursor/恢复状态和资源预算。
2. 删除 discovery 作为 Node→Rust 业务参数/接入步骤；Rust 内部 source index lookup/refresh 保持内部职责。
3. 删除 fingerprint/prefix anchor 作为正常 append、active head 选择或 parent-child 验证的业务前置条件。
4. 保留 `history_base`、source identity、稳定完整行 byte offset、snapshot length、partial/pending 和 cursor 语义。
5. 区分“4.5 业务接口废止”与“formal native crate 兼容字段暂留”。

### 验收与边界

- Allowed Files 固定为 CURRENT_TASK.md 与 7 份 `docs/codex/**` 现行来源文档；禁止修改 `src/**`、`android/**`、`native/**`、`tests/**`、`.workflow-system/**`、治理契约文档及一切任务外 dirty/untracked 文件。
- 不删除 formal native crate 的 schema 字段，不修改 Rust source index/discovery 实现。
- 验收标准共 11 条（详见归档前任务包/TASK_SUMMARY），全部满足。

## 实际改动摘要

实现阶段（均在 Allowed Files 内）：

- `docs/workflow/CURRENT_TASK.md`：任务包记录与多轮追加修订记录、closeout 记录。
- `docs/codex/codex-history-sync-node-server-rust-analyzer-interface-index-draft.md`：删除 discovery 接入要求；`analyze` 参数收敛。
- `docs/codex/codex-history-sync-node-server-coordinator-contract-draft.md`：coordinator 职责边界收敛；移除 `serverRevision`/revision 正向语义。
- `docs/codex/codex-rollout-collector-rust-analyzer-data-contract-draft.md`：公共 Data Contract 移除 fingerprint gate、`retention_profile`、item/source `revision` 字段语义；覆盖证据改由稳定 `item_key`、内容、completeness、source_ref/complete_range 表达。
- `docs/codex/codex-rollout-collector-rust-analyzer-wire-contract-draft.md`：Wire Contract 同步移除上述公共字段。
- `docs/codex/codex-rollout-collector-architecture.md`：Rust 内部 source index 职责表述与 fingerprint 表述收口。
- `docs/codex/codex-concept-layer-status-registry.md`：登记 retention_profile / revision 等概念的层级 × 状态（legacy / migration-required / unadopted 分层）。
- `docs/codex/codex-last-turn-replacement-rust-collector-change-plan.md`：增加 L1 formal-only / 非 L2 公共契约标注；`discovered` 三态限定为历史 formal artifact 兼容语义。

closeout 阶段治理回写（phase-7/8 编排授权）：

- `docs/workflow/STATUS.md`：最近更新记录、遗留风险、下一检查点。
- `docs/workflow/DECISIONS.md`：新增 AD-021（追加式，不覆盖历史记录）。
- `docs/workflow/LESSONS.md`：新增 L-028（WSL 复核 Windows 宿主验证结论的口径换算）。
- `docs/workflow/TASK_SUMMARY.md`：本任务交付摘要。

未修改：Rust formal crate、Node runtime、schema、测试、数据库、Android、IPC、Demo/Spike 及其他历史 design-only 草案。

## 契约与决策记录

- `CONTRACTS.md` 无变更：本任务 frozen-scope 明确禁止修改治理契约文档；接口边界变化落位于 `docs/codex/**` 现行来源与概念登记表。
- 新增决策 **AD-021**（DECISIONS.md）：
  - `discovery` 废止出 Node→Rust 业务接口；Rust 内部 source index lookup/refresh 不对 Node 暴露。
  - fingerprint/prefix anchor 不作为 4.5 正常业务 gate；formal 兼容字段仅作 opaque legacy compatibility metadata。
  - `retention_profile` 从公共 `AnalyzeRequest` 删除；Node 不发送、不校验、不解释。
  - 泛化 item/source `revision` 不作为公共字段、返回值、持久化版本或覆盖条件；上游 `wire_source_revision` provenance 语义独立保留。
  - 旧 collector change plan 定格为 L1 formal-only implementation background。
  - AD-011/AD-012 的阶段 4 formal revision 条款仅描述隔离 artifact，不作为 4.5 公共接口依据。

## 验证与交付证据

| 检查项 | 结果 |
|---|---|
| `node --test tests/codexRolloutCollector.test.js` | 宿主侧 30/30（2026-08-25 记录）；2026-08-26 WSL 复跑 28/30 |
| WSL 复跑 2 个失败用例归因 | 均依赖 Windows 构建的正式 Rust `.exe`（`target/debug/codex-rollout-collector.exe`），WSL 会话无法运行——environment-blocked，非代码回归（本任务未修改任何代码） |
| `git diff --check`（scoped 至 Allowed Files） | CRLF 归一口径（`git -c core.autocrlf=input diff --check`）PASS；未归一口径告警均为仓库既有 CRLF 工作树编码 `\r`，非本轮新增空白问题 |
| 字段检索 | discovery / fingerprint / `serverRevision` / `retention_profile` / 泛化 `revision` 的正向必填或 gate 语义在现行来源不再出现；`history_base`、cursor、byte offset、snapshot length、partial/pending、single-flight、内部完整读取恢复语义完整保留 |
| 验收标准 | 11/11 满足；回归检查项 14/14 勾选 |
| Release evidence | Release mode：none（纯文档任务）；无部署、canary、benchmark 或性能基线要求 |

## Lessons 回写

- L-028（`docs/workflow/LESSONS.md`）：在 WSL 侧复核 Windows 宿主验证结论时必须先换算宿主口径——diff 检查用 `git -c core.autocrlf=input diff --check -- <scoped paths>` 复现宿主过滤行为；正式 `.exe` 用例标注 environment-blocked 并引用最近一次宿主侧全量通过记录，不在收尾中顺手转换行尾或交叉编译。

## 后续关联

- 协议迁移任务（待立项）：物理删除 formal native crate 中 fingerprint/prefix anchor、`retention_profile`、item/source `revision` 兼容字段；需独立范围锁定与 fixture 迁移证据。
- 治理术语对齐任务（可选，待用户确认）：清理 `CONTRACTS.md`/`DECISIONS.md` 中 AD-011/AD-012 的旧 formal revision 表述。
- 提交事项：本任务 8 个实现文件 + 4 个 closeout 治理文件尚未提交；工作树仍含 R-010 任务外 dirty/untracked 内容，必须 path-scoped staging/commit，等待归属口径确认。
- 相关决策与登记表：AD-009/AD-013/AD-014/AD-017/AD-019/AD-020/AD-021；`docs/codex/codex-concept-layer-status-registry.md`。
