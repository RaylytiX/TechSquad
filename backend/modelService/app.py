from fastapi import FastAPI
import uvicorn
from .modelseg.router import router as modelseg

app = FastAPI(title="ModelService")
app.include_router(modelseg, tags=["model"], prefix="/model")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)
