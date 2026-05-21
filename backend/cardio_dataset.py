import pandas as pd
import torch

from torch.utils.data import Dataset


class CardioDataset(Dataset):

    def __init__(self, csv_path, target_column="cardio"):

        self.data = pd.read_csv(csv_path)

        self.X = self.data.drop(columns=[target_column]).values
        self.y = self.data[target_column].values

        self.X = torch.tensor(self.X, dtype=torch.float32)
        self.y = torch.tensor(self.y, dtype=torch.float32)

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):

        return (
            self.X[idx],
            self.y[idx]
        )