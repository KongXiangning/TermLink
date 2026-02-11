一、项目目标

构建一个移动端优先的 Web 远程终端系统，用于通过手机或平板浏览器流畅控制本机 WSL 终端环境。

系统必须：

支持低延迟交互

针对触控设备优化输入体验

支持 tmux 会话持久化

支持断线自动重连

可在局域网或外网安全访问

适合长期扩展（多机器、多会话）

二、系统架构
2.1 总体结构
Mobile Browser (PWA)
    ↓ WebSocket (WSS)
Backend (Node.js)
    ↓ PTY
tmux
    ↓
WSL Shell (bash/zsh)

2.2 技术选型
前端

终端渲染：xterm.js

通信：WebSocket

架构：单页应用（无强制框架）

支持 PWA 模式

支持移动端响应式布局

后端

Node.js

PTY 实现：node-pty

WebSocket 服务

强制使用 tmux 管理会话

三、功能需求（按优先级）
P0（必须实现）
3.1 基础终端功能

建立 WebSocket 连接

创建 PTY 实例

自动执行：

tmux new -A -s main


双向数据流：

浏览器输入 → 写入 PTY

PTY 输出 → 推送浏览器

3.2 终端 UI
必须支持：

自动适配屏幕尺寸

软键盘弹出时高度重算

字体大小可调（默认 14–16px）

深色主题

自动 focus

3.3 移动端快捷键栏（关键）

底部固定工具栏，包含按钮：

Ctrl
Alt
Esc
Tab
↑ ↓ ← →
Home
End
PgUp
PgDn

行为要求

Ctrl 可进入“锁定模式”

下一键自动附带 Ctrl

支持发送组合键

支持长按连续发送（方向键）

3.4 断线重连

WebSocket 断开自动重连

状态提示（连接中 / 已断开）

重连后自动恢复 tmux 会话

3.5 安全要求

不允许裸露端口

支持至少一种鉴权方式：

Basic Auth

Token

Header 校验

支持 HTTPS

P1（强烈建议实现）
3.6 多行输入模式

增加一个“输入面板”：

多行文本框

发送按钮

Enter 发送

支持历史记录（最近 20 条）

发送后清空

用途：适合长命令编辑

3.7 剪贴板增强

粘贴大文本不丢字符

粘贴自动分块写入

提供“粘贴”按钮

3.8 自适应行为

横屏优化

iOS Safari 软键盘弹出适配

Android Chrome 兼容

P2（增强功能）
3.9 会话管理

支持多个 tmux session

下拉菜单切换

3.10 命令快捷面板

预设按钮：

git status

git pull

npm run dev

build 脚本

tmux 窗口切换

3.11 UI 主题切换

Dark

Light

高对比

四、非功能性需求
4.1 性能

输入延迟 < 50ms（局域网）

输出渲染不卡顿

支持持续高频输出（如日志）

4.2 稳定性

连接中断不丢会话

支持页面刷新恢复

4.3 安全

禁止任意命令注入风险

不允许跨站 WebSocket 劫持

支持 Origin 校验

4.4 可扩展性

架构需支持未来：

多主机管理

用户登录系统

审计日志

API 模式

Codex CLI 专用面板

五、接口定义
5.1 WebSocket 消息结构
输入
{
  type: "input",
  data: "string"
}

输出
{
  type: "output",
  data: "string"
}

状态
{
  type: "status",
  state: "connected|disconnected"
}

六、部署要求

Node 服务监听本地端口

通过 Nginx 反向代理

强制 HTTPS

支持 Docker 部署（可选）

七、移动端优化特别要求

软键盘弹出不遮挡终端

底部工具栏固定

终端区滚动不影响页面整体滚动

触控滚动平滑

禁止双击缩放

八、明确不做的功能（避免范围膨胀）

不做完整 IDE

不做文件管理器

不做图形界面转发

不做远程桌面

不做插件系统（初期）

九、开发阶段划分
阶段 1

基础终端 + tmux + 快捷键栏

阶段 2

重连 + 输入面板 + 剪贴板增强

阶段 3

会话管理 + 命令面板

十、验收标准

手机可连续使用 30 分钟无异常

切后台再回来会话不丢

能顺畅执行：

Ctrl+C

Tab 补全

tmux 切换

长日志输出