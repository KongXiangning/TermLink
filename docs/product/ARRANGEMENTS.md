---
{
  "schema": "vnext-product-doc/v2",
  "items": [
    {
      "id": "PLAN-20260415-relay-control-plane-refactor-freeze",
      "type": "plan",
      "intent_state": "adopted",
      "targets": [
        {
          "target": "REQ-20260413-relay-control-plane-and-transparent-transit",
          "coverage": "首期Relay冻结改造安排"
        }
      ],
      "work_items": [
        {
          "id": "RELAY-GOVERNANCE",
          "title": "切换与回滚治理",
          "outcome": "明确单一ticket签发主权、未消费ticket失效与活动连接治理",
          "scope": "明确单一ticket签发主权、未消费ticket失效与活动连接治理",
          "targets": [
            {
              "target": "REQ-20260413-relay-control-plane-and-transparent-transit",
              "coverage": "明确单一ticket签发主权、未消费ticket失效与活动连接治理"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md",
              "sha256": "01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"
            }
          ]
        },
        {
          "id": "RELAY-SUBJECTS",
          "title": "拆认证主体",
          "outcome": "区分admin_user/app_client/connector认证及审计",
          "scope": "区分admin_user/app_client/connector认证及审计",
          "targets": [
            {
              "target": "REQ-20260413-relay-control-plane-and-transparent-transit",
              "coverage": "区分admin_user/app_client/connector认证及审计"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md",
              "sha256": "01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"
            }
          ]
        },
        {
          "id": "RELAY-TICKET",
          "title": "访问票据",
          "outcome": "绑定App主体、service、ingress、target identity与version",
          "scope": "绑定App主体、service、ingress、target identity与version",
          "targets": [
            {
              "target": "REQ-20260413-relay-control-plane-and-transparent-transit",
              "coverage": "绑定App主体、service、ingress、target identity与version"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md",
              "sha256": "01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"
            }
          ]
        },
        {
          "id": "RELAY-STATE",
          "title": "独立控制面状态",
          "outcome": "inventory/published service/policy/audit不塞入TermLink session",
          "scope": "inventory/published service/policy/audit不塞入TermLink session",
          "targets": [
            {
              "target": "REQ-20260413-relay-control-plane-and-transparent-transit",
              "coverage": "inventory/published service/policy/audit不塞入TermLink session"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md",
              "sha256": "01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"
            }
          ]
        },
        {
          "id": "RELAY-ANDROID-ENTRY",
          "title": "Android寻址",
          "outcome": "拆传输ingress与目标身份",
          "scope": "拆传输ingress与目标身份",
          "targets": [
            {
              "target": "REQ-20260413-relay-control-plane-and-transparent-transit",
              "coverage": "拆传输ingress与目标身份"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md",
              "sha256": "01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"
            }
          ]
        },
        {
          "id": "RELAY-BINDING-CACHE",
          "title": "App绑定与缓存",
          "outcome": "稳定主体/service标识存储与cache key",
          "scope": "稳定主体/service标识存储与cache key",
          "targets": [
            {
              "target": "REQ-20260413-relay-control-plane-and-transparent-transit",
              "coverage": "稳定主体/service标识存储与cache key"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md",
              "sha256": "01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"
            }
          ]
        },
        {
          "id": "RELAY-CLAIM-DISCOVERY",
          "title": "认领与发现",
          "outcome": "claim/binding/discovery/ticket客户端接口",
          "scope": "claim/binding/discovery/ticket客户端接口",
          "targets": [
            {
              "target": "REQ-20260413-relay-control-plane-and-transparent-transit",
              "coverage": "claim/binding/discovery/ticket客户端接口"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md",
              "sha256": "01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"
            }
          ]
        },
        {
          "id": "RELAY-COMPAT-AUDIT",
          "title": "兼容与审计",
          "outcome": "版本协商、拒绝类别、ticket生命周期与主体/对象/原因审计",
          "scope": "版本协商、拒绝类别、ticket生命周期与主体/对象/原因审计",
          "targets": [
            {
              "target": "REQ-20260413-relay-control-plane-and-transparent-transit",
              "coverage": "版本协商、拒绝类别、ticket生命周期与主体/对象/原因审计"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md",
              "sha256": "01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"
            }
          ]
        }
      ],
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md",
          "sha256": "01e097b5928fb6f045c49eb495a1677e6b32c57d0197da1afc84dfe2b3de88c4"
        }
      ],
      "extensions": {
        "source_identity": "沿用原PLAN名称及原阶段ID；原无工作项ID处本次赋稳定展示ID",
        "execution_authority": "资料展示；不替代Runtime plan_ref或启动任何task"
      }
    },
    {
      "id": "PLAN-20260715-linux-interactive-release-installer",
      "type": "plan",
      "intent_state": "adopted",
      "targets": [
        {
          "target": "REQ-20260715-linux-interactive-release-installer",
          "coverage": "Linux交互安装器既有P1–P5安排"
        }
      ],
      "work_items": [
        {
          "id": "P1",
          "title": "需求与安全范围",
          "outcome": "Debian/Ubuntu/systemd及权限/证书取舍明确",
          "scope": "Debian/Ubuntu/systemd及权限/证书取舍明确",
          "targets": [
            {
              "target": "REQ-20260715-linux-interactive-release-installer",
              "coverage": "Debian/Ubuntu/systemd及权限/证书取舍明确"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md",
              "sha256": "1cd5fec5d98eaed07ff62b7ebda7dd7c68d252123cc3e974f7a1cda94875c20a"
            }
          ]
        },
        {
          "id": "P2",
          "title": "交互及标准安装事务",
          "outcome": "wizard、版本目录与升级失败回滚",
          "scope": "wizard、版本目录与升级失败回滚",
          "targets": [
            {
              "target": "REQ-20260715-linux-interactive-release-installer",
              "coverage": "wizard、版本目录与升级失败回滚"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md",
              "sha256": "1cd5fec5d98eaed07ff62b7ebda7dd7c68d252123cc3e974f7a1cda94875c20a"
            }
          ]
        },
        {
          "id": "P3",
          "title": "mTLS证书交付",
          "outcome": "direct/Nginx、生成/导入及客户端P12/PEM/CA",
          "scope": "direct/Nginx、生成/导入及客户端P12/PEM/CA",
          "targets": [
            {
              "target": "REQ-20260715-linux-interactive-release-installer",
              "coverage": "direct/Nginx、生成/导入及客户端P12/PEM/CA"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md",
              "sha256": "1cd5fec5d98eaed07ff62b7ebda7dd7c68d252123cc3e974f7a1cda94875c20a"
            }
          ]
        },
        {
          "id": "P4",
          "title": "Release产物",
          "outcome": "跨平台tar、tag版本门禁/checksum/workflow",
          "scope": "跨平台tar、tag版本门禁/checksum/workflow",
          "targets": [
            {
              "target": "REQ-20260715-linux-interactive-release-installer",
              "coverage": "跨平台tar、tag版本门禁/checksum/workflow"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md",
              "sha256": "1cd5fec5d98eaed07ff62b7ebda7dd7c68d252123cc3e974f7a1cda94875c20a"
            }
          ]
        },
        {
          "id": "P5",
          "title": "外部验收与文档收口",
          "outcome": "本地自动化、Debian/Ubuntu实际systemd/Nginx、arm64与真实tag Release smoke",
          "scope": "本地自动化、Debian/Ubuntu实际systemd/Nginx、arm64与真实tag Release smoke",
          "targets": [
            {
              "target": "REQ-20260715-linux-interactive-release-installer",
              "coverage": "本地自动化、Debian/Ubuntu实际systemd/Nginx、arm64与真实tag Release smoke"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md",
              "sha256": "1cd5fec5d98eaed07ff62b7ebda7dd7c68d252123cc3e974f7a1cda94875c20a"
            }
          ]
        }
      ],
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md",
          "sha256": "1cd5fec5d98eaed07ff62b7ebda7dd7c68d252123cc3e974f7a1cda94875c20a"
        }
      ],
      "extensions": {
        "source_identity": "沿用原PLAN名称及原阶段ID；原无工作项ID处本次赋稳定展示ID",
        "execution_authority": "资料展示；不替代Runtime plan_ref或启动任何task"
      }
    },
    {
      "id": "PLAN-20261005-codex-history-save-repair",
      "type": "plan",
      "intent_state": "adopted",
      "targets": [
        {
          "target": "REQ-20261005-codex-history-save-repair",
          "coverage": "三类历史保存修复原采纳安排"
        }
      ],
      "work_items": [
        {
          "id": "S1",
          "title": "三项定位",
          "outcome": "H1增长冲突、H2分支来源、H3委派解析分别诊断",
          "scope": "H1增长冲突、H2分支来源、H3委派解析分别诊断",
          "targets": [
            {
              "target": "REQ-20261005-codex-history-save-repair",
              "coverage": "H1增长冲突、H2分支来源、H3委派解析分别诊断"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20261005-codex-history-save-repair.md",
              "sha256": "71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"
            }
          ]
        },
        {
          "id": "S2",
          "title": "锁定修复范围",
          "outcome": "具体Rust/Node/手机行为与回归范围",
          "scope": "具体Rust/Node/手机行为与回归范围",
          "targets": [
            {
              "target": "REQ-20261005-codex-history-save-repair",
              "coverage": "具体Rust/Node/手机行为与回归范围"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20261005-codex-history-save-repair.md",
              "sha256": "71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"
            }
          ]
        },
        {
          "id": "S3",
          "title": "Rust定位与继承",
          "outcome": "H2物理父来源、绑定/cut、有界窗口；H3共享成果复用",
          "scope": "H2物理父来源、绑定/cut、有界窗口；H3共享成果复用",
          "targets": [
            {
              "target": "REQ-20261005-codex-history-save-repair",
              "coverage": "H2物理父来源、绑定/cut、有界窗口；H3共享成果复用"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20261005-codex-history-save-repair.md",
              "sha256": "71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"
            }
          ]
        },
        {
          "id": "S4",
          "title": "产品保存链",
          "outcome": "校验共享H1/H3与H2隔离产品落库",
          "scope": "校验共享H1/H3与H2隔离产品落库",
          "targets": [
            {
              "target": "REQ-20261005-codex-history-save-repair",
              "coverage": "校验共享H1/H3与H2隔离产品落库"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20261005-codex-history-save-repair.md",
              "sha256": "71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"
            }
          ]
        },
        {
          "id": "S5",
          "title": "三类真实宿主",
          "outcome": "N普通、C native Branch自身回合、A/D委派分别保存",
          "scope": "N普通、C native Branch自身回合、A/D委派分别保存",
          "targets": [
            {
              "target": "REQ-20261005-codex-history-save-repair",
              "coverage": "N普通、C native Branch自身回合、A/D委派分别保存"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20261005-codex-history-save-repair.md",
              "sha256": "71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"
            }
          ]
        },
        {
          "id": "S6",
          "title": "手机持久与重开",
          "outcome": "三类正文、每类选定详情、切换/force-stop重开",
          "scope": "三类正文、每类选定详情、切换/force-stop重开",
          "targets": [
            {
              "target": "REQ-20261005-codex-history-save-repair",
              "coverage": "三类正文、每类选定详情、切换/force-stop重开"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20261005-codex-history-save-repair.md",
              "sha256": "71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"
            }
          ]
        }
      ],
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/plans/PLAN-20261005-codex-history-save-repair.md",
          "sha256": "71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"
        }
      ],
      "extensions": {
        "source_identity": "沿用原PLAN名称及原阶段ID；原无工作项ID处本次赋稳定展示ID",
        "execution_authority": "资料展示；不替代Runtime plan_ref或启动任何task"
      }
    },
    {
      "id": "PLAN-20261005-codex-history-shared-compat",
      "type": "plan",
      "intent_state": "adopted",
      "targets": [
        {
          "target": "REQ-20261005-codex-history-shared-compat",
          "coverage": "共享兼容Rust先行与Node后续安排"
        }
      ],
      "work_items": [
        {
          "id": "S1",
          "title": "共享事件与更新证明",
          "outcome": "固定DelegatedInput、G1/G2 full/delta与版本兼容",
          "scope": "固定DelegatedInput、G1/G2 full/delta与版本兼容",
          "targets": [
            {
              "target": "REQ-20261005-codex-history-shared-compat",
              "coverage": "固定DelegatedInput、G1/G2 full/delta与版本兼容"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20261005-codex-history-shared-compat.md",
              "sha256": "c6271589d7ab979dc4c5e7e1dcb4838337d2e39d4702aa47254cfb7d6d675e43"
            }
          ]
        },
        {
          "id": "S2",
          "title": "最小wire closure",
          "outcome": "Spike验证后提升相同formal vendor patch",
          "scope": "Spike验证后提升相同formal vendor patch",
          "targets": [
            {
              "target": "REQ-20261005-codex-history-shared-compat",
              "coverage": "Spike验证后提升相同formal vendor patch"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20261005-codex-history-shared-compat.md",
              "sha256": "c6271589d7ab979dc4c5e7e1dcb4838337d2e39d4702aa47254cfb7d6d675e43"
            }
          ]
        },
        {
          "id": "S3",
          "title": "Rust自有事件",
          "outcome": "正确身份/归约与typed partial/unknown保护",
          "scope": "正确身份/归约与typed partial/unknown保护",
          "targets": [
            {
              "target": "REQ-20261005-codex-history-shared-compat",
              "coverage": "正确身份/归约与typed partial/unknown保护"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20261005-codex-history-shared-compat.md",
              "sha256": "c6271589d7ab979dc4c5e7e1dcb4838337d2e39d4702aa47254cfb7d6d675e43"
            }
          ]
        },
        {
          "id": "S4",
          "title": "Node消费者",
          "outcome": "按稳定Rust契约保存委派、合法增长及canonical保护",
          "scope": "按稳定Rust契约保存委派、合法增长及canonical保护",
          "targets": [
            {
              "target": "REQ-20261005-codex-history-shared-compat",
              "coverage": "按稳定Rust契约保存委派、合法增长及canonical保护"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20261005-codex-history-shared-compat.md",
              "sha256": "c6271589d7ab979dc4c5e7e1dcb4838337d2e39d4702aa47254cfb7d6d675e43"
            }
          ]
        },
        {
          "id": "S5",
          "title": "隔离产品验收",
          "outcome": "真实Rust/File/SQLite/provider保存重开后交接832",
          "scope": "真实Rust/File/SQLite/provider保存重开后交接832",
          "targets": [
            {
              "target": "REQ-20261005-codex-history-shared-compat",
              "coverage": "真实Rust/File/SQLite/provider保存重开后交接832"
            }
          ],
          "state": "included",
          "origin": "initial",
          "sources": [
            {
              "kind": "file",
              "path": "docs/product/plans/PLAN-20261005-codex-history-shared-compat.md",
              "sha256": "c6271589d7ab979dc4c5e7e1dcb4838337d2e39d4702aa47254cfb7d6d675e43"
            }
          ]
        }
      ],
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/plans/PLAN-20261005-codex-history-shared-compat.md",
          "sha256": "c6271589d7ab979dc4c5e7e1dcb4838337d2e39d4702aa47254cfb7d6d675e43"
        }
      ],
      "extensions": {
        "source_identity": "沿用原PLAN名称及原阶段ID；原无工作项ID处本次赋稳定展示ID",
        "execution_authority": "资料展示；不替代Runtime plan_ref或启动任何task"
      }
    }
  ]
}
---

