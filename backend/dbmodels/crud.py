from functools import wraps
import math
import uuid
from sqlalchemy import and_, delete, func, select, update
from .schemas import UserBase
from .models import File, Modelpredict, User
from .database import db_dependency
from configs.config import settings

# def cleanup_old_predictions(model, user_id_kwarg="id", db_kwarg="db", max_count=1000, delete_count=500):
#     def decorator(func):
#         @wraps(func)
#         async def wrapper(*args, **kwargs):
#             db = kwargs.get(db_kwarg)
#             user_id = kwargs.get(user_id_kwarg)

#             if db is None or user_id is None:
#                 raise ValueError(f"Decorator requires kwargs '{db_kwarg}' (session) and '{user_id_kwarg}' (user_id)")
#             count_stmt = select(func.count()).where(model.user_id == user_id)
#             result = await db.execute(count_stmt)
#             total = result.scalar_one()

#             if total > max_count:
#                 subq = (
#                     select(model.id)
#                     .where(model.user_id == user_id)
#                     .order_by(model.created_at.asc())
#                     .limit(delete_count)
#                     .subquery()
#                 )

#                 delete_stmt = delete(model).where(model.id.in_(select(subq.c.id)))
#                 await db.execute(delete_stmt)
#                 await db.commit()
#             return await func(*args, **kwargs)
#         return wrapper
#     return decorator

async def find_file_by_id(id: uuid, db: db_dependency):
    stmt = select(File).where(File.id == id)
    
    db_file = await db.execute(statement=stmt)
    await db.close()
    result = db_file.scalar_one_or_none()
    if result is None:
        return None
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

# def cleanup_old_predictions(model, user_id_kwarg="id", db_kwarg="db", max_count=1000, delete_count=500):
#     def decorator(target_func):
#         @wraps(target_func)
#         async def wrapper(*args, **kwargs):
#             db = kwargs.get(db_kwarg)
#             user_id = kwargs.get(user_id_kwarg)

#             if db is None or user_id is None:
#                 raise ValueError(f"Decorator requires kwargs '{db_kwarg}' (session) and '{user_id_kwarg}' (user_id)")
#             count_stmt = select(func.count()).where(model.user_id == user_id)
#             result = await db.execute(count_stmt)
#             total = result.scalar_one()

#             if total > max_count:
#                 subq = (
#                     select(model.id)
#                     .where(model.user_id == user_id)
#                     .order_by(model.created_at.asc())
#                     .limit(delete_count)
#                     .subquery()
#                 )

#                 delete_stmt = delete(model).where(model.id.in_(select(subq.c.id)))
#                 await db.execute(delete_stmt)
#                 await db.commit()
#             return await target_func(*args, **kwargs)
#         return wrapper
#     return decorator

#@cleanup_old_predictions(model=Modelpredict, user_id_kwarg="user_id", db_kwarg="db")
async def add_prediction_to_file(file_id: uuid, 
                                 user_id: uuid, 
                                 masks: list, 
                                 boxes: list,
                                 num_classes: list,
                                 classes: list, 
                                 confs: list,
                                 db: db_dependency):
    db_prediction = Modelpredict(file_id=file_id, 
                                user_id=user_id, 
                                masks=masks, 
                                boxes=boxes,
                                num_classes=num_classes,
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

async def get_history_by_user_id_per_page(id: uuid, page: int, db: db_dependency):
    main_stmt = select(Modelpredict).where(Modelpredict.user_id == id)
    db_history = await db.execute(statement=main_stmt)
    db_history = db_history.scalars().fetchall()
    await db.close()

    total = math.ceil(len(db_history) / settings.LIMIT_ITEMS_PER_PAGE) - 1
    result = db_history[page*settings.LIMIT_ITEMS_PER_PAGE:(page+1)*settings.LIMIT_ITEMS_PER_PAGE]
    return result, total

async def get_history_by_user_file_id(user_id: uuid, file_id: uuid, db: db_dependency):
    stmt = select(Modelpredict).filter(and_(Modelpredict.user_id == user_id, Modelpredict.file_id == file_id))
    db_history = await db.execute(statement=stmt)
    await db.close()
    result = db_history.scalar_one_or_none()
    return result
