from contextlib import asynccontextmanager
from fastapi import BackgroundTasks, Depends, FastAPI
from fastapi.responses import JSONResponse
from PIL import Image
from ultralytics import YOLO
from backend.authService.auth.utils import get_current_user
from backend.dbmodels.schemas import UserBase, info_file
from backend.dbmodels.crud import add_prediction_to_file, find_file_by_id
from backend.dbmodels.database import db_dependency
from fastapi import APIRouter, status
from .utils import processed_prediction
from backend.configs.config import settings

MODEL = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global MODEL
    try:
        MODEL = YOLO(settings.PATHTOMODEL)
    except Exception as e:
        print(f"Error loading model: {str(e)}")
    yield
    del MODEL

router = APIRouter(prefix="/model", lifespan=lifespan)

@router.post("/predict")
async def get_predict(info: info_file, background_tasks: BackgroundTasks, user: UserBase = Depends(get_current_user), db: db_dependency = db_dependency):
    if not user or not user.is_active:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "User not found or inactive"},
        )

    if MODEL is None:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"message": "Model not loaded"},
        )
    
    dict_predict = {}
    for file in info.files_id:
        try:
            path_to_image = await find_file_by_id(id=file, db=db)
            image = Image.open(path_to_image)
            result = MODEL.predict(image)

            pred = processed_prediction(result)

            dict_predict[file.__str__()]= pred

            background_tasks.add_task(
                add_prediction_to_file,
                file_id=file,
                user_id=user.id,
                masks=pred["masks"],
                boxes=pred["boxes"],
                classes=pred["classes"],
                confs=pred["confs"],
                db=db
            )

        except Exception as e:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"message": f"Prediction failed: {str(e)}"},
            )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=dict_predict
    )