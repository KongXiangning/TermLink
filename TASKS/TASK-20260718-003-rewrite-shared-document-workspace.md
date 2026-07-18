# TASK-20260718-003：重写 Android/Web 共享文档工作区

## 任务定义

- 任务 ID：20260718-003
- 任务 slug：rewrite-shared-document-workspace
- 最终状态：completed / archived
- 目标：在保持只读、现有 session 安全边界和 Android/Web 混合架构的前提下，重做目录导航、文件打开、Git HEAD/双文件比较与自适应界面。

## 完成结果

- 默认从 `docs`/`DOCS` 进入并可返回 workspace 根目录；移动端使用单页钻取，宽屏使用懒加载目录树与右侧查看器。
- 新增受限全局搜索、面包屑、刷新、隐藏文件切换；结果只暴露 workspace 相对路径，并排除 `.git`、`node_modules` 与生成缓存。
- 文件描述增加类型、MIME、编码、语言与 view mode；文本/代码、Markdown、图片、PDF、二进制分别使用安全只读预览。
- Git HEAD 比较合并 staged + unstaged，覆盖未跟踪、删除和无 HEAD；任意双文本文件复用同一 paired-row hunks，支持 unified / side-by-side。
- Android 原生壳接管返回栈、Basic/mTLS 认证下载、25MiB 受控缓存、24h 清理和 FileProvider 只读系统打开；IME 弹出时 WebView 使用剩余可视空间。
- Markdown-it 14.3.0、Highlight.js 11.11.1、PDF.js 4.10.38 legacy 固定为离线资产；服务端新增 `diff@9.0.0`。

## 验证证据

- TD-004 confirmed narrow gate 加本任务测试：152/152 通过；workspace focused：47/47 通过。
- JDK 21 `:app:testDebugUnitTest :app:assembleDebug`、`npm run android:sync`、修改 JS syntax 与 `git diff --check` 通过。
- Playwright 在 1440×900、412×915、360×800 完成目录、Markdown、搜索、HEAD/双文件比较与 Android host 模拟；360px 无横向溢出，console 无错误。
- Huawei 真机 Android 10 / WebView 150 完成默认文档、真实目录、搜索结果、IME resize、连续返回与原生宿主 smoke；logcat 无 WorkspaceActivity/AndroidRuntime 错误。
- 截图保存在 `output/playwright/`，含桌面、360/412 移动布局与真机证据。

## 契约与审查

- 新增 `/workspace/search`、`/workspace/compare` 和 `/workspace/diff?baseline=head&format=structured`；均经过既有 workspace access resolver，旧 `/workspace/files` 与无参数 `/diff` 保持不变。
- session DTO/持久化、WebSocket、Codex conversation/binding/owner fallback、workspace 写入能力均未修改。
- 最终 review 修复隐藏 deleted placeholder、HEAD 大 blob 预判、History/弹层返回、i18n/hidden、44px 触控、移动滚动、Android IME 与 bridge 路径归一化问题；无未解释 P0/P1 finding。
- 全量 `node --test` 仍会被既有 TD-004 的三个 terminalGateway/sessionManager 文件挂起；本任务未修改该风险面，官方窄门禁及直接影响路径通过。

## 发布与恢复

- Release mode：none；Deploy source / target environment：不适用，仅本地 Node/Web 与 Android debug。
- Health checks：真机阶段本地 `/api/health` 正常。
- Canary window：不适用；canary result：未执行。
- Performance baseline：目录按需加载；搜索最多 100 结果/20,000 扫描项；比较每侧最多 1MiB/50,000 行。
- Rollback / recovery：可从 task start base `05ae563` 回退 workspace service/routes、共享页面/vendor 与 Android WorkspaceActivity 增量；本轮未触发回滚。
- Release evidence：自动化、构建、浏览器视觉 QA、Android 真机与 logcat 记录。

## 剩余观察与后续入口

- 可在后续补充更多真实 PDF、超大图片、不同编码和不同 OEM WebView 样本；当前不存在产品阻断。
- 下一轮需求尚未明确，`docs/workflow/CURRENT_TASK.md` 已清理为 clean handoff。
