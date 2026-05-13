from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base
import datetime

class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    split_id = Column(Integer, ForeignKey("workout_splits.id"), nullable=True)
    date = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    name = Column(String)  # e.g., "Upper Body", "Leg Day"
    notes = Column(String, nullable=True)

    user = relationship("User", back_populates="workouts")
    exercises = relationship("WorkoutExercise", back_populates="session", cascade="all, delete-orphan")
    split = relationship("WorkoutSplit")

class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("workout_sessions.id"))
    exercise_name = Column(String)
    machine_id = Column(Integer, ForeignKey("machinery.id"), nullable=True)
    
    # Store sets as JSON: [{"reps": 10, "weight": 50}, ...]
    sets = Column(JSON)
    
    session = relationship("WorkoutSession", back_populates="exercises")

class WorkoutSplit(Base):
    __tablename__ = "workout_splits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    name = Column(String)  # e.g., "Push", "Pull", "Legs"
    
    # List of exercises: [{"machine_id": 1, "name": "Chest Press", "target_sets": 3, "target_reps": 12}]
    exercises = Column(JSON, default=list)

    user = relationship("User", back_populates="splits")

class WorkoutSchedule(Base):
    __tablename__ = "workout_schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    split_mode = Column(String, default="dynamic") # "dynamic" or "fixed"
    gym_days = Column(JSON, default=list) # e.g., [1, 3, 5] for Mon, Wed, Fri
    
    # For "fixed" mode: {"1": split_id, "3": split_id, ...}
    fixed_schedule = Column(JSON, default=dict)
    
    # For "dynamic" mode: [split_id1, split_id2, split_id3] - the order of splits
    split_sequence = Column(JSON, default=list)

    user = relationship("User", back_populates="workout_schedule")
