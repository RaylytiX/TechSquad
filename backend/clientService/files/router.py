from typing import List
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, status
from fastapi.responses import JSONResponse
from authService.auth.utils import get_current_user
from dbmodels.schemas import UserBase
from configs.config import settings
from dbmodels.database import db_dependency, s3_dependency
from dbmodels.crud import create_file, find_file_by_id

router = APIRouter()    

@router.get("/{file_id}")
async def get_path_file(file_id: str, background_tasks: BackgroundTasks, user: UserBase = Depends(get_current_user), db: db_dependency = db_dependency):
    if user is None or not user.is_active:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "You are not authenticated"},
        )
    
    file_id = uuid.UUID(file_id)
    path_to_image = await find_file_by_id(id=file_id, db=db)
    if path_to_image is None:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"path": "We didn`t find file"}
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"path": path_to_image}
    )

@router.post("/")
async def files_upload(background_tasks: BackgroundTasks, files: List[UploadFile], user: UserBase = Depends(get_current_user), db: db_dependency = db_dependency, s3: s3_dependency = s3_dependency):
    if user is None or not user.is_active:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"message": "You are not authenticated"},
        )

    file_ids = []
    for file in files:
        if file.content_type.split('/')[1] not in settings.APPLYLOADFORMATFILE:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "message": f"Oops! This file {file.filename} is invalid file type, you can upload file with types: {', '.join(settings.APPLYLOADFORMATFILE)}"},
            )
        
        #path_to_image = await save_file(file=file)

        contents = await file.read()
        path_to_image = f"{uuid.uuid4().hex + '.' + file.filename.split('.')[-1].lower()}"

        try:
            resp = await s3.put_object(
                Bucket=settings.S3_BUCKET_NAME_IMAGES,
                Key=path_to_image,
                Body=contents,
                ContentLength=len(contents),
                ContentType=file.content_type,
                ACL='public-read'
            )
            await s3.close()
        except Exception as e:
            print(e)
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "message": f"Oops! This file {file.filename} is bad. We can`t upload this file, please try upload again or change this file."},
            )
        
        url = settings.S3_PUBLIC_URL + "/" + settings.S3_BUCKET_NAME_IMAGES + "/" + path_to_image

        # if path_to_image is None:
        #     return JSONResponse(
        #         status_code=status.HTTP_400_BAD_REQUEST,
        #         content={
        #             "message": f"Oops! This file {file.filename} is bad. We can`t upload this file, please try upload again or change this file."},
        #     )

        result = await create_file(path_to_file=url, user=user, db=db)

        file_ids.append(result.id.__str__())

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"files": file_ids}
    )
