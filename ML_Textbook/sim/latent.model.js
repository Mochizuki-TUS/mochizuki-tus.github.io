/* =====================================================================
   latent.model.js — S07 潜在変数（k-means・EM 法・PCA）の計算（DOM に触れない純粋な関数）
   ブラウザ：window.MLModels.Latent（先に lib/mlcore.js を読む）
   Node   ：require('./latent.model.js')（試験 W/tests/latent.test.mjs から）
   記号は本文（第17・18章）と SPEC_CONTENT §3 に合わせる：
     k-means：J = Σ_n Σ_k r_nk ‖x_n − μ_k‖²
     Gauss 混合：p(x) = Σ_k π_k N(x | μ_k, Σ_k)，負担率 γ_nk，N_k = Σ_n γ_nk
       μ_k = (1/N_k) Σ_n γ_nk x_n，Σ_k = (1/N_k) Σ_n γ_nk (x_n − μ_k)(x_n − μ_k)ᵀ，π_k = N_k / N
     PCA：分散は 1/N で定義．中心化したデータ行列 X = U S_sv Vᵀ，λ_i = s_i² / N
   ・乱数は引数で受け取った MLCore.rng だけを使う（Math.random 禁止）．
   ・逆行列を作らない（2×2 の Cholesky 分解で Mahalanobis 距離と ln|Σ| を求める）．
   ・負担率と対数尤度は log-sum-exp で計算する．
   ===================================================================== */
