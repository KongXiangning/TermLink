---
title: Windows PTY 清理链路切换到 ConPTY DLL
status: active
record_id: CR-20260413-0228-windows-conpty-dll
req_id: REQ-20260222-server-admin-privilege-mode
commit_ref: a7c6159
owner: @maintainer
last_updated: 2026-04-13
source_of_truth: code
related_code: [src/services/ptySpawnOptions.js, src/services/ptyService.js, src/services/codex/realCodexService.js, tests/ptySpawnOptions.test.js, test_pty.js]
related_docs: [docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md, docs/changes/records/INDEX.md]
---

# CR-20260413-0228-windows-conpty-dll

## 1. 变更意图（Compact Summary）

- 背景：Windows 部署日志持续出现 `node-pty` 的 `AttachConsole failed`，根因落在未启用 `useConptyDll` 时的 `conpty_console_list_agent` 清理分支。
- 目标：让 TermLink 的 Windows PTY 创建默认走 ConPTY DLL 路径，避免普通终端和 Codex PTY 在清理阶段反复触发该错误。
- 本次边界：仅调整 Windows PTY spawn 选项与对应测试，不改动会话协议、权限门禁或部署脚本。无关联 PLAN，按 `REQ + CR` 同步本批实现。

## 2. 实施内容（What changed）

1. 新增 `src/services/ptySpawnOptions.js`，集中封装 Windows `node-pty` 默认选项，在未显式覆盖时自动启用 `useConpty` 和 `useConptyDll`。
2. `src/services/ptyService.js` 改为复用该 helper，使常规终端会话默认避开 `conpty_console_list_agent` 的 `AttachConsole` 路径。
3. `src/services/codex/realCodexService.js` 同步接入该 helper，保证 Codex 持久 PTY 与普通终端行为一致。
4. 新增 `tests/ptySpawnOptions.test.js`，锁定 Windows 默认值、显式覆盖优先级和非 Windows 透传行为。
5. `test_pty.js` 也接入同一 helper，避免已跟踪的调试脚本继续保留旧的 Windows 复现路径。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：
  - `src/services/ptySpawnOptions.js`
  - `src/services/ptyService.js`
  - `src/services/codex/realCodexService.js`
  - `tests/ptySpawnOptions.test.js`
  - `test_pty.js`
- 模块：Windows PTY 启动参数、普通终端 PTY、Codex 持久 PTY。
- 运行时行为：在 Windows 上，TermLink 默认通过 ConPTY DLL 处理 PTY 生命周期，降低结束/清理阶段的 `AttachConsole failed` 错误噪音；非 Windows 行为保持不变。

## 4. 回滚方案（命令级）

```bash
# 方案 A：回滚该提交
git revert <commit_ref>

# 方案 B：仅恢复关键文件
git checkout <commit_ref>^ -- src/services/ptySpawnOptions.js
git checkout <commit_ref>^ -- src/services/ptyService.js
git checkout <commit_ref>^ -- src/services/codex/realCodexService.js
git checkout <commit_ref>^ -- tests/ptySpawnOptions.test.js
```

## 5. 验证记录（Tests/Checks）

1. `node --test .\tests\ptySpawnOptions.test.js`
2. `node -e "const pty=require('node-pty'); ... useConptyDll:true ... proc.kill() ..."`
3. `node -e "const PtyService=require('./src/services/ptyService'); ... svc.spawn(); svc.kill(); ..."`

结果：单测通过；本机 Windows `node-pty` 与 `PtyService` 的 `spawn + kill` 冒烟验证均完成，未再出现 `AttachConsole failed` 输出；本地 `node_modules/node-pty/build/Release/conpty/conpty.dll` 已确认存在。

## 6. 后续修改入口（How to continue）

- 若部署侧仍有零星 PTY 清理异常，优先从 `src/services/ptySpawnOptions.js` 增加受控覆盖开关或补充 Windows 特定日志，再复查 `D:\programCode\termlink-win\logs\termlink-error.log`。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`。

## 7. 风险与注意事项

1. 该修复依赖打包产物保留 `node-pty` 的 `conpty.dll`；若目标机被手工裁剪依赖，Windows PTY 可能退化。
2. 当前仅做本机冒烟验证，仍需在实际 `pm2`/计划任务部署实例上复查错误日志是否停止增长。
