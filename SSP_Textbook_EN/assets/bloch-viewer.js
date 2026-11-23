/* bloch-viewer.js — Appendix C “Bloch States”, §C.8 Try It Live (interactive viewer)
 * Usage: just place <div id="bloch-viewer" class="bloch-viewer"></div> and <script src="assets/bloch-viewer.js" defer></script>.
 * Plain JavaScript (no external libraries, no global variables). The phonon data are home_cell_stamp.u of phonon_modes.json, rounded to four decimals and embedded.
 * Convention: k is in fractional coordinates; the phase is attached by the lattice vector R of the cell, exp[2πi(k1 n1 + k2 n2 + k3 n3)] (atoms in the same cell have the same phase).
 */
(function () {
'use strict';

var PI = Math.PI, TAU = 2 * PI;
var FONT = '"Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans JP",sans-serif';
var C = { acc: '#7b2d3b', blue: '#1f4e79', amber: '#c98a1a', green: '#2e8b57', red: '#c0392b', gray: '#999999', ink: '#333333',
          pos: '#ffeb3b', posE: '#b59a00', neg: '#26c6da', negE: '#0f8a99', sr: '#00c000', ti: '#8a9bb0', o: '#e03030', rule: '#d5dbdb' };

/* ---- Phonon data (home_cell_stamp.u of W/data/phonon_modes.json; order Sr, Ti, O(1/2,0,1/2), O(1/2,1/2,0), O(0,1/2,1/2)) ----
   Displacement of atom kappa in cell R: u = stamp[kappa] * cos(2π k·R) (normalized so that the largest atomic displacement = 1). G is z-polarized (G_polar_z). */
var ST = {
  "G": [[0, 0, 0.2722], [0, 0, 0.4913], [0, 0, -1], [0, 0, -0.9395], [0, 0, -1]],
  "X": [[0, 1, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, -0.0327, 0]],
  "M": [[0, 0, 0], [0, 0, 0], [1, 0, 0], [0, 0, 0], [0, -1, 0]],
  "R": [[0, 0, 0], [0, 0, 0], [1, 0, 0], [0, 0, 0], [0, -1, 0]]
};
var A_CALC = 3.8995;   /* lattice constant used in the calculation (Å) */
var OMEGA = 0.5129;    /* octahedral rotation (rad per Å of the largest O displacement) = 29.39 deg/Å */
var KOF = [4, 2, 3];   /* kappa of the O atom reached from Ti along the x, y, z axes */
var MODES = [
  { key: 'G', btn: 'Γ  polar mode', k: [0, 0, 0], thz: 2.6646, cm: 88.9, imag: false, deg: 3, rot: false,
    head: 'Γ (0, 0, 0): lowest optical mode (polar mode, T<sub>1u</sub>, 3-fold degenerate)',
    irr: 'Sr origin: Γ<sub>4</sub><sup>−</sup> (T<sub>1u</sub>), Ti origin: Γ<sub>4</sub><sup>−</sup> (T<sub>1u</sub>)',
    txt: 'Every cell moves in the same way (phase +1). The cations (Sr, Ti) move in one direction and the six oxygens in the opposite direction (displacement ratios Sr +0.27, Ti +0.49, O −0.94 to −1.00). In this calculation (machine-learning potential, 0 K, harmonic approximation) the frequency is real and the mode is stable. It corresponds to the “soft mode” that softens on cooling in experiments.' },
  { key: 'X', btn: 'X  lowest mode', k: [0.5, 0, 0], thz: 3.1525, cm: 105.2, imag: false, deg: 2, rot: false,
    head: 'X (½, 0, 0): y-polarization of the lowest mode (2-fold degenerate)',
    irr: 'Sr origin: X<sub>5</sub><sup>−</sup> (E<sub>u</sub>), Ti origin: X<sub>5</sub><sup>+</sup> (E<sub>g</sub>)',
    txt: 'Since k points along x, this is a transverse wave. Sr moves mainly (99.98% of the kinetic energy) and Ti does not move. The sign reverses each time we step to the neighboring cell in the x direction; neighbors in the y and z directions move in the same direction.' },
  { key: 'M', btn: 'M  octahedral rotation', k: [0.5, 0.5, 0], thz: 1.7231, cm: 57.5, imag: false, deg: 1, rot: true,
    glazer: 'a<sup>0</sup>a<sup>0</sup>c<sup>+</sup>',
    head: 'M (½, ½, 0): rotation of the oxygen octahedra about the z axis (nondegenerate)',
    irr: 'Sr origin: M<sub>2</sub><sup>+</sup> (B<sub>1g</sub>), Ti origin: M<sub>3</sub><sup>+</sup> (A<sub>2g</sub>)',
    txt: 'The oxygen octahedra rotate like rigid bodies. Within the ab plane, neighbors rotate in opposite senses (k<sub>1</sub> = k<sub>2</sub> = ½), and along the c direction they are stacked with the same sense. Sr and Ti do not move. In this calculation the frequency is real and the mode is stable.' },
  { key: 'R', btn: 'R  octahedral rotation', k: [0.5, 0.5, 0.5], thz: -1.0882, cm: -36.3, imag: true, deg: 3, rot: true,
    glazer: 'a<sup>0</sup>a<sup>0</sup>c<sup>−</sup>',
    head: 'R (½, ½, ½): rotation about the z axis, one of the lowest (3-fold degenerate) modes',
    irr: 'Sr origin: R<sub>5</sub><sup>−</sup> (T<sub>2u</sub>), Ti origin: R<sub>4</sub><sup>+</sup> (T<sub>1g</sub>)',
    txt: 'Neighbors rotate in opposite senses both within the ab plane and along the c direction. Sr and Ti do not move. The frequency is imaginary (unstable); when the mode freezes, the structure becomes I4/mcm (the structural phase transition of SrTiO<sub>3</sub> near 105 K).' }
];

/* ---- Orbitals: drawn as collections of lobes (ellipsoids). The unit of length is the lattice constant a ---- */
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
/* Nearest-neighbor hopping (model values): t = −1 for s; Vσ = +1 for p (acts antibonding) and Vπ = −0.25 */
var VPP = { s: [-1, -1, -1], px: [1, -0.25, -0.25], py: [-0.25, 1, -0.25], pz: [-0.25, -0.25, 1] };

/* ---- Helpers ---- */
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

/* ---- Path of k points Γ–X–M–Γ–R–X | R–M (slider values 0..650; one segment = 100; the 50 between X and R is a break) ---- */
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
  return p < 550 ? 'break between X and R' : 'R–M';
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

/* ---- Style ---- */
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
 *  The viewer proper
 * ===================================================================== */
function build(root) {
  var probe = document.createElement('canvas');
  if (!probe.getContext || !probe.getContext('2d')) throw new Error('canvas is not available');
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
  var TABN = ['Phase pattern', 'Bloch sum of orbitals', 'Phonons'];
  var tabBtn = TABN.map(function (n, i) {
    var b = mk('button', 'bv-tab', n, tabs); b.type = 'button'; b.setAttribute('role', 'tab');
    b.addEventListener('click', function () { activate(i); });
    return b;
  });
  var panes = [0, 1, 2].map(function () { var d = mk('div', 'bv-pane', null, root); d.setAttribute('role', 'tabpanel'); return d; });
  var stage = root;

  /* -- Common: operating k -- */
  var kbox = mk('div', 'bv-kbox');
  var krow = mk('div', 'bv-row', '<span class="bv-lab">Wave vector k</span>', kbox);
  var kBtns = {};
  ['Γ', 'X', 'M', 'R'].forEach(function (n) {
    var b = mk('button', 'bv-btn', n, krow); b.type = 'button'; kBtns[n] = b;
    b.addEventListener('click', function () { setPos(BTN_POS[n]); });
  });
  mk('span', 'bv-note', 'Move along the path Γ–X–M–Γ–R–X | R–M', krow);
  var slWrap = mk('div', 'bv-sl', null, kbox);
  var slider = mk('input', null, null, slWrap); slider.type = 'range'; slider.min = 0; slider.max = PMAX; slider.step = 1; slider.value = S.pos;
  slider.setAttribute('aria-label', 'Path of k points');
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

  /* -- Common: time -- */
  var tbox = mk('div', 'bv-time');
  var playB = mk('button', 'bv-btn bv-play', '▶ Advance time', tbox); playB.type = 'button';
  var tsl = mk('input', null, null, tbox); tsl.type = 'range'; tsl.min = 0; tsl.max = 360; tsl.step = 1; tsl.value = 0; tsl.setAttribute('aria-label', 'Time ωt');
  var tval = mk('span', 'bv-tv', 'ωt = 0°', tbox);
  playB.addEventListener('click', function () { setPlaying(!S.playing); });
  tsl.addEventListener('input', function () { S.phase = (+tsl.value) * PI / 180; syncTime(); invalidate(); });

  /* -- Tab 1: phase pattern -- */
  var p1 = panes[0];
  var r1 = mk('div', 'bv-row', null, p1);
  var exB = mk('button', 'bv-btn bv-on', 'Draw layers apart', r1); exB.type = 'button';
  var rvB = mk('button', 'bv-btn', 'Reset view', r1); rvB.type = 'button';
  mk('span', 'bv-note', 'Drag to rotate the view (on a phone, swipe sideways)', r1);
  var cv1 = mk('canvas', 'bv-canvas', null, p1); cv1.tabIndex = 0; cv1.setAttribute('role', 'img');
  cv1.setAttribute('aria-label', 'Oblique projection of 4×4×2 unit cells colored by the real part of the Bloch phase. A clock hand on the top face of each cell shows the phase.');
  var slot1k = mk('div', null, null, p1), slot1t = mk('div', null, null, p1);
  var leg1 = mk('div', 'bv-legend', '<span><span class="bv-grad"></span> left: −1 (cyan) / middle: 0 (white) / right: +1 (yellow)</span>' +
    '<span><svg class="bv-dial" width="26" height="26" viewBox="-13 -13 26 26" aria-hidden="true"><circle r="11.5" fill="#fff" stroke="#9aa"/><line x1="0" y1="0" x2="0" y2="-10" stroke="#333" stroke-width="2" stroke-linecap="round"/><circle r="1.4" fill="#333"/></svg> Clock hand: phase 0 is at 12 o’clock (b direction), turning counterclockwise. Color = height of the hand</span>', p1);
  var info1 = mk('div', 'bv-cap', null, p1);
  exB.addEventListener('click', function () { S.explode = !S.explode; exB.className = 'bv-btn' + (S.explode ? ' bv-on' : ''); invalidate(); });
  rvB.addEventListener('click', function () { S.yaw = DEFY; S.pitch = DEFP; invalidate(); });

  /* -- Tab 2: Bloch sum of orbitals -- */
  var p2 = panes[1];
  var r2 = mk('div', 'bv-row', '<span class="bv-lab">Orbital</span>', p2);
  var orbB = {};
  ORB_ORDER.forEach(function (n) {
    var b = mk('button', 'bv-btn', ORB[n].lab, r2); b.type = 'button'; orbB[n] = b;
    b.addEventListener('click', function () { S.orb = n; syncUI(); invalidate(); });
  });
  var r2b = mk('div', 'bv-row', '<span class="bv-lab">View from</span>', p2);
  var vB = {};
  [['top', 'Top (c axis)'], ['side', 'Side (b axis)']].forEach(function (a) {
    var b = mk('button', 'bv-btn', a[1], r2b); b.type = 'button'; vB[a[0]] = b;
    b.addEventListener('click', function () { S.view = a[0]; syncUI(); invalidate(); });
  });
  var cv2 = mk('canvas', 'bv-canvas', null, p2); cv2.setAttribute('role', 'img');
  cv2.setAttribute('aria-label', 'Orbital shapes placed on two layers of 4×4 lattice points of a simple cubic lattice, with sign and size changed by the real part of the Bloch phase.');
  var slot2k = mk('div', null, null, p2), slot2t = mk('div', null, null, p2);
  var leg2 = mk('div', 'bv-legend', '<span><span class="bv-sq" style="background:' + C.pos + '"></span>lobe +</span><span><span class="bv-sq" style="background:' + C.neg + '"></span>lobe −</span>' +
    '<span>' + swatch('bond') + 'bonding</span><span>' + swatch('anti') + 'antibonding</span><span>' + swatch('zero') + 'cancelled (0)</span>' +
    '<span class="bv-note">Lobe size ∝ |Re phase|. Gray dotted outline = shape for coefficient 1</span>', p2);
  var info2 = mk('div', 'bv-cap', null, p2);

  /* -- Tab 3: phonons -- */
  var p3 = panes[2];
  var r3 = mk('div', 'bv-row', '<span class="bv-lab">Mode</span>', p3);
  var mB = MODES.map(function (m, i) {
    var b = mk('button', 'bv-btn', m.btn, r3); b.type = 'button';
    b.addEventListener('click', function () { S.mode = i; syncUI(); invalidate(); });
    return b;
  });
  var r3b = mk('div', 'bv-row', '<span class="bv-lab">View from</span>', p3); var r3bw = r3b;
  var pvB = {};
  [['top', 'Top (x-polarized)'], ['side', 'Side (z-polarized)']].forEach(function (a) {
    var b = mk('button', 'bv-btn', a[1], r3b); b.type = 'button'; pvB[a[0]] = b;
    b.addEventListener('click', function () { S.pview = a[0]; syncUI(); invalidate(); });
  });
  mk('span', 'bv-note', 'Only the polar mode can be switched', r3b);
  var cv3 = mk('canvas', 'bv-canvas', null, p3); cv3.setAttribute('role', 'img');
  cv3.setAttribute('aria-label', 'Top view of the two layers containing Ti in the 2×2×2 supercell of SrTiO3. The TiO6 octahedra and Sr move with the displacements of the selected phonon mode.');
  var ampW = mk('div', 'bv-amp', null, p3);
  mk('span', 'bv-lab', 'Maximum displacement (exaggerated)', ampW);
  var ampS = mk('input', null, null, ampW); ampS.type = 'range'; ampS.min = 0; ampS.max = 0.4; ampS.step = 0.01; ampS.value = S.amp; ampS.setAttribute('aria-label', 'Displacement amplitude');
  var ampV = mk('span', 'bv-tv', '', ampW);
  ampS.addEventListener('input', function () { S.amp = +ampS.value; syncUI(); invalidate(); });
  var slot3t = mk('div', null, null, p3);
  var leg3 = mk('div', 'bv-legend', '<span><span class="bv-sq" style="background:' + C.sr + '"></span>Sr</span><span><span class="bv-sq" style="background:' + C.ti + '"></span>Ti</span>' +
    '<span><span class="bv-sq" style="background:' + C.o + '"></span>O</span>' +
    '<span><span class="bv-sq" style="background:rgba(123,45,59,.25);border-color:' + C.acc + '"></span>octahedron counterclockwise</span>' +
    '<span><span class="bv-sq" style="background:rgba(31,78,121,.25);border-color:' + C.blue + '"></span>clockwise</span>' +
    '<span class="bv-note">Dotted = equilibrium position. Motion along the viewing direction (the z direction in the top view) is not visible</span>', p3);
  var info3 = mk('div', 'bv-cap', null, p3);

  /* ---------- Synchronizing the state ---------- */
  function setPos(p, fromSlider) {
    S.pos = p; S.k = kAt(p);
    if (!fromSlider) slider.value = p;
    syncUI(); invalidate();
  }
  function setPlaying(on) {
    S.playing = on; lastT = 0;
    playB.className = 'bv-btn bv-play' + (on ? ' bv-on' : '');
    playB.innerHTML = on ? '■ Stop' : '▶ Advance time';
    if (on) invalidate();
  }
  function syncTime() {
    var d = ((S.phase * 180 / PI) % 360 + 360) % 360;
    tsl.value = Math.round(d); tval.textContent = 'ωt = ' + Math.round(d) + '°';
  }
  function syncK() {
    var k = S.k, nm = hsName(k), seg = nm ? nm + ' point' : segName(S.pos) + ' segment';
    Object.keys(kBtns).forEach(function (n) { kBtns[n].className = 'bv-btn' + (nm === n ? ' bv-on' : ''); });
    var st = isStanding(k);
    kinfo.innerHTML = '<div><b>k = ' + kTxt(k) + '</b> (fractional coordinates) <span class="bv-tag' + (st ? ' bv-stand' : '') + '">' + seg + '</span></div>' +
      '<div>Phase angle per cell step: ' +
      '<span class="bv-fm">a</span> direction ' + dialSVG(k[0]) + '<b>' + degTxt(k[0]) + '</b>, ' +
      '<span class="bv-fm">b</span> direction ' + dialSVG(k[1]) + '<b>' + degTxt(k[1]) + '</b>, ' +
      '<span class="bv-fm">c</span> direction ' + dialSVG(k[2]) + '<b>' + degTxt(k[2]) + '</b></div>' +
      '<div>' + (st ? '<b>Standing wave</b>: the phases are only ±1, so the shape of the pattern does not change and only the overall brightness (sign) oscillates.'
                    : '<b>Traveling wave</b>: the phases are complex, so the pattern flows in the direction of k.') + '</div>';
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

  /* ---------- Canvas ---------- */
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

  /* =====================  Tab 1: phase pattern  ===================== */
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
      /* Clock: on the top face if it is visible enough, otherwise on the face turned most toward the viewer */
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
    /* Layer names */
    g.font = 'bold 13px ' + FONT; g.textAlign = 'center'; g.fillStyle = C.acc;
    [0, 1].forEach(function (l) {
      var q = sc(P(0, -2.45, (l - 0.5) * zs - hh));
      g.fillText('layer ' + (l + 1) + ' along c (n3 = ' + l + ')', clamp(q[0], 90, W - 90), clamp(q[1] + 12, 14, H - 6));
    });
    /* Axis ticks */
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
      g.fillStyle = C.amber; g.textAlign = 'right'; g.fillText('direction of k', W - 8, 76);
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
    info1.innerHTML = 'Value in each cell <span class="bv-fm">R</span> = (<span class="bv-fm">n</span><sub>1</sub>, <span class="bv-fm">n</span><sub>2</sub>, <span class="bv-fm">n</span><sub>3</sub>) = Re[ exp i(<span class="bv-fm">k</span>·<span class="bv-fm">R</span> − ωt) ] = cos[ 2π(' +
      f3(k[0]) + ' <span class="bv-fm">n</span><sub>1</sub> + ' + f3(k[1]) + ' <span class="bv-fm">n</span><sub>2</sub> + ' + f3(k[2]) + ' <span class="bv-fm">n</span><sub>3</sub>) − ' + Math.round(((S.phase * 180 / PI) % 360 + 360) % 360) + '° ]' +
      '<p class="bv-note">' + (isStanding(k) ? 'For this k the phase difference between neighboring cells is only 0° or 180°, so the shape of the pattern does not change (press ▶ and only the overall brightness oscillates).'
                                          : 'For this k the phase difference takes values between 0° and 180°, and pressing ▶ makes the pattern flow.') +
      ' Directions in which the same color continues from cell to cell have phase difference 0°; directions in which the colors alternate have 180°.</p>';
  }

  /* Rotate the view by dragging */
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

  /* =====================  Tab 2: Bloch sum of orbitals  ===================== */
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
    g.fillText(top ? 'layer z = ' + Lr + ' (top view)' : 'layer y = ' + Lr + ' (xz section)', x0 + P / 2, y0 + 19);
    g.font = '12px ' + FONT; g.fillStyle = '#4a5568'; g.fillText(top ? 'right = x, up = y' : 'right = x, up = z', x0 + P / 2, y0 + 36);
    function SX(i) { return x0 + (MG + i) * cell; }
    function SY(j) { return y0 + TH + (MG + 3 - j) * cell; }
    var i, j;
    /* Lattice (faint) */
    g.strokeStyle = '#e6e8ea'; g.lineWidth = 1; g.beginPath();
    for (i = 0; i < 4; i++) { g.moveTo(SX(i), SY(0)); g.lineTo(SX(i), SY(3)); g.moveTo(SX(0), SY(i)); g.lineTo(SX(3), SY(i)); }
    g.stroke();
    /* Orbital stamps */
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
      /* Ghost (shape for coefficient 1) */
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
    /* Bond lines (s and p only) */
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
    var ax = ['x', 'y', 'z'], names = { bond: 'bonding', anti: 'antibonding', zero: 'cancelled (0)' };
    if (orb.kind === 'd') {
      info2.innerHTML = '<p><b>' + orb.lab + '</b>: for d orbitals the energy is determined less by the direct overlap between neighboring d orbitals than by the overlap with the oxygen p orbitals in between (for Ti 3d in SrTiO<sub>3</sub>, see <a href="#secC-6">§C.6</a> of the text).' +
        'For this reason the figure shows neither bond lines nor energies, only the sign (lobe color) and size at each lattice point. The shapes and signs of the lobes are: d<sub>xy</sub> is + where xy &gt; 0, d<sub>yz</sub> is + where yz &gt; 0, d<sub>xz</sub> is + where xz &gt; 0, d<sub>x²−y²</sub> has + lobes along ±x, and d<sub>z²</sub> has + lobes along ±z with a − ring around the waist.</p>' +
        '<p class="bv-note">At lattice points where the real part of the phase is negative, the lobe colors are exchanged (+ lobes are cyan, − lobes are yellow).</p>';
      return;
    }
    var chips = '', cnt = { bond: 0, anti: 0, zero: 0 }, allInt = true, i;
    for (i = 0; i < 3; i++) {
      var b = bondInfo(o, i, k); cnt[b.t] += 2; if (Math.abs(Math.abs(b.c) - 1) > 1e-6) allInt = false;
      var kind = orb.kind === 'p' ? (orb.ax === i ? ' (σ)' : ' (π)') : '';
      chips += '<span class="bv-chip">' + swatch(b.t) + ax[i] + ' direction' + kind + ': <b>' + names[b.t] + '</b> <small>cos 2πk<sub>' + (i + 1) + '</sub> = ' + f2(b.c) + '</small></span>';
    }
    h += '<div class="bv-chips">' + chips + '</div>';
    if (allInt) h += '<p>Seen from this atom, of the six nearest neighbors <b>' + cnt.bond + ' are bonding and ' + cnt.anti + ' are antibonding</b> (' + (hsName(k) || 'this k') + ').</p>';
    else h += '<p class="bv-note">At intermediate k, the strength of bonding in each direction is set by the value of cos 2πk<sub>i</sub> (it varies continuously between 1 and −1 at the two ends). There are two neighbors in each direction.</p>';
    var E = energyOf(o, k), Em = o === 's' ? 6 : 3, formula;
    if (o === 's') formula = '<i>E</i>(<b>k</b>) = ε<sub>s</sub> + 2<i>t</i>[cos 2πk<sub>1</sub> + cos 2πk<sub>2</sub> + cos 2πk<sub>3</sub>], <i>t</i> = −1 (a value for illustration, with |<i>t</i>| as the unit of energy)';
    else {
      var a1 = orb.ax, o2 = [0, 1, 2].filter(function (z) { return z !== a1; });
      formula = '<i>E</i><sub>p<sub>' + ax[a1] + '</sub></sub>(<b>k</b>) = ε<sub>p</sub> + 2<i>V</i><sub>σ</sub> cos 2πk<sub>' + (a1 + 1) + '</sub> + 2<i>V</i><sub>π</sub>(cos 2πk<sub>' + (o2[0] + 1) + '</sub> + cos 2πk<sub>' + (o2[1] + 1) + '</sub>), <i>V</i><sub>σ</sub> = +1, <i>V</i><sub>π</sub> = −0.25 (values for illustration, with <i>V</i><sub>σ</sub> as the unit)';
    }
    h += '<p>' + formula + '</p><p><b>' + (o === 's' ? '<i>E</i> − ε<sub>s</sub>' : '<i>E</i> − ε<sub>p</sub>') + ' = ' + f2(E) + (o === 's' ? ' |<i>t</i>|' : ' <i>V</i><sub>σ</sub>') + '</b></p>' +
      '<div class="bv-ebar"><i style="left:' + (100 * (E + Em) / (2 * Em)).toFixed(1) + '%"></div><div class="bv-eb-l"><span>low (−' + Em + ')</span><span>high (+' + Em + ')</span></div>' +
      '<p class="bv-note">Bonding is judged from the phase difference 2πk<sub>i</sub> between the two neighboring cells (bonding if <i>V</i> cos 2πk<sub>i</sub> &lt; 0). At the standing-wave points this agrees with the relation between the signs in the figure.' +
      (o === 's' ? '' : ' For p orbitals, the neighbor along the axis (σ) is antibonding when the signs are aligned, because a + lobe faces a − lobe.') + '</p>';
    info2.innerHTML = h;
  }

  /* =====================  Tab 3: phonons  ===================== */
  function stampOf(m, view) {
    var st = ST[m.key];
    if (m.key !== 'G' || view === 'side') return st;
    var perm = [0, 1, 2, 4, 3];   /* Polarization z → x: exchange x and z */
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
  function rotSense(m, Lr) {   /* Sense of rotation of the (0,0) octahedron in layer Lr (+1 counterclockwise / −1 clockwise / 0) */
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
    var ds = S.amp / A_CALC * Math.cos(S.phase);   /* displacement per unit of u (in units of the unit cell) */
    g.fillStyle = '#fff'; g.fillRect(x0, y0, P, P + TH); g.strokeStyle = C.rule; g.lineWidth = 1; g.strokeRect(x0 + 0.5, y0 + 0.5, P - 1, P + TH - 1);
    g.font = 'bold 13px ' + FONT; g.textAlign = 'center'; g.fillStyle = C.acc;
    var pc = Lr + 0.5;
    g.fillText(side ? 'plane y = ' + (pc === 0.5 ? '½' : '3/2') + ' (side view)' : (Lr === 0 ? 'lower layer, z = ½' : 'upper layer, z = 3/2'), x0 + P / 2, y0 + 19);
    g.font = '12px ' + FONT; g.fillStyle = '#4a5568'; g.fillText(side ? 'right = x, up = z' : 'right = x, up = y', x0 + P / 2, y0 + 36);
    function TX(h) { return x0 + (MG + h) * cell; }
    function TY(v) { return y0 + TH + (MG + 2 - v) * cell; }
    function pt(o, dd) { return [TX(o.h + o.dh * ds * dd), TY(o.v + o.dv * ds * dd)]; }
    /* Frame of the supercell and lines of the unit cells */
    g.setLineDash([4, 3]); g.strokeStyle = '#c4cacf'; g.lineWidth = 1; g.strokeRect(TX(0), TY(2), 2 * cell, 2 * cell);
    g.beginPath(); g.moveTo(TX(1), TY(0)); g.lineTo(TX(1), TY(2)); g.moveTo(TX(0), TY(1)); g.lineTo(TX(2), TY(1)); g.stroke(); g.setLineDash([]);
    var ang = (Math.abs(S.amp) * OMEGA * 180 / PI) * Math.cos(S.phase);
    /* Octahedra at the equilibrium positions (dotted) */
    G.oct.forEach(function (oc) {
      g.beginPath(); oc.vs.forEach(function (o, n) { var q = pt(o, 0); if (n) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath();
      g.setLineDash([2, 3]); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke(); g.setLineDash([]);
    });
    /* Displaced octahedra */
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
    /* Rotation arrows */
    if (m.rot) {
      var cs = Math.cos(S.phase);
      G.oct.forEach(function (oc) {
        if (Math.abs(oc.w) < 0.05) return;
        var s = (oc.w > 0 ? 1 : -1) * (cs >= 0 ? 1 : -1), q = pt(oc.ti, 1), r = cell * 0.17, a0 = -0.5 * PI + 0.9, e = a0 - s * 1.45 * PI * 1;
        var anti = s > 0;   /* counterclockwise on the screen */
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
    h += '<p>k = ' + kFrac(k) + ': per cell step the phase turns by <b>' + degTxt(k[0]) + '</b> in the <span class="bv-fm">a</span> direction, <b>' + degTxt(k[1]) + '</b> in the <span class="bv-fm">b</span> direction, and <b>' + degTxt(k[2]) + '</b> in the <span class="bv-fm">c</span> direction (standing wave).</p>';
    h += '<p>Frequency: <b>' + (m.imag ? 'imaginary frequency (unstable)' : m.thz.toFixed(3) + ' THz') + '</b> (' + (m.imag ? 'magnitude ' + Math.abs(m.thz).toFixed(3) + ' THz = ' + Math.abs(m.cm).toFixed(1) + ' cm<sup>−1</sup>; plotted as a negative value in the dispersion diagram' : m.cm.toFixed(1) + ' cm<sup>−1</sup>') + '). Degeneracy: ' + m.deg + '.</p>';
    h += '<p>Irreducible representation: ' + m.irr + ' (the name depends on the choice of origin).</p>';
    if (m.rot) {
      var s0 = rotSense(m, 0), s1 = rotSense(m, 1), same = s0 === s1;
      h += '<p>Glazer notation <b>' + m.glazer + '</b>. The octahedra in the two layers of the figure (layers one cell apart along c) <b>' + (same ? 'rotate in the same sense = M' : 'rotate in opposite senses = R') +
        '</b> (the lower-left octahedron turns ' + (s0 > 0 ? 'counterclockwise' : 'clockwise') + ' in the lower layer and ' + (s1 > 0 ? 'counterclockwise' : 'clockwise') + ' in the upper layer). Neighbors within the ab plane turn in opposite senses. ' +
        'For the current maximum displacement of ' + S.amp.toFixed(2) + ' Å, the rotation angle of the octahedra is at most <b>' + (S.amp * OMEGA * 180 / PI).toFixed(1) + '°</b> (about 2.9° per 0.1 Å of O displacement).</p>';
    } else {
      h += '<p class="bv-note">View: ' + (view === 'top' ? 'x-polarization seen from above (motion along z is not visible)' : 'z-polarization seen from the side (xz section; the up-and-down motion along z is visible here)') + '.</p>';
    }
    h += '<p>' + m.txt + '</p>';
    if (m.imag) h += '<p class="bv-note">A mode with an imaginary frequency does not really oscillate; the displacement grows and freezes. Here the same pattern is swung back and forth so that the pattern can be seen.</p>';
    h += '<p class="bv-note">Data: machine-learning potential (MACE) + phonopy, 2×2×2 supercell (40 atoms), lattice constant a = 3.8995 Å, Sr origin, no nonanalytic term. The displacement is the eigenvector normalized so that the largest atomic displacement is 1, times cos(ωt). The two layers are those containing Ti (z = ½ and 3/2).</p>';
    info3.innerHTML = h;
  }

  /* ---------- Start-up ---------- */
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
    root.textContent = 'The interactive viewer could not be started (' + (e && e.message ? e.message : e) + '). Please update your browser or refer to the figures in the text (Figures C.4, C.5, and C.12).';
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
