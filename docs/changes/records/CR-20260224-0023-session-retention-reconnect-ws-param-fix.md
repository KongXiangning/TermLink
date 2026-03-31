---
title: 服务端会话长时保留与断联续接 - WS 参数语义修复与关键验收
status: archived
record_id: CR-20260224-0023-session-retention-reconnect-ws-param-fix
req_id: REQ-20260222-session-retention-reconnect
commit_ref: f4ce64f
owner: @maintainer
last_updated: 2026-02-24
source_of_truth: code
related_code: [src/ws/terminalGateway.js, src/routes/sessions.js, tests/terminalGateway.sessionid.test.js, tests/routes.sessions.capacity.test.js, package.json]
related_docs: [docs/product/requirements/REQ-20260222-session-retention-reconnect.md, docs/changes/records/INDEX.md, docs/changes/CHANGELOG_PROJECT.md]
---

# CR-20260224-0023-session-retention-reconnect-ws-param-fix

## 1. 变更意图（Compact Summary）

- 背景：`patch/session-retention-reconnect-phase1` 存在 `?sessionId=` 被误判为“未传 sessionId”并静默新建会话的问题，偏离 REQ 行为契约。
- 目标：修复 WS 参数语义回归，并补齐关键自动化测试覆盖（WS 参数路径 + HTTP 容量错误映射）。
- 本次边界：保持 REQ 状态为 `planned`，不做第 8 节全量测试自动化。

## 2. 实施内容（What changed）

1. `src/ws/terminalGateway.js` 改为基于 `url.searchParams.has('sessionId')` 判断是否走重连流程。
2. 新增 `tests/terminalGateway.sessionid.test.js`，覆盖 4 个 WS 关键场景：
   - 未传 `sessionId` 新建默认会话
   - 传有效 `sessionId` 复用会话
   - 传空 `sessionId` 返回 `4404`
   - 传不存在 `sessionId` 返回 `4404`
3. 新增 `tests/routes.sessions.capacity.test.js`，覆盖 `POST /sessions` 的容量错误映射（`409 + SESSION_CAPACITY_EXCEEDED`）及兜底 `500` 路径。
4. 更新 `package.json` 测试脚本为 `node --test`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `src/ws/terminalGateway.js`
  - `src/routes/sessions.js`
  - `tests/terminalGateway.sessionid.test.js`
  - `tests/routes.sessions.capacity.test.js`
  - `package.json`
- 模块：WebSocket 接入层、会话创建路由错误映射、自动化回归测试入口。
- 运行时行为：
  - `ws?...&sessionId=` 现在返回 `4404`，不再静默新建会话。
  - `ws?...&sessionId=<invalid>` 维持 `4404`。
  - `POST /api/sessions` 容量异常保持 `409 + SESSION_CAPACITY_EXCEEDED`。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert f4ce64f

# 方案 B：仅恢复关键实现与测试
git checkout f4ce64f^ -- src/ws/terminalGateway.js
git checkout f4ce64f^ -- tests/terminalGateway.sessionid.test.js
git checkout f4ce64f^ -- tests/routes.sessions.capacity.test.js
git checkout f4ce64f^ -- package.json
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
  - `node --check src/ws/terminalGateway.js`
  - `node --check src/routes/sessions.js`
  - `node --check src/services/sessionManager.js`
  - `npm test`
- 结果：通过（6 个测试全部通过）。

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
  - `src/ws/terminalGateway.js`
  - `src/services/sessionManager.js`
  - `docs/product/requirements/REQ-20260222-session-retention-reconnect.md`
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. 客户端若依赖“空 sessionId 自动新建”旧行为，修复后会收到 `4404`。
2. 当前仅补关键回归测试，REQ 第 8 节全量场景仍待后续补齐。
