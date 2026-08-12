/* SPDX-License-Identifier: LicenseRef-Sinan-Characters-Stories-ARR */
/* 常明城十干人物系统：数据、关系与完整叙事场景资产协议。 */
(function (global) {
  'use strict';

  const HUMAN_ROOT = 'img/ten-archetypes/human/';
  const V8_ROOT = HUMAN_ROOT + 'v8/';
  const V9_ROOT = HUMAN_ROOT + 'v9/';
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

  const CHARACTERS = {
    甲: {
      element: '木', yang: true, ...visualSet('jia-wood'), poses: poseSet('jia-wood'),
      comic: Object.freeze({ titleZh: '按量报', titleEn: 'By Exact Measure', asset: COMIC_BASE + 'jia-guangmo-anliangbao-v1.png' }),
      nameZh: '广莫', nameEn: 'Guangmo', roleZh: '栋梁', roleEn: 'The Pillar',
      tagsZh: ['方向', '担当', '生长'], tagsEn: ['Direction', 'Responsibility', 'Growth'],
      descZh: '像参天大树一样先确定方向，再让结构向上成立。可靠、直接，也容易把继续向前当成唯一答案。',
      descEn: 'Like a tall tree, Guangmo establishes direction and gives structure somewhere to rise—reliable and direct, yet prone to treating forward motion as the only answer.',
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
      scarZh: '南枝能让几乎任何人觉得被理解，可几乎没人反过来问一句：你自己想去哪里。想要什么，南枝只用站的位置暗示，别人读不懂也不解释。',
      scarEn: 'Nanzhi can make almost anyone feel understood, yet almost no one asks the reverse: where do you want to go? Nanzhi signals needs only by where they stand, and never corrects a misreading.',
      highlightZh: '旧树根堵死了回水渠，南枝最早从缝里看出问题。第一次说出来被压了下去；三天后旧办法失败，南枝画出新的回水路线，第一次公开要求另外九个人跟着走。',
      highlightEn: 'Old roots had choked the return channel, and Nanzhi was first to spot it through a crack. The first warning was brushed aside; three days later the old method failed, and Nanzhi drew a new return route and asked the other nine to follow — the first time Nanzhi named a direction out loud.',
      ongoingZh: '这一次开了口。下一次会不会还开口，南枝自己也不知道。',
      ongoingEn: 'This time Nanzhi spoke up. Whether there will be a next time, Nanzhi does not know either.'
    },
    丙: {
      element: '火', yang: true, ...visualSet('bing-fire'), poses: poseSet('bing-fire'),
      nameZh: '忘归', nameEn: 'Wanggui', roleZh: '展翼之火', roleEn: 'The Unfolded Fire',
      tagsZh: ['动员', '公开', '感染'], tagsEn: ['Mobilizing', 'Open', 'Inspiring'],
      descZh: '像白日，也像已经展开的凤凰：把热和方向给所有人。忘归对陌生人与最亲近的人一样热情，也很少只为一人停留。',
      descEn: 'Like daylight—or a phoenix already unfolded—Wanggui gives warmth and direction to everyone, rarely pausing for only one person.',
      scarZh: '忘归对陌生人和对最亲近的人一样热情，所以谁都不觉得自己特别。热度平均分给了所有人，没有一个人是只属于忘归的。',
      scarEn: 'Wanggui is as warm to a stranger as to the closest friend, so no one feels singled out. The heat is shared evenly, and no one has ever belonged only to Wanggui.',
      highlightZh: '五色错位最乱的时候，最习惯站在光里的忘归让全城工坊同时安静下来，把所有人的目光让给西窗手里那一点火，自己退到人群后面。',
      highlightEn: 'At the worst of the color drift, the one most used to standing in the light made every workshop in the city fall silent at once, handed the city’s attention to the single ember in Xichuang’s hands, and stepped back into the crowd.',
      ongoingZh: '忘归还是不知道，怎么才能只为一个人多停一秒。',
      ongoingEn: 'Wanggui still does not know how to stop one second longer for just one person.'
    },
    丁: {
      element: '火', yang: false, ...visualSet('ding-fire'), poses: poseSet('ding-fire'),
      nameZh: '西窗', nameEn: 'Xichuang', roleZh: '守种人', roleEn: 'Keeper of the Ember',
      tagsZh: ['专注', '守微', '耐久'], tagsEn: ['Focused', 'Attentive', 'Enduring'],
      descZh: '像尚未破壳的凤凰卵：势弱，却守住火仍能回来的可能。西窗不照亮所有人，只让最后一点不被噪声淹没。',
      descEn: 'Like an unhatched phoenix egg, Xichuang is faint yet preserves the chance that fire can return—keeping one final point from disappearing in noise.',
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
    火: { titleZh: '凤凰与卵', titleEn: 'Phoenix and Egg', storyZh: '丙是已经展开、把白日与大火给所有人的凤凰；丁是势弱却护住最后可能的凤凰卵。同一股火，一边向外给予，一边把未来收拢。', storyEn: 'Bing is fire unfolded like a phoenix, giving daylight to everyone; Ding is the faint egg that protects its last possible return. One fire gives outward while the other encloses the future.', scene: ELEMENT_SCENES.火 },
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

  function relationCards(stem, lang) {
    const item = character(stem);
    if (!item) return [];
    const el = item.element;
    const outputEl = GENERATES[el];
    const sourceEl = GENERATED_BY[el];
    const controlledEl = CONTROLS[el];
    const pressureEl = CONTROLLED_BY[el];
    const peer = PEER_STORIES[el];
    const output = GENERATION_STORIES[el];
    const source = GENERATION_STORIES[sourceEl];
    const controlled = CONTROL_STORIES[el];
    const pressure = CONTROL_STORIES[pressureEl];
    const peerStems = ELEMENT_STEMS[el].filter(s => s !== stem);
    const outputStems = ELEMENT_STEMS[outputEl];
    const sourceStems = ELEMENT_STEMS[sourceEl];
    const controlledStems = ELEMENT_STEMS[controlledEl];
    const pressureStems = ELEMENT_STEMS[pressureEl];
    const en = lang === 'en';
    const scenes = RELATION_SCENES[stem] || {};
    const cards = [
      {
        key: 'peer', kind: 'peer', label: en ? 'Kin' : '同类', term: en ? '比劫 · peers' : '比劫',
        plain: en ? 'People like you: they get you, and they want the same things' : '和你像的人：懂你，也会跟你抢同一个机会',
        title: textOf(peer, 'title', lang), story: textOf(peer, 'story', lang), scene: peer.scene || '',
        relatedStems: peerStems, related: namesFor(peerStems, lang)
      },
      {
        key: 'output', kind: 'generate', label: en ? 'I generate' : '我生', term: en ? '食伤 · output' : '食伤',
        plain: en ? 'What you put out: it lands, and it drains you' : '你付出的那一面：给得出去，也会把自己耗掉',
        title: textOf(output, 'title', lang), story: textOf(output, 'story', lang),
        scene: scenes.output || '',
        relatedStems: outputStems, related: namesFor(outputStems, lang),
        relatedDetails: outputStems.map(target => ({
          stem: target,
          role: character(target).yang === item.yang ? (en ? 'Eating God' : '食神') : (en ? 'Hurting Officer' : '伤官')
        }))
      },
      {
        key: 'source', kind: 'source', label: en ? 'Generates me' : '生我', term: en ? '印 · support' : '印',
        plain: en ? 'What holds you up: reliable, and easy to lean on too long' : '托着你的人：靠得住，靠久了也会离不开',
        title: textOf(source, 'title', lang), story: textOf(source, 'story', lang), scene: scenes.source || '',
        relatedStems: sourceStems, related: namesFor(sourceStems, lang)
      },
      {
        key: 'control', kind: 'control', label: en ? 'I regulate' : '我制', term: en ? '财 · stewardship' : '财',
        plain: en ? 'What you can handle: you take it on, you clean it up' : '你管得住的事：拿得下，也得自己收尾',
        title: textOf(controlled, 'title', lang), story: textOf(controlled, 'story', lang), scene: scenes.control || '',
        relatedStems: controlledStems, related: namesFor(controlledStems, lang)
      },
      {
        key: 'pressure', kind: 'pressure', label: en ? 'Regulates me' : '制我', term: en ? '官杀 · pressure' : '官杀',
        plain: en ? 'What presses on you: it hurts, and it shapes you' : '压着你的事：不好受，但也把你逼出个样子',
        title: textOf(pressure, 'title', lang), story: textOf(pressure, 'story', lang), scene: scenes.pressure || '',
        relatedStems: pressureStems, related: namesFor(pressureStems, lang)
      }
    ];
    SPECIAL_STORIES.forEach((sp, index) => {
      if (sp.a !== stem && sp.b !== stem) return;
      const other = sp.a === stem ? sp.b : sp.a;
      cards.push({
        key: 'special-' + index, kind: sp.type === '合' ? 'combine' : 'clash',
        label: `${sp.type}·${other}`, term: sp.views[stem] + (sp.result ? ` · ${en ? 'toward ' : '取'}${sp.result}` : ''),
        plain: sp.type === '合'
          ? (en ? 'Opposing motions interlock; the next state stays open' : '相制动作互锁，长出谁都不是的下一种状态')
          : (en ? 'Equal force on one axis; no villain and no fixed ending' : '同轴等量受力，没有反派，也没有固定结局'),
        title: textOf(sp, 'title', lang), story: textOf(sp, 'story', lang),
        scene: SPECIAL_SCENES[sp.a + sp.b] || SPECIAL_SCENES[sp.b + sp.a] || '',
        relatedStems: [other], related: namesFor([other], lang)
      });
    });
    return cards;
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
    namesFor,
    sceneForElement: element => ELEMENT_SCENES[element] || ''
  });
})(window);
