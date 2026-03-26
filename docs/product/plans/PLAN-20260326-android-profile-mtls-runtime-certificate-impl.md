## REQ-20260326-android-profile-mtls-runtime-certificate 实施清单

### 0. 当前实施进度

状态口径：`done` = 已实现并有 CR 留痕，`in_progress` = 当前批次进行中，`pending` = 尚未实现。

1. `done`：`8.1 第一步：扩展 ServerProfile 与本地证书存储层`
2. `done`：`8.2 第二步：Settings 弹窗接入证书选择、口令输入与状态提示`
3. `done`：`8.3 第三步：WebView 与原生 Session API 切换到 profile 级 mTLS 读取`
4. `done`：`8.4 第四步：移除 BuildConfig / assets mTLS fallback 与构建脚本依赖`
5. `done`：`8.5 第五步：补齐单测、Android 测试与真机验证`
6. `done`：`8.6 第六步：固化直连 / 透明中继共用的 App/Server 证书契约`
7. `pending`：`8.7 第七步：服务端 TLS/mTLS 监听与证书加载`
8. `pending`：`8.8 第八步：HTTP API / WebSocket / terminal / extend_web / codex 接入统一 mTLS`
9. `pending`：`8.9 第九步：服务端回归验证与直连 IP 场景验收`

当前说明：

