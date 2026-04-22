from pydantic import BaseModel
from typing import List, Optional
import datetime

class WorkoutSet(BaseModel):
    reps: int
    weight: float

class WorkoutExerciseBase(BaseModel):
    exercise_name: str
    machine_id: Optional[int] = None
    sets: List[WorkoutSet]

class WorkoutExerciseCreate(WorkoutExerciseBase):
    pass

class WorkoutExercise(WorkoutExerciseBase):
    id: int
    session_id: int

    class Config:
        from_attributes = True

class WorkoutSessionBase(BaseModel):
    name: str
    notes: Optional[str] = None

class WorkoutSessionCreate(WorkoutSessionBase):
    exercises: List[WorkoutExerciseCreate]

class WorkoutSession(WorkoutSessionBase):
    id: int
    user_id: int
    date: datetime.datetime
    exercises: List[WorkoutExercise]

    class Config:
        from_attributes = True

class ExerciseProgression(BaseModel):
    date: datetime.datetime
    max_weight: float
    avg_reps: float
    total_volume: float
