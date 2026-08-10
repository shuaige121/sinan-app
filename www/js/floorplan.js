/* 户型图叠地图 (v2 Phase 1) — web/js/floorplan.js
 *
 * 机制: 自实现 3-corner CSS-matrix overlay
 *       与 leaflet-imageoverlay-rotated (Iván Sánchez Ortega, ISC) 同算法
 * 坐标: WGS-84 全程; cos(lat) 修正必须 (GEO-ACCURACY.md §③)
 * 朝向: 从叠加层对齐角读出 (真北/WGS-84), rotDeg=0 时图 "top" 朝正北
 *       不依赖磁北/DeviceOrientation，比实时罗盘更稳定 (STOREYSG-FLOORPLAN-INTEGRATION.md)
 * 确定性: 同输入恒同输出，不调 LLM，不含 Math.random()
 * SceneDoc 格式: storeysg RoomForge rooms[]{name, bounds{x,z,w,d}} 单位 mm
 */
(function () {
  'use strict';
  if (typeof L === 'undefined') return; // Leaflet 必须先于本脚本加载

  var DEG = Math.PI / 180;
  // 每纬度度约 111320 m (WGS-84 赤道球近似，城市尺度误差 < 0.1%)
  var LAT_M = 111320;
  // 覆盖层图像固定自然尺寸 (px) — CSS matrix 以此计算仿射变换
  var NAT_W = 400, NAT_H = 320;

  // ─── 示例户型 SVG (纯静态，无随机，不调外部) ────────────────────────────
  function demoSVG() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" width="400" height="320">'
      + '<rect width="400" height="320" fill="rgba(245,238,215,.88)" rx="2"/>'
      + '<rect x="18" y="18" width="364" height="244" fill="none" stroke="#c8a040" stroke-width="3"/>'
      + '<line x1="200" y1="18" x2="200" y2="262" stroke="#c8a040" stroke-width="1.5"/>'
      + '<line x1="18" y1="140" x2="382" y2="140" stroke="#c8a040" stroke-width="1.5"/>'
      + '<text x="100" y="91" text-anchor="middle" font-size="18" fill="#7a5c14" font-family="sans-serif">主卧</text>'
      + '<text x="300" y="91" text-anchor="middle" font-size="18" fill="#7a5c14" font-family="sans-serif">客厅</text>'
      + '<text x="100" y="204" text-anchor="middle" font-size="18" fill="#7a5c14" font-family="sans-serif">厨房</text>'
      + '<text x="300" y="204" text-anchor="middle" font-size="18" fill="#7a5c14" font-family="sans-serif">卫生间</text>'
      + '<text x="200" y="13" text-anchor="middle" font-size="12" fill="#cc2222" font-family="sans-serif">▲ 北 N</text>'
      + '<text x="200" y="313" text-anchor="middle" font-size="12" fill="#228822" font-family="sans-serif">南 S ▼</text>'
      + '<text x="14" y="144" text-anchor="end" font-size="11" fill="#224488" font-family="sans-serif">西W</text>'
      + '<text x="386" y="144" text-anchor="start" font-size="11" fill="#224488" font-family="sans-serif">东E</text>'
      + '<path d="M176 262 Q200 242 224 262" fill="none" stroke="#c8a040" stroke-width="2.5"/>'
      + '<text x="200" y="318" text-anchor="middle" font-size="9" fill="#c8a040" font-family="sans-serif">门</text>'
      + '<rect x="18" y="18" width="364" height="244" fill="none" stroke="rgba(200,160,64,.25)" stroke-width="7"/>'
      + '<text x="200" y="285" text-anchor="middle" font-size="9" fill="#888" font-family="sans-serif">'
      + '示例户型·拖动/旋转/缩放对齐卫星楼顶轮廓后锁定</text>'
      + '</svg>';
  }

  function svgDataUrl(s) {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(s)));
  }

  // ─── 3-corner 计算 (ENU→WGS-84) ────────────────────────────────────────
  //
  // 输入: center (lat°, lng°), widthM × heightM (米), rotDeg (顺时针·真北°)
  //
  // 算法 (必须应用 cos(lat) 修正·GEO-ACCURACY.md §③·载力项):
  //   1. 四角 ENU 坐标 (east,north 米), 原点=楼顶中心:
  //        TL=(-hw,+hh), TR=(+hw,+hh), BL=(-hw,-hh), BR=(+hw,-hh)
  //   2. 顺时针旋转 rotDeg:
  //        e' = e·cos(r) + n·sin(r)
  //        n' = -e·sin(r) + n·cos(r)
  //   3. ENU→经纬:
  //        Δlat = n' / LAT_M
  //        Δlng = e' / (LAT_M · cos(lat))   ← cos(lat) 修正
  //
  // 数值算例 (lat=22.3°, rotDeg=30°, widthM=12, heightM=10):
  //   cos(22.3°)=0.9252, hw=6, hh=5
  //   TL ENU: e0=-6,n0=+5
  //     r=30°, cr=0.8660, sr=0.5000
  //     e'=-6×0.8660+5×0.5000=-2.696, n'=6×0.5000+5×0.8660=7.330
  //     Δlat=7.330/111320=+0.0000658°, Δlng=-2.696/(111320×0.9252)=-0.0000262°  ✓
  function computeCorners(lat, lng, widthM, heightM, rotDeg) {
    var cosLat = Math.cos(lat * DEG);
    var hw = widthM / 2, hh = heightM / 2;
    var r = rotDeg * DEG, cr = Math.cos(r), sr = Math.sin(r);

    function rotENU(e0, n0) {
      return { e: e0 * cr + n0 * sr, n: -e0 * sr + n0 * cr };
    }
    function ll(en) {
      return L.latLng(lat + en.n / LAT_M, lng + en.e / (LAT_M * cosLat));
    }

    return {
      tl: ll(rotENU(-hw, +hh)),
      tr: ll(rotENU(+hw, +hh)),
      bl: ll(rotENU(-hw, -hh)),
      br: ll(rotENU(+hw, -hh))
    };
  }

  // ─── CSS matrix transform ────────────────────────────────────────────────
  // 把图像像素坐标映射到 Leaflet 图层像素坐标 (overlayPane 坐标系)
  // 与 leaflet-imageoverlay-rotated (Iván Sánchez Ortega) 同算法
  //
  // 数学推导:
  //   img(0,0)     → pTL  (layer point of top-left corner)
  //   img(NAT_W,0) → pTR
  //   img(0,NAT_H) → pBL
  //   CSS matrix(a,b,c,d,e,f) 满足:
  //     a=(pTR.x-pTL.x)/NAT_W  b=(pTR.y-pTL.y)/NAT_W
  //     c=(pBL.x-pTL.x)/NAT_H  d=(pBL.y-pTL.y)/NAT_H
  //     e=pTL.x                 f=pTL.y
  function matrixCSS(map, corners) {
    var pTL = map.latLngToLayerPoint(corners.tl);
    var pTR = map.latLngToLayerPoint(corners.tr);
    var pBL = map.latLngToLayerPoint(corners.bl);
    var a = (pTR.x - pTL.x) / NAT_W, b = (pTR.y - pTL.y) / NAT_W;
    var c = (pBL.x - pTL.x) / NAT_H, d = (pBL.y - pTL.y) / NAT_H;
    return 'matrix(' + [a, b, c, d, pTL.x, pTL.y].map(function(v) { return v.toFixed(6); }).join(',') + ')';
  }

  // ─── FPLayer: Leaflet 自定义图层 ────────────────────────────────────────
  var FPLayer = L.Layer.extend({

    initialize: function (opts) {
      opts = opts || {};
      this._center  = opts.center  || null;
      this._widthM  = opts.widthM  || 12;
      this._heightM = opts.heightM || 10;
      this._rotDeg  = opts.rotDeg  || 0;
      this._locked  = false;
      this._corners = null;
      this._onUpdate = opts.onUpdate || null;
      this._svg = demoSVG();
    },

    onAdd: function (map) {
      this._map = map;
      if (!this._center) this._center = map.getCenter();

      var el = document.createElement('img');
      el.width  = NAT_W;
      el.height = NAT_H;
      el.style.position       = 'absolute';
      el.style.left           = '0';
      el.style.top            = '0';
      el.style.transformOrigin = '0 0';
      el.style.cursor         = 'grab';
      el.style.userSelect     = 'none';
      el.style.touchAction    = 'none';
      el.style.opacity        = '0.85';
      el.style.pointerEvents  = 'auto';
      el.className = 'fp-overlay-img';
      el.src = svgDataUrl(this._svg);
      this._el = el;
      map.getPanes().overlayPane.appendChild(el);

      this._onMapEvt = this._update.bind(this);
      map.on('viewreset zoomend moveend', this._onMapEvt);
      this._bindDrag();
      this._updateCorners();
      this._update();
      return this;
    },

    onRemove: function (map) {
      if (this._el) { this._el.remove(); this._el = null; }
      map.off('viewreset zoomend moveend', this._onMapEvt);
      this._unbindDrag();
    },

    // ── 公开 API ────────────────────────────────────────────────────────────

    rotate: function (deltaDeg) {
      if (this._locked) return;
      this._rotDeg = ((this._rotDeg + deltaDeg) % 360 + 360) % 360;
      this._updateCorners(); this._update(); this._fireUpdate();
    },

    scaleBy: function (factor) {
      if (this._locked) return;
      this._widthM  = Math.max(3,  Math.min(this._widthM  * factor, 500));
      this._heightM = Math.max(2.5, Math.min(this._heightM * factor, 500));
      this._updateCorners(); this._update(); this._fireUpdate();
    },

    lock: function () {
      this._locked = true;
      if (this._el) { this._el.style.cursor = 'default'; this._el.style.opacity = '0.72'; }
      this._fireUpdate();
      return this.getGeoreference();
    },

    unlock: function () {
      this._locked = false;
      if (this._el) { this._el.style.cursor = 'grab'; this._el.style.opacity = '0.85'; }
      this._fireUpdate();
    },

    isLocked: function () { return this._locked; },

    // 地理参考输出 — 下游飞星/八宅引擎可直接使用
    //
    // facingDeg: 图像 "top" 方向的真北方位角 (WGS-84 真北，非磁北)
    //            = rotDeg (旋转零点 = 正北)
    //            若门在图南侧: 向首 = (facingDeg+180)%360
    //            玄空飞星输入此值给 xkComputeXuanKong24 (CODEX-REVIEW.md §必修1)
    //
    // 仿射变换 (mm → 经纬度，用于房间/门/窗绝对坐标):
    //   mm2lat(mm): Δlat = mm / (LAT_M×1000)
    //   mm2lng(mm): Δlng = mm / (LAT_M×cosLat×1000)
    //   旋转: 需叠加 rotDeg 的旋转矩阵 (Phase 2 深化)
    getGeoreference: function () {
      if (!this._corners) return null;
      var lat = this._center.lat;
      var cosLat = Math.cos(lat * DEG);
      return {
        center:   { lat: lat, lng: this._center.lng },
        corners:  {
          tl: { lat: this._corners.tl.lat, lng: this._corners.tl.lng },
          tr: { lat: this._corners.tr.lat, lng: this._corners.tr.lng },
          bl: { lat: this._corners.bl.lat, lng: this._corners.bl.lng },
          br: { lat: this._corners.br.lat, lng: this._corners.br.lng }
        },
        rotDeg:   this._rotDeg,
        widthM:   this._widthM,
        heightM:  this._heightM,
        facingDeg: this._rotDeg,
        // 仿射比例: 1 lat-degree = LAT_M×1000 mm
        mmPerLatDeg: LAT_M * 1000,
        mmPerLngDeg: LAT_M * cosLat * 1000,
      };
    },

    // 从 storeysg RoomForge SceneDoc JSON 加载户型
    // rooms: [{ name, bounds: { x, z, w, d } }], 坐标单位: mm
    // 文档: STOREYSG-FLOORPLAN-INTEGRATION.md §复用数据模型
    loadSceneDoc: function (doc) {
      if (!doc || !Array.isArray(doc.rooms) || !doc.rooms.length) return false;
      var minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      doc.rooms.forEach(function (rm) {
        if (!rm.bounds) return;
        minX = Math.min(minX, rm.bounds.x);   maxX = Math.max(maxX, rm.bounds.x + rm.bounds.w);
        minZ = Math.min(minZ, rm.bounds.z);   maxZ = Math.max(maxZ, rm.bounds.z + rm.bounds.d);
      });
      if (!isFinite(minX) || maxX <= minX || maxZ <= minZ) return false;

      var bwMM = maxX - minX, bhMM = maxZ - minZ;
      var pad = 30;
      var sx = (NAT_W - pad * 2) / bwMM, sz = (NAT_H - pad * 2) / bhMM;
      var sc = Math.min(sx, sz);
      var offX = (NAT_W - bwMM * sc) / 2, offZ = (NAT_H - bhMM * sc) / 2;

      var rects = '';
      doc.rooms.forEach(function (rm) {
        if (!rm.bounds) return;
        var rx = ((rm.bounds.x - minX) * sc + offX).toFixed(1);
        var rz = ((rm.bounds.z - minZ) * sc + offZ).toFixed(1);
        var rw = (rm.bounds.w * sc).toFixed(1);
        var rd = (rm.bounds.d * sc).toFixed(1);
        var cx = ((rm.bounds.x - minX + rm.bounds.w / 2) * sc + offX).toFixed(1);
        var cy = ((rm.bounds.z - minZ + rm.bounds.d / 2) * sc + offZ + 6).toFixed(1);
        rects += '<rect x="' + rx + '" y="' + rz + '" width="' + rw + '" height="' + rd
          + '" fill="rgba(245,238,215,.7)" stroke="#c8a040" stroke-width="2"/>';
        if (rm.name) {
          rects += '<text x="' + cx + '" y="' + cy
            + '" text-anchor="middle" font-size="13" fill="#7a5c14" font-family="sans-serif">'
            + rm.name.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>';
        }
      });

      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" width="400" height="320">'
        + '<rect width="400" height="320" fill="rgba(245,238,215,.9)"/>'
        + rects
        + '<text x="200" y="14" text-anchor="middle" font-size="12" fill="#cc2222" font-family="sans-serif">▲ 北 N</text>'
        + '<text x="200" y="318" text-anchor="middle" font-size="12" fill="#228822" font-family="sans-serif">南 S ▼</text>'
        + '</svg>';

      this._svg = svg;
      if (this._el) this._el.src = svgDataUrl(svg);
      this._widthM  = bwMM / 1000;
      this._heightM = bhMM / 1000;
      this._updateCorners(); this._update(); this._fireUpdate();
      return true;
    },

    // ── 私有 ─────────────────────────────────────────────────────────────────

    _updateCorners: function () {
      if (!this._center) return;
      this._corners = computeCorners(
        this._center.lat, this._center.lng,
        this._widthM, this._heightM, this._rotDeg
      );
    },

    _update: function () {
      if (!this._corners || !this._map || !this._el) return;
      this._el.style.transform = matrixCSS(this._map, this._corners);
    },

    _fireUpdate: function () {
      if (this._onUpdate) this._onUpdate(this.getGeoreference());
    },

    // 拖拽: Pointer Events API (touch + mouse 统一)
    _bindDrag: function () {
      var self = this;
      this._pdHandler = function (e) { self._onPointerDown(e); };
      this._el.addEventListener('pointerdown', this._pdHandler);
    },

    _unbindDrag: function () {
      if (this._pdHandler && this._el) {
        this._el.removeEventListener('pointerdown', this._pdHandler);
      }
    },

    _onPointerDown: function (e) {
      if (this._locked) return;
      e.preventDefault(); e.stopPropagation();
      this._el.setPointerCapture(e.pointerId);

      var self = this;
      var map  = this._map;
      var c0   = { lat: this._center.lat, lng: this._center.lng };
      var p0   = map.latLngToContainerPoint(L.latLng(c0.lat, c0.lng));
      var e0x  = e.clientX, e0y = e.clientY;
      var moved = false;

      function onMove(ev) {
        var dx = ev.clientX - e0x, dy = ev.clientY - e0y;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        moved = true;
        self._center = map.containerPointToLatLng(L.point(p0.x + dx, p0.y + dy));
        self._updateCorners();
        self._update();
      }

      function onUp() {
        self._el.removeEventListener('pointermove', onMove);
        self._el.removeEventListener('pointerup', onUp);
        if (!self._locked) self._el.style.cursor = 'grab';
        if (moved) self._fireUpdate();
      }

      this._el.addEventListener('pointermove', onMove, { passive: true });
      this._el.addEventListener('pointerup', onUp);
      this._el.style.cursor = 'grabbing';
    },
  });

  window.FPLayer = FPLayer;
  window.fpLayerCreate = function (opts) { return new FPLayer(opts); };

})();

