"""ch28_capstone.py — 機械学習 第28章「材料探索の総合演習」の計算をすべて行う台本．

numpy と scipy だけで動く（CPU，倍精度）．本文の数値・表・図はこの台本の出力から取った．
データは同じフォルダの ch28_capstone_data.csv（ch28_make_data.py が作る教育用の合成データ．実在の物質のデータではない）．

    python ch28_capstone.py              # 28.1〜28.7 の主な数値を表示する（数分かかる）
    python ch28_capstone.py --quick      # 多数の seed の比較（28.5，28.6）を 20 回に減らして試す
    python ch28_capstone.py --json out.json   # 結果を JSON にも保存する

本文で使った版：Python 3.12.13，numpy 2.5.4，scipy 1.18.1．版が違うと最後の桁が変わることがある．

記号（本文と同じ）
  c : 添加量（mol%），T : 焼成温度（°C），y = log10(σ_ion / S cm^-1)，j : バッチの番号（1〜5）
  入力ベクトル x = (c, T)．モデルに入れる前に，訓練データの平均と標準偏差で標準化する．
"""
import argparse
import csv
import json
import os
import sys
import time

import numpy as np
from scipy.linalg import cho_factor, cho_solve, solve_triangular
from scipy.optimize import minimize
from scipy.stats import norm

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from ch28_make_data import SD_BATCH, SD_NOISE, g_true, make_rows  # noqa: E402

SEED = 20261112
C_RANGE = (0.0, 10.0)
T_RANGE = (1000.0, 1400.0)
G_MAX = float(g_true(7.0, 1325.0))     # 真の最大（-3.400）

# ---------------------------------------------------------------------------
# 28.1 データの読み込みと点検
# ---------------------------------------------------------------------------


def read_csv(path=os.path.join(HERE, "ch28_capstone_data.csv")):
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def inspect_and_clean(rows, verbose=True):
    """単位・範囲・欠測・重複・外れ値を点検し，直したデータ（辞書）と点検の記録を返す．"""
    log = []
    # 重複：同じ sample_id で内容も同じ行
    seen, uniq = {}, []
    for r in rows:
        key = r["sample_id"]
        if key in seen:
            same = seen[key] == r
            log.append(f"重複: {key}（内容が{'同じ' if same else '違う'}）→ 2 行目を除く")
            continue
        seen[key] = r
        uniq.append(r)
    # 欠測
    kept = []
    for r in uniq:
        if r["y_log10_sigma"].strip() == "":
            log.append(f"欠測: {r['sample_id']} の y が空欄 → 除く")
            continue
        kept.append(r)
    # 範囲（単位の取り違え）
    for r in kept:
        T = float(r["T_C"])
        if not (T_RANGE[0] <= T <= T_RANGE[1]):
            Tfix = T - 273.0
            log.append(f"範囲外: {r['sample_id']} の T = {T:.0f}（°C の範囲 {T_RANGE[0]:.0f}〜{T_RANGE[1]:.0f} の外）"
                       f" → K で記録したと判断し {Tfix:.0f} °C に直す")
            r["T_C"] = f"{Tfix:.0f}"
        c = float(r["c_molpct"])
        if not (C_RANGE[0] <= c <= C_RANGE[1]):
            log.append(f"範囲外: {r['sample_id']} の c = {c}")
    c = np.array([float(r["c_molpct"]) for r in kept])
    T = np.array([float(r["T_C"]) for r in kept])
    y = np.array([float(r["y_log10_sigma"]) for r in kept])
    b = np.array([int(r["batch"]) for r in kept])
    ids = [r["sample_id"] for r in kept]
    # 外れ値の目安：中央値と MAD による頑健な z
    med = np.median(y)
    mad = np.median(np.abs(y - med))
    rz = (y - med) / (1.4826 * mad)
    log.append(f"y の中央値 {med:.3f}，MAD {mad:.3f}，頑健な z の最大の絶対値 {np.abs(rz).max():.2f}"
               f"（{ids[int(np.abs(rz).argmax())]}）")
    if verbose:
        for s in log:
            print("  " + s)
    return {"c": c, "T": T, "y": y, "batch": b, "ids": ids}, log


