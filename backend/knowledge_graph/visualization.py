"""
Visualization utilities for learned medical knowledge graphs.
Supports offline analysis and future dashboard embedding.
"""

from __future__ import annotations

from pathlib import Path
from typing import List
from typing import Optional
from typing import Tuple

import matplotlib.pyplot as plt
import networkx as nx

from .config import ARTIFACTS_DIR
from .graph_builder import MedicalKnowledgeGraph
from .relationship_extractor import LearnedRelationship


def _node_color(node_type: str) -> str:
    return {
        "feature": "#2563eb",
        "symptom": "#7c3aed",
        "disease": "#dc2626",
    }.get(node_type, "#64748b")


def plot_knowledge_graph(
    kg: MedicalKnowledgeGraph,
    output_path: Optional[Path] = None,
    max_nodes: int = 60,
    figsize: Tuple[int, int] = (14, 10),
) -> Path:
    """
    Render the knowledge graph (top-weighted subgraph for readability).
    """
    G = kg.graph
    if G.number_of_edges() == 0:
        raise ValueError("Cannot visualize empty graph")

    # Keep strongest edges
    edges_sorted = sorted(
        G.edges(data=True),
        key=lambda e: e[2].get("weight", 0),
        reverse=True,
    )[: max_nodes * 2]

    sub = nx.Graph()
    for u, v, d in edges_sorted:
        sub.add_node(u, **G.nodes[u])
        sub.add_node(v, **G.nodes[v])
        sub.add_edge(u, v, **d)

    if sub.number_of_nodes() > max_nodes:
        # Trim lowest-degree nodes
        degrees = sorted(sub.degree, key=lambda x: x[1], reverse=True)
        keep = {n for n, _ in degrees[:max_nodes]}
        sub = sub.subgraph(keep).copy()

    plt.figure(figsize=figsize)
    pos = nx.spring_layout(sub, seed=42, k=1.2)

    colors = [_node_color(sub.nodes[n].get("node_type", "")) for n in sub.nodes()]
    weights = [sub.edges[e].get("weight", 0.1) * 4 for e in sub.edges()]

    nx.draw_networkx_nodes(sub, pos, node_color=colors, node_size=400, alpha=0.9)
    nx.draw_networkx_edges(
        sub,
        pos,
        width=weights,
        alpha=0.5,
        edge_color="#94a3b8",
    )
    labels = {
        n: n.replace("symptom_disease::", "")[:18] for n in sub.nodes()
    }
    nx.draw_networkx_labels(sub, pos, labels, font_size=7)

    plt.title(
        "Learned Medical Knowledge Graph (statistical edges)",
        fontsize=14,
        fontweight="bold",
    )
    plt.axis("off")
    plt.tight_layout()

    out = output_path or (ARTIFACTS_DIR / "knowledge_graph_visualization.png")
    out.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    return out


def plot_top_relationships(
    relationships: List[LearnedRelationship],
    output_path: Optional[Path] = None,
    top_n: int = 20,
) -> Path:
    """Bar chart of strongest learned feature–disease associations."""
    tabular = [r for r in relationships if r.source_type == "feature"]
    tabular.sort(key=lambda r: r.composite_weight, reverse=True)
    top = tabular[:top_n]

    if not top:
        raise ValueError("No tabular relationships to plot")

    labels = [f"{r.source_id}\n→{r.target_id}" for r in top]
    weights = [r.composite_weight for r in top]

    plt.figure(figsize=(12, 6))
    plt.barh(range(len(top)), weights, color="#4f46e5")
    plt.yticks(range(len(top)), labels, fontsize=8)
    plt.xlabel("Composite statistical weight")
    plt.title("Top learned feature–disease relationships", fontweight="bold")
    plt.gca().invert_yaxis()
    plt.tight_layout()

    out = output_path or (ARTIFACTS_DIR / "top_relationships.png")
    out.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.close()
    return out
