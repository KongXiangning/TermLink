---
{
  "schema": "vnext-product-doc/v3",
  "items": [
    {
      "id": "AS-CURRENT-20261014-01",
      "type": "assessment",
      "target": "REQ-20260222-doc-governance",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-20260222-doc-governance"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "6e29f3466f73c2b6d1e1c75ca3ed82f8609cf990e6c76e10b4914c6df365a06c",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-01",
        "coverage": "本轮完整重评 REQ-20260222-doc-governance 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "delivered-reported",
      "verification": "mixed-reported",
      "conclusion": "undetermined",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md",
          "sha256": "353009bea12734a5c964c22dd9dcf9eb782938efed0bdcc6965bd08b7c312ea8"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md",
          "sha256": "ecb9946aae341302c6c40eb424bc6f8a19288b48520b9c3a2a992f95c414f98b"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "AGENTS.md",
          "sha256": "07788bfa3e3c4be20fd34c96b93297cf9f333fa9079901c31f9a58b22d504f35"
        },
        {
          "kind": "file",
          "path": ".agents/skills/maintain-project/SKILL.md",
          "sha256": "845b891d5c16951f8e77300da6f2883b065914089b45e1d8c5e5344d367f7374"
        },
        {
          "kind": "file",
          "path": ".workflow-system/WORKFLOW_PROTOCOL.md",
          "sha256": "a1e0a4df91ee1d27429be4e138440898e266ac791581b9a08aa19d75afbdc4c6"
        },
        {
          "kind": "file",
          "path": ".workflow-system/runtime/support/product-maintenance/references/reconcile.md",
          "sha256": "41395ad8cb7cdba75231ed9f9dc20fe79f3eeb0af7403810ba389ed6c734ab97"
        },
        {
          "kind": "file",
          "path": ".workflow-system/runtime/support/product-maintenance/references/binding-contribution.md",
          "sha256": "155cbaf1eb0d99f5a7876df0d65bff98e4bf25412fe8fd6e71b1bac1f4804383"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "真实CR c805842已修改需求同步约定与计划覆盖示例；现AGENTS/vNext、PRODUCT和实际assistance任务事实均存在。关联缺口不否定启动。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-02",
      "type": "assessment",
      "target": "REQ-20260222-server-admin-privilege-mode",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-20260222-server-admin-privilege-mode"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "97977d95bc5d1c5578b952e44251e39629b8698af5c9290b6473be47dd634cbd",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-02",
        "coverage": "本轮完整重评 REQ-20260222-server-admin-privilege-mode 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "partial-reported",
      "verification": "mixed-reported",
      "conclusion": "partially-satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md",
          "sha256": "6349a627e41507617257d34ad659fa63b822b599514ec2d0c5079eee628f4227"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md",
          "sha256": "212136718e3073240b870c07b99c385812a37089486102e94012bcf1d971ef8e"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md",
          "sha256": "bd0d7030a21f44f5806c14738a7692faa296414823b9fec6edcc63c8f0e42763"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "src/config/privilegeConfig.js",
          "sha256": "11fd8995eab6b4edc60ca6d9d2fe0640bec05cbb7baf488a41b49a37b411c251"
        },
        {
          "kind": "file",
          "path": "src/config/securityGates.js",
          "sha256": "141dda6331dcacb7009ca0815c39b57836cbf4c471d9e8868c6cccab93287309"
        },
        {
          "kind": "file",
          "path": "src/utils/ipCheck.js",
          "sha256": "f3a14ad4e0af4ad76f5329a08d225d931786c3846a2ce200a9343af84c2ab0a1"
        },
        {
          "kind": "file",
          "path": "src/services/auditService.js",
          "sha256": "a9e0d03f3965b4d890c207953a5e1b4789237238252bc04881c1b42565c669db"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
        },
        {
          "kind": "file",
          "path": "src/routes/sessions.js",
          "sha256": "d646071995865a382f7f789ddb54e8239b8ec48c779cfe351b84601041332607"
        },
        {
          "kind": "file",
          "path": "src/services/sessionManager.js",
          "sha256": "dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"
        },
        {
          "kind": "file",
          "path": "src/services/ptyService.js",
          "sha256": "4d8cb588edb6c639e7785b91228098998b066bc46f1e7f971ae8c52100f2137b"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap",
          "sha256": "36ec0a88528703584c15dfeb43c69abe33a7354595f3fae215835eb88e3c6fcb"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "CR a6ceeec/76e76f8有配置、门禁、IP与审计/提示实现；当前代码及JOINT实际拒绝场景构成明确启动证据，无原task也不能标未开始。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-03",
      "type": "assessment",
      "target": "REQ-20260222-session-retention-reconnect",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-20260222-session-retention-reconnect"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "437defee81aa89257abf912953d5c59a927c6e5bed9575093b707f98d8748783",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-03",
        "coverage": "本轮完整重评 REQ-20260222-session-retention-reconnect 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "delivered-reported",
      "verification": "pass-reported",
      "conclusion": "satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md",
          "sha256": "d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-0000-session-ttl-24h.md",
          "sha256": "f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md",
          "sha256": "74accf4d3cbbe9bdfeb9ac7f1595572a2a8e8d67a881bc7f95973e7c8c6502ea"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "src/services/sessionManager.js",
          "sha256": "dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s2/report.md",
          "sha256": "f29b791e692cad1842209f2bb63040a8a5166924896b7b014c9e7a5a474eab9e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md",
          "sha256": "74cb3cab6fabaf0a96cdc2121fef66ee9df8273791d2fffe9115daef77f79784"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "CR f4ce64f明确6/6且当前SessionManager有detach保留/cleanup/LRU；JOINT真实同PID续接和5/5 TTL容量证据成立。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-04",
      "type": "assessment",
      "target": "REQ-20260223-shortcut-keyboard-modifier-newline",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-20260223-shortcut-keyboard-modifier-newline"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "422464b10474d6ae00f462926f17ffc5808faef051296cc4e5ec856b82ccd592",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-04",
        "coverage": "本轮完整重评 REQ-20260223-shortcut-keyboard-modifier-newline 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "delivered-reported",
      "verification": "mixed-reported",
      "conclusion": "partially-satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md",
          "sha256": "10f5226c4bdd97c24d705913490a227733414cf261035fa44c7878542ba1d0ab"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md",
          "sha256": "64d5f6d86a07d9afad72ab147b4783f2fb0ee579a1685579a91defab3416b537"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json",
          "sha256": "c013a6d7e0e75430618ec5d8cb70dd4a8fbac571098e9a499bb6fa399dd292cd"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/terminal-touch-controls.json",
          "sha256": "0976f550277c322b61d515914e715f7968ec72b69d59cf65fb68abce91892006"
        },
        {
          "kind": "file",
          "path": "public/terminal_shortcut_input.js",
          "sha256": "e754e77db27bdb5411b2c82d4e8344301a19472112dfffb504f549f66788f43d"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "CR e975244/56739f1实际输入引擎、CR/LF和触摸处理，10/13真实帧及设备操作已开始并部分通过。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-05",
      "type": "assessment",
      "target": "REQ-20260224-android-external-web-terminal-profile-sessions",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-20260224-android-external-web-terminal-profile-sessions"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "ca6444ff48284aab5a8121c855b26e1f84fb7111f1a18b068cefa1067bb7f326",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-05",
        "coverage": "本轮完整重评 REQ-20260224-android-external-web-terminal-profile-sessions 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "delivered-reported",
      "verification": "mixed-reported",
      "conclusion": "undetermined",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md",
          "sha256": "1cd49f82707f7c6860e89f023385701bfe02b811de5f96a876d81caf5619337e"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md",
          "sha256": "bdc1157ccbe8e999efa49a38149aa7d597e84634204a511006f97beda54a1929"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt",
          "sha256": "5713c9f45d4061b262660673f84cd275f76a1afc59b3f579e4480a67b85aae5c"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/MainShellActivity.kt",
          "sha256": "9ee6c4e4056d0d38fb63fe092285b7803a90a506b7e2ee628155126094f2b0e7"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt",
          "sha256": "f3421337761ea902522bf059887907253fb65c6385b1eb3b0d528b60dd1e3984"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json",
          "sha256": "ced1e411c816b14c66a7d037c4800986b77c04e23e0fa173555e423c9f19a9e3"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "POC CR ab47cb8实现九类行为，d675956后续刷新，10/13真实External页面、CRUD/持久化与凭据更改已有运行证据。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-06",
      "type": "assessment",
      "target": "REQ-20260224-screen-keep-awake",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-20260224-screen-keep-awake"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "a74f3581ea0ca545c1e7d90902f288fedb7fd249dafe8fd7fe6cc6ca1af8ee62",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-06",
        "coverage": "本轮完整重评 REQ-20260224-screen-keep-awake 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "delivered-reported",
      "verification": "pass-reported",
      "conclusion": "satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260726-001-android-foreground-screen-timeout.md",
          "sha256": "d26e314d468675ed57e1b845d4b3748e0ec8c50e608d8d72e67203be3432937b"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt",
          "sha256": "53bc57fcf49d0400dbe0210918ef20d20cb7fcb00219bbb4f23c27d6746f76af"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/util/UiPreferences.kt",
          "sha256": "e9c026baec158ca476cae6419ce018dc8d812c72aa5c84028e10d779dd3a8d70"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/MainShellActivity.kt",
          "sha256": "9ee6c4e4056d0d38fb63fe092285b7803a90a506b7e2ee628155126094f2b0e7"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt",
          "sha256": "2a8439a85cdea3425afded287a095a4ac7c1f1621d475bbece1b2dd0e46b8f00"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/SettingsActivity.kt",
          "sha256": "f00a69fb2b560fe2101b3d4f98c6965f093ad515b42c1a8e29e4b770d96caed4"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt",
          "sha256": "c1c09d74c2e23cf240647cbb3fe4389e5c39573f7240a728ebc00e70da5f22b8"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "TASK20260726-001完成档位与四Activity控制器，JVM/build已通过；当前静态接入仍在，任务明确把实机定时等待作为非阻塞观察。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-07",
      "type": "assessment",
      "target": "REQ-20260309-codex-capability-mvp",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-20260309-codex-capability-mvp"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "53a91716ea68f9c9b1e7f13d24a86d83a463624598fdf5b1a69ab555ca0b40ac",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-07",
        "coverage": "本轮完整重评 REQ-20260309-codex-capability-mvp 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "partial-reported",
      "verification": "mixed-reported",
      "conclusion": "partially-satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md",
          "sha256": "a3365300fcb54bfd55d826a6b2382ffb7d8e9e98c8219031df4c8b90e38abc0a"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md",
          "sha256": "794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md",
          "sha256": "6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md",
          "sha256": "d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md",
          "sha256": "9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md",
          "sha256": "53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260722-002-android-codex-open-conversation-files.md",
          "sha256": "f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260409-2332-native-closeout.md",
          "sha256": "f56816f0fd2aa565bb1c80e77dd9b1e628a80c20cd7546ff281c00fd474066d6"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md",
          "sha256": "bbb56923319c4929655f3ff2d21c848ca48f2821b450c2f11f28d64b51b3bf89"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md",
          "sha256": "8f042d5a108ea6e1124c396bb22b39f05b9c426f047d115df7770424ce281046"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "docs/codex/codex-rollout-collector-architecture.md",
          "sha256": "3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"
        },
        {
          "kind": "file",
          "path": "docs/workflow/CONTRACTS.md",
          "sha256": "c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"
        },
        {
          "kind": "file",
          "path": "docs/workflow/DECISIONS.md",
          "sha256": "747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md",
          "sha256": "74cb3cab6fabaf0a96cdc2121fef66ee9df8273791d2fffe9115daef77f79784"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "3月SUMMARY及May cwd/Skills、July visual/composer/files均真实实施；10/13聊天、线程、配置、审批、附件实际运行，局部明确失败不代表未开始。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-08",
      "type": "assessment",
      "target": "REQ-20260318-ws-0001-docs-exp",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-20260318-ws-0001-docs-exp"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "8f35ec452214d5a95103b72082f79d9a4ed6acfafb1f6c1754bf4ab026bbc137",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-08",
        "coverage": "本轮完整重评 REQ-20260318-ws-0001-docs-exp 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "partial-reported",
      "verification": "mixed-reported",
      "conclusion": "partially-satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md",
          "sha256": "fc8833070bdbcbb80d98349aa8ef2ac101704ce4f2227d5869fa4334c3943147"
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
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json",
          "sha256": "01dd714ed5f840b8d2bce17292520517b76ad9ed7026b738228adb90ac835c9b"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt",
          "sha256": "eb48c499981000b52116a804481eacc4c6365f64a3e5c074263bea2b16efd7d5"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "原3月浏览/HEADdiff后经TASK60718-003明确扩展PDF/图片/下载/双比较，60719阅读修复；10/13真实浏览与PDF反例均有记录。"
        },
        "batch": 1
      }
    },
    {"id":"AS-CURRENT-20261014-09","type":"assessment","target":"REQ-20260324-session-list-local-cache","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075","item_id":"REQ-20260324-session-list-local-cache"},"target_definition_algorithm":"vnext-product-definition/v1","target_definition_sha256":"4069c188d3fefee95d89e0ad550bdad2a3aee4a99f34afa9096295f3bc0d9556","goal_basis":{"kind":"file","path":"docs/product/GOALS.md","sha256":"b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe","item_id":"GOAL-TERMLINK"},"goal_definition_algorithm":"vnext-product-definition/v1","goal_definition_sha256":"08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b","applicability":{"goal_id":"GOAL-TERMLINK","scope_id":"CURRENT-20261014-09","coverage":"本轮完整重评 REQ-20260324-session-list-local-cache 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"},"checked_at":"2026-10-14T19:30:10.707071+00:00","subject":{"kind":"commit","value":"a78fe55e033bbcb6db816acd2c801de5aa28a081","limitations":"本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"},"implementation":"delivered-reported","verification":"mixed-reported","conclusion":"undetermined","sources":[{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"},{"kind":"file","path":"docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md","sha256":"e500ebe2228660fae82027821044bd3098a7b1ef062a3b50ffe3be05e4434898"},{"kind":"file","path":"docs/changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md","sha256":"0bd561a2efbe7e4d866f4aa254e4e6e3b88af8a2d63f695ffde3af58d5411694"},{"kind":"file","path":"docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md","sha256":"039aa9d8c32589b55e6b68e1bad55c53621ac6881d74b97624255b52700deb7f"},{"kind":"file","path":"android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt","sha256":"c58e43438218cdc78cd26243646d001dd6b4cea4cee0dd718d60886f7c0880e1"},{"kind":"file","path":"android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt","sha256":"34d8fda96575e05142bb9390d3e74148d82c9aa54a5ffb225e01794ac86a7ac1"},{"kind":"file","path":"android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt","sha256":"d12e2bf943591924babdcaa8277f13d249f8c229c7b9ffb68ebef360351b9c95"},{"kind":"file","path":"android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt","sha256":"5713c9f45d4061b262660673f84cd275f76a1afc59b3f579e4480a67b85aae5c"},{"kind":"file","path":"docs/product/assessments/ANDROID-20261013.md","sha256":"4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json","sha256":"c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md","sha256":"e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"}],"extensions":{"startup":{"state":"已开始过","basis":"6a0f06e原closeout真实LYA-TL00 Android10 instrumentation34/34；2aaf6b6写回generation修复已纳入，当前Store/Fragment逻辑仍实现。"},"batch":1}},
    {
      "id": "AS-CURRENT-20261014-10",
      "type": "assessment",
      "target": "REQ-20260326-android-profile-mtls-runtime-certificate",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-20260326-android-profile-mtls-runtime-certificate"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "4b2e04108826f2245a75188456f9bcdb1e8b9a1aadab4fab63107974a3f9d915",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-10",
        "coverage": "本轮完整重评 REQ-20260326-android-profile-mtls-runtime-certificate 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "delivered-reported",
      "verification": "pass-reported",
      "conclusion": "satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md",
          "sha256": "a1358fd2f3eaf7f47f1d977f3d0380281754bde626c4e9fe3a8a5728b10b9192"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md",
          "sha256": "dfc0b8f5d6f61e79a92d12e2f7cbe4d9e6b4ed8ed31d5d71aa5c8eeba9361197"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md",
          "sha256": "74accf4d3cbbe9bdfeb9ac7f1595572a2a8e8d67a881bc7f95973e7c8c6502ea"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md",
          "sha256": "bd0d7030a21f44f5806c14738a7692faa296414823b9fec6edcc63c8f0e42763"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md",
          "sha256": "3c739c433d742b412e9869d55c3cda1faca0e7cc433fcfb22975a635c5a9b208"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt",
          "sha256": "4e7a81774c5bd51ff411a309b8e76649da6096ce0101a97f2266c249815dc340"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt",
          "sha256": "993236080ebd2aef4f8fd78f61169be102bb14875b3bdd10a03f1d051a060f17"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt",
          "sha256": "5bb04adde92afdb7fbd508ab3d5c16c210600e262195253543e7674509fbb923"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt",
          "sha256": "318370c995bdf96dd92d64363957c3b43c442489950b76f27c8f5ce1c02b2ae7"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt",
          "sha256": "d0ff652f1fb8dd7d7922bdac2b34f37f6cbfe6107bd99d74a40ce50c88e01dae"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md",
          "sha256": "5d8c775b006570e0805783111a446edd938d5eac2fcd4ded2ef1fc2649a57589"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md",
          "sha256": "ff6954703726dec815de7c2bae0dd5f4ff98f418392b1d5e110951118600dd29"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md",
          "sha256": "98eaecfc9bce17b6279bc0f8476e49c1138d4f84dc08d20c3dd7b274a9e434b6"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md",
          "sha256": "1a4fbcf0dc424296f3a172c8d34a135025b9f20adcd6a6bb21eb424076d5d36e"
        },
        {
          "kind": "file",
          "path": "docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md",
          "sha256": "971493b5810b2b6764b1788b87775ae80f4739037b1e6db8e3a1be3db141cfec"
        },
        {
          "kind": "file",
          "path": "docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md",
          "sha256": "0657f6dd8c78c20864455c5cd448dba54edb405e51083e2db91a91daa9579342"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260326-2334-phase5-settings-android-tests.md",
          "sha256": "f39fb4f3e7f5e2e6305cf9e9430ca8cd18d7e87022609493c082dbd80625a9be"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md",
          "sha256": "bdc1157ccbe8e999efa49a38149aa7d597e84634204a511006f97beda54a1929"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "多批证书store/settings/runtime CR及真机3/3；f43ff6f direct-IP三层回归与da5470a Codex mTLS WSS修复真实通过，足以证明已实施而非证据空白。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-11",
      "type": "assessment",
      "target": "REQ-20260329-language-normalization",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-20260329-language-normalization"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "077063f71f9d9d6c74eef68281fdc67975deab81031c7b3483ef21cafa51067e",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-11",
        "coverage": "本轮完整重评 REQ-20260329-language-normalization 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "partial-reported",
      "verification": "mixed-reported",
      "conclusion": "partially-satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260330-0500-language-normalization-closeout.md",
          "sha256": "52eb4103283805b1fbb95a628e8774e39dab9c1da3db52060fd215c084959a44"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/util/LocaleHelper.kt",
          "sha256": "b3f40ef6c2b17f386346a652ace37806cfd8c4420ea98372b291a44baf860079"
        },
        {
          "kind": "file",
          "path": "public/i18n/i18n.js",
          "sha256": "453f1cfe0c167acc5446d9133dfb0c47ddfbea568a0d5fc2d354dc8d44c73d7d"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/MainShellActivity.kt",
          "sha256": "9ee6c4e4056d0d38fb63fe092285b7803a90a506b7e2ee628155126094f2b0e7"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "3月分期实现与32e39b4收口；语言包398/398、native159/159和扩展ja原通过，当前locale代码与10/13系统切换可用。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-12",
      "type": "assessment",
      "target": "REQ-20260408-codex-native-android-migration",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-20260408-codex-native-android-migration"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "94cf786c1004116aad5270578add8e7a629e88ba3e83f4146895a4e4cef9ab0e",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-12",
        "coverage": "本轮完整重评 REQ-20260408-codex-native-android-migration 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "partial-reported",
      "verification": "mixed-reported",
      "conclusion": "partially-satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260409-2332-native-closeout.md",
          "sha256": "f56816f0fd2aa565bb1c80e77dd9b1e628a80c20cd7546ff281c00fd474066d6"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md",
          "sha256": "12fe3ce575a5d5e22eb72dc4a1f18bc5c8490038322125f5a0621b2662ce0c11"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md",
          "sha256": "3c739c433d742b412e9869d55c3cda1faca0e7cc433fcfb22975a635c5a9b208"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md",
          "sha256": "8f042d5a108ea6e1124c396bb22b39f05b9c426f047d115df7770424ce281046"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md",
          "sha256": "111782fec5bf7f8bcb119c4251474c17664ed667f460b0c350475b76753a58ea"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md",
          "sha256": "bbb56923319c4929655f3ff2d21c848ca48f2821b450c2f11f28d64b51b3bf89"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md",
          "sha256": "66b09c5c189cfd3a42b84d3b149e9fac3bf9cf1f08419eb018e746f514e28055"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md",
          "sha256": "9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md",
          "sha256": "53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/MainShellActivity.kt",
          "sha256": "9ee6c4e4056d0d38fb63fe092285b7803a90a506b7e2ee628155126094f2b0e7"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt",
          "sha256": "1321f7ced1dc7fdfbca8d92d506435459820336860bb04a36ce83528a68e3401"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md",
          "sha256": "74cb3cab6fabaf0a96cdc2121fef66ee9df8273791d2fffe9115daef77f79784"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "原native closeout、后续入口移除、mTLS修复和July两UI任务均有真实实现/设备结果；MainShell当前直接CodexActivity.newIntent，不能用旧draft状态推未开始。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-13",
      "type": "assessment",
      "target": "REQ-20260415-codex-android-runtime-interaction-fixes",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-20260415-codex-android-runtime-interaction-fixes"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "320e29dfe02364e77eb95d59c99afb231e9d191980139d2ea5e167efdfcbdff7",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-13",
        "coverage": "本轮完整重评 REQ-20260415-codex-android-runtime-interaction-fixes 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "delivered-reported",
      "verification": "mixed-reported",
      "conclusion": "undetermined",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md",
          "sha256": "66b09c5c189cfd3a42b84d3b149e9fac3bf9cf1f08419eb018e746f514e28055"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md",
          "sha256": "bbb56923319c4929655f3ff2d21c848ca48f2821b450c2f11f28d64b51b3bf89"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md",
          "sha256": "b9ddab14e5fc75e31a8114e953536f043bafa9ee0278be54a7c0523867f1930c"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md",
          "sha256": "8f042d5a108ea6e1124c396bb22b39f05b9c426f047d115df7770424ce281046"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md",
          "sha256": "53ef3940d668bfd59115ca0b0aa02de9d5c6848d48a7a32af18e780a9d3b7486"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260722-002-android-codex-open-conversation-files.md",
          "sha256": "f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json",
          "sha256": "83e719243b408be9a9e67f0bb5b31b3061a4f5c4c719f72f129cc48b3061898e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s1/report.md",
          "sha256": "b8983f981f7769d31de80942a97aeaa1f3e74c07e7824db5aa40d864e1086715"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s2/report.md",
          "sha256": "f29b791e692cad1842209f2bb63040a8a5166924896b7b014c9e7a5a474eab9e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s3/report.md",
          "sha256": "7ab9147c9191c759680a5173862362c0bd7e1dd6c85fbf412940d25815735560"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-close/closure-20261013.md",
          "sha256": "9eeddb0b93750863ac44aaa424cbe92bbae17b464c5d58f584e73ecb4a79cffd"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md",
          "sha256": "74cb3cab6fabaf0a96cdc2121fef66ee9df8273791d2fffe9115daef77f79784"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json",
          "sha256": "8420f108e8832398bdd92e898eaa82d8ac4b423d909ba5df7571433013aad2a3"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt",
          "sha256": "1321f7ced1dc7fdfbca8d92d506435459820336860bb04a36ce83528a68e3401"
        },
        {
          "kind": "file",
          "path": "src/server.js",
          "sha256": "ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6"
        },
        {
          "kind": "file",
          "path": "docs/workflow/CONTRACTS.md",
          "sha256": "c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"
        },
        {
          "kind": "file",
          "path": "docs/workflow/DECISIONS.md",
          "sha256": "747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s1/review-second-repair-20261013.md",
          "sha256": "c3cbb2c85a9b7487ef5572c2206607f03cf439ffe6d3ed3ffb4467c7e02286a7"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "4月六批运行态修复已完成各自JVM/设备例；后续TASK20260868已closed并在3d72aac9提交连接/IPC提示修复，原in_progress与CRdraft不等于未实施。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-14",
      "type": "assessment",
      "target": "REQ-20260516-codex-mobile-realtime-sync",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-20260516-codex-mobile-realtime-sync"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "52ee74a6cbf618f8a730e0bf584bbede810661969ae1b4c17a83a7f5bb9ea3d7",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-14",
        "coverage": "本轮完整重评 REQ-20260516-codex-mobile-realtime-sync 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "partial-reported",
      "verification": "mixed-reported",
      "conclusion": "undetermined",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md",
          "sha256": "b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md",
          "sha256": "012ed5e5a65203e8f5feeaa59ab03fb1820c4c5a7a3b10d60ca98b7bed7be623"
        },
        {
          "kind": "file",
          "path": "docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md",
          "sha256": "fc692f2d64b637a62ac23a13a20f9ec5a4ee9a52a33fda6a755b8d68c6d87ffa"
        },
        {
          "kind": "file",
          "path": "TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md",
          "sha256": "b4ce7320e3baeeeef168847c6dc07f7d6e5d4f1f198907e08b8d6a616a76195b"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s3/report.md",
          "sha256": "7ab9147c9191c759680a5173862362c0bd7e1dd6c85fbf412940d25815735560"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md",
          "sha256": "74cb3cab6fabaf0a96cdc2121fef66ee9df8273791d2fffe9115daef77f79784"
        },
        {
          "kind": "file",
          "path": "src/services/codexIpcFeed.js",
          "sha256": "b2949275ba34abf97c12bdc6056c36bc9df03598586a5ade44114b153dff6cc3"
        },
        {
          "kind": "file",
          "path": "docs/codex/codex-rollout-collector-architecture.md",
          "sha256": "3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"
        },
        {
          "kind": "file",
          "path": "docs/workflow/CONTRACTS.md",
          "sha256": "c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"
        },
        {
          "kind": "file",
          "path": "docs/workflow/DECISIONS.md",
          "sha256": "747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "TASK60629与Web60615/60617、paused60727多阶段真实实现；8/14 P0-C/retention/replay人工通过，不按paused头部把已完成步骤写成未启动。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-15",
      "type": "assessment",
      "target": "REQ-20260715-linux-interactive-release-installer",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-20260715-linux-interactive-release-installer"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "a7c498ea2455e124fd4bd369de1b9f006ffe4048a8b0de5e3c2aff808317405e",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-15",
        "coverage": "本轮完整重评 REQ-20260715-linux-interactive-release-installer 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "delivered-reported",
      "verification": "mixed-reported",
      "conclusion": "undetermined",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260715-1635-linux-interactive-installer.md",
          "sha256": "236b07d397d0d779877e53fe416803a553b06e3364316b7bb43ccfc4182b0b37"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "install.sh",
          "sha256": "70ce7856f314b4356adc7e4fef3602fb3845c9f478a0b23e7748ad085367cc69"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "20398215b7e1586f48e47d9e527a7bb7e5b13ead原P2-P4实现及P5本地33/33/打包证据；当前install.sh确有平台/systemd/依赖/配置入口。"
        },
        "batch": 1
      }
    },
    {"id":"AS-CURRENT-20261014-16","type":"assessment","target":"REQ-20261005-codex-history-save-repair","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075","item_id":"REQ-20261005-codex-history-save-repair"},"target_definition_algorithm":"vnext-product-definition/v1","target_definition_sha256":"39dac437189d47653eeb822500e39be6f4fa21c3481793374c2bdd42a5bf9d75","goal_basis":{"kind":"file","path":"docs/product/GOALS.md","sha256":"b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe","item_id":"GOAL-TERMLINK"},"goal_definition_algorithm":"vnext-product-definition/v1","goal_definition_sha256":"08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b","applicability":{"goal_id":"GOAL-TERMLINK","scope_id":"CURRENT-20261014-16","coverage":"本轮完整重评 REQ-20261005-codex-history-save-repair 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"},"checked_at":"2026-10-14T19:30:10.707071+00:00","subject":{"kind":"commit","value":"a78fe55e033bbcb6db816acd2c801de5aa28a081","limitations":"本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"},"implementation":"delivered-reported","verification":"pass-reported","conclusion":"satisfied","sources":[{"kind":"file","path":"AGENTS.md","sha256":"07788bfa3e3c4be20fd34c96b93297cf9f333fa9079901c31f9a58b22d504f35"},{"kind":"file","path":".agents/skills/maintain-project/SKILL.md","sha256":"845b891d5c16951f8e77300da6f2883b065914089b45e1d8c5e5344d367f7374"},{"kind":"file","path":".workflow-system/WORKFLOW_PROTOCOL.md","sha256":"a1e0a4df91ee1d27429be4e138440898e266ac791581b9a08aa19d75afbdc4c6"},{"kind":"file","path":".workflow-system/runtime/support/product-maintenance/references/reconcile.md","sha256":"41395ad8cb7cdba75231ed9f9dc20fe79f3eeb0af7403810ba389ed6c734ab97"},{"kind":"file","path":".workflow-system/runtime/support/product-maintenance/references/binding-contribution.md","sha256":"155cbaf1eb0d99f5a7876df0d65bff98e4bf25412fe8fd6e71b1bac1f4804383"},{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"},{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-save-repair.md","sha256":"1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"},{"kind":"file","path":"docs/product/plans/PLAN-20261005-codex-history-save-repair.md","sha256":"71bfeca65adecf5b828707dbb8a49e930ce1ef6f571f535439c6299a308d7cbb"},{"kind":"file","path":"docs/codex/codex-history-shared-compat-contract.md","sha256":"d1f3ba55d88d41e3946933b9a2c6ecd10f6b3db7b3c40f76def254d8c05d3a05"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"docs/product/history/maintenance-20261011/TASK832-close-report.md","sha256":"7a5eec7b35440317bcab207b0d066809583349bdebce4cc3d65cbedaa0003607"},{"kind":"file","path":"docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md","sha256":"1420cfc800a31826a6bebcafa17cbe84d3704601da65ccc3bf325be38a1767e6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md","sha256":"fcc1ff5a866d55311611242b529f622135bd9597f0b1ce89c6e7912a5b7e370f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json","sha256":"7bd2ee90ef2820a13171614171ce8ed2379125e083e3d961af6a89bb79b108c1"},{"kind":"file","path":"docs/product/history/maintenance-20261011/current-assessment-20261012/item-18-evidence.json","sha256":"12888d2762095f4905367d11e0d486281fb2dd334131648ee8eb7e77f811e31e"},{"kind":"file","path":"docs/product/DELIVERY_RECONCILIATION.md","sha256":"999fb929ab43dfb015a718e1f32145eefd6bb3d95ef8db031ad40a8e50a41922"},{"kind":"file","path":"docs/product/assessments/ANDROID-20261013.md","sha256":"4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"},{"kind":"file","path":"docs/changes/records/CR-20261007-0245-branch-product-delivery.md","sha256":"ea73fc8fc77c8fd23c57a6227e24b5203b9aee612582160bd0381cec2b7f6e54"},{"kind":"file","path":"docs/changes/records/CR-20261007-0900-branch-history-parent.md","sha256":"e1fd6abde9f95f10e4c9e65049e5e4dcb5261b7fa1847833e973dde85fc2561f"},{"kind":"file","path":"docs/changes/records/CR-20261008-0045-stdout-utf8-repair.md","sha256":"d772a07d36f1329bf974048043a33b6c91fddb7c9dbce7818b8f1d044f45fc31"},{"kind":"file","path":"docs/changes/records/CR-20261008-0022-branch-validation-utf8-diagnosis.md","sha256":"1a2dc08624d6b073ebb26dfa960b5f538e2e3f397959257dadcc0bc0453f9444"},{"kind":"file","path":"docs/changes/records/CR-20261007-1242-live-history-save-validation.md","sha256":"43629c49a7069c3271dc3f4a3f013ab13834e5c9a931421837c4548d3606d4cd"},{"kind":"file","path":"docs/changes/records/CR-20261008-0135-android-history-detail-alias.md","sha256":"74501ac5376ba0d3c2ad549aeed89cda79d4e4a41005e658f0392455480d8ba9"},{"kind":"file","path":"docs/changes/records/CR-20261007-0219-branch-history-window-repair.md","sha256":"ee11ebd4291d1bc5a61d05b10232351d6ab7ef1c64c04608d4ca102698b33ec4"},{"kind":"file","path":"docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md","sha256":"04b7fff55add0bc00188f938b7546eacc7cd85df32ba9a961c105e2e65125e11"},{"kind":"file","path":"src/services/codexRolloutCollector/analysisBatchImporter.js","sha256":"c5cd7c8fbd89a3b3df2d15542ff34ab91be49e4ec3ac3bb205a83d8bb9e7f49c"},{"kind":"file","path":"native/codex-rollout-collector/src/source/discovery.rs","sha256":"13b9092a2653c4555035fb1767cc0ebac2dc1b2314042145f3a52692540a2d6e"},{"kind":"file","path":"native/codex-rollout-collector/src/codex_adapter/mod.rs","sha256":"7d594abcc56bf632ac04b0dd0d904e24317c298e3ffddccd75d42338adda35bc"},{"kind":"file","path":"android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt","sha256":"1321f7ced1dc7fdfbca8d92d506435459820336860bb04a36ce83528a68e3401"},{"kind":"file","path":"src/services/codexRolloutCollector/index.js","sha256":"f394444946bdd69e9a7effd5679fc46343f7052dc16c6db148b34fef98265c19"},{"kind":"file","path":"src/services/codexHistoryReconciliationScheduler.js","sha256":"90884a77cedee0802f367dcdf6bf25da65c4a2f5d3da8483d8d291bb106a9f6d"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json","sha256":"c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md","sha256":"e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"}],"extensions":{"startup":{"state":"已开始过","basis":"直接执行已建立：832真实task-58bc12d9a46b8d84fb6e42888785b402的S3 Rust父来源/切点及窗口修复，S5 UTF8生产修复和原持久根三类保存，S6 Android详情alias及同机重验；833真实task-7ff69ba8242c90c52f0b93fa1144a655提供H1/H3前置。依据原执行/独立审查/代码，而非binding或closed。"},"batch":1}},
    {"id":"AS-CURRENT-20261014-17","type":"assessment","target":"REQ-20261005-codex-history-shared-compat","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075","item_id":"REQ-20261005-codex-history-shared-compat"},"target_definition_algorithm":"vnext-product-definition/v1","target_definition_sha256":"9499a656c4ca27fbe73ade8df4e400d33dc3d3039f0479611418c1bba7146c68","goal_basis":{"kind":"file","path":"docs/product/GOALS.md","sha256":"b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe","item_id":"GOAL-TERMLINK"},"goal_definition_algorithm":"vnext-product-definition/v1","goal_definition_sha256":"08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b","applicability":{"goal_id":"GOAL-TERMLINK","scope_id":"CURRENT-20261014-17","coverage":"本轮完整重评 REQ-20261005-codex-history-shared-compat 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"},"checked_at":"2026-10-14T19:30:10.707071+00:00","subject":{"kind":"commit","value":"a78fe55e033bbcb6db816acd2c801de5aa28a081","limitations":"本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"},"implementation":"delivered-reported","verification":"pass-reported","conclusion":"satisfied","sources":[{"kind":"file","path":"AGENTS.md","sha256":"07788bfa3e3c4be20fd34c96b93297cf9f333fa9079901c31f9a58b22d504f35"},{"kind":"file","path":".agents/skills/maintain-project/SKILL.md","sha256":"845b891d5c16951f8e77300da6f2883b065914089b45e1d8c5e5344d367f7374"},{"kind":"file","path":".workflow-system/WORKFLOW_PROTOCOL.md","sha256":"a1e0a4df91ee1d27429be4e138440898e266ac791581b9a08aa19d75afbdc4c6"},{"kind":"file","path":".workflow-system/runtime/support/product-maintenance/references/reconcile.md","sha256":"41395ad8cb7cdba75231ed9f9dc20fe79f3eeb0af7403810ba389ed6c734ab97"},{"kind":"file","path":".workflow-system/runtime/support/product-maintenance/references/binding-contribution.md","sha256":"155cbaf1eb0d99f5a7876df0d65bff98e4bf25412fe8fd6e71b1bac1f4804383"},{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"},{"kind":"file","path":"docs/product/requirements/REQ-20261005-codex-history-shared-compat.md","sha256":"eb093d22edfe6ad18a52ccf88a4f918cad3915cd94126f92b09aacc895025bdb"},{"kind":"file","path":"docs/product/plans/PLAN-20261005-codex-history-shared-compat.md","sha256":"c6271589d7ab979dc4c5e7e1dcb4838337d2e39d4702aa47254cfb7d6d675e43"},{"kind":"file","path":"docs/codex/codex-history-shared-compat-contract.md","sha256":"d1f3ba55d88d41e3946933b9a2c6ecd10f6b3db7b3c40f76def254d8c05d3a05"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md","sha256":"04b7fff55add0bc00188f938b7546eacc7cd85df32ba9a961c105e2e65125e11"},{"kind":"file","path":"docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md","sha256":"fcc1ff5a866d55311611242b529f622135bd9597f0b1ce89c6e7912a5b7e370f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/current-assessment-20261012/item-19-evidence.json","sha256":"2e48939997616b3994f7632c0d828e58217442a819c5d84a68c795f02158bb36"},{"kind":"file","path":"docs/product/history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json","sha256":"7bd2ee90ef2820a13171614171ce8ed2379125e083e3d961af6a89bb79b108c1"},{"kind":"file","path":".workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json","sha256":"f7669c82e1fcf599dd783a4f62eafb611a66f22399f2a8cdc764914d001a31cd"},{"kind":"file","path":"docs/changes/records/CR-20261005-1521-shared-history-compat-design.md","sha256":"8215f6bcfe83e1727247b34221abc76d2623569979617249a3c1a7ee2e4cab60"},{"kind":"file","path":"docs/changes/records/CR-20261005-1901-shared-history-wire-compat.md","sha256":"076bb0cb1a7d25863fe97a63777909b455a238cd65a595ca05a8c5c1bf2a60a5"},{"kind":"file","path":"docs/changes/records/CR-20261006-1846-history-promotion-proof-repair.md","sha256":"1a91bf28d8beebbf5e3bd37a98b8ad58fe76826a70f87ed3f04d679c3ebf5b78"},{"kind":"file","path":"docs/changes/records/CR-20261005-1722-shared-history-compat-design-repair.md","sha256":"8efd62f09e13743c729ff7c3f02f3b58287b74ff41b78c9e2d5f961faf36a1e0"},{"kind":"file","path":"docs/changes/records/CR-20261006-2016-history-product-delivery.md","sha256":"d3fafcee697c7d4f90d6a3388d39b683373c0c50443fb105cedbcf6bbc6b5c59"},{"kind":"file","path":"docs/changes/records/CR-20261006-0200-shared-history-node-consumer.md","sha256":"b477fe37137efbc54afcafadec7db006d0f07b4e1cb163f2806ae9d393391231"},{"kind":"file","path":"docs/changes/records/CR-20261006-0010-shared-history-rust-semantics.md","sha256":"b7eb0511d8f74b734767e6973823486cd0bfa0de51dd0b212807d7f712387a86"},{"kind":"file","path":"native/codex-rollout-collector/vendor/codex/vendor-manifest.toml","sha256":"86463cc83b39181f178bd9f34cf8f5b9d72a7b29e5be2ec565c692842157cde3"},{"kind":"file","path":"native/codex-rollout-collector/src/codex_adapter/mod.rs","sha256":"7d594abcc56bf632ac04b0dd0d904e24317c298e3ffddccd75d42338adda35bc"},{"kind":"file","path":"src/services/codexRolloutCollector/analyzerProtocol.js","sha256":"fa2792daab5591d4b2e83e1a5c085a27090f9a95907b7abec613e6302695c85d"},{"kind":"file","path":"native/codex-rollout-collector/src/analysis.rs","sha256":"3f35ef604287e5167739a83ae1c50e840e3d2ccabcce45cbdc3009b2eddbaffa"},{"kind":"file","path":"src/services/codexRolloutCollector/analysisBatchImporter.js","sha256":"c5cd7c8fbd89a3b3df2d15542ff34ab91be49e4ec3ac3bb205a83d8bb9e7f49c"},{"kind":"file","path":"src/services/codexRolloutCollector/index.js","sha256":"f394444946bdd69e9a7effd5679fc46343f7052dc16c6db148b34fef98265c19"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json","sha256":"c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md","sha256":"e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"}],"extensions":{"startup":{"state":"已开始过","basis":"833已实际执行S2 Spike→formal wire、S3 Rust、S4 Node及S4-R1修复、S5真实Rust/Node/File/临时SQLite/provider验收。原S5报告和独立832累计复核、当前核心源码均可读；开始与交付不由closed推出。"},"batch":1}},
    {
      "id": "AS-CURRENT-20261014-18",
      "type": "assessment",
      "target": "REQ-TERMLINK-CORE-TERMINAL",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-CORE-TERMINAL"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "a000a6264bebf18f6e09903d3e6510a0dc4519fe36914c8ce20e62679d685911",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-18",
        "coverage": "本轮完整重评 REQ-TERMLINK-CORE-TERMINAL 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "partial-reported",
      "verification": "mixed-reported",
      "conclusion": "partially-satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md",
          "sha256": "3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md",
          "sha256": "d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md",
          "sha256": "0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md",
          "sha256": "e500ebe2228660fae82027821044bd3098a7b1ef062a3b50ffe3be05e4434898"
        },
        {
          "kind": "file",
          "path": "src/services/sessionManager.js",
          "sha256": "dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"
        },
        {
          "kind": "file",
          "path": "src/repositories/sessionStore.js",
          "sha256": "f94dbabd8986c807611279e7a34ecb33184f3287b414729fcbceb294d4b641df"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s2/report.md",
          "sha256": "f29b791e692cad1842209f2bb63040a8a5166924896b7b014c9e7a5a474eab9e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md",
          "sha256": "74cb3cab6fabaf0a96cdc2121fef66ee9df8273791d2fffe9115daef77f79784"
        },
        {
          "kind": "file",
          "path": "docs/workflow/DECISIONS.md",
          "sha256": "747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json",
          "sha256": "c013a6d7e0e75430618ec5d8cb70dd4a8fbac571098e9a499bb6fa399dd292cd"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "既有PTY/WS/session实现和60618刷新修复真实存在，JOINT真实浏览器PTY/续接通过；Android首输入污染反例及终端Wi-Fi恢复失败仍适用。元数据也已有Store/恢复代码。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-19",
      "type": "assessment",
      "target": "REQ-TERMLINK-RELEASE-BASELINE",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-RELEASE-BASELINE"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "344cada5546a6c6433c9defa768bbd0ffaab8d4b8f8b6c4c927559d1938c4d50",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-19",
        "coverage": "本轮完整重评 REQ-TERMLINK-RELEASE-BASELINE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "delivered-reported",
      "verification": "mixed-reported",
      "conclusion": "undetermined",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md",
          "sha256": "4d6e41ea6a2957034277676804c32ca448925a976bd8a10d37a87701a22ce33a"
        },
        {
          "kind": "file",
          "path": "docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md",
          "sha256": "4de557c29870f9e2b32d4df53419f525806acd4d269c5bd3f67d4b93f5068c03"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md",
          "sha256": "0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "TASK60513 May发行安装工具已交付且用户5/17确认WinPM2/Linuxsystemd冒烟；JulyWindows x64内置Node/配置工具实现存在。只余部分发布目标证据，不是未启动。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-20",
      "type": "assessment",
      "target": "REQ-TERMLINK-WEB-UX",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-WEB-UX"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "9d393b2f445fb96bc8ea0d2511fe39264c717ee4f947e8ae8889c21e1cb1aaae",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-20",
        "coverage": "本轮完整重评 REQ-TERMLINK-WEB-UX 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "partial-reported",
      "verification": "mixed-reported",
      "conclusion": "partially-satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md",
          "sha256": "0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md",
          "sha256": "64806d74a19d506734ed909ef6bfdae2834beb0302ff6555ace86e1b63b15ed4"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md",
          "sha256": "012ed5e5a65203e8f5feeaa59ab03fb1820c4c5a7a3b10d60ca98b7bed7be623"
        },
        {
          "kind": "file",
          "path": "docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md",
          "sha256": "0848f952f7b6b8956c032170219d6bbef0660a39a45a94e66c03a94340d835f9"
        },
        {
          "kind": "file",
          "path": "docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md",
          "sha256": "fc692f2d64b637a62ac23a13a20f9ec5a4ee9a52a33fda6a755b8d68c6d87ffa"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "docs/workflow/CONTRACTS.md",
          "sha256": "c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md",
          "sha256": "74cb3cab6fabaf0a96cdc2121fef66ee9df8273791d2fffe9115daef77f79784"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260617-001-web-codex-session-android-redesign.md",
          "sha256": "1faa341151c5cf0e076c139ae14bbe2d454e9a9cd7416c063c74c4cae0919def"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "TASK60715-002九步WebUX与60615/60616/60617及60716真实数据整合有实现/报告；JOINT浏览器登录/创建/输入/刷新成功，但Codex文档入口明确CannotGET。"
        },
        "batch": 1
      }
    },
    {
      "id": "AS-CURRENT-20261014-21",
      "type": "assessment",
      "target": "REQ-TERMLINK-DIAGNOSTICS",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-DIAGNOSTICS"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "2901b9d505e449998955c3d44b24205d87218aca56ee00f3ba3ef479b18f44cb",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "sha256": "b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe",
        "item_id": "GOAL-TERMLINK"
      },
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "goal_definition_sha256": "08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b",
      "applicability": {
        "goal_id": "GOAL-TERMLINK",
        "scope_id": "CURRENT-20261014-21",
        "coverage": "本轮完整重评 REQ-TERMLINK-DIAGNOSTICS 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:30:10.707071+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "delivered-reported",
      "verification": "pass-reported",
      "conclusion": "satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md",
          "sha256": "dbabf72656e7fa167e05c924e23f1001979fcf55a2f50d3ea8a5602eb015b857"
        },
        {
          "kind": "file",
          "path": "src/services/diagnosticLog.js",
          "sha256": "1e38e1698d5c7982abdb80836f807d4d05660ffc9e8a7060a3e2fbba5413d102"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/util/PersistentDiagnosticLog.kt",
          "sha256": "c14d654332ee2eb6ba35dbae1da84c837cdebc26a386882d9600ba4aba446930"
        },
        {
          "kind": "file",
          "path": "scripts/diagnostics/collect-known-issue-logs.ps1",
          "sha256": "b323084dfb5b092f338e78d6283aea1cc069c30109e936bf018ab74d5c2eedde"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json",
          "sha256": "c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md",
          "sha256": "e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"
        }
      ],
      "extensions": {
        "startup": {
          "state": "已开始过",
          "basis": "TASK60726-002 final e9f2a6e实际持久logger/collector；原定向与真实install-r保持日志/采集smoke通过，当前logger/collector代码可读。"
        },
        "batch": 1
      }
    },
    {"id":"AS-CURRENT-20261014-22","type":"assessment","target":"REQ-TERMLINK-HISTORY-PIPELINE","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075","item_id":"REQ-TERMLINK-HISTORY-PIPELINE"},"target_definition_algorithm":"vnext-product-definition/v1","target_definition_sha256":"bbef259c275bc058c893faa6593118ae2b80bad4ef953fef62fba063145b7b76","goal_basis":{"kind":"file","path":"docs/product/GOALS.md","sha256":"b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe","item_id":"GOAL-TERMLINK"},"goal_definition_algorithm":"vnext-product-definition/v1","goal_definition_sha256":"08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b","applicability":{"goal_id":"GOAL-TERMLINK","scope_id":"CURRENT-20261014-22","coverage":"本轮完整重评 REQ-TERMLINK-HISTORY-PIPELINE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"},"checked_at":"2026-10-14T19:30:10.707071+00:00","subject":{"kind":"commit","value":"a78fe55e033bbcb6db816acd2c801de5aa28a081","limitations":"本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"},"implementation":"partial-reported","verification":"mixed-reported","conclusion":"undetermined","sources":[{"kind":"file","path":"AGENTS.md","sha256":"07788bfa3e3c4be20fd34c96b93297cf9f333fa9079901c31f9a58b22d504f35"},{"kind":"file","path":".agents/skills/maintain-project/SKILL.md","sha256":"845b891d5c16951f8e77300da6f2883b065914089b45e1d8c5e5344d367f7374"},{"kind":"file","path":".workflow-system/WORKFLOW_PROTOCOL.md","sha256":"a1e0a4df91ee1d27429be4e138440898e266ac791581b9a08aa19d75afbdc4c6"},{"kind":"file","path":".workflow-system/runtime/support/product-maintenance/references/reconcile.md","sha256":"41395ad8cb7cdba75231ed9f9dc20fe79f3eeb0af7403810ba389ed6c734ab97"},{"kind":"file","path":".workflow-system/runtime/support/product-maintenance/references/binding-contribution.md","sha256":"155cbaf1eb0d99f5a7876df0d65bff98e4bf25412fe8fd6e71b1bac1f4804383"},{"kind":"file","path":"docs/codex/codex-rollout-collector-architecture.md","sha256":"3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"},{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"},{"kind":"file","path":"docs/codex/codex-history-product-contract.md","sha256":"39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"},{"kind":"file","path":"docs/codex/codex-history-shared-compat-contract.md","sha256":"d1f3ba55d88d41e3946933b9a2c6ecd10f6b3db7b3c40f76def254d8c05d3a05"},{"kind":"file","path":"TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md","sha256":"4c9e112e9e008599696dbda58f037a0ca70d210db6da23d2b9a6ef393dbc106d"},{"kind":"file","path":".workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json","sha256":"f7669c82e1fcf599dd783a4f62eafb611a66f22399f2a8cdc764914d001a31cd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/TASK832-close-report.md","sha256":"7a5eec7b35440317bcab207b0d066809583349bdebce4cc3d65cbedaa0003607"},{"kind":"file","path":"docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md","sha256":"1420cfc800a31826a6bebcafa17cbe84d3704601da65ccc3bf325be38a1767e6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md","sha256":"04b7fff55add0bc00188f938b7546eacc7cd85df32ba9a961c105e2e65125e11"},{"kind":"file","path":"docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md","sha256":"fcc1ff5a866d55311611242b529f622135bd9597f0b1ce89c6e7912a5b7e370f"},{"kind":"file","path":"docs/product/assessments/ANDROID-20261013.md","sha256":"4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"},{"kind":"file","path":"docs/product/history/maintenance-20261011/android-validation-20261013/history-large.json","sha256":"7d4b0e895b5747fed7e69ab4204a0c9851168a89fedb8db6b5cfdc1a867e24a9"},{"kind":"file","path":"docs/product/history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt","sha256":"c2a5596ca9c796ebd94af7028d7e26a709b077027a8e8f605e0ee414d15ddaab"},{"kind":"file","path":"docs/product/DELIVERY_RECONCILIATION.md","sha256":"999fb929ab43dfb015a718e1f32145eefd6bb3d95ef8db031ad40a8e50a41922"},{"kind":"file","path":"native/codex-rollout-collector/src/source/discovery.rs","sha256":"13b9092a2653c4555035fb1767cc0ebac2dc1b2314042145f3a52692540a2d6e"},{"kind":"file","path":"native/codex-rollout-collector/src/codex_adapter/mod.rs","sha256":"7d594abcc56bf632ac04b0dd0d904e24317c298e3ffddccd75d42338adda35bc"},{"kind":"file","path":"native/codex-rollout-collector/src/analysis.rs","sha256":"3f35ef604287e5167739a83ae1c50e840e3d2ccabcce45cbdc3009b2eddbaffa"},{"kind":"file","path":"src/services/codexRolloutCollector/analysisBatchImporter.js","sha256":"c5cd7c8fbd89a3b3df2d15542ff34ab91be49e4ec3ac3bb205a83d8bb9e7f49c"},{"kind":"file","path":"src/services/codexRolloutCollector/index.js","sha256":"f394444946bdd69e9a7effd5679fc46343f7052dc16c6db148b34fef98265c19"},{"kind":"file","path":"TASKS/TASK-003-rust-node-app.md","sha256":"3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"},{"kind":"file","path":"src/services/codexHistoryProductProvider.js","sha256":"00b4da43488098bcb67bc35879cbfe9ddb3676dd0f83c23216023c71393201de"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json","sha256":"c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md","sha256":"e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"}],"extensions":{"startup":{"state":"已开始过","basis":"早期Rust formal/Node4.5真实阶段交付、旧003实际源码后停止、004独立Node产品事务/包内smoke、005 Android静态缓存/详情及831真实调查均已执行；833/832又有当前保留的专项修复。不以缺少新拆子项binding判未开始。"},"batch":1}}
  ]
}
---

