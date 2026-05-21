import os
import sys
import torch
import pandas as pd
import numpy as np

from sklearn.metrics import accuracy_score

from fairlearn.metrics import MetricFrame
from fairlearn.metrics import selection_rate

sys.path.append(
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..")
    )
)

from model import FTTransformer


# Device
DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# Paths
TEST_PATH = "../processed_data/test.csv"

MODEL_PATH = "../models/global_federated_model.pth"


# Load dataset
df = pd.read_csv(TEST_PATH)


# Features and labels
X = df.drop(columns=["cardio"])

y = df["cardio"]


# Sensitive attributes
gender = X["gender"]

age_group = pd.cut(
    X["age"],
    bins=3,
    labels=["Young", "Middle", "Senior"]
)


# Tensor input
X_tensor = torch.tensor(
    X.values,
    dtype=torch.float32
).to(DEVICE)


# Load model
model = FTTransformer(
    input_dim=X.shape[1]
)

model.load_state_dict(
    torch.load(MODEL_PATH, map_location=DEVICE)
)

model = model.to(DEVICE)

model.eval()


# Predictions
with torch.no_grad():

    outputs = model(X_tensor)

    probs = torch.sigmoid(outputs)

    preds = (
        probs > 0.5
    ).float().cpu().numpy().flatten()


# Gender fairness
gender_metric = MetricFrame(

    metrics={
        "accuracy": accuracy_score,
        "selection_rate": selection_rate
    },

    y_true=y,
    y_pred=preds,

    sensitive_features=gender
)


# Age fairness
age_metric = MetricFrame(

    metrics={
        "accuracy": accuracy_score,
        "selection_rate": selection_rate
    },

    y_true=y,
    y_pred=preds,

    sensitive_features=age_group
)


# Reports folder
os.makedirs("../reports", exist_ok=True)


# Save fairness report
with open("../reports/fairness_report.txt", "w") as f:

    f.write("=== Gender Fairness ===\n")
    f.write(str(gender_metric.by_group))
    f.write("\n\n")

    f.write("=== Age Fairness ===\n")
    f.write(str(age_metric.by_group))


print("\n=== Gender Fairness ===")
print(gender_metric.by_group)

print("\n=== Age Fairness ===")
print(age_metric.by_group)

print("\nFairness analysis completed!")