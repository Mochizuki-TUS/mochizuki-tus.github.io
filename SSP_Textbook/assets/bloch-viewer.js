/* bloch-viewer.js — 付録C「Bloch状態」§C.8 動かして確かめる（対話型ビューア）
 * 使い方：<div id="bloch-viewer" class="bloch-viewer"></div> と <script src="assets/bloch-viewer.js" defer></script> を置くだけ．
 * 素の JavaScript（外部ライブラリなし，グローバル変数なし）．フォノンのデータは phonon_modes.json の home_cell_stamp.u を小数4桁に丸めて埋め込み．
 * 約束：k は分率座標，位相は胞の格子ベクトル R で付ける exp[2πi(k1 n1 + k2 n2 + k3 n3)]（同じ胞の原子は同じ位相）．
 */
(function () {
'use strict';

var PI = Math.PI, TAU = 2 * PI;
var FONT = '"Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans JP",sans-serif';
var C = { acc: '#7b2d3b', blue: '#1f4e79', amber: '#c98a1a', green: '#2e8b57', red: '#c0392b', gray: '#999999', ink: '#333333',
          pos: '#ffeb3b', posE: '#b59a00', neg: '#26c6da', negE: '#0f8a99', sr: '#00c000', ti: '#8a9bb0', o: '#e03030', rule: '#d5dbdb' };

/* ---- フォノンのデータ（W/data/phonon_modes.json の home_cell_stamp.u，順序 Sr, Ti, O(1/2,0,1/2), O(1/2,1/2,0), O(0,1/2,1/2)）----
   胞 R の原子 kappa の変位 u = stamp[kappa] * cos(2π k·R)（最大の原子変位 = 1 に規格化）．G は z 偏極（G_polar_z）． */
var ST = {
  "G": [[0, 0, 0.2722], [0, 0, 0.4913], [0, 0, -1], [0, 0, -0.9395], [0, 0, -1]],
  "X": [[0, 1, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, -0.0327, 0]],
  "M": [[0, 0, 0], [0, 0, 0], [1, 0, 0], [0, 0, 0], [0, -1, 0]],
  "R": [[0, 0, 0], [0, 0, 0], [1, 0, 0], [0, 0, 0], [0, -1, 0]]
};
var A_CALC = 3.8995;   /* 計算に使った格子定数 (Å) */
var OMEGA = 0.5129;    /* 八面体の回転 (rad per Å of the largest O displacement) = 29.39 deg/Å */
var KOF = [4, 2, 3];   /* 軸 x,y,z に沿って Ti から出る O の kappa */
var MODES = [
  { key: 'G', btn: 'Γ　極性モード', k: [0, 0, 0], thz: 2.6646, cm: 88.9, imag: false, deg: 3, rot: false,
    head: 'Γ (0, 0, 0)：最低の光学モード（極性モード，T<sub>1u</sub>，3 重縮退）',
    irr: 'Sr 原点：Γ<sub>4</sub><sup>−</sup>（T<sub>1u</sub>），Ti 原点：Γ<sub>4</sub><sup>−</sup>（T<sub>1u</sub>）',
    txt: 'どの胞も同じ動き（位相 +1）．陽イオン（Sr，Ti）が同じ向きに，酸素 6 個が逆向きに動く（変位の比は Sr +0.27，Ti +0.49，O −0.94〜−1.00）．この計算（機械学習ポテンシャル，0 K，調和近似）では振動数は正で安定．実験で温度を下げると軟化する「ソフトモード」に当たる．' },
  { key: 'X', btn: 'X　最低モード', k: [0.5, 0, 0], thz: 3.1525, cm: 105.2, imag: false, deg: 2, rot: false,
    head: 'X (½, 0, 0)：最低モード（2 重縮退）の y 偏極',
    irr: 'Sr 原点：X<sub>5</sub><sup>−</sup>（E<sub>u</sub>），Ti 原点：X<sub>5</sub><sup>+</sup>（E<sub>g</sub>）',
    txt: 'k は x 方向なので横波．Sr が主に動き（運動エネルギーの 99.98%），Ti は動かない．x 方向に隣の胞へ移るたびに符号が反転し，y，z 方向の隣は同じ向き．' },
  { key: 'M', btn: 'M　八面体の回転', k: [0.5, 0.5, 0], thz: 1.7231, cm: 57.5, imag: false, deg: 1, rot: true,
    glazer: 'a<sup>0</sup>a<sup>0</sup>c<sup>+</sup>',
    head: 'M (½, ½, 0)：酸素八面体の z 軸まわりの回転（1 重）',
    irr: 'Sr 原点：M<sub>2</sub><sup>+</sup>（B<sub>1g</sub>），Ti 原点：M<sub>3</sub><sup>+</sup>（A<sub>2g</sub>）',
    txt: '酸素八面体が剛体のように回る．ab 面内では隣どうしが逆回転（k<sub>1</sub> = k<sub>2</sub> = ½）で，c 方向には同じ向きに積む．Sr と Ti は動かない．この計算では振動数は正で安定．' },
  { key: 'R', btn: 'R　八面体の回転', k: [0.5, 0.5, 0.5], thz: -1.0882, cm: -36.3, imag: true, deg: 3, rot: true,
    glazer: 'a<sup>0</sup>a<sup>0</sup>c<sup>−</sup>',
    head: 'R (½, ½, ½)：最低モード（3 重縮退）のうち z 軸まわりの回転',
    irr: 'Sr 原点：R<sub>5</sub><sup>−</sup>（T<sub>2u</sub>），Ti 原点：R<sub>4</sub><sup>+</sup>（T<sub>1g</sub>）',
    txt: 'ab 面内でも c 方向でも，隣どうしが逆回転．Sr と Ti は動かない．振動数が虚数（不安定）で，凍結すると I4/mcm になる（SrTiO<sub>3</sub> の 105 K 付近の構造相転移）．' }
];

/* ---- 軌道：葉（楕円体）の集まりで描く．長さの単位は格子定数 a ---- */
function mkLobe(dir, sg, Lc, Ws) {
  var n = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]), d = [dir[0] / n, dir[1] / n, dir[2] / n];
  return { c: [d[0] * Lc, d[1] * Lc, d[2] * Lc], d: d, al: Lc, as: Ws, sg: sg };
}
var LP = 0.19, WP = 0.12, LD = 0.19, WD = 0.115;
function dLobes(plane, f) {
  var o = [], s = [1, -1], i, j;
  for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) {
    var a = s[i], b = s[j];
    o.push(mkLobe(plane === 'xy' ? [a, b, 0] : plane === 'yz' ? [0, a, b] : [a, 0, b], a * b, LD, WD));
  }
  return o;
}
var ORB = {
  s:   { kind: 's', lab: 's', lobes: [{ c: [0, 0, 0], d: [0, 0, 1], al: 0.29, as: 0.29, sg: 1 }] },
  px:  { kind: 'p', ax: 0, lab: 'p<sub>x</sub>', lobes: [mkLobe([1, 0, 0], 1, LP, WP), mkLobe([-1, 0, 0], -1, LP, WP)] },
  py:  { kind: 'p', ax: 1, lab: 'p<sub>y</sub>', lobes: [mkLobe([0, 1, 0], 1, LP, WP), mkLobe([0, -1, 0], -1, LP, WP)] },
  pz:  { kind: 'p', ax: 2, lab: 'p<sub>z</sub>', lobes: [mkLobe([0, 0, 1], 1, LP, WP), mkLobe([0, 0, -1], -1, LP, WP)] },
  dxy: { kind: 'd', lab: 'd<sub>xy</sub>', lobes: dLobes('xy') },
  dyz: { kind: 'd', lab: 'd<sub>yz</sub>', lobes: dLobes('yz') },
  dxz: { kind: 'd', lab: 'd<sub>xz</sub>', lobes: dLobes('xz') },
  dx2: { kind: 'd', lab: 'd<sub>x²−y²</sub>', lobes: [mkLobe([1, 0, 0], 1, LD, WD), mkLobe([-1, 0, 0], 1, LD, WD), mkLobe([0, 1, 0], -1, LD, WD), mkLobe([0, -1, 0], -1, LD, WD)] },
  dz2: { kind: 'd', lab: 'd<sub>z²</sub>', lobes: [mkLobe([0, 0, 1], 1, 0.21, 0.12), mkLobe([0, 0, -1], 1, 0.21, 0.12)], ring: { R: 0.2, rt: 0.065, sg: -1 } }
};
var ORB_ORDER = ['s', 'px', 'py', 'pz', 'dxy', 'dyz', 'dxz', 'dx2', 'dz2'];
/* 最近接の飛び移り（模型の値）：s は t = −1，p は Vσ = +1（反結合的に効く），Vπ = −0.25 */
var VPP = { s: [-1, -1, -1], px: [1, -0.25, -0.25], py: [-0.25, 1, -0.25], pz: [-0.25, -0.25, 1] };

