---
title: Relay 控制平面与透明中转模式
status: planned
owner: @maintainer
last_updated: 2026-04-15
source_of_truth: product
related_code: [src/server.js, src/ws/terminalGateway.js, android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt]
related_docs: [docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md]
---

# REQ-20260413-relay-control-plane-and-transparent-transit

## Meta

- id: REQ-20260413-relay-control-plane-and-transparent-transit
- title: Relay 控制平面与透明中转模式
- priority: P1
- status: planned
- owner: @maintainer
- target_release: 2026-Q2
- links: `docs/product/REQUIREMENTS_BACKLOG.md`

## 1. 背景与目标

当前 TermLink 已具备以下连接与安全基础：

1. 服务端支持 BasicAuth。
2. Android 端支持按 profile 配置 mTLS 客户端证书。
3. 既有主链路以直连目标 Server 为主，适用于目标服务可直接被 App 访问的场景。
4. 已固定“透明 Relay 不应改变 App <-> Target Server 证书与身份语义”这一长期约束。

但在真实部署中，存在大量后端服务位于家庭/企业内网、NAT 或防火墙之后，没有公网 IP，且不允许暴露入站端口。此时手机端 App 无法直接访问目标服务。

本需求目标是为 TermLink 规划一套“Relay 中转模式”网站与配套控制面能力，使目标主机仅需建立出站连接即可加入可访问网络，同时不破坏当前安全模型。

同时明确：本需求首期实现会强关联当前 TermLink 后台服务与 Android App，且允许先在当前仓库内孵化；但 `Relay Control API / Relay Transit / Connector / Console Web` 的长期形态应视为可抽离、可独立维护的产品子系统。REQ 在这里要冻结的是跨项目产品契约、角色边界与兼容要求，而不是当前仓库里的代码目录或内部类依赖。

本需求固定以下设计决策：

1. 网站定位为控制台，不是通用反向代理门户。
2. Relay 只负责发现、授权、编排、转发与审计，不承载业务终端页面。
3. 私网服务通过常驻 `connector` 主动向 Relay 建立出站连接接入。
4. 首期 Relay 数据面只透传既有 `sessions list/create/delete/rename API + terminal WebSocket`，不新增通用 relay envelope 或其他代理协议。
5. 首期采用“单组织 + 单管理员操作面 + 独立 App 访问主体体系 + MFA”，不引入多管理员协作、后台 RBAC 或审批流。
6. 首期 `app_client` 配对生命周期固定为“管理员先预创建槽位并签发一次性注册码，再由 App 认领该主体”。
7. 若未来要做 TLS 终止型网关，必须新开 REQ，不在本需求内扩展。
8. 首期实现即使先落在当前 TermLink 后台与 App 仓库内，也必须保留可独立部署、独立发布、独立维护的边界，不得把未来 Relay 项目锁死为当前仓库内部模块。

## 2. In Scope

1. 控制台网站：
   - 管理员登录
   - MFA 二次验证
   - connector 注册与状态查看
   - service 发布与下线
   - 访问策略管理
   - 审计日志查看
   - 健康状态总览
   - 接入指引页
2. Relay 控制面能力：
   - connector 注册
   - connector 心跳
   - service inventory 同步
   - 访问票据签发
   - 权限校验
   - 审计记录
   - 节点在线状态感知
3. Relay 数据面能力：
   - `sessions API` 请求编排与转发
   - `terminal WebSocket` 中转
   - App 到指定 service 的访问绑定
   - connector 到目标本地服务的桥接
4. 私网接入模型：
   - 每台私网主机运行一个常驻 `connector`
   - connector 主动向 Relay 建立出站 `WSS/TLS` 长连接
   - connector 代表本机或本网络内一组服务对外发布能力
5. App 侧中转模式接入契约：
   - 新增 Relay 发现/接入描述，但不得改写现有 profile 中“目标服务身份”字段语义
   - 在不破坏现有目标服务身份校验前提下，先通过一次性注册码完成 `app_client` 认领，再通过 Relay 获取访问票据并建立连接
   - 首期只支持既有 `sessions list/create/delete/rename` 与 `terminal WebSocket`
6. 跨项目维护基线：
   - 明确当前 TermLink 后台 / Android App 与未来独立 Relay 项目的职责边界
   - 冻结 Relay 发现、配对、ticket、connector inventory/transit 的版本化契约
   - 冻结独立部署、独立发布、兼容窗口与迁移约束

## 3. Out of Scope

1. 不把网站做成业务终端页或浏览器内 SSH 控制台。
2. 不支持 `workspace / codex / external web` 的 Relay 接入。
3. 不支持 TLS 终止型业务网关。
4. 不支持企业 SSO、SAML、OIDC。
5. 不支持多租户 SaaS、套餐、计费、开放注册。
6. 不支持 App 直接管理 connector 所在主机。
7. 不在本期引入 P2P 打洞、UDP 通道、局域网广播发现。
8. 不在本期改变现有 App profile 的 mTLS 基础模型。
9. 不实现跨组织资源共享。
10. 不要求首期立即完成仓库拆分、独立 CI/CD 或独立运营体系建设；本期只要求先冻结后续拆分所需的边界与兼容约束。
11. 不支持多管理员协作、管理员审批流、细粒度后台 RBAC 或管理员委派访问。

## 4. 方案概要

### 4.1 架构边界

系统逻辑分为四个 Relay 子域与一个当前项目集成层：

1. `Console Web`
   - 面向管理员的操作界面
   - 负责配置、查看、授权、审计
2. `Control API`
   - 负责登录、MFA、connector 注册、service 管理、策略管理、票据签发、审计查询
3. `Relay Transit`
   - 负责 App 侧连接接入
   - 负责将访问请求绑定到指定 connector/service
   - 负责字节流中转
   - 不解密业务流量，不终止业务 TLS
4. `Connector`
   - 部署在私网环境中
   - 主动出站连接 Relay
   - 负责接入本地服务并完成桥接
5. `TermLink First-Party Integrations`
   - 指当前项目内已存在的 `server + Android App` 两个首期集成面
   - 负责承接首批 Relay 接入改造，但不是 Relay 特有状态模型的长期归属

### 4.1.1 当前项目耦合与未来独立项目边界

1. 当前 TermLink 后台与 Android App 是本需求首批实现的第一方集成面，但不是未来 Relay 控制面的唯一运行边界。
2. `Relay Control API / Relay Transit / Connector / Console Web` 必须按未来可独立立项、独立仓库、独立部署的产品子系统设计；即使首期先在当前仓库孵化，也应保持可迁出的职责与接口边界。
3. 当前 TermLink 服务端的职责是继续提供既有 `sessions API + terminal WebSocket` 语义，或在必要时充当兼容适配面；它不应成为 `app_client / connector / inventory / policy / ticket / audit` 等 Relay 特有状态的唯一 source of truth。
4. Android App 的 Relay 接入必须依赖文档化、可版本治理的网络契约，而不是共享源码、隐藏数据库结构、进程内对象或 repo-private 枚举。
5. 后续独立 Relay 项目的发版节奏可以与当前 TermLink 后台、Android App 解耦，但兼容承诺必须在 REQ/PLAN/CR 与验收中显式记录，不能靠默认同步发版假设。
6. 若首期实现先落在当前仓库，至少要保留可替换的 discovery provider、pairing/ticket provider、inventory publisher、audit sink 与 transit binding adapter 边界，以支撑后续拆分迁移。

### 4.2 安全原则

1. Relay 是“传输编排与授权边界”，不是“业务身份终点”。
2. `App <-> Target Server` 的业务身份校验继续按现有直连/mTLS 契约执行。
3. Relay 不保存目标服务明文账号口令。
4. Relay 不终止业务 TLS，不替代目标 Server 的证书身份。
5. App 访问 Relay 使用短时票据或短时 access token，并与具体 service/session 强绑定。
6. Connector 使用独立设备身份，支持注册、吊销、轮换。
7. 所有关键动作必须进入审计日志。

### 4.3 用户流程

管理员视角：

1. 登录控制台并完成 MFA。
2. 创建 connector 注册令牌。
3. 在私网主机部署并启动 connector。
4. connector 注册上线并上报本地 service。
5. 管理员为 service 配置访问策略。
6. 管理员预创建一个独立 `app_client` 槽位，配置展示名称/状态，并签发一次性注册码。
7. 管理员为该 `app_client` 授权可访问的 service 范围。
8. App 输入一次性注册码并认领对应 `app_client`。
9. App 以已配对且可用的 `app_client` 身份通过 Relay 模式选择目标 service 并发起连接。
10. Relay 验证授权并签发短时票据。
11. App 使用票据访问指定 API/WS。
12. Relay 绑定到对应 connector 通道并完成转发。

### 4.4 透明 Relay 约束

以下约束必须作为本需求的硬约束保留：

1. Relay 不应改变客户端可见的目标身份语义。
2. App 仍需校验目标 Server 身份，而不是 Relay 身份。
3. Relay 不应让 Relay 地址被错误等价为目标服务身份。
4. 若未来 Relay 引入新的外显目标身份，或必须由 Relay 终止 TLS，则必须新建 REQ 重新评审。
5. Relay 模式必须显式区分：
   - `relay ingress`：App 实际连上的 Relay 入口地址/端口，仅用于传输接入
   - `target identity`：App 继续校验的目标 Server 身份语义，至少包含现有 mTLS 契约所需的 `server address + allowedHosts`，必要时补充 `SNI/Host`
