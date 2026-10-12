# vNext 修复方案：已采用产品结构的同次、持续维护

基线：`vibe-coding-workflow-system@89d2ffe17c424b30aff4ccc840b2b083f079c716`（main）。

方案性质：拟实施修复；复用 product-doc/v3、manifest/v2、现有 TaskBinding、assessment、helper 与 Task 服务。不是新建需求管理系统。

## 1. 修复目标

用户要求完整规划、正式新增或按已采用层级整理需求时，宿主应在同一授权维护过程内保存相应的完整定义、真实结构关系、稳定顺序和依据；下一次新增或变更继续使用这条路径，不需要另起一次“修需求图”。

修复的是结构生产与维护结果核对，不是要求每个需求都有父项、每个 Task 都有关联，或每张图全部连通。

## 2. 已有能力与实际缺口

当前 update 指引已经要求处理完整增量、保留父项、维护项目顺序、复用明确决定和局部保存。[V1] v3 已允许子 requirement 指向父 requirement，以及目标间组成关系；正式读取仅使用已声明的有效关系。[V2]

TermLink 的实际反例是：用户要求按层级整理，实施者仅在扩展字段和正文做分类，并自行解释为不改变目标关系。[T1] 关键已安装 Skill 与更新指引在此前核对中与本基线源文件相同，故本轮不能只归因于“未升级”。

必要增量是明确下列语义并证明其在实际宿主操作中成立。格式规则能检查合法关系，但不能替模型判断用户真正采用了什么。

## 3. 统一结构表达

| 业务内容 | 默认表达 | 边界 |
| --- | --- | --- |
| 项目整体结果 | goal 与 project.root_goal_id | 从实际采用定位，不按文件顺序猜根。 |
| 服务端、客户端或其他有交付范围的总体能力 | 父 requirement | 必须确为既有/采用的业务范围，不仅为凑树而新增承诺。 |
| 权限、连接模式、历史能力等次级要求 | requirement，并以 part_of 指向父 requirement | 允许继续细化，无固定深度。 |
| 需独立追踪、关联或评估的具体功能/质量要求 | 子 requirement | 不新增 feature 类型；同一内容不同时留两份当前定义。 |
| 纯导航分类 | 可选 module | 不是必经层，不自动具有验收和 Task 绑定。 |
| 平台、原始章节、历史功能编号等补充信息 | sources、正文或 extensions | 不据此自动生成主图关系。 |

根目标与需求之间使用 supports；需求组成使用子→父的 part_of；前置条件使用 depends_on；历史替代使用 replaces/derived_from。不能用历史边代替当前组成，也不为每个祖先机械复制一条直接 supports。

## 4. declared / inferred 的最终解释

### 4.1 不把内部 ID 当成采用条件

用户不必亲口说出 REQ 或 GOAL ID。用户已经采用的层级、有效源材料中明确表达的关系，或者明确委派且有足够依据的既有范围归类，都可以由 Agent 使用内部 ID 正式保存。

关系应留下真实来源。Agent 转述标明为转述；整理后的 ID 和标题不冒称是用户的逐字原话。declared 也不代表功能完成、证据通过或执行授权。

### 4.2 可以直接保存与不能擅自保存的情形

| 情形 | 行为 |
| --- | --- |
| 用户已明确采用“服务端需求包含权限管理”等层级 | 在已授权维护中保存 declared + active；不再逐边确认。 |
| 正式源材料明确列出组成关系，任务是忠实结构化整理 | 按该来源保存明确关系，无需用户重述内部编号。 |
| 当前授权明确涵盖既有内容的归类决策，归属明确且不改变业务范围 | 可以在该授权内形成有依据的结构，记录分类依据。 |
| 只请求盘点或比较，模型新提出多种可能归属 | 保存/展示为候选，是否写入依实际保存授权。 |
| 来源冲突、实质业务边界不清 | 保留原内容与未决；只就真正影响本次工作的决定询问，不让全项目等待。 |
| 仅因代码使用某组件、标题相似或没有其他父项 | 不据此把关系升级为明确结构。 |
| 旧关系曾被用户否定 | 尊重旧处置；只有真实新依据或当前明确改变决定才调整。 |

不得进行全库 inferred→declared 替换。也不得反向规定“只要由 Agent 整理就始终 inferred”。

### 4.3 组织已有要求不等于提出新业务义务

用户要求把已确定功能归到已采用父级时，可以建立必要结构身份与关系。业务边界不变，不因新增结构 ID 就声称新增功能需求。

但新父节点如果暗中增加了质量承诺、设备覆盖、架构前提或验收门槛，就属于实质业务变化，不能借“整理”自动采用。

## 5. 正式维护的同次处理流程

### 5.1 读取与范围识别

读取用户新请求及实际采用依据、相关现有目标/父子要求、来源和必要设计约束。完整规划覆盖本次全部已知当前义务，不能只整理最近 Task；正式增量完整分析本次增量及实际影响，不扩成每次全项目扫描。

