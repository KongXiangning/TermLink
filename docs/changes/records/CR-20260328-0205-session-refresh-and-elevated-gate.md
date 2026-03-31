---
title: 会话刷新局部失败口径与 elevated 门禁收口
status: archived
record_id: CR-20260328-0205-session-refresh-and-elevated-gate
req_id: REQ-20260326-android-profile-mtls-runtime-certificate
commit_ref: f43ff6f
owner: @maintainer
last_updated: 2026-03-28
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt, android/app/src/androidTest/java/com/termlink/app/ui/sessions/SessionsFragmentStatusTest.kt, src/config/securityGates.js, tests/privilegeConfig.securityGates.test.js]
related_docs: [docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md, docs/product/requirements/REQ-20260326-android-profile-mtls-runtime-certificate.md]
---

# CR-20260328-0205-session-refresh-and-elevated-gate

## 1. 变更意图（Compact Summary）

- 背景：真机回归中暴露出两个误导性现象：Sessions 页在局部 profile 刷新失败时仍显示整页 stale banner；服务端请求 `elevated` 但进程未实际具备管理员权限时，Android 端仍收到 `privilegeLevel=ELEVATED` 并弹出高权限警告。
- 目标：让 Sessions 页区分“局部 profile 失败”和“整页仅回退缓存”，并让 elevated 模式与真实进程权限保持一致。
- 本次边界：只收口 Android 会话列表状态呈现与服务端 elevated 启动门禁，不扩展新的权限模型或会话 API 字段。

## 2. 实施内容（What changed）

1. 调整 `SessionsFragment.refreshSessions()`：当远端拉取结果同时包含成功 group 和失败 group 时，直接渲染最新远端结果并清除全局 stale banner，仅在失败 profile 卡片内保留局部错误说明。
2. 更新 `SessionsFragmentStatusTest`：把“部分 profile 成功、部分失败”的期望改为“无全局 stale banner，但局部 group error 仍可见”。
3. 在 `securityGates` 新增服务进程权限检测：Windows 通过管理员角色检测，类 Unix 通过 `uid == 0` 检测；若 `elevated` 运行时不满足系统权限条件，则启动期拒绝通过安全门禁。
4. 补充 `tests/privilegeConfig.securityGates.test.js` 回归：覆盖“无管理员权限时 elevated 被拒绝”，并显式为其余门禁测试注入 `hasRequiredPrivileges=true`，避免测试宿主权限影响结果。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`SessionsFragment.kt`、`SessionsFragmentStatusTest.kt`、`securityGates.js`、`privilegeConfig.securityGates.test.js`
- 模块：Android Sessions UI、服务端 elevated security gate
- 运行时行为：
  - 部分 profile 刷新失败不再把整页标成 stale cache fallback
  - 非管理员/root 进程无法以 `TERMLINK_PRIVILEGE_MODE=elevated` 启动

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
git checkout <commit_ref>^ -- src/config/securityGates.js
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`node --test tests/privilegeConfig.securityGates.test.js`
- 结果：通过，`9/9`
- 校验命令：`JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 ./gradlew.bat :app:testDebugUnitTest --tests "com.termlink.app.ui.sessions.SessionStatusBannerResolverTest"`
- 结果：通过
- 校验命令：`JAVA_HOME=D:\ProgramCode\openjdk\jdk-21 ./gradlew.bat :app:connectedDebugAndroidTest "-Pandroid.testInstrumentationRunnerArguments.class=com.termlink.app.ui.sessions.SessionsFragmentStatusTest"`
- 结果：真机 `MQS7N19402011743 / Android 10` 上失败；现象包括 `Network request failed`、缓存刷新等待超时，属于现有测试夹具/设备网络路径问题，未形成这次改动的功能性否定结论

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：`android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`、`src/config/securityGates.js`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. Windows 管理员权限检测依赖本机 `powershell.exe`；若部署环境裁剪了 PowerShell，可考虑后续改为更底层的本地权限探测实现。
2. `SessionsFragmentStatusTest` 当前在真机上存在既有不稳定性，本次虽然同步更新了断言口径，但仍需后续单独收口测试夹具网络路径。
