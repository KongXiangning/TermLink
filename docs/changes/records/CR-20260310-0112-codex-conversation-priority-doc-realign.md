---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段） - 变更记录
status: archived
record_id: CR-20260310-0112-codex-conversation-priority-doc-realign
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 4a2c25f
owner: @maintainer
last_updated: 2026-03-10
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/changes/records/INDEX.md]
---

# CR-20260310-0112-codex-conversation-priority-doc-realign

## 1. 变更意图（Compact Summary）

- 背景：既有 Codex 主 REQ 和实施计划虽然建立了能力矩阵分期，但实际把首页持续推向了“状态面板堆叠”，与最新真机反馈的“移动端对话体验优先”目标不一致。
- 目标：基于能力矩阵和跨版本稳定边界，修订 Codex 主 REQ、实施计划、产品主线与路线图，把主线明确纠偏为“对话首页优先、配置与运行态二级入口化”，并在后续补正中保留第二版已定死的首页、配置、语言和平台一致性约束。
- 本次边界：仅做文档主线审查、对比与修订，不涉及代码实现。

## 2. 实施内容（What changed）

1. 重写 `REQ-20260309-codex-capability-mvp`，保留首页收口、`/model` 统一状态源、PATCH 正式交付、Interrupt 规则、中文化、未知 slash 兜底与平台一致性等第二版主线约束，并补正 `/plan` 与 `/skill` 的并行 interaction state。
2. 重写 `docs/codex/codex-capability-implementation-plan.md`，将能力映射按“当前期前置 / 二级入口 / 下一阶段 / 不纳入”重排，新增 `nextTurnEffectiveCodexConfig`、`interactionState`、`/skill <name>` 冻结契约、“不预绑定底层字段”边界，以及后续 `/` 能力统一扩展接口要求。
3. 同步更新 `PRODUCT_REQUIREMENTS`、`ROADMAP`，让上位文档也明确 `/plan <文本>` 一次性规则、`activeSkill` 替换规则、PATCH 正式交付项、slash 扩展接口预留和 Android / WebView 共享行为契约。
4. 追加 slash 命令描述字段约定表，固定 `command / availability / discoverability / argumentShape / dispatchKind / capabilityBinding` 等字段，避免后续扩命令时再次分叉字段模型。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/requirements/REQ-20260309-codex-capability-mvp.md`
  - `docs/codex/codex-capability-implementation-plan.md`
  - `docs/product/PRODUCT_REQUIREMENTS.md`
  - `docs/architecture/ROADMAP.md`
  - `docs/changes/records/INDEX.md`
  - `docs/changes/records/CR-20260309-0123-codex-capability-doc-restructure.md`
- 模块：
  - 文档治理
  - Codex 产品主线
  - Codex 分期、状态模型与接口语义
- 运行时行为：
  - 无直接代码行为变更，但会改变后续实现与验收的优先级依据。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本次文档修订
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260309-codex-capability-mvp.md
git checkout <commit_ref>^ -- docs/codex/codex-capability-implementation-plan.md
git checkout <commit_ref>^ -- docs/product/PRODUCT_REQUIREMENTS.md
git checkout <commit_ref>^ -- docs/architecture/ROADMAP.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260309-0123-codex-capability-doc-restructure.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260310-0112-codex-conversation-priority-doc-realign.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./.codex/skills/docs-requirement-sync/scripts/validate-req.ps1 -ProjectRoot . -ReqPath ./docs/product/requirements/REQ-20260309-codex-capability-mvp.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./.codex/skills/docs-requirement-sync/scripts/validate-change-record.ps1 -ProjectRoot . -RecordPath ./docs/changes/records/CR-20260310-0112-codex-conversation-priority-doc-realign.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./.codex/skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ProjectRoot . -ReqId REQ-20260309-codex-capability-mvp`
- 结果：待本次修订完成后执行并回填。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `docs/product/requirements/REQ-20260309-codex-capability-mvp.md`
  - `docs/codex/codex-capability-implementation-plan.md`
  - `docs/product/PRODUCT_REQUIREMENTS.md`
  - `docs/architecture/ROADMAP.md`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 如果后续实现继续沿用旧“面板常驻首页”思路，文档纠偏会再次失效。
2. `Session Defaults` 的进一步设计，必须继续受 stored `codexConfig`、`nextTurnEffectiveCodexConfig` 与 `interactionState` 契约统一约束，不能先做表面 UI 打磨。
3. `/skill <name>` 当前只冻结交互契约，不应被误读为 app-server 已存在固定底层字段或固定 RPC 载荷。
4. 后续 `/` 能力扩展应继续通过统一 registry / command-dispatch 接口接入，不应重新回到单命令特判实现。
