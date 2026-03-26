---
title: Android Profile 级 mTLS PLAN 编号与缓存失效口径修复
status: active
record_id: CR-20260326-1553-plan-numbering-password-cache-sync
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: d675956
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-1553-plan-numbering-password-cache-sync

## 1. Compact Summary

- 背景：当前 PLAN 顶部进度区和既有 CR 统一引用 `8.1/8.2/8.3`，但正文实施阶段仍写成 `4.1` 到 `4.9`，导致追踪锚点断链；同时 `8.3` 漏写“修改证书口令时也要失效旧缓存”。
- 目标：把正文阶段统一改为 `8.1` 到 `8.9`，并补齐 `8.3` 的口令变更缓存失效规则。
- 本次边界：仅修正文档追踪与规则口径，不改动 REQ、代码实现或既有 CR 的计划项编号。

## 2. What Changed

1. 将 `PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md` 正文中的阶段标题从 `4.1` 到 `4.9` 统一改为 `8.1` 到 `8.9`，与进度区和既有 CR 引用保持一致。
2. 在 `8.3 第三步：运行时 mTLS 链路切换` 中，将缓存失效规则补齐为“切换 profile、替换证书、删除证书、修改证书口令时要失效旧缓存”。
3. 新增本条 CR，并在 `docs/changes/records/INDEX.md` 追加索引，固化本次纯文档修复的追踪记录。

## 3. Impact

- 文件：
  - `docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md`
  - `docs/changes/records/CR-20260326-1553-plan-numbering-password-cache-sync.md`
  - `docs/changes/records/INDEX.md`
- 模块：
  - REQ 对应实施计划的阶段编号追踪
  - Android profile mTLS Phase 3 的缓存失效规则口径
- 运行时行为：
  - 无代码行为变更；本次仅修正文档锚点与实现约束说明

## 4. Rollback

```bash
# Option A: revert the implementing commit
git revert <commit_ref>

# Option B: restore only the document slice touched by this batch
git checkout <commit_ref>^ -- \
  docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md \
  docs/changes/records/CR-20260326-1553-plan-numbering-password-cache-sync.md \
  docs/changes/records/INDEX.md
```

## 5. Tests / Checks

- `rg -n "^#### 8\\.[1-9]|^### 4\\.[1-9]|修改证书口令|失效旧缓存" docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md`
  - 用于确认正文阶段已统一为 `8.x`，且 `8.3` 已补入“修改证书口令”。
- `rg -n "CR-20260326-1553-plan-numbering-password-cache-sync|8\\.1|8\\.2|8\\.3" docs/changes/records/INDEX.md docs/changes/records/CR-20260326-1553-plan-numbering-password-cache-sync.md`
  - 用于确认 CR 与索引追踪已补齐。

## 6. How To Continue

- 若后续继续调整该需求的文档口径，优先从 `docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md` 与对应 CR 开始，保持 `PLAN + CR` 一致。
- 替代记录若存在，请填写：`CR-YYYYMMDD-HHMM-<slug>`

## 7. Risks / Notes

1. 本次没有回写既有 CR 的阶段编号，因为它们已经采用 `8.x`；若后续发现其它文档仍引用 `4.x`，应单独补齐。
2. 本次只修正文档规则，实际代码是否在“仅口令变更”时主动失效缓存，仍应由后续实现/审查继续对照。

