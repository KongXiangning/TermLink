---
title: 会话保留需求文档更新 - 变更记录
status: active
record_id: CR-20260222-2200-session-retention-doc-update
req_id: REQ-20260222-session-retention-reconnect
commit_ref: 36dd134
owner: @maintainer
last_updated: 2026-02-22
source_of_truth: product
related_code: [docs/product/requirements/REQ-20260222-session-retention-reconnect.md, docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/changes/CHANGELOG_PROJECT.md]
related_docs: [docs/changes/records/INDEX.md, docs/changes/records/TEMPLATE_CHANGE_RECORD.md]
---

# CR-20260222-2200-session-retention-doc-update

## 1. 变更意图（Compact Summary）

- 背景：新增“会话长时保留与断联续接”需求后，需要把需求主线与路线图同步。
- 目标：形成可执行 REQ，并在 Backlog/Product/Roadmap/Changelog 中建立一致引用。
- 本次边界：仅文档变更，不含服务端代码实现。

## 2. 实施内容（What changed）

1. 新增 `REQ-20260222-session-retention-reconnect` 需求卡。
2. 在 `REQUIREMENTS_BACKLOG` 中登记该 P0 需求。
3. 在 `PRODUCT_REQUIREMENTS` 与 `ROADMAP` 中补充需求摘要。
4. 在 `CHANGELOG_PROJECT` 记录需求立项。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/requirements/REQ-20260222-session-retention-reconnect.md`
  - `docs/product/REQUIREMENTS_BACKLOG.md`
  - `docs/product/PRODUCT_REQUIREMENTS.md`
  - `docs/architecture/ROADMAP.md`
  - `docs/changes/CHANGELOG_PROJECT.md`
- 模块：文档治理与需求管理流程。
- 运行时行为：无运行时代码行为变化。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert 36dd134

# 方案 B：仅恢复关键文件（示例）
git checkout 36dd134^ -- docs/product/requirements/REQ-20260222-session-retention-reconnect.md
git checkout 36dd134^ -- docs/product/REQUIREMENTS_BACKLOG.md
git checkout 36dd134^ -- docs/product/PRODUCT_REQUIREMENTS.md
git checkout 36dd134^ -- docs/architecture/ROADMAP.md
git checkout 36dd134^ -- docs/changes/CHANGELOG_PROJECT.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：人工检查 5 个文档均出现该 REQ 的同步内容。
- 结果：通过（记录时点对应提交 `36dd134`）。

## 6. 后续修改入口（How to continue）

- 优先从需求卡继续：`docs/product/requirements/REQ-20260222-session-retention-reconnect.md`
- 若进入实现阶段，需新增后续 CR 并关联新 commit。
- 如本记录被替代，填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 本记录对应“文档立项”而非“代码实现”，后续实现必须新增独立 CR。
2. 若 `PRODUCT_REQUIREMENTS`/`ROADMAP` 文案继续变更，需保持 `req_id` 可检索。
