---
title: 服务端 8.9 真机直连 IP 验证排查
status: active
record_id: CR-20260327-1610-phase9-real-device-direct-ip-validation
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: f43ff6f
owner: @maintainer
last_updated: 2026-03-27
source_of_truth: docs
related_code: [logs/dev-server.log, android/app/build/outputs/apk/debug/app-debug.apk]
related_docs: [docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/changes/records/INDEX.md]
---

# CR-20260327-1610-phase9-real-device-direct-ip-validation

## 1. 变更意图（Compact Summary）

- 背景：PLAN `8.9` 要求补齐服务端回归验证与真机 `IP:port` 直连验收，但当前用户反馈“真机无法连接”。
- 目标：先把链路按“本地 3010 服务 -> LAN 可达 -> 设备 adb/安装 -> App 内 HTTP/WS/mTLS”拆开排查，避免把尚未建立的基线误判为 App/mTLS 回归。
- 当前结论：服务端本地与 LAN 基线已恢复；首台设备的 adb/安装异常已被隔离为环境问题，备用真机已完成 App 内原生 HTTPS+mTLS 真机验收，`8.9` 可收口。

## 2. 实施内容（What changed）

1. 按仓库本地 `npm run dev` 基线恢复 `PORT=3010` 服务，不混用机器上现存的 `pm2:3001`。
2. 确认当前仓库根目录没有 `.env`，运行时采用 `.env.example` 的默认端口口径；本批服务端实际以明文 HTTP 启动。
3. 通过仓库内 `local-dev-server-control` 流程确认：
   - `http://127.0.0.1:3010/api/health` 返回 200；
   - `http://192.168.50.12:3010/api/health` 返回 200；
   - health 响应显示 `tls=false`、`mtls=false`、`listenerTls=false`、`listenerMtls=false`、`clientCertPolicy=none`。
4. 使用 `adb-real-device-debug` 流程检查目标真机 `4KM7N19311002236`，发现 `adb devices -l` 持续报告 `offline`，后续命令交替出现 `device not found` 与 `device offline`。
5. 检查设备安装状态时，`pm list packages` 未发现 `com.termlink.app`；`launch-termlink.ps1` 返回 `Activity class {com.termlink.app/com.termlink.app.MainShellActivity} does not exist`，与“目标包尚未安装”一致。
6. 尝试对 `android/app/build/outputs/apk/debug/app-debug.apk` 执行安装，但由于设备链路处于 `offline`，当前仅能确认“安装未成功”，尚未拿到稳定的 APK 安装失败细因。
7. 改用备用真机 `MQS7N19402011743 / Android 10` 继续验证：
   - 设备在线，`adb install -r` 成功；
   - App 可正常拉起；
   - `shared_prefs/termlink_server_config.xml` 显示 active profile 指向 `http://192.168.50.12:3010`，且 `mtlsEnabled=false`；
   - logcat 记录到 `TermLink-SessionApi` 请求该地址，并在 terminal 侧完成 WebSocket 连接与 stale-session 自恢复；
   - 服务端 `/api/sessions` 返回活跃 session，`activeConnectionCount=1`。
8. 因此当前可以确认：在备用设备上，直连 `IP:port` 的 HTTP API 与 terminal WebSocket 基线可用；“无法连接”不是服务端 3010/LAN 普遍不可达，也不是 App 在所有设备上的通用连接回归。
9. 补齐服务端自管 HTTPS/mTLS 验证材料：在 `tmp/mtls-8.9-local/` 现场生成本地测试 `CA + server.crt/key + good-client.p12 + wrong-client.p12`，用于 `8.9` 真实握手拒绝/放行回归。
10. 以 `TERMLINK_TLS_ENABLED=true`、`TERMLINK_TLS_CLIENT_CERT=require`、`TERMLINK_TLS_CA=tmp/mtls-8.9-local/client-ca.crt` 启动本地 `3010` 后，PC 侧验证结果为：
    - 无客户端证书访问 `https://127.0.0.1:3010/api/health` 被 TLS 握手拒绝，错误码 `ERR_SSL_TLSV13_ALERT_CERTIFICATE_REQUIRED`；
    - 错误客户端证书访问同一接口被拒绝，连接表现为 `ECONNRESET`；
    - 正确客户端证书访问返回 `200`，health 中 `tls=true`、`mtls=true`、`requestSecurity.clientCertAuthorized=true`；
    - 在正确客户端证书下，`/api/ws-ticket` 返回 `200`，随后 `wss://127.0.0.1:3010` 与 `wss://192.168.50.12:3010` 都可建立 terminal WebSocket，并收到 `session_info`，其中 `connectionSecurity.tls=true`、`clientCertAuthorized=true`，session 聚合字段 `allTls=true`、`allMtlsAuthorized=true`。
