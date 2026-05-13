from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.machinery import Machinery
from app.core.auth import get_current_user
from app.models.user import User
from typing import List

from app.models.workout import WorkoutSession, WorkoutExercise, WorkoutSplit, WorkoutSchedule
from app.schemas.workout import (
    WorkoutSessionCreate, WorkoutSession as WorkoutSessionSchema, 
    ExerciseProgression, WorkoutSplitCreate, WorkoutSplit as WorkoutSplitSchema,
    WorkoutScheduleCreate, WorkoutSchedule as WorkoutScheduleSchema
)
from typing import List, Dict
import datetime

router = APIRouter()

@router.get("/machinery")
def get_all_machinery(db: Session = Depends(get_db)):
    return db.query(Machinery).all()

# --- Splits CRUD ---

@router.post("/splits", response_model=WorkoutSplitSchema)
def create_split(
    split_data: WorkoutSplitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    split = WorkoutSplit(
        user_id=current_user.id,
        name=split_data.name,
        exercises=[ex.dict() for ex in split_data.exercises]
    )
    db.add(split)
    db.commit()
    db.refresh(split)
    return split

@router.get("/splits", response_model=List[WorkoutSplitSchema])
def get_splits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(WorkoutSplit).filter(WorkoutSplit.user_id == current_user.id).all()

@router.delete("/splits/{split_id}")
def delete_split(
    split_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    split = db.query(WorkoutSplit).filter(
        WorkoutSplit.id == split_id,
        WorkoutSplit.user_id == current_user.id
    ).first()
    if split:
        db.delete(split)
        db.commit()
    return {"status": "ok"}

# --- Schedule CRUD ---

@router.get("/schedule", response_model=WorkoutScheduleSchema)
def get_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    schedule = db.query(WorkoutSchedule).filter(WorkoutSchedule.user_id == current_user.id).first()
    if not schedule:
        schedule = WorkoutSchedule(user_id=current_user.id)
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
    return schedule

@router.post("/schedule", response_model=WorkoutScheduleSchema)
def update_schedule(
    schedule_data: WorkoutScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    schedule = db.query(WorkoutSchedule).filter(WorkoutSchedule.user_id == current_user.id).first()
    if not schedule:
        schedule = WorkoutSchedule(user_id=current_user.id)
        db.add(schedule)
    
    schedule.split_mode = schedule_data.split_mode
    schedule.gym_days = schedule_data.gym_days
    schedule.fixed_schedule = schedule_data.fixed_schedule
    schedule.split_sequence = schedule_data.split_sequence
    
    db.commit()
    db.refresh(schedule)
    return schedule

# --- Session & Next Workout ---

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
        split_id=workout_data.split_id,
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

@router.get("/next")
def get_next_workout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    schedule = db.query(WorkoutSchedule).filter(WorkoutSchedule.user_id == current_user.id).first()
    if not schedule:
        return {"message": "No schedule configured"}

    today = datetime.datetime.utcnow().weekday() # 0-6 (Mon-Sun)
    
    # Check if today is a gym day
    is_gym_day = today in schedule.gym_days
    
    suggested_split = None
    
    if schedule.split_mode == "fixed":
        split_id = schedule.fixed_schedule.get(str(today))
        if split_id:
            suggested_split = db.query(WorkoutSplit).get(split_id)
    else: # dynamic
        if is_gym_day:
            # Find the last workout session to see what split was done
            last_session = db.query(WorkoutSession).filter(
                WorkoutSession.user_id == current_user.id,
                WorkoutSession.split_id != None
            ).order_by(WorkoutSession.date.desc()).first()
            
            if last_session and schedule.split_sequence:
                try:
                    last_idx = schedule.split_sequence.index(last_session.split_id)
                    next_idx = (last_idx + 1) % len(schedule.split_sequence)
                    next_split_id = schedule.split_sequence[next_idx]
                    suggested_split = db.query(WorkoutSplit).get(next_split_id)
                except ValueError:
                    # Last split not in sequence, start from first
                    suggested_split = db.query(WorkoutSplit).get(schedule.split_sequence[0])
            elif schedule.split_sequence:
                suggested_split = db.query(WorkoutSplit).get(schedule.split_sequence[0])

    if not suggested_split:
        return {"is_gym_day": is_gym_day, "message": "No split suggested for today"}

    # Fetch last performance for each exercise in this split
    exercises_with_history = []
    for ex in suggested_split.exercises:
        # Find last time this exercise was performed in a session with this split_id
        last_ex = db.query(WorkoutExercise).join(WorkoutSession).filter(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.split_id == suggested_split.id,
            WorkoutExercise.exercise_name == ex["name"]
        ).order_by(WorkoutSession.date.desc()).first()
        
        sets = last_ex.sets if last_ex else [{"reps": ex["target_reps"], "weight": 0}]
        
        exercises_with_history.append({
            "exercise_name": ex["name"],
            "machine_id": ex["machine_id"],
            "target_sets": ex["target_sets"],
            "target_reps": ex["target_reps"],
            "last_sets": sets
        })

    return {
        "is_gym_day": is_gym_day,
        "split_id": suggested_split.id,
        "split_name": suggested_split.name,
        "exercises": exercises_with_history
    }

@router.delete("/session/{session_id}")
def delete_workout_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    if session:
        db.delete(session)
        db.commit()
        return {"status": "ok"}
    return {"status": "error", "message": "Session not found"}, 404

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
    machine_ids: List[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # If no IDs provided, use the ones from the user profile
    if not machine_ids and current_user.profile and current_user.profile.selected_machinery:
        machine_ids = current_user.profile.selected_machinery
    
    if not machine_ids:
        return {"objective": "N/A", "parameters": {}, "suggestions": [], "message": "Please configure your gym equipment in the Setup section."}

    # Fetch machines matching the provided IDs
    machines = []
    if machine_ids:
        machines = db.query(Machinery).filter(Machinery.id.in_(machine_ids)).all()
    
    # Get user objective
    objective = current_user.profile.objective if current_user.profile else "maintain"
    
    goal_params = {
        "lose_weight": {"reps": "12-15", "sets": "3-4", "rest": "60s", "focus": "Calorie burn & endurance"},
        "gain_muscle": {"reps": "8-12", "sets": "4-5", "rest": "90s", "focus": "Hypertrophy & strength"},
        "body_recomposition": {"reps": "10-12", "sets": "4", "rest": "75s", "focus": "Fat loss & muscle growth"},
        "maintain": {"reps": "10-12", "sets": "3", "rest": "60s", "focus": "General fitness & tone"}
    }
    
    params = goal_params.get(objective, goal_params["maintain"])
    
    suggestions = []
    
    # If no machines selected, add default bodyweight exercises
    if not machines:
        bodyweight_exercises = [
            {"exercise_name": "Push-ups", "muscles": ["Chest", "Triceps", "Shoulders"], "machine_name": "Bodyweight", "image_url": "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?q=80&w=800&auto=format&fit=crop"},
            {"exercise_name": "Bodyweight Squats", "muscles": ["Quads", "Glutes"], "machine_name": "Bodyweight", "image_url": "https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=800&auto=format&fit=crop"},
            {"exercise_name": "Plank", "muscles": ["Core"], "machine_name": "Bodyweight", "image_url": "https://images.unsplash.com/photo-1566241142559-40e1bfc26ddc?q=80&w=800&auto=format&fit=crop"},
            {"exercise_name": "Lunges", "muscles": ["Quads", "Hamstrings"], "machine_name": "Bodyweight", "image_url": "https://images.unsplash.com/photo-1434682772747-f16d3ea162c3?q=80&w=800&auto=format&fit=crop"}
        ]
        for ex in bodyweight_exercises:
            suggestions.append({
                "machine_id": None,
                "machine_name": ex["machine_name"],
                "machine_image": ex["image_url"],
                "exercise_name": ex["exercise_name"],
                "muscles": ex["muscles"],
                "reps": params["reps"],
                "sets": params["sets"],
                "rest": params["rest"],
                "focus": params["focus"]
            })
    else:
        for machine in machines:
            for exercise in machine.exercises:
                suggestions.append({
                    "machine_id": machine.id,
                    "machine_name": machine.name,
                    "machine_image": machine.image_url,
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
