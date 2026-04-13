from contextlib import asynccontextmanager
import json
from pathlib import Path
import uuid
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File as FastAPIFile
from agent import  main
from db.database import AsyncSessionLocal, get_db
from db.init import init_db
from db.models import User, File
from db.orm import create_user, get_user_by_username_orm
from db.schemas import RegisterAndLoginSchema, TokenSchema, UserResponse, UserFilesResponse
from service import create_access_token, delete_cache, get_current_user, get_password_hash, get_user_from_token, verify_password, get_all_files
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Project ishga tushdi")
    await init_db()
    print("db initialize qilindi")

    yield

    print("Project shutdown boldi")

app = FastAPI(lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "files"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)



@app.post("/upload", response_model=UserFilesResponse)
async def upload(
    file: UploadFile = FastAPIFile(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File nomi mavjud emas")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Faqat PDF fayllarga ruxsat beriladi")

    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = UPLOAD_DIR / filename

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Fayl bo'sh")

    with open(file_path, "wb") as f:
        f.write(content)
        f.flush()

    if not file_path.exists():
        raise HTTPException(status_code=500, detail=f"Fayl saqlanmadi: {file_path}")

    new_file = File(name=filename)

    db.add(new_file)
    await db.commit()
    await db.refresh(new_file)
    await delete_cache()
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "files": [
            {
                "id": new_file.id,
                "name": new_file.name
            }
        ]
    }

@app.post("/login", response_model=TokenSchema)
async def login(data: RegisterAndLoginSchema, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_username_orm(data.username, db)

    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Notogri parol yoki username")

    access_token = create_access_token(data={"sub": user.username})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.post("/register", response_model=UserResponse)
async def register(data: RegisterAndLoginSchema, db: AsyncSession = Depends(get_db)):
    existing_user = await get_user_by_username_orm(data.username, db)
    if existing_user:
        raise HTTPException(status_code=400, detail="Bunday username lik foydalanuchi mavjud.")
    user = await create_user(username=data.username, password=get_password_hash(data.password), db=db)
    access_token = create_access_token(data={"sub": user.username})

    return {"id": user.id, "username": user.username, "token": access_token, "token_type": "bearer"}


@app.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        token = "Bearer " + websocket.query_params.get("token")
        print("Websocketga token keldi:", token)

        if not token:
            await websocket.close(code=1008, reason="Token berilishi shart")
            return

        token = token.split(" ", 1)[1]

        async with AsyncSessionLocal() as db:
            user = await get_user_from_token(token=token, db=db)
            if not user:
                await websocket.close(code=1008, reason="Token noto'g'ri yoki yaroqsiz")
                return

            await websocket.send_text(f"Hello, {user.username}")

            while True:
                raw_data = await websocket.receive_text()
                data = json.loads(raw_data)

                doc_name = ""
                files = await get_all_files(db=db)
                file_id = int(data["file_id"])
                for file in files:
                    if file["id"] == file_id:
                        doc_name = file["name"]
                        break

                if not doc_name:
                    await websocket.send_text("Hatolik: fayl topilmadi")
                    continue

                file_path = UPLOAD_DIR / doc_name

                if not file_path.exists():
                    await websocket.send_text(f"Hatolik: fayl mavjud emas: {file_path}")
                    continue

                if not file_path.is_file():
                    await websocket.send_text(f"Hatolik: bu fayl emas: {file_path}")
                    continue

                response = await main(doc=str(file_path), question=data["question"])
                await websocket.send_text(response)

    except WebSocketDisconnect:
        print("Cient uzuldi")

    except json.JSONDecodeError:
        await websocket.send_text("Hatolik: JSON noto'g'ri yuborildi.")

    except KeyError:
        await websocket.send_text("Hatolik: 'file_id' yoki 'question' maydoni topilmadi.")

    except Exception as e:
        print("WS ERROR:", e)
        try:
            await websocket.send_text(f"Hatolik: {str(e)}")
        except:
            pass

@app.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return current_user