def batch_summary(d):
    out = []
    for j in range(1, 6):
        m = d["batch"] == j
        out.append({"batch": j, "n": int(m.sum()),
                    "c_min": float(d["c"][m].min()), "c_max": float(d["c"][m].max()),
                    "T_min": float(d["T"][m].min()), "T_max": float(d["T"][m].max()),
                    "y_mean": float(d["y"][m].mean()), "y_max": float(d["y"][m].max())})
    return out


# ---------------------------------------------------------------------------
# 標準化（訓練データだけで fit する）
# ---------------------------------------------------------------------------


class Standardizer:
    def fit(self, X):
        self.mean = X.mean(axis=0)
        self.sd = X.std(axis=0)          # 母標準偏差（N で割る）
        return self

    def transform(self, X):
        return (X - self.mean) / self.sd


def stack(c, T):
    return np.column_stack([np.asarray(c, float), np.asarray(T, float)])


# ---------------------------------------------------------------------------
# モデル（入力は標準化した x̃ ∈ R^{N×2}）
# ---------------------------------------------------------------------------


class MeanModel:
    name = "平均"

    def fit(self, Z, y, batch=None):
        self.m = y.mean()
        return self

    def predict(self, Z):
        return np.full(len(Z), self.m)


def poly_features(Z, d):
    """1, z1, z2, z1^2, z1 z2, z2^2, ... （次数 d 以下の単項式すべて）．"""
    cols, names = [], []
    for tot in range(d + 1):
        for a in range(tot, -1, -1):
            bexp = tot - a
            cols.append(Z[:, 0] ** a * Z[:, 1] ** bexp)
            names.append((a, bexp))
    return np.column_stack(cols), names


class PolyRidge:
    """多項式＋Ridge．L = 1/2 ||y - Φw||^2 + λ/2 Σ_{j≥1} w_j^2（切片 w_0 には罰則をかけない）．"""

    def __init__(self, d=2, lam=0.0):
        self.d, self.lam = d, lam
        self.name = "線形回帰" if (d == 1 and lam == 0) else f"多項式（d={d}）+Ridge"

    def fit(self, Z, y, batch=None):
        Phi, _ = poly_features(Z, self.d)
        P = np.eye(Phi.shape[1]) * self.lam
        P[0, 0] = 0.0
        A = Phi.T @ Phi + P
        self.w = np.linalg.solve(A, Phi.T @ y)
        return self

    def predict(self, Z):
        Phi, _ = poly_features(Z, self.d)
        return Phi @ self.w


def rbf_ard(A, B, ell, sf):
    """k(x, x') = σ_f^2 exp(-1/2 Σ_i (x_i - x'_i)^2 / ℓ_i^2)．A: (n,2)，B: (m,2)，ell: (2,)．"""
    A = A / ell
    B = B / ell
    d2 = (A ** 2).sum(1)[:, None] + (B ** 2).sum(1)[None, :] - 2 * A @ B.T
    return sf ** 2 * np.exp(-0.5 * np.maximum(d2, 0.0))


class KernelRidge:
    """カーネル Ridge 回帰：a = (K + λI)^{-1}(y - ȳ1)，f(x*) = ȳ + k*^T a．等方的な RBF（σ_f = 1）．"""

    def __init__(self, ell=1.0, lam=0.1):
        self.ell, self.lam = ell, lam
        self.name = "カーネル Ridge"

    def fit(self, Z, y, batch=None):
        self.Z, self.m = Z, y.mean()
        K = rbf_ard(Z, Z, np.array([self.ell, self.ell]), 1.0)
        self.a = cho_solve(cho_factor(K + self.lam * np.eye(len(Z)), lower=True), y - self.m)
        return self

    def predict(self, Z):
        return self.m + rbf_ard(Z, self.Z, np.array([self.ell, self.ell]), 1.0) @ self.a


