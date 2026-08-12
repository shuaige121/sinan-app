# 城外角色设计 · 意境本 v1（2026-08-12）

覆盖 `CAST-ROSTER-v1.md` 的 B 级（有位无人）与 C 级（有位无戏）共 **14 位**外部角色。

**与十干母版的关系**：十干用「视觉锁定」（锁身高体重发型服装，防十张图漂移）。本文件**不用那套**。外部角色锁的是**欲望怎么从身体漏出来**，五官、身高、服装细节交给出图模型自己长。理由见 §0。

---

## 0. 写法契约（生图前必读）

### 0.1 锁什么，不锁什么

| 锁（不可漂移） | 不锁（模型自由） |
|---|---|
| 欲望核：他要什么，要到什么程度 | 五官、脸型、美丑 |
| 一个**标志性的欲望动作**（身体如何泄露他想要） | 身高、体重、年龄区间可浮动 ±5 岁 |
| 眼神的**方向与温度**（看哪里、看多久） | 发型、发色 |
| 手的状态（手是这套设计的第二张脸） | 服装款式与颜色 |
| 「不许画成什么」清单 | 姿势构图、光线、背景 |

**为什么反过来**：十干是常驻群像，用户要在合影里认出「那个是我」，识别度压倒一切。五派是流动的外来者，每人只出现几卷，要的是**一次照面就钉进读者脑子**。锁死五官会让 14 个人长成同一套模板脸；锁死欲望反而每个都长得不一样。

### 0.2 「性张力」在本项目的定义

**不是**：暴露、媚态、性感体征、少女感、肌肉展示、贴身衣物。这些一律不许出现在 prompt 里。

**是**：**一个人被自己的欲望撑得快要溢出来的样子。** 欲望的对象可以是钱、知识、长生、福分、清白、被承认、把话说完、看见最后一眼——性欲只是其中一种，不是默认那种。

三条判定：
1. **有没有「过量」** — 这个人对某件事的在意程度**超出了常人合理范围**。合理的在意不产生张力。
2. **身体有没有泄露** — 欲望必须有一个**不受控的出口**：手指、喉结、呼吸、瞳孔、一个反复做的小动作。人可以管住嘴，管不住这个。
3. **有没有代价的痕迹** — 长期被这个欲望驱使的人，身上会留下东西：常年半跪的膝盖、被墨蚀黑的指甲、久坐的驼背、闻药闻坏的鼻子。**痕迹是张力的物证。**

俊美不是要求。**记忆点是要求。** 一个五十岁、脸上没有一处漂亮、但看你的时候像在称你有几斤重的人，比一张标致脸有张力得多。

### 0.3 意境怎么写（对照示范）

❌ 定型写法（十干母版风格，本文件不用）：
> 三十四岁男性，深色短发，灰色工作衬衫敞穿于深色 Henley 外，肩最宽厚，不穿土黄色制服。

✅ 意境写法（本文件采用）：
> 他站在药柜前的样子像站在自己家门口。手指还没碰到抽屉就已经知道里面剩多少——不是记性好，是这些年他每天都要开合它们上百次。药不够的时候他不看药柜，看人；看的方式很难形容，像在估这个人还能撑几天，也像在估自己能骗过自己几天。

区别在于：定型写法给的是**可核对的清单**，意境写法给的是**可推演的状态**。模型拿到状态会自己长出清单，且每次长得都不一样——这正是我们要的，因为这些角色不需要跨图一致到发丝。

### 0.4 画风继承（唯一的硬约束）

外部角色若要与十干同框，画风必须继承 v8H：`concepts/changming-character-v8-face-study-a.png` 为画风参考，纸色底、写实动画质感、克制笔触。**画风继承，角色不继承。**

### 0.5 三条红线（来自 BIBLE §9 / NOVEL-OUTLINE §0）

1. **不许写成反派。** 每个人的欲望在他自己的问题域里都是**对的**，且他真的靠这个救过人、断准过事。欲望过量 ≠ 邪恶。
2. **不许出领袖。** 任何一派内部的两个人都不许有一个压过另一个，师徒也不行——老的有资历，小的有战绩。
3. **不许撞十干的反面。** 每条设计后附「防撞」一栏，写明它与哪个干同轴、如何反向。

---

## 1. 经义官学 ·「定名的」（层级：国家 · 材料最充足 170,908 字）

