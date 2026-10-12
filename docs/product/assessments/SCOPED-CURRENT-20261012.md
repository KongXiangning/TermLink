---
{
  "schema": "vnext-product-doc/v3",
  "items": [
    {
      "id": "AS-SCOPED-CURRENT-20261012-18",
      "type": "assessment",
      "target": "REQ-20261005-codex-history-save-repair",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "item_id": "REQ-20261005-codex-history-save-repair",
        "sha256": "4829b0e6d94222782b17a426065e9d330f36a2ddbaa7cb014f5966cf2fbd51ba"
      },
      "target_definition_sha256": "39dac437189d47653eeb822500e39be6f4fa21c3481793374c2bdd42a5bf9d75",
      "target_definition_algorithm": "vnext-product-definition/v1",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "item_id": "GOAL-TERMLINK-CODEX-CONTINUITY",
        "sha256": "45114a0d63c01504b55ee6c9e5083b11b146389b3e0559706bd8144c11831653"
      },
      "goal_definition_sha256": "87b4c11ca965cf77d253c0cd707045d79872d02c2382f02c1fb319add86457df",
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "applicability": {
        "goal_id": "GOAL-TERMLINK-CODEX-CONTINUITY",
        "scope_id": "N-C-AD-SAMPLES",
        "coverage": "TASK-20260832关闭报告所列N11/2详情ref、C22/4及A/D40/9三类真实保存样本；指定MQS7N19402011743手机正文、每类选定一条详情、切换和force-stop重开。排除其他手机、逐一操作所有详情、深分页、大详情和全竞态矩阵；保留IR832-01已接受排除边界。"
      },
      "checked_at": "2026-10-12T15:09:12.212697+00:00",
      "subject": {
        "kind": "commit",
        "value": "bb4849692fd600c3eb57866e28400fba612ee6aa"
      },
      "implementation": "delivered-reported",
      "verification": "pass-reported",
      "conclusion": "satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/item-18-evidence.json",
          "sha256": "12888d2762095f4905367d11e0d486281fb2dd334131648ee8eb7e77f811e31e"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json",
          "sha256": "7bd2ee90ef2820a13171614171ce8ed2379125e083e3d961af6a89bb79b108c1"
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
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md",
          "sha256": "04b7fff55add0bc00188f938b7546eacc7cd85df32ba9a961c105e2e65125e11"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-node-tests-available.tap",
          "sha256": "356e68a29769d7fb4036c068d7a594d71651a7a3c84c875deb8c8a90da4b51b0"
        }
      ]
    },
    {
      "id": "AS-SCOPED-CURRENT-20261012-24",
      "type": "assessment",
      "target": "REQ-TERMLINK-HISTORY-PIPELINE",
      "target_basis": {
        "kind": "file",
        "path": "docs/product/MANAGED_REQUIREMENTS.md",
        "item_id": "REQ-TERMLINK-HISTORY-PIPELINE",
        "sha256": "4829b0e6d94222782b17a426065e9d330f36a2ddbaa7cb014f5966cf2fbd51ba"
      },
      "target_definition_sha256": "bbef259c275bc058c893faa6593118ae2b80bad4ef953fef62fba063145b7b76",
      "target_definition_algorithm": "vnext-product-definition/v1",
      "goal_basis": {
        "kind": "file",
        "path": "docs/product/GOALS.md",
        "item_id": "GOAL-TERMLINK-CODEX-CONTINUITY",
        "sha256": "45114a0d63c01504b55ee6c9e5083b11b146389b3e0559706bd8144c11831653"
      },
      "goal_definition_sha256": "87b4c11ca965cf77d253c0cd707045d79872d02c2382f02c1fb319add86457df",
      "goal_definition_algorithm": "vnext-product-definition/v1",
      "applicability": {
        "goal_id": "GOAL-TERMLINK-CODEX-CONTINUITY",
        "scope_id": "PRODUCT-HISTORY",
        "coverage": "已记录的Rust只读来源、Node持久采集/产品事务、鉴权history及Android缓存/ACK/重开链路，含自然增长、older和详情的既有边界；隔离基础层与局部三样本不代表全链完成。"
      },
      "checked_at": "2026-10-12T15:09:12.213638+00:00",
      "subject": {
        "kind": "commit",
        "value": "bb4849692fd600c3eb57866e28400fba612ee6aa"
      },
      "implementation": "partial-reported",
      "verification": "mixed-reported",
      "conclusion": "partially-satisfied",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/item-24-evidence.json",
          "sha256": "34a3bc34a1133b7f7f7963679be1c7a312f92da8552d927030d966caf5c9c6db"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-version-applicability.json",
          "sha256": "7bd2ee90ef2820a13171614171ce8ed2379125e083e3d961af6a89bb79b108c1"
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
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-833s5-report.md",
          "sha256": "04b7fff55add0bc00188f938b7546eacc7cd85df32ba9a961c105e2e65125e11"
        },
        {
          "kind": "file",
          "path": "docs/product/history/maintenance-20261011/current-assessment-20261012/history-node-tests-available.tap",
          "sha256": "356e68a29769d7fb4036c068d7a594d71651a7a3c84c875deb8c8a90da4b51b0"
        }
      ]
    }
  ]
}
---
# 既有scope的当前版本报告

