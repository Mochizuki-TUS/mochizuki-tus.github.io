/* =====================================================================
   mlui.js — 発展教材「機械学習」シミュレーターの画面部品（window.MLUI）
   ---------------------------------------------------------------------
   ・canvas 2D の描画（軸・目盛・単位・凡例・線種・マーカーの形・白い縁取りの文字），
     操作部品（スライダー・数値欄・ピル・セレクト・チェック・seed 欄・実行／停止），
     ページの立ち上げ（タブ・?embed=1・?only=key・#key・postHeight）．
   ・外部依存なし．mlsim.css と組み合わせて使う（#qsim の下に閉じる）．
   ・Math.random は使わない（乱数は MLCore.rng）．
   API の説明は MarkDown/261112_ml_textbook_work/SPEC_SIM_API.md．
   ===================================================================== */
(function (root) {
  'use strict';
  var MLUI = {};
  var CFONT = '"Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans JP",sans-serif';
  MLUI.font = CFONT;

  /* ---------------- 色・線種（色覚の違いに配慮：Okabe–Ito 系．色だけに頼らず線種・形も変える） */
  MLUI.colors = {
    accent: '#0f4c81', accentSoft: 'rgba(15,76,129,.16)', orange: '#d55e00', green: '#00876c',
    purple: '#7b3294', sky: '#3a8fc8', yellow: '#b8860b', red: '#b2182b', gray: '#6b7480',
    ink: '#1f2328', sub: '#5c6670', grid: 'rgba(31,35,40,.08)', frame: '#5c6670'
  };
  MLUI.series = ['#0f4c81', '#d55e00', '#00876c', '#7b3294', '#b8860b', '#3a8fc8', '#b2182b', '#6b7480'];
  MLUI.dash = { solid: [], dashed: [7, 4], dotted: [2, 3], dashdot: [9, 3, 2, 3], long: [12, 5] };
  MLUI.shapes = ['circle', 'square', 'triangle', 'diamond', 'cross', 'plus', 'triangleDown'];

  /* ---------------- 小道具 */
  MLUI.el = function (tag, cls, html) { var d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; };
  MLUI.$ = function (rootEl, sel) { return (rootEl || document).querySelector(sel); };
  MLUI.$$ = function (rootEl, sel) { return Array.prototype.slice.call((rootEl || document).querySelectorAll(sel)); };
  MLUI.clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  MLUI.reducedMotion = function () { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  var uid = 0; MLUI.uid = function (p) { uid++; return (p || 'ml') + '-' + uid; };

  /* ---------------- 数値の整形（マイナスは U+2212，指数は ×10ⁿ） */
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '−': '⁻', '+': '' };
  MLUI.mn = function (s) { return String(s).replace(/-/g, '−'); };
  MLUI.sup = function (n) { return String(n).split('').map(function (ch) { return SUP[ch] != null ? SUP[ch] : ch; }).join(''); };
  /* 有効数字 digits 桁（既定 3）．|x| が 1e−3 未満または 1e5 以上は ×10ⁿ（上付き文字．canvas でも使える）．
     opt.html=true なら ×10<sup>n</sup>．非有限は '—'（NaN）/ '∞' */
  MLUI.fmt = function (x, digits, opt) {
    opt = opt || {}; digits = digits || 3;
    if (x === null || x === undefined) return '—';
    if (Number.isNaN(x)) return '—';
    if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
    if (x === 0) return '0';
    var a = Math.abs(x);
    if (a >= 1e-3 && a < 1e5) {
      var s = x.toPrecision(digits);
      if (s.indexOf('e') >= 0) s = String(Number(s));
      return MLUI.mn(s);
    }
    var e = Math.floor(Math.log10(a)), m = x / Math.pow(10, e);
    var ms = m.toFixed(Math.max(0, digits - 1));
    if (Math.abs(parseFloat(ms)) >= 10) { e += 1; ms = (m / 10).toFixed(Math.max(0, digits - 1)); }
    return MLUI.mn(ms) + '×10' + (opt.html ? '<sup>' + MLUI.mn(e) + '</sup>' : MLUI.sup(e));
  };
  MLUI.fmtHTML = function (x, digits) { return MLUI.fmt(x, digits, { html: true }); };

  /* ---------------- 上付き文字の表示（2026-11-12 L2）
     Hiragino では上付きのマイナス「⁻」（U+207B）がほとんど見えず，「10⁻³」が「10³」に読める．
     そこで文字列（fmt・sup の出力や装置の文）はそのままにして，表示のときに次の「上付きの並び」を置き換える：
       ・⁻ または ⁺ を含む並び（例：⁻³，cm⁻¹）
       ・直前が「10」の並び（例：10⁵．指数表記の見た目をそろえる）
     canvas：MLUI.label・textWidth が並びを小さい字で上にずらし，マイナスは普通の「−」（U+2212）で描く．
     HTML：MLUI.supHTML(s) は <sup>−3</sup> の HTML を返す．MLUI.fixSup(root) は文字ノードの並びを
       <sup class="mlx" aria-hidden="true" data-t="−3"></sup><span class="mlx-o">⁻³</span> に置き換える
       （見える字は <sup> の ::before，元の字は見えない span に残すので textContent・innerText・読み上げは変わらない）．
       boot が #qsim に MutationObserver を付けて自動で行う． */
  var SUPRUN = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g;
  var SUPNORM = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '−', '⁺': '+' };
  function supPlain(run) { return run.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]/g, function (ch) { return SUPNORM[ch]; }); }
  /* 文字列を [{t, sup}] に分ける．置き換える並びが無ければ null */
  function supSegments(s) {
    s = String(s);
    if (!/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]/.test(s)) return null;
    var out = [], last = 0, m, any = false;
    SUPRUN.lastIndex = 0;
    while ((m = SUPRUN.exec(s))) {
      var run = m[0], i = m.index;
      if (!(/[⁻⁺]/.test(run) || s.slice(Math.max(0, i - 2), i) === '10')) continue;
      if (i > last) out.push({ t: s.slice(last, i), sup: false });
      out.push({ t: supPlain(run), sup: true }); last = i + run.length; any = true;
    }
    if (!any) return null;
    if (last < s.length) out.push({ t: s.slice(last), sup: false });
    return out;
  }
  MLUI.supSegments = supSegments;
  function escHTML(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  /* 文字列（HTML でない）→ 上付きの並びを <sup> にした HTML */
  MLUI.supHTML = function (s) {
    var seg = supSegments(s); if (!seg) return escHTML(s);
    return seg.map(function (g) { return g.sup ? '<sup>' + escHTML(g.t) + '</sup>' : escHTML(g.t); }).join('');
  };
  var SUPSKIP = /^(MATH|SVG|SCRIPT|STYLE|TEXTAREA|OPTION|SELECT|TITLE|CANVAS|NOSCRIPT|SUP|SUB)$/i;
  function skipNode(n) {
    for (var p = n.parentNode; p && p.nodeType === 1; p = p.parentNode) {
      if (SUPSKIP.test(p.nodeName) || (p.classList && (p.classList.contains('mlx-o') || p.classList.contains('nosupfix')))) return true;
      if (p.namespaceURI && p.namespaceURI !== 'http://www.w3.org/1999/xhtml') return true;
    }
    return false;
  }
  function fixTextNode(n) {
    if (!n.parentNode || skipNode(n)) return;
    var seg = supSegments(n.nodeValue); if (!seg) return;
    var frag = document.createDocumentFragment(), s = n.nodeValue, pos = 0;
    seg.forEach(function (g) {
      if (!g.sup) { frag.appendChild(document.createTextNode(g.t)); pos += g.t.length; return; }
      /* 元の並び（同じ長さ）を取り出す */
      SUPRUN.lastIndex = pos; var m = SUPRUN.exec(s); var orig = m ? m[0] : g.t; pos = m ? m.index + orig.length : pos;
      var v = document.createElement('sup'); v.className = 'mlx'; v.setAttribute('aria-hidden', 'true'); v.setAttribute('data-t', g.t);
      var o = document.createElement('span'); o.className = 'mlx-o'; o.textContent = orig;
      frag.appendChild(v); frag.appendChild(o);
    });
    n.parentNode.replaceChild(frag, n);
  }
  MLUI.fixSup = function (rootNode) {
    if (!rootNode) return;
    if (rootNode.nodeType === 3) { fixTextNode(rootNode); return; }
    if (rootNode.nodeType !== 1 && rootNode.nodeType !== 11) return;
    if (rootNode.nodeType === 1 && skipNode({ parentNode: rootNode })) return;
    var w = document.createTreeWalker(rootNode, 4 /* SHOW_TEXT */, null), list = [], t;
    while ((t = w.nextNode())) if (/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]/.test(t.nodeValue)) list.push(t);
    list.forEach(fixTextNode);
  };
  MLUI.watchSup = function (rootNode) {
    MLUI.fixSup(rootNode);
    if (!window.MutationObserver || rootNode.__mlxObs) return;
    var ob = new MutationObserver(function (recs) {
      recs.forEach(function (r) {
        if (r.type === 'characterData') fixTextNode(r.target);
        else for (var i = 0; i < r.addedNodes.length; i++) MLUI.fixSup(r.addedNodes[i]);
      });
    });
    ob.observe(rootNode, { childList: true, subtree: true, characterData: true });
    rootNode.__mlxObs = ob;
  };
  /* 小数点以下 d 桁に固定 */
  MLUI.fmtFix = function (x, d) {
    if (x === null || x === undefined || Number.isNaN(x)) return '—';
    if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
    var s = x.toFixed(d == null ? 2 : d);
    if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);
    return MLUI.mn(s);
  };
  MLUI.fmtPct = function (x, d) { return (x === null || x === undefined) ? '—' : MLUI.fmtFix(100 * x, d == null ? 1 : d) + ' %'; };
  MLUI.fmtInt = function (n) { return MLUI.mn(String(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };

  /* =================================================================
     canvas
     ================================================================= */
  MLUI.DPR = function () { return Math.min(2, window.devicePixelRatio || 1); };
  function cssWidth(cv) {
    var own = cv.getBoundingClientRect().width;
    if (own > 1) return own;
    var p = cv.parentNode;
    if (p && p.clientWidth) { var cs = getComputedStyle(p); return Math.max(1, p.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0)); }
    return 600;
  }
  /* canvas を表示幅に合わせて作り直す（DPR は 2 まで）．
     opt: {aspect: 高さ/幅（既定 0.62）, height: 固定の高さ px, minHeight, maxHeight}
     戻り値 {W, H, c}（CSS px の座標系に setTransform 済み．毎回クリアする） */
  MLUI.fitCanvas = function (cv, opt) {
    if (typeof opt === 'number') opt = { aspect: opt };
    opt = opt || {};
    var w = Math.max(200, Math.round(cssWidth(cv)));
    var h = opt.height || Math.round(w * (opt.aspect || 0.62));
    if (opt.minHeight) h = Math.max(opt.minHeight, h);
    if (opt.maxHeight) h = Math.min(opt.maxHeight, h);
    var d = MLUI.DPR();
    if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    cv.style.height = h + 'px';
    var c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    return { W: w, H: h, c: c };
  };
  /* 余白から描画枠 [x0,y0,x1,y1] を作る（既定 左 52，右 14，上 26，下 40） */
  MLUI.plotBox = function (W, H, m) { m = m || {}; return [m.l == null ? 52 : m.l, m.t == null ? 26 : m.t, W - (m.r == null ? 14 : m.r), H - (m.b == null ? 40 : m.b)]; };
  MLUI.setCanvasLabel = function (cv, text) { cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', text); };

  /* 白い縁取り（halo）付きの文字．opt: {size, bold, color, align, base, halo(既定 true), box:[x0,y0,x1,y1]（はみ出さないよう寄せる）, rotate} */
  /* 上付きの並びを含む文字の幅（canvas）．c.font は呼ぶ側で設定済み */
  var SUPSCALE = 0.72, SUPRAISE = 0.42;
  function segWidth(c, seg, size, bold) {
    var w = 0, f0 = c.font;
    seg.forEach(function (g) { c.font = (bold ? 'bold ' : '') + (g.sup ? size * SUPSCALE : size) + 'px ' + CFONT; w += c.measureText(g.t).width + (g.sup ? 0.5 : 0); });
    c.font = f0; return w;
  }
  MLUI.label = function (c, txt, x, y, opt) {
    opt = opt || {};
    txt = String(txt);
    var seg = supSegments(txt);
    if (seg) return labelSeg(c, seg, x, y, opt);
    c.save();
    c.font = (opt.bold ? 'bold ' : '') + (opt.size || 11) + 'px ' + CFONT;
    c.textAlign = opt.align || 'center'; c.textBaseline = opt.base || 'middle';
    if (opt.box) {
      var tw = c.measureText(txt).width, al = c.textAlign, b = opt.box;
      var L = (al === 'left') ? x : (al === 'right') ? x - tw : x - tw / 2;
      if (L + tw > b[2] - 2) L = b[2] - 2 - tw;
      if (L < b[0] + 2) L = b[0] + 2;
      x = (al === 'left') ? L : (al === 'right') ? L + tw : L + tw / 2;
      var hh = (opt.size || 11) * 0.6;
      if (y - hh < b[1] + 1) y = b[1] + 1 + hh;
      if (y + hh > b[3] - 1) y = b[3] - 1 - hh;
    }
    if (opt.rotate) { c.translate(x, y); c.rotate(opt.rotate); x = 0; y = 0; }
    if (opt.halo !== false) { c.lineJoin = 'round'; c.lineWidth = opt.haloWidth || 3.5; c.strokeStyle = 'rgba(255,255,255,.92)'; c.strokeText(txt, x, y); }
    c.fillStyle = opt.color || MLUI.colors.ink; c.fillText(txt, x, y);
    c.restore();
  };
  /* 上付きの並びを含む文字：指数は小さい字（0.72 倍）で上にずらし，マイナスは U+2212 */
  function labelSeg(c, seg, x, y, opt) {
    var size = opt.size || 11, bold = !!opt.bold;
    c.save();
    c.font = (bold ? 'bold ' : '') + size + 'px ' + CFONT;
    c.textBaseline = opt.base || 'middle';
    var al = opt.align || 'center', tw = segWidth(c, seg, size, bold);
    if (opt.box) {
      var b = opt.box, L0 = (al === 'left') ? x : (al === 'right') ? x - tw : x - tw / 2;
      if (L0 + tw > b[2] - 2) L0 = b[2] - 2 - tw;
      if (L0 < b[0] + 2) L0 = b[0] + 2;
      x = (al === 'left') ? L0 : (al === 'right') ? L0 + tw : L0 + tw / 2;
      var hh = size * 0.6;
      if (y - hh < b[1] + 1) y = b[1] + 1 + hh;
      if (y + hh > b[3] - 1) y = b[3] - 1 - hh;
    }
    if (opt.rotate) { c.translate(x, y); c.rotate(opt.rotate); x = 0; y = 0; }
    var L = (al === 'left') ? x : (al === 'right') ? x - tw : x - tw / 2;
    c.textAlign = 'left';
    var pos = [], px = L;
    seg.forEach(function (g) {
      var fs = g.sup ? size * SUPSCALE : size;
      c.font = (bold ? 'bold ' : '') + fs + 'px ' + CFONT;
      pos.push({ g: g, x: px, y: g.sup ? y - size * SUPRAISE : y, font: c.font });
      px += c.measureText(g.t).width + (g.sup ? 0.5 : 0);
    });
    if (opt.halo !== false) {
      c.lineJoin = 'round'; c.lineWidth = opt.haloWidth || 3.5; c.strokeStyle = 'rgba(255,255,255,.92)';
      pos.forEach(function (p) { c.font = p.font; c.strokeText(p.g.t, p.x, p.y); });
    }
    c.fillStyle = opt.color || MLUI.colors.ink;
    pos.forEach(function (p) { c.font = p.font; c.fillText(p.g.t, p.x, p.y); });
    c.restore();
  }
  /* 重ならない直接ラベル．lab = MLUI.labeler(c, box); lab.add(txt, x, y, opt) は，すでに置いた文字と重なるときに
     上下へ（opt.dy の列．既定 [0,−14,14,−28,28,…]），それでも重なれば左右へずらして置く．lab.block(x0,y0,x1,y1) で避ける領域（凡例など）を登録 */
  MLUI.labeler = function (c, box) {
    var placed = [];
    function hit(r) { for (var i = 0; i < placed.length; i++) { var q = placed[i]; if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) return true; } return false; }
    return {
      rects: placed,
      block: function (x0, y0, x1, y1) { placed.push([x0, y0, x1, y1]); },
      add: function (txt, x, y, opt) {
        opt = Object.assign({ size: 11 }, opt || {});
        var w = MLUI.textWidth(c, txt, opt.size, opt.bold), h = opt.size + 4, al = opt.align || 'center';
        var dys = opt.dy || [0, -14, 14, -28, 28, -42, 42, -56, 56], best = null;
        var dxs = [0, w / 2 + 8, -(w / 2 + 8), w + 12, -(w + 12)], cand = [];
        dxs.forEach(function (dx) { dys.forEach(function (dy) { cand.push([dx, dy]); }); });
        for (var k = 0; k < cand.length; k++) {
          var yy = y + cand[k][1], L = (al === 'left' ? x : al === 'right' ? x - w : x - w / 2) + cand[k][0];
          if (box) { L = Math.max(box[0] + 2, Math.min(box[2] - 2 - w, L)); yy = Math.max(box[1] + h / 2 + 1, Math.min(box[3] - h / 2 - 1, yy)); }
          var r = [L - 1, yy - h / 2, L + w + 1, yy + h / 2];
          if (!hit(r)) { best = { L: L, y: yy, r: r }; break; }
          if (!best) best = { L: L, y: yy, r: r };
        }
        placed.push(best.r);
        MLUI.label(c, txt, best.L, best.y, Object.assign({}, opt, { align: 'left', box: null }));
        return best;
      }
    };
  };
  MLUI.textWidth = function (c, txt, size, bold) {
    c.save(); c.font = (bold ? 'bold ' : '') + (size || 11) + 'px ' + CFONT;
    var seg = supSegments(txt), w = seg ? segWidth(c, seg, size || 11, bold) : c.measureText(String(txt)).width;
    c.restore(); return w;
  };

  /* 目盛：線形 */
  MLUI.niceStep = function (lo, hi, target) {
    var s = Math.abs(hi - lo); if (!(s > 0)) return 1;
    target = target || 5;
    var raw = s / target, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    var m = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10;   /* 1, 2, 5, 10 × 10^n */
    return m * p;
  };
  MLUI.ticks = function (lo, hi, target) {
    var st = MLUI.niceStep(lo, hi, target || 5), out = [];
    var a = Math.min(lo, hi), b = Math.max(lo, hi);
    for (var v = Math.ceil(a / st - 1e-9) * st; v <= b + st * 1e-9; v += st) out.push(Math.abs(v) < st * 1e-9 ? 0 : v);
    return { values: out, step: st };
  };
  /* 目盛：対数（10 の累乗．範囲が狭ければ 2, 5 も） */
  MLUI.logTicks = function (lo, hi) {
    var e0 = Math.floor(Math.log10(lo) + 1e-9), e1 = Math.ceil(Math.log10(hi) - 1e-9), out = [];
    var mult = (e1 - e0) <= 2 ? [1, 2, 5] : [1];
    var every = Math.max(1, Math.ceil((e1 - e0 + 1) / 8));
    for (var e = e0; e <= e1; e++) {
      if ((e - e0) % every) continue;
      mult.forEach(function (m) { var v = m * Math.pow(10, e); if (v >= lo * (1 - 1e-9) && v <= hi * (1 + 1e-9)) out.push(v); });
    }
    return out;
  };
  /* 目盛の文字に要る小数の桁数：刻みと各目盛の値を丸めずに書ける最小の桁（0〜6）．
     自動の目盛（1, 2, 5 × 10ⁿ）では従来と同じ桁．明示の目盛（例：刻み 0.25）では 0.25 と書く（2026-11-12 L2） */
  function decimalsOf(x) {
    x = Math.abs(x); if (!(x > 0) || !isFinite(x)) return 0;
    for (var d = 0; d < 6; d++) { var s = x * Math.pow(10, d); if (Math.abs(s - Math.round(s)) <= 1e-6 * Math.max(1, s)) return d; }
    return 6;
  }
  function tickDecimals(vals, step) {
    var d = decimalsOf(step);
    vals.forEach(function (v) { var a = Math.abs(v); if (a > 0 && a >= 1e-3 && a < 1e5) d = Math.max(d, decimalsOf(v)); });
    return Math.min(d, 6);
  }
  MLUI.tickDecimals = tickDecimals;
  function tickText(v, d) {
    if (v === 0) return '0';
    var a = Math.abs(v);
    if (a >= 1e5 || a < 1e-3) return MLUI.fmt(v, 2);
    return MLUI.mn(v.toFixed(d));
  }
  function logTickText(v) {
    var e = Math.round(Math.log10(v));
    if (Math.abs(v - Math.pow(10, e)) < 1e-9 * v) {
      if (e >= -2 && e <= 3) return MLUI.mn(String(Number(v.toPrecision(3))));
      return '10' + MLUI.sup(e);
    }
    return MLUI.fmt(v, 1);
  }

  /* 軸を描いて座標変換を返す．
     box=[x0,y0,x1,y1]（CSS px），xr=[xmin,xmax]，yr=[ymin,ymax]．
     opt: {xl, yl（軸ラベル．単位を括弧で含める）, title, xlog, ylog, xticks:[..], yticks:[..], xf, yf（目盛の文字），
           nx, ny（目盛の目安の本数），grid(既定 true), zero(既定 true：0 の線), ylOff（y ラベルの位置）, bg}
     戻り値 ax = {X(x), Y(y), invX(px), invY(py), box, xr, yr, xlog, ylog, inside(px,py)} */
  MLUI.axes = function (c, box, xr, yr, opt) {
    opt = opt || {};
    var x0 = box[0], y0 = box[1], x1 = box[2], y1 = box[3];
    var xlog = !!opt.xlog, ylog = !!opt.ylog;
    var fx = xlog ? Math.log10 : function (v) { return v; }, fy = ylog ? Math.log10 : function (v) { return v; };
    var ax0 = fx(xr[0]), ax1 = fx(xr[1]), ay0 = fy(yr[0]), ay1 = fy(yr[1]);
    var ax = {
      box: box, xr: xr, yr: yr, xlog: xlog, ylog: ylog,
      X: function (x) { return x0 + (fx(x) - ax0) / (ax1 - ax0) * (x1 - x0); },
      Y: function (y) { return y1 - (fy(y) - ay0) / (ay1 - ay0) * (y1 - y0); },
      invX: function (px) { var t = ax0 + (px - x0) / (x1 - x0) * (ax1 - ax0); return xlog ? Math.pow(10, t) : t; },
      invY: function (py) { var t = ay0 + (y1 - py) / (y1 - y0) * (ay1 - ay0); return ylog ? Math.pow(10, t) : t; },
      inside: function (px, py) { return px >= x0 && px <= x1 && py >= y0 && py <= y1; }
    };
    c.save();
    c.fillStyle = opt.bg || '#fff'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
    var xt, yt, xstep = 1, ystep = 1;
    if (opt.xticks) xt = opt.xticks; else if (xlog) xt = MLUI.logTicks(xr[0], xr[1]); else { var tx = MLUI.ticks(xr[0], xr[1], opt.nx || Math.max(3, Math.min(8, Math.round((x1 - x0) / 70)))); xt = tx.values; xstep = tx.step; }
    if (opt.yticks) yt = opt.yticks; else if (ylog) yt = MLUI.logTicks(yr[0], yr[1]); else { var ty = MLUI.ticks(yr[0], yr[1], opt.ny || Math.max(3, Math.min(7, Math.round((y1 - y0) / 45)))); yt = ty.values; ystep = ty.step; }
    if (opt.xticks && xt.length > 1) xstep = Math.abs(xt[1] - xt[0]);
    if (opt.yticks && yt.length > 1) ystep = Math.abs(yt[1] - yt[0]);
    if (opt.grid !== false) {
      c.strokeStyle = MLUI.colors.grid; c.lineWidth = 1;
      xt.forEach(function (v) { var p = Math.round(ax.X(v)) + 0.5; c.beginPath(); c.moveTo(p, y0); c.lineTo(p, y1); c.stroke(); });
      yt.forEach(function (v) { var p = Math.round(ax.Y(v)) + 0.5; c.beginPath(); c.moveTo(x0, p); c.lineTo(x1, p); c.stroke(); });
    }
    if (opt.zero !== false && !ylog && yr[0] < 0 && yr[1] > 0) { c.strokeStyle = 'rgba(31,35,40,.35)'; c.beginPath(); c.moveTo(x0, ax.Y(0)); c.lineTo(x1, ax.Y(0)); c.stroke(); }
    if (opt.zero !== false && !xlog && xr[0] < 0 && xr[1] > 0) { c.strokeStyle = 'rgba(31,35,40,.25)'; c.beginPath(); c.moveTo(ax.X(0), y0); c.lineTo(ax.X(0), y1); c.stroke(); }
    c.strokeStyle = MLUI.colors.frame; c.lineWidth = 1; c.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
    c.restore();
    var ts = opt.tickSize || 10;
    var xdec = tickDecimals(xt, xstep), ydec = tickDecimals(yt, ystep);
    xt.forEach(function (v) {
      var s = opt.xf ? opt.xf(v) : (xlog ? logTickText(v) : tickText(v, xdec));
      MLUI.label(c, s, ax.X(v), y1 + 9, { size: ts, color: MLUI.colors.sub, halo: false });
    });
    var maxYW = 0;
    yt.forEach(function (v) {
      var s = opt.yf ? opt.yf(v) : (ylog ? logTickText(v) : tickText(v, ydec));
      maxYW = Math.max(maxYW, MLUI.textWidth(c, s, ts));
      MLUI.label(c, s, x0 - 5, ax.Y(v), { size: ts, color: MLUI.colors.sub, align: 'right', halo: false });
    });
    if (opt.xl) MLUI.label(c, opt.xl, (x0 + x1) / 2, y1 + 25, { size: 11, color: MLUI.colors.sub, halo: false });
    if (opt.yl) MLUI.label(c, opt.yl, x0 - (opt.ylOff || Math.max(22, maxYW + 14)), (y0 + y1) / 2, { size: 11, color: MLUI.colors.sub, halo: false, rotate: -Math.PI / 2 });
    if (opt.title) MLUI.label(c, opt.title, (x0 + x1) / 2, y0 - 12, { size: 11.5, bold: true, color: '#15202b', halo: false });
    return ax;
  };

  function clipTo(c, ax) { var b = ax.box; c.beginPath(); c.rect(b[0], b[1], b[2] - b[0], b[3] - b[1]); c.clip(); }
  /* 折れ線（データ座標）．非有限の点で線を切る．opt: {color, width, dash, alpha} */
  MLUI.line = function (c, ax, xs, ys, opt) {
    opt = opt || {};
    c.save(); clipTo(c, ax);
    c.strokeStyle = opt.color || MLUI.colors.accent; c.lineWidth = opt.width || 2; c.setLineDash(opt.dash || []);
    c.globalAlpha = opt.alpha == null ? 1 : opt.alpha; c.lineJoin = 'round';
    var b = ax.box, lim = 1e5;
    c.beginPath(); var on = false;
    for (var i = 0; i < xs.length; i++) {
      var X = ax.X(xs[i]), Y = ax.Y(ys[i]);
      if (!isFinite(X) || !isFinite(Y)) { on = false; continue; }
      Y = Math.max(b[1] - lim, Math.min(b[3] + lim, Y));
      if (!on) { c.moveTo(X, Y); on = true; } else c.lineTo(X, Y);
    }
    c.stroke(); c.restore();
  };
  /* 点列 [[x,y],...] の折れ線 */
  MLUI.path = function (c, ax, pts, opt) { MLUI.line(c, ax, pts.map(function (p) { return p[0]; }), pts.map(function (p) { return p[1]; }), opt); };
  /* 帯（lo〜hi を塗る）．opt: {color, alpha(既定 0.18)} */
  MLUI.band = function (c, ax, xs, lo, hi, opt) {
    opt = opt || {};
    c.save(); clipTo(c, ax);
    c.fillStyle = opt.color || MLUI.colors.accent; c.globalAlpha = opt.alpha == null ? 0.18 : opt.alpha;
    c.beginPath(); var n = 0, i;
    for (i = 0; i < xs.length; i++) { if (!isFinite(lo[i]) || !isFinite(hi[i])) continue; var X = ax.X(xs[i]), Y = ax.Y(hi[i]); if (n++ === 0) c.moveTo(X, Y); else c.lineTo(X, Y); }
    for (i = xs.length - 1; i >= 0; i--) { if (!isFinite(lo[i]) || !isFinite(hi[i])) continue; c.lineTo(ax.X(xs[i]), ax.Y(lo[i])); }
    c.closePath(); if (n > 1) c.fill();
    if (opt.hatch) { /* 斜線（色以外の区別） */
      c.globalAlpha = 0.5; c.strokeStyle = opt.color || MLUI.colors.accent; c.lineWidth = 1; c.clip();
      var b = ax.box; for (var k = b[0] - (b[3] - b[1]); k < b[2]; k += 7) { c.beginPath(); c.moveTo(k, b[3]); c.lineTo(k + (b[3] - b[1]), b[1]); c.stroke(); }
    }
    c.restore();
  };
  /* マーカー 1 個（px 座標）．shape: circle|square|triangle|triangleDown|diamond|cross|plus．fill: true（塗る）/false（白抜き）/色 */
  MLUI.marker = function (c, x, y, shape, size, color, fill, opt) {
    opt = opt || {};
    var r = (size || 7) / 2; color = color || MLUI.colors.accent;
    c.save(); c.beginPath(); c.setLineDash([]);
    switch (shape) {
      case 'square': c.rect(x - r * 0.9, y - r * 0.9, 1.8 * r, 1.8 * r); break;
      case 'triangle': c.moveTo(x, y - r * 1.15); c.lineTo(x + r * 1.05, y + r * 0.75); c.lineTo(x - r * 1.05, y + r * 0.75); c.closePath(); break;
      case 'triangleDown': c.moveTo(x, y + r * 1.15); c.lineTo(x + r * 1.05, y - r * 0.75); c.lineTo(x - r * 1.05, y - r * 0.75); c.closePath(); break;
      case 'diamond': c.moveTo(x, y - r * 1.25); c.lineTo(x + r, y); c.lineTo(x, y + r * 1.25); c.lineTo(x - r, y); c.closePath(); break;
      case 'cross': c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x + r, y - r); c.lineTo(x - r, y + r); break;
      case 'plus': c.moveTo(x - r * 1.15, y); c.lineTo(x + r * 1.15, y); c.moveTo(x, y - r * 1.15); c.lineTo(x, y + r * 1.15); break;
      default: c.arc(x, y, r, 0, Math.PI * 2);
    }
    if (shape === 'cross' || shape === 'plus') {
      if (opt.halo !== false) { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4; c.stroke(); }
      c.strokeStyle = color; c.lineWidth = opt.width || 2; c.stroke();
    } else {
      if (fill === false) { c.fillStyle = '#fff'; c.fill(); c.strokeStyle = color; c.lineWidth = opt.width || 1.8; c.stroke(); }
      else { c.fillStyle = (typeof fill === 'string') ? fill : color; c.fill(); c.strokeStyle = opt.stroke || 'rgba(255,255,255,.95)'; c.lineWidth = opt.width || 1.3; c.stroke(); }
    }
    c.restore();
  };
  /* 散布（データ座標）．opt: {shape, size, color, fill, colors（点ごとの色の配列）, shapes（点ごとの形）} */
  MLUI.points = function (c, ax, xs, ys, opt) {
    opt = opt || {};
    c.save(); clipTo(c, ax);
    for (var i = 0; i < xs.length; i++) {
      var X = ax.X(xs[i]), Y = ax.Y(ys[i]); if (!isFinite(X) || !isFinite(Y)) continue;
      MLUI.marker(c, X, Y, opt.shapes ? opt.shapes[i] : (opt.shape || 'circle'), opt.size || 7, opt.colors ? opt.colors[i] : opt.color, opt.fill === undefined ? true : opt.fill, opt);
    }
    c.restore();
  };
  /* 縦線・横線（データ座標）．opt: {color, width, dash, label, labelPos:'top'|'bottom', labelOpt} */
  MLUI.vline = function (c, ax, x, opt) {
    opt = opt || {}; var X = ax.X(x), b = ax.box; if (!isFinite(X) || X < b[0] - 0.5 || X > b[2] + 0.5) return;
    c.save(); c.strokeStyle = opt.color || MLUI.colors.gray; c.lineWidth = opt.width || 1.5; c.setLineDash(opt.dash || []);
    c.beginPath(); c.moveTo(X, b[1]); c.lineTo(X, b[3]); c.stroke(); c.restore();
    if (opt.label) MLUI.label(c, opt.label, X, opt.labelPos === 'bottom' ? b[3] - 10 : b[1] + 10, Object.assign({ size: 10.5, color: opt.color, box: b }, opt.labelOpt || {}));
  };
  MLUI.hline = function (c, ax, y, opt) {
    opt = opt || {}; var Y = ax.Y(y), b = ax.box; if (!isFinite(Y) || Y < b[1] - 0.5 || Y > b[3] + 0.5) return;
    c.save(); c.strokeStyle = opt.color || MLUI.colors.gray; c.lineWidth = opt.width || 1.5; c.setLineDash(opt.dash || []);
    c.beginPath(); c.moveTo(b[0], Y); c.lineTo(b[2], Y); c.stroke(); c.restore();
    if (opt.label) MLUI.label(c, opt.label, opt.labelPos === 'left' ? b[0] + 6 : b[2] - 6, Y - 8, Object.assign({ size: 10.5, color: opt.color, align: opt.labelPos === 'left' ? 'left' : 'right', box: b }, opt.labelOpt || {}));
  };
  /* データ座標に文字（白い縁取り．枠の中に収める） */
  MLUI.text = function (c, ax, x, y, txt, opt) { opt = Object.assign({ box: ax.box }, opt || {}); MLUI.label(c, txt, ax.X(x), ax.Y(y), opt); };
  MLUI.arrow = function (c, x0, y0, x1, y1, color, width, head) {
    head = head || 7; c.save(); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = width || 2;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    var a = Math.atan2(y1 - y0, x1 - x0);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45)); c.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45)); c.closePath(); c.fill(); c.restore();
  };

  /* 色の対応（0〜1 → 色）．'blueRed'（発散型：青〜白〜赤），'viridis'，'gray'，'blues' */
  var CMAPS = {
    blueRed: [[33, 102, 172], [146, 197, 222], [247, 247, 247], [244, 165, 130], [178, 24, 43]],
    viridis: [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]],
    gray: [[250, 250, 250], [30, 30, 30]],
    blues: [[247, 251, 255], [158, 202, 225], [33, 113, 181], [8, 48, 107]]
  };
  MLUI.cmap = function (name) {
    var st = CMAPS[name] || CMAPS.viridis;
    return function (t) {
      t = Math.max(0, Math.min(1, isFinite(t) ? t : 0)); var s = t * (st.length - 1), i = Math.min(st.length - 2, Math.floor(s)), f = s - i;
      var a = st[i], b = st[i + 1];
      return 'rgb(' + Math.round(a[0] + f * (b[0] - a[0])) + ',' + Math.round(a[1] + f * (b[1] - a[1])) + ',' + Math.round(a[2] + f * (b[2] - a[2])) + ')';
    };
  };
  /* 格子の値を塗る．Z[iy][ix]（iy=0 が yr[0]，ix=0 が xr[0]．格子点はセルの中心）．
     opt: {xr, yr（既定 ax の範囲）, vmin, vmax, cmap（名前または関数）, alpha} */
  MLUI.heatmap = function (c, ax, Z, opt) {
    opt = opt || {};
    var ny = Z.length, nx = Z[0].length, xr = opt.xr || ax.xr, yr = opt.yr || ax.yr;
    var vmin = opt.vmin, vmax = opt.vmax, i, j;
    if (vmin == null || vmax == null) { var lo = Infinity, hi = -Infinity; for (i = 0; i < ny; i++) for (j = 0; j < nx; j++) { var v = Z[i][j]; if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } } if (vmin == null) vmin = lo; if (vmax == null) vmax = hi; }
    var cm = typeof opt.cmap === 'function' ? opt.cmap : MLUI.cmap(opt.cmap || 'viridis');
    var dx = (xr[1] - xr[0]) / nx, dy = (yr[1] - yr[0]) / ny;
    c.save(); clipTo(c, ax); c.globalAlpha = opt.alpha == null ? 1 : opt.alpha;
    for (i = 0; i < ny; i++) for (j = 0; j < nx; j++) {
      var X0 = ax.X(xr[0] + j * dx), X1 = ax.X(xr[0] + (j + 1) * dx), Y0 = ax.Y(yr[0] + i * dy), Y1 = ax.Y(yr[0] + (i + 1) * dy);
      c.fillStyle = cm((Z[i][j] - vmin) / ((vmax - vmin) || 1));
      c.fillRect(Math.min(X0, X1), Math.min(Y0, Y1), Math.abs(X1 - X0) + 0.6, Math.abs(Y1 - Y0) + 0.6);
    }
    c.restore();
    return { vmin: vmin, vmax: vmax };
  };
  /* 等高線（marching squares）．Z[iy][ix] は格子点の値（iy=0 が yr[0]，端の点が範囲の端）．
     opt: {xr, yr, color, width, dash} */
  MLUI.contour = function (c, ax, Z, level, opt) {
    opt = opt || {};
    var ny = Z.length, nx = Z[0].length, xr = opt.xr || ax.xr, yr = opt.yr || ax.yr;
    var gx = function (j) { return xr[0] + j * (xr[1] - xr[0]) / (nx - 1); }, gy = function (i) { return yr[0] + i * (yr[1] - yr[0]) / (ny - 1); };
    c.save(); clipTo(c, ax); c.strokeStyle = opt.color || MLUI.colors.ink; c.lineWidth = opt.width || 2; c.setLineDash(opt.dash || []);
    c.beginPath();
    function lerp(a, b, va, vb) { var t = (level - va) / (vb - va); return a + t * (b - a); }
    for (var i = 0; i < ny - 1; i++) for (var j = 0; j < nx - 1; j++) {
      var v00 = Z[i][j], v10 = Z[i][j + 1], v01 = Z[i + 1][j], v11 = Z[i + 1][j + 1];
      if (!(isFinite(v00) && isFinite(v10) && isFinite(v01) && isFinite(v11))) continue;
      var pts = [];
      if ((v00 > level) !== (v10 > level)) pts.push([lerp(gx(j), gx(j + 1), v00, v10), gy(i)]);
      if ((v10 > level) !== (v11 > level)) pts.push([gx(j + 1), lerp(gy(i), gy(i + 1), v10, v11)]);
      if ((v01 > level) !== (v11 > level)) pts.push([lerp(gx(j), gx(j + 1), v01, v11), gy(i + 1)]);
      if ((v00 > level) !== (v01 > level)) pts.push([gx(j), lerp(gy(i), gy(i + 1), v00, v01)]);
      for (var k = 0; k + 1 < pts.length; k += 2) { c.moveTo(ax.X(pts[k][0]), ax.Y(pts[k][1])); c.lineTo(ax.X(pts[k + 1][0]), ax.Y(pts[k + 1][1])); }
    }
    c.stroke(); c.restore();
  };

  /* 凡例（canvas の中．白い背景つきの箱）．
     items: [{label, color, dash, width, shape, fill, kind:'line'|'marker'|'band'|'linemarker'}]
     opt: {pos:'tr'|'tl'|'br'|'bl'（既定 'tr'）, size（既定 10.5）, maxWidth}．戻り値は箱 [x0,y0,x1,y1] */
  MLUI.legend = function (c, ax, items, opt) {
    opt = opt || {}; var b = ax.box || ax, size = opt.size || 10.5, lh = size + 6, sw = 24, pad = 6;
    var w = 0; items.forEach(function (it) { w = Math.max(w, MLUI.textWidth(c, it.label, size)); });
    var bw = Math.min(w + sw + pad * 3, opt.maxWidth || (b[2] - b[0] - 8)), bh = items.length * lh + pad;
    var pos = opt.pos || 'tr';
    var x = pos[1] === 'l' ? b[0] + 6 : b[2] - 6 - bw, y = pos[0] === 't' ? b[1] + 6 : b[3] - 6 - bh;
    c.save(); c.fillStyle = 'rgba(255,255,255,.88)'; c.strokeStyle = 'rgba(31,35,40,.18)'; c.lineWidth = 1;
    c.fillRect(x, y, bw, bh); c.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1); c.restore();
    items.forEach(function (it, k) {
      var cy = y + pad / 2 + lh * k + lh / 2, sx = x + pad;
      var kind = it.kind || (it.shape && !it.dash && it.width === undefined ? 'marker' : 'line');
      c.save();
      if (kind === 'band') {
        c.fillStyle = it.color; c.globalAlpha = it.alpha == null ? 0.25 : it.alpha; c.fillRect(sx, cy - 5, sw, 10);
        if (it.hatch) { c.globalAlpha = 0.7; c.strokeStyle = it.color; c.lineWidth = 1; c.beginPath(); c.rect(sx, cy - 5, sw, 10); c.clip(); c.beginPath(); for (var hk = sx - 10; hk < sx + sw; hk += 4) { c.moveTo(hk, cy + 5); c.lineTo(hk + 10, cy - 5); } c.stroke(); }
      }
      if (kind === 'line' || kind === 'linemarker') { c.strokeStyle = it.color; c.lineWidth = it.width || 2; c.setLineDash(it.dash || []); c.beginPath(); c.moveTo(sx, cy); c.lineTo(sx + sw, cy); c.stroke(); }
      c.restore();
      if (kind === 'marker' || kind === 'linemarker') MLUI.marker(c, sx + sw / 2, cy, it.shape || 'circle', it.size || 7, it.color, it.fill === undefined ? true : it.fill);
      MLUI.label(c, it.label, sx + sw + pad, cy, { size: size, align: 'left', halo: false, color: MLUI.colors.ink });
    });
    return [x, y, x + bw, y + bh];
  };
  /* 凡例（HTML．.legend の中に小さな SVG の見本を並べる）．items は MLUI.legend と同じ */
  MLUI.legendHTML = function (container, items) {
    container.innerHTML = '';
    container.classList.add('legend');
    items.forEach(function (it) {
      var kind = it.kind || (it.shape && !it.dash && it.width === undefined ? 'marker' : 'line');
      var svg = '<svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true" focusable="false">';
      if (kind === 'band') {
        svg += '<rect x="1" y="2" width="24" height="8" fill="' + it.color + '" fill-opacity="' + (it.alpha == null ? 0.25 : it.alpha) + '"/>';
        if (it.hatch) svg += svgHatch(1, 2, 24, 8, it.color);   /* 斜線の見本（canvas の band の hatch:true と対応） */
      }
      if (kind === 'line' || kind === 'linemarker') svg += '<line x1="1" y1="6" x2="25" y2="6" stroke="' + it.color + '" stroke-width="' + (it.width || 2) + '"' + ((it.dash && it.dash.length) ? ' stroke-dasharray="' + it.dash.join(',') + '"' : '') + '/>';
      if (kind === 'marker' || kind === 'linemarker') svg += svgMarker(it.shape || 'circle', 13, 6, 3.6, it.color, it.fill === undefined ? true : it.fill);
      svg += '</svg>';
      var s = MLUI.el('span', 'lg', svg + '<span>' + it.label + '</span>');
      container.appendChild(s);
    });
  };
  /* 矩形 (x, y, w, h) の中の右上がりの斜線（間隔 4，傾き 1）．clipPath を使わず端で切る */
  function svgHatch(x, y, w, h, col) {
    var d = '', gap = 4;
    for (var k = x - h; k < x + w; k += gap) {
      var xa = k, ya = y + h, xb = k + h, yb = y;
      if (xa < x) { ya -= (x - xa); xa = x; }
      if (xb > x + w) { yb += (xb - (x + w)); xb = x + w; }
      if (xb - xa > 0.2) d += 'M' + xa.toFixed(2) + ' ' + ya.toFixed(2) + 'L' + xb.toFixed(2) + ' ' + yb.toFixed(2);
    }
    return '<path d="' + d + '" stroke="' + col + '" stroke-width="1" stroke-opacity="0.75" fill="none"/>';
  }
  function svgMarker(shape, x, y, r, col, fill) {
    var f = fill === false ? '#fff' : (typeof fill === 'string' ? fill : col), st = ' stroke="' + (fill === false ? col : '#fff') + '" stroke-width="1.2"';
    switch (shape) {
      case 'square': return '<rect x="' + (x - r) + '" y="' + (y - r) + '" width="' + 2 * r + '" height="' + 2 * r + '" fill="' + f + '"' + st + '/>';
      case 'triangle': return '<polygon points="' + x + ',' + (y - r * 1.15) + ' ' + (x + r) + ',' + (y + r * 0.8) + ' ' + (x - r) + ',' + (y + r * 0.8) + '" fill="' + f + '"' + st + '/>';
      case 'triangleDown': return '<polygon points="' + x + ',' + (y + r * 1.15) + ' ' + (x + r) + ',' + (y - r * 0.8) + ' ' + (x - r) + ',' + (y - r * 0.8) + '" fill="' + f + '"' + st + '/>';
      case 'diamond': return '<polygon points="' + x + ',' + (y - r * 1.25) + ' ' + (x + r) + ',' + y + ' ' + x + ',' + (y + r * 1.25) + ' ' + (x - r) + ',' + y + '" fill="' + f + '"' + st + '/>';
      case 'cross': return '<path d="M' + (x - r) + ' ' + (y - r) + 'L' + (x + r) + ' ' + (y + r) + 'M' + (x + r) + ' ' + (y - r) + 'L' + (x - r) + ' ' + (y + r) + '" stroke="' + col + '" stroke-width="2"/>';
      case 'plus': return '<path d="M' + (x - r) + ' ' + y + 'L' + (x + r) + ' ' + y + 'M' + x + ' ' + (y - r) + 'L' + x + ' ' + (y + r) + '" stroke="' + col + '" stroke-width="2"/>';
      default: return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + f + '"' + st + '/>';
    }
  }

  /* =================================================================
     操作部品
     ================================================================= */
  /* 間引き：rAF 1 回に 1 度（裏タブ・iframe で rAF が止まっても 120 ms の保険で動く） */
  MLUI.throttle = function (fn) {
    var pend = false, raf = 0, to = 0, lastArgs = null;
    function run() { if (!pend) return; pend = false; cancelAnimationFrame(raf); clearTimeout(to); fn.apply(null, lastArgs); }
    return function () { lastArgs = arguments; if (pend) return; pend = true; raf = requestAnimationFrame(run); to = setTimeout(run, 120); };
  };

  /* スライダー．opt: {label（HTML 可）, min, max, step, value, fmt(v)→表示文字, unit, hint, log(true なら値は 10^つまみ),
     onInput(v)（間引き済み）, onChange(v)（離したとき）, id}
     戻り値 {el, input, get(), set(v, silent), out} */
  MLUI.range = function (opt) {
    var id = opt.id || MLUI.uid('rg');
    var wrap = MLUI.el('div', 'ctl');
    var lab = MLUI.el('label', 'ctlhead', opt.label); lab.setAttribute('for', id);
    var row = MLUI.el('div', 'ctlrow');
    var inp = document.createElement('input'); inp.type = 'range'; inp.id = id;
    var log = !!opt.log;
    var toPos = function (v) { return log ? Math.log10(v) : v; }, fromPos = function (p) { return log ? Math.pow(10, p) : p; };
    inp.min = log ? Math.log10(opt.min) : opt.min; inp.max = log ? Math.log10(opt.max) : opt.max;
    inp.step = opt.step != null ? opt.step : 'any';
    inp.value = toPos(opt.value);
    var out = MLUI.el('output', 'val'); out.setAttribute('for', id);
    row.appendChild(inp); row.appendChild(out);
    wrap.appendChild(lab); wrap.appendChild(row);
    if (opt.hint) wrap.appendChild(MLUI.el('span', 'hint', opt.hint));
    var fmt = opt.fmt || function (v) { return MLUI.fmt(v, 3); };
    var api = {
      el: wrap, input: inp, out: out,
      get: function () { var v = fromPos(parseFloat(inp.value)); return MLUI.clamp(v, opt.min, opt.max); },
      set: function (v, silent) { inp.value = toPos(MLUI.clamp(v, opt.min, opt.max)); show(); if (!silent && opt.onInput) opt.onInput(api.get()); },
      /* 作成後に範囲を変える（2026-11-12 L2）．r: {min, max, step, value}（省いた項目はそのまま．log のときも実際の値で）．
         いまの値（または r.value）を新しい範囲に clamp する．値が変わり silent でなければ onInput を呼ぶ．戻り値は新しい値 */
      setRange: function (r, silent) {
        r = r || {}; var before = api.get();
        if (r.min != null) opt.min = r.min; if (r.max != null) opt.max = r.max;
        if (opt.min > opt.max) { var tmp = opt.min; opt.min = opt.max; opt.max = tmp; }
        if (r.step !== undefined) opt.step = r.step;
        var want = MLUI.clamp(r.value != null ? r.value : before, opt.min, opt.max);
        inp.min = toPos(opt.min); inp.max = toPos(opt.max);
        inp.step = opt.step != null ? opt.step : 'any';
        inp.value = toPos(want);
        show();
        var now = api.get();
        if (!silent && now !== before && opt.onInput) opt.onInput(now);
        return now;
      },
      range: function () { return { min: opt.min, max: opt.max, step: opt.step }; }
    };
    function show() { var s = fmt(api.get()) + (opt.unit ? ' ' + opt.unit : ''); out.textContent = s; inp.setAttribute('aria-valuetext', s); }
    var th = MLUI.throttle(function () { if (opt.onInput) opt.onInput(api.get()); });
    inp.addEventListener('input', function () { show(); th(); });
    inp.addEventListener('change', function () { show(); if (opt.onChange) opt.onChange(api.get()); });
    show();
    return api;
  };
  /* 既存の <input type=range> に表示と間引きを付ける．opt: {out（表示する要素）, fmt, unit, onInput, log} */
  MLUI.bindRange = function (inp, opt) {
    opt = opt || {};
    var fmt = opt.fmt || function (v) { return MLUI.fmt(v, 3); };
    var get = function () { var p = parseFloat(inp.value); return opt.log ? Math.pow(10, p) : p; };
    var show = function () { var s = fmt(get()) + (opt.unit ? ' ' + opt.unit : ''); if (opt.out) opt.out.textContent = s; inp.setAttribute('aria-valuetext', s); };
    var th = MLUI.throttle(function () { if (opt.onInput) opt.onInput(get()); });
    inp.addEventListener('input', function () { show(); th(); });
    show();
    return { get: get, set: function (v, silent) { inp.value = opt.log ? Math.log10(v) : v; show(); if (!silent && opt.onInput) opt.onInput(get()); }, show: show };
  };
  /* 数値欄（範囲外は clamp．整数指定可）．opt: {label, min, max, step, value, int, onChange(v), width} */
  MLUI.number = function (opt) {
    var id = opt.id || MLUI.uid('nb');
    var wrap = MLUI.el('div', 'ctl ctl-num');
    var lab = MLUI.el('label', 'ctlhead', opt.label); lab.setAttribute('for', id);
    var inp = document.createElement('input'); inp.type = 'number'; inp.id = id; inp.className = 'num';
    if (opt.min != null) inp.min = opt.min; if (opt.max != null) inp.max = opt.max; inp.step = opt.step != null ? opt.step : (opt.int ? 1 : 'any');
    inp.value = opt.value; if (opt.width) inp.style.width = opt.width;
    inp.setAttribute('inputmode', opt.int ? 'numeric' : 'decimal');
    wrap.appendChild(lab); var row = MLUI.el('div', 'ctlrow'); row.appendChild(inp); wrap.appendChild(row);
    var last = opt.value;
    function read() {
      var v = parseFloat(inp.value);
      if (!isFinite(v)) v = last;
      if (opt.int) v = Math.round(v);
      if (opt.min != null) v = Math.max(opt.min, v); if (opt.max != null) v = Math.min(opt.max, v);
      return v;
    }
    inp.addEventListener('change', function () { var v = read(); inp.value = v; last = v; if (opt.onChange) opt.onChange(v); });
    return { el: wrap, input: inp, row: row, get: read, set: function (v, silent) { inp.value = v; last = read(); if (!silent && opt.onChange) opt.onChange(last); } };
  };
  /* ピル（排他的な選択．aria-pressed）．opt: {label, options:[{value,label,title}], value, onChange(v)} */
  MLUI.pills = function (opt) {
    var wrap = MLUI.el('div', 'ctl');
    var gid = MLUI.uid('pl');
    if (opt.label) { var h = MLUI.el('div', 'ctlhead', opt.label); h.id = gid; wrap.appendChild(h); }
    var box = MLUI.el('div', 'pills'); box.setAttribute('role', 'group'); if (opt.label) box.setAttribute('aria-labelledby', gid);
    var cur = opt.value, btns = [];
    opt.options.forEach(function (o) {
      var b = MLUI.el('button', 'pill', o.label); b.type = 'button'; b.dataset.value = String(o.value); if (o.title) b.title = o.title;
      b.addEventListener('click', function () { api.set(o.value); });
      btns.push(b); box.appendChild(b);
    });
    wrap.appendChild(box);
    function sync() { btns.forEach(function (b) { var on = b.dataset.value === String(cur); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
    var api = { el: wrap, buttons: btns, get: function () { return cur; }, set: function (v, silent) { cur = v; sync(); if (!silent && opt.onChange) opt.onChange(v); } };
    sync();
    return api;
  };
  /* セレクト．opt: {label, options:[{value,label}], value, onChange(v)} */
  MLUI.select = function (opt) {
    var id = opt.id || MLUI.uid('sl');
    var wrap = MLUI.el('div', 'ctl');
    var lab = MLUI.el('label', 'ctlhead', opt.label); lab.setAttribute('for', id);
    var s = document.createElement('select'); s.id = id; s.className = 'wide';
    opt.options.forEach(function (o) { var op = document.createElement('option'); op.value = String(o.value); op.textContent = o.label; s.appendChild(op); });
    s.value = String(opt.value);
    s.addEventListener('change', function () { if (opt.onChange) opt.onChange(s.value); });
    wrap.appendChild(lab); wrap.appendChild(s);
    return { el: wrap, input: s, get: function () { return s.value; }, set: function (v, silent) { s.value = String(v); if (!silent && opt.onChange) opt.onChange(s.value); } };
  };
  /* チェックボックス．opt: {label, checked, onChange(bool)} */
  MLUI.check = function (opt) {
    var id = opt.id || MLUI.uid('ck');
    var wrap = MLUI.el('div', 'ctlrow chk');
    var inp = document.createElement('input'); inp.type = 'checkbox'; inp.id = id; inp.checked = !!opt.checked;
    var lab = MLUI.el('label', '', opt.label); lab.setAttribute('for', id);
    wrap.appendChild(inp); wrap.appendChild(lab);
    inp.addEventListener('change', function () { if (opt.onChange) opt.onChange(inp.checked); });
    return { el: wrap, input: inp, get: function () { return inp.checked; }, set: function (v, silent) { inp.checked = !!v; if (!silent && opt.onChange) opt.onChange(inp.checked); } };
  };
  /* ボタン．opt: {cls（既定 'btn'）, title, primary} */
  MLUI.button = function (label, onClick, opt) {
    opt = opt || {};
    var b = MLUI.el('button', (opt.cls || 'btn') + (opt.primary ? ' on' : ''), label); b.type = 'button';
    if (opt.title) b.title = opt.title;
    if (opt.ariaLabel) b.setAttribute('aria-label', opt.ariaLabel);
    b.addEventListener('click', onClick);
    return b;
  };
  /* ボタンを横に並べる箱 */
  MLUI.buttonRow = function (buttons, cls) { var d = MLUI.el('div', 'pills ' + (cls || '')); buttons.forEach(function (b) { d.appendChild(b); }); return d; };

  /* 状態の文（aria-live）．kind: 'info'|'warn'|'ok' */
  MLUI.status = function (elm, text, kind) {
    if (!elm) return;
    elm.textContent = text || '';
    elm.className = 'msg' + (kind ? ' ' + kind : '') + (text ? '' : ' empty');
  };
  /* 値に NaN・Infinity があれば msgEl に理由を書いて false を返す */
  MLUI.guardFinite = function (values, msgEl, what) {
    var ok = true;
    (function walk(v) { if (!ok) return; if (typeof v === 'number') { if (!isFinite(v)) ok = false; } else if (v && v.length !== undefined) for (var i = 0; i < v.length; i++) walk(v[i]); })(values);
    if (!ok) MLUI.status(msgEl, '計算を止めました：' + (what || '計算結果') + 'に NaN または無限大が出ました．パラメーター（学習率・幅など）を小さくして，やり直してください．', 'warn');
    return ok;
  };

  /* seed 欄．opt: {value, defaultSeed, onChange(seed, reason)}．reason は 'same'|'next'|'default'|'input'
     「同じ seed でやり直す」「seed を変える」（seed+1）「既定に戻す」 */
  MLUI.seedBox = function (opt) {
    var id = MLUI.uid('seed'), def = opt.defaultSeed != null ? opt.defaultSeed : opt.value;
    var wrap = MLUI.el('div', 'ctl seedbox');
    var lab = MLUI.el('label', 'ctlhead', '乱数の seed'); lab.setAttribute('for', id);
    var inp = document.createElement('input'); inp.type = 'number'; inp.id = id; inp.className = 'num seed'; inp.min = 0; inp.max = 4294967295; inp.step = 1; inp.value = opt.value;
    inp.setAttribute('inputmode', 'numeric');
    var cur = opt.value;
    function read() { var v = Math.round(parseFloat(inp.value)); if (!isFinite(v)) v = cur; v = Math.max(0, Math.min(4294967295, v)); return v; }
    function fire(reason) { inp.value = cur; if (opt.onChange) opt.onChange(cur, reason); }
    inp.addEventListener('change', function () { cur = read(); fire('input'); });
    var row = MLUI.el('div', 'ctlrow'); row.appendChild(inp);
    var bs = MLUI.el('div', 'pills');
    bs.appendChild(MLUI.button('同じ seed でやり直す', function () { cur = read(); fire('same'); }));
    bs.appendChild(MLUI.button('seed を変える', function () { cur = (read() + 1) % 4294967296; fire('next'); }));
    bs.appendChild(MLUI.button('既定に戻す', function () { cur = def; fire('default'); }, { title: '既定の seed ' + def }));
    wrap.appendChild(lab); wrap.appendChild(row); wrap.appendChild(bs);
    return { el: wrap, input: inp, get: function () { return cur; }, set: function (v, silent) { cur = v; inp.value = v; if (!silent && opt.onChange) opt.onChange(v, 'input'); } };
  };

  /* 実行・停止・1 ステップ・やり直し（時間分割）．
     opt: {step()（1 回進める．false を返すと終了）, draw()（コマの終わりに 1 回）, reset()（やり直し）,
           maxSteps（上限．既定 Infinity）, budgetMs（1 コマの上限．既定 12）, stepsPerFrame（1 コマの回数の上限．既定 Infinity）,
           isVisible()（false なら一時停止．既定は常に true）, onState(state)（'run'|'stop'|'done'|'limit'|'pause'）,
           labels:{run, stop, step, reset}, stepLabel, status（状態を書く要素．省略時は内部に作る）}
     戻り値 {el, run, stop, toggle, stepOnce, reset, isRunning(), steps()} */
  MLUI.runner = function (opt) {
    var L = Object.assign({ run: '実行', stop: '停止', step: '1 ステップ', reset: 'やり直す' }, opt.labels || {});
    var budget = opt.budgetMs || 12, maxSteps = opt.maxSteps || Infinity, spf = opt.stepsPerFrame || Infinity;
    var running = false, raf = 0, nsteps = 0, state = 'stop';
    var el = MLUI.el('div', 'runner');
    var bRun = MLUI.button(L.run, function () { api.toggle(); }, { cls: 'btn primary-run' });
    bRun.setAttribute('aria-pressed', 'false');
    var bStep = MLUI.button(L.step, function () { api.stepOnce(); });
    var bReset = MLUI.button(L.reset, function () { api.reset(); });
    el.appendChild(MLUI.buttonRow([bRun, bStep, bReset]));
    var st = opt.status || MLUI.el('div', 'msg empty');
    st.setAttribute('aria-live', 'polite');
    if (!opt.status) el.appendChild(st);
    function setState(s, text) {
      state = s; running = (s === 'run');
      bRun.textContent = running ? L.stop : L.run; bRun.setAttribute('aria-pressed', running ? 'true' : 'false');
      bRun.classList.toggle('on', running);
      if (text !== undefined) MLUI.status(st, text, s === 'limit' || s === 'error' ? 'warn' : '');
      if (opt.onState) opt.onState(s);
    }
    function visible() { return (opt.isVisible ? opt.isVisible() : true) && !document.hidden; }
    function frame() {
      raf = 0;
      if (!running) return;
      if (!visible()) { setState('pause', '画面が隠れたので一時停止しました．「' + L.run + '」で再開します．'); return; }
      var t0 = performance.now(), k = 0, cont = true;
      while (k < spf && performance.now() - t0 < budget) {
        if (nsteps >= maxSteps) { cont = false; setState('limit', '計算量の上限（' + MLUI.fmtInt(maxSteps) + ' 回）に達したので止めました．'); break; }
        var r = opt.step(); nsteps++; k++;
        if (r === false) { cont = false; if (state === 'run') setState('done', '終了しました（' + MLUI.fmtInt(nsteps) + ' 回）．'); break; }
      }
      if (opt.draw) opt.draw();
      if (cont && running) raf = requestAnimationFrame(frame);
    }
    var api = {
      el: el, status: st, buttons: { run: bRun, step: bStep, reset: bReset },
      run: function () { if (running) return; if (nsteps >= maxSteps) { setState('limit', '計算量の上限（' + MLUI.fmtInt(maxSteps) + ' 回）に達しています．「' + L.reset + '」で最初から．'); return; } setState('run', '実行中です．'); raf = requestAnimationFrame(frame); },
      stop: function () { if (raf) cancelAnimationFrame(raf); raf = 0; if (running) setState('stop', '停止しました（' + MLUI.fmtInt(nsteps) + ' 回）．'); },
      toggle: function () { if (running) api.stop(); else api.run(); },
      stepOnce: function () { api.stop(); if (nsteps >= maxSteps) { setState('limit', '計算量の上限に達しています．'); return; } var r = opt.step(); nsteps++; if (opt.draw) opt.draw(); MLUI.status(st, (r === false ? '終了しました' : '1 ステップ進めました') + '（' + MLUI.fmtInt(nsteps) + ' 回）．'); },
      reset: function () { api.stop(); nsteps = 0; if (opt.reset) opt.reset(); if (opt.draw) opt.draw(); setState('stop', ''); },
      isRunning: function () { return running; }, steps: function () { return nsteps; }, setSteps: function (n) { nsteps = n; }
    };
    document.addEventListener('visibilitychange', function () { if (document.hidden && running) { api.stop(); setState('pause', '画面が隠れたので一時停止しました．'); } });
    return api;
  };

  /* =================================================================
     ページの立ち上げ：タブ・埋め込み・高さの通知
     ================================================================= */
  var lastPosted = 0;
  MLUI.postHeight = function () {
    if (window.parent === window) return;
    var h = Math.ceil(document.documentElement.getBoundingClientRect().height) + 8;
    if (Math.abs(h - lastPosted) < 2) return;
    lastPosted = h;
    try { window.parent.postMessage({ qsim: 'height', height: h }, '*'); } catch (e) { /* 親が受け取らなくてもよい */ }
  };
  MLUI.postHeightLater = function () { setTimeout(MLUI.postHeight, 30); };
  /* URL を読む：{embed, only, hash}．only は keys に含まれるときだけ有効 */
  MLUI.readURL = function (keys) {
    var q = location.search, only = null;
    var m = /[?&]only=([A-Za-z0-9_-]+)/.exec(q); if (m && keys.indexOf(m[1]) >= 0) only = m[1];
    var embed = /[?&]embed=1/.test(q) || !!only;
    var h = location.hash.replace('#', ''); if (keys.indexOf(h) < 0) h = null;
    return { embed: embed, only: only, hash: h };
  };

  /* 立ち上げ．app = #qsim の要素．
     opt: {panels: {key: function(panelEl) → sim}, initial: 既定のタブ key}
     sim は {update()（描き直し）, show?()（タブが表に出た）, hide?()（裏に回った）} を持つ．
     ・?embed=1 → .is-embed（h1・lead を隠し，section.about の details.aboutfold を閉じる）
     ・?only=key → そのタブだけ（他のパネルは DOM から外す）．#key → タブ選択
     ・タブは role=tablist/tab，aria-selected，aria-controls，←→ Home End で移動
     ・resize・ResizeObserver で update，load・resize・タブ切替・details の開閉で postHeight
     戻り値 {sims, select(key), active()} */
  MLUI.boot = function (app, opt) {
    var keys = Object.keys(opt.panels);
    var url = MLUI.readURL(keys);
    if (url.embed) app.classList.add('is-embed');
    if (url.only) app.classList.add('is-single');
    if (MLUI.reducedMotion()) app.classList.add('reduced-motion');
    if (opt.fixSup !== false) MLUI.watchSup(app);   /* 上付きの「⁻」を <sup>−…</sup> で見せる（textContent は変えない） */
    MLUI.$$(app, 'details.aboutfold').forEach(function (d) { d.open = !url.embed; });
    var sims = {}, tabs = MLUI.$$(app, '.tabs .tab'), tablist = MLUI.$(app, '.tabs');
    if (tablist) tablist.setAttribute('role', 'tablist');
    keys.forEach(function (k) {
      var p = MLUI.$(app, '[data-panel="' + k + '"]'); if (!p) return;
      if (url.only && url.only !== k) { p.parentNode.removeChild(p); return; }
      p.id = p.id || 'panel-' + k; p.setAttribute('role', 'tabpanel');
      try { sims[k] = opt.panels[k](p) || { update: function () {} }; }
      catch (e) { p.insertBefore(MLUI.el('p', 'msg warn', '初期化に失敗しました：' + (e && e.message ? e.message : e)), p.firstChild); if (window.console) console.error(e); sims[k] = { update: function () {} }; }
      sims[k].root = p;
    });
    tabs.forEach(function (t) {
      var k = t.dataset.tab; t.setAttribute('role', 'tab'); t.type = 'button';
      t.id = t.id || 'tab-' + k;
      var p = MLUI.$(app, '[data-panel="' + k + '"]'); if (p) { t.setAttribute('aria-controls', p.id); p.setAttribute('aria-labelledby', t.id); }
      if (!sims[k]) t.hidden = true;
    });
    var active = url.only || url.hash || (opt.initial && sims[opt.initial] ? opt.initial : keys.filter(function (k) { return sims[k]; })[0]);
    function select(k, focus) {
      if (!sims[k]) return;
      var prev = active; active = k;
      tabs.forEach(function (t) { var on = t.dataset.tab === k; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
      MLUI.$$(app, '.panel').forEach(function (p) { p.hidden = p.dataset.panel !== k; });
      if (prev && prev !== k && sims[prev] && sims[prev].hide) sims[prev].hide();
      if (sims[k].show) sims[k].show();
      sims[k].update();
      MLUI.postHeightLater();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t.dataset.tab); if (!url.only && history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#' + active); });
      t.addEventListener('keydown', function (e) {
        var vis = tabs.filter(function (x) { return !x.hidden; }), j = vis.indexOf(t), n = vis.length, to = -1;
        if (e.key === 'ArrowRight') to = (j + 1) % n; else if (e.key === 'ArrowLeft') to = (j - 1 + n) % n; else if (e.key === 'Home') to = 0; else if (e.key === 'End') to = n - 1;
        if (to >= 0) { e.preventDefault(); select(vis[to].dataset.tab, true); if (!url.only && history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#' + active); }
      });
    });
    select(active);
    if (!url.only) window.addEventListener('hashchange', function () { var h = location.hash.replace('#', ''); if (sims[h] && h !== active) select(h); });
    var rz = 0;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (sims[active]) sims[active].update(); MLUI.postHeight(); }, 80); });
    if (window.ResizeObserver) {
      Object.keys(sims).forEach(function (k) {
        var last = 0, t = 0;
        var ro = new ResizeObserver(function (en) { var w = Math.round(en[0].contentRect.width); if (!w || w === last) return; last = w; clearTimeout(t); t = setTimeout(function () { if (!sims[k].root.hidden) sims[k].update(); }, 60); });
        ro.observe(sims[k].root);
      });
      var lastH = 0; new ResizeObserver(function () { var h = document.documentElement.scrollHeight; if (h !== lastH) { lastH = h; MLUI.postHeight(); } }).observe(document.body);
    }
    window.addEventListener('load', MLUI.postHeight);
    window.addEventListener('pageshow', MLUI.postHeight);
    app.addEventListener('toggle', function () { setTimeout(MLUI.postHeight, 20); }, true);
    app.sims = sims;
    return { sims: sims, select: select, active: function () { return active; }, url: url };
  };

  root.MLUI = MLUI;
})(typeof window !== 'undefined' ? window : this);
