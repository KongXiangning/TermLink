# TASK-20260823-001：重订 Codex Rollout Collector 会话 lineage 定位与读取设计

## 任务元数据

- 项目：termlink
- 任务 ID：20260823-001
- 任务标题：重订 Codex Rollout Collector 会话 lineage 发现与读取设计
- 任务 slug：codex-rollout-collector-session-lineage-replan
- 开始日期：2026-08-23
- 归档日期：2026-08-24
- 最终状态：archived
- 任务开始基线：`7e9f552`
- 主要实现提交：`a94dcbc`（`fix(collector): canonicalize rollout siblings`）
- 归档结论：Rust Collector 会话级内部 source 定位、lineage 重建、读取模式和 replacement evidence 已完成并通过目标回归；不宣称 Node 产品持久化、服务端数据库、App ADTO、IPC、Android 或产品 release 已完成。

## 原始任务包快照

### 目标

实现 Rust Collector 的完整会话级业务链路：

```text
Rust 启动级 sessions root + Node conversation id
    ↓
Rust 内部有界定位候选 rollout
    ↓
SessionMeta / history_base 权威关联
    ↓
root → active head 完整 lineage read
    ↓
full / tail-backward / backfill / same-file append / child transition
    ↓
coverage、provenance、checkpoint、replacement evidence
```

被替换的旧 turn 保留在逻辑历史中；本任务不进入产品数据库、App ADTO、IPC 或 Android。

### 验收与边界

- Rust 启动级 `sessions_root` 与 Node 的 `conversation_id` 是内部定位入口；Node 不发送 discovery
  请求，文件名只能提供候选和顺序线索。
- `SessionMeta.id`、`history_base.thread_id`、ordinal/byte cut 负责会话绑定与父子关系验证。
- 跨日期候选、缺父、多头、循环、会话不一致和无法消除的 active-head 歧义必须 fail-closed。
- 保持最后一个已终止用户 turn 的一对一编辑替换 invariant、completed/stopped/interrupted、A→B→C 和旧 turn 保留语义。
- 单文件读取 cursor 与 child lineage checkpoint 不得跨物理 rollout 复用。
- partial、未知事件、未完成尾行和未知 schema 不得静默宣称完整 canonical 历史。
- 普通无索引 `.zst` 只提供 forward stream；作为 parent 需要后向、切点或随机读取时 typed fail-closed。
- 本任务只交付隔离 Rust Collector artifact，不冻结产品 DB、WebSocket、App DTO/ADTO、IPC 或 Android 契约。

## 实际改动摘要

### Rust Collector

- 新增 Rust 内部 source 定位、候选 provenance、日期范围遍历、active-head 选择和 lineage chain 解析。
- 以 `history_base` 建立跨日期 parent/child 关系，沿 root→head 重建完整历史并保留被替换 turn。
- 接入 lineage full read、tail/backward recovery、backfill、同文件 append 和 child transition。
- 输出 additive 的 discovered sources、lineage transitions、coverage、checkpoint 和 replacement evidence。
- 增加 transition validation state：`discovered`、`validated`、`validation_unavailable`。
- 将物理 append delta 与完整 lineage snapshot 分离；重启后可恢复最新 active head，不把 delta 当完整历史。
- 删除不符合已确认 Codex append-only source model 的 parent auxiliary 整文件 mutation guard；保留 source identity、cut、cursor、读取完整性和 replacement validation。
- 在 discovery/catalog 阶段实现 Codex 兼容的同目录同名 plain sibling 优先：`.jsonl` 与 `.jsonl.zst` 同时存在时只保留 `.jsonl`；zst-only 仍保留。

### Fixture 与测试

- 新增 `native/codex-rollout-collector/tests/fixtures/sanitized-session-5/` 五文件跨日期 synthetic/sanitized fixture。
- 覆盖 full read、Preview、Backfill、latest-path restart recovery、stale root-like provenance、same-file append、active-head ambiguity、transition validation、`.zst` parent fail-closed 和 plain sibling priority。

### 文档与治理

- 同步 Collector change plan、architecture、Codex compatibility、recorder technical reference、server-sync 上游依赖说明和 Collector technical details。
- 同步 `CONTRACTS.md` 与 `DECISIONS.md`，明确 discovery、lineage、读取模式、coverage、replacement 和压缩源边界。
- closeout 期间同步 `STATUS.md`、`LESSONS.md`、`CURRENT_TASK.md` 以及 host guidance；这些治理文件不改变产品运行时边界。

