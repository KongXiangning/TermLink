---
{
  "schema": "vnext-product-doc/v2",
  "items": [
    {
      "id": "CHANGE-TERMLINK-RETENTION-24H",
      "type": "change",
      "recorded_at": "2026-10-10",
      "basis": {
        "kind": "document-edit",
        "text": "历史补整理：CR明确只改示例与REQ。当前只读代码反证默认回退未同步。",
        "sources": [
          {
            "kind": "file",
            "path": "docs/changes/records/CR-20260224-0000-session-ttl-24h.md",
            "sha256": "f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f"
          },
          {
            "kind": "file",
            "path": "src/services/sessionManager.js",
            "sha256": "dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"
          },
          {
            "kind": "file",
            "path": ".env.example",
            "sha256": "ce4c2fe7a9b71cb3004dadc2fe56e245339eefaf2b2f5165042b9a8688ac8552"
          }
        ]
      },
      "deltas": [
        {
          "target": "REQ-20260222-session-retention-reconnect",
          "before": "6h示例与代码默认",
          "after": "24h需求/示例；无配置或非法配置代码仍6h",
          "note": "原事件日期/时点：2026-02-24；本次记录日期不冒充历史决策发生日。"
        }
      ],
      "sources": [
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-0000-session-ttl-24h.md",
          "sha256": "f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f"
        },
        {
          "kind": "file",
          "path": "src/services/sessionManager.js",
          "sha256": "dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"
        },
        {
          "kind": "file",
          "path": ".env.example",
          "sha256": "ce4c2fe7a9b71cb3004dadc2fe56e245339eefaf2b2f5165042b9a8688ac8552"
        }
      ]
    },
    {
      "id": "CHANGE-TERMLINK-CODEX-MVP",
      "type": "change",
      "recorded_at": "2026-10-10",
      "basis": {
        "kind": "document-edit",
        "text": "历史补整理：修复REQ由能力MVP明确接管，保留首轮功能；stored/next-turn/interaction分层与对话首页优先。",
        "sources": [
          {
            "kind": "file",
            "path": "docs/changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md",
            "sha256": "30e191b5f4a5f62e7b5ab0b10004176f0355b473700a5a46d2cef62a854688da"
          },
          {
            "kind": "file",
            "path": "docs/product/requirements/REQ-20260309-codex-capability-mvp.md",
            "sha256": "03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"
          }
        ]
      },
      "deltas": [
        {
          "target": "REQ-20260306-codex-app-repair-plan",
          "before": "独立问题修复主线",
          "after": "retired前置基线，后续由能力MVP承接",
          "note": "原事件日期/时点：2026-03-09至03-31；本次记录日期不冒充历史决策发生日。"
        },
        {
          "target": "REQ-20260309-codex-capability-mvp",
          "before": "面板/配置为首页主体的旧意",
          "after": "对话优先；3月期Session Defaults与顶部权限UI排除，/skill仅冻结",
          "note": "原事件日期/时点：2026-03-09至03-31；本次记录日期不冒充历史决策发生日。"
        }
      ],
      "sources": [
        {
          "kind": "file",
          "path": "docs/changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md",
          "sha256": "30e191b5f4a5f62e7b5ab0b10004176f0355b473700a5a46d2cef62a854688da"
        },
        {
          "kind": "file",
          "path": "docs/product/requirements/REQ-20260309-codex-capability-mvp.md",
          "sha256": "03f7e401c5b426c25f8b547c00826fd8864e2c9628abfacc8e27100a2815cab9"
        }
      ]
    },
    {
      "id": "CHANGE-TERMLINK-NATIVE-ENTRY",
      "type": "change",
      "recorded_at": "2026-10-10",
      "basis": {
        "kind": "document-edit",
        "text": "历史补整理：4月9日受控回退及4月11日正式移除分别有报告，不是两个当前默认入口。",
        "sources": [
          {
            "kind": "file",
            "path": "docs/changes/records/CR-20260409-2332-native-closeout.md",
            "sha256": "f56816f0fd2aa565bb1c80e77dd9b1e628a80c20cd7546ff281c00fd474066d6"
          },
          {
            "kind": "file",
            "path": "docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md",
            "sha256": "12fe3ce575a5d5e22eb72dc4a1f18bc5c8490038322125f5a0621b2662ce0c11"
          }
        ]
      },
      "deltas": [
        {
          "target": "REQ-20260408-codex-native-android-migration",
          "before": "原生新增并行→原生默认/WebView可回退",
          "after": "原生主入口，旧Codex用户可达入口/toggle/fallback移除",
          "note": "原事件日期/时点：2026-04-09、04-11；本次记录日期不冒充历史决策发生日。"
        }
      ],
      "sources": [
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260409-2332-native-closeout.md",
          "sha256": "f56816f0fd2aa565bb1c80e77dd9b1e628a80c20cd7546ff281c00fd474066d6"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md",
          "sha256": "12fe3ce575a5d5e22eb72dc4a1f18bc5c8490038322125f5a0621b2662ce0c11"
        }
      ]
    },
    {
      "id": "CHANGE-TERMLINK-JULY-UX",
      "type": "change",
      "recorded_at": "2026-10-10",
      "basis": {
        "kind": "document-edit",
        "text": "历史补整理：独立用户任务已扩展局部范围，不能以3月Out of Scope或2月固定idle把后来交付隐藏。",
        "sources": [
          {
            "kind": "file",
            "path": "TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md",
            "sha256": "9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"
          },
          {
            "kind": "file",
            "path": "TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md",
            "sha256": "7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"
          },
          {
            "kind": "file",
            "path": "TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md",
            "sha256": "519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"
          },
          {
            "kind": "file",
            "path": "TASKS/TASK-20260722-002-android-codex-open-conversation-files.md",
            "sha256": "f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"
          },
          {
            "kind": "file",
            "path": "TASKS/TASK-20260726-001-android-foreground-screen-timeout.md",
            "sha256": "d26e314d468675ed57e1b845d4b3748e0ec8c50e608d8d72e67203be3432937b"
          }
        ]
      },
      "deltas": [
        {
          "target": "REQ-20260309-codex-capability-mvp",
          "before": "3月期不恢复顶部权限UI",
          "after": "7月真实owner/catalog权限profile等移动弹层与历史附件打开",
          "note": "原事件日期/时点：2026-07-18、07-19、07-22、07-26；本次记录日期不冒充历史决策发生日。"
        },
        {
          "target": "REQ-20260318-ws-0001-docs-exp",
          "before": "3月文本只读/统一diff，非文本预览下载排除",
          "after": "7月只读Markdown/图片/PDF、认证下载/缓存、双文件/side-by-side及自然比例阅读",
          "note": "原事件日期/时点：2026-07-18、07-19、07-22、07-26；本次记录日期不冒充历史决策发生日。"
        },
        {
          "target": "REQ-20260224-screen-keep-awake",
          "before": "MainShell固定2分钟idle",
          "after": "7月4Activity跟随系统/30秒至10分钟可选；后台清FLAG",
          "note": "原事件日期/时点：2026-07-18、07-19、07-22、07-26；本次记录日期不冒充历史决策发生日。"
        }
      ],
      "sources": [
        {
          "kind": "file",
          "path": "TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md",
          "sha256": "9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md",
          "sha256": "7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md",
          "sha256": "519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260722-002-android-codex-open-conversation-files.md",
          "sha256": "f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260726-001-android-foreground-screen-timeout.md",
          "sha256": "d26e314d468675ed57e1b845d4b3748e0ec8c50e608d8d72e67203be3432937b"
        }
      ]
    },
    {
      "id": "CHANGE-TERMLINK-IPC-OWNER-GOAL",
      "type": "change",
      "recorded_at": "2026-10-10",
      "basis": {
        "kind": "document-edit",
        "text": "历史补整理：AD-004明确规定healthy IPC独占实时数据；7月13日external Goal成功旧声明不能继续作为当前语义控制契约。",
        "sources": [
          {
            "kind": "file",
            "path": "docs/workflow/DECISIONS.md",
            "sha256": "747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"
          },
          {
            "kind": "file",
            "path": "docs/workflow/CONTRACTS.md",
            "sha256": "c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"
          },
          {
            "kind": "file",
            "path": "TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md",
            "sha256": "b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"
          }
        ]
      },
      "deltas": [
        {
          "target": "DESIGN-CODEX-IPC-AUTHORITY",
          "before": "5月hydrate/ThreadHub建议及早期external Goal启动/继续成功声明",
          "after": "follower lifecycle与定向surface独占healthy实时；TermLink writer才有Goal语义控制",
          "note": "原事件日期/时点：2026-07-22、07-31（来源AD-004补充）；本次记录日期不冒充历史决策发生日。"
        },
        {
          "target": "REQ-20260516-codex-mobile-realtime-sync",
          "before": "以canonical读取校准当前实时正文的旧技术描述",
          "after": "只有offline/desynced/本周期缺目标surface可有界恢复；external按实际observer/interrupt能力",
          "note": "原事件日期/时点：2026-07-22、07-31（来源AD-004补充）；本次记录日期不冒充历史决策发生日。"
        }
      ],
      "sources": [
        {
          "kind": "file",
          "path": "docs/workflow/DECISIONS.md",
          "sha256": "747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"
        },
        {
          "kind": "file",
          "path": "docs/workflow/CONTRACTS.md",
          "sha256": "c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md",
          "sha256": "b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"
        }
      ]
    },
    {
      "id": "CHANGE-TERMLINK-ROLLOUT-LAYERS",
      "type": "change",
      "recorded_at": "2026-10-10",
      "basis": {
        "kind": "document-edit",
        "text": "历史补整理：AD-018–022与Rust/Node隔离归档共同限定外部只读源、三种mode、内部opaque metadata及Rust先行。",
        "sources": [
          {
            "kind": "file",
            "path": "docs/workflow/DECISIONS.md",
            "sha256": "747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"
          },
          {
            "kind": "file",
            "path": "docs/codex/codex-rollout-collector-architecture.md",
            "sha256": "3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"
          },
          {
            "kind": "file",
            "path": "TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md",
            "sha256": "9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"
          },
          {
            "kind": "file",
            "path": "TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md",
            "sha256": "4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"
          }
        ]
      },
      "deltas": [
        {
          "target": "DESIGN-CODEX-ROLLOUT-BOUNDARY",
          "before": "旧草案discovery/fingerprint gate/product epoch/revision/fence及额外恢复mode",
          "after": "单例Node→Rust，source定位在Rust，preview/backfill/append普通重试，产品一canonical",
          "note": "原事件日期/时点：2026-08-25至08-27、09-13；AD-018/019具体原始日期未独立确定；本次记录日期不冒充历史决策发生日。"
        },
        {
          "target": "REQ-TERMLINK-HISTORY-PIPELINE",
          "before": "隔离基础层完成容易被误读为产品接入完成",
          "after": "Rust/Node基础层、产品库、Gateway、App及真实E2E各分层举证",
          "note": "原事件日期/时点：2026-08-25至08-27、09-13；AD-018/019具体原始日期未独立确定；本次记录日期不冒充历史决策发生日。"
        }
      ],
      "sources": [
        {
          "kind": "file",
          "path": "docs/workflow/DECISIONS.md",
          "sha256": "747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"
        },
        {
          "kind": "file",
          "path": "docs/codex/codex-rollout-collector-architecture.md",
          "sha256": "3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md",
          "sha256": "9bed4e46068be314cc8218ddb4fea3b5a40f2f293f91f4e2efb623d03a1d5fb9"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md",
          "sha256": "4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"
        }
      ]
    },
    {
      "id": "CHANGE-TERMLINK-HISTORY-DELIVERY",
      "type": "change",
      "recorded_at": "2026-10-10",
      "basis": {
        "kind": "document-edit",
        "text": "历史补整理：833独立先交Rust/Node共享H1/H3，832再交H2与UTF8/Android最小修复及真实样本；旧返回计划不再是当前生命周期。",
        "sources": [
          {
            "kind": "file",
            "path": "docs/product/plans/PLAN-20261005-codex-history-shared-compat.md",
            "sha256": "c6271589d7ab979dc4c5e7e1dcb4838337d2e39d4702aa47254cfb7d6d675e43"
          },
          {
            "kind": "file",
            "path": "docs/product/plans/PLAN-20261005-codex-history-save-repair.md",
            "sha256": "71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"
          },
          {
            "kind": "file",
            "path": "docs/product/history/maintenance-20261010/task-status-before.json",
            "sha256": "1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"
          },
          {
            "kind": "file",
            "path": "logs/history-save-repair-20261005/close-20261008/report.md",
            "sha256": "7a5eec7b35440317bcab207b0d066809583349bdebce4cc3d65cbedaa0003607"
          }
        ]
      },
      "deltas": [
        {
          "target": "PLAN-20261005-codex-history-shared-compat",
          "before": "S5待review/finish，832 active/S2返回",
          "after": "journal833 closed；原隔离43/43保留，832后三类实机结果另记",
          "note": "原事件日期/时点：2026-10-05至10-08；本次记录日期不冒充历史决策发生日。"
        },
        {
          "target": "PLAN-20261005-codex-history-save-repair",
          "before": "三类失败及S5/S6阶段未验",
          "after": "六步finished/closed，限定N/C/A-D产品持久与手机选定详情/重开有证据",
          "note": "原事件日期/时点：2026-10-05至10-08；本次记录日期不冒充历史决策发生日。"
        }
      ],
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/plans/PLAN-20261005-codex-history-shared-compat.md",
          "sha256": "c6271589d7ab979dc4c5e7e1dcb4838337d2e39d4702aa47254cfb7d6d675e43"
        },
        {
          "kind": "file",
          "path": "docs/product/plans/PLAN-20261005-codex-history-save-repair.md",
          "sha256": "71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261010/task-status-before.json",
          "sha256": "1e64123d7331b22e55703f505bafcb7aab40203a62f07058c136c342a2176dba"
        },
        {
          "kind": "file",
          "path": "logs/history-save-repair-20261005/close-20261008/report.md",
          "sha256": "7a5eec7b35440317bcab207b0d066809583349bdebce4cc3d65cbedaa0003607"
        }
      ]
    },
    {
      "id": "CHANGE-TERMLINK-V1-EXCLUSION",
      "type": "change",
      "recorded_at": "2026-10-10",
      "basis": {
        "kind": "document-edit",
        "text": "历史补整理：用户以之前没有普通用户产品发布为前提，明确此P2不用处理；不是技术修复。",
        "sources": [
          {
            "kind": "file",
            "path": "logs/history-save-repair-20261005/independent-review-20261008/user-disposition-20261008.md",
            "sha256": "f13356cf56b2536a3f6bd9956620a79d13ad52362f326ebc44a61fb73b554bcd"
          }
        ]
      },
      "deltas": [
        {
          "target": "REQ-20261005-codex-history-save-repair",
          "before": "target-v1旧产品格式升级增长失败属于finding",
          "after": "之前已发布旧格式迁移排除出本版本必修范围；technical_resolution=not-fixed",
          "note": "原事件日期/时点：2026-10-08；本次记录日期不冒充历史决策发生日。"
        }
      ],
      "sources": [
        {
          "kind": "file",
          "path": "logs/history-save-repair-20261005/independent-review-20261008/user-disposition-20261008.md",
          "sha256": "f13356cf56b2536a3f6bd9956620a79d13ad52362f326ebc44a61fb73b554bcd"
        }
      ]
    }
  ]
}
---