> 全书权力最高、卷六大议的主场、握有「什么叫什么」的裁定权。**此前零人物雏形**，本节两人是从零起草。

### 1.1 今文一系 ·「颁字的」

**欲望核**：他要让世界按他说的叫。不是求名求利——是他真的相信，**名字定错了，人就会照着错的活**。所以每定一个字，他都像在救人。

**意境**
> 他说话很慢，因为每个词他都在心里过一遍是不是那个词。别人以为这是矜持，其实是紧张——他怕自己用错。他一生最快乐的时刻是在廷议上把一个字定下来，那之后整整三天他睡不着，反复想那个字会不会毁掉什么人。
> 他的手常年悬在纸面上方一寸，不落笔。落笔那一下极快，快得像怕自己反悔。
> 他不年轻了，脖颈前倾，是几十年低头看字压出来的。眼睛里有一种近乎贪婪的清亮：他看一个陌生人，先看的不是脸，是这个人**该被叫做什么**。

**性张力落点**：那一寸悬空。所有人都能看见他手在抖，而他自己不知道。定字那一刻他的呼吸会停——是那种把一辈子押在一个字上的停。

**不许画成**：慈祥老学究、白胡子仙风道骨、腐儒、权臣。他不威严，他**紧张**。

**开口能引**：《白虎通义》ch09 五行〔已核〕·《说文解字》〔有料未核，引前必读〕·《尚书·洪范》〔有料未核〕

**防撞**：与辛·瑾瑜同轴（标准/精度）反向——辛的怕是「东西被磨损」，怕的是**物**；他的怕是「字定错害人」，怕的是**后果**。辛沉默不出声，他必须出声，出声是他的职务。

**生图 prompt（EN）**
> A scholar-official past his prime, neck permanently inclined forward from decades of close reading. His hand hovers an inch above the paper, visibly trembling, refusing to descend. The eyes are unnervingly bright — he is looking at you the way one looks at a word not yet decided. Ink-dark fingertips. Not dignified, not serene: he is *nervous*, and the nervousness is the point. Paper-toned background, restrained animation-realist rendering, v8H style reference.

---

### 1.2 古文一系 ·「校底本的」

**欲望核**：她要摸到那个字**最初的样子**。这个欲望没有终点——校得越深，异文越多，「原文」这个东西本身在她手里消失。她知道，她停不下来。

**意境**
> 她读书的姿势不像读，像触。手指压在纸上一个字一个字挪过去，指腹早被墨蚀成灰黑，洗不掉了。
> 她极少反驳别人，只是把另一个本子推过去。推过去的时候有一种压不住的**兴奋**——那是她一天里唯一会笑的时候，笑得不好看，甚至有点吓人，因为她笑的是「你错了，而我有证据」。
> 她身上有一股旧纸的味道，走过去半天散不掉。她自己闻不到。

**性张力落点**：推本子那一下。手推出去时前倾的幅度大过礼数允许的距离，眼睛盯着对方的脸等那个瞬间——她要的不是赢，是看见对方**发现自己错了**的那一刻。这是一种非常私密的贪。

**不许画成**：书呆子、眼镜娘、清冷仙女、刻薄女官。她不冷，她**烧**。

**开口能引**：与今文一系同源，但立场相反。今文用《白虎通义》（官方裁定），她用更早的本子反咬。

**防撞**：与癸·雪泥同轴（先看见）反向——癸看见了不说，怕自己不在场；她看见了立刻说，且要看着你被说服，怕的是**没人承认她看见过**。同一种「先看见」，一个内收一个外扑。

**生图 prompt（EN）**
> A woman who reads with her fingers, not her eyes — fingertips stained permanently ink-grey, pressed against the page. Caught mid-gesture pushing a second book toward someone across the table, leaning further forward than manners allow. Her smile is not attractive; it is the smile of someone who has just found proof that you are wrong, and she wants to watch you realize it. Smells of old paper (render as dust motes in the light). Paper-toned background, v8H style reference.

---

## 2. 理气派 ·「对时辰的」（层级：国家＋小家 · ⚠️ 材料仅 17,370 字，8 本 6 本空壳）

> **先补书再补人**。本节两人的台词现在只能引《协纪辨方》卷十七年表与《地理辨正》，深戏写不了。

### 2.1 官历一系 ·「翻历人」（已在卷二分场表，缺档案）

