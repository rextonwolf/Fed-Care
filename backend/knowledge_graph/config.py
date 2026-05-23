"""
Configuration for statistically learned medical knowledge graph construction.
All thresholds are data-driven — no hardcoded clinical rules.
"""

from dataclasses import dataclass
from dataclasses import field
from pathlib import Path
from typing import List
from typing import Optional


# Repository paths (backend/knowledge_graph -> project root)
KG_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = KG_ROOT.parent.parent
DATASETS_DIR = PROJECT_ROOT / "datasets"
ARTIFACTS_DIR = KG_ROOT / "artifacts"


@dataclass
class ExtractionThresholds:
    """Minimum evidence required to retain a learned edge."""

    min_abs_correlation: float = 0.08
    min_mutual_information: float = 0.01
    min_composite_weight: float = 0.12
    max_p_value: float = 0.05
    min_samples_per_dataset: int = 30


@dataclass
class DatasetSpec:
    """Registered healthcare dataset for relationship learning."""

    name: str
    filename: str
    disease_key: str  # unified disease id in schema_mapping
    sep: str = ","
    target_column_override: Optional[str] = None
    # Optional binarization for multi-class targets (e.g. UCI num 0-4)
    binarize_target: bool = False
    positive_target_values: Optional[List] = None


def default_tabular_datasets() -> List[DatasetSpec]:
    return [
        DatasetSpec(
            name="cardiovascular",
            filename="cardio.csv",
            disease_key="heart_disease",
            sep=";",
        ),
        DatasetSpec(
            name="diabetes",
            filename="diabetes.csv",
            disease_key="diabetes",
            target_column_override="Outcome",
        ),
        DatasetSpec(
            name="heart_disease_uci",
            filename="heart_disease_uci.csv",
            disease_key="heart_disease",
            target_column_override="num",
            binarize_target=True,
            positive_target_values=[1, 2, 3, 4],
        ),
        DatasetSpec(
            name="kidney_disease",
            filename="kidney_disease.csv",
            disease_key="kidney_disease",
            target_column_override="classification",
        ),
        DatasetSpec(
            name="mimic_icu",
            filename="mimic_cohort.csv",
            disease_key="heart_disease",
            target_column_override="cardio",
        ),
    ]


SYMPTOM_DATASET_FILE = "symptom_disease.csv"

# Primary disease validated against FT-Transformer cardiovascular model
PRIMARY_NEURAL_DISEASE = "heart_disease"

# Feature nodes aligned with production predictor (see clinical_schema.PREDICTOR_GRAPH_FEATURES)
from .schema_mapping import PREDICTOR_FEATURES  # noqa: E402

DEFAULT_THRESHOLDS = ExtractionThresholds()