# TermLink 重要业务范围与安排变化

## [CHANGE-TERMLINK-RETENTION-24H] 保留期6h到24h及当前回退差异

### 变更说明

历史时点：2026-02-24。CR明确只改示例与REQ。当前只读代码反证默认回退未同步。

- REQ-20260222-session-retention-reconnect：6h示例与代码默认 → 24h需求/示例；无配置或非法配置代码仍6h

依据：[docs/changes/records/CR-20260224-0000-session-ttl-24h.md](../../docs/changes/records/CR-20260224-0000-session-ttl-24h.md)；[src/services/sessionManager.js](../../src/services/sessionManager.js)；[.env.example](../../.env.example)。旧原文、原commit/报告均保留，不通过新时间戳选择冲突赢家。

### 影响与未同步项

已更新范围化评估为partial，历史续接/LRU交付保留；未读取运行环境或修改代码。后来的Task仍冻结6h字段是另一个历史依据，不能忽略。

## [CHANGE-TERMLINK-CODEX-MVP] 修复基线归档与对话优先主线

### 变更说明

历史时点：2026-03-09至03-31。修复REQ由能力MVP明确接管，保留首轮功能；stored/next-turn/interaction分层与对话首页优先。

- REQ-20260306-codex-app-repair-plan：独立问题修复主线 → retired前置基线，后续由能力MVP承接
- REQ-20260309-codex-capability-mvp：面板/配置为首页主体的旧意 → 对话优先；3月期Session Defaults与顶部权限UI排除，/skill仅冻结

