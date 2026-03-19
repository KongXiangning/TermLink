# TermLink 项目背景文档

## 1. 项目概述

**TermLink** 是一个终端远程访问与 AI 编程助手的混合应用平台。它允许用户通过 Web 浏览器或 Android App 远程访问服务器终端，并集成了 Codex AI 对话功能，提供智能编程辅助。

### 核心特性

- **远程终端访问**: 实时、低延迟的终端 I/O 转发
- **AI 编程助手**: 集成 Codex CLI，支持代码生成、调试、重构等
- **多端支持**: Web 浏览器 + Android 原生 App
- **会话管理**: 支持会话持久化、重连、历史记录
- **安全认证**: Basic Auth、mTLS、WebSocket 票据认证

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              客户端层                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   Web Browser    │  │  Android App     │  │   其他 HTTP 客户端   │  │
│  │  (HTML/JS/CSS)   │  │  (Kotlin +       │  │                      │  │
│  │                  │  │   Capacitor)     │  │                      │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
└───────────┼─────────────────────┼───────────────────────┼───────────────┘
            │                     │                       │
            │ HTTP/WebSocket      │ HTTP/WebSocket        │ HTTP API
            ▼                     ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           服务端层 (Node.js)                             │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Express HTTP Server                           │   │
│  │  • 静态文件服务 (public/)                                        │   │
│  │  • REST API (/api/sessions, /api/health, /api/ws-ticket)        │   │
│  │  • Basic Auth 认证中间件                                         │   │
│  │  • CORS 支持                                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    WebSocket Server (ws)                         │   │
│  │  • 终端 I/O 实时转发                                             │   │
│  │  • Codex AI 消息路由                                             │   │
│  │  • 会话绑定与状态同步                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│         ┌────────────────────┼────────────────────┐                     │
│         ▼                    ▼                    ▼                     │
│  ┌─────────────┐    ┌────────────────┐    ┌────────────────────┐       │
│  │ PtyService  │    │ SessionManager │    │ CodexAppServer     │       │
│  │ (node-pty)  │    │                │    │ Service            │       │
│  │             │    │ • 会话生命周期  │    │                    │       │
│  │ • Shell 进程│    │ • 状态持久化   │    │ • Codex CLI 桥接   │       │
│  │ • PTY 管理  │    │ • 空闲清理     │    │ • stdio 通信       │       │
│  └─────────────┘    └────────────────┘    └────────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          外部服务/依赖                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │  System Shell   │  │   Codex CLI     │  │   文件系统              │ │
│  │  (bash/zsh/etc) │  │ (codex app-     │  │   (data/sessions/*.json)│ │
│  │                 │  │  server)        │  │                         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流

```
用户输入 ──────────────────────────────────────────────────────────────►
         │
         ▼
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   Web/App 客户端 │ ──────────────────►│  WebSocket      │
│                 │                     │  Gateway        │
│  • xterm.js     │ ◄──────────────────│                 │
│  • Codex UI     │     WebSocket      │  • 消息路由     │
└─────────────────┘                     │  • 会话绑定     │
                                        └────────┬────────┘
                                                 │
                          ┌──────────────────────┼──────────────────────┐
                          ▼                      ▼                      ▼
                 ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                 │   PtyService    │    │ SessionManager  │    │ CodexService    │
                 │                 │    │                 │    │                 │
                 │  node-pty       │    │  会话状态存储   │    │  codex app-     │
                 │  Shell 进程     │    │                 │    │  server 子进程  │
                 └────────┬────────┘    └─────────────────┘    └────────┬────────┘
                          │                                             │
                          ▼                                             ▼
                 ┌─────────────────┩───────────────────────────────────┐
                 │                                                      │
                 ▼                                                      ▼
          ┌─────────────┐                                      ┌─────────────┐
          │ System Shell│                                      │  Codex API  │
          │ (bash/zsh)  │                                      │  (Anthropic)│
          └─────────────┘                                      └─────────────┘
```

---

## 3. 技术栈

### 3.1 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 18+ | 运行时环境 |
| **Express** | ^5.2.1 | HTTP 服务器框架 |
| **ws** | ^8.19.0 | WebSocket 服务器 |
| **node-pty** | ^1.1.0 | PTY 终端进程管理 |
| **basic-auth** | ^2.0.1 | HTTP Basic 认证解析 |
| **uuid** | ^13.0.0 | 会话 ID 生成 |
| **dotenv** | ^17.2.4 | 环境变量加载 |

### 3.2 前端技术栈

| 技术 | 版本/来源 | 用途 |
|------|----------|------|
| **原生 JavaScript** | - | 主客户端逻辑，无框架依赖 |
| **xterm.js** | v5.3.0 | 终端模拟器，渲染 Shell 输出 |
| **xterm-addon-fit** | v0.8.0 | 终端自适应容器大小 |
| **CSS** | 自定义 | UI 样式 |

### 3.3 移动端技术栈

| 技术 | 用途 |
|------|------|
| **Kotlin** | 主要开发语言 |
| **Android SDK 21+** | 目标平台 (Android 5.0+) |
| **Capacitor Android** | WebView 包装框架 |
| **AndroidX** | 现代组件库 |
| **Material Design** | UI 组件 |
| **AndroidX WebKit** | WebView 支持 |
| **AndroidX Security** | 加密存储 |

---

## 4. 目录结构

```
TermLink/
├── src/                          # 后端源代码
│   ├── server.js                 # 主入口服务器
│   ├── auth/
│   │   └── basicAuth.js          # 认证模块
│   ├── config/
│   │   ├── privilegeConfig.js    # 权限配置
│   │   └── securityGates.js      # 安全门禁
│   ├── repositories/
│   │   └── sessionStore.js       # 会话存储
│   ├── routes/
│   │   ├── health.js             # 健康检查
│   │   └── sessions.js           # 会话 API
│   ├── services/
│   │   ├── auditService.js       # 审计日志
│   │   ├── codexAppServerService.js  # Codex 服务
│   │   ├── ptyService.js         # PTY 终端
│   │   └── sessionManager.js     # 会话管理
│   ├── utils/
│   │   ├── auditTrace.js         # 审计追踪
│   │   └── ipCheck.js            # IP 校验
│   └── ws/
│       └── terminalGateway.js    # WebSocket 网关
│
├── public/                       # 前端静态资源
│   ├── terminal_client.html      # 终端+Codex 综合页面
│   ├── terminal_client.js        # 主客户端逻辑 (261KB)
│   ├── terminal_client.css       # 客户端样式
│   ├── codex_client.html         # Codex 专用页面
│   ├── terminal.html/.js/.css    # 传统终端页面
│   ├── client.js                 # 客户端入口
│   └── lib/                      # 前端库
│       ├── xterm.js              # 终端模拟器
│       ├── xterm-addon-fit.js    # 自适应插件
│       ├── xterm.css             # 终端样式
│       └── codex_*.js            # Codex 模块
│
├── android/                      # Android 原生应用
│   └── app/src/main/
│       ├── java/com/termlink/app/
│       │   ├── MainShellActivity.kt      # 主界面
│       │   ├── data/                     # 数据层
│       │   ├── ui/                       # UI 组件
│       │   └── web/                      # WebView
│       └── res/                          # Android 资源
│
├── data/                         # 运行时数据
│   └── sessions/                 # 会话持久化文件
├── logs/                         # 日志目录
├── tests/                        # 测试文件
├── docs/                         # 文档
│
├── package.json                  # Node.js 依赖
├── capacitor.config.json         # Capacitor 配置
├── Dockerfile                    # Docker 部署
├── docker-compose.yml            # Docker Compose
└── ecosystem.config.js           # PM2 配置
```

---

## 5. 核心功能模块

### 5.1 终端模块

**功能描述**: 提供远程终端访问能力，用户可以在浏览器或 App 中操作服务器 Shell。

**关键文件**:
- `src/services/ptyService.js` - PTY 服务
- `public/terminal.js` - 终端前端逻辑
- `public/lib/xterm.js` - 终端渲染

**核心功能**:
- PTY 进程管理 (node-pty)
- 跨平台 Shell 支持 (bash/zsh/sh)
- 终端输出渲染 (xterm.js)
- 输入缓冲和快捷键
- 终端大小自适应

### 5.2 Codex AI 对话模块

**功能描述**: 集成 Codex CLI，提供 AI 编程助手功能。

**关键文件**:
- `src/services/codexAppServerService.js` - Codex 服务桥接
- `src/ws/terminalGateway.js` - Codex 消息处理
- `public/terminal_client.js` - Codex UI 逻辑

**核心功能**:
- 与 Codex CLI (`codex app-server`) 的 stdio 通信
- 线程 (Thread) 管理
- 模型配置 (GPT-4, Claude 等)
- 推理级别 (Reasoning Effort) 设置
- 审批流程 (命令执行审批)
- 沙箱模式 (Sandbox Mode)
- 斜杠命令 (/skills, /compact 等)
- 技能调用
- 上下文压缩

### 5.3 会话管理模块

**功能描述**: 管理用户会话的生命周期。

**关键文件**:
- `src/services/sessionManager.js` - 会话管理器
- `src/repositories/sessionStore.js` - 会话持久化
- `src/routes/sessions.js` - 会话 REST API

**核心功能**:
- 会话创建/删除/重命名
- 会话持久化 (JSON 文件)
- 空闲会话自动清理
- 会话容量限制
- WebSocket 连接绑定

### 5.4 认证与安全模块

**功能描述**: 提供多层安全机制。

**关键文件**:
- `src/auth/basicAuth.js` - 认证模块
- `src/config/privilegeConfig.js` - 权限配置
- `src/config/securityGates.js` - 安全门禁

**核心功能**:
- HTTP Basic Auth
- WebSocket 临时票据认证
- 权限模式 (standard/elevated)
- IP 白名单
- mTLS 客户端证书支持
- 审计日志

---

## 6. 通信协议

### 6.1 HTTP REST API

| 端点 | 方法 | 功能 | 请求体/参数 |
|------|------|------|-------------|
| `/api/sessions` | GET | 列出所有会话 | - |
| `/api/sessions` | POST | 创建新会话 | `{name, cwd?}` |
| `/api/sessions/:id` | PATCH | 更新会话 | `{name?}` |
| `/api/sessions/:id` | DELETE | 删除会话 | - |
| `/api/health` | GET | 健康检查 | - |
| `/api/ws-ticket` | GET | 获取 WebSocket 票据 | - |

### 6.2 WebSocket 消息类型

#### 客户端 → 服务器

| 类型 | 描述 | 数据结构 |
|------|------|----------|
| `input` | 终端输入数据 | `{type, sessionId, data}` |
| `resize` | 终端大小调整 | `{type, sessionId, cols, rows}` |
| `codex_start_thread` | 启动 Codex 线程 | `{type, sessionId, cwd, prompt, ...}` |
| `codex_turn` | 发送 Codex 对话 | `{type, sessionId, content}` |
| `codex_interrupt` | 中断 Codex 响应 | `{type, sessionId}` |
| `codex_request` | 通用 Codex 请求 | `{type, sessionId, method, params}` |
| `codex_server_response` | 响应 Codex 服务端请求 | `{type, sessionId, requestId, decision, ...}` |

#### 服务器 → 客户端

| 类型 | 描述 | 数据结构 |
|------|------|----------|
| `output` | 终端输出数据 | `{type, sessionId, data}` |
| `connected` | 连接成功确认 | `{type, sessionId, ...}` |
| `codex_thread` | Codex 线程创建通知 | `{type, threadId, ...}` |
| `codex_state` | Codex 状态同步 | `{type, threadId, status, ...}` |
| `codex_server_request` | Codex 审批/输入请求 | `{type, requestId, method, params}` |
| `codex_log` | Codex 日志输出 | `{type, entries}` |
| `error` | 错误消息 | `{type, message}` |

### 6.3 Codex CLI 通信协议

Codex CLI 通过 stdio 进行 JSON-RPC 风格的通信:

```javascript
// 请求格式
{ id: 1, method: 'thread/start', params: { cwd: '/path', ... } }

// 响应格式
{ id: 1, result: { thread: { id: 'xxx' }, ... } }

// 通知格式 (无需响应)
{ method: 'turn/started', params: { ... } }

// 服务端请求格式 (需客户端响应)
{ id: 2, method: 'item/commandExecution/requestApproval', params: { ... } }
```

### 6.4 支持的 Codex 方法白名单

| 方法 | 描述 |
|------|------|
| `thread/list` | 列出所有线程 |
| `thread/read` | 读取线程内容 |
| `thread/resume` | 恢复线程 |
| `thread/fork` | 分叉线程 |
| `thread/name/set` | 设置线程名称 |
| `thread/archive` | 归档线程 |
| `thread/unarchive` | 取消归档 |
| `thread/compact/start` | 启动上下文压缩 |
| `model/list` | 列出可用模型 |
| `skills/list` | 列出可用技能 |
| `account/rateLimits/read` | 读取额度信息 |

---

## 7. Android App 结构

### 7.1 架构层次

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (Kotlin)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ MainShell       │  │ SessionsFragment│  │SettingsFrag │ │
│  │ Activity        │  │                 │  │             │ │
│  │                 │  │ 会话列表        │  │ 设置页面    │ │
│  │ • Drawer 布局   │  └─────────────────┘  └─────────────┘ │
│  │ • WebView 宿主  │                                        │
│  │ • 会话切换      │                                        │
│  └────────┬────────┘                                        │
└───────────┼─────────────────────────────────────────────────┘
            │
┌───────────┼─────────────────────────────────────────────────┐
│           ▼        WebView Bridge Layer                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              TerminalEventBridge                     │   │
│  │  • JS ↔ Kotlin 消息桥接                              │   │
│  │  • WebView 事件处理                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              MtlsWebViewClient                       │   │
│  │  • mTLS 证书处理                                     │   │
│  │  • 自定义请求头                                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            │
┌───────────┼─────────────────────────────────────────────────┐
│           ▼        Data Layer                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ ServerConfig    │  │ CredentialStore │  │SessionApi   │ │
│  │ Store           │  │                 │  │Client       │ │
│  │                 │  │ Basic Auth 凭证 │  │ HTTP API    │ │
│  │ 服务器配置      │  │ 加密存储        │  │ 客户端      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 关键类说明

| 类名 | 职责 |
|------|------|
| `MainShellActivity` | 主界面，管理 Drawer 布局、WebView 生命周期、会话切换 |
| `MtlsWebViewClient` | 自定义 WebViewClient，处理 mTLS 证书和请求头 |
| `TerminalEventBridge` | JS 桥接，处理 WebView 与 Kotlin 之间的消息传递 |
| `ServerConfigStore` | 服务器配置存储 (SharedPreferences) |
| `BasicCredentialStore` | Basic Auth 凭证加密存储 (AndroidX Security) |
| `SessionApiClient` | HTTP API 客户端，调用服务端 REST API |
| `MtlsHttpSupport` | mTLS HTTP 支持，处理客户端证书 |

### 7.3 Capacitor 集成

Android App 使用 Capacitor 框架将 Web 前端包装为原生应用:

```
Web 前端 (public/)
        │
        ▼ npm run android:sync (cap sync)
        │
Android 原生容器 (android/)
        │
        ▼ gradlew assembleDebug
        │
APK 文件 (android/app/build/outputs/apk/debug/)
```

---

## 8. 配置和环境变量

### 8.1 服务端配置

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `PORT` | 3000 | 服务器端口 |
| `AUTH_ENABLED` | true | 是否启用认证 |
| `AUTH_USER` | admin | 认证用户名 |
| `AUTH_PASS` | admin | 认证密码 |
| `TERMLINK_PRIVILEGE_MODE` | standard | 权限模式 (standard/elevated) |
| `TERMLINK_ELEVATED_ENABLE` | false | 启用提权模式 |
| `TERMLINK_ELEVATED_REQUIRE_MTLS` | false | 提权模式要求 mTLS |
| `SESSION_PERSIST_ENABLED` | true | 会话持久化开关 |
| `SESSION_IDLE_TTL_MS` | 86400000 | 空闲会话超时 (24h) |
| `SESSION_MAX_COUNT` | 50 | 最大会话数 |
| `PTY_SHELL` | - | 自定义 Shell 路径 |

### 8.2 Android 配置

```xml
<!-- AndroidManifest.xml 关键配置 -->
<application android:usesCleartextTraffic="true">
    <activity android:name=".MainShellActivity"
        android:launchMode="singleTask"
        android:windowSoftInputMode="adjustResize" />
</application>
<uses-permission android:name="android.permission.INTERNET" />
```

---

## 9. 部署方式

### 9.1 直接运行

```bash
# 安装依赖
npm install

# 开发模式 (nodemon)
npm run dev

# 生产模式
npm start
```

### 9.2 PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs termlink
```

### 9.3 Docker 部署

```bash
# 构建镜像
docker build -t termlink .

# 使用 docker-compose
docker-compose up -d
```

### 9.4 Android 构建

```bash
# 同步 Web 资源
npm run android:sync

# 构建 APK
cd android && ./gradlew assembleDebug

# 安装到设备
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## 10. 安全机制

### 10.1 认证流程

```
┌─────────────┐                    ┌─────────────┐
│   客户端    │                    │   服务端    │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │  1. HTTP Basic Auth              │
       │  Authorization: Basic xxx        │
       │ ────────────────────────────────►│
       │                                  │
       │  2. 返回 WebSocket Ticket        │
       │ ◄────────────────────────────────│
       │                                  │
       │  3. WebSocket 连接               │
       │  ws://host/ws?ticket=xxx         │
       │ ────────────────────────────────►│
       │                                  │
       │  4. 连接确认                      │
       │ ◄────────────────────────────────│
       │                                  │
```

### 10.2 权限模式

| 模式 | 描述 | 适用场景 |
|------|------|----------|
| `standard` | 标准模式，受限的系统访问 | 生产环境 |
| `elevated` | 提权模式，完整的系统访问 | 开发/调试环境 |

### 10.3 mTLS 支持

Android App 支持客户端证书认证:

1. 导入 PKCS#12 证书
2. 存储到 Android Keystore
3. WebView/HTTP 请求自动附加证书

---

## 11. 版本历史

| 版本 | 日期 | 主要变更 |
|------|------|----------|
| 1.0 | - | 初始版本，基础终端功能 |
| 1.5 | - | 添加 Codex AI 集成 |
| 2.0 | - | Android App 发布 |
| 2.5 | - | 添加会话持久化、mTLS 支持 |

---

## 12. 相关文档

- [API 文档](./API.md)
- [部署指南](./DEPLOYMENT.md)
- [Android 开发指南](./ANDROID_DEV.md)
- [Codex 集成说明](./CODEX_INTEGRATION.md)
