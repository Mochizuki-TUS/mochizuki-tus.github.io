/* =====================================================================
   mlcore.js — 発展教材「機械学習」シミュレーターの数値計算ライブラリ
   ---------------------------------------------------------------------
   ・DOM に触れない．ブラウザでは window.MLCore，Node では module.exports．
   ・外部依存なし（file:// でも動く）．
   ・逆行列を返す関数は置かない（Cholesky・LU・QR・SVD・連立方程式で解く）．
   ・数値の安定性：log-sum-exp，Cholesky のジッター，負の分散の 0 への丸め，
     分母 0 の検出（null と理由を返す）．
   ・行列は「行の配列」number[][]（A[i][j] が i 行 j 列），ベクトルは number[]．
   API の説明は MarkDown/261112_ml_textbook_work/SPEC_SIM_API.md．
   ===================================================================== */
(function (root, factory) {
  'use strict';
  var lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  if (root) root.MLCore = lib;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  var LN_SQRT_2PI = 0.9189385332046727; /* ln √(2π) */
  var SQRT2 = Math.SQRT2;
  var EPS = 2.220446049250313e-16;

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
  function linspace(a, b, n) {
    n = Math.max(1, n | 0);
    if (n === 1) return [a];
    var out = new Array(n), h = (b - a) / (n - 1);
    for (var i = 0; i < n; i++) out[i] = a + i * h;
    out[n - 1] = b;
    return out;
  }
  function allFinite(arr) {
    if (typeof arr === 'number') return isFinite(arr);
    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      if (Array.isArray(v) || (v && v.length !== undefined && typeof v !== 'string')) { if (!allFinite(v)) return false; }
      else if (!isFinite(v)) return false;
    }
    return true;
  }

  /* =================================================================
     1. 乱数（mulberry32．既存 SIM の fracture-simulator.html と同じ生成器）
     ================================================================= */
  function rng(seed) {
    var s0 = (Math.floor(Number(seed) || 0) >>> 0);
    var a = s0;
    var cachedNormal = null;
    function next() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    var R = {
      seed: s0,
      /* [0,1) の一様乱数 */
      uniform: function (lo, hi) {
        var u = next();
        if (lo === undefined) return u;
        return lo + (hi - lo) * u;
      },
      /* 標準 Gauss 乱数（Box–Muller．2 個目を保存して使う） */
      normal: function (mu, sigma) {
        var z;
        if (cachedNormal !== null) { z = cachedNormal; cachedNormal = null; }
        else {
          var u1 = 1 - next(), u2 = next();      /* u1 ∈ (0,1] で ln 0 を避ける */
          var r = Math.sqrt(-2 * Math.log(u1)), th = 2 * Math.PI * u2;
          z = r * Math.cos(th); cachedNormal = r * Math.sin(th);
        }
        if (mu === undefined) return z;
        return mu + (sigma === undefined ? 1 : sigma) * z;
      },
      /* Gamma(k, 1)（形 k，尺度 1）．Marsaglia–Tsang 法．k<1 は k+1 から変換 */
      gamma: function (k) {
        if (!(k > 0)) throw new Error('rng.gamma: k > 0 が必要です');
        if (k < 1) {
          var g = R.gamma(k + 1), u = 1 - next();
          return g * Math.pow(u, 1 / k);
        }
        var d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
        for (;;) {
          var x, v;
          do { x = R.normal(); v = 1 + c * x; } while (v <= 0);
          v = v * v * v;
          var u2 = 1 - next();
          if (u2 < 1 - 0.0331 * x * x * x * x) return d * v;
          if (Math.log(u2) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
        }
      },
      beta: function (a, b) {
        var x = R.gamma(a), y = R.gamma(b);
        var s = x + y;
        return s > 0 ? x / s : (next() < a / (a + b) ? 1 : 0);
      },
      /* 標準 Cauchy 乱数（x0=0, γ=1） */
      cauchy: function (x0, gam) {
        var u = next();
        while (u === 0 || u === 0.5) u = next();
        var z = Math.tan(Math.PI * (u - 0.5));
        if (x0 === undefined) return z;
        return x0 + (gam === undefined ? 1 : gam) * z;
      },
      bernoulli: function (p) { return next() < p ? 1 : 0; },
      /* 二項乱数（n 回の Bernoulli の和．n は 10^6 まで） */
      binomial: function (n, p) {
        n = n | 0; if (n > 1e6) throw new Error('rng.binomial: n は 10^6 まで');
        var c = 0; for (var i = 0; i < n; i++) if (next() < p) c++;
        return c;
      },
      /* Poisson 乱数．λ<30 は Knuth の積の方法，λ≥30 は PTRS（Hörmann 1993．NumPy と同じ方式） */
      poisson: function (lam) {
        if (!(lam >= 0)) throw new Error('rng.poisson: λ ≥ 0 が必要です');
        if (lam === 0) return 0;
        if (lam < 30) {
          var L = Math.exp(-lam), k = 0, p = 1;
          do { k++; p *= next(); } while (p > L);
          return k - 1;
        }
        var slam = Math.sqrt(lam), loglam = Math.log(lam);
        var b = 0.931 + 2.53 * slam, a = -0.059 + 0.02483 * b;
        var invalpha = 1.1239 + 1.1328 / (b - 3.4), vr = 0.9277 - 3.6224 / (b - 2);
        for (;;) {
          var U = next() - 0.5, V = next();
          var us = 0.5 - Math.abs(U);
          var kk = Math.floor((2 * a / us + b) * U + lam + 0.43);
          if (us >= 0.07 && V <= vr) return kk;
          if (kk < 0 || (us < 0.013 && V > us)) continue;
          if (Math.log(V) + Math.log(invalpha) - Math.log(a / (us * us) + b) <= -lam + kk * loglam - lgamma(kk + 1)) return kk;
        }
      },
      /* 0, 1, …, n−1 の一様な整数 */
      int: function (n) { return Math.floor(next() * n); },
      /* 重み（和が 1 でなくてよい．負は不可）に比例して添字を返す */
      categorical: function (probs) {
        var s = 0, i;
        for (i = 0; i < probs.length; i++) { if (!(probs[i] >= 0)) throw new Error('rng.categorical: 負または NaN の重み'); s += probs[i]; }
        if (!(s > 0)) throw new Error('rng.categorical: 重みの和が 0');
        var u = next() * s, c = 0;
        for (i = 0; i < probs.length; i++) { c += probs[i]; if (u < c) return i; }
        for (i = probs.length - 1; i >= 0; i--) if (probs[i] > 0) return i;
        return probs.length - 1;
      },
      /* Fisher–Yates．配列をその場で並べ替え，同じ配列を返す */
      shuffle: function (arr) {
        for (var i = arr.length - 1; i > 0; i--) {
          var j = Math.floor(next() * (i + 1));
          var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
      },
      /* 0..n−1 の並べ替え */
      permutation: function (n) { var p = []; for (var i = 0; i < n; i++) p.push(i); return R.shuffle(p); }
    };
    return R;
  }

  /* =================================================================
     2. 特殊関数
     ================================================================= */
  /* ln Γ(x)．Lanczos 近似（g=7, n=9）．x<0.5 は相反公式．x≤0 の整数では Infinity */
  var LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) {
      if (x === Math.floor(x)) return Infinity;
      return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    }
    x -= 1;
    var a = LANCZOS[0], t = x + 7.5;
    for (var i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
    return LN_SQRT_2PI + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function gammaFn(x) {
    if (x === Math.floor(x) && x <= 0) return NaN;
    if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaFn(1 - x));
    if (x > 171.6) return Infinity;
    return Math.exp(lgamma(x));
  }
  function lbeta(a, b) { return lgamma(a) + lgamma(b) - lgamma(a + b); }

  /* 正則化不完全ガンマ関数 P(a,x)，Q(a,x)=1−P（級数と連分数．Numerical Recipes の方式） */
  function gammaincSeries(a, x) {
    var ap = a, sum = 1 / a, del = sum;
    for (var n = 0; n < 100000; n++) {
      ap += 1; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-16) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  function gammaincCF(a, x) { /* Q(a,x) を返す（Lentz 法） */
    var FPMIN = 1e-300;
    var b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
    for (var i = 1; i < 100000; i++) {
      var an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-16) break;
    }
    return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }
  function gammainc(a, x) {
    if (!(a > 0)) return NaN;
    if (x <= 0) return 0;
    if (x === Infinity) return 1;
    return (x < a + 1) ? gammaincSeries(a, x) : 1 - gammaincCF(a, x);
  }
  function gammaincc(a, x) {
    if (!(a > 0)) return NaN;
    if (x <= 0) return 1;
    if (x === Infinity) return 0;
    return (x < a + 1) ? 1 - gammaincSeries(a, x) : gammaincCF(a, x);
  }

  /* 正則化不完全ベータ関数 I_x(a,b)（連分数．x>(a+1)/(a+b+2) では対称性を使う） */
  function betacf(a, b, x) {
    var FPMIN = 1e-300, qab = a + b, qap = a + 1, qam = a - 1;
    var c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d; var h = d;
    for (var m = 1; m < 100000; m++) {
      var m2 = 2 * m;
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      var del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-16) break;
    }
    return h;
  }
  function betainc(a, b, x) {
    if (!(a > 0 && b > 0)) return NaN;
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var lbt = a * Math.log(x) + b * Math.log1p(-x) - lbeta(a, b);
    if (x < (a + 1) / (a + b + 2)) return Math.exp(lbt) * betacf(a, b, x) / a;
    return 1 - Math.exp(lbt) * betacf(b, a, 1 - x) / b;
  }

  /* 単調な累積分布関数の逆関数：Newton 法＋二分法の保険（括弧 [lo,hi] を保つ） */
  function invertMonotone(F, f, p, lo, hi, x0) {
    var x = (x0 > lo && x0 < hi) ? x0 : 0.5 * (lo + hi);
    for (var it = 0; it < 400; it++) {
      var Fx = F(x) - p;
      if (Fx === 0) return x;
      if (Fx > 0) hi = x; else lo = x;
      var fx = f ? f(x) : 0, xn;
      if (fx > 0 && isFinite(fx)) xn = x - Fx / fx; else xn = NaN;
      if (!(xn > lo && xn < hi)) xn = 0.5 * (lo + hi);
      if (Math.abs(xn - x) <= 2 * EPS * Math.abs(xn)) return xn;          /* 相対誤差で判定（0 の近くでも桁を保つ） */
      if (hi - lo <= 2 * EPS * Math.max(Math.abs(lo), Math.abs(hi))) return 0.5 * (lo + hi);
      x = xn;
    }
    return x;
  }
  function betaincInv(a, b, p) {
    if (p <= 0) return 0; if (p >= 1) return 1;
    var lb = lbeta(a, b);
    var pdf = function (x) { return (x <= 0 || x >= 1) ? 0 : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x) - lb); };
    /* 初期値：平均（端の近くでは二分法が働く） */
    return invertMonotone(function (x) { return betainc(a, b, x); }, pdf, p, 0, 1, a / (a + b));
  }
  function gammaincInv(a, p) {
    if (p <= 0) return 0; if (p >= 1) return Infinity;
    var hi = Math.max(1, a);
    while (gammainc(a, hi) < p) hi *= 2;
    var la = lgamma(a);
    var pdf = function (x) { return x <= 0 ? 0 : Math.exp((a - 1) * Math.log(x) - x - la); };
    return invertMonotone(function (x) { return gammainc(a, x); }, pdf, p, 0, hi, a);
  }

  /* 誤差関数：erf(x)=sgn(x) P(1/2, x²)，erfc(x)=Q(1/2, x²)（x≥0） */
  function erf(x) {
    if (x === 0) return 0;
    var v = gammainc(0.5, x * x);
    return x > 0 ? v : -v;
  }
  function erfc(x) {
    if (x >= 0) return gammaincc(0.5, x * x);
    return 1 + gammainc(0.5, x * x);
  }
  function normPdf(x, mu, sigma) {
    mu = mu || 0; sigma = sigma === undefined ? 1 : sigma;
    var z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z - LN_SQRT_2PI) / sigma;
  }
  function normLogPdf(x, mu, sigma) {
    mu = mu || 0; sigma = sigma === undefined ? 1 : sigma;
    var z = (x - mu) / sigma;
    return -0.5 * z * z - LN_SQRT_2PI - Math.log(sigma);
  }
  /* Φ((x−μ)/σ)．裾でも相対精度を保つため erfc を使う */
  function normCdf(x, mu, sigma) {
    mu = mu || 0; sigma = sigma === undefined ? 1 : sigma;
    var z = (x - mu) / sigma;
    return 0.5 * erfc(-z / SQRT2);
  }
  /* Φ^{-1}(p)．Acklam の有理近似＋Halley 法 1 回 */
  function normInv(p, mu, sigma) {
    mu = mu || 0; sigma = sigma === undefined ? 1 : sigma;
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var pl = 0.02425, x, q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p <= 1 - pl) { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    else { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    for (var k = 0; k < 2; k++) {
      var e = normCdf(x) - p;
      var u = e * Math.sqrt(2 * Math.PI) * Math.exp(0.5 * x * x);
      x = x - u / (1 + 0.5 * x * u);
    }
    return mu + sigma * x;
  }

  /* log Σ exp(v_i)．−∞ の要素は 0 として扱う．空・全部 −∞ なら −∞ */
  function logsumexp(v) {
    var m = -Infinity, i;
    for (i = 0; i < v.length; i++) if (v[i] > m) m = v[i];
    if (m === -Infinity) return -Infinity;
    if (m === Infinity) return Infinity;
    var s = 0;
    for (i = 0; i < v.length; i++) s += Math.exp(v[i] - m);
    return m + Math.log(s);
  }
  /* softmax(v/τ)．最大値を引いて安定化．−∞（mask）は 0．全部 −∞ なら null */
  function softmax(v, tau) {
    tau = tau === undefined ? 1 : tau;
    if (!(tau > 0)) throw new Error('softmax: τ > 0 が必要です');
    var n = v.length, z = new Array(n), m = -Infinity, i;
    for (i = 0; i < n; i++) { z[i] = v[i] / tau; if (z[i] > m) m = z[i]; }
    if (m === -Infinity || !isFinite(m)) return null;
    var s = 0;
    for (i = 0; i < n; i++) { z[i] = (z[i] === -Infinity) ? 0 : Math.exp(z[i] - m); s += z[i]; }
    for (i = 0; i < n; i++) z[i] /= s;
    return z;
  }
  function logSoftmax(v, tau) {
    tau = tau === undefined ? 1 : tau;
    var z = v.map(function (x) { return x / tau; });
    var L = logsumexp(z);
    return z.map(function (x) { return x - L; });
  }
  function sigmoid(a) {
    if (a >= 0) { return 1 / (1 + Math.exp(-a)); }
    var e = Math.exp(a); return e / (1 + e);
  }
  /* ln(1+e^a) を桁あふれなく */
  function softplus(a) { return a > 0 ? a + Math.log1p(Math.exp(-a)) : Math.log1p(Math.exp(a)); }

  /* =================================================================
     3. 線形代数（小さな密行列．行の配列）
     ================================================================= */
  function zeros(n, m) { var A = new Array(n); for (var i = 0; i < n; i++) { A[i] = new Array(m); for (var j = 0; j < m; j++) A[i][j] = 0; } return A; }
  function eye(n) { var A = zeros(n, n); for (var i = 0; i < n; i++) A[i][i] = 1; return A; }
  function copyMat(A) { return A.map(function (r) { return r.slice(); }); }
  function shape(A) { return [A.length, A.length ? A[0].length : 0]; }
  function transpose(A) { var n = A.length, m = n ? A[0].length : 0, T = zeros(m, n); for (var i = 0; i < n; i++) for (var j = 0; j < m; j++) T[j][i] = A[i][j]; return T; }
  function dot(x, y) { var s = 0; for (var i = 0; i < x.length; i++) s += x[i] * y[i]; return s; }
  function norm(x) { var s = 0, sc = 0, i; for (i = 0; i < x.length; i++) sc = Math.max(sc, Math.abs(x[i])); if (sc === 0) return 0; for (i = 0; i < x.length; i++) { var t = x[i] / sc; s += t * t; } return sc * Math.sqrt(s); }
  function matmul(A, B) {
    var n = A.length, k = B.length, m = k ? B[0].length : 0, C = zeros(n, m);
    if (n && A[0].length !== k) throw new Error('matmul: 形が合いません ' + A[0].length + ' と ' + k);
    for (var i = 0; i < n; i++) { var Ai = A[i], Ci = C[i]; for (var p = 0; p < k; p++) { var a = Ai[p]; if (a === 0) continue; var Bp = B[p]; for (var j = 0; j < m; j++) Ci[j] += a * Bp[j]; } }
    return C;
  }
  function matvec(A, x) { var n = A.length, y = new Array(n); for (var i = 0; i < n; i++) y[i] = dot(A[i], x); return y; }
  /* A^T x */
  function matTvec(A, x) { var n = A.length, m = n ? A[0].length : 0, y = new Array(m).fill(0); for (var i = 0; i < n; i++) for (var j = 0; j < m; j++) y[j] += A[i][j] * x[i]; return y; }
  function outer(x, y) { return x.map(function (a) { return y.map(function (b) { return a * b; }); }); }
  function addMat(A, B, s) { s = s === undefined ? 1 : s; return A.map(function (r, i) { return r.map(function (v, j) { return v + s * B[i][j]; }); }); }
  function scaleMat(A, s) { return A.map(function (r) { return r.map(function (v) { return v * s; }); }); }
  function addVec(x, y, s) { s = s === undefined ? 1 : s; return x.map(function (v, i) { return v + s * y[i]; }); }
  function scaleVec(x, s) { return x.map(function (v) { return v * s; }); }
  function diagOf(A) { return A.map(function (r, i) { return r[i]; }); }
  function diagMat(v) { var A = zeros(v.length, v.length); for (var i = 0; i < v.length; i++) A[i][i] = v[i]; return A; }

  /* Cholesky 分解 A = L L^T．正定値でない（または NaN を含む）なら null */
  function cholesky(A) {
    var n = A.length, L = zeros(n, n);
    for (var j = 0; j < n; j++) {
      var s = A[j][j];
      for (var k = 0; k < j; k++) s -= L[j][k] * L[j][k];
      /* 丸め誤差の範囲で 0 以下（ピボット ≤ n·ε·A_jj）なら，数値的に正定値でないとみなす */
      if (!(s > n * EPS * Math.abs(A[j][j])) || !isFinite(s)) return null;
      var d = Math.sqrt(s); L[j][j] = d;
      for (var i = j + 1; i < n; i++) {
        var t = A[i][j];
        for (var k2 = 0; k2 < j; k2++) t -= L[i][k2] * L[j][k2];
        L[i][j] = t / d;
      }
    }
    return L;
  }
  /* ジッター付き Cholesky：失敗したら対角に jitter = rel × (対角の平均) を足して再試行（10 倍ずつ） */
  function choleskySafe(A, opt) {
    opt = opt || {};
    var L = cholesky(A);
    if (L) return { L: L, jitter: 0 };
    var n = A.length, md = 0;
    for (var i = 0; i < n; i++) md += Math.abs(A[i][i]);
    md = n ? md / n : 1; if (!(md > 0)) md = 1;
    var rel = opt.rel || 1e-10, tries = opt.maxTries || 8, factor = opt.factor || 10;
    for (var t = 0; t < tries; t++) {
      var jit = rel * md * Math.pow(factor, t);
      var B = copyMat(A);
      for (var k = 0; k < n; k++) B[k][k] += jit;
      L = cholesky(B);
      if (L) return { L: L, jitter: jit };
    }
    return { L: null, jitter: NaN };
  }
  /* L x = b（L は下三角） */
  function solveLower(L, b) {
    var n = L.length, x = new Array(n);
    for (var i = 0; i < n; i++) { var s = b[i]; for (var k = 0; k < i; k++) s -= L[i][k] * x[k]; x[i] = s / L[i][i]; }
    return x;
  }
  /* U x = b（U は上三角） */
  function solveUpper(U, b) {
    var n = U.length, x = new Array(n);
    for (var i = n - 1; i >= 0; i--) { var s = b[i]; for (var k = i + 1; k < n; k++) s -= U[i][k] * x[k]; x[i] = s / U[i][i]; }
    return x;
  }
  /* L^T x = b（L は下三角．転置を作らずに後退代入） */
  function solveLowerT(L, b) {
    var n = L.length, x = new Array(n);
    for (var i = n - 1; i >= 0; i--) { var s = b[i]; for (var k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; }
    return x;
  }
  function isMatrix(b) { return Array.isArray(b) && Array.isArray(b[0]); }
  function mapColumns(B, f) { /* B の各列に f を適用して行列で返す */
    var cols = transpose(B).map(f); return transpose(cols);
  }
  /* (L L^T) x = b．b がベクトルならベクトル，行列なら各列を解いた行列 */
  function cholSolve(L, b) {
    if (isMatrix(b)) return mapColumns(b, function (c) { return solveLowerT(L, solveLower(L, c)); });
    return solveLowerT(L, solveLower(L, b));
  }
  function logdetChol(L) { var s = 0; for (var i = 0; i < L.length; i++) s += Math.log(L[i][i]); return 2 * s; }
  /* LU 分解（部分ピボット）．特異なら null */
  function lu(A) {
    var n = A.length, M = copyMat(A), piv = [], sign = 1, i, j, k, scale = 0;
    for (i = 0; i < n; i++) { piv.push(i); for (j = 0; j < n; j++) scale = Math.max(scale, Math.abs(M[i][j])); }
    if (!(scale > 0)) return null;
    for (k = 0; k < n; k++) {
      var p = k, mx = Math.abs(M[k][k]);
      for (i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > mx) { mx = Math.abs(M[i][k]); p = i; }
      if (!(mx > n * EPS * scale)) return null;
      if (p !== k) { var t = M[p]; M[p] = M[k]; M[k] = t; var tp = piv[p]; piv[p] = piv[k]; piv[k] = tp; sign = -sign; }
      for (i = k + 1; i < n; i++) {
        var f = M[i][k] / M[k][k]; M[i][k] = f;
        if (f !== 0) for (j = k + 1; j < n; j++) M[i][j] -= f * M[k][j];
      }
    }
    return { LU: M, piv: piv, sign: sign };
  }
  function luSolveFactored(F, b) {
    var n = F.LU.length, x = new Array(n), i, k;
    for (i = 0; i < n; i++) { var s = b[F.piv[i]]; for (k = 0; k < i; k++) s -= F.LU[i][k] * x[k]; x[i] = s; }
    for (i = n - 1; i >= 0; i--) { var s2 = x[i]; for (k = i + 1; k < n; k++) s2 -= F.LU[i][k] * x[k]; x[i] = s2 / F.LU[i][i]; }
    return x;
  }
  /* A x = b を LU（部分ピボット）で解く．特異なら null．b は行列でもよい */
  function luSolve(A, b) {
    var F = lu(A); if (!F) return null;
    if (isMatrix(b)) return mapColumns(b, function (c) { return luSolveFactored(F, c); });
    return luSolveFactored(F, b);
  }
  function det(A) { var F = lu(A); if (!F) return 0; var d = F.sign; for (var i = 0; i < A.length; i++) d *= F.LU[i][i]; return d; }

  /* Householder QR（m ≥ n）．薄い Q（m×n）と R（n×n） */
  function householder(A) {
    var m = A.length, n = A[0].length, R = copyMat(A), vs = [], i, j, k;
    for (k = 0; k < Math.min(n, m); k++) {
      var x = []; for (i = k; i < m; i++) x.push(R[i][k]);
      var nx = norm(x);
      if (nx === 0) { vs.push(null); continue; }
      var alpha = x[0] > 0 ? -nx : nx;
      var v = x.slice(); v[0] -= alpha;
      var nv = norm(v);
      if (nv === 0) { vs.push(null); continue; }
      for (i = 0; i < v.length; i++) v[i] /= nv;
      vs.push(v);
      for (j = k; j < n; j++) {
        var s = 0; for (i = k; i < m; i++) s += v[i - k] * R[i][j];
        for (i = k; i < m; i++) R[i][j] -= 2 * v[i - k] * s;
      }
    }
    return { R: R, vs: vs, m: m, n: n };
  }
  function applyQt(H, y) { /* Q^T y */
    var z = y.slice(), m = H.m;
    for (var k = 0; k < H.vs.length; k++) {
      var v = H.vs[k]; if (!v) continue;
      var s = 0, i; for (i = k; i < m; i++) s += v[i - k] * z[i];
      for (i = k; i < m; i++) z[i] -= 2 * v[i - k] * s;
    }
    return z;
  }
  function qr(A) {
    var m = A.length, n = A[0].length;
    if (m < n) throw new Error('qr: 行数 ≥ 列数 が必要です');
    var H = householder(A), Q = zeros(m, n), R = zeros(n, n), i, j;
    for (i = 0; i < n; i++) for (j = i; j < n; j++) R[i][j] = H.R[i][j];
    for (j = 0; j < n; j++) { /* Q e_j を作る */
      var e = new Array(m).fill(0); e[j] = 1;
      for (var k = H.vs.length - 1; k >= 0; k--) {
        var v = H.vs[k]; if (!v) continue;
        var s = 0; for (i = k; i < m; i++) s += v[i - k] * e[i];
        for (i = k; i < m; i++) e[i] -= 2 * v[i - k] * s;
      }
      for (i = 0; i < m; i++) Q[i][j] = e[i];
    }
    return { Q: Q, R: R };
  }
  /* 最小二乗 min ‖A x − y‖（Householder QR．正規方程式は作らない）．
     戻り値 {x, residual (‖Ax−y‖), rankDeficient, rcondEst} */
  function lstsq(A, y) {
    var m = A.length, n = A[0].length;
    if (m < n) throw new Error('lstsq: データ数 ≥ 未知数 が必要です（正則化つきは ridge を使う）');
    var H = householder(A), z = applyQt(H, y), R = H.R;
    var dmax = 0, dmin = Infinity, i;
    for (i = 0; i < n; i++) { var d = Math.abs(R[i][i]); dmax = Math.max(dmax, d); dmin = Math.min(dmin, d); }
    var rankDef = !(dmin > dmax * 1e-12);
    var Rn = []; for (i = 0; i < n; i++) Rn.push(R[i].slice(0, n));
    var x = rankDef ? null : solveUpper(Rn, z.slice(0, n));
    var res = 0; for (i = n; i < m; i++) res += z[i] * z[i];
    return { x: x, residual: Math.sqrt(res), rankDeficient: rankDef, rcondEst: dmax > 0 ? dmin / dmax : 0 };
  }
  /* Ridge：min ½‖y − A w‖² + (λ/2)‖w‖² を [A; √λ I] w ≈ [y; 0] の QR で解く */
  function ridge(A, y, lambda) {
    if (!(lambda > 0)) return lstsq(A, y);
    var n = A[0].length, s = Math.sqrt(lambda), B = copyMat(A), yy = y.slice();
    for (var j = 0; j < n; j++) { var row = new Array(n).fill(0); row[j] = s; B.push(row); yy.push(0); }
    var r = lstsq(B, yy);
    if (r.x) { var e = addVec(matvec(A, r.x), y, -1); r.residual = norm(e); }
    return r;
  }

  /* 対称行列の固有分解（巡回 Jacobi 法）．
     戻り値 {values, vectors, V}：values は既定で降順，vectors[i] が values[i] の固有ベクトル（単位長），
     V は固有ベクトルを列に並べた行列（A V = V diag(values)） */
  function eigSym(A, opt) {
    opt = opt || {};
    var n = A.length, M = copyMat(A), V = eye(n), i, j, p, q;
    for (var sweep = 0; sweep < 100; sweep++) {
      var off = 0, tot = 0;
      for (i = 0; i < n; i++) for (j = 0; j < n; j++) { var a2 = M[i][j] * M[i][j]; tot += a2; if (i !== j) off += a2; }
      if (off <= 1e-30 * Math.max(tot, 1e-300) || off === 0) break;
      for (p = 0; p < n - 1; p++) for (q = p + 1; q < n; q++) {
        var apq = M[p][q];
        if (Math.abs(apq) < 1e-300) continue;
        var theta = (M[q][q] - M[p][p]) / (2 * apq);
        var t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        var c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (var k = 0; k < n; k++) { /* 列 p, q の回転 */
          var mkp = M[k][p], mkq = M[k][q];
          M[k][p] = c * mkp - s * mkq; M[k][q] = s * mkp + c * mkq;
        }
        for (k = 0; k < n; k++) { /* 行 p, q の回転 */
          var mpk = M[p][k], mqk = M[q][k];
          M[p][k] = c * mpk - s * mqk; M[q][k] = s * mpk + c * mqk;
        }
        for (k = 0; k < n; k++) {
          var vkp = V[k][p], vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq;
        }
      }
    }
    var idx = []; for (i = 0; i < n; i++) idx.push(i);
    var asc = opt.order === 'asc';
    idx.sort(function (x, y) { return asc ? M[x][x] - M[y][y] : M[y][y] - M[x][x]; });
    var values = idx.map(function (k) { return M[k][k]; });
    var vectors = idx.map(function (k) {
      var v = V.map(function (r) { return r[k]; });
      /* 符号をそろえる：絶対値最大の成分を正に */
      var big = 0; for (var t2 = 1; t2 < v.length; t2++) if (Math.abs(v[t2]) > Math.abs(v[big])) big = t2;
      return v[big] < 0 ? v.map(function (x) { return -x; }) : v;
    });
    return { values: values, vectors: vectors, V: transpose(vectors) };
  }

  /* 特異値分解 A = U diag(s) V^T（片側 Jacobi 法）．k = min(m,n)．
     戻り値 {U (m×k), s (降順，長さ k), V (n×k)} */
  function svd(A) {
    var m = A.length, n = A[0].length;
    if (m < n) { var r = svd(transpose(A)); return { U: r.V, s: r.s, V: r.U }; }
    var U = copyMat(A), V = eye(n), i, j, k;
    for (var sweep = 0; sweep < 100; sweep++) {
      var rot = 0;
      for (i = 0; i < n - 1; i++) for (j = i + 1; j < n; j++) {
        var alpha = 0, beta = 0, gamma = 0;
        for (k = 0; k < m; k++) { alpha += U[k][i] * U[k][i]; beta += U[k][j] * U[k][j]; gamma += U[k][i] * U[k][j]; }
        if (Math.abs(gamma) <= 1e-15 * Math.sqrt(alpha * beta) || gamma === 0) continue;
        rot++;
        var zeta = (beta - alpha) / (2 * gamma);
        var t = (zeta >= 0 ? 1 : -1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
        var c = 1 / Math.sqrt(1 + t * t), s = c * t;
        for (k = 0; k < m; k++) { var ui = U[k][i], uj = U[k][j]; U[k][i] = c * ui - s * uj; U[k][j] = s * ui + c * uj; }
        for (k = 0; k < n; k++) { var vi = V[k][i], vj = V[k][j]; V[k][i] = c * vi - s * vj; V[k][j] = s * vi + c * vj; }
      }
      if (rot === 0) break;
    }
    var sv = []; for (j = 0; j < n; j++) { var col = U.map(function (row) { return row[j]; }); sv.push(norm(col)); }
    var idx = []; for (j = 0; j < n; j++) idx.push(j);
    idx.sort(function (a, b) { return sv[b] - sv[a]; });
    var Uo = zeros(m, n), Vo = zeros(n, n), so = [];
    idx.forEach(function (jj, c2) {
      var sj = sv[jj]; so.push(sj);
      var sg = 1; /* 符号：V の絶対値最大の成分を正に */
      var big = 0; for (k = 1; k < n; k++) if (Math.abs(V[k][jj]) > Math.abs(V[big][jj])) big = k;
      if (V[big][jj] < 0) sg = -1;
      for (k = 0; k < n; k++) Vo[k][c2] = sg * V[k][jj];
      for (k = 0; k < m; k++) Uo[k][c2] = sj > 0 ? sg * U[k][jj] / sj : 0;
    });
    return { U: Uo, s: so, V: Vo };
  }

  /* =================================================================
     4. 統計
     ================================================================= */
  function sum(x) { var s = 0, c = 0; for (var i = 0; i < x.length; i++) { var y = x[i] - c, t = s + y; c = (t - s) - y; s = t; } return s; } /* Kahan */
  function mean(x) { return x.length ? sum(x) / x.length : null; }
  /* 分散．ddof=0（既定．N で割る）または 1（N−1 で割る）．データ不足なら null */
  function variance(x, ddof) {
    ddof = ddof || 0; var n = x.length;
    if (n - ddof <= 0) return null;
    var m = mean(x), s = 0;
    for (var i = 0; i < n; i++) { var d = x[i] - m; s += d * d; }
    return s / (n - ddof);
  }
  function std(x, ddof) { var v = variance(x, ddof); return v === null ? null : Math.sqrt(v); }
  /* 分位点（NumPy の既定と同じ線形補間．q ∈ [0,1]．q は配列でもよい） */
  function quantile(x, q) {
    if (!x.length) return null;
    var s = x.slice().sort(function (a, b) { return a - b; }), n = s.length;
    function one(qq) { var h = (n - 1) * clamp(qq, 0, 1), lo = Math.floor(h), hi = Math.min(n - 1, lo + 1); return s[lo] + (h - lo) * (s[hi] - s[lo]); }
    return Array.isArray(q) ? q.map(one) : one(q);
  }
  function median(x) { return quantile(x, 0.5); }
  /* 自己相関関数 ρ_k（k=0..maxLag．分母は N で割る標準的な推定量）．分散 0 なら null */
  function autocorr(x, maxLag) {
    var n = x.length; if (n < 2) return null;
    maxLag = Math.min(maxLag === undefined ? n - 1 : maxLag, n - 1);
    var m = mean(x), c0 = 0, i, k;
    for (i = 0; i < n; i++) c0 += (x[i] - m) * (x[i] - m);
    if (!(c0 > 0)) return null;
    var r = new Array(maxLag + 1);
    for (k = 0; k <= maxLag; k++) { var s = 0; for (i = 0; i + k < n; i++) s += (x[i] - m) * (x[i + k] - m); r[k] = s / c0; }
    return r;
  }
  /* 積分自己相関時間 τ = 1 + 2 Σ_{k=1}^{W} ρ_k（Sokal の自動窓：W ≥ c τ となる最小の W．c=5）．
     戻り値 {tau, window, ok}．ok=false は窓が系列長の 1/2 に届いた（系列が短すぎる）とき */
  function iat(x, opt) {
    opt = opt || {}; var c = opt.c || 5, n = x.length;
    var rho = autocorr(x, Math.floor(n / 2));
    if (!rho) return { tau: null, window: 0, ok: false };
    var tau = 1;
    for (var W = 1; W < rho.length; W++) {
      tau += 2 * rho[W];
      if (W >= c * tau) return { tau: Math.max(tau, 1e-12), window: W, ok: true };
    }
    return { tau: Math.max(tau, 1e-12), window: rho.length - 1, ok: false };
  }
  /* 有効標本数 N/τ */
  function ess(x, opt) { var r = iat(x, opt); return r.tau === null ? null : x.length / r.tau; }
  /* Gelman–Rubin の R̂（chains：同じ長さの配列の配列．split=true で各連鎖を前後半に分ける） */
  function rhat(chains, opt) {
    opt = opt || {};
    var cs = chains;
    if (opt.split) { cs = []; chains.forEach(function (c) { var h = Math.floor(c.length / 2); cs.push(c.slice(0, h)); cs.push(c.slice(c.length - h)); }); }
    var M = cs.length; if (M < 2) return null;
    var n = Math.min.apply(null, cs.map(function (c) { return c.length; }));
    if (n < 2) return null;
    cs = cs.map(function (c) { return c.slice(0, n); });
    var means = cs.map(mean), grand = mean(means);
    var B = 0; means.forEach(function (m) { B += (m - grand) * (m - grand); }); B *= n / (M - 1);
    var Wv = mean(cs.map(function (c) { return variance(c, 1); }));
    if (!(Wv > 0)) return null;
    var varPlus = (n - 1) / n * Wv + B / n;
    return Math.sqrt(varPlus / Wv);
  }
  /* ヒストグラム {edges (bins+1), counts, density, outside}（range 外の個数は outside） */
  function histogram(x, opt) {
    opt = opt || {}; var bins = opt.bins || 20;
    var lo = opt.range ? opt.range[0] : Math.min.apply(null, x), hi = opt.range ? opt.range[1] : Math.max.apply(null, x);
    if (!(hi > lo)) hi = lo + 1;
    var edges = linspace(lo, hi, bins + 1), counts = new Array(bins).fill(0), outside = 0, w = (hi - lo) / bins;
    for (var i = 0; i < x.length; i++) {
      var v = x[i];
      if (!(v >= lo && v <= hi)) { outside++; continue; }
      var b = Math.min(bins - 1, Math.floor((v - lo) / w)); counts[b]++;
    }
    var n = x.length;
    return { edges: edges, counts: counts, density: counts.map(function (c) { return n ? c / (n * w) : 0; }), outside: outside };
  }
  /* 標本共分散行列（X：N×D，行が標本）．ddof 既定 0 */
  function covMatrix(X, ddof) {
    ddof = ddof || 0; var N = X.length, D = X[0].length, mu = new Array(D).fill(0), i, j, k;
    for (i = 0; i < N; i++) for (j = 0; j < D; j++) mu[j] += X[i][j] / N;
    var S = zeros(D, D);
    for (i = 0; i < N; i++) for (j = 0; j < D; j++) for (k = j; k < D; k++) S[j][k] += (X[i][j] - mu[j]) * (X[i][k] - mu[k]);
    for (j = 0; j < D; j++) for (k = j; k < D; k++) { S[j][k] /= (N - ddof); S[k][j] = S[j][k]; }
    return { mean: mu, S: S };
  }
  /* 負の分散（丸め誤差）を 0 に．戻り値 {value, clipped} */
  function clipVar(v) { return (v < 0 || v === 0) ? { value: 0, clipped: v < 0 } : { value: v, clipped: false }; }

  /* =================================================================
     5. 確率分布
     すべて {name, params, discrete, support:[lo,hi], pdf, logpdf, cdf, ppf, sample(rng),
             mean, variance, meanNote, varianceNote} を返す．
     mean / variance は存在しなければ null，その理由を meanNote / varianceNote に書く．
     離散分布の pdf は確率質量関数（整数以外では 0）．
     ================================================================= */
  function mk(o) {
    o.meanNote = o.meanNote || ''; o.varianceNote = o.varianceNote || '';
    o.std = (o.variance === null) ? null : Math.sqrt(o.variance);
    if (!o.logpdf) o.logpdf = function (x) { return Math.log(o.pdf(x)); };
    return o;
  }
  function need(cond, msg) { if (!cond) throw new Error(msg); }
  function isInt(k) { return k === Math.floor(k); }
  function discretePpf(cdf, p, lo, hi) { /* 最小の k で cdf(k) ≥ p */
    if (p <= 0) return lo;
    var a = lo, b = isFinite(hi) ? hi : Math.max(lo + 1, 1);
    while (!isFinite(hi) && cdf(b) < p) b *= 2;
    while (a < b) { var mid = Math.floor((a + b) / 2); if (cdf(mid) >= p * (1 - 1e-12)) b = mid; else a = mid + 1; }
    return a;
  }
  var dist = {
    /* Bernoulli({mu})：p(x)=μ^x(1−μ)^{1−x} */
    bernoulli: function (P) {
      var mu = P.mu; need(mu >= 0 && mu <= 1, 'bernoulli: 0 ≤ μ ≤ 1');
      return mk({ name: 'bernoulli', params: { mu: mu }, discrete: true, support: [0, 1],
        pdf: function (x) { return x === 1 ? mu : (x === 0 ? 1 - mu : 0); },
        cdf: function (x) { return x < 0 ? 0 : (x < 1 ? 1 - mu : 1); },
        ppf: function (p) { return p <= 1 - mu ? 0 : 1; },
        sample: function (r) { return r.bernoulli(mu); },
        mean: mu, variance: mu * (1 - mu) });
    },
    /* 二項 binomial({n, mu}) */
    binomial: function (P) {
      var n = P.n, mu = P.mu; need(n >= 0 && isInt(n) && mu >= 0 && mu <= 1, 'binomial: n は 0 以上の整数，0 ≤ μ ≤ 1');
      var lp = function (k) {
        if (k < 0 || k > n || !isInt(k)) return -Infinity;
        var c = lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
        var t1 = k === 0 ? 0 : (mu === 0 ? -Infinity : k * Math.log(mu));
        var t2 = (n - k) === 0 ? 0 : (mu === 1 ? -Infinity : (n - k) * Math.log1p(-mu));
        return c + t1 + t2;
      };
      var cdf = function (x) { var k = Math.floor(x); if (k < 0) return 0; if (k >= n) return 1; return betainc(n - k, k + 1, 1 - mu); };
      return mk({ name: 'binomial', params: { n: n, mu: mu }, discrete: true, support: [0, n],
        pdf: function (k) { return Math.exp(lp(k)); }, logpdf: lp, cdf: cdf,
        ppf: function (p) { return discretePpf(cdf, p, 0, n); },
        sample: function (r) { return r.binomial(n, mu); },
        mean: n * mu, variance: n * mu * (1 - mu) });
    },
    /* Poisson({lambda}) */
    poisson: function (P) {
      var lam = P.lambda; need(lam > 0, 'poisson: λ > 0');
      var lp = function (k) { if (k < 0 || !isInt(k)) return -Infinity; return k * Math.log(lam) - lam - lgamma(k + 1); };
      var cdf = function (x) { var k = Math.floor(x); if (k < 0) return 0; return gammaincc(k + 1, lam); };
      return mk({ name: 'poisson', params: { lambda: lam }, discrete: true, support: [0, Infinity],
        pdf: function (k) { return Math.exp(lp(k)); }, logpdf: lp, cdf: cdf,
        ppf: function (p) { return discretePpf(cdf, p, 0, Infinity); },
        sample: function (r) { return r.poisson(lam); },
        mean: lam, variance: lam });
    },
    /* Gauss({mu, sigma})．sigma は標準偏差（分散は sigma²）．本文の N(x|μ,σ²) と対応 */
    gauss: function (P) {
      var mu = P.mu || 0, s = P.sigma === undefined ? 1 : P.sigma; need(s > 0, 'gauss: σ > 0');
      return mk({ name: 'gauss', params: { mu: mu, sigma: s }, discrete: false, support: [-Infinity, Infinity],
        pdf: function (x) { return normPdf(x, mu, s); }, logpdf: function (x) { return normLogPdf(x, mu, s); },
        cdf: function (x) { return normCdf(x, mu, s); }, ppf: function (p) { return normInv(p, mu, s); },
        sample: function (r) { return r.normal(mu, s); },
        mean: mu, variance: s * s });
    },
    /* Cauchy({x0, gamma})．gamma は半値半幅（半値全幅は 2γ） */
    cauchy: function (P) {
      var x0 = P.x0 || 0, g = P.gamma === undefined ? 1 : P.gamma; need(g > 0, 'cauchy: γ > 0');
      return mk({ name: 'cauchy', params: { x0: x0, gamma: g }, discrete: false, support: [-Infinity, Infinity],
        pdf: function (x) { var z = (x - x0) / g; return 1 / (Math.PI * g * (1 + z * z)); },
        logpdf: function (x) { var z = (x - x0) / g; return -Math.log(Math.PI * g) - Math.log1p(z * z); },
        /* F(x) = 1/2 + atan(z)/π．z<0 では F = atan(−1/z)/π = atan(1/|z|)/π（1/2 との打ち消しを避け，左の裾でも相対精度を保つ．2026-11-12 L2） */
        cdf: function (x) {
          var z = (x - x0) / g;
          if (Number.isNaN(z)) return NaN;
          if (z < 0) return z === -Infinity ? 0 : Math.atan(-1 / z) / Math.PI;
          return 0.5 + Math.atan(z) / Math.PI;
        },
        /* 生存関数 1 − F(x)（右の裾の精度用）：z>0 では atan(1/z)/π */
        sf: function (x) {
          var z = (x - x0) / g;
          if (Number.isNaN(z)) return NaN;
          if (z > 0) return z === Infinity ? 0 : Math.atan(1 / z) / Math.PI;
          return 0.5 - Math.atan(z) / Math.PI;
        },
        /* F⁻¹(p) = x0 + γ tan(π(p − 1/2))．p<1/2 では −γ/tan(πp)（左の裾で p を丸めない），p>1/2 では γ/tan(π(1−p)) */
        ppf: function (p) {
          if (!(p >= 0 && p <= 1)) return NaN;
          if (p === 0) return -Infinity; if (p === 1) return Infinity;
          if (p === 0.5) return x0;
          if (p < 0.5) return x0 - g / Math.tan(Math.PI * p);
          return x0 + g / Math.tan(Math.PI * (1 - p));
        },
        isf: function (q) {
          if (!(q >= 0 && q <= 1)) return NaN;
          if (q === 0) return Infinity; if (q === 1) return -Infinity;
          if (q === 0.5) return x0;
          if (q < 0.5) return x0 + g / Math.tan(Math.PI * q);
          return x0 - g / Math.tan(Math.PI * (1 - q));
        },
        sample: function (r) { return r.cauchy(x0, g); },
        mean: null, meanNote: '∫|x| p(x) dx が発散するため，平均は存在しません（主値は x0 ですが期待値ではありません）．',
        variance: null, varianceNote: '∫x² p(x) dx が発散するため，分散は存在しません．' });
    },
    /* Gamma({a, b})：p(x)=b^a x^{a−1} e^{−bx}/Γ(a)．a は形，b は率（rate．尺度は 1/b） */
    gamma: function (P) {
      var a = P.a, b = P.b; need(a > 0 && b > 0, 'gamma: a > 0, b > 0');
      var lp = function (x) { if (x < 0) return -Infinity; if (x === 0) return a < 1 ? Infinity : (a === 1 ? Math.log(b) : -Infinity); return a * Math.log(b) + (a - 1) * Math.log(x) - b * x - lgamma(a); };
      return mk({ name: 'gamma', params: { a: a, b: b }, discrete: false, support: [0, Infinity],
        pdf: function (x) { return Math.exp(lp(x)); }, logpdf: lp,
        cdf: function (x) { return gammainc(a, b * Math.max(0, x)); },
        ppf: function (p) { return gammaincInv(a, p) / b; },
        sample: function (r) { return r.gamma(a) / b; },
        mean: a / b, variance: a / (b * b) });
    },
    /* Beta({a, b}) on [0,1] */
    beta: function (P) {
      var a = P.a, b = P.b; need(a > 0 && b > 0, 'beta: a > 0, b > 0');
      var lb = lbeta(a, b);
      var lp = function (x) {
        if (x < 0 || x > 1) return -Infinity;
        if (x === 0) return a < 1 ? Infinity : (a === 1 ? -lb : -Infinity);
        if (x === 1) return b < 1 ? Infinity : (b === 1 ? -lb : -Infinity);
        return (a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x) - lb;
      };
      return mk({ name: 'beta', params: { a: a, b: b }, discrete: false, support: [0, 1],
        pdf: function (x) { return Math.exp(lp(x)); }, logpdf: lp,
        cdf: function (x) { return betainc(a, b, x); },
        ppf: function (p) { return betaincInv(a, b, p); },
        sample: function (r) { return r.beta(a, b); },
        mean: a / (a + b), variance: a * b / ((a + b) * (a + b) * (a + b + 1)),
        mode: (a > 1 && b > 1) ? (a - 1) / (a + b - 2) : null,
        modeNote: (a > 1 && b > 1) ? '' : 'a > 1 かつ b > 1 でないと，内部に最大がありません（端 0 または 1 で最大，または a=b=1 で一定）．' });
    },
    /* Student の t({nu, mu, s})：位置 mu（既定 0），尺度 s（既定 1） */
    studentT: function (P) {
      var nu = P.nu, mu = P.mu || 0, s = P.s === undefined ? 1 : P.s; need(nu > 0 && s > 0, 'studentT: ν > 0, s > 0');
      var c = lgamma((nu + 1) / 2) - lgamma(nu / 2) - 0.5 * Math.log(nu * Math.PI) - Math.log(s);
      var cdf0 = function (t) { var x = nu / (nu + t * t); var tail = 0.5 * betainc(nu / 2, 0.5, x); return t > 0 ? 1 - tail : tail; };
      return mk({ name: 'studentT', params: { nu: nu, mu: mu, s: s }, discrete: false, support: [-Infinity, Infinity],
        pdf: function (x) { var z = (x - mu) / s; return Math.exp(c - (nu + 1) / 2 * Math.log1p(z * z / nu)); },
        logpdf: function (x) { var z = (x - mu) / s; return c - (nu + 1) / 2 * Math.log1p(z * z / nu); },
        cdf: function (x) { return cdf0((x - mu) / s); },
        ppf: function (p) {
          if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
          if (p === 0.5) return mu;
          var pp = p < 0.5 ? p : 1 - p;
          var xb = betaincInv(nu / 2, 0.5, 2 * pp); /* x = ν/(ν+t²) */
          var t = Math.sqrt(nu * (1 - xb) / xb);
          return mu + s * (p < 0.5 ? -t : t);
        },
        sample: function (r) { var z = r.normal(); var g = r.gamma(nu / 2) * 2; return mu + s * z / Math.sqrt(g / nu); },
        mean: nu > 1 ? mu : null, meanNote: nu > 1 ? '' : 'ν ≤ 1 では ∫|x| p(x) dx が発散するため，平均は存在しません．',
        variance: nu > 2 ? s * s * nu / (nu - 2) : null,
        varianceNote: nu > 2 ? '' : (nu > 1 ? '1 < ν ≤ 2 では分散が発散します（無限大）．' : 'ν ≤ 1 では平均が存在しないため，分散も定義できません．') });
    },
    /* Weibull({m, s0})：F(s)=1−exp[−(s/s0)^m]（m：Weibull 係数，s0：尺度） */
    weibull: function (P) {
      var m = P.m, s0 = P.s0; need(m > 0 && s0 > 0, 'weibull: m > 0, s0 > 0');
      var lp = function (s) { if (s < 0) return -Infinity; if (s === 0) return m < 1 ? Infinity : (m === 1 ? -Math.log(s0) : -Infinity); var z = s / s0; return Math.log(m / s0) + (m - 1) * Math.log(z) - Math.pow(z, m); };
      var g1 = gammaFn(1 + 1 / m), g2 = gammaFn(1 + 2 / m);
      return mk({ name: 'weibull', params: { m: m, s0: s0 }, discrete: false, support: [0, Infinity],
        pdf: function (s) { return Math.exp(lp(s)); }, logpdf: lp,
        cdf: function (s) { return s <= 0 ? 0 : -Math.expm1(-Math.pow(s / s0, m)); },
        ppf: function (p) { if (p <= 0) return 0; if (p >= 1) return Infinity; return s0 * Math.pow(-Math.log1p(-p), 1 / m); },
        sample: function (r) { var u = 1 - r.uniform(); return s0 * Math.pow(-Math.log(u), 1 / m); },
        mean: s0 * g1, variance: s0 * s0 * Math.max(0, g2 - g1 * g1) });
    }
  };
  /* 区間確率 P(a ≤ x ≤ b)．離散分布では a, b を含む整数の和 */
  dist.interval = function (D, a, b) {
    if (b < a) return 0;
    if (D.discrete) { var ka = Math.ceil(a); return D.cdf(Math.floor(b)) - D.cdf(ka - 1); }
    return D.cdf(b) - D.cdf(a);
  };

  /* 数値積分（合成 Simpson．n は偶数に丸める） */
  function simpson(f, a, b, n) {
    n = Math.max(2, (n || 1000) + ((n || 1000) % 2));
    var h = (b - a) / n, s = f(a) + f(b);
    for (var i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
    return s * h / 3;
  }
  /* 台形則（格子の値から） */
  function trapz(y, x) { var s = 0; for (var i = 1; i < y.length; i++) s += 0.5 * (y[i] + y[i - 1]) * (x[i] - x[i - 1]); return s; }

  return {
    version: '1.0.0',
    /* 小道具 */
    clamp: clamp, linspace: linspace, allFinite: allFinite, isNum: isNum,
    /* 乱数 */
    rng: rng,
    /* 特殊関数 */
    lgamma: lgamma, gamma: gammaFn, lbeta: lbeta,
    gammainc: gammainc, gammaincc: gammaincc, gammaincInv: gammaincInv,
    betainc: betainc, betaincInv: betaincInv,
    erf: erf, erfc: erfc, normPdf: normPdf, normLogPdf: normLogPdf, normCdf: normCdf, normInv: normInv,
    logsumexp: logsumexp, softmax: softmax, logSoftmax: logSoftmax, sigmoid: sigmoid, softplus: softplus,
    /* 線形代数 */
    zeros: zeros, eye: eye, copyMat: copyMat, shape: shape, transpose: transpose,
    dot: dot, norm: norm, matmul: matmul, matvec: matvec, matTvec: matTvec, outer: outer,
    addMat: addMat, scaleMat: scaleMat, addVec: addVec, scaleVec: scaleVec, diagOf: diagOf, diagMat: diagMat,
    cholesky: cholesky, choleskySafe: choleskySafe, solveLower: solveLower, solveUpper: solveUpper, solveLowerT: solveLowerT,
    cholSolve: cholSolve, logdetChol: logdetChol, lu: lu, luSolve: luSolve, det: det,
    qr: qr, lstsq: lstsq, ridge: ridge, eigSym: eigSym, svd: svd,
    /* 統計 */
    sum: sum, mean: mean, variance: variance, std: std, quantile: quantile, median: median,
    autocorr: autocorr, iat: iat, ess: ess, rhat: rhat, histogram: histogram, covMatrix: covMatrix, clipVar: clipVar,
    /* 分布・積分 */
    dist: dist, simpson: simpson, trapz: trapz
  };
});
