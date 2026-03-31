---
title: Workspace REQ/ARCH 文档扩展 - 变更记录
status: active
record_id: CR-20260323-0954-workspace-doc-sync
req_id: REQ-20260318-ws-0001-docs-exp
commit_ref: 3c0f2da
owner: @maintainer
last_updated: 2026-03-23
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md, docs/architecture/ARCH-WS-0001-workspace-browser.md, docs/changes/records/INDEX.md]
---

# CR-20260323-0954-workspace-doc-sync

## 1. 变更意图（Compact Summary）

- 背景：当前 Workspace 需求和架构文档只覆盖了基本浏览与 Diff 能力，对创建会话时的路径选择、大文件查看分级、旧会话兼容和移动端独立界面边界定义不够完整。
- 目标：补齐 Workspace 第一阶段的产品边界与架构约束，使后续拆分开发、原型验证和主仓接入都有一致依据。
- 本次边界：仅更新 REQ 与 ARCH 文档，不修改现有代码实现。

## 2. 实施内容（What changed）

1. 扩展主 REQ，补入 Codex Workspace Path 选择、默认进入目录规则、文本文件分级查看、旧会话兼容和 Android 独立工作区界面等需求。
2. 扩展架构设计，明确会话创建链路、Workspace API 边界、文件查看四级模型、Git 状态缓存策略，以及 Android `WorkspaceActivity + Web 页面` 的承载方式。
3. 为这次文档同步新增 CR，记录变更意图、影响范围与后续接续入口。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md`、`docs/architecture/ARCH-WS-0001-workspace-browser.md`、`docs/changes/records/CR-20260323-0954-workspace-doc-sync.md`
- 模块：Workspace 产品边界、架构拆分方式、后续实现入口与验收口径
- 运行时行为：无代码改动；仅影响后续开发与评审依据

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚本次文档提交
git revert <commit_ref>

# 方案 B：仅恢复指定文档
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md
git checkout <commit_ref>^ -- docs/architecture/ARCH-WS-0001-workspace-browser.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260323-0954-workspace-doc-sync.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260318-WS-0001-docs-exp.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260323-0954-workspace-doc-sync.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./scripts/git-sensitive-scan.ps1 -Staged`
- 结果：提交前执行并在本次提交说明中回填结果

## 6. 后续修改入口（How to continue）

- 后续若进入实现阶段，优先从 `docs/architecture/ARCH-WS-0001-workspace-browser.md` 第 17 节建议目录改动继续拆分。
- 若后续改成“独立原型项目先做”，应先补一条文档记录，明确哪些 API/状态模型仅作为原型约束，哪些必须回迁到主仓。

## 7. 风险与注意事项

1. 当前 REQ 仍未适配仓库的严格模板校验，`validate-req.ps1 -Strict` 预期不会通过，需要后续单独治理文档模板。
2. 若后续只做原型而不持续同步主 REQ / ARCH，文档与实现会再次偏离。
