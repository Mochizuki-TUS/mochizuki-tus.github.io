/* =====================================================================
   neural-net.model.js — S05 ニューラルネットワークの計算（DOM に触れない純粋な関数）
   ブラウザ：window.MLModels.NeuralNet（先に lib/mlcore.js を読む）
   Node   ：require('./neural-net.model.js')（試験 W/tests/neural-net.test.mjs から）
   記号は本文（第14・15章）と SPEC_CONTENT §3.5 に合わせる．隠れ層 1 層，出力 1 個：
     a⁽¹⁾ = W⁽¹⁾ x + b⁽¹⁾,   z⁽¹⁾ = h(a⁽¹⁾),   a⁽²⁾ = W⁽²⁾ z⁽¹⁾ + b⁽²⁾,   ŷ = σ(a⁽²⁾)（分類）または a⁽²⁾（回帰）
     損失（1 個）：分類 ℓ = −[y ln ŷ + (1−y) ln(1−ŷ)] = softplus(a⁽²⁾) − y a⁽²⁾，回帰 ℓ = ½(ŷ − y)²
     δ⁽²⁾ = ∂ℓ/∂a⁽²⁾ = ŷ − y，δ⁽¹⁾ = h'(a⁽¹⁾) ⊙ (W⁽²⁾ᵀ δ⁽²⁾)，∂ℓ/∂W⁽ˡ⁾ = δ⁽ˡ⁾ z⁽ˡ⁻¹⁾ᵀ，∂ℓ/∂b⁽ˡ⁾ = δ⁽ˡ⁾
     ミニバッチ ℬ の損失：L = (1/|ℬ|) Σ_n ℓ_n + (λ/2)(‖W⁽¹⁾‖² + ‖W⁽²⁾‖²)（重み減衰はバイアスに掛けない）
   ・ネットワークは {D, H, act, out, W1 (H×D), b1 (H), W2 (長さ H の行ベクトル), b2 (数)}．
   ・乱数は引数で受け取った MLCore.rng だけを使う（Math.random 禁止）．
   ===================================================================== */
