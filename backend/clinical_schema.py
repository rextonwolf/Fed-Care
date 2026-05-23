"""
Shared clinical vocabulary for preprocessing, FT-Transformer inference, and the
statistically learned knowledge graph. Single source of truth for column harmonization.
"""

from __future__ import annotations

from typing import Dict
from typing import List

# Raw column names → unified feature / disease ids (first match wins per dataset)
UNIFIED_SCHEMA: Dict[str, List[str]] = {
    "age": ["age", "Age"],
    "gender": ["gender", "sex", "Gender"],
    "height": ["height"],
    "weight": ["weight"],
    "blood_pressure_systolic": [
        "ap_hi",
        "trestbps",
        "bp",
        "systolic_bp",
        "BloodPressure",
        "Blood Pressure",
    ],
    "blood_pressure_diastolic": ["ap_lo", "diastolic_bp"],
    "cholesterol": ["cholesterol", "chol"],
    "glucose": ["glucose", "Glucose", "gluc", "bgr"],
    "bmi": ["bmi", "BMI"],
    "smoking": ["smoke", "smoking"],
    "alcohol": ["alco"],
    "physical_activity": ["active"],
    "heart_rate": ["heart_rate", "Heart Rate"],
    "max_heart_rate": ["thalch"],
    "creatinine": ["creatinine", "sc"],
    "hemoglobin": ["hemo", "hemoglobin"],
    "insulin": ["Insulin", "insulin"],
    "pregnancies": ["Pregnancies"],
    "skin_thickness": ["SkinThickness"],
    "diabetes_pedigree": ["DiabetesPedigreeFunction"],
    "serum_creatinine": ["sc", "creatinine"],
    "blood_urea": ["bu"],
    "sodium": ["sod"],
    "potassium": ["pot"],
    "packed_cell_volume": ["pcv"],
    "white_blood_cell": ["wc"],
    "red_blood_cell": ["rc"],
    # UCI heart disease attributes (encoded numerically in preprocessing)
    "chest_pain": ["cp"],
    "rest_ecg": ["restecg"],
    "exercise_angina": ["exang"],
    "st_depression": ["oldpeak"],
    "slope_st": ["slope"],
    "vessels": ["ca"],
    "thalassemia": ["thal"],
    "heart_disease": [
        "target",
        "cardio",
        "heart_disease",
        "num",
        "hospital_expire_flag",
    ],
    "diabetes": ["Outcome", "diabetes", "dm"],
    "kidney_disease": ["classification", "ckd"],
}

DISEASE_NODES = [
    "heart_disease",
    "diabetes",
    "kidney_disease",
]

SYMPTOM_DISEASE_PREFIX = "symptom_disease"

# Production API fields (cardiovascular cohort — always accepted on /predict)
API_CORE_FEATURES = [
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

# Optional inputs aligned with unified schema (UCI + MIMIC + labs)
API_EXTENDED_FEATURES = [
    "cp",
    "restecg",
    "thalch",
    "exang",
    "oldpeak",
    "slope",
    "ca",
    "thal",
    "heart_rate",
    "creatinine",
    "bmi",
    "insulin",
    "hemoglobin",
]

# Ordered columns saved by preprocessing_unified.py (target column excluded)
UNIFIED_MODEL_FEATURES = API_CORE_FEATURES + API_EXTENDED_FEATURES

TARGET_COLUMN = "cardio"

# Predictor / neuro-symbolic graph feature ids (unified names)
PREDICTOR_GRAPH_FEATURES = [
    "age",
    "gender",
    "height",
    "weight",
    "blood_pressure_systolic",
    "blood_pressure_diastolic",
    "cholesterol",
    "glucose",
    "smoking",
    "alcohol",
    "physical_activity",
    "heart_rate",
    "creatinine",
    "chest_pain",
    "rest_ecg",
    "exercise_angina",
    "st_depression",
    "hemoglobin",
    "bmi",
]

# API payload key → unified graph feature id
API_TO_GRAPH: Dict[str, str] = {
    "age": "age",
    "gender": "gender",
    "height": "height",
    "weight": "weight",
    "ap_hi": "blood_pressure_systolic",
    "ap_lo": "blood_pressure_diastolic",
    "cholesterol": "cholesterol",
    "gluc": "glucose",
    "smoke": "smoking",
    "alco": "alcohol",
    "active": "physical_activity",
    "cp": "chest_pain",
    "restecg": "rest_ecg",
    "thalch": "max_heart_rate",
    "exang": "exercise_angina",
    "oldpeak": "st_depression",
    "slope": "slope_st",
    "ca": "vessels",
    "thal": "thalassemia",
    "heart_rate": "heart_rate",
    "creatinine": "creatinine",
    "bmi": "bmi",
    "insulin": "insulin",
    "hemoglobin": "hemoglobin",
}
