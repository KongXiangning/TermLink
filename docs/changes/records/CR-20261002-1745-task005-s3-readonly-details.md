---
title: TASK-005 S3 Android 历史只读详情
status: draft
record_id: CR-20261002-1745-task005-s3-readonly-details
req_id: none
commit_ref: TBD
owner: "@maintainer"
last_updated: 2026-10-02
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/codex/data/CodexHistoryDetail.kt, android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt, android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt, android/app/src/main/java/com/termlink/app/codex/domain/CodexModels.kt, android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt, android/app/src/test/java/com/termlink/app/codex/data/CodexHistoryWireTest.kt, android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt]
related_docs: [docs/codex/codex-history-product-contract.md, docs/workflow/CONTRACTS.md, docs/workflow/DECISIONS.md]
---

# CR-20261002-1745-task005-s3-readonly-details

## 1. 变更意图

按 TASK-005 已采用计划 S3 接入只读详情；采用计划记录为 `.workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json`。没有关联 REQ Markdown，不伪造 REQ ID。本记录保持 draft/TBD，不办理审查、步骤结束或 Git 操作。

## 2. 实施内容

1. 从既有 SQLite 缓存字段解码 detail refs 与 refsTruncated；按 stable item / operation alias / batch member 关联详情入口，不凭正文匹配，也不替换 healthy IPC 消息内容。
2. 复用 Node 已有 `conversation_history_detail_request/response`，仅发送 conversation/ref/request/client generation/opaque cursor/maxBytes。没有新增 Rust 请求或 Node 接口。
3. 串行按需读取 48 KiB UTF-8 分块；验证引用快照、严格整数偏移、大小、服务器 generation、客户端 generation、请求 ID、cursor 进展和最终 SHA-256；拒绝 unpaired surrogate、错误字节偏移、重复 cursor、缺失终态和不完整正文。未验证内容不展示或复制。
4. 独立只读详情对话框，展示 loading/error/partial、文本选择及复制。单详情最多 8 MiB，单次下载 120 秒、单块最多等待 35 秒；不可用或超限明确报错。系统剪贴板拒绝复制时给出提示。
5. 选择 generation/profile/conversation 变化、dismiss、重试与断线隔离在途响应；缓存 ref 更新后清除已显示详情。详情正文只保存在内存，不改 SQLite schema、history ACK、older/append、follower lifecycle 或 IPC authority。

## 3. 影响范围

五个 Android 生产文件、两个既有测试文件及新增 `CodexHistoryDetail.kt`。Node、Rust、vNext 软件、原有证据 blob 均未修改。只通过 assistance 正常记录本轮事实与更新管理视图。

## 4. 回滚方案

本批未提交，仅按本 CR 文件范围撤销本批 diff，保留其他工作。提交后可 `git revert <本批实际 commit_ref>`。Android 未修改 schema、未清理缓存；既有兼容 APK 可 `adb -s MQS7N19402011743 install -r <兼容 APK>`。本轮未另建安装前备份；上一批私有 logs 中的兼容 APK 备份仍保留。

## 5. 验证记录

- 基线 HEAD `bc7ff0a715c193bc5063b46c5ce035a8656ec822` 加本批 dirty worktree，不将未提交文件表示为 Git commit。
- `node --test tests/codexOwnerSurfaceTracker.test.js tests/terminalGateway.codexIpc.test.js tests/codexHistoryProductFlow.test.js`：162 tests，162 passed，0 failed/skipped/cancelled，exit 0。包含既有真实 Rust 产品流与 Gateway 授权/详情测试，不是新一轮真实发布。
- JDK21 `:app:testDebugUnitTest --tests 'com.termlink.app.codex.CodexViewModel*' --tests com.termlink.app.codex.data.CodexHistoryWireTest --tests com.termlink.app.codex.data.CodexIpcWireModelTest --tests com.termlink.app.codex.data.CodexHistoryPageHashTest --tests com.termlink.app.codex.data.CodexHistoryRangeStorageTest :app:assembleDebug`：286 tests，0 failures/errors/skipped，测试任务实际执行，BUILD SUCCESSFUL。新增 7 项聚焦回归；复用 Node 生成的 detail delta fixture 验证真实引用对应正文哈希，不另造 DTO 协议。
- 首次 JVM/build 尝试 compileDebugKotlin 失败（测试 Activity 回调默认值、isSupported 调用方式、发送 JSONObject/String），已修正。修正后首轮 247 tests/构建通过，再在 UI 整理后执行上述 286 tests/构建通过；保留失败，不将失败尝试改为 PASS。最后一次源码调整仅将 helper 移到原 alias KDoc 之前，不改变函数行为。
- `git diff --check`：通过；测试文件原有混合 CRLF/LF 已保留，未改行未被整文件格式化。
- 真机 MQS7N19402011743：安装最终 debug APK 成功（SHA-256 `a3d60ef2e4506950ca44f7b5ec1eaf777f32dbccda13532416e1c5eb9da9505f`），没有清理本地数据。3010 本地服务原未启动，按技能启动后 `/api/health` OK；恢复 adb reverse tcp:3010。服务及转发保持运行。
- 同设备 A=`01a0ad3b-3728-72e2-b5a1-f99f51834804` → B=`01a0382b-e61f-79a1-9c10-b508c52f35f7` → A：通过已有任务历史入口切换，没有创建、发送、分支或归档任务。A 显示 Windows 安装验证正文，B 最终安装轮次捕获为加载中，较早轮次显示服务端恢复失败；返回 A 恢复 A 正文，没有观察到 B 状态污染 A。原始 XML：`logs/task005-s3-final-a1.xml`、`logs/task005-s3-final-b.xml`、`logs/task005-s3-final-a2.xml`，较早失败为 `logs/task005-s3-b.xml`；不能将 B 加载中/恢复失败记为双会话健康 IPC 或完整恢复 PASS。
- 本轮真机选中的 A/B 未验证可点击的产品详情下载/复制；没有人为注入详情、手工写 SQL 或伪造真机 DTO。迟到响应和分块完整性的当前证据为 JVM/Node 定向测试，不是真机故障注入证据。

## 6. 后续修改入口

审查本轮 Android S3 实现及上述覆盖限制。仍需基于真实已发布的 product detail refs 验证真机详情下载、复制、引用变化和在途 A→B→A；S4 的真实 older/append/缓存重开与完整纵向 E2E 尚未执行。本轮没有结束 S3。

## 7. 风险与注意事项

- healthy IPC 始终是正文/operation/current turn/runtime 唯一实时权威；本轮只增加静态详情 UI lane。
- partial、不可用、truncated 不等于完整历史。8 MiB/120 秒限制不是服务端详情资源完整性声明。
- CR 沿用无 REQ 的 draft/none/TBD 事实；既有 strict validator 不接受 none 的格式限制仍未解决。本轮未伪造 active/commit_ref。
- 两条旧管理关联问题保留，不把执行记录保存当作审查通过或产品发布完成。
