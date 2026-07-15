---
title: Linux 交互式 Release 安装器
status: draft
record_id: CR-20260715-1635-linux-interactive-installer
req_id: REQ-20260715-linux-interactive-release-installer
commit_ref: TBD
owner: @maintainer
last_updated: 2026-07-15
source_of_truth: code
related_code: [install.sh, scripts/install/linux, scripts/release, scripts/certs]
related_docs: [docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md, docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md]
---

# CR-20260715-1635-linux-interactive-installer

## 1. 变更意图（Compact Summary）

- 背景：现有 Linux release 需手工编辑 JSON 且在解压目录原地运行。
- 目标：提供 GitHub Release 一条命令交互安装、mTLS 交付和安全升级。
- 本次边界：Debian/Ubuntu systemd；不含 Let's Encrypt、非 systemd 和 root elevated terminal。
- 本批覆盖计划项：P2-P4 已完成；P5 本地部分完成，外部发布 smoke 待补。

## 2. 实施内容（What changed）

1. 新增根级 `install.sh` 和双语 Node wizard，支持交互、非交互、dry-run、依赖安装和条件必填校验。
2. Linux systemd 安装改为 `/opt/termlink/releases/<version>`、`current` symlink、`/etc/termlink`、`/var/lib/termlink`，服务拒绝 root 身份并在失败时回滚。
3. direct/Nginx 支持自动本地 CA 或导入服务端 PEM；自动生成并交付客户端 PEM/P12、密码文件与公共 CA，升级复用已有证书。
4. Nginx renderer 配置 loopback backend、WebSocket、mTLS verify 和 trusted proxy secret；服务端新增可选 bind host。
5. Linux release 改用当前平台 `tar`，归档包含可执行根入口；新增 `v*` tag workflow、版本门禁、SHA256 和 GitHub Release 上传。
6. Capacitor 构建依赖移至 devDependencies，缩小 Linux production install 依赖面；README 中英文同步安装方式和目录。

## 3. 影响范围（Files/Modules/Runtime）

- 文件：release/install/cert scripts、server listen、tests/docs/workflow。
- 模块：Linux bootstrap、systemd、Nginx、PKI、GitHub Release。
- 运行时行为：新增安装入口；现有 API/WS payload 保持不变。

## 4. 回滚方案（命令级）

```bash
git revert <commit_ref>
sudo ln -sfn /opt/termlink/releases/<previous> /opt/termlink/current
sudo systemctl restart termlink.service
```

## 5. 验证记录（Tests/Checks）

- `bash -n install.sh scripts/install/linux/*.sh`：通过。
- `node --test tests/linuxInstallerConfig.test.js tests/releaseLayout.test.js tests/directMtlsInstaller.test.js tests/nginxMtlsTool.test.js tests/tlsConfig.test.js`：33/33 通过。
- `./install.sh --config <temp> --non-interactive --dry-run`：通过，敏感字段脱敏。
- 实际 OpenSSL 生成后执行 `openssl verify`（server/client）和 P12 解析：通过。
- `npm run release:build:linux`、`sha256sum -c`、tar 内容/执行位检查：通过。
- `node --check src/server.js`、`git diff --check`：通过。
- `npm audit --omit=dev`：锁文件安全升级后 0 vulnerabilities。
- 结果：本地门禁通过；当前环境无 systemd runtime/Nginx/arm64，真实 tag Release 尚未创建。

## 6. 后续修改入口（How to continue）

- 从 `install.sh`、`scripts/install/linux/`、`scripts/certs/`、`scripts/release/` 继续。
- 如本记录后续被替代，请填写：`替代记录: CR-YYYYMMDD-HHMM-<slug>`

## 7. 风险与注意事项

1. 安装需网络访问 APT/npm；证书私钥不得进入 Release 或 Git。
2. 真实 GitHub Release 和 arm64 systemd smoke 需要外部环境证据。
