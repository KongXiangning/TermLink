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
  , {"id":"CHG-TERMLINK-V3-20261011","type":"change","recorded_at":"2026-10-11T04:01:29.081Z","basis":{"kind":"document-edit","text":"保留此前Agent结构登记历史，撤回将维护摘要用作精确总目标/分解的用户采用证明。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},"deltas":[{"target":"PROJECT-TERMLINK","before":"root_goal_id未指定；requirement_order未登记","after":"{\"root_goal_id\":\"GOAL-TERMLINK\",\"requirement_order\":[\"REQ-20260222-doc-governance\",\"REQ-20260222-server-admin-privilege-mode\",\"REQ-20260222-session-retention-reconnect\",\"REQ-20260223-shortcut-keyboard-modifier-newline\",\"REQ-20260224-android-external-web-terminal-profile-sessions\",\"REQ-20260224-screen-keep-awake\",\"REQ-20260306-codex-app-repair-plan\",\"REQ-20260309-codex-capability-mvp\",\"REQ-20260318-ws-0001-docs-exp\",\"REQ-20260324-session-list-local-cache\",\"REQ-20260326-android-profile-mtls-runtime-certificate\",\"REQ-20260329-language-normalization\",\"REQ-20260408-codex-native-android-migration\",\"REQ-20260413-relay-control-plane-and-transparent-transit\",\"REQ-20260415-codex-android-runtime-interaction-fixes\",\"REQ-20260516-codex-mobile-realtime-sync\",\"REQ-20260715-linux-interactive-release-installer\",\"REQ-20261005-codex-history-save-repair\",\"REQ-20261005-codex-history-shared-compat\",\"REQ-TERMLINK-CORE-TERMINAL\",\"REQ-TERMLINK-RELEASE-BASELINE\",\"REQ-TERMLINK-WEB-UX\",\"REQ-TERMLINK-DIAGNOSTICS\",\"REQ-TERMLINK-HISTORY-PIPELINE\",\"REQ-TERMLINK-ENHANCEMENT-CANDIDATES\",\"REQ-TERMLINK-HISTORY-BANNER\"]}","note":"用户明确采用现有条目顺序；只是当前登记，不表示历史创建先后或执行先后。"},{"target":"PROJECT-TERMLINK","before":"目标层次与范围未由v3表达；需求支撑关系为推断；成果使用旧v2报告","after":"目标和项目显式迁为v3，需求仍为v2；核对可确认的当前支撑关系并新增6份独立v3报告","note":"旧报告与需求正文保留，21条旧定义摘要提示不代表业务成果失效；未覆盖或不确定内容见review。"}],"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]}, {"id":"CHANGE-TERMLINK-TASK-SCOPE-CORRECTION-20261011","type":"change","recorded_at":"2026-10-11","basis":{"kind":"document-edit","text":"用户明确要求按原task要求及交付纠正Agent推导，不保留错误当前需求。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}]},"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/task-scope-correction/user-correction.md","sha256":"39d89a18f9e652fbd9be4e2c689c147324d363c439d216485282cbf37ca01152"}],"deltas":[{"target":"REQ-20260222-server-admin-privilege-mode","before":"由旧卡扩张真实提权与降权回滚为完成障碍","after":"配置/门禁/风险提示及审计关联；不存在App真实提权/OS降权义务","note":"用户已明确否定该义务；原错误留在历史快照。"},{"target":"REQ-20260222-session-retention-reconnect","before":"把代码6h回退判为24h任务欠交","after":"CR仅修改24h示例配置；口径差异单列，不追加代码义务"},{"target":"REQ-TERMLINK-ENHANCEMENT-CANDIDATES","before":"把旧总纲候选主题聚合为独立当前候选REQ","after":null,"note":"从当前正文与登记顺序删除；原P2材料不自动采纳。"},{"target":"GOAL-TERMLINK","before":"以Agent维护摘要宣称用户明确采用总目标和分解","after":"来源于实际任务方向的维护归纳；未由目标反推需求"},{"target":"PROJECT-TERMLINK","before":"以旧卡/代码补造当前剩余清单","after":"原task要求、交付与限制分开；可选观察不变成欠交"}]}, {"id":"CHANGE-TERMLINK-ADOPTED-STRUCTURE-20261012","type":"change","recorded_at":"2026-10-12","basis":{"kind":"document-edit","text":"当前授权实施附件完整方案；纠正导航替代结构与过窄ID采用条件，组织既有范围，不新增业务承诺。","sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/input-0.md","sha256":"96711d369660ea13ab42fd4662a9037d6b3d6bc6d1a34c38cd2a9acf4c01f246"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/description-destinations.json","sha256":"4cefdb05f24fab1bef1b422787b43b52fb5de84d6a1e0f08aec565250287ff01"}]},"sources":[{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/host-decision.md","sha256":"d19e194aa8f3dc0e99239f61177805d437e8619a402fcd8d34407f10dd9417d3"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/input-0.md","sha256":"96711d369660ea13ab42fd4662a9037d6b3d6bc6d1a34c38cd2a9acf4c01f246"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/description-destinations.json","sha256":"4cefdb05f24fab1bef1b422787b43b52fb5de84d6a1e0f08aec565250287ff01"},{"kind":"file","path":"docs/product/history/maintenance-20261011/structure-repair-20261012/PROJECT.before.md","sha256":"1c3b1f87ba0595977885d770521481394c524fc3eac05422596d2c94629a2bbe"}],"deltas":[{"target":"PROJECT-TERMLINK","before":"25个身份的登记顺序与分类导航；所有关系被过宽解释为inferred","after":"原相对顺序保留，新增44身份追加；采用结构正式links，真实候选与未明确原主题保留","note":"本次结构化整理，不是业务增量；旧Task/成果不变。"},{"target":"REQ-TERMLINK-CORE-TERMINAL","before":"P0.3仅映射待核，未独立记录重启元数据恢复义务","after":"原文明确义务保留current子要求，恢复字段与结果待明确","note":"不承诺PTY跨服务重启连续、不造Task。"},{"target":"GOAL-TERMLINK","before":"当前正文过宽撤回根目标采用摘要","after":"保留已有采用身份及本次方案，来源摘要不等于历史逐字原话","note":"两条旧子目标边仍inferred。"}]}]
}
---

