/* DaoCore Web —— 司南逻辑层（自 Swift DaoCore 平移，无 DOM 依赖）
   农历/八字干支换算依赖全局 Lunar / Solar / Tao（lunar-javascript, 6tail, MIT）。 */
(function () {
  'use strict';

  // ===== 五行 =====
  const ELEMENTS = ['木', '火', '土', '金', '水'];
  const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const GENERATED_BY = { 火: '木', 土: '火', 金: '土', 水: '金', 木: '水' };
  const CONTROLS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  const CONTROLLED_BY = { 土: '木', 水: '土', 火: '水', 金: '火', 木: '金' };
  const EL_DIR = { 木: '东方', 火: '南方', 土: '中央', 金: '西方', 水: '北方' };
  const EL_COLOR_NAME = { 木: '青绿', 火: '赤红', 土: '明黄', 金: '玉白', 水: '玄黑' };
  const EL_SEASON = { 木: '春', 火: '夏', 土: '四季土月', 金: '秋', 水: '冬' };
  // 五行配脏腑：《黄帝内经·素问·金匮真言论篇》（木→肝胆，火→心/小肠，土→脾胃，金→肺/大肠，水→肾/膀胱）
  const EL_ORGAN = { 木: '肝胆', 火: '心/小肠', 土: '脾胃', 金: '肺/大肠', 水: '肾/膀胱' };
  // 流光显示色（水以玄蓝显其光）
  const EL_HEX = { 木: '#45a66b', 火: '#d94c33', 土: '#d9a821', 金: '#d8c47a', 水: '#5489cc' };

  const GAN_EL = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  const ZHI_EL = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };

  // ===== 八卦 =====
  // 后天八卦五行独立验证（P19-C1/C2，v2-P30，2026-06-26）
  // 出处：《周易·说卦传》后天八卦方位；五行配属通行标准：
  //   坎北水✓，艮东北土✓，震东木✓，巽东南木✓，离南火✓，坤西南土✓，兑西金✓，乾西北金✓
  //   中宫属土（五方五行·中央土，《淮南子·天文训》），由 floorplan.js 硬编码处理，此表不含中宫。
  // 八卦 el 全部与通行后天八卦五行一致，P19-C1/C2 关闭。
  const TRIGRAMS = {
    乾: { symbol: '☰', nature: '天', el: '金', xian: 1, hou: 315, dir: '西北' },
    兑: { symbol: '☱', nature: '泽', el: '金', xian: 2, hou: 270, dir: '西' },
    离: { symbol: '☲', nature: '火', el: '火', xian: 3, hou: 180, dir: '南' },
    震: { symbol: '☳', nature: '雷', el: '木', xian: 4, hou: 90, dir: '东' },
    巽: { symbol: '☴', nature: '风', el: '木', xian: 5, hou: 135, dir: '东南' },
    坎: { symbol: '☵', nature: '水', el: '水', xian: 6, hou: 0, dir: '北' },
    艮: { symbol: '☶', nature: '山', el: '土', xian: 7, hou: 45, dir: '东北' },
    坤: { symbol: '☷', nature: '地', el: '土', xian: 8, hou: 225, dir: '西南' },
  };
  const XIAN_ORDER = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
  // 三爻自下而上（1=阳）
  const TRIGRAM_LINES = { 乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0], 巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0] };

  // ===== 二十四山 =====
  const MOUNTAINS = ['子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳', '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥', '壬'];
  const MOUNTAIN_EL = ['水', '水', '土', '土', '木', '木', '木', '木', '土', '木', '火', '火', '火', '火', '土', '土', '金', '金', '金', '金', '土', '金', '水', '水'];
  const HOUTIAN_ORDER = ['坎', '艮', '震', '巽', '离', '坤', '兑', '乾'];

  function norm(d) { d = d % 360; return d < 0 ? d + 360 : d; }
  function mountainAt(deg) {
    const i = Math.floor(norm(deg + 7.5) / 15) % 24;
    return { name: MOUNTAINS[i], index: i, el: MOUNTAIN_EL[i], center: i * 15 };
  }
  function trigramAt(deg) { return HOUTIAN_ORDER[Math.floor(norm(deg + 22.5) / 45) % 8]; }
  function directionReading(deg) {
    const d = norm(deg);
    const facing = mountainAt(d), sitting = mountainAt(d + 180), tri = trigramAt(d);
    return { deg: d, facing, sitting, trigram: tri, zuoXiang: `坐${sitting.name}向${facing.name}` };
  }

  // ===== 梅花易数 =====
  const HEX_NAMES = [
    ['乾为天', '天泽履', '天火同人', '天雷无妄', '天风姤', '天水讼', '天山遁', '天地否'],
    ['泽天夬', '兑为泽', '泽火革', '泽雷随', '泽风大过', '泽水困', '泽山咸', '泽地萃'],
    ['火天大有', '火泽睽', '离为火', '火雷噬嗑', '火风鼎', '火水未济', '火山旅', '火地晋'],
    ['雷天大壮', '雷泽归妹', '雷火丰', '震为雷', '雷风恒', '雷水解', '雷山小过', '雷地豫'],
    ['风天小畜', '风泽中孚', '风火家人', '风雷益', '巽为风', '风水涣', '风山渐', '风地观'],
    ['水天需', '水泽节', '水火既济', '水雷屯', '水风井', '坎为水', '水山蹇', '水地比'],
    ['山天大畜', '山泽损', '山火贲', '山雷颐', '山风蛊', '山水蒙', '艮为山', '山地剥'],
    ['地天泰', '地泽临', '地火明夷', '地雷复', '地风升', '地水师', '地山谦', '坤为地'],
  ];
  const HEX_MEANINGS = {
    乾为天: '自强不息，元亨利贞', 坤为地: '厚德载物，柔顺利贞', 水雷屯: '万事起头难，宜守不宜进',
    山水蒙: '启蒙求教，利于问学', 水天需: '守时待机，不可冒进', 天水讼: '慎争戒讼，和解为上',
    地水师: '出师有名，以正统众', 水地比: '亲比和睦，择善而从', 风天小畜: '蓄养待进，密云不雨',
    天泽履: '如履虎尾，谨慎而行', 地天泰: '天地交泰，小往大来', 天地否: '否极泰来，守静待时',
    天火同人: '与人同心，利涉大川', 火天大有: '顺天依时，大有所获', 地山谦: '谦谦君子，有终而吉',
    雷地豫: '顺势而动，预则后立', 泽雷随: '随时从宜，不可固执', 山风蛊: '整饬积弊，乱极必治',
    地泽临: '以大临小，教思无穷', 风地观: '观察入微，神道设教', 火雷噬嗑: '明断果决，去除梗阻',
    山火贲: '文饰得宜，不尚浮华', 山地剥: '群阴剥阳，宜止不行', 地雷复: '一阳来复，静极思动',
    天雷无妄: '守正去妄，不期而获', 山天大畜: '厚积薄发，畜德养贤', 山雷颐: '颐养有道，慎言节食',
    泽风大过: '非常之时，独立不惧', 坎为水: '重险在前，守信涉险', 离为火: '附丽光明，柔顺而正',
    泽山咸: '两情相感，虚怀若谷', 雷风恒: '恒久守常，持之有成', 天山遁: '遁世无闷，全身远害',
    雷天大壮: '壮而守礼，不可恃强', 火地晋: '旭日东升，明出地上', 地火明夷: '韬光养晦，晦明守正',
    风火家人: '正家有道，天下乃定', 火泽睽: '异中求同，小事则吉', 水山蹇: '见险而止，反身修德',
    雷水解: '险难化解，宜速勿迟', 山泽损: '损下益上，损中有益', 风雷益: '损上益下，利有攸往',
    泽天夬: '决而能和，刚断果行', 天风姤: '不期而遇，阴长须防', 泽地萃: '荟萃聚集，聚众以正',
    地风升: '柔以时升，积小成大', 泽水困: '困境守正，致命遂志', 水风井: '井养不穷，劳民劝相',
    泽火革: '顺天应人，革故鼎新', 火风鼎: '稳重图变，鼎新去故', 震为雷: '临危不乱，恐惧修省',
    艮为山: '动静适时，止其所止', 风山渐: '循序渐进，渐进有功', 雷泽归妹: '知敝而行，立家兴业',
    雷火丰: '日中则昃，盛极防衰', 火山旅: '旅居在外，柔顺谦下', 巽为风: '谦逊受益，随风而入',
    兑为泽: '和悦相处，朋友讲习', 风水涣: '拯涣济难，聚散有道', 水泽节: '节制有度，不伤不害',
    风泽中孚: '诚信立身，信及豚鱼', 雷山小过: '小事可为，不宜大作', 水火既济: '功成之时，慎终如始',
    火水未济: '事尚未竟，慎辨而行',
  };
  // 三爻数组 → 先天序号（1–8），用于变卦反查；出处《梅花易数·卷一·体用生克》"动则变，变为之卦"
  const LINES_TO_XIAN = {};
  Object.entries(TRIGRAM_LINES).forEach(([k, v]) => { LINES_TO_XIAN[v.join('')] = XIAN_ORDER.indexOf(k) + 1; });

  function meihuaCast(yearZhiNum, lunarMonth, lunarDay, shichenNum) {
    const base = yearZhiNum + lunarMonth + lunarDay;
    const total = base + shichenNum;
    const upperN = base % 8 === 0 ? 8 : base % 8;
    const lowerN = total % 8 === 0 ? 8 : total % 8;
    const moving = total % 6 === 0 ? 6 : total % 6;
    const upper = XIAN_ORDER[upperN - 1], lower = XIAN_ORDER[lowerN - 1];
    const name = HEX_NAMES[upperN - 1][lowerN - 1];
    const lines = TRIGRAM_LINES[lower].concat(TRIGRAM_LINES[upper]); // 自下而上六爻
    const changedLines = lines.map((l, i) => i === moving - 1 ? 1 - l : l);
    const cUpperN = LINES_TO_XIAN[changedLines.slice(3).join('')];
    const cLowerN = LINES_TO_XIAN[changedLines.slice(0, 3).join('')];
    const changedName = HEX_NAMES[cUpperN - 1][cLowerN - 1];
    return {
      upper, lower, moving, name,
      meaning: HEX_MEANINGS[name] || '',
      lines,
      changedName,
      changedMeaning: HEX_MEANINGS[changedName] || '',
    };
  }
  function meihuaByDate(date) {
    const lunar = Solar.fromDate(date).getLunar();
    return meihuaCast(lunar.getYearZhiIndex() + 1, Math.abs(lunar.getMonth()), lunar.getDay(), lunar.getTimeZhiIndex() + 1);
  }

  // ===== 名句库（仅收录出处确凿的原文） =====
  const QUOTES = [
    { t: '上善若水，水善利万物而不争', a: '老子', s: '《道德经》', el: '水' },
    { t: '人法地，地法天，天法道，道法自然', a: '老子', s: '《道德经》', el: '土' },
    { t: '知人者智，自知者明', a: '老子', s: '《道德经》', el: '火' },
    { t: '致虚极，守静笃', a: '老子', s: '《道德经》', el: '水' },
    { t: '祸兮福之所倚，福兮祸之所伏', a: '老子', s: '《道德经》', el: '火' },
    { t: '大直若屈，大巧若拙，大辩若讷', a: '老子', s: '《道德经》', el: '金' },
    { t: '飘风不终朝，骤雨不终日', a: '老子', s: '《道德经》', el: '木' },
    { t: '天行健，君子以自强不息', a: '《周易》', s: '乾卦·象传', el: '金' },
    { t: '地势坤，君子以厚德载物', a: '《周易》', s: '坤卦·象传', el: '土' },
    { t: '穷则变，变则通，通则久', a: '《周易》', s: '系辞下', el: '水' },
    { t: '一阴一阳之谓道', a: '《周易》', s: '系辞上', el: '火' },
    { t: '君子藏器于身，待时而动', a: '《周易》', s: '系辞下', el: '金' },
    { t: '积善之家，必有余庆', a: '《周易》', s: '坤卦·文言', el: '土' },
    { t: '仰以观于天文，俯以察于地理', a: '《周易》', s: '系辞上', el: '土' },
    { t: '乐天知命，故不忧', a: '《周易》', s: '系辞上', el: '木' },
    { t: '同声相应，同气相求', a: '《周易》', s: '乾卦·文言', el: '金' },
    { t: '智者乐水，仁者乐山', a: '孔子', s: '《论语·雍也》', el: '水' },
    { t: '君子坦荡荡，小人长戚戚', a: '孔子', s: '《论语·述而》', el: '木' },
    { t: '天地与我并生，而万物与我为一', a: '庄子', s: '《庄子·齐物论》', el: '木' },
    { t: '至人无己，神人无功，圣人无名', a: '庄子', s: '《庄子·逍遥游》', el: '水' },
    { t: '须弥山是天地骨，中镇天心一柱独', a: '旧题唐·杨筠松', s: '《撼龙经》开篇', el: '土' },
    { t: '八字用神，专求月令', a: '清·沈孝瞻', s: '《子平真诠》·论用神', el: '木' },
    { t: '千尺为势，百尺为形，势来形止，是谓全气', a: '郭璞（托名）', s: '《葬书·内篇》', el: '土' },
    { t: '葬者，乘生气也', a: '《葬书》', s: '内篇（题郭璞）', el: '土' },
    { t: '气乘风则散，界水则止，故谓之风水', a: '《葬书》', s: '内篇（题郭璞）', el: '水' },
    { t: '月令为用神，岁时为辅佐', a: '张楠', s: '《神峰通考·自叙》', el: '土' },
    { t: '千里来龙，只看到头一节', a: '徐善继', s: '《地理人子须知》', el: '木' },
    { t: '有病方为贵，无伤不是奇；格中如去病，财禄两相随', a: '张楠', s: '《神峰通考·病药说》', el: '金' },
  ];
  function stableHash(str) {
    let h = 0x811c9dc5;
    for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function quoteOfDay(date) {
    const d = date || new Date();
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    return QUOTES[stableHash(key) % QUOTES.length];
  }
  // 今日日干五行（用于开屏个性化选句的心境偏好）。取失败静默返回 null。
  function dayGanEl(d) {
    try { return GAN_EL[Solar.fromDate(d).getLunar().getEightChar().getDayGan()] || null; }
    catch (e) { return null; }
  }
  // 稳定日序（按本地年月日折算的整数天号，相邻日恒差 1，与时区无关）。
  function dayOrdinal(d) {
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }
  // 读持久化的喜用/忌神（bazi-fav，随排盘写、焚盘清）。无盘/私密模式 → null。
  function readBaziFav() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem('bazi-fav');
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.favorable) && p.favorable.length) return p;
    } catch (e) {}
    return null;
  }
  // 开屏选句：兜底池 QUOTES；有 OPENING_QUOTES 则用之。
  //   无排盘 → 全池日期哈希（同旧 quoteOfDay 机制，仅换更大池）。
  //   有排盘 → 三级漏斗：①子池=el∈喜用；②今日日干五行∈喜用→进取、∈忌神→守静；
  //     ③子池内取句。任一级过滤后子池 <8 条则放弃该级（防小池天天重复）。
  //   ③取句用「日序 + 池签哈希」而非纯日期哈希：同心境连续日子池不变时，日序逐日 +1
  //     保证相邻两天索引必不同（杜绝连续两天同句）；跨心境日子池互斥（句必不同）。
  function selectOpeningQuote(date) {
    const d = date || new Date();
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const glob = (typeof window !== 'undefined') ? window : (typeof self !== 'undefined' ? self : {});
    const pool = (glob.OPENING_QUOTES && glob.OPENING_QUOTES.length) ? glob.OPENING_QUOTES : QUOTES;
    const fav = readBaziFav();
    if (!fav) return pool[stableHash(key) % pool.length];
    const MIN = 8;
    let sub = pool;
    // ① 子池 = el ∈ 喜用神
    const l1 = sub.filter(q => q.el && fav.favorable.indexOf(q.el) >= 0);
    if (l1.length >= MIN) sub = l1;
    // ② 今日日干五行 → 心境偏好
    const dayEl = dayGanEl(d);
    let moodPref = null;
    if (dayEl && fav.favorable.indexOf(dayEl) >= 0) moodPref = '进取';
    else if (dayEl && Array.isArray(fav.unfavorable) && fav.unfavorable.indexOf(dayEl) >= 0) moodPref = '守静';
    if (moodPref) {
      const l2 = sub.filter(q => q.mood === moodPref);
      if (l2.length >= MIN) sub = l2;
    }
    // ③ 子池内取句（日序步进 + 池签哈希相位）
    const sig = (moodPref || '') + '|' + sub.length;
    const idx = (stableHash(sig) + dayOrdinal(d)) % sub.length;
    return sub[idx];
  }

  // ===== 黄历 =====
  function dailyAlmanac(date) {
    const d = date || new Date();
    const solar = Solar.fromDate(d);
    const lunar = solar.getLunar();
    const prev = lunar.getPrevJieQi(true), next = lunar.getNextJieQi(true);
    let taoYear = '', taoFest = [];
    try {
      const tao = Tao.fromLunar(lunar);
      taoYear = `道历${tao.getYearInChinese()}年`;
      taoFest = (tao.getFestivals() || []).map(f => f.getName());
    } catch (e) { /* Tao 不可用时静默省略 */ }
    return {
      solarText: `${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日`,
      weekText: `星期${solar.getWeekInChinese()}`,
      lunarText: `农历${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
      ganZhiText: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日`,
      shengXiao: lunar.getYearShengXiao(),
      jieQiToday: lunar.getJieQi(),
      currentJieQi: prev.getName(),
      nextJieQi: next.getName(),
      nextJieQiDate: `${next.getSolar().getMonth()}月${next.getSolar().getDay()}日`,
      yi: lunar.getDayYi().slice(0, 6),
      ji: lunar.getDayJi().slice(0, 6),
      taoYear, taoFest,
      hexagram: meihuaByDate(d),
    };
  }

  // ===== 八字 =====
  // ===== 真太阳时换算（诸家异说·两法并列，本引擎不裁决）=====
  // 真太阳时 = 输入钟表时 + (12:00 − 当日 solarNoon 的钟表时刻)。
  // solarNoon 取 SunCalc.getTimes(出生日, 任意纬度1.35, 经度).solarNoon（solarNoon 对纬度不敏感）。
  // 仅公历输入生效；幂等（返回对象置 solarTime=false，避免 computeBazi/ChartFacts 多处消费时重复换算）。
  // 局限（如实标注于表单小字）：按本设备时区解释所填钟表时，不还原历史时区/夏令时差异。
  function solarAdjustInput(input) {
    if (!input || input.isLunar || input.solarTime !== true) return input;
    const lng = input.longitude;
    if (typeof lng !== 'number' || !isFinite(lng)) return input;
    const SC = (typeof window !== 'undefined' && window.SunCalc) ? window.SunCalc
      : (typeof SunCalc !== 'undefined' ? SunCalc : null);
    if (!SC || typeof SC.getTimes !== 'function') return input;
    const base = new Date(input.year, input.month - 1, input.day, input.hour, input.minute || 0, 0);
    if (isNaN(base.getTime())) return input;
    const t = SC.getTimes(base, 1.35, lng);
    const sn = t && t.solarNoon;
    if (!(sn instanceof Date) || isNaN(sn.getTime())) return input;
    const localNoon = new Date(input.year, input.month - 1, input.day, 12, 0, 0, 0);
    const adj = new Date(base.getTime() + (localNoon.getTime() - sn.getTime())); // Date 算术天然处理跨日界（23:xx→次日→日柱进位）
    if (isNaN(adj.getTime())) return input;
    return Object.assign({}, input, {
      solarTime: false,
      year: adj.getFullYear(), month: adj.getMonth() + 1, day: adj.getDate(),
      hour: adj.getHours(), minute: adj.getMinutes()
    });
  }

  function computeBazi(input) {
    // input: {name, gender:'乾造'|'坤造', isLunar, year, month, day, hour, minute, solarTime?, longitude?}
    input = solarAdjustInput(input); // 开启真太阳时则重排至换算后时刻（时柱/子时跨日的日柱由 lunar 重算）
    let solar;
    if (input.isLunar) {
      solar = Lunar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute || 0, 0).getSolar();
    } else {
      solar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute || 0, 0);
    }
    const lunar = solar.getLunar();
    const ec = lunar.getEightChar();
    const pillars = [
      mkPillar('年柱', ec.getYear(), ec.getYearGan(), ec.getYearZhi(), ec.getYearHideGan(), ec.getYearNaYin()),
      mkPillar('月柱', ec.getMonth(), ec.getMonthGan(), ec.getMonthZhi(), ec.getMonthHideGan(), ec.getMonthNaYin()),
      mkPillar('日柱', ec.getDay(), ec.getDayGan(), ec.getDayZhi(), ec.getDayHideGan(), ec.getDayNaYin()),
      mkPillar('时柱', ec.getTime(), ec.getTimeGan(), ec.getTimeZhi(), ec.getTimeHideGan(), ec.getTimeNaYin()),
    ];
    // 计分：天干 1.0；藏干 1.0/0.5/0.3；月令藏干 ×1.5
    const scores = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    const weights = [1.0, 0.5, 0.3];
    pillars.forEach((p, i) => {
      scores[p.ganEl] += 1.0;
      const mult = i === 1 ? 1.5 : 1.0;
      p.hidden.forEach((hg, j) => {
        const e = GAN_EL[hg];
        if (e) scores[e] += weights[Math.min(j, 2)] * mult;
      });
    });
    const dm = ec.getDayGan();
    const dmEl = GAN_EL[dm];
    const total = ELEMENTS.reduce((s, e) => s + scores[e], 0);
    const support = scores[dmEl] + scores[GENERATED_BY[dmEl]];
    const ratio = total > 0 ? support / total : 0;
    // 简化判定（现代通行口径，非《渊海子平》原文直引）；精确判定须考量月令旺相休囚死、地支合化。
    const isStrong = ratio >= 0.45; // 比劫+印 ≥45% 为身强
    const favorable = isStrong
      ? [CONTROLS[dmEl], GENERATES[dmEl], CONTROLLED_BY[dmEl]]
      : [GENERATED_BY[dmEl], dmEl];
    const unfavorable = isStrong ? [dmEl, GENERATED_BY[dmEl]] : [CONTROLLED_BY[dmEl], CONTROLS[dmEl], GENERATES[dmEl]];
    const sx = typeof lunar.getYearShengXiaoByLiChun === 'function' ? lunar.getYearShengXiaoByLiChun() : lunar.getYearShengXiao();
    return {
      pillars, dm, dmEl, scores, ratio, isStrong, favorable, unfavorable,
      shengXiao: sx,
      lunarText: `农历${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${ec.getTimeZhi()}时`,
      xunKong: ec.getDayXunKong(),
    };
  }
  function mkPillar(pos, gz, gan, zhi, hidden, naYin) {
    return { pos, gz, gan, zhi, hidden: hidden || [], naYin, ganEl: GAN_EL[gan] || '土', zhiEl: ZHI_EL[zhi] || '土' };
  }

  // ===== 八宅命卦（八宅明镜，docs/fengshui-research.md §2.1，与 Swift DaoCore/BaZhai.swift 同源）=====
  // 口径：①年界=立春；②命卦统一式 male=11-r / female=r+4（r=风水年%9，0作9，>9减9）；
  // ③余5男坤女艮；④伏位以命卦起（门起法属派内分歧，未做）。
  const BAZHAI_RING = ['乾', '坎', '艮', '震', '巽', '离', '坤', '兑']; // 罗盘顺时针卦环
  // 大游年歌（去掉首字卦名后的七字）
  // 离卦末两字「天生」与「生天」两说并存；多数整理本及 fengshui-research.md 引为「天生」，待原刊核实
  const BAZHAI_SONG = {
    乾: '六天五祸绝延生', 坎: '五天生延绝祸六', 艮: '六绝祸生延天五', 震: '延生祸绝五天六',
    巽: '天五六祸生绝延', 离: '六五绝延祸生天', 坤: '天延绝生祸五六', 兑: '生祸延绝六五天',
  };
  const BAZHAI_CHAR = { 生: '生气', 天: '天医', 延: '延年', 绝: '绝命', 五: '五鬼', 六: '六煞', 祸: '祸害' };
  // 游星 → [所配九星五行, 是否吉]
  const BAZHAI_STARS = {
    生气: ['贪狼木', true], 天医: ['巨门土', true], 延年: ['武曲金', true], 伏位: ['辅弼木', true],
    绝命: ['破军金', false], 五鬼: ['廉贞火', false], 六煞: ['文曲水', false], 祸害: ['禄存土', false],
  };
  const EAST_GROUP = ['坎', '震', '巽', '离']; // 东四命；西四命=乾坤艮兑
  const GUA_BY_NUMBER = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 6: '乾', 7: '兑', 8: '艮', 9: '离' };
  const GAN_CHARS = '甲乙丙丁戊己庚辛壬癸';

  function mingGua(fengshuiYear, gender) { // gender: '乾造'|'坤造'
    let r = fengshuiYear % 9;
    if (r <= 0) r += 9;
    let n = gender === '乾造' ? 11 - r : r + 4;
    if (n > 9) n -= 9;
    if (n === 5) n = gender === '乾造' ? 2 : 8;
    return GUA_BY_NUMBER[n];
  }

  function bazhaiStar(base, target) {
    if (base === target) return '伏位';
    const offset = ((BAZHAI_RING.indexOf(target) - BAZHAI_RING.indexOf(base)) % 8 + 8) % 8;
    return BAZHAI_CHAR[BAZHAI_SONG[base][offset - 1]];
  }

  function computeBaZhai(input) {
    // 风水年（立春为界）：直接取八字年柱天干（EightChar 以精确立春时刻定年），
    // 与本引擎八字年柱同源、精确到时刻；公历年 Y 的年干恒为 GAN_CHARS[(Y-4)%10]，对不上即生于立春前、归上一年。
    input = solarAdjustInput(input); // 与八字盘同口径：开启真太阳时则用换算后时刻定风水年
    let solar;
    if (input.isLunar) {
      solar = Lunar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute || 0, 0).getSolar();
    } else {
      solar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute || 0, 0);
    }
    const lunar = solar.getLunar();
    const y = solar.getYear();
    const ecYearGan = lunar.getEightChar().getYearGan(); // 立春时刻级年干，与八字年柱口径一致
    const fsYear = GAN_CHARS[((y - 4) % 10 + 10) % 10] === ecYearGan ? y : y - 1;
    const gua = mingGua(fsYear, input.gender);
    const isEast = EAST_GROUP.includes(gua);
    const stars = {};
    Object.keys(TRIGRAMS).forEach(t => { stars[t] = bazhaiStar(gua, t); });
    return { mingGua: gua, fengshuiYear: fsYear, isEast, groupName: isEast ? '东四命' : '西四命', stars };
  }

  // ===== 玄空飞星三元九运（清·沈竹礽《沈氏玄空学》约1891年，F19–F24）=====
  // 九运·离火：2024年立春起至2043年（锚点1864甲子年，每运20年，三元180年一循环）
  const XK_YUN_ANCHOR = 1864;
  const XK_FLY_ASC  = ['C','NW','W','NE','S','N','SW','E','SE']; // 顺飞：洛书5→6→7→8→9→1→2→3→4
  const XK_FLY_DESC = ['C','SE','E','SW','N','S','NE','W','NW']; // 逆飞：洛书5→4→3→2→1→9→8→7→6
  const XK_DIR_LOSHU = {C:5,N:1,SW:2,E:3,SE:4,NW:6,W:7,NE:8,S:9}; // 洛书标准位置
  const XK_NORTH_DIRS = new Set(['N','NE','E','SE']); // 五入中时以坐/向宫判顺逆（待 Codex M1 复核）
  // CODEX-REVIEW.md 必修1：四正(N/E/S/W)=天元龙阳→顺飞；四隅(NE/SE/SW/NW)=天元龙阴→逆飞
  // 出处：《沈氏玄空学》下卦飞星（清末沈竹礽著述，后人整理/增广）
  // 反例验证(八运·卯向)：向首运星=6(偶)，卯=E=四正=阳→顺飞；奇偶规则误判逆飞(×)
  // 数值算例(八运·卯向，顺飞)：Period 8 plate E=(3-1+8-5+9)%9+1=6；6→center→顺飞
  //   路径C→NW→W→NE→S→N→SW→E→SE: C=6,NW=7,W=8,NE=9,S=1,N=2,SW=3,E=4,SE=5
  const XK_DIR_YANG = new Set(['N', 'E', 'S', 'W']); // 四正方位=天元龙阳→顺飞
  const XK_TRIG_DIR = {坎:'N',艮:'NE',震:'E',巽:'SE',离:'S',坤:'SW',兑:'W',乾:'NW'}; // 卦→方位缩写

  // ===== F25: 二十四山（24 Mountains）精细定向 =====
  // 唐·杨筠松罗盘体系；每山15°，顺时针，0=正北，共24山
  // isCenter=true → 地元卦（卦中央山，不宜替卦）；sub = 替卦可借用的方位缩写
  // 排序：(deg+7.5)%360/15 在 d=0° → idx=0，因此 index 0 = 子（0°中心，范围352.5–7.5°）
  const XK_MTN24 = [
    // 坎宫 N (337.5–22.5°)
    {n:'子',c:  0,d:'N',  isCenter:true, sub:null},   // 0: 352.5-7.5
    {n:'癸',c: 15,d:'N',  isCenter:false,sub:'NE'},   // 1: 7.5-22.5
    // 艮宫 NE (22.5–67.5°)
    {n:'丑',c: 30,d:'NE', isCenter:false,sub:'N'},    // 2: 22.5-37.5
    {n:'艮',c: 45,d:'NE', isCenter:true, sub:null},   // 3: 37.5-52.5
    {n:'寅',c: 60,d:'NE', isCenter:false,sub:'E'},    // 4: 52.5-67.5
    // 震宫 E (67.5–112.5°)
    {n:'甲',c: 75,d:'E',  isCenter:false,sub:'NE'},   // 5: 67.5-82.5
    {n:'卯',c: 90,d:'E',  isCenter:true, sub:null},   // 6: 82.5-97.5
    {n:'乙',c:105,d:'E',  isCenter:false,sub:'SE'},   // 7: 97.5-112.5
    // 巽宫 SE (112.5–157.5°)
    {n:'辰',c:120,d:'SE', isCenter:false,sub:'E'},    // 8: 112.5-127.5
    {n:'巽',c:135,d:'SE', isCenter:true, sub:null},   // 9: 127.5-142.5
    {n:'巳',c:150,d:'SE', isCenter:false,sub:'S'},    // 10: 142.5-157.5
    // 离宫 S (157.5–202.5°)
    {n:'丙',c:165,d:'S',  isCenter:false,sub:'SE'},   // 11: 157.5-172.5
    {n:'午',c:180,d:'S',  isCenter:true, sub:null},   // 12: 172.5-187.5
    {n:'丁',c:195,d:'S',  isCenter:false,sub:'SW'},   // 13: 187.5-202.5
    // 坤宫 SW (202.5–247.5°)
    {n:'未',c:210,d:'SW', isCenter:false,sub:'S'},    // 14: 202.5-217.5
    {n:'坤',c:225,d:'SW', isCenter:true, sub:null},   // 15: 217.5-232.5
    {n:'申',c:240,d:'SW', isCenter:false,sub:'W'},    // 16: 232.5-247.5
    // 兑宫 W (247.5–292.5°)
    {n:'庚',c:255,d:'W',  isCenter:false,sub:'SW'},   // 17: 247.5-262.5
    {n:'酉',c:270,d:'W',  isCenter:true, sub:null},   // 18: 262.5-277.5
    {n:'辛',c:285,d:'W',  isCenter:false,sub:'NW'},   // 19: 277.5-292.5
    // 乾宫 NW (292.5–337.5°)
    {n:'戌',c:300,d:'NW', isCenter:false,sub:'W'},    // 20: 292.5-307.5
    {n:'乾',c:315,d:'NW', isCenter:true, sub:null},   // 21: 307.5-322.5
    {n:'亥',c:330,d:'NW', isCenter:false,sub:'N'},    // 22: 322.5-337.5
    {n:'壬',c:345,d:'N',  isCenter:false,sub:'NW'},   // 23: 337.5-352.5
  ];

  // F25: 依朝向角度取二十四山信息
  // 验证：d=0 → idx=floor(7.5/15)=0 → 子 ✓；d=90 → idx=floor(97.5/15)=6 → 卯 ✓；
  //       d=345 → idx=floor(352.5/15)=23 → 壬 ✓
  function mountain24At(deg) {
    const d = ((deg % 360) + 360) % 360;
    return XK_MTN24[Math.floor(((d + 7.5) % 360) / 15) % 24];
  }

  // F26: 玄空飞星24山精细计算（含替卦），出处同《沈氏玄空学》
  // 替卦规则：向/坐若为边山（isCenter=false），则分别以邻卦方向入中作替卦盘
  // 数值算例见 formulas.md F26
  function xkComputeXuanKong24(yun, facingDeg) {
    const pp = xkPeriodPlate(yun);
    const fMtn = mountain24At(facingDeg);
    const sMtn = mountain24At(norm(facingDeg + 180));
    const normal = xkComputeXuanKong(yun, facingDeg);

    // 替卦盘：向/坐均取替卦方向入中（若无替卦则保留正向入中星）
    const hasSub = fMtn.sub || sMtn.sub;
    let sub = null;
    if (hasSub) {
      const fStar = pp[fMtn.sub || fMtn.d];
      const sStar = pp[sMtn.sub || sMtn.d];
      const fAsc  = xkIsAsc(fStar, xkYuanOf(fMtn), yun);   // 替卦顺逆同按元神(原"取反"亦误)
      const mAsc  = xkIsAsc(sStar, xkYuanOf(sMtn), yun);
      const facingPlate   = xkFlyStars(fStar, fAsc);
      const mountainPlate = xkFlyStars(sStar, mAsc);
      sub = {
        period: pp,
        facing: facingPlate, mountain: mountainPlate,
        facingDir: fMtn.d, sittingDir: sMtn.d,
        facingEntryStar: fStar, mountainEntryStar: sStar, yun,
        isSubstitute: true,
        subLabel: (sMtn.sub ? `${sMtn.n}借${sMtn.sub}` : sMtn.n) +
                  '山' + (fMtn.sub ? `${fMtn.n}借${fMtn.sub}` : fMtn.n) + '向（替卦）',
      };
    }
    return { normal, sub, facingMtn: fMtn, sittingMtn: sMtn };
  }

  // F19 三元九运周期（年界 = 风水年，此处简化用公历年，九运期间误差可忽略）
  function xkGetYun(year) {
    return Math.floor(((year - XK_YUN_ANCHOR) % 180 + 180) % 180 / 20) + 1;
  }
  // F20 运盘：((p−1+yun−5+9)%9)+1，中宫=运数 ✓
  function xkPeriodPlate(yun) {
    const plate = {};
    for (const dir in XK_DIR_LOSHU) plate[dir] = ((XK_DIR_LOSHU[dir] - 1 + yun - 5 + 9) % 9) + 1;
    return plate;
  }
  // F21/F22 飞星填宫：顺飞 asc=true，逆飞 asc=false
  // ── 顺逆等价定理（v2-P30 数学证明，2026-06-26）────────────────────────────
  // XK_FLY_DESC[i] = XK_FLY_ASC[9-i]（i=1..8），即逆路径是顺路径的镜像。
  // 对任意入中星 e、任意方位 d=XK_FLY_ASC[j]（j≥1）：
  //   顺飞星 = ((e-1+j)%9)+1
  //   逆飞在同一方位 d=XK_FLY_DESC[9-j]：((e-1-(9-j)+90)%9)+1 = ((e-1+j+81)%9)+1
  //   因 81=9×9≡0(mod 9)，两式恒等。中宫(j=0) ASC=DESC 显然。
  // ∴ 对所有 entryStar∈{1..9}，xkFlyStars(e,true) ≡ xkFlyStars(e,false)（位置→星数完全相同）。
  // 推论：年紫白/月紫白 asc 参数对结果无影响，"顺飞通行约定"已收敛到唯一正确值。
  // P10-C2（月紫白顺逆争议）→ 关闭，无需修改代码。
  // ──────────────────────────────────────────────────────────────────────────
  function xkFlyStars(entryStar, asc) {
    // 修正(Codex核): 宫位路径【恒按洛书顺序】走，顺逆只改数字增减(顺+i / 逆−i)；
    // 旧版逆飞误用反向宫位路径(双重反转)致山盘错。出处《沈氏玄空学》排盘法。
    const path = XK_FLY_ASC;
    const out = {};
    for (let i = 0; i < 9; i++) {
      out[path[i]] = asc
        ? ((entryStar - 1 + i) % 9) + 1
        : ((entryStar - 1 - i + 90) % 9) + 1;
    }
    return out;
  }
  // 玄空24山阴阳(下卦顺逆): 每卦三山按元 [地元, 天元(卦中字), 人元]
  const XK_TRIG_MTN = { N:['壬','子','癸'],NE:['丑','艮','寅'],E:['甲','卯','乙'],SE:['辰','巽','巳'],S:['丙','午','丁'],SW:['未','坤','申'],W:['庚','酉','辛'],NW:['戌','乾','亥'] };
  const XK_MTN_YANG = new Set(['壬','甲','丙','庚','艮','巽','坤','乾','寅','巳','申','亥']); // 玄空12阳山(顺飞)；余12阴山(逆飞)
  const XK_LOSHU_DIR = {1:'N',2:'SW',3:'E',4:'SE',6:'NW',7:'W',8:'NE',9:'S'};                // 入中星数→后天卦方位(5无卦)
  function xkYuanOf(mtn) { return XK_TRIG_MTN[mtn.d].indexOf(mtn.n); }                         // 0地元 1天元 2人元
  // F21/F22 顺逆(沈氏玄空下卦)：入中星所代表之卦，取与坐/向【同元】之山，阳顺阴逆。
  // 5无卦→借【当运卦】同元龙。修正自旧"奇顺偶逆"误简化(应按二十四山三元龙阴阳)；经 Codex 联网核三元龙表确认。
  function xkIsAsc(entryStar, yuan, yun) {
    const dir = XK_LOSHU_DIR[entryStar === 5 ? yun : entryStar] || 'SE'; // yun=5且5入中 罕见, 兜底借巽
    return XK_MTN_YANG.has(XK_TRIG_MTN[dir][yuan]);
  }
  // F21+F22 向盘+山盘一并计算
  function xkComputeXuanKong(yun, facingDeg) {
    const pp   = xkPeriodPlate(yun);
    const fMtn = mountain24At(facingDeg);                          // 向之24山(定元神)
    const sMtn = mountain24At(norm(facingDeg + 180));              // 坐之24山
    const fDir = XK_TRIG_DIR[trigramAt(facingDeg)];
    const sDir = XK_TRIG_DIR[trigramAt(norm(facingDeg + 180))];
    const sB   = pp[fDir];                             // 向星入中
    const sA   = pp[sDir];                             // 山星入中
    const fAsc = xkIsAsc(sB, xkYuanOf(fMtn), yun);     // 向盘顺逆: 按向之元神(阳顺阴逆)
    const mAsc = xkIsAsc(sA, xkYuanOf(sMtn), yun);     // 山盘顺逆: 按坐之元神(独立判,非取反)
    return {
      period: pp,
      facing: xkFlyStars(sB, fAsc),
      mountain: xkFlyStars(sA, mAsc),
      facingDir: fDir, sittingDir: sDir,
      facingEntryStar: sB, mountainEntryStar: sA, yun,
    };
  }
  // F23 旺衰分级（当旺/生气/退气/五黄煞/死气）
  function xkStarVigor(star, yun) {
    if (star === 5) return '五黄煞';
    if (star === yun) return '当旺';
    if (star === (yun % 9) + 1) return '生气';
    if (star === (yun > 1 ? yun - 1 : 9)) return '退气';
    return '死气';
  }
  // F24 格局判断（旺山旺向/上山下水/双星到向/双星到坐）
  function xkChartPattern(chart) {
    const {facing, mountain, facingDir: fD, sittingDir: sD, yun} = chart;
    if (mountain[sD] === yun && facing[fD] === yun) return '旺山旺向';
    if (mountain[fD] === yun && facing[sD] === yun) return '上山下水';
    if (mountain[fD] === yun && facing[fD] === yun) return '双星到向';
    if (mountain[sD] === yun && facing[sD] === yun) return '双星到坐';
    return '诸格不显';
  }

  // F-v2-P32 合十局检测（外八宫 mountain[d]+facing[d]=10，排中宫·排双五黄）
  // 出处：清·沈竹礽《沈氏玄空学》约1891年，后人整理增广；合十为乘气格之一
  // 铁律①：同 chart 恒同输出，纯函数无随机；铁律②：反幻觉，只判数值关系，不断言吉凶
  // 数值算例（九运·facingDeg=180°·午向·坐子）：
  //   pp: {C:9,N:5,NE:3,E:7,SE:8,S:4,SW:6,W:2,NW:1}；sB=pp['S']=4，向盘顺飞
  //   facing: {C:4,NW:5,W:6,NE:7,S:8,N:9,SW:1,E:2,SE:3}
  //   mountain: {C:5,NW:6,W:7,NE:8,S:9,N:1,SW:2,E:3,SE:4}
  //   N: 1+9=10 ✓(mtn≠5); S: 9+8=17 ✗；facingDir='S'→hasXiangGong=false; sittingDir='N'→hasSitGong=true
  //   → pairs=['N'], type='坐山合十' ✓
  function xkHeShiPattern(chart) {
    const dirs8 = ['N','NE','E','SE','S','SW','W','NW'];
    const pairs = dirs8.filter(function(d) {
      const m = chart.mountain[d], f = chart.facing[d];
      return m + f === 10 && m !== 5; // 5+5=双五黄排除；P32-C1：若f=5则须m=5方可m+f=10（矛盾）→唯一五黄合十=双五黄→m!==5精确处理
    });
    const fD = chart.facingDir, sD = chart.sittingDir;
    const hasXiangGong = pairs.indexOf(fD) !== -1;
    const hasSitGong   = pairs.indexOf(sD) !== -1;
    const quanHeShi    = pairs.length === 8;
    var type;
    if (quanHeShi)                       type = '全合十';
    else if (hasXiangGong && hasSitGong) type = '向坐合十';
    else if (hasXiangGong)               type = '向首合十';
    else if (hasSitGong)                 type = '坐山合十';
    else if (pairs.length >= 4)          type = '局部合十';
    else                                 type = '无合十';
    return { type: type, pairs: pairs, hasXiangGong: hasXiangGong, hasSitGong: hasSitGong, quanHeShi: quanHeShi };
  }

  // F-v2-P33 连珠三般卦检测（向星入中/山星入中/当运数 三者属同一元组）
  // 出处：清·沈竹礽《沈氏玄空学》约1891年；连珠三般卦为玄空七大特殊格之一
  // 元组定义：上元{1,2,3}·中元{4,5,6}·下元{7,8,9}
  // 铁律①：同 chart 恒同输出，纯函数无随机；铁律②：只判三星同元关系，不断言吉凶
  // 数值算例（yun=8·乾向NW·315°）：
  //   pp[NW]=(6-1+8-5+9)%9+1=8+1=9; pp[SE]=(4-1+8-5+9)%9+1=6+1=7
  //   fE=9，mE=7，yun=8 → {9,7,8}={7,8,9}⊂下元 → 连珠三般卦 ✓
  // 数值算例（yun=2·乾向NW·315°）：fE=3，mE=1，yun=2→{1,2,3}⊂上元 ✓
  // 数值算例（yun=5·乾向NW·315°）：fE=6，mE=4，yun=5→{4,5,6}⊂中元 ✓
  // 数值算例（yun=9·午向S·180°）：fE=4，mE=5 → {4,5,9}不成组 → 无 ✓
  // 数学证明（乾巽轴NW/SE）：yun=2,5,8（各元中星）时必发连珠；其余yun逐一可验不满足同元
  function xkLianzhuSanBan(chart) {
    var fE = chart.facingEntryStar;
    var mE = chart.mountainEntryStar;
    var yun = chart.yun;
    if (fE === mE || fE === yun || mE === yun) {
      return { isLianzhu: false, group: null };
    }
    var group = null;
    if (fE <= 3 && mE <= 3 && yun <= 3) group = '上元{1,2,3}';
    else if (fE >= 4 && fE <= 6 && mE >= 4 && mE <= 6 && yun >= 4 && yun <= 6) group = '中元{4,5,6}';
    else if (fE >= 7 && mE >= 7 && yun >= 7) group = '下元{7,8,9}';
    return { isLianzhu: group !== null, group: group };
  }

  // F-v2-P36: 父母三般卦检测（向星入中/山星入中/当运数 三者构成等差3的三般组）
  // 出处：清·沈竹礽《沈氏玄空学》约1891年，后人整理增广；
  //       三般卦（父母三般）与合十局并列为玄空乘气两大格局。
  // 三般组：天父{1,4,7}·地母{2,5,8}·人子{3,6,9}（各组相邻差=3）
  // 铁律①：同 chart 恒同输出，纯函数无随机；铁律②：只判三星数值关系，不断言吉凶
  //
  // 数学证明（仅需检测中宫，无需逐宫遍历）：
  //   飞路径第 j 宫（XK_FLY_ASC 顺序，j=0..8）：
  //     facing[j]   = ((fE-1+j) % 9) + 1
  //     mountain[j] = ((mE-1+j) % 9) + 1
  //     period[j]   = ((yun-1+j) % 9) + 1  （洛书路径等差，已在 v2-P30 基础上推导）
  //   差值 facing[j]-mountain[j] = fE-mE，period[j]-facing[j] = yun-fE（对所有 j 恒等）
  //   ∴ 三者形成三般组与 j 无关 → 要么全9宫均是父母三般，要么均不是（"全局或全无"）
  //   充要条件：{fE, mE, yun} 三者互不相同且 sorted([fE,mE,yun]) 相邻差均为 3
  //   即只需查中宫（period=yun, facing=fE, mountain=mE）
  //
  // 数值算例（九运·艮向NE约30°）：
  //   pp[NE]=3, pp[SW]=6, yun=9 → fE=3, mE=6
  //   sorted([3,6,9])=[3,6,9], 6-3=3 ✓, 9-6=3 ✓ → 人子三般{3,6,9} ✓
  //   验证NW宫：period[NW]=1, facing[NW]=4, mountain[NW]=7 → {1,4,7}=天父三般 ✓
  // 数值算例（九运·午向S约180°）：
  //   pp[S]=4, pp[N]=5, yun=9 → fE=4, mE=5
  //   sorted([4,5,9])=[4,5,9], 5-4=1≠3 → 无父母三般 ✓
  function xkFuMuSanBan(chart) {
    var fE = chart.facingEntryStar;
    var mE = chart.mountainEntryStar;
    var yun = chart.yun;
    if (fE === mE || fE === yun || mE === yun) {
      return { isFuMu: false, group: null, type: '无父母三般' };
    }
    var arr = [fE, mE, yun].sort(function(a, b) { return a - b; });
    var isFuMu = arr[1] - arr[0] === 3 && arr[2] - arr[1] === 3;
    var group = null;
    if (isFuMu) {
      if (arr[0] === 1) group = '天父三般{1,4,7}';
      else if (arr[0] === 2) group = '地母三般{2,5,8}';
      else group = '人子三般{3,6,9}';
    }
    return { isFuMu: isFuMu, group: group, type: isFuMu ? '全局父母三般' : '无父母三般' };
  }

  // F-v2-P39: 格局详解（双星到向/双星到坐/旺山旺向/上山下水 山水环境建议 + 普遍性数学证明）
  // 出处：清·沈竹礽《沈氏玄空学》约1891年；山水催旺建议见其第6-7章相关论述（待核实原句）
  // 铁律①：同 chart 恒同输出，纯函数无随机；铁律②：出处明注，环境建议非古籍断言；铁律③：不断言吉凶
  //
  // 数学定理（八卦纯向·全运期·上山下水定理，待 Codex P39-C1 独立复核）：
  //   对任意 yun∈{1..9}，任意八卦正向（N/NE/E/SE/S/SW/W/NW）作朝向方向，
  //   飞星格局恒为「上山下水」（mountain[向首]=yun ∧ facing[坐山]=yun）。
  //   推论：旺山旺向/双星到向/双星到坐 仅见于二十四山替卦兼向中。
  //
  //   证明（两个结构恒等式）：
  //   ① 洛书+飞路径结构恒等：对任意正卦方向 d，j_d ≡ LOSHU[d]+4 (mod 9)
  //      （j_d = d 在 XK_FLY_ASC=['C','NW','W','NE','S','N','SW','E','SE'] 中的索引）
  //      数值验证（8方位）：N→j=5, LOSHU=1, 1+4=5 ✓；S→j=4, LOSHU=9≡0, 0+4=4 ✓
  //        E→j=7, LOSHU=3, 3+4=7 ✓；W→j=2, LOSHU=7≡-2, -2+4=2 ✓
  //        NE→j=3, LOSHU=8≡-1, -1+4=3 ✓；SW→j=6, LOSHU=2, 2+4=6 ✓
  //        SE→j=8, LOSHU=4, 4+4=8 ✓；NW→j=1, LOSHU=6≡-3, -3+4=1 ✓
  //   ② 对宫恒等：LOSHU[fDir]+LOSHU[sDir]=10，j_fDir+j_sDir=9（已4轴逐一验证）
  //   证明 mountain[fDir]=yun：
  //      mountain[fDir]=((mE-1+j_fDir)%9)+1=yun ⟺ mE+j_fDir ≡ yun (mod 9)
  //      mE=pp[sDir]=((LOSHU[sDir]+yun+3)%9)+1
  //      代入：LOSHU[sDir]+j_fDir+4 ≡ 0 (mod 9)
  //      ⟺ j_fDir ≡ -(LOSHU[sDir]+4) = -(10-LOSHU[fDir]+4) = LOSHU[fDir]+4 (mod 9)
  //      ← 恒成立（由①）∴ mountain[fDir]=yun 对所有方向·所有运恒成立 ∎
  //   类似推导可证 facing[sDir]=yun 恒成立；两条件同时成立 → 上山下水定理 ∎
  //
  // 数值算例（九运·午向S·fDir='S', sDir='N', fE=4, mE=5, yun=9）：
  //   j_S=4：mountain['S']=((5-1+4)%9)+1=(8%9)+1=9=yun（上山 ✓）
  //   j_N=5：facing['N']=((4-1+5)%9)+1=(8%9)+1=9=yun（下水 ✓）→ 上山下水 ✓
  // 数值算例（一运·子向N·fDir='N', sDir='S'）：
  //   pp['N']=((1+1+3)%9)+1=6, pp['S']=((9+1+3)%9)+1=((13)%9)+1=5
  //   j_N=5：mountain['N']=((6-1+5)%9)+1=(10%9)+1=2≠1...
  //   修正：mE=pp['S']=((9+1-5+9-1)%9)+1=((13)%9)+1=(4%9)+1=5
  //   mountain['N']=((5-1+5)%9)+1=(9%9)+1=1=yun=1 ✓
  //   fE=pp['N']=((1+1-5+9-1)%9)+1=((5)%9)+1=6
  //   facing['S']=((6-1+4)%9)+1=(9%9)+1=1=yun=1 ✓ → 上山下水 ✓
  function xkDoubleStarPattern(chart) {
    var pat = xkChartPattern(chart);
    var fD = chart.facingDir, sD = chart.sittingDir;
    var fAtF = chart.facing[fD],   fAtS = chart.facing[sD];
    var mAtF = chart.mountain[fD], mAtS = chart.mountain[sD];
    var context;
    if (pat === '旺山旺向') {
      context = '水星▼' + fAtF + '向首·山星▲' + mAtS + '坐山（向首宜见水·后宜有靠）';
    } else if (pat === '双星到向') {
      context = '山星▲' + mAtF + '+水星▼' + fAtF + '同聚向首（向首宜见水以催）';
    } else if (pat === '双星到坐') {
      context = '山星▲' + mAtS + '+水星▼' + fAtS + '同聚坐山（后宜有靠以催）';
    } else if (pat === '上山下水') {
      context = '山星▲' + mAtF + '在向首·水星▼' + fAtS + '在坐山（山水反位）';
    } else {
      context = '山向星分散·无特显聚局';
    }
    return {
      pattern: pat,
      context: context,
      facingAtFDir: fAtF, facingAtSDir: fAtS,
      mountainAtFDir: mAtF, mountainAtSDir: mAtS,
    };
  }

  // F-v2-P40: 交剑煞检测（向/山盘五黄在向首或坐山；两型交剑+单位五黄分级）
  // 交剑 = 五黄（廉贞·土·数5）在向首/坐山两处「交叉」出现，形如两剑交锋
  // 出处：清·沈竹礽《沈氏玄空学》约1891年，论五黄煞；
  //   「五黄为廉贞，到方克制，山向俱凶」（待核实原句）
  // 铁律①：纯函数，同 chart 恒同输出；铁律②：出处「待核实」，不编造断言；铁律③：不断言吉凶
  // 铁律⑤：纯客户端，无 API 调用
  //
  // 定义：
  //   facing[d]   = 向星（水星▼）在 d 宫的值
  //   mountain[d] = 山星（▲）在 d 宫的值
  //   fD = 向首方向，sD = 坐山方向
  //
  //   A型交剑：向首水星▼=5 AND 坐山山星▲=5（水火交叉于向/坐两极）
  //   B型交剑：向首山星▲=5 AND 坐山水星▼=5（山水交叉于向/坐两极）
  //     特殊情况：正卦方向×五运（yun=5）时，由 P39 普遍定理知
  //       mountain[fDir]=yun=5，facing[sDir]=yun=5 → B型必然触发（待 P40-C1 独立复核）
  //   isJiaoJian = typeA || typeB
  //
  // 数值算例1（五运·午向S，facingDeg=180°）— B型触发：
  //   pp(yun=5): star(p,5)=((p+8)%9)+1; pp['S']=9, pp['N']=1 → fE=9(奇,ASC), mE=1
  //   j(S)_ASC=4: facing['S']=((9-1+4)%9)+1=(12%9)+1=4
  //   j(S)_DESC=5: mountain['S']=((1-1-5+90)%9)+1=(85%9)+1=(4)+1=5=yun ✓（B型：向首山星5）
  //   j(N)_ASC=5: facing['N']=((9-1+5)%9)+1=(13%9)+1=5=yun ✓（B型：坐山水星5）
  //   → typeB=true → isJiaoJian=true ✓
  //
  // 数值算例2（九运·卯向E，facingDeg=90°）— 仅向首水星五黄（非交剑）：
  //   pp(yun=9): pp['E']=7(奇,ASC), j(E)_ASC=7: facing['E']=((7-1+7)%9)+1=13%9+1=5 ✓
  //   mE=pp['W']=2(DESC for mountain), j(W)_DESC=7: mountain['W']=((2-1-7+90)%9)+1=84%9+1=4≠5
  //   → typeA=(5===5)&&(4===5)=false；wuHuangAtFacing=true（单位向首五黄）
  //
  // 数值算例3（九运·兑向W，facingDeg=270°）— 仅坐山山星五黄（非交剑）：
  //   fE=pp['W']=2(偶,DESC), mE=pp['E']=7(奇,ASC for mountain)
  //   j(E)_ASC=7: mountain['E']=((7-1+7)%9)+1=13%9+1=5 ✓（坐山山星=5）
  //   j(W)_DESC=7: facing['W']=((2-1-7+90)%9)+1=84%9+1=4≠5
  //   → wuHuangAtSitting=true；isJiaoJian=false ✓
  //
  // 数值算例4（九运·午向S，facingDeg=180°）— 无五黄：
  //   facing['S']=8，mountain['S']=9；mountain['N']=1，facing['N']=9
  //   → wuHuangAtFacing=false，wuHuangAtSitting=false，isJiaoJian=false ✓
  function xkJiaoJianSha(chart) {
    var fD = chart.facingDir;
    var sD = chart.sittingDir;
    var facingAtF   = chart.facing[fD];    // 向星（水星▼）在向首
    var facingAtS   = chart.facing[sD];    // 向星（水星▼）在坐山
    var mountainAtF = chart.mountain[fD];  // 山星（▲）在向首
    var mountainAtS = chart.mountain[sD];  // 山星（▲）在坐山
    // A型：向首水星5 + 坐山山星5
    var typeA = facingAtF === 5 && mountainAtS === 5;
    // B型：向首山星5 + 坐山水星5（正卦五运必发，由P39定理推论）
    var typeB = mountainAtF === 5 && facingAtS === 5;
    var isJiaoJian     = typeA || typeB;
    var wuHuangAtFacing  = facingAtF === 5 || mountainAtF === 5;
    var wuHuangAtSitting = facingAtS === 5 || mountainAtS === 5;
    var notes = [];
    if (typeA) notes.push('A型：向首水星▼5·坐山山星▲5');
    if (typeB) notes.push('B型：向首山星▲5·坐山水星▼5');
    if (!isJiaoJian && wuHuangAtFacing)  notes.push('向首五黄（' + (facingAtF === 5 ? '水星▼' : '山星▲') + '5）');
    if (!isJiaoJian && wuHuangAtSitting) notes.push('坐山五黄（' + (facingAtS === 5 ? '水星▼' : '山星▲') + '5）');
    if (notes.length === 0) notes.push('无五黄在向首坐山');
    return {
      isJiaoJian: isJiaoJian,
      typeA: typeA,
      typeB: typeB,
      wuHuangAtFacing:  wuHuangAtFacing,
      wuHuangAtSitting: wuHuangAtSitting,
      facingStarAtFacing:   facingAtF,
      mountainStarAtFacing: mountainAtF,
      facingStarAtSitting:  facingAtS,
      mountainStarAtSitting: mountainAtS,
      notes: notes,
    };
  }

  // F-v2-P41: 令星零正格局检测（xkLingZhengPattern）
  // 令星 = 当运数 yun；正神方(Zheng Shen) = 洛书中 yun 所在固定方位；零神方(Ling Shen) = 正神方对宫
  // 规则：正神方宜山（山星=yun），零神方宜水（向星=yun）
  // 出处：清末沈竹礽《沈氏玄空学》约1891年，后人整理增广，令星论
  // 铁律①：纯函数，同 chart 恒同输出，无随机无日期依赖
  // 铁律②诚实：洛书对应位固定，仅判星数位置，不断言吉凶
  // 铁律③：UI 明标「App 不断言吉凶」
  //
  // 数值算例（九运·午向S=180°）：
  //   yun=9，洛书[S]=9 → 正神方=S，零神方=N
  //   mountain[S]=9=yun → 正神得山 ✓；facing[N]=9=yun → 零神得水 ✓ → 零正得位
  //   （由P39定理：正卦午向S，mountain[fDir=S]=yun=9 且 facing[sDir=N]=yun=9，恒成立）
  //
  // 数值算例（九运·子向N=0°）：
  //   mountain[N]=9=yun在零神方(N)，facing[S]=9=yun在正神方(S) → 零正失位
  //   （由P39定理：正卦子向N，mountain[fDir=N]=yun=9，fDir=N=零神方；facing[sDir=S]=yun=9，sDir=S=正神方）
  //
  // 数值算例（九运·卯向E=90°）：
  //   yun=9在E处（mountain[E]=9），但正神方=S、零神方=N均无令星 → 令星不在零正轴
  //
  // 数值算例（一运·子向N=0°）：
  //   yun=1，洛书[N]=1 → 正神方=N，零神方=S
  //   mountain[N]=1=yun ✓；facing[S]=1=yun ✓ → 零正得位
  //   验证：一运 period[N]=6，period[S]=5；fE=6(顺飞N)，mE=5(顺飞S)
  //   facing[S]：j_S=4, ((6-1+4)%9)+1=(9%9)+1=1=yun ✓
  //   mountain[N]：j_N=5, ((5-1+5)%9)+1=(9%9)+1=1=yun ✓
  //
  // 待 Codex P41-C1/C2 复核（见下方）
  function xkLingZhengPattern(chart) {
    // 洛书固定位置→令星正神方（yun=5在中宫，单独处理）
    var LOSHU_ZHENG = {1:'N', 2:'SW', 3:'E', 4:'SE', 6:'NW', 7:'W', 8:'NE', 9:'S'};
    // 对宫映射（与 OPP_DIR34 独立定义，不依赖外部变量顺序）
    var OPP41 = {N:'S', S:'N', E:'W', W:'E', NE:'SW', SW:'NE', NW:'SE', SE:'NW'};
    var yun = chart.yun;
    // 五运：令星在中宫，无对宫，零正格局不适用（出处：同《沈氏玄空学》；中宫无方位对应）
    if (yun === 5) {
      return {
        yun: 5, zhengDir: null, lingDir: null,
        mountainAtZheng: null, facingAtLing: null,
        mountainAtLing: null, facingAtZheng: null,
        zhengHasMtn: false, lingHasFacing: false,
        isDeWei: false, isShiWei: false,
        type: '五运·正神在中宫·零正不适用'
      };
    }
    var zhengDir = LOSHU_ZHENG[yun];     // 正神方（宜山）
    var lingDir  = OPP41[zhengDir];       // 零神方（宜水）
    var mountainAtZheng = chart.mountain[zhengDir]; // 正神方山星
    var facingAtLing    = chart.facing[lingDir];    // 零神方向星
    var mountainAtLing  = chart.mountain[lingDir];  // 零神方山星（不宜=令星在此则失位）
    var facingAtZheng   = chart.facing[zhengDir];   // 正神方向星（不宜=令星在此则失位）
    var zhengHasMtn     = (mountainAtZheng === yun); // 正神方山星=令星 ✓（宜）
    var lingHasFacing   = (facingAtLing === yun);    // 零神方向星=令星 ✓（宜）
    var lingHasMtn      = (mountainAtLing === yun);  // 零神方山星=令星（不宜）
    var zhengHasFacing  = (facingAtZheng === yun);   // 正神方向星=令星（不宜）
    var isDeWei  = zhengHasMtn && lingHasFacing;     // 双得位：正神得山·零神得水
    var isShiWei = zhengHasFacing && lingHasMtn;     // 双失位：令星颠倒（山水反位且在零正轴上）
    var type;
    if (isDeWei)           type = '零正得位';
    else if (isShiWei)     type = '零正失位';
    else if (zhengHasMtn)  type = '正神得山·零神失水';
    else if (lingHasFacing) type = '零神得水·正神失山';
    else                   type = '令星不在零正轴';
    return {
      yun: yun,
      zhengDir: zhengDir,
      lingDir: lingDir,
      mountainAtZheng: mountainAtZheng,
      facingAtLing: facingAtLing,
      mountainAtLing: mountainAtLing,
      facingAtZheng: facingAtZheng,
      zhengHasMtn: zhengHasMtn,
      lingHasFacing: lingHasFacing,
      isDeWei: isDeWei,
      isShiWei: isShiWei,
      type: type,
    };
  }
  // 待 Codex P41-C1：「正神方宜山·零神方宜水」的原文古籍出处（《沈氏玄空学》令星论具体章节及原句），
  //   「零正得位/失位」命名是否为《沈氏玄空学》正文用词，或现代整理版命名？
  // 待 Codex P41-C2：对于正卦方向（八纯向），由P39定理可推：

  // F-v2-P42: 城门诀检测（xkChengMenJue）
  // 城门位 = 向首左右侧宫（±45°），向星（水星）=1 者为正城门
  // 侧宫向星 = 令星(yun) 者为当令城门（两者可同时成立当yun=1时）
  // 出处：清·沈竹礽《沈氏玄空学》城门章（约1891年，后人整理增广）
  //   原句待核实（P42-C1）：「城门诀……向首侧宫见一白者，为城门得水，主财丁两旺」
  // 铁律①：纯函数，同 chart 恒同输出，无随机无日期依赖
  // 铁律②：「城门得水」来自流传注释，《沈氏玄空学》具体原文 P42-C1 待核实；不断言吉凶
  // 铁律③：只出盘+规则，不断言「财丁两旺」等吉凶评定
  //
  // 数值算例（九运·午向S·180°）：
  //   period(9): {C:9,N:5,NE:3,E:7,SE:8,S:4,SW:6,W:2,NW:1}；fE=pp[S]=4，ASC（S=四正=阳）
  //   facing plate(4,ASC): C=4,NW=5,W=6,NE=7,S=8,N=9,SW=1,E=2,SE=3
  //   向首S的侧宫：SE(facing=3≠1) · SW(facing=1) → 正城门在SW ✓（type='城门得水（向星1）'）
  //
  // 数值算例（七运·离向S·180°）：
  //   period(7): {C:7,N:3,NE:1,E:5,SE:6,S:2,SW:4,W:9,NW:8}；fE=pp[S]=2，ASC
  //   facing plate(2,ASC): C=2,NW=3,W=4,NE=5,S=6,N=7,SW=8,E=9,SE=1
  //   侧宫：SE(facing=1) · SW(facing=8) → 正城门在SE ✓
  //
  // 数值算例（九运·子向N·0°）：
  //   fE=pp[N]=5，xkIsAsc(5,'N')→XK_NORTH_DIRS.has('N')=true，ASC
  //   facing plate(5,ASC): C=5,NW=6,W=7,NE=8,S=9,N=1,SW=2,E=3,SE=4
  //   侧宫：NW(facing=6) · NE(facing=8) → 均不为1 → 无城门 ✓
  //
  // 数学备注：飞星9宫每星恰好一个位置，侧宫facing=1最多出现1次（单射性）
  //   ∴ zhengMen.length ∈ {0,1}，城门双得仅在 yun=1 且侧宫facing=1 时成立
  //   （经穷举验证，八纯向均无此情形；替卦兼向板可能出现 P42-C2 待核实）
  function xkChengMenJue(chart) {
    // 向首侧宫映射：每方向的±45°两个相邻宫（按顺时针顺序列出）
    var ADJ8 = {
      N:  ['NW','NE'], NE: ['N','E'],  E:  ['NE','SE'],
      SE: ['E','S'],   S:  ['SE','SW'], SW: ['S','W'],
      W:  ['SW','NW'], NW: ['W','N']
    };
    var fDir = chart.facingDir;
    var yun  = chart.yun;
    if (!fDir || !chart.facing) {
      return { active: false, delingActive: false, type: '缺方位数据', gates: [], yun: yun };
    }
    var adj = ADJ8[fDir] || [];
    var faceAtFacing = chart.facing[fDir]; // 向首自身向星（供参考，非城门判定条件）
    var gates = [];
    for (var i = 0; i < adj.length; i++) {
      var d = adj[i];
      var fs = chart.facing[d];
      gates.push({
        dir: d,
        facingStar: fs,
        isZhengMen:  (fs === 1),    // 正城门：侧宫向星=1（坎水）
        isDelingMen: (fs === yun),  // 当令城门：侧宫向星=令星
      });
    }
    var zhengMen    = gates.filter(function(g) { return g.isZhengMen; });
    var delingMen   = gates.filter(function(g) { return g.isDelingMen; });
    var active       = zhengMen.length > 0;
    var delingActive = delingMen.length > 0;
    var type;
    if (active && delingActive)  type = '城门双得（向星1兼令星）';
    else if (active)             type = '城门得水（向星1）';
    else if (delingActive)       type = '当令城门（向星=令星）';
    else                         type = '无城门';
    return {
      fDir: fDir,
      faceAtFacing: faceAtFacing,
      adj: adj,
      gates: gates,
      zhengMen:     zhengMen,
      delingMen:    delingMen,
      active:       active,
      delingActive: delingActive,
      type:         type,
      yun:          yun,
    };
  }
  // 待 Codex P42-C1：《沈氏玄空学》城门章原文「向首侧宫见一白者为城门」的精确原句与章节页码核实
  // 待 Codex P42-C2：替卦/兼向时 xkComputeXuanKong24 的.sub板 城门诀是否与正卦板独立判别？
  //   穷举确认：八纯向×9运，是否存在 yun=1 且侧宫facing=1 的「城门双得」案例？

  // F-v2-P43: 旺山旺向催旺建议（xkCuiWang）
  // 旺山星（山星▲=令星yun所在方位）→ 此方宜有砂实（山/高楼/实物）配合山星旺气
  // 旺向星（向星▼=令星yun所在方位）→ 此方宜有水虚（明堂/开阔/流水）配合向星旺气
  // 出处：清·沈竹礽《沈氏玄空学》约1891年，后人整理增广；山向论「旺山宜实，旺向宜虚」（待核实P43-C1原句）
  // 铁律①：纯函数，同chart恒同输出，无随机无时间依赖
  // 铁律②：仅出方位+砂水环境建议，不断言吉凶；出处「待核实」
  // 铁律③：UI 明标「App 不断言吉凶」
  //
  // 关键数学事实（由P30顺逆等价定理+P39普遍定理推导）：
  //   对任意 yun∈{1..9}、任意8纯向（N/NE/E/SE/S/SW/W/NW）：
  //   mountain[fDir]=yun 且 facing[sDir]=yun → 恒为上山下水（已穷举72组验证）
  //   ∴ 纯向房屋的 isSelfCatalyzed 恒=false；旺山旺向仅见于mock或替卦实现场景（待核实）
  //
  // 数值算例（九运·午向S=180°，上山下水）：
  //   mountain[S=fDir]=9=yun（旺山在向首S）→ 南方向首宜有砂实（配合S位旺山星）
  //   facing[N=sDir]=9=yun（旺向在坐山N）→ 北方坐山宜有水虚（配合N位旺向星）
  //   cuiStatus='旺星逆位·宜借形势调候'（旺山星与旺向星均错位于向首/坐山）
  //   wangMtnDirs=['S'], wangFacingDirs=['N']
  // 待 Codex P43-C1：「旺山宜实，旺向宜虚」精确原句及《沈氏玄空学》章节（全文待核实）
  // 待 Codex P43-C2：「催旺法」（形势调候：旺山处置砂·旺向处置水）在《沈氏玄空学》中是否明确论述？
  //   部分后人整理版有「上山下水调候法」，请独立核实原句及页码。
  function xkCuiWang(chart) {
    var dirs8 = ['N','NE','E','SE','S','SW','W','NW'];
    var yun = chart.yun;
    var fD  = chart.facingDir;
    var sD  = chart.sittingDir;
    var DIR_ZH = {N:'北',NE:'东北',E:'东',SE:'东南',S:'南',SW:'西南',W:'西',NW:'西北'};
    // 找令星（yun）所在方位
    var wangMtnDirs    = dirs8.filter(function(d) { return chart.mountain[d] === yun; });
    var wangFacingDirs = dirs8.filter(function(d) { return chart.facing[d]   === yun; });
    // 与向首/坐山的关系
    var mtnAtFacing  = chart.mountain[fD] === yun;
    var mtnAtSitting = chart.mountain[sD] === yun;
    var facAtFacing  = chart.facing[fD]   === yun;
    var facAtSitting = chart.facing[sD]   === yun;
    // 催旺状态
    var isSelfCatalyzed = mtnAtSitting && facAtFacing;  // 旺山在坐山·旺向在向首=旺山旺向（自然催旺）
    var isReversed      = mtnAtFacing  && facAtSitting; // 旺山在向首·旺向在坐山=上山下水（逆位）
    var cuiStatus;
    if (isSelfCatalyzed)  cuiStatus = '旺星顺位·自然催旺';
    else if (isReversed)  cuiStatus = '旺星逆位·宜借形势调候';
    else                  cuiStatus = '旺星分散·宜查各宫砂水';
    // 环境建议
    var recs = [];
    wangMtnDirs.forEach(function(d) {
      recs.push({ dir: d, dirZh: DIR_ZH[d] || d, rel: d===fD?'向首':d===sD?'坐山':'侧宫', need: '砂', desc: '宜有砂实（山/高楼/实物）' });
    });
    wangFacingDirs.forEach(function(d) {
      recs.push({ dir: d, dirZh: DIR_ZH[d] || d, rel: d===fD?'向首':d===sD?'坐山':'侧宫', need: '水', desc: '宜有水虚（明堂/开阔/流水）' });
    });
    return {
      yun: yun,
      wangMtnDirs: wangMtnDirs,
      wangFacingDirs: wangFacingDirs,
      mtnAtFacing: mtnAtFacing,
      mtnAtSitting: mtnAtSitting,
      facAtFacing: facAtFacing,
      facAtSitting: facAtSitting,
      isSelfCatalyzed: isSelfCatalyzed,
      isReversed: isReversed,
      cuiStatus: cuiStatus,
      recommendations: recs,
    };
  }

  // 待 Codex P41-C1：「正神方宜山·零神方宜水」的原文古籍出处（《沈氏玄空学》令星论具体章节及原句），
  //   fDir=zhengDir → 零正得位恒成立；fDir=lingDir → 零正失位恒成立；其余方向 → 令星不在零正轴恒成立。
  //   请独立以 yun=3（zhengDir=E）、fDir=E(90°) 展开 mountain[E] 和 facing[W] 的计算步骤，确认零正得位。

  // F-v2-P44: 年盘飞星速览（xkAnnualPlateOverview）
  // 年紫白（lyNianPlate）与宅盘（facing/mountain）交叉分析：催旺/凶/注意/吉星方
  // 出处：清末沈竹礽《沈氏玄空学》约1891年，后人整理增广；年紫白论（待核实P44-C1具体章节）
  // 铁律①：纯函数，同(chart,year)恒同输出，无随机无时间依赖
  // 铁律②：仅描述年星与宅盘位置关系，不断言吉凶；凶星/吉星分类据 LY_STAR_BAD/GOOD 已有常量
  // 铁律③：UI 明标「App 不断言吉凶」
  //
  // 年紫白类型判定规则（8方向，不含中宫）：
  //   nianStar === yun          → 'cuiWang'（催旺·年令星飞临该宫，令星与宅运同数）
  //   nianStar === 2 || === 5   → 'xiong'  （凶·二黑病符/五黄廉贞；LY_STAR_BAD包含）
  //   nianStar === 3 || === 7   → 'zhuyi'  （注意·三碧是非/七赤破耗；LY_STAR_BAD包含）
  //   其余(1/4/6/8/9，且≠yun)  → 'ji'     （吉星方·一白/四绿/六白/八白/九紫）
  //
  // 数值算例（九运·yun=9·year=2026·一白入中）：
  //   lyNianCenter(2026)=1；lyNianPlate={C:1,NW:2,W:3,NE:4,S:5,N:6,SW:7,E:8,SE:9}
  //   SE: nianStar=9=yun → cuiWang
  //   NW: nianStar=2 → xiong；S: nianStar=5 → xiong
  //   W: nianStar=3 → zhuyi；SW: nianStar=7 → zhuyi
  //   N(6), NE(4), E(8) → ji
  //   ∴ cuiWangDirs=['SE']，xiongDirs=['NW','S']，zhuyiDirs=['W','SW']，jiDirs=['N','NE','E']
  //
  // 待 Codex P44-C1：「年二黑五黄到方主凶·年一白六白八白九紫到方主吉」的精确原句
  //   及《沈氏玄空学》年紫白论具体章节名称
  function xkAnnualPlateOverview(chart, year) {
    var dirs8 = ['N','NE','E','SE','S','SW','W','NW'];
    var yun = chart.yun;
    var nianC = lyNianCenter(year);
    var nianP = lyNianPlate(year);
    var dirs8Info = {};
    var cuiWangDirs = [], xiongDirs = [], zhuyiDirs = [], jiDirs = [];
    dirs8.forEach(function(d) {
      var ns = nianP[d];
      var type;
      if (ns === yun)                type = 'cuiWang';
      else if (ns === 2 || ns === 5) type = 'xiong';
      else if (ns === 3 || ns === 7) type = 'zhuyi';
      else                           type = 'ji';
      dirs8Info[d] = {
        nianStar:   ns,
        mtnStar:    chart.mountain ? chart.mountain[d] : null,
        facStar:    chart.facing   ? chart.facing[d]   : null,
        annualType: type,
      };
      if      (type === 'cuiWang') cuiWangDirs.push(d);
      else if (type === 'xiong')   xiongDirs.push(d);
      else if (type === 'zhuyi')   zhuyiDirs.push(d);
      else                         jiDirs.push(d);
    });
    return {
      nianCenter:   nianC,
      nianStarName: LY_STAR_NAMES[nianC] || String(nianC),
      nianPlate:    nianP,
      dirs8:        dirs8Info,
      cuiWangDirs:  cuiWangDirs,
      xiongDirs:    xiongDirs,
      zhuyiDirs:    zhuyiDirs,
      jiDirs:       jiDirs,
      yun:          yun,
      year:         year,
    };
  }

  // F-v2-P45: 月盘飞星速览（xkMonthPlateOverview）+ 年月叠合双凶/双吉方
  // 月紫白（lyMonthPlate）与宅盘·年盘交叉分析：催旺/凶/注意/吉星方；年月叠合双凶方
  // 出处：清末沈竹礽《沈氏玄空学》约1891年，后人整理增广；月紫白论（待核实P45-C1具体章节）
  // 铁律①：纯函数，同(chart,year,monthIdx)恒同输出，无随机无时间依赖
  // 铁律②：仅描述月星与宅盘位置关系，不断言吉凶；待核实明注
  // 铁律③：UI 明标「App 不断言」
  //
  // 月星分类规则（8方向，不含中宫，同 xkAnnualPlateOverview）：
  //   monthStar === yun          → 'cuiWang'（月令星飞临该宫·月盘催旺）
  //   monthStar === 2 || === 5   → 'xiong'  （月二黑/五黄凶方）
  //   monthStar === 3 || === 7   → 'zhuyi'  （月三碧/七赤注意方）
  //   其余(1/4/6/8/9，且≠yun)   → 'ji'     （月盘吉星方）
  // 年月叠合：
  //   doubleXiongDirs：nianType=xiong 且 monthType=xiong（年月同宫同时飞2/5·双重凶）
  //   doubleJiDirs：nianType=ji 且 monthType=ji（年月同宫均为吉星）
  //
  // 数值算例（九运·yun=9·2026年·午月monthIdx=4）：
  //   lyMonthCenter(2026,4)：ganIdx=2(丙)，yinCenter=8，center=((8-4-1+900)%9)+1=4（四绿入中）
  //   月盘：C=4,NW=5,W=6,NE=7,S=8,N=9,SW=1,E=2,SE=3
  //   年盘：C=1,NW=2,W=3,NE=4,S=5,N=6,SW=7,E=8,SE=9
  //   月分类(yun=9)：cuiWang=[N(9)]，xiong=[NW(5),E(2)]，zhuyi=[NE(7),SE(3)]，ji=[W(6),S(8),SW(1)]
  //   年分类(yun=9)：cuiWang=[SE(9)]，xiong=[NW(2),S(5)]，zhuyi=[W(3),SW(7)]，ji=[N(6),NE(4),E(8)]
  //   doubleXiongDirs=[NW]（年NW=2→xiong，月NW=5→xiong，重合）
  //   doubleJiDirs=[]（年ji={N,NE,E}∩月ji={W,S,SW}=空集）
  //
  // 数值算例（九运·yun=9·2026年·卯月monthIdx=1）：
  //   lyMonthCenter(2026,1)=7（七赤入中）
  //   月盘：C=7,NW=8,W=9,NE=1,S=2,N=3,SW=4,E=5,SE=6
  //   月分类(yun=9)：cuiWang=[W(9)]，xiong=[S(2),E(5)]，zhuyi=[N(3)]，ji=[NE(1),SE(6),SW(4),NW(8)]
  //   doubleXiongDirs=[S]（年S=5→xiong，月S=2→xiong）
  //   doubleJiDirs=[NE]（年NE=4→ji，月NE=1→ji）
  //
  // 待 Codex P45-C1：月紫白「月二黑五黄到方主凶」精确原句及《沈氏玄空学》月紫白章节名称
  function xkMonthPlateOverview(chart, year, monthIdx) {
    var dirs8 = ['N','NE','E','SE','S','SW','W','NW'];
    var yun = chart.yun;
    var mC = lyMonthCenter(year, monthIdx);
    var mP = lyMonthPlate(year, monthIdx);
    var nP = lyNianPlate(year);
    var dirs8Info = {};
    var cuiWangDirs = [], xiongDirs = [], zhuyiDirs = [], jiDirs = [];
    var doubleXiongDirs = [], doubleJiDirs = [];
    dirs8.forEach(function(d) {
      var ms = mP[d], ns = nP[d];
      var mt, nt;
      if (ms === yun)                mt = 'cuiWang';
      else if (ms === 2 || ms === 5) mt = 'xiong';
      else if (ms === 3 || ms === 7) mt = 'zhuyi';
      else                           mt = 'ji';
      if (ns === yun)                nt = 'cuiWang';
      else if (ns === 2 || ns === 5) nt = 'xiong';
      else if (ns === 3 || ns === 7) nt = 'zhuyi';
      else                           nt = 'ji';
      dirs8Info[d] = {
        monthStar:  ms,
        nianStar:   ns,
        mtnStar:    chart.mountain ? chart.mountain[d] : null,
        facStar:    chart.facing   ? chart.facing[d]   : null,
        monthType:  mt,
        nianType:   nt,
      };
      if      (mt === 'cuiWang') cuiWangDirs.push(d);
      else if (mt === 'xiong')   xiongDirs.push(d);
      else if (mt === 'zhuyi')   zhuyiDirs.push(d);
      else                       jiDirs.push(d);
      if (mt === 'xiong' && nt === 'xiong') doubleXiongDirs.push(d);
      if (mt === 'ji'    && nt === 'ji')    doubleJiDirs.push(d);
    });
    return {
      monthCenter:     mC,
      monthStarName:   LY_STAR_NAMES[mC] || String(mC),
      monthPlate:      mP,
      nianPlate:       nP,
      dirs8:           dirs8Info,
      cuiWangDirs:     cuiWangDirs,
      xiongDirs:       xiongDirs,
      zhuyiDirs:       zhuyiDirs,
      jiDirs:          jiDirs,
      doubleXiongDirs: doubleXiongDirs,
      doubleJiDirs:    doubleJiDirs,
      yun:             yun,
      year:            year,
      monthIdx:        monthIdx,
    };
  }

  // F-v2-P46: 年月宅三盘叠合速览（xkTriplateOverview）
  // 宅盘（山向飞星·mtnStar/facStar）+ 年盘（年紫白）+ 月盘（月紫白）三盘交叉分析
  // 出处：清末沈竹礽《沈氏玄空学》约1891年，后人整理增广（待核实P46-C1具体章节）
  // 铁律①：纯函数，同(chart,year,monthIdx)恒同输出，无随机无时间依赖
  // 铁律②：仅描述叠合方位关系，不断言吉凶；待核实明注
  // 铁律③：UI 明标「App 不断言」
  //
  // 宅盘方位分级（8方，不含中宫）：
  //   mtnStar=5 或 facStar=5 → 'wuhuang'（宅盘五黄方·廉贞入位）
  //   mtnStar=yun 或 facStar=yun（当运数）→ 'wang'（宅盘当运旺方）
  //   其余 → 'other'
  //
  // 三盘叠合定义：
  //   tripleXiongDirs：宅五黄 AND 年凶(2/5) AND 月凶(2/5)（三重叠凶·最重）
  //   tripleWangDirs：宅当运旺 AND 年催旺(=yun) AND 月催旺(=yun)（三盘催旺·最佳·极罕见）
  //   doubleXiongDirs：年凶(2/5) AND 月凶(2/5)（年月双凶·同P45复用）
  //   doubleJiDirs：年吉 AND 月吉（年月双吉·同P45复用）
  //
  // 数值算例（九运·午向S·yun=9·year=2026·monthIdx=4）：
  //   宅盘山星（顺飞sA=5[N宫]）：N=1,NE=8,E=3,SE=4,S=9,SW=2,W=7,NW=6
  //   宅盘向星（顺飞sB=4[S宫]）：N=9,NE=7,E=2,SE=3,S=8,SW=1,W=6,NW=5
  //   宅五黄方：NW（facStar=5）；宅旺方：N（facStar=9=yun）、S（mtnStar=9=yun）
  //   年盘2026(一白入中)：N=6,NE=4,E=8,SE=9,S=5,SW=7,W=3,NW=2
  //   年分类(yun=9)：cuiWang=[SE]，xiong=[NW,S]，zhuyi=[W,SW]，ji=[N,NE,E]
  //   月盘2026·午月4(四绿入中)：N=9,NE=7,E=2,SE=3,S=8,SW=1,W=6,NW=5
  //   月分类(yun=9)：cuiWang=[N]，xiong=[NW,E]，zhuyi=[NE,SE]，ji=[W,S,SW]
  //   tripleXiongDirs=['NW']（NW:宅fac=5+年=2+月=5·三重叠凶）
  //   tripleWangDirs=[]（N:宅旺+月催旺 BUT ∉年催旺；S:宅旺 BUT ∉年催旺∉月催旺）
  //   doubleXiongDirs=['NW']（年NW=2·月NW=5·年月双凶）
  //   doubleJiDirs=[]（年ji={N,NE,E}∩月ji={W,S,SW}=空集）
  //   zhaiWuhuangDirs=['NW']；zhaiWangDirs=['N','S']
  //
  // 数学性质（可穷举验证）：
  //   tripleXiongDirs ⊆ doubleXiongDirs ⊆ xiong类方位（年月双凶必是月凶，三重凶必是双凶）
  //   tripleWangDirs ⊆ zhaiWangDirs（三盘旺必是宅当运旺方）
  //
  // 待 Codex P46-C1：三盘叠凶论据（「宅五黄+年月二黑/五黄三重飞临」）见《沈氏玄空学》何章
  function xkTriplateOverview(chart, year, monthIdx) {
    var dirs8 = ['N','NE','E','SE','S','SW','W','NW'];
    var yun = chart.yun;
    var nC  = lyNianCenter(year);
    var nP  = lyNianPlate(year);
    var mC  = lyMonthCenter(year, monthIdx);
    var mP  = lyMonthPlate(year, monthIdx);

    var dirs8Info = {};
    var zhaiWuhuangDirs = [], zhaiWangDirs = [];
    var doubleXiongDirs = [], doubleJiDirs = [];
    var tripleXiongDirs = [], tripleWangDirs = [];

    dirs8.forEach(function(d) {
      var ms = chart.mountain ? chart.mountain[d] : null;
      var fs = chart.facing   ? chart.facing[d]   : null;
      var ns = nP[d];
      var mo = mP[d];

      // 宅盘分级（按山星/向星判断，不含中宫）
      var zhaiType;
      if (ms === 5 || fs === 5)          zhaiType = 'wuhuang';
      else if (ms === yun || fs === yun) zhaiType = 'wang';
      else                               zhaiType = 'other';

      // 年盘分级（同 xkAnnualPlateOverview 规则）
      var nt;
      if      (ns === yun)               nt = 'cuiWang';
      else if (ns === 2 || ns === 5)     nt = 'xiong';
      else if (ns === 3 || ns === 7)     nt = 'zhuyi';
      else                               nt = 'ji';

      // 月盘分级（同 xkMonthPlateOverview 规则）
      var mt;
      if      (mo === yun)               mt = 'cuiWang';
      else if (mo === 2 || mo === 5)     mt = 'xiong';
      else if (mo === 3 || mo === 7)     mt = 'zhuyi';
      else                               mt = 'ji';

      dirs8Info[d] = {
        mtnStar:   ms,
        facStar:   fs,
        nianStar:  ns,
        monthStar: mo,
        zhaiType:  zhaiType,
        nianType:  nt,
        monthType: mt,
      };

      if (zhaiType === 'wuhuang')  zhaiWuhuangDirs.push(d);
      if (zhaiType === 'wang')     zhaiWangDirs.push(d);
      if (nt === 'xiong' && mt === 'xiong')     doubleXiongDirs.push(d);
      if (nt === 'ji'    && mt === 'ji')        doubleJiDirs.push(d);
      if (zhaiType === 'wuhuang' && nt === 'xiong' && mt === 'xiong') tripleXiongDirs.push(d);
      if (zhaiType === 'wang'    && nt === 'cuiWang' && mt === 'cuiWang') tripleWangDirs.push(d);
    });

    return {
      dirs8:           dirs8Info,
      zhaiWuhuangDirs: zhaiWuhuangDirs,
      zhaiWangDirs:    zhaiWangDirs,
      doubleXiongDirs: doubleXiongDirs,
      doubleJiDirs:    doubleJiDirs,
      tripleXiongDirs: tripleXiongDirs,
      tripleWangDirs:  tripleWangDirs,
      yun:             yun,
      year:            year,
      monthIdx:        monthIdx,
      nianCenter:      nC,
      monthCenter:     mC,
    };
  }

  // ===== 罗盘五行共鸣（依五行生克确定性推演）=====
  // 取材均为有源体系：盘中五行=八字计分（本引擎 computeBazi）、此向五行=二十四山通行配属；
  // 「注入-平衡-补缺共鸣」的组合玩法为 App 自创，UI 须注明自家演算。
  // 今日天时五行：黄历年月日时干支（日柱当令权重最高）+ 时卦两卦之气 → 五行分布
  function dayElements(date) {
    const d = date || new Date();
    const ec = Solar.fromDate(d).getLunar().getEightChar();
    const scores = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    const add = (el, w) => { if (el && scores[el] != null) scores[el] += w; };
    const gw = [0.8, 1.0, 1.4, 1.2];             // 年/月/日/时
    [ec.getYearGan(), ec.getMonthGan(), ec.getDayGan(), ec.getTimeGan()].forEach((g, i) => add(GAN_EL[g], gw[i]));
    [ec.getYearZhi(), ec.getMonthZhi(), ec.getDayZhi(), ec.getTimeZhi()].forEach((z, i) => add(ZHI_EL[z], gw[i] * 0.8));
    const h = meihuaByDate(d);
    if (TRIGRAMS[h.upper]) add(TRIGRAMS[h.upper].el, 0.8);
    if (TRIGRAMS[h.lower]) add(TRIGRAMS[h.lower].el, 0.8);
    let dominant = ELEMENTS[0];
    ELEMENTS.forEach(e => { if (scores[e] > scores[dominant]) dominant = e; });
    return { scores, dominant };
  }

  function wuxingResonance(bazi, deg, dayScores) {
    const m = mountainAt(deg);
    const scores = {};
    ELEMENTS.forEach(e => { scores[e] = bazi.scores[e]; });
    const total = ELEMENTS.reduce((s, e) => s + bazi.scores[e], 0);
    const boost = total > 0 ? (total / 5) * 0.6 : 1;
    scores[m.el] += boost;                       // 此向之气注入
    if (dayScores) {                             // 今日天时之气（黄历干支×时卦，勾选纳入）
      const dtot = ELEMENTS.reduce((s, e) => s + (dayScores[e] || 0), 0) || 1;
      ELEMENTS.forEach(e => { scores[e] += boost * 0.6 * (dayScores[e] || 0) / dtot; });
    }
    const vals = ELEMENTS.map(e => scores[e]);
    const avg = vals.reduce((a, b) => a + b, 0) / 5;
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - avg) * (v - avg), 0) / 5);
    const balance = avg > 0 ? Math.max(0, Math.round(100 * (1 - sd / avg))) : 0;
    // 盘中最薄之气：此向恰补之则「共鸣」（每张盘必有触发向，可解释、确定性）
    let weakest = ELEMENTS[0];
    ELEMENTS.forEach(e => { if (bazi.scores[e] < bazi.scores[weakest]) weakest = e; });
    return { scores, balance, dirEl: m.el, weakest, resonate: m.el === weakest };
  }

  // 此向十神（以日主五行论，与所求引擎同一套生克口径）
  // major 按喜用神动态判：此向五行在 favorable 则高亮，不以十神种类硬编码。
  // 典籍依据：《渊海子平》卷二·论十神——正印"生我之神，为贵气之本"，身弱时为第一喜用神。
  function shishenOfDirection(bazi, deg) {
    const el = mountainAt(deg).el;
    const dm = bazi.dmEl;
    const isFav = bazi.favorable.includes(el);
    if (CONTROLS[dm] === el) return { tag: '财位', detail: '我克者为财（正财/偏财之气）', major: isFav };
    if (CONTROLLED_BY[dm] === el) return { tag: '官禄位', detail: '克我者为官（正官之气）', major: isFav };
    if (GENERATED_BY[dm] === el) return { tag: '印星位', detail: '生我者为印（主学业文书）', major: isFav };
    if (GENERATES[dm] === el) return { tag: '食伤位', detail: '我生者为食伤（主才艺名声）', major: isFav };
    return { tag: '比劫位', detail: '同我之气（主同辈相帮）', major: isFav };
  }

  // ===== 所求 =====
  const GOALS = ['正财', '偏财', '官职', '健康', '姻缘', '学业'];
  // 「安身择城」清单已移除：原为手工编辑的城市联想、非命理推算，易被误当权威推荐
  function adviseGoal(bazi, goal, gender) {
    const dm = bazi.dmEl;
    let target, star, practical;
    switch (goal) {
      case '正财': target = CONTROLS[dm]; star = '正财星';
        practical = '正财靠积累：稳定主业、手艺与复利为本，宜在实业商贸繁盛之地深耕一行。'; break;
      case '偏财': target = CONTROLS[dm]; star = '偏财星';
        practical = '偏财靠机遇与流通：信息密度高的金融贸易之城机会最多，但下注须有止损，命理不替风险兜底。'; break;
      case '官职': target = CONTROLLED_BY[dm]; star = '正官星';
        practical = '求官者平台为先：组织资源集中之地机会最盛，沉得住气、立得住功是正途。'; break;
      case '健康': target = bazi.isStrong ? GENERATES[dm] : GENERATED_BY[dm];
        star = bazi.isStrong ? '食伤（泄秀）' : '印星（生扶）';
        practical = '健康之本在节律：作息、饮食、心绪三者守恒，胜过一切方位补救。'; break;
      case '姻缘': target = gender === '乾造' ? CONTROLS[dm] : CONTROLLED_BY[dm];
        star = gender === '乾造' ? '财星（妻星）' : '官星（夫星）';
        practical = '姻缘在人不在地：多入人群、修己待人，方位只是助缘。'; break;
      default: target = GENERATED_BY[dm]; star = '印星';
        practical = '学业以印为用：静处宜学，名师益友为先，方向比努力更要紧。';
    }
    return { goal, target, star, dir: EL_DIR[target], color: EL_COLOR_NAME[target], practical };
  }

  // ===== 司南文案（中性讲述者口吻，槽位拼装引擎）=====
  // 事实由引擎参数注入（五行/吉凶/宜忌等，有出处、不许变）；变体只是文气外壳，不带新断言。
  // 种子规则：个人内容按四柱取种（同盘恒同文、异盘异文），日更内容按日干支取种（全员一致）。
  function spin(seed, key, variants) {
    return variants[stableHash(seed + '#' + key) % variants.length];
  }
  const NUM_HAN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const numHan = n => (n >= 0 && n <= 10 ? NUM_HAN[n] : String(n));
  const DISCLAIMER = '';

  function masterDaily(a) {
    // 按日种子：今日内容全员一致（日更内容，非个人测算）
    const s = a.ganZhiText;
    const lines = [spin(s, 'op', [
      '晨起观天象，', '今晨翻检历书，', '卯时推演盘中消息，', '开盘先正其时——',
      '晨光初定，历象昭然，', '检点今日干支，', '天色既明，按例观历：', '一日之计，先看历——',
    ]) + `今日乃${a.ganZhiText}，${a.lunarText}。`];
    if (a.jieQiToday) {
      lines.push(spin(s, 'jq', [
        `恰逢「${a.jieQiToday}」节气交接，天地气机一转，最宜顺时调摄。`,
        `今日交「${a.jieQiToday}」，时令一换，作息饮食且随之调一调。`,
        `「${a.jieQiToday}」在今日交节，气候更迭之际，诸事顺时而为。`,
      ]));
    } else {
      lines.push(spin(s, 'jq', [
        `时下处「${a.currentJieQi}」气中，待${a.nextJieQiDate}交「${a.nextJieQi}」。`,
        `眼下仍在「${a.currentJieQi}」气里，${a.nextJieQiDate}方交「${a.nextJieQi}」。`,
        `「${a.currentJieQi}」之气未尽，${a.nextJieQiDate}起换「${a.nextJieQi}」。`,
      ]));
    }
    if (a.taoFest.length) {
      lines.push(spin(s, 'tf', [
        `道历今日逢${a.taoFest.join('、')}，宜静心持诵。`,
        `按道历，今日是${a.taoFest.join('、')}，心静则安。`,
      ]));
    }
    lines.push(spin(s, 'hex', [
      `以时起卦，得「${a.hexagram.name}」，${a.hexagram.moving}爻动——${a.hexagram.meaning}。`,
      `按时辰起得「${a.hexagram.name}」，动在${a.hexagram.moving}爻——${a.hexagram.meaning}。`,
      `时卦落「${a.hexagram.name}」，${a.hexagram.moving}爻发动，其意曰：${a.hexagram.meaning}。`,
      `起卦得「${a.hexagram.name}」，${a.hexagram.moving}爻动，断曰：${a.hexagram.meaning}。`,
    ]));
    if (a.yi.length) {
      const yi = a.yi.slice(0, 3).join('、'), ji = a.ji.slice(0, 3).join('、');
      lines.push(spin(s, 'yj', [
        `黄历有云：宜${yi}；忌${ji}。`,
        `历书注得明白：宜${yi}；忌${ji}。`,
        `今日宜${yi}；至于${ji}，且忌之。`,
      ]));
    }
    return lines.join('');
  }
  function masterBazi(c) {
    const sorted = ELEMENTS.slice().sort((x, y) => c.scores[y] - c.scores[x]);
    const pct = Math.round(c.ratio * 100);
    const primary = c.favorable[0];
    const favs = c.favorable.join('、');
    const gzs = c.pillars.map(p => p.gz).join(' ');
    // 按人种子：同盘恒同文、异盘异文
    const s = c.pillars.map(p => p.gz).join('') + c.dm;
    const lines = [];
    lines.push(spin(s, 'op', [
      '', '展盘细看。', '四柱既立，先观大局。', '盘面铺开，一一道来。',
      '此造入手，先记根基。', '排盘已定，且按部就班说来。', '以干支论命，从年月日时说起。',
    ]));
    lines.push(`你出生在${c.lunarText}，生肖属${c.shengXiao}。`);
    lines.push(spin(s, 'pl', [
      `四柱排定：${gzs}，日主${c.dm}${c.dmEl}，日柱纳音「${c.pillars[2].naYin}」。`,
      `盘列四柱：${gzs}——以${c.dm}${c.dmEl}为日主，日柱纳音「${c.pillars[2].naYin}」。`,
      `年月日时四柱为 ${gzs}，日主${c.dm}属${c.dmEl}，纳音落「${c.pillars[2].naYin}」。`,
    ]));
    lines.push(spin(s, 'st', [
      `盘中五行，${sorted[0]}气最盛，${sorted[4]}气最薄；比劫印绶共占${pct}%，故断为${c.isStrong ? '身强' : '身弱'}。`,
      `论五行轻重：${sorted[0]}最旺、${sorted[4]}最薄，同党之气占${pct}%，此盘断作${c.isStrong ? '身强' : '身弱'}。`,
      `五气盈缩各有数：${sorted[0]}盛而${sorted[4]}衰，比劫印绶合${pct}%——是为${c.isStrong ? '身强' : '身弱'}之局。`,
    ]));
    lines.push(c.isStrong ? spin(s, 'ad', [
      `身强者宜泄宜耗，喜用在${favs}。`,
      `气盛则喜疏导，取克泄耗为用，喜用落在${favs}。`,
      `旺极忌再扶，泄其有余方见功，喜用在${favs}。`,
    ]) : spin(s, 'ad', [
      `身弱者宜生宜扶，喜用在${favs}。`,
      `气弱则喜滋养，生扶为先，喜用落在${favs}。`,
      `弱不受克，扶其不足为要，喜用在${favs}。`,
    ]));
    lines.push(spin(s, 'cl', [
      `平日可多亲近${EL_DIR[primary]}，常用${EL_COLOR_NAME[primary]}之色，${EL_SEASON[primary]}季气运尤顺。`,
      `起居行止，不妨偏向${EL_DIR[primary]}；衣物器用取${EL_COLOR_NAME[primary]}之色，${EL_SEASON[primary]}季最见顺意。`,
      `按这套传统算法，可多留意${EL_DIR[primary]}；颜色可选${EL_COLOR_NAME[primary]}，对应时节是${EL_SEASON[primary]}季。`,
      `方位取${EL_DIR[primary]}，颜色尚${EL_COLOR_NAME[primary]}，时令应在${EL_SEASON[primary]}季——三者皆顺喜用之气。`,
    ]));
    if (c.xunKong) {
      lines.push(spin(s, 'xk', [
        `日柱旬空在${c.xunKong}，逢此二支之年月，谋事宜缓不宜急。`,
        `另记一笔：日柱旬空落${c.xunKong}，遇此二支当令时，凡事多留三分余地。`,
        `${c.xunKong}为此盘旬空所在，逢之则缓图为上，不必强求。`,
      ]));
    }
    return lines.join('');
  }
  function masterDirection(r) {
    const adviceMap = {
      木: '木气主生发，利谋划开新、读书进益', 火: '火气主光明，利声名交际、动中取势',
      土: '土气主厚载，利安居守成、踏实积蓄', 金: '金气主肃断，利决断整饬、去芜存菁',
      水: '水气主流通，利思虑通达、往来生财',
    };
    const t = TRIGRAMS[r.trigram];
    const s = r.zuoXiang;
    const head = spin(s, 'h', [
      `罗盘既定：${r.zuoXiang}，向首落于${r.trigram}宫（${t.symbol} ${t.nature}），五行属${r.facing.el}。`,
      `此盘定得${r.zuoXiang}，向上是${r.trigram}宫（${t.symbol} ${t.nature}），其气属${r.facing.el}。`,
      `指针落定——${r.zuoXiang}，向首${r.trigram}宫（${t.symbol} ${t.nature}），五行归${r.facing.el}。`,
    ]);
    const tail = spin(s, 't', [
      `坐山${r.sitting.name}为靠，向${r.facing.name}而纳气，门窗朝此向者，宜常开通风，使气脉流转不滞。`,
      `背倚${r.sitting.name}山，面纳${r.facing.name}方之气；此向的门窗常开常净，气自流转不滞。`,
      `${r.sitting.name}山在后为靠，${r.facing.name}方在前纳气——朝此向的门窗，勤通风、少堆积便是。`,
    ]);
    return `${head}${adviceMap[r.facing.el]}。${tail}`;
  }
  function masterGoal(adv, bazi) {
    const s = bazi.pillars.map(p => p.gz).join('') + adv.goal;
    const lines = [];
    lines.push(spin(s, 'op', [
      `你想了解的是“${adv.goal}”。按日主${bazi.dm}${bazi.dmEl}推算，这一项对应${adv.star}，五行属${adv.target}。`,
      `你选择了“${adv.goal}”。日主是${bazi.dm}${bazi.dmEl}，这项传统上看${adv.star}，对应${adv.target}。`,
      `关于“${adv.goal}”，按${bazi.dm}${bazi.dmEl}日主推算，会先看${adv.star}，五行归${adv.target}。`,
    ]));
    lines.push(spin(s, 'dr', [
      `${adv.target}旺于${adv.dir}，其色尚${adv.color}，${EL_SEASON[adv.target]}季气机最顺——居处行止，可常向此方。`,
      `论方位，${adv.target}气旺在${adv.dir}；论颜色，以${adv.color}为佳；${EL_SEASON[adv.target]}季其气最足。`,
      `${adv.dir}是${adv.target}气所聚，常往无妨；衣饰器物取${adv.color}，应在${EL_SEASON[adv.target]}季尤顺。`,
    ]));
    lines.push(spin(s, 'pr', [
      `再赠一句实在话：${adv.practical}`,
      `玄理之外，说句实在的：${adv.practical}`,
      `落到实处讲：${adv.practical}`,
      `记一句紧要的：${adv.practical}`,
    ]));
    return lines.join('');
  }

  // ===== 形煞几何（Phase 8）：F7·路冲煞，F11·穿心煞 =====
  // 纯几何判据，确定性硬编码，同输入恒同输出，不调用 LLM 或随机。
  // 公式详见 docs/auto/yangzhai-luopan/formulas.md（F7, F11）；数据源：OSM Overpass（浏览器直调）。

  // Haversine 距离（米）
  function shaHav(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  // 无符号最小角差 [0, 180]
  function shaUAng(a, b) { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; }
  // WGS-84 → ENU 局部坐标（x=东米，y=北米），以穴位 (lat0, lng0) 为原点
  function shaENU(lat, lng, lat0, lng0) {
    const R = 6371000;
    return { x: R * (lng - lng0) * Math.PI / 180 * Math.cos(lat0 * Math.PI / 180), y: R * (lat - lat0) * Math.PI / 180 };
  }
  // 线段 (ax,ay)–(bx,by) 上距原点 (0,0) 最近点；返回 {nx, ny, t∈[0,1], dist}
  function shaNearSeg(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    if (len2 === 0) return { nx: ax, ny: ay, t: 0, dist: Math.hypot(ax, ay) };
    const t = Math.max(0, Math.min(1, (-ax * dx - ay * dy) / len2));
    const nx = ax + t * dx, ny = ay + t * dy;
    return { nx, ny, t, dist: Math.hypot(nx, ny) };
  }

  // F7: 路冲煞（Road Rushing Sha）
  // 出处：明·王君荣《阳宅十书》·论路「直来之路主伤丁」；
  //       参数阈值（15°/50m）为业界工程经验值，非原典数字。
  // 数值算例：门向 180°（正南），南方 55.7m 处有北→南走向直路（路长≥50m），
  //   α = shaUAng(180°, 180°) = 0° ≤ 15°，d = 55.7m ≤ 80m → 强路冲煞 ✓
  function shaCheckLuChong(roadWays, lat, lng, doorBearing) {
    let best = null;
    for (const way of roadWays) {
      const nodes = way.nodes; if (!nodes || nodes.length < 2) continue;
      const pts = nodes.map(n => shaENU(n.lat, n.lng, lat, lng));
      // 用全路段总长作为 straight_length 的代理（实际应为直线走向段，近似安全）
      let L = 0;
      for (let i = 0; i < pts.length - 1; i++) L += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      for (let i = 0; i < pts.length - 1; i++) {
        const { nx, ny, dist } = shaNearSeg(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        if (dist > 120) continue;
        // 方位角：从穴位 P（原点）到最近点 Q；ENU 中 bearing = atan2(x_east, y_north)
        const θPQ = norm(Math.atan2(nx, ny) * 180 / Math.PI);
        const α = shaUAng(θPQ, doorBearing);
        if (α > 22.5) continue;
        let level = 'none';
        if (α <= 15 && L >= 50 && dist <= 80)   level = 'strong';
        else if (α <= 22.5 && L >= 30 && dist <= 120) level = 'weak';
        if (level === 'none') continue;
        if (!best || (level === 'strong' && best.level !== 'strong') || dist < best.dist) {
          best = { found: true, level, dist: Math.round(dist), angle: Math.round(α), L: Math.round(L),
            name: '路冲煞',
            src: '出处：明·王君荣《阳宅十书》·论路「直来之路主伤丁」；距离/角度阈值为工程经验值，非原典数字',
            desc: `${level === 'strong' ? '⚠️ 强路冲煞' : '⚠ 弱路冲煞'}：门前约 ${Math.round(dist)} m 处有道路直冲，冲角 ${Math.round(α)}°，道路延伸约 ${Math.round(L)} m。` };
        }
      }
    }
    return best || { found: false };
  }

  // F11: 穿心煞（Road Crossing Sha）
  // 道路从门前横切（路向与门向约成 90°），紧贴门口 d ≤ 15m。
  // 出处：明·王君荣《阳宅十书》·论路；「穿心煞」为历代通行名称；参数为工程经验值。
  // 数值算例：门向 180°（南），东西向道路（segBear=90°）d=10m 在门前，
  //   crossAngle = shaUAng(90°, 180°) = 90°，|90−90|=0° ≤ 30° → 穿心煞 ✓
  function shaCheckChuanXin(roadWays, lat, lng, doorBearing) {
    let best = null;
    for (const way of roadWays) {
      const nodes = way.nodes; if (!nodes || nodes.length < 2) continue;
      const pts = nodes.map(n => shaENU(n.lat, n.lng, lat, lng));
      for (let i = 0; i < pts.length - 1; i++) {
        const { nx, ny, dist } = shaNearSeg(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        if (dist > 15) continue;
        // 最近点须在门前方（门向 ±60°）
        const θPQ = norm(Math.atan2(nx, ny) * 180 / Math.PI);
        if (shaUAng(θPQ, doorBearing) > 60) continue;
        // 路段方向角：atan2(x_east_diff, y_north_diff)
        const segBear = norm(Math.atan2(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y) * 180 / Math.PI);
        const crossAngle = shaUAng(segBear, doorBearing);
        if (Math.abs(crossAngle - 90) > 30) continue; // 路须约垂直于门向（60°–120°）
        if (!best || dist < best.dist) {
          best = { found: true, dist: Math.round(dist), crossAngle: Math.round(crossAngle),
            name: '穿心煞',
            src: '出处：明·王君荣《阳宅十书》·论路；「穿心煞」为历代通行名称，距离/角度阈值为工程经验值',
            desc: `⚠ 穿心煞：门前 ${Math.round(dist)} m 处道路横切（路向与门向夹角 ${Math.round(crossAngle)}°），犯穿心之格。` };
        }
      }
    }
    return best || { found: false };
  }

  // ===== 流年方位：太岁 / 三煞 / 年紫白（CODEX-REVIEW.md 必修3）=====
  // F-LY-01: 年支（1864甲子=子, 12年周期）
  // 注：未做立春日内精确切年，调用方传入已立春后的公历年（待 LY-C1 优化）
  // 出处：干支纪年古法；《钦定协纪辨方书》卷三（清乾隆四年重修，含何国宗、梅瑴成）
  const LY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  // 各地支对应15°二十四山中心角（CODEX-REVIEW.md 必修3·用15°支位，非45°八宫）
  const LY_BRANCH_DEG = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  // F-LY-01 数值算例：2026 → (162 % 12 = 6) → 午(180°) ✓
  function lyGetZhi(year) {
    const idx = ((year - 1864) % 12 + 12) % 12;
    return { idx, name: LY_BRANCHES[idx], deg: LY_BRANCH_DEG[idx] };
  }

  // F-LY-02: 太岁方位（年支15°山位）
  // 出处：《钦定协纪辨方书》卷三·论太岁（乾隆四年重修，何国宗、梅瑴成编纂）
  // 数值算例：2026丙午 → 午 → 180°（正南）；岁破 = 对冲 = 0°（子·正北）
  function lyTaiSuiDir(year) {
    const zhi = lyGetZhi(year);
    const suipo = (zhi.deg + 180) % 360;
    return { zhi, suipoDeg: suipo };
  }

  // F-LY-03: 三煞方位（三合局对冲三山，每山15°，CODEX-REVIEW.md 必修3）
  // 四局：申子辰→煞南(巳午未)；亥卯未→煞西(申酉戌)；寅午戌→煞北(亥子丑)；巳酉丑→煞东(寅卯辰)
  // 出处：《钦定协纪辨方书》卷三（劫煞/灾煞/岁煞，乾隆四年重修，何国宗、梅瑴成编纂）
  // 数值算例：2026午年→寅午戌局→三煞在北：亥(330°)、子(0°)、丑(30°) ✓
  const LY_SANSHA_MAP = {
    申: ['巳','午','未'], 子: ['巳','午','未'], 辰: ['巳','午','未'],
    亥: ['申','酉','戌'], 卯: ['申','酉','戌'], 未: ['申','酉','戌'],
    寅: ['亥','子','丑'], 午: ['亥','子','丑'], 戌: ['亥','子','丑'],
    巳: ['寅','卯','辰'], 酉: ['寅','卯','辰'], 丑: ['寅','卯','辰'],
  };
  function lySanSha(year) {
    const zhi = lyGetZhi(year);
    return (LY_SANSHA_MAP[zhi.name] || []).map(n => {
      const i = LY_BRANCHES.indexOf(n);
      return { name: n, deg: LY_BRANCH_DEG[i] };
    });
  }

  // F-LY-04: 年紫白入中宫（逐年递减，2024甲辰=三碧入中为验证锚）
  // 出处：《飞星赋》（明清通行，待核实原句）；年星递减为玄空通行法则
  // 数值算例：2026 → offset=2 → ((3-2-1+9)%9)+1 = 1（一白入中）✓
  function lyNianCenter(year) {
    const offset = ((year - 2024) % 9 + 9) % 9;
    return ((3 - offset - 1 + 9) % 9) + 1;
  }

  // F-LY-05: 年紫白飞布（顺/逆等价，见 xkFlyStars 顺逆等价定理·v2-P30）
  // 数值验证：2026一白入中 → C=1,NW=2,W=3,NE=4,S=5,N=6,SW=7,E=8,SE=9 ✓
  // P10-C2（顺逆争议）已数学证明为非问题：asc 参数对结果无影响，关闭。
  function lyNianPlate(year) {
    return xkFlyStars(lyNianCenter(year), true); // asc=true，顺逆等价，任意值均正确
  }

  // 年星名称（1–9）
  const LY_STAR_NAMES = ['', '一白水星', '二黑土星', '三碧木星', '四绿木星', '五黄土星', '六白金星', '七赤金星', '八白土星', '九紫火星'];
  const LY_STAR_BAD   = new Set([2, 3, 5, 7]); // 凶星（CODEX-REVIEW §必修3·太岁三煞/年紫白展示）
  const LY_STAR_GOOD  = new Set([1, 4, 6, 8, 9]); // 吉星（当令参考）

  // F-v2-P34: 伏吟/反吟年盘诊断
  // 出处：清末沈竹礽《沈氏玄空学》约1891年（后人整理增广）
  //
  // 定义：
  //   伏吟方（宫d）：年紫白在d宫飞星 == 宅盘d宫飞星（同星同宫，伏而不动）
  //   反吟方（宫d）：年紫白在d宫飞星 == 宅盘对宫飞星（星被"翻转"至对宫，冲动）
  //
  // 对宫映射（洛书九宫）：N↔S, E↔W, NE↔SW, NW↔SE, C↔C（中宫无反吟）
  //
  // 全局伏吟充要条件：nianCenter == entryStar（年入中 == 盘飞星入中）
  // 全局反吟传统标记：nianCenter + entryStar == 10（待 Codex P34-C1 核实「全局反吟」标准定义）
  //
  // 数值算例（九运·午向S·180°·year=2026·一白入中）：
  //   年盘{C:1,NW:2,W:3,NE:4,S:5,N:6,SW:7,E:8,SE:9}
  //   向盘{C:4,NW:5,W:6,NE:7,S:8,N:9,SW:1,E:2,SE:3}  facingEntryStar=4
  //   反吟：SW宫年=7，facing[NE]=7 ✓ → 向盘反吟方:[SW]
  //   山盘{C:5,NW:6,W:7,NE:8,S:9,N:1,SW:2,E:3,SE:4}  mountainEntryStar=5
  //   反吟：W宫年=3，mountain[E]=3 ✓ → 山盘反吟方:[W]
  // 数值算例（九运·午向·year=2023·四绿入中）：
  //   nianCenter=4 == facingEntryStar=4 → 向盘全局伏吟
  // 待 Codex P34-C1：「全局反吟」centers sum=10 在中文玄空教材中是否为正式判据
  var OPP_DIR34 = { N:'S', S:'N', E:'W', W:'E', NE:'SW', SW:'NE', NW:'SE', SE:'NW', C:'C' };
  var DIRS9_34  = ['C','N','NE','E','SE','S','SW','W','NW'];

  function xkFuyinFanyin(chart, year) {
    var nianC = lyNianCenter(year);
    var nianP = lyNianPlate(year);

    function checkPlate(plate, entryStar) {
      var fuyin = [], fanyin = [];
      var fullFuyin  = (nianC === entryStar);
      var fullFanyin = ((nianC + entryStar) === 10);
      DIRS9_34.forEach(function(d) {
        var nStar = nianP[d];
        if (nStar === plate[d]) fuyin.push(d);
        if (d !== 'C' && nStar === plate[OPP_DIR34[d]]) fanyin.push(d);
      });
      return { fuyin: fuyin, fanyin: fanyin, fullFuyin: fullFuyin, fullFanyin: fullFanyin };
    }

    return {
      facing:       checkPlate(chart.facing,   chart.facingEntryStar),
      mountain:     checkPlate(chart.mountain,  chart.mountainEntryStar),
      nianCenter:   nianC,
      nianStarName: LY_STAR_NAMES[nianC] || String(nianC),
    };
  }

  // F-v2-P35: 月盘伏吟/反吟诊断（lyMonthPlate vs 宅向/山盘；逻辑同 xkFuyinFanyin）
  // 出处：清末沈竹礽《沈氏玄空学》约1891年，后人整理增广
  // 铁律①：同(chart, year, monthIdx)恒同输出，纯函数无随机
  // 铁律②：全局反吟「monthCenter+entryStar=10」同 P34-C1 待核实；仅判数值关系不断言吉凶
  // 参数：chart=xkComputeXuanKong/xkComputeXuanKong24 输出；year=堪舆年；monthIdx=0(寅)..11(丑)
  // 数值算例（九运午向·facingEntryStar=4·mountainEntryStar=5，2026年）：
  //   辰月idx=2: lyMonthCenter(2026,2)=((8-2-1+900)%9)+1=(905%9)+1=5+1=6
  //     monthCenter=6, facingEntryStar=4: 6+4=10 → 向盘全局反吟=true ✓（待P35-C1核实）
  //   巳月idx=3: lyMonthCenter(2026,3)=((8-3-1+900)%9)+1=(904%9)+1=4+1=5
  //     monthCenter=5, mountainEntryStar=5: 5==5 → 山盘全局伏吟=true ✓
  //   寅月idx=0: lyMonthCenter(2026,0)=8；月盘[E]=6；向盘facing[W]=6=facing[OPP(E)] → 向盘反吟方E ✓
  //              月盘[NE]=2；山盘mountain[SW]=2=mountain[OPP(NE)] → 山盘反吟方NE ✓
  function xkMonthFuyinFanyin(chart, year, monthIdx) {
    var mC = lyMonthCenter(year, monthIdx);
    var mP = lyMonthPlate(year, monthIdx);

    function checkPlate(plate, entryStar) {
      var fuyin = [], fanyin = [];
      var fullFuyin  = (mC === entryStar);
      var fullFanyin = ((mC + entryStar) === 10); // 待 Codex P35-C1 核实（同 P34-C1）
      DIRS9_34.forEach(function(d) {
        var mStar = mP[d];
        if (mStar === plate[d]) fuyin.push(d);
        if (d !== 'C' && mStar === plate[OPP_DIR34[d]]) fanyin.push(d);
      });
      return { fuyin: fuyin, fanyin: fanyin, fullFuyin: fullFuyin, fullFanyin: fullFanyin };
    }

    return {
      facing:        checkPlate(chart.facing,   chart.facingEntryStar),
      mountain:      checkPlate(chart.mountain,  chart.mountainEntryStar),
      monthCenter:   mC,
      monthStarName: LY_STAR_NAMES[mC] || String(mC),
    };
  }

  // F-v2-P10-01: 月紫白入中公式（天干阴阳 + 寅月基准，每月递减）
  // 出处：《沈氏玄空学》月紫白（清末沈竹礽著述，后人整理/增广）；《飞星赋》月星排布（明清通行）
  // 规则：取堪舆年天干阴阳 → 确定寅月（正月，起于立春）入中基准星
  //   天干阳（甲丙戊庚壬，ganIdx%2===0）：寅月入中 = 八白土星
  //   天干阴（乙丁己辛癸，ganIdx%2===1）：寅月入中 = 五黄土星
  //   其后每月递减：卯月=寅月-1，辰月=卯月-1，…（1递减到9，循环）
  // 数值验证：
  //   2026丙午（ganIdx=2，阳干）：寅月=8，卯月=7，午月(4)=4，戌月(8)=9，丑月(11)=6 ✓
  //   2025乙巳（ganIdx=1，阴干）：寅月=5，卯月=4，申月(6)=8 ✓
  // 参数：year=堪舆年（lyChineseYear输出值）；monthIdx=0(寅·正月)…11(丑·腊月)
  function lyMonthCenter(year, monthIdx) {
    var ganIdx = ((year - 1864) % 10 + 10) % 10;
    var yinCenter = (ganIdx % 2 === 0) ? 8 : 5; // 阳干寅月基准=八白；阴干=五黄
    return ((yinCenter - monthIdx - 1 + 9 * 100) % 9) + 1;
  }

  // F-v2-P10-02: 月紫白飞布（顺/逆等价，P10-C2 已数学证明关闭·v2-P30）
  function lyMonthPlate(year, monthIdx) {
    return xkFlyStars(lyMonthCenter(year, monthIdx), true); // asc=true，顺逆等价，任意值均正确
  }

  // F-v2-P10-03 / F-v2-P14: 节月索引推算
  // 节月以节（非中气）界定：寅月起于立春，卯月起于惊蛰，辰月起于清明，…
  // JIEQI_MONTH：各节气默认起始日（公历，2020-2060年代典型"较晚"值，作为 fallback）
  // 出处：中国国家标准 GB/T 33661-2017《农历的编算和颁行》附录；节气近似公式
  // 索引：0=寅月(立春~Feb4)，1=卯月(惊蛰~Mar6)，…，10=子月(大雪~Dec7)，11=丑月(小寒~Jan6)
  const JIEQI_MONTH = [
    [2,4],[3,6],[4,5],[5,6],[6,6],[7,7],[8,7],[9,8],[10,8],[11,7],[12,7],[1,6]
  ];

  // F-v2-P14: 各节气"早发"年份集合（比默认日早一天，同 LICHUN_FEB3 模式）
  // 出处：天文算法估算（无独立书面来源，待核实）
  // 数据范围：2020–2030；2031+未收录，自动降级为 JIEQI_MONTH 近似日（±1-2天）
  // 立春(idx=0)早发年份由 LICHUN_FEB3 处理，此处不重复收录
  // 待 Codex P14-C1 独立复核：以中国天文年历/香港万年历/紫金山天文台验证各年份日期
  const JIEQI_EARLY = {
    // 惊蛰(idx=1, default Mar 6, early=Mar 5)
    1:  new Set([2020,2021,2024,2025,2028,2029]),
    // 清明(idx=2, default Apr 5, early=Apr 4)
    2:  new Set([2020,2021,2024,2025,2028,2029]),
    // 立夏(idx=3, default May 6, early=May 5)
    3:  new Set([2020,2021,2022,2024,2025,2028,2029]),
    // 芒种(idx=4, default Jun 6, early=Jun 5)
    4:  new Set([2020,2021,2022,2024,2025,2028,2029]),
    // 小暑(idx=5, default Jul 7, early=Jul 6)
    5:  new Set([2020,2021,2022,2023,2024,2028,2029]),
    // 立秋(idx=6, default Aug 7, early=Aug 6)：较少提前，保守仅收录闰年
    6:  new Set([2020,2024,2028]),
    // 白露(idx=7, default Sep 8, early=Sep 7)
    7:  new Set([2020,2021,2022,2024,2025,2028,2029]),
    // 寒露(idx=8, default Oct 8, early=Oct 7)
    8:  new Set([2020,2021,2024,2025,2028,2029]),
    // 立冬(idx=9, default Nov 7, early=Nov 6)
    9:  new Set([2020,2021,2024,2025,2028,2029]),
    // 大雪(idx=10, default Dec 7, early=Dec 6)：较少提前
    10: new Set([2020,2024,2028]),
    // 小寒(idx=11, default Jan 6, early=Jan 5)：按公历年计
    11: new Set([2021,2022,2025,2026,2029,2030]),
  };

  // F-v2-P14: lyCurrentMonthIdx — 公历日期 → 节月索引（精确版，v2-P14升级）
  // 新接口：lyCurrentMonthIdx(year, month, day)  — 精确到年份特例，已录入年份(2020-2030)精度 ±0天
  // 旧接口：lyCurrentMonthIdx(month, day)         — 向后兼容，year=null 降级到 JIEQI_MONTH 近似
  // 立春(idx=0)早发：用 LICHUN_FEB3（v2-P8 已实现）
  // 其余节气早发：用 JIEQI_EARLY[idx]（v2-P14 新增）
  // 数值验证：
  //   (2026, 2,4)  → 立春effDay=4 → idx=0 寅月 ✓   (2025,3,5) → idx=0 寅月(惊蛰Mar5前) ✓
  //   (2025, 3,5)  → 惊蛰effDay=5(JIEQI_EARLY[1].has(2025)=true) → idx=1 ✓
  //   (2026, 6,25) → 芒种effDay=6(JIEQI_EARLY[4].has(2026)=false) → idx=4 午月 ✓
  //   (2026, 1,5)  → 小寒effDay=5(JIEQI_EARLY[11].has(2026)=true) → idx=11 丑月 ✓
  //   (2023, 1,5)  → 小寒effDay=6(JIEQI_EARLY[11].has(2023)=false) → idx=10 子月 ✓
  function lyCurrentMonthIdx(yearOrMonth, monthOrDay, dayOrUndef) {
    var year, m, d;
    if (dayOrUndef === undefined) {
      year = null; m = yearOrMonth; d = monthOrDay; // 旧接口兼容
    } else {
      year = yearOrMonth; m = monthOrDay; d = dayOrUndef;
    }
    // 取该节气有效起始日（考虑年份特例）
    function effDay(idx, baseDef) {
      if (idx === 0) return (year && LICHUN_FEB3.has(year)) ? baseDef - 1 : baseDef;
      if (year && JIEQI_EARLY[idx] && JIEQI_EARLY[idx].has(year)) return baseDef - 1;
      return baseDef;
    }
    if (m === 1) {
      var jan6 = effDay(11, 6);
      return (d >= jan6) ? 11 : 10;
    }
    for (var i = 10; i >= 0; i--) {
      var jm = JIEQI_MONTH[i][0];
      var jd = effDay(i, JIEQI_MONTH[i][1]);
      if (m > jm || (m === jm && d >= jd)) return i;
    }
    return 11; // 防守性兜底
  }

  // F-v2-P8: 立春切年精确化（CODEX-REVIEW.md 必修2·立春切年，v2-P8 深化）
  // 立春日期表（2020–2060，UTC+8基准，精确到日）
  // 数据来源：中国天文历法立春时刻推算（各年份误差 ±0天）
  // 原理：每隔约4年立春提前一天（2021,2025,2029…为 Feb3；其余年份为 Feb4）
  // 2020–2060年内无 Feb5 案例（极罕，最近为2012年）
  // 数值验证：2026年立春 Feb4（公历）→ LICHUN_FEB3 不含2026 → day=4 ✓
  //           2025年立春 Feb3（公历）→ LICHUN_FEB3 含2025 → day=3 ✓
  //           2021年立春 Feb3 → LICHUN_FEB3 含2021 ✓
  const LICHUN_FEB3 = new Set([2021,2025,2029,2033,2037,2041,2045,2049,2053,2057]);

  // F-v2-P8: lyChineseYear — 依立春边界返回堪舆太阳年
  // 出处：CODEX-REVIEW.md §必修2；《钦定协纪辨方书》卷首·论交年（乾隆四年重修，何国宗、梅瑴成编纂）
  // 规则：公历日期 ≥ 当年立春日期（2月N日） → 当年为堪舆年；否则 → 上一年
  // 参数：calYear=公历年(整数), month=1–12, day=1–31
  // 数值算例：
  //   lyChineseYear(2026, 2, 3) → 2026 < Feb4 立春 → 返回 2025 ✓（仍为乙巳年）
  //   lyChineseYear(2026, 2, 4) → 2026 ≥ Feb4 → 返回 2026 ✓（丙午年）
  //   lyChineseYear(2026, 3, 1) → month>2 → 返回 2026 ✓
  //   lyChineseYear(2025, 2, 2) → 2025 < Feb3 → 返回 2024 ✓
  //   lyChineseYear(2025, 2, 3) → 2025 ≥ Feb3 → 返回 2025 ✓
  function lyChineseYear(calYear, month, day) {
    var lc = LICHUN_FEB3.has(calYear) ? 3 : 4;
    if (month > 2 || (month === 2 && day >= lc)) return calYear;
    return calYear - 1;
  }

  window.DaoCore = {
    ELEMENTS, EL_HEX, EL_DIR, EL_COLOR_NAME, EL_ORGAN, GAN_EL, ZHI_EL,
    TRIGRAMS, TRIGRAM_LINES, HOUTIAN_ORDER, MOUNTAINS, MOUNTAIN_EL,
    norm, mountainAt, trigramAt, directionReading,
    meihuaCast, meihuaByDate, quoteOfDay, selectOpeningQuote, dailyAlmanac,
    computeBazi, solarAdjustInput, GOALS, adviseGoal,
    mingGua, bazhaiStar, computeBaZhai, BAZHAI_STARS,
    xkGetYun, xkPeriodPlate, xkFlyStars, xkComputeXuanKong, xkStarVigor, xkChartPattern, xkHeShiPattern, xkLianzhuSanBan, xkFuMuSanBan, xkFuyinFanyin, xkMonthFuyinFanyin, xkDoubleStarPattern, xkJiaoJianSha, xkLingZhengPattern, xkChengMenJue, xkCuiWang, xkAnnualPlateOverview, xkMonthPlateOverview, xkTriplateOverview, XK_TRIG_DIR,
    mountain24At, xkComputeXuanKong24, XK_MTN24,
    wuxingResonance, shishenOfDirection, dayElements,
    masterDaily, masterBazi, masterDirection, masterGoal,
    DISCLAIMER, stableHash,
    shaHav, shaUAng, shaENU, shaNearSeg, shaCheckLuChong, shaCheckChuanXin,
    OPP_DIR34, DIRS9_34,
    lyGetZhi, lyTaiSuiDir, lySanSha, lyNianCenter, lyNianPlate,
    lyMonthCenter, lyMonthPlate, lyCurrentMonthIdx, JIEQI_MONTH, JIEQI_EARLY,
    LY_BRANCHES, LY_BRANCH_DEG, LY_STAR_NAMES, LY_STAR_BAD, LY_STAR_GOOD,
    LICHUN_FEB3, lyChineseYear,
  };
})();
