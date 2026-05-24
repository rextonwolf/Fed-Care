import os

import flwr as fl
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from cardio_dataset import CardioDataset
from model import FTTransformer


DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


class FlowerClient(fl.client.NumPyClient):

    def __init__(self, model, train_loader):

        self.model = model
        self.train_loader = train_loader

        self.criterion = nn.BCEWithLogitsLoss()

        self.optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=0.001
        )


    def get_parameters(self, config):

        return [
            val.cpu().numpy()
            for _, val in self.model.state_dict().items()
        ]


    def set_parameters(self, parameters):

        params_dict = zip(
            self.model.state_dict().keys(),
            parameters
        )

        state_dict = {
            k: torch.tensor(v)
            for k, v in params_dict
        }

        self.model.load_state_dict(
            state_dict,
            strict=True
        )


    def fit(self, parameters, config):

        self.set_parameters(parameters)

        self.model.train()

        for X_batch, y_batch in self.train_loader:

            X_batch = X_batch.to(DEVICE)

            y_batch = y_batch.to(DEVICE).unsqueeze(1)

            self.optimizer.zero_grad()

            outputs = self.model(X_batch)

            loss = self.criterion(outputs, y_batch)

            loss.backward()

            self.optimizer.step()

        return (
            self.get_parameters(config={}),
            len(self.train_loader.dataset),
            {}
        )


    def evaluate(self, parameters, config):

        self.set_parameters(parameters)

        return 0.0, len(self.train_loader.dataset), {}


def load_client_data(client_id):

    path = f"../processed_data/hospital_{client_id}.csv"

    dataset = CardioDataset(path)

    loader = DataLoader(
        dataset,
        batch_size=256,
        shuffle=True
    )

    return loader


if __name__ == "__main__":

    CLIENT_ID = input(
        "Enter hospital client id (a/b/c): "
    )

    train_loader = load_client_data(CLIENT_ID)

    sample_dataset = CardioDataset(
        f"../processed_data/hospital_{CLIENT_ID}.csv"
    )

    input_dim = sample_dataset.X.shape[1]

    model = FTTransformer(
        input_dim=input_dim
    ).to(DEVICE)

    client = FlowerClient(
        model,
        train_loader
    )

    fl.client.start_numpy_client(
        server_address="127.0.0.1:8080",
        client=client
    )