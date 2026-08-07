# TermLink 版本维护约定

## 唯一产品版本

`package.json.version` 是 TermLink 产品版本的唯一来源，使用 SemVer（例如
`1.2.3`）。服务端 `/api/health`、Android `versionName`、设置页版本标志都从这里读取，不能在这些位置再写一份版本号。

Android 的 `versionCode` 是另一个独立的发布计数器，保存在同一个 `package.json` 的
`androidVersionCode` 字段中。它必须是正整数，并且每次发布 Android APK 时递增；它不是数据库、缓存或协议 schema 版本。

下列版本域继续独立维护，不随 App 发版自动修改：SQLite `user_version`、缓存/History schema、IPC method version、服务端存储版本和 canonical root hash schema。只有对应格式或协议真正变化时才递增。

## 日常操作

修改产品版本时只执行：

```bash
npm run version:bump -- 1.0.1
```

命令会同时更新 `package.json`、`package-lock.json`，并递增 Android `versionCode`。如发布流程需要指定某个更大的 Android code，可显式传入：

```bash
npm run version:bump -- 1.0.1 --android-code 42
```

如果只是同一产品版本重新构建 APK（例如修复签名或重新发布构建产物），可以只递增 Android code：

```bash
npm run version:bump -- 1.0.0 --android-code 2
```

不应手工编辑 Android `build.gradle` 中的 `versionName`/`versionCode`。

## 自动门禁

- `npm run version:check` 校验 SemVer、Android code、lockfile 和 Gradle 的单一来源关系。
- 如果当前工作树修改了产品版本，校验还会要求 Android `versionCode` 相对 `HEAD` 递增，避免 AI 只改了一个文件。
- `npm test` 会先执行 `version:check`；因此普通 AI 改动回归也会发现版本漂移。
- Android Gradle 构建会直接读取并校验根 `package.json`，版本元数据缺失或非法时构建失败。
- Windows/Linux 发布构建的 npm 生命周期也会先执行 `version:check`。
- 发布 CI 在打包前再次执行 `version:check`，并要求 Git tag 为 `v<package.json.version>`。

App 设置页显示 `TermLink <version> (code <versionCode>)`，持久诊断日志也记录相同的版本字段，便于真机问题与 APK 对应。
