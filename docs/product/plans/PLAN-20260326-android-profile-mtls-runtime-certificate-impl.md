# REQ-20260326-android-profile-mtls-runtime-certificate 实施清单

## 0. 当前实施进度

状态口径：`done` = 已实现并有 CR 留痕，`in_progress` = 当前批次进行中，`pending` = 尚未实现。

1. `done`：`8.1 第一步：扩展 ServerProfile 与本地证书存储层`
2. `done`：`8.2 第二步：Settings 弹窗接入证书选择、口令输入与状态提示`
3. `done`：`8.3 第三步：WebView 与原生 Session API 切换到 profile 级 mTLS 读取`
4. `done`：`8.4 第四步：移除 BuildConfig / assets mTLS fallback 与构建脚本依赖`
5. `done`：`8.5 第五步：补齐单测、Android 测试与真机验证`
6. `done`：`8.6 第六步：固化直连 / 透明中继共用的 App/Server 证书契约`
7. `done`：`8.7 第七步：服务端 TLS/mTLS 监听与证书加载`
8. `done`：`8.8 第八步：HTTP API / WebSocket / terminal / extend_web / codex 接入统一 mTLS`
9. `done`：`8.9 第九步：服务端回归验证与直连 IP 场景验收`

当前说明：

1. 本计划用于承接 `REQ-20260326-android-profile-mtls-runtime-certificate`。
2. 2026-03-26 当前批次已完成 `8.1`：补齐 `ServerProfile.mtlsCertificateDisplayName` 兼容、固化 `MtlsCertificateStore` 的 Phase 1 存储职责、并在 profile 删除时清理本地 mTLS 证书与口令。
3. 2026-03-26 当前批次已完成 `8.2`：Settings 弹窗接入证书选择/替换/移除、mTLS 口令输入、legacy pending 状态提示，以及新建/编辑 profile 的保存校验。
4. 2026-03-26 follow-up 修复已补充到 `8.2`：用户在编辑 legacy pending profile 时主动移除证书副本，保存后会同步清理 App 私有 mTLS 证书材料，不再残留旧副本。
5. 2026-03-26 follow-up 修复已补充到 `8.2`：`MtlsCertificateStore.importCertificate()` 在证书导入失败或源 URI 不可读时统一返回 `false`，不再把异常抛到 Settings 保存链路。
6. 2026-03-26 follow-up 修复已补充到 `8.2`：替换已有 mTLS 证书时改为“覆盖式替换优先，失败则回滚旧副本”，导入失败不会再先删掉旧 `.p12` 导致 profile 落入“JSON 仍显示已配置但本地证书已丢”的损坏状态。
7. 2026-03-26 follow-up 修复已补充到 `8.2`：`SettingsFragment.saveProfileDialog()` 改为先完成 mTLS 导入和 profile JSON 保存，再提交 BASIC / mTLS 凭据变更；导入失败时不再提前写入或删除 BASIC 凭据，也不会给未落盘的新 profile 留下孤儿 BASIC 密码。
8. 2026-03-26 当前批次已完成 `8.3`：`MtlsPolicyResolver` 改为基于 profile 本地证书/口令状态生效，`MtlsWebViewClient` 与 `MtlsHttpSupport` 改为统一从 `MtlsCredentialRepository + MtlsCertificateStore` 读取运行时凭据，并在证书/口令变更时失效缓存。
9. 2026-03-26 follow-up 修复已补充到 `8.3`：`MtlsCredentialRepository.load()` 在错误口令或损坏 `.p12` 导致解析异常时统一返回空结果，不再把异常直接抛到 WebView / Session API 运行时链路。
10. 2026-03-26 follow-up 修复已补充到 `8.3`：新增 `WebView.clearClientCertPreferences(...)` 失效协调，在 profile 切换、profile 保存成功、profile 删除成功后清理 WebView client-cert decision cache，并将 terminal reload 延后到清理回调之后，避免继续复用旧证书选择。
11. 2026-03-26 当前批次已完成 `8.4`：移除 `android/app/build.gradle` 中的 `TERMLINK_MTLS_* / BuildConfig.MTLS_*` 注入，Settings 页改为展示 profile 级运行时 mTLS 说明，并同步更新 Android mTLS 相关 active 文档口径。
12. 2026-03-26 follow-up 修复已补充到 `8.4`：Settings 主列表改为直接显示每个 profile 的 mTLS 已配置 / 缺证书 / 缺口令 / 双缺失摘要，legacy pending profile 不必进入编辑弹窗也能识别当前缺口。
13. 2026-03-26 当前批次启动 `8.5`：新增基于真实 `ServerConfigStore + BasicCredentialStore + MtlsCertificateStore` 的 debug-only `SettingsFragmentTestActivity` 与 Android 测试，覆盖 Settings 中的 profile 保存、删除、mTLS 口令保存、证书移除清理分支；`ServerProfileTest / MtlsPolicyResolverTest / MtlsCredentialRepositoryTest / ProfileMtlsSummaryResolverTest / ProfileSaveCoordinatorTest` 已在本地通过，`androidTest` Kotlin 编译已通过。
14. 2026-03-27 follow-up 修复已补充到 `8.5`：`MainShellActivity` 在 profile 保存/删除成功后，针对当前激活的 `EXTERNAL_WEB` profile 恢复立即 reload；不再因为仅保留 `TERMLINK_WS` 的 client-cert cache 清理回调而漏掉外部网页 URL / BASIC 凭据热更新。`ProfileCommitRefreshResolverTest` 已本地通过，`build-debug-apk.ps1` 已产出 debug APK。
15. 2026-03-27 当前批次补齐 `8.5` 自动化验证闭环：在线设备 `4KM7N19311002236` 上的 `connectedDebugAndroidTest` 已实际通过 `SettingsFragmentLifecycleTest` 4/4；期间修复了测试夹具的设备动画依赖、歧义按钮选择器、与当前保存链路不一致的事件顺序断言。
16. 2026-03-27 当前批次完成 `8.5` 真机 mTLS 验收：新增 `MtlsRealDeviceValidationTest + MtlsValidationFixtures + MtlsValidationTestActivity`，在真机 `LYA-TL00 / Android 10` 上通过 3/3，覆盖单 profile mTLS 成功、A/B profile 不同证书切换、替换证书后旧证书不再生效；其中单 profile 用例同时验证了原生 HTTPS 与 WebView client-cert 路径。
17. 本批为需求收口批次：在不交付中继功能的前提下，固定“局域网 / 公网 IP:port 直连”和“未来透明中继转发”共用同一 App/Server mTLS 契约。
18. 本批完成 Android profile 证书能力后，后续服务端 mTLS 实现必须遵守“直连 / 透明中继共用证书契约”，不得增加“是否经 Relay 转发”的专用证书语义。
19. 本批覆盖计划项：`8.6 第六步：固化直连 / 透明中继共用的 App/Server 证书契约`。
20. 本批对应变更记录：`CR-20260326-1514-mtls-contract-direct-transparent-relay`。
21. 2026-03-26 当前批次补齐计划落地路径：新增 `8.7`、`8.8`、`8.9` 作为服务端 mTLS 的显式实施阶段，避免 REQ 已纳入服务端能力但 PLAN 缺少可执行步骤。
22. 本批对应变更记录补充：`CR-20260326-1527-server-mtls-plan-expansion`。
23. 2026-03-27 当前批次完成 `8.7`：新增 `src/config/tlsConfig.js` 统一解析 `TERMLINK_TLS_*` 环境变量；`src/server.js` 改为条件创建 `https.createServer()` 或 `http.createServer()`，TLS 声明启用但 cert/key 不可读时硬拒绝启动；`health` 端点返回 `tls/mtls` 状态；`.env.example` 新增 TLS/mTLS 配置段。测试 20/20 通过。
24. 2026-03-27 follow-up 修复已补充到 `8.7`：`securityGates.checkMtlsGate()` 改为复用 `parseTlsConfig() + validateTlsConfig()`，当 `TERMLINK_ELEVATED_REQUIRE_MTLS=true` 时只接受 `TERMLINK_TLS_CLIENT_CERT=require`，并要求服务端 cert/key 与 client CA 均可读，避免把可选 client-cert 或缺失 CA 的配置误判为可用。`tests/privilegeConfig.securityGates.test.js` 新增 strict policy 与 CA 缺失回归用例，测试 22/22 通过。
25. 2026-03-27 follow-up 修复已补充到 `8.7`：`parseTlsConfig()` 不再把非法 `TERMLINK_TLS_CLIENT_CERT` 静默回退到 `none`；改为保留配置错误并由 `validateTlsConfig()` 在 TLS 启动期硬拒绝，避免运维误配时以“看似声明了 mTLS、实际退回普通 TLS”的状态启动。`tests/tlsConfig.test.js` 新增非法策略回归用例，测试 23/23 通过。
26. 2026-03-27 当前批次将 `8.7` 状态收口为 `done`：服务端 TLS/mTLS 监听、证书/CA 配置读取、启动期硬拒绝校验、提权模式 strict mTLS 门禁、health 状态可观测性与对应单测已齐备；后续 `8.8`、`8.9` 继续承接统一接入与直连验收。
27. 本批对应变更记录：`CR-20260327-1800-server-tls-mtls-listener`。
28. 2026-03-27 当前批次完成 `8.8`：新增 `src/utils/connectionSecurity.js` 统一提取 TLS/mTLS 连接摘要；`src/server.js` 通过全局中间件把同一 `connectionSecurity` 注入 HTTP API、workspace、以及静态 `extend_web/codex` 页面响应头；`src/routes/health.js` 回传当前请求的 `requestSecurity`；`src/ws/terminalGateway.js` 在 `session_info` 与新建 session 的 `privilegeMetadata` 中统一复用同一连接安全摘要，不再为 terminal / codex 单独分叉 mTLS 结果口径。定向 Node 回归 `88/88` 通过。
29. 本批对应变更记录：`CR-20260327-1525-server-unified-mtls-integration`。
30. 2026-03-27 follow-up 修复已补充到 `8.8`：为前置 Nginx 终止 TLS/mTLS 的部署形态新增显式可信代理头支持。`connectionSecurity` 在 `TERMLINK_TLS_PROXY_MODE=nginx + TERMLINK_TLS_PROXY_SECRET` 启用后，可从 `X-Forwarded-Proto + X-SSL-Client-Verify` 还原代理侧 TLS/mTLS 结果；未命中共享密钥时保持回退到后端原始 socket，避免直接暴露后端时被伪造头污染。`.env.example`、`docs/guides/deployment.md`、`docs/ops/ops-checklist.md` 同步补齐 Nginx 配置要求。定向 Node 回归 `96/96` 通过。
31. 2026-03-27 follow-up 修复已补充到 `8.8`：`src/server.js` 启动期校验不再只在 `TERMLINK_TLS_ENABLED=true` 时触发；当 `TERMLINK_TLS_PROXY_MODE!=off` 时也会强制执行 `validateTlsConfig()`，确保缺失 `TERMLINK_TLS_PROXY_SECRET` 或非法 proxy mode 不会静默启动并退回原始 socket 口径。定向 Node 回归 `96/96` 通过。
32. 2026-03-27 follow-up 修复已补充到 `8.8`：`src/routes/health.js` 的顶层 `tls/mtls` 口径改为反映当前请求的真实连接结果，不再在 Nginx 终止 TLS/mTLS 时固定回报后端监听器的 `false/false`；同时新增 `listenerTls/listenerMtls` 保留服务端监听配置状态，避免运维监控在“请求已是 HTTPS、health 却宣称未启用 TLS”之间出现自相矛盾。`tests/health.route.test.js` 新增代理场景回归断言，定向 Node 回归通过。
33. 2026-03-27 follow-up 修复已补充到 `8.8`：按 session/connection 语义重新收口安全状态。`src/ws/terminalGateway.js` 不再把单连接 `connectionSecurity` 写入 session 级 `privilegeMetadata`；`src/services/sessionManager.js` 新增基于活跃 WS 连接的聚合摘要，统一输出 `activeConnectionCount / allTls / allMtlsAuthorized`，并在 `/api/sessions` 保持兼容返回 `activeConnections`。`session_info` 首帧同步返回同一组聚合字段，但连接级 `connectionSecurity` 仍仅表示当前这条连接。`tests/sessionManager.codexConfig.test.js`、`tests/routes.sessions.metadata.test.js`、`tests/terminalGateway.sessionid.test.js` 新增零连接、混合连接、多连接聚合与“session 级不再保留单一 connectionSecurity”回归用例，定向 Node 回归 `97/97` 通过。
34. 2026-03-27 当前批次启动 `8.9` 真机直连验收排查：已按仓库本地 dev server 恢复 `PORT=3010` 基线，并确认 `http://127.0.0.1:3010/api/health` 与 `http://192.168.50.12:3010/api/health` 均可访问，当前服务端监听为明文 HTTP（`tls=false`、`mtls=false`、`listenerTls=false`、`listenerMtls=false`）。本机现存 `pm2:3001` 未纳入本次验收基线。
35. 2026-03-27 `8.9` 当前阻塞点已明确：真机 `4KM7N19311002236` 的 adb 链路不稳定，`adb devices -l` 持续出现 `offline` / `device not found`；同时设备上尚未安装 `com.termlink.app`，debug APK 安装未成功，`launch-termlink.ps1` 返回 `Activity class {com.termlink.app/com.termlink.app.MainShellActivity} does not exist`。因此本批只能确认“服务端 3010 与 LAN 直连基线已恢复”，尚不能对 App 内 HTTP/WS/mTLS 成败作出功能结论。
36. 2026-03-28 `8.9` 继续在备用真机 `MQS7N19402011743 / Android 10` 上复验：debug APK 可成功覆盖安装，`com.termlink.app` 可正常启动；设备侧 `termlink_server_config.xml` 显示 active profile 为 `http://192.168.50.12:3010`、`mtlsEnabled=false`。logcat 记录到 `TermLink-SessionApi` 成功命中该地址，terminal WebSocket 经一次 `4404 Session not found or expired` 自恢复后重新建连成功，并收到 `session_info sessionId=a7e61477-3c35-41e8-8b75-56114484d7dc`；服务端 `/api/sessions` 同时可见 `activeConnectionCount=1`。这说明当前“无法连接”不是普遍性的直连 `IP:port` 故障，而是前一台设备的 adb/安装链路问题。
37. 2026-03-28 `8.9` 已补齐服务端自管 HTTPS/mTLS 的真实拒绝/放行回归：在 `tmp/mtls-8.9-local/` 现场生成本地测试 `CA + server cert/key + good/wrong client p12`，并以 `TERMLINK_TLS_ENABLED=true + TERMLINK_TLS_CLIENT_CERT=require` 启动 `3010`。本地验证结果为：无证书访问 `/api/health` 返回 `ERR_SSL_TLSV13_ALERT_CERTIFICATE_REQUIRED`，错误客户端证书访问返回 `ECONNRESET`，正确客户端证书访问 `/api/health` 返回 `200` 且 `requestSecurity.clientCertAuthorized=true`；同一正确证书下，`/api/ws-ticket` 与 `wss://127.0.0.1:3010`、`wss://192.168.50.12:3010` 都可建立 terminal WebSocket 并收到 `session_info`，其中连接级与 session 聚合字段均表现为 `tls=true / allTls=true / allMtlsAuthorized=true`。
38. 2026-03-28 `8.9` 当前仍未收口为 `done`：服务端 mTLS 拒绝/放行与直连 `IP:port` 已在 PC 侧完成，但 Android 真机对这套本地 HTTPS/mTLS 服务器的最终验收仍缺最后一段，即在设备上导入 `good-client.p12` 并完成 `https://192.168.50.12:3010` 的原生 HTTP / terminal WebSocket 复测。当前备用机 active profile 仍为 `mtlsEnabled=false`，因此尚未形成“真机直连本地自管 mTLS 服务端”的最终结论。
39. 2026-03-28 已识别本地真机 mTLS 收口的额外阻塞：当前 Android app manifest 仅声明 `usesCleartextTraffic=true`，未配置 `networkSecurityConfig` / `debug-overrides` / `certificates src="user"`；因此即使把 `good-client.p12` 导入 profile，设备也会先在服务端证书信任阶段拦下 `https://192.168.50.12:3010` 的自签 CA，而不是进入 mTLS 客户端证书握手。这意味着若不补 debug-only 用户 CA 信任、或改用公网受信服务端证书，本地自管 mTLS 的最终真机闭环仍会卡在 server-cert trust，而不是 client-cert 逻辑本身。
40. 2026-03-28 follow-up 已补充到 `8.9`：为 Android debug build 新增 debug-only `networkSecurityConfig`，仅在 `android/app/src/debug/AndroidManifest.xml` 下启用 `@xml/debug_network_security_config`，信任系统 CA 与用户安装的本地测试 CA；release build 不受影响。`gradlew :app:processDebugMainManifest :app:mergeDebugResources` 已通过。这样 `https://192.168.50.12:3010` 的真机本地 mTLS 验收不再被 server-cert trust 先行阻断，可直接进入备用机本地 mTLS 复测。
41. 2026-03-28 `8.9` 已在备用真机 `MQS7N19402011743 / Android 10` 上完成本地自管 HTTPS/mTLS 实测：证书与用户 CA 安装完成后，通过 `LocalServerMtlsValidationTest` 将 active profile 固定为 `https://192.168.50.12:3010`、`mtlsEnabled=true`、`allowedHosts=192.168.50.12`，并导入 `tmp/mtls-8.9-local/android-good-client-legacy.p12`。测试在真机上通过 `SessionApiClient.listSessions()` 与 `SessionApiClient.createSession("Local mTLS Validation Session")` 两条真实 App 内网络链路完成连通；服务端 `/api/sessions` 同时记录到新增的 `Local mTLS Validation Session`，证明 Android 原生 HTTPS+mTLS 已能直连本地 `IP:port` 服务端完成受保护的 HTTP API 调用。
42. 2026-03-28 当前批次将 `8.9` 状态收口为 `done`：首台设备的 adb/安装链路问题已被隔离为环境问题，不再阻塞功能结论；服务端侧已完成缺证书/错证书/正确证书的拒绝放行回归，PC 侧已完成 HTTPS/WSS 直连 `IP:port` 验证，备用真机已完成 App 内原生 HTTPS+mTLS 真机验收。终端 WebSocket 在真机 UI 前台的额外人工观察不再作为 `8.9` 的阻塞项。
43. 本批对应变更记录：`CR-20260327-1610-phase9-real-device-direct-ip-validation`
44. 2026-03-28 follow-up 已补充到 `8.8`：`src/config/securityGates.js` 新增服务进程管理员/root 权限硬门禁。`TERMLINK_PRIVILEGE_MODE=elevated` 不再只凭配置开关进入高权限态；若 Node 进程本身不具备所需系统权限，则启动期直接失败，避免 Android 端收到与真实运行身份不一致的 `privilegeLevel=ELEVATED` 并误弹 `ELEVATED MODE` 风险提示。`tests/privilegeConfig.securityGates.test.js` 新增无管理员权限拒绝回归用例，定向 Node 回归 `9/9` 通过。
45. 2026-03-28 follow-up 已补充到 `8.9`：`SessionsFragment` 在“至少一个 profile 成功返回远端 sessions、另一个 profile 失败”时不再显示全局 `Refresh failed. Showing latest available sessions.` stale banner，而是仅在对应 profile 卡片内展示局部错误，避免把“局部 profile 异常”误渲染成“整页仅回退缓存”的假阳性。`android/app/src/androidTest/.../SessionsFragmentStatusTest.kt` 已同步更新该口径。
46. 本批对应变更记录：`CR-20260328-0205-session-refresh-and-elevated-gate`

