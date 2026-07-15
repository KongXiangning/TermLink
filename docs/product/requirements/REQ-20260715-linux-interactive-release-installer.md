---
title: Linux 交互式 Release 安装器
status: active
owner: @maintainer
last_updated: 2026-07-15
source_of_truth: product
related_code: [install.sh, scripts/install/linux, scripts/release, scripts/certs]
related_docs: [docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md, docs/guides/deployment.md]
---

# REQ-20260715-linux-interactive-release-installer

## Meta

- id: REQ-20260715-linux-interactive-release-installer
- title: Linux 交互式 Release 安装器
- priority: P0
- status: in_progress
- owner: @maintainer
- target_release: v1.0.0
- links: docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md

## 1. 背景与目标

用户应能从 GitHub Release 下载 Linux tar.gz，解压后执行一条安装命令，通过交互回答必填/常用配置，完成运行依赖、systemd、HTTP/TLS/mTLS、证书和安全升级配置，并在结束时获得访问与配置位置。

## 2. In Scope

- Debian/Ubuntu systemd，amd64/arm64。
- 根级交互安装入口、非交互 config 与 dry-run。
- FHS 风格 versioned install、安全升级与健康失败回滚。
- HTTP、direct mTLS、Nginx mTLS；自动本地 CA 或导入服务端 PEM。
- P12/PEM 客户端凭据和 CA 公共证书交付。
- `v<semver>` 标签自动 GitHub Release。

## 3. Out of Scope

- 非 systemd Linux、容器编排、Let's Encrypt、自动 root/elevated 终端、Windows installer 重构。

## 4. 方案概要

复用现有 release layout、TLS listener 和证书模块，新增 Bash bootstrap、Node 交互配置 helper、标准目录安装事务、Nginx renderer 和 GitHub Actions release workflow。

## 5. 接口/数据结构变更

- 新增 `install.sh` CLI：interactive、`--config --non-interactive`、`--dry-run`。
- install config additive 增加 run user、bind host、证书来源、SAN、客户端名称和系统目录。
- 新增服务监听 host 环境变量；未配置时保持兼容。

## 6. 验收标准

- 与 `docs/workflow/CURRENT_TASK.md` 验收标准一致。
- 安装结束输出 URL、配置、证书、systemd unit、日志和健康结果。

## 7. 测试场景

- HTTP 强认证、direct mTLS、Nginx mTLS、证书导入/生成、无客户端证书拒绝、升级成功与失败回滚、release tar/tag gate。

## 8. 风险与回滚

- 网络依赖、原生模块编译、证书权限、Nginx/systemd 失败；通过 dry-run、配置备份、versioned symlink 和 health rollback 控制。

## 9. 发布计划

- 完成测试后推送与 `package.json` 一致的 `v<semver>` 标签，由 Actions 创建 tar.gz + SHA256 Release。
