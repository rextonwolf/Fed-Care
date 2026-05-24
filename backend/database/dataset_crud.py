from typing import List

from sqlalchemy.orm import Session

from database.models import DatasetUpload


def create_dataset_upload(
    db: Session,
    filename: str,
    uploaded_by: str,
    hospital_id: int | None = None,
) -> DatasetUpload:
    upload = DatasetUpload(
        filename=filename,
        uploaded_by=uploaded_by,
        hospital_id=hospital_id,
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)
    return upload


def list_dataset_uploads(db: Session, hospital_id: int | None = None) -> List[DatasetUpload]:
    q = db.query(DatasetUpload).order_by(DatasetUpload.upload_timestamp.desc())
    if hospital_id is not None:
        q = q.filter(DatasetUpload.hospital_id == hospital_id)
    return q.all()
