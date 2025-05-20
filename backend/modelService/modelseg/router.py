from contextlib import asynccontextmanager
import os
import shutil
import uuid
import cv2
from fastapi import BackgroundTasks, Depends, FastAPI
from fastapi.responses import JSONResponse
from ultralytics import YOLO
from authService.auth.utils import get_current_user
from dbmodels.schemas import UserBase, info_file
from dbmodels.crud import add_prediction_to_file, find_file_by_id
from dbmodels.database import db_dependency
from fastapi import APIRouter, status
from .utils import merge_and_create_pdf, processed_prediction, split_img
from configs.config import settings

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

router = APIRouter(lifespan=lifespan)

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
        path_to_image = await find_file_by_id(id=file, db=db)
        #old_images_list.append(Image.open(path_to_image))
        name_image = path_to_image.split("/")[-1].split(".")[0]
        combined_image = cv2.imread(path_to_image)
        path_images_list = split_img(combined_image=combined_image, name_image=name_image)

        try:
            result = MODEL.predict(path_images_list, save=True)
            
            part_height, part_width, _ = combined_image.shape
            pred = processed_prediction(result, part_height, part_width)
            dict_predict[file.__str__()] = pred
            output_pdf = f"..{settings.FILE_SAVE_FOLDER}/{uuid.uuid4().hex}.pdf"
            pred["path_to_report"] = output_pdf

            background_tasks.add_task(
                add_prediction_to_file,
                file_id=file.__str__(),
                user_id=user.id,
                masks=pred["masks"],
                boxes=pred["boxes"],
                num_classes=pred["num_classes"],
                classes=pred["classes"],
                confs=pred["confs"],
                path_to_report=output_pdf,
                db=db
            )

            for file_path in path_images_list:
                background_tasks.add_task(os.remove, file_path)

            background_tasks.add_task(
                merge_and_create_pdf,
                pred=pred,
                input_dir=settings.IMAGE_SAVE_FOLDER,
                output_pdf=output_pdf
            )
            
            background_tasks.add_task(shutil.rmtree, "../runs/", ignore_errors=True)
        except Exception as e:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"message": f"Prediction failed: {str(e)}"},
            )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=dict_predict
    )