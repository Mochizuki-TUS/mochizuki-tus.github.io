/* quasicrystal-viewer.js — 付録E「準結晶」の対話図
 *   図E.2　Fibonacci 鎖の切断射影（スライダーで並進 u とフェイゾン変位 w を動かす．静止版 figs/appE_figE-2.svg）
 *   図E.4　フェイゾン変位による飛び移り（静止図だけ．figs/appE_figE-4.svg．図E.2 と同じ描画関数の 2 段表示）
 *   図E.5　6 本の基底：物理空間の a_i と補空間の b_i（ドラッグで 2 枚が同時に回る．静止版 figs/appE_figE-5.svg）
 * 使い方：本文に器 <div class="qc-viewer" data-qc="fib"> または data-qc="basis"（中に静止図の <img>）を置き，
 *   <script src="assets/quasicrystal-viewer.js" defer></script> を 1 回だけ読み込む．JS が動けば器の中身を対話図に置き換え，
 *   動かなければ静止図の <img> がそのまま見える．
 * 素の JavaScript（外部ライブラリなし，グローバル変数なし）．ただし DOM のない環境（jsc など）では，描画の核を
 *   globalThis.QCViewerCore として公開する（静止図 figs/appE_figE-2,4,5.svg はこの核で生成した）．
 * 約束（本文 E.3 と設計書 §2）：2 次元正方格子の格子定数 a_2D = 1，黄金比 τ = (1+√5)/2，n = √(1+τ²) = √(τ+2)．
 *   ê∥ = (τ, 1)/n（傾き 1/τ），ê⊥ = (−1, τ)/n（3 次元の b_i と同じ Galois 共役の向き）．
 *   格子点 (i, j) の座標は x∥ = (τi + j)/n，x⊥ = (−i + τj)/n．窓の幅 W = (1+τ)/n = L + S．
 *   並進 u は格子を +ê∥ に u，フェイゾン変位 w は格子を +ê⊥ に w ずらす（切断＝物理空間の直線 x⊥ = 0 と窓は動かさない）．
 *   原子になるのは 0 ≤ x⊥ + w < W の格子点．図では E∥ を水平（右が +ê∥），+ê⊥ を上向きに描く（方眼紙を回しただけで鏡像ではない）．
 *   したがって w = 0 では切断の上側の格子点が選ばれ，各格子点の原子面は格子点から下向きに長さ W（格子点側の端を含み下端を含まない）．
 *   原子 k は格子点 (i_k, k − i_k)，i_k = ⌊k/τ + w/W⌋ にあり，位置は x_k = (τ i_k + j_k)/n + u．
 *   S 単位では x_k = k + (τ−1)⌊k/τ + φ⌋ + u（φ = w/W）となり，目録 QC §9 の床関数の式と同じになる．
 *   図E.5 の基底は a_1 = (1, τ, 0) …，b_i は τ → −1/τ（設計書 §2）．初期の向きは 261126_superspacegroup.html の initialView() を引き継ぐ．
 */
