---
title: Relay REQ 粒度收敛 - 变更记录
status: draft
record_id: CR-20260414-0048-relay-req-granularity-tighten
req_id: REQ-20260413-relay-control-plane-and-transparent-transit
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-14
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md, docs/changes/records/CR-20260414-0048-relay-req-granularity-tighten.md, docs/changes/records/INDEX.md]
---

# CR-20260414-0048-relay-req-granularity-tighten

## 1. 变更意图（Compact Summary）

- 背景：Relay 控制平面 REQ 已具备主干边界，但 `5.3`、`5.5` 仍残留实现/页面枚举，错误模型也仍在验收与测试段落冻结字符串级错误码。
- 目标：把 REQ 重新收敛到 Product-Level 粒度，只保留控制台能力边界、connector 通道能力边界和错误类别约束。
- 本次边界：仅修改 REQ 与本 CR；无关联 `PLAN-20260413-*`，也不修改实现代码或主线摘要文档。

## 2. 实施内容（What changed）

1. 将 `5.3` 从“控制台 Web 页面方向”改为“控制台 Web 能力方向”，删除页面级枚举，改写为管理员认证、connector 运维、service 发布、`app_client` 管理、授权配置和审计检索等产品能力边界。
2. 将 `5.5` 从“Connector 通道协议方向”改为“Connector 通道能力方向”，删除注册握手/数据通道关闭等实现切片，改写为注册接入、在线状态、inventory 同步、通道生命周期和状态回传等责任边界。
3. 将验收标准、测试场景和风险缓解中的字符串级错误码表述统一抬升为错误类别约束，避免在 REQ 层冻结具体错误名。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md`
  - `docs/changes/records/CR-20260414-0048-relay-req-granularity-tighten.md`
  - `docs/changes/records/INDEX.md`
- 模块：Relay 控制平面产品定义的文档粒度与后续 PLAN 拆分基线。
- 运行时行为：无代码变更；仅收敛需求表达，减少后续实现被 REQ 过度冻结的风险。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260414-0048-relay-req-granularity-tighten.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260414-0048-relay-req-granularity-tighten.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260413-relay-control-plane-and-transparent-transit`
- 结果：待本批改动完成后执行；目标是确认 REQ 与 CR 同步，且在无关联 PLAN 的前提下通过项目文档一致性检查。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md`
- 当前无关联 `PLAN-20260413-*`；若后续进入实施，应先补 PLAN，再拆分控制台、控制面 API、connector 通道与 App Relay 接入的具体计划切片。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 本次只收敛 REQ 粒度，没有补 PLAN；若后续直接进入实现，仍可能在计划层重新混入协议切片或页面设计细节。
2. 错误码名称已从 REQ 中抽离到错误类别层；后续若实现需要稳定 wire-level 错误码，应在 PLAN/接口设计阶段单独冻结，而不是回写 REQ。
