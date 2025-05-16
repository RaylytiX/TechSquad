from fastapi import APIRouter, HTTPException, status
from backend.dbmodels.database import engine
from sqlalchemy.exc import OperationalError
from sqlalchemy import select

router = APIRouter()

@router.get("/")
async def health_check():
    try:
        async with engine.connect() as conn:
            await conn.execute(select(1))
        return {"status": status.HTTP_200_OK, "message": "pong"}
    except OperationalError:
        raise HTTPException(status_code=500, detail="Database connection failed")