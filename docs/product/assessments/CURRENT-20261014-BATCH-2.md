---
{
  "schema": "vnext-product-doc/v3",
  "items": [
    {
      "id": "AS-CURRENT-20261014-23",
      "type": "assessment",
      "target": "REQ-TERMLINK-SERVER",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-SERVER"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "433ea05b7eae3e433bb1b849b37fa7d88c0d715db2b70c2619ea181114bdd3e3",
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
        "scope_id": "CURRENT-20261014-23",
        "coverage": "本轮完整重评 REQ-TERMLINK-SERVER 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
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
          "path": "src/services/ptyService.js",
          "sha256": "4d8cb588edb6c639e7785b91228098998b066bc46f1e7f971ae8c52100f2137b"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json",
          "sha256": "da7773fc6a798e5e3c7a27e7a75fed93db7e221b71df89fcf917da9c5f696d56"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/retention-completed.tap",
          "sha256": "62143779fc2b4fcba2d6bd3afe2598b945571f576823d9ce94ab625b516f0564"
        },
        {
          "kind": "file",
          "path": "src/config/securityGates.js",
          "sha256": "141dda6331dcacb7009ca0815c39b57836cbf4c471d9e8868c6cccab93287309"
        },
        {
          "kind": "file",
          "path": "src/config/privilegeConfig.js",
          "sha256": "11fd8995eab6b4edc60ca6d9d2fe0640bec05cbb7baf488a41b49a37b411c251"
        },
        {
          "kind": "file",
          "path": "src/services/auditService.js",
          "sha256": "a9e0d03f3965b4d890c207953a5e1b4789237238252bc04881c1b42565c669db"
        },
        {
          "kind": "file",
          "path": "src/utils/ipCheck.js",
          "sha256": "f3a14ad4e0af4ad76f5329a08d225d931786c3846a2ce200a9343af84c2ab0a1"
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
          "path": "docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json",
          "sha256": "8420f108e8832398bdd92e898eaa82d8ac4b423d909ba5df7571433013aad2a3"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md",
          "sha256": "b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"
        },
        {
          "kind": "file",
          "path": "src/services/codexIpcFeed.js",
          "sha256": "b2949275ba34abf97c12bdc6056c36bc9df03598586a5ade44114b153dff6cc3"
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
          "path": "TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md",
          "sha256": "b4ce7320e3baeeeef168847c6dc07f7d6e5d4f1f198907e08b8d6a616a76195b"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/ipc-reconnect-summary.json",
          "sha256": "51ec146eec32e83a3c745209bb4ab6af430ecc5ef5f52060d0f1d11d3811f734"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
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
          "path": "docs/changes/records/CR-20260715-1635-linux-interactive-installer.md",
          "sha256": "236b07d397d0d779877e53fe416803a553b06e3364316b7bb43ccfc4182b0b37"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap",
          "sha256": "36ec0a88528703584c15dfeb43c69abe33a7354595f3fae215835eb88e3c6fcb"
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
          "path": "src/server.js",
          "sha256": "ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/TASK832-close-report.md",
          "sha256": "7a5eec7b35440317bcab207b0d066809583349bdebce4cc3d65cbedaa0003607"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md",
          "sha256": "04b7fff55add0bc00188f938b7546eacc7cd85df32ba9a961c105e2e65125e11"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md",
          "sha256": "1420cfc800a31826a6bebcafa17cbe84d3704601da65ccc3bf325be38a1767e6"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md",
          "sha256": "fcc1ff5a866d55311611242b529f622135bd9597f0b1ce89c6e7912a5b7e370f"
        },
        {
          "kind": "file",
          "path": "src/routes/workspace.js",
          "sha256": "13e8fcf7fa8ef5573e1cfcd1765985f35d7b30740d615780938adb6557da29f5"
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
          "basis": "服务端不是仅有分组：实际session/PTY入口、2月CR、5月发行task、7月IPC/history与868修复/运行记录均直接存在；可证已开始过"
        },
        "batch": 2
      }
    },
    {
      "id": "AS-CURRENT-20261014-24",
      "type": "assessment",
      "target": "REQ-TERMLINK-WEB",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-WEB"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "acb16d453ef1ae559ce22eeee81ad565880f6131f4affb14beeb81e61a11618e",
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
        "scope_id": "CURRENT-20261014-24",
        "coverage": "本轮完整重评 REQ-TERMLINK-WEB 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
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
          "path": "TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md",
          "sha256": "0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"
        },
        {
          "kind": "file",
          "path": "src/auth/basicAuth.js",
          "sha256": "c86cf29176581d07966d2835c5eb1c940822101258ab212acb772db0c679efc2"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "public/terminal.js",
          "sha256": "9d2f8e2dfd1a2adc09f6d5d43242997e975b9d168d8d2e64fb342f5d8914b702"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json",
          "sha256": "da7773fc6a798e5e3c7a27e7a75fed93db7e221b71df89fcf917da9c5f696d56"
        },
        {
          "kind": "file",
          "path": "public/terminal_shortcut_input.js",
          "sha256": "e754e77db27bdb5411b2c82d4e8344301a19472112dfffb504f549f66788f43d"
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
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/ipc-reconnect-summary.json",
          "sha256": "51ec146eec32e83a3c745209bb4ab6af430ecc5ef5f52060d0f1d11d3811f734"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260330-0500-language-normalization-closeout.md",
          "sha256": "52eb4103283805b1fbb95a628e8774e39dab9c1da3db52060fd215c084959a44"
        },
        {
          "kind": "file",
          "path": "src/routes/workspace.js",
          "sha256": "13e8fcf7fa8ef5573e1cfcd1765985f35d7b30740d615780938adb6557da29f5"
        },
        {
          "kind": "file",
          "path": "public/terminal_client.js",
          "sha256": "6eff45696997ffcbc3b2313c451ec38b2d9bd4e8958ad9743317e164c01306ba"
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
          "basis": "20260715-002真实实施与111/111/浏览器QA、当前terminal.js和10/13真实浏览器操作是直接启动依据，不依父子绑定"
        },
        "batch": 2
      }
    },
    {
      "id": "AS-CURRENT-20261014-25",
      "type": "assessment",
      "target": "REQ-TERMLINK-APP",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-APP"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "309f3c0eaeea34493f820d38564c6dc5a9aa0a99401f00e340a23e1af550814f",
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
        "scope_id": "CURRENT-20261014-25",
        "coverage": "本轮完整重评 REQ-TERMLINK-APP 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
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
          "path": "android/app/src/main/java/com/termlink/app/MainShellActivity.kt",
          "sha256": "9ee6c4e4056d0d38fb63fe092285b7803a90a506b7e2ee628155126094f2b0e7"
        },
        {
          "kind": "file",
          "path": "public/terminal_client.js",
          "sha256": "6eff45696997ffcbc3b2313c451ec38b2d9bd4e8958ad9743317e164c01306ba"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt",
          "sha256": "34d8fda96575e05142bb9390d3e74148d82c9aa54a5ffb225e01794ac86a7ac1"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
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
          "path": "TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md",
          "sha256": "b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md",
          "sha256": "1420cfc800a31826a6bebcafa17cbe84d3704601da65ccc3bf325be38a1767e6"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/TASK832-close-report.md",
          "sha256": "7a5eec7b35440317bcab207b0d066809583349bdebce4cc3d65cbedaa0003607"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s3/report.md",
          "sha256": "7ab9147c9191c759680a5173862362c0bd7e1dd6c85fbf412940d25815735560"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json",
          "sha256": "8420f108e8832398bdd92e898eaa82d8ac4b423d909ba5df7571433013aad2a3"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt",
          "sha256": "c2a5596ca9c796ebd94af7028d7e26a709b077027a8e8f605e0ee414d15ddaab"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt",
          "sha256": "5713c9f45d4061b262660673f84cd275f76a1afc59b3f579e4480a67b85aae5c"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt",
          "sha256": "f3421337761ea902522bf059887907253fb65c6385b1eb3b0d528b60dd1e3984"
        },
        {
          "kind": "file",
          "path": "docs/changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md",
          "sha256": "5208e2cc870996fc221437e206d2192c9bb1e550fd33431300313ebaf482a71c"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md",
          "sha256": "e500ebe2228660fae82027821044bd3098a7b1ef062a3b50ffe3be05e4434898"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt",
          "sha256": "c58e43438218cdc78cd26243646d001dd6b4cea4cee0dd718d60886f7c0880e1"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md",
          "sha256": "dfc0b8f5d6f61e79a92d12e2f7cbe4d9e6b4ed8ed31d5d71aa5c8eeba9361197"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "src/routes/workspace.js",
          "sha256": "13e8fcf7fa8ef5573e1cfcd1765985f35d7b30740d615780938adb6557da29f5"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md",
          "sha256": "64802d08dd6147b6be02af20414aa5345bc2f25ec9f697939b785f5c788c2e09"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt",
          "sha256": "53bc57fcf49d0400dbe0210918ef20d20cb7fcb00219bbb4f23c27d6746f76af"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260330-0500-language-normalization-closeout.md",
          "sha256": "52eb4103283805b1fbb95a628e8774e39dab9c1da3db52060fd215c084959a44"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md",
          "sha256": "dbabf72656e7fa167e05c924e23f1001979fcf55a2f50d3ea8a5602eb015b857"
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
          "basis": "旧Android实际CR/源码+3月真机缓存/mTLS+4月原生+7月诊断+10/13设备场景及868修复，直接证明父范围已开始过且多处实际交付"
        },
        "batch": 2
      }
    },
    {
      "id": "AS-CURRENT-20261014-26",
      "type": "assessment",
      "target": "REQ-TERMLINK-SERVER-AUTH",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-SERVER-AUTH"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "6ffd0e88bd66a2b36cb44f414a28fa2af33bd3885c612871c8d115e8f6f96a41",
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
        "scope_id": "CURRENT-20261014-26",
        "coverage": "本轮完整重评 REQ-TERMLINK-SERVER-AUTH 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "partial-reported",
      "verification": "pass-reported",
      "conclusion": "undetermined",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
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
          "path": "src/server.js",
          "sha256": "ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6"
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
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "src/auth/basicAuth.js",
          "sha256": "c86cf29176581d07966d2835c5eb1c940822101258ab212acb772db0c679efc2"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md",
          "sha256": "0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s3/report.md",
          "sha256": "7ab9147c9191c759680a5173862362c0bd7e1dd6c85fbf412940d25815735560"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s3/network-result.json",
          "sha256": "ae50020be6b5967e17caa297734acc06e05b83395f52e928219f2b3f9d5967ab"
        },
        {
          "kind": "file",
          "path": "src/services/clientRegistrationManager.js",
          "sha256": "a0ec66b61e689d029819cdd5cd3403bb2031f2cc2d1bda3f4abb8a6c9dd2dea0"
        },
        {
          "kind": "file",
          "path": "src/routes/sessions.js",
          "sha256": "d646071995865a382f7f789ddb54e8239b8ec48c779cfe351b84601041332607"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
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
          "path": "docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json",
          "sha256": "8420f108e8832398bdd92e898eaa82d8ac4b423d909ba5df7571433013aad2a3"
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
          "path": "src/services/sessionManager.js",
          "sha256": "dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/MainShellActivity.kt",
          "sha256": "9ee6c4e4056d0d38fb63fe092285b7803a90a506b7e2ee628155126094f2b0e7"
        },
        {
          "kind": "file",
          "path": "public/terminal_client.js",
          "sha256": "6eff45696997ffcbc3b2313c451ec38b2d9bd4e8958ad9743317e164c01306ba"
        },
        {
          "kind": "file",
          "path": "public/terminal.js",
          "sha256": "9d2f8e2dfd1a2adc09f6d5d43242997e975b9d168d8d2e64fb342f5d8914b702"
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
          "basis": "旧权限/认证CR及20260715网页登录任务、868真实repair执行都直接覆盖父项子范围；父项无整体绑定不等未开始"
        },
        "batch": 2
      }
    },
    {
      "id": "AS-CURRENT-20261014-27",
      "type": "assessment",
      "target": "REQ-TERMLINK-SERVER-SESSIONS",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-SERVER-SESSIONS"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "f6d6b0cbaf8b9f256a5e1d9464d7db5f405a0d18b472ab866f8ed0ca1c408cbe",
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
        "scope_id": "CURRENT-20261014-27",
        "coverage": "本轮完整重评 REQ-TERMLINK-SERVER-SESSIONS 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "partial-reported",
      "verification": "pass-reported",
      "conclusion": "undetermined",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "src/services/ptyService.js",
          "sha256": "4d8cb588edb6c639e7785b91228098998b066bc46f1e7f971ae8c52100f2137b"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json",
          "sha256": "da7773fc6a798e5e3c7a27e7a75fed93db7e221b71df89fcf917da9c5f696d56"
        },
        {
          "kind": "file",
          "path": "src/services/sessionManager.js",
          "sha256": "dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"
        },
        {
          "kind": "file",
          "path": "src/routes/sessions.js",
          "sha256": "d646071995865a382f7f789ddb54e8239b8ec48c779cfe351b84601041332607"
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
          "path": "docs/changes/records/CR-20260224-0000-session-ttl-24h.md",
          "sha256": "f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/retention-completed.tap",
          "sha256": "62143779fc2b4fcba2d6bd3afe2598b945571f576823d9ce94ab625b516f0564"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/retention.test.cjs",
          "sha256": "1fcc056aa6adc7711fbbdcb1a4cbf44efc7e9980a5be5b06785bc2d0e69568a4"
        },
        {
          "kind": "file",
          "path": "src/repositories/sessionStore.js",
          "sha256": "f94dbabd8986c807611279e7a34ecb33184f3287b414729fcbceb294d4b641df"
        },
        {
          "kind": "file",
          "path": "docs/workflow/CONTRACTS.md",
          "sha256": "c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"
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
          "basis": "67bc2c3等原CR及现有完整session runtime和10/13实际PTY路径证明已开始；元数据代码明确存在"
        },
        "batch": 2
      }
    },
    {
      "id": "AS-CURRENT-20261014-28",
      "type": "assessment",
      "target": "REQ-TERMLINK-SERVER-CODEX",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-SERVER-CODEX"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "10b6c7ff5239c602778366ade937a03c9ca0a745d51177646bd4c3df8fd1559c",
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
        "scope_id": "CURRENT-20261014-28",
        "coverage": "本轮完整重评 REQ-TERMLINK-SERVER-CODEX 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
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
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
        },
        {
          "kind": "file",
          "path": "src/services/sessionManager.js",
          "sha256": "dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md",
          "sha256": "b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"
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
          "path": "src/services/codexIpcFeed.js",
          "sha256": "b2949275ba34abf97c12bdc6056c36bc9df03598586a5ade44114b153dff6cc3"
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
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/ipc-reconnect-summary.json",
          "sha256": "51ec146eec32e83a3c745209bb4ab6af430ecc5ef5f52060d0f1d11d3811f734"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s3/report.md",
          "sha256": "7ab9147c9191c759680a5173862362c0bd7e1dd6c85fbf412940d25815735560"
        },
        {
          "kind": "file",
          "path": "TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md",
          "sha256": "b4ce7320e3baeeeef168847c6dc07f7d6e5d4f1f198907e08b8d6a616a76195b"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md",
          "sha256": "d2392505b446677960b4f4f945f8617f1d0a407ec04ff22b66a9f6106fe0939a"
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
          "basis": "20260629任务执行和149/149历史验证、当前gateway/feed代码及10/13实际follower行为直接证明已开始"
        },
        "batch": 2
      }
    },
    {
      "id": "AS-CURRENT-20261014-29",
      "type": "assessment",
      "target": "REQ-TERMLINK-SERVER-RELEASE",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-SERVER-RELEASE"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "4b8d17f94fe6127e73acb7628fb74584fce7dae84cef69a12b40f39a1125854b",
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
        "scope_id": "CURRENT-20261014-29",
        "coverage": "本轮完整重评 REQ-TERMLINK-SERVER-RELEASE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "partial-reported",
      "verification": "pass-reported",
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
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap",
          "sha256": "36ec0a88528703584c15dfeb43c69abe33a7354595f3fae215835eb88e3c6fcb"
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
          "path": "docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md",
          "sha256": "4de557c29870f9e2b32d4df53419f525806acd4d269c5bd3f67d4b93f5068c03"
        },
        {
          "kind": "file",
          "path": "docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md",
          "sha256": "56c64044cfab475af6e16b5d7bbdce0aed234c8c502ce7ebb26377ebbf392c0d"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260715-1635-linux-interactive-installer.md",
          "sha256": "236b07d397d0d779877e53fe416803a553b06e3364316b7bb43ccfc4182b0b37"
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
          "basis": "20260513真实跨平台安装任务+7月已实施的Windows工具及Linux安装器测试/构建尝试，明确已开始过"
        },
        "batch": 2
      }
    },
    {
      "id": "AS-CURRENT-20261014-30",
      "type": "assessment",
      "target": "REQ-TERMLINK-SERVER-HISTORY",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-SERVER-HISTORY"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "71cba72a38a848dd3f679c6722dc55cbb3b1713a86d057c8957cf6ee672f667c",
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
        "scope_id": "CURRENT-20261014-30",
        "coverage": "本轮完整重评 REQ-TERMLINK-SERVER-HISTORY 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
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
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md",
          "sha256": "04b7fff55add0bc00188f938b7546eacc7cd85df32ba9a961c105e2e65125e11"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md",
          "sha256": "1420cfc800a31826a6bebcafa17cbe84d3704601da65ccc3bf325be38a1767e6"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md",
          "sha256": "fcc1ff5a866d55311611242b529f622135bd9597f0b1ce89c6e7912a5b7e370f"
        },
        {
          "kind": "file",
          "path": "src/server.js",
          "sha256": "ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/TASK832-close-report.md",
          "sha256": "7a5eec7b35440317bcab207b0d066809583349bdebce4cc3d65cbedaa0003607"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/history-large.json",
          "sha256": "7d4b0e895b5747fed7e69ab4204a0c9851168a89fedb8db6b5cfdc1a867e24a9"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt",
          "sha256": "c2a5596ca9c796ebd94af7028d7e26a709b077027a8e8f605e0ee414d15ddaab"
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
          "basis": "既有Rust/Node任务和832/833实际执行+server产品接线明确开始；“已归档Node4.5”从不当整链完成"
        },
        "batch": 2
      }
    },
    {"id":"AS-CURRENT-20261014-31","type":"assessment","target":"REQ-TERMLINK-APP-TERMINAL","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075","item_id":"REQ-TERMLINK-APP-TERMINAL"},"target_definition_algorithm":"vnext-product-definition/v1","target_definition_sha256":"8cf666942402364b6a74364eb73ff7784303fb88aa42050edff03297a52b2f3b","goal_basis":{"kind":"file","path":"docs/product/GOALS.md","sha256":"b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe","item_id":"GOAL-TERMLINK"},"goal_definition_algorithm":"vnext-product-definition/v1","goal_definition_sha256":"08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b","applicability":{"goal_id":"GOAL-TERMLINK","scope_id":"CURRENT-20261014-31","coverage":"本轮完整重评 REQ-TERMLINK-APP-TERMINAL 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"},"checked_at":"2026-10-14T19:25:36.973104+00:00","subject":{"kind":"commit","value":"a78fe55e033bbcb6db816acd2c801de5aa28a081","limitations":"本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"},"implementation":"partial-reported","verification":"mixed-reported","conclusion":"partially-satisfied","sources":[{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"},{"kind":"file","path":"public/terminal_client.js","sha256":"6eff45696997ffcbc3b2313c451ec38b2d9bd4e8958ad9743317e164c01306ba"},{"kind":"file","path":"android/app/src/main/java/com/termlink/app/MainShellActivity.kt","sha256":"9ee6c4e4056d0d38fb63fe092285b7803a90a506b7e2ee628155126094f2b0e7"},{"kind":"file","path":"src/ws/terminalGateway.js","sha256":"5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"},{"kind":"file","path":"docs/product/assessments/ANDROID-20261013.md","sha256":"4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"},{"kind":"file","path":"docs/product/assessments/JOINT-20261013.md","sha256":"48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"},{"kind":"file","path":"public/terminal_shortcut_input.js","sha256":"e754e77db27bdb5411b2c82d4e8344301a19472112dfffb504f549f66788f43d"},{"kind":"file","path":"public/terminal.js","sha256":"9d2f8e2dfd1a2adc09f6d5d43242997e975b9d168d8d2e64fb342f5d8914b702"},{"kind":"file","path":"docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json","sha256":"c013a6d7e0e75430618ec5d8cb70dd4a8fbac571098e9a499bb6fa399dd292cd"},{"kind":"file","path":"android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt","sha256":"34d8fda96575e05142bb9390d3e74148d82c9aa54a5ffb225e01794ac86a7ac1"},{"kind":"file","path":"src/services/sessionManager.js","sha256":"dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"},{"kind":"file","path":"docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json","sha256":"da7773fc6a798e5e3c7a27e7a75fed93db7e221b71df89fcf917da9c5f696d56"},{"kind":"file","path":"docs/product/history/maintenance-20261011/android-validation-20261013/terminal-reconnect-long-9.txt","sha256":"b165cc644d68d9a53add50d6ce02a199062f1fc3897fca9506b60d641df4ff93"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md","sha256":"74cb3cab6fabaf0a96cdc2121fef66ee9df8273791d2fffe9115daef77f79784"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json","sha256":"c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md","sha256":"e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"}],"extensions":{"startup":{"state":"已开始过","basis":"当前终端WebView/管理器和旧2月CR、多次实际10/13设备操作均说明已经启动且有实际交付"},"batch":2}},
    {"id":"AS-CURRENT-20261014-32","type":"assessment","target":"REQ-TERMLINK-APP-CODEX","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075","item_id":"REQ-TERMLINK-APP-CODEX"},"target_definition_algorithm":"vnext-product-definition/v1","target_definition_sha256":"3a77fba896b6003868c67a09d6b13ce692610c71cb2d87c49c2818cb9f1e9846","goal_basis":{"kind":"file","path":"docs/product/GOALS.md","sha256":"b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe","item_id":"GOAL-TERMLINK"},"goal_definition_algorithm":"vnext-product-definition/v1","goal_definition_sha256":"08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b","applicability":{"goal_id":"GOAL-TERMLINK","scope_id":"CURRENT-20261014-32","coverage":"本轮完整重评 REQ-TERMLINK-APP-CODEX 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"},"checked_at":"2026-10-14T19:25:36.973104+00:00","subject":{"kind":"commit","value":"a78fe55e033bbcb6db816acd2c801de5aa28a081","limitations":"本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"},"implementation":"partial-reported","verification":"mixed-reported","conclusion":"undetermined","sources":[{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"},{"kind":"file","path":"docs/changes/records/CR-20260409-2332-native-closeout.md","sha256":"f56816f0fd2aa565bb1c80e77dd9b1e628a80c20cd7546ff281c00fd474066d6"},{"kind":"file","path":"docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md","sha256":"12fe3ce575a5d5e22eb72dc4a1f18bc5c8490038322125f5a0621b2662ce0c11"},{"kind":"file","path":"android/app/src/main/java/com/termlink/app/MainShellActivity.kt","sha256":"9ee6c4e4056d0d38fb63fe092285b7803a90a506b7e2ee628155126094f2b0e7"},{"kind":"file","path":"docs/product/assessments/ANDROID-20261013.md","sha256":"4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"},{"kind":"file","path":"docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md","sha256":"d2392505b446677960b4f4f945f8617f1d0a407ec04ff22b66a9f6106fe0939a"},{"kind":"file","path":"docs/product/assessments/JOINT-20261013.md","sha256":"48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"},{"kind":"file","path":"src/ws/terminalGateway.js","sha256":"5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"},{"kind":"file","path":"TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md","sha256":"b00bb71d368ab50b0cd04403e587a7cae7d266533edebb9b909e76b9fdd55112"},{"kind":"file","path":"docs/workflow/CONTRACTS.md","sha256":"c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"},{"kind":"file","path":"docs/workflow/DECISIONS.md","sha256":"747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task20260868-s3/report.md","sha256":"7ab9147c9191c759680a5173862362c0bd7e1dd6c85fbf412940d25815735560"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json","sha256":"8420f108e8832398bdd92e898eaa82d8ac4b423d909ba5df7571433013aad2a3"},{"kind":"file","path":"TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md","sha256":"b4ce7320e3baeeeef168847c6dc07f7d6e5d4f1f198907e08b8d6a616a76195b"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md","sha256":"74cb3cab6fabaf0a96cdc2121fef66ee9df8273791d2fffe9115daef77f79784"},{"kind":"file","path":"docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md","sha256":"1420cfc800a31826a6bebcafa17cbe84d3704601da65ccc3bf325be38a1767e6"},{"kind":"file","path":"docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md","sha256":"fcc1ff5a866d55311611242b529f622135bd9597f0b1ce89c6e7912a5b7e370f"},{"kind":"file","path":"docs/product/history/maintenance-20261011/TASK832-close-report.md","sha256":"7a5eec7b35440317bcab207b0d066809583349bdebce4cc3d65cbedaa0003607"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json","sha256":"c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md","sha256":"e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"}],"extensions":{"startup":{"state":"已开始过","basis":"4月原生CR、6/7月IPC任务、832/833历史以及868最新修复均实际执行过；不是由父子绑定自动继承启动"},"batch":2}},
    {
      "id": "AS-CURRENT-20261014-33",
      "type": "assessment",
      "target": "REQ-TERMLINK-PERMISSION-MODE",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-PERMISSION-MODE"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "ebdbfdd81e05c0f414be5efc4eec81cd6153f845878be8252b2b36743cffc64b",
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
        "scope_id": "CURRENT-20261014-33",
        "coverage": "本轮完整重评 REQ-TERMLINK-PERMISSION-MODE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
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
          "path": "src/config/privilegeConfig.js",
          "sha256": "11fd8995eab6b4edc60ca6d9d2fe0640bec05cbb7baf488a41b49a37b411c251"
        },
        {
          "kind": "file",
          "path": "src/server.js",
          "sha256": "ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6"
        },
        {
          "kind": "file",
          "path": "docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md",
          "sha256": "7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"
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
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap",
          "sha256": "36ec0a88528703584c15dfeb43c69abe33a7354595f3fae215835eb88e3c6fcb"
        },
        {
          "kind": "file",
          "path": "src/services/ptyService.js",
          "sha256": "4d8cb588edb6c639e7785b91228098998b066bc46f1e7f971ae8c52100f2137b"
        },
        {
          "kind": "file",
          "path": "src/auth/basicAuth.js",
          "sha256": "c86cf29176581d07966d2835c5eb1c940822101258ab212acb772db0c679efc2"
        },
        {
          "kind": "file",
          "path": "src/config/securityGates.js",
          "sha256": "141dda6331dcacb7009ca0815c39b57836cbf4c471d9e8868c6cccab93287309"
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
          "basis": "a6ceeec/76e76f8 CR已有真实实施；当前配置解析、server和PTY路径均存在，非从无绑定推断"
        },
        "batch": 2
      }
    },
    {
      "id": "AS-CURRENT-20261014-34",
      "type": "assessment",
      "target": "REQ-TERMLINK-STARTUP-SAFETY",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-STARTUP-SAFETY"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "bf5a8daf57161c486c616c9a1b7478bc3b9efb9a18f28e41aedcfb9423d8072b",
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
        "scope_id": "CURRENT-20261014-34",
        "coverage": "本轮完整重评 REQ-TERMLINK-STARTUP-SAFETY 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "delivered-reported",
      "verification": "pass-reported",
      "conclusion": "undetermined",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
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
          "path": "src/server.js",
          "sha256": "ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md",
          "sha256": "212136718e3073240b870c07b99c385812a37089486102e94012bcf1d971ef8e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap",
          "sha256": "36ec0a88528703584c15dfeb43c69abe33a7354595f3fae215835eb88e3c6fcb"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/runtime-gates-result.json",
          "sha256": "2fde295c386ef20be97a233d3349ef50eee575074efa275aa6818c78d5c32d9f"
        },
        {
          "kind": "file",
          "path": "src/services/auditService.js",
          "sha256": "a9e0d03f3965b4d890c207953a5e1b4789237238252bc04881c1b42565c669db"
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
          "basis": "2月实施CR、后续host检测代码和10/13真实启动拒绝直接证明已执行过；不是只准备任务"
        },
        "batch": 2
      }
    },
    {
      "id": "AS-CURRENT-20261014-35",
      "type": "assessment",
      "target": "REQ-TERMLINK-SOURCE-IP",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-SOURCE-IP"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "c0de914a6d6cec983a599b77e9a102752f1a0ded3d4913e005a14770ace2d795",
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
        "scope_id": "CURRENT-20261014-35",
        "coverage": "本轮完整重评 REQ-TERMLINK-SOURCE-IP 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "delivered-reported",
      "verification": "pass-reported",
      "conclusion": "undetermined",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "src/utils/ipCheck.js",
          "sha256": "f3a14ad4e0af4ad76f5329a08d225d931786c3846a2ce200a9343af84c2ab0a1"
        },
        {
          "kind": "file",
          "path": "tests/ipCheck.test.js",
          "sha256": "d85118bae1cc7b71fe483dd969251aecea21a8526c8c211cb97785a1c0116b1a"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md",
          "sha256": "212136718e3073240b870c07b99c385812a37089486102e94012bcf1d971ef8e"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
        },
        {
          "kind": "file",
          "path": "src/server.js",
          "sha256": "ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6"
        },
        {
          "kind": "file",
          "path": "src/auth/basicAuth.js",
          "sha256": "c86cf29176581d07966d2835c5eb1c940822101258ab212acb772db0c679efc2"
        },
        {
          "kind": "file",
          "path": "src/routes/sessions.js",
          "sha256": "d646071995865a382f7f789ddb54e8239b8ec48c779cfe351b84601041332607"
        },
        {
          "kind": "file",
          "path": "docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md",
          "sha256": "7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md",
          "sha256": "6349a627e41507617257d34ad659fa63b822b599514ec2d0c5079eee628f4227"
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
          "basis": "76e76f8、9ccfd3d1、5b32acaa有实现/修复活动且当前函数和消费入口存在"
        },
        "batch": 2
      }
    },
    {
      "id": "AS-CURRENT-20261014-36",
      "type": "assessment",
      "target": "REQ-TERMLINK-AUDIT-TRACE",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-AUDIT-TRACE"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "312db88676da6a3b681eb187d9c1b0f2743dbc8011426a05cd535468d1e2a29f",
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
        "scope_id": "CURRENT-20261014-36",
        "coverage": "本轮完整重评 REQ-TERMLINK-AUDIT-TRACE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "partial-reported",
      "verification": "pass-reported",
      "conclusion": "partially-satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
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
          "path": "tests/auditService.test.js",
          "sha256": "2a6a92fd0593c88dbb771b00dbda5ca312e695879add7eb1f8ccf1c4f4c32ed2"
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
          "path": "src/auth/basicAuth.js",
          "sha256": "c86cf29176581d07966d2835c5eb1c940822101258ab212acb772db0c679efc2"
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
          "path": "docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md",
          "sha256": "7469296f36308d847023229fc6bb9f1845189029313be9449404fe7043562f97"
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
          "basis": "2月CR及3月9ccfd3d1/5b32acaa有实现和修复，不能记未开始；历史SUMMARY全量措辞不能覆盖当前逐点缺口"
        },
        "batch": 2
      }
    },
    {
      "id": "AS-CURRENT-20261014-37",
      "type": "assessment",
      "target": "REQ-TERMLINK-CLIENT-RISK",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-CLIENT-RISK"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "f843eedca7c9ba9e254ef819d250061423b6d3f56fcc7fe8cd20d2de95dd147f",
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
        "scope_id": "CURRENT-20261014-37",
        "coverage": "本轮完整重评 REQ-TERMLINK-CLIENT-RISK 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "partial-reported",
      "verification": "pass-reported",
      "conclusion": "undetermined",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
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
          "path": "docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md",
          "sha256": "6349a627e41507617257d34ad659fa63b822b599514ec2d0c5079eee628f4227"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s2/report.md",
          "sha256": "f29b791e692cad1842209f2bb63040a8a5166924896b7b014c9e7a5a474eab9e"
        },
        {
          "kind": "file",
          "path": "public/terminal_client.js",
          "sha256": "6eff45696997ffcbc3b2313c451ec38b2d9bd4e8958ad9743317e164c01306ba"
        },
        {
          "kind": "file",
          "path": "public/terminal.js",
          "sha256": "9d2f8e2dfd1a2adc09f6d5d43242997e975b9d168d8d2e64fb342f5d8914b702"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/MainShellActivity.kt",
          "sha256": "9ee6c4e4056d0d38fb63fe092285b7803a90a506b7e2ee628155126094f2b0e7"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/web/TerminalEventBridge.kt",
          "sha256": "afde5b82024f0d8d3511133c9d36a4b862f0d2e39fdfccb4fcb8cbfcf6cc8b5f"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt",
          "sha256": "b588d7d4aaf15e0ef0653416670770e77d46d9f6167f00a9465d7b6358949ff7"
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
          "basis": "a6ceeec客户端桥接及Android风险提示已有实现；缺子项TaskBinding不影响启动判断"
        },
        "batch": 2
      }
    },
    {
      "id": "AS-CURRENT-20261014-38",
      "type": "assessment",
      "target": "REQ-TERMLINK-SESSION-CONTINUITY",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-SESSION-CONTINUITY"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "afe5086639eb07d74868f1dc25e4e97831f2023b3004847b7db255f7145636f0",
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
        "scope_id": "CURRENT-20261014-38",
        "coverage": "本轮完整重评 REQ-TERMLINK-SESSION-CONTINUITY 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
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
          "path": "src/services/sessionManager.js",
          "sha256": "dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json",
          "sha256": "da7773fc6a798e5e3c7a27e7a75fed93db7e221b71df89fcf917da9c5f696d56"
        },
        {
          "kind": "file",
          "path": "src/services/ptyService.js",
          "sha256": "4d8cb588edb6c639e7785b91228098998b066bc46f1e7f971ae8c52100f2137b"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md",
          "sha256": "d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s2/report.md",
          "sha256": "f29b791e692cad1842209f2bb63040a8a5166924896b7b014c9e7a5a474eab9e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s3/network-result.json",
          "sha256": "ae50020be6b5967e17caa297734acc06e05b83395f52e928219f2b3f9d5967ab"
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
          "basis": "67bc2c3/f4ce64f实现历史+当前代码+10/13真实同ID/PID证据证明已开始并有核心交付"
        },
        "batch": 2
      }
    },
    {"id":"AS-CURRENT-20261014-39","type":"assessment","target":"REQ-TERMLINK-SESSION-TTL","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075","item_id":"REQ-TERMLINK-SESSION-TTL"},"target_definition_algorithm":"vnext-product-definition/v1","target_definition_sha256":"5d86adc841042e7de71332a4446760bb6de70fb00d6f0c9a27bdfe2e3bc90624","goal_basis":{"kind":"file","path":"docs/product/GOALS.md","sha256":"b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe","item_id":"GOAL-TERMLINK"},"goal_definition_algorithm":"vnext-product-definition/v1","goal_definition_sha256":"08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b","applicability":{"goal_id":"GOAL-TERMLINK","scope_id":"CURRENT-20261014-39","coverage":"本轮完整重评 REQ-TERMLINK-SESSION-TTL 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"},"checked_at":"2026-10-14T19:25:36.973104+00:00","subject":{"kind":"commit","value":"a78fe55e033bbcb6db816acd2c801de5aa28a081","limitations":"本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"},"implementation":"delivered-reported","verification":"pass-reported","conclusion":"satisfied","sources":[{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"},{"kind":"file","path":"src/services/sessionManager.js","sha256":"dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"},{"kind":"file","path":"docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md","sha256":"64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8"},{"kind":"file","path":"docs/product/history/maintenance-20261011/joint-validation-20261013/retention.test.cjs","sha256":"1fcc056aa6adc7711fbbdcb1a4cbf44efc7e9980a5be5b06785bc2d0e69568a4"},{"kind":"file","path":"docs/product/history/maintenance-20261011/joint-validation-20261013/retention-completed.tap","sha256":"62143779fc2b4fcba2d6bd3afe2598b945571f576823d9ce94ab625b516f0564"},{"kind":"file","path":"docs/changes/records/CR-20260224-0000-session-ttl-24h.md","sha256":"f202b1a9f4221781a6ff62883b4701dc605b08ccf06cc775db45b3c1091eda2f"},{"kind":"file","path":".env.example","sha256":"ce4c2fe7a9b71cb3004dadc2fe56e245339eefaf2b2f5165042b9a8688ac8552"},{"kind":"file","path":"docs/product/DELIVERY_RECONCILIATION.md","sha256":"999fb929ab43dfb015a718e1f32145eefd6bb3d95ef8db031ad40a8e50a41922"},{"kind":"file","path":"docs/product/requirements/REQ-20260222-session-retention-reconnect.md","sha256":"1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json","sha256":"c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md","sha256":"e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"}],"extensions":{"startup":{"state":"已开始过","basis":"67bc2c3生命周期实现与1899f6d配置变更均真实发生；有10/13边界运行证据"},"batch":2}},
    {
      "id": "AS-CURRENT-20261014-40",
      "type": "assessment",
      "target": "REQ-TERMLINK-SESSION-CAPACITY",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-SESSION-CAPACITY"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "bc235f9557f4b90286e69dd32e336ac248d7c5aa973e0d509c602944a4ab754d",
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
        "scope_id": "CURRENT-20261014-40",
        "coverage": "本轮完整重评 REQ-TERMLINK-SESSION-CAPACITY 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
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
          "path": "src/services/sessionManager.js",
          "sha256": "dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md",
          "sha256": "64ba816c664f3526ba058c1757bd77d5961f787b9a890b168d5247eeae9ce0e8"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/retention.test.cjs",
          "sha256": "1fcc056aa6adc7711fbbdcb1a4cbf44efc7e9980a5be5b06785bc2d0e69568a4"
        },
        {
          "kind": "file",
          "path": "src/services/ptyService.js",
          "sha256": "4d8cb588edb6c639e7785b91228098998b066bc46f1e7f971ae8c52100f2137b"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/retention-completed.tap",
          "sha256": "62143779fc2b4fcba2d6bd3afe2598b945571f576823d9ce94ab625b516f0564"
        },
        {
          "kind": "file",
          "path": "src/routes/sessions.js",
          "sha256": "d646071995865a382f7f789ddb54e8239b8ec48c779cfe351b84601041332607"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md",
          "sha256": "d571f5550cb3caa7c38f3b7e600d73a2830424ecfc5a90afa78bcaddffd948a2"
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
          "basis": "67bc2c3/f4ce64f及当前管理器和10/13真实PTY容量检查证明已实施"
        },
        "batch": 2
      }
    },
    {"id":"AS-CURRENT-20261014-41","type":"assessment","target":"REQ-TERMLINK-CONTROL-INPUT","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075","item_id":"REQ-TERMLINK-CONTROL-INPUT"},"target_definition_algorithm":"vnext-product-definition/v1","target_definition_sha256":"d5b65175c4506146d0506d847ccd5081b54810cf6dac610472408db0090cfd62","goal_basis":{"kind":"file","path":"docs/product/GOALS.md","sha256":"b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe","item_id":"GOAL-TERMLINK"},"goal_definition_algorithm":"vnext-product-definition/v1","goal_definition_sha256":"08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b","applicability":{"goal_id":"GOAL-TERMLINK","scope_id":"CURRENT-20261014-41","coverage":"本轮完整重评 REQ-TERMLINK-CONTROL-INPUT 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"},"checked_at":"2026-10-14T19:25:36.973104+00:00","subject":{"kind":"commit","value":"a78fe55e033bbcb6db816acd2c801de5aa28a081","limitations":"本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"},"implementation":"partial-reported","verification":"mixed-reported","conclusion":"partially-satisfied","sources":[{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"},{"kind":"file","path":"public/terminal_shortcut_input.js","sha256":"e754e77db27bdb5411b2c82d4e8344301a19472112dfffb504f549f66788f43d"},{"kind":"file","path":"public/terminal_client.js","sha256":"6eff45696997ffcbc3b2313c451ec38b2d9bd4e8958ad9743317e164c01306ba"},{"kind":"file","path":"public/terminal.js","sha256":"9d2f8e2dfd1a2adc09f6d5d43242997e975b9d168d8d2e64fb342f5d8914b702"},{"kind":"file","path":"docs/product/assessments/ANDROID-20261013.md","sha256":"4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"},{"kind":"file","path":"docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json","sha256":"c013a6d7e0e75430618ec5d8cb70dd4a8fbac571098e9a499bb6fa399dd292cd"},{"kind":"file","path":"docs/product/history/maintenance-20261011/android-validation-20261013/terminal-touch-controls.json","sha256":"0976f550277c322b61d515914e715f7968ec72b69d59cf65fb68abce91892006"},{"kind":"file","path":"docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md","sha256":"10f5226c4bdd97c24d705913490a227733414cf261035fa44c7878542ba1d0ab"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json","sha256":"c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md","sha256":"e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"}],"extensions":{"startup":{"state":"已开始过","basis":"e975244等原CR实施、现存三态模块及10/13实测均证明已开始；已知失败不是未开始"},"batch":2}},
    {
      "id": "AS-CURRENT-20261014-42",
      "type": "assessment",
      "target": "REQ-TERMLINK-TOUCH-SCROLL",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-TOUCH-SCROLL"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "adfecfa798594f97dc2e485dff03305ccc99b73bb9559c99fa9d80a199ac1234",
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
        "scope_id": "CURRENT-20261014-42",
        "coverage": "本轮完整重评 REQ-TERMLINK-TOUCH-SCROLL 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
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
          "path": "public/terminal_client.js",
          "sha256": "6eff45696997ffcbc3b2313c451ec38b2d9bd4e8958ad9743317e164c01306ba"
        },
        {
          "kind": "file",
          "path": "public/terminal.js",
          "sha256": "9d2f8e2dfd1a2adc09f6d5d43242997e975b9d168d8d2e64fb342f5d8914b702"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md",
          "sha256": "d2392505b446677960b4f4f945f8617f1d0a407ec04ff22b66a9f6106fe0939a"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md",
          "sha256": "64d5f6d86a07d9afad72ab147b4783f2fb0ee579a1685579a91defab3416b537"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix.md",
          "sha256": "144d68ff623ff5818b90f96ab29f9c5adf788f959adbda9b60533cdb287e87db"
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
          "basis": "2月实现/3月修复有CR，10/13现对象真机滚动证明；当前触摸源码与4d586e一致"
        },
        "batch": 2
      }
    },
    {
      "id": "AS-CURRENT-20261014-43",
      "type": "assessment",
      "target": "REQ-TERMLINK-EXTERNAL-SESSIONS",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-EXTERNAL-SESSIONS"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "c152ff97f79127dcf2b54be5e7c66a86bb1b53613e7e9119cd7b5c331a19b79f",
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
        "scope_id": "CURRENT-20261014-43",
        "coverage": "本轮完整重评 REQ-TERMLINK-EXTERNAL-SESSIONS 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
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
          "path": "android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt",
          "sha256": "5713c9f45d4061b262660673f84cd275f76a1afc59b3f579e4480a67b85aae5c"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt",
          "sha256": "34d8fda96575e05142bb9390d3e74148d82c9aa54a5ffb225e01794ac86a7ac1"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md",
          "sha256": "1cd49f82707f7c6860e89f023385701bfe02b811de5f96a876d81caf5619337e"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json",
          "sha256": "ced1e411c816b14c66a7d037c4800986b77c04e23e0fa173555e423c9f19a9e3"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/external-close-loop.json",
          "sha256": "ecafd36c54adbe4fd3f9969e088657c3e21fa696449eb7a81b8b9ef6f0e37085"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/MainShellActivity.kt",
          "sha256": "9ee6c4e4056d0d38fb63fe092285b7803a90a506b7e2ee628155126094f2b0e7"
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
          "basis": "ab47cb8完整POC与当前store/UI直接实现；10/13真实CRUD/reopen已执行，旧原Task缺失不影响"
        },
        "batch": 2
      }
    },
    {
      "id": "AS-CURRENT-20261014-44",
      "type": "assessment",
      "target": "REQ-TERMLINK-EXTERNAL-REFRESH",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-EXTERNAL-REFRESH"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "7ee7296ac3cbc65587f02ecfe51d33b4de51a9a9537cfa7ca38c98458168df05",
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
        "scope_id": "CURRENT-20261014-44",
        "coverage": "本轮完整重评 REQ-TERMLINK-EXTERNAL-REFRESH 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:25:36.973104+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "delivered-reported",
      "verification": "pass-reported",
      "conclusion": "undetermined",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
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
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/external-wrong-credential-8.txt",
          "sha256": "29181938f6a3573e202e37931ad28f612cae5886aa246cc81648a3febb400586"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt",
          "sha256": "5713c9f45d4061b262660673f84cd275f76a1afc59b3f579e4480a67b85aae5c"
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
          "basis": "ab47cb8初始signature及d675956 External刷新repair，10/13凭据实际闭环；已有实现与执行"
        },
        "batch": 2
      }
    }
  ]
}
---

