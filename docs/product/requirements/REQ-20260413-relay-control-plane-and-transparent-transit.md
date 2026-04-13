---
title: Relay 控制平面与透明中转模式
status: planned
owner: @maintainer
last_updated: 2026-04-14
source_of_truth: product
related_code: [src/server.js, src/ws/terminalGateway.js, android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt]
related_docs: [docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md]
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

本需求固定以下设计决策：

1. 网站定位为控制台，不是通用反向代理门户。
2. Relay 只负责发现、授权、编排、转发与审计，不承载业务终端页面。
3. 私网服务通过常驻 `connector` 主动向 Relay 建立出站连接接入。
4. 首期 Relay 数据面只透传既有 `sessions list/create/delete/rename API + terminal WebSocket`，不新增通用 relay envelope 或其他代理协议。
5. 首期采用“单组织单管理员控制台 + 独立 App 访问主体体系 + MFA”。
6. 首期 `app_client` 配对生命周期固定为“管理员先预创建槽位并签发一次性注册码，再由 App 认领该主体”。
7. 若未来要做 TLS 终止型网关，必须新开 REQ，不在本需求内扩展。

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

## 4. 方案概要

### 4.1 架构边界

系统逻辑分为四个子域：

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

### 4.5 首期授权主体模型

首期访问主体固定为独立 `app_client`，用于承载 App 侧访问策略、票据签发和审计主体：

1. `admin_user` 只用于控制台登录、MFA、发布 service、配置策略与查看审计。
2. `app_client` 表示一个受信 App 安装实例/设备实例，不等价于管理员账号，也不等价于 connector。
3. 首期所有访问策略、票据签发和越权校验都以 `app_client` 为 App 侧主体；`issuedTo` 不再允许语义悬空。
4. `connector` 是设备接入主体，只负责上报 inventory、维持通道和桥接目标服务，不拥有 App 侧访问权限。
5. 审计必须能区分 `admin_user / app_client / connector` 三类主体。

### 4.6 首期 `app_client` 配对生命周期

首期 `app_client` 生命周期固定为“预创建后认领”，不采用“设备自注册直接生成主体”：

1. 管理员先在控制台创建空的 `app_client` 槽位，再为其签发一次性注册码。
2. 一次性注册码只用于认领既有 `app_client`，不负责创建新的 `app_client`。
3. App 使用有效注册码认领后，`app_client` 才进入可发放 `relay_access_ticket` 的可用状态。
4. 首期最小生命周期动作必须可被控制面和审计区分：创建、注册码签发、配对完成、禁用/吊销、重配对。
5. 重配对必须通过管理员侧重新签发注册码触发，旧注册码失效，已有绑定状态需可追踪。

## 5. 接口/数据结构变更

### 5.1 逻辑实体

首期控制面至少需要以下逻辑实体，用于表达角色边界、发布关系、授权和审计：

1. `organization`
2. `admin_user`
3. `app_client`
4. `connector`
5. `published_service`
6. `relay_access_policy`
7. `relay_session_ticket`
8. `relay_audit_event`

### 5.2 实体职责要求

REQ 只固定实体职责与关键约束，不冻结数据库 schema、字段枚举或 wire-level 命名。

1. `organization`
   - 表示首期单组织边界，并为管理员、App 访问主体、connector、service、策略和审计提供归属关系。
2. `admin_user`
   - 仅用于控制台登录、MFA、配置、授权和审计查询。
3. `app_client`
   - 表示一个被管理员预创建并由 App 认领的独立访问主体。
   - 必须能表达未配对、可用、禁用与重配对后的最新绑定状态。
   - 未完成配对或已禁用的 `app_client` 不得申请 Relay 访问票据。
4. `connector`
   - 表示部署在私网环境中的设备接入主体。
   - 必须承载设备身份、在线状态、最近心跳、版本与基础主机信息等能力，以支撑注册、吊销、轮换和运维观测。
5. `published_service`
   - 表示从 connector inventory 中选择并发布出来的可访问服务。
   - 控制面只能发布 connector 已上报并确认的 inventory 项，不能把 connector 重定向到任意私网 `host:port`。
   - 必须保留目标身份语义，以支撑 App 继续按既有 mTLS/Host 契约校验目标服务。
   - 其 `target identity` 必须来源于 connector inventory 上报并经管理员确认的字段快照；发布后不得由控制面脱离 inventory 语义自行补猜、拼接或静默改写。
6. `relay_access_policy`
   - 表示 `app_client` 到 `published_service` 的访问授权关系。
7. `relay_session_ticket`
   - 表示面向既有 `sessions API` 与 `terminal WebSocket` 的短时访问票据。
   - 必须绑定访问主体、目标 service、Relay 接入点和目标身份快照，并支持过期、单次使用或等效的重放防护能力。
   - 必须在既有 `sessions API` 请求或 `terminal WebSocket` upgrade 阶段完成校验与绑定；透明转发开始后不得再依赖新增 envelope 或 TLS 终止来补做授权。
