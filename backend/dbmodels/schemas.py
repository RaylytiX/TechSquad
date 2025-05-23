from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List
from datetime import datetime
from uuid import UUID

class info_file(BaseModel):
    files_id: List[UUID]

class info_prediction(BaseModel):
    file_id: UUID
    masks: List[List[List[float]]]
    boxes: List[List[float]]
    num_classes: List[int]
    classes: List[str]

    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    id: UUID
    email: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserAuth(BaseModel):
    email: str
    password: str

class HistoryIdResponseDB(BaseModel):
    user_id: UUID
    file_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class HistorFullResponseDB(BaseModel):
    user_id: UUID
    file_id: UUID
    masks: List[List[List[float]]]
    boxes: List[List[float]]
    num_classes: List[int]
    classes: List[str]
    confs: List[float]
    path_to_report: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)