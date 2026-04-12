---
title: Codex Android mTLS websocket fix
status: active
record_id: CR-20260413-0215-codex-android-mtls-ws-fix
req_id: REQ-20260408-codex-native-android-migration
commit_ref: da5470a
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt, android/app/src/main/java/com/termlink/app/data/MtlsOkHttpSupport.kt, android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt, android/app/src/main/java/com/termlink/app/codex/network/CodexWebSocketClient.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/test/java/com/termlink/app/data/MtlsCredentialRepositoryTest.kt]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/changes/records/CR-20260413-0210-codex-android-mtls-ws-403.md, docs/changes/records/INDEX.md]
---

# CR-20260413-0215-codex-android-mtls-ws-fix

## 1. 变更意图（Compact Summary）

- 背景：mTLS 保护的原生 Codex profile 在真机上可正常请求 `/api/sessions`，但进入 Codex 会话时 WebSocket 握手被 403 拒绝；根因定位为 Codex 专用 OkHttp client 未复用 profile 客户端证书。
- 目标：让原生 Codex 的 `/api/ws-ticket` 与后续 `wss://...` upgrade 统一走 profile-aware mTLS 配置，消除“REST 正常、Codex WS 403”的分裂行为。
- 本次边界：只修复 Android 客户端的 mTLS / WS 对齐问题，不修改服务端协议、不改反向代理配置、不改普通 Sessions REST 客户端。

## 2. 实施内容（What changed）

本批覆盖计划项：

1. `Phase 4 follow-up Codex mTLS websocket parity（2026-04-13 mTLS websocket fix）`

1. `MtlsCredentialRepository` 现在除了 `SSLSocketFactory` 之外，也缓存并暴露对应的 `X509TrustManager`，为 OkHttp mTLS 提供完整 TLS 参数。
2. 新增 `MtlsOkHttpSupport`，复用现有 profile / certificate store / allowed-host 规则，为指定 HTTPS 目标地址生成带 profile 客户端证书的 OkHttp client。
3. `CodexConnectionManager` 改为在建连前为当前 profile 构造 mTLS-aware transport client，并将同一 client 同时用于 `/api/ws-ticket` 请求和 `CodexWebSocketClient.connect(...)` 的 WebSocket upgrade。
4. `CodexWebSocketClient` 新增外部传入 `OkHttpClient` 的能力，避免继续固定使用内部裸 client。
5. `CodexViewModel` / `CodexActivity` 向连接管理器补传 `applicationContext`，用于加载 mTLS 证书与 host allowlist。
6. `MtlsCredentialRepositoryTest` 已同步补齐新的 `trustManager` 字段构造，保证缓存单测继续覆盖凭据缓存行为。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt`
  - `android/app/src/main/java/com/termlink/app/data/MtlsOkHttpSupport.kt`
  - `android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt`
  - `android/app/src/main/java/com/termlink/app/codex/network/CodexWebSocketClient.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt`
  - `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt`
- 模块：
  - 原生 Codex Android 连接层
  - mTLS profile 证书复用
  - `/api/ws-ticket` + WebSocket upgrade 对齐
- 运行时行为：
  - mTLS 保护 profile 下，原生 Codex 不再只让 `/api/sessions` 成功、让 WS 握手失败；
  - Codex 建连将携带正确 ticket 并复用相同的客户端证书能力；
  - 非 mTLS profile 继续使用默认 OkHttp client，不改变既有行为。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 mTLS / WS 客户端修复
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/data/MtlsOkHttpSupport.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/network/CodexWebSocketClient.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `cd android && set JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 && .\gradlew.bat :app:compileDebugKotlin :app:testDebugUnitTest --tests com.termlink.app.data.MtlsCredentialRepositoryTest`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/build-debug-apk.ps1`
  - `powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/install-debug-apk.ps1 -Serial da34332c`
  - `adb -s da34332c logcat -c`
  - `adb -s da34332c shell am force-stop com.termlink.app`
  - `adb -s da34332c shell am start -W -n com.termlink.app/.MainShellActivity`
  - `adb -s da34332c logcat -d -v time | Select-String 'CodexConnMgr|CodexWsClient|TermLink-SessionApi|ws-ticket|403|Forbidden|WebSocket opened'`
- 结果：
  - Android `compileDebugKotlin` 通过，`MtlsCredentialRepositoryTest` 通过 `4/4`。
  - 真机 `da34332c` 上，目标 Win 服务健康检查仍返回 HTTP 200。
  - 真机启动日志已确认：
    - `TermLink-SessionApi` 对 `/win/api/sessions` 返回 200；
    - `CodexWsClient` 使用带 ticket 的 `wss://.../win/?sessionId=...&ticket=...` 发起连接；
    - 后续收到 `WebSocket opened (protocol=http/1.1)`；
    - 不再复现此前的 `Expected HTTP 101 response but was '403 Forbidden'`。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/data/MtlsOkHttpSupport.kt`
  - `android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt`
  - `android/app/src/main/java/com/termlink/app/codex/network/CodexWebSocketClient.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前修复假设 Codex 与 Sessions 使用同一 profile、同一证书与同一 host allowlist；后续若引入 provider 级独立 endpoint，需要避免直接绕过这层 profile 绑定。
2. `fetchTicketUrl()` 仍保留“失败时回退到原始 wsUrl”的兜底逻辑；若后续需要更明确的用户提示，可继续把 ticket/mTLS 失败原因显式透传到 UI。
