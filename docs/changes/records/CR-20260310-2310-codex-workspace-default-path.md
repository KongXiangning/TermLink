---
title: Codex 能力矩阵驱动主线需求（对话体验优先 MVP + 下一阶段） - 变更记录
status: archived
record_id: CR-20260310-2310-codex-workspace-default-path
req_id: REQ-20260309-codex-capability-mvp
commit_ref: a75d336
owner: @maintainer
last_updated: 2026-03-11
source_of_truth: code
related_code: [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/changes/records/INDEX.md]
---

# CR-20260310-2310-codex-workspace-default-path

## 1. 变更意图（Compact Summary）

- 背景：Android 端创建 Codex 会话时要求手动输入 `Codex Workspace Path`，真机复测 Phase 1 时重复输入当前仓库路径会拖慢验证。
- 目标：为 Codex 会话创建弹窗提供默认工作区路径，减少测试时的手输成本，同时不改服务端协议和必填校验。
- 本次边界：仅调整 Android 会话创建弹窗的默认值逻辑，不修改 REST/WS `cwd` 语义，不放宽 Codex 会话 `cwd` 校验。

## 2. 实施内容（What changed）

1. 在 `SessionsFragment.showCreateDialog()` 中新增建议路径解析逻辑。
2. 当当前选择已经是 Codex 会话且带有 `cwd` 时，创建弹窗继续优先复用当前 `cwd`。
3. 当没有可复用的当前 `cwd` 时，Codex 模式默认预填当前仓库路径 `E:\coding\TermLink`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
- 模块：
  - Android Sessions 创建会话弹窗
- 运行时行为：
  - 切到 Codex 模式时，`Codex Workspace Path` 默认不再为空
  - 用户已输入的自定义路径不被自动覆盖
  - 现有 `cwd` 必填校验保持不变

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 Android 会话创建默认路径逻辑
git checkout <commit_ref>^ -- android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `$env:JAVA_HOME='D:\ProgramCode\openjdk\jdk-21'; .\gradlew.bat :app:compileDebugKotlin`
- 结果：
  - 通过。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt`
  - `android/app/src/main/java/com/termlink/app/MainShellActivity.kt`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前默认路径是测试环境下的固定仓库路径，若服务端部署目录变化，需要同步调整或改为从服务端配置下发。
2. 这次改动只减少手工输入，不会修复手机端复用失效 `sessionId` 导致的 `4404 Session not found or expired` 问题。
