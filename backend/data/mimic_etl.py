"""
Build a tabular MIMIC-III demo cohort from ICU chart/lab events for KG + unified training.

Output: datasets/mimic_cohort.csv
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

MIMIC_DIR_NAME = "mimic-iii-clinical-database-demo-1.4"
OUTPUT_FILE = "mimic_cohort.csv"

CHART_VITALS = {
    220045: "heart_rate",
    220179: "ap_hi",
    220181: "ap_lo",
}

LAB_MARKERS = {
    50912: "creatinine",
    50931: "gluc",
}


def _patient_age_years(admittime: pd.Timestamp, dob: pd.Timestamp) -> float:
    delta = admittime - dob
    return max(18.0, min(95.0, delta.days / 365.25))


def build_mimic_cohort(
    datasets_dir: Path,
    force: bool = False,
) -> Path | None:
    """
    Aggregate per-admission vitals/labs; skip if output exists unless force=True.
    """
    mimic_root = datasets_dir / MIMIC_DIR_NAME
    if not mimic_root.is_dir():
        return None

    out_path = datasets_dir / OUTPUT_FILE
    if out_path.exists() and not force:
        return out_path

    patients = pd.read_csv(mimic_root / "PATIENTS.csv")
    admissions = pd.read_csv(mimic_root / "ADMISSIONS.csv")

    patients["dob"] = pd.to_datetime(patients["dob"], errors="coerce")
    admissions["admittime"] = pd.to_datetime(admissions["admittime"], errors="coerce")

    adm = admissions.merge(
        patients[["subject_id", "gender", "dob"]],
        on="subject_id",
        how="left",
    )
    adm["age"] = adm.apply(
        lambda r: _patient_age_years(r["admittime"], r["dob"])
        if pd.notna(r["admittime"]) and pd.notna(r["dob"])
        else None,
        axis=1,
    )
    adm["gender"] = adm["gender"].map({"M": 1.0, "F": 0.0})
    adm["cardio"] = adm["hospital_expire_flag"].astype(int)

    hadm_ids = set(adm["hadm_id"].dropna().astype(int))

    chart = pd.read_csv(
        mimic_root / "CHARTEVENTS.csv",
        usecols=["hadm_id", "itemid", "valuenum"],
    )
    chart = chart[
        chart["hadm_id"].isin(hadm_ids)
        & chart["itemid"].isin(CHART_VITALS.keys())
        & chart["valuenum"].notna()
    ]
    chart["feature"] = chart["itemid"].map(CHART_VITALS)
    chart_agg = (
        chart.groupby(["hadm_id", "feature"], as_index=False)["valuenum"]
        .median()
        .pivot(index="hadm_id", columns="feature", values="valuenum")
        .reset_index()
    )

    labs = pd.read_csv(
        mimic_root / "LABEVENTS.csv",
        usecols=["hadm_id", "itemid", "valuenum"],
    )
    labs = labs[
        labs["hadm_id"].isin(hadm_ids)
        & labs["itemid"].isin(LAB_MARKERS.keys())
        & labs["valuenum"].notna()
    ]
    labs["feature"] = labs["itemid"].map(LAB_MARKERS)
    lab_agg = (
        labs.groupby(["hadm_id", "feature"], as_index=False)["valuenum"]
        .median()
        .pivot(index="hadm_id", columns="feature", values="valuenum")
        .reset_index()
    )

    cohort = adm[
        ["hadm_id", "subject_id", "age", "gender", "cardio"]
    ].merge(chart_agg, on="hadm_id", how="left").merge(
        lab_agg, on="hadm_id", how="left", suffixes=("", "_lab")
    )

    for col in ("gluc",):
        if f"{col}_lab" in cohort.columns:
            cohort[col] = cohort[col].fillna(cohort[f"{col}_lab"])
            cohort.drop(columns=[f"{col}_lab"], inplace=True)

    cohort = cohort.drop(columns=["hadm_id", "subject_id"], errors="ignore")
    cohort = cohort.dropna(subset=["age", "gender", "cardio"])
    cohort.to_csv(out_path, index=False)
    return out_path


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2] / "datasets"
    path = build_mimic_cohort(root, force=True)
    print(f"MIMIC cohort: {path} ({pd.read_csv(path).shape if path else 'skipped'})")