## 契约与决策记录

### 已稳定并同步

- 文件名不是 canonical conversation identity，也不能单独证明父子关系；`history_base` 是 lineage 关联证据。
- rollout.jsonl 的物理读取不是分页；日期分区、候选数和内部 locator budget 与 full/tail/backward/append 读取模式分离。
- 删除 `max_lineage_depth`；循环由 visited 检测，资源边界由 discovery/read budget、取消和 deadline 负责。
- lineage evidence、lineage coverage、projection coverage、batch completeness 和 replacement mutation 分开表达。
- 只有验证与 coverage 满足条件时才允许替换投影；partial/evidence-only 不提交 replacement mutation。
- 同目录 `.jsonl` / `.jsonl.zst` sibling 遵循 plain 优先；不同路径相同 rollout ID 仍保持冲突语义，不跨目录合并。
- 普通无索引 `.zst` 作为 active/root 可 forward full read；作为 parent 需要随机/后向/切点读取时 fail-closed。

### 保持不变的关键边界

- 当前业务仍是最后一个已终止用户 turn 的一对一编辑替换，不扩展成任意 suffix、多 turn 或通用 branch graph。
- `SourceBackend`、既有单文件 full/tail/backward/append cursor 语义保持兼容。
- 不修改 vendor Codex 源码，不把 Demo/Spike 变成正式实现依赖。
- 不修改 Node 产品持久化、正式数据库 schema/migration、WebSocket/IPC runtime、Android 或既有产品 DTO。

## 验证与交付证据

### 目标回归

- Rust library：96/96 通过。
- Rust 全量：`cargo test --manifest-path native/codex-rollout-collector/Cargo.toml --all-targets --no-default-features` 通过：96 unit、31 conformance、3 stage2、5 stage3、22 stage4。
- `cargo fmt --check`、`git diff --check`、提交前敏感信息扫描和版本检查通过。
- 真实 rollout 目录 smoke 已验证 full read、Preview、Backfill、Append；五文件 fixture 已覆盖跨日期 lineage 与重启恢复矩阵。
- 最终范围审查 `7e9f552..working-tree` 未发现阻断性缺陷或越界改动。

### Release evidence

- Release mode：none / not applicable。
- Deploy source：none。
- Target environment：本地 Windows formal Rust package 与隔离测试。
- Health checks：not applicable；未启动或变更产品服务。
- Canary window：none。
- Performance baseline：not run；本任务未建立产品性能基线。
- Rollback / recovery：保留基线 `7e9f552` 和提交 `a94dcbc`；未执行整树 reset、clean、删除或历史重写。
- Release evidence：无发布、部署、canary 或生产证据，不代表产品 release-ready。

## Lessons 回写

本任务已新增：

- L-023：文件名只能发现候选，`history_base` 才能建立 session lineage。
- L-024：发现范围、物理读取模式和 lineage 深度必须分开。
- L-025：lineage 证据不能直接充当 projection completeness。
- L-026：plain/compressed sibling 必须在 catalog 冲突前 canonicalize。
- L-027：host guidance 必须成对同步，并显式处理被忽略的文件。

## 后续关联与观察点

- 后续任务：若进入阶段 4.5，应新建任务设计 Node 服务端持久化、history projection、App ADTO 和同步接入；不得在本归档中提前宣称已完成。
- 上游兼容观察：Codex 文件名、`SessionMeta`、`history_base` 和 UI last-turn replacement 行为属于 compatibility invariant；未来 vendor/UI 变化时需更新 fixture 并 fail-closed 升级适配。
- `.zst` 观察：当前只冻结无索引 `.zst` 的 forward-only 边界，不伪造 parent seek/backward/append 能力。
- 治理工具观察：`bun run workflow:health` 仍因缺失 `scripts/workflow-runtime.ts` 所引用的 `./guard-target-root` 而无法启动；`bun run validate:protocol` 的任务外 paused/inbox artifact 问题另立治理任务处理。
- 工作树观察：`native/parse-probe/`、`native/rustup-init.exe`、`native/winlibs.zip` 等任务外内容保持原样，未清理、未修改、未纳入本任务实现。
- `CLAUDE.md` 当前受 `.gitignore` 忽略；host guidance 已生成并与 `AGENTS.md` 对齐，但是否纳入版本控制需另立治理决定。

## 归档与下一轮入口

- 归档位置：`TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md`
- 下一轮没有明确任务包；收到新需求后执行 `/create-current-task`，不得自动恢复或扩大本任务。
