# TASK-20260826-001：4.5 阶段 Rust analyzer 公共协议一次性迁移与 legacy 字段退役

## 任务元数据

- 项目：termlink
- 项目类型：application
- 任务 ID：20260826-001
- 任务标题：4.5 阶段 Rust analyzer 公共协议一次性迁移与 legacy 字段退役
- 任务 slug：codex-collector-phase45-rust-protocol-migration
- 开始时间：2026-08-26
- 结束时间：2026-08-27
- 最终状态：completed_verified_archived
- 任务开始基线：`3060e66fa5bdb5dcdebec4757c72fe6e3c041be8`
- Safety mode：frozen-scope
- Release mode：none
- 归档性质：同一任务由不同 AI 工作树分别实施；本归档保留本工作树的 Rust target-side 实施与验证证据，任务身份沿用已确认的统一 ID/title/slug。

## 原始任务包快照

- 用户目标：实施 4.5 阶段 Rust analyzer 模块功能，并在不提前触及 Node 产品集成的前提下完成 Rust 侧公共协议迁移。
- 任务目标：将 formal native crate 的 target 运行态切换到 4.5 startup/wire/data 形状，接通 Rust 内部 `sessions_root` source locating、session lineage、Adapter/reducer/projection 映射、ACK/checkpoint 和进程级验证。
- 验收标准：
  1. startup 只接受 `--startup-config-version 1 --sessions-root <absolute path>`，非法版本、路径和目录边界 fail-closed。
  2. target wire 支持 hello、`analyze_v1`、`preview/backfill/append`、cancel、ACK、batch envelope、complete/error。
  3. request 仅携带 `conversation_id` 与读取意图，Rust 内部完成 source locating 和 lineage 重建，不接受 Node path/discovery/catalog/date-range/active hint。
  4. cursor 类型不混用；overlap 幂等去重；gap、截断、替换、unknown、partial、缺 parent、cycle、多 head 和资源错误保持安全边界。
  5. target mapping 保持物理 `event_id` 与稳定逻辑 `item_key` 分离，并正确映射 Tool/Plan/Turn/Usage、alias、ParseGap、compaction、abort 和 replacement。
  6. 只有匹配的正 ACK 才能推进 delivery watermark 和 complete；负 ACK、超时、取消、旧 generation 和错误恢复均 fail-closed。
  7. source 解码预算、segment 预算、deadline 和 worker single-flight 语义可验证。
  8. 公共 target 序列化不暴露 `source_spec.path`、discovery、`replay`、fingerprint/prefix-anchor gate、`retention_profile` 或泛化 product revision。
  9. native locked/offline 构建、全量回归、依赖闭包、target process smoke 和 scope/static boundary 检查通过。
  10. `review-diff`、`review-implementation`、`verify-contracts` 和 `run-regression` 均有结论。
  11. Node consumer、产品数据库、IPC、Android、release、canary 和 benchmark 不在本任务范围。
- Allowed scope：`native/codex-rollout-collector/src/**`、target tests/fixtures、必要的 Rust manifest、已授权的 workflow 记录和最小契约/登记同步。
- Forbidden scope：Node `src/**`、根 `tests/**`、Android、public、IPC 冻结区、数据库、vendor、Demo/Spike、未授权契约正文和产品集成。

## 实际改动摘要