# TermLink current需求分批重评 2 / 3

固定基线 `a78fe55e033bbcb6db816acd2c801de5aa28a081`；本批22项，详细判断只保存在各单target报告，原历史报告不改写。

## [AS-CURRENT-20261014-23] 服务端能力要求

<a id="AS-CURRENT-20261014-23"></a>

### 覆盖范围

需求：[REQ-TERMLINK-SERVER](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-SERVER)。本轮完整重评 REQ-TERMLINK-SERVER 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。服务端不是仅有分组：实际session/PTY入口、2月CR、5月发行task、7月IPC/history与868修复/运行记录均直接存在；可证已开始过

结论：**undetermined**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 会话/PTY、管理、续接、TTL容量及metadata恢复 | manager+store+PTY+gateway有完整主体路径，restart恢复metadata为IDLE而非重建旧PTY | 10/13真实服务同ID/PID/变量/resize/CRUD、5/5 retention/capacity；元数据恢复为当前静态代码证据 | 本功能点未识别明确欠交；不等于发布认证 | 服务进程重启metadata完整字段仍未核；TTL的24h增量按现行CR配置/文档范围已证，不将缺墙钟长跑列欠交 | src/services/sessionManager.js；src/repositories/sessionStore.js；src/services/ptyService.js；src/ws/terminalGateway.js；docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json；docs/product/history/maintenance-20261011/joint-validation-20261013/retention-completed.tap |
| 认证权限、启动门禁、来源限制和审计 | 配置模式/实际进程检测、Basic/cookie、WS白名单、JSONL审计均存在；868registration bug已经修复 | 86846/46内部+23实际网络拒绝/兼容，源码manifest匹配；10/13实际非admin受控启动拒绝 | 当前拒绝trace/会话操作审计缺口；独立Web风险消费未找到 | 管理员正向联合、HTTP白名单范围/全部来源实网不充分；不新增App提权/OS降权要求 | src/config/securityGates.js；src/config/privilegeConfig.js；src/services/auditService.js；src/utils/ipCheck.js；src/ws/terminalGateway.js；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json |
| Codex接入、配置、定向订阅和同线程控制 | 原gateway/feed及owner模式；following引用与reconnect replay、IPC单一authority保持 | 20260629任务和10/13定向surface/真实发送回复；8/14live replay第三步真实A↔B↔A通过，尾部只显示不改SQLite | 端到端Plan/options已知失败仍保留，不能把UI失败反推所有server路径坏 | 第4步needs_canonical/source_gap后续、全部Desktop/VSCode双向和host能力未核 | TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；src/services/codexIpcFeed.js；src/ws/terminalGateway.js；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md；docs/product/history/maintenance-20261011/joint-validation-20261013/ipc-reconnect-summary.json；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-50 |
| 安装发行、配置、自启和证书工具 | 五月Win/Linux工具、七月自包含Windows CLI/GUI与LinuxFHS安装器已有实施 | 五月task30/30+99/99及用户host确认；七月Linux33/33与当时包构建通过；10/13Windows内置Node实际health/mTLS启停 | 当前Linux打包缺相应Rust artifact属已保存阻塞，尚无当前全安装闭环 | Windows clean-host用户暂缓；arm64/systemd/Nginx/tag当前范围未核，不说工具从未实现 | TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md；docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md；docs/changes/records/CR-20260715-1635-linux-interactive-installer.md；docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-17 |
| 历史只读解析、持久投影、查询与详情 | single Rust进程/请求、Node singleton协调与SQLite产品查询；不改变IPC实时权威 | 832三类product_db与手机durableACK/选定详情、833真实Rust→Node→SQLite隔离43/43；18核心SHA匹配当前 | 大工具完整详情入口缺口影响端到端范围，但不自动判DB丢失 | 005/831自然增长older/迟到竞态未完整核；旧已发布v1迁移明确退出 | docs/codex/codex-rollout-collector-architecture.md；src/server.js；docs/product/history/maintenance-20261011/TASK832-close-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-68 |
| 已采用Workspace只读API与文件/差异能力 | workspace router含注册边界、tree/file/segment/status/diff/search/compare/download读取，无写入接口 | 10/13真实独立Git目录/文本/HEAD新增行+Basic下载401/200和SHA正确 | PDF客户端module失败另列，不直接归server路由失败 | 全路径安全/搜索/双文件/全部格式和原Task其他细目尚未在本父项全复核 | src/routes/workspace.js；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-09；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-61 |
| 已采用服务端诊断及取证 | diagnosticLog按开关JSONL/50MiB容量、字段脱敏/fail-open；采集脚本已有任务交付 | 20260726-002专项检查及采集manifest/raw/timeline smoke通过；全npm旧timeout原样保留 | 本功能点未识别明确欠交；不等于发布认证 | 九类问题有取证不表示九类业务都修好；原始完整采集输出未逐个复查 | TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md；src/services/diagnosticLog.js；src/server.js |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [src/services/sessionManager.js](../../../src/services/sessionManager.js)
- [src/repositories/sessionStore.js](../../../src/repositories/sessionStore.js)
- [src/services/ptyService.js](../../../src/services/ptyService.js)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json](../history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/retention-completed.tap](../history/maintenance-20261011/joint-validation-20261013/retention-completed.tap)
- [src/config/securityGates.js](../../../src/config/securityGates.js)
- [src/config/privilegeConfig.js](../../../src/config/privilegeConfig.js)
- [src/services/auditService.js](../../../src/services/auditService.js)
- [src/utils/ipCheck.js](../../../src/utils/ipCheck.js)
- [docs/product/history/maintenance-20261011/task20260868-s2/report.md](../history/maintenance-20261011/task20260868-s2/report.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/report.md](../history/maintenance-20261011/task20260868-s3/report.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json](../history/maintenance-20261011/task20260868-s3/source-manifest.json)
- [TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md](../../../TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md)
- [src/services/codexIpcFeed.js](../../../src/services/codexIpcFeed.js)
- [docs/workflow/CONTRACTS.md](../../workflow/CONTRACTS.md)
- [docs/workflow/DECISIONS.md](../../workflow/DECISIONS.md)
- [TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md](../../../TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/ipc-reconnect-summary.json](../history/maintenance-20261011/joint-validation-20261013/ipc-reconnect-summary.json)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md](../../../TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md)
- [docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md](../../workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md)
- [docs/changes/records/CR-20260715-1635-linux-interactive-installer.md](../../changes/records/CR-20260715-1635-linux-interactive-installer.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap](../history/maintenance-20261011/joint-validation-20261013/focused-settled.tap)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/codex/codex-rollout-collector-architecture.md](../../codex/codex-rollout-collector-architecture.md)
- [src/server.js](../../../src/server.js)
- [docs/product/history/maintenance-20261011/TASK832-close-report.md](../history/maintenance-20261011/TASK832-close-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md](../history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md](../history/maintenance-20261011/current-assessment-20261012/history-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md](../history/maintenance-20261011/current-assessment-20261012/history-832review-report.md)
- [src/routes/workspace.js](../../../src/routes/workspace.js)
- [TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md](../../../TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md)
- [src/services/diagnosticLog.js](../../../src/services/diagnosticLog.js)