## 1. 文档定位

本清单用于展开 Android profile 级 mTLS 运行时证书选择的实施细节，以及与之配套的服务端 TLS/mTLS 落地路径。  
目标是将 Android 客户端 mTLS 从“构建时内置证书”切换为“按 profile 运行时选择证书”，并同时固定 App 与目标 Server 的长期证书契约，使 WebView、原生 Sessions API 以及后续服务端直连 `IP:port` / 透明中继兼容场景都基于同一套分阶段实施路径推进。

## 2. 技术目标

本阶段完成后必须满足：

1. 每个 profile 可独立绑定一个 PKCS#12 客户端证书。
2. 证书文件在选择后复制到 app 私有目录，不依赖外部 URI 长期可用。
3. 证书口令使用加密本地存储，不写入 profile JSON。
4. WebView 与原生 Session API 使用相同的 profile 证书与口令来源。
5. mTLS 是否有效由 profile 配置与本地证书可用性共同决定，不再依赖 `BuildConfig.MTLS_*`。
6. 旧 profile 升级后若开启过 mTLS，但未补齐新证书，UI 可见且连接不会误回退到旧 assets 证书。
7. 当前实现的 mTLS 证书模型必须同时兼容 `IP:port` 直连和未来透明中继转发，避免后续重做 App profile 或 Server 证书校验模型。

