"""
Patient search and lookup for prediction workflow.
"""

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.api.patient_schemas import PatientSearchResponse
from backend.api.patient_schemas import PatientSummary
from backend.api.patient_service import _to_summary
from backend.database import patient_crud as pc


def _handle_db_error(exc: Exception) -> None:
    raise HTTPException(
        status_code=503,
        detail={
            "error": "patient_lookup_unavailable",
            "message": "Unable to search patient records.",
            "detail": str(exc),
        },
    ) from exc


def search_patients(
    db: Session,
    q: str,
    limit: int = 20,
    hospital_id: int | None = None,
) -> PatientSearchResponse:
    """
    Search patients by UUID or display name.
    Returns empty results when none match (frontend may create a new profile).
    """
    query = (q or "").strip()
    if not query:
        return PatientSearchResponse(query="", results=[], count=0)

    if len(query) > 255:
        raise HTTPException(status_code=400, detail="Search query too long")

    limit = max(1, min(limit, 50))

    try:
        rows = pc.search_patients(db, query, limit=limit, hospital_id=hospital_id)
        results = [_to_summary(db, p) for p in rows]
        return PatientSearchResponse(
            query=query,
            results=results,
            count=len(results),
        )
    except SQLAlchemyError as exc:
        _handle_db_error(exc)


def get_patient_summary(db: Session, patient_id: int, hospital_id: int | None = None) -> PatientSummary:
    """Refresh a single patient row with latest prediction stats."""
    patient = pc.get_patient(db, patient_id, hospital_id=hospital_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _to_summary(db, patient)
