/* SPDX-License-Identifier: LicenseRef-Sinan-Characters-Stories-ARR */
/* 常明城十干人物系统：数据、关系与 PNG 资产协议。 */
(function (global) {
  'use strict';

  const HUMAN_ROOT = 'img/ten-archetypes/human/';
  const ASSET_BASE = HUMAN_ROOT + 'v7/';
  const POSE_BASE = ASSET_BASE + 'poses/';
  const COMIC_BASE = ASSET_BASE + 'comics/';
  const poseSet = slug => Object.freeze({
    identity: POSE_BASE + slug + '-identity.png',
    story: POSE_BASE + slug + '-story.png',
    open: POSE_BASE + slug + '-open.png'
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

  const CHARACTERS = {
    甲: {
      element: '木', yang: true, asset: ASSET_BASE + 'jia-wood.png', poses: poseSet('jia-wood'),
      comic: Object.freeze({ titleZh: '按量报', titleEn: 'By Exact Measure', asset: COMIC_BASE + 'jia-guangmo-anliangbao-v1.png' }),
      nameZh: '广莫', nameEn: 'Guangmo', roleZh: '栋梁', roleEn: 'The Pillar',
      tagsZh: ['方向', '担当', '生长'], tagsEn: ['Direction', 'Responsibility', 'Growth'],
      descZh: '像参天大树一样先确定方向，再让结构向上成立。可靠、直接，也容易把继续向前当成唯一答案。',
      descEn: 'Like a tall tree, Guangmo establishes direction and gives structure somewhere to rise—reliable and direct, yet prone to treating forward motion as the only answer.',
      scarZh: '第一片林曾被砍去救城。决定是对的，伤口也是真的；从那以后，广莫不再给树取名。',
      scarEn: 'The first forest was cut down to save the city. The decision was right and the wound was real; Guangmo has not named a tree since.',
      highlightZh: '当所有人都要求继续扩张时，最擅长向前的广莫第一个说：「先停下。」',
      highlightEn: 'When everyone demanded more growth, the one most built to advance was first to say: “Stop here.”',
      ongoingZh: '正在学习让别人改变自己的方向，但下一次是否仍能停下，没有答案。',
      ongoingEn: 'Learning to let others alter the route—but whether Guangmo can stop again next time remains open.'
    },
    乙: {
      element: '木', yang: false, asset: ASSET_BASE + 'yi-wood.png', poses: poseSet('yi-wood'),
      nameZh: '南枝', nameEn: 'Nanzhi', roleZh: '藤萝', roleEn: 'The Vine',
      tagsZh: ['连接', '借势', '韧性'], tagsEn: ['Connection', 'Leverage', 'Resilience'],
      descZh: '不靠蛮力向上，而是找到结构、缝隙和另一条路。能适应所有人，也因此容易忘记自己原本想去哪里。',
      descEn: 'Nanzhi rises by finding structures, gaps, and alternate routes rather than forcing a way through—able to adapt to anyone, sometimes at the cost of a direction of their own.',
      scarZh: '能让任何人喜欢自己，却很少有人问南枝自己到底想要什么。',
      scarEn: 'Nanzhi can make almost anyone feel understood, yet few ask what Nanzhi actually wants.',
      highlightZh: '旧暗渠已经断裂，南枝沿别人忽略的墙缝与旧根，画出了唯一可走的新路线。',
      highlightEn: 'With the old channel broken, Nanzhi traced the only viable route through cracks and roots everyone else ignored.',
      ongoingZh: '这一次说出了自己的方向；下一次会继续开口，还是重新迁就，仍有可能变化。',
      ongoingEn: 'This time Nanzhi named a direction; next time may bring another choice between speaking and adapting.'
    },
    丙: {
      element: '火', yang: true, asset: ASSET_BASE + 'bing-fire.png', poses: poseSet('bing-fire'),
      nameZh: '忘归', nameEn: 'Wanggui', roleZh: '白日光', roleEn: 'Daylight',
      tagsZh: ['动员', '公开', '感染'], tagsEn: ['Mobilizing', 'Open', 'Inspiring'],
      descZh: '把能量带进人群，让所有人都能看见方向。忘归对陌生人与最亲近的人一样热情，也很少只为一人停留。',
      descEn: 'Wanggui brings energy into a crowd and makes direction visible, offering the same warmth to strangers and intimates—and rarely pausing for only one person.',
      scarZh: '从来没有一个只属于忘归的人，因为忘归从不为任何人多停一秒。',
      scarEn: 'No one has ever belonged only to Wanggui, because Wanggui never stops an extra second for anyone.',
      highlightZh: '五色错位时，忘归让所有工坊同时安静，把全城目光完整交给西窗的一点微光。',
      highlightEn: 'When the five colors slipped apart, Wanggui quieted every workshop and handed the city’s attention to Xichuang’s tiny signal.',
      ongoingZh: '已经学会让别人被看见，却还不知道如何只为一个人停留。',
      ongoingEn: 'Learning to make another person visible, while the question of staying for one person remains.'
    },
    丁: {
      element: '火', yang: false, asset: ASSET_BASE + 'ding-fire.png', poses: poseSet('ding-fire'),
      nameZh: '西窗', nameEn: 'Xichuang', roleZh: '掌灯人', roleEn: 'The Lamplighter',
      tagsZh: ['专注', '守微', '耐久'], tagsEn: ['Focused', 'Attentive', 'Enduring'],
      descZh: '价值只在最细微的地方显现。西窗不负责照亮所有人，而是守住不能被噪声淹没的那一点。',
      descEn: 'Xichuang matters in the smallest places—not by lighting everyone, but by keeping one vital point from being lost in noise.',
      scarZh: '期待黑夜，因为只有黑夜需要这点微光；西窗也因此感到羞耻。',
      scarEn: 'Xichuang looks forward to darkness because darkness needs that small light—and feels ashamed of the wish.',
      highlightZh: '全城失去共同节拍时，只有西窗能连续守住那个微小而准确的明灭。',
      highlightEn: 'When the city lost a shared rhythm, Xichuang alone held the tiny, exact pulse that everyone else could follow.',
      ongoingZh: '曾在白天要求所有人按自己的速度行动一次，仍会期待下一场黑夜。',
      ongoingEn: 'Xichuang once asked the whole city to follow that pace in daylight, yet still waits for the next night.'
    },
    戊: {
      element: '土', yang: true, asset: ASSET_BASE + 'wu-earth.png', poses: poseSet('wu-earth'),
      nameZh: '不周', nameEn: 'Buzhou', roleZh: '压舱石', roleEn: 'The Ballast',
      tagsZh: ['边界', '承重', '稳定'], tagsEn: ['Boundaries', 'Bearing', 'Stability'],
      descZh: '让所有人知道什么可以通过、什么必须停下。不周保护了城，也可能把保护变成无法离开的墙。',
      descEn: 'Buzhou makes clear what may pass and what must stop—protecting the city, while risking turning protection into a wall no one can leave.',
      scarZh: '那道堤挡住了洪水，也挡住了想走的人；有人因此没能离开。',
      scarEn: 'The dike stopped a flood and also stopped people who meant to leave. Someone never made it out.',
      highlightZh: '洪水抵达前，不周亲手打开自己建造的堤门，并站在门边承担判断的全部后果。',
      highlightEn: 'Before the flood arrived, Buzhou opened a gate built by their own hands and stood beside it to bear the consequences.',
      ongoingZh: '留下了一道门，也仍在担心门最终会放进什么。',
      ongoingEn: 'A gate now exists, along with the unresolved fear of what it may admit.'
    },
    己: {
      element: '土', yang: false, asset: ASSET_BASE + 'ji-earth.png', poses: poseSet('ji-earth'),
      nameZh: '沃野', nameEn: 'Woye', roleZh: '沃土', roleEn: 'Fertile Ground',
      tagsZh: ['承接', '养育', '包容'], tagsEn: ['Receiving', 'Nurturing', 'Holding'],
      descZh: '让零散的人事物拥有继续生长的地方。沃野很少拒绝，也很难分清哪些东西已经不该继续留下。',
      descEn: 'Woye gives scattered people and things somewhere to keep growing—rarely refusing, and often unsure what should no longer remain.',
      scarZh: '任何东西都能在沃野身上长起来，包括不该长的东西。',
      scarEn: 'Anything can grow in Woye, including what should not.',
      highlightZh: '所有人都在抢救材料时，沃野亲手挑出必须舍弃的部分，为人和水腾出了空间。',
      highlightEn: 'While everyone tried to save every material, Woye chose what had to be left behind and made room for people and water.',
      ongoingZh: '清走过一次堆积，但下一次该留与该弃，仍不会自动变得容易。',
      ongoingEn: 'One pile has been cleared; the next choice between keeping and releasing will not become easy by itself.'
    },
    庚: {
      element: '金', yang: true, asset: ASSET_BASE + 'geng-metal.png', poses: poseSet('geng-metal'),
      nameZh: '运斤', nameEn: 'Yunjin', roleZh: '决断者', roleEn: 'The Decider',
      tagsZh: ['决断', '执行', '承担'], tagsEn: ['Decisive', 'Executing', 'Accountable'],
      descZh: '面对不能继续拖延的事，运斤会完成那一步。果断不是无情，而是知道总得有人承担不可撤回的结果。',
      descEn: 'When delay is no longer possible, Yunjin completes the step. Decisiveness is not cruelty; it is accepting an irreversible outcome someone must carry.',
      scarZh: '所有果断都建立在「总得有人来做」上，却从来没有人为此道谢。',
      scarEn: 'Every decision rests on “someone has to do it,” and no one has ever thanked Yunjin for being that person.',
      highlightZh: '九个人都能建议位置，只有运斤能在唯一正确的时刻切断卡死循环的旧渠。',
      highlightEn: 'Nine people could advise the cut; only Yunjin could make it at the single moment when the blocked cycle could still be saved.',
      ongoingZh: '这一次等到了辛的校准；下一次仍可能必须在没人同意时独自落手。',
      ongoingEn: 'This time Yunjin waited for Xin’s calibration; next time may require acting before anyone agrees.'
    },
    辛: {
      element: '金', yang: false, asset: ASSET_BASE + 'xin-metal.png', poses: poseSet('xin-metal'),
      nameZh: '瑾瑜', nameEn: 'Jinyu', roleZh: '校准者', roleEn: 'The Calibrator',
      tagsZh: ['标准', '精度', '克制'], tagsEn: ['Standards', 'Precision', 'Restraint'],
      descZh: '看见决定成败的细小误差，让粗糙的东西真正成器。瑾瑜也可能用完美，把一切永远挡在「还差一点」。',
      descEn: 'Jinyu sees the small errors that decide outcomes and turns rough work into something usable—while perfection can leave everything forever “not quite ready.”',
      scarZh: '害怕被使用，因为被使用就会留下磨损。',
      scarEn: 'Jinyu fears being used, because use always leaves wear.',
      highlightZh: '时间耗尽前，瑾瑜给出了并不完美却足以继续运行的安全范围，并说：「可以了。」',
      highlightEn: 'As time ran out, Jinyu defined a safe range that was imperfect but workable, and said: “It is enough.”',
      ongoingZh: '允许过一次误差，却还没有停止害怕下一道划痕。',
      ongoingEn: 'One imperfection has been allowed; the fear of the next scratch remains.'
    },
    壬: {
      element: '水', yang: true, asset: ASSET_BASE + 'ren-water.png', poses: poseSet('ren-water'),
      nameZh: '既望', nameEn: 'Jiwang', roleZh: '奔流', roleEn: 'The Current',
      tagsZh: ['流动', '远见', '见识'], tagsEn: ['Movement', 'Horizon', 'Experience'],
      descZh: '看见远方，也能推动跨越整座城的变化。既望的问题从来不是走不动，而是不知道什么时候应该放慢。',
      descEn: 'Jiwang sees far away and can move change across the whole city. The difficulty is never movement—it is knowing when to slow down.',
      scarZh: '唯一走出去又回来的人；回来不是因为舍不得，而是因为外面也一样。',
      scarEn: 'The only one to leave and return—not from longing for home, but because the outside was the same.',
      highlightZh: '只有既望能改变外河整股流向，并把大水压到足以听见一滴细水的速度。',
      highlightEn: 'Only Jiwang could turn the outer river and slow a vast current enough to hear a single drop.',
      ongoingZh: '放慢过一次，远方仍不断要求既望继续向前。',
      ongoingEn: 'Jiwang slowed once; the horizon continues to call.'
    },
    癸: {
      element: '水', yang: false, asset: ASSET_BASE + 'gui-water.png', poses: poseSet('gui-water'),
      comic: Object.freeze({ titleZh: '印子干了以后', titleEn: 'After the Marks Dried', asset: COMIC_BASE + 'gui-xueni-yinzigan-v1.png' }),
      nameZh: '雪泥', nameEn: 'Xueni', roleZh: '细雨', roleEn: 'Fine Rain',
      tagsZh: ['感知', '渗透', '倾听'], tagsEn: ['Sensing', 'Permeating', 'Listening'],
      descZh: '能进入所有人忽略的细处，让影响在很久之后抵达。雪泥太擅长不被察觉，也容易让重要的话来得太迟。',
      descEn: 'Xueni reaches the smallest overlooked places and lets effects arrive much later—so skilled at going unnoticed that important words can come too late.',
      scarZh: '太擅长不被察觉，以至于开始怀疑自己是否真的在场过。',
      scarEn: 'Xueni has become so good at going unnoticed that even their own presence feels uncertain.',
      highlightZh: '改变全城节拍的只是一滴提前的水；雪泥在它仍然只是一滴时，让九个人都看见了。',
      highlightEn: 'The city’s rhythm shifted because one drop arrived early; Xueni made all nine others see it while it was still only a drop.',
      ongoingZh: '当面说出过一次问题，下一句话是否仍会等待三天，没有答案。',
      ongoingEn: 'One problem was spoken aloud; whether the next sentence waits three days remains unknown.'
    }
  };

  const PEER_STORIES = {
    木: { titleZh: '同一束光', titleEn: 'The Same Light', storyZh: '甲撑住结构，乙沿着结构找到另一条路。两人天然理解彼此，也会争同一束光：像你的人，最知道你的力量，也最容易碰到你的边界。', storyEn: 'Jia holds the structure while Yi finds another route along it. They understand each other instinctively and still compete for the same light.' },
    火: { titleZh: '白天的一盏灯', titleEn: 'A Lamp in Daylight', storyZh: '丙让所有人看见，丁让一个细节不被淹没。同样是火，一个扩大可见度，一个保存准确度。', storyEn: 'Bing makes everyone visible; Ding keeps one detail from disappearing. One expands attention, the other preserves precision.' },
    土: { titleZh: '该留下哪一株', titleEn: 'What Should Remain', storyZh: '戊负责拒绝，己负责容纳。边界太近会伤害生命，边界太远又会让一切无法呼吸。', storyEn: 'Wu refuses; Ji receives. A boundary too close harms life, while one too far leaves nothing room to breathe.' },
    金: { titleZh: '今天必须交付', titleEn: 'It Must Ship Today', storyZh: '庚怕来不及，辛怕不够好。真正可用的标准，永远发生在果断与精度之间。', storyEn: 'Geng fears being too late; Xin fears not being good enough. Usable work lives between decision and precision.' },
    水: { titleZh: '河不知道雨', titleEn: 'The River Does Not Know the Rain', storyZh: '壬看见整条河，癸看见一滴提前的水。范围与精度缺少任何一边，都无法找到真正的失衡。', storyEn: 'Ren sees the whole river; Gui sees one early drop. Neither range nor precision can locate imbalance alone.' }
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
    const cards = [
      {
        key: 'peer', kind: 'peer', label: en ? 'Kin' : '同类', term: en ? '比劫 · peers' : '比劫',
        plain: en ? 'Like you, and reaching for the same light' : '像你，也会和你争同一束光',
        relatedStems: peerStems, related: namesFor(peerStems, lang)
      },
      {
        key: 'output', kind: 'generate', label: en ? 'I generate' : '我生', term: en ? '食伤 · output' : '食伤',
        plain: en ? 'What you give also costs you' : '你交出去，也会被消耗',
        relatedStems: outputStems, related: namesFor(outputStems, lang)
      },
      {
        key: 'source', kind: 'source', label: en ? 'Generates me' : '生我', term: en ? '印 · support' : '印',
        plain: en ? 'Supports you, and may become dependence' : '托住你，也可能让你依赖',
        relatedStems: sourceStems, related: namesFor(sourceStems, lang)
      },
      {
        key: 'control', kind: 'control', label: en ? 'I regulate' : '我制', term: en ? '财 · stewardship' : '财',
        plain: en ? 'You can handle it, and must bear the outcome' : '你能处理，也要承担后果',
        relatedStems: controlledStems, related: namesFor(controlledStems, lang)
      },
      {
        key: 'pressure', kind: 'pressure', label: en ? 'Regulates me' : '制我', term: en ? '官杀 · pressure' : '官杀',
        plain: en ? 'Presses you, and forces you into shape' : '让你受压，也迫使你成形',
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
        relatedStems: [other], related: namesFor([other], lang)
      });
    });
    return cards;
  }

  global.SinanCharacters = Object.freeze({
    assetBase: ASSET_BASE,
    stemOrder: STEM_ORDER.slice(),
    elementOrder: ELEMENT_ORDER.slice(),
    get: character,
    text: textOf,
    relationCards,
    namesFor
  });
})(window);