8. `relay_audit_event`
   - 表示关键控制面与访问动作的审计记录。
   - 必须能区分 `admin_user / app_client / connector` 三类主体，并默认以脱敏方式保存敏感上下文。

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
2. `published_service.target identity` 只能取自 connector inventory 并在发布时冻结为受控快照；若目标身份语义变化，必须走显式变更并使旧 ticket 失效。
3. `app_client` 必须由管理员预创建；App 不得绕过控制台直接创建访问主体。
4. 注册码只用于认领既有 `app_client`，并必须具备单次使用、过期失效和审计能力。
5. access ticket 签发必须基于“已完成配对且处于可用状态的 `app_client`”和访问策略做授权判断。
6. access ticket 只服务于既有 `sessions API` 与 `terminal WebSocket` Relay 路径，不扩展为通用代理授权。
7. access ticket 的携带位置只允许落在既有 HTTP 请求或 WebSocket upgrade 元数据中，Relay 必须在转发业务字节流前完成授权，不得通过新增通用 envelope 补做 service 选择。

### 5.5 Connector 通道能力方向

connector 到 Relay 控制面的通道至少需要覆盖以下能力：

1. connector 注册接入、身份校验与后续轮换/吊销的一致性。
2. 在线状态维持、心跳保活与基础版本/健康信息上报。
3. service inventory 的持续同步与变更可见性。
4. 面向已发布 service 的 Relay 数据通道建立、回收与生命周期追踪。
5. 面向控制面和审计面的状态回传与错误类别上报。

REQ 只固定通道生命周期与责任边界，不冻结消息名、帧结构、事件枚举或具体传输切片。

### 5.6 App 协议补充

App 侧必须补充以下能力：

1. 使用一次性注册码认领既有 `app_client`。
2. Relay 模式的服务发现与连接入口。
3. 访问票据获取与携带。
4. `sessions API` 经 Relay 的寻址方式。
5. `terminal WebSocket` 经 Relay 的 ticket 绑定方式。
6. 将 `relay ingress` 与 `target identity` 作为两个独立概念处理；前者用于实际建连，后者用于目标 Server 身份校验。
7. Relay 访问描述不得静默改写当前 profile 中的 `server address / allowedHosts / mTLS` 语义；若需要新增字段，必须显式落在新的 Relay 发现契约中。
8. 在 `sessions API` 请求发起时或 `terminal WebSocket` upgrade 完成前，显式携带 access ticket 并完成 service 绑定；upgrade 成功后不得再引入额外 envelope。

同时明确：

1. 不得破坏现有 profile 级 mTLS 配置契约。
2. 不得把 Relay 地址错误地等价成目标服务身份。
3. 不得在首期通过 Relay 访问既有 `sessions API` / `terminal WebSocket` 之外的能力。

## 6. 验收标准

1. 管理员可登录控制台、完成 MFA，并创建 connector 注册令牌。
2. 私网主机上的 connector 可完成注册、保持心跳，并在断网或重启后自动恢复在线状态。
3. 控制台可查看 connector 在线状态、最近心跳、已上报 inventory 和基础健康信息。
4. 管理员可基于 connector inventory 发布 service、配置访问策略，并且控制面不能任意改写私网 `host:port`。
5. 管理员可预创建 `app_client` 槽位并签发一次性注册码；未认领或已禁用的 `app_client` 不可申请 access ticket。
6. App 可使用有效注册码认领既有 `app_client`；重复使用、过期或失效注册码必须被拒绝并进入审计。
7. App 在目标服务无公网入口时，仍可通过 Relay 访问既有 `sessions list/create/delete/rename API` 并建立既有 `terminal WebSocket`。
8. 首期 Relay 数据面只覆盖上述 API/WS，不引入通用 relay envelope、任意 TCP 转发或其他代理协议。
9. 若目标服务启用当前 mTLS 契约，经过 Relay 后仍保持既有目标身份语义；App 不会把 Relay 地址误判为目标 Server 身份。
10. Relay 对 `sessions API` 或 `terminal WebSocket` 的授权与 service 绑定发生在既有 HTTP/WS 请求阶段；透明转发开始后不再依赖新增 envelope 或 TLS 终止补做鉴权。
11. access ticket 以 `app_client` 为唯一 App 侧主体，并对未配对、已禁用、未授权、票据过期、票据重放、主体不匹配等场景稳定拒绝。
12. `target identity` 必须可追溯到 connector inventory 和 `published_service` 发布快照；若发布后目标身份语义发生变化，旧 ticket 自动失效并产生审计。
13. App 与审计侧都能稳定区分至少以下错误类别：授权失败、票据失效或重放、connector/已发布 service 不可用、Relay 接入失败、目标身份或握手失败。
14. 管理员登录、MFA、connector 注册、`app_client` 创建与认领、注册码签发、service 发布、策略变更、票据签发和访问拒绝均被审计，且可区分 `admin_user / app_client / connector` 三类主体。
15. 敏感字段默认不完整回显，审计与日志包含脱敏策略。
16. 本需求首期范围明确排除 `workspace / codex / external web`、TLS 终止型网关和多租户 SaaS。

