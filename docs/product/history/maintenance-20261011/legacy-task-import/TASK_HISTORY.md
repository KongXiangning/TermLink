# TermLink 历史 task 总账（2026-10-11）

仅当前工作副本。既有 6 项 journal 与旧资料中 36 个独立任务身份合计 **42 项**；其中 34 个旧任务有可确认历史关闭或暂停事实，已补入统一查询。未重开、关闭或执行业务任务，导入的是过去已经发生的事实。

旧资料状态：**31 项完成/归档声明、1 项用户停止、2 项暂停、1 项关闭未确认、1 项被替代**。现统一查询 **40 项：{"closed":38,"paused":2}**。关闭不等于全部需求完成；原 6 项也有 partial、未验证或保留事项，不能直接换算成业务完成数。

任务身份按原 ID 和 document_id 去重；TASK003 与现 TASK004 分开；inbox、索引、模板及重复快照不计数。逐项原文、SHA256、证据章节及 journal refs 见 [tasks.json](tasks.json)。

## 旧任务索引

| 原 ID | 任务目标 | 历史状态/处置 | 原记录 |
| --- | --- | --- | --- |
| 20260716-002 | 修复 Web Codex 会话配置数据与头部重复路径 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md) |
| 20260617-002 | 网页版 Codex 会话页优先使用 IPC 数据通道并保留原通道降级 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md) |
| 20260513-001 | 提供跨平台发行安装脚本与一键 mTLS 证书工具 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md) |
| 20260511-001 | 隔离 `node --test` full suite 挂起点并判断 gate 处理方式 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md) |
| 20260510-001 | 补任务 20260504-001 的完整 Android smoke 与归档判断 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md) |
| 20260508-001 | Codex 输入区支持多 skill 内联插入并持久展示附件上下文 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md) |
| 20260504-001 | Scope Codex history and active thread state by session cwd | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md) |
| 20260503-001 | Clarify Codex App skill cwd scope | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md) |
| 003 | 保留 Rust 采集历史的真实路径与内容，完成 Node 产品历史数据库和可供 App 后续只读加载的历史接口 | stopped-by-user | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-003-rust-node-app.md) |
| 002 | 修复 rollout 采集阻断并验证隔离闭环。 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-002-rollout.md) |
| 001 | 建立采集到存储业务用例矩阵，核实当前 worktree 的 RUST-001 至 RUST-009，并评估 Gemini 修复复用。 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-001-rust-issues-audit-worktree-rust-001-rust-009-gemini.md) |
| 20260828-001 | 4.5 Node analyzer consumer/coordinator 迁移 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md) |
| 20260827-001 | 修正 4.5 Rust target delivery identity 的确定性派生 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260827-001-codex-target-delivery-identity-repair.md) |
| 20260826-001 | 4.5 阶段 Rust analyzer 公共协议一次性迁移与 legacy 字段退役 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md) |
| 20260825-003 | 收敛 Node↔Rust 接口文档，移除 discovery/fingerprint 业务接口语义 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260825-003-codex-node-rust-interface-contract-convergence.md) |
| 20260823-001 | 重订 Codex Rollout Collector 会话 lineage 发现与读取设计 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md) |
| 20260820-003 | Codex Rollout Collector 阶段 4：分析器协议、Node 隔离运行时与 conformance 完整性 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260820-003-codex-rollout-collector-stage-4-runtime-and-conformance.md) |
| 20260820-002 | Codex Rollout Collector 阶段 3：Adapter、事件归约与生命周期 conformance | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260820-002-codex-rollout-collector-stage-3-adapter-reducer-conformance.md) |
| 20260820-001 | Codex Rollout Collector 阶段 2：输入层与兼容层补齐 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md) |
| 20260819-001 | Codex Rollout Collector 正式模块初始化与兼容层落地 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md) |
| 20260726-002 | Android / 服务端持久诊断日志与问题取证 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md) |
| 20260726-001 | TASK-20260726-001 Android App 前台独立息屏时间 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260726-001-android-foreground-screen-timeout.md) |
| 20260722-002 | 支持 Android Codex 对话记录直接打开图片与文档 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260722-002-android-codex-open-conversation-files.md) |
| 20260722-001 | TASK-20260722-001：修复 Android Codex 会话页入口与 composer 布局 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md) |
| 20260719-001 | TASK-20260719-001：修复 Android 文档阅读字号与移动端横向溢出 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md) |
| 20260718-003 | TASK-20260718-003：重写 Android/Web 共享文档工作区 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md) |
| 20260718-002 | TASK-20260718-002：美化 Android Codex 会话页与弹层交互 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md) |
| 20260715-002 | 优化网页版登录、配置、页面布局与终端交互 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md) |
| 20260629-001 | 按 termlink-demo 改造服务端与安卓端 Codex 实时同步 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md) |
| 20260618-001 | 修复刷新页面重复新建 TERMINAL 会话 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md) |
| 20260617-001 | 网页版 Codex 会话页按安卓端设计对齐 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260617-001-web-codex-session-android-redesign.md) |
| 20260616-001 | 主页主链路内整合 Codex 会话入口与 Codex IPC 会话页 | unconfirmed | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md) |
| 20260615-002 | 为网页版添加基于 IPC 实时同步的 Codex 会话页 | historical-completion-declaration | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md) |
| 20260727-002 | Codex 单权威路由与 TermLink Owner 控制面修复 | paused-historical | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md) |
| 20260615-001 | 接入 codex-ipc 实现 App Codex 会话页实时同步 | paused-historical | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/paused/TASK-20260615-001-app-codex-ipc-realtime-sync.md) |
| 20260715-001 | 提供 Windows x64 安装包和统一配置工具 | superseded-with-release-gap | [原文](E:/coding/TermLink-rust-source-resolution-codex/TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md) |

## 实际业务范围与限制

五月：cwd 范围调查/修复、Android smoke、多 skill 和附件上下文、测试挂起调查、跨平台安装及 mTLS 工具。调查/验证 task 完成只代表该次调查/验证完成。

六月至七月：Web IPC 会话、主页会话入口、Android/Web 视觉及配置、刷新复用会话、只读 Workspace 和移动阅读、附件打开、息屏设置、持续诊断。IPC 旧 Goal/fallback 声明须按当前冻结契约解释，不复活已撤回的设计。息屏真机定时等待和诊断 full-suite 超时等原缺口保留。

八月及旧数字任务：Rust bootstrap→输入层→Adapter/reducer→stdio→lineage→接口收敛→4.5协议→交付身份、Node隔离 consumer、审计及 rollout 修复。隔离层交付不等于产品数据库、App、IPC或发行完成。旧 TASK003 被用户停止；其后现 TASK004/005另有独立范围与证据。

## 两项仅保留资料身份

- 20260616-001：有 spa_all_5_steps_completed 快照，但生命周期 active，未找到关闭事实。保留交付线索，不自动认定已关闭，也不恢复为当前活动任务。
- 20260715-001：后继 Web UX 任务明确记录 superseded、实现已完成、clean Windows x64 host 发布证据缺失。没有独立完整包，保留可定位片段，不伪造 runtime 生命周期。

## 已有后续安排及未读取范围

暂停包保留 B4R/B5/P0-C/P1 和原恢复条件；后继独立任务已处理的范围由其自身记录说明，未自动关闭暂停包。没有因导入生成新执行顺序或采纳新建议。

读取限于任务身份、目标/原始要求/边界、外层归档/暂停结论、验证及保留事项。大型 CURRENT_TASK 内嵌逐步骤历史、全部执行附件及每个 Git 对象没有重新全面验证。原文与固定附件保留；其他工作副本未合并。
