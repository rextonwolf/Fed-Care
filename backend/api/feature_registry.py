"""
Load model feature order, medians, and scaler; build inference vectors from API payloads.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any, Dict, List

import joblib
import numpy as np

from backend.clinical_schema import API_CORE_FEATURES
from backend.clinical_schema import API_TO_GRAPH
from backend.config import resolve_artifact_path
from backend.config import settings

LEGACY_FEATURES = list(API_CORE_FEATURES)


@lru_cache
def get_feature_names() -> List[str]:
    path = resolve_artifact_path(settings.feature_names_path)
    if path.is_file():
        return list(joblib.load(path))
    return list(LEGACY_FEATURES)


@lru_cache
def get_feature_medians() -> Dict[str, float]:
    path = resolve_artifact_path(settings.feature_medians_path)
    if path.is_file():
        return dict(joblib.load(path))
    return {}


@lru_cache
def get_scaler():
    path = resolve_artifact_path(settings.scaler_path)
    return joblib.load(path)


def patient_to_feature_dict(patient: Any) -> Dict[str, float]:
    if hasattr(patient, "model_dump"):
        data = patient.model_dump(exclude_none=True)
    elif hasattr(patient, "dict"):
        data = patient.dict(exclude_none=True)
    else:
        data = dict(patient)

    data.pop("patient_id", None)
    medians = get_feature_medians()
    names = get_feature_names()
    out: Dict[str, float] = {}

    for name in names:
        if name in data and data[name] is not None:
            out[name] = float(data[name])
        elif name in medians:
            out[name] = float(medians[name])
        elif name in API_CORE_FEATURES:
            raise ValueError(f"Missing required feature: {name}")
        else:
            out[name] = float(medians.get(name, 0.0))

    return out


def build_feature_matrix(patient: Any) -> np.ndarray:
    import pandas as pd

    names = get_feature_names()
    values = patient_to_feature_dict(patient)
    frame = pd.DataFrame([[values[n] for n in names]], columns=names)
    return get_scaler().transform(frame)


def patient_to_graph_features(patient: Any) -> Dict[str, float]:
    if hasattr(patient, "model_dump"):
        data = patient.model_dump(exclude_none=True)
    elif hasattr(patient, "dict"):
        data = patient.dict(exclude_none=True)
    else:
        data = dict(patient)

    features: Dict[str, float] = {}
    for api_key, graph_key in API_TO_GRAPH.items():
        if api_key in data and data[api_key] is not None:
            features[graph_key] = float(data[api_key])
    return features


def input_dimension() -> int:
    return len(get_feature_names())