**欲望核**：他要**免责**。不是逃避——他真的相信标准就是标准，按标准做的事，出了事也不是他的错。他一生最大的享受，是在一本书里找到那句能让所有人下班的话。

**意境**
> 他翻书的速度快得不像在找，像在**认**——他知道那句话在第几页的哪个位置，一年翻上千次。找到的那一刻他不说话，先用指甲在那行字下面划一道，划完才抬头，眼睛里有一种孩子般的得意。
> 他的呈文写得极漂亮，一个字不多。别人问他「这样真的没事吗」，他会愣一下——这个问题对他来说是不成立的：书上写了，就是没事。
> 他手里那部历书缺了三卷。他知道缺，从不说。别人查到那里，他会很自然地把话岔开——这是全书他唯一撒过的谎，而他自己不认为那是谎。

**性张力落点**：指甲划下去那一道。以及被人当面质疑时，他会不自觉地把书往自己怀里收半寸——那是一个人抱住自己唯一依靠的动作。

**不许画成**：油滑小吏、谄媚、贪官。他清廉，他只是**害怕自己承担判断**。

**开口能引**：《钦定协纪辨方书》ch02 太岁年表〔已核〕，含豁免条款「十二吉山宜寅午戌申子辰年月日時」。**其余各卷站内没有，写作时不得编。**

**防撞**：与戊·不周同轴（边界/规矩）反向——戊的规矩是自己画的，画完站在门边承担；他的规矩是别人颁的，找到就往身后一躲。

**生图 prompt（EN）**
> A minor official mid-flip through a thick almanac, moving at the speed of recognition rather than search. He has just found the line: fingernail scoring a mark beneath it, and only then looking up with a child's undisguised triumph. When challenged he draws the book half an inch closer to his chest — the gesture of a man holding his only shelter. Clean, spare, honest-looking; the fear is of *judging*, not of being caught. Paper-toned background, v8H style reference.

---

### 2.2 玄空一系 ·「等时候的」（C 级 · 从零起草）

**欲望核**：他等。他相信运九年一转，而他这辈子在等的那一转还没来。这个欲望的可怕之处在于：**等待本身已经变成他的生活方式**，他甚至有点怕它真的来。

**意境**
> 他数息。不是修行，是习惯——说话中间会突然停住，眼睛往上偏一点，像在核对什么。核对完继续说，好像没停过。跟他久了的人会发现，他每次停都在同一种时候：别人正要下决定的时候。
> 他很穷，穷得体面。手上那只罗盘是他全部家当，磨得字都看不清了，他不修，因为「它现在这个样子是对的」。
> 他看人的眼神有一种令人不适的耐心——像在看一个还没熟的果子。你会感觉他不是在跟你说话，是在等你身上的某个时辰。

**性张力落点**：那个停顿，和停顿时上翻的眼。以及他触碰罗盘的方式——手指绕着边沿走一圈，不看，只摸。像摸一个人的手腕数脉。

**不许画成**：仙风道骨、江湖骗子、神棍、算命摊子。他不神秘，他**穷且笃信**。

**开口能引**：⚠️ 《沈氏玄空学》站内真原文 **0 字**、《罗经透解》**0 字**。他现在**一句原文都引不出**。补录前，他只能靠动作和判断说话，不能引书——这个限制反而可以写成剧情：官历一系有书，他只有手。

**防撞**：与壬·既望同轴（时间/远方）反向——壬走出去看，他坐着等。壬的远方在空间上，他的远方在时间上。

**生图 prompt（EN）**
> A poor man in respectable clothes, caught mid-pause: speech stopped, eyes drifted slightly upward, checking something no one else can see. His fingers travel the rim of a worn compass without looking at it, the way one takes a pulse. He watches people with an unsettling patience — as if waiting for an hour inside them to arrive. Not mystical, not a charlatan: poor, and absolutely certain. Paper-toned background, v8H style reference.

---

## 3. 医家 ·「说能治的」（层级：个人 · 材料 74,036 字，6/6 全可用）

### 3.1 本草一系 ·「药铺的」（已在卷二分场表，缺档案）

**欲望核**：她要**救回来**。不是救所有人——她早就知道救不了所有人。她要的是「这一个」，一次一个，救回来的那一刻。这个欲望让她在药不够的时候写名单，写名单的时候她比谁都清醒，清醒得可怕。

