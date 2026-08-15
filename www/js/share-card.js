/* 司南 · 分享卡生成器（canvas 本地渲染 1080×1440·全程不出网）
   —— 两种卡：今日黄历 / 三证时刻。八字命盘不提供分享。
   本文件只做：i18n 键注册 + 极简 QR 编码器（字节模式·V1–4·纠错 M）+ canvas 版式渲染 +
   预览浮层/保存图片的编排。数据由 app.js 备好后以 payload 传入，本文件不做命理演算。
   铁律遵循：确定性（无随机·同输入恒同输出）、禁出网（QR 本地生成·无 CDN·无 fetch）。 */
(function (global) {
  'use strict';

  // ===== 常量：画布尺寸 / 墨金色板（与 css :root、core.js EL_HEX 同基因） =====
  var W = 1080, H = 1440, MARGIN = 72;
  var COL = {
    ink: '#1a1814', inkLight: '#282520', inkDeep: '#14120e',
    paper: '#f2e9d4', paperDim: '#c9c0a8', gold: '#c9a227', goldSoft: '#cbb46a',
    cinnabar: '#c24428', hair: 'rgba(201,162,39,.32)', hairSoft: 'rgba(201,162,39,.18)'
  };
  var EL_HEX = { '木': '#45a66b', '火': '#d94c33', '土': '#d9a821', '金': '#d8c47a', '水': '#5489cc' };
  var FONT = '"Noto Serif CJK SC","Songti SC","Noto Serif SC","STSong",serif';
  var SITE_URL = 'https://dao.leonardchow.work';   // 二维码内容（站点）
  var SITE_CAPTION = 'dao.leonardchow.work';        // QR 下方小字

  // ===== i18n：卡面固定文案（数据 token·干支/宜忌项/卦名 等仍走中文，符合宪法 §2） =====
  var ZH = {
    'share.btn': '生成分享图',
    'share.seal': '分享',
    'share.save': '保存图片',
    'share.saved': '已保存 {name}',
    'share.save_fail': '保存失败：此设备暂不支持图片导出',
    'share.preview_aria': '分享卡预览',
    'share.title_almanac': '今日黄历',
    'share.title_proof': '三证俱吉',
    'share.label_yi': '宜',
    'share.label_ji': '忌',
    'share.label_facing': '向',
    'share.footer_almanac': '据《钦定协纪辨方书》体系',
    'share.footer_proof': '据《八宅明镜》游年 × 今人喜用 × 《钦定协纪辨方书》流年',
    'share.share_almanac_aria': '分享今日黄历卡',
    'share.share_proof_aria': '分享三证时刻卡'
  };
  var EN = {
    'share.btn': 'Share',
    'share.seal': 'Share',
    'share.save': 'Save Image',
    'share.saved': 'Saved {name}',
    'share.save_fail': 'Save failed: image export unsupported on this device',
    'share.preview_aria': 'Share card preview',
    'share.title_almanac': "Today's Almanac",
    'share.title_proof': 'Three Proofs Aligned',
    'share.label_yi': 'Fit',
    'share.label_ji': 'Avoid',
    'share.label_facing': 'Facing',
    'share.footer_almanac': 'per the 《钦定协纪辨方书》 tradition',
    'share.footer_proof': 'per 《八宅明镜》 flying-year × modern favorable-element × 《钦定协纪辨方书》 annual',
    'share.share_almanac_aria': "Share today's almanac card",
    'share.share_proof_aria': 'Share three-proofs card'
  };
  function addKeys(target, values) {
    if (!target) return;
    Object.keys(values).forEach(function (k) { if (target[k] === undefined) target[k] = values[k]; });
  }
  function registerI18n() { addKeys(global.I18N_ZH, ZH); addKeys(global.I18N_EN, EN); }
  registerI18n();
  function T(k, v) { return (global.I18N && global.I18N.t) ? global.I18N.t(k, v) : (ZH[k] || k); }
  function isEN() { return !!(global.I18N && global.I18N.lang === 'en'); }

  /* ========================================================================
   * 极简 QR 编码器（字节模式·版本 1–4·纠错级 M·单/双块）
   *   自实现·无外部依赖·无网络；输出布尔模块矩阵。掩模按四条罚分规则择优。
   *   参考 ISO/IEC 18004；GF(256) 本原多项式 0x11d。仅需覆盖短站点 URL（≤62 字节）。
   * ===================================================================== */
  var QR = (function () {
    // GF(256) 对数/反对数表
    var EXP = new Array(512), LOG = new Array(256);
    (function () {
      var x = 1;
      for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
      for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
    })();
    function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }
    function genPoly(ec) {
      var g = [1];
      for (var i = 0; i < ec; i++) {
        var ng = new Array(g.length + 1);
        for (var k = 0; k < ng.length; k++) ng[k] = 0;
        for (var j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= gmul(g[j], EXP[i]); }
        g = ng;
      }
      return g;
    }
    function rsEncode(data, ec) {
      var gen = genPoly(ec);
      var res = data.slice();
      for (var p = 0; p < ec; p++) res.push(0);
      for (var i = 0; i < data.length; i++) {
        var coef = res[i];
        if (coef !== 0) for (var j = 0; j < gen.length; j++) res[i + j] ^= gmul(gen[j], coef);
      }
      return res.slice(data.length);
    }
    // 纠错级 M 分块结构：{ec: 每块纠错码字, blocks: [每块数据码字…]}
    var SPEC = {
      1: { ec: 10, blocks: [16] },
      2: { ec: 16, blocks: [28] },
      3: { ec: 26, blocks: [44] },
      4: { ec: 18, blocks: [32, 32] }
    };
    var ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26] };

    function utf8(str) {
      var out = [], i, c;
      for (i = 0; i < str.length; i++) {
        c = str.charCodeAt(i);
        if (c < 0x80) out.push(c);
        else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
        else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
      }
      return out;
    }

    function maskCond(m, r, c) {
      switch (m) {
        case 0: return (r + c) % 2 === 0;
        case 1: return r % 2 === 0;
        case 2: return c % 3 === 0;
        case 3: return (r + c) % 3 === 0;
        case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
        case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
        case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
        default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
      }
    }

    function encode(text) {
      var data = utf8(text);
      var ver = 0, spec, size;
      for (var v = 1; v <= 4; v++) {
        var s = SPEC[v], tot = s.blocks.reduce(function (a, b) { return a + b; }, 0);
        var cap = Math.floor((tot * 8 - 12) / 8);   // 头部 4(mode)+8(len) 位
        if (data.length <= cap) { ver = v; spec = s; break; }
      }
      if (!ver) throw new Error('QR: data too long');
      size = 17 + 4 * ver;
      var totalData = spec.blocks.reduce(function (a, b) { return a + b; }, 0);

      // 位缓冲：mode(0100) + len(8) + 数据字节 + 终止符 + 补齐 + 填充字节
      var bits = [];
      function push(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); }
      push(4, 4); push(data.length, 8);
      for (var i = 0; i < data.length; i++) push(data[i], 8);
      var totalBits = totalData * 8;
      var term = Math.min(4, totalBits - bits.length);
      for (i = 0; i < term; i++) bits.push(0);
      while (bits.length % 8 !== 0) bits.push(0);
      var cw = [];
      for (i = 0; i < bits.length; i += 8) { var b = 0; for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; cw.push(b); }
      var pad = [0xec, 0x11], pi = 0;
      while (cw.length < totalData) { cw.push(pad[pi & 1]); pi++; }

      // 分块 + 纠错
      var dBlocks = [], eBlocks = [], off = 0;
      for (var k = 0; k < spec.blocks.length; k++) {
        var db = cw.slice(off, off + spec.blocks[k]); off += spec.blocks[k];
        dBlocks.push(db); eBlocks.push(rsEncode(db, spec.ec));
      }
      // 交织
      var seq = [], maxD = Math.max.apply(null, spec.blocks);
      for (i = 0; i < maxD; i++) for (k = 0; k < dBlocks.length; k++) if (i < dBlocks[k].length) seq.push(dBlocks[k][i]);
      for (i = 0; i < spec.ec; i++) for (k = 0; k < eBlocks.length; k++) seq.push(eBlocks[k][i]);
      var codeBits = [];
      for (i = 0; i < seq.length; i++) for (j = 7; j >= 0; j--) codeBits.push((seq[i] >> j) & 1);

      // 矩阵 + 功能模块标记
      var mat = [], fn = [], r, c;
      for (r = 0; r < size; r++) { mat[r] = new Array(size); fn[r] = new Array(size); for (c = 0; c < size; c++) { mat[r][c] = 0; fn[r][c] = false; } }
      function setF(rr, cc, val) { if (rr < 0 || cc < 0 || rr >= size || cc >= size) return; mat[rr][cc] = val ? 1 : 0; fn[rr][cc] = true; }
      function finder(row, col) {
        for (var dr = -1; dr <= 7; dr++) for (var dc = -1; dc <= 7; dc++) {
          var rr = row + dr, cc = col + dc, val = 0;
          if (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) {
            if (dr === 0 || dr === 6 || dc === 0 || dc === 6) val = 1;
            else if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) val = 1;
          }
          setF(rr, cc, val);
        }
      }
      finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
      for (i = 8; i < size - 8; i++) { var t = (i % 2 === 0) ? 1 : 0; setF(6, i, t); setF(i, 6, t); }
      // 校正图形（V2–4 各一枚，避开三个定位角）
      var pos = ALIGN[ver];
      function inFinderZone(rr, cc) {
        return (rr <= 8 && cc <= 8) || (rr <= 8 && cc >= size - 9) || (rr >= size - 9 && cc <= 8);
      }
      for (var a = 0; a < pos.length; a++) for (var bb = 0; bb < pos.length; bb++) {
        var cr = pos[a], cc2 = pos[bb];
        if (inFinderZone(cr, cc2)) continue;
        for (var er = -2; er <= 2; er++) for (var ec2 = -2; ec2 <= 2; ec2++) {
          var mag = Math.max(Math.abs(er), Math.abs(ec2));
          setF(cr + er, cc2 + ec2, mag !== 1 ? 1 : 0);
        }
      }
      setF(size - 8, 8, 1);   // 固定黑模块

      // 预留格式信息区（占位·后填），标记为功能模块使数据布线跳过
      function drawFormat(mask) {
        var d = mask;                          // 纠错级 M = 0 → (0<<3)|mask
        var rem = d;
        for (var q = 0; q < 10; q++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
        var val = ((d << 10) | rem) ^ 0x5412;  // 15 位（bit14 为 MSB）
        function bit(idx) { return (val >> idx) & 1; }
        // 副本一（定位角左下/右上侧·MSB 优先）
        var q2;
        for (q2 = 0; q2 <= 5; q2++) setF(8, q2, bit(14 - q2));      // (8,0)=b14 … (8,5)=b9
        setF(8, 7, bit(8)); setF(8, 8, bit(7)); setF(7, 8, bit(6));
        for (q2 = 9; q2 <= 14; q2++) setF(14 - q2, 8, bit(14 - q2)); // (5,8)=b5 … (0,8)=b0
        // 副本二：竖 7（rows size-1..size-7 ← b14..b8）+ 横 8（cols size-8..size-1 ← b7..b0）
        for (q2 = 0; q2 <= 6; q2++) setF(size - 1 - q2, 8, bit(14 - q2));
        for (q2 = 0; q2 <= 7; q2++) setF(8, size - 8 + q2, bit(7 - q2));
        setF(size - 8, 8, 1);   // 固定黑模块（覆写于此·恒黑）
      }
      drawFormat(0);   // 占位预留

      // 数据布线（自右下之字形上下往复；跳过功能模块与第 6 列）
      var bi = 0;
      for (var right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (var vert = 0; vert < size; vert++) {
          for (j = 0; j < 2; j++) {
            var col = right - j;
            var upward = ((right + 1) & 2) === 0;
            var rown = upward ? (size - 1 - vert) : vert;
            if (!fn[rown][col]) { mat[rown][col] = (bi < codeBits.length) ? codeBits[bi] : 0; bi++; }
          }
        }
      }

      // 掩模择优（四条罚分规则）
      function applyMask(m) { for (var rr = 0; rr < size; rr++) for (var cc = 0; cc < size; cc++) if (!fn[rr][cc] && maskCond(m, rr, cc)) mat[rr][cc] ^= 1; }
      function penalty() {
        var p = 0, rr, cc, run, i2;
        // 规则1：同色连行/连列 ≥5
        for (rr = 0; rr < size; rr++) { run = 1; for (cc = 1; cc < size; cc++) { if (mat[rr][cc] === mat[rr][cc - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p += 1; } else run = 1; } }
        for (cc = 0; cc < size; cc++) { run = 1; for (rr = 1; rr < size; rr++) { if (mat[rr][cc] === mat[rr - 1][cc]) { run++; if (run === 5) p += 3; else if (run > 5) p += 1; } else run = 1; } }
        // 规则2：2×2 同色块
        for (rr = 0; rr < size - 1; rr++) for (cc = 0; cc < size - 1; cc++) { var v = mat[rr][cc]; if (v === mat[rr][cc + 1] && v === mat[rr + 1][cc] && v === mat[rr + 1][cc + 1]) p += 3; }
        // 规则3：1011101 型（前后接四浅色）
        var patA = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], patB = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
        function match(get, len, pat) { for (i2 = 0; i2 + pat.length <= len; i2++) { var okA = true, okB = true; for (var d2 = 0; d2 < pat.length; d2++) { if (get(i2 + d2) !== patA[d2]) okA = false; if (get(i2 + d2) !== patB[d2]) okB = false; } if (okA || okB) p += 40; } }
        for (rr = 0; rr < size; rr++) { (function (row) { match(function (x) { return mat[row][x]; }, size, patA); })(rr); }
        for (cc = 0; cc < size; cc++) { (function (coln) { match(function (x) { return mat[x][coln]; }, size, patA); })(cc); }
        // 规则4：深色占比偏离 50%
        var dark = 0; for (rr = 0; rr < size; rr++) for (cc = 0; cc < size; cc++) if (mat[rr][cc]) dark++;
        var ratio = dark / (size * size) * 100;
        p += Math.floor(Math.abs(ratio - 50) / 5) * 10;
        return p;
      }
      var best = 0, bestP = Infinity;
      for (var m = 0; m < 8; m++) {
        applyMask(m); drawFormat(m);
        var sc = penalty();
        if (sc < bestP) { bestP = sc; best = m; }
        applyMask(m);   // 撤销（XOR 自逆）
      }
      applyMask(best); drawFormat(best);

      var modules = [];
      for (r = 0; r < size; r++) { modules[r] = []; for (c = 0; c < size; c++) modules[r][c] = mat[r][c] === 1; }
      return { size: size, version: ver, mask: best, modules: modules };
    }
    return { encode: encode };
  })();

  /* ========================================================================
   * canvas 版式基元
   * ===================================================================== */
  function newCanvas() {
    var cv = (global.document && global.document.createElement) ? global.document.createElement('canvas') : null;
    if (!cv) return null;
    cv.width = W; cv.height = H;
    return cv;
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function setFont(ctx, px, weight) { ctx.font = (weight ? weight + ' ' : '') + px + 'px ' + FONT; }
  // 折行绘制，返回结束 y
  function wrapText(ctx, text, x, y, maxW, lineH) {
    var chars = String(text).split(''), line = '', yy = y;
    for (var i = 0; i < chars.length; i++) {
      var test = line + chars[i];
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = chars[i]; yy += lineH; }
      else line = test;
    }
    if (line) { ctx.fillText(line, x, yy); yy += lineH; }
    return yy;
  }

  function drawBackground(ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#23201a'); g.addColorStop(0.55, COL.ink); g.addColorStop(1, COL.inkDeep);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 顶部柔光
    var rg = ctx.createRadialGradient(W / 2, 260, 40, W / 2, 260, 560);
    rg.addColorStop(0, 'rgba(201,162,39,.10)'); rg.addColorStop(1, 'rgba(201,162,39,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, 720);
    // 内描金细框
    ctx.strokeStyle = COL.hair; ctx.lineWidth = 2;
    roundRect(ctx, 28, 28, W - 56, H - 56, 26); ctx.stroke();
    ctx.strokeStyle = COL.hairSoft; ctx.lineWidth = 1;
    roundRect(ctx, 40, 40, W - 80, H - 80, 20); ctx.stroke();
  }

  // 卡头：朱印小方（单字）+ 标题
  function drawHeader(ctx, sealChar, title) {
    var x = MARGIN, y = 92, sq = 66;
    ctx.fillStyle = COL.cinnabar;
    roundRect(ctx, x, y, sq, sq, 8); ctx.fill();
    ctx.fillStyle = COL.paper; setFont(ctx, 40, '700');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(sealChar, x + sq / 2, y + sq / 2 + 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COL.paper; setFont(ctx, 46, '600');
    ctx.fillText(title, x + sq + 22, y + sq / 2 + 16);
    // 分隔细线
    ctx.strokeStyle = COL.hairSoft; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(MARGIN, y + sq + 34); ctx.lineTo(W - MARGIN, y + sq + 34); ctx.stroke();
    return y + sq + 34;   // 正文起始 y
  }

  // 「司南」金印（双线方框·竖排二字）
  function drawBrandSeal(ctx, x, y, sz) {
    ctx.strokeStyle = COL.gold; ctx.lineWidth = 3;
    roundRect(ctx, x, y, sz, sz, 12); ctx.stroke();
    ctx.strokeStyle = COL.goldSoft; ctx.lineWidth = 1.4;
    roundRect(ctx, x + 8, y + 8, sz - 16, sz - 16, 8); ctx.stroke();
    ctx.fillStyle = COL.gold; setFont(ctx, sz * 0.42, '700');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('司', x + sz / 2, y + sz * 0.30);
    ctx.fillText('南', x + sz / 2, y + sz * 0.70);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // QR：白底圆角卡 + 4 模块静区，绘制已编码的 q，返回卡片边长
  function paintQR(ctx, q, x, y, ms) {
    var quiet = 4, full = (q.size + quiet * 2) * ms;
    ctx.fillStyle = '#f5eeda';
    roundRect(ctx, x, y, full, full, 14); ctx.fill();
    ctx.fillStyle = '#141210';
    for (var r = 0; r < q.size; r++) for (var c = 0; c < q.size; c++) {
      if (q.modules[r][c]) ctx.fillRect(x + (c + quiet) * ms, y + (r + quiet) * ms, ms, ms);
    }
    return full;
  }

  // 卡底出处 + 「司南」金印 + 二维码（站点 URL·本地编码·不出网）
  function drawFooter(ctx, sourceText) {
    var q = QR.encode(SITE_URL);
    var ms = Math.max(3, Math.floor(214 / q.size));
    var qfull = (q.size + 8) * ms;
    var qx = W - MARGIN - qfull, qy = H - MARGIN - qfull;
    paintQR(ctx, q, qx, qy, ms);
    // QR 下方站点小字
    ctx.fillStyle = COL.paperDim; setFont(ctx, 22, '400');
    ctx.textAlign = 'center';
    ctx.fillText(SITE_CAPTION, qx + qfull / 2, qy + qfull + 30);
    ctx.textAlign = 'left';
    // 金印
    var sz = 132, sx = MARGIN, sy = H - MARGIN - sz;
    drawBrandSeal(ctx, sx, sy, sz);
    // 出处小字（金印右侧·折行）
    ctx.fillStyle = COL.paperDim; setFont(ctx, 24, '400');
    var tx = sx + sz + 26, tw = qx - tx - 24;
    wrapText(ctx, sourceText, tx, sy + 46, tw, 36);
    return qy;   // 正文可用底界
  }

  /* ========================================================================
   * 三种卡渲染
   * ===================================================================== */
  function renderAlmanac(ctx, d) {
    drawBackground(ctx);
    var y = drawHeader(ctx, '历', T('share.title_almanac'));
    drawFooter(ctx, T('share.footer_almanac'));
    var x = MARGIN, cw = W - MARGIN * 2;
    y += 88;
    // 公历大字 + 星期（先按大字号量宽再落星期，避免重叠）
    ctx.textAlign = 'left'; setFont(ctx, 60, '600');
    var solarW = ctx.measureText(d.solarText || '').width;
    ctx.fillStyle = COL.paper; ctx.fillText(d.solarText || '', x, y);
    ctx.fillStyle = COL.paperDim; setFont(ctx, 30, '400');
    ctx.fillText(d.weekText || '', x + solarW + 24, y - 4);
    // 农历
    y += 60; ctx.fillStyle = COL.gold; setFont(ctx, 40, '500');
    ctx.fillText(d.lunarText || '', x, y);
    // 干支三组（居中·金）
    y += 96; ctx.fillStyle = COL.goldSoft; setFont(ctx, 50, '600'); ctx.textAlign = 'center';
    ctx.fillText(d.ganZhiText || '', W / 2, y);
    ctx.textAlign = 'left';
    // 节气「气中」行
    if (d.jieqiLine) { y += 62; ctx.fillStyle = COL.paperDim; setFont(ctx, 28, '400'); ctx.textAlign = 'center'; ctx.fillText(d.jieqiLine, W / 2, y); ctx.textAlign = 'left'; }
    // 人话摘要（纸面块）
    y += 68;
    if (d.plain) {
      var ph = 96;
      ctx.fillStyle = COL.paper; roundRect(ctx, x, y, cw, ph, 12); ctx.fill();
      ctx.fillStyle = '#3a352c'; setFont(ctx, 30, '500'); ctx.textBaseline = 'middle';
      wrapText(ctx, d.plain, x + 28, y + ph / 2, cw - 56, 40);
      ctx.textBaseline = 'alphabetic';
      y += ph;
    }
    // 宜 / 忌
    y += 84;
    y = yijiRow(ctx, x, y, cw, T('share.label_yi'), COL.gold, d.yi);
    y += 46;
    y = yijiRow(ctx, x, y, cw, T('share.label_ji'), COL.cinnabar, d.ji);
  }
  function yijiRow(ctx, x, y, cw, label, color, items) {
    var arr = (items || []).filter(function (s) { return s && s !== '无'; });
    // 标签方印
    var sq = 46;
    ctx.fillStyle = color; roundRect(ctx, x, y - sq + 8, sq, sq, 7); ctx.fill();
    ctx.fillStyle = (color === COL.gold ? COL.ink : COL.paper); setFont(ctx, 30, '700');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + sq / 2, y - sq + 8 + sq / 2 + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    // 项目文字（折行）
    ctx.fillStyle = COL.paper; setFont(ctx, 34, '400');
    var txt = arr.length ? arr.join('  ·  ') : (isEN() ? '—' : '诸事平和');
    var endY = wrapText(ctx, txt, x + sq + 20, y - 4, cw - sq - 20, 46);
    return Math.max(y + 8, endY);
  }

  function renderProof(ctx, d) {
    drawBackground(ctx);
    var y = drawHeader(ctx, '证', T('share.title_proof'));
    drawFooter(ctx, T('share.footer_proof'));
    var x = MARGIN, cw = W - MARGIN * 2;
    // 方位大字
    y += 70;
    ctx.textAlign = 'center';
    ctx.fillStyle = COL.gold; setFont(ctx, 40, '500');
    ctx.fillText(T('share.label_facing'), W / 2 - 150, y);
    ctx.fillStyle = EL_HEX[d.facingEl] || COL.paper; setFont(ctx, 120, '700');
    ctx.fillText(d.facingName || '', W / 2, y + 30);
    // 卦 + 方位 + 度
    y += 96; ctx.fillStyle = COL.paperDim; setFont(ctx, 30, '400');
    var sub = (d.trigramSymbol || '') + ' ' + (d.trigram || '') + ' · ' + (d.trigramDir || '') + ' · ' + (typeof d.deg === 'number' ? (Math.round(d.deg * 10) / 10) + '°' : '');
    ctx.fillText(sub, W / 2, y);
    if (d.zuoXiang) { y += 42; ctx.fillText(d.zuoXiang, W / 2, y); }
    ctx.textAlign = 'left';
    // 三行·各署出处
    y += 70;
    var rows = d.rows || [];
    for (var i = 0; i < rows.length; i++) {
      var rh = 128;
      ctx.fillStyle = COL.paper; roundRect(ctx, x, y, cw, rh, 12); ctx.fill();
      // 序号金点
      ctx.fillStyle = COL.gold; setFont(ctx, 30, '700');
      ctx.fillText(String(i + 1), x + 30, y + 52);
      // 正文（墨）
      ctx.fillStyle = '#2f2b22'; setFont(ctx, 32, '500');
      wrapText(ctx, rows[i].text, x + 66, y + 50, cw - 100, 42);
      // 出处（朱·右下）
      ctx.fillStyle = COL.cinnabar; setFont(ctx, 24, '500'); ctx.textAlign = 'right';
      ctx.fillText(rows[i].src, W - MARGIN - 24, y + rh - 22);
      ctx.textAlign = 'left';
      y += rh + 22;
    }
  }

  var RENDERERS = { almanac: renderAlmanac, proof: renderProof };

  // 渲染到给定 canvas（供测试/预览复用）
  function renderTo(canvas, type, payload) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    (RENDERERS[type] || renderAlmanac)(ctx, payload || {});
    return canvas;
  }

  /* ========================================================================
   * 预览浮层 / 保存
   * ===================================================================== */
  var _pending = null;   // {type, payload, filename}
  function $(id) { return global.document ? global.document.getElementById(id) : null; }

  function openSheet(type, payload, filename) {
    var canvas = $('share-canvas'); if (!canvas) return;
    renderTo(canvas, type, payload);
    _pending = { type: type, payload: payload, filename: filename };
    var titleKey = type === 'proof' ? 'share.title_proof' : 'share.title_almanac';
    var tEl = $('share-title'); if (tEl) tEl.textContent = T(titleKey);
    var st = $('share-status'); if (st) st.textContent = '';
    var bd = $('share-backdrop'), sheet = $('share-sheet');
    if (bd) bd.classList.add('shown');
    if (sheet) { sheet.classList.add('shown'); sheet.setAttribute('aria-hidden', 'false'); }
  }
  function closeSheet() {
    var bd = $('share-backdrop'), sheet = $('share-sheet');
    if (bd) bd.classList.remove('shown');
    if (sheet) { sheet.classList.remove('shown'); sheet.setAttribute('aria-hidden', 'true'); }
  }
  function saveImage() {
    var canvas = $('share-canvas'); if (!canvas || !_pending) return;
    var name = _pending.filename || ('司南分享卡.png');
    var st = $('share-status');
    function fail() { if (st) st.textContent = T('share.save_fail'); }
    if (!canvas.toBlob) { fail(); return; }
    canvas.toBlob(function (blob) {
      if (!blob || !global.URL || !global.URL.createObjectURL) { fail(); return; }
      var url = global.URL.createObjectURL(blob);
      var a = global.document.createElement('a');
      a.href = url; a.download = name;
      global.document.body.appendChild(a); a.click(); a.remove();
      global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 2000);
      if (st) st.textContent = T('share.saved', { name: name });
    }, 'image/png');
  }

  function ymd() {
    var n = new Date(), p = function (v) { return v < 10 ? '0' + v : '' + v; };
    return '' + n.getFullYear() + p(n.getMonth() + 1) + p(n.getDate());
  }

  // ===== 对外入口 =====
  function openAlmanac(payload) { openSheet('almanac', payload, '司南黄历卡-' + ymd() + '.png'); }
  function openProof(payload) { openSheet('proof', payload, '司南三证卡-' + ymd() + '.png'); }

  function wire() {
    var closeBtn = $('share-close'), bd = $('share-backdrop'), saveBtn = $('share-save');
    if (closeBtn && !closeBtn._w) { closeBtn._w = 1; closeBtn.addEventListener('click', closeSheet); }
    if (bd && !bd._w) { bd._w = 1; bd.addEventListener('click', closeSheet); }
    if (saveBtn && !saveBtn._w) { saveBtn._w = 1; saveBtn.addEventListener('click', saveImage); }
  }
  if (global.document) {
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', wire);
    else wire();
  }

  global.ShareCard = {
    registerI18n: registerI18n,
    encodeQR: QR.encode,
    renderTo: renderTo,
    newCanvas: newCanvas,
    openAlmanac: openAlmanac,
    openProof: openProof,
    wire: wire,
    _W: W, _H: H, _SITE: SITE_URL
  };
})(typeof window !== 'undefined' ? window : this);
