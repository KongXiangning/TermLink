---
title: Relay 控制平面与透明中转模式文档纠偏 - 变更记录
status: draft
record_id: CR-20260413-2305-relay-control-plane-doc-init
req_id: REQ-20260413-relay-control-plane-and-transparent-transit
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md, docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/changes/records/INDEX.md]
---

# CR-20260413-2305-relay-control-plane-doc-init

## 1. 变更意图（Compact Summary）

- 背景：Relay REQ 初稿已入库，但一次性注册码配对生命周期、Relay 数据面边界和错误模型仍不够可实施。
- 目标：在不扩大范围的前提下，锁定 `app_client` 预创建 + 认领配对路径，冻结首期仅透传既有 `sessions API / terminal WebSocket`，并把接口责任和错误集合收紧到可直接拆 PLAN 的程度。
- 本次边界：只完成 REQ 可实施性纠偏与摘要文档同步；当前无关联 PLAN，也不实现 Relay 代码。

## 2. 实施内容（What changed）

1. 修订 `REQ-20260413-relay-control-plane-and-transparent-transit`，补齐首期 `app_client` 预创建 + 一次性注册码认领模型、`relay ingress` 与 `target identity` 分离契约、`relay_access_policy`/`relay_session_ticket` 的首期责任，以及 inventory 绑定的 service 发布约束。
2. 在 REQ 中新增首期数据面边界与最小错误集合，明确首期只透传既有 `sessions list/create/delete/rename API` 与 `terminal WebSocket`，不扩展通用 relay 协议。
3. 更新 `PRODUCT_REQUIREMENTS.md`、`ROADMAP.md`、`CHANGELOG_PROJECT.md` 的主线摘要口径，使其与修订后的 REQ 保持一致。
4. 明确本批无关联 `PLAN-*.md`，按 `REQ + CR + 主线摘要` 进行同步，不伪造计划覆盖。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md`
  - `docs/product/PRODUCT_REQUIREMENTS.md`
  - `docs/architecture/ROADMAP.md`
  - `docs/changes/CHANGELOG_PROJECT.md`
  - `docs/changes/records/CR-20260413-2305-relay-control-plane-doc-init.md`
  - `docs/changes/records/INDEX.md`
- 模块：Relay 控制平面产品定义、主线摘要追踪、后续实施的鉴权/配对/寻址/发布边界。
- 运行时行为：本批不修改运行时代码；仅为后续 `control plane backend / connector / app relay profile / observability` 实施建立更可执行的文档基线。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本批文档
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md
git checkout <commit_ref>^ -- docs/product/PRODUCT_REQUIREMENTS.md
git checkout <commit_ref>^ -- docs/architecture/ROADMAP.md
git checkout <commit_ref>^ -- docs/changes/CHANGELOG_PROJECT.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260413-2305-relay-control-plane-doc-init.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260413-2305-relay-control-plane-doc-init.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260413-relay-control-plane-and-transparent-transit`
- 结果：待本批文档写入完成后执行；目标是确认 REQ、CR 与主线摘要同步一致。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md`
- 后续首次实施前，应先补 `PLAN-20260413-...` 并锁定 `app_client` 配对、ticket 签发、Relay 数据面转发的具体计划切片，再进入代码实现。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前仍缺少实施 PLAN；若后续直接跳过 PLAN，就会失去 `connector / relay transit / app relay profile` 三条子线的批次边界，容易把需求一次性摊大。
2. 本 REQ 已把 `app_client` 预创建 + 一次性注册码认领路径写死；后续若想改成设备自注册生成主体，必须重新评审。
3. 本 REQ 已把首期数据面收紧为既有 `sessions API / terminal WebSocket`；后续若扩展通用 relay envelope、浏览器内终端或其他代理协议，必须新开需求。
4. 本 REQ 已把 App 侧主体、Relay 寻址和 service 发布边界写死；后续若需要管理员直签票据、Relay 暴露新目标身份或控制面直改私网目标，都必须重新评审。
