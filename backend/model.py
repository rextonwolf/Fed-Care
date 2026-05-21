import torch
import torch.nn as nn


class FTTransformer(nn.Module):

    def __init__(
        self,
        input_dim,
        embed_dim=64,
        num_heads=4,
        num_layers=3,
        dropout=0.2
    ):

        super().__init__()

        self.feature_embedding = nn.Linear(
            input_dim,
            embed_dim
        )

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=num_heads,
            dim_feedforward=128,
            dropout=dropout,
            activation="gelu",
            batch_first=True
        )

        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=num_layers
        )

        self.classifier = nn.Sequential(

            nn.Linear(embed_dim, 64),
            nn.GELU(),
            nn.Dropout(dropout),

            nn.Linear(64, 32),
            nn.GELU(),

            nn.Linear(32, 1)

        )

    def forward(self, x):

        x = self.feature_embedding(x)

        x = x.unsqueeze(1)

        x = self.transformer(x)

        x = x.mean(dim=1)

        x = self.classifier(x)

        return x