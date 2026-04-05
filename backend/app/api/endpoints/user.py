from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.user import User, UserProfile, Gender, ActivityLevel
from app.schemas.user import UserProfileUpdate, User as UserSchema

from app.core.calculations import calculate_target_kcal_logic

router = APIRouter()

@router.get("/me", response_model=UserSchema)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile")
def update_profile(
    profile_update: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = current_user.profile
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
    
    for var, value in vars(profile_update).items():
        if value is not None:
            setattr(profile, var, value)
            
    profile.target_kcal = calculate_target_kcal_logic(
        profile.age, profile.gender, profile.weight, profile.height, profile.activity_level
    )
    
    db.commit()
    db.refresh(profile)
    return profile

@router.delete("/me")
def delete_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.delete(current_user)
    db.commit()
    return {"message": "User deleted successfully"}