## [AS-SCOPED-CURRENT-20261012-18] 18号既有声明范围当前判定

### 覆盖范围

TASK-20260832关闭报告所列N11/2详情ref、C22/4及A/D40/9三类真实保存样本；指定MQS7N19402011743手机正文、每类选定一条详情、切换和force-stop重开。排除其他手机、逐一操作所有详情、深分页、大详情和全竞态矩阵；保留IR832-01已接受排除边界。

结论：satisfied。代码对象：bb4849692fd600c3eb57866e28400fba612ee6aa。只按现有goal声明，不新增范围、不把新commit对象覆盖或替代旧working-copy报告。

### 交付与验证依据

- 功能1/4复用833精确DelegatedInput/G1/G2及持久恢复证据；独立复核同版本13项v2和5项三类产品场景通过
- 功能2/3：当前branch_history三个进程测试与76项target历史回归，真实C继承N全部11项并含自身回合，原N不含C内容
- 功能5：当前StringDecoder跨chunk/generation UTF8路径及原3项实际回归；原真实N11/C22/A40项、2/4/9详情refs经产品库/Gateway读回
- 功能6：原S6安装后缓存/prefs hashes保持，三样本分别durable product_db完整范围、page/hash与同run/generation真实ACK；每类正常查看/切换/重开均操作一个选定详情
- 功能7：原source/ACK/identity/cursor/预算负向与本次Node定向保护测试。旧target-v1已发布格式迁移是明确排除，技术finding未修，不计本需求欠交

- 原版本 / assessed_head：bb4849692fd600c3eb57866e28400fba612ee6aa
- 原版本 / 历史服务端源码：488dc6c9e597ef096f617d17499fa8e048306c06
- 原版本 / 历史Android补丁：0618cafc
- 原版本 / 历史Rust产物SHA256：f0cd1b37ff02d0a023ff77d96b9e4be103507965afde20c4e3207b6dfcd3ec2e
- 原版本 / 历史APK SHA256：f148028b15fa3a8dffe63ca483bcda5a1ce9764bbde817e68a357598d25dfd6a
- 原版本 / phone：MQS7N19402011743
- 原版本 / profile：task005-s2-local
- 原版本 / range_enabled：True
- 原版本 / 限制：这些是原832实测版本；23个源码/测试/规范/fixture历史哈希与当前逐字节相同，0618cafc至HEAD的src/native/android/public/tests/scripts零diff。原Windows Rust exe与APK未在本次机器物化，不声称当前真机或重新构建。
- 当前适用性：原832独立Rust审计6个源文件、Node审计13个可用文件及2规范、Android两文件逐SHA一致；0618cafc以来业务目录零diff。适用原三样本验收，明确不是当前机器真机重跑。
- samples / sample：N
- samples / conversation_id：01a114a2-a201-7f73-993f-9c956ae35713
- samples / items：11
- samples / detail_refs：2
- samples / selected_detail_bytes：469
- samples / coverage_root：4d9b29481737d301f86d1b137993a33bcf22008a28fbe99337e9924c464bd3f2
- samples / sample：C
- samples / conversation_id：01a114a4-e693-7be1-aafb-b9a3cb580e1d
- samples / items：22
- samples / detail_refs：4
- samples / selected_detail_bytes：469
- samples / coverage_root：48b75ca6922483a5c464d26abce577330a7ef6dd712f85b58695279c90fce480
- samples / sample：A/D
- samples / conversation_id：01a0fe25-56a2-7910-ba22-61e8016e8ad9
- samples / items：40
- samples / detail_refs：9
- samples / selected_detail_bytes：552
- samples / coverage_root：23a3f13872a9eff71c1715c7f27884005ade1fd78acfda714cedaf2233a7e06b

