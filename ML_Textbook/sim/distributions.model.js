/* =====================================================================
   distributions.model.js — S01 確率分布の計算（DOM に触れない純粋な関数）
   ブラウザ：window.MLModels.Distributions（先に lib/mlcore.js を読む）
   Node   ：require('./distributions.model.js')（試験 W/tests/distributions.test.mjs から）
   記号は本文（第3章）と SPEC_CONTENT §3 に合わせる：
     二項 Bin(x | N, μ)，Poisson Pois(x | λ)，Gauss 𝒩(x | μ, σ²)（σ は標準偏差），
     Cauchy（Lorentz 型）p(x) = (1/π) γ / [(x − x0)² + γ²]（γ は半値半幅，半値全幅 2γ），
     Gamma Gam(x | a, b)（a は形，b は率），Beta(x | a, b)，Student の t（自由度 ν，位置 μ，尺度 s），
     Weibull F(s) = 1 − exp[−(s/s0)^m]（強度の記号は s）．
   ・分布の pdf・cdf・ppf・平均・分散は MLCore.dist を使う（この装置では作り直さない）．
   ・乱数は引数で受け取った MLCore.rng だけを使う（Math.random 禁止）．
   ・計算量の上限は LIMITS に書き，画面にも出す．
   ===================================================================== */
