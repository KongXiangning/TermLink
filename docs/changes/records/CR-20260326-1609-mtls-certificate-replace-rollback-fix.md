---
title: Android profile mTLS Phase 2 certificate replace rollback fix
status: draft
record_id: CR-20260326-1609-mtls-certificate-replace-rollback-fix
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: TBD
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/data/MtlsCertificateStore.kt, android/app/src/androidTest/java/com/termlink/app/data/MtlsCertificateStoreTest.kt]
related_docs: [docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md, docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/changes/records/INDEX.md]
---

# CR-20260326-1609-mtls-certificate-replace-rollback-fix

## 1. Compact Summary

- 背景：此前 `MtlsCertificateStore.importCertificate()` 在替换已有证书时会先删旧 `.p12`，再尝试把新文件改名到目标路径；若最终替换失败，旧证书已经丢失，profile 会落入“JSON 仍显示已配置但本地证书已丢”的损坏状态。
- 目标：将证书替换修复为“覆盖式替换优先，失败则回滚旧副本”，保证导入失败时旧证书仍保留。
- 本批覆盖计划项：`8.2 第二步：Settings 弹窗接入证书选择、口令输入与状态提示` 的 follow-up 修复。

## 2. What Changed

1. 重写 `MtlsCertificateStore.importCertificate()` 的替换路径：
   - 先复制到同目录临时文件
   - 有旧证书时优先走覆盖式替换
   - 覆盖失败时退化为“先备份旧证书、再写新证书、失败则恢复旧证书”
2. 只有最终导入成功后才清 `MtlsCredentialRepository`；失败时保留旧证书与旧缓存语义。
3. 扩充 `MtlsCertificateStoreTest`：
   - 覆盖已有旧证书时的替换成功
   - 覆盖已有旧证书时的替换失败回滚

## 3. Impact

- 文件：
  - `android/app/src/main/java/com/termlink/app/data/MtlsCertificateStore.kt`
  - `android/app/src/androidTest/java/com/termlink/app/data/MtlsCertificateStoreTest.kt`
- 模块：
  - Android mTLS 本地证书存储层
  - Settings 替换证书失败保护
- 运行时行为：
  - 替换已有证书失败时，不再把旧 `.p12` 提前删除
  - Settings 保存替换证书失败后，旧本地证书仍可继续作为当前有效材料

## 4. Rollback

```bash
# Option A: revert the implementing commit
git revert <commit_ref>

# Option B: restore only the replace-rollback fix files
git checkout <commit_ref>^ -- \
  android/app/src/main/java/com/termlink/app/data/MtlsCertificateStore.kt \
  android/app/src/androidTest/java/com/termlink/app/data/MtlsCertificateStoreTest.kt \
  docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md \
  docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md \
  docs/changes/records/INDEX.md
```

## 5. Tests / Checks

- `rg -n "targetFile\\.delete\\(|renameTo\\(targetFile\\)" android/app/src/main/java/com/termlink/app/data/MtlsCertificateStore.kt`
- `cd android && .\\gradlew :app:connectedDebugAndroidTest --tests com.termlink.app.data.MtlsCertificateStoreTest`
- `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md -Strict`

## 6. How To Continue

- 若后续继续收口 `8.2` 保存语义，应继续检查 BASIC 密码与 mTLS 材料是否还存在“部分提交”问题。
- 替代记录若存在，请填写：`CR-YYYYMMDD-HHMM-<slug>`

## 7. Risks / Notes

1. 本批只修复“替换失败时旧证书丢失”问题，不处理 Settings 保存链路的其它事务性问题。
2. 在底层文件系统既不支持覆盖式替换、又无法完成备份恢复的极端场景下，函数仍只会返回 `false`，但该极端路径未在当前设备环境实际验证。
