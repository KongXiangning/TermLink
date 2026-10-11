# TASK-20260503-001-clarify-codex-app-skill-cwd-scope

## 任务元数据

- 项目：termlink
- 项目类型：application
- 任务 ID：20260503-001
- 任务标题：Clarify Codex App skill cwd scope
- 任务 slug：clarify-codex-app-skill-cwd-scope
- 最终状态：completed
- 创建时间：2026-05-03
- 归档时间：2026-05-03

## 原始任务包快照

- 用户原始需求：重新调查 App 中新增 skill 不可见的问题，并审核当前文档是否把 App 逻辑写清楚：Codex App 中不同会话会打开不同路径，不同路径对应 Codex CLI 中不同 cwd，读取到的 skills 也不同。
- 问题陈述：上一轮把非开发环境服务部署目录误判为 App skill catalog 的主要作用域。代码事实显示 Android 创建 Codex session 时会携带用户选择的 `cwd`，Codex skill 输入路径也按该 `cwd` 下的 `.codex/skills` / `skills` / `.claude/skills` 查找。文档缺少 “App skill catalog 与当前 Codex 会话 cwd 绑定” 的明确契约。
- 最小可接受结果：
  - 文档明确说明 App / CLI 的 skill 可见性按当前 Codex 会话 `cwd` 对齐
  - 文档避免误导维护者把服务端 PM2 部署目录当作 App skill 目录
  - 既有缺项 CR 的后续排查入口改为先核对当前会话 `cwd` 与该路径下的 host-local skill mirrors

## 实际改动摘要

- 在 `docs/workflow/CONTRACTS.md` 补充 `Codex session cwd / skills discovery scope` 契约。
- 在 `ARCHITECTURE.md`、`DATABASE.md`、`README.md` 补充 App / CLI skill 可见性与当前 Codex session `cwd` 对齐的说明。
- 在 `docs/changes/records/CR-20260418-0315-codex-skill-catalog-count-mismatch.md` 补充根因证据和后续修复入口。
- 在 `docs/workflow/CURRENT_TASK.md` 记录调查证据、完成状态和下一代码批次入口。

## 契约与决策记录

- 确认 `cwd` 是 Codex session 的执行上下文，也是 skill discovery 的项目作用域，不只是 UI 显示路径。
- 确认 App skill catalog 的排查第一事实是当前 Codex session `cwd`，不是 PM2 / Node 服务部署目录。
- 确认 `thread/start cwd=...` 不会让后续 `skills/list {}` 自动按该 cwd 枚举；`skills/list` 必须显式携带 `cwds:[session.cwd]`。
- 本任务只修改文档，不修改运行时代码。

## 验证与交付证据

- 运行时复现 1：在 `D:\ProgramCode\termlink-win` 进程 cwd 下，`skills/list {}` 返回 14 条，分组 cwd 为 `D:\ProgramCode\termlink-win`。
- 运行时复现 2：同一服务传入 `skills/list { cwds:["E:\\coding\\TermLink"] }` 返回 45 条，分组 cwd 为 `E:\coding\TermLink`，包含 `investigate-root-cause`。
- 验证命令：`bun run workflow:health`
- 验证结果：通过，`workflow-runtime health: OK`

## 发布后验证证据

- Release mode: none
- Deploy source: none
- Target environment: local
- Health checks: 文档 diff 人工核对；`bun run workflow:health` 通过
- Canary window: none
- Performance baseline: none
- Rollback / recovery: 回滚本轮 `CURRENT_TASK.md`、`CONTRACTS.md`、`ARCHITECTURE.md`、`DATABASE.md`、`README.md`、既有 CR 的文档修正
- Release evidence: 不涉及部署；workflow health OK
- canary result: not applicable
- performance baseline result: not applicable
- rollback status: not exercised
- remaining observation: 下一代码批次需要实现并验证 gateway/client 侧 `cwds` 注入

## Lessons 回写

- 本任务未直接写入 `docs/workflow/LESSONS.md`。
- 可复用经验：调查 App skill 可见性时，不能把服务部署目录等同于当前 Codex session `cwd`；先抓 `skills/list` 参数和返回分组 cwd，再判断文件同步或 UI 展示问题。

## 后续关联

- 下一任务建议：修复 `skills/list` cwd 绑定。
- 最小修复入口：`src/ws/terminalGateway.js` 的 `codex_request` 转发逻辑。
- 建议行为：对 `method === "skills/list"` 且请求未显式传入 `cwds` 的情况注入 `cwds:[session.cwd]`，保留客户端显式传入的 `cwds`。
- 建议验证：在部署目录进程 cwd 下，session cwd 指向 `E:\coding\TermLink` 时，`skills/list {}` 经 gateway 返回完整项目 skill 列表并包含 `investigate-root-cause`。
