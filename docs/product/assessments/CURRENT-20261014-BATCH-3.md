---
{
  "schema": "vnext-product-doc/v3",
  "items": [
    {"id":"AS-CURRENT-20261014-45","type":"assessment","target":"REQ-TERMLINK-CODEX-THREADS","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075","item_id":"REQ-TERMLINK-CODEX-THREADS"},"target_definition_algorithm":"vnext-product-definition/v1","target_definition_sha256":"a0dc44c55288bd74bf5d975861ebe05abdbfe3f488a2bc57d13973e38eaf5d43","goal_basis":{"kind":"file","path":"docs/product/GOALS.md","sha256":"b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe","item_id":"GOAL-TERMLINK"},"goal_definition_algorithm":"vnext-product-definition/v1","goal_definition_sha256":"08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b","applicability":{"goal_id":"GOAL-TERMLINK","scope_id":"CURRENT-20261014-45","coverage":"本轮完整重评 REQ-TERMLINK-CODEX-THREADS 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"},"checked_at":"2026-10-14T19:26:06.530394+00:00","subject":{"kind":"commit","value":"a78fe55e033bbcb6db816acd2c801de5aa28a081","limitations":"本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"},"implementation":"partial-reported","verification":"pass-reported","conclusion":"undetermined","sources":[{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"},{"kind":"file","path":"TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md","sha256":"794395a5a820e7590245d735c072929bb208588a059ed24ad932eec4078b0ba2"},{"kind":"file","path":"TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md","sha256":"6a5a265cc131759b4d54fa6ddaa19622644e0da469388bf93b5849609dd1211f"},{"kind":"file","path":"android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt","sha256":"1321f7ced1dc7fdfbca8d92d506435459820336860bb04a36ce83528a68e3401"},{"kind":"file","path":"src/ws/terminalGateway.js","sha256":"5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"},{"kind":"file","path":"docs/product/assessments/ANDROID-20261013.md","sha256":"4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"},{"kind":"file","path":"docs/product/history/maintenance-20261011/android-validation-20261013/cold-prepare-4.txt","sha256":"74373f85c46834508603d5be827d2d9163124915229ae25f38beb74527203831"},{"kind":"file","path":"docs/product/history/maintenance-20261011/android-validation-20261013/cold-launcher.xml","sha256":"f1a09d4d185d55b04b1437d1587f718c3396cba2108cc17ee597ffa204e322d0"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md","sha256":"74cb3cab6fabaf0a96cdc2121fef66ee9df8273791d2fffe9115daef77f79784"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json","sha256":"8420f108e8832398bdd92e898eaa82d8ac4b423d909ba5df7571433013aad2a3"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json","sha256":"c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md","sha256":"e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"}],"extensions":{"startup":{"state":"已开始过","basis":"60504实际修改thread/list cwd/active-thread隔离，60510步骤12–15真实Android执行；当前newThread/resumeThread及会话绑定路径存在，10/13专用线程切换/launcher冷启通过，不依赖新拆分项是否有TaskBinding。"},"batch":3}},
    {"id":"AS-CURRENT-20261014-46","type":"assessment","target":"REQ-TERMLINK-CODEX-MODEL","target_basis":{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075","item_id":"REQ-TERMLINK-CODEX-MODEL"},"target_definition_algorithm":"vnext-product-definition/v1","target_definition_sha256":"21738c1a93233ef9514651b546f2f934734737c7da0f78f08c9fc3ebc49c9d47","goal_basis":{"kind":"file","path":"docs/product/GOALS.md","sha256":"b3b4fdef1381fd850a07b3902faa9781ea2c0577effaf14c468c2eb2225f05fe","item_id":"GOAL-TERMLINK"},"goal_definition_algorithm":"vnext-product-definition/v1","goal_definition_sha256":"08118d64b8a3894d258003de0c169c6c7b9db12a0b4f11d0ef2c8ea1f671788b","applicability":{"goal_id":"GOAL-TERMLINK","scope_id":"CURRENT-20261014-46","coverage":"本轮完整重评 REQ-TERMLINK-CODEX-MODEL 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"},"checked_at":"2026-10-14T19:26:06.530394+00:00","subject":{"kind":"commit","value":"a78fe55e033bbcb6db816acd2c801de5aa28a081","limitations":"本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"},"implementation":"partial-reported","verification":"pass-reported","conclusion":"undetermined","sources":[{"kind":"file","path":"docs/product/MANAGED_REQUIREMENTS.md","sha256":"3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"},{"kind":"file","path":"TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md","sha256":"9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"},{"kind":"file","path":"android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt","sha256":"1321f7ced1dc7fdfbca8d92d506435459820336860bb04a36ce83528a68e3401"},{"kind":"file","path":"android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt","sha256":"91a9e0f622f96fa2bb8c556fce9568708e848dd82e695d496b9bd03a10cf566e"},{"kind":"file","path":"docs/product/history/maintenance-20261011/task20260868-s1/repair-r-s1-002/android-test-summary.json","sha256":"52b31168c56be2ce960301e0ac22115891a3a7b3618f48ed022288e8f280a67e"},{"kind":"file","path":"TASKS/TASK-20260722-002-android-codex-open-conversation-files.md","sha256":"f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/static-basis.json","sha256":"c39646a31276072028d2aaf95f7232c969dd94cfd2863884a96987b1ff080611"},{"kind":"file","path":"docs/product/history/maintenance-20261011/reassessment-20261014/request-and-scope.md","sha256":"e73e53f2079e58611252e305f5069b1a00d5ddc241f459278b1c0b365f096d94"}],"extensions":{"startup":{"state":"已开始过","basis":"3月slash/next-turn真实实施，60718原生真实catalog/owner选择器实施并真机验证；当前selectModel/selectReasoningEffort及owner确认协调存在。"},"batch":3}},
    {
      "id": "AS-CURRENT-20261014-47",
      "type": "assessment",
      "target": "REQ-TERMLINK-CODEX-PLAN",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-CODEX-PLAN"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "a7f55acbeb9d7dcec83f07aaad882c7b2e4c672dc51c08faa1b23e8b22f85e92",
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
        "scope_id": "CURRENT-20261014-47",
        "coverage": "本轮完整重评 REQ-TERMLINK-CODEX-PLAN 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "docs/changes/records/CR-20260315-0139-codex-plan-validation.md",
          "sha256": "276cd1afeb6245f7cc9e77721b29b47219e3cbec2f755ae63fe4587cb2f9c29f"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260315-0200-codex-plan-workflow.md",
          "sha256": "111732c5a281fa151ddeff049f0032298cb4f19721da7b93fe784d760fb26186"
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
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md",
          "sha256": "d2392505b446677960b4f4f945f8617f1d0a407ec04ff22b66a9f6106fe0939a"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/plan-cycle-7.txt",
          "sha256": "a367f3484c02b20b8570cf049e25b99b08f0d8e6fb6c42374de924d63ad22d31"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
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
          "basis": "3月Plan workflow有实际代码与CR；现行Android toggle/continue/cancel/executeConfirmedPlan存在；10/13实际宿主规划与问题已触发。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-48",
      "type": "assessment",
      "target": "REQ-TERMLINK-CODEX-SLASH",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-CODEX-SLASH"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "d563f6cb5910ef82a79cd446605adeccb63d9cef14a133a251eb065ea8f20617",
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
        "scope_id": "CURRENT-20261014-48",
        "coverage": "本轮完整重评 REQ-TERMLINK-CODEX-SLASH 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "docs/changes/records/CR-20260311-1422-codex-phase2-slash-plan-overrides.md",
          "sha256": "811c5fc615c7073b6aecef7ef33dcb69a35eac9773cd9e290370a386f4d25f78"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md",
          "sha256": "d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt",
          "sha256": "1321f7ced1dc7fdfbca8d92d506435459820336860bb04a36ce83528a68e3401"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt",
          "sha256": "9a750f7a067a30e36a5cc3233a80917e0a7a9a1ae53c2f7ea1e2207bf42fe36a"
        },
        {
          "kind": "file",
          "path": "public/lib/codex_slash_commands.js",
          "sha256": "8213036327a64983738a7f085ae1592bee8771a274429ce7983495b4b475c5c9"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
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
          "basis": "CR-20260311-1422实际registry/parse/dispatch实现且112测试通过；当前Kotlin和JS registry/dispatcher存在，不因缺子项绑定视未开始。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-49",
      "type": "assessment",
      "target": "REQ-TERMLINK-CODEX-SKILLS",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-CODEX-SKILLS"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "3079251b4365b3e847d88ae9d00c4981814bb8c565a5d9a8a7c9d910cb638caa",
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
        "scope_id": "CURRENT-20261014-49",
        "coverage": "本轮完整重评 REQ-TERMLINK-CODEX-SKILLS 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md",
          "sha256": "52c54e998b6f7e2ac32bc871d761720d96f58b2ed611b691b43b057ff7b1f6cd"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md",
          "sha256": "d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt",
          "sha256": "1321f7ced1dc7fdfbca8d92d506435459820336860bb04a36ce83528a68e3401"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt",
          "sha256": "7ac3b6380b59c433c3a649e05a08479fefd28e0f7ea9689098c42b4ce8ba6b64"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/skills-multi-permission-6.txt",
          "sha256": "c83108d531c4faaa459d3525d91086ff73881ef83ff53f189793ddcc54633ac7"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/skills-multi-permission-9.txt",
          "sha256": "ed6b54165f57751118d5188abfb533833884c0efb66c153f18235f0a608d5653"
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
          "basis": "60508已实际实现Web/Android多skill token和发送后显示；10/13真实cwd目录能发现两项Skills并手输两token到宿主。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-50",
      "type": "assessment",
      "target": "REQ-TERMLINK-CODEX-FILES",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-CODEX-FILES"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "f493d6e9c02049fa18db0d59333691f92d79da75b911ab915224a15341807081",
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
        "scope_id": "CURRENT-20261014-50",
        "coverage": "本轮完整重评 REQ-TERMLINK-CODEX-FILES 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt",
          "sha256": "1321f7ced1dc7fdfbca8d92d506435459820336860bb04a36ce83528a68e3401"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/验收报告.md",
          "sha256": "40a1faa6df133bce4cbcf7d9d9d72e3d2dca75e7b2a2a72ff19030cd72573304"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/file-api-result.json",
          "sha256": "1579f2a6b1deef7d4631581c4be8b58116a0422ba5547270ebc94d5cd66de370"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/file-send-diagnostic.json",
          "sha256": "bf3f83bf9f5aaf830c3f08ee7330143969bb9a030c4dc33a82784ade325a3378"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260319-1532-codex-file-mention-input.md",
          "sha256": "9072cc514d7742c2b293d8849a7d6cffc7d94d1dc21f25d27e1903eac583353a"
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
          "basis": "当前VM搜索/选中/拼接mention及Gateway工作区文件API存在；JOINT-53实际API筛选、真机选择、follower发送和宿主读取成功，已开始过。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-51",
      "type": "assessment",
      "target": "REQ-TERMLINK-CODEX-ATTACHMENTS",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-CODEX-ATTACHMENTS"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "f84fbd23323e6f3c5d9e203daba5c18a9e893f395cb93a2be61f00f04e442b85",
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
        "scope_id": "CURRENT-20261014-51",
        "coverage": "本轮完整重评 REQ-TERMLINK-CODEX-ATTACHMENTS 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt",
          "sha256": "2a8439a85cdea3425afded287a095a4ac7c1f1621d475bbece1b2dd0e46b8f00"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt",
          "sha256": "1321f7ced1dc7fdfbca8d92d506435459820336860bb04a36ce83528a68e3401"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md",
          "sha256": "d16160ee5c0c4a663055e008c6ab436086811c6792309a7d1b8fa55d969282bf"
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
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/attachment-valid-send-16.txt",
          "sha256": "5cea632bb1359f017a7eb95b404132233f66d746e8f1db83a1aecb08157c7ac9"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260722-002-android-codex-open-conversation-files.md",
          "sha256": "f519b122c8e551466568e164d353cc6d972f5708dc682c08e61272d63666e561"
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
          "basis": "60508发送后附件上下文与60722历史打开均有实际实施；10/13系统选择/有效图片识别与文档失败均有真实记录。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-52",
      "type": "assessment",
      "target": "REQ-TERMLINK-CODEX-APPROVAL",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-CODEX-APPROVAL"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "9e2440b7a58739c8e9c43b369d8d1af74c4eb2574140d53e1daf7affbeb29ae5",
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
        "scope_id": "CURRENT-20261014-52",
        "coverage": "本轮完整重评 REQ-TERMLINK-CODEX-APPROVAL 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt",
          "sha256": "1321f7ced1dc7fdfbca8d92d506435459820336860bb04a36ce83528a68e3401"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
        },
        {
          "kind": "file",
          "path": "docs/workflow/DECISIONS.md",
          "sha256": "747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/approval-allow-deny.json",
          "sha256": "b9eb6dcc6f7b864d69e165e978c77b15c0c68b50b46bc8bd514766e962ef6c38"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md",
          "sha256": "74cb3cab6fabaf0a96cdc2121fef66ee9df8273791d2fffe9115daef77f79784"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md",
          "sha256": "d2392505b446677960b4f4f945f8617f1d0a407ec04ff22b66a9f6106fe0939a"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/plan-cycle-7.txt",
          "sha256": "a367f3484c02b20b8570cf049e25b99b08f0d8e6fb6c42374de924d63ad22d31"
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
          "basis": "3月审批状态机已实施，7月Owner rawRequestId/control面交付；10/13真实命令允许/拒绝/恢复已执行。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-53",
      "type": "assessment",
      "target": "REQ-TERMLINK-CODEX-PERMISSION",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-CODEX-PERMISSION"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "6bcf5be3dd96b3f189ef35e34518f0323ec068d8c80b3df01bd8957acda96e0c",
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
        "scope_id": "CURRENT-20261014-53",
        "coverage": "本轮完整重评 REQ-TERMLINK-CODEX-PERMISSION 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md",
          "sha256": "9fbe84e353de05a2c6a922c71039338e315b4083dd9009050dce87ce58dd6f0a"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt",
          "sha256": "1321f7ced1dc7fdfbca8d92d506435459820336860bb04a36ce83528a68e3401"
        },
        {
          "kind": "file",
          "path": "android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt",
          "sha256": "91a9e0f622f96fa2bb8c556fce9568708e848dd82e695d496b9bd03a10cf566e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/task20260868-s1/repair-r-s1-002/android-test-summary.json",
          "sha256": "52b31168c56be2ce960301e0ac22115891a3a7b3618f48ed022288e8f280a67e"
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
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/skills-multi-permission-12.txt",
          "sha256": "200a94bae28b9df554b46d9a6c63126d134a2e2077efa8f3b1bbcf62383bcaf0"
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
          "basis": "60718实现owner/catalog真实权限弹层与next-turn tuple；10/13选择请求批准产生真实审批、custom重置后下一turn成功。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-54",
      "type": "assessment",
      "target": "REQ-TERMLINK-CODEX-BACKGROUND",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-CODEX-BACKGROUND"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "7447b2e1cf238b7cb2882c72f0f02b37177c942bc72db4de760a818531994a4c",
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
        "scope_id": "CURRENT-20261014-54",
        "coverage": "本轮完整重评 REQ-TERMLINK-CODEX-BACKGROUND 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "docs/changes/records/CR-20260330-2125-android-codex-foreground-service.md",
          "sha256": "bb5f1b101b5be324d20204ceecd98aea7f669c7b82cc9d68ddb4ca6ce19a685c"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt",
          "sha256": "d219cedc744472a8fcc2e6ab91b612de5bc4897250843f644d1dc24a06b4cbf6"
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
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/codex-background.json",
          "sha256": "44c3942e3b44d25f10994935d6689241bd507061a85649429f795e41f63dde6f"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/notification-return-13.txt",
          "sha256": "18afc1954ce8afaca3b56c2e12a5fd7ec686dacca4712cffa19b9f7153fbd939"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt",
          "sha256": "2a8439a85cdea3425afded287a095a4ac7c1f1621d475bbece1b2dd0e46b8f00"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt",
          "sha256": "1321f7ced1dc7fdfbca8d92d506435459820336860bb04a36ce83528a68e3401"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json",
          "sha256": "83e719243b408be9a9e67f0bb5b31b3061a4f5c4c719f72f129cc48b3061898e"
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
          "basis": "CR-20260330-2125前台服务实际恢复；60722真机Doze/配置/通知，10/13真实耗时任务后台/断网/回前台执行。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-55",
      "type": "assessment",
      "target": "REQ-TERMLINK-WORKSPACE-BROWSE",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-WORKSPACE-BROWSE"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "37321aee309249030a3b4af7e9d002bccf070ab323d2714a36dc2ddce9984a7c",
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
        "scope_id": "CURRENT-20261014-55",
        "coverage": "本轮完整重评 REQ-TERMLINK-WORKSPACE-BROWSE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md",
          "sha256": "7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"
        },
        {
          "kind": "file",
          "path": "public/workspace.js",
          "sha256": "70ecf520c43f03b4e02df0732e391dc29adb239d565dcf62b81fba2fe1b271f1"
        },
        {
          "kind": "file",
          "path": "src/routes/workspace.js",
          "sha256": "13e8fcf7fa8ef5573e1cfcd1765985f35d7b30740d615780938adb6557da29f5"
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
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/workspace-back-6.txt",
          "sha256": "9ed33e133cef8aa6dc49f591b464e3f852969fb1fb0ea7325248933899a7a59d"
        },
        {
          "kind": "file",
          "path": "src/services/workspaceFileService.js",
          "sha256": "208b920c1613478ebf0746182f59574a29434fd2f3d2b12d0fef0d76c7eae5b5"
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
          "basis": "60718-003实际重写目录/搜索且47/47 focused与浏览器/真机通过，当前实现存在；10/13目录入口/返回再次通过。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-56",
      "type": "assessment",
      "target": "REQ-TERMLINK-WORKSPACE-PREVIEW",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-WORKSPACE-PREVIEW"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "c3564c80af359635cf0e1eacbea8b293d8144861f570089f73fb3c295061bb39",
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
        "scope_id": "CURRENT-20261014-56",
        "coverage": "本轮完整重评 REQ-TERMLINK-WORKSPACE-PREVIEW 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md",
          "sha256": "7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"
        },
        {
          "kind": "file",
          "path": "src/services/workspaceFileService.js",
          "sha256": "208b920c1613478ebf0746182f59574a29434fd2f3d2b12d0fef0d76c7eae5b5"
        },
        {
          "kind": "file",
          "path": "public/workspace.js",
          "sha256": "70ecf520c43f03b4e02df0732e391dc29adb239d565dcf62b81fba2fe1b271f1"
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
          "path": "TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md",
          "sha256": "519c2e36353d8847f818346a48baccd6e567ffa8da770b0d6ac3cf58bde5a1b8"
        },
        {
          "kind": "file",
          "path": "public/workspace.css",
          "sha256": "0773f99716f6aed9f7f479727690b824416442449409c3641d2313fe9e52dc3a"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt",
          "sha256": "c1c09d74c2e23cf240647cbb3fe4389e5c39573f7240a728ebc00e70da5f22b8"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt",
          "sha256": "eb48c499981000b52116a804481eacc4c6365f64a3e5c074263bea2b16efd7d5"
        },
        {
          "kind": "file",
          "path": "src/services/workspaceCompareService.js",
          "sha256": "b08f81cf995a691f9d4ab70a686c18ea4637e974f2a8166ee9b8037e9e4c91e8"
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
          "basis": "60718-003实现文本/Markdown/图片/PDF/不可预览反馈，60719修字号和换行；当前渲染代码存在，10/13PDF额外失败直接影响本子项。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-57",
      "type": "assessment",
      "target": "REQ-TERMLINK-WORKSPACE-DIFF",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-WORKSPACE-DIFF"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "2a0444c55f5806e4d6f998e3797614b653b7609e080a42bd4ec081aa2a803c85",
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
        "scope_id": "CURRENT-20261014-57",
        "coverage": "本轮完整重评 REQ-TERMLINK-WORKSPACE-DIFF 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md",
          "sha256": "7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"
        },
        {
          "kind": "file",
          "path": "src/services/workspaceCompareService.js",
          "sha256": "b08f81cf995a691f9d4ab70a686c18ea4637e974f2a8166ee9b8037e9e4c91e8"
        },
        {
          "kind": "file",
          "path": "src/routes/workspace.js",
          "sha256": "13e8fcf7fa8ef5573e1cfcd1765985f35d7b30740d615780938adb6557da29f5"
        },
        {
          "kind": "file",
          "path": "public/workspace.js",
          "sha256": "70ecf520c43f03b4e02df0732e391dc29adb239d565dcf62b81fba2fe1b271f1"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/workspace-diff-8.txt",
          "sha256": "a9a2204a45efe7f3ec93c2c85757b5e0337b253e44dde98107f9a3127543e44b"
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
          "basis": "60718-003真实实现HEAD/双文本paired hunks与浏览器/真机验证，10/13 HEAD差异再次通过。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-58",
      "type": "assessment",
      "target": "REQ-TERMLINK-WORKSPACE-DOWNLOAD",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-WORKSPACE-DOWNLOAD"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "308c932ca3812c493c9c88612033237a69f46af1b31f66c07728c542e8fbd426",
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
        "scope_id": "CURRENT-20261014-58",
        "coverage": "本轮完整重评 REQ-TERMLINK-WORKSPACE-DOWNLOAD 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md",
          "sha256": "7876e5f9602c8318bd88243784d4008ce430dce6e33c10056efecf84280ae612"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt",
          "sha256": "c1c09d74c2e23cf240647cbb3fe4389e5c39573f7240a728ebc00e70da5f22b8"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/ANDROID-20261013.md",
          "sha256": "4c145a3017a525faf0fbfedd1e1f553f2ea3ba5eff42dd154349d3a272e878f4"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/download-and-cleanup.json",
          "sha256": "a7240af70d6fb22b082c049f526ec5bd9fb8bd2af49e54148d9750000b6ed438"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/workspace-viewer-final-10.txt",
          "sha256": "05ca08660a73ce65bb5235d7de4dcb5dcb56aaac7897b090123e171a6ea15e40"
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
          "basis": "60718-003实现Basic/mTLS原生下载、25MiB上限/24h清理/FileProvider；10/13真实Basic ZIP下载/打开/清理已做。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-59",
      "type": "assessment",
      "target": "REQ-TERMLINK-TERMINAL-IO",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-TERMINAL-IO"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "71bdaa180da2f8cdda38ab1903d6e38e5066dc1b916e0a9b8f1582fa945ba0b9",
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
        "scope_id": "CURRENT-20261014-59",
        "coverage": "本轮完整重评 REQ-TERMLINK-TERMINAL-IO 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "public/terminal.js",
          "sha256": "9d2f8e2dfd1a2adc09f6d5d43242997e975b9d168d8d2e64fb342f5d8914b702"
        },
        {
          "kind": "file",
          "path": "public/terminal_client.js",
          "sha256": "6eff45696997ffcbc3b2313c451ec38b2d9bd4e8958ad9743317e164c01306ba"
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
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/验收报告.md",
          "sha256": "40a1faa6df133bce4cbcf7d9d9d72e3d2dca75e7b2a2a72ff19030cd72573304"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json",
          "sha256": "da7773fc6a798e5e3c7a27e7a75fed93db7e221b71df89fcf917da9c5f696d56"
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
          "basis": "PTY/WebSocket input/resize现有实现与10/13真实浏览器/Android/服务端命令结果证明已实施且已验部分。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-60",
      "type": "assessment",
      "target": "REQ-TERMLINK-SESSION-MANAGEMENT",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-SESSION-MANAGEMENT"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "2f6b36dd7234e0bbe3ab721e870fc59246058f3b9d10dbaca9380d8fbeb8fe7d",
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
        "scope_id": "CURRENT-20261014-60",
        "coverage": "本轮完整重评 REQ-TERMLINK-SESSION-MANAGEMENT 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "src/repositories/sessionStore.js",
          "sha256": "f94dbabd8986c807611279e7a34ecb33184f3287b414729fcbceb294d4b641df"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/phone-delete-resource-result.json",
          "sha256": "636ce46ed1d56d495ef8f55e50488183d1f6f5ce0487fafcd0664517dad5e125"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json",
          "sha256": "da7773fc6a798e5e3c7a27e7a75fed93db7e221b71df89fcf917da9c5f696d56"
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
          "basis": "sessionManager/routes与Android Sessions均已实际实现；JOINT-63专用会话创建/选择/改名/删除及PTY释放真机和服务端对照通过。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-61",
      "type": "assessment",
      "target": "REQ-TERMLINK-TERMINAL-REFRESH",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-TERMINAL-REFRESH"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "10761ddbe8592cce4311219f77eea10f25d1bc384e006a465e2dbb5489bbc2f2",
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
        "scope_id": "CURRENT-20261014-61",
        "coverage": "本轮完整重评 REQ-TERMLINK-TERMINAL-REFRESH 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md",
          "sha256": "3bec9e6ed1538479d9d7e19e0281cc95c15cb953b76fa518312691530517d9a2"
        },
        {
          "kind": "file",
          "path": "public/codex_ipc.js",
          "sha256": "6005a197d0d454277c423925351c0ea60d9eb3309ae995c315fdcdcbd1c38a6b"
        },
        {
          "kind": "file",
          "path": "public/terminal.js",
          "sha256": "9d2f8e2dfd1a2adc09f6d5d43242997e975b9d168d8d2e64fb342f5d8914b702"
        },
        {
          "kind": "file",
          "path": "docs/product/assessments/JOINT-20261013.md",
          "sha256": "48cb0de283e264cc98632484780005386ec5c2e1a01484307e08227e7a97899e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/joint-validation-20261013/验收报告.md",
          "sha256": "40a1faa6df133bce4cbcf7d9d9d72e3d2dca75e7b2a2a72ff19030cd72573304"
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
          "basis": "60618真实复现embedded IPC无ID抢连导致重复创建，已修改public/codex_ipc.js并浏览器刷新验证；10/13同PID/变量刷新续接。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-62",
      "type": "assessment",
      "target": "REQ-TERMLINK-BROWSER-LOGIN",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-BROWSER-LOGIN"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "166793abbdf275deda85f660fb27fea2d2a78a4a00e823bf151415a455cd400b",
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
        "scope_id": "CURRENT-20261014-62",
        "coverage": "本轮完整重评 REQ-TERMLINK-BROWSER-LOGIN 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md",
          "sha256": "0ca9e2d8d77b6aaef377989609b259258312b93c9352e77361f70cc754ddfe7f"
        },
        {
          "kind": "file",
          "path": "public/login.js",
          "sha256": "7d510b54a4f3ef8864dcf9a0f91dad0d1de7dcfc9f1707c2995f1253ae7643ce"
        },
        {
          "kind": "file",
          "path": "src/auth/basicAuth.js",
          "sha256": "c86cf29176581d07966d2835c5eb1c940822101258ab212acb772db0c679efc2"
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
          "basis": "60715-002步骤1/2/8/9已实现独立登录、Cookie/logout并真实HTTP/Edge验收；当前basicAuth/login.js路径保留。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-63",
      "type": "assessment",
      "target": "REQ-TERMLINK-HISTORY-SOURCE",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-HISTORY-SOURCE"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "291af43b82637fff7fab1d3784d99ac7a2fba6addbd1d7a8bddf48e8c3661093",
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
        "scope_id": "CURRENT-20261014-63",
        "coverage": "本轮完整重评 REQ-TERMLINK-HISTORY-SOURCE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md",
          "sha256": "95b7acec050f03b9e69ae76d035682c67f67a8087d9fdb22a93164062d9a326e"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md",
          "sha256": "95c54eb8f73d8bd7bc119ce85f5552f1cd6575678f81eae0845ebc15898e2066"
        },
        {
          "kind": "file",
          "path": "native/codex-rollout-collector/src/protocol/startup.rs",
          "sha256": "3520f79dff58272f9a7a08b883d1fb89651b9ba52863d0d2e8b96e03a295256c"
        },
        {
          "kind": "file",
          "path": "native/codex-rollout-collector/src/protocol/target_source.rs",
          "sha256": "c398fdb5da553e053db7d3ff55f588903ad9222ca2cbcf8804335523bdabc1f7"
        },
        {
          "kind": "file",
          "path": "native/codex-rollout-collector/src/source/discovery.rs",
          "sha256": "13b9092a2653c4555035fb1767cc0ebac2dc1b2314042145f3a52692540a2d6e"
        },
        {
          "kind": "file",
          "path": "docs/workflow/DECISIONS.md",
          "sha256": "747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md",
          "sha256": "fcc1ff5a866d55311611242b529f622135bd9597f0b1ce89c6e7912a5b7e370f"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md",
          "sha256": "202da37853950965b1c980bb1b80512f64ff71f0e4d13f1aa45526bd8bf00410"
        },
        {
          "kind": "file",
          "path": "native/codex-rollout-collector/src/source/lineage.rs",
          "sha256": "ce9ca0c28fbd7da1e1cddbe7319d6cbd9fbb76e00f4e602741b8b03230ec22ab"
        },
        {
          "kind": "file",
          "path": "native/codex-rollout-collector/src/source/read_plan.rs",
          "sha256": "40f7070854e876542e3013eb6acb7b5f9c46ba06d1acafb80f0f5501c48e91e5"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/TASK832-close-report.md",
          "sha256": "7a5eec7b35440317bcab207b0d066809583349bdebce4cc3d65cbedaa0003607"
        },
        {
          "kind": "file",
          "path": "native/codex-rollout-collector/src/source/append.rs",
          "sha256": "9932cf19b7f72ca512ef1053e3c8ead374cd71149480f4961bcb7487f1bf0e60"
        },
        {
          "kind": "file",
          "path": "native/codex-rollout-collector/src/protocol/target_runtime.rs",
          "sha256": "07df197d668c5c7f3731680f83ffe77daa271eafd73bc0f2c4ac4fa991ddf8f7"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md",
          "sha256": "04b7fff55add0bc00188f938b7546eacc7cd85df32ba9a961c105e2e65125e11"
        },
        {
          "kind": "file",
          "path": "docs/codex/codex-rollout-collector-architecture.md",
          "sha256": "3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"
        },
        {
          "kind": "file",
          "path": "native/codex-rollout-collector/src/codex_wire/profile.rs",
          "sha256": "5ca522be1afb6b8151df43e91f818a4fac02047a7541807fb9138ce713571bbc"
        },
        {
          "kind": "file",
          "path": "native/codex-rollout-collector/src/codex_adapter/mod.rs",
          "sha256": "7d594abcc56bf632ac04b0dd0d904e24317c298e3ffddccd75d42338adda35bc"
        },
        {
          "kind": "file",
          "path": "native/codex-rollout-collector/src/analysis.rs",
          "sha256": "3f35ef604287e5167739a83ae1c50e840e3d2ccabcce45cbdc3009b2eddbaffa"
        },
        {
          "kind": "file",
          "path": "docs/workflow/CONTRACTS.md",
          "sha256": "c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"
        },
        {
          "kind": "file",
          "path": "docs/codex/codex-history-product-contract.md",
          "sha256": "39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json",
          "sha256": "7bd2ee90ef2820a13171614171ce8ed2379125e083e3d961af6a89bb79b108c1"
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
          "basis": "60819–28有实际Rust实施/阶段执行；832/833已实际修复父来源/cut、完整行窗口、委派Adapter并经过独立Rust审查，当前target-v2代码存在。AD-022旧“尚未开始”和架构旧“833待交付”均不能覆盖后来实际交付。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-64",
      "type": "assessment",
      "target": "REQ-TERMLINK-HISTORY-PERSISTENCE",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-HISTORY-PERSISTENCE"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "979779b830821bee700213db23a6e2b36f6342d33225ed0b5e1ec7d9e5a368a8",
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
        "scope_id": "CURRENT-20261014-64",
        "coverage": "本轮完整重评 REQ-TERMLINK-HISTORY-PERSISTENCE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "src/services/codexRolloutCollector/analysisBatchImporter.js",
          "sha256": "c5cd7c8fbd89a3b3df2d15542ff34ab91be49e4ec3ac3bb205a83d8bb9e7f49c"
        },
        {
          "kind": "file",
          "path": "src/services/codexHistoryProductStore.js",
          "sha256": "f58d3751756e26e6c207f3aa13e8b603c92d2327af333194a0dac79f0cd5fd16"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20260928-task004-s3.md",
          "sha256": "fea98e22f4b6b24e845f7cff199be9a002898daa7308a47fb5b67067d4c1f218"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md",
          "sha256": "04b7fff55add0bc00188f938b7546eacc7cd85df32ba9a961c105e2e65125e11"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md",
          "sha256": "fcc1ff5a866d55311611242b529f622135bd9597f0b1ce89c6e7912a5b7e370f"
        },
        {
          "kind": "file",
          "path": "docs/codex/codex-history-product-contract.md",
          "sha256": "39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"
        },
        {
          "kind": "file",
          "path": "src/services/codexHistoryProductProvider.js",
          "sha256": "00b4da43488098bcb67bc35879cbfe9ddb3676dd0f83c23216023c71393201de"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/TASK832-close-report.md",
          "sha256": "7a5eec7b35440317bcab207b0d066809583349bdebce4cc3d65cbedaa0003607"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md",
          "sha256": "1420cfc800a31826a6bebcafa17cbe84d3704601da65ccc3bf325be38a1767e6"
        },
        {
          "kind": "file",
          "path": "docs/workflow/CONTRACTS.md",
          "sha256": "c9273b9813279785e1f4c0cc48ff49b0d6de6c22dde08bb88811a46187be874c"
        },
        {
          "kind": "file",
          "path": "docs/codex/codex-rollout-collector-architecture.md",
          "sha256": "3daca8e585adb14d84b02e2886e65850a5a446599637ec73aa3249824a66354d"
        },
        {
          "kind": "file",
          "path": "docs/workflow/DECISIONS.md",
          "sha256": "747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json",
          "sha256": "7bd2ee90ef2820a13171614171ce8ed2379125e083e3d961af6a89bb79b108c1"
        },
        {
          "kind": "file",
          "path": ".workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json",
          "sha256": "f7669c82e1fcf599dd783a4f62eafb611a66f22399f2a8cdc764914d001a31cd"
        },
        {
          "kind": "file",
          "path": ".workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000001.json",
          "sha256": "4f7d9f7460c71cc0547aceaef8069a390452e1c7028ac2bc2a4b7945244fcea5"
        },
        {
          "kind": "file",
          "path": ".workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin",
          "sha256": "8ad86b7c809b663ceaac22b7d00699cfca3e9cfe2f1ebe348e73033ed0d69a12"
        },
        {
          "kind": "file",
          "path": ".workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000001.bin",
          "sha256": "a10f1894a02384d1cf724a80c5053e2a8c648deddf5382fbce3f91a998fcf756"
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
          "basis": "004原执行已把真实Node产品Store/provider接入；833 S5有真实Rust→Node→SQLite staging/ACK/complete/rollback与重开；832原持久根三类样本保存、provider和Gateway读回。不是只看AD-022设计或任务关闭。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-65",
      "type": "assessment",
      "target": "REQ-TERMLINK-HISTORY-ANDROID",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-HISTORY-ANDROID"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "f1112a89359f00595fec2d8c18bfb9956e808245978af22bbfbc81c7477e5704",
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
        "scope_id": "CURRENT-20261014-65",
        "coverage": "本轮完整重评 REQ-TERMLINK-HISTORY-ANDROID 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
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
          "path": "android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt",
          "sha256": "d2dc52d6d52e9603d2d39ab867b4ce191e8d17599447d0d0371223c890d9b64c"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt",
          "sha256": "1321f7ced1dc7fdfbca8d92d506435459820336860bb04a36ce83528a68e3401"
        },
        {
          "kind": "file",
          "path": "TASKS/TASK-003-rust-node-app.md",
          "sha256": "3ba5ae9714d8803f97e1ef1657327381bfd13298909baeae89b5a9212e0b1bec"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/TASK832-close-report.md",
          "sha256": "7a5eec7b35440317bcab207b0d066809583349bdebce4cc3d65cbedaa0003607"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md",
          "sha256": "1420cfc800a31826a6bebcafa17cbe84d3704601da65ccc3bf325be38a1767e6"
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
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/cold-launcher.xml",
          "sha256": "f1a09d4d185d55b04b1437d1587f718c3396cba2108cc17ee597ffa204e322d0"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md",
          "sha256": "fcc1ff5a866d55311611242b529f622135bd9597f0b1ce89c6e7912a5b7e370f"
        },
        {
          "kind": "file",
          "path": "src/ws/terminalGateway.js",
          "sha256": "5072477e3c49fc664e1a2ef9b884c6f517bc2bc9608c2b4b5f927423e22c5cdf"
        },
        {
          "kind": "file",
          "path": "docs/codex/codex-history-product-contract.md",
          "sha256": "39d029886c7e4ccef45c94012e57d8495221f4b0892a30f36a8e3a537884600d"
        },
        {
          "kind": "file",
          "path": "android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt",
          "sha256": "2a8439a85cdea3425afded287a095a4ac7c1f1621d475bbece1b2dd0e46b8f00"
        },
        {
          "kind": "file",
          "path": "docs/changes/records/CR-20261008-0135-android-history-detail-alias.md",
          "sha256": "74501ac5376ba0d3c2ad549aeed89cda79d4e4a41005e658f0392455480d8ba9"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt",
          "sha256": "c2a5596ca9c796ebd94af7028d7e26a709b077027a8e8f605e0ee414d15ddaab"
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
          "path": "docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json",
          "sha256": "8420f108e8832398bdd92e898eaa82d8ac4b423d909ba5df7571433013aad2a3"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json",
          "sha256": "7bd2ee90ef2820a13171614171ce8ed2379125e083e3d961af6a89bb79b108c1"
        },
        {
          "kind": "file",
          "path": ".workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json",
          "sha256": "f7669c82e1fcf599dd783a4f62eafb611a66f22399f2a8cdc764914d001a31cd"
        },
        {
          "kind": "file",
          "path": ".workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000001.json",
          "sha256": "4f7d9f7460c71cc0547aceaef8069a390452e1c7028ac2bc2a4b7945244fcea5"
        },
        {
          "kind": "file",
          "path": ".workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin",
          "sha256": "8ad86b7c809b663ceaac22b7d00699cfca3e9cfe2f1ebe348e73033ed0d69a12"
        },
        {
          "kind": "file",
          "path": ".workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000001.bin",
          "sha256": "a10f1894a02384d1cf724a80c5053e2a8c648deddf5382fbce3f91a998fcf756"
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
          "basis": "旧003已开始且用户停止，不等于完成；004/005实作cache/range/detail，831实际核查，832三类手机alias修复及216 JVM/同机重验，10/13再现真实大详情阅读失败。"
        },
        "batch": 3
      }
    },
    {
      "id": "AS-CURRENT-20261014-66",
      "type": "assessment",
      "target": "REQ-TERMLINK-SESSION-METADATA-RECOVERY",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075",
        "item_id": "REQ-TERMLINK-SESSION-METADATA-RECOVERY"
      },
      "target_definition_algorithm": "vnext-product-definition/v1",
      "target_definition_sha256": "a7526901ee00d2cf108661a4f989332b889ce98a58da02769d3605d3cf0a6eca",
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
        "scope_id": "CURRENT-20261014-66",
        "coverage": "本轮完整重评 REQ-TERMLINK-SESSION-METADATA-RECOVERY 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。"
      },
      "checked_at": "2026-10-14T19:26:06.530394+00:00",
      "subject": {
        "kind": "commit",
        "value": "a78fe55e033bbcb6db816acd2c801de5aa28a081",
        "limitations": "本次只读已有材料并静态核对源码与版本；历史运行结果按报告原对象/输入/设备边界引用，不代表在本提交新运行或当前部署已验证。"
      },
      "implementation": "partial-reported",
      "verification": "unknown",
      "conclusion": "undetermined",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/MANAGED_REQUIREMENTS.md",
          "sha256": "3a60d0ce17a35f8573c5810e82342e073de3d6e5c4b0a82d82773a2f80f96075"
        },
        {
          "kind": "file",
          "path": "docs/product/PRODUCT_REQUIREMENTS.md",
          "sha256": "f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"
        },
        {
          "kind": "file",
          "path": "docs/workflow/DECISIONS.md",
          "sha256": "747236c53ae0ee5450b0cdfd8e2b69eb2de83758a1b61cccc5b4742000f985fd"
        },
        {
          "kind": "file",
          "path": "src/repositories/sessionStore.js",
          "sha256": "f94dbabd8986c807611279e7a34ecb33184f3287b414729fcbceb294d4b641df"
        },
        {
          "kind": "file",
          "path": "src/services/sessionManager.js",
          "sha256": "dd95fb681fb92736a5d09fe969173f3b9efe380260c537e2e53af5864ccaba94"
        },
        {
          "kind": "file",
          "path": "src/server.js",
          "sha256": "ad0f206de6eb7b03c5a1f78a56345641c640c4bcd48c56dcdbb97c70c039d5d6"
        },
        {
          "kind": "file",
          "path": "tests/sessionStore.metadata.test.js",
          "sha256": "14bbc82719312eb010e6cfe2417622d019616cdf35407248e7713811c18b63af"
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
          "basis": "sessionManager构造调用restorePersistedSessions；SessionStore.loadSync/save/saveSync与进程退出flush为明确实现，DECISIONS AD-001已有JSON持久化路线。即使无独立TaskBinding也已开始过，不能标未开始。"
        },
        "batch": 3
      }
    }
  ]
}
---

