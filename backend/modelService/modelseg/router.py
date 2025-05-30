from contextlib import asynccontextmanager
import io
import os
import shutil
import uuid
import requests
import cv2
from fastapi import BackgroundTasks, Depends, FastAPI
from fastapi.responses import JSONResponse
import numpy as np
import torch
from PIL import Image
from ultralytics import YOLO
from authService.auth.utils import get_current_user
from dbmodels.schemas import UserBase, info_file, info_prediction
from dbmodels.crud import add_prediction_to_file, change_prediction, find_file_by_id
from dbmodels.database import db_dependency, s3_dependency
from fastapi import APIRouter, status
from .utils import merge_and_create_pdf, processed_prediction, split_img
from configs.config import settings

MODEL = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global MODEL
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        MODEL = YOLO(settings.PATHTOMODEL)
        MODEL.to(device)
    except Exception as e:
        print(f"Error loading model: {str(e)}")
    yield
    del MODEL

router = APIRouter(lifespan=lifespan)

@router.post("/predict")
async def get_predict(info: info_file, background_tasks: BackgroundTasks, user: UserBase = Depends(get_current_user), db: db_dependency = db_dependency, s3: s3_dependency = s3_dependency):
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
        name_image = path_to_image.split("/")[-1].split(".")[0]
        response = requests.get(path_to_image)
        if response.status_code != 200:
            return JSONResponse(
                status_code=response.status_code,
                content={"message": f"Failed to get image, status code: {response.status_code}"},
            )
        bytes_img = response.content

        try:
            #image = await download_image_bytes(url=path_to_image)
            combined_image = cv2.cvtColor(np.array(Image.open(io.BytesIO(bytes_img)).convert("RGB")), cv2.COLOR_RGB2BGR)
            path_images_list = split_img(combined_image=combined_image, name_image=name_image)
            result = MODEL.predict(path_images_list, save=True, project="./runs")

            part_height, part_width, _ = combined_image.shape
            pred = processed_prediction(result, part_height, part_width)
            dict_predict[file.__str__()] = pred

            #output_pdf = f"..{settings.FILE_SAVE_FOLDER}/{uuid.uuid4().hex}.pdf"
            name_pdf = f"{uuid.uuid4().hex}.pdf"
            output_pdf = f"{settings.S3_PUBLIC_URL}/{settings.S3_BUCKET_NAME_PDF}/{name_pdf}"
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
            print("Remove splited images")
            for file_path in path_images_list:
                background_tasks.add_task(os.remove, file_path)

            background_tasks.add_task(
                merge_and_create_pdf,
                pred=pred,
                input_dir=result[0].save_dir,
                name_pdf=name_pdf,
                s3=s3
            )

        except Exception as e:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"message": f"Prediction failed: {str(e)}"},
            )
    print("Remove result from model")
    background_tasks.add_task(shutil.rmtree, result[0].save_dir, ignore_errors=True)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=dict_predict
    )

@router.patch("/update_predict")
async def update_predict(info_predict: info_prediction, background_tasks: BackgroundTasks, user: UserBase = Depends(get_current_user), db: db_dependency = db_dependency):
    if not user or not user.is_active:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "User not found or inactive"},
        )
    try:
        result = await change_prediction(file_id=info_predict.file_id, 
                                user_id=user.id, 
                                masks=info_predict.masks,
                                boxes=info_predict.boxes,
                                num_classes=info_predict.num_classes,
                                classes=info_predict.classes,
                                db=db)
    except Exception as e:
        print(e)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=None
        )
    
    if result is None:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND, 
            content={"message":"No matching record found to update"}
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message":"Успешно обновлена информация",
                 "rows_updated":result}
    )