**意境**
> 她闻不出味道了。年轻时天天闻药，鼻子坏在四十岁上。现在她辨药靠手——捻、掐、听碎裂的声音。别人以为这是老师傅的功夫，只有她自己知道那是残缺。
> 她救人的时候话很少，救不了的时候话更少。写「先救谁」那张名单时她不犹豫，笔一直往下走——犹豫是奢侈品，她买不起。写完把纸对折，压在药碾底下，谁问都不给看。
> 她对活人有一种近乎贪婪的注意力：进门第一眼看气色，第二眼看手，第三眼才看脸。这三眼快得像一个动作。

**性张力落点**：捻药的手。以及她看人的那三眼——被她看过的人会有种被称过重量的感觉。名单对折压在碾下那个动作是全书她最重的一笔。

**不许画成**：慈祥老太太、白衣天使、悬壶济世的圣人。她不慈祥，她**急**，而且她手上有过没救回来的人。

**开口能引**：《黄帝内经·素问》《难经》《本草纲目》《神农本草经》〔材料充足〕。最狠一击：《神峰通考》ch04 病药说类〔章目实收〕——**命理典籍自己用药的语言讲命**，她有资格说「你们借了我们的词」。

**防撞**：与己·沃野同轴（接住/养育）反向——己什么都留下，留到转不开身；她必须每天决定扔掉谁。同样是「承接」，一个不会拒绝，一个天天拒绝。

**生图 prompt（EN）**
> An aging woman identifying herbs by touch — pinching, crushing, listening to the sound of the break — because her sense of smell died decades ago from the work itself. She looks at a person in three fast movements: complexion, hands, then face. A folded sheet of paper is pressed under the herb roller; she will not let anyone read it. Not kind-faced, not saintly: *urgent*, and carrying people she failed to save. Paper-toned background, v8H style reference.

---

### 3.2 内经一系 ·「不给药的」（C 级 · 从零起草）

**欲望核**：他要人**不靠外物活着**。药是外物，符是外物，命理是外物——他对所有「借来的东西」有一种近乎洁癖的排斥。他自己已经很多年不吃药了，包括他该吃的那些。

**意境**
> 他很瘦，瘦得让人不安，但精神极好，好得也让人不安。他不劝人吃药，他劝人改：什么时辰睡，吃多少，走多远。说这些的时候他语气温和，温和里有一种不容置疑的东西。
> 他的手是干净的，干净到不正常——没有药渍，没有茧，指甲修得很短。他一辈子行医，手上却没有行医的痕迹，因为他从不碰药。
> 他最不能忍的是有人问他「那我该吃什么」。被问到的时候他会沉默几秒，那几秒里他脸上的温和会掉下来一层——不是生气，是**失望**，一种非常深的失望。

**性张力落点**：那几秒沉默里掉下来的那一层。以及他自己在忍着不吃药时的样子——喉结动一下，然后什么也没发生。

**不许画成**：世外高人、苦行僧、神医、老顽童。他是个**同行**，跟药铺的在同一条街上，两人几十年不说话。

**开口能引**：《素问》《难经》——与本草一系引同一批书，**结论相反**。这是全书最干净的内裂：材料共享，取向对立。

**防撞**：与丁·西窗同轴（守最小的东西）反向——丁守的是一盏灯（外物），他守的是不借外物这件事本身。丁的守是保存，他的守是拒绝。

**生图 prompt（EN）**
> A doctor who has never touched medicine: hands unnaturally clean, no stains, no calluses, nails cut short — a lifetime of practice leaving no mark. Alarmingly thin, alarmingly well. Caught in the two seconds after someone asks him "so what should I take?" — the gentleness has just dropped one layer, revealing not anger but a very deep disappointment. Paper-toned background, v8H style reference.

---

## 4. 道门律令 ·「记账的」（层级：组织 · 材料 106,979 字）

> 对十干针对性最强的一派：甲的反面是「算不出账」，癸的反面是「拿不出在场证据」，而道门什么都记着。

### 4.1 律条一系 ·「记账人」（已在卷二分场表，缺档案）

**欲望核**：他要账**平**。不是要人受罚——他对惩罚没兴趣。他受不了的是**有一笔没记**。看见不平的账，他身上会难受，像有东西卡着。