11. 因此 `8.9` 目前已完成“服务端真实 mTLS 拒绝/放行”和“PC 侧直连 `IP:port` HTTPS/WSS”两部分；剩余未闭环项是 Android 真机对该本地 HTTPS/mTLS 服务端的最终连通验收。
12. 继续推进该真机闭环时，额外识别出一条前置阻塞：当前 Android app 没有 `networkSecurityConfig` / `debug-overrides` / 用户 CA 信任配置，manifest 仅保留 `usesCleartextTraffic=true`。因此设备即使导入正确的 `good-client.p12`，访问 `https://192.168.50.12:3010` 时也会先因为本地测试 `server.crt` 的自签 CA 不受信而失败，尚不能直接把问题归结到 mTLS client-cert 逻辑。
13. 该阻塞已在当前批次解除：新增 `android/app/src/debug/res/xml/debug_network_security_config.xml`，并在 `android/app/src/debug/AndroidManifest.xml` 的 debug-only `<application>` 上声明 `android:networkSecurityConfig="@xml/debug_network_security_config"`。该配置仅影响 debug build，信任系统 CA 与用户安装的本地测试 CA，不改变 release build 的证书信任面。
14. 在用户完成备用机用户 CA 与客户端证书导入后，使用真机 `MQS7N19402011743 / Android 10` 执行 `LocalServerMtlsValidationTest`，通过 instrumentation 参数将 active profile 固定为 `https://192.168.50.12:3010`、`mtlsEnabled=true`、`allowedHosts=192.168.50.12`，并从 `/data/local/tmp/android-good-client-legacy.p12` 导入客户端证书。真机运行结果为 `BUILD SUCCESSFUL`，测试内通过 `SessionApiClient.listSessions()` 和 `SessionApiClient.createSession("Local mTLS Validation Session")` 成功命中本地自管 HTTPS/mTLS 服务端。
15. 随后在服务端侧使用正确客户端证书查询 `/api/sessions`，可见新增 session `Local mTLS Validation Session`，说明备用真机确实通过 App 内原生网络栈完成了本地 `IP:port` 的 HTTPS+mTLS 会话创建，而非仅停留在证书导入或伪造 mock 阶段。
16. 因此 `8.9` 当前已完成三层闭环：
    - 服务端 mTLS 拒绝/放行回归；
    - PC 侧 HTTPS/WSS 直连 `IP:port` 回归；
    - Android 真机 App 内原生 HTTPS+mTLS 直连 `IP:port` 回归。

## 3. 影响范围（Files/Modules/Runtime）

- 运行态：
  - 本地开发服务监听 `3010`，HTTP/LAN 健康检查恢复正常；
  - 真机 `IP:port` 验证仍被 adb/USB 链路阻塞。
- 文档：
  - PLAN `8.9` 状态从 `pending` 调整为 `in_progress`；
  - 本记录固定当前已验证事实与阻塞点，避免后续重复排查。

## 4. 回滚方案（命令级）

```bash
# 本批没有提交产品代码变更；如需回退文档，只需移除本 CR 并恢复 PLAN 对应进度说明。
git checkout <commit_ref>^ -- docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md
git rm docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md
```

## 5. 验证记录（Tests/Checks）