# TermLink 重要业务范围与安排变化

## [CHANGE-TERMLINK-RETENTION-24H] 24h配置增量与历史口径差异

### 变更说明

原CR在2026-02-24仅把示例配置由6h改为24h并改文档，明确排除代码逻辑修改。代码的无配置/非法值6h回退是独立观察；撤回将它直接认定为该task欠交或默认必须修复的结论。原REQ写“默认24h”与窄范围CR的语义差异保留，不靠代码反向推定原用户意图。

### 影响与未同步项

原变更、实现事实及历史版本保留；不修改代码或创建修复task。当前需求03按实际窄范围配置交付表述。

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

## [CHG-TERMLINK-V3-20261011] 既有规范结构登记历史

### 变更说明

此前维护登记了总目标、需求阅读顺序与v3报告。维护摘要对“用户明确采用精确总目标及所有关系”的记载没有足够原始决定依据，本次撤回其作为业务授权的用途；保留其结构登记历史。

### 影响与未同步项

当前目标以实际任务方向作维护归纳，关系标inferred；需求顺序沿用已有次序，仅移除本次明确删除的错误聚合条目。旧结构合法或历史报告不证明用户采用或产品完成。修改前材料固定保存在本次纠正目录。

## [CHANGE-TERMLINK-TASK-SCOPE-CORRECTION-20261011] 按原task要求纠正当前目标与需求

### 变更说明

已按原始要求、明确追加决定和实际交付核对25项保留需求；删去1项Agent聚合候选需求，纠正管理员/TTL/多CLI/可选验证范围，撤回11项旧卡驱动的代码完成判断及4项无适当范围依据的目标/TTL报告。Task范围、阶段顺序、关闭事实和业务成果未改。

### 影响与未同步项

原task未定位的2–4月范围仍只有REQ/CR/SUMMARY来源；不因此全部判未知/未开始。原始task包与交付证据未改，旧错误当前规范只存修改前快照用于追溯。没有新业务立项或测试执行。

## [CHANGE-TERMLINK-ADOPTED-STRUCTURE-20261012] 采用结构、独立定义与当前口径修复

### 变更说明

本次将采用层级通过核心关系保存，保留真实候选及全部213条原描述去向；不新增业务义务。

### 影响与未同步项

MANAGED_REQUIREMENTS显式迁为v3；原25身份/顺序/绑定和报告保留。本次日期为实际整理日期，不改写历史用户原话或历史报告。原到新记录仅本次交接，未来维护唯一当前正文与核心links。
