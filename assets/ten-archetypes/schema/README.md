# 常明城人物 schema 与红线 lint

本目录把人物设定分成两层：

- `character.schema.json`：JSON Schema draft 2020-12，约束单个人物的数据契约。
- `redline.rules.json` + `lint.mjs`：读取 manifest、典籍 registry 与原文后才能判断的跨文件规则。

`fixtures/valid-character.json` 是甲·广莫的 v2 示例；`fixtures/valid-faction-character.json` 是明确标为未定稿的外派结构示例。其余 `*.fixture.json` 是故意违规或防误报用例，不是可发布人物。

## 1. 核心模型

### 人物类型

`kind` 只有两种：

- `heavenly-stem`：十干人格。必须有 `identity.stem/stemPinyin/element/polarity`、命理宗归属和 `relations.stemTopology`。
- `faction-character`：外派或命理宗内的非十干人物。必须有 `factionRole`，不得声明十干字段或 `stemTopology`。

当前内置派系 ID 是：

| factionId | 显示名 |
| --- | --- |
| `mingli-zong` | 命理宗 |
| `xingshi-pai` | 形势派 |
| `liqi-pai` | 理气派 |
| `yijia` | 医家 |
| `daomen-lvling` | 道门律令 |
| `jingyi-guanxue` | 经义官学 |

这里是“命理宗 + 五个外派”，共六个可归属项。`factionId` 使用开放的 stable ID，不被 enum 锁死；新增派系不需要升 schema 版本。

### 关系分层

- `relations.stemTopology`：只给十干使用，表达同类、我生、生我、我制、制我、合、冲。它是可推导事实，lint 会锁死。
- `relations.worldEdges`：跨派、人物—派系及一般人物关系。边上明确 `domain`、`stance`、`direction`、`status` 和 `evidence`，不借用生/克/合/冲。
- `relations.interpretations`：关系卡文案或故事钩子。它不能覆盖前两者的事实拓扑。

### AI 消费字段

- 出图：`visualLock.presentation/silhouetteZh/lockedTraitsZh/wardrobeZh/palette/props/prompt`。
- 对白：`voice.summaryZh/sentenceLength/directness/questionFrequency/preferredPatternsZh/avoidPatternsZh/sampleLinesZh`。
- 故事与副本：`canon.factsZh/prohibitionsZh/irreplaceableHighlightZh/unresolvedZh`、`factionRole`、`worldEdges`。
- 典籍依据：`classics[]`。引文不可放在自由文本出处中代替此数组。

`canon.status` 与关系边的 `status` 用 `proposal`、`provisional`、`locked` 区分草案和锁定事实，避免 agent 把 `FACTIONS-DRAFT-v0.md` 的〔设〕误当成〔典〕。

## 2. 古籍引用

每条引用至少包含：

```json
{
  "citationId": "jia-ditiansui-tiangan",
  "bookId": "ditiansui",
  "chapterId": "ch02",
  "quoteOrig": "甲木參天，脱胎要火，春不容金，秋不容土，火熾乘龍，水蕩騎虎，地潤天和，植立千古。",
  "deepLink": "https://dao.leonardchow.work/dian/#/read/ditiansui/ch02",
  "use": "behavior-metaphor"
}
```

lint 的校验顺序：

1. `bookId` 实时命中 `www/dian/data/registry.json` 的 `books[].id`，并要求 `hasTextData=true`。
2. 实时读取 `www/dian/data/texts/<bookId>.json`，命中 `chapters[].id == chapterId`。
3. 按该章 `fragments[].text` 的原顺序无分隔拼接，要求 `quoteOrig` 是逐字子串。
4. 要求 `deepLink` 严格等于 `https://dao.leonardchow.work/dian/#/read/<bookId>/<chapterId>`。
5. 若给出 `annotatedSentenceIds`，再读取 `annotated/<bookId>.json` 校验同章句号和 `orig` 覆盖范围。

第 3 步故意不做繁简转换、标点清理、空白折叠或 Unicode normalization。“參”改成“参”也会失败。这是防止引文被无意改写或凭记忆补写的核心边界。

## 3. 十神方向的推导口径

字段方向固定如下：

- `tenGodFromSelf`：当前 character 看 `targetId`。
- `tenGodFromTarget`：`targetId` 看当前 character。

算法不是合冲对照表硬编码：我制者为财，制我者为官杀；同阴阳取偏财/七杀，异阴阳取正财/正官。由五行与阴阳重新推导，五合得到：

