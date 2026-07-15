# PLAN-20260715-linux-interactive-release-installer

## Goal

交付可从 GitHub Release 下载并一条命令启动的 Debian/Ubuntu Linux 安装器。

## Progress

- [x] P1：需求、范围和安全取舍确认。
- [x] P2：交互配置与标准目录安装事务。
- [x] P3：direct/Nginx mTLS 与证书交付。
- [x] P4：GitHub Release workflow 与跨平台 tar。
- [ ] P5：自动化与文档已完成；等待 Debian/Ubuntu systemd、arm64 和真实 tag Release 外部 smoke 后 closeout。

## Implementation Checklist

- [x] 根级 `install.sh` 负责 OS/root/systemd/依赖 bootstrap 与 wizard 分发。
- [x] wizard 生成兼容 install config，按 transport 条件校验必填项与认证策略。
- [x] `/opt/termlink/releases/<version>` + `current` symlink，配置/数据外置并支持回滚。
- [x] direct/nginx 模式生成或导入服务端证书，统一生成客户端 P12/PEM/CA bundle。
- [x] Nginx 配置 loopback backend、WS、mTLS、trusted proxy secret。
- [x] release builder 输出根级入口和 portable tar，tag workflow 生成 checksum。
- [x] tag workflow 版本校验、测试、build、Release upload。
- [x] tests/docs/CR 同步；真实宿主 smoke 作为发布后证据保留。

## Acceptance

以 `REQ-20260715-linux-interactive-release-installer` 和 `docs/workflow/CURRENT_TASK.md` 为准。
