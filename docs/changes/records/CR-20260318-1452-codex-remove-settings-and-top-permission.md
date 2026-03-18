---
title: Codex 当前期排除会话设置与顶部权限选择 - 变更记录
status: active
record_id: CR-20260318-1452-codex-remove-settings-and-top-permission
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 7dd9259
owner: @maintainer
last_updated: 2026-03-18
source_of_truth: product
related_code: [public/codex_client.html, public/terminal_client.js, public/lib/codex_shell_view.js, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, tests/codexClient.shell.test.js]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md, docs/codex/CODEX_PHASE5_PERMISSION_CONTEXT_PLAN.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/changes/records/INDEX.md]
---

# CR-20260318-1452-codex-remove-settings-and-top-permission

## 1. 变更意图（Compact Summary）
- 背景：近期实现回流把“会话设置”和顶部权限选择重新带回了 Codex 主界面，说明主 REQ 与实施计划对这两类入口的排除边界不够明确。
- 目标：在文档层先冻结当前期产品边界，明确这两个入口都不是当前期 UI 目标。
- 本次边界：只修改需求与计划文档，不在本记录中处理代码回退。

## 2. 实施内容（What changed）
1. 主 REQ 明确改为：当前期不提供 `Session Defaults` 入口，不提供顶部权限选择或权限预设常驻展示。
2. 能力实施计划改为：stored config 只保留底层契约语义，不再把 `Session Defaults` 与顶部权限入口视为当前期 UI 目标；顶部状态栏本身继续保留，不属于本次排除项。
3. Phase 5 专项计划改为：仅覆盖命令确认弹窗与背景信息窗口，并把“会话设置”“顶部权限选择”列为显式排除项。
4. 产品主线与路线图同步收口，避免其他文档继续把这两个入口描述为当前期应交付能力。

## 3. 影响范围（Files/Modules/Runtime）
- 文件：
  - `docs/product/requirements/REQ-20260309-codex-capability-mvp.md`
  - `docs/codex/CODEX_CAPABILITY_IMPLEMENTATION_PLAN.md`
  - `docs/codex/CODEX_PHASE5_PERMISSION_CONTEXT_PLAN.md`
  - `docs/product/PRODUCT_REQUIREMENTS.md`
  - `docs/architecture/ROADMAP.md`
  - `docs/changes/records/INDEX.md`
- 模块：Codex 产品需求边界、实施计划、Phase 5 范围定义。
- 运行时行为：本记录只冻结文档口径，不直接改变现网代码行为。

## 4. 回滚方案（命令级）
```bash
# 方案 A：回滚本次文档提交
git revert <commit_ref>

# 方案 B：仅恢复单个文档
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260309-codex-capability-mvp.md
```

## 5. 验证记录（Tests/Checks）
- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260309-codex-capability-mvp.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260318-1452-codex-remove-settings-and-top-permission.md -Strict`
- 结果：待本次文档修改完成后执行。

## 6. 后续修改入口（How to continue）
- 后续若要处理代码，应单独提交一条实现记录，移除已回流的“会话设置”和顶部权限选择 UI。
- 若未来产品决策要恢复这两类入口，必须新建需求或 CR，不得直接沿用当前期文档口径。

## 7. 风险与注意事项
1. 若只改局部文档、未同步主 REQ / 计划 / 路线图，后续实现仍可能按旧口径回流。
2. 本记录尚未包含代码回退，当前仓库实现可能暂时与新文档边界不一致。