(function (root, factory) {
  'use strict';
  var C = (typeof module === 'object' && module.exports) ? require('./lib/mlcore.js') : root.MLCore;
  var M = factory(C);
  if (typeof module === 'object' && module.exports) module.exports = M;
  if (root) { root.MLModels = root.MLModels || {}; root.MLModels.Latent = M; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (C) {
  'use strict';

  var LIMITS = {
    N: [10, 300], K: [1, 6], maxIter: 1000,
    varFloor: [1e-4, 1],          /* 分散の下限（共分散行列の固有値の下限）の範囲 */
    collapseVar: 1e-10,           /* 下限なしのとき，これ未満の分散で「退化」として止める */
    tolRel: 1e-10,                /* EM の収束：対数尤度の増分 ≤ tolRel·(|ln p|+1) */
    pcaN: [2, 300], specN: 60, specD: 200, specNoise: [0, 0.1], kRecon: [0, 10]
  };
  var LN2PI = Math.log(2 * Math.PI);

  /* =================================================================
     1. 2 次元の合成データ（教育用．無次元の 2 つの特徴量）
     各成分：x = m + R(θ)·(s1·z1, s2·z2)ᵀ，z ~ N(0, I)．θ は主軸の向き（度）
     ================================================================= */
  var PRESETS = {
    separated: {
      label: '分離', K: 3,
      comps: [{ w: 1 / 3, m: [-2.0, -1.2], s: [0.55, 0.55], th: 0 }, { w: 1 / 3, m: [2.0, -1.0], s: [0.55, 0.55], th: 0 }, { w: 1 / 3, m: [0.0, 2.0], s: [0.55, 0.55], th: 0 }],
      anchors: [[-2.0, -1.2], [0.0, -1.1], [0.0, 2.0]]
    },
    overlap: {
      label: '重なり', K: 2,
      comps: [{ w: 0.55, m: [-1.0, -0.4], s: [0.9, 0.6], th: 20 }, { w: 0.45, m: [1.2, 0.6], s: [0.7, 0.7], th: 0 }],
      anchors: [[-1.0, -0.4], [0.1, 0.1], [1.2, 0.6]]
    },
    elongated: {
      label: '細長い', K: 2,
      comps: [{ w: 0.5, m: [-0.7, 0.7], s: [1.7, 0.22], th: 45 }, { w: 0.5, m: [0.7, -0.7], s: [1.7, 0.22], th: 45 }],
      anchors: [[-0.7, 0.7], [0.0, 0.0], [0.7, -0.7]]
    },
    sizes: {
      label: '大きさが違う', K: 2,
      comps: [{ w: 0.8, m: [-0.6, 0.0], s: [1.25, 1.25], th: 0 }, { w: 0.2, m: [1.6, 0.4], s: [0.22, 0.22], th: 0 }],
      anchors: [[-0.6, 0.0], [1.0, 0.3], [1.6, 0.4]]
    },
    degenerate: {
      label: '退化の例', K: 2,
      comps: [{ w: 1, m: [0.0, 0.0], s: [0.8, 0.6], th: 30 }],
      outliers: [[3.6, 3.0]],
      anchors: [[0.0, 0.0], [1.2, 0.8], [3.6, 3.0]],
      initOnOutlier: true
    }
  };
  var PRESET_KEYS = ['separated', 'overlap', 'elongated', 'sizes', 'degenerate'];

  function rot(th) { var a = th * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; }
  /* 生成．戻り値 {X（N×2）, label（真の成分の番号．外れ点は −1）, anchors（代表 3 点の添字）, outlierIndex} */
  function makeData(key, rng, N) {
    var P = PRESETS[key]; if (!P) throw new Error('未知のデータ ' + key);
    N = Math.round(C.clamp(N, LIMITS.N[0], LIMITS.N[1]));
    var nOut = P.outliers ? P.outliers.length : 0, nIn = N - nOut;
    var counts = P.comps.map(function (c) { return Math.round(c.w * nIn); });
    var tot = counts.reduce(function (a, b) { return a + b; }, 0); counts[counts.length - 1] += nIn - tot;
    var X = [], label = [];
    P.comps.forEach(function (c, k) {
      var cs = rot(c.th);
      for (var i = 0; i < counts[k]; i++) {
        var z1 = rng.normal() * c.s[0], z2 = rng.normal() * c.s[1];
        X.push([c.m[0] + cs[0] * z1 - cs[1] * z2, c.m[1] + cs[1] * z1 + cs[0] * z2]); label.push(k);
      }
    });
    var outlierIndex = -1;
    if (P.outliers) P.outliers.forEach(function (o) { outlierIndex = X.length; X.push([o[0], o[1]]); label.push(-1); });
    var anchors = P.anchors.map(function (a) {
      var best = 0, bd = Infinity;
      for (var n = 0; n < X.length; n++) { var d = sq(X[n][0] - a[0]) + sq(X[n][1] - a[1]); if (d < bd) { bd = d; best = n; } }
      return best;
    });
    return { key: key, X: X, label: label, anchors: anchors, outlierIndex: outlierIndex, N: X.length };
  }
  function sq(x) { return x * x; }

  /* =================================================================
     2. 2×2 の Gauss 分布の小道具（逆行列を作らない）
     ================================================================= */
  /* Σ = [[a,b],[b,c]] の Cholesky 分解 L = [[l11,0],[l21,l22]]．正定値でなければ null */
  function chol2(S) {
    var a = S[0][0], b = S[0][1], c = S[1][1];
    if (!(a > 0)) return null;
    var l11 = Math.sqrt(a), l21 = b / l11, d = c - l21 * l21;
    if (!(d > 0) || !isFinite(d)) return null;
    return [l11, l21, Math.sqrt(d)];
  }
  /* ln N(x | μ, Σ)（L は chol2 の結果） */
  function logGauss2(x, mu, L) {
    var d0 = x[0] - mu[0], d1 = x[1] - mu[1];
    var y0 = d0 / L[0], y1 = (d1 - L[1] * y0) / L[2];          /* L y = d（前進代入） */
    return -LN2PI - Math.log(L[0]) - Math.log(L[2]) - 0.5 * (y0 * y0 + y1 * y1);
  }
  /* 対称 2×2 の固有値（降順）と第 1 固有ベクトル */
  function eig2(S) {
    var a = S[0][0], b = S[0][1], c = S[1][1];
    var m = 0.5 * (a + c), r = Math.hypot(0.5 * (a - c), b);
    var l1 = m + r, l2 = m - r;
    /* 小さい方は det/l1 で求める（打ち消しを避ける） */
    var det = a * c - b * b; if (l1 > 0) l2 = det / l1;
    var v = (Math.abs(b) > 1e-300 || a !== c) ? (a >= c ? [l1 - c, b] : [b, l1 - a]) : [1, 0];
    var nv = Math.hypot(v[0], v[1]); v = nv > 0 ? [v[0] / nv, v[1] / nv] : [1, 0];
    return { values: [l1, l2], v1: v, v2: [-v[1], v[0]] };
  }
  /* 固有値の下限 c で Σ を直す（同じ固有ベクトルで固有値を max(λ, c) に）．
     平均を固定したときの「固有値 ≥ c」という制約のもとでの最尤解になっている */
  function floorCov(S, c) {
    var e = eig2(S), l1 = Math.max(e.values[0], c), l2 = Math.max(e.values[1], c);
    var v = e.v1, w = e.v2;
    return {
      S: [[l1 * v[0] * v[0] + l2 * w[0] * w[0], l1 * v[0] * v[1] + l2 * w[0] * w[1]], [l1 * v[0] * v[1] + l2 * w[0] * w[1], l1 * v[1] * v[1] + l2 * w[1] * w[1]]],
      active: e.values[1] < c || e.values[0] < c, before: e.values
    };
  }
  /* 楕円 (x−μ)ᵀΣ⁻¹(x−μ) = r² の周の点（n 点） */
  function ellipse(mu, S, r, n) {
    var e = eig2(S), a = Math.sqrt(Math.max(e.values[0], 0)) * r, b = Math.sqrt(Math.max(e.values[1], 0)) * r, out = [];
    n = n || 72;
    for (var i = 0; i <= n; i++) {
      var t = 2 * Math.PI * i / n, ca = a * Math.cos(t), sb = b * Math.sin(t);
      out.push([mu[0] + ca * e.v1[0] + sb * e.v2[0], mu[1] + ca * e.v1[1] + sb * e.v2[1]]);
    }
    return out;
  }

  /* =================================================================
     3. 初期値（k-means と EM で同じ平均から始める）
     ・平均：データ点から K 個を重複なく選ぶ（seed の乱数で並べ替えた先頭 K 個）．
     ・共分散：(tr S_data / 2) I（データ全体の平均的な分散の等方的な行列）．混合係数 1/K．
     ・退化の例では，最後の成分の平均を孤立した点に置く（退化を見せるための意図的な初期値）．
     ================================================================= */
  function initParams(X, K, rng, opt) {
    opt = opt || {};
    var N = X.length; K = Math.max(1, Math.min(K, N));
    var perm = rng.permutation(N), pick = perm.slice(0, K);
    if (opt.outlierIndex != null && opt.outlierIndex >= 0 && K >= 2) {
      pick = perm.filter(function (n) { return n !== opt.outlierIndex; }).slice(0, K - 1);
      pick.push(opt.outlierIndex);
    }
    var cm = C.covMatrix(X, 0), s2 = 0.5 * (cm.S[0][0] + cm.S[1][1]);
    var mu = pick.map(function (n) { return [X[n][0], X[n][1]]; });
    var Sigma = pick.map(function () { return [[s2, 0], [0, s2]]; });
    var pi = pick.map(function () { return 1 / K; });
    return { K: K, mu: mu, Sigma: Sigma, pi: pi, pick: pick, s2: s2 };
  }
  function copyParams(p) {
    return { K: p.K, mu: p.mu.map(function (m) { return m.slice(); }), Sigma: p.Sigma.map(function (S) { return [S[0].slice(), S[1].slice()]; }), pi: p.pi.slice() };
  }

  /* =================================================================
     4. Gauss 混合の EM 法
     ================================================================= */
  /* E ステップ：ln ρ_nk = ln π_k + ln N(x_n|μ_k,Σ_k)，γ_nk = exp(ln ρ_nk − LSE_n)，ln p = Σ_n LSE_n */
  function eStep(X, p) {
    var K = p.K, Ls = [], k, n;
    for (k = 0; k < K; k++) { var L = chol2(p.Sigma[k]); if (!L) return { ok: false, reason: '成分 ' + (k + 1) + ' の共分散行列が正定値ではありません（Cholesky 分解ができません）．', k: k }; Ls.push(L); }
    var gamma = [], logRho = [], lse = [], ll = 0;
    for (n = 0; n < X.length; n++) {
      var r = [];
      for (k = 0; k < K; k++) r.push((p.pi[k] > 0 ? Math.log(p.pi[k]) : -Infinity) + logGauss2(X[n], p.mu[k], Ls[k]));
      var s = C.logsumexp(r);
      if (!isFinite(s)) return { ok: false, reason: '点 ' + (n + 1) + ' の確率が 0 に丸まりました（どの成分からも遠すぎます）．' };
      logRho.push(r); lse.push(s); ll += s;
      gamma.push(r.map(function (v) { return Math.exp(v - s); }));
    }
    return { ok: true, gamma: gamma, logRho: logRho, lse: lse, logLik: ll };
  }
  function logLik(X, p) { var e = eStep(X, p); return e.ok ? e.logLik : null; }

  /* M ステップ．opt: {varFloor（数 or null．null なら下限なし）, prev（N_k ≈ 0 の成分は前の値を残す）}
     戻り値 {ok, params, Nk, floored[k], notes[], degenerate:{k, minVar}|null} */
  function mStep(X, gamma, K, opt) {
    opt = opt || {};
    var N = X.length, k, n, Nk = [], mu = [], Sigma = [], pi = [], floored = [], notes = [], minVar = [], degenerate = null;
    for (k = 0; k < K; k++) {
      var s = 0, sx = 0, sy = 0;
      for (n = 0; n < N; n++) { var g = gamma[n][k]; s += g; sx += g * X[n][0]; sy += g * X[n][1]; }
      Nk.push(s);
      if (!(s > 1e-12)) {           /* どの点も担当していない成分：前の値を残し，π_k = N_k/N */
        notes.push('成分 ' + (k + 1) + ' の N_k が ' + (s === 0 ? '0' : s.toExponential(1)) + ' で，どの点もほとんど担当していません（平均・共分散は前の値のまま）．');
        var pv = opt.prev;
        mu.push(pv ? pv.mu[k].slice() : [0, 0]); Sigma.push(pv ? [pv.Sigma[k][0].slice(), pv.Sigma[k][1].slice()] : [[1, 0], [0, 1]]);
        pi.push(s / N); floored.push(false); minVar.push(pv ? eig2(pv.Sigma[k]).values[1] : 1); continue;
      }
      var m = [sx / s, sy / s];
      var a = 0, b = 0, c = 0;
      for (n = 0; n < N; n++) { var g2 = gamma[n][k], d0 = X[n][0] - m[0], d1 = X[n][1] - m[1]; a += g2 * d0 * d0; b += g2 * d0 * d1; c += g2 * d1 * d1; }
      var S = [[a / s, b / s], [b / s, c / s]], fl = false;
      var ev = eig2(S).values;
      if (opt.varFloor != null && opt.varFloor > 0) { var f = floorCov(S, opt.varFloor); S = f.S; fl = f.active; }
      else if (!(ev[1] >= LIMITS.collapseVar)) { if (!degenerate || ev[1] < degenerate.minVar) degenerate = { k: k, minVar: ev[1], mu: m }; }
      mu.push(m); Sigma.push(S); pi.push(s / N); floored.push(fl); minVar.push(ev[1]);
    }
    return { ok: !degenerate, params: { K: K, mu: mu, Sigma: Sigma, pi: pi }, Nk: Nk, floored: floored, minVarRaw: minVar, notes: notes, degenerate: degenerate };
  }

  /* =================================================================
     5. k-means（E：最も近い平均への割り当て，M：平均の更新）
     ================================================================= */
  function kmeansAssign(X, mu) {
    var r = [], J = 0;
    for (var n = 0; n < X.length; n++) {
      var best = 0, bd = Infinity;
      for (var k = 0; k < mu.length; k++) { var d = sq(X[n][0] - mu[k][0]) + sq(X[n][1] - mu[k][1]); if (d < bd) { bd = d; best = k; } }
      r.push(best); J += bd;
    }
    return { r: r, J: J };
  }
  function kmeansJ(X, mu, r) { var J = 0; for (var n = 0; n < X.length; n++) J += sq(X[n][0] - mu[r[n]][0]) + sq(X[n][1] - mu[r[n]][1]); return J; }
  function kmeansUpdate(X, r, K, prevMu) {
    var s = [], cnt = [], k, empty = [];
    for (k = 0; k < K; k++) { s.push([0, 0]); cnt.push(0); }
    for (var n = 0; n < X.length; n++) { s[r[n]][0] += X[n][0]; s[r[n]][1] += X[n][1]; cnt[r[n]]++; }
    var mu = [];
    for (k = 0; k < K; k++) {
      if (cnt[k] === 0) { mu.push(prevMu[k].slice()); empty.push(k); }
      else mu.push([s[k][0] / cnt[k], s[k][1] / cnt[k]]);
    }
    return { mu: mu, counts: cnt, empty: empty, J: kmeansJ(X, mu, r) };
  }

  /* =================================================================
     6. 1 回ずつ進める器（画面と試験の両方で使う）．DOM には触れない．
     method: 'kmeans' | 'gmm'．opt: {varFloor（gmm．null で下限なし）}
     状態 st：{params, gamma（gmm）, r（kmeans）, phase:'E'|'M'（次に行うステップ）, iter, hist:[{iter, half, value}], stop:null|{kind, text}, converged}
     ================================================================= */
  function makeRun(X, method, params0, opt) {
    opt = opt || {};
    var st = {
      method: method, X: X, params: copyParams(params0), init: copyParams(params0),
      gamma: null, r: null, phase: 'E', iter: 0, hist: [], stop: null, converged: false,
      lastE: null, lastM: null, prevParams: null, varFloor: opt.varFloor == null ? null : opt.varFloor
    };
    if (method === 'gmm') { var ll0 = logLik(X, st.params); st.hist.push({ iter: 0, half: 'init', value: ll0 }); st.ll = ll0; }
    else { st.J = null; }
    function E() {
      if (st.stop) return false;
      if (method === 'gmm') {
        var e = eStep(X, st.params);
        if (!e.ok) { st.stop = { kind: 'error', text: '計算を止めました：' + e.reason }; return false; }
        st.gamma = e.gamma; st.lastE = e; st.ll = e.logLik; st.eParams = copyParams(st.params);
      } else {
        var a = kmeansAssign(X, st.params.mu);
        var changed = !st.r || a.r.some(function (v, i) { return v !== st.r[i]; });
        st.r = a.r; st.J = a.J; st.lastE = { J: a.J, changed: changed };
        st.hist.push({ iter: st.iter + 0.5, half: 'E', value: a.J });
        if (!changed && st.iter > 0) st.converged = true;
      }
      st.phase = 'M'; return true;
    }
    function Mst() {
      if (st.stop) return false;
      if (st.phase !== 'M') return E() && Mst();
      if (method === 'gmm') {
        var before = st.ll;
        var m = mStep(X, st.gamma, st.params.K, { varFloor: st.varFloor, prev: st.params });
        if (!m.ok) {
          var d = m.degenerate;
          st.stop = {
            kind: 'degenerate', k: d.k, minVar: d.minVar, mu: d.mu,
            text: 'M ステップの結果，成分 ' + (d.k + 1) + ' の共分散行列の最小の固有値（その向きの分散）が ' + fmtE(d.minVar) + ' になり，下限なしのときの停止の目安 ' + fmtE(LIMITS.collapseVar) + ' を下回りました．この成分は 1 点（または 1 本の直線）に縮みかけていて，続けると対数尤度はいくらでも大きくなります（発散）．この更新は採用せずに止めました．分散の下限を入れて，同じ seed でやり直してください．'
          };
          st.lastM = m; return false;
        }
        st.prevParams = st.params; st.params = m.params; st.lastM = m; st.iter++;
        var e2 = eStep(X, st.params);
        if (!e2.ok) { st.stop = { kind: 'error', text: '計算を止めました：' + e2.reason }; return false; }
        st.ll = e2.logLik; st.llBefore = before;
        st.hist.push({ iter: st.iter, half: 'M', value: e2.logLik });
        var inc = e2.logLik - before;
        if (Math.abs(inc) <= LIMITS.tolRel * (Math.abs(e2.logLik) + 1)) st.converged = true;
        st.lastInc = inc;
        if (!isFinite(e2.logLik)) { st.stop = { kind: 'error', text: '計算を止めました：対数尤度が有限ではありません．' }; return false; }
        st.phase = 'E'; return true;
      }
      var u = kmeansUpdate(X, st.r, st.params.K, st.params.mu);
      st.prevParams = st.params;
      st.params = { K: st.params.K, mu: u.mu, Sigma: st.params.Sigma, pi: st.params.pi };
      st.lastM = u; st.J = u.J; st.iter++;
      st.hist.push({ iter: st.iter, half: 'M', value: u.J });
      st.phase = 'E'; return true;
    }
    /* 1 反復：E → M（k-means は 割り当て → 平均の更新）．収束・停止・上限なら false */
    function iterate() {
      if (st.stop || st.converged) return false;
      if (st.iter >= LIMITS.maxIter) { st.stop = { kind: 'limit', text: '反復の上限（' + LIMITS.maxIter + ' 回）に達したので止めました．' }; return false; }
      if (st.phase === 'E') { if (!E()) return false; if (method === 'kmeans' && st.converged) return false; }
      if (!Mst()) return false;
      return !st.converged;
    }
    return { st: st, E: E, M: Mst, iterate: iterate };
  }
  function fmtE(x) { if (!isFinite(x)) return String(x); if (x === 0) return '0'; var e = Math.floor(Math.log10(Math.abs(x) || 1e-300)); if (e >= -3 && e < 5) return (+x.toPrecision(3)).toString().replace('-', '−'); var m = x / Math.pow(10, e); return m.toFixed(2).replace('-', '−') + '×10' + supStr(e); }
  var SUPD = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function supStr(e) { return String(e).split('').map(function (c) { return SUPD[c]; }).join(''); }

  /* 試験・本文用：収束まで回す（戻り値 st） */
  function runToEnd(X, method, params0, opt, maxIter) {
    var R = makeRun(X, method, params0, opt), it = 0, lim = maxIter || LIMITS.maxIter;
    while (it++ < lim && R.iterate()) { /* 進める */ }
    return R.st;
  }

  /* =================================================================
     7. PCA（2 次元の点群）
     ================================================================= */
  /* 合成データ：x = m + R(θ)(s1 z1, s2 z2)ᵀ．既定 m = (3.0, 1.5)，s1 = 1.4，s2 = 0.45，θ = 35° */
  var PCA2D = { m: [3.0, 1.5], s: [1.4, 0.45], th: 35 };
  function makePCA2D(rng, N) {
    N = Math.round(C.clamp(N, LIMITS.pcaN[0], LIMITS.pcaN[1]));
    var cs = rot(PCA2D.th), X = [];
    for (var i = 0; i < N; i++) { var z1 = rng.normal() * PCA2D.s[0], z2 = rng.normal() * PCA2D.s[1]; X.push([PCA2D.m[0] + cs[0] * z1 - cs[1] * z2, PCA2D.m[1] + cs[1] * z1 + cs[0] * z2]); }
    return X;
  }
  /* 単位の変更（x₂ に倍率 c）と標準化（各列を 1/N の標準偏差で割る） */
  function transform2D(X, c, standardize) {
    var Y = X.map(function (r) { return [r[0], c * r[1]]; });
    if (!standardize) return { X: Y, sd: null };
    var N = Y.length, mu = [0, 0], v = [0, 0];
    Y.forEach(function (r) { mu[0] += r[0] / N; mu[1] += r[1] / N; });
    Y.forEach(function (r) { v[0] += sq(r[0] - mu[0]) / N; v[1] += sq(r[1] - mu[1]) / N; });
    var sd = [Math.sqrt(v[0]), Math.sqrt(v[1])];
    if (!(sd[0] > 0) || !(sd[1] > 0)) return { X: Y, sd: null, reason: '分散が 0 の列があるので標準化できません．' };
    return { X: Y.map(function (r) { return [r[0] / sd[0], r[1] / sd[1]]; }), sd: sd };
  }
  /* PCA の本体（どの次元でも）．中心化した X を SVD し，λ_i = s_i²/N．
     戻り値 {N, D, mean, Xc, s, lambdas, V（D×k．列が負荷量 v_i）, T（N×k．得点 t_ni = s_i U_ni）, total（tr S = Σλ）} */
  function pca(X) {
    var N = X.length, D = X[0].length, mean = new Array(D).fill(0), i, j;
    for (i = 0; i < N; i++) for (j = 0; j < D; j++) mean[j] += X[i][j];
    for (j = 0; j < D; j++) mean[j] /= N;
    var Xc = X.map(function (r) { return r.map(function (v, jj) { return v - mean[jj]; }); });
    var sv = C.svd(Xc), k = sv.s.length;
    var lambdas = sv.s.map(function (s) { return s * s / N; });
    var T = Xc.map(function (_, n) { var row = []; for (var q = 0; q < k; q++) row.push(sv.U[n][q] * sv.s[q]); return row; });
    var total = 0; for (i = 0; i < N; i++) for (j = 0; j < D; j++) total += Xc[i][j] * Xc[i][j];
    total /= N;
    return { N: N, D: D, mean: mean, Xc: Xc, s: sv.s, lambdas: lambdas, V: sv.V, U: sv.U, T: T, total: total };
  }
  /* 2×2 の共分散行列（1/N）．表示と uᵀSu のため（固有値は SVD から求める） */
  function cov2(X) { return C.covMatrix(X, 0).S; }
  function unitAt(phiDeg) { var a = phiDeg * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; }
  /* 向き u（角 φ）への射影の分散 uᵀSu と，1 次元で再構成したときの誤差 (1/N)Σ‖x_n − x̂_n‖² = tr S − uᵀSu */
  function projStats(S, phiDeg) {
    var u = unitAt(phiDeg), v = S[0][0] * u[0] * u[0] + 2 * S[0][1] * u[0] * u[1] + S[1][1] * u[1] * u[1], tr = S[0][0] + S[1][1];
    return { u: u, varProj: v, recErr: tr - v, trace: tr };
  }
  /* 直接の計算（試験用）：射影 t_n = uᵀ(x_n − x̄) の分散と再構成誤差 */
  function projStatsDirect(X, phiDeg) {
    var N = X.length, u = unitAt(phiDeg), m = [0, 0];
    X.forEach(function (r) { m[0] += r[0] / N; m[1] += r[1] / N; });
    var v = 0, e = 0;
    X.forEach(function (r) { var d0 = r[0] - m[0], d1 = r[1] - m[1], t = u[0] * d0 + u[1] * d1; v += t * t / N; e += (sq(d0 - t * u[0]) + sq(d1 - t * u[1])) / N; });
    return { varProj: v, recErr: e };
  }
  /* 第 1 主軸の角（0〜180°） */
  function axisAngle(v) { var a = Math.atan2(v[1], v[0]) * 180 / Math.PI; if (a < 0) a += 180; if (a >= 180) a -= 180; return a; }

  /* =================================================================
     8. 合成スペクトル（教育用．Raman 風．無次元の強度）
     純成分 s_k(ν) = Σ_peaks h·exp[−(ν − ν0)²/(2 w²)]．ν は 200〜1100 cm⁻¹ の 200 点．
     スペクトル n：x_n(ν) = Σ_k a_nk s_k(ν) + σ ε，a_nk = I_n f_nk，
       I_n ~ U(0.7, 1.3)（全体の強さ），f_n ~ Dirichlet(1,…,1)（混合比），ε ~ N(0,1)
     ================================================================= */
  var SPEC = {
    nu0: 200, nu1: 1100,
    comps: [
      { name: '成分 1', peaks: [[320, 18, 1.0], [610, 25, 0.55]] },
      { name: '成分 2', peaks: [[480, 20, 0.9], [820, 30, 0.7]] },
      { name: '成分 3', peaks: [[700, 35, 0.8], [1000, 22, 0.5]] }
    ],
    I: [0.7, 1.3]
  };
  function specGrid() { return C.linspace(SPEC.nu0, SPEC.nu1, LIMITS.specD); }
  function pureSpectra() {
    var g = specGrid();
    return SPEC.comps.map(function (c) { return g.map(function (nu) { var s = 0; c.peaks.forEach(function (p) { s += p[2] * Math.exp(-sq(nu - p[0]) / (2 * p[1] * p[1])); }); return s; }); });
  }
  function makeSpectra(rng, nComp, noise, N) {
    N = N || LIMITS.specN; nComp = Math.max(2, Math.min(3, nComp));
    noise = C.clamp(noise, LIMITS.specNoise[0], LIMITS.specNoise[1]);
    var P = pureSpectra().slice(0, nComp), D = LIMITS.specD;
    var X = [], clean = [], F = [], I = [], A = [];
    for (var n = 0; n < N; n++) {
      var In = rng.uniform(SPEC.I[0], SPEC.I[1]);
      var g = []; for (var k = 0; k < nComp; k++) g.push(rng.gamma(1));
      var gs = g.reduce(function (a, b) { return a + b; }, 0), f = g.map(function (v) { return v / gs; });
      var a = f.map(function (v) { return In * v; });
      var cl = new Array(D).fill(0);
      for (k = 0; k < nComp; k++) for (var j = 0; j < D; j++) cl[j] += a[k] * P[k][j];
      var x = cl.map(function (v) { return v + noise * rng.normal(); });
      X.push(x); clean.push(cl); F.push(f); I.push(In); A.push(a);
    }
    return { X: X, clean: clean, F: F, I: I, A: A, pure: P, nComp: nComp, noise: noise, N: N, D: D, grid: specGrid() };
  }
  /* k 個の主成分で再構成 x̂_n = x̄ + Σ_{i≤k} t_ni v_i．flip[i] が真なら v_i と t_i の符号を反転（結果は変わらない） */
  function reconstruct(P, n, k, flip) {
    var D = P.D, x = P.mean.slice();
    for (var i = 0; i < k && i < P.s.length; i++) {
      var sg = flip && flip[i] ? -1 : 1, t = sg * P.T[n][i];
      for (var j = 0; j < D; j++) x[j] += t * sg * P.V[j][i];
    }
    return x;
  }
  /* 平均の再構成誤差 (1/N)Σ_n‖x_n − x̂_n‖² と，捨てた固有値の和 Σ_{i>k} λ_i */
  function reconError(P, X, k) {
    var e = 0;
    for (var n = 0; n < P.N; n++) { var xh = reconstruct(P, n, k); for (var j = 0; j < P.D; j++) e += sq(X[n][j] - xh[j]); }
    e /= P.N;
    var rest = 0; for (var i = k; i < P.lambdas.length; i++) rest += P.lambdas[i];
    return { mean: e, discarded: rest };
  }
  function loading(P, i, flip) { var sg = flip ? -1 : 1; return P.V.map(function (r) { return sg * r[i]; }); }
  /* 長さ 1 にそろえる */
  function unit(v) { var s = Math.sqrt(v.reduce(function (a, b) { return a + b * b; }, 0)); return s > 0 ? v.map(function (x) { return x / s; }) : v.slice(); }
  /* 余弦類似度 |cos| */
  function absCos(a, b) { var ua = unit(a), ub = unit(b), s = 0; for (var i = 0; i < ua.length; i++) s += ua[i] * ub[i]; return Math.abs(s); }

  return {
    LIMITS: LIMITS, PRESETS: PRESETS, PRESET_KEYS: PRESET_KEYS, PCA2D: PCA2D, SPEC: SPEC,
    makeData: makeData, chol2: chol2, logGauss2: logGauss2, eig2: eig2, floorCov: floorCov, ellipse: ellipse,
    initParams: initParams, copyParams: copyParams, eStep: eStep, logLik: logLik, mStep: mStep,
    kmeansAssign: kmeansAssign, kmeansUpdate: kmeansUpdate, kmeansJ: kmeansJ,
    makeRun: makeRun, runToEnd: runToEnd, fmtE: fmtE,
    makePCA2D: makePCA2D, transform2D: transform2D, pca: pca, cov2: cov2, unitAt: unitAt,
    projStats: projStats, projStatsDirect: projStatsDirect, axisAngle: axisAngle,
    specGrid: specGrid, pureSpectra: pureSpectra, makeSpectra: makeSpectra, reconstruct: reconstruct,
    reconError: reconError, loading: loading, unit: unit, absCos: absCos
  };
});
