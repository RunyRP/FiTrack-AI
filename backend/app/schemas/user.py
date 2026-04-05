from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import Gender, ActivityLevel

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserProfileBase(BaseModel):
    age: Optional[int] = None
    gender: Optional[Gender] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    activity_level: Optional[ActivityLevel] = None
    objective: Optional[str] = None
    setup_complete: Optional[bool] = False

class UserProfileUpdate(UserProfileBase):
    pass

class UserProfile(UserProfileBase):
    id: int
    user_id: int
    target_kcal: Optional[int] = None

    class Config:
        from_attributes = True

class User(UserBase):
    id: int
    is_active: bool
    profile: Optional[UserProfile] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
