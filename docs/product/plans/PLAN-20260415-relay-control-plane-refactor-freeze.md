---
title: Relay 控制平面首期改造冻结计划
status: pending
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: product
related_code: []
related_docs: [docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md]
---

# PLAN-20260415-relay-control-plane-refactor-freeze

## 0. 当前状态

状态口径：

1. `pending` = 仅完成改造冻结与依赖排序，尚未开始实现。
2. `in_progress` = 已进入某一批改造设计或实施，但未完成验收。
3. `done` = 对应改造批次已完成实现、验证并有后续 CR 留痕。

当前结论：

1. `pending`：本计划只记录 `REQ-20260413-relay-control-plane-and-transparent-transit` 的首期可执行改造清单。
2. `pending`：本计划中的 8 项内容均不是本轮立即实施项，不得误解为代码已开工。
3. `pending`：后续真正开工时，必须按本计划依赖顺序拆分实施批次，并补 `PLAN + CR` 进度留痕。

## 1. 文档定位

本计划是 `REQ-20260413-relay-control-plane-and-transparent-transit` 的配套改造冻结文档，用于把首期控制面/Relay/App 适配涉及的关键改造项按依赖顺序收敛成一个明确 backlog。

关联需求：

- [REQ-20260413-relay-control-plane-and-transparent-transit.md](/E:/coding/TermLink/docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md)

本计划的职责只有三项：

1. 固定首期改造的依赖顺序。
2. 明确哪些是前置治理边界，哪些是后续客户端/服务端适配项。
3. 明确本计划当前是“冻结 backlog”，不是“宣布开始实施”。

## 2. 改造清单

以下清单按依赖顺序排列，后续实施应默认按此顺序切批；若要调整顺序，需先更新本计划并说明依赖变化原因。

### 2.1 P0 治理前置

1. `pending`：补切换与回滚治理
   - 在真正开工前先锁定三条规则：`单一 ticket 签发主权`、`未消费 ticket 立即失效`、`活动连接显式治理`。
   - 本项是其余改造的治理前提；未冻结前不得进入实现。

### 2.2 P1 控制面主体与票据基础

1. `pending`：拆认证主体模型
   - 服务端从“单一 admin”改成可区分 `admin_user / app_client / connector` 的认证与审计上下文。
   - 本项先行，是为了避免后续 ticket、审计与绑定语义继续挂在错误主体模型上。
2. `pending`：重做 ticket 模型
   - 把当前裸 `ws-ticket` 改成可绑定 `app_client + published_service + relay ingress + target identity + version` 的访问票据。
   - 本项依赖主体模型先拆清，否则 `issuedTo`、审计主体与拒绝语义仍会悬空。
3. `pending`：建立独立 Relay 状态边界
   - 不把 Relay 状态塞进现有 `session` 模型；单独承接 `app_client / connector / inventory / published_service / policy / audit`。
   - 本项依赖新的主体模型与 ticket 语义，用于冻结控制面 source of truth，而不是继续借现有 TermLink session 充当 Relay 真相来源。

### 2.3 P2 Android 接入语义与本地状态

1. `pending`：拆 Android 的入口语义
   - 把 `relay ingress` 和 `target identity` 从 `ServerProfile.baseUrl` 里拆开，避免把实际连接地址和目标身份校验绑死。
   - 本项依赖前述 ticket/控制面语义先冻结，否则客户端字段拆分会先于契约定型。
2. `pending`：补 App 绑定与缓存模型
   - 新增 `app_client` 绑定存储；缓存键改为绑定身份/稳定 service 标识，不再只靠 `baseUrl + basicUsername`。
   - 本项依赖 Android 入口语义拆分与控制面主体边界，否则缓存仍会继续绑定错误身份。
3. `pending`：补认领与发现客户端接口
   - 在 Android 侧补 `claim / binding / discovery / ticket` 的客户端接口，不再只围绕 `sessions/workspace API`。
   - 本项依赖新的绑定模型、稳定 service 标识与票据契约。

### 2.4 P3 兼容治理与审计收口

1. `pending`：补版本、拒绝语义和审计
   - 为服务端和 App 同时补上版本协商、拒绝类别、ticket 生命周期、主体/对象/原因审计。
   - 本项放在后段收口，是因为它依赖前面主体、ticket、绑定、discovery 与服务标识模型全部稳定后才能落成统一契约。

## 3. 依赖说明

1. `补切换与回滚治理` 必须最先冻结，因为它决定后续是否允许双写、未消费 ticket 如何收敛，以及活动连接在安全事件下如何治理。
2. `拆认证主体模型 -> 重做 ticket 模型 -> 建立独立 Relay 状态边界` 构成服务端控制面最小闭环；任何一个缺失都会导致主体、对象或 source of truth 继续混淆。
3. Android 相关改造必须晚于控制面契约冻结，否则客户端会围绕临时字段或错误身份语义先行落地。
4. `补版本、拒绝语义和审计` 不是可选增强项，而是前面所有改造完成后对外提供稳定兼容与治理能力的收口项。

## 4. 实施切批建议

后续真正开工时，建议至少按以下批次拆分，而不是一次性大改：

1. 批次 A：治理规则冻结与切换边界。
2. 批次 B：主体模型、ticket 模型、Relay state boundary。
3. 批次 C：Android 入口语义、绑定存储、缓存键调整。
4. 批次 D：claim / binding / discovery / ticket 客户端接口。
5. 批次 E：版本协商、拒绝语义、ticket 生命周期与审计闭环。

每批都应单独补实施明细、验收标准与 CR，不得直接把本冻结计划当成实施记录。

## 5. 验收口径

当前文档批次的验收只包括文档冻结，不包括代码实现：

1. 已把 8 项改造收敛进与 `REQ-20260413` 关联的独立计划文档。
2. 已明确各项依赖顺序，不再以“并行 brainstorm 清单”形式散落。
3. 已明确这些改造“不是现在要完成”的范围边界。
4. 后续实施批次可直接引用本计划切分工作，而无需重新争论先后顺序。

## 6. 风险与回滚

1. 风险：若不先冻结治理边界，后续实现容易在 ticket 主权、连接治理和回滚策略上出现 split-brain。
2. 风险：若 Android 先于控制面契约改造，容易把临时字段和错误缓存键固化到客户端。
3. 风险：若继续把 Relay 状态塞进现有 session 语义，未来独立控制面拆分成本会显著上升。
4. 回滚：若后续决定重排实施路线，可回退为仅保留本计划作为 backlog 冻结文档；但在更新本计划前，不应绕开本顺序直接开工。
