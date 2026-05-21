"""
SHAP explainability for the federated healthcare cardiovascular model.

Core API: explain_patient(patient) — used by FastAPI.
Run as script: python shap_explainer.py — generates summary plot report.
"""

import os
import sys

import joblib
import numpy as np
import pandas as pd
import shap
import torch

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_ROOT)
sys.path.insert(0, os.path.join(BACKEND_ROOT, "api"))

from model import FTTransformer  # noqa: E402

# Reuse predictor assets for identical inference + scaling
from predictor import DEVICE, INPUT_DIM, scaler  # noqa: E402

FEATURE_NAMES = [
    "age",
    "gender",
    "height",
    "weight",
    "ap_hi",
    "ap_lo",
    "cholesterol",
    "gluc",
    "smoke",
    "alco",
    "active",
]

MODEL_PATH = os.path.join(BACKEND_ROOT, "models", "global_federated_model.pth")
TEST_DATA_PATH = os.path.join(BACKEND_ROOT, "processed_data", "test.csv")
REPORTS_DIR = os.path.join(BACKEND_ROOT, "reports")

_model = None
_explainer = None
_background = None


def _load_model():
    global _model
    if _model is None:
        if not os.path.isfile(MODEL_PATH):
            raise FileNotFoundError(f"Model weights not found: {MODEL_PATH}")
        _model = FTTransformer(input_dim=INPUT_DIM)
        _model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
        _model = _model.to(DEVICE)
        _model.eval()
    return _model


def _load_background(max_samples: int = 100) -> np.ndarray:
    global _background
    if _background is None:
        if not os.path.isfile(TEST_DATA_PATH):
            raise FileNotFoundError(f"Background dataset not found: {TEST_DATA_PATH}")
        df = pd.read_csv(TEST_DATA_PATH)
        X = df.drop(columns=["cardio"], errors="raise")
        missing = set(FEATURE_NAMES) - set(X.columns)
        if missing:
            raise ValueError(f"Background data missing columns: {missing}")
        _background = X[FEATURE_NAMES].values[:max_samples]
    return _background


def _predict_fn(data: np.ndarray) -> np.ndarray:
    model = _load_model()
    tensor_data = torch.tensor(data, dtype=torch.float32).to(DEVICE)
    with torch.no_grad():
        outputs = model(tensor_data)
        probs = torch.sigmoid(outputs)
    return probs.cpu().numpy()


def _get_explainer() -> shap.Explainer:
    global _explainer
    if _explainer is None:
        background = _load_background()
        _explainer = shap.Explainer(_predict_fn, background)
    return _explainer


def patient_to_dataframe(patient) -> pd.DataFrame:
    """Build raw feature row from PatientData (same order as predictor.py)."""
    return pd.DataFrame(
        [
            {
                "age": patient.age,
                "gender": patient.gender,
                "height": patient.height,
                "weight": patient.weight,
                "ap_hi": patient.ap_hi,
                "ap_lo": patient.ap_lo,
                "cholesterol": patient.cholesterol,
                "gluc": patient.gluc,
                "smoke": patient.smoke,
                "alco": patient.alco,
                "active": patient.active,
            }
        ],
        columns=FEATURE_NAMES,
    )


def _format_shap_output(shap_values: np.ndarray) -> dict:
    """Map SHAP vector to API-friendly structures."""
    values = shap_values.flatten().tolist()
    shap_map = {
        name: round(float(val), 6) for name, val in zip(FEATURE_NAMES, values)
    }

    ranked = sorted(
        shap_map.items(),
        key=lambda item: abs(item[1]),
        reverse=True,
    )

    feature_importance = [
        {
            "feature": name,
            "shap_value": val,
            "abs_importance": round(abs(val), 6),
            "rank": idx + 1,
        }
        for idx, (name, val) in enumerate(ranked)
    ]

    top_features = [
        {
            "feature": name,
            "shap_value": val,
            "direction": "increases_risk" if val >= 0 else "decreases_risk",
        }
        for name, val in ranked[:5]
    ]

    return {
        "shap_values": shap_map,
        "feature_importance": feature_importance,
        "top_features": top_features,
    }


def explain_patient(patient) -> dict:
    """
    Compute SHAP explanation for one patient.

    Uses predictor.predict() for risk_probability / risk_category (compatibility).
    """
    from predictor import predict  # local import avoids circular load at module init

    prediction = predict(patient)

    raw = patient_to_dataframe(patient)
    scaled = scaler.transform(raw)

    try:
        explainer = _get_explainer()
        explanation = explainer(scaled)
        shap_matrix = explanation.values
    except Exception as exc:
        raise RuntimeError(f"SHAP computation failed: {exc}") from exc

    shap_payload = _format_shap_output(shap_matrix[0])

    return {
        **shap_payload,
        "risk_probability": prediction["risk_probability"],
        "risk_category": prediction["risk_category"],
    }


def generate_report(
    sample_size: int = 50,
    background_size: int = 100,
) -> str:
    """CLI helper: write SHAP summary plot to reports/."""
    import matplotlib.pyplot as plt

    global _background, _explainer
    _background = None
    _explainer = None

    df = pd.read_csv(TEST_DATA_PATH)
    X = df.drop(columns=["cardio"])[FEATURE_NAMES]
    background = X.values[:background_size]
    sample = X.values[:sample_size]

    explainer = shap.Explainer(_predict_fn, background)
    shap_values = explainer(sample)

    os.makedirs(REPORTS_DIR, exist_ok=True)
    out_path = os.path.join(REPORTS_DIR, "shap_summary.png")

    plt.figure()
    shap.summary_plot(
        shap_values,
        sample,
        feature_names=FEATURE_NAMES,
        show=False,
    )
    plt.savefig(out_path, bbox_inches="tight")
    plt.close()

    return out_path


if __name__ == "__main__":
    path = generate_report()
    print(f"SHAP explainability report generated: {path}")