依据：[docs/changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md](../../docs/changes/summaries/SUMMARY-REQ-20260306-codex-app-repair-plan.md)；[docs/product/requirements/REQ-20260309-codex-capability-mvp.md](../../docs/product/requirements/REQ-20260309-codex-capability-mvp.md)。旧原文、原commit/报告均保留，不通过新时间戳选择冲突赢家。

### 影响与未同步项

旧卡内部Session Defaults/权限验收仍冲突；不抹去基线能力、不恢复旧UI或据done认证后续扩展。

## [CHANGE-TERMLINK-NATIVE-ENTRY] 原生并行迁移、默认切换与旧入口移除

### 变更说明

历史时点：2026-04-09、04-11。4月9日受控回退及4月11日正式移除分别有报告，不是两个当前默认入口。

- REQ-20260408-codex-native-android-migration：原生新增并行→原生默认/WebView可回退 → 原生主入口，旧Codex用户可达入口/toggle/fallback移除

依据：[docs/changes/records/CR-20260409-2332-native-closeout.md](../../docs/changes/records/CR-20260409-2332-native-closeout.md)；[docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md](../../docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md)。旧原文、原commit/报告均保留，不通过新时间戳选择冲突赢家。

### 影响与未同步项

PRODUCT旧总纲仍描述可选清理；本轮规范正文已纠正但保留原纲历史。移除CR draft/TBD与真机结果分别记；终端WebView没有因此被移除。