### 剩余与待核对

- 先处理已证端到端用户阻断并明确审计窄范围，再核metadata重启、权限正向等原证据；发行按真实平台artifact前提推进且保留Windows暂缓。父层只汇总实际功能，不按子项数计算

依赖与排序依据：

- 会话metadata依赖SessionStore；服务端历史依Rust兼容→Node事务/provider；release依相应平台artifact；实时与历史不可互改authority

尚未核对/不可得材料：

- Workspace完整原任务/安全矩阵、diagnostics完整原始日志、SERVER-CODEX后续范围在专项批次；本父项没有全产品独立验收

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-24] Web客户端能力要求

<a id="AS-CURRENT-20261014-24"></a>

### 覆盖范围

需求：[REQ-TERMLINK-WEB](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-WEB)。本轮完整重评 REQ-TERMLINK-WEB 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。20260715-002真实实施与111/111/浏览器QA、当前terminal.js和10/13真实浏览器操作是直接启动依据，不依父子绑定

结论：**undetermined**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 浏览器独立安全登录/登出及API兼容 | Web任务实现opaque cookie短期HttpOnly/SameSite Strict、HTTPS Secure、single-use WS ticket和Basic/API兼容 | 20260715-002 111/111及实际Edge宽屏/窄屏QA；10/13真实创建、切换、刷新续接 | 本功能点未识别明确欠交；不等于发布认证 | 旧QA只属该锁定页面和对象，完整浏览器/当前TLS全部组合未全核，不新加矩阵要求 | TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；src/auth/basicAuth.js；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-22 |
| 会话入口、终端主工作区及连接管理 | terminal.js会话列表/创建更新删除、WS会话Id/终端焦点fit与尺寸机制已实施 | 10/13真实Edge输入/刷新同PID和变量、服务端resize97x29、改名删除/PTY释放成功 | 本功能点未识别明确欠交；不等于发布认证 | 全窄屏物理触控与无障碍状态未全核；Android首次设备应答污染不直接推为Web同样失败 | public/terminal.js；src/ws/terminalGateway.js；docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-22；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-62 |
| Ctrl/Alt三态、CR/LF和本地触摸滚动 | 与Android共享shortcut模块，Web独立接线；viewport本地touch惯性滚动存在 | 原键盘CR和滚动记录证明已有实施；10/13Android各字节部分PASS/首次once失败保留为共享风险 | 同模块once焦点路径要定位是否也影响Web，不能把手机失败直接升级Web复现 | 本轮浏览器资源错误阻断完整字节/物理触控对照，不视产品失败 | public/terminal_shortcut_input.js；public/terminal.js；docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md；docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-20；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-44 |
| Codex主页导航、IPC页面、真实配置与单PATH | 六月主页/Codex页面及七月配置catalog/单路径原任务存在，当前gateway实时接线 | 10/13Edge可进入Codex页面，PATH/config来自实际host；定向surface有自己fileContext | Docs按钮实际开/docs/workflow/STATUS.md返回Cannot GET，当前public路径未由868改变 | 全部审批/Plan及Desktop/VSCode原生双向范围仍未完整核 | docs/product/MANAGED_REQUIREMENTS.md；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；src/ws/terminalGateway.js；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-22；docs/product/history/maintenance-20261011/joint-validation-20261013/ipc-reconnect-summary.json |
| 既有Workspace只读及系统语言、风险提示 | workspace API及页面入口已实施；language closeout26/26/398key；独立Web未见privilegeLevel消费 | 10/13App嵌入Workspace目录/HEAD/下载可证共用链局部；不冒充Web页面全验 | Docs导航失败须修；Android嵌入PDF/i18n反例提示共享资源问题，须按Web独立路径核根因 | Web风险提示消费和完整Workspace预览/搜索/compare尚未核完，不能从代码不存在调用就虚构跨端认证 | docs/changes/records/CR-20260330-0500-language-normalization-closeout.md；src/routes/workspace.js；public/terminal.js；public/terminal_client.js；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-22；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-09 |
| P1.11及P2.3增强主题 | 已有登录/会话反馈/可访问操作是局部映射，其余原主题未定义 | 当前本项正文明确未充分定义，不从已存在颜色/UiPreferences推全部覆盖 | 本功能点未识别明确欠交；不等于发布认证 | 需要原材料/用户明确剩余具体行为；当前不是可直接开工的新矩阵或认证 | docs/product/MANAGED_REQUIREMENTS.md |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)
- [src/auth/basicAuth.js](../../../src/auth/basicAuth.js)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [public/terminal.js](../../../public/terminal.js)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json](../history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json)
- [public/terminal_shortcut_input.js](../../../public/terminal_shortcut_input.js)
- [docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md](../../changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md)
- [docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md](../../changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/ipc-reconnect-summary.json](../history/maintenance-20261011/joint-validation-20261013/ipc-reconnect-summary.json)
- [docs/changes/records/CR-20260330-0500-language-normalization-closeout.md](../../changes/records/CR-20260330-0500-language-normalization-closeout.md)
- [src/routes/workspace.js](../../../src/routes/workspace.js)
- [public/terminal_client.js](../../../public/terminal_client.js)

