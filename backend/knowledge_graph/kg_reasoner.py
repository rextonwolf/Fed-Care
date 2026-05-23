from .symptom_relations import SYMPTOM_DISEASE_MAP


def analyze_symptom_consistency(symptoms, risk_score):

    matched_conditions = []

    for symptom in symptoms:

        if symptom in SYMPTOM_DISEASE_MAP:

            matched_conditions.extend(
                SYMPTOM_DISEASE_MAP[symptom]
            )

    matched_conditions = list(set(matched_conditions))

    if risk_score > 0.5 and any(
        c in matched_conditions
        for c in [
            "Cardiovascular Disease",
            "Hypertension",
            "Heart Failure"
        ]
    ):

        consistency = "HIGH"

        notes = [
            "Symptoms strongly align with predicted cardiovascular risk profile."
        ]

    else:

        consistency = "LOW"

        notes = [
            "Symptoms weakly match predicted disease pattern."
        ]

    # Determine most probable condition
    condition_priority = [
        "Cardiovascular Disease",
        "Heart Failure",
        "Hypertension",
        "Diabetes",
        "Kidney Disease"
    ]

    probable_condition = "General Health Risk"

    for condition in condition_priority:
        if condition in matched_conditions:
            probable_condition = condition
            break

    # Confidence scoring
    if consistency == "HIGH":
        confidence_score = 82
    else:
        confidence_score = 58

    return {
        "kg_consistency": consistency,
        "matched_conditions": matched_conditions,
        "reasoning_notes": notes,
        "probable_condition": probable_condition,
        "ai_confidence": confidence_score,
    }