## [CHANGE-TERMLINK-JULY-UX] 7月明确UI、工作区与息屏范围演进

### 变更说明

历史时点：2026-07-18、07-19、07-22、07-26。独立用户任务已扩展局部范围，不能以3月Out of Scope或2月固定idle把后来交付隐藏。

- REQ-20260309-codex-capability-mvp：3月期不恢复顶部权限UI → 7月真实owner/catalog权限profile等移动弹层与历史附件打开
- REQ-20260318-ws-0001-docs-exp：3月文本只读/统一diff，非文本预览下载排除 → 7月只读Markdown/图片/PDF、认证下载/缓存、双文件/side-by-side及自然比例阅读
- REQ-20260224-screen-keep-awake：MainShell固定2分钟idle → 7月4Activity跟随系统/30秒至10分钟可选；后台清FLAG

依据：[TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md](../../TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md)；[TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md](../../TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md)；[TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md](../../TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md)；[TASKS/TASK-20260722-002-android-codex-open-conversation-files.md](../../TASKS/TASK-20260722-002-android-codex-open-conversation-files.md)；[TASKS/TASK-20260726-001-android-foreground-screen-timeout.md](../../TASKS/TASK-20260726-001-android-foreground-screen-timeout.md)。旧原文、原commit/报告均保留，不通过新时间戳选择冲突赢家。

