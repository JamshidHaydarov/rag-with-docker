from pydantic import BaseModel

class RegisterAndLoginSchema(BaseModel):
    username: str
    password: str

class TokenSchema(BaseModel):
    access_token: str


class UserResponse(BaseModel):
    id: int
    username: str
    token: str
    token_type: str
    files: list = []

    class Config:
        from_attributes = True


class UserFilesResponse(BaseModel):
    id: int
    username: str
    files: list = []

    class Config:
        from_attributes = True