# TermLink current需求分批重评 1 / 3

固定基线 `a78fe55e033bbcb6db816acd2c801de5aa28a081`；本批22项，详细判断只保存在各单target报告，原历史报告不改写。

## [AS-CURRENT-20261014-01] 文档统一管理与需求流程标准化

<a id="AS-CURRENT-20261014-01"></a>

### 覆盖范围

需求：[REQ-20260222-doc-governance](../MANAGED_REQUIREMENTS.md#REQ-20260222-doc-governance)。本轮完整重评 REQ-20260222-doc-governance 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。真实CR c805842已修改需求同步约定与计划覆盖示例；现AGENTS/vNext、PRODUCT和实际assistance任务事实均存在。关联缺口不否定启动。

结论：**undetermined**。实现标记 delivered-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| **分层文档与导航**：按产品、架构、指南、运维、变更和历史资料分层，保留旧位置到当前文档的可追溯入口。 | 产品/架构/指南/运维/变更/历史目录及导航已存在 | JOINT#01查10个入口可达；不是全仓唯一入口证明 | 未据该功能证据确认额外业务欠交 | docs/README到PROJECT入口、所有旧入口/唯一active语义未全查 | docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md；TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md；docs/product/assessments/JOINT-20261013.md；AGENTS.md；.agents/skills/maintain-project/SKILL.md；.workflow-system/WORKFLOW_PROTOCOL.md；.workflow-system/runtime/support/product-maintenance/references/reconcile.md；.workflow-system/runtime/support/product-maintenance/references/binding-contribution.md |
| **需求正文与范围**：记录稳定需求身份、需求内容、范围边界和验收要求；保留已交付、当前、后续、候选和退出范围。 | 稳定REQ正文、scope分类和原材料分层由MANAGED_REQUIREMENTS承载 | 当前66current由原文筛选；三条非current不计欠交 | 未据该功能证据确认额外业务欠交 | 本批仅逐读22current及被引用子定义，其他正文由各批负责 | docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md；TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md；docs/product/assessments/JOINT-20261013.md；AGENTS.md；.agents/skills/maintain-project/SKILL.md；.workflow-system/WORKFLOW_PROTOCOL.md；.workflow-system/runtime/support/product-maintenance/references/reconcile.md；.workflow-system/runtime/support/product-maintenance/references/binding-contribution.md |
| **实施追踪**：按实际实施批次连接REQ、适用PLAN、CR与收尾说明，明确具体交付覆盖，而非只记录任务标题。 | CR-20260325-0000实际把缓存阶段写回PLAN/CR；后有任务关闭记录 | JOINT#01隔离REQ/PLAN/CR到真实commit关闭演练通过 | 未据该功能证据确认额外业务欠交 | 所有历史实施批次链接完整性未逐个复核 | docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md；TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md；docs/product/assessments/JOINT-20261013.md；AGENTS.md；.agents/skills/maintain-project/SKILL.md；.workflow-system/WORKFLOW_PROTOCOL.md；.workflow-system/runtime/support/product-maintenance/references/reconcile.md；.workflow-system/runtime/support/product-maintenance/references/binding-contribution.md |
| **变更证据**：CR保存实际改动、验证和回滚信息；active CR使用真实提交引用，历史报告保持其原对象和限制。 | CR保留验证/回滚和实际commit；本次读取发现部分draft/TBD属历史记录 | CR-20260325-0000验证仍写待回填；不能据active自动宣称验证通过 | 未据该功能证据确认额外业务欠交 | c805842之外全库active CR提交及验证未逐一复核 | docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md；TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md；docs/product/assessments/JOINT-20261013.md；AGENTS.md；.agents/skills/maintain-project/SKILL.md；.workflow-system/WORKFLOW_PROTOCOL.md；.workflow-system/runtime/support/product-maintenance/references/reconcile.md；.workflow-system/runtime/support/product-maintenance/references/binding-contribution.md |
| **当前维护入口**：PRODUCT登记受管正文、引用资料和历史保存位置；PROJECT、GOALS、需求、设计、安排及交付报告各承担已有职责。 | 现维护入口拆分登记、项目、目标、正文、安排与对账 | 已读AGENTS、maintain-project、WORKFLOW_PROTOCOL及reconcile/binding-contribution | 未据该功能证据确认额外业务欠交 | vNext升级前后所有导航约束未做全量静态对比 | docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md；TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md；docs/product/assessments/JOINT-20261013.md；AGENTS.md；.agents/skills/maintain-project/SKILL.md；.workflow-system/WORKFLOW_PROTOCOL.md；.workflow-system/runtime/support/product-maintenance/references/reconcile.md；.workflow-system/runtime/support/product-maintenance/references/binding-contribution.md |
| **任务与材料查询**：现有assistance查询实际任务事实，文档盘点登记已读及未读范围；关闭事实、资料保存和业务满足分别表达。 | assistance task-status能查41条真实任务(39closed/2paused)及partial关联 | 本轮只读查询成功；TASK60511只是挂起调查并保留99/99窄门禁及3挂起边界 | 未据该功能证据确认额外业务欠交 | 未查询全部任务的完整事件序列；缺关联不能补造TaskID | docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md；TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md；docs/product/assessments/JOINT-20261013.md；AGENTS.md；.agents/skills/maintain-project/SKILL.md；.workflow-system/WORKFLOW_PROTOCOL.md；.workflow-system/runtime/support/product-maintenance/references/reconcile.md；.workflow-system/runtime/support/product-maintenance/references/binding-contribution.md |

#### 版本适用性

- 历史报告按原提交/设备/范围承接；本轮仅阅读及静态比对，无新增测试/构建/运行验证
- ANDROID/JOINT-20261013运行对象为4d586e0f2dab1fef9d2c273b770796b63a7d873d及报告工作区、APK F148028B15FA3A8DFFE63CA483BCDA5A1CE9764BBDE817E68A357598D25DFD6A；不冒称本轮新跑。静态4d586e..a78fe55产品差异仅4个Codex Kotlin文件与clientRegistrationManager；未触及的终端/工作区具体反例仍适用，Codex逐行为检查868范围。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md](../../changes/records/CR-20260325-0000-docs-requirement-sync-plan-coverage.md)
- [TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md](../../../TASKS/TASK-20260511-001-isolate-node-test-full-suite-hang-and-classify-gate.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [AGENTS.md](../../../AGENTS.md)
- [.agents/skills/maintain-project/SKILL.md](../../../.agents/skills/maintain-project/SKILL.md)
- [.workflow-system/WORKFLOW_PROTOCOL.md](../../../.workflow-system/WORKFLOW_PROTOCOL.md)
- [.workflow-system/runtime/support/product-maintenance/references/reconcile.md](../../../.workflow-system/runtime/support/product-maintenance/references/reconcile.md)
- [.workflow-system/runtime/support/product-maintenance/references/binding-contribution.md](../../../.workflow-system/runtime/support/product-maintenance/references/binding-contribution.md)

### 剩余与待核对

- 排序：先补当前导航和真实任务材料可追溯核对，再考虑具体文档修补；不重启旧强制审批状态机

依赖与排序依据：



尚未核对/不可得材料：

- 全仓active CR真实性与旧入口转址逐个核验
- docs/README到PROJECT缺口是否已有后续治理采纳

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-02] 服务端管理员权限模式与安全治理

