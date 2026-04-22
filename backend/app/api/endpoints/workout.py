from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.machinery import Machinery
from app.core.auth import get_current_user
from app.models.user import User
from typing import List

from app.models.workout import WorkoutSession, WorkoutExercise
from app.schemas.workout import WorkoutSessionCreate, WorkoutSession as WorkoutSessionSchema, ExerciseProgression
from typing import List
import datetime

router = APIRouter()

@router.get("/machinery")
def get_all_machinery(db: Session = Depends(get_db)):
    return db.query(Machinery).all()

@router.post("/session", response_model=WorkoutSessionSchema)
def log_workout_session(
    workout_data: WorkoutSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Create the session
    session = WorkoutSession(
        user_id=current_user.id,
        name=workout_data.name,
        notes=workout_data.notes,
        date=datetime.datetime.utcnow()
    )
    db.add(session)
    db.flush() # Get session ID

    # Create the exercises and sets
    for ex_data in workout_data.exercises:
        exercise = WorkoutExercise(
            session_id=session.id,
            exercise_name=ex_data.exercise_name,
            machine_id=ex_data.machine_id,
            sets=[set_data.dict() for set_data in ex_data.sets]
        )
        db.add(exercise)
    
    db.commit()
    db.refresh(session)
    return session

@router.get("/history", response_model=List[WorkoutSessionSchema])
def get_workout_history(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id
    ).order_by(WorkoutSession.date.desc()).limit(limit).all()

@router.get("/progression/{exercise_name}", response_model=List[ExerciseProgression])
def get_exercise_progression(
    exercise_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find all sessions for this user that included this exercise
    exercises = db.query(WorkoutExercise).join(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id,
        WorkoutExercise.exercise_name == exercise_name
    ).order_by(WorkoutSession.date.asc()).all()
    
    progression = []
    for ex in exercises:
        if not ex.sets: continue
        
        max_weight = max([s["weight"] for s in ex.sets])
        avg_reps = sum([s["reps"] for s in ex.sets]) / len(ex.sets)
        total_volume = sum([s["weight"] * s["reps"] for s in ex.sets])
        
        progression.append({
            "date": ex.session.date,
            "max_weight": float(max_weight),
            "avg_reps": float(avg_reps),
            "total_volume": float(total_volume)
        })
        
    return progression

@router.get("/suggest")
def suggest_workouts(
    machine_ids: List[int] = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch machines matching the provided IDs
    machines = db.query(Machinery).filter(Machinery.id.in_(machine_ids)).all()
    
    # Get user objective
    objective = current_user.profile.objective if current_user.profile else "maintain"
    
    # Define goal-specific logic
    # lose_weight: higher reps (12-15), moderate rest
    # gain_muscle: moderate reps (8-12), emphasis on heavy-ish weights
    # maintain: moderate reps (10-12)
    
    goal_params = {
        "lose_weight": {"reps": "12-15", "sets": "3-4", "rest": "60s", "focus": "Calorie burn & endurance"},
        "gain_muscle": {"reps": "8-12", "sets": "4-5", "rest": "90s", "focus": "Hypertrophy & strength"},
        "maintain": {"reps": "10-12", "sets": "3", "rest": "60s", "focus": "General fitness & tone"}
    }
    
    params = goal_params.get(objective, goal_params["maintain"])
    
    suggestions = []
    for machine in machines:
        # Exercises are stored in JSON as a list of dicts: [{"name": "...", "muscles": [...]}]
        for exercise in machine.exercises:
            suggestions.append({
                "machine_id": machine.id,
                "machine_name": machine.name,
                "exercise_name": exercise["name"],
                "muscles": exercise["muscles"],
                "reps": params["reps"],
                "sets": params["sets"],
                "rest": params["rest"],
                "focus": params["focus"]
            })
            
    return {
        "objective": objective,
        "parameters": params,
        "suggestions": suggestions
    }
