import flwr as fl
import torch
import os
import numpy as np

from collections import OrderedDict

import sys

sys.path.append(
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..")
    )
)

from model import FTTransformer


# Create models directory
os.makedirs("../models", exist_ok=True)


# Global model path
GLOBAL_MODEL_PATH = "../models/global_federated_model.pth"


# Model architecture
INPUT_DIM = 11

def get_evaluate_fn():

    def evaluate(server_round, parameters, config):

        model = FTTransformer(
            input_dim=INPUT_DIM
        )

        params_dict = zip(
            model.state_dict().keys(),
            parameters
        )

        state_dict = OrderedDict({
            k: torch.tensor(v)
            for k, v in params_dict
        })

        model.load_state_dict(
            state_dict,
            strict=True
        )

        # Save global model
        torch.save(
            model.state_dict(),
            GLOBAL_MODEL_PATH
        )

        print(
            f"\nGlobal model saved after round {server_round}"
        )

        return 0.0, {}

    return evaluate


def main():

    strategy = fl.server.strategy.FedAvg(

        fraction_fit=1.0,
        fraction_evaluate=1.0,

        min_fit_clients=3,
        min_evaluate_clients=3,
        min_available_clients=3,

        evaluate_fn=get_evaluate_fn()
    )

    fl.server.start_server(

        server_address="127.0.0.1:8080",

        config=fl.server.ServerConfig(
            num_rounds=5
        ),

        strategy=strategy
    )


if __name__ == "__main__":
    main()