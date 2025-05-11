import uuid
from fastapi import UploadFile


def save_file(file:UploadFile):
    fileEXT = file.filename.split('.')[-1].lower()
    fileID = uuid.uuid4().hex
    path_to_image = f"/backend/media/{fileID + '.' + fileEXT}"

    with open(path_to_image, "wb") as buffer:
        buffer.write(file.file.read())
    return path_to_image