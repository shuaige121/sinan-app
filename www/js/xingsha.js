/* 形煞几何判据引擎  Phase 8 (auto/yangzhai-luopan)
   F7 路冲煞 · F8 天斩煞 · F9 尖角/壁刀煞 · F10 反弓煞 · F11 穿心煞
   数据源：OSM Overpass（浏览器端直调，CORS Access-Control-Allow-Origin:* 已实测 2026-06-25）
   算法：纯几何确定性，参见 docs/auto/yangzhai-luopan/formulas.md § F7–F12
   坐标系：以穴位 P 为原点，x+ = 东，y+ = 北，单位 = 米（WGS-84 平面近似，< 200m 误差 < 0.03%）
*/
(function () {
  'use strict';

  const R_EARTH = 6371000; // 地球平均半径（米）

  // ——— 几何基础 ———

  // 角度差 → [0, 180]
  function angDiff(a, b) {
    return Math.abs(((a - b + 540) % 360) - 180);
  }

  // WGS-84 → 局部米坐标（以 oLat/oLng 为原点）
  function ll2xy(lat, lng, oLat, oLng) {
    const cosLat = Math.cos(oLat * Math.PI / 180);
    return {
      x: (lng - oLng) * (Math.PI / 180) * R_EARTH * cosLat, // 东正
      y: (lat - oLat) * (Math.PI / 180) * R_EARTH,          // 北正
    };
  }

  // 局部 XY 米坐标 → WGS-84（逆变换，用于将形煞源位置还原为经纬度叠 Leaflet 图层）
  // 数值算例：oLat=1.3°, x=50m(东), y=0 → Δlng=50/(6371000×cos(1.3°)×π/180)=0.000450°
  function xy2ll(x, y, oLat, oLng) {
    const cosLat = Math.cos(oLat * Math.PI / 180);
    return {
      lat: oLat + y / R_EARTH * (180 / Math.PI),
      lng: oLng + x / (R_EARTH * cosLat) * (180 / Math.PI),
    };
  }

  // 局部 XY 方位角（正北=0°，顺时针）
  function localBearing(ax, ay, bx, by) {
    return (Math.atan2(bx - ax, by - ay) * 180 / Math.PI + 360) % 360;
  }

  // 点 P 到线段 A-B 的最近点（局部 XY）
  function closestSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-10) return { x: ax, y: ay, t: 0, dist: Math.hypot(px - ax, py - ay) };
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    const cx = ax + t * dx, cy = ay + t * dy;
    return { x: cx, y: cy, t, dist: Math.hypot(px - cx, py - cy) };
  }

  // 点 P 到折线（多段）最近点（含线段索引 si）
  function closestWay(px, py, coords) {
    let best = null;
    for (let i = 0; i < coords.length - 1; i++) {
      const A = coords[i], B = coords[i + 1];
      const r = closestSeg(px, py, A.x, A.y, B.x, B.y);
      if (!best || r.dist < best.dist) best = { ...r, si: i };
    }
    return best;
  }

  // 从折线 si 段出发，沿「背离 P」方向累计直线段长度（连续折角 < 5° 才计入）
  // θPQ = bearing(P → closest road point)；away = θPQ + 180°
  function straightLen(coords, si, θPQ) {
    const awayBearing = (θPQ + 180) % 360;
    const A = coords[si], B = coords[si + 1];
    const fwd = localBearing(A.x, A.y, B.x, B.y);
    const goForward = angDiff(awayBearing, fwd) < 90;

    // measure(start, step=±1, dirFn): accumulate while consecutive segments < 5° deviation
    function measure(start, step, dirFn) {
      let len = 0, prevDir = null;
      for (let j = start; (step > 0 ? j < coords.length - 1 : j >= 0); j += step) {
        const P1 = coords[j], P2 = coords[j + 1];
        const d = dirFn(P1, P2);
        if (prevDir !== null && angDiff(d, prevDir) > 5) break;
        len += Math.hypot(P2.x - P1.x, P2.y - P1.y);
        prevDir = d;
      }
      return len;
    }

    if (goForward) {
      return measure(si, 1, (P1, P2) => localBearing(P1.x, P1.y, P2.x, P2.y));
    } else {
      return measure(si, -1, (P1, P2) => localBearing(P2.x, P2.y, P1.x, P1.y));
    }
  }

  // ——— OSM 解析 ———
  function parseOSM(json, oLat, oLng) {
    const nodeMap = new Map();
    for (const e of (json.elements || [])) {
      if (e.type === 'node') nodeMap.set(e.id, ll2xy(e.lat, e.lon, oLat, oLng));
    }
    const highways = [], buildings = [];
    for (const e of (json.elements || [])) {
      if (e.type !== 'way' || !e.tags) continue;
      const coords = (e.nodes || []).map(n => nodeMap.get(n)).filter(Boolean);
      if (e.tags.highway && coords.length >= 2) highways.push({ tags: e.tags, coords });
      if (e.tags.building && coords.length >= 3) buildings.push({ tags: e.tags, coords });
    }
    return { highways, buildings };
  }

  function bldgH(tags) {
    // 楼高：优先 height tag，其次 building:levels × 3m，默认 9m（3层）
    if (tags.height) return Math.max(3, parseFloat(tags.height) || 9);
    if (tags['building:levels']) return Math.max(3, (parseInt(tags['building:levels'], 10) || 3) * 3);
    return 9;
  }

  function rdW(tags) {
    // 路宽：优先 width tag，其次 lanes × 3.5m，再按路类型默认
    if (tags.width) return Math.max(3, parseFloat(tags.width) || 6);
    if (tags.lanes) return Math.max(3, parseInt(tags.lanes, 10) * 3.5);
    const d = { motorway: 14, trunk: 11, primary: 9, secondary: 7, tertiary: 6 };
    return d[tags.highway] || 5;
  }

  // ——— F7: 路冲煞 ———
  // 古籍：明·王君荣《阳宅十书》卷一「论路」（待核实）
  // 判据：路最近点在门朝向方向（α≤22.5°），且路向外延伸一段直路（≥30/50m）
  function f7LuChong(P, doorBearing, highways) {
    let best = null;
    for (const hw of highways) {
      const r = closestWay(P.x, P.y, hw.coords);
      if (!r || r.dist > 120) continue;
      const θPQ = localBearing(P.x, P.y, r.x, r.y);
      const α = angDiff(θPQ, doorBearing);
      if (α > 22.5) continue;
      const sl = straightLen(hw.coords, r.si, θPQ);
      const isStrong = α <= 15 && sl >= 50 && r.dist <= 80;
      const isWeak   = α <= 22.5 && sl >= 30 && r.dist <= 120;
      if (!isWeak) continue;
      const sev = isStrong ? '强' : '弱';
      if (!best || r.dist < best.dist) {
        best = {
          type: '路冲煞', severity: sev, dist: Math.round(r.dist), modern: false,
          lx: r.x, ly: r.y, // 形煞源局部坐标（最近路点）→ detectAllXingsha 转 geo
          desc: `${sev}路冲：门正前方 ${Math.round(r.dist)}m 处有直路对冲（冲角 ${Math.round(α)}°，直路段约 ${Math.round(sl)}m，路宽约 ${Math.round(rdW(hw.tags))}m）`,
          source: '路冲判据：门向、距离、直路线段等几何条件；参数阈值（15°/50m）为业界经验值，非古籍数字',
        };
      }
    }
    return best;
  }

  // ——— F8: 天斩煞 ———
  // 现代形煞（20世纪香港/台湾），无明清典籍直接依据 ⚠️
  // 判据：两楼夹缝 gap_width/gap_height ≤ 0.3，且缝隙在门朝向方向（≤22.5°），距门 ≤100m
  function f8TianZhan(P, doorBearing, buildings) {
    let best = null;
    for (let i = 0; i < buildings.length; i++) {
      const B1 = buildings[i];
      for (let j = i + 1; j < buildings.length; j++) {
        const B2 = buildings[j];
        // 粗筛：两楼质心距 > 200m 必不形成夹缝
        const c1x = B1.coords.reduce((s, v) => s + v.x, 0) / B1.coords.length;
        const c1y = B1.coords.reduce((s, v) => s + v.y, 0) / B1.coords.length;
        const c2x = B2.coords.reduce((s, v) => s + v.x, 0) / B2.coords.length;
        const c2y = B2.coords.reduce((s, v) => s + v.y, 0) / B2.coords.length;
        if (Math.hypot(c1x - c2x, c1y - c2y) > 200) continue;

        // 精算：B1 顶点+边中点 到 B2 各边的最小距离
        let minGap = Infinity, midX = 0, midY = 0;
        const pts = [];
        for (let k = 0; k < B1.coords.length; k++) {
          pts.push(B1.coords[k]);
          if (k < B1.coords.length - 1) {
            pts.push({
              x: (B1.coords[k].x + B1.coords[k + 1].x) / 2,
              y: (B1.coords[k].y + B1.coords[k + 1].y) / 2,
            });
          }
        }
        for (const pt of pts) {
          const r = closestWay(pt.x, pt.y, B2.coords);
          if (r && r.dist < minGap) {
            minGap = r.dist;
            midX = (pt.x + r.x) / 2;
            midY = (pt.y + r.y) / 2;
          }
        }
        if (minGap > 30) continue;

        const h1 = bldgH(B1.tags), h2 = bldgH(B2.tags);
        const blade = minGap / Math.min(h1, h2);
        if (blade > 0.3) continue;

        const dGapToP = Math.hypot(midX - P.x, midY - P.y);
        if (dGapToP > 100) continue;

        // gap 中点在门朝向方向
        const θ = localBearing(P.x, P.y, midX, midY);
        if (angDiff(θ, doorBearing) > 22.5) continue;

        if (!best || dGapToP < best.dist) {
          best = {
            type: '天斩煞', severity: '凶', dist: Math.round(dGapToP), modern: true,
            lx: midX, ly: midY, // 夹缝中点局部坐标
            desc: `天斩煞：门前方 ${Math.round(dGapToP)}m 处两楼夹缝仅 ${Math.round(minGap)}m，楼高 ${Math.round(Math.min(h1, h2))}m，刀刃比 ${blade.toFixed(2)}（≤0.3 视为煞）`,
            source: '⚠️ 现代形煞概念（20世纪香港/台湾），无明清典籍直接依据',
          };
        }
      }
    }
    return best;
  }

  // ——— F9: 尖角/壁刀煞 ———
  // 古籍原理：明·王君荣《阳宅十书》卷一「论屋」（待核实）；「壁刀煞」为现代命名
  // 判据：建筑多边形内角 ≤ 60°，该角在门朝向方向（≤22.5°），距门 ≤100m
  function f9JiaoSha(P, doorBearing, buildings) {
    let best = null;
    for (const bld of buildings) {
      const cs = bld.coords;
      const n = cs.length - 1; // 闭合多边形：最后节点 = 第一节点，故有 n 个独立顶点
      for (let i = 0; i < n; i++) {
        const prev = cs[(i - 1 + n) % n], curr = cs[i], next = cs[(i + 1) % n];
        const v1x = prev.x - curr.x, v1y = prev.y - curr.y;
        const v2x = next.x - curr.x, v2y = next.y - curr.y;
        const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
        if (l1 < 2 || l2 < 2) continue; // 过短边忽略

        const cosAng = (v1x * v2x + v1y * v2y) / (l1 * l2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAng))) * 180 / Math.PI;
        if (angle > 60) continue; // 内角需 ≤ 60° 才算尖角

        const dist = Math.hypot(curr.x - P.x, curr.y - P.y);
        if (dist > 100) continue;

        // 该角在门朝向方向：bearing(P→角) ≈ doorBearing
        const θ_P_to_C = localBearing(P.x, P.y, curr.x, curr.y);
        if (angDiff(θ_P_to_C, doorBearing) > 22.5) continue;

        if (!best || dist < best.dist) {
          best = {
            type: '尖角煞/壁刀煞', severity: '凶', dist: Math.round(dist), modern: true,
            lx: curr.x, ly: curr.y, // 建筑尖角局部坐标
            // modern: true — 尖角原理见《阳宅十书》但「壁刀煞」名称为20世纪现代命名
            desc: `尖角煞：门前方 ${Math.round(dist)}m 处建筑尖角（内角 ${Math.round(angle)}°）正对门口，角平分线冲射`,
            source: '尖角判据：建筑尖角正对门口；⚠️「壁刀煞」为20世纪现代命名，无明清典籍直接依据',
          };
        }
      }
    }
    return best;
  }

  // ——— F10: 反弓煞 (含镰刀煞) ———
  // 古籍：《地理人子须知》卷一「论水」（待核实）；城市以路代水
  // 判据：穴位在弧形路凸侧（外弦），弧张角 ≥ 45°，最近弧点距 ≤ 120m
  function f10FanGong(P, doorBearing, highways) {
    let best = null;
    for (const hw of highways) {
      const cs = hw.coords;
      for (let i = 0; i < cs.length - 2; i++) {
        const A = cs[i], B = cs[i + 1], C = cs[i + 2];
        // 外接圆（三点不共线才有意义）
        const D = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
        if (Math.abs(D) < 1e-6) continue; // 共线

        const ux = ((A.x*A.x + A.y*A.y) * (B.y - C.y) +
                    (B.x*B.x + B.y*B.y) * (C.y - A.y) +
                    (C.x*C.x + C.y*C.y) * (A.y - B.y)) / D;
        const uy = ((A.x*A.x + A.y*A.y) * (C.x - B.x) +
                    (B.x*B.x + B.y*B.y) * (A.x - C.x) +
                    (C.x*C.x + C.y*C.y) * (B.x - A.x)) / D;
        const r = Math.hypot(ux - A.x, uy - A.y);

        // 弧张角（A 到 C 在圆心所张开的角度）
        const θA = Math.atan2(A.y - uy, A.x - ux);
        const θC = Math.atan2(C.y - uy, C.x - ux);
        let arc = Math.abs(θA - θC) * 180 / Math.PI;
        if (arc > 180) arc = 360 - arc;
        if (arc < 45) continue;

        const dPC = Math.hypot(P.x - ux, P.y - uy);
        if (dPC <= r) continue; // P 在圆内 = 凹侧（玉带水 F16），非反弓
        const dArc = dPC - r; // P 到弧面最近距离
        if (dArc > 120) continue;

        // 圆心在门朝向方向（宽松 60°，弧形路体量大）
        const θCenter = localBearing(P.x, P.y, ux, uy);
        if (angDiff(θCenter, doorBearing) > 60) continue;

        const shaName = arc >= 90 ? '镰刀煞（反弓）' : '反弓煞';
        if (!best || dArc < best.dist) {
          // 最近弧点 = 圆心到 P 方向与圆的交点（凸侧最近点）
          const arcNearX = ux + r * (P.x - ux) / dPC;
          const arcNearY = uy + r * (P.y - uy) / dPC;
          best = {
            type: shaName, severity: '凶', dist: Math.round(dArc), modern: arc >= 90,
            lx: arcNearX, ly: arcNearY, // 最近弧点局部坐标
            desc: `${shaName}：门前弧形道路反弓，弧张角 ${Math.round(arc)}°，最近弧点距门 ${Math.round(dArc)}m（穴在凸侧受煞）`,
            source: '反弓判据：城市阳宅以路代水，凸侧受煞；⚠️「镰刀煞」为现代命名',
          };
        }
      }
    }
    return best;
  }

  // ——— F11: 穿心煞 ———
  // 古籍：明·王君荣《阳宅十书》卷一「论路」（待核实）
  // 判据：路横切门前（路向与门向夹角近 90°），距门 ≤ 15m
  function f11ChuanXin(P, doorBearing, highways) {
    let best = null;
    for (const hw of highways) {
      const r = closestWay(P.x, P.y, hw.coords);
      if (!r || r.dist > 15) continue;
      const A = hw.coords[r.si], B = hw.coords[r.si + 1];
      const segDir = localBearing(A.x, A.y, B.x, B.y);
      const crossAngle = angDiff(segDir, doorBearing);
      if (Math.abs(crossAngle - 90) > 30) continue; // 需接近 90° 横切
      if (!best || r.dist < best.dist) {
        best = {
          type: '穿心煞', severity: '凶', dist: Math.round(r.dist), modern: false,
          lx: r.x, ly: r.y, // 最近路点局部坐标
          desc: `穿心煞：道路横切门前 ${Math.round(r.dist)}m，与门向夹角 ${Math.round(crossAngle)}°（约 90° 即横穿宅门前）`,
          source: '穿心判据：道路横切门前，与门向近直角',
        };
      }
    }
    return best;
  }

  // ——— Overpass API ———
  const OV_URLS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  async function fetchOverpass(lat, lng, radiusM) {
    // 查询半径内道路（highway）和建筑（building），含完整节点坐标
    const q = [
      '[out:json][timeout:15];',
      '(',
      `way[highway~"^(primary|secondary|tertiary|residential|unclassified|trunk|motorway|living_street|service|pedestrian)$"](around:${radiusM},${lat},${lng});`,
      `way[building](around:${radiusM},${lat},${lng});`,
      ');',
      '(._;>;);',
      'out body;',
    ].join('');

    let lastErr;
    for (const url of OV_URLS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(q),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Overpass 服务不可用，请稍后重试');
  }

  // ——— 主 API ———
  // detectAllXingsha(lat, lng, doorBearing) → Promise<Array<{type, severity, dist, desc, source, modern}>>
  // lat/lng：穴位 GPS 坐标（一般取地图中心 = 用户定位后的位置）
  // doorBearing：宅门朝向（°），正北=0°，顺时针
  async function detectAllXingsha(lat, lng, doorBearing) {
    const json = await fetchOverpass(lat, lng, 200);
    const osm = parseOSM(json, lat, lng);
    const P = { x: 0, y: 0 }; // 穴位 = 局部坐标原点

    // v2-P6: OSM 稀疏 noData 标志（区别于「有数据但无形煞」）
    // 两种数据均为空 → 该区域 OSM 无覆盖，空结果 ≠ 无形煞（GEO-ACCURACY.md §OSM 中国降级）
    const noData = osm.highways.length === 0 && osm.buildings.length === 0;

    const results = [
      f7LuChong(P, doorBearing, osm.highways),
      f8TianZhan(P, doorBearing, osm.buildings),
      f9JiaoSha(P, doorBearing, osm.buildings),
      f10FanGong(P, doorBearing, osm.highways),
      f11ChuanXin(P, doorBearing, osm.highways),
    ].filter(Boolean);

    // 将各形煞源的局部坐标还原为 WGS-84，供 Leaflet 叠图
    results.forEach(r => {
      if (r.lx !== undefined && r.ly !== undefined) {
        r.geo = xy2ll(r.lx, r.ly, lat, lng);
      }
    });
    results.noData = noData;  // 挂在 Array 上（数组也是对象）
    return results;
  }

  window.XingSha = { detectAllXingsha };
})();
