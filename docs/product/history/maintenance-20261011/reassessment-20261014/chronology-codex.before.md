# 831→833→832与868：实际先后及旧失败取代范围

基线：`a78fe55e033bbcb6db816acd2c801de5aa28a081`。只读历史、Git与源码hash核对；没有新运行验证。

## 可直接用于排序的结论

- 831实际在10月2–4日执行；832诊断后10月5日显式拆出833，833在10月6日交付关闭，再明确恢复832。不能按TASK-202608xx编号或旧架构“待交付”排序。
- 833解决H1合法增长/H3委派输入与Node事务基础；832随后解决H2父来源、真实保存时的UTF8跨块、手机详情alias。保留三类指定样本成果，不重做已完成前置。
- 10/13实测4d586+F148 APK发现的options、Skills、文档传输、PDF、终端、大详情失败在之后3d72中没有被修复。
- 868只解决连接恢复旧提示和registration不存在/撤销判定；close之后才提交。旧报告“未提交”仅指当时，不能误当a78尚未包含修复。

## 关键实际时间（UTC）

|原事件登记时间|实际发生的阶段|判断边界|
|---|---|---|
|10-02 15:31:07.254|005带缺口关闭；18:39:52.973采纳831|1900字节详情已有成果，不能推全E2E|
|10-02 20:04:55.559至10-04 16:10:14.785|831 S2–S6并关闭|三类保存失败、预算/提示/registration观察及older/E07/resend缺口保留|
|10-04 18:36:37.876；10-05 05:52:07.395|832计划、明确拆出共享前置833|S2是范围选择，尚非产品修复|
|10-05 06:29:35.050；10-06 12:21:47.221；16:10:36.692|833采纳、S5真实产品事务交付、关闭|H1/H3先完成；不等于H2或真实手机全PASS|
|10-06 17:03:19；18:21:46.932；18:50:46.365|832显式S2完成后继续H2窗口修复、产品保存|833关闭不自动切焦点，需看明确恢复|
|10-07 16:50:56.041；18:11:26.943；10-08 07:06:14.461|832 UTF8实际修复、手机alias及三类重验、关闭|N11/2ref、C22/4、A40/9；手机每类仅选一详情|
|10/13报告日，旧对象4d586/F148|Android/联合真实验收|新场景失败不能由旧小样本通过抹去|
|10-13 03:23:30.705；04:24:29.770；04:45:40.680；06:50:18.671|868采纳、S1最终、S2、S3局部真机/网络结果|新APK d64a…e13，仅两个repair范围|
|10-13 07:25:17.601；07:57:42|868 close；随后3d72提交|未提交working copy经manifest对应后来提交|

登记时间是原recorded_at，不是精确运行起止；执行对象可能是所列HEAD加未提交修改。精确事件ref和source_revision见同名JSON。

## 完整Git链与祖先核验

- `2c9ff5e5e5574dc34ab5c6280f30634b15e6394f` · 2026-10-02T15:38:30+00:00 · chore(workflow): checkpoint Task 005 validation and closure evidence
- `1d762bb3f8ed3f0f972a47b7edb78f0615220e7f` · 2026-10-04T16:14:25+00:00 · chore(workflow): checkpoint task closure evidence
- `6e04e4ad07c73897683a95265f15eade042e9076` · 2026-10-05T16:27:51+00:00 · feat(codex): add shared history wire compatibility closure
- `7ce1d08e6dbb7863d5b95fb992086f1b37637488` · 2026-10-06T06:43:54+00:00 · feat(rust): add delegated event and target compatibility
- `f2fc146d7a5099f9871f3af8e6a1cd3ee52b59b8` · 2026-10-06T11:52:45+00:00 · fix(history): gate delegated promotion by durable evidence
- `589a62a78c6214fea13e7c5eecac5466d64d7a5d` · 2026-10-06T16:19:18+00:00 · test(history): record product delivery persistence evidence
- `714379dafa7eedb3517d5d0550518faca969966c` · 2026-10-06T18:39:59+00:00 · fix(history): repair branch lineage reads
- `32c6b66179ac314321540fab3b0a82b56050e317` · 2026-10-07T03:37:56+00:00 · test(history): add branch product delivery regression
- `488dc6c9e597ef096f617d17499fa8e048306c06` · 2026-10-07T17:07:22+00:00 · fix(history): preserve UTF-8 analyzer output across chunks
- `0618cafcb12f73d33b8699b8d9bfa76b4ee55e1e` · 2026-10-08T07:19:55+00:00 · fix(android): preserve history tool detail refs
- `4d586e0f2dab1fef9d2c273b770796b63a7d873d` · 2026-10-12T16:21:09+00:00 · chore(vnext): upgrade runtime to 0.24.8
- `3d72aac95a1f8bfc7fe3089797e868c28a185454` · 2026-10-13T07:57:42+00:00 · fix: clear recovered connection hints and reject invalid registrations
- `d3b71779ecd4ad2aa52cfd04738995030dabd0a6` · 2026-10-14T07:24:34+00:00 · chore(vnext): upgrade runtime to 0.24.10
- `a78fe55e033bbcb6db816acd2c801de5aa28a081` · 2026-10-14T16:45:58+00:00 · chore(vnext): upgrade runtime to 0.24.11

上述14提交均为a78祖先，按Git图相邻13对均通过只读merge-base --is-ancestor。868 S3的13文件在3d72与a78均与manifest完全同hash；3d72→a78无android/src/public/native业务差异。

## 明确取代与保留

- 833/832取代“当前普通/Branch/委派普遍无法保存”和指定N/C缺详情入口；不改写831原八次失败为八次成功，不证明全部详情、深分页、大详情复制、完整E07/resend。
- 868取代已测作用域的旧连接提示残留及registration存在性缺陷；不取代Plan/user-question options、多Skills覆盖、content://不可访问、PDF加载、终端IO/重连、大详情入口失败。
- 旧v1已发布格式迁移：用户明确排除，技术未修；DEFER-002：已接受后置；B/Q：保留预算fail-closed。均不自动重开、扩预算或变成全局gate。

## 排序建议

1. 先处理10/13已证实且未被后续代码修复的用户阻断；options为Plan/Approval共因，其他独立组件可并行。
2. 复用现有Node持久投影及832成果，继续原005/831手机older durable ACK和迟到隔离定位。
3. 服务重启元数据、模型/跨cwd旧UI版本桥、mTLS下载、slash/媒体/清理先查既有证据，未知不等于未实施。

## 主要原件

- `docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md`
- `docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md`
- `docs/product/history/maintenance-20261011/TASK832-close-report.md`
- `docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md`
- `docs/product/history/maintenance-20261011/joint-validation-20261013/验收报告.md`
- `docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json`
- `docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md`

完整事件/早期背景另保存在外部chronology-codex-detailed.json；不新增任务、绑定或需求。