# TermLink current需求分批重评 3 / 3

固定基线 `a78fe55e033bbcb6db816acd2c801de5aa28a081`；本批22项，详细判断只保存在各单target报告，原历史报告不改写。

## [AS-CURRENT-20261014-45] Codex线程创建恢复与工作区历史

<a id="AS-CURRENT-20261014-45"></a>

### 覆盖范围

需求：[REQ-TERMLINK-CODEX-THREADS](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CODEX-THREADS)。本轮完整重评 REQ-TERMLINK-CODEX-THREADS 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。60504实际修改thread/list cwd/active-thread隔离，60510步骤12–15真实Android执行；当前newThread/resumeThread及会话绑定路径存在，10/13专用线程切换/launcher冷启通过，不依赖新拆分项是否有TaskBinding。

结论：**undetermined**。实现标记 partial-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 新建、查看历史、读取/恢复已有线程并保持conversation绑定 | newThread显式新任务；resumeThread建立selection generation、cache-first选择、follow/history sync及metadata resume；Gateway recovery动作保持retry/fork/new/cancel。 | 60510 fresh thread与重入已通过；ANDROID-48真实launcher冷启动及选定历史恢复通过；868 S3 A→B→A与/new仅补旧提示清理。 | 未从已读材料确认本功能有新的未交付部分 | 5月自动thread-not-found→new行为已被现行用户确认恢复替代，不能移植旧fallback PASS；未声称所有损坏/旧历史均通过。 | TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md；TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/ws/terminalGateway.js；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/cold-prepare-4.txt；docs/product/history/maintenance-20261011/android-validation-20261013/cold-launcher.xml；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json |
| 工作区历史按当前cwd筛选，切换不沿用另一cwd结果 | refreshThreadHistory显式带cwd；请求profile/generation/cwd绑定；网关为旧空请求补当前session cwd。 | 60510步骤12双cwd、13 A/B、14重入、15新建通过；当前查询/隔离静态路径保留。 | 当前跨cwd隔离是否完全满足待核；没有已确认新增实现缺陷。 | 60510完成报告首次固化于2e331ae3c472b77ed8b7b79beaa99e3eb09ca248，但原tmp/step12-15 APK/source manifest未随checkout留存。该时点到a78的ViewModel/Gateway已有大量IPC/selection改动，当前cwd/generation实现存在不能单独继承5月跨cwd真机PASS；10/13仅同cwd恢复，故跨cwd现行完整行为未知，整体由satisfied调整为undetermined。 | TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md；TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/ws/terminalGateway.js |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。
- 10/13新建/恢复成果保留；旧binding语义变迁与有限设备范围另列，不能据此证明全部IPC owner控制面或现行跨cwd选择满足。
- 60510完成报告首次固化于2e331ae3c472b77ed8b7b79beaa99e3eb09ca248，但原tmp/step12-15 APK/source manifest未随checkout留存。该时点到a78的ViewModel/Gateway已有大量IPC/selection改动，当前cwd/generation实现存在不能单独继承5月跨cwd真机PASS；10/13仅同cwd恢复，故跨cwd现行完整行为未知，整体由satisfied调整为undetermined。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md](../../../TASKS/TASK-20260504-001-scope-codex-history-and-active-thread-state-by-session-cwd.md)
- [TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md](../../../TASKS/TASK-20260510-001-complete-20260504-001-android-smoke-and-archive-decision.md)
- [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/cold-prepare-4.txt](../history/maintenance-20261011/android-validation-20261013/cold-prepare-4.txt)
- [docs/product/history/maintenance-20261011/android-validation-20261013/cold-launcher.xml](../history/maintenance-20261011/android-validation-20261013/cold-launcher.xml)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json](../history/maintenance-20261011/task20260868-s3/source-manifest.json)

