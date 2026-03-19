---
title: 快捷键盘控制键修复、换行与滚动优化 - 文档立项记录
status: draft
record_id: CR-20260223-2136-shortcut-keyboard-modifier-newline-doc-init
req_id: REQ-20260223-shortcut-keyboard-modifier-newline
commit_ref: TBD
owner: @maintainer
last_updated: 2026-02-23
source_of_truth: product
related_code: [docs/ops/incidents/client-shortcut-keyboard-modifier-issue.md, docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md, docs/product/REQUIREMENTS_BACKLOG.md, docs/product/PRODUCT_REQUIREMENTS.md, docs/architecture/ROADMAP.md, docs/changes/CHANGELOG_PROJECT.md]
related_docs: [docs/changes/records/INDEX.md, docs/changes/records/TEMPLATE_CHANGE_RECORD.md]
---

# CR-20260223-2136-shortcut-keyboard-modifier-newline-doc-init

## 1. 变更意图（Compact Summary）

- 背景：当前快捷键盘 `Ctrl/Alt` 未按终端控制键语义生效，且终端文字区拖动滚动困难。
- 目标：在文档层固化输入与滚动问题，并新增需求卡定义“修复控制键 + 新增换行按钮 + 优化滑动体验”的实现边界。
- 本次边界：仅文档立项与主线同步，不包含代码实现。

## 2. 实施内容（What changed）

1. 新增并更新 bug 追踪文档：`docs/ops/incidents/client-shortcut-keyboard-modifier-issue.md`。
2. 更新需求卡：`REQ-20260223-shortcut-keyboard-modifier-newline`，范围扩展到文字区拖动滚动优化。
3. 同步 `REQUIREMENTS_BACKLOG`、`PRODUCT_REQUIREMENTS`、`ROADMAP`、`CHANGELOG_PROJECT`、`docs/README`、`docs/changes/2026-02-quick-toolbar.md`。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `docs/ops/incidents/client-shortcut-keyboard-modifier-issue.md`
  - `docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md`
  - `docs/product/REQUIREMENTS_BACKLOG.md`
  - `docs/product/PRODUCT_REQUIREMENTS.md`
  - `docs/architecture/ROADMAP.md`
  - `docs/changes/CHANGELOG_PROJECT.md`
  - `docs/README.md`
- 模块：文档治理、需求流程、客户端输入问题追踪。
- 运行时行为：无直接运行时变更。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复本次文档
git checkout <commit_ref>^ -- docs/ops/incidents/client-shortcut-keyboard-modifier-issue.md
git checkout <commit_ref>^ -- docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md
git checkout <commit_ref>^ -- docs/product/REQUIREMENTS_BACKLOG.md
git checkout <commit_ref>^ -- docs/product/PRODUCT_REQUIREMENTS.md
git checkout <commit_ref>^ -- docs/architecture/ROADMAP.md
git checkout <commit_ref>^ -- docs/changes/CHANGELOG_PROJECT.md
git checkout <commit_ref>^ -- docs/README.md
```

## 5. 验证记录（Tests/Checks）

1. `validate-req`：
   - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260223-shortcut-keyboard-modifier-newline.md -Strict`
2. `validate-change-record`：
   - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-change-record.ps1 -RecordPath ./docs/changes/records/CR-20260223-2136-shortcut-keyboard-modifier-newline-doc-init.md -Strict`
3. `check-doc-sync`：
   - `powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/check-doc-sync.ps1 -ReqId REQ-20260223-shortcut-keyboard-modifier-newline`

## 6. 后续修改入口（How to continue）

- 后续实现优先从以下文件继续：
  - `public/terminal_client.js`
  - `public/terminal_client.css`
  - `public/terminal_client.html`
- 代码实现提交后需将本 CR 更新为 `active` 并回填真实 `commit_ref`。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 若实现阶段只改换行按钮而未修复控制键语义，需求完整性会不达标。
2. 若客户端依赖现有错误行为，修复后可能出现输入习惯变化，需要回归验证。
3. 触摸滚动策略调整可能影响文本选择或焦点行为，需补充真机拖动回归。
