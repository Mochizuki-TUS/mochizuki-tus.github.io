/* =====================================================================
   classifier.model.js — S04 分類とカーネル（第9〜11章）の計算（DOM に触れない純粋な関数）
   ブラウザ：window.MLModels.Classifier（先に lib/mlcore.js を読む）
   Node   ：require('./classifier.model.js')（試験 W/tests/classifier.test.mjs から）
   記号は本文（第9章 9.1・9.3〜9.6，第10章 10.5，第11章 11.1〜11.7）と SPEC_CONTENT §3 に合わせる．
   ・ロジスティック回帰のラベルは y ∈ {0,1}，SVM のラベルは y ∈ {−1,+1}（第11章だけの規約）．
   ・乱数は引数で受け取った MLCore.rng だけを使う（Math.random 禁止）．
   ・逆行列を作らない（Newton 法の連立方程式は Cholesky 分解で解く）．
   ・損失は softplus で計算し（log-sum-exp と同じ安定化），sigmoid は桁あふれしない形を使う．
   ===================================================================== */
(function (root, factory) {
  'use strict';
  var C = (typeof module === 'object' && module.exports) ? require('./lib/mlcore.js') : root.MLCore;
  var M = factory(C);
  if (typeof module === 'object' && module.exports) module.exports = M;
  if (root) { root.MLModels = root.MLModels || {}; root.MLModels.Classifier = M; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (C) {
  'use strict';

  var LIMITS = {
    nGen: [10, 200],        /* 生成するデータ数 N の範囲 */
    maxPoints: 300,         /* クリックで足した点を含めた上限 */
    maxGD: 50000,           /* 勾配降下法の反復の上限 */
    smoIter: [10, 100000],  /* SMO の反復（2 変数の更新）の上限の範囲 */
    smoEps: 1e-3,           /* SMO の停止条件：KKT 条件の破れ m(α) − M(α) ≤ ε（LIBSVM の既定と同じ） */
    newtonIter: 100,
    wDiverge: 1e6,          /* 重みのノルムがこれを超えたら発散とみなす */
    gen: 3.4                /* 生成する点の範囲 [−3.4, 3.4]（外に出た点は引き直す） */
  };
  var RANGE = [-3.5, 3.5];  /* 図の範囲（両軸） */

  /* -------------------------------------------------------------------
     教育用の合成データ（2 つの記述子 x₁, x₂．標準化した無次元の値）
     点 n のクラスは n の偶奇で交互に決める（y = 0, 1, 0, 1, …）．
     ------------------------------------------------------------------- */
  var DATASETS = [
    { key: 'linear', label: '線形分離できる', formula: 'x = s(1, 1) + 0.7ε（ε ~ N(0, I)），s = +1（y=1）／−1（y=0）．s(x₁+x₂)/√2 < 0.3 の点は引き直す（直線 x₁+x₂=0 で余裕をもって分けられる）' },
    { key: 'overlap', label: '重なりあり', formula: 'x = s(0.8, 0.8) + 1.0ε，s = +1（y=1）／−1（y=0）' },
    { key: 'circles', label: '同心円', formula: 'x = r(cos θ, sin θ)，θ ~ U(0, 2π)，r = r_y + 0.25ε，r₀ = 1.0（y=0，内側），r₁ = 2.2（y=1，外側）' },
    { key: 'moons', label: '三日月', formula: 'y=0：u = (cos t, sin t)，y=1：u = (1 − cos t, 0.5 − sin t)，t ~ U(0, π)，x = 1.8{u − (0.5, 0.25)} + 0.22ε' },
    { key: 'xor', label: 'XOR', formula: 'x = (a, b)·1.2 + 0.55ε，(a, b) は y=1 なら (1,1) か (−1,−1)，y=0 なら (1,−1) か (−1,1)（等確率）' }
  ];
  function datasetInfo(kind) { for (var i = 0; i < DATASETS.length; i++) if (DATASETS[i].key === kind) return DATASETS[i]; return null; }

  function drawPoint(kind, y, rng) {
    var s = y ? 1 : -1, x1, x2;
    switch (kind) {
      case 'linear':
        for (var k = 0; k < 1000; k++) { x1 = s + 0.7 * rng.normal(); x2 = s + 0.7 * rng.normal(); if (s * (x1 + x2) / Math.SQRT2 >= 0.3) break; }
        break;
      case 'overlap': x1 = 0.8 * s + rng.normal(); x2 = 0.8 * s + rng.normal(); break;
      case 'circles': {
        var th = rng.uniform(0, 2 * Math.PI), r = (y ? 2.2 : 1.0) + 0.25 * rng.normal();
        x1 = r * Math.cos(th); x2 = r * Math.sin(th); break;
      }
      case 'moons': {
        var t = rng.uniform(0, Math.PI), u1, u2;
        if (y) { u1 = 1 - Math.cos(t); u2 = 0.5 - Math.sin(t); } else { u1 = Math.cos(t); u2 = Math.sin(t); }
        x1 = 1.8 * (u1 - 0.5) + 0.22 * rng.normal(); x2 = 1.8 * (u2 - 0.25) + 0.22 * rng.normal(); break;
      }
      case 'xor': {
        var q = rng.int(2), a = q ? 1 : -1, b = y ? a : -a;
        x1 = 1.2 * a + 0.55 * rng.normal(); x2 = 1.2 * b + 0.55 * rng.normal(); break;
      }
      default: throw new Error('データの型が不明です：' + kind);
    }
    return [x1, x2];
  }
  /* N 点を作る．戻り値 {X: [[x1,x2],…], y: [0/1,…]}（y は 0/1．SVM では toPM で ±1 に） */
  function makeData(kind, N, rng) {
    N = Math.max(0, Math.min(LIMITS.maxPoints, Math.round(N)));
    var X = [], y = [], g = LIMITS.gen;
    for (var n = 0; n < N; n++) {
      var yn = n % 2, p;
      for (var k = 0; k < 1000; k++) { p = drawPoint(kind, yn, rng); if (Math.abs(p[0]) <= g && Math.abs(p[1]) <= g) break; }
      X.push(p); y.push(yn);
    }
    return { X: X, y: y };
  }
  function toPM(y01) { return y01.map(function (v) { return v ? 1 : -1; }); }

  /* ===================================================================
     ロジスティック回帰（第9章 9.3〜9.6）
     a = wᵀφ(x) + b，ŷ = p(y=1 | x) = σ(a)，
     L(w, b) = −Σ_n { y_n ln ŷ_n + (1 − y_n) ln(1 − ŷ_n) } + (λ/2)‖w‖²（b は正則化しない）
     ∂L/∂w = Σ_n (ŷ_n − y_n) φ_n + λw，∂L/∂b = Σ_n (ŷ_n − y_n)
     =================================================================== */
  var FEATURES = {
    1: { names: ['x₁', 'x₂'], html: ['<i>x</i><sub>1</sub>', '<i>x</i><sub>2</sub>'] },
    2: { names: ['x₁', 'x₂', 'x₁²', 'x₁x₂', 'x₂²'], html: ['<i>x</i><sub>1</sub>', '<i>x</i><sub>2</sub>', '<i>x</i><sub>1</sub><sup>2</sup>', '<i>x</i><sub>1</sub><i>x</i><sub>2</sub>', '<i>x</i><sub>2</sub><sup>2</sup>'] }
  };
  function features(x, order) { var a = x[0], b = x[1]; return order === 2 ? [a, b, a * a, a * b, b * b] : [a, b]; }
  function design(X, order) { return X.map(function (x) { return features(x, order); }); }

  /* −{y ln σ(a) + (1−y) ln(1−σ(a))} = softplus(a) − y a（桁あふれしない） */
  function bce(a, y) { return C.softplus(a) - y * a; }

  function logisticEval(Phi, y, w, b, lambda) {
    var N = Phi.length, D = w.length, ce = 0, gw = new Array(D).fill(0), gb = 0, correct = 0, i, n;
    for (n = 0; n < N; n++) {
      var phi = Phi[n], a = b;
      for (i = 0; i < D; i++) a += w[i] * phi[i];
      var p = C.sigmoid(a), r = p - y[n];
      ce += bce(a, y[n]);
      for (i = 0; i < D; i++) gw[i] += r * phi[i];
      gb += r;
      if ((a >= 0) === (y[n] === 1)) correct++;
    }
    var ww = 0; for (i = 0; i < D; i++) { ww += w[i] * w[i]; gw[i] += lambda * w[i]; }
    var reg = 0.5 * lambda * ww, gn = gb * gb; for (i = 0; i < D; i++) gn += gw[i] * gw[i];
    return { L: ce + reg, ce: ce, reg: reg, gw: gw, gb: gb, gnorm: Math.sqrt(gn), wnorm: Math.sqrt(ww), acc: N ? correct / N : null, N: N };
  }
  /* 勾配降下法 1 ステップ：w ← w − η ∂L/∂w，b ← b − η ∂L/∂b（e は (w, b) での logisticEval の結果） */
  function gdApply(w, b, e, eta) { return { w: w.map(function (wi, i) { return wi - eta * e.gw[i]; }), b: b - eta * e.gb }; }
  function gdStep(Phi, y, w, b, lambda, eta) {
    var e = logisticEval(Phi, y, w, b, lambda), r = gdApply(w, b, e, eta);
    return { w: r.w, b: r.b, before: e };
  }
  function predictProb(x, order, w, b) { var phi = features(x, order), a = b; for (var i = 0; i < w.length; i++) a += w[i] * phi[i]; return { a: a, p: C.sigmoid(a) }; }

  /* ヘッセ行列 H = Σ ŷ(1−ŷ) φ̃φ̃ᵀ + λ diag(1,…,1,0)（φ̃ = (φ, 1)．最後が b） */
  function logisticHessian(Phi, y, w, b, lambda) {
    var D = w.length, P = D + 1, H = C.zeros(P, P);
    for (var n = 0; n < Phi.length; n++) {
      var t = Phi[n].concat([1]), a = b;
      for (var i = 0; i < D; i++) a += w[i] * t[i];
      var p = C.sigmoid(a), s = p * (1 - p);
      for (var r = 0; r < P; r++) for (var c = 0; c <= r; c++) H[r][c] += s * t[r] * t[c];
    }
    for (var r2 = 0; r2 < P; r2++) for (var c2 = r2 + 1; c2 < P; c2++) H[r2][c2] = H[c2][r2];
    for (var k = 0; k < D; k++) H[k][k] += lambda;
    return H;
  }
  /* 最小値（Newton 法＋直線探索）．λ = 0 で線形分離できると最小値は有限の重みで達成されない → status 'diverge' */
  function logisticNewton(Phi, y, lambda, opt) {
    opt = opt || {};
    var N = Phi.length, D = Phi.length ? Phi[0].length : (opt.D || 2);
    if (!N) return { w: null, b: null, status: 'nodata', reason: 'データがありません．' };
    var n1 = 0; for (var q = 0; q < N; q++) n1 += y[q] === 1 ? 1 : 0;
    if (n1 === 0 || n1 === N) return { w: null, b: null, status: 'oneclass', reason: 'データが 1 クラスだけです．b を正則化しないので，b → ' + (n1 ? '+' : '−') + '∞ で損失が下がり続け，最小値は有限の値では達成されません．' };
    var res = newtonCore(Phi, y, lambda, opt, N, D);
    /* λ = 0 で，すべての点が境界の正しい側に（a ≠ 0 で）あるなら，(w, b) を何倍にしても損失は下がり続ける：
       下限 0 は有限の重みでは達成されない（本文 9.6 節）．Newton 法が勾配の小ささで止まっても最小値とは呼ばない． */
    if (lambda === 0 && res.w) {
      var sep = true;
      for (var r = 0; r < N && sep; r++) { var a = res.b; for (var k = 0; k < D; k++) a += res.w[k] * Phi[r][k]; if (!(y[r] === 1 ? a > 0 : a < 0)) sep = false; }
      if (sep) return { w: null, b: null, status: 'separable', wStop: res.w, bStop: res.b, iters: res.iters, reason: 'λ = 0 で，この特徴ではデータが線形分離できます．重みを大きくするほど損失は 0 に近づき，最小値は有限の重みでは達成されません（Newton 法は勾配が丸めの大きさになった所で止まりました）．' };
    }
    return res;
  }
  function newtonCore(Phi, y, lambda, opt, N, D) {
    var w = new Array(D).fill(0), b = 0, maxIt = opt.maxIter || LIMITS.newtonIter, tol = opt.tol || 1e-10 * Math.max(1, N);
    var e = logisticEval(Phi, y, w, b, lambda);
    for (var it = 0; it < maxIt; it++) {
      if (e.gnorm <= tol) return { w: w, b: b, L: e.L, iters: it, gnorm: e.gnorm, status: 'ok' };
      var H = logisticHessian(Phi, y, w, b, lambda), L = C.cholesky(H);
      if (!L) return { w: null, b: null, status: 'diverge', iters: it, reason: 'ヘッセ行列が数値的に特異になりました（重みが大きくなり ŷ(1−ŷ) が 0 に近づいた）．λ = 0 で線形分離できるデータ（または 1 クラスだけのデータ）では，損失の最小値は有限の重みでは達成されません．' };
      var g = e.gw.concat([e.gb]), d = C.cholSolve(L, g), gd = C.dot(g, d), t = 1, e2, w2, b2;
      for (var ls = 0; ls < 60; ls++) {
        w2 = w.map(function (wi, i) { return wi - t * d[i]; }); b2 = b - t * d[D];
        e2 = logisticEval(Phi, y, w2, b2, lambda);
        if (isFinite(e2.L) && e2.L <= e.L - 1e-4 * t * gd) break;
        t *= 0.5;
      }
      if (!isFinite(e2.L)) return { w: null, b: null, status: 'error', iters: it, reason: '損失が有限でなくなりました．' };
      if (e2.L >= e.L && e.gnorm <= 1e-6 * Math.max(1, N)) return { w: w, b: b, L: e.L, iters: it, gnorm: e.gnorm, status: 'ok' };
      w = w2; b = b2; e = e2;
      if (Math.sqrt(C.dot(w, w) + b * b) > LIMITS.wDiverge) return { w: null, b: null, status: 'diverge', iters: it + 1, reason: '重みが 10⁶ を超えて増え続けました．λ = 0 で線形分離できるデータでは，損失の最小値は有限の重みでは達成されません．' };
    }
    return { w: w, b: b, L: e.L, iters: maxIt, gnorm: e.gnorm, status: e.gnorm <= 1e-6 * Math.max(1, N) ? 'ok' : 'maxiter', reason: '反復の上限に達しました．' };
  }
  /* 学習率の目安：L の勾配の Lipschitz 定数 L_c ≤ ¼ λ_max(Φ̃ᵀΦ̃) + λ．η < 2/L_c なら損失は毎回減る（十分条件） */
  function etaBound(Phi, lambda, D) {
    var N = Phi.length;
    D = N ? Phi[0].length : (D || 2);
    var P = D + 1, A = C.zeros(P, P);
    for (var n = 0; n < N; n++) { var t = Phi[n].concat([1]); for (var r = 0; r < P; r++) for (var c = 0; c < P; c++) A[r][c] += t[r] * t[c]; }
    var lmax = N ? C.eigSym(A).values[0] : 0, Lc = 0.25 * lmax + lambda;
    return { lmax: lmax, Lc: Lc, etaMax: Lc > 0 ? 2 / Lc : Infinity };
  }

  /* ===================================================================
     カーネルと SVM（第10章 10.5，第11章）．ラベルは y ∈ {−1,+1}
     f(x) = Σ_n α_n y_n k(x_n, x) + b
     双対問題：max D(α) = Σα_n − ½ ΣΣ α_n α_m y_n y_m k(x_n, x_m)，0 ≤ α_n ≤ C，Σ α_n y_n = 0
     =================================================================== */
  var KERNELS = [
    { key: 'linear', label: '線形', html: '<i>k</i>(<b>x</b>, <b>x</b>′) = <b>x</b><sup>T</sup><b>x</b>′' },
    { key: 'poly2', label: '多項式 2 次', html: '<i>k</i>(<b>x</b>, <b>x</b>′) = (<b>x</b><sup>T</sup><b>x</b>′ + 1)<sup>2</sup>' },
    { key: 'poly3', label: '多項式 3 次', html: '<i>k</i>(<b>x</b>, <b>x</b>′) = (<b>x</b><sup>T</sup><b>x</b>′ + 1)<sup>3</sup>' },
    { key: 'rbf', label: 'RBF（Gauss）', html: '<i>k</i>(<b>x</b>, <b>x</b>′) = exp(−<i>γ</i>‖<b>x</b> − <b>x</b>′‖<sup>2</sup>)' }
  ];
  function makeKernel(kind, gamma) {
    switch (kind) {
      case 'linear': return function (a, b) { return a[0] * b[0] + a[1] * b[1]; };
      case 'poly2': return function (a, b) { var s = a[0] * b[0] + a[1] * b[1] + 1; return s * s; };
      case 'poly3': return function (a, b) { var s = a[0] * b[0] + a[1] * b[1] + 1; return s * s * s; };
      case 'rbf': return function (a, b) { var d0 = a[0] - b[0], d1 = a[1] - b[1]; return Math.exp(-gamma * (d0 * d0 + d1 * d1)); };
      default: throw new Error('カーネルが不明です：' + kind);
    }
  }
  function gram(X, kern) {
    var N = X.length, K = C.zeros(N, N);
    for (var i = 0; i < N; i++) for (var j = 0; j <= i; j++) { var v = kern(X[i], X[j]); K[i][j] = v; K[j][i] = v; }
    return K;
  }

  /* SMO（2 変数ずつ解析的に更新）．作業対の選び方は 2 次の情報を使う方法（Fan, Chen & Lin 2005，LIBSVM の WSS2．下の select）．
     F_t = Σ_s α_s y_s K_ts − y_t（= f(x_t) − b − y_t）．
     I_up = {t | y_t=+1, α_t<C} ∪ {t | y_t=−1, α_t>0}，I_low = {t | y_t=−1, α_t<C} ∪ {t | y_t=+1, α_t>0}，
     m(α) = max_{I_up} (−F_t)，M(α) = min_{I_low} (−F_t)．KKT 条件 ⇔ m(α) ≤ M(α)．m − M ≤ ε で停止．
     opt: {eps, maxIter, K（Gram 行列を渡すとき）, history（true なら D(α) と m−M の推移を記録）} */
  function smo(X, y, Cc, kern, opt) {
    opt = opt || {};
    var N = X.length, eps = opt.eps != null ? opt.eps : LIMITS.smoEps, maxIter = opt.maxIter != null ? opt.maxIter : LIMITS.smoIter[1];
    var npos = 0, nneg = 0; y.forEach(function (v) { if (v > 0) npos++; else nneg++; });
    if (!npos || !nneg) return { ok: false, reason: '2 つのクラス（y = +1 と y = −1）が少なくとも 1 点ずつ必要です．' };
    if (!(Cc > 0) || !isFinite(Cc)) return { ok: false, reason: 'C は正の有限の値にしてください．' };
    var K = opt.K || gram(X, kern);
    var alpha = new Array(N).fill(0), F = y.map(function (v) { return -v; });
    var TAU = 1e-12, iter = 0, converged = false, stalled = false, gap = Infinity, hist = [];
    /* i：I_up で −F が最大の点．j：I_low のうち −F_t < −F_i の点で，2 変数の部分問題の目的関数の減少量
       b²/(2a)（b = −F_i + F_t，a = K_ii + K_tt − 2K_it）が最大の点（2 次の情報による選び方．Fan, Chen & Lin 2005，LIBSVM の WSS2）．
       停止の判定には m(α) − M(α)（M は I_low での −F の最小）を使う． */
    function select() {
      var gmax = -Infinity, gmin = Infinity, i = -1, j = -1, t;
      for (t = 0; t < N; t++) {
        var up = (y[t] > 0) ? alpha[t] < Cc : alpha[t] > 0;
        if (up && -F[t] > gmax) { gmax = -F[t]; i = t; }
      }
      var best = -Infinity;
      for (t = 0; t < N; t++) {
        var low = (y[t] < 0) ? alpha[t] < Cc : alpha[t] > 0;
        if (!low) continue;
        var v = -F[t];
        if (v < gmin) gmin = v;
        if (i >= 0 && v < gmax) {
          var bb = gmax - v, aa = K[i][i] + K[t][t] - 2 * K[i][t]; if (aa <= TAU) aa = TAU;
          var gain = bb * bb / aa;
          if (gain > best) { best = gain; j = t; }
        }
      }
      return { i: i, j: j, gap: gmax - gmin };
    }
    function dual() { var s1 = 0, s2 = 0; for (var t = 0; t < N; t++) { s1 += alpha[t]; s2 += alpha[t] * y[t] * F[t]; } return 0.5 * s1 - 0.5 * s2; }
    /* D = Σα − ½αᵀQα，(Qα)_t = y_t F_t + 1 なので D = ½Σα − ½Σ α_t y_t F_t（O(N)） */
    var stride = 1;
    for (;;) {
      var sel = select(); gap = sel.gap;
      if (opt.history && (iter < 200 || iter % stride === 0)) { hist.push({ it: iter, gap: gap, D: dual() }); if (iter >= 200 * stride * 2) stride *= 2; }
      if (sel.i < 0 || sel.j < 0 || !(gap > eps)) { converged = true; break; }
      if (iter >= maxIter) break;
      var i = sel.i, j = sel.j, ai = alpha[i], aj = alpha[j], yi = y[i], yj = y[j];
      var kap = K[i][i] + K[j][j] - 2 * K[i][j]; if (kap <= TAU) kap = TAU;
      /* 2 変数の部分問題の解析解を箱 [0, C] に切り詰める（LIBSVM と同じ書き方．境界に当たった変数は
         ちょうど 0 か C に置き，もう一方は Σα y を保つ値にするので，等式制約が丸めで崩れない） */
      var ain = ai, ajn = aj;
      if (yi !== yj) {
        var dl = -yi * (F[i] - F[j]) / kap, diff = ai - aj;
        ain += dl; ajn += dl;
        if (diff > 0) { if (ajn < 0) { ajn = 0; ain = diff; } } else { if (ain < 0) { ain = 0; ajn = -diff; } }
        if (diff > 0) { if (ain > Cc) { ain = Cc; ajn = Cc - diff; } } else { if (ajn > Cc) { ajn = Cc; ain = Cc + diff; } }
      } else {
        var de = yi * (F[i] - F[j]) / kap, sum = ai + aj;
        ain -= de; ajn += de;
        if (sum > Cc) { if (ain > Cc) { ain = Cc; ajn = sum - Cc; } } else { if (ajn < 0) { ajn = 0; ain = sum; } }
        if (sum > Cc) { if (ajn > Cc) { ajn = Cc; ain = sum - Cc; } } else { if (ain < 0) { ain = 0; ajn = sum; } }
      }
      var dai = ain - ai, daj = ajn - aj;
      iter++;
      if (dai === 0 && daj === 0) { stalled = true; break; }
      alpha[i] = ain; alpha[j] = ajn;
      var ci = yi * dai, cj = yj * daj, Ki = K[i], Kj = K[j];
      for (var t = 0; t < N; t++) F[t] += ci * Ki[t] + cj * Kj[t];
    }
    if (opt.history && (!hist.length || hist[hist.length - 1].it !== iter)) hist.push({ it: iter, gap: gap, D: dual() });
    /* b：自由なサポートベクトル（0<α<C）では y f = 1 なので b = −F_t．なければ上下の限界の中点 */
    var nfree = 0, sb = 0, lb = -Infinity, ub = Infinity, amax = Math.max.apply(null, alpha);
    for (var t2 = 0; t2 < N; t2++) {
      var ty = alphaType(alpha[t2], amax, Cc), v2 = -F[t2];
      if (ty === 1) { nfree++; sb += v2; }
      else if ((ty === 0 && y[t2] > 0) || (ty === 2 && y[t2] < 0)) lb = Math.max(lb, v2);
      else ub = Math.min(ub, v2);
    }
    var b = nfree ? sb / nfree : (isFinite(lb) && isFinite(ub) ? 0.5 * (lb + ub) : (isFinite(lb) ? lb : ub));
    return { ok: true, alpha: alpha, b: b, F: F, K: K, iter: iter, maxIter: maxIter, converged: converged, stalled: stalled, gap: gap, eps: eps, history: hist, bFree: nfree > 0, bInterval: [lb, ub] };
  }

  /* 点の種類：0 = サポートベクトルでない（α = 0），1 = 0 < α < C（マージン上），2 = α = C．
     丸めで 10⁻¹³ 程度の α が残ることがあるので，α ≤ 10⁻⁹ max α を 0，α ≥ C(1 − 10⁻⁹) を C とみなす． */
  function alphaType(a, amax, Cc) { if (a <= 1e-9 * amax) return 0; if (a >= Cc * (1 - 1e-9)) return 2; return 1; }

  /* 解の要約：f(x_n)，各点の種類，KKT 条件の残差，双対・主目的関数，マージン幅 */
  function svmSummary(X, y, alpha, b, K, Cc) {
    var N = X.length, f = new Array(N), type = new Array(N), quad = 0, sumA = 0, sumAy = 0, hinge = 0, kkt = 0, kktAt = -1, correct = 0;
    var counts = { none: 0, free: 0, bound: 0 }, amax = N ? Math.max.apply(null, alpha) : 0;
    for (var n = 0; n < N; n++) {
      var s = 0; for (var m = 0; m < N; m++) if (alpha[m] !== 0) s += alpha[m] * y[m] * K[n][m];
      f[n] = s + b; quad += alpha[n] * y[n] * s; sumA += alpha[n]; sumAy += alpha[n] * y[n];
      var yf = y[n] * f[n], r;
      hinge += Math.max(0, 1 - yf);
      var ty = alphaType(alpha[n], amax, Cc);
      if (ty === 0) { type[n] = 0; counts.none++; r = Math.max(0, 1 - yf); }
      else if (ty === 2) { type[n] = 2; counts.bound++; r = Math.max(0, yf - 1); }
      else { type[n] = 1; counts.free++; r = Math.abs(yf - 1); }
      if (r > kkt) { kkt = r; kktAt = n; }
      if (yf > 0) correct++;
    }
    quad = Math.max(0, quad);
    var D = sumA - 0.5 * quad, P = 0.5 * quad + Cc * hinge, wn = Math.sqrt(quad);
    return { f: f, type: type, counts: counts, nSV: counts.free + counts.bound, quad: quad, wnorm: wn, margin: wn > 0 ? 2 / wn : null,
      dual: D, primal: P, gapPD: P - D, sumAlpha: sumA, sumAlphaY: sumAy, hinge: hinge, kkt: kkt, kktAt: kktAt, acc: N ? correct / N : null };
  }
  /* f(x) と，各サポートベクトルの寄与 α_n y_n k(x_n, x) */
  function svmDecision(xq, X, y, alpha, b, kern, withTerms) {
    var s = 0, terms = withTerms ? [] : null;
    for (var n = 0; n < X.length; n++) {
      if (alpha[n] === 0) continue;
      var k = kern(X[n], xq), c = alpha[n] * y[n] * k; s += c;
      if (terms) terms.push({ n: n, alpha: alpha[n], y: y[n], k: k, c: c });
    }
    return { f: s + b, sum: s, terms: terms };
  }
  /* 線形カーネルのときの w = Σ α_n y_n x_n */
  function linearW(X, y, alpha) { var w = [0, 0]; for (var n = 0; n < X.length; n++) { w[0] += alpha[n] * y[n] * X[n][0]; w[1] += alpha[n] * y[n] * X[n][1]; } return w; }

  /* 格子点での値 Z[iy][ix]（端の点が範囲の端）．fn(x1, x2) */
  function gridValues(fn, n, range) {
    range = range || RANGE;
    var xs = C.linspace(range[0], range[1], n), Z = [];
    for (var i = 0; i < n; i++) { var row = new Array(n); for (var j = 0; j < n; j++) row[j] = fn(xs[j], xs[i]); Z.push(row); }
    return { xs: xs, Z: Z };
  }

  return {
    LIMITS: LIMITS, RANGE: RANGE, DATASETS: DATASETS, datasetInfo: datasetInfo, drawPoint: drawPoint, makeData: makeData, toPM: toPM,
    FEATURES: FEATURES, features: features, design: design, bce: bce, logisticEval: logisticEval, gdApply: gdApply, gdStep: gdStep, predictProb: predictProb,
    logisticHessian: logisticHessian, logisticNewton: logisticNewton, etaBound: etaBound,
    KERNELS: KERNELS, makeKernel: makeKernel, gram: gram, smo: smo, svmSummary: svmSummary, alphaType: alphaType, svmDecision: svmDecision, linearW: linearW,
    gridValues: gridValues
  };
});