6. `relay ingress` 不得覆盖或替换 `target identity`；App 的证书校验、Host 校验与 mTLS 绑定仍以 `target identity` 为准。
7. 首期 Relay 数据面只承载既有 `sessions list/create/delete/rename API + terminal WebSocket`，不扩展为通用代理层。
8. Relay 访问票据必须与具体 `service`、`app_client`、`relay ingress` 和目标身份快照强绑定；任一维度不匹配都必须拒绝访问。
9. 若现有 `server address + allowedHosts` 无法表达 Relay 场景下的目标身份，则必须新增连接寻址契约并重新评审，不得在实现阶段隐式改写 profile 语义。
10. 首期票据只允许承载于既有 `sessions API` 请求元数据或 `terminal WebSocket` upgrade 请求元数据中；Relay 必须在进入透明字节流转发前完成票据校验、service 选择和 connector 绑定。
11. 上述票据承载与 upgrade 前授权属于既有 API/WS 接入约束的收紧，不视为新增通用 relay envelope；upgrade/建连完成后不得再注入额外业务帧、控制帧或二次握手层。
12. `target identity` 的 source of truth 来自 connector 已上报的 inventory 身份信息，并在管理员发布 `published_service` 时形成受控快照；控制面不得脱离 inventory 凭空生成新的目标身份语义。
13. `published_service` 一旦发布，其 `target identity` 只能通过显式变更流程更新；任何会改变 `server address / allowedHosts / SNI / Host` 语义的修改都必须使既有 access ticket 失效并进入审计。
14. 首期一个 `published_service` 固定表示一个可被 App 选择的“TermLink 终端服务单元”，其能力边界固定为同一目标上的既有 `sessions list/create/delete/rename API + terminal WebSocket` 组合，不拆成两个独立授权资源。
15. App 首期只选择一个 `published_service` 作为目标；access ticket 也只绑定这一逻辑 service 单元。即使其中某一条链路临时不可用，也不改变其仍属于同一 `published_service` 的产品语义。
16. 首期 connector inventory 的最小发布单位固定为 `connector_inventory_item`；每个 item 至少必须稳定表达：来源 connector 内唯一 item 标识、能力类型、供 connector 本地桥接使用的目标引用、目标身份源字段、当前健康/可发布状态。
17. 每个 `published_service` 必须且只能引用一个 `connector_inventory_item` 作为来源；控制面不得把多个 inventory item 拼接成一个 service，也不得在没有来源 item 的情况下手工创建 service。

### 4.5 首期授权主体模型

首期访问主体固定为独立 `app_client`，用于承载 App 侧访问策略、票据签发和审计主体：

1. `admin_user` 只用于控制台登录、MFA、发布 service、配置策略与查看审计。
2. `app_client` 表示一个受信 App 安装实例/设备实例，不等价于管理员账号，也不等价于 connector。
3. 首期一个 `app_client` 在任意时刻只允许存在一个有效绑定实例；同一绑定凭据不得被设计为可同时在多台设备、多个安装实例或导出后的副本上并行复用。
4. 首期所有访问策略、票据签发和越权校验都以 `app_client` 为 App 侧主体；`issuedTo` 不再允许语义悬空。
5. `connector` 是设备接入主体，只负责上报 inventory、维持通道和桥接目标服务，不拥有 App 侧访问权限。
6. 审计必须能区分 `admin_user / app_client / connector` 三类主体。

### 4.6 首期 `app_client` 配对生命周期

首期 `app_client` 生命周期固定为“预创建后认领”，不采用“设备自注册直接生成主体”：

1. 管理员先在控制台创建空的 `app_client` 槽位，再为其签发一次性注册码。
2. 一次性注册码只用于认领既有 `app_client`，不负责创建新的 `app_client`。
3. App 使用有效注册码认领后，`app_client` 才进入可发放 `relay_access_ticket` 的可用状态。
4. 首期最小生命周期动作必须可被控制面和审计区分：创建、注册码签发、配对完成、禁用/吊销、重配对。
5. 重配对必须通过管理员侧重新签发注册码触发，旧注册码失效，已有绑定状态需可追踪。
6. 首期认领成功后，控制面必须向 App 下发一个可后续识别同一 `app_client` 绑定关系的长期绑定凭据或等效设备证明；后续 access ticket 签发必须同时校验该绑定凭据的有效性，不能仅依赖一次性注册码历史记录。
7. 首期 `app_client` 的长期绑定凭据默认只服务于当前认领成功的单一 App 安装实例；App 卸载重装、清除本地数据、跨设备迁移或从备份恢复到另一安装实例时，都必须视为旧绑定失效并走管理员触发的重配对流程。
8. 重配对、禁用或吊销后，旧绑定凭据必须立即失效；旧 App 持有旧绑定凭据继续申请 ticket 时必须被拒绝并进入审计。

### 4.7 生命周期与状态机边界

REQ 不冻结最终枚举名，但首期至少必须能稳定区分以下生命周期语义：

1. `connector`
   - `pending_registration`：已拿到注册材料但尚未完成控制面接入。
   - `online/active`：已完成注册并维持有效控制面通道。
   - `degraded`：通道仍在，但健康信息、版本、桥接能力或 inventory 完整性存在问题。
   - `offline`：心跳/通道丢失，不能承接新的 Relay 访问。
   - `revoked/replaced`：身份已吊销、被替换或不再可信。
2. `connector_inventory_item`
   - `reported`：已被 connector 上报，控制面可见但未发布。
   - `publishable`：满足最小语义和健康要求，可进入发布流程。
   - `published`：已被某个 `published_service` 引用。
   - `drifted`：目标身份、桥接引用或关键能力发生漂移，等待管理员确认。
   - `withdrawn`：来源 connector 显式撤回或不再上报。
3. `published_service`
   - `draft`：控制面已建立管理对象但尚未对 App 暴露。
   - `published`：可被已授权 App 发现并申请 ticket。
   - `degraded`：仍可见，但存在 connector/健康/桥接告警。
   - `blocked_by_drift`：因来源 inventory 身份漂移而停止新 ticket 签发。
   - `offline/unpublished`：停止对外提供访问。
4. `app_client`
   - `precreated`：管理员已创建槽位但尚未签发注册码。
   - `claimable`：已签发可用注册码，等待 App 认领。
   - `active`：认领完成且当前绑定凭据有效。
   - `disabled`：管理员禁用，不允许签发 ticket。
   - `re_pair_required`：需重新认领；旧绑定不得继续使用。
5. `relay_session_ticket`
   - `issued`：已生成但尚未被使用。
   - `bound/in_use`：已在 API/WS 入口完成绑定并进入访问过程。
   - `expired`：超过有效期。
   - `replayed/rejected`：因重放、主体不匹配、service 不匹配、版本不兼容或其他前置校验失败而被拒绝。

## 5. 接口/数据结构变更

### 5.1 逻辑实体

首期控制面至少需要以下逻辑实体，用于表达角色边界、发布关系、授权和审计：

1. `organization`
2. `admin_user`
3. `app_client`
4. `connector`
5. `connector_inventory_item`
6. `published_service`
7. `relay_access_policy`
8. `relay_session_ticket`
9. `relay_audit_event`

### 5.2 实体职责要求

REQ 只固定实体职责与关键约束，不冻结数据库 schema、字段枚举或 wire-level 命名。

1. `organization`
   - 表示首期单组织边界，并为管理员、App 访问主体、connector、service、策略和审计提供归属关系。
2. `admin_user`
   - 仅用于控制台登录、MFA、配置、授权和审计查询。
3. `app_client`
   - 表示一个被管理员预创建并由 App 认领的独立访问主体。
   - 必须具备稳定的主体标识；展示名称、备注或分组信息变化不得改变其主体身份。
   - 必须能表达未配对、可用、禁用与重配对后的最新绑定状态。
   - 未完成配对或已禁用的 `app_client` 不得申请 Relay 访问票据。
   - 首期同一 `app_client` 在任意时刻只允许存在一个有效绑定实例，不支持多设备或多安装实例共享同一主体。
   - 认领成功后必须具备一个可持续识别当前绑定关系的长期绑定凭据或等效设备证明；重配对、禁用或吊销后旧凭据必须失效。
4. `connector`
   - 表示部署在私网环境中的设备接入主体。
   - 必须承载设备身份、在线状态、最近心跳、版本与基础主机信息等能力，以支撑注册、吊销、轮换和运维观测。
5. `connector_inventory_item`
   - 表示 connector 上报的一个最小可发布 inventory 单元。
   - 每个 item 至少必须稳定表达：来源 connector 内唯一 item 标识、能力类型、供 connector 本地桥接使用的目标引用、目标身份源字段、当前健康状态、当前可发布状态。
   - 首期能力类型固定为“同一目标上的既有 `sessions list/create/delete/rename API + terminal WebSocket` 组合能力”，不扩展为任意 TCP 或其他协议族。
   - item 标识在同一 connector 生命周期内必须稳定可追踪；若 connector 认为该 item 已消失、替换或身份语义变化，必须以上报变更的方式显式通知控制面。
