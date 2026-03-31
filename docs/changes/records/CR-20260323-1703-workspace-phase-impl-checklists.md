---
title: REQ-20260318-ws-0001-docs-exp - Workspace 三份实施清单拆分
status: archived
record_id: CR-20260323-1703-workspace-phase-impl-checklists
req_id: REQ-20260318-ws-0001-docs-exp
commit_ref: 103b034
owner: @maintainer
last_updated: 2026-03-23
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md, docs/product/plans/PLAN-20260318-WS-0001-workspace-browser-freeze.md, docs/product/plans/PLAN-20260318-WS-0001-phase1-server-workspace-impl.md, docs/product/plans/PLAN-20260318-WS-0001-phase2-web-workspace-impl.md, docs/product/plans/PLAN-20260318-WS-0001-phase3-android-workspace-impl.md, docs/architecture/ARCH-WS-0001-workspace-browser.md, docs/changes/records/INDEX.md]
---

# CR-20260323-1703-workspace-phase-impl-checklists

## 1. 变更意图（Compact Summary）

- 背景：现有 Workspace 文档已经具备 REQ、ARCH 与 freeze plan，但缺少按 Phase 直接交付给实施者的技术清单，导致后续服务端、Web 和 Android 实施仍需二次解读。
- 目标：把 REQ-WS-0001 按 Phase 1 / 2 / 3 拆成 3 份实施清单文档，并把主 PLAN 收口为冻结边界与索引入口。
- 本次边界：仅新增与更新文档，不推进任何运行时代码实现，不改变既有冻结决策。

## 2. 实施内容（What changed）

1. 新增 3 份 Workspace phase 实施清单文档，分别展开服务端、Web Workspace 页面和 Android 集成的技术目标、接口/状态、数据流、失败场景、测试清单与建议提交拆分。
2. 更新主 `PLAN-20260318-WS-0001-workspace-browser-freeze.md`，新增“实施清单索引”，并将其职责收口为冻结决策、Phase 顺序与交付边界。
3. 更新主 REQ 与 ARCH，补上对 3 份实施清单的正式互链，明确后续实施与 CR 应优先按 phase 文档映射。
4. 为本轮文档拆分新增独立 CR，避免继续把后续实施清单拆分工作混入先前的 freeze plan 文档固化记录。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`docs/product/plans/PLAN-20260318-WS-0001-workspace-browser-freeze.md`、`docs/product/plans/PLAN-20260318-WS-0001-phase1-server-workspace-impl.md`、`docs/product/plans/PLAN-20260318-WS-0001-phase2-web-workspace-impl.md`、`docs/product/plans/PLAN-20260318-WS-0001-phase3-android-workspace-impl.md`、`docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md`、`docs/architecture/ARCH-WS-0001-workspace-browser.md`、`docs/changes/records/CR-20260323-1703-workspace-phase-impl-checklists.md`
- 模块：Workspace 文档体系、实施清单结构、后续 CR/提交映射口径
- 运行时行为：无直接运行时代码变更；后续实现的分工与提交拆分依据发生变化

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 Workspace 实施清单拆分文档
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260318-WS-0001-workspace-browser-freeze.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260318-WS-0001-phase1-server-workspace-impl.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260318-WS-0001-phase2-web-workspace-impl.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260318-WS-0001-phase3-android-workspace-impl.md
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md
git checkout <commit_ref>^ -- docs/architecture/ARCH-WS-0001-workspace-browser.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260323-1703-workspace-phase-impl-checklists.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：未运行严格 REQ 校验；本轮主要核对新增文档互链与结构职责
- 结果：已将 Workspace 实施清单拆为 3 份 phase 文档，并将主 PLAN/REQ/ARCH 的引用关系同步到位

## 6. 后续修改入口（How to continue）

- 后续若进入服务端实现，优先对照 `PLAN-20260318-WS-0001-phase1-server-workspace-impl.md`
- 后续若进入 Web 页面实现，优先对照 `PLAN-20260318-WS-0001-phase2-web-workspace-impl.md`
- 后续若进入 Android 集成实现，优先对照 `PLAN-20260318-WS-0001-phase3-android-workspace-impl.md`
- 后续每个实现提交建议新增独立 CR，并回填对应的 phase 文档引用

## 7. 风险与注意事项

1. 当前 phase 实施清单已经写到实施级粒度，后续若临时改动接口或边界，不应只改单个清单，必须同步 REQ / 主 PLAN / ARCH。
2. 本轮文档拆分没有新增产品决策；若后续实现中发现未冻结项，应先补回文档再进入代码。