1. 本计划用于承接 `REQ-20260326-android-profile-mtls-runtime-certificate`。
2. 2026-03-26 当前批次已完成 `8.1`：补齐 `ServerProfile.mtlsCertificateDisplayName` 兼容、固化 `MtlsCertificateStore` 的 Phase 1 存储职责、并在 profile 删除时清理本地 mTLS 证书与口令。
3. 2026-03-26 当前批次已完成 `8.2`：Settings 弹窗接入证书选择/替换/移除、mTLS 口令输入、legacy pending 状态提示，以及新建/编辑 profile 的保存校验。
4. 2026-03-26 follow-up 修复已补充到 `8.2`：用户在编辑 legacy pending profile 时主动移除证书副本，保存后会同步清理 App 私有 mTLS 证书材料，不再残留旧副本。
5. 2026-03-26 follow-up 修复已补充到 `8.2`：`MtlsCertificateStore.importCertificate()` 在证书导入失败或源 URI 不可读时统一返回 `false`，不再把异常抛到 Settings 保存链路。
6. 2026-03-26 follow-up 修复已补充到 `8.2`：替换已有 mTLS 证书时改为“覆盖式替换优先，失败则回滚旧副本”，导入失败不会再先删掉旧 `.p12` 导致 profile 落入“JSON 仍显示已配置但本地证书已丢”的损坏状态。
7. 2026-03-26 follow-up 修复已补充到 `8.2`：`SettingsFragment.saveProfileDialog()` 改为先完成 mTLS 导入和 profile JSON 保存，再提交 BASIC / mTLS 凭据变更；导入失败时不再提前写入或删除 BASIC 凭据，也不会给未落盘的新 profile 留下孤儿 BASIC 密码。
6. 2026-03-26 当前批次已完成 `8.3`：`MtlsPolicyResolver` 改为基于 profile 本地证书/口令状态生效，`MtlsWebViewClient` 与 `MtlsHttpSupport` 改为统一从 `MtlsCredentialRepository + MtlsCertificateStore` 读取运行时凭据，并在证书/口令变更时失效缓存。
7. 2026-03-26 follow-up 修复已补充到 `8.3`：`MtlsCredentialRepository.load()` 在错误口令或损坏 `.p12` 导致解析异常时统一返回空结果，不再把异常直接抛到 WebView / Session API 运行时链路。
8. 2026-03-26 follow-up 修复已补充到 `8.3`：新增 `WebView.clearClientCertPreferences(...)` 失效协调，在 profile 切换、profile 保存成功、profile 删除成功后清理 WebView client-cert decision cache，并将 terminal reload 延后到清理回调之后，避免继续复用旧证书选择。
8. 2026-03-26 当前批次已完成 `8.4`：移除 `android/app/build.gradle` 中的 `TERMLINK_MTLS_* / BuildConfig.MTLS_*` 注入，Settings 页改为展示 profile 级运行时 mTLS 说明，并同步更新 Android mTLS 相关 active 文档口径。
9. 2026-03-26 follow-up 修复已补充到 `8.4`：Settings 主列表改为直接显示每个 profile 的 mTLS 已配置 / 缺证书 / 缺口令 / 双缺失摘要，legacy pending profile 不必进入编辑弹窗也能识别当前缺口。
10. 2026-03-26 当前批次启动 `8.5`：新增基于真实 `ServerConfigStore + BasicCredentialStore + MtlsCertificateStore` 的 debug-only `SettingsFragmentTestActivity` 与 Android 测试，覆盖 Settings 中的 profile 保存、删除、mTLS 口令保存、证书移除清理分支；`ServerProfileTest / MtlsPolicyResolverTest / MtlsCredentialRepositoryTest / ProfileMtlsSummaryResolverTest / ProfileSaveCoordinatorTest` 已在本地通过，`androidTest` Kotlin 编译已通过。
11. 2026-03-27 follow-up 修复已补充到 `8.5`：`MainShellActivity` 在 profile 保存/删除成功后，针对当前激活的 `EXTERNAL_WEB` profile 恢复立即 reload；不再因为仅保留 `TERMLINK_WS` 的 client-cert cache 清理回调而漏掉外部网页 URL / BASIC 凭据热更新。`ProfileCommitRefreshResolverTest` 已本地通过，`build-debug-apk.ps1` 已产出 debug APK。
12. 2026-03-27 当前批次补齐 `8.5` 自动化验证闭环：在线设备 `4KM7N19311002236` 上的 `connectedDebugAndroidTest` 已实际通过 `SettingsFragmentLifecycleTest` 4/4；期间修复了测试夹具的设备动画依赖、歧义按钮选择器、与当前保存链路不一致的事件顺序断言。
13. 2026-03-27 当前批次完成 `8.5` 真机 mTLS 验收：新增 `MtlsRealDeviceValidationTest + MtlsValidationFixtures + MtlsValidationTestActivity`，在真机 `LYA-TL00 / Android 10` 上通过 3/3，覆盖单 profile mTLS 成功、A/B profile 不同证书切换、替换证书后旧证书不再生效；其中单 profile 用例同时验证了原生 HTTPS 与 WebView client-cert 路径。
14. 本批为需求收口批次：在不交付中继功能的前提下，固定“局域网 / 公网 IP:port 直连”和“未来透明中继转发”共用同一 App/Server mTLS 契约。
15. 本批完成 Android profile 证书能力后，后续服务端 mTLS 实现必须遵守“直连 / 透明中继共用证书契约”，不得增加“是否经 Relay 转发”的专用证书语义。
16. 本批覆盖计划项：`8.6 第六步：固化直连 / 透明中继共用的 App/Server 证书契约`。
17. 本批对应变更记录：`CR-20260326-1514-mtls-contract-direct-transparent-relay`。
18. 2026-03-26 当前批次补齐计划落地路径：新增 `8.7`、`8.8`、`8.9` 作为服务端 mTLS 的显式实施阶段，避免 REQ 已纳入服务端能力但 PLAN 缺少可执行步骤。
19. 本批对应变更记录补充：`CR-20260326-1527-server-mtls-plan-expansion`。

### 1. 文档定位

本清单用于展开 Android profile 级 mTLS 运行时证书选择的实施细节，以及与之配套的服务端 TLS/mTLS 落地路径。  
目标是将 Android 客户端 mTLS 从“构建时内置证书”切换为“按 profile 运行时选择证书”，并同时固定 App 与目标 Server 的长期证书契约，使 WebView、原生 Sessions API 以及后续服务端直连 `IP:port` / 透明中继兼容场景都基于同一套分阶段实施路径推进。

