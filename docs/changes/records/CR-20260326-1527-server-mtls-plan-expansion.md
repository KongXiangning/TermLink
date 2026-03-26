---
title: Server mTLS plan expansion for Android profile runtime cert
status: draft
record_id: CR-20260326-1527-server-mtls-plan-expansion
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: product
related_code: [src/server.js, src/ws/terminalGateway.js]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-1527-server-mtls-plan-expansion

## 1. 变更意图（Compact Summary）

- 背景：REQ 已将服务端 TLS/mTLS 能力纳入范围，但 PLAN 只有 Android 侧步骤和契约收口，缺少真正的服务端实施阶段。
- 目标：把服务端监听、证书加载、HTTP/WS 统一握手和回归验证拆成明确的后续阶段，使 PLAN 能实际承接 REQ。
- 本次边界：只扩展 PLAN 结构与实施步骤，不修改 REQ 口径，不实施服务端代码。

## 2. 实施内容（What changed）

1. 在 PLAN 进度区新增 `8.7`、`8.8`、`8.9` 三个 `pending` 服务端阶段。
2. 在 PLAN 中补充服务端固定改动点，明确后续优先落地在 `src/server.js`、`src/ws/terminalGateway.js` 等入口。
3. 将服务端 mTLS 的实施内容拆为：
   - TLS/mTLS 监听与证书加载
   - HTTP API / WebSocket / terminal / extend_web / codex 统一接入 mTLS
   - 服务端回归验证与直连 `IP:port` 验收

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md`
  - `docs/changes/records/INDEX.md`
  - `docs/changes/records/CR-20260326-1527-server-mtls-plan-expansion.md`
- 模块：Android profile mTLS 需求的服务端实施计划、后续服务端 mTLS 分阶段落地路径。
- 运行时行为：本批不改变运行时；仅修复“REQ 已纳入、PLAN 不可执行”的计划缺口。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260326-1527-server-mtls-plan-expansion.md
```

## 5. 验证记录（Tests/Checks）

- `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260326-1527-server-mtls-plan-expansion.md -Strict`
- 结果：CR 结构校验通过；PLAN 已补齐与 REQ 对应的服务端实施阶段。

## 6. 后续修改入口（How to continue）

- 下一批可按 `8.7 -> 8.8 -> 8.9` 顺序落地服务端 mTLS。
- 若先实现 Nginx 代管 mTLS，也应同步补后端不可绕过的部署约束，不能跳过 `8.8` / `8.9`。
- 如未来中继设计改变为业务中继终止 TLS，请在服务端实施前先新开 REQ 评审。

## 7. 风险与注意事项

1. 若后续实现只完成服务端 TLS 监听但未统一覆盖 WebSocket 与三种模式，仍会留下与 REQ 不一致的安全分裂面。
2. 若继续把服务端实现留在“后续再说”的抽象层，REQ 会持续表现为可验收但不可实施的状态。