### 剩余与待核对

- 先修Docs导航真实反例并核共享输入风险；完整控件/Workspace未知定位回原task范围，保留已证登录/会话续接。未定义增强先澄清，不自动扩需求

依赖与排序依据：

- Web入口依既有auth/session/ws契约；Docs依正确Workspace路由不是另一历史DB；不需等待Android全部完成

尚未核对/不可得材料：

- 六月两个Web task原始全文及60716数据修复在batch1专项；本父项只读其定义/现行报告且未替代专项；未知P1.11/P2.3

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-25] App客户端能力要求

<a id="AS-CURRENT-20261014-25"></a>

### 覆盖范围

需求：[REQ-TERMLINK-APP](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-APP)。本轮完整重评 REQ-TERMLINK-APP 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。旧Android实际CR/源码+3月真机缓存/mTLS+4月原生+7月诊断+10/13设备场景及868修复，直接证明父范围已开始过且多处实际交付

结论：**undetermined**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 终端WebView继续保留及原共享输入/滚动/会话 | MainShell + terminal_client与Sessions入口仍有实际产品实现 | 10/13真实CRUD、文字/空白/IME滚动成功；首次ESC设备应答污染、onceCtrl和两次Wi-Fi恢复失败并存 | 三项明确终端反例未在868范围修复 | 全部IME/尺寸/网络根因及Web对照未核，服务端同session保留成功不能替代端侧恢复 | android/app/src/main/java/com/termlink/app/MainShellActivity.kt；public/terminal_client.js；android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-34；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-44；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-45 |
| 原生Codex、运行/后台通知、共享实时和静态历史 | 4月原生入口移除旧回退、6/7月follower实时及832产品历史、868提示清理皆已交付局部 | 10/13冷启动/发送回复/审批/通知/网络恢复有通过；868三UI+46/46+23检查限定修复已证 | Plan选项、多Skill覆盖、content://文档、大详情约165行无完整入口仍有已知反例 | 全部模型/配置/原生适配边界/历史older与受控迟到未全核 | docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md；TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；docs/product/history/maintenance-20261011/TASK832-close-report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt |
| Profile/External本地会话及地址/凭据刷新 | ExternalStore CRUD/touch/persist、MainShell签名与resolver重载；Profile独立配置存在 | 10/13实际External create/open/rename/delete/force-stop保留，错误凭据→修正后同会话可开 | 本功能点未识别明确欠交；不等于发布认证 | 地址变化及删除当前Profile重载闭环未核；不把会话删除当Profile删除 | android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-46；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-47 |
| 远端会话缓存首屏、状态、回写和防旧generation | SessionListCacheStore以profile+baseUrl/auth缓存；Sessions先本地首屏再刷新、status及generation guard | 3/25真实LYA-TL00 Android10 instrumentation34/34闭环；当前cache路径代码存在 | 本功能点未识别明确欠交；不等于发布认证 | 原34项范围不是本轮重跑/所有并发故障认证；保存原已证成果而不据SUMMARY“全交付”覆盖新增场景 | docs/changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md；docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md；android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt |
| Profile运行时mTLS与原生/WebView复用 | 既有Profile专用证书/口令/cache及直接服务端TLS路径保留 | 3/27真实PC HTTPS/WSS拒绝/放行+备用Android原生IP HTTPS+mTLS创建；10/13真机导入/移除/External HTTPS、独立native/WebView握手成功 | 本功能点未识别明确欠交；不等于发布认证 | 证书替换/遗留挂起/全模式范围还需逐点核；原8.9已明确不以额外Android前台WSS观察阻塞，不能复活为必欠 | docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-11；android/app/src/main/java/com/termlink/app/MainShellActivity.kt |
| Workspace浏览/文本/HEAD差异/认证下载与打开 | 原生Workspace宿主与server只读API存在 | 10/13实际目录/文本/HEAD、返回、BasicZIP SHA和系统打开及过期探针清理成功 | PDF预览import module失败仍保留 | 搜索/双文件/大文件全部格式、TLS/mTLS下载和完整缓存预算未全核 | docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-09；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-61；src/routes/workspace.js |
| 屏幕超时、系统语言及持久诊断支持 | 当前ScreenTimeoutController按UiPreferences在前台设KEEP_SCREEN_ON、interaction重置、后台清理；locale桥接及diagnostics存在 | 2月timeout构建通过无真机窗口；3月language26/26及key对称、7月diagnostics升级保留与采集smoke；10/13语言实际切换 | 英语环境工具中文/中文环境部分a11y英文仍残留 | 原超时真实idle窗口未在本范围核得；全部fallback语言及诊断privacy矩阵不从局部推满 | docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md；android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；docs/changes/records/CR-20260330-0500-language-normalization-closeout.md；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-12；TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md |
| P1.11多设备、多Profile，P2.2快捷工作流，P2.3主题无障碍未定义部分 | Profile证书/External/缓存等已有明确局部范围，Slash和UiPreferences不是完整工作流需求定义 | 父项明确保留原主题，不声称未定义行为已经做完 | 本功能点未识别明确欠交；不等于发布认证 | 其他具体行为待原材料或用户明确，不新增设备矩阵/提权/CLI/旧CodexWebView回退 | docs/product/MANAGED_REQUIREMENTS.md |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [android/app/src/main/java/com/termlink/app/MainShellActivity.kt](../../../android/app/src/main/java/com/termlink/app/MainShellActivity.kt)
- [public/terminal_client.js](../../../public/terminal_client.js)
- [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt](../../../android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/changes/records/CR-20260409-2332-native-closeout.md](../../changes/records/CR-20260409-2332-native-closeout.md)
- [docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md](../../changes/records/CR-20260411-1714-codex-native-main-entry-removal.md)
- [TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md](../../../TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md](../history/maintenance-20261011/current-assessment-20261012/history-report.md)
- [docs/product/history/maintenance-20261011/TASK832-close-report.md](../history/maintenance-20261011/TASK832-close-report.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/report.md](../history/maintenance-20261011/task20260868-s3/report.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json](../history/maintenance-20261011/task20260868-s3/source-manifest.json)
- [docs/product/history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt](../history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt)
- [android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt](../../../android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt)
- [android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt](../../../android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt)
- [docs/changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md](../../changes/summaries/SUMMARY-REQ-20260324-session-list-local-cache.md)
- [docs/changes/records/CR-20260325-2219-sessions-closeout-validation.md](../../changes/records/CR-20260325-2219-sessions-closeout-validation.md)
- [android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt](../../../android/app/src/main/java/com/termlink/app/data/SessionListCacheStore.kt)
- [docs/changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md](../../changes/records/CR-20260327-1610-phase9-real-device-direct-ip-validation.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [src/routes/workspace.js](../../../src/routes/workspace.js)
- [docs/changes/records/CR-20260224-2145-screen-idle-timeout-restore.md](../../changes/records/CR-20260224-2145-screen-idle-timeout-restore.md)
- [android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt](../../../android/app/src/main/java/com/termlink/app/util/ScreenTimeoutController.kt)
- [docs/changes/records/CR-20260330-0500-language-normalization-closeout.md](../../changes/records/CR-20260330-0500-language-normalization-closeout.md)
- [TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md](../../../TASKS/TASK-20260726-002-persistent-diagnostics-for-known-issues.md)

### 剩余与待核对

- 优先处理真实用户可见阻断：终端3项、Plan/options、多Skill、文档、历史大详情、Workspace PDF和语言残留；其余未知先定位原证据，再决定窄验证。不要重复已证External/缓存/mTLS专项或扩未定义主题

依赖与排序依据：

- 终端故障在WebView链；原生交互依host payload/资源可达；Workspace依只读API；history依provider。彼此可并行，不将发行或全部历史作为全App硬前置

尚未核对/不可得材料：

- 各已采用原子项完整task验收在专项批次核；本父层未声称穷尽所有UI设备/环境。P1.11/P2.2/P2.3未定义部分留待明确

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-26] 服务端认证、权限与审计要求