### 剩余与待核对

- 先恢复60510跨cwd实测对象与当前selection/cwd链的可追溯版本桥接；若无法定位保持未知，不能仅因源码有cwd过滤就判整体满足。保留10/13同cwd新建/恢复已验成果。

依赖与排序依据：



尚未核对/不可得材料：

- docs/product/history/maintenance-20261011/android-validation-20261013/history-thread-switch.log：原报告引用但checkout未保留；结论使用已读原报告及列出的现存证据，不声称读到该raw文件
- 60510完成报告首次固化于2e331ae3c472b77ed8b7b79beaa99e3eb09ca248，但原tmp/step12-15 APK/source manifest未随checkout留存。该时点到a78的ViewModel/Gateway已有大量IPC/selection改动，当前cwd/generation实现存在不能单独继承5月跨cwd真机PASS；10/13仅同cwd恢复，故跨cwd现行完整行为未知，整体由satisfied调整为undetermined。

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-46] Codex模型与推理选择

<a id="AS-CURRENT-20261014-46"></a>

### 覆盖范围

需求：[REQ-TERMLINK-CODEX-MODEL](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CODEX-MODEL)。本轮完整重评 REQ-TERMLINK-CODEX-MODEL 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。3月slash/next-turn真实实施，60718原生真实catalog/owner选择器实施并真机验证；当前selectModel/selectReasoningEffort及owner确认协调存在。

