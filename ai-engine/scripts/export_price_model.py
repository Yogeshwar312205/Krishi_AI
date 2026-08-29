"""
One-time conversion: mandi_price_model.pkl  ->  .ubj + .meta.json

Why this exists
---------------
The artifact that came out of the training notebook is a joblib pickle of an
XGBRegressor. Pickling the sklearn wrapper is NOT portable across XGBoost
versions, and this particular bundle hits the failure squarely:

  - The fitted intercept is stored in the booster as `base_score: [2.424006E3]`
    — the ARRAY form XGBoost writes when num_target=1.
  - XGBoost 2.1.x cannot parse that array form on load. It silently falls back
    to the 0.5 default, so every prediction lands ~2424 Rs/quintal too low —
    negative for the cheaper crops.

Nothing is actually lost: the true value is sitting in the pickle's bytes. This
script reads it back out, restores it, and re-exports in the formats XGBoost
itself guarantees across versions:

  mandi_price_model.ubj        the booster, via Booster.save_model
  mandi_price_model.meta.json  feature order, label-encoder classes, horizon

The .json also drops the runtime dependency on joblib + a matching scikit-learn,
since a LabelEncoder is only ever used here as "list of class names -> index".

Run:
    .venv/bin/python scripts/export_price_model.py

Re-run it if the model is ever retrained; keep the .pkl and the notebook as the
source of truth.
"""

from __future__ import annotations

import json
import os
import re
import sys
import warnings

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(HERE, "..", "app", "models")

PKL = os.path.join(MODELS_DIR, "mandi_price_model.pkl")
UBJ = os.path.join(MODELS_DIR, "mandi_price_model.ubj")
META = os.path.join(MODELS_DIR, "mandi_price_model.meta.json")


def recover_base_score(pkl_path: str) -> float | None:
    """
    Read the fitted intercept straight out of the pickle's serialized booster.

    The booster is embedded as UBJSON, where the field appears literally as
    `base_score` followed by a length-prefixed string such as `[2.424006E3]`
    (array form) or `5E-1` (scalar form). Both are matched here.
    """
    raw = open(pkl_path, "rb").read()
    values = []
    for m in re.finditer(rb"base_score", raw):
        window = raw[m.end(): m.end() + 40]
        # length-prefixed UBJSON string; just find the first numeric literal
        hit = re.search(rb"\[?\s*(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\s*\]?", window)
        if hit:
            try:
                values.append(float(hit.group(1)))
            except ValueError:
                pass
    # 0.5 is the untrained default; anything else is the fitted intercept.
    fitted = [v for v in values if abs(v - 0.5) > 1e-9]
    return max(fitted) if fitted else None


def main() -> int:
    if not os.path.exists(PKL):
        print(f"error: {PKL} not found", file=sys.stderr)
        return 1

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        import joblib
        bundle = joblib.load(PKL)

    model = bundle["model"]
    booster = model.get_booster()

    current = json.loads(booster.save_config())["learner"]["learner_model_param"]["base_score"]
    print(f"base_score as loaded : {current}")

    recovered = recover_base_score(PKL)
    if recovered is None:
        print("warning: no fitted intercept found in the pickle; leaving base_score as-is")
    else:
        print(f"base_score recovered : {recovered}")
        booster.set_param({"base_score": recovered})
        after = json.loads(booster.save_config())["learner"]["learner_model_param"]["base_score"]
        print(f"base_score restored  : {after}")

    booster.save_model(UBJ)
    print(f"wrote {UBJ}  ({os.path.getsize(UBJ):,} bytes)")

    meta = {
        "featureCols": list(bundle["feature_cols"]),
        # LabelEncoder -> plain ordered class list; index == encoded value.
        "encoders": {
            name: [str(c) for c in le.classes_]
            for name, le in bundle["encoders"].items()
        },
        "nDaysAhead": int(bundle.get("n_days_ahead", 7)),
        "filterState": bundle.get("filter_state"),
        "baseScore": recovered,
        "algorithm": "XGBoost regressor (gradient-boosted trees)",
        "target": "modal price (Rs/quintal), ~7 reporting periods ahead",
        "trainedOn": "Agmarknet daily mandi prices 2023-06-06 .. 2025-06-06",
        "exportedBy": "scripts/export_price_model.py",
        "note": (
            "Exported from mandi_price_model.pkl with the fitted intercept "
            "recovered from the pickle's own bytes — XGBoost 2.1.x cannot parse "
            "the array-form base_score the training run wrote."
        ),
    }
    with open(META, "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=2, ensure_ascii=False)
    print(f"wrote {META}")

    # Prove the exported pair round-trips before declaring success.
    import numpy as np
    import xgboost as xgb

    check = xgb.Booster()
    check.load_model(UBJ)
    cfg = json.loads(check.save_config())["learner"]["learner_model_param"]["base_score"]
    print(f"reloaded .ubj base_score: {cfg}")

    feats = meta["featureCols"]
    commodity_classes = meta["encoders"]["commodity"]
    ok = True
    for crop, level in [("Onion", 2500), ("Potato", 1400), ("Rice", 3200), ("Tomato", 2000), ("Wheat", 2400)]:
        row = {
            "district_enc": 0, "market_enc": 0,
            "commodity_enc": commodity_classes.index(crop),
            "lag_1": level, "lag_3": level, "lag_7": level, "lag_14": level,
            "roll_mean_7": level, "roll_std_7": 0.0, "roll_mean_14": level,
            "price_range": level * 0.2, "day_of_week": 2, "month": 8, "day_of_year": 241,
            "min_price": level * 0.9, "max_price": level * 1.1,
        }
        dm = xgb.DMatrix(np.array([[row[f] for f in feats]], dtype=np.float32), feature_names=feats)
        pred = float(check.predict(dm)[0])
        sane = 0.4 * level <= pred <= 2.5 * level
        ok &= sane
        print(f"  {crop:7s} flat {level:6.0f} -> {pred:8.1f}  {'ok' if sane else 'OUT OF RANGE'}")

    print("\nexport OK" if ok else "\nexport FAILED the sanity check")
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
