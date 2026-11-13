/* =====================================================================
   regression.model.js — S03 回帰と過学習の計算（DOM に触れない純粋な関数）
   ブラウザ：window.MLModels.Regression（先に lib/mlcore.js を読む）
   Node   ：require('./regression.model.js')（試験 W/tests/regression.test.mjs から）
   記号は本文（第6章・第8章）と SPEC_CONTENT §3 に合わせる：
     データ 𝒟 = {(s_n, y_n)}，計画行列 Φ ∈ R^{N×(d+1)}（次数 d の多項式は基底が d+1 個．本文の基底の数 M = d+1．
     コード中の変数名 M・Mmax・Ms・spec.M は次数 d を表す），
     Ridge：L(w) = ½‖y − Φw‖² + (λ/2)‖w‖²，
     ベイズ線形回帰：p(w) = N(w | 0, σ_w² I)，ノイズの分散 σ²，事後 N(w | m_N, S_N)，
       S_N⁻¹ = σ_w⁻² I + σ⁻² ΦᵀΦ，m_N = σ⁻² S_N Φᵀ y，
       予測 p(y_* | s_*, 𝒟) = N(y_* | m_Nᵀφ_*, σ² + φ_*ᵀ S_N φ_*)．
   ・目標値は相対密度 y から固定の基準値 Y_REF = 88 % を引いた値（データから計算しない）．
   ・乱数は引数で受け取った MLCore.rng だけを使う（Math.random 禁止）．
   ・逆行列を作らない：最小二乗は Householder QR（MLCore.lstsq／ridge），
     ベイズ線形回帰は [Φ/σ; I/σ_w] の QR から S_N⁻¹ = RᵀR を得て三角行列の代入で解く，
     バイアス–分散の λ 掃引と最小ノルム解は SVD（w = Σ v_i s_i/(s_i²+λ) u_iᵀy）．
   ===================================================================== */
