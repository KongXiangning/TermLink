---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段） - 变更记录
status: archived
record_id: CR-20260315-0139-codex-plan-validation
req_id: REQ-20260309-codex-capability-mvp
commit_ref: a24c5f3
owner: @maintainer
last_updated: 2026-03-15
source_of_truth: product
related_code: []
related_docs: [docs/codex/codex-collaboration-mode-investigation.md, docs/codex/codex-capability-implementation-plan.md, docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/changes/records/INDEX.md]
---

# CR-20260315-0139-codex-plan-validation

## 1. 变更意图

- 背景：已有调查文档把 `/plan` 无法工作归因于 `turn/start` 不支持 `collaborationMode`，但该结论与实际运行时行为不一致。
- 目标：补做独立复核，明确 `/plan` 当前到底“哪里可行、哪里不可依赖”，并把后续接入方法固化到文档。
- 本次边界：只修正文档口径与验证基线，不改运行时代码。

## 2. 实施内容

1. 复核当前机器实际使用的 `codex-cli 0.115.0-alpha.11`，确认 TermLink 网关发送链路已携带结构化 `collaborationMode`。
2. 对同一文件创建任务做默认模式与 plan 模式直接对照，确认 plan 模式下默认不直接执行，而不是“字段完全被忽略”。
3. 更新调查报告、实施计划、REQ 验收矩阵，明确 `turn/plan/updated` / `item/plan/delta` 只能作为增强事件，不能再视为 `/plan` 成立的唯一判据。

## 3. 影响范围

- 文件：
  - `docs/codex/codex-collaboration-mode-investigation.md`
  - `docs/codex/codex-capability-implementation-plan.md`
  - `docs/product/requirements/REQ-20260309-codex-capability-mvp.md`
- 模块：
  - Codex `/plan` 能力判断口径
  - 文档中的 `/plan` 可行性与后续接入策略
- 运行时行为：
  - 无代码变更
  - 后续实现会以“plan 语义已验证、专用 plan 事件不稳定”为前提继续推进

## 4. 回滚方案

```bash
# 回滚本次提交
git revert <commit_ref>

# 或仅恢复本次文档
git checkout <commit_ref>^ -- docs/codex/codex-collaboration-mode-investigation.md
git checkout <commit_ref>^ -- docs/codex/codex-capability-implementation-plan.md
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260309-codex-capability-mvp.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260315-0139-codex-plan-validation.md
```

## 5. 验证记录

- 独立运行时复核：
  - 直接调用当前机器的 `codex-cli 0.115.0-alpha.11`
  - 默认模式请求创建文件：文件被创建
  - plan 模式请求创建同类文件：文件未创建，agent message 明确表示当前为 plan mode 且不会直接执行
- 文档校验：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260309-codex-capability-mvp.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260315-0139-codex-plan-validation.md -Strict`
- 结果：
  - `/plan` 的基础语义成立
  - `turn/plan/updated` / `item/plan/delta` 缺失不能再被解释为“服务端不支持 plan”

## 6. 后续修改入口

- 下次若继续实现 `/plan` UI，优先从以下文档继续：
  - `docs/codex/codex-collaboration-mode-investigation.md`
  - `docs/codex/codex-capability-implementation-plan.md`
  - `docs/product/requirements/REQ-20260309-codex-capability-mvp.md`
- 接入策略应优先遵循：
  - 继续发送结构化 `collaborationMode`
  - 优先消费普通 agent message 作为计划文本
  - 将 `turn/plan/updated` / `item/plan/delta` 作为增强事件，而不是硬依赖
- 如本记录后续被替代，请补充：替代记录 `CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. schema 生成物与运行时行为当前并不完全一致，后续判断能力不能只看单一 schema 片段。
2. 若后续 UI 仍强依赖 `turn/plan/updated` / `item/plan/delta`，则很可能继续误判 `/plan` 为不可用。
