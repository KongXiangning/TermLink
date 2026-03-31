---
title: "Android Profile 级 mTLS 运行时证书选择"
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
status: done
cr_count: 23
date_range: "2026-03-26 — 2026-03-28"
last_updated: 2026-03-31
---

# REQ-20260326-android-profile-mtls-runtime-certificate 实施总结

## 概述

实现 Android Profile 级 mTLS 运行时证书管理全链路：从客户端证书导入/设置/删除，到运行时 WebView 自动挂载客户端证书，再到服务端统一 TLS/mTLS 监听与证书验证。共计 23 条 CR，涵盖 Android 客户端、服务端与文档治理。

## 实施阶段

### Phase 1 — Profile mTLS Store 基础设施（2026-03-26）

- **变更**：实现 Android Profile 级 mTLS 存储基础层（证书导入、KeyStore 持久化）
- **关联 CR**：CR-20260326-0033-mtls-profile-store-foundation

### Phase 2 — Settings UI 与证书管理（2026-03-26）

- **变更**：Settings 面板新增 mTLS 证书导入/查看/删除 UI；修复证书删除清理逻辑；修复导入失败返回值；修复证书替换回滚问题；修复 Settings 保存顺序与 Basic 凭据兼容性
- **关联 CR**：CR-20260326-0041-mtls-profile-settings-phase2、CR-20260326-0100-mtls-settings-remove-certificate-fix、CR-20260326-0105-mtls-import-failure-return-false、CR-20260326-1609-mtls-certificate-replace-rollback-fix、CR-20260326-1619-settings-save-order-basic-credential-fix

### Phase 3 — 运行时证书链挂载（2026-03-26）

- **变更**：实现运行时 Profile 级证书链自动挂载到 WebView/OkHttp；修复凭据加载异常处理；WebView client-cert 缓存失效修复
- **关联 CR**：CR-20260326-0134-mtls-runtime-profile-chain-phase3、CR-20260326-0145-mtls-credential-load-exception-fix、CR-20260326-1603-webview-client-cert-cache-invalidation-fix

### Phase 4 — Build-time 回退移除与契约同步（2026-03-26）

- **变更**：移除 build-time 证书回退路径，完全切换到运行时证书；同步 mTLS direct/transparent-relay 契约；Profile mTLS 摘要可见性修复
- **关联 CR**：CR-20260326-0904-mtls-buildtime-fallback-removal-phase4、CR-20260326-1514-mtls-contract-direct-transparent-relay、CR-20260326-1630-settings-profile-mtls-summary-visibility

### Phase 5 — 计划扩展与文档治理（2026-03-26）

- **变更**：服务端 mTLS 计划扩展；relay 身份语义约束同步；REQ 发布计划与服务端批次同步；PLAN 编号与密码缓存失效口径修复
- **关联 CR**：CR-20260326-1527-server-mtls-plan-expansion、CR-20260326-1532-relay-identity-semantics-constraint、CR-20260326-1539-req-release-plan-server-batch-sync、CR-20260326-1553-plan-numbering-password-cache-sync

### Phase 6 — Android 测试与真机验证（2026-03-26 — 2026-03-27）

- **变更**：Android Settings 测试与构建基线修复；外部 Web Profile 刷新修复；真机 mTLS 验证收口
- **关联 CR**：CR-20260326-2334-phase5-settings-android-tests、CR-20260327-0100-external-web-profile-refresh-fix、CR-20260327-0148-phase5-real-device-mtls-validation

### Phase 7 — 服务端 mTLS 统一接入（2026-03-27 — 2026-03-28）

- **变更**：服务端统一 mTLS 接入实现；真机直连 IP 验证排查；TLS/mTLS 监听与证书加载；会话刷新局部失败口径与 elevated 门禁收口
- **关联 CR**：CR-20260327-1525-server-unified-mtls-integration、CR-20260327-1610-phase9-real-device-direct-ip-validation、CR-20260327-1800-server-tls-mtls-listener、CR-20260328-0205-session-refresh-and-elevated-gate

## 关键决策

| 决策 | 理由 | 关联 CR |
|------|------|---------|
| 运行时证书选择替代 build-time 内嵌 | 支持多 Profile 不同证书，无需重新编译 | CR-20260326-0904 |
| Direct 模式优先，transparent-relay 作为可选 | 简化 MVP 架构，降低中间代理复杂度 | CR-20260326-1514 |
| 服务端统一 TLS/mTLS 监听器 | 避免维护多套证书加载路径 | CR-20260327-1525 |

## 影响范围

- **影响模块**：android（Settings、Profile 数据模型、MtlsWebViewClient、证书存储）/ server（TLS 配置、mTLS 监听、健康检查、鉴权网关）/ docs
- **核心文件**：`SettingsFragment.kt`、`ServerProfile.kt`、`MtlsWebViewClient.kt`、`MainShellActivity.kt`、`src/server.js`、`src/config/tlsConfig.js`、`src/auth/basicAuth.js`

## 验收结果

需求已全量交付。Android 端证书导入/删除/切换正常，WebView 自动挂载客户端证书，服务端 mTLS 验证通过，真机直连 IP 模式验证通过。