6. `published_service`
   - 表示从 connector inventory 中选择并发布出来的可访问服务。
   - 必须具备稳定的 `published_service` 标识；展示名称、说明、分组或排序变化不得改变其逻辑 service 身份。
   - 首期一个 `published_service` 固定对应同一目标上的既有 `sessions list/create/delete/rename API + terminal WebSocket` 组合能力；它是一个逻辑终端服务单元，不拆成两个独立授权对象。
   - 每个 `published_service` 必须且只能引用一个 `connector_inventory_item` 作为来源；控制面不能把多个 inventory item 拼接成一个 service，也不能把一个 item 拆成多个首期 service。
   - 控制面只能发布 connector 已上报并确认的 inventory 项，不能把 connector 重定向到任意私网 `host:port`。
   - 必须保留目标身份语义，以支撑 App 继续按既有 mTLS/Host 契约校验目标服务。
   - 其 `target identity` 必须来源于 connector inventory 上报并经管理员确认的字段快照；发布后不得由控制面脱离 inventory 语义自行补猜、拼接或静默改写。
   - 若 connector 后续上报的 inventory 身份信息与已发布快照不一致，控制面必须将该 service 标记为身份漂移或待确认状态；在管理员显式确认前不得静默自动跟随新身份继续签发 access ticket。
   - 至少要区分“身份/兼容上下文相关变更”和“纯展示元数据变更”两类；前者会影响 ticket 可用性与缓存有效性，后者不得无故使现有选择失效。
7. `relay_access_policy`
   - 表示 `app_client` 到 `published_service` 的访问授权关系。
8. `relay_session_ticket`
   - 表示面向既有 `sessions API` 与 `terminal WebSocket` 的短时访问票据。
   - 必须绑定访问主体、目标 service、Relay 接入点和目标身份快照，并支持过期、单次使用或等效的重放防护能力。
   - 必须在既有 `sessions API` 请求或 `terminal WebSocket` upgrade 阶段完成校验与绑定；透明转发开始后不得再依赖新增 envelope 或 TLS 终止来补做授权。
9. `relay_audit_event`
   - 表示关键控制面与访问动作的审计记录。
   - 必须能区分 `admin_user / app_client / connector` 三类主体，并默认以脱敏方式保存敏感上下文。

### 5.2.1 状态归属与唯一真相来源（source of truth）

1. `organization / admin_user / app_client / connector / connector_inventory_item / published_service / relay_access_policy / relay_audit_event` 等 Relay 特有控制面状态的唯一真相来源（source of truth）默认位于 Relay 控制面边界，而不是当前 TermLink 服务端私有模块或 Android 本地缓存。
2. 当前 TermLink 服务端继续承担既有 `sessions API + terminal WebSocket` 目标服务语义，必要时可承接兼容适配职责，但不应反向成为 `app_client`、策略、inventory、发布关系或审计生命周期的唯一真相来源。
3. Android App 只保存其运行所需的本地绑定态、发现结果缓存或受保护凭据，不拥有 Relay 策略、service 发布状态、connector inventory 或审计记录的最终裁决权。
4. `relay_session_ticket` 可采用短时分布式校验或无状态载荷，但其签发规则、撤销语义、绑定维度与版本兼容边界仍由 Relay 控制面定义并审计。
5. 若后续把 Relay 控制面 / Transit / Connector 迁出到独立仓库，Relay 特有状态的归属必须随控制面边界整体迁移，不能长期悬挂在当前仓库内部状态上。

### 5.3 控制台 Web 能力方向

控制台 Web 侧至少需要覆盖以下产品能力边界：

1. 管理员登录与 MFA 验证。
2. connector 接入引导、注册令牌发放、在线状态与基础健康观测。
3. connector inventory 可视化，以及基于 inventory 的 service 发布、上下线与变更管理。
4. `app_client` 槽位预创建、状态管理、一次性注册码签发与认领状态查询。
5. 基于 `app_client` 到 `published_service` 的访问授权配置。
6. 审计事件检索与关键安全动作追踪。

REQ 只固定控制台必须承载的产品能力，不冻结最终页面数量、导航结构、模块拆分或视觉布局。

### 5.4 Relay 服务端 API 方向

至少需要覆盖以下责任边界：

1. 管理员登录与 MFA 验证。
2. connector 注册、心跳和 inventory 同步。
3. published service 的创建、变更、上下线。
4. `app_client` 槽位预创建、一次性注册码签发与 App 认领。
5. 基于 `app_client` 与访问策略的 access ticket 签发。
6. 审计事件查询。

REQ 只固定接口责任边界和安全约束，不冻结最终 endpoint 命名、请求结构或响应字段。

接口约束补充：

1. service 发布与变更只能引用 connector 已上报的 inventory 项，不允许控制面直接写入任意私网 `host:port`。
2. 每个可发布 inventory 项必须至少携带稳定 item 标识、能力类型、供 connector 本地桥接使用的目标引用、目标身份源字段、健康状态与可发布状态；控制面不得依赖缺失这些语义的 inventory 项完成发布。
3. `published_service` 必须且只能引用一个 `connector_inventory_item` 的稳定 item 标识作为来源；不允许无来源发布，也不允许把多个 item 合并成一个首期 service。
4. `published_service.target identity` 只能取自 connector inventory 并在发布时冻结为受控快照；若目标身份语义变化，必须走显式变更并使旧 ticket 失效。
5. `app_client` 必须由管理员预创建；App 不得绕过控制台直接创建访问主体。
6. 注册码只用于认领既有 `app_client`，并必须具备单次使用、过期失效和审计能力。
7. 认领成功后必须生成长期绑定凭据或等效设备证明；后续 access ticket 签发必须基于“已完成配对且处于可用状态的 `app_client` + 当前有效绑定凭据 + 访问策略”做授权判断。
8. 同一 `app_client` 的长期绑定凭据不得被设计为可跨设备导出、跨安装实例恢复或并行复用；若检测到 App 卸载重装、清除数据、备份恢复到新安装实例或管理员触发重配对，控制面必须要求重新认领。
9. access ticket 只服务于既有 `sessions API` 与 `terminal WebSocket` Relay 路径，不扩展为通用代理授权。
10. 首期 access ticket 的 `service` 绑定对象固定为单个 `published_service` 逻辑终端服务单元，而不是拆分后的 API 资源或 WebSocket 资源；同一 ticket 只允许访问该 service 对应的 `sessions list/create/delete/rename` 与配套 `terminal WebSocket`。
11. access ticket 的携带位置只允许落在既有 HTTP 请求或 WebSocket upgrade 元数据中，Relay 必须在转发业务字节流前完成授权，不得通过新增通用 envelope 补做 service 选择。
12. 若 connector inventory 与已发布 `published_service` 的目标身份快照发生漂移，控制面必须阻止新 ticket 继续签发，直到管理员显式确认保留旧快照或发布新的目标身份版本。

### 5.4.1 控制面状态流转要求

1. `connector enrollment flow`
   - 至少要覆盖：注册材料签发、首次注册、身份确认、心跳建立、进入可同步 inventory 状态、身份轮换/替换、吊销。
   - 首次注册请求在网络抖动或客户端重试下必须具备幂等语义或显式重复拒绝语义，不能静默创建多个“看起来都合法”的 active connector 身份。
2. `connector inventory sync flow`
   - 控制面至少要能区分“完整快照同步”和“增量变更同步”或等效语义，以支撑 connector 重启、重连和大规模 item 变更后的状态收敛。
   - 每次被控制面接受的 inventory 变更都必须具备可观测的确认结果、版本/代次/时间序语义或等效机制，以支撑重试、审计和身份漂移判定。
   - 当 item 被来源 connector 显式撤回、在完整快照中消失或被报告为身份变化时，控制面不得继续把旧 item 静默当作可发布来源。
3. `published_service lifecycle flow`
   - service 发布动作必须原子冻结：来源 `connector_inventory_item`、`target identity` 快照、当时的兼容上下文与必要的审计上下文。
   - 任何会改变来源 item、目标身份或兼容上下文的动作，都必须作为显式状态流转处理，而不是在原对象上静默覆盖。
   - 当 connector 被吊销、离线、inventory 被撤回或身份漂移发生时，`published_service` 至少要在“仍可见但阻断签发”“下线”“待确认”之间有可审计的区分。
   - 纯展示元数据变更必须与身份/兼容上下文变更区分处理；前者不应触发无意义的主体、缓存或 ticket 失效。
4. `app_client` 认领与绑定流程
   - 至少要覆盖：槽位预创建、注册码签发、认领尝试、认领成功、绑定凭据下发、绑定轮换、禁用、重配对、吊销。
   - 若 App 在认领成功后因网络中断未收到响应，重复提交不得静默创建第二个 `app_client` 或第二份并行有效绑定；应提供幂等恢复、显式冲突或需人工处理语义。
   - 重配对必须在旧绑定失效与新绑定生效之间提供明确顺序或原子切换语义，不得留下双绑定同时可签发 ticket 的窗口。
5. `relay_session_ticket` 签发与消费流程
   - ticket 签发前至少要校验：`app_client` 状态、绑定凭据、访问策略、`published_service` 状态、connector 可用性、契约版本、`relay ingress`/`target identity` 绑定前提。
   - ticket 消费必须发生在 `sessions API` 入口或 `terminal WebSocket` upgrade 入口；在进入透明转发前完成单次使用或等效重放防护状态落定。
   - 若 ticket 在消费阶段失败，控制面必须给出可审计的拒绝原因，且不能留下“已部分绑定但又不可继续使用”的未定义中间态。
