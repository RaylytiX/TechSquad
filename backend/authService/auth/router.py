from datetime import timedelta
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from configs.config import settings
from dbmodels.crud import change_active, create_user, get_user_by_email
from .utils import authenticate_user, create_token, get_current_user, get_password_hash
from dbmodels.schemas import UserAuth, UserBase
from dbmodels.database import db_dependency

router = APIRouter()

@router.post("/login")
async def login(user_data: UserAuth, background_tasks: BackgroundTasks, db: db_dependency = db_dependency):
    user = await authenticate_user(email=user_data.email.__str__(), password=user_data.password, db=db)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail='Неверная почта или пароль')
    access_token = create_token(data={"sub": str(user.id)}, expire_time=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    response = JSONResponse(
        content={"access_token": access_token},
        status_code=status.HTTP_200_OK
    )
    response.set_cookie(key="at", value=access_token, httponly=True)
    background_tasks.add_task(change_active, user.id, True, db)
    return response

@router.post("/signup")
async def signup(info_user: UserAuth, background_tasks: BackgroundTasks, db: db_dependency = db_dependency):
    db_user = await get_user_by_email(str(info_user.email), db)
    if db_user:
        raise HTTPException(status_code=400, detail="Почта уже зарегестрирована")
    # if len(info_user.password) < 8 or len(info_user.password) > 30:
    #     raise HTTPException(status_code=400, detail="Пароль должен быть больше чем 8 символов и меньше чем 30 символов")
    hashed_password = get_password_hash(info_user.password)
    db_user = await create_user(info_user.email.__str__(), hashed_password, True, db)
    access_token = create_token(data={"sub": str(db_user.id)}, expire_time=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    response = JSONResponse(
        content={
            "message": f"Вы успешно зарегистрированы {db_user.email}",
            "access_token": access_token},
        status_code=status.HTTP_201_CREATED
    )
    response.set_cookie(key="at", value=access_token, httponly=True)
    return response

@router.post("/logout")
async def logout_user(background_tasks: BackgroundTasks, user: UserBase = Depends(get_current_user), db: db_dependency = db_dependency):
    response = JSONResponse(
        content={"message": f"Пользователь {user.email} успешно вышел из системы"},
        status_code=status.HTTP_200_OK
    )
    response.delete_cookie(key="at")
    background_tasks.add_task(change_active, user.id, False, db)
    return response