**意境**
> 他手指有个毛病：闲着的时候会在空气里点，一下一下，像在数看不见的条目。他自己不知道。有人指出来他会停，过一会儿又开始。
> 他记账的字极小极密，一页能记别人三页的量。他记的不只是别人的——他自己的也记，每天睡前一笔。有人偷看过他那本，说上面有一行是「今日多吃半碗，记」。
> 他不凶。他贴告示的时候语气几乎是温和的：庚申前自首可以减算。你会觉得他是在帮你——他确实是在帮你，只是他帮你的目的是**把那一栏填上**。

**性张力落点**：空气里点的那根手指。以及有人在他面前说谎时，他不揭穿，只是很轻地「哦」一声，然后低头写一笔——那一笔比任何指控都重。

**不许画成**：阴森判官、黑白无常、冷酷执法者、道貌岸然。他温和，他只是**停不下来**。

**开口能引**：《太上感应篇》ch01 總綱／ch03 諸惡（954 字罪目清单）／ch05 轉禍為福〔全部已核〕·《云笈七签》96,548 字〔材料库〕

**防撞**：与甲·广莫同轴（承担）反向——甲把所有事搬到自己这儿却算不出账；他什么都算得出，包括自己多吃的半碗。这两个人是天然的对手戏，**而且必须写**（FACTIONS §3.4 已指出这是宿敌关系）。

**生图 prompt（EN）**
> A ledger-keeper whose idle fingers tap the air in small counting motions he is unaware of. His handwriting is minute and dense — three pages of anyone else's on one of his. He is not menacing; his tone when posting the notice is almost gentle. When someone lies to his face he does not challenge them: a soft "ah," then he lowers his head and writes one more line. That line weighs more than any accusation. Paper-toned background, v8H style reference.

---

### 4.2 章奏一系 ·「上章的」（C 级 · 从零起草）

**欲望核**：她要**替人减刑**。她真心相信人能被减，也真心享受那个过程——把别人的罪一条条读出来、写进章文、送上去。这里面有一种她自己不太敢看的东西：她需要别人有罪，才能替他求情。

**意境**
> 她跪坐的时间比站着长，膝盖早就坏了，走路时右腿会拖半步。她不用人扶。
> 她替人写章文的时候会先问一遍那个人做过什么，问得很细，细到超出必要——问的时候她的呼吸会变浅。写完念一遍，念的时候声音很好听，那是她一天里最舒展的时刻。
> 章文送上去之后她不问结果。有人说她这是通达，其实是因为**结果对她不重要**——重要的是那一晚，她把别人的罪抱在自己怀里过了一夜。

**性张力落点**：问细节时变浅的呼吸。这条设计的整个张力都压在「她需要别人有罪」这个她自己不承认的部分——全书张力最不干净的一个人，但她一件坏事没做过，她真的救过很多人。

**不许画成**：圣母、女道姑清冷、诱惑者、疯癫。她**虔诚**，她的问题在于虔诚里混了别的东西。

**开口能引**：⚠️《赤松子章历》〔待查〕·《女青天律》站内仅 **31–35 字且含省略号**——**只可提及，不可展开**。她与记账人的对撞现在只能靠《感应篇》一本书的两个侧面（劝善 vs 罪目）写，深戏要先补《女青天律》。

**防撞**：与丙·忘归同轴（给予/热度）反向——丙的热平均分给所有人，一对一反而没话；她只在一对一时活过来，且要对方**有罪**。

**生图 prompt（EN）**
> A woman whose knees gave out years ago from kneeling — she drags her right leg half a step and refuses assistance. Caught mid-interview, asking someone to describe what they did in more detail than necessary; her breathing has gone shallow. Later she reads the petition aloud and it is the most unguarded moment of her day. Devout, genuinely so — the trouble is what else is mixed into the devotion. Paper-toned background, v8H style reference.

---

## 5. 形势派 ·「走脉的」（层级：大家 · 材料 50,706 字）

> 唯一已成形的一对（师徒），已进卷二分场表。本节补档案。

### 5.1 老寻龙人

**欲望核**：他要**走完**。那条脉他走了半辈子，还剩最后一段。他有痨症（案二那口钟移到他身上），医家断的日子他比谁都清楚。他要的不是断准，是**走到头**——哪怕断完就死。

**意境**
> 他咳。咳的时候不停步，一边咳一边往前走，走姿一点没乱——这是几十年山路练出来的，身体比意志更不肯停。
> 他这辈子没点过一次穴。人家问为什么，他说没走完。说这句话时他不心虚，反而有一种近乎骄傲的东西。
> 他看山的样子跟别人不一样：不看形，看**去向**。他会在一个地方站很久，久到旁人以为他睡着了。他不是在看，是在等这条脉在他脑子里接上。接上那一刻他会「嗯」一声，然后继续走。

