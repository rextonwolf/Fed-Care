"""Simple rule-based clinical anomaly detector.

Performs:
- out-of-range checks against clinically plausible bounds
- logical consistency checks (e.g., systolic > diastolic)
- categorical-value validation for encoded fields

Returns a structured dict with boolean flag and list of human-readable issues.
"""
from typing import Any, Dict, List
from backend.clinical_schema import API_CORE_FEATURES, API_TO_GRAPH


# Clinical plausibility bounds (inclusive).
# Values chosen to be conservative and avoid false positives for edge cases.
PLAUSIBLE_BOUNDS = {
    "age": (0, 120),
    "height": (100, 230),  # cm
    "weight": (20, 300),
    "ap_hi": (60, 260),  # systolic
    "ap_lo": (30, 160),  # diastolic
    "cholesterol": (1, 3),  # encoded categories 1..3
    "gluc": (1, 3),
    "bmi": (10, 60),
    "heart_rate": (30, 220),
    "creatinine": (0.2, 20.0),
}


def _check_bounds(key: str, value: Any) -> List[str]:
    issues: List[str] = []
    if value is None:
        return issues

    if key in PLAUSIBLE_BOUNDS:
        low, high = PLAUSIBLE_BOUNDS[key]
        try:
            v = float(value)
        except Exception:
            issues.append(f"{key}: non-numeric value")
            return issues
        if v < low or v > high:
            issues.append(f"{key} out of plausible range ({low}–{high}): {v}")
    return issues


def detect(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Run a battery of fast checks and return a report dict.

        Report keys:
            - anomaly_detected: bool
            - issues: list[str]
            - summary: short reason string
    """
    issues: List[str] = []

    # Check core features plausibility
    for k in API_CORE_FEATURES:
        # payload may contain ap_hi/ap_lo names — use them directly
        if k in payload:
            issues.extend(_check_bounds(k, payload.get(k)))
        # also accept API_TO_GRAPH mapped names
        if k in API_TO_GRAPH and API_TO_GRAPH.get(k) in payload:
            issues.extend(_check_bounds(k, payload.get(API_TO_GRAPH.get(k))))

    # Systolic/diastolic logical check (ap_hi / ap_lo)
    ap_hi = payload.get("ap_hi")
    ap_lo = payload.get("ap_lo")
    try:
        if ap_hi is not None and ap_lo is not None:
            ahi = float(ap_hi)
            alo = float(ap_lo)
            if alo >= ahi:
                issues.append(f"Diastolic ({alo}) >= systolic ({ahi}) — possible measurement error")
    except Exception:
        pass

    # BMI check if height/weight present
    h = payload.get("height")
    w = payload.get("weight")
    try:
        if h is not None and w is not None:
            h_m = float(h) / 100.0
            if h_m > 0:
                bmi = float(w) / (h_m * h_m)
    except Exception:
        bmi = None

    # Simpler BMI check (avoid floating errors): flag extreme BMI
    try:
        if h is not None and w is not None:
            h_m = float(h) / 100.0
            if h_m > 0:
                bmi = float(w) / (h_m * h_m)
                if bmi < 10 or bmi > 60:
                    issues.append(f"Computed BMI out of range (10-60): {bmi:.1f}")
    except Exception:
        pass

    # Categorical checks
    chol = payload.get("cholesterol") or payload.get("chol")
    if chol is not None:
        try:
            c = int(chol)
            if c < 1 or c > 3:
                issues.append(f"cholesterol unexpected category: {c}")
        except Exception:
            issues.append("cholesterol: non-integer category")

    gluc = payload.get("gluc")
    if gluc is not None:
        try:
            g = int(gluc)
            if g < 1 or g > 3:
                issues.append(f"gluc unexpected category: {g}")
        except Exception:
            issues.append("gluc: non-integer category")

    # Summarize
    anomaly = len(issues) > 0
    summary = "; ".join(issues[:3]) if issues else ""

    return {
        "anomaly_detected": anomaly,
        "issues": issues,
        "summary": summary,
    }
