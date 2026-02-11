本次新增目标：

在现有移动终端系统基础上，实现“随时随地控制家里的 Codex 终端”的完整控制链路。

新增能力包括：

手机 Web UI

app-server 桥接层

session/thread 管理

审批按钮（执行前确认）

局域网可访问

一、总体目标

构建一个移动优先的 Codex 远程控制系统，支持：

从手机浏览器发起请求

通过 app-server 桥接到本地 Codex CLI

支持多 session / thread 管理

对高风险命令进行审批确认

局域网访问即可（无需公网部署）

二、系统架构（新增后的完整结构）
Mobile Web UI
    ↓ HTTPS / WSS
app-server (Bridge Layer)
    ↓
Codex CLI (本地进程)
    ↓
WSL 环境

三、模块拆分
1️⃣ Mobile Web UI 模块
1.1 功能目标

提供一个专门用于控制 Codex 的移动控制界面。

不同于纯终端：

这是“结构化控制面板”

不是简单 PTY 透传

1.2 UI 结构
页面结构
顶部：当前 Session / Thread 选择
中部：消息区（类聊天）
底部：输入框 + 发送按钮
底部工具区：审批按钮 / 中断按钮

1.3 功能需求
1.3.1 消息流展示

支持：

用户输入消息

Codex 回复

系统消息（审批提示、执行状态）

执行日志输出

消息结构：

{
  id,
  role: "user" | "assistant" | "system",
  content,
  timestamp,
  status
}

1.3.2 Session 管理

功能：

创建新 session

列出历史 session

删除 session

重命名 session

切换 session

要求：

每个 session 对应一个 Codex CLI 进程或线程上下文

切换时自动加载历史对话

1.3.3 Thread 管理

每个 session 内支持多个 thread。

用途：

不同任务分支

不同子问题

功能：

创建 thread

切换 thread

删除 thread

标记当前激活 thread

1.3.4 审批按钮（关键）

当 Codex 产生“执行命令”或“修改文件”操作时：

UI 必须：

展示操作摘要

显示命令内容

显示影响文件

提供按钮：

[批准执行]
[拒绝]


审批状态：

pending
approved
rejected


未审批前：

不允许实际执行命令

后端处于等待状态

1.3.5 中断按钮

可中断当前 Codex 执行

向后端发送 interrupt 信号

杀死当前子进程

2️⃣ app-server 桥接层

这是本次新增核心。

2.1 目标

构建一个独立服务，负责：

管理 Codex CLI 子进程

管理 session/thread

处理审批逻辑

控制命令执行

2.2 服务结构

建议模块：

/server
  /sessions
  /threads
  /codex
  /approval
  /ws

2.3 核心职责
2.3.1 启动 Codex 进程

每个 session：

启动一个独立 Codex CLI 进程

绑定工作目录

维护上下文

2.3.2 监听输出

解析：

普通文本输出

建议执行命令

文件修改建议

状态提示

2.3.3 审批机制

流程：

Codex 输出包含执行动作

解析出命令

生成 approval 对象

向 UI 推送 pending 状态

等待用户点击

根据结果执行或丢弃

2.4 数据结构
Session
{
  id,
  name,
  createdAt,
  lastActiveAt,
  status,
  threads: []
}

Thread
{
  id,
  sessionId,
  messages: [],
  status
}

Approval
{
  id,
  sessionId,
  threadId,
  command,
  summary,
  filesAffected,
  status: "pending|approved|rejected"
}

3️⃣ WebSocket 协议定义
客户端 → 服务器
发送消息
{
  type: "send_message",
  sessionId,
  threadId,
  content
}

审批响应
{
  type: "approval_response",
  approvalId,
  decision: "approve" | "reject"
}

中断
{
  type: "interrupt",
  sessionId
}

服务器 → 客户端
输出
{
  type: "message",
  sessionId,
  threadId,
  role,
  content
}

审批请求
{
  type: "approval_request",
  approvalId,
  command,
  summary,
  filesAffected
}

状态更新
{
  type: "status",
  sessionId,
  state
}

4️⃣ 局域网访问要求
4.1 网络目标

仅需局域网访问

不依赖公网服务

不依赖云代理

4.2 部署要求

监听 0.0.0.0

支持内网 IP 访问

支持自签 HTTPS（可选）

可通过路由端口映射实现外网访问（不强制）

5️⃣ 安全要求

不允许未授权访问

WebSocket 必须验证 token

支持简单登录（用户名 + 密码）

不允许直接执行任意系统命令（必须经过 Codex）

6️⃣ 错误处理

必须处理：

Codex 崩溃

进程异常退出

网络断开

session 恢复

审批超时

7️⃣ 性能要求

支持至少 3 个并发 session

单 session 内连续对话不卡顿

审批响应延迟 < 200ms

8️⃣ 明确范围

本阶段不做：

多用户权限系统

云端同步

分布式部署

文件浏览器

9️⃣ 验收标准

手机可创建 session

可发送消息给 Codex

可看到执行建议

点击批准后成功执行

拒绝后不执行

可中断任务

局域网可稳定访问