# TermLink 局部安排与历史交接

## [PLAN-20260415-relay-control-plane-refactor-freeze] 首期Relay冻结改造安排

### 实施策略

首期Relay冻结改造安排。来源：[docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md](../../docs/product/plans/PLAN-20260415-relay-control-plane-refactor-freeze.md)。复用现有局部安排，数组保留原展示顺序；调整安排须保留理由及历史，不因数组先后创建强制任务依赖图。adopted是原材料已经明确的安排，不是本次实施授权或整体唯一计划。

### 阶段与工作项说明

- **RELAY-GOVERNANCE 切换与回滚治理**：明确单一ticket签发主权、未消费ticket失效与活动连接治理
- **RELAY-SUBJECTS 拆认证主体**：区分admin_user/app_client/connector认证及审计
- **RELAY-TICKET 访问票据**：绑定App主体、service、ingress、target identity与version
- **RELAY-STATE 独立控制面状态**：inventory/published service/policy/audit不塞入TermLink session
- **RELAY-ANDROID-ENTRY Android寻址**：拆传输ingress与目标身份
- **RELAY-BINDING-CACHE App绑定与缓存**：稳定主体/service标识存储与cache key
- **RELAY-CLAIM-DISCOVERY 认领与发现**：claim/binding/discovery/ticket客户端接口
- **RELAY-COMPAT-AUDIT 兼容与审计**：版本协商、拒绝类别、ticket生命周期与主体/对象/原因审计

