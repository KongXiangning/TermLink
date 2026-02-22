---
title: TermLink 文档中心
status: active
owner: @maintainer
last_updated: 2026-02-22
source_of_truth: product
related_code: []
related_docs: [docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/CURRENT_STATE.md]
---

# TermLink 文档中心

## 1. 维护规则

1. 文档语言默认中文，命令/API/路径保留英文。
2. 同一主题仅允许一个 `status: active` 主文档。
3. 与代码冲突时，以代码与当前可运行行为为准。
4. 新增需求只能先进入 `docs/product/REQUIREMENTS_BACKLOG.md`。
5. 历史文档进入 `docs/archive/`，不得继续作为主线规范。

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

### Changes

- 项目变更日志：`docs/changes/CHANGELOG_PROJECT.md`
- 快捷键盘按钮记录：`docs/changes/2026-02-quick-toolbar.md`

### Archive

- 历史文档索引：`docs/archive/README.md`

## 3. 新增需求流程（统一入口）

1. 在 `docs/product/REQUIREMENTS_BACKLOG.md` 新增一条需求项。
2. 复制 `docs/product/requirements/REQ-TEMPLATE.md`，新建 `REQ-YYYYMMDD-<slug>.md`。
3. 在需求池中把 `links` 指向该需求卡。
4. 需求状态至少流转到 `planned` 后再进入实现。
