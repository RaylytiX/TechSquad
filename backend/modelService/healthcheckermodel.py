from fastapi import APIRouter, status

router = APIRouter()

@router.get("/")
async def health():
    return {"status": status.HTTP_200_OK, "message": "pong"}
