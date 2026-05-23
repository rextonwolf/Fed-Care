"""
Structural analysis of the learned medical knowledge graph.
Centrality, disease clusters, and feature importance — all graph-theoretic, not rules.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from typing import Dict
from typing import List
from typing import Optional

import networkx as nx

from .graph_builder import MedicalKnowledgeGraph


@dataclass
class NodeCentrality:
    node_id: str
    node_type: str
    degree: float
    weighted_degree: float
    betweenness: float
    pagerank: float


@dataclass
class GraphAnalysisReport:
    centralities: List[NodeCentrality]
    disease_clusters: Dict[str, List[str]]
    top_feature_bridges: List[Dict[str, Any]]
    summary: Dict[str, Any]


def analyze_graph(
    kg: MedicalKnowledgeGraph,
) -> GraphAnalysisReport:
    """
    Compute structural metrics on the weighted knowledge graph.
    """
    G = kg.graph

    if G.number_of_nodes() == 0:
        return GraphAnalysisReport(
            centralities=[],
            disease_clusters={},
            top_feature_bridges=[],
            summary={"error": "empty_graph"},
        )

    # Weighted degree
    weighted_degree = {
        n: sum(d.get("weight", 0.0) for _, _, d in G.edges(n, data=True))
        for n in G.nodes()
    }

    try:
        betweenness = nx.betweenness_centrality(G, weight="weight")
    except Exception:
        betweenness = {n: 0.0 for n in G.nodes()}

    try:
        pagerank = nx.pagerank(G, weight="weight")
    except Exception:
        pagerank = {n: 1.0 / G.number_of_nodes() for n in G.nodes()}

    centralities: List[NodeCentrality] = []
    for node, data in G.nodes(data=True):
        centralities.append(
            NodeCentrality(
                node_id=node,
                node_type=data.get("node_type", "unknown"),
                degree=float(G.degree(node)),
                weighted_degree=round(weighted_degree.get(node, 0.0), 4),
                betweenness=round(betweenness.get(node, 0.0), 4),
                pagerank=round(pagerank.get(node, 0.0), 4),
            )
        )

    centralities.sort(key=lambda c: c.weighted_degree, reverse=True)

    # Disease clusters via community detection on disease subgraph
    disease_nodes = [
        n for n, d in G.nodes(data=True) if d.get("node_type") == "disease"
    ]
    disease_clusters: Dict[str, List[str]] = {}

    if len(disease_nodes) >= 2:
        sub = G.subgraph(disease_nodes)
        try:
            from networkx.algorithms import community

            comms = community.greedy_modularity_communities(sub, weight="weight")
            for i, comm in enumerate(comms):
                disease_clusters[f"cluster_{i}"] = sorted(comm)
        except Exception:
            disease_clusters["all"] = disease_nodes

    # Feature bridges: features connecting multiple diseases (high betweenness, type=feature)
    top_feature_bridges = []
    for c in centralities:
        if c.node_type not in ("feature", "symptom"):
            continue
        neighbors = list(G.neighbors(c.node_id))
        disease_neighbors = [
            n
            for n in neighbors
            if G.nodes[n].get("node_type") == "disease"
        ]
        if len(disease_neighbors) >= 1:
            top_feature_bridges.append(
                {
                    "feature": c.node_id,
                    "connected_diseases": disease_neighbors,
                    "weighted_degree": c.weighted_degree,
                    "betweenness": c.betweenness,
                }
            )

    top_feature_bridges.sort(
        key=lambda x: x["weighted_degree"] * (1 + x["betweenness"]),
        reverse=True,
    )

    summary = {
        "nodes": G.number_of_nodes(),
        "edges": G.number_of_edges(),
        "feature_nodes": sum(
            1 for _, d in G.nodes(data=True) if d.get("node_type") == "feature"
        ),
        "symptom_nodes": sum(
            1 for _, d in G.nodes(data=True) if d.get("node_type") == "symptom"
        ),
        "disease_nodes": len(disease_nodes),
        "density": round(nx.density(G), 4) if G.number_of_nodes() > 1 else 0.0,
        "avg_clustering": round(
            nx.average_clustering(G, weight="weight"), 4
        )
        if G.number_of_nodes() > 2
        else 0.0,
    }

    return GraphAnalysisReport(
        centralities=centralities,
        disease_clusters=disease_clusters,
        top_feature_bridges=top_feature_bridges[:25],
        summary=summary,
    )
