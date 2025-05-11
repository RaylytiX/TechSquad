import uuid
from fastapi import APIRouter, BackgroundTasks, Form, UploadFile, status
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
import httpx
from backend.clientService.auth.utils import get_current_user
from .utils import save_file
from backend.dbmodels.crud import create_file, get_history_by_user_file_id, get_history_by_user_id
from backend.configs.config import settings
from backend.dbmodels.database import db_dependency
from backend.dbmodels.schemas import HistoryIdResponseDB, HistorFullResponseDB

router = APIRouter(prefix="/client")
templates=Jinja2Templates(directory="backend/clientService/templates")

@router.post("/")
async def personal_account(token: str = Form(...), db: db_dependency=db_dependency):
    user = await get_current_user(token=token, db=db)
    if user is None:
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

@router.post("/history")
async def history(token: str = Form(...), db: db_dependency=db_dependency):
    user = await get_current_user(token=token, db=db)
    if user is None:
        return JSONResponse(
            status_code=401,
            content={"message": "You are not authenticated"},
        )
    
    db_history = await get_history_by_user_id(id=user.id, db=db)
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
        content={"message": response},
    )

@router.post("/history/{file_id}")
async def history(file_id: str, token: str = Form(...), db: db_dependency = db_dependency):
    user = await get_current_user(token=token, db=db)
    if user is None:
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

@router.post("/predict")
async def get_predict(file: UploadFile, background_tasks: BackgroundTasks, token: str = Form(...), db: db_dependency = db_dependency):
    user = await get_current_user(token=token, db=db)
    if user is None or not user.is_active:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "You are not authenticated"},
        )

    if file.content_type.split('/')[1] not in settings.APPLYLOADFORMATFILE:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"message": f"Oops! This file {file.filename} is invalid file type, you can upload file with types: {', '.join(settings.APPLYLOADFORMATFILE)}"},
        )

    path_to_image = save_file(file=file)
    result = await create_file(path_to_file=path_to_image, user=user, db=db)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url=settings.API_MODEL+"/model/predict", json={"id_file": str(result.id), "token_user": token})
            r = response.json()
        except Exception as e:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": f"Sorry service with model is unavailable ({e})"},
            )

    return JSONResponse(
        status_code=status.HTTP_200_OK, 
        content={"massage": r}
    )