(function (root, factory) {
  'use strict';
  var C = (typeof module === 'object' && module.exports) ? require('./lib/mlcore.js') : root.MLCore;
  var M = factory(C);
  if (typeof module === 'object' && module.exports) module.exports = M;
  if (root) { root.MLModels = root.MLModels || {}; root.MLModels.Regression = M; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (C) {
  'use strict';

  var Y_REF = 88;                     /* 目標値の基準（%）．y − 88 % を回帰する */
  var LIMITS = {
    N: [5, 50], M: [0, 12], lnLambda: [-20, 4], noise: [0, 3], nVal: 200,
    sets: [10, 200], gridBV: 200,
    bayesMaxPts: 100, sigma: [0.05, 5], sigmaW: [0.1, 100], nSamples: [0, 10],
    gaussK: 9, gaussWidth: 0.25, sRange: [-1, 1], sPlotBayes: [-1.4, 1.4],
    svdRelTol: 1e-12                 /* 最小ノルム解で捨てる特異値（最大の 10⁻¹² 倍以下） */
  };

  /* ---------------- データ A「焼成温度と相対密度」（教育用の合成データ） ----------------
     s = (T − 1300 °C)/200 °C ∈ [−1,1]，g(s) = 88 + 8s − 5s² + 2 sin 3s（%），y = g(s) + ε，ε ~ N(0, σ²) */
  function trueA(s) { return 88 + 8 * s - 5 * s * s + 2 * Math.sin(3 * s); }
  function sToT(s) { return 1300 + 200 * s; }
  /* N 点を引く．1 点ずつ (s を一様に → ε を Gauss で) の順に引くので，同じ seed なら
     N を増やしても最初の点は変わらない．戻り値は s の小さい順に並べ替えたもの */
  function makeDataA(rng, N, noise) {
    var pts = [];
    for (var i = 0; i < N; i++) { var s = rng.uniform(-1, 1), e = rng.normal(); pts.push([s, trueA(s) + noise * e, e]); }
    pts.sort(function (a, b) { return a[0] - b[0]; });
    return { s: pts.map(function (p) { return p[0]; }), y: pts.map(function (p) { return p[1]; }), eps: pts.map(function (p) { return p[2]; }) };
  }
  /* 検証データの seed（訓練データと別の乱数列．seed から決まる） */
  function valSeed(seed) { return ((seed >>> 0) + 1000003) >>> 0; }
  function makeValidation(seed, noise, n) { return makeDataA(C.rng(valSeed(seed)), n || LIMITS.nVal, noise); }
  /* バイアス–分散の L 組のデータ集合（1 つの乱数列から順に引く） */
  function makeDatasets(seed, L, N, noise) {
    var r = C.rng(seed), out = [];
    for (var d = 0; d < L; d++) out.push(makeDataA(r, N, noise));
    return out;
  }

  /* ---------------- 基底関数と計画行列 ---------------- */
  function designPoly(s, M) {
    return s.map(function (x) { var r = new Array(M + 1), p = 1; for (var j = 0; j <= M; j++) { r[j] = p; p *= x; } return r; });
  }
  function gaussCenters(K) { K = K || LIMITS.gaussK; var c = []; for (var j = 0; j < K; j++) c.push(K === 1 ? 0 : -1 + 2 * j / (K - 1)); return c; }
  /* Gauss 基底 φ_j(s) = exp(−(s − c_j)²/(2 r²))，c_j は [−1,1] に等間隔，r は幅（既定 0.25 = 中心の間隔） */
  function designGauss(s, centers, r) {
    centers = centers || gaussCenters(); r = r || LIMITS.gaussWidth;
    return s.map(function (x) { return centers.map(function (c) { var d = (x - c) / r; return Math.exp(-0.5 * d * d); }); });
  }
  function basis(kind, M) {
    if (kind === 'gauss') { var cs = gaussCenters(); return { kind: 'gauss', n: cs.length, centers: cs, width: LIMITS.gaussWidth, design: function (s) { return designGauss(s, cs, LIMITS.gaussWidth); } }; }
    return { kind: 'poly', n: M + 1, M: M, design: function (s) { return designPoly(s, M); } };
  }
  function targets(y) { return y.map(function (v) { return v - Y_REF; }); }
  function predict(Phi, w) { return Phi.map(function (r) { var t = 0; for (var j = 0; j < w.length; j++) t += r[j] * w[j]; return t + Y_REF; }); }
  function rmse(a, b) { var t = 0; for (var i = 0; i < a.length; i++) { var d = a[i] - b[i]; t += d * d; } return a.length ? Math.sqrt(t / a.length) : null; }

  /* ---------------- SVD による解（λ の掃引・最小ノルム解・条件数） ----------------
     Φ = U diag(s) Vᵀ．w(λ) = Σ_i v_i · s_i/(s_i² + λ) · (u_iᵀ y)．λ = 0 では s_i ≤ tol·s_max を捨てる（最小ノルム解） */
  function svdFitter(Phi) {
    var D = C.svd(Phi), smax = D.s[0] || 0, tol = smax * LIMITS.svdRelTol;
    var k = D.s.length, n = Phi[0].length, rank = 0;
    for (var i = 0; i < k; i++) if (D.s[i] > tol) rank++;
    return {
      s: D.s, U: D.U, V: D.V, rank: rank, n: n, smax: smax, smin: D.s[k - 1],
      cond: (k === n && D.s[k - 1] > 0) ? smax / D.s[k - 1] : Infinity,
      uty: function (y) { var r = []; for (var i = 0; i < k; i++) { var t = 0; for (var m = 0; m < y.length; m++) t += D.U[m][i] * y[m]; r.push(t); } return r; },
      /* 係数 c_i = s_i/(s_i²+λ)·(u_iᵀy) を V の列に掛ける */
      coef: function (uty, lambda) {
        var c = []; for (var i = 0; i < k; i++) { var si = D.s[i]; c.push((lambda > 0 || si > tol) ? si / (si * si + lambda) * uty[i] : 0); }
        return c;
      },
      solve: function (y, lambda) {
        var c = this.coef(this.uty(y), lambda || 0), w = new Array(n).fill(0);
        for (var j = 0; j < n; j++) { var t = 0; for (var i = 0; i < k; i++) t += D.V[j][i] * c[i]; w[j] = t; }
        return w;
      }
    };
  }

  /* ---------------- ① 多項式回帰と正則化（QR で解く） ----------------
     lambda = 0：min ‖ỹ − Φw‖（QR）．N < d+1 か列が線形従属なら SVD の最小ノルム解（unique=false）．
     lambda > 0：min ½‖ỹ − Φw‖² + (λ/2)‖w‖²（[Φ; √λ I] の QR）．ỹ = y − 88 % */
  function fitPoly(s, y, M, lambda) {
    var Phi = designPoly(s, M), t = targets(y), N = s.length, n = M + 1;
    var out = { M: M, N: N, n: n, lambda: lambda, Phi: Phi, unique: true, method: '', note: '' };
    var sv = svdFitter(Phi);
    out.cond = sv.cond; out.rank = sv.rank; out.smax = sv.smax; out.smin = sv.smin;
    if (lambda > 0) {
      var r = C.ridge(Phi, t, lambda);
      if (!r.x) { out.w = null; out.reason = '[Φ; √λ I] の QR 分解が失敗しました．'; return out; }
      out.w = r.x; out.method = 'ridge-qr';
    } else if (N >= n) {
      var q = C.lstsq(Phi, t);
      if (q.x) { out.w = q.x; out.method = 'lstsq-qr'; }
      else { out.w = sv.solve(t, 0); out.method = 'minnorm-svd'; out.unique = false; out.note = '計画行列 Φ の列が数値的に線形従属なので，最小二乗の解は一つに決まりません．SVD による最小ノルム解を表示しています．'; }
    } else {
      out.w = sv.solve(t, 0); out.method = 'minnorm-svd'; out.unique = false;
      out.note = '係数の数 d + 1 = ' + n + ' がデータ数 N = ' + N + ' より多いので，訓練誤差 0 の解が無数にあり，最小二乗の解は一つに決まりません．SVD による最小ノルム解（‖w‖ が最小のもの）を表示しています．';
    }
    var res = 0, yhat = predict(Phi, out.w);
    for (var i = 0; i < N; i++) { var d = y[i] - yhat[i]; res += d * d; }
    var w2 = 0; out.w.forEach(function (v) { w2 += v * v; });
    out.rss = res; out.normW2 = w2; out.normW = Math.sqrt(w2);
    out.loss = 0.5 * res + 0.5 * (lambda || 0) * w2;
    out.trainRMSE = Math.sqrt(res / N);
    out.maxAbsW = Math.max.apply(null, out.w.map(Math.abs));
    return out;
  }
  function evalPoly(w, s) { return predict(designPoly(s, w.length - 1), w); }
  /* 真の関数との RMSE（s ∈ [−1,1] の中点則 200 点．ノイズを除いた誤差） */
  function midGrid(n) { var g = []; for (var k = 0; k < n; k++) g.push(-1 + (k + 0.5) * 2 / n); return g; }
  function trueRMSE(w) { var g = midGrid(LIMITS.gridBV), f = evalPoly(w, g); return rmse(f, g.map(trueA)); }
  /* 次数 d = 0..Mmax の訓練 RMSE・検証 RMSE（同じ λ） */
  function rmseCurve(train, val, lambda, Mmax) {
    var out = [];
    for (var M = 0; M <= Mmax; M++) {
      var f = fitPoly(train.s, train.y, M, lambda);
      out.push({ M: M, train: f.trainRMSE, val: rmse(evalPoly(f.w, val.s), val.y), unique: f.unique });
    }
    return out;
  }

  /* ---------------- ② バイアス–分散分解 ----------------
     g(s) は真の関数，f^(l)(s) は l 組目（l = 1..L）のデータ集合での当てはめ，f̄(s) = (1/L) Σ_l f^(l)(s)
     （画面と本文の表記．組の番号は次数 d と衝突しないよう上付きの (l) にした．2026-11-13）．
     (バイアス)² = ⟨(f̄(s) − g(s))²⟩_s，分散 = ⟨(1/L) Σ_l (f^(l)(s) − f̄(s))²⟩_s，ノイズ = σ²．
     ⟨·⟩_s は s ∈ [−1,1] の一様分布の平均（中点則 200 点）．preds[d][k] は f^(d+1)(grid_k)
     （コードのループ変数 d は 0 始まりの組の番号で，次数ではない） */
  function bvFromPreds(preds, grid) {
    var L = preds.length, K = grid.length, mean = new Array(K).fill(0), d, k;
    for (d = 0; d < L; d++) for (k = 0; k < K; k++) mean[k] += preds[d][k];
    for (k = 0; k < K; k++) mean[k] /= L;
    var b2 = 0, v = 0, mse = 0;
    for (k = 0; k < K; k++) {
      var g = trueA(grid[k]), db = mean[k] - g; b2 += db * db;
      var vk = 0; for (d = 0; d < L; d++) { var e = preds[d][k] - mean[k]; vk += e * e; var e2 = preds[d][k] - g; mse += e2 * e2; }
      v += vk / L;
    }
    return { bias2: b2 / K, variance: v / K, mseTrue: mse / (K * L), mean: mean };
  }
  /* 次数 d（引数 M）を固定して λ を掃引（各データ集合で SVD を 1 回）．lambdas は λ の配列（0 は正則化なし） */
  function bvSweepLambda(datasets, M, lambdas, grid) {
    grid = grid || midGrid(LIMITS.gridBV);
    var Pg = designPoly(grid, M), n = M + 1, L = datasets.length, nl = lambdas.length;
    var preds = lambdas.map(function () { return []; });
    for (var d = 0; d < L; d++) {
      var ds = datasets[d], sv = svdFitter(designPoly(ds.s, M)), uty = sv.uty(targets(ds.y)), k = sv.s.length;
      /* Φ_grid V（grid × k）を先に作る */
      var PV = Pg.map(function (r) { var o = new Array(k); for (var i = 0; i < k; i++) { var t = 0; for (var j = 0; j < n; j++) t += r[j] * sv.V[j][i]; o[i] = t; } return o; });
      for (var a = 0; a < nl; a++) {
        var c = sv.coef(uty, lambdas[a]);
        preds[a].push(PV.map(function (r) { var t = Y_REF; for (var i = 0; i < k; i++) t += r[i] * c[i]; return t; }));
      }
    }
    return lambdas.map(function (lam, a) { var r = bvFromPreds(preds[a], grid); r.lambda = lam; r.M = M; r.preds = preds[a]; return r; });
  }
  /* λ を固定して次数 d（引数 Ms）を掃引 */
  function bvSweepM(datasets, lambda, Ms, grid) {
    grid = grid || midGrid(LIMITS.gridBV);
    return Ms.map(function (M) { var r = bvSweepLambda(datasets, M, [lambda], grid)[0]; return r; });
  }

  /* 時間分割で回すための逐次版．spec = {axis:'lambda', M, values:[λ…]} または {axis:'M', lambda, values:[d…]}（axis の値 'M' は key なので変えない），
     keep：当てはめ曲線を保存する横軸の添字（重ねて描く図に使う）．
     step() で 1 組ずつ処理し（Welford 法で平均と分散を更新），result() で各横軸の値の {bias2, variance, mseTrue, mean} を返す */
  function bvJob(datasets, spec, keep, grid) {
    grid = grid || midGrid(LIMITS.gridBV);
    var K = grid.length, nv = spec.values.length, d = 0, L = datasets.length;
    var mean = [], m2 = [], mse = new Array(nv).fill(0), kept = [], gTrue = grid.map(trueA), a, k;
    for (a = 0; a < nv; a++) { mean.push(new Array(K).fill(0)); m2.push(new Array(K).fill(0)); }
    var PgCache = {};
    function Pg(M) { return PgCache[M] || (PgCache[M] = designPoly(grid, M)); }
    function predsFor(ds) {
      var out = [];
      if (spec.axis === 'lambda') {
        var M = spec.M, n = M + 1, sv = svdFitter(designPoly(ds.s, M)), uty = sv.uty(targets(ds.y)), kk = sv.s.length, P = Pg(M);
        var PV = P.map(function (r) { var o = new Array(kk); for (var i = 0; i < kk; i++) { var t = 0; for (var j = 0; j < n; j++) t += r[j] * sv.V[j][i]; o[i] = t; } return o; });
        for (var b = 0; b < nv; b++) { var c = sv.coef(uty, spec.values[b]); out.push(PV.map(function (r) { var t = Y_REF; for (var i = 0; i < kk; i++) t += r[i] * c[i]; return t; })); }
      } else {
        for (var b2 = 0; b2 < nv; b2++) {
          var M2 = spec.values[b2], sv2 = svdFitter(designPoly(ds.s, M2)), w = sv2.solve(targets(ds.y), spec.lambda);
          out.push(predict(Pg(M2), w));
        }
      }
      return out;
    }
    return {
      total: L,
      done: function () { return d >= L; },
      count: function () { return d; },
      step: function () {
        if (d >= L) return false;
        var P = predsFor(datasets[d]); d++;
        for (a = 0; a < nv; a++) {
          var pa = P[a], mu = mean[a], s2 = m2[a], acc = 0;
          for (k = 0; k < K; k++) { var x = pa[k], dl = x - mu[k]; mu[k] += dl / d; s2[k] += dl * (x - mu[k]); var e = x - gTrue[k]; acc += e * e; }
          mse[a] += acc / K;
        }
        if (keep != null) kept.push(P[keep]);
        return d < L;
      },
      result: function () {
        var n = Math.max(d, 1);
        return spec.values.map(function (v, a2) {
          var b2s = 0, vs = 0; for (var kk = 0; kk < K; kk++) { var db = mean[a2][kk] - gTrue[kk]; b2s += db * db; vs += m2[a2][kk] / n; }
          return { value: v, bias2: b2s / K, variance: vs / K, mseTrue: mse[a2] / n, mean: mean[a2].slice(), sets: d };
        });
      },
      kept: kept, grid: grid
    };
  }

  /* ---------------- ③ ベイズ線形回帰 ----------------
     B = [Φ/σ; I/σ_w] の QR：B = QR なら S_N⁻¹ = BᵀB = RᵀR．m_N = argmin ‖B w − [ỹ/σ; 0]‖（= σ⁻² S_N Φᵀ ỹ）．
     φᵀ S_N φ = ‖R⁻ᵀ φ‖²．事後の標本 w = m_N + R⁻¹ z（z ~ N(0, I)）の共分散は R⁻¹R⁻ᵀ = S_N． */
  function bayesPosterior(Phi, y, sigma, sigmaW, n) {
    var N = Phi.length, B = [], rhs = [], i, j;
    for (i = 0; i < N; i++) { B.push(Phi[i].map(function (v) { return v / sigma; })); rhs.push((y[i] - Y_REF) / sigma); }
    for (j = 0; j < n; j++) { var row = new Array(n).fill(0); row[j] = 1 / sigmaW; B.push(row); rhs.push(0); }
    var Q = C.qr(B), R = Q.R, z = C.matTvec(Q.Q, rhs);
    for (i = 0; i < n; i++) if (!(Math.abs(R[i][i]) > 0) || !isFinite(R[i][i])) return { ok: false, reason: 'S_N⁻¹ の分解に失敗しました（σ_w が大きすぎるか σ が小さすぎます）．' };
    var mN = C.solveUpper(R, z);
    var Lt = C.transpose(R);   /* 下三角．Lt Ltᵀ = RᵀR = S_N⁻¹ */
    return { ok: true, mN: mN, R: R, Lt: Lt, n: n, N: N, sigma: sigma, sigmaW: sigmaW, lambdaEq: sigma * sigma / (sigmaW * sigmaW) };
  }
  /* 予測：平均 m_Nᵀφ + 88 %，知識不足の分散 φᵀS_Nφ，観測値の分散 σ² + φᵀS_Nφ */
  function bayesPredict(post, phi) {
    var v = C.solveLower(post.Lt, phi), q = C.dot(v, v), m = C.dot(post.mN, phi) + Y_REF;
    var cv = C.clipVar(q);
    return { mean: m, varW: cv.value, clipped: cv.clipped, varY: post.sigma * post.sigma + cv.value };
  }
  function bayesPredictMany(post, Phi) { return Phi.map(function (phi) { return bayesPredict(post, phi); }); }
  /* 事後分布からの標本：Z は z ベクトルの配列（呼び出し側で rng から作り，固定しておく） */
  function bayesSamples(post, Z) { return Z.map(function (z) { var u = C.solveUpper(post.R, z); return post.mN.map(function (m, j) { return m + u[j]; }); }); }
  function stdNormals(rng, k, n) { var Z = []; for (var a = 0; a < k; a++) { var z = []; for (var j = 0; j < n; j++) z.push(rng.normal()); Z.push(z); } return Z; }
  /* 対応する Ridge（λ = σ²/σ_w²）の解（MAP = Ridge の確認用） */
  function ridgeEquivalent(Phi, y, sigma, sigmaW) { var r = C.ridge(Phi, targets(y), sigma * sigma / (sigmaW * sigmaW)); return r.x; }

  return {
    Y_REF: Y_REF, LIMITS: LIMITS,
    trueA: trueA, sToT: sToT, makeDataA: makeDataA, valSeed: valSeed, makeValidation: makeValidation, makeDatasets: makeDatasets,
    designPoly: designPoly, designGauss: designGauss, gaussCenters: gaussCenters, basis: basis, targets: targets, predict: predict, rmse: rmse,
    svdFitter: svdFitter, fitPoly: fitPoly, evalPoly: evalPoly, midGrid: midGrid, trueRMSE: trueRMSE, rmseCurve: rmseCurve,
    bvFromPreds: bvFromPreds, bvSweepLambda: bvSweepLambda, bvSweepM: bvSweepM, bvJob: bvJob,
    bayesPosterior: bayesPosterior, bayesPredict: bayesPredict, bayesPredictMany: bayesPredictMany, bayesSamples: bayesSamples,
    stdNormals: stdNormals, ridgeEquivalent: ridgeEquivalent
  };
});
