/* =====================================================================
   bayes-update.model.js — S02 ベイズ更新の計算（DOM に触れない純粋な関数）
   ブラウザ：window.MLModels.BayesUpdate（先に lib/mlcore.js を読む）
   Node   ：require('./bayes-update.model.js')
   記号は本文（第4章）と同じ：
     Beta–Bernoulli：事前 Beta(μ|a,b)，成功 m 回・失敗 l 回（N=m+l），事後 Beta(μ|a+m, b+l)
     Gauss（分散 σ² 既知）：事前 N(μ|μ0, σ0²)，事後 N(μ|μN, σN²)，予測 N(x|μN, σ²+σN²)
   ===================================================================== */
(function (root, factory) {
  'use strict';
  var C = (typeof module === 'object' && module.exports) ? require('./lib/mlcore.js') : root.MLCore;
  var M = factory(C);
  if (typeof module === 'object' && module.exports) module.exports = M;
  if (root) { root.MLModels = root.MLModels || {}; root.MLModels.BayesUpdate = M; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (C) {
  'use strict';

  var LIMITS = {
    a: [0.5, 30], b: [0.5, 30], maxObsBeta: 2000,
    mu0: [-3, 3], sigma0: [0.1, 3], sigma: [0.2, 3], muTrue: [-3, 3], maxObsGauss: 1000
  };

  /* ---------------- Beta–Bernoulli ---------------- */
  function countObs(obs) { var m = 0; for (var i = 0; i < obs.length; i++) if (obs[i] === 1) m++; return { m: m, l: obs.length - m, N: obs.length }; }

  /* 事後分布のまとめ．level は信用区間の確率（既定 0.95．等裾の区間） */
  function betaSummary(a, b, m, l, level) {
    level = level || 0.95;
    var N = m + l, aN = a + m, bN = b + l;
    var D = C.dist.beta({ a: aN, b: bN });
    var mean = aN / (aN + bN);
    var r = {
      a: a, b: b, m: m, l: l, N: N, aN: aN, bN: bN,
      priorMean: a / (a + b),
      mean: mean,                                   /* 事後平均 (a+m)/(a+b+N) */
      pred: mean,                                   /* 事後予測 p(x=1|D) は事後平均に等しい */
      sd: Math.sqrt(D.variance),
      ml: N > 0 ? m / N : null,                     /* 最尤推定 m/N */
      mlNote: N > 0 ? '' : 'N = 0 では m/N が定義できません（0/0）．',
      ci: [D.ppf((1 - level) / 2), D.ppf(1 - (1 - level) / 2)], level: level,
      w: N / (a + b + N)                            /* 事後平均 = w·(m/N) + (1−w)·a/(a+b) */
    };
    /* MAP：a+m > 1 かつ b+l > 1 なら内部の最大．片方がちょうど 1 なら端（0 または 1）が最大で，公式の値もその端に一致する */
    r.mapEdge = false;
    if (aN > 1 && bN > 1) { r.map = (aN - 1) / (aN + bN - 2); r.mapNote = ''; }
    else if (aN >= 1 && bN >= 1 && aN + bN > 2) {
      r.map = (aN - 1) / (aN + bN - 2); r.mapEdge = true;
      r.mapNote = (bN === 1 ? 'b+l = 1 なので密度は端 μ = 1 で最大です' : 'a+m = 1 なので密度は端 μ = 0 で最大です') + '（公式の値もこの端に一致します）．';
    } else {
      r.map = null;
      if (aN === 1 && bN === 1) r.mapNote = '事後分布が一様なので，最大の点は 1 つに決まりません．';
      else if (aN < 1 && bN < 1) r.mapNote = 'a+m < 1 かつ b+l < 1 なので，密度は両端 μ = 0，1 で発散し，内部に最大がありません．';
      else if (aN < 1) r.mapNote = 'a+m < 1 なので，密度は端 μ = 0 で発散し，公式 (a+m−1)/(a+b+N−2) は使えません．';
      else r.mapNote = 'b+l < 1 なので，密度は端 μ = 1 で発散し，公式 (a+m−1)/(a+b+N−2) は使えません．';
    }
    return r;
  }
  /* 1 個ずつ更新したときのパラメーターの列 [{k, x, a, b, mean}]（k=0 は事前） */
  function betaSequential(a, b, obs) {
    var out = [{ k: 0, x: null, a: a, b: b, mean: a / (a + b) }], A = a, B = b;
    for (var i = 0; i < obs.length; i++) {
      if (obs[i] === 1) A += 1; else B += 1;
      out.push({ k: i + 1, x: obs[i], a: A, b: B, mean: A / (A + B) });
    }
    return out;
  }
  /* 格子の上で Bayes の定理を 1 個ずつ数値で適用し，解析的な一括の事後 Beta(a+m, b+l) と比べる．
     対数で持って掛け算の桁あふれを避け，台形則で正規化する．
     戻り値 {grid, seq（数値の密度）, batch（解析の密度）, maxAbsDiff, peak} */
  function betaGridCheck(a, b, obs, n) {
    n = n || 2001;
    var x = [], logp = [], i, k;
    for (i = 0; i < n; i++) { var u = (i + 0.5) / n; x.push(u); logp.push(C.dist.beta({ a: a, b: b }).logpdf(u)); }
    for (k = 0; k < obs.length; k++) {
      for (i = 0; i < n; i++) logp[i] += obs[k] === 1 ? Math.log(x[i]) : Math.log1p(-x[i]);
      var L = C.logsumexp(logp); for (i = 0; i < n; i++) logp[i] -= L;   /* 毎回の正規化（定数は後で決める） */
    }
    var mx = Math.max.apply(null, logp), p = logp.map(function (v) { return Math.exp(v - mx); });
    var Z = 0; for (i = 0; i < n; i++) Z += p[i] / n;                       /* 中点則：幅 1/n */
    var c = countObs(obs), D = C.dist.beta({ a: a + c.m, b: b + c.l });
    /* 解析解も同じ格子の和で正規化する（a<1 などで端が発散すると，中点則の正規化に誤差が出るため．
       これで「逐次の数値計算 ∝ 一括の解析解」を比べることになる） */
    var batch = x.map(D.pdf), Zb = 0; for (i = 0; i < n; i++) Zb += batch[i] / n;
    var seq = p.map(function (v) { return v / Z; }); batch = batch.map(function (v) { return v / Zb; });
    var d = 0, peak = 0; for (i = 0; i < n; i++) { d = Math.max(d, Math.abs(seq[i] - batch[i])); peak = Math.max(peak, batch[i]); }
    return { grid: x, seq: seq, batch: batch, maxAbsDiff: d, peak: peak, relDiff: d / peak };
  }
  /* 尤度 μ^m(1−μ)^l を面積 1 にそろえた形（＝Beta(μ|m+1, l+1) の密度）．N=0 なら一様（定数 1） */
  function likelihoodShape(m, l) { var D = C.dist.beta({ a: m + 1, b: l + 1 }); return function (u) { return D.pdf(u); }; }
  /* 真の μ から n 回引く（rng は MLCore.rng）．1＝成功，0＝失敗 */
  function drawBernoulli(rng, mu, n) { var out = []; for (var i = 0; i < n; i++) out.push(rng.uniform() < mu ? 1 : 0); return out; }
  /* 観測の 0..N 個目までの推移 [{n, mean, lo, hi, ml}]．maxPts（既定 400）を超えるときは等間隔に間引く（最後の点は必ず含む） */
  function betaPath(a, b, obs, level, maxPts) {
    maxPts = maxPts || 400;
    var N = obs.length, stride = Math.max(1, Math.ceil(N / maxPts)), out = [], m = 0, l = 0;
    out.push(pt(0));
    for (var i = 0; i < N; i++) { if (obs[i] === 1) m++; else l++; if ((i + 1) % stride === 0 || i === N - 1) out.push(pt(i + 1)); }
    function pt(n) { var s = betaSummary(a, b, m, l, level); return { n: n, mean: s.mean, lo: s.ci[0], hi: s.ci[1], ml: s.ml }; }
    return out;
  }

  /* ---------------- Gauss 分布の平均（分散 σ² 既知） ---------------- */
  /* 1/σN² = 1/σ0² + N/σ²，μN = σN² (μ0/σ0² + N x̄/σ²)．予測 N(x|μN, σ²+σN²) */
  function gaussPosterior(mu0, sigma0, sigma, xs, level) {
    level = level || 0.95;
    var N = xs.length, xbar = N ? C.mean(xs) : null;
    var prec = 1 / (sigma0 * sigma0) + N / (sigma * sigma);
    var varN = 1 / prec;
    var muN = varN * (mu0 / (sigma0 * sigma0) + (N ? N * xbar : 0) / (sigma * sigma));
    var z = C.normInv(1 - (1 - level) / 2);
    var predVar = sigma * sigma + varN;
    return {
      N: N, xbar: xbar, ml: xbar, mlNote: N ? '' : 'N = 0 では標本平均が定義できません．',
      mu0: mu0, sigma0: sigma0, sigma: sigma,
      muN: muN, varN: varN, sigmaN: Math.sqrt(varN),
      w: N * sigma0 * sigma0 / (N * sigma0 * sigma0 + sigma * sigma),   /* μN = w x̄ + (1−w) μ0 */
      ci: [muN - z * Math.sqrt(varN), muN + z * Math.sqrt(varN)],
      noiseVar: sigma * sigma, predVar: predVar, predSd: Math.sqrt(predVar),
      predInt: [muN - z * Math.sqrt(predVar), muN + z * Math.sqrt(predVar)], level: level, z: z
    };
  }
  /* 1 個ずつ更新（前の事後を次の事前にする）．戻り値 [{k, x, muN, varN}] */
  function gaussSequential(mu0, sigma0, sigma, xs) {
    var mu = mu0, v = sigma0 * sigma0, s2 = sigma * sigma, out = [{ k: 0, x: null, muN: mu, varN: v }];
    for (var i = 0; i < xs.length; i++) {
      var vn = 1 / (1 / v + 1 / s2);
      mu = vn * (mu / v + xs[i] / s2); v = vn;
      out.push({ k: i + 1, x: xs[i], muN: mu, varN: v });
    }
    return out;
  }
  /* 合成データ：x = μ_true + σ ε，ε ~ N(0,1) */
  function drawGauss(rng, muTrue, sigma, n) { var out = []; for (var i = 0; i < n; i++) out.push(muTrue + sigma * rng.normal()); return out; }
  /* σN² を N の関数として（図用） */
  function varNofN(sigma0, sigma, N) { return 1 / (1 / (sigma0 * sigma0) + N / (sigma * sigma)); }

  return {
    LIMITS: LIMITS, countObs: countObs,
    betaSummary: betaSummary, betaSequential: betaSequential, betaGridCheck: betaGridCheck,
    likelihoodShape: likelihoodShape, drawBernoulli: drawBernoulli, betaPath: betaPath,
    gaussPosterior: gaussPosterior, gaussSequential: gaussSequential, drawGauss: drawGauss, varNofN: varNofN
  };
});
