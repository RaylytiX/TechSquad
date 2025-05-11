from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
from backend.dbmodels.crud import create_file
from backend.configs.config import settings
from backend.dbmodels.database import engine, Base
from .client.router import router as client_router
from .auth.router import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs('backend/media', exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    pass

app = FastAPI(title="ClientService", lifespan=lifespan)
app.include_router(client_router, tags=["client"])
app.include_router(auth_router, tags=["auth"])

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)