| 关系 | 前者看后者 | 后者看前者 |
| --- | --- | --- |
| 甲 → 己 | 正财 | 正官 |
| 乙 → 庚 | 正官 | 正财 |
| 丙 → 辛 | 正财 | 正官 |
| 丁 → 壬 | 正官 | 正财 |
| 戊 → 癸 | 正财 | 正官 |

四冲甲庚、乙辛、丙壬、丁癸都是同阴阳，且后者之五行制前者，所以前者看后者为七杀，后者看前者为偏财。此方向与 `COPY.json`、worldbook 的“甲看己正财，己看甲正官”一致。

## 4. 红线与判据

| rule | 可判定规则 |
| --- | --- |
| `CM-RL-001` | 十干 `id/stem/nameZh/element` 与运行时 manifest 逐值相等；拼音、阴阳按 stem 基础表核对。姓名不在 rules 复制第二份。 |
| `CM-RL-002` | 五类五行关系和五合四冲由 manifest 五行与规则周期推导，数组及特殊边精确比较；戊己无冲。 |
| `CM-RL-003` | 每条合冲边的双向十神按五行作用与阴阳同异重算。 |
| `CM-RL-004` | `profile.selfStatementZh` 用 Unicode code point 计数，标点、空格都计入，最多 30。 |
| `CM-RL-005` | 仅当同批数据完整覆盖十干时判定；“五阳全 masculine + 五阴全 feminine”或完整反向二分都失败。单个人物不做性别推断。 |
| `CM-RL-006` | registry、texts、chapter、逐字引文和规范深链全部命中。 |
| `CM-RL-007` | `signatureActionKey` hard check：守=`ding`、画=`yi`、落=`geng`、开=`wu`。文本只扫描 `irreplaceableHighlightZh` 的窄模式并报 REVIEW；不扫描 bio/对白/普通正文。 |

`CM-RL-007` 的文本扫描刻意保守。“开口、公开、开始、切开”被列为明确非命中；疑似“开门/开闸”等只报 REVIEW，默认不改变退出码。结构化 `signatureActionKey` 越权才是 ERROR。需要在 CI 把 REVIEW 也视为失败时使用 `--strict-review`。

## 5. 运行 lint

在任意工作目录都可运行：

```bash
node assets/ten-archetypes/schema/lint.mjs
```

无参数默认做两件事：校验两份 `valid-*.json`，再运行所有失败自证 fixture。故意违规被正确抓出会显示 `EXPECTED FAIL`，这代表自证通过，不会让总退出码失败。

常用命令：

```bash
# 校验一个人物或递归校验目录；显式目标默认不跑 fixtures
node lint.mjs path/to/character.json
node lint.mjs path/to/characters/

# 只跑失败自证
node lint.mjs --self-test

# 校验目标并同时跑失败自证
node lint.mjs path/to/characters/ --self-test

# REVIEW 也使退出码非 0
node lint.mjs path/to/characters/ --strict-review
```

退出码：

- `0`：无 ERROR、自证全部符合预期；默认模式下 REVIEW 不阻断。
- `1`：人物 ERROR、自证失效，或 `--strict-review` 下出现 REVIEW。
- `2`：命令行参数错误。

`lint.mjs` 无 npm 依赖，使用 Node 24 原生模块。它执行核心必填字段 guard 和全部红线，但不是通用 JSON Schema engine；接入 API、数据库或 agent pipeline 时，仍应在入口用支持 draft 2020-12 的 validator 对 `character.schema.json` 做完整结构验证。

## 6. 从 COPY.json 迁移

不要原地修改 iCloud 的 `COPY.json`。新建 v2 文件后按下表迁移：

