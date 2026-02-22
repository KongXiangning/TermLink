---
title: TermLink 项目变更日志
status: active
owner: @maintainer
last_updated: 2026-02-22
source_of_truth: product
related_code: []
related_docs: [docs/README.md]
---

# CHANGELOG_PROJECT

## 2026-02-22

### docs

1. 建立 `docs/` 统一文档分层（product/architecture/guides/ops/changes/archive）。
2. 合并 `PRD.md` 与 `PRDV2.md` 到 `docs/product/PRODUCT_REQUIREMENTS.md`。
3. 将 Android/部署/运维/IME 追踪文档迁移到统一路径并补充 front matter。
4. 新增需求池与需求模板：`REQUIREMENTS_BACKLOG.md` + `REQ-TEMPLATE.md`。
5. 历史计划迁移到 `docs/archive/` 并标记不再作为主线规范。
6. 根目录历史入口文件改为跳转说明页，保持兼容链接。
7. 新增需求卡 `REQ-20260222-session-retention-reconnect`，定义服务端会话长时保留与断联续接的实施规范。
8. 建立 `docs/changes/records/` 固化变更记录机制（CR），用于 compact 风格的回放、恢复与后续修改。
9. 新增 `docs-requirement-sync` skill，并引入 REQ + CR 的门禁校验脚本。
10. 新增需求卡 `REQ-20260222-server-admin-privilege-mode`，定义服务端管理员权限模式的安全边界、启用条件、审计与回滚要求。

## 2026-02-22 (records)

### governance

1. 变更记录以 `docs/changes/records/INDEX.md` 为主索引。
2. 每次实施/提交必须新增一条 CR 文件，并强制关联 `req_id + commit_ref`。
3. `CHANGELOG_PROJECT.md` 定位为摘要层，详细恢复信息以 CR 正文为准。
