from datetime import datetime, timedelta, timezone
import json
import dotenv
import jwt
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from pwdlib import PasswordHash
from db.database import get_db
from db.models import User
from db.schemas import RegisterAndLoginSchema, TokenSchema, UserResponse
from db.orm import create_user, get_all_files_orm, get_all_users, get_file_orm, get_user_by_username_orm
import os
import redis.asyncio as redis


# Redis ni ulash
redis_client = redis.from_url(
    os.getenv("REDIS_URL"),
    decode_responses=True
)


app = FastAPI()

dotenv.load_dotenv()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
password_hash = PasswordHash.recommended()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return password_hash.hash(password)



async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token valid emas",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception
    cache_key_user = f"user:{username}:users"
    cache_key_file = f"files"

    user = None
    files = None

    cached_user = await redis_client.get(cache_key_user)
    cached_file = await redis_client.get(cache_key_file)

    if cached_user:
        user = json.loads(cached_user)

    if cached_file:
        files =  json.loads(cached_file)


    if not user:
        user = await get_user_by_username_orm(username, db)
        if user:
            await redis_client.setex(cache_key_user, 600, json.dumps({
                "id": user.id,
                "username": user.username
            }))
    if not files:
        files = await get_all_files_orm(db)
        files_data = [
            {
                "id": file.id,
                "name": file.name,
            }
            for file in files
        ]
        await redis_client.setex(cache_key_file, 600, json.dumps(files_data))
        
    if user is None:
        raise credentials_exception
    user = await redis_client.get(cache_key_user)
    user = json.loads(user)
    return {"id": user['id'], "username": user['username'], "files": files}

async def get_file_by_id(id: int, db: AsyncSession):
    cache_key = f"file:{id}"
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # Здесь должна быть логика для получения файла из базы данных
    file = await get_file_orm(id, db)
    await redis_client.setex(cache_key, 600, json.dumps(file))
    return file

async def get_user_from_token(token: str, db: AsyncSession):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            return None
    except:
        return None

    result = await get_user_by_username_orm(username, db)
    return result

async def get_all_files( db: AsyncSession):
    cache_key = "files"

    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    files = await get_all_files_orm(db)
    print(files)

    files_data = [
        {
            "id": file.id,
            "name": file.name,
        }
        for file in files
    ]

    await redis_client.setex(cache_key, 600, json.dumps(files_data))
    return files_data