class GP:
    """ガウス過程回帰（平均関数は定数 m = 訓練データの平均，ARD の RBF カーネル）．
    batch_term=True なら，同じバッチの観測どうしに共分散 σ_b^2 を足す：K_y = K + σ_b^2 Z Z^T + σ^2 I．
    ハイパーパラメーター θ = (ℓ_1, ℓ_2, σ_f, σ[, σ_b]) は対数周辺尤度の最大化で決める（fixed で固定もできる）．"""

    def __init__(self, batch_term=False, fixed=None, name=None):
        self.batch_term = batch_term
        self.fixed = dict(fixed or {})
        self.name = name or ("GP（バッチ項あり）" if batch_term else "ガウス過程")

    # θ の受け渡し（対数で最適化する）
    def _keys(self):
        return ["ell1", "ell2", "sf", "sig"] + (["sb"] if self.batch_term else [])

    def _Ky(self, th, Z, batch):
        K = rbf_ard(Z, Z, np.array([th["ell1"], th["ell2"]]), th["sf"])
        Ky = K + th["sig"] ** 2 * np.eye(len(Z))
        if self.batch_term:
            same = (batch[:, None] == batch[None, :]).astype(float)
            Ky = Ky + th["sb"] ** 2 * same
        return Ky

    def lml(self, th, Z, y, batch):
        r = y - y.mean()
        Ky = self._Ky(th, Z, batch)
        try:
            L = np.linalg.cholesky(Ky + 1e-10 * np.eye(len(Z)))
        except np.linalg.LinAlgError:
            return -1e10
        u = solve_triangular(L, r, lower=True)
        return float(-0.5 * u @ u - np.log(np.diag(L)).sum() - 0.5 * len(y) * np.log(2 * np.pi))

    def fit(self, Z, y, batch=None):
        self.Z, self.y, self.m = Z, y, y.mean()
        self.batch = np.zeros(len(y), int) if batch is None else np.asarray(batch)
        free = [k for k in self._keys() if k not in self.fixed]
        bounds = {"ell1": (0.05, 20.0), "ell2": (0.05, 20.0), "sf": (0.01, 10.0),
                  "sig": (0.005, 1.0), "sb": (0.001, 1.0)}
        sdy = max(y.std(), 1e-3)
        starts = [
            {"ell1": 0.5, "ell2": 0.5, "sf": sdy, "sig": 0.1 * sdy, "sb": 0.1 * sdy},
            {"ell1": 1.0, "ell2": 1.0, "sf": sdy, "sig": 0.3 * sdy, "sb": 0.3 * sdy},
            {"ell1": 0.3, "ell2": 1.5, "sf": 2 * sdy, "sig": 0.2 * sdy, "sb": 0.2 * sdy},
            {"ell1": 2.0, "ell2": 0.3, "sf": 0.5 * sdy, "sig": 0.5 * sdy, "sb": 0.1 * sdy},
        ]

        def unpack(v):
            th = dict(self.fixed)
            th.update({k: float(np.exp(x)) for k, x in zip(free, v)})
            return th

        best = None
        if free:
            lb = [np.log(bounds[k][0]) for k in free]
            ub = [np.log(bounds[k][1]) for k in free]
            for s in starts:
                v0 = np.clip([np.log(s[k]) for k in free], lb, ub)
                res = minimize(lambda v: -self.lml(unpack(v), Z, y, self.batch), v0,
                               method="L-BFGS-B", bounds=list(zip(lb, ub)))
                if best is None or res.fun < best.fun:
                    best = res
            self.theta = unpack(best.x)
        else:
            self.theta = dict(self.fixed)
        self.log_ml = self.lml(self.theta, Z, y, self.batch)
        Ky = self._Ky(self.theta, Z, self.batch)
        self.L = np.linalg.cholesky(Ky + 1e-10 * np.eye(len(Z)))
        self.alpha = cho_solve((self.L, True), y - self.m)
        return self

    def predict(self, Z, return_std=False):
        th = self.theta
        Ks = rbf_ard(self.Z, Z, np.array([th["ell1"], th["ell2"]]), th["sf"])
        mu = self.m + Ks.T @ self.alpha
        if not return_std:
            return mu
        v = solve_triangular(self.L, Ks, lower=True)
        var = np.clip(th["sf"] ** 2 - (v ** 2).sum(0), 0.0, None)   # 丸めで負になったら 0 に切る
        return mu, np.sqrt(var)

    def obs_sd(self, s_latent):
        """新しいバッチで測る観測値 y* の予測標準偏差．"""
        extra = self.theta["sig"] ** 2 + (self.theta["sb"] ** 2 if self.batch_term else 0.0)
        return np.sqrt(s_latent ** 2 + extra)


