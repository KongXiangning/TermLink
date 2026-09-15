---
title: Gemini 修复复用静态评估 S4
status: draft
record_id: CR-20260914-rust-issues-audit-s4
req_id: TASK-001
task_id: "001"
step_id: S4
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-09-15
source_of_truth: static-comparison
related_code:
  - native/codex-rollout-collector/src/analysis.rs
  - native/codex-rollout-collector/src/codex_adapter/mod.rs
  - native/codex-rollout-collector/src/model/analysis_event.rs
  - native/codex-rollout-collector/src/protocol/target.rs
  - native/codex-rollout-collector/src/protocol/target_data.rs
  - native/codex-rollout-collector/src/protocol/target_mapping.rs
  - native/codex-rollout-collector/src/protocol/target_source.rs
  - native/codex-rollout-collector/src/source/mod.rs
  - native/codex-rollout-collector/src/source/read_plan.rs
  - native/codex-rollout-collector/src/source/record.rs
  - native/codex-rollout-collector/tests/conformance.rs
  - native/codex-rollout-collector/tests/stage4_target_protocol.rs
related_docs:
  - docs/codex/codex-rollout-collector-gemini-fix-reuse-assessment.md
  - docs/codex/codex-rollout-collector-rust-issues-verification.md
  - docs/codex/codex-rollout-collector-business-test-matrix.md
  - docs/codex/codex-rollout-collector-architecture.md
  - docs/workflow/CONTRACTS.md
  - docs/workflow/DECISIONS.md
---

# Gemini 修复复用静态评估 S4

## 1. 评估结果概览

依据当前工作树（HEAD `2a1d967c`）、外部 Gemini 工作树（HEAD `56b863d9`，共同祖先 `7a167711`）以及外部问题台账快照，对 RUST-001 至 RUST-009 及前置依赖提交进行了逐项静态比较与依赖核查。

评估严格遵守只读静态边界，**未构建、未测试、未执行、亦未应用 Gemini 代码**。相同输入的动态对照明确未执行，性能与内存提升标为未验证。

## 2. 复用分类结论与依赖闭包

- **需拆分或调整 (Adaptation required)**:
  - **RUST-001** (`ade0a0a0`): `reset_active_turn_id` 防御性设计有效，需剥离 JS 导出脚本与测试类型依赖。
  - **RUST-002** (`c2c48628`): `TurnItem::FileChange` 映射有效，但未实现 `CommandExecution`，且与 RUST-003 及 JS 脚本强耦合。
  - **RUST-003** (`c2c48628`): `edited_files` 扩展超出当前 `data-contract-draft.md` 公共契约，须先经契约修订。
  - **RUST-004** (`87191b85`): `target_source.rs` 的切片步进算法有效命中静态缺陷，但必须与 `294a8f77` 中的 `previous_line_start` `pub` 及 re-export 导出声明打包形成编译闭包，同时剥离 150+ 行 JS 混合脚本。
  - **RUST-005 依赖部分** (`294a8f77`): `previous_line_start` 导出声明属于 RUST-004 必需前置依赖，可复用；游标混用违规被拒绝；默认预算常量放宽破坏部署上限，对 V01–V12（显式传参）影响标未验证；`target.rs` 的 `TARGET_DEFAULT_MAX_*` 属于服务端硬上限，请求端 `resource_limits` 仅能在上限内收紧、超限报 `invalid_resource_limits`，扩大上限需另行治理决策部署上限演进。
  - **RUST-008** (`15988c90`): Goal 状态卡片概念有效，但实现绕过 `codex_wire` facade 钻取 raw JSON，必须重构为 wire 类型化解码驱动。
  - **RUST-009** (`56b863d9`): 关系证据提取思路有效，Rust hunk 仅映射父记录中的 `agent_thread_id/path/kind`，未越界承担 Node 调度；但实现绕过 wire facade，需重构为 wire 类型化解码；依 AD-022 Rust 契约先行，后续调度交由 Node 协调层。
  - **前置依赖** (`0adf0557`): 1GB 指纹预算常数过大，具体容量数值需经容量策略决定。
- **不可直接复用 / 需适配治理 (Inapplicable directly / Policy Decision required)**:
  - **RUST-006** (`5a2fba20`): 直接删除 `conformance.rs` 阶段 3 契约测试断言来取消脱敏，破坏治理基线；必须通过架构治理决策分级脱敏开关。
- **未确认 / 未来聚合不变量 (Prospective Invariant / Inapplicable to current baseline)**:
  - **RUST-007** (`5a2fba20`): 当前基准无 `edited_files` 且使用 source position，不存在碰撞；碰撞系 Gemini `c2c48628` 新增 `files_by_turn` 聚合层引入的副作用。维持未确认状态，作为未来聚合层防碰撞设计不变量。

## 3. 边界与交付物

- 交付物包括：
  - `docs/codex/codex-rollout-collector-gemini-fix-reuse-assessment.md`（完整静态评估报告）
  - `docs/changes/records/CR-20260914-rust-issues-audit-s4.md`（本记录）
  - `docs/codex/codex-rollout-collector-rust-issues-verification.md`（更新 S4 结论关联）
- 未修改任何 Rust 源码、vendor、测试、Node、数据库、Android 或 IPC 代码。