6. `control-plane mutation safety`
   - service 发布/下线、策略变更、绑定轮换、漂移确认、connector 替换/吊销等状态变更，必须具备单调版本号、epoch、CAS、幂等键或等效的并发防护机制。
   - 当管理端、connector 或 App 基于过期状态发起变更时，系统应优先返回“冲突/需刷新后重试”语义，而不是默默以最后一次写入覆盖前态。

### 5.4.2 控制面拒绝语义与可重试边界

1. 控制面至少要能稳定区分以下拒绝类别：重复注册、注册材料失效、主体禁用、需重配对、策略未授权、service 不可用、身份漂移阻断、契约版本不兼容、ticket 重放、目标身份不匹配、并发冲突/需刷新。
2. REQ 不冻结最终错误码字符串，但要求错误类别能在控制面、App 与审计中稳定映射，不得因不同接口或不同实现方而语义漂移。
3. 每个拒绝类别都应能被区分为至少以下三类后续动作之一：可自动重试、需用户操作、需管理员/运维处理。
4. 对“不可自动重试”的失败，控制面不得通过模糊的通用 `500` 或普通网络错误掩盖真实原因。

### 5.4.3 变更生效、ticket 失效与活动连接治理边界

1. `app_client` 禁用/吊销、访问策略收回、`published_service` 下线、来源 connector 被吊销、身份漂移阻断、契约版本不再兼容等事件，必须立即阻止新 ticket 签发，并使尚未消费的旧 ticket 失效或进入显式不可用状态。
2. 对已进入入口消费阶段的访问，控制面至少要能区分“尚未真正开始透明转发”和“已经建立活动连接”两类状态，避免把两者混成同一种失效处理。
3. 安全敏感事件发生时，控制面必须具备对已建立活动连接执行显式治理的能力，例如强制断开、拒绝续用或进入受控排空；具体策略可在后续实施中细化，但不得完全缺席。
4. 纯展示元数据变更（如 service 显示名、说明、排序变化）不得无故使已签发 ticket 失效，也不得让 App 因缓存键变化误判成一个新的逻辑 service。
5. 任何会让 ticket 失效或活动连接治理策略发生变化的动作，都必须进入审计，并可追溯到触发它的主体、对象与原因类别。

### 5.5 Connector 通道能力方向

connector 到 Relay 控制面的通道至少需要覆盖以下能力：

1. connector 注册接入、身份校验与后续轮换/吊销的一致性。
2. 在线状态维持、心跳保活与基础版本/健康信息上报。
3. service inventory 的持续同步与变更可见性。
4. 面向已发布 service 的 Relay 数据通道建立、回收与生命周期追踪。
5. 面向控制面和审计面的状态回传与错误类别上报。

connector inventory item 的最小语义要求：

1. 每个 item 必须有在该 connector 作用域内稳定唯一的 item 标识，供控制面发布、审计、漂移检测和下游 ticket 绑定引用。
2. 每个 item 必须显式声明能力类型；首期只允许“`sessions list/create/delete/rename API + terminal WebSocket` 组合能力”这一类型。
3. 每个 item 必须携带供 connector 本地桥接使用的目标引用，但该引用只作为 connector 内部执行语义，不直接暴露为控制面可任意编辑的私网 `host:port`。
4. 每个 item 必须携带形成 `target identity` 所需的源字段，以支撑控制面冻结 `published_service` 快照和后续身份漂移判定。
5. 每个 item 必须携带当前健康状态与可发布状态；控制面只能基于明确可发布的 item 创建或继续维持 `published_service`。

REQ 只固定通道生命周期与责任边界，不冻结消息名、帧结构、事件枚举或具体传输切片。

### 5.6 App 协议补充

App 侧必须补充以下能力：

1. 使用一次性注册码认领既有 `app_client`。
2. Relay 模式的服务发现与连接入口。
3. 访问票据获取与携带。
4. `sessions API` 经 Relay 的寻址方式。
5. `terminal WebSocket` 经 Relay 的 ticket 绑定方式。
6. 将 `relay ingress` 与 `target identity` 作为两个独立概念处理；前者用于实际建连，后者用于目标 Server 身份校验。
7. Relay 服务发现返回的首期选择对象固定为 `published_service` 逻辑终端服务单元；App 不把 `sessions API` 和 `terminal WebSocket` 展示或授权为两个独立 service。
8. Relay 访问描述不得静默改写当前 profile 中的 `server address / allowedHosts / mTLS` 语义；若需要新增字段，必须显式落在新的 Relay 发现契约中。
9. App 必须把长期绑定凭据仅保存在当前安装实例的受保护本地存储中；首期不支持把该凭据导出、同步或恢复到另一安装实例后继续复用。
10. 在 `sessions API` 请求发起时或 `terminal WebSocket` upgrade 完成前，显式携带 access ticket 并完成 service 绑定；upgrade 成功后不得再引入额外 envelope。

同时明确：

1. 不得破坏现有 profile 级 mTLS 配置契约。
2. 不得把 Relay 地址错误地等价成目标服务身份。
3. 不得在首期通过 Relay 访问既有 `sessions API` / `terminal WebSocket` 之外的能力。

### 5.7 跨项目契约与版本治理

1. 至少要冻结以下跨项目契约：`relay discovery contract`、`app_client pairing/binding contract`、`relay access ticket contract`、`connector registration + inventory contract`、`relay transit error/compatibility contract`。
2. 上述契约必须具有显式版本/兼容策略；任何破坏性变更都必须通过版本升级、兼容窗口或新的 REQ/PLAN 批次处理，不能在实现阶段静默漂移。
3. 当前 TermLink 后台、Android App 与未来独立 Relay 项目之间只能通过文档化网络契约或等效服务边界协作，不得把共享源码、私有数据库表结构、进程内对象或本地存储格式当作唯一集成前提。
4. 若首期实现先落在当前仓库，至少要保留可替换的 discovery provider、pairing/ticket provider、inventory publisher、audit sink 与 transit binding adapter 边界，以支撑后续独立仓库迁出。
5. 后续 PLAN / CR / 验收必须明确兼容矩阵至少覆盖：当前 Android App 主线、当前 TermLink 后台主线、当期 Relay 控制面版本；兼容范围缩窄时必须显式记录。
6. 每个跨项目契约至少要具备显式版本宣告或协商能力；对不支持的版本必须返回稳定、可审计的“不兼容/需升级”错误，而不是静默降级、隐式回退或复用旧字段。

### 5.8 控制面 API / 协议切片

REQ 不冻结最终 endpoint 命名，但至少要覆盖以下协议切片与职责：

1. 管理员认证与 MFA
   - 管理员登录、MFA 挑战、会话续期、退出登录。
   - 必须能区分认证失败、MFA 失败、账号禁用、版本不兼容等错误类别。
2. `connector enrollment`
   - 注册材料签发、首次注册、身份轮换、吊销、替换。
   - 必须能区分未注册、已吊销、注册材料过期、身份冲突等状态。
3. `connector heartbeat + inventory`
   - 心跳保活、基础健康信息、版本信息、inventory 全量/增量同步、撤回与漂移提示。
   - 控制面必须能判断“在线但不可发布”“在线但身份漂移”“离线但历史对象仍在”等不同语义。
4. `published_service lifecycle`
   - 基于 inventory 的发布、下线、恢复、漂移确认、身份版本切换。
   - 任何会影响 `target identity` 的变更都必须走显式生命周期动作，不得隐式覆盖。
5. `app_client` 认领与绑定
   - 槽位创建、注册码签发、认领、重配对、禁用/吊销、绑定凭据轮换。
   - 必须能区分“注册码无效/过期”“主体禁用”“旧绑定已失效”“需要重配对”等可审计状态。
6. `relay_access_policy`
   - `app_client` 到 `published_service` 的授权创建、收回、查看与变更。
   - 访问策略变更必须影响后续 ticket 签发与拒绝审计。
7. `relay_session_ticket` 签发与消费
   - ticket 签发、入口校验、绑定拒绝、过期/重放拒绝。
   - ticket 的签发与消费必须共享同一套绑定语义，而不是由多个隐式规则源分别判定。
8. 审计查询与兼容性可见性
   - 审计查询、关键事件关联、契约版本宣告或协商结果可见性。
   - 后续独立 Relay 项目至少要能对外表达“当前支持哪些契约版本/兼容窗口”。

### 5.9 App 本地状态与交互要求

App 侧除协议补充外，还必须满足以下本地状态与交互要求：

1. 认领流程必须有独立入口，并清楚区分：未认领、认领成功、注册码失效、主体禁用、需重配对、版本不兼容等状态。
2. App 本地保存的 Relay 相关状态至少包括：当前安装实例绑定凭据、最近一次成功的 Relay 发现结果摘要、最后一次选中的 `published_service` 引用、最近一次失败原因摘要。
3. 上述本地状态只能作为 UX 优化和重试辅助，不能替代控制面对授权、策略、service 可用性或目标身份的最终判断。
4. 当控制面返回“需升级/版本不兼容”时，App 必须把它作为独立错误路径处理，不能把它折叠成普通网络失败或认证失败。
5. 当控制面返回“需重配对/绑定失效”时，App 必须中止继续申请 ticket，并引导回到认领或管理员侧重配对流程。
6. service 发现列表必须以 `published_service` 为展示和选择单位，同时展示足够的摘要信息以支持用户区分目标，但不得把内部 inventory item 细节直接暴露成终端用户必须理解的概念。
7. App 可以缓存发现结果摘要以优化首屏，但缓存过期、service 下线、策略收回、身份漂移或版本不兼容时，必须以后端实时判断为准。
8. App 本地任何“最近使用 service”或“自动重连”逻辑都必须重新走 ticket 申请与入口绑定校验，不能绕过控制面授权。

