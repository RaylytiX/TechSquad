from fastapi import FastAPI
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from backend.authService.auth.router import router as auth_router
from backend.configs.config import settings

app = FastAPI(title="AuthService")

app.add_middleware(
    CORSMiddleware,
    allow_origins = settings.HOSTS,
    allow_methods = settings.METHODS,
    allow_headers = settings.HEADERS,
    allow_credentials=settings.CREDENTIALS
)
app.include_router(auth_router, tags=["auth"])

@app.get("/")
def root():
    return {"message": "Auth service is up and running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)