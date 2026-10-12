# Git 提交与另行交付说明（2026-10-12）

用户要求本轮评估记录提交并推送；对仓库忽略的7份日志，用户明确选择“不提交，单独打包给我”。这7份日志是另行交付的非Git资产，仍保留原字节与原SHA256。本仓库克隆不包含它们；报告和原始评估快照中的相对路径是证据定位，并不表示日志随Git同步。

独立包：`TermLink-评估证据日志-bb484969.zip`，仅含下列7份日志和README。已交付完整报告包`TermLink-需求评估-bb484969.zip`也包含相同日志字节，保持原包不改。可在repo根按包内相对路径解压作本地核对；不会自动提交、部署或运行。

- `docs/product/history/maintenance-20261011/current-assessment-20261012/codex-gateway-scoped-test.log`
  SHA256: `33355d0e1d08d4bdfdbb2a4126e52ef367099eb3a51ad171d8595e7e4f8a96c8`
- `docs/product/history/maintenance-20261011/current-assessment-20261012/codex-integration-test.log`
  SHA256: `5bed8a5221073d3fa6c699161a17784378d672ded78d8ea3d1e241dfdaa4ffcc`
- `docs/product/history/maintenance-20261011/current-assessment-20261012/codex-pure-test.log`
  SHA256: `2be0eb346ff3cc9555fcb1cbdc51f47fb3b21597075ed65317182886b7594487`
- `docs/product/history/maintenance-20261011/current-assessment-20261012/codex-targeted-test.log`
  SHA256: `c6a429fb664ab96c6b88ef1f802b94c24129ad43382e717690bdf6b61dabf973`
- `docs/product/history/maintenance-20261011/current-assessment-20261012/metadata-result.log`
  SHA256: `98feb61ce3f542224c2a5f58a41e5ade32efb8de281e094f820db4bf87a45b07`
- `docs/product/history/maintenance-20261011/current-assessment-20261012/node-pty-rebuild-local.log`
  SHA256: `69179e321a3688f77ff7bebec4536a6e56b1a820b194ea9b710cd88c74527e0b`
- `docs/product/history/maintenance-20261011/current-assessment-20261012/npm-ci.log`
  SHA256: `857272ce821ed4792f980179305d3893c07b033eab817c88d0381feeaaa668bb`

本次只保存评估、必要证据、索引与本说明。人工判断、原范围、源码基准bb4849692fd600c3eb57866e28400fba612ee6aa及原证据摘要未变。已有PACKAGE_README/最终read/check/远端记录是提交前评估时点快照，不声称是提交后的状态。

原始.tap测试输出有20处空白行尾（3份文件），全量git diff --check因此报告告警；为保持原始证据和摘要一致保留字节。人工编辑文档的diff --check通过。仓库原生敏感扫描及版本一致性检查通过。提交/推送身份由Git历史与本次完成消息提供，不递归写入本说明。