(function (root, factory) {
  'use strict';
  var C = (typeof module === 'object' && module.exports) ? require('./lib/mlcore.js') : root.MLCore;
  var M = factory(C);
  if (typeof module === 'object' && module.exports) module.exports = M;
  if (root) { root.MLModels = root.MLModels || {}; root.MLModels.Distributions = M; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (C) {
  'use strict';

  var LIMITS = {
    maxSample: 10000,          /* ① ヒストグラムの標本数の上限（画面の選択肢 なし／100／1000／10000 と同じ） */
    maxN: 100000,              /* ② 標本数 n の上限 */
    maxPaths: 20,              /* ② 系列の数の上限 */
    checkpoints: 240,          /* ② 曲線に記録する n の数（対数で等間隔） */
    chunk: 4000                /* ② 時間分割の 1 回あたりの標本数の目安 */
  };

  /* t 分布の ν の選択肢（1 と 2 を正確に含める．スライダーは添字で動かす） */
  var NU_LIST = [0.5, 0.8, 1, 1.5, 2, 2.5, 3, 4, 5, 7, 10, 15, 20, 30, 50, 100, 1000];

  /* 分布族の定義．params：key，表示名（HTML），範囲，刻み，既定値．type:'int' は整数，'list' は選択肢 */
  var FAMILIES = {
    binomial: { label: '二項分布', discrete: true, variable: 'x', params: [
      { key: 'N', label: '試行の回数 <i>N</i>', min: 1, max: 200, step: 1, value: 20, type: 'int' },
      { key: 'mu', label: '成功の確率 <i>μ</i>', min: 0, max: 1, step: 0.01, value: 0.3 }] },
    poisson: { label: 'Poisson 分布', discrete: true, variable: 'x', params: [
      { key: 'lambda', label: '平均の回数 <i>λ</i>', min: 0.1, max: 60, step: 0.1, value: 4 }] },
    gauss: { label: 'Gauss 分布', discrete: false, variable: 'x', params: [
      { key: 'mu', label: '平均 <i>μ</i>', min: -5, max: 5, step: 0.1, value: 0 },
      { key: 'sigma', label: '標準偏差 <i>σ</i>', min: 0.1, max: 5, step: 0.05, value: 1 }] },
    cauchy: { label: 'Cauchy 分布（Lorentz 型）', discrete: false, variable: 'x', params: [
      { key: 'x0', label: '中心 <i>x</i><sub>0</sub>', min: -5, max: 5, step: 0.1, value: 0 },
      { key: 'gamma', label: '半値半幅 <i>γ</i>', min: 0.1, max: 5, step: 0.05, value: 1 }] },
    gamma: { label: 'Gamma 分布', discrete: false, variable: 'x', params: [
      { key: 'a', label: '形 <i>a</i>', min: 0.2, max: 20, step: 0.1, value: 2 },
      { key: 'b', label: '率 <i>b</i>', min: 0.1, max: 10, step: 0.1, value: 1 }] },
    beta: { label: 'Beta 分布', discrete: false, variable: 'x', params: [
      { key: 'a', label: '<i>a</i>', min: 0.2, max: 20, step: 0.1, value: 2 },
      { key: 'b', label: '<i>b</i>', min: 0.2, max: 20, step: 0.1, value: 5 }] },
    studentT: { label: 'Student の t 分布', discrete: false, variable: 'x', params: [
      { key: 'nu', label: '自由度 <i>ν</i>', type: 'list', list: NU_LIST, value: 3 },
      { key: 'mu', label: '位置 <i>μ</i>', min: -5, max: 5, step: 0.1, value: 0 },
      { key: 's', label: '尺度 <i>s</i>', min: 0.1, max: 5, step: 0.05, value: 1 }] },
    weibull: { label: 'Weibull 分布', discrete: false, variable: 's', params: [
      { key: 'm', label: 'Weibull 係数 <i>m</i>', min: 0.5, max: 30, step: 0.1, value: 5 },
      { key: 's0', label: '尺度 <i>s</i><sub>0</sub>', min: 0.2, max: 5, step: 0.05, value: 1 }] }
  };
  var ORDER = ['binomial', 'poisson', 'gauss', 'cauchy', 'gamma', 'beta', 'studentT', 'weibull'];

  function defaults(fam) { var o = {}; FAMILIES[fam].params.forEach(function (q) { o[q.key] = q.value; }); return o; }
  /* 範囲に丸める（list は最も近い選択肢，int は整数） */
  function clampParams(fam, p) {
    var o = {};
    FAMILIES[fam].params.forEach(function (q) {
      var v = Number(p[q.key]); if (!isFinite(v)) v = q.value;
      if (q.type === 'list') { var best = q.list[0]; q.list.forEach(function (c) { if (Math.abs(c - v) < Math.abs(best - v)) best = c; }); v = best; }
      else { v = Math.min(q.max, Math.max(q.min, v)); if (q.type === 'int') v = Math.round(v); }
      o[q.key] = v;
    });
    return o;
  }
  /* MLCore.dist の分布オブジェクトを作る */
  function make(fam, p) {
    p = clampParams(fam, p);
    switch (fam) {
      case 'binomial': return C.dist.binomial({ n: p.N, mu: p.mu });
      case 'poisson': return C.dist.poisson({ lambda: p.lambda });
      case 'gauss': return C.dist.gauss({ mu: p.mu, sigma: p.sigma });
      case 'cauchy': return C.dist.cauchy({ x0: p.x0, gamma: p.gamma });
      case 'gamma': return C.dist.gamma({ a: p.a, b: p.b });
      case 'beta': return C.dist.beta({ a: p.a, b: p.b });
      case 'studentT': return C.dist.studentT({ nu: p.nu, mu: p.mu, s: p.s });
      case 'weibull': return C.dist.weibull({ m: p.m, s0: p.s0 });
    }
    throw new Error('未知の分布：' + fam);
  }

  /* ---------------- 形の情報：最頻値と半値全幅 ---------------- */
  var FW_GAUSS = 2 * Math.sqrt(2 * Math.LN2);      /* 半値全幅 = 2√(2 ln 2) σ ≈ 2.3548 σ */
  function tFwhmFactor(nu) { return 2 * Math.sqrt(nu * (Math.pow(2, 2 / (nu + 1)) - 1)); }
  /* 連続分布の最頻値（解析的）．端で最大・発散するときは null と理由 */
  function modeOf(fam, p) {
    p = clampParams(fam, p);
    switch (fam) {
      case 'gauss': return { mode: p.mu, note: '' };
      case 'cauchy': return { mode: p.x0, note: '' };
      case 'studentT': return { mode: p.mu, note: '' };
      case 'gamma': return p.a > 1 ? { mode: (p.a - 1) / p.b, note: '' } : { mode: null, note: p.a === 1 ? '最大は端 x = 0 にあります．' : 'a < 1 では x → 0 で密度が発散します．' };
      case 'beta':
        if (p.a > 1 && p.b > 1) return { mode: (p.a - 1) / (p.a + p.b - 2), note: '' };
        return { mode: null, note: 'a > 1 かつ b > 1 でないと，内部に最大がありません（端で最大または発散）．' };
      case 'weibull': return p.m > 1 ? { mode: p.s0 * Math.pow((p.m - 1) / p.m, 1 / p.m), note: '' } : { mode: null, note: p.m === 1 ? '最大は端 s = 0 にあります．' : 'm < 1 では s → 0 で密度が発散します．' };
      /* (N+1)μ や λ が整数のときは，隣り合う 2 つの整数が同じ確率で最大になる（最頻値が 2 つ）．大きい方を返し，note に書く */
      case 'binomial': {
        var y = (p.N + 1) * p.mu, k = Math.floor(y + 1e-9);
        var tie = p.mu > 0 && p.mu < 1 && Math.abs(y - Math.round(y)) < 1e-9 && k >= 1 && k <= p.N;
        return { mode: Math.min(p.N, k), note: tie ? (k - 1) + ' と ' + k + ' が同じ確率で最大です（(N + 1)μ が整数）．' : '' }; }
      case 'poisson': {
        var L = Math.floor(p.lambda + 1e-9), tieP = L >= 1 && Math.abs(p.lambda - Math.round(p.lambda)) < 1e-9;
        return { mode: L, note: tieP ? (L - 1) + ' と ' + L + ' が同じ確率で最大です（λ が整数）．' : '' }; }
    }
    return { mode: null, note: '' };
  }
  /* 半値全幅：Gauss・Cauchy・t は解析式，他（単峰で内部に最大があるもの）は二分法．離散分布は定義しない */
  function fwhm(fam, p) {
    p = clampParams(fam, p);
    if (FAMILIES[fam].discrete) return { value: null, note: '離散分布では半値全幅を定義しません．', method: '' };
    if (fam === 'gauss') return { value: FW_GAUSS * p.sigma, note: '', method: '2√(2 ln 2) σ' };
    if (fam === 'cauchy') return { value: 2 * p.gamma, note: '', method: '2γ' };
    if (fam === 'studentT') return { value: p.s * tFwhmFactor(p.nu), note: '', method: '2s√(ν(2^{2/(ν+1)} − 1))' };
    var mo = modeOf(fam, p); if (mo.mode === null) return { value: null, note: '最大が定義域の端にあるため，半値全幅を定義しません．', method: '' };
    var D = make(fam, p), half = D.pdf(mo.mode) / 2, lo = D.support[0];
    var hiEnd = D.ppf(1 - 1e-12); if (!isFinite(hiEnd)) hiEnd = mo.mode + 1e6;
    function bis(a, b) { /* f(a) と f(b) の符号が違う区間で pdf − half = 0 */
      var fa = D.pdf(a) - half;
      for (var i = 0; i < 200; i++) { var m = 0.5 * (a + b), fm = D.pdf(m) - half; if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m; if (b - a < 1e-14 * Math.max(1, Math.abs(m))) break; }
      return 0.5 * (a + b);
    }
    var xl = bis(lo, mo.mode), xr = bis(mo.mode, (fam === 'beta') ? 1 : hiEnd);
    return { value: xr - xl, left: xl, right: xr, note: '', method: '二分法' };
  }
  /* 2 つ目の分布（gauss・cauchy・studentT）の尺度を変えて半値全幅を target にそろえる．位置は loc */
  function matchFWHM(fam, p, target, loc) {
    var q = clampParams(fam, p), note = '';
    if (!(target > 0)) return { params: q, ok: false, note: '1 つ目の分布の半値全幅が定義されていません．' };
    if (fam === 'gauss') { q.sigma = target / FW_GAUSS; if (loc != null) q.mu = loc; }
    else if (fam === 'cauchy') { q.gamma = target / 2; if (loc != null) q.x0 = loc; }
    else if (fam === 'studentT') { q.s = target / tFwhmFactor(q.nu); if (loc != null) q.mu = loc; }
    else return { params: q, ok: false, note: '半値全幅をそろえられるのは Gauss・Cauchy・t 分布です．' };
    var r = clampParams(fam, q), ok = true;
    Object.keys(r).forEach(function (k) { if (Math.abs(r[k] - q[k]) > 1e-12) { ok = false; note = 'パラメーターの範囲を超えるので，範囲の端に丸めました．'; } });
    return { params: q, clamped: r, ok: ok, note: note };
  }

  /* ---------------- 平均・分散（存在しなければ null と理由）と定義域 ---------------- */
  function summary(fam, p) {
    p = clampParams(fam, p);
    var D = make(fam, p), mo = modeOf(fam, p), fw = fwhm(fam, p);
    var sup = { binomial: '{0, 1, …, ' + p.N + '}', poisson: '{0, 1, 2, …}', gauss: '(−∞, ∞)', cauchy: '(−∞, ∞)', gamma: '(0, ∞)', beta: '(0, 1)', studentT: '(−∞, ∞)', weibull: '[0, ∞)' }[fam];
    return {
      fam: fam, params: p, discrete: D.discrete, support: D.support, supportText: sup,
      mean: D.mean, variance: D.variance, sd: D.std, meanNote: D.meanNote, varianceNote: D.varianceNote,
      median: D.discrete ? D.ppf(0.5) : D.ppf(0.5),
      mode: mo.mode, modeNote: mo.note, fwhm: fw.value, fwhmNote: fw.note
    };
  }

  /* Cauchy の |x − x0| の部分積分：∫_{x0−R}^{x0+R} |x − x0| p(x) dx = (γ/π) ln(1 + R²/γ²)
     R → ∞ で対数的に発散する（平均が存在しない理由）．x0 によらない */
  function cauchyAbsMoment(gamma, R) { return gamma / Math.PI * Math.log1p((R / gamma) * (R / gamma)); }
  /* Cauchy の 2 次の部分積分：∫_{x0−R}^{x0+R} (x − x0)² p(x) dx = (2γ/π)[R − γ arctan(R/γ)] ～ 2γR/π（線形に発散） */
  function cauchySecondMoment(gamma, R) { return 2 * gamma / Math.PI * (R - gamma * Math.atan(R / gamma)); }

  /* ---------------- 区間確率 P(a ≤ x ≤ b) ---------------- */
  /* 累積分布関数 F から求める．離散分布は a, b を含む整数（k = ⌈a⌉, …, ⌊b⌋）の和 = F(⌊b⌋) − F(⌈a⌉ − 1）．
     連続分布では pdf を Simpson 法で数値積分した値も返す（端で密度が発散するときは null） */
  function interval(fam, p, a, b) {
    var D = make(fam, p);
    if (b < a) { var t = a; a = b; b = t; }
    var r = { a: a, b: b, discrete: D.discrete };
    if (D.discrete) {
      var ka = Math.ceil(a - 1e-12), kb = Math.floor(b + 1e-12);
      ka = Math.max(ka, D.support[0]); if (isFinite(D.support[1])) kb = Math.min(kb, D.support[1]);
      r.kLo = ka; r.kHi = kb;
      if (kb < ka) { r.P = 0; r.Fb = D.cdf(kb); r.Fa = D.cdf(ka - 1); r.empty = true; return r; }
      r.Fb = D.cdf(kb); r.Fa = D.cdf(ka - 1); r.P = Math.max(0, r.Fb - r.Fa);
      /* 確かめ：pmf の直接の和（項が多いときは log-sum-exp） */
      var lps = []; for (var k = ka; k <= kb; k++) lps.push(D.logpdf(k));
      r.sumPmf = Math.exp(C.logsumexp(lps)); r.nTerms = kb - ka + 1;
      return r;
    }
    var lo = Math.max(a, D.support[0]), hi = Math.min(b, D.support[1]);
    r.Fa = D.cdf(a); r.Fb = D.cdf(b); r.P = Math.max(0, r.Fb - r.Fa);
    if (!(hi > lo)) { r.numeric = 0; return r; }
    r.endSingular = !isFinite(D.pdf(lo)) || !isFinite(D.pdf(hi));   /* 端で密度が発散（積分は有限） */
    /* 分位点（1, 10, 25, 50, 75, 90, 99 %）で区間を分け，各小区間で二重指数型の積分（ピークが細い場合に備える） */
    var cuts = [lo];
    [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99].forEach(function (pp) { var x = D.ppf(pp); if (x > cuts[cuts.length - 1] && x < hi) cuts.push(x); });
    cuts.push(hi);
    var tot = 0, err = 0;
    for (var k = 0; k + 1 < cuts.length; k++) { var q = tanhSinh(D.pdf, cuts[k], cuts[k + 1]); tot += q.value; err += q.err; }
    r.numeric = tot; r.numericErr = err;
    return r;
  }
  /* 二重指数型（tanh–sinh）の数値積分．端で密度が発散しても（x^{−1/2} など積分可能なら）精度が落ちにくい．
     x = a + (b−a)/(1+e^{−2u}) と x = b − (b−a)/(1+e^{2u})（u = (π/2) sinh τ）で端からの距離を直接作り，桁落ちを避ける．
     刻み h = 1/64，τ ∈ [−4, 4]．誤差の目安は h = 1/32 との差 */
  function tanhSinh(f, a, b) {
    function sumH(h, skipEven) {
      var s = 0, w = b - a, n = Math.round(4 / h);
      for (var k = -n; k <= n; k++) {
        if (skipEven && k % 2 === 0) continue;
        var tau = k * h, u = Math.PI / 2 * Math.sinh(tau), ch = Math.cosh(u);
        var wt = w / 2 * (Math.PI / 2) * Math.cosh(tau) / (ch * ch);
        if (!(wt > 0)) continue;
        var x = tau <= 0 ? a + w / (1 + Math.exp(-2 * u)) : b - w / (1 + Math.exp(2 * u));
        if (x <= a || x >= b) continue;
        var fx = f(x); if (!isFinite(fx)) continue;
        s += wt * fx;
      }
      return s;
    }
    var h = 1 / 32, s32 = sumH(h, false) * h, s64 = (s32 / h + sumH(h / 2, true)) * (h / 2);
    return { value: s64, err: Math.abs(s64 - s32) };
  }

  /* ---------------- 描画の範囲 ---------------- */
  /* 標準：中央値 ± 4×四分位範囲 と 0.01 % 点・99.99 % 点の狭い方（定義域で切る）．
     広い（裾を見る）：中央値からの幅を 4 倍に．離散分布は整数 */
  function plotRange(fam, p, wide) {
    var D = make(fam, p), med = D.ppf(0.5), q1 = D.ppf(0.25), q3 = D.ppf(0.75), iqr = Math.max(q3 - q1, 1e-9);
    var lo, hi;
    if (D.discrete) {
      lo = D.ppf(1e-4); hi = D.ppf(1 - 1e-4);
      if (wide) { lo = med - 3 * (med - lo); hi = med + 3 * (hi - med); }
      lo = Math.max(D.support[0], Math.floor(lo)); hi = Math.ceil(hi);
      if (isFinite(D.support[1])) hi = Math.min(D.support[1], hi);
      if (hi - lo < 6) { hi = lo + 6; if (isFinite(D.support[1]) && hi > D.support[1]) { hi = D.support[1]; lo = Math.max(D.support[0], hi - 6); } }
      return [lo - 0.5, hi + 0.5];
    }
    lo = Math.max(D.ppf(1e-4), med - 4 * iqr); hi = Math.min(D.ppf(1 - 1e-4), med + 4 * iqr);
    if (wide) { lo = med - 4 * (med - lo); hi = med + 4 * (hi - med); }
    if (fam === 'beta') { lo = 0; hi = 1; }
    if (isFinite(D.support[0]) && D.support[0] === 0) {
      lo = 0;
      /* 右に長い裾（Gamma の a < 1 など）で四分位範囲が小さすぎるとき，99 % 点までは描く */
      var h99 = D.ppf(0.99); if (h99 > hi) hi = wide ? Math.max(hi, D.ppf(0.9999)) : h99;
    }
    if (isFinite(D.support[1])) hi = Math.min(hi, D.support[1]);
    if (!(hi > lo)) hi = lo + 1;
    return [lo, hi];
  }
  function unionRange(r1, r2) { return r2 ? [Math.min(r1[0], r2[0]), Math.max(r1[1], r2[1])] : r1.slice(); }

  /* 曲線の値（連続：pdf，離散：整数ごとの pmf）．x 格子 */
  function curve(fam, p, xr, n) {
    var D = make(fam, p), xs = [], ys = [];
    if (D.discrete) {
      for (var k = Math.max(D.support[0], Math.ceil(xr[0])); k <= Math.floor(xr[1]); k++) { if (isFinite(D.support[1]) && k > D.support[1]) break; xs.push(k); ys.push(D.pdf(k)); }
    } else {
      xs = C.linspace(xr[0], xr[1], n || 600);
      ys = xs.map(function (x) { var v = D.pdf(x); return (x < D.support[0] || x > D.support[1]) ? 0 : v; });
    }
    return { xs: xs, ys: ys, discrete: D.discrete };
  }

  /* ---------------- 標本 ---------------- */
  function drawSample(fam, p, rng, n) {
    var D = make(fam, p), out = new Array(n);
    for (var i = 0; i < n; i++) out[i] = D.sample(rng);
    return out;
  }
  /* 標本の要約：平均・不偏分散（ddof=1）・中央値．n < 2 なら分散は null */
  function sampleStats(xs) {
    var n = xs.length;
    if (!n) return { n: 0, mean: null, variance: null, median: null, maxAbs: null };
    var m = C.mean(xs), v = n > 1 ? C.variance(xs, 1) : null, mx = 0;
    for (var i = 0; i < n; i++) mx = Math.max(mx, Math.abs(xs[i]));
    return { n: n, mean: m, variance: v, median: C.median(xs), maxAbs: mx };
  }
  /* ヒストグラム（密度に正規化）．離散は整数ごとの相対度数．範囲外の個数も返す */
  function histogram(xs, xr, discrete, bins) {
    var n = xs.length;
    if (discrete) {
      var k0 = Math.ceil(xr[0]), k1 = Math.floor(xr[1]), counts = [], ks = [], out = 0, i;
      for (i = k0; i <= k1; i++) { ks.push(i); counts.push(0); }
      for (i = 0; i < n; i++) { var k = Math.round(xs[i]); if (k < k0 || k > k1) out++; else counts[k - k0]++; }
      return { discrete: true, ks: ks, counts: counts, freq: counts.map(function (c) { return n ? c / n : 0; }), outside: out, n: n };
    }
    var h = C.histogram(xs, { bins: bins || 40, range: xr });
    h.discrete = false; h.n = n; return h;
  }

  /* ---------------- ② 標本平均・中央値の推移 ---------------- */
  /* 記録する n（1 から nMax まで対数で等間隔．重複を除いた整数．最後は nMax） */
  function checkpoints(nMax, count) {
    count = count || LIMITS.checkpoints;
    var out = [], last = 0;
    for (var i = 0; i < count; i++) {
      var v = Math.round(Math.pow(nMax, i / (count - 1)));
      if (v > last) { out.push(v); last = v; }
    }
    if (out[out.length - 1] !== nMax) out.push(nMax);
    return out;
  }
  /* 系列 j の seed：seed と j から作る（系列 j の標本は nMax や系列の数によらず同じ） */
  function pathSeed(seed, j) { return ((seed >>> 0) + Math.imul(j, 0x9E3779B9)) >>> 0; }

  /* 二つのヒープによる逐次の中央値（偶数個では中央の 2 つの平均．NumPy の median と同じ） */
  function RunningMedian() {
    var lo = [], hi = [];   /* lo：最大ヒープ（符号を反転して最小ヒープで持つ），hi：最小ヒープ */
    function push(h, v) { h.push(v); var i = h.length - 1; while (i > 0) { var pnt = (i - 1) >> 1; if (h[pnt] <= h[i]) break; var t = h[pnt]; h[pnt] = h[i]; h[i] = t; i = pnt; } }
    function pop(h) {
      var top = h[0], last = h.pop();
      if (h.length) { h[0] = last; var i = 0, n = h.length; for (;;) { var l = 2 * i + 1, r = l + 1, s = i; if (l < n && h[l] < h[s]) s = l; if (r < n && h[r] < h[s]) s = r; if (s === i) break; var t = h[s]; h[s] = h[i]; h[i] = t; i = s; } }
      return top;
    }
    return {
      add: function (x) {
        if (!lo.length || x <= -lo[0]) push(lo, -x); else push(hi, x);
        if (lo.length > hi.length + 1) push(hi, -pop(lo));
        else if (hi.length > lo.length) push(lo, -pop(hi));
      },
      median: function () { if (!lo.length) return null; if (lo.length > hi.length) return -lo[0]; var a = -lo[0]; return a + 0.5 * (hi[0] - a); },   /* MLCore.quantile と同じ式 */
      size: function () { return lo.length + hi.length; }
    };
  }

  /* 推移の計算を時間分割で進める仕事．opt：{fam: 'gauss'|'cauchy'|'studentT', params, nMax, K, seed, median:true}
     job.step(maxSamples) を繰り返し呼ぶ（true を返したら完了）．job.paths[j] = {n:[], mean:[], median:[], maxAbs} */
  function createMeanJob(opt) {
    var nMax = Math.min(LIMITS.maxN, Math.max(1, Math.round(opt.nMax))), K = Math.min(LIMITS.maxPaths, Math.max(1, Math.round(opt.K)));
    var D = make(opt.fam, opt.params), cps = checkpoints(nMax, opt.count);
    var wantMed = opt.median !== false;
    var paths = [], j = 0, i = 0, ci = 0, sum = 0, comp = 0, rng = null, rm = null, cur = null, done = false, total = 0;
    function startPath() { rng = C.rng(pathSeed(opt.seed, j)); rm = wantMed ? RunningMedian() : null; sum = 0; comp = 0; i = 0; ci = 0; cur = { n: [], mean: [], median: [], maxAbs: 0, nonFinite: false }; }
    startPath();
    var job = {
      nMax: nMax, K: K, checkpoints: cps, paths: paths, fam: opt.fam, params: clampParams(opt.fam, opt.params), seed: opt.seed >>> 0,
      total: nMax * K, samplesDone: function () { return total; }, isDone: function () { return done; },
      current: function () { return cur; },
      step: function (maxSamples) {
        if (done) return true;
        var budget = maxSamples || LIMITS.chunk;
        while (budget > 0 && !done) {
          var x = D.sample(rng);
          if (!isFinite(x)) cur.nonFinite = true;
          /* Kahan の補正つきの和（n = 10⁵ でも丸めが効かない） */
          var y = x - comp, t = sum + y; comp = (t - sum) - y; sum = t;
          i++; total++; budget--;
          var ax = Math.abs(x - (D.params.mu !== undefined ? D.params.mu : (D.params.x0 || 0))); if (ax > cur.maxAbs) cur.maxAbs = ax;
          if (rm) rm.add(x);
          if (i === cps[ci]) { cur.n.push(i); cur.mean.push(sum / i); cur.median.push(rm ? rm.median() : null); ci++; }
          if (i >= nMax) { paths.push(cur); j++; if (j >= K) { done = true; break; } startPath(); }
        }
        return done;
      }
    };
    return job;
  }
  function runMeanJob(opt) { var job = createMeanJob(opt); while (!job.step(1e9)); return job; }

  /* 標本平均・中央値の散らばりの理論値（n 個の i.i.d. 標本）
     ・平均：分散が有限なら sd[x̄] = sd[x]/√n．Cauchy では x̄ ～ Cauchy(x0, γ)（n によらない）
     ・中央値：漸近的に sd ≈ 1/(2 p(m) √n)（m は分布の中央値）．Gauss は σ√(π/2)/√n，Cauchy は πγ/(2√n) */
  function theory(fam, p, n) {
    p = clampParams(fam, p);
    var D = make(fam, p), r = { fam: fam, n: n, center: (fam === 'cauchy') ? p.x0 : p.mu };
    r.sdMean = (D.variance === null || !isFinite(D.variance)) ? null : Math.sqrt(D.variance / n);
    r.meanNote = D.meanNote; r.varianceNote = D.varianceNote;
    if (fam === 'cauchy') { r.meanScale = p.gamma; r.meanDist = 'Cauchy(x0, γ)'; r.pOutside = 0.5; }
    if (fam === 'studentT' && p.nu === 1) { r.meanScale = p.s; r.meanDist = 'Cauchy(μ, s)'; r.pOutside = 0.5; }
    var pm = D.pdf(D.ppf(0.5));
    r.sdMedian = 1 / (2 * pm * Math.sqrt(n));
    return r;
  }
  /* 系列の最後（または指定の添字）での値の散らばり：標本標準偏差（ddof=1）と四分位範囲 */
  function spreadAt(values) {
    var v = values.filter(function (x) { return isFinite(x); });
    if (v.length < 2) return { n: v.length, sd: null, iqr: null, median: v.length ? v[0] : null };
    var q = C.quantile(v, [0.25, 0.5, 0.75]);
    return { n: v.length, sd: C.std(v, 1), iqr: q[2] - q[0], median: q[1] };
  }

  return {
    LIMITS: LIMITS, NU_LIST: NU_LIST, FAMILIES: FAMILIES, ORDER: ORDER, FW_GAUSS: FW_GAUSS,
    defaults: defaults, clampParams: clampParams, make: make,
    modeOf: modeOf, fwhm: fwhm, tFwhmFactor: tFwhmFactor, matchFWHM: matchFWHM, summary: summary,
    cauchyAbsMoment: cauchyAbsMoment, cauchySecondMoment: cauchySecondMoment,
    interval: interval, plotRange: plotRange, unionRange: unionRange, curve: curve,
    drawSample: drawSample, sampleStats: sampleStats, histogram: histogram,
    checkpoints: checkpoints, pathSeed: pathSeed, RunningMedian: RunningMedian,
    createMeanJob: createMeanJob, tanhSinh: tanhSinh, runMeanJob: runMeanJob, theory: theory, spreadAt: spreadAt
  };
});
