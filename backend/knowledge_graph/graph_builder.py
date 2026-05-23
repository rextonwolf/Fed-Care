"""
Construct a weighted medical knowledge graph from statistically learned relationships.
Uses NetworkX; persists artifacts for neuro-symbolic validation at inference time.
"""

from __future__ import annotations

import json
import pickle
from pathlib import Path
from typing import Any
from typing import Dict
from typing import List
from typing import Optional

import networkx as nx

from .config import ARTIFACTS_DIR
from .config import PRIMARY_NEURAL_DISEASE
from .dataset_loader import load_all_tabular
from .dataset_loader import reference_statistics
from .relationship_extractor import LearnedRelationship
from .relationship_extractor import extract_all_relationships


class MedicalKnowledgeGraph:
    """
    Weighted bipartite/multipartite graph: clinical features/symptoms → diseases.
    """

    def __init__(self) -> None:
        self.graph = nx.Graph()
        self.relationships: List[LearnedRelationship] = []
        self.reference_stats: Dict[str, Dict[str, float]] = {}
        self.metadata: Dict[str, Any] = {}

    @property
    def node_count(self) -> int:
        return self.graph.number_of_nodes()

    @property
    def edge_count(self) -> int:
        return self.graph.number_of_edges()

    def build(
        self,
        relationships: Optional[List[LearnedRelationship]] = None,
    ) -> "MedicalKnowledgeGraph":
        """Populate graph from learned relationships."""
        self.relationships = relationships or extract_all_relationships()

        frames = [f for f, _ in load_all_tabular()]
        self.reference_stats = reference_statistics(frames) if frames else {}

        for rel in self.relationships:
            self._add_node(rel.source_id, rel.source_type)
            self._add_node(rel.target_id, rel.target_type)

            edge_key = (rel.source_id, rel.target_id)
            if self.graph.has_edge(*edge_key):
                existing = self.graph.edges[edge_key]
                # Aggregate weight if duplicate edge from merge (shouldn't happen)
                existing["weight"] = max(existing["weight"], rel.composite_weight)
            else:
                self.graph.add_edge(
                    rel.source_id,
                    rel.target_id,
                    weight=rel.composite_weight,
                    **rel.to_dict(),
                )

        self.metadata = {
            "primary_neural_disease": PRIMARY_NEURAL_DISEASE,
            "node_count": self.node_count,
            "edge_count": self.edge_count,
            "relationship_count": len(self.relationships),
            "datasets_used": sorted(
                {s for r in self.relationships for s in r.dataset_sources}
            ),
        }
        return self

    def _add_node(self, node_id: str, node_type: str) -> None:
        if not self.graph.has_node(node_id):
            self.graph.add_node(
                node_id,
                node_type=node_type,
                label=node_id.replace("symptom_disease::", "").replace("_", " "),
            )

    def get_neighbors(self, node_id: str) -> List[str]:
        if not self.graph.has_node(node_id):
            return []
        return list(self.graph.neighbors(node_id))

    def get_disease_support_score(
        self,
        active_features: Dict[str, float],
        disease_id: str = PRIMARY_NEURAL_DISEASE,
    ) -> float:
        """
        Graph-derived support: weighted sum of edges from active features to disease.
        """
        if not self.graph.has_node(disease_id):
            return 0.0

        score = 0.0
        count = 0
        for feature, value in active_features.items():
            if feature not in self.graph:
                continue
            if not self.graph.has_edge(feature, disease_id):
                continue
            edge_data = self.graph.edges[feature, disease_id]
            # Activation: z-score vs reference if available
            activation = 1.0
            if feature in self.reference_stats:
                ref = self.reference_stats[feature]
                z = abs(value - ref["mean"]) / (ref["std"] + 1e-9)
                activation = min(z / 2.0, 1.0)

            score += edge_data.get("weight", 0.0) * activation
            count += 1

        if count == 0:
            return 0.0
        return float(min(score / count, 1.0))

    def save(self, artifacts_dir: Optional[Path] = None) -> Path:
        """Persist graph + metadata for production validation layer."""
        out_dir = artifacts_dir or ARTIFACTS_DIR
        out_dir.mkdir(parents=True, exist_ok=True)

        graph_path = out_dir / "medical_knowledge_graph.gpickle"
        meta_path = out_dir / "graph_metadata.json"
        rels_path = out_dir / "learned_relationships.json"
        stats_path = out_dir / "reference_statistics.json"

        with open(graph_path, "wb") as f:
            pickle.dump(self.graph, f)

        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, indent=2)

        with open(rels_path, "w", encoding="utf-8") as f:
            json.dump([r.to_dict() for r in self.relationships], f, indent=2)

        with open(stats_path, "w", encoding="utf-8") as f:
            json.dump(self.reference_stats, f, indent=2)

        return out_dir

    @classmethod
    def load(cls, artifacts_dir: Optional[Path] = None) -> "MedicalKnowledgeGraph":
        """Load persisted graph from disk."""
        out_dir = artifacts_dir or ARTIFACTS_DIR
        instance = cls()

        graph_path = out_dir / "medical_knowledge_graph.gpickle"
        rels_path = out_dir / "learned_relationships.json"
        stats_path = out_dir / "reference_statistics.json"
        meta_path = out_dir / "graph_metadata.json"

        if graph_path.exists():
            with open(graph_path, "rb") as f:
                instance.graph = pickle.load(f)

        if rels_path.exists():
            with open(rels_path, encoding="utf-8") as f:
                raw = json.load(f)
            instance.relationships = []
            for item in raw:
                instance.relationships.append(
                    LearnedRelationship(
                        source_id=item["source_id"],
                        target_id=item["target_id"],
                        source_type=item.get("source_type", "feature"),
                        target_type=item.get("target_type", "disease"),
                        composite_weight=item.get("composite_weight", 0.0),
                        correlation=item.get("correlation"),
                        mutual_information=item.get("mutual_information"),
                        effect_size=item.get("effect_size"),
                        p_value=item.get("p_value"),
                        co_occurrence_strength=item.get("co_occurrence_strength"),
                        dataset_sources=item.get("dataset_sources", []),
                        sample_size=item.get("sample_size", 0),
                        extraction_methods=item.get("extraction_methods", []),
                    )
                )

        if stats_path.exists():
            with open(stats_path, encoding="utf-8") as f:
                instance.reference_stats = json.load(f)

        if meta_path.exists():
            with open(meta_path, encoding="utf-8") as f:
                instance.metadata = json.load(f)

        return instance


def build_medical_knowledge_graph(
    save: bool = True,
) -> MedicalKnowledgeGraph:
    """End-to-end graph construction entry point."""
    kg = MedicalKnowledgeGraph().build()
    if save:
        path = kg.save()
        print(f"Knowledge graph saved to {path}")
        print(f"Nodes: {kg.node_count}, Edges: {kg.edge_count}")
    return kg