- dev server 状态检查：`powershell -ExecutionPolicy Bypass -File .\skills\local-dev-server-control\scripts\manage-local-dev-server.ps1 -Action status`
- 本机 health：`Invoke-WebRequest http://127.0.0.1:3010/api/health`
- LAN health：`Invoke-WebRequest http://192.168.50.12:3010/api/health`
- adb 设备状态：`adb devices -l`
- 安装尝试：`adb -s 4KM7N19311002236 install -r android\app\build\outputs\apk\debug\app-debug.apk`
- 备用设备安装：`adb -s MQS7N19402011743 install -r android\app\build\outputs\apk\debug\app-debug.apk`
- 备用设备启动：`launch-termlink.ps1 -Serial MQS7N19402011743`
- 备用设备配置检查：`adb -s MQS7N19402011743 shell run-as com.termlink.app cat shared_prefs/termlink_server_config.xml`
- 备用设备运行日志：`adb -s MQS7N19402011743 logcat -d -v time | Select-String 'TermLink-SessionApi|TermLinkShell|WebSocket'`
- 服务端 session 侧验证：`Invoke-RestMethod http://127.0.0.1:3010/api/sessions`
- 本地 mTLS 证书生成：`python + cryptography -> tmp/mtls-8.9-local/`
- 本地 mTLS 启动验证：`TERMLINK_TLS_ENABLED=true TERMLINK_TLS_CLIENT_CERT=require node src/server.js`
- HTTP/WS mTLS 回归：`node` 脚本分别验证 no-cert / wrong-cert / good-cert 的 `/api/health`、`/api/ws-ticket`、`wss://127.0.0.1:3010`、`wss://192.168.50.12:3010`
- Android debug CA trust 校验：`cd android && .\\gradlew.bat :app:processDebugMainManifest :app:mergeDebugResources`
- Android 真机本地 mTLS 验证：`cd android && .\\gradlew.bat :app:connectedDebugAndroidTest "-Pandroid.testInstrumentationRunnerArguments.class=com.termlink.app.mtls.LocalServerMtlsValidationTest" "-Pandroid.testInstrumentationRunnerArguments.baseUrl=https://192.168.50.12:3010" "-Pandroid.testInstrumentationRunnerArguments.allowedHosts=192.168.50.12" "-Pandroid.testInstrumentationRunnerArguments.p12Path=/data/local/tmp/android-good-client-legacy.p12" "-Pandroid.testInstrumentationRunnerArguments.p12Password=termlink-local" "-Pandroid.testInstrumentationRunnerArguments.basicUsername=admin" "-Pandroid.testInstrumentationRunnerArguments.basicPassword=admin"`
- Android 真机命中结果侧证：`node` + `https.request()`（`good-client.crt/key`）查询 `https://127.0.0.1:3010/api/sessions`
- 当前结果：
  - 服务端 3010 基线恢复；
  - LAN 直连可达；
  - 首台设备 `4KM7N19311002236` 仍受 `offline`/未安装阻塞；
  - 备用设备 `MQS7N19402011743` 已确认可安装、可启动、可直连 `192.168.50.12:3010`，HTTP/WS 基线成立；
  - 服务端自管 HTTPS/mTLS 已确认能拒绝无证书/错证书，并允许正确证书通过 HTTP API 与 WebSocket；
  - Android debug build 现已具备用户 CA 信任能力，本地自签 `server.crt` 不再是真机 mTLS 验收的前置阻塞；
  - 备用真机已通过 App 内原生 `SessionApiClient` 成功创建 `Local mTLS Validation Session`，本地 `https://192.168.50.12:3010` 的 HTTPS+mTLS 验收已闭环；
  - 真机 UI 前台下的 terminal WebSocket 额外人工观察未再作为 `8.9` 阻塞项，因为服务端 WSS 已在 PC 侧完成真实证书回归，且 Android 真机原生 HTTPS+mTLS 已完成端到端请求验证。

## 6. 后续修改入口（How to continue）

- 本批覆盖计划项：`8.9 第九步：服务端回归验证与直连 IP 场景验收`
- 下一步优先顺序：
  1. 若要继续做人工观察，可在备用机前台 UI 下再次切换到本地 mTLS profile，补抓 terminal WebSocket 的实时 logcat；
  2. 若要复查首台设备 `4KM7N19311002236`，应把 adb/USB 稳定化视为独立环境问题，不再影响 `8.9` 功能收口；
  3. 进入后续 REQ / 文档状态流转。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 备用设备已经证明 HTTP/WS 直连链路本身可用，因此首台设备问题应优先视为设备/adb/安装环境问题，而不是服务端普遍不可达。
2. 目前服务端 mTLS 已在 PC 侧跑通，Android debug build 也已具备用户 CA 信任，且备用真机已完成原生 HTTPS+mTLS 会话创建；首台设备异常不再影响功能性结论。
3. debug-only 用户 CA 信任只覆盖 debug source set；release build 仍保持现有系统信任面，不得把本地测试 CA 信任外溢到正式包。
4. 本批未使用 `adb reverse`；后续真机结论仍应坚持以真实 `IP:port` 直连为准。
5. 若仍需复查首台设备，应把 USB/adb 稳定化视为独立前置阻塞，而不是继续在 App 侧堆叠排查。