### 影响与未同步项

工作区编辑仍排除；screen真实定时等待、完整active Goal/Plan/Skills视觉capability未核验；历史任务无可靠Runtime映射则task_id=null。

## [CHANGE-TERMLINK-IPC-OWNER-GOAL] IPC权威及external Goal旧声明的明确收敛

### 变更说明

历史时点：2026-07-22、07-31（来源AD-004补充）。AD-004明确规定healthy IPC独占实时数据；7月13日external Goal成功旧声明不能继续作为当前语义控制契约。

- DESIGN-CODEX-IPC-AUTHORITY：5月hydrate/ThreadHub建议及早期external Goal启动/继续成功声明 → follower lifecycle与定向surface独占healthy实时；TermLink writer才有Goal语义控制
- REQ-20260516-codex-mobile-realtime-sync：以canonical读取校准当前实时正文的旧技术描述 → 只有offline/desynced/本周期缺目标surface可有界恢复；external按实际observer/interrupt能力

依据：[docs/workflow/DECISIONS.md](../../docs/workflow/DECISIONS.md)；[docs/workflow/CONTRACTS.md](../../docs/workflow/CONTRACTS.md)；[TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md](../../TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md)。旧原文、原commit/报告均保留，不通过新时间戳选择冲突赢家。

### 影响与未同步项