### 剩余与待核对

- 本需求约定三样本范围内未识别剩余欠交；手机未逐一点击全部9条委派详情，原验收只选每类一条，不新增此门槛
- 旧连接错误条、B/Q预算失败、registration候选、831深分页/大详情/竞态和发布资格均不被三样本结果认证；这不扩大18原范围
- 本次Node v24.19.0原有9个history/collector/diagnostics测试文件：过滤8个需cargo的顶层入口（含子测试10项）后237通过/1失败；原输出../history-node-tests-available.tap。唯一失败为70MiB例的错误码断言（期待history_envelope_too_large，实际history_payload_chunks_unsupported），不支持chunk客户端已显式失败且未发delta，现行契约未要求旧错误码，不能据此判功能失效。首次未成功过滤的运行还保留cargo ENOENT，不伪装通过。

本轮无真实手机、部署或Rust重编译。当前Node定向失败与环境限制按原始日志保留，不把保存/selection成功等同于正确性证明。


## [AS-SCOPED-CURRENT-20261012-24] 24号既有声明范围当前判定

### 覆盖范围

已记录的Rust只读来源、Node持久采集/产品事务、鉴权history及Android缓存/ACK/重开链路，含自然增长、older和详情的既有边界；隔离基础层与局部三样本不代表全链完成。

结论：partially-satisfied。代码对象：bb4849692fd600c3eb57866e28400fba612ee6aa。只按现有goal声明，不新增范围、不把新commit对象覆盖或替代旧working-copy报告。

### 交付与验证依据

- 隔离source/Adapter/projection/runtime有各阶段原业务测试；当前66有对应实现及同源码Rust定向历史证据
- 67产品durable staging、complete gate、SQLite事务/重开与只读Gateway有当前Node实际测试和832真实样本证据
- 832/833专项精确范围已满足，Android原三样本正文/小详情/缓存重开/ACK可按samebyte复用，其他原005/831场景不继承PASS

- 原版本：60819–28为隔离层；003被用户停止且验收false；004为独立Node产品阶段；005/831为真实App/连续链验证。后续832修三样本，不覆盖831全部未验。
- 当前适用性 / assessed_head：bb4849692fd600c3eb57866e28400fba612ee6aa
- 当前适用性 / 历史服务端源码：488dc6c9e597ef096f617d17499fa8e048306c06
- 当前适用性 / 历史Android补丁：0618cafc
- 当前适用性 / 历史Rust产物SHA256：f0cd1b37ff02d0a023ff77d96b9e4be103507965afde20c4e3207b6dfcd3ec2e
- 当前适用性 / 历史APK SHA256：f148028b15fa3a8dffe63ca483bcda5a1ce9764bbde817e68a357598d25dfd6a
- 当前适用性 / phone：MQS7N19402011743
- 当前适用性 / profile：task005-s2-local
- 当前适用性 / range_enabled：True
- 当前适用性 / 限制：这些是原832实测版本；23个源码/测试/规范/fixture历史哈希与当前逐字节相同，0618cafc至HEAD的src/native/android/public/tests/scripts零diff。原Windows Rust exe与APK未在本次机器物化，不声称当前真机或重新构建。

### 剩余与待核对

- 已知未满足：候选symlink指向sessions_root外时，discovery在target执行canonical confinement之前读取header/metadata/可能fingerprint。DEFER-002已明确接受暂缓且禁止宣称已解决；当前source/discovery.rs:851与protocol/target_source.rs:473–485仍保留相同顺序。此是原sessions_root边界已有缺口，不是本轮新增要求，不倒推旧target任务漏交，不自动授权修复或立项。
- 另有未知：原005/831更广连续自然增长/resend、物理older持久ACK、超单chunk详情展开/复制/自然ref变化、真正迟到响应和healthy IPC切换未有完整适用真机证据。未知不记成已知功能坏，也不作为新增矩阵。
- 本次Node v24.19.0原有9个history/collector/diagnostics测试文件：过滤8个需cargo的顶层入口（含子测试10项）后237通过/1失败；原输出../history-node-tests-available.tap。唯一失败为70MiB例的错误码断言（期待history_envelope_too_large，实际history_payload_chunks_unsupported），不支持chunk客户端已显式失败且未发delta，现行契约未要求旧错误码，不能据此判功能失效。首次未成功过滤的运行还保留cargo ENOENT，不伪装通过。

本轮无真实手机、部署或Rust重编译。当前Node定向失败与环境限制按原始日志保留，不把保存/selection成功等同于正确性证明。
