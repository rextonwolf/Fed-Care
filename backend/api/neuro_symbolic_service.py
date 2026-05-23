"""
FastAPI integration for neuro-symbolic prediction validation.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any
from typing import Dict

from knowledge_graph.graph_builder import MedicalKnowledgeGraph
from knowledge_graph.prediction_validator import validate_prediction


@lru_cache(maxsize=1)
def get_knowledge_graph() -> MedicalKnowledgeGraph:
    kg = MedicalKnowledgeGraph.load()
    if kg.node_count == 0:
        kg = MedicalKnowledgeGraph().build(save=True)
    return kg


def validate_patient_prediction(
    patient_data: Dict[str, Any],
    prediction_result: Dict[str, Any],
) -> Dict[str, Any]:
    kg = get_knowledge_graph()
    report = validate_prediction(
        patient_data,
        prediction_result,
        kg=kg,
    )
    return report.to_dict()
