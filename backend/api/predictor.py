import torch
import joblib
import numpy as np
import os
import sys

sys.path.append(
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..")
    )
)

from model import FTTransformer
from config import settings


# Device
DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# Paths — override via MODEL_PATH / SCALER_PATH in .env
MODEL_PATH = settings.model_path

SCALER_PATH = settings.scaler_path


# Load scaler
scaler = joblib.load(SCALER_PATH)


# Input dimension
INPUT_DIM = 11


# Load model
model = FTTransformer(
    input_dim=INPUT_DIM
)

model.load_state_dict(
    torch.load(MODEL_PATH, map_location=DEVICE)
)

model = model.to(DEVICE)

model.eval()


def predict(data):

    features = np.array([[
        data.age,
        data.gender,
        data.height,
        data.weight,
        data.ap_hi,
        data.ap_lo,
        data.cholesterol,
        data.gluc,
        data.smoke,
        data.alco,
        data.active
    ]])

    scaled_features = scaler.transform(features)

    tensor_input = torch.tensor(
        scaled_features,
        dtype=torch.float32
    ).to(DEVICE)

    with torch.no_grad():

        output = model(tensor_input)

        probability = torch.sigmoid(
            output
        ).item()

    risk = "High Risk" if probability > 0.5 else "Low Risk"

    return {
        "risk_probability": round(probability, 4),
        "risk_category": risk
    }