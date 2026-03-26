---
title: Android profile mTLS direct/transparent-relay contract sync
status: draft
record_id: CR-20260326-1514-mtls-contract-direct-transparent-relay
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-1514-mtls-contract-direct-transparent-relay

## 1. 变更意图（Compact Summary）

- 背景：当前 REQ/PLAN 已完成 Android profile 级运行时证书主链路，但尚未把“未来透明中继兼容”的长期安全契约固定下来，仍可能被误解为仅服务于直连场景。
- 目标：将该需求收敛为一项长期基础能力，明确 App/Server 的 mTLS 契约与访问路径无关，未来透明中继接入时不需要改动证书模型或用户输入项。
- 本次边界：只更新 REQ/PLAN/CR 文档与记录，不实现中继功能，不实施服务端 TLS/mTLS 代码。

## 2. 实施内容（What changed）

1. 改写 REQ 的背景、范围、方案概要、接口契约、验收标准、测试场景与风险边界，明确：
   - 当前目标同时覆盖 `IP:port` 直连和未来透明中继兼容
   - Server 端将作为 Android profile 证书的目标校验端
   - `terminal`、`extend_web`、`codex` 共用同一 mTLS 契约
2. 更新 PLAN，新增 `8.6 第六步：固化直连 / 透明中继共用的 App/Server 证书契约`，并把“未来中继默认透明转发、不终止 TLS”写为计划约束。
3. 记录本批为文档收口批次：固定访问路径无关的证书契约，禁止在本 REQ 下隐式引入业务中继终止 TLS 的新模型。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md`
  - `docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md`
  - `docs/changes/records/INDEX.md`
  - `docs/changes/records/CR-20260326-1514-mtls-contract-direct-transparent-relay.md`
- 模块：Android profile mTLS 文档契约、未来 Server mTLS 配置边界、透明中继兼容性约束。
- 运行时影响：本批不改变运行时代码；只固定后续实现必须遵守的 App/Server mTLS 契约。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260326-1514-mtls-contract-direct-transparent-relay.md
```

## 5. 验证记录（Tests/Checks）

- `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md -Strict`
- `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260326-1514-mtls-contract-direct-transparent-relay.md -Strict`
- 结果：REQ 与 CR 结构校验通过，REQ / PLAN / CR 对本批覆盖范围保持一致。

## 6. 后续修改入口（How to continue）

- 下一批如实现服务端 mTLS，请从 REQ 中固定的 App/Server 契约出发，优先补充 Server TLS/mTLS 配置、HTTP/WS 统一握手与真机验证。
- 如未来中继仍保持透明转发，可直接复用本批固定的证书模型；无需新增“Relay 模式专用证书”字段。
- 如未来中继要终止 TLS 或介入业务协议，请新建 REQ 单独评审，不在本需求下扩展。

## 7. 风险与注意事项

1. 若后续服务端实现偏离“路径无关”的契约，可能导致 App profile 结构被重新设计，破坏本批固定的长期兼容性目标。
2. 若未来中继产品化时默认终止 TLS，会与本批“透明中继兼容”前提冲突，必须在需求层重新决策。
