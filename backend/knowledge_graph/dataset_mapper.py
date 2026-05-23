"""
Backward-compatible re-exports for dataset harmonization.
"""

import pandas as pd

from knowledge_graph.dataset_loader import map_dataset_columns
from knowledge_graph.schema_mapping import UNIFIED_SCHEMA

__all__ = ["UNIFIED_SCHEMA", "map_dataset_columns", "analyze_dataset"]


def analyze_dataset(file_path):
    """Analyze a single CSV path (legacy helper)."""
    from pathlib import Path

    df = pd.read_csv(file_path)
    mappings = map_dataset_columns(df)
    return {
        "dataset": str(file_path),
        "columns": list(df.columns),
        "mapped_features": mappings,
        "total_rows": len(df),
    }