结论：**undetermined**。实现标记 partial-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| slash/快捷与原生选择器使用真实catalog/owner，发送前写入下一回合模型/推理 | showModelPicker触发model/list；选择保存nextTurnOverrides；effective配置按pending→owner→session→default；模型切换依据supportedReasoningEfforts/default。 | 60718设备360/412规格模型/推理已验；当前ThreadReadyTest覆盖catalog默认、隐藏旧模型、切换effort；868最终169个ThreadReady/总292 focused JVM通过。 | 模型UI当前完整闭环适用证据待核，已有catalog/owner/next-turn状态实现与局部测试成果保留。 | 60718可视化完成记录首次固化于f0fd5f43bc524198d5a645e342f1cafdc9aec7af；未恢复当时APK及UI源码manifest。到a78的CodexScreen/ViewModel有实质变更，尚未逐项对上模型弹层/实际选择/发送入口；868169个ThreadReady仅补状态映射，不证明现行真机模型UI完整通过，整体由satisfied调整为undetermined。 | TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt；docs/product/history/maintenance-20261011/task20260868-s1/repair-r-s1-002/android-test-summary.json；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。
- JVM证据是状态/映射补证；真实选项交互依据60718设备报告，不能只靠总测试数推出UI通过。
- 60718可视化完成记录首次固化于f0fd5f43bc524198d5a645e342f1cafdc9aec7af；未恢复当时APK及UI源码manifest。到a78的CodexScreen/ViewModel有实质变更，尚未逐项对上模型弹层/实际选择/发送入口；868169个ThreadReady仅补状态映射，不证明现行真机模型UI完整通过，整体由satisfied调整为undetermined。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md](../../../TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md)
- [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt)
- [android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt](../../../android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt)
- [docs/product/history/maintenance-20261011/task20260868-s1/repair-r-s1-002/android-test-summary.json](../history/maintenance-20261011/task20260868-s1/repair-r-s1-002/android-test-summary.json)
- [TASKS/TASK-20260722-002-android-codex-open-conversation-files.md](../../../TASKS/TASK-20260722-002-android-codex-open-conversation-files.md)

### 剩余与待核对

- 先定位现行模型/推理弹层选择→下一回合的既有真机结果或确切旧APK源码对应，不以868 JVM数量替代UI验收。

依赖与排序依据：



尚未核对/不可得材料：

- 60718可视化完成记录首次固化于f0fd5f43bc524198d5a645e342f1cafdc9aec7af；未恢复当时APK及UI源码manifest。到a78的CodexScreen/ViewModel有实质变更，尚未逐项对上模型弹层/实际选择/发送入口；868169个ThreadReady仅补状态映射，不证明现行真机模型UI完整通过，整体由satisfied调整为undetermined。

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-47] Codex计划交互

<a id="AS-CURRENT-20261014-47"></a>

### 覆盖范围

需求：[REQ-TERMLINK-CODEX-PLAN](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CODEX-PLAN)。本轮完整重评 REQ-TERMLINK-CODEX-PLAN 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。3月Plan workflow有实际代码与CR；现行Android toggle/continue/cancel/executeConfirmedPlan存在；10/13实际宿主规划与问题已触发。

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 进入/取消计划模式并发送真实计划文本 | togglePlanMode/handleSlashPlan/continue/cancel与follower intent已实现。 | CR-20260315-0139真实CLI plan语义；10/13能生成计划且早期B答案到达宿主。 | 未从已读材料确认本功能有新的未交付部分 | 旧CLI0.115.0-alpha.11语义证据只用于原版本；不单独证明现行所有宿主。 | docs/changes/records/CR-20260315-0139-codex-plan-validation.md；docs/changes/records/CR-20260315-0200-codex-plan-workflow.md；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md |
| 补充说明/选项回答与执行确认 | 有问题弹层与followerPlanResponse；成功提交等待后续owner事实，不以ack伪造完成。 | ANDROID-50报告宿主明确A/B options而手机只显示“仅支持选项式问题”且无选项；plan-cycle-7.txt实际手机画面与报告一致。 | 修复真实选项载体到Android可选答案的映射/展示，恢复补充链路；这是已知阻断。 | 报告引用host-interaction-evidence.log未在本checkout对应目录找到；保留报告的宿主观察层级，不冒称已读原host日志。 | docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md；docs/product/history/maintenance-20261011/android-validation-20261013/plan-cycle-7.txt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt |
| 确认执行后普通输入恢复默认模式与同canonical线程 | executeConfirmedPlan/下一turn配置/authority router有相应路径。 | 旧3月测试和7月控制面验收存在；10/13被options故障阻断，完整确认→执行→普通模式没有当前通过证据。 | 在选项阻断修复后核实确认执行和普通模式收口。 | 当前完整流程结果未知，不把旧PASS覆盖到失败的新流程。 | android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/ws/terminalGateway.js；docs/workflow/DECISIONS.md；docs/product/assessments/ANDROID-20261013.md |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260315-0139-codex-plan-validation.md](../../changes/records/CR-20260315-0139-codex-plan-validation.md)
- [docs/changes/records/CR-20260315-0200-codex-plan-workflow.md](../../changes/records/CR-20260315-0200-codex-plan-workflow.md)
- [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md](../history/maintenance-20261011/android-validation-20261013/验收报告.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/plan-cycle-7.txt](../history/maintenance-20261011/android-validation-20261013/plan-cycle-7.txt)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/workflow/DECISIONS.md](../../workflow/DECISIONS.md)

### 剩余与待核对

- 优先与CODEX-APPROVAL共同定位options映射；先修已证实失败，再按原流程检查执行确认/返回普通模式。

依赖与排序依据：



尚未核对/不可得材料：

- docs/product/history/maintenance-20261011/android-validation-20261013/host-interaction-evidence.log（报告引用但本checkout未找到）

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-48] Codex Slash解析与分发

<a id="AS-CURRENT-20261014-48"></a>

### 覆盖范围

需求：[REQ-TERMLINK-CODEX-SLASH](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CODEX-SLASH)。本轮完整重评 REQ-TERMLINK-CODEX-SLASH 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。CR-20260311-1422实际registry/parse/dispatch实现且112测试通过；当前Kotlin和JS registry/dispatcher存在，不因缺子项绑定视未开始。

结论：**undetermined**。实现标记 partial-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 通过现有registry/capability/dispatcher分发 | Android CodexSlashRegistry列真实命令与capability，VM dispatchSlashCommand处理已知动作；JS保留统一registry/resolve。 | 3月CR测试通过；60508 Node31/31包含slash相关测试；现行静态代码确认仍有分发/能力路径。 | 未从已读材料确认本功能有新的未交付部分 | 从3月至当前catalog和移动映射有演进，未逐个读取现行已开放命令全部执行证据，不能把旧112全量结果当现行命令矩阵。 | docs/changes/records/CR-20260311-1422-codex-phase2-slash-plan-overrides.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt；public/lib/codex_slash_commands.js |
| 未知/未开放命令明确反馈，不作为普通文本污染线程 | 未知entry追加system反馈并return；unsupported移动动作提示not yet supported；/goal独立真实语义门禁。 | 当前代码有明确分支，旧CR记录未知slash本地分发。 | 未从已读材料确认本功能有新的未交付部分 | 未定位当前版本未知/未开放命令实际发送边界的独立结果；只确认静态实现与历史验证。 | android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt；src/ws/terminalGateway.js |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260311-1422-codex-phase2-slash-plan-overrides.md](../../changes/records/CR-20260311-1422-codex-phase2-slash-plan-overrides.md)
- [TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md](../../../TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md)
- [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt)
- [android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt](../../../android/app/src/main/java/com/termlink/app/codex/data/CodexSlashRegistry.kt)
- [public/lib/codex_slash_commands.js](../../../public/lib/codex_slash_commands.js)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)

### 剩余与待核对

- 先定位现行registry/dispatcher既有结果及未知命令防发送证据，再决定是否存在实际剩余实现；不扩展未开放命令。

依赖与排序依据：



尚未核对/不可得材料：

- tests/codexSlashCommands.test.js当前全部用例与最近适用运行结果未完整配对
- Android现行slash capability动态完整分支未逐项实测

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-49] Codex多Skills输入

<a id="AS-CURRENT-20261014-49"></a>

### 覆盖范围

需求：[REQ-TERMLINK-CODEX-SKILLS](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CODEX-SKILLS)。本轮完整重评 REQ-TERMLINK-CODEX-SKILLS 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。60508已实际实现Web/Android多skill token和发送后显示；10/13真实cwd目录能发现两项Skills并手输两token到宿主。

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 按当前cwd发现Skills | Gateway skills/list注入cwds；路径解析按cwd/.codex/skills、skills、.claude/skills。 | 60503运行观察14与45目录差异仅是调查；60508后实现/10月两真实repo skills发现通过。 | 未从已读材料确认本功能有新的未交付部分 | 不把vNext .agents/skills自动作为App发现目录；旧文档调查不是修复本身。 | TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；src/ws/terminalGateway.js；docs/product/assessments/ANDROID-20261013.md |
| 多skill内联选择/移除/发送 | selectSkill写pendingSkillInsertName；token提取与发送数组存在。 | ANDROID-52：第一次$accept-one，第二次仅$accept-two；手输两个token能得到两marker；已读6/9屏幕文本。 | 第二次选择覆盖第一次，尚未满足UI多skill选择；修复composer插入/替换语义。 | 其他移除组合未覆盖；未发送重开丢失是实测观察，现正文没有明确要求持久草稿，不单独新增欠交。 | TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/skills-multi-permission-6.txt；docs/product/history/maintenance-20261011/android-validation-20261013/skills-multi-permission-9.txt；docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md](../../../TASKS/TASK-20260503-001-clarify-codex-app-skill-cwd-scope.md)
- [TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md](../../../TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt)
- [android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt](../../../android/app/src/main/java/com/termlink/app/codex/ui/CodexScreen.kt)
- [docs/product/history/maintenance-20261011/android-validation-20261013/skills-multi-permission-6.txt](../history/maintenance-20261011/android-validation-20261013/skills-multi-permission-6.txt)
- [docs/product/history/maintenance-20261011/android-validation-20261013/skills-multi-permission-9.txt](../history/maintenance-20261011/android-validation-20261013/skills-multi-permission-9.txt)
- [docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md](../history/maintenance-20261011/android-validation-20261013/验收报告.md)

