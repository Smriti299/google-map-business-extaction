from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)
    remember_me: bool = False


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    role: str
    csrf_token: str | None = None


class LoginResponse(BaseModel):
    user: UserResponse
    csrf_token: str | None = None


class LogoutResponse(BaseModel):
    success: bool = True
