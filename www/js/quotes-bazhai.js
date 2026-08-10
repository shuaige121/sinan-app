// 八宅游年八星 → 真古籍引文映射（堪舆页「原句卡」取用）。
// 全部 orig 引文均为 daos/data/annotated 语料 orig 的精确子串，逐条机器校验。
// 生成/校验脚本：scratchpad/fix-reports/gen-quotes-bazhai.js —— 改数据改脚本重跑，勿手改本文件。
//
// 选句规则（amendment-spec 纠偏一：凶星≠坏方位，纸面优先讲用途，不发明祸福断言）：
//   凶星（绝命/五鬼/六煞/祸害）候选 = orig 同时含星名 + 用途关键词（灶/压/镇/厕/仓/床/门/宜）之句；
//     现有语料（daos/data/annotated 全部 22 书）扫描结果：0 句用途句命中（仅有神煞方位表，非布置用途）。
//     故凶星纸面一律留空（forStar 返回 null）——删优于编；卡片只显墨面 +「宜伏」标注 + 九星配属注。
//   吉星（生气/天医/延年/伏位）→ 断言式用途句「床首朝吉星方為宜」（《阳宅三要·论安床》，含用途词「床」）。
// 声部：orig=古声（繁体原句·纸面）；bai=白话；note=注声（站方译注·九星配属，非古人原句）。
(function (global) {
  'use strict';
  var LUCKY_QUOTE = {
    "book": "yangzhai-sanyao",
    "ch": "ch-lunanzhuang",
    "i": 0,
    "title": "《阳宅三要》",
    "chapterLabel": "论安床",
    "orig": "床首朝吉星方為宜",
    "bai": "床头宜朝向吉星所在的方位为好（即床首应指向八宅吉方，避开凶方）。"
  };
  // 九星配属注（站方译注）：凶星纸面留空时，此注 + 「宜伏」为卡片仅有内容。
  var STAR_GLOSS = {
    "生气": "生气，贪狼木星，上吉（主旺丁旺财）",
    "天医": "天医，巨门土星，吉（主健康、去病）",
    "延年": "延年，武曲金星，吉（主寿、姻缘和合）",
    "伏位": "伏位，左辅右弼木星，小吉，即坐宫本方（歌诀不列）",
    "祸害": "祸害，禄存土星，小凶（古法此方宜伏、宜镇，安厕/仓/杂用以避正用）",
    "六煞": "六煞，文曲水星，凶（古法此方宜伏、宜镇，忌作正房正门）",
    "五鬼": "五鬼，廉贞火星，大凶（古法此方宜伏，坐凶向吉·经典处方以灶压之）",
    "绝命": "绝命，破军金星，大凶（古法此方宜伏、宜镇，忌作卧房床首）"
  };
  var LUCKY = {
    "生气": true, "天医": true, "延年": true, "伏位": true,
    "祸害": false, "六煞": false, "五鬼": false, "绝命": false
  };

  // 逐星取原句卡数据：
  //   吉星 → 断言用途句「床首朝吉星方為宜」（《阳宅三要·论安床》）；
  //   凶星 → 返回 null（无用途句可引，纸面留空）；调用方据 STAR_GLOSS/宜伏 呈现墨面。
  //   note 恒为该星的九星配属注（站方译注）。
  function forStar(star, mingGua) {
    var note = STAR_GLOSS[star] || '';
    if (LUCKY[star]) {
      var l = LUCKY_QUOTE;
      return { orig: l.orig, bai: l.bai, note: note, lucky: true,
        title: l.title, chapterLabel: l.chapterLabel, book: l.book, ch: l.ch, i: l.i };
    }
    // 凶星：语料无用途句，纸面留空（不编大游年歌分类句，不发明祸福断言）
    return { orig: null, bai: '', note: note, lucky: false,
      title: '', chapterLabel: '', book: '', ch: '', i: -1 };
  }

  global.QUOTES_BAZHAI = {
    luckyQuote: LUCKY_QUOTE, starGloss: STAR_GLOSS, lucky: LUCKY, forStar: forStar,
  };
})(typeof window !== 'undefined' ? window : this);