(function (root, factory) {
  'use strict';
  var C = (typeof module === 'object' && module.exports) ? require('./lib/mlcore.js') : root.MLCore;
  var M = factory(C);
  if (typeof module === 'object' && module.exports) module.exports = M;
  if (root) { root.MLModels = root.MLModels || {}; root.MLModels.NeuralNet = M; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (C) {
  'use strict';

  var LIMITS = {
    H: [1, 16], maxEpochs: 5000, eta: [1e-3, 3.16], NregTrain: [5, 50], NclsTrain: [40, 200], Nval: 200,
    traceX: [-3, 3], traceEta: [0.01, 5], eps: [1e-12, 1e-1], divergeLoss: 1e6
  };

  /* 第15章 15.3 の既定値（司令塔の指定） */
  var TRACE_DEFAULT = {
    W1: [[0.5, -0.3], [0.8, 0.2]], b1: [0.1, -0.1], W2: [1.0, -1.0], b2: 0.2,
    x: [1.0, 0.5], y: 1, eta: 0.5
  };

  /* ---------------- 活性化関数 h(a) と h'(a)（z = h(a) を使って計算） ---------------- */
  var ACT = {
    tanh: { f: function (a) { return Math.tanh(a); }, df: function (a, z) { return 1 - z * z; } },
    relu: { f: function (a) { return a > 0 ? a : 0; }, df: function (a) { return a > 0 ? 1 : 0; } },   /* a = 0 では 0 とする */
    sigmoid: { f: function (a) { return C.sigmoid(a); }, df: function (a, z) { return z * (1 - z); } },
    identity: { f: function (a) { return a; }, df: function () { return 1; } }
  };

  function copyNet(n) {
    return { D: n.D, H: n.H, act: n.act, out: n.out, W1: n.W1.map(function (r) { return r.slice(); }), b1: n.b1.slice(), W2: n.W2.slice(), b2: n.b2 };
  }
  function makeNet(W1, b1, W2, b2, act, out) {
    return copyNet({ D: W1[0].length, H: W1.length, act: act || 'tanh', out: out || 'sigmoid', W1: W1, b1: b1, W2: W2, b2: b2 });
  }
  function nParams(n) { return n.H * n.D + n.H + n.H + 1; }

  /* ---------------- 順伝播・損失・逆伝播（1 個のデータ） ---------------- */
  function forward(net, x) {
    var H = net.H, D = net.D, h = ACT[net.act], a1 = new Array(H), z1 = new Array(H), a2 = net.b2;
    for (var j = 0; j < H; j++) {
      var s = net.b1[j], w = net.W1[j];
      for (var i = 0; i < D; i++) s += w[i] * x[i];
      a1[j] = s; z1[j] = h.f(s); a2 += net.W2[j] * z1[j];
    }
    var yhat = net.out === 'sigmoid' ? C.sigmoid(a2) : a2;
    return { a1: a1, z1: z1, a2: a2, yhat: yhat };
  }
  /* 1 個の損失．分類は softplus(a) − y a（ln 0 を避ける形），回帰は ½(a − y)² */
  function pointLoss(out, a2, y) { return out === 'sigmoid' ? C.softplus(a2) - y * a2 : 0.5 * (a2 - y) * (a2 - y); }
  function backward(net, x, y, fw) {
    fw = fw || forward(net, x);
    var H = net.H, D = net.D, h = ACT[net.act];
    var d2 = fw.yhat - y;                               /* δ⁽²⁾ = ŷ − y（sigmoid＋交差エントロピー，恒等＋二乗和/2） */
    var d1 = new Array(H), gW1 = new Array(H), gW2 = new Array(H);
    for (var j = 0; j < H; j++) {
      d1[j] = h.df(fw.a1[j], fw.z1[j]) * net.W2[j] * d2;   /* δ⁽¹⁾ = h'(a⁽¹⁾) ⊙ (W⁽²⁾ᵀ δ⁽²⁾) */
      gW2[j] = d2 * fw.z1[j];                              /* ∂ℓ/∂W⁽²⁾ = δ⁽²⁾ z⁽¹⁾ᵀ */
      gW1[j] = new Array(D);
      for (var i = 0; i < D; i++) gW1[j][i] = d1[j] * x[i];   /* ∂ℓ/∂W⁽¹⁾ = δ⁽¹⁾ xᵀ */
    }
    return { delta2: d2, delta1: d1, gW1: gW1, gb1: d1.slice(), gW2: gW2, gb2: d2, loss: pointLoss(net.out, fw.a2, y), fw: fw };
  }

  function sqW(net) { var s = 0, j, i; for (j = 0; j < net.H; j++) { for (i = 0; i < net.D; i++) s += net.W1[j][i] * net.W1[j][i]; s += net.W2[j] * net.W2[j]; } return s; }

  /* ミニバッチ（idx を省くと全データ）の L とその勾配．wd = λ（重み減衰） */
  function lossGrad(net, X, Y, idx, wd) {
    wd = wd || 0;
    var H = net.H, D = net.D, B = idx ? idx.length : X.length, j, i;
    var G = { W1: [], b1: new Array(H).fill(0), W2: new Array(H).fill(0), b2: 0 };
    for (j = 0; j < H; j++) G.W1.push(new Array(D).fill(0));
    var Ld = 0;
    for (var k = 0; k < B; k++) {
      var n = idx ? idx[k] : k, r = backward(net, X[n], Y[n]);
      Ld += r.loss;
      for (j = 0; j < H; j++) { for (i = 0; i < D; i++) G.W1[j][i] += r.gW1[j][i]; G.b1[j] += r.gb1[j]; G.W2[j] += r.gW2[j]; }
      G.b2 += r.gb2;
    }
    var inv = B ? 1 / B : 0;
    for (j = 0; j < H; j++) { for (i = 0; i < D; i++) G.W1[j][i] = G.W1[j][i] * inv + wd * net.W1[j][i]; G.b1[j] *= inv; G.W2[j] = G.W2[j] * inv + wd * net.W2[j]; }
    G.b2 *= inv;
    var Ldata = Ld * inv;
    return { L: Ldata + 0.5 * wd * sqW(net), Ldata: Ldata, g: G };
  }
  function lossOnly(net, X, Y, idx, wd) {
    wd = wd || 0;
    var B = idx ? idx.length : X.length, Ld = 0;
    for (var k = 0; k < B; k++) { var n = idx ? idx[k] : k, fw = forward(net, X[n]); Ld += pointLoss(net.out, fw.a2, Y[n]); }
    var Ldata = B ? Ld / B : 0;
    return { L: Ldata + 0.5 * wd * sqW(net), Ldata: Ldata };
  }
  /* w ← w − η ∂L/∂w（新しいネットワークを返す） */
  function sgdStep(net, G, eta) {
    var n = copyNet(net);
    for (var j = 0; j < n.H; j++) { for (var i = 0; i < n.D; i++) n.W1[j][i] -= eta * G.W1[j][i]; n.b1[j] -= eta * G.b1[j]; n.W2[j] -= eta * G.W2[j]; }
    n.b2 -= eta * G.b2;
    return n;
  }
  function netFinite(n) { return C.allFinite([n.b2]) && C.allFinite(n.b1) && C.allFinite(n.W2) && n.W1.every(function (r) { return C.allFinite(r); }); }

  /* 1 エポック：データを並べ替え（order を渡せばその順），大きさ batch（0 か ≥N なら全部）のミニバッチごとに更新．
     戻り値 {net, steps, ok, reason} */
  function trainEpoch(net, X, Y, opt, rngOrOrder) {
    var N = X.length, eta = opt.eta, wd = opt.wd || 0, B = (!opt.batch || opt.batch >= N) ? N : opt.batch;
    var order;
    if (Array.isArray(rngOrOrder)) order = rngOrOrder.slice();
    else if (rngOrOrder && B < N) order = rngOrOrder.permutation(N);
    else { order = []; for (var k = 0; k < N; k++) order.push(k); }
    var steps = 0;
    for (var s = 0; s < N; s += B) {
      var idx = order.slice(s, Math.min(N, s + B));
      var r = lossGrad(net, X, Y, idx, wd);
      if (!isFinite(r.L)) return { net: net, steps: steps, ok: false, reason: '損失が NaN または無限大になりました' };
      net = sgdStep(net, r.g, eta);
      steps++;
      if (!netFinite(net)) return { net: net, steps: steps, ok: false, reason: '重みが NaN または無限大になりました' };
    }
    return { net: net, steps: steps, ok: true, reason: '' };
  }

  /* ---------------- パラメーターの並べ方（勾配確認用） ---------------- */
  /* 順：W⁽¹⁾（行ごと），b⁽¹⁾，W⁽²⁾，b⁽²⁾．名前は表示用（1 始まりの添字） */
  function flatten(n) {
    var v = [], j, i;
    for (j = 0; j < n.H; j++) for (i = 0; i < n.D; i++) v.push(n.W1[j][i]);
    for (j = 0; j < n.H; j++) v.push(n.b1[j]);
    for (j = 0; j < n.H; j++) v.push(n.W2[j]);
    v.push(n.b2);
    return v;
  }
  function paramNames(n) {
    var v = [], j, i;
    for (j = 0; j < n.H; j++) for (i = 0; i < n.D; i++) v.push({ kind: 'W1', j: j + 1, i: i + 1 });
    for (j = 0; j < n.H; j++) v.push({ kind: 'b1', j: j + 1 });
    for (j = 0; j < n.H; j++) v.push({ kind: 'W2', j: j + 1 });
    v.push({ kind: 'b2' });
    return v;
  }
  function unflatten(n, v) {
    var m = copyNet(n), p = 0, j, i;
    for (j = 0; j < n.H; j++) for (i = 0; i < n.D; i++) m.W1[j][i] = v[p++];
    for (j = 0; j < n.H; j++) m.b1[j] = v[p++];
    for (j = 0; j < n.H; j++) m.W2[j] = v[p++];
    m.b2 = v[p++];
    return m;
  }
  function flatGrad(n, G) { return flatten({ D: n.D, H: n.H, W1: G.W1, b1: G.b1, W2: G.W2, b2: G.b2 }); }

  /* 相対誤差 |a − b| / max(|a|, |b|, 1e−8)（両方とも 0 に近いときに割り算が暴れないよう分母に下限） */
  function relErr(a, b) { return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-8); }

  /* 勾配確認：逆伝播の勾配と，中心差分 [L(w+ε) − L(w−ε)]/(2ε)（と前進差分 [L(w+ε) − L(w)]/ε）を全パラメーターで比べる */
  function gradCheck(net, X, Y, wd, eps) {
    var r = lossGrad(net, X, Y, null, wd), g = flatGrad(net, r.g), w = flatten(net), names = paramNames(net);
    var L0 = r.L, rows = [], maxAbs = 0, maxRel = 0, maxAbsF = 0, sd = 0, sb = 0, sf = 0;
    for (var p = 0; p < w.length; p++) {
      var wp = w.slice(), wm = w.slice(); wp[p] += eps; wm[p] -= eps;
      var Lp = lossOnly(unflatten(net, wp), X, Y, null, wd).L, Lm = lossOnly(unflatten(net, wm), X, Y, null, wd).L;
      var fd = (Lp - Lm) / (2 * eps), ff = (Lp - L0) / eps;
      var ae = Math.abs(g[p] - fd), re = relErr(g[p], fd);
      rows.push({ name: names[p], bp: g[p], fd: fd, fwd: ff, abs: ae, rel: re });
      maxAbs = Math.max(maxAbs, ae); maxRel = Math.max(maxRel, re); maxAbsF = Math.max(maxAbsF, Math.abs(g[p] - ff));
      sd += ae * ae; sb += g[p] * g[p]; sf += fd * fd;
    }
    /* ベクトル全体の相対誤差 ‖g_逆伝播 − g_差分‖ / max(‖g_逆伝播‖, ‖g_差分‖)（0 に近い成分に引きずられない） */
    var vecRel = Math.sqrt(sd) / Math.max(Math.sqrt(sb), Math.sqrt(sf), 1e-300);
    return { rows: rows, maxAbs: maxAbs, maxRel: maxRel, vecRel: vecRel, maxAbsForward: maxAbsF, L: L0, n: w.length };
  }
  /* ε を変えたときの最大絶対誤差（中心差分・前進差分）．V 字の図用 */
  function epsSweep(net, X, Y, wd, epsList) {
    return epsList.map(function (e) { var r = gradCheck(net, X, Y, wd, e); return { eps: e, central: r.maxAbs, forward: r.maxAbsForward, centralRel: r.maxRel }; });
  }
  function epsGrid(n) { n = n || 45; var out = []; for (var k = 0; k < n; k++) out.push(Math.pow(10, -12 + 11 * k / (n - 1))); return out; }

  /* ---------------- 第15章 15.3：1 ステップを数値で追う（2–2–1，tanh，sigmoid＋交差エントロピー） ---------------- */
  function trace(p) {
    p = p || TRACE_DEFAULT;
    var net = makeNet(p.W1, p.b1, p.W2, p.b2, 'tanh', 'sigmoid');
    var bw = backward(net, p.x, p.y);
    var G = { W1: bw.gW1, b1: bw.gb1, W2: bw.gW2, b2: bw.gb2 };
    var net2 = sgdStep(net, G, p.eta);
    var fw2 = forward(net2, p.x);
    return {
      net: net, x: p.x.slice(), y: p.y, eta: p.eta,
      a1: bw.fw.a1, z1: bw.fw.z1, a2: bw.fw.a2, yhat: bw.fw.yhat, L: bw.loss,
      dh: bw.fw.z1.map(function (z) { return 1 - z * z; }),          /* h'(a⁽¹⁾) = 1 − tanh² */
      delta2: bw.delta2, delta1: bw.delta1, backW2d: net.W2.map(function (w) { return w * bw.delta2; }),
      gW1: bw.gW1, gb1: bw.gb1, gW2: bw.gW2, gb2: bw.gb2,
      net2: net2, a1n: fw2.a1, z1n: fw2.z1, a2n: fw2.a2, yhatn: fw2.yhat, Ln: pointLoss('sigmoid', fw2.a2, p.y),
      gradNorm2: flatten({ D: 2, H: 2, W1: bw.gW1, b1: bw.gb1, W2: bw.gW2, b2: bw.gb2 }).reduce(function (s, v) { return s + v * v; }, 0)
    };
  }

  /* ---------------- 初期値 ---------------- */
  /* Xavier（Glorot）正規：分散 2/(fan_in+fan_out)（tanh・sigmoid），He 正規：分散 2/fan_in（ReLU）．バイアスは 0．
     scheme = 'zero' ならすべて 0（対称性が崩れない例） */
  function initStd(act, fanIn, fanOut) { return act === 'relu' ? Math.sqrt(2 / fanIn) : Math.sqrt(2 / (fanIn + fanOut)); }
  function initNet(rng, D, H, act, out, scheme) {
    var W1 = [], b1 = [], W2 = [], j, i;
    var s1 = initStd(act, D, H), s2 = Math.sqrt(2 / (H + 1));
    for (j = 0; j < H; j++) { var r = []; for (i = 0; i < D; i++) r.push(scheme === 'zero' ? 0 : s1 * rng.normal()); W1.push(r); b1.push(0); }
    for (j = 0; j < H; j++) W2.push(scheme === 'zero' ? 0 : s2 * rng.normal());
    return makeNet(W1, b1, W2, 0, act, out);
  }

  /* ---------------- 教育用の合成データ ---------------- */
  /* データ A「焼成温度と相対密度」：s ∈ [−1,1]，g(s) = 88 + 8s − 5s² + 2 sin 3s（%），y = g(s) + ε，ε ~ N(0, 1.0²) */
  function trueA(s) { return 88 + 8 * s - 5 * s * s + 2 * Math.sin(3 * s); }
  function makeRegression(rng, N, sigma) {
    sigma = sigma == null ? 1.0 : sigma;
    var X = [], Y = [];
    for (var n = 0; n < N; n++) { var s = rng.uniform(-1, 1); X.push([s]); Y.push(trueA(s) + sigma * rng.normal()); }
    return { X: X, Y: Y };
  }
  /* 2 クラス（y ∈ {0,1}．n が奇数なら 1，偶数なら 0 で半々）．無次元．
     circles：半径 r = 1.0（y=0）または 0.5（y=1）に N(0, 0.1²) を足し，角度 θ ~ U(0, 2π)
     moons  ：y=0 は (cos t, sin t)，y=1 は (1 − cos t, 0.5 − sin t)，t ~ U(0, π)，(0.5, 0.25) を引き，各座標に N(0, 0.1²)
     xor    ：中心 (±0.5, ±0.5)．y=1 は x₁x₂ > 0 の象限（第1・3），y=0 は第2・4．各座標に N(0, 0.2²) */
  var CLS_NOISE = { circles: 0.1, moons: 0.1, xor: 0.2 };
  function makeClassification(kind, rng, N) {
    var X = [], Y = [], sd = CLS_NOISE[kind];
    for (var n = 0; n < N; n++) {
      var y = n % 2, x1, x2;
      if (kind === 'circles') { var r = (y ? 0.5 : 1.0) + sd * rng.normal(), th = rng.uniform(0, 2 * Math.PI); x1 = r * Math.cos(th); x2 = r * Math.sin(th); }
      else if (kind === 'moons') { var t = rng.uniform(0, Math.PI); if (y === 0) { x1 = Math.cos(t); x2 = Math.sin(t); } else { x1 = 1 - Math.cos(t); x2 = 0.5 - Math.sin(t); } x1 += -0.5 + sd * rng.normal(); x2 += -0.25 + sd * rng.normal(); }
      else { var sg = rng.uniform() < 0.5 ? 1 : -1; x1 = 0.5 * sg + sd * rng.normal(); x2 = (y ? 0.5 * sg : -0.5 * sg) + sd * rng.normal(); }
      X.push([x1, x2]); Y.push(y);
    }
    return { X: X, Y: Y };
  }
  /* 訓練データと検証データ（検証は別の乱数の流れ．訓練データ数を変えても検証データは変わらない） */
  function valSeed(seed) { return ((seed >>> 0) ^ 0x9E3779B9) >>> 0; }
  function makeTask(kind, dataSeed, Ntrain) {
    var rt = C.rng(dataSeed), rv = C.rng(valSeed(dataSeed));
    if (kind === 'regression') {
      var tr = makeRegression(rt, Ntrain), va = makeRegression(rv, LIMITS.Nval);
      /* 目標値は訓練データの平均と標準偏差で標準化して学習する（t = (y − ȳ)/s_y） */
      var my = C.mean(tr.Y), sy = Ntrain > 1 ? C.std(tr.Y, 0) : 1; if (!(sy > 1e-12)) sy = 1;
      var f = function (y) { return (y - my) / sy; };
      return { kind: kind, D: 1, out: 'identity', train: { X: tr.X, Y: tr.Y.map(f), raw: tr.Y }, val: { X: va.X, Y: va.Y.map(f), raw: va.Y }, ymean: my, ystd: sy };
    }
    var a = makeClassification(kind, rt, Ntrain), b = makeClassification(kind, rv, LIMITS.Nval);
    return { kind: kind, D: 2, out: 'sigmoid', train: a, val: b };
  }
  function accuracy(net, X, Y) { if (!X.length) return null; var c = 0; for (var n = 0; n < X.length; n++) { var p = forward(net, X[n]).yhat; if ((p >= 0.5 ? 1 : 0) === Y[n]) c++; } return c / X.length; }
  /* 回帰の RMSE（元の単位 %） */
  function rmse(net, task, part) { var d = task[part], s = 0; if (!d.X.length) return null; for (var n = 0; n < d.X.length; n++) { var e = (forward(net, d.X[n]).yhat - d.Y[n]) * task.ystd; s += e * e; } return Math.sqrt(s / d.X.length); }
  /* 格子上の ŷ（分類の濃淡と決定境界）．Z[iy][ix]，端の点が範囲の端 */
  function gridPredict(net, xr, yr, n) {
    var Z = [];
    for (var i = 0; i < n; i++) { var x2 = yr[0] + (yr[1] - yr[0]) * i / (n - 1), row = []; for (var j = 0; j < n; j++) { var x1 = xr[0] + (xr[1] - xr[0]) * j / (n - 1); row.push(forward(net, [x1, x2]).yhat); } Z.push(row); }
    return Z;
  }

  return {
    LIMITS: LIMITS, TRACE_DEFAULT: TRACE_DEFAULT, ACT: ACT,
    makeNet: makeNet, copyNet: copyNet, nParams: nParams,
    forward: forward, pointLoss: pointLoss, backward: backward, lossGrad: lossGrad, lossOnly: lossOnly,
    sgdStep: sgdStep, trainEpoch: trainEpoch, netFinite: netFinite,
    flatten: flatten, unflatten: unflatten, paramNames: paramNames, flatGrad: flatGrad, relErr: relErr,
    gradCheck: gradCheck, epsSweep: epsSweep, epsGrid: epsGrid,
    trace: trace, initStd: initStd, initNet: initNet,
    trueA: trueA, makeRegression: makeRegression, makeClassification: makeClassification, CLS_NOISE: CLS_NOISE,
    valSeed: valSeed, makeTask: makeTask, accuracy: accuracy, rmse: rmse, gridPredict: gridPredict
  };
});