<a id="AS-CURRENT-20261014-26"></a>

### 覆盖范围

需求：[REQ-TERMLINK-SERVER-AUTH](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-SERVER-AUTH)。本轮完整重评 REQ-TERMLINK-SERVER-AUTH 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。旧权限/认证CR及20260715网页登录任务、868真实repair执行都直接覆盖父项子范围；父项无整体绑定不等未开始

结论：**undetermined**。实现标记 partial-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 标准/受控配置、进程身份及启动安全 | 配置/权限检测/认证强度/mTLS/审计路径门禁在server启动链 | 2月CR、3月修复及10/13普通权限拒绝/standard TLS正向；见同批PERMISSION-MODE和STARTUP-SAFETY | 本功能点未识别明确欠交；不等于发布认证 | 管理员受控正向联合验收未核，禁止把UI提权/OS降权当欠交 | src/config/privilegeConfig.js；src/config/securityGates.js；src/server.js；docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md；docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-37 |
| Basic/浏览器会话/HTTP/WS认证 | basicAuth支持Basic及opaque内存Cookie、single-use ticket；server路由顺序保持 | 20260715-002真实HTTP登录/登出/拒绝/ticket证据；868真实Basic HTTP401/WS4401及23检查 | 本功能点未识别明确欠交；不等于发布认证 | TLS/mTLS+所有客户端联合矩阵未由这两批覆盖 | src/auth/basicAuth.js；src/server.js；TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-s3/network-result.json |
| registration未知/撤销必须拒绝且兼容有效/缺省 | clientRegistrationManager.isActive现先确认记录存在；既有sessions/gateway门禁复用 | 868 S2真实manager+handler46/46、S3本地网络23检查；本次14份源码/接线hash与manifest一致 | 本功能点未识别明确欠交；不等于发布认证 | 前后投影仅id/name/activeConnectionCount，不证明瞬时零attach；内部零副作用只属S2；原子ownership未定位 | src/services/clientRegistrationManager.js；src/routes/sessions.js；src/ws/terminalGateway.js；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json |
| 来源IP限制 | WS actual socket白名单/CIDR已接线，IPv6后续已实现 | 2/3月记录+当前静态函数/测试，不能沿用2月仅IPv4限制 | 本功能点未识别明确欠交；不等于发布认证 | HTTP适用入口及全实网IP矩阵待核 | src/utils/ipCheck.js；src/ws/terminalGateway.js；src/auth/basicAuth.js；docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md |
| 审计关联和客户端风险透传 | 连接start/end trace与Android toast存在；audit拒绝仅clientIp，CRUD无trace审计；Web风险消费未定位 | 已逐点静态核对，既有SUMMARY全量措辞不足 | 会话操作/拒绝关联缺口见AUDIT-TRACE；跨端风险覆盖需核 | elevated真实联合日志、Web风险覆盖仍待核 | src/services/auditService.js；src/ws/terminalGateway.js；src/services/sessionManager.js；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；public/terminal_client.js；public/terminal.js |
| P2.1更细粒度审批/审计原主题保留 | 现有审计只能局部对应，未定义粒度/操作全范围 | 当前父项正文明确未充分定义，不从代码推一个新完整体系 | 本功能点未识别明确欠交；不等于发布认证 | 主题剩余需要用户/原材料进一步明确，不属于本次可自动实施的欠交 | docs/product/MANAGED_REQUIREMENTS.md |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [src/config/privilegeConfig.js](../../../src/config/privilegeConfig.js)
- [src/config/securityGates.js](../../../src/config/securityGates.js)
- [src/server.js](../../../src/server.js)
- [docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md](../../changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md)
- [docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md](../../changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [src/auth/basicAuth.js](../../../src/auth/basicAuth.js)
- [TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/report.md](../history/maintenance-20261011/task20260868-s3/report.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/network-result.json](../history/maintenance-20261011/task20260868-s3/network-result.json)
- [src/services/clientRegistrationManager.js](../../../src/services/clientRegistrationManager.js)
- [src/routes/sessions.js](../../../src/routes/sessions.js)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/product/history/maintenance-20261011/task20260868-s2/report.md](../history/maintenance-20261011/task20260868-s2/report.md)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json](../history/maintenance-20261011/task20260868-s3/source-manifest.json)
- [src/utils/ipCheck.js](../../../src/utils/ipCheck.js)
- [src/services/auditService.js](../../../src/services/auditService.js)
- [src/services/sessionManager.js](../../../src/services/sessionManager.js)
- [android/app/src/main/java/com/termlink/app/MainShellActivity.kt](../../../android/app/src/main/java/com/termlink/app/MainShellActivity.kt)
- [public/terminal_client.js](../../../public/terminal_client.js)
- [public/terminal.js](../../../public/terminal.js)

### 剩余与待核对

- 优先处理原子审计缺口的范围核对，其次真实管理员正向；registration已修且证据匹配，不再列当前缺陷。P2.1先明确范围

依赖与排序依据：

- 受控正向验证需管理员身份、strict mTLS证书、审计路径；不将这些变为所有用户功能启动门槛

尚未核对/不可得材料：

- 全部认证/审计与网络矩阵、registration原子owner、P2.1未定义部分

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-27] 服务端终端与会话要求

<a id="AS-CURRENT-20261014-27"></a>

### 覆盖范围

需求：[REQ-TERMLINK-SERVER-SESSIONS](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-SERVER-SESSIONS)。本轮完整重评 REQ-TERMLINK-SERVER-SESSIONS 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。67bc2c3等原CR及现有完整session runtime和10/13实际PTY路径证明已开始；元数据代码明确存在

结论：**undetermined**。实现标记 partial-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 终端输入输出和resize | PTY写入/resize与gateway input/resize桥接、bounded快照已存在 | 10/13实际PowerShell/HTTP/WS resize97x29、断开输出回放及双客户端计数通过 | 本功能点未识别明确欠交；不等于发布认证 | 服务端路径可证，不把客户端首次输入污染推为PTY服务端根因；全部协议组合未核 | src/services/ptyService.js；src/ws/terminalGateway.js；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-30；docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json |
| 基本会话管理与显式资源释放 | sessions router+manager create/list/update/delete；delete杀PTY、删map并调度保存 | 10/13真机管理和真实服务端同id改名/删除、进程释放通过 | 本功能点未识别明确欠交；不等于发布认证 | 不扩为离线缓存/全并发认证 | src/services/sessionManager.js；src/routes/sessions.js；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-63；docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json |
| 断联保留及同id续接 | close不kill；有效id复用、无效拒绝；具体独立项已逐点核对 | 10/13同ID/PID上下文、active0仍存活；868保留legacy/active兼容 | 本功能点未识别明确欠交；不等于发布认证 | Android终端Wi-Fi自动恢复失败属端侧现象，不能代替服务端机制结论 | src/services/sessionManager.js；src/ws/terminalGateway.js；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-41；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md |
| TTL和容量治理 | 6h代码fallback、24h示例；可配置容量50、idle LRU及全active拒绝 | 10/13实际manager/PTY5/5，TTL控制时钟与真实清理timer | 配置/TTL边界和容量已证，当前范围无必须追加24h墙钟长跑的欠交 | 未墙钟等待24h仅为原报告边界；现行24h增量按CR配置/文档核，不把6h fallback列漏改 | src/services/sessionManager.js；docs/changes/records/CR-20260224-0000-session-ttl-24h.md；docs/product/history/maintenance-20261011/joint-validation-20261013/retention-completed.tap；docs/product/history/maintenance-20261011/joint-validation-20261013/retention.test.cjs |
| P0.3会话元数据重启恢复，不承诺PTY跨重启 | SessionStore v3 JSON tmp→rename；构造load、恢复为IDLE，保存name/mode/cwd/workspaceRoot/thread/config/registration；500ms调度与退出flush | 直接静态读取store133–191、manager317–345/479–535；既有CONTRACTS锁定持久化 | 本功能点未识别明确欠交；不等于发布认证 | 未定位真实服务重启后字段完整恢复的本对象结果，故父项不从30号局部PASS升全满足 | src/repositories/sessionStore.js；src/services/sessionManager.js；docs/workflow/CONTRACTS.md |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [src/services/ptyService.js](../../../src/services/ptyService.js)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json](../history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json)
- [src/services/sessionManager.js](../../../src/services/sessionManager.js)
- [src/routes/sessions.js](../../../src/routes/sessions.js)
- [docs/product/history/maintenance-20261011/task20260868-s2/report.md](../history/maintenance-20261011/task20260868-s2/report.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/report.md](../history/maintenance-20261011/task20260868-s3/report.md)
- [docs/changes/records/CR-20260224-0000-session-ttl-24h.md](../../changes/records/CR-20260224-0000-session-ttl-24h.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/retention-completed.tap](../history/maintenance-20261011/joint-validation-20261013/retention-completed.tap)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/retention.test.cjs](../history/maintenance-20261011/joint-validation-20261013/retention.test.cjs)
- [src/repositories/sessionStore.js](../../../src/repositories/sessionStore.js)
- [docs/workflow/CONTRACTS.md](../../workflow/CONTRACTS.md)

### 剩余与待核对

- 先核真实服务重启metadata结果；已证续接/TTL配置边界/容量无需重做。客户端网络恢复另列，不替换服务端基线

依赖与排序依据：

- SessionStore是metadata重启恢复的真实组件前提；PTY跨重启不是前提或义务

尚未核对/不可得材料：

- 原服务进程重启metadata实测；82项旧夹具8失败只保持旧结果，86846/46不等于全部82重跑

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-28] 服务端Codex接入与共享交互要求

<a id="AS-CURRENT-20261014-28"></a>

### 覆盖范围

需求：[REQ-TERMLINK-SERVER-CODEX](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-SERVER-CODEX)。本轮完整重评 REQ-TERMLINK-SERVER-CODEX 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。20260629任务执行和149/149历史验证、当前gateway/feed代码及10/13实际follower行为直接证明已开始

结论：**undetermined**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 对话/配置/线程共享契约 | gateway承接session Codex配置及同thread消息控制；原MVP和native链有多阶段实现 | 20260629真实owner+Android报告与10/13手机发送/文件上下文/回复；不靠归档推全部MVP | 本功能点未识别明确欠交；不等于发布认证 | 模型/推理配置、所有历史过滤/附件/Skill组合由原子项进一步核对 | src/ws/terminalGateway.js；src/services/sessionManager.js；TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；docs/product/assessments/ANDROID-20261013.md；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-16 |
| active conversation follower acquire/release及desired reconnect replay | 当前feed持有desiredFollowing引用/retention、initialize后replay；gateway按选择绑定 | 10/13两次定向订阅得到相同conversation本轮surface；49/49 IPC边界测试为补证 | 本功能点未识别明确欠交；不等于发布认证 | 完整Desktop/VSCode原生双向操作、转移与最终记录逐项核对未完成 | src/services/codexIpcFeed.js；src/ws/terminalGateway.js；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-16；docs/product/history/maintenance-20261011/joint-validation-20261013/ipc-reconnect-summary.json |
| healthy IPC唯一实时权威、owner fallback与同线程控制 | 冻结链保持，Owner经真实resume承载，external Goal明确不支持，canonical仅有界恢复 | 当前契约+历史AD004演进记录；868139/139及同连接受控恢复仅证明局部提示行为；已读8/14第3步人工A↔B↔A成功，1041/1418本地先显、1051/1425surface只显示不写SQLite，不能因task paused推全未做 | 本功能点未识别明确欠交；不等于发布认证 | 第3步已证；第4步needs_canonical/source_gap与更广控制面后续仍未全核 | docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md |
| 审批/Plan/user-input等共享动作不能伪造成功 | 真实审批批准/拒绝可到宿主；Plan问题存在端侧options丢失，部分控制面未闭环 | 10/13审批成功与Plan options反例同时保留；原7/13Task有真实owner approval numeric25→清pending/落文件、PLAN implement turn→pending清除→numeric32审批/文件成功。该原对象成功保留；不能覆盖10/13新Plan options反例，external Goal后续撤回仍按现契约 | Plan/options问题影响端到端共享交互，根因需按wire→UI定位，不能直接归咎server | 仅凭UI失败不认定gateway所有审批路径故障 | docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-50；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-55；docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md；src/ws/terminalGateway.js |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [src/services/sessionManager.js](../../../src/services/sessionManager.js)
- [TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md](../../../TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [src/services/codexIpcFeed.js](../../../src/services/codexIpcFeed.js)
- [docs/workflow/CONTRACTS.md](../../workflow/CONTRACTS.md)
- [docs/workflow/DECISIONS.md](../../workflow/DECISIONS.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/ipc-reconnect-summary.json](../history/maintenance-20261011/joint-validation-20261013/ipc-reconnect-summary.json)
- [docs/product/history/maintenance-20261011/task20260868-s3/report.md](../history/maintenance-20261011/task20260868-s3/report.md)
- [TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md](../../../TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md](../history/maintenance-20261011/android-validation-20261013/验收报告.md)

### 剩余与待核对

- 优先对齐有反例的Plan/options交互，再补当前Desktop/VSCode双向/owner边界所欠原范围证据；保留架构不重构

依赖与排序依据：

- 宿主真实owner协议能力决定能支持的动作；共享模型/配置需同canonical conversation；不要求history全完成才验证实时

尚未核对/不可得材料：

- paused TASK-20260727-002后续独立范围未全文再评；全部MVP任务分批结果由总体汇总关联，不默认完整

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-29] 服务端安装与发行要求

<a id="AS-CURRENT-20261014-29"></a>

### 覆盖范围

需求：[REQ-TERMLINK-SERVER-RELEASE](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-SERVER-RELEASE)。本轮完整重评 REQ-TERMLINK-SERVER-RELEASE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。20260513真实跨平台安装任务+7月已实施的Windows工具及Linux安装器测试/构建尝试，明确已开始过

结论：**undetermined**。实现标记 partial-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| Windows/Linux压缩包、配置、自启、源码打包说明 | 五月RELTASK明确scripts/release/build-release与两平台install/start/uninstall/health、自启入口；README有配置说明 | 原真实task列30/30、99/99及Windows/系统d host用户确认；当前10/13release layout/配置/embedded Node检查有通过 | 本功能点未识别明确欠交；不等于发布认证 | 五月完成仅为原任务对象；不能等价当前所有发行平台 | TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md；docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap |
| direct-server与Nginx两类证书工具、缺OpenSSL明确失败 | 原任务交付两套generate helper与健康检查 | 五月OpenSSL生成smoke；10/13生成配置测试及Windows内嵌Node mTLS服务启停通过 | 本功能点未识别明确欠交；不等于发布认证 | 实际Nginx部署及当前Linux完整包不是配置测试的覆盖 | TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md；docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap |
| Windows x64 Setup/Portable+共享CLI/GUI与persistent配置增量 | 后继Web任务完整保留715-001实现已完成、clean-host唯一未完；内置Node/共享PS工具已存在 | 10/13Windows PS5.1解析、GUI smoke、配置/证书及内嵌Node HTTP/mTLS启停通过 | 无Node/npm干净Windows主机验收按用户历史明确要求暂缓，当前不强判欠交实现 | 不能复用五月PM2 host结果替代七月Setup/Portable clean-host | TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap；docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md |
| Linux交互安装、FHS升级回滚、HTTP/direct/Nginx mTLS、amd64/arm64及tag release | 原REQ/plan和脚本已形成实现；10/13实际构建因缺Linux Rust analyzer产物停止 | 当前配置测试通过、WSL x86_64/systemd可用；有实际构建失败保存；原7/15CR明确33/33、OpenSSL及当时package/checksum/tar检查通过，本地P5不含真实systemd/Nginx/arm64/tag | 当前包产物与systemd/Nginx/升级回滚实装验证尚无闭环 | arm64、tag Release与专用Nginx环境未验；不把WSL存在当安装通过 | docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-17；docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap；docs/changes/records/CR-20260715-1635-linux-interactive-installer.md |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md](../../../TASKS/TASK-20260513-001-provide-cross-platform-release-installer-and-mtls-tooling.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap](../history/maintenance-20261011/joint-validation-20261013/focused-settled.tap)
- [TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md](../../workflow/TECHNICAL_DETAILS-20260715-001-windows-x64-installer-and-config-tool.md)
- [docs/product/requirements/REQ-20260715-linux-interactive-release-installer.md](../requirements/REQ-20260715-linux-interactive-release-installer.md)
- [docs/changes/records/CR-20260715-1635-linux-interactive-installer.md](../../changes/records/CR-20260715-1635-linux-interactive-installer.md)