(function () {
'use strict';

/* =====================================================================
 *  描画の核（DOM を使わない．状態 → SVG 文字列）
 * ===================================================================== */
var TAU = (1 + Math.sqrt(5)) / 2;
var NRM = Math.sqrt(1 + TAU * TAU);
var LEN_L = TAU / NRM, LEN_S = 1 / NRM, WIN = (1 + TAU) / NRM;   /* a_2D = 1 の単位．WIN = L + S */
var FONT = "'Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic','Meiryo','Noto Sans CJK JP','Noto Sans JP',sans-serif";
var MATH = "'Times New Roman',Times,serif";
var C = { acc: '#7b2d3b', blue: '#1a5276', green: '#1e8449', greenL: '#8cc39f', amber: '#b9770e', amberL: '#ead7b4',
          warn: '#a04000', ink: '#22262b', gray: '#888888', grid: '#ececec', rule: '#d5dbdb', text: '#1a202c', muted: '#4a5568',
          edge: '#8fa6bd', axis: '#9aa1a9' };

function n1(x) { return (Math.round(x * 10) / 10).toFixed(1); }       /* SVG 座標 */
function fm(x, d) {                                                       /* 表示用（負号は −） */
  var s = (Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x).toFixed(d);
  return s.charAt(0) === '-' ? '−' + s.slice(1) : s;
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function line(x1, y1, x2, y2, st) { return '<line x1="' + n1(x1) + '" y1="' + n1(y1) + '" x2="' + n1(x2) + '" y2="' + n1(y2) + '" ' + st + '/>'; }
function circ(x, y, r, st) { return '<circle cx="' + n1(x) + '" cy="' + n1(y) + '" r="' + r + '" ' + st + '/>'; }
function txt(x, y, s, st) { return '<text x="' + n1(x) + '" y="' + n1(y) + '" ' + st + '>' + s + '</text>'; }
/* E∥，E⊥ の文字（斜体の E と下付き） */
function eSym(sub, rest) { return '<tspan font-family="' + MATH + '" font-style="italic">E</tspan><tspan font-size="75%" dy="4">' + sub + '</tspan><tspan dy="-4">' + (rest || '\u2009') + '</tspan>'; }
function mi(s) { return '<tspan font-family="' + MATH + '" font-style="italic">' + s + '</tspan>'; }

/* ---------- Fibonacci 鎖 ---------- */
function parOf(i, j) { return (TAU * i + j) / NRM; }
function perpOf(i, j) { return (-i + TAU * j) / NRM; }   /* ê⊥ = (−1, τ)/n */
function iOf(k, w) { return Math.floor(k / TAU + w / WIN); }
/* 幾何による判定（検算用）：格子を +ê⊥ に w ずらしたとき，格子点 (i,j) が窓 0 ≤ x⊥ + w < W に入るか */
function selGeom(i, j, w) { var q = perpOf(i, j) + w; return q > -1e-12 && q < WIN - 1e-12; }
function atom(k, u, w) { var i = iOf(k, w), j = k - i; return { k: k, i: i, j: j, par: parOf(i, j), x: parOf(i, j) + u, p: perpOf(i, j) }; }
function chain(kmin, kmax, u, w) { var a = [], k; for (k = kmin; k <= kmax; k++) a.push(atom(k, u, w)); return a; }
/* 隣どうしの間隔：Δi = 1（格子の (1,0) 方向）なら L，Δi = 0（(0,1) 方向）なら S */
function gapSeq(atoms) { var s = '', t; for (t = 1; t < atoms.length; t++) s += (atoms[t].i - atoms[t - 1].i === 1) ? 'L' : 'S'; return s; }
function jumped(k, w, wRef) { return iOf(k, w) !== iOf(k, wRef); }
function jumpFraction(w, wRef, k0, nAtoms) {
  var c = 0, k; for (k = k0; k < k0 + nAtoms; k++) if (jumped(k, w, wRef)) c++;
  return c / nAtoms;
}

/* 図E.2・E.4 の SVG．o = { u, w, wRef(既定 0), mode: 'single' | 'compare', pTop, pBot, idp, title }
 * 切断（x⊥ = 0 の水平線）は動かさず，格子（格子点と原子面）を (u, w) だけずらして描く． */
function fibSVG(o) {
  var u = o.u || 0, w = o.w || 0, wRef = o.wRef || 0, mode = o.mode || 'single', idp = o.idp || 'qcE2';
  var VW = 720, SC = 58, PL = 10, PR = 710, PT = 34;   /* PT より上は凡例の帯 */
  var pTop = (o.pTop != null) ? o.pTop : 1.75, pBot = (o.pBot != null) ? o.pBot : -1.6;
  var OX = 24 + 1.1 * SC, OY = PT + SC * pTop, PB = OY - SC * pBot;
  var X = function (par) { return OX + SC * par; }, Y = function (p) { return OY - SC * p; };   /* 画面の上 = +ê⊥ */
  var parMin = (PL - OX) / SC, parMax = (PR - OX) / SC;
  var cmp = mode === 'compare', showRef = cmp || Math.abs(w - wRef) > 1e-9, moved = Math.abs(u) + Math.abs(w) > 1e-9;
  var yRow1 = PB + 56, yRow2 = cmp ? yRow1 + 86 : yRow1, VH = (cmp ? yRow2 : yRow1) + 50;
  var s = '', i, j;

  /* 格子の添字の範囲：表示座標 (d∥, d⊥) → 格子の座標 (d∥ − u, d⊥ − w) → i = (τx∥ − x⊥)/n，j = (x∥ + τx⊥)/n */
  var cs = [[parMin - 1, pBot - 1], [parMin - 1, pTop + WIN + 1], [parMax + 1, pBot - 1], [parMax + 1, pTop + WIN + 1]];
  var imin = 1e9, imax = -1e9, jmin = 1e9, jmax = -1e9;
  cs.forEach(function (c) {
    var px = c[0] - u, pp = c[1] - w, ii = (TAU * px - pp) / NRM, jj = (px + TAU * pp) / NRM;
    imin = Math.min(imin, Math.floor(ii)); imax = Math.max(imax, Math.ceil(ii));
    jmin = Math.min(jmin, Math.floor(jj)); jmax = Math.max(jmax, Math.ceil(jj));
  });
  var LX = function (i, j) { return X(parOf(i, j) + u); }, LY = function (i, j) { return Y(perpOf(i, j) + w); };
  var isSel = function (i, j, ww) { return iOf(i + j, ww) === i; };

  var title = o.title || '';
  s += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + VW + ' ' + VH + '" width="100%" role="img" aria-label="' + esc(title) + '" font-family="' + FONT + '" font-size="14">';
  if (title) s += '<title>' + esc(title) + '</title>';
  s += '<defs><clipPath id="' + idp + 'clip"><rect x="' + PL + '" y="' + PT + '" width="' + (PR - PL) + '" height="' + n1(PB - PT) + '"/></clipPath>' +
       '<marker id="' + idp + 'ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + C.warn + '"/></marker>' +
       '<marker id="' + idp + 'arl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#444"/></marker></defs>';
  s += '<rect x="0" y="0" width="' + VW + '" height="' + VH + '" fill="#fff"/>';
  /* 凡例の帯 */
  (function () {
    var lx = PL + 2, ly = 20, st = 'fill="' + C.muted + '" font-size="13"', it = [];
    var arrowSample = line(0, 6, 20, -6, 'stroke="#444" stroke-width="1.6" marker-end="url(#' + idp + 'arl)"');
    if (showRef) {
      it.push([line(0, 0, 22, 0, 'stroke="' + C.green + '" stroke-width="2.2"'), '切断 ' + eSym('∥', '（固定）'), 108]);
      it.push([arrowSample, '格子のずれ', 66]);
      it.push([line(11, -9, 11, 7, 'stroke="' + C.amber + '" stroke-width="3.2"'), '原子面（長さ ' + mi('W') + '）', 112]);
      it.push([circ(11, 0, 7, 'fill="none" stroke="' + C.warn + '" stroke-width="2"') + circ(11, 0, 3.5, 'fill="' + C.ink + '"'), '跳んだ原子', 72]);
      it.push([circ(11, 0, 3.4, 'fill="#fff" stroke="' + C.gray + '" stroke-width="1.2"'), mi('w') + ' = 0 の原子', 90]);
    } else {
      it.push([line(0, 0, 22, 0, 'stroke="' + C.green + '" stroke-width="2.2"'), '切断 ' + eSym('∥', '（物理空間）'), 150]);
      it.push([line(11, -9, 11, 7, 'stroke="' + C.amber + '" stroke-width="3.2"'), '原子面（格子点から下へ長さ ' + mi('W') + ' = ' + mi('L') + ' + ' + mi('S') + '）', 250]);
      if (moved) it.push([arrowSample, '格子のずれ', 66]);
      else it.push([line(11, 8, 11, -9, 'stroke="#555" stroke-width="1" stroke-dasharray="5 4"'), eSym('⊥', 'の軸（上が正）'), 120]);
    }
    it.forEach(function (e) {
      s += '<g transform="translate(' + n1(lx) + ',' + (ly - 5) + ')">' + e[0] + '</g>' + txt(lx + 28, ly, e[1], st);
      lx += 28 + e[2];
    });
  })();
  s += '<rect x="' + PL + '" y="' + PT + '" width="' + (PR - PL) + '" height="' + n1(PB - PT) + '" fill="#fff" stroke="' + C.rule + '"/>';
  s += '<g clip-path="url(#' + idp + 'clip)">';
  /* 正方格子の線（淡い灰．格子と一緒に動く） */
  for (i = imin; i <= imax; i++) s += line(LX(i, jmin), LY(i, jmin), LX(i, jmax), LY(i, jmax), 'stroke="' + C.grid + '" stroke-width="1"');
  for (j = jmin; j <= jmax; j++) s += line(LX(imin, j), LY(imin, j), LX(imax, j), LY(imax, j), 'stroke="' + C.grid + '" stroke-width="1"');
  /* E⊥ の軸（空間の原点を通る．格子が動いても軸は動かない） */
  s += line(X(0), PT, X(0), PB, 'stroke="#555" stroke-width="1" stroke-dasharray="5 4"');
  /* 原子面：格子点から下向きに長さ W．切断が横切るものは濃い琥珀，w = 0 で横切っていたものは破線 */
  var bars = '', barsOn = '', barsOld = '', pts = '';
  for (i = imin; i <= imax; i++) for (j = jmin; j <= jmax; j++) {
    var x = LX(i, j), y0 = LY(i, j), y1 = Y(perpOf(i, j) + w - WIN);
    if (x < PL - 5 || x > PR + 5 || y0 > PB + 5 || y1 < PT - 5) continue;
    var on = isSel(i, j, w), old = showRef && isSel(i, j, wRef);
    if (on) barsOn += line(x, y0, x, y1, 'stroke="' + C.amber + '" stroke-width="3.2" stroke-linecap="butt"');
    else if (old) barsOld += line(x, y0, x, y1, 'stroke="' + C.amber + '" stroke-width="2.4" stroke-dasharray="5 3" opacity="0.75"');
    else bars += line(x, y0, x, y1, 'stroke="' + C.amberL + '" stroke-width="2"');
    pts += circ(x, y0, on ? 2.9 : 2.3, 'fill="' + (on ? '#555' : '#aaa') + '"');
  }
  s += bars + barsOld + barsOn + pts;
  /* 原点 O（格子点 (0,0)）と，格子のずれ（空間の原点から格子点 O へ） */
  if (moved && Math.hypot(SC * u, SC * w) > 6) {
    s += circ(X(0), Y(0), 3, 'fill="none" stroke="#444" stroke-width="1" stroke-dasharray="2 1.5"');
    s += line(X(0), Y(0), LX(0, 0), LY(0, 0), 'stroke="#444" stroke-width="1.6" marker-end="url(#' + idp + 'arl)"');
  }
  s += txt(LX(0, 0) - 6, LY(0, 0) + 15, 'O', 'font-family="' + MATH + '" font-size="13" fill="' + C.ink + '" text-anchor="end" stroke="#fff" stroke-width="3" paint-order="stroke"');

  /* 表示する原子の範囲 */
  var dpar = (1 + 1 / (TAU * TAU)) / NRM;
  var kmin = Math.floor((parMin - u) / dpar) - 4, kmax = Math.ceil((parMax - u) / dpar) + 4;
  var A = chain(kmin, kmax, u, w).filter(function (a) { return X(a.x) >= PL + 6 && X(a.x) <= PR - 6; });
  var R = chain(kmin, kmax, u, wRef).filter(function (a) { return X(a.x) >= PL + 6 && X(a.x) <= PR - 6; });
  var Rk = {}; R.forEach(function (a) { Rk[a.k] = a; });

  /* 射影の補助線（原子から下段の並びへ） */
  A.forEach(function (a) { s += line(X(a.x), Y(0), X(a.x), PB, 'stroke="#c4c4c4" stroke-width="0.8" stroke-dasharray="2 3"'); });
  /* 切断（固定）と原子．w = 0 の原子は白丸で残す */
  s += line(PL, Y(0), PR, Y(0), 'stroke="' + C.green + '" stroke-width="2.2"');
  if (showRef) R.forEach(function (a) { if (jumped(a.k, w, wRef)) s += circ(X(a.x), Y(0), 3.4, 'fill="#fff" stroke="' + C.gray + '" stroke-width="1.2"'); });
  A.forEach(function (a) {
    var jp = showRef && jumped(a.k, w, wRef);
    if (jp) s += circ(X(a.x), Y(0), 8.5, 'fill="none" stroke="' + C.warn + '" stroke-width="2"');
    s += circ(X(a.x), Y(0), 4.3, 'fill="' + C.ink + '"');
  });
  s += '</g>';

  /* 枠の中の文字 */
  s += txt(PR - 4, Y(0) + 19, eSym('∥'), 'fill="' + C.green + '" font-size="16" text-anchor="end" stroke="#fff" stroke-width="4" paint-order="stroke"');
  s += txt(X(0) + 10, PT + 20, eSym('⊥'), 'fill="#444" font-size="16" stroke="#fff" stroke-width="4" paint-order="stroke"');
  /* 窓の幅 W の目盛り：左端に近い濃い原子面の左に添える */
  var bw = null;
  A.forEach(function (a) { if (!bw && X(a.x) > PL + 42 && Math.abs(X(a.x) - X(0)) > 25) bw = a; });
  if (bw) {
    var bx = X(bw.x) - 11, by0 = Y(bw.p + w), by1 = Y(bw.p + w - WIN);
    if (by0 > PT + 2 && by1 < PB - 2) {
      s += line(bx, by0, bx, by1, 'stroke="' + C.amber + '" stroke-width="1.2"');
      s += line(bx - 4, by0, bx + 4, by0, 'stroke="' + C.amber + '" stroke-width="1.2"') + line(bx - 4, by1, bx + 4, by1, 'stroke="' + C.amber + '" stroke-width="1.2"');
      s += txt(bx - 6, by0 + 18, mi('W'), 'fill="' + C.amber + '" font-size="16" text-anchor="end" stroke="#fff" stroke-width="4" paint-order="stroke"');
    }
  }

  /* 下段：E∥ 上の原子の並び */
  function row(atoms, y, label, ring, arrowsFrom) {
    var r = txt(14, y - 30, label, 'fill="' + C.muted + '" font-size="13" stroke="#fff" stroke-width="4" paint-order="stroke"');
    var t2;
    for (t2 = 1; t2 < atoms.length; t2++) {
      var a = atoms[t2 - 1], b = atoms[t2], isL = (b.i - a.i === 1);
      var col = isL ? C.acc : C.blue;
      r += line(X(a.x), y, X(b.x), y, 'stroke="' + col + '" stroke-width="5"');
      r += txt((X(a.x) + X(b.x)) / 2, y - 9, isL ? 'L' : 'S', 'fill="' + col + '" font-family="' + MATH + '" font-size="15" font-weight="bold" text-anchor="middle"');
    }
    atoms.forEach(function (a) {
      var jp = ring && jumped(a.k, w, wRef);
      if (jp) r += circ(X(a.x), y, 8, 'fill="none" stroke="' + C.warn + '" stroke-width="2"' + (ring === 'dash' ? ' stroke-dasharray="3 2"' : ''));
      r += circ(X(a.x), y, 3.6, 'fill="#fff" stroke="' + C.ink + '" stroke-width="1.4"');
      r += txt(X(a.x), y + 21, fm(a.k, 0), 'fill="' + (jp ? C.warn : C.muted) + '" font-size="11.5" text-anchor="middle"' + (jp ? ' font-weight="bold"' : ''));
      if (arrowsFrom && jp && Rk[a.k]) {
        var x0 = X(Rk[a.k].x), x1 = X(a.x);
        if (Math.abs(x1 - x0) > 6) r += line(x0, y + 32, x1 + (x1 > x0 ? -1 : 1), y + 32, 'stroke="' + C.warn + '" stroke-width="1.6" marker-end="url(#' + idp + 'ar)"');
      }
    });
    return r;
  }
  if (cmp) {
    s += row(R, yRow1, mi('w') + ' = 0 のときの並び（数字は原子の番号 ' + mi('k') + '．丸印は次に跳ぶ原子）', 'dash', false);
    s += row(A, yRow2, '格子を ' + mi('w') + ' = ' + fm(w / WIN, 2) + mi('W') + ' ずらしたときの並び（丸印が跳んだ原子．矢印は跳んだ向きと長さ ' + mi('L') + ' − ' + mi('S') + '）', true, true);
    /* 跳んだ原子：上段の位置と下段の位置を結ぶ */
    A.forEach(function (a) {
      if (jumped(a.k, w, wRef) && Rk[a.k]) {
        /* 下段の見出しの帯（yRow2 − 46 〜 yRow2 − 22）は避けて 2 本に分けて引く */
        var xa = X(Rk[a.k].x), xb = X(a.x), ya = yRow1 + 27, yb = yRow2 - 14, xm = function (y) { return xa + (xb - xa) * (y - ya) / (yb - ya); };
        s += line(xa, ya, xm(yRow2 - 46), yRow2 - 46, 'stroke="' + C.warn + '" stroke-width="1" stroke-dasharray="3 3"') + line(xm(yRow2 - 22), yRow2 - 22, xb, yb, 'stroke="' + C.warn + '" stroke-width="1" stroke-dasharray="3 3"');
      }
    });
  } else {
    s += row(A, yRow1, eSym('∥', 'に射影した') + '原子の並び（数字は原子の番号 ' + mi('k') + '）' + (showRef ? '．丸印は ' + mi('w') + ' = 0 から跳んだ原子' : ''), showRef, showRef);
  }
  s += '</svg>';
  return s;
}

/* ---------- 6 本の基底と正二十面体 ---------- */
function vecA() { var t = TAU; return [[1, t, 0], [-1, t, 0], [0, 1, t], [t, 0, 1], [t, 0, -1], [0, 1, -t]]; }
function vecB() { var v = -1 / TAU; return [[1, v, 0], [-1, v, 0], [0, 1, v], [v, 0, 1], [v, 0, -1], [0, 1, -v]]; }
function dot(a, b) { var s = 0, i; for (i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function unit(a) { var n = Math.sqrt(dot(a, a)); return a.map(function (x) { return x / n; }); }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function matMul(A, B) {
  var n = A.length, p = B[0].length, q = B.length, M = [], i, j, k;
  for (i = 0; i < n; i++) { M.push([]); for (j = 0; j < p; j++) { var s = 0; for (k = 0; k < q; k++) s += A[i][k] * B[k][j]; M[i].push(s); } }
  return M;
}
function rotX(t) { var c = Math.cos(t), s = Math.sin(t); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
function rotY(t) { var c = Math.cos(t), s = Math.sin(t); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
/* 行：画面の右，上，手前（世界座標）．12 本の矢印がどれも画面上で短くならない向き（SSG の initialView） */
function initialView() {
  var a = unit(vecA()[0]), z = [0, 0, 1], x = cross(a, z);
  return matMul(rotX(0.79), matMul(rotY(-0.68), [x, a, z]));
}
function apply3(R, v) { return [dot(R[0], v), dot(R[1], v), dot(R[2], v)]; }
function icoEdges(U) {
  var V = [], E = [], i, j, c = 1 / Math.sqrt(5);
  for (i = 0; i < 6; i++) { V.push(U[i]); V.push(U[i].map(function (x) { return -x; })); }
  for (i = 0; i < 12; i++) for (j = i + 1; j < 12; j++) if (Math.abs(dot(V[i], V[j]) - c) < 1e-9) E.push([i, j]);
  return { V: V, E: E };
}
var UA = vecA().map(unit), UB = vecB().map(unit), ICO_A = icoEdges(UA), ICO_B = icoEdges(UB);

/* 360×360 の枠の中身（which = 'a' または 'b'） */
function basisPanel(R, which) {
  var U = which === 'a' ? UA : UB, ico = which === 'a' ? ICO_A : ICO_B, letter = which;
  var CX = 180, CY = 182, RAD = 118, items = [], i;
  function proj(v) { var p = apply3(R, v); return { x: CX + RAD * p[0], y: CY - RAD * p[1], z: p[2] }; }
  function op(z) { return (0.35 + 0.65 * (z + 1) / 2).toFixed(3); }
  [['x', [1, 0, 0]], ['y', [0, 1, 0]], ['z', [0, 0, 1]]].forEach(function (ax) {
    var p0 = proj(ax[1].map(function (t) { return -1.3 * t; })), p1 = proj(ax[1].map(function (t) { return 1.3 * t; }));
    var pl = proj(ax[1].map(function (t) { return 1.42 * t; }));
    items.push({ z: -2, s: line(p0.x, p0.y, p1.x, p1.y, 'stroke="' + C.axis + '" stroke-width="1" stroke-dasharray="4 3"') +
      txt(pl.x, pl.y + 4, ax[0], 'font-family="' + MATH + '" font-style="italic" font-size="14" fill="#7b838c" text-anchor="middle"') });
  });
  ico.E.forEach(function (e) {
    var a = proj(ico.V[e[0]]), b = proj(ico.V[e[1]]), z = (a.z + b.z) / 2;
    items.push({ z: z - 0.01, s: line(a.x, a.y, b.x, b.y, 'stroke="' + C.edge + '" stroke-width="1" opacity="' + op(z) + '"') });
  });
  for (i = 0; i < 6; i++) {
    var q = proj(U[i].map(function (t) { return -t; }));
    items.push({ z: q.z, s: circ(q.x, q.y, 2.6, 'fill="' + C.edge + '" opacity="' + op(q.z) + '"') });
  }
  var o = proj([0, 0, 0]);
  for (i = 0; i < 6; i++) {
    var tip = proj(U[i]), lab = proj(U[i].map(function (t) { return 1.17 * t; }));
    var col = i === 0 ? C.acc : C.blue, sw = i === 0 ? 3 : 2.2;
    var dx = tip.x - o.x, dy = tip.y - o.y, L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L, hl = Math.min(11, 0.35 * L + 2), hw = hl * 0.45;
    var bx = tip.x - ux * hl, by = tip.y - uy * hl;
    var head = n1(tip.x) + ',' + n1(tip.y) + ' ' + n1(bx - uy * hw) + ',' + n1(by + ux * hw) + ' ' + n1(bx + uy * hw) + ',' + n1(by - ux * hw);
    var opa = op(tip.z);
    items.push({ z: tip.z * 0.5, s: '<g opacity="' + opa + '">' + line(o.x, o.y, bx, by, 'stroke="' + col + '" stroke-width="' + sw + '" stroke-linecap="round"') + '<polygon points="' + head + '" fill="' + col + '"/></g>' });
    items.push({ z: tip.z + 0.5, s: txt(lab.x, lab.y + 5, letter + '<tspan font-size="12" font-weight="normal" font-style="normal" dy="4">' + (i + 1) + '</tspan>',
      'font-family="' + MATH + '" font-size="17" font-weight="bold" font-style="italic" fill="' + col + '" text-anchor="middle" opacity="' + Math.max(0.6, +opa).toFixed(3) + '" stroke="#fff" stroke-width="3" paint-order="stroke"') });
  }
  items.push({ z: 5, s: circ(o.x, o.y, 2.5, 'fill="' + C.ink + '"') });
  items.sort(function (p, q) { return p.z - q.z; });
  return items.map(function (t) { return t.s; }).join('');
}
function basisPanelSVG(R, which, label) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="100%" role="img" aria-label="' + esc(label) + '" font-family="' + FONT + '"><rect width="360" height="360" fill="#fff"/>' + basisPanel(R, which) + '</svg>';
}
/* 静止図E.5：2 枚を並べた 1 枚の SVG */
function basisSVG(R, title) {
  var VW = 750, VH = 428, s = '';
  s += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + VW + ' ' + VH + '" width="100%" role="img" aria-label="' + esc(title || '') + '" font-family="' + FONT + '" font-size="14">';
  if (title) s += '<title>' + esc(title) + '</title>';
  s += '<rect width="' + VW + '" height="' + VH + '" fill="#fff"/>';
  [['a', 10, '物理空間 ' + eSym('∥', '：基底 ') + '<tspan font-family="' + MATH + '" font-weight="bold" font-style="italic">a</tspan><tspan font-size="75%" dy="4">1</tspan><tspan dy="-4">, …, </tspan><tspan font-family="' + MATH + '" font-weight="bold" font-style="italic">a</tspan><tspan font-size="75%" dy="4">6</tspan>'],
   ['b', 380, '補空間 ' + eSym('⊥', '：基底 ') + '<tspan font-family="' + MATH + '" font-weight="bold" font-style="italic">b</tspan><tspan font-size="75%" dy="4">1</tspan><tspan dy="-4">, …, </tspan><tspan font-family="' + MATH + '" font-weight="bold" font-style="italic">b</tspan><tspan font-size="75%" dy="4">6</tspan>']].forEach(function (p) {
    s += '<rect x="' + p[1] + '" y="34" width="360" height="360" fill="#fff" stroke="' + C.rule + '" rx="6"/>';
    s += txt(p[1] + 180, 24, p[2], 'fill="' + C.text + '" font-size="15" text-anchor="middle"');
    s += '<g transform="translate(' + p[1] + ',34)">' + basisPanel(R, p[0]) + '</g>';
  });
  s += txt(VW / 2, VH - 12, '臙脂：' + '<tspan font-family="' + MATH + '" font-weight="bold" font-style="italic">a</tspan><tspan font-size="75%" dy="4">1</tspan><tspan dy="-4">，</tspan><tspan font-family="' + MATH + '" font-weight="bold" font-style="italic">b</tspan><tspan font-size="75%" dy="4">1</tspan><tspan dy="-4">　青：残りの 5 本　細い線：正二十面体の稜　破線：座標軸 </tspan>' + mi('x, y, z'),
    'fill="' + C.muted + '" font-size="13" text-anchor="middle"');
  s += '</svg>';
  return s;
}

var CORE = {
  TAU: TAU, NRM: NRM, LEN_L: LEN_L, LEN_S: LEN_S, WIN: WIN,
  parOf: parOf, perpOf: perpOf, iOf: iOf, selGeom: selGeom, atom: atom, chain: chain, gapSeq: gapSeq,
  jumped: jumped, jumpFraction: jumpFraction, fibSVG: fibSVG,
  vecA: vecA, vecB: vecB, dot: dot, unit: unit, matMul: matMul, rotX: rotX, rotY: rotY, apply3: apply3,
  initialView: initialView, icoEdges: icoEdges, basisPanel: basisPanel, basisPanelSVG: basisPanelSVG, basisSVG: basisSVG, fm: fm
};

if (typeof document === 'undefined' || typeof window === 'undefined') {
  /* jsc などの DOM のない環境：核だけを公開して終わる */
  if (typeof globalThis !== 'undefined') globalThis.QCViewerCore = CORE;
  return;
}

/* =====================================================================
 *  ブラウザ用の UI（スライダー，ボタン，ドラッグ）
 * ===================================================================== */
var CSS = [
'.qc-root{font-family:' + FONT + ';font-size:.92rem;line-height:1.55;color:#1a202c;text-align:left;background:#fff;border:1px solid ' + C.rule + ';border-radius:10px;padding:10px 10px 12px;margin:0 auto;max-width:100%;overflow:hidden;-webkit-text-size-adjust:100%}',
'.qc-root *{box-sizing:border-box}',
'.qc-root sub,.qc-root sup{font-size:.72em;line-height:0}',
'.qc-root p{margin:.35rem 0}',
'.qc-fig svg{display:block;width:100%;height:auto;max-width:100%}',
'.qc-ctrl{display:flex;flex-wrap:wrap;align-items:flex-end;gap:6px 18px;margin:8px 0 0}',
'.qc-sl{flex:1 1 240px;min-width:0}',
'.qc-sl label{display:block;font-weight:bold;color:' + C.acc + '}',
'.qc-sl label small{font-weight:normal;color:' + C.muted + '}',
'.qc-sl input[type=range]{display:block;width:100%;height:30px;margin:0;accent-color:' + C.acc + ';touch-action:pan-y}',
'.qc-val{font-size:.86rem;color:' + C.muted + '}',
'.qc-val b{color:' + C.text + '}',
'.qc-btn{font:inherit;color:inherit;cursor:pointer;min-height:36px;padding:4px 12px;background:#fff;border:1px solid #b8c0c8;border-radius:7px}',
'.qc-btn:hover{background:#f8eef0}',
'.qc-root button:focus-visible,.qc-root input:focus-visible,.qc-drag:focus-visible{outline:2px solid ' + C.amber + ';outline-offset:2px}',
'.qc-info{display:block;border:1px solid ' + C.rule + ';border-radius:8px;margin:8px 0 0;padding:6px 10px;background:#fbfbfa;font-size:.88rem}',
'.qc-info b{color:' + C.acc + '}',
'.qc-i{font-family:' + MATH + ';font-style:italic}',
'.qc-bv{font-family:' + MATH + ';font-style:italic;font-weight:bold}',
'.qc-panels{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}',
'.qc-panel{flex:1 1 280px;max-width:420px;min-width:0;border:1px solid ' + C.rule + ';border-radius:6px;background:#fff}',
'.qc-ptitle{font-size:.9rem;text-align:center;padding:.25em 0;border-bottom:1px solid ' + C.rule + ';background:#fbfbfa}',
'.qc-drag{display:block;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}',
'.qc-drag:active{cursor:grabbing}',
'.qc-drag svg{display:block;width:100%;height:auto}',
'.qc-note{font-size:.84rem;color:' + C.muted + '}',
'@media (max-width:480px){.qc-root{padding:8px 6px 10px;font-size:.9rem}}',
'@media print{.qc-ctrl,.qc-btnrow,.qc-note{display:none}}'
].join('\n');

function injectStyle() {
  if (document.getElementById('qc-style')) return;
  var st = document.createElement('style'); st.id = 'qc-style'; st.appendChild(document.createTextNode(CSS));
  document.head.appendChild(st);
}
var uid = 0;
function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

/* ---------- 図E.2 ---------- */
var SL_N = 100;   /* スライダーの目盛り：±SL_N が ±W（= ±(L+S)） */
function buildFib(root) {
  var id = 'qcf' + (++uid);
  var box = el('div', 'qc-root');
  var fig = el('div', 'qc-fig');
  var ctrl = el('div', 'qc-ctrl');
  function slider(key, lab, sub) {
    var d = el('div', 'qc-sl');
    d.innerHTML = '<label for="' + id + key + '">' + lab + ' <small>' + sub + '</small></label>' +
      '<input type="range" id="' + id + key + '" min="' + (-SL_N) + '" max="' + SL_N + '" step="1" value="0" aria-describedby="' + id + key + 'v">' +
      '<div class="qc-val" id="' + id + key + 'v"></div>';
    ctrl.appendChild(d);
    return { input: d.querySelector('input'), val: d.querySelector('.qc-val') };
  }
  var su = slider('u', '並進 <span class="qc-i">u</span>', '（格子を <span class="qc-i">E</span><sub>∥</sub> 方向にずらす）');
  var sw = slider('w', 'フェイゾン変位 <span class="qc-i">w</span>', '（格子を <span class="qc-i">E</span><sub>⊥</sub> 方向にずらす）');
  var bd = el('div', 'qc-btnrow');
  var reset = el('button', 'qc-btn', 'リセット（<span class="qc-i">u</span> = <span class="qc-i">w</span> = 0）'); reset.setAttribute('aria-label', 'リセット（u = w = 0）');
  reset.type = 'button';
  bd.appendChild(reset); ctrl.appendChild(bd);
  var info = el('div', 'qc-info'); info.setAttribute('aria-live', 'polite');
  box.appendChild(fig); box.appendChild(ctrl); box.appendChild(info);
  root.innerHTML = ''; root.appendChild(box);

  function update() {
    var u = (+su.input.value / SL_N) * WIN, w = (+sw.input.value / SL_N) * WIN;
    su.val.innerHTML = '<b><span class="qc-i">u</span> = ' + fm(u, 3) + '</b> <span class="qc-i">a</span><sub>2D</sub>（<span class="qc-i">u</span>/(<span class="qc-i">L</span>+<span class="qc-i">S</span>) = ' + fm(u / WIN, 2) + '）';
    sw.val.innerHTML = '<b><span class="qc-i">w</span> = ' + fm(w, 3) + '</b> <span class="qc-i">a</span><sub>2D</sub>（<span class="qc-i">w</span>/<span class="qc-i">W</span> = ' + fm(w / WIN, 2) + '）';
    su.input.setAttribute('aria-valuetext', 'u = ' + fm(u, 3) + ' a2D');
    sw.input.setAttribute('aria-valuetext', 'w = ' + fm(w, 3) + ' a2D，w/W = ' + fm(w / WIN, 2));
    var lab = 'Fibonacci 鎖の切断射影．並進 u = ' + fm(u, 3) + '，フェイゾン変位 w = ' + fm(w, 3) + '（w/W = ' + fm(w / WIN, 2) + '）．';
    fig.innerHTML = fibSVG({ u: u, w: w, wRef: 0, mode: 'single', idp: id, title: lab });
    var A = chain(0, 13, u, w), seq = gapSeq(A), jl = [], k;
    for (k = -2; k <= 16; k++) if (jumped(k, w, 0)) jl.push(fm(k, 0));
    var fr = jumpFraction(w, 0, 0, 1000);
    var h = '<p>原子 <span class="qc-i">k</span> = 0〜13 の間隔の並び：<b>' + seq + '</b>（<span class="qc-i">L</span>/<span class="qc-i">S</span> = τ = ' + fm(LEN_L / LEN_S, 4) + '）．</p>';
    if (Math.abs(w) < 1e-12) h += '<p><span class="qc-i">w</span> = 0：跳んだ原子はない．<span class="qc-i">u</span> を動かすと全原子が同じだけ動き，並びは変わらない．</p>';
    else h += '<p><span class="qc-i">w</span> = 0 と比べて跳んだ原子（<span class="qc-i">k</span> = −2〜16 のうち）：<b>' + (jl.length ? jl.join(', ') : 'なし') + '</b>．跳んだ原子の割合（<span class="qc-i">k</span> = 0〜999 の 1000 個で数えた値）：<b>' + fm(fr, 3) + '</b>（|<span class="qc-i">w</span>|/<span class="qc-i">W</span> = ' + fm(Math.abs(w) / WIN, 3) + '）．跳ぶ長さはどれも <span class="qc-i">L</span> − <span class="qc-i">S</span> = ' + fm(LEN_L - LEN_S, 3) + ' <span class="qc-i">a</span><sub>2D</sub>．</p>';
    info.innerHTML = h;
  }
  su.input.addEventListener('input', update);
  sw.input.addEventListener('input', update);
  reset.addEventListener('click', function () { su.input.value = 0; sw.input.value = 0; update(); });
  root.qcDebug = { update: update, su: su.input, sw: sw.input };
  update();
}

/* ---------- 図E.5 ---------- */
function buildBasis(root) {
  var R = initialView();
  var box = el('div', 'qc-root');
  var panels = el('div', 'qc-panels');
  var defs = [['a', '物理空間 <span class="qc-i">E</span><sub>∥</sub>：<span class="qc-bv">a</span><sub>1</sub>, …, <span class="qc-bv">a</span><sub>6</sub>', '物理空間の 6 本の基底ベクトル a1〜a6 と正二十面体'],
              ['b', '補空間 <span class="qc-i">E</span><sub>⊥</sub>：<span class="qc-bv">b</span><sub>1</sub>, …, <span class="qc-bv">b</span><sub>6</sub>', '補空間の 6 本の基底ベクトル b1〜b6 と正二十面体']];
  var views = defs.map(function (d) {
    var p = el('div', 'qc-panel');
    p.appendChild(el('div', 'qc-ptitle', d[1]));
    var dr = el('div', 'qc-drag');
    dr.tabIndex = 0;
    dr.setAttribute('role', 'group');
    dr.setAttribute('aria-label', d[2] + '．ドラッグまたは矢印キーで回す（2 枚が同時に回る）');
    p.appendChild(dr); panels.appendChild(p);
    return { which: d[0], el: dr, label: d[2] };
  });
  var bd = el('div', 'qc-btnrow');
  bd.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin:8px 0 0';
  var reset = el('button', 'qc-btn', '視点を初めの向きに戻す'); reset.type = 'button';
  bd.appendChild(reset);
  bd.appendChild(el('span', 'qc-note', 'どちらかの図をドラッグ（タッチも可）すると 2 枚が同じ向きに回る．図を選んで矢印キーでも回せる．'));
  box.appendChild(panels); box.appendChild(bd);
  root.innerHTML = ''; root.appendChild(box);

  function redraw() { views.forEach(function (v) { v.el.innerHTML = basisPanelSVG(R, v.which, v.label); }); }
  function turn(dx, dy) { R = matMul(rotY(dx), R); R = matMul(rotX(dy), R); redraw(); }
  var drag = null;
  views.forEach(function (v) {
    var e = v.el;
    e.addEventListener('pointerdown', function (ev) {
      drag = { x: ev.clientX, y: ev.clientY, id: ev.pointerId, el: e };
      try { e.setPointerCapture(ev.pointerId); } catch (er) { /* 無視 */ }
      ev.preventDefault();
    });
    e.addEventListener('pointermove', function (ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      var rect = drag.el.getBoundingClientRect(), sc = 360 / (rect.width || 360);
      var dx = (ev.clientX - drag.x) * sc, dy = (ev.clientY - drag.y) * sc;
      drag.x = ev.clientX; drag.y = ev.clientY;
      turn(dx * 0.012, dy * 0.012); ev.preventDefault();
    });
    var up = function (ev) { if (drag && ev.pointerId === drag.id) drag = null; };
    e.addEventListener('pointerup', up); e.addEventListener('pointercancel', up);
    e.addEventListener('keydown', function (ev) {
      var a = 0.1, k = ev.key;
      if (k === 'ArrowLeft') turn(-a, 0); else if (k === 'ArrowRight') turn(a, 0);
      else if (k === 'ArrowUp') turn(0, -a); else if (k === 'ArrowDown') turn(0, a);
      else return;
      ev.preventDefault();
    });
  });
  reset.addEventListener('click', function () { R = initialView(); redraw(); });
  root.qcDebug = { getR: function () { return R; }, turn: turn };
  redraw();
}

function init() {
  var roots = document.querySelectorAll('.qc-viewer[data-qc]'), t;
  if (!roots.length) return;
  injectStyle();
  for (t = 0; t < roots.length; t++) {
    var root = roots[t], kind = root.getAttribute('data-qc');
    if (root.getAttribute('data-qc-ready')) continue;
    var keep = root.innerHTML;
    try {
      if (kind === 'fib') buildFib(root);
      else if (kind === 'basis') buildBasis(root);
      else continue;
      root.setAttribute('data-qc-ready', '1');
    } catch (e) {
      root.innerHTML = keep;   /* 静止図に戻す */
      var p = document.createElement('p');
      p.className = 'qc-note';
      p.textContent = '対話図を起動できませんでした（' + (e && e.message ? e.message : e) + '）．上の静止図を参照してください．';
      root.appendChild(p);
    }
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
