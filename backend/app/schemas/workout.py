from pydantic import BaseModel
from typing import List, Optional, Dict
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
    split_id: Optional[int] = None

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

# New schemas for Splits and Schedules

class SplitExercise(BaseModel):
    machine_id: Optional[int] = None
    name: str
    target_sets: int = 3
    target_reps: int = 12

class WorkoutSplitBase(BaseModel):
    name: str
    exercises: List[SplitExercise]

class WorkoutSplitCreate(WorkoutSplitBase):
    pass

class WorkoutSplit(WorkoutSplitBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class WorkoutScheduleBase(BaseModel):
    split_mode: str = "dynamic"
    gym_days: List[int] = []
    fixed_schedule: Dict[str, int] = {}
    split_sequence: List[int] = []

class WorkoutScheduleCreate(WorkoutScheduleBase):
    pass

class WorkoutSchedule(WorkoutScheduleBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
