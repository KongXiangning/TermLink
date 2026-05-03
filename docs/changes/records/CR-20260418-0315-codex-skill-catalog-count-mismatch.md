---
title: Codex Android 本机 skills 列表缺项问题记录
status: draft
record_id: CR-20260418-0315-codex-skill-catalog-count-mismatch
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-18
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt, src/ws/terminalGateway.js]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260418-0315-codex-skill-catalog-count-mismatch

## 1. 变更意图（Compact Summary）

- 背景：同一套 Codex skill 能力在不同入口上的可见数量不一致。需要注意：App 中 Codex 会话有自己的 `cwd`，不同会话路径对应 Codex CLI 中不同路径，读取到的 skills 也可以不同。
- 目标：先把“本机扩展工具 skills 缺项”冻结为独立缺陷记录，并记录已确认的运行时根因：非开发环境 `skills/list {}` 按 app-server 进程 cwd 枚举，而不是按当前 App session `cwd` 枚举。
- 本次边界：本批只记录缺陷、根因证据和最小修复入口，不修改 Android、gateway 或 skill 注册逻辑。

## 2. 实施内容（What changed）

1. 新建本条 draft CR，留痕“`codex-cli=完整`、测试机扩展工具=`18`、本机扩展工具=`10`”这一跨环境不一致现象。
2. 将排查范围收口到四段链路：App 当前 Codex session `cwd`、上游 `skills/list` 原始返回、`terminalGateway` 透传/规范化、Android 扩展工具面板解析与展示。
3. 补充运行时复现结论：`thread/start cwd=E:\coding\TermLink` 后，如果后续 `skills/list` 仍发送 `{}`，app-server 会按进程 cwd 枚举；在 `D:\ProgramCode\termlink-win` 中显式传入 `cwds:["E:\\coding\\TermLink"]` 后可返回完整项目 skill 列表。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/changes/records/CR-20260418-0315-codex-skill-catalog-count-mismatch.md`
  - `docs/changes/records/INDEX.md`
- 模块：Codex session `cwd`、Codex skills catalog 枚举、gateway `skills/list` 透传、Android 扩展工具 skills 列表展示。
- 运行时行为：本批无运行时变化；当前仅完成缺陷留痕与根因证据同步。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档记录
git checkout <commit_ref>^ -- docs/changes/records/CR-20260418-0315-codex-skill-catalog-count-mismatch.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验依据：已人工确认三组现象口径不一致，并通过 app-server 服务层复现 `skills/list` 参数差异
- 现象 1：`codex-cli` 可见完整 skills 列表
- 现象 2：测试机“扩展工具”可见 18 条 skill
- 现象 3：本机“扩展工具”仅可见 10 条 skill
- 复现 1：在 `D:\ProgramCode\termlink-win` 进程 cwd 下，`skills/list {}` 返回 14 条，分组 cwd 为 `D:\ProgramCode\termlink-win`
- 复现 2：同一服务中传入 `skills/list { cwds:["E:\\coding\\TermLink"] }` 返回 45 条，分组 cwd 为 `E:\coding\TermLink`，包含 `investigate-root-cause`
- 结果：根因已收敛为 `skills/list` 请求未绑定当前 App session `cwd`；尚未实施代码修复

## 6. 后续修改入口（How to continue）

- 下次修改建议优先从以下文件继续：`src/ws/terminalGateway.js`、`android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`、`android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`、`android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt`、`android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt`
- 首轮修复建议从 `src/ws/terminalGateway.js` 继续：在 `codex_request` 转发 `method === "skills/list"` 前，如果请求未显式传入 `cwds`，则使用当前 session `cwd` 注入 `cwds:[session.cwd]`。
- 如果未来客户端已经主动传入 `cwds`，gateway 应尊重显式参数；如果需要用户手动刷新 catalog，可评估是否同时透传 `forceReload:true`。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前根因不在 Android UI 展示层；仅修列表渲染无法补齐上游未返回的 skills。
2. `thread/start` 的 `cwd` 与 `skills/list` 参数是两个不同输入；不能假设前者会自动影响后者。
