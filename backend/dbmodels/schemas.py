from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List
from datetime import datetime
from uuid import UUID

class info_file(BaseModel):
    files_id: List[UUID]

class UserBase(BaseModel):
    id: UUID
    email: EmailStr
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserAuth(BaseModel):
    email: EmailStr
    password: str

class HistoryIdResponseDB(BaseModel):
    user_id: UUID
    file_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AccessToken(BaseModel):
    at: str

class HistorFullResponseDB(BaseModel):
    user_id: UUID
    file_id: UUID
    masks: List
    boxes: List
    classes: List
    confs: List
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)