### 2. 技术目标

本阶段完成后必须满足：

1. 每个 profile 可独立绑定一个 PKCS#12 客户端证书。
2. 证书文件在选择后复制到 app 私有目录，不依赖外部 URI 长期可用。
3. 证书口令使用加密本地存储，不写入 profile JSON。
4. WebView 与原生 Session API 使用相同的 profile 证书与口令来源。
5. mTLS 是否有效由 profile 配置与本地证书可用性共同决定，不再依赖 `BuildConfig.MTLS_*`。
6. 旧 profile 升级后若开启过 mTLS，但未补齐新证书，UI 可见且连接不会误回退到旧 assets 证书。
7. 当前实现的 mTLS 证书模型必须同时兼容 `IP:port` 直连和未来透明中继转发，避免后续重做 App profile 或 Server 证书校验模型。

### 3. 实现边界与职责拆分

#### 3.1 Android 固定改动点

优先在以下位置落地：

`android/app/src/main/java/com/termlink/app/data/ServerProfile.kt`

`android/app/src/main/java/com/termlink/app/data/ServerConfigStore.kt`

`android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt`

`android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt`

`android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt`

`android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt`

`android/app/src/main/java/com/termlink/app/MainShellActivity.kt`

`android/app/src/main/res/layout/dialog_server_profile.xml`

#### 3.2 新增基础模块

建议新增：

`android/app/src/main/java/com/termlink/app/data/MtlsCertificateStore.kt`

`android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt`

职责固定为：

1. 证书副本落盘
2. 口令安全存储
3. 证书输入流读取
4. 解析缓存与失效

#### 3.3 服务端固定改动点

后续服务端 mTLS 实现优先在以下位置落地：

`src/server.js`

`src/ws/terminalGateway.js`

`src/routes/health.js`

`src/auth/basicAuth.js`

#### 3.4 明确不纳入本期

以下内容不进入本计划：

1. 证书库管理页
2. 一个 profile 绑定多个客户端证书
3. 服务端新增证书探测接口
4. 浏览器端 mTLS 运行时证书管理
5. 中继产品功能、注册中心、打洞与路由编排
6. 业务中继终止 TLS 或介入业务协议

### 4. 分阶段实施

#### 8.1 第一步：扩展 Profile 与本地证书存储

1. `ServerProfile` 新增 `mtlsCertificateDisplayName`，默认兼容旧 JSON 为空字符串。
2. `ServerConfigStore` 保持旧 profile 可读，不自动关闭旧 `mtlsEnabled`。
3. 新增 `MtlsCertificateStore`：
   - 将 `Uri` 内容复制到 `filesDir/mtls/<profileId>.p12`
   - 保存/删除 `mtls_password_<profileId>`
   - 提供 `hasCertificate/openInputStream/lastModified/removeAllForProfile`
4. 删除 profile 时同步清理该 profile 的本地证书与口令。

#### 8.2 第二步：Settings 弹窗接入证书选择

1. `dialog_server_profile.xml` 增加：
   - 当前证书状态文本
   - 选择/替换证书按钮
   - 移除证书按钮
   - mTLS 证书口令输入框
2. 勾选 `Enable mTLS for this profile` 时：
   - 若当前无已保存证书且无临时选择证书，则立即打开系统文件选择器
   - 若用户取消选择，则取消勾选
3. 编辑已有 profile 时：
   - 未替换证书时沿用现有证书副本
   - 未重填口令时沿用现有已保存口令
   - 若用户主动移除一个原本有效的 mTLS 证书，则保存前必须同步关闭 `mtlsEnabled`，除非在本次编辑中重新选证书并补齐口令
