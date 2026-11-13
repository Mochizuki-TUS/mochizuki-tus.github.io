/* =====================================================================
   inference-mcmc.model.js — S08 近似推論と MCMC の計算（DOM に触れない純粋な関数）
   ブラウザ：window.MLModels.InferenceMCMC（先に lib/mlcore.js を読む）
   Node   ：require('./inference-mcmc.model.js')（試験 W/tests/inference-mcmc.test.mjs から）
   記号は本文（第20章・第21章）と SPEC_CONTENT §3.3，§3.5 に合わせる．
     標的 p(x) = p̃(x)/Z（p̃ は非正規化密度，Z = ∫ p̃(x) dx）．第20章の事後分布 p(θ|𝒟) = p(𝒟,θ)/p(𝒟) に当たる．
     近似分布 q(x) = 𝒩(x | m, s²)（s は標準偏差）．
     ELBO(q) = 𝔼_q[ln p̃(x)] − 𝔼_q[ln q(x)]，ln Z = ELBO(q) + KL(q‖p)．
     KL(q‖p) = ∫ q ln(q/p) dx，KL(p‖q) = ∫ p ln(p/q) dx（単位 nat）．
     Metropolis–Hastings：r = p̃(x′) q(x|x′) / [p̃(x) q(x′|x)]，受理確率 min(1, r)．
   ・乱数は引数で受け取った MLCore.rng だけを使う（Math.random 禁止）．
   ・確率密度は対数で持ち，正規化は log-sum-exp で行う．逆行列は作らない．
   ===================================================================== */
