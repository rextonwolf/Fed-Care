"""
Load and harmonize heterogeneous healthcare datasets into a unified feature space.
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict
from typing import List
from typing import Optional
from typing import Tuple

import numpy as np
import pandas as pd

from .config import DATASETS_DIR
from .config import DatasetSpec
from .config import SYMPTOM_DATASET_FILE
from .config import default_tabular_datasets
from .schema_mapping import UNIFIED_SCHEMA
from .schema_mapping import SYMPTOM_DISEASE_PREFIX


def map_dataset_columns(df: pd.DataFrame) -> Dict[str, str]:
    """Map raw columns to unified clinical names (first match wins)."""
    mapped: Dict[str, str] = {}
    for unified_name, possible_columns in UNIFIED_SCHEMA.items():
        for column in df.columns:
            if column in possible_columns and unified_name not in mapped:
                mapped[unified_name] = column
                break
    return mapped


def _encode_binary_target(
    series: pd.Series,
    spec: DatasetSpec,
) -> pd.Series:
    """Binarize disease outcome for correlation / MI (no manual clinical thresholds)."""
    if spec.disease_key == "kidney_disease":
        return series.astype(str).str.lower().apply(
            lambda x: 1 if "ckd" in x else 0
        )

    if spec.binarize_target and spec.positive_target_values:
        return series.apply(
            lambda x: 1 if x in spec.positive_target_values else 0
        )

    # Default: coerce numeric/binary
    numeric = pd.to_numeric(series, errors="coerce")
    if numeric.dropna().isin([0, 1]).all():
        return numeric.fillna(0).astype(int)
    # Multi-class numeric: median split for statistical association only
    median = numeric.median()
    return (numeric >= median).astype(int)


def load_tabular_dataset(
    spec: DatasetSpec,
    datasets_dir: Optional[Path] = None,
) -> Optional[Tuple[pd.DataFrame, Dict[str, str], str]]:
    """
    Returns harmonized numeric frame, column mapping, and resolved disease column name.
    """
    base = datasets_dir or DATASETS_DIR
    path = base / spec.filename
    if not path.exists():
        return None

    df = pd.read_csv(path, sep=spec.sep)
    df.columns = [str(c).strip() for c in df.columns]

    mappings = map_dataset_columns(df)

    disease_col = spec.target_column_override
    if not disease_col and spec.disease_key in mappings:
        disease_col = mappings[spec.disease_key]

    if not disease_col or disease_col not in df.columns:
        return None

    # Build harmonized subset
    out = pd.DataFrame()
    out["__disease__"] = _encode_binary_target(df[disease_col], spec)
    out["__disease_name__"] = spec.disease_key
    out["__dataset__"] = spec.name

    for unified, raw_col in mappings.items():
        if unified in ("heart_disease", "diabetes", "kidney_disease"):
            continue
        if raw_col not in df.columns:
            continue
        col = pd.to_numeric(df[raw_col], errors="coerce")
        if col.notna().sum() >= 10:
            out[unified] = col

    out = out.dropna(subset=["__disease__"])
    return out, mappings, spec.disease_key


def load_all_tabular(
    specs: Optional[List[DatasetSpec]] = None,
    datasets_dir: Optional[Path] = None,
) -> List[Tuple[pd.DataFrame, str]]:
    """Load every available tabular cohort; skip missing files."""
    specs = specs or default_tabular_datasets()
    loaded = []
    for spec in specs:
        result = load_tabular_dataset(spec, datasets_dir)
        if result is not None:
            frame, _, disease_key = result
            if len(frame) >= 30:
                loaded.append((frame, disease_key))
    return loaded


def load_symptom_dataset(
    datasets_dir: Optional[Path] = None,
) -> Optional[pd.DataFrame]:
    """
    Symptom–disease co-occurrence table with severity weights (statistical edge priors).
    """
    base = datasets_dir or DATASETS_DIR
    path = base / SYMPTOM_DATASET_FILE
    if not path.exists():
        return None

    df = pd.read_csv(path)
    symptom_cols = [c for c in df.columns if c.startswith("Symptom_")]
    weight_cols = [c for c in df.columns if c.startswith("weight")]

    rows = []
    for _, row in df.iterrows():
        disease = str(row["Disease"]).strip().lower().replace(" ", "_")
        disease_id = f"{SYMPTOM_DISEASE_PREFIX}::{disease}"

        for i, sym_col in enumerate(symptom_cols):
            symptom = row.get(sym_col)
            if pd.isna(symptom) or not str(symptom).strip():
                continue
            symptom_id = str(symptom).strip().lower().replace(" ", "_")

            weight = 1.0
            if i == 0 and "weight" in df.columns:
                wcol = "weight"
            else:
                wcol = f"weight_{sym_col}"
            if wcol in df.columns and pd.notna(row.get(wcol)):
                weight = float(row[wcol])

            severity = float(row.get("Total_Severity", 1) or 1)
            rows.append(
                {
                    "symptom": symptom_id,
                    "disease": disease_id,
                    "co_occurrence_weight": weight,
                    "severity": severity,
                    "dataset": "symptom_disease",
                }
            )

    if not rows:
        return None

    sym_df = pd.DataFrame(rows)
    # Normalize weights per disease (data-driven scaling)
    sym_df["normalized_weight"] = sym_df.groupby("disease")["co_occurrence_weight"].transform(
        lambda x: (x - x.min()) / (x.max() - x.min() + 1e-9)
    )
    return sym_df


def reference_statistics(
    frames: List[pd.DataFrame],
) -> Dict[str, Dict[str, float]]:
    """
    Population reference means/std per unified feature for OOD detection later.
    """
    combined = pd.concat(frames, ignore_index=True)
    stats: Dict[str, Dict[str, float]] = {}
    feature_cols = [
        c
        for c in combined.columns
        if not c.startswith("__")
    ]
    for col in feature_cols:
        series = pd.to_numeric(combined[col], errors="coerce").dropna()
        if len(series) < 20:
            continue
        stats[col] = {
            "mean": float(series.mean()),
            "std": float(series.std() or 1e-6),
            "q25": float(series.quantile(0.25)),
            "q75": float(series.quantile(0.75)),
        }
    return stats