### 剩余与待核对

- 优先修复已有双选覆盖；把多选、移除和真实发送作为同一最小闭环，保留手输多token已可用的成果。

依赖与排序依据：



尚未核对/不可得材料：



本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-50] Codex工作区文件提及

<a id="AS-CURRENT-20261014-50"></a>

### 覆盖范围

需求：[REQ-TERMLINK-CODEX-FILES](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CODEX-FILES)。本轮完整重评 REQ-TERMLINK-CODEX-FILES 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。当前VM搜索/选中/拼接mention及Gateway工作区文件API存在；JOINT-53实际API筛选、真机选择、follower发送和宿主读取成功，已开始过。

结论：**undetermined**。实现标记 partial-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 按当前cwd提示和筛选文件 | searchWorkspaceFiles(profile,sessionId,query)，使用workspace边界，generation过滤；结果形成FileMention。 | JOINT-53 file-api-result.json返回cwd内docs/proof.txt，外层package.json未出现。 | 未从已读材料确认本功能有新的未交付部分 | 受控跨cwd异步切换/延迟结果当前未验；不是失败。 | android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/joint-validation-20261013/验收报告.md；docs/product/history/maintenance-20261011/joint-validation-20261013/file-api-result.json |
| 显示可移除上下文，发送时消费 | buildPromptWithMentions以实际路径组装，发送使用pendingFileMentions并清理composer状态。 | 真实发送诊断fileMentionCount=1，宿主按路径读取后答首行；Web上下文可见。 | 先核对移除/消费及旧generation结果不会回流的既有证据。 | 全部移除/消费组合和受控迟到响应无充分证据；3月1532 CR实际仅文档，不是实施。 | android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/joint-validation-20261013/file-send-diagnostic.json；docs/changes/records/CR-20260319-1532-codex-file-mention-input.md |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/验收报告.md](../history/maintenance-20261011/joint-validation-20261013/验收报告.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/file-api-result.json](../history/maintenance-20261011/joint-validation-20261013/file-api-result.json)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/file-send-diagnostic.json](../history/maintenance-20261011/joint-validation-20261013/file-send-diagnostic.json)
- [docs/changes/records/CR-20260319-1532-codex-file-mention-input.md](../../changes/records/CR-20260319-1532-codex-file-mention-input.md)

### 剩余与待核对

- 先补全既有移除/消费与异步隔离证据定位；若真实缺陷成立再安排窄修复。

依赖与排序依据：



尚未核对/不可得材料：

- JOINT-53列出的controlled async switch/late generation/removal消费组合未验证

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-51] Codex图片文件附件与历史打开

<a id="AS-CURRENT-20261014-51"></a>

### 覆盖范围

需求：[REQ-TERMLINK-CODEX-ATTACHMENTS](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CODEX-ATTACHMENTS)。本轮完整重评 REQ-TERMLINK-CODEX-ATTACHMENTS 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。60508发送后附件上下文与60722历史打开均有实际实施；10/13系统选择/有效图片识别与文档失败均有真实记录。

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 选择本地图片/文件并发送，保留可见上下文 | readSelectedDocument对image读取bytes→data URL，非image仅FileReference(uri)；VM形成attachments/mentions并发送。 | 10/13有效PNG识别蓝方块与V20；文档content://只有手机私有引用，宿主明确无法访问。 | 让文档内容通过既有允许的真实传输方式对宿主可读，当前文件发送闭环未完成。 | 首张1x1无效PNG已排除；不计为产品失败。 | android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md；docs/product/history/maintenance-20261011/android-validation-20261013/attachment-valid-send-16.txt |
| 历史图片、文件提及、Markdown文件链接可打开 | CodexActivity openConversationAttachment/openConversationPath/FileProvider路径；60722明确交付。 | 60722真机Markdown附件打开已验；10/13图片发送可用，但文档发送/重开/打开闭环受阻。 | 在文档可传递后核实历史重开与打开，保留既有Markdown附件能力。 | 不是所有外部链接/系统查看器兼容性认证；当前全部历史附件重开组合未核。 | android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/product/assessments/ANDROID-20261013.md |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt)
- [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt)
- [TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md](../../../TASKS/TASK-20260508-001-codex-inline-multiple-skills-and-attachment-visible-history.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md](../history/maintenance-20261011/android-validation-20261013/验收报告.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/attachment-valid-send-16.txt](../history/maintenance-20261011/android-validation-20261013/attachment-valid-send-16.txt)
- [TASKS/TASK-20260722-002-android-codex-open-conversation-files.md](../../../TASKS/TASK-20260722-002-android-codex-open-conversation-files.md)

### 剩余与待核对

- 优先修正文档content://仅引用问题；随后只验证原本要求的发送→历史→重开/打开，别把Workspace文件路径与本地文档混同。

依赖与排序依据：



尚未核对/不可得材料：



本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-52] Codex审批与用户输入

<a id="AS-CURRENT-20261014-52"></a>

### 覆盖范围

需求：[REQ-TERMLINK-CODEX-APPROVAL](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CODEX-APPROVAL)。本轮完整重评 REQ-TERMLINK-CODEX-APPROVAL 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。3月审批状态机已实施，7月Owner rawRequestId/control面交付；10/13真实命令允许/拒绝/恢复已执行。

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 命令/补丁阻塞审批前置显示，允许/拒绝回传真实请求 | VM pending requests及response；Gateway authority ledger/rawRequestId保持原JSON类型；868只修不可用提示作用域。 | ANDROID-55命令批准返回marker，拒绝真实提交，审批恢复可用；旧AD-004记录真实Owner Approval闭环。 | 未从已读材料确认本功能有新的未交付部分 | 本轮真实补丁及全部审批类型未覆盖；868没有重验外部审批点击，不以139tests当真机补丁验收。 | android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/ws/terminalGateway.js；docs/workflow/DECISIONS.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/approval-allow-deny.json；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |
| 用户输入问题前置展示，可选答案真实提交 | 有user input弹层/提交入口，旧早期B答案到宿主。 | 10/13后续options丢失/未映射，手机无选项，无法回答。 | 修复问题options载体到UI/response映射，联合Plan复核。 | 原host日志在报告中引用但checkout文件缺失；失败依据保持报告+手机snapshot。 | docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md；docs/product/history/maintenance-20261011/android-validation-20261013/plan-cycle-7.txt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/workflow/DECISIONS.md](../../workflow/DECISIONS.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/approval-allow-deny.json](../history/maintenance-20261011/android-validation-20261013/approval-allow-deny.json)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md](../history/maintenance-20261011/android-validation-20261013/验收报告.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/plan-cycle-7.txt](../history/maintenance-20261011/android-validation-20261013/plan-cycle-7.txt)

### 剩余与待核对

- 与CODEX-PLAN共用一个options修复边界，保留命令审批已通过的具体场景。

依赖与排序依据：



尚未核对/不可得材料：

- docs/product/history/maintenance-20261011/android-validation-20261013/host-interaction-evidence.log（本checkout未找到）

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-53] Codex真实权限选择器

<a id="AS-CURRENT-20261014-53"></a>

### 覆盖范围

需求：[REQ-TERMLINK-CODEX-PERMISSION](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CODEX-PERMISSION)。本轮完整重评 REQ-TERMLINK-CODEX-PERMISSION 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。60718实现owner/catalog真实权限弹层与next-turn tuple；10/13选择请求批准产生真实审批、custom重置后下一turn成功。

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 真实owner/catalog权限选择、下一回合配置与快照反馈一致 | permissionProfile/list、动态profile选择、reviewer/profile/sandbox互斥、useConfigPermissions reset；owner确认后才协调override。 | 60718真机权限验证；ANDROID-56请求批准→真实审批及自定义重置→下一turn成功；ThreadReadyTest动态tuple、legacy fallback、sticky suppression，868当前169 ThreadReady tests通过。 | 未从已读材料确认本功能有新的未交付部分 | 不将所有风险操作/策略笛卡尔积追加为验收；旧客户端与未知组合按冻结契约保留。 | TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt；docs/product/history/maintenance-20261011/task20260868-s1/repair-r-s1-002/android-test-summary.json；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md；docs/product/history/maintenance-20261011/android-validation-20261013/skills-multi-permission-12.txt |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md](../../../TASKS/TASK-20260718-002-android-codex-conversation-visual-refresh.md)
- [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt)
- [android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt](../../../android/app/src/test/java/com/termlink/app/codex/CodexViewModelThreadReadyTest.kt)
- [docs/product/history/maintenance-20261011/task20260868-s1/repair-r-s1-002/android-test-summary.json](../history/maintenance-20261011/task20260868-s1/repair-r-s1-002/android-test-summary.json)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/验收报告.md](../history/maintenance-20261011/android-validation-20261013/验收报告.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/skills-multi-permission-12.txt](../history/maintenance-20261011/android-validation-20261013/skills-multi-permission-12.txt)

### 剩余与待核对

- 保留现有已实现/已验证权限链；宿主catalog改变时针对真实新组合复核，不恢复未采纳Session Defaults完整UI。

依赖与排序依据：



尚未核对/不可得材料：

- docs/product/history/maintenance-20261011/android-validation-20261013/permission-reset-history.log：原报告引用但checkout未保留；结论使用已读原报告及列出的现存证据，不声称读到该raw文件

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-54] Codex后台任务与恢复

<a id="AS-CURRENT-20261014-54"></a>

### 覆盖范围

需求：[REQ-TERMLINK-CODEX-BACKGROUND](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-CODEX-BACKGROUND)。本轮完整重评 REQ-TERMLINK-CODEX-BACKGROUND 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。CR-20260330-2125前台服务实际恢复；60722真机Doze/配置/通知，10/13真实耗时任务后台/断网/回前台执行。

结论：**undetermined**。实现标记 partial-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 活跃/等待状态保活并回连恢复当前任务 | CodexTaskForegroundService与connection状态、Activity通知入口存在；running/reconnecting/waiting审批使用前台保活。 | ANDROID-57真实耗时任务后台Wi-Fi关开后宿主完成，返回恢复正文、点击运行通知到正确任务；ANDROID-55审批恢复有成果。 | 未从已读材料确认本功能有新的未交付部分 | 等待用户输入/所有阻塞请求恢复未在当前完整覆盖；options问题仍影响可交互性。 | docs/changes/records/CR-20260330-2125-android-codex-foreground-service.md；android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt；TASKS/TASK-20260722-002-android-codex-open-conversation-files.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/codex-background.json；docs/product/history/maintenance-20261011/android-validation-20261013/notification-return-13.txt |
| 完成与错误通知按原范围收口 | Activity通知与VM状态路径；868 connectionErrorMessage/IPC操作提示分源清理。 | 10/13通知9201完成后为零；868 S3实际WS恢复/受控IPC同连接恢复/切换旧提示清理通过。 | 只针对未覆盖的错误/阻塞恢复分支定位证据，不重新实施已证实后台链。 | 旧完成/错误全部通知分支和等待态网络恢复仍未知；868局部clean不是全REQ通过。 | android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/changes/records/CR-20260330-2125-android-codex-foreground-service.md](../../changes/records/CR-20260330-2125-android-codex-foreground-service.md)
- [android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt](../../../android/app/src/main/java/com/termlink/app/CodexTaskForegroundService.kt)
- [TASKS/TASK-20260722-002-android-codex-open-conversation-files.md](../../../TASKS/TASK-20260722-002-android-codex-open-conversation-files.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/codex-background.json](../history/maintenance-20261011/android-validation-20261013/codex-background.json)
- [docs/product/history/maintenance-20261011/android-validation-20261013/notification-return-13.txt](../history/maintenance-20261011/android-validation-20261013/notification-return-13.txt)
- [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt)
- [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt)
- [docs/product/history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json](../history/maintenance-20261011/android-validation-20261013/notification-end-evidence.json)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json](../history/maintenance-20261011/task20260868-s3/source-manifest.json)

### 剩余与待核对

- 先以原后台/通知范围核对待审批、待输入、失败/取消的既有证据；只有真实缺口才安排修复。

依赖与排序依据：



尚未核对/不可得材料：

- 所有错误/阻塞等待恢复及完成通知组合：ANDROID-57与868close均明确未覆盖
- docs/product/history/maintenance-20261011/android-validation-20261013/notification-return.log：原报告引用但checkout未保留；结论使用已读原报告及列出的现存证据，不声称读到该raw文件

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-55] 只读工作区浏览与搜索

<a id="AS-CURRENT-20261014-55"></a>

### 覆盖范围

需求：[REQ-TERMLINK-WORKSPACE-BROWSE](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-WORKSPACE-BROWSE)。本轮完整重评 REQ-TERMLINK-WORKSPACE-BROWSE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。60718-003实际重写目录/搜索且47/47 focused与浏览器/真机通过，当前实现存在；10/13目录入口/返回再次通过。

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 默认docs/DOCS、返回根、移动钻取、宽屏懒树、面包屑/刷新/隐藏切换 | 共享workspace状态机与目录route；移动和宽屏使用同一只读数据源。 | 60718-003在1440/412/360浏览器及Huawei真机通过；10/13独立Git工作区目录/返回通过。 | 未从已读材料确认本功能有新的未交付部分 | 不扩大为未列入本项验收的全平台/全输入矩阵 | TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；public/workspace.js；src/routes/workspace.js；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-back-6.txt |
| 受限相对路径搜索，排除版本库/依赖/缓存并保持预算 | searchWorkspaceEntries限制20,000扫描、100结果，跳过排除目录，只返回workspace相对路径；route先resolveWorkspaceAccess。 | 60718-003专门搜索与47/47 workspace tests及真机搜索通过；代码预算保留。 | 未从已读材料确认本功能有新的未交付部分 | 不扩大为未列入本项验收的全平台/全输入矩阵 | TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；src/services/workspaceFileService.js；src/routes/workspace.js；public/workspace.js |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。
- 10/13 #09没有搜索覆盖，搜索成果依据60718-003原范围；不把最新狭窄PASS冒充全功能新测。
- 补充7月至当前版本桥接：60718-003完成报告首次固化commit f0fd5f43bc524198d5a645e342f1cafdc9aec7af；与a78逐blob比对后，workspaceFileService及workspaceCompareService仅CRLF变化（LF标准化SHA分别52fe1f6a…83e、2f82a7c8…29e相同）。workspace.js的runSearch/openSearchDialog/openCompareDialog/loadFileComparison/loadHeadDiff/renderStructuredDiff/renderLegacyDiff/renderEntries/renderBreadcrumbs九函数LF标准化逐字相同。已完整读语义diff：router只新增registration gate/ownership参数，client新增对应header、初始文件/路由恢复、More按钮代理及外观，原搜索/双文件处理未换。10/13有效Profile浏览和HEAD Diff补共享入口/请求链晚期成果；不能称10/13重新搜索或双文件实测。准确blob/hash和差异保存在外部batch3-legacy-source-comparison.json及batch3-workspace-semantic.diff。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md](../../../TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md)
- [public/workspace.js](../../../public/workspace.js)
- [src/routes/workspace.js](../../../src/routes/workspace.js)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json](../history/maintenance-20261011/android-validation-20261013/workspace-preview.json)
- [docs/product/history/maintenance-20261011/android-validation-20261013/workspace-back-6.txt](../history/maintenance-20261011/android-validation-20261013/workspace-back-6.txt)
- [src/services/workspaceFileService.js](../../../src/services/workspaceFileService.js)

