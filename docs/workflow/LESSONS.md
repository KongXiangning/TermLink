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

- 场景：
  - 结论：
  - 触发信号：
  - 应对动作：

- 场景：在华为真机上用 adb / UIAutomator 做 Android composer smoke，skill token 在发送前或发送后异常退化成单个字符（如 `V`）。
  - 结论：这类现象先不要直接归因为产品渲染回归；键盘弹起后继续点击固定低位坐标，很容易误命中系统键盘并向 composer 注入脏字符。稳定做法是按当前 `EditText.bounds` 或高位安全坐标点击，而不是复用旧的低位固定点。
  - 触发信号：`$skill` 在任何附件选择前就已经被污染；XML 中 `EditText` bounds 位于高位，但自动化脚本仍点击低位坐标；重跑同一业务路径时污染字符不稳定复现。
  - 应对动作：在关键输入步骤前先抓最新 XML，读取当前 `android.widget.EditText` 的 bounds，再点其内部坐标；把低位固定点点击视为不可靠手法，不用它来判定业务回归。

## 部署与运行时

- 场景：
  - 结论：
  - 触发信号：
  - 应对动作：