### 剩余与待核对

- 保留Windows clean-host暂缓；Linux先补合适analyzer发行产物，再在获准专用环境核实装升级/回滚。不要因未有主机就否定历史安装工具交付

依赖与排序依据：

- 当前release打包需要相应OS/arch Rust analyzer产物；systemd/Nginx host前提是真实环境，不是其他业务功能依赖

尚未核对/不可得材料：

- Windows clean-host按历史明确暂缓；当前Linux全安装/arm64/tag发布未核；五月host原始日志仅任务归档报告

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-30] 服务端只读历史采集与持久化要求

<a id="AS-CURRENT-20261014-30"></a>

### 覆盖范围

需求：[REQ-TERMLINK-SERVER-HISTORY](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-SERVER-HISTORY)。本轮完整重评 REQ-TERMLINK-SERVER-HISTORY 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。既有Rust/Node任务和832/833实际执行+server产品接线明确开始；“已归档Node4.5”从不当整链完成

结论：**undetermined**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| Rust只读来源、lineage和三mode有界解析 | 架构与当前正式层冻结外部只读、single process/request、preview/backfill/append；具体兼容经833/832交付 | 已读完整architecture及833S5、832S6/独立审查：共享H1/H3隔离43/43，H2真实branch/来源切点修复 | 本功能点未识别明确欠交；不等于发布认证 | 早期隔离task的完成不等Node/App整链；其他source/budget范围未全核 | docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md |
| Node单例协调、staging ACK、complete后持久化产品投影 | server只创建一个collector/importer/scheduler，product SQLite/provider接线；配置analyzer缺失则禁用收集 | 833实际SQL staging commit先于ACK、complete后产品事务/重开及失败rollback；832三类真实product_db完整范围 | 本功能点未识别明确欠交；不等于发布认证 | 自然增长/全部恢复竞态不由43/43或三样本替代 | src/server.js；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；docs/product/history/maintenance-20261011/TASK832-close-report.md |
| 查询与真实工具详情、App只读消费 | 832 N11/2refs、C22/4、A/D40/9逐行持久，手机每类选定详情可开/切换/force-stop | 原S6+self-check与独立累计审查核对；selected详情469/469/552 bytes，按既有64KiB保留策略 | 本功能点未识别明确欠交；不等于发布认证 | 不推全9条逐一打开、无限输出或全部分页通过 | docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md；docs/product/history/maintenance-20261011/TASK832-close-report.md |
| 专项修复后完整产品链剩余 | 当前保存/增长/委派/branch局部已有证据；10/13大工具约165行视图截断且无完整详情入口 | 新大样本与旧三小样本范围不同，两者并存 | 大详情阅读/复制入口存在当前已知缺口，older/迟到generation仍需核 | 不能由App显示截断直接判定server DB丢失；旧target-v1已发布格式迁移按用户排除，不再算欠交 | docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-68；docs/product/history/maintenance-20261011/android-validation-20261013/history-large.json；docs/product/history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt；docs/product/history/maintenance-20261011/TASK832-close-report.md |

#### 版本适用性

- 精确当前a78fe55；本轮无运行验证
- 832S6对象488dc6c9+Android两文件及F148 APK；833为f2fc146d+隔离tests。原history-version-applicability在bb484969已证明相关Rust/Node源相同，本轮另核这些18源/测试当前hash一致；868仅提示/registration修复，当前ViewModel不能直接宣称等于F148 APK
- 三类真实小样本保留原scope；10/13大详情新样本单列反例；旧v1 migration明确退出而技术失败历史不抹除

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/codex/codex-rollout-collector-architecture.md](../../codex/codex-rollout-collector-architecture.md)
- [docs/workflow/CONTRACTS.md](../../workflow/CONTRACTS.md)
- [docs/workflow/DECISIONS.md](../../workflow/DECISIONS.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md](../history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md](../history/maintenance-20261011/current-assessment-20261012/history-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md](../history/maintenance-20261011/current-assessment-20261012/history-832review-report.md)
- [src/server.js](../../../src/server.js)
- [docs/product/history/maintenance-20261011/TASK832-close-report.md](../history/maintenance-20261011/TASK832-close-report.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/history-large.json](../history/maintenance-20261011/android-validation-20261013/history-large.json)
- [docs/product/history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt](../history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt)

### 剩余与待核对

- 先拆开大详情入口问题和server保存事实，复用当前三类样本成果；接续原005/831 older/竞态证据范围，不回到已排除旧v1迁移

依赖与排序依据：

- 顺序是真实source/共享兼容→Node持久投影/provider→App只读；IPC实时另为权威，不可因历史缺口改权威

尚未核对/不可得材料：

- 完整005/831原验证矩阵及所有早期任务正文由history专项批次深核；本父项未重新验证全部source/调度状态机

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-31] App终端模式要求

<a id="AS-CURRENT-20261014-31"></a>

### 覆盖范围

需求：[REQ-TERMLINK-APP-TERMINAL](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-APP-TERMINAL)。本轮完整重评 REQ-TERMLINK-APP-TERMINAL 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。当前终端WebView/管理器和旧2月CR、多次实际10/13设备操作均说明已经启动且有实际交付

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

判定依据：输入、控制/滚动、会话管理和续接四个定义范围均已定位；当前未变终端源码上的首输入污染/once Ctrl/Wi-Fi恢复失败与已证成果并存。未知根因/附加组合不撤销已知反证。

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 真实终端输入输出、尺寸/输入法 | WebView终端路径保留，PTY input/resize既有；稳定输入和IME布局可用 | 10/13真实Android首次有效命令混ESC[?1;2c报ParserError；browser/server resize成功不代替Android所有尺寸 | 首次设备应答污染仍未修，源码4d586e至a78未变 | 横竖屏/IME尺寸全组合未核 | public/terminal_client.js；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；src/ws/terminalGateway.js；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-34；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-62 |
| 控制键与滚动 | 三态Ctrl/Alt、CR/LF及本地视口滚动已有共享实现 | 首次once Ctrl失败；锁定Ctrl/Alt/CR/LF及文字/空白/IME滚动成功 | once Ctrl焦点场景失败需修 | 浏览器完整同字节对照未完成 | public/terminal_shortcut_input.js；public/terminal_client.js；public/terminal.js；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-44；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-45；docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json |
| 会话管理与跨端同一身份 | Sessions远端CRUD、sessionId续接/metadata传递存在 | 10/13手机创建选择改名删除和真实PTY释放通过；server同ID/PID续接通过 | 本功能点未识别明确欠交；不等于发布认证 | 原缓存/跨注册全部组合不从该局部推满足 | android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt；src/services/sessionManager.js；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-63；docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json |
| 客户端断联续接 | gateway保留机制已证；terminal_client有连接恢复路径 | 10/13两次Wi-Fi恢复30秒仍连接失败；这是终端WebView，不是Codex提示修复对象 | 终端Wi-Fi自动恢复未修，需单独定位，不把868 Codex WS恢复冒认解决 | 网络恢复不同环境/认证原因未最终定位 | public/terminal_client.js；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-34；docs/product/history/maintenance-20261011/android-validation-20261013/terminal-reconnect-long-9.txt；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [public/terminal_client.js](../../../public/terminal_client.js)
- [android/app/src/main/java/com/termlink/app/MainShellActivity.kt](../../../android/app/src/main/java/com/termlink/app/MainShellActivity.kt)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [public/terminal_shortcut_input.js](../../../public/terminal_shortcut_input.js)
- [public/terminal.js](../../../public/terminal.js)
- [docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json](../history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json)
- [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt](../../../android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt)
- [src/services/sessionManager.js](../../../src/services/sessionManager.js)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json](../history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json)
- [docs/product/history/maintenance-20261011/android-validation-20261013/terminal-reconnect-long-9.txt](../history/maintenance-20261011/android-validation-20261013/terminal-reconnect-long-9.txt)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)

### 剩余与待核对

- 优先最小修复首次设备应答、once Ctrl和终端Wi-Fi恢复三个明确反例；保留已证滚动/管理/服务端续接，勿重写IPC或PTY

依赖与排序依据：

- 终端WebView input/WS/焦点链是直接修复位置；服务端保留已证，不能推断服务器重写是前置

尚未核对/不可得材料：

- 完整尺寸组合、全浏览器控制字节、网络恢复根因；旧不适用任务绑定不新增

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-32] App Codex模式要求

<a id="AS-CURRENT-20261014-32"></a>

### 覆盖范围

需求：[REQ-TERMLINK-APP-CODEX](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-APP-CODEX)。本轮完整重评 REQ-TERMLINK-APP-CODEX 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。4月原生CR、6/7月IPC任务、832/833历史以及868最新修复均实际执行过；不是由父子绑定自动继承启动

结论：**undetermined**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 独立原生入口、启动恢复、Header与IME原生容器 | CodexActivity原生路径及4月旧入口移除已交付；MainShell终端WebView保留 | 4月CR真实设备launcher/settings/sessions返回；10/13真实launcher冷启动/历史切换/通知回跳成功 | 本功能点未识别明确欠交；不等于发布认证 | 不恢复旧Codex WebView回退；全原生insets/视口组合未核 | docs/changes/records/CR-20260409-2332-native-closeout.md；docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-13；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-48 |
| 聊天、模型配置、slash/mention、附件、Skills与阻塞交互 | 原生容器和gateway接线存在，权限/文件上下文等实际路径可用 | 10/13权限选择/审批批准拒绝和文件context成功；Plan options缺失、Skills第二次覆盖、content://文档宿主不可读已反证；原7/13真实owner Approval/PLAN三端闭环已成功，是独立历史对象证据，不以10/13新options失败抹除 | 分别处理Plan/user-input映射、多Skill状态、文档可访问传输；不因基本聊天可用盖住缺口 | 模型/推理全部覆盖与其他slash组合尚未在父范围确认 | docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-53；src/ws/terminalGateway.js；TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md |
| IPC跟随及唯一实时权威 | follower→desired/replay→定向surface→Android authority架构保持，静态history不竞夺 | 10/13两次目标订阅及手机→宿主→Web回复可证；868受控同连接恢复/A→B→A提示清理有效；8/14第3步A↔B↔A有真实独立执行记录，回放只显示不改SQLite | 本功能点未识别明确欠交；不等于发布认证 | Desktop/VSCode原生双向与全面owner接管仍未知；868仅局部提示 | docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-16；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json；TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md |
| 运行通知、后台/弱网恢复及错误提示生命周期 | 既有foreground service/connection状态；868来源化错误清理 | 10/13真实耗时后台/关闭开启Wi-Fi、回前台完成与通知结束；868 292/292+139/139及修复APK三UI用例 | 本功能点未识别明确欠交；不等于发布认证 | 原11组交互及全部等待/中断stale路径未统一全验；不以clean自审当独立评审 | docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-15；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-57；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/report.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json |
| 独立静态历史/工具详情/缓存及重开 | 832三个product_db样本与手机durable ACK/选定detail证明真实接入 | 三类小样本成立；10/13大输出约165行截断、无完整详情入口 | 大详情完整阅读/复制路径未完成 | older跨页及受控迟到generation全组合未知；实时截断不自动等于DB损失 | docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md；docs/product/history/maintenance-20261011/TASK832-close-report.md；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-68 |
| 提供方适配边界 | 10/13静态发现domain直接持有wire/data类型、ViewModel直接解析私有envelope | 原生迁移报告保留adapter/capability分层证据不足；49/49 IPC不证明adapter隔离 | 先核隔离目标与现状，若修改冻结架构须另确认 | 其他CLI实际接入未采用，不列欠交 | docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-13；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md |

#### 版本适用性

- 当前a78fe55，未运行；4d586e→当前只有四个Codex Kotlin及registration产品差异
- 868 S3文件及server接线本轮SHA全部一致，局部旧运行证据适用；F148历史APK的未变业务保留为原观察，不能把新d64a APK所有范围称重验
- 旧832错误条已由868限定修复；大详情/Plan/Skills/content://失败不在该修复内，仍保留

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260409-2332-native-closeout.md](../../changes/records/CR-20260409-2332-native-closeout.md)
- [docs/changes/records/CR-20260411-1714-codex-native-main-entry-removal.md](../../changes/records/CR-20260411-1714-codex-native-main-entry-removal.md)
- [android/app/src/main/java/com/termlink/app/MainShellActivity.kt](../../../android/app/src/main/java/com/termlink/app/MainShellActivity.kt)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md](../history/maintenance-20261011/android-validation-20261013/验收报告.md)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md](../../../TASKS/TASK-20260629-001-server-android-codex-realtime-sync-demo-parity.md)
- [docs/workflow/CONTRACTS.md](../../workflow/CONTRACTS.md)
- [docs/workflow/DECISIONS.md](../../workflow/DECISIONS.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/report.md](../history/maintenance-20261011/task20260868-s3/report.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json](../history/maintenance-20261011/task20260868-s3/source-manifest.json)
- [TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md](../../../TASKS/paused/TASK-20260727-002-codex-single-authority-owner-control-plane.md)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md](../history/maintenance-20261011/current-assessment-20261012/history-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md](../history/maintenance-20261011/current-assessment-20261012/history-832review-report.md)
- [docs/product/history/maintenance-20261011/TASK832-close-report.md](../history/maintenance-20261011/TASK832-close-report.md)

### 剩余与待核对

- 优先收口明确用户交互阻断（Plan/options、Skills、文档）和历史大详情入口；复用已证运行/错误清理成果；跨提供方仅先核范围

依赖与排序依据：

- Plan/UI依真实host payload映射；文档需宿主可访问资源；history依持久provider；实时IPC与静态链分工不能互换

尚未核对/不可得材料：

- MVP各原任务全细目在其他batch深核；本父范围广，当前报告不宣称把全部预留/主题/设备验完

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-33] 权限模式配置与实际进程身份

<a id="AS-CURRENT-20261014-33"></a>

### 覆盖范围

需求：[REQ-TERMLINK-PERMISSION-MODE](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-PERMISSION-MODE)。本轮完整重评 REQ-TERMLINK-PERMISSION-MODE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。a6ceeec/76e76f8 CR已有真实实施；当前配置解析、server和PTY路径均存在，非从无绑定推断

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 显式standard/elevated及启用开关，默认standard，模式不自行提权 | parsePrivilegeConfig读取TERMLINK_*及旧键兼容；非法mode回退standard；elevated另需ENABLE；server仅elevated运行安全门禁 | 10/13 focused-settled实际通过默认解析/显式开关用例；2月CR已有实施，当前源码吻合 | 本功能点未识别明确欠交；不等于发布认证 | 这里满足的是配置语义，不认证任意宿主实际权限或OS降权 | src/config/privilegeConfig.js；src/server.js；docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md；docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md；docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md；docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap |
| PTY继承服务进程身份；应用登录与OS权限分开说明 | pty.spawn没有UAC/sudo/runas/令牌变更；凭据认证在basicAuth中独立；原REQ明确admin账号不等于OS管理员 | 原REQ/CR、当前spawn及启动门禁静态边界一致；不需要为不存在的App提权义务新增验证 | 本功能点未识别明确欠交；不等于发布认证 | 实际安装账户不是本次读取对象 | src/services/ptyService.js；src/auth/basicAuth.js；docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md；src/config/securityGates.js |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [src/config/privilegeConfig.js](../../../src/config/privilegeConfig.js)
- [src/server.js](../../../src/server.js)
- [docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md](../requirements/REQ-20260222-server-admin-privilege-mode.md)
- [docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md](../../changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md)
- [docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md](../../changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap](../history/maintenance-20261011/joint-validation-20261013/focused-settled.tap)
- [src/services/ptyService.js](../../../src/services/ptyService.js)
- [src/auth/basicAuth.js](../../../src/auth/basicAuth.js)
- [src/config/securityGates.js](../../../src/config/securityGates.js)