## 3. 实现边界与职责拆分

### 3.1 Android 固定改动点

优先在以下位置落地：

`android/app/src/main/java/com/termlink/app/data/ServerProfile.kt`

`android/app/src/main/java/com/termlink/app/data/ServerConfigStore.kt`

`android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt`

`android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt`

`android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt`

`android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt`

`android/app/src/main/java/com/termlink/app/MainShellActivity.kt`

`android/app/src/main/res/layout/dialog_server_profile.xml`

### 3.2 新增基础模块

建议新增：

`android/app/src/main/java/com/termlink/app/data/MtlsCertificateStore.kt`

`android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt`

职责固定为：

1. 证书副本落盘
2. 口令安全存储
3. 证书输入流读取
4. 解析缓存与失效

### 3.3 服务端固定改动点

后续服务端 mTLS 实现优先在以下位置落地：

`src/server.js`

`src/ws/terminalGateway.js`

`src/routes/health.js`

`src/auth/basicAuth.js`

### 3.4 明确不纳入本期

以下内容不进入本计划：

1. 证书库管理页
2. 一个 profile 绑定多个客户端证书
3. 服务端新增证书探测接口
4. 浏览器端 mTLS 运行时证书管理
5. 中继产品功能、注册中心、打洞与路由编排
6. 业务中继终止 TLS 或介入业务协议