历史进展（来源报告）：原PLAN明确8项pending、没有开工；现无新实现报告。

### 调整与未决事项

原文有治理→主体/ticket/state→Android→兼容审计的工程理由，保留而不扩成项目全局强制图；首批仅内部灰度sessions+terminal。其具体实现分批与跨项目迁出时间未确定。

没有在work_items保存done/执行状态或task列表；交付读相应assessment，实际生命周期读journal。

## [PLAN-20260715-linux-interactive-release-installer] Linux交互安装器既有P1–P5安排

### 实施策略

Linux交互安装器既有P1–P5安排。来源：[docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md](../../docs/product/plans/PLAN-20260715-linux-interactive-release-installer.md)。复用现有局部安排，数组保留原展示顺序；调整安排须保留理由及历史，不因数组先后创建强制任务依赖图。adopted是原材料已经明确的安排，不是本次实施授权或整体唯一计划。

### 阶段与工作项说明

- **P1 需求与安全范围**：Debian/Ubuntu/systemd及权限/证书取舍明确
- **P2 交互及标准安装事务**：wizard、版本目录与升级失败回滚
- **P3 mTLS证书交付**：direct/Nginx、生成/导入及客户端P12/PEM/CA
- **P4 Release产物**：跨平台tar、tag版本门禁/checksum/workflow
- **P5 外部验收与文档收口**：本地自动化、Debian/Ubuntu实际systemd/Nginx、arm64与真实tag Release smoke

