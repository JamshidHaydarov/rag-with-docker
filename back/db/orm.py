from fastapi import Depends
from .database import get_db
from .models import File, User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

async def create_user(username: str, password: str, db: AsyncSession = Depends(get_db)):
    # User classidan yangi object (foydalanuvchi) ochamiz
    new_user = User(username=username, password=password)

    # Malumotni sessionga qo'shamiz
    db.add(new_user)

    # Malumot db da saqlanishi uchun commit qilamiz
    await db.commit()

    # Db da qoshilgan malumotlarni qaytib olamiz (auto increment bolgan columlarni malumotlari bilan)
    await db.refresh(new_user)
    return new_user
    

async def get_all_users(db: AsyncSession = Depends(get_db)):
    # Database ichidagi barcha user larni olish uchun select query
    result = await db.execute(select(User))
    # select query natijasidan barcha user larni olish
    users = result.scalars().all()
    return users
    

async def get_user_by_username_orm(username: str, db: AsyncSession):
    result = await db.execute(
        select(User).where(User.username == username)
    )

    return result.scalar_one_or_none()


async def get_all_files_orm(db: AsyncSession):
    result = await db.execute(
        select(File)
    )

    return result.scalars().all()


async def get_file_orm(id: int, db: AsyncSession):
    result = await db.execute(
        select(File).where(File.id == id)
    )

    return result.scalar_one_or_none()