# ---------------------------------------------------------------------------
# 分割と交差検証
# ---------------------------------------------------------------------------


def folds_random(n, k, seed):
    """ランダムな k 分割．fold[n] = 0..k-1．"""
    rng = np.random.default_rng(seed)
    perm = rng.permutation(n)
    f = np.empty(n, int)
    for i, p in enumerate(perm):
        f[p] = i % k
    return f


def folds_group(batch):
    """バッチ単位の分割（leave-one-batch-out）．fold = batch - 1．"""
    return np.asarray(batch) - 1


PR_GRID = [(d, lam) for d in (1, 2, 3, 4) for lam in (1e-3, 1e-2, 1e-1, 1.0, 10.0, 100.0)]
KR_GRID = [(ell, lam) for ell in (0.3, 0.5, 1.0, 2.0) for lam in (1e-3, 1e-2, 1e-1, 1.0, 10.0)]


def inner_select(make, grid, X, y, batch, inner_folds):
    """内側の交差検証（RMSE）でハイパーパラメーターを選ぶ（入れ子の交差検証の内側）．"""
    best, best_rmse = None, np.inf
    for hp in grid:
        err = []
        for f in np.unique(inner_folds):
            tr, va = inner_folds != f, inner_folds == f
            sc = Standardizer().fit(X[tr])
            mdl = make(*hp).fit(sc.transform(X[tr]), y[tr], batch[tr])
            err.append((y[va] - mdl.predict(sc.transform(X[va]))) ** 2)
        rmse = np.sqrt(np.concatenate(err).mean())
        if rmse < best_rmse:
            best, best_rmse = hp, rmse
    return best


def cross_validate(model_key, X, y, batch, folds, inner="same", seed=SEED, leak_scaler=False,
                   gp_fixed=None, sig_override=None):
    """外側の交差検証．予測値（と GP なら潜在関数の標準偏差・観測値の標準偏差）を返す．
    inner="group"：内側も leave-one-batch-out，"random"：内側はランダム 4 分割．
    leak_scaler=True：標準化の平均・標準偏差を全データで計算する（失敗例 a）．
    sig_override：GP のハイパーパラメーターを周辺尤度で決めた後，ノイズの標準偏差 σ だけをこの値に置き換える（失敗例 d）．"""
    n = len(y)
    pred = np.zeros(n)
    s_lat = np.full(n, np.nan)
    s_obs = np.full(n, np.nan)
    chosen = []
    for f in np.unique(folds):
        tr, te = folds != f, folds == f
        sc = Standardizer().fit(X if leak_scaler else X[tr])
        Ztr, Zte = sc.transform(X[tr]), sc.transform(X[te])
        if model_key == "mean":
            mdl = MeanModel().fit(Ztr, y[tr])
        elif model_key == "linear":
            mdl = PolyRidge(1, 0.0).fit(Ztr, y[tr])
        elif model_key in ("poly", "krr"):
            inf = (folds_group(batch[tr]) if inner == "group"
                   else folds_random(int(tr.sum()), 4, seed + 7 + int(f)))
            if inner == "group":   # 番号を 0.. に詰める
                inf = np.unique(inf, return_inverse=True)[1]
            make = (lambda d, lam: PolyRidge(d, lam)) if model_key == "poly" else \
                   (lambda ell, lam: KernelRidge(ell, lam))
            grid = PR_GRID if model_key == "poly" else KR_GRID
            hp = inner_select(make, grid, X[tr], y[tr], batch[tr], inf)
            chosen.append(hp)
            mdl = make(*hp).fit(Ztr, y[tr])
        elif model_key in ("gp", "gpb"):
            mdl = GP(batch_term=(model_key == "gpb"), fixed=gp_fixed).fit(Ztr, y[tr], batch[tr])
            if sig_override is not None:
                th = dict(mdl.theta)
                th["sig"] = sig_override
                mdl = GP(batch_term=(model_key == "gpb"), fixed=th).fit(Ztr, y[tr], batch[tr])
            chosen.append(mdl.theta)
            mu, s = mdl.predict(Zte, return_std=True)
            pred[te] = mu
            s_lat[te] = s
            s_obs[te] = mdl.obs_sd(s)
            continue
        pred[te] = mdl.predict(Zte)
    return {"pred": pred, "s_lat": s_lat, "s_obs": s_obs, "chosen": chosen}


