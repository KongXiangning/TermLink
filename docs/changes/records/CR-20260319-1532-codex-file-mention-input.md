---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段） - 变更记录
status: archived
record_id: CR-20260319-1532-codex-file-mention-input
req_id: REQ-20260309-codex-capability-mvp
commit_ref: e6dfd1e
owner: @maintainer
last_updated: 2026-03-19
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/codex-capability-implementation-plan.md, docs/codex/codex-file-mention-input-plan.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/changes/records/INDEX.md]
---

# CR-20260319-1532-codex-file-mention-input

## 1. 变更意图（Compact Summary）

- 背景：已确认 VS Code Codex 插件存在基于当前会话 `cwd` 的 `@` 文件提及能力，但 TermLink 当前仅有图像输入、slash 浮层与会话级 `cwd`，尚无对应的文件提示与筛选主线文档。
- 目标：在不改动运行时代码的前提下，先把 TermLink 的 `@` 文件提示需求、技术实现边界和实施计划固定下来。
- 本次边界：只补需求、技术方案和实施计划，不落任何前端、服务端或 Android 运行时代码。

## 2. 实施内容（What changed）

1. 在 `REQ-20260309-codex-capability-mvp` 中新增 `5.11 Composer @ 文件提示与筛选`，明确产品目标、边界与用户场景。
2. 在 `codex-capability-implementation-plan.md` 中把 composer `@` 文件提示收敛为 Phase 4 的独立实施包，并补入验收矩阵。
3. 新增 `docs/codex/codex-file-mention-input-plan.md`，固定 TermLink 版本的技术承接方式：客户端浮层 + session cwd 文件检索 + 已选文件态 + 发送前文本拼装。
4. 在 `PRODUCT_REQUIREMENTS.md` 中同步主线口径，明确该能力属于 Codex 下一阶段输入增强项。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/requirements/REQ-20260309-codex-capability-mvp.md`
  - `docs/codex/codex-capability-implementation-plan.md`
  - `docs/codex/codex-file-mention-input-plan.md`
  - `docs/product/PRODUCT_REQUIREMENTS.md`
- 模块：仅文档与计划层。
- 运行时行为：无变化；当前版本仍未实现 `@` 文件提示。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本次新增/修改文档
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260309-codex-capability-mvp.md
git checkout <commit_ref>^ -- docs/codex/codex-capability-implementation-plan.md
git checkout <commit_ref>^ -- docs/codex/codex-file-mention-input-plan.md
git checkout <commit_ref>^ -- docs/product/PRODUCT_REQUIREMENTS.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260309-codex-capability-mvp.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260319-1532-codex-file-mention-input.md -Strict`
- 结果：REQ 校验通过；CR 校验待本次文档编辑完成后执行。

## 6. 后续修改入口（How to continue）

- 后续实现建议从以下文档继续：
  - `docs/codex/codex-file-mention-input-plan.md`
  - `docs/product/requirements/REQ-20260309-codex-capability-mvp.md`
  - `docs/codex/codex-capability-implementation-plan.md`
- 如本记录后续被替代，请填写：替代记录: `CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前仅固定了 TermLink 版本的产品与技术口径，尚未验证真实 UI、搜索性能和发送语义。
2. 若后续直接假定未验证的上游 mention 私有 schema，可能与本次“先落交互、后收传输”策略冲突，需要单独立项确认。