current 表示当前已采用的业务范围，包含已交付及计划较后实施的部分；不能因较后实施就自动降为 planned/candidate。已确认但尚未安排 Task 的要求照常保留。旧实现与 Task 可用于交付归因，不能成为产品要求存在的必要依据；初始产品要求没有对应历史 Task 时，不因此丢弃。

### 5.2 复用或建立身份

先找可用现有身份和已采用结构。分类、改名或移文件不默认产生替代；共享能力保留同一身份。真实替代/退出才使用既有历史规则。

需要独立功能节点的已明确内容使用子 requirement。简单描述、例子和验收条件留正文，不固定要求一点一 Task 或一点一文件。

### 5.3 同次保存的内容

| 操作 | 需一并核对并维护 |
| --- | --- |
| 新增需求/独立功能点 | 定义、来源、适用范围、可明确的父项/目标关系、新 ID 的项目顺序。 |
| 细化已有需求 | 保留父项；建立子项及组成关系；已移出的具体定义改为引用，保留共性约束。 |
| 改变范围 | 只调整实际受影响关系、范围与必要报告待核对信息。 |
| 采用分类/层级方案 | 将采用的结构落实到核心条目和 links；标签或扩展说明不能代替结构交付。 |
| 真实拆合/替代 | 保留旧身份、范围去向和来源，核对仍指向旧项的相关关系；不自动继承旧 PASS。 |
| 无可靠归属 | 保存需求及真实未决/候选内容；不伪造父项，不阻塞 Task。 |

“同次”是一次用户请求或连续授权中的局部维护，不是新增数据库事务：可分几次 helper 写入；每次遵守实际读取版本与并发保护；成功部分保留，失败部分单独补存。

### 5.4 保存后的结构回读

使用现有 read/check、原条目及 product_view.current_relations 核对本次结果。重点不是关系数越多越好，而是用户本次采用的组成/支撑关系是否能被确定性读取。

需要形成正式层级时，不能仅凭 schema valid、all_requirements_classified、扩展字段存在或文件保存成功结束。回读应指出：已形成的路径、真实候选、尚未归属/未保存部分、只留正文而未成为独立节点的细项。

该核对可使用本次候选变更中的采用关系集，不新建永久“期望关系数据库”或全项目认证评分。机器不从自由正文猜关系是否遗漏。

### 5.5 重试与延期

先读已有身份与成功回执，只补缺失的定义/关系/顺序/报告，不重复 prepare 或改动 Task 焦点。维护暂停、用户先实施或无 PRODUCT 时，沿用正常独立任务路径；报告不足，不伪报结构同步成功。

本能力仅在相关 Skill 实际执行、维护启用且授权覆盖时工作。不是文件后台监听，也不保证用户任意手工改文件后立即自动同步。

## 6. 文档版本、结果与历史

现有 v3 已满足本轮节点和关系要求，不新增 v4、Feature 类型、待归属状态或审批字段。老项目需要新方向的 part_of 时，迁移实际相关定义文件或使用合法的混合版本表达；不能将 v3 核心关系静默写入 v2。

语义细化、关系采用或版本迁移可能产生定义对齐提示。保持旧报告的实际对象、原摘要、检查时间与成果，不为显示绿色改写旧记录。按受影响范围复用材料或形成新报告；缺资料说明未知，不强制新测试或全图复评。

项目 requirement_order 与实施工作项顺序分开。新身份追加，不因树形整理把已登记子项挪到父项旁；已有父项可以保留当前身份和范围。

## 7. 文件修改清单

| 文件 | 本轮内容 |
| --- | --- |
| docs/product/project-maintenance/document-contract.md | 在当前结构与来源解释处补 adopted/declared、正式结构必须使用核心 links、同次维护和功能细项表达边界；保留原 v3 字段及读取算法。 |
| runtime/vnext/support/product-maintenance/references/update.md | 承载完整同次维护方法，包括新增、细化、归类、修改、真实替代及结果回读。 |
| runtime/vnext/support/product-maintenance/references/inventory.md | 存量材料以完整产品范围为起点；区分父需求/纯分类/正文细节，调用 update 方法，不复制一套流程。 |
| runtime/vnext/support/product-maintenance/references/discussion.md | 只补明确采用后路由到既有更新过程；讨论相关性确认不等于采用业务内容。 |
| templates/vnext/skills/maintain-project.SKILL.md.tmpl | 增加必要的一句结果边界和引用，避免主 Skill 扩大。 |
| references/plan.md、reconcile.md 及 prepare/close 主模板 | 仅核对是否正确复用本路径；已覆盖则不改，不复制新流程。 |
| docs/guides/maintain-project.md 与现有产品说明 | 说明真实使用、字段/正文与图交接、关系有依据但未维护与真实未决的区别。 |
| 现有 examples、测试与资产构建脚本 | 添加/复用有限共用场景；通过原生成流程发布安装契约和 Skill。 |

