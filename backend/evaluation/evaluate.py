import os

import torch
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd

from sklearn.metrics import (
    confusion_matrix,
    classification_report,
    roc_curve,
    auc
)

from torch.utils.data import DataLoader

from cardio_dataset import CardioDataset
from model import FTTransformer


# Device
device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print(f"Using device: {device}")


# Paths
TEST_PATH = "../processed_data/test.csv"
MODEL_PATH = "../models/ft_transformer.pth"


# Dataset
test_dataset = CardioDataset(TEST_PATH)

test_loader = DataLoader(
    test_dataset,
    batch_size=256,
    shuffle=False
)


# Model
input_dim = test_dataset.X.shape[1]

model = FTTransformer(input_dim=input_dim)

model.load_state_dict(
    torch.load(MODEL_PATH, map_location=device)
)

model = model.to(device)

model.eval()


# Predictions
predictions = []
probabilities = []
actuals = []


with torch.no_grad():

    for X_batch, y_batch in test_loader:

        X_batch = X_batch.to(device)

        outputs = model(X_batch)

        probs = torch.sigmoid(outputs)

        preds = (probs > 0.5).float()

        probabilities.extend(
            probs.cpu().numpy()
        )

        predictions.extend(
            preds.cpu().numpy()
        )

        actuals.extend(
            y_batch.numpy()
        )


# Flatten
predictions = [int(p[0]) for p in predictions]
probabilities = [float(p[0]) for p in probabilities]


# Classification Report
report = classification_report(
    actuals,
    predictions
)

print(report)


# Create reports folder
os.makedirs("../reports", exist_ok=True)


# Save report
with open("../reports/classification_report.txt", "w") as f:

    f.write(report)


# Confusion Matrix
cm = confusion_matrix(actuals, predictions)

plt.figure(figsize=(6, 5))

sns.heatmap(
    cm,
    annot=True,
    fmt="d"
)

plt.title("Confusion Matrix")

plt.xlabel("Predicted")
plt.ylabel("Actual")

plt.savefig(
    "../reports/confusion_matrix.png"
)

plt.close()


# ROC Curve
fpr, tpr, _ = roc_curve(
    actuals,
    probabilities
)

roc_auc = auc(fpr, tpr)

plt.figure(figsize=(7, 6))

plt.plot(
    fpr,
    tpr,
    label=f"AUC = {roc_auc:.4f}"
)

plt.plot([0, 1], [0, 1], linestyle="--")

plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")

plt.title("ROC Curve")

plt.legend()

plt.savefig(
    "../reports/roc_curve.png"
)

plt.close()


print(f"ROC-AUC: {roc_auc:.4f}")

print("Evaluation completed successfully!")