### 剩余与待核对

- 保持已交付只读浏览/搜索；没有本项已证实欠交。Web Codex顶栏Docs坏链接属其入口范围，不把此处独立工作区搜索判失败。

依赖与排序依据：



尚未核对/不可得材料：

- 7月APK自身source-manifest未恢复；版本承接依完成任务首次Git快照、相关服务/函数等价及后来共享入口实测。新增More代理搜索/双文件入口没有单独10/13真机结果；不把它写成已运行。

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-56] 只读工作区文件预览

<a id="AS-CURRENT-20261014-56"></a>

### 覆盖范围

需求：[REQ-TERMLINK-WORKSPACE-PREVIEW](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-WORKSPACE-PREVIEW)。本轮完整重评 REQ-TERMLINK-WORKSPACE-PREVIEW 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。60718-003实现文本/Markdown/图片/PDF/不可预览反馈，60719修字号和换行；当前渲染代码存在，10/13PDF额外失败直接影响本子项。

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 编码/语言只读文本、分级大文件和高亮 | file service描述encoding/language/viewMode；共享viewer高亮及limited head/tail。 | 60718-003既有测试/浏览器/真机；10/13独立文本打开通过。 | 未从已读材料确认本功能有新的未交付部分 | 不扩大为未列入本项验收的全平台/全输入矩阵 | TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；src/services/workspaceFileService.js；public/workspace.js；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json |
| Markdown受控链接/资源、移动字号/长路径换行 | markdown-it禁HTML，受控资源；移动13px及overflow-wrap、代码12px pre-wrap。 | 60719 14/14+134/134、360/412像素/真机长路径通过。 | 未从已读材料确认本功能有新的未交付部分 | 不扩大为未列入本项验收的全平台/全输入矩阵 | TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md；public/workspace.css；public/workspace.js |
| 图片自然比例和离线PDF预览 | 共享image fit/actual与PDF.js离线mjs动态import实现。 | 10/13手机PDF报Failed to fetch dynamically imported module file:///android_asset/public/vendor/pdfjs/pdf.mjs；已读原屏幕文本。 | 修复Android assets/WebView离线PDF模块加载，不能将09文字/Diff/下载PASS覆盖PDF。 | 更多真实图片/编码样本是观察限制，非新造强制矩阵。 | TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；public/workspace.js；android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt |
| 二进制、非Git/无内容等给出可识别状态 | binary viewer与not_git/noChanges/errors明确分支。 | 60718-003受控预览及比较错误场景既有结果；当前代码分支保留。 | 未从已读材料确认本功能有新的未交付部分 | 不扩大为未列入本项验收的全平台/全输入矩阵 | TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；public/workspace.js；src/services/workspaceCompareService.js |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md](../../../TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md)
- [src/services/workspaceFileService.js](../../../src/services/workspaceFileService.js)
- [public/workspace.js](../../../public/workspace.js)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/workspace-preview.json](../history/maintenance-20261011/android-validation-20261013/workspace-preview.json)
- [TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md](../../../TASKS/TASK-20260719-001-fix-workspace-mobile-reading-scale.md)
- [public/workspace.css](../../../public/workspace.css)
- [android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt](../../../android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt)
- [docs/product/history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt](../history/maintenance-20261011/android-validation-20261013/workspace-pdf-10.txt)
- [src/services/workspaceCompareService.js](../../../src/services/workspaceCompareService.js)

### 剩余与待核对

- PDF模块导入是独立窄修复，可与终端/Codex工作并行；修复后只重核PDF及直接受影响资源加载。

依赖与排序依据：



尚未核对/不可得材料：



本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-57] 工作区Git HEAD与双文本比较

<a id="AS-CURRENT-20261014-57"></a>

### 覆盖范围

需求：[REQ-TERMLINK-WORKSPACE-DIFF](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-WORKSPACE-DIFF)。本轮完整重评 REQ-TERMLINK-WORKSPACE-DIFF 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。60718-003真实实现HEAD/双文本paired hunks与浏览器/真机验证，10/13 HEAD差异再次通过。

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| HEAD比较合并staged/unstaged，未跟踪/删除/无HEAD/无变化 | compareWorkspaceFileWithHead读取HEAD与当前工作树可选side；无HEAD为空side，非Git有typed状态。 | 60718-003明确各状态、47/47 focused与浏览器HEAD比较；10/13显示新增行。 | 未从已读材料确认本功能有新的未交付部分 | 不扩大为未列入本项验收的全平台/全输入矩阵 | TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；src/services/workspaceCompareService.js；src/routes/workspace.js；public/workspace.js；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-diff-8.txt |
| 任意两文本paired hunks，unified/side-by-side | compareWorkspaceFiles复用compareSides；每侧1MiB/50,000行，binary拒绝；UI双模式。 | 60718-003浏览器双文件比较通过；代码预算及双视图仍在。 | 未从已读材料确认本功能有新的未交付部分 | 不扩大为未列入本项验收的全平台/全输入矩阵 | TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；src/services/workspaceCompareService.js；public/workspace.js |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。
- 当期未包含全部编码/OEM样本；本项验收未要求新增全组合矩阵。
- 补充7月至当前版本桥接：60718-003完成报告首次固化commit f0fd5f43bc524198d5a645e342f1cafdc9aec7af；与a78逐blob比对后，workspaceFileService及workspaceCompareService仅CRLF变化（LF标准化SHA分别52fe1f6a…83e、2f82a7c8…29e相同）。workspace.js的runSearch/openSearchDialog/openCompareDialog/loadFileComparison/loadHeadDiff/renderStructuredDiff/renderLegacyDiff/renderEntries/renderBreadcrumbs九函数LF标准化逐字相同。已完整读语义diff：router只新增registration gate/ownership参数，client新增对应header、初始文件/路由恢复、More按钮代理及外观，原搜索/双文件处理未换。10/13有效Profile浏览和HEAD Diff补共享入口/请求链晚期成果；不能称10/13重新搜索或双文件实测。准确blob/hash和差异保存在外部batch3-legacy-source-comparison.json及batch3-workspace-semantic.diff。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md](../../../TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md)
- [src/services/workspaceCompareService.js](../../../src/services/workspaceCompareService.js)
- [src/routes/workspace.js](../../../src/routes/workspace.js)
- [public/workspace.js](../../../public/workspace.js)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/workspace-diff-8.txt](../history/maintenance-20261011/android-validation-20261013/workspace-diff-8.txt)

### 剩余与待核对

- 保留已核对的比较能力；不因10/13未重跑双文件而抹去适用历史成果。

依赖与排序依据：



尚未核对/不可得材料：

- 7月APK自身source-manifest未恢复；版本承接依完成任务首次Git快照、相关服务/函数等价及后来共享入口实测。新增More代理搜索/双文件入口没有单独10/13真机结果；不把它写成已运行。

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-58] Android认证下载与系统打开

<a id="AS-CURRENT-20261014-58"></a>

### 覆盖范围

需求：[REQ-TERMLINK-WORKSPACE-DOWNLOAD](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-WORKSPACE-DOWNLOAD)。本轮完整重评 REQ-TERMLINK-WORKSPACE-DOWNLOAD 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。60718-003实现Basic/mTLS原生下载、25MiB上限/24h清理/FileProvider；10/13真实Basic ZIP下载/打开/清理已做。

结论：**undetermined**。实现标记 partial-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| Basic/mTLS认证下载 | WorkspaceActivity用Authorization、registration header与MtlsOkHttpSupport，file-content download endpoint。 | 10/13无认证401/有认证200、下载SHA等于素材；7月有host smoke但未单独证明真实mTLS workspace下载。 | 优先定位mTLS下载既有专门证据；没有则该分支保持待核。 | JOINT-11证书/HTTPS/WebView的成功不等于Workspace原生下载mTLS闭环。 | TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md；android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/download-and-cleanup.json；docs/product/assessments/JOINT-20261013.md |
| 已有缓存预算/清理及FileProvider只读系统打开 | header/content流双25MiB限制，24h文件清理，ACTION_VIEW只授READ。 | 10/13ZIP由系统查看器显示proof.txt，单一过期探针清理通过。 | 未从已读材料确认本功能有新的未交付部分 | 完整上限/失败残留与不同系统查看器未由该场景覆盖；不把基本成功推为所有组合。 | android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/workspace-viewer-final-10.txt；docs/product/history/maintenance-20261011/android-validation-20261013/download-and-cleanup.json |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md](../../../TASKS/TASK-20260718-003-rewrite-shared-document-workspace.md)
- [android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt](../../../android/app/src/main/java/com/termlink/app/WorkspaceActivity.kt)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/download-and-cleanup.json](../history/maintenance-20261011/android-validation-20261013/download-and-cleanup.json)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/workspace-viewer-final-10.txt](../history/maintenance-20261011/android-validation-20261013/workspace-viewer-final-10.txt)

### 剩余与待核对

- 在原义务内核实mTLS与缓存上限路径的适用证据，Basic已通过部分无需重做。

依赖与排序依据：

- id：REQ-20260326-android-profile-mtls-runtime-certificate；reason：真实mTLS下载依赖既有Profile客户端证书/运行时支持；普通HTTPS或WebView成功不能替代Workspace原生下载闭环。

尚未核对/不可得材料：

- WorkspaceActivity真实mTLS下载/系统打开的专门结果未定位
- 25MiB预算与失败残留的当前运行证据未定位

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-59] 终端输入输出与尺寸适配

<a id="AS-CURRENT-20261014-59"></a>

### 覆盖范围

需求：[REQ-TERMLINK-TERMINAL-IO](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-TERMINAL-IO)。本轮完整重评 REQ-TERMLINK-TERMINAL-IO 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。PTY/WebSocket input/resize现有实现与10/13真实浏览器/Android/服务端命令结果证明已实施且已验部分。

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 浏览器及Android通过WS将输入交PTY、显示输出 | public terminal客户端与Gateway PTY桥接存在。 | JOINT-62浏览器真实PowerShell输入输出通过；Android连接显示可用但合法Write-Output首输混入[?1;2c，ParserError。 | 修复Android首输入设备应答污染，保留稳定后输入和浏览器已通过。 | 不是把控制键单次Ctrl故障另加为本项重复缺口；shell/OEM扩展组合未核。 | public/terminal.js；public/terminal_client.js；src/ws/terminalGateway.js；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/joint-validation-20261013/验收报告.md；docs/product/history/maintenance-20261011/joint-validation-20261013/验收报告.md |
| fit/resize传行列，窗口改变延续尺寸协商 | 客户端fit/resize与server resize路径；现有97x29及浏览器265x45证据。 | live-terminal-result.json真实PTY回读97x29；浏览器尺寸显示通过。 | 未从已读材料确认本功能有新的未交付部分 | Android横竖屏/IME完整尺寸变化未核；服务端resize不能代替该端观察。 | docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json；public/terminal.js；src/ws/terminalGateway.js |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [public/terminal.js](../../../public/terminal.js)
- [public/terminal_client.js](../../../public/terminal_client.js)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/验收报告.md](../history/maintenance-20261011/joint-validation-20261013/验收报告.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json](../history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json)

### 剩余与待核对

- 优先修首次输入污染，再在原终端链检查首次输入与resize；不触碰Codex IPC或宣称服务重启PTY连续。

依赖与排序依据：



尚未核对/不可得材料：

- docs/product/history/maintenance-20261011/joint-validation-20261013/phone-stable-io.log：原报告引用但checkout未保留；结论使用已读原报告及列出的现存证据，不声称读到该raw文件

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-60] 终端会话基本管理

<a id="AS-CURRENT-20261014-60"></a>

### 覆盖范围

需求：[REQ-TERMLINK-SESSION-MANAGEMENT](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-SESSION-MANAGEMENT)。本轮完整重评 REQ-TERMLINK-SESSION-MANAGEMENT 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。sessionManager/routes与Android Sessions均已实际实现；JOINT-63专用会话创建/选择/改名/删除及PTY释放真机和服务端对照通过。

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 创建/列出/改名/删除/选择，保留模式/名称/路径元数据 | Sessions REST与sessionManager/store；Android列表打开与编辑入口。 | 10/13创建V17-Phone-Terminal、选择、改名同ID、删除后列表/服务器消失，PID54996释放；live-terminal-result也确认rename/delete。 | 未从已读材料确认本功能有新的未交付部分 | 仅专用终端会话，不宣称离线缓存/跨registration/并发所有范围；868registration有效性修复的active兼容有独立S2/S3证据。 | src/routes/sessions.js；src/services/sessionManager.js；src/repositories/sessionStore.js；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/joint-validation-20261013/phone-delete-resource-result.json；docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [src/routes/sessions.js](../../../src/routes/sessions.js)
- [src/services/sessionManager.js](../../../src/services/sessionManager.js)
- [src/repositories/sessionStore.js](../../../src/repositories/sessionStore.js)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/phone-delete-resource-result.json](../history/maintenance-20261011/joint-validation-20261013/phone-delete-resource-result.json)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json](../history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)

### 剩余与待核对

- 保留基本管理已满足结论；额外registration边界在认证项评价，不把此项扩成全权限矩阵。

依赖与排序依据：



