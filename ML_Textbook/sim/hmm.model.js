/* =====================================================================
   hmm.model.js — S09 系列モデル（隠れ Markov モデル・Kalman フィルター）の計算
   （DOM に触れない純粋な関数）
   ブラウザ：window.MLModels.Hmm（先に lib/mlcore.js を読む）
   Node   ：require('./hmm.model.js')（試験 W/tests/hmm.test.mjs から）
   記号は本文（第22章）と SPEC_CONTENT §3.5 に合わせる．
   ・状態は j = 1（正常），2（劣化）．配列の添字は 0 始まり（0 = 正常，1 = 劣化）．
   ・初期分布 π_i = p(z_1 = i)，遷移行列 A_ij = p(z_t = j | z_{t−1} = i)（i から j へ．各行の和が 1）．
   ・出力確率 B_jv = p(x_t = v | z_t = j)．離散の観測は v = 1（低），2（中），3（高）＝ 添字 0, 1, 2．
     Gauss 型の観測は p(x_t | z_t = j) = N(x_t | μ_j, σ²)．どちらも「対数の出力確率の表」logE[t][j] に直して扱う．
   ・forward α_t(j) = p(x_{1:t}, z_t = j)，backward β_t(j) = p(x_{t+1:T} | z_t = j)，
     γ_t(j) = p(z_t = j | x_{1:T})，フィルタリング p(z_t = j | x_{1:t})，Viterbi ω_t(j) = max_{z_{1:t−1}} p(x_{1:t}, z_{1:t−1}, z_t = j)（計算は対数 ln ω_t(j) で行い logOmega に入れる）．
   ・forward–backward は「スケーリング版」と「対数版」の両方を持つ（試験で一致を確かめる）．
   ・Kalman フィルター（1 次元のランダムウォーク＋観測ノイズ）：過程ノイズの分散 q，観測ノイズの分散 r，
     予測 μ_{t|t−1}, P_{t|t−1}，Kalman ゲイン K_t，更新後 μ_t, P_t（q, r, K_t, P_t は SPEC_CONTENT に定めの無い記号）．
   ・乱数は引数で受け取った MLCore.rng だけを使う．逆行列は作らない．
   ===================================================================== */
