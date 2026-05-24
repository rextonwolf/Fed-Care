"""
Unified preprocessing across cardiovascular, UCI heart, and MIMIC demo cohorts.

Produces:
  - scalers/scaler.joblib
  - scalers/feature_names.joblib
  - scalers/feature_medians.joblib
  - processed_data/hospital_{a,b,c}.csv, test.csv

Run from backend/:  python preprocessing_unified.py
"""

from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import pandas as pd
from joblib import dump
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

from clinical_schema import TARGET_COLUMN, UNIFIED_MODEL_FEATURES
from data.mimic_etl import build_mimic_cohort

BACKEND_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_ROOT.parent
DATASETS_DIR = PROJECT_ROOT / "datasets"


def _encode_uci_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Map heart_disease_uci.csv rows to model feature columns."""
    out = pd.DataFrame()
    out["age"] = pd.to_numeric(df["age"], errors="coerce")
    out["gender"] = df["sex"].map({"Male": 1.0, "Female": 0.0, "M": 1.0, "F": 0.0})
    out["ap_hi"] = pd.to_numeric(df["trestbps"], errors="coerce")
    out["cholesterol"] = pd.to_numeric(df["chol"], errors="coerce")
    out["gluc"] = df["fbs"].map({True: 1.0, False: 0.0, "TRUE": 1.0, "FALSE": 0.0})
    out["thalch"] = pd.to_numeric(df["thalch"], errors="coerce")

    for col in ("cp", "restecg", "exang", "oldpeak", "slope", "ca", "thal"):
        if col in df.columns:
            enc = LabelEncoder()
            raw = df[col].astype(str)
            out[col] = enc.fit_transform(raw)

    out["cardio"] = df["num"].apply(lambda x: 1 if x in (1, 2, 3, 4) else 0)
    return out


def _load_cardio() -> pd.DataFrame | None:
    path = DATASETS_DIR / "cardio.csv"
    if not path.exists():
        return None
    df = pd.read_csv(path, sep=";")
    df.columns = df.columns.str.strip()
    if "id" in df.columns:
        df = df.drop(columns=["id"])
    df = df.dropna()
    if TARGET_COLUMN not in df.columns:
        return None
    keep = [c for c in UNIFIED_MODEL_FEATURES + [TARGET_COLUMN] if c in df.columns]
    return df[keep]


def _load_uci() -> pd.DataFrame:
    path = DATASETS_DIR / "heart_disease_uci.csv"
    df = pd.read_csv(path)
    encoded = _encode_uci_frame(df)
    return encoded.dropna(subset=["age", "gender", "cardio"])


def _load_mimic() -> pd.DataFrame | None:
    build_mimic_cohort(DATASETS_DIR, force=False)
    path = DATASETS_DIR / "mimic_cohort.csv"
    if not path.exists():
        return None
    df = pd.read_csv(path)
    return df


def _align_features(frames: list[pd.DataFrame]) -> pd.DataFrame:
    """Union cohorts; median-impute missing extended columns per combined population."""
    combined = pd.concat(frames, ignore_index=True)
    feature_cols = [c for c in UNIFIED_MODEL_FEATURES if c in combined.columns]
    if TARGET_COLUMN not in combined.columns:
        raise ValueError(f"Missing target column {TARGET_COLUMN}")

    medians = {}
    for col in UNIFIED_MODEL_FEATURES:
        if col not in combined.columns:
            combined[col] = float("nan")
        series = pd.to_numeric(combined[col], errors="coerce")
        series = series.replace([np.inf, -np.inf], np.nan)
        med = float(series.median()) if series.notna().any() else 0.0
        medians[col] = med
        combined[col] = series.fillna(med)

    out = combined[UNIFIED_MODEL_FEATURES + [TARGET_COLUMN]]
    out = out.replace([np.inf, -np.inf], np.nan).fillna(0)
    return out, medians


def run_preprocessing() -> None:
    frames = []
    cardio = _load_cardio()
    if cardio is not None and len(cardio) > 0:
        frames.append(cardio)
        print(f"cardio.csv: {len(cardio)} rows")
    else:
        print("cardio.csv: not found — using UCI + MIMIC only")

    uci = _load_uci()
    frames.append(uci)
    print(f"heart_disease_uci.csv: {len(uci)} rows")

    mimic = _load_mimic()
    if mimic is not None and len(mimic) > 0:
        frames.append(mimic)
        print(f"mimic_cohort.csv: {len(mimic)} rows")

    merged, medians = _align_features(frames)
    print(f"Unified cohort: {merged.shape}, features={UNIFIED_MODEL_FEATURES}")

    X = merged.drop(columns=[TARGET_COLUMN])
    y = merged[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    os.makedirs(BACKEND_ROOT / "scalers", exist_ok=True)
    os.makedirs(BACKEND_ROOT / "processed_data", exist_ok=True)

    dump(scaler, BACKEND_ROOT / "scalers" / "scaler.joblib")
    dump(list(X.columns), BACKEND_ROOT / "scalers" / "feature_names.joblib")
    dump(medians, BACKEND_ROOT / "scalers" / "feature_medians.joblib")

    X_train_scaled = pd.DataFrame(X_train_scaled, columns=X.columns)
    X_train_scaled[TARGET_COLUMN] = y_train.values
    X_train_scaled = X_train_scaled.sample(frac=1, random_state=42).reset_index(drop=True)

    total = len(X_train_scaled)
    split_1 = int(total * 0.33)
    split_2 = int(total * 0.66)

    proc = BACKEND_ROOT / "processed_data"
    X_train_scaled.iloc[:split_1].to_csv(proc / "hospital_a.csv", index=False)
    X_train_scaled.iloc[split_1:split_2].to_csv(proc / "hospital_b.csv", index=False)
    X_train_scaled.iloc[split_2:].to_csv(proc / "hospital_c.csv", index=False)

    test_df = pd.DataFrame(X_test_scaled, columns=X.columns)
    test_df[TARGET_COLUMN] = y_test.values
    test_df.to_csv(proc / "test.csv", index=False)

    print("Preprocessing complete.")
    print(f"  Train: {len(X_train)} | Test: {len(X_test)} | Features: {len(X.columns)}")


if __name__ == "__main__":
    run_preprocessing()