尚未核对/不可得材料：



本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-61] 已有终端页面刷新复用

<a id="AS-CURRENT-20261014-61"></a>

### 覆盖范围

需求：[REQ-TERMLINK-TERMINAL-REFRESH](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-TERMINAL-REFRESH)。本轮完整重评 REQ-TERMLINK-TERMINAL-REFRESH 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。60618真实复现embedded IPC无ID抢连导致重复创建，已修改public/codex_ipc.js并浏览器刷新验证；10/13同PID/变量刷新续接。

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 有效sessionId的已有页面刷新复用，不无谓新建 | embedded IPC先从URL/localStorage取sessionId，无ID不抢跑；terminal主WS携带当前ID。 | 60618刷新前后terminal count同为2，URL/localStorage同ID；JOINT-41实际浏览器同PID33120/变量保持。 | 未从已读材料确认本功能有新的未交付部分 | 60618 targeted自动测试为用户明确跳过，不重标已测；Android当时未触发代码修改条件。 | TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md；public/codex_ipc.js；public/terminal.js；docs/product/assessments/JOINT-20261013.md；docs/product/history/maintenance-20261011/joint-validation-20261013/验收报告.md |
| 首次无ID可创建，与无效显式ID错误区分 | 主连接缺ID保留默认创建，显式失效ID不会静默复用/新建。 | 60618 Step1真实无ID Default Session探针；JOINT真实失效ID返回4404。 | 未从已读材料确认本功能有新的未交付部分 | 不扩大为未列入本项验收的全平台/全输入矩阵 | TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md；src/ws/terminalGateway.js；docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md](../../../TASKS/TASK-20260618-001-fix-refresh-creates-terminal-session.md)
- [public/codex_ipc.js](../../../public/codex_ipc.js)
- [public/terminal.js](../../../public/terminal.js)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/验收报告.md](../history/maintenance-20261011/joint-validation-20261013/验收报告.md)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/product/history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json](../history/maintenance-20261011/joint-validation-20261013/live-terminal-result.json)

### 剩余与待核对

- 没有已证实功能欠交；保留用户跳过的首连自动化保护风险，后续实际改首连再考虑所需验证。

依赖与排序依据：



尚未核对/不可得材料：



本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-62] 浏览器登录与会话安全

<a id="AS-CURRENT-20261014-62"></a>

### 覆盖范围

需求：[REQ-TERMLINK-BROWSER-LOGIN](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-BROWSER-LOGIN)。本轮完整重评 REQ-TERMLINK-BROWSER-LOGIN 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。60715-002步骤1/2/8/9已实现独立登录、Cookie/logout并真实HTTP/Edge验收；当前basicAuth/login.js路径保留。

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 独立表单校验/loading/error，成功安全返回目标 | login.js表单required/invalid/aria-busy、password清理、same-origin next；server sanitizeNextPath拒绝外站/login loop。 | 任务Step2真实HTTP redirect/API401/login/logout，Step8真实Edge三viewport loading/失败/成功及键盘交互通过。 | 未从已读材料确认本功能有新的未交付部分 | 不扩大为未列入本项验收的全平台/全输入矩阵 | TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；public/login.js；src/auth/basicAuth.js |
| 短期HttpOnly/SameSite Strict/TLS Secure Cookie，登出撤销，秘密不入URL/storage | 32-byte opaque token，仅SHA256存server内存；8h absolute/30m idle；host-only Path=/；logout revoke+expire；login请求body。 | 任务auth/login最终相关111/111与真实Cookie不可由document.cookie读取；当前代码同边界。 | 未从已读材料确认本功能有新的未交付部分 | 浏览器会话服务重启失效为已接受设计；不以此要求持久认证，认证部署全矩阵不属此项。 | TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md；src/auth/basicAuth.js；public/login.js；docs/workflow/CONTRACTS.md |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md](../../../TASKS/TASK-20260715-002-web-ui-layout-and-terminal-ux.md)
- [public/login.js](../../../public/login.js)
- [src/auth/basicAuth.js](../../../src/auth/basicAuth.js)
- [docs/workflow/CONTRACTS.md](../../workflow/CONTRACTS.md)

### 剩余与待核对

- 保留已交付登录/会话能力；Web Codex Docs坏链接在其他具体入口项处理，不能泛化成登录失败。

依赖与排序依据：



尚未核对/不可得材料：



本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-63] Codex只读历史来源与解析

<a id="AS-CURRENT-20261014-63"></a>

### 覆盖范围

需求：[REQ-TERMLINK-HISTORY-SOURCE](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-HISTORY-SOURCE)。本轮完整重评 REQ-TERMLINK-HISTORY-SOURCE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。60819–28有实际Rust实施/阶段执行；832/833已实际修复父来源/cut、完整行窗口、委派Adapter并经过独立Rust审查，当前target-v2代码存在。AD-022旧“尚未开始”和架构旧“833待交付”均不能覆盖后来实际交付。

结论：**undetermined**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 启动级sessions_root只读外部rollout；Node只提供conversation和读取意图 | startup规范化根路径，target请求用conversation_id定位；Rust读取文件，Node持有调度和产品写入；保持单例链。 | 60819/20启动/输入阶段已有执行，832独立审查核对外部源只读及单例链。 | 保留原接受的source owner后置事项，不自动开修或作为后续所有工作的gate。 | DEFER-002的RD-4.5-006-001候选发现pre-I/O confinement风险仍保留：target_source先discover，再canonical root校验；不能据214/56早期测试称风险已修。其接受后置边界与本项已完成只读机制分别记载。 | TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md；TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md；native/codex-rollout-collector/src/protocol/startup.rs；native/codex-rollout-collector/src/protocol/target_source.rs；native/codex-rollout-collector/src/source/discovery.rs；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md |
| SessionMeta/history_base/cut判来源与父子，root→active head，不猜父关系 | lineage/read_plan与832辅助父来源沿明确history_base查找，physical cut和逻辑身份分开；不按内容或文件名猜父。 | 832原生Branch C真实继承N全部11项且包含自身新增，22项/4refs；独立Rust审查12项通过，原旧C失败不改写。 | 未从已读材料确认本功能有新的未交付部分 | 本轮未完整核对现行resend/replacement合法来源的自然样本；831 S5因无ordinary UserMessage前提未运行，不能据Branch新样本推导另一输入面成功。 | TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md；native/codex-rollout-collector/src/source/lineage.rs；native/codex-rollout-collector/src/source/read_plan.rs；native/codex-rollout-collector/src/protocol/target_source.rs；docs/product/history/maintenance-20261011/TASK832-close-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md |
| preview/backfill/append保持完整行、有界分段与独立cursor语义 | 现有tail/forward/append模块及target runtime，832修复继承窗口完整行，不放宽预算。 | 60819–28阶段执行与004隔离链结果；83212项source审查、833 H1 backfill/append真实Rust→产品保存通过。 | B/Q预算失败按既有fail-closed保持；没有授权把预算提高或换库当修复。 | 831真实连续增长/older证据不完备，但不能把这些产品验收缺口强加为所有早期source阶段失败；本项当前全部模式的原始逐条版本覆盖未完整配对。 | TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md；TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md；native/codex-rollout-collector/src/source/append.rs；native/codex-rollout-collector/src/source/read_plan.rs；native/codex-rollout-collector/src/protocol/target_runtime.rs；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md；docs/codex/codex-rollout-collector-architecture.md |
| wire facade+唯一Adapter输出owned事件，unknown/alias/ParseGap保留不完整诊断 | codex_wire profile为history_semantics_v2/target-v2；Adapter将委派两carrier归同一逻辑项而保留物理身份，未知不静默成功。 | 833脱敏原三组13行输入与普通工具分开验证；832原A/D40项/9refs真实保存，旧6 ParseGap/receipt保留；早期R009输入资格演进不可当今天未启动。 | 未从已读材料确认本功能有新的未交付部分 | 已读当前Adapter/profile及最新交付，但没有完整配对全部wire unknown/alias现行原始结果，整体保留待核，而非断言新增实现欠交。 | TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md；native/codex-rollout-collector/src/codex_wire/profile.rs；native/codex-rollout-collector/src/codex_adapter/mod.rs；native/codex-rollout-collector/src/analysis.rs；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。
- 本轮只读SHA核对history-version-applicability的24条：22个现存源码/fixture/契约文件与原hash一致，Windows exe未随checkout保留，ViewModel因868提示修复已变；详情见外部batch3-history-version-comparison.json。此为静态版本定位，不是新增运行验收。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md](../../../TASKS/TASK-20260819-001-codex-rollout-collector-formal-bootstrap.md)
- [TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md](../../../TASKS/TASK-20260820-001-codex-rollout-collector-stage-2-input-compat.md)
- [native/codex-rollout-collector/src/protocol/startup.rs](../../../native/codex-rollout-collector/src/protocol/startup.rs)
- [native/codex-rollout-collector/src/protocol/target_source.rs](../../../native/codex-rollout-collector/src/protocol/target_source.rs)
- [native/codex-rollout-collector/src/source/discovery.rs](../../../native/codex-rollout-collector/src/source/discovery.rs)
- [docs/workflow/DECISIONS.md](../../workflow/DECISIONS.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md](../history/maintenance-20261011/current-assessment-20261012/history-832review-report.md)
- [TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md](../../../TASKS/TASK-20260823-001-codex-rollout-collector-session-lineage-replan.md)
- [native/codex-rollout-collector/src/source/lineage.rs](../../../native/codex-rollout-collector/src/source/lineage.rs)
- [native/codex-rollout-collector/src/source/read_plan.rs](../../../native/codex-rollout-collector/src/source/read_plan.rs)
- [docs/product/history/maintenance-20261011/TASK832-close-report.md](../history/maintenance-20261011/TASK832-close-report.md)
- [native/codex-rollout-collector/src/source/append.rs](../../../native/codex-rollout-collector/src/source/append.rs)
- [native/codex-rollout-collector/src/protocol/target_runtime.rs](../../../native/codex-rollout-collector/src/protocol/target_runtime.rs)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md](../history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md)
- [docs/codex/codex-rollout-collector-architecture.md](../../codex/codex-rollout-collector-architecture.md)
- [native/codex-rollout-collector/src/codex_wire/profile.rs](../../../native/codex-rollout-collector/src/codex_wire/profile.rs)
- [native/codex-rollout-collector/src/codex_adapter/mod.rs](../../../native/codex-rollout-collector/src/codex_adapter/mod.rs)
- [native/codex-rollout-collector/src/analysis.rs](../../../native/codex-rollout-collector/src/analysis.rs)
- [docs/workflow/CONTRACTS.md](../../workflow/CONTRACTS.md)
- [docs/codex/codex-history-product-contract.md](../../codex/codex-history-product-contract.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json](../history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json)

### 剩余与待核对

- 先配对现行source阶段的输入/cursor结果及831未运行resend定位；不从DEFER-002自动重开Rust，不要求扩展budget或全输入认证。

依赖与排序依据：



尚未核对/不可得材料：

- 831 S5 ordinary UserMessage前提未满足的resend/replacement自然来源证据
- 当前所有source阶段测试的逐项source-version对应未完整核对
- DEFER-002接受后置风险的原source owner处置保持，非本轮授权修复

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-64] Node产品历史保存与只读查询

<a id="AS-CURRENT-20261014-64"></a>

### 覆盖范围

需求：[REQ-TERMLINK-HISTORY-PERSISTENCE](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-HISTORY-PERSISTENCE)。本轮完整重评 REQ-TERMLINK-HISTORY-PERSISTENCE 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。004原执行已把真实Node产品Store/provider接入；833 S5有真实Rust→Node→SQLite staging/ACK/complete/rollback与重开；832原持久根三类样本保存、provider和Gateway读回。不是只看AD-022设计或任务关闭。

结论：**satisfied**。实现标记 delivered-reported；验证标记 pass-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| batch durable staging先于ACK；complete gate后产品事务保存正文、详情、覆盖、checkpoint | analysisBatchImporter.stage/import先durable staged product；complete校验identity/当前attempt/durable batch后publishCanonical；Store单事务插入canonical及details/ranges/checkpoint，失败rollback。 | 004执行17/17 product、2/2 package；833 S5 43/43明确观察真实SQL staging COMMIT→正ACK→complete→产品COMMIT，实际prepared INSERT注入失败ROLLBACK，重开原canonical/checkpoint不变；H1 backfill/append及H3新job重读无重复。 | 未从已读材料确认本功能有新的未交付部分 | 004仅caller summaries无raw stdout，自审并非独立审查；事务强证据由833真实trace/后续832审查补足。 | src/services/codexRolloutCollector/analysisBatchImporter.js；src/services/codexHistoryProductStore.js；docs/changes/records/CR-20260928-task004-s3.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md；docs/codex/codex-history-product-contract.md |
| 经鉴权provider/API/history读Node持久投影，App不直接调Rust | ProductProvider仅从Store读bounded DTO，Gateway沿已有authenticated session/history权限入口；collector仍Node独占。 | 832 N11/C22/A40项及2/4/9 refs真实product_db、Gateway详情分页与手机逐行对照；独立审查验证全部refs bytes/hash及实际durable ACK。 | 未从已读材料确认本功能有新的未交付部分 | 手机每类只打开一条详情，不能推为全大详情UI或deep older通过；那属于Android项。 | src/services/codexHistoryProductProvider.js；src/services/codexHistoryProductStore.js；src/ws/terminalGateway.js；docs/product/history/maintenance-20261011/TASK832-close-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md；docs/workflow/CONTRACTS.md |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。
- 历史版本适用依据history-version-applicability所列Store/importer/provider/Gateway hash及当前静态差异核对；旧IR832-01技术未修，但TASK832关闭记录明确用户排除旧已发布产品格式迁移。当前新job四空保护/未结算原job identity是保留边界；不将旧格式排除扩大为可删除当前job。
- 本轮只读SHA核对history-version-applicability的24条：22个现存源码/fixture/契约文件与原hash一致，Windows exe未随checkout保留，ViewModel因868提示修复已变；详情见外部batch3-history-version-comparison.json。此为静态版本定位，不是新增运行验收。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [src/services/codexRolloutCollector/analysisBatchImporter.js](../../../src/services/codexRolloutCollector/analysisBatchImporter.js)
- [src/services/codexHistoryProductStore.js](../../../src/services/codexHistoryProductStore.js)
- [docs/changes/records/CR-20260928-task004-s3.md](../../changes/records/CR-20260928-task004-s3.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md](../history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md](../history/maintenance-20261011/current-assessment-20261012/history-832review-report.md)
- [docs/codex/codex-history-product-contract.md](../../codex/codex-history-product-contract.md)
- [src/services/codexHistoryProductProvider.js](../../../src/services/codexHistoryProductProvider.js)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/product/history/maintenance-20261011/TASK832-close-report.md](../history/maintenance-20261011/TASK832-close-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md](../history/maintenance-20261011/current-assessment-20261012/history-report.md)
- [docs/workflow/CONTRACTS.md](../../workflow/CONTRACTS.md)
- [docs/codex/codex-rollout-collector-architecture.md](../../codex/codex-rollout-collector-architecture.md)
- [docs/workflow/DECISIONS.md](../../workflow/DECISIONS.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json](../history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json)
- [.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json](../../../.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json)
- [.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000001.json](../../../.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000001.json)
- [.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin](../../../.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin)
- [.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000001.bin](../../../.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000001.bin)

