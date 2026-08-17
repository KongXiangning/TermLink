---
artifact_kind: inbox_item
item_id: INBOX-20260815-001
title: Codex rollout 历史读取 Rust Demo 与服务端持久化设计（独立任务）
type: design
source: user
captured_at: 2026-08-15T03:55:00+08:00
relation_to_current_task: unrelated
current_task_id: 20260727-002
description: |
  按用户提供的完整方案（Rust Rollout 历史读取 Demo 及后续服务端持久化计划）实施：
  在 TermLink 新建独立 Rust crate `native/codex-rollout-demo`，只读解析 Codex `rollout*.jsonl`，
  与官方 `thread/read(true)` 规范化结果（codex-app-server-protocol）对照，输出版本化 DTO
  （history-schema: 1）、摘要报告与工具详情，并用真实会话（约 68.5 MiB 的
  019ffbab-8906-7243-af24-cf7a9bf8c997、较小的 019ffeee-e5f5-7f22-89d9-80c211533f7d 等）验证
  数据覆盖与性能。Demo 通过后再冻结持久化接口与 source checkpoint 设计，供未来 Rust 服务端立项。
  本任务与当前 IPC 任务（20260727-002，P0-B.4R）完全独立：不修改 Node 服务、IPC 实时链路、
  Android、数据库或 App；不把 raw-rollouts 作为 App 历史。
evidence: |
  用户 2026-08-15 提交完整方案并要求“实现这个计划”。方案明确：
  - “当前 P0-B.4R 和 IPC 实时同步任务必须先保持独立。该工作应创建新的任务和新的 scope，不能混入当前 IPC 任务。”
  - “Rust Demo 是独立实验和验证任务，不是当前 P0-B 的一部分。”
  - 实施顺序：完成当前 IPC 任务/关闭实施步骤 → 创建新任务与新 scope lock → 安装 Rust toolchain、
    固定 Codex revision → 创建 native/codex-rollout-demo → 全量读取与官方规范化对照 → 自定义
    reducer/projector → 工具详情/token/outcome/Plan/settings 提取 → 真实会话验证 → 字段覆盖报告
    与稳定 DTO → 冻结持久化接口与 checkpoint 设计 → 再单独立项 Rust 服务端存储 → 最后才改 App。
  本 inbox 记录即新任务的注册与 scope lock 载体；当前 active 任务 20260727-002 保持不动。
  环境事实：Codex workspace E:/coding/github/codex 位于 commit bd2de422aa287b97b06ca6425a10935bcf1b3731
  （2026-07-27），rust-toolchain.toml 要求 channel 1.95.0；本机无 rustup/cargo/rustc/MSVC/winget，
  需安装 rustup + x86_64-pc-windows-gnu toolchain + winlibs mingw（免管理员）。
  目标 rollout 文件：C:\Users\kongx\.codex\sessions\2026\08\13\rollout-2026-08-13T23-09-10-019ffbab-8906-7243-af24-cf7a9bf8c997.jsonl
  （68.49 MiB，纯 JSONL 未压缩）；C:\Users\kongx\.codex\sessions\2026\08\14\rollout-2026-08-14T14-21-37-019ffeee-e5f5-7f22-89d9-80c211533f7d.jsonl
  （8.58 MiB）。
suggested_next_action: implement_now
status: captured
---

# Scope Lock（INBOX-20260815-001，独立于 20260727-002）

- Safety mode：guarded（只读解析真实用户日志、外部 Codex workspace 依赖、安装系统工具链）
- Dangerous surfaces：用户真实 rollout 日志（只读，绝不修改）、Codex workspace（只读 path dependency，
  绝不写入）、系统工具链安装（rustup/winlibs，仅新增，不改系统既有配置）

## Allowed Files

- `native/codex-rollout-demo/**`（新增 crate，全部内容）
- `docs/codex/codex-rollout-demo-design.md`（新增，Demo 设计与验证报告）
- `docs/codex/codex-rollout-persistence-plan.md`（新增，未来 Rust 服务端持久化接口/checkpoint 设计）
- `TASKS/inbox/INBOX-20260815-001-codex-rollout-demo.md`（本记录）
- `C:\Users\kongx\.rustup\**`、`C:\Users\kongx\.cargo\**`（rustup 安装产物）
- `D:\ProgramCode\mingw64\**`（winlibs 安装产物）
- 构建目标目录 `native/codex-rollout-demo/target/**`（gitignore）

## Conditional Files

- `docs/workflow/STATUS.md`：仅 Demo 验收通过后同步独立小节，不改当前任务状态行。
- `AGENTS.md`/`CLAUDE.md` 或 `.workflow-system/**`：仅在新增长期 Rust 工作区约束且用户确认后放行。

## Forbidden Files

- `src/**`、`android/**`、`public/**`、`tests/**`、`scripts/**`（TermLink Node/Android 全部代码）
- `src/services/codexIpcClient.js`、`codexIpcFeed.js`、`codexIpcThreadStream.js`、
  `codexOwnerSurfaceTracker.js`、`src/ws/terminalGateway.js`（IPC 冻结区）
- `data/**`、`package.json`、`package-lock.json`、`database` 相关文件
- `docs/workflow/CURRENT_TASK.md`、`CONTRACTS.md`、`DECISIONS.md`、`TASKS/TASK-*`（当前 IPC 任务归属）
- `E:/coding/github/codex/**`（只读引用，写入即越界）
- `C:\Users\kongx\.codex\sessions\**`（真实日志，只读输入）

## 约束

- 不修改任何 rollout 源文件；不写 TermLink 数据库；不向 App 推送任何状态。
- Demo 可使用本地 path dependency 指向 Codex workspace；设计文档必须注明正式服务不得依赖本机绝对路径。
- 固定 Codex revision bd2de422aa287b97b06ca6425a10935bcf1b3731（记录于 Demo 输出与设计文档）。
- 当前单用户场景不做凭据脱敏，但 DTO 预留 `redactionPolicy` 字段。
- 同一输入重复运行结果必须完全确定（同 item keys、同 hashes、同 report）。
