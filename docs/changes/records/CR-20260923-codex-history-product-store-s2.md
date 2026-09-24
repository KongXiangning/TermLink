---
title: Node Codex 产品历史 SQLite Store - 变更记录
status: draft
record_id: CR-20260923-codex-history-product-store-s2
req_id: none
commit_ref: TBD
owner: @maintainer
last_updated: 2026-09-23
source_of_truth: code
related_code: [src/services/codexHistoryProductStore.js, tests/codexHistoryProductFlow.test.js]
related_docs: [docs/codex/codex-history-product-contract.md, docs/codex/codex-rollout-collector-architecture.md, docs/workflow/task-basis/TASK_BASIS-003.md]
---

# CR-20260923-codex-history-product-store-s2

## 1. 变更意图（Compact Summary）

- 背景：Node 还没有面向 Codex 产品历史的关系型 schema、durable staging 与单一 canonical 事务存储。
- 目标：实现 S2 的 SQLite Store 迁移、durable stage、canonical 本地事务、重复交付幂等与关闭/重开读取，并冻结当前 product DTO 与路径策略。
- 本次边界：Store 原语不连接 Rust complete / ACK、不连接 history Gateway、不改 Android、健康 IPC 或产品发布链。

## 2. 实施内容（What changed）

1. 添加 `sql.js@1.14.2`，以 SQLite WebAssembly 实现避免 Node 18 原生扩展和 install-script 依赖。
2. 增加 schema v1、临时数据库快照 fsync/rename、进程内串行写事务、durable staging、canonical 替换和 exact retry receipt。
3. 将 event 路径、cwd、命令和 artifact 路径原值保存在 item payload；分析 checkpoint 与 delivery/source metadata 留在内部表和方法中。
4. 新增 contract 文档，区分 S2 Store 机制和后续 Rust complete/ACK、Gateway、App DTO 接线。

## 3. 影响范围（Files/Modules/Runtime）

- `src/services/codexHistoryProductStore.js`：Node SQLite schema migration、staging、原子本地事务与 canonical read。
- `tests/codexHistoryProductFlow.test.js`：持久化、幂等、真实事件路径保留、重开和事务失败回滚断言。
- `docs/codex/codex-history-product-contract.md`：当前 Node product DTO、路径与内部元数据边界。
- `package.json` / `package-lock.json`：纯 WebAssembly SQLite 依赖，兼容 `--ignore-scripts` 安装方式。

## 4. 回滚方案（命令级）

```powershell
# 恢复承载本变更的提交
git revert <commit_ref>

# 如只需恢复单文件，按该提交的实际文件列表逐一恢复
git restore --source=<commit_ref>^ -- src/services/codexHistoryProductStore.js tests/codexHistoryProductFlow.test.js docs/codex/codex-history-product-contract.md package.json package-lock.json
```

已有产品数据库不得因回滚代码而被删除或覆盖；如已用于真实数据，应先由独立迁移/回退方案处理 schema compatibility。

## 5. 验证记录（Tests/Checks）

- 校验命令：`node --test --test-name-pattern=product-history-store tests/codexHistoryProductFlow.test.js`
- 结果：通过，`2 passed, 0 failed`。精确筛选覆盖 durable stage 与重开、相同 batch 重放幂等、事件路径/CWD/命令/artifact 原值读取，以及故意触发 SQLite 唯一键错误后旧 canonical/coverage/checkpoint 仍可重开读取。

## 6. 后续修改入口（How to continue）

- S3 从 `readConversation()` 只读接入既有已鉴权 conversation history Gateway，并验证 App DTO 与 payload 大小边界。
- S4 才将真实 Rust complete/coverage/checkpoint 校验、ACK 与产品 DB canonical publication 接入单例采集链。
- S5 验证发布 staging 包含 SQL.js wasm 运行资产并在 `--ignore-scripts` 模式可加载。

## 7. 风险与注意事项

1. SQL.js 在内存中物化 SQLite 文件；单次提交会序列化当前数据库快照，库增大后的内存与写放大需在产品化容量阶段评估。
2. Store 本地事务测试不证明 Rust complete gate 已连接，也不证明真实 Node→Rust→DB→Gateway 纵向流已交付。
3. `commit_ref` 在提交前保持 `TBD`；提交后按仓库 CR 规则更新为真实 commit hash 并将记录转为 `active`。
