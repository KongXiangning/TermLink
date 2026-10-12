# 本轮测试运行范围与原始日志

代码对象：bb4849692fd600c3eb57866e28400fba612ee6aa，当前dot云端共享电脑独立checkout；Node v24.19.0。未修改业务源码，未提交/推送。

## Web / Workspace / 发行组合

命令：timeout 180 node --test tests/workspace*.test.js tests/basicAuth.browserSession.test.js tests/login.web.test.js tests/uiFoundation.web.test.js tests/sessions.web.test.js tests/crossPageCompatibility.web.test.js tests/linuxInstallerConfig.test.js tests/directMtlsInstaller.test.js tests/nginxMtlsTool.test.js tests/windows-release*.test.js

实际退出1，108项：96通过、12失败、0 skipped，约1.9秒。原始输出web-workspace-release.tap（Node自动spec reporter，不伪称TAP格式）。

- workspace三个文件（routes/web/compare）全部通过，含实际临时目录/Git仓库、API处理及JSDOM；不是新Android真机/浏览器视觉验收
- browserSession9项、login7项通过
- 2个静态断言不适用当前实现：crossPageCompatibility写死640px而当前workspace用899/420px；uiFoundation写死terminal.css?v=7而当前v8仍在foundation之后。保留失败，不修改测试、不视为当前UX必然不满足
- 4个directMtlsInstaller测试被此宿主os.networkInterfaces/uv_interface_addresses系统限制阻断；不是证书功能失败证据
- 6个Windows执行测试在Linux无Windows PowerShell/GUI/runtime宿主条件，不能形成clean-host验收

## 依赖和执行环境

npm ci --ignore-scripts在独立repo安装237包成功；仅项目node_modules和上级npm-cache。
node-pty第一次rebuild因默认/home/agent/.cache/node-gyp不可写失败；使用项目内npm_config_devdir后成功。未改变全局配置。
无bun、cargo、adb；JDK21有，但Android SDK/项目要求Windows路径不可用。未假装跑Android JVM/APK/真机或Rust编译。
其余组各自原始日志另存，同一测试重试/过滤不可把数量相加冒充唯一用例数或全套通过。

## 未运行/历史边界

未跑全量npm test；TD004已有三个文件挂起历史，定向测试可独立支持所述行为。不把未跑全量当所有需求未知，也不把局部通过推广全需求。
原历史报告/附件存在性、原版本、当前适用性由逐项报告分别判定；没有新发布、服务安装、实际设备或外部host验证。
