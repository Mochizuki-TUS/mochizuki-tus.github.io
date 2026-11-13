/* =====================================================================
   gp-bo.model.js — S06 ガウス過程とベイズ最適化の計算（DOM に触れない純粋な関数）
   ブラウザ：window.MLModels.GpBo（先に lib/mlcore.js を読む）
   Node   ：require('./gp-bo.model.js')（試験 W/tests/gp-bo.test.mjs から）
   記号は本文（第12章・第13章）と SPEC_CONTENT §3.4 に合わせる．
     k(x,x') = σ_f² exp(−(x−x')²/(2ℓ²))，K_y = K + σ² I，
     μ*(x*) = m + k*ᵀ K_y⁻¹ (y − m1)，σ*²(x*) = k(x*,x*) − k*ᵀ K_y⁻¹ k*，観測値の予測分散 σ*² + σ²，
     ln p(y|θ) = −½ (y−m1)ᵀ K_y⁻¹ (y−m1) − ½ ln|K_y| − (N/2) ln 2π．
   ・乱数は引数で受け取った MLCore.rng だけを使う（Math.random 禁止）．
   ・逆行列を作らない（Cholesky 分解 K_y = L Lᵀ と前進・後退代入．ジッターは MLCore.choleskySafe）．
   ・丸めで負になった分散は 0 に切り，切った個数を返す．
   ・計算量の上限は LIMITS に書き，画面にも出す．
   ===================================================================== */
