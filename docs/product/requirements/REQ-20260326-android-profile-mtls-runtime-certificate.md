---
title: Android Profile 级 mTLS 运行时证书选择
status: planned
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/ui/settings/SettingsFragment.kt, android/app/src/main/java/com/termlink/app/MainShellActivity.kt, android/app/src/main/java/com/termlink/app/data/ServerProfile.kt, android/app/src/main/java/com/termlink/app/data/SessionApiClient.kt, android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt, android/app/src/main/res/layout/dialog_server_profile.xml]
related_docs: [docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/guides/android-development.md, docs/architecture/CURRENT_STATE.md, docs/ops/ops-checklist.md, docs/PROJECT_OVERVIEW.md]
---

# REQ-20260326-android-profile-mtls-runtime-certificate

## Meta

- id: REQ-20260326-android-profile-mtls-runtime-certificate
- title: Android Profile 级 mTLS 运行时证书选择
- priority: P1
- status: planned
- owner: @maintainer
- target_release: 2026-Q2
- links: `docs/product/REQUIREMENTS_BACKLOG.md`

## 1. 背景与目标

当前 Android 端 mTLS 客户端证书采用构建时置入 `android/app/src/main/assets/mtls/*.p12|*.pfx` 的方式，并通过 `TERMLINK_MTLS_*` 注入到 `BuildConfig`。  
这一方案的主要问题是：

1. 证书无法按 profile 独立配置。
2. 更换证书需要重新打包或重新构建 App。
3. WebView 终端与原生 Sessions API 共用全局证书，不适合多环境、多租户或多证书场景。

本需求目标是将 Android mTLS 改为 profile 级运行时配置：用户在 Settings 配置服务信息时，勾选 `Enable mTLS for this profile` 后选择 `.p12/.pfx` 证书，并在同一弹窗输入证书口令。证书内容保存到 app 私有目录，证书口令保存到加密本地存储；WebView 与原生 Sessions API 都按当前 profile 使用对应证书。

## 2. In Scope

1. Settings 中勾选 `Enable mTLS for this profile` 时弹出系统文件选择器，允许选择 `.p12/.pfx` 证书。
2. Add/Edit Profile 弹窗内支持：
   - 查看当前证书状态
   - 选择证书
   - 替换证书
   - 移除证书
   - 输入并保存证书口令
3. `ServerProfile` 增加证书展示字段，用于 Settings 列表与编辑弹窗展示当前绑定证书名称。
4. 新增本地 `MtlsCertificateStore`，负责：
   - 将选中的证书复制到 `filesDir/mtls/<profileId>.p12`
   - 保存/读取/删除该 profile 的 mTLS 口令
   - 提供证书存在性、最后修改时间、输入流读取能力
5. WebView 终端与原生 `/api/sessions` 调用链路都改为读取当前 profile 绑定证书。
6. 新增共享的 mTLS 凭据解析缓存，避免 WebView 与原生 HTTP 链路重复解析同一证书。
7. 关闭 profile 的 mTLS、删除 profile、替换证书时，清理旧证书副本、旧口令与旧解析缓存。
8. 升级兼容：
   - 旧 profile 若原来 `mtlsEnabled=true`，升级后保留开关状态
   - 若未配置新证书，则显示“证书未配置/待补齐”，连接时不生效
   - 不再回退到打包进 assets 的旧证书
   - 允许旧 profile 以“待补齐”状态继续被展示，并保存非 mTLS 字段修改
9. 用户主动移除证书时：
   - 若该 profile 是升级遗留的挂起态 profile，则允许继续保存为“待补齐”状态
   - 若该 profile 原本是有效 mTLS 配置，则移除证书后必须同时关闭 `mtlsEnabled`，不允许把有效配置主动编辑成新的挂起态

## 3. Out of Scope

1. 不改服务端 mTLS 门禁逻辑与环境变量定义。
2. 不新增证书管理页、证书库或跨 profile 共享证书能力。
3. 不支持一个 profile 绑定多个客户端证书。
4. 不保留 Android build-time mTLS fallback。
5. 不在本期扩展服务端“证书有效性预检”接口。

## 4. 方案概要

1. `ServerProfile` 保留 `mtlsEnabled + allowedHosts`，新增 `mtlsCertificateDisplayName`。
2. Settings 弹窗勾选 mTLS 时立即拉起系统文件选择器；若取消选择且当前没有已保存证书，则回退为未启用状态。
3. 证书选择完成后复制到 app 私有目录，不依赖长期 URI 权限。
4. 证书口令与 BASIC 密码一样使用 `EncryptedSharedPreferences` 保存。
5. `MtlsPolicyResolver` 不再依赖 `BuildConfig.MTLS_ENABLED / MTLS_ALLOWED_HOSTS`，而是根据 profile 本身及本地证书就绪状态判断是否有效。
6. `MtlsWebViewClient` 与 `MtlsHttpSupport` 统一通过共享的 `MtlsCredentialRepository` 读取 `PrivateKey / X509 chain / SSLSocketFactory`。
7. Android 构建脚本移除 `TERMLINK_MTLS_*` 到 `BuildConfig` 的注入与相关文档说明。
8. 本需求完成后，所有仍声明 Android mTLS 依赖 `BuildConfig/TERMLINK_MTLS_*/assets/mtls` 的 active 文档必须在同一批次同步更新，避免新旧方案并存。
9. 若 `docs/PROJECT_OVERVIEW.md` 继续作为项目入口文档使用，也必须在同一批次同步更新 Android mTLS 描述。