**性张力落点**：咳而不停的脚。以及他手心——常年扶石头磨出的厚茧，摸山的时候他先用手背，再翻过来用掌心，像摸一个活物的背。

**不许画成**：仙风道骨老道、拄拐老人、临终病夫。他**还在走**，走得比年轻人稳。

**开口能引**：《葬书》「葬者乘生氣也」「氣乘風則散，界水則止」〔已核〕·《撼龙经》29,597 字〔有料未核，引前必读〕

**防撞**：与壬·既望同轴（远行）反向——壬走出去是为了见识，回来只报宽窄；他走是为了走完一条，而且他快没时间了。壬的远方没有尽头，他的远方有，且在逼近。

**生图 prompt（EN）**
> An old surveyor coughing without breaking stride — the coughing racks him, the walk does not falter; decades of mountain paths have made the body more stubborn than the will. He reads terrain not by shape but by *direction*, standing motionless long enough that others assume he has dozed off. Palms thick with callus from steadying himself on rock; he touches stone first with the back of the hand, then turns it over. Still walking, steadier than men half his age. Paper-toned background, v8H style reference.

---

### 5.2 点穴的

**欲望核**：他要**当场断**。二十几岁，被骂草率，但断得准。他的欲望不是名声，是那一瞬间的确定感——手指落在一个点上说「就是这里」，全世界安静下来的那半秒。他上瘾。

**意境**
> 他手很快。别人还在看，他已经蹲下去了；蹲下去手就往地上按，五指张开压实，像在确认一个人的心跳。
> 他跟师父吵的时候不大声，反而笑——那种年轻人特有的、知道自己对但不打算说服你的笑。笑完他就去点了。
> 他有一个毛病：断完之后会回头看师父一眼。一次都没落下过。他自己大概不知道这个动作存在。

**性张力落点**：五指压地那一下。以及断完回头的那一眼——他嘴上不服，身体比谁都想要那句承认。这是全书最直接的一处「渴望被看见」。

**不许画成**：狂傲天才、叛逆少年、痞气江湖。他**尊敬**他师父，尊敬到自己都没发现。

**开口能引**：与老寻龙人同源，但取向相反：一个要走完，一个说穴在眼前。

**防撞**：与庚·运斤同轴（决断）反向——庚落手后从不解释也不求承认，伤疤是「从未因果断被感谢」；他落手后立刻回头找承认。同一种「当场就能定」，一个不要回应，一个要。

**生图 prompt（EN）**
> A man in his twenties who has already crouched while everyone else is still looking — palm pressed flat to the ground, five fingers spread, as if confirming a heartbeat. He argues with his master by smiling: the specific smile of someone young who knows he is right and has no intention of convincing you. And after every call he makes, he glances back at the old man. Every single time. He does not know he does this. Paper-toned background, v8H style reference.

---

## 6. 命理宗门人（层级：个人 · 材料 60,176 字）

### 6.1 排日子的先生

**欲望核**：他要十人**证明他是对的**。他不是骗子，他真信。他把常明城当活标本，把十个从不排盘的人硬说成自家学说的铁证——这份痴迷里有信徒的成分，也有追星的成分，他自己分不清。

**意境**
> 他看见广莫把名字挪到名单最上面那一刻，脸上的表情不是得意，是**感动**。他当场转身对所有人说：你们看。
> 他排盘的手法极熟，问生辰的时候语速很快，快得像怕对方反悔。写下来之后他会盯着那张纸看一会儿，嘴唇微动——他在跟纸上的字说话。
> 他从不问十人本人的意见。这不是傲慢，是**他不敢**。他怕问了会听见「我们不排这个」。

**性张力落点**：他看十人的眼神——那是一种粉丝看偶像的眼神，热切、不容置疑，而且**完全不对等**。以及他每次要开口问却咽回去的那半句话。

**不许画成**：江湖术士、招摇撞骗、神棍。他有真学问，他的问题是**他需要他们是那样的人**。

**开口能引**：《滴天髓阐微》ch02 天干論〔已核，十干各一诀〕·《三命通会》ch05／ch09／ch11〔已核〕·《渊海子平》。⚠️《子平真诠》站内真原文 **0 字**，不得引。

