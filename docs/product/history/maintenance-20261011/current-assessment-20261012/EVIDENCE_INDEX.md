# 本轮证据文件导航

Git交付补充：下列7份`.log`按用户选择不提交，是另行交付资产；克隆仓库后需从独立日志包或原完整报告包取得，详见[GIT_DELIVERY.md](GIT_DELIVERY.md)。本表保留原文件SHA与定位，不表示全部文件均由Git跟踪。

所有路径相对于本文件所在目录。`item-*-evidence.json`是评估者的结构化判断/证据定位，**不是**所列原文件或测试stdout的完整镜像。原仓库文件由其路径与固定commit追溯。本轮已保存的原始输出和从Git历史取回的附件另列。

原外部临时路径映射：
- `../history-evidence/<文件>` → 本目录`history-<文件>`
- `../codex-*-test.log` / `../history-node-tests*.tap` → 本目录同名
- `../test-logs/web-workspace-release.tap` → 本目录同名
- `../metadata-probe/roundtrip.cjs` / `result.log` → 本目录`metadata-roundtrip.cjs` / `metadata-result.log`
- 终端组没有完整原始stdout，见`terminal-execution-observation.md`，不能从运行摘要补造

| 文件 | 性质 | SHA256 |
|---|---|---|
| [ANDROID_CHECKS_FINAL.md](ANDROID_CHECKS_FINAL.md) | 本轮交付/来源定位/哈希或执行环境说明 | `f76bffd7314a14b6ac97c2b7a72d488d44bfb4ea7ec4bd005b82bdf3f24d70c7` |
| [ASSESSMENT_SUMMARY_FINAL.md](ASSESSMENT_SUMMARY_FINAL.md) | 本轮交付/来源定位/哈希或执行环境说明 | `d635664d5e1124377385671c69ceb07fab31ead6a3153bd7f18224c62e12a8b7` |
| [VALIDATION.json](VALIDATION.json) | 本轮交付/来源定位/哈希或执行环境说明 | `198276d649eada4ff1897e80c100072395dff636fa5f5867401df1f0b0a7d780` |
| [codex-gateway-scoped-test.log](codex-gateway-scoped-test.log) | 本轮实际运行原始输出（扩展名不保证reporter格式） | `33355d0e1d08d4bdfdbb2a4126e52ef367099eb3a51ad171d8595e7e4f8a96c8` |
| [codex-integration-test.log](codex-integration-test.log) | 本轮实际运行原始输出（扩展名不保证reporter格式） | `5bed8a5221073d3fa6c699161a17784378d672ded78d8ea3d1e241dfdaa4ffcc` |
| [codex-pure-test.log](codex-pure-test.log) | 本轮实际运行原始输出（扩展名不保证reporter格式） | `2be0eb346ff3cc9555fcb1cbdc51f47fb3b21597075ed65317182886b7594487` |
| [codex-targeted-test.log](codex-targeted-test.log) | 本轮实际运行原始输出（扩展名不保证reporter格式） | `c6a429fb664ab96c6b88ef1f802b94c24129ad43382e717690bdf6b61dabf973` |
| [final-helper-check.json](final-helper-check.json) | 本轮helper完整原输出；字节/结构验证不代替业务判断 | `537637ff4e1bd47b39c5520212d29ed8fcd52349945dd20b9fa002e209afdf02` |
| [final-helper-read.json](final-helper-read.json) | 本轮helper完整原输出；字节/结构验证不代替业务判断 | `191c3c6b7166b5302fd2bfe8cbae679cfddaefca65946454b4ab070a75751877` |
| [final-remote-heads.txt](final-remote-heads.txt) | 本轮交付/来源定位/哈希或执行环境说明 | `fdcd8d68c801937936b8d4c1cbdc5b70826cd7924108f11da92ab93739fbd0c3` |
| [history-832review-node-audit.json](history-832review-node-audit.json) | 从Git原附件恢复的历史证据；原版本限定 | `6c8ff425cd6ce4b7de6e2a62b6672374805e9b76e4d5406127345f47c086f1c5` |
| [history-832review-report.md](history-832review-report.md) | 从Git原附件恢复的历史证据；原版本限定 | `fcc1ff5a866d55311611242b529f622135bd9597f0b1ce89c6e7912a5b7e370f` |
| [history-832review-rust-audit.json](history-832review-rust-audit.json) | 从Git原附件恢复的历史证据；原版本限定 | `2ff551f6a3b7a6f7926a5c59a2502d9f292cbb7a51ce2793b88a06b82087a125` |
| [history-832s3-report.md](history-832s3-report.md) | 从Git原附件恢复的历史证据；原版本限定 | `5fcfb8c55d548159d6cd8e10afc04f69848b880d846423fd504c86ab47bb8031` |
| [history-833s5-final-product-and-rust.txt](history-833s5-final-product-and-rust.txt) | 从Git原附件恢复的历史证据；原版本限定 | `8dac84cabb352745ff0ddac315c8c476cee8d86740451d05d145266abe30d4ec` |
| [history-833s5-report.md](history-833s5-report.md) | 从Git原附件恢复的历史证据；原版本限定 | `04b7fff55add0bc00188f938b7546eacc7cd85df32ba9a961c105e2e65125e11` |
| [history-apk-build-result.json](history-apk-build-result.json) | 从Git原附件恢复的历史证据；原版本限定 | `18e106dd2565757965977567d6d65b1c989aa4b1035b053cc7c91df82adb6695` |
| [history-baseline.json](history-baseline.json) | 从Git原附件恢复的历史证据；原版本限定 | `1ff5fad15561378da9be255936b4a32b9a84ada790f5c6f9bde0adb9b1d5395d` |
| [history-install-preservation.json](history-install-preservation.json) | 从Git原附件恢复的历史证据；原版本限定 | `ba36040ee1ef3b6f97bfc001239df3ab36dce73f1abe411bbaff1833cdd2b7de` |
| [history-node-tests-available.tap](history-node-tests-available.tap) | 本轮实际运行原始输出（扩展名不保证reporter格式） | `356e68a29769d7fb4036c068d7a594d71651a7a3c84c875deb8c8a90da4b51b0` |
| [history-node-tests.tap](history-node-tests.tap) | 本轮实际运行原始输出（扩展名不保证reporter格式） | `d4db83a8a9e3eb0748d1080ee5e426d650e57feaa5d663d1cd8f57927c8d718e` |
| [history-report.md](history-report.md) | 从Git原附件恢复的历史证据；原版本限定 | `1420cfc800a31826a6bebcafa17cbe84d3704601da65ccc3bf325be38a1767e6` |
| [history-self-check-corrected.json](history-self-check-corrected.json) | 从Git原附件恢复的历史证据；原版本限定 | `55b37c7631aa064733a658b15b06628e943000d29f5dd46558d015ac0a7cc860` |
| [history-version-applicability.json](history-version-applicability.json) | 本轮交付/来源定位/哈希或执行环境说明 | `7bd2ee90ef2820a13171614171ce8ed2379125e083e3d961af6a89bb79b108c1` |
| [item-01-evidence.json](item-01-evidence.json) | 本轮Agent逐项证据/判定记录 | `a0c67defeb7fe8e192c8cf98141213c0c0ab5aa134f76ccb478094a1ed66176e` |
| [item-02-evidence.json](item-02-evidence.json) | 本轮Agent逐项证据/判定记录 | `79f4ea8ce21b7a6321c13882ea9feb5be19f615144706813b031d6906b84c6bb` |
| [item-03-evidence.json](item-03-evidence.json) | 本轮Agent逐项证据/判定记录 | `5bb25fccac44c80d65b4fc10c7772b5bc0be2fb93242effe6d9dc25daa9095a5` |
| [item-04-evidence.json](item-04-evidence.json) | 本轮Agent逐项证据/判定记录 | `c2c189914c082c24d44d8e45e96312d02210063a9a9e31e3065efb3f4a8fa42b` |
| [item-05-evidence.json](item-05-evidence.json) | 本轮Agent逐项证据/判定记录 | `452b8a33f9def8e8837c726a23ea7d6b12099cd7d3eed2591289b57ed3d10150` |
| [item-06-evidence.json](item-06-evidence.json) | 本轮Agent逐项证据/判定记录 | `79ea2899ff8ccaad08128f87561b17a018b2ec1a076c6f17472d8bbe51028179` |
| [item-08-evidence.json](item-08-evidence.json) | 本轮Agent逐项证据/判定记录 | `cd1b860551e8bf702cc5a004d28fc6002ac6ddc19b52a4374557fcf3fbf0e886` |
| [item-09-evidence.json](item-09-evidence.json) | 本轮Agent逐项证据/判定记录 | `cbed70d4d65c08ef0851722f0046db69c298f4c108b56730c277cc6c6d932e57` |
| [item-10-evidence.json](item-10-evidence.json) | 本轮Agent逐项证据/判定记录 | `af6ea46f11663ca11270dcc91d9a78af70acff6d1eb894421198b4d82cbfce3e` |
| [item-11-evidence.json](item-11-evidence.json) | 本轮Agent逐项证据/判定记录 | `c38d5c5f4c6908640949706e5b79f94e91a18545b7da61fdbed72e7e28908bff` |
| [item-12-evidence.json](item-12-evidence.json) | 本轮Agent逐项证据/判定记录 | `0502735d1710c9dc30012b690141507921b56a6933aeb172d82bdf379829767b` |
| [item-13-evidence.json](item-13-evidence.json) | 本轮Agent逐项证据/判定记录 | `a98394ee98f951bcec211510780d6e58cd927f85110ba0e738f8164332565df6` |
| [item-15-evidence.json](item-15-evidence.json) | 本轮Agent逐项证据/判定记录 | `8a79e03634319aeeba8d33e5b41058e71e9f75ee6eb44c91f79a01a143f335de` |
| [item-16-evidence.json](item-16-evidence.json) | 本轮Agent逐项证据/判定记录 | `6a38f887b9c982d849e0a4d1d8f21eeb8d9bd2899c86c114c6e4bd3f122abaca` |
| [item-17-evidence.json](item-17-evidence.json) | 本轮Agent逐项证据/判定记录 | `59c41ad22a102a966bdf80a31b64b2a90b2277a89e31d2fc2cb1a595bbe03ef1` |
| [item-18-evidence.json](item-18-evidence.json) | 本轮Agent逐项证据/判定记录 | `12888d2762095f4905367d11e0d486281fb2dd334131648ee8eb7e77f811e31e` |
| [item-19-evidence.json](item-19-evidence.json) | 本轮Agent逐项证据/判定记录 | `2e48939997616b3994f7632c0d828e58217442a819c5d84a68c795f02158bb36` |
| [item-20-evidence.json](item-20-evidence.json) | 本轮Agent逐项证据/判定记录 | `daa02a8fba9a55e5d9fb9305099905d8d0dc9907b2938c9c46faafaee86f479f` |
| [item-21-evidence.json](item-21-evidence.json) | 本轮Agent逐项证据/判定记录 | `9407139dce7c0f9544c4a35b33148ae193edd02abd91ebb3ebce17f763463f66` |
| [item-22-evidence.json](item-22-evidence.json) | 本轮Agent逐项证据/判定记录 | `63cf5760d53b29ef7f3123fcded575cc9322455e8bd885edfb9f4e228aa613ad` |
| [item-23-evidence.json](item-23-evidence.json) | 本轮Agent逐项证据/判定记录 | `9372eff83d36e4f93c1b0b38be39bac86a4bdaa3de40b0d3dce8fa9e57fc5146` |
| [item-24-evidence.json](item-24-evidence.json) | 本轮Agent逐项证据/判定记录 | `34a3bc34a1133b7f7f7963679be1c7a312f92da8552d927030d966caf5c9c6db` |
| [item-26-evidence.json](item-26-evidence.json) | 本轮Agent逐项证据/判定记录 | `1b4d1e033a1a2fab980aee9afba8db9ac5870f18728b3e7fb6a9df350bb06067` |
| [item-27-evidence.json](item-27-evidence.json) | 本轮Agent逐项证据/判定记录 | `8dacc6de10776707d3a0d220b46484c0f56eec3108d19f1a09aac68ccf7dc0af` |
| [item-28-evidence.json](item-28-evidence.json) | 本轮Agent逐项证据/判定记录 | `eae2f3ad4079f6f1b1a60980b00e6ec2f86fcae109e233ecf10e7f411a4c4ebd` |
| [item-29-evidence.json](item-29-evidence.json) | 本轮Agent逐项证据/判定记录 | `0fca16cf703131cb6e90ff8a7aad400ee9673a023bf24369333027bab13855d4` |
| [item-30-evidence.json](item-30-evidence.json) | 本轮Agent逐项证据/判定记录 | `c9824c5489dc3de4e52f61a27cb001623a25e8164ec7d8fcb1f66aacfcdeba00` |
| [item-31-evidence.json](item-31-evidence.json) | 本轮Agent逐项证据/判定记录 | `2588679defef44362ca2d577a4ede2d955df85d684fb72433d4b03492a863fe2` |
| [item-32-evidence.json](item-32-evidence.json) | 本轮Agent逐项证据/判定记录 | `9e2332f27d3f0ddfbe6bfaf9c342817675a259194d27d4eb762c261382310687` |
| [item-33-evidence.json](item-33-evidence.json) | 本轮Agent逐项证据/判定记录 | `12aada50f0686ec12c8795cdb99a950d5862338b463912be4aace330325ed106` |
| [item-34-evidence.json](item-34-evidence.json) | 本轮Agent逐项证据/判定记录 | `4398ba728af308d2608809ae711893e72c75b9fc745d5566d155cd3549fb712f` |
| [item-35-evidence.json](item-35-evidence.json) | 本轮Agent逐项证据/判定记录 | `3aaef9fb8a463088d68a0b54e6c1ebd820203667adcb91fa1b6d9f24bf3961c9` |
| [item-36-evidence.json](item-36-evidence.json) | 本轮Agent逐项证据/判定记录 | `848ffafde8f789b7e9b0f85f96b8f847a138084e37a3a9c608bee5d87340093b` |
| [item-37-evidence.json](item-37-evidence.json) | 本轮Agent逐项证据/判定记录 | `c6b30bb5e90f23b12b43a82ffde0a3de1180ba9c7d9e41b521fa1cc859189695` |
| [item-38-evidence.json](item-38-evidence.json) | 本轮Agent逐项证据/判定记录 | `dcfbdb9d44b923f5b0f944de5adda8d59fd1e4dce5c04712c515c57be894a4e3` |
| [item-39-evidence.json](item-39-evidence.json) | 本轮Agent逐项证据/判定记录 | `0cc11b9db2efd0406c63056b0b1863ca9d547e9a170df0a675092024e1c3618f` |
| [item-40-evidence.json](item-40-evidence.json) | 本轮Agent逐项证据/判定记录 | `0810285cc20b1b5e28046018b2c88feab070c3a883b0523604015d9d8aa9cd20` |
| [item-41-evidence.json](item-41-evidence.json) | 本轮Agent逐项证据/判定记录 | `c3d1ac7e8edebb90bfb11fc1cced8ad19c6c853a2d1d977070e2d586ad37e8ce` |
| [item-42-evidence.json](item-42-evidence.json) | 本轮Agent逐项证据/判定记录 | `5af6eba5040d9872b0f251fca6a47f31e833cc49f2e9f4e1a9b3d677629fb4f6` |
| [item-43-evidence.json](item-43-evidence.json) | 本轮Agent逐项证据/判定记录 | `33e79eb70752a21036ad8e881a9f59a8ad6b0daf244c18f301b73081b9e8875e` |
| [item-44-evidence.json](item-44-evidence.json) | 本轮Agent逐项证据/判定记录 | `5175d7bc0e1e858545b2eacc66ec4cf722fd2372747ebb1c3f7599a970f0a000` |
| [item-45-evidence.json](item-45-evidence.json) | 本轮Agent逐项证据/判定记录 | `46f9b5c6401ed82ab258431b7f42c4febf655330f8e81aaf3263e75a8758775d` |
| [item-46-evidence.json](item-46-evidence.json) | 本轮Agent逐项证据/判定记录 | `b70758d70d7ff7e5c97e6fd03d38103eac6841775471e9c9e3e4ba9732bccaf2` |
| [item-47-evidence.json](item-47-evidence.json) | 本轮Agent逐项证据/判定记录 | `559d83e88a097724bb7abc3b1edba92b10c35e3c4a2977e9595ca30178fef9f7` |
| [item-48-evidence.json](item-48-evidence.json) | 本轮Agent逐项证据/判定记录 | `69f28caafcf49f88521732c608e55c788e20e75e824d28bc092e41d2c19e4d90` |
| [item-49-evidence.json](item-49-evidence.json) | 本轮Agent逐项证据/判定记录 | `e595c140fb429444062a211399dbaa7ca237cdb00514a81c5cdd44e833b6808c` |
| [item-50-evidence.json](item-50-evidence.json) | 本轮Agent逐项证据/判定记录 | `a155c92f81b5762a16f772c15a616026bd052b948ee84aefb7e4c0424ce4fe6e` |
| [item-51-evidence.json](item-51-evidence.json) | 本轮Agent逐项证据/判定记录 | `98a192e2ca67233b510125653afb02cae68d9082af84e71c6ad4375c0a9d53e8` |
| [item-52-evidence.json](item-52-evidence.json) | 本轮Agent逐项证据/判定记录 | `fd724e6831bb276bfbbd7eefef0d922b7c1843354386e5d2b09c20ad39516131` |
| [item-53-evidence.json](item-53-evidence.json) | 本轮Agent逐项证据/判定记录 | `bc92274f2703a3af406bae9ef5b316f6df8a31f68312e89959a99515eafa001b` |
| [item-54-evidence.json](item-54-evidence.json) | 本轮Agent逐项证据/判定记录 | `9a50fbc152b1b7888c7d57c394daaf7d25ed1db4f915d7ca0c1ffb8c2fedba6f` |
| [item-55-evidence.json](item-55-evidence.json) | 本轮Agent逐项证据/判定记录 | `713e697f2c5804522a6c8e4a0dfd590ba4c6449a0217c134dd2c7c17202181e2` |
| [item-56-evidence.json](item-56-evidence.json) | 本轮Agent逐项证据/判定记录 | `7007882a1c4b49dda26733eefadc8c9f98dc3acc014fcd4935099b8454e31cb0` |
| [item-57-evidence.json](item-57-evidence.json) | 本轮Agent逐项证据/判定记录 | `74a40bfef1533289fa1b78fe7ce10d7e127173f7a10500ca0183b096d73f3f64` |
| [item-58-evidence.json](item-58-evidence.json) | 本轮Agent逐项证据/判定记录 | `46c02f403e1a1364e6b65a48fc1ac9431fcbc145a477de7a2ad6fccfbc4a704c` |
| [item-59-evidence.json](item-59-evidence.json) | 本轮Agent逐项证据/判定记录 | `100fd983e72e6571e861b3a96e2dce0837b090eb48877e4fd4ba5cf12c7ea4a2` |
| [item-60-evidence.json](item-60-evidence.json) | 本轮Agent逐项证据/判定记录 | `edac77d689d17549d5dbd905d2bd6d347ab0581218fd50513f25348bf4f628ea` |
| [item-61-evidence.json](item-61-evidence.json) | 本轮Agent逐项证据/判定记录 | `f99df583b5bfd94515d50d39c4142c0cf4abdb2d70d760422144213cde50bb5b` |
| [item-62-evidence.json](item-62-evidence.json) | 本轮Agent逐项证据/判定记录 | `557ef957dc39e02eb7be5ff99ee3389f87a85705bb33466304c2b7f0c589ea06` |
| [item-63-evidence.json](item-63-evidence.json) | 本轮Agent逐项证据/判定记录 | `227904c35771733e84a056a6993f312425c069fc736c87a0fdc7cc60f0f7c02a` |
| [item-64-evidence.json](item-64-evidence.json) | 本轮Agent逐项证据/判定记录 | `5bd927d8ab886264bd885e7c692590dac3d76d6fcc58412d7a8285ad6bb15c32` |
| [item-65-evidence.json](item-65-evidence.json) | 本轮Agent逐项证据/判定记录 | `15f1ede7cf5f5bd30bd46247e27072eabc6c76d230590336c97b6ba8a77ab326` |
| [item-66-evidence.json](item-66-evidence.json) | 本轮Agent逐项证据/判定记录 | `08c623b4b1f303742096e3002011205abdbbdfcb883ec35208aeeec96ce5eb7a` |
| [item-67-evidence.json](item-67-evidence.json) | 本轮Agent逐项证据/判定记录 | `3c7a95fcecc7bea1a9590f7cf41c6077d392ccf8847783c20cebda0bc61555e6` |
| [item-68-evidence.json](item-68-evidence.json) | 本轮Agent逐项证据/判定记录 | `623b152659c25b50d3160978d73a5afa1f874ac4f4973f98a295576181779850` |
| [item-69-evidence.json](item-69-evidence.json) | 本轮Agent逐项证据/判定记录 | `ad6b44dca34169c3283f1c391d6019a2028fe89a948a64588d5dc0cbeeb4cf95` |
| [manifest.patch](manifest.patch) | 本轮交付/来源定位/哈希或执行环境说明 | `93e60ba10b332f90b580a386cbc1355150cf16ca62c89ea3743dbce71f11ae55` |
| [metadata-result.log](metadata-result.log) | 本轮实际运行原始输出（扩展名不保证reporter格式） | `98feb61ce3f542224c2a5f58a41e5ade32efb8de281e094f820db4bf87a45b07` |
| [metadata-roundtrip.cjs](metadata-roundtrip.cjs) | 本轮交付/来源定位/哈希或执行环境说明 | `dcd31ec9006893e53a97e9f800be6883013bb280799f66dd26141a6d3bc5261d` |
| [node-pty-rebuild-local.log](node-pty-rebuild-local.log) | 本轮交付/来源定位/哈希或执行环境说明 | `69179e321a3688f77ff7bebec4536a6e56b1a820b194ea9b710cd88c74527e0b` |
| [npm-ci.log](npm-ci.log) | 本轮交付/来源定位/哈希或执行环境说明 | `857272ce821ed4792f980179305d3893c07b033eab817c88d0381feeaaa668bb` |
| [own-code-evidence.json](own-code-evidence.json) | 本轮交付/来源定位/哈希或执行环境说明 | `9cd1a74d1d9e8369d49e1cb2146b96da961403b317752c6f70e8276ffe46e144` |
| [terminal-execution-observation.md](terminal-execution-observation.md) | 执行者运行摘要；非完整stdout | `b6b0c46e265ac25fe275ce0fd7d10965a7eca6a75aea8cd52f7c3ce586df2f99` |
| [test-summary.md](test-summary.md) | 本轮交付/来源定位/哈希或执行环境说明 | `e9674f70d1c8e0de52c676cb04979e3c94b641b8cf4cdf97fb73a2fdd0710a08` |
| [web-workspace-release.tap](web-workspace-release.tap) | 本轮实际运行原始输出（扩展名不保证reporter格式） | `d28f66b4e1c74d65c44857e6cc85ccf3eca4ac06fada9cae64d56ee83be1aba7` |
