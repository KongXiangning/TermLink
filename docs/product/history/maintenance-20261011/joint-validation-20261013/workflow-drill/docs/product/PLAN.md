---
{
  "schema": "vnext-product-doc/v3",
  "items": [
    {
      "id": "PLAN-DRILL",
      "type": "plan",
      "intent_state": "adopted",
      "targets": [
        {
          "target": "REQ-DRILL",
          "coverage": "隔离demo文件"
        }
      ],
      "work_items": [
        {
          "id": "S1",
          "title": "演练文件",
          "outcome": "demo.txt=DRILL",
          "scope": "隔离目录",
          "targets": [
            {
              "target": "REQ-DRILL",
              "coverage": "全部演练内容"
            }
          ],
          "state": "included",
          "origin": "initial"
        }
      ]
    }
  ]
}
---

## [PLAN-DRILL] 演练计划
### 实施策略
只做S1。
### 阶段与工作项说明
S1 done：demo.txt=DRILL，实际验证通过。
### 调整与未决事项
无其他实施。