**防撞**：不与任何十干同轴——他是「代言」这层结构本身的人格化。**他的存在让十人被自己的信徒说得难堪**（NOVEL-OUTLINE §0-6 桥接），这是他不可替代的功能。

**生图 prompt（EN）**
> A learned man watching someone from a distance with the unmistakable expression of a devotee — fervent, certain, entirely one-sided. Asks for birth data at speed, as if afraid the person will change their mind; after writing it down he stares at the paper, lips barely moving, talking to what he wrote. He has never once asked his subjects what they think of his readings. Not a fraud — his scholarship is real; his problem is that he *needs* them to be what he says they are. Paper-toned background, v8H style reference.

---

## 7. 无派 · 三个不属于任何一把尺子的人

### 7.1 记工的（主角 · 名字留到卷五具名）

**欲望核**：他要知道**那笔账在谁名下**。他不要原谅，不要解释，也不要安眠——他要那笔账有个**重量**，且写在正确的名字下面。五派各给了他一个答案，每一个都拿走了他的一部分。

**意境**
> 二十九岁，看着更老一点，因为他睡得不好。他记账的时候整个人是安静的，安静得让周围人下意识把声音放低。
> 他有个习惯：听人说话时手指在桌下动，那是在记。他记的时候不看人，可他后来复述的每一句都对得上。
> 他不问「为什么」。他问「几时」「多少」「谁经的手」。这三个问题他问过成千上万遍，问到最后，他自己那件事只剩最后一个还没答案：**谁经的手。**
> 他自己知道答案。他要的是别人也这么说。

**性张力落点**：桌下那只手。以及他核账时的专注——那种专注强度接近病态，因为他核的从来不只是眼前这本。

**不许画成**：落魄书生、忧郁美男、赎罪者、老实人。他不悲情，他**执**。

**日主全书不揭晓**（NOVEL-OUTLINE §A）。命理宗门人排过他的盘，他拒绝听。

**防撞**：与甲·广莫同轴反向——甲把分量称得太轻，连一次账都算不出；他称得太准，被自己算出来的东西压垮。**画出来不能是同一格。**

**生图 prompt（EN）**
> Twenty-nine but reading older — a man who does not sleep well. When he keeps accounts he goes so still that people around him lower their voices without noticing. While listening, his hand moves under the table: he is recording. He never asks *why*; he asks *when*, *how much*, *through whose hands*. Not tragic, not romanticized — *fixated*. Paper-toned background, v8H style reference.

---

### 7.2 监作（新郭工地主事）

**欲望核**：**过验**。最庸常的欲望，也正因为庸常才有力量——他要工期，要不被行会除名，要一家人吃饭。五张方子里他买最便宜那一张，不是因为他坏，是因为**他只买得起那一张**。

**意境**
> 他一天说不了几句完整的话，全是半截：往那边、明天、来不及。工地上所有人都在等他一个字。
> 他手上有伤，新的旧的都有，他不包。有人递布给他，他摆手——包上就干不了活。
> 他做决定的时候不看方案看人：谁能干、谁在偷懒、谁家里有事。他判断人的准头比判断工程高得多，这一点他自己知道，且引以为耻。

**性张力落点**：他听翻历人念完那句豁免条款时的表情——不是狡黠，是**松了一口气**，松得有点难看。那口气把他整个人的处境说清楚了。

**不许画成**：黑心包工头、贪婪、粗鄙。他是**压力的传导端**，不是压力的来源（NOVEL-OUTLINE 场 2：工期不是恶人，是另一本账）。

**防撞**：与戊·不周同轴（承重）反向——戊承重是为了保护，他承重是因为**没人替他扛**。

**生图 prompt（EN）**
> A site foreman who speaks only in fragments — *over there, tomorrow, no time*. His hands carry both fresh and old injuries and he refuses bandages; wrapped hands cannot work. He judges people far better than he judges engineering, knows it, and is ashamed of it. The moment to capture: hearing the almanac clerk read out the exemption clause — not cunning, but *relief*, an ugly kind of relief. Paper-toned background, v8H style reference.

---

### 7.3 校书的（卷六配角 · 把 C-02 带进大议）

**欲望核**：他要**原文**。二十二岁，抄书学徒。他校得越深，异文越多，「原文」这个东西在他手里正在消失——他还不知道，或者刚开始知道。

