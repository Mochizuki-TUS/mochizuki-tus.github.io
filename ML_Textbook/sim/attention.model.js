/* =====================================================================
   attention.model.js — S10 Attention と次トークン生成の計算（DOM に触れない純粋な関数）
   ブラウザ：window.MLModels.Attention（先に lib/mlcore.js を読む）
   Node   ：require('./attention.model.js')（試験 W/tests/attention.test.mjs から）
   記号は本文（第24〜26章）と SPEC_CONTENT §3.6 に合わせる：
     系列を行に並べる．X ∈ R^{T×d_model}，Q = X W_Q，K = X W_K，V = X W_V，
     Attention(Q,K,V) = softmax(Q Kᵀ/√d_k + M) V（softmax は各行＝各 Query について Key の方向），
     causal mask M_ij = 0 (j ≤ i)，−∞ (j > i)．temperature τ：p_i ∝ exp(o_i/τ)．
   ・乱数は引数で受け取った MLCore.rng だけを使う（Math.random 禁止）．
   ・softmax は最大値を引いてから exp（−∞ は 0）．
   ・計算量の上限は LIMITS（画面にも出す）．
   ===================================================================== */
(function (root, factory) {
  'use strict';
  var C = (typeof module === 'object' && module.exports) ? require('./lib/mlcore.js') : root.MLCore;
  var M = factory(C);
  if (typeof module === 'object' && module.exports) module.exports = M;
  if (root) { root.MLModels = root.MLModels || {}; root.MLModels.Attention = M; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (C) {
  'use strict';

  var LIMITS = { T: [3, 5], d: [2, 4], entry: [-5, 5], tau: [0.05, 5], tMax: 24 };

  /* ---------------------------------------------------------------
     ① 手で設定した重みの Attention（タブ attn）
     --------------------------------------------------------------- */
  function matmul(A, B) { return C.matmul(A, B); }
  function transpose(A) { return C.transpose(A); }

  /* 1 行の softmax の途中経過：最大値，exp(s−max)，和，重み．−∞ は exp = 0 */
  function softmaxDetail(row) {
    var mx = -Infinity, i;
    for (i = 0; i < row.length; i++) if (row[i] > mx) mx = row[i];
    if (mx === -Infinity) return { max: mx, exps: row.map(function () { return 0; }), sum: 0, p: null };
    var e = row.map(function (s) { return s === -Infinity ? 0 : Math.exp(s - mx); });
    var sum = 0; for (i = 0; i < e.length; i++) sum += e[i];
    return { max: mx, exps: e, sum: sum, p: e.map(function (v) { return v / sum; }) };
  }

  /* X: T×d，WQ, WK: d×d_k，WV: d×d_v．opt {scale(既定 true), causal(既定 false)}
     戻り値：Q, K, V, S（QKᵀ），Ss（√d_k で割った値．scale=false なら S と同じ），Sm（mask を足した値），
             A（重み），Z = A V，rowSum，detail（各行の softmax の途中経過），dk */
  function attention(X, WQ, WK, WV, opt) {
    opt = opt || {};
    var scale = opt.scale !== false, causal = !!opt.causal;
    var Q = matmul(X, WQ), K = matmul(X, WK), V = matmul(X, WV);
    var T = X.length, dk = WQ[0].length;
    if (WK[0].length !== dk) throw new Error('W_Q と W_K の列の数（d_k）が違います');
    var S = matmul(Q, transpose(K));
    var f = scale ? Math.sqrt(dk) : 1;
    var Ss = S.map(function (r) { return r.map(function (s) { return s / f; }); });
    var Sm = Ss.map(function (r, i) { return r.map(function (s, j) { return (causal && j > i) ? -Infinity : s; }); });
    var detail = Sm.map(softmaxDetail);
    var A = detail.map(function (d) { return d.p; });
    var Z = matmul(A, V);
    var rowSum = A.map(function (r) { return r.reduce(function (a, b) { return a + b; }, 0); });
    return { Q: Q, K: K, V: V, S: S, Ss: Ss, Sm: Sm, A: A, Z: Z, rowSum: rowSum, detail: detail, dk: dk, T: T, scale: scale, causal: causal, factor: f };
  }

  function eye(n) { return C.eye(n); }

  /* 既定値（第24章 24.3 の手計算と同じ）：T = 3，d_model = d_k = d_v = 2，W_Q = W_K = W_V = I */
  var DEFAULT_X = [[1, 0], [0, 1], [1, 1]];
  var PRESETS = {
    hand: { label: '既定（24.3 の手計算）', X: [[1, 0], [0, 1], [1, 1]], WQ: eye(2), WK: eye(2), WV: eye(2) },
    sharp: { label: 'W_Q を 3 倍（スコアが大きい）', X: [[1, 0], [0, 1], [1, 1]], WQ: [[3, 0], [0, 3]], WK: eye(2), WV: eye(2) },
    same: { label: '同じ Key が 2 つ', X: [[1, 0], [1, 0], [0, 1]], WQ: eye(2), WK: eye(2), WV: eye(2) },
    swap: { label: 'Key と Value を別に（T = 4）', X: [[1, 0], [0, 1], [1, 0.5], [0.5, 1]], WQ: eye(2), WK: [[1, 0], [0, 1]], WV: [[0, 1], [1, 0]] },
    d4: { label: 'd_model = 4（T = 5）', X: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [1, 1, 0, 0]], WQ: eye(4), WK: eye(4), WV: eye(4) }
  };

  /* 行を並べ替える（置換同変性の確認用）．perm[i] = 新しい i 行目に置く元の行 */
  function permuteRows(M, perm) { return perm.map(function (k) { return M[k].slice(); }); }

  /* ---------------------------------------------------------------
     ② 小規模な学習済みモデル（decoder のみの Transformer．pre-LN，GELU，重み共有）
     --------------------------------------------------------------- */
  /* tinygpt.json（window.MLData.tinygpt）を計算しやすい形にする */
  function prepareModel(J) {
    var cfg = J.config, W = J.weights;
    var g = function (w) { return w.data; };
    var P = {
      cfg: cfg, vocab: J.vocab, stoi: {}, bos: J.special_tokens.bos, eos: J.special_tokens.eos,
      WE: g(W.W_E), WP: g(W.W_P), lnf_g: g(W.lnf_g), lnf_b: g(W.lnf_b),
      layers: W.layers.map(function (L) { var o = {}; Object.keys(L).forEach(function (k) { o[k] = g(L[k]); }); return o; }),
      nParams: J.n_params
    };
    J.vocab.forEach(function (w, i) { P.stoi[w] = i; });
    return P;
  }

  /* パラメーター数を形から数える（第25章 25.8 の数え方） */
  function countParams(P) {
    var n = 0, cnt = function (a) { return Array.isArray(a[0]) ? a.length * a[0].length : a.length; };
    n += cnt(P.WE) + cnt(P.WP) + cnt(P.lnf_g) + cnt(P.lnf_b);
    var per = 0;
    P.layers.forEach(function (L) { Object.keys(L).forEach(function (k) { n += cnt(L[k]); }); });
    var L0 = P.layers[0];
    Object.keys(L0).forEach(function (k) { per += cnt(L0[k]); });
    var attn = ['W_Q', 'b_Q', 'W_K', 'b_K', 'W_V', 'b_V', 'W_O', 'b_O'].reduce(function (s, k) { return s + cnt(L0[k]); }, 0);
    var ffn = ['W_1', 'b_1', 'W_2', 'b_2'].reduce(function (s, k) { return s + cnt(L0[k]); }, 0);
    return { total: n, perLayer: per, attnPerLayer: attn, ffnPerLayer: ffn, embed: cnt(P.WE), pos: cnt(P.WP) };
  }

  function layerNorm(x, g, b, eps) {
    var d = x.length, mu = 0, v = 0, i;
    for (i = 0; i < d; i++) mu += x[i];
    mu /= d;
    for (i = 0; i < d; i++) v += (x[i] - mu) * (x[i] - mu);
    v /= d;                                   /* 母分散（d_model で割る） */
    var s = 1 / Math.sqrt(v + eps), out = new Array(d);
    for (i = 0; i < d; i++) out[i] = g[i] * (x[i] - mu) * s + b[i];
    return out;
  }
  function gelu(u) { return 0.5 * u * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (u + 0.044715 * u * u * u))); }
  /* 行ベクトル x（長さ n）に W（n×m）を右から掛け，b（長さ m）を足す */
  function linear(x, Wm, b) {
    var n = x.length, m = Wm[0].length, out = b ? b.slice() : new Array(m).fill(0), i, j;
    for (i = 0; i < n; i++) { var xi = x[i], Wi = Wm[i]; if (xi === 0) continue; for (j = 0; j < m; j++) out[j] += xi * Wi[j]; }
    return out;
  }

  /* 順伝播．ids：トークン ID の列（長さ 1〜t_max）．opt.keep：中間値も返す．
     戻り値 {logits（T×V_voc），attn（[層][ヘッド][i][j]），h0, afterAttn, out, finalLN} */
  function forward(P, ids, opt) {
    opt = opt || {};
    var cfg = P.cfg, T = ids.length, d = cfg.d_model, H = cfg.n_head, dh = d / H, eps = cfg.ln_eps;
    if (T < 1) throw new Error('文脈が空です');
    if (T > cfg.t_max) throw new Error('文脈長 ' + cfg.t_max + ' を超えています');
    var h = ids.map(function (id, t) {
      if (!(id >= 0 && id < P.WE.length)) throw new Error('語彙に無い ID ' + id);
      var r = new Array(d); for (var k = 0; k < d; k++) r[k] = P.WE[id][k] + P.WP[t][k]; return r;
    });
    var R = { attn: [], afterAttn: [], out: [] };
    if (opt.keep) R.h0 = h.map(function (r) { return r.slice(); });
    var sq = Math.sqrt(dh);
    P.layers.forEach(function (L) {
      var a = h.map(function (x) { return layerNorm(x, L.ln1_g, L.ln1_b, eps); });
      var Q = a.map(function (x) { return linear(x, L.W_Q, L.b_Q); });
      var K = a.map(function (x) { return linear(x, L.W_K, L.b_K); });
      var V = a.map(function (x) { return linear(x, L.W_V, L.b_V); });
      var Z = h.map(function () { return new Array(d).fill(0); });
      var Al = [];
      for (var j = 0; j < H; j++) {
        var c0 = j * dh, Aj = [];
        for (var i = 0; i < T; i++) {
          var row = new Array(T);
          for (var k = 0; k < T; k++) {
            if (k > i) { row[k] = -Infinity; continue; }          /* causal mask */
            var s = 0; for (var c = c0; c < c0 + dh; c++) s += Q[i][c] * K[k][c];
            row[k] = s / sq;
          }
          var p = softmaxDetail(row).p;                            /* 最大値を引いて exp */
          Aj.push(p);
          for (k = 0; k <= i; k++) { var w = p[k]; if (w === 0) continue; for (c = c0; c < c0 + dh; c++) Z[i][c] += w * V[k][c]; }
        }
        Al.push(Aj);
      }
      h = h.map(function (x, t) { var o = linear(Z[t], L.W_O, L.b_O); return x.map(function (v, k) { return v + o[k]; }); });
      R.attn.push(Al);
      if (opt.keep) R.afterAttn.push(h.map(function (r) { return r.slice(); }));
      h = h.map(function (x) {
        var cc = layerNorm(x, L.ln2_g, L.ln2_b, eps);
        var u = linear(cc, L.W_1, L.b_1).map(gelu);
        var o = linear(u, L.W_2, L.b_2);
        return x.map(function (v, k) { return v + o[k]; });
      });
      if (opt.keep) R.out.push(h.map(function (r) { return r.slice(); }));
    });
    var hf = h.map(function (x) { return layerNorm(x, P.lnf_g, P.lnf_b, eps); });
    /* logits = hf W_Eᵀ（重み共有．出力のバイアスなし） */
    R.logits = hf.map(function (x) { return P.WE.map(function (e) { var s = 0; for (var k = 0; k < d; k++) s += x[k] * e[k]; return s; }); });
    if (opt.keep) R.finalLN = hf;
    return R;
  }

  /* 次トークン分布（W/s10/generate.py の next_dist と同じ順序）：
     ① o/τ（τ ≤ 0 は greedy）→ ② 最大値を引いて softmax → ③ top-k（大きい順に k 個．同じ確率なら ID の小さい方）
     → ④ top-p（③ で再正規化した確率を大きい順に累積し，累積が p 以上になった位置まで残す）→ ⑤ 再正規化．
     戻り値 {p（長さ V．最終の分布），pTau（②の分布），order（全 ID を②の大きい順），keep（残った ID，大きい順），
            afterK（③で残った ID），cum（④の累積．keep の各位置まで），cumK（③の後の全語の累積），greedy} */
  function nextDist(logits, tau, topK, topP) {
    var V = logits.length, i;
    if (!(tau > 0)) {
      var a = 0; for (i = 1; i < V; i++) if (logits[i] > logits[a]) a = i;
      var pg = new Array(V).fill(0); pg[a] = 1;
      var ord = range(V).sort(function (x, y) { return (logits[y] - logits[x]) || (x - y); });
      return { p: pg, pTau: pg.slice(), order: ord, keep: [a], afterK: [a], cum: [1], cumK: [1], greedy: true };
    }
    var z = logits.map(function (o) { return o / tau; });
    var pT = softmaxDetail(z).p;
    var order = range(V).sort(function (x, y) { return (pT[y] - pT[x]) || (x - y); });
    var keep = order.slice();
    if (topK && topK >= 1) keep = keep.slice(0, topK);
    var afterK = keep.slice();
    var sk = 0; keep.forEach(function (k) { sk += pT[k]; });
    var cum = [], acc = 0;
    keep.forEach(function (k) { acc += pT[k] / sk; cum.push(acc); });
    var cumK = cum.slice();
    if (topP < 1) {
      var n = keep.length + 1;                       /* numpy の searchsorted(cs, p − 1e−12) + 1 と同じ */
      for (i = 0; i < cum.length; i++) if (cum[i] >= topP - 1e-12) { n = i + 1; break; }
      keep = keep.slice(0, n); cum = cum.slice(0, n);
    }
    var s = 0; keep.forEach(function (k) { s += pT[k]; });
    var p = new Array(V).fill(0); keep.forEach(function (k) { p[k] = pT[k] / s; });
    return { p: p, pTau: pT, order: order, keep: keep, afterK: afterK, cum: cum, cumK: cumK, greedy: false };
  }
  function range(n) { var r = new Array(n); for (var i = 0; i < n; i++) r[i] = i; return r; }

  /* 一様乱数 u ∈ [0,1) を 1 つ使い，keep の順（大きい順）に累積して初めて u を超えた ID */
  function sampleFrom(dist, keep, u) {
    var acc = 0;
    for (var i = 0; i < keep.length; i++) { acc += dist[keep[i]]; if (u < acc) return keep[i]; }
    return keep[keep.length - 1];
  }

  /* 1 トークン進める．mode：'greedy' | 'sample'．rng は MLCore.rng（sample のときだけ 1 回引く） */
  function step(P, ids, mode, rng, tau, topK, topP) {
    if (ids.length >= P.cfg.t_max) return { stop: 'full' };
    var R = forward(P, ids);
    var lo = R.logits[ids.length - 1];
    var d = mode === 'greedy' ? nextDist(lo, 0) : nextDist(lo, tau, topK, topP);
    var u = null, id;
    if (d.keep.length > 1) { u = rng.uniform(); id = sampleFrom(d.p, d.keep, u); } else id = d.keep[0];
    var p1 = nextDist(lo, 1, 0, 1).pTau;
    return { id: id, pUsed: d.p[id], pModel: p1[id], u: u, dist: d };
  }

  /* 文末（<eos>）または文脈長いっぱいまで生成（generate.py の generate と同じ） */
  function generate(P, ids, mode, rng, tau, topK, topP, maxNew) {
    var out = ids.slice(), rec = [];
    maxNew = maxNew == null ? P.cfg.t_max - out.length : maxNew;
    for (var k = 0; k < maxNew; k++) {
      if (out.length >= P.cfg.t_max) break;
      var s = step(P, out, mode, rng, tau, topK, topP);
      out.push(s.id); rec.push(s);
      if (s.id === P.eos) break;
    }
    return { ids: out, steps: rec };
  }

  /* 列の対数確率（モデルそのもの＝τ = 1）．1 回の順伝播で全位置の予測が出る（causal mask のため）．
     from 番目以降の各トークン x_t について ln p(x_t | x_<t) を返す（from ≥ 1） */
  function seqLogProb(P, ids, from) {
    from = Math.max(1, from == null ? 1 : from);
    var R = forward(P, ids), lp = [];
    for (var t = from; t < ids.length; t++) {
      var row = R.logits[t - 1], ls = C.logsumexp(row);
      lp.push(row[ids[t]] - ls);
    }
    var sum = lp.reduce(function (a, b) { return a + b; }, 0);
    return { lp: lp, sum: sum, n: lp.length, ppl: lp.length ? Math.exp(-sum / lp.length) : null };
  }

  /* bigram モデル（直前の 1 トークンだけを見る数え上げ．Transformer ではない）の次トークン分布 */
  function bigramDist(B, lastId) {
    var r = B.prob[lastId], s = 0, i;
    for (i = 0; i < r.length; i++) s += r[i];
    return r.map(function (v) { return v / s; });      /* 7 桁に丸めた表なので和を 1 にそろえる */
  }

  /* ---------------------------------------------------------------
     生成文の判定（W/s10/evaluate.py の judge と同じ規則）
     status：'correct'（正しい）| 'wrong'（誤り：表と矛盾）| 'not_in_table'（学習データに根拠のない文：
             表に対応する事実が無い組み合わせ）| 'ungrammatical'（型に合わない）
     --------------------------------------------------------------- */
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function buildJudge(J) {
    var facts = J.facts, byName = {};
    facts.forEach(function (f) { byName[f.name] = f; });
    var uniq = function (a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }); };
    var alt = function (xs) { return '(' + xs.slice().sort(function (a, b) { return b.length - a.length || (a < b ? -1 : a > b ? 1 : 0); }).map(escapeRe).join('|') + ')'; };
    var slot = { X: alt(facts.map(function (f) { return f.name; })), C: alt(uniq(facts.map(function (f) { return f.cls; }))), struct: alt(uniq(facts.map(function (f) { return f.struct; }))) };
    Object.keys(J.field_values).forEach(function (k) { slot[k] = alt(J.field_values[k]); });
    var parsers = J.templates.map(function (t) {
      var names = [], rx = escapeRe(t.pattern);
      t.pattern.replace(/\{(\w+)\}/g, function (_, n) { names.push(n); return ''; });
      names.forEach(function (n) { rx = rx.replace(escapeRe('{' + n + '}'), slot[n]); });
      return { id: t.id, rx: new RegExp('^' + rx + '$'), names: names, pattern: t.pattern };
    });
    return { parsers: parsers, byName: byName, exceptions: J.exceptions };
  }
  var FIELD_JA = { C: '分類', elec: '電気', heat: '熱', struct: '結晶構造', mag: '磁石', state: '常温の状態' };
  function judge(JG, toks) {
    var s = toks.join(' ');
    for (var i = 0; i < JG.parsers.length; i++) {
      var pr = JG.parsers[i], m = pr.rx.exec(s);
      if (!m) continue;
      var vals = {}; pr.names.forEach(function (n, k) { vals[n] = m[k + 1]; });
      var f = JG.byName[vals.X], wrong = [], unknown = [], truth = {};
      Object.keys(vals).forEach(function (k) {
        if (k === 'X') return;
        var tr = k === 'C' ? f.cls : f[k];
        truth[k] = tr;
        if (tr === null || tr === undefined) unknown.push(k);
        else if (tr !== vals[k]) wrong.push(k);
      });
      var st = wrong.length ? 'wrong' : (unknown.length ? 'not_in_table' : 'correct');
      return { status: st, tpl: pr.id, mat: vals.X, tier: f.tier, vals: vals, truth: truth, wrongFields: wrong, unknownFields: unknown };
    }
    return { status: 'ungrammatical' };
  }
  /* トークン列から文を切り出す：<bos> の後から．． で終わった文ごとに判定（<eos> は区切り） */
  function sentences(vocab, ids, bos, eos) {
    var out = [], cur = [], start = 0;
    for (var t = 0; t < ids.length; t++) {
      var id = ids[t];
      if (id === bos) { if (cur.length) out.push({ toks: cur, start: start, end: t - 1, complete: false }); cur = []; start = t + 1; continue; }
      if (id === eos) { if (cur.length) out.push({ toks: cur, start: start, end: t - 1, complete: cur[cur.length - 1] === '．' }); cur = []; start = t + 1; continue; }
      cur.push(vocab[id]);
      if (vocab[id] === '．') { out.push({ toks: cur, start: start, end: t, complete: true }); cur = []; start = t + 1; }
    }
    if (cur.length) out.push({ toks: cur, start: start, end: ids.length - 1, complete: false });
    return out;
  }

  return {
    LIMITS: LIMITS, DEFAULT_X: DEFAULT_X, PRESETS: PRESETS,
    softmaxDetail: softmaxDetail, attention: attention, permuteRows: permuteRows,
    prepareModel: prepareModel, countParams: countParams, layerNorm: layerNorm, gelu: gelu, forward: forward,
    nextDist: nextDist, sampleFrom: sampleFrom, step: step, generate: generate, seqLogProb: seqLogProb,
    bigramDist: bigramDist, buildJudge: buildJudge, judge: judge, sentences: sentences, FIELD_JA: FIELD_JA
  };
});
