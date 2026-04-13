from pydantic import BaseModel

class RegisterAndLoginSchema(BaseModel):
    username: str
    password: str

class TokenSchema(BaseModel):
    access_token: str


class FileResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: int
    username: str
    token: str = None
    token_type: str = None
    files: list[FileResponse] = []

    class Config:
        from_attributes = True


class UserFilesResponse(BaseModel):
    id: int
    username: str
    files: list[FileResponse]

    class Config:
        from_attributes = True
