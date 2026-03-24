---
title: REQ-20260318-ws-0001-docs-exp - 冻结实施计划固化
status: draft
record_id: CR-20260323-1454-workspace-impl-phase1
req_id: REQ-20260318-ws-0001-docs-exp
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-23
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md, docs/product/plans/PLAN-20260318-WS-0001-workspace-browser-freeze.md, docs/architecture/ARCH-WS-0001-workspace-browser.md, docs/changes/records/INDEX.md]
---

# CR-20260323-1454-workspace-impl-phase1

## 1. 变更意图（Compact Summary）

- 背景：REQ-WS-0001 已补齐产品边界与架构设计，但“冻结实施顺序、阶段边界、关键技术决策”此前只存在于对话中，尚未固化到项目文档。
- 目标：将 Workspace 的冻结实施计划独立为 plan 文档，并同步 REQ、PLAN 与 ARCH 的引用关系，确保后续实现、代码审查与 CR 拆分均有统一依据。
- 本次边界：仅固化文档，不确认本轮已开始的代码实现有效性，不推进需求状态流转。

## 2. 实施内容（What changed）

1. 新增独立计划文档 `docs/product/plans/PLAN-20260318-WS-0001-workspace-browser-freeze.md`，承接 REQ-WS-0001 的冻结实施顺序、Phase 边界与关键交付口径。
2. 将主 REQ 中完整的冻结计划正文收敛为摘要与链接，避免需求与实施计划双份扩散。
3. 在架构文档中保留冻结实施编排，并补充到独立计划文档的互链引用，明确 REQ / PLAN / ARCH 的职责分层。
4. 明确 `GET /api/workspace/picker/tree` 属于创建会话专用独立接口，不属于 session-bound Workspace API 集合。
5. 明确 `workspace/meta` 可作为旧会话修复入口，将 `workspaceRoot` 判定改写为“通用前置校验 + WorkspaceContextResolver 解析”的两阶段规则，避免与懒初始化语义冲突。
6. 将 session-bound Workspace API 的路径参数命名统一为 `:sessionId`，消除 `REQ` 与 `ARCH` 间的 `:id` / `:sessionId` 混用。
7. 同步本 CR 与变更索引的文档追踪范围，使本次“冻结计划独立成 plan 文档”的动作可回放、可审计。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md`、`docs/product/plans/PLAN-20260318-WS-0001-workspace-browser-freeze.md`、`docs/architecture/ARCH-WS-0001-workspace-browser.md`、`docs/changes/records/CR-20260323-1454-workspace-impl-phase1.md`、`docs/changes/records/INDEX.md`
- 模块：Workspace 文档边界、实施顺序、后续 CR/提交拆分口径
- 运行时行为：无直接运行时代码变更；后续实现必须遵循本次冻结文档中的分阶段边界

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复冻结计划拆分文档
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260318-WS-0001-workspace-browser-freeze.md
git checkout <commit_ref>^ -- docs/architecture/ARCH-WS-0001-workspace-browser.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260323-1454-workspace-impl-phase1.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：未运行严格 REQ 校验，原因是现有 REQ 文本结构尚未满足 `docs-requirement-sync` 的严格模板门禁
- 结果：本次仅完成内容固化；后续若要让 REQ 进入严格门禁，需要先做文档模板对齐

## 6. 后续修改入口（How to continue）

- 后续实现优先按以下顺序推进：
  - 服务端会话模型与 Workspace API
  - 独立 Web Workspace 页面
  - Android 入口与目录选择器
- 后续实现若变更冻结项，必须先更新：
  - `docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md`
  - `docs/product/plans/PLAN-20260318-WS-0001-workspace-browser-freeze.md`
  - `docs/architecture/ARCH-WS-0001-workspace-browser.md`

## 7. 风险与注意事项

1. 当前 REQ/ARCH 已冻结实施顺序，但仓库中已有部分未完成的实验性代码改动，不能自动视为“已符合冻结计划”。
2. 若后续实现要拆成多个提交，建议每个 Phase 或子 Phase 单独新增 CR，避免本 CR 既描述计划固化又混入实现明细。
