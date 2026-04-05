from sqlalchemy import Boolean, Column, Integer, String, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum

class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"

class ActivityLevel(str, enum.Enum):
    sedentary = "sedentary"
    lightly_active = "lightly_active"
    moderately_active = "moderately_active"
    very_active = "very_active"
    extra_active = "extra_active"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    logs = relationship("DailyLog", back_populates="user", cascade="all, delete-orphan")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    age = Column(Integer)
    gender = Column(Enum(Gender))
    weight = Column(Float)  # in kg
    height = Column(Float)  # in cm
    activity_level = Column(Enum(ActivityLevel))
    
    objective = Column(String) # e.g., "lose_weight", "maintain", "gain_muscle"
    setup_complete = Column(Boolean, default=False)
    
    # Calculated goals
    target_kcal = Column(Integer)
    
    user = relationship("User", back_populates="profile")
