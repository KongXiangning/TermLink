---
title: Codex gateway temp-file fallback cleanup
status: draft
record_id: CR-20260413-1647-codex-tempfile-fallback
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: product
related_code: [src/ws/terminalGateway.js, tests/terminalGateway.codex.test.js]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/INDEX.md]
---

# CR-20260413-1647-codex-tempfile-fallback

## 1. 变更意图（Compact Summary）

- 背景：代码审查发现 gateway 物化本地图片为临时文件后，虽然 `turn/start` 异常路径会清理 temp file，但“成功返回却没有有效 `turnId`”的成功路径没有 fallback cleanup，可能把文件泄漏到系统临时目录。
- 目标：在 `turn/start` 成功但未返回可用 `turnId` 时立即清理本轮附件 temp file，避免 temp file leak。
- 本次边界：只修正 gateway 临时文件清理的漏网成功路径，并补一条对应回归测试；不改变 Android UI、provider 协议或图片上行主流程。

## 2. 实施内容（What changed）

1. 在 `src/ws/terminalGateway.js` 中把 `turn/start` 成功后的附件处理改成两段：有有效 `turnId` 时按原逻辑登记到 `turnAttachmentTempFiles`；没有有效 `turnId` 时立刻执行 `cleanupAttachmentTempFiles(...)`。
2. 在 `tests/terminalGateway.codex.test.js` 中新增 `MissingTurnIdCodexService` 测试替身，模拟 `turn/start` 返回空 `turn.id` 的成功响应。
3. 新增回归测试，验证 data URL 物化出来的本地图片文件会在该 fallback 分支中被立即删除，而不会泄漏到系统 temp 目录。

本批覆盖计划项：

1. `13. blocked：Phase 4 follow-up stability / plan UX / runtime readability repairs`
2. `9. in_progress：图片 data URL -> temp file -> localImage.path 桥接后续可靠性补漏`

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `src/ws/terminalGateway.js`
  - `tests/terminalGateway.codex.test.js`
  - `docs/product/plans/PLAN-20260408-codex-native-android-migration.md`
  - `docs/changes/records/INDEX.md`
  - `docs/changes/records/CR-20260413-1647-codex-tempfile-fallback.md`
- 模块：
  - Gateway 本地图片临时文件生命周期管理
  - terminalGateway 本地图片桥接回归测试
- 运行时行为：
  - 如果上游 `turn/start` 响应异常地缺失 `turnId`，gateway 现在会立即清理本轮附件临时文件，而不是把它们遗留在系统 temp 目录。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批相关文件
git checkout <commit_ref>^ -- src/ws/terminalGateway.js
git checkout <commit_ref>^ -- tests/terminalGateway.codex.test.js
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260408-codex-native-android-migration.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260413-1647-codex-tempfile-fallback.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260408-codex-native-android-migration.md -Strict`
  - `node --test tests\\terminalGateway.codex.test.js`
- 结果：
  - REQ 校验已通过。
  - `terminalGateway` 测试集中新增用例已通过：当 `turn/start` 返回空 `turn.id` 时，gateway 会立即删除 data URL 物化出来的本地图片 temp file。
  - 当前 `node --test` 进程在本仓库里仍有既有“测试输出已完成但退出挂住”的现象；本次以新增回归用例和整套输出中的 `ok` 结果作为主要验证信号。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `src/ws/terminalGateway.js`
  - `tests/terminalGateway.codex.test.js`
- 如果后续还要强化这条链路，优先补充更多异常上游响应（例如 malformed `turn` 结构）下的附件清理测试。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 该修复只在“无可用 `turnId`”时走立即清理；正常成功路径仍依赖 turn 生命周期通知在完成/失败时清理，不应混淆两条路径。
2. 仓库当前 `node --test tests\\terminalGateway.codex.test.js` 仍偶发退出挂住；后续若要进一步收紧验证脚本，建议单独排查这个测试进程退出问题。
