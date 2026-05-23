"""
Uncertainty and out-of-distribution detection using graph structure + reference stats.

Compares patient feature patterns against statistically learned population structure.
No hardcoded clinical thresholds — uses z-scores, graph connectivity, and support dispersion.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict
from typing import List
from typing import Optional

import numpy as np

from .config import PRIMARY_NEURAL_DISEASE
from .config import PREDICTOR_FEATURES
from backend.clinical_schema import API_TO_GRAPH
from .graph_builder import MedicalKnowledgeGraph


@dataclass
class UncertaintyReport:
    overall_confidence: float
    graph_support_score: float
    ood_score: float
    weak_connection_score: float
    unusual_feature_flags: List[str]
    disconnected_features: List[str]
    explanation: str

    def to_dict(self) -> dict:
        return {
            "overall_confidence": round(self.overall_confidence, 4),
            "graph_support_score": round(self.graph_support_score, 4),
            "ood_score": round(self.ood_score, 4),
            "weak_connection_score": round(self.weak_connection_score, 4),
            "unusual_feature_flags": self.unusual_feature_flags,
            "disconnected_features": self.disconnected_features,
            "explanation": self.explanation,
        }


PREDICTOR_TO_GRAPH = API_TO_GRAPH


def patient_to_graph_features(patient_data: dict) -> Dict[str, float]:
    """Convert API patient payload to unified graph feature dict."""
    features: Dict[str, float] = {}
    for pred_key, graph_key in PREDICTOR_TO_GRAPH.items():
        if pred_key in patient_data and patient_data[pred_key] is not None:
            features[graph_key] = float(patient_data[pred_key])
    return features


def _z_score(value: float, mean: float, std: float) -> float:
    return abs(value - mean) / (std + 1e-9)


def assess_uncertainty(
    patient_data: dict,
    kg: MedicalKnowledgeGraph,
    target_disease: str = PRIMARY_NEURAL_DISEASE,
) -> UncertaintyReport:
    """
    Estimate prediction uncertainty from graph topology and statistical references.

    - ood_score: features far from training reference distributions
    - weak_connection_score: patient features poorly connected to target disease in KG
    - graph_support_score: aggregated edge evidence for disease
    """
    features = patient_to_graph_features(patient_data)
    ref = kg.reference_stats

    unusual: List[str] = []
    disconnected: List[str] = []
    z_scores: List[float] = []

    for name, value in features.items():
        # OOD via reference statistics (learned from cohorts)
        if name in ref:
            z = _z_score(value, ref[name]["mean"], ref[name]["std"])
            z_scores.append(z)
            if z > 3.0:
                unusual.append(name)

        # Graph connectivity to target disease
        if not kg.graph.has_node(name):
            disconnected.append(name)
        elif not kg.graph.has_edge(name, target_disease):
            disconnected.append(name)

    ood_score = float(min(np.mean(z_scores) / 3.0, 1.0)) if z_scores else 0.5

    graph_support = kg.get_disease_support_score(features, target_disease)

    n_features = len(features) or 1
    weak_ratio = len(disconnected) / n_features
    weak_connection_score = float(min(weak_ratio + (1.0 - graph_support) * 0.5, 1.0))

    # Overall confidence: high when graph supports pattern and patient is in-distribution
    overall = (
        0.45 * graph_support
        + 0.35 * (1.0 - ood_score)
        + 0.20 * (1.0 - weak_connection_score)
    )
    overall = float(min(max(overall, 0.0), 1.0))

    if ood_score > 0.6:
        explanation = (
            "Patient feature profile deviates from cohort reference distributions; "
            "elevated out-of-distribution uncertainty."
        )
    elif weak_connection_score > 0.5:
        explanation = (
            "Several features are weakly connected to heart_disease in the learned "
            "knowledge graph; graph evidence is limited."
        )
    elif graph_support < 0.3:
        explanation = (
            "Low graph support for cardiovascular disease given current feature pattern."
        )
    else:
        explanation = (
            "Patient pattern is consistent with graph-learned associations; "
            "moderate confidence from structural evidence."
        )

    return UncertaintyReport(
        overall_confidence=overall,
        graph_support_score=graph_support,
        ood_score=ood_score,
        weak_connection_score=weak_connection_score,
        unusual_feature_flags=unusual,
        disconnected_features=disconnected,
        explanation=explanation,
    )
