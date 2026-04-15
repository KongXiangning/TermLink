---
title: Relay 控制平面与透明中转模式 - 可维护边界收紧记录
status: draft
record_id: CR-20260414-2343-relay-maintainability-boundary
req_id: REQ-20260413-relay-control-plane-and-transparent-transit
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-14
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/changes/CHANGELOG_PROJECT.md, docs/changes/records/INDEX.md]
---

# CR-20260414-2343-relay-maintainability-boundary

## 1. 变更意图（Compact Summary）

- 背景：当前 Relay REQ 已冻结透明中转、安全边界和首期配对模型，但还没有把“首批实现强关联当前 TermLink 后台与 Android App”以及“未来要抽离成独立项目维护”的边界讲清楚。
- 目标：把 REQ 收紧为跨项目产品契约文档，明确当前仓库只是首期孵化载体，后续独立项目仍需沿用稳定的职责边界、稳定标识、状态归属、版本契约和迁移约束。
- 本次边界：本批无关联 PLAN；按 `REQ + CR` 同步，补齐 REQ、产品主线、路线图、项目 changelog 和 CR 索引的一致口径。

## 2. 实施内容（What changed）

1. 修订 `REQ-20260413-relay-control-plane-and-transparent-transit`，新增当前项目耦合与未来独立项目边界、稳定标识与失效边界、状态归属、显式版本协商、生命周期语义、控制面协议切片、控制面状态流转/拒绝语义、App 认领/缓存/错误交互要求，以及审计/观测/迁移治理与验收闭环约束。
2. 同步更新 `PRODUCT_REQUIREMENTS.md`、`ROADMAP.md` 与 `CHANGELOG_PROJECT.md`，使主线摘要明确“当前 TermLink 后台/App 强关联 + 未来独立项目边界 + 单管理员操作面 + 稳定标识/显式失效治理”这一最终口径。
3. 新增本条 CR 并更新 `docs/changes/records/INDEX.md`，记录本批文档修复范围与后续接续入口。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md`、`docs/product/PRODUCT_REQUIREMENTS.md`、`docs/architecture/ROADMAP.md`、`docs/changes/CHANGELOG_PROJECT.md`、`docs/changes/records/INDEX.md`
- 模块：Relay 控制平面产品边界、稳定标识与失效边界、状态归属、生命周期语义、控制面状态流转、App 认领/发现/缓存/错误交互、审计/观测/迁移治理、服务端跨项目契约治理、未来独立仓库/独立部署的维护约束。
- 运行时行为：无直接运行时代码变更；影响后续 PLAN、实现拆分、接口版本治理和验收口径。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md docs/product/PRODUCT_REQUIREMENTS.md docs/architecture/ROADMAP.md docs/changes/CHANGELOG_PROJECT.md docs/changes/records/INDEX.md docs/changes/records/CR-20260414-2343-relay-maintainability-boundary.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260414-2343-relay-maintainability-boundary.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260413-relay-control-plane-and-transparent-transit`
- 结果：以上三项校验均已通过。

## 6. 后续修改入口（How to continue）

- 本批覆盖计划项：无关联 PLAN；本批仅完成 `REQ + Product Summary + Roadmap + Changelog + CR` 的边界收紧与同步。
- 下次修改建议从以下文件继续：`docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 若后续 PLAN 没把这里新增的契约版本治理、状态归属与拆分边界继续落细，实施阶段仍可能回退成“同仓强耦合、靠同步发版维持兼容”的隐性方案。
2. 本批只修正文档约束，不代表已经完成独立项目的实际工程拆分；后续仍需在 PLAN 中单独锁定 `contract/boundary freeze` 与 `standalone extraction/migration` 批次。