def mae_rmse(y, p):
    e = y - p
    return float(np.abs(e).mean()), float(np.sqrt((e ** 2).mean()))


def coverage(y, mu, s_obs, z=1.959964):
    return float(np.mean(np.abs(y - mu) <= z * s_obs))


MODELS = [("mean", "平均で答える"), ("linear", "線形回帰"), ("poly", "多項式＋Ridge"),
          ("krr", "カーネル Ridge"), ("gp", "ガウス過程")]


def compare_table(d, seed=SEED, verbose=True):
    """表28.4：ランダム 5 分割とバッチ単位の分割での MAE・RMSE．"""
    X, y, b = stack(d["c"], d["T"]), d["y"], d["batch"]
    fr = folds_random(len(y), 5, seed)
    fg = folds_group(b)
    out = {}
    for key, label in MODELS:
        r_rand = cross_validate(key, X, y, b, fr, inner="random", seed=seed)
        r_grp = cross_validate(key, X, y, b, fg, inner="group", seed=seed)
        out[key] = {"label": label,
                    "random": mae_rmse(y, r_rand["pred"]), "group": mae_rmse(y, r_grp["pred"]),
                    "chosen_random": r_rand["chosen"], "chosen_group": r_grp["chosen"],
                    "res_group": r_grp}
        if verbose:
            print(f"  {label:10s}  ランダム MAE {out[key]['random'][0]:.3f} RMSE {out[key]['random'][1]:.3f}"
                  f" | バッチ MAE {out[key]['group'][0]:.3f} RMSE {out[key]['group'][1]:.3f}")
    return out


# ---------------------------------------------------------------------------
# 28.5 予測区間の被覆率（バッチのずれの影響）
# ---------------------------------------------------------------------------


def clean_from_seed(seed):
    rows, u = make_rows(seed)
    d, _ = inspect_and_clean(rows, verbose=False)
    return d, u


def coverage_study(n_rep=100, seed0=SEED, verbose=True):
    """同じ作り方の合成データを n_rep 組（seed0+1000+r）作り，95 % 予測区間の被覆率を調べる．
    gp：ガウス過程・バッチ単位の分割，gpb：バッチ項ありの GP・バッチ単位，
    gp_rand：ガウス過程・ランダム 5 分割，gp_sig001_rand / gp_sig001：σ を 0.01 に置き換えた GP（失敗例 d）．"""
    keys = ["gp", "gpb", "gp_rand", "gp_sig001", "gp_sig001_rand"]
    res = {k: [] for k in keys}
    for r in range(n_rep):
        d, _ = clean_from_seed(seed0 + 1000 + r)
        X, y, b = stack(d["c"], d["T"]), d["y"], d["batch"]
        fg = folds_group(b)
        fr = folds_random(len(y), 5, seed0 + 1000 + r)
        runs = {"gp": ("gp", fg, None), "gpb": ("gpb", fg, None), "gp_rand": ("gp", fr, None),
                "gp_sig001": ("gp", fg, 0.01), "gp_sig001_rand": ("gp", fr, 0.01)}
        for k, (mk, f, so) in runs.items():
            rr = cross_validate(mk, X, y, b, f, sig_override=so)
            res[k].append(coverage(y, rr["pred"], rr["s_obs"]))
    out = {k: {"mean": float(np.mean(v)), "median": float(np.median(v)),
               "q25": float(np.percentile(v, 25)), "q75": float(np.percentile(v, 75))} for k, v in res.items()}
    if verbose:
        for k, v in out.items():
            print(f"  {k:15s} 被覆率の平均 {v['mean']:.3f}  中央値 {v['median']:.3f} [{v['q25']:.3f}, {v['q75']:.3f}]")
    return out


