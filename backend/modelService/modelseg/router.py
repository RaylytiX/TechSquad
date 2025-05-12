from contextlib import asynccontextmanager
import os
from fastapi import BackgroundTasks, FastAPI
from fastapi.responses import JSONResponse
from PIL import Image
from ultralytics import YOLO
from backend.clientService.auth.utils import check_valid_token
from backend.dbmodels.schemas import info_file
from backend.dbmodels.crud import add_prediction_to_file, find_file_by_id, get_user_by_id
from backend.dbmodels.database import db_dependency
from fastapi import APIRouter, status
from .utils import processed_prediction

MODEL = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global MODEL
    try:
        MODEL = YOLO("backend/configs/yolo11n-seg.pt")
    except Exception as e:
        print(f"Error loading model: {str(e)}")
    yield
    del MODEL

router = APIRouter(prefix="/model", lifespan=lifespan)

@router.post("/predict")
async def get_predict(info: info_file, background_tasks: BackgroundTasks, db: db_dependency = db_dependency):
    decode_token = check_valid_token(info.token_user)
    if not decode_token:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "Invalid or expired token"},
        )

    user = await get_user_by_id(id=decode_token.get('sub'), db=db)
    if not user or not user.is_active:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "User not found or inactive"},
        )

    try:
        path_to_image = await find_file_by_id(id=info.id_file, db=db)
        if not path_to_image or not os.path.exists(path_to_image):
            raise FileNotFoundError()
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"message": "File not found or inaccessible"},
        )

    if MODEL is None:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"message": "Model not loaded"},
        )

    try:
        image = Image.open(path_to_image)
        result = MODEL.predict(image)

        pred = processed_prediction(result)

        background_tasks.add_task(
            add_prediction_to_file,
            file_id=info.id_file,
            user_id=user.id,
            masks=pred["masks"],
            boxes=pred["boxes"],
            classes=pred["classes"],
            confs=pred["confs"],
            db=db
        )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=pred
        )

    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"message": f"Prediction failed: {str(e)}"},
        )