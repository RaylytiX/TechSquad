from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from backend.dbmodels.database import engine, Base
from .client.router import router as client_router
from .auth.router import router as auth_router
from backend.configs.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs('backend/media', exist_ok=True)
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

app.include_router(client_router, tags=["client"])
app.include_router(auth_router, tags=["auth"])

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)