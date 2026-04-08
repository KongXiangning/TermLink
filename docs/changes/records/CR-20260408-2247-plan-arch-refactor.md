---
title: Codex Android 全原生并行迁移计划/架构文档重构
status: draft
record_id: CR-20260408-2247-plan-arch-refactor
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-08
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/architecture/ARCH-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260408-2247-plan-arch-refactor

## 1. 变更意图（Compact Summary）

- 背景：当前 `PLAN-20260408-codex-native-android-migration` 混入过多实现级技术细节，超出计划文档应有范围。
- 目标：将 PLAN 收敛到“范围、阶段、验收、风险、回滚”，把技术栈、协议映射、状态模型和 provider adapter 设计下沉到独立技术文档。
- 本次边界：只重构文档，不改代码、不改协议实现、不启动任何实施批次。

## 2. 实施内容（What changed）

1. 新增技术设计文档 `docs/architecture/ARCH-20260408-codex-native-android-migration.md`，承接技术栈、入口与恢复设计、协议基线、状态分层和多 provider CLI 扩展边界。
2. 精简 `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`，移除实现级技术细节，改为引用技术文档，并进一步压缩阶段摘要与 Phase 0 措辞。
3. 在 `docs/architecture/ARCH-20260408-codex-native-android-migration.md` 中补齐关键技术决策：`codex_interrupt_ack` 协议基线、`CodexActivity` 启动契约、恢复失败落点，以及并行期 foreground service ownership / 非双活约束。
4. 保持 `REQ-20260408-codex-native-android-migration` 为需求锚点，并同步保持 ROADMAP 挂靠关系。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`docs/product/plans/PLAN-20260408-codex-native-android-migration.md`、`docs/architecture/ARCH-20260408-codex-native-android-migration.md`、`docs/changes/records/CR-20260408-2247-plan-arch-refactor.md`
- 模块：产品计划文档、技术设计文档、需求追踪链路
- 运行时行为：无代码运行时变更，仅调整文档分工与引用关系

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文档
git checkout <commit_ref>^ -- \
  docs/product/plans/PLAN-20260408-codex-native-android-migration.md \
  docs/architecture/ARCH-20260408-codex-native-android-migration.md \
  docs/changes/records/CR-20260408-2247-plan-arch-refactor.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
- 结果：通过

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/architecture/ARCH-20260408-codex-native-android-migration.md`
  - `docs/product/requirements/REQ-20260408-codex-native-android-migration.md`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 后续若继续把实现级内容写回 PLAN，会再次破坏文档分工，应优先更新技术文档。
2. 技术文档中的协议与状态建模若后续发生调整，需同步确认是否影响 REQ/PLAN 的范围或验收口径。
