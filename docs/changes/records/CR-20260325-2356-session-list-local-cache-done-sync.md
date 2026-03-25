---
title: REQ-20260324-session-list-local-cache - requirement done sync
status: draft
record_id: CR-20260325-2356-session-list-local-cache-done-sync
req_id: REQ-20260324-session-list-local-cache
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-25
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260324-session-list-local-cache.md, docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md, docs/product/REQUIREMENTS_BACKLOG.md, docs/architecture/ROADMAP.md, docs/changes/CHANGELOG_PROJECT.md, docs/changes/records/INDEX.md]
---

# CR-20260325-2356-session-list-local-cache-done-sync

## 1. 变更意图（Compact Summary）

- 背景：`REQ-20260324-session-list-local-cache` 的实现批次和 follow-up 缺陷已全部落地，但此前因设备离线与 instrumentation 阻塞，需求状态尚未正式流转到 `done`。
- 目标：在 `connectedDebugAndroidTest` 真机验收通过后，完成主线文档状态流转，把 REQ、PLAN、Backlog、Roadmap、Changelog 与历史 CR 索引统一收口。
- 本次边界：不新增运行时代码能力，只做状态流转与文档追踪闭环。

## 2. 实施内容（What changed）

1. 将 `REQ-20260324-session-list-local-cache` 从 `planned` 更新为 `done`。
2. 回写 `PLAN-20260324-session-list-local-cache-impl.md`，将收口验收项与任务 `10` 标记为完成，并清除设备离线阻塞口径。
3. 同步更新 `REQUIREMENTS_BACKLOG`、`ROADMAP`、`CHANGELOG_PROJECT`，把这条需求从“推进中”切换到“已完成”口径。
4. 激活并回填这条 REQ 下历史 draft CR 的 `status + commit_ref`，确保追踪链完整。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：见 `related_docs`
- 模块：需求主线追踪与验收记录
- 运行时行为：无运行时代码变化；影响仅限文档状态与追踪闭环

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复需求完成状态流转
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260324-session-list-local-cache.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md
git checkout <commit_ref>^ -- docs/product/REQUIREMENTS_BACKLOG.md
git checkout <commit_ref>^ -- docs/architecture/ROADMAP.md
git checkout <commit_ref>^ -- docs/changes/CHANGELOG_PROJECT.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260324-session-list-local-cache.md -Strict`
- 结果：待执行
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260324-session-list-local-cache`
- 结果：待执行
- 校验命令：`set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:connectedDebugAndroidTest`
- 结果：2026-03-25 真机 `LYA-TL00 - 10` 通过，34/34 instrumentation 全部通过

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`docs/product/requirements/REQ-20260324-session-list-local-cache.md`、`docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md`
- 提交本批文档后，需要把本 CR 与 `CR-20260325-2219-sessions-closeout-validation` 回填真实 `commit_ref` 并从 `draft` 激活

## 7. 风险与注意事项

1. 本 CR 当前仍是 `draft`，直到有真实提交前不得伪造 `commit_ref`。
2. 后续若再改动这条需求范围，应新增独立 CR，不要直接重写已完成需求的收口记录。