- Rust startup/dispatch：新增 startup 配置解析与 target/legacy 显式分流；target 进程在握手前校验 `sessions_root`，不创建缺失 root，不接受请求级 source path。
- Rust target protocol：新增/改造 target wire、data、runtime、source、mapping 边界，完成 Node-first hello、能力交集、单飞 request、三种公共 mode、cancel、deadline、batch/ACK/complete/error 和恢复身份校验。
- Source/lineage bridge：在 target 层复用既有内部 discovery、SourceBackend 和 lineage 能力，以 startup `sessions_root` + `conversation_id` 定位来源；实现 plain sibling 优先、zst-only active/root forward read、普通 zst parent typed fail-closed、跨日期 root→active lineage 和 bounded read。
- Mapping：复用既有 `CodexEventAdapter`、`AnalysisReducer` 和 `AnalysisProjection`，保留 source provenance/coverage/checkpoint evidence；补齐 replacement chain、同源 append 完整 lineage validation、cursor promotion、overlap/dedup、partial/unknown/alias/compaction/abort 与 mapping/formal-promotion cancel/timeout 边界。
- Resource/error boundary：将 discovery/read-plan 的 resource limit、timeout、cancel 与普通 analysis failure 正确映射；按 request 剩余预算约束多 segment 读取；出站 payload 编码长度不再冒充 source decoded budget。
- Tests/fixtures：新增 target-session fixtures 和真实 Rust analyzer 子进程 JSONL 测试，覆盖 startup、hello、mode、source/lineage、cursor、mapping、ACK、complete、cancel、timeout、restart/retry、资源耗尽和异常矩阵。
- Workflow records：本任务执行、审查、契约核验、回归、deferred 风险及后续 handoff 已记录在任务期间的 workflow 文档中；归档阶段仅新增本归档和下一轮 clean handoff。

## 11 项验收结论

1. 通过：startup 参数和 path boundary 已进程级验证；candidate symlink 的 discovery pre-I/O confinement 仍作为 `RD-4.5-006-001` deferred，不在本任务扩大 source scope。
2. 通过：hello、`analyze_v1`、`preview/backfill/append`、cancel、ACK、batch envelope、complete/error 均有 target process 证据。
3. 通过：target request 只使用 `conversation_id` 和 read intent，source locating/lineage 在 Rust 内部完成。
4. 通过：三类 cursor、overlap、gap、shrink/truncation/replacement、partial/provisional 和 lineage 关系歧义均保持 fail-closed 或显式不完整。
5. 通过：Adapter/reducer/projection mapping 覆盖 Tool/Plan/Turn/Usage/unknown/alias/ParseGap/compaction/abort；`event_id` 与 `item_key` 分离。
6. 通过：匹配正 ACK 才能结算，负 ACK/late ACK/late complete/cancel/timeout/旧 generation 不推进 checkpoint 或 complete。
7. 通过：request aggregate decoded budget、segment limit、deadline、cancel 和 worker single-flight 均有回归；formal source hash interruptibility 另列 deferred。
8. 通过：target public forbidden-key 静态检查与 direct serialization/process 测试通过；用户明确否决的嵌套 `replay` 不作为本任务 finding，保持 opaque/no-op 语义。
9. 通过：fmt、locked/offline check/test、metadata/tree vendor closure、startup/hello smoke、scope/static scan 全部通过。
10. 通过：`review-diff`、`review-implementation`、`verify-contracts`、`run-regression` 均通过，无未解释回归。
11. 通过：未启用 Node consumer，未修改 Node/Android/IPC/DB/vendor/Demo/Spike；Node migration 作为独立后续任务。

## 契约与决策记录

- Rust 与 Node 的本轮边界是模块隔离：本工作树只交付 Rust target-side artifact；Node 侧按现行接口文档另立任务实施，双方最终再做联合集成分析。
- `sessions_root` 是 Rust 启动契约的一部分；Node 不传 source path、discovery、catalog 或日期分区。
- 公共 `analyze` mode 仅为 `preview`、`backfill`、`append`；恢复通过相同普通读取意图和新的 request delivery 重新交付，不新增公共 recovery/full/replay mode。
- `source_epoch`、fingerprint、prefix anchor、source revision 等只在需要时保留为 Rust 内部/opaque compatibility evidence，不升级为产品 source identity 或 Node 业务 gate。
- `RD-4.5-006-001`：候选 symlink 可能在 discovery 已读取 metadata/header/fingerprint 后才被 target 层拒绝；可靠的 pre-I/O 修复需要 `native/codex-rollout-collector/src/source/**`，当前按用户确认的模块 owner 策略 deferred。
- `RI-4.5-007-011`：formal source hash/append prefix digest 的可中断性需要 source 层能力；target worker 并发风险已 containment，formal source 部分 deferred。
- `COMPAT_ADAPTER_BOUNDARY_MISSING`：Node collector 尚未迁移到本 Rust 4.5 target wire，保留为后续 Node migration/integration blocker，不在 Rust 任务中越界修改。

