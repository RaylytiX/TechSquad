import uuid
import aiofiles
from fastapi import UploadFile
from configs.config import settings

async def save_file(file: UploadFile):
    fileEXT = file.filename.split('.')[-1].lower()
    fileID = uuid.uuid4().hex
    path_to_image = f"{settings.FILE_SAVE_FOLDER}/{fileID + '.' + fileEXT}"
    try:
        async with aiofiles.open(path_to_image, 'wb') as f:
            while contents := await file.read(1024 * 1024):
                await f.write(contents)
    except Exception as e:
        print(e)
        return None
    finally:
        await file.close()
    return path_to_image