// web/js/floorplan.js  v2.1  2026-06-25
// 户型图叠地图层 — 架构: docs/auto/yangzhai-luopan/STOREYSG-FLOORPLAN-INTEGRATION.md
// 朝向: 从卫星楼顶对齐读出 WGS-84 真北顺时针，不依赖浏览器罗盘
// 坐标: GEO-ACCURACY.md § cos(lat) 修正（pixPerM 函数已内置）
// 数据模型: SceneDoc JSON（storeysg RoomForge，rooms[]{id,name,x,y,w,h} mm，只读参考）

(function () {
  'use strict';

  // 默认3室户型示意 (SceneDoc mm, 原点左上, +x右, +y下俯视)
  // 起居室 5×4m + 主卧 3.5×4m + 次卧 2.5×3m + 厨卫 2.5×3m，总 8.5×7m
  var DEFAULT_ROOMS = [
    { id: 'r1', name: '起居室', x: 0,    y: 0,    w: 5000, h: 4000 },
    { id: 'r2', name: '主卧',   x: 5000, y: 0,    w: 3500, h: 4000 },
    { id: 'r3', name: '次卧',   x: 0,    y: 4000, w: 2500, h: 3000 },
    { id: 'r4', name: '厨卫',   x: 2500, y: 4000, w: 2500, h: 3000 },
  ];
  var FILL_COLORS = ['#f0e8cc', '#e8ddb8', '#f5edd5', '#e2d4a8'];
  var WALL_COLOR  = '#7a5c14';
  // v2-P49: 缩放切换阈值（架构: STOREYSG-FLOORPLAN-INTEGRATION.md「放大=室内，缩小=室外」）
  // zoom ≥ 17: 显示室内叠层（八宅/玄空/形煞/砂水/流年弧）
  // zoom < 17: 仅显示户型轮廓，室外分析由地图 Leaflet 层呈现
  // 数值验证: zoom=17 时标准 Web Mercator 像素密度约 0.61m/px；
  //           典型住宅楼宽 12m ≈ 20px，九宫格每格 ≈ 6.7px，仍可辨认格线 ✓
  //           zoom=16: 每格 ≈ 3.3px → 叠层文字重叠，故选 17 为切换边界
  var INDOOR_ZOOM = 17;

  // 包围盒 (mm)
  function bbox(rooms) {
    var mx = 0, my = 0;
    rooms.forEach(function (r) {
      if (r.x + r.w > mx) mx = r.x + r.w;
      if (r.y + r.h > my) my = r.y + r.h;
    });
    return { w: mx, h: my };
  }

  // Web Mercator 像素/米 — GEO-ACCURACY.md § ③ cos(lat) 修正（必须）
  // res(z, lat) = 156543.03 * cos(lat) / 2^z  m/px → px/m = 2^z / (156543.03 * cos(lat))
  // 数值验证: z=13, lat=1.3°(新加坡) → cos≈0.9997, px/m ≈ 0.0536
  function pxPerM(zoom, latDeg) {
    return Math.pow(2, zoom) / (156543.03 * Math.cos(latDeg * Math.PI / 180));
  }

  function normDeg(d) { return ((d % 360) + 360) % 360; }

  // 屏幕偏移 → 方位角 (0=North, 顺时针)
  // 屏幕: +x=East, +y=South → bearing = atan2(East, North) = atan2(dx, -dy)
  function bearingOf(dx, dy) {
    return normDeg(Math.atan2(dx, -dy) * 180 / Math.PI);
  }

  // ================================================================
  // CSS rotate(θdeg) 旋转验证 (在 lock() 中的仿射变换基础)
  // CSS rotate(θ) = 视觉顺时针旋转; 在屏幕坐标(+y向下)中等价于标准数学 CCW:
  //   screen_dx = dx*cos(θ) - dy*sin(θ)   [East 分量]
  //   screen_dy = dx*sin(θ) + dy*cos(θ)   [South 分量, +y向下]
  // 故: East_m = screen_dx * mmPerM, North_m = -screen_dy * mmPerM
  // 数值验证(θ=0): (1000mm,0)→East=1m ✓; (0,1000mm)→South=1m(-North) ✓
  // 数值验证(θ=90°): (1000,0)→screen(0,1)→South=1m ✓; (0,1000)→screen(-1,0)→West ✓
  // ================================================================

  // ================================================================
  // FloorplanOverlay — 叠在 Leaflet 地图上的户型图层
  // ================================================================
  function FloorplanOverlay() {
    this._rooms   = DEFAULT_ROOMS.slice();
    this._anchor  = null;    // L.LatLng 中心（穴位/参考点）
    this._rot     = 0;       // 度: CSS rotate(θ) = SVG"上方"(-y轴)对应的地理方位角(WGS-84真北顺时针)
    this._mmPerM  = 0.001;   // 实世界 m per SceneDoc mm; addTo() 按视觉宽度重置
    this._locked  = false;
    this._lockedState = null;
    this._map     = null;
    this._el      = null;
    this._svg     = null;
    this._hC      = null;    // 中心手柄
    this._hR      = null;    // 旋转手柄
    this._hS      = null;    // 缩放手柄
    this._drag         = null;
    this._bzBase       = null;    // v2-P2: 八宅九宫叠色基础卦名 (null=关闭)
    this._overlayMode  = null;    // v2-P3: 当前叠层模式 'bz'|'xk'|null
    this._xkChart      = null;    // v2-P3: 玄空飞星盘
    this._xkYun        = null;    // v2-P3: 飞星运数
    this._onMapEv      = this._render.bind(this);
    this._fpMarkers  = [];    // v2-P5: [{id, type, xMm, yMm, ch}] SceneDoc mm 坐标
    this._nextMkId   = 0;     // v2-P5: 自增 id
    this._onFPTap    = null;  // v2-P5: callback(xMm, yMm, hitId|null)，由 app.js 挂载
    this._shaItems      = [];    // v2-P11: 形煞向格叠色数据（来自 runOutdoorAnalysis）
    this._swItems       = null;  // v2-P12: 砂水四神叠色数据（来自 showSandwaterResult）
    this._swDoorBear    = null;  // v2-P12: 砂水分析时的门向（WGS-84°）
    this._nianMonthOv   = null;  // v2-P47: 年月三盘叠合叠色数据（xkTriplateOverview 返回值）
    this._showNianMonth = false; // v2-P47: 是否显示年月叠煞层
    this._lyData        = null;  // v2-P48: 流年凶方数据（太岁/三煞/岁破/年五黄）
    this._showLiuNian   = false; // v2-P48: 是否显示流年凶方弧形叠层
    this._isExample     = true;  // 三步向导：示例户型（true）→ 显「示例」角标；导入后置 false
    this._demoBadge     = null;  // 「示例」小角标 DOM（常驻户型左上角，非旋转）
    this._onTransform   = null;  // 向导：拖/旋/缩后回调（刷新对齐提示），由 app.js 挂载
  }

  FloorplanOverlay.prototype.addTo = function (map) {
    this._map    = map;
    this._anchor = this._anchor || map.getCenter();
    // 默认视觉宽约 200px（用户需自行拖缩匹配楼顶）
    var b   = bbox(this._rooms);
    var ppm = pxPerM(map.getZoom(), this._anchor.lat);
    this._mmPerM = 200 / (b.w * ppm);
    this._buildDOM();
    this._render();
    map.on('move zoom viewreset', this._onMapEv);
    return this;
  };

  FloorplanOverlay.prototype.remove = function () {
    if (this._map) this._map.off('move zoom viewreset', this._onMapEv);
    if (this._el)  { this._el.remove(); this._el = null; }
    this._map = null;
    window._fpBearing = null;
    window._fpLocked  = false;
    window._fpMMtoLL  = null;
  };

  FloorplanOverlay.prototype._buildDOM = function () {
    var mc  = this._map.getContainer();
    var el  = document.createElement('div');
    el.className  = 'fp-layer';
    el.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;'
      + 'overflow:visible;pointer-events:none;z-index:502';
    mc.appendChild(el);
    this._el = el;

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;overflow:visible;pointer-events:none;'
      + 'will-change:transform';
    el.appendChild(svg);
    this._svg = svg;

    this._hC = this._mkH('✛', '#c8a84b', '#1a0e00', 'grab',         '拖动 → 移动户型图位置');
    this._hR = this._mkH('↻', '#5bc8d8', '#fff',    'crosshair',    '拖动 → 旋转（调建筑朝向）');
    this._hS = this._mkH('⤡', '#7bc87a', '#fff',    'nwse-resize',  '拖动 → 缩放（匹配楼顶大小）');

    this._bindH(this._hC, 'move');
    this._bindH(this._hR, 'rotate');
    this._bindH(this._hS, 'scale');

    // 「示例」小角标：常驻户型左上角，提示这是示意户型（导入真实户型后隐藏）
    var badge = document.createElement('div');
    badge.className = 'fp-demo-badge';
    badge.textContent = '示例';
    badge.style.cssText = 'position:absolute;z-index:504;pointer-events:none;'
      + 'font-size:10px;line-height:1;padding:3px 7px;border-radius:999px;white-space:nowrap;'
      + 'background:rgba(20,18,14,.9);color:#c9a227;border:.8px solid rgba(201,162,39,.55);'
      + 'transform:translate(-2px,-2px);box-shadow:0 1px 4px rgba(0,0,0,.5);display:none';
    el.appendChild(badge);
    this._demoBadge = badge;

    // v2-P5: SVG canvas 手势——lock() 后由 app.js 挂载 _onFPTap 并激活 pointer-events
    var fpSelf = this;
    this._svg.addEventListener('pointerdown', function (e) {
      if (!fpSelf._locked) return;
      e.stopPropagation();
      var pt = fpSelf.containerPointToMM(e.clientX, e.clientY);
      if (!pt) return;
      var b     = bbox(fpSelf._rooms);
      var hitMk = fpSelf._hitFPMarker(pt.xMm, pt.yMm);
      if (hitMk) {
        // 拖动已有标记
        fpSelf._svg.setPointerCapture(e.pointerId);
        var moved = false, sx = pt.xMm, sy = pt.yMm;
        function onPMove(ev) {
          var p2 = fpSelf.containerPointToMM(ev.clientX, ev.clientY);
          if (!p2) return;
          if (!moved && Math.hypot(p2.xMm - sx, p2.yMm - sy) < 100) return;
          moved = true;
          hitMk.xMm = Math.max(0, Math.min(b.w, p2.xMm));
          hitMk.yMm = Math.max(0, Math.min(b.h, p2.yMm));
          fpSelf._render();
        }
        function onPUp() {
          fpSelf._svg.removeEventListener('pointermove', onPMove);
          fpSelf._svg.removeEventListener('pointerup',   onPUp);
          if (fpSelf._onFPTap) fpSelf._onFPTap(hitMk.xMm, hitMk.yMm, hitMk.id);
        }
        fpSelf._svg.addEventListener('pointermove', onPMove);
        fpSelf._svg.addEventListener('pointerup',   onPUp);
      } else {
        // 点空白区 → app.js 决定是否放置新标记
        if (fpSelf._onFPTap) fpSelf._onFPTap(pt.xMm, pt.yMm, null);
      }
    });
  };

  FloorplanOverlay.prototype._mkH = function (icon, bg, fg, cur, title) {
    var h = document.createElement('div');
    h.className  = 'fp-handle';
    h.innerHTML  = icon;
    h.title      = title;
    h.style.cssText = 'position:absolute;width:28px;height:28px;line-height:28px;'
      + 'text-align:center;border-radius:50%;z-index:503;font-size:16px;'
      + 'transform:translate(-50%,-50%);user-select:none;touch-action:none;'
      + 'pointer-events:all;cursor:' + cur + ';'
      + 'background:' + bg + ';color:' + fg + ';'
      + 'box-shadow:0 2px 8px rgba(0,0,0,.65);transition:opacity .25s';
    this._el.appendChild(h);
    return h;
  };

  FloorplanOverlay.prototype._bindH = function (h, type) {
    var self = this;
    function cli(e) { var s = e.touches ? e.touches[0] : e; return { x: s.clientX, y: s.clientY }; }

    function onStart(e) {
      e.stopPropagation(); e.preventDefault();
      var c  = cli(e);
      var ap = self._map.latLngToContainerPoint(self._anchor);
      self._drag = {
        type: type,
        sx: c.x, sy: c.y,
        sa: self._anchor,
        sr: self._rot,
        sm: self._mmPerM,
        sb: bearingOf(c.x - ap.x, c.y - ap.y)
      };
      if (self._map.dragging) self._map.dragging.disable();
      document.addEventListener('mousemove',  onMove);
      document.addEventListener('touchmove',  onMove, { passive: false });
      document.addEventListener('mouseup',    onEnd);
      document.addEventListener('touchend',   onEnd);
    }

    function onMove(e) {
      if (!self._drag || self._drag.type !== type) return;
      e.preventDefault();
      var c = cli(e);
      var d = self._drag;
      if (type === 'move') {
        var sp = self._map.latLngToContainerPoint(d.sa);
        self._anchor = self._map.containerPointToLatLng(
          [sp.x + c.x - d.sx, sp.y + c.y - d.sy]);
      } else if (type === 'rotate') {
        var ap = self._map.latLngToContainerPoint(d.sa);
        self._rot = normDeg(d.sr + bearingOf(c.x - ap.x, c.y - ap.y) - d.sb);
      } else {
        var ap2 = self._map.latLngToContainerPoint(d.sa);
        var d0 = Math.hypot(d.sx - ap2.x, d.sy - ap2.y);
        var d1 = Math.hypot(c.x  - ap2.x, c.y  - ap2.y);
        if (d0 > 5) self._mmPerM = Math.min(0.5, Math.max(1e-5, d.sm * d1 / d0));
      }
      self._render();
    }

    function onEnd() {
      self._drag = null;
      if (self._map && self._map.dragging) self._map.dragging.enable();
      document.removeEventListener('mousemove',  onMove);
      document.removeEventListener('touchmove',  onMove);
      document.removeEventListener('mouseup',    onEnd);
      document.removeEventListener('touchend',   onEnd);
    }

    h.addEventListener('mousedown',  onStart);
    h.addEventListener('touchstart', onStart, { passive: false });
  };

  FloorplanOverlay.prototype._render = function () {
    if (!this._el || !this._map || !this._anchor) return;
    var map  = this._map;
    var zoom = map.getZoom();
    var lat  = this._anchor.lat;
    var ppm  = pxPerM(zoom, lat);          // px/m, cos(lat) 已修正
    var pxmm = this._mmPerM * ppm;         // px per SceneDoc mm
    var b    = bbox(this._rooms);
    var W    = b.w * pxmm;                 // SVG 显示宽 (px)
    var H    = b.h * pxmm;                 // SVG 显示高 (px)
    var ap   = map.latLngToContainerPoint(this._anchor);

    var svg = this._svg;
    svg.setAttribute('viewBox', '0 0 ' + b.w + ' ' + b.h);
    svg.style.width  = W + 'px';
    svg.style.height = H + 'px';
    svg.style.left   = (ap.x - W / 2) + 'px';
    svg.style.top    = (ap.y - H / 2) + 'px';
    svg.style.transformOrigin = '50% 50%';
    svg.style.transform = 'rotate(' + this._rot + 'deg)';

    // 所有字号/线宽/臂长统一按「屏上像素」钳制后除 pxmm 换回 SVG 单位，
    // 杜绝旧式 X/pxmm（屏上恒 Xpx，缩小仍糊满全屏）与 max(常数,…)（放大爆炸）两头失控。
    var ww   = Math.min(4,  Math.max(1.5, W / 100)) / pxmm;  // 墙厚：屏上 1.5–4px
    var fsPx = Math.max(9, Math.min(14, W / 11));            // 房名：屏上 9–14px（上限 14px）
    var fs   = fsPx / pxmm;
    var cx  = b.w / 2;
    var cy  = b.h / 2;
    var cl  = Math.min(18, Math.max(8, W / 9)) / pxmm;       // 十字臂：屏上 8–18px
    var csw = Math.min(2.5, Math.max(1, W / 120)) / pxmm;    // 十字线宽：屏上 1–2.5px
    var inner = '';

    this._rooms.forEach(function (r, i) {
      var fill = FILL_COLORS[i % FILL_COLORS.length];
      inner += '<rect x="' + r.x + '" y="' + r.y
        + '" width="' + r.w + '" height="' + r.h
        + '" fill="' + fill + '" stroke="' + WALL_COLOR
        + '" stroke-width="' + ww + '" opacity="0.82"/>';
      inner += '<text x="' + (r.x + r.w / 2) + '" y="' + (r.y + r.h / 2)
        + '" text-anchor="middle" dominant-baseline="middle"'
        + ' fill="#3a2000" font-family="serif" font-size="' + fs + '">' + r.name + '</text>';
    });

    // 中心十字（穴位标记）
    inner += '<line x1="' + (cx - cl) + '" y1="' + cy + '" x2="' + (cx + cl) + '" y2="' + cy
      + '" stroke="#c8a84b" stroke-width="' + csw + '"/>';
    inner += '<line x1="' + cx + '" y1="' + (cy - cl) + '" x2="' + cx + '" y2="' + (cy + cl)
      + '" stroke="#c8a84b" stroke-width="' + csw + '"/>';

    // 朝向箭头：SVG -y（上方）= 当前 _rot 方位角（WGS-84真北顺时针）；钉在户型上沿附近，字号钳制
    var arFs = Math.min(13, Math.max(9, W / 13)) / pxmm;    // 屏上 9–13px
    var arY  = Math.max(cy - b.h * 0.42, b.h * 0.06 + arFs);
    inner += '<text x="' + cx + '" y="' + arY
      + '" text-anchor="middle" dominant-baseline="middle" fill="#c8a84b"'
      + ' font-family="serif" font-size="' + arFs + '">↑N</text>';

    // v2-P49: 缩放切换 — zoom≥INDOOR_ZOOM 时显示室内叠层，否则仅显户型轮廓
    // 架构: STOREYSG-FLOORPLAN-INTEGRATION.md「放大=室内八宅/玄空，缩小=室外路冲/形煞」
    // 确定性: zoom 由 Leaflet getZoom() 返回整数级，同级恒同输出 ✓
    var showIndoor = (zoom >= INDOOR_ZOOM);
    if (showIndoor) {
      // 叠加层（v2-P2: 八宅 / v2-P3: 玄空飞星；两者互斥由 _overlayMode 控制）
      if (this._overlayMode === 'xk' && this._xkChart) {
        inner += this._buildXuanKongGrid(b, pxmm);
      } else if (this._overlayMode === 'bz' && this._bzBase !== null) {
        inner += this._buildBazhaiGrid(b, pxmm);
      }
      // v2-P11: 形煞向格警示叠色（可与 BZ/XK 共存，叠在其上方）
      if (this._shaItems && this._shaItems.length > 0) {
        inner += this._buildShaGrid(b, pxmm);
      }
      // v2-P12: 砂水四神向格叠色（可与 BZ/XK/SHA 共存，叠在最上方）
      if (this._swItems && this._swItems.length > 0) {
        inner += this._buildSwGrid(b, pxmm);
      }
      // v2-P47: 年月三盘叠煞向格叠色（独立层·可与 BZ/XK/SHA/SW 共存·叠在最上方）
      if (this._showNianMonth && this._nianMonthOv) {
        inner += this._buildNianMonthGrid(b, pxmm);
      }
      // v2-P48: 流年凶方弧形叠层（太岁/三煞/岁破/年五黄；CODEX-REVIEW 必修3·15°弧形）
      if (this._showLiuNian && this._lyData) {
        inner += this._buildLiuNianArcs(b, pxmm);
      }
    } else {
      // zoom < INDOOR_ZOOM: 室外尺度——户型轮廓保留（对齐参考），叠层隐去以免密集干扰
      // 室外形煞/砂水分析已由地图 Leaflet 层（Leaflet markers）直接呈现，无需 SVG 叠层
      var hasIndoorLayer = (this._overlayMode !== null)
        || (this._shaItems && this._shaItems.length > 0)
        || (this._swItems  && this._swItems.length  > 0)
        || this._showNianMonth || this._showLiuNian;
      if (hasIndoorLayer) {
        // 提示用户放大后即可看到室内叠层
        var hFs = Math.max(100, Math.min(350, 12 / pxmm));
        inner += '<text x="' + (b.w / 2).toFixed(1) + '" y="' + (b.h * 0.92).toFixed(1)
          + '" text-anchor="middle" dominant-baseline="middle"'
          + ' fill="rgba(200,168,64,.62)" font-family="serif"'
          + ' font-size="' + hFs.toFixed(1) + '">↑ 放大到 zoom 17+ 查室内叠层</text>';
      }
    }

    // v2-P5: 户型画布标记（SceneDoc mm 坐标，锁定后可放置/拖移）
    var fpMks = this._fpMarkers;
    if (fpMks.length > 0) {
      var HIT_R_PX = 18;
      fpMks.forEach(function (mk) {
        var rMm  = Math.max(150, HIT_R_PX / pxmm);   // 标记圆半径 (mm)
        var sw2  = Math.max(15, 22 / pxmm);            // 描边宽 (mm)
        var fsMm = rMm * 1.05;                         // 字号 (mm)
        var col  = FP_MK_COL[mk.type] || '#c8a84b';
        inner += '<circle cx="' + mk.xMm.toFixed(1) + '" cy="' + mk.yMm.toFixed(1)
          + '" r="' + rMm.toFixed(1) + '" fill="' + col
          + '" stroke="rgba(255,255,255,.88)" stroke-width="' + sw2.toFixed(1) + '" opacity="0.92"/>';
        inner += '<text x="' + mk.xMm.toFixed(1) + '" y="' + mk.yMm.toFixed(1)
          + '" text-anchor="middle" dominant-baseline="middle"'
          + ' font-family="serif" font-size="' + fsMm.toFixed(1) + '"'
          + ' fill="#fff" font-weight="bold">' + mk.ch + '</text>';
      });
    }

    svg.innerHTML = inner;

    // 手柄位置
    this._hC.style.left = ap.x + 'px';
    this._hC.style.top  = ap.y + 'px';

    var R = Math.max(46, Math.hypot(W, H) / 2 + 18);
    var rBear = (this._rot - 45) * Math.PI / 180;    // 旋转手柄: NE方向
    this._hR.style.left = (ap.x + R * Math.sin(rBear)) + 'px';
    this._hR.style.top  = (ap.y - R * Math.cos(rBear)) + 'px';

    var sBear = (this._rot + 135) * Math.PI / 180;   // 缩放手柄: SE方向
    this._hS.style.left = (ap.x + R * Math.sin(sBear)) + 'px';
    this._hS.style.top  = (ap.y - R * Math.cos(sBear)) + 'px';

    // 「示例」角标：钉在户型（未旋转）左上角，仅示例户型时显示
    if (this._demoBadge) {
      if (this._isExample) {
        this._demoBadge.style.display = '';
        this._demoBadge.style.left = (ap.x - W / 2) + 'px';
        this._demoBadge.style.top  = (ap.y - H / 2) + 'px';
      } else {
        this._demoBadge.style.display = 'none';
      }
    }

    window._fpBearing = this._rot;
    window._fpScale   = this._mmPerM;
    if (window._fpUpdateHUD) window._fpUpdateHUD(this._rot, this._mmPerM, this._locked, zoom);
  };

  // ─── 三步向导：按钮式微调（对齐时用；与拖旋缩手柄共用同一 _rot/_mmPerM 内核） ───
  // rotateBy(deg): 旋转户型（图北方位角）；锁定后禁改，与手柄 onMove 'rotate' 同语义
  FloorplanOverlay.prototype.rotateBy = function (deg) {
    if (this._locked || !this._map) return;
    this._rot = normDeg(this._rot + (+deg || 0));
    this._render();
    if (this._onTransform) this._onTransform();
  };
  // scaleBy(factor): 缩放户型显示尺寸（改 _mmPerM）；夹在与缩放手柄同区间 [1e-5, 0.5]
  FloorplanOverlay.prototype.scaleBy = function (factor) {
    if (this._locked || !this._map) return;
    var f = +factor || 1;
    this._mmPerM = Math.min(0.5, Math.max(1e-5, this._mmPerM * f));
    this._render();
    if (this._onTransform) this._onTransform();
  };
  // setDisplayWidthPx(px): 令户型在当前 zoom 下显示为约 px 宽（示例入场用 ~视口 45%）
  FloorplanOverlay.prototype.setDisplayWidthPx = function (px) {
    if (this._locked || !this._map || !this._anchor) return;
    var b   = bbox(this._rooms);
    var ppm = pxPerM(this._map.getZoom(), this._anchor.lat);
    if (b.w > 0 && ppm > 0) {
      this._mmPerM = Math.min(0.5, Math.max(1e-5, px / (b.w * ppm)));
      this._render();
    }
  };

  // ================================================================
  // lock() — 锁定后计算仿射变换 mm → lat/lng
  //
  // 仿射变换推导 (CSS rotate(θ) 旋转约定):
  //   SVG点 (dx,dy) 相对中心 → 屏幕偏移:
  //     scrX = dx*cos(θ) - dy*sin(θ)   [East]
  //     scrY = dx*sin(θ) + dy*cos(θ)   [South, 屏幕+y向下]
  //   地理:
  //     East_m  = scrX * mmPerM
  //     North_m = -scrY * mmPerM
  //   经纬度:
  //     lat = lat0 + North_m / 111320
  //     lng = lng0 + East_m  / (111320 * cos(lat0))   ← GEO-ACCURACY cos(lat) 修正
  //
  // 数值算例 (θ=0°, mmPerM=0.001):
  //   (5000mm, 0mm) → dx=2500, dy=-3500(取中心) → 根据实际中心算
  //   简化验证: dx=1000mm, dy=0 → East=1m, North=0 → lat不变, lng+1/(111320*cosLat) ✓
  //   dx=0, dy=1000mm → East=0, North=-1m → lat-1/111320, lng不变 (南移1m) ✓
  //
  // 待 Codex 复核点 K1: CSS rotate(θ) 在 screen 坐标的 CW 旋转约定与上述公式一致性
  // ================================================================
  FloorplanOverlay.prototype.lock = function () {
    if (this._locked) return;
    this._locked = true;
    var lat0   = this._anchor.lat;
    var lng0   = this._anchor.lng;
    var cosLat = Math.cos(lat0 * Math.PI / 180);  // GEO-ACCURACY.md cos(lat) 修正
    var θ      = this._rot * Math.PI / 180;
    var cosθ   = Math.cos(θ), sinθ = Math.sin(θ);
    var b      = bbox(this._rooms);
    var cx     = b.w / 2, cy = b.h / 2;
    var m      = this._mmPerM;

    function mmToLL(xMm, yMm) {
      var dx     = xMm - cx, dy = yMm - cy;
      var eastM  = (dx * cosθ - dy * sinθ) * m;
      var northM = -(dx * sinθ + dy * cosθ) * m;
      return L.latLng(lat0 + northM / 111320, lng0 + eastM / (111320 * cosLat));
    }

    this._lockedState = {
      anchor:  this._anchor,
      bearing: this._rot,      // WGS-84 真北顺时针，SVG 上方对应的方位角
      mmPerM:  m,
      mmToLL:  mmToLL,
      corners: [
        mmToLL(0,   0  ),      // 左上
        mmToLL(b.w, 0  ),      // 右上
        mmToLL(b.w, b.h),      // 右下
        mmToLL(0,   b.h),      // 左下
      ],
    };

    [this._hC, this._hR, this._hS].forEach(function (h) {
      h.style.opacity        = '0.30';
      h.style.pointerEvents  = 'none';
    });

    window._fpLocked  = true;
    window._fpMMtoLL  = mmToLL;
    if (this._svg) this._svg.style.pointerEvents = 'auto'; // v2-P5: 激活画布交互
    if (window._fpUpdateHUD) window._fpUpdateHUD(this._rot, m, true);
  };

  FloorplanOverlay.prototype.unlock = function () {
    this._locked      = false;
    this._lockedState = null;
    window._fpLocked  = false;
    window._fpMMtoLL  = null;
    [this._hC, this._hR, this._hS].forEach(function (h) {
      h.style.opacity       = '1';
      h.style.pointerEvents = 'all';
    });
    this._render();
    if (this._svg) this._svg.style.pointerEvents = 'none'; // v2-P5: 关闭画布交互
    this._onFPTap = null;
  };

  // 导入 SceneDoc JSON (storeysg RoomForge 格式，仅读参考不写回)
  // 格式: { rooms: [{ id, name, x, y, w, h }] }  (坐标单位 mm)
  FloorplanOverlay.prototype.importSceneDoc = function (src) {
    var doc;
    try { doc = typeof src === 'string' ? JSON.parse(src) : src; }
    catch (e) { return 'JSON 解析失败: ' + e.message; }
    if (!doc.rooms || !Array.isArray(doc.rooms) || !doc.rooms.length)
      return '缺少 rooms[] 数组（格式: { rooms:[{name,x,y,w,h}…] }）';
    this._rooms = doc.rooms.map(function (r, i) {
      return {
        id:   r.id   || ('r' + i),
        name: r.name || r.type || ('房间' + (i + 1)),
        x:    +(r.x || 0),
        y:    +(r.y || r.z || 0),
        w:    +(r.width  || r.w || 3000),
        h:    +(r.height || r.h || 3000),
      };
    });
    this._isExample = false;   // 导入真实户型 → 撤下「示例」角标
    if (this._locked) this.unlock();
    this._render();
    return null;
  };

  FloorplanOverlay.prototype.isLocked      = function () { return this._locked; };
  FloorplanOverlay.prototype.getLockedState = function () { return this._lockedState; };

  // lockByBearing — v2-P6 fallback（GEO-ACCURACY.md §② 降级阶梯）
  // 楼顶不可见/影像糊时：用罗盘磁北(或手动输入°) + GPS锚点直接锁定，跳过拖/旋对齐
  // bearing: 0–360° 顺时针（磁北 or 真北，由调用方标注；磁北时UI须警示误差±2°–5°）
  // lat,lng: GPS锚点（null→复用当前_anchor或地图中心）
  // 数值验证: bearing=180, lat=1.3°, lng=103.8°
  //   → _rot=180, mmToLL(cx,cy) = {lat:1.3°, lng:103.8°} ✓
  //   → window._fpBearing=180 → 下游飞星/八宅引擎接收正南朝向 ✓
  FloorplanOverlay.prototype.lockByBearing = function (bearing, lat, lng) {
    if (this._locked) return;
    if (lat != null && lng != null) this._anchor = L.latLng(lat, lng);
    if (!this._anchor && this._map) this._anchor = this._map.getCenter();
    this._rot = ((+bearing || 0) % 360 + 360) % 360;
    if (this._map) this._render();  // 更新可视位置并设置 window._fpBearing
    this.lock();                    // 构造 _lockedState（同 lock()，含 cos(lat) 修正）
  };

  // ================================================================
  // v2-P5: 户型画布标记（SceneDoc mm 坐标，锁定后可放置/拖移）
  //
  // 方位角公式 (dx=xMm-cx, dy=yMm-cy, 相对包围盒中心):
  //   svgBear = atan2(dx,-dy)*180/π   (0=SVG-up,-y, 顺时针)
  //   geoBear = (svgBear + _rot + 360) % 360  (WGS-84 真北顺时针)
  //   trig    = trigramAt(geoBear)
  // WGS-84: _lockedState.mmToLL(xMm,yMm) 含旋转仿射变换+cos(lat) 修正
  // ================================================================

  FloorplanOverlay.prototype.addFPMarker = function (type, xMm, yMm) {
    var id = this._nextMkId++;
    this._fpMarkers.push({ id: id, type: type, xMm: xMm, yMm: yMm,
      ch: FP_MK_CH[type] || type.slice(0, 1) });
    this._render();
    return id;
  };

  FloorplanOverlay.prototype.removeFPMarker = function (id) {
    this._fpMarkers = this._fpMarkers.filter(function (m) { return m.id !== id; });
    this._render();
  };

  FloorplanOverlay.prototype.clearFPMarkers = function () {
    this._fpMarkers = []; this._render();
  };

  FloorplanOverlay.prototype.getFPMarkers = function () {
    return this._fpMarkers.slice();
  };

  // 屏幕坐标 → SVG mm（通过 getScreenCTM，含 CSS rotate/scale 一次性处理）
  // 数值验证: 旋转30°后点击SVG中心 → (cx, cy) in mm; getScreenCTM().inverse() 还原 ✓
  FloorplanOverlay.prototype.containerPointToMM = function (clientX, clientY) {
    var svg = this._svg;
    if (!svg || !svg.createSVGPoint || !svg.getScreenCTM) return null;
    var pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    var ctm = svg.getScreenCTM();
    if (!ctm) return null;
    try {
      var sp = pt.matrixTransform(ctm.inverse());
      return { xMm: sp.x, yMm: sp.y };
    } catch (e) { return null; }
  };

  // 命中检测（命中半径 HIT_MM ≈ 40cm，适合触屏）
  FloorplanOverlay.prototype._hitFPMarker = function (xMm, yMm) {
    var HIT_MM = 400;
    var best = null, bestD = HIT_MM;
    this._fpMarkers.forEach(function (m) {
      var d = Math.hypot(m.xMm - xMm, m.yMm - yMm);
      if (d < bestD) { best = m; bestD = d; }
    });
    return best;
  };

  // ================================================================
  // v2-P2: 室内层 — 八宅九宫格叠色
  // 出处: 《八宅明镜》游年八星法（清·赵廷栋/赵九峰）
  // 公式: bazhaiStar(base, dirTrigram) → 八吉凶星（core.js 已实现）
  // 数值算例(坎命 base='坎') — 《八宅明镜》坎命/坎宅标准:
  //   北(坎宫): bazhaiStar('坎','坎')='伏位'(吉) ✓
  //   南(离宫): bazhaiStar('坎','离')='延年'(吉) ✓
  //   西(兑宫): bazhaiStar('坎','兑')='祸害'(凶) ✓  ← 注意：祸害非六煞
  //   西北(乾宫): bazhaiStar('坎','乾')='六煞'(凶) ✓
  //   待 Codex L1 复核: 子山午向宅(宅卦=坎),各宫星与《八宅明镜》卷一坎宅图对照
  //
  // 九宫格方位布局 (SVG坐标: +x=东, +y=南, -y=北)
  // 行0(北侧): [西北·乾] [北·坎] [东北·艮]
  // 行1(中):   [西·兑]   [中宫]  [东·震]
  // 行2(南侧): [西南·坤] [南·离] [东南·巽]
  // ================================================================

  // 九宫格 9 格信息 [方位码, 中文名, 后天八卦trigram(null=中宫)]
  var BZ_GRID9 = [
    ['NW', '西北', '乾'], ['N', '北', '坎'], ['NE', '东北', '艮'],
    ['W',  '西',   '兑'], ['C', '中', null], ['E',  '东',   '震'],
    ['SW', '西南', '坤'], ['S', '南', '离'], ['SE', '东南', '巽'],
  ];

  // 八宅游星 → 叠色 (rgba)
  // 吉星: 青金色系; 凶星: 暗红色系  (参考 design-target.md §02)
  var BZ_GRID_COL = {
    '生气': 'rgba(76,180,76,.38)',    // 吉·贪狼木
    '天医': 'rgba(64,168,160,.36)',   // 吉·巨门土
    '延年': 'rgba(200,168,64,.40)',   // 吉·武曲金
    '伏位': 'rgba(100,140,200,.30)',  // 吉(次)·辅弼木
    '五鬼': 'rgba(160,40,40,.44)',    // 凶·廉贞火
    '六煞': 'rgba(190,90,40,.40)',    // 凶·文曲水
    '绝命': 'rgba(80,30,80,.46)',     // 凶·破军金
    '祸害': 'rgba(150,100,30,.40)',   // 凶·禄存土
  };

  // showBazhai(baseTrigram):
  //   baseTrigram = 八卦名 ('坎'/'震'/…) — 可为命卦(mingGua)或宅卦(trigramAt(facingDeg))
  //   null = 仅方位标注，无吉凶色
  FloorplanOverlay.prototype.showBazhai = function (baseTrigram) {
    this._bzBase      = (typeof baseTrigram === 'string' && baseTrigram) ? baseTrigram : null;
    this._xkChart     = null;
    this._xkYun       = null;
    this._overlayMode = this._bzBase ? 'bz' : null;
    this._render();
  };

  FloorplanOverlay.prototype.hideBazhai = function () {
    this._bzBase      = null;
    this._overlayMode = null;
    this._render();
  };

  // ================================================================
  // v2-P3: 室内层 — 玄空飞星九宫格叠色
  // 出处: 清末沈竹礽《沈氏玄空学》（后人整理/增广）
  // 三元龙阴阳顺逆已在 core.js xkIsAsc 按 CODEX-REVIEW.md 必修1 修正
  // 受气元运: chart.yun 由调用方传入（宅盘用受气年，CODEX-REVIEW.md 必修2）
  // 数值算例（九运·子山午向·三元龙修正后）：
  //   向首=午(S)=四正=阳→顺飞，向星入中=4：
  //   路径C→NW→W→NE→S→N→SW→E→SE：C=4,NW=5,W=6,NE=7,S=8,N=9,SW=1,E=2,SE=3
  //   山盘(mAsc=!fAsc=逆飞，sStar=5 in N)：
  //   路径C→SE→E→SW→N→S→NE→W→NW：C=5,SE=4,E=3,SW=2,N=1,S=9,NE=8,W=7,NW=6
  //   格局：mountain[S]=9=yun,facing[N]=9=yun → 上山下水（山旺跑向方·水旺跑坐方）
  //   (待 Codex M2 复核：与上述 v1 旧盘对比分析)
  // ================================================================

  // 方位元数据（与 BZ_GRID9 布局相同: NW/N/NE / W/C/E / SW/S/SE）
  var XK_GRID9_META = [
    ['NW','乾·西北'], ['N','坎·北'],   ['NE','艮·东北'],
    ['W', '兑·西'],   ['C','中宫'],    ['E', '震·东'],
    ['SW','坤·西南'], ['S','离·南'],   ['SE','巽·东南'],
  ];
  // 旺衰颜色（文字色）
  var XK_VIGOR_TEXT = {
    '当旺':'#c8a84b', '生气':'#5ab85a', '退气':'#5a9ab8',
    '五黄煞':'#d04040', '死气':'#7a7060',
  };
  // 旺衰背景色（半透明填充）
  var XK_VIGOR_BG = {
    '当旺':'rgba(200,168,64,.28)', '生气':'rgba(64,180,100,.22)',
    '退气':'rgba(64,120,180,.18)', '五黄煞':'rgba(200,50,50,.26)',
    '死气':'rgba(80,70,60,.12)',
  };
  // v2-P20: 三元配属 + 卦名（确定性硬编表，锚点1864甲子年·每运20年·三元180年一循环）
  // 出处: 清·沈竹礽《沈氏玄空学》约1891年
  var XK_YUAN_FP = {
    1:'上元',2:'上元',3:'上元', 4:'中元',5:'中元',6:'中元', 7:'下元',8:'下元',9:'下元'
  };
  var XK_GUANAME_FP = {
    1:'坎水',2:'坤土',3:'震木', 4:'巽木',5:'廉贞',6:'乾金', 7:'兑金',8:'艮土',9:'离火'
  };

  // v2-P5: 户型画布标记颜色 + 汉字标签
  var FP_MK_COL = { bed: '#c8743a', door: '#3a74c8', stove: '#d03434', window: '#2aa870' };
  var FP_MK_CH  = { bed: '床',      door: '门',      stove: '灶',       window: '窗'     };

  FloorplanOverlay.prototype.showXuanKong = function (chart, yun) {
    this._xkChart     = chart || null;
    this._xkYun       = yun   || null;
    this._bzBase      = null; // 与八宅互斥
    this._overlayMode = (chart && yun) ? 'xk' : null;
    this._render();
  };

  FloorplanOverlay.prototype.hideXuanKong = function () {
    this._xkChart     = null;
    this._xkYun       = null;
    this._overlayMode = null;
    this._render();
  };

  // _buildBazhaiGrid: 生成九宫格 SVG 字符串，叠在 _render() 的 inner 末尾
  // b: { w, h } floor plan 包围盒 (mm)
  // pxmm: pixels per mm（用于动态字号）
  // v2-P19: 三行布局——方位 + 五行（彩色小字）+ 游星
  // 五行配属出处：《周易·说卦传》后天八卦五行，由 DaoCore.TRIGRAMS[tri].el 读取；
  //              中宫属土（五方五行·中央土，《淮南子·天文训》）；数值由引擎算，不硬编
  FloorplanOverlay.prototype._buildBazhaiGrid = function (b, pxmm) {
    var C   = window.DaoCore;
    var base = this._bzBase;
    var cw   = b.w / 3;
    var ch   = b.h / 3;
    // 字号: 目标约22px on-screen; 不低于 SVG 150mm (避免放大后过小)
    var fs   = Math.max(150, Math.min(480, 22 / pxmm));
    var fs2  = fs * 0.78;  // 游星字号
    var fsEl = fs * 0.65;  // 五行字号（较小）
    // 格线宽: 目标约2px; 不低于 20mm
    var sw   = Math.max(20, 26 / pxmm);
    var out  = '';

    BZ_GRID9.forEach(function (cell, idx) {
      var dirZh = cell[1];
      var tri   = cell[2];   // null = 中宫
      var star, colFill, lucky;

      if (!tri) {
        // 中宫: 惯例用伏位色（无方向，属太极中心）
        star = '伏位'; lucky = true;
        colFill = BZ_GRID_COL['伏位'];
      } else if (C && C.bazhaiStar && base) {
        star    = C.bazhaiStar(base, tri);
        colFill = BZ_GRID_COL[star] || 'rgba(120,100,60,.22)';
        lucky   = !!(C.BAZHAI_STARS && C.BAZHAI_STARS[star] && C.BAZHAI_STARS[star][1]);
      } else {
        star = null; colFill = 'rgba(120,100,60,.18)'; lucky = false;
      }

      // 五行: 从 DaoCore.TRIGRAMS 读取（已导出）；中宫固定属土
      var elName = (!tri) ? '土'
                 : (C && C.TRIGRAMS && C.TRIGRAMS[tri]) ? C.TRIGRAMS[tri].el
                 : null;
      // 五行颜色（EL_HEX，来自 core.js: 木#45a66b/火#d94c33/土#d9a821/金#d8c47a/水#5489cc）
      var elCol  = (elName && C && C.EL_HEX) ? (C.EL_HEX[elName] || '#c8a84b') : '#c8a84b';

      var col_i = idx % 3;
      var row_i = Math.floor(idx / 3);
      var rx    = col_i * cw;
      var ry    = row_i * ch;
      var cxc   = rx + cw / 2;
      var cyc   = ry + ch / 2;

      // 色块 (半透明叠在房间上方)
      out += '<rect x="' + rx.toFixed(1) + '" y="' + ry.toFixed(1)
        + '" width="' + cw.toFixed(1) + '" height="' + ch.toFixed(1)
        + '" fill="' + colFill
        + '" stroke="rgba(180,140,40,.45)" stroke-width="' + sw.toFixed(1) + '"/>';

      // 三行布局（有游星）/ 两行布局（无游星）
      var textCol = star ? (lucky ? '#0a3f0a' : '#570a0a') : '#4a3808';
      var hasStar = !!star;

      // 方位文字（第1行）
      var lyDir = hasStar ? (cyc - fs * 0.82) : (cyc - fs * 0.38);
      out += '<text x="' + cxc.toFixed(1) + '" y="' + lyDir.toFixed(1)
        + '" text-anchor="middle" dominant-baseline="middle"'
        + ' fill="' + textCol + '" font-family="serif"'
        + ' font-size="' + fs.toFixed(1) + '" font-weight="bold">'
        + dirZh + '</text>';

      // 五行文字（第2行，彩色）
      if (elName) {
        var lyEl = hasStar ? (cyc + fs * 0.08) : (cyc + fs * 0.52);
        out += '<text x="' + cxc.toFixed(1) + '" y="' + lyEl.toFixed(1)
          + '" text-anchor="middle" dominant-baseline="middle"'
          + ' fill="' + elCol + '" font-family="serif"'
          + ' font-size="' + fsEl.toFixed(1) + '">'
          + elName + '</text>';
      }

      // 游星（第3行）
      if (hasStar) {
        var lyStar = (cyc + fs * 0.95).toFixed(1);
        out += '<text x="' + cxc.toFixed(1) + '" y="' + lyStar
          + '" text-anchor="middle" dominant-baseline="middle"'
          + ' fill="' + textCol + '" font-family="serif"'
          + ' font-size="' + fs2.toFixed(1) + '">'
          + star + '</text>';
      }
    });

    return out;
  };

  // ─── _buildXuanKongGrid: 玄空飞星九宫格 SVG（v2-P3）────────────────────────
  // 九宫格方位布局（从北往南: NW/N/NE·W/C/E·SW/S/SE）
  // 每格显示: 方位名 / ▲山星(旺衰色) ▼向星(旺衰色) / 运星
  // 向首格金边，坐方格蓝边; 颜色 = 向星旺衰（财向·水向是客厅/门向主导气场）
  FloorplanOverlay.prototype._buildXuanKongGrid = function (b, pxmm) {
    var C     = window.DaoCore;
    var chart = this._xkChart;
    var yun   = this._xkYun;
    if (!C || !chart || !yun) return '';

    var cw  = b.w / 3,  ch  = b.h / 3;
    var fs  = Math.max(120, Math.min(350, 16 / pxmm));   // 方位字号
    var fs2 = Math.max(110, Math.min(380, 20 / pxmm));   // 山/向星数字号（稍大）
    var fs3 = Math.max(90,  Math.min(280, 11 / pxmm));   // 运星字号
    var sw  = Math.max(18, 24 / pxmm);                   // 格线宽
    var out = '';

    // v2-P20 ① SVG defs: 暖金光晕 filter（当令星发光，design-target.md §01「当令星暖金发光」）
    // 机制: feGaussianBlur(alpha通道) + feFlood(金色) + feComposite → 金色光晕; feMerge 叠原图
    // stdDeviation 单位: SVG mm（随 viewBox 缩放），ch*0.05≈5%格高；同输入恒同输出（无随机）
    var glowSD = Math.max(60, ch * 0.05).toFixed(0);
    out += '<defs><filter id="fp-xk-glow" x="-30%" y="-30%" width="160%" height="160%">'
      + '<feGaussianBlur in="SourceAlpha" stdDeviation="' + glowSD + '" result="blur"/>'
      + '<feFlood flood-color="#c8a84b" flood-opacity="0.60" result="col"/>'
      + '<feComposite in="col" in2="blur" operator="in" result="glow"/>'
      + '<feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>'
      + '</filter></defs>';

    // v2-P20 ② 元运信息条（design-target.md §01「下元·九运·离火·2024–2043」）
    // 确定性: 锚点1864甲子年·每运20年; 出处: 清·沈竹礽《沈氏玄空学》约1891年
    var yunStart = 1864 + (yun - 1) * 20;
    var yunEnd   = yunStart + 19;
    var headTxt  = (XK_YUAN_FP[yun]    || '') + '·第' + yun + '运·'
                 + (XK_GUANAME_FP[yun] || '') + '·' + yunStart + '–' + yunEnd;
    var hdrH   = Math.max(70, ch * 0.09);
    var hdrY   = Math.max(15, b.h * 0.025);
    var fsHdr  = Math.max(55, Math.min(180, 11 / pxmm));
    out += '<rect x="' + (b.w * 0.15).toFixed(1) + '" y="' + hdrY.toFixed(1)
      + '" width="' + (b.w * 0.70).toFixed(1) + '" height="' + hdrH.toFixed(1)
      + '" rx="' + (hdrH * 0.28).toFixed(1) + '" fill="rgba(10,6,1,.78)"/>';
    out += '<text x="' + (b.w / 2).toFixed(1) + '" y="' + (hdrY + hdrH / 2).toFixed(1)
      + '" text-anchor="middle" dominant-baseline="middle"'
      + ' fill="#c8a84b" font-family="serif" font-size="' + fsHdr.toFixed(1) + '">'
      + headTxt + '</text>';

    XK_GRID9_META.forEach(function (cell, idx) {
      var dir   = cell[0], dirZh = cell[1];
      var col_i = idx % 3, row_i = Math.floor(idx / 3);
      var rx = col_i * cw, ry = row_i * ch;
      var cxc = rx + cw / 2, cyc = ry + ch / 2;
      var isC = dir === 'C';

      var mStar = isC ? (chart.mountain && chart.mountain[dir]) : chart.mountain[dir];
      var fStar = isC ? (chart.facing   && chart.facing[dir])   : chart.facing[dir];
      var pStar = chart.period ? chart.period[dir] : null;
      var isFacing  = dir === chart.facingDir;
      var isSitting = dir === chart.sittingDir;

      // 背景：以向星旺衰定色
      var fVigor = (fStar && C.xkStarVigor) ? C.xkStarVigor(fStar, yun) : '死气';
      // v2-P20: mVigor 提前计算，用于「当旺格」光晕判断（原在 mStar 块内，现提升）
      var mVigor = (mStar && C.xkStarVigor) ? C.xkStarVigor(mStar, yun) : '死气';
      var bgFill = XK_VIGOR_BG[fVigor] || 'rgba(80,70,60,.12)';
      // v2-P20: 向星或山星任一当旺→触发金晕（design-target.md §01「当令星暖金发光」）
      var isWang = fVigor === '当旺' || mVigor === '当旺';

      // 边框：向首金色、坐方蓝色、其余暗金
      var strokeCol = isFacing  ? 'rgba(200,168,64,.90)'
                    : isSitting ? 'rgba(90,154,184,.90)'
                    : 'rgba(160,130,50,.38)';
      var strokeW = (isFacing || isSitting) ? (sw * 1.5).toFixed(1) : sw.toFixed(1);

      out += '<rect x="' + rx.toFixed(1) + '" y="' + ry.toFixed(1)
        + '" width="' + cw.toFixed(1) + '" height="' + ch.toFixed(1)
        + '" fill="' + bgFill + '" stroke="' + strokeCol
        + '" stroke-width="' + strokeW + '"'
        + (isWang ? ' filter="url(#fp-xk-glow)"' : '') + '/>';

      // 方位名（上 1/4 区）
      var lyDir = (cyc - ch * 0.30).toFixed(1);
      out += '<text x="' + cxc.toFixed(1) + '" y="' + lyDir
        + '" text-anchor="middle" dominant-baseline="middle"'
        + ' fill="#b8960a" font-family="serif" font-size="' + fs.toFixed(1) + '">'
        + dirZh + (isFacing ? '→' : isSitting ? '←' : '') + '</text>';

      // 山星▲ 向星▼（中区，并排）
      var lySt = (cyc + ch * 0.02).toFixed(1);
      if (mStar) {
        // mVigor 已在上方提前计算（v2-P20 重构）
        var mCol   = XK_VIGOR_TEXT[mVigor] || '#888';
        out += '<text x="' + (cxc - cw * 0.14).toFixed(1) + '" y="' + lySt
          + '" text-anchor="middle" dominant-baseline="middle"'
          + ' fill="' + mCol + '" font-family="serif"'
          + ' font-weight="bold" font-size="' + fs2.toFixed(1) + '">▲' + mStar + '</text>';
      }
      if (fStar) {
        var fCol = XK_VIGOR_TEXT[fVigor] || '#888';
        out += '<text x="' + (cxc + cw * 0.14).toFixed(1) + '" y="' + lySt
          + '" text-anchor="middle" dominant-baseline="middle"'
          + ' fill="' + fCol + '" font-family="serif"'
          + ' font-weight="bold" font-size="' + fs2.toFixed(1) + '">▼' + fStar + '</text>';
      }

      // 运星（下 1/4 区，暗色）
      if (pStar) {
        var lyP = (cyc + ch * 0.34).toFixed(1);
        out += '<text x="' + cxc.toFixed(1) + '" y="' + lyP
          + '" text-anchor="middle" dominant-baseline="middle"'
          + ' fill="#6a5a20" font-family="serif" font-size="' + fs3.toFixed(1) + '">'
          + pStar + '运</text>';
      }
    });

    return out;
  };

  // ================================================================
  // v2-P11: 形煞向格叠色
  //
  // 原理:
  //   sha 结果 lx/ly = 穴位为原点的局部米坐标 (x=东, y=北)
  //   shaBearing(WGS-84) = atan2(lx, ly)×180/π  [正北=0°·顺时针]
  //   svgAngle = (shaBearing - _rot + 360) % 360  (_rot=SVG顶方向/WGS-84)
  //   svgAngle → 8方向码 → 9格索引 → 叠色单元格
  //
  // 数值验证:
  //   lx=50, ly=0  (正东) → shaBear=90°, _rot=0 → svgAngle=90° → E格(idx=5) ✓
  //   lx=0,  ly=50 (正北) → shaBear=0°,  _rot=0 → svgAngle=0°  → N格(idx=1) ✓
  //   lx=-50,ly=-50(西南) → shaBear=225°,_rot=0 → svgAngle=225°→ SW格(idx=6) ✓
  //   _rot=90°(平面朝东),lx=50,ly=0 → shaBear=90°,svgAngle=(90-90)=0° → N格=地理东方 ✓
  //
  // 出处: F7-F11 形煞判据 (明·王君荣《阳宅十书》卷一·论路; 部分现代命名⚠)
  // 出处: GEO-ACCURACY.md §③ cos(lat) 已在 lx/ly 计算阶段由 xy2ll 修正, 本层只用 atan2 定向
  // ================================================================

  // showShaOverlay: 传入 detectAllXingsha 的结果数组，触发向格叠色
  FloorplanOverlay.prototype.showShaOverlay = function (shaItems) {
    this._shaItems = Array.isArray(shaItems) ? shaItems : [];
    this._render();
  };

  FloorplanOverlay.prototype.clearShaOverlay = function () {
    this._shaItems = [];
    this._render();
  };

  // _buildShaGrid: 生成形煞向格 SVG 字符串 (叠在 BZ/XK 之上)
  // b: { w, h } floor plan 包围盒 (mm)   pxmm: pixels per mm
  FloorplanOverlay.prototype._buildShaGrid = function (b, pxmm) {
    var items = this._shaItems;
    if (!items || !items.length) return '';

    var cw  = b.w / 3, ch = b.h / 3;
    var sw  = Math.max(40, 55 / pxmm);                        // 警示格线宽
    var fs  = Math.max(100, Math.min(300, 13 / pxmm));        // 主字号
    var fs2 = Math.max(80,  Math.min(240, 10 / pxmm));        // 副字号
    var rot = this._rot || 0;  // SVG 顶方向 WGS-84°

    // 8方位角 → 9格方向码（SVG帧：0=北/上，顺时针增大）
    function svgAngle2Dir(a) {
      var n = ((a % 360) + 360) % 360;
      if (n < 22.5 || n >= 337.5) return 'N';
      if (n < 67.5)  return 'NE';
      if (n < 112.5) return 'E';
      if (n < 157.5) return 'SE';
      if (n < 202.5) return 'S';
      if (n < 247.5) return 'SW';
      if (n < 292.5) return 'W';
      return 'NW';
    }

    // 方向码 → 9格索引（同 BZ_GRID9 / XK_GRID9_META 排列: NW=0,N=1,NE=2,W=3,C=4,E=5,SW=6,S=7,SE=8）
    var DIR_IDX = { NW: 0, N: 1, NE: 2, W: 3, C: 4, E: 5, SW: 6, S: 7, SE: 8 };

    // 聚合 sha 按 SVG 方向格
    var byDir = {};
    items.forEach(function (r) {
      if (r.lx === undefined || r.ly === undefined) return;
      // WGS-84 方位角：x=东(East), y=北(North) → bearing = atan2(East, North)
      var shaBear = (Math.atan2(r.lx, r.ly) * 180 / Math.PI + 360) % 360;
      var svgAng  = (shaBear - rot + 360) % 360;
      var dir     = svgAngle2Dir(svgAng);
      if (!byDir[dir]) byDir[dir] = [];
      byDir[dir].push(r);
    });

    var dirKeys = Object.keys(byDir);
    if (!dirKeys.length) return '';

    var out = '';
    dirKeys.forEach(function (dir) {
      var idx = DIR_IDX[dir];
      if (idx === undefined || idx === 4) return;  // 跳过中宫

      var col_i = idx % 3, row_i = Math.floor(idx / 3);
      var rx = col_i * cw, ry = row_i * ch;
      var cxc = rx + cw / 2, cyc = ry + ch / 2;

      var dirShas   = byDir[dir];
      var hasStrong = dirShas.some(function (s) { return s.severity === '强' || s.severity === '凶'; });
      var fillCol   = hasStrong ? 'rgba(200,40,40,.42)' : 'rgba(200,110,40,.36)';
      var strokeCol = hasStrong ? 'rgba(220,30,30,.88)' : 'rgba(200,100,30,.78)';
      var txtCol    = 'rgba(255,240,230,.96)';

      // 警示色块（半透明红/橙，叠在 BZ/XK 之上仍可分辨）
      out += '<rect x="' + rx.toFixed(1) + '" y="' + ry.toFixed(1)
        + '" width="' + cw.toFixed(1) + '" height="' + ch.toFixed(1)
        + '" fill="' + fillCol
        + '" stroke="' + strokeCol + '" stroke-width="' + sw.toFixed(1) + '"/>';

      // 形煞类型（最多2项，缩写，上部）
      // 古典形煞(F7/F9/F10/F11): ⚡; 现代命名(F8天斩): ⚠
      var typeStr = dirShas.slice(0, 2).map(function (s) {
        var short = s.type.replace(/煞$/, '').substring(0, 3);
        return (s.modern ? '⚠' : '⚡') + short;
      }).join(' ');
      out += '<text x="' + cxc.toFixed(1) + '" y="' + (cyc - fs * 0.32).toFixed(1)
        + '" text-anchor="middle" dominant-baseline="middle"'
        + ' fill="' + txtCol + '" font-family="serif"'
        + ' font-size="' + fs.toFixed(1) + '" font-weight="bold">'
        + typeStr + '</text>';

      // 强度标注（下部）
      var sevStr = hasStrong ? '强煞' : '弱煞';
      out += '<text x="' + cxc.toFixed(1) + '" y="' + (cyc + fs * 0.75).toFixed(1)
        + '" text-anchor="middle" dominant-baseline="middle"'
        + ' fill="' + txtCol + '" font-family="serif"'
        + ' font-size="' + fs2.toFixed(1) + '">' + sevStr + '</text>';
    });

    return out;
  };

  // ================================================================
  // v2-P12: 砂水四神向格叠色
  //
  // 来源: sandwater.js judgeSandTerrain / judgeSandUrban 的 items 数组
  //   每项: { label: '青龙'|'白虎'|'龙虎'|'玄武'|'朱雀', ok: true|false|null, text: string }
  //
  // 方位映射（F-v2-P12-01）：
  //   青龙 → geoBear = 90°   (绝对东方，《葬书》左青龙)
  //   白虎 → geoBear = 270°  (绝对西方，《葬书》右白虎)
  //   龙虎 → geoBear = 90° 及 270°（均衡，两格均着色）
  //   玄武 → geoBear = (doorBear + 180) % 360（坐山/后方）
  //   朱雀 → geoBear = doorBear（向首/前方）
  //   svgAngle = (geoBear - _rot + 360) % 360 → svgAngle2Dir → 9格方向码
  //
  // 出处: 晋·郭璞《葬书》四象护穴原则（青龙/白虎/玄武/朱雀）
  //       城市楼群替代地形为现代阳宅实践（参见何大海《现代阳宅风水》，待核实）
  //
  // 颜色规范（区别于形煞红/橙，以防视觉混淆）：
  //   ok=true  → 绿色  rgba(40,160,90,.40)  — 四神得位
  //   ok=false → 琥珀  rgba(200,140,30,.40) — 四神不利（非红，区别于形煞）
  //   ok=null  → 蓝灰  rgba(60,100,180,.30) — 龙虎均衡/中性
  //
  // 数值验证（F-v2-P12-01）：
  //   doorBear=180°(向南), _rot=0°:
  //     朱雀 geoBear=180° → svgAngle=(180-0)=180° → S格(idx=7) ✓（正面/南）
  //     玄武 geoBear=0°   → svgAngle=(0-0)=0°     → N格(idx=1) ✓（后方/北）
  //     青龙 geoBear=90°  → svgAngle=90°           → E格(idx=5) ✓
  //     白虎 geoBear=270° → svgAngle=270°           → W格(idx=3) ✓
  //   doorBear=90°(向东), _rot=90°(平面朝东):
  //     朱雀 svgAngle=(90-90)=0° → N格=SVG顶=向方 ✓
  //     玄武 svgAngle=(270-90)=180° → S格=SVG底=后方 ✓
  // ================================================================

  FloorplanOverlay.prototype.showSandwaterOverlay = function (swItems, doorBear) {
    this._swItems    = Array.isArray(swItems) ? swItems : [];
    this._swDoorBear = (typeof doorBear === 'number' && isFinite(doorBear)) ? doorBear : 0;
    this._render();
  };

  FloorplanOverlay.prototype.clearSandwaterOverlay = function () {
    this._swItems    = null;
    this._swDoorBear = null;
    this._render();
  };

  // _buildSwGrid: 生成四神向格 SVG 字符串（叠在 BZ/XK/SHA 之上）
  FloorplanOverlay.prototype._buildSwGrid = function (b, pxmm) {
    var items    = this._swItems;
    var doorBear = this._swDoorBear || 0;
    if (!items || !items.length) return '';

    var rot = this._rot || 0;   // SVG 顶方向 WGS-84°（同 F-v2-P11）
    var cw  = b.w / 3, ch = b.h / 3;
    var sw  = Math.max(30, 45 / pxmm);                       // 边框宽
    var fs  = Math.max(90, Math.min(280, 12 / pxmm));        // 主字号
    var fs2 = Math.max(70, Math.min(210, 9 / pxmm));         // 副字号

    // 同 _buildShaGrid 中的 svgAngle2Dir
    function svgAngle2Dir(a) {
      var n = ((a % 360) + 360) % 360;
      if (n < 22.5 || n >= 337.5) return 'N';
      if (n < 67.5)  return 'NE';
      if (n < 112.5) return 'E';
      if (n < 157.5) return 'SE';
      if (n < 202.5) return 'S';
      if (n < 247.5) return 'SW';
      if (n < 292.5) return 'W';
      return 'NW';
    }
    var DIR_IDX = { NW: 0, N: 1, NE: 2, W: 3, C: 4, E: 5, SW: 6, S: 7, SE: 8 };

    // label → 地理方位角列表（龙虎均衡时双格着色）
    function labelToBears(label) {
      if (label === '青龙') return [90];
      if (label === '白虎') return [270];
      if (label === '龙虎') return [90, 270];   // 均衡，龙虎两格均标
      if (label === '玄武') return [((doorBear + 180) % 360 + 360) % 360];
      if (label === '朱雀') return [(doorBear % 360 + 360) % 360];
      return [];
    }

    // 颜色方案（区别于形煞红/橙）
    function okColors(ok) {
      if (ok === true)  return { fill: 'rgba(40,160,90,.40)',   stroke: 'rgba(20,130,60,.82)',  txt: 'rgba(220,255,230,.96)' };
      if (ok === false) return { fill: 'rgba(200,140,30,.42)',  stroke: 'rgba(180,110,20,.84)', txt: 'rgba(255,245,210,.96)' };
      return              { fill: 'rgba(60,100,180,.30)',  stroke: 'rgba(40,80,160,.72)',  txt: 'rgba(210,220,255,.96)' };
    }

    // 聚合：每个方向格可能被多项数据（如龙虎均衡同时涂 E+W）着色
    var byDir = {};  // dir → { items: [...], ok: 合并ok }
    items.forEach(function (item) {
      var bears = labelToBears(item.label);
      bears.forEach(function (gb) {
        var svgAng = ((gb - rot) % 360 + 360) % 360;
        var dir    = svgAngle2Dir(svgAng);
        if (!byDir[dir]) byDir[dir] = [];
        byDir[dir].push(item);
      });
    });

    var dirKeys = Object.keys(byDir);
    if (!dirKeys.length) return '';

    var out = '';
    dirKeys.forEach(function (dir) {
      var idx = DIR_IDX[dir];
      if (idx === undefined || idx === 4) return;   // 跳过中宫

      var col_i = idx % 3, row_i = Math.floor(idx / 3);
      var rx = col_i * cw, ry = row_i * ch;
      var cxc = rx + cw / 2, cyc = ry + ch / 2;

      // 同一格可能有多项（如龙虎两格各一项）；以第一项为主
      var dirItems = byDir[dir];
      var mainItem = dirItems[0];
      var col = okColors(mainItem.ok);

      // 半透明色块（细边框，区别于形煞的粗红框）
      out += '<rect x="' + rx.toFixed(1) + '" y="' + ry.toFixed(1)
        + '" width="' + cw.toFixed(1) + '" height="' + ch.toFixed(1)
        + '" fill="' + col.fill + '" stroke="' + col.stroke
        + '" stroke-width="' + sw.toFixed(1) + '" stroke-dasharray="'
        + (sw * 3.5).toFixed(0) + ',' + (sw * 1.8).toFixed(0) + '"/>';

      // 四神名称（上部，主字号）
      var okMark = mainItem.ok === true ? '✦' : mainItem.ok === false ? '✕' : '≈';
      out += '<text x="' + cxc.toFixed(1) + '" y="' + (cyc - fs * 0.30).toFixed(1)
        + '" text-anchor="middle" dominant-baseline="middle"'
        + ' fill="' + col.txt + '" font-family="serif"'
        + ' font-size="' + fs.toFixed(1) + '" font-weight="bold">'
        + mainItem.label + okMark + '</text>';

      // 简述（下部，副字号；截断到 8 字）
      var shortText = (mainItem.text || '').substring(0, 8);
      if (shortText) {
        out += '<text x="' + cxc.toFixed(1) + '" y="' + (cyc + fs * 0.72).toFixed(1)
          + '" text-anchor="middle" dominant-baseline="middle"'
          + ' fill="' + col.txt + '" font-family="serif"'
          + ' font-size="' + fs2.toFixed(1) + '">' + shortText + '</text>';
      }
    });

    return out;
  };

  // ================================================================
  // v2-P47: 年月三盘叠合在户型画布叠色
  //
  // 来源: xkTriplateOverview(chart, year, monthIdx) 返回值
  //   - tripleXiongDirs:  宅五黄 + 年凶(2/5) + 月凶(2/5) → 三重叠凶（最重·深紫红）
  //   - doubleXiongDirs:  年月双凶（非三重）              → 年月叠凶（次重·朱砂红）
  //   - zhaiWuhuangDirs:  宅五黄（非年月双凶）            → 宅盘凶位（琥珀橙）
  //   - tripleWangDirs:   三盘共旺（极罕见）               → 三重旺（暖金·最佳）
  //   - doubleJiDirs:     年月双吉（非三重旺）             → 年月吉位（青蓝）
  //   - zhaiWangDirs:     宅当运旺（非年月双吉）           → 宅盘旺位（淡蓝绿）
  //
  // 优先级（同格多标签时高优先级覆盖低优先级）：
  //   三重凶 > 年月双凶 > 宅五黄 > 三盘旺 > 年月双吉 > 宅旺
  //   因 P46 已证 tripleXiong⊆doubleXiong⊆zhaiWuhuang，需对低优先级集合过滤
  //
  // 方向转换（F-v2-P47-01 · WGS-84 dir → SVG 格位）：
  //   bear = DIR_BEAR[dir]（N=0°,NE=45°,...,NW=315°）
  //   svgAngle = (bear − _rot + 360) % 360  （_rot=SVG顶方向 WGS-84°）
  //   svgDir   = svgAngle2Dir(svgAngle)
  //   cellIdx  = DIR_IDX[svgDir]（NW=0,N=1,NE=2,W=3,C=4,E=5,SW=6,S=7,SE=8）
  //
  // 数值验证（F-v2-P47-01）：
  //   _rot=0（顶朝北）, dir='NW'  → bear=315° → svgAngle=315° → NW(idx=0) ✓
  //   _rot=90（顶朝东）, dir='N'  → bear=0°   → svgAngle=270° → W(idx=3)  ✓
  //   _rot=180（顶朝南）, dir='N' → bear=0°   → svgAngle=180° → S(idx=7)  ✓
  //
  // 出处：清末沈竹礽《沈氏玄空学》（后人整理/增广）年紫白/月紫白论；
  //       宅五黄以山向飞星盘（受气元运）为准，遵 CODEX-REVIEW.md 必修2
  //       铁律①：叠色层为纯函数渲染，同输入恒同输出 ✅
  //       铁律②③：标签描述「叠合事实」（三重凶=三盘均飞凶星），不含「必凶/必旺」断言 ✅
  //       cos(lat)：本层不含地理坐标计算，_rot 已由 lock() 在 cos(lat) 校正后写入 ✅
  // ================================================================

  FloorplanOverlay.prototype.showNianMonthOv = function (ov) {
    this._nianMonthOv   = ov || null;
    this._showNianMonth = !!ov;
    this._render();
  };

  FloorplanOverlay.prototype.hideNianMonthOv = function () {
    this._showNianMonth = false;
    this._render();
  };

  // _buildNianMonthGrid: 年月三盘叠合向格 SVG 字符串（叠在 BZ/XK/SHA/SW 之上）
  // b: { w, h } floor plan 包围盒 (mm)   pxmm: pixels per mm
  FloorplanOverlay.prototype._buildNianMonthGrid = function (b, pxmm) {
    var ov = this._nianMonthOv;
    if (!ov) return '';

    var cw = b.w / 3, ch = b.h / 3;
    var sw = Math.max(28, 38 / pxmm);
    var fs = Math.max(90, Math.min(260, 11 / pxmm));

    // WGS-84 方向码 → 正北顺时针方位角（度）
    var DIR_BEAR = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

    // SVG 帧方位角（0=SVG顶·顺时针）→ 8方向码
    function svgAngle2Dir(a) {
      var n = ((a % 360) + 360) % 360;
      if (n < 22.5 || n >= 337.5) return 'N';
      if (n < 67.5)  return 'NE';
      if (n < 112.5) return 'E';
      if (n < 157.5) return 'SE';
      if (n < 202.5) return 'S';
      if (n < 247.5) return 'SW';
      if (n < 292.5) return 'W';
      return 'NW';
    }

    // 方向码 → 9格索引（NW=0,N=1,NE=2,W=3,C=4,E=5,SW=6,S=7,SE=8）
    var DIR_IDX = { NW: 0, N: 1, NE: 2, W: 3, C: 4, E: 5, SW: 6, S: 7, SE: 8 };
    var rot = this._rot || 0;  // SVG 顶方向（WGS-84°）

    // cellMap: SVG格位索引 → { fill, stroke, txt, label }
    // addCells 只写入尚未被高优先级占据的格子（先入为主）
    var cellMap = {};
    function addCells(dirs, fill, stroke, txt, label) {
      dirs.forEach(function (d) {
        var bear = DIR_BEAR[d];
        if (bear === undefined) return;
        var svgAng = ((bear - rot) % 360 + 360) % 360;
        var svgDir = svgAngle2Dir(svgAng);
        var idx    = DIR_IDX[svgDir];
        if (idx === undefined || idx === 4) return;  // 跳过中宫 C
        if (!cellMap[idx]) {
          cellMap[idx] = { fill: fill, stroke: stroke, txt: txt, label: label };
        }
      });
    }

    // ── 危方（由重到轻，高优先级先注册） ──────────────────────────────────────
    // 1. 三重凶：宅五黄 + 年凶(2/5) + 月凶(2/5)  → 深紫红
    addCells(ov.tripleXiongDirs || [],
      'rgba(150,10,90,.44)', 'rgba(180,10,110,.90)', 'rgba(255,220,240,.96)', '三重凶');

    // 2. 年月双凶（去掉已标三重凶的方向） → 朱砂红
    var dblX = (ov.doubleXiongDirs || []).filter(function (d) {
      return (ov.tripleXiongDirs || []).indexOf(d) === -1;
    });
    addCells(dblX,
      'rgba(160,50,20,.36)', 'rgba(190,60,20,.86)', 'rgba(255,235,215,.96)', '年月双凶');

    // 3. 宅五黄（去掉已标年月双凶/三重凶的方向） → 琥珀橙
    var zhaiWuh = (ov.zhaiWuhuangDirs || []).filter(function (d) {
      return (ov.doubleXiongDirs || []).indexOf(d) === -1;
    });
    addCells(zhaiWuh,
      'rgba(160,90,10,.25)', 'rgba(180,110,10,.70)', 'rgba(255,245,210,.96)', '宅五黄');

    // ── 旺方（由强到弱） ──────────────────────────────────────────────────────
    // 4. 三盘共旺（极罕见） → 暖金
    addCells(ov.tripleWangDirs || [],
      'rgba(200,160,10,.44)', 'rgba(220,180,20,.90)', 'rgba(40,30,0,.96)', '三盘旺');

    // 5. 年月双吉（去掉已标三盘旺） → 青蓝
    var dblJ = (ov.doubleJiDirs || []).filter(function (d) {
      return (ov.tripleWangDirs || []).indexOf(d) === -1;
    });
    addCells(dblJ,
      'rgba(10,140,160,.30)', 'rgba(10,160,180,.80)', 'rgba(210,250,255,.96)', '年月双吉');

    // 6. 宅旺方（去掉已标年月双吉/三盘旺） → 淡蓝绿
    var zhaiWang = (ov.zhaiWangDirs || []).filter(function (d) {
      return (ov.doubleJiDirs || []).indexOf(d) === -1;
    });
    addCells(zhaiWang,
      'rgba(10,110,130,.18)', 'rgba(10,130,150,.65)', 'rgba(210,250,255,.96)', '宅旺');

    var idxList = Object.keys(cellMap);
    if (!idxList.length) return '';

    var out = '';
    idxList.forEach(function (idxStr) {
      var idx   = parseInt(idxStr, 10);
      var col_i = idx % 3, row_i = Math.floor(idx / 3);
      var rx = col_i * cw, ry = row_i * ch;
      var cxc = rx + cw / 2, cyc = ry + ch / 2;
      var c   = cellMap[idx];

      // 虚线边框半透明色块（区别于 BZ/XK 的实线格线）
      out += '<rect x="' + rx.toFixed(1) + '" y="' + ry.toFixed(1)
        + '" width="' + cw.toFixed(1) + '" height="' + ch.toFixed(1)
        + '" fill="' + c.fill + '" stroke="' + c.stroke
        + '" stroke-width="' + sw.toFixed(1) + '" stroke-dasharray="'
        + (sw * 4).toFixed(0) + ',' + (sw * 2).toFixed(0) + '"/>';

      // 标签文字（叠合事实描述，不含断言）
      out += '<text x="' + cxc.toFixed(1) + '" y="' + cyc.toFixed(1)
        + '" text-anchor="middle" dominant-baseline="middle"'
        + ' fill="' + c.txt + '" font-family="serif"'
        + ' font-size="' + fs.toFixed(1) + '" font-weight="bold">'
        + c.label + '</text>';
    });

    return out;
  };

  // ================================================================
  // v2-P48: 流年凶方弧形叠层（太岁/三煞/岁破/年五黄）
  // CODEX-REVIEW.md 必修3：太岁/三煞用 24山15° 支位扇形，非45°八宫近似
  // 出处：《钦定协纪辨方书》卷三（清乾隆四年重修，何国宗、梅瑴成编纂）
  //
  // F-v2-P48-01 弧形扇区方位变换（确定性公式）：
  //   geoAngle: WGS-84 正北顺时针方位角（°）
  //   svgAngle = ((geoAngle - _rot) % 360 + 360) % 360
  //   SVG坐标: x = cx + R·sin(svgAngle_rad)   （+x 向右=东）
  //            y = cy - R·cos(svgAngle_rad)    （SVG +y 向下=南，故用负号）
  //
  // 数值算例（_rot=0°，正北朝上）：
  //   太岁午山180° → svgAngle=180° → (cx+R·sin180°, cy-R·cos180°) = (cx, cy+R) = SVG正下方(南) ✓
  //   三煞子山0°   → svgAngle=0°  → (cx+R·sin0°,   cy-R·cos0°)   = (cx, cy-R) = SVG正上方(北) ✓
  //   三煞丑山30°  → svgAngle=30° → (cx+R·0.5, cy-R·0.866) = SVG右上方（ENE） ✓
  //
  // 数值算例（_rot=90°，SVG顶边朝东）：
  //   太岁午山180° → svgAngle=(180-90)=90° → (cx+R·1, cy-R·0) = (cx+R, cy) = SVG正右方 ✓
  //   三煞子山0°   → svgAngle=(0-90+360)=270° → (cx+R·(-1), cy-R·0) = (cx-R, cy) = SVG正左方 ✓
  //
  // 铁律①确定性：同年份同_rot恒同输出，无随机 ✅
  // 铁律②诚实：出处已引；算例可独立复核；待核实已注（见 P48-C1）
  // 铁律③不断言：标签仅描述方位（太岁/三煞/岁破/年五黄），不写"必凶/必伤丁" ✅
  // ================================================================

  FloorplanOverlay.prototype.showLiuNian = function (year) {
    var C = window.DaoCore;
    if (!C || !C.lyTaiSuiDir || !C.lySanSha) return;
    var yr = (year && +year >= 1864 && +year <= 2100) ? +year : new Date().getFullYear();
    var ts       = C.lyTaiSuiDir(yr);
    var sansha   = C.lySanSha(yr);
    var nianPlate = C.lyNianPlate ? C.lyNianPlate(yr) : null;
    // 年五黄方位：年紫白盘中 star=5 所在方向（45°精度；与 xkChart 同格系）
    // 出处：《飞星赋》年星论（明清通行，待核实原句）；年星递减为玄空通行法则
    var DIR_BEAR_FP = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
    // v2-P53: 方向码→卦名·方位标注（45°精度·XK飞星宫位，非24山支位）
    // 出处：后天八卦配八方（《周易·说卦传》）；方位名据《八宅明镜》八卦配方通用
    var DIR_LABEL_FP = {
      N: '坎·北', NE: '艮·东北', E: '震·东', SE: '巽·东南',
      S: '离·南', SW: '坤·西南', W: '兑·西', NW: '乾·西北'
    };
    var wuhuangDeg   = null;
    var wuhuangDir   = null;
    var wuhuangLabel = null;
    if (nianPlate) {
      var dks = Object.keys(DIR_BEAR_FP);
      for (var di = 0; di < dks.length; di++) {
        if (nianPlate[dks[di]] === 5) {
          wuhuangDir   = dks[di];
          wuhuangDeg   = DIR_BEAR_FP[dks[di]];
          wuhuangLabel = DIR_LABEL_FP[dks[di]];
          break;
        }
      }
    }
    // 岁破地支名：太岁对宫，即 (zhi.idx+6)%12；出处：《钦定协纪辨方书》卷三·论岁破（对冲定义）
    var suipoName = (C.LY_BRANCHES && ts.zhi && ts.zhi.idx !== undefined)
      ? C.LY_BRANCHES[(ts.zhi.idx + 6) % 12] : '';
    this._lyData = { year: yr, ts: ts, sansha: sansha, wuhuangDeg: wuhuangDeg,
                     wuhuangDir: wuhuangDir, wuhuangLabel: wuhuangLabel, suipoName: suipoName };
    this._showLiuNian = true;
    this._render();
  };

  FloorplanOverlay.prototype.hideLiuNian = function () {
    this._showLiuNian = false;
    this._render();
  };

  // _buildLiuNianArcs: 生成流年凶方弧形 SVG 字符串
  // 环形扇区（外半径 Ro·内半径 Ri，留出中心区域避免遮挡房间标注）
  // 渲染顺序（底→顶）：年五黄(45°) → 三煞(3×15°) → 岁破(15°) → 太岁(15°)
  FloorplanOverlay.prototype._buildLiuNianArcs = function (b, pxmm) {
    var d = this._lyData;
    if (!d || !d.ts || !d.sansha) return '';

    var cx   = b.w / 2, cy = b.h / 2;
    var minD = Math.min(b.w, b.h);
    var Ro   = minD * 0.46;             // 外半径 (mm)
    var Ri   = minD * 0.13;             // 内半径 (mm)，保留中心区域
    var midR = (Ro + Ri) * 0.52;        // 标签中心半径
    var rot  = this._rot || 0;          // SVG 顶边 WGS-84 方位角
    var sw   = Math.max(18, 26 / pxmm);
    var fs   = Math.max(75, Math.min(230, 11 / pxmm));
    var out  = '';

    function f(v) { return v.toFixed(2); }

    // 环形扇区 SVG path（annular sector）
    // geoAngle: WGS-84°, halfDeg: 半扇角
    function sector(geoAngle, halfDeg, ro, ri) {
      var sa  = ((geoAngle - rot) % 360 + 360) % 360;
      var a1r = (sa - halfDeg) * Math.PI / 180;
      var a2r = (sa + halfDeg) * Math.PI / 180;
      var x1o = cx + ro * Math.sin(a1r), y1o = cy - ro * Math.cos(a1r);
      var x2o = cx + ro * Math.sin(a2r), y2o = cy - ro * Math.cos(a2r);
      var x1i = cx + ri * Math.sin(a1r), y1i = cy - ri * Math.cos(a1r);
      var x2i = cx + ri * Math.sin(a2r), y2i = cy - ri * Math.cos(a2r);
      var lg  = (halfDeg * 2 >= 180) ? 1 : 0;
      return 'M ' + f(x1o) + ' ' + f(y1o)
        + ' A ' + f(ro) + ' ' + f(ro) + ' 0 ' + lg + ' 1 ' + f(x2o) + ' ' + f(y2o)
        + ' L ' + f(x2i) + ' ' + f(y2i)
        + ' A ' + f(ri) + ' ' + f(ri) + ' 0 ' + lg + ' 0 ' + f(x1i) + ' ' + f(y1i)
        + ' Z';
    }

    // 标签位置（弧段角平分线上，midR 处）
    function labelPt(geoAngle, r) {
      var sa = ((geoAngle - rot) % 360 + 360) % 360;
      var ar = sa * Math.PI / 180;
      return { x: cx + r * Math.sin(ar), y: cy - r * Math.cos(ar) };
    }

    var swS = sw.toFixed(0);

    // 1. 年五黄（45°，琥珀，底层）
    // 年五黄属飞星凶方，非古典支位；故用 45°精度（与 XK 九宫同格）
    if (d.wuhuangDeg !== null && d.wuhuangDeg !== undefined) {
      out += '<path d="' + sector(d.wuhuangDeg, 22.5, Ro, Ri)
        + '" fill="rgba(155,75,0,.24)" stroke="rgba(185,115,0,.60)"'
        + ' stroke-width="' + swS + '"/>';
      var wlp = labelPt(d.wuhuangDeg, midR);
      // v2-P53: 两行标注（卦名·方位），与三煞/太岁/岁破格式对齐
      // ⚠️ 45°精度（XK飞星宫位），非24山支位——弧宽45°已体现精度层级
      out += '<text x="' + f(wlp.x) + '" y="' + f(wlp.y - fs * 0.38)
        + '" text-anchor="middle" fill="rgba(215,135,30,.92)" font-family="serif"'
        + ' font-size="' + (fs * 0.82).toFixed(1) + '" font-weight="bold">年五黄</text>';
      if (d.wuhuangLabel) {
        out += '<text x="' + f(wlp.x) + '" y="' + f(wlp.y + fs * 0.42)
          + '" text-anchor="middle" fill="rgba(215,135,30,.80)" font-family="serif"'
          + ' font-size="' + (fs * 0.60).toFixed(1) + '">' + d.wuhuangLabel + '</text>';
      }
    } else {
      // v2-P54C: 中宫五黄年（如2031）无方位弧；在户型平面中心绘菱形标注
      // F-v2-P54-01: 年紫白 plate['C']=5 → wuhuangDeg=null → DIR_BEAR_FP 无'C'键
      // 出处：年紫白飞星按九星入中 xkFlyStars 规则（清·沈竹礽《沈氏玄空学》约1891年·待核实中宫五黄论）
      // 铁律③：仅描述「年五黄·中宫」，不写「全宅不利」等断语
      // 数值算例: 2031年 lyNianCenter=5 → plate={C:5,...} → wuhuangDeg=null → 本分支执行 ✓
      //           2022年 lyNianCenter=5 (周期9年) → 同样执行 ✓
      var dRad = Math.min(b.w, b.h) * 0.09;
      var dSWc = Math.max(22, 28 / pxmm);
      var dFSc = Math.max(65, Math.min(180, 9.5 / pxmm));
      // 菱形（旋转45°正方形四顶点）：上/右/下/左
      out += '<polygon points="'
        + cx.toFixed(1) + ',' + (cy - dRad).toFixed(1) + ' '
        + (cx + dRad).toFixed(1) + ',' + cy.toFixed(1) + ' '
        + cx.toFixed(1) + ',' + (cy + dRad).toFixed(1) + ' '
        + (cx - dRad).toFixed(1) + ',' + cy.toFixed(1) + '"'
        + ' fill="rgba(155,75,0,.26)" stroke="rgba(185,115,0,.68)"'
        + ' stroke-width="' + dSWc.toFixed(0) + '" stroke-dasharray="'
        + (dSWc * 3).toFixed(0) + ',' + (dSWc * 1.5).toFixed(0) + '"/>';
      // 第一行：年五黄
      out += '<text x="' + cx.toFixed(1) + '" y="' + (cy - dRad * 0.35).toFixed(1)
        + '" text-anchor="middle" dominant-baseline="middle"'
        + ' fill="rgba(215,135,30,.92)" font-family="serif"'
        + ' font-size="' + dFSc.toFixed(1) + '" font-weight="bold">年五黄</text>';
      // 第二行：中宫（与三煞/太岁/岁破的两行格式对齐，行间距系数0.75）
      out += '<text x="' + cx.toFixed(1) + '" y="' + (cy + dRad * 0.40).toFixed(1)
        + '" text-anchor="middle" dominant-baseline="middle"'
        + ' fill="rgba(215,135,30,.78)" font-family="serif"'
        + ' font-size="' + (dFSc * 0.70).toFixed(1) + '">中宫</text>';
    }

    // 2. 三煞（3×15°，深红，中层）
    // CODEX-REVIEW 必修3：每山15°，出处《钦定协纪辨方书》卷三（同上）
    d.sansha.forEach(function (m) {
      out += '<path d="' + sector(m.deg, 7.5, Ro, Ri)
        + '" fill="rgba(190,15,15,.38)" stroke="#cc2020"'
        + ' stroke-width="' + swS + '"/>';
      var slp = labelPt(m.deg, midR * 0.90);
      out += '<text x="' + f(slp.x) + '" y="' + f(slp.y - fs * 0.38)
        + '" text-anchor="middle" fill="rgba(255,105,105,.95)" font-family="serif"'
        + ' font-size="' + (fs * 0.76).toFixed(1) + '" font-weight="bold">三煞</text>';
      out += '<text x="' + f(slp.x) + '" y="' + f(slp.y + fs * 0.42)
        + '" text-anchor="middle" fill="rgba(255,140,140,.88)" font-family="serif"'
        + ' font-size="' + (fs * 0.60).toFixed(1) + '">' + m.name + '山</text>';
    });

    // 3. 岁破（15°，橙红，上层）
    var spLp = labelPt(d.ts.suipoDeg, midR);
    out += '<path d="' + sector(d.ts.suipoDeg, 7.5, Ro, Ri)
      + '" fill="rgba(200,75,18,.42)" stroke="#d04020"'
      + ' stroke-width="' + swS + '"/>';
    // v2-P51: 两行标注，与三煞格式对齐（第一行: 煞名, 第二行: 山名）
    out += '<text x="' + f(spLp.x) + '" y="' + f(spLp.y - fs * 0.38)
      + '" text-anchor="middle" fill="rgba(242,125,82,.98)" font-family="serif"'
      + ' font-size="' + fs.toFixed(1) + '" font-weight="bold">岁破</text>';
    out += '<text x="' + f(spLp.x) + '" y="' + f(spLp.y + fs * 0.42)
      + '" text-anchor="middle" fill="rgba(242,165,100,.88)" font-family="serif"'
      + ' font-size="' + (fs * 0.60).toFixed(1) + '">' + (d.suipoName || '') + '山</text>';

    // 4. 太岁（15°，暖金，顶层）
    var tsLp = labelPt(d.ts.zhi.deg, midR);
    out += '<path d="' + sector(d.ts.zhi.deg, 7.5, Ro, Ri)
      + '" fill="rgba(200,158,18,.46)" stroke="#c8a84b"'
      + ' stroke-width="' + swS + '"/>';
    // v2-P51: 两行标注（太岁 + 地支山名），对齐三煞格式
    out += '<text x="' + f(tsLp.x) + '" y="' + f(tsLp.y - fs * 0.38)
      + '" text-anchor="middle" fill="#c8a84b" font-family="serif"'
      + ' font-size="' + fs.toFixed(1) + '" font-weight="bold">太岁</text>';
    out += '<text x="' + f(tsLp.x) + '" y="' + f(tsLp.y + fs * 0.42)
      + '" text-anchor="middle" fill="rgba(200,168,80,.88)" font-family="serif"'
      + ' font-size="' + (fs * 0.60).toFixed(1) + '">' + d.ts.zhi.name + '山</text>';

    // 5. 年份信息条（底部）
    // 干支：GAN[((year-4)%10+10)%10]; 出处：干支纪年古法
    var gan = '甲乙丙丁戊己庚辛壬癸'[(((d.year - 4) % 10) + 10) % 10];
    var hdrH = Math.max(60, b.h * 0.072);
    var hdrY = b.h - hdrH - Math.max(22, b.h * 0.012);
    var fsH  = Math.max(46, Math.min(145, 8.5 / pxmm));
    var sanshaNames = d.sansha.map(function (m) { return m.name; }).join('');
    // 三煞方位名（从中山判断）
    var SANSHA_DIR = { 午: '（南方）', 酉: '（西方）', 子: '（北方）', 卯: '（东方）' };
    var sanshaDir = (d.sansha[1] && SANSHA_DIR[d.sansha[1].name]) ? SANSHA_DIR[d.sansha[1].name] : '';
    out += '<rect x="' + (b.w * 0.04).toFixed(1) + '" y="' + hdrY.toFixed(1)
      + '" width="' + (b.w * 0.92).toFixed(1) + '" height="' + hdrH.toFixed(1)
      + '" rx="' + (hdrH * 0.25).toFixed(1) + '" fill="rgba(10,6,1,.78)"/>';
    out += '<text x="' + (b.w / 2).toFixed(1) + '" y="' + (hdrY + hdrH / 2).toFixed(1)
      + '" text-anchor="middle" dominant-baseline="middle"'
      + ' fill="#c8a84b" font-family="serif" font-size="' + fsH.toFixed(1) + '">'
      + d.year + gan + d.ts.zhi.name + '年·太岁' + d.ts.zhi.name
      + '山·三煞' + sanshaNames + sanshaDir + '</text>';

    return out;
  };

  window.FloorplanOverlay = FloorplanOverlay;

})();
