---
title: Transparent relay identity-semantics constraint sync
status: draft
record_id: CR-20260326-1532-relay-identity-semantics-constraint
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-1532-relay-identity-semantics-constraint

## 1. 变更意图（Compact Summary）

- 背景：当前 REQ/PLAN 把“透明中继不改 App profile 字段”写成长期契约，但没有写清这一点成立的技术前提。
- 目标：补上可行性约束，明确该兼容性只适用于 relay 不改变客户端可见目标身份语义的场景。
- 本次边界：只修正文档约束，不新增功能设计，不实现 relay。

## 2. 实施内容（What changed）

1. 在 REQ 的方案概要与接口契约中补充前提：App 必须仍能校验目标 Server 身份，且 `server address + allowedHosts` 仍足以表达目标连接语义。
2. 在 PLAN 的 `8.6` 中补充同样的约束，并明确若 relay 暴露新的入口地址/端口或改变客户端可见目标身份，则必须新增连接发现 / 寻址契约并单独评审。
3. 将“透明中继兼容”从默认无限成立，收口为“仅在身份语义不变时成立”的受限契约。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md`
  - `docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md`
  - `docs/changes/records/INDEX.md`
  - `docs/changes/records/CR-20260326-1532-relay-identity-semantics-constraint.md`
- 模块：透明中继兼容性的需求约束、后续连接发现 / 寻址契约的决策边界。
- 运行时行为：本批不改变运行时代码；只避免后续把不成立的 relay 假设当成默认兼容前提。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260326-1532-relay-identity-semantics-constraint.md
```

## 5. 验证记录（Tests/Checks）

- `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md -Strict`
- `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260326-1532-relay-identity-semantics-constraint.md -Strict`
- 结果：REQ 与 CR 结构校验通过；透明中继兼容前提已在 REQ / PLAN 中显式固定。

## 6. 后续修改入口（How to continue）

- 若后续 relay 仍是透明转发，可继续复用当前契约。
- 若 relay 需要暴露新的入口地址/端口或改变客户端可见目标身份，应先补连接发现 / 寻址 REQ，再讨论是否复用现有 App profile 字段。
- 如 relay 最终终止 TLS 或介入业务协议，应沿用现有约束：新开 REQ。

## 7. 风险与注意事项

1. 若不写清该前提，后续实现者可能错误假设任何多租户 relay 都能零改动复用 `server address + allowedHosts`。
2. 该约束解决的是“契约可行性”问题，不代表已经解决 relay 的服务发现和多租户寻址设计问题。
