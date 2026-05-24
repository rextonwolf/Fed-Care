from datetime import datetime

from pydantic import BaseModel


class DatasetUploadResponse(BaseModel):
    id: int
    filename: str
    uploaded_by: str
    hospital_id: int | None
    upload_timestamp: datetime

    class Config:
        orm_mode = True