保留旧验证及paused B4R/B5/P0-C/P1未验范围。不是本轮改架构、恢复task或给外部宿主协议出新认证。

## [CHANGE-TERMLINK-ROLLOUT-LAYERS] 4.5公共语义收敛与隔离模块分工

### 变更说明

历史时点：2026-08-25至08-27、09-13；AD-018/019具体原始日期未独立确定。AD-018–022与Rust/Node隔离归档共同限定外部只读源、三种mode、内部opaque metadata及Rust先行。

- DESIGN-CODEX-ROLLOUT-BOUNDARY：旧草案discovery/fingerprint gate/product epoch/revision/fence及额外恢复mode → 单例Node→Rust，source定位在Rust，preview/backfill/append普通重试，产品一canonical
- REQ-TERMLINK-HISTORY-PIPELINE：隔离基础层完成容易被误读为产品接入完成 → Rust/Node基础层、产品库、Gateway、App及真实E2E各分层举证

依据：[docs/workflow/DECISIONS.md](../../docs/workflow/DECISIONS.md)；[docs/codex/codex-rollout-collector-architecture.md](../../docs/codex/codex-rollout-collector-architecture.md)；[TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md](../../TASKS/TASK-20260826-001-codex-collector-phase45-rust-protocol-migration.md)；[TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md](../../TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md)。旧原文、原commit/报告均保留，不通过新时间戳选择冲突赢家。

### 影响与未同步项

source symlink pre-I/O、hash interruptibility等deferred项、旧Node归档的环境依赖观察继续保留；未修改CONTRACTS/DECISIONS或业务代码。

## [CHANGE-TERMLINK-HISTORY-DELIVERY] 共享兼容与三类真实历史交付

### 变更说明

历史时点：2026-10-05至10-08。833独立先交Rust/Node共享H1/H3，832再交H2与UTF8/Android最小修复及真实样本；旧返回计划不再是当前生命周期。

- PLAN-20261005-codex-history-shared-compat：S5待review/finish，832 active/S2返回 → journal833 closed；原隔离43/43保留，832后三类实机结果另记
- PLAN-20261005-codex-history-save-repair：三类失败及S5/S6阶段未验 → 六步finished/closed，限定N/C/A-D产品持久与手机选定详情/重开有证据

依据：[docs/product/plans/PLAN-20261005-codex-history-shared-compat.md](../../docs/product/plans/PLAN-20261005-codex-history-shared-compat.md)；[docs/product/plans/PLAN-20261005-codex-history-save-repair.md](../../docs/product/plans/PLAN-20261005-codex-history-save-repair.md)；[docs/product/history/maintenance-20261010/task-status-before.json](../../docs/product/history/maintenance-20261010/task-status-before.json)；[logs/history-save-repair-20261005/close-20261008/report.md](../../logs/history-save-repair-20261005/close-20261008/report.md)。旧原文、原commit/报告均保留，不通过新时间戳选择冲突赢家。

### 影响与未同步项

closed不是全需求PASS或自动Git。CR/Git追踪、其他手机/深分页/大详情/竞态/resend、预算与registration等保持未完成或未核验。

## [CHANGE-TERMLINK-V1-EXCLUSION] IR832-01旧产品格式升级排除

### 变更说明

历史时点：2026-10-08。用户以之前没有普通用户产品发布为前提，明确此P2不用处理；不是技术修复。

- REQ-20261005-codex-history-save-repair：target-v1旧产品格式升级增长失败属于finding → 之前已发布旧格式迁移排除出本版本必修范围；technical_resolution=not-fixed

依据：[logs/history-save-repair-20261005/independent-review-20261008/user-disposition-20261008.md](../../logs/history-save-repair-20261005/independent-review-20261008/user-disposition-20261008.md)。旧原文、原commit/报告均保留，不通过新时间戳选择冲突赢家。

### 影响与未同步项

原S4/S5独立verdict/findings/复现保留；当前新数据保存/增量/重启、未结算原job/profile/delivery与跨profile fail-closed仍有效，不授权清旧数据。
