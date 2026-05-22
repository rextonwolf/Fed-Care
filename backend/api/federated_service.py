"""
Federated monitoring service — orchestrates FL telemetry for API responses.
"""

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database import federated_queries as fq

from federated_schemas import FederatedStatusResponse
from federated_schemas import FederatedClientsResponse
from federated_schemas import FederatedRoundsResponse
from federated_schemas import FederatedClientItem
from federated_schemas import FederatedRoundItem
from federated_schemas import AggregationMetrics


def _handle_db_error(exc: Exception) -> None:
    raise HTTPException(
        status_code=503,
        detail={
            "error": "federated_monitoring_unavailable",
            "message": "Unable to retrieve federated monitoring data.",
            "detail": str(exc),
        },
    ) from exc


def _utc_now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def get_federated_status(db: Session) -> FederatedStatusResponse:
    try:
        fq.ensure_federated_clients(db)
        raw = fq.fetch_federated_status(db)
        return FederatedStatusResponse(
            active_clients=raw["active_clients"],
            total_clients=raw["total_clients"],
            global_model_version=raw["global_model_version"],
            current_round=raw["current_round"],
            synchronization_status=raw["synchronization_status"],
            average_client_latency=raw["average_client_latency"],
            aggregation_status=raw["aggregation_status"],
            total_training_samples=raw["total_training_samples"],
            computed_at=_utc_now_iso(),
        )
    except SQLAlchemyError as exc:
        _handle_db_error(exc)


def get_federated_clients(db: Session) -> FederatedClientsResponse:
    try:
        rows = fq.fetch_client_activity(db)
        clients = [FederatedClientItem(**row) for row in rows]
        return FederatedClientsResponse(
            clients=clients,
            count=len(clients),
            computed_at=_utc_now_iso(),
        )
    except SQLAlchemyError as exc:
        _handle_db_error(exc)


def get_federated_rounds(db: Session) -> FederatedRoundsResponse:
    try:
        fq.ensure_federated_clients(db)
        rounds_raw = fq.fetch_round_history(db)

        # Best-effort persistence for audit trail
        try:
            fq.sync_round_snapshots(db)
        except SQLAlchemyError:
            db.rollback()

        rounds = []
        progression = []

        for row in rounds_raw:
            metrics = row.get("aggregation_metrics", {})
            rounds.append(
                FederatedRoundItem(
                    round_number=row["round_number"],
                    started_at=row.get("started_at"),
                    completed_at=row.get("completed_at"),
                    round_duration_seconds=row["round_duration_seconds"],
                    participating_clients=row["participating_clients"],
                    aggregated_samples=row["aggregated_samples"],
                    model_accuracy=row["model_accuracy"],
                    aggregation_loss=row["aggregation_loss"],
                    aggregation_metrics=AggregationMetrics(
                        fedavg_weighted_samples=metrics.get(
                            "fedavg_weighted_samples",
                            row["aggregated_samples"],
                        ),
                        participating_clients=metrics.get(
                            "participating_clients",
                            row["participating_clients"],
                        ),
                        convergence_delta=metrics.get("convergence_delta"),
                        client_ids=metrics.get("client_ids"),
                    ),
                )
            )
            progression.append(
                {
                    "round": row["round_number"],
                    "accuracy": row["model_accuracy"],
                    "loss": row["aggregation_loss"],
                    "samples": row["aggregated_samples"],
                }
            )

        return FederatedRoundsResponse(
            rounds=rounds,
            count=len(rounds),
            accuracy_progression=progression,
            computed_at=_utc_now_iso(),
        )
    except SQLAlchemyError as exc:
        _handle_db_error(exc)
