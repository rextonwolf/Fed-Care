import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score
)


from backend.cardio_dataset import CardioDataset
from backend.model import FTTransformer

import os


# Device configuration
device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print(f"Using device: {device}")


# Hyperparameters
BATCH_SIZE = 256
LEARNING_RATE = 0.001
EPOCHS = 20


# Dataset paths
TRAIN_PATH = "../processed_data/hospital_a.csv"
TEST_PATH = "../processed_data/test.csv"


# Load datasets
train_dataset = CardioDataset(TRAIN_PATH)
test_dataset = CardioDataset(TEST_PATH)


# DataLoaders
train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True
)

test_loader = DataLoader(
    test_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False
)


# Input dimension
input_dim = train_dataset.X.shape[1]


# Model
model = FTTransformer(input_dim=input_dim)

model = model.to(device)


# Loss function
criterion = nn.BCEWithLogitsLoss()


# Optimizer
optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=LEARNING_RATE
)


# Training loop
for epoch in range(EPOCHS):

    model.train()

    train_loss = 0

    for X_batch, y_batch in train_loader:

        X_batch = X_batch.to(device)
        y_batch = y_batch.to(device).unsqueeze(1)

        optimizer.zero_grad()

        outputs = model(X_batch)

        loss = criterion(outputs, y_batch)

        loss.backward()

        optimizer.step()

        train_loss += loss.item()

    avg_train_loss = train_loss / len(train_loader)


    # Evaluation
    model.eval()

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


    # Flatten arrays
    predictions = [int(p[0]) for p in predictions]
    probabilities = [float(p[0]) for p in probabilities]


    # Metrics
    accuracy = accuracy_score(actuals, predictions)

    precision = precision_score(actuals, predictions)

    recall = recall_score(actuals, predictions)

    f1 = f1_score(actuals, predictions)

    try:
        roc_auc = roc_auc_score(actuals, probabilities)
    except ValueError:
        roc_auc = float("nan")


    print(f"\nEpoch [{epoch+1}/{EPOCHS}]")

    print(f"Train Loss: {avg_train_loss:.4f}")

    print(f"Accuracy: {accuracy:.4f}")

    print(f"Precision: {precision:.4f}")

    print(f"Recall: {recall:.4f}")

    print(f"F1 Score: {f1:.4f}")

    print(f"ROC-AUC: {roc_auc:.4f}")


# Save model
os.makedirs("../models", exist_ok=True)

torch.save(
    model.state_dict(),
    "../models/ft_transformer.pth"
)
torch.save(
    model.state_dict(),
    "../models/global_federated_model.pth",
)

print(f"\nModel saved ({input_dim} features) -> ft_transformer.pth, global_federated_model.pth")