# ---------------------------------------------------------------------------
# 28.6 ベイズ最適化で追加 5 点を選ぶ
# ---------------------------------------------------------------------------

CG = np.linspace(0.0, 10.0, 41)          # 0.25 mol% 刻み
TG = np.linspace(1000.0, 1400.0, 41)     # 10 °C 刻み
CC, TT = np.meshgrid(CG, TG)
CANDS = np.column_stack([CC.ravel(), TT.ravel()])   # 候補 1681 点
GRID5 = np.array([[2.5, 1100.0], [2.5, 1300.0], [7.5, 1100.0], [7.5, 1300.0], [5.0, 1200.0]])


def ei(mu, s, fbest, xi=0.0):
    d = mu - fbest - xi
    out = np.maximum(d, 0.0)
    pos = s > 0
    z = d[pos] / s[pos]
    out[pos] = d[pos] * norm.cdf(z) + s[pos] * norm.pdf(z)
    return out


def observe(c, T, rng):
    """追加実験 1 回．新しいバッチで合成するので，新しいずれ u と測定のノイズ ε が乗る．"""
    return float(g_true(c, T) + rng.normal(0.0, SD_BATCH) + rng.normal(0.0, SD_NOISE))


def bo_run(d, budget, rng, gp_fixed=None, record=False):
    X = stack(d["c"], d["T"]).copy()
    y = d["y"].copy()
    b = d["batch"].copy()
    steps = []
    for k in range(budget):
        sc = Standardizer().fit(X)
        gp = GP(fixed=gp_fixed).fit(sc.transform(X), y, b)
        mu, s = gp.predict(sc.transform(CANDS), return_std=True)
        fbest = y.max()
        a = ei(mu, s, fbest)
        i = int(np.argmax(a))
        cn, Tn = CANDS[i]
        yn = observe(cn, Tn, rng)
        if record:
            # 予測平均が最大の候補と，標準偏差が最大の候補（比較のため）
            steps.append({"k": k + 1, "c": float(cn), "T": float(Tn), "mu": float(mu[i]), "s": float(s[i]),
                          "ei": float(a[i]), "fbest": float(fbest), "y": yn, "g": float(g_true(cn, Tn)),
                          "argmax_mu": [float(v) for v in CANDS[int(np.argmax(mu))]],
                          "max_mu": float(mu.max()),
                          "argmax_s": [float(v) for v in CANDS[int(np.argmax(s))]], "max_s": float(s.max()),
                          "theta": gp.theta, "n_train": len(y)})
        X = np.vstack([X, [cn, Tn]])
        y = np.append(y, yn)
        b = np.append(b, b.max() + 1)          # 新しいバッチ
    return X, y, steps


def regret_of(X, y):
    """単純後悔：観測値が最大の点を推奨点とし，その真の値と真の最大の差．"""
    i = int(np.argmax(y))
    return G_MAX - float(g_true(X[i, 0], X[i, 1])), X[i]


def random_run(d, budget, rng):
    X = stack(d["c"], d["T"]).copy()
    y = d["y"].copy()
    for _ in range(budget):
        cn = rng.uniform(*C_RANGE)
        Tn = rng.uniform(*T_RANGE)
        X = np.vstack([X, [cn, Tn]])
        y = np.append(y, observe(cn, Tn, rng))
    return X, y


def grid_run(d, rng):
    X = stack(d["c"], d["T"]).copy()
    y = d["y"].copy()
    for cn, Tn in GRID5:
        X = np.vstack([X, [cn, Tn]])
        y = np.append(y, observe(cn, Tn, rng))
    return X, y


def regret_curve(X, y, n0):
    """追加 k 回目（k = 0..）までの観測での単純後悔．"""
    return [regret_of(X[:n0 + k], y[:n0 + k])[0] for k in range(len(y) - n0 + 1)]