(function (root, factory) {
  'use strict';
  var C = (typeof module === 'object' && module.exports) ? require('./lib/mlcore.js') : root.MLCore;
  var M = factory(C);
  if (typeof module === 'object' && module.exports) module.exports = M;
  if (root) { root.MLModels = root.MLModels || {}; root.MLModels.InferenceMCMC = M; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (C) {
  'use strict';

  var LIMITS = {
    grid: 4000,              /* 標的の格子の区間数（Simpson 則．偶数） */
    qGrid: 2000,             /* q の期待値の格子の区間数 */
    maxSteps: 20000,         /* MH の 1 本の連鎖のステップ数の上限 */
    maxChains: 4,
    nmIter: 4000,            /* Nelder–Mead の反復の上限 */
    beta: [1.5, 20], mixW: [0.05, 0.95], mixD: [0, 8], wellB: [0.25, 15],
    s: [0.01, 10]            /* MH の提案幅 */
  };
  var LN2PI = Math.log(2 * Math.PI);
  var SIG_MIX = 1.0;         /* 双峰の各成分の標準偏差（固定） */

  /* ---------- Simpson 則の重み（区間数 n は偶数，刻み h） ---------- */
  function simpsonWeights(n, h) {
    var w = new Array(n + 1);
    for (var i = 0; i <= n; i++) w[i] = (i === 0 || i === n) ? h / 3 : (i % 2 ? 4 * h / 3 : 2 * h / 3);
    return w;
  }
  function lse(arr) { return C.logsumexp(arr); }

  /* =================================================================
     1. 標的 p̃(x)
     kind: 'beta'  {a, b}     p̃(x) = x^{a−1}(1−x)^{b−1}（0<x<1），Z = B(a,b)
           'mix'   {w, d}     p̃(x) = w exp[−(x−μ₁)²/(2σ²)] + (1−w) exp[−(x−μ₂)²/(2σ²)]，μ₁ = −d/2，μ₂ = d/2，σ = 1，Z = √(2π) σ
           'well'  {b}        p̃(x) = exp[−b (x²−1)²]（b = E_b/(k_B T)），Z は数値積分
     ================================================================= */
  function makeTarget(kind, prm) {
    var T = { kind: kind, params: prm };
    if (kind === 'beta') {
      var a = prm.a, b = prm.b;
      T.support = [0, 1];
      T.logp = function (x) { if (!(x > 0 && x < 1)) return -Infinity; return (a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x); };
      T.dlogp = function (x) { return (a - 1) / x - (b - 1) / (1 - x); };
      T.d2logp = function (x) { return -(a - 1) / (x * x) - (b - 1) / ((1 - x) * (1 - x)); };
      T.plotRange = [0, 1];
      T.label = 'Beta(' + a + ', ' + b + ')';
    } else if (kind === 'mix') {
      var w = prm.w, d = prm.d, s2 = SIG_MIX * SIG_MIX, m1 = -d / 2, m2 = d / 2, lw1 = Math.log(w), lw2 = Math.log(1 - w);
      T.support = [-Infinity, Infinity];
      T.mus = [m1, m2]; T.sigma = SIG_MIX;
      var comp = function (x) { return [lw1 - (x - m1) * (x - m1) / (2 * s2), lw2 - (x - m2) * (x - m2) / (2 * s2)]; };
      T.logp = function (x) { return lse(comp(x)); };
      T.dlogp = function (x) { var l = comp(x), L = lse(l), r1 = Math.exp(l[0] - L), r2 = Math.exp(l[1] - L); return r1 * (-(x - m1) / s2) + r2 * (-(x - m2) / s2); };
      T.d2logp = function (x) {
        var l = comp(x), L = lse(l), r1 = Math.exp(l[0] - L), r2 = Math.exp(l[1] - L);
        var g1 = -(x - m1) / s2, g2 = -(x - m2) / s2, g = r1 * g1 + r2 * g2;
        return -1 / s2 + r1 * g1 * g1 + r2 * g2 * g2 - g * g;
      };
      T.plotRange = [m1 - 4.5 * SIG_MIX, m2 + 4.5 * SIG_MIX];
      T.gridRange = [m1 - 10 * SIG_MIX, m2 + 10 * SIG_MIX];
      T.label = '双峰（w = ' + w + '，d = ' + d + '）';
    } else if (kind === 'well') {
      var bb = prm.b;
      T.support = [-Infinity, Infinity];
      T.logp = function (x) { var u = x * x - 1; return -bb * u * u; };
      T.dlogp = function (x) { return -4 * bb * x * (x * x - 1); };
      T.d2logp = function (x) { return -bb * (12 * x * x - 4); };
      var xp = Math.sqrt(1 + Math.sqrt(12 / bb)), xg = Math.sqrt(1 + Math.sqrt(46 / bb));
      T.plotRange = [-xp, xp];
      T.gridRange = [-xg, xg];
      T.label = '二重井戸（b = ' + bb + '）';
    } else throw new Error('unknown target ' + kind);
    buildGrid(T);
    T.modes = findModes(T);
    return T;
  }

  /* 格子と正規化．Beta は x = u³(10 − 15u + 6u²)（dx/du = 30u²(1−u)²）で端を滑らかにしてから u の Simpson 則（端の x^{a−1} や ln x の特異性を弱める）．
     T.grid = {x, w（重み．∫ f dx ≈ Σ w_i f(x_i)）, lp（ln p̃）, lpn（ln p = ln p̃ − ln Z）, p}，T.lnZ，T.mean，T.var，T.H（エントロピー） */
  function buildGrid(T) {
    var n = LIMITS.grid, x = new Array(n + 1), w, i;
    if (T.kind === 'beta') {
      var hu = 1 / n, wu = simpsonWeights(n, hu); w = new Array(n + 1);
      for (i = 0; i <= n; i++) { var u = i * hu, u2 = u * u, v = 1 - u; x[i] = u2 * u * (10 - 15 * u + 6 * u2); w[i] = wu[i] * 30 * u2 * v * v; }
      w[0] = 0; w[n] = 0; x[0] = 0; x[n] = 1;
    } else {
      var lo = T.gridRange[0], hi = T.gridRange[1], h = (hi - lo) / n;
      w = simpsonWeights(n, h);
      for (i = 0; i <= n; i++) x[i] = lo + i * h;
    }
    var lp = x.map(T.logp), terms = [];
    for (i = 0; i <= n; i++) if (w[i] > 0 && lp[i] > -Infinity) terms.push(lp[i] + Math.log(w[i]));
    var lnZ = lse(terms);
    var p = new Array(n + 1), lpn = new Array(n + 1), mean = 0, H = 0;
    for (i = 0; i <= n; i++) { lpn[i] = lp[i] - lnZ; p[i] = Math.exp(lpn[i]); mean += w[i] * p[i] * x[i]; if (p[i] > 0) H -= w[i] * p[i] * lpn[i]; }
    var v = 0; for (i = 0; i <= n; i++) v += w[i] * p[i] * (x[i] - mean) * (x[i] - mean);
    /* 累積分布（台形則．分位点を求める初期値用） */
    var cdf = new Array(n + 1); cdf[0] = 0;
    for (i = 1; i <= n; i++) cdf[i] = cdf[i - 1] + 0.5 * (p[i] + p[i - 1]) * (x[i] - x[i - 1]);
    var tot = cdf[n]; for (i = 0; i <= n; i++) cdf[i] /= tot;
    T.grid = { x: x, w: w, lp: lp, lpn: lpn, p: p, cdf: cdf };
    T.lnZ = lnZ; T.mean = mean; T.var = v; T.H = H;
    T.pdf = function (xx) { return Math.exp(T.logp(xx) - lnZ); };
  }
  /* 格子の累積分布から分位点（線形補間） */
  function quantile(T, q) {
    var c = T.grid.cdf, x = T.grid.x, lo = 0, hi = c.length - 1;
    if (q <= 0) return x[0]; if (q >= 1) return x[hi];
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (c[mid] < q) lo = mid; else hi = mid; }
    var t = (q - c[lo]) / Math.max(c[hi] - c[lo], 1e-300);
    return x[lo] + t * (x[hi] - x[lo]);
  }

  /* 局所的な最大（モード）：格子で ln p̃ の極大を探し，Newton 法で詰める．左から順．
     戻り値 [{x, A（= −d² ln p̃/dx²）, lp}] */
  function findModes(T) {
    var g = T.grid, n = g.x.length, out = [];
    for (var i = 1; i < n - 1; i++) {
      if (!(g.lp[i] > -Infinity)) continue;
      if (g.lp[i] > g.lp[i - 1] && g.lp[i] >= g.lp[i + 1]) {
        var x = g.x[i];
        for (var it = 0; it < 60; it++) {
          var d1 = T.dlogp(x), d2 = T.d2logp(x);
          if (!(d2 < 0)) break;
          var nx = x - d1 / d2;
          if (T.kind === 'beta') nx = Math.min(Math.max(nx, g.x[i - 1]), g.x[i + 1]);
          if (Math.abs(nx - x) < 1e-15 * Math.max(1, Math.abs(x))) { x = nx; break; }
          x = nx;
        }
        var A = -T.d2logp(x);
        if (A > 0 && isFinite(A) && !out.some(function (o) { return Math.abs(o.x - x) < 1e-6; })) out.push({ x: x, A: A, lp: T.logp(x) });
      }
    }
    return out;
  }

  /* =================================================================
     2. 近似分布 q = 𝒩(m, s²) と，q による期待値
     q.trunc = true のとき，q を標的の台（0<x<1）に切断して正規化する（Beta の標的で KL(q‖p) と ELBO を有限にするため）．
     ================================================================= */
  function gaussQ(m, s, trunc) { return { m: m, s: s, trunc: !!trunc }; }
  function logq(q, x) { return -0.5 * LN2PI - Math.log(q.s) - 0.5 * ((x - q.m) / q.s) * ((x - q.m) / q.s); }
  /* q が標的の台の外に置く確率（切断しない q のとき） */
  function outsideMass(T, q) {
    if (T.kind !== 'beta') return 0;
    return C.normCdf(0, q.m, q.s) + (1 - C.normCdf(1, q.m, q.s));
  }
  /* 𝔼_q[ln p̃]，𝔼_q[ln q]，ELBO，KL(q‖p)．戻り値 {Elp, Elq, H, elbo, klqp, outside, reason} */
  function qTerms(T, q) {
    var Elp = 0, Elq = 0, i;
    if (T.kind === 'beta') {
      if (!q.trunc) {
        var out = outsideMass(T, q);
        if (out > 0) return { Elp: -Infinity, Elq: -0.5 * (1 + LN2PI) - Math.log(q.s), H: 0.5 * (1 + LN2PI) + Math.log(q.s), elbo: -Infinity, klqp: Infinity, outside: out,
          reason: 'q が 0 < x < 1 の外に確率 ' + out.toPrecision(3) + ' を置き，そこでは p̃ = 0（ln p̃ = −∞）なので KL(q‖p) = ∞，ELBO = −∞ です．' };
      }
      /* 標的の格子の上で，切断した q を格子で正規化する */
      var g = T.grid, n = g.x.length, lq = new Array(n), terms = [];
      for (i = 0; i < n; i++) { lq[i] = logq(q, g.x[i]); if (g.w[i] > 0) terms.push(lq[i] + Math.log(g.w[i])); }
      var lnZq = lse(terms);
      for (i = 0; i < n; i++) {
        if (!(g.w[i] > 0)) continue;
        var qi = Math.exp(lq[i] - lnZq);
        if (qi === 0) continue;
        Elp += g.w[i] * qi * g.lp[i];
        Elq += g.w[i] * qi * (lq[i] - lnZq);
      }
      var mq = 0, vq = 0;
      for (i = 0; i < n; i++) if (g.w[i] > 0) mq += g.w[i] * Math.exp(lq[i] - lnZq) * g.x[i];
      for (i = 0; i < n; i++) if (g.w[i] > 0) vq += g.w[i] * Math.exp(lq[i] - lnZq) * (g.x[i] - mq) * (g.x[i] - mq);
      return { Elp: Elp, Elq: Elq, H: -Elq, elbo: Elp - Elq, klqp: Elq - Elp + T.lnZ, outside: 0, lnZq: lnZq, qMean: mq, qVar: vq, reason: '' };
    }
    /* 台が実数全体：q の ±12 s の格子で Simpson 則（q の解析的な密度） */
    var nq = LIMITS.qGrid, lo = q.m - 12 * q.s, h = 24 * q.s / nq, wq = simpsonWeights(nq, h);
    for (i = 0; i <= nq; i++) {
      var x = lo + i * h, l = logq(q, x), qq = Math.exp(l);
      Elp += wq[i] * qq * T.logp(x);
      Elq += wq[i] * qq * l;
    }
    return { Elp: Elp, Elq: Elq, H: -Elq, elbo: Elp - Elq, klqp: Elq - Elp + T.lnZ, outside: 0, qMean: q.m, qVar: q.s * q.s, reason: '' };
  }
  /* KL(p‖q) = ∫ p (ln p − ln q) dx（標的の格子で．q は切断しない 𝒩） */
  function klPQ(T, q) {
    var g = T.grid, s = 0;
    for (var i = 0; i < g.x.length; i++) { if (!(g.w[i] > 0) || g.p[i] === 0) continue; s += g.w[i] * g.p[i] * (g.lpn[i] - logq(q, g.x[i])); }
    return s;
  }

  /* Laplace 近似：選んだモード x* で ln p̃ を 2 次まで展開．q = 𝒩(x*, 1/A)，A = −(d²/dx²) ln p̃ |_{x*}．
     周辺尤度の近似 ln Z_Laplace = ln p̃(x*) + ½ ln(2π/A)．（変数名は A だが，画面と本文の記号は曲率 Λ．第20章） */
  function laplace(T, idx) {
    if (!T.modes.length) return { ok: false, reason: '内部に極大（モード）がありません．' };
    var k = Math.max(0, Math.min(T.modes.length - 1, idx | 0)), md = T.modes[k];
    return { ok: true, index: k, mode: md.x, A: md.A, mean: md.x, var: 1 / md.A, sd: Math.sqrt(1 / md.A), lnZ: md.lp + 0.5 * (LN2PI - Math.log(md.A)), lpMode: md.lp };
  }
  /* KL(p‖q) を最小にする 𝒩：平均と分散の一致（モーメントの一致） */
  function momentMatch(T) { return { mean: T.mean, var: T.var, sd: Math.sqrt(T.var) }; }

  /* Nelder–Mead（2 変数．f を最小化）．戻り値 {x, f, iters, converged} */
  function nelderMead(f, x0, step, opt) {
    opt = opt || {}; var maxIt = opt.maxIter || LIMITS.nmIter, tol = opt.tol || 1e-12;
    var P = [x0.slice(), [x0[0] + step[0], x0[1]], [x0[0], x0[1] + step[1]]], F = P.map(f), it;
    for (it = 0; it < maxIt; it++) {
      var ord = [0, 1, 2].sort(function (a, b) { return F[a] - F[b]; }); P = ord.map(function (i) { return P[i]; }); F = ord.map(function (i) { return F[i]; });
      var spread = Math.max(Math.abs(P[1][0] - P[0][0]), Math.abs(P[2][0] - P[0][0]), Math.abs(P[1][1] - P[0][1]), Math.abs(P[2][1] - P[0][1]));
      if (Math.abs(F[2] - F[0]) <= tol * (1 + Math.abs(F[0])) && spread < 1e-9) return { x: P[0], f: F[0], iters: it, converged: true };
      var c = [(P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2];
      var xr = [c[0] + (c[0] - P[2][0]), c[1] + (c[1] - P[2][1])], fr = f(xr);
      if (fr < F[0]) {
        var xe = [c[0] + 2 * (c[0] - P[2][0]), c[1] + 2 * (c[1] - P[2][1])], fe = f(xe);
        if (fe < fr) { P[2] = xe; F[2] = fe; } else { P[2] = xr; F[2] = fr; }
      } else if (fr < F[1]) { P[2] = xr; F[2] = fr; }
      else {
        var xc = fr < F[2] ? [c[0] + 0.5 * (xr[0] - c[0]), c[1] + 0.5 * (xr[1] - c[1])] : [c[0] + 0.5 * (P[2][0] - c[0]), c[1] + 0.5 * (P[2][1] - c[1])], fc = f(xc);
        if (fc < Math.min(fr, F[2])) { P[2] = xc; F[2] = fc; }
        else { for (var j = 1; j < 3; j++) { P[j] = [P[0][0] + 0.5 * (P[j][0] - P[0][0]), P[0][1] + 0.5 * (P[j][1] - P[0][1])]; F[j] = f(P[j]); } }
      }
    }
    var b = 0; for (var k = 1; k < 3; k++) if (F[k] < F[b]) b = k;
    return { x: P[b], f: F[b], iters: it, converged: false };
  }
  /* KL(q‖p) を最小にする 𝒩（= ELBO を最大にする）．変数 (m, ln s) で Nelder–Mead．Beta の標的では q を切断する．
     init {m, s}．戻り値 {m, s, elbo, klqp, iters, converged, trunc} */
  function minKLqp(T, init) {
    var trunc = T.kind === 'beta';
    var sMin = trunc ? 0.005 : 1e-3, sMax = trunc ? 2 : 50;
    var f = function (v) {
      var s = Math.exp(v[1]);
      if (!(s >= sMin && s <= sMax)) return 1e300;
      if (trunc && (v[0] < -1 || v[0] > 2)) return 1e300;
      var r = qTerms(T, gaussQ(v[0], s, trunc));
      return isFinite(r.elbo) ? -r.elbo : 1e300;
    };
    var s0 = Math.min(Math.max(init.s, sMin * 2), sMax / 2);
    var r = nelderMead(f, [init.m, Math.log(s0)], [0.25 * s0, 0.3]);
    var q = gaussQ(r.x[0], Math.exp(r.x[1]), trunc), t = qTerms(T, q);
    return { m: q.m, s: q.s, trunc: trunc, elbo: t.elbo, klqp: t.klqp, qMean: t.qMean, qVar: t.qVar, iters: r.iters, converged: r.converged };
  }
  /* KL(q‖p) 最小化の初期値：'left'（左のモード），'right'（右のモード），'wide'（p の平均，標準偏差の 1.5 倍） */
  function klInit(T, which) {
    var sd = Math.sqrt(T.var);
    if (which === 'wide' || !T.modes.length) return { m: T.mean, s: 1.5 * sd };
    var md = which === 'right' ? T.modes[T.modes.length - 1] : T.modes[0];
    return { m: md.x, s: Math.min(0.5 * sd, 1 / Math.sqrt(md.A)) };
  }

  /* 近似のまとめ（画面と試験で使う）．opt {modeIndex, init, manual:{m,s}} */
  function compareApprox(T, opt) {
    opt = opt || {};
    var trunc = T.kind === 'beta';
    var out = {};
    var L = laplace(T, opt.modeIndex || 0);
    if (L.ok) {
      var qL = gaussQ(L.mean, L.sd, false), tL = qTerms(T, qL), tLt = trunc ? qTerms(T, gaussQ(L.mean, L.sd, true)) : null;
      out.laplace = { m: L.mean, s: L.sd, var: L.var, mode: L.mode, A: L.A, lnZL: L.lnZ, lpMode: L.lpMode, index: L.index,
        klqp: tL.klqp, elbo: tL.elbo, outside: tL.outside, reason: tL.reason, klpq: klPQ(T, qL), Elp: tL.Elp, H: tL.H,
        trunc: tLt ? { klqp: tLt.klqp, elbo: tLt.elbo, Elp: tLt.Elp, H: tLt.H } : null };
    } else out.laplace = { ok: false, reason: L.reason };
    var MM = momentMatch(T), qM = gaussQ(MM.mean, MM.sd, false), tM = qTerms(T, qM), tMt = trunc ? qTerms(T, gaussQ(MM.mean, MM.sd, true)) : null;
    out.moment = { m: MM.mean, s: MM.sd, var: MM.var, klqp: tM.klqp, elbo: tM.elbo, outside: tM.outside, reason: tM.reason, klpq: klPQ(T, qM), Elp: tM.Elp, H: tM.H,
      trunc: tMt ? { klqp: tMt.klqp, elbo: tMt.elbo, Elp: tMt.Elp, H: tMt.H } : null };
    var init = opt.init || klInit(T, 'left');
    var K = minKLqp(T, init);
    var tK = qTerms(T, gaussQ(K.m, K.s, K.trunc));
    out.klqp = { m: K.m, s: K.s, var: K.s * K.s, trunc: K.trunc, qMean: K.qMean, qVar: K.qVar, klqp: K.klqp, elbo: K.elbo, klpq: klPQ(T, gaussQ(K.m, K.s, false)), Elp: tK.Elp, H: tK.H, iters: K.iters, converged: K.converged, init: init };
    if (opt.manual) out.manual = evalQ(T, opt.manual.m, opt.manual.s);
    out.lnZ = T.lnZ; out.mean = T.mean; out.var = T.var; out.H = T.H;
    return out;
  }
  /* 手で選んだ q = 𝒩(m, s²) の値（Beta の標的では KL(q‖p)・ELBO を切断した q で） */
  function evalQ(T, m, s) {
    var trunc = T.kind === 'beta', tm = qTerms(T, gaussQ(m, s, trunc));
    return { m: m, s: s, var: s * s, trunc: trunc, qMean: tm.qMean, qVar: tm.qVar, klqp: tm.klqp, elbo: tm.elbo, klpq: klPQ(T, gaussQ(m, s, false)), Elp: tm.Elp, H: tm.H, outside: outsideMass(T, gaussQ(m, s, false)) };
  }
  /* q の密度（描画用．切断なら台の外は 0，台の中は 1/Z_q 倍） */
  function qPdf(T, q) {
    if (q.trunc && T.kind === 'beta') {
      var Zq = C.normCdf(1, q.m, q.s) - C.normCdf(0, q.m, q.s);
      return function (x) { return (x > 0 && x < 1 && Zq > 0) ? Math.exp(logq(q, x)) / Zq : 0; };
    }
    return function (x) { return Math.exp(logq(q, x)); };
  }

  /* =================================================================
     3. Metropolis–Hastings 法（Gauss 型のランダムウォーク提案 x′ = x + s ε，ε ~ 𝒩(0,1)．提案は対称なので r = p̃(x′)/p̃(x)）
     連鎖 k の乱数は rng(seed + 7919 k) から（連鎖の数を変えても連鎖 1 の列は同じ）．
     1 ステップごとに normal() → uniform() の順に 1 個ずつ引く（棄却が確実でも uniform を引く）．
     ================================================================= */
  function chainSeed(seed, k) { return ((seed >>> 0) + 7919 * k) >>> 0; }
  /* 初期値：'spread'（p の 5 %，95 %，30 %，70 % 点．散らす）／'same'（すべて p の 5 % 点） */
  function initialValues(T, K, how) {
    var qs = how === 'same' ? [0.05, 0.05, 0.05, 0.05] : [0.05, 0.95, 0.30, 0.70];
    var out = [];
    for (var k = 0; k < K; k++) out.push(quantile(T, qs[k]));
    return out;
  }
  function mhInit(T, opt) {
    var K = Math.max(1, Math.min(LIMITS.maxChains, opt.K | 0)), x0 = opt.x0 || initialValues(T, K, opt.init || 'spread');
    var chains = [];
    for (var k = 0; k < K; k++) {
      var lp = T.logp(x0[k]);
      chains.push({ rng: C.rng(chainSeed(opt.seed, k)), x: x0[k], lp: lp, xs: [x0[k]], acc: 0, n: 0, last: null });
    }
    return { chains: chains, K: K, seed: opt.seed, s: opt.s, init: opt.init || 'spread', x0: x0 };
  }
  /* 全部の連鎖を 1 ステップ進める．戻り値は連鎖 1 の最後の提案 */
  function mhStep(st, T, s) {
    for (var k = 0; k < st.chains.length; k++) {
      var c = st.chains[k];
      var eps = c.rng.normal(), u = c.rng.uniform();
      var xp = c.x + s * eps, lpp = T.logp(xp);
      var lnr = lpp - c.lp;                       /* ln r = ln p̃(x′) − ln p̃(x) */
      var accept = Math.log(u) < lnr;             /* u < min(1, r) と同じ（u = 0 でも p̃(x′) = 0 なら棄却） */
      c.last = { x: c.x, xp: xp, lp: c.lp, lpp: lpp, lnr: lnr, r: Math.exp(Math.min(lnr, 700)), acc: Math.min(1, Math.exp(Math.min(lnr, 0))), u: u, accepted: accept };
      if (accept) { c.x = xp; c.lp = lpp; c.acc++; }
      c.n++;
      c.xs.push(c.x);
    }
    return st.chains[0].last;
  }

  /* ---------- 自己相関（FFT）と積分自己相関時間 ---------- */
  function fft(re, im, inv) {
    var n = re.length, i, j, k, len;
    for (i = 1, j = 0; i < n; i++) { var bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (len = 2; len <= n; len <<= 1) {
      var ang = 2 * Math.PI / len * (inv ? 1 : -1), wr = Math.cos(ang), wi = Math.sin(ang);
      for (i = 0; i < n; i += len) {
        var cr = 1, ci = 0;
        for (k = 0; k < len / 2; k++) {
          var a = i + k, b = a + len / 2, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          var ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
  }
  /* ρ_k（k = 0..maxLag）．MLCore.autocorr と同じ推定量（分母は N で割る標準的なもの，ρ_0 = 1）を FFT で．分散 0 なら null */
  function acf(x, maxLag) {
    var n = x.length; if (n < 2) return null;
    maxLag = Math.min(maxLag == null ? n - 1 : maxLag, n - 1);
    var m = C.mean(x), size = 1; while (size < 2 * n) size <<= 1;
    var re = new Float64Array(size), im = new Float64Array(size), i;
    for (i = 0; i < n; i++) re[i] = x[i] - m;
    fft(re, im, false);
    for (i = 0; i < size; i++) { re[i] = re[i] * re[i] + im[i] * im[i]; im[i] = 0; }
    fft(re, im, true);
    var c0 = re[0] / size; if (!(c0 > 1e-300 * n)) return null;
    var r = new Array(maxLag + 1);
    for (i = 0; i <= maxLag; i++) r[i] = (re[i] / size) / c0;
    r[0] = 1;
    return r;
  }
  /* 積分自己相関時間 τ = 1 + 2 Σ_{k=1}^{W} ρ_k．打ち切り W は Sokal の自動窓：W ≥ c τ(W) となる最小の W（c = 5）．
     系列長の 1/2 までに条件を満たさなければ ok = false（τ は過小評価のおそれ）．MLCore.iat と同じ規則 */
  function iat(x, c) {
    c = c || 5; var n = x.length;
    var rho = acf(x, Math.floor(n / 2));
    if (!rho) return { tau: null, window: 0, ok: false, rho: null };
    var tau = 1;
    for (var W = 1; W < rho.length; W++) {
      tau += 2 * rho[W];
      if (W >= c * tau) return { tau: Math.max(tau, 1e-12), window: W, ok: true, rho: rho };
    }
    return { tau: Math.max(tau, 1e-12), window: rho.length - 1, ok: false, rho: rho };
  }
  /* split-R̂（Gelman et al. 2013，BDA3 の 11.4 節．順位による正規化はしない）．
     各連鎖を前後半に分けて M = 2K 本とし，長さ n．W = 連鎖内分散の平均（ddof=1），B = n/(M−1) Σ (平均_j − 全平均)²，
     var⁺ = (n−1)/n W + B/n，R̂ = √(var⁺/W)．戻り値 {rhat, W, B, varPlus, M, n} か null */
  function splitRhat(chains) {
    if (chains.length < 2) return null;
    var cs = [];
    chains.forEach(function (c) { var h = Math.floor(c.length / 2); cs.push(c.slice(0, h)); cs.push(c.slice(c.length - h)); });
    var Mn = cs.length, n = Math.min.apply(null, cs.map(function (c) { return c.length; }));
    if (n < 2) return null;
    cs = cs.map(function (c) { return c.slice(0, n); });
    var means = cs.map(C.mean), grand = C.mean(means), B = 0;
    means.forEach(function (m) { B += (m - grand) * (m - grand); }); B *= n / (Mn - 1);
    var Wv = C.mean(cs.map(function (c) { return C.variance(c, 1); }));
    if (!(Wv > 0)) return { rhat: null, W: Wv, B: B, varPlus: null, M: Mn, n: n, reason: '連鎖内の分散が 0 です（すべて棄却されて動いていない連鎖があります）．' };
    var vp = (n - 1) / n * Wv + B / n;
    return { rhat: Math.sqrt(vp / Wv), W: Wv, B: B, varPlus: vp, M: Mn, n: n };
  }
  /* 診断のまとめ．burn = 捨てる初期の割合（0〜0.9）．戻り値 {per:[...], pooled, rhat, kept} */
  function diagnostics(st, burn, opt) {
    opt = opt || {};
    var per = [], kept = [];
    st.chains.forEach(function (c, k) {
      var xs = c.xs.slice(1);                         /* 初期値は数えない（ステップ後の標本だけ） */
      var b = Math.floor(xs.length * burn), y = xs.slice(b);
      kept.push(y);
      var it = y.length >= 4 ? iat(y) : { tau: null, window: 0, ok: false, rho: null };
      per.push({ k: k, n: y.length, burned: b, accRate: c.n ? c.acc / c.n : null, mean: y.length ? C.mean(y) : null, var: y.length > 1 ? C.variance(y, 1) : null,
        tau: it.tau, window: it.window, ok: it.ok, ess: it.tau ? y.length / it.tau : null, rho: it.rho ? it.rho.slice(0, Math.min(it.rho.length, (opt.maxLag || 200) + 1)) : null });
    });
    var all = [].concat.apply([], kept), pooled = null;
    if (all.length >= 2) {
      var essT = per.reduce(function (s, p) { return s + (p.ess || 0); }, 0), v = C.variance(all, 1);
      pooled = { n: all.length, mean: C.mean(all), var: v, ess: essT, mcse: essT > 0 ? Math.sqrt(v / essT) : null };
    }
    var rh = st.chains.length >= 2 ? splitRhat(kept) : null;
    return { per: per, pooled: pooled, rhat: rh, kept: kept, all: all };
  }

  /* =================================================================
     4. 3 状態の離散分布での Metropolis–Hastings の遷移行列（第21章 21.7 の手計算）
     ptilde：非正規化の重み（3 個，正）．Q：提案の行列 Q_ij = q(j | i)（各行の和 1，対角 0）．既定は「ほかの 2 状態を 1/2 ずつ」．
     T_ij = Q_ij min(1, p_j Q_ji / (p_i Q_ij))（j ≠ i），T_ii = 1 − Σ_{j≠i} T_ij．行が「いまの状態」，列が「次の状態」（各行の和 1）．
     ================================================================= */
  function defaultProposal3() { return [[0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]]; }
  function mhMatrix(ptilde, Q) {
    Q = Q || defaultProposal3();
    var n = ptilde.length, Z = ptilde.reduce(function (s, v) { return s + v; }, 0), p = ptilde.map(function (v) { return v / Z; });
    var T = C.zeros(n, n), A = C.zeros(n, n), i, j;
    for (i = 0; i < n; i++) {
      var off = 0;
      for (j = 0; j < n; j++) {
        if (j === i || Q[i][j] === 0) continue;
        var r = (ptilde[j] * Q[j][i]) / (ptilde[i] * Q[i][j]);     /* Z は約分されて要らない */
        A[i][j] = Math.min(1, r); T[i][j] = Q[i][j] * A[i][j]; off += T[i][j];
      }
      T[i][i] = 1 - off;
    }
    /* 定常分布を独立に求める：(Tᵀ − I) π = 0 の 1 行を Σ π = 1 に置き換えて LU で解く */
    var Mx = C.zeros(n, n), rhs = new Array(n).fill(0);
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) Mx[i][j] = T[j][i] - (i === j ? 1 : 0);
    for (j = 0; j < n; j++) Mx[n - 1][j] = 1; rhs[n - 1] = 1;
    var pi = C.luSolve(Mx, rhs);
    var pT = new Array(n).fill(0);
    for (j = 0; j < n; j++) for (i = 0; i < n; i++) pT[j] += p[i] * T[i][j];
    var stat = 0; for (j = 0; j < n; j++) stat = Math.max(stat, Math.abs(pT[j] - p[j]));
    var db = 0, flows = [];
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) { var f1 = p[i] * T[i][j], f2 = p[j] * T[j][i]; flows.push({ i: i, j: j, fwd: f1, bwd: f2 }); db = Math.max(db, Math.abs(f1 - f2)); }
    /* 一様な初期分布から T を掛けていく */
    var dist = [new Array(n).fill(1 / n)];
    for (var t = 0; t < 30; t++) { var prev = dist[dist.length - 1], nx = new Array(n).fill(0); for (j = 0; j < n; j++) for (i = 0; i < n; i++) nx[j] += prev[i] * T[i][j]; dist.push(nx); }
    var rowsum = T.map(function (r) { return r.reduce(function (s, v) { return s + v; }, 0); });
    return { p: p, T: T, A: A, Q: Q, pT: pT, stationaryErr: stat, detailedErr: db, flows: flows, pi: pi, powers: dist, rowsum: rowsum };
  }

  return {
    LIMITS: LIMITS, SIG_MIX: SIG_MIX,
    makeTarget: makeTarget, quantile: quantile, findModes: findModes,
    gaussQ: gaussQ, logq: logq, qTerms: qTerms, klPQ: klPQ, outsideMass: outsideMass, qPdf: qPdf,
    laplace: laplace, momentMatch: momentMatch, nelderMead: nelderMead, minKLqp: minKLqp, klInit: klInit, compareApprox: compareApprox, evalQ: evalQ,
    chainSeed: chainSeed, initialValues: initialValues, mhInit: mhInit, mhStep: mhStep,
    acf: acf, iat: iat, splitRhat: splitRhat, diagnostics: diagnostics,
    defaultProposal3: defaultProposal3, mhMatrix: mhMatrix
  };
});
