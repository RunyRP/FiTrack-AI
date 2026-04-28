from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base
import datetime

class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    date = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    name = Column(String)  # e.g., "Upper Body", "Leg Day"
    notes = Column(String, nullable=True)

    user = relationship("User", back_populates="workouts")
    exercises = relationship("WorkoutExercise", back_populates="session", cascade="all, delete-orphan")

class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("workout_sessions.id"))
    exercise_name = Column(String)
    machine_id = Column(Integer, ForeignKey("machinery.id"), nullable=True)
    
    # Store sets as JSON: [{"reps": 10, "weight": 50}, ...]
    sets = Column(JSON)
    
    session = relationship("WorkoutSession", back_populates="exercises")
