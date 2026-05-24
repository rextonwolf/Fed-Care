"""Tier 1 Clinical Uncertainty & Validation Layer

Lightweight explainable checks that combine anomaly detection and
confidence scoring to produce human-readable validation metadata for
prediction responses.

This module orchestrates the other validators in the same package.
"""
from typing import Any, Dict

from validation import anomaly_detector
from validation import confidence_scoring


def validate_prediction(payload: Dict[str, Any], prediction: Dict[str, Any]) -> Dict[str, Any]:
    """Run anomaly detection and confidence scoring and return a
    validation summary dict.

    Returned fields:
      - confidence_score: float 0..1
      - confidence_label: High|Medium|Low
      - anomaly_detected: bool
      - anomaly_reason: str | None
      - validation_notes: List[str]
    """
    notes = []

    # Run anomaly detection first (out-of-range, logical inconsistencies)
    anomalies = anomaly_detector.detect(payload)
    if anomalies.get("issues"):
        notes.extend(anomalies.get("issues", []))

    # Compute confidence score using explainable heuristics
    score, label, score_notes = confidence_scoring.score(payload, prediction, anomalies)
    notes.extend(score_notes)

    validation = {
        "confidence_score": round(float(score), 4),
        "confidence_label": label,
        "anomaly_detected": bool(anomalies.get("anomaly_detected", False)),
        "anomaly_reason": "; ".join(anomalies.get("issues", [])) or None,
        "validation_notes": notes,
    }

    return validation