### 剩余与待核对

- 无需重新立项配置模式；只在后续涉及部署身份时核对该宿主，不新增提权/降权工作

依赖与排序依据：



尚未核对/不可得材料：

- 早期原Task/原始用户会话未定位；不影响确认已开始或配置交付

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-34] 受控模式启动安全门禁

<a id="AS-CURRENT-20261014-34"></a>

### 覆盖范围

需求：[REQ-TERMLINK-STARTUP-SAFETY](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-STARTUP-SAFETY)。本轮完整重评 REQ-TERMLINK-STARTUP-SAFETY 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。2月实施CR、后续host检测代码和10/13真实启动拒绝直接证明已执行过；不是只准备任务

结论：**undetermined**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 认证必须开启、非默认凭据、强度要求及显式受控开关 | runSecurityGates检查AUTH_ENABLED、弱凭据、8位含字母数字；server失败即exit | 10/13聚焦记录默认凭据拒绝、mode开关通过；旧CR提供实现历史 | 本功能点未识别明确欠交；不等于发布认证 | 有效管理员身份与所有门禁联合正向未有本对象实测 | src/config/privilegeConfig.js；src/config/securityGates.js；src/server.js；docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md；docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap |
| 服务进程必须具有实际管理员/root权限 | WindowsPrincipal管理员令牌检测或Unix getuid===0，检测失败fail-closed | 10/13实际普通Windows进程elevated失败PROCESS_PRIVILEGE_REQUIRED，未监听 | 本功能点未识别明确欠交；不等于发布认证 | 管理员正向宿主缺失，不能以注入hasRequiredPrivileges=true替代 | src/config/securityGates.js；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-37；docs/product/history/maintenance-20261011/joint-validation-20261013/runtime-gates-result.json |
| 可写审计路径及需要mTLS时校验可用性 | 审计路径创建/open、磁盘余量检查；strict TLS require+可读cert/key/CA；server HTTPS构造还会拒绝非法PEM | 10/13不可读/非法PEM启动拒绝；valid TLS standard HTTPS health 200；聚焦可读strict配置通过 | 本功能点未识别明确欠交；不等于发布认证 | 真实管理员+mTLS+审计完整正向链仍未核；磁盘命令无法读数时当前为放行，不从代码扩成额外安全标准 | src/config/securityGates.js；src/server.js；src/services/auditService.js；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-37；docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [src/config/privilegeConfig.js](../../../src/config/privilegeConfig.js)
- [src/config/securityGates.js](../../../src/config/securityGates.js)
- [src/server.js](../../../src/server.js)
- [docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md](../../changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/focused-settled.tap](../history/maintenance-20261011/joint-validation-20261013/focused-settled.tap)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/runtime-gates-result.json](../history/maintenance-20261011/joint-validation-20261013/runtime-gates-result.json)
- [src/services/auditService.js](../../../src/services/auditService.js)

### 剩余与待核对

- 先补已有正向门禁证据定位；如需新验证，需后续获准且有受控管理员宿主。当前不实施/不运行

依赖与排序依据：

- 有效进程身份、可用证书和可写审计路径是正向联合验收前提，不是其他客户端功能的全局阻塞

尚未核对/不可得材料：

- 管理员正向部署、elevated真实mTLS联动和审计运行闭环

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-35] 来源IP访问限制

<a id="AS-CURRENT-20261014-35"></a>

### 覆盖范围

需求：[REQ-TERMLINK-SOURCE-IP](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-SOURCE-IP)。本轮完整重评 REQ-TERMLINK-SOURCE-IP 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。76e76f8、9ccfd3d1、5b32acaa有实现/修复活动且当前函数和消费入口存在

结论：**undetermined**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 支持单IP及CIDR白名单 | ipCheck当前支持IPv4、IPv4-mapped IPv6、IPv6展开和CIDR；空表允许、显式*允许 | 3/31真实git提交9ccfd3d1记22/22、5b32acaa记23/23；已读测试的正负边界及当前代码。2月只IPv4限制被后续实现补齐 | 本功能点未识别明确欠交；不等于发布认证 | 旧通过是commit message报告，未获得对应完整原始运行日志；当前IPv6全面实网未验 | src/utils/ipCheck.js；tests/ipCheck.test.js；docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md |
| 依真实对端，拒绝未授权来源，不信任伪造转发头 | gateway getClientIp只取req.socket.remoteAddress；elevated路径在create/attach前查白名单，失败4403 | 当前完整相关分支静态可核，旧CR声明WS白名单交付 | 本功能点未识别明确欠交；不等于发布认证 | 原REQ也提HTTP实际对端；当前读取server/basicAuth/sessions未见同一IP门禁接线，HTTP覆盖需明确核对，不能由WS门禁推全入口通过 | src/ws/terminalGateway.js；src/server.js；src/auth/basicAuth.js；src/routes/sessions.js；docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md；docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [src/utils/ipCheck.js](../../../src/utils/ipCheck.js)
- [tests/ipCheck.test.js](../../../tests/ipCheck.test.js)
- [docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md](../../changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [src/server.js](../../../src/server.js)
- [src/auth/basicAuth.js](../../../src/auth/basicAuth.js)
- [src/routes/sessions.js](../../../src/routes/sessions.js)
- [docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md](../requirements/REQ-20260222-server-admin-privilege-mode.md)
- [docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md](../../changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md)

### 剩余与待核对

- 按既有定义先核HTTP适用范围及真实入口证据，再决定是否是窄范围缺口；保留WS已实现，不扩成新认证体系

依赖与排序依据：

- 依赖standard/elevated配置控制；代理部署需按原指南在网关侧实施网络边界

尚未核对/不可得材料：

- HTTP白名单实际覆盖、原23/23完整输出、实网正负来源及伪造头场景

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-36] 会话审计关联

<a id="AS-CURRENT-20261014-36"></a>

### 覆盖范围

需求：[REQ-TERMLINK-AUDIT-TRACE](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-AUDIT-TRACE)。本轮完整重评 REQ-TERMLINK-AUDIT-TRACE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。2月CR及3月9ccfd3d1/5b32acaa有实现和修复，不能记未开始；历史SUMMARY全量措辞不能覆盖当前逐点缺口

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 连接和结束按session/source/auditTraceId关联 | gateway成功建连生成trace，start含sessionId/privilegeLevel/clientIp/connectedBy，close同trace含code/reason/duration；auditService落JSONL并轮转 | 3月提交历史报告审计写入/轮转测试通过；当前auditService tests及gateway接线可核 | 本功能点未识别明确欠交；不等于发布认证 | 当前elevated整链运行日志未在10/13正向证明 | src/services/auditService.js；src/ws/terminalGateway.js；tests/auditService.test.js；docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md；docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md |
| 拒绝记录纳入关联 | 白名单拒绝当前只调用logIpWhitelistDenied({clientIp})，在auditTraceId分配之前；认证/registration拒绝路径未见同一审计调用 | 这是当前源码静态反证，不是新运行复现 | 拒绝日志未达到需求所列身份/trace关联；应先按可用身份界定拒绝场景的关联字段 | 未连入session时不能伪造sessionId；不得据此发明所有操作审批体系 | src/services/auditService.js；src/ws/terminalGateway.js；src/auth/basicAuth.js；src/routes/sessions.js |
| 会话操作可追溯 | sessions create/rename/delete走manager；当前正式审计事件只有start/end/ip_whitelist_denied，CRUD仅部分diagnosticLog，不带auditTraceId | 读完整auditService及sessions/manager相关CRUD，未发现会话操作审计接线 | 本定义“会话操作”关联未实现；诊断日志不能自动视为审计链 | P2.1更细粒度审批/审计范围仍未定义，勿将其扩进本项 | src/services/auditService.js；src/services/sessionManager.js；src/routes/sessions.js；docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [src/services/auditService.js](../../../src/services/auditService.js)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [tests/auditService.test.js](../../../tests/auditService.test.js)
- [docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md](../../changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md)
- [docs/changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md](../../changes/records/CR-20260224-1602-server-admin-mode-enable-fix.md)
- [src/auth/basicAuth.js](../../../src/auth/basicAuth.js)
- [src/routes/sessions.js](../../../src/routes/sessions.js)
- [src/services/sessionManager.js](../../../src/services/sessionManager.js)
- [docs/product/requirements/REQ-20260222-server-admin-privilege-mode.md](../requirements/REQ-20260222-server-admin-privilege-mode.md)

### 剩余与待核对

- 建议在现有审计原子范围内明确拒绝和会话操作的字段/接线缺口，再独立安排最小修复；本次只返回待维护定位

依赖与排序依据：

- REQ-TERMLINK-PERMISSION-MODE控制审计启用；源IP/认证入口提供可用身份字段

尚未核对/不可得材料：

- 真实elevated联合运行结果未核；缺原Task。直接影响REQ-TERMLINK-SERVER-AUTH及REQ-TERMLINK-SERVER的审计子范围

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-37] 客户端权限风险可见

<a id="AS-CURRENT-20261014-37"></a>

### 覆盖范围

需求：[REQ-TERMLINK-CLIENT-RISK](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CLIENT-RISK)。本轮完整重评 REQ-TERMLINK-CLIENT-RISK 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。a6ceeec客户端桥接及Android风险提示已有实现；缺子项TaskBinding不影响启动判断

结论：**undetermined**。实现标记 partial-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 连接信息携带权限级别 | gateway session_info携带STANDARD/ELEVATED；当前值来自受控配置，elevated启动已校验进程权限 | CR a6ceeec交付报告；10/13旧WS夹具失败不能读作字段失败，868修订后46/46包含兼容接线 | 本功能点未识别明确欠交；不等于发布认证 | standard配置不意味着OS令牌降权；字段是配置声明还是完整“实际权限”覆盖仍须按原范围解释，不新增降权功能 | src/ws/terminalGateway.js；src/config/privilegeConfig.js；src/config/securityGates.js；docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md；docs/product/history/maintenance-20261011/task20260868-s2/report.md |
| 客户端显示对应风险提示 | terminal_client通过native bridge传privilegeLevel；MainShellActivity ELEVATED显示风险Toast。public/terminal.js及其他Web资源未见ELEVATED提示消费 | 当前代码及原CR可证Android路径已实现；无真实管理员模式客户端风险提示实测 | Web独立终端风险提示实现未找到，需对原跨端约定定位后处理 | 原生Codex wire解析字段不等于展示；UI/host联合范围未验 | public/terminal_client.js；public/terminal.js；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/web/TerminalEventBridge.kt；android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt；docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [src/config/privilegeConfig.js](../../../src/config/privilegeConfig.js)
- [src/config/securityGates.js](../../../src/config/securityGates.js)
- [docs/changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md](../../changes/records/CR-20260224-0300-server-admin-privilege-mode-phase1.md)
- [docs/product/history/maintenance-20261011/task20260868-s2/report.md](../history/maintenance-20261011/task20260868-s2/report.md)
- [public/terminal_client.js](../../../public/terminal_client.js)
- [public/terminal.js](../../../public/terminal.js)
- [android/app/src/main/java/com/termlink/app/MainShellActivity.kt](../../../android/app/src/main/java/com/termlink/app/MainShellActivity.kt)
- [android/app/src/main/java/com/termlink/app/web/TerminalEventBridge.kt](../../../android/app/src/main/java/com/termlink/app/web/TerminalEventBridge.kt)
- [android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt](../../../android/app/src/main/java/com/termlink/app/codex/data/CodexWireModels.kt)

### 剩余与待核对

- 先核独立Web与原生Codex风险显示覆盖，不将standard的OS身份问题变成App提权/回滚任务

依赖与排序依据：

- 需服务端权限字段可信且入口实际消费；与registration修复无直接功能依赖

尚未核对/不可得材料：

- Web独立页面及原生Codex风险显示；真实elevated设备提示；原Task

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-38] 断联保留与同会话续接

<a id="AS-CURRENT-20261014-38"></a>

### 覆盖范围

需求：[REQ-TERMLINK-SESSION-CONTINUITY](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-SESSION-CONTINUITY)。本轮完整重评 REQ-TERMLINK-SESSION-CONTINUITY 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。67bc2c3/f4ce64f实现历史+当前代码+10/13真实同ID/PID证据证明已开始并有核心交付

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 断开保留原session和PTY | removeConnection只删socket、零连接变IDLE并调度持久化；不kill；gateway close仅removeConnection | 10/13真实HTTP/WS：断开activeConnections=0，PTY继续执行，断开期间输出后续可见 | 本功能点未识别明确欠交；不等于发布认证 | 不包含服务端重启后同PTY，亦不替Android Wi-Fi自动重连背书 | src/services/sessionManager.js；src/ws/terminalGateway.js；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-41；docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json |
| 有效sessionId复用同一上下文 | 显式id走getSessionForRegistration；addConnection复用现有pty且可发送bounded terminal_snapshot | 同id、同PID4296与变量上下文实测；浏览器刷新同PID/变量另有原报告 | 本功能点未识别明确欠交；不等于发布认证 | 只覆盖实际PowerShell/浏览器及服务连接路径 | src/ws/terminalGateway.js；src/services/sessionManager.js；src/services/ptyService.js；docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json；docs/product/assessments/JOINT-20261013.md#AS-JOINT-20261013-41 |
| 失效/空ID拒绝，唯缺省ID可创建 | searchParams.has区分空参数；缺失session关闭4404，携registration错属为4403；只有未提供id才create | 2月6/6明确空/无效/有效/缺省；10/13实际未知id=4404；868 46/46及网络23保留active/legacy语义 | 本功能点未识别明确欠交；不等于发布认证 | 旧gateway测试失败已在868同逻辑夹具修正，不从旧8失败推出当前产品坏 | src/ws/terminalGateway.js；docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json；docs/product/history/maintenance-20261011/task20260868-s2/report.md；docs/product/history/maintenance-20261011/task20260868-s3/network-result.json |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [src/services/sessionManager.js](../../../src/services/sessionManager.js)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json](../history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json)
- [src/services/ptyService.js](../../../src/services/ptyService.js)
- [docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md](../../changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md)
- [docs/product/history/maintenance-20261011/task20260868-s2/report.md](../history/maintenance-20261011/task20260868-s2/report.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/network-result.json](../history/maintenance-20261011/task20260868-s3/network-result.json)

### 剩余与待核对

- 保留现有服务端已证成果；Android终端Wi-Fi自动恢复作为客户端独立缺陷安排，不重复改服务端保留契约

依赖与排序依据：

- 实际ID/registration归属校验先于attach；无须依赖元数据重启恢复或历史collector

尚未核对/不可得材料：

- 跨进程PTY连续已明确排除；无新全OEM要求

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-39] 会话闲置保留配置

<a id="AS-CURRENT-20261014-39"></a>

### 覆盖范围

需求：[REQ-TERMLINK-SESSION-TTL](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-SESSION-TTL)。本轮完整重评 REQ-TERMLINK-SESSION-TTL 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。67bc2c3生命周期实现与1899f6d配置变更均真实发生；有10/13边界运行证据

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

