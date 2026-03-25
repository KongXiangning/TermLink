---
title: 文档统一管理与需求流程标准化 - root README refresh
status: active
record_id: CR-20260326-0033-root-readme-refresh
req_id: REQ-20260222-doc-governance
commit_ref: ff36174
owner: @maintainer
last_updated: 2026-03-26
source_of_truth: product
related_code: []
related_docs: [README.md, README.zh-CN.md, docs/product/requirements/REQ-20260222-document-governance.md, docs/changes/CHANGELOG_PROJECT.md, docs/changes/records/INDEX.md]
---

# CR-20260326-0033-root-readme-refresh

## 1. 变更意图（Compact Summary）

- 背景：仓库根 `README.md` 仍停留在旧版“浏览器聊天终端”表述，未反映当前 Android 原生壳、Codex WebView、Workspace 独立页和 Sessions 缓存等已落地能力。
- 目标：把 README 刷新为“英文根 README + 中文 README”双文档入口，并通过超链接互相跳转，同时补齐来自真机的 Android 截图，替换占位图。
- 本次边界：仅更新文档与 README 配套截图资源，不修改运行时代码或产品需求边界。

## 2. 实施内容（What changed）

1. 重写根 `README.md` 为英文项目入口文档，并新增 `README.zh-CN.md` 中文版；两个文档在顶部互相跳转，且都只描述当前已实现能力。
2. 使用真机 `4KM7N19311002236` 采集 Android `Sessions / Codex 主界面 / Codex 运行态 / Workspace` 四张截图，并落库到 `docs/assets/readme/`。
3. 更新 `docs/changes/records/INDEX.md` 与 `docs/changes/CHANGELOG_PROJECT.md`，为本次 README 刷新补齐 CR 索引和项目级摘要记录。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：`README.md`、`README.zh-CN.md`、`docs/assets/readme/*`、`docs/changes/CHANGELOG_PROJECT.md`、`docs/changes/records/INDEX.md`、`docs/changes/records/CR-20260326-0033-root-readme-refresh.md`
- 模块：项目入口文档与文档追踪链
- 运行时行为：无运行时代码变化；仅更新文档展示和仓库内 README 图片资源

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复 README 刷新批次
git checkout <commit_ref>^ -- README.md
git checkout <commit_ref>^ -- docs/assets/readme
git checkout <commit_ref>^ -- docs/changes/CHANGELOG_PROJECT.md
git checkout <commit_ref>^ -- docs/changes/records/INDEX.md
git checkout <commit_ref>^ -- docs/changes/records/CR-20260326-0033-root-readme-refresh.md
```

## 5. 验证记录（Tests/Checks）

- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/docs-requirement-sync/scripts/validate-req.ps1 -ReqPath ./docs/product/requirements/REQ-20260222-document-governance.md -Strict`
- 结果：通过（仅 `related_code` 为空告警，不阻塞）
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/ensure-local-server.ps1`
- 结果：通过，本地服务 `http://127.0.0.1:3010/api/health` 返回 `200`
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/build-debug-apk.ps1`
- 结果：通过，`android/app/build/outputs/apk/debug/app-debug.apk` 可用
- 校验命令：`powershell -ExecutionPolicy Bypass -File ./skills/android-local-build-debug/scripts/install-debug-apk.ps1 -Serial 4KM7N19311002236`
- 结果：通过，真机安装并成功启动 `com.termlink.app`

## 6. 后续修改入口（How to continue）

- 下次若继续调整项目入口文档，优先从 `README.md`、`docs/product/PRODUCT_REQUIREMENTS.md`、`docs/guides/android-development.md` 继续
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. README 只应描述当前已实现能力；后续若引入未落地的设计稿状态，必须明确标注为“设计方向”而不是“现状”。
2. 本记录当前绑定的实现提交为 `ff36174`；后续若继续扩展 README 范围，应新增独立 CR，而不是直接覆写本记录的提交指向。