历史进展（来源报告）：PLAN和CR明确P1–P4已实现，P5本地部分通过；外部主机、arm64和真实tag发布未完成。

### 调整与未决事项

不以5月旧安装器host证明替代7月新功能。原CURRENT_TASK验收链接可变，REQ/PLAN/CR已定位稳定范围，但旧完整验收矩阵不推造；本轮不发布tag。

没有在work_items保存done/执行状态或task列表；交付读相应assessment，实际生命周期读journal。

## [PLAN-20261005-codex-history-save-repair] 三类历史保存修复原采纳安排

### 实施策略

三类历史保存修复原采纳安排。来源：[docs/product/plans/PLAN-20261005-codex-history-save-repair.md](../../docs/product/plans/PLAN-20261005-codex-history-save-repair.md)。复用现有局部安排，数组保留原展示顺序；调整安排须保留理由及历史，不因数组先后创建强制任务依赖图。adopted是原材料已经明确的安排，不是本次实施授权或整体唯一计划。

### 阶段与工作项说明

- **S1 三项定位**：H1增长冲突、H2分支来源、H3委派解析分别诊断
- **S2 锁定修复范围**：具体Rust/Node/手机行为与回归范围
- **S3 Rust定位与继承**：H2物理父来源、绑定/cut、有界窗口；H3共享成果复用
- **S4 产品保存链**：校验共享H1/H3与H2隔离产品落库
- **S5 三类真实宿主**：N普通、C native Branch自身回合、A/D委派分别保存
- **S6 手机持久与重开**：三类正文、每类选定详情、切换/force-stop重开