## 5. 接口/数据结构变更

1. `ServerProfile` 新增字段：
   - `mtlsCertificateDisplayName: String`
2. `SettingsFragment.Callbacks` 增加 mTLS 相关接口：
   - 保存证书文件
   - 读取证书是否已存在
   - 读取/写入/删除证书口令
   - 删除 profile 证书副本
3. 新增 `MtlsCertificateStore`：
   - `importCertificate(profileId, uri)`
   - `hasCertificate(profileId)`
   - `openCertificateInputStream(profileId)`
   - `getCertificateLastModified(profileId)`
   - `putPassword/getPassword/removePassword(profileId)`
   - `removeAllForProfile(profileId)`
4. 新增 `MtlsCredentialRepository`：
   - 按 `profileId + fileLastModified + passwordFingerprint` 缓存解析结果
   - 提供失效清理接口
5. `MtlsPolicyResolver` 增加“证书缺失/口令缺失”判定。
6. Active 文档同步范围至少包括：
   - `docs/guides/android-development.md`
   - `docs/architecture/CURRENT_STATE.md`
   - `docs/ops/ops-checklist.md`
7. 若 `docs/PROJECT_OVERVIEW.md` 仍作为团队常用入口文档，则也纳入同步范围。

## 6. 验收标准

1. 新建/编辑 profile 时可为该 profile 选择 `.p12/.pfx` 客户端证书并持久化。
2. 新建 profile 时，若 `mtlsEnabled=true` 但未选证书或未提供证书口令，则不能保存。
3. 升级遗留的旧 profile 若已处于 `mtlsEnabled=true` 且缺证书/缺口令状态，允许继续保存其它字段修改，但该 profile 必须显示“待补齐”，且运行时不得作为有效 mTLS 配置。
4. 用户主动移除一个原本有效的 mTLS 证书时，不允许把该 profile 保存成新的“待补齐”挂起态；必须同时关闭 `mtlsEnabled`，或重新选择证书并补齐口令后再保存。
5. WebView 终端连接需要 mTLS 的服务时，会读取当前 profile 的证书完成握手。
6. Sessions `/api/sessions` 使用当前 profile 的证书完成 mTLS 请求。
7. A/B 两个 profile 使用不同证书来回切换时，不会发生证书串用。
8. 编辑 profile 替换证书后，新连接使用新证书；旧证书副本与旧缓存被清理。
9. 删除 profile 或关闭 mTLS 后，对应证书副本与口令不会残留。
10. 旧 profile 升级后若没有新证书，UI 要显示缺失状态；不得静默关闭，也不得回退到 assets 证书。

## 7. 测试场景

1. `ServerProfile` 旧 JSON 升级兼容：缺少 `mtlsCertificateDisplayName` 时可安全回退为空。
2. 新建 profile：
   - 勾选 mTLS
   - 选择证书
   - 输入证书口令
   - 保存后重进 app 仍能显示证书名称
3. 编辑 profile：
   - 保留原证书，仅修改其它字段
   - 替换证书并更新口令
   - 移除证书再保存
4. 旧 profile 升级后若 `mtlsEnabled=true` 且证书缺失，允许修改非 mTLS 字段并保存，Settings 列表显示“待补齐”态。
5. 新建 profile 若勾选 mTLS 但取消选证书或不填口令，保存被阻止。
6. 已有效启用 mTLS 的 profile 若在编辑态主动移除证书，则保存前必须关闭 `mtlsEnabled` 或重新补齐证书；不得保存成新的挂起态。
7. WebView mTLS 与原生 Session API mTLS 分别验证成功。
8. 不同 profile 使用不同证书连续切换，验证不会串证书。
9. 删除 profile 后，本地证书文件与口令均被清理。

## 8. 风险与回滚

1. 风险：证书复制或解析失败时，用户可能误认为是服务端 TLS 问题。
2. 风险：证书替换后若缓存未失效，可能继续使用旧凭据。
3. 风险：Settings 弹窗新增文件选择状态后，旋转/重建场景可能丢失临时选择态。
4. 缓解：
   - 在 Settings 中明确展示“已配置 / 缺失 / 待补齐”状态
   - 解析缓存按 `mtime + password fingerprint` 失效
   - 删除或替换证书时显式清缓存
   - 主动移除有效证书时不允许生成新的挂起态，避免用户无意中留下失效配置
5. 回滚：
   - 恢复 `TERMLINK_MTLS_* -> BuildConfig` 注入
   - 恢复 assets 证书加载路径
   - 移除 profile 级证书文件与口令读取逻辑

## 9. 发布计划

1. 完成 REQ / PLAN 文档入库。
2. Android 实现分批落地：
   - 数据模型与证书存储
   - Settings 交互与状态文案
   - WebView / Session API mTLS 运行时切换
   - 测试与真机验证
3. 真机验证至少覆盖：
   - 单 profile mTLS 成功连接
   - 多 profile 不同证书切换
4. 验证通过后再更新主线文档状态与变更记录。
5. 本需求完成批次必须同步更新所有 active Android mTLS 说明文档，不允许仅更新 REQ/PLAN 而保留旧 build-time mTLS 指引。
