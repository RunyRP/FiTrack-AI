from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import Gender, ActivityLevel

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserProfileBase(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[Gender] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    activity_level: Optional[ActivityLevel] = None
    objective: Optional[str] = None
    cut_intensity: Optional[str] = None
    manual_target_kcal: Optional[int] = None
    macro_distribution: Optional[str] = "balanced"
    target_steps: Optional[int] = 10000
    selected_machinery: Optional[list] = []
    setup_complete: Optional[bool] = False

class UserProfileUpdate(UserProfileBase):
    pass

class UserProfile(UserProfileBase):
    id: int
    user_id: int
    target_kcal: Optional[int] = None
    target_steps: Optional[int] = 10000

    class Config:
        from_attributes = True

class User(UserBase):
    id: int
    is_active: bool
    is_verified: bool = False
    profile: Optional[UserProfile] = None
    has_google_sync: bool = False

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