<a id="AS-CURRENT-20261014-02"></a>

### 覆盖范围

需求：[REQ-20260222-server-admin-privilege-mode](../MANAGED_REQUIREMENTS.md#REQ-20260222-server-admin-privilege-mode)。本轮完整重评 REQ-20260222-server-admin-privilege-mode 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。CR a6ceeec/76e76f8有配置、门禁、IP与审计/提示实现；当前代码及JOINT实际拒绝场景构成明确启动证据，无原task也不能标未开始。

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 已移至独立要求 [REQ-TERMLINK-PERMISSION-MODE](#REQ-TERMLINK-PERMISSION-MODE)；原功能1的完整定义以该项为准。 具体义务：**权限模式配置**：显式配置standard/elevated及启用开关，默认standard；模式声明不能自行提升操作系统权限。 | privilegeConfig默认standard、显式elevated+enabled，非法mode回standard | 原配置CR及10/13 focused-settled默认standard/显式ENABLE定点实际通过；不是管理员宿主认证 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md；docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md；docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md；docs/product/assessments/JOINT-20261013.md；src/config/privilegeConfig.js；src/config/securityGates.js；src/utils/ipCheck.js |
| 已移至独立要求 [REQ-TERMLINK-STARTUP-SAFETY](#REQ-TERMLINK-STARTUP-SAFETY)；原功能2的完整定义以该项为准。 具体义务：**启动安全门禁**：受控模式校验认证、非默认凭据、服务进程权限及可写审计路径；配置要求mTLS时校验其可用性，条件不足明确失败。 | securityGates校验认证强度、实际进程权限、审计可写、所需mTLS配置 | JOINT#37非管理员elevated真实PROCESS_PRIVILEGE_REQUIRED，缺/错证书拒绝；3月TLS23/23 | 未据该功能证据确认额外业务欠交 | 管理员正向+强认证+审计+mTLS整链报告未定位 | docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md；docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md；docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md；docs/product/assessments/JOINT-20261013.md；src/config/privilegeConfig.js；src/config/securityGates.js；src/utils/ipCheck.js |
| 已移至独立要求 [REQ-TERMLINK-PERMISSION-MODE](#REQ-TERMLINK-PERMISSION-MODE)；原功能3的完整定义以该项为准。 具体义务：**进程权限透传**：PTY继承服务进程实际身份，应用登录账号与操作系统权限分开说明。 | PtyService pty.spawn只传shell/args/cols/rows/cwd/env，无UAC/sudo/runas；认证账号不替代OS身份 | 当前spawn静态边界与原REQ一致，JOINT实际非管理员elevated拒绝；不要求不存在的App提权验证 | 未据该功能证据确认额外业务欠交 | 实际安装宿主账户未在本轮认证；不影响既定继承语义 | docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md；docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md；docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md；docs/product/assessments/JOINT-20261013.md；src/config/privilegeConfig.js；src/config/securityGates.js；src/utils/ipCheck.js |
| 已移至独立要求 [REQ-TERMLINK-SOURCE-IP](#REQ-TERMLINK-SOURCE-IP)；原功能4的完整定义以该项为准。 具体义务：**来源IP限制**：可配置单IP/CIDR白名单，以实际对端地址判定，不以客户端伪造的转发头获得授权。 | ipCheck实现IP/CIDR与mapped地址规范化；gateway边界沿已有对端来源 | 2月CR记录IPv4/CIDR测试口径；新增IPv6代码存在 | 未据该功能证据确认额外业务欠交 | 本批未完整读gateway来源取值全部调用路径与新IPv6运行证据 | docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md；docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md；docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md；docs/product/assessments/JOINT-20261013.md；src/config/privilegeConfig.js；src/config/securityGates.js；src/utils/ipCheck.js |
| 原功能5 / REQ-TERMLINK-AUDIT-TRACE：连接、拒绝、会话操作及结束记录通过会话身份、来源与auditTraceId关联。 | auditService只有connection_start/end/ip_whitelist_denied；gateway成功建连分配trace，结束沿同trace；拒绝只记clientIp且发生在trace分配前，sessions CRUD未接正式audit | 当前auditService全文、gateway连接/拒绝/关闭调用与sessions/manager相关审计搜索可定位静态反证；不是新运行失败 | 补齐既定拒绝/会话操作的可用身份、来源与trace关联；诊断日志不能替代正式审计 | 拒绝前未有session不能伪造sessionId；真实elevated全链仍未知，不扩新审批体系 | src/services/auditService.js；src/ws/terminalGateway.js；src/routes/sessions.js；src/services/sessionManager.js；docs/product/MANAGED_REQUIREMENTS.md |
| 已移至独立要求 [REQ-TERMLINK-CLIENT-RISK](#REQ-TERMLINK-CLIENT-RISK)；原功能6的完整定义以该项为准。 具体义务：**客户端风险可见**：会话/连接信息携带实际权限级别，客户端显示对应风险提示；不新增App提权或操作系统降权回滚功能。 | health/WS权限信息与客户端风险提示已交付 | 2月CR描述字段和界面；JOINT本轮只验证门禁子范围 | 未据该功能证据确认额外业务欠交 | 不同权限下客户端显示全组合独立结果未定位 | docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md；docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md；docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md；docs/product/assessments/JOINT-20261013.md；src/config/privilegeConfig.js；src/config/securityGates.js；src/utils/ipCheck.js |

#### 版本适用性

- 历史报告按原提交/设备/范围承接；本轮仅阅读及静态比对，无新增测试/构建/运行验证
- ANDROID/JOINT-20261013运行对象为4d586e0f2dab1fef9d2c273b770796b63a7d873d及报告工作区、APK F148028B15FA3A8DFFE63CA483BCDA5A1CE9764BBDE817E68A357598D25DFD6A；不冒称本轮新跑。静态4d586e..a78fe55产品差异仅4个Codex Kotlin文件与clientRegistrationManager；未触及的终端/工作区具体反例仍适用，Codex逐行为检查868范围。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md](../../changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md)
- [docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md](../../changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md)
- [docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md](../../changes/records/CR-20260327-1800-server-tls-mtls-listener.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [src/config/privilegeConfig.js](../../../src/config/privilegeConfig.js)
- [src/config/securityGates.js](../../../src/config/securityGates.js)
- [src/utils/ipCheck.js](../../../src/utils/ipCheck.js)
- [src/services/auditService.js](../../../src/services/auditService.js)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [src/routes/sessions.js](../../../src/routes/sessions.js)
- [src/services/sessionManager.js](../../../src/services/sessionManager.js)
- [src/services/ptyService.js](../../../src/services/ptyService.js)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap](../history/maintenance-20261011/joint-validation-20261013/focused-settled.tap)

### 剩余与待核对

- 排序P1：按既定审计义务明确拒绝/会话操作字段与接线；P2：核管理员正向和风险提示适用证据；不新增UAC/降权能力

依赖与排序依据：

- 现有TLS配置/认证及操作系统启动身份；无App提权功能依赖

尚未核对/不可得材料：

- gateway所有IP入口
- 正向管理员/审计/客户端提示全链

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-03] 服务端会话长时保留与断联续接

<a id="AS-CURRENT-20261014-03"></a>

### 覆盖范围

需求：[REQ-20260222-session-retention-reconnect](../MANAGED_REQUIREMENTS.md#REQ-20260222-session-retention-reconnect)。本轮完整重评 REQ-20260222-session-retention-reconnect 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。CR f4ce64f明确6/6且当前SessionManager有detach保留/cleanup/LRU；JOINT真实同PID续接和5/5 TTL容量证据成立。

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 已移至独立要求 [REQ-TERMLINK-SESSION-CONTINUITY](#REQ-TERMLINK-SESSION-CONTINUITY)；原功能1的完整定义以该项为准。 具体义务：**断联保留**：客户端断开后保留有效会话和PTY，不因一次连接关闭立即销毁上下文。 | removeConnection只转IDLE/更新时间不销毁PTY | JOINT#03真实PowerShell断联后会话继续保留 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；docs/changes/records/CR-20260224-0000-session-ttl-24h.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/product/assessments/JOINT-20261013.md；src/services/sessionManager.js |
| 已移至独立要求 [REQ-TERMLINK-SESSION-CONTINUITY](#REQ-TERMLINK-SESSION-CONTINUITY)；原功能2的完整定义以该项为准。 具体义务：**同会话续接**：携带有效sessionId重新连接原会话，继续原上下文，而非静默创建另一会话。 | 有效sessionId查原会话并复用PTY | JOINT#03重新连接同ID/同PID且变量上下文保留 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；docs/changes/records/CR-20260224-0000-session-ttl-24h.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/product/assessments/JOINT-20261013.md；src/services/sessionManager.js |
| 已移至独立要求 [REQ-TERMLINK-SESSION-CONTINUITY](#REQ-TERMLINK-SESSION-CONTINUITY)；原功能3的完整定义以该项为准。 具体义务：**无效ID反馈**：不存在或过期的显式sessionId返回可识别错误；只有未提供ID时沿用原默认创建行为。 | 显式无效/空ID拒绝4404；未提供ID保留创建 | CR-0023原6/6覆盖valid/invalid/absent/capacity；当前接口语义未发现后续反例 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；docs/changes/records/CR-20260224-0000-session-ttl-24h.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/product/assessments/JOINT-20261013.md；src/services/sessionManager.js |
| 已移至独立要求 [REQ-TERMLINK-SESSION-TTL](#REQ-TERMLINK-SESSION-TTL)；原功能4的完整定义以该项为准。 具体义务：**可配置闲置保留**：以SESSION_IDLE_TTL_MS控制保留窗口，按清理间隔检查无连接闲置会话；24h示例配置与6h代码回退的口径差异沿用原对账。 | SESSION_IDLE_TTL_MS+interval治理IDLE，.env示例24h；代码fallback6h保持原边界 | JOINT#03受控时间实际PTY清理测试通过；24h CR只改示例/文档 | 无须把6h回退改成24h | 无6/24h墙钟长跑；原范围未要求以此替代受控时间证明 | docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；docs/changes/records/CR-20260224-0000-session-ttl-24h.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/product/assessments/JOINT-20261013.md；src/services/sessionManager.js |
| 已移至独立要求 [REQ-TERMLINK-SESSION-CAPACITY](#REQ-TERMLINK-SESSION-CAPACITY)；原功能5的完整定义以该项为准。 具体义务：**容量与闲置回收**：最大会话数受配置控制，达到容量时优先回收最久闲置会话；无可回收会话则明确拒绝新建。 | 容量满先清最旧IDLE，无可回收则409 | JOINT#03实际SessionManager/PTY 5/5，活跃会话不回收 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；docs/changes/records/CR-20260224-0000-session-ttl-24h.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/product/assessments/JOINT-20261013.md；src/services/sessionManager.js |
| **连接与活跃信息**：会话列表保留状态、lastActiveAt和activeConnections，支持多个连接共享原会话。 | 连接数与lastActiveAt维护；连接安全聚合不被末连接覆盖 | SessionManager add/remove及3月97/97聚合字段证据 | 未据该功能证据确认额外业务欠交 | 未新增多设备压力认证，不影响既有定性契约 | docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；docs/changes/records/CR-20260224-0000-session-ttl-24h.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/product/assessments/JOINT-20261013.md；src/services/sessionManager.js |
| 复用 [REQ-TERMLINK-SESSION-MANAGEMENT](#REQ-TERMLINK-SESSION-MANAGEMENT) 的会话显式删除定义；保留释放PTY和记录、无跨重启PTY保证的共同边界。 | 显式delete清PTY与会话记录，与断联路径分离 | JOINT会话操作与SessionManager治理记录可承接；原实现CR记录delete语义 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；docs/changes/records/CR-20260224-0000-session-ttl-24h.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/product/assessments/JOINT-20261013.md；src/services/sessionManager.js |

#### 版本适用性

- 历史报告按原提交/设备/范围承接；本轮仅阅读及静态比对，无新增测试/构建/运行验证
- ANDROID/JOINT-20261013运行对象为4d586e0f2dab1fef9d2c273b770796b63a7d873d及报告工作区、APK F148028B15FA3A8DFFE63CA483BCDA5A1CE9764BBDE817E68A357598D25DFD6A；不冒称本轮新跑。静态4d586e..a78fe55产品差异仅4个Codex Kotlin文件与clientRegistrationManager；未触及的终端/工作区具体反例仍适用，Codex逐行为检查868范围。
- TASK-20260868历史对象为4d586e+修复工作区，S3 APK d64a7cd8125daf121782f592e0ff56c3ef3237b7cd0a5acc48eecaa0e44b2e13。S3 source-manifest 13文件SHA与a78fe55完全相同（外部repair-manifest-comparison.json），src/server.js另核ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6亦相同。只承接连接/IPC失效提示清理及registration拒绝的原断言，不扩展原整REQ。
- 10/13 focused-settled有旧gateway fixture帧数/teardown错误，不能把这份混合输出当该REQ整套PASS；868 S2修实际fixture并保存46/46与实际网络23检查，只承接其具体覆盖。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md](../../changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md)
- [docs/changes/records/CR-20260224-0000-session-ttl-24h.md](../../changes/records/CR-20260224-0000-session-ttl-24h.md)
- [docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md](../../changes/records/CR-20260327-1525-server-unified-mtls-integration.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [src/services/sessionManager.js](../../../src/services/sessionManager.js)
- [docs/product/history/maintenance-20261011/task20260868-s2/report.md](../history/maintenance-20261011/task20260868-s2/report.md)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)

### 剩余与待核对

- 无已知当前业务欠交；后续仅在修改续接/TTL/容量时按原边界维护

依赖与排序依据：

- 服务进程持续运行；不包含PTY跨进程重启

尚未核对/不可得材料：

- 额外长时间墙钟观察非本次阻塞项

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-04] 快捷键盘控制键修复、换行按钮与触摸滚动优化

<a id="AS-CURRENT-20261014-04"></a>

### 覆盖范围

需求：[REQ-20260223-shortcut-keyboard-modifier-newline](../MANAGED_REQUIREMENTS.md#REQ-20260223-shortcut-keyboard-modifier-newline)。本轮完整重评 REQ-20260223-shortcut-keyboard-modifier-newline 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。CR e975244/56739f1实际输入引擎、CR/LF和触摸处理，10/13真实帧及设备操作已开始并部分通过。

结论：**partially-satisfied**。实现标记 delivered-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 已移至独立要求 [REQ-TERMLINK-CONTROL-INPUT](#REQ-TERMLINK-CONTROL-INPUT)；原功能1的完整定义以该项为准。 具体义务：**Ctrl组合输入**：Ctrl与字母组合发送终端控制字符，包含Ctrl+C等既有高频操作。 | 共享引擎Ctrl字母转控制字符；UI触发链仍有问题 | ANDROID#04/#44首个单次Ctrl+c实际hex63而非03；locked两次03通过 | 修复首次单次Ctrl状态/焦点到真实输入链 | 无新增未知；仍限所述报告对象与样本 | docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json；public/terminal_shortcut_input.js |
| 已移至独立要求 [REQ-TERMLINK-CONTROL-INPUT](#REQ-TERMLINK-CONTROL-INPUT)；原功能2的完整定义以该项为准。 具体义务：**Alt组合输入**：Alt组合发送Meta/ESC前缀语义，而非普通字母标签。 | Alt前置ESC且可消费/锁定 | 10/13 Alt+b/f/b帧1b62/1b66/1b62正确 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md；docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json；docs/product/history/maintenance-20261011/android-validation-20261013/terminal-touch-controls.json；public/terminal_shortcut_input.js |
| 已移至独立要求 [REQ-TERMLINK-CONTROL-INPUT](#REQ-TERMLINK-CONTROL-INPUT)；原功能3的完整定义以该项为准。 具体义务：**修饰键状态**：支持一次性生效、持续锁定及解除，并以按钮状态显示区别。 | off/armed/locked与320ms双击逻辑存在 | 锁定与解除部分通过，单次Ctrl首次反例保留 | 同首次单次Ctrl缺口 | 其他字符/输入法全矩阵未定位，不能要求任意OEM认证 | docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md；docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json；docs/product/history/maintenance-20261011/android-validation-20261013/terminal-touch-controls.json；public/terminal_shortcut_input.js |
| 已移至独立要求 [REQ-TERMLINK-CONTROL-INPUT](#REQ-TERMLINK-CONTROL-INPUT)；原功能4的完整定义以该项为准。 具体义务：**回车与换行**：Enter发送CR，独立换行按钮发送LF，保持两类输入语义。 | 独立Enter CR与换行LF | 10/13帧分别0d/0a通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md；docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json；docs/product/history/maintenance-20261011/android-validation-20261013/terminal-touch-controls.json；public/terminal_shortcut_input.js |
| 已移至独立要求 [REQ-TERMLINK-TOUCH-SCROLL](#REQ-TERMLINK-TOUCH-SCROLL)；原功能5的完整定义以该项为准。 具体义务：**终端触摸滚动**：文字区和空白区的纵向拖动使用一致策略，保留本地滚动与Android手势兼容。 | 触摸文字/空白区按local viewport滚动与capture处理 | 10/13触摸滚动实际通过；3月CR SHOULD PASS只是当时待设备语气 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md；docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json；docs/product/history/maintenance-20261011/android-validation-20261013/terminal-touch-controls.json；public/terminal_shortcut_input.js |
| **键盘展开与焦点**：快捷键盘展开/收起及输入焦点继续可用，普通字符输入不改变。 | 快捷键盘展开/收起及焦点回归路径存在 | 10/13收起后输入和再次展开观察；首Ctrl触发仍有反例 | 沿首次状态/焦点失败定位，不重造键盘 | 完整普通字符组合未全覆盖 | docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md；docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json；docs/product/history/maintenance-20261011/android-validation-20261013/terminal-touch-controls.json；public/terminal_shortcut_input.js |

#### 版本适用性

- 历史报告按原提交/设备/范围承接；本轮仅阅读及静态比对，无新增测试/构建/运行验证
- ANDROID/JOINT-20261013运行对象为4d586e0f2dab1fef9d2c273b770796b63a7d873d及报告工作区、APK F148028B15FA3A8DFFE63CA483BCDA5A1CE9764BBDE817E68A357598D25DFD6A；不冒称本轮新跑。静态4d586e..a78fe55产品差异仅4个Codex Kotlin文件与clientRegistrationManager；未触及的终端/工作区具体反例仍适用，Codex逐行为检查868范围。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md](../../changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md)
- [docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md](../../changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json](../history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json)
- [docs/product/history/maintenance-20261011/android-validation-20261013/terminal-touch-controls.json](../history/maintenance-20261011/android-validation-20261013/terminal-touch-controls.json)
- [public/terminal_shortcut_input.js](../../../public/terminal_shortcut_input.js)

### 剩余与待核对

- 排序P1：先首单次Ctrl正确发03，再确认既有Alt/CR/LF/触摸不回退

依赖与排序依据：

- 终端输入/焦点链；与PTY设备应答污染分开定位

尚未核对/不可得材料：



本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-05] Android External Web 终端（Profile/Sessions 同级）POC

<a id="AS-CURRENT-20261014-05"></a>

### 覆盖范围

需求：[REQ-20260224-android-external-web-terminal-profile-sessions](../MANAGED_REQUIREMENTS.md#REQ-20260224-android-external-web-terminal-profile-sessions)。本轮完整重评 REQ-20260224-android-external-web-terminal-profile-sessions 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。POC CR ab47cb8实现九类行为，d675956后续刷新，10/13真实External页面、CRUD/持久化与凭据更改已有运行证据。

结论：**undetermined**。实现标记 delivered-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| **Profile终端类型**：新建/编辑Profile可选择TERMLINK_WS或EXTERNAL_WEB，旧Profile沿用TermLink类型。 | Profile TerminalType双类型与旧值fallback；列表及MainShell按type分流 | POC编译/build通过；10/13能创建并使用External Profile | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md；docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md；docs/product/assessments/ANDROID-20261013.md；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt；docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json |
| 已移至独立要求 [REQ-TERMLINK-EXTERNAL-SESSIONS](#REQ-TERMLINK-EXTERNAL-SESSIONS)；原功能2的完整定义以该项为准。 具体义务：**External本地会话**：本地创建、列出、重命名、删除和更新最近访问的External会话，应用重启后保留。 | ExternalSessionStore按profile持久UUID/name/lastActive，CRUD/touch | ANDROID#46真实create/open/rename/delete、force-stop重启保留通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md；docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md；docs/product/assessments/ANDROID-20261013.md；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt；docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json |
| **列表数据源分流**：TermLink会话使用远端sessions API，External会话使用ExternalSessionStore。 | 远端TermLink API vs本地ExternalStore独立来源 | 10/13列表分组与External操作通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md；docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md；docs/product/assessments/ANDROID-20261013.md；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt；docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json |
| **打开页面分流**：TermLink加载终端客户端并注入配置，External直接加载当前Profile的baseUrl。 | TermLink终端配置注入，External直接baseUrl+headers | 10/13受Basic保护health页实际打开 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md；docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md；docs/product/assessments/ANDROID-20261013.md；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt；docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json |
| 已移至独立要求 [REQ-TERMLINK-EXTERNAL-REFRESH](#REQ-TERMLINK-EXTERNAL-REFRESH)；原功能5的完整定义以该项为准。 具体义务：**地址与凭据更新**：修改External地址或Basic凭据后，重新打开同会话按更新后的加载签名刷新页面，无需重启App。 | signature含target/auth/username/password指纹；保存后reload resolver | ANDROID#47错误Basic导致错误，改正重开恢复通过 | 未据该功能证据确认额外业务欠交 | URL修改组合未独立闭环 | docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md；docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md；docs/product/assessments/ANDROID-20261013.md；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt；docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json |
| **空地址提示**：External地址为空时显示可读错误并停留空白页，不误加载TermLink终端。 | 空target可读错误并about:blank，不加载TermLink | MainShell1840+静态明确分支；原CR声明实现 | 未据该功能证据确认额外业务欠交 | 原及新设备报告未定位空URL场景 | docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md；docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md；docs/product/assessments/ANDROID-20261013.md；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt；docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json |
| **Profile删除清理**：删除Profile同时清理所属External本地会话。 | ExternalStore有removeByProfile接口，原CR/Profile删除联动声明 | 原编译通过 | 未据该功能证据确认额外业务欠交 | profile删除到缓存/当前页整链设备证据未定位 | docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md；docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md；docs/product/assessments/ANDROID-20261013.md；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt；docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json |
| **External界面状态**：隐藏不适用的快捷键盘入口，并显示External打开态。 | External状态及隐藏快捷栏沿POC | 10/13External页面实际可用 | 未据该功能证据确认额外业务欠交 | 隐藏入口和状态断言未单独保存 | docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md；docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md；docs/product/assessments/ANDROID-20261013.md；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt；docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json |
| **通用深色提示**：按通用color-scheme/DOM提示适配深色，不写入站点专有存储键。 | WebSettings dark hints+DOM colorScheme/meta，仅通用提示 | MainShell静态核对无站点专有存储写入 | 未据该功能证据确认额外业务欠交 | 实际dark适配设备观察未定位；不扩大任意站点矩阵 | docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md；docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md；docs/product/assessments/ANDROID-20261013.md；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt；docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json |
| 已移至独立要求 [REQ-TERMLINK-EXTERNAL-REFRESH](#REQ-TERMLINK-EXTERNAL-REFRESH)；原功能10的完整定义以该项为准。 具体义务：**保存与删除刷新**：Profile变更和删除后刷新本地列表及重载目标，沿用后续刷新修复的既有行为。 | 保存/删除触发列表刷新、reset bridge限TermLink | d675956 JVM+Settings设备4/4，10/13凭据重开覆盖部分 | 未据该功能证据确认额外业务欠交 | 完整MainShell URL/删除重载组合未闭环 | docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md；docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md；docs/product/assessments/ANDROID-20261013.md；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt；docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json |

#### 版本适用性

- 历史报告按原提交/设备/范围承接；本轮仅阅读及静态比对，无新增测试/构建/运行验证
- ANDROID/JOINT-20261013运行对象为4d586e0f2dab1fef9d2c273b770796b63a7d873d及报告工作区、APK F148028B15FA3A8DFFE63CA483BCDA5A1CE9764BBDE817E68A357598D25DFD6A；不冒称本轮新跑。静态4d586e..a78fe55产品差异仅4个Codex Kotlin文件与clientRegistrationManager；未触及的终端/工作区具体反例仍适用，Codex逐行为检查868范围。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md](../../changes/records/CR-20260224-1636-android-external-web-terminal-poc.md)
- [docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md](../../changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt](../../../android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt)
- [android/app/src/main/java/com/termlink/app/MainShellActivity.kt](../../../android/app/src/main/java/com/termlink/app/MainShellActivity.kt)
- [android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt](../../../android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt)
- [docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json](../history/maintenance-20261011/android-validation-20261013/external-crud.json)

### 剩余与待核对

- 排序P2：只补原POC的空地址、profile删除清理/刷新及URL修改证据，已有CRUD和Basic路径不重判未开始

依赖与排序依据：



尚未核对/不可得材料：

- 空地址/删除Profile/URL更改/dark原样本的独立报告

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-06] Android 前台息屏偏好与后台系统息屏

<a id="AS-CURRENT-20261014-06"></a>

### 覆盖范围

需求：[REQ-20260224-screen-keep-awake](../MANAGED_REQUIREMENTS.md#REQ-20260224-screen-keep-awake)。本轮完整重评 REQ-20260224-screen-keep-awake 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。TASK20260726-001完成档位与四Activity控制器，JVM/build已通过；当前静态接入仍在，任务明确把实机定时等待作为非阻塞观察。

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| **前台息屏偏好**：设置提供跟随系统和30秒至10分钟档位，本地保存所选值。 | UiPreferences本地保存0=system、1..20每档30秒，设置页采用 | 原任务JVM+debug assemble通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260726-001-android-foreground-screen-timeout.md；android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt；android/app/src/main/java/com/termlink/app/util/UiPreferences.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt；android/app/src/main/java/com/termlink/app/SettingsActivity.kt；android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt |
| **四页面统一接入**：MainShell、Codex、Settings、Workspace使用同一本地前台息屏控制器。 | 四Activity共享ScreenTimeoutController onVisible/onHidden/onUserInteraction/dispose | 原任务覆盖四Activity；静态grep接入确认 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260726-001-android-foreground-screen-timeout.md；android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt；android/app/src/main/java/com/termlink/app/util/UiPreferences.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt；android/app/src/main/java/com/termlink/app/SettingsActivity.kt；android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt |
| **用户交互重计时**：可见Activity内用户交互重新计算自定义档位计时。 | visible交互refresh删除旧回调后重排 | 当前控制器实码；原JVM门禁通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260726-001-android-foreground-screen-timeout.md；android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt；android/app/src/main/java/com/termlink/app/util/UiPreferences.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt；android/app/src/main/java/com/termlink/app/SettingsActivity.kt；android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt |
| **计时结束交还系统**：自定义等待结束后清除窗口常亮标志；跟随系统直接采用系统行为。 | custom延长窗口keep flag，计时后清除；system不干预 | 控制器+UiPreferences有效timeout逻辑与原任务通过 | 无已知欠交；不要求改变全局OS睡眠策略 | 未做实机定时等待；task已列交付后非阻塞观察 | TASKS/TASK-20260726-001-android-foreground-screen-timeout.md；android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt；android/app/src/main/java/com/termlink/app/util/UiPreferences.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt；android/app/src/main/java/com/termlink/app/SettingsActivity.kt；android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt |
| **后台与销毁清理**：页面隐藏或销毁立即清除常亮及回调，不修改全局系统息屏设置。 | onHidden/dispose撤销callbacks与FLAG_KEEP_SCREEN_ON | 当前源码明确且原task验证通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260726-001-android-foreground-screen-timeout.md；android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt；android/app/src/main/java/com/termlink/app/util/UiPreferences.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt；android/app/src/main/java/com/termlink/app/SettingsActivity.kt；android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt |

#### 版本适用性

- 052c8f38e66bd2aa3a7094a001d00f51309d31b5是Task start base，不是测试后交付SHA；实际功能引入提交9697f221fb2d0fd464873da85e2a9088fa04a9b4。
- 静态Git桥9697f221→a78fe55：ScreenTimeoutController.kt逐字未变；UiPreferences.kt仅新增WiFi原图预取开关/访问方法，screenTimeout档位、计算、存储函数未改；四Activity调用仍位于原onVisible/onHidden/onUserInteraction/dispose生命周期，diff中无controller调用语义删改。
- 原JVM/构建结果与这些保持的息屏核心函数适用；Task记录的定时实机等待依旧是非阻塞观察，不升级为验收欠交。当前新增媒体偏好不由息屏测试认证。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260726-001-android-foreground-screen-timeout.md](../../../TASKS/TASK-20260726-001-android-foreground-screen-timeout.md)
- [android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt](../../../android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt)
- [android/app/src/main/java/com/termlink/app/util/UiPreferences.kt](../../../android/app/src/main/java/com/termlink/app/util/UiPreferences.kt)
- [android/app/src/main/java/com/termlink/app/MainShellActivity.kt](../../../android/app/src/main/java/com/termlink/app/MainShellActivity.kt)
- [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt)
- [android/app/src/main/java/com/termlink/app/SettingsActivity.kt](../../../android/app/src/main/java/com/termlink/app/SettingsActivity.kt)
- [android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt](../../../android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt)

静态版本桥细节：

- from_commit：9697f221fb2d0fd464873da85e2a9088fa04a9b4；to_commit：a78fe55e033bbcb6db816acd2c801de5aa28a081；method：read-only git show/git diff; no runtime validation；files：path：android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt；from_sha256：53bc57fcf49d0400dbe0210918ef20d20cb7fcb00219bbb4f23c27d6746f76af；to_sha256：53bc57fcf49d0400dbe0210918ef20d20cb7fcb00219bbb4f23c27d6746f76af；byte_identical：True；path：android/app/src/main/java/com/termlink/app/util/UiPreferences.kt；from_sha256：770d1889f900b6f6a835c5973d1f4796953e27dfa642d392fa316880d605c543；to_sha256：e9c026baec158ca476cae6419ce018dc8d812c72aa5c84028e10d779dd3a8d70；byte_identical：False

### 剩余与待核对

- 无已知业务欠交；可按原任务保留定时等待观察，不改需求为全局强制息屏

依赖与排序依据：



尚未核对/不可得材料：

- 可选真实设备定时等待观察

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-07] Codex 能力矩阵驱动主线需求（对话体验优先、后台保活与下一阶段）

<a id="AS-CURRENT-20261014-07"></a>

### 覆盖范围

需求：[REQ-20260309-codex-capability-mvp](../MANAGED_REQUIREMENTS.md#REQ-20260309-codex-capability-mvp)。本轮完整重评 REQ-20260309-codex-capability-mvp 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。3月SUMMARY及May cwd/Skills、July visual/composer/files均真实实施；10/13聊天、线程、配置、审批、附件实际运行，局部明确失败不代表未开始。

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| **对话主界面**：消息流、输入区、状态/PATH和阻塞请求构成主路径；线程、运行态及辅助信息按既有二级入口打开。 | 原生/Web消息流、composer、PATH状态和二级面板已存在 | ANDROID#13真实对话启动/输入/history；July视觉任务158/158、73/73、45/45及360/412设备通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md；TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md；TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/assessments/JOINT-20261013.md；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| 已移至独立要求 [REQ-TERMLINK-CODEX-THREADS](#REQ-TERMLINK-CODEX-THREADS)；原功能2的完整定义以该项为准。 具体义务：**线程创建与恢复**：创建新线程、查看当前工作区历史、读取/恢复已有线程，并保持会话与conversation绑定。 | 已有新建、workspace历史、恢复绑定 | TASK60504/60510双cwd/恢复样本通过；ANDROID#48切换与冷启动保持选择 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md；TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md；TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/assessments/JOINT-20261013.md；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| 已移至独立要求 [REQ-TERMLINK-CODEX-THREADS](#REQ-TERMLINK-CODEX-THREADS)；原功能3的完整定义以该项为准。 具体义务：**工作区历史筛选**：历史任务列表按当前会话cwd筛选，切换项目不沿用其他cwd结果。 | history/skills以session cwd查询及隔离状态 | TASK60504 Node定向与May10-11 Android步骤12-15通过 | 未据该功能证据确认额外业务欠交 | 10/13非所有cwd重新演练；旧样本可承接但不扩新组合 | docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md；TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md；TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/assessments/JOINT-20261013.md；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| 已移至独立要求 [REQ-TERMLINK-CODEX-MODEL](#REQ-TERMLINK-CODEX-MODEL)；原功能4的完整定义以该项为准。 具体义务：**模型与推理选择**：slash/快捷入口及后续原生选择器使用真实catalog/owner信息；发送前选择写入下一回合配置。 | 真实model catalog/reasoning/owner选择进入next-turn | TASK60718-002及Web60716实际catalog任务通过；ANDROID配置观察 | 未据该功能证据确认额外业务欠交 | 外部Owner直接catalog自动改选不在868真机范围 | docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md；TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md；TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/assessments/JOINT-20261013.md；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **配置分层**：区分会话存储配置、下一回合override、当前生效配置和interaction state；不恢复未采用的完整Session Defaults UI。 | stored/next-turn/effective/interaction分层保留；未采纳完整Session Defaults UI | 原SUMMARY与July真实权限/模型任务覆盖局部 | 未据该功能证据确认额外业务欠交 | 全配置叠加组合未定位独立结果 | docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md；TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md；TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/assessments/JOINT-20261013.md；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| 已移至独立要求 [REQ-TERMLINK-CODEX-PLAN](#REQ-TERMLINK-CODEX-PLAN)；原功能6的完整定义以该项为准。 具体义务：**计划模式**：进入、取消计划模式，计划文本发送、补充说明和执行确认沿用原真实交互；确认后普通输入回到正常模式。 | Plan真实进入/文本/选项回传路径存在 | ANDROID#50早期A/B选择触达host并生成计划，后续选项未显示/仅支持选项提示 | 修复手机后续Plan options呈现/回答后执行确认收口 | 确认执行后回normal未闭合 | docs/product/assessments/ANDROID-20261013.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md |
| 已移至独立要求 [REQ-TERMLINK-CODEX-SLASH](#REQ-TERMLINK-CODEX-SLASH)；原功能7的完整定义以该项为准。 具体义务：**Slash解析与分发**：命令通过现有registry、capability和dispatcher处理；未知或未开放命令显示明确反馈，不作为普通文本污染线程。 | Slash registry/capability/dispatcher及composer按钮已交付 | 原SUMMARY；CR0249真机/写入composer通过 | 未据该功能证据确认额外业务欠交 | 所有未知/未开放slash错误反馈当前样本未逐项读 | docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md；TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md；TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/assessments/JOINT-20261013.md；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| 已移至独立要求 [REQ-TERMLINK-CODEX-SKILLS](#REQ-TERMLINK-CODEX-SKILLS)；原功能8的完整定义以该项为准。 具体义务：**Skills输入**：按cwd发现skills，支持多skill内联选择/移除与发送；具体可执行入口依现有能力，不把旧预留声明当作全部已开放。 | cwd发现+inline多token实现，May多Skills任务已交付 | ANDROID#52两skills可发现，但第二次选择替换首个；手写双token仅证明host可处理 | 修复UI多选累积和按原范围发送/移除，不能把手工绕过当UI通过 | 无新增未知；仍限所述报告对象与样本 | docs/product/assessments/ANDROID-20261013.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md |
| 已移至独立要求 [REQ-TERMLINK-CODEX-FILES](#REQ-TERMLINK-CODEX-FILES)；原功能9的完整定义以该项为准。 具体义务：**工作区文件提及**：按当前cwd提示和筛选文件，选择后显示可移除的文件上下文，并随发送消费。 | 当前cwd @文件建议、选择与context发送存在 | JOINT#53真实限定cwd proof文件，phone fileMentionCount1、host读取回答/Web可见 | 未据该功能证据确认额外业务欠交 | 迟到generation跨cwd完整组合未核 | docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md；TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md；TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/assessments/JOINT-20261013.md；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| 已移至独立要求 [REQ-TERMLINK-CODEX-ATTACHMENTS](#REQ-TERMLINK-CODEX-ATTACHMENTS)；原功能10的完整定义以该项为准。 具体义务：**图片与文件附件**：选择本地图片/文件，发送后保留可见附件上下文；历史图片、文件提及及Markdown文件链接沿后续任务支持打开。 | 图片/文件picker分流、发送后可见与历史打开已有实现 | ANDROID#54有效PNG识别通过；普通文档只有content://，host不可访问 | 修复文件引用在host侧可读及历史打开断点 | 历史所有图片/Markdown文件链接重开组合未核 | docs/product/assessments/ANDROID-20261013.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md |
| 已移至独立要求 [REQ-TERMLINK-CODEX-APPROVAL](#REQ-TERMLINK-CODEX-APPROVAL)；原功能11的完整定义以该项为准。 具体义务：**审批与用户输入**：命令/补丁等阻塞审批和用户输入前置展示，允许/拒绝/回答回传真实请求。 | 真实阻塞命令allow/deny/resume及用户输入面板 | ANDROID#55命令审批通过；用户输入/Plan选项缺失阻塞 | 补齐选项呈现与真实request回答；外部Owner审批点击另未验 | 无新增未知；仍限所述报告对象与样本 | docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md；TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md；TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/assessments/JOINT-20261013.md；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| 已移至独立要求 [REQ-TERMLINK-CODEX-PERMISSION](#REQ-TERMLINK-CODEX-PERMISSION)；原功能12的完整定义以该项为准。 具体义务：**真实权限选择器**：7月明确增量提供基于owner/catalog的权限弹层，与下一回合实际配置及快照反馈一致。 | 真实权限弹层与next-turn实际配置回显 | ANDROID#56实际审批策略选择、生效及reset通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md；TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md；TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/assessments/JOINT-20261013.md；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **背景信息与额度**：显示当前线程上下文、任务usage、rate limit和辅助运行信息，切换线程刷新并清除旧残留。 | context/usage/rate-limit与任务背景信息面板存在 | 原native closeout与July文件/通知任务有定向/设备证据 | 未据该功能证据确认额外业务欠交 | 跨线程usage/rate-limit残留全组合未独立核 | docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md；TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md；TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/assessments/JOINT-20261013.md；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| 已移至独立要求 [REQ-TERMLINK-CODEX-BACKGROUND](#REQ-TERMLINK-CODEX-BACKGROUND)；原功能14的完整定义以该项为准。 具体义务：**后台任务与恢复**：活跃/等待状态保活，回连恢复当前任务及阻塞请求；任务完成和错误通知沿用原范围。 | 活跃/等待保活与通知/回连路径 | ANDROID#57长任务后台/断Wi-Fi/回跳完成通过；不闭合每种阻塞请求 | 无已知本子路径业务欠交 | 外部Owner阻塞审批的真实通知恢复未由868覆盖 | docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md；TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md；TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/assessments/JOINT-20261013.md；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **原生会话交互细化**：7月Header、Goal/Plan、Skills、Slash、选择器和composer布局沿对应UI任务，具体原生容器见原生迁移需求。 | July Header/Goal/Plan/Skills/composer改动已交付 | TASK60718/60722设备与JVM通过；10/13Plan/Skills反例仍适用 | 仅沿明确Plan/Skills/文件缺口修复，勿扩大新UI认证 | 无新增未知；仍限所述报告对象与样本 | docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md；TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md；TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/product/assessments/ANDROID-20261013.md；docs/product/assessments/JOINT-20261013.md；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |

#### 版本适用性

- ANDROID/JOINT-20261013运行对象为4d586e0f2dab1fef9d2c273b770796b63a7d873d及报告工作区、APK F148028B15FA3A8DFFE63CA483BCDA5A1CE9764BBDE817E68A357598D25DFD6A；不冒称本轮新跑。静态4d586e..a78fe55产品差异仅4个Codex Kotlin文件与clientRegistrationManager；未触及的终端/工作区具体反例仍适用，Codex逐行为检查868范围。
- TASK-20260868历史对象为4d586e+修复工作区，S3 APK d64a7cd8125daf121782f592e0ff56c3ef3237b7cd0a5acc48eecaa0e44b2e13。S3 source-manifest 13文件SHA与a78fe55完全相同（外部repair-manifest-comparison.json），src/server.js另核ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6亦相同。只承接连接/IPC失效提示清理及registration拒绝的原断言，不扩展原整REQ。
- May/July原任务只承接各自样本，旧Goal外部Follower支持说法已被7/31 AD-004撤销；不追加其他CLI/完整Session Defaults

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md](../../changes/summaries/SUMMARY-REQ-20260309-codex-capability-mvp.md)
- [TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md](../../../TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md)
- [TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md](../../../TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md)
- [TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md](../../../TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md)
- [TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md](../../../TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md)
- [TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md](../../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)
- [TASKS/TASK-20260722-002-android-codex-open-conversation-files.md](../../../TASKS/TASK-20260722-002-android-codex-open-conversation-files.md)
- [docs/changes/records/CR-20260409-2332-native-closeout.md](../../changes/records/CR-20260409-2332-native-closeout.md)
- [docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md](../../changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md)
- [docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md](../../changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/codex/codex-rollout-collector-architecture.md](../../codex/codex-rollout-collector-architecture.md)
- [docs/workflow/CONTRACTS.md](../../workflow/CONTRACTS.md)
- [docs/workflow/DECISIONS.md](../../workflow/DECISIONS.md)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)

### 剩余与待核对

- 排序P1：Plan options、Skills多选覆盖、文件content://不可读；P2：补已有配置/usage等未知来源，不复做已通过窄范围

依赖与排序依据：

- 共享CODEX-PLAN/SKILLS/ATTACHMENTS是同一功能，不另建重复任务
- healthy IPC authority和已有workspace文件访问边界

尚未核对/不可得材料：

- 完整catalog/usage/rate-limit跨线程组合
- 外部Owner审批点击及后续Plan执行确认
- 历史附件打开完整组合

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-08] 工作区文件浏览与 Diff 查看

<a id="AS-CURRENT-20261014-08"></a>

### 覆盖范围

需求：[REQ-20260318-ws-0001-docs-exp](../MANAGED_REQUIREMENTS.md#REQ-20260318-ws-0001-docs-exp)。本轮完整重评 REQ-20260318-ws-0001-docs-exp 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。原3月浏览/HEADdiff后经TASK60718-003明确扩展PDF/图片/下载/双比较，60719阅读修复；10/13真实浏览与PDF反例均有记录。

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| **固定工作区访问**：会话创建时固化workspaceRoot，文件访问经过现有session认证和根目录边界校验。 | session workspaceRoot固化、auth与根边界检查沿既有路由 | July152/152及47/47，10/13认证浏览/下载；非任意文件访问 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md；TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt |
| 已移至独立要求 [REQ-TERMLINK-WORKSPACE-BROWSE](#REQ-TERMLINK-WORKSPACE-BROWSE)；原功能2的完整定义以该项为准。 具体义务：**文档入口与目录导航**：默认进入docs/DOCS，可返回根目录；移动端钻取、宽屏懒加载目录树，提供面包屑、刷新和隐藏文件切换。 | docs/DOCS默认、根返回、tree/breadcrumb/hidden开关 | July宽屏1440、手机412/360及Huawei通过；10/13目录/proof.txt返回通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md；TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt |
| 已移至独立要求 [REQ-TERMLINK-WORKSPACE-BROWSE](#REQ-TERMLINK-WORKSPACE-BROWSE)；原功能3的完整定义以该项为准。 具体义务：**受限文件搜索**：按工作区相对路径搜索，排除.git、依赖和生成缓存，并保持已有扫描/结果预算。 | 相对路径搜索排除.git/依赖缓存，20k扫描/100结果预算 | July任务明确实现并定向通过 | 未据该功能证据确认额外业务欠交 | 10/13未重新穷举搜索预算，原范围结果承接 | docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md；TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt |
| 已移至独立要求 [REQ-TERMLINK-WORKSPACE-PREVIEW](#REQ-TERMLINK-WORKSPACE-PREVIEW)；原功能4的完整定义以该项为准。 具体义务：**文本与代码阅读**：按编码、语言和文件类型只读展示内容，保留大文件分级提示和代码高亮。 | 文本/代码编码语言高亮及大小分级 | July任务通过；10/13proof.txt可读 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md；TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt |
| 已移至独立要求 [REQ-TERMLINK-WORKSPACE-PREVIEW](#REQ-TERMLINK-WORKSPACE-PREVIEW)；原功能5的完整定义以该项为准。 具体义务：**Markdown阅读**：只读渲染Markdown与其受控链接/资源，移动端字号和长路径换行沿后续修复。 | 只读Markdown与受控链接，July字号13px/1.62与代码12px换行 | 60719 14/14+134/134及Huawei资产hash一致通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md；TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt |
| 已移至独立要求 [REQ-TERMLINK-WORKSPACE-PREVIEW](#REQ-TERMLINK-WORKSPACE-PREVIEW)；原功能6的完整定义以该项为准。 具体义务：**图片与PDF预览**：使用已有只读预览入口，图片按自然比例阅读，PDF使用仓库内离线资产。 | 图片自然比例与仓库离线PDF资产入口存在 | 10/13 PDF实际模块导入失败；原July通过不能覆盖后续反例 | 修复离线PDF模块加载/资源路径 | 图片多尺寸非新增矩阵；仅原样本适用 | docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt；TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md |
| 已移至独立要求 [REQ-TERMLINK-WORKSPACE-PREVIEW](#REQ-TERMLINK-WORKSPACE-PREVIEW)；原功能7的完整定义以该项为准。 具体义务：**二进制及不可预览反馈**：不支持的文件类型、非Git工作区及无内容等场景给出可识别状态。 | binary/无法预览/非Git/无内容状态已有实现 | July定向与浏览器回归报告通过 | 未据该功能证据确认额外业务欠交 | 10/13未逐类重演；不据此抹除原证据 | docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md；TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt |
| 已移至独立要求 [REQ-TERMLINK-WORKSPACE-DIFF](#REQ-TERMLINK-WORKSPACE-DIFF)；原功能8的完整定义以该项为准。 具体义务：**Git HEAD比较**：合并staged和unstaged差异，处理未跟踪、删除、无HEAD和无变更场景。 | HEAD合并staged/unstaged、untracked/deleted/noHEAD | July覆盖相应情形；10/13手机HEAD diff通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md；TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt |
| 已移至独立要求 [REQ-TERMLINK-WORKSPACE-DIFF](#REQ-TERMLINK-WORKSPACE-DIFF)；原功能9的完整定义以该项为准。 具体义务：**双文本文件比较**：选择两份文本生成配对hunks，支持unified和side-by-side查看。 | 选双文本生成配对hunks、unified/side-by-side | July原任务明确交付与browser验证 | 未据该功能证据确认额外业务欠交 | 10/13未重新验双文件；无新反例 | docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md；TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt |
| 已移至独立要求 [REQ-TERMLINK-WORKSPACE-DOWNLOAD](#REQ-TERMLINK-WORKSPACE-DOWNLOAD)；原功能10的完整定义以该项为准。 具体义务：**Android认证下载与打开**：原生宿主使用Basic/mTLS下载，按已有缓存预算与清理策略保存，再经FileProvider只读交给系统打开。 | 原生Basic/mTLS下载、25MiB/24h缓存、FileProvider只读系统打开 | ANDROID#61真实401/200 ZIP hash一致/系统viewer/过期单缓存清理通过；July原有mTLS共用能力 | 未据该功能证据确认额外业务欠交 | 整缓存预算/所有mTLS下载组合未独立当前运行确认 | docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md；TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt |
| **Android返回与IME**：宿主接管目录/文件/浮层返回栈，键盘弹起时使用剩余可视空间。 | Workspace宿主back-stack/IME剩余高度 | JulyHuawei+10/13返回路径通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md；TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt |
| **小屏阅读与滚动**：Markdown/代码字号、长路径、局部横向滚动和返回入口保持移动端可用；不增加编辑、上传或写文件能力。 | 小屏字号/长路径/code局部scroll、无edit/upload | 60719阅读修复设备通过；10/13实际页面可读 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md；TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt |

#### 版本适用性

- 历史报告按原提交/设备/范围承接；本轮仅阅读及静态比对，无新增测试/构建/运行验证
- ANDROID/JOINT-20261013运行对象为4d586e0f2dab1fef9d2c273b770796b63a7d873d及报告工作区、APK F148028B15FA3A8DFFE63CA483BCDA5A1CE9764BBDE817E68A357598D25DFD6A；不冒称本轮新跑。静态4d586e..a78fe55产品差异仅4个Codex Kotlin文件与clientRegistrationManager；未触及的终端/工作区具体反例仍适用，Codex逐行为检查868范围。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md](../../changes/summaries/SUMMARY-REQ-20260318-WS-0001-docs-exp.md)
- [TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md](../../../TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md)
- [TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md](../../../TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json](../history/maintenance-20261011/android-validation-20261013/workspace-preview.json)
- [docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt](../history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt)

### 剩余与待核对

- 排序P1：修复PDF离线模块失败；其他未知仅补原任务必要证据，保留搜索/双文本历史通过

依赖与排序依据：

- WORKSPACE-PREVIEW共享PDF能力
- session workspaceRoot及认证；不能以修PDF扩大编辑/上传

尚未核对/不可得材料：

- 下载缓存整个预算/mTLS组合
- PDF失败精确模块响应链未逐个源码追踪

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-09] Android 会话列表本地缓存与离线回显

<a id="AS-CURRENT-20261014-09"></a>

### 覆盖范围

需求：[REQ-20260324-session-list-local-cache](../MANAGED_REQUIREMENTS.md#REQ-20260324-session-list-local-cache)。本轮完整重评 REQ-20260324-session-list-local-cache 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。6a0f06e原closeout真实LYA-TL00 Android10 instrumentation34/34；2aaf6b6写回generation修复已纳入，当前Store/Fragment逻辑仍实现。

结论：**undetermined**。实现标记 delivered-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| **最近远端列表保存**：按Profile及已有缓存身份保存最近成功获取的sessions及必要元数据。 | SharedPreferences v1按profileId+baseURL+身份cacheKey保存规范列表 | 原34/34收口；当前Store load/replace实码 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md；docs/changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md；docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md；android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；docs/product/assessments/ANDROID-20261013.md |
| **缓存首屏**：进入会话管理先展示可得缓存，再异步刷新远端。 | Fragment loadForProfiles首屏后异步请求 | 原lifecycle/status设备回归34/34，当前cache_first_paint路径存在 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md；docs/changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md；docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md；android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；docs/product/assessments/ANDROID-20261013.md |
| **缓存状态可见**：区分缓存、刷新中和刷新失败，不以本地记录伪装实时在线状态。 | cache/refreshing/stale banner与lastsync提示分开 | 原status instrumentation通过；当前Fragment424+状态分支 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md；docs/changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md；docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md；android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；docs/product/assessments/ANDROID-20261013.md |
| **成功刷新回写**：远端成功结果同时更新界面与本地快照。 | 成功remote group通过writeback保存，同步UI | writeback跳过hasError及External；原收口通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md；docs/changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md；docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md；android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；docs/product/assessments/ANDROID-20261013.md |
| **失败保留**：网络失败或超时仍保留已有缓存列表，不清空用户已知会话。 | 失败group不写覆盖缓存，保留已有快照 | 原失败状态与lifecycle真机收口通过 | 未据该功能证据确认额外业务欠交 | 后续mixed成功/失败group呈现分支变化，当前整组失败仍保留；部分失败与原缓存保留义务的完整映射待核 | docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md；docs/changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md；docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md；android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；docs/product/assessments/ANDROID-20261013.md |
| **变更与生命周期回写**：成功的会话CRUD及view重建沿既有回写逻辑更新列表；旧generation结果不覆盖新请求。 | CRUD乐观更新、刷新权威结果及profile-context generation门禁 | 原2aaf6b6修复与6a0f06e 34/34设备证明旧generation场景；当前generation仍在，但后续drawer生命周期/delete并发/executor保护已改，原34/34不能直接闭合全部当前行为 | 未据该功能证据确认额外业务欠交 | 当前drawer可见性/混合profile失败/刷新中delete和destroy写入保护对原缓存验收的适用结果未充分定位 | docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md；docs/changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md；docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md；android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；docs/product/assessments/ANDROID-20261013.md |
| **External沿用本地来源**：External列表由已有ExternalSessionStore保留，与远端缓存分组展示兼容；不新增离线远端CRUD。 | External独立Store，远端Store忽略EXTERNAL_WEB | 原缓存分组兼容验收；10/13External持久化通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md；docs/changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md；docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md；android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；docs/product/assessments/ANDROID-20261013.md |

#### 版本适用性

- 原被测交付6a0f06eccdb6f7cde0037da2f7041c5ce5b423ca；LYA-TL00 Android10 instrumentation34/34只认证当时对象，保存其成果。
- 静态6a0f06e→a78fe55：SessionListCacheStore.kt与SessionRemoteCacheWriteback.kt逐字相同；SessionsFragment已实质演进（忽略行尾仍有drawer可见性/自动刷新、mixed-group失败呈现、断网delete本地fallback、刷新时delete及destroy后写入保护、排序等变化）。
- 当前cache-first/按profile-context generation核心仍存在；原34/34不能直接认证改动后的全部lifecycle/失败保留行为。未定位这些变化对原缓存验收完整适用的后续结果，故整体undetermined而非把原实现判无。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md](../../changes/records/CR-20260325-2219-sessions-closeout-validation.md)
- [docs/changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md](../../changes/records/CR-20260325-2356-session-list-local-cache-done-sync.md)
- [docs/changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md](../../changes/records/CR-20260325-1626-sessions-cache-write-generation-guard.md)
- [android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt](../../../android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt)
- [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt](../../../android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt)
- [android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt](../../../android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt)
- [android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt](../../../android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)

静态版本桥细节：

- from_commit：6a0f06eccdb6f7cde0037da2f7041c5ce5b423ca；to_commit：a78fe55e033bbcb6db816acd2c801de5aa28a081；method：read-only git show/git diff; no runtime validation；files：path：android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt；from_sha256：c58e43438218cdc78cd26243646d001dd6b4cea4cee0dd718d60886f7c0880e1；to_sha256：c58e43438218cdc78cd26243646d001dd6b4cea4cee0dd718d60886f7c0880e1；byte_identical：True；path：android/app/src/main/java/com/termlink/app/ui/sessions/SessionRemoteCacheWriteback.kt；from_sha256：d12e2bf943591924babdcaa8277f13d249f8c229c7b9ffb68ebef360351b9c95；to_sha256：d12e2bf943591924babdcaa8277f13d249f8c229c7b9ffb68ebef360351b9c95；byte_identical：True；path：android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt；from_sha256：1f74bf8ddb19516fc3a46dcd72b5e42660277cc6e719a86b1f2aa3c4059c1bc5；to_sha256：34d8fda96575e05142bb9390d3e74148d82c9aa54a5ffb225e01794ac86a7ac1；byte_identical：False

### 剩余与待核对

- 排序P2：先读3/28 partial refresh和7/30 delete/visibility等后续实际Task/CR证据，核原失败保留/生命周期义务；不要重做已逐字保留的Store/writeback能力

依赖与排序依据：



尚未核对/不可得材料：

- 6a0f06e之后SessionsFragment实质变化的后续结果与原34/34逐项覆盖关系；原成果仍有效但不全量升级当前PASS

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-10] Android Profile 级 mTLS 运行时证书选择

<a id="AS-CURRENT-20261014-10"></a>

### 覆盖范围

需求：[REQ-20260326-android-profile-mtls-runtime-certificate](../MANAGED_REQUIREMENTS.md#REQ-20260326-android-profile-mtls-runtime-certificate)。本轮完整重评 REQ-20260326-android-profile-mtls-runtime-certificate 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。多批证书store/settings/runtime CR及真机3/3；f43ff6f direct-IP三层回归与da5470a Codex mTLS WSS修复真实通过，足以证明已实施而非证据空白。

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| **按Profile选择证书**：系统选择器导入.p12/.pfx到该Profile私有目录，不使用打包assets作为运行时回退。 | 当前按profile私有存储+系统选择器，不用assetsfallback | 原设置/runtime交付与JOINT#11实际p12导入保存通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md；docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt；android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt；android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt；android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt；android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt；docs/product/assessments/JOINT-20261013.md；docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md；docs/changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md；docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md；docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md；docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md；docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md |
| **证书与口令管理**：查看绑定名称/状态、选择、替换和移除证书，保存/读取/删除本地口令。 | credential repository按profile/mtime/passwordhash缓存，口令char清零；设置替换移除 | 原真机3/3含A/B切换与替换旧证书失效；JOINT#11导入/移除 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md；docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt；android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt；android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt；android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt；android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt；docs/product/assessments/JOINT-20261013.md；docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md；docs/changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md；docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md；docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md；docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md；docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md |
| **新配置校验**：新建或正常编辑启用mTLS时校验证书和口令，缺失项明确提示。 | MtlsProfileFormResolver区分新建/正常编辑，证书/密码必填 | 原phase2 Gradle一度被Capacitor生成文件阻塞；后续8.5计划记SettingsFragmentLifecycleTest设备4/4及本地form/policy/repository tests通过，当前resolver可读 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md；docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt；android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt；android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt；android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt；android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt；docs/product/assessments/JOINT-20261013.md；docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md；docs/changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md；docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md；docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md；docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md；docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md；docs/changes/records/CR-20260326-2334-phase5-settings-android-tests.md；docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md |
| **旧Profile待补齐**：升级遗留开关可保留为待补齐，允许修改其他字段；缺证书不产生有效mTLS连接。 | legacy pending可保开关但缺material时不能加载连接 | resolver pending状态及HTTP/WebView缺凭据fail分支；原phase2-3交付 | 无已知欠交 | legacy升级全部真实UI组合本次未重演，未据此新增要求 | docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md；docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt；android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt；android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt；android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt；android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt；docs/product/assessments/JOINT-20261013.md；docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md；docs/changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md；docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md；docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md；docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md；docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md |
| **主动移除语义**：正常有效配置主动移除证书同时关闭mTLS；原挂起配置按原兼容规则保留。 | certificateRemoved且无staged时清材料；正常valid策略由form/设置协同 | 3/26remove-fix当时未执行；后续8.5 Settings设备4/4覆盖保存/删除/口令/移除清理，当前resolver保shouldClearStoredMaterial | 未据该功能证据确认额外业务欠交 | 本批未逐行核SettingsFragment提交所有分支，原验收承接 | docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md；docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt；android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt；android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt；android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt；android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt；docs/product/assessments/JOINT-20261013.md；docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md；docs/changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md；docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md；docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md；docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md；docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md；docs/changes/records/CR-20260326-2334-phase5-settings-android-tests.md；docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md |
| **共享凭据解析**：WebView与原生HTTP/API链路使用当前Profile证书及共享解析缓存。 | Native HTTP/WebView共用repository和hostpolicy，Codex使用mTLS-aware OkHttp | 原3/3真机Native200+WebView ClientCertRequest；Codexda5470a真实WS opened | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md；docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt；android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt；android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt；android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt；android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt；docs/product/assessments/JOINT-20261013.md；docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md；docs/changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md；docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md；docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md；docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md；docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md |
| **变更清理与失效**：替换、关闭或删除Profile时清理相应证书副本、口令和解析缓存。 | profile-bound缓存清理和replace键失效，WebView cert preferences invalidation | 3/3证明replace旧证书不生效；当前clear/profilecache实码 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md；docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt；android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt；android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt；android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt；android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt；docs/product/assessments/JOINT-20261013.md；docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md；docs/changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md；docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md；docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md；docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md；docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md |
| **服务端直接TLS/mTLS**：服务端可按IP:port承载TLS/mTLS，HTTP API与WebSocket使用同一客户端证书校验边界。 | server TLS监听统一HTTP/WSS socket安全边界；自管IP:port可用 | f43ff6f PC no/wrong/good证书真实拒绝/200/WSS；备用Android原生API创建session成功 | 无须把当时明确非阻塞的Android前台terminalWSS额外观察改欠交 | 当前新APK没有重新跑完整TLS矩阵；承接原既定验收对象 | docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md；docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt；android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt；android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt；android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt；android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt；docs/product/assessments/JOINT-20261013.md；docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md；docs/changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md；docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md；docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md；docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md；docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md |
| **模式兼容**：终端、External相关原生请求和Codex连接沿现有Profile证书模型；透明Relay只是另行planned范围。 | 终端/External Native/Codex沿profile证书；透明relay另planned | 97/97统一服务端接入，3/3证书共享，CodexWSS da5470a真机修复通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md；docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md；docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md；docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt；android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt；android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt；android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt；android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt；docs/product/assessments/JOINT-20261013.md；docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md；docs/changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md；docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md；docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md；docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md；docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md |

#### 版本适用性

- 3/27真机3/3使用client.badssl.com只证明客户端共享/替换，不单独证明TermLink服务端
- DirectIP CR另补server真实拒绝/PCWSS/Android原生HTTPS三层；4/13 Codex WSS修复另有真机opened；JOINT#11仅新增局部不能抹掉旧适用证据
- TASK-20260868历史对象为4d586e+修复工作区，S3 APK d64a7cd8125daf121782f592e0ff56c3ef3237b7cd0a5acc48eecaa0e44b2e13。S3 source-manifest 13文件SHA与a78fe55完全相同（外部repair-manifest-comparison.json），src/server.js另核ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6亦相同。只承接连接/IPC失效提示清理及registration拒绝的原断言，不扩展原整REQ。
- 阶段早期Gradle阻塞、CR1603/1609只列命令无结果不能单当PASS；之后8.5明确Settings4/4与mTLS3/3是适用补证。极端文件系统备份恢复失败路径未在设备实测，不扩新验收条件

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md](../../changes/records/CR-20260327-0148-phase5-real-device-mtls-validation.md)
- [docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md](../../changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md)
- [docs/changes/records/CR-20260327-1525-server-unified-mtls-integration.md](../../changes/records/CR-20260327-1525-server-unified-mtls-integration.md)
- [docs/changes/records/CR-20260327-1800-server-tls-mtls-listener.md](../../changes/records/CR-20260327-1800-server-tls-mtls-listener.md)
- [docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md](../../changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md)
- [android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt](../../../android/app/src/main/java/com/termlink/app/data/MtlsCredentialRepository.kt)
- [android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt](../../../android/app/src/main/java/com/termlink/app/data/MtlsPolicyResolver.kt)
- [android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt](../../../android/app/src/main/java/com/termlink/app/data/MtlsHttpSupport.kt)
- [android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt](../../../android/app/src/main/java/com/termlink/app/web/MtlsWebViewClient.kt)
- [android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt](../../../android/app/src/main/java/com/termlink/app/ui/settings/MtlsProfileFormResolver.kt)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md](../../changes/records/CR-20260326-0041-mtls-profile-settings-phase2.md)
- [docs/changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md](../../changes/records/CR-20260326-0100-mtls-settings-remove-certificate-fix.md)
- [docs/changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md](../../changes/records/CR-20260326-1603-webview-client-cert-cache-invalidation-fix.md)
- [docs/changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md](../../changes/records/CR-20260326-1609-mtls-certificate-replace-rollback-fix.md)
- [docs/changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md](../../changes/summaries/SUMMARY-REQ-20260326-android-profile-mtls-runtime-certificate.md)
- [docs/product/plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md](../plans/PLAN-20260326-android-profile-mtls-runtime-certificate-impl.md)
- [docs/changes/records/CR-20260326-2334-phase5-settings-android-tests.md](../../changes/records/CR-20260326-2334-phase5-settings-android-tests.md)
- [docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md](../../changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md)

### 剩余与待核对

- 无已知当前原mTLS范围欠交；若证书替换/WS transport再变更，仅针对所改路径补原定验证

依赖与排序依据：

- 系统信任CA；debug-only本地CA信任不外溢Release
- DirectIP/server证书边界与planned透明relay分开

尚未核对/不可得材料：

- 当前全mTLS运行矩阵未新做；非重开已验收任务依据

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-11] 基于系统语言的应用语言自动适配与 i18n 框架建设

<a id="AS-CURRENT-20261014-11"></a>

### 覆盖范围

需求：[REQ-20260329-language-normalization](../MANAGED_REQUIREMENTS.md#REQ-20260329-language-normalization)。本轮完整重评 REQ-20260329-language-normalization 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。3月分期实现与32e39b4收口；语言包398/398、native159/159和扩展ja原通过，当前locale代码与10/13系统切换可用。

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| **系统语言映射**：原采用范围按系统语言选择客户端UI：中文族映射简中，其余采用英文。 | LocaleHelper zh族=>zh-CN，其他en；原生locale与Web lang参数 | 10/13英文系统切换原生/embedded主体有效 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260330-0500-language-normalization-closeout.md；android/app/src/main/java/com/termlink/app/util/LocaleHelper.kt；public/i18n/i18n.js；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；docs/product/assessments/ANDROID-20261013.md |
| **Web语言包与替换**：终端、配置、Workspace和Codex页面使用现有语言包及文案替换入口。 | i18n语言包和页面替换API存在 | 原26/26、398/398；10/13部分内嵌可访问标签仍与系统语言不一 | 对照原采用页面修复遗漏标签，不扩终端输出/服务端错误翻译 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260330-0500-language-normalization-closeout.md；android/app/src/main/java/com/termlink/app/util/LocaleHelper.kt；public/i18n/i18n.js；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；docs/product/assessments/ANDROID-20261013.md |
| **原生语言资源**：Android原生页面使用语言资源，WebView与原生语言按既有locale桥接一致。 | values/values-zh与Locale桥接前台reload | 10/13英文下native工具状态仍为“已运行命令” | 修复原UI可见工具状态语言不一致 | 新功能专属文案是否沿本项既定客户端UI边界应明确，勿据源码把手动语言UI自动纳入 | docs/changes/records/CR-20260330-0500-language-normalization-closeout.md；android/app/src/main/java/com/termlink/app/util/LocaleHelper.kt；public/i18n/i18n.js；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；docs/product/assessments/ANDROID-20261013.md |
| **缺失键回退**：语言包加载或文案缺失时采用既有fallback，不将错误显示为空白标签。 | i18n.t依次_messages/_fallback/key，加载失败用key不空白 | 原closeout及当前i18n关键分支；无当前反例 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260330-0500-language-normalization-closeout.md；android/app/src/main/java/com/termlink/app/util/LocaleHelper.kt；public/i18n/i18n.js；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；docs/product/assessments/ANDROID-20261013.md |
| **语言注册扩展**：新增语言包及映射可复用现有注册机制；手动语言UI属于另列源码观察，不据此改变本需求原排除项。 | registerLocale+custombasePath支持新增包映射 | 原registerLocale(ja)+ja.json验证通过；当前API存在 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260330-0500-language-normalization-closeout.md；android/app/src/main/java/com/termlink/app/util/LocaleHelper.kt；public/i18n/i18n.js；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；docs/product/assessments/ANDROID-20261013.md |

#### 版本适用性

- 历史报告按原提交/设备/范围承接；本轮仅阅读及静态比对，无新增测试/构建/运行验证
- ANDROID/JOINT-20261013运行对象为4d586e0f2dab1fef9d2c273b770796b63a7d873d及报告工作区、APK F148028B15FA3A8DFFE63CA483BCDA5A1CE9764BBDE817E68A357598D25DFD6A；不冒称本轮新跑。静态4d586e..a78fe55产品差异仅4个Codex Kotlin文件与clientRegistrationManager；未触及的终端/工作区具体反例仍适用，Codex逐行为检查868范围。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260330-0500-language-normalization-closeout.md](../../changes/records/CR-20260330-0500-language-normalization-closeout.md)
- [android/app/src/main/java/com/termlink/app/util/LocaleHelper.kt](../../../android/app/src/main/java/com/termlink/app/util/LocaleHelper.kt)
- [public/i18n/i18n.js](../../../public/i18n/i18n.js)
- [android/app/src/main/java/com/termlink/app/MainShellActivity.kt](../../../android/app/src/main/java/com/termlink/app/MainShellActivity.kt)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)

### 剩余与待核对

- 排序P2：按实际可见状态/标签定位漏翻译；不增加手动语言、RTL或服务端输出翻译

依赖与排序依据：



尚未核对/不可得材料：

- 新native工具状态对原采用范围的精确映射
- 所有页面key当前集合未重新穷举

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-12] Codex Android 原生会话迁移

<a id="AS-CURRENT-20261014-12"></a>

### 覆盖范围

需求：[REQ-20260408-codex-native-android-migration](../MANAGED_REQUIREMENTS.md#REQ-20260408-codex-native-android-migration)。本轮完整重评 REQ-20260408-codex-native-android-migration 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。原native closeout、后续入口移除、mTLS修复和July两UI任务均有真实实现/设备结果；MainShell当前直接CodexActivity.newIntent，不能用旧draft状态推未开始。

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| **独立原生入口**：CodexActivity作为当前原生会话入口；旧可达Codex WebView入口/回退按后续记录已移除，终端WebView继续使用。 | MainShell对CODEX+TermLink走独立CodexActivity；终端WebView保留 | CR0411-1714实际默认/冷启动/会话列表入口设备通过；当前1145+代码 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **启动与恢复**：传入session、conversation和cwd等既有参数，恢复选择及返回行为。 | profile/session/cwd/thread参数与shell偏好恢复 | CR0418原真机；ANDROID#48 MAIN/LAUNCHER冷启动恢复当前历史选择通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **原生连接层**：wire/DTO、WebSocket连接、重连和ViewModel按既有服务端协议承接。 | 独立wire/WebSocket/连接管理/ViewModel，支持profile-aware mTLS | CR0413-0215真机WSS opened；868新增generation/提示范围定点通过 | 未据该功能证据确认额外业务欠交 | 不能据连接提示测试当完整transport/所有协议认证 | docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **原生消息与输入**：在原生消息流和composer内使用已有对话、流式、slash、mention、附件和配置能力，细目复用已登记的CODEX-SLASH、CODEX-SKILLS、CODEX-FILES、CODEX-ATTACHMENTS及CODEX-MODEL子要求；本项仅保留原生容器接入。 | 原生容器可聊天/流式/Slash/mention/附件/配置 | ANDROID#13对话主路径通过；#52 Skills覆盖、#54文档content不可读 | 处理共享Skills/附件缺口；容器接入不能单以存在为全通过 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **阻塞交互与面板**：原生容器接入[审批与用户输入](#REQ-TERMLINK-CODEX-APPROVAL)、[计划](#REQ-TERMLINK-CODEX-PLAN)、[历史线程](#REQ-TERMLINK-CODEX-THREADS)及原有工具/运行态与背景面板；共用交互不再复制定义。 | 原生审批、Plan、history、工具/背景面板可达 | ANDROID#55真实命令审批通过，#50后续Plan options不显示 | 处理Plan/用户输入共享缺口 | 大历史详情另由HISTORY-ANDROID约束不当作迁移全重写 | docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **全局入口**：Header提供会话列表、设置、文档入口，文档关联当前工作区。 | Header sessions/settings/docs关联workspace | July header/composer设备回归；ANDROID#09文档workspace浏览通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **安全区与IME**：以运行时insets/cutout避开前摄和系统遮挡，键盘弹起时输入区可见。 | runtime insets/cutout/IME布局，移除多余36dp | July60722-001 JVM163/163+45/45/Huawei通过 | 未据该功能证据确认额外业务欠交 | 3-button导航未手工验属于原报告限制，不新增OEM矩阵 | docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **自动跟随与返回最新**：默认跟随新消息，手动上滑停止跟随，返回底部恢复跟随。 | autoFollow状态、手动回看暂停、底部恢复 | CR0415-1253/0416-0249真机滚离/返回/按钮消失通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **通知与后台容器**：容器接入[后台任务与恢复](#REQ-TERMLINK-CODEX-BACKGROUND)，保留审批/补充说明/计划确认等待态、通知回跳及结束态通知收口的原生边界。 | 真实active/wait驱动foreground与完成通知、回跳 | 原CR0416-0207及ANDROID#57后台Wi-Fi/完成回跳收口通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **提供方适配边界**：保留adapter/capability边界以隔离Codex私有字段；Claude/Copilot真实接入不是本次已交付功能。 | capability与wire/domain文件存在，但ViewModel仍直接处理Codex字段 | ANDROID#13静态指出VM/data耦合；本批见大量capability/私有消息处理 | 无依据要求真实Claude/Copilot接入 | 原adapter边界是否满足隔离设计未找到独立验收，需设计核对 | docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md；docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |

#### 版本适用性

- ANDROID/JOINT-20261013运行对象为4d586e0f2dab1fef9d2c273b770796b63a7d873d及报告工作区、APK F148028B15FA3A8DFFE63CA483BCDA5A1CE9764BBDE817E68A357598D25DFD6A；不冒称本轮新跑。静态4d586e..a78fe55产品差异仅4个Codex Kotlin文件与clientRegistrationManager；未触及的终端/工作区具体反例仍适用，Codex逐行为检查868范围。
- TASK-20260868历史对象为4d586e+修复工作区，S3 APK d64a7cd8125daf121782f592e0ff56c3ef3237b7cd0a5acc48eecaa0e44b2e13。S3 source-manifest 13文件SHA与a78fe55完全相同（外部repair-manifest-comparison.json），src/server.js另核ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6亦相同。只承接连接/IPC失效提示清理及registration拒绝的原断言，不扩展原整REQ。
- 4月旧native closeout仍容许WebViewfallback，4/11后续明确移除；以新边界为准。七月局部设备证据非全功能认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260409-2332-native-closeout.md](../../changes/records/CR-20260409-2332-native-closeout.md)
- [docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md](../../changes/records/CR-20260411-1714-codex-native-main-entry-removal.md)
- [docs/changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md](../../changes/records/CR-20260413-0215-codex-android-mtls-ws-fix.md)
- [docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md](../../changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md)
- [docs/changes/records/CR-20260415-1253-codex-android-autoscroll.md](../../changes/records/CR-20260415-1253-codex-android-autoscroll.md)
- [docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md](../../changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md)
- [docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md](../../changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md)
- [TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md](../../../TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md)
- [TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md](../../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)
- [android/app/src/main/java/com/termlink/app/MainShellActivity.kt](../../../android/app/src/main/java/com/termlink/app/MainShellActivity.kt)
- [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)

### 剩余与待核对

- 排序P1：共用Plan/Skills/文件问题只排一次；P2：核provider adapter能力隔离边界

依赖与排序依据：

- 共享CODEX-PLAN/APPROVAL/SKILLS/ATTACHMENTS
- IPC authority现冻结约束，不能恢复旧WebView回退

尚未核对/不可得材料：

- adapter/capability隔离设计的原独立验收
- 其他CLI实际接入明确不在范围

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-13] Codex Android 运行态一致性、通知与关键交互修复

<a id="AS-CURRENT-20261014-13"></a>

### 覆盖范围

需求：[REQ-20260415-codex-android-runtime-interaction-fixes](../MANAGED_REQUIREMENTS.md#REQ-20260415-codex-android-runtime-interaction-fixes)。本轮完整重评 REQ-20260415-codex-android-runtime-interaction-fixes 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。4月六批运行态修复已完成各自JVM/设备例；后续TASK20260868已closed并在3d72aac9提交连接/IPC提示修复，原in_progress与CRdraft不等于未实施。

结论：**undetermined**。实现标记 delivered-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| **可中断状态**：只有真实活跃turn提供中断动作，无活跃turn不以CODEX_NO_ACTIVE_TURN打扰用户。 | currentTurnId驱动stop，idle/race no-active-turn收口no-op | CR0416-0207第一批真机idle无stop通过 | 未据该功能证据确认额外业务欠交 | 当前healthy IPC所有活跃/等待组合未由868重新独立认证 | docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json；docs/product/history/maintenance-20261011/task20260868-s1/report.md；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/closure-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/server.js；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **进行中通知收口**：通知随真实执行/等待状态更新，idle及stale状态不残留进行中提示。 | 真实active/approval/planning控制ongoing，stop清9201 | 原第一批真机通过；ANDROID#15/#57任务结束无9201，raw activeTaskRecords0 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json；docs/product/history/maintenance-20261011/task20260868-s1/report.md；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/closure-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/server.js；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **完成提醒**：成功完成后沿既有任务完成提醒路径通知用户。 | 同线程真实运行->成功idle发布独立完成提醒 | 原第一批真机完成通知/服务清理；10/13后台任务完成回跳通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json；docs/product/history/maintenance-20261011/task20260868-s1/report.md；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/closure-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/server.js；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **Header布局**：状态/PATH两行、安全区和会话/文档按钮命中区按原修复范围显示。 | 两行status/PATH、按钮高度；Julyinsets/composer修复 | 原0249真机两行与命中区，July设备回归通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json；docs/product/history/maintenance-20261011/task20260868-s1/report.md；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/closure-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/server.js；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **手动到底恢复**：用户滚回底部自动隐藏返回最新入口并恢复跟随。 | canScrollForward+真实末消息判底，手动到底恢复autoFollow | 原0249截图/XML明确away出现、back消失通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json；docs/product/history/maintenance-20261011/task20260868-s1/report.md；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/closure-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/server.js；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **Slash按钮同步**：工具栏斜杠实际写入composer，建议列表由输入内容驱动。 | toolbar slash实际修改composer，由文本驱动菜单 | 原0249真机slash输入通过；July原生composer继续接入 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json；docs/product/history/maintenance-20261011/task20260868-s1/report.md；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/closure-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/server.js；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **历史线程继续**：继续当前选择的conversation，不误建新线程。 | gateway优先显式threadId resume，当前绑定不按cwd猜 | CR0416-0415定点+真机同历史threadId继续；10/13选历史恢复通过 | 未据该功能证据确认额外业务欠交 | 外部Owner所有动作/竞态不是该原单样本证明 | docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json；docs/product/history/maintenance-20261011/task20260868-s1/report.md；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/closure-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/server.js；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **弱网恢复**：丢流后沿当前IPC authority允许的有界恢复补齐结果，不把旧恢复轮询变为第二实时来源。 | 旧断线回补后经IPC唯一authority改为bounded canonical；868清恢复失效提示 | 4月第5到60行Wi-Fi回补通过；10/13后台完成返回通过；868真实WS down/up与受控同连接IPC恢复提示通过 | 无已知868局部剩余 | 直接catalog自动改选/外部审批click与所有弱网正文场景未覆盖，不能整REQ PASS | docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json；docs/product/history/maintenance-20261011/task20260868-s1/report.md；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/closure-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/server.js；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **重开复用**：重新打开时优先复用有效session/thread/cwd。 | 原生选择写回shell，null/undefined归一，reopen优先既有session/thread/cwd | CR0418真机恢复通过；ANDROID#48真冷启动通过；868 A/B/new提示清理通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json；docs/product/history/maintenance-20261011/task20260868-s1/report.md；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/closure-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/server.js；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **当前页正文收敛**：发送后用户消息立即可见，流式和最终回复在当前页面收敛。 | optimistic用户消息、流式与final收敛；现IPC healthy主导 | CR0418 Reply with OK->OK当前页通过；868 A/B只观察画面 | 无据此证明所有历史DB/final完整性 | 旧thread-idle canonical读策略已被authority冻结限定；全current transcript对账未由868覆盖 | docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json；docs/product/history/maintenance-20261011/task20260868-s1/report.md；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/closure-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/server.js；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **附件入口分流**：先选择图片或文件，再进入对应picker；后续历史附件打开能力复用[CODEX-ATTACHMENTS](#REQ-TERMLINK-CODEX-ATTACHMENTS)，本条保留picker分流的专项范围。 | 图片/文件底部sheet分流，文件保FileReference | CR0418真机sheet/picker通过；普通文档host不可读是共享附件能力另项缺口 | 本项picker分流未见反例 | 共享附件读取失败不抹掉picker专项已过，但原能力整体另列 | docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md；docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md；docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md；docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md；TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json；docs/product/history/maintenance-20261011/task20260868-s1/report.md；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/closure-20261013.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/server.js；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |

#### 版本适用性

- ANDROID/JOINT-20261013运行对象为4d586e0f2dab1fef9d2c273b770796b63a7d873d及报告工作区、APK F148028B15FA3A8DFFE63CA483BCDA5A1CE9764BBDE817E68A357598D25DFD6A；不冒称本轮新跑。静态4d586e..a78fe55产品差异仅4个Codex Kotlin文件与clientRegistrationManager；未触及的终端/工作区具体反例仍适用，Codex逐行为检查868范围。
- TASK-20260868历史对象为4d586e+修复工作区，S3 APK d64a7cd8125daf121782f592e0ff56c3ef3237b7cd0a5acc48eecaa0e44b2e13。S3 source-manifest 13文件SHA与a78fe55完全相同（外部repair-manifest-comparison.json），src/server.js另核ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6亦相同。只承接连接/IPC失效提示清理及registration拒绝的原断言，不扩展原整REQ。
- 868 S1最终Android292/292、Node139/139；S2 manager/handler46/46及23网络检查；S3 Huawei受控IPC(关闭active-send经Goal入口)+真实WS恢复/A-B-new。初始失败/三次失败UI尝试仍保存，不称独立第三方全验收

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md](../../changes/records/CR-20260416-0207-codex-android-lifecycle-notification-fix.md)
- [docs/changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md](../../changes/records/CR-20260416-0249-codex-android-header-interaction-fix.md)
- [docs/changes/records/CR-20260416-0415-codex-android-history-resync-fix.md](../../changes/records/CR-20260416-0415-codex-android-history-resync-fix.md)
- [docs/changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md](../../changes/records/CR-20260418-0048-codex-reopen-transcript-attachment-fix.md)
- [TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md](../../../TASKS/TASK-20260722-001-fix-android-codex-composer-layout.md)
- [TASKS/TASK-20260722-002-android-codex-open-conversation-files.md](../../../TASKS/TASK-20260722-002-android-codex-open-conversation-files.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json](../history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json)
- [docs/product/history/maintenance-20261011/task20260868-s1/report.md](../history/maintenance-20261011/task20260868-s1/report.md)
- [docs/product/history/maintenance-20261011/task20260868-s2/report.md](../history/maintenance-20261011/task20260868-s2/report.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/report.md](../history/maintenance-20261011/task20260868-s3/report.md)
- [docs/product/history/maintenance-20261011/task20260868-close/closure-20261013.md](../history/maintenance-20261011/task20260868-close/closure-20261013.md)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json](../history/maintenance-20261011/task20260868-s3/source-manifest.json)
- [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt)
- [src/server.js](../../../src/server.js)
- [docs/workflow/CONTRACTS.md](../../workflow/CONTRACTS.md)
- [docs/workflow/DECISIONS.md](../../workflow/DECISIONS.md)
- [docs/product/history/maintenance-20261011/task20260868-s1/review-second-repair-20261013.md](../history/maintenance-20261011/task20260868-s1/review-second-repair-20261013.md)

### 剩余与待核对

- 排序P2：先核原11组与现IPC边界下哪些剩余确需补证；868已通过局部不重开，原草稿CR真实提交引用按实际记录补齐而非伪造

依赖与排序依据：

- 现IPC follower与authority恢复边界；原常态polling不可恢复
- 共享附件/Plan问题走既有子项，不冒充868范围

尚未核对/不可得材料：

- 外部Owner真实审批click
- direct IPC catalog自动改选
- 原11组当前完整适用映射/正文DB对账

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-14] Codex 手机端与 CLI / 桌面端实时同步

<a id="AS-CURRENT-20261014-14"></a>

### 覆盖范围

需求：[REQ-20260516-codex-mobile-realtime-sync](../MANAGED_REQUIREMENTS.md#REQ-20260516-codex-mobile-realtime-sync)。本轮完整重评 REQ-20260516-codex-mobile-realtime-sync 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。TASK60629与Web60615/60617、paused60727多阶段真实实现；8/14 P0-C/retention/replay人工通过，不按paused头部把已完成步骤写成未启动。

结论：**undetermined**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| **当前会话跟随**：选择active conversation后经gateway获取目标follower订阅，以已绑定conversationId跟随同一任务。 | gateway acquire/release与feed desiredFollowing绑定conversation | JOINT#16真host接受phone follower，gateway双订阅快照；TASK60629 Node149/149及设备样本 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；src/services/codexIpcFeed.js；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **定向Surface接收**：CodexIpcFeed保留desired subscription并在重连后重放，接收host定向snapshot/patch。 | desired subscription跨重连replay，host定向snapshot/patch | 当前CodexIpcFeed desiredFollowing实现；JOINT49/49协议边界 | 未据该功能证据确认额外业务欠交 | 实际Desktop/VSCode作为外部Owner的全双端操作证据未定位 | TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；src/services/codexIpcFeed.js；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **唯一实时权威**：healthy IPC surface提供正文、operation、当前turn及运行态；Android不按缓存丰富度、idle或静默时长替换权威。 | healthy IPC是正文/turn/operation实时权威，缓存不抢夺 | CONTRACT/AD004明确冻结；paused60727已有authority补丁/回归 | 未据该功能证据确认额外业务欠交 | 完整多Owner当前真人链路未由窄回归证明 | TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；src/services/codexIpcFeed.js；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **绑定持久与恢复**：conversationId回写session并在列表、启动和恢复入口继续使用，不按cwd/latest猜已绑定身份。 | 明确conversationId持久session并恢复，不按latest/cwd猜 | 原任务/原历史线程继续证据；当前metadata恢复实现另可见 | 未据该功能证据确认额外业务欠交 | 服务重启后全部绑定恢复运行报告未定位 | TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；src/services/codexIpcFeed.js；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **跨会话隔离**：A/B选择、旧响应和旧事件按当前conversation/generation仲裁，避免串线。 | selection/conversation/generation隔离；A-B清active slot | 8/14设备A↔B↔A cache-first及surface保尾通过；868新提示A/B只限定UI | 未据该功能证据确认额外业务欠交 | 全部旧响应/事件受控迟到组合尚未读到完结 | TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；src/services/codexIpcFeed.js；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **同线程动作**：消息、计划、审批、用户输入及附件上下文沿已有authority router进入同一conversation。 | authority router把消息/plan/approval/context送同conversation | JOINT#53真实phone文件上下文host/Web可见；#16浏览器发送仅显示开始发送 | 不把未查serverresult定为失败 | Desktop/VSCode实际发起/接收、外部审批点击未闭环；Plan options已有UI失败由共享子项承担 | TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；src/services/codexIpcFeed.js；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **Owner容错**：外部Owner缺失时按既有仲裁接管同一thread；writer冲突不强占或静默新建。 | 缺Owner走同thread fallback，writer冲突不强占/新建 | TASK60629报告Ownerfallback设备样本；现仲裁约束 | 无据此承诺任意Owner takeover组合 | 当前真实外部Owner消失/接管全程结果未定位 | TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；src/services/codexIpcFeed.js；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **分级Goal控制**：TermLink Owner可启动及pause/resume真实Goal；external Owner只观察并支持既有turn中断，未知follower动作不伪造。 | TermLink Owner可真实Goal；external Owner只观察/turn interrupt | AD004 7/31撤销旧external Goal支持说法；868Goal仅用于触发同源hint | 不得恢复已退出的external follower Goal控制 | 真实TermLinkOwner Goal全生命周期现报告未全部逐读 | TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；src/services/codexIpcFeed.js；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **静态与有界恢复**：明确offline/desynced或当前订阅周期缺目标surface时才恢复canonical；healthy到达后停止正文恢复。 | 只有offline/desynced/当前subscription缺surface有界canonical；healthy到达即止 | 8/14第1步history-only恢复1176、无active IPC通过；第3步replay不偷fullread通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；src/services/codexIpcFeed.js；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **运行会话Retention**：App跟随生命周期与已采用的服务端运行期retention分开，复用同一feed和重连，不向无订阅App推送或新增轮询。 | 运行期retention与App跟随解耦，共用feed重连 | 8/14第2步Node33/33+gateway120/120与A-B-A设备通过，未向无订阅App推送 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；src/services/codexIpcFeed.js；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |
| **后续历史范围**：暂停包的B4R/B5、P0-C/P1及静态range/replay继续以各自原记录判断，不因上述核心交付而整体标完成。 | B4R/B5/P0-C/P1各阶段独立保留；replay区分已有/可连续/需canonical | 8/14第3步人工每selection一次，1041->1051/1418->1425 display-only不改SQLite | 仅继续各原未结范围，不把全部paused计划重做 | 第4步及B4R/B5/P1最终关闭证据/静态range整体尚未核完 | TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；src/services/codexIpcFeed.js；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |

#### 版本适用性

- ANDROID/JOINT-20261013运行对象为4d586e0f2dab1fef9d2c273b770796b63a7d873d及报告工作区、APK F148028B15FA3A8DFFE63CA483BCDA5A1CE9764BBDE817E68A357598D25DFD6A；不冒称本轮新跑。静态4d586e..a78fe55产品差异仅4个Codex Kotlin文件与clientRegistrationManager；未触及的终端/工作区具体反例仍适用，Codex逐行为检查868范围。
- TASK-20260868历史对象为4d586e+修复工作区，S3 APK d64a7cd8125daf121782f592e0ff56c3ef3237b7cd0a5acc48eecaa0e44b2e13。S3 source-manifest 13文件SHA与a78fe55完全相同（外部repair-manifest-comparison.json），src/server.js另核ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6亦相同。只承接连接/IPC失效提示清理及registration拒绝的原断言，不扩展原整REQ。
- 6/29旧Goal结论按AD004已修正；8/14尾部步骤事实优先于paused包旧头部阶段标签；Web60617原35/36含既有静态断言失败且全JSDOM按用户跳过，不能改记全通过

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md](../../../TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md)
- [TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md](../../../TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md)
- [docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md](../../workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md)
- [TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md](../../../TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/report.md](../history/maintenance-20261011/task20260868-s3/report.md)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)
- [src/services/codexIpcFeed.js](../../../src/services/codexIpcFeed.js)
- [docs/codex/codex-rollout-collector-architecture.md](../../codex/codex-rollout-collector-architecture.md)
- [docs/workflow/CONTRACTS.md](../../workflow/CONTRACTS.md)
- [docs/workflow/DECISIONS.md](../../workflow/DECISIONS.md)

### 剩余与待核对

- 排序P1/P2：先核同thread自然双端实际接力、Owner失联恢复与未结B4R/B5边界；不得以新polling规避现架构；已过8/14步骤保持成果

依赖与排序依据：

- Codex host支持定向follower与既有authority router
- HISTORY-PIPELINE仅有界静态恢复关联，不是healthy IPC第二实时来源

尚未核对/不可得材料：

- 实际Desktop/VSCode双端动作与Owner接管
- B4R/B5/P1及第4步最终事实
- 所有迟到/race组合和浏览器send的server结果

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-15] Linux 交互式 Release 安装器

<a id="AS-CURRENT-20261014-15"></a>

### 覆盖范围

需求：[REQ-20260715-linux-interactive-release-installer](../MANAGED_REQUIREMENTS.md#REQ-20260715-linux-interactive-release-installer)。本轮完整重评 REQ-20260715-linux-interactive-release-installer 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。20398215b7e1586f48e47d9e527a7bb7e5b13ead原P2-P4实现及P5本地33/33/打包证据；当前install.sh确有平台/systemd/依赖/配置入口。

结论：**undetermined**。实现标记 delivered-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| **根安装入口**：Release解包后的install.sh检查平台、root、systemd和依赖并分发安装。 | 根install.sh校验Linux/debianubuntu/x64arm64/systemd，以root或sudo安装依赖 | 原bash语法/33用例通过；当前入口静态可见 | 未据该功能证据确认额外业务欠交 | 真实目标宿主systemd从头安装未有最终证据 | docs/changes/records/CR-20260715-1635-linux-interactive-installer.md；docs/product/assessments/JOINT-20261013.md；install.sh |
| **交互安装向导**：按transport选择收集端口、认证、路径和证书配置，校验条件必填项。 | installer-config按transport条件收集端口/auth/路径/证书 | 原33/33配置与必填校验通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260715-1635-linux-interactive-installer.md；docs/product/assessments/JOINT-20261013.md；install.sh |
| **非交互与预览**：使用兼容install config执行非交互安装，dry-run展示安装动作。 | --config/--non-interactive/--dry-run存在，预览遮敏 | 原本地安装配置/预览测试通过；当前入口静态核对 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260715-1635-linux-interactive-installer.md；docs/product/assessments/JOINT-20261013.md；install.sh |
| **版本目录与外置数据**：安装到既有版本目录，以current链接选择运行版，配置和数据外置。 | versions/current软链、config/data外置 | 原本地安装演练与CR明确交付 | 未据该功能证据确认额外业务欠交 | 真实宿主升级前后持久性端到端未定位 | docs/changes/records/CR-20260715-1635-linux-interactive-installer.md；docs/product/assessments/JOINT-20261013.md；install.sh |
| **升级与失败恢复**：升级前后健康检查，失败回退旧版本与配置。 | 健康前后检查与失败回滚版本/配置 | 原P5本地回滚分支验证通过 | 未据该功能证据确认额外业务欠交 | 真实systemd失败回滚观察未定位 | docs/changes/records/CR-20260715-1635-linux-interactive-installer.md；docs/product/assessments/JOINT-20261013.md；install.sh |
| **HTTP及Direct mTLS**：按选择生成本地CA/证书或导入服务端PEM，并交付客户端凭据。 | http/direct-mtls参数、CA/server/client生成或PEM导入 | 原OpenSSL本地材料与配置生成通过 | 未据该功能证据确认额外业务欠交 | 宿主实际TLS连接安装后完整路径仍限原报告 | docs/changes/records/CR-20260715-1635-linux-interactive-installer.md；docs/product/assessments/JOINT-20261013.md；install.sh |
| **Nginx mTLS**：配置已有loopback后端、WebSocket、mTLS和trusted-proxy边界。 | Nginx loopback/WS/mTLS/trusted-secret模板与安装逻辑 | 原模板/配置验证通过 | 未据该功能证据确认额外业务欠交 | 真实Nginx站点启动/代理握手未验证 | docs/changes/records/CR-20260715-1635-linux-interactive-installer.md；docs/product/assessments/JOINT-20261013.md；install.sh |
| **证书包交付**：输出P12/PEM/公共CA及配置、unit、日志、URL和健康结果。 | P12/PEM/公共CA+unit/config/log/URL/health输出布局 | 原本地产物/证书包检查通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/changes/records/CR-20260715-1635-linux-interactive-installer.md；docs/product/assessments/JOINT-20261013.md；install.sh |
| **Release构建与版本门禁**：构建跨平台tar、校验v-semver标签并生成checksum和上传工作流；外部host/arm64/实际tag结果仍按P5证据判断。 | 跨平台tar/checksum/semver tag/upload工作流存在 | 原build/checksum/tar执行位通过；JOINT#17本机Linux构建因缺LinuxRust artifact停止 | 保留artifact供应与真实发布链前置，不把环境缺产物直接说实现失败 | arm64宿主、真实tag上传、当前完整Linux包交付未闭合 | docs/changes/records/CR-20260715-1635-linux-interactive-installer.md；docs/product/assessments/JOINT-20261013.md；install.sh |

#### 版本适用性

- 原CR P2-P4完成、P5仅本地；JOINT10/13 WSL x64具systemd但构建缺LinuxRust artifact，这是当前验证环境/交付物边界
- 本轮只读入口/原CR及原JOINT报告，不执行bash、安装或构建

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260715-1635-linux-interactive-installer.md](../../changes/records/CR-20260715-1635-linux-interactive-installer.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [install.sh](../../../install.sh)

### 剩余与待核对

- 排序P2：先定位可用LinuxRust交付artifact与已保存P5证据，再按原范围处理真实systemd/Nginx/arm64/tag未核项；不在本次运行安装

依赖与排序依据：

- LinuxRust artifact
- Debian/Ubuntu+systemd、对应架构与OpenSSL/Nginx环境；真实tag发布授权

尚未核对/不可得材料：

- P5外部host/arm64/Nginx/真实tag
- scripts/install/linux各实现本次未逐行全文审查

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-16] 新对话、分支与委派消息历史保存修复

<a id="AS-CURRENT-20261014-16"></a>

### 覆盖范围

需求：[REQ-20261005-codex-history-save-repair](../MANAGED_REQUIREMENTS.md#REQ-20261005-codex-history-save-repair)。本轮完整重评 REQ-20261005-codex-history-save-repair 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。直接执行已建立：832真实task-58bc12d9a46b8d84fb6e42888785b402的S3 Rust父来源/切点及窗口修复，S5 UTF8生产修复和原持久根三类保存，S6 Android详情alias及同机重验；833真实task-7ff69ba8242c90c52f0b93fa1144a655提供H1/H3前置。依据原执行/独立审查/代码，而非binding或closed。

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 新对话及同轮开始→完成合法增长，不误判为冲突 | importer.isHistoryObservationUpdate对真实TurnStarted→completed按同scope、现attempt、顺序与full/连续delta证明允许逻辑更新；物理事件保持不可变 | 833原H1 backfill和append隔离产品保存；832新普通N实际11项/2详情ref并手机重开；独立审查确认G1机制 |  |  | docs/codex/codex-history-shared-compat-contract.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md；src/services/codexRolloutCollector/analysisBatchImporter.js:927-998 |
| Branch按明确history_base和物理cut定位父来源，保持独立conversation | discovery.rs仅从显式parent edge扩展辅助catalog且不参与目标head；target_source按物理绑定与ordinal/byte cut读取继承前缀 | 原S3 parent-missing修复、初次单segment拒绝的R1和完整行窗口修复均有CR；独立Rust分支/cut/资源负向通过 |  |  | native/codex-rollout-collector/src/source/discovery.rs:410-478；native/codex-rollout-collector/src/protocol/target_source.rs:978-1015,1645-1683；docs/changes/records/CR-20261007-0219-branch-history-window-repair.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md |
| 保存分支继承与自身新增，不改写原对话 | 跨conversation inherited_cut与同conversation resend分路，不把branch当replace_last_turn；继承按完整行窗口且总预算不放宽 | 自然C22项/4refs包含N全部11项和自身回合；原N不含C新增标记；H2隔离SQL/重开/append/负ACK回归44/44所在两suite |  |  | docs/product/history/maintenance-20261011/TASK832-close-report.md；docs/changes/records/CR-20261007-0245-branch-product-delivery.md；native/codex-rollout-collector/src/protocol/target_source.rs:553-624,896-916 |
| 委派正文保留业务身份、turn、真实正文 | 两种真实carrier→DelegatedInput；native id、turn、namespace精确校验，product role=system；不是普通工具，未伪造call_id/detail | 833原3组委派、双carrier六物理事实与3逻辑项；832原A/D在原持久根40项/9真实工具refs，手机单独验收 |  |  | docs/codex/codex-history-shared-compat-contract.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；native/codex-rollout-collector/src/codex_adapter/mod.rs:1380-1445；src/services/codexRolloutCollector/analysisBatchImporter.js:1793-1813 |
| Rust→Node staging、ACK、complete、产品事务与UTF8跨块正确 | manager StringDecoder utf8在constructor/start/detach按代际重置，stale child先拒绝；importer先两层stage后返回ACK资格，complete绑定durable batch后发布 | 旧代码新UTF8用例2失败1通过，修复后3/3、collector/recovery138/138；原A真实40/9发布与Gateway9详情10页读回，非仅fixture |  |  | src/services/codexRolloutCollector/analyzerProcessManager.js:346,422,785,796-820；src/services/codexRolloutCollector/analysisBatchImporter.js:1900-2080；docs/changes/records/CR-20261008-0045-stdout-utf8-repair.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md |
| 三类手机durable ACK、正文/选定详情、切换与force-stop重开 | historyDetailItemsForUiMessage要求tool: key、同native ID和同turn、真实operation和ref；保留原alias；历史正文/refs既有hash和提交路径不改 | 原指定手机MQS7N19402011743：N11/2、C22/4、A40/9逐行product_db/coverage/ref对照；每类正常/切换/重开选定469/469/552byte详情。A初始STAGED后完成chunk→synced/正ACK，不是首批立即COMMITTED。独立60/60为档案谓词，不是新E2E计数 |  | 本次未操作当前APK或全部9条A详情；它们不属于新增欠交，保持原样本验收限制 | docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md；docs/product/history/maintenance-20261011/TASK832-close-report.md；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt:2681-2694 |
| 来源缺失/歧义/循环/压缩/伪造身份及ACK拒绝，旧canonical保护 | branch cut/压缩/pending-tail/预算仍fail-closed；importer保护当前scope/attempt、durable evidence与完整checkpoint；跨profile append仍拒绝 | 独立Rust12、NodeUTF8 3/history-v2 13/产品5记录支持限定保护；IR832-01确曾复现旧target-v1自动升级增长失败，未修，用户明确排除本版本之前已发布格式迁移 |  | 不把外部源码任意修改、无限输出、多设备或全部竞态变成832新验收 | docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md；docs/product/history/maintenance-20261011/TASK832-close-report.md；docs/codex/codex-history-shared-compat-contract.md；src/services/codexRolloutCollector/index.js:626-637；src/services/codexHistoryReconciliationScheduler.js:166-181 |

#### 版本适用性

- 评估code commit=a78fe55e033bbcb6db816acd2c801de5aa28a081；本次仅阅读/哈希/既有Git diff，零业务实现、测试、构建、设备或新增运行验证。
- 832实际源HEAD488dc6c9，Rust exe f0cd1b37…3ec2e；S6 APK f148028b…dfd6a。原关闭时Android两文件未提交，后续0618cafc收录。当前Rust/Node/Store/provider/测试及规范/fixture共22个可用历史hash匹配；原Windows exe在本checkout缺失，不能声称本机binary复验。
- 当前ViewModel整体hash不同；4d586e0→a78代码diff为连接/IPC错误提示、WS event generation终验及registration修复，historyDetailItemsForUiMessage本身未改。不能沿用旧报告“src/native/android零diff”的旧时点说明；本结论承接原832窄范围，不认证当前APK全部路径。
- 10/13自然大输出约165行截断且缺完整详情入口是另一个更大样本和pipeline/Android阅读范围的反证，不推翻832选定469/469/552byte详情样本，也不声称它已解决。
- CR的draft/TBD和原REQ in_progress是旧提交/追踪事实；不据此回退已完成业务，也未伪造active CR、commit_ref或发布。

#### 实际读取材料

- [AGENTS.md](../../../AGENTS.md)
- [.agents/skills/maintain-project/SKILL.md](../../../.agents/skills/maintain-project/SKILL.md)
- [.workflow-system/WORKFLOW_PROTOCOL.md](../../../.workflow-system/WORKFLOW_PROTOCOL.md)
- [.workflow-system/runtime/support/product-maintenance/references/reconcile.md](../../../.workflow-system/runtime/support/product-maintenance/references/reconcile.md)
- [.workflow-system/runtime/support/product-maintenance/references/binding-contribution.md](../../../.workflow-system/runtime/support/product-maintenance/references/binding-contribution.md)
- [docs/codex/codex-rollout-collector-architecture.md](../../codex/codex-rollout-collector-architecture.md)
- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/product/requirements/REQ-20261005-codex-history-save-repair.md](../requirements/REQ-20261005-codex-history-save-repair.md)
- [docs/product/plans/PLAN-20261005-codex-history-save-repair.md](../plans/PLAN-20261005-codex-history-save-repair.md)
- [docs/codex/codex-history-shared-compat-contract.md](../../codex/codex-history-shared-compat-contract.md)
- [docs/codex/codex-history-product-contract.md](../../codex/codex-history-product-contract.md)
- [docs/product/history/maintenance-20261011/TASK832-close-report.md](../history/maintenance-20261011/TASK832-close-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md](../history/maintenance-20261011/current-assessment-20261012/history-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md](../history/maintenance-20261011/current-assessment-20261012/history-832review-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json](../history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/item-18-evidence.json](../history/maintenance-20261011/current-assessment-20261012/item-18-evidence.json)
- [docs/product/DELIVERY_RECONCILIATION.md](../DELIVERY_RECONCILIATION.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/changes/records/CR-20261007-0245-branch-product-delivery.md](../../changes/records/CR-20261007-0245-branch-product-delivery.md)
- [docs/changes/records/CR-20261007-0900-branch-history-parent.md](../../changes/records/CR-20261007-0900-branch-history-parent.md)
- [docs/changes/records/CR-20261008-0045-stdout-utf8-repair.md](../../changes/records/CR-20261008-0045-stdout-utf8-repair.md)
- [docs/changes/records/CR-20261008-0022-branch-validation-utf8-diagnosis.md](../../changes/records/CR-20261008-0022-branch-validation-utf8-diagnosis.md)
- [docs/changes/records/CR-20261007-1242-live-history-save-validation.md](../../changes/records/CR-20261007-1242-live-history-save-validation.md)
- [docs/changes/records/CR-20261008-0135-android-history-detail-alias.md](../../changes/records/CR-20261008-0135-android-history-detail-alias.md)
- [docs/changes/records/CR-20261007-0219-branch-history-window-repair.md](../../changes/records/CR-20261007-0219-branch-history-window-repair.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md](../history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md)
- [src/services/codexRolloutCollector/analysisBatchImporter.js](../../../src/services/codexRolloutCollector/analysisBatchImporter.js)
- [native/codex-rollout-collector/src/source/discovery.rs](../../../native/codex-rollout-collector/src/source/discovery.rs)
- [native/codex-rollout-collector/src/codex_adapter/mod.rs](../../../native/codex-rollout-collector/src/codex_adapter/mod.rs)
- [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt)
- [src/services/codexRolloutCollector/index.js](../../../src/services/codexRolloutCollector/index.js)
- [src/services/codexHistoryReconciliationScheduler.js](../../../src/services/codexHistoryReconciliationScheduler.js)

### 剩余与待核对

- 原采纳三类样本范围未识别尚欠实施；保持原失败与IR832-01排除前提。
- 更广大详情入口、older和竞态须在HISTORY-PIPELINE/HISTORY-ANDROID中推进，不能用重跑832三个小样本替代。
- 若要宣称当前APK完整回归或发布，另按实际授权核对版本/设备；本次不新增此门禁。

依赖与排序依据：

- id：REQ-20261005-codex-history-shared-compat；role：H1/H3共享实现前置，已读实装与隔离交付；不代表H2或手机
- id：REQ-TERMLINK-HISTORY-PIPELINE；role：本项是三类专项修复的局部贡献，不能自动使父层satisfied

尚未核对/不可得材料：

- 未重取原私有DB、所有UI图片或全部原wire；使用保留原S6报告及独立核对报告，不冒称本次原设备复验。
- 未逐行审计所有Rust/Android历史路径；本次读本文列出的关键函数、真实原报告、全部832相关7份CR及差异。

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-17] 委派输入与正常历史增长的最小共享兼容修复

<a id="AS-CURRENT-20261014-17"></a>

### 覆盖范围

需求：[REQ-20261005-codex-history-shared-compat](../MANAGED_REQUIREMENTS.md#REQ-20261005-codex-history-shared-compat)。本轮完整重评 REQ-20261005-codex-history-shared-compat 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。833已实际执行S2 Spike→formal wire、S3 Rust、S4 Node及S4-R1修复、S5真实Rust/Node/File/临时SQLite/provider验收。原S5报告和独立832累计复核、当前核心源码均可读；开始与交付不由closed推出。

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| Spike先验证并提升同一最小vendor closure | formal vendor-manifest固定upstream5ee6baee及最小local_patches、相对path closure，wire facade未改成第二套模型 | S2原wire正负、parity/promotion记载；后续真实formal默认构建与39/5/73、43/43在原进程通过 |  | 原独立vendor离线依赖失败保留，不能改写为全环境离线构建PASS；它不证明正式default graph失败 | docs/changes/records/CR-20261005-1901-shared-history-wire-compat.md；native/codex-rollout-collector/vendor/codex/vendor-manifest.toml；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md |
| 两实际carrier的DelegatedInput正确身份/正文/turn | Adapter精确name/namespace/id/text/物理thread与turn校验；event_type owned，item_key delegated-input:nativeId | 原脱敏13行3组委派字节保留；产品system正文、id/turn/body已逐项读回，不给委派造call_id |  |  | docs/codex/codex-history-shared-compat-contract.md；native/codex-rollout-collector/src/codex_adapter/mod.rs:1380-1445；src/services/codexRolloutCollector/analyzerProtocol.js:651-671；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md |
| 单/双carrier、overlap、retry、restart幂等；冲突partial | AnalysisReducer按同item id、tool、namespace、text、conversation、turn、source_identity确认等价，物理event仍不可变，response_item稳定代表 | S3/4反序与restart/overlap、同id冲突有真实回归；S5停collector重开store后无重复正文/详情 |  |  | native/codex-rollout-collector/src/analysis.rs:1125-1222；src/services/codexRolloutCollector/analysisBatchImporter.js:921-945,1081-1090；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md |
| G1同轮开始→完成包括canonical同级；G2仅等价来源规范化 | isHistoryObservationUpdate限制upsert_item与target-v2，证明不可变旧开始/真实完成/同scope与顺序；G2仅delegatedEquivalent | 原S4 canonical与partial正向、S4-R1堵住completeness提升短路；独立Node history-v2 13及产品5确认限定路径 |  |  | src/services/codexRolloutCollector/analysisBatchImporter.js:953-998,1062-1080；docs/changes/records/CR-20261006-1846-history-promotion-proof-repair.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md |
| full重见旧开始与durable prefix连续delta分别证明，不以turn终态当snapshot完整性 | full路径同旧事件重见且range包含；delta需verified durable receipt、首新ref不越旧range且无gap/Unknown/availability异常；运行中canonical可成立 | S5 H1 full/backfill与append分别先存运行中prefix再真实completion，读回一个逻辑turn/两物理事实；不合格同位置/倒序/ParseGap拒绝 |  |  | docs/codex/codex-history-shared-compat-contract.md；src/services/codexRolloutCollector/analysisBatchImporter.js:974-998；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md |
| hello交集/profile与旧consumer/checkpoint/ParseGap/未结算delivery兼容 | history_semantics_v2/target-v2受协商；新普通backfill独立job置空四恢复字段，旧job profile/delivery保留；跨profile append fail-closed | 原S4非空target-v1 cursor本地保留、新job四空真实读回、旧profile原payload重交付；能力组合及Node schema严格验证 |  | IR832-01自动scheduler旧已发布格式升级不是已修复；排除限于本版本前产品数据，未结算交付保护仍在 | docs/codex/codex-history-shared-compat-contract.md；src/services/codexRolloutCollector/index.js:611-650；src/services/codexRolloutCollector/analyzerProtocol.js:1808-1850；docs/changes/records/CR-20261006-0200-shared-history-node-consumer.md |
| 篡改、倒退、错scope/旧attempt/canonical降级、跨profile拒绝且不删旧job/receipt | 物理event逐字段冲突检查早于mutation；durableMutationProof验证receipt；completeness不能替代G1/G2关系 | 原S4-R1保留red→green；S5普通hash/委派text注入实际负ACK、无complete；SQL INSERT失败实际ROLLBACK、旧canonical/checkpoint重开不变 |  |  | src/services/codexRolloutCollector/analysisBatchImporter.js:927-998,1000-1090；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md；docs/changes/records/CR-20261006-1846-history-promotion-proof-repair.md |
| actual Rust→Node→durable staging ACK complete产品事务及provider重开 | 当前importer/Store真实stage/publish路径存在，system角色只在product row生成；checkpoint/staging不混进业务DTO | 原S5两suite43/43：真实SQL staging COMMIT→新store可读→实际ACK→Rust complete→product COMMIT，H1/H3分别重开；普通工具为独立synthetic真实tool，不冒充委派工具 |  |  | docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md；docs/changes/records/CR-20261006-2016-history-product-delivery.md；src/services/codexRolloutCollector/analysisBatchImporter.js:1900-2080；docs/codex/codex-history-product-contract.md |

#### 版本适用性

- 精确当前a78fe55；833 S5原源f2fc146d，Rust binary16d5a685…b06f；832独立累计审查源488dc6c9及binary f0cd1b37…3ec2e在后续版本重新覆盖相关v2/产品场景。
- 本次历史hash对照显示核心Rust六文件、Node模块/Store/provider/测试等18文件一致，另fixture/规范一致；未重新运行Rust、Node或SQLite业务验证。当前Android变化与本项隔离范围无关。
- 原S5实现自检与随后同代理review不冒充独立；额外832累计审查明确为独立审查。43/43是原报告运行结果，不是本次新测试数量。
- 旧PLAN的S5 pending和832 active是历史时点；fresh task-status与原close事件证明后来closed，但交付结论仍取真实报告。

#### 实际读取材料

- [AGENTS.md](../../../AGENTS.md)
- [.agents/skills/maintain-project/SKILL.md](../../../.agents/skills/maintain-project/SKILL.md)
- [.workflow-system/WORKFLOW_PROTOCOL.md](../../../.workflow-system/WORKFLOW_PROTOCOL.md)
- [.workflow-system/runtime/support/product-maintenance/references/reconcile.md](../../../.workflow-system/runtime/support/product-maintenance/references/reconcile.md)
- [.workflow-system/runtime/support/product-maintenance/references/binding-contribution.md](../../../.workflow-system/runtime/support/product-maintenance/references/binding-contribution.md)
- [docs/codex/codex-rollout-collector-architecture.md](../../codex/codex-rollout-collector-architecture.md)
- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/product/requirements/REQ-20261005-codex-history-shared-compat.md](../requirements/REQ-20261005-codex-history-shared-compat.md)
- [docs/product/plans/PLAN-20261005-codex-history-shared-compat.md](../plans/PLAN-20261005-codex-history-shared-compat.md)
- [docs/codex/codex-history-shared-compat-contract.md](../../codex/codex-history-shared-compat-contract.md)
- [docs/codex/codex-history-product-contract.md](../../codex/codex-history-product-contract.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md](../history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md](../history/maintenance-20261011/current-assessment-20261012/history-832review-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/item-19-evidence.json](../history/maintenance-20261011/current-assessment-20261012/item-19-evidence.json)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json](../history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json)
- [.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json](../../../.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json)
- [docs/changes/records/CR-20261005-1521-shared-history-compat-design.md](../../changes/records/CR-20261005-1521-shared-history-compat-design.md)
- [docs/changes/records/CR-20261005-1901-shared-history-wire-compat.md](../../changes/records/CR-20261005-1901-shared-history-wire-compat.md)
- [docs/changes/records/CR-20261006-1846-history-promotion-proof-repair.md](../../changes/records/CR-20261006-1846-history-promotion-proof-repair.md)
- [docs/changes/records/CR-20261005-1722-shared-history-compat-design-repair.md](../../changes/records/CR-20261005-1722-shared-history-compat-design-repair.md)
- [docs/changes/records/CR-20261006-2016-history-product-delivery.md](../../changes/records/CR-20261006-2016-history-product-delivery.md)
- [docs/changes/records/CR-20261006-0200-shared-history-node-consumer.md](../../changes/records/CR-20261006-0200-shared-history-node-consumer.md)
- [docs/changes/records/CR-20261006-0010-shared-history-rust-semantics.md](../../changes/records/CR-20261006-0010-shared-history-rust-semantics.md)
- [native/codex-rollout-collector/vendor/codex/vendor-manifest.toml](../../../native/codex-rollout-collector/vendor/codex/vendor-manifest.toml)
- [native/codex-rollout-collector/src/codex_adapter/mod.rs](../../../native/codex-rollout-collector/src/codex_adapter/mod.rs)
- [src/services/codexRolloutCollector/analyzerProtocol.js](../../../src/services/codexRolloutCollector/analyzerProtocol.js)
- [native/codex-rollout-collector/src/analysis.rs](../../../native/codex-rollout-collector/src/analysis.rs)
- [src/services/codexRolloutCollector/analysisBatchImporter.js](../../../src/services/codexRolloutCollector/analysisBatchImporter.js)
- [src/services/codexRolloutCollector/index.js](../../../src/services/codexRolloutCollector/index.js)

归档记录定位（index中的record摘要及pack块定位，非新执行结果）：

- index_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json；record_index：309；logical_ref：.workflow-system/records/events/key-ab2831b4bfe6fc017ff681204a3c80c98b0216a9dd0dfa09f10941a255856861.json；record_sha256：2ff52d93fc480911b12401674a8e790c5e5d07f47d5f3f408d6d9f414ddb9348；pack_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin；chunks：offset：1123752；length：2691；headerLength：420；rawOffset：0；rawLength：10006；sha256：2ff52d93fc480911b12401674a8e790c5e5d07f47d5f3f408d6d9f414ddb9348；compressedSha256：3dfd83893b340aa8b1a55612260d28f663cc5d9877880742629d9acf042e270d

### 剩余与待核对

- 原8项隔离范围内未识别欠交；不添加分支/真机作为833的欠交。
- 保持当前版本与未结算旧job保护；若未来明确要求迁移旧已发布target-v1产品数据，需要单独采纳与修复真实scheduler入口，不能声称原finding已修。

依赖与排序依据：

- id：REQ-20261005-codex-history-save-repair；role：后续自然宿主/Branch/手机验收承接；不反向成为本项缺口
- id：REQ-TERMLINK-HISTORY-PIPELINE；role：只贡献委派和正常增长兼容，不认证完整生命周期矩阵

尚未核对/不可得材料：

- 未逐行审计所有vendor源码及所有fixture，未本机重建原binary；保留原S2独立vendor离线失败。
- 未复取原临时SQLite/完整协议trace，读保留完整S5原报告、后续独立审查和当前关键函数/精确哈希；不扩大为全环境认证。

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-18] 远程终端与会话核心基线

<a id="AS-CURRENT-20261014-18"></a>

### 覆盖范围

需求：[REQ-TERMLINK-CORE-TERMINAL](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CORE-TERMINAL)。本轮完整重评 REQ-TERMLINK-CORE-TERMINAL 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。既有PTY/WS/session实现和60618刷新修复真实存在，JOINT真实浏览器PTY/续接通过；Android首输入污染反例及终端Wi-Fi恢复失败仍适用。元数据也已有Store/恢复代码。

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 已移至独立要求 [REQ-TERMLINK-TERMINAL-IO](#REQ-TERMLINK-TERMINAL-IO)；原功能1的完整定义以该项为准。 具体义务：**终端输入与输出**：浏览器及Android终端通过既有WebSocket将用户输入交给PTY并显示远端输出。 | browser/Android WS输入到PTY并回显 | JOINT#20 browser IO正确；Android首Write-Output被设备应答[?1;2c污染导致ParserError | 修复Android首次输入设备应答污染 | 不能外推所有终端/OEM都失败 | docs/product/assessments/JOINT-20261013.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json |
| 已移至独立要求 [REQ-TERMLINK-TERMINAL-IO](#REQ-TERMLINK-TERMINAL-IO)；原功能2的完整定义以该项为准。 具体义务：**尺寸适配**：客户端fit/resize传递终端行列，窗口变化后沿原尺寸协商使用。 | 终端fit/resize沿既有行列传递 | JulyWebUX与JOINT浏览器resize/fit样本；Android终端实际可见 | 未据该功能证据确认额外业务欠交 | Android各窗口尺寸完整矩阵未核，原契约不加新压力门槛 | docs/product/assessments/JOINT-20261013.md；docs/product/assessments/ANDROID-20261013.md；TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md；docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md；src/services/sessionManager.js；src/repositories/sessionStore.js；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/workflow/DECISIONS.md |
| 已移至独立要求 [REQ-TERMLINK-SESSION-MANAGEMENT](#REQ-TERMLINK-SESSION-MANAGEMENT)；原功能3的完整定义以该项为准。 具体义务：**会话基本管理**：创建、列出、重命名、删除和选择终端会话，保留会话模式、名称和路径等已有元数据。 | session创建/列出/选择/重命名/delete及metadata现实现 | JOINT#20/#22 browser创建切换通过；缓存原34/34覆盖AndroidCRUD | 无已知此子行为欠交 | 服务重启metadata恢复独立义务见下补充，不误认为PTY跨重启 | docs/product/assessments/JOINT-20261013.md；docs/product/assessments/ANDROID-20261013.md；TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md；docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md；src/services/sessionManager.js；src/repositories/sessionStore.js；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/workflow/DECISIONS.md |
| 已移至独立要求 [REQ-TERMLINK-TERMINAL-REFRESH](#REQ-TERMLINK-TERMINAL-REFRESH)；原功能4的完整定义以该项为准。 具体义务：**已有页面刷新复用**：刷新已有终端页使用有效sessionId继续原会话，不无谓新增会话。 | 有效sessionId页面refresh保持原会话；嵌入Codex无ID不抢先连 | TASK60618浏览器刷新计数10->10/2->2；JOINT#20实际同PID变量保持 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/product/assessments/JOINT-20261013.md；docs/product/assessments/ANDROID-20261013.md；TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md；docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md；src/services/sessionManager.js；src/repositories/sessionStore.js；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/workflow/DECISIONS.md |
| 已移至独立要求 [REQ-TERMLINK-TERMINAL-REFRESH](#REQ-TERMLINK-TERMINAL-REFRESH)；原功能5的完整定义以该项为准。 具体义务：**首次进入创建**：没有sessionId的首次进入按既有规则创建，不混同无效显式ID的错误。 | 首次无ID创建，显式无效ID拒绝不混同 | 原CR-0023 6/6；TASK60618只修startup顺序、用户明确跳过目标定点自动化 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | docs/product/assessments/JOINT-20261013.md；docs/product/assessments/ANDROID-20261013.md；TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md；docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md；src/services/sessionManager.js；src/repositories/sessionStore.js；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/workflow/DECISIONS.md |
| **连接与状态反馈**：显示连接、等待、断开及错误，并支持用户重连/断开操作。 | 连接/等待/错误可见及重连/断开按钮存在 | JOINT/ANDROID有真实连接；ANDROID终端Wi-Fi恢复实测未回原ready | 沿终端重连/输入路径处理当前明确失败；868只修Codex提示不消除此反例 | 无新增未知；仍限所述报告对象与样本 | docs/product/assessments/JOINT-20261013.md；docs/product/assessments/ANDROID-20261013.md；TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md；docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md；src/services/sessionManager.js；src/repositories/sessionStore.js；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/workflow/DECISIONS.md |
| **访问认证**：沿已有Basic/browser session及WebSocket ticket边界访问；保留与会话续接、快捷输入需求的共享功能，不承诺PTY跨服务重启连续。 | 既有Basic/browser-session与single-use WS ticket边界 | JOINT浏览器登录/PTY路径；868 actual registration未知/撤销拒绝23网络检查与46/46 | 不把局部registration修复当整个AUTH/CORE闭合 | TLS/mTLS/所有credential组合另在原安全需求，不新推全链PASS | docs/product/assessments/JOINT-20261013.md；docs/product/assessments/ANDROID-20261013.md；TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md；docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md；src/services/sessionManager.js；src/repositories/sessionStore.js；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/workflow/DECISIONS.md |
| REQ-TERMLINK-SESSION-METADATA-RECOVERY：服务重启后已持久会话元数据可恢复；不保证PTY上下文 | SessionStore v3 loadSync/save(tmp rename)/saveSync；SessionManager构造load、调度flush并恢复IDLE，exit持久化钩子已有 | 本轮静态实现可定位，尚未定位实际服务重启独立结果 | 无据此确认尚未实现 | 运行重启恢复验收未知，单项undetermined | src/repositories/sessionStore.js；src/services/sessionManager.js；docs/workflow/DECISIONS.md；docs/product/MANAGED_REQUIREMENTS.md |

#### 版本适用性

- ANDROID/JOINT-20261013运行对象为4d586e0f2dab1fef9d2c273b770796b63a7d873d及报告工作区、APK F148028B15FA3A8DFFE63CA483BCDA5A1CE9764BBDE817E68A357598D25DFD6A；不冒称本轮新跑。静态4d586e..a78fe55产品差异仅4个Codex Kotlin文件与clientRegistrationManager；未触及的终端/工作区具体反例仍适用，Codex逐行为检查868范围。
- TASK-20260868历史对象为4d586e+修复工作区，S3 APK d64a7cd8125daf121782f592e0ff56c3ef3237b7cd0a5acc48eecaa0e44b2e13。S3 source-manifest 13文件SHA与a78fe55完全相同（外部repair-manifest-comparison.json），src/server.js另核ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6亦相同。只承接连接/IPC失效提示清理及registration拒绝的原断言，不扩展原整REQ。
- 60618目标自动测试是用户明确跳过，旧12/12非针对该修复；只承接真实浏览器计数样本
- 服务重启metadata恢复与PTY连续性不同；原P0.3仍current并已启动

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md](../../../TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md)
- [docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md](../../changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md)
- [TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)
- [docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md](../../changes/records/CR-20260325-2219-sessions-closeout-validation.md)
- [src/services/sessionManager.js](../../../src/services/sessionManager.js)
- [src/repositories/sessionStore.js](../../../src/repositories/sessionStore.js)
- [docs/product/history/maintenance-20261011/task20260868-s2/report.md](../history/maintenance-20261011/task20260868-s2/report.md)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)
- [docs/workflow/DECISIONS.md](../../workflow/DECISIONS.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json](../history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json)

### 剩余与待核对

- 排序P1：Android首输入污染与终端Wi-Fi恢复；P2：单独核P0.3 metadata重启证据，不能重造或与PTY跨重启混同

依赖与排序依据：

- TERMINAL-IO/REFRESH与SESSION-MANAGEMENT共同能力
- session metadata恢复已有AD001/Store实现，非依赖新PTY持久化

尚未核对/不可得材料：

- 服务重启metadata原独立运行报告
- 终端Wi-Fi恢复准确失败原因
- 所有resize/认证组合

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-19] 跨平台发行安装与证书工具基线

<a id="AS-CURRENT-20261014-19"></a>

### 覆盖范围

需求：[REQ-TERMLINK-RELEASE-BASELINE](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-RELEASE-BASELINE)。本轮完整重评 REQ-TERMLINK-RELEASE-BASELINE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。TASK60513 May发行安装工具已交付且用户5/17确认WinPM2/Linuxsystemd冒烟；JulyWindows x64内置Node/配置工具实现存在。只余部分发布目标证据，不是未启动。

结论：**undetermined**。实现标记 delivered-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| **源码发行打包**：按allowlist生成Windows/Linux可解包发行布局及构建说明。 | allowlist构建Windows/Linux发行布局与说明 | May30/30+99/99，包内HTTP/mTLS health通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md；docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/product/assessments/JOINT-20261013.md |
| **安装配置**：使用安装配置控制端口、认证、目录、transport和是否自启。 | 安装config表达端口/auth/目录/transport/autostart | May配置自动化及包内smoke通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md；docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/product/assessments/JOINT-20261013.md |
| **Windows服务基线**：五月发行通过PM2 fork启动及管理，开机自启沿当时安装脚本。 | 五月Windows PM2 fork服务管理 | 5/17原用户宿主smoke确认通过；不能替代七月ScheduledTask增量 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md；docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/product/assessments/JOINT-20261013.md |
| **Linux服务基线**：systemd安装、启动、停止、移除和健康检查沿五月基线。 | 五月Linux systemd安装/start/stop/remove/health | 5/17用户宿主smoke确认；七月复杂installer另独立范围 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md；docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/product/assessments/JOINT-20261013.md |
| **自启开关**：显式启用/关闭自启，配置用法和运行入口在README/部署指南说明。 | 自启显式开关与README/部署入口 | May原任务交付及Windows/Linux宿主确认；July当前用户ScheduledTask更替说明 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md；docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/product/assessments/JOINT-20261013.md |
| **Direct证书工具**：服务端自管mTLS生成/配置CA、server和client凭据，并执行对应健康检查。 | direct CA/server/client生成、配置和mTLS health | May证书工具与发行包真实mTLS health通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md；docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/product/assessments/JOINT-20261013.md |
| **Nginx证书工具**：为Nginx侧mTLS生成所需凭据与部署说明，OpenSSL缺失明确失败。 | Nginx侧证书与部署输出，缺OpenSSL明确失败 | May工具测试/文档交付；不等于七月Nginx全安装线上认证 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md；docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/product/assessments/JOINT-20261013.md |
| **Windows x64发行增量**：七月Setup/Portable内置Node，提供共享PowerShell配置核心、CLI/GUI、进程身份校验与当前用户Scheduled Task自启；区别于五月PM2基线。 | 七月Setup/Portable内置Node；共享PS core/CLI/GUI、PID启动时间/路径身份、per-user ScheduledTask | 原技术细节与局部build/smoke/审查收口；JOINT#21/#32未执行clean-host | 无已知明确业务缺陷；F001-004已修复不能重列 | 未装Node/npm干净Windows主机验收尚未完成且用户10/13明确暂不判定 | TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md；docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/product/assessments/JOINT-20261013.md |
| **Windows本地配置与证书**：七月配置、日志、数据和证书位于persistent，提供启停/重启/健康检查与本地mTLS生成；clean-host结果仍按原未完成验收保留。 | persistent config/data/log/certs与start/stop/restart/health、本地证书生成 | 七月本地实现/自动验证记录 | 保留用户暂缓的clean-host验证，不自动排执行 | 当前clean-host健康/证书全链验收未定 | TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md；docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/product/assessments/JOINT-20261013.md |

#### 版本适用性

- May/July分阶段交付，May宿主通过不能证明July自包含包；July本地通过不冒称clean-host
- JOINT10/13用户明确：需要未安装Node/npm环境的需求先不进行判定；这属于延后验证，不是未实现或新的修复任务

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md](../../../TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md)
- [docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md](../../workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md)
- [TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)

### 剩余与待核对

- 排序：发行clean-host项按用户暂缓保留，不自动启动验证；先承接本地已过范围和已修F001-004

依赖与排序依据：

- Windows干净无Node/npm环境仅原验证前置且当前暂缓
- 五月PM2/七月ScheduledTask是版本边界，不能相互替代

尚未核对/不可得材料：

- 七月Setup/Portable clean-host实际结果
- 当前全部打包白名单/二进制供应链逐文件对比

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-20] 浏览器安全登录与终端交互体验

<a id="AS-CURRENT-20261014-20"></a>

### 覆盖范围

需求：[REQ-TERMLINK-WEB-UX](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-WEB-UX)。本轮完整重评 REQ-TERMLINK-WEB-UX 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。TASK60715-002九步WebUX与60615/60616/60617及60716真实数据整合有实现/报告；JOINT浏览器登录/创建/输入/刷新成功，但Codex文档入口明确CannotGET。

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 已移至独立要求 [REQ-TERMLINK-BROWSER-LOGIN](#REQ-TERMLINK-BROWSER-LOGIN)；原功能1的完整定义以该项为准。 具体义务：**浏览器登录**：独立登录表单显示校验、loading/error，并在成功后安全返回原目标页。 | 独立login表单校验/loading/error、安全returnTo | July111/111和Edge150 1440/768/390实际登录通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；docs/product/assessments/JOINT-20261013.md；docs/workflow/CONTRACTS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| 已移至独立要求 [REQ-TERMLINK-BROWSER-LOGIN](#REQ-TERMLINK-BROWSER-LOGIN)；原功能2的完整定义以该项为准。 具体义务：**浏览器会话与登出**：短期HttpOnly/SameSite=Strict Cookie，TLS下带Secure；登出撤销会话，密码/token不写入URL或localStorage。 | 短期HttpOnly/SameSiteStrict，TLS Secure，logout撤销；无URL/localStorage密码 | 原WebUX认证定向与真实浏览器通过 | 未据该功能证据确认额外业务欠交 | 本批未逐行审当前所有auth模块；868registration只是叠加局部 | TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；docs/product/assessments/JOINT-20261013.md；docs/workflow/CONTRACTS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **配置与会话反馈**：配置按任务分组，保存/校验/危险操作反馈明确，支持原会话管理操作。 | 按组config、save/validation/danger状态与会话操作 | July九步与JOINT#22创建/切换实际通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；docs/product/assessments/JOINT-20261013.md；docs/workflow/CONTRACTS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **终端为主的工作区**：终端占主要区域，连接状态、会话、重连/断开、全屏/fit和辅助输入按已有入口展示。 | terminal-first布局、连接状态、重连/断开/fit/fullscreen入口 | JulyEdge宽/窄屏通过；JOINT#20实际PTY+refresh上下文通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；docs/product/assessments/JOINT-20261013.md；docs/workflow/CONTRACTS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **焦点与高频输入**：进入页面、复制粘贴、快捷键、窗口fit及触摸输入协调，保留原terminal协议。 | focus/copy/paste/keys/resize/touch沿原输入协议 | July焦点reconnect等样本通过；Android单Ctrl反例另输入父项不扩到所有browser | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；docs/product/assessments/JOINT-20261013.md；docs/workflow/CONTRACTS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **共享视觉与可访问操作**：页面颜色、表单、按钮、状态、焦点、空/错误态及reduced-motion按七月交付统一，并适配窄屏。 | 共享colors/forms/buttons/focus/empty/error/reducedmotion | July响应式/标签/对比度/减动画通过 | 未据该功能证据确认额外业务欠交 | 不是全产品无障碍认证，未逐个页面自动测全部规则 | TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；docs/product/assessments/JOINT-20261013.md；docs/workflow/CONTRACTS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **主页Codex导航**：六月主页支持Codex入口及创建、浏览、跳转，沿已有会话参数进入对应页面。 | 主页terminal drawer统一Codex创建/列表/入口，当前端实际可达 | JOINT#22新建切换成功；Codex文档按钮请求/docs/workflow/STATUS.md得到CannotGET；60617-001原验收1明确文档图标/既有功能可用，故此不是源码反推的新功能 | 修复实际文档入口与workspace目标路由 | 60616任务头称五步完成但尾执行仅到decompose，具体全部旧阶段不能只靠标签PASS | TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；docs/product/assessments/JOINT-20261013.md；docs/workflow/CONTRACTS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；TASKS/TASK-20260617-001-web-codex-session-android-redesign.md |
| **Web Codex Surface**：已有IPC feed经gateway显示正文、状态、审批/PLAN，并以follower提交对应动作。 | Web IPC feed/gateway显示surface状态approval/Plan，followeraction | TASK60615-002四conversation/87item、189/189；JOINT#16双订阅及手机filecontext在Web显示 | 无据浏览器仅开始发送画面判实际发送失败 | 完整浏览器send返回/serverresult、真实外部Owner端到端尚未确认 | TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；docs/product/assessments/JOINT-20261013.md；docs/workflow/CONTRACTS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **配置数据与单一路径**：模型、推理、权限读真实配置/catalog，头部显示一份实际PATH，避免硬编码选项和重复路径。 | model/reasoning/permission真实catalog/owner，单PATH | TASK60716-002 123/123、125/125、Edge3020检查通过；JOINT#22实际PATH/config可见 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；docs/product/assessments/JOINT-20261013.md；docs/workflow/CONTRACTS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| **既有能力兼容**：Basic/API认证、single-use WS ticket、session/workspace和IPC权威继续使用原契约；原样本验证不扩为全产品UX认证。 | Basic/API/ticket/session/workspace/IPC边界沿原契约 | July既有窄门禁及JOINT业务样本；868保registration有效/legacy正常 | 未据该功能证据确认额外业务欠交 | 完整跨端/所有认证组合未证明，不扩为全产品UX认证 | TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md；TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md；docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md；docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md；docs/product/assessments/JOINT-20261013.md；docs/workflow/CONTRACTS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |

#### 版本适用性

- 历史报告按原提交/设备/范围承接；本轮仅阅读及静态比对，无新增测试/构建/运行验证
- ANDROID/JOINT-20261013运行对象为4d586e0f2dab1fef9d2c273b770796b63a7d873d及报告工作区、APK F148028B15FA3A8DFFE63CA483BCDA5A1CE9764BBDE817E68A357598D25DFD6A；不冒称本轮新跑。静态4d586e..a78fe55产品差异仅4个Codex Kotlin文件与clientRegistrationManager；未触及的终端/工作区具体反例仍适用，Codex逐行为检查868范围。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)
- [TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md](../../../TASKS/TASK-20260616-001-web-session-management-home-and-codex-integration.md)
- [TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md](../../../TASKS/TASK-20260615-002-web-codex-ipc-realtime-sync-page.md)
- [docs/workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md](../../workflow/TASKS/TASK-20260716-002-fix-web-codex-reasoning-permissions-data.md)
- [docs/workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md](../../workflow/TASKS/20260617-002-web-codex-session-ipc-first-data-routing.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/workflow/CONTRACTS.md](../../workflow/CONTRACTS.md)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)
- [TASKS/TASK-20260617-001-web-codex-session-android-redesign.md](../../../TASKS/TASK-20260617-001-web-codex-session-android-redesign.md)

### 剩余与待核对

- 排序P1/P2：先修Codex Docs实际路由；接着核Web follower发送真实server结果/外部Owner，不用布局测试替代业务闭环

依赖与排序依据：

- WORKSPACE现有入口与session根路径
- CODEX follower authority；无需新平行主页

尚未核对/不可得材料：

- 60616最终五步独立执行/运行结果
- Web发送server端结果及真实Desktop/VSCode双端
- 全局a11y矩阵非新增义务

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-21] 持久诊断日志与问题取证

<a id="AS-CURRENT-20261014-21"></a>

### 覆盖范围

需求：[REQ-TERMLINK-DIAGNOSTICS](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-DIAGNOSTICS)。本轮完整重评 REQ-TERMLINK-DIAGNOSTICS 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。TASK60726-002 final e9f2a6e实际持久logger/collector；原定向与真实install-r保持日志/采集smoke通过，当前logger/collector代码可读。

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| **Android持久日志**：在私有diagnostics目录保存结构化JSONL滚动日志，更新APK后保留；Debug默认启用、Release按开关启用。 | Android私有files/diagnostics JSONL，2MiB*5约10MiB，Debug默认/Releaseflag | 原install-r连续升级后文件/尾记录保持；JVM/build通过 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md；src/services/diagnosticLog.js；android/app/src/main/java/com/termlink/app/util/PersistentDiagnosticLog.kt；scripts/diagnostics/collect-known-issue-logs.ps1 |
| **服务端持久日志**：开发服务保存受容量限制的JSONL日志，生产由环境配置显式启用。 | Node JSONL10MiB*5约50MiB，dev默认/prod环境显式开 | 原logger/IPC/capacity定向通过；当前DiagnosticLog configure/init/rotate实码 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md；src/services/diagnosticLog.js；android/app/src/main/java/com/termlink/app/util/PersistentDiagnosticLog.kt；scripts/diagnostics/collect-known-issue-logs.ps1 |
| **WebView关联事件**：WebView与Android/Node生命周期及连接事件沿现有诊断链路关联。 | WebViewConsole及Android/Node共同事件字段关联 | 原任务交付采集关联链，collector保app/server原日志与timeline | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md；src/services/diagnosticLog.js；android/app/src/main/java/com/termlink/app/util/PersistentDiagnosticLog.kt；scripts/diagnostics/collect-known-issue-logs.ps1 |
| **异常与状态观察**：记录未捕获异常、主线程watchdog、Activity/WS/Service、Sessions、IPC/owner和通知等既有入口。 | uncaught/watchdog/Activity/WS/Service/Sessions/IPC/通知event既有入口 | 原task定向门禁+设备持久验证；当前Android logger安装uncaught入口可见 | 无据此宣称九类业务问题修复 | 各事件事故自然发生不是原交付必需新矩阵 | TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md；src/services/diagnosticLog.js；android/app/src/main/java/com/termlink/app/util/PersistentDiagnosticLog.kt；scripts/diagnostics/collect-known-issue-logs.ps1 |
| **隐私与容量**：不记录prompt、命令正文、终端输出、附件或认证/证书密码，保留脱敏、滚动和容量策略。 | sensitive-key及文本脱敏、hash关联、容量轮转，不采prompt/command/output等正文 | 原logger tests通过；当前Node/Android敏感字段正则及aggregate白名单可见 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md；src/services/diagnosticLog.js；android/app/src/main/java/com/termlink/app/util/PersistentDiagnosticLog.kt；scripts/diagnostics/collect-known-issue-logs.ps1 |
| **采集与Timeline**：ADB/服务端脚本输出manifest、原始日志和合并timeline供原九类问题取证。 | collect-known-issue-logs输出manifest、原始JSONL/logcat和按ts合并timeline | 原collector smoke明确三类输出成功；当前PS脚本静态一致 | 未据该功能证据确认额外业务欠交 | 无新增未知；仍限所述报告对象与样本 | TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md；src/services/diagnosticLog.js；android/app/src/main/java/com/termlink/app/util/PersistentDiagnosticLog.kt；scripts/diagnostics/collect-known-issue-logs.ps1 |
| **失败不阻断**：日志失败fail-open，诊断功能不改变业务或IPC authority；取证能力不等于九类问题已修复。 | 初始化/写入/轮转异常捕获保持fail-open，不改变authority | 原task明确无协议/业务变更；当前logger catch保护 | 无已知当前诊断范围欠交 | 原全npm124秒无输出超时保留，不能宣传全套通过 | TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md；src/services/diagnosticLog.js；android/app/src/main/java/com/termlink/app/util/PersistentDiagnosticLog.kt；scripts/diagnostics/collect-known-issue-logs.ps1 |

#### 版本适用性

- 原交付e9f2a6e314b452d10ce40e39fc579a89facd9314→a78fe55静态diff已完整读取两logger及collector，非只比较10/13之后。
- 后续变更集中于52fa9b5336ec11b0949d6bb00592085c3fc8e33b：Android/Node加入不可逆短hash和仅计数/类型/长度等aggregate白名单；Androiduncaught最多等待writer队列500ms且runCatching保护；collector增加显式adb Serial与manifest deviceSerial。路径、JSONL结构、持久私有目录、开关、容量/轮转、正文敏感字段清除、写入异常保护及原始日志+timeline输出算法保持。
- 可据原install-r/collector-smoke加当前核心语义保持承接原持久/容量/采集契约；新增hash/aggregate与崩溃flush只作当前实现说明，不冒称它们有e9f2a6e原设备认证；全npm124秒超时仍保留。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md](../../../TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md)
- [src/services/diagnosticLog.js](../../../src/services/diagnosticLog.js)
- [android/app/src/main/java/com/termlink/app/util/PersistentDiagnosticLog.kt](../../../android/app/src/main/java/com/termlink/app/util/PersistentDiagnosticLog.kt)
- [scripts/diagnostics/collect-known-issue-logs.ps1](../../../scripts/diagnostics/collect-known-issue-logs.ps1)

静态版本桥细节：

- from_commit：e9f2a6e314b452d10ce40e39fc579a89facd9314；to_commit：a78fe55e033bbcb6db816acd2c801de5aa28a081；method：read-only git show/git diff; no runtime validation；files：path：src/services/diagnosticLog.js；from_sha256：9706fcf2463856760d98ed6ba6877810a54f89315860398b11f2ab50b53bf7ff；to_sha256：1e38e1698d5c7982abdb80836f807d4d05660ffc9e8a7060a3e2fbba5413d102；byte_identical：False；path：android/app/src/main/java/com/termlink/app/util/PersistentDiagnosticLog.kt；from_sha256：9fc1598524732527b789f7b9b8b1116a40ed8446a538b9e65508bf6957f9f0c4；to_sha256：c14d654332ee2eb6ba35dbae1da84c837cdebc26a386882d9600ba4aba446930；byte_identical：False；path：scripts/diagnostics/collect-known-issue-logs.ps1；from_sha256：1837fc5c9c70fffaae9ff24da2bb85f771ef610627d74eecf6917adf4f43eed3；to_sha256：b323084dfb5b092f338e78d6283aea1cc069c30109e936bf018ab74d5c2eedde；byte_identical：False

### 剩余与待核对

- 无已知诊断功能欠交；业务问题继续用既有取证链定位，勿将九类观察改成九项已修声明

依赖与排序依据：

- App私有数据保留的原install-r更新条件；卸载清数据不在保证内

尚未核对/不可得材料：

- 全npm挂起按TD004既有边界保留，不重新运行

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-22] Codex只读产品历史与详情持久链路

<a id="AS-CURRENT-20261014-22"></a>

### 覆盖范围

需求：[REQ-TERMLINK-HISTORY-PIPELINE](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-HISTORY-PIPELINE)。本轮完整重评 REQ-TERMLINK-HISTORY-PIPELINE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。早期Rust formal/Node4.5真实阶段交付、旧003实际源码后停止、004独立Node产品事务/包内smoke、005 Android静态缓存/详情及831真实调查均已执行；833/832又有当前保留的专项修复。不以缺少新拆子项binding判未开始。

结论：**undetermined**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 只读外部rollout输入，Node只给conversation/read intent | formal target startup sessions_root和source read、Node进程接口已存在；本次未见新外部writer | 阶段4.5原Node任务147/147与真实Rust1/1等只证明隔离；004/832有产品路径应用 |  | 未逐一复核当前全部source confinement/error输入 | docs/codex/codex-rollout-collector-architecture.md；TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/387（原journal逻辑ref=.workflow-system/records/events/key-e08526b3c8735b7d386e9646487feb657dd66d468f56308ceb54b0aef26d94cf.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留） |
| 验证SessionMeta/history_base/cut的source/lineage，不凭文件猜Branch | 当前辅助parent、独立conversation/cut继承实现已读；832原Branch成功 | 832 C继承N11项并自身新增；831早期catalog parent missing被后续专项覆盖，不保留为“当前无Branch实现” |  | 831自然resend及validated last-turn replacement全链仍无通过证据 | docs/codex/codex-rollout-collector-architecture.md；native/codex-rollout-collector/src/source/discovery.rs:410-478；docs/product/history/maintenance-20261011/TASK832-close-report.md；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/149（原journal逻辑ref=.workflow-system/records/events/key-26ddca1b4078a7ec73313b6c7dc8a8cc45d37592dbadb757bf18a01a0e7b3332.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留） |
| preview/backfill/append有界完整行与正确cursor | 完整行窗口、inherited prefix分段与aggregate预算校验存在，不能以扩预算取成功 | 832分段与cut负向；831原B decoded36,826,206>33,554,432及Q fingerprint67,108,864实际失败保留 |  | 大自然历史预算内全链/超额用户体验未全面核实；预算失败不是授权扩大预算 | docs/codex/codex-rollout-collector-architecture.md；native/codex-rollout-collector/src/protocol/target_source.rs:978-1015,1645-1683；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/247（原journal逻辑ref=.workflow-system/records/events/key-80adab6cdb9d564d9c2d729f2e0415a0b66e64d0871efb83c8bc599215602030.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留） |
| vendored wire→唯一Adapter→owned事件，unknown/gap保留 | DelegatedInput兼容、旧unknown/ParseGap保护可见；现有formal facade/adapter界限存在 | 833/832精确carrier覆盖；830名称/交付仅在父定义及记录索引读取，未全面核它的token_usage/developer实际源 |  | 所有正式支持variant/alias在当前全输入面不能由委派样本认证 | docs/codex/codex-rollout-collector-architecture.md；docs/codex/codex-history-shared-compat-contract.md；native/codex-rollout-collector/src/codex_adapter/mod.rs:1380-1445 |
| 历史正文、工具/计划/usage/outcome与稳定identity | Rust AnalysisReducer和target mapping、Node productProjection/role构造存在；实际tool详情按策略有界保留 | 早期隔离阶段与004、833/832实际正文/tool证据；同key重读/重启无重复有局部覆盖 |  | 当前所有Plan问答/action、usage/outcome形态及自然长会话组合未逐项闭合 | docs/codex/codex-rollout-collector-architecture.md；native/codex-rollout-collector/src/analysis.rs:1125-1222；src/services/codexRolloutCollector/analysisBatchImporter.js:1793-1813；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md |
| Node先hello、单Rust/单inflight调度，ACK后校验complete/checkpoint | index pending队列/intent、manager profile和importer acceptedDelivery/checkpoint gate已读 | 60828 147/147仅隔离；833 S5真实SQL/ACK/complete顺序，832自然保存均有证据 |  | 整条自然多conversation调度/故障组合矩阵未由这些局部证据证明 | TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md；src/services/codexRolloutCollector/index.js；src/services/codexRolloutCollector/analysisBatchImporter.js:1950-2080；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md |
| job/checkpoint/delivery恢复、取消超时重启不伪造canonical | 新request沿原job/profile/delivery，complete必须匹配本attempt durable payload；非canonical保持旧产品 | 早期隔离恢复及832/833保护；831 S4真实服务重启跨55s任务后live恢复，但当时产品仍未发布，不能当canonical恢复PASS |  | 真实ACK-loss/checkpoint/timeout race、普通自然append/resend和旧attempt跨手机完整链未闭合 | src/services/codexRolloutCollector/analysisBatchImporter.js:1950-2080；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/247（原journal逻辑ref=.workflow-system/records/events/key-80adab6cdb9d564d9c2d729f2e0415a0b66e64d0871efb83c8bc599215602030.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留）；docs/codex/codex-history-shared-compat-contract.md |
| Node durable staging→complete gate→canonical/详情/coverage/checkpoint产品事务 | 当前stageBatch和publishCanonical真实接线存在，不能沿AD-022旧Node未开始背景否定已交付 | 004 product17/17 package2/2（caller summaries/raw stdout未留）；833 realSQLite rollback/reopen；832三样本原持久根实际提交 |  | 旧003acceptance=false是其停止时点；004另阶段补证，不把两个task数字/结果混同。完整自然矩阵仍非全部覆盖 | docs/codex/codex-history-product-contract.md；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/387（原journal逻辑ref=.workflow-system/records/events/key-e08526b3c8735b7d386e9646487feb657dd66d468f56308ceb54b0aef26d94cf.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留）；TASKS/TASK-003-rust-node-app.md；src/services/codexRolloutCollector/analysisBatchImporter.js:1900-2080；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md；docs/product/history/maintenance-20261011/TASK832-close-report.md |
| 鉴权provider/API/history只读产品投影，不由App直接采集 | product provider/readConversation接线及DB miss/error/static baseline边界在产品契约和当前模块存在 | 004鉴权Gateway/包smoke；831 S6无效HTTP401、WS4401/4403零frames，合法F产品页22项与DB深等值；unknown registration候选后来单独修复不归旧832完成 |  | 全部API鉴权/DB错误自然设备负向未逐项核实 | docs/codex/codex-history-product-contract.md；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/387（原journal逻辑ref=.workflow-system/records/events/key-e08526b3c8735b7d386e9646487feb657dd66d468f56308ceb54b0aef26d94cf.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留）；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/143（原journal逻辑ref=.workflow-system/records/events/key-239872f59e75b6579bac30729f9c7afe739a9ead35939b93fd367d560e03a234.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留）；src/services/codexHistoryProductProvider.js |
| Android按endpoint/profile+conversation持久静态缓存与冷启动 | 旧005/S6缓存、当前detail读入路径已实现 | 00598items39refs与1900byte详情重开；832N/C/A实际durable分区；10/13自然增长冷启动工具与结束消息可见 |  | 所有provider迁移/离线场景和新APK全缓存矩阵未全面验收 | .workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/376（原journal逻辑ref=.workflow-system/records/events/key-dbec71588bac0244303f6bc3daeccbcc0c9d7247e490cf74dd19ce73d0d24e60.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留）；docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-68 |
| manifest/page/delta/chunk受限传输、本地durable后ACK、hash/数量 | 现有协议和importer/Android范围证据支持局部；A chunk等待不伪称首批提交 | 832三样本同run/generation ACK；0057页6overlap与69,427byte细节是协议层。831S4-R1两partial页durable可匹配，第三ACK后行证据未知，全为IPC fallback |  | 真实手机产品older跨页durable ACK/overlap完整矩阵仍未闭合 | docs/codex/codex-history-product-contract.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/376（原journal逻辑ref=.workflow-system/records/events/key-dbec71588bac0244303f6bc3daeccbcc0c9d7247e490cf74dd19ce73d0d24e60.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留）；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/270（原journal逻辑ref=.workflow-system/records/events/key-8c69801a7b6a494d76648900f9090141231eb2f63462fc5966ab2f67eab2e8e4.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留） |
| older/range/cursor/coverage续读且让位control/live | provider按数量/字节分页、cursor绑定投影/锚点，旧路径实现存在 | 005/831 F98项39refs离线7页22/32/26/5/6/6/7，6overlap，最后hasMoreBefore=false但coverageComplete=false；不可据末页宣称完整 |  | 真实手机older durable ACK/重开、多页连续/刷新和control优先未闭合；10/13跨页亦未形成通过 | docs/codex/codex-history-product-contract.md；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/376（原journal逻辑ref=.workflow-system/records/events/key-dbec71588bac0244303f6bc3daeccbcc0c9d7247e490cf74dd19ce73d0d24e60.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留）；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/158（原journal逻辑ref=.workflow-system/records/events/key-2ca151f99db0ae2a1a48fe59ab4e8df4faf81bf2e36b8bba846d07f813d691af.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留）；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-68 |
| 工具详情ref分块/展示/复制与媒体独立静态边界 | 小详情alias修复存在；provider支持48KiB chunk/UTF8/hash；live聚合仍有上限 | 832选定469/469/552byte成功；005真实1900byte复制成功、69,427byte仅协议；10/13真实2400行输出UI约165行“详情已截断”且无完整历史详情入口 | 已知未达：10/13所选大详情阅读/完整复制闭环失败；后续a78只提示/generation改动，没有详情路径修复 | 大详情缺入口根因/源采集是否完整/retention影响未定位，不得推断整个静态传输或DB失败；媒体全部子场景本批未核 | docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-68；docs/product/history/maintenance-20261011/android-validation-20261013/history-large.json；docs/product/history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/376（原journal逻辑ref=.workflow-system/records/events/key-dbec71588bac0244303f6bc3daeccbcc0c9d7247e490cf74dd19ce73d0d24e60.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留）；docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md |
| 本地统计和手动清理共享引用安全，不动凭据/远端 | 本批未细读设置统计/删除实现，不能仅凭父模块存在认证 | 已读子项定义及CONTRACTS静态边界，未取得本对象独立当前证据 |  | 本功能实施/验收细节未核，留给HISTORY-ANDROID对应深评，不判未开始/失败 | docs/product/MANAGED_REQUIREMENTS.md#REQ-TERMLINK-HISTORY-ANDROID；docs/workflow/CONTRACTS.md（历史缓存媒体静态边界） |
| 切换重开/旧conversation-generation隔离且不覆盖healthy IPC | 既有selection/history guards；a78增加WS event generation入队后再核并清理连接提示，非新增历史writer | 832有限N/C/A重开；831真实running A/B/A和跨restart live局部成立；10/13及新868提示修复不证明受控在途history/details全矩阵 |  | 真实受控迟到history/detail旧generation、取消/超时/缓存更新竞态未闭合 | docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/247（原journal逻辑ref=.workflow-system/records/events/key-80adab6cdb9d564d9c2d729f2e0415a0b66e64d0871efb83c8bc599215602030.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留）；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-68；android/app/src/main/java/com/termlink/app/codex/network/CodexWebSocketClient.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt（4d586e0f2dab1fef9d2c273b770796b63a7d873d→3d72aac95a1f8bfc7fe3089797e868c28a185454→a78fe55e033bbcb6db816acd2c801de5aa28a081静态diff） |
| 三类保存专项与共享兼容局部贡献，完整自然链按005/831判断 | 832/833具体修复存在，不等价完整pipeline | 专项原范围scoped satisfied；831早期委派/增长/branch缺陷已由它们逐项补证，旧预算、普通resend、自然E07、大详情和竞态不随之消失 |  | 待补原005/831余下自然矩阵；已知10/13大详情未达必须保留 | docs/product/history/maintenance-20261011/TASK832-close-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/143（原journal逻辑ref=.workflow-system/records/events/key-239872f59e75b6579bac30729f9c7afe739a9ead35939b93fd367d560e03a234.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留）；.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json#records/376（原journal逻辑ref=.workflow-system/records/events/key-dbec71588bac0244303f6bc3daeccbcc0c9d7247e490cf74dd19ce73d0d24e60.json；正文payload.request/summary/result/remaining_work，字节由同目录pack保留）；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-68 |

#### 版本适用性

- 当前评估commit a78fe55e033bbcb6db816acd2c801de5aa28a081；源定义为docs/product/MANAGED_REQUIREMENTS.md的本目标、历史来源/持久化/Android三个current子项。
- 旧003明确用户停止、acceptance_satisfied=false，不能改写为完成；004是另一真实task legacy-doc-fdd730cf99bb383419d74988，不由显示编号冒造/替代。004补充结果是caller summaries+自审且无原stdout，不扩成真实外部host/Android。
- 831实测历史源覆盖ee5d4912/0bf99845/19bf3121/60c507f6/026892bb；当时委派/增长/Branch失败后来832/833有针对补证；自然resend、E07更新/旧cursor/旧expectHash、受控竞态依旧没有闭环，不能复用旧失败为当前零进度。
- 10/13 AS68实测commit4d586e0、旧f148028b APK。静态比4d586e0→a78确认Rust/Node历史/DB/provider及Android详情函数未变，实际变更是连接/IPC错误提示与WS generation、registration。因未见大详情修复，保留该直接反证；未将旧APK全报告当成a78全部运行结果。
- 本批只读取已有运行记录、源码哈希和Git差异判断版本适用性，没有产生新的业务运行PASS。

#### 实际读取材料

- [AGENTS.md](../../../AGENTS.md)
- [.agents/skills/maintain-project/SKILL.md](../../../.agents/skills/maintain-project/SKILL.md)
- [.workflow-system/WORKFLOW_PROTOCOL.md](../../../.workflow-system/WORKFLOW_PROTOCOL.md)
- [.workflow-system/runtime/support/product-maintenance/references/reconcile.md](../../../.workflow-system/runtime/support/product-maintenance/references/reconcile.md)
- [.workflow-system/runtime/support/product-maintenance/references/binding-contribution.md](../../../.workflow-system/runtime/support/product-maintenance/references/binding-contribution.md)
- [docs/codex/codex-rollout-collector-architecture.md](../../codex/codex-rollout-collector-architecture.md)
- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/codex/codex-history-product-contract.md](../../codex/codex-history-product-contract.md)
- [docs/codex/codex-history-shared-compat-contract.md](../../codex/codex-history-shared-compat-contract.md)
- [TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md](../../../TASKS/TASK-20260828-001-codex-node-analyzer-phase45-migration.md)
- [.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json](../../../.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json)
- [docs/product/history/maintenance-20261011/TASK832-close-report.md](../history/maintenance-20261011/TASK832-close-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md](../history/maintenance-20261011/current-assessment-20261012/history-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md](../history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md](../history/maintenance-20261011/current-assessment-20261012/history-832review-report.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/history-large.json](../history/maintenance-20261011/android-validation-20261013/history-large.json)
- [docs/product/history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt](../history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt)
- [docs/product/DELIVERY_RECONCILIATION.md](../DELIVERY_RECONCILIATION.md)
- [native/codex-rollout-collector/src/source/discovery.rs](../../../native/codex-rollout-collector/src/source/discovery.rs)
- [native/codex-rollout-collector/src/codex_adapter/mod.rs](../../../native/codex-rollout-collector/src/codex_adapter/mod.rs)
- [native/codex-rollout-collector/src/analysis.rs](../../../native/codex-rollout-collector/src/analysis.rs)
- [src/services/codexRolloutCollector/analysisBatchImporter.js](../../../src/services/codexRolloutCollector/analysisBatchImporter.js)
- [src/services/codexRolloutCollector/index.js](../../../src/services/codexRolloutCollector/index.js)
- [TASKS/TASK-003-rust-node-app.md](../../../TASKS/TASK-003-rust-node-app.md)
- [src/services/codexHistoryProductProvider.js](../../../src/services/codexHistoryProductProvider.js)

归档记录定位（index中的record摘要及pack块定位，非新执行结果）：

- index_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json；record_index：387；logical_ref：.workflow-system/records/events/key-e08526b3c8735b7d386e9646487feb657dd66d468f56308ceb54b0aef26d94cf.json；record_sha256：b857a11067ed8380c15dce6ab52bb9efffb11c8a366313c66f350aaac00e92bd；pack_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin；chunks：offset：1502047；length：2013；headerLength：418；rawOffset：0；rawLength：4699；sha256：b857a11067ed8380c15dce6ab52bb9efffb11c8a366313c66f350aaac00e92bd；compressedSha256：3204f324600d2451dc626c88563c5a1569fe42fc9b88125673031e2a3899520f
- index_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json；record_index：376；logical_ref：.workflow-system/records/events/key-dbec71588bac0244303f6bc3daeccbcc0c9d7247e490cf74dd19ce73d0d24e60.json；record_sha256：a278afe179a0c4156756adadacc8a11447f738ed7d5198b8e05f99cd99aa9ec9；pack_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin；chunks：offset：1461676；length：4597；headerLength：420；rawOffset：0；rawLength：21683；sha256：a278afe179a0c4156756adadacc8a11447f738ed7d5198b8e05f99cd99aa9ec9；compressedSha256：c701b930ae42b292bc001393b17e1ac650d4ca6e4e07e235f300720d0d3c4804
- index_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json；record_index：146；logical_ref：.workflow-system/records/events/key-24436d5fd1f6e4a8fd44381dc8a997b37f51512561ac77999e9d5e996a517650.json；record_sha256：075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a；pack_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin；chunks：offset：344015；length：8399；headerLength：420；rawOffset：0；rawLength：35880；sha256：075a9a9f858346df696ec721bdad022ba743e1f3b970190e9d10f58ab2f6b23a；compressedSha256：10fb07d6739b650e96dc7f65fbaa6eef1dbf0cc476f922a4e26a2925ffb71a33
- index_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json；record_index：173；logical_ref：.workflow-system/records/events/key-36aa5482134317528d5ee9267276349064482246681c2a9d35a41854d49ad98e.json；record_sha256：94cc61e667ff94b058f22df9471fd980344ad27bdb05da2169b894849dacf41d；pack_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin；chunks：offset：463810；length：24216；headerLength：422；rawOffset：0；rawLength：65536；sha256：54c00a042bcba4768b8db090a985533dd2386e5f224f112eda2f96e4631e90dc；compressedSha256：45fe63aa0ee595afb87707a0bef04a2b2202ef3ed6d4ea2f3a793284fabee9e2；offset：488452；length：14601；headerLength：426；rawOffset：65536；rawLength：40208；sha256：9fc6692c528e93f251e8fae8eba6a3814c6fc2bb7b99fa90de02c0f689a39241；compressedSha256：79aaf6ebea508f34452bcd4d8cea708207319622e6f682d5919bf555fb5b4a8a
- index_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json；record_index：256；logical_ref：.workflow-system/records/events/key-8464c4002ea41b1b57974aaf26a47b116e56a5f8f029fc6e7fc0074df0158a68.json；record_sha256：22ee0f9837348c0cf89fe0b753d2132ab07b558a50a534dbcc6ac8d9c147bf45；pack_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin；chunks：offset：781860；length：2302；headerLength：418；rawOffset：0；rawLength：8248；sha256：22ee0f9837348c0cf89fe0b753d2132ab07b558a50a534dbcc6ac8d9c147bf45；compressedSha256：8d447ba3d15d4aa632b5aaba508bd1e952af61b11fec173c6aa69ca552c474f4
- index_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json；record_index：143；logical_ref：.workflow-system/records/events/key-239872f59e75b6579bac30729f9c7afe739a9ead35939b93fd367d560e03a234.json；record_sha256：ff9a85277df3bc6c8e822017ccf35605c89586683540ef88507214d583ab49f8；pack_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin；chunks：offset：335945；length：3852；headerLength：420；rawOffset：0；rawLength：15845；sha256：ff9a85277df3bc6c8e822017ccf35605c89586683540ef88507214d583ab49f8；compressedSha256：162e9a6d495caa50ebef9f36e85425230fac38867fa88e17207f8e7fc590be44
- index_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json；record_index：149；logical_ref：.workflow-system/records/events/key-26ddca1b4078a7ec73313b6c7dc8a8cc45d37592dbadb757bf18a01a0e7b3332.json；record_sha256：ff76ad94752d06effa13411a38776be2194eb4dfba9bb6e27984664b36b5bf41；pack_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin；chunks：offset：385202；length：3227；headerLength：420；rawOffset：0；rawLength：14258；sha256：ff76ad94752d06effa13411a38776be2194eb4dfba9bb6e27984664b36b5bf41；compressedSha256：8407b13294ae7cfd632917ca88b2e88fc78b27d4adf0b0e99891272710c3e53d
- index_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json；record_index：247；logical_ref：.workflow-system/records/events/key-80adab6cdb9d564d9c2d729f2e0415a0b66e64d0871efb83c8bc599215602030.json；record_sha256：56d1868c95135037110b4ac00ae0eeedc21de9f21e81ad1f4684a86164b1a398；pack_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin；chunks：offset：752700；length：4657；headerLength：420；rawOffset：0；rawLength：19961；sha256：56d1868c95135037110b4ac00ae0eeedc21de9f21e81ad1f4684a86164b1a398；compressedSha256：e7f715786b09eb59983795e5f51789c157c538860781bd35d3ba3f24860de2a7
- index_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json；record_index：270；logical_ref：.workflow-system/records/events/key-8c69801a7b6a494d76648900f9090141231eb2f63462fc5966ab2f67eab2e8e4.json；record_sha256：3340ec1669cfe10ca22a66a5a5a4753da6aeb5ea8abfc76d336c9ad89e3e72bc；pack_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin；chunks：offset：842029；length：2812；headerLength：420；rawOffset：0；rawLength：12091；sha256：3340ec1669cfe10ca22a66a5a5a4753da6aeb5ea8abfc76d336c9ad89e3e72bc；compressedSha256：721757f7a37aecb74ad18b3ab8108012e64ebcc3a2c4fa5646aaf1c6583e8793
- index_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json；record_index：158；logical_ref：.workflow-system/records/events/key-2ca151f99db0ae2a1a48fe59ab4e8df4faf81bf2e36b8bba846d07f813d691af.json；record_sha256：47deef481763f8eb2b6d3c349fd80c9db4370c9872c82aa1f2287f41220b7b2c；pack_path：.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin；chunks：offset：416621；length：3144；headerLength：420；rawOffset：0；rawLength：12597；sha256：47deef481763f8eb2b6d3c349fd80c9db4370c9872c82aa1f2287f41220b7b2c；compressedSha256：7ebddb82e59f66b0c20a38ed52f5bb8ee4e05cca6b707087d2a4948347646a21

### 剩余与待核对

- 先在既有明确范围下定位10/13大详情无完整入口：区分live截断、product publication、detailRefs映射/选择和保留策略；不要直接改IPC authority或放宽预算。
- 随后按原005/831补证真实手机older durable commit/ACK/overlap/重开、>48KiB详情UTF8分块与复制、自然E07各子场景、普通append/resend/last-turn替换、受控迟到/旧generation/超时/取消；复用已有合法证据，不重复已闭合832三个小样本。
- 当前统计清理/媒体具体子范围仍待独立源审，不按子项数量计算父项完成率，不因Task closed或子项新增自动重开旧Task。
- 新增10/13反证直接影响HISTORY-ANDROID、HISTORY-PIPELINE和其已声明SERVER-HISTORY/APP-CODEX父层的相关大详情义务；只读返回这些待对账定位，不在repo新增binding或改验收。

依赖与排序依据：

- id：REQ-TERMLINK-HISTORY-SOURCE；role：当前功能1-4实际定义；本报告确认部分source交付并保留未读输入面
- id：REQ-TERMLINK-HISTORY-PERSISTENCE；role：当前功能8-9实际定义；不能把隔离Rust任务归档当产品接线
- id：REQ-TERMLINK-HISTORY-ANDROID；role：当前功能10-15；AS68大详情反证直接适用，older/竞态仍未知
- id：REQ-20261005-codex-history-save-repair；role：仅三类样本专项局部交付
- id：REQ-20261005-codex-history-shared-compat；role：仅共享compat局部交付
- id：REQ-TERMLINK-SERVER-HISTORY；role：现有declared part_of父层；需传递具体当前未知/失败，不自动判整父层失败
- id：REQ-TERMLINK-APP-CODEX；role：现有declared part_of父层；具体大详情/静态缓存义务影响

尚未核对/不可得材料：

- 未逐一全文读取60819–27所有早期任务与每份原stdout；本批明确读60828实际完整归档、003关闭实录、004/005/831 journal原执行/关闭及832/833原报告，不用摘要声称全历史已读。
- 831 E01–E12全部raw DB/UI/完整协议及其私有大附件未逐字复取，读取可恢复原执行/审查字段与已保留原报告。
- Android本地统计/手动清理、媒体原图/缩略图全部细节尚未在本批审计；单列unknown。
- 未定位10/13大详情根因，也未在当前APK重演；源版本差异只能证明未发现对应修复，不能声称本次运行再现。

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。