### 5.9.1 App 认领、恢复与本地持久化状态机

1. App 至少要能区分以下认领相关状态：未开始认领、验证码输入中、认领请求已发出、认领成功待本地持久化、认领完成可用、需重配对、主体禁用、版本不兼容。
2. 只有当绑定凭据已被安全持久化到当前安装实例的受保护存储后，App 才能把本地状态切换为“认领完成可用”；不能在内存中短暂拿到凭据后就把主体视为可恢复。
3. 若控制面已认定认领成功，但 App 因断网、进程被杀或响应丢失未完成本地持久化，后续恢复必须走幂等恢复、显式冲突提示或重新认领指引；不得默默创建新的 `app_client` 或让用户误以为认领失败可直接重试。
4. 若当前安装实例的本地绑定态被清除、损坏或无法解密，即使服务端仍保留该 `app_client` 的 active 记录，App 也必须把自己视为“需恢复绑定或重配对”，而不是继续当作已可用主体。
5. 退出登录、管理员禁用、重配对完成、用户主动清除 Relay 绑定信息或检测到安装实例变化后，App 必须清除或失效化本地绑定态、最近发现结果摘要与最近使用 service 引用。

### 5.9.2 App 服务发现、缓存与错误交互细化

1. App 发现列表至少要区分：首次加载、刷新中、使用缓存回显、无可用 service、未授权、service 不可用、身份漂移阻断、需重配对、版本不兼容等用户可感知状态。
2. 使用 discovery cache 回显时，UI 必须能明确这只是最近一次已知结果，而不是当前实时授权结论；后续连接仍以最新 ticket 申请与控制面判断为准。
3. App 对 `published_service` 的选择、最近使用记录与缓存键应基于稳定的 service 标识，而不是展示名称、排序位置或其他可变元数据。
4. discovery 返回至少要能让 App 区分“稳定 service 标识”“展示元数据”“影响连接的身份/兼容摘要”三类信息；App 不得把它们混成单一不可分对象。
5. 若 `published_service` 的目标身份摘要、可用性、授权状态或兼容上下文相对缓存结果发生关键变化，App 不得在无提示的情况下直接复用旧选择继续连接。
6. 当控制面返回“需重配对”“主体禁用”“版本不兼容”“service 身份漂移阻断”“connector 不可用”等错误时，App 必须给出与下一步动作匹配的独立交互，而不是统一折叠为网络失败 toast。
7. App 的自动重连或“重试上次 service”逻辑，在遇到以上需人工处理状态时必须停止自动循环，并把用户引导到重配对、刷新发现列表、等待管理员处理或升级客户端等明确动作。
8. App 可以记住最近一次选中的 `published_service` 引用，但不能把它视为长期有效授权；每次实际连接都必须重新绑定到新的 ticket 与当前 discovery/compatibility 上下文。
9. 当契约版本不兼容时，App 至少要能展示“当前客户端过旧/控制面不兼容/需要升级”的独立状态，而不是混同为普通登录失败或服务不可达。
10. 当 App 处于离线或弱网环境时，可以先展示本地摘要以减少空白态，但不得在没有成功 ticket 校验的情况下把任何缓存 service 标记为“可立即访问”。

### 5.10 审计、诊断与运维观测要求

1. 至少要能把以下链路关联到同一组可追踪标识：`connector registration`、inventory 变更、service 发布、`app_client` 认领/重配对、ticket 签发、ticket 拒绝、Relay 入口访问、目标握手失败。
2. 审计与诊断至少要区分：控制面拒绝、版本不兼容、绑定失效、策略未授权、connector 不可用、service 下线/漂移、目标身份失败、Relay 接入失败。
3. 不要求在 REQ 层冻结 metrics 名称，但必须预留可支撑独立项目维护的观测面：在线 connector 数、可发布 inventory 数、已发布 service 数、ticket 签发/拒绝量、按错误类别聚合的失败量。
4. 当 Relay 项目未来独立维护后，控制面仍需能单独完成问题归因，而不要求必须联查当前 TermLink 服务端内部日志才能判断 Relay 主链路状态。

### 5.10.1 审计关联与留痕要求

1. 关键控制面动作至少要能关联以下维度中的适用子集：`admin_user`、`app_client`、`connector`、`published_service`、`connector_inventory_item`、`relay_session_ticket`、契约版本、目标身份快照引用、请求/追踪相关标识。
2. 审计记录至少要能回答四个问题：谁发起、针对什么对象、结果如何、为什么成功/失败；不得只保留“成功/失败”二值结论。
3. 对认领、重配对、绑定失效、漂移阻断、ticket 拒绝、版本不兼容、控制面切换等高风险动作，审计必须能回放触发前提与结果类别，而不要求记录完整敏感原文。
4. 审计保留与归档策略不在本 REQ 冻结具体天数，但必须支持未来独立项目按自身运维边界单独查询、归档和导出，不依赖当前 TermLink 服务端日志文件结构。

### 5.10.2 运维治理与观测面要求

1. 独立 Relay 控制面至少要能观测：在线 connector 总量、处于漂移/阻断状态的 service、需重配对/禁用的 `app_client`、ticket 拒绝分类、版本不兼容分类、控制面自身健康状态。
2. 不要求在 REQ 层冻结告警阈值，但必须预留可支持告警的信号面，例如：connector 大面积离线、漂移积压、版本不兼容激增、ticket 拒绝异常升高、控制面写入冲突异常升高。
3. 运维至少要具备以下治理动作的产品语义：禁用/恢复 `app_client`、吊销/替换 connector、下线/恢复 `published_service`、阻断/恢复 ticket 签发、触发重配对、确认或拒绝身份漂移变更。
4. 这些治理动作必须通过控制面显式表达并进入审计，不能依赖修改数据库、手动删文件或直接改当前 TermLink 服务端私有状态作为主要运维手段。
5. 当未来独立项目单独发版时，控制面至少要能暴露当前支持的契约版本、关键组件版本与兼容窗口摘要，以支撑运维判断升级影响。

### 5.11 迁移与兼容切换要求

1. 若首期实现先在当前仓库孵化，后续迁移到独立 Relay 项目时，Android App 的主要切换面应保持在 Relay 发现入口、契约版本和控制面地址层，而不是回退到改写 `target identity` 语义。
2. 当前 TermLink 服务端在迁移后继续承担目标服务语义；迁移动作不应要求把目标服务的 `sessions API + terminal WebSocket` 语义重写为 Relay 私有协议。
3. 迁移期间允许存在“旧部署仍可读、但新 ticket 只从新控制面签发”的过渡窗口，但不允许出现两个彼此独立、互不知情的控制面对同一 `app_client` 或 `published_service` 并发签发有效 ticket。
4. 任一迁移或兼容切换方案都必须把“旧绑定凭据如何处理、旧 ticket 如何失效、旧 service 发布快照如何继承或重建、身份漂移如何重新确认”写入后续实施文档。

### 5.11.1 迁移切换治理要求

1. 任一从“当前仓库孵化实现”迁移到“独立 Relay 项目”的方案，都必须明确单一写入主权切换点：哪一刻开始只有新控制面可以签发 ticket、确认漂移、变更策略和修改绑定关系。
2. 若存在迁移演练、灰度或回滚窗口，必须保证控制面读写职责清晰；允许只读镜像、只读回放或数据校验，但不允许两个控制面对同一逻辑主体同时拥有写主权。
3. 迁移完成或回滚后，运维必须能判断以下状态是否收敛：绑定关系、service 发布快照、inventory 最新代次、ticket 签发主权、版本兼容窗口。
4. 切换与回滚流程必须把“如何冻结旧写入、如何验证新写入、如何恢复旧写入、如何处理切换期间失败的 ticket/认领请求”作为显式步骤，而不是依赖隐式人工经验。

## 6. 验收标准