不为本轮默认修改 schema、Task reducer、全图摘要算法、记录存储或完成判定。若真实工具操作证明另有必要确定性缺陷，另行定位最小修复，不能因措辞更严谨而扩大 Runtime 控制。

## 8. 验证方案

| 场景 | 实際需观察的结果 |
| --- | --- |
| 采用父子结构，用户没有输入内部 ID | 宿主分配/复用实际 ID，保存有依据的 declared 关系；无逐边确认。 |
| 整理已有范围但禁止新增业务 | 能建立正确父级和细项结构，不新增业务承诺；不缩成纯导航。 |
| 已有父项下正式新增 | 定义、关系及项目顺序同次可回读，无需第二次整理。 |
| 只有盘点授权且关系新推断 | 保持候选/未决，不批量采纳。 |
| 一项跨端共享 | 单一身份，多个有依据的归属，正文不重复。 |
| v2 文件需要子需求关系 | 采用合法局部迁移或混合版本，不把 v3 方向写进 v2；原身份与 Task 保留。 |
| 部分写入后冲突与重试 | 仅补失败部分；无重复条目、绑定或 Task 操作。 |
| 合理孤立、维护暂停、用户先实施 | 未归属可见；Task 照常可推进。 |
| 定义/关系变化后的结果对账 | 原成果保留，适用性单独说明，不继承旧 PASS，不全图重测。 |
| 后续重复读取/再次维护 | 不额外生成重复需求、关系、证据或报告。 |

格式/保存回归与宿主行为证据分别报告。复用 product-maintenance-v3、product-maintenance、source contract 与安装用例；确定性行为确有覆盖缺口才新增测试。有限宿主交互应从原始业务输入开始，不能预先写好全部 links 再称为宿主正确分析。允许使用已标注合成的补充材料，不能假称是真实产品新需求或业务验证。

可按实际改动选择原有命令，以下只是计划：

```bash
bun run check:toolchain
bun run build:product-maintenance
bun test test/product-maintenance-v3.test.ts test/product-maintenance.test.ts
bun run validate:vnext-source
bun test test/workflow-vnext-source.test.ts
# 交付安装资产时：
bun run build:vnext-runtime
bun run build:vibe-governance-distribution
bun test test/product-maintenance-install.test.ts
```

不强制为了修改指引运行所有 Runtime/业务测试，也不为逐句文案增加持久自动测试。

## 9. 分发及完成标准

由现有生成过程更新安装用 contract.md、references 和 Skill，不手改生成目录。核对实际构建、打包、隔离安装后的相关字节与源模板，必要时按仓库规则提高版本；版本号相同或不同都不能代替资产检查。

完成必须同时说明：生产规则已更新并可安装；有限宿主行为确实能输出被消费者识别的已采用结构；隔离环境中下一次新增/变更仍能同次维护。这里的验证失败影响本修复的交付声明，不影响目标项目业务 Task。

TermLink 真实存量整理由第三份方案完成，不以此方案已通过就宣称真实项目结构已经整理好。TraceLens 解释性显示由第二份方案完成。

## 10. 给实施者的任务边界

在上述固定基线上核对工作区，按现有授权实施规则、指引、有限样例与分发。先用 TermLink 已提供的请求和相关结构片段复现“只写分类、不形成主图关系”的结果；改动以正确表达既有采用结构为目标。保持 Task 非阻塞和历史真实性，不批量转换 inferred，不新增业务义务、Feature 类型或完整性门槛。报告源码、宿主交互、安装和剩余范围，不自行追加仓库提交、发布、部署或真实项目升级授权。

## 固定来源

- [V1 当前 update 指引](https://github.com/KongXiangning/vibe-coding-workflow-system/blob/89d2ffe17c424b30aff4ccc840b2b083f079c716/runtime/vnext/support/product-maintenance/references/update.md)
- [V2 现有契约第 10 节](https://github.com/KongXiangning/vibe-coding-workflow-system/blob/89d2ffe17c424b30aff4ccc840b2b083f079c716/docs/product/project-maintenance/document-contract.md)
- [V3 当前产品视图及报告选择](https://github.com/KongXiangning/vibe-coding-workflow-system/blob/89d2ffe17c424b30aff4ccc840b2b083f079c716/runtime/vnext/src/product-maintenance/scoped.ts)
- [V4 maintain-project 源模板](https://github.com/KongXiangning/vibe-coding-workflow-system/blob/89d2ffe17c424b30aff4ccc840b2b083f079c716/templates/vnext/skills/maintain-project.SKILL.md.tmpl)
- [V5 讨论维护指引](https://github.com/KongXiangning/vibe-coding-workflow-system/blob/89d2ffe17c424b30aff4ccc840b2b083f079c716/runtime/vnext/support/product-maintenance/references/discussion.md)
- [T1 TermLink 本轮分类的原指令与维护解释](https://github.com/KongXiangning/TermLink/blob/00937429a2f7ea6166e12c0dcf97e0fa64ba558e/docs/product/history/maintenance-20261011/requirements-hierarchy-20261012/decision-and-basis.md)
