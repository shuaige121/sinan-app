/* SPDX-License-Identifier: LicenseRef-Sinan-Characters-Stories-ARR */
/* 常明城十干人物系统：数据、关系与完整叙事场景资产协议。 */
(function (global) {
  'use strict';

  const HUMAN_ROOT = 'img/ten-archetypes/human/';
  const V8_ROOT = HUMAN_ROOT + 'v8/';
  const V9_ROOT = HUMAN_ROOT + 'v9/';
  const V10_ROOT = HUMAN_ROOT + 'v10/';
  const COMIC_BASE = HUMAN_ROOT + 'v7/comics/';
  const HERO_FOCUS = Object.freeze({
    'jia-wood': '40% 50%', 'yi-wood': '50% 50%', 'bing-fire': '40% 50%', 'ding-fire': '50% 50%',
    'wu-earth': '39% 50%', 'ji-earth': '43% 50%', 'geng-metal': '43% 50%', 'xin-metal': '43% 50%',
    'ren-water': '38% 50%', 'gui-water': '40% 50%'
  });
  const visualSet = slug => Object.freeze({
    asset: V8_ROOT + 'portraits/' + slug + '.png',
    portrait: V8_ROOT + 'portraits/' + slug + '.png',
    fullBody: V8_ROOT + 'full-body/' + slug + '.png',
    background: V8_ROOT + 'backgrounds/' + slug + '.webp',
    heroScene: V9_ROOT + 'heroes/' + slug + '-city-v1.webp',
    heroFocus: HERO_FOCUS[slug] || '50% 50%'
  });
  const poseSet = slug => Object.freeze({
    identity: V8_ROOT + 'portraits/' + slug + '.png',
    story: V8_ROOT + 'full-body/' + slug + '.png',
    open: V8_ROOT + 'full-body/' + slug + '.png'
  });
  const STEM_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const ELEMENT_ORDER = ['木', '火', '土', '金', '水'];
  const ELEMENT_STEMS = {
    木: ['甲', '乙'], 火: ['丙', '丁'], 土: ['戊', '己'], 金: ['庚', '辛'], 水: ['壬', '癸']
  };
  const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const CONTROLS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  const GENERATED_BY = Object.fromEntries(Object.entries(GENERATES).map(([a, b]) => [b, a]));
  const CONTROLLED_BY = Object.fromEntries(Object.entries(CONTROLS).map(([a, b]) => [b, a]));
  const BRANCH_MAIN_STEM = Object.freeze({
    子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙',
    午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬'
  });
  const STEM_COMBINES = Object.freeze({ 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' });
  const STEM_CLASHES = Object.freeze({ 甲: '庚', 庚: '甲', 乙: '辛', 辛: '乙', 丙: '壬', 壬: '丙', 丁: '癸', 癸: '丁' });
  const ELEMENT_SCENES = Object.freeze({
    木: V9_ROOT + 'relations/peer-wood-v1.webp',
    火: V9_ROOT + 'relations/peer-fire-v1.webp',
    土: V9_ROOT + 'relations/peer-earth-v1.webp',
    金: V9_ROOT + 'relations/peer-metal-v1.webp',
    水: V9_ROOT + 'relations/peer-water-v1.webp'
  });
  const RELATION_SCENES = Object.freeze(Object.fromEntries(STEM_ORDER.map(stem => {
    const slug = ({ 甲: 'jia', 乙: 'yi', 丙: 'bing', 丁: 'ding', 戊: 'wu', 己: 'ji', 庚: 'geng', 辛: 'xin', 壬: 'ren', 癸: 'gui' })[stem];
    const suffixes = {
      甲: { output: 'output-fire', source: 'source-water', control: 'control-earth', pressure: 'pressure-metal' },
      乙: { output: 'output-fire-trio', source: 'source-water', control: 'control-earth', pressure: 'pressure-metal' },
      丙: { output: 'output-earth', source: 'source-wood', control: 'control-metal', pressure: 'pressure-water' },
      丁: { output: 'output-earth', source: 'source-wood', control: 'control-metal', pressure: 'pressure-water' },
      戊: { output: 'output-metal', source: 'source-fire', control: 'control-water', pressure: 'pressure-wood' },
      己: { output: 'output-metal', source: 'source-fire', control: 'control-water', pressure: 'pressure-wood' },
      庚: { output: 'output-water', source: 'source-earth', control: 'control-wood', pressure: 'pressure-fire' },
      辛: { output: 'output-water', source: 'source-earth', control: 'control-wood', pressure: 'pressure-fire' },
      壬: { output: 'output-wood', source: 'source-metal', control: 'control-fire', pressure: 'pressure-earth' },
      癸: { output: 'output-wood', source: 'source-metal', control: 'control-fire', pressure: 'pressure-earth' }
    }[stem];
    return [stem, Object.freeze(Object.fromEntries(Object.entries(suffixes).map(([key, suffix]) => [key, `${V9_ROOT}relations/${slug}-${suffix}-v1.webp`])))];
  })));
  const SPECIAL_SCENES = Object.freeze({
    '甲己': V9_ROOT + 'relations/jia-ji-combine-v1.webp',
    '乙庚': V9_ROOT + 'relations/yi-geng-combine-v1.webp',
    '丙辛': V9_ROOT + 'relations/bing-xin-combine-v1.webp',
    '丁壬': V9_ROOT + 'relations/ding-ren-combine-v1.webp',
    '戊癸': V9_ROOT + 'relations/wu-gui-combine-v1.webp',
    '甲庚': V9_ROOT + 'relations/jia-geng-clash-v1.webp',
    '乙辛': V9_ROOT + 'relations/yi-xin-clash-v1.webp',
    '丙壬': V9_ROOT + 'relations/bing-ren-clash-v1.webp',
    '丁癸': V9_ROOT + 'relations/ding-gui-clash-v1.webp'
  });

  const pairKey = (a, b) => STEM_ORDER.indexOf(a) < STEM_ORDER.indexOf(b) ? a + b : b + a;
  // 45 对均已人工视觉复核；pair key 与独立场景一一对应。
  const PAIR_SCENES = Object.freeze({
    甲乙: V10_ROOT + 'relations/jia-yi-v1.webp',
    甲丙: V10_ROOT + 'relations/jia-bing-v1.webp',
    甲丁: V10_ROOT + 'relations/jia-ding-v1.webp',
    甲戊: V10_ROOT + 'relations/jia-wu-v1.webp',
    甲己: V10_ROOT + 'relations/jia-ji-v1.webp',
    甲庚: V10_ROOT + 'relations/jia-geng-v1.webp',
    甲辛: V10_ROOT + 'relations/jia-xin-v1.webp',
    甲壬: V10_ROOT + 'relations/jia-ren-v1.webp',
    甲癸: V10_ROOT + 'relations/jia-gui-v1.webp',
    乙丙: V10_ROOT + 'relations/yi-bing-v1.webp',
    乙丁: V10_ROOT + 'relations/yi-ding-v1.webp',
    乙戊: V10_ROOT + 'relations/yi-wu-v1.webp',
    乙己: V10_ROOT + 'relations/yi-ji-v1.webp',
    乙庚: V10_ROOT + 'relations/yi-geng-v1.webp',
    乙辛: V10_ROOT + 'relations/yi-xin-v1.webp',
    乙壬: V10_ROOT + 'relations/yi-ren-v1.webp',
    乙癸: V10_ROOT + 'relations/yi-gui-v1.webp',
    丙丁: V10_ROOT + 'relations/bing-ding-v1.webp',
    丙戊: V10_ROOT + 'relations/bing-wu-v1.webp',
    丙己: V10_ROOT + 'relations/bing-ji-v1.webp',
    丙庚: V10_ROOT + 'relations/bing-geng-v1.webp',
    丙辛: V10_ROOT + 'relations/bing-xin-v1.webp',
    丙壬: V10_ROOT + 'relations/bing-ren-v1.webp',
    丙癸: V10_ROOT + 'relations/bing-gui-v1.webp',
    丁戊: V10_ROOT + 'relations/ding-wu-v1.webp',
    丁己: V10_ROOT + 'relations/ding-ji-v1.webp',
    丁庚: V10_ROOT + 'relations/ding-geng-v1.webp',
    丁辛: V10_ROOT + 'relations/ding-xin-v1.webp',
    丁壬: V10_ROOT + 'relations/ding-ren-v1.webp',
    丁癸: V10_ROOT + 'relations/ding-gui-v1.webp',
    戊己: V10_ROOT + 'relations/wu-ji-v1.webp',
    戊庚: V10_ROOT + 'relations/wu-geng-v1.webp',
    戊辛: V10_ROOT + 'relations/wu-xin-v1.webp',
    戊壬: V10_ROOT + 'relations/wu-ren-v1.webp',
    戊癸: V10_ROOT + 'relations/wu-gui-v1.webp',
    己庚: V10_ROOT + 'relations/ji-geng-v1.webp',
    己辛: V10_ROOT + 'relations/ji-xin-v1.webp',
    己壬: V10_ROOT + 'relations/ji-ren-v1.webp',
    己癸: V10_ROOT + 'relations/ji-gui-v1.webp',
    庚辛: V10_ROOT + 'relations/geng-xin-v1.webp',
    庚壬: V10_ROOT + 'relations/geng-ren-v1.webp',
    庚癸: V10_ROOT + 'relations/geng-gui-v1.webp',
    辛壬: V10_ROOT + 'relations/xin-ren-v1.webp',
    辛癸: V10_ROOT + 'relations/xin-gui-v1.webp',
    壬癸: V10_ROOT + 'relations/ren-gui-v1.webp'
  });

  // 三人同框不是把三张立绘并排摆放，而是让三个人在同一件事里承担不同作用。
  // 先保留一张经过人物身份与黑发检查的样板；后续可按同一数据协议继续扩充。
  const GROUP_STORIES = Object.freeze([
    Object.freeze({
      key: 'jia-yi-gui',
      stems: Object.freeze(['甲', '乙', '癸']),
      scene: V10_ROOT + 'groups/jia-yi-gui-v1.webp',
      titleZh: '雨后，把桥重新接起来',
      titleEn: 'Rebuilding the Bridge After Rain',
      storyZh: '暴雨压断了桥边的旧木。甲抬起最重的一端，乙把藤蔓编进裂缝，癸将雨水引向新根。三个人做的是同一件事，却没有谁能替代另外两个人。',
      storyEn: 'A storm breaks the old timber by the bridge. Jia lifts the heaviest end, Yi weaves vines through the crack, and Gui guides rainwater to the new roots. They solve one problem in three different, irreplaceable ways.'
    })
  ]);

  // 45 对人物各有一个共同事件；从 A 看 B 与从 B 看 A 共用画面，但关系称谓按观看方向计算。
  const PAIR_STORIES = Object.freeze({
    甲乙: { titleZh: '雨停后的温室', titleEn: 'The Greenhouse After Rain', storyZh: '旧梁在风雨里倾斜，甲撑住承重的一端，乙从裂缝里引出一条新路。一个让结构不倒，一个让结构不必只剩原来的走法。', storyEn: 'A storm bends the old greenhouse frame. Jia holds the load while Yi guides a new route through the crack—one keeps the structure standing, the other keeps it from having only one way forward.' },
    甲丙: { titleZh: '让所有人看见这条路', titleEn: 'Make the Route Visible', storyZh: '甲把临时栈桥撑到能走，丙登上高台点亮沿线的灯。没有前者，路立不住；没有后者，没人知道现在可以出发。', storyEn: 'Jia braces a temporary bridge; Bing lights its full length from the tower. Without the first, the route cannot stand. Without the second, no one knows it is time to move.' },
    甲丁: { titleZh: '楼梯与信号灯', titleEn: 'The Stair and the Signal', storyZh: '停电后甲守住摇晃的检修梯，丁在最高一级重接那盏信号灯。甲负责让人抵达，丁负责让远处的人知道这里仍然有人。', storyEn: 'After the blackout, Jia steadies the service stair while Ding reconnects its highest signal lamp. Jia makes arrival possible; Ding lets the distant city know someone is still here.' },
    甲戊: { titleZh: '门该开到哪里', titleEn: 'How Far the Gate Opens', storyZh: '根系顶到北堤时，甲要继续向前，戊只肯开一道刚好能呼吸的门。两人争的不是输赢，而是生长与边界各该退让多少。', storyEn: 'When roots reach the north dike, Jia wants to continue while Wu opens only enough room to breathe. They are not fighting to win, but measuring how much growth and boundary must each yield.' },
    甲己: { titleZh: '地基不是一个人的', titleEn: 'No One Builds the Foundation Alone', storyZh: '甲把结构立起，己让散开的土一层层接住重量。最后出现的不是树或田，而是一块两个人都能继续往上建的地基。', storyEn: 'Jia raises the structure while Ji settles loose earth beneath its weight. What appears is neither tree nor field, but a foundation both can keep building on.' },
    甲庚: { titleZh: '正确的那一刀', titleEn: 'The Cut That Was Right', storyZh: '火线逼近时，庚砍掉甲亲手种下的第一片林，隔离带救了整座城。甲知道那一刀没有错，也正因如此，连责怪都找不到位置。', storyEn: 'As fire approaches, Geng cuts down Jia’s first grove and saves the city. Jia knows the cut was right, which leaves even blame with nowhere to go.' },
    甲辛: { titleZh: '立柱前的最后一毫米', titleEn: 'The Last Millimeter', storyZh: '甲已经把塔架推到起吊线，辛却在底座看见一毫米的偏差。甲停下整个队伍，辛也第一次在误差尚未归零时说：修到这里，可以立。', storyEn: 'Jia has the tower ready to lift when Xin finds a one-millimeter error at its base. Jia stops the crew; Xin, for once before reaching zero error, says: corrected enough—raise it.' },
    甲壬: { titleZh: '桥要跟着水走', titleEn: 'A Bridge That Moves with Water', storyZh: '旧桥被洪水托离桥墩，甲想把它重新钉死，壬却拉着整段桥身顺流转向。最后留下的是一座会随水位起落的桥。', storyEn: 'Floodwater lifts an old bridge from its piers. Jia wants it fixed in place; Ren turns the whole span with the current. They leave behind a bridge that rises and falls with the water.' },
    甲癸: { titleZh: '第一滴落在根上', titleEn: 'The First Drop Reaches the Root', storyZh: '甲只看见整片林仍然站着，癸却听见一滴水落在空心根部。两人挖开表土，才发现真正的问题早已从最小的声音开始。', storyEn: 'Jia sees a forest still standing; Gui hears one drop strike a hollow root. They open the soil and find that the real problem began with the smallest sound.' },
    乙丙: { titleZh: '把缝隙照成一条路', titleEn: 'Light Turns a Gap into a Route', storyZh: '温室高桥断开后，乙用藤蔓把裂口重新编成可走的路，丙推开整排百叶，让夕光落在新的节点上。一个找到路，一个让所有人敢走。', storyEn: 'After the greenhouse bridge breaks, Yi weaves its gap into a route and Bing opens the shutters so sunset lands on the new joint. One finds the way; the other gives everyone the courage to use it.' },
    乙丁: { titleZh: '停电以后的一盏灯', titleEn: 'One Lamp After the Blackout', storyZh: '积水漫进维护道，乙引藤排开流向，丁跪在继电箱旁守住唯一的信号灯。没有轰鸣，只有两个人让一条暗道重新可以通行。', storyEn: 'Water enters the maintenance tunnel. Yi redirects it with vine while Ding protects the only signal lamp beside the relay. Without spectacle, they make the dark passage usable again.' },
    乙戊: { titleZh: '墙愿意成为架子', titleEn: 'When a Wall Becomes a Trellis', storyZh: '乙沿着旧墙找了很久的缝，戊没有把裂口补死，而是在那里加了一道承重架。藤终于有路，墙也没有失去边界。', storyEn: 'Yi searches an old wall for a gap. Wu does not seal it, but reinforces it into a trellis. The vine gains a route and the wall keeps its boundary.' },
    乙己: { titleZh: '换一块土继续长', titleEn: 'New Soil, Continued Growth', storyZh: '乙的根在旧盆里绕成死结，己一根根松开，再把它移进更大的育苗床。被接住不是停留，而是终于有地方继续改变。', storyEn: 'Yi’s roots knot inside an old pot. Ji loosens each one and moves the plant into a wider bed. Being held does not mean being kept still; it means having room to change.' },
    乙庚: { titleZh: '砍不动的形状', titleEn: 'A Shape the Blade Cannot Cut', storyZh: '庚的刀每次落下，乙都顺着刀背改道；乙每次缠回，庚又把力量收得更准。到天亮时，两种相反的动作锁成了一座新桥。', storyEn: 'Each time Geng’s blade falls, Yi bends along its back; each time Yi returns, Geng narrows the force. By dawn their opposing movements have locked into a new bridge.' },
    乙辛: { titleZh: '藤与剪', titleEn: 'Vine and Shears', storyZh: '辛剪掉一处不合标准的枝叶，乙便从另一处重新长出。两人让彼此看见边界，却都不知道下一次相遇会是修剪还是改道。', storyEn: 'Xin trims what falls outside the standard; Yi grows back elsewhere. Each reveals the other’s boundary, and neither knows whether the next meeting means pruning or rerouting.' },
    乙壬: { titleZh: '水上没有画好的路', titleEn: 'No Route Drawn on Water', storyZh: '渡口被淹后，壬推来一整片流动的水面，乙把漂散的绳索逐段连成引路线。一个打开范围，一个让范围变成可以抵达的路径。', storyEn: 'After the ferry floods, Ren brings an open field of moving water while Yi links drifting ropes into a guide line. One opens the range; the other makes it traversable.' },
    乙癸: { titleZh: '沿着水痕找出口', titleEn: 'Following the Watermark Out', storyZh: '癸在砖缝里标出每一处渗水，乙沿着那些细小水痕把藤送到墙外。两个都不抢声音的人，合力找到了最安静的出口。', storyEn: 'Gui marks every seep between the bricks; Yi follows those traces and carries a vine outside. Two quiet people find the quietest exit together.' },
    丙丁: { titleZh: '换班以后', titleEn: 'After the Shift Changes', storyZh: '丙把全城的灯一次点亮，确认人群重新行动后离开高台；丁随后逐盏检查，把最容易熄灭的那一盏留到最后。热闹和长久需要不同的人。', storyEn: 'Bing lights the whole city and leaves once the crowd moves again. Ding follows lamp by lamp, saving the most fragile for last. Momentum and endurance need different people.' },
    丙戊: { titleZh: '火停在哪里', titleEn: 'Where the Fire Stops', storyZh: '丙要把炉温推到整条街都醒来，戊则站在防火门边，一格一格划出不能越过的线。光得以扩散，也没有吞掉回去的路。', storyEn: 'Bing raises the furnaces until the street wakes; Wu marks the line the heat cannot cross. Light spreads without consuming the way home.' },
    丙己: { titleZh: '霜夜里的育苗床', titleEn: 'The Nursery on a Frost Night', storyZh: '寒潮压进南区，丙把余热送进温室，己用土床把热一点点留住。天亮时没有奇迹，只有一排没被冻坏的新芽。', storyEn: 'Cold enters the south district. Bing brings the remaining heat; Ji holds it in the nursery soil. By dawn there is no miracle, only a row of seedlings that survived.' },
    丙庚: { titleZh: '炉门必须现在打开', titleEn: 'The Furnace Door Opens Now', storyZh: '炉压越过红线，丙还在维持全厂动力，庚冲到近前一刀切断卡死的锁链。一个不让系统停，一个承担必须停掉哪一段。', storyEn: 'Furnace pressure crosses the red line while Bing keeps the works alive. Geng cuts the jammed chain—one prevents total darkness, the other decides what must stop.' },
    丙辛: { titleZh: '熔成一面水', titleEn: 'Melted into a Reflective Surface', storyZh: '辛守着必须完美的弧面，丙用持续的热让金属终于可以改变。火没有烧毁标准，标准也没有冻住火；两人一起得到一面能映出人的镜。', storyEn: 'Xin protects a perfect curve while Bing’s sustained heat makes change possible. Fire does not destroy the standard, and the standard does not freeze the fire; together they make a mirror that can hold a face.' },
    丙壬: { titleZh: '日与洪', titleEn: 'Sun and Flood', storyZh: '丙在广场亮起集结信号，壬却从北门推来必须撤离的洪水。一个把人叫来，一个逼人离开；他们彼此明白，却不能同时留下。', storyEn: 'Bing lights the gathering signal as Ren drives evacuation water through the north gate. One calls people in, the other sends them out. They understand each other and cannot both remain.' },
    丙癸: { titleZh: '雨幕里的信号', titleEn: 'A Signal Through Rain', storyZh: '丙把远处都能看见的信号打上塔顶，癸发现雨水正从镜片边缘渗入。一个维持亮度，一个擦掉足以让整束光偏离的一滴。', storyEn: 'Bing raises a signal visible across the city; Gui finds rain entering at the lens edge. One holds the brightness, the other removes the drop that could turn the whole beam aside.' },
    丁戊: { titleZh: '门边留一盏灯', titleEn: 'Leave One Lamp by the Gate', storyZh: '戊封闭危险的旧通道，丁却坚持在门外留下一盏小灯。边界仍然成立，但迟到的人不会因此找不到回来的位置。', storyEn: 'Wu closes a dangerous passage; Ding insists on leaving one lamp outside. The boundary remains, but those arriving late will still know where to return.' },
    丁己: { titleZh: '把温度留到清晨', titleEn: 'Keep the Warmth Until Morning', storyZh: '丁守着夜里最后一只热源，己把育苗床一层层盖好。两个人都不制造喧闹，只让脆弱的东西平安熬过最冷的几个小时。', storyEn: 'Ding guards the last heat source while Ji layers the nursery beds. Neither makes a spectacle; they simply carry fragile life through the coldest hours.' },
    丁庚: { titleZh: '先照清楚，再落刀', titleEn: 'Light It Before the Cut', storyZh: '断梁压住唯一出口，丁把小灯贴近裂纹，庚顺着那条清楚的线只切一处。灯没有力量移开梁，却让力量没有伤到旁边的人。', storyEn: 'A broken beam blocks the only exit. Ding holds a lamp to the crack; Geng cuts only along the revealed line. The lamp cannot move the beam, but keeps force from striking anyone nearby.' },
    丁辛: { titleZh: '两个人守一格刻度', titleEn: 'Two People Guard One Mark', storyZh: '丁盯着灯色的变化，辛盯着压力表的一格偏移。直到两种细小异常同时出现，她们才关掉那台看起来仍在正常工作的机器。', storyEn: 'Ding watches the lamp color; Xin watches one mark on the gauge. Only when both small changes appear do they stop a machine that still looks normal.' },
    丁壬: { titleZh: '灯照见岸', titleEn: 'The Lamp Reveals the Shore', storyZh: '壬本可以带走所有灯火，却替丁挡住一阵迎面的风；丁只照亮很小的一段岸，壬因此知道今晚该在哪里停下。', storyEn: 'Ren could carry every flame away, yet shields Ding from the wind. Ding lights only a small shore, giving Ren somewhere to stop tonight.' },
    丁癸: { titleZh: '雨并不是故意的', titleEn: 'The Rain Did Not Mean To', storyZh: '癸照平常的路线落下，丁守了一夜的灯却在那一刻熄灭。没有恶意不等于没有造成伤害；两个人第一次都没有急着解释。', storyEn: 'Gui follows the usual path and extinguishes the lamp Ding guarded all night. No malice does not mean no harm; for once, neither rushes to explain.' },
    戊己: { titleZh: '该留下多少位置', titleEn: 'How Much Room to Leave', storyZh: '戊把仓门划出清楚的边界，己则为每一件无处可去的东西腾位置。两人在门口僵持到深夜，终于一起写下“能留下什么，也要写明何时离开”。', storyEn: 'Wu marks the warehouse boundary while Ji makes room for every unclaimed thing. By midnight they agree: what may stay must also have a time to leave.' },
    戊庚: { titleZh: '山腹只开这一口', titleEn: 'One Opening in the Mountain', storyZh: '庚要从山腹取出被困的设备，戊只允许一道不会伤到承重层的切口。果断被边界约束，边界也因行动不再只是封锁。', storyEn: 'Geng needs the equipment trapped inside the mountain; Wu permits one opening that will not damage the bearing layer. Action is bounded, and the boundary stops being mere obstruction.' },
    戊辛: { titleZh: '地基上的一条线', titleEn: 'One Line Across the Foundation', storyZh: '戊确认地面足以承重，辛却沿石缝拉出一条细线，指出重量将会偏向哪边。墙没有推倒，只在真正动工前挪了半步。', storyEn: 'Wu confirms the ground can carry the load; Xin traces one seam showing where it will lean. The wall is not demolished, only moved half a step before construction begins.' },
    戊壬: { titleZh: '给洪水一条路', titleEn: 'Give the Flood a Route', storyZh: '壬带来的水已经高过旧堤，戊没有继续加墙，而是关掉废口、打开新渠。水被迫改变形状，也因此没有变成灾难。', storyEn: 'Ren’s water rises over the old dike. Wu stops adding walls, closes the dead mouth and opens a new channel. The current changes shape and avoids becoming disaster.' },
    戊癸: { titleZh: '山缝里的热', titleEn: 'Warmth in the Mountain Crack', storyZh: '癸进入戊不愿承认的裂缝，深处却升起稳定的暖气。戊没有把缝填平，癸也不能再假装自己从未来过。', storyEn: 'Gui enters a crack Wu refuses to acknowledge, and steady warmth rises from within. Wu leaves it open; Gui can no longer pretend not to have been there.' },
    己庚: { titleZh: '车上最后留下三件东西', titleEn: 'The Three Things Left on the Cart', storyZh: '己把无人认领的东西装满整辆车，仍想再找一个地方收下；庚拔掉固定绳，只留下真正有人会回来取的三件。空出来的位置终于能救人。', storyEn: 'Ji fills a cart with unclaimed things and still searches for more room. Geng cuts the tie-down and keeps only three someone will return for. The cleared space can finally carry people.' },
    己辛: { titleZh: '受潮的种子要先挑出来', titleEn: 'The Damp Seeds Must Be Removed First', storyZh: '己愿意让每一粒种子都有土，辛却挑出已经受潮的那一小把。舍弃没有否定照料，反而让剩下的真正能够发芽。', storyEn: 'Ji wants soil for every seed; Xin removes the small handful already spoiled by damp. Discarding does not undo care—it gives the rest a real chance to grow.' },
    己壬: { titleZh: '让水在这里慢下来', titleEn: 'Let the Water Slow Here', storyZh: '壬带着急流穿过低地，己没有筑墙，只铺开一片能够吸水的湿地。水仍然向前，却第一次在伤到人之前慢了下来。', storyEn: 'Ren brings a fast current through the low ground. Ji builds no wall, only a wetland wide enough to receive it. The water continues, but slows before it can hurt anyone.' },
    己癸: { titleZh: '土记得每一滴雨', titleEn: 'Soil Remembers Every Drop', storyZh: '癸一滴滴标出雨从哪里来，己用不同深浅的土层留下它们经过的痕迹。下一场雨尚未来，排水的路线已经从旧痕里长出来。', storyEn: 'Gui marks where each drop arrives; Ji preserves its path in layers of soil. Before the next rain comes, a drainage route has already grown from the old traces.' },
    庚辛: { titleZh: '今天必须交付', titleEn: 'It Must Ship Today', storyZh: '庚怕来不及，辛怕不够好。船离港前，庚定下最后期限，辛只保留决定安全的三项校准；成品带着细小划痕，却真的驶了出去。', storyEn: 'Geng fears being late; Xin fears falling short. Before the ship leaves, Geng sets the final hour and Xin keeps only three safety-critical checks. The work carries a small scratch, but it sails.' },
    庚壬: { titleZh: '切开一条新河', titleEn: 'Cut a New River', storyZh: '壬的水挤满旧渠，庚在石壁落下一道不能撤回的切口。水获得新方向，刀也被第一股冲出的水磨钝。', storyEn: 'Ren’s water fills the old channel. Geng makes one irreversible cut in the rock. The current gains a direction, and the blade is blunted by the first surge.' },
    庚癸: { titleZh: '井壁后的第一滴水', titleEn: 'The First Drop Behind the Well Wall', storyZh: '癸听见石后极轻的回声，庚照着那一点位置钻下去。第一滴水出现时，钻头已经卷刃；细小的判断让巨大的动作没有落空。', storyEn: 'Gui hears a faint echo behind the stone; Geng drills at that exact point. The bit is worn by the time the first drop appears—a small judgment keeping a large action from being wasted.' },
    辛壬: { titleZh: '桥下的速度', titleEn: 'The Speed Beneath the Bridge', storyZh: '壬只想让船队尽快通过，辛却在桥下量出一道会把船推偏的侧流。壬把速度压慢半刻，整支船队因此没有撞上看不见的墙。', storyEn: 'Ren wants the fleet through quickly; Xin measures a side current that would push it off course. Ren slows for half a watch, and the fleet misses an invisible wall.' },
    辛癸: { titleZh: '误差从一滴开始', titleEn: 'Error Begins with One Drop', storyZh: '辛校准整座雨钟，癸却发现每天都有一滴提前落下。她们追着那一滴拆到最里面，找到一枚几乎看不见的磨损齿轮。', storyEn: 'Xin calibrates the city rain clock; Gui notices one drop falling early each day. They follow it inward and find a nearly invisible worn gear.' },
    壬癸: { titleZh: '河不知道雨', titleEn: 'The River Does Not Know the Rain', storyZh: '壬看见整条河的宽窄快慢，癸看见一滴水比昨天早落半拍。范围与精度终于在同一张水图上相遇，真正的偏移才显出形状。', storyEn: 'Ren sees the river’s breadth and speed; Gui sees one drop fall half a beat early. Range and precision meet on the same water map, and the real drift becomes visible.' }
  });

  const CHARACTERS = {
    甲: {
      element: '木', yang: true, ...visualSet('jia-wood'), poses: poseSet('jia-wood'),
      comic: Object.freeze({ titleZh: '按量报', titleEn: 'By Exact Measure', asset: COMIC_BASE + 'jia-guangmo-anliangbao-v1.png' }),
      nameZh: '广莫', nameEn: 'Guangmo', roleZh: '栋梁', roleEn: 'The Pillar',
      tagsZh: ['方向', '担当', '生长'], tagsEn: ['Direction', 'Responsibility', 'Growth'],
      descZh: '像参天大树一样先确定方向，再让结构向上成立。可靠、直接，也容易把继续向前当成唯一答案。',
      descEn: 'Like a tall tree, Guangmo establishes direction and gives structure somewhere to rise—reliable and direct, yet prone to treating forward motion as the only answer.',
      readerTitleZh: '你总是先把事情撑住', readerTitleEn: 'You are usually the first to hold things together',
      readerStoryZh: '事情一乱，别人还在等，你已经把方向定好，把最重的那一头扛到自己肩上。你很少半途而废，也因此最难承认：有些路走不下去，不是你不够坚持，而是你已经变了。最近若有什么迟迟放不下，先别逼自己马上舍弃；只问一句——我还在守护它，还是只是不肯承认这一程已经走完？',
      readerStoryEn: 'When things fall apart, you choose a direction and take the heaviest end before anyone asks. You rarely quit, which can make it hard to admit that some roads end not because you failed, but because you changed. If something has been difficult to release, ask: am I still protecting it, or only refusing to admit this part is over?',
      scarZh: '空带那年为了救城，运斤砍掉了广莫亲手种下的第一片林。广莫在旁边看到天亮，没有阻止——那是当时必须做的决定。从那以后，广莫再也不给任何一棵树取名字。',
      scarEn: 'The year of the Hollow Belt, Yunjin cut down the first grove Guangmo had planted, to save the city. Guangmo watched until dawn and did not stop it — at the time it was the necessary call. Guangmo has not named a tree since.',
      highlightZh: '五色错位之后，所有人都要求木部继续扩张。最擅长往前推的广莫第一个说「先停下」，同意切掉还活着的旧根，给水部留出一条不会再被堵住的回路。',
      highlightEn: 'After the colors slipped apart, everyone demanded the Wood district keep expanding. Guangmo — the one built to push forward — was first to say “stop here,” allowing living old roots to be cut so the Water district could keep a channel that would not clog again.',
      ongoingZh: '肯放掉活着的根，不等于愿意重新给树取名字；和运斤之间那件事，也一直没有和解。',
      ongoingEn: 'Letting living roots go is not the same as being willing to name a tree again — and nothing between Guangmo and Yunjin has been settled.'
    },
    乙: {
      element: '木', yang: false, ...visualSet('yi-wood'), poses: poseSet('yi-wood'),
      nameZh: '南枝', nameEn: 'Nanzhi', roleZh: '藤萝', roleEn: 'The Vine',
      tagsZh: ['连接', '借势', '韧性'], tagsEn: ['Connection', 'Leverage', 'Resilience'],
      descZh: '不靠蛮力向上，而是找到结构、缝隙和另一条路。能适应所有人，也因此容易忘记自己原本想去哪里。',
      descEn: 'Nanzhi rises by finding structures, gaps, and alternate routes rather than forcing a way through—able to adapt to anyone, sometimes at the cost of a direction of their own.',
      readerTitleZh: '你总能从缝隙里找到路', readerTitleEn: 'You can always find a way through the gap',
      readerStoryZh: '你很会看气氛。谁需要被接住、哪句话此刻不该说，你往往比当事人更早知道。于是大家都觉得和你相处舒服，却很少有人发现，你为了让关系顺下去，悄悄改过多少次方向。下一次再想说“都可以”时，不妨先停一秒：如果不用照顾任何人的期待，你真正想选哪一个？',
      readerStoryEn: 'You read a room quickly: who needs support, which words should wait, where the conversation can keep moving. People feel at ease with you, yet rarely notice how often you change direction to make that ease possible. The next time you are about to say “either is fine,” pause and ask what you would choose if no one else needed pleasing.',
      scarZh: '南枝能让几乎任何人觉得被理解，可几乎没人反过来问一句：你自己想去哪里。想要什么，南枝只用站的位置暗示，别人读不懂也不解释。',
      scarEn: 'Nanzhi can make almost anyone feel understood, yet almost no one asks the reverse: where do you want to go? Nanzhi signals needs only by where they stand, and never corrects a misreading.',
      highlightZh: '旧树根堵死了回水渠，南枝最早从缝里看出问题。第一次说出来被压了下去；三天后旧办法失败，南枝画出新的回水路线，第一次公开要求另外九个人跟着走。',
      highlightEn: 'Old roots had choked the return channel, and Nanzhi was first to spot it through a crack. The first warning was brushed aside; three days later the old method failed, and Nanzhi drew a new return route and asked the other nine to follow — the first time Nanzhi named a direction out loud.',
      ongoingZh: '这一次开了口。下一次会不会还开口，南枝自己也不知道。',
      ongoingEn: 'This time Nanzhi spoke up. Whether there will be a next time, Nanzhi does not know either.'
    },
    丙: {
      element: '火', yang: true, ...visualSet('bing-fire'), poses: poseSet('bing-fire'),
      nameZh: '忘归', nameEn: 'Wanggui', roleZh: '点灯人', roleEn: 'The Beacon',
      tagsZh: ['动员', '公开', '感染'], tagsEn: ['Mobilizing', 'Open', 'Inspiring'],
      descZh: '擅长把沉下去的气氛重新点亮，也能让许多人朝同一个方向行动。忘归对陌生人与最亲近的人一样热情，很少只为一人停留。',
      descEn: 'Wanggui can relight a room that has gone quiet and move many people in one direction, offering the same warmth to strangers and loved ones and rarely pausing for only one person.',
      readerTitleZh: '你一出现，气氛就亮了', readerTitleEn: 'The room brightens when you arrive',
      readerStoryZh: '冷场时你会先开口，事情卡住时你也愿意把大家重新叫到一起。你给出的热情是真的，只是给得太自然，最亲近的人偶尔会怀疑：这份好是不是谁都有。你不必把光关小；只需要在热闹散去以后，为那个重要的人多停一会儿，让他知道这一次不是顺手照亮。',
      readerStoryEn: 'You speak when the room goes quiet and gather people when momentum stalls. Your warmth is real, but because it comes so freely, those closest to you may wonder whether everyone receives the same light. You do not need to dim it—just remain a little longer after the crowd leaves, so one person knows this time was not incidental.',
      scarZh: '忘归对陌生人和对最亲近的人一样热情，所以谁都不觉得自己特别。热度平均分给了所有人，没有一个人是只属于忘归的。',
      scarEn: 'Wanggui is as warm to a stranger as to the closest friend, so no one feels singled out. The heat is shared evenly, and no one has ever belonged only to Wanggui.',
      highlightZh: '五色错位最乱的时候，最习惯站在光里的忘归让全城工坊同时安静下来，把所有人的目光让给西窗手里那一点火，自己退到人群后面。',
      highlightEn: 'At the worst of the color drift, the one most used to standing in the light made every workshop in the city fall silent at once, handed the city’s attention to the single ember in Xichuang’s hands, and stepped back into the crowd.',
      ongoingZh: '忘归还是不知道，怎么才能只为一个人多停一秒。',
      ongoingEn: 'Wanggui still does not know how to stop one second longer for just one person.'
    },
    丁: {
      element: '火', yang: false, ...visualSet('ding-fire'), poses: poseSet('ding-fire'),
      nameZh: '西窗', nameEn: 'Xichuang', roleZh: '守灯人', roleEn: 'The Lamplighter',
      tagsZh: ['专注', '守微', '耐久'], tagsEn: ['Focused', 'Attentive', 'Enduring'],
      descZh: '不急着照亮所有人，而是守住容易被忽略、却会决定结果的那一点。西窗安静、专注，常常等到真正被需要时才站出来。',
      descEn: 'Xichuang does not try to light everyone at once, but protects the overlooked point that may decide the outcome—quiet, focused, and often waiting until truly needed before stepping forward.',
      readerTitleZh: '你守住的是别人没看见的那点光', readerTitleEn: 'You protect the light others overlook',
      readerStoryZh: '你未必是人群里声音最大的那个，却常常记得一句别人随口说过的话，也能在大家都准备放弃时，看见事情还剩哪一点可能。你习惯等到“真的需要我”才站出来，久了也会误以为白天的自己不够重要。其实你不必等天黑才证明那盏灯有用；想说的话，可以趁还有光时说。',
      readerStoryEn: 'You may not be the loudest person in the room, but you remember the sentence everyone else forgot and see the last possibility when others are ready to leave. You often wait until you are truly needed before stepping forward, as if your light matters only after dark. It does not. Say what you mean while the day is still here.',
      scarZh: '白天西窗的账页几乎都是零——只有天黑了，那枚小火种才被人需要。西窗因此盼着天黑，又为这份盼望觉得难为情。',
      scarEn: 'By day Xichuang’s ledger is mostly zeros — only after dark is that small ember needed at all. So Xichuang waits for nightfall, and is ashamed of the waiting.',
      highlightZh: '五个区的光接不上节拍，中央的白光散成一道道色带。西窗数出赤光快了半拍，熄掉外围所有多余的灯，只留手里那一枚；另外九个人第一次照着这枚最小的火对节奏。',
      highlightEn: 'The five districts fell out of step and the white light at the center split into misaligned bands. Xichuang counted the red light running half a beat early, put out every spare lamp on the outer ring, and kept only the one in hand — the other nine set their timing by the smallest flame in the city for the first time.',
      ongoingZh: '西窗在白天要求过全城跟随一次。但天一黑，西窗还是会盼着，还是会低头。',
      ongoingEn: 'Xichuang once asked the whole city to follow, in daylight. But when night comes, Xichuang still waits for it, and still looks down.'
    },
    戊: {
      element: '土', yang: true, ...visualSet('wu-earth'), poses: poseSet('wu-earth'),
      nameZh: '不周', nameEn: 'Buzhou', roleZh: '压舱石', roleEn: 'The Ballast',
      tagsZh: ['边界', '承重', '稳定'], tagsEn: ['Boundaries', 'Bearing', 'Stability'],
      descZh: '让所有人知道什么可以通过、什么必须停下。不周保护了城，也可能把保护变成无法离开的墙。',
      descEn: 'Buzhou makes clear what may pass and what must stop—protecting the city, while risking turning protection into a wall no one can leave.',
      readerTitleZh: '别人慌的时候，你先站稳', readerTitleEn: 'When others panic, you steady the ground',
      readerStoryZh: '局面越乱，你反而越安静。大家会把重要的东西交给你，因为你答应过的事很少掉到地上。只是同一种可靠，有时也会变成一道关得太紧的门：你怕一放手就会出事，别人却可能早已需要新的出口。真正的稳，不是永远不动；是门打开以后，你仍然站得住。',
      readerStoryEn: 'The more chaotic things become, the steadier you appear. People trust you with what matters because promises rarely fall from your hands. Yet reliability can become a door held too tightly shut: you fear what happens if you release it while others may already need a way out. Stability is not never moving; it is remaining steady after the gate opens.',
      scarZh: '洪水前不周按用过的旧办法封住北堤，堤没决口，水位也没降——同一道正确的保护，在新条件下变成了封锁。它挡住了洪水，也挡住了想离开这座城的人。',
      scarEn: 'Before the flood, Buzhou sealed the north dike the way that had always worked. The dike held and the water did not fall — the same correct protection had become a blockade. It stopped the flood, and it stopped the people who meant to leave.',
      highlightZh: '洪水来之前，不周亲手打开自己修的那道堤门，然后就站在门边，不走。水确实冲坏了东西，不周的手也没有从门闩上移开。',
      highlightEn: 'With the flood coming, Buzhou opened by hand the dike gate Buzhou had built, then stood beside it and stayed. The water did break things, and Buzhou never took a hand off the bolt.',
      ongoingZh: '门开过一次了，可那份「会不会出事」的担心，一点没少。',
      ongoingEn: 'The gate has been opened once. The worry about what might come through has not gone down at all.'
    },
    己: {
      element: '土', yang: false, ...visualSet('ji-earth'), poses: poseSet('ji-earth'),
      nameZh: '沃野', nameEn: 'Woye', roleZh: '沃土', roleEn: 'Fertile Ground',
      tagsZh: ['承接', '养育', '包容'], tagsEn: ['Receiving', 'Nurturing', 'Holding'],
      descZh: '让零散的人事物拥有继续生长的地方。沃野很少拒绝，也很难分清哪些东西已经不该继续留下。',
      descEn: 'Woye gives scattered people and things somewhere to keep growing—rarely refusing, and often unsure what should no longer remain.',
      readerTitleZh: '你总会给别人留一个位置', readerTitleEn: 'You always make room for one more',
      readerStoryZh: '饭桌临时多一个人，你会自然地添一副碗筷；朋友带着没说完的话来找你，你也总能再腾出一点地方。可你收下的东西太多，房间会满，心也会满。整理不是薄情，拒绝也不是亏欠。你可以继续温柔，只是别再把每一份无处安放的重量，都当成自己的责任。',
      readerStoryEn: 'When one more person appears at the table, you quietly add another place. When a friend arrives with unfinished words, you find room for those too. But rooms fill, and so does the heart. Clearing space is not cruelty, and refusal is not betrayal. You can remain kind without treating every unclaimed weight as your responsibility.',
      scarZh: '交接失败最后都会留下实物，没人来取的东西全堆在沃野这里，情绪也一样。堆得久了，沃野自己也分不清哪一件该扔。',
      scarEn: 'Every failed handoff leaves something physical behind, and whatever no one comes to collect ends up stacked around Woye — feelings included. After enough years, Woye can no longer tell which of it should go.',
      highlightZh: '洪水进洼地那天，最擅长把东西留下来的沃野，第一次从收了多年的堆积里挑出必须舍弃的部分，给人和水腾出地方。',
      highlightEn: 'The day the flood reached the low ground, the one best at keeping things picked out — for the first time — what had to be given up from years of accumulation, to make room for people and for water.',
      ongoingZh: '清走了一部分。口袋里还留着一件，一直没舍得丢。',
      ongoingEn: 'Part of it was cleared out. One thing is still in a pocket, still not thrown away.'
    },
    庚: {
      element: '金', yang: true, ...visualSet('geng-metal'), poses: poseSet('geng-metal'),
      nameZh: '运斤', nameEn: 'Yunjin', roleZh: '决断者', roleEn: 'The Decider',
      tagsZh: ['决断', '执行', '承担'], tagsEn: ['Decisive', 'Executing', 'Accountable'],
      descZh: '面对不能继续拖延的事，运斤会完成那一步。果断不是无情，而是知道总得有人承担不可撤回的结果。',
      descEn: 'When delay is no longer possible, Yunjin completes the step. Decisiveness is not cruelty; it is accepting an irreversible outcome someone must carry.',
      readerTitleZh: '真要拍板时，大家会看向你', readerTitleEn: 'When a decision must be made, people look to you',
      readerStoryZh: '讨论拖到最后，所有人都在等一个结论时，你往往是那个说“就这样做”的人。决定落下得快，不代表你没有犹豫；只是你把犹豫留在了别人看不见的地方。你不怕承担结果，却容易忘了自己也可以要求一句解释、一次配合，甚至一句谢谢。能扛事，不等于所有事都该一个人扛。',
      readerStoryEn: 'When discussion runs out and everyone waits for a conclusion, you are often the one who says, “we do this.” A fast decision does not mean you never hesitated; you simply kept the hesitation out of view. You can carry consequences, but may forget that you are allowed to ask for context, help, or even thanks. Capability does not make every burden yours alone.',
      scarZh: '空带那年，运斤一夜之间砍出隔离带救下全城，也砍掉了广莫亲手种的第一片林。事情办成了，但从来没有人对运斤说过一句谢谢。',
      scarEn: 'The year of the Hollow Belt, Yunjin cut a firebreak overnight and saved the city — and cut down the first grove Guangmo had planted. It worked. No one has ever thanked Yunjin for it.',
      highlightZh: '旧渠把循环卡死时，全城最快的那把刀第一次没有立刻落下——运斤等瑾瑜校准完，才落下那唯一一刀。切口不好看，但问题终于被切开了。',
      highlightEn: 'When the old channel locked the cycle solid, the fastest blade in the city did not fall at once for the first time — Yunjin waited for Jinyu to finish calibrating, then made the single irreversible cut. The cut was not clean, but the problem was finally open.',
      ongoingZh: '下一次可能还得一个人拍板，那句谢谢大概还是不会来。',
      ongoingEn: 'Next time the call may again have to be made alone, and the thanks probably still will not come.'
    },
    辛: {
      element: '金', yang: false, ...visualSet('xin-metal'), poses: poseSet('xin-metal'),
      nameZh: '瑾瑜', nameEn: 'Jinyu', roleZh: '校准者', roleEn: 'The Calibrator',
      tagsZh: ['标准', '精度', '克制'], tagsEn: ['Standards', 'Precision', 'Restraint'],
      descZh: '看见决定成败的细小误差，让粗糙的东西真正成器。瑾瑜也可能用完美，把一切永远挡在「还差一点」。',
      descEn: 'Jinyu sees the small errors that decide outcomes and turns rough work into something usable—while perfection can leave everything forever “not quite ready.”',
      readerTitleZh: '你总能看见那一点不对', readerTitleEn: 'You always see the one thing that is off',
      readerStoryZh: '别人说“差不多就行”时，你已经看见那条歪掉的线、那句不准确的话，以及以后可能因此多出的麻烦。你的认真让很多东西真正变好，也会让你把最喜欢的选择一直留在“准备好了再用”。可生活并不会先变得无瑕再开始。今天若有一件东西已经足够好，就让它带着一点痕迹出门。',
      readerStoryEn: 'When others say “close enough,” you already see the crooked line, the imprecise word, and the trouble it may cause later. Your care makes things genuinely better, but can leave what you love waiting for the day it is finally ready. Life does not become flawless before it begins. If something is good enough today, let it leave with one mark still showing.',
      scarZh: '空带那年瑾瑜把隔离带的宽度算窄了一次，从此对误差近乎苛刻。真正怕的不是算错，是东西被拿去用、被磨损——所以自己最好的那件，反而一直不肯用。',
      scarEn: 'The year of the Hollow Belt, Jinyu once measured the firebreak too narrow, and has been merciless about error ever since. The real fear is not miscalculating but being used and worn down — which is why Jinyu’s own best piece is the one never put to use.',
      highlightZh: '旧渠只允许一指宽的切口，瑾瑜测出唯一那个位置；并且在误差还没完全消掉的时候，第一次说出「可以用了」——这句话的责任由瑾瑜自己担。',
      highlightEn: 'The old channel allowed a cut only a finger wide. Jinyu measured the one position that worked and, with the error not fully gone, said “it can be used” for the first time — and carried the weight of having said it.',
      ongoingZh: '接受过一次不完美，还是没停止害怕磨损。那根留下划痕的闸杆一直没换掉，每次经过还是会停一下。',
      ongoingEn: 'Having accepted imperfection once has not stopped the fear of wear. The gate lever with the scratch on it was never replaced, and Jinyu still pauses at it every time.'
    },
    壬: {
      element: '水', yang: true, ...visualSet('ren-water'), poses: poseSet('ren-water'),
      nameZh: '既望', nameEn: 'Jiwang', roleZh: '奔流', roleEn: 'The Current',
      tagsZh: ['流动', '远见', '见识'], tagsEn: ['Movement', 'Horizon', 'Experience'],
      descZh: '看见远方，也能推动跨越整座城的变化。既望的问题从来不是走不动，而是不知道什么时候应该放慢。',
      descEn: 'Jiwang sees far away and can move change across the whole city. The difficulty is never movement—it is knowing when to slow down.',
      readerTitleZh: '你心里一直有更远的地方', readerTitleEn: 'Part of you is always looking farther away',
      readerStoryZh: '一件事刚有轮廓，你已经在想下一站；别人还在适应变化，你又看见了更远的可能。你不是不珍惜眼前，只是流动让你觉得自己还活着。可有些重要的人不会追着水跑，他们只想知道你何时愿意靠岸。真正的远方不怕你停一晚；该回的消息，今天就回。',
      readerStoryEn: 'As soon as one plan takes shape, you are already seeing the next horizon. It is not that you fail to value the present; movement is how you feel alive. But some important people will not chase the current—they need to know when you are willing to come ashore. A real horizon can survive one quiet night. Answer the message you have been carrying.',
      scarZh: '既望走过五湖四海，也见过外海真正压过船舷的浪。回来只报宽窄快慢，从不把远方讲成神话——因为「外面也一样」。',
      scarEn: 'Jiwang has crossed every water there is, and has seen open-sea waves come over the rail for real. Jiwang comes back reporting only width and speed, never dressing distance up as a legend — because “out there is the same.”',
      highlightZh: '远方不断要求引进更大的水量，既望第一次没有继续加速，而是把主流压慢到能听见雪泥那一滴水。代价是下游水位不够、渡口停摆。',
      highlightEn: 'With the far side demanding ever more volume, Jiwang for the first time did not speed up, but slowed the main current until the single drop Xueni was tracking could be heard. The cost was low water downstream and ferries at a standstill.',
      ongoingZh: '远方还在催，既望的衣摆还是朝着外河的方向。',
      ongoingEn: 'The far side is still calling, and Jiwang’s coat still hangs toward the outer river.'
    },
    癸: {
      element: '水', yang: false, ...visualSet('gui-water'), poses: poseSet('gui-water'),
      comic: Object.freeze({ titleZh: '印子干了以后', titleEn: 'After the Marks Dried', asset: COMIC_BASE + 'gui-xueni-yinzigan-v1.png' }),
      nameZh: '雪泥', nameEn: 'Xueni', roleZh: '细雨', roleEn: 'Fine Rain',
      tagsZh: ['感知', '渗透', '倾听'], tagsEn: ['Sensing', 'Permeating', 'Listening'],
      descZh: '能进入所有人忽略的细处，让影响在很久之后抵达。雪泥太擅长不被察觉，也容易让重要的话来得太迟。',
      descEn: 'Xueni reaches the smallest overlooked places and lets effects arrive much later—so skilled at going unnoticed that important words can come too late.',
      readerTitleZh: '你总比别人更早察觉变化', readerTitleEn: 'You notice the change before anyone else',
      readerStoryZh: '一句话的语气轻了一点、一个人回消息慢了半拍，你通常最先感觉到。你会先观察、再理解、再替对方想好理由，等终于确定时，那句话也在心里放了太久。敏感不是多想，它只是需要一个出口。下次不必等证据齐全，可以先轻轻问一句：“刚才那一刻，你是不是有点不一样？”',
      readerStoryEn: 'A voice softens, a reply arrives half a beat late—you usually notice first. Then you observe, interpret, and invent kind explanations until the words have sat inside you too long. Sensitivity is not overthinking; it simply needs an exit. Next time, before every piece of evidence is complete, try asking gently: “Did something feel different just then?”',
      scarZh: '雪泥总在别人发现之前就把细缝润过去了，所以没人记得雪泥来过。做了不说，久了连自己都拿不出「我在场」的证据。',
      scarEn: 'Xueni reaches the small gaps before anyone notices them, so no one remembers Xueni was there. Doing it without saying it means Xueni can no longer produce proof of having been present at all.',
      highlightZh: '檐水每天早落一滴，雪泥多年前就看见了，一直以为无害；那天才确认，这一滴的提前已经把水部的节拍推离了另外四个区。雪泥在雨里当面把话说完，沉默了几秒，才终于有人转过头。',
      highlightEn: 'The eaves had been dripping one drop early every day, and Xueni had seen it years ago and assumed it was harmless. That day it was confirmed: that one early drop had already pushed the Water district off the other four. Xueni said the whole thing out loud, in the rain, and after a few seconds of silence someone finally turned around.',
      ongoingZh: '这次说出来了。下一句话会不会又等三天，还不知道。',
      ongoingEn: 'This time it was said. Whether the next sentence waits another three days is still unknown.'
    }
  };

  const PEER_STORIES = {
    木: { titleZh: '同一束光', titleEn: 'The Same Light', storyZh: '风雨刚停，甲撑住温室里倾斜的旧梁，乙沿梁侧无人留意的缝隙引藤向上。两条路最后都抵达破顶落下的同一束晨光；相似的力量彼此理解，也会碰到彼此的边界。', storyEn: 'After the storm, Jia braces the leaning frame while Yi guides a vine through an overlooked gap. Both routes reach the same beam of morning light—kindred strength meeting its own boundary.', scene: ELEMENT_SCENES.木 },
    火: { titleZh: '开灯的人与守灯的人', titleEn: 'One Opens the Lights, One Keeps Them On', storyZh: '场子冷下来时，丙会把所有灯同时打开；喧闹过去以后，丁留下来检查那盏最容易熄灭的。一个让人看见方向，一个让重要的东西没有在无人注意时消失。', storyEn: 'When a room goes cold, Bing opens every light. After the crowd leaves, Ding stays to check the lamp most likely to fail. One makes direction visible; the other keeps what matters from vanishing unnoticed.', scene: ELEMENT_SCENES.火 },
    土: { titleZh: '该留下哪一株', titleEn: 'What Should Remain', storyZh: '戊负责拒绝，己负责容纳。边界太近会伤害生命，边界太远又会让一切无法呼吸。', storyEn: 'Wu refuses; Ji receives. A boundary too close harms life, while one too far leaves nothing room to breathe.', scene: ELEMENT_SCENES.土 },
    金: { titleZh: '今天必须交付', titleEn: 'It Must Ship Today', storyZh: '庚怕来不及，辛怕不够好。真正可用的标准，永远发生在果断与精度之间。', storyEn: 'Geng fears being too late; Xin fears not being good enough. Usable work lives between decision and precision.', scene: ELEMENT_SCENES.金 },
    水: { titleZh: '河不知道雨', titleEn: 'The River Does Not Know the Rain', storyZh: '壬看见整条河，癸看见一滴提前的水。范围与精度缺少任何一边，都无法找到真正的失衡。', storyEn: 'Ren sees the whole river; Gui sees one early drop. Neither range nor precision can locate imbalance alone.', scene: ELEMENT_SCENES.水 }
  };

  const GENERATION_STORIES = {
    木: { titleZh: '借出去的一冬', titleEn: 'A Winter Lent Away', storyZh: '木部交出长成的旧材，火部因此撑过寒季。得到温暖的人很容易忘记，给予者的林线已经变薄。', storyEn: 'Wood gives mature timber so Fire can survive the cold. Warmth can make it easy to forget that the forest line has thinned.' },
    火: { titleZh: '灰落回田', titleEn: 'Ash Returns to the Field', storyZh: '最明亮的东西最终也会熄灭。火留下的灰被土承接，成为下一段循环的起点。', storyEn: 'Even the brightest thing goes out. Earth receives Fire’s ash and makes it the start of another cycle.' },
    土: { titleZh: '山腹的空洞', titleEn: 'The Hollow in the Mountain', storyZh: '金部得到矿与器形，土部却永远少了一部分。每一件成器之物，都来自某处真实的消耗。', storyEn: 'Metal receives ore and form; Earth is permanently diminished. Every finished object comes from a real cost somewhere.' },
    金: { titleZh: '第一口井', titleEn: 'The First Well', storyZh: '金开岩成井，水才得以出现。城里喝到的第一口水，是卷刃与磨损换来的。', storyEn: 'Metal opens rock so Water can emerge. The first drink is bought with blunted edges and worn measuring lines.' },
    水: { titleZh: '回来的水', titleEn: 'Water Returning', storyZh: '水面下降，树林却全部返青。水不是消失，只是进入另一种生命；给予有消耗，也有去向。', storyEn: 'The water level falls as the forest turns green. Water has not vanished; it has entered another life.' }
  };

  const CONTROL_STORIES = {
    木: { titleZh: '根穿过墙', titleEn: 'Roots Through the Wall', storyZh: '根从没有缝的堤下顶出裂口，暴露内部早已无法排水。木没有战胜土，只是迫使土重新呼吸。', storyEn: 'Roots crack a sealed dike and reveal trapped water beneath. Wood does not defeat Earth; it forces Earth to breathe again.' },
    土: { titleZh: '给洪水一条路', titleEn: 'Give the Flood a Route', storyZh: '土没有堵死整条河，而是关掉旧口、留下新渠。水被迫改变形状，也因此没有成为灾难。', storyEn: 'Earth does not stop the whole river; it closes old mouths and leaves a new channel. Water changes shape and avoids becoming disaster.' },
    水: { titleZh: '熄掉哪一盏', titleEn: 'Which Flame to Quench', storyZh: '水真正的力量不是全部扑灭，而是知道哪一团火必须停，哪一点光必须留下。', storyEn: 'Water’s real power is not extinguishing everything, but knowing which blaze must stop and which small light must remain.' },
    火: { titleZh: '把硬物烧软', titleEn: 'Making the Hard Soft', storyZh: '金被火迫使失去原形，也因此获得第二次成形的可能。压力不是纯粹毁坏，也可能是重塑。', storyEn: 'Fire forces Metal to lose its form and makes a second form possible. Pressure can reshape rather than only destroy.' },
    金: { titleZh: '只砍这一段', titleEn: 'Cut Only This Section', storyZh: '必要的切断仍然会留下伤口。金的责任不只是落刀，也包括少伤一寸并承担不可逆的结果。', storyEn: 'A necessary cut still leaves a wound. Metal is responsible not only for acting, but for limiting harm and carrying what cannot be reversed.' }
  };

  const SPECIAL_STORIES = [
    { type: '合', a: '甲', b: '己', result: '土', views: { 甲: '正财', 己: '正官' }, titleZh: '地基不是一个人的', titleEn: 'No One Builds the Foundation Alone', storyZh: '甲把结构立起，己让结构得到承接。两人形成的不是树或田，而是一块可以继续承重的地基。', storyEn: 'Jia raises the structure; Ji gives it ground. What emerges is neither tree nor field, but a foundation able to carry more.' },
    { type: '合', a: '乙', b: '庚', result: '金', views: { 乙: '正官', 庚: '正财' }, titleZh: '砍不动的形状', titleEn: 'A Shape That Cannot Be Cut', storyZh: '庚仍然锋利，乙仍然柔软；相制的动作互相牵引，最后长出谁都不是的新结构。', storyEn: 'Geng remains sharp and Yi remains flexible. Their opposing movements interlock and produce a structure belonging to neither alone.' },
    { type: '合', a: '丙', b: '辛', result: '水', views: { 丙: '正财', 辛: '正官' }, titleZh: '熔成一面水', titleEn: 'Melted into a Surface of Water', storyZh: '辛害怕失去完美形状，丙却用持续的热让坚硬表面开始容纳倒影。两人都被迫停留得比习惯更久。', storyEn: 'Xin fears losing perfect form; Bing’s sustained heat makes the hard surface hold reflections. Both must remain longer than habit allows.' },
    { type: '合', a: '丁', b: '壬', result: '木', views: { 丁: '正官', 壬: '正财' }, titleZh: '灯照见岸', titleEn: 'The Lamp Reveals the Shore', storyZh: '壬能熄灭所有火，却替丁挡住一阵风；丁只照亮很小的岸，壬因此知道在哪里停下。', storyEn: 'Ren could extinguish every flame, yet shields Ding from the wind. Ding lights only a small shore, giving Ren somewhere to stop.' },
    { type: '合', a: '戊', b: '癸', result: '火', views: { 戊: '正财', 癸: '正官' }, titleZh: '山缝里的热', titleEn: 'Warmth in the Mountain Crack', storyZh: '癸进入戊不愿承认的裂缝，裂缝深处却升起稳定的暖气。戊没有填平，癸也无法再假装没有来过。', storyEn: 'Gui enters a crack Wu refuses to acknowledge, and steady warmth rises from within. Wu leaves it open; Gui can no longer pretend not to have been there.' },
    { type: '冲', a: '甲', b: '庚', views: { 甲: '七杀', 庚: '偏财' }, titleZh: '正确的那一刀', titleEn: 'The Cut That Was Right', storyZh: '庚砍掉甲第一片林时救了全城。甲知道决定没有错，也正因为如此，连责怪都找不到位置。', storyEn: 'Geng saved the city by cutting Jia’s first forest. Jia knows the decision was right, which leaves even blame with nowhere to go.' },
    { type: '冲', a: '乙', b: '辛', views: { 乙: '七杀', 辛: '偏财' }, titleZh: '藤与剪', titleEn: 'Vine and Shears', storyZh: '辛每剪掉一处不合标准的枝叶，乙就从另一处长回来。两人让彼此看见边界，也不知道下一次会修剪还是改道。', storyEn: 'Whenever Xin trims what falls outside the standard, Yi grows back elsewhere. Each reveals the other’s boundary; the next meeting remains unwritten.' },
    { type: '冲', a: '丙', b: '壬', views: { 丙: '七杀', 壬: '偏财' }, titleZh: '日与洪', titleEn: 'Sun and Flood', storyZh: '丙用光召集所有人，壬用洪水逼所有人离开。两人彼此欣赏，却无法同时停留在同一处。', storyEn: 'Bing gathers everyone with light; Ren drives everyone away with floodwater. They admire each other and cannot remain in the same place.' },
    { type: '冲', a: '丁', b: '癸', views: { 丁: '七杀', 癸: '偏财' }, titleZh: '雨并不是故意的', titleEn: 'The Rain Did Not Mean To', storyZh: '癸照平常路线落下，丁守了一夜的灯却因此熄灭。没有恶意，不等于没有造成伤害。', storyEn: 'Gui follows the usual path and extinguishes the lamp Ding guarded all night. The absence of intent does not erase the harm.' }
  ];

  const ENSEMBLE_POSITIONS = {
    甲: [12, 47, 0.92], 乙: [20, 31, 0.78], 丙: [31, 57, 0.92], 丁: [40, 35, 0.76],
    戊: [49, 61, 0.92], 己: [58, 35, 0.78], 庚: [68, 57, 0.9], 辛: [77, 33, 0.76],
    壬: [87, 50, 0.92], 癸: [91, 29, 0.74]
  };

  function textOf(obj, key, lang) {
    return obj[key + (lang === 'en' ? 'En' : 'Zh')] || '';
  }

  function character(stem) {
    return CHARACTERS[stem] || null;
  }

  // 五行分值只能推出相对最少的「元素」，不能据此断成某一个阴干或阳干。
  // 非均衡时 pair 才是权威结果；stem 留空，避免 UI 把「火少」误说成「只缺丙/丁」。
  function guideFor(chart) {
    const dayMaster = character(chart && chart.dm) ? chart.dm : '甲';
    const dayItem = character(dayMaster);
    const raw = chart && chart.scores;
    if (!raw || typeof raw !== 'object') {
      return Object.freeze({
        stem: dayMaster, element: dayItem.element, dayMaster, balanced: true,
        pair: (ELEMENT_STEMS[dayItem.element] || [dayMaster]).slice(),
        tiedElements: ELEMENT_ORDER.slice()
      });
    }
    const rows = ELEMENT_ORDER.map((element, index) => {
      const value = Number(raw[element]);
      return { element, index, score: Number.isFinite(value) ? Math.max(0, value) : 0 };
    });
    const scores = rows.map(row => row.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const tolerance = 1e-9;
    const tied = rows.filter(row => Math.abs(row.score - min) <= tolerance);
    const balanced = max - min <= tolerance;
    const weakest = balanced ? null : tied[0];
    const element = weakest ? weakest.element : dayItem.element;
    const candidates = ELEMENT_STEMS[element] || [dayMaster];
    return Object.freeze({
      stem: balanced ? dayMaster : null,
      element,
      score: weakest ? weakest.score : Number(raw[element]) || 0,
      dayMaster,
      balanced,
      pair: candidates.slice(), // 文案要说「属水的是壬和癸」，所以把同行的两个天干一起带出去
      tiedElements: tied.map(row => row.element)
    });
  }

  function namesFor(stems, lang) {
    return stems.map(stem => {
      const item = character(stem);
      return item ? `${stem}·${textOf(item, 'name', lang)}` : stem;
    }).join(' · ');
  }

  function relationBetween(fromStem, toStem, lang) {
    const from = character(fromStem);
    const to = character(toStem);
    if (!from || !to) return null;
    const en = lang === 'en';
    const samePolarity = from.yang === to.yang;
    let key = 'peer';
    let termZh = samePolarity ? '比肩' : '劫财';
    let plainZh = samePolarity ? '和你并肩' : '和你很像';
    let termEn = samePolarity ? 'Peer' : 'Counterpart';
    let plainEn = samePolarity ? 'stands beside you' : 'moves like you';
    if (GENERATES[from.element] === to.element) {
      key = 'output'; termZh = samePolarity ? '食神' : '伤官'; plainZh = '被你带动';
      termEn = samePolarity ? 'Expression' : 'Challenge'; plainEn = 'moved by you';
    } else if (GENERATED_BY[from.element] === to.element) {
      key = 'source'; termZh = samePolarity ? '偏印' : '正印'; plainZh = '托住你';
      termEn = samePolarity ? 'Intuition' : 'Support'; plainEn = 'supports you';
    } else if (CONTROLS[from.element] === to.element) {
      key = 'control'; termZh = samePolarity ? '偏财' : '正财'; plainZh = '由你掌握';
      termEn = samePolarity ? 'Opportunity' : 'Stewardship'; plainEn = 'handled by you';
    } else if (CONTROLLED_BY[from.element] === to.element) {
      key = 'pressure'; termZh = samePolarity ? '七杀' : '正官'; plainZh = '推动你';
      termEn = samePolarity ? 'Pressure' : 'Structure'; plainEn = 'pushes you';
    }
    return Object.freeze({
      key,
      term: en ? termEn : termZh,
      plain: en ? plainEn : plainZh,
      combine: STEM_COMBINES[fromStem] === toStem,
      clash: STEM_CLASHES[fromStem] === toStem
    });
  }

  function chartCast(chart, lang) {
    if (!chart || !Array.isArray(chart.pillars)) return [];
    const pillarZh = ['年', '月', '日', '时'];
    const pillarEn = ['Year', 'Month', 'Day', 'Hour'];
    return chart.pillars.flatMap((pillar, pillarIndex) => {
      const branchStem = (pillar.hidden && pillar.hidden[0]) || BRANCH_MAIN_STEM[pillar.zhi] || chart.dm;
      return [
        { pillarIndex, part: 'gan', source: pillar.gan, stem: pillar.gan, position: lang === 'en' ? `${pillarEn[pillarIndex]} stem` : `${pillarZh[pillarIndex]}干` },
        { pillarIndex, part: 'zhi', source: pillar.zhi, stem: branchStem, position: lang === 'en' ? `${pillarEn[pillarIndex]} branch` : `${pillarZh[pillarIndex]}支` }
      ];
    }).map((slot, index) => Object.freeze(Object.assign(slot, {
      index,
      isSelf: index === 4,
      relation: relationBetween(chart.dm, slot.stem, lang)
    })));
  }

  function relationCards(stem, lang) {
    const item = character(stem);
    if (!item) return [];
    const en = lang === 'en';
    return STEM_ORDER.filter(other => other !== stem).map(other => {
      const relation = relationBetween(stem, other, lang);
      const story = PAIR_STORIES[pairKey(stem, other)] || {};
      const special = [relation.combine ? (en ? 'Combine' : '合') : '', relation.clash ? (en ? 'Clash' : '冲') : ''].filter(Boolean);
      const otherItem = character(other);
      const otherName = textOf(otherItem, 'name', lang);
      return {
        key: `pair-${pairKey(stem, other)}`,
        targetStem: other,
        relationKey: relation.key,
        kind: relation.clash ? 'clash' : (relation.combine ? 'combine' : relation.key),
        label: `${other}·${otherName}`,
        term: [relation.term].concat(special).join(' · '),
        plain: en
          ? `${other} ${relation.plain}${relation.combine ? '; you also combine' : ''}${relation.clash ? '; you also clash' : ''}. This describes direction, not good or bad.`
          : `${other}在这段关系里${relation.plain}${relation.combine ? '；你们同时相合' : ''}${relation.clash ? '；你们同时相冲' : ''}。这里只描述关系方向，不代表吉凶。`,
        title: textOf(story, 'title', lang),
        story: textOf(story, 'story', lang),
        scene: PAIR_SCENES[pairKey(stem, other)] || '',
        relatedStems: [other],
        related: namesFor([other], lang)
      };
    });
  }

  function groupStories(lang) {
    return GROUP_STORIES.map(group => Object.freeze({
      key: group.key,
      stems: group.stems.slice(),
      scene: group.scene,
      title: textOf(group, 'title', lang),
      story: textOf(group, 'story', lang),
      people: namesFor(group.stems, lang)
    }));
  }

  global.SinanCharacters = Object.freeze({
    assetBase: V8_ROOT,
    sceneBase: V9_ROOT,
    stemOrder: STEM_ORDER.slice(),
    elementOrder: ELEMENT_ORDER.slice(),
    get: character,
    guideFor,
    text: textOf,
    relationCards,
    groupStories,
    relationBetween,
    chartCast,
    namesFor,
    sceneForElement: element => ELEMENT_SCENES[element] || ''
  });
})(window);