## 验证与交付证据

- `stage4_target_protocol.rs` target protocol/process：`70/70` 通过。
- native 全量：`229/229` 通过，构成为 97 unit、1 main unit、31 conformance、3 stage2、5 stage3、22 stage4、70 target protocol。
- `cargo fmt --manifest-path native/codex-rollout-collector/Cargo.toml -- --check`：通过。
- `cargo check --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline`：通过。
- `cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --locked --offline`：通过。
- target startup/hello direct smoke、cancel/timeout/resource/error、source/lineage、cursor/mapping、ACK/complete 和 restart/retry process matrix：通过。
- `cargo metadata` / `cargo tree`：539 packages、0 Git source；14 个 Codex packages 来自仓库内 `vendor/codex` relative-path closure。
- `review-diff`：通过；无 scope drift、decision drift 或新的 current-task-owned finding。
- `review-implementation`：通过；target mapping、边界状态、异常和测试矩阵已收口，两个 source-level 风险仍显式 deferred。
- `verify-contracts`：通过；startup/wire/data/runtime、target/legacy dispatch、single-flight、ACK→complete 和 source bridge 未破坏锁定接口/架构边界。
- `run-regression`：`full-qa` 通过；`git diff --check`、Allowed Files scope scan、target public forbidden-key static scan 通过；无未解释 native/source/lineage/Adapter/reducer 回归。

## 发布后验证证据

- Release mode：none
- Deploy source：none
- Target environment：本地 Windows Rust native crate / Rust analyzer 子进程
- Health checks：cargo fmt、locked/offline check/test、target process stdin/stdout JSONL smoke、metadata/tree vendor closure、scope/static boundary scan
- Canary window：none
- Performance baseline：none；本任务只验证 bounded resource/timeout/cancel，不建立 benchmark 发布门禁
- Rollback / recovery：只恢复本任务 Allowed Files 到任务开始基线或审计 checkpoint；不执行整树 reset/checkout/clean，不触碰 task-external dirty/untracked 内容
- Release evidence：not applicable；本任务不宣称 deploy、production、canary 或 release readiness
- canary result：not applicable
- performance baseline result：not applicable
- rollback status：not exercised
- remaining observation：Node consumer 仍需独立迁移；source candidate pre-I/O confinement 与 formal source hash interruptibility 继续观察并由后续 scope/owner 联合评审决定；现有 workflow paused/inbox artifact 的任务外校验异常不属于本任务回归失败

## Lessons 回写

- 已沉淀：跨 AI / worktree 实施同一任务时，必须共享并物化同一个 task ID/title/slug；`create-current-task` 的初稿占位符不能直接进入 archive。
- 已沉淀：模块隔离下，发现另一模块不符合当前 Rust 接口时，应先更新/锁定接口文档并由另一模块按文档迁移，不能因集成预期直接越界修改对方模块。
- 已沉淀：审查发现若最小可靠修复需要 Forbidden source scope，应保持 finding 为 deferred/scope-widening candidate，不能把 target 层的部分 containment 写成 source 层已解决。
- 已沉淀：Rust target source bridge 的 request aggregate budget、worker generation 和 deadline/cancel 必须在 target boundary 显式测试，不能仅依赖单 segment 或单次成功路径。

## 后续关联

- 下一轮入口：新需求执行 `/create-current-task`，使用新的 task identity；不要复用本归档 ID 创建不相关任务。
- Node 后续任务：依据现行 4.5 startup/wire/data/coordinator 文档实施 Node collector/coordinator 侧迁移，随后再做 Rust↔Node 联合接口/兼容分析。
- Source boundary 后续任务：如确需 candidate pre-I/O confinement 或 formal hash interruptibility，先单独说明影响、锁定 scope、更新契约/决策并取得用户确认。
- 归档位置：`TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md`