(function (root, factory) {
  'use strict';
  var C = (typeof module === 'object' && module.exports) ? require('./lib/mlcore.js') : root.MLCore;
  var M = factory(C);
  if (typeof module === 'object' && module.exports) module.exports = M;
  if (root) { root.MLModels = root.MLModels || {}; root.MLModels.GpBo = M; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (C) {
  'use strict';

  var LIMITS = {
    maxObsGP: 40,            /* ① の観測点の上限 */
    maxBudget: 40,           /* ②③ の評価回数（初期点を含む）の上限 */
    maxRepeats: 200,         /* ③ の繰り返し数の上限 */
    nAcq: 401,               /* 獲得関数を最大にする格子（x ∈ [0,10]，刻み 0.025 mol%） */
    nPlot: 201,              /* 曲線を描く格子 */
    nSample: 121,            /* 事前・事後分布の標本を引く格子 */
    ell: [0.1, 10], sf: [0.05, 3], sigma: [0.005, 0.5],
    /* ① の格子探索（ℓ × σ_f × σ）．格子の点は画面のスライダーの刻みの上にとる
       （ℓ・σ は log10 で 0.01 刻みのスライダー → 格子は log10 で 0.05・0.1 刻み，σ_f は 0.05 刻み） */
    gridEll: 41, gridSigma: 21, gridSf: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0, 2.5, 3.0],
    mlEll: 25, mlEllRange: [0.2, 5]              /* ②③ で毎回 ℓ を選ぶときの格子 */
  };

  /* ---------------- データ C「添加量とイオン伝導度」（教育用の合成データ．最大化問題）
     x ∈ [0,10] mol%，y = log10(σ_ion / S cm⁻¹)，
     y(x) = −5.0 + 1.0 exp[−(x−2.2)²/(2·0.7²)] + 1.6 exp[−(x−7.0)²/(2·1.1²)]，観測ノイズの標準偏差 0.05 */
  var DATA_C = { xMin: 0, xMax: 10, noiseSd: 0.05 };
  function trueC(x) {
    var a = x - 2.2, b = x - 7.0;
    return -5.0 + 1.0 * Math.exp(-a * a / (2 * 0.7 * 0.7)) + 1.6 * Math.exp(-b * b / (2 * 1.1 * 1.1));
  }
  function observeC(rng, x, noiseSd) { return trueC(x) + (noiseSd == null ? DATA_C.noiseSd : noiseSd) * rng.normal(); }
  /* 黄金分割で極大を求める（区間内で単峰） */
  function goldenMax(f, a, b, tol) {
    var g = (Math.sqrt(5) - 1) / 2, c = b - g * (b - a), d = a + g * (b - a), fc = f(c), fd = f(d);
    while (b - a > (tol || 1e-12)) {
      if (fc > fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = f(c); }
      else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = f(d); }
    }
    var x = (a + b) / 2; return { x: x, y: f(x) };
  }
  var TRUE_MAX = goldenMax(trueC, 5, 9, 1e-11);      /* 大域的な最大（x ≈ 7.0） */
  var TRUE_LOCAL = goldenMax(trueC, 1, 3.5, 1e-11);   /* 局所的な極大（x ≈ 2.2） */

  /* ---------------- RBF カーネル */
  function rbf(x1, x2, ell, sf) { var d = x1 - x2; return sf * sf * Math.exp(-d * d / (2 * ell * ell)); }
  /* K_y = K + σ² I（N × N） */
  function gramY(X, hp) {
    var N = X.length, K = C.zeros(N, N), s2 = hp.sigma * hp.sigma;
    for (var i = 0; i < N; i++) for (var j = 0; j <= i; j++) { var v = rbf(X[i], X[j], hp.ell, hp.sf); K[i][j] = v; K[j][i] = v; }
    for (var k = 0; k < N; k++) K[k][k] += s2;
    return K;
  }
  function meanOf(y) { var s = 0; for (var i = 0; i < y.length; i++) s += y[i]; return y.length ? s / y.length : null; }
  function validHp(hp) { return hp && hp.ell > 0 && hp.sf > 0 && hp.sigma >= 0 && isFinite(hp.ell) && isFinite(hp.sf) && isFinite(hp.sigma); }

  /* ガウス過程の当てはめ．hp = {ell, sf, sigma}，m = 平均関数（定数）．
     戻り値 {ok, N, X, y, m, hp, L, alpha（K_y⁻¹(y−m1)）, r（y−m1）, jitter, lml, terms:{fit, complexity, constant}}
     失敗したら {ok:false, reason} */
  function gpFit(X, y, hp, m) {
    if (!validHp(hp)) return { ok: false, reason: 'ハイパーパラメーターが範囲外です（ℓ > 0，σ_f > 0，σ ≥ 0 が必要です）．' };
    if (X.length !== y.length) return { ok: false, reason: '入力と観測値の個数が合いません．' };
    if (!isFinite(m)) return { ok: false, reason: '平均関数の値が数ではありません．' };
    var N = X.length;
    if (!C.allFinite(X) || !C.allFinite(y)) return { ok: false, reason: '観測値に NaN または無限大があります．' };
    if (N === 0) return { ok: true, N: 0, X: [], y: [], m: m, hp: hp, L: [], alpha: [], r: [], jitter: 0, lml: 0, terms: { fit: 0, complexity: 0, constant: 0 } };
    var Ky = gramY(X, hp);
    var ch = C.choleskySafe(Ky);
    if (!ch.L) return { ok: false, reason: 'K_y の Cholesky 分解ができませんでした（ジッターを足しても正定値になりません）．σ を大きくするか，ℓ を小さくしてください．' };
    var r = y.map(function (v) { return v - m; });
    var alpha = C.cholSolve(ch.L, r);
    var fit = -0.5 * C.dot(r, alpha), cx = -0.5 * C.logdetChol(ch.L), cst = -0.5 * N * Math.log(2 * Math.PI);
    var res = { ok: true, N: N, X: X.slice(), y: y.slice(), m: m, hp: hp, L: ch.L, alpha: alpha, r: r, jitter: ch.jitter,
      lml: fit + cx + cst, terms: { fit: fit, complexity: cx, constant: cst } };
    if (!isFinite(res.lml) || !C.allFinite(alpha)) return { ok: false, reason: '対数周辺尤度に NaN または無限大が出ました．' };
    return res;
  }
  /* 1 点の予測．戻り値 {mu, var（潜在関数 σ*²．負の丸めは 0），varY（観測値 σ*²+σ²），clipped, kstar, v} */
  function gpPredictOne(fit, x, keep) {
    var hp = fit.hp, kss = hp.sf * hp.sf, N = fit.N;
    if (N === 0) return { mu: fit.m, var: kss, varY: kss + hp.sigma * hp.sigma, clipped: false, kstar: [], v: [] };
    var ks = new Array(N), mu = fit.m;
    for (var i = 0; i < N; i++) { ks[i] = rbf(fit.X[i], x, hp.ell, hp.sf); mu += ks[i] * fit.alpha[i]; }
    var v = C.solveLower(fit.L, ks), vv = 0;
    for (var j = 0; j < N; j++) vv += v[j] * v[j];
    var cv = C.clipVar(kss - vv);
    var out = { mu: mu, var: cv.value, varY: cv.value + hp.sigma * hp.sigma, clipped: cv.clipped, vv: vv };
    if (keep) { out.kstar = ks; out.v = v; }
    return out;
  }
  function gpPredict(fit, xs) {
    var mu = new Array(xs.length), va = new Array(xs.length), vy = new Array(xs.length), nclip = 0;
    for (var i = 0; i < xs.length; i++) { var p = gpPredictOne(fit, xs[i]); mu[i] = p.mu; va[i] = p.var; vy[i] = p.varY; if (p.clipped) nclip++; }
    return { mu: mu, var: va, varY: vy, nClipped: nclip };
  }
  /* 対数周辺尤度だけ（格子探索用）．失敗は null */
  function lml(X, y, hp, m) { var f = gpFit(X, y, hp, m); return f.ok ? { lml: f.lml, terms: f.terms, jitter: f.jitter } : null; }
  function logspace(a, b, n) { var la = Math.log(a), lb = Math.log(b), out = []; for (var i = 0; i < n; i++) out.push(Math.exp(la + (lb - la) * (n === 1 ? 0 : i / (n - 1)))); return out; }
  /* ℓ に対する対数周辺尤度とその項 */
  function lmlCurve(X, y, ells, sf, sigma, m) {
    return ells.map(function (ell) { var r = lml(X, y, { ell: ell, sf: sf, sigma: sigma }, m); return r ? { ell: ell, lml: r.lml, fit: r.terms.fit, complexity: r.terms.complexity, constant: r.terms.constant } : { ell: ell, lml: null }; });
  }
  /* 格子探索で対数周辺尤度を最大にする．grids = {ells, sfs, sigmas}（どれかを 1 要素にすれば固定） */
  function gridSearchHyper(X, y, grids, m) {
    var best = null, n = 0;
    for (var a = 0; a < grids.ells.length; a++) for (var b = 0; b < grids.sfs.length; b++) for (var c = 0; c < grids.sigmas.length; c++) {
      var hp = { ell: grids.ells[a], sf: grids.sfs[b], sigma: grids.sigmas[c] };
      var r = lml(X, y, hp, m); n++;
      if (r && (best === null || r.lml > best.lml)) best = { hp: hp, lml: r.lml, terms: r.terms };
    }
    return { best: best, evaluated: n };
  }
  function defaultGrids() {
    return { ells: logspace(LIMITS.ell[0], LIMITS.ell[1], LIMITS.gridEll), sfs: LIMITS.gridSf.slice(), sigmas: logspace(LIMITS.sigma[0], LIMITS.sigma[1], LIMITS.gridSigma) };
  }

  /* ---------------- 事前・事後分布からの関数の標本（格子 xs 上で）
     共分散 Σ = K** − Vᵀ V（V = L⁻¹ K*）を choleskySafe で分解し，f = μ + L_Σ z．
     z は標準 Gauss 乱数のベクトルの配列（呼ぶ側が rng で作る．同じ z を使えば ℓ を変えたとき標本が連続に変わる） */
  function normalVectors(rng, nVec, n) { var Z = []; for (var k = 0; k < nVec; k++) { var z = new Array(n); for (var i = 0; i < n; i++) z[i] = rng.normal(); Z.push(z); } return Z; }
  function posteriorCov(fit, xs) {
    var G = xs.length, hp = fit.hp, S = C.zeros(G, G), i, j;
    for (i = 0; i < G; i++) for (j = 0; j <= i; j++) { var v = rbf(xs[i], xs[j], hp.ell, hp.sf); S[i][j] = v; S[j][i] = v; }
    if (fit.N > 0) {
      var V = xs.map(function (x) { var ks = fit.X.map(function (xn) { return rbf(xn, x, hp.ell, hp.sf); }); return C.solveLower(fit.L, ks); });
      for (i = 0; i < G; i++) for (j = 0; j <= i; j++) { var d = C.dot(V[i], V[j]); S[i][j] -= d; if (i !== j) S[j][i] -= d; }
    }
    return S;
  }
  function sampleFunctions(fit, xs, Z) {
    var S = posteriorCov(fit, xs);
    var ch = C.choleskySafe(S, { rel: 1e-10, maxTries: 9, factor: 10 });
    if (!ch.L) return { ok: false, reason: '標本用の共分散行列を分解できませんでした．' };
    var mu = xs.map(function (x) { return gpPredictOne(fit, x).mu; });
    var paths = Z.map(function (z) { var f = C.matvec(ch.L, z); return f.map(function (v, i) { return v + mu[i]; }); });
    return { ok: true, paths: paths, jitter: ch.jitter };
  }

  /* ---------------- 獲得関数（SPEC_CONTENT §3.4）．mode = 'max'（既定）| 'min'
     最大化：EI = (μ − f_best − ξ)Φ(z) + σ N(z|0,1)，z = (μ − f_best − ξ)/σ；σ = 0 なら max(μ − f_best − ξ, 0)
     最小化：EI = (f_best − μ − ξ)Φ(z) + σ N(z|0,1)，z = (f_best − μ − ξ)/σ
     PI = Φ(z)（σ = 0 なら 改善量 > 0 で 1，それ以外 0）
     UCB = μ + κσ（最大化して選ぶ），LCB = μ − κσ（最小化して選ぶ） */
  function improvement(mu, fbest, xi, mode) { return mode === 'min' ? (fbest - mu - xi) : (mu - fbest - xi); }
  function ei(mu, s, fbest, xi, mode) {
    var d = improvement(mu, fbest, xi || 0, mode);
    if (!(s > 0)) return Math.max(d, 0);
    var z = d / s, v = d * C.normCdf(z) + s * C.normPdf(z);
    return v > 0 ? v : 0;            /* 丸めでわずかに負になったら 0 */
  }
  function eiParts(mu, s, fbest, xi, mode) {
    var d = improvement(mu, fbest, xi || 0, mode);
    if (!(s > 0)) return { d: d, z: null, Phi: null, phi: null, ei: Math.max(d, 0), degenerate: true };
    var z = d / s; return { d: d, z: z, Phi: C.normCdf(z), phi: C.normPdf(z), ei: ei(mu, s, fbest, xi, mode), degenerate: false };
  }
  function pi(mu, s, fbest, xi, mode) {
    var d = improvement(mu, fbest, xi || 0, mode);
    if (!(s > 0)) return d > 0 ? 1 : 0;
    return C.normCdf(d / s);
  }
  function confBound(mu, s, kappa, mode) { return mode === 'min' ? mu - kappa * s : mu + kappa * s; }
  /* 獲得関数の値を「大きいほど良い」形にそろえた比較用の値（LCB は符号を変える） */
  function acqValue(kind, mu, s, o) {
    if (kind === 'ucb') return confBound(mu, s, o.kappa, o.mode);
    if (kind === 'pi') return pi(mu, s, o.fbest, o.xi, o.mode);
    return ei(mu, s, o.fbest, o.xi, o.mode);
  }
  /* 選ぶ規則：EI・PI・UCB は最大，LCB（最小化の UCB）は最小．同じ値なら x の小さい方 */
  function pickBest(values, kind, mode) {
    var k = 0, minimize = (kind === 'ucb' && mode === 'min');
    for (var i = 1; i < values.length; i++) if (minimize ? values[i] < values[k] : values[i] > values[k]) k = i;
    return k;
  }
  /* f_best：def = 'obs'（観測値の最良）| 'mean'（観測点での事後平均の最良） */
  function fBest(fit, def, mode) {
    if (!fit.N) return null;
    var vals = def === 'mean' ? fit.X.map(function (x) { return gpPredictOne(fit, x).mu; }) : fit.y;
    var b = vals[0]; for (var i = 1; i < vals.length; i++) b = mode === 'min' ? Math.min(b, vals[i]) : Math.max(b, vals[i]);
    return b;
  }
  /* 格子の上で獲得関数を評価して次の点を選ぶ．o = {kind, xi, kappa, mode, fbestDef}
     戻り値 {xs, mu, s, acq, k（選んだ添字）, xNext, fbest, nClipped} */
  function acquisition(fit, xs, o) {
    var mode = o.mode || 'max', fb = fBest(fit, o.fbestDef || 'obs', mode);
    var mu = new Array(xs.length), s = new Array(xs.length), a = new Array(xs.length), ncl = 0;
    var opt = { kappa: o.kappa, xi: o.xi || 0, mode: mode, fbest: fb };
    for (var i = 0; i < xs.length; i++) {
      var p = gpPredictOne(fit, xs[i]); if (p.clipped) ncl++;
      mu[i] = p.mu; s[i] = Math.sqrt(p.var);
      a[i] = (fb === null && o.kind !== 'ucb') ? 0 : acqValue(o.kind, mu[i], s[i], opt);
    }
    var k = pickBest(a, o.kind, mode);
    return { xs: xs, mu: mu, s: s, acq: a, k: k, xNext: xs[k], fbest: fb, nClipped: ncl };
  }
  function acqGrid() { return C.linspace(DATA_C.xMin, DATA_C.xMax, LIMITS.nAcq); }

  /* ---------------- ベイズ最適化の 1 回の実行（1 回の評価ずつ進める）
     opt = {mode:'max'|'min', kind:'ei'|'ucb'|'pi', xi, kappa, fbestDef:'obs'|'mean', n0, budget,
            ell, sf, sigma, fitEll（true なら毎回 ℓ を周辺尤度の格子で選ぶ）}
     目的関数：最大化では y(x)（データ C），最小化では g(x) = −y(x)（同じ問題を最小化として書いたもの）．
     平均関数 m は観測した目的関数の値の平均（N ≥ 1）．
     乱数：初期点 x は一様乱数，観測ノイズは観測のたびに同じ rng から（順序は x → ノイズ）． */
  function boCreate(opt, rng) {
    var st = { opt: Object.assign({ mode: 'max', kind: 'ei', xi: 0, kappa: 2, fbestDef: 'obs', n0: 3, budget: 20, ell: 1, sf: 0.8, sigma: 0.05, fitEll: false }, opt),
      rng: rng, X: [], Y: [], T: [], kind: [], acqAt: [], ellUsed: [], grid: acqGrid(), done: false, last: null, error: null };
    st.sign = st.opt.mode === 'min' ? -1 : 1;
    st.opt.budget = Math.max(1, Math.min(LIMITS.maxBudget, Math.round(st.opt.budget)));
    st.opt.n0 = Math.max(1, Math.min(st.opt.budget, Math.round(st.opt.n0)));
    return st;
  }
  function boHyper(st) {
    var o = st.opt, hp = { ell: o.ell, sf: o.sf, sigma: o.sigma };
    if (o.fitEll && st.X.length >= 2) {
      var g = gridSearchHyper(st.X, st.T, { ells: logspace(LIMITS.mlEllRange[0], LIMITS.mlEllRange[1], LIMITS.mlEll), sfs: [o.sf], sigmas: [o.sigma] }, meanOf(st.T));
      if (g.best) hp = g.best.hp;
    }
    return hp;
  }
  /* 現在のデータでの代理モデルと獲得関数（次の候補）．観測は足さない */
  function boModel(st) {
    var hp = boHyper(st), m = st.T.length ? meanOf(st.T) : 0;
    var fit = gpFit(st.X, st.T, hp, m);
    if (!fit.ok) return { ok: false, reason: fit.reason };
    var ac = acquisition(fit, st.grid, { kind: st.opt.kind, xi: st.opt.xi, kappa: st.opt.kappa, mode: st.opt.mode, fbestDef: st.opt.fbestDef });
    return { ok: true, fit: fit, hp: hp, acq: ac };
  }
  function boAdd(st, x, kind, acqv, ell) {
    var y = observeC(st.rng, x);
    st.X.push(x); st.Y.push(y); st.T.push(st.sign * y); st.kind.push(kind); st.acqAt.push(acqv); st.ellUsed.push(ell);
  }
  /* 1 回の評価を進める．戻り値 false なら予算を使い切った */
  function boStep(st) {
    if (st.done || st.error) return false;
    var n = st.X.length, o = st.opt;
    if (n < o.n0) { var x0 = st.rng.uniform(DATA_C.xMin, DATA_C.xMax); boAdd(st, x0, 'init', null, null); }
    else {
      var md = boModel(st);
      if (!md.ok) { st.error = md.reason; return false; }
      st.last = md;
      boAdd(st, md.acq.xNext, 'bo', md.acq.acq[md.acq.k], md.hp.ell);
    }
    if (st.X.length >= o.budget) st.done = true;
    return !st.done;
  }
  /* 推奨点 = これまでに観測した値が最良の点（最大化では y 最大）．単純後悔 = y_max − y_true(推奨点) */
  function recommend(X, Y) { var k = 0; for (var i = 1; i < Y.length; i++) if (Y[i] > Y[k]) k = i; return X.length ? { k: k, x: X[k], yObs: Y[k] } : null; }
  function regretCurve(X, Y) {
    var out = [], kb = 0;
    for (var n = 0; n < X.length; n++) { if (Y[n] > Y[kb]) kb = n; out.push(TRUE_MAX.y - trueC(X[kb])); }
    return out;
  }
  function boRun(opt, seed) {
    var st = boCreate(opt, C.rng(seed));
    while (boStep(st)) { /* 予算まで */ }
    return st;
  }
  /* ランダム探索：x を一様乱数で budget 回 */
  function randomRun(budget, seed) {
    var rng = C.rng(seed), X = [], Y = [];
    for (var i = 0; i < budget; i++) { var x = rng.uniform(DATA_C.xMin, DATA_C.xMax); X.push(x); Y.push(observeC(rng, x)); }
    return { X: X, Y: Y };
  }
  /* 等間隔の格子：評価回数 n ごとに「予算が n なら置く格子」x_k = 10(k − ½)/n（k = 1..n）を測った場合の単純後悔 */
  function gridPoints(n) { var xs = []; for (var k = 1; k <= n; k++) xs.push(DATA_C.xMax * (k - 0.5) / n); return xs; }
  function gridRegretCurve(budget, seed) {
    var rng = C.rng(seed), out = [];
    for (var n = 1; n <= budget; n++) {
      var xs = gridPoints(n), Y = xs.map(function (x) { return observeC(rng, x); });
      out.push(TRUE_MAX.y - trueC(xs[recommend(xs, Y).k]));
    }
    return out;
  }
  /* 中央値と四分位範囲（NumPy 既定の線形補間）．curves は run × n の配列 */
  function summarize(curves) {
    if (!curves.length) return [];
    var B = curves[0].length, out = [];
    for (var n = 0; n < B; n++) {
      var col = curves.map(function (c) { return c[n]; }), q = C.quantile(col, [0.25, 0.5, 0.75]);
      out.push({ n: n + 1, q1: q[0], med: q[1], q3: q[2] });
    }
    return out;
  }
  /* ③ の seed の割り当て：繰り返し r（0 始まり）で BO は base + r，ランダム探索は base + 100000 + r，格子のノイズは base + 200000 + r */
  function compareSeeds(base, r) { return { bo: (base + r) >>> 0, random: (base + 100000 + r) >>> 0, grid: (base + 200000 + r) >>> 0 }; }

  return {
    LIMITS: LIMITS, DATA_C: DATA_C, TRUE_MAX: TRUE_MAX, TRUE_LOCAL: TRUE_LOCAL,
    trueC: trueC, observeC: observeC, goldenMax: goldenMax,
    rbf: rbf, gramY: gramY, meanOf: meanOf, gpFit: gpFit, gpPredictOne: gpPredictOne, gpPredict: gpPredict,
    lml: lml, lmlCurve: lmlCurve, logspace: logspace, gridSearchHyper: gridSearchHyper, defaultGrids: defaultGrids,
    normalVectors: normalVectors, posteriorCov: posteriorCov, sampleFunctions: sampleFunctions,
    improvement: improvement, ei: ei, eiParts: eiParts, pi: pi, confBound: confBound, acqValue: acqValue, pickBest: pickBest,
    fBest: fBest, acquisition: acquisition, acqGrid: acqGrid,
    boCreate: boCreate, boStep: boStep, boModel: boModel, boRun: boRun, boHyper: boHyper,
    recommend: recommend, regretCurve: regretCurve, randomRun: randomRun, gridPoints: gridPoints, gridRegretCurve: gridRegretCurve,
    summarize: summarize, compareSeeds: compareSeeds
  };
});