4. 保存校验：
   - 新建 profile 时，`mtlsEnabled=true` 必须存在证书副本或本次已选证书
   - 新建 profile 时，证书口令不能为空
   - 编辑已有 profile 时，若该 profile 属于升级遗留的“待补齐”状态，允许保存非 mTLS 字段修改并继续保留挂起态
   - 编辑已有 profile 时，只有在证书与口令齐备后，才将该 profile 视为有效 mTLS 配置
   - 编辑已有 profile 时，不允许将原本有效的 mTLS 配置主动保存成新的“待补齐”挂起态

#### 8.3 第三步：运行时 mTLS 链路切换

1. `MtlsPolicyResolver` 改为基于：
   - `profile.mtlsEnabled`
   - 本地证书是否存在
   - 本地证书口令是否存在
2. 新增 `MtlsCredentialRepository`：
   - 按 `profileId + fileLastModified + passwordFingerprint` 缓存
   - 返回 `PrivateKey + X509 chain + SSLSocketFactory`
3. `MtlsWebViewClient` 改为从 `MtlsCredentialRepository` 读取证书与私钥。
4. `MtlsHttpSupport` 改为从 `MtlsCredentialRepository` 读取 `SSLSocketFactory`。
5. 切换 profile、替换证书、删除证书、修改证书口令时要失效旧缓存。

#### 8.4 第四步：移除旧 build-time mTLS 依赖

1. 删除 `android/app/build.gradle` 内：
   - `TERMLINK_MTLS_ENABLED`
   - `TERMLINK_MTLS_P12_ASSET`
   - `TERMLINK_MTLS_P12_PASSWORD`
   - `TERMLINK_MTLS_ALLOWED_HOSTS`
2. `Settings` 页不再展示“mTLS build enabled/disabled”，改为展示当前 profile 的 mTLS 配置摘要与缺失提示。
3. 同步更新 active 文档，至少包括：
   - `docs/guides/android-development.md`
   - `docs/architecture/CURRENT_STATE.md`
   - `docs/ops/ops-checklist.md`
4. 若 `docs/PROJECT_OVERVIEW.md` 仍作为团队常用入口文档，则一并同步更新。
5. 将上述文档中的 Android mTLS 描述统一改为运行时选证书流程，移除 `TERMLINK_MTLS_*`、`BuildConfig.MTLS_*`、`assets/mtls/*.p12|*.pfx` 作为 Android 客户端主路径的表述。

#### 8.5 第五步：测试与验证

1. 单元测试：
   - `ServerProfile` JSON 兼容
   - `MtlsPolicyResolver`
   - `MtlsCredentialRepository`
2. Android 测试：
   - `MtlsCertificateStore`
   - Settings 保存/删除逻辑
3. 真机验证：
   - 单 profile mTLS 连接成功
   - A/B profile 不同证书切换
   - 替换证书后旧证书不再生效

#### 8.6 第六步：固化直连 / 透明中继共用证书契约

1. 固定 App/Server 的公共契约：
   - App profile 持有 `server address + mtlsEnabled + client certificate + password + allowedHosts`
   - Server 持有 `server cert/key + trusted client CA / client-cert policy + client-cert required`
2. 验证上述契约不包含“是否经 Relay 转发”字段，不引入直连专属配置耦合。
3. 明确未来中继默认按透明转发设计：
   - 只负责服务发现、目标匹配、连接建立与 TCP 字节流转发
   - 不终止 TLS，不参与证书语义
4. 上述兼容性仅在 relay 不改变客户端可见目标身份语义时成立：
   - App 仍能校验目标 Server 身份
   - `server address + allowedHosts` 仍足以表达目标连接语义
   - 若 relay 需要暴露自身入口地址/端口或改变 App 侧可见目标身份，则必须新增连接发现 / 寻址契约并单独评审
5. 明确服务端侧 mTLS 将统一覆盖 HTTP API 与 WebSocket，避免 `terminal`、`extend_web`、`codex` 出现分裂的安全模型。
6. 明确若未来中继设计要求终止 TLS、介入业务协议，或改变客户端可见目标身份语义，则必须新开 REQ，不得在本计划下隐式修改既定安全模型。

