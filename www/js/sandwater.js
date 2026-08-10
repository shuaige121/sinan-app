/* sandwater.js — Phase 9: 砂法/水法前端化 (F13–F18)
 * 出处总纲：晋·郭璞《葬书》四象护穴；明·徐善继/徐善述《地理人子须知》卷一论水；清·赵九峰《阳宅三要》城市宅法
 * 全程确定性硬编码，运行时绝不调 LLM，同一输入恒得同一结果。
 */
'use strict';
window.SandWater = (function () {
  const C = window.DaoCore;

  // ─── Terrarium 高程瓦片（F13）───────────────────────────────────────────────
  // 瓦片格式：Mapzen Terrarium (AWS S3公开托管，2015)，RGB→高程公式：(R×256+G+B/256)−32768
  // CORS：s3.amazonaws.com elevation-tiles-prod 返回 Access-Control-Allow-Origin: *（2026-06-25 实测）
  const _tileCache = {}; // "z/x/y" → Uint8ClampedArray 256×256×4

  function _tileCoords(lat, lng, z) {
    const n = 1 << z;
    const x = Math.floor((lng + 180) / 360 * n);
    const lr = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2 * n);
    const fx = (lng + 180) / 360 * n - x;
    const fy = (1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2 * n - y;
    return { x, y, px: Math.max(0, Math.min(255, Math.floor(fx * 256))), py: Math.max(0, Math.min(255, Math.floor(fy * 256))) };
  }

  function _fetchTileElevation(lat, lng, z) {
    return new Promise((resolve, reject) => {
      const { x, y, px, py } = _tileCoords(lat, lng, z);
      const key = `${z}/${x}/${y}`;
      const readPx = data => { const i = (py * 256 + px) * 4; resolve((data[i] * 256 + data[i + 1] + data[i + 2] / 256) - 32768); };
      if (_tileCache[key]) { readPx(_tileCache[key]); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const cv = document.createElement('canvas'); cv.width = cv.height = 256;
          const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, 256, 256).data;
          _tileCache[key] = data; readPx(data);
        } catch (e) { reject(e); }
      };
      img.onerror = () => reject(new Error('tile'));
      img.src = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
    });
  }

  function _samplePt(lat0, lng0, bearDeg, distM) {
    const r = bearDeg * Math.PI / 180;
    return { lat: lat0 + distM * Math.cos(r) / 111320, lng: lng0 + distM * Math.sin(r) / (111320 * Math.cos(lat0 * Math.PI / 180)) };
  }

  // F13: 地形高程四方采样（z=13，约9.5 m/px；50/100/200 m 三点均值）
  // 数值算例：P=(1.3°N,103.8°E)，北100m：Δlat=0.000898°，tile=z13/x6550/y4067；RGBA→高程
  async function sampleElevation4Dir(lat, lng, z = 13) {
    const dirs = [0, 90, 180, 270];
    const dists = [50, 100, 200];
    const jobs = [{ lat, lng }];
    for (const d of dirs) { for (const dist of dists) { const p = _samplePt(lat, lng, d, dist); jobs.push(p); } }
    const settled = await Promise.allSettled(jobs.map(p => _fetchTileElevation(p.lat, p.lng, z)));
    const out = { self: settled[0].status === 'fulfilled' ? settled[0].value : null };
    let ri = 1;
    for (const d of dirs) {
      const vals = [];
      for (let di = 0; di < dists.length; di++) {
        const s = settled[ri++]; if (s.status === 'fulfilled') vals.push(s.value);
      }
      out[d] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    return out; // {self, 0:h_N, 90:h_E, 180:h_S, 270:h_W}
  }

  // F14: 砂法四象吉凶（《葬书》郭璞·晋，四象护穴原则）
  // 青龙=东·白虎=西·玄武=坐山（后）·朱雀=门向（前）
  // 阈值（3m/5m/20m）为现代应用经验值，非古籍数字
  function judgeSandTerrain(elevs, doorBearing) {
    const snapDir = deg => { const d = [0, 90, 180, 270]; return d.reduce((a, b) => Math.abs(C.norm(b - deg)) < Math.abs(C.norm(a - deg)) ? b : a); };
    const hDragon = elevs[90], hTiger = elevs[270];
    const hXuan = elevs[snapDir(C.norm(doorBearing + 180))];
    const hZhu = elevs[snapDir(doorBearing)];
    const hSelf = elevs.self ?? 0;
    const items = []; let score = 0;
    if (hDragon != null && hTiger != null) {
      const Δ = hDragon - hTiger;
      if (Δ > 3)       { items.push({ label: '青龙', ok: true,  text: `青龙有力（东高西低 ${Δ.toFixed(1)} m）` }); score++; }
      else if (Δ >= -3) { items.push({ label: '龙虎', ok: null,  text: `龙虎均衡（差 ${Math.abs(Δ).toFixed(1)} m）` }); }
      else               { items.push({ label: '白虎', ok: false, text: `白虎压龙（西高 ${(-Δ).toFixed(1)} m）` }); }
    }
    if (hXuan != null) {
      const Δ = hXuan - hSelf;
      if (Δ > 5)       { items.push({ label: '玄武', ok: true,  text: `玄武有靠（后高 ${Δ.toFixed(1)} m）` }); score++; }
      else if (Δ >= 0)  { items.push({ label: '玄武', ok: null,  text: `后有微靠（${Δ.toFixed(1)} m）` }); }
      else               { items.push({ label: '玄武', ok: false, text: `玄武无靠（后低 ${(-Δ).toFixed(1)} m）` }); }
    }
    if (hZhu != null) {
      const Δ = hZhu - hSelf;
      if (Δ > 0 && Δ < 20) { items.push({ label: '朱雀', ok: true,  text: `朱雀翔舞（前案 ${Δ.toFixed(1)} m）` }); score++; }
      else if (Δ >= 20)     { items.push({ label: '朱雀', ok: false, text: `案山逼压（前高 ${Δ.toFixed(1)} m）` }); }
      else                   { items.push({ label: '朱雀', ok: false, text: `前方低洼，明堂泄气` }); }
    }
    return { score, maxScore: 3, items, src: '晋·郭璞《葬书》四象护穴原则；高程阈值为现代工程经验值（待验证）' };
  }

  // F17 辅助：点在多边形内（射线法 ray-casting；经纬度坐标近似）
  // 精度：lat/lng 差值 ~0.0001° ≈ 11m，城市建筑轮廓用途完全满足
  // 出处：Jordan curve theorem ray-casting（经典计算几何算法，无书面古籍出处）
  // 数值算例：矩形 (0.999,102.999)–(1.001,103.001)，测试点 (1.0,103.0) → inside=true ✓
  function _pointInPolygon(lat, lng, nodes) {
    let inside = false;
    const n = nodes.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const yi = nodes[i].lat, xi = nodes[i].lng;
      const yj = nodes[j].lat, xj = nodes[j].lng;
      const cross = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (cross) inside = !inside;
    }
    return inside;
  }

  // F17 辅助：穴位所在建筑楼高（OSM building:levels × 3m 或 height 标签）
  // fallback 10m（≈3层标准住宅，现代城市经验值）
  // 出处：OSM Key:building:levels 标签规范（openstreetmap.org/wiki/Key:building:levels）
  // 数值算例：building:levels=6 → height=18m；height="30" → 30m；无标签 → fallback 10m
  function selfBuildingH(lat, lng, buildings) {
    for (const b of buildings) {
      if (!b.nodes || b.nodes.length < 3) continue;
      if (_pointInPolygon(lat, lng, b.nodes)) return b.height;
    }
    return 10; // fallback：约3层楼高（经验值）
  }

  // F17: 城市楼群作砂（OSM 建筑加权高度；地形平坦城区主用此路）
  // 各 ±45° 扇区内楼群，以距离倒数为权，加权平均楼高
  // 数值算例：东扇区楼群 h=20/d=80, h=15/d=120, h=18/d=60 → h_dragon=18.0m（见 formulas.md F17）
  // v2-P38：玄武有靠判据改用 selfBuildingH（OSM building:levels）替代固定 10m
  function judgeSandUrban(buildings, lat, lng, doorBearing) {
    const selfH = selfBuildingH(lat, lng, buildings); // OSM building:levels → 实际楼高，fallback 10m
    const sectors = {
      dragon: 90,
      tiger:  270,
      xuanwu: C.norm(doorBearing + 180),
      zhuque: doorBearing,
    };
    const h = {};
    for (const [k, center] of Object.entries(sectors)) {
      let ws = 0, wh = 0;
      for (const b of buildings) {
        if (!b.centroid) continue;
        const { x, y } = C.shaENU(b.centroid.lat, b.centroid.lng, lat, lng);
        const d = Math.hypot(x, y); if (d > 300) continue;
        const bear = C.norm(Math.atan2(x, y) * 180 / Math.PI);
        let diff = Math.abs(bear - center) % 360; if (diff > 180) diff = 360 - diff;
        if (diff > 45) continue;
        const w = 1 / Math.max(d, 1); ws += w; wh += b.height * w;
      }
      h[k] = ws > 0 ? wh / ws : 0;
    }
    const items = []; let score = 0;
    const Δlt = h.dragon - h.tiger;
    if (Δlt > 3)       { items.push({ label: '青龙', ok: true,  text: `青龙有力（东楼均高 ${h.dragon.toFixed(0)} m / 西楼 ${h.tiger.toFixed(0)} m）` }); score++; }
    else if (Δlt >= -3) { items.push({ label: '龙虎', ok: null,  text: `龙虎均衡（东 ${h.dragon.toFixed(0)} m / 西 ${h.tiger.toFixed(0)} m）` }); }
    else                 { items.push({ label: '白虎', ok: false, text: `白虎压龙（西楼均高 ${h.tiger.toFixed(0)} m > 东楼 ${h.dragon.toFixed(0)} m）` }); }
    if (h.xuanwu > selfH) { items.push({ label: '玄武', ok: true,  text: `玄武有靠（后方楼均高 ${h.xuanwu.toFixed(0)} m，自身楼约 ${selfH.toFixed(0)} m）` }); score++; }
    else                  { items.push({ label: '玄武', ok: false, text: `玄武无靠（后方楼均高 ${h.xuanwu.toFixed(0)} m，自身楼约 ${selfH.toFixed(0)} m）` }); }
    if (h.zhuque > 0 && h.zhuque < 30) { items.push({ label: '朱雀', ok: true,  text: `朱雀翔舞（前方楼均高 ${h.zhuque.toFixed(0)} m，适中）` }); score++; }
    else if (h.zhuque >= 30)            { items.push({ label: '朱雀', ok: false, text: `案山逼压（前方楼均高 ${h.zhuque.toFixed(0)} m，过高）` }); }
    else                                 { items.push({ label: '朱雀', ok: false, text: `前方空旷（楼均高 ${h.zhuque.toFixed(0)} m），明堂气散` }); }
    return { score, maxScore: 3, items, src: '判据依《葬书》四象原则；城市楼高替代地形为现代阳宅实践' };
  }

  // F15: 水法——来水去水方位与命卦（《地理人子须知》·明；「路代水」《阳宅三要》·清）
  // 来水宫=farther端方位，去水宫=反向；与命卦游年吉凶匹配
  // 数值算例：坎命·来水震(天医✅)·去水坤(绝命❌) → 顺水吉局（见 formulas.md F15）
  function judgeWaterMethod(roadWays, lat, lng, mingGuaName) {
    const results = [];
    for (const way of roadWays) {
      const nodes = way.nodes; if (!nodes || nodes.length < 2) continue;
      const pts = nodes.map(n => ({ ...C.shaENU(n.lat, n.lng, lat, lng) }));
      let minDist = Infinity, minIdx = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const { dist } = C.shaNearSeg(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        if (dist < minDist) { minDist = dist; minIdx = i; }
      }
      if (minDist > 250) continue;
      const A = pts[minIdx], B = pts[minIdx + 1];
      const bearAB = C.norm(Math.atan2(B.x - A.x, B.y - A.y) * 180 / Math.PI);
      const dA = Math.hypot(A.x, A.y), dB = Math.hypot(B.x, B.y);
      const comingBear = dA > dB ? bearAB : C.norm(bearAB + 180);
      const goingBear  = C.norm(comingBear + 180);
      const cGua = C.trigramAt(comingBear), gGua = C.trigramAt(goingBear);
      const cStar = C.bazhaiStar(mingGuaName, cGua);
      const gStar = C.bazhaiStar(mingGuaName, gGua);
      const cAusp = cStar ? cStar[1] : false, gAusp = gStar ? gStar[1] : false;
      let status, text;
      if (cAusp && !gAusp)       { status = 'good';    text = `来${cGua}（${cStar[0]}）吉水，去${gGua}（${gStar[0]}）凶方，财气聚穴 ✅`; }
      else if (!cAusp && gAusp)  { status = 'bad';     text = `来${cGua}（${cStar[0]}）凶水，去${gGua}（${gStar[0]}）吉方，财气外泄 ❌`; }
      else if (cAusp)             { status = 'neutral'; text = `来${cGua}（${cStar[0]}）去${gGua}（${gStar[0]}），来去均吉，偏吉 ～`; }
      else                        { status = 'bad';     text = `来${cGua}（${cStar[0]}）去${gGua}（${gStar[0]}），来去均凶 ❌`; }
      const isPrimary = /^(primary|secondary|tertiary|trunk|motorway)$/.test((way.tags || {}).highway || '');
      results.push({ status, text, dist: Math.round(minDist), isPrimary });
    }
    results.sort((a, b) => (b.isPrimary - a.isPrimary) || a.dist - b.dist);
    return results.slice(0, 3);
  }

  // F16: 玉带水（弧形道路凹侧朝穴；与 F10 反弓煞互斥）
  // 算法：三节点外接圆，P 在圆内（凹侧）→ 玉带；P 在圆外（凸侧）→ 反弓（xingsha.js 处理）
  // 数值算例：小弧 A=(−67,0)B=(0,33)C=(67,0)，r=84.5m，P内侧 dPO=7.5m<r，dWrap=77m，sub=105° → 玉带正抱
  function detectJadeBelt(roadWays, lat, lng, doorBearing) {
    let best = null;
    for (const way of roadWays) {
      const nodes = way.nodes; if (!nodes || nodes.length < 3) continue;
      const pts = nodes.map(n => C.shaENU(n.lat, n.lng, lat, lng));
      for (let i = 0; i < pts.length - 2; i++) {
        const { x: ax, y: ay } = pts[i], { x: bx, y: by } = pts[i + 1], { x: cx, y: cy } = pts[i + 2];
        const D2 = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
        if (Math.abs(D2) < 1e-6) continue;
        const s2 = ax*ax + ay*ay, t2 = bx*bx + by*by, u2 = cx*cx + cy*cy;
        const Ox = (s2*(by-cy) + t2*(cy-ay) + u2*(ay-by)) / D2;
        const Oy = (s2*(cx-bx) + t2*(ax-cx) + u2*(bx-ax)) / D2;
        const r  = Math.hypot(ax - Ox, ay - Oy);
        const dPO = Math.hypot(Ox, Oy);
        if (dPO >= r) continue; // P 在弧外侧 = 反弓煞，非玉带
        const dWrap = r - dPO; if (dWrap > 100) continue;
        const halfChord = Math.hypot(cx - ax, cy - ay) / 2;
        const sub = 2 * Math.asin(Math.min(halfChord / r, 1)) * 180 / Math.PI;
        if (sub < 45) continue;
        const θOP = C.norm(Math.atan2(-Ox, -Oy) * 180 / Math.PI);
        const faceAlign = C.shaUAng(C.norm(θOP + 180), C.norm(doorBearing + 180));
        const level = faceAlign <= 22.5 ? 'best' : faceAlign <= 67.5 ? 'good' : 'weak';
        if (!best || dWrap < best.dWrap) {
          best = { found: true, dWrap: Math.round(dWrap), sub: Math.round(sub), faceAlign: Math.round(faceAlign), level,
            text: level === 'best'
              ? `✅ 玉带正抱：弧形道路凹侧环抱穴位，正对门前（偏差 ${Math.round(faceAlign)}°），弧距 ${Math.round(dWrap)} m，弧张角 ${Math.round(sub)}°——财帛大旺之格`
              : `✅ 玉带侧抱：弧形道路内弯朝穴（偏差 ${Math.round(faceAlign)}°），弧距 ${Math.round(dWrap)} m，张角 ${Math.round(sub)}°`,
            src: '明·徐善继/徐善述《地理人子须知》卷一「论水」（约万历年间1573–1620）；与 F10 反弓煞同算法互斥' };
        }
      }
    }
    return best || { found: false };
  }

  // F18: 水口关锁（去水出口两侧有建筑/地物拱卫，水气不散）
  // 简化模型：去水道路（exitBear ±30°，120m内）两侧 80m 内均有楼群
  // 出处：《地理人子须知》卷一「论水口」：「水口关锁紧密，气聚财旺」（待核实原句）
  function detectWaterMouthLock(roadWays, buildings, lat, lng, doorBearing) {
    const exitBear = C.norm(doorBearing + 180);
    for (const way of roadWays) {
      const nodes = way.nodes; if (!nodes || nodes.length < 2) continue;
      const pts = nodes.map(n => C.shaENU(n.lat, n.lng, lat, lng));
      for (let i = 0; i < pts.length - 1; i++) {
        const { nx, ny, dist } = C.shaNearSeg(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        if (dist > 120) continue;
        const segBear = C.norm(Math.atan2(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y) * 180 / Math.PI);
        if (C.shaUAng(segBear, exitBear) > 30) continue;
        const perpL = C.norm(segBear + 90), perpR = C.norm(segBear - 90);
        let hasL = false, hasR = false;
        for (const b of buildings) {
          if (!b.centroid) continue;
          const { x: bx, y: by } = C.shaENU(b.centroid.lat, b.centroid.lng, lat, lng);
          if (Math.hypot(bx - nx, by - ny) > 80) continue;
          const bBear = C.norm(Math.atan2(bx - nx, by - ny) * 180 / Math.PI);
          if (C.shaUAng(bBear, perpL) < 50) hasL = true;
          if (C.shaUAng(bBear, perpR) < 50) hasR = true;
        }
        if (hasL && hasR) {
          return { found: true,
            text: `✅ 水口关锁：去水出口（门后约 ${Math.round(dist)} m）两侧楼群拱卫，水气内聚——财旺之象`,
            src: '明·徐善继/徐善述《地理人子须知》卷一「论水口」（约万历年间1573–1620）；判据为几何经验模型' };
        }
      }
    }
    return { found: false };
  }

  // ─── OSM Overpass：建筑 + 道路合并查询 ────────────────────────────────────
  const _EPS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

  function fetchBuildingsAndRoads(lat, lng, radiusM, onDone, onFail) {
    const q = `[out:json][timeout:15];(way["highway"](around:${radiusM},${lat.toFixed(6)},${lng.toFixed(6)});way["building"](around:${radiusM},${lat.toFixed(6)},${lng.toFixed(6)}););out body;>;out skel qt;`;
    let tried = 0;
    function attempt() {
      if (tried >= _EPS.length) { onFail('OSM 数据源均无响应，请检查网络'); return; }
      const ep = _EPS[tried++];
      fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout ? AbortSignal.timeout(16000) : undefined })
        .then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(json => {
          const nodeMap = {};
          (json.elements || []).forEach(el => { if (el.type === 'node') nodeMap[el.id] = { lat: el.lat, lng: el.lon }; });
          const roads = [], bldgs = [];
          for (const w of (json.elements || [])) {
            if (w.type !== 'way' || !w.nodes || w.nodes.length < 2) continue;
            const nodes = w.nodes.map(id => nodeMap[id]).filter(Boolean);
            if (nodes.length < 2) continue;
            const tags = w.tags || {};
            if (tags.highway) {
              roads.push({ id: w.id, tags, nodes });
            } else if (tags.building) {
              const n = nodes.length;
              const centroid = { lat: nodes.reduce((s, p) => s + p.lat, 0) / n, lng: nodes.reduce((s, p) => s + p.lng, 0) / n };
              const height = tags.height ? (parseFloat(tags.height) || 9) : ((parseInt(tags['building:levels']) || 3) * 3);
              bldgs.push({ id: w.id, tags, nodes, centroid, height });
            }
          }
          onDone({ roads, bldgs });
        }).catch(attempt);
    }
    attempt();
  }

  return { sampleElevation4Dir, judgeSandTerrain, judgeSandUrban, judgeWaterMethod, detectJadeBelt, detectWaterMouthLock, fetchBuildingsAndRoads, selfBuildingH };
})();
