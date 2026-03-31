---
title: Codex 顶部状态栏文档同步 - 变更记录
status: archived
record_id: CR-20260318-1541-codex-status-strip-doc-sync
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 1671e35
owner: @maintainer
last_updated: 2026-03-18
source_of_truth: product
related_code: [public/codex_client.html, public/terminal_client.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/codex-capability-implementation-plan.md, docs/codex/codex-phase5-permission-context-plan.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/architecture/CURRENT_STATE.md, docs/changes/records/INDEX.md]
---

# CR-20260318-1541-codex-status-strip-doc-sync

## 1. 变更意图（Compact Summary）
- 背景：当前实现已把顶部“查看线程”入口移除，只保留 Codex 状态、工作区路径、额度与刷新时间，但文档仍残留“顶部线程摘要 / 点按进入 Threads”的旧描述。
- 目标：把需求、实施计划、产品主线和当前状态统一改成“顶部轻量状态栏”口径，避免后续再次把线程入口恢复回顶部。
- 本次边界：仅同步文档与记录，不修改当前代码实现。

## 2. 实施内容（What changed）
1. 主 REQ 将首页顶部描述从“当前线程摘要”调整为“顶部轻量状态栏”，并明确状态栏不承担线程查看、线程跳转或权限切换入口。
2. 实施计划、产品主线、路线图与 Phase 5 专项计划统一注明：顶部状态栏可保留，但只用于展示状态、工作区和额度信息。
3. `CURRENT_STATE` 同步记录当前代码事实，作为后续实现与 review 的基线口径。

## 3. 影响范围（Files/Modules/Runtime）
- 文件：
  - `docs/product/requirements/REQ-20260309-codex-capability-mvp.md`
  - `docs/codex/codex-capability-implementation-plan.md`
  - `docs/codex/codex-phase5-permission-context-plan.md`
  - `docs/product/PRODUCT_REQUIREMENTS.md`
  - `docs/architecture/ROADMAP.md`
  - `docs/architecture/CURRENT_STATE.md`
  - `docs/changes/records/INDEX.md`
- 模块：Codex 首页信息架构、文档基线、后续 UI 变更边界。
- 运行时行为：无代码改动；仅防止后续实现因文档歧义而恢复顶部线程入口。

## 4. 回滚方案（命令级）
```bash
# 方案 A：回滚本次文档提交
git revert <commit_ref>

# 方案 B：仅恢复单个文档
git checkout <commit_ref>^ -- <path/to/file>
```

## 5. 验证记录（Tests/Checks）
- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260309-codex-capability-mvp.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260318-1541-codex-status-strip-doc-sync.md -Strict`
- 结果：待本次文档修改完成后执行。

## 6. 后续修改入口（How to continue）
- 后续若重新设计首页顶部信息层，必须先更新主 REQ 与实施计划，再进行代码改动。
- 若未来需要恢复顶部线程入口，应新增单独 CR，明确它与 Threads 二级入口的职责边界。

## 7. 风险与注意事项
1. 若只改局部文档而不改主 REQ / CURRENT_STATE，后续实现仍可能按旧描述恢复顶部线程摘要。
2. 当前仓库存在未提交的前端改动，本记录不覆盖那些代码差异，只同步产品边界。