## 4. 分阶段实施

### 8.1 第一步：扩展 Profile 与本地证书存储

1. `ServerProfile` 新增 `mtlsCertificateDisplayName`，默认兼容旧 JSON 为空字符串。
2. `ServerConfigStore` 保持旧 profile 可读，不自动关闭旧 `mtlsEnabled`。
3. 新增 `MtlsCertificateStore`：
   - 将 `Uri` 内容复制到 `filesDir/mtls/<profileId>.p12`
   - 保存/删除 `mtls_password_<profileId>`
   - 提供 `hasCertificate/openInputStream/lastModified/removeAllForProfile`
4. 删除 profile 时同步清理该 profile 的本地证书与口令。

### 8.2 第二步：Settings 弹窗接入证书选择

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

### 8.3 第三步：运行时 mTLS 链路切换

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

### 8.4 第四步：移除旧 build-time mTLS 依赖

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

### 8.5 第五步：测试与验证

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

### 8.6 第六步：固化直连 / 透明中继共用证书契约

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

### 8.7 第七步：服务端 TLS/mTLS 监听与证书加载

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

### 8.8 第八步：HTTP API / WebSocket / terminal / extend_web / codex 接入统一 mTLS

1. HTTP API 与 WebSocket 复用同一 TLS/mTLS 监听，不允许出现 API 受保护而 WS 仍明文的分裂路径。
2. `terminal`、`extend_web`、`codex` 三类模式统一复用服务端客户端证书校验结果，不新增模式专属证书策略。
3. 保留现有 Basic Auth / ticket / 审计链路作为应用层控制，但不再把它们描述为服务端 mTLS 的替代品。
4. 明确服务端在透明中继兼容前提下校验的仍是目标客户端证书，不引入“Relay 模式专用客户端身份”。

### 8.9 第九步：服务端回归验证与直连 IP 场景验收

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

## 5. 验收与文档同步要求

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

## 6. 当前默认决策

1. 每个 profile 仅支持一个 `.p12/.pfx` 客户端证书。
2. 证书在选择后立即复制到 app 私有目录。
3. 证书口令在 profile 弹窗内输入并保存，不延迟到首次连接时再询问。
4. 旧 profile 升级后若缺少新证书，保留 `mtlsEnabled=true`，但显示“证书未配置/待补齐”。
5. Android build-time mTLS fallback 本期视为废弃，不保留兼容路径。
6. “待补齐”仅适用于升级遗留 profile；新建 profile 不允许以该状态完成保存。
7. 用户主动移除一个原本有效的 mTLS 证书时，默认规则是关闭 `mtlsEnabled`，而不是生成新的挂起态。
8. 未来中继默认是透明中继，不终止 TLS，不改变 `App <-> Server` 端到端 mTLS 关系。
9. 若未来需要业务中继终止 TLS，则视为新需求，必须新开 REQ。
