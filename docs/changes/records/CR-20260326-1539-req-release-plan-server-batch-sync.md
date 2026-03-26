---
title: REQ release plan sync for Android and server mTLS batches
status: active
record_id: CR-20260326-1539-req-release-plan-server-batch-sync
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: d675956
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-1539-req-release-plan-server-batch-sync

## 1. 变更意图（Compact Summary）

- 背景：REQ 的发布计划仍保留旧的 Android-only 表述，未反映已新增的服务端 mTLS 实施阶段。
- 目标：把发布计划收口为 Android 批次、服务端 mTLS 批次、联合验证批次三段式，使 REQ 与 PLAN 对齐。
- 本次边界：只更新 REQ 发布计划和对应记录，不改实施状态与技术范围。

## 2. 实施内容（What changed）

1. 将 REQ `## 9. 发布计划` 改为三段式：
   - Android 批次
   - 服务端 mTLS 批次
   - 联合验证批次
2. 把联合验证内容补充为：
   - 客户端直连成功
   - 服务端 mTLS 拒绝缺证书 / 错证书 / 非受信 CA
   - `terminal`、`extend_web`、`codex` 共用同一 TLS/mTLS 安全边界
3. 将收尾文案同步改为 Android / Server mTLS 文档共同收口，而非仅 Android 文档。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md`
  - `docs/changes/records/INDEX.md`
  - `docs/changes/records/CR-20260326-1539-req-release-plan-server-batch-sync.md`
- 模块：REQ 发布计划口径、Android 与服务端 mTLS 联合收尾路径。
- 运行时行为：本批不改变运行时代码；只修正发布计划表达。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260326-1539-req-release-plan-server-batch-sync.md
```

## 5. 验证记录（Tests/Checks）

- `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md -Strict`
- `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260326-1539-req-release-plan-server-batch-sync.md -Strict`
- 结果：REQ 与 CR 结构校验通过；REQ 发布计划已与 PLAN 当前阶段结构对齐。

## 6. 后续修改入口（How to continue）

- 后续若服务端阶段继续拆分，可只增补 REQ 发布计划，不必改动已完成的 Android 批次描述。
- 若最终联合验证新增 relay 相关验收，应在 relay REQ 明确后再扩展本段。

## 7. 风险与注意事项

1. 若 REQ 发布计划继续只写 Android，会误导需求已接近收尾，但服务端 mTLS 尚未开始实施。
2. 联合验证批次当前仍是规划描述，不代表服务端验证已经完成。

