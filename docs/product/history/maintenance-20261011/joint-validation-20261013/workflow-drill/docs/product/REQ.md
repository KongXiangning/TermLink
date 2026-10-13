---
{
  "schema": "vnext-product-doc/v3",
  "items": [
    {
      "id": "REQ-DRILL",
      "type": "requirement",
      "scope": "planned",
      "sources": [
        {
          "kind": "text",
          "label": "隔离演练授权",
          "text": "用户本轮要求在隔离项目演练需求登记、计划、变更和收尾，核对导航与唯一活动任务。此演练仅生成虚构验收材料，不是TermLink功能交付。"
        }
      ],
      "links": [
        {
          "id": "L-REQ-GOAL",
          "relation": "supports",
          "target": "GOAL-DRILL",
          "origin": "declared",
          "state": "active"
        }
      ]
    }
  ]
}
---

## [REQ-DRILL] 演练需求
### 需求内容
生成demo.txt，仅用于演练。
### 范围边界
无真实产品功能修改。
### 验收要求
文件为DRILL，计划/CR/收尾同指S1，CR commit_ref可解析。
