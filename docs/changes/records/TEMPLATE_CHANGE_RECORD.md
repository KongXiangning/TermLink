---
title: 变更记录标题
status: draft
record_id: CR-YYYYMMDD-HHMM-<slug>
req_id: REQ-YYYYMMDD-<slug>
commit_ref: TBD
owner: @maintainer
last_updated: 2026-02-22
source_of_truth: code
related_code: [path1, path2]
related_docs: [path1, path2]
---

# CR-YYYYMMDD-HHMM-<slug>

## 1. 变更意图（Compact Summary）

- 背景：
- 目标：
- 本次边界：

## 2. 实施内容（What changed）

1.
2.
3.

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
- 模块：
- 运行时行为：

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件（示例）
git checkout <commit_ref>^ -- <path/to/file>
```

## 5. 验证记录（Tests/Checks）

- 校验命令：
- 结果：

## 6. 后续修改入口（How to continue）

- 下次修改建议从以下文件继续：
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1.
2.