#### 8.7 第七步：服务端 TLS/mTLS 监听与证书加载

1. 将服务端入口从明文 `http.createServer(app)` 扩展为可配置的 TLS/mTLS 监听模型，允许 `IP:port` 直连。
2. 新增统一的服务端 TLS/mTLS 配置读取：
   - 服务端证书
   - 服务端私钥
   - 受信任客户端 CA / 客户端证书链
   - 是否要求客户端证书
3. 明确默认部署形态：
   - 允许服务端自管 TLS/mTLS
   - 仍允许前置 Nginx 代管 TLS/mTLS，但不得把 Nginx 作为唯一实现路径
4. 若启用服务端 mTLS，启动期应校验关键配置存在性与可读性，避免以“声明启用但实际明文监听”的状态启动。

#### 8.8 第八步：HTTP API / WebSocket / terminal / extend_web / codex 接入统一 mTLS

1. HTTP API 与 WebSocket 复用同一 TLS/mTLS 监听，不允许出现 API 受保护而 WS 仍明文的分裂路径。
2. `terminal`、`extend_web`、`codex` 三类模式统一复用服务端客户端证书校验结果，不新增模式专属证书策略。
3. 保留现有 Basic Auth / ticket / 审计链路作为应用层控制，但不再把它们描述为服务端 mTLS 的替代品。
4. 明确服务端在透明中继兼容前提下校验的仍是目标客户端证书，不引入“Relay 模式专用客户端身份”。

#### 8.9 第九步：服务端回归验证与直连 IP 场景验收

1. 新增服务端测试 / 验证场景：
   - 服务端启用 mTLS 时，缺证书、错证书、非受信 CA 会被拒绝
   - 正确客户端证书可建立 HTTP API 与 WebSocket 连接
2. 直连 `IP:port` 验证至少覆盖：
   - App 直连目标 Server
   - `terminal`、`extend_web`、`codex` 共用同一 mTLS 契约
3. 明确前置 Nginx 模式的回归要求：
   - 若由 Nginx 终止 TLS/mTLS，后端不得对外裸露可绕过访问
   - 相关部署文档需写清允许与禁止的拓扑
4. 真机 / 集成验证通过后，再推动 REQ 状态流转与主线文档更新。

### 5. 验收与文档同步要求

实施批次开始后，每批至少同步：

1. 本计划进度状态
2. 对应 `CR-*.md`

本需求全部完成后再更新：

1. `docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md`
2. `docs/product/REQUIREMENTS_BACKLOG.md`
3. `docs/product/PRODUCT_REQUIREMENTS.md`
4. `docs/guides/android-development.md`
5. `docs/architecture/CURRENT_STATE.md`
6. `docs/ops/ops-checklist.md`
7. `docs/PROJECT_OVERVIEW.md`（若仍作为入口文档持续维护）
8. 服务端部署 / TLS 文档（在服务端 mTLS 实施批次补齐）

### 6. 当前默认决策

1. 每个 profile 仅支持一个 `.p12/.pfx` 客户端证书。
2. 证书在选择后立即复制到 app 私有目录。
3. 证书口令在 profile 弹窗内输入并保存，不延迟到首次连接时再询问。
4. 旧 profile 升级后若缺少新证书，保留 `mtlsEnabled=true`，但显示“证书未配置/待补齐”。
5. Android build-time mTLS fallback 本期视为废弃，不保留兼容路径。
6. “待补齐”仅适用于升级遗留 profile；新建 profile 不允许以该状态完成保存。
7. 用户主动移除一个原本有效的 mTLS 证书时，默认规则是关闭 `mtlsEnabled`，而不是生成新的挂起态。
8. 未来中继默认是透明中继，不终止 TLS，不改变 `App <-> Server` 端到端 mTLS 关系。
9. 若未来需要业务中继终止 TLS，则视为新需求，必须新开 REQ。
