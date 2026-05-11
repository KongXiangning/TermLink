# docs/workflow/LESSONS.md

## 使用规则

- 只记录跨任务可复用的经验
- 每条经验都要说明触发信号和应对动作
- 不要把一次性聊天过程原样粘贴到这里

## 通用

### Lesson 模板

- 场景：
- 结论：
- 触发信号：
- 应对动作：

## 数据与存储

- 场景：
  - 结论：
  - 触发信号：
  - 应对动作：

## 前端与交互

- 场景：
  - 结论：
  - 触发信号：
  - 应对动作：

- 场景：直接用浏览器打开 `codex_client.html` 做 Web smoke，但页面表面显示“bridgeCodex 面板已就绪”，真实发送却持续报 `WebSocket 未连接`。
  - 结论：standalone Web Codex client 不能只看页面文案；必须先确认 runtime config 是否真的注入了 `serverUrl/sessionId`。若 `serverUrl=''`、`sessionId=''`，应优先用 `window.__applyTerminalConfig(...)` 注入可用配置，再判断产品逻辑是否异常。
  - 触发信号：`requestCodexNewThread()` 或普通发送立即失败；`connect()` 进一步报“缺少服务器地址”；页面状态看似 idle/ready，但 `ws` 没有真正建立。
  - 应对动作：先在浏览器上下文检查 `serverUrl`、`sessionId`、`ws.readyState`；必要时调用 `__applyTerminalConfig({ serverUrl, sessionId, authHeader, sessionMode, cwd })` 建立真实连接，再继续 Web smoke 与 DOM/截图取证。

## 后端与服务

- 场景：
  - 结论：
  - 触发信号：
  - 应对动作：

## 测试与回归

- 场景：`node --test` full suite 报告"挂起"，但旧结论只是泛化地描述"full suite 会在后段挂起"，没有具体文件、测试名或执行阶段边界，导致 gate 状态长期停留在"知道有问题但无法行动"。
  - 结论：对挂起的 test suite，必须用文件级和测试名级拆分把挂起面收敛到可复述的最小单元，再区分"修复任务"和"gate 策略调整"。不能直接用旧结论跳过排查，也不能在边界未收敛时就调整 blocker gate。
  - 触发信号：full suite 超时未退出但没有具体失败测试名；旧文档中只有"suite 会挂"的泛化描述；验证矩阵中某 gate 长期无法执行但身份仍是 `blocks-merge`。
  - 应对动作：
    1. 先复跑 full suite 确认当前宿主下是否仍有 hang（记录 exit_code / timeout / elapsed）。
    2. 用文件级拆分（逐个文件或文件组合）定位 hanging files；必要时用 `--test-name-pattern` 进一步缩小到测试名。
    3. 对每个拆分运行明确记录 pass / fail / hung / blocked，不得把超时或长运行误写成 hung。
    4. 把 hanging surface 收敛到最小可复述边界后，再决定 gate 策略：保持、降级、或拆分为 confirmed narrow gate + deferred fix。
    5. 不得在边界未收敛前静默调整 blocker gate 身份。

- 场景：test suite 的挂起面最终落在多个独立文件，且这些文件都集中在同一个已知高风险模块（如 terminalGateway），但旧结论把它们当成互不相关的偶发问题。
  - 结论：多个 hanging files 如果共享同一高风险模块（terminalGateway / sessionManager codex config），应在 gate 决策中显式记录这一共性的风险含义——即修复前该模块的回归不会被自动化 gate 捕获——而不是仅列出文件名。
  - 触发信号：多个 hanging files 的路径或测试主题指向同一运行时模块；STATUS.md 中该模块已被标记为高风险区域。
  - 应对动作：在 gate 决策中显式写明"共性风险面"（如"3 个 hanging 文件全部集中在 terminalGateway / sessionManager codex config 路径"），并在风险说明中指出修复前该模块的回归无法被自动化 gate 捕获。

- 场景：在华为真机上用 adb / UIAutomator 做 Android composer smoke，skill token 在发送前或发送后异常退化成单个字符（如 `V`）。
  - 结论：这类现象先不要直接归因为产品渲染回归；键盘弹起后继续点击固定低位坐标，很容易误命中系统键盘并向 composer 注入脏字符。稳定做法是按当前 `EditText.bounds` 或高位安全坐标点击，而不是复用旧的低位固定点。
  - 触发信号：`$skill` 在任何附件选择前就已经被污染；XML 中 `EditText` bounds 位于高位，但自动化脚本仍点击低位坐标；重跑同一业务路径时污染字符不稳定复现。
  - 应对动作：在关键输入步骤前先抓最新 XML，读取当前 `android.widget.EditText` 的 bounds，再点其内部坐标；把低位固定点点击视为不可靠手法，不用它来判定业务回归。

## 部署与运行时

- 场景：
  - 结论：
  - 触发信号：
  - 应对动作：
