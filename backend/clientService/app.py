from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from dbmodels.database import engine, Base
from .client.router import router as client_router
from .files.router import router as files_router
from configs.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    #os.makedirs(".."+settings.FILE_SAVE_FOLDER, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    pass

app = FastAPI(title="ClientService", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins = settings.HOSTS,
    allow_methods = settings.METHODS,
    allow_headers = settings.HEADERS,
    allow_credentials=settings.CREDENTIALS
)

app.include_router(client_router, tags=["client"], prefix="/client")
app.include_router(files_router, tags=["file"], prefix="/client/file")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
