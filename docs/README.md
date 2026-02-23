---
title: TermLink 文档中心
status: active
owner: @maintainer
last_updated: 2026-02-23
source_of_truth: product
related_code: []
related_docs: [docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/CURRENT_STATE.md, docs/changes/records/INDEX.md]
---

# TermLink 文档中心

## 1. 维护规则

1. 文档语言默认中文，命令/API/路径保留英文。
2. 同一主题仅允许一个 `status: active` 主文档。
3. 与代码冲突时，以代码与当前可运行行为为准。
4. 新增需求只能先进入 `docs/product/REQUIREMENTS_BACKLOG.md`。
5. 历史文档进入 `docs/archive/`，不得继续作为主线规范。
6. 每次实施/提交必须新增一条 CR（Change Record）文件到 `docs/changes/records/`。
7. 需求状态进入 `done` 前，必须至少存在一条 `active` CR 且具备真实 `commit_ref`。
8. 所有提交前必须通过敏感信息扫描（`scripts/git-sensitive-scan.ps1`）。

状态机：`proposed -> triaged -> planned -> in_progress -> done -> archived`

## 2. 导航

### Product

- 主需求：`docs/product/PRODUCT_REQUIREMENTS.md`
- 需求池：`docs/product/REQUIREMENTS_BACKLOG.md`
- 需求模板：`docs/product/requirements/REQ-TEMPLATE.md`

### Architecture

- 当前架构：`docs/architecture/CURRENT_STATE.md`
- 路线图：`docs/architecture/ROADMAP.md`
- ADR 模板：`docs/architecture/decisions/ADR-TEMPLATE.md`

### Guides

- Android 开发与构建：`docs/guides/android-development.md`
- 部署指南：`docs/guides/deployment.md`

### Ops

- 运维清单：`docs/ops/ops-checklist.md`
- IME 事件追踪：`docs/ops/incidents/client-ime-issue-tracking.md`
- IME 快速提醒：`docs/ops/incidents/client-ime-reminder.md`
- 快捷键盘控制键问题追踪：`docs/ops/incidents/client-shortcut-keyboard-modifier-issue.md`

### Changes

- 项目变更日志：`docs/changes/CHANGELOG_PROJECT.md`
- 变更记录索引（CR）：`docs/changes/records/INDEX.md`
- 快捷键盘按钮记录：`docs/changes/2026-02-quick-toolbar.md`

### Archive

- 历史文档索引：`docs/archive/README.md`

## 3. 新增需求流程（统一入口）

1. 在 `docs/product/REQUIREMENTS_BACKLOG.md` 新增一条需求项。
2. 复制 `docs/product/requirements/REQ-TEMPLATE.md`，新建 `REQ-YYYYMMDD-<slug>.md`。
3. 在需求池中把 `links` 指向该需求卡。
4. 需求状态至少流转到 `planned` 后再进入实现。

## 4. CR 记录流程（强制）

1. 开发前或开发中创建 CR 草稿（`draft`，允许 `commit_ref: TBD`）。
2. 提交后更新 CR 为 `active` 并写入真实 commit hash。
3. 所有恢复/回滚步骤必须写入 CR 的“回滚方案（命令级）”。
4. `CHANGELOG_PROJECT.md` 只保留摘要，详细信息统一查 `docs/changes/records/INDEX.md`。

## 5. 提交前敏感信息审查

1. 首次启用（每个本地仓库执行一次）：
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-git-hooks.ps1
```
2. 手动扫描已暂存文件：
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\git-sensitive-scan.ps1 -Staged
```
3. 如确认为安全内容，可在对应行添加 `sensitive-scan:allow` 标记放行。
