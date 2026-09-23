# STATUS.md

<!-- project-content-migration:2026-09-13 -->

## 项目概览

- TermLink：Node.js CommonJS / Express / WebSocket、Android Kotlin + WebView。
- 当前治理：vNext 0.18.0；canonical CURRENT_TASK 000 closed/archived 是非执行业务 Bootstrap 基线。20260828-001 已归档，限于隔离 Node collector / Rust target。
- 本页整理旧 STATUS、DECISIONS、归档任务和现有画像；旧测试记录没有在迁移时全部重跑。
- 当前状态：completed

## ✅ 已完成且稳定

以下仅按原验收范围解释。

- Sessions API、JSON 持久化和 idle 保留；Android 原生壳 + WebView；Workspace 只读浏览/diff；BasicAuth 与浏览器登录兼容。接口边界见 CONTRACTS.md。
- 已绑定 conversation 的 IPC-first 实时同步、Android A/B 隔离和 owner fallback 是现有项目约束；healthy IPC 是实时正文、operation、turn 与运行态的权威，canonical thread/read 仅为有界异常恢复。
- Rollout Collector P0-RC.1、阶段 2/3、阶段 4 Rust↔Node analyzer 与 20260828-001 的 Node 4.5 consumer/coordinator，验收均限于隔离 artifact。归档记录有 Node collector 147/147、Rust protocol 70/70；这些是历史证据，未由本轮重跑完整 Rust 套件，不代表产品 DB、IPC、Android 或 release 接通。
- Web Codex IPC、Web 登录/会话/工作区和 Android 交互任务按各自归档范围解释，不能合并为整体发布就绪。
- 公共 backfill 有界补齐并安全衔接 append
- FileChange/CommandExecution 历史映射与去重
- 真实 Node→Rust stdio→三个 File stores 的重启、重试和 append 验证；C1/C2/C3 六槽验收及 clean review

## 🔨 正在开发

- 尚无经 vNext prepare/confirm 建立的活动业务任务。两份 paused 和三份 inbox 保留原文及未完成义务，不是原生 vNext resume 状态。

## 📋 待开发

- 隔离 Node collector 到既有产品 server/DB、IPC、Android 的集成与真实流程验证；遵守 AD-022 的 Rust/Node owner 边界。
- Relay 控制平面、formal native crate 兼容字段物理清理、source-scope 风险修复均需独立任务。
- integration、e2e、deploy 验证入口尚未绑定；Android unit、真机和 release gate 最终口径需按任务确定。
- 暂停包：TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md。后续先核对原文和现行产品，再建明确 vNext 计划。

## ⚠️ 已知风险 / 观察点

- RI-4.5-004-016 按用户决定 deferred；25 项 future-step gap 未转为产品完成。RD-4.5-006-001 pre-I/O path confinement 与 RI-4.5-007-011 source hash/append prefix digest interruptibility 仍需独立 source-scope 处理。
- fingerprint/prefix anchor、retention_profile、item/source revision 的 formal 兼容字段未物理移除；AD-021 排除其 4.5 公共业务接口语义，旧 AD-011/AD-012 不能反向覆盖。
- Windows clean-host release、真实 owner pending action/PLAN 跨宿主、Android history/media 生产环境和 A→B→A 手工验收仍有历史限制；本轮无发布、部署、canary 或 benchmark 证据。
- 外部 API consumer 未知；terminalGateway.js 耦合度高。README 端口、Android release config、Node full-suite 的旧故障本轮未重验，既不能称通过也不能断言仍失败。
- App 内 Skill 输入解析扫描 .codex/skills、skills、.claude/skills；安装在 .agents/skills 的 11 个 vNext 公共 Skill 不自动进入该产品目录。本轮不改 Gateway。
- Bootstrap 收据绑定 adopt 当时字节。内容迁入后 realign 分类 stale，不能将 Runtime validate 或软件校验通过写作收据 clean；不得手改收据或无审查地重跑会覆盖项目说明的 realign。
- 产品数据库、正式业务入口、历史发布和 App 接入仍属后续独立任务；本轮未部署。

## ❌ 已移除 / 推迟

- 旧 workflow-system generator、sync、health 和 GATE-001 已退役；历史文本仅在原文备份中保留。
- RI-4.5-004-016、RD-4.5-006-001、RI-4.5-007-011 按既有决定保持 deferred，不因迁移自动解决。

## 🔜 下一检查点

- 明确新业务目标后经 vNext prepare-task 建计划；产品集成、deferred source 风险及 paused 工作分别处理。
- 若需对齐 Bootstrap 收据，先解决 realign 保留项目专有文档和宿主说明的问题，再走正常入口。
- 旧 STATUS 更新日志仍原字节保留在 .workflow-system/legacy/one-time-codex-20260913/docs/workflow/STATUS.md，其旧“当前任务”和旧命令不是现行状态。
- 后续产品集成须另立任务，经 prepare-task 确认范围与验收。

## 最近更新记录


- 2026-09-13：按原归档和项目记录完成一次性 vNext 内容迁移；本轮实际校验和未重验项目另见迁移证据。

<!-- BEGIN vNext close-task STATUS reconciliation -->
- task_id: 002
- task_slug: rollout
- document_id: doc-05c82c8a6e6c9181adfc2be2
- archive_path: TASKS/TASK-002-rollout.md
- archive_revision: a6bd8a5df2e8fc218ee67bd5d1f448870809ab61869191d4207b062d78e582ec
- source_revision: d465512ce44684d64d6e8cd8129112d272db2bc37d22449dfa73c7c682e6408e
- proposal_idempotency_key: close-002-status-f8a6635c-20260923
- delta_digest: d78104a90d9359880f3ef519e7714c260686aa93dbc536d43313e07f501a047b
- status: completed
- summary: "Task 002 rollout 采集阻断修复与真实隔离链路验证已完成并归档；本地提交 f8a6635c1e8d00f236631e7e278bd60893ac74bc。"
- completed_items: ["公共 backfill 有界补齐并安全衔接 append","FileChange/CommandExecution 历史映射与去重","真实 Node→Rust stdio→三个 File stores 的重启、重试和 append 验证；C1/C2/C3 六槽验收及 clean review"]
- remaining_risks: ["产品数据库、正式业务入口、历史发布和 App 接入仍属后续独立任务；本轮未部署。"]
- next_checkpoint: "后续产品集成须另立任务，经 prepare-task 确认范围与验收。"
- evidence_refs: ["TASKS/TASK-002-rollout.md","docs/workflow/CURRENT_TASK.md","docs/codex/codex-rollout-isolated-closure-verification.md","docs/changes/records/CR-20260916-rollout-blockers-s3.md"]
<!-- END vNext close-task STATUS reconciliation -->
