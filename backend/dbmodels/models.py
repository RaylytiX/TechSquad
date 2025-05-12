from datetime import datetime
import uuid
from sqlalchemy import UUID, Boolean, Column, Float, Integer, String, ForeignKey, TIMESTAMP, ARRAY
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from .database import Base

class File(Base):
    __tablename__ = 'files'

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    path_to_file = Column(String, nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    file_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    users = relationship("User", back_populates="user_path_file")

class User(Base):
    __tablename__ = 'users'

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    user_path_file = relationship("File", back_populates="users")

class Modelpredict(Base):
    __tablename__ = 'model_predicts'

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    file_id = Column(UUID, ForeignKey("files.id"), nullable=False)
    masks = Column(JSONB, nullable=False)
    boxes = Column(JSONB, nullable=False)
    classes = Column(ARRAY(Integer), nullable=False)
    confs = Column(ARRAY(Float), nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
