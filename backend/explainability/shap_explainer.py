"""
SHAP explainability for the federated healthcare cardiovascular model.

Core API: explain_patient(patient) — used by FastAPI.
Run as script: python -m backend.explainability.shap_explainer
"""

import os

import joblib
import numpy as np
import pandas as pd
import shap
import torch

from api.feature_registry import build_feature_matrix
from api.feature_registry import get_feature_names
from api.feature_registry import get_scaler
from api.feature_registry import input_dimension
from api.feature_registry import patient_to_feature_dict
from api.predictor import DEVICE
from api.predictor import INPUT_DIM
from config import BACKEND_ROOT
from config import resolve_artifact_path
from config import settings
from model import FTTransformer

FEATURE_NAMES = get_feature_names()

MODEL_PATH = resolve_artifact_path(settings.model_path)
TEST_DATA_PATH = BACKEND_ROOT / "processed_data" / "test.csv"
REPORTS_DIR = BACKEND_ROOT / "reports"

scaler = get_scaler()

_model = None
_explainer = None
_background = None


def _load_model():
    global _model
    if _model is None:
        if not MODEL_PATH.is_file():
            raise FileNotFoundError(f"Model weights not found: {MODEL_PATH}")
        _model = FTTransformer(input_dim=INPUT_DIM)
        _model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
        _model = _model.to(DEVICE)
        _model.eval()
    return _model


def _load_background(max_samples: int = 100) -> np.ndarray:
    global _background
    if _background is None:
        if not TEST_DATA_PATH.is_file():
            raise FileNotFoundError(f"Background dataset not found: {TEST_DATA_PATH}")
        df = pd.read_csv(TEST_DATA_PATH)
        X = df.drop(columns=["cardio"], errors="ignore")
        names = get_feature_names()
        missing = set(names) - set(X.columns)
        if missing:
            raise ValueError(f"Background data missing columns: {missing}")
        _background = X[names].values[:max_samples]
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
    row = patient_to_feature_dict(patient)
    return pd.DataFrame([row], columns=FEATURE_NAMES)


def _format_shap_output(shap_values: np.ndarray) -> dict:
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
    from api.predictor import predict

    prediction = predict(patient)
    scaled = build_feature_matrix(patient)

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
    out_path = REPORTS_DIR / "shap_summary.png"

    plt.figure()
    shap.summary_plot(
        shap_values,
        sample,
        feature_names=FEATURE_NAMES,
        show=False,
    )
    plt.savefig(out_path, bbox_inches="tight")
    plt.close()

    return str(out_path)


if __name__ == "__main__":
    path = generate_report()
    print(f"SHAP explainability report generated: {path}")
