from fastapi import APIRouter, HTTPException, status
from backend.dbmodels.database import engine
from sqlalchemy.exc import OperationalError

router = APIRouter()

@router.get("/")
async def health():
    return {"status": status.HTTP_200_OK, "message": "pong"}
