"""
Legacy cardio-only preprocessing.

For multi-dataset training (UCI + MIMIC + cardio), use:
  python preprocessing_unified.py
"""

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from joblib import dump
import os

DATA_PATH = "../datasets/cardio.csv"

# Load dataset
df = pd.read_csv(DATA_PATH, sep=";")

# Clean column names
df.columns = df.columns.str.strip()

# Basic info
print(df.head())
print(df.shape)
print(df.columns)

# Remove unnecessary column
if "id" in df.columns:
    df.drop(columns=["id"], inplace=True)

# Check missing values
print(df.isnull().sum())

# Remove missing rows
df = df.dropna()

# Target column
TARGET_COLUMN = "cardio"

# Features and labels
X = df.drop(columns=[TARGET_COLUMN])
y = df[TARGET_COLUMN]

# Check class balance
print(y.value_counts())

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# Feature scaling
scaler = StandardScaler()

X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Save scaler
os.makedirs("scalers", exist_ok=True)

dump(scaler, "scalers/scaler.joblib")
dump(list(X.columns), "scalers/feature_names.joblib")

# Convert scaled train data back to dataframe
X_train_scaled = pd.DataFrame(
    X_train_scaled,
    columns=X.columns
)

# Add target column
X_train_scaled[TARGET_COLUMN] = y_train.values

# Shuffle dataset
X_train_scaled = X_train_scaled.sample(
    frac=1,
    random_state=42
).reset_index(drop=True)

# Dynamic hospital split
total_size = len(X_train_scaled)

split_1 = int(total_size * 0.33)
split_2 = int(total_size * 0.66)

hospital_a = X_train_scaled.iloc[:split_1]
hospital_b = X_train_scaled.iloc[split_1:split_2]
hospital_c = X_train_scaled.iloc[split_2:]

# Save processed datasets
os.makedirs("processed_data", exist_ok=True)

hospital_a.to_csv("processed_data/hospital_a.csv", index=False)
hospital_b.to_csv("processed_data/hospital_b.csv", index=False)
hospital_c.to_csv("processed_data/hospital_c.csv", index=False)

# Save test dataset
test_df = pd.DataFrame(X_test_scaled, columns=X.columns)
test_df[TARGET_COLUMN] = y_test.values

test_df.to_csv("processed_data/test.csv", index=False)

# Final logs
print("Preprocessing complete! (cardio-only — run preprocessing_unified.py for all cohorts)")
print("Hospital A:", hospital_a.shape)
print("Hospital B:", hospital_b.shape)
print("Hospital C:", hospital_c.shape)
print("Test Set:", test_df.shape)