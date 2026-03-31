---
title: REQ-20260329-language-normalization 需求立项与文档建设
status: archived
record_id: CR-20260329-1500-language-normalization-req-init
req_id: REQ-20260329-language-normalization
commit_ref: cfd2e2e
owner: @maintainer
last_updated: 2026-03-29
source_of_truth: code
related_code: []
related_docs: [docs/product/requirements/REQ-20260329-language-normalization.md, docs/product/plans/PLAN-20260329-language-normalization-impl.md, docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/changes/records/INDEX.md]
---

# CR-20260329-1500-language-normalization-req-init

## 1. 变更意图（Compact Summary）

- 背景：TermLink 当前无 i18n 框架，438+ 条 UI 硬编码字符串中英混杂，无法根据系统语言自动切换。
- 目标：完成需求立项，建立 REQ 需求卡、PLAN 实施清单，同步更新需求池与产品主线。
- 本次边界：仅文档建设与需求规划，不涉及代码实现。

## 2. 实施内容（What changed）

1. 新建 `docs/product/requirements/REQ-20260329-language-normalization.md` — 完整需求卡，包含背景、范围、方案概要、验收标准、测试场景、风险与发布计划。
2. 新建 `docs/product/plans/PLAN-20260329-language-normalization-impl.md` — 四阶段实施清单，覆盖框架搭建、Web 字符串迁移、Android i18n、收口验收。
3. 更新 `docs/product/REQUIREMENTS_BACKLOG.md` — 在需求池表格中新增 `REQ-20260329-language-normalization` 条目。
4. 更新 `docs/product/PRODUCT_REQUIREMENTS.md` — 在 P0 必须保持列表中新增第 8 条"系统语言自动适配"。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：4 个文档文件（2 新建 + 2 更新）
- 模块：无代码模块变更
- 运行时行为：无变更

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅删除新增文件并恢复修改的文件
git checkout <commit_ref>^ -- docs/product/REQUIREMENTS_BACKLOG.md docs/product/PRODUCT_REQUIREMENTS.md
rm docs/product/requirements/REQ-20260329-language-normalization.md
rm docs/product/plans/PLAN-20260329-language-normalization-impl.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：目视确认四个文件内容完整、链接互相一致
- 结果：待提交后确认

## 6. 后续修改入口（How to continue）

- 下次修改建议从 PLAN 的 Phase 1（框架搭建）开始实施
- 实施阶段的 CR 应引用 `req_id: REQ-20260329-language-normalization`

## 7. 风险与注意事项

1. 本次仅为文档规划，无代码风险。
2. 后续实施时需逐 Phase 新增独立 CR 记录。
