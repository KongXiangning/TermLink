---
title: REQ-20260222-document-governance
status: planned
owner: @maintainer
last_updated: 2026-02-22
source_of_truth: product
related_code: []
related_docs: [docs/README.md, docs/product/REQUIREMENTS_BACKLOG.md]
---

# REQ-20260222-document-governance

## Meta

- id: REQ-20260222-doc-governance
- title: 文档统一管理与需求流程标准化
- priority: P0
- status: planned
- owner: @maintainer
- target_release: 2026-Q1
- links: `docs/changes/CHANGELOG_PROJECT.md`

## 1. 背景与目标

历史文档分散、命名不统一、同主题多份并存，导致后续需求增量难以追踪。目标是建立唯一入口、状态机与归档机制。

## 2. In Scope

1. 建立 `docs/` 统一分层结构。
2. 迁移主线/运维/指南文档并建立总导航。
3. 引入需求池与需求卡模板。
4. 保留历史文档并标注替代关系。
5. 治理仓库内 skills 文档流程，使 `skills/*/SKILL.md`、对应 agent 卡片与文档追踪规则保持一致。
6. 当实现批次依赖实施计划时，要求文档流程能同步回写 `PLAN` 进度，并在收尾答复中明确当前已实现的计划部分。

## 3. Out of Scope

1. 产品运行时代码功能变更。
2. 为文档治理单独引入复杂自动化平台或外部服务。

## 4. 方案概要

按 `product / architecture / guides / ops / changes / archive` 分层，根目录旧入口保留跳转说明，新增文档必须经过需求池；skill 文档治理需确保 `REQ / PLAN / CR / 收尾答复` 的追踪口径一致。

## 5. 接口/数据结构变更

无代码接口变更；新增文档元数据 front matter 字段规范。

## 6. 验收标准

1. 项目文档均可由 `docs/README.md` 导航到。
2. 同一主题仅一个 `active` 主文档。
3. 旧入口文件可跳转到新位置。
4. 文档驱动实现类 skill 在实现完成后，能够明确标注当前已实现的 plan 部分，并在文档中留痕。

## 7. 测试场景

1. 随机抽取 10 个文档链接，均可打开。
2. 新增需求演练：从需求池创建一份 REQ 并置为 `planned`。
3. 使用 `docs-requirement-sync` 演练一轮实现批次，验证 `PLAN + CR + 最终答复` 三处都能指出已完成的计划部分。

## 8. 风险与回滚

风险：外部链接可能指向旧路径。缓解：根目录保留兼容跳转页。

## 9. 发布计划

文档治理按 4 个提交完成：结构、主线、归档、流程。