def compare_search(n_rep=200, budget=10, seed0=SEED, verbose=True):
    """追加実験の選び方を比べる．繰り返し r ごとに，同じ作り方の 40 点（seed0+1000+r）から出発する．
    追加実験の観測の乱数：BO は seed0+r，ランダム探索は seed0+100000+r，格子（5 点）は seed0+200000+r．"""
    cur = {"bo": [], "random": []}
    grid5, init = [], []
    for r in range(n_rep):
        d, _ = clean_from_seed(seed0 + 1000 + r)
        n0 = len(d["y"])
        Xb, yb, _ = bo_run(d, budget, np.random.default_rng(seed0 + r))
        Xr, yr = random_run(d, budget, np.random.default_rng(seed0 + 100000 + r))
        Xg, yg = grid_run(d, np.random.default_rng(seed0 + 200000 + r))
        cur["bo"].append(regret_curve(Xb, yb, n0))
        cur["random"].append(regret_curve(Xr, yr, n0))
        grid5.append(regret_of(Xg, yg)[0])
        init.append(regret_of(Xb[:n0], yb[:n0])[0])
    summ = {"n_rep": n_rep, "budget": budget}
    for k in ("bo", "random"):
        A = np.array(cur[k])
        summ[k] = {"median": np.median(A, 0).tolist(), "q25": np.percentile(A, 25, 0).tolist(),
                   "q75": np.percentile(A, 75, 0).tolist(), "at5": A[:, 5].tolist(), "at10": A[:, -1].tolist()}
    g = np.array(grid5)
    summ["grid5"] = {"median": float(np.median(g)), "q25": float(np.percentile(g, 25)),
                     "q75": float(np.percentile(g, 75)), "values": g.tolist()}
    i0 = np.array(init)
    summ["initial"] = {"median": float(np.median(i0)), "q25": float(np.percentile(i0, 25)),
                       "q75": float(np.percentile(i0, 75))}
    b5, r5 = np.array(summ["bo"]["at5"]), np.array(summ["random"]["at5"])
    summ["win5"] = {"bo_lt_random": float(np.mean(b5 < r5)), "bo_lt_grid": float(np.mean(b5 < g)),
                    "bo_eq_random": float(np.mean(b5 == r5))}
    b10, r10 = np.array(summ["bo"]["at10"]), np.array(summ["random"]["at10"])
    summ["win10"] = {"bo_lt_random": float(np.mean(b10 < r10))}
    if verbose:
        print(f"  出発時（40 点）の単純後悔 中央値 {summ['initial']['median']:.4f} "
              f"[{summ['initial']['q25']:.4f}, {summ['initial']['q75']:.4f}]")
        for k in ("bo", "random"):
            for kk in (5, 10):
                v = np.array(cur[k])[:, kk]
                print(f"  {k:7s} 追加 {kk:2d} 回 中央値 {np.median(v):.4f} "
                      f"[{np.percentile(v, 25):.4f}, {np.percentile(v, 75):.4f}]")
        print(f"  grid5   中央値 {summ['grid5']['median']:.4f} [{summ['grid5']['q25']:.4f}, {summ['grid5']['q75']:.4f}]")
        print(f"  BO（5 回）がランダムより小さい割合 {summ['win5']['bo_lt_random']:.3f}（同じ {summ['win5']['bo_eq_random']:.3f}），"
              f"格子より小さい割合 {summ['win5']['bo_lt_grid']:.3f}；10 回でランダムより小さい割合 {summ['win10']['bo_lt_random']:.3f}")
    return summ


# ---------------------------------------------------------------------------
# 28.7 失敗例
# ---------------------------------------------------------------------------