## 7. 测试场景

1. 控制台与管理员登录
   - 管理员账号登录成功，并完成 MFA 验证。
   - 登录失败、MFA 失败和敏感操作均产生可检索审计。
2. connector 注册、在线状态与 inventory
   - 使用注册令牌在一台私网主机上成功启动 connector 并完成注册。
   - connector 注册后在控制台出现在线状态，断开后在可接受窗口内转为离线，恢复网络后自动重连成功。
   - connector 成功上报 inventory；控制台尝试发布一个未出现在 inventory 中的内网 `host:port` 时被拒绝。
3. `app_client` 预创建、认领与重配对
   - 管理员预创建一个 `app_client` 并签发一次性注册码；未认领前直接申请 ticket 被拒绝。
   - App 使用有效注册码认领成功后，`app_client` 进入可用状态，并生成配对审计。
   - 同一注册码重复使用、注册码过期、主体被禁用或重配对后旧绑定继续申请 ticket 均被拒绝并产生审计。
4. Relay 访问主链路
   - 发布一个本地 `sessions API` 服务并可被已配对 App 正常访问。
   - 发布一个本地 terminal 服务并可通过已配对 App 正常建立 WebSocket 会话。
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
   - connector inventory 上报的目标身份、`published_service` 发布快照与 ticket 中绑定的目标身份三者保持一致；任一环节发生变更时旧 ticket 失效。
   - 文档评审确认首期未把 Relay 扩展到 `workspace / codex / external web`，也未扩展成 TLS 终止型网关。

## 8. 风险与回滚

### 风险

1. 实现者误把 Relay 做成 TLS 终止型网关，破坏既有安全语义。
2. connector 成为私网接入单点，离线会导致所有挂载 service 不可达。
3. 票据若绑定不严，可能被重放或横向复用。
4. 审计量快速增长，若无脱敏和归档策略会造成运维负担。
5. 若 App 侧把 Relay 地址当作目标身份，可能与现有 mTLS 模型冲突。
6. 若控制面可任意改写 connector 的私网目标地址，会退化为内网 pivot / SSRF 跳板。
7. 若 `target identity` 来源不冻结或允许发布后静默改写，会削弱既有 mTLS/Host 校验闭环并导致旧票据越权复用。

### 缓解

1. 在 REQ 中明确“透明 Relay 不终止业务 TLS”为强约束。
2. 票据必须短时、强绑定、可吊销。
3. connector 需支持状态心跳、版本信息与可追踪错误。
4. 审计字段默认脱敏，保留必要证据链。
5. 错误模型至少稳定区分授权失败、票据失效或重放、服务/通道不可用、目标身份或握手失败等类别，避免在 REQ 层冻结字符串级错误码。
6. service 发布必须绑定 connector inventory 项，控制面不得直接写入任意私网目标地址。
7. `target identity` 必须以 connector inventory 和 `published_service` 发布快照为准；一旦目标身份语义变化，必须显式变更并使旧 ticket 失效。

### 回滚

若本需求后续实施失败，回滚策略为：

1. 不上线 Relay 模式。
2. 继续保留现有直连 + BasicAuth + mTLS 主链路。
3. 关闭 connector 注册与 service 发布入口。
4. 保留文档中的透明 Relay 安全约束，作为后续重做前提。

## 9. 发布计划

1. 完成 REQ 入库并加入需求池。
2. 后续单独拆分实施 PLAN，至少分为四批：
   - `control plane backend`
   - `connector`
   - `app relay profile`
   - `observability/security`
3. 每批实施时按现有文档治理流程补充 PLAN 与 CR。
4. 首批上线仅允许灰度启用内部测试环境。
5. 在完成 `sessions + terminal` 验收前，不进入 `workspace / codex / external web`。

## Assumptions

1. 默认新建独立 REQ，不并入现有 mTLS REQ。
2. 默认控制台与 Relay 可同域部署，但逻辑边界必须分离。
3. 默认单组织单管理员控制台，但 App 侧访问主体独立建模为 `app_client`，所有核心实体保留 `organizationId`。
4. 默认不复用当前服务端 BasicAuth 作为控制台账号体系。
5. 默认 MFA 为控制台强制要求。
6. 默认 connector 采用“注册码 + 设备身份”模型。
7. 默认首期只服务 Android App 的中转主链路，不做开放 Web 门户。
8. 默认控制面提供独立 Relay 发现描述，其中 `relay ingress` 与 `target identity` 分离表达，不在实现中隐式复用为同一字段。
9. 默认 service 发布只能引用 connector inventory 中已上报的目标，不能由控制台直接指定任意私网 `host:port`。
10. 默认 `app_client` 由管理员预创建，App 只负责通过一次性注册码认领，不负责自注册创建主体。