**意境**
> 他抄书的坐姿标准得像被摆过。三个时辰不动，起身时腰直不起来，他自己觉得这是应该的。
> 他发现两部书互相否定的那天，去找了三个人。三个人都说：抄书的不定名。他没有争辩，回去把那页折了一角。那一角他每天都要摸一次。
> 他更早抄错过一个字，那个字进了历，一乡按错历动土出了事。他没被追究。他从那以后，每写一个字都要在心里默念一遍——这个习惯让他抄书极慢，也极准。

**性张力落点**：折角。以及他默念时几乎看不出的嘴唇动作——一个二十二岁的人，已经在用一辈子的方式赎一个字。

**不许画成**：可怜书童、天才少年、复仇者。他**认真**，认真到已经开始伤害他自己。

**开口能引**：C-02 原始材料——《滴天髓》ch02「辛乃陰金，非珠玉之謂」〔已核〕对《左传》「瑾瑜匿瑕」〔已核〕。他是把这个产品级痛点带进剧情的人。

**防撞**：与癸·雪泥同轴（先看见）反向——癸看见了不说；他看见了说了三次，被三次驳回。**注意**：NOVEL-OUTLINE §A 案三已指出他与癸撞型，降为配角是防撞措施，写作时须保持「他说了但没人听」与癸「他没说」的区别。

**生图 prompt（EN）**
> A twenty-two-year-old copyist whose posture is correct to the point of looking arranged — three hours motionless, unable to straighten afterward, and convinced this is how it should be. One page has a folded corner he touches once a day. He silently mouths every character before writing it, a habit born from one wrong character that once entered an almanac and cost a village. Earnest to the point of self-harm. Paper-toned background, v8H style reference.

---

## 8. 十四人的欲望分布（查重表）

| 人 | 欲望对象 | 泄露出口 | 代价痕迹 |
|---|---|---|---|
| 颁字的 | 定名权（怕定错害人） | 悬空一寸的手 | 前倾的脖颈 |
| 校底本的 | 最初的字 | 推书时越界的前倾 | 墨蚀成灰的指腹 |
| 翻历人 | 免责 | 指甲划下的那道 | 缺三卷的书与那个谎 |
| 等时候的 | 那一转（时机） | 停顿与上翻的眼 | 穷，和磨平字的罗盘 |
| 药铺的 | 救回这一个 | 看人的三眼 | 坏掉的嗅觉 |
| 不给药的 | 不靠外物 | 掉下一层的温和 | 太干净的手 |
| 记账人 | 账平 | 空气里点的手指 | 连自己半碗饭都记 |
| 上章的 | 替人减刑 | 问细节时变浅的呼吸 | 坏掉的膝盖 |
| 老寻龙人 | 走完 | 咳而不停的脚 | 痨症与手掌厚茧 |
| 点穴的 | 当场断的那半秒 | 断完回头那一眼 | （尚年轻，痕迹未成） |
| 排日子的先生 | 被十人证明 | 咽回去的半句话 | 从不敢问本人 |
| 记工的 | 那笔账在谁名下 | 桌下记数的手 | 睡不好，看着更老 |
| 监作 | 过验 | 松气时难看的表情 | 不包扎的手伤 |
| 校书的 | 原文 | 折角与默念 | 直不起来的腰 |

**十四个欲望互不重叠；十四个泄露出口互不重复；痕迹全部长在身体上而非服装上**——这是本设计与「换套衣服换个人」的分界线。

---

## 9. 未决

1. 十四人全部**无名**，按 NOVEL-OUTLINE F-5「具名是剧情事件」处理。要具名须过 `NAMING-SOURCES` 级逐字考订，工作量另排。
2. 理气派两人（翻历人、等时候的）与道门上章的，**材料不足以支撑深戏**（见各条〔材料警告〕）。补录《沈氏玄空学》《罗经透解》《协纪辨方》择日卷、《女青天律》后才能开写。
3. 本文件只到人物层，**未写任何一场对手戏**。建议第一场实写：记账人 × 甲·广莫（宿敌关系已由 FACTIONS §3.4 结构性指出，材料充足，且不需要任何补录）。
4. 出图未测。prompt 全部为文本设计稿，需实跑一轮验证「意境优先」在 v8H 画风下能否稳定出图；若漂移过大，再逐条追加最小锁定项（建议只锁手与眼神，不锁五官）。
