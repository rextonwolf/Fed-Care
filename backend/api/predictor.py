import torch

from api.feature_registry import build_feature_matrix
from api.feature_registry import get_feature_names
from api.feature_registry import input_dimension
from config import resolve_artifact_path
from config import settings
from model import FTTransformer

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

MODEL_PATH = resolve_artifact_path(settings.model_path)
INPUT_DIM = input_dimension()

model = FTTransformer(input_dim=INPUT_DIM)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model = model.to(DEVICE)
model.eval()


def predict(data):
    scaled = build_feature_matrix(data)
    tensor_input = torch.tensor(scaled, dtype=torch.float32).to(DEVICE)

    with torch.no_grad():
        output = model(tensor_input)
        probability = torch.sigmoid(output).item()

    risk = "High Risk" if probability > 0.5 else "Low Risk"

    return {
        "risk_probability": round(probability, 4),
        "risk_category": risk,
        "features_used": get_feature_names(),
    }
