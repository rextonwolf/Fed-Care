"""
Explainability service layer — formats SHAP results for the REST API.
"""

import os
import sys

from fastapi import HTTPException

_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from schemas import PatientData

from explainability.shap_explainer import explain_patient

MODEL_META = {
    "name": "FTTransformer",
    "version": "v1.2.4",
    "framework": "PyTorch",
}


def run_explainability(patient: PatientData) -> dict:
    """
    Run SHAP explanation and return an enterprise JSON envelope.
    """
    try:
        explanation = explain_patient(patient)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "error_code": "MODEL_NOT_AVAILABLE",
                "message": str(exc),
            },
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "status": "error",
                "error_code": "INVALID_BACKGROUND_DATA",
                "message": str(exc),
            },
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "error_code": "SHAP_COMPUTATION_FAILED",
                "message": str(exc),
            },
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "error_code": "EXPLAINABILITY_INTERNAL_ERROR",
                "message": "An unexpected error occurred during explainability analysis.",
            },
        ) from exc

    return {
        "status": "success",
        "data": {
            "risk_probability": explanation["risk_probability"],
            "risk_category": explanation["risk_category"],
            "shap_values": explanation["shap_values"],
            "feature_importance": explanation["feature_importance"],
            "top_features": explanation["top_features"],
            "model": MODEL_META,
            "input_features": list(explanation["shap_values"].keys()),
        },
    }