1. 管理员可登录控制台、完成 MFA，并创建 connector 注册令牌。
2. 私网主机上的 connector 可完成注册、保持心跳，并在断网或重启后自动恢复在线状态。
3. 控制台可查看 connector 在线状态、最近心跳、已上报 inventory 和基础健康信息。
4. 控制台可查看每个 `connector_inventory_item` 的稳定 item 标识、能力类型、目标身份摘要、健康状态与可发布状态；缺少这些最小语义的 item 不得进入发布流程。
5. 管理员可基于 connector inventory 发布 service、配置访问策略，并且控制面不能任意改写私网 `host:port`。
6. 每个 `published_service` 必须明确绑定且只绑定一个 `connector_inventory_item` 作为来源；控制面不能无来源创建 service，也不能把多个 item 拼成一个首期 service。
7. 管理员可预创建 `app_client` 槽位并签发一次性注册码；未认领或已禁用的 `app_client` 不可申请 access ticket。
8. App 可使用有效注册码认领既有 `app_client`，并获得后续申请 ticket 所需的长期绑定凭据或等效设备证明；重复使用、过期或失效注册码必须被拒绝并进入审计。
9. 首期同一 `app_client` 在任意时刻只允许绑定一个有效 App 安装实例；长期绑定凭据不得跨设备、跨安装实例或通过备份恢复方式继续复用。
10. App 卸载重装、清除本地数据、迁移到新设备或从备份恢复到新安装实例后，旧绑定凭据必须失效，并且只能通过管理员重新签发注册码完成重配对。
11. App 在目标服务无公网入口时，仍可通过 Relay 访问既有 `sessions list/create/delete/rename API` 并建立既有 `terminal WebSocket`。
12. 首期 App 侧可选择的最小资源单位固定为一个 `published_service`；该 service 同时覆盖其对应的 `sessions list/create/delete/rename API` 与配套 `terminal WebSocket`，不拆分为两个独立授权对象。
13. 首期 Relay 数据面只覆盖上述 API/WS，不引入通用 relay envelope、任意 TCP 转发或其他代理协议。
14. 若目标服务启用当前 mTLS 契约，经过 Relay 后仍保持既有目标身份语义；App 不会把 Relay 地址误判为目标 Server 身份。
15. Relay 对 `sessions API` 或 `terminal WebSocket` 的授权与 service 绑定发生在既有 HTTP/WS 请求阶段；透明转发开始后不再依赖新增 envelope 或 TLS 终止补做鉴权。
16. access ticket 以 `app_client` 为唯一 App 侧主体，并对未配对、已禁用、绑定凭据失效、未授权、票据过期、票据重放、主体不匹配等场景稳定拒绝。
17. `target identity` 必须可追溯到 connector inventory 和 `published_service` 发布快照；若发布后目标身份语义发生变化或 connector 上报身份与发布快照发生漂移，新 ticket 停止签发，旧 ticket 自动失效并产生审计。
18. App 与审计侧都能稳定区分至少以下错误类别：授权失败、票据失效或重放、connector/已发布 service 不可用、Relay 接入失败、目标身份或握手失败。
19. 管理员登录、MFA、connector 注册、`app_client` 创建与认领、注册码签发、service 发布、策略变更、票据签发和访问拒绝均被审计，且可区分 `admin_user / app_client / connector` 三类主体。
20. 敏感字段默认不完整回显，审计与日志包含脱敏策略。
21. 即使首期实现先在当前仓库孵化，Relay 特有的 `app_client / connector_inventory_item / published_service / relay_access_policy / relay_session_ticket / relay_audit_event` 语义也不依赖当前 TermLink 服务端私有内部模块作为唯一 source of truth。
22. Android App 与未来独立 Relay 项目的交互通过版本化的 Relay 发现、配对、ticket、connector inventory 与错误契约稳定协作；在声明兼容窗口内，Relay 项目可独立升级而不要求 App 与目标服务同步发版。
23. 后续仓库拆分或独立部署时，App 不需要改写既有 `target identity` 语义，也不需要感知当前仓库内部模块路径、数据库表名或进程内对象。
24. Relay 特有控制面状态的唯一真相来源（source of truth）位于 Relay 控制面边界；当前 TermLink 服务端与 App 只能持有兼容适配态、缓存态或本地绑定态，不能反向成为策略、inventory、发布关系或 ticket 生命周期的唯一真相来源。
25. 本需求首期范围明确排除 `workspace / codex / external web`、TLS 终止型网关和多租户 SaaS。
26. `connector / connector_inventory_item / published_service / app_client / relay_session_ticket` 至少具备文档层可区分的生命周期语义，后续实现不得把这些状态混成单一“online/offline”或“enabled/disabled”。
27. 控制面至少能稳定表达 `admin auth`、`connector enrollment`、`inventory sync`、`service lifecycle`、`app_client claim/binding`、`policy change`、`ticket issue/consume`、`audit/compatibility` 八类协议切片责任。
28. App 本地缓存或最近发现结果只能用于 UX 优化，不能绕过控制面对授权、service 可用性、目标身份和版本兼容的实时判断。
29. 当契约版本不兼容时，App、控制面和审计侧都能稳定识别为“需升级/版本不兼容”，而不是把其混入普通网络失败或认证失败。
30. 迁移到独立 Relay 项目后，当前 TermLink 服务端继续作为目标服务提供方时，不需要承接 Relay 特有控制面状态的唯一真相来源（source of truth）职责，也能保持主链路可用。
31. 任一切换期都不会出现两个彼此独立的控制面对同一 `app_client` 或 `published_service` 并发签发有效 ticket 的未定义状态。
32. 控制面能够对 `connector` 重复注册重试、`app_client` 重复认领重试、策略/发布变更并发冲突提供稳定且可审计的结果，不会静默制造重复主体或双写覆盖。
33. inventory 同步至少具备可观测的确认与版本/代次收敛语义；被撤回、消失或发生身份漂移的 item 不会被控制面继续静默视为可发布来源。
34. 重配对、绑定轮换或主体禁用不会留下旧绑定与新绑定并行可签发 ticket 的窗口。
35. ticket 在入口消费失败时会返回可区分、可审计的拒绝类别，且不会留下未定义的半绑定访问状态。
36. 基于过期控制面状态发起的发布、策略、绑定或漂移确认变更会得到“冲突/需刷新”语义，而不是静默以后写覆盖前写。
37. App 只有在绑定凭据已成功持久化后才会把 `app_client` 视为本地可用主体；认领成功但未持久化完成的中断场景不会制造重复主体或伪成功状态。
38. App 能区分“认领成功但待恢复”“需重配对”“主体禁用”“版本不兼容”等不同恢复路径，而不是统一要求用户重新输入注册码。
39. discovery cache 回显、最近使用 service 和记忆化选择只影响 UX，不会绕过最新策略、service 状态、目标身份或版本兼容判断。
40. `published_service` 状态、目标身份摘要或兼容上下文发生关键变化时，App 不会在无提示情况下继续复用旧缓存选择发起连接。
41. App 在“需重配对”“版本不兼容”“service 身份漂移阻断”“connector 不可用”等场景下，会给出与下一步动作对应的独立失败路径，而不是统一折叠为网络失败。
42. 自动重连或“重试上次 service”逻辑不会在需人工处理的错误上进入无限重试循环。
43. 审计至少能把管理员操作、connector 状态变化、`app_client` 认领/重配对、`published_service` 变更、ticket 签发/拒绝、版本不兼容和迁移切换事件通过相关标识串联起来。
44. 运维可以不依赖当前 TermLink 服务端内部日志结构，仅通过 Relay 控制面自身的审计与观测面完成主要故障归因。
45. 禁用 `app_client`、吊销 connector、下线 `published_service`、阻断 ticket 签发、触发重配对、确认漂移等治理动作都具备显式控制面语义和审计留痕。
46. 控制面能够暴露支持的契约版本、关键组件版本和兼容窗口摘要，以支撑独立项目发版与回滚判断。
47. 任一迁移或回滚窗口都保持单一 ticket 签发主权，不会出现双写控制面同时修改绑定、策略或发布状态的未定义行为。
48. 切换完成或回滚后，运维能验证绑定关系、发布快照、inventory 代次、ticket 主权和兼容窗口是否已经收敛。
49. `published_service` 与 `app_client` 都具备稳定标识；展示名称、分组、说明或排序变化不会改变其逻辑身份，也不会破坏 App 的缓存键。
50. 控制面能区分“身份/兼容上下文变更”与“纯展示元数据变更”，前者会影响 ticket 可用性，后者不会无故触发 ticket 失效或 App 误判成新 service。
51. `app_client` 禁用、策略收回、service 下线、connector 吊销、身份漂移阻断等事件会立即阻止新 ticket 与未消费 ticket 继续使用。
52. 安全敏感事件发生时，控制面具备对已建立活动连接执行显式治理的能力，且治理动作可审计。
53. 纯展示元数据变更后，App 的缓存键、最近使用 service 和 discovery 展示仍能稳定映射到同一逻辑 `published_service`，不会引发伪新增或伪失效。
54. 目标身份、来源 item、兼容上下文、授权或主体状态发生变化时，控制面会触发新的 ticket 可用性判断，且 App 不会静默沿用旧缓存继续连接。
55. 对每一类控制面拒绝结果，至少能区分“可自动重试”“需用户操作”“需管理员/运维处理”三种后续动作方向。
56. 安全敏感事件导致的活动连接治理结果（强制断开、拒绝续用、受控排空或等效策略）可被审计、可被 App 感知、可被运维复盘。
57. 关键审计事件至少带有主体、对象、结果、原因类别、契约版本与相关上下文引用，足以支撑独立 Relay 项目单独排障。
58. 在不联查当前 TermLink 服务端私有日志的前提下，运维仍能基于 Relay 控制面的审计与观测面判断：问题是来自主体状态、策略状态、service 状态、版本不兼容还是迁移切换异常。

## 7. 测试场景

1. 控制台与管理员登录
   - 管理员账号登录成功，并完成 MFA 验证。
   - 登录失败、MFA 失败和敏感操作均产生可检索审计。
2. connector 注册、在线状态与 inventory
   - 使用注册令牌在一台私网主机上成功启动 connector 并完成注册。
   - connector 注册后在控制台出现在线状态，断开后在可接受窗口内转为离线，恢复网络后自动重连成功。
   - connector 成功上报 inventory；每个 `connector_inventory_item` 都能在控制台看到稳定 item 标识、能力类型、目标身份摘要、健康状态与可发布状态。
   - 控制台尝试发布一个未出现在 inventory 中的内网 `host:port`、缺少最小语义字段的 item，或多个 item 拼接成一个首期 service 时被拒绝。
