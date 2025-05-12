from typing import List
import uuid
import aiofiles
from fastapi import File, UploadFile
from fastapi.responses import JSONResponse

async def save_file(file: UploadFile):
    fileEXT = file.filename.split('.')[-1].lower()
    fileID = uuid.uuid4().hex
    path_to_image = f"backend/media/{fileID + '.' + fileEXT}"
    try:
        async with aiofiles.open(path_to_image, 'wb') as f:
            while contents := await file.read(1024 * 1024):
                await f.write(contents)
    except Exception:
        raise JSONResponse(status_code=500, detail='Something went wrong')
    finally:
        await file.close()

    return path_to_image