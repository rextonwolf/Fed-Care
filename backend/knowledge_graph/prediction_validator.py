"""
Neuro-symbolic validation layer: compare FT-Transformer predictions with graph reasoning.

Detects contradictions between neural risk scores and statistically learned associations.
No manual clinical rules — disagreement is measured via calibrated score divergence.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict
from typing import List
from typing import Optional

from .config import PRIMARY_NEURAL_DISEASE
from .graph_builder import MedicalKnowledgeGraph
from .uncertainty_engine import UncertaintyReport
from .uncertainty_engine import assess_uncertainty
from .uncertainty_engine import patient_to_graph_features


@dataclass
class ValidationReport:
    neural_risk_probability: float
    neural_risk_category: str
    graph_derived_risk: float
    agreement_score: float
    contradiction_score: float
    is_suspicious: bool
    validation_status: str  # aligned | partial | contradictory
    uncertainty: UncertaintyReport
    supporting_features: List[Dict[str, float]]
    flags: List[str]

    def to_dict(self) -> dict:
        return {
            "neural_risk_probability": self.neural_risk_probability,
            "neural_risk_category": self.neural_risk_category,
            "graph_derived_risk": round(self.graph_derived_risk, 4),
            "agreement_score": round(self.agreement_score, 4),
            "contradiction_score": round(self.contradiction_score, 4),
            "is_suspicious": self.is_suspicious,
            "validation_status": self.validation_status,
            "uncertainty": self.uncertainty.to_dict(),
            "supporting_features": self.supporting_features,
            "flags": self.flags,
        }


def _graph_derived_risk(
    features: Dict[str, float],
    kg: MedicalKnowledgeGraph,
    disease: str,
) -> float:
    """
    Derive a graph-based risk proxy from weighted edges to target disease.
    Normalized sum of (edge_weight × feature_activation).
    """
    if not kg.graph.has_node(disease):
        return 0.0

    total = 0.0
    max_possible = 0.0

    for feature, value in features.items():
        if not kg.graph.has_edge(feature, disease):
            continue
        edge = kg.graph.edges[feature, disease]
        w = edge.get("weight", 0.0)

        activation = 1.0
        if feature in kg.reference_stats:
            ref = kg.reference_stats[feature]
            z = abs(value - ref["mean"]) / (ref["std"] + 1e-9)
            activation = min(z / 2.0, 1.0)

        total += w * activation
        max_possible += w

    if max_possible < 1e-9:
        return 0.0
    return float(min(total / max_possible, 1.0))


def validate_prediction(
    patient_data: dict,
    prediction_result: dict,
    kg: Optional[MedicalKnowledgeGraph] = None,
    disease: str = PRIMARY_NEURAL_DISEASE,
) -> ValidationReport:
    """
    Full neuro-symbolic validation pipeline.

    patient_data: PatientData dict (age, ap_hi, ...)
    prediction_result: { risk_probability, risk_category }
    """
    if kg is None:
        kg = MedicalKnowledgeGraph.load()
        if kg.node_count == 0:
            kg = MedicalKnowledgeGraph().build()

    neural_prob = float(prediction_result.get("risk_probability", 0.0))
    neural_cat = str(prediction_result.get("risk_category", ""))

    features = patient_to_graph_features(patient_data)
    graph_risk = _graph_derived_risk(features, kg, disease)

    uncertainty = assess_uncertainty(patient_data, kg, disease)

    # Agreement = 1 - normalized divergence between neural and graph risk
    divergence = abs(neural_prob - graph_risk)
    agreement = float(max(0.0, 1.0 - divergence))

    # Contradiction: high neural risk + low graph support (or inverse)
    contradiction = divergence * (1.0 - uncertainty.overall_confidence)

    flags: List[str] = []
    if divergence > 0.35:
        flags.append("neural_graph_divergence")
    if uncertainty.ood_score > 0.55:
        flags.append("out_of_distribution")
    if uncertainty.weak_connection_score > 0.5:
        flags.append("weak_graph_connectivity")
    if neural_prob > 0.5 and graph_risk < 0.25:
        flags.append("high_neural_low_graph")
    if neural_prob < 0.35 and graph_risk > 0.6:
        flags.append("low_neural_high_graph")

    if agreement >= 0.7 and not flags:
        status = "aligned"
        suspicious = False
    elif agreement >= 0.45:
        status = "partial"
        suspicious = len(flags) >= 2
    else:
        status = "contradictory"
        suspicious = True

    supporting: List[Dict[str, float]] = []
    for feature, value in features.items():
        if kg.graph.has_edge(feature, disease):
            w = kg.graph.edges[feature, disease].get("weight", 0.0)
            supporting.append(
                {"feature": feature, "edge_weight": round(w, 4), "value": value}
            )
    supporting.sort(key=lambda x: x["edge_weight"], reverse=True)

    return ValidationReport(
        neural_risk_probability=neural_prob,
        neural_risk_category=neural_cat,
        graph_derived_risk=graph_risk,
        agreement_score=agreement,
        contradiction_score=round(contradiction, 4),
        is_suspicious=suspicious,
        validation_status=status,
        uncertainty=uncertainty,
        supporting_features=supporting[:10],
        flags=flags,
    )
