---
title: Android 前台 idle 2 分钟恢复系统息屏
status: active
record_id: CR-20260224-2145-screen-idle-timeout-restore
req_id: REQ-20260224-screen-keep-awake
commit_ref: 46ca7ef
owner: @maintainer
last_updated: 2026-02-24
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/requirements/REQ-20260224-screen-keep-awake.md, docs/changes/records/INDEX.md, docs/changes/CHANGELOG_PROJECT.md]
---

# CR-20260224-2145-screen-idle-timeout-restore

## 1. 变更意图（Compact Summary）

- 背景：当前 Android 客户端采用 WakeLock 方式保持亮屏，且“无操作 2 分钟回落”语义覆盖不完整。
- 目标：改为前台统一 idle 控制，用户无操作 2 分钟后恢复系统息屏，切后台立即恢复。
- 本次边界：仅改 `MainShellActivity` 内部实现，不改服务端协议与数据模型。

## 2. 实施内容（What changed）

1. 移除 WakeLock 依赖，改用 `window.addFlags/clearFlags(FLAG_KEEP_SCREEN_ON)`。
2. 新增 idle 控制器（handler + runnable + 2分钟延迟）和前台可见标识。
3. 新增 `onUserInteraction()` 统一重置 idle 计时，覆盖触摸/按键/IME 输入。
4. 在 `onResume/onPause/onDestroy` 中收敛常亮与计时生命周期管理。
5. 更新 REQ 文档语义为“前台无操作 2 分钟恢复系统息屏”并同步主线索引文档。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `docs/product/requirements/REQ-20260224-screen-keep-awake.md`
  - `docs/product/REQUIREMENTS_BACKLOG.md`
  - `docs/product/PRODUCT_REQUIREMENTS.md`
  - `docs/architecture/ROADMAP.md`
  - `docs/changes/CHANGELOG_PROJECT.md`
  - `docs/changes/records/INDEX.md`
- 模块：Android MainShellActivity 前台亮屏控制、需求与变更记录文档链路。
- 运行时行为：前台保持亮屏；无操作 2 分钟自动回落；后台立即恢复系统息屏。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/MainShellActivity.kt
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260224-screen-keep-awake.md
git checkout <commit_ref>^ -- docs/changes/CHANGELOG_PROJECT.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260224-screen-keep-awake.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md -Strict`
  - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260224-screen-keep-awake`
  - `set JAVA_HOME=D:/ProgramCode/openjdk/jdk-21 && ./gradlew.bat :app:compileDebugKotlin`
  - `set JAVA_HOME=D:/ProgramCode/openjdk/jdk-21 && ./gradlew.bat :app:assembleDebug`
- 结果：
  - REQ 校验通过。
  - CR 校验通过。
  - 文档同步校验通过。
  - `:app:compileDebugKotlin` 通过（`JAVA_HOME=D:/ProgramCode/openjdk/jdk-21`）。
  - `:app:assembleDebug` 通过（`JAVA_HOME=D:/ProgramCode/openjdk/jdk-21`）。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
  - `docs/product/requirements/REQ-20260224-screen-keep-awake.md`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. `onUserInteraction` 需覆盖真实交互路径，避免未覆盖事件导致误判 idle。
2. 真机厂商定制系统在息屏策略上可能有差异，需要设备侧回归确认。
