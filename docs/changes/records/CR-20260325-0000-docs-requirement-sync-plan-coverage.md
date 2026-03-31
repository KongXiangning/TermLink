---
title: REQ-20260222-doc-governance - docs-requirement-sync plan coverage sync
status: active
record_id: CR-20260325-0000-docs-requirement-sync-plan-coverage
req_id: REQ-20260222-doc-governance
commit_ref: c805842
owner: @maintainer
last_updated: 2026-03-25
source_of_truth: code
related_code: [skills/docs-requirement-sync/SKILL.md, skills/docs-requirement-sync/agents/openai.yaml, skills/docs-requirement-sync/agents/claude.md, .codex/skills/docs-requirement-sync/SKILL.md, .claude/skills/docs-requirement-sync/SKILL.md, skills/SKILLS_CATALOG.md]
related_docs: [docs/product/requirements/REQ-20260222-document-governance.md, docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md, docs/changes/records/CR-20260324-2331-session-list-cache-store-foundation.md, docs/changes/records/INDEX.md, docs/changes/CHANGELOG_PROJECT.md]
---

# CR-20260325-0000-docs-requirement-sync-plan-coverage

## 1. 变更意图（Compact Summary）

- 背景：现有 `docs-requirement-sync` 只强制 `REQ + CR` 追踪，无法保证实现批次结束后把已完成的 plan 部分写回实施计划，也无法保证收尾答复明确指出当前已实现的计划范围。
- 目标：升级 `docs-requirement-sync` skill，使其在有 linked PLAN 时强制同步 `PLAN + CR + 最终答复`，并补一个真实示例把 `REQ-20260324-session-list-local-cache` 的第一阶段进度回写到计划文档。
- 本次边界：只更新仓库内 skill 文档、agent 卡片、治理类 REQ/摘要文档和一个真实 plan/CR 示例；不新增新的校验脚本。

## 2. 实施内容（What changed）

1. 更新 `docs-requirement-sync` 的 `SKILL.md`、`openai.yaml`、`claude.md`，要求实现前定位计划、实现后同步 `PLAN + CR`，并在最终答复展示已完成的计划部分。
2. 同步 `.codex/skills/`、`.claude/skills/` 镜像，以及 `skills/SKILLS_CATALOG.md`，保证本地 skill 三处定义一致。
3. 本批覆盖计划项：将 `REQ-20260324-session-list-local-cache` 的实现计划中“8.1 第一步：抽出缓存模型与存储层”与“13.1 新增 SessionListCacheStore.kt 和缓存容器类”标记为已完成，并在对应 CR 中补充计划覆盖描述。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：见 `related_code` 和 `related_docs`
- 模块：仓库内文档驱动实现流程、skill 使用约定、实施计划进度回写示例
- 运行时行为：无产品运行时代码变更；后续使用 `docs-requirement-sync` 时，实施批次必须同时更新 `PLAN + CR` 并在答复中说明计划覆盖范围

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 skill 与文档流程改动
git checkout <commit_ref>^ -- skills/docs-requirement-sync/SKILL.md
git checkout <commit_ref>^ -- skills/docs-requirement-sync/agents/openai.yaml
git checkout <commit_ref>^ -- skills/docs-requirement-sync/agents/claude.md
git checkout <commit_ref>^ -- .codex/skills/docs-requirement-sync/SKILL.md
git checkout <commit_ref>^ -- .claude/skills/docs-requirement-sync/SKILL.md
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260222-document-governance.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260324-2331-session-list-cache-store-foundation.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260222-document-governance.md -Strict`
- 结果：待本批修改完成后回填
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md -Strict`
- 结果：待本批修改完成后回填

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`skills/docs-requirement-sync/SKILL.md`、`skills/docs-requirement-sync/agents/openai.yaml`、`docs/product/plans/PLAN-20260324-session-list-local-cache-impl.md`
- 如后续把 plan 覆盖校验自动化，再新增独立 CR，不在本记录里混入脚本开发
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前批次只升级了 skill 约定，尚未新增脚本级强制校验；后续仍依赖执行者按新 runbook 落地 `PLAN + CR` 回写。
2. 现有历史 CR 不会被自动补齐“计划覆盖”字段；从本批之后的新实施批次开始执行新规则即可。
