from fastapi import FastAPI
import uvicorn
from .modelseg.router import router as modelseg
from .healthcheckermodel import router as health_router

app = FastAPI(title="ModelService")

app.include_router(health_router, tags=["health"], prefix="/ping")
app.include_router(modelseg, tags=["model"], prefix="/model")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)
