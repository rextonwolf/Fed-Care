"""Explainable confidence scoring for predictions.

Heuristics used:
- Base confidence derived from model probability distance from 0.5
  (score = 2 * |p - 0.5| → 0..1)
- Penalize missing critical features (API core features)
- Penalize anomalies flagged by anomaly_detector
- Penalize logical inconsistencies (e.g., diastolic >= systolic)

Returns (score: float, label: str, notes: List[str])
"""
from typing import Any, Dict, List, Tuple
from backend.clinical_schema import API_CORE_FEATURES


def _base_from_probability(prediction: Dict[str, Any]) -> float:
    # prediction may have 'risk_probability' or similar keys
    prob = None
    if prediction is None:
        return 0.0
    if isinstance(prediction, dict):
        prob = prediction.get("risk_probability") or prediction.get("probability") or prediction.get("score")
    try:
        p = float(prob)
    except Exception:
        p = None
    if p is None:
        return 0.5  # unknown; neutral
    # convert to a 0..1 confidence (distance from 0.5)
    return min(max(abs(p - 0.5) * 2.0, 0.0), 1.0)


def score(payload: Dict[str, Any], prediction: Dict[str, Any], anomalies: Dict[str, Any] = None) -> Tuple[float, str, List[str]]:
    notes: List[str] = []
    base = _base_from_probability(prediction)

    # Penalties
    penalty = 0.0

    # Missing critical features
    missing = []
    for f in API_CORE_FEATURES:
        if payload.get(f) is None:
            missing.append(f)
    if missing:
        # penalize 0.08 per missing core feature (tunable)
        p = min(0.08 * len(missing), 0.5)
        penalty += p
        notes.append(f"missing core features: {', '.join(missing)} (penalty {p:.2f})")

    # Anomaly penalties
    if anomalies:
        issues = anomalies.get("issues", [])
        if issues:
            # each distinct issue reduces confidence
            p = min(0.12 * len(issues), 0.6)
            penalty += p
            notes.append(f"anomalies detected: {len(issues)} issue(s) (penalty {p:.2f})")

    # Logical consistency penalty: diastolic >= systolic
    try:
        if payload.get("ap_hi") is not None and payload.get("ap_lo") is not None:
            ahi = float(payload.get("ap_hi"))
            alo = float(payload.get("ap_lo"))
            if alo >= ahi:
                penalty += 0.25
                notes.append("diastolic >= systolic, logical inconsistency (penalty 0.25)")
    except Exception:
        pass

    score = base - penalty
    # clamp
    if score < 0.0:
        score = 0.0
    if score > 1.0:
        score = 1.0

    # Label mapping
    if score >= 0.8:
        label = "High"
    elif score >= 0.5:
        label = "Medium"
    else:
        label = "Low"

    # Add a short explanation about base
    notes.insert(0, f"base_confidence_from_model: {base:.2f}")

    return score, label, notes
