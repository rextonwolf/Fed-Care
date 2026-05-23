"""Deprecated typo module — use relationship_extractor instead."""

from knowledge_graph.relationship_extractor import extract_all_relationships
from knowledge_graph.relationship_extractor import extract_from_tabular_frame

__all__ = ["extract_all_relationships", "extract_from_tabular_frame"]
