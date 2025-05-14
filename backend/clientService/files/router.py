from typing import List

from fastapi import APIRouter, BackgroundTasks, UploadFile, Form, status
from fastapi.responses import JSONResponse

from backend.authService.auth.utils import get_current_user
from .utils import save_file
from backend.configs.config import settings
from backend.dbmodels.database import db_dependency
from backend.dbmodels.models import File
from backend.dbmodels.crud import create_file

router = APIRouter()


@router.post("/file")
async def files_upload(background_tasks: BackgroundTasks, files: List[UploadFile], token: str = Form(...), db: db_dependency = db_dependency):
    user = await get_current_user(token=token, db=db)
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

        path_to_image = await save_file(file=file)
        if path_to_image is None:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "message": f"Oops! This file {file.filename} is bad. We can`t upload this file, please try upload again or change this file."},
            )
        result = await create_file(path_to_file=path_to_image, user=user, db=db)

        file_ids.append(result.id.__str__())

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"files": file_ids}
    )