---
title: Relay 控制平面与透明中转模式 - 需求澄清记录
status: draft
record_id: CR-20260414-0105-relay-req-clarifications
req_id: REQ-20260413-relay-control-plane-and-transparent-transit
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-14
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md, docs/changes/records/INDEX.md]
---

# CR-20260414-0105-relay-req-clarifications

## 1. 变更意图（Compact Summary）

- 背景：REQ 已固定“透明 Relay、不终止业务 TLS、首期不新增通用 envelope”，但未冻结 ticket 校验与 service 绑定在协议中的落点。
- 目标：补齐 Relay 在既有 HTTP/WS 接入阶段完成授权绑定的约束，并冻结 `target identity` 的来源与变更语义。
- 本次边界：仅修订需求文档与追踪记录，不涉及代码实现、接口命名或 schema 设计。

## 2. 实施内容（What changed）

1. 在 REQ 的透明 Relay 约束、控制面接口约束、App 协议补充和验收标准中明确：ticket 只能承载于既有 `sessions API` 请求元数据或 `terminal WebSocket` upgrade 元数据，Relay 必须在透明转发前完成授权与 service 绑定。
2. 在 REQ 的 `published_service`、`relay_session_ticket` 职责和相关验收/测试场景中明确：`target identity` 的 source of truth 来自 connector inventory，并在管理员发布时冻结为快照。
3. 增补目标身份变更后的约束：凡涉及 `server address / allowedHosts / SNI / Host` 语义变化，必须走显式变更流程，使既有 ticket 失效并进入审计。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md`、`docs/changes/records/CR-20260414-0105-relay-req-clarifications.md`
- 模块：需求约束、接口边界、安全语义、验收与测试说明
- 运行时行为：无直接运行时变更；本次仅冻结后续实现必须遵守的协议与安全边界

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本次需求澄清
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md docs/changes/records/CR-20260414-0105-relay-req-clarifications.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md -Strict`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260414-0105-relay-req-clarifications.md -Strict`
- 结果：REQ 初始格式校验通过；本次修订后将继续执行 REQ/CR 校验

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md`
- 当前未找到对应 Relay 实施 PLAN；后续进入实现前应先补 `PLAN-*.md`，并把本次冻结的协议/安全决策写入计划分批项

## 7. 风险与注意事项

1. 本次只冻结“必须在哪一层完成授权与绑定”，未指定最终 header/query/path 命名；该细节仍需在后续 PLAN/实现中收敛。
2. 若后续实现尝试通过 TLS 终止、额外业务帧或控制面补猜目标身份绕开本次约束，应视为偏离 REQ，需要重新评审。
