---
title: 开发与调试指南
status: active
owner: @maintainer
last_updated: 2026-05-02
source_of_truth: code
related_code: [src/server.js, public/terminal_client.html, android/app/src/main/java/com/termlink/app/MainShellActivity.kt]
related_docs: [docs/guides/android-development.md, docs/guides/deployment.md, docs/ops/ops-checklist.md]
---

# 开发与调试指南

本文档收纳开发、调试、构建验证相关步骤。面向普通安装和使用的教程放在根目录 `README.md`。

## 1. 本地开发服务

安装依赖：

```powershell
npm install
```

创建本地配置：

```powershell
Copy-Item .env.example .env
```

启动带自动重载的开发服务：

```powershell
npm run dev
```

普通前台启动：

```powershell
npm start
```

常用入口：

| URL | 用途 |
| --- | --- |
| `http://localhost:3010/api/health` | 健康检查 |
| `http://localhost:3010/terminal.html` | 浏览器 Terminal 客户端 |
| `http://localhost:3010/codex_client.html` | 浏览器 Codex Workspace 客户端 |
| `http://localhost:3010/workspace.html` | 浏览器 Workspace 页面 |

## 2. 常用开发命令

| Command | Purpose |
| --- | --- |
| `npm run dev` | 使用 `nodemon` 启动本地服务 |
| `npm start` | 使用 `node src/server.js` 启动服务 |
| `npm test` | 运行 Node 测试 |
| `npm run android:sync` | 同步 Web 资源到 Android 工程 |
| `npm run android:open` | 在 Android Studio 打开 Android 工程 |
| `npm run android:check-release-config` | 检查 Android 发布传输配置 |

## 3. Android 真机调试

确认设备在线：

```powershell
adb devices
```

确认本地服务可用：

```powershell
powershell -ExecutionPolicy Bypass -File ./.codex/skills/android-local-build-debug/scripts/ensure-local-server.ps1
```

构建调试 APK：

```powershell
powershell -ExecutionPolicy Bypass -File ./.codex/skills/android-local-build-debug/scripts/build-debug-apk.ps1
```

安装并启动：

```powershell
powershell -ExecutionPolicy Bypass -File ./.codex/skills/android-local-build-debug/scripts/install-debug-apk.ps1 -Serial <adb-serial>
```

Claude 宿主使用同名脚本路径：

```powershell
powershell -ExecutionPolicy Bypass -File ./.claude/skills/android-local-build-debug/scripts/ensure-local-server.ps1
powershell -ExecutionPolicy Bypass -File ./.claude/skills/android-local-build-debug/scripts/build-debug-apk.ps1
powershell -ExecutionPolicy Bypass -File ./.claude/skills/android-local-build-debug/scripts/install-debug-apk.ps1 -Serial <adb-serial>
```

## 4. 仅构建 APK

只需要生成 APK，不安装到设备时：

```powershell
powershell -ExecutionPolicy Bypass -File ./.codex/skills/android-build-apk-copy/scripts/build-apk-and-copy.ps1
```

默认输出到 `E:\project\TermLink`，文件名包含版本和构建时间。

## 5. Android Studio 构建

同步 Web 资源：

```powershell
npm run android:sync
```

打开 Android 工程：

```powershell
npm run android:open
```

在 Android Studio 中执行：

```text
Build > Build Bundle(s) / APK(s) > Build APK(s)
```

调试 APK 输出位置：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 6. 常见排查入口

### Sessions 401

如果 Terminal 仍有输出，但 Sessions 显示 `[AUTH_FAILED] HTTP 401`，通常是 App profile 的 BasicAuth 凭据错误或缺失。

处理路径：

1. 打开 Android `Settings`。
2. 编辑目标 server profile。
3. 设置 `Auth Type = BASIC`。
4. 更新 `Basic Username` 和 `Basic Password`。

### 手机连接本机服务失败

手机连接开发电脑上的服务时，App `Base URL` 不应使用 `localhost`，应使用开发电脑的局域网 IP 或 DNS 名称，例如：

```text
http://192.168.1.20:3010
```

### HTTPS 或 mTLS 失败

优先检查：

1. App `Base URL` 使用的域名或 IP 是否包含在服务端证书 SAN 中。
2. Android 是否信任签发服务端证书的 CA。
3. mTLS profile 是否已导入正确的 `.p12` / `.pfx`。
4. App profile 的 `Allowed Hosts` 是否包含当前服务端 host。
5. 如果使用 Nginx mTLS，后端 Node 端口是否没有被直接暴露。

更多 Android 构建和配置细节见 `docs/guides/android-development.md`。