| COPY.json | character@2 | 迁移说明 |
| --- | --- | --- |
| `_schema/_generated/_note/sources` | `provenance` | `_schema` 记入 `migratedFromSchema`；来源拆成 `sourceFiles[]`。 |
| `identity.stem/stemPinyin/id/element/polarityZh/nameZh/nameEn` | 顶层 `id` + `identity` | `yang` 删除，避免与 `polarity` 双写漂移。 |
| `identity.role*/epithet*/selfStatement*` | `profile` | 中文自述受 30 字 lint；英文可放对应 `*En`。 |
| `identity.visualPresentation*` | `visualLock.presentation` | `adult woman/man` 分拆成 `ageBand` 与 `genderPresentation`；`isDerivedFromPolarity=false`。 |
| `siteCopy.tags*/desc*` | `profile.tagsZh/summary*` | 页面布局文字 `uiFraming` 不进 canon，可放 `extensions.sinan.ui`。 |
| `siteCopy.scar/highlight/ongoing` | `profile.scar/unfinished` + `canon.irreplaceableHighlightZh` | 与 `masterCopy` 或 worldbook 冲突时不自动择一，先写 `review.conflictIds`。 |
| `siteCopy.comic/assets` | `media` + `visualLock.referenceAssets` | 必须标资产版本与 canonical/legacy/draft，避免 v7/v8H 混用。 |
| `masterCopy.bio/gift/shadow/scar/unfinished` | `profile` + `canon.factsZh/unresolvedZh` | bio 拆成可判定事实，不整段复制为事实层。 |
| `masterCopy.voiceZh` | `voice` | 把句长、直接度、提问频率、偏好/禁用模式拆开，并给至少两条短 sample。 |
| `masterCopy.visualLockZh` | `visualLock` | 拆出稳定形体、服装、色板、道具允许/禁止与正负 prompt token。 |
| `relations.peer/output/source/control/pressure` | `stemTopology.peer/generates/generatedBy/controls/controlledBy` | 目标从天干字转换为 manifest stable ID；不要手工相信旧拓扑，交给 lint 重算。 |
| `relations.combine/clash` | `stemTopology.combines/clashes` | 保留双向十神，但由 lint 重新推导；title/story 进入边的 `titleZh/storyHookZh` 或 `interpretations[]`。 |
| `classics.*` | `classics[]` | 每一个 `verse/text/commentary[]` 拆成一条 citation；从旧 link 取 bookId/chapterId 后仍须到 registry/texts 实查。旧 `book/chapter` 显示名不是权威键。 |
| `conflicts` | `review` | 只存冲突 ID 与审批状态，不把“已通过”字符串当成校验结果。 |

迁移后先单文件跑 lint；十干全量迁移完成后再把十份文件所在目录一起跑，才能触发完整群像的 `CM-RL-005`。

## 7. 新增人物

### 新增十干数据

十干身份和拓扑已锁死，不存在第十一干。新增/迁移一份十干 JSON 时：

1. 复制 `fixtures/valid-character.json` 到正式人物目录。
2. `id/stem/nameZh/element` 取当前 manifest，不能自创或改名。
3. 按 schema 填 profile、视觉锁、voice、canon 与至少一条真实古籍引用。
4. 把合冲两端都写入数据；lint 会从五行和阴阳重算目标与十神。
5. 对包含十份文件的目录运行 lint。

### 新增外派人物

1. 设置 `kind: "faction-character"` 和全局稳定 `id`，例如 `xingshi.xunlong-lao`。
2. 在 `affiliations[]` 指定派系；填写 `factionRole.scale/claimZh/methodZh/effectiveDomainZh/blindSpotZh/internalTensionZh`。
3. 不写 `identity.stem/stemPinyin/polarity`，也不写 `relations.stemTopology`。需要五行文化关联时只用 `identity.elementAffinities`。
4. 跨派冲突写成 `worldEdges[]`，例如方法论上 `opposed`、方向 `mutual`，并给 canon 与 citation 证据。
5. 完成视觉锁、voice、canon、classics 后运行 lint。

## 8. 新增派系

1. 选一个稳定、不会依赖显示名的 `factionId`，满足 lowercase stable ID pattern。
2. 新人物直接在 `affiliations[].factionId` 使用它；schema 无需修改。
3. 若该派系成为官方内置项，在 `redline.rules.json > factionCatalog.builtIns` 增加显示名快照。此 catalog 不替代单独的派系实体数据；当前任务未定义 faction schema。
4. 用人物的 `factionRole` 写有效问题域与盲点。派系主张的古籍依据仍通过各人物 `classics[]` 或未来 faction schema 的同构 citation 表达，不写无法核对的自由文本引文。

## 9. Fixtures

| fixture | 预期 |
| --- | --- |
| `fail-manifest-name.fixture.json` | `CM-RL-001` 姓名锁失败 |
| `fail-stem-topology.fixture.json` | `CM-RL-002` 同类拓扑失败 |
| `fail-ten-god.fixture.json` | `CM-RL-003` 甲看己十神失败 |
| `fail-self-statement.fixture.json` | `CM-RL-004` 34 字自述失败 |
| `fail-yinyang-gender.fixture.json` | `CM-RL-005` 完整机械性别排列失败 |
| `fail-classic-book.fixture.json` | `CM-RL-006` 虚构书目失败 |
| `fail-classic-quote.fixture.json` | `CM-RL-006` 繁简改字导致逐字失败 |
| `fail-classic-deeplink.fixture.json` | `CM-RL-006` 深链章节失败 |
| `fail-highlight-action.fixture.json` | `CM-RL-007` hard ERROR + REVIEW |
| `pass-highlight-open-phrases.fixture.json` | 防误报：开口/公开/开始/切开不命中 |
