"""ch28_make_data.py — 機械学習 第28章「材料探索の総合演習」の教育用の合成データを作る台本．

これは実在の物質のデータではない（架空の酸化物固体電解質を想定した教育用の合成データ）．
numpy だけで動く．実行すると，この台本と同じフォルダに ch28_capstone_data.csv を書き出す．

    python ch28_make_data.py            # CSV を作り直す（同じ seed なら同じ内容になる）

生成の約束（本文 28.1 節と同じ）
  入力  : 添加量 c（mol%，0〜10），焼成温度 T（°C，1000〜1400）
  出力  : y = log10(σ_ion / (S cm^-1))（無次元）
  真の関数（本文の式と同じ）:
      g(c, T) = -5.0 + [ 1.0 exp(-(c-2.2)^2/(2*0.7^2)) + 1.6 exp(-(c-7.0)^2/(2*1.1^2)) ]
                       * exp( -(T - T_opt(c))^2 / (2*150^2) ),   T_opt(c) = 1150 + 25 c  （°C）
      大域的な最大 g = -3.400（c = 7.0 mol%，T = 1325 °C），局所的な極大 g = -4.000（c = 2.2 mol%，T = 1205 °C）
  観測  : y = g(c, T) + u_j + ε,  バッチ j のずれ u_j ~ N(0, 0.08^2)，測定のノイズ ε ~ N(0, 0.05^2)
  バッチ: 5 つ．1 バッチ 8 点．バッチごとに条件の範囲が偏る（BOXES）．c は 0.1 mol%，T は 10 °C 単位に丸める．
  乱数  : numpy.random.default_rng(20261112)．引く順番は (1) u_1..u_5，(2) バッチ 1 から順に各バッチの
          c（一様），T（一様），ε の順．バッチ 3 だけは 9 点目（測定に失敗して y が欠測）も引く．
  点検用にわざと入れた不備（本文 28.1 節で見つけて直す）
      (i)   B3-09 は y が欠測（空欄）．
      (ii)  B3-02 の温度を K で記録してしまった（T + 273 を書いた）．
      (iii) B2-05 の行が最後にもう一度重複して入っている．
"""
import csv
import os

import numpy as np

SEED = 20261112
SD_BATCH = 0.08     # バッチのずれの標準偏差
SD_NOISE = 0.05     # 測定のノイズの標準偏差
N_PER_BATCH = 8
# バッチ j の条件の範囲：(c_min, c_max) mol%，(T_min, T_max) °C
BOXES = [
    ((0.5, 4.0), (1000.0, 1180.0)),
    ((3.0, 6.0), (1060.0, 1250.0)),
    ((1.0, 5.0), (1220.0, 1400.0)),
    ((5.5, 9.5), (1000.0, 1150.0)),
    ((7.8, 10.0), (1240.0, 1400.0)),
]


def t_opt(c):
    """最適な焼成温度（°C）．添加量 c（mol%）とともにゆるやかに上がる．"""
    return 1150.0 + 25.0 * np.asarray(c, float)


def g_true(c, T):
    """真の関数 g(c, T) = log10(σ_ion / S cm^-1)（バッチのずれ・ノイズを含まない）．"""
    c = np.asarray(c, float)
    T = np.asarray(T, float)
    bumps = (1.0 * np.exp(-(c - 2.2) ** 2 / (2 * 0.7 ** 2))
             + 1.6 * np.exp(-(c - 7.0) ** 2 / (2 * 1.1 ** 2)))
    return -5.0 + bumps * np.exp(-(T - t_opt(c)) ** 2 / (2 * 150.0 ** 2))


def make_rows(seed=SEED):
    """CSV の行（辞書のリスト）と，真のバッチのずれ u（長さ 5）を返す．"""
    rng = np.random.default_rng(seed)
    u = rng.normal(0.0, SD_BATCH, len(BOXES))
    rows = []
    for j, ((c0, c1), (T0, T1)) in enumerate(BOXES, start=1):
        n = N_PER_BATCH + (1 if j == 3 else 0)
        c = np.round(rng.uniform(c0, c1, n), 1)
        T = np.round(rng.uniform(T0, T1, n) / 10.0) * 10.0
        eps = rng.normal(0.0, SD_NOISE, n)
        y = g_true(c, T) + u[j - 1] + eps
        for i in range(n):
            rows.append({"sample_id": f"B{j}-{i + 1:02d}", "batch": j,
                         "c_molpct": f"{c[i]:.1f}", "T_C": f"{T[i]:.0f}",
                         "y_log10_sigma": f"{y[i]:.3f}"})
    # 点検用の不備
    for r in rows:
        if r["sample_id"] == "B3-09":
            r["y_log10_sigma"] = ""                              # (i) 欠測
        if r["sample_id"] == "B3-02":
            r["T_C"] = f"{float(r['T_C']) + 273:.0f}"            # (ii) K で記録
    dup = next(r for r in rows if r["sample_id"] == "B2-05")
    rows.append(dict(dup))                                       # (iii) 重複
    return rows, u


def main():
    rows, u = make_rows()
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ch28_capstone_data.csv")
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["sample_id", "batch", "c_molpct", "T_C", "y_log10_sigma"])
        w.writeheader()
        w.writerows(rows)
    print(f"wrote {out}  ({len(rows)} rows)")
    print("true batch offsets u_j:", " ".join(f"{v:+.4f}" for v in u))


if __name__ == "__main__":
    main()
