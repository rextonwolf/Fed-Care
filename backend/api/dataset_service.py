from typing import List

from sqlalchemy.orm import Session

from backend.api.dataset_schemas import DatasetUploadResponse
from backend.database.dataset_crud import create_dataset_upload
from backend.database.dataset_crud import list_dataset_uploads


def get_uploaded_datasets(db: Session, current_user: dict | None = None) -> List[DatasetUploadResponse]:
    hospital_id = None
    if current_user and current_user.get("role") != "admin":
        hospital_id = current_user.get("hospital_id")

    uploads = list_dataset_uploads(db, hospital_id=hospital_id)
    return [DatasetUploadResponse.from_orm(upload) for upload in uploads]


def create_dataset_upload_record(
    db: Session,
    filename: str,
    current_user: dict,
) -> DatasetUploadResponse:
    hospital_id = None
    if current_user and current_user.get("role") != "admin":
        hospital_id = current_user.get("hospital_id")

    upload = create_dataset_upload(
        db,
        filename=filename,
        uploaded_by=current_user.get("username", "unknown"),
        hospital_id=hospital_id,
    )
    return DatasetUploadResponse.from_orm(upload)
