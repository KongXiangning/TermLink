---
title: Codex Android mTLS websocket 403 investigation
status: draft
record_id: CR-20260413-0210-codex-android-mtls-ws-403
req_id: REQ-20260408-codex-native-android-migration
commit_ref: TBD
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt, android/app/src/main/java/com/termlink/app/codex/network/CodexWebSocketClient.kt, android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt, android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt, src/auth/basicAuth.js]
related_docs: [docs/product/requirements/REQ-20260408-codex-native-android-migration.md, docs/guides/deployment.md, docs/changes/records/INDEX.md]
---

# CR-20260413-0210-codex-android-mtls-ws-403

## 1. 变更意图（Compact Summary）

- 背景：真机连接到启用认证、经 `/win` 前缀反代暴露的 Win TermLink 服务时，Sessions API 可返回 200，但原生 Codex 页面进入后立刻出现连接失败。
- 目标：把这次现场排查结论沉淀下来，明确故障点位于 Codex WebSocket 握手链路，而不是服务进程存活或 `/api/sessions` REST 拉取链路。
- 本次边界：仅记录现场证据、代码定位和后续修复入口；不在本记录中直接修改 Android 或服务端代码。

## 2. 实施内容（What changed）

1. 记录现场结论：部署目录对应服务本地健康检查返回 200，说明 Win 服务已成功启动，不是“服务没起来”。
2. 记录真机日志证据：原生客户端对 `/win/api/sessions` 的请求返回 200，但紧接着 `CodexWsClient` 报 `Expected HTTP 101 response but was '403 Forbidden'`，说明失败发生在 Codex 专用 WebSocket 升级阶段。
3. 记录代码定位：`SessionApiClient` 通过 `MtlsHttpSupport` 给 HTTPS 请求套用 profile 的 mTLS 证书，而 `CodexConnectionManager` / `CodexWebSocketClient` 使用独立的裸 `OkHttpClient`，未复用同一套 mTLS 凭据。
4. 记录推断链路：在需要 mTLS/认证的反代场景下，Codex 侧的 `/api/ws-ticket` 获取或后续 `wss://.../win/?sessionId=...` 升级请求会被前置网关以 403 拒绝；当前 `fetchTicketUrl()` 又会在失败时回退到无 ticket 的 wsUrl，使现场表象集中为 WebSocket 403。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt`
  - `android/app/src/main/java/com/termlink/app/codex/network/CodexWebSocketClient.kt`
  - `android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt`
  - `android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt`
  - `src/auth/basicAuth.js`
- 模块：
  - 原生 Codex Android 连接链路
  - `/api/ws-ticket` 一次性票据认证
  - mTLS 保护下的 REST / WebSocket 一致性
- 运行时行为：
  - Sessions 列表或 workspace 元信息可能正常返回；
  - 进入原生 Codex 会话时，WebSocket 升级被 403 拒绝；
  - 用户看到的是 Codex 连接失败，而不是服务存活失败。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅移除此调查记录
git checkout <commit_ref>^ -- docs/changes/records/CR-20260413-0210-codex-android-mtls-ws-403.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `adb logcat` 复现原生 Codex 启动期连接日志
  - 服务部署目录本地 `/api/health` 校验
  - `rg` / `view` 追查 `CodexConnectionManager`、`CodexWebSocketClient`、`SessionApiClient`、`MtlsHttpSupport`
- 结果：
  - 服务健康检查成功，排除“服务未启动”。
  - 真机日志确认 `/api/sessions` 返回 200 后，`CodexWsClient` 在握手阶段收到 403。
  - 代码确认 REST 与 Codex WS 目前使用两套不同客户端；只有 REST 链路显式应用 mTLS 证书。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt`
  - `android/app/src/main/java/com/termlink/app/codex/network/CodexWebSocketClient.kt`
  - `android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 若外层反代同时要求 mTLS 与 BasicAuth，Codex 侧只修 ticket 而不补 mTLS client cert 仍可能继续失败。
2. 即使外层反代已正确透传 `Upgrade / Connection`，只要 Codex WS 客户端没有沿用 profile 级 TLS/mTLS 凭据，现场仍会表现为“REST 正常、Codex WS 403”。
