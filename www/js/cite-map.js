// 出处 → 引用目标 静态映射表（全站 cite-chip 的 data-cite 键即本表键）。
//
// 铁律：只登记「确定」的映射；映射不确定的绝不进表（宁缺毋滥·删优于编）。
//   句级目标 {book, ch, i}：均已对 daos/data/annotated/<book>.json 逐条核实（book/ch/i 三者齐验）；
//   书级目标 {book}      ：均对 daos/data/registry.json books[].id 核实。
//   对不上真实数据的引用一律不进表 —— 调用方 (citeChip) 找不到键即退回纯文本，绝不生成 dead link。
//
// 校验记录（2026-07-04）：
//   bazhai-dayouniange  → bazhai-mingjing / ch-dayouniange / i=0
//        annotated 该章仅一句 i=0，即「乾六天五禍絕延生…」大游年歌八句歌诀本体。
//   yangzhai-anchuang   → yangzhai-sanyao / ch-lunanzhuang / i=0
//        annotated 该章仅一句 i=0，orig=「床首朝吉星方為宜。」（与 quotes-bazhai.js LUCKY_QUOTE 同源）。
//   xinji-bianfang / shenshi-xuankong / bazhai-mingjing / zangshu 均为 registry.json 真实 book id。
(function (global) {
  'use strict';
  var CITE_MAP = {
    // ===== 句级（确定到句：orig 已核实）=====
    // 《八宅明镜》大游年歌 / 游年八星法
    'bazhai-dayouniange': { book: 'bazhai-mingjing', ch: 'ch-dayouniange', i: 0 },
    // 《阳宅三要》论安床「床首朝吉星方為宜」
    'yangzhai-anchuang': { book: 'yangzhai-sanyao', ch: 'ch-lunanzhuang', i: 0 },
    // 《阳宅三要》三要总论「門乃宅之口，主乃宅之主，竈乃宅之腹」
    //   annotated 该章仅一句 i=0，orig 与引文逐字一致（已核实）。
    'yangzhai-sanyao-zong': { book: 'yangzhai-sanyao', ch: 'ch-sanyao-zong', i: 0 },

    // ===== 书级（映射不确定到句，只跳到书，绝不猜句）=====
    // 《钦定协纪辨方书》
    'xinji-bianfang': { book: 'xinji-bianfang' },
    // 《沈氏玄空学》
    'shenshi-xuankong': { book: 'shenshi-xuankong' },
    // 《八宅明镜》泛引
    'bazhai-mingjing': { book: 'bazhai-mingjing' },
    // 《葬书》
    'zangshu': { book: 'zangshu' }
  };

  // 取目标：命中返回 {book[, ch, i]} 的副本，未命中返回 null（调用方据此退回纯文本）。
  function resolveCite(key) {
    var t = key && CITE_MAP[key];
    if (!t) return null;
    var out = { book: t.book };
    if (t.ch != null) out.ch = t.ch;
    if (t.i != null) out.i = t.i;
    return out;
  }

  global.CITE_MAP = CITE_MAP;
  global.resolveCite = resolveCite;
})(typeof window !== 'undefined' ? window : this);
