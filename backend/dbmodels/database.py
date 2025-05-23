from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from configs.config import settings
from aiobotocore.session import get_session
from aiobotocore.client import BaseClient

DATABASE_URL = f'postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}'
engine = create_async_engine(DATABASE_URL)#, echo=True)
async_session_maker = async_sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    db = async_session_maker()
    try:
        yield db
    finally:
        await db.close()

db_dependency = Annotated[AsyncSession, Depends(get_db)]

async def get_s3_client():
    async with get_session().create_client(service_name=settings.S3_SERVICE_NAME, 
                                           region_name=settings.S3_REGION,
                                           endpoint_url=settings.S3_ENDPOINT_URL,
                                           aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                                           aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY) as s3:
        yield s3

s3_dependency = Annotated[BaseClient, Depends(get_s3_client)]