历史进展（来源报告）：当前journal S1–S6 finished、832 closed。限定样本N11/2、C22/4、A/D40/9，手机每类只操作一条选定详情；对应评估仍partial-reported，并非全历史功能/发布认证。

### 调整与未决事项

保留H1/H3由833交付及原失败；IR832-01旧格式升级被用户排除且技术not-fixed。原CR/commit追踪、B/Q预算、旧错误条、registration候选、完整resend/竞态/深分页/大详情矩阵没有自动解决。下一阶段没有获采纳的新业务计划；既有close报告建议Git收尾，本轮明确不执行。

没有在work_items保存done/执行状态或task列表；交付读相应assessment，实际生命周期读journal。

## [PLAN-20261005-codex-history-shared-compat] 共享兼容Rust先行与Node后续安排

### 实施策略

共享兼容Rust先行与Node后续安排。来源：[docs/product/plans/PLAN-20261005-codex-history-shared-compat.md](../../docs/product/plans/PLAN-20261005-codex-history-shared-compat.md)。复用现有局部安排，数组保留原展示顺序；调整安排须保留理由及历史，不因数组先后创建强制任务依赖图。adopted是原材料已经明确的安排，不是本次实施授权或整体唯一计划。

### 阶段与工作项说明

- **S1 共享事件与更新证明**：固定DelegatedInput、G1/G2 full/delta与版本兼容
- **S2 最小wire closure**：Spike验证后提升相同formal vendor patch
- **S3 Rust自有事件**：正确身份/归约与typed partial/unknown保护
- **S4 Node消费者**：按稳定Rust契约保存委派、合法增长及canonical保护
- **S5 隔离产品验收**：真实Rust/File/SQLite/provider保存重开后交接832

历史进展（来源报告）：journal五步finished、833 closed；S5 43/43是隔离fixture/临时产品库证据，832随后完成三类真实样本手机范围。

### 调整与未决事项

原PLAN仍写833待review/finish、832 active以及focus返回，是10月6日历史时点。当前832/833都已closed，不据旧文字自动focus/reopen；保留原计划与实际task-status快照依据。真实自然手机结果不倒填成833当时测试。

没有在work_items保存done/执行状态或task列表；交付读相应assessment，实际生命周期读journal。
