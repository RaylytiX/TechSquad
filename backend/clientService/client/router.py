import uuid
from fastapi import APIRouter, Depends, Query, status, HTTPException
from fastapi.responses import JSONResponse
from backend.authService.auth.utils import get_current_user
from backend.dbmodels.crud import get_history_by_user_file_id, get_history_by_user_id_per_page
from backend.dbmodels.database import db_dependency
from backend.dbmodels.schemas import HistoryIdResponseDB, HistorFullResponseDB, UserBase
from backend.dbmodels.database import engine
from sqlalchemy.exc import OperationalError

router = APIRouter()

@router.get("/health")
async def health_check():
    try:
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
        return {"status": "OK", "db": "connected"}
    except OperationalError:
        raise HTTPException(status_code=500, detail="Database connection failed")

@router.get("/")
async def personal_account(user: UserBase = Depends(get_current_user)):
    if user is None or not user.is_active:
        return JSONResponse(
            status_code=401,
            content={"message": "You are not authenticated"},
        )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "email": user.email, 
            "is_active": user.is_active, 
            "created_at": user.created_at.strftime("%d.%m.%Y %H:%M:%S")},
    )

@router.get("/history")
async def history(page: int = Query(ge=0, default=0), user: UserBase = Depends(get_current_user), db: db_dependency=db_dependency):
    if user is None or not user.is_active:
        return JSONResponse(
            status_code=401,
            content={"message": "You are not authenticated"},
        )
    
    db_history, total = await get_history_by_user_id_per_page(id=user.id, page=page, db=db)
    historys = [HistoryIdResponseDB.model_validate(item) for item in db_history]

    response = [
        {
            "file_id": str(history.file_id),
            "created_at": history.created_at.strftime("%d.%m.%Y %H:%M:%S"),
            "updated_at": history.updated_at.strftime("%d.%m.%Y %H:%M:%S"),
        }
        for history in historys
    ]

    if not len(response):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"message": "You have no history"},
        )
    
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": response,
                 "page":page,
                 "total_pages":total},
    )

@router.get("/history/{file_id}")
async def history(file_id: str, user: UserBase = Depends(get_current_user), db: db_dependency = db_dependency):
    if user is None or not user.is_active:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "You are not authenticated"},
        )
    
    db_history = await get_history_by_user_file_id(user_id=user.id, file_id=uuid.UUID(file_id), db=db)
    if db_history is None:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"message": "You have no history"},
        )
    
    history = HistorFullResponseDB.model_validate(db_history)
    response = {
        "user_id": str(history.user_id),
        "file_id": str(history.file_id),
        "masks": history.masks,
        "boxes": history.boxes,
        "classes": history.classes,
        "confs": history.confs,
        "created_at": history.created_at.strftime("%d.%m.%Y %H:%M:%S"),
        "updated_at": history.updated_at.strftime("%d.%m.%Y %H:%M:%S"),
    }

    return JSONResponse(
        status_code=status.HTTP_200_OK, 
        content=response
    )