(function (root, factory) {
  'use strict';
  var C = (typeof module === 'object' && module.exports) ? require('./lib/mlcore.js') : root.MLCore;
  var M = factory(C);
  if (typeof module === 'object' && module.exports) module.exports = M;
  if (root) { root.MLModels = root.MLModels || {}; root.MLModels.Hmm = M; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (C) {
  'use strict';

  var LIMITS = { Tmax: 200, Tmin: 10, Tenum: 8, KalmanTmax: 200, KalmanTmin: 10 };
  var STATES = ['正常', '劣化'];
  var SYMBOLS = ['低', '中', '高'];
  var LN2PI = Math.log(2 * Math.PI);

  /* ---------------- パラメーターの組み立て ---------------- */
  /* 遷移行列：A_11 = 正常にとどまる確率，A_22 = 劣化にとどまる確率 */
  function makeA(a11, a22) { return [[a11, 1 - a11], [1 - a22, a22]]; }
  /* 離散 3 値の出力確率（離れ具合 s ∈ [0,1]）：
     B_1 = ((1+s)/3, 1/3, (1−s)/3)（正常は「低」が出やすい），B_2 = ((1−s)/3, 1/3, (1+s)/3)（劣化は「高」が出やすい） */
  function discreteB(s) { return [[(1 + s) / 3, 1 / 3, (1 - s) / 3], [(1 - s) / 3, 1 / 3, (1 + s) / 3]]; }
  /* Gauss 型：正常の平均 0，劣化の平均 Δ，標準偏差 σ（共通） */
  function gaussMeans(delta) { return [0, delta]; }

  function lnSafe(p) { return p > 0 ? Math.log(p) : -Infinity; }
  /* 対数の出力確率の表 logE[t][j] = ln p(x_t | z_t = j) */
  function logEmissionDiscrete(B, x) {
    return x.map(function (v) { return B.map(function (row) { return lnSafe(row[v]); }); });
  }
  function logEmissionGauss(mu, sigma, x) {
    return x.map(function (v) { return mu.map(function (m) { var d = (v - m) / sigma; return -0.5 * d * d - Math.log(sigma) - 0.5 * LN2PI; }); });
  }

  /* ---------------- 検査 ---------------- */
  function checkParams(pi, A) {
    var K = pi.length, s = 0, i, j;
    for (i = 0; i < K; i++) { if (!(pi[i] >= 0 && pi[i] <= 1)) return '初期分布 π に 0〜1 の外の値があります．'; s += pi[i]; }
    if (Math.abs(s - 1) > 1e-9) return '初期分布 π の和が 1 ではありません．';
    for (i = 0; i < K; i++) {
      var r = 0;
      for (j = 0; j < K; j++) { if (!(A[i][j] >= 0 && A[i][j] <= 1)) return '遷移行列 A に 0〜1 の外の値があります．'; r += A[i][j]; }
      if (Math.abs(r - 1) > 1e-9) return '遷移行列 A の第 ' + (i + 1) + ' 行の和が 1 ではありません．';
    }
    return null;
  }

  /* ---------------- スケーリング版 forward–backward ----------------
     各時刻で出力確率を e_t(j) = exp(logE[t][j] − m_t)（m_t = max_j logE[t][j]）にしてから
       ã_t(j) = e_t(j) Σ_i α̂_{t−1}(i) A_ij（t = 1 では π_j e_1(j)），c_t = Σ_j ã_t(j)，α̂_t(j) = ã_t(j) / c_t
     とする．α̂_t(j) = p(z_t = j | x_{1:t})（フィルタリング），ln p(x_{1:T}) = Σ_t (ln c_t + m_t)．
     backward：β̂_T(i) = 1，β̂_t(i) = Σ_j A_ij e_{t+1}(j) β̂_{t+1}(j) / c_{t+1}．γ_t(j) = α̂_t(j) β̂_t(j)． */
  function forwardScaled(pi, A, logE) {
    var T = logE.length, K = pi.length, alphaHat = [], c = [], m = [], pred = [], logLik = 0;
    for (var t = 0; t < T; t++) {
      var mt = -Infinity, j, i;
      for (j = 0; j < K; j++) if (logE[t][j] > mt) mt = logE[t][j];
      if (mt === -Infinity) return { error: '時刻 ' + (t + 1) + ' の観測は，どの状態からも出ない（確率 0）値です．', t: t + 1 };
      var pr = new Array(K), a = new Array(K), s = 0;
      for (j = 0; j < K; j++) {
        if (t === 0) pr[j] = pi[j];
        else { var acc = 0; for (i = 0; i < K; i++) acc += alphaHat[t - 1][i] * A[i][j]; pr[j] = acc; }
        a[j] = Math.exp(logE[t][j] - mt) * pr[j]; s += a[j];
      }
      if (!(s > 0)) return { error: '時刻 ' + (t + 1) + ' までの観測列の確率が 0 になりました（遷移の確率 0 と出力の確率 0 が重なっています）．', t: t + 1 };
      for (j = 0; j < K; j++) a[j] /= s;
      alphaHat.push(a); c.push(s); m.push(mt); pred.push(pr);
      logLik += Math.log(s) + mt;
    }
    return { alphaHat: alphaHat, filter: alphaHat, pred: pred, c: c, m: m, logLik: logLik };
  }
  function backwardScaled(A, logE, c, m) {
    var T = logE.length, K = A.length, betaHat = new Array(T), t, i, j;
    betaHat[T - 1] = []; for (i = 0; i < K; i++) betaHat[T - 1].push(1);
    for (t = T - 2; t >= 0; t--) {
      var b = new Array(K);
      for (i = 0; i < K; i++) {
        var acc = 0;
        for (j = 0; j < K; j++) acc += A[i][j] * Math.exp(logE[t + 1][j] - m[t + 1]) * betaHat[t + 1][j];
        b[i] = acc / c[t + 1];
      }
      betaHat[t] = b;
    }
    return betaHat;
  }
  function forwardBackwardScaled(pi, A, logE) {
    var f = forwardScaled(pi, A, logE);
    if (f.error) return f;
    var bh = backwardScaled(A, logE, f.c, f.m);
    var gamma = f.alphaHat.map(function (a, t) {
      var g = a.map(function (v, j) { return v * bh[t][j]; }), s = g.reduce(function (p, q) { return p + q; }, 0);
      return g.map(function (v) { return v / s; });   /* 理論上 s = 1．丸めの分だけ正規化 */
    });
    return { alphaHat: f.alphaHat, betaHat: bh, filter: f.filter, pred: f.pred, c: f.c, m: f.m, gamma: gamma, logLik: f.logLik };
  }

  /* ---------------- 対数版 forward–backward ----------------
     ln α_1(j) = ln π_j + logE[0][j]，ln α_t(j) = logE[t][j] + LSE_i(ln α_{t−1}(i) + ln A_ij)，
     ln β_T(i) = 0，ln β_t(i) = LSE_j(ln A_ij + logE[t+1][j] + ln β_{t+1}(j))，
     ln p(x_{1:T}) = LSE_j ln α_T(j)，γ_t(j) = exp(ln α_t(j) + ln β_t(j) − ln p(x_{1:T}))． */
  function forwardBackwardLog(pi, A, logE) {
    var T = logE.length, K = pi.length, lA = A.map(function (r) { return r.map(lnSafe); });
    var la = [], lb = new Array(T), t, i, j, tmp = new Array(K);
    for (t = 0; t < T; t++) {
      var row = new Array(K);
      for (j = 0; j < K; j++) {
        if (t === 0) row[j] = lnSafe(pi[j]) + logE[0][j];
        else { for (i = 0; i < K; i++) tmp[i] = la[t - 1][i] + lA[i][j]; row[j] = logE[t][j] + C.logsumexp(tmp); }
      }
      la.push(row);
    }
    var logLik = C.logsumexp(la[T - 1]);
    if (logLik === -Infinity) return { error: '観測列の確率が 0 です．', logAlpha: la };
    lb[T - 1] = []; for (i = 0; i < K; i++) lb[T - 1].push(0);
    for (t = T - 2; t >= 0; t--) {
      var b = new Array(K);
      for (i = 0; i < K; i++) { for (j = 0; j < K; j++) tmp[j] = lA[i][j] + logE[t + 1][j] + lb[t + 1][j]; b[i] = C.logsumexp(tmp); }
      lb[t] = b;
    }
    var gamma = la.map(function (a, t) { return a.map(function (v, j) { return Math.exp(v + lb[t][j] - logLik); }); });
    var filter = la.map(function (a) { var z = C.logsumexp(a); return a.map(function (v) { return Math.exp(v - z); }); });
    return { logAlpha: la, logBeta: lb, gamma: gamma, filter: filter, logLik: logLik };
  }

  /* ---------------- 規格化しない forward–backward（手計算モード用．T が小さいときだけ） ---------------- */
  function forwardBackwardRaw(pi, A, logE) {
    var T = logE.length, K = pi.length, E = logE.map(function (r) { return r.map(Math.exp); });
    var alpha = [], beta = new Array(T), t, i, j;
    for (t = 0; t < T; t++) {
      var a = new Array(K);
      for (j = 0; j < K; j++) {
        if (t === 0) a[j] = pi[j] * E[0][j];
        else { var acc = 0; for (i = 0; i < K; i++) acc += alpha[t - 1][i] * A[i][j]; a[j] = E[t][j] * acc; }
      }
      alpha.push(a);
    }
    beta[T - 1] = []; for (i = 0; i < K; i++) beta[T - 1].push(1);
    for (t = T - 2; t >= 0; t--) {
      var b = new Array(K);
      for (i = 0; i < K; i++) { var s = 0; for (j = 0; j < K; j++) s += A[i][j] * E[t + 1][j] * beta[t + 1][j]; b[i] = s; }
      beta[t] = b;
    }
    var lik = alpha[T - 1].reduce(function (p, q) { return p + q; }, 0);
    var gamma = alpha.map(function (a, t) { return a.map(function (v, j) { return lik > 0 ? v * beta[t][j] / lik : NaN; }); });
    var filter = alpha.map(function (a) { var s = a[0] + a[1]; return a.map(function (v) { return s > 0 ? v / s : NaN; }); });
    /* 各時刻の確かめ：Σ_j α_t(j) β_t(j) = p(x_{1:T}) */
    var sumAB = alpha.map(function (a, t) { var s = 0; for (var j = 0; j < K; j++) s += a[j] * beta[t][j]; return s; });
    return { alpha: alpha, beta: beta, gamma: gamma, filter: filter, lik: lik, E: E, sumAB: sumAB };
  }

  /* ---------------- Viterbi 法（対数） ----------------
     ω_1(j) = ln π_j + ln p(x_1|j)，ω_t(j) = ln p(x_t|j) + max_i [ω_{t−1}(i) + ln A_ij]，ψ_t(j) = argmax_i（同点は番号の小さい状態）．
     最後に argmax_j ω_T(j) から ψ をたどる． */
  function viterbi(pi, A, logE) {
    var T = logE.length, K = pi.length, lA = A.map(function (r) { return r.map(lnSafe); });
    var om = [], psi = [], t, i, j;
    for (t = 0; t < T; t++) {
      var row = new Array(K), ptr = new Array(K);
      for (j = 0; j < K; j++) {
        if (t === 0) { row[j] = lnSafe(pi[j]) + logE[0][j]; ptr[j] = -1; }
        else {
          var best = -Infinity, bi = 0;
          for (i = 0; i < K; i++) { var v = om[t - 1][i] + lA[i][j]; if (v > best) { best = v; bi = i; } }
          row[j] = logE[t][j] + best; ptr[j] = bi;
        }
      }
      om.push(row); psi.push(ptr);
    }
    var last = 0; for (j = 1; j < K; j++) if (om[T - 1][j] > om[T - 1][last]) last = j;
    var path = new Array(T); path[T - 1] = last;
    for (t = T - 1; t > 0; t--) path[t - 1] = psi[t][path[t]];
    return { logOmega: om, psi: psi, path: path, logPmax: om[T - 1][last] };
  }

  /* ---------------- 全列挙（T ≤ LIMITS.Tenum） ----------------
     K^T 通りの状態列 z について ln p(x, z) = ln π_{z_1} + Σ_t ln p(x_t|z_t) + Σ_{t≥2} ln A_{z_{t−1} z_t}． */
  function logJoint(pi, A, logE, z) {
    var s = lnSafe(pi[z[0]]) + logE[0][z[0]];
    for (var t = 1; t < z.length; t++) s += lnSafe(A[z[t - 1]][z[t]]) + logE[t][z[t]];
    return s;
  }
  function enumerate(pi, A, logE) {
    var T = logE.length, K = pi.length;
    if (T > LIMITS.Tenum) return { error: '全列挙は T ≤ ' + LIMITS.Tenum + ' に限ります（' + K + '^T 通り）．' };
    var n = Math.pow(K, T), rows = [], lps = [], k, t;
    for (k = 0; k < n; k++) {
      var z = new Array(T), r = k;
      for (t = T - 1; t >= 0; t--) { z[t] = r % K; r = Math.floor(r / K); }
      var lp = logJoint(pi, A, logE, z);
      rows.push({ z: z, logp: lp, p: Math.exp(lp) }); lps.push(lp);
    }
    var logLik = C.logsumexp(lps);
    var gamma = [], best = 0;
    for (t = 0; t < T; t++) { var g = []; for (var j = 0; j < K; j++) g.push(0); gamma.push(g); }
    rows.forEach(function (rw, idx) {
      rw.post = Math.exp(rw.logp - logLik);
      for (var t2 = 0; t2 < T; t2++) gamma[t2][rw.z[t2]] += rw.post;
      if (rw.logp > rows[best].logp) best = idx;
    });
    return { rows: rows, logLik: logLik, lik: Math.exp(logLik), gamma: gamma, best: rows[best].z, bestLogp: rows[best].logp };
  }

  /* ---------------- 合成データ（教育用の合成データ） ----------------
     z_1 ~ π，z_t | z_{t−1} = i ~ A_i·，離散：x_t | z_t = j ~ B_j·，Gauss：x_t = μ_{z_t} + σ ε_t，ε_t ~ N(0,1)．
     乱数を使う順：各時刻で 状態 → 観測．単位：離散は記号（低・中・高），Gauss 型は無次元のセンサー値
     （正常時の平均を 0，ばらつきの標準偏差を 1 にとった値）． */
  function sampleHMM(rng, pi, A, T, obs) {
    var z = [], x = [];
    for (var t = 0; t < T; t++) {
      var s = t === 0 ? rng.categorical(pi) : rng.categorical(A[z[t - 1]]);
      z.push(s);
      if (obs.type === 'discrete') x.push(rng.categorical(obs.B[s]));
      else x.push(obs.mu[s] + obs.sigma * rng.normal());
    }
    return { z: z, x: x };
  }

  function argmaxRows(P) { return P.map(function (p) { var b = 0; for (var j = 1; j < p.length; j++) if (p[j] > p[b]) b = j; return b; }); }
  function accuracy(z, zh) { if (!z.length) return null; var k = 0; for (var t = 0; t < z.length; t++) if (z[t] === zh[t]) k++; return k / z.length; }
  function maxAbsDiff2(P, Q) { var d = 0; for (var t = 0; t < P.length; t++) for (var j = 0; j < P[t].length; j++) d = Math.max(d, Math.abs(P[t][j] - Q[t][j])); return d; }

  /* 画面の①（生成した系列）の計算をまとめて行う */
  function analyze(pi, A, logE, zTrue) {
    var err = checkParams(pi, A);
    if (err) return { error: err };
    var sc = forwardBackwardScaled(pi, A, logE);
    if (sc.error) return { error: sc.error };
    var lg = forwardBackwardLog(pi, A, logE);
    if (lg.error) return { error: lg.error };
    var vt = viterbi(pi, A, logE);
    var zF = argmaxRows(sc.filter), zS = argmaxRows(sc.gamma);
    var out = {
      scaled: sc, log: lg, viterbi: vt, zFilter: zF, zSmooth: zS,
      logLik: sc.logLik, logLikLog: lg.logLik, diffLogLik: Math.abs(sc.logLik - lg.logLik),
      diffGamma: maxAbsDiff2(sc.gamma, lg.gamma), diffFilter: maxAbsDiff2(sc.filter, lg.filter)
    };
    if (zTrue) {
      out.accFilter = accuracy(zTrue, zF); out.accSmooth = accuracy(zTrue, zS); out.accViterbi = accuracy(zTrue, vt.path);
      out.logJointTrue = logJoint(pi, A, logE, zTrue);
    }
    out.logJointViterbi = vt.logPmax;
    out.logJointSmoothSeq = logJoint(pi, A, logE, zS);
    return out;
  }

  /* 手計算モード（K = 2，T = 3）．値は小数 1 桁の手計算しやすいもの */
  var HAND_PRESETS = {
    base: { pi1: 0.6, a11: 0.7, a22: 0.6, B: [[0.5, 0.4, 0.1], [0.1, 0.3, 0.6]], x: [0, 1, 2],
      label: '既定（低・中・高）' },
    mismatch: { pi1: 0.6, a11: 0.7, a22: 0.6, B: [[0.5, 0.4, 0.1], [0.1, 0.3, 0.6]], x: [0, 2, 1],
      label: '食い違う例（低・高・中）' }
  };
  function handAll(pi, A, B, x) {
    var err = checkParams(pi, A);
    if (err) return { error: err };
    for (var j = 0; j < B.length; j++) { var s = B[j][0] + B[j][1] + B[j][2]; if (Math.abs(s - 1) > 1e-9 || B[j].some(function (v) { return v < -1e-12; })) return { error: '出力確率 B の第 ' + (j + 1) + ' 行の和が 1 ではないか，負の値があります．' }; }
    var logE = logEmissionDiscrete(B, x);
    var raw = forwardBackwardRaw(pi, A, logE), en = enumerate(pi, A, logE), vt = viterbi(pi, A, logE);
    if (!(raw.lik > 0)) return { error: 'この観測列の確率は 0 です（出力の確率 0 と遷移の確率 0 が重なっています）．', raw: raw, enumr: en };
    var zG = argmaxRows(raw.gamma);
    return { raw: raw, enumr: en, viterbi: vt, zGamma: zG, logE: logE,
      pGammaSeq: Math.exp(logJoint(pi, A, logE, zG)), pViterbi: Math.exp(vt.logPmax),
      agree: zG.every(function (v, t) { return v === vt.path[t]; }) };
  }

  /* ---------------- Kalman フィルター（1 次元） ----------------
     状態 z_t = z_{t−1} + w_t，w_t ~ N(0, q)．観測 x_t = z_t + v_t，v_t ~ N(0, r)．z_1 ~ N(μ_0, P_0)．
     予測：t = 1 では μ_{1|0} = μ_0，P_{1|0} = P_0．t ≥ 2 では μ_{t|t−1} = μ_{t−1}，P_{t|t−1} = P_{t−1} + q．
     更新：K_t = P_{t|t−1} / (P_{t|t−1} + r)，μ_t = μ_{t|t−1} + K_t (x_t − μ_{t|t−1})，P_t = (1 − K_t) P_{t|t−1}
     （計算は P_t = P_{t|t−1} r / (P_{t|t−1} + r)．引き算をしないので負にならない）．
     観測が欠けた時刻（x_t = null）は更新しない：μ_t = μ_{t|t−1}，P_t = P_{t|t−1}（K_t = 0 として扱う）． */
  function kalman(x, q, r, mu0, P0) {
    if (!(q >= 0) || !(r > 0) || !(P0 >= 0)) return { error: '分散 q ≥ 0，r > 0，P_0 ≥ 0 が必要です．' };
    var T = x.length, mP = [], PP = [], K = [], mu = [], P = [], S = [], innov = [], logLik = 0, nObs = 0;
    for (var t = 0; t < T; t++) {
      var mp = t === 0 ? mu0 : mu[t - 1], pp = t === 0 ? P0 : P[t - 1] + q;
      mP.push(mp); PP.push(pp);
      if (x[t] === null || x[t] === undefined) { K.push(0); mu.push(mp); P.push(pp); S.push(null); innov.push(null); continue; }
      var s = pp + r, k = pp / s, e = x[t] - mp;
      K.push(k); mu.push(mp + k * e); P.push(pp * r / s); S.push(s); innov.push(e);
      logLik += -0.5 * (LN2PI + Math.log(s) + e * e / s); nObs++;
      if (!isFinite(mu[t]) || !isFinite(P[t])) return { error: '時刻 ' + (t + 1) + ' で NaN または無限大が出ました．' };
    }
    return { muPred: mP, PPred: PP, K: K, mu: mu, P: P, S: S, innov: innov, logLik: logLik, nObs: nObs };
  }
  /* 定常値：P_∞⁻ = (q + √(q² + 4qr))/2（予測の分散），K_∞ = P_∞⁻/(P_∞⁻ + r)，P_∞ = K_∞ r */
  function kalmanSteady(q, r) {
    var pp = (q + Math.sqrt(q * q + 4 * q * r)) / 2, k = pp / (pp + r);
    return { PPred: pp, K: k, P: k * r };
  }
  /* 合成データ：z_1 = μ_0 + √P_0 ε，z_t = z_{t−1} + √q ε，x_t = z_t + √r η（各時刻で ε → η の順に引く） */
  function sampleRW(rng, T, q, r, mu0, P0) {
    var z = [], x = [];
    for (var t = 0; t < T; t++) {
      var zt = t === 0 ? mu0 + Math.sqrt(P0) * rng.normal() : z[t - 1] + Math.sqrt(q) * rng.normal();
      z.push(zt); x.push(zt + Math.sqrt(r) * rng.normal());
    }
    return { z: z, x: x };
  }
  /* 観測の欠け：t（1 始まり）が (0.3T, 0.45T] と (0.7T, 0.8T] にあるとき欠ける */
  function missingMask(T) {
    var a0 = Math.floor(0.3 * T), a1 = Math.floor(0.45 * T), b0 = Math.floor(0.7 * T), b1 = Math.floor(0.8 * T), m = [];
    for (var t = 1; t <= T; t++) m.push((t > a0 && t <= a1) || (t > b0 && t <= b1));
    return m;
  }
  function applyMask(x, mask) { return x.map(function (v, i) { return mask[i] ? null : v; }); }
  function kalmanSummary(z, x, kf) {
    var se = 0, so = 0, n = 0, no = 0, cov = 0;
    for (var t = 0; t < z.length; t++) {
      var d = kf.mu[t] - z[t]; se += d * d; n++;
      if (Math.abs(d) <= 2 * Math.sqrt(kf.P[t])) cov++;
      if (x[t] !== null && x[t] !== undefined) { var e = x[t] - z[t]; so += e * e; no++; }
    }
    return { rmseEst: Math.sqrt(se / n), rmseObs: no ? Math.sqrt(so / no) : null, coverage: cov / n, nObs: no };
  }

  return {
    LIMITS: LIMITS, STATES: STATES, SYMBOLS: SYMBOLS,
    makeA: makeA, discreteB: discreteB, gaussMeans: gaussMeans,
    logEmissionDiscrete: logEmissionDiscrete, logEmissionGauss: logEmissionGauss, checkParams: checkParams,
    forwardScaled: forwardScaled, backwardScaled: backwardScaled, forwardBackwardScaled: forwardBackwardScaled,
    forwardBackwardLog: forwardBackwardLog, forwardBackwardRaw: forwardBackwardRaw,
    viterbi: viterbi, logJoint: logJoint, enumerate: enumerate,
    sampleHMM: sampleHMM, argmaxRows: argmaxRows, accuracy: accuracy, analyze: analyze,
    HAND_PRESETS: HAND_PRESETS, handAll: handAll,
    kalman: kalman, kalmanSteady: kalmanSteady, sampleRW: sampleRW, missingMask: missingMask, applyMask: applyMask, kalmanSummary: kalmanSummary
  };
});
