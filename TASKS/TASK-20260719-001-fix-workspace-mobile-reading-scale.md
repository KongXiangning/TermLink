# TASK-20260719-001：修复 Android 文档阅读字号与移动端横向溢出

## 任务定义

- 任务 ID：20260719-001
- 任务 slug：fix-workspace-mobile-reading-scale
- 最终状态：completed / archived
- 目标：让手机自然比例下的 Markdown/源码使用较小字号并完整显示长路径，避免依赖手动缩放破坏界面布局。

## 根因与修复

- Markdown 正文继承浏览器默认 16px，移动规则此前只缩小 padding；长路径与 inline code 没有内容级换行。
- Android WebView 可能放大文字，而 pinch zoom 会缩放整个 CSS viewport，导致工具栏、卡片与响应式断点一起失配。
- 移动 Markdown 改为 13px/1.62，标题为 22/19/16px；长 token 使用 `overflow-wrap:anywhere`，表格和代码块保留局部滚动。
- 移动源码改为 12px `pre-wrap`，隐藏折行后会错位的独立行号；桌面源码原始横向滚动保持不变。
- viewport 禁止手势缩放并固定 `text-size-adjust:100%`；工具栏、卡片和 44px 点击区域不跟随正文缩小。

## 验证证据

- `tests/workspace.web.test.js`：14/14；TD-004 confirmed narrow gate：134/134。
- `npm run android:sync`、debug APK 构建和安装、public/Android assets SHA256 一致、`git diff --check` 通过。
- Playwright 412×915 与 360×800：正文计算值 13px，Markdown/body 均无横向溢出；源码 12px/pre-wrap；console 0 error。
- Huawei VOG-AL00 / Android 10 真机以自然比例打开真实 `docs/adoption/ADOPTION_REPORT.md`，正文和长 token 在卡片内完整换行；logcat 无 WorkspaceActivity/FATAL 错误。
- 截图：`output/playwright/workspace-mobile-412-reading-small.png`、`workspace-mobile-360-reading-small.png`、`workspace-device-reading-small-markdown.png`。

## 契约与发布

- 仅修改 `public/workspace.css/html` 与 Web 静态断言；Workspace API、session、WebSocket、Android Kotlin/bridge 均未改变。
- Release mode：none；未部署、未 canary；纯 CSS/viewport 调整无新增运行时开销。
- Rollback：回退本任务的字号、换行和 viewport 增量；本轮未触发回滚。
- Remaining observation：若用户仍希望更高密度，可单独把正文从 13px 调到 12px；当前不存在横向裁切 blocker。

## 后续入口

- 下一轮需求尚未明确，`docs/workflow/CURRENT_TASK.md` 已恢复为 clean handoff。