/* ---- 小道具 ---- */
function hexRGB(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
var RGB_POS = hexRGB(C.pos), RGB_NEG = hexRGB(C.neg);
function valRGB(v) {
  v = Math.max(-1, Math.min(1, v));
  var t = Math.abs(v), c = v >= 0 ? RGB_POS : RGB_NEG;
  return [255 + (c[0] - 255) * t, 255 + (c[1] - 255) * t, 255 + (c[2] - 255) * t];
}
function rgbStr(c, sh) { sh = sh == null ? 1 : sh; return 'rgb(' + Math.round(c[0] * sh) + ',' + Math.round(c[1] * sh) + ',' + Math.round(c[2] * sh) + ')'; }
function mk(tag, cls, html, parent) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function near(a, b) { return Math.abs(a - b) < 1e-6; }
function f2(x) { var s = (Math.abs(x) < 0.005 ? 0 : x).toFixed(2).replace('-', '−'); return (x > 0.005 ? '+' : '') + s; }
function f3(x) { return (Math.abs(x) < 0.0005 ? 0 : x).toFixed(3).replace('-', '−'); }
function degTxt(k) { var d = Math.round(k * 3600) / 10; return (d % 1 === 0 ? d.toFixed(0) : d.toFixed(1)) + '°'; }
function kTxt(k) { return '(' + f3(k[0]) + ', ' + f3(k[1]) + ', ' + f3(k[2]) + ')'; }
function kFrac(k) { return '(' + k.map(function (x) { return near(x, 0.5) ? '½' : (near(x, 0) ? '0' : f3(x)); }).join(', ') + ')'; }
function hsName(k) {
  if (near(k[0], 0) && near(k[1], 0) && near(k[2], 0)) return 'Γ';
  if (near(k[0], 0.5) && near(k[1], 0) && near(k[2], 0)) return 'X';
  if (near(k[0], 0.5) && near(k[1], 0.5) && near(k[2], 0)) return 'M';
  if (near(k[0], 0.5) && near(k[1], 0.5) && near(k[2], 0.5)) return 'R';
  return '';
}
function isStanding(k) { return k.every(function (x) { return near(x, 0) || near(x, 0.5); }); }
function dialSVG(k) {
  var th = TAU * k, r = 10.5, x = -r * Math.sin(th), y = -r * Math.cos(th);
  return '<svg class="bv-dial" width="26" height="26" viewBox="-13 -13 26 26" aria-hidden="true"><circle r="11.5" fill="#fff" stroke="#9aa" stroke-width="1"/>' +
    '<line x1="0" y1="0" x2="' + x.toFixed(2) + '" y2="' + y.toFixed(2) + '" stroke="#333" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="2" fill="#333"/><circle r="1.4" fill="#333"/></svg>';
}
function swatch(type) {
  var st = type === 'bond' ? 'stroke="' + C.green + '" stroke-width="3"' :
           type === 'anti' ? 'stroke="' + C.red + '" stroke-width="3" stroke-dasharray="5 3"' :
                             'stroke="' + C.gray + '" stroke-width="2.4" stroke-dasharray="1.5 3.5" stroke-linecap="round"';
  return '<svg class="bv-sw" width="30" height="10" viewBox="0 0 30 10" aria-hidden="true"><line x1="1" y1="5" x2="29" y2="5" ' + st + '/></svg>';
}

/* ---- k 点の経路 Γ–X–M–Γ–R–X | R–M（スライダー値 0..650，1 区間 = 100，X と R の間 50 は切れ目） ---- */
var PMAX = 650;
var NODES = [[0, 'Γ'], [100, 'X'], [200, 'M'], [300, 'Γ'], [400, 'R'], [500, 'X'], [550, 'R'], [650, 'M']];
var BTN_POS = { 'Γ': 0, 'X': 100, 'M': 200, 'R': 400 };
function kAt(p) {
  var t, s;
  p = clamp(p, 0, PMAX);
  if (p <= 500) {
    s = Math.min(4, Math.floor(p / 100)); t = (p - 100 * s) / 100;
    if (s === 0) return [t / 2, 0, 0];
    if (s === 1) return [0.5, t / 2, 0];
    if (s === 2) return [(1 - t) / 2, (1 - t) / 2, 0];
    if (s === 3) return [t / 2, t / 2, t / 2];
    return [0.5, (1 - t) / 2, (1 - t) / 2];
  }
  if (p < 550) return p < 525 ? [0.5, 0, 0] : [0.5, 0.5, 0.5];
  t = (p - 550) / 100;
  return [0.5, 0.5, (1 - t) / 2];
}
function segName(p) {
  if (p <= 500) return ['Γ–X', 'X–M', 'M–Γ', 'Γ–R', 'R–X'][Math.min(4, Math.floor(p / 100))];
  return p < 550 ? 'X | R の切れ目' : 'R–M';
}
function snapPos(p) {
  for (var i = 0; i < NODES.length; i++) if (Math.abs(p - NODES[i][0]) <= 3) return NODES[i][0];
  return p;
}
function bondInfo(orb, axis, k) {
  var V = VPP[orb]; if (!V) return null;
  var c = Math.cos(TAU * k[axis]), e = V[axis] * c;
  return { t: Math.abs(c) < 0.06 ? 'zero' : (e < 0 ? 'bond' : 'anti'), c: c, V: V[axis] };
}
function energyOf(orb, k) {
  var V = VPP[orb], E = 0, i; if (!V) return null;
  for (i = 0; i < 3; i++) E += 2 * V[i] * Math.cos(TAU * k[i]);
  return E;
}

/* ---- スタイル ---- */
var CSS = [
'.bv-root{font-family:' + FONT + ';font-size:.92rem;line-height:1.55;color:#1a202c;text-align:left;background:#fff;border:1px solid ' + C.rule + ';border-radius:10px;padding:10px 10px 12px;margin:1.2rem 0;max-width:100%;overflow:hidden;-webkit-text-size-adjust:100%}',
'.bv-root *{box-sizing:border-box}',
'.bv-root button{font:inherit;color:inherit;cursor:pointer;-webkit-appearance:none;appearance:none}',
'.bv-root sub,.bv-root sup{font-size:.72em;line-height:0}',
'.bv-root p{margin:.35rem 0}',
'.bv-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px;padding-bottom:8px;border-bottom:2px solid ' + C.acc + '}',
'.bv-tab{flex:1 1 auto;min-height:38px;padding:5px 12px;background:#fff;border:1px solid #c9b3b8;border-radius:8px;color:' + C.acc + ';font-weight:bold}',
'.bv-tab[aria-selected=true]{background:' + C.acc + ';border-color:' + C.acc + ';color:#fff}',
'.bv-btn{min-height:36px;min-width:38px;padding:4px 11px;background:#fff;border:1px solid #b8c0c8;border-radius:7px}',
'.bv-btn:hover{background:#f8eef0}',
'.bv-btn.bv-on{background:' + C.blue + ';border-color:' + C.blue + ';color:#fff}',
'.bv-btn.bv-play{background:#fdf8ee;border-color:' + C.amber + ';color:#7a4e00;font-weight:bold}',
'.bv-btn.bv-play.bv-on{background:' + C.amber + ';border-color:' + C.amber + ';color:#fff}',
'.bv-root button:focus-visible,.bv-root input:focus-visible,.bv-canvas:focus-visible{outline:2px solid ' + C.amber + ';outline-offset:2px}',
'.bv-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 8px}',
'.bv-lab{font-weight:bold;color:' + C.acc + ';margin-right:2px}',
'.bv-canvas{display:block;margin:0 auto;max-width:100%;touch-action:pan-y;background:#fff;border-radius:6px}',
'.bv-cap{display:block;border:1px solid ' + C.rule + ';border-radius:8px;margin:8px 0 0;padding:8px 10px;background:#fbfbfa}',
'.bv-root input[type=range]{display:block;width:100%;height:30px;margin:0;accent-color:' + C.acc + ';touch-action:pan-y}',
'.bv-sl{position:relative;margin:4px 0 0}',
'.bv-ticks{position:relative;height:20px;margin-top:-3px;font-size:.82rem;color:#4a5568}',
'.bv-ticks span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}',
'.bv-ticks .bv-brk{color:#aaa}',
'.bv-kinfo{margin:6px 0 0;font-size:.9rem}',
'.bv-kinfo b{color:' + C.acc + '}',
'.bv-dial{vertical-align:middle;margin:0 2px 0 6px}',
'.bv-tag{display:inline-block;padding:0 8px;border-radius:10px;font-size:.84rem;background:#eef4f9;color:' + C.blue + ';border:1px solid #c7d8e6}',
'.bv-tag.bv-stand{background:#fdf8ee;color:#7a4e00;border-color:#e6cf9c}',
'.bv-time{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0 0}',
'.bv-time input[type=range]{flex:1 1 140px;width:auto}',
'.bv-tv{min-width:5.2em;font-size:.88rem;color:#4a5568}',
'.bv-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin:8px 0 0;font-size:.84rem;color:#4a5568}',
'.bv-grad{display:inline-block;width:110px;height:12px;border:1px solid #888;border-radius:3px;vertical-align:middle;background:linear-gradient(90deg,' + C.neg + ',#fff,' + C.pos + ')}',
'.bv-sq{display:inline-block;width:12px;height:12px;border-radius:50%;vertical-align:-1px;margin-right:4px;border:1px solid rgba(0,0,0,.35)}',
'.bv-sw{vertical-align:middle;margin-right:4px}',
'.bv-chips{display:flex;flex-wrap:wrap;gap:6px 10px;margin:0 0 6px}',
'.bv-chip{display:inline-block;padding:2px 8px;border:1px solid ' + C.rule + ';border-radius:8px;background:#fff;font-size:.86rem}',
'.bv-chip small{color:#4a5568;font-size:.82rem}',
'.bv-ebar{position:relative;height:14px;margin:6px 0 2px;border-radius:7px;background:linear-gradient(90deg,#dcebf5,#fdf2ec);border:1px solid #c9d2d8}',
'.bv-ebar i{position:absolute;top:-4px;width:4px;height:20px;margin-left:-2px;border-radius:2px;background:' + C.acc + '}',
'.bv-eb-l{display:flex;justify-content:space-between;font-size:.78rem;color:#4a5568}',
'.bv-note{font-size:.84rem;color:#4a5568}',
'.bv-amp{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0 0}',
'.bv-amp input[type=range]{flex:1 1 140px;width:auto}',
'.bv-fm{font-style:italic}',
'@media (max-width:480px){.bv-root{padding:8px 6px 10px;font-size:.9rem}.bv-btn{padding:4px 9px}.bv-tab{padding:5px 6px;font-size:.88rem}}'
].join('\n');

function injectStyle() {
  if (document.getElementById('bv-style')) return;
  var st = document.createElement('style'); st.id = 'bv-style'; st.appendChild(document.createTextNode(CSS));
  document.head.appendChild(st);
}

/* =====================================================================
 *  ビューアの本体
 * ===================================================================== */
function build(root) {
  var probe = document.createElement('canvas');
  if (!probe.getContext || !probe.getContext('2d')) throw new Error('canvas が使えません');
  injectStyle();
  root.className = (root.className ? root.className + ' ' : '') + 'bv-root';
  root.innerHTML = '';

  var DEFY = -0.38, DEFP = 0.52;
  var S = { tab: 0, pos: 100, k: kAt(100), playing: false, phase: 0, yaw: DEFY, pitch: DEFP, explode: true,
            orb: 'px', view: 'top', mode: 0, amp: 0.3, pview: 'top' };
  var Ly = { w: 0, h1: 360, p: 190, p3: 190 };
  var TH = 44, GAP = 8;
  var raf = 0, lastT = 0;

  /* ---------- DOM ---------- */
  var tabs = mk('div', 'bv-tabs', null, root); tabs.setAttribute('role', 'tablist');
  var TABN = ['位相の模様', '軌道の Bloch 和', 'フォノン'];
  var tabBtn = TABN.map(function (n, i) {
    var b = mk('button', 'bv-tab', n, tabs); b.type = 'button'; b.setAttribute('role', 'tab');
    b.addEventListener('click', function () { activate(i); });
    return b;
  });
  var panes = [0, 1, 2].map(function () { var d = mk('div', 'bv-pane', null, root); d.setAttribute('role', 'tabpanel'); return d; });
  var stage = root;

  /* -- 共通：k の操作 -- */
  var kbox = mk('div', 'bv-kbox');
  var krow = mk('div', 'bv-row', '<span class="bv-lab">波数 k</span>', kbox);
  var kBtns = {};
  ['Γ', 'X', 'M', 'R'].forEach(function (n) {
    var b = mk('button', 'bv-btn', n, krow); b.type = 'button'; kBtns[n] = b;
    b.addEventListener('click', function () { setPos(BTN_POS[n]); });
  });
  mk('span', 'bv-note', '経路 Γ–X–M–Γ–R–X | R–M に沿って動かす', krow);
  var slWrap = mk('div', 'bv-sl', null, kbox);
  var slider = mk('input', null, null, slWrap); slider.type = 'range'; slider.min = 0; slider.max = PMAX; slider.step = 1; slider.value = S.pos;
  slider.setAttribute('aria-label', 'k 点の経路');
  var ticks = mk('div', 'bv-ticks', null, slWrap);
  NODES.forEach(function (nd) {
    var s = mk('span', null, nd[1], ticks); s.style.left = 'calc(8px + (100% - 16px) * ' + (nd[0] / PMAX).toFixed(5) + ')';
  });
  var brk = mk('span', 'bv-brk', '|', ticks); brk.style.left = 'calc(8px + (100% - 16px) * ' + (525 / PMAX).toFixed(5) + ')';
  slider.addEventListener('input', function () {
    var p = snapPos(+slider.value); if (p !== +slider.value) slider.value = p;
    setPos(p, true);
  });
  var kinfo = mk('div', 'bv-kinfo', null, kbox);

  /* -- 共通：時間 -- */
  var tbox = mk('div', 'bv-time');
  var playB = mk('button', 'bv-btn bv-play', '▶ 時間を進める', tbox); playB.type = 'button';
  var tsl = mk('input', null, null, tbox); tsl.type = 'range'; tsl.min = 0; tsl.max = 360; tsl.step = 1; tsl.value = 0; tsl.setAttribute('aria-label', '時間 ωt');
  var tval = mk('span', 'bv-tv', 'ωt = 0°', tbox);
  playB.addEventListener('click', function () { setPlaying(!S.playing); });
  tsl.addEventListener('input', function () { S.phase = (+tsl.value) * PI / 180; syncTime(); invalidate(); });

  /* -- タブ 1：位相の模様 -- */
  var p1 = panes[0];
  var r1 = mk('div', 'bv-row', null, p1);
  var exB = mk('button', 'bv-btn bv-on', '層を離して描く', r1); exB.type = 'button';
  var rvB = mk('button', 'bv-btn', '視点をもどす', r1); rvB.type = 'button';
  mk('span', 'bv-note', 'ドラッグで視点を回せます（スマホでは横になぞる）', r1);
  var cv1 = mk('canvas', 'bv-canvas', null, p1); cv1.tabIndex = 0; cv1.setAttribute('role', 'img');
  cv1.setAttribute('aria-label', '4×4×2 個の単位胞を Bloch の位相の実部で塗った斜投影図．各胞の上面に位相を示す時計の針がある．');
  var slot1k = mk('div', null, null, p1), slot1t = mk('div', null, null, p1);
  var leg1 = mk('div', 'bv-legend', '<span><span class="bv-grad"></span> 左：−1（シアン）／中：0（白）／右：+1（黄）</span>' +
    '<span><svg class="bv-dial" width="26" height="26" viewBox="-13 -13 26 26" aria-hidden="true"><circle r="11.5" fill="#fff" stroke="#9aa"/><line x1="0" y1="0" x2="0" y2="-10" stroke="#333" stroke-width="2" stroke-linecap="round"/><circle r="1.4" fill="#333"/></svg> 時計の針：位相 0 が 12 時（b 方向），反時計回りに回す．色 = 針の高さ</span>', p1);
  var info1 = mk('div', 'bv-cap', null, p1);
  exB.addEventListener('click', function () { S.explode = !S.explode; exB.className = 'bv-btn' + (S.explode ? ' bv-on' : ''); invalidate(); });
  rvB.addEventListener('click', function () { S.yaw = DEFY; S.pitch = DEFP; invalidate(); });

  /* -- タブ 2：軌道の Bloch 和 -- */
  var p2 = panes[1];
  var r2 = mk('div', 'bv-row', '<span class="bv-lab">軌道</span>', p2);
  var orbB = {};
  ORB_ORDER.forEach(function (n) {
    var b = mk('button', 'bv-btn', ORB[n].lab, r2); b.type = 'button'; orbB[n] = b;
    b.addEventListener('click', function () { S.orb = n; syncUI(); invalidate(); });
  });
  var r2b = mk('div', 'bv-row', '<span class="bv-lab">見る向き</span>', p2);
  var vB = {};
  [['top', '上から（c 軸）'], ['side', '横から（b 軸）']].forEach(function (a) {
    var b = mk('button', 'bv-btn', a[1], r2b); b.type = 'button'; vB[a[0]] = b;
    b.addEventListener('click', function () { S.view = a[0]; syncUI(); invalidate(); });
  });
  var cv2 = mk('canvas', 'bv-canvas', null, p2); cv2.setAttribute('role', 'img');
  cv2.setAttribute('aria-label', '単純立方格子の 4×4 の格子点 2 層に軌道の形を置き，Bloch の位相の実部で符号と大きさを変えた図．');
  var slot2k = mk('div', null, null, p2), slot2t = mk('div', null, null, p2);
  var leg2 = mk('div', 'bv-legend', '<span><span class="bv-sq" style="background:' + C.pos + '"></span>葉が +</span><span><span class="bv-sq" style="background:' + C.neg + '"></span>葉が −</span>' +
    '<span>' + swatch('bond') + '結合的</span><span>' + swatch('anti') + '反結合的</span><span>' + swatch('zero') + '打ち消し（0）</span>' +
    '<span class="bv-note">葉の大きさ ∝ |Re 位相|．灰色の点線の輪郭 = 係数 1 のときの形</span>', p2);
  var info2 = mk('div', 'bv-cap', null, p2);

  /* -- タブ 3：フォノン -- */
  var p3 = panes[2];
  var r3 = mk('div', 'bv-row', '<span class="bv-lab">モード</span>', p3);
  var mB = MODES.map(function (m, i) {
    var b = mk('button', 'bv-btn', m.btn, r3); b.type = 'button';
    b.addEventListener('click', function () { S.mode = i; syncUI(); invalidate(); });
    return b;
  });
  var r3b = mk('div', 'bv-row', '<span class="bv-lab">見る向き</span>', p3); var r3bw = r3b;
  var pvB = {};
  [['top', '上から（x 偏極）'], ['side', '横から（z 偏極）']].forEach(function (a) {
    var b = mk('button', 'bv-btn', a[1], r3b); b.type = 'button'; pvB[a[0]] = b;
    b.addEventListener('click', function () { S.pview = a[0]; syncUI(); invalidate(); });
  });
  mk('span', 'bv-note', '極性モードだけ切り替えられます', r3b);
  var cv3 = mk('canvas', 'bv-canvas', null, p3); cv3.setAttribute('role', 'img');
  cv3.setAttribute('aria-label', 'SrTiO3 の 2×2×2 超胞の Ti を含む 2 つの層の上面図．TiO6 八面体と Sr が選んだフォノンモードの変位で動く．');
  var ampW = mk('div', 'bv-amp', null, p3);
  mk('span', 'bv-lab', '最大変位（誇張）', ampW);
  var ampS = mk('input', null, null, ampW); ampS.type = 'range'; ampS.min = 0; ampS.max = 0.4; ampS.step = 0.01; ampS.value = S.amp; ampS.setAttribute('aria-label', '変位の大きさ');
  var ampV = mk('span', 'bv-tv', '', ampW);
  ampS.addEventListener('input', function () { S.amp = +ampS.value; syncUI(); invalidate(); });
  var slot3t = mk('div', null, null, p3);
  var leg3 = mk('div', 'bv-legend', '<span><span class="bv-sq" style="background:' + C.sr + '"></span>Sr</span><span><span class="bv-sq" style="background:' + C.ti + '"></span>Ti</span>' +
    '<span><span class="bv-sq" style="background:' + C.o + '"></span>O</span>' +
    '<span><span class="bv-sq" style="background:rgba(123,45,59,.25);border-color:' + C.acc + '"></span>八面体が反時計回り</span>' +
    '<span><span class="bv-sq" style="background:rgba(31,78,121,.25);border-color:' + C.blue + '"></span>時計回り</span>' +
    '<span class="bv-note">点線 = 平衡位置．見る向きに沿った動き（上面図では z 方向）は見えない</span>', p3);
  var info3 = mk('div', 'bv-cap', null, p3);

  /* ---------- 状態の同期 ---------- */
  function setPos(p, fromSlider) {
    S.pos = p; S.k = kAt(p);
    if (!fromSlider) slider.value = p;
    syncUI(); invalidate();
  }
  function setPlaying(on) {
    S.playing = on; lastT = 0;
    playB.className = 'bv-btn bv-play' + (on ? ' bv-on' : '');
    playB.innerHTML = on ? '■ 止める' : '▶ 時間を進める';
    if (on) invalidate();
  }
  function syncTime() {
    var d = ((S.phase * 180 / PI) % 360 + 360) % 360;
    tsl.value = Math.round(d); tval.textContent = 'ωt = ' + Math.round(d) + '°';
  }
  function syncK() {
    var k = S.k, nm = hsName(k), seg = nm ? nm + ' 点' : segName(S.pos) + ' 上';
    Object.keys(kBtns).forEach(function (n) { kBtns[n].className = 'bv-btn' + (nm === n ? ' bv-on' : ''); });
    var st = isStanding(k);
    kinfo.innerHTML = '<div><b>k = ' + kTxt(k) + '</b>（分率座標）　<span class="bv-tag' + (st ? ' bv-stand' : '') + '">' + seg + '</span></div>' +
      '<div>1 胞進むと位相が回る角度：' +
      '<span class="bv-fm">a</span> 方向' + dialSVG(k[0]) + '<b>' + degTxt(k[0]) + '</b>，' +
      '<span class="bv-fm">b</span> 方向' + dialSVG(k[1]) + '<b>' + degTxt(k[1]) + '</b>，' +
      '<span class="bv-fm">c</span> 方向' + dialSVG(k[2]) + '<b>' + degTxt(k[2]) + '</b></div>' +
      '<div>' + (st ? '<b>定在波</b>：位相は ±1 だけなので，模様の形は変わらず，全体の明暗（符号）だけが振動する．'
                    : '<b>進行波</b>：位相が複素数なので，模様が k の向きに流れる．') + '</div>';
  }
  function syncUI() {
    tabBtn.forEach(function (b, i) { b.setAttribute('aria-selected', i === S.tab ? 'true' : 'false'); });
    panes.forEach(function (p, i) { p.style.display = i === S.tab ? '' : 'none'; });
    ORB_ORDER.forEach(function (n) { orbB[n].className = 'bv-btn' + (S.orb === n ? ' bv-on' : ''); });
    ['top', 'side'].forEach(function (v) { vB[v].className = 'bv-btn' + (S.view === v ? ' bv-on' : ''); });
    var polar = MODES[S.mode].key === 'G';
    r3bw.style.display = polar ? '' : 'none';
    ['top', 'side'].forEach(function (v) { pvB[v].className = 'bv-btn' + (S.pview === v ? ' bv-on' : ''); });
    mB.forEach(function (b, i) { b.className = 'bv-btn' + (S.mode === i ? ' bv-on' : ''); });
    ampV.textContent = S.amp.toFixed(2) + ' Å';
    syncK(); syncTime();
    if (S.tab === 0) updInfo1();
    if (S.tab === 1) updInfo2();
    if (S.tab === 2) updInfo3();
  }
  function activate(i) {
    S.tab = i;
    if (i === 0) { slot1k.appendChild(kbox); slot1t.appendChild(tbox); }
    if (i === 1) { slot2k.appendChild(kbox); slot2t.appendChild(tbox); }
    if (i === 2) { slot3t.appendChild(tbox); }
    syncUI(); relayout(); invalidate();
  }

  /* ---------- キャンバス ---------- */
  function prep(cv, w, h) {
    var d = window.devicePixelRatio || 1, pw = Math.max(1, Math.round(w * d)), ph = Math.max(1, Math.round(h * d));
    if (cv.width !== pw) cv.width = pw;
    if (cv.height !== ph) cv.height = ph;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    var g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, w, h); g.lineJoin = 'round'; g.lineCap = 'round';
    return g;
  }
  function relayout() {
    var cs = window.getComputedStyle(root);
    var w = Math.floor(root.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0));
    if (w < 120) return;
    Ly.w = w;
    Ly.h1 = Math.round(clamp(w * 0.98, 340, 500));
    Ly.p = Math.max(120, Math.min(Math.floor((w - GAP) / 2), 400));
    Ly.p3 = Ly.p;
    invalidate();
  }
  function invalidate() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(ts) {
    raf = 0;
    if (S.playing) {
      if (lastT) S.phase = (S.phase + Math.min(0.1, (ts - lastT) / 1000) * TAU / 4) % TAU;
      lastT = ts; syncTime();
    }
    if (Ly.w > 0) {
      if (S.tab === 0) { drawPhase(); }
      if (S.tab === 1) { drawOrb(); }
      if (S.tab === 2) { drawPh(); }
      if (S.tab === 0) updInfo1();
    }
    if (S.playing) invalidate();
  }

  /* =====================  タブ 1：位相の模様  ===================== */
  var fitCache = { key: '', sc: 40, cx: 0, cy: 0 };
  function projAng(yaw, pitch, x, y, z) {
    var ca = Math.cos(yaw), sa = Math.sin(yaw), cb = Math.cos(pitch), sb = Math.sin(pitch);
    var x1 = x * ca - y * sa, y1 = x * sa + y * ca;
    return [x1, y1 * sb + z * cb, -y1 * cb + z * sb];
  }
  function fit1(W, H, zs) {
    var key = W + 'x' + H + 'z' + zs;
    if (fitCache.key === key) return fitCache;
    var mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9, hz = zs / 2 + 0.42, i, p, X = [-1.92, 1.92], Z = [-hz, hz];
    for (i = 0; i < 8; i++) {
      p = projAng(DEFY, DEFP, X[i & 1], X[(i >> 1) & 1], Z[(i >> 2) & 1]);
      mnx = Math.min(mnx, p[0]); mxx = Math.max(mxx, p[0]); mny = Math.min(mny, p[1]); mxy = Math.max(mxy, p[1]);
    }
    var sc = Math.min((W - 24) / (mxx - mnx), (H - 56) / (mxy - mny));
    fitCache = { key: key, sc: sc, cx: (mnx + mxx) / 2, cy: (mny + mxy) / 2 };
    return fitCache;
  }
  var FACE = [[2, 1, 1.0], [2, -1, 0.7], [1, -1, 0.9], [1, 1, 0.9], [0, 1, 0.8], [0, -1, 0.8]];
  function frameOf(a, s) {
    if (a === 2) return s > 0 ? [[1, 0, 0], [0, 1, 0]] : [[1, 0, 0], [0, -1, 0]];
    if (a === 1) return s < 0 ? [[1, 0, 0], [0, 0, 1]] : [[-1, 0, 0], [0, 0, 1]];
    return s > 0 ? [[0, 1, 0], [0, 0, 1]] : [[0, -1, 0], [0, 0, 1]];
  }
  function drawPhase() {
    var W = Ly.w, H = Ly.h1, g = prep(cv1, W, H);
    var ca = Math.cos(S.yaw), sa = Math.sin(S.yaw), cb = Math.cos(S.pitch), sb = Math.sin(S.pitch);
    var zs = S.explode ? 3.9 : 1.0, ft = fit1(W, H, zs), hh = 0.42, k = S.k;
    function P(x, y, z) { var x1 = x * ca - y * sa, y1 = x * sa + y * ca; return [x1, y1 * sb + z * cb, -y1 * cb + z * sb]; }
    function sc(p) { return [W / 2 + (p[0] - ft.cx) * ft.sc, H / 2 - 8 - (p[1] - ft.cy) * ft.sc]; }
    var cubes = [], n1, n2, n3;
    for (n3 = 0; n3 < 2; n3++) for (n2 = 0; n2 < 4; n2++) for (n1 = 0; n1 < 4; n1++) {
      var x = n1 - 1.5, y = n2 - 1.5, z = (n3 - 0.5) * zs, p = P(x, y, z);
      cubes.push({ x: x, y: y, z: z, d: p[2], th: TAU * (k[0] * n1 + k[1] * n2 + k[2] * n3) - S.phase });
    }
    cubes.sort(function (a, b) { return a.d - b.d; });
    var wv = [0, -cb, sb];
    cubes.forEach(function (cu) {
      var v = Math.cos(cu.th), col = valRGB(v), best = null, bestd = -9, drawn = [];
      FACE.forEach(function (f) {
        var a = f[0], s = f[1], n = [0, 0, 0]; n[a] = s;
        var n1x = n[0] * ca - n[1] * sa, n1y = n[0] * sa + n[1] * ca;
        var vis = -n1y * cb + n[2] * sb;
        if (vis <= 1e-6) return;
        var b1 = (a + 1) % 3, c1 = (a + 2) % 3, pts = [], q;
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (t) {
          var c3 = [cu.x, cu.y, cu.z]; c3[a] += s * hh; c3[b1] += t[0] * hh; c3[c1] += t[1] * hh;
          q = sc(P(c3[0], c3[1], c3[2])); pts.push(q);
        });
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (q = 1; q < 4; q++) g.lineTo(pts[q][0], pts[q][1]); g.closePath();
        g.fillStyle = rgbStr(col, f[2]); g.fill(); g.lineWidth = 0.8; g.strokeStyle = '#6b6b6b'; g.stroke();
        drawn.push({ a: a, s: s, vis: vis });
      });
      /* 時計：上面が十分見えるなら上面，そうでなければ最もこちらを向いた面 */
      drawn.forEach(function (f) { if (f.vis > bestd) { bestd = f.vis; best = f; } });
      var topF = null; drawn.forEach(function (f) { if (f.a === 2 && f.s === 1) topF = f; });
      if (topF && sb > 0.25) best = topF;
      if (!best) return;
      var fr = frameOf(best.a, best.s), n = [0, 0, 0]; n[best.a] = best.s;
      var Cc = [cu.x + n[0] * hh, cu.y + n[1] * hh, cu.z + n[2] * hh], rg = fr[0], up = fr[1], i, ph, rr = 0.32, len = 0.29;
      g.beginPath();
      for (i = 0; i <= 28; i++) {
        ph = i / 28 * TAU;
        var q2 = sc(P(Cc[0] + rr * (Math.cos(ph) * rg[0] + Math.sin(ph) * up[0]), Cc[1] + rr * (Math.cos(ph) * rg[1] + Math.sin(ph) * up[1]), Cc[2] + rr * (Math.cos(ph) * rg[2] + Math.sin(ph) * up[2])));
        if (i === 0) g.moveTo(q2[0], q2[1]); else g.lineTo(q2[0], q2[1]);
      }
      g.lineWidth = 1; g.strokeStyle = 'rgba(0,0,0,.30)'; g.stroke();
      var ct = Math.cos(cu.th), st = Math.sin(cu.th);
      var tip = sc(P(Cc[0] + len * (ct * up[0] - st * rg[0]), Cc[1] + len * (ct * up[1] - st * rg[1]), Cc[2] + len * (ct * up[2] - st * rg[2])));
      var c0 = sc(P(Cc[0], Cc[1], Cc[2]));
      g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(tip[0], tip[1]); g.lineWidth = 2.1; g.strokeStyle = C.ink; g.stroke();
      g.beginPath(); g.arc(tip[0], tip[1], 2.3, 0, TAU); g.fillStyle = C.ink; g.fill();
      g.beginPath(); g.arc(c0[0], c0[1], 1.6, 0, TAU); g.fill();
    });
    /* 層の名前 */
    g.font = 'bold 13px ' + FONT; g.textAlign = 'center'; g.fillStyle = C.acc;
    [0, 1].forEach(function (l) {
      var q = sc(P(0, -2.45, (l - 0.5) * zs - hh));
      g.fillText('c 方向 ' + (l + 1) + ' 層目（n3 = ' + l + '）', clamp(q[0], 90, W - 90), clamp(q[1] + 12, 14, H - 6));
    });
    /* 軸の目盛り */
    var o = [36, 44], axes = [['a', [1, 0, 0], C.acc], ['b', [0, 1, 0], C.blue], ['c', [0, 0, 1], C.green]];
    g.font = 'italic bold 13px ' + FONT; g.textAlign = 'center';
    axes.forEach(function (a) {
      var p = P(a[1][0], a[1][1], a[1][2]), dx = p[0] * 24, dy = -p[1] * 24;
      arrow(g, o[0], o[1], o[0] + dx, o[1] + dy, a[2], 2);
      g.fillStyle = a[2]; g.fillText(a[0], o[0] + dx * 1.35, o[1] + dy * 1.35 + 4);
    });
    if (!isStanding(k)) {
      var kn = Math.sqrt(k[0] * k[0] + k[1] * k[1] + k[2] * k[2]), pk = P(k[0] / kn, k[1] / kn, k[2] / kn);
      arrow(g, W - 44, 44, W - 44 + pk[0] * 30, 44 - pk[1] * 30, C.amber, 3);
      g.fillStyle = C.amber; g.textAlign = 'right'; g.fillText('k の向き', W - 8, 76);
    }
  }
  function arrow(g, x0, y0, x1, y1, col, w) {
    var a = Math.atan2(y1 - y0, x1 - x0), h = 4 + w * 1.5;
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - h * Math.cos(a - 0.4), y1 - h * Math.sin(a - 0.4)); g.lineTo(x1 - h * Math.cos(a + 0.4), y1 - h * Math.sin(a + 0.4)); g.closePath(); g.fill();
  }
  function updInfo1() {
    var k = S.k;
    info1.innerHTML = '各胞 <span class="bv-fm">R</span> = (<span class="bv-fm">n</span><sub>1</sub>, <span class="bv-fm">n</span><sub>2</sub>, <span class="bv-fm">n</span><sub>3</sub>) の値 = Re[ exp i(<span class="bv-fm">k</span>·<span class="bv-fm">R</span> − ωt) ] = cos[ 2π(' +
      f3(k[0]) + ' <span class="bv-fm">n</span><sub>1</sub> + ' + f3(k[1]) + ' <span class="bv-fm">n</span><sub>2</sub> + ' + f3(k[2]) + ' <span class="bv-fm">n</span><sub>3</sub>) − ' + Math.round(((S.phase * 180 / PI) % 360 + 360) % 360) + '° ]' +
      '<p class="bv-note">' + (isStanding(k) ? 'この k では隣の胞の位相差が 0° か 180° だけなので，模様の形は変わらない（▶ を押すと全体の明暗だけが振動する）．'
                                          : 'この k では位相差が 0° と 180° の間の値になり，▶ を押すと模様が流れる．') +
      ' 隣の胞と同じ色が続く方向は位相差 0°，色が交互になる方向は 180°．</p>';
  }

  /* ドラッグで視点を回す */
  (function () {
    var drag = null;
    cv1.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType === 'touch' };
      try { cv1.setPointerCapture(e.pointerId); } catch (x) {}
    });
    cv1.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      S.yaw += dx * 0.011;
      if (!drag.touch) S.pitch = clamp(S.pitch + dy * 0.009, 0.1, 1.25);
      invalidate();
    });
    function end(e) { if (drag && drag.id === e.pointerId) drag = null; }
    cv1.addEventListener('pointerup', end); cv1.addEventListener('pointercancel', end);
    cv1.addEventListener('keydown', function (e) {
      var d = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] }[e.key];
      if (!d) return; e.preventDefault(); S.yaw += d[0]; S.pitch = clamp(S.pitch + d[1], 0.1, 1.25); invalidate();
    });
  })();

  /* =====================  タブ 2：軌道の Bloch 和  ===================== */
  function projEllipse(l, eh, ev) {
    var d = l.d, a2 = l.al * l.al, s2 = l.as * l.as, dd = a2 - s2;
    var dh = d[0] * eh[0] + d[1] * eh[1] + d[2] * eh[2], dv = d[0] * ev[0] + d[1] * ev[1] + d[2] * ev[2];
    var bhh = s2 + dd * dh * dh, bvv = s2 + dd * dv * dv, bhv = dd * dh * dv;
    var tr = (bhh + bvv) / 2, df = (bhh - bvv) / 2, r = Math.sqrt(df * df + bhv * bhv);
    return { rx: Math.sqrt(tr + r), ry: Math.sqrt(Math.max(tr - r, 1e-9)), ang: 0.5 * Math.atan2(2 * bhv, bhh - bvv),
             ch: l.c[0] * eh[0] + l.c[1] * eh[1] + l.c[2] * eh[2], cv: l.c[0] * ev[0] + l.c[1] * ev[1] + l.c[2] * ev[2] };
  }
  function drawOrb() {
    var W = Ly.w, P = Ly.p, H = P + TH, g = prep(cv2, W, H), ox = Math.round((W - 2 * P - GAP) / 2);
    panelOrb(g, ox, 0, P, 0); panelOrb(g, ox + P + GAP, 0, P, 1);
  }
  function panelOrb(g, x0, y0, P, Lr) {
    var top = S.view === 'top', MG = 0.6, cell = P / (3 + 2 * MG), k = S.k, orb = ORB[S.orb];
    var eh = [1, 0, 0], ev = top ? [0, 1, 0] : [0, 0, 1], wv = top ? [0, 0, 1] : [0, -1, 0];
    g.fillStyle = '#fff'; g.fillRect(x0, y0, P, P + TH); g.strokeStyle = C.rule; g.lineWidth = 1; g.strokeRect(x0 + 0.5, y0 + 0.5, P - 1, P + TH - 1);
    g.font = 'bold 13px ' + FONT; g.textAlign = 'center'; g.fillStyle = C.acc;
    g.fillText(top ? 'z = ' + Lr + ' の層（上から）' : 'y = ' + Lr + ' の層（xz 断面）', x0 + P / 2, y0 + 19);
    g.font = '12px ' + FONT; g.fillStyle = '#4a5568'; g.fillText(top ? '右 = x，上 = y' : '右 = x，上 = z', x0 + P / 2, y0 + 36);
    function SX(i) { return x0 + (MG + i) * cell; }
    function SY(j) { return y0 + TH + (MG + 3 - j) * cell; }
    var i, j;
    /* 格子（薄く） */
    g.strokeStyle = '#e6e8ea'; g.lineWidth = 1; g.beginPath();
    for (i = 0; i < 4; i++) { g.moveTo(SX(i), SY(0)); g.lineTo(SX(i), SY(3)); g.moveTo(SX(0), SY(i)); g.lineTo(SX(3), SY(i)); }
    g.stroke();
    /* 軌道のスタンプ */
    var order = orb.lobes.map(function (l, n) { return { l: l, d: l.c[0] * wv[0] + l.c[1] * wv[1] + l.c[2] * wv[2], n: n }; }).sort(function (a, b) { return a.d - b.d; });
    function ellipseAt(x, y, e, am, fill, stroke, lw, dash) {
      if (e.rx * am * cell < 0.3) return;
      g.beginPath(); g.ellipse(x + e.ch * am * cell, y - e.cv * am * cell, e.rx * am * cell, Math.max(e.ry * am * cell, 0.3), -e.ang, 0, TAU);
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (stroke) { g.setLineDash(dash || []); g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); g.setLineDash([]); }
    }
    function ringAt(x, y, am, fill, stroke, lw, dash) {
      var rg = orb.ring, Rr = rg.R * am * cell, tw = 2 * rg.rt * am * cell;
      if (Rr < 0.5) return;
      g.setLineDash(dash || []);
      if (top) { g.beginPath(); g.arc(x, y, Rr, 0, TAU); g.strokeStyle = stroke || fill; g.lineWidth = stroke ? lw : tw; g.stroke(); }
      else { g.beginPath(); g.moveTo(x - Rr, y); g.lineTo(x + Rr, y); g.lineCap = 'round'; g.strokeStyle = stroke || fill; g.lineWidth = stroke ? lw : tw; g.stroke(); }
      g.setLineDash([]);
    }
    var ells = order.map(function (o) { return { e: projEllipse(o.l, eh, ev), l: o.l }; });
    for (j = 0; j < 4; j++) for (i = 0; i < 4; i++) {
      var R = top ? [i, j, Lr] : [i, Lr, j], th = TAU * (k[0] * R[0] + k[1] * R[1] + k[2] * R[2]) - S.phase, c = Math.cos(th);
      var x = SX(i), y = SY(j), am = Math.abs(c);
      /* 幽霊（係数 1 のときの形） */
      ells.forEach(function (o) { ellipseAt(x, y, o.e, 1, null, 'rgba(0,0,0,.20)', 1, [2, 2]); });
      if (orb.ring) ringAt(x, y, 1, null, 'rgba(0,0,0,.20)', 1, [2, 2]);
      if (am > 0.03) {
        var drawRing = function () { var s = orb.ring.sg * (c >= 0 ? 1 : -1); ringAt(x, y, am, s > 0 ? C.pos : C.neg); };
        if (orb.ring && top) drawRing();
        ells.forEach(function (o, idx) {
          var s = o.l.sg * (c >= 0 ? 1 : -1);
          ellipseAt(x, y, o.e, am, s > 0 ? C.pos : C.neg, s > 0 ? C.posE : C.negE, 1.1);
        });
        if (orb.ring && !top) drawRing();
      }
      g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.fillStyle = 'rgba(0,0,0,.55)'; g.fill();
    }
    /* 結合線（s と p だけ） */
    var hl = orb.kind === 's' ? 0.2 : 0.16, vax = top ? 1 : 2, bi = [bondInfo(S.orb, 0, k), bondInfo(S.orb, vax, k)];
    if (bi[0]) {
      var seg = function (xa, ya, xb, yb, b) {
        var mx = (xa + xb) / 2, my = (ya + yb) / 2, ux = (xb - xa), uy = (yb - ya), ln = Math.sqrt(ux * ux + uy * uy), hx = ux / ln * hl * cell, hy = uy / ln * hl * cell;
        g.beginPath(); g.moveTo(mx - hx, my - hy); g.lineTo(mx + hx, my + hy);
        g.setLineDash([]); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 5.5; g.stroke();
        var w = 1.4 + 2.8 * Math.abs(b.c);
        g.beginPath(); g.moveTo(mx - hx, my - hy); g.lineTo(mx + hx, my + hy);
        if (b.t === 'bond') { g.setLineDash([]); g.strokeStyle = C.green; g.lineWidth = w; }
        else if (b.t === 'anti') { g.setLineDash([5, 3]); g.strokeStyle = C.red; g.lineWidth = w; }
        else { g.setLineDash([1.5, 4]); g.strokeStyle = C.gray; g.lineWidth = 2.4; }
        g.stroke(); g.setLineDash([]);
      };
      var bseg = [];
      for (j = 0; j < 4; j++) for (i = 0; i < 3; i++) bseg.push([SX(i), SY(j), SX(i + 1), SY(j), bi[0]]);
      for (i = 0; i < 4; i++) for (j = 0; j < 3; j++) bseg.push([SX(i), SY(j), SX(i), SY(j + 1), bi[1]]);
      bseg.forEach(function (a) { seg(a[0], a[1], a[2], a[3], a[4]); });
    }
  }
  function updInfo2() {
    var k = S.k, o = S.orb, orb = ORB[o], h = '';
    var ax = ['x', 'y', 'z'], names = { bond: '結合的', anti: '反結合的', zero: '打ち消し（0）' };
    if (orb.kind === 'd') {
      info2.innerHTML = '<p><b>' + orb.lab + '</b>：d 軌道は，隣の d どうしの直接の重なりよりも，間にある酸素の p 軌道との重なりでエネルギーが決まる（SrTiO<sub>3</sub> の Ti 3d は本文 <a href="#secC-6">§C.6</a>）．' +
        'そのため，この図では結合線とエネルギーは出さず，各格子点の符号（葉の色）と大きさだけを見る．葉の形と符号は， d<sub>xy</sub> は xy &gt; 0 が +，d<sub>yz</sub> は yz &gt; 0 が +，d<sub>xz</sub> は xz &gt; 0 が +，d<sub>x²−y²</sub> は ±x 方向の葉が +，d<sub>z²</sub> は ±z 方向の葉が + で胴の輪が − である．</p>' +
        '<p class="bv-note">位相の実部が負の格子点では，葉の色が入れ替わる（+ の葉がシアン，− の葉が黄）．</p>';
      return;
    }
    var chips = '', cnt = { bond: 0, anti: 0, zero: 0 }, allInt = true, i;
    for (i = 0; i < 3; i++) {
      var b = bondInfo(o, i, k); cnt[b.t] += 2; if (Math.abs(Math.abs(b.c) - 1) > 1e-6) allInt = false;
      var kind = orb.kind === 'p' ? (orb.ax === i ? '（σ）' : '（π）') : '';
      chips += '<span class="bv-chip">' + swatch(b.t) + ax[i] + ' 方向' + kind + '：<b>' + names[b.t] + '</b> <small>cos 2πk<sub>' + (i + 1) + '</sub> = ' + f2(b.c) + '</small></span>';
    }
    h += '<div class="bv-chips">' + chips + '</div>';
    if (allInt) h += '<p>この原子から見て，最近接 6 つのうち <b>結合的 ' + cnt.bond + ' 本・反結合的 ' + cnt.anti + ' 本</b>（' + (hsName(k) || 'この k') + '）．</p>';
    else h += '<p class="bv-note">途中の k では，方向ごとの cos 2πk<sub>i</sub> の値で結合の強さが決まる（両端の 1 と −1 の間を連続的に動く）．各方向の隣は 2 つずつ．</p>';
    var E = energyOf(o, k), Em = o === 's' ? 6 : 3, formula;
    if (o === 's') formula = '<i>E</i>(<b>k</b>) = ε<sub>s</sub> + 2<i>t</i>[cos 2πk<sub>1</sub> + cos 2πk<sub>2</sub> + cos 2πk<sub>3</sub>]，<i>t</i> = −1（エネルギーの単位を |<i>t</i>| とした説明用の値）';
    else {
      var a1 = orb.ax, o2 = [0, 1, 2].filter(function (z) { return z !== a1; });
      formula = '<i>E</i><sub>p<sub>' + ax[a1] + '</sub></sub>(<b>k</b>) = ε<sub>p</sub> + 2<i>V</i><sub>σ</sub> cos 2πk<sub>' + (a1 + 1) + '</sub> + 2<i>V</i><sub>π</sub>(cos 2πk<sub>' + (o2[0] + 1) + '</sub> + cos 2πk<sub>' + (o2[1] + 1) + '</sub>)，<i>V</i><sub>σ</sub> = +1，<i>V</i><sub>π</sub> = −0.25（<i>V</i><sub>σ</sub> を単位とした説明用の値）';
    }
    h += '<p>' + formula + '</p><p><b>' + (o === 's' ? '<i>E</i> − ε<sub>s</sub>' : '<i>E</i> − ε<sub>p</sub>') + ' = ' + f2(E) + (o === 's' ? ' |<i>t</i>|' : ' <i>V</i><sub>σ</sub>') + '</b></p>' +
      '<div class="bv-ebar"><i style="left:' + (100 * (E + Em) / (2 * Em)).toFixed(1) + '%"></div><div class="bv-eb-l"><span>低い（−' + Em + '）</span><span>高い（+' + Em + '）</span></div>' +
      '<p class="bv-note">結合の判定は，隣の 2 つの胞の位相差 2πk<sub>i</sub> から決める（<i>V</i> cos 2πk<sub>i</sub> &lt; 0 なら結合的）．定在波の点では，図の符号どうしの関係と一致する．' +
      (o === 's' ? '' : ' p では軸方向の隣（σ）は，同符号で並ぶと + の葉と − の葉が向き合うので反結合的になる．') + '</p>';
    info2.innerHTML = h;
  }

  /* =====================  タブ 3：フォノン  ===================== */
  function stampOf(m, view) {
    var st = ST[m.key];
    if (m.key !== 'G' || view === 'side') return st;
    var perm = [0, 1, 2, 4, 3];   /* 偏極を z → x に：x と z を入れ替える */
    return perm.map(function (pk) { var v = st[pk]; return [v[2], v[1], v[0]]; });
  }
  function posOf(R, kap) {
    var d = [[0, 0, 0], [0.5, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0], [0, 0.5, 0.5]][kap];
    return [R[0] + d[0], R[1] + d[1], R[2] + d[2]];
  }
  function phGeom(m, view, Lr) {
    var h = 0, v = view === 'side' ? 2 : 1, p = view === 'side' ? 1 : 2, st = stampOf(m, view), kk = m.k;
    function mkR(a, b, c) { var R = [0, 0, 0]; R[h] = a; R[v] = b; R[p] = c; return R; }
    function atom(R, kap) {
      var pos = posOf(R, kap), ph = Math.cos(TAU * (kk[0] * R[0] + kk[1] * R[1] + kk[2] * R[2])), s = st[kap];
      return { h: pos[h], v: pos[v], dh: s[h] * ph, dv: s[v] * ph };
    }
    var G = { sr: [], ti: [], oh: [], ov: [], ap: [], oct: [] }, a, b, c;
    for (a = 0; a < 3; a++) for (b = 0; b < 3; b++) G.sr.push(atom(mkR(a, b, Lr), 0));
    for (a = 0; a < 2; a++) { G.ti[a] = []; for (b = 0; b < 2; b++) G.ti[a][b] = atom(mkR(a, b, Lr), 1); }
    for (a = 0; a < 3; a++) { G.oh[a] = []; for (b = 0; b < 2; b++) G.oh[a][b] = atom(mkR(a, b, Lr), KOF[h]); }
    for (a = 0; a < 2; a++) { G.ov[a] = []; for (b = 0; b < 3; b++) G.ov[a][b] = atom(mkR(a, b, Lr), KOF[v]); }
    for (a = 0; a < 2; a++) for (b = 0; b < 2; b++) for (c = Lr; c <= Lr + 1; c++) G.ap.push(atom(mkR(a, b, c), KOF[p]));
    for (a = 0; a < 2; a++) for (b = 0; b < 2; b++) {
      var T = G.ti[a][b], E = G.oh[a + 1][b], Wt = G.oh[a][b], N = G.ov[a][b + 1], Sx = G.ov[a][b];
      var vs = [E, N, Wt, Sx], rr = [[0.5, 0], [0, 0.5], [-0.5, 0], [0, -0.5]], num = 0, den = 0;
      vs.forEach(function (o, n) {
        var dh = o.dh - T.dh, dv = o.dv - T.dv;
        num += rr[n][0] * dv - rr[n][1] * dh; den += 0.25;
      });
      G.oct.push({ a: a, b: b, ti: T, vs: vs, w: num / den });
    }
    return G;
  }
  function rotSense(m, Lr) {   /* 層 Lr の (0,0) の八面体の回転の向き（+1 反時計回り / −1 時計回り / 0）*/
    var w = phGeom(m, 'top', Lr).oct[0].w;
    return Math.abs(w) < 0.05 ? 0 : (w > 0 ? 1 : -1);
  }
  function drawPh() {
    var m = MODES[S.mode], view = m.key === 'G' ? S.pview : 'top';
    var W = Ly.w, P = Ly.p3, H = P + TH, g = prep(cv3, W, H), ox = Math.round((W - 2 * P - GAP) / 2);
    panelPh(g, ox, 0, P, 0, m, view); panelPh(g, ox + P + GAP, 0, P, 1, m, view);
  }
  function panelPh(g, x0, y0, P, Lr, m, view) {
    var MG = 0.42, cell = P / (2 + 2 * MG), side = view === 'side', G = phGeom(m, view, Lr);
    var ds = S.amp / A_CALC * Math.cos(S.phase);   /* 1 単位の u あたりの変位（単位胞単位）*/
    g.fillStyle = '#fff'; g.fillRect(x0, y0, P, P + TH); g.strokeStyle = C.rule; g.lineWidth = 1; g.strokeRect(x0 + 0.5, y0 + 0.5, P - 1, P + TH - 1);
    g.font = 'bold 13px ' + FONT; g.textAlign = 'center'; g.fillStyle = C.acc;
    var pc = Lr + 0.5;
    g.fillText(side ? 'y = ' + (pc === 0.5 ? '½' : '3/2') + ' の面（横から）' : (Lr === 0 ? '下の層　z = ½' : '上の層　z = 3/2'), x0 + P / 2, y0 + 19);
    g.font = '12px ' + FONT; g.fillStyle = '#4a5568'; g.fillText(side ? '右 = x，上 = z' : '右 = x，上 = y', x0 + P / 2, y0 + 36);
    function TX(h) { return x0 + (MG + h) * cell; }
    function TY(v) { return y0 + TH + (MG + 2 - v) * cell; }
    function pt(o, dd) { return [TX(o.h + o.dh * ds * dd), TY(o.v + o.dv * ds * dd)]; }
    /* 超胞の枠と単位胞の線 */
    g.setLineDash([4, 3]); g.strokeStyle = '#c4cacf'; g.lineWidth = 1; g.strokeRect(TX(0), TY(2), 2 * cell, 2 * cell);
    g.beginPath(); g.moveTo(TX(1), TY(0)); g.lineTo(TX(1), TY(2)); g.moveTo(TX(0), TY(1)); g.lineTo(TX(2), TY(1)); g.stroke(); g.setLineDash([]);
    var ang = (Math.abs(S.amp) * OMEGA * 180 / PI) * Math.cos(S.phase);
    /* 平衡位置の八面体（点線） */
    G.oct.forEach(function (oc) {
      g.beginPath(); oc.vs.forEach(function (o, n) { var q = pt(o, 0); if (n) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath();
      g.setLineDash([2, 3]); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke(); g.setLineDash([]);
    });
    /* 動いた八面体 */
    G.oct.forEach(function (oc) {
      var rot = m.rot && Math.abs(oc.w) > 0.05, s = oc.w > 0 ? 1 : -1;
      g.beginPath(); oc.vs.forEach(function (o, n) { var q = pt(o, 1); if (n) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath();
      g.fillStyle = rot ? (s > 0 ? 'rgba(123,45,59,.20)' : 'rgba(31,78,121,.20)') : 'rgba(150,160,170,.12)'; g.fill();
      g.strokeStyle = rot ? (s > 0 ? C.acc : C.blue) : '#6b7480'; g.lineWidth = 1.6; g.stroke();
      var t = pt(oc.ti, 1);
      oc.vs.forEach(function (o) { var q = pt(o, 1); g.beginPath(); g.moveTo(t[0], t[1]); g.lineTo(q[0], q[1]); g.strokeStyle = 'rgba(80,90,100,.45)'; g.lineWidth = 1.2; g.stroke(); });
    });
    var rA = Math.max(4.2, cell * 0.075);
    function dot(q, r, col) { g.beginPath(); g.arc(q[0], q[1], r, 0, TAU); g.fillStyle = col; g.fill(); g.lineWidth = 1; g.strokeStyle = 'rgba(0,0,0,.55)'; g.stroke(); }
    G.sr.forEach(function (o) { dot(pt(o, 1), rA * 1.35, C.sr); });
    G.ap.forEach(function (o) { dot(pt(o, 1), rA * 0.62, C.o); });
    G.oct.forEach(function (oc) { dot(pt(oc.ti, 1), rA * 1.05, C.ti); });
    G.oh.forEach(function (c) { c.forEach(function (o) { dot(pt(o, 1), rA * 0.9, C.o); }); });
    G.ov.forEach(function (c) { c.forEach(function (o) { dot(pt(o, 1), rA * 0.9, C.o); }); });
    /* 回転の矢印 */
    if (m.rot) {
      var cs = Math.cos(S.phase);
      G.oct.forEach(function (oc) {
        if (Math.abs(oc.w) < 0.05) return;
        var s = (oc.w > 0 ? 1 : -1) * (cs >= 0 ? 1 : -1), q = pt(oc.ti, 1), r = cell * 0.17, a0 = -0.5 * PI + 0.9, e = a0 - s * 1.45 * PI * 1;
        var anti = s > 0;   /* 画面で反時計回り */
        var e2 = anti ? a0 - 1.4 * PI : a0 + 1.4 * PI;
        g.globalAlpha = Math.max(0.3, Math.abs(cs));
        g.beginPath(); g.arc(q[0], q[1], r, a0, e2, anti); g.strokeStyle = anti ? C.acc : C.blue; g.lineWidth = 2.2; g.stroke();
        var tx = anti ? Math.sin(e2) : -Math.sin(e2), ty = anti ? -Math.cos(e2) : Math.cos(e2), ex = q[0] + r * Math.cos(e2), ey = q[1] + r * Math.sin(e2), hh = 5.5;
        g.beginPath(); g.moveTo(ex + tx * hh, ey + ty * hh); g.lineTo(ex - ty * hh * 0.7 - tx * 1, ey + tx * hh * 0.7 - ty * 1); g.lineTo(ex + ty * hh * 0.7 - tx * 1, ey - tx * hh * 0.7 - ty * 1); g.closePath();
        g.fillStyle = anti ? C.acc : C.blue; g.fill();
        g.globalAlpha = 1;
      });
    }
  }
  function updInfo3() {
    var m = MODES[S.mode], k = m.k, view = m.key === 'G' ? S.pview : 'top', h;
    h = '<p><b>' + m.head + '</b></p>';
    h += '<p>k = ' + kFrac(k) + '：1 胞進むと位相が <span class="bv-fm">a</span> 方向 <b>' + degTxt(k[0]) + '</b>，<span class="bv-fm">b</span> 方向 <b>' + degTxt(k[1]) + '</b>，<span class="bv-fm">c</span> 方向 <b>' + degTxt(k[2]) + '</b> 回る（定在波）．</p>';
    h += '<p>振動数：<b>' + (m.imag ? '虚数振動数（不安定）' : m.thz.toFixed(3) + ' THz') + '</b>（' + (m.imag ? '大きさ ' + Math.abs(m.thz).toFixed(3) + ' THz = ' + Math.abs(m.cm).toFixed(1) + ' cm<sup>−1</sup>．分散図では負の値として描く' : m.cm.toFixed(1) + ' cm<sup>−1</sup>') + '）．縮退 ' + m.deg + ' 重．</p>';
    h += '<p>既約表現：' + m.irr + '（名前は原点の取り方で変わる）．</p>';
    if (m.rot) {
      var s0 = rotSense(m, 0), s1 = rotSense(m, 1), same = s0 === s1;
      h += '<p>Glazer 記号 <b>' + m.glazer + '</b>．図の 2 層（c 方向に 1 胞離れた層）の八面体は <b>' + (same ? '同じ向きに回る＝M' : '逆向きに回る＝R') +
        '</b>（左下の八面体は，下の層で' + (s0 > 0 ? '反時計回り' : '時計回り') + '，上の層で' + (s1 > 0 ? '反時計回り' : '時計回り') + '）．ab 面内の隣どうしはどちらも逆向き．' +
        '現在の最大変位 ' + S.amp.toFixed(2) + ' Å のとき，八面体の回転角は最大 <b>' + (S.amp * OMEGA * 180 / PI).toFixed(1) + '°</b>（O の変位 0.1 Å あたり約 2.9°）．</p>';
    } else {
      h += '<p class="bv-note">表示の向き：' + (view === 'top' ? '上から見た x 偏極（z 方向の動きは見えない）' : '横から見た z 偏極（xz 断面．ここでは z 方向の上下の動きが見える）') + '．</p>';
    }
    h += '<p>' + m.txt + '</p>';
    if (m.imag) h += '<p class="bv-note">虚数振動数のモードは本来は振動せず，変位が成長して凍結する．ここでは模様を見るために，同じ模様を往復させている．</p>';
    h += '<p class="bv-note">データ：機械学習ポテンシャル（MACE）＋phonopy，2×2×2 超胞（40 原子），格子定数 a = 3.8995 Å，Sr 原点，非解析項なし．変位は最大の原子変位を 1 に規格化した固有ベクトル × cos(ωt)．2 層は Ti を含む層（z = ½ と 3/2）．</p>';
    info3.innerHTML = h;
  }

  /* ---------- 起動 ---------- */
  root.bvDebug = { S: S, kAt: kAt, phGeom: phGeom, rotSense: rotSense, posOf: posOf,
    u: function (mi, view, R, kap) { var m = MODES[mi], v = stampOf(m, view)[kap], ph = Math.cos(TAU * (m.k[0] * R[0] + m.k[1] * R[1] + m.k[2] * R[2])); return [v[0] * ph, v[1] * ph, v[2] * ph]; } };
  if (typeof ResizeObserver !== 'undefined') { new ResizeObserver(function () { relayout(); }).observe(root); }
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', relayout);
  activate(0);
  setPlaying(false);
  relayout();
}

function init() {
  var root = document.getElementById('bloch-viewer');
  if (!root) return;
  try { build(root); }
  catch (e) {
    root.textContent = '対話型ビューアを起動できませんでした（' + (e && e.message ? e.message : e) + '）．ブラウザを新しくするか，本文の図（図C.4，図C.5，図C.12）を参照してください．';
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
