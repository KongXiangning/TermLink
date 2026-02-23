---
title: 会话保留实现门禁补齐 - 变更记录
status: draft
record_id: CR-20260223-1959-session-retention-impl-gate
req_id: REQ-20260222-session-retention-reconnect
commit_ref: TBD
owner: @maintainer
last_updated: 2026-02-23
source_of_truth: code
related_code: [src/services/sessionManager.js, src/ws/terminalGateway.js, src/routes/sessions.js, .env.example]
related_docs: [docs/product/requirements/REQ-20260222-session-retention-reconnect.md, docs/changes/records/INDEX.md]
---

# CR-20260223-1959-session-retention-impl-gate

## 1. 变更意图（Compact Summary）

- 背景：会话保留需求已从文档进入代码实现阶段，但当前缺少本次实现对应的 CR 记录。
- 目标：修复会话重连边界与配置健壮性问题，并补齐 `req_id + commit_ref` 可追踪骨架。
- 本次边界：本次不处理“HTTP 新建会话容量打满的错误码映射”。

## 2. 实施内容（What changed）

1. 新增实现阶段变更记录 `CR-20260223-1959-session-retention-impl-gate` 并登记到索引。
2. 修复 WS 连接判定：`sessionId` 只要“传了参数”即按重连流程处理，`?sessionId=` 不再触发静默新建会话。
3. 修复环境变量健壮性：会话 TTL/上限/清理周期只接受 `>=1` 的整数，非法值回退默认配置。
4. 将本次实现涉及代码路径写入 `related_code`，并关联会话需求 REQ。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `src/ws/terminalGateway.js`
  - `src/services/sessionManager.js`
  - `docs/changes/records/CR-20260223-1959-session-retention-impl-gate.md`
  - `docs/changes/records/INDEX.md`
- 模块：需求治理与变更可追溯链路。
- 运行时行为：
  - `?sessionId=` 会返回 `4404`，不再被视为“未传 sessionId”而新建默认会话。
  - 非法配置（如 `SESSION_MAX_COUNT=0`、`SESSION_CLEANUP_INTERVAL_MS=0`）将回退到默认值。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交（提交后替换真实 commit_ref）
git revert <commit_ref>

# 方案 B：仅恢复本次 CR 文件与索引（提交后替换真实 commit_ref）
git checkout <commit_ref>^ -- docs/changes/records/CR-20260223-1959-session-retention-impl-gate.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：按 `docs-requirement-sync` skill 执行 REQ/CR/doc-sync 等价检查（当前环境无 PowerShell，改为手工等价校验）。
- 结果：通过（门禁项可检索，待提交后补齐 `commit_ref` 并转 `active`）。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `docs/product/requirements/REQ-20260222-session-retention-reconnect.md`
  - `src/services/sessionManager.js`
  - `src/ws/terminalGateway.js`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 当前记录为 `draft`，必须在对应代码提交后补真实 `commit_ref` 才能满足 `active` 门禁。
2. 若后续实现拆分为多次提交，应新增后续 CR，而不是覆盖本记录。
