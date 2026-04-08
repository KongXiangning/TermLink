---
title: Phase 0 — Codex 原生 Android 新入口基础设施
status: active
record_id: CR-20260409-phase0-codex-native-android-infrastructure
req_id: REQ-20260408-codex-native-android-migration
commit_ref: 600ead0
owner: @maintainer
last_updated: 2026-04-09
source_of_truth: product
related_code: [android/app/src/main/java/com/termlink/app/codex/, android/app/build.gradle, android/build.gradle, android/app/src/main/AndroidManifest.xml]
related_docs: [docs/product/plans/PLAN-20260408-codex-native-android-migration.md, docs/architecture/ARCH-20260408-codex-native-android-migration.md, docs/product/requirements/REQ-20260408-codex-native-android-migration.md]
---

# CR-20260409-phase0-codex-native-android-infrastructure

## 1. 变更意图（Compact Summary）

- 背景：按 PLAN-20260408-codex-native-android-migration Phase 0 计划，需建立独立原生 Codex 入口基础设施。
- 目标：实现 `CodexActivity` 新入口，含三层架构（transport → domain → UI）、WebSocket 连接、认证、重连、心跳、Compose UI 骨架。
- 本次边界：仅基础设施层，不实现完整聊天功能，不修改现有 `MainShellActivity + WebView Codex` 路径。

## 2. 实施内容（What changed）

### 新增文件

1. `android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt` — 线协议 DTO（session_info、codex_capabilities、codex_state、codex_response 等全部 gateway 消息类型）
2. `android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt` — ConnectionState 枚举、ChatMessage、CodexUiState、CodexLaunchParams 领域模型
3. `android/app/src/main/java/com/termlink/app/codex/network/CodexWebSocketClient.kt` — OkHttp WebSocket 封装，SharedFlow<WsEvent> 事件流
4. `android/app/src/main/java/com/termlink/app/codex/network/CodexConnectionManager.kt` — 连接生命周期管理（URL 构建、ticket 认证、指数退避重连、心跳）
5. `android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt` — ViewModel + StateFlow 状态管理，处理全部 WS 消息类型，支持流式消息组装
6. `android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt` — Compose UI：状态栏、消息列表、输入栏、空状态
7. `android/app/src/main/java/com/termlink/app/codex/ui/CodexTheme.kt` — Material3 暗色主题（复用现有 sessions_* 色板）
8. `android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt` — ComponentActivity 入口，Intent 参数/恢复状态/edge-to-edge

### 修改文件

1. `android/build.gradle` — ext 块新增 `composeCompilerVersion = '1.5.14'`
2. `android/app/build.gradle` — 新增 Compose buildFeatures/composeOptions、Compose BOM 2024.06.00、Material3、activity-compose、lifecycle-viewmodel-compose、lifecycle-runtime-compose、OkHttp 4.12.0
3. `android/app/src/main/AndroidManifest.xml` — 注册 CodexActivity（singleTask、adjustResize、不导出）
4. `android/app/src/main/res/values/strings.xml` — 新增 10 条 codex_native_* 字符串
5. `android/app/src/main/res/values-zh/strings.xml` — 新增对应中文翻译
6. `docs/product/plans/PLAN-20260408-codex-native-android-migration.md` — Phase 0 状态由 pending 改为 done

## 3. 影响范围（Files/Modules/Runtime）

- 模块：Android app 模块新增 `com.termlink.app.codex` 包
- 依赖：Compose BOM 2024.06.00、Material3、OkHttp 4.12.0（显式声明）
- 运行时：CodexActivity 已注册但无入口导航到达，不影响现有功能
- APK 体积：增加 Compose 运行时依赖，预计增量 ~2-3 MB

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- \
  android/app/build.gradle \
  android/build.gradle \
  android/app/src/main/AndroidManifest.xml \
  android/app/src/main/res/values/strings.xml \
  android/app/src/main/res/values-zh/strings.xml \
  docs/product/plans/PLAN-20260408-codex-native-android-migration.md

# 并删除新增目录
rm -rf android/app/src/main/java/com/termlink/app/codex/
```

## 5. 验证记录（Tests/Checks）

- 编译验证：`assembleDebug` 通过（JDK 21 + AGP 8.13.0 + Gradle 8.14.3）
- Kotlin 编译无 warning（使用 optStringOrNull 扩展函数替代 optString(key, null)）
- 新增代码不修改任何现有文件逻辑，仅增量添加

## 6. 后续修改入口（How to continue）

- Phase 1 实施从以下文件继续：
  - `CodexViewModel.kt` — 补充完整聊天消息处理
  - `CodexScreen.kt` — 补充消息渲染、流式输出
  - `CodexActivity.kt` — 补充冷启动/后台恢复/通知返回
  - `MainShellActivity.kt` — 新增导航到 CodexActivity 的入口

## 7. 技术决策记录

1. **org.json 而非 kotlinx.serialization**：与现有代码库一致，降低引入成本。后续可迁移。
2. **Compose BOM 2024.06.00**：Kotlin 1.9.24 + Compose Compiler 1.5.14 的稳定兼容组合。
3. **手动 ViewModel 实例化**：Phase 0 不引入 Hilt/DI 框架，保持简单。
4. **ticket 认证**：复用 terminal_client.js 的 /api/ws-ticket 一次性票据机制。
5. **指数退避重连**：1s 起步，最大 30s，最多 20 次。心跳间隔 25s。
