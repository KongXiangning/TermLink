## REQ-20260326-android-profile-mtls-runtime-certificate 实施清单

### 0. 当前实施进度

状态口径：`done` = 已实现并有 CR 留痕，`in_progress` = 当前批次进行中，`pending` = 尚未实现。

1. `done`：`8.1 第一步：扩展 ServerProfile 与本地证书存储层`
2. `done`：`8.2 第二步：Settings 弹窗接入证书选择、口令输入与状态提示`
3. `done`：`8.3 第三步：WebView 与原生 Session API 切换到 profile 级 mTLS 读取`
4. `pending`：`8.4 第四步：移除 BuildConfig / assets mTLS fallback 与构建脚本依赖`
5. `pending`：`8.5 第五步：补齐单测、Android 测试与真机验证`

当前说明：

1. 本计划用于承接 `REQ-20260326-android-profile-mtls-runtime-certificate`。
2. 2026-03-26 当前批次已完成 `8.1`：补齐 `ServerProfile.mtlsCertificateDisplayName` 兼容、固化 `MtlsCertificateStore` 的 Phase 1 存储职责、并在 profile 删除时清理本地 mTLS 证书与口令。
3. 2026-03-26 当前批次已完成 `8.2`：Settings 弹窗接入证书选择/替换/移除、mTLS 口令输入、legacy pending 状态提示，以及新建/编辑 profile 的保存校验。
4. 2026-03-26 follow-up 修复已补充到 `8.2`：用户在编辑 legacy pending profile 时主动移除证书副本，保存后会同步清理 App 私有 mTLS 证书材料，不再残留旧副本。
5. 2026-03-26 follow-up 修复已补充到 `8.2`：`MtlsCertificateStore.importCertificate()` 在证书导入失败或源 URI 不可读时统一返回 `false`，不再把异常抛到 Settings 保存链路。
6. 2026-03-26 当前批次已完成 `8.3`：`MtlsPolicyResolver` 改为基于 profile 本地证书/口令状态生效，`MtlsWebViewClient` 与 `MtlsHttpSupport` 改为统一从 `MtlsCredentialRepository + MtlsCertificateStore` 读取运行时凭据，并在证书/口令变更时失效缓存。
7. 2026-03-26 follow-up 修复已补充到 `8.3`：`MtlsCredentialRepository.load()` 在错误口令或损坏 `.p12` 导致解析异常时统一返回空结果，不再把异常直接抛到 WebView / Session API 运行时链路。
8. 本批覆盖计划项：`8.3 第三步：WebView 与原生 Session API 切换到 profile 级 mTLS 读取`。
9. 本批对应变更记录：`CR-20260326-0145-mtls-credential-load-exception-fix`。

### 1. 文档定位

本清单用于展开 Android profile 级 mTLS 运行时证书选择的实施细节。  
目标是将 Android 客户端 mTLS 从“构建时内置证书”切换为“按 profile 运行时选择证书”，且 WebView 与原生 Sessions API 共享同一 profile 级证书来源。

### 2. 技术目标

本阶段完成后必须满足：

1. 每个 profile 可独立绑定一个 PKCS#12 客户端证书。
2. 证书文件在选择后复制到 app 私有目录，不依赖外部 URI 长期可用。
3. 证书口令使用加密本地存储，不写入 profile JSON。
4. WebView 与原生 Session API 使用相同的 profile 证书与口令来源。
5. mTLS 是否有效由 profile 配置与本地证书可用性共同决定，不再依赖 `BuildConfig.MTLS_*`。
6. 旧 profile 升级后若开启过 mTLS，但未补齐新证书，UI 可见且连接不会误回退到旧 assets 证书。

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

#### 3.3 明确不纳入本期

以下内容不进入本计划：

1. 证书库管理页
2. 一个 profile 绑定多个客户端证书
3. 服务端新增证书探测接口
4. 浏览器端 mTLS 运行时证书管理

### 4. 分阶段实施

### 4.1 第一步：扩展 Profile 与本地证书存储

1. `ServerProfile` 新增 `mtlsCertificateDisplayName`，默认兼容旧 JSON 为空字符串。
2. `ServerConfigStore` 保持旧 profile 可读，不自动关闭旧 `mtlsEnabled`。
3. 新增 `MtlsCertificateStore`：
   - 将 `Uri` 内容复制到 `filesDir/mtls/<profileId>.p12`
   - 保存/删除 `mtls_password_<profileId>`
   - 提供 `hasCertificate/openInputStream/lastModified/removeAllForProfile`
4. 删除 profile 时同步清理该 profile 的本地证书与口令。

### 4.2 第二步：Settings 弹窗接入证书选择

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

### 4.3 第三步：运行时 mTLS 链路切换

1. `MtlsPolicyResolver` 改为基于：
   - `profile.mtlsEnabled`
   - 本地证书是否存在
   - 本地证书口令是否存在
2. 新增 `MtlsCredentialRepository`：
   - 按 `profileId + fileLastModified + passwordFingerprint` 缓存
   - 返回 `PrivateKey + X509 chain + SSLSocketFactory`
3. `MtlsWebViewClient` 改为从 `MtlsCredentialRepository` 读取证书与私钥。
4. `MtlsHttpSupport` 改为从 `MtlsCredentialRepository` 读取 `SSLSocketFactory`。
5. 切换 profile、替换证书、删除证书时要失效旧缓存。

### 4.4 第四步：移除旧 build-time mTLS 依赖

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

### 4.5 第五步：测试与验证

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

### 6. 当前默认决策

1. 每个 profile 仅支持一个 `.p12/.pfx` 客户端证书。
2. 证书在选择后立即复制到 app 私有目录。
3. 证书口令在 profile 弹窗内输入并保存，不延迟到首次连接时再询问。
4. 旧 profile 升级后若缺少新证书，保留 `mtlsEnabled=true`，但显示“证书未配置/待补齐”。
5. Android build-time mTLS fallback 本期视为废弃，不保留兼容路径。
6. “待补齐”仅适用于升级遗留 profile；新建 profile 不允许以该状态完成保存。
7. 用户主动移除一个原本有效的 mTLS 证书时，默认规则是关闭 `mtlsEnabled`，而不是生成新的挂起态。
