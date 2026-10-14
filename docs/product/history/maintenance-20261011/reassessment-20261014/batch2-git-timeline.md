# 第2批后续实现与旧证据适用时间线

所有列明commit均已用git merge-base --is-ancestor确认属于a78fe55；是静态Git核对，不是运行测试。精确SHA/作者日期/parent在batch2-git-timeline.json。应分开“原需求/CR标签日期、实际commit日期、报告运行对象”，不能用Task编号或旧状态排执行顺序。

1. 会话保留：67bc2c3（2026-02-23 21:26+08）实现可配置6h/idle-LRU；其直接子提交f4ce64f（02-24 00:22+08）修复显式空sessionId被当缺省创建，CR0023保存6/6。1899f6d实际提交于03-07 00:25+08，虽然CR标题日期为02-24，仅.env TTL示例改86400000，不能据标题把6h代码fallback当后续漏修。当前定义明确只核配置/文档增量，10/13retention5/5又给真实manager/PTY受控时间及timer证据。TTL改satisfied，不要求自然24h墙钟。
2. 权限：a6ceeec（02-24 14:56+08）后经合并88511406，76e76f8（02-24 16:20+08）恢复elevated配置、安全门禁和audit接线。9ccfd3d1（03-31 09:08+08）追加IPv6/CIDR、连接END关联、10MiB轮转/5备份和审计50MiB磁盘门禁，报告22/22；直接后修复5b32acaa（09:15+08）补malformed IPv6/null匹配与轮转竞态，报告23/23。因此2月“仅IPv4”“没有END”不能机械延续当前；仍没有拒绝trace/会话CRUD formal audit，不等整体权限全满足。来源：CR0300/CR1602、两次3月commit及当前auditService/ipCheck/gateway。
3. External：ab47cb8（02-24 22:44+08）为POC，原CR当时只有编译/构建，不是未开始。d675956（03-27 01:40+08）含MainShell/ProfileCommitRefreshResolver及mTLS流程，CR-20260327-0100描述刷新repair；10/13现设备CRUD/force-stop和错误凭据→改正闭环在ANDROID#46/#47，超越早期无真机边界；地址变更/删除当前Profile的完整重载范围仍未被会话删除场景覆盖。
4. 终端：2d1c83ba（07-30 15:20+08）实际重写触摸惯性/capture处理、增加256KiB PTY snapshot和连接时先snapshot后直播、缓存executor关闭保护；c5e73d01（16:15+08）加长按选择/复制粘贴且与拖动隔离。不能只从2/3月滚动CR推当前验证缺失。10/13文字区/空白/IME滚动已成功；同日首次Ctrl/应答污染/终端Wi-Fi恢复明确失败，且4d586e→当前终端源未变，失败保留。3月CR0155的commit_ref 56739f1在当前已取得Git对象中无法解析，不伪造祖先身份；最新源码和实测不依赖该短ref。
5. registration与Codex提示：98174ac4（07-30 17:25+08）新增registration隔离、SessionStore v3、HTTP/WS/workspace接线。10/13旧联合报告对象4d586e；其直接子提交3d72aac9（10-13 15:57+08）为真实TASK-20260868修复，S1提示来源/恢复与S2 isActive未知ID误放行，S3限定UI+23网络检查；源manifest13文件及server接线与a78当前匹配。后续d3b71779和a78只是workflow runtime升级，4d586e→a78产品差异仅四个Codex Kotlin+clientRegistrationManager。故旧提示和registration失败已被局部修复覆盖；Plan、多Skills、文档、大详情、终端恢复、Web Docs、PDF、i18n等不在该修复范围，不能因Task关闭而抹掉。

主要原件定位：
- docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md
- docs/changes/records/CR-20260224-0000-session-ttl-24h.md
- docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md
- docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md
- docs/product/assessments/ANDROID-20261013.md
- docs/product/assessments/JOINT-20261013.md
- docs/product/history/maintenance-20261011/task20260868-s2/report.md
- docs/product/history/maintenance-20261011/task20260868-s3/report.md
- docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json
- docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md
