---
title: Codex 能力矩阵驱动主线需求（MVP + 下一阶段）- Phase 1 Android 真机验收
status: archived
record_id: CR-20260310-2323-codex-phase1-mobile-validation
req_id: REQ-20260309-codex-capability-mvp
commit_ref: 3552d38
owner: @maintainer
last_updated: 2026-03-11
source_of_truth: runtime
related_code: [public/codex_client.html, public/terminal_client.js, public/terminal_client.css, android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/product/requirements/REQ-20260309-codex-capability-mvp.md, docs/codex/codex-capability-implementation-plan.md, docs/changes/records/INDEX.md]
---

# CR-20260310-2323-codex-phase1-mobile-validation

## 1. 变更意图（Compact Summary）

- 背景：Phase 1 首页收口代码已落地，且手机侧连接问题已恢复，需要用 Android 真机重新审批该阶段。
- 目标：根据冷启动后的真实 Codex 首页状态，判断 Phase 1 是否满足"首页默认只保留对话主链路，二级面板默认关闭"的验收要求。
- 本次边界：修复 CSS/HTML 中二级面板默认展开的问题，完成真机验收。

## 2. 实施内容（What changed）

1. 在设备 `MQS7N19402011743` 上安装最新 debug APK 并确认当前选择为 `codex` 会话。
2. 通过 `adb` 复验本地服务监听、手机到 `192.168.50.12:3010` 的连通性，以及 Codex 会话的 WebSocket 建连日志。
3. 执行冷启动复验，回到 Codex 首页顶部后截图，并按 Phase 1 验收项逐项核对。
4. **修复**：CSS 中添加 `[hidden] { display: none !important; }` 规则，HTML 中为 `codex-history-panel` 添加 `hidden` 属性。

## 3. 验证结果（Runtime Findings）

### 3.1 通过项

1. **首页核心元素显示正确**：
   - 状态摘要：显示 "Codex 空闲：线程已就绪"
   - 当前线程摘要：显示线程 ID、工作区路径、状态
   - 消息流：显示 bridge 消息
   - 输入区：显示输入框和发送按钮

2. **二级面板默认隐藏**：
   - `配置提示` (config warning) - 隐藏
   - `弃用提示` (deprecation notice) - 隐藏
   - `线程列表` (Threads panel) - 隐藏
   - `会话默认配置` (Session Defaults) - 隐藏
   - `运行态` (Live Runtime) - 隐藏

3. **Interrupt 按钮在 idle 状态下隐藏**

4. **Codex 静态文案已中文化**：`会话设置`、`运行态`、`当前线程`、`发送`

### 3.2 验收结论

**Phase 1 审批通过**

冷启动首页完全符合"首页默认只保留对话主链路"的要求，所有二级面板默认隐藏。

## 4. 影响范围（Files/Modules/Runtime）

- 文件：
  - `public/terminal_client.css` - 添加 `[hidden] { display: none !important; }` 规则
  - `public/codex_client.html` - 为 `codex-history-panel` 添加 `hidden` 属性
- 模块：
  - Android WebView Codex 首页
  - Codex 首页默认态与二级面板展开逻辑
- 运行时行为：
  - 连接已恢复
  - 首页默认态已达到 Phase 1 产品验收标准

## 5. 回滚方案（命令级）

```bash
# 代码回滚
git checkout -- public/terminal_client.css
git checkout -- public/codex_client.html
# 文档回滚（若本记录内容有误）
git checkout -- docs/changes/records/CR-20260310-2323-codex-phase1-mobile-validation.md
git checkout -- docs/changes/records/INDEX.md
```

## 6. 验证记录（Tests/Checks）

- 本地服务与网络：
  - `Get-NetTCPConnection -LocalPort 3010 -State Listen`
  - `Invoke-WebRequest http://127.0.0.1:3010/api/health`
  - `Invoke-WebRequest http://192.168.50.12:3010/api/health`
  - `adb -s MQS7N19402011743 shell ping -c 1 192.168.50.12`
- 真机安装与运行：
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\build-debug-apk.ps1 -ProjectRoot . -JdkHome D:\ProgramCode\openjdk\jdk-21`
  - `powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\install-debug-apk.ps1 -Serial MQS7N19402011743 -ProjectRoot .`
  - `adb -s MQS7N19402011743 shell am force-stop com.termlink.app`
  - `adb -s MQS7N19402011743 shell monkey -p com.termlink.app -c android.intent.category.LAUNCHER 1`
- 证据采集：
  - `adb -s MQS7N19402011743 exec-out screencap -p` - 冷启动截图验证

## 7. 后续修改入口（How to continue）

Phase 1 已通过验收，可继续推进 Phase 2：
- slash registry + `/model` + `/plan` + next-turn quick controls
- 输入 `/` 打开 slash 列表
- 落地 `/model` 和 `/plan`
- 输入区附近增加模型 / 推理强度快捷入口

## 8. 风险与注意事项

1. 本次修复解决了 CSS 中 ID 选择器 `display: flex` 覆盖 `hidden` 属性的问题。
2. 后续新增面板时，务必确保 HTML 中有 `hidden` 属性，且 CSS 中 `[hidden]` 规则生效。
