"""Quick smoke test for relationship extraction."""

from knowledge_graph.relationship_extractor import extract_all_relationships


def main():
    relationships = extract_all_relationships()
    print(f"Extracted {len(relationships)} relationships")
    if relationships:
        sample = relationships[0]
        print(f"Sample: {sample.source_id} -> {sample.target_id} ({sample.composite_weight:.3f})")


if __name__ == "__main__":
    main()
