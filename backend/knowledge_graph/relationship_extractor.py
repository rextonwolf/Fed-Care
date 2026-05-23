"""
Statistically learn feature–disease and symptom–disease relationships from cohort data.

Methods (no clinical if-else rules):
  - Pearson / point-biserial correlation
  - Mutual information (sklearn)
  - Cohen's d effect size between disease groups
  - Symptom co-occurrence normalization from symptom_disease.csv
"""

from __future__ import annotations

from dataclasses import dataclass
from dataclasses import field
from typing import Dict
from typing import List
from typing import Optional

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.feature_selection import mutual_info_classif

from .config import DEFAULT_THRESHOLDS
from .config import ExtractionThresholds
from .dataset_loader import load_all_tabular
from .dataset_loader import load_symptom_dataset


@dataclass
class LearnedRelationship:
    """Single directed statistical association feature → disease."""

    source_id: str
    target_id: str
    source_type: str  # feature | symptom
    target_type: str  # disease

    composite_weight: float
    correlation: Optional[float] = None
    mutual_information: Optional[float] = None
    effect_size: Optional[float] = None
    p_value: Optional[float] = None
    co_occurrence_strength: Optional[float] = None

    dataset_sources: List[str] = field(default_factory=list)
    sample_size: int = 0
    extraction_methods: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "source_id": self.source_id,
            "target_id": self.target_id,
            "source_type": self.source_type,
            "target_type": self.target_type,
            "composite_weight": round(self.composite_weight, 4),
            "correlation": self.correlation,
            "mutual_information": self.mutual_information,
            "effect_size": self.effect_size,
            "p_value": self.p_value,
            "co_occurrence_strength": self.co_occurrence_strength,
            "dataset_sources": self.dataset_sources,
            "sample_size": self.sample_size,
            "extraction_methods": self.extraction_methods,
        }


def _cohens_d(group1: np.ndarray, group2: np.ndarray) -> float:
    if len(group1) < 2 or len(group2) < 2:
        return 0.0
    n1, n2 = len(group1), len(group2)
    var1, var2 = np.var(group1, ddof=1), np.var(group2, ddof=1)
    pooled = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2 + 1e-9))
    if pooled < 1e-9:
        return 0.0
    return float(abs((np.mean(group1) - np.mean(group2)) / pooled))


def _composite_score(
    corr: float,
    mi: float,
    effect: float,
    p_value: float,
    thresholds: ExtractionThresholds,
) -> float:
    """
    Fuse normalized statistical signals into one edge weight in [0, 1].
    Weights favor reproducible association metrics, not domain heuristics.
    """
    corr_n = min(abs(corr), 1.0)
    mi_n = min(mi / (mi + 0.5), 1.0) if mi > 0 else 0.0
    effect_n = min(abs(effect) / 2.0, 1.0)
    sig_bonus = 0.1 if p_value < thresholds.max_p_value else 0.0

    score = 0.35 * corr_n + 0.35 * mi_n + 0.25 * effect_n + sig_bonus
    return float(min(max(score, 0.0), 1.0))


def extract_from_tabular_frame(
    frame: pd.DataFrame,
    disease_key: str,
    dataset_name: str,
    thresholds: Optional[ExtractionThresholds] = None,
) -> List[LearnedRelationship]:
    """Learn feature→disease edges from one harmonized cohort."""
    thresholds = thresholds or DEFAULT_THRESHOLDS
    relationships: List[LearnedRelationship] = []

    y = frame["__disease__"].astype(int).values
    if len(np.unique(y)) < 2:
        return relationships

    feature_cols = [
        c
        for c in frame.columns
        if not c.startswith("__") and frame[c].notna().sum() >= thresholds.min_samples_per_dataset
    ]

    if not feature_cols:
        return relationships

    X = frame[feature_cols].copy()
    for col in feature_cols:
        X[col] = pd.to_numeric(X[col], errors="coerce")
    X = X.fillna(X.median())

    # Mutual information across all features at once
    try:
        mi_scores = mutual_info_classif(
            X.values,
            y,
            discrete_features=False,
            random_state=42,
        )
        mi_map = dict(zip(feature_cols, mi_scores))
    except Exception:
        mi_map = {c: 0.0 for c in feature_cols}

    pos_mask = y == 1
    neg_mask = y == 0

    for col in feature_cols:
        series = X[col].values.astype(float)

        if np.std(series) < 1e-9:
            continue

        corr, p_val = stats.pearsonr(series, y)
        if np.isnan(corr):
            continue

        mi = float(mi_map.get(col, 0.0))
        effect = _cohens_d(series[pos_mask], series[neg_mask]) if pos_mask.any() and neg_mask.any() else 0.0

        composite = _composite_score(corr, mi, effect, p_val, thresholds)

        if (
            abs(corr) < thresholds.min_abs_correlation
            and mi < thresholds.min_mutual_information
            and composite < thresholds.min_composite_weight
        ):
            continue

        if p_val > thresholds.max_p_value and composite < thresholds.min_composite_weight * 1.5:
            continue

        relationships.append(
            LearnedRelationship(
                source_id=col,
                target_id=disease_key,
                source_type="feature",
                target_type="disease",
                composite_weight=composite,
                correlation=round(float(corr), 4),
                mutual_information=round(mi, 4),
                effect_size=round(effect, 4),
                p_value=round(float(p_val), 6),
                dataset_sources=[dataset_name],
                sample_size=len(frame),
                extraction_methods=["correlation", "mutual_information", "effect_size"],
            )
        )

    return relationships