判定依据：当前原子正文将24h增量收窄到CR0000示例配置/文档，当前字节已静态核对；10/13真实manager/PTY+受控时钟+真实清理timer已证明配置TTL语义，故满足当前义务，不宣称自然24h实测。

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 配置SESSION_IDLE_TTL_MS及清理间隔，仅闲置到期回收 | 当前缺省/非法TTL回退6小时；清理间隔默认60秒；零连接且elapsed>TTL时delete/kill | 10/13真实manager+PTY：60000ms边界保留、+1ms删除，真实1s定时清理，active排除；5/5通过 | 本功能点未识别明确欠交；不等于发布认证 | 60s显式TTL+受控Date.now证明边界算法，真实timer/PTY证明清理效果；未墙钟等待24h属报告边界，不是当前新增必验门槛 | src/services/sessionManager.js；docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md；docs/product/history/maintenance-20261011/joint-validation-20261013/retention.test.cjs；docs/product/history/maintenance-20261011/joint-validation-20261013/retention-completed.tap |
| 24h增量仅示例配置与文档变更，保持6h代码回退口径 | 当前.env.example为86400000；1899f6d窄CR明确不改逻辑；原SUMMARY“默认24h”不能扩大窄改动 | 原CR当时仅检查.env值且写待验证；本轮只读确认当前.env.example为86400000及原commit对应改动，结合10/13实际配置TTL/边界清理5/5，不冒称24h墙钟实测 | 当前限定的24h示例配置/文档增量未识别欠交；6h代码fallback不是该增量需改的义务 | 原旧REQ§7/8含23h重连/24h边界场景，但当前有效定义明确24h增量按CR示例/文档核；没有必须用24h墙钟等待替代受控时间的现行验收约定 | docs/changes/records/CR-20260224-0000-session-ttl-24h.md；.env.example；src/services/sessionManager.js；docs/product/DELIVERY_RECONCILIATION.md#ASMT-TERMLINK-03；docs/product/requirements/REQ-20260222-session-retention-reconnect.md |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [src/services/sessionManager.js](../../../src/services/sessionManager.js)
- [docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md](../../changes/records/CR-20260223-2114-session-retention-impl-phase1.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/retention.test.cjs](../history/maintenance-20261011/joint-validation-20261013/retention.test.cjs)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/retention-completed.tap](../history/maintenance-20261011/joint-validation-20261013/retention-completed.tap)
- [docs/changes/records/CR-20260224-0000-session-ttl-24h.md](../../changes/records/CR-20260224-0000-session-ttl-24h.md)
- [.env.example](../../../.env.example)
- [docs/product/DELIVERY_RECONCILIATION.md](../DELIVERY_RECONCILIATION.md)
- [docs/product/requirements/REQ-20260222-session-retention-reconnect.md](../requirements/REQ-20260222-session-retention-reconnect.md)

### 剩余与待核对

- 保留已交付配置和已证边界；不因没有24h墙钟长跑重开实现或自动新建测试。部署时使用何值是配置事实，不能将未知部署值归为当前功能缺口

依赖与排序依据：

- 保留管理器运行和无连接lastActive边界；不依赖App、Rust或发行整体完成

尚未核对/不可得材料：

- 原早期Task未定位；没有24h墙钟长跑记录，已明确只作历史证据边界而非未满足义务

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-40] 会话容量与闲置回收

<a id="AS-CURRENT-20261014-40"></a>

### 覆盖范围

需求：[REQ-TERMLINK-SESSION-CAPACITY](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-SESSION-CAPACITY)。本轮完整重评 REQ-TERMLINK-SESSION-CAPACITY 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。67bc2c3/f4ce64f及当前管理器和10/13真实PTY容量检查证明已实施

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 最大会话数配置控制 | SESSION_MAX_COUNT解析，代码默认50；create先ensureCapacity | 原CR与当前代码一致；10/13容量3真实manager用例验证边界 | 本功能点未识别明确欠交；不等于发布认证 | 报告曾写“默认100压力”属于未验说明，当前代码默认实际为50；不扩大压力承诺 | src/services/sessionManager.js；docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md；docs/product/history/maintenance-20261011/joint-validation-20261013/retention.test.cjs |
| 满额回收最旧闲置，保留活跃与更新闲置 | 按connections.length===0候选最小lastActiveAt，delete释放PTY | 10/13真实容量3时旧idle被回收且其PTY释放，active和较新idle保留，5/5整体通过 | 本功能点未识别明确欠交；不等于发布认证 | 未执行大规模压力不撤销既有定性功能证据 | src/services/sessionManager.js；src/services/ptyService.js；docs/product/history/maintenance-20261011/joint-validation-20261013/retention-completed.tap；docs/product/history/maintenance-20261011/joint-validation-20261013/retention.test.cjs |
| 无闲置拒绝新建且不伤活跃 | ensureCapacity抛SESSION_CAPACITY_EXCEEDED；HTTP409、WS4429 | 2月容量route测试；10/13全active拒绝且所有活跃PID仍存活 | 本功能点未识别明确欠交；不等于发布认证 | 并发压力矩阵不在本次已证范围 | src/services/sessionManager.js；src/routes/sessions.js；src/ws/terminalGateway.js；docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md；docs/product/history/maintenance-20261011/joint-validation-20261013/retention.test.cjs；docs/product/history/maintenance-20261011/joint-validation-20261013/retention-completed.tap |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [src/services/sessionManager.js](../../../src/services/sessionManager.js)
- [docs/changes/records/CR-20260223-2114-session-retention-impl-phase1.md](../../changes/records/CR-20260223-2114-session-retention-impl-phase1.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/retention.test.cjs](../history/maintenance-20261011/joint-validation-20261013/retention.test.cjs)
- [src/services/ptyService.js](../../../src/services/ptyService.js)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/retention-completed.tap](../history/maintenance-20261011/joint-validation-20261013/retention-completed.tap)
- [src/routes/sessions.js](../../../src/routes/sessions.js)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md](../../changes/records/CR-20260224-0023-session-retention-reconnect-ws-param-fix.md)

### 剩余与待核对

- 当前原子行为可保留满足；不要因没有独立Task而重新实施或把压力浸泡自动列欠交

依赖与排序依据：

- session manager+PTY delete路径；无外部新模块前置

尚未核对/不可得材料：

- 原始Task未定位；MaxListenersExceededWarning保留为原运行诊断，不虚构产品容量失败

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-41] 终端控制输入

<a id="AS-CURRENT-20261014-41"></a>

### 覆盖范围

需求：[REQ-TERMLINK-CONTROL-INPUT](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CONTROL-INPUT)。本轮完整重评 REQ-TERMLINK-CONTROL-INPUT 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。e975244等原CR实施、现存三态模块及10/13实测均证明已开始；已知失败不是未开始

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

判定依据：四个定义功能均有对应当前实现和适用原报告；已知once Ctrl失败与锁定Ctrl/Alt/CR/LF成果并存。未完浏览器组合只是验证边界，不是义务/版本适用性未知。

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| Ctrl+A–Z发送控制字符，包含Ctrl+C | 共享resolveVirtualInput/applyCtrlModifier有A–Z映射；双端接入；运行首次焦点路径仍有反例 | 10/13真实触屏首次Ctrl+c收到63而非03；锁定cc收到03/03，原始frame及操作脚本已读 | 修复首次单次Ctrl/焦点丢失，保留锁定成功 | 全部浏览器同范围字节对照因资源错误未完成 | public/terminal_shortcut_input.js；public/terminal_client.js；public/terminal.js；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-44；docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json；docs/product/history/maintenance-20261011/android-validation-20261013/terminal-touch-controls.json |
| Alt发送ESC前缀而非标签 | resolveVirtualInput在非off状态前置ESC；一次消费和锁定保持 | 物理Alt+b/f为1b62/1b66，锁定fb也有相应frame | 本功能点未识别明确欠交；不等于发布认证 | 浏览器全部Alt/焦点组合未核 | public/terminal_shortcut_input.js；public/terminal_client.js；public/terminal.js；docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json |
| 一次、锁定、解除及可视状态 | off/armed/locked三态、320ms双击；双端状态class/aria更新 | 旧共享单测/CR；10/13锁定和解除路径可用，首次once已失败 | once与首次焦点交互需最小修复 | 关闭/重开快捷键盘与浏览器完整状态组合未全核 | public/terminal_shortcut_input.js；public/terminal_client.js；public/terminal.js；docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-04 |
| Enter=CR、独立Newline=LF | mapVirtualKey Enter为\r、Newline为\n；两页面有独立入口 | 10/13实际frame分别0d和0a | 本功能点未识别明确欠交；不等于发布认证 | 结果限当前设备/服务；不宣称所有浏览器字节对照 | public/terminal_shortcut_input.js；public/terminal_client.js；public/terminal.js；docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [public/terminal_shortcut_input.js](../../../public/terminal_shortcut_input.js)
- [public/terminal_client.js](../../../public/terminal_client.js)
- [public/terminal.js](../../../public/terminal.js)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json](../history/maintenance-20261011/android-validation-20261013/control-frame-evidence.json)
- [docs/product/history/maintenance-20261011/android-validation-20261013/terminal-touch-controls.json](../history/maintenance-20261011/android-validation-20261013/terminal-touch-controls.json)
- [docs/changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md](../../changes/records/CR-20260224-0201-shortcut-keyboard-modifier-newline-impl-phase1.md)

### 剩余与待核对

- 优先与终端首次输入污染一并定位客户端输入/焦点边界，保持服务协议。先修已证反例，再在另行授权后复用原输入字节场景

依赖与排序依据：

- 共享终端input事件与焦点管理；不需要等待Codex历史/IPC重构

尚未核对/不可得材料：

- 浏览器全部同范围输入字节矩阵；e975244原完整日志；原Task未定位

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-42] 终端触摸滚动

<a id="AS-CURRENT-20261014-42"></a>

### 覆盖范围

需求：[REQ-TERMLINK-TOUCH-SCROLL](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-TOUCH-SCROLL)。本轮完整重评 REQ-TERMLINK-TOUCH-SCROLL 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。2月实现/3月修复有CR，10/13现对象真机滚动证明；当前触摸源码与4d586e一致

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 文字区和空白区统一纵向拖动、本地滚动及Android兼容 | 双端capture touch监听驱动xterm-viewport scrollTop，有惯性和拖动焦点抑制；client另有长按选区保护 | 10/13 Huawei真实160行：文字区111→86、空白区→62，IME展开仍滚到更早内容；2月本地PgUp/PgDn/Home/End真机记录 | 本功能点未识别明确欠交；不等于发布认证 | 单设备验证及现有实现；不推广全OEM，亦不将早期SUMMARY冒充本轮结果 | public/terminal_client.js；public/terminal.js；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-45；docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md；docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md；docs/changes/records/CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix.md |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [public/terminal_client.js](../../../public/terminal_client.js)
- [public/terminal.js](../../../public/terminal.js)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md](../history/maintenance-20261011/android-validation-20261013/验收报告.md)
- [docs/changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md](../../changes/records/CR-20260329-0155-android-terminal-keyboard-scroll-regression-fix.md)
- [docs/changes/records/CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix.md](../../changes/records/CR-20260224-0257-shortcut-keyboard-local-scroll-keys-fix.md)

### 剩余与待核对

- 保持已证的文字/空白/IME滚动；终端其他输入失败不否定本原子范围，也不追加通用OEM适配

依赖与排序依据：

- xterm视口已有输出；无其他需求硬前置

尚未核对/不可得材料：

- 已引用原报告与文本证据；未逐像素复查全部PNG；原完整浏览器手势对照非本项新门槛

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-43] External本地会话管理

<a id="AS-CURRENT-20261014-43"></a>

### 覆盖范围

需求：[REQ-TERMLINK-EXTERNAL-SESSIONS](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-EXTERNAL-SESSIONS)。本轮完整重评 REQ-TERMLINK-EXTERNAL-SESSIONS 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。ab47cb8完整POC与当前store/UI直接实现；10/13真实CRUD/reopen已执行，旧原Task缺失不影响

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 本地create/list/rename/delete | ExternalSessionStore为SharedPreferences JSON，id/profile隔离，SessionsFragment External分支使用本地CRUD而非远端API | 10/13生产UI实际新建/打开/改名/删除，专用两会话结果正确 | 本功能点未识别明确欠交；不等于发布认证 | 不扩跨设备同步或任意外部站点 | android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt；docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-46；docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json；docs/product/history/maintenance-20261011/android-validation-20261013/external-close-loop.json |
| 更新最近访问并重启保留 | touch更新lastActiveAt并persist；list按lastActive降序；MainShell与Sessions打开入口调用touch | 10/13结束进程后重开核对已删项仍无、已改名项保留并可打开；touch代码直接路径存在 | 本功能点未识别明确欠交；不等于发布认证 | 未对lastActive毫秒值单独UI断言，但有当前静态实现；不将原无设备CR作为当前无验收 | android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt；android/app/src/main/java/com/termlink/app/MainShellActivity.kt；docs/product/history/maintenance-20261011/android-validation-20261013/external-close-loop.json；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-46 |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt](../../../android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt)
- [android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt](../../../android/app/src/main/java/com/termlink/app/ui/sessions/SessionsFragment.kt)
- [docs/changes/records/CR-20260224-1636-android-external-web-terminal-poc.md](../../changes/records/CR-20260224-1636-android-external-web-terminal-poc.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/external-crud.json](../history/maintenance-20261011/android-validation-20261013/external-crud.json)
- [docs/product/history/maintenance-20261011/android-validation-20261013/external-close-loop.json](../history/maintenance-20261011/android-validation-20261013/external-close-loop.json)
- [android/app/src/main/java/com/termlink/app/MainShellActivity.kt](../../../android/app/src/main/java/com/termlink/app/MainShellActivity.kt)

### 剩余与待核对

- 保留本地CRUD与保存成果；无需再实现。与External Profile删除/地址刷新剩余分开

依赖与排序依据：

- Profile有效id；本地存储，不依赖server sessions/Rust

尚未核对/不可得材料：

- 原Task未定位；未新增跨设备义务；日志external-reopen.log未在已迁移证据目录找到，采用保存原报告+操作序列而不声称读取不存在文件

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-44] External地址凭据与列表刷新

<a id="AS-CURRENT-20261014-44"></a>

### 覆盖范围

需求：[REQ-TERMLINK-EXTERNAL-REFRESH](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-EXTERNAL-REFRESH)。本轮完整重评 REQ-TERMLINK-EXTERNAL-REFRESH 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。ab47cb8初始signature及d675956 External刷新repair，10/13凭据实际闭环；已有实现与执行

结论：**undetermined**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 地址/Basic凭据变化后同session重新打开按新签名加载 | loadedTerminalSignature包含type/target/auth/username/password fingerprint；buildExternalWebHeaders读最新凭据；loadUrl应用新header | 10/13测试profile错误Basic密码产生实际认证错，纠正后同会话重新打开成功；3月刷新策略JVM通过 | 本功能点未识别明确欠交；不等于发布认证 | URL变化及用户名变化的全部组合未核；仅测试App保存凭据，并非修改宿主账户密码 | android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt；docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-47；docs/product/history/maintenance-20261011/android-validation-20261013/external-wrong-credential-8.txt |
| Profile保存/删除刷新列表和重载目标 | onUpsert/onDelete后syncProfileState及invalidateWebView...；External直接按signature reload，删除清对应本地session | 3月resolver单测及Settings 4/4证据；10/13当前External会话删除后列表无该项 | 本功能点未识别明确欠交；不等于发布认证 | 删除会话不等于删除Profile；当前激活Profile删除/切换和地址修改所有重载路径仍未验 | android/app/src/main/java/com/termlink/app/MainShellActivity.kt；android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt；android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt；docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md；docs/product/assessments/ANDROID-20261013.md#AS-ANDROID-20261013-47 |

#### 版本适用性

- 被评对象为a78fe55e033bbcb6db816acd2c801de5aa28a081；本次只读分析，无新增运行验证
- 4d586e0f2dab1fef9d2c273b770796b63a7d873d至本基线的产品diff仅4个Codex Kotlin文件及clientRegistrationManager；本项终端/External/权限主代码未改，原实测可保留为相同实现范围证据，但不是新执行或全环境认证

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [android/app/src/main/java/com/termlink/app/MainShellActivity.kt](../../../android/app/src/main/java/com/termlink/app/MainShellActivity.kt)
- [android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt](../../../android/app/src/main/java/com/termlink/app/ProfileCommitRefreshResolver.kt)
- [docs/changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md](../../changes/records/CR-20260327-0100-external-web-profile-refresh-fix.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/external-wrong-credential-8.txt](../history/maintenance-20261011/android-validation-20261013/external-wrong-credential-8.txt)
- [android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt](../../../android/app/src/main/java/com/termlink/app/data/ExternalSessionStore.kt)

### 剩余与待核对

- 下一步限地址变更、删除当前Profile后目标切换/列表刷新证据；不要重复已证Basic密码更新或借mTLS3/3代替

依赖与排序依据：

- 保存commit完成后读取新Profile/凭据；删除依ExternalSessionStore清理；不依新认证体系

尚未核对/不可得材料：

- URL/用户名变化、Profile删除与新active目标实测；external-correct-delete-current.log未在迁移目录找到，仅保留报告指向

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。