### 剩余与待核对

- 保留这两项已交付事务/只读投影；后续Android大详情与older核查不需先重做Node保存。已排除的旧v1已发布格式迁移不列当前欠交。

依赖与排序依据：



尚未核对/不可得材料：



本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-65] Android静态历史缓存传输与阅读

<a id="AS-CURRENT-20261014-65"></a>

### 覆盖范围

需求：[REQ-TERMLINK-HISTORY-ANDROID](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-HISTORY-ANDROID)。本轮完整重评 REQ-TERMLINK-HISTORY-ANDROID 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。旧003已开始且用户停止，不等于完成；004/005实作cache/range/detail，831实际核查，832三类手机alias修复及216 JVM/同机重验，10/13再现真实大详情阅读失败。

结论：**partially-satisfied**。实现标记 partial-reported；验证标记 mixed-reported。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| endpoint/profile+conversation隔离正文/详情/checkpoint，冷启/离线首屏 | SQLite按endpoint_id/conversation_id分区，cache-first hydrate与selection generation；失败/清理保持其他分区。 | 00598项/39refs缓存；832稳定手机库N11/C22/A40项与产品逐行一致，各force-stop重开；10/13 MAIN/LAUNCHER冷启可见增长后工具及结束消息。 | 未从已读材料确认本功能有新的未交付部分 | APP冷启不同于服务重启元数据；其他profile/异常分区组合未完整核，不能推为都通过。 | android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；TASKS/TASK-003-rust-node-app.md；docs/product/history/maintenance-20261011/TASK832-close-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/history-large.json；docs/product/history/maintenance-20261011/android-validation-20261013/cold-launcher.xml |
| manifest/page/delta/chunk/hash/count，先durable提交再ACK | CacheStore applyDeltaPage/applyPayloadChunk事务校验hash/count、complete chunks后commit；VM等待返回COMMITTED等可ACK状态并校验当前selection。 | 832每类3条正ACK与同run/generation delta/pageHashMatches/稳定committed rows关联，A先STAGED后完整提交；0057页6overlaps仅协议，不混当手机older。 | 未从已读材料确认本功能有新的未交付部分 | 831第三条partial ACK无retained row无法确定postcommit；前两条能对应225 completed-page rows，两者都是IPC fallback，不冒充product older。 | android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt；android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md；docs/product/history/maintenance-20261011/TASK832-close-report.md |
| older cursor/range/coverage续读，history让位实时/control并保留未闭合范围诊断 | VM低优先older continuation、CacheStore segments/cursors与partial coverage，Gateway按existing history能力传输。 | 005/831离线F98项/39refs七页22/32/26/5/6/6/7、6重叠，末页hasMoreBefore=false但coverageComplete=false；832小样本完整范围不构成深分页通过。 | 当前产品手机older→本地durable→ACK闭环仍待核，先定位既有证据。 | 受控跨页边界、终态增长refs增删、cursor失效重取及E07竞态未充分验；未知不能写产品失败。 | android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt；src/ws/terminalGateway.js；docs/codex/codex-history-product-contract.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md；docs/product/assessments/ANDROID-20261013.md |
| 真实工具身份/ref分块读取显示，媒体保留独立静态边界 | 832同turn/nativeID→tool: cache key alias，detail请求和hash验证存在；media表区分original/thumbnail/ref。 | 005真实1900字节详情UI/复制/重开；69427字节49152+20275仅协议/离线。832每类选定469/469/552字节UI/重开通过。10/13真实2400行聚合到约165行截断且无完整历史详情入口，阅读/完整复制闭环失败。 | 修复当前真实大详情入口/可读路径；遵守64KiB保留策略，不能把“完整”扩成无限原始输出保存。 | 媒体原图/缩略图手动打开、下载进度及所有大详情复制分支本轮未完整核。 | android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt；android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt；docs/changes/records/CR-20261008-0135-android-history-detail-alias.md；docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md；docs/product/assessments/ANDROID-20261013.md；docs/product/history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt；docs/product/history/maintenance-20261011/android-validation-20261013/history-large.json |
| 本地存储统计与按服务/任务手动清理，共享引用安全，不影响凭据/远端 | readStorageUsage/readConversationStorageUsage与clearConversationCache/clearServiceCache；共享hash和local_path无引用才返回删除路径；不触碰Profile凭据或远端命令。 | 现行代码可确认局部实现；旧003、004各有有限测试/构建但不能从闭合状态推出这个入口实际用户验证。 | 先定位本地设置统计/清理既有结果，勿执行新删除测试。 | 未完整核对真实UI按服务/任务清理和跨service共享媒体保留的适用报告。 | android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt；android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt；TASKS/TASK-003-rust-node-app.md |
| 切换/重开旧conversation/generation不改当前UI/partition，静态不覆盖healthy IPC权威 | VM inbound选择/同步ID/generation guards及historyApplyMutex；cachedCanonicalMessages与live merge按healthy authority分层。 | 831实际A→B→A/后台/强停有局部成果；832三类切换/重开；868同scope错误条恢复已修且292focused/实机S3，但未追加E07全矩阵。 | 保持旧迟到响应/跨conversation负向核对待核，不改变IPC authority来补history。 | 831 E07a离线、b/f Node fixture、d JVM，c/e无自然条件；不把fixture/JVM当实际全竞态通过。 | android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt；src/ws/terminalGateway.js；docs/codex/codex-rollout-collector-architecture.md；docs/workflow/CONTRACTS.md；docs/workflow/DECISIONS.md；docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md；docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json；docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。
- 10/13大详情失败的VM/UI relevant分支在3d72aac9中未修改；新增仅提示来源/清理与registration有效性，不能推为修好大详情。832详情alias成果与10/13不同大样本失败并存。
- 本轮只读SHA核对history-version-applicability的24条：22个现存源码/fixture/契约文件与原hash一致，Windows exe未随checkout保留，ViewModel因868提示修复已变；详情见外部batch3-history-version-comparison.json。此为静态版本定位，不是新增运行验收。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt](../../../android/app/src/main/java/com/termlink/app/codex/data/CodexConversationCacheStore.kt)
- [android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexViewModel.kt)
- [TASKS/TASK-003-rust-node-app.md](../../../TASKS/TASK-003-rust-node-app.md)
- [docs/product/history/maintenance-20261011/TASK832-close-report.md](../history/maintenance-20261011/TASK832-close-report.md)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-report.md](../history/maintenance-20261011/current-assessment-20261012/history-report.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/history-large.json](../history/maintenance-20261011/android-validation-20261013/history-large.json)
- [docs/product/history/maintenance-20261011/android-validation-20261013/cold-launcher.xml](../history/maintenance-20261011/android-validation-20261013/cold-launcher.xml)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-832review-report.md](../history/maintenance-20261011/current-assessment-20261012/history-832review-report.md)
- [src/ws/terminalGateway.js](../../../src/ws/terminalGateway.js)
- [docs/codex/codex-history-product-contract.md](../../codex/codex-history-product-contract.md)
- [android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt](../../../android/app/src/main/java/com/termlink/app/codex/CodexActivity.kt)
- [docs/changes/records/CR-20261008-0135-android-history-detail-alias.md](../../changes/records/CR-20261008-0135-android-history-detail-alias.md)
- [docs/product/history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt](../history/maintenance-20261011/android-validation-20261013/history-tool-touch-6.txt)
- [docs/codex/codex-rollout-collector-architecture.md](../../codex/codex-rollout-collector-architecture.md)
- [docs/workflow/CONTRACTS.md](../../workflow/CONTRACTS.md)
- [docs/workflow/DECISIONS.md](../../workflow/DECISIONS.md)
- [docs/product/history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md](../history/maintenance-20261011/task20260868-close/local-evaluation-20261013.md)
- [docs/product/history/maintenance-20261011/task20260868-s3/source-manifest.json](../history/maintenance-20261011/task20260868-s3/source-manifest.json)
- [docs/product/history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json](../history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json)
- [.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json](../../../.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000000.json)
- [.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000001.json](../../../.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/index-000001.json)
- [.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin](../../../.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000000.bin)
- [.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000001.bin](../../../.workflow-system/records/archives/1ff0d39963575e208eb8fe59afbf82b26a93e4d9918b7ab440d965bba958b98d/pack-000001.bin)

### 剩余与待核对

- 优先处理已证实大详情入口失败；随后按原005/831场景核实产品手机older durable ACK与受控迟到响应，媒体/清理先找既有证据。可以与options、PDF、终端小修并行，不自动重开source或提高预算。

依赖与排序依据：

- id：REQ-TERMLINK-HISTORY-PERSISTENCE；reason：产品静态来源/详情读取需要Node已持久投影；已有两点限定满足可直接复用，不是要求Node历史全产品先PASS。

尚未核对/不可得材料：

- 005原close记录及831执行记录在workflow archive中，未保留checkout logs原运行树；本轮按实际归档正文读取，不冒称原private DB/全部截图重审
- 手机product older durable ACK、E07c/e、全部大详情复制
- 媒体下载进度/设置统计及共享引用清理真实适用结果

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。

## [AS-CURRENT-20261014-66] 会话元数据持久化与服务重启恢复

<a id="AS-CURRENT-20261014-66"></a>

### 覆盖范围

需求：[REQ-TERMLINK-SESSION-METADATA-RECOVERY](../MANAGED_REQUIREMENTS.md#REQ-TERMLINK-SESSION-METADATA-RECOVERY)。本轮完整重评 REQ-TERMLINK-SESSION-METADATA-RECOVERY 在指定基线 a78fe55e033bbcb6db816acd2c801de5aa28a081 的既有 current 正文、范围边界与验收；逐功能点区分实现、既有验证、剩余与未知。仅依据现有资料及静态核对，不新增运行验证、不扩展业务义务；旧窄范围报告保留其原对象与限制。

启动情况：**已开始过**。sessionManager构造调用restorePersistedSessions；SessionStore.loadSync/save/saveSync与进程退出flush为明确实现，DECISIONS AD-001已有JSON持久化路线。即使无独立TaskBinding也已开始过，不能标未开始。

结论：**undetermined**。实现标记 partial-reported；验证标记 unknown。三者不互相推导；已知成果与未知剩余分开。

### 交付与验证依据

| 功能义务 | 实现与已知成果 | 既有验证及边界 | 明确剩余 | 未知/未核对 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 已持久会话元数据在服务重启后可恢复，不承诺PTY连续 | store v3保存id/name/mode/cwd/workspaceRoot/thread/config/registration等现有字段，tmp→rename；constructor loadSync→buildSession(IDLE)，创建/更名/删除调度持久化且shutdown flush。字段列举用于实现说明，不增加为新验收字段集。 | 已读SessionStore metadata单元测试为normalize记录级静态用例；10/13管理/Android冷启保存名称与thread有实际成果，但都没有建立“服务进程重启前后”的独立对象对照。 | 先定位原P0.3对应的实际server restart前后元数据结果；不能用Android force-stop或浏览器刷新代替。 | 未定位独立task/CR或适用服务重启运行报告；已知实现+未知重启验收，整体undetermined，不称失败。 | docs/product/PRODUCT_REQUIREMENTS.md；docs/workflow/DECISIONS.md；src/repositories/sessionStore.js；src/services/sessionManager.js；src/server.js；tests/sessionStore.metadata.test.js；docs/product/assessments/JOINT-20261013.md；docs/product/assessments/ANDROID-20261013.md |

#### 版本适用性

- 基线a78fe55e033bbcb6db816acd2c801de5aa28a081；只读静态重评，没有运行新业务验证。10/13实测对象为4d586e0f及APK F148028B…DFD6A、VOG-AL00 Android10/WebView114；之后3d72aac9仅改4个Codex Kotlin提示/事件来源及registrationManager有效性，后两提交为workflow升级。旧实测不是a78全产品新PASS；对未受影响功能保留原范围成果/失败，提示修复另据868源码manifest与局部报告。

#### 实际读取材料

- [docs/product/MANAGED_REQUIREMENTS.md](../MANAGED_REQUIREMENTS.md)
- [docs/product/PRODUCT_REQUIREMENTS.md](../PRODUCT_REQUIREMENTS.md)
- [docs/workflow/DECISIONS.md](../../workflow/DECISIONS.md)
- [src/repositories/sessionStore.js](../../../src/repositories/sessionStore.js)
- [src/services/sessionManager.js](../../../src/services/sessionManager.js)
- [src/server.js](../../../src/server.js)
- [tests/sessionStore.metadata.test.js](../../../tests/sessionStore.metadata.test.js)
- [docs/product/assessments/JOINT-20261013.md](JOINT-20261013.md)
- [docs/product/assessments/ANDROID-20261013.md](ANDROID-20261013.md)

### 剩余与待核对

- 先核对既有服务重启证据及原定性义务，不新增字段矩阵/PTY连续保证；若找不到结果，保留已开始过与验收未知。

依赖与排序依据：



尚未核对/不可得材料：

- PRODUCT_REQUIREMENTS P0.3服务重启前后sessionStore字段/会话ID的独立旧运行结果尚未定位
- 现有normalize单元测试不包含最新registration字段，不据此宣布服务重启恢复失败

本次没有新增业务实现、运行验证或Task关联；缺少Task身份不等于未开始。当前父子结构保持原样，共享需求不跨端复制身份。