3. `app_client` 预创建、认领与重配对
   - 管理员预创建一个 `app_client` 并签发一次性注册码；未认领前直接申请 ticket 被拒绝。
   - App 使用有效注册码认领成功后，`app_client` 进入可用状态，并生成配对审计与后续绑定凭据。
   - 同一 `app_client` 不允许在两台设备或两个安装实例上同时保持有效绑定；尝试导入旧绑定凭据到新设备、卸载重装后继续使用旧凭据，或从备份恢复后继续申请 ticket 均必须被拒绝并产生审计。
   - 同一注册码重复使用、注册码过期、主体被禁用、绑定凭据失效或重配对后旧绑定继续申请 ticket 均被拒绝并产生审计。
4. Relay 访问主链路
   - 发布一个 `published_service` 后，已配对 App 以该单一 service 作为目标，同时可访问其对应的 `sessions list/create/delete/rename API` 与配套 `terminal WebSocket`。
   - 不允许把同一目标上的 `sessions API` 与 `terminal WebSocket` 作为两个独立 service 分别授权、分别发现或分别签发 ticket。
   - 首期只允许 Relay 化的 `sessions list/create/delete/rename` 与 `terminal WebSocket`；超出范围的 relay 访问请求不纳入本期。
5. 错误模型与审计
   - 使用过期票据或重复票据访问 Relay，App 与审计侧都能识别为票据失效/重放类错误。
   - 使用无权限 `app_client` 访问 service，App 与审计侧都能识别为授权失败类错误，并生成审计。
   - service 下线、connector 离线或 Relay 不可达时，App 与审计侧都能识别为服务/通道不可用类错误。
   - 票据中的 `relay ingress` 与目标身份快照不匹配，或目标服务握手失败时，App 与审计侧都能识别为目标身份/握手失败类错误。
   - access ticket 未在既有 HTTP 请求或 WebSocket upgrade 阶段提供，或尝试在透明转发后补做 service 选择时，Relay 必须拒绝并记录审计。
6. 透明身份约束验证
   - 使用票据中的 `relay ingress` 与目标身份快照发生不匹配时，访问被拒绝。
   - 目标服务开启 mTLS 时，经 Relay 访问仍满足现有证书校验契约。
   - connector inventory 上报的目标身份、`published_service` 发布快照与 ticket 中绑定的目标身份三者保持一致；任一环节发生变更或出现身份漂移时新 ticket 停止签发，旧 ticket 失效。
   - 文档评审确认首期未把 Relay 扩展到 `workspace / codex / external web`，也未扩展成 TLS 终止型网关。
7. 跨项目维护与拆分边界
   - 在不改变契约版本的前提下，单独升级 Relay 控制面/Transit 后，当前 Android App 仍可完成发现、认领、ticket 申请和 `sessions + terminal` 访问。
   - 若未来把 Relay 控制面/Transit/connector 迁出到独立仓库，App 仍通过同一类 Relay 发现与 `target identity` 契约工作，不需要重写 profile 语义。
   - 若确需引入破坏性契约变更，系统必须通过显式版本协商、兼容窗口或拒绝策略暴露，而不是静默复用旧字段产生错误行为。
   - 当 App 或 Relay 控制面使用不受支持的契约版本时，系统返回稳定、可审计的“不兼容/需升级”错误，而不是静默降级。
   - 切换到独立部署的 Relay 控制面后，`app_client / inventory / policy / published_service / audit` 等 Relay 特有状态仍由控制面边界负责；当前 TermLink 服务端无需持有这些实体的 authoritative state 才能继续作为目标服务提供方被访问。
8. 生命周期、切换与缓存边界
   - `connector`、`published_service`、`app_client`、`relay_session_ticket` 至少能在审计和接口返回中区分本 REQ 定义的关键生命周期语义，而不是只返回单一启用/禁用结果。
   - App 持有过期 discovery cache、过期 binding 或“最近使用 service”状态时，重新连接仍必须以后端实时策略和 ticket 绑定结果为准。
   - 迁移到独立 Relay 项目时，不允许出现两个控制面对同一逻辑主体并发签发有效 ticket 的窗口。
   - 版本不兼容、需重配对、service 身份漂移、connector 被吊销等状态都必须在 App 与审计侧表现为可区分的失败路径。
9. 控制面重试、冲突与撤回路径
   - `connector` 首次注册成功但客户端未收到响应后重试，系统不会创建第二个 active 身份；返回结果要么可幂等恢复，要么明确指向重复/冲突。
   - `app_client` 认领成功但 App 超时重试时，不会生成第二个主体或第二份并行有效绑定。
   - inventory 完整快照中缺失的 item、被显式撤回的 item 或发生身份漂移的 item，会进入可观测且可审计的非发布态，而不是继续静默维持旧发布语义。
   - 管理员基于旧页面状态提交发布/策略/漂移确认变更时，控制面会返回冲突/需刷新语义。
   - ticket 被重复消费、在消费前 service 状态变化、或入口绑定前提不再满足时，访问被拒绝且不会残留半绑定状态。
10. App 认领、缓存与交互恢复路径
   - App 在认领成功后于“绑定凭据落盘前”被杀进程或断网恢复时，不会误判为完全失败并创建新的 `app_client`；系统提供幂等恢复、明确冲突或重配对提示。
    - 清除本地数据、绑定凭据损坏、安装实例变化或恢复到不同设备后，App 会进入“需恢复绑定或重配对”路径，而不是继续按旧主体静默申请 ticket。
   - 使用 discovery cache 首屏回显时，UI 能标识缓存态；当后端返回 service 下线、未授权、漂移阻断或版本不兼容时，App 不会继续按缓存结果自动连接。
   - 选择过的 `published_service` 在关键摘要变化后需要重新确认、重新发现或显式失败，而不是把旧缓存选择偷偷带入新 ticket 申请。
   - `需重配对 / 版本不兼容 / service 身份漂移阻断 / connector 不可用` 至少四类错误在 App 上具备不同文案或操作入口，避免用户只能反复点击重试。
11. 审计、观测与迁移治理路径
   - 管理员执行 service 发布/下线、策略调整、重配对、connector 吊销后，审计能串联相关主体、对象、结果与原因。
   - 版本不兼容激增、connector 大面积离线、漂移积压或 ticket 拒绝异常升高时，Relay 控制面自身即可提供可观测信号。
   - 切换到独立 Relay 项目、灰度回切或回滚时，运维能确认单一 ticket 主权没有丢失，也没有两个控制面同时写入同一逻辑主体。
   - 回滚后可以验证绑定关系、inventory 代次、发布快照和兼容窗口已经重新收敛，而不是只看进程是否启动成功。
12. 稳定标识、元数据变更与失效边界
   - `published_service` 改名、改说明、改分组或排序后，App 仍把它识别为同一个逻辑 service，不会因缓存键变化被当成新对象。
   - 只有影响目标身份、来源 item、兼容上下文、授权或主体状态的变化，才会触发 ticket 可用性与连接治理语义变化。
   - `app_client` 禁用、策略收回、service 下线、connector 吊销或身份漂移阻断后，新 ticket 与未消费 ticket 会立即失效。
   - 安全敏感事件发生后，活动连接会进入显式治理路径，而不是继续在无感状态下无限存活。
13. 最小边界校验
   - 仅修改 `published_service` 展示名称、说明或排序后，App 缓存与最近使用记录仍指向同一个逻辑 service，不会误出现“新 service”或无故失效。
   - 修改目标身份、来源 item、兼容上下文或授权后，系统会触发新的 ticket 可用性判断；旧 ticket 或旧缓存选择不会被静默继续接受。
   - `app_client` 禁用、策略收回、service 下线、connector 吊销或身份漂移阻断后，未消费 ticket 立即失效，已建立活动连接进入显式治理路径并留下审计。
14. 综合验收增强场景
   - 仅修改 `published_service` 展示名、说明或排序后，App 的最近使用记录、缓存键和 discovery 展示仍指向同一个逻辑 service，不会误出现“旧 service 消失 / 新 service 出现”。
   - 修改目标身份、来源 item、兼容上下文或授权后，旧缓存选择不会被静默继续接受；新的 ticket 申请会显式失败、要求刷新或进入新的有效上下文。
   - 当控制面返回拒绝时，App 能区分“可重试”“需重配对/升级”“需管理员处理”至少三类后续动作，而不是全部收敛成统一重试。
   - 在 `app_client` 禁用、策略收回、service 下线、connector 吊销或身份漂移阻断后，未消费 ticket 立即失效；已建立活动连接进入显式治理并生成审计。
   - 不联查当前 TermLink 服务端私有日志时，运维仍可通过 Relay 控制面自身审计/观测判断问题落在哪一类边界上。

## 8. 风险与回滚

### 风险