def extract_symptom_relationships(
    symptom_df: pd.DataFrame,
    thresholds: Optional[ExtractionThresholds] = None,
) -> List[LearnedRelationship]:
    """Symptom→disease edges from normalized co-occurrence / severity weights."""
    thresholds = thresholds or DEFAULT_THRESHOLDS
    relationships: List[LearnedRelationship] = []

    grouped = symptom_df.groupby(["symptom", "disease"]).agg(
        co_occurrence_strength=("normalized_weight", "mean"),
        severity=("severity", "mean"),
        count=("normalized_weight", "count"),
    ).reset_index()

    max_strength = grouped["co_occurrence_strength"].max() or 1.0

    for _, row in grouped.iterrows():
        strength = float(row["co_occurrence_strength"] / (max_strength + 1e-9))
        severity_n = float(row["severity"] / (grouped["severity"].max() + 1e-9))

        composite = 0.6 * strength + 0.4 * severity_n
        if composite < thresholds.min_composite_weight * 0.5:
            continue

        relationships.append(
            LearnedRelationship(
                source_id=row["symptom"],
                target_id=row["disease"],
                source_type="symptom",
                target_type="disease",
                composite_weight=round(min(composite, 1.0), 4),
                co_occurrence_strength=round(strength, 4),
                dataset_sources=["symptom_disease"],
                sample_size=int(row["count"]),
                extraction_methods=["co_occurrence", "severity_weight"],
            )
        )

    return relationships


def merge_relationships(
    all_rels: List[LearnedRelationship],
) -> List[LearnedRelationship]:
    """
    Merge duplicate edges across datasets using sample-size-weighted averaging.
    """
    buckets: Dict[tuple, List[LearnedRelationship]] = {}

    for rel in all_rels:
        key = (rel.source_id, rel.target_id, rel.source_type, rel.target_type)
        buckets.setdefault(key, []).append(rel)

    merged: List[LearnedRelationship] = []

    for key, group in buckets.items():
        total_n = sum(r.sample_size for r in group) or 1
        weights = [r.sample_size / total_n for r in group]

        def wavg(attr: str) -> Optional[float]:
            vals = [getattr(r, attr) for r in group if getattr(r, attr) is not None]
            if not vals:
                return None
            w = weights[: len(vals)]
            return float(np.average(vals, weights=w))

        merged.append(
            LearnedRelationship(
                source_id=key[0],
                target_id=key[1],
                source_type=key[2],
                target_type=key[3],
                composite_weight=round(wavg("composite_weight") or 0.0, 4),
                correlation=wavg("correlation"),
                mutual_information=wavg("mutual_information"),
                effect_size=wavg("effect_size"),
                p_value=min(
                    (r.p_value for r in group if r.p_value is not None),
                    default=None,
                ),
                co_occurrence_strength=wavg("co_occurrence_strength"),
                dataset_sources=sorted({s for r in group for s in r.dataset_sources}),
                sample_size=total_n,
                extraction_methods=sorted({m for r in group for m in r.extraction_methods}),
            )
        )

    merged.sort(key=lambda r: r.composite_weight, reverse=True)
    return merged


def extract_all_relationships(
    thresholds: Optional[ExtractionThresholds] = None,
) -> List[LearnedRelationship]:
    """
    Full pipeline: all tabular cohorts + symptom dataset → merged learned edges.
    """
    thresholds = thresholds or DEFAULT_THRESHOLDS
    collected: List[LearnedRelationship] = []

    for frame, disease_key in load_all_tabular():
        dataset_name = str(frame["__dataset__"].iloc[0])
        collected.extend(
            extract_from_tabular_frame(frame, disease_key, dataset_name, thresholds)
        )

    symptom_df = load_symptom_dataset()
    if symptom_df is not None:
        collected.extend(extract_symptom_relationships(symptom_df, thresholds))

    return merge_relationships(collected)
