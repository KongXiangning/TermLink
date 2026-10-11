# 2026-10-11 产品文档定向完善与实施者复核

## 范围与基线

项目：E:/coding/TermLink-rust-source-resolution-codex。采用当前工作副本字节为基线；初始工作区干净。本轮只维护产品文档与必要PRODUCT登记，未操作Task生命周期、业务实现、设备/服务、提交或发布。

## 确定性核对

- installed helper read/check返回可读/checked，所登记路径coverage.complete=true；不可用对象0。此结果不证明业务完整或交付通过。
- 总目标解析为GOAL-TERMLINK；登记需求26项，未登记0；与维护前需求文档条目顺序逐项一致。planned/candidate/retired身份未删除。
- 当前有效关系23条；保留的推断关系不伪装为正式图边。
- 26项需求正文逐字保留；原26份评估元数据和正文保留，新报告另存。所有原对象ID仍在。
- 6份新报告均按明确target/goal/scope/subject回读选中，定义/目标快照摘要可解释且无selection reasons。

| 报告 | 选择结果 |
| --- | --- |
| AS-V3-TERMLINK-OVERALL | undetermined |
| AS-V3-TERMLINK-MOBILE | undetermined |
| AS-V3-TERMLINK-TTL | not-satisfied |
| AS-V3-TERMLINK-CONTINUITY | undetermined |
| AS-V3-TERMLINK-HISTORY-SAMPLES | undetermined |
| AS-V3-TERMLINK-HISTORY-PIPELINE | undetermined |

## 按完整方案7.1.1复核

执行主体：本轮实施Agent的自审，不冒称独立审查。

1. 机器消费：检查根目标、顺序、关系、v2需求/v3报告混合读取及13份报告各自定位（本项目6份）；总目标不从首个current推断，顺序不来自Task或依赖；目标范围先登记再产报告。
2. 业务判断：旧PASS不自动转换；LawAgent的C5限定对象与当前平台分开，TermLink静态默认TTL与线上部署分开；局部已知成果+未知余项使用undetermined。没有增加KPI、审批、状态机、验收Task或全项目测试。
3. 已选取舍：保留旧报告、推断关系和无法确认的来源；目标摘要保守核对不当作业务成果失效。未做新Agent行为验收，不以结构检查保证未来AI遵循。

## 已知诊断与未决范围

本次确认支撑关系参与定义摘要，旧v2报告新增21条DEFINITION_CHANGED提示；需求正文和验收未改，提示不表示原业务成果消失。原报告完整保留，修改前需求/目标快照可恢复；仅本次范围的v3报告使用新定义依据，不批量重签其他旧PASS。

原16条PENDING_SOURCES和12条TASK_ID_UNCONFIRMED仍保留。默认24h与6h回退有实际静态证据，作为窄范围not-satisfied；代码修复不属于本轮文档授权。原三样本通过保留，当前副本与被测未提交改动的对应仍未知。文档治理需求的目标关系、planned Relay与整体的层次未猜补。

仍为推断关系的需求：REQ-20260306-codex-app-repair-plan、REQ-20260413-relay-control-plane-and-transparent-transit、REQ-TERMLINK-ENHANCEMENT-CANDIDATES、REQ-TERMLINK-HISTORY-BANNER。没有为缺少子层级而拆分新需求。未声明评估范围或未产新报告的需求继续按旧材料阅读/尚未判定；不声称已完成全项目业务盘点。

结论：本轮已保存的结构和报告符合上述边界；已知业务/历史缺口保留，无需为使文档显示全绿而清除诊断。