1. 实现者误把 Relay 做成 TLS 终止型网关，破坏既有安全语义。
2. 若不提前冻结“ticket 放置位置、service 选择时机、Relay 前置授权发生层次”等最小协议闭环，实现者可能为落地首期 API/WS 转发而隐式引入自定义 envelope、旁路鉴权或退化为 TLS 终止。
3. connector 成为私网接入单点，离线会导致所有挂载 service 不可达。
4. 票据若绑定不严，可能被重放或横向复用。
5. 审计量快速增长，若无脱敏和归档策略会造成运维负担。
6. 若 App 侧把 Relay 地址当作目标身份，可能与现有 mTLS 模型冲突。
7. 若控制面可任意改写 connector 的私网目标地址，会退化为内网 pivot / SSRF 跳板。
8. 若 `target identity` 来源不冻结或允许发布后静默改写，会削弱既有 mTLS/Host 校验闭环并导致旧票据越权复用。
9. 若认领成功后没有独立的长期绑定凭据或等效设备证明，`app_client` 后续身份将退化为不可稳定识别，重配对、禁用和旧绑定拒绝都无法严格成立。
10. 若未明确同一 `app_client` 是否允许多设备、多安装实例或备份恢复复用，外部实现方可能交付互不兼容的配对语义，削弱审计可信度并放大绑定凭据横向扩散风险。
11. 若 connector inventory 发生身份漂移时仍允许控制面静默自动跟随，可能导致已发布 service 的目标身份语义无感变化，破坏审计与票据失效边界。
12. 若首期把 Relay 特有状态与当前 TermLink 服务端 / App 私有实现细节硬耦合，未来独立项目拆分成本会显著上升，并增加双端联动发版压力。
13. 若缺少版本化契约与兼容窗口治理，未来独立 Relay 项目升级可能在不易察觉的情况下破坏当前 App 或既有服务端集成。
14. 若 `app_client / service / policy / audit` 等状态在当前服务端、App 缓存和未来 Relay 项目之间没有明确 source of truth，后续拆分会出现数据漂移、恢复策略不一致与审计缺口。
15. 若生命周期语义没有在 REQ 层提前冻结，后续不同实现方可能各自定义 `connector / service / app_client / ticket` 状态，导致跨项目维护时无法稳定对齐。
16. 若 App 侧把 discovery cache、最近使用 service 或本地绑定态误当成可离线决定授权的依据，会削弱控制面作为唯一授权边界的约束。
17. 若迁移期间允许两个控制面对同一主体并发签发 ticket，会产生未定义访问窗口、审计断裂和回滚困难。
18. 若控制面缺少幂等、版本或并发冲突防护，网络重试、页面过期提交和控制面切换会制造重复主体、幽灵 service 或双绑定窗口。
19. 若 inventory 同步没有确认与收敛语义，connector 重启、断线恢复或全量快照重发后可能残留 phantom item，进而污染发布与授权判断。
20. 若 App 在绑定凭据安全落盘前就把认领视为完成，弱网、崩溃或进程被杀会制造“服务端已认领、客户端未持久化”的半完成状态，后续恢复极易走错分支。
21. 若 App 不能区分 discovery cache、版本不兼容、需重配对与 service 状态变化，用户侧会出现误导性重试、无效投诉和不可审计的失败聚合。
22. 若审计没有把主体、对象、结果、原因和契约版本关联起来，未来独立项目出问题时会出现“知道失败了但不知道谁触发、影响了谁、该找谁处理”的追责盲区。
23. 若运维治理动作只能通过数据库或脚本暗改完成，后续独立项目维护会高度依赖私有知识，削弱可回放性与安全边界。
24. 若迁移切换阶段没有单一写入主权和收敛验证，灰度、回切和回滚都可能形成 split-brain。
25. 若系统没有稳定 service / subject 标识而是隐式依赖展示名或排序，App 缓存、审计串联和跨项目兼容都会在小改名时失真。
26. 若安全敏感事件发生后仍允许未消费 ticket 或既有活动连接无限延续，Relay 控制面就无法真正成为授权边界。

### 缓解

1. 在 REQ 中明确“透明 Relay 不终止业务 TLS”为强约束。
2. 在后续实施 PLAN 中先冻结首期最小协议闭环，至少写清 ticket 的放置层、service 绑定发生点、Relay 前置授权校验点，以及为何该设计仍属于“既有 API/WS Relay 路径”而非新通用代理协议。
3. 票据必须短时、强绑定、可吊销。
4. connector 需支持状态心跳、版本信息与可追踪错误。
5. 审计字段默认脱敏，保留必要证据链。
6. 错误模型至少稳定区分授权失败、票据失效或重放、服务/通道不可用、目标身份或握手失败等类别，避免在 REQ 层冻结字符串级错误码。
7. service 发布必须绑定 connector inventory 项，控制面不得直接写入任意私网目标地址。
8. `target identity` 必须以 connector inventory 和 `published_service` 发布快照为准；一旦目标身份语义变化，必须显式变更并使旧 ticket 失效。
9. `app_client` 认领完成后必须落地长期绑定凭据或等效设备证明，并在重配对、禁用、吊销后立即失效。
10. 首期 `app_client` 必须明确采用“单主体单有效安装实例”模型；卸载重装、清除数据、跨设备迁移和备份恢复后的继续使用都必须通过重配对重新建立绑定。
11. connector inventory 出现目标身份漂移时，控制面必须先进入待确认或阻断签发状态，不得静默自动接受新的目标身份语义。
12. 在 REQ / PLAN / CR 中冻结跨项目契约、适配边界与兼容矩阵，并避免把共享源码、私有存储结构或当前仓库模块路径当作正式集成面。
13. 把 Relay 发现、配对、ticket、inventory 和错误模型纳入显式版本治理；破坏性变更必须通过新版本或新 REQ 评审。
14. 明确 Relay 控制面是 Relay 特有状态的唯一真相来源（source of truth）；当前 TermLink 服务端与 App 仅持有兼容适配态、缓存态或本地绑定态，不得反向承接控制面真相来源职责。
15. 在 REQ 层先冻结关键生命周期语义，并要求后续 PLAN/实现对这些语义提供可观测、可审计、可迁移的映射。
16. App 的缓存、最近使用 service 和自动重连逻辑全部以“重新申请 ticket + 重新绑定入口”作为安全前提，避免本地状态绕过控制面判断。
17. 迁移与切换方案必须确保同一主体同一时刻只有一个控制面拥有有效 ticket 签发主权。
18. 对 connector 注册、inventory 收敛、认领重试、ticket 消费等关键路径引入幂等、防重、并发冲突检测与显式拒绝语义。
19. inventory 同步必须具备确认与收敛机制，并把撤回、消失、漂移三类变化作为不同的可审计输入处理。
20. App 侧必须把“绑定凭据安全持久化完成”作为认领完成的前置条件，并为认领成功但客户端本地未完成落盘的场景提供恢复路径。
21. App 交互必须显式区分 discovery cache、需重配对、版本不兼容、service 状态变化和普通网络失败，避免所有失败都收敛成模糊的重试动作。
22. 审计至少要记录主体、对象、结果、原因、相关契约版本与关键上下文引用，确保未来独立项目可单独追责与排障。
23. 把禁用主体、吊销 connector、阻断 ticket、确认漂移、回滚切换等动作做成控制面显式治理语义，而不是依赖暗改底层状态。
24. 迁移、灰度、回切和回滚必须围绕“单一写入主权 + 状态收敛验证”设计，避免 split-brain。
25. 为 `published_service`、`app_client` 等核心对象定义稳定标识，并把展示元数据变化与身份/兼容上下文变化分开治理。
26. 对安全敏感事件定义“新 ticket 立即失效 + 活动连接进入显式治理路径”的统一原则，避免授权边界形同虚设。

### 回滚

若本需求后续实施失败，回滚策略为：

1. 不上线 Relay 模式。
2. 继续保留现有直连 + BasicAuth + mTLS 主链路。
3. 关闭 connector 注册与 service 发布入口。
4. 保留文档中的透明 Relay 安全约束，作为后续重做前提。

## 9. 发布计划

1. 完成 REQ 入库并加入需求池。
2. 先建立关联冻结计划 [PLAN-20260415-relay-control-plane-refactor-freeze.md](/E:/coding/TermLink/docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md)，用于承接“尚未开工”的首期改造依赖顺序与治理前置项。
3. 后续单独拆分实施 PLAN，至少分为六批：
   - `contract/boundary freeze`
   - `control plane backend`
   - `connector`
   - `app relay profile`
   - `standalone extraction/migration`
   - `observability/security`
4. 每批实施时按现有文档治理流程补充 PLAN 与 CR。
5. 首批上线仅允许灰度启用内部测试环境。
6. 在完成 `sessions + terminal` 验收前，不进入 `workspace / codex / external web`。

## Assumptions

1. 默认新建独立 REQ，不并入现有 mTLS REQ。
2. 默认控制台与 Relay 可同域部署，但逻辑边界必须分离。
3. 默认单组织、单管理员操作面；App 侧访问主体独立建模为 `app_client`，所有核心实体保留 `organizationId`。
4. 默认不复用当前服务端 BasicAuth 作为控制台账号体系。
5. 默认 MFA 为控制台强制要求。
6. 默认 connector 采用“注册码 + 设备身份”模型。
7. 默认首期只服务 Android App 的中转主链路，不做开放 Web 门户。
8. 默认控制面提供独立 Relay 发现描述，其中 `relay ingress` 与 `target identity` 分离表达，不在实现中隐式复用为同一字段。
9. 默认 service 发布只能引用 connector inventory 中已上报的目标，不能由控制台直接指定任意私网 `host:port`。
10. 默认 `app_client` 由管理员预创建，App 只负责通过一次性注册码认领，不负责自注册创建主体。
11. 默认首期 `app_client` 采用“单主体单有效安装实例”模型，不支持多设备共享、旧凭据跨设备导入或备份恢复后继续复用。
12. 默认首期 Relay 控制面 / Transit / Connector 可先在当前仓库孵化，但产品边界、契约版本和运行职责按未来独立项目维护方式设计。
13. 默认未来独立 Relay 项目与当前 TermLink 后台 / App 之间通过版本化网络契约协作，而不是共享私有源码或数据库结构。