def failure_examples(d, verbose=True):
    X, y, b = stack(d["c"], d["T"]), d["y"], d["batch"]
    fg = folds_group(b)
    fr = folds_random(len(y), 5, SEED)
    out = {}
    # (a) 入力の標準化を全データで行う
    for key in ("poly", "krr", "gp"):
        ok = cross_validate(key, X, y, b, fg, inner="group")
        bad = cross_validate(key, X, y, b, fg, inner="group", leak_scaler=True)
        out[f"a_{key}"] = {"ok": mae_rmse(y, ok["pred"]), "leak": mae_rmse(y, bad["pred"])}
    # (c) 訓練範囲の外：c = 7.0 mol% で T を 1000〜1600 °C に伸ばす（40 点全部で学習）
    sc = Standardizer().fit(X)
    gp = GP().fit(sc.transform(X), y, b)
    pr = PolyRidge(3, 1.0).fit(sc.transform(X), y)
    Ts = np.array([1300.0, 1400.0, 1450.0, 1500.0, 1550.0, 1600.0])
    Z = sc.transform(stack(np.full(len(Ts), 7.0), Ts))
    mu, s = gp.predict(Z, return_std=True)
    out["c"] = {"T": Ts.tolist(), "true": g_true(7.0, Ts).tolist(), "gp_mu": mu.tolist(),
                "gp_s": s.tolist(), "poly3": pr.predict(Z).tolist(), "gp_theta": gp.theta,
                "scaler_mean": sc.mean.tolist(), "scaler_sd": sc.sd.tolist()}
    # (d) ノイズの標準偏差を 0.01 に決め打ち（他のハイパーパラメーターは周辺尤度で決めたまま）
    for name, f in (("group", fg), ("random", fr)):
        ok = cross_validate("gp", X, y, b, f)
        bad = cross_validate("gp", X, y, b, f, sig_override=0.01)
        out[f"d_{name}"] = {"ok_cov": coverage(y, ok["pred"], ok["s_obs"]),
                            "bad_cov": coverage(y, bad["pred"], bad["s_obs"]),
                            "ok": mae_rmse(y, ok["pred"]), "bad": mae_rmse(y, bad["pred"]),
                            "ok_sobs_med": float(np.median(ok["s_obs"])),
                            "bad_sobs_med": float(np.median(bad["s_obs"]))}
    if verbose:
        for k, v in out.items():
            print(f"  {k}: " + json.dumps(to_jsonable(v), ensure_ascii=False))
    return out


# ---------------------------------------------------------------------------


def to_jsonable(o):
    if isinstance(o, dict):
        return {str(k): to_jsonable(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [to_jsonable(v) for v in o]
    if isinstance(o, np.ndarray):
        return o.tolist()
    if isinstance(o, (np.floating, np.integer)):
        return o.item()
    return o


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true")
    ap.add_argument("--json", default=None)
    args = ap.parse_args()
    nrep_cov, nrep_bo = (20, 20) if args.quick else (100, 200)
    res = {"versions": {"python": sys.version.split()[0], "numpy": np.__version__,
                        "scipy": __import__("scipy").__version__}}
    t0 = time.perf_counter()
    print("== 28.1 データの点検")
    d, log = inspect_and_clean(read_csv())
    res["inspect"] = log
    res["batches"] = batch_summary(d)
    for s in res["batches"]:
        print("  ", s)
    print("== 28.3–28.4 交差検証（ランダム 5 分割 / バッチ単位）")
    tab = compare_table(d)
    res["table"] = {k: {kk: vv for kk, vv in v.items() if kk != "res_group"} for k, v in tab.items()}
    rg = tab["gp"]["res_group"]
    res["gp_group_cov"] = coverage(d["y"], rg["pred"], rg["s_obs"])
    print(f"  GP（バッチ単位）95 % 区間の被覆率 {res['gp_group_cov']:.3f}")
    rgb = cross_validate("gpb", stack(d["c"], d["T"]), d["y"], d["batch"], folds_group(d["batch"]))
    res["gpb_group"] = {"mae_rmse": mae_rmse(d["y"], rgb["pred"]),
                        "cov": coverage(d["y"], rgb["pred"], rgb["s_obs"]), "theta": rgb["chosen"]}
    print(f"  GP（バッチ項あり）{res['gpb_group']}")
    print("== 28.5 被覆率（同じ作り方のデータ", nrep_cov, "組）")
    res["coverage"] = coverage_study(nrep_cov)
    print("== 28.6 ベイズ最適化（追加 5 点）")
    _, _, steps = bo_run(d, 5, np.random.default_rng(SEED), record=True)
    for st in steps:
        print("  ", {k: (round(v, 4) if isinstance(v, float) else v) for k, v in st.items() if k != "theta"})
    res["bo_steps"] = steps
    res["compare"] = compare_search(n_rep=nrep_bo)
    print("== 28.7 失敗例")
    res["failures"] = failure_examples(d)
    res["elapsed_s"] = time.perf_counter() - t0
    print(f"経過時間 {res['elapsed_s']:.1f} s")
    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(to_jsonable(res), f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
