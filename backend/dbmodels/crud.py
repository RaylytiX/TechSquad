import json
import uuid
from numpy import ndarray
from sqlalchemy import and_, delete, select, func, update
from sqlalchemy.orm import selectinload

from .schemas import UserBase
from .models import File, Modelpredict, User
from .database import db_dependency

async def find_file_by_id(id: uuid, db: db_dependency):
    stmt = select(File).where(File.id == id)
    
    db_file = await db.execute(statement=stmt)
    await db.close()
    result = db_file.scalar_one_or_none()
    return result.path_to_file

async def create_file(path_to_file: str, user: UserBase, db: db_dependency):
    db_file = File(path_to_file=path_to_file, file_id=user.id)
    db.add(db_file)
    await db.commit()
    await db.refresh(db_file)
    await db.close()
    return db_file

async def get_user_by_email(email: str, db: db_dependency):
    db_user = await db.execute(select(User).where(User.email == email))
    await db.close()
    result = db_user.scalar_one_or_none()
    return result

async def get_user_by_id(id: uuid, db: db_dependency):
    stmt = select(User).where(User.id == id)
    
    db_user = await db.execute(statement=stmt)
    await db.close()
    result = db_user.scalar_one_or_none()
    return result

async def create_user(email: str, hashed_password: str, active: bool, db: db_dependency):
    db_user = User(email=email, hashed_password=hashed_password, is_active=active)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    await db.close()
    return db_user

async def add_prediction_to_file(file_id: uuid, 
                                 user_id: uuid, 
                                 masks: list, 
                                 boxes:list, 
                                 classes:list, 
                                 confs:list, 
                                 db: db_dependency):
    db_prediction = Modelpredict(file_id=file_id, 
                                 user_id=user_id, 
                                 masks=masks, 
                                 boxes=boxes, 
                                 classes=classes, 
                                 confs=confs)
    db.add(db_prediction)
    await db.commit()
    await db.refresh(db_prediction)
    await db.close()
    return db_prediction

async def change_active(user_id: uuid, active: bool, db: db_dependency):
    stmt = update(User).where(User.id == user_id).values(is_active=active)
    result = await db.execute(stmt)
    await db.commit()
    await db.close()
    return result

async def get_history_by_user_id(id: uuid, db: db_dependency):
    stmt = select(Modelpredict).where(Modelpredict.user_id == id)
    db_history = await db.execute(statement=stmt)
    await db.close()
    result = db_history.scalars().fetchall()
    return result

async def get_history_by_user_file_id(user_id: uuid, file_id: uuid, db: db_dependency):
    stmt = select(Modelpredict).filter(and_(Modelpredict.user_id == user_id, Modelpredict.file_id == file_id))
    db_history = await db.execute(statement=stmt)
    await db.close()
    result = db_history.scalar_one_or_none()
    return result