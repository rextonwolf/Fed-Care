"""
End-to-end pipeline: datasets → statistical relationships → knowledge graph → analysis.

Run from repository root:
  python -m backend.knowledge_graph.pipeline
"""

from __future__ import annotations

from knowledge_graph.graph_analysis import analyze_graph
from knowledge_graph.graph_builder import build_medical_knowledge_graph
from knowledge_graph.relationship_extractor import extract_all_relationships
from knowledge_graph.visualization import plot_knowledge_graph
from knowledge_graph.visualization import plot_top_relationships


def main() -> None:
    print("=" * 60)
    print("FedHealth AI — Statistical Knowledge Graph Pipeline")
    print("=" * 60)

    print("\n[1/4] Extracting statistical relationships...")
    relationships = extract_all_relationships()
    print(f"  Learned {len(relationships)} merged edges")

    print("\n[2/4] Building weighted knowledge graph...")
    kg = build_medical_knowledge_graph(save=True)

    print("\n[3/4] Structural graph analysis...")
    report = analyze_graph(kg)
    print(f"  Summary: {report.summary}")
    print(f"  Top bridge features: {len(report.top_feature_bridges)}")

    print("\n[4/4] Generating visualizations...")
    graph_path = plot_knowledge_graph(kg)
    edges_path = plot_top_relationships(relationships)
    print(f"  Graph viz: {graph_path}")
    print(f"  Top edges: {edges_path}")

    print("\nPipeline complete.")


if __name__ == "__main__":
    main()
