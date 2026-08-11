---
title: P0-B.4R corrected snapshot and live projection reimplementation
status: active
record_id: CR-20260811-1458-codex-b4r-corrected-reimplementation
req_id: REQ-20260516-codex-mobile-realtime-sync
commit_ref: baca633
owner: @maintainer
last_updated: 2026-08-11
source_of_truth: code
related_code: [src/ws/terminalGateway.js, src/services/codexHistorySnapshotStore.js, src/services/codexHistorySyncService.js, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, tests/terminalGateway.codexIpc.test.js]
related_docs: [docs/workflow/CURRENT_TASK.md, docs/codex/codex-history-tail-first-gap-recovery-implementation-plan.md, docs/codex/codex-android-history-cache-media-recovery-plan.md]
---

# CR-20260811-1458-codex-b4r-corrected-reimplementation

## 1. 变更意图（Compact Summary）

- 背景：原始 P0-B.4R 在 P0-B.3 之后引入了静态历史分段，同时保留了未经充分证明的逐 revision eager projection；大任务压力下出现服务端 event-loop / RSS / heap 风险和实时延迟疑问。
- 目标：从 P0-B.3 基线重新实施可回滚的 B4R，使历史快照可缓存、按既有 segment lane 传输，并保留 live/control/generation 边界。
- 本次边界：只修正 B4R snapshot/cache/Gateway derived projection 接线；不修改 IPC feed/thread stream/Owner authority，不引入 3bd verification sampler、全量 fingerprint 或默认 eager fast-path，不提前实施 B5/P0-C/P1 freshness。

## 2. 实施内容（What changed）

1. Gateway 的 B4R snapshot 请求先读取已校验的服务端快照；命中时直接复用 canonical items 分段传输，不再次请求 Codex `thread/read`。
2. 缓存读取失败回源 Codex；快照持久化失败只记录诊断，不使当前已经排入的 segment transfer 失败。
3. Android projection 移除每个 IPC revision 的默认 eager redacted projection 与完整 projection fingerprint stringify；保留 latest-only queue、deadline fallback、scheduler priority 和 active stale revision fence。
4. 新增 cache hit、cache read/write failure 回归，覆盖当前传输完成、Codex 请求次数和 selection/generation 约束。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `src/ws/terminalGateway.js`
  - `tests/terminalGateway.codexIpc.test.js`
  - 本轮 B4R 既有 snapshot/baseline/sync/scheduler/projector 与 Android history wire/cache 文件（见 branch parent commits）
- 模块：服务端静态 history snapshot cache、history segment transport、Android history transaction、Gateway Android derived surface projection。
- 运行时行为：显式 `TERMLINK_HISTORY_SNAPSHOT_SEGMENTS=1` 且客户端能力协商成功时，完整服务端快照可以 cache-first；未命中或缓存异常回到 Codex source；healthy IPC surface 仍是实时权威。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚本批 corrected implementation commit
git revert <commit_ref>

# 方案 B：仅关闭 B4R capability，回到 B3 的 v2/range 兼容路径
# Windows 服务环境中移除或设置为 0：
# TERMLINK_HISTORY_SNAPSHOT_SEGMENTS=0
# 然后重启服务；不降级 APK、不删除数据库或 snapshot 文件。
```

## 5. 验证记录（Tests/Checks）

- Node：`node --test --test-concurrency=1 --test-reporter=tap tests/codexHistoryBaselineProvider.test.js tests/codexHistorySnapshotStore.test.js tests/codexHistorySyncService.test.js tests/codexWsSnapshotScheduler.test.js tests/codexMobileSurfaceProjector.test.js tests/terminalGateway.codexIpc.test.js`，`190/190` 通过。
- Android：JDK 21 `android\gradlew.bat :app:testDebugUnitTest` 与 `android\gradlew.bat :app:assembleDebug`，均 `BUILD SUCCESSFUL`。
- 静态：`node --check src/ws/terminalGateway.js`、相关源码检查和 `git diff --check --no-ext-diff --no-textconv`。
- 待验收：约 3900 item 真机长任务的 RSS/heap/event-loop/live delay、cache-first reopen、live/control 优先、A→B→A 迟到 page generation 隔离；未以自动化通过宣称 B4R 已完成。

## 6. 后续修改入口（How to continue）

- 先在本分支完成真实大历史和 Android 真机门禁，再决定是否合并到 `main`。
- 下一产品阶段为 P0-B.5；P0-C/P1 freshness 不得从本 CR 顺手提前实现。
- 若需修改 frozen IPC/feed/Owner 文件，必须先重新 lock scope 并同步 CONTRACTS/DECISIONS。

## 7. 风险与注意事项

1. 服务端 snapshot 是静态历史优化，不是实时 authority；没有 freshness probe 时不能把 cache hit 解释为最新状态证明。
2. 未验证前不得把 `TERMLINK_HISTORY_SNAPSHOT_SEGMENTS` 默认开启到生产，也不得用旧 APK 或删除数据库规避回归。
3. 当前需求同步脚本对既有 REQ 的严格校验存在历史元数据/path 解析失败；本批没有修改该无关治理输入，已在 CURRENT_TASK 